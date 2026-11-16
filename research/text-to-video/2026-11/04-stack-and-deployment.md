# 技术栈、部署与额度治理

## 一、当前架构（Phase 1）

```
zhongguogit.github.io/
├── index.html              # 单页演示：模型雷达 / Prompt Studio / 成本计算
├── assets/
│   ├── styles.css          # 视觉系统
│   └── app.js              # 纯前端逻辑，无构建步骤
├── data/models.json        # 结构化模型/价格/来源数据（唯一数据源）
├── knowledge/              # Markdown 研究知识库
├── generated/              # 生成视频、提示词、额度日志
├── tools/t2v.py            # 本地 CLI：提示词构建 / 成本估算 / 模型推荐
└── .github/workflows/      # GitHub Pages 自动部署
```

**设计原则**

- **零后端、零构建**：纯 HTML/CSS/JS，GitHub Pages 直接托管，无 npm 依赖，长期可维护。
- **数据与展示分离**：模型数据集中在 `data/models.json`，站点与 CLI 共用，避免多处漂移。
- **不暴露密钥**：前端永远不调用真实视频 API；所有 API Key 留在本地或服务端代理。
- **可离线**：知识库为 Markdown，站点无外部 JS 依赖；字体使用系统回退。

## 二、本地开发

```bash
cd zhongguogit.github.io
python3 -m http.server 4173      # 不要用 file://，否则 fetch data/models.json 会被 CORS 拦截
# 打开 http://localhost:4173
```

CLI：

```bash
python3 tools/t2v.py prompt \
  --subject "橘猫蹲在雨后的青石巷口" \
  --action "缓慢抬头望向屋檐滴水" \
  --camera "缓慢推近" --shot "低角度近景" \
  --light "黄昏侧逆光" --style "写实电影质感" \
  --duration 5 --aspect 16:9 --model wan

python3 tools/t2v.py cost --model wan-3 --resolution 720 --duration 5 --count 3
python3 tools/t2v.py recommend --vram 16 --audio no --duration 10
```

## 三、Phase 2：接入真实生成

推荐的最小可用后端：

```
浏览器 → Serverless Function（Cloudflare Workers / Vercel / 阿里云 FC）
        → 模型 API（fal.ai / Runway / 火山方舟）
        → 对象存储（R2 / OSS）
        → 任务表（KV / SQLite / Supabase）
```

关键模块：

1. **任务队列**：提交后立即返回 `job_id`，前端轮询状态；视频生成通常 30–300 秒。
2. **成本守卫**：每次请求前校验「今日次数 / 预算 / 单条最大时长」，超限直接拒绝。
3. **密钥管理**：API Key 放服务端环境变量；前端只拿到短期签名上传地址。
4. **幂等与重试**：同一 `idempotency_key` 只创建一次任务；失败按指数退避。
5. **内容安全**：调用平台审核接口；保存提示词与输出以便追溯。
6. **存储规范**：视频 + 同名 `.json` 元数据（提示词、模型、种子、成本、评分）。

### 适配器接口草案

```python
class VideoProvider:
    name: str

    def estimate_cost(self, duration: float, resolution: str) -> float: ...
    def submit(self, prompt: str, **params) -> str: ...      # 返回 job_id
    def poll(self, job_id: str) -> dict: ...                  # status/progress/url/error
```

首批适配器：`fal_wan3`、`runway_gen45`、`veo31_fast`。开源本地则用 `comfyui`（HTTP API）或 `diffusers` 脚本。

## 四、Runway 免费额度治理

**硬规则（写死在代码与流程里）**

1. 每天最多 **3 次**生成。
2. 每次生成前读取 `generated/quota-log.csv`，统计当天 `count` 总和。
3. 剩余额度不足一条 5 秒（Gen-4.5 需 60 credits）时，当天不生成。
4. 只用于**验证提示词/镜头方向**，不用于成片。
5. 生成成功后立即记录：日期、模型、时长、credits、提示词文件、视频文件、评分。

**日志格式**

```csv
date,provider,model,duration_s,credits,remaining_credits,prompt_file,video_file,score,notes
2026-11-16,runway,gen-4.5,0,0,125,,,,"仅研究，未生成"
```

**命名规范**

```
generated/2026-11-16_runway_gen45_cat-alley_v1.mp4
generated/2026-11-16_runway_gen45_cat-alley_v1.json
```

## 五、开源本地部署速查

### ComfyUI（推荐给非工程用户）

1. 安装 ComfyUI 与 ComfyUI-Manager。
2. Wan 2.2：下载 `wan2.2_ti2v_5B_fp16.safetensors`、`wan2.2_vae.safetensors`、`umt5_xxl_fp8` 文本编码器，放入对应目录。
3. 打开官方模板 `Video → Wan2.2`，先跑 5B 低显存工作流，再升级 A14B。
4. 4090 建议开启 fp8/GGUF 量化；显存不足时开启 `--lowvram`。

### Diffusers（推荐给工程团队）

```python
import torch
from diffusers import DiffusionPipeline

pipe = DiffusionPipeline.from_pretrained(
    "Wan-AI/Wan2.2-TI2V-5B-Diffusers",
    torch_dtype=torch.bfloat16,
)
pipe.enable_model_cpu_offload()
video = pipe(
    prompt="A orange cat in a rainy alley, cinematic, slow push-in",
    num_frames=121,
    height=704,
    width=1280,
).frames[0]
```

> 显存不足时优先用 `enable_model_cpu_offload()`、fp8 量化、降低分辨率/帧数，而不是直接换更大 GPU。

## 六、GitHub Pages 部署

仓库名必须是 `zhongguogit.github.io`（用户站点），默认分支 `main`。

```bash
git init
git add .
git commit -m "feat: t2v research radar and prompt studio"
git branch -M main
git remote add origin https://github.com/zhongguogit/zhongguogit.github.io.git
git push -u origin main
```

然后在 GitHub 仓库 **Settings → Pages → Build and deployment** 选择 **GitHub Actions**。本仓库已包含 `.github/workflows/pages.yml`，push 后自动发布到 `https://zhongguogit.github.io`。

**注意**

- 需要 GitHub 登录/Token；本项目当前运行环境未登录，需用户授权后执行 push。
- `data/models.json` 必须随仓库提交，否则线上页面无数据。
- 若使用自定义域名，再添加 `CNAME`。

## 七、路线图

| 阶段 | 目标 | 验收标准 |
|---|---|---|
| P1（已完成） | 知识库 + 模型雷达 + Prompt Studio + 成本计算 | 本地/线上可打开，数据来自 models.json |
| P2 | Serverless 代理 + Runway/fal 适配器 | 能提交任务、轮询、落库；密钥不暴露 |
| P3 | 生成历史与评分面板 | 每条视频可回溯提示词、成本、评分 |
| P4 | 开源模型本地推理接入 | ComfyUI API 或 Diffusers worker 可切换 |
| P5 | 多模型自动比价与 A/B | 同一提示词自动跑 2–3 个模型并对比 |
