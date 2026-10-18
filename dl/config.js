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
      tagline: '从三国穿越到 2026 年的军师：万事出三策，还能像翻译软件一样贴身提醒该干嘛、怎么干',
      price: 39,
      file: 'pig-strategist-v1.1.zip',
      size: '~7 KB',
      tags: ['人设', '决策', 'Agent Skill'],
      includes: [
        'SKILL.md：军师人设 + 三条锦囊 + 随军模式（今日锦囊时辰表 / ⚡贴身提兵 / 收兵）',
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
,
    {
      id: 'global-mall',
      name: '全球购物中心（测试版）',
      tagline: '帮老外点对点直购中国商品：厨具、日用品寄到家；九步流程 + 风险卡点，卡在哪一步就告诉哪一步。仅服务已付费预约会员，款项未进平台无服务入口。⚠ 仅供测试',
      price: 99,
      file: 'global-mall-v0.1.zip',
      size: '~16 KB',
      tags: ['跨境', '流程', '测试版', '风险委员会', '分国生效', 'N名单准入', 'Agent Skill'],
      includes: [
        'SKILL.md：R 入口 + C 委员会（N 名单分国准入）+ 会员预约 + E0 核验 + 九步闸门 + 应急救命稻草通道（SOS 单字入口 + 官方救援索引）+ 上滑快捷风格 + 国际贸易实务（Incoterms/HS 归类/保险/退税）',
        'policy.md：9610/9710/9810/1210/1039 五条海关通道怎么选（附公告号）',
        'pain-points.md：老外八大真实困惑及本 skill 的对应解法',
        'risk-gates.md：9 道闸门 20+ 个卡点，每个卡点的风险与出路',
        '信用颜色系统：分数即颜色（🟩绿90+ / 🟦蓝 / 🟨黄 / 🟧橙 / 🟥红 / ⬛黑作废），买卖双向打分，看颜色知信用',
        '国际地图冒泡：各方按城市上地图，RB 蓝泡、C 委员金边泡，买家一键就近找愿意担责的人',
        'flows.md：单证清单 + 会员费用机制 + 给老外的英文说明；trade-practice.md：Incoterms/HS/保险/付款/退税实操参考；policy.md 含应急物资类目表'
      ],
      install: [
        '解压到 ~/.claude/skills/global-mall/（目录名不能改）',
        '对话里说「用全球购物中心，我想买中国的××」即可触发',
        '⚠ 测试版：它是流程与风险把关工具，不代替报关、检疫、支付资质'
      ],
      note: '本版本仅供测试。仅服务已提前支付预约费用的会员，且各方须先走「R 入口」登记风险承担责任人才、取得 RB 责任凭证后才能进入预约缴费，缺任一位流程不运行；本 skill 不对外承担任何风险；款项未进入平台前没有服务入口'
    }
,
    {
      id: 'oral',
      name: '赚钱包 · 短视频口播稿包',
      tagline: '今晚学会，明天就能接第一条 80 块的单；母版提示词 + 12 行业版 + 报价单',
      price: 39,
      file: 'kit-oral-v1.0.zip',
      size: '~4 KB',
      tags: ['赚钱包', '可下载'],
      includes: [
          '01-口播稿母版提示词.md：钩子/论证/落点三段结构',
          '02-12个行业版写法.md：餐饮到口腔，逐行可套',
          '03-节奏标记说明.md：停顿/重音/气口怎么标',
          '04-报价单模板.md：直接发给客户',
          '05-客户异议答复.md：5 个常见砍价怎么接',
          'README.md：三天开张路线图',
        ],
      install: [
          '解压得到 6 个 md 文件，用任意编辑器打开即可',
          '推荐顺序：先读 README → 跑 01 母版 → 按 02 挑你的行业',
          '03 的节奏标记照抄在稿子上，念出来不像念稿',
        ],
      note: '纯文本，不需安装。手机也能看，建议电脑上写稿'
    },
    {
      id: 'xiaohongshu',
      name: '赚钱包 · 小红书图文代写包',
      tagline: '一个账号养起来，商家自己会来找你；9 种爆款结构 + 120 条标题库',
      price: 49,
      file: 'kit-xiaohongshu-v1.0.zip',
      size: '~5 KB',
      tags: ['赚钱包', '可下载'],
      includes: [
          '01-9种爆款结构拆解.md：痛点/反常识/清单/对比/故事/教程/避雷/合集/日记',
          '02-标题库120条.md：按行业分，改两个词就能用',
          '03-正文排版规范.md：分段、emoji 密度、留白',
          '04-配图提示词30条.md：9 图套装直接出图',
          '05-发布时段与标签表.md',
          '06-报价单与月费方案.md',
          'README.md',
        ],
      install: [
          '解压后 7 个 md 文件',
          '先看 README 的两天起号流程',
          '写第一篇时把 01 的结构表和 02 的标题并排打开',
        ],
      note: '纯文本，不需安装'
    },
    {
      id: 'resume',
      name: '赚钱包 · 简历 + 求职包',
      tagline: '旺季一周接 10 单，一单 60 起；38 项诊断清单 + 6 岗位族模板',
      price: 29,
      file: 'kit-resume-v1.0.zip',
      size: '~6 KB',
      tags: ['赚钱包', '可下载'],
      includes: [
          '01-简历诊断清单38项.md：逐条打勾找问题',
          '02-6个岗位族改写模板.md：技术/运营/销售/财务/行政/应届',
          '03-12个结果化句式.md：把「我做了什么」改成「我做成了什么」',
          '04-求职信3版模板.md',
          '05-模拟面试20问.md：含参考答法',
          '06-报价梯度表.md：60/120/200 三档',
          'README.md',
        ],
      install: [
          '解压后 7 个 md 文件',
          '给自己先改一份，做成前后对比图当作品',
          '02 挑对应岗位族，整段替换即可',
        ],
      note: '纯文本，不需安装'
    },
    {
      id: 'shopcopy',
      name: '赚钱包 · 电商详情页文案包',
      tagline: '单价最高的一类，一个客户能养你半年；五段结构 + 8 类目模板',
      price: 59,
      file: 'kit-shopcopy-v1.0.zip',
      size: '~5 KB',
      tags: ['赚钱包', '可下载'],
      includes: [
          '01-详情页五段结构.md：痛点/信任/参数/场景/促单',
          '02-8个类目模板.md：服饰到文具',
          '03-卖点提炼5步法.md：从参数到人话好处',
          '04-主图文案20条.md：8 字以内可直接上图',
          '05-差评转化话术.md：把差评变成信任素材',
          '06-报价单.md：单品120 / 全店500 / 月维护800',
          'README.md',
        ],
      install: [
          '解压后 7 个 md 文件',
          '挑一个你买过的品类，找一个详情页很烂的店练手',
          '改完做两版对比图，直接私信店主',
        ],
      note: '纯文本，不需安装'
    },
    {
      id: 'emergency',
      name: '赚钱包 · 应急接单急救包',
      tagline: '三天内必须见到钱的人先看这个；72 小时现金流清单 + 12 种当天结钱的活',
      price: 69,
      file: 'kit-emergency-v1.0.zip',
      size: '~5 KB',
      tags: ['赚钱包', '可下载'],
      includes: [
          '01-72小时现金流清单.md：把家里/技能/时间逐一折价',
          '02-当天能结钱的12种活.md：附接单入口与结算周期',
          '03-话术模板8条.md：怎么开口要活、怎么报价、怎么催款',
          '04-防骗清单.md：7 个真实话术坑',
          '05-一周现金预算表.md：填数字自动算缺口',
          '06-本地救助资源清单.md：求助顺序',
          'README.md',
        ],
      install: [
          '解压后 7 个 md 文件，先读 README 的第一句话',
          '第一步永远是填 05 预算表，算出你必须在几天内拿到多少钱',
          '从 02 里挑 3 个今晚就能开始的，同时启动',
        ],
      note: '这个包是一次性的止血工具，不是长期生意课'
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
