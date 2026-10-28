// Global Safety Net — landing interactions
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const quiz = $('#quiz');
  const story = $('#story');
  if (!quiz) return;

  const KEY = 'gsn.card.v1';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* 隐私模式忽略 */ } }
  };

  // 镜像流：三题 → 生成“为你”的故事
  const steps = [
    { q: '你在哪座城？', opts: [
      ['雅加达', { who: '雅加达的你', get: '一份能投的跨境客服简历', miss: '离职证明的雇主盖章件', net: 'Bima，做过三年跨境工单，说：这版试音我帮你听。' }],
      ['柏林',   { who: '柏林的你', get: '一张德国劳工局的资格预检单', miss: '过去 12 个月的社保记录', net: 'Marco，从纺织转到仓配调度，说：我懂你卡在哪。' }],
      ['国内某城', { who: '这座城的你', get: '一份“我还能干什么”的路径图', miss: '参保记录或离职证明任一份', net: '一位同城老手已经把附近三份资源标亮了。' }]
    ]},
    { q: '过去最久的那份活儿，是哪种？', opts: [
      ['做过手艺 / 产线', { get2: '一条“技能可迁移”的通道，比如质检→远程标注' }],
      ['坐过办公室 / 客服', { get2: '一份英文试音 + 三封可抄的投递话术' }],
      ['零工 / 刚出来', { get2: '先领一张匿名卡，今晚的资源格子现在就亮' }]
    ]},
    { q: '现在最卡的是哪一口？', opts: [
      ['差一份材料，不知道找谁', { miss2: '这份材料，已经帮你写好申请草稿了' }],
      ['简历没人回', { miss2: '简历改写格：15 分钟，改完直接投' }],
      ['心里发沉，不想说话', { miss2: '先不用说话。同城有个“只陪十分钟”的人，你点一下才亮' }]
    ]}
  ];

  let i = 0;
  const pick = { get: '', miss: '', net: '' };

  function render() {
    if (i >= steps.length) { finish(); return; }
    const s = steps[i];
    const el = document.createElement('div');
    el.className = 'q-step';
    el.innerHTML = `<p>${i + 1}/3　${s.q}</p>
      <div class="q-opt">${s.opts.map(([t], k) =>
        `<button type="button" data-k="${k}">${t}</button>`).join('')}</div>`;
    quiz.replaceChildren(el);
    el.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        const { who, get, miss, net, get2, miss2 } = s.opts[+b.dataset.k][1];
        if (who) pick.who = who;
        if (get) pick.get = get;
        if (miss) pick.miss = miss;
        if (net) pick.net = net;
        if (get2) pick.get = get2;
        if (miss2) pick.miss = miss2;
        i++;
        render();
      });
    });
  }

  function finish() {
    quiz.style.display = 'none';
    $('#s-who').textContent = pick.who || '你';
    $('#s-get').textContent = pick.get || '—';
    $('#s-miss').textContent = pick.miss || '—';
    $('#s-net').textContent = pick.net || '一位走过同一条路的人说：我来带。';
    story.hidden = false;
    story.focus({ preventScroll: true });
    story.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'center' });

    // 卡面火苗生长
    const bars = { skill: 46, job: 30, trust: 58 };
    if (reduce.matches) {
      Object.entries(bars).forEach(([k, v]) => {
        const el = document.querySelector(`[data-bar="${k}"]`);
        if (el) el.style.setProperty('--w', v + '%');
      });
    } else {
      requestAnimationFrame(() => {
        document.querySelectorAll('[data-bar]').forEach(b => {
          setTimeout(() => b.style.setProperty('--w', bars[b.dataset.bar] + '%'), 250);
        });
      });
    }
    restoreClaim();
  }

  function restoreClaim() {
    const claimed = store.get().claimed;
    if (claimed) markClaimed();
  }

  function markClaimed() {
    const b = $('#claimBtn');
    if (!b) return;
    b.textContent = '卡已亮起来 ◈　它一直在，随时回来';
    b.disabled = true;
    b.style.background = '#4f9a6a';
    b.style.color = '#0d1f16';
  }

  $('#startBtn').addEventListener('click', () => {
    i = 0;
    quiz.style.display = '';
    story.hidden = true;
    pick.who = pick.get = pick.miss = pick.net = '';
    render();
    document.getElementById('mirror').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  $('#claimBtn').addEventListener('click', (e) => {
    if (e.currentTarget.disabled) return;
    store.set({ claimed: true });
    markClaimed();
    const card = document.querySelector('.card-pop');
    if (card && !reduce.matches && card.animate) {
      card.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.045)' }, { transform: 'scale(1)' }],
        { duration: 520 });
    }
  });

  $('#frontierBtn').addEventListener('click', () => { window.location.href = 'hall/'; });

  restoreClaim();
  render();
})();
