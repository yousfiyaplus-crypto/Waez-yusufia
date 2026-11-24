-- ويز اليوسفية | المرحلة الثالثة: نبض اليوسفية
-- نفّذ هذا الملف مرة واحدة في Supabase SQL Editor.

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 100),
  body text not null check (char_length(trim(body)) between 3 and 1000),
  kind text not null default 'news' check (kind in ('news','alert','offer')),
  area text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_public_feed_idx
  on public.community_posts (status, created_at desc);
create index if not exists community_posts_expiry_idx
  on public.community_posts (expires_at);

alter table public.community_posts enable row level security;

-- القراءة العامة تقتصر على المنشور وغير المنتهي.
drop policy if exists "Public can read active community posts" on public.community_posts;
create policy "Public can read active community posts"
  on public.community_posts for select
  to anon, authenticated
  using (
    status = 'published'
    and (expires_at is null or expires_at > now())
  );

-- الإدارة فقط تستطيع قراءة كل السجلات وإضافتها وتعديلها وحذفها.
drop policy if exists "Admins can manage community posts" on public.community_posts;
create policy "Admins can manage community posts"
  on public.community_posts for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

grant select on public.community_posts to anon, authenticated;
grant insert, update, delete on public.community_posts to authenticated;

-- المرحلة الرابعة: استقبال طلبات الخدمات من المستخدمين
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (char_length(trim(category)) between 2 and 80),
  area text not null check (char_length(trim(area)) between 2 and 100),
  phone text not null check (char_length(phone) between 8 and 20),
  details text not null check (char_length(trim(details)) between 8 and 1000),
  status text not null default 'new' check (status in ('new','reviewing','assigned','completed','cancelled')),
  assigned_provider_name text check (assigned_provider_name is null or char_length(trim(assigned_provider_name)) between 2 and 100),
  assigned_provider_phone text check (assigned_provider_phone is null or char_length(assigned_provider_phone) between 8 and 20),
  assignment_notes text check (assignment_notes is null or char_length(assignment_notes) <= 250),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- أعمدة ربط مقدم الخدمة (آمنة للتحديث على جدول موجود مسبقاً).
alter table public.service_requests add column if not exists assigned_provider_name text;
alter table public.service_requests add column if not exists assigned_provider_phone text;
alter table public.service_requests add column if not exists assignment_notes text;

create index if not exists service_requests_user_created_idx
  on public.service_requests (user_id, created_at desc);
create index if not exists service_requests_status_created_idx
  on public.service_requests (status, created_at desc);

alter table public.service_requests enable row level security;

drop policy if exists "Users can create their own service requests" on public.service_requests;
create policy "Users can create their own service requests"
  on public.service_requests for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can read their own service requests" on public.service_requests;
create policy "Users can read their own service requests"
  on public.service_requests for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins can manage all service requests" on public.service_requests;
create policy "Admins can manage all service requests"
  on public.service_requests for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

grant select, insert on public.service_requests to authenticated;
grant update, delete on public.service_requests to authenticated;

-- المرحلة التالية: مركز النشاط والإشعارات الشخصية والعامة
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 120),
  body text not null check (char_length(trim(body)) between 2 and 1000),
  type text not null default 'info' check (type in ('info','alert','service','offer')),
  related_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists user_notifications_user_created_idx on public.user_notifications(user_id, created_at desc);
create index if not exists user_notifications_unread_idx on public.user_notifications(user_id, read_at) where read_at is null;
alter table public.user_notifications enable row level security;
drop policy if exists "Users read own and broadcast notifications" on public.user_notifications;
create policy "Users read own and broadcast notifications" on public.user_notifications for select to authenticated
using (user_id = auth.uid() or user_id is null);
drop policy if exists "Users mark own notifications read" on public.user_notifications;
create policy "Users mark own notifications read" on public.user_notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
drop policy if exists "Admins manage notifications" on public.user_notifications;
create policy "Admins manage notifications" on public.user_notifications for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
grant select, update on public.user_notifications to authenticated;
grant insert, delete on public.user_notifications to authenticated;

-- إنشاء إشعار تلقائي لصاحب الطلب عند تغيّر الحالة أو تعيين مقدم خدمة.
create or replace function public.notify_service_request_owner()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_title text;
  v_body text;
begin
  if new.status is distinct from old.status or new.assigned_provider_name is distinct from old.assigned_provider_name then
    if new.status = 'assigned' then
      v_title := 'تم توجيه طلبك إلى مقدم خدمة';
      v_body := 'تم اختيار ' || coalesce(new.assigned_provider_name, 'مقدم خدمة') || ' لطلب ' || new.category || ' في ' || new.area || '.' || case when nullif(new.assignment_notes,'') is not null then ' ملاحظة: ' || new.assignment_notes else '' end;
    elsif new.status = 'reviewing' then
      v_title := 'طلبك قيد المتابعة'; v_body := 'بدأ فريق ويز اليوسفية بمتابعة طلب ' || new.category || '.';
    elsif new.status = 'completed' then
      v_title := 'اكتملت متابعة طلبك'; v_body := 'تم تحديث طلب ' || new.category || ' إلى مكتمل.';
    elsif new.status = 'cancelled' then
      v_title := 'تم إلغاء الطلب'; v_body := 'تم تحديث طلب ' || new.category || ' إلى ملغي.';
    else
      v_title := 'تحديث على طلبك'; v_body := 'تم تحديث حالة طلب ' || new.category || '.';
    end if;
    insert into public.user_notifications(user_id,title,body,type,related_id)
    values(new.user_id,v_title,v_body,'service',new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists service_request_notify_owner on public.service_requests;
create trigger service_request_notify_owner after update on public.service_requests
for each row execute function public.notify_service_request_owner();

-- تفعيل بث التحديثات الحية إذا لم يكن الجدول مضافاً إلى publication مسبقاً.
do $$ begin
  alter publication supabase_realtime add table public.user_notifications;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
