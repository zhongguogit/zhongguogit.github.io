-- ============================================================
--  市场表：商品 + 成交
--  Supabase Dashboard → SQL Editor → 整段粘贴 → Run
--  项目：dnqswjrevffwdcksnwan
-- ============================================================

-- ---------- 商品 ----------
create table if not exists public.market_items (
  id          bigserial primary key,
  item_id     text unique not null,
  title       text not null,
  category    text not null,
  platform    text not null,
  price       numeric(10,2) not null,
  summary     text not null,
  free_text   text not null,
  pro_text    text not null,
  version     text,
  seller      text not null,
  fail_case   text,
  tags        text,
  status      text not null default 'review',   -- review / live / offline
  sales       int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists mk_cat_idx    on public.market_items (category);
create index if not exists mk_status_idx on public.market_items (status);
create index if not exists mk_time_idx   on public.market_items (created_at desc);

alter table public.market_items enable row level security;

drop policy if exists "mk insert" on public.market_items;
create policy "mk insert" on public.market_items for insert to anon with check (true);

drop policy if exists "mk read" on public.market_items;
create policy "mk read" on public.market_items for select to anon using (true);

drop policy if exists "mk update" on public.market_items;
create policy "mk update" on public.market_items for update to anon using (true) with check (true);

drop policy if exists "mk delete" on public.market_items;
create policy "mk delete" on public.market_items for delete to anon using (true);


-- ---------- 成交记录（用于算 3% 抽成） ----------
create table if not exists public.market_orders (
  id            bigserial primary key,
  order_id      text unique not null,
  item_id       text not null,
  item_title    text,
  seller        text not null,
  gross         numeric(10,2) not null,          -- 成交额
  fee_pct       numeric(5,2) not null default 3, -- 抽成比例
  fee_amount    numeric(10,2) not null,          -- 平台服务费
  net_to_seller numeric(10,2) not null,          -- 卖家到手
  buyer_contact text,
  status        text not null default 'pending',  -- pending / delivered / refunded
  created_at    timestamptz not null default now()
);

create index if not exists mo_seller_idx on public.market_orders (seller);
create index if not exists mo_time_idx   on public.market_orders (created_at desc);

alter table public.market_orders enable row level security;

drop policy if exists "mo insert" on public.market_orders;
create policy "mo insert" on public.market_orders for insert to anon with check (true);

drop policy if exists "mo read" on public.market_orders;
create policy "mo read" on public.market_orders for select to anon using (true);

drop policy if exists "mo update" on public.market_orders;
create policy "mo update" on public.market_orders for update to anon using (true) with check (true);

drop policy if exists "mo delete" on public.market_orders;
create policy "mo delete" on public.market_orders for delete to anon using (true);


-- ---------- 卖家结算视图（后台直接看，不用自己算） ----------
create or replace view public.seller_payout as
select
  seller,
  count(*) filter (where status = 'delivered')                as orders_done,
  coalesce(sum(gross)      filter (where status = 'delivered'), 0) as gross_total,
  coalesce(sum(fee_amount) filter (where status = 'delivered'), 0) as fee_total,
  coalesce(sum(net_to_seller) filter (where status = 'delivered'), 0) as payout_total
from public.market_orders
group by seller;
