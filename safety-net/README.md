# site/ · GitHub Pages 门面

**Global Safety Net** 的对外门面：纯静态、零构建、可离线（PWA），推上去就活。

```
/safety-net/                 ← 落地区（钩子 + 领卡动效）
├── arch/                    ← 20 域可点击架构图（键盘可用 / 可分享 #domain-16）
├── hall/                    ← 学习大厅 + 无人区开荒地图（进度存本地）
├── demand/                  ← 需求雷达 + Skill 工坊：预测 → 命中 → 组队 → 接单 / 无单铸 Skill → 售出
├── manifesto/               ← 宣言
├── assets/
│   ├── style.css            ← 统一样式（含架构/大厅/宣言页）
│   ├── pwa.js               ← SW 注册 + 在线状态
│   ├── app.js               ← 镜像流（结果本地记忆）
│   ├── arch.js / hall.js    ← 页面交互
│   ├── demand.js / skills.js ← 需求预测、组队接单、Skill 铸造与出售
│   ├── icon-192/512.png     ← PWA 图标
│   └── og.png               ← 1200×630 社交分享图
├── manifest.webmanifest     ← PWA 清单（可安装 / 快捷入口）
├── sw.js                    ← Service Worker（离线优先）
├── sitemap.xml
└── robots.txt（仓库根）
```

> ⚠️ **这只是门面**。规则引擎、事件总线、支付、账本、分账都在后端（另署合规云），
> 钱和敏感数据**不经这里**。仓库根目录的 `02-架构总纲.md` 起是完整设计稿。

---

## 上线（部署到子目录，不动现有主页）

现有 `zhongguogit.github.io` 根目录已是个人门户，因此本门面放在 **`/safety-net/`** 子路径：

```bash
git clone https://github.com/zhongguogit/zhongguogit.github.io.git
cd zhongguogit.github.io
mkdir -p safety-net
cp -r /path/to/site/* safety-net/
git add safety-net
git commit -m "feat: Global Safety Net 门面（PWA 离线版）"
git push
```

Pages 不需要改设置（沿用 `main` / `(root)`）。1–2 分钟后：

```
https://zhongguogit.github.io/safety-net/
```

## 本地先点一遍

```bash
cd site
python3 -m http.server 8000
# 开 http://localhost:8000
```

> Service Worker 只在 `https://` 或 `localhost` 生效：线上可离线，本地 `localhost` 也能测。

## 国内慢怎么办

GitHub CDN 在大陆不稳，可以给大陆用户再挂一份 **Gitee Pages** 或套 Cloudflare 加速。

---

**别把令牌/PAT/密码贴进这个目录或聊天里。** 上传用浏览器登录态或本机已登录的 `gh` 即可。
