-- 科创中心 - Supabase 建表脚本
-- 在 Supabase Dashboard -> SQL Editor 粘贴执行一次即可开启共享模式

-- 项目大厅
create table if not exists public.kc_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  category text default '其他',
  stage text default 'idea',
  needs text[] default '{}',
  budget int default 0,
  contact text default '',
  creator text default '匿名',
  likes int default 0,
  created_at timestamptz not null default now()
);

-- 资源对接
create table if not exists public.kc_resources (
  id uuid primary key default gen_random_uuid(),
  type text not null default '资金',
  title text not null,
  description text default '',
  value text default '',
  contact text default '',
  creator text default '匿名',
  created_at timestamptz not null default now()
);

-- 政策红利
create table if not exists public.kc_policies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text default '',
  benefit text default '',
  deadline text default '',
  url text default '',
  tags text[] default '{}',
  created_at timestamptz not null default now()
);

-- 创客社区
create table if not exists public.kc_posts (
  id uuid primary key default gen_random_uuid(),
  author text default '匿名',
  content text not null,
  category text default '交流',
  likes int default 0,
  created_at timestamptz not null default now()
);

alter table public.kc_projects enable row level security;
alter table public.kc_resources enable row level security;
alter table public.kc_policies enable row level security;
alter table public.kc_posts enable row level security;

create policy "kc_projects_read" on public.kc_projects for select using (true);
create policy "kc_projects_insert" on public.kc_projects for insert with check (true);
create policy "kc_projects_update" on public.kc_projects for update using (true) with check (true);

create policy "kc_resources_read" on public.kc_resources for select using (true);
create policy "kc_resources_insert" on public.kc_resources for insert with check (true);

create policy "kc_policies_read" on public.kc_policies for select using (true);
create policy "kc_policies_insert" on public.kc_policies for insert with check (true);

create policy "kc_posts_read" on public.kc_posts for select using (true);
create policy "kc_posts_insert" on public.kc_posts for insert with check (true);
create policy "kc_posts_update" on public.kc_posts for update using (true) with check (true);

create index if not exists idx_kc_projects_created on public.kc_projects (created_at desc);
create index if not exists idx_kc_resources_created on public.kc_resources (created_at desc);
create index if not exists idx_kc_posts_created on public.kc_posts (created_at desc);
