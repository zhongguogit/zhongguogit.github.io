-- ============================================================
--  收款系统订单表（更新版：增加卡密与商品关联）
--  用法：Supabase Dashboard → SQL Editor → 整段粘贴 → Run
--  项目：dnqswjrevffwdcksnwan
-- ============================================================

create table if not exists public.orders (
  id          bigserial primary key,
  order_id    text unique not null,
  plan_id     text not null,
  plan_name   text not null,
  amount      numeric(10,2) not null,
  paid_amount numeric(10,2),
  contact     text not null,
  note        text,
  item_id     text,                                  -- 市场/商店商品编号（套餐单为空）
  key_code    text,                                  -- 8 位卡密，核销时生成
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

-- 已建过表的，补两列（幂等，可重复执行）
alter table public.orders add column if not exists item_id  text;
alter table public.orders add column if not exists key_code text;

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);

alter table public.orders enable row level security;

drop policy if exists "anyone can create order" on public.orders;
create policy "anyone can create order"
  on public.orders for insert to anon with check (true);

drop policy if exists "anyone can read orders" on public.orders;
create policy "anyone can read orders"
  on public.orders for select to anon using (true);

drop policy if exists "anyone can update orders" on public.orders;
create policy "anyone can update orders"
  on public.orders for update to anon using (true) with check (true);

drop policy if exists "anyone can delete orders" on public.orders;
create policy "anyone can delete orders"
  on public.orders for delete to anon using (true);
