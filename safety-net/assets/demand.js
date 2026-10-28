// Global Safety Net — 需求雷达：下一秒全球需求预测 → 命中 → AI 组队 → 立即接单
(() => {
  'use strict';
  const board = document.getElementById('board');
  if (!board) return;

  const $ = (id) => document.getElementById(id);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TICK_MS = 2500;
  const KEY = 'gsn.radar.v1';
  const TRIGGER = 68;
  const OPEN_TICKS = 12; // 命中后订单在架窗口（30 秒）

  const STAGE_PILL = {
    pending: '已接单 · 待双签',
    active: '在制 · 排期中',
    building: '在制 · 生产中',
    delivered: '已交付 · 已回灌',
    iterating: '迭代中'
  };
  const STAGE_GATE = {
    pending: '已进队列 · 等持牌/合规官双签后开工',
    active: '已进生产队列 · 里程碑由预算格托管',
    building: '团队并行开发 · 每日构建可回放',
    delivered: '交付完成 · 偏差回灌评测集',
    iterating: '下一版迭代 · 锚层不动，卡原样在'
  };
  const STAGE_FEED = {
    pending: '已接单 · 待双签',
    active: '双签通过 · 排期中',
    building: '生产中 · 团队并行',
    delivered: '已交付 · 回灌评测',
    iterating: '迭代下一版'
  };

  const DEMANDS = [
    { id: 'support', name: '跨境多语客服工作台', region: '东南亚 ↔ 欧洲', domain: '④ 岗位 · ⑫ 互助',
      why: '裁员潮后跨境工单三倍', base: 62, vol: 5.2, days: 14, budget: 128000, risk: 'low',
      roles: [['前端', 1], ['后端', 1], ['数据', 1], ['QA', 1]] },
    { id: 'resume', name: '多语简历解析与能力卡', region: '全球', domain: '⑤ AI 档案',
      why: '非英语简历进不了岗位池', base: 57, vol: 6.5, days: 18, budget: 168000, risk: 'low',
      roles: [['ML', 1], ['后端', 1], ['前端', 1]] },
    { id: 'psi', name: '隐私求交去重服务', region: '欧盟 · 印尼', domain: '⑥ 全局去重',
      why: '跨基金会重复领，谁都不能看名单', base: 54, vol: 5.8, days: 26, budget: 260000, risk: 'high',
      roles: [['后端', 2], ['密码学', 1], ['运维', 1]] },
    { id: 'ruleos', name: '合规规则引擎（制裁/驻留）', region: '全球 3 法域', domain: '② 合规 · ⑯ RuleOS',
      why: '新制裁名单 72 小时内要入库', base: 65, vol: 5.0, days: 21, budget: 220000, risk: 'high',
      roles: [['规则工程', 2], ['后端', 1], ['合规', 1], ['测试', 1]] },
    { id: 'care', name: '情绪急救陪伴（只陪十分钟）', region: '全球', domain: '⑫ 互助 · ⑲ 大厅',
      why: '面试前一晚的无人接听', base: 56, vol: 7.2, days: 12, budget: 96000, risk: 'mid',
      roles: [['前端', 1], ['后端', 1], ['社工', 1]] },
    { id: 'retrain', name: '岗位再培训任务图谱', region: '拉美 · 中东', domain: '④ 岗位 · ⑲ 大厅',
      why: '产业迁移后技能对不上', base: 60, vol: 6.0, days: 24, budget: 192000, risk: 'low',
      roles: [['数据', 1], ['内容', 1], ['前端', 1], ['后端', 1]] }
  ];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const round = (v) => Math.round(v);

  /* ── 持久化 ── */
  const blank = () => ({
    tick: 0,
    open: {},     // id -> { created, expires }
    inprod: {},   // id -> { at, status }
    metrics: { matches: 0, warns: 0, falseAlarms: 0, leadSum: 0, leadCount: 0 },
    feed: []      // { tick, id, name, region, type, status }
  });
  const load = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!raw || typeof raw.tick !== 'number') return blank();
      return Object.assign(blank(), raw, {
        metrics: Object.assign(blank().metrics, raw.metrics || {})
      });
    } catch { return blank(); }
  };
  const save = () => {
    try {
      const { tick, open, inprod, metrics, feed } = state;
      localStorage.setItem(KEY, JSON.stringify({ tick, open, inprod, metrics, feed: feed.slice(0, 12) }));
    } catch { /* 隐私模式忽略 */ }
  };

  const state = load();
  Object.keys(state.open).forEach((id) => {
    if (!DEMANDS.some((d) => d.id === id) || state.open[id].expires <= state.tick) delete state.open[id];
  });
  const runtime = new Map(); // id -> { hist, trend, last, fc, lead, els }

  const forecast = (hist) => {
    let L = hist[0], T = 0;
    for (let i = 1; i < hist.length; i++) {
      const prevL = L;
      L = 0.55 * hist[i] + 0.45 * (L + T);
      T = 0.35 * (L - prevL) + 0.65 * T;
    }
    const pred = clamp(L + T, 0, 100);
    const diffs = [];
    for (let i = 1; i < hist.length; i++) diffs.push(hist[i] - hist[i - 1]);
    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const variance = diffs.reduce((a, b) => a + (b - mean) ** 2, 0) / diffs.length;
    const sigma = Math.sqrt(variance);
    const conf = clamp(0.9 - sigma / 36 + Math.min(0.06, Math.abs(T) / 120), 0.32, 0.96);
    return { pred, sigma, conf };
  };

  /* ── 建卡 ── */
  const cards = new Map();
  DEMANDS.forEach((d) => {
    const root = document.createElement('article');
    root.className = 'dc';
    root.innerHTML = `
      <div class="dc-h"><h3></h3><span class="pill">捕捉中</span></div>
      <p class="dc-tag"></p>
      <p class="dc-why"></p>
      <div class="figrow">
        <div class="big"><span class="k">预测下一秒</span><b class="pred">–</b><span class="u">/100</span></div>
        <div class="big"><span class="k">现实</span><b class="real">–</b></div>
        <div class="conf"><span class="k">置信</span><i><em></em></i><span class="pct">–</span></div>
      </div>
      <svg class="spark" viewBox="0 0 300 66" preserveAspectRatio="none" aria-hidden="true">
        <line class="grid-l" x1="0" y1="16" x2="300" y2="16"></line>
        <line class="grid-l" x1="0" y1="33" x2="300" y2="33"></line>
        <line class="grid-l" x1="0" y1="50" x2="300" y2="50"></line>
        <line class="trigger" x1="0" x2="300"></line>
        <polyline class="line"></polyline>
        <line class="fc-line" x1="0" x2="300"></line>
        <circle class="dot" r="2.6"></circle>
      </svg>
      <div class="team" hidden>
        <div class="roles"></div>
        <div class="order"><span class="sum"></span><button class="accept" type="button">立即接单</button></div>
        <p class="gate"></p>
      </div>`;
    root.querySelector('h3').textContent = d.name;
    root.querySelector('.dc-tag').textContent = `${d.region} · ${d.domain}`;
    root.querySelector('.dc-why').textContent = d.why;
    board.appendChild(root);

    const els = {
      root,
      pill: root.querySelector('.pill'),
      pred: root.querySelector('.pred'),
      real: root.querySelector('.real'),
      em: root.querySelector('em'),
      pct: root.querySelector('.pct'),
      line: root.querySelector('.line'),
      predLine: root.querySelector('.fc-line'),
      trigger: root.querySelector('.trigger'),
      dot: root.querySelector('.dot'),
      team: root.querySelector('.team'),
      roles: root.querySelector('.roles'),
      sum: root.querySelector('.sum'),
      accept: root.querySelector('.accept'),
      gate: root.querySelector('.gate')
    };
    els.trigger.setAttribute('y1', yOf(TRIGGER));
    els.trigger.setAttribute('y2', yOf(TRIGGER));

    els.roles.replaceChildren();
    d.roles.forEach(([role, n]) => {
      const chip = document.createElement('span');
      chip.className = 'role';
      chip.textContent = `${role} ×${n}`;
      els.roles.appendChild(chip);
    });
    const size = d.roles.reduce((a, [, n]) => a + n, 0);
    els.sum.textContent = `团队 ${size} 人 · ${d.days} 天 · 预算格 ¥${(d.budget / 10000).toFixed(1)} 万`;

    if (d.risk === 'high') {
      els.gate.textContent = '红线域 · 需持牌/合规官双签后放行 · AI 不自动派单';
      els.gate.classList.add('hi');
    } else if (d.risk === 'mid') {
      els.gate.textContent = '中危 · 域负责人复核，预算格不超阈';
    } else {
      els.gate.textContent = '低危 · AI 起草排期，人签刀口那一下';
    }

    els.accept.addEventListener('click', () => accept(d));

    cards.set(d.id, els);
    runtime.set(d.id, { hist: seed(d), trend: 0, last: d.base, fc: { pred: d.base, sigma: 4, conf: 0.6 }, lead: 0 });
  });

  function yOf(v) { return clamp(62 - (v / 100) * 58, 4, 62); }

  function seed(d) {
    const hist = [];
    let v = d.base + (Math.random() - 0.5) * d.vol * 2;
    for (let i = 0; i < 12; i++) {
      v = clamp(v + (Math.random() - 0.5) * d.vol * 1.6, 30, 100);
      hist.push(v);
    }
    return hist;
  }

  /* ── 一拍 ── */
  const tick = (silent) => {
    state.tick++;
    const now = state.tick;

    DEMANDS.forEach((d) => {
      const r = runtime.get(d.id);
      const fc = forecast(r.hist);

      const noise = (Math.random() - 0.5) * 2 * d.vol;
      const shock = Math.random() < 0.15 ? 9 + Math.random() * 18 : 0;
      const actual = clamp(d.base + r.trend + noise + shock, 28, 100);
      r.trend = r.trend * 0.72 + (actual - r.last) * 0.2;
      r.last = actual;
      r.fc = fc;

      const predHigh = fc.pred >= TRIGGER && fc.conf >= 0.5;
      const hit = actual >= TRIGGER && Math.abs(actual - fc.pred) <= fc.sigma * 1.5 + 4 && fc.conf >= 0.55;
      const falseAlarm = predHigh && actual < TRIGGER;

      if (predHigh) {
        state.metrics.warns++;
        r.lead++;
      }
      if (falseAlarm) state.metrics.falseAlarms++;

      if (hit) {
        state.metrics.matches++;
        state.metrics.leadSum += Math.max(1, r.lead);
        state.metrics.leadCount++;
        r.lead = 0;
        if (!state.open[d.id] && !state.inprod[d.id]) {
          state.open[d.id] = { created: now, expires: now + OPEN_TICKS };
          pushFeed({ tick: now, id: d.id, name: d.name, region: d.region, type: 'match' });
        }
      }

      r.hist.push(actual);
      if (r.hist.length > 14) r.hist.shift();
    });

    // 过期订单下架
    Object.keys(state.open).forEach((id) => {
      if (now > state.open[id].expires) delete state.open[id];
    });

    // 已接单订单走完“排期 → 生产 → 交付 → 迭代”
    DEMANDS.forEach((d) => {
      const p = state.inprod[d.id];
      if (!p) return;
      const age = now - p.at;
      let next = p.status;
      if (p.status === 'pending' && age >= 3) next = 'active';
      else if (p.status === 'active' && age >= 6) next = 'building';
      else if (p.status === 'building' && age >= 9) next = 'delivered';
      else if (p.status === 'delivered' && age >= 12) next = 'iterating';
      if (next !== p.status) {
        p.status = next;
        pushFeed({ tick: now, id: d.id, name: d.name, region: d.region, type: 'stage', status: next });
      }
    });

    if (!silent) {
      renderAll();
      save();
    }
  };

  const pushFeed = (ev) => {
    state.feed.unshift(ev);
    if (state.feed.length > 12) state.feed.pop();
  };

  /* ── 接单 ── */
  function accept(d) {
    const open = state.open[d.id];
    if (!open) return;
    const status = d.risk === 'high' ? 'pending' : 'active';
    state.inprod[d.id] = { at: state.tick, status };
    delete state.open[d.id];
    pushFeed({ tick: state.tick, id: d.id, name: d.name, region: d.region, type: 'accept', status });
    renderAll();
    save();
  }

  /* ── 渲染 ── */
  function renderAll() {
    DEMANDS.forEach((d) => {
      const r = runtime.get(d.id);
      const e = cards.get(d.id);
      const open = state.open[d.id];
      const prod = state.inprod[d.id];
      const fc = r.fc;
      const real = r.hist[r.hist.length - 1];

      e.pred.textContent = round(fc.pred);
      e.real.textContent = round(real);
      e.em.style.width = `${round(fc.conf * 100)}%`;
      e.pct.textContent = `${round(fc.conf * 100)}%`;

      let cls = 'pill';
      let text = '捕捉中';
      if (prod) { cls += ' done'; text = STAGE_PILL[prod.status] || '在制'; }
      else if (open) { cls += ' match'; text = '命中 · 可接单'; }
      else if (fc.pred >= TRIGGER && fc.conf >= 0.5) { cls += ' warn'; text = '预测高热'; }
      e.pill.className = cls;
      e.pill.textContent = text;

      e.root.classList.toggle('hot', !!open);
      e.root.classList.toggle('accepted', !!prod);

      // 团队面板
      if (open || prod) {
        e.team.hidden = false;
        e.accept.disabled = !!prod;
        if (prod) {
          e.accept.textContent = STAGE_PILL[prod.status] || '已接单';
          e.gate.textContent = STAGE_GATE[prod.status] || '已进生产队列 · 里程碑由预算格托管';
          e.gate.classList.toggle('hi', prod.status === 'pending');
        } else {
          e.accept.textContent = '立即接单';
          e.gate.textContent = d.risk === 'high'
            ? `窗口剩 ${Math.max(0, open.expires - state.tick)} 拍 · 接单后转人工双签`
            : `窗口剩 ${Math.max(0, open.expires - state.tick)} 拍 · 资金走持牌托管`;
          e.gate.classList.toggle('hi', d.risk === 'high');
        }
      } else {
        e.team.hidden = true;
      }

      drawSpark(e, r.hist, fc.pred);
    });

    // 顶部
    const openCount = Object.keys(state.open).length;
    const prodCount = Object.keys(state.inprod).length;
    const m = state.metrics;
    $('tick').textContent = `第 ${state.tick} 拍`;
    $('hit').textContent = `命中 ${m.matches} / 高危预测 ${m.warns}`;
    $('orders').textContent = `可接单 ${openCount} · 在制 ${prodCount}`;
    document.dispatchEvent(new CustomEvent('gsn:orders', { detail: { open: openCount, prod: prodCount } }));

    const avgLead = m.leadCount ? (m.leadSum / m.leadCount) : 0;
    const falseRate = m.warns ? (m.falseAlarms / m.warns) * 100 : 0;
    const delivered = Object.values(state.inprod).filter((p) => p.status === 'delivered' || p.status === 'iterating').length;
    const tiles = [
      ['命中次数', m.matches, '单'],
      ['平均提前', avgLead.toFixed(1), '拍'],
      ['误报率', falseRate.toFixed(0), '%'],
      ['已交付', delivered, '单']
    ];
    const metrics = $('metrics');
    metrics.replaceChildren();
    tiles.forEach(([k, v, u]) => {
      const box = document.createElement('div');
      box.className = 'metric';
      const kk = document.createElement('span');
      kk.className = 'k';
      kk.textContent = k;
      const vv = document.createElement('span');
      vv.className = 'v';
      vv.textContent = v;
      const uu = document.createElement('span');
      uu.className = 'u';
      uu.textContent = u;
      box.append(kk, vv, uu);
      metrics.appendChild(box);
    });

    renderFeed();
  }

  function drawSpark(e, hist, pred) {
    const n = hist.length;
    const pts = hist.map((v, i) => `${(i / (n - 1)) * 300},${yOf(v)}`).join(' ');
    e.line.setAttribute('points', pts);
    e.predLine.setAttribute('y1', yOf(pred));
    e.predLine.setAttribute('y2', yOf(pred));
    e.dot.setAttribute('cx', 300);
    e.dot.setAttribute('cy', yOf(hist[n - 1]));
  }

  function renderFeed() {
    const feed = $('feed');
    const empty = $('feedEmpty');
    if (!feed) return;
    feed.replaceChildren();
    if (!state.feed.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    state.feed.slice(0, 8).forEach((ev) => {
      const li = document.createElement('li');
      const t = document.createElement('span');
      t.className = 't';
      t.textContent = `第 ${ev.tick} 拍`;
      const name = document.createElement('b');
      name.textContent = ev.name;
      const region = document.createElement('span');
      region.textContent = ev.region;
      const tag = document.createElement('span');
      tag.className = 'ok';
      if (ev.type === 'match') tag.textContent = '命中 · 已组队，可接单';
      else if (ev.type === 'accept') tag.textContent = ev.status === 'pending' ? '已接单 · 待双签' : '已接单 · 进入排期';
      else tag.textContent = STAGE_FEED[ev.status] || '状态更新';
      li.append(t, name, region, tag);
      feed.appendChild(li);
    });
  }

  /* ── 时钟 ── */
  const clock = () => {
    const el = $('clock');
    if (!el) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    el.textContent = `全球 24/7 · ${hh}:${mm}:${ss}`;
  };

  /* ── 循环与控制 ── */
  let paused = false;
  let timer = null;

  const start = () => {
    if (timer) return;
    timer = setInterval(() => { if (!paused) tick(false); }, TICK_MS);
  };
  const stop = () => { clearInterval(timer); timer = null; };

  $('pauseBtn').addEventListener('click', (e) => {
    paused = !paused;
    e.currentTarget.textContent = paused ? '继续' : '暂停';
    const dot = document.querySelector('.live-dot');
    if (dot) dot.classList.toggle('paused', paused);
  });
  $('stepBtn').addEventListener('click', () => { tick(false); });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !paused) {
      const missed = Math.min(60, Math.floor((Date.now() - hiddenAt) / TICK_MS));
      for (let i = 0; i < missed; i++) tick(true);
      if (missed) { renderAll(); save(); }
      clock();
    } else {
      hiddenAt = Date.now();
    }
  });
  let hiddenAt = Date.now();

  /* ── 启动：先预热，保证“下一秒就有单可接” ── */
  if (reduce.matches) {
    paused = true;
    $('pauseBtn').textContent = '继续';
    document.querySelector('.live-dot')?.classList.add('paused');
  }
  renderAll();
  let warm = 0;
  while (warm < 8 && Object.keys(state.open).length === 0 && Object.keys(state.inprod).length === 0) {
    tick(true);
    warm++;
  }
  renderAll();
  save();
  start();
  clock();
  setInterval(clock, 1000);
})();
