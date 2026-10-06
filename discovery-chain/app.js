// 发现接龙 - 主应用
// 共享存储：Supabase（与百万博主共用项目）；兜底：LocalStorage
// 功能：提交 AI 免费额度渠道、列表展示、点赞、分类筛选、搜索、接龙序号

const CATEGORIES = ["全部", "文生视频", "文生图", "文本对话", "编程开发", "音乐音频", "数字人", "3D建模", "其他"];
const CAT_ICON = { "文生视频": "🎬", "文生图": "🖼️", "文本对话": "💬", "编程开发": "💻", "音乐音频": "🎵", "数字人": "🧑‍🎤", "3D建模": "🧊", "其他": "✨" };

// 与 million/index.html 共用同一 Supabase 项目
const SUPABASE_URL = 'https://dnqswjrevffwdcksnwan.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_O23O8vd8DYWDBoydPjl9LA_uYGspSHC';

const STORAGE_KEY = 'discovery_chain_entries';
const VOTED_KEY = 'discovery_chain_voted';
const DATA_VERSION = 3; // 数据结构版本号，变更时递增以强制重新播种

const APP = {
  supabase: null,
  useSupabase: false,
  entries: [],
  voted: new Set(),
  state: { category: "全部", sort: "newest", query: "" }
};

// ===== 预置种子数据（已发现的 AI 免费额度渠道）=====
const SEED = [
  { title: "即梦 AI", url: "https://jimeng.jianying.com", category: "文生视频", free_quota: "每天约 60 积分，约 10 次生成", submitter: "站长", verified: true, tags: ["国内","Seedance"],
    flow: [
      { action: "打开 jimeng.jianying.com", desc: "点击右上角「登录」，用手机号验证码登录", tip: "首次登录自动赠送积分" },
      { action: "点击「AI 视频」", desc: "首页顶栏切换到视频创作页", tip: "" },
      { action: "选择「文生视频」", desc: "在左侧模式中选「文生视频」", tip: "" },
      { action: "输入提示词", desc: "描述你想要的画面，如「一只猫在草地上奔跑」", tip: "越具体效果越好" },
      { action: "选 5秒 / 720P", desc: "用免费档参数，点「生成」", tip: "5秒约消耗 6 积分" },
      { action: "等待生成 → 下载", desc: "生成完成后点右下角下载图标", tip: "每天积分次日刷新" }
    ] },
  { title: "可灵 AI", url: "https://klingai.com", category: "文生视频", free_quota: "每天 66 灵感值，约 6 条 5 秒视频", submitter: "站长", verified: true, tags: ["国内","快手"],
    flow: [
      { action: "打开 klingai.com", desc: "点「登录」，手机号验证码登录", tip: "" },
      { action: "进入「创作」页", desc: "点击顶部「创作」按钮", tip: "" },
      { action: "选「文生视频」", desc: "左侧选择文生视频模式", tip: "" },
      { action: "输入提示词 + 选参数", desc: "填描述，时长选 5s，比例按需", tip: "5s 标准模式 = 11 灵感值" },
      { action: "点「生成」", desc: "确认后提交，队列等待", tip: "" },
      { action: "下载视频", desc: "完成后在「我的作品」下载", tip: "灵感值每日 0 点刷新" }
    ] },
  { title: "AI Video Maker", url: "https://aivideomaker.ai/zh/ai-video-generator", category: "文生视频", free_quota: "永久免费 · 无限次生成 · 无需积分", submitter: "热心网友", verified: true, tags: ["国际","MiniMax","永久免费"],
    flow: [
      { action: "打开 aivideomaker.ai/zh/ai-video-generator", desc: "直接进入生成页，无需注册登录", tip: "永久免费无积分限制" },
      { action: "输入提示词", desc: "在提示词框输入视频描述", tip: "支持中英文" },
      { action: "选 MiniMax H3 480P", desc: "模型选 H3，分辨率 480P 为免费档", tip: "高分辨率需付费" },
      { action: "选 5秒 + 16:9", desc: "时长 5 秒，比例按需", tip: "" },
      { action: "点「生成」", desc: "进入共享队列，免费用户稍慢", tip: "可同时生成多个" },
      { action: "下载视频", desc: "生成完成直接点下载", tip: "无限次，无水印" }
    ] },
  { title: "清影", url: "https://chatglm.cn/video", category: "文生视频", free_quota: "不限量免费 · 无水印 · 可商用", submitter: "站长", verified: true, tags: ["国内","智谱"],
    flow: [
      { action: "打开 chatglm.cn/video", desc: "用手机号注册/登录智谱清言", tip: "完全免费" },
      { action: "进入「清影」", desc: "在功能中找到 AI 视频「清影」", tip: "" },
      { action: "输入文字描述", desc: "写一段视频创意描述", tip: "" },
      { action: "选风格", desc: "可选卡通3D、黑白、油画、电影感等", tip: "" },
      { action: "点生成", desc: "约 30 秒生成 5-6 秒视频", tip: "自带背景音乐" },
      { action: "下载", desc: "直接保存，无水印可商用", tip: "" }
    ] },
  { title: "海螺 AI", url: "https://hailuoai.com", category: "文生视频", free_quota: "新用户送 3000 积分，每日免费生成", submitter: "站长", verified: true, tags: ["国内","MiniMax"] },
  { title: "Vidu", url: "https://www.vidu.studio", category: "文生视频", free_quota: "每天约 10 次免费生成", submitter: "站长", verified: true, tags: ["国内","生数科技"] },
  { title: "通义万相", url: "https://tongyi.aliyun.com/wan/", category: "文生视频", free_quota: "免费计划，每日签到领灵感值", submitter: "站长", verified: true, tags: ["国内","阿里"] },
  { title: "混元 AI 视频", url: "https://aivideo.hunyuan.tencent.com/", category: "文生视频", free_quota: "免费文生视频体验", submitter: "站长", verified: true, tags: ["国内","腾讯"] },
  { title: "Google Veo", url: "https://aistudio.google.com", category: "文生视频", free_quota: "每天约 3 次免费，1080p 无水印", submitter: "站长", verified: true, tags: ["国际","Google"] },
  { title: "PixVerse", url: "https://pixverse.ai", category: "文生视频", free_quota: "注册送 90 积分 + 每天 60 积分", submitter: "站长", verified: true, tags: ["国际"] },
  { title: "Dreamina (Seedance)", url: "https://dreamina.capcut.com", category: "文生视频", free_quota: "每日免费积分，1080p 无水印", submitter: "站长", verified: true, tags: ["国际","字节"] },
];

// ===== Supabase 初始化 =====
function initSupabase() {
  if (window.supabase) {
    APP.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    setTimeout(initSupabase, 100);
  }
}

// ===== 数据加载 =====
async function loadEntries() {
  setStatus("正在加载接龙…");
  // 优先尝试 Supabase
  if (APP.supabase) {
    try {
      const { data, error } = await APP.supabase.from('discovery_chain').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        APP.entries = data.map(normalizeEntry);
        APP.useSupabase = true;
        setStatus("🌐 共享模式（数据实时同步）");
        return;
      }
      // 表不存在等错误 → 降级
    } catch (e) { console.warn("Supabase 加载失败，使用本地模式", e); }
  }
  // LocalStorage 兜底
  APP.useSupabase = false;
  const storedVersion = localStorage.getItem(STORAGE_KEY + "_v");
  const needReseed = storedVersion !== String(DATA_VERSION);
  if (needReseed) {
    // 版本不匹配，重新播种（保留用户的提交记录可在此扩展合并，此处简化为重置）
    APP.entries = SEED.map((s, i) => ({ ...s, id: "seed-" + i, upvotes: 0, created_at: new Date(Date.now() - i * 1000).toISOString() }));
    saveLocal();
    localStorage.setItem(STORAGE_KEY + "_v", String(DATA_VERSION));
  } else {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { APP.entries = JSON.parse(raw); } catch { APP.entries = []; }
    }
    if (!APP.entries.length) {
      APP.entries = SEED.map((s, i) => ({ ...s, id: "seed-" + i, upvotes: 0, created_at: new Date(Date.now() - i * 1000).toISOString() }));
      saveLocal();
    }
  }
  setStatus("💾 本地模式（提交仅保存在本浏览器，执行 setup.sql 可开启共享）");
}

function normalizeEntry(e) {
  return {
    id: e.id,
    title: e.title,
    url: e.url,
    category: e.category || "其他",
    free_quota: e.free_quota || "",
    tags: e.tags || [],
    submitter: e.submitter || "匿名",
    upvotes: e.upvotes || 0,
    verified: !!e.verified,
    note: e.note || "",
    flow: Array.isArray(e.flow) ? e.flow : [],
    created_at: e.created_at || new Date().toISOString()
  };
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(APP.entries));
}

// ===== 提交新发现 =====
async function submitEntry(form) {
  // 收集流程图步骤
  const flowRows = form.querySelectorAll(".flow-row");
  const flow = [];
  flowRows.forEach(row => {
    const action = row.querySelector("[name=flow_action]").value.trim();
    const desc = row.querySelector("[name=flow_desc]").value.trim();
    const tip = row.querySelector("[name=flow_tip]").value.trim();
    if (action) flow.push({ action, desc, tip });
  });
  const entry = {
    title: form.title.value.trim(),
    url: form.url.value.trim(),
    category: form.category.value,
    free_quota: form.free_quota.value.trim(),
    tags: form.tags.value.split(/[,，\s]+/).filter(Boolean).slice(0, 6),
    submitter: form.submitter.value.trim() || "匿名",
    note: form.note.value.trim(),
    flow
  };
  if (!entry.title || !entry.url) { toast("请填写名称和网址"); return false; }
  if (!/^https?:\/\//.test(entry.url)) { toast("网址需以 http:// 或 https:// 开头"); return false; }

  if (APP.useSupabase && APP.supabase) {
    try {
      const { data, error } = await APP.supabase.from('discovery_chain').insert(entry).select().single();
      if (error) throw error;
      APP.entries.unshift(normalizeEntry(data));
      toast("🎉 接龙成功！已同步到共享榜");
    } catch (e) {
      toast("提交失败：" + (e.message || "未知错误"));
      return false;
    }
  } else {
    const e = { ...entry, id: "local-" + Date.now(), upvotes: 0, verified: false, flow, created_at: new Date().toISOString() };
    APP.entries.unshift(e);
    saveLocal();
    toast("💾 已保存到本地（共享模式需执行 setup.sql）");
  }
  renderEntries();
  return true;
}

// ===== 点赞 =====
async function upvote(id) {
  if (APP.voted.has(id)) { toast("你已经赞过啦"); return; }
  const entry = APP.entries.find(e => e.id === id);
  if (!entry) return;
  entry.upvotes = (entry.upvotes || 0) + 1;
  APP.voted.add(id);
  localStorage.setItem(VOTED_KEY, JSON.stringify([...APP.voted]));

  if (APP.useSupabase && APP.supabase) {
    try {
      await APP.supabase.from('discovery_chain').update({ upvotes: entry.upvotes }).eq('id', id);
    } catch (e) { console.warn(e); }
  } else {
    saveLocal();
  }
  renderEntries();
}

// ===== 渲染 =====
function setStatus(text) {
  const el = document.getElementById("mode-status");
  if (el) el.textContent = text;
}

function filteredSorted() {
  let arr = APP.entries.slice();
  if (APP.state.category !== "全部") arr = arr.filter(e => e.category === APP.state.category);
  if (APP.state.query) {
    const q = APP.state.query.toLowerCase();
    arr = arr.filter(e =>
      e.title.toLowerCase().includes(q) ||
      (e.free_quota || "").toLowerCase().includes(q) ||
      (e.tags || []).some(t => t.toLowerCase().includes(q)) ||
      e.url.toLowerCase().includes(q)
    );
  }
  if (APP.state.sort === "hot") arr.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
  else arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return arr;
}

function timeAgo(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "刚刚";
  if (diff < 3600) return Math.floor(diff / 60) + " 分钟前";
  if (diff < 86400) return Math.floor(diff / 3600) + " 小时前";
  return Math.floor(diff / 86400) + " 天前";
}

function renderEntries() {
  const arr = filteredSorted();
  const grid = document.getElementById("chain-grid");
  document.getElementById("count").textContent = arr.length;
  if (!arr.length) {
    grid.innerHTML = '<div class="empty">暂无发现，快来接龙第一个吧 ✨</div>';
    return;
  }
  grid.innerHTML = arr.map((e, i) => {
    const icon = CAT_ICON[e.category] || "✨";
    const tags = (e.tags || []).map(t => `<span class="tag">${t}</span>`).join("");
    const voted = APP.voted.has(e.id);
    const chainNo = (APP.state.sort === "hot" ? i + 1 : arr.length - i);
    const hasFlow = e.flow && e.flow.length > 0;
    const flowHtml = hasFlow ? `
      <div class="flow-wrap">
        <button class="flow-toggle" data-toggle="${e.id}">
          🚀 最省时间点击流程图（${e.flow.length} 步）<span class="arrow">▾</span>
        </button>
        <ol class="flow-timeline" id="flow-${e.id}">
          ${e.flow.map((s, si) => `
            <li class="flow-step">
              <div class="flow-num">${si + 1}</div>
              <div class="flow-body">
                <div class="flow-action">${s.action}</div>
                ${s.desc ? `<div class="flow-desc">${s.desc}</div>` : ''}
                ${s.tip ? `<div class="flow-tip">💡 ${s.tip}</div>` : ''}
              </div>
            </li>`).join("")}
        </ol>
      </div>` : '';
    return `
    <article class="chain-card">
      <div class="chain-no">#${chainNo}</div>
      <div class="chain-head">
        <div class="chain-icon">${icon}</div>
        <div class="chain-title-wrap">
          <h3 class="chain-title">
            <a href="${e.url}" target="_blank" rel="noopener">${e.title}</a>
            ${e.verified ? '<span class="verified">✓ 已验证</span>' : ''}
          </h3>
          <div class="chain-meta">
            <span class="cat-badge">${e.category}</span>
            <span class="submitter">@${e.submitter}</span>
            <span class="time">${timeAgo(e.created_at)}</span>
          </div>
        </div>
      </div>
      <div class="quota">🆓 ${e.free_quota || '暂无额度说明'}</div>
      ${e.note ? `<div class="note">📝 ${e.note}</div>` : ''}
      ${tags ? `<div class="tags">${tags}</div>` : ''}
      ${flowHtml}
      <div class="chain-foot">
        <a class="visit" href="${e.url}" target="_blank" rel="noopener">直达使用 →</a>
        <button class="upvote ${voted ? 'voted' : ''}" data-id="${e.id}">
          👍 <span>${e.upvotes || 0}</span>
        </button>
      </div>
    </article>`;
  }).join("");
  grid.querySelectorAll("[data-id]").forEach(btn => {
    btn.onclick = () => upvote(btn.dataset.id);
  });
  grid.querySelectorAll("[data-toggle]").forEach(btn => {
    btn.onclick = () => {
      const tl = document.getElementById("flow-" + btn.dataset.toggle);
      const open = tl.classList.toggle("open");
      btn.querySelector(".arrow").textContent = open ? "▴" : "▾";
    };
  });
}

// ===== 流程图步骤构建器 =====
function addFlowRow(action = "", desc = "", tip = "") {
  const wrap = document.getElementById("flow-builder");
  const row = document.createElement("div");
  row.className = "flow-row";
  row.innerHTML = `
    <input name="flow_action" placeholder="操作，如：点击「文生视频」" value="${action}">
    <input name="flow_desc" placeholder="详细说明" value="${desc}">
    <input name="flow_tip" placeholder="省钱/省时小贴士（可选）" value="${tip}">
    <button type="button" class="flow-del" title="删除此步">✕</button>`;
  row.querySelector(".flow-del").onclick = () => {
    if (wrap.children.length > 1) row.remove(); else { row.querySelectorAll("input").forEach(i => i.value = ""); }
  };
  wrap.appendChild(row);
}

// ===== 表单与筛选 =====
function bindForm() {
  const form = document.getElementById("submit-form");
  // 初始化一行空步骤
  addFlowRow();
  document.getElementById("add-flow-step").onclick = () => addFlowRow();

  form.onsubmit = async (e) => {
    e.preventDefault();
    // 登录后才能接龙提交
    if(!SiteAuth.isLoggedIn()){
      SiteAuth.requireLogin(()=>{ /* 登录成功后用户重新点提交即可 */ });
      return;
    }
    const user = SiteAuth.getUser();
    const submitterInput = form.querySelector('input[name=submitter]');
    if(submitterInput && !submitterInput.value.trim()) submitterInput.value = user.username;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "提交中…";
    const ok = await submitEntry(form);
    btn.disabled = false; btn.textContent = "🐉 接龙发布";
    if (ok) {
      form.reset();
      document.getElementById("flow-builder").innerHTML = "";
      addFlowRow();
    }
  };
}

function bindFilters() {
  const catSel = document.getElementById("filter-cat");
  catSel.innerHTML = CATEGORIES.map(c => `<option value="${c}" ${c === APP.state.category ? 'selected' : ''}>${c}</option>`).join("");
  catSel.onchange = () => { APP.state.category = catSel.value; renderEntries(); };

  document.getElementById("sort").onchange = (e) => { APP.state.sort = e.target.value; renderEntries(); };

  let t;
  document.getElementById("search").addEventListener("input", (e) => {
    clearTimeout(t);
    APP.state.query = e.target.value;
    t = setTimeout(renderEntries, 250);
  });
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

// ===== 初始化 =====
async function init() {
  try { APP.voted = new Set(JSON.parse(localStorage.getItem(VOTED_KEY) || "[]")); } catch {}
  bindForm();
  bindFilters();
  initSupabase();
  await loadEntries();
  renderEntries();
  // 注册 PWA
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}

document.addEventListener("DOMContentLoaded", init);
