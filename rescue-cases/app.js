// 穷途末路自救案例库 - 会员专属 · 仅供学习参考
const SUPABASE_URL = "https://oqwkivtxvygttxqzcyhu.supabase.co";
const ANON_KEY = "sb_publishable_O23O8vd8DYWDBoydPjl9LA_uYGspSHC";

const CATEGORIES = ["全部", "创业失败", "财务危机", "职场绝境", "健康危机", "情感困境", "法律纠纷", "生存险境", "其他"];

const SEED_CASES = [
  {
    title: "创业失败负债80万，靠摆地摊3年翻身",
    category: "创业失败",
    situation: "35岁，开餐厅倒闭，负债80万，妻子离婚，父母病倒，觉得人生没希望了。",
    turning_point: "半夜在河边坐了3小时，想起父亲说的'人活着就有翻盘的机会'。",
    action: "卖掉房子还债，剩2000元进了地摊货，从夜市摆摊卖小吃开始，每天干16小时，用记账本一分一厘抠。",
    outcome: "3年后开了3家连锁早餐店，还清债务，重新组建了家庭。",
    lesson: "绝境时先活下去，再图发展。面子不值钱，现金流才值钱。",
    source: "匿名会员",
    likes: 128
  },
  {
    title: "被裁员后45岁，自学编程转行成功",
    category: "职场绝境",
    situation: "45岁被大厂裁员，房贷还有15年，孩子在读高中，投了200份简历石沉大海。",
    turning_point: "看到一个40岁转行程序员的帖子，决定死磕一门技能。",
    action: "每天学习8小时Python，做了3个开源项目挂在GitHub，主动给小公司免费做项目积累经验，3个月后找到第一份工作。",
    outcome: "现在是一家中型公司的后端开发，薪资比之前还高20%。",
    lesson: "年龄不是借口，技能才是底气。主动创造作品比被动投简历有效10倍。",
    source: "匿名会员",
    likes: 95
  },
  {
    title: "投资爆仓欠下巨债，靠送外卖重新站起来",
    category: "财务危机",
    situation: "炒股加杠杆爆仓，欠了50万，不敢告诉家人，每天失眠想轻生。",
    turning_point: "女儿递来一张画，写着'爸爸加油'，瞬间泪崩。",
    action: "坦白告诉妻子，全家一起面对。白天送外卖，晚上跑代驾，同时学习理财知识，戒掉投机。",
    outcome: "2年半还清债务，现在每月定投指数基金，心态比以前健康100倍。",
    lesson: "坦白比隐瞒更有力量，家人是最大的后盾。远离杠杆，不懂不投。",
    source: "匿名会员",
    likes: 156
  },
  {
    title: "重疾确诊后，用积极心态创造医学奇迹",
    category: "健康危机",
    situation: "32岁确诊晚期癌症，医生说最多6个月，感觉天塌了。",
    turning_point: "在医院遇到一位抗癌10年的老人，说'心态是最好的药'。",
    action: "积极配合治疗，同时开始写日记、做公益、原谅所有伤害过自己的人，把每一天当最后一天过。",
    outcome: "5年后体检癌细胞消失，医生称之为奇迹。现在成为抗癌志愿者。",
    lesson: "医学有边界，但心态无极限。与其恐惧死亡，不如好好活着。",
    source: "匿名会员",
    likes: 210
  },
  {
    title: "被合伙人卷款跑路，用一张借条逆风翻盘",
    category: "法律纠纷",
    situation: "合伙人带着公司全部资金跑路，还留下一堆债务，员工工资发不出。",
    turning_point: "律师朋友说'先止损，再取证，别急着拼命'。",
    action: "第一时间报警并申请财产保全，整理所有转账记录和合同，通过法院冻结对方资产，同时跟员工坦诚沟通，分批补发工资。",
    outcome: "6个月后追回70%资金，公司重新运转，员工一个没走。",
    lesson: "遇到欺诈先冷静取证，法律是武器，情绪是累赘。",
    source: "匿名会员",
    likes: 73
  },
  {
    title: "深山迷路3天，靠小时候的知识活下来",
    category: "生存险境",
    situation: "户外徒步迷路，手机没信号，水喝完了，天黑温度骤降。",
    turning_point: "想起小学自然课教的'苔藓长在北面'和'沿溪走能找到人'。",
    action: "用苔藓辨别方向，收集露水，用打火机点燃枯枝生火保暖，沿溪流方向走，每隔几小时喊一次。",
    outcome: "第三天下午被搜救队找到，只是脱水和轻伤。",
    lesson: "平时多学一点生存知识，关键时刻能救命。永远告诉别人你的行程。",
    source: "匿名会员",
    likes: 189
  }
];

let state = {
  cases: [],
  category: "全部",
  search: "",
  modal: null,
  unlocked: localStorage.getItem("rescue_unlocked") === "1"
};

function $(id) { return document.getElementById(id); }

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

function loadCases() {
  const stored = localStorage.getItem("rescue_cases_v1");
  if (stored) {
    try {
      state.cases = JSON.parse(stored);
    } catch (e) { state.cases = [...SEED_CASES]; }
  } else {
    state.cases = [...SEED_CASES];
    localStorage.setItem("rescue_cases_v1", JSON.stringify(state.cases));
  }
  syncFromSupabase().catch(() => {});
}

async function syncFromSupabase() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rescue_cases?order=created_at.desc&limit=100`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
    });
    if (res.ok) {
      const remote = await res.json();
      if (remote.length > state.cases.length) {
        state.cases = remote.map(r => ({
          title: r.title, category: r.category, situation: r.situation,
          turning_point: r.turning_point, action: r.action, outcome: r.outcome,
          lesson: r.lesson, source: r.source || "匿名会员", likes: r.likes || 0
        }));
        localStorage.setItem("rescue_cases_v1", JSON.stringify(state.cases));
        renderList();
      }
    }
  } catch (e) { /* offline, use local */ }
}

// 会员门
function checkGate() {
  if (state.unlocked) {
    $("gate").classList.add("hidden");
    $("app").classList.remove("hidden");
    return;
  }
  $("gate").classList.remove("hidden");
  $("app").classList.add("hidden");
}

function tryUnlock() {
  const pw = $("gate-input").value.trim();
  // 默认会员口令：2026（用户可自行修改 localStorage）
  if (pw === "2026" || pw === "自救") {
    state.unlocked = true;
    localStorage.setItem("rescue_unlocked", "1");
    checkGate();
  } else {
    $("gate-msg").textContent = "口令不正确，请联系管理员获取会员资格。";
    $("gate-msg").style.color = "#fca5a5";
  }
}

function renderCategories() {
  $("categories").innerHTML = CATEGORIES.map(c =>
    `<button class="cat-btn ${state.category === c ? 'active' : ''}" onclick="setCat('${c}')">${c}</button>`
  ).join("");
}

function setCat(c) { state.category = c; renderCategories(); renderList(); }
function onSearch() { state.search = $("search").value; renderList(); }

function renderList() {
  let list = state.cases;
  if (state.category !== "全部") list = list.filter(c => c.category === state.category);
  if (state.search) {
    const q = state.search.toLowerCase();
    list = list.filter(c => c.title.toLowerCase().includes(q) || c.situation.toLowerCase().includes(q) || c.lesson.toLowerCase().includes(q));
  }
  if (list.length === 0) {
    $("case-grid").innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)">暂无符合条件的案例</div>`;
    return;
  }
  $("case-grid").innerHTML = list.map(c => `
    <div class="case-card" onclick="showCase(${state.cases.indexOf(c)})">
      <span class="case-cat">${esc(c.category)}</span>
      <h3>${esc(c.title)}</h3>
      <p class="summary">${esc(c.situation)}</p>
      <div class="meta"><span>👍 ${esc(c.likes || 0)}</span><span>${esc(c.source)}</span></div>
    </div>
  `).join("");
}

function showCase(i) {
  const c = state.cases[i];
  $("modal-title").textContent = c.title;
  $("modal-cat").textContent = c.category;
  $("modal-situation").textContent = c.situation;
  $("modal-turning").textContent = c.turning_point;
  $("modal-action").textContent = c.action;
  $("modal-outcome").textContent = c.outcome;
  $("modal-lesson").textContent = c.lesson;
  $("modal-source").textContent = `来源：${c.source}`;
  $("modal").classList.remove("hidden");
}

function closeModal() { $("modal").classList.add("hidden"); }

function openSubmit() {
  $("submit-modal").classList.remove("hidden");
  $("submit-form").reset();
  $("ai-draft").classList.add("hidden");
}

function closeSubmit() { $("submit-modal").classList.add("hidden"); }

async function aiDraft() {
  const brief = $("submit-situation").value.trim();
  if (!brief) { alert("请先简要描述绝境情况"); return; }
  $("ai-draft-btn").disabled = true;
  $("ai-draft-btn").innerHTML = '<span class="spinner"></span>AI 正在整理案例…';
  $("ai-draft").classList.remove("hidden");
  $("ai-draft").textContent = "思考中…";
  try {
    const prompt = `请根据以下真实绝境自救故事的简要描述，帮我整理成一个完整的自救案例，包含：\n1. 绝境描述\n2. 转折点\n3. 自救行动\n4. 最终结果\n5. 核心启示\n\n简要描述：${brief}\n\n请用中文，分点输出，每点用【】标记。`;
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "openai" })
    });
    const text = await res.text();
    $("ai-draft").textContent = text;
    $("ai-draft").style.whiteSpace = "pre-wrap";
  } catch (e) {
    $("ai-draft").textContent = "⚠️ AI 整理失败：" + e.message;
  }
  $("ai-draft-btn").disabled = false;
  $("ai-draft-btn").textContent = "🤖 AI 整理案例";
}

function submitCase() {
  const title = $("submit-title").value.trim();
  const category = $("submit-category").value;
  const situation = $("submit-situation").value.trim();
  const turning = $("submit-turning").value.trim();
  const action = $("submit-action").value.trim();
  const outcome = $("submit-outcome").value.trim();
  const lesson = $("submit-lesson").value.trim();
  if (!title || !situation || !action) { alert("标题、绝境描述、自救行动为必填项"); return; }
  const newCase = {
    title, category, situation, turning_point: turning, action, outcome, lesson,
    source: "匿名会员", likes: 0
  };
  state.cases.unshift(newCase);
  localStorage.setItem("rescue_cases_v1", JSON.stringify(state.cases));
  // 尝试同步到 Supabase
  fetch(`${SUPABASE_URL}/rest/v1/rescue_cases`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json", Prefer: "return=minimal"
    },
    body: JSON.stringify(newCase)
  }).catch(() => {});
  closeSubmit();
  renderList();
  alert("案例已收录，感谢分享！");
}

function bindAll() {
  $("gate-btn").onclick = tryUnlock;
  $("gate-input").addEventListener("keydown", e => { if (e.key === "Enter") tryUnlock(); });
  $("search").oninput = onSearch;
  $("submit-btn").onclick = openSubmit;
  $("close-submit").onclick = closeSubmit;
  $("ai-draft-btn").onclick = aiDraft;
  $("submit-form").onsubmit = e => { e.preventDefault(); submitCase(); };
  $("close-modal").onclick = closeModal;
  $("modal").onclick = e => { if (e.target.id === "modal") closeModal(); };
}

loadCases();
renderCategories();
renderList();
checkGate();
bindAll();
window.setCat = setCat;
window.showCase = showCase;
window.closeModal = closeModal;
