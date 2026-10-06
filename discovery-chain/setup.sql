-- 发现接龙 - Supabase 建表脚本
-- 在 https://supabase.com/dashboard 打开你的项目 -> SQL Editor -> 粘贴执行即可
-- 执行后无需其他配置，App 会自动切换到共享模式

create table if not exists public.discovery_chain (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  category text not null default '其他',
  free_quota text not null default '',
  tags text[] default '{}',
  submitter text default '匿名',
  upvotes int default 0,
  verified boolean default false,
  note text default '',
  flow jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 开启行级安全
alter table public.discovery_chain enable row level security;

-- 所有人可读
create policy "Allow public read" on public.discovery_chain
  for select using (true);

-- 所有人可提交新发现
create policy "Allow public insert" on public.discovery_chain
  for insert with check (true);

-- 所有人可点赞（更新 upvotes 字段）
create policy "Allow public upvote" on public.discovery_chain
  for update using (true) with check (true);

-- 按时间倒序建索引，加速列表加载
create index if not exists idx_dc_created_at on public.discovery_chain (created_at desc);
create index if not exists idx_dc_category on public.discovery_chain (category);
