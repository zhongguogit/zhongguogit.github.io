#!/usr/bin/env python3
"""t2v.py — 本地文生视频工作流助手（不调用任何付费 API）。

子命令:
  prompt     按七段式结构生成提示词
  cost       估算生成成本
  recommend  根据硬件/需求推荐模型
  quota      查看并校验 Runway 免费额度使用情况

用法示例:
  python3 tools/t2v.py prompt --subject "橘猫蹲在雨后巷口" --action "抬头看屋檐" \
      --camera "推近" --shot "低角度近景" --light "黄昏侧逆光" --style "写实电影" --model wan
  python3 tools/t2v.py cost --model wan-3 --resolution 720 --duration 5 --count 3
  python3 tools/t2v.py recommend --vram 16 --duration 10 --audio no
  python3 tools/t2v.py quota
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "models.json"


def _find_quota_file() -> Path:
    for base in [ROOT, *ROOT.parents]:
        candidate = base / "generated" / "quota-log.csv"
        if candidate.exists():
            return candidate
    return ROOT / "generated" / "quota-log.csv"


QUOTA_FILE = _find_quota_file()

DAILY_LIMIT = 3
INITIAL_CREDITS = 125

CAMERA_EN = {
    "固定": "static locked-off shot",
    "推近": "slow push-in / dolly in",
    "拉远": "pull-back / dolly out",
    "左摇": "pan left",
    "右摇": "pan right",
    "上仰": "tilt up",
    "下俯": "tilt down",
    "跟拍": "tracking shot",
    "环绕": "orbit / arc shot",
    "升降": "crane up",
    "手持": "handheld",
    "航拍": "drone aerial",
    "变焦": "zoom in",
    "希区柯克变焦": "dolly zoom",
}

SHOT_EN = {
    "大远景": "extreme wide shot",
    "远景": "wide shot",
    "全景": "full shot",
    "中景": "medium shot",
    "近景": "close-up",
    "特写": "extreme close-up",
    "过肩": "over-the-shoulder shot",
    "低角度": "low angle",
    "高角度": "high angle",
    "俯视": "top-down view",
}

LIGHT_EN = {
    "黄金时刻": "golden hour, warm sunlight",
    "蓝调时刻": "blue hour, cool ambient light",
    "侧逆光": "side backlight, rim light",
    "柔光": "soft diffused light",
    "硬光": "hard light, high contrast",
    "霓虹": "neon glow, cyberpunk lighting",
    "烛光": "candlelight, warm flicker",
    "阴天": "overcast, flat daylight",
}

MODEL_HINTS = {
    "wan": "自然运动，主体结构稳定，无字幕，无水印",
    "hunyuan": "镜头运动平滑，10 秒内节奏完整，无字幕",
    "ltx": "Audio: ambient room tone, subtle foley; 音画同步",
    "mochi": "真实物理运动，自然布料与流体，无明显形变",
    "cogvideo": "属性绑定准确，多主体位置清晰，无字幕",
    "runway": "cinematic, clean frame, no subtitles, no watermark",
    "veo": "Audio: natural ambience and subtle foley; no music",
    "kling": "面部稳定，手部自然，口型准确，无变形",
    "seedance": "角色一致性，参考素材风格统一，无字幕",
    "generic": "cinematic, stable motion, no subtitles, no watermark",
}

DEFAULT_NEGATIVE = (
    "subtitles, watermark, logo, text, distorted hands, extra fingers, "
    "warped face, flickering, morphing, low resolution, blurry, overexposed"
)


def load_data() -> dict:
    if not DATA_FILE.exists():
        sys.exit(f"找不到数据文件: {DATA_FILE}")
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def translate(value: str, mapping: dict[str, str], lang: str) -> str:
    if not value:
        return ""
    if lang == "en":
        return mapping.get(value, value)
    return value


def build_prompt(args: argparse.Namespace) -> str:
    lang = args.lang
    camera = translate(args.camera, CAMERA_EN, lang)
    shot = translate(args.shot, SHOT_EN, lang)
    light = translate(args.light, LIGHT_EN, lang)

    if lang == "en":
        parts = [
            args.subject,
            args.action,
            f"camera: {camera}" if camera else "",
            shot,
            f"lighting: {light}" if light else "",
            args.style,
            f"{args.duration} seconds, {args.aspect}, 24fps, stable motion",
            MODEL_HINTS.get(args.model, MODEL_HINTS["generic"]),
        ]
    else:
        parts = [
            args.subject,
            args.action,
            f"镜头{camera}" if camera else "",
            shot,
            f"{light}光线" if light else "",
            args.style,
            f"{args.duration} 秒，{args.aspect}，24fps，画面稳定",
            MODEL_HINTS.get(args.model, MODEL_HINTS["generic"]),
        ]
    return "；".join(p.strip("；。 ") for p in parts if p and p.strip())


def cmd_prompt(args: argparse.Namespace) -> None:
    prompt = build_prompt(args)
    negative = args.negative or DEFAULT_NEGATIVE
    print("提示词:\n" + prompt)
    print("\n负面提示词:\n" + negative)

    compact = len(prompt.replace(" ", ""))
    if compact < 40:
        print("\n[建议] 描述偏短，补充主体细节、动作节奏或环境。")
    elif compact > 220:
        print("\n[建议] 描述偏长，删掉重复形容词，保留一个主镜头运动。")

    if not args.camera:
        print("[建议] 未指定镜头运动，模型可能给出随机运镜。")


def cmd_cost(args: argparse.Namespace) -> None:
    data = load_data()
    item = next((p for p in data["pricing"] if p["id"] == args.model), None)
    if not item:
        ids = ", ".join(p["id"] for p in data["pricing"])
        sys.exit(f"未知定价模型: {args.model}\n可选: {ids}")
    rates = item["rates"]
    key = str(args.resolution)
    if key not in rates:
        sys.exit(f"{item['name']} 不支持 {key}p，可选: {', '.join(rates)}")

    per_second = rates[key]
    total = per_second * args.duration * args.count
    cny = total * args.fx
    print(f"模型: {item['name']} ({item['provider']})")
    print(f"规格: {key}p, {args.duration}s × {args.count} 条")
    print(f"单价: ${per_second:.3f}/s")
    print(f"合计: ${total:.2f}  (约 ¥{cny:.2f}，汇率 {args.fx})")
    print(f"说明: {item['note']}")

    if item.get("creditsPerSecond"):
        per_clip = item["creditsPerSecond"] * args.duration
        credits = per_clip * args.count
        print(f"Runway credits: {credits:.0f}（每条 {per_clip:.0f}）")
        print(f"免费额度 125 credits 可生成: {125 // per_clip if per_clip else 0} 条")
    if item.get("disabled"):
        print("[警告] 该 API 已停止服务，仅用于历史成本对比。")


def cmd_recommend(args: argparse.Namespace) -> None:
    data = load_data()
    audio_wanted = args.audio == "yes"
    candidates = []
    for m in data["models"]:
        if args.open_only and m["kind"] != "open":
            continue
        if m["kind"] == "commercial" and args.open_only:
            continue
        if audio_wanted and not m["audio"]:
            continue
        if m["maxDuration"] < args.duration:
            continue
        score = 0
        if m["kind"] == "open":
            score += 2
        if m["audio"] == audio_wanted:
            score += 2
        if args.vram and m["kind"] == "open":
            match = re.search(r"\d+", m["vram"])
            needs = int(match.group()) if match else None
            if needs and needs > args.vram:
                continue
        score += min(m["maxDuration"], 30) / 30
        candidates.append((score, m))

    candidates.sort(key=lambda x: (-x[0], -(x[1].get("stars") or 0)))
    if not candidates:
        print("没有满足条件的模型，尝试放宽时长或音频要求。")
        return

    print(f"需求: 显存 {args.vram or '不限'}GB / 时长 {args.duration}s / 音频 {'需要' if audio_wanted else '不需要'}\n")
    for _, m in candidates[:5]:
        print(f"- {m['name']} ({m['org']}) [{m['kind']}]")
        print(f"  许可: {m['license']} | 显存: {m['vram']} | 时长: {m['maxDuration']}s | 分辨率: {m['maxRes']}")
        print(f"  价格: {m['priceNote']}")
        print(f"  适合: {m['useCase']}")
        if m.get("github"):
            print(f"  仓库: {m['github']}")
        print()


def cmd_quota(args: argparse.Namespace) -> None:
    today = dt.date.today().isoformat()
    if not QUOTA_FILE.exists():
        sys.exit(f"找不到额度日志: {QUOTA_FILE}")

    with QUOTA_FILE.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    today_rows = [r for r in rows if r.get("date") == today]
    used_count = sum(int(r.get("count") or 0) for r in today_rows)
    used_credits = sum(int(r.get("credits") or 0) for r in today_rows)
    remaining = INITIAL_CREDITS - used_credits
    can_generate = used_count < DAILY_LIMIT and remaining >= 60

    print(f"日期: {today}")
    print(f"今日已生成: {used_count} / {DAILY_LIMIT} 次")
    print(f"今日消耗 credits: {used_credits}")
    print(f"剩余 credits: {remaining} / {INITIAL_CREDITS}")
    print(f"是否允许生成: {'是' if can_generate else '否'}")
    if not can_generate:
        print("原因: 达到每日 3 次上限，或剩余 credits 不足一条 5 秒 Gen-4.5（60 credits）。")
    if args.enforce and not can_generate:
        sys.exit(2)


def main() -> None:
    parser = argparse.ArgumentParser(description="文生视频本地工作流助手（不调用付费 API）")
    sub = parser.add_subparsers(dest="command", required=True)

    p_prompt = sub.add_parser("prompt", help="构建七段式提示词")
    p_prompt.add_argument("--subject", required=True)
    p_prompt.add_argument("--action", default="")
    p_prompt.add_argument("--camera", default="", choices=[""] + list(CAMERA_EN))
    p_prompt.add_argument("--shot", default="", choices=[""] + list(SHOT_EN))
    p_prompt.add_argument("--light", default="", choices=[""] + list(LIGHT_EN))
    p_prompt.add_argument("--style", default="写实电影质感")
    p_prompt.add_argument("--duration", type=int, default=5)
    p_prompt.add_argument("--aspect", default="16:9")
    p_prompt.add_argument("--model", default="generic", choices=list(MODEL_HINTS))
    p_prompt.add_argument("--lang", default="zh", choices=["zh", "en"])
    p_prompt.add_argument("--negative", default="")
    p_prompt.set_defaults(func=cmd_prompt)

    p_cost = sub.add_parser("cost", help="估算生成成本")
    p_cost.add_argument("--model", required=True)
    p_cost.add_argument("--resolution", default=720, type=int)
    p_cost.add_argument("--duration", default=5, type=int)
    p_cost.add_argument("--count", default=1, type=int)
    p_cost.add_argument("--fx", default=7.2, type=float, help="USD→CNY 汇率")
    p_cost.set_defaults(func=cmd_cost)

    p_rec = sub.add_parser("recommend", help="推荐模型")
    p_rec.add_argument("--vram", type=int, default=0)
    p_rec.add_argument("--duration", type=int, default=5)
    p_rec.add_argument("--audio", default="no", choices=["yes", "no"])
    p_rec.add_argument("--open-only", action="store_true")
    p_rec.set_defaults(func=cmd_recommend)

    p_quota = sub.add_parser("quota", help="查看额度使用情况")
    p_quota.add_argument("--enforce", action="store_true", help="超限时以非零状态退出")
    p_quota.set_defaults(func=cmd_quota)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
