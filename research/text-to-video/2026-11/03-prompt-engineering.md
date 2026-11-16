# 文生视频提示词工程指南

> 基于 2026-11 的公开教程与模型文档整理，并经本项目 Prompt Studio 的字段化实践验证

## 一、核心公式

主流模型都按 token 顺序加权，**越靠前越重要**。推荐的七段式：

```
主体（谁/什么） → 动作（在做什么） → 镜头运动（怎么拍） → 景别与机位（拍多近/从哪拍） → 光线（什么光） → 风格（什么质感） → 画幅与时长（交付规格）
```

示例：

```
一只橘猫蹲在雨后的青石巷口，缓慢抬头望向屋檐滴水；
镜头从低角度缓慢推近，浅景深；
16:9 横画幅，35mm 电影镜头；
黄昏侧逆光，湿润地面反射暖色灯光；
写实电影质感，细腻毛发，轻微胶片颗粒；
5 秒，24fps，画面稳定。
```

## 二、镜头运动词表

| 中文 | English | 效果 | 适用 |
|---|---|---|---|
| 固定镜头 | static shot / locked-off shot | 画面稳定，突出主体 | 口播、产品特写 |
| 推镜 | slow push-in / dolly in | 聚焦、制造紧张 | 情绪递进、揭示 |
| 拉镜 | pull-back / dolly out | 交代环境、收尾 | 开场、结尾 |
| 摇镜 | pan left/right | 横向扫视 | 风景、群像 |
| 俯仰 | tilt up/down | 垂直揭示 | 建筑、人物全身 |
| 跟拍 | tracking shot / follow shot | 跟随运动 | 行走、奔跑、纪实 |
| 环绕 | orbit / arc shot | 360° 展示主体 | 产品、人物 |
| 升降 | crane up/down | 大范围垂直运动 | 开场、宏大场面 |
| 手持 | handheld | 真实、紧张 | 纪实、动作 |
| 无人机 | drone aerial / flyover | 大场景 | 城市、自然 |
| 变焦 | zoom in/out | 压缩空间 | 强调细节 |
| 希区柯克变焦 | dolly zoom | 眩晕、心理压迫 | 惊悚、转场 |

> 技巧：一个镜头只写 **一种主运动**。写「推镜 + 环绕 + 手持」会让模型产生抖动或运动冲突。

## 三、景别与机位

| 景别 | English | 用途 |
|---|---|---|
| 大远景 | extreme wide shot | 环境、规模 |
| 远景 | wide shot | 人物与环境关系 |
| 全景 | full shot | 全身动作 |
| 中景 | medium shot | 对话、半身动作 |
| 近景 | close-up | 表情、情绪 |
| 特写 | extreme close-up | 细节、质感 |
| 过肩 | over-the-shoulder | 对话、关系 |
| 低角度 | low angle | 压迫、英雄感 |
| 高角度 | high angle | 弱小、全景 |
| 俯视 | top-down / bird's-eye | 构图、几何 |

## 四、光线与氛围

| 类型 | 关键词 | 情绪 |
|---|---|---|
| 黄金时刻 | golden hour, warm sunlight | 温暖、怀旧 |
| 蓝调时刻 | blue hour, cool ambient | 冷静、孤独 |
| 侧逆光 | side backlight, rim light | 轮廓、电影感 |
| 柔光 | soft diffused light | 温柔、商业 |
| 硬光 | hard light, high contrast | 戏剧、黑色电影 |
| 霓虹 | neon, cyberpunk glow | 赛博、夜生活 |
| 烛光 | candlelight, warm flicker | 私密、古典 |
| 阴天 | overcast, flat light | 纪实、克制 |

## 五、风格词

- 写实电影：`cinematic, photorealistic, 35mm film, shallow depth of field, subtle film grain`
- 广告质感：`commercial product photography, clean background, studio lighting, ultra sharp`
- 动画：`2D animation, anime style, cel shading, Studio Ghibli inspired`（注意：Mochi 等写实模型对动画风格较弱）
- 复古：`VHS, 1980s, analog grain, warm faded colors`
- 纪录片：`documentary style, handheld, natural light, candid`
- 微距：`macro photography, extreme detail, water droplets`

## 六、负面提示词

不同模型支持程度不同。通用负向清单：

```
subtitles, watermark, logo, text, distorted hands, extra fingers,
warped face, flickering, jitter, morphing, low resolution, blurry,
overexposed, oversaturated, duplicate subject, sudden cut
```

- **Runway Gen-4.5**：主要靠正向描述，负向能力弱；把「不要字幕」写成 `no subtitles, clean frame` 放在末尾。
- **Wan / HunyuanVideo / CogVideoX**：支持独立 negative prompt，建议保留通用负面词。
- **Veo 3.1**：对白与音效需单独描述，例如 `Audio: light rain, distant traffic, no music`。
- **Kling / Seedance**：中文负向词可用；人物镜头务必加 `面部稳定，无变形`。

## 七、模型差异化技巧

| 模型 | 提示词偏好 | 建议 |
|---|---|---|
| Wan 2.2 | 中文/英文均可；对镜头语言敏感 | 写清主体动作 + 一个镜头运动；5B 模型避免过度复杂场景 |
| HunyuanVideo 1.5 | 结构化描述；支持相机注释 | 用「镜头：缓慢推近」这类显式段落；10 秒镜头要写节奏变化 |
| LTX-2.5 | 音视频联合；提示词需同时描述声音 | 加 `Audio: ...`；4K 时减少快速运动 |
| Mochi 1 | 写实、自然运动 | 避免动画风格；用物理描述（水花、布料摆动） |
| CogVideoX | 复杂多子句 | 把属性、位置、动作拆成短句，避免代词 |
| Runway Gen-4.5 | 简洁、电影化 | 一句话主体 + 镜头 + 风格；不要堆砌形容词 |
| Veo 3.1 | 叙事与对白 | 写清「谁说、说什么、什么语气」；音频单独一段 |
| Kling 3.0 | 人物表演 | 写清表情、手部动作、口型；中文短句更稳 |
| Seedance 2.5 | 长镜头、多参考 | 明确参考素材的角色（人物/场景/道具），并写一致性要求 |

## 八、六类可复用模板

### 1. 产品广告（5 秒，16:9）

```
[产品] 静置于 [材质台面]，[一束侧光] 扫过表面，细微 [雾气/水珠/粉尘] 飘动；
镜头缓慢环绕 15°，微距特写，浅景深；
高端商业摄影，干净背景，超清细节；
5 秒，24fps，无字幕，无水印。
```

### 2. 人物口播（8 秒，9:16）

```
[年龄/服装] 的 [人物] 坐在 [场景]，直视镜头，自然眨眼与微笑，说一句 [台词]；
固定中近景，50mm 镜头，轻微手持呼吸感；
柔和窗光，肤色自然；
8 秒，竖屏 9:16，口型自然，面部稳定。
```

### 3. 风景航拍（10 秒，16:9）

```
[山脉/海岸/城市] 在 [清晨/黄昏]，云层缓慢流动，光束穿过山谷；
无人机从高空缓慢下降并前推，大远景转全景；
自然光，真实色彩，电影级宽容度；
10 秒，24fps，画面稳定。
```

### 4. 赛博夜街（5 秒，21:9）

```
雨后霓虹街道，[人物] 撑伞走过积水，倒影摇曳，蒸汽从井盖升起；
低角度跟拍，轻微手持；
霓虹青品色光，高对比，胶片颗粒；
5 秒，21:9，写实电影质感。
```

### 5. 美食特写（5 秒，16:9）

```
[食物] 在 [铸铁锅/木桌] 上，热气升腾，酱汁缓慢流动，[筷子/勺子] 伸入画面；
微距推近，浅景深；
暖色侧光，高光柔和；
5 秒，24fps，超清细节，无字幕。
```

### 6. 抽象转场（3 秒，16:9）

```
[墨水滴入水中 / 丝绸飘动 / 金属流体] 缓慢扩散，颜色从 [A] 过渡到 [B]；
固定镜头，微距；
柔和渐变光，深色背景；
3 秒，高帧率，适合作为转场素材。
```

## 九、质量自检清单

- [ ] 主体是否唯一、具体（避免「一个人」这类模糊描述）
- [ ] 动作是否可被拍摄（避免「感到悲伤」这类心理描述）
- [ ] 是否只写了一个主镜头运动
- [ ] 是否有明确景别或机位
- [ ] 是否写了光线方向与色温
- [ ] 是否有风格锚点（胶片、商业、动画等）
- [ ] 是否写了画幅、时长、帧率
- [ ] 是否包含负面提示词
- [ ] 是否控制在 40–120 个词（Runway/Veo 更短，Wan/CogVideo 可稍长）
- [ ] 是否避免了品牌、名人、敏感内容（平台会拦截）

## 十、迭代方法

1. **固定随机种子**（支持时），只改一个变量，判断因果。
2. **首帧优先**：先用图生视频锁定构图，再转文生视频扩写。
3. **两段式**：先用 480p/低价档跑 10 条候选，选出构图最好的 1 条，再用 720p/1080p 重生成。
4. **记录一切**：提示词、模型、分辨率、种子、耗时、成本、评分。本项目把记录写入 `generated/`。
