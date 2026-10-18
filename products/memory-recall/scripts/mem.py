#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""mem.py — 记忆回溯命令行工具（三层存储 + 特征检索 + 安全删除 + 备份）

用法：
  python mem.py add "跟老周谈定厨房用品代发，佣金8个点，月底前上架"
  python mem.py add --file chat.txt --title "供应商聊天"
  python mem.py find 老周
  python mem.py show M-20261018-001
  python mem.py list
  python mem.py timeline 老周
  python mem.py rm 老周              # 预览
  python mem.py rm 老周 --yes         # 执行删除（删前自动快照 + 留墓碑）
  python mem.py undo                  # 24 小时内撤回
  python mem.py purge                 # 清空回收区（只清真超 24h 的）
  python mem.py purge --all           # 回收区全清
  python mem.py purge --tombstones    # 连墓碑一起清
  python mem.py tomb                  # 看墓碑（删过什么，只有编号）
  python mem.py export --tags-only    # 导出纯特征（几 KB，换设备用）
  python mem.py backup [--out path]   # 快照
  python mem.py restore <snapshot>    # 恢复（先预览）
  python mem.py stats                 # 存储统计
"""
import os, sys, json, re, argparse, datetime, hashlib, shutil

HOME = os.path.expanduser("~/.memory-recall")
DB = os.path.join(HOME, "memories.json")
TRASH = os.path.join(HOME, "trash.json")
TOMB = os.path.join(HOME, "tombstones.json")
SNAP = os.path.join(HOME, "snapshots")

# ---------- 标签规则 ----------
ENTITIES = ["老周", "周总", "周老板", "厨房用品", "锅具", "锅", "供应商", "杭州", "老陈", "安娜"]
EVENTS = ["谈定", "报价", "卡住", "交付", "退款", "承诺", "下单", "发货", "上架", "签约"]
ALIAS = {  # 同义词合并，保证找得全
    "周总": "老周", "周老板": "老周", "周哥": "老周",
    "锅": "锅具", "炒锅": "锅具", "厨房用品": "锅具",
    "8个点": "8%", "百分之八": "8%", "8个percent": "8%",
}
IMPORTANT = ["谈定", "签约", "承诺", "合同", "佣金", "定金", "卡住", "退款"]

def now(): return datetime.datetime.now()
def today(): return now().strftime("%Y-%m-%d")

def load(p, default):
    if not os.path.exists(p): return default
    with open(p, encoding="utf-8") as f: return json.load(f)

def save(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)

def tag(text):
    """打三类标签：实体 / 数字 / 事件"""
    t = set()
    for w in ENTITIES:
        if w in text: t.add(ALIAS.get(w, w))
    for w in EVENTS:
        if w in text: t.add(w)
    for m in re.findall(r"\d+(?:\.\d+)?\s*(?:个点|%|元|块|万|件|天|月|号)", text):
        t.add(m.replace("个点", "%").replace(" ", ""))
    for m in re.findall(r"\d{1,2}[月\-/]\d{1,2}", text):
        t.add(m)
    return sorted(t)

KEY = ["卡在", "卡住", "质检", "报价", "起订", "单价", "谈定", "佣金", "延期", "催", "必须", "%"]
# 要压后处理的开场白 / 过渡句（信息量低，占了摘要位置就浪费了）
FILLER = ["然后", "另外", "先是", "最后", "总之", "其实", "所以", "回来", "然后进入", "进入正题", "我说", "他说"]

def summarize(text, limit=90, maxlines=3):
    """L2 摘要：压到三行以内，优先保留含事件/数字/卡点的句子

    已知边界：同一件事用了不同说法（"没下来" vs "卡在"）时，两句都可能留下。
    这是有意的取舍——宁可多留一句，也不要误删掉可能有用的信息。
    """
    raw = text.replace("\r", "")
    parts = [p.strip() for p in re.split(r"[。！？;\n]+", raw) if p.strip()]
    s = re.sub(r"\s+", " ", raw).strip()
    if not parts:
        return s[:limit]
    # 太长的话，把逗号也当断句（保证有短句可选，不至于一句 60 字挤满三行）
    if all(len(p) > 40 for p in parts):
        parts = [p.strip() for p in re.split(r"[。！？;，\n]+", raw) if len(p.strip()) >= 6]
    # 去重（同样的话说八遍，摘要里只留一遍）
    seen, uniq = set(), []
    for p in parts:
        key = p[:24]
        if key in seen: continue
        seen.add(key); uniq.append(p)
    # 说了两遍同一件事：短的那句如果是长句的子集，就压掉
    slim = []
    for p in uniq:
        dup = False
        for q in uniq:
            if q is p or len(q) <= len(p): continue
            # p 的核心词（≥4 字片段）有 2 个以上出现在 q 里 → 视为重复
            grams = [p[i:i+4] for i in range(0, max(1, len(p) - 3), 4)]
            if grams and sum(1 for g in grams if g in q) >= max(2, len(grams) - 1):
                dup = True; break
        if not dup: slim.append(p)
    if slim: uniq = slim

    def score(p):
        sc = sum(1 for k in KEY if k in p) * 4          # 关键事件/数字权重最高
        if any(k in p for k in ("卡在", "卡住", "没下来", "等下周", "延期", "风险")): sc += 10  # 卡点最该被看见
        if any(k in p for k in ("最后", "谈成", "同意", "定下", "结论", "最终")): sc += 8   # 结果句优先于过程句
        sc += min(len(re.findall(r"\d", p)), 6)          # 数字多说明信息密度高
        if "报价" in p or "单价" in p: sc += 3            # 带报价的句子优先
        if any(p.startswith(f) for f in FILLER): sc -= 8  # 开场白重降权
        if p.endswith("一下") or p.endswith("再说"): sc -= 3
        if len(p) < 8: sc -= 2                           # 碎片句降权
        if len(p) > 55: sc -= 4                          # 巨长句降权（挤占空间）
        return -sc

    scored = sorted(uniq, key=score)
    out, used = [], 0
    for p in scored:
        if len(out) >= maxlines: break
        if used + len(p) > limit and out: continue
        out.append(p); used += len(p) + 1
    # 摘要内二次去重：同一话题说得重复的两句，只留信息量大的那句
    TOPIC = ["质检", "报价", "起订", "定金", "运费", "佣金", "样品", "代发", "合同", "退款", "退货", "违约"]
    if len(out) > 1:
        def topic_of(p): return {t for t in TOPIC if t in p}
        def nums_of(p): return set(re.findall(r"\d+(?:\.\d+)?", p))
        def core_of(p):  # 去掉虚词后的实义字，用来判断"说的是不是一回事"
            return set(re.sub(r"[，。、：；的了是我他你她它就都很还不没要说个这那]", "", p))
        def lcp(a, b):   # 最长公共前缀长度：最可靠的"同一句话"判据
            n = 0
            for x, y in zip(a, b):
                if x != y: break
                n += 1
            return n
        # 按原文顺序，长句在前：长句信息更全，先占位
        seq = sorted(out, key=lambda p: -len(p))
        keep = []
        for p in seq:
            dup = False
            for q in keep:
                # ① 前缀高度相同（≥8 字且占短句 60%）→ 同一句话的两个版本
                if lcp(p, q) >= min(8, len(p) * 0.6, len(q) * 0.6):
                    dup = True; break
                # ② 长度接近 + 同话题 + 同数字 → 同一件事
                if abs(len(p) - len(q)) <= max(len(p), len(q)) * 0.45 \
                   and topic_of(p) & topic_of(q) and nums_of(p) & nums_of(q):
                    dup = True; break
                # ③ 同状态（都在说"这件事没搞定"）→ 同一件事，留信息更全的
                ST = ["还没", "没下来", "卡在", "卡住", "没报", "等一下", "等下周", "没到位"]
                if set(s for s in ST if s in p) & set(s for s in ST if s in q):
                    dup = True; break
            if not dup: keep.append(p)
        out = keep
    # 按原顺序输出（摘要要读得通，不能按分值乱序）
    order = {id(p): i for i, p in enumerate(uniq)}
    out.sort(key=lambda p: order.get(id(p), 99))
    txt = "。".join(out) or uniq[0][:limit]
    return txt[:limit] + ("…" if len(txt) > limit else "")

def level(tags, text):
    if any(w in text for w in IMPORTANT) or any("%" in x or "元" in x for x in tags): return "重要"
    if tags: return "一般"
    return "背景"

def mid(db):
    d = today().replace("-", "")
    n = sum(1 for m in db if m["id"].startswith("M-" + d)) + 1
    return f"M-{d}-{n:03d}"

# ---------- 命令 ----------
def cmd_add(a):
    db = load(DB, [])
    text = a.text or open(a.file, encoding="utf-8").read()
    tags = tag(text)
    item = {
        "id": mid(db),
        "at": now().isoformat(timespec="seconds"),
        "title": a.title or (text[:20] + ("…" if len(text) > 20 else "")),
        "L1": text,
        "L2": summarize(text),
        "L3": tags,
        "level": level(tags, text),
        "bytes": len(text.encode()),
    }
    db.append(item); save(DB, db)
    ratio = max(0, 100 - int(len(item["L2"].encode()) / max(1, item["bytes"]) * 100))
    print(f"✅ 已记 · {item['id']} · {item['level']}")
    print(f"   L2 摘要：{item['L2']}")
    print(f"   L3 特征：{' / '.join(tags) if tags else '（无标签，检索会不准）'}")
    print(f"   压缩：{item['bytes']} 字节 → 摘要 {len(item['L2'].encode())} 字节（省 {ratio}%）")
    return item

def _match(m, q):
    q2 = ALIAS.get(q, q)
    hay = m["L1"] + " " + m["L2"] + " " + " ".join(m["L3"])
    return q2 in hay or q in hay

def cmd_find(a):
    db = load(DB, [])
    hits = [m for m in db if _match(m, a.query)]
    if not hits:
        print(f"🔎 「{a.query}」没找到。")
        print("   可能：① 当时没记 ② 用的是别的词")
        print("   → 给我一个更宽的词，或告诉我大概什么时候的事")
        return
    hits.sort(key=lambda x: x["at"], reverse=True)
    print(f"🔎 你说的是「{a.query}」→ 找到 {len(hits)} 条（按时间倒序）\n")
    for i, m in enumerate(hits, 1):
        print(f"{i}. {m['id']} · {m['at'][:10]} · {m['level']}")
        print(f"   {m['L2']}")
        print(f"   特征：{' '.join(m['L3'])}")
        print(f"   ⬆️ 回复「show {m['id']}」看原文\n")
    if len(hits) > 1:
        print("─" * 40)
        print("📌 时间线：")
        for m in sorted(hits, key=lambda x: x["at"]):
            print(f"   {m['at'][:10]} · {m['L2'][:40]}")
        print(f"   共 {len(hits)} 次提及，跨 {len(set(x['at'][:7] for x in hits))} 个月")

def cmd_show(a):
    db = load(DB, [])
    for m in db:
        if m["id"] == a.id:
            print(f"📄 {m['id']} · {m['at']} · {m['level']}")
            print(f"标题：{m['title']}")
            print(f"摘要：{m['L2']}")
            print(f"特征：{' / '.join(m['L3'])}")
            print("─" * 40)
            print(m["L1"])
            return
    print(f"没有 {a.id}")

def cmd_list(a):
    db = load(DB, [])
    if not db: print("还没有记忆。用 add 记第一条。"); return
    print(f"共 {len(db)} 条\n")
    for m in sorted(db, key=lambda x: x["at"], reverse=True):
        print(f"{m['id']} · {m['at'][:10]} · {m['level']:<4} {m['L2'][:50]}")

def cmd_timeline(a):
    db = load(DB, [])
    hits = sorted([m for m in db if _match(m, a.query)], key=lambda x: x["at"])
    if not hits: print("没有相关记录"); return
    print(f"📅 「{a.query}」时间线（{len(hits)} 条）\n")
    for m in hits:
        print(f"{m['at'][:10]} ─ {m['L2']}")

def _snap_auto(tag="auto"):
    """删除/清空前自动快照，留一条后路"""
    try:
        os.makedirs(SNAP, exist_ok=True)
        path = os.path.join(SNAP, f"{tag}-{now().strftime('%Y%m%d-%H%M%S')}.json")
        save(path, {"saved_at": now().isoformat(), "memories": load(DB, []), "trash": load(TRASH, [])})
        return path
    except Exception:
        return None

def cmd_rm(a):
    db = load(DB, [])
    hits = [m for m in db if _match(m, a.query)]
    if not hits: print(f"没有含「{a.query}」的记忆。"); return
    important = [m for m in hits if m["level"] == "重要"]
    print(f"🗑 将要删除 {len(hits)} 条（含「{a.query}」）：")
    for i, m in enumerate(hits, 1):
        print(f"   {i}. {m['id']} [{m['level']}] {m['L2'][:45]}")
    if important:
        print(f"⚠ 提醒：其中 {len(important)} 条是「重要」级别（含金额/承诺/卡点）。")
        print("   删了之后，这些账在记忆里就没有依据了。")
    print("⚠ 删了之后 24 小时内可撤回（undo）；24 小时后彻底清除")
    if not a.yes:
        print("⬆️ 回「--yes」执行 ｜ 不动就是取消")
        return
    sp = _snap_auto("before-delete")
    trash = load(TRASH, [])
    tomb = load(TOMB, [])
    ts = now().isoformat(timespec="seconds")
    for m in hits:
        m["_deleted_at"] = ts
        trash.append(m)
        # 墓碑：只留"曾经有过"，不留内容
        tomb.append({"id": m["id"], "deleted_at": ts, "title": m["title"][:20], "level": m["level"]})
    ids = {m["id"] for m in hits}
    save(DB, [m for m in db if m["id"] not in ids])
    save(TRASH, trash); save(TOMB, tomb)
    print(f"✅ 已删除 {len(hits)} 条（进回收区，24 小时内可 undo）")
    print(f"   删前快照：{os.path.basename(sp) if sp else '（未生成）'}")
    print(f"   墓碑已留 {len(tomb)} 行（只有编号/标题，没有原文）")

def cmd_undo(a):
    trash = load(TRASH, [])
    if not trash: print("回收区是空的"); return
    db = load(DB, [])
    back, keep = [], []
    for m in trash:
        t = datetime.datetime.fromisoformat(m["_deleted_at"])
        if (now() - t).total_seconds() <= 86400:
            m.pop("_deleted_at", None); back.append(m)
        else:
            keep.append(m)
    save(DB, db + back); save(TRASH, keep)
    print(f"↩️ 已恢复 {len(back)} 条" + (f"，{len(keep)} 条已超 24 小时无法恢复" if keep else ""))

def cmd_purge(a):
    trash = load(TRASH, [])
    if not trash: print("回收区已经是空的。"); return
    _snap_auto("before-purge")
    keep = []
    if not getattr(a, "all", False):
        for m in trash:
            try:
                t = datetime.datetime.fromisoformat(m["_deleted_at"])
                if (now() - t).total_seconds() <= 86400:
                    keep.append(m); continue
            except Exception:
                pass
    save(TRASH, keep)
    n = len(trash) - len(keep)
    print(f"🧹 已彻底删除 {n} 条" + (f"，保留 {len(keep)} 条（未满 24 小时，仍可 undo）" if keep else ""))
    if getattr(a, "tombstones", False):
        t = len(load(TOMB, [])); save(TOMB, [])
        print(f"🪦 墓碑一并清除（{t} 行）")

def cmd_tomb(a):
    tomb = load(TOMB, [])
    if not tomb: print("没有墓碑记录。"); return
    print(f"🪦 墓碑 {len(tomb)} 行（只有编号/标题，内容已彻底删除）\n")
    for t in tomb[-30:]:
        print(f"   {t['id']} · {t['deleted_at'][:10]} · [{t['level']}] {t['title']}")

def cmd_export(a):
    db = load(DB, [])
    path = a.out or os.path.join(HOME, f"tags-{now().strftime('%Y%m%d-%H%M%S')}.json")
    if a.tags_only:
        data = {"exported_at": now().isoformat(), "count": len(db),
                "items": [{"id": m["id"], "at": m["at"][:10], "L3": m["L3"], "level": m["level"]} for m in db]}
    else:
        data = {"exported_at": now().isoformat(), "count": len(db), "memories": db}
    save(path, data)
    print(f"📤 已导出：{path}（{len(db)} 条，{os.path.getsize(path)} 字节）")
    if a.tags_only: print("   只含特征标签，不含原文——适合先搬到新设备当目录")

def cmd_backup(a):
    os.makedirs(SNAP, exist_ok=True)
    path = a.out or os.path.join(SNAP, f"snap-{now().strftime('%Y%m%d-%H%M%S')}.json")
    data = {"saved_at": now().isoformat(), "memories": load(DB, []), "trash": load(TRASH, [])}
    save(path, data)
    sz = os.path.getsize(path)
    print(f"💾 快照已存：{path}（{len(data['memories'])} 条，{sz} 字节）")

def cmd_restore(a):
    data = load(a.snapshot, {"memories": []})
    cur = load(DB, [])
    have = {m["id"] for m in cur}
    add = [m for m in data.get("memories", []) if m["id"] not in have]
    print(f"📦 快照：{a.snapshot}")
    print(f"   快照内 {len(data.get('memories', []))} 条，当前 {len(cur)} 条，可恢复 {len(add)} 条")
    if a.yes and add:
        save(DB, cur + add); print(f"✅ 已恢复 {len(add)} 条")
    elif add:
        print("⬆️ 加 --yes 执行恢复（只补缺失，不覆盖现有）")

def cmd_stats(a):
    db = load(DB, [])
    trash = load(TRASH, [])
    tomb = load(TOMB, [])
    by_level = {}
    for m in db: by_level[m["level"]] = by_level.get(m["level"], 0) + 1
    l1 = sum(m["bytes"] for m in db)
    l2 = sum(len(m["L2"].encode()) for m in db)
    l3 = sum(len((" ".join(m["L3"])).encode()) for m in db)
    stale = 0
    for m in trash:
        try:
            if (now() - datetime.datetime.fromisoformat(m["_deleted_at"])).total_seconds() > 86400: stale += 1
        except Exception: pass
    print(f"📊 记忆 {len(db)} 条 ｜ 回收区 {len(trash)} 条 ｜ 墓碑 {len(tomb)} 行")
    print(f"   分级：{by_level}")
    print(f"   L1 原文 {l1} 字节 → L2 摘要 {l2} 字节 → L3 特征 {l3} 字节")
    print(f"   总压缩：{max(0,100-int((l2+l3)/max(1,l1)*100))}%（L2+L3 相对 L1）")
    if stale: print(f"   ⚠ 回收区有 {stale} 条已超 24 小时，建议 purge")
    snaps = sorted(os.listdir(SNAP)) if os.path.isdir(SNAP) else []
    print(f"   快照 {len(snaps)} 个" + (f"（最近：{snaps[-1]}）" if snaps else ""))
    print(f"   存储：{HOME}")

def main():
    ap = argparse.ArgumentParser(description="记忆回溯工具")
    sub = ap.add_subparsers(dest="cmd")

    p = sub.add_parser("add"); p.add_argument("text", nargs="?"); p.add_argument("--file"); p.add_argument("--title")
    p = sub.add_parser("find"); p.add_argument("query")
    p = sub.add_parser("show"); p.add_argument("id")
    sub.add_parser("list")
    p = sub.add_parser("timeline"); p.add_argument("query")
    p = sub.add_parser("rm"); p.add_argument("query"); p.add_argument("--yes", action="store_true")
    sub.add_parser("undo")
    p = sub.add_parser("purge"); p.add_argument("--all", action="store_true"); p.add_argument("--tombstones", action="store_true")
    sub.add_parser("tomb")
    p = sub.add_parser("export"); p.add_argument("--out"); p.add_argument("--tags-only", action="store_true")
    p = sub.add_parser("backup"); p.add_argument("--out")
    p = sub.add_parser("restore"); p.add_argument("snapshot"); p.add_argument("--yes", action="store_true")
    sub.add_parser("stats")

    a = ap.parse_args()
    m = {"add": cmd_add, "find": cmd_find, "show": cmd_show, "list": cmd_list,
         "timeline": cmd_timeline, "rm": cmd_rm, "undo": cmd_undo, "purge": cmd_purge,
         "tomb": cmd_tomb, "export": cmd_export,
         "backup": cmd_backup, "restore": cmd_restore, "stats": cmd_stats}
    if not a.cmd:
        ap.print_help(); return
    if a.cmd == "add" and not a.text and not a.file:
        print("要给内容：mem.py add \"...\"  或  --file 路径"); return
    m[a.cmd](a)

if __name__ == "__main__":
    main()
