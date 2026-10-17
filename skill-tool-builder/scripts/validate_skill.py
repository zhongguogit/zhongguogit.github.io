#!/usr/bin/env python3
"""
校验「工具/集成类」Skill 是否可发布。

覆盖两类检查：
  硬 (FAIL) —— 会报错、拒载、或造成安全/不可逆事故
  软 (WARN) —— 官方建议或社区经验，不阻塞但不该无视

用法:
    python3 validate_skill.py <skill目录>
    python3 validate_skill.py <skill目录> --json

退出码: 0 = 无 FAIL；1 = 至少一个 FAIL
"""

import argparse
import json
import re
import sys
from pathlib import Path

ALLOWED_FRONTMATTER_KEYS = {
    "name", "description", "license",
    "allowed-tools", "metadata", "compatibility",
}

# 疑似凭据：前缀型 + 高熵型
SECRET_PATTERNS = [
    (r'ghp_[A-Za-z0-9]{20,}', 'GitHub PAT'),
    (r'github_pat_[A-Za-z0-9_]{20,}', 'GitHub fine-grained PAT'),
    (r'gho_[A-Za-z0-9]{20,}', 'GitHub OAuth token'),
    (r'sk-[A-Za-z0-9]{20,}', 'OpenAI-style key'),
    (r'sk-ant-[A-Za-z0-9\-_]{20,}', 'Anthropic key'),
    (r'xox[baprs]-[A-Za-z0-9-]{10,}', 'Slack token'),
    (r'AKIA[0-9A-Z]{16}', 'AWS access key'),
    (r'glpat-[A-Za-z0-9_\-]{20,}', 'GitLab PAT'),
    (r'AIza[0-9A-Za-z\-_]{35}', 'Google API key'),
]

# 危险诊断命令（本身就是泄露通道）
LEAKY_COMMANDS = [
    (r'\benv\b(?!iron)', 'env'),
    (r'\bprintenv\b', 'printenv'),
    (r'\bset\s+-x\b', 'set -x'),
    (r'curl\s+[^|\n]*\s-v\b', 'curl -v'),
    (r'--show-token', '--show-token'),
    (r'gh\s+auth\s+status', 'gh auth status'),
]

MAX_BODY_LINES = 500
MAX_DESCRIPTION = 1024
SOFT_DESCRIPTION = 300
NAME_MAX = 64

# 出现在同一行的这些词，说明该行是「禁令/反例」而非「实际使用」
# 没有这层判断，「禁止 echo $TOKEN」会被误判成真的在 echo token
NEGATION_HINTS = (
    "禁止", "不要", "不得", "避免", "禁用", "严禁", "不许",
    "❌", "反模式", "反面", "错误写法", "不通过信号",
    "avoid", "never", "do not", "don't", "instead of", "forbidden",
)


def line_at(text, pos):
    start = text.rfind("\n", 0, pos) + 1
    end = text.find("\n", pos)
    if end == -1:
        end = len(text)
    return text[start:end]


def is_prohibition(text, pos):
    """text 中 pos 位置的匹配是「实际指令」还是「被引用的反例」。

    以下三种情况只是提到这个词，不是在用它：
      1. 同一行有禁止/反例类措辞
      2. 该词被引号包裹（「必要时」「适当时」）
      3. 处于正误对照表的「错误侧」（同行有 ✅ / → / 可判定）
    """
    line = line_at(text, pos)
    low = line.lower()

    if any(h in low for h in NEGATION_HINTS):
        return True

    offset = pos - (text.rfind("\n", 0, pos) + 1)
    before = line[:offset]

    # 处于引号内部（左引号未闭合），如「必要时」
    for lq, rq in (("「", "」"), ("“", "”"), ("‘", "’"),
                   ('"', '"'), ("'", "'"), ("`", "`")):
        if before.count(lq) > before.count(rq):
            return True

    # 正误对照表的「错误侧」：表头声明了 ❌/✅ 对比
    if line.lstrip().startswith("|"):
        lines = text.split("\n")
        cur = text[:pos].count("\n")
        header = ""
        i = cur
        while i >= 0 and lines[i].lstrip().startswith("|"):
            header = lines[i]
            i -= 1
        if "❌" in header or "✅" in header:
            return True

    return False


class Report:
    def __init__(self):
        self.rows = []

    def add(self, level, check, detail, fix=""):
        self.rows.append({
            "level": level, "check": check,
            "detail": detail, "fix": fix,
        })

    @property
    def fails(self):
        return [r for r in self.rows if r["level"] == "FAIL"]

    @property
    def warns(self):
        return [r for r in self.rows if r["level"] == "WARN"]


def parse_frontmatter(text):
    m = re.match(r'^---\n(.*?)\n---\s*\n', text, re.DOTALL)
    if not m:
        return None, text, 0
    raw = m.group(1)
    body = text[m.end():]
    offset = text[:m.end()].count("\n")
    data = {}
    order = []
    lines = raw.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        km = re.match(r'^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$', line)
        if not km:
            i += 1
            continue
        key, val = km.group(1), km.group(2).strip()
        # 块标量 | | - |+ > 等：吸收后续所有缩进行
        if re.fullmatch(r'[|>][+-]?', val):
            block = []
            i += 1
            while i < len(lines) and (lines[i].startswith((" ", "\t")) or not lines[i].strip()):
                block.append(lines[i].strip())
                i += 1
            data[key] = "\n".join(x for x in block if x)
            order.append(key)
            continue
        data[key] = val
        order.append(key)
        i += 1
    data["__order__"] = order
    return data, body, offset


def check_all(skill_dir):
    rep = Report()
    # 用 absolute 而非 resolve：后者会穿透软链，把 library 报成它的真实目录名
    skill_dir = Path(skill_dir).absolute()

    if not skill_dir.is_dir():
        rep.add("FAIL", "目录存在", f"不是目录: {skill_dir}")
        return rep

    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        rep.add("FAIL", "SKILL.md 存在", "缺少 SKILL.md")
        return rep
    rep.add("PASS", "SKILL.md 存在", "ok")

    text = skill_md.read_text(encoding="utf-8")
    fm, body, fm_offset = parse_frontmatter(text)

    # ---- frontmatter 格式 ----
    if fm is None:
        rep.add("FAIL", "frontmatter 格式",
                "必须以 --- 开头并闭合",
                fix="文件首行写 ---，YAML 后另起一行写 ---")
        return rep
    rep.add("PASS", "frontmatter 格式", "ok")

    # ---- 顶层键白名单 ----
    keys = [k for k in fm.get("__order__", [])]
    extra = [k for k in keys if k not in ALLOWED_FRONTMATTER_KEYS]
    if extra:
        rep.add("FAIL", "frontmatter 键白名单",
                f"出现不允许的顶层键: {', '.join(extra)}",
                fix=f"把 {', '.join(extra)} 移入 metadata: 子层（如 version/author/created）")
    else:
        rep.add("PASS", "frontmatter 键白名单", "ok")

    # ---- name ----
    name = fm.get("name", "")
    if not name:
        rep.add("FAIL", "name", "缺失")
    else:
        problems = []
        if len(name) > NAME_MAX:
            problems.append(f"长度 {len(name)} > {NAME_MAX}")
        if not re.fullmatch(r'[a-z0-9-]+', name):
            problems.append("含非小写字母/数字/连字符")
        if name.startswith("-") or name.endswith("-"):
            problems.append("以连字符开头或结尾")
        if "--" in name:
            problems.append("含连续 --")
        if name != skill_dir.name:
            problems.append(f"与目录名不一致（目录={skill_dir.name}）")
        if problems:
            rep.add("FAIL", "name", "; ".join(problems),
                    fix=f"改为与目录名一致的合法名: {skill_dir.name}")
        else:
            rep.add("PASS", "name", f"{name} ok")

    # ---- description ----
    desc = fm.get("description", "")
    if not desc:
        rep.add("FAIL", "description", "缺失")
    else:
        problems = []
        if len(desc) > MAX_DESCRIPTION:
            problems.append(f"长度 {len(desc)} > {MAX_DESCRIPTION}")
        if "<" in desc or ">" in desc:
            problems.append("含 < 或 >")
        if problems:
            rep.add("FAIL", "description", "; ".join(problems))
        elif len(desc) > SOFT_DESCRIPTION:
            rep.add("WARN", "description 长度",
                    f"{len(desc)} 字符；建议 ≤{SOFT_DESCRIPTION} 以兼容最严宿主口径")
        else:
            rep.add("PASS", "description", f"{len(desc)} 字符 ok")

        # 三段式
        has_use = bool(re.search(r'use when|when the user|当用户|使用时|时使用', desc, re.I))
        has_not = bool(re.search(r'not for|do not use|不做|不适用于|排除', desc, re.I))
        if not has_use:
            rep.add("WARN", "description 触发条件",
                    "未见 Use when / 当用户 类触发描述",
                    fix="补一段：当用户说「…」「…」时使用")
        if not has_not:
            rep.add("WARN", "description 排他条件",
                    "未见 NOT for / 不做 类排他描述",
                    fix="补一段：不做 <最易被误匹配的近邻任务>")

    # ---- 正文行数 ----
    body_lines = len(body.rstrip("\n").split("\n"))
    if body_lines > MAX_BODY_LINES:
        rep.add("FAIL", "正文行数",
                f"{body_lines} 行 > {MAX_BODY_LINES}",
                fix="把命令速查、错误码表、长样例下沉到 references/，正文只留每次触发都要用的部分")
    else:
        rep.add("PASS", "正文行数", f"{body_lines} 行 ok")

    # ---- 凭据扫描（含脚本）----
    scan_targets = [skill_md] + sorted((skill_dir / "scripts").rglob("*")) \
        if (skill_dir / "scripts").exists() else [skill_md]
    scan_targets += sorted((skill_dir / "references").rglob("*.md")) \
        if (skill_dir / "references").exists() else []

    hits = []
    for p in scan_targets:
        if not p.is_file():
            continue
        try:
            content = p.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for pat, label in SECRET_PATTERNS:
            for mm in re.finditer(pat, content):
                line_no = content[:mm.start()].count("\n") + 1
                hits.append(f"{p.relative_to(skill_dir)}:{line_no} 疑似 {label}")
    if hits:
        rep.add("FAIL", "凭据硬编码", "; ".join(hits[:5]),
                fix="删除真实凭据，改用环境变量 + <YOUR_TOKEN> 占位；已出现的凭据视为泄露并轮换")
    else:
        rep.add("PASS", "凭据硬编码", "未发现疑似凭据")

    # ---- 泄露型诊断命令 ----
    # 只扫代码块：正文里提到 `env` 往往是在解释它危险，不是在执行它
    leaky = []
    for p in scan_targets:
        if not p.is_file() or p.suffix in {".png", ".jpg", ".ico"}:
            continue
        try:
            content = p.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for mm in re.finditer(r'```[a-z]*\n(.*?)```', content, re.DOTALL):
            block, block_at = mm.group(1), mm.start(1)
            for pat, label in LEAKY_COMMANDS:
                for bm in re.finditer(pat, block):
                    abs_pos = block_at + bm.start()
                    if is_prohibition(content, abs_pos):
                        continue  # 是「禁止用 X」的规则，不是真的在用 X
                    line_no = content[:abs_pos].count("\n") + 1
                    leaky.append(f"{p.relative_to(skill_dir)}:{line_no} 用了 {label}")
    if leaky:
        rep.add("FAIL", "泄露型诊断命令", "; ".join(sorted(set(leaky))[:5]),
                fix="改为布尔检查：mytool whoami >/dev/null && echo OK，只回传 OK/FAIL")
    else:
        rep.add("PASS", "泄露型诊断命令", "未发现")

    # ---- 硬编码绝对路径（排除占位符）----
    abs_hits = []
    for mm in re.finditer(r'(?<![\w<])/(?:Users|home|root|C:\\\\?)/[^\s`"\'）)]*', body):
        seg = mm.group(0)
        if "<" in seg or "skill-directory" in seg or "SKILL_DIR" in seg:
            continue
        abs_hits.append(seg)
    for mm in re.finditer(r'[A-Za-z]:\\\\', body):
        abs_hits.append(mm.group(0))
    if abs_hits:
        rep.add("WARN", "硬编码绝对路径",
                f"正文中出现: {', '.join(sorted(set(abs_hits))[:3])}",
                fix="改用 <skill-directory>/... 或 ${SKILL_DIR}/... 相对定位")
    else:
        rep.add("PASS", "硬编码绝对路径", "未发现")

    # ---- 引用存在性 ----
    refs = re.findall(r'(?:references|scripts|docs|assets)/[A-Za-z0-9_\-./]+\.[a-z]{1,4}', body)
    missing = []
    for r in set(refs):
        if not (skill_dir / r).exists():
            missing.append(r)
    if missing:
        rep.add("FAIL", "引用文件存在性",
                f"引用了不存在的文件: {', '.join(sorted(missing))}",
                fix="补文件，或删掉这条引用（正文引用不存在的路径 = 幻觉入口）")
    else:
        rep.add("PASS", "引用文件存在性", f"{len(set(refs))} 个引用均存在")

    # ---- 引用深度（只深一层）----
    deep = [r for r in set(refs) if r.count("/") > 1]
    if deep:
        rep.add("FAIL", "引用深度",
                f"超过一层: {', '.join(sorted(deep))}",
                fix="官方要求 references/ 引用只深一层；把嵌套文件提到一级目录")
    else:
        rep.add("PASS", "引用深度", "均为一层")

    # ---- 死脚本检测 ----
    scripts_dir = skill_dir / "scripts"
    if scripts_dir.exists():
        orphans = []
        for p in sorted(scripts_dir.iterdir()):
            if p.is_file() and p.suffix in {".py", ".sh", ".js"}:
                if p.name not in body and p.stem not in body:
                    orphans.append(p.name)
        if orphans:
            rep.add("FAIL", "死脚本",
                    f"scripts/ 下存在但正文从未提及: {', '.join(orphans)}",
                    fix="在正文点名并说明「何时用」；不用就删掉。"
                        "死脚本 = 模型照文档手写命令，绕开脚本里的重试与错误处理")
        else:
            rep.add("PASS", "死脚本", "无")

    # ---- 软检查：安全段 / preflight / 降级 ----
    if not re.search(r'(安全|Security|凭据|token|密钥)', body, re.I):
        rep.add("WARN", "安全段", "正文未见安全/凭据相关段落",
                fix="涉及调用外部服务就必须有凭据段，且放在命令之前")
    if not re.search(r'(preflight|前置检查|Step 0|环境检查)', body, re.I):
        rep.add("WARN", "Preflight", "未见强制前置检查",
                fix="加 Step 0：命令存在 → 版本 → 认证 → 连通 → scope，任一失败即停")
    if not re.search(r'(降级|fallback|回退|不支持.*不)', body, re.I):
        rep.add("WARN", "降级路径", "未见降级约定",
                fix="写明降级顺序，并禁止静默降级")
    vague_hits = [
        mm for mm in re.finditer(r'(必要时|适当时|可以视情况|酌情|if needed|optionally)', body, re.I)
        if not is_prohibition(body, mm.start())
    ]
    if vague_hits:
        rep.add("WARN", "模糊指令",
                f"出现「必要时/适当时/optionally」等不可判定措辞 {len(vague_hits)} 处",
                fix="替换成可判定的条件或删掉")

    return rep


def main():
    ap = argparse.ArgumentParser(description="校验工具类 Skill 是否可发布")
    ap.add_argument("skill_dir", help="skill 目录路径")
    ap.add_argument("--json", action="store_true", help="输出 JSON")
    args = ap.parse_args()

    rep = check_all(args.skill_dir)
    rows = rep.rows

    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
    else:
        print(f"Skill 校验: {Path(args.skill_dir).name}")
        print("=" * 62)
        for r in rows:
            mark = {"PASS": "✅", "WARN": "⚠️ ", "FAIL": "❌"}[r["level"]]
            print(f"  {mark} {r['check']:<16} {r['detail']}")
            if r["fix"]:
                print(f"     {'':<16} └ 修: {r['fix']}")
        print("=" * 62)
        n_pass = len([r for r in rows if r["level"] == "PASS"])
        print(f"结果: {n_pass} PASS / {len(rep.warns)} WARN / {len(rep.fails)} FAIL")

        if not rep.fails:
            print("✅ 无阻断项，可发布")
        else:
            print("❌ 存在阻断项，修复后重跑")

    sys.exit(0 if not rep.fails else 1)


if __name__ == "__main__":
    main()
