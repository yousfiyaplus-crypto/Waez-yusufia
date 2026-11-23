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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
