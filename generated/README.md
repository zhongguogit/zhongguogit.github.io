# generated/ 目录说明

这里保存实际生成的视频、对应提示词与额度记录。

## 额度硬规则

1. **每天最多 3 次生成**。
2. 生成前必须读取 `quota-log.csv`，确认当天次数 < 3，且剩余 credits 足够。
3. 只使用 Runway 免费额度；不使用付费 API。
4. 只为验证提示词/镜头方向而生成，不为消耗额度而生成。
5. 生成后立即记录，不允许事后补记。

## 文件命名

```
YYYY-MM-DD_<provider>_<model>_<slug>_vN.mp4
YYYY-MM-DD_<provider>_<model>_<slug>_vN.json
```

示例：

```
2026-11-17_runway_gen45_cat-alley_v1.mp4
2026-11-17_runway_gen45_cat-alley_v1.json
```

## 元数据格式（同名 .json）

```json
{
  "date": "2026-11-17",
  "provider": "runway",
  "model": "gen-4.5",
  "prompt": "一只橘猫蹲在雨后的青石巷口，缓慢抬头望向屋檐滴水……",
  "negative_prompt": "subtitles, watermark, distorted hands",
  "duration_s": 5,
  "resolution": "720p",
  "aspect_ratio": "16:9",
  "seed": null,
  "credits_used": 60,
  "cost_usd": 0,
  "prompt_file": "2026-11-17_runway_gen45_cat-alley_v1.txt",
  "score": null,
  "notes": "验证低角度推镜效果"
}
```

## 当前状态

- Runway 账号：未登录 / 无凭据
- 已用次数：0
- 剩余 credits：约 125（未验证）
- 今日是否生成：否（优先研究与搭建，且无凭据）
