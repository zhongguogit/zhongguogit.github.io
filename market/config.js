/**
 * ============================================================
 *  市场配置 —— 平台抽成 3%
 * ============================================================
 *  和 /pay/config.js 共用同一个 Supabase。
 *  需要额外建两张表：market_items（商品）、market_orders（成交）
 *  建表 SQL 见 /market/README.md
 * ============================================================
 */
window.MKT_CONFIG = {

  // 平台抽成比例（%）。本站只收 3%，剩下 97% 归卖家
  platformFeePct: 3,

  // 结算方式说明（会显示在页面上，别随便改）
  settle: '买家付款给你 → 你确认发货 → 平台抽 3% 服务费 → 我们按月对账，月末把 97% 打给你（未满 ¥50 顺延到下月）',

  supabase: {
    url: 'https://dnqswjrevffwdcksnwan.supabase.co',
    key: 'sb_publishable_O23O8vd8DYWDBoydPjl9LA_uYGspSHC',
    items: 'market_items',
    ordersTable: 'market_orders'
  },

  // 卖家后台口令（和 /pay 的核销口令分开，避免一个人拿两边权限）
  sellerPin: '2026751206',

  // 分类
  cats: [
    { id: 'all',      name: '全部',      icon: '🗂️' },
    { id: 'doubao',   name: '豆包',      icon: '🫘', desc: '适合口语指令、长文改稿、日常问答' },
    { id: 'kouzi',    name: '扣子 Coze', icon: '🧩', desc: '适合工作流、Bot 编排、自动发布' },
    { id: 'qwen',     name: '通义千问',  icon: '☁️', desc: '适合长文档、表格、代码、结构化输出' },
    { id: 'agent',    name: 'AI 智能体', icon: '🤖', desc: '跨平台可用的智能体任务包' },
    { id: 'voice',    name: '语音口令',  icon: '🎙️', desc: '对着手机说一句就能用的场景口令' },
    { id: 'skill',    name: 'Skill 包',  icon: '🧬', desc: '可装进 Agent 的 Skill 技能包' }
  ]
};
