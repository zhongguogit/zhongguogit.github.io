(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const promptEl = $("prompt");
  const btnGen = $("btnGen");
  const btnText = $("btnText");
  const btnEnhance = $("btnEnhance");

  // ═══════════════════════════════════════════════════════════
  // 平台配置 —— 以后发现新平台只改这里，加一行即可
  // tier: "primary" 主流平台  "fallback" 兜底
  // ═══════════════════════════════════════════════════════════
  const PROVIDERS = [
    { tier: "primary", emoji: "🎯", name: "即梦 AI",     meta: "字节 · Seedance 模型 · 每日约 60 积分",      url: "https://jimeng.jianying.com/" },
    { tier: "primary", emoji: "⚡", name: "可灵 AI",     meta: "快手 · 运动与运镜强 · 每日 66 灵感值",        url: "https://klingai.com/" },
    { tier: "primary", emoji: "🌊", name: "海螺 AI",     meta: "MiniMax · 注册 3000 积分 + 每日额度",          url: "https://hailuoai.com/" },
    { tier: "primary", emoji: "✨", name: "清影",        meta: "智谱 · CogVideoX · 免费无水印可商用",          url: "https://chatglm.cn/video" },
    { tier: "primary", emoji: "🌟", name: "通义万相",   meta: "阿里 · 万相 3.0 · 国内直连",                    url: "https://tongyi.aliyun.com/wan/" },
    { tier: "primary", emoji: "🎨", name: "Vidu",       meta: "生数 · 参考生视频 · 动漫强",                    url: "https://www.vidu.studio/" },

    // 兜底：前几个都出不了，就用这个
    { tier: "fallback", emoji: "🛟", name: "Pavo AI 网页版", meta: "粘贴提示词就能出视频", url: "https://app.pavo-ai.work/" }

    // ↓ 以后发现新平台，在下面追加：
    // { tier: "primary", emoji: "🔮", name: "新平台", meta: "简介", url: "https://..." },
  ];

  // ─── 状态 ───
  const state = { dur: "5", asp: "9:16", sty: "cinematic" };
  let currentPrompt = "";
  let genTimer = null;

  // ─── 风格词库 ───
  const STYLE_WORDS = {
    cinematic: "电影写实，35mm 胶片颗粒，浅景深，专业打光",
    anime: "日式动画风格，赛璐璐上色，干净线条，细腻表情",
    cyberpunk: "赛博朋克，霓虹，湿润反光，高对比，未来都市",
    ink: "中国水墨动画，留白与晕染，宣纸质感，诗意"
  };

  const CAMERA_WORDS = {
    default: "镜头缓慢推近，轻微手持跟随",
    wide: "广角，镜头缓慢上升并拉远"
  };

  // ─── 生成中动态文案 ───
  const GEN_STATES = [
    "正在让 AI 读懂你的画面…",
    "构建镜头运动轨迹…",
    "模拟光线与材质…",
    "渲染中，请勿关闭页面…",
    "快要好了…"
  ];

  // ─── 工具 ───
  function toast(msg, kind) {
    const el = $("toast");
    el.textContent = msg;
    el.className = "toast show" + (kind ? " " + kind : "");
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => el.className = "toast", 2600);
  }

  function copyText(text, doneMsg) {
    const done = () => toast(doneMsg || "已复制");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch { toast("复制失败，请手动选择", "err"); }
      document.body.removeChild(ta);
    }
  }

  // ─── 参数绑定 ───
  document.querySelectorAll(".seg").forEach((seg) => {
    const group = seg.dataset.g;
    seg.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-v]");
      if (!btn) return;
      seg.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      state[group] = btn.dataset.v;
    });
  });

  // ─── 快捷示例 ───
  document.querySelectorAll("#quickChips button").forEach((b) => {
    b.addEventListener("click", () => {
      promptEl.value = b.dataset.p;
      promptEl.focus();
    });
  });

  // ─── 润色提示词 ───
  btnEnhance.addEventListener("click", () => {
    const raw = promptEl.value.trim();
    if (!raw) { toast("先写点什么吧", "err"); return; }
    const enhanced = enhancePrompt(raw);
    promptEl.value = enhanced;
    toast("已润色：加了镜头、光线、风格");
  });

  function enhancePrompt(raw) {
    const sty = STYLE_WORDS[state.sty] || STYLE_WORDS.cinematic;
    const cam = CAMERA_WORDS.default;
    return `${raw}。${cam}，${sty}。时长 ${state.dur} 秒，${state.asp} 画幅。`;
  }

  // ─── compose 最终提示词 ───
  function composePrompt() {
    const raw = promptEl.value.trim();
    if (!raw) return "";
    return enhancePrompt(raw);
  }

  // ─── 生成主流程 ───
  btnGen.addEventListener("click", async () => {
    const prompt = composePrompt();
    if (!prompt) { toast("先写点画面描述吧", "err"); promptEl.focus(); return; }

    currentPrompt = prompt;
    copyText(prompt, "提示词已复制 ✓");

    showGenState();

    // 8 秒后展示结果
    let step = 0;
    const genText = $("genText");
    $("genEta").textContent = "约 8 秒";
    genText.textContent = GEN_STATES[0];

    const stepMs = 1600;
    const totalMs = 8000;
    let elapsed = 0;

    genTimer = window.setInterval(() => {
      step++;
      elapsed += stepMs;
      if (step < GEN_STATES.length) {
        genText.textContent = GEN_STATES[step];
        $("genEta").textContent = `约 ${Math.max(0, Math.ceil((totalMs - elapsed) / 1000))} 秒`;
      }
      if (elapsed >= totalMs) {
        window.clearInterval(genTimer);
        showResult();
      }
    }, stepMs);
  });

  function showGenState() {
    $("emptyState").hidden = true;
    $("resultState").hidden = true;
    $("genState").hidden = false;
    btnGen.disabled = true;
    btnText.textContent = "生成中…";
  }

  function showResult() {
    $("genState").hidden = true;
    $("resultState").hidden = false;
    btnGen.disabled = false;
    btnText.textContent = "生成视频";

    // 显示提示词
    $("resultPrompt").textContent = currentPrompt;

    // 启动 canvas 伪视频
    startFakeVideo();

    // 绑定结果按钮
    $("btnPavo").onclick = () => {
      copyText(currentPrompt, "提示词已复制 ✓");
      window.open("https://app.pavo-ai.work/", "_blank", "noopener");
      toast("兜底：已复制提示词，Pavo AI 已打开");
    };
    $("btnCopyPrompt").onclick = () => copyText(currentPrompt, "提示词已复制 ✓");
    $("btnRegen").onclick = () => {
      $("resultState").hidden = true;
      $("emptyState").hidden = false;
      promptEl.focus();
      stopFakeVideo();
    };
  }

  // ─── Canvas 伪视频 ───
  let fakeRAF = null;
  let fakeCanvas = null;

  function startFakeVideo() {
    stopFakeVideo();

    const wrap = $("resultPlaceholder");
    // 清掉可能存在的旧 canvas
    wrap.querySelectorAll("canvas").forEach((c) => c.remove());

    const canvas = document.createElement("canvas");
    canvas.id = "fakeCanvas";
    canvas.style.cssText = "width:100%;height:100%;display:block;object-fit:cover;";
    canvas.width = 720;
    canvas.height = 1280;
    // 插到 video 标签后面，overlay 前面
    const videoEl = $("demoVideo");
    wrap.insertBefore(canvas, videoEl.nextSibling);
    videoEl.style.display = "none";
    fakeCanvas = canvas;

    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    // 粒子
    const particles = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        r: Math.random() * 3 + 1,
        hue: 250 + Math.random() * 100
      });
    }

    let t = 0;
    function frame() {
      t += 0.016;
      // 渐变底
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, `hsl(${260 + Math.sin(t * 0.3) * 20}, 60%, 8%)`);
      g.addColorStop(0.5, `hsl(${290 + Math.sin(t * 0.4) * 20}, 50%, 10%)`);
      g.addColorStop(1, `hsl(${220 + Math.sin(t * 0.5) * 20}, 60%, 6%)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // 大光晕
      for (let i = 0; i < 3; i++) {
        const ox = W * (0.3 + Math.sin(t * 0.2 + i) * 0.2);
        const oy = H * (0.4 + Math.cos(t * 0.15 + i * 2) * 0.2);
        const rg = ctx.createRadialGradient(ox, oy, 0, ox, oy, 400);
        const hue = [280, 320, 210][i];
        rg.addColorStop(0, `hsla(${hue}, 80%, 50%, 0.25)`);
        rg.addColorStop(1, `hsla(${hue}, 80%, 50%, 0)`);
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);
      }

      // 粒子
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, 0.6)`;
        ctx.fill();
      });

      // 扫描线
      const sy = (t * 80) % H;
      const lg = ctx.createLinearGradient(0, sy - 30, 0, sy + 30);
      lg.addColorStop(0, "rgba(167, 139, 250, 0)");
      lg.addColorStop(0.5, "rgba(167, 139, 250, 0.3)");
      lg.addColorStop(1, "rgba(167, 139, 250, 0)");
      ctx.fillStyle = lg;
      ctx.fillRect(0, sy - 30, W, 60);

      // 暗角
      const vg = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, W);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      fakeRAF = requestAnimationFrame(frame);
    }
    frame();
  }

  function stopFakeVideo() {
    if (fakeRAF) { cancelAnimationFrame(fakeRAF); fakeRAF = null; }
    if (fakeCanvas && fakeCanvas.parentNode) fakeCanvas.remove();
    fakeCanvas = null;
    const v = $("demoVideo");
    if (v) v.style.display = "block";
  }

  // ─── 渲染平台列表（从 PROVIDERS 数组生成） ───
  function renderProviders() {
    const grid = $("providerGrid");
    if (!grid) return;
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    // 主流平台
    const primary = PROVIDERS.filter((p) => p.tier === "primary");
    const fallback = PROVIDERS.filter((p) => p.tier === "fallback");

    const cards = primary.map((p) =>
      '<a class="p-card" href="' + esc(p.url) + '" target="_blank" rel="noopener">' +
      '<span class="p-emoji">' + esc(p.emoji) + '</span>' +
      '<strong>' + esc(p.name) + '</strong>' +
      '<span class="p-meta">' + esc(p.meta) + '</span>' +
      '</a>'
    ).join("");

    // 兜底区域（独立成一个大卡，视觉上拉开差距）
    let fallbackHtml = "";
    if (fallback.length) {
      fallbackHtml =
        '<div class="fallback" style="grid-column:1/-1">' +
        '<div class="fb-badge">' +
        '<span class="fb-tag">PLAN B · 兜底</span>' +
        '<span class="fb-line"></span>' +
        '</div>' +
        fallback.map((p) =>
          '<a class="p-card pavo" href="' + esc(p.url) + '" target="_blank" rel="noopener">' +
          '<span class="p-emoji">' + esc(p.emoji) + '</span>' +
          '<strong>' + esc(p.name) + '</strong>' +
          '<span class="p-meta">' + esc(p.meta) + '</span>' +
          '<span class="pavo-arrow">打开 →</span>' +
          '</a>'
        ).join("") +
        '</div>';
    }

    grid.innerHTML = cards + fallbackHtml;
  }

  // ─── 初始化 ───
  renderProviders();
  promptEl.focus();
})();
