// Global Safety Net — Skill 工坊：铸造 → 上架 → 真卖（微信收款码直付）
// 统一配置源：assets/skills-config.json（pay.wx_qr 填好即真卖）
(() => {
  'use strict';
  const grid = document.getElementById('skillGrid');
  if (!grid) return;

  const $ = (id) => document.getElementById(id);
  const KEY = 'gsn.skills.v1';
  const BUILD_MS = 3200;
  const cfgUrl = new URL('assets/skills-config.json', document.baseURI).href;
  const ORDERS_KEY = 'gsn.orders.v1';

  // 构建时的占位 Skill（JSON 加载失败时用）
  const FALLBACK = {
    pay: { wx_qr: 'assets/pay-wx.png', ali_qr: '' },
    seller: { name: 'Global Safety Net 工坊', wx_name: '中圆(**峰)', email: 'hello@gsn.local' },
    skills: [
      { id: 'triage', name: '跨境工单分流器', domain: '④ 岗位 · ⑫ 互助',
        tagline: '多语工单按意图与情绪分流，先分对再谈快',
        price: 199, unit: '/月', currency: 'CNY', deliverable: 'npm 包 + 规则集',
        listed: true, version: '0.1' },
      { id: 'resume-card', name: '简历能力卡生成器', domain: '⑤ AI 档案',
        tagline: '非英语简历 → 可核验能力卡，不再卡在语言',
        price: 299, unit: '/次', currency: 'CNY', deliverable: '可分享能力卡 + PDF',
        listed: true, version: '0.1' },
      { id: 'sanction', name: '制裁名单变更哨兵', domain: '② 合规 · ⑯ RuleOS',
        tagline: '72 小时变更摘要与影响面，先看见再动手',
        price: 999, unit: '/月', currency: 'CNY', deliverable: 'API + 日摘要邮件',
        listed: true, version: '0.1' }
    ]
  };

  let SKILLS = FALLBACK.skills;
  let SELLER = FALLBACK.seller;
  let PAY = FALLBACK.pay;

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

  async function loadConfig() {
    try {
      const r = await fetch(cfgUrl, { cache: 'no-store' });
      if (!r.ok) throw new Error('config not ok');
      const data = await r.json();
      if (Array.isArray(data.skills) && data.skills.length) {
        SKILLS = data.skills.filter((s) => s.listed !== false);
        if (data.seller) SELLER = data.seller;
        if (data.pay) PAY = data.pay;
        const fresh = blank();
        Object.keys(state).forEach((k) => { if (fresh[k]) fresh[k] = state[k]; });
        Object.assign(state, fresh);
        save();
      }
    } catch { /* 用 FALLBACK */ }
    buildAll();
  }

  function buildAll() {
    grid.innerHTML = '';
    cards.clear();
    SKILLS.forEach(buildCard);
    render();
    window.setInterval(render, 450);
  }

  function hasWX() { return !!(PAY && PAY.wx_qr); }
  function hasALI() { return !!(PAY && PAY.ali_qr); }
  function qrUrl(path) {
    if (!path) return '';
    // 归一化到 safety-net 根，无论在哪个子目录下
    const normalized = path.startsWith('/') ? path : `/safety-net/${path.replace(/^\.\//, '')}`;
    return new URL(normalized, location.origin).href;
  }

  function buildCard(k) {
    const root = document.createElement('article');
    root.className = 'sk';
    root.dataset.id = k.id;
    root.innerHTML = `
      <div class="sk-h"><h3></h3><span class="pill">未铸造</span></div>
      <p class="sk-tag"></p>
      <p class="sk-tag sk-value"></p>
      <div class="sk-meta"><span>定价 <b></b></span><span>v${k.version || '0.1'} · 铸造约 3 秒</span></div>
      <div class="sk-bar"><em></em></div>
      <div class="sk-foot">
        <span class="sk-sales"></span>
        <div class="sk-actions">
          <button class="sk-buy mini" type="button">💰 真买</button>
          <button class="sk-btn accept" type="button">用 AI 铸造</button>
        </div>
      </div>`;
    root.querySelector('h3').textContent = k.name;
    root.querySelector('.sk-tag').textContent = k.domain;
    root.querySelector('.sk-value').textContent = k.tagline;
    root.querySelector('.sk-meta b').textContent = `¥${k.price}${k.unit}`;

    const buyBtn = root.querySelector('.sk-buy');
    buyBtn.addEventListener('click', () => openBuy(k));
    root.querySelector('.sk-btn').addEventListener('click', () => act(k));

    grid.appendChild(root);
    cards.set(k.id, { root, pill: root.querySelector('.pill'), bar: root.querySelector('em'),
      sales: root.querySelector('.sk-sales'), btn: root.querySelector('.sk-btn'), buyBtn });
  }

  function act(k) {
    const s = state[k.id];
    if (s.status === 'idle') {
      s.status = 'building';
      s.start = Date.now();
      render(); save();
      window.setTimeout(() => {
        render();
        const toast = $('skillToast');
        if (toast) toast.textContent = `「${k.name}」已过影子跑与人审 · 上架，等第一笔售出。`;
      }, BUILD_MS + 150);
    } else if (s.status === 'listed') {
      s.sales += 1;
      s.earned += k.price;
      render(); save();
      const toast = $('skillToast');
      if (toast) toast.textContent = `「${k.name}」售出（演示）· ¥${k.price} 已进托管。`;
    }
  }

  function openBuy(k) { showBuyPanel(k); }

  // ===== 购买弹窗：显示收款码，买家扫码付款 =====
  let panel = null;
  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'buy-mask';
    panel.innerHTML = `
      <div class="buy-panel" role="dialog" aria-modal="true" aria-labelledby="buy-title">
        <button class="buy-close" type="button" aria-label="关闭">×</button>
        <h3 id="buy-title"></h3>
        <p class="buy-price"></p>
        <p class="buy-deliver"></p>

        <div class="buy-qrs" id="buyQrs"></div>

        <p class="buy-seller" id="buySeller"></p>
        <ol class="buy-steps">
          <li>① 用微信扫上面的码，<b>¥价=Skill 定价</b>，备注 Skill 名称</li>
          <li>② 付款后点下方"我已付款"，填订单号/备注</li>
          <li>③ 卖家对账后 <span class="dim">(10 分钟内)</span> 把 Skill 交付到你</li>
        </ol>
        <div class="buy-actions">
          <button class="buy-paid" type="button">我已付款 → 提交订单</button>
          <button class="buy-close2" type="button">关闭</button>
        </div>
        <div class="buy-conf" id="buyConf" hidden>
          <input class="buy-input" type="text" id="buyOrder" placeholder="订单号 / 你付款的备注" maxlength="60">
          <button class="buy-submit" type="button">提交 →</button>
          <span class="buy-submit-ok" hidden>✓ 已记账。卖家看到订单号就发货。</span>
        </div>
      </div>`;
    document.body.appendChild(panel);
    panel.addEventListener('click', (e) => {
      if (e.target === panel || e.target.classList.contains('buy-close') || e.target.classList.contains('buy-close2')) hideBuyPanel();
    });
    panel.querySelector('.buy-paid').addEventListener('click', () => {
      panel.querySelector('#buyConf').hidden = false;
      panel.querySelector('#buyOrder').focus();
    });
    panel.querySelector('.buy-submit').addEventListener('click', submitOrder);
    return panel;
  }

  function showBuyPanel(k) {
    ensurePanel();
    panel.querySelector('#buy-title').textContent = k.name;
    panel.querySelector('.buy-price').textContent = `¥${k.price}${k.unit} · ${k.currency || 'CNY'}`;
    panel.querySelector('.buy-deliver').textContent = `交付：${k.deliverable || '见详情页'}`;
    panel.querySelector('#buySeller').textContent = `卖家：${SELLER.name || '工坊'}${SELLER.wx_name ? ` · 微信名 ${SELLER.wx_name}` : ''}`;
    panel.querySelector('#buyConf').hidden = true;
    panel.querySelector('.buy-submit-ok').hidden = true;
    panel.querySelector('#buyOrder').value = '';

    // 渲染收款码
    const qrs = panel.querySelector('#buyQrs');
    qrs.innerHTML = '';
    if (hasWX()) {
      qrs.appendChild(buildQrBlock('微信支付', qrUrl(PAY.wx_qr), 'wx'));
    }
    if (hasALI()) {
      qrs.appendChild(buildQrBlock('支付宝', qrUrl(PAY.ali_qr), 'ali'));
    }
    if (!hasWX() && !hasALI()) {
      qrs.innerHTML = `<p class="dim">卖家还没上传收款码。以后配置 <code>assets/skills-config.json</code> 的 <code>pay</code> 字段即可。</p>`;
    }

    panel.classList.add('on');
    panel.dataset.skillId = k.id;
    panel.dataset.price = k.price;
  }

  function buildQrBlock(label, src, cls) {
    const d = document.createElement('div');
    d.className = 'qr-block qr-' + cls;
    d.innerHTML = `<div class="qr-label">${label}</div>
      <div class="qr-img-wrap"><img class="qr-img" alt="${label}收款码"></div>
      <p class="dim" style="font-size:11px;margin:6px 0 0">长按保存，用微信扫一扫</p>`;
    const img = d.querySelector('.qr-img');
    img.src = src;
    img.onerror = () => { d.querySelector('.qr-img-wrap').textContent = '收款码加载失败'; };
    return d;
  }

  function submitOrder() {
    const orderNo = panel.querySelector('#buyOrder').value.trim();
    if (!orderNo) { panel.querySelector('#buyOrder').focus(); return; }
    const skillId = panel.dataset.skillId;
    const price = panel.dataset.price;
    const k = SKILLS.find((s) => s.id === skillId);
    const order = {
      id: 'ord_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      skill_id: skillId, skill_name: k ? k.name : skillId,
      price: Number(price) || 0,
      order_no: orderNo,
      paid_at: new Date().toISOString(),
      status: 'paid'
    };
    // 存到 localStorage（未来可接后端）
    let all = [];
    try { all = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch { all = []; }
    all.push(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
    panel.querySelector('.buy-submit-ok').hidden = false;
    panel.querySelector('.buy-conf input, .buy-conf button').forEach((el) => { el.disabled = true; });

    // 本地记一次售出
    const s = state[skillId];
    if (s && s.status === 'listed') { s.sales += 1; s.earned += (Number(price) || 0); save(); render(); }
  }

  function hideBuyPanel() { panel && panel.classList.remove('on'); }

  function render() {
    let listed = 0, sales = 0, earned = 0;
    const now = Date.now();

    SKILLS.forEach((k) => {
      const s = state[k.id];
      if (s.status === 'building' && now - s.start >= BUILD_MS) { s.status = 'listed'; save(); }
      const e = cards.get(k.id); if (!e) return;
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

      // 真买按钮：永远显示；有收款码就能真卖（不受"铸造"演示状态影响）
      const hasPay = hasWX() || hasALI();
      e.buyBtn.hidden = false;
      e.buyBtn.disabled = !hasPay;
      e.buyBtn.textContent = hasPay ? '💰 真买' : '💰 暂不可买（卖家未传码）';

      if (isListed) e.sales.textContent = `已售 ${s.sales} · 收入 ¥${s.earned}`;
      else if (isBuilding) e.sales.textContent = 'AI 起草中 · 上架后可立即售出';
      else e.sales.textContent = `在售 · 可立即下单${hasPay ? '' : ' (卖家待传收款码)'}`;
    });

    const sum = $('skillSum');
    if (sum) {
      const payTag = hasWX() ? ' · 🟢 微信已接真钱' : '';
      sum.textContent = `在售 ${SKILLS.length} 枚 · 累计售出 ${sales} 份 · 累计收入 ¥${earned}${payTag}`;
    }

    const hint = $('idleHint');
    if (hint && lastOrders) {
      if (lastOrders.open === 0 && listed < SKILLS.length) hint.textContent = '现在无单。正好用 AI 铸造一枚 Skill，上架去卖。';
      else if (lastOrders.open === 0) hint.textContent = '无单，但 Skill 都在架上。买家扫码即付，等第一笔真钱进账。';
      else hint.textContent = `现在有 ${lastOrders.open} 单在架，先接单；空档再铸造。`;
    }
  }

  document.addEventListener('gsn:orders', (ev) => { lastOrders = ev.detail; render(); });

  loadConfig();
})();
