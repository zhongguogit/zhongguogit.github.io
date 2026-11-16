# 文生视频研究知识库

> 维护者：`zhongguogit.github.io` ｜ 最近更新：2026-11-16
> 目标：为「文生视频生成工具」持续积累可验证的模型、价格、API、提示词与工程实践，并转化为可部署的演示项目。

## 目录

| 文档 | 内容 |
|---|---|
| [01-open-source-models.md](./01-open-source-models.md) | 开源模型横向对比：显存、时长、许可、优劣、适用场景 |
| [02-commercial-platforms.md](./02-commercial-platforms.md) | 商业平台与 API：免费额度、按秒价格、成本示例 |
| [03-prompt-engineering.md](./03-prompt-engineering.md) | 提示词结构、镜头词汇、模型差异化技巧、模板 |
| [04-stack-and-deployment.md](./04-stack-and-deployment.md) | 技术栈选型、ComfyUI/Diffusers、部署与额度治理 |
| [05-sources.md](./05-sources.md) | 全部来源与检索日期 |
| [daily/](./daily/) | 每日研究日志（按日期归档） |

## 快速结论（2026-11-16）

1. **开源第一梯队**：Wan 2.2（生态最全、消费级可跑）、HunyuanVideo 1.5（8.3B 轻量、10 秒 720p）、LTX-2.5（原生音视频 + 4K）。Mochi 1 仍是最佳运动物理基线，CogVideoX 仍是提示词跟随与研究友好度标杆。
2. **商业 API 第一梯队**：Wan 3.0、Seedance 2.5、Veo 3.1、Kling 3.0；Sora 2 API 已于 2026-09 停止，不应作为新项目依赖。
3. **免费额度现实**：Runway 仅 125 一次性 credits（约 10 秒 Gen-4.5、带水印），适合验证而非生产；PixVerse 每日约 30 credits 适合高频试提示词；开源模型自托管才是「无限免费」的唯一路径。
4. **成本差异巨大**：同样 5 秒 720p，Wan 3.0 约 $0.50，Veo 3.1 Fast 约 $0.50，Veo 3.1 标准约 $2.00，Seedance 2.5 第三方 1080p 约 $4.25。先把「生成—筛选—重生成」的试错成本算清楚，再决定模型。
5. **提示词顺序**：主体 → 动作 → 镜头运动 → 景别/镜头 → 光线 → 风格 → 画幅/时长。越靠前的 token 权重越高。

## 如何使用

- **选模型**：先看 [01](./01-open-source-models.md) 的硬件门槛表，再看 [02](./02-commercial-platforms.md) 的成本表。
- **写提示词**：用 [03](./03-prompt-engineering.md) 的七段式结构与镜头词表，或直接使用站点的 Prompt Studio。
- **做工程**：看 [04](./04-stack-and-deployment.md) 的架构与额度治理方案。
- **回溯来源**：每条结论在 [05](./05-sources.md) 有对应链接；价格类信息均标注检索日期。

## 数据可信度约定

- 标记「官方」：来自项目 README、官方定价页或官方文档。
- 标记「第三方」：来自评测文章、聚合平台或社区整理，可能与官方有偏差。
- 价格随时变动；本项目内所有价格仅用于量级估算，下单前必须复核官方页面。
- 未实际调用过的 API 不做效果背书，只记录公开参数与价格。
