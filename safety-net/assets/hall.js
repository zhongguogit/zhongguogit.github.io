// Global Safety Net — 学习大厅 / 开荒地图（进度本地持久化）
(() => {
  'use strict';
  const KEY = 'gsn.hall.v1';
  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
  };
  const save = (v) => {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* 隐私模式忽略 */ }
  };
  const state = Object.assign({ lessons: [], frontiers: [] }, load());

  const LESSONS = [
    { t: '🎯 临场补给', name: '3 分钟看懂你这张卡', m: '15 分钟', do: '把自己的仪表盘点开，看差哪一份材料' },
    { t: '🎯 临场补给', name: '试音 90 秒（照着念一遍）', m: '15 分钟', do: '录一段投递出去，算真正“学过”' },
    { t: '🛠️ 手艺进阶', name: '从纺织到远程质检', m: '带作品 3 天', do: '交一份模拟工单答卷，解锁岗位池' }
  ];
  const FRONTIERS = [
    { h: '面试前一晚 · 情绪急救包', s: '最烫 · 高频无人接', m: 'HOT', st: 'hot',
      p: '现有课只教话术，没人管“今晚睡不着”这一格。只做 15 分钟降焦虑+微准备，不碰诊疗。',
      a: '占这格', note: '先画边界：它不做什么，比做什么重要。' },
    { h: '我到底还能干什么', s: '能力翻译器 · 空缺中', m: '开荒', st: '',
      p: '不是测评。是把你十年的手艺，翻成别国雇主看得懂的三种活法。', a: '给这片起个名' },
    { h: '跨境那一格：雅加达 → 柏林', s: '需要懂两地规则的人', m: '开荒', st: '',
      p: '能力怎么“翻译”成当地人认的凭证？中间这段没人铺过。', a: '举手共建' },
    { h: '被拒 30 次之后', s: '情绪断层带', m: '开荒', st: '',
      p: '第 8 次没回音和第 30 次之间，人不是懒，是断了。这一格只接这一段。', a: '先只写一句开场' },
    { h: '无证件者的合法上岗通路', s: '红线旁 · 需持证守护', m: '高合规', st: 'hot',
      p: '最疼也最值钱。你只能当“问题定义者”，守护者+本地持牌方必须挂上。', a: '看边界（不许 solo）' },
    { h: '简历改写器 · 首发版', s: '已成域 · 312 人过关', m: '已长成', st: 'grown',
      p: '这片曾经空着。现在它是入口第一格。新来的第一个动作，就是它。', a: '进阶：带新人' }
  ];

  /* tabs */
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = Array.from(document.querySelectorAll('.panel'));
  const activate = (tab) => {
    tabs.forEach(t => {
      const on = t === tab;
      t.classList.toggle('on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(p => p.classList.toggle('on', p.id === tab.dataset.t));
  };
  tabs.forEach((t, k) => {
    t.addEventListener('click', () => activate(t));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      let n = k;
      if (e.key === 'ArrowRight') n = (k + 1) % tabs.length;
      if (e.key === 'ArrowLeft') n = (k - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') n = 0;
      if (e.key === 'End') n = tabs.length - 1;
      activate(tabs[n]);
      tabs[n].focus();
    });
  });

  /* lessons */
  const LC = document.getElementById('lessons');
  const doneMsg = document.getElementById('doneMsg');

  const renderL = () => {
    LC.replaceChildren();
    const frag = document.createDocumentFragment();

    LESSONS.forEach((l, idx) => {
      const done = !!state.lessons[idx];
      const el = document.createElement('div');
      el.className = 'lc' + (done ? ' done' : '');

      const track = document.createElement('div');
      track.className = 'track';
      track.textContent = l.t;

      const h3 = document.createElement('h3');
      h3.textContent = l.name;

      const meta = document.createElement('div');
      meta.className = 'do';

      const left = document.createElement('span');
      left.className = 'mins';
      left.textContent = done ? '✓ 已落地 · 事件已入账' : `⏱ ${l.m} · ${l.do}`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = done ? '再看一遍' : '接这一格';
      btn.disabled = done;
      btn.addEventListener('click', () => {
        state.lessons[idx] = true;
        save(state);
        if (!done && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && el.animate) {
          el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 420 });
        }
        setTimeout(renderL, 260);
        if (LESSONS.every((_, i) => state.lessons[i])) {
          doneMsg.hidden = false;
          doneMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      meta.append(left, btn);
      el.append(track, h3, meta);
      frag.appendChild(el);
    });

    LC.appendChild(frag);
    doneMsg.hidden = !LESSONS.every((_, i) => state.lessons[i]);
  };
  renderL();

  /* frontiers */
  const FM = document.getElementById('frontiers');
  FRONTIERS.forEach((f, idx) => {
    const claimed = !!state.frontiers[idx];
    const el = document.createElement('div');
    el.className = 'fg ' + f.st;

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = f.m;

    const h3 = document.createElement('h3');
    h3.textContent = f.h;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = f.s;

    const p = document.createElement('p');
    p.textContent = f.p;

    const act = document.createElement('div');
    act.className = 'act';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = claimed ? `${f.a}（已占）` : f.a;
    btn.disabled = claimed;

    const note = document.createElement('span');
    note.className = 'note';
    note.textContent = f.note || '';

    btn.addEventListener('click', () => {
      state.frontiers[idx] = true;
      save(state);
      btn.textContent = '🜂 这格记你名下了 · 位子等你画';
      btn.disabled = true;
      el.style.transition = '.3s';
      el.style.background = 'rgba(232,163,61,.16)';
      setTimeout(() => { btn.textContent = `${f.a}（已占）`; }, 1200);
    });

    act.append(btn);
    if (note.textContent) act.appendChild(note);
    el.append(badge, h3, meta, p, act);
    FM.appendChild(el);
  });
})();
