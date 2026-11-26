-- ============================================================================
-- ويز اليوسفية | المرحلة الخامسة: تحصين الأمان (Security Hardening)
-- ----------------------------------------------------------------------------
-- نفّذ الملف كاملاً مرة واحدة في Supabase → SQL Editor (بعد stage3-4-migration.sql).
-- الملف آمن لإعادة التشغيل (idempotent). خذ نسخة احتياطية قبل التنفيذ.
--
-- لماذا؟ مفتاح Supabase في الواجهة "عام" بطبيعته، فأي مستخدم مسجّل يستطيع استدعاء
-- الـ API مباشرة متجاوزاً أزرار الواجهة. لذلك يجب أن تُفرَض القواعد داخل قاعدة البيانات:
--   • صاحب المشروع لا يجوز أن يعتمد مشروعه أو يرقّيه لذهبي أو يزوّر عدّاداته.
--   • المستخدم لا يجوز أن يجعل تقييمه "منشوراً" بنفسه.
--   • المستخدم لا يجوز أن يرقّي نفسه إلى admin.
--   • طلب الخدمة لا يجوز أن يُنشأ وهو "موجَّه" مسبقاً، ويُحدّ معدّل الإرسال.
--
-- ملاحظة تقنية: الـ Triggers تقيّد فقط الاستدعاءات القادمة من الـ API (current_user
-- = authenticated/anon). الدوال security definer (مثل increment_shop_metric و
-- report_review و handle_new_user) تعمل بصلاحية مالكها فلا تتأثر.
-- ============================================================================

-- ---------- 1) دوال مساعدة ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'admin');
$$;

create or replace function public.is_api_caller()
returns boolean language sql stable
as $$ select current_user in ('authenticated', 'anon'); $$;

grant execute on function public.is_admin() to anon, authenticated;

-- ---------- 2) profiles: منع تصعيد الصلاحيات ----------
alter table public.profiles enable row level security;

create or replace function public.guard_profiles()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_api_caller() or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.role::text = 'admin' then
      raise exception 'غير مسموح بإنشاء حساب بصلاحية مدير';
    end if;
  else
    new.role := old.role;      -- لا يغيّر المستخدم صلاحيته
    new.id   := old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profiles_trg on public.profiles;
create trigger guard_profiles_trg before insert or update on public.profiles
for each row execute function public.guard_profiles();

-- ---------- 3) shops: حماية الأعمدة الحساسة ----------
create or replace function public.guard_shops()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_api_caller() or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status       := 'pending';
    new.is_verified  := false;
    new.plan         := 'free';
    new.views_count  := 0;
    new.clicks_count := 0;
    new.owner_id     := auth.uid();
  else
    new.status       := old.status;
    new.is_verified  := old.is_verified;
    new.plan         := old.plan;
    new.views_count  := old.views_count;
    new.clicks_count := old.clicks_count;
    new.owner_id     := old.owner_id;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_shops_trg on public.shops;
create trigger guard_shops_trg before insert or update on public.shops
for each row execute function public.guard_shops();

-- ---------- 4) reviews: لا اعتماد ذاتي ولا انتحال اسم ----------
create or replace function public.guard_reviews()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_name text;
begin
  if not public.is_api_caller() or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.user_id     := auth.uid();
    new.status      := 'pending';
    new.is_reported := false;
    new.report_reason := null;
    select coalesce(nullif(trim(p.full_name), ''), split_part(p.email, '@', 1))
      into v_name from public.profiles p where p.id = auth.uid();
    new.reviewer_name := left(coalesce(v_name, 'مستخدم'), 60);
    new.comment := left(coalesce(new.comment, ''), 600);
    if new.rating is null or new.rating < 1 or new.rating > 5 then
      raise exception 'تقييم غير صالح';
    end if;
  else
    -- المستخدم العادي لا يعدّل تقييماً بعد إرساله (التعديل للإدارة فقط).
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_reviews_trg on public.reviews;
create trigger guard_reviews_trg before insert or update on public.reviews
for each row execute function public.guard_reviews();

-- تقييم واحد لكل مستخدم لكل مشروع (يُتخطى تلقائياً إن وُجدت تكرارات قديمة).
do $$ begin
  create unique index if not exists reviews_one_per_user_shop_uidx on public.reviews (user_id, shop_id);
exception when others then
  raise notice 'تعذر إنشاء فهرس التقييم الفريد (تكرارات موجودة). نظّفها ثم أعد التشغيل.';
end $$;

-- ---------- 5) service_requests: إنشاء نظيف + حدّ للمعدّل ----------
drop policy if exists "Users can create their own service requests" on public.service_requests;
create policy "Users can create their own service requests"
  on public.service_requests for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'new'
    and assigned_provider_name is null
    and assigned_provider_phone is null
    and assignment_notes is null
  );

create or replace function public.limit_service_requests()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.is_api_caller() and not public.is_admin() then
    if (select count(*) from public.service_requests
          where user_id = new.user_id and created_at > now() - interval '1 hour') >= 5 then
      raise exception 'تجاوزت الحد المسموح (5 طلبات في الساعة). حاول لاحقاً.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists limit_service_requests_trg on public.service_requests;
create trigger limit_service_requests_trg before insert on public.service_requests
for each row execute function public.limit_service_requests();

-- ---------- 6) user_notifications: المستخدم يغيّر read_at فقط ----------
create or replace function public.guard_notifications()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.is_api_caller() and not public.is_admin() then
    new.user_id := old.user_id; new.title := old.title; new.body := old.body;
    new.type := old.type; new.related_id := old.related_id; new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_notifications_trg on public.user_notifications;
create trigger guard_notifications_trg before update on public.user_notifications
for each row execute function public.guard_notifications();

-- ---------- 7) app_settings و categories: قراءة عامة، كتابة للإدارة ----------
alter table public.app_settings enable row level security;
alter table public.categories   enable row level security;

drop policy if exists "hardening: public read app_settings" on public.app_settings;
create policy "hardening: public read app_settings" on public.app_settings for select to anon, authenticated using (true);
drop policy if exists "hardening: admin write app_settings" on public.app_settings;
create policy "hardening: admin write app_settings" on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "hardening: public read categories" on public.categories;
create policy "hardening: public read categories" on public.categories for select to anon, authenticated using (true);
drop policy if exists "hardening: admin write categories" on public.categories;
create policy "hardening: admin write categories" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- 8) تخزين الصور (bucket: shop-images) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-images', 'shop-images', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "hardening: upload to own folder" on storage.objects;
create policy "hardening: upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'shop-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "hardening: delete own images" on storage.objects;
create policy "hardening: delete own images" on storage.objects for delete to authenticated
  using (bucket_id = 'shop-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ---------- 9) فهارس للأداء ----------
create index if not exists shops_status_created_idx on public.shops (status, created_at desc);
create index if not exists shops_owner_idx          on public.shops (owner_id);
create index if not exists reviews_shop_status_idx  on public.reviews (shop_id, status);
create index if not exists reviews_user_idx         on public.reviews (user_id);

-- ============================================================================
-- مراجعة يدوية مطلوبة بعد التنفيذ: اعرض كل السياسات الموجودة وتأكد أنه لا توجد
-- سياسة قديمة تسمح للجميع (using (true)) بالكتابة على shops/reviews/profiles:
--
--   select schemaname, tablename, policyname, cmd, roles, qual, with_check
--   from pg_policies where schemaname in ('public','storage') order by tablename, policyname;
--
-- السياسات تُجمع بـ OR، فأي سياسة قديمة متساهلة تبقى فعّالة حتى لو أضفنا غيرها.
-- ============================================================================
