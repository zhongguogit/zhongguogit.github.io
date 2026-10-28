# 文生视频模型与平台数据库

> 更新：2026-10-28 · 价格单位：USD（另标注 CNY 的除外）· 汇率按 1 USD ≈ 7.2 CNY 估算
> 所有数据来自公开页面，平台政策随时可能变化，接入前请复核官网。

## 快速对比总表

### 一、开源模型（可本地部署）

| 模型 | 参数 | 能力 | 分辨率/时长 | 显存门槛 | 许可 | 最适合 |
| --- | --- | --- | --- | --- | --- | --- |
| **Wan2.2-TI2V-5B** | 5B | 文/图生视频 | 720P / 24fps / 5s 级 | 24GB（4090 可跑） | Apache 2.0 | 本地首选、商用最省心 |
| **Wan2.2-T2V-A14B** | 14B MoE | 文生视频 | 480P/720P / 5s 级 | 80GB（可 offload） | Apache 2.0 | 高质量开源、批量生产 |
| **HunyuanVideo 1.5** | 8.3B | 文/图生视频，1080P SR | 480P/720P（SR 到 1080P） | 14GB 起（offload） | 腾讯混元社区许可 | 消费级显卡、中文提示词 |
| **LTX-2.5** | 22B（蒸馏） | 音视频同步、图/文生视频 | 最高 4K / 50fps / 20s | 高（建议 24GB+，可量化） | LTX 社区许可 | 原生音频、4K、专业工作流 |
| **Open-Sora 2.0** | 11B | 文/图生视频 | 256px / 768px | 多卡 H100/H800 | Apache 2.0 | 研究、复现、二次训练 |
| **Mochi 1** | 10B | 文生视频 | 480P / 5.4s / 30fps | 1×H100（约 60GB）或 fp8 24GB | Apache 2.0 | 开源研究、运动质量 |
| **CogVideoX 1.5-5B** | 5B | 文/图生视频 | 768P / 10s / 16fps | 8–33GB（量化可降） | CogVideoX 许可（商用需登记） | 低显存、中文生态 |
| **AnimateDiff** | SD1.5 模块 | 图生动画/风格化 | 512px / 16 帧 | 8GB 起 | Apache 2.0 | SD 生态、动漫/风格化 |
| **Stable Video Diffusion** | 1.1B | 仅图生视频 | 576×1024 / 14–25 帧 | 8GB 起（建议 16GB） | Stability 社区许可 | 老项目维护，不推荐新做 |

> “5s 级”表示官方示例多为 5 秒片段，可通过首尾帧/拼接扩展；不是单次无限时长。

### 二、云 API / MaaS 平台

| 平台/模型 | API 形态 | 参考价格 | 原生音频 | 优点 | 缺点 |
| --- | --- | --- | --- | --- | --- |
| **Runway Gen-4.5** | 官方 API + 网页 | 12 credits/秒；$15/月=625 credits | 部分 | 工作流最完整、镜头控制强 | 免费额度一次性、credits 消耗快 |
| **Kling 3.0 / 4.0** | fal.ai / 官方 API | $0.112/秒（无声）$0.168/秒（有声） | 是 | 运动与运镜强、原生 4K/音频 | 价格中高、地区限制 |
| **Google Veo 3.1** | Gemini API / AI Studio | 约 $0.03–0.50/秒（分档） | 是 | 电影感、对白/音效强 | 接入门槛高、贵、区域限制 |
| **Seedance 2.0 / 2.5** | 火山引擎 / fal.ai | 720P 有声 $0.3034/秒 | 是 | 运动自然、多镜头 | 单价最高档之一 |
| **Wan 3.0（阿里云百炼）** | DashScope API | 480P ¥0.3 / 720P ¥0.6 / 1080P ¥1.2 每秒 | 是（音画一体） | 国内直连、失败不计费、便宜 | 需阿里云实名与内容审核 |
| **Hailuo（MiniMax）** | 官方 API | 按量/套餐 | 部分 | 物理表现好、免费额度慷慨 | 长镜头一致性一般 |
| **Vidu** | 官方 API | 按量/套餐 | 部分 | 参考生视频、动漫强 | 生态与文档相对小 |
| **fal.ai（聚合）** | 统一 REST | 按模型每秒计费 | 取决于模型 | 一个 Key 接多家、部署快 | 加价、数据出境需评估 |

### 三、免费网页平台

> 以下额度来自 2026-10 公开活动页/评测，属于运营政策，**随时可能调整**。仅建议用于创意验证。

| 平台 | 免费额度（参考） | 亮点 | 限制 |
| --- | --- | --- | --- |
| 即梦 AI（字节） | 每日约 60 积分，约 10 次 | Seedance 模型、国内直连 | 排队、商用需看条款 |
| 可灵 AI（快手） | 每日 66 灵感值 | 写实运动、运镜 | 5 秒为主、积分消耗快 |
| 海螺 AI（MiniMax） | 注册 3000 积分 + 每日额度 | 物理与电影感 | 高峰期排队 |
| Vidu（生数） | 每日约 10 次 | 参考生视频、动漫 | 免费档分辨率受限 |
| 清影（智谱） | 免费、无水印、可商用 | CogVideoX 同源、零成本 | 画质/时长有限 |
| 通义万相（阿里） | 每日签到灵感值 | 万相 3.0、多参考 | 高级能力需付费 |
| 混元 AI 视频（腾讯） | 免费体验 | 中文语义、物理一致性 | 次数有限 |
| Runway | 125 credits（一次性） | Gen-4.5、专业工作流 | 5 秒约 60 credits，仅约 2 条 |
| Pika | 每月 80 credits | 创意特效、风格化 | 时长/分辨率受限 |
| Luma Dream Machine | 每月 30 次 | 3D 运镜、物体旋转 | 带水印、排队 |
| PixVerse | 注册 90 + 每日 60 credits | 1080P、原生音频 | 免费档功能受限 |
| Dreamina（字节） | 每日免费积分 | Seedance、1080P | 地区/账号限制 |
| AI Video Maker | 永久免费、480P | 无限次、中文界面 | 画质低、稳定性一般 |

## 一、开源模型（本地部署）

### Wan2.2（阿里，2025-07 开源，当前开源主力）

- **仓库**：<https://github.com/Wan-Video/Wan2.2> · 权重：<https://huggingface.co/Wan-AI>
- **版本**：
  - `T2V-A14B`：MoE 文生视频，480P/720P
  - `I2V-A14B`：图生视频，480P/720P
  - `TI2V-5B`：文/图生视频，720P@24fps，**24GB 显存可跑**
  - `S2V-14B`：语音驱动数字人
  - `Animate-14B`：角色动画/替换
- **许可**：Apache 2.0，官方明确不主张生成内容版权。
- **优点**：开源里商用最清晰；5B 版本硬件门槛低；ComfyUI/Diffusers/DiffSynth 全支持；中文提示词友好。
- **缺点**：A14B 单卡需 80GB；5B 画质与运镜弱于闭源旗舰；原生音频缺失（S2V 另算）。
- **适用**：本地批量生成、产品原型、需要可商用的视频素材。

### HunyuanVideo 1.5（腾讯，2025-11 技术报告）

- **仓库**：<https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5> · 权重：<https://huggingface.co/tencent/HunyuanVideo-1.5>
- **规格**：8.3B；T2V/I2V；480P、720P，配 SR 可到 1080P；最低 14GB 显存（开启 offload），Wan2GP 可低至 6GB。
- **许可**：Tencent Hunyuan Community License；允许商用，但**许可地域不含 EU/UK/韩国**，需查 LICENSE。
- **优点**：轻量、中文提示词/指令遵循强；ComfyUI 与 LoRA 训练齐全；画质在同尺寸里靠前。
- **缺点**：社区许可有地域限制；原生音频无；高分辨率需要 SR 阶段。
- **适用**：16GB 左右显卡、中文创作者、想要比 Wan5B 更好的画质。

### LTX-2.5（Lightricks，2026-08-11）

- **仓库**：<https://github.com/Lightricks/LTX-2> · 权重：<https://huggingface.co/Lightricks/LTX-2.5>
- **规格**：22B 蒸馏 Transformer；音视频同步；最高 4K / 50fps / 20 秒；支持多关键帧、LoRA、3D 相机逻辑、HDR。
- **许可**：LTX Community License（2026-08-11 版），开放权重但**商用条款需逐条核对**。
- **优点**：开源里少见的“原生音频 + 4K”；效率高，消费级高端卡可跑蒸馏版；ComfyUI 插件完善。
- **缺点**：模型大、全质量流程显存高；许可不是 Apache；中文资料少。
- **适用**：需要音画一体、广告/短片、愿意研究 ComfyUI 工作流。

### Open-Sora 2.0（HPC-AI，2025-03）

- **仓库**：<https://github.com/hpcaitech/Open-Sora> · 报告：arXiv 2503.09642
- **规格**：11B；T2V + I2V；256px/768px；训练成本约 $200K；VBench 对齐 HunyuanVideo 11B、Step-Video 30B。
- **许可**：Apache 2.0。
- **优点**：训练代码/数据管线完整，适合研究与二次训练；完全开源。
- **缺点**：768px 需多卡 H100/H800；推理工程复杂；生态不如 Wan。
- **适用**：复现论文、训练自有模型、学术研究。

### Mochi 1（Genmo，2024-10）

- **仓库**：<https://github.com/genmoai/mochi> · 权重：<https://huggingface.co/genmoai/mochi-1-preview>
- **规格**：10B AsymmDiT；480P / 5.4s / 30fps；1×H100（约 60GB），fp8 量化可到 24GB 内。
- **许可**：Apache 2.0。
- **优点**：运动质量与物理感好；完全开放；ComfyUI 支持。
- **缺点**：分辨率低；生成慢（4090 约 8 分钟/5 秒）；2024 年模型，画质已被 Wan/LTX 超越。
- **适用**：研究 AsymmDiT、开源基线对比。

### CogVideoX 1.5（智谱，2024-11）

- **仓库**：<https://github.com/THUDM/CogVideo> · 权重：<https://huggingface.co/THUDM/CogVideoX1.5-5B>
- **规格**：2B/5B；1.5-5B 支持 768P、10 秒、16fps；I2V 任意比例；量化后 4–33GB 显存。
- **许可**：代码与 2B 为 Apache 2.0；5B 为 CogVideoX License，**商用需在智谱开放平台登记**。
- **优点**：低显存可跑；中文生态好；Diffusers 集成成熟；清影同源。
- **缺点**：帧率低、运动偏慢；5B 商用需登记；画质落后一代。
- **适用**：低显存实验、中文教学、清影 API 的本地替代。

### AnimateDiff（2023）

- **仓库**：<https://github.com/guoyww/AnimateDiff>
- **规格**：SD1.5 运动模块；16 帧；512px；8GB 显存起。
- **许可**：Apache 2.0。
- **优点**：复用 SD1.5 生态（LoRA/ControlNet），风格控制极强；显存低。
- **缺点**：不是原生 T2V 大模型，时长/一致性有限；2023 年技术。
- **适用**：动漫、风格化循环动画、ControlNet 工作流。

### Stable Video Diffusion（Stability，2023）

- **仓库**：<https://github.com/Stability-AI/generative-models>
- **规格**：SVD / SVD-XT；仅图生视频；14/25 帧；576×1024；8GB 起。
- **许可**：Stability AI Community License（年收入 <$1M 可免费商用，需注册）。
- **优点**：稳定、生态成熟、ComfyUI 支持好。
- **缺点**：**不支持文生视频**；帧数短；画质落后。
- **适用**：老项目维护、单图轻微运动；新项目不建议。

## 二、云 API / MaaS 平台

### Runway（Gen-4.5）

- **定价页**：<https://runway.com/pricing>
- **免费**：125 credits，一次性，不按月刷新；5GB 存储。
- **付费**：Standard $15/月（625 credits，约 52 秒 Gen-4.5）；Pro $35/月（2250 credits）；Max $95/月（9500 credits，可 rollover 1 个月）。
- **消耗**：Gen-4.5 12 credits/秒（5 秒 = 60 credits）；Gen-4 Turbo 约 6 credits/秒；Kling 4.0 约 118 credits/5 秒（限时 25% off 至 2026-11-30）。
- **API**：官方 API 支持 Gen-4.5/Gen-4/Kling/Seedance 等，按 credits 计费；具体以开发者后台为准。
- **优点**：模型最全、时间线编辑、角色一致性、镜头控制、4K 放大。
- **缺点**：免费额度很快用完；订阅制；部分模型仅网页。
- **适用**：专业短片、广告、需要后期工作流。

### Kling（3.0 / 4.0）

- **入口**：<https://klingai.com> · API 可通过 fal.ai
- **价格**：fal 上 Kling 3.0 Pro $0.112/秒（无声）、$0.168/秒（有声）；2.5 Turbo Pro $0.07/秒；4.0 有 25% 限时优惠。
- **免费**：网页每日约 66 灵感值。
- **优点**：运动/运镜第一梯队；原生 4K 与音频；失败生成不扣费（部分渠道）。
- **缺点**：价格中高；地区/账号限制；长镜头一致性仍有限。
- **适用**：写实人物、动作、商业短片。

### Google Veo 3.1

- **入口**：<https://aistudio.google.com> / Gemini API
- **价格**：Google AI Pro $19.99/月（限量 Veo）；AI Ultra $249.99/月；API 约 $0.03–0.50/秒（分档）。
- **免费**：AI Studio 每日约 3 次（政策易变）。
- **优点**：电影感、原生对白/音效、提示词遵循强。
- **缺点**：贵、区域限制、免费额度不稳定。
- **适用**：高质量概念片、对白场景。

### Seedance 2.0 / 2.5（字节）

- **入口**：火山引擎 / Dreamina / fal.ai
- **价格**：fal 720P 有声 $0.3034/秒；Runway 内 1080P Pro 160 credits/4 秒；Mini 更便宜。
- **优点**：运动自然、多镜头、中文语义好；国内可直连（即梦/Dreamina）。
- **缺点**：单价高；免费额度有限；不同渠道能力不一致。
- **适用**：短视频、广告、需要多镜头的叙事。

### Wan 3.0（阿里云百炼）

- **入口**：<https://bailian.console.aliyun.com> · 文档：wan3.0-video
- **价格**：480P ¥0.3/秒、720P ¥0.6/秒、1080P ¥1.2/秒；**失败不计费**；有 Prime 优速推理。
- **优点**：国内合规直连、按秒计费便宜、音画一体、支持首尾帧/参考。
- **缺点**：需实名/开通百炼；内容审核严格；高分辨率成本上升快。
- **适用**：国内产品接入、批量短视频、成本敏感型项目。

### Hailuo / Vidu / Pika / Luma

| 平台 | 免费额度 | 特点 | 适合 |
| --- | --- | --- | --- |
| Hailuo（MiniMax） | 每日额度 + 注册积分 | 物理运动、电影感 | 写实短片 |
| Vidu（生数） | 每日约 10 次 | 参考生视频、动漫 | 角色一致性 |
| Pika | 80 credits/月 | 创意特效、Pikaffects | 社交创意短片 |
| Luma | 30 次/月 | 3D 运镜、物体旋转 | 产品展示 |

## 三、许可证避坑

| 模型 | 许可 | 商用 | 注意 |
| --- | --- | --- | --- |
| Wan2.2 | Apache 2.0 | ✅ | 保留版权声明即可 |
| Open-Sora 2.0 | Apache 2.0 | ✅ | 保留版权声明 |
| Mochi 1 | Apache 2.0 | ✅ | 保留版权声明 |
| AnimateDiff | Apache 2.0 | ✅ | 依赖的 SD1.5 权重另有许可 |
| HunyuanVideo 1.5 | 腾讯混元社区许可 | ✅（限地域） | **不含 EU/UK/韩国** |
| LTX-2.5 | LTX 社区许可 | ⚠️ 需核对 | 不是 Apache，商用条款单独约定 |
| CogVideoX-5B | CogVideoX License | ⚠️ 需登记 | 商用需在智谱开放平台申请 |
| Stable Video Diffusion | Stability 社区许可 | ⚠️ 有条件 | 年收入门槛 + 注册 |
| Runway/Kling/Veo | 平台 ToS | 按套餐 | 免费档可能禁止商用/带水印 |

## 四、选型决策树

```text
需要原生音频？
├─ 是 → 预算充足：Veo 3.1 / Seedance 2.0 / Kling 3.0
│       本地：LTX-2.5
└─ 否 → 需要本地部署？
         ├─ 是 → 显存 <16GB：HunyuanVideo 1.5（offload）或 CogVideoX 1.5
         │        16–24GB：Wan2.2-TI2V-5B（首选）
         │        24–80GB：Wan2.2-T2V-A14B / LTX-2.5
         │        多卡：Open-Sora 2.0（研究）
         └─ 否 → 只想免费：即梦 / 可灵 / 海螺 / 清影
                  要接产品：Wan 3.0（国内）/ fal.ai（海外）
                  要专业工作流：Runway Gen-4.5
```

## 五、参考来源

- Wan2.2 README 与 LICENSE（Apache 2.0）
- HunyuanVideo 1.5 README / LICENSE（Tencent Hunyuan Community）
- LTX-2 README / LICENSE-2_x（LTX Community License）
- Open-Sora README / LICENSE（Apache 2.0）
- Mochi 1 模型卡（Apache 2.0）
- CogVideoX README / LICENSE（2B Apache 2.0；5B CogVideoX License）
- Runway Pricing：<https://runway.com/pricing>
- fal.ai Pricing：<https://fal.ai/pricing>
- 阿里云百炼 Wan3.0 公告：<https://www.aliyun.com/product/news/30378>
- OpenAI Sora 停服说明：<https://openai.com/sora/#pricing>
