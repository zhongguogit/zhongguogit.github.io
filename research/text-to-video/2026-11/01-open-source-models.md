# 开源文生视频模型横向对比

> 检索日期：2026-11-16 ｜ 星标与更新时间来自 GitHub API 当日快照 ｜ 显存为官方 README 口径或社区实测下限

## 总览

| 模型 | 机构 | 参数 | 最低显存 | 最长时长 | 最高分辨率 | 原生音频 | 许可 | GitHub | ★ |
|---|---|---|---|---|---|---|---|---|---|
| **Wan 2.2** | 阿里 Wan-AI | 5B / A14B MoE | 8–24 GB | 10 s | 720p@24fps | 否 | Apache-2.0 | [Wan-Video/Wan2.2](https://github.com/Wan-Video/Wan2.2) | 18.7k |
| **HunyuanVideo 1.5** | 腾讯混元 | 8.3B | 14 GB（offload） | 10 s | 1080p（VSR） | 否 | 社区许可 | [Tencent-Hunyuan/HunyuanVideo-1.5](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5) | 4.6k |
| **LTX-2.5** | Lightricks | 22B 蒸馏 | 24 GB+ | ~10 s | 4K@24fps | **是** | LTX-2.x 社区许可 | [Lightricks/LTX-2](https://github.com/Lightricks/LTX-2) | 10.3k |
| **Mochi 1** | Genmo | ~10B | 60 GB（ComfyUI <20 GB） | 5–6 s | 848×480 | 否 | Apache-2.0 | [genmoai/mochi](https://github.com/genmoai/mochi) | 3.8k |
| **CogVideoX / 1.5** | 智谱 Z.ai | 2B / 5B | 4–24 GB | 6–10 s | 720p | 否 | Apache-2.0 | [zai-org/CogVideo](https://github.com/zai-org/CogVideo) | 13.2k |
| **Open-Sora 2.0** | HPC-AI Tech | 11B | 24 GB+ | ~5 s | 768×768 | 否 | Apache-2.0 | [hpcaitech/Open-Sora](https://github.com/hpcaitech/Open-Sora) | 29.9k |
| **AnimateDiff** | 上海 AI Lab / 社区 | 417M 运动模块 | 8–13 GB | 1–2 s | 随 SD 底模 | 否 | Apache-2.0 | [guoyww/AnimateDiff](https://github.com/guoyww/AnimateDiff) | 12.3k |
| **Stable Video Diffusion** | Stability AI | ~1.5B | ~10 GB | ~4 s | 1024×576 | 否 | Stability 社区许可 | [Stability-AI/generative-models](https://github.com/Stability-AI/generative-models) | 26k |

## 逐项笔记

### 1. Wan 2.2 — 当前最值得优先尝试的开源全家桶

- **规模**：T2V-A14B / I2V-A14B（MoE，480P & 720P）、TI2V-5B（720P）、S2V-14B（语音驱动）、Animate-14B（角色动画/替换）。
- **关键工程点**：5B 版使用 16×16×4 高压缩 VAE，720P@24fps 可在 RTX 4090 上运行，是「消费级显卡 + 高清」的甜点。
- **生态**：官方支持 Diffusers、ComfyUI 原生工作流、ModelScope；2025-11 起 Animate 已并入 Diffusers。
- **优点**：Apache-2.0 商用友好；任务覆盖最全；中文提示词可用；社区 LoRA/加速方案多。
- **缺点**：A14B 需 24GB+；原生无声；10 秒上限。
- **适合**：私有化部署、图生视频、角色动画、需要商用许可的产品原型。

### 2. HunyuanVideo 1.5 — 单卡 10 秒 720p 的性价比之选

- **规模**：8.3B DiT + 3D causal VAE（空间 16×、时间 4× 压缩）。
- **关键工程点**：SSTA（Selective and Sliding Tile Attention）剪枝冗余时空 KV，10 秒 720p 相比 FlashAttention-3 端到端加速 1.87×。
- **速度**：步数蒸馏模型在单张 RTX 4090 上可 75 秒内生成；支持 8/12 步。
- **优点**：14GB 显存即可跑（offload）；原生 10 秒；few-step 超分到 1080p；提供 480P/720P 多个 T2V/I2V 权重。
- **缺点**：社区许可对商用有约束；无声；高画质模式仍需更大显存。
- **适合**：单卡消费级 GPU、需要 10 秒镜头与 1080p 输出的个人/小团队。

### 3. LTX-2.5 — 原生音视频联合生成

- **规模**：LTX-2.5 使用 22B 蒸馏 Transformer + Gemma 4 12B 文本编码器，配套视频/音频 VAE。
- **能力**：首个 DiT 音视频基础模型，原生同步音频与视频；最高 4K、24fps；支持 HDR/EXR；DFR（Diffusion Fidelity Rendering）生产级管线。
- **优点**：一次生成即带声音，省去配音/对唇；4K；蒸馏管线速度快。
- **缺点**：权重是 LTX-2.x 社区许可（代码才是 Apache-2.0）；22B 显存门槛高；版本迭代快。
- **适合**：需要原生音频的广告、口播、氛围片；音视频联合研究。

### 4. Mochi 1 — 运动物理最佳的开源基线

- **架构**：AsymmDiT + AsymmVAE（8×8 空间、6× 时间、12 通道 latent，128× 压缩）。
- **优点**：水流、布料、手势等运动自然；Apache-2.0；官方提供 LoRA 微调脚本（H100/A100 80GB）。
- **缺点**：原生 480p；5–6 秒；官方单卡约 60GB，ComfyUI 可优化到 20GB 以下；偏写实，动画风格弱。
- **适合**：写实自然运动镜头；作为质量对照基线。

### 5. CogVideoX / 1.5 — 提示词跟随与研究友好

- **架构**：专家 Transformer 统一处理文本与视觉 token，复杂多子句提示词的语义准确度更好。
- **优点**：2B 版 Apache-2.0、16GB 可跑；1.5-5B 支持 10 秒；代码模块化、消融实验完整；Diffusers 集成好。
- **缺点**：画质落后新一代；主仓库 2025-11 后更新放缓；无声。
- **适合**：教学、论文复现、需要精确构图/属性绑定的自定义管线。

### 6. Open-Sora 2.0 — 完整可复现的 Sora 式训练栈

- **规模**：11B，支持 256px / 768px，T2V 与 I2V 共用一个模型。
- **优点**：训练/数据清洗/评测全开源；支持 16:9、9:16、1:1、2.39:1；可用 ColossalAI 多卡；官方报告训练成本约 20 万美元。
- **缺点**：视觉质量非第一梯队；T2V 依赖 Flux 文本生图前置；训练门槛高。
- **适合**：想理解或自研视频基础模型的团队。

### 7. AnimateDiff — 让任意 SD 模型动起来

- **原理**：在 SD1.5/SDXL 中插入运动模块，复用已有 LoRA、ControlNet、风格模型。
- **优点**：8GB 显存可跑；CivitAI 风格库巨大；Motion LoRA 可控推拉摇移；SparseCtrl 支持稀疏 RGB/草图条件。
- **缺点**：16–32 帧（1–2 秒）；需要图像种子，不是纯文生视频；主仓库 2024-07 后停更，实际维护转移到 [ComfyUI-AnimateDiff-Evolved](https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved)。
- **适合**：已有 SD 工作流的风格化短循环、动态分镜、表情包。

### 8. Stable Video Diffusion — 图生视频经典基线

- **能力**：SVD / SVD-XT，14 或 25 帧，约 576×1024，图生视频。
- **优点**：Diffusers 集成成熟；显存要求适中；运动自然。
- **缺点**：不支持纯文本；4 秒；画质已被超越；社区许可对年收入 ≥100 万美元的公司需付费。
- **适合**：让已有图片动起来；作为 I2V 对照基线。

## 选型决策表

| 你的约束 | 推荐 |
|---|---|
| 只有 8–12GB 显存 | AnimateDiff、CogVideoX-2B、LTX-Video（旧版）/ LTX-2 低配管线 |
| 16–24GB 显存，要 720p | Wan 2.2 TI2V-5B、HunyuanVideo 1.5、CogVideoX-5B |
| 要 10 秒长镜头 | HunyuanVideo 1.5、Wan 2.2 |
| 要原生音频 | LTX-2.5（开源）、Veo 3.1 / Kling 3.0 / Seedance 2.5（商业） |
| 要商用友好许可 | Wan 2.2、Mochi 1、CogVideoX、Open-Sora（Apache-2.0） |
| 要最容易接 ComfyUI | Wan 2.2、HunyuanVideo、LTX-2 |
| 要研究/训练自有模型 | Open-Sora 2.0、CogVideoX |
| 要图生视频 | Wan 2.2 I2V、HunyuanVideo 1.5 I2V、SVD |

## 自托管成本粗算

| GPU | 典型云价（参考） | 能跑 | 5 秒 720p 粗略耗时 |
|---|---|---|---|
| RTX 4090 24GB | $0.3–0.7 / 小时 | Wan 2.2 5B、HunyuanVideo 1.5 蒸馏 | 1–3 分钟 |
| A100 40GB | $1–2 / 小时 | Wan 2.2 A14B、CogVideoX-5B | 2–5 分钟 |
| H100 80GB | $2–4 / 小时 | HunyuanVideo 1.5 全量、Mochi 1、LTX-2.5 | 1–3 分钟 |

> 结论：单条 5 秒视频的云端自托管成本通常在 $0.01–0.15 之间，远低于商业 API；真正的成本是**调试时间、模型下载、环境维护和失败重试**。
