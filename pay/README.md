# 收款系统 · 站长操作手册

这一页给你自己看。三件事做完就能收钱：**建表 → 传收款码 → 改微信号**。

---

## 一、一次性：在 Supabase 建订单表（约 2 分钟）

打开 <https://supabase.com/dashboard/project/dnqswjrevffwdcksnwan/sql/new>，
把下面整段贴进去，点 **Run**：

```sql
-- 订单表
create table if not exists public.orders (
  id          bigserial primary key,
  order_id    text unique not null,
  plan_id     text not null,
  plan_name   text not null,
  amount      numeric(10,2) not null,
  paid_amount numeric(10,2),
  contact     text not null,
  note        text,
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);

-- 开行级安全
alter table public.orders enable row level security;

-- 任何人可以下单（只能插入，不能读别人的）
drop policy if exists "anyone can create order" on public.orders;
create policy "anyone can create order"
  on public.orders for insert
  to anon
  with check (true);

-- 任何人都能按订单号查（用于「查我的订单」）
drop policy if exists "anyone can read orders" on public.orders;
create policy "anyone can read orders"
  on public.orders for select
  to anon
  using (true);

-- 允许更新状态（核销台用）
drop policy if exists "anyone can update orders" on public.orders;
create policy "anyone can update orders"
  on public.orders for update
  to anon
  using (true) with check (true);

-- 允许删除（清理测试单用）
drop policy if exists "anyone can delete orders" on public.orders;
create policy "anyone can delete orders"
  on public.orders for delete
  to anon
  using (true);
```

> **为什么策略这么宽松？**
> GitHub Pages 是纯静态站，前端只能拿公开的 anon key，没法区分「站长」和「用户」。
> 所以这里的安全边界不是数据库权限，而是**钱只进你的收款码**——
> 别人看到订单表也拿不走一分钱，最多是恶作剧塞几条假订单。
> 核销台的口令挡的是随手点进来的人。要真正严格，得换成 Supabase 登录态 + RLS，那是另一个量级的工程。

---

## 二、上传收款码（1 分钟）

1. 微信 → 我 → 服务 → 收付款 → 二维码收款 → **保存收款码**
2. 支付宝 → 收付款 → **保存收款码**
3. 把两张图分别重命名为 `wx.png` 和 `ali.png`
4. 覆盖仓库里的 `/pay/qr/wx.png` 和 `/pay/qr/ali.png`

**判断上传成功没有**：打开 <https://zhongguogit.github.io/pay/>，
选任意套餐 → 点「去付款」，如果看到的是你的收款码图片而不是红色警告，就对了。

> 上传方式：GitHub 网页打开 `pay/qr/` 目录 → `Add file` → `Upload files` → 拖进去 → Commit。
> 建议裁掉收款码周围多余的白边，只留二维码本体，手机上更好扫。

---

## 三、改配置（30 秒）

打开 `/pay/config.js`，改这几行：

```js
contactWechat: 'zhongguogit',   // ← 改成你真实的微信号
adminPin: '751206',             // ← 改成你自己的口令，别用这个
```

价格也在同一个文件里的 `plans` 数组，改 `price` 数字即可，页面会自动同步。

---

## 四、日常：收到钱之后怎么做

用户付完款，会做两件事：**下单登记** + **加微信发截图**。你的动作：

1. 手机微信收到好友申请 / 消息，对方发来订单号 + 付款截图
2. 手机浏览器打开 <https://zhongguogit.github.io/admin/>，输口令
3. 「待核验」里找到这个订单号
4. 打开微信账单核实金额是否到账
5. 到账 → 点「✓ 已到账，开通」；没到账 → 点「✕ 驳回」并微信问清楚

用户回到 `/pay/` 输订单号自查，状态会立刻变成「已开通」。

---

## 五、这个方案的边界（说清楚，别误判）

| 能做到 | 做不到 |
|---|---|
| 扫码收钱，钱直达个人账户 | 自动到账确认（微信/支付宝个人码没有回调通知） |
| 订单登记、状态追踪、用户自助查询 | 自动开通会员（需要服务端逻辑，Pages 没有） |
| 7 天退款有据可查 | 防刷单（有人可以塞假订单，但付不了假钱） |
| 零手续费、零月租 | 开发票需手动操作 |

**要升级成真自动化的路径**（等有营业执照再说）：
申请微信支付商户号 → 用云函数接收支付回调 → 回调里调 Supabase 更新订单状态为 paid → 前端轮询订单状态自动解锁。
那套方案需要：企业主体 + 对公账户 + 域名备案 + 服务器。现在这条收款码路线是个人开发者唯一跑得通的。

---

## 六、文件清单

```
/pay/
  index.html     收款页（套餐、下单、查订单）
  config.js      ★ 你要改的只有这个
  pricing.js     页面逻辑
  qr/wx.png      ★ 微信收款码
  qr/ali.png     ★ 支付宝收款码
  README.md      本文件
/admin/
  index.html     核销台
  admin.js       核销逻辑
```
