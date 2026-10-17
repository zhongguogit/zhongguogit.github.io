/**
 * ============================================================
 *  商品与卡密配置
 * ============================================================
 *
 *  交付模型（重要，先看懂再改）：
 *
 *  1. 买家扫码付款 → 订单进 orders 表，状态 pending
 *  2. 站长在 /admin/ 点「已到账」，系统自动生成 8 位卡密写回订单
 *  3. 买家拿订单号 + 卡密到 /dl/ 自助下载
 *  4. 卡密只对这一个商品有效，换商品无效
 *
 *  为什么这样设计：
 *  - 静态站没有服务端，不能让"付了钱就能下"靠前端判断（会被绕过）
 *  - 卡密由站长核验后才发，等于用人的判断替代了支付回调
 *  - 泄露风险极小：卡密只出现一次，且和订单号绑定
 *
 * ============================================================
 */
window.STORE_CONFIG = {

  // ---------- 商品 ----------
  // file 指向 /downloads/ 下的 zip。一个包一个 zip。
  items: [
    {
      id: 'skill-smith',
      name: '技能写作者 skill-smith',
      tagline: '写 skill 不再卡在第一行，附 12 项自动校验',
      price: 49,
      file: 'skill-smith-v1.0.zip',
      size: '~28 KB',
      tags: ['Agent Skill', 'Claude Code', 'Codex'],
      includes: [
        'SKILL.md：六条硬规矩 + 三层加载 + 12 项自检',
        'scripts/validate.py：跑一条命令查 8 项（本包自己 0 失败）',
        'template/SKILL.md：填空即用的空骨架',
        'references/anti-patterns.md：14 个真实反模式对照',
        'references/description-bank.md：60 个触发词案例',
        'references/glossary.md：判据词与术语表'
      ],
      install: [
        '解压后把整个 skill-smith 文件夹放到 ~/.claude/skills/ 下',
        '目录名必须是 skill-smith（和 SKILL.md 里的 name 一致，否则不加载）',
        '重启 Claude Code，输入「写个 skill」应该能触发',
        '自检：python scripts/validate.py . 应输出「失败 0」'
      ],
      note: '适用于 Claude Code / Codex / Cursor 等支持 Agent Skills 的工具'
    },
    {
      id: 'root-first',
      name: '系统化排障 root-first',
      tagline: '强制先找根因，禁止猜着改',
      price: 39,
      file: 'root-first-v1.0.zip',
      size: '~22 KB',
      tags: ['Agent Skill', '调试', '工程'],
      includes: [
        'SKILL.md：铁律 + 四阶段闸门 + 三种典型误判',
        'references/checklist.md：可打印的四阶段检查表',
        'scripts/minimize_repro.py：自动二分缩小复现范围',
        '失败处理表：复现不了 / 找不到根因 / 被催时分别怎么办'
      ],
      install: [
        '解压到 ~/.claude/skills/root-first/',
        '遇到报错时它会先拦住你，不让直接改代码',
        '脚本用法：python scripts/minimize_repro.py --help'
      ],
      note: '含可执行脚本，Python 3.8+ 直接跑，无第三方依赖'
    },
    {
      id: 'deep-read',
      name: '长文档拆解 deep-read',
      tagline: '8 万字报告不再只读开头就编',
      price: 39,
      file: 'deep-read-v1.0.zip',
      size: '~20 KB',
      tags: ['Agent Skill', '长文档', '防幻觉'],
      includes: [
        'SKILL.md：先算再读 + 三档分段策略 + 三层摘要',
        'scripts/chunk.py：按窗口自动切分，输出可追溯 manifest',
        'references/schema.md：三层 JSON 完整字段定义',
        'references/verify.md：交付前必过的六项校验',
        '防幻觉三条硬约束（要求标注出处，找不到不许写）'
      ],
      install: [
        '解压到 ~/.claude/skills/deep-read/',
        '用法：python scripts/chunk.py --in 报告.md --window 32000 --out ./segs',
        '分段后按 manifest 顺序逐段喂给模型，再按 schema 汇总'
      ],
      note: '支持 md/txt；PDF 需先转文本'
    },
    {
      id: 'bundle-3',
      name: '三件套组合（省钱 40 元）',
      tagline: 'skill-smith + root-first + deep-read',
      price: 99,
      file: 'bundle-3-v1.0.zip',
      size: '~70 KB',
      tags: ['组合包', 'Agent Skill'],
      includes: [
        '上面三个包的完整内容',
        '额外：一份《怎么把这 3 个技能串成工作流》的说明',
        '后续这个组合包的所有更新，免费给'
      ],
      install: [
        '解压后有三个文件夹，分别放到 ~/.claude/skills/ 下',
        '三个技能的目录名不能改',
        '验证：三个目录分别跑 validate.py 都应是「失败 0」'
      ],
      note: '单买三个要 127，组合省 28'
    },
    {
      id: 'pig-strategist',
      name: '穿越猪哥军师',
      tagline: '从三国穿越到 2026 年的军师，万事出三策',
      price: 39,
      file: 'pig-strategist-v1.0.zip',
      size: '~7 KB',
      tags: ['人设', '决策', 'Agent Skill'],
      includes: [
        'SKILL.md：军师人设完整规则（三条锦囊 + 军师断语的固定结构）',
        '典故映射库：14 个三国典故 → 职场/搞钱/人情现代用法',
        '三个完整场景示范：职场背锅、感情升温、副业选择',
        '红线规则：医疗法律投资不越界、害人之策不接'
      ],
      install: [
        '解压到 ~/.claude/skills/pig-strategist/（目录名不能改）',
        '对话里说「请用猪哥军师帮我出主意」即可触发',
        '兼容任何支持 Agent Skill 的 AI 助手'
      ],
      note: '毒舌但向着主公。每条锦囊必报凶吉，不许和稀泥'
    }
  ],

  // ---------- 卡密的规则 ----------
  key: {
    length: 8,               // 卡密长度
    // 去掉容易看错的 0/O/1/I，减少用户输入错误
    alphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  },

  // ---------- 下载地址 ----------
  base: '/downloads/',

  // ---------- 订单表（与 /pay 共用） ----------
  supabase: {
    url: 'https://dnqswjrevffwdcksnwan.supabase.co',
    key: 'sb_publishable_O23O8vd8DYWDBoydPjl9LA_uYGspSHC',
    table: 'orders'
  }
};
