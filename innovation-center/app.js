// 科创中心 - 主应用
// 模块：项目大厅、生存计算器、资源对接、政策红利、创客社区
// 存储：Supabase（共享）+ LocalStorage（兜底）

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

const SUPABASE_URL = 'https://dnqswjrevffwdcksnwan.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_O23O8vd8DYWDBoydPjl9LA_uYGspSHC';

const STAGES = [
  { key: "idea", label: "💡 创意期", color: "#f59e0b" },
  { key: "proto", label: "🔧 原型期", color: "#3b82f6" },
  { key: "mvp", label: "🚀 MVP期", color: "#10b981" },
  { key: "growth", label: "📈 成长期", color: "#8b5cf6" }
];
const NEEDS = ["资金", "团队", "场地", "设备", "导师", "渠道", "法务", "其他"];
const RES_TYPES = ["资金", "场地", "导师", "设备", "渠道", "服务"];
const POST_CATS = ["交流", "求助", "分享", "招聘", "合作"];
const CATEGORIES = ["硬科技", "人工智能", "生物医药", "新能源", "智能制造", "文创", "电商", "农业", "其他"];

const APP = {
  supabase: null, useSupabase: false,
  projects: [], resources: [], policies: [], posts: [],
  likedProjects: new Set(), likedPosts: new Set(),
  activeTab: "projects",
  calc: { revenue: 0, fixedCost: 0, varCost: 0, cash: 0 }
};

const SEED_PROJECTS = [
  { title: "AI 农业病虫害识别系统", description: "基于计算机视觉的农作物病虫害实时识别 App，已完成原型，寻求天使轮资金与农业渠道合作。", category: "人工智能", stage: "mvp", needs: ["资金", "渠道"], budget: 800000, contact: "微信 agri-ai-2026", creator: "新农人小李", likes: 24 },
  { title: "社区共享储能充电桩", description: "老旧小区共享储能+充电一体化方案，解决充电难与削峰填谷，已有 3 个小区试点。", category: "新能源", stage: "growth", needs: ["资金", "场地"], budget: 2000000, contact: "电话 138****8888", creator: "能创张工", likes: 38 },
  { title: "盲人智能导航眼镜", description: "低功耗视觉+语音导航眼镜，帮助视障人士独立出行，原型验证中，寻硬件合伙人。", category: "硬科技", stage: "proto", needs: ["团队", "设备"], budget: 500000, contact: "邮箱 see@mail.com", creator: "光感科技", likes: 52 },
  { title: "非遗文创盲盒电商", description: "将非遗工艺与盲盒结合，主打 Z 世代国潮消费，已上线小程序月销 50 万。", category: "文创", stage: "growth", needs: ["资金", "渠道"], budget: 1500000, contact: "微信 craft-box", creator: "潮玩阿杰", likes: 31 }
];

const SEED_RESOURCES = [
  { type: "资金", title: "大学生创业种子基金", description: "面向在校/毕业 5 年内大学生，单笔 5-50 万无息资助，需商业计划书。", value: "5-50 万", contact: "当地人社局", creator: "人社局" },
  { type: "场地", title: "科创园区免费工位", description: "提供 6 个月免费工位 + 注册地址，适合初创团队拎包入驻。", value: "免费 6 个月", contact: "园区招商办", creator: "XX 科创园" },
  { type: "导师", title: "AI 创业一对一辅导", description: "前 BAT 技术总监免费提供 AI 产品技术路线辅导，每月 4 个名额。", value: "免费", contact: "邮件 mentor@kc.com", creator: "导师团" },
  { type: "服务", title: "免费工商注册+财税代账", description: "初创企业首年免费工商注册、记账报税、社保托管。", value: "首年免费", contact: "企服平台", creator: "企服联盟" }
];

const SEED_POLICIES = [
  { title: "科技创新券补贴", department: "科技局", benefit: "企业购买技术服务最高补贴 50%，单家最高 20 万", deadline: "长期", url: "", tags: ["补贴", "中小企业"] },
  { title: "研发费用加计扣除", department: "税务局", benefit: "研发费用按 100% 加计扣除，相当于少缴企业所得税", deadline: "年度汇算", url: "", tags: ["税收", "研发"] },
  { title: "创业担保贷款", department: "人社局", benefit: "个人最高 50 万、小微企业最高 300 万，财政贴息", deadline: "长期", url: "", tags: ["贷款", "贴息"] },
  { title: "高新技术企业认定", department: "科技局", benefit: "企业所得税减按 15%，部分地区奖励 10-50 万", deadline: "每年分批", url: "", tags: ["税收", "奖励"] }
];

const SEED_POSTS = [
  { author: "连续创业者", content: "从 0 到 1 最重要的不是技术，是找到第一个愿意付钱的客户。先做最小可行产品去验证需求，别一上来就招团队租办公室。", category: "分享", likes: 67 },
  { author: "会计小王", content: "求助：刚注册的公司，第一个月报税怎么弄？零申报可以自己操作吗？", category: "求助", likes: 12 },
  { author: "做硬件的阿强", content: "分享一个省钱 tip：原型阶段不要自己开模，先用 3D 打印验证结构，等订单稳定了再开模，能省十几万。", category: "分享", likes: 89 }
];

// ===== 初始化 =====
function initSupabase() {
  if (window.supabase) {
    APP.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else { setTimeout(initSupabase, 100); }
}

async function loadAll() {
  setMode("正在加载科创中心…");
  // 尝试 Supabase
  if (APP.supabase) {
    try {
      const results = await Promise.all([
        APP.supabase.from('kc_projects').select('*').order('created_at', { ascending: false }),
        APP.supabase.from('kc_resources').select('*').order('created_at', { ascending: false }),
        APP.supabase.from('kc_policies').select('*').order('created_at', { ascending: false }),
        APP.supabase.from('kc_posts').select('*').order('created_at', { ascending: false })
      ]);
      if (!results.some(r => r.error)) {
        APP.projects = results[0].data || [];
        APP.resources = results[1].data || [];
        APP.policies = results[2].data || [];
        APP.posts = results[3].data || [];
        APP.useSupabase = true;
        setMode("🌐 共享模式 · 数据实时同步");
        renderAll();
        return;
      }
    } catch (e) { console.warn("Supabase 加载失败", e); }
  }
  // LocalStorage 兜底
  APP.useSupabase = false;
  APP.projects = loadLocal("kc_projects", SEED_PROJECTS);
  APP.resources = loadLocal("kc_resources", SEED_RESOURCES);
  APP.policies = loadLocal("kc_policies", SEED_POLICIES);
  APP.posts = loadLocal("kc_posts", SEED_POSTS);
  try { APP.likedProjects = new Set(JSON.parse(localStorage.getItem("kc_lp") || "[]")); } catch {}
  try { APP.likedPosts = new Set(JSON.parse(localStorage.getItem("kc_lposts") || "[]")); } catch {}
  setMode("💾 本地模式 · 执行 setup.sql 可开启共享");
  renderAll();
}

function loadLocal(key, seed) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(key, JSON.stringify(seed));
  return seed.slice();
}
function saveLocal(key) {
  const map = { projects: APP.projects, resources: APP.resources, policies: APP.policies, posts: APP.posts };
  localStorage.setItem("kc_" + key, JSON.stringify(map[key]));
}

// ===== 项目大厅 =====
function renderProjects() {
  const grid = document.getElementById("projects-grid");
  if (!APP.projects.length) { grid.innerHTML = '<div class="empty">暂无项目，快来发布第一个吧</div>'; return; }
  grid.innerHTML = APP.projects.map(p => {
    const stage = STAGES.find(s => s.key === p.stage) || STAGES[0];
    const needs = (p.needs || []).map(n => `<span class="need">${n}</span>`).join("");
    const liked = APP.likedProjects.has(p.id);
    return `
    <article class="proj-card">
      <div class="proj-head">
        <span class="stage-badge" style="background:${stage.color}22;color:${stage.color};border:1px solid ${stage.color}55">${stage.label}</span>
        <span class="cat-badge">${p.category || '其他'}</span>
      </div>
      <h3 class="proj-title">${p.title}</h3>
      <p class="proj-desc">${p.description || ''}</p>
      <div class="proj-meta">
        <span>💰 预算 ${(p.budget||0).toLocaleString()} 元</span>
        <span>👤 ${p.creator || '匿名'}</span>
      </div>
      <div class="proj-needs">${needs || '<span class="muted">暂无需求标注</span>'}</div>
      <div class="proj-contact">📞 ${p.contact || '未留联系方式'}</div>
      <div class="proj-foot">
        <button class="like-btn ${liked?'liked':''}" data-like-proj="${p.id}">❤️ ${p.likes || 0}</button>
        <a class="match-btn" href="#contact">我要对接 →</a>
      </div>
    </article>`;
  }).join("");
  grid.querySelectorAll("[data-like-proj]").forEach(b => b.onclick = () => likeProject(b.dataset.likeProj));
}

async function likeProject(id) {
  if (APP.likedProjects.has(id)) { toast("已赞过"); return; }
  const p = APP.projects.find(x => x.id === id);
  if (!p) return;
  p.likes = (p.likes || 0) + 1;
  APP.likedProjects.add(id);
  localStorage.setItem("kc_lp", JSON.stringify([...APP.likedProjects]));
  if (APP.useSupabase) {
    try { await APP.supabase.from('kc_projects').update({ likes: p.likes }).eq('id', id); } catch(e){}
  } else saveLocal("projects");
  renderProjects();
}

async function submitProject(form) {
  const p = {
    title: form.p_title.value.trim(),
    description: form.p_desc.value.trim(),
    category: form.p_cat.value,
    stage: form.p_stage.value,
    needs: Array.from(form.querySelectorAll('input[name=p_need]:checked')).map(c => c.value),
    budget: parseInt(form.p_budget.value) || 0,
    contact: form.p_contact.value.trim(),
    creator: form.p_creator.value.trim() || "匿名"
  };
  if (!p.title) { toast("请填写项目名称"); return false; }
  if (APP.useSupabase) {
    try {
      const { data, error } = await APP.supabase.from('kc_projects').insert(p).select().single();
      if (error) throw error;
      APP.projects.unshift(data);
      toast("🎉 项目已发布到大厅");
    } catch (e) { toast("发布失败：" + e.message); return false; }
  } else {
    APP.projects.unshift({ ...p, id: "local-" + Date.now(), likes: 0, created_at: new Date().toISOString() });
    saveLocal("projects");
    toast("💾 项目已保存到本地");
  }
  form.reset();
  renderProjects();
  return true;
}

// ===== 生存计算器 =====
function runCalc() {
  const f = document.calcForm;
  const revenue = parseFloat(f.c_revenue.value) || 0;
  const fixed = parseFloat(f.c_fixed.value) || 0;
  const variable = parseFloat(f.c_var.value) || 0;
  const cash = parseFloat(f.c_cash.value) || 0;
  const gross = revenue - variable;
  const margin = revenue ? (gross / revenue * 100) : 0;
  const net = gross - fixed;
  const burn = Math.max(fixed - gross, 0);
  const runway = burn > 0 ? Math.floor(cash / burn) : (net >= 0 ? Infinity : 0);
  const breakEven = gross > 0 ? Math.ceil(fixed / gross * revenue) : Infinity;

  const el = document.getElementById("calc-result");
  const runwayText = runway === Infinity ? "∞ 已盈利" : (runway > 0 ? `${runway} 个月` : "不足 1 个月");
  const runwayColor = runway === Infinity ? "#10b981" : (runway >= 6 ? "#10b981" : runway >= 3 ? "#f59e0b" : "#ef4444");
  el.innerHTML = `
    <div class="calc-grid">
      <div class="calc-box">
        <div class="calc-label">月毛利</div>
        <div class="calc-val" style="color:${gross>=0?'#10b981':'#ef4444'}">¥ ${gross.toLocaleString()}</div>
        <div class="calc-sub">毛利率 ${margin.toFixed(1)}%</div>
      </div>
      <div class="calc-box">
        <div class="calc-label">月净利润</div>
        <div class="calc-val" style="color:${net>=0?'#10b981':'#ef4444'}">¥ ${net.toLocaleString()}</div>
      </div>
      <div class="calc-box highlight">
        <div class="calc-label">🔥 生存跑道</div>
        <div class="calc-val" style="color:${runwayColor}">${runwayText}</div>
        <div class="calc-sub">现有资金 / 月烧钱</div>
      </div>
      <div class="calc-box">
        <div class="calc-label">盈亏平衡月营收</div>
        <div class="calc-val">¥ ${breakEven === Infinity ? '—' : breakEven.toLocaleString()}</div>
      </div>
    </div>
    <div class="calc-advice">
      ${runway === Infinity ? "✅ 当前已盈利，建议将利润再投入研发或拓展渠道。" :
        runway >= 6 ? "⚠️ 跑道充足（≥6个月），抓紧验证商业模式与增长。" :
        runway >= 3 ? "🔶 跑道紧张（3-6个月），立即启动融资或削减非必要开支。" :
        "🚨 跑道告急（<3个月），优先保命：砍成本、催回款、找钱，三管齐下。"}
    </div>`;
}

// ===== 资源对接 =====
function renderResources() {
  const grid = document.getElementById("resources-grid");
  if (!APP.resources.length) { grid.innerHTML = '<div class="empty">暂无资源</div>'; return; }
  grid.innerHTML = APP.resources.map(r => {
    const icon = { "资金": "💰", "场地": "🏢", "导师": "🧑‍🏫", "设备": "🔬", "渠道": "📢", "服务": "🛠️" }[r.type] || "📦";
    return `
    <article class="res-card">
      <div class="res-type">${icon} ${r.type}</div>
      <h3 class="res-title">${r.title}</h3>
      <p class="res-desc">${r.description || ''}</p>
      <div class="res-value">价值：<b>${r.value || '面议'}</b></div>
      <div class="res-contact">📞 ${r.contact || '站内联系'}</div>
      <div class="res-by">由 ${r.creator || '匿名'} 提供</div>
    </article>`;
  }).join("");
}

async function submitResource(form) {
  const r = {
    type: form.r_type.value,
    title: form.r_title.value.trim(),
    description: form.r_desc.value.trim(),
    value: form.r_value.value.trim(),
    contact: form.r_contact.value.trim(),
    creator: form.r_creator.value.trim() || "匿名"
  };
  if (!r.title) { toast("请填写资源标题"); return false; }
  if (APP.useSupabase) {
    try { const { data, error } = await APP.supabase.from('kc_resources').insert(r).select().single();
      if (error) throw error; APP.resources.unshift(data); toast("✅ 资源已发布"); }
    catch (e) { toast("发布失败"); return false; }
  } else { APP.resources.unshift({ ...r, id: "local-" + Date.now(), created_at: new Date().toISOString() }); saveLocal("resources"); toast("💾 已保存本地"); }
  form.reset(); renderResources(); return true;
}

// ===== 政策红利 =====
function renderPolicies() {
  const grid = document.getElementById("policies-grid");
  if (!APP.policies.length) { grid.innerHTML = '<div class="empty">暂无政策</div>'; return; }
  grid.innerHTML = APP.policies.map(p => {
    const tags = (p.tags || []).map(t => `<span class="tag">${t}</span>`).join("");
    return `
    <article class="pol-card">
      <div class="pol-dept">🏛️ ${p.department || '政府部门'}</div>
      <h3 class="pol-title">${p.title}</h3>
      <div class="pol-benefit">🎁 ${p.benefit || ''}</div>
      <div class="pol-deadline">⏰ 截止：${p.deadline || '长期'}</div>
      ${tags ? `<div class="tags">${tags}</div>` : ''}
      ${p.url ? `<a class="pol-link" href="${p.url}" target="_blank" rel="noopener">查看详情 →</a>` : ''}
    </article>`;
  }).join("");
}

async function submitPolicy(form) {
  const p = {
    title: form.pol_title.value.trim(),
    department: form.pol_dept.value.trim(),
    benefit: form.pol_benefit.value.trim(),
    deadline: form.pol_deadline.value.trim(),
    url: form.pol_url.value.trim(),
    tags: form.pol_tags.value.split(/[,，\s]+/).filter(Boolean)
  };
  if (!p.title) { toast("请填写政策名称"); return false; }
  if (APP.useSupabase) {
    try { const { data, error } = await APP.supabase.from('kc_policies').insert(p).select().single();
      if (error) throw error; APP.policies.unshift(data); toast("✅ 政策已收录"); }
    catch (e) { toast("收录失败"); return false; }
  } else { APP.policies.unshift({ ...p, id: "local-" + Date.now(), created_at: new Date().toISOString() }); saveLocal("policies"); toast("💾 已保存本地"); }
  form.reset(); renderPolicies(); return true;
}

// ===== 创客社区 =====
function renderPosts() {
  const grid = document.getElementById("posts-grid");
  if (!APP.posts.length) { grid.innerHTML = '<div class="empty">还没有帖子，来发第一条吧</div>'; return; }
  grid.innerHTML = APP.posts.map(p => {
    const liked = APP.likedPosts.has(p.id);
    return `
    <article class="post-card">
      <div class="post-head">
        <span class="post-cat">${p.category || '交流'}</span>
        <span class="post-author">${p.author || '匿名'}</span>
      </div>
      <div class="post-content">${p.content}</div>
      <button class="like-btn sm ${liked?'liked':''}" data-like-post="${p.id}">❤️ ${p.likes || 0}</button>
    </article>`;
  }).join("");
  grid.querySelectorAll("[data-like-post]").forEach(b => b.onclick = () => likePost(b.dataset.likePost));
}

async function likePost(id) {
  if (APP.likedPosts.has(id)) { toast("已赞过"); return; }
  const p = APP.posts.find(x => x.id === id);
  if (!p) return;
  p.likes = (p.likes || 0) + 1;
  APP.likedPosts.add(id);
  localStorage.setItem("kc_lposts", JSON.stringify([...APP.likedPosts]));
  if (APP.useSupabase) { try { await APP.supabase.from('kc_posts').update({ likes: p.likes }).eq('id', id); } catch(e){} }
  else saveLocal("posts");
  renderPosts();
}

async function submitPost(form) {
  const p = {
    author: form.post_author.value.trim() || "匿名",
    content: form.post_content.value.trim(),
    category: form.post_cat.value
  };
  if (!p.content) { toast("请输入内容"); return false; }
  if (APP.useSupabase) {
    try { const { data, error } = await APP.supabase.from('kc_posts').insert(p).select().single();
      if (error) throw error; APP.posts.unshift(data); toast("✅ 已发布"); }
    catch (e) { toast("发布失败"); return false; }
  } else { APP.posts.unshift({ ...p, id: "local-" + Date.now(), likes: 0, created_at: new Date().toISOString() }); saveLocal("posts"); toast("💾 已保存本地"); }
  form.reset(); renderPosts(); return true;
}

// ===== 通用 =====
function setMode(t) { const el = document.getElementById("mode-status"); if (el) el.textContent = t; }
function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
}
function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "刚刚"; if (diff < 3600) return Math.floor(diff/60)+" 分钟前";
  if (diff < 86400) return Math.floor(diff/3600)+" 小时前"; return Math.floor(diff/86400)+" 天前";
}

function switchTab(tab) {
  APP.activeTab = tab;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === "panel-" + tab));
}

function renderAll() {
  renderProjects(); renderResources(); renderPolicies(); renderPosts();
}

// ===== 绑定 =====
function bindAll() {
  document.querySelectorAll(".tab").forEach(b => b.onclick = () => switchTab(b.dataset.tab));
  // 发布类操作需登录
  const requireLoginSubmit = (fn) => (e) => {
    e.preventDefault();
    if(!SiteAuth.isLoggedIn()){ SiteAuth.requireLogin(); return; }
    fn(e.target);
  };
  document.getElementById("proj-form").onsubmit = requireLoginSubmit(submitProject);
  document.getElementById("res-form").onsubmit = requireLoginSubmit(submitResource);
  document.getElementById("pol-form").onsubmit = requireLoginSubmit(submitPolicy);
  document.getElementById("post-form").onsubmit = requireLoginSubmit(submitPost);
  document.calcForm.onsubmit = e => { e.preventDefault(); runCalc(); };
  // 填充表单选项
  const stageSel = document.querySelector('select[name=p_stage]');
  stageSel.innerHTML = STAGES.map(s => `<option value="${s.key}">${s.label}</option>`).join("");
  const needWrap = document.getElementById("p_needs");
  needWrap.innerHTML = NEEDS.map(n => `<label class="check"><input type="checkbox" name="p_need" value="${n}"> ${n}</label>`).join("");
  const catSel = document.querySelector('select[name=p_cat]');
  catSel.innerHTML = CATEGORIES.map(c => `<option>${c}</option>`).join("");
  const rType = document.querySelector('select[name=r_type]');
  rType.innerHTML = RES_TYPES.map(t => `<option>${t}</option>`).join("");
  const postCat = document.querySelector('select[name=post_cat]');
  postCat.innerHTML = POST_CATS.map(c => `<option>${c}</option>`).join("");
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
}

document.addEventListener("DOMContentLoaded", () => { bindAll(); initSupabase(); loadAll(); });
