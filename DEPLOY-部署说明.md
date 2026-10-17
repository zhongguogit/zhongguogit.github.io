# 部署说明（推送被拦时用这个）

## 现状

沙箱里能**读**仓库，但 `git push` 被 GitHub 拒绝（`Invalid username or token`）。
读操作正常说明令牌本身有效，问题出在写权限或网络拦截。

所以下面三种方式任选一种，都能在 5 分钟内让新页面出现在线上。

---

## 方式 A：GitHub 网页手动上传（最快，推荐）

1. 打开 <https://github.com/zhongguogit/zhongguogit.github.io>
2. 点 **Add file → Upload files**
3. 把 `deploy/` 里的 **5 个目录**（`pay`、`market`、`kits`、`dl`、`admin`）整个拖进去
4. Commit message 填 `收款系统 + 赚钱包 + 提示词市场`
5. 点 **Commit changes**
6. 等 1–2 分钟，打开 <https://zhongguogit.github.io/kits/> 验证

> 首页 `index.html` 也在这个 zip 里，可以一并拖上去覆盖（会覆盖掉旧首页，只新增了 3 个入口卡片，没删任何东西）。

---

## 方式 B：拿到新令牌后命令行推

在 <https://github.com/settings/tokens> 新建一个 token，**必须勾选 `repo` 权限**（只勾 `public_repo` 也可能被拒）。

```bash
cd /workspace/repo2
git remote set-url origin https://<新token>@github.com/zhongguogit/zhongguogit.github.io.git
git push origin HEAD:main
```

---

## 方式 C：换主机（如果 GitHub 长期不行）

这几个页面全是纯静态，没有服务端依赖，可以直接扔到任何静态托管：

| 平台 | 操作 | 成本 |
|---|---|---|
| **Vercel** | `npx vercel deploy --prod` | 免费 |
| **Cloudflare Pages** | 连 Git 仓库自动构建 | 免费 |
| **Netlify** | 拖拽 `deploy/` 文件夹到后台 | 免费 |

但要注意：换域名后 `/pay/config.js` 里的 Supabase 不需要改（跨域默认放开），
只是别人扫的链接域名变了。

---

## 部署后必须做的三件事（否则收不到钱）

### 1. 建表

Supabase → SQL Editor → 分别跑：

- `pay/schema.sql` —— 订单表
- `market/schema.sql` —— 商品表 + 成交表 + 结算视图

### 2. 收款码现状（已经帮你做好了）

- `pay/qr/wx.png` —— **已内嵌你的微信收款码**（裁出二维码本体 + 绿色套框），部署后即生效
- `pay/qr/ali.png` —— 支付宝**占位框**：选支付宝付款时显示「还没上传，请在支付宝收付款里保存后替换此图」，
  不会误导买家，但拿到支付宝收款码截图后应尽快替换

**怎么验证**：打开 `/pay/` → 点任意套餐 → 「去付款」→ 切「微信」，
看到你的收款码图（而不是红色警告）即成功；切「支付宝」会看到占位提示，属正常。

### 3. 改配置

`pay/config.js`：

```js
contactWechat: 'zhongguogit',   // ← 必须是真能加上的微信号
adminPin: '751206',             // ← 核销台口令，改掉
```

`market/config.js`：

```js
sellerPin: '751206',            // ← 卖家后台口令，改成另一个
```

---

## 验收清单

部署完照着点一遍，全部通过才算能收钱：

| # | 操作 | 期望结果 |
|---|---|---|
| 1 | 打开 `/kits/` | 5 个包卡片 + 今日行情 8 行价格 |
| 2 | 点「看包里有什么」 | 弹出交付清单、5 步路径、收益区间 |
| 3 | 点「扫码购买」 | 跳到 `/pay/`，显示「你正在购买市场商品」+ 正确价格 |
| 4 | 点「扫码购买」→「去付款」 | 出现订单号 + 收款码图片 |
| 5 | 填联系方式提交 | 出现「订单已登记」+ 微信号 |
| 6 | 打开 `/admin/` 输口令 | 能看到刚才那一单，状态「待核验」 |
| 7 | 点「✓ 已到账，开通」 | 状态变「已开通」 |
| 8 | 回 `/pay/` 输订单号查询 | 显示「已开通」 |
| 9 | 打开 `/market/` | 分类条正常，无商品时显示「你可以第一个上架」 |
| 10 | `/market/sell.html` 填表提交 | 拿到 `MK...` 编号 |

第 5、6、7 步是钱的关键路径。任何一步挂了，钱就收不到。
