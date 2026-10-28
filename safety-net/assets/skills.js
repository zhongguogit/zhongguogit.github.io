// Global Safety Net — 无单时 · Skill 工坊：AI 铸造 → 上架 → 出售 → 回灌
(() => {
  'use strict';
  const grid = document.getElementById('skillGrid');
  if (!grid) return;

  const $ = (id) => document.getElementById(id);
  const KEY = 'gsn.skills.v1';
  const BUILD_MS = 3200;

  const SKILLS = [
    { id: 'triage', name: '跨境工单分流器', domain: '④ 岗位 · ⑫ 互助',
      value: '多语工单按意图与情绪分流，先分对再谈快', price: 199, unit: '/月' },
    { id: 'resume-card', name: '简历能力卡生成器', domain: '⑤ AI 档案',
      value: '非英语简历 → 可核验能力卡，不再卡在语言', price: 299, unit: '/次' },
    { id: 'sanction', name: '制裁名单变更哨兵', domain: '② 合规 · ⑯ RuleOS',
      value: '72 小时变更摘要与影响面，先看见再动手', price: 999, unit: '/月' }
  ];

  const blank = () => {
    const s = {};
    SKILLS.forEach((k) => { s[k.id] = { status: 'idle', start: 0, sales: 0, earned: 0 }; });
    return s;
  };
  const load = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!raw || typeof raw !== 'object') return blank();
      return Object.assign(blank(), raw);
    } catch { return blank(); }
  };
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 忽略 */ }
  };

  const state = load();
  const cards = new Map();
  let lastOrders = null;

  SKILLS.forEach((k) => {
    const root = document.createElement('article');
    root.className = 'sk';
    root.innerHTML = `
      <div class="sk-h"><h3></h3><span class="pill">未铸造</span></div>
      <p class="sk-tag"></p>
      <p class="sk-tag sk-value"></p>
      <div class="sk-meta"><span>定价 <b></b></span><span>铸造约 3 秒</span></div>
      <div class="sk-bar"><em></em></div>
      <div class="sk-foot"><span class="sk-sales"></span><button class="accept sk-btn" type="button">用 AI 铸造</button></div>`;
    root.querySelector('h3').textContent = k.name;
    root.querySelector('.sk-tag').textContent = k.domain;
    root.querySelector('.sk-value').textContent = k.value;
    root.querySelector('.sk-meta b').textContent = `¥${k.price}${k.unit}`;
    grid.appendChild(root);
    const els = {
      root,
      pill: root.querySelector('.pill'),
      bar: root.querySelector('em'),
      sales: root.querySelector('.sk-sales'),
      btn: root.querySelector('.sk-btn')
    };
    els.btn.addEventListener('click', () => act(k));
    cards.set(k.id, els);
  });

  function act(k) {
    const s = state[k.id];
    if (s.status === 'idle') {
      s.status = 'building';
      s.start = Date.now();
      render();
      save();
      window.setTimeout(() => {
        render();
        const toast = $('skillToast');
        if (toast) toast.textContent = `「${k.name}」已过影子跑与人审 · 上架，等第一笔售出。`;
      }, BUILD_MS + 150);
    } else if (s.status === 'listed') {
      s.sales += 1;
      s.earned += k.price;
      render();
      save();
      const toast = $('skillToast');
      if (toast) toast.textContent = `「${k.name}」售出 1 份 · ¥${k.price} 已进托管；能力本身在涨价。`;
    }
  }

  function render() {
    let listed = 0, sales = 0, earned = 0;
    const now = Date.now();

    SKILLS.forEach((k) => {
      const s = state[k.id];
      if (s.status === 'building' && now - s.start >= BUILD_MS) {
        s.status = 'listed';
        save();
      }
      const e = cards.get(k.id);
      const isListed = s.status === 'listed';
      const isBuilding = s.status === 'building';
      if (isListed) { listed++; sales += s.sales; earned += s.earned; }

      e.root.classList.toggle('listed', isListed);
      e.pill.className = 'pill' + (isListed ? ' done' : isBuilding ? ' warn' : '');
      e.pill.textContent = isListed ? '已上架' : isBuilding ? 'AI 铸造中' : '未铸造';

      const pct = isListed ? 100 : isBuilding ? Math.min(96, ((now - s.start) / BUILD_MS) * 100) : 0;
      e.bar.style.width = `${pct}%`;

      e.btn.disabled = isBuilding;
      e.btn.textContent = isListed ? '模拟售出' : isBuilding ? '铸造中…' : '用 AI 铸造';

      if (isListed) e.sales.textContent = `已售 ${s.sales} · 收入 ¥${s.earned}`;
      else if (isBuilding) e.sales.textContent = 'AI 起草中 · 人审后上架';
      else e.sales.textContent = '未上架 · 0 收入';
    });

    const sum = $('skillSum');
    if (sum) sum.textContent = `已上架 ${listed}/${SKILLS.length} · 累计售出 ${sales} 份 · 累计收入 ¥${earned}`;

    const hint = $('idleHint');
    if (hint && lastOrders) {
      if (lastOrders.open === 0 && listed < SKILLS.length) {
        hint.textContent = '现在无单。正好用 AI 铸造一枚 Skill，上架去卖。';
      } else if (lastOrders.open === 0) {
        hint.textContent = '无单，但三枚 Skill 都在架上。等售出，或改版再上。';
      } else {
        hint.textContent = `现在有 ${lastOrders.open} 单在架，先接单；空档再铸造。`;
      }
    }
  }

  document.addEventListener('gsn:orders', (ev) => {
    lastOrders = ev.detail;
    render();
  });

  render();
  window.setInterval(render, 450);
})();
