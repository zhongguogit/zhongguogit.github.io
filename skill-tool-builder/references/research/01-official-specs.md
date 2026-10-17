# 01 · 官方规范与头部实践调研（Agent Skills）

> 范围：写「工具/集成类 skill」（CLI / HTTP API / MCP server / 本地脚本）所需的官方规范、官方样例、skill-creator 方法论、社区反模式、跨厂商差异。
> 可信度标记：**[一手]** 官方原文/官方仓库文件 · **[一手·镜像]** 官方文档正文经第三方站点转载（原站 docs.claude.com 在本环境区域不可达，内容取自可信镜像/同页缓存） · **[二手]** 他人转述 · **[推断]** 由上述材料推导。
> 标记约定：`硬`=不遵守会报错或被拒载；`软`=官方建议但无强制校验；`社`=社区经验。
> 黑名单（知乎/微信公众号/百度百科）已规避。调研日期 2026-10-17。

## 1. 硬性限制（不遵守会报错 / 拒载）

来源：**[一手]** https://agentskills.io/specification （规范已由 Anthropic 仓库 `spec/agent-skills-spec.md` 指向此处，该文件正文只有一行指向链接）；`硬`。
补充与交叉验证：**[一手]** https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/quick_validate.py （官方 skill-creator 自带的真实校验器）`硬`。

| 约束 | 值 | 校验/出处 |
|---|---|---|
| `name` | 1–64 字符；仅允许 `a-z` `0-9` `-`；不得以 `-` 开头/结尾；不得含连续 `--`；**必须与父目录名一致** | 规范 + quick_validate.py:65-71 |
| `name` 附加（Claude 平台） | 不得含 XML 标签；不得含保留字 `anthropic`、`claude` | doc 要求，quick_validate 未实现 |
| `description` | 1–1024 字符，非空，不得含 `<` `>` / XML 标签 | 规范 + quick_validate.py:80-84 |
| `compatibility` | ≤500 字符 | 同上 :91 |
| `allowed-tools` | 空格分隔列表；**Experimental**，各宿主支持度不一 | 规范；[二手] 确认 Claude Code 支持 `Bash(git:*)` 粒度 |
| frontmatter 键集合 | 仅 `name/description/license/allowed-tools/metadata/compatibility`；**出现其它顶层键即失败** | quick_validate.py:42-50（额外键直接 fail） |
| frontmatter 格式 | 必须以 `---` 开头，匹配 `^---\n(.*?)\n---`，且必须是 YAML dict | quick_validate.py:23-39 |
| API 上传 | 压缩包根目录须含 SKILL.md；≤30MB（未压缩）；必须配合 code execution tool；容器内**无网络、不能运行时装包** | [一手·镜像] https://platform.claude.com/docs/en/build-with-claude/skills-guide |

结论性推论 **[推断]**：本机语料（见 `03-local-corpus.md`）里大量 skill 用的 `version / author / created / updated` 顶层字段，跑官方 `quick_validate.py` 会直接 fail。跨宿主发布时必须把这些塞进 `metadata:`。

## 2. 官方三层模型与软性建议

来源：**[一手·镜像]** Claude Docs《Skill authoring best practices》全文（原页 region-blocked，取自 https://claude.yourdocs.dev/docs/agents-and-tools/agent-skills/best-practices 逐字转载，并与其 .md 原文比对无误）。

三层（progressive disclosure）官方数字：① Metadata `name+description` 常驻 ≈100 tokens；② SKILL.md 正文 <5000 tokens 推荐；③ `scripts/ references/ assets/` 按需加载，**脚本执行不占上下文，只有 stdout 计费**。

`软`：
- **context window is a public good**；默认 Claude 已经很聪明，只写它不知道的；每段都要回答"这段值这个 token 吗"。
- **degrees of freedom** 三分：高自由度（散文指令，多条路都行）／中（伪代码+参数模板）／低（逐字执行的脚本，脆弱/必须一致的操作）；官方类比「窄桥 vs 开阔地」——**低自由度 = 给护栏和精确命令，例如数据库迁移」。
- **500 行**正文上限；`references/` 引用**只深一层**，禁止深层嵌套链；长 reference（>300 行）要加目录。
- **命名推荐动名词**（`processing-pdfs`），允许名词短语；禁止 `helper/utils/tools/data/files` 这类泛名。
- **避免时间敏感信息**：版本/端点迁移写成 `## Old patterns` + 折叠块，不要写"2025 年 8 月之后请用新 API"。
- **给默认值而不是列一堆选项**（"用 pdfplumber；扫描件才转 pdf2image+OCR"），反对 "你可以用 A/B/C/D"。
- **Solve, don't punt**：脚本要自己处理错误（FileNotFoundError 就创建默认文件），不要再抛给 Claude；常量要自证（`MAX_RETRIES = 3 # 三次重试平衡可靠与速度`），禁 voodoo constants。
- **plan → validate → execute**：高风险/批量/破坏性操作必须先产出可被脚本验证的中间文件（如 `changes.json`），验证通过才执行；脚本报错要 verbose 且指出可用值。
- **MCP 工具必须写全限定名** `ServerName:tool_name`，否则多 server 时 tool not found。
- **不要假设依赖已安装**：写清 `pip install xxx`；`compatibility` 字段声明 git/docker/jq/网络要求。
- **只用正斜杠**，禁 Windows 路径。
- **evaluation first**：先跑无 skill 的 baseline 找差距 → 3 个 eval → 写最小指令 → 迭代；三档模型（Haiku 够不够引导 / Sonnet 清不清 / Opus 有没有过度解释）都要测。
- 官方发布前 checklist 三组：核心质量（描述含关键词+含何时用、正文<500 行、引用一层深、无时效信息、术语一致）／代码与脚本（不 punt、错误显式、无魔法常量、依赖已声明、验证步骤、反馈回路）／测试（≥3 eval、三模型、真实场景）。

## 3. skill-creator 官方方法论

来源：**[一手]** https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md （485 行，含 `references/schemas.md`、`scripts/{quick_validate,package_skill,run_loop,run_eval,improve_description,aggregate_benchmark}.py`、`agents/{grader,comparator,analyzer}.md`、`eval-viewer/generate_review.py`）。

流程：**capture intent（能力/触发/输出格式/要不要测试）→ 访谈+用 MCP/subagent 做研究 → 写 SKILL.md → 2-3 条真实用户口吻的 test prompt → with-skill 与 baseline 两个 subagent **必须在同一轮发起** → 跑的同时起草断言 → 每次完成任务通知里抓 `total_tokens`/`duration_ms` 存 `timing.json`（**这是唯一机会，不持久化**）→ grader 出 `grading.json`（字段名必须严格是 `text/passed/evidence`）→ `aggregate_benchmark` 出 benchmark.json/md → 起 `generate_review.py` 给人类看 → 读 `feedback.json` → 改 → 下一轮。

改进四原则：**①从反馈泛化，别过拟合这三五个例子；②定期给正文瘦身、删掉不拉分的内容（读 transcript 而不只看最终产物）；③解释 why，不要堆压迫性 MUST（原文：写 ALWAYS/NEVER 全大写是"yellow flag"，尽量重写成讲清道理）；④反复出现的工作实例化——若 3 个用例里 subagent 都各自写了 `create_docx.py`，就把它写进 `scripts/`**。

description 优化：造 20 条 query，8-10 正（覆盖不同说法，含不点名但确实需要的）+ 8-10 负（**必须是最容易被关键词擦到的近邻**，"写个斐波那契"这种负例没价值）；`python -m scripts.run_loop --eval-set ... --skill-path ... --model <当前会话模型 id> --max-iterations 5`；60/40 切 train/test，每条 query 跑 3 次取稳定触发率，**最终按 test 分而非 train 分选 `best_description` 以防过拟合**。

触发机制真相 **[一手]**：Claude 只在"自己随手做不了"的任务上才去查 skill；像"读这个文件"这种一步到位的问题，description 再完美也不会触发 → eval query 必须有实质内容。
补充 **[一手]**：description 是主要触发机制，**所有 "when to use" 信息都放 description，不要放正文**（正文触发后才加载，写了等于没写）。

注意（勘误）**[推断]**：社区常提的 "init / package / validate 三脚本流程" 在本版仓库里**没有 init 脚本**；只有 `quick_validate.py`（校验）、`package_skill.py`（打包 .skill）、`run_loop.py`/`run_eval.py`（触发 Matts 优化）、`improve_description.py`、`aggregate_benchmark.py`。

## 4. 官方仓库里工具/集成类 skill 的真实写法

| Skill | 行数 | description 写法 | 脚本 vs 指令 | 错误处理 |
|---|---|---|---|---|
| [webapp-testing](https://github.com/anthropics/skills/blob/main/skills/webapp-testing/SKILL.md) | 95 | 第三人称能力描述 + 工具名 Playwright + 动作枚举（" interacting with and testing… Supports verifying…"） | **黑盒脚本 + 让模型自己写脚本**：`scripts/with_server.py` 管生命周期，自动化逻辑交给模型写 Playwright 脚本 | 无错误表。只有决策树、Common Pitfall 一条（动态页必须先 `wait_for_load_state('networkidle')`）——即"先侦察后动作" |
| [claude-api](https://github.com/anthropics/skills/blob/main/skills/claude-api/SKILL.md) | **616（超 500 红线）** | YAML 块标量 `\|-`，含 **TRIGGER**（"read BEFORE opening the target file; don't skip because it looks like a one-liner"、域名到 `us.anthropic.*` 的显式枚举）+ **SKIP 负触发**（检出 OpenAI/Gemini 等关键词则跳过，并给一句 `grep -rE` 作为**机器可判定的判据**） | 纯指令 + `{lang}/` 目录作 references | 有 §"Warning: API Drift - Your Training Prior May Be Stale"；§Common Pitfalls 明确 **HTTP 200 但 body 是错误对象**（server tool 返回 `web_search_tool_result` 里是 error object）要分支处理；"catch a chain, not one broad class"（最具体到最宽：`NotFoundError`→`RateLimitError`→`APIStatusError`→`APIConnectionError`） |
| [mcp-builder](https://github.com/anthropics/skills/blob/main/skills/mcp-builder/SKILL.md) | 236 | 第三人称 + "Use when building MCP servers… whether in Python (FastMCP) or Node/TypeScript" | 4 阶段流程 + `reference/*.md` 分期加载 + `scripts/{connections,evaluation}.py` | Phase 4 强制 eval：**10 条**问题，须满足 Independent / **Read-only** / Complex / Realistic / Verifiable / Stable 六条，XML 落到 a fixed format |
| [pdf](https://github.com/anthropics/skills/blob/main/skills/pdf/SKILL.md) | 314 | 祈使句开头 + 穷举触发场景："Use this skill whenever the user wants to do anything with PDF files… If the user mentions a .pdf file or asks to produce one, use this skill." | Quick Start 内联代码 + `scripts/*.py` + `forms.md`/`reference.md` 分流 | 各命令行工具一节，未见集中错误表 |

可直接抄的三处 **[一手]**：
1. webapp-testing 的范式：**`Always run scripts with --help first`; DO NOT read the source until you try running it first** —— 脚本是黑盒，读源码会污染上下文。（它用相对路径 `scripts/with_server.py`，需宿主保证 cwd 或对模型的路径约定，见 §5）。
2. claude-api 把"负触发"写成可执行命令（`grep -rE 'openai|...'` 命中就 SKIP），比形容词判定可靠。
3. mcp-builder 的 tool design 段（input schema 用 Zod/Pydantic + 在字段描述里给例子；能定义就定义 `outputSchema`/`structuredContent`；标注 `readOnlyHint` / `destructiveHint` / **idempotentHint** / `openWorldHint`）——这是 Anthropic 官方对"工具接口该怎么描述"的唯一明示条款，写 HTTP/MCP 类 skill 时可直接作为**工具描述模板**。

## 5. 社区反模式

- **把所有东西塞进 SKILL.md**：1200 行正文导致"触发反而更差"——描述被细节淹没，且每次触发都付全文。修正：主文件 ≤200~500 行，数据/样例下沉。[二手] https://developer.volcengine.com/articles/7689454287873589311
- **Description Soup**：`Helps with many things including X, Y, Z, and also A, B, C` → 误触发 + 漏触发 + 白烧 token。修正模板：`[核心能力]. Use for [A,B,C]. Activate on keywords: "X","Y". NOT for [D,E,F].` [二手] https://someclaudeskills.com/docs/skills/skill_coach/references/anti-patterns
- **The Everything Skill**：一个 skill 吃整个域，横向又广又不能正确路由 → 拆成可组合的小 skill。同上。
- **Orphaned Sections**：`references/deep_dive.md` 存在但正文从不说何时读 → 等于不存在（本机语料里 gongfeng/figma 的死脚本是同类病，见 `03` §反面教材 3）。同上（Reference Illusion 条目：正文引用了不存在的文件路径）。
- **Tool Overload**：`allowed-tools: Read,Write,Edit,Bash,Glob,Grep,Task,WebSearch,WebFetch` → 攻击面与 token 双增。修正：只读 skill 只给 `Read,Grep,Glob`；构建集成给 `Read,Write,Bash(npm:*,git:*)`。同上。注意 **[一手]** Claude Academy 明确 `allowed-tools` 是**预批准不是限制**，列出之外的能力仍在（本轮 Turn 有效，下一句用户消息即失效），真正的边界要用 `disallowed-tools` 或 hook。https://academy.claude.com/courses/introduction-to-agent-skills/configuration-and-multi-file-skills
- **descirption 写成能力介绍而非触发条件**（"提供 XX 能力，支持多种…"）→ 模型按输入句式匹配，high-level 名词命中率低。[二手] 同上 volcengine / https://niuxue.org/guides/custom-skills
- **参考文件 >300 行不加目录**、**正文不提 bunlde 了什么资源**、**用第二人称 You should** 亦被反复点名。[二手] https://blog.51cto.com/u_13229/14770516
- **context 层面的隐性坑** [二手] 同上 51CTO：skill 一旦加载就固化在上下文里，会中改 SKILL.md 不生效；skill 太多时 description 可能被自动截断进上下文预算。（与 §1 的 1024 上限叠加 → 实际可用长度更短。）
- 幂等/重试/硬编码绝对路径三条：**未见到有 URL 可引的社区一手统计**，主要依据官方 §2 的 "Solve don't punt / no voodoo constants / 只用正斜杠" 三条 + 本机失败模式调研（`02-failure-modes.md` §4.1、§5.3）。 **[推断]** 按官方口径，"脚本里写死 `MAX_RETRIES = 5` 且无注释"本身即被定性为 voodoo constant。

## 6. OpenAI / Google 同形态规范对比

> 全部为 **[二手]**：https://appliedtechnologyindex.com/research/2026-comparative-analysis-agent-skills-packaging-portability-infrastructure 与 https://dev.to/eristoddle/the-agent-skills-guide-i-wish-id-had-17i1 。两条 chaotic 来源互相印证，但落地前应按各自官方页复核。

- **共同核心**：三方都接收同一份 `SKILL.md`（name+description frontmatter + markdown body），都遵循同一三层渐进披露。**差异全在执行层**：发现路径、优先级、工具名、审批策略、文件系统布局、网络访问、模型行为、专有 frontmatter 扩展。
- **路径约定**：Claude `~/.claude/skills/`、`.claude/skills/`；OpenAI Codex `.agents/skills/`（也读 `.codex/skills/`）；Gemini CLI `.gemini/skills/`、`~/.gemini/skills/`；GitHub Copilot/VS Code `.github/skills/` 且兼容 `.claude/` `.agents/`；Cursor 递归扫且能吃 `.claude/skills/`。**`.agents/skills/` 是最强跨端约定**（非规范本身）。
- **OpenAI**：额外元数据层 `agents/openai.yaml`（UI 元数据、调用策略、工具依赖）；同名 skill 不合并、两个都会出现。
- **Google Gemini CLI**：会话开始就把 name+description 注入；命中时调 `activate_skill` 工具；**激活需确认，确认后把 skill 目录加入允许文件路径**。
- **VS Code/Copilot 扩展字段**：`user-invocable`、`disable-model-invocation`、`experimental forked context`；且**没有 per-skill hooks**（Claude 的 skill 级 hook 是独有差异）。这些字段在别的宿主会被静默忽略。
- **Anthropic 独有**：pre-built Document Skills、`/v1/skills` API + 托管版本/代码执行容器（无网、无运行时装包）、skill 级 hooks。
- 一句警告 **[二手]**：**符合格式 ≠ 行为一致**。skill 表面是文档，实为可执行内容—— GitHub 明确提示下载的 skill 未经验证可能含恶意脚本或隐藏指令，不要在未 review 的情况下预先批准 shell 权限。

## 7. 矛盾与原样保留的分歧

1. **500 行红线**：官方 best practices 说 ≥500 行就拆；官方仓库自己 ship 了 616 行的 `claude-api`。*[一手] 双方均属实* —— 推断：红线是性能建议，`claude-api` 靠 `{lang}/` 目录把真正重的部分外置，主文件是"路由 + 路由判据"。
2. **description 人称**：best practices 明确 **必须第三人称**（" description 被注入 system prompt，人称不一致会造成发现异常"，Good=`Processes Excel files`，Avoid=`I can help…`/`You can use…`）；官方 `pdf` skill 用祈使句 `Use this skill whenever…`；`claude-api` 用 `TRIGGER — read BEFORE…` + `SKIP`。*三方均为官方。*
3. **description 长度**：spec/docs 1024；claude.ai 帮助中心写 **200 字符**（可能指 UI 展示或更严的自定义 skill 校验）；社区报"装太多 skill 时描述会被自动截断"。*[规范 vs claude.ai 帮助文档 vs 社区观察]* —— 工具 skill 建议按 **≤300 字符**自限以兼容最严口径。
4. **MUST 该不该写**：skill-creator 说全大写 MUST/ALWAYS/NEVER 是 yellow flag，应改写为讲清 why；同一份 best practices 却在迭代章节举例推荐 Claude A 建议"用更强的措辞比如 MUST filter"。*[一手 · 两文档互相打脸]* —— 建议折中：**常规决策点用祈使句 + 讲清后果，不用全大写；只有"不可逆/安全"类约束才保留 MUST/NEVER。**
5. **when-to-use 放哪**：skill-creator 说全部放 description，正文写 "When to Use" 无效；本机语料的 `sites`（本机 high-quality 样本）把 When to Use 放正文。*前者 [一手]，后者是本机样本* —— 推断：正文的 When to Use 对"已触发后的二次判路"有用，对触发本身无用，两者不是一件事。
6. **工具逻辑该放 skill 还是 MCP**：volcengine 文章主张"Skill 是任务能力包，别在里面写 curl+jq，工具该用 MCP 暴露"；本项目要蒸馏的恰恰是"在 skill 里调用 CLI/HTTP"的方法论；官方 `claude-api`、`webapp-testing`、`library` 也都是 skill 内直接教调用。*[二手 vs 官方实证]* —— 保留分歧：倾向"skill 内可以有调用，但传输层差异/重试/幂等必须下沉脚本，且 (a) 工具本身若已有 MCP 则优先 MCP（本机 automation-task-manager 的 desc 就写了"若存在 MCP 优先用"）。
7. **脚本 vs 纯指令**：best practices 倾向"凡很重要且重复的事，能脚本化就脚本化"（确定性 + 零 token）；`webapp-testing` 却刻意让模型每次自己写 Playwright 脚本。*均为官方* —— 判据借用 degrees of freedom：**易碎/要一致的部分脚本化（preflight、校验、错误分类），随上下文变化的部分留给模型写（针对具体页面的选择器与断言）**。

## 8. 对写工具类 skill 的可操作启示（10 条，每条可落成检查项）

| # | 检查项（写/审一个工具 skill 时逐条过） |
|---|---|
| 1 | `name` 满足 `^[a-z0-9-]+$`、≤64 字符、无首尾连字符与 `--`、**等于目录名**；`description` ≤300 字符、不含 `<`/`>`；frontmatter 顶层只允许 6 个键（`version/author` 一律塞进 `metadata`），且能通过 `python quick_validate.py <dir>`。**判据：顶层不出现第 7 个键。** |
| 2 | description 三段式齐全：**能力 + `Use when` 触发短语（含用户真实口吻的懒说法/别名/拼写变体） + `NOT for <近邻任务>`**；若能给出可执行的负触发判据（如一句 grep），照 claude-api 那样写死。 |
| 3 | 正文 ≤500 行、引用**只深一层**、`>300` 行的 reference 带目录；全文只用**相对路径 + 正斜杠**，禁止 `C:\` 与任何 skill 之外的绝对路径；脚本定位统一用 `${SKILL_DIR}`/`<skill-directory>` 并给出明确定义。 |
| 4 | 有强制 **Step 0 Preflight 脚本**（存在性 → 版本 → 认证布尔检查 → 连通 → scope），任一失败即停并给可执行修复命令；**preflight 不允许用祈使句代替命令**。 |
| 5 | 每次"I/O 副作用"都有 **analyze → plan file → validate → execute → verify** 五次句中的至少三段的脚本，有可脚本验证的中间产物；脚本 **solve, don't punt**（自己兜 FileNotFound/权限/超时），所有常量带一行为什么。 |
| 6 | 错误分类写在脚本里而不是文档里：可重试（超时/429/5xx，带退避）+ 终态（401/403/404/400 直接停并原话转达）；**HTTP 200 但 body 是错误对象必须单独分支**（claude-api 的坑）；同一命令失败 2 次后必须换策略、第 3 次终止。 |
| 7 | 幂等：所有写操作要么带服务端 idempotency key / 业务键存在性检查，要么显式禁止重试并报"结果未知"；重试/熔断计数在脚本层实现，**不靠模型的上下文记忆**。 |
| 8 | 脚本先 `--help` 再调用，**不读源码**（webapp-testing 范式）；脚本输出结构化单行（JSON/前缀约定），模型只看输出不看实现；`scripts/` 里每个文件都在 SKILL.md 中被点名且说明何时用（消灭死脚本）。 |
| 9 | 凭据只走环境变量，零硬编码 token；`compatibility` 显式声明依赖与网络需求（Anthropic API 容器**无网无装包**必须写明）；版本/端点迁移写进 `## Old patterns` 折叠区，正文不留时间敏感句。 |
| 10 | 发布前跑完官方闭环：≥3 个真实 test prompt + with-skill/baseline **同轮**对照 + Haiku/Sonnet/Opus 三档都测 + 20 条触发 query（8-10 负例必须是近邻误命中）**任选** `scripts.run_loop` 跑完 `--max-iterations 5`，最后 `package_skill.py` 出包。 |
