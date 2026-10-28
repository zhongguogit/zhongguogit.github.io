# 文生视频（Text-to-Video）研究知识库

> 维护：zhongguogit · 最近更新：2026-10-28
> 目标：在免费/低成本额度内，搭建一个可用的文生视频工作流与演示项目。

## 0. 一页结论（2026-10-28）

| 需求 | 首选 | 次选 | 备注 |
| --- | --- | --- | --- |
| 只想免费体验、不折腾 | 即梦 / 可灵 / 海螺 / 清影 | Google Veo（AI Studio） | 国内平台手机号直连，额度每天清零 |
| 给网站/产品做 API 接入 | 阿里云百炼 Wan 3.0 | fal.ai（Kling / Seedance） | Wan 3.0 按秒计费，失败不计费 |
| 本地开源、可商用、低门槛 | Wan2.2-TI2V-5B（24GB 显存） | HunyuanVideo 1.5（14GB 起） | Wan 是 Apache 2.0，商用最省心 |
| 本地高质量 + 原生音频 | LTX-2.5 | HunyuanVideo 1.5 + 配音 | LTX 社区许可，需核对条款 |
| 研究/复现训练 | Open-Sora 2.0 | CogVideoX 1.5 / Mochi 1 | 都需要多卡或量化，不适合轻量部署 |
| 图生视频/风格动画 | AnimateDiff（SD 生态） | Stable Video Diffusion | 2023 年技术，适合轻量实验，不适合追新画质 |
| 每天最多 3 次的验证 | Runway 免费 125 credits | — | Gen-4.5 约 12 credits/秒，5 秒 = 60 credits |

**关键变化**

1. **Sora 已停服**：Sora 网页/App 于 2026-04-26 停止，API 于 2026-09-24 停止。新项目不要再依赖 Sora。
2. **开源权重止于 Wan2.2**：Wan2.5 / 2.6 / 2.7 / 3.0 均为 API 服务；开源侧 Wan2.2 仍是主力。
3. **LTX-2 全量开源**：2026-01-05 发布开放权重；2026-08-11 起更新为 LTX-2.5（22B 蒸馏版），支持音视频同步、最高 4K/50fps。
4. **HunyuanVideo 1.5 走轻量路线**：8.3B 参数，最低 14GB 显存（开启 offload），适合消费级显卡。
5. **Runway 免费额度是“一次性”的**：125 credits 不会每月刷新；Gen-4.5 60 credits/5 秒，理论上只够 2 条 5 秒视频。

## 1. 三条落地路线

### A. 免费网页路线（0 成本，最快出片）
适合验证创意、做 demo 素材。缺点是排队、水印/商用限制、额度政策随时变化。
→ 平台清单见 [models.md](./models.md#三免费网页平台)

### B. 云 API 路线（按秒计费，适合产品）
适合接入网站/小程序/自动化工作流。需要 API Key、对象存储和任务轮询。
→ 价格与 API 形态见 [models.md](./models.md#二云-apimaaS-平台)

### C. 本地开源路线（可控、可商用，吃硬件）
适合长期使用、批量生成、二次开发。核心成本是 GPU 和工程时间。
→ 硬件门槛与命令见 [models.md](./models.md#一开源模型本地部署) 与 [prompt-guide.md](./prompt-guide.md#六本地部署速查)

## 2. 推荐工作流（本项目采用）

```text
创意一句话
  → 提示词构建器（主体/动作/场景/镜头/光线/风格）
  → 模型选型（免费 / API / 本地）
  → 额度与成本检查（Runway 每日 ≤3 次且 credits 足够）
  → 到对应平台生成
  → 视频 + 提示词归档到 generated/YYYY-MM-DD/
  → 记录到当日进度日志
```

配套工具：[`/video-studio/`](../../video-studio/index.html)（提示词构建 + 选型 + 额度账本）

## 3. 文件索引

| 文件 | 内容 |
| --- | --- |
| [index.html](./index.html) | 知识库落地页：三条路线对比、本地部署命令、笔记索引 |
| [models.md](./models.md) | 开源模型 / 云 API / 免费平台的结构化对比、价格、优缺点、适用场景 |
| [prompt-guide.md](./prompt-guide.md) | 提示词公式、镜头/光线词表、负面提示词、质检清单、本地部署命令 |
| [2026-10-28.md](./2026-10-28.md) | 当日研究结论、额度检查、验证结果、进度与下一步 |

## 4. 数据口径与免责声明

- 价格与额度均为 **2026-10-28 公开页面** 的参考值，平台可能随时调整，以官网为准。
- 美元/人民币按 1 USD ≈ 7.2 CNY 估算，仅用于比较量级。
- “免费额度”不等于“无限商用”；商用前务必阅读模型/平台许可。
- 本项目不保存任何平台账号密码或 API Key；静态页面只在浏览器本地记录额度使用情况。

## 5. 主要来源

- Wan2.2 GitHub：<https://github.com/Wan-Video/Wan2.2>
- HunyuanVideo 1.5 GitHub：<https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5>
- LTX-2 GitHub / 开源公告：<https://github.com/Lightricks/LTX-2> · <https://ltx.io/model/model-blog/ltx-2-is-now-open-source>
- Open-Sora GitHub：<https://github.com/hpcaitech/Open-Sora>
- Mochi 1：<https://github.com/genmoai/mochi>
- CogVideoX：<https://github.com/THUDM/CogVideo>
- AnimateDiff：<https://github.com/guoyww/AnimateDiff>
- Stable Video Diffusion：<https://github.com/Stability-AI/generative-models>
- Runway 定价：<https://runway.com/pricing>
- 阿里云百炼 Wan3.0：<https://www.aliyun.com/product/news/30378>
- fal.ai 定价：<https://fal.ai/pricing>
- Sora 停服说明：<https://openai.com/sora/#pricing>
