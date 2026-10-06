// 日结活 AI - 主应用
// 技术栈：Transformers.js v4（浏览器端多语言语义嵌入 + WebGPU）+ 纯 JS 兜底评分 + PWA

const APP = {
  jobs: window.JOB_DB || [],
  embedder: null,
  embeddingsReady: false,
  jobEmbeddings: new Map(),
  profile: { skills: [], location: "上海", maxDistance: 99, minPay: 0, immediateOnly: false },
  favorites: new Set(),
  applied: new Set(),
  state: { query: "", type: "all", sort: "match" },
  DISTRICTS: ["浦东","杨浦","徐汇","静安","黄浦","闵行","普陀","长宁","虹口","宝山","松江","青浦","全市","远程"],
  TYPES: ["全部","仓储物流","餐饮服务","配送外卖","活动展会","装修建筑","教育培训","推广销售","影视演出","IT互联网","设计创意","家政服务","交通出行","市场调研","新媒体","安保物业","生活服务"]
};

// ===== 持久化 =====
function loadStorage() {
  try {
    const fav = localStorage.getItem("dj_favorites");
    if (fav) APP.favorites = new Set(JSON.parse(fav));
    const app = localStorage.getItem("dj_applied");
    if (app) APP.applied = new Set(JSON.parse(app));
    const prof = localStorage.getItem("dj_profile");
    if (prof) APP.profile = { ...APP.profile, ...JSON.parse(prof) };
  } catch(e) {}
}
function saveFavorites() { localStorage.setItem("dj_favorites", JSON.stringify([...APP.favorites])); }
function saveApplied() { localStorage.setItem("dj_applied", JSON.stringify([...APP.applied])); }
function saveProfile() { localStorage.setItem("dj_profile", JSON.stringify(APP.profile)); }

// ===== AI 嵌入（Transformers.js）=====
async function initAI() {
  try {
    setStatus("AI 模型加载中（首次约需下载 120MB，之后缓存）…", true);
    const { pipeline } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3");
    APP.embedder = await pipeline("feature-extraction", "Xenova/paraphrase-multilingual-MiniLM-L12-v2", {
      dtype: "fp32", device: "wasm"
    });
    APP.embeddingsReady = true;
    setStatus("✓ AI 语义匹配已就绪", false);
    // 预计算职位嵌入
    setStatus("正在为职位建立语义索引…", true);
    for (const job of APP.jobs) {
      const text = jobText(job);
      APP.jobEmbeddings.set(job.id, await embed(text));
    }
    setStatus("✓ AI 语义匹配已就绪", false);
    if (APP.state.query) renderResults();
  } catch (e) {
    console.warn("AI 模型加载失败，使用智能关键词匹配：", e);
    APP.embeddingsReady = false;
    setStatus("AI 模型未加载，已切换至智能关键词匹配", false);
  }
}

async function embed(text) {
  if (!APP.embedder) return null;
  const out = await APP.embedder(text, { pooling: "mean", normalize: true });
  return Array.from(out.data);
}

function cosineSim(a, b) {
  if (!a || !b) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

function jobText(job) {
  return [job.title, job.company, job.type, job.description, job.skills.join(" "), job.tags.join(" ")].join(" ");
}

// ===== 纯 JS 兜底评分（无需模型）=====
function keywordScore(query, job) {
  const q = query.toLowerCase();
  const text = jobText(job).toLowerCase();
  let score = 0;
  const qWords = q.split(/[\s,，、]+/).filter(Boolean);
  for (const w of qWords) {
    if (w.length < 2) continue;
    if (text.includes(w)) score += 1;
    for (const s of job.skills) { if (s.toLowerCase().includes(w)) score += 0.8; }
    if (job.title.toLowerCase().includes(w)) score += 1.5;
  }
  // 画像匹配加分
  for (const ps of APP.profile.skills) {
    if (job.skills.some(s => s.includes(ps) || ps.includes(s))) score += 0.5;
  }
  return score;
}

// ===== 综合评分与解释 =====
async function scoreJobs(query) {
  const q = query.trim();
  const results = [];
  let qVec = null;
  if (APP.embeddingsReady && q) {
    qVec = await embed(q);
  }
  for (const job of APP.jobs) {
    let semantic = 0;
    if (qVec) {
      const jVec = APP.jobEmbeddings.get(job.id);
      semantic = cosineSim(qVec, jVec);
    }
    const kw = keywordScore(q, job);
    // 归一化：语义 0-1，关键词归一
    const kwNorm = Math.min(kw / 8, 1);
    const match = q ? (semantic * 0.7 + kwNorm * 0.3) : (kwNorm * 0.5 + 0.5);
    // 画像/偏好加成
    let bonus = 0, reasons = [];
    if (APP.profile.skills.length) {
      const matched = job.skills.filter(s => APP.profile.skills.some(ps => s.includes(ps) || ps.includes(s)));
      if (matched.length) { bonus += matched.length * 0.04; reasons.push(`技能匹配: ${matched.slice(0,2).join("、")}`); }
    }
    if (APP.profile.minPay && job.pay >= APP.profile.minPay) { bonus += 0.03; reasons.push(`薪资≥${APP.profile.minPay}`); }
    if (APP.profile.immediateOnly && job.immediate) { bonus += 0.02; reasons.push("立即可上岗"); }
    if (APP.profile.location && job.location.includes(APP.profile.location)) { bonus += 0.02; reasons.push(`地点在${APP.profile.location}`); }
    const finalScore = Math.min(match + bonus, 1);
    results.push({ job, score: finalScore, semantic, reasons });
  }
  return results;
}

// ===== 过滤 =====
function filterJobs(results) {
  return results.filter(r => {
    if (APP.state.type !== "all" && r.job.type !== APP.state.type) return false;
    if (APP.profile.immediateOnly && !r.job.immediate) return false;
    if (APP.profile.minPay && r.job.pay < APP.profile.minPay) return false;
    return true;
  });
}

function sortResults(arr) {
  if (APP.state.sort === "pay") arr.sort((a,b) => b.job.pay - a.job.pay);
  else if (APP.state.sort === "rating") arr.sort((a,b) => b.job.rating - a.job.rating);
  else arr.sort((a,b) => b.score - a.score);
  return arr;
}

// ===== 渲染 =====
function setStatus(text, loading) {
  const el = document.getElementById("ai-status");
  if (el) {
    el.textContent = text;
    el.className = "ai-status" + (loading ? " loading" : "") + (text.includes("✓") ? " ok" : "");
  }
}

function renderJobCard(r) {
  const j = r.job;
  const isFav = APP.favorites.has(j.id);
  const isApplied = APP.applied.has(j.id);
  const scorePct = Math.round(r.score * 100);
  const reasonsHtml = r.reasons.length ? `<div class="reasons">${r.reasons.map(x=>`<span class="reason">✓ ${x}</span>`).join("")}</div>` : "";
  return `
  <article class="job-card" data-id="${j.id}">
    <div class="job-top">
      <div class="job-title">${j.title}</div>
      <button class="fav-btn ${isFav?'active':''}" data-fav="${j.id}" aria-label="收藏">${isFav?'★':'☆'}</button>
    </div>
    <div class="job-company">${j.company}</div>
    <div class="job-meta">
      <span class="pay">💰 ${j.pay} ${j.payUnit}</span>
      <span class="loc">📍 ${j.location}</span>
      <span class="dur">⏱ ${j.duration}小时</span>
      <span class="rating">⭐ ${j.rating}</span>
    </div>
    <div class="job-desc">${j.description}</div>
    <div class="job-skills">
      ${j.skills.map(s=>`<span class="skill">${s}</span>`).join("")}
      ${j.immediate ? `<span class="tag urgent">立即可上岗</span>` : ""}
    </div>
    <div class="match-bar">
      <div class="match-fill" style="width:${scorePct}%"></div>
      <span class="match-label">AI 匹配度 ${scorePct}%</span>
    </div>
    ${reasonsHtml}
    <div class="job-actions">
      <button class="btn-apply ${isApplied?'done':''}" data-apply="${j.id}">${isApplied?'已报名 ✓':'一键报名'}</button>
    </div>
  </article>`;
}

async function renderResults() {
  const grid = document.getElementById("job-grid");
  grid.innerHTML = '<div class="loading">正在匹配…</div>';
  const scored = await scoreJobs(APP.state.query);
  const filtered = filterJobs(scored);
  const sorted = sortResults(filtered);
  if (!sorted.length) {
    grid.innerHTML = '<div class="empty">没有匹配的日结活，试试调整筛选条件或搜索关键词</div>';
    return;
  }
  grid.innerHTML = sorted.map(renderJobCard).join("");
  bindCardEvents();
  document.getElementById("count").textContent = sorted.length;
}

function bindCardEvents() {
  document.querySelectorAll("[data-fav]").forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const id = +btn.dataset.fav;
      if (APP.favorites.has(id)) APP.favorites.delete(id); else APP.favorites.add(id);
      saveFavorites();
      renderResults();
    };
  });
  document.querySelectorAll("[data-apply]").forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const id = +btn.dataset.apply;
      if (APP.applied.has(id)) return;
      APP.applied.add(id);
      saveApplied();
      toast("报名成功！雇主将尽快联系你");
      renderResults();
    };
  });
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2200);
}

// ===== 画像 =====
function renderProfile() {
  const panel = document.getElementById("profile-panel");
  panel.innerHTML = `
    <h3>我的画像</h3>
    <label>常居地
      <select id="prof-loc">
        ${["上海","北京","广州","深圳","杭州","成都","远程"].map(c=>`<option ${APP.profile.location===c?'selected':''}>${c}</option>`).join("")}
      </select>
    </label>
    <label>最低日薪（元）
      <input type="number" id="prof-minpay" value="${APP.profile.minPay}" placeholder="0">
    </label>
    <label>我的技能（逗号分隔）
      <input type="text" id="prof-skills" value="${APP.profile.skills.join("，")}" placeholder="如：分拣, 骑电动车, PS">
    </label>
    <label class="check"><input type="checkbox" id="prof-imm" ${APP.profile.immediateOnly?'checked':''}> 只看立即可上岗</label>
    <button class="btn-save" id="save-profile">保存画像</button>
  `;
  document.getElementById("save-profile").onclick = () => {
    APP.profile.location = document.getElementById("prof-loc").value;
    APP.profile.minPay = +document.getElementById("prof-minpay").value || 0;
    APP.profile.skills = document.getElementById("prof-skills").value.split(/[,，\s]+/).filter(Boolean);
    APP.profile.immediateOnly = document.getElementById("prof-imm").checked;
    saveProfile();
    toast("画像已保存，推荐已更新");
    renderResults();
  };
}

// ===== 筛选 =====
function renderFilters() {
  const sel = document.getElementById("filter-type");
  sel.innerHTML = APP.TYPES.map(t=>`<option value="${t==='全部'?'all':t}" ${APP.state.type===(t==='全部'?'all':t)?'selected':''}>${t}</option>`).join("");
  sel.onchange = () => { APP.state.type = sel.value; renderResults(); };
  document.getElementById("sort").onchange = (e) => { APP.state.sort = e.target.value; renderResults(); };
  document.getElementById("fav-only").onchange = (e) => { APP.favOnly = e.target.checked; renderFavFilter(); };
}

function renderFavFilter() {
  // 简单处理：收藏过滤在 renderResults 内通过标记
  if (APP.favOnly) {
    const cards = document.querySelectorAll(".job-card");
    cards.forEach(c => {
      const id = +c.dataset.id;
      c.style.display = APP.favorites.has(id) ? "" : "none";
    });
  }
}

// ===== 搜索 =====
let searchTimer;
function bindSearch() {
  const input = document.getElementById("search");
  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    APP.state.query = input.value;
    searchTimer = setTimeout(renderResults, 300);
  });
}

// ===== 初始化 =====
async function init() {
  loadStorage();
  bindSearch();
  renderFilters();
  renderProfile();
  renderResults();
  // PWA
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
  // 启动 AI（后台）
  initAI();
}

document.addEventListener("DOMContentLoaded", init);
