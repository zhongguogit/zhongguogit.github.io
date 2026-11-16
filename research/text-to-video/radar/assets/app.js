/* T2V Lab — 前端逻辑（无依赖） */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    data: null,
    filter: 'all',
    query: '',
    lang: 'zh',
    history: []
  };

  const CAMERA_EN = {
    '固定': 'static locked-off shot',
    '推近': 'slow push-in, dolly in',
    '拉远': 'slow pull-back, dolly out',
    '左摇': 'pan left',
    '右摇': 'pan right',
    '跟拍': 'tracking shot',
    '环绕': 'orbit, arc shot',
    '升降': 'crane move',
    '手持': 'handheld camera',
    '航拍': 'drone aerial shot',
    '变焦': 'zoom in'
  };

  const SHOT_EN = {
    '大远景': 'extreme wide shot',
    '远景': 'wide shot',
    '全景': 'full shot',
    '中景': 'medium shot',
    '近景': 'close-up',
    '特写': 'extreme close-up',
    '低角度': 'low angle',
    '高角度': 'high angle',
    '俯视': 'top-down view'
  };

  const LIGHT_EN = {
    '黄金时刻': 'golden hour, warm sunlight',
    '蓝调时刻': 'blue hour, cool ambient light',
    '侧逆光': 'side backlight, rim light',
    '柔光': 'soft diffused light',
    '硬光': 'hard light, high contrast',
    '霓虹': 'neon glow, cyberpunk lighting',
    '烛光': 'candlelight, warm flicker',
    '阴天': 'overcast, flat daylight'
  };

  const MODEL_HINTS = {
    generic: 'cinematic, stable motion, no subtitles, no watermark',
    wan: '自然运动，主体结构稳定，无字幕，无水印',
    hunyuan: '镜头运动平滑，节奏完整，无字幕',
    ltx: 'Audio: ambient room tone and subtle foley, 音画同步',
    mochi: '真实物理运动，自然布料与流体，无明显形变',
    cogvideo: '属性绑定准确，多主体位置清晰，无字幕',
    runway: 'cinematic, clean frame, no subtitles, no watermark',
    veo: 'Audio: natural ambience and subtle foley, no music',
    kling: '面部稳定，手部自然，口型准确，无变形',
    seedance: '角色一致性，参考素材风格统一，无字幕'
  };

  const EXAMPLES = [
    {
      subject: '一只橘猫蹲在雨后的青石巷口',
      action: '缓慢抬头望向屋檐滴水',
      camera: '推近', shot: '近景', light: '侧逆光',
      style: '写实电影质感，35mm 胶片，浅景深',
      duration: '5', aspect: '16:9', model: 'wan'
    },
    {
      subject: '一位穿米色风衣的年轻女性站在城市天台',
      action: '风吹动衣角，她转头看向远方',
      camera: '环绕', shot: '中景', light: '蓝调时刻',
      style: '高端商业广告，干净背景，超清细节',
      duration: '8', aspect: '9:16', model: 'kling'
    },
    {
      subject: '雨后霓虹街道，一名撑黑伞的行人走过积水',
      action: '倒影随脚步碎裂，井盖升起白色蒸汽',
      camera: '跟拍', shot: '低角度', light: '霓虹',
      style: '赛博朋克，霓虹青品色，高对比',
      duration: '5', aspect: '21:9', model: 'runway'
    },
    {
      subject: '无人机掠过清晨的海岸悬崖',
      action: '云层缓慢流动，光束穿过薄雾',
      camera: '航拍', shot: '大远景', light: '黄金时刻',
      style: '写实电影质感，35mm 胶片，浅景深',
      duration: '10', aspect: '16:9', model: 'hunyuan'
    },
    {
      subject: '铸铁锅里翻滚的番茄炖菜',
      action: '热气升腾，木勺缓慢搅动酱汁',
      camera: '推近', shot: '特写', light: '柔光',
      style: '高端商业广告，干净背景，超清细节',
      duration: '5', aspect: '16:9', model: 'veo'
    },
    {
      subject: '墨水滴入清澈水中',
      action: '墨色从深蓝扩散为琥珀色，缓慢旋转',
      camera: '固定', shot: '特写', light: '柔光',
      style: '抽象实验影像，深色背景，高对比',
      duration: '3', aspect: '1:1', model: 'ltx'
    }
  ];

  const esc = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  /* ---------- 数据加载 ---------- */
  async function init() {
    try {
      const res = await fetch('data/models.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      state.data = await res.json();
    } catch (err) {
      $('#model-grid').innerHTML = '<p class="empty">无法加载 data/models.json。请通过本地 HTTP 服务打开（例如 python3 -m http.server 4173），而不是 file://。</p>';
      console.error(err);
      return;
    }

    renderStats();
    renderModels();
    initRadarControls();
    initStudio();
    initCost();
    initReveal();
    const updated = state.data.meta?.updated;
    if (updated) $('#last-updated').textContent = updated;
  }

  function renderStats() {
    const models = state.data.models || [];
    $('#stat-models').textContent = models.length;
    $('#stat-open').textContent = models.filter((m) => m.kind === 'open').length;
    $('#stat-sources').textContent = state.data.sources?.length || 0;
  }

  /* ---------- 模型雷达 ---------- */
  function firstNumber(text) {
    const m = String(text || '').match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  }

  function matchesFilter(model) {
    switch (state.filter) {
      case 'open': return model.kind === 'open';
      case 'commercial': return model.kind === 'commercial';
      case 'audio': return !!model.audio;
      case 'lowvram': {
        const n = firstNumber(model.vram);
        return model.kind === 'open' && n !== null && n <= 16;
      }
      case 'long': return model.maxDuration >= 10;
      default: return true;
    }
  }

  function matchesQuery(model) {
    if (!state.query) return true;
    const hay = [model.name, model.org, model.license, model.useCase, ...(model.tags || [])]
      .join(' ').toLowerCase();
    return hay.includes(state.query.toLowerCase());
  }

  function renderModels() {
    const grid = $('#model-grid');
    const list = state.data.models.filter((m) => matchesFilter(m) && matchesQuery(m));
    $('#model-empty').hidden = list.length > 0;

    grid.innerHTML = list.map((m) => {
      const badge = m.kind === 'open' ? 'OPEN' : 'API';
      const desc = m.strengths || m.useCase;
      const github = m.github
        ? `<a href="${esc(m.github)}" target="_blank" rel="noopener">GitHub ↗</a>`
        : '<span>闭源 API</span>';
      const stars = m.stars ? `★ ${Number(m.stars).toLocaleString()}` : '—';
      return `
        <article class="model-card" data-kind="${esc(m.kind)}">
          <div class="model-top">
            <div>
              <h3 class="model-name">${esc(m.name)}</h3>
              <p class="model-org">${esc(m.org)}</p>
            </div>
            <span class="model-badge ${esc(m.kind)}">${badge}</span>
          </div>
          <p class="model-desc">${esc(desc)}</p>
          <div class="model-specs">
            <div><span>显存</span><b>${esc(m.vram)}</b></div>
            <div><span>最长时长</span><b>${esc(m.maxDuration)} 秒</b></div>
            <div><span>最高分辨率</span><b>${esc(m.maxRes)}</b></div>
            <div><span>原生音频</span><b>${m.audio ? '支持' : '不支持'}</b></div>
          </div>
          <div class="model-tags">${(m.tags || []).slice(0, 4).map((t) => `<span>${esc(t)}</span>`).join('')}</div>
          <div class="model-foot">
            <span>${esc(m.license)}</span>
            <span>${stars}</span>
            ${github}
          </div>
        </article>`;
    }).join('');

    $$('.model-card', grid).forEach((card) => card.classList.add('visible'));
  }

  function initRadarControls() {
    $$('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        $$('.chip').forEach((c) => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        state.filter = chip.dataset.filter;
        renderModels();
      });
    });
    $('#model-search').addEventListener('input', (e) => {
      state.query = e.target.value.trim();
      renderModels();
    });
  }

  /* ---------- Prompt Studio ---------- */
  function initStudio() {
    loadHistory();
    $('#btn-generate').addEventListener('click', () => buildPrompt(true));
    $('#btn-example').addEventListener('click', nextExample);
    $('#btn-copy').addEventListener('click', copyPrompt);
    $('#btn-lang').addEventListener('click', () => {
      state.lang = state.lang === 'zh' ? 'en' : 'zh';
      $('#btn-lang').textContent = state.lang === 'zh' ? 'EN' : '中文';
      buildPrompt(false);
    });
    $('#prompt-form').addEventListener('submit', (e) => {
      e.preventDefault();
      buildPrompt(true);
    });
    $('#prompt-form').addEventListener('input', () => buildPrompt(false));
    buildPrompt(false);
  }

  function fieldValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function buildPrompt(save) {
    const v = {
      subject: fieldValue('f-subject').trim(),
      action: fieldValue('f-action').trim(),
      camera: fieldValue('f-camera'),
      shot: fieldValue('f-shot'),
      light: fieldValue('f-light'),
      style: fieldValue('f-style'),
      duration: fieldValue('f-duration'),
      aspect: fieldValue('f-aspect'),
      model: fieldValue('f-model')
    };
    const negative = fieldValue('f-negative').trim();
    const zh = state.lang === 'zh';

    const camera = zh ? v.camera : (CAMERA_EN[v.camera] || v.camera);
    const shot = zh ? v.shot : (SHOT_EN[v.shot] || v.shot);
    const light = zh ? v.light : (LIGHT_EN[v.light] || v.light);

    const parts = zh
      ? [
        v.subject,
        v.action,
        camera ? `镜头${camera}` : '',
        shot,
        light ? `${light}光线` : '',
        v.style,
        `${v.duration} 秒，${v.aspect}，24fps，画面稳定`,
        MODEL_HINTS[v.model] || MODEL_HINTS.generic
      ]
      : [
        v.subject,
        v.action,
        camera ? `camera: ${camera}` : '',
        shot,
        light ? `lighting: ${light}` : '',
        v.style,
        `${v.duration}s, ${v.aspect}, 24fps, stable motion`,
        MODEL_HINTS[v.model] || MODEL_HINTS.generic
      ];

    const prompt = parts.filter(Boolean).join(zh ? '；' : '; ');
    $('#prompt-output').textContent = prompt;
    $('#negative-output').textContent = negative || '（未填写）';
    $('#prompt-count').textContent = `${prompt.length} 字`;

    updateScore(v, negative, prompt);

    if (save && prompt) {
      addHistory(prompt, negative, v);
      toast('提示词已生成并保存到本地历史');
    }
  }

  function updateScore(v, negative, prompt) {
    const checks = [
      { label: '主体具体明确', ok: v.subject.length >= 2 },
      { label: '动作可被拍摄', ok: v.action.length >= 2 },
      { label: '指定一个主运镜', ok: !!v.camera },
      { label: '指定景别或机位', ok: !!v.shot },
      { label: '光线氛围明确', ok: !!v.light },
      { label: '风格锚点清晰', ok: !!v.style },
      { label: '包含负面提示词', ok: negative.length >= 8 },
      { label: '长度适中（20–160 字）', ok: prompt.length >= 20 && prompt.length <= 160 }
    ];
    const okCount = checks.filter((c) => c.ok).length;
    const score = Math.round((okCount / checks.length) * 100);

    $('#score-value').textContent = score;
    $('#score-ring').style.setProperty('--p', score);
    $('#score-checks').innerHTML = checks
      .map((c) => `<li class="${c.ok ? 'ok' : ''}">${c.label}</li>`)
      .join('');
  }

  let exampleIndex = -1;
  function nextExample() {
    exampleIndex = (exampleIndex + 1) % EXAMPLES.length;
    const ex = EXAMPLES[exampleIndex];
    $('#f-subject').value = ex.subject;
    $('#f-action').value = ex.action;
    $('#f-camera').value = ex.camera;
    $('#f-shot').value = ex.shot;
    $('#f-light').value = ex.light;
    $('#f-style').value = ex.style;
    $('#f-duration').value = ex.duration;
    $('#f-aspect').value = ex.aspect;
    $('#f-model').value = ex.model;
    buildPrompt(false);
    toast(`示例 ${exampleIndex + 1} / ${EXAMPLES.length}`);
  }

  async function copyPrompt() {
    const text = $('#prompt-output').textContent;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast('提示词已复制');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast('提示词已复制');
    }
  }

  const HISTORY_KEY = 't2v_prompt_history_v1';

  function loadHistory() {
    try {
      state.history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      state.history = [];
    }
    renderHistory();
  }

  function addHistory(prompt, negative, v) {
    state.history = state.history.filter((h) => h.prompt !== prompt);
    state.history.unshift({ prompt, negative, v, ts: Date.now() });
    state.history = state.history.slice(0, 6);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
    } catch { /* 忽略隐私模式下的写入失败 */ }
    renderHistory();
  }

  function renderHistory() {
    const box = $('#prompt-history');
    if (!state.history.length) {
      box.innerHTML = '<span class="history-empty">还没有记录。生成一次后会保存在本地浏览器。</span>';
      return;
    }
    box.innerHTML = state.history.map((h, i) => {
      const label = h.v?.subject ? h.v.subject.slice(0, 18) : h.prompt.slice(0, 18);
      return `<button type="button" data-index="${i}" title="${esc(h.prompt)}">${esc(label)}…</button>`;
    }).join('');
    $$('button', box).forEach((btn) => {
      btn.addEventListener('click', () => {
        const h = state.history[Number(btn.dataset.index)];
        if (!h) return;
        Object.entries(h.v).forEach(([key, val]) => {
          const el = document.getElementById('f-' + key);
          if (el) el.value = val;
        });
        $('#f-negative').value = h.negative || '';
        buildPrompt(false);
        toast('已恢复历史提示词');
      });
    });
  }

  /* ---------- 成本计算 ---------- */
  function initCost() {
    const pricing = state.data.pricing || [];
    $('#c-model').innerHTML = pricing.map((p) => `
      <option value="${esc(p.id)}"${p.id === 'runway-gen-4.5' ? ' selected' : ''}${p.disabled ? ' disabled' : ''}>
        ${esc(p.name)}${p.disabled ? '（已停止）' : ''}
      </option>`).join('');

    $('#c-model').addEventListener('change', () => {
      renderResolutions();
      calcCost();
    });
    $('#c-resolution').addEventListener('change', calcCost);
    $('#c-duration').addEventListener('change', calcCost);
    $('#c-count').addEventListener('input', () => {
      $('#c-count-label').textContent = $('#c-count').value;
      calcCost();
    });
    $('#c-fx').addEventListener('input', calcCost);

    renderResolutions();
    calcCost();
  }

  function currentPricing() {
    return (state.data.pricing || []).find((p) => p.id === $('#c-model').value);
  }

  function resLabel(r) {
    return r === '2160' ? '4K' : `${r}p`;
  }

  function renderResolutions() {
    const item = currentPricing();
    if (!item) return;
    const keys = Object.keys(item.rates);
    const previous = $('#c-resolution').value;
    $('#c-resolution').innerHTML = keys.map((k) =>
      `<option value="${k}"${k === previous ? ' selected' : ''}>${resLabel(k)}</option>`
    ).join('');
    if (!keys.includes(previous)) {
      const preferred = keys.includes('720') ? '720' : keys[0];
      $('#c-resolution').value = preferred;
    }
  }

  function calcCost() {
    const item = currentPricing();
    if (!item) return;
    const res = $('#c-resolution').value;
    const duration = Number($('#c-duration').value);
    const count = Number($('#c-count').value);
    const fx = Number($('#c-fx').value) || 7.2;
    const perSecond = item.rates[res];
    const per = perSecond * duration;
    const total = per * count;

    $('#cost-usd').textContent = `$${total.toFixed(2)}`;
    $('#cost-cny').textContent = `约 ¥${(total * fx).toFixed(2)}`;
    $('#cost-per').textContent = `$${per.toFixed(2)}`;
    $('#cost-seconds').textContent = `${duration * count} 秒`;

    if (item.creditsPerSecond) {
      const credits = item.creditsPerSecond * duration;
      const free = Math.floor(125 / credits);
      $('#cost-free').textContent = `约 ${free} 条（每条 ${credits} credits）`;
    } else {
      $('#cost-free').textContent = '—（非 Runway 模型）';
    }
    $('#cost-model-note').textContent = item.note || '';
  }

  /* ---------- 滚动出现 ---------- */
  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    const targets = $$('.section-head, .studio, .cost, .log-layout, .footer-top');
    targets.forEach((el) => el.classList.add('reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    targets.forEach((el) => io.observe(el));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
