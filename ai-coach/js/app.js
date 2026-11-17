/* =====================================================
   AI成交教练 · 核心逻辑
   ===================================================== */

/* ---------- 工具 ---------- */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 1800);
}

function copyText(txt) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(txt).then(() => toast("已复制，快去粘贴发送吧 ✨")).catch(() => fallbackCopy(txt));
  } else {
    fallbackCopy(txt);
  }
}
function fallbackCopy(txt) {
  const ta = document.createElement("textarea");
  ta.value = txt;
  ta.style.cssText = "position:fixed;opacity:0;";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); toast("已复制，快去粘贴发送吧 ✨"); } catch (e) { toast("复制失败，请长按手动复制"); }
  document.body.removeChild(ta);
}

/* ---------- 底部导航 ---------- */
$$(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    $$(".view").forEach((v) => v.classList.remove("active"));
    $("#" + btn.dataset.view).classList.add("active");
    window.scrollTo(0, 0);
  });
});

/* =====================================================
   模块一：教练问答
   ===================================================== */
function bubble(who, html, avatar) {
  const wrap = document.createElement("div");
  wrap.className = "msg " + who;
  const av = who === "me" ? "" : '<div class="m-avatar">' + avatar + "</div>";
  const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  wrap.innerHTML = av + '<div class="m-bubble">' + html + '<div class="m-time">' + time + "</div></div>";
  return wrap;
}

function scrollBottom(el) {
  const view = el.closest(".view");
  window.scrollTo(0, view.scrollHeight);
}

function coachAdd(who, html, avatar) {
  const box = $("#coachChat");
  box.appendChild(bubble(who, html, avatar));
  scrollBottom(box);
}

function coachChips(excludeId, count) {
  const box = $("#coachChips");
  const pool = COACH_KB.filter((k) => k.id !== excludeId);
  box.innerHTML = "";
  shuffle(pool).slice(0, count || 3).forEach((k) => {
    const c = document.createElement("span");
    c.className = "chip";
    c.textContent = k.t;
    c.addEventListener("click", () => coachAsk(k.t));
    box.appendChild(c);
  });
}

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function coachMatch(text) {
  let best = null, bestScore = 0;
  COACH_KB.forEach((k) => {
    let score = 0;
    k.kws.forEach((w) => { if (text.includes(w)) score += 2; });
    if (k.t && text.includes(k.t)) score += 3;
    if (score > bestScore) { bestScore = score; best = k; }
  });
  return best;
}

const FALLBACK_ANSWER = `这个问题有点超纲啦，先给你几个我最擅长的方向，点一个试试👇<div class="script-box">也可以换个说法描述你的问题，比如「客户嫌贵」「客户不回消息」「怎么找客户」～</div>`;

/* ---------- v1.1 「帮我写」引擎 ---------- */
let lastHit = null;

function getProfileSafe() {
  return (typeof profile === "function")
    ? profile()
    : { product: "你的产品", selling: "你的核心卖点", audience: "你的目标客户" };
}

function genWrite(text) {
  const p = getProfileSafe();
  const want = { pyq: /朋友圈|发圈|文案/.test(text), opening: /开场|破冰/.test(text), follow: /跟进|回访|唤醒/.test(text), voice: /口播|抖音|短视频|脚本/.test(text), close: /逼单|促单|成交/.test(text) };

  let title, body;
  if (want.voice && typeof buildVideoScript === "function") {
    title = "短视频口播稿";
    body = buildVideoScript().text;
  } else if (want.opening && typeof SCRIPTS !== "undefined") {
    title = "破冰开场白";
    body = pick(SCRIPTS.filter((s) => s.cat === "破冰开场")).txt;
  } else if (want.follow && typeof STAGES !== "undefined") {
    title = "客户跟进话术";
    body = pick(STAGES).tpl("姐", p.selling);
  } else if (want.close && typeof SCRIPTS !== "undefined") {
    title = "逼单话术";
    body = pick(SCRIPTS.filter((s) => s.cat === "促单成交")).txt;
  } else if (want.pyq && typeof TPLS !== "undefined") {
    title = "朋友圈文案";
    body = pick(TPLS).cap(p);
  } else {
    return null;
  }
  return "<b>帮你是我的强项💪 已按你的营销档案生成一条「" + title + "」：</b>" +
    '<div class="script-box">' + esc(body) + "</div>" +
    "不满意就说「<b>换个说法</b>」再来一条；去🎨创作页还能一键配图/生成口播分镜～";
}

const FOLLOWUP_MAP = {
  "换个说法": "换个角度，再给你讲一遍👇",
  "再来一条": "好嘞，再给你一条👇",
  "再来一个": "好嘞，再给你一条👇",
  "还有呢": "继续加餐👇",
  "继续": "继续加餐👇"
};

/* ---------- v2.0 真AI大脑（BYOK · OpenAI兼容 · Key只存本机） ---------- */
function aiCfg() {
  try { return JSON.parse(localStorage.getItem("aicoachAI") || "{}"); } catch (e) { return {}; }
}
function hasAI() { const c = aiCfg(); return !!(c.base && c.key && c.model); }
async function askAI(messages, opts) {
  const c = aiCfg();
  const r = await fetch(String(c.base).replace(/\/+$/, "") + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + c.key },
    body: JSON.stringify({ model: c.model, messages: messages, temperature: (opts && opts.temperature) || 0.7, max_tokens: 800 })
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const d = await r.json();
  const txt = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
  if (!txt) throw new Error("空回复");
  return String(txt).trim();
}
function aiHistory(type, q) {
  try {
    const h = JSON.parse(localStorage.getItem("aicoachHistory") || "[]");
    h.push({ t: type, q: String(q).slice(0, 120), at: Date.now() });
    localStorage.setItem("aicoachHistory", JSON.stringify(h.slice(-300)));
  } catch (e) { /* 数据根记录失败不影响主流程 */ }
}
function coachSystem() {
  const p = getProfileSafe();
  const kb = (typeof COACH_KB !== "undefined" ? COACH_KB.map((k) => k.t).join("、") : "");
  return "你是「AI成交教练」，一位非常懂宝妈客群与私域变现的销售教练，语言口语化、带适度emoji、永远直接给可执行话术。用户营销档案：产品=" + p.product + "；核心卖点=" + p.selling + "；目标客群=" + p.audience + "。内置课程目录：" + kb + "。回答控制在300字内：先给一句结论，再给一条可直接照抄的话术（放引号里），最后给一个下一步动作。";
}
function initAICfg() {
  const s = $("#aiStatus");
  if (!s) return;
  const c = aiCfg();
  if (c.base) $("#aiBase").value = c.base;
  if (c.key) $("#aiKey").value = c.key;
  if (c.model) $("#aiModel").value = c.model;
  document.querySelectorAll(".ai-presets button").forEach((b) => b.addEventListener("click", () => {
    $("#aiBase").value = b.dataset.b;
    $("#aiModel").value = b.dataset.m;
  }));
  $("#aiSave").addEventListener("click", () => {
    const c2 = { base: $("#aiBase").value.trim().replace(/\/+$/, ""), key: $("#aiKey").value.trim(), model: $("#aiModel").value.trim() };
    if (!c2.base || !c2.key || !c2.model) { toast("API地址 / Key / 模型名 三项都要填"); return; }
    localStorage.setItem("aicoachAI", JSON.stringify(c2));
    toast("🧠 真大脑已点亮！随便问一个真问题试试");
  });
  $("#aiTest").addEventListener("click", async () => {
    s.textContent = "测试中…";
    const t = { base: $("#aiBase").value.trim().replace(/\/+$/, ""), key: $("#aiKey").value.trim(), model: $("#aiModel").value.trim() };
    try {
      const r = await fetch(t.base + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + t.key },
        body: JSON.stringify({ model: t.model, messages: [{ role: "user", content: "只回复两个字母：OK" }], max_tokens: 10 })
      });
      const d = await r.json();
      s.textContent = d.choices ? "✅ 连接成功，真大脑在线" : "❌ " + ((d.error && d.error.message) || "连接失败");
    } catch (e) {
      s.textContent = "❌ 连不上：检查地址/Key/网络（部分端点不支持浏览器直连，可换DeepSeek或通义）";
    }
  });
  let h = [];
  try { h = JSON.parse(localStorage.getItem("aicoachHistory") || "[]"); } catch (e) {}
  if (!s.textContent) s.textContent = hasAI() ? "🧠 真大脑在线" : "内置教练值班中 · 数据根已留痕 " + h.length + " 条";
}

async function coachAsk(text) {
  text = (text || "").trim();
  if (!text) return;
  $("#coachInput").value = "";
  coachAdd("me", esc(text));

  const box = $("#coachChat");
  const tip = bubble("coach", '<div class="typing"><i></i><i></i><i></i></div>', "🤖");
  box.appendChild(tip);
  scrollBottom(box);
  await delay(400 + Math.random() * 350);
  tip.remove();

  // ① 追问上下文
  if (FOLLOWUP_MAP[text] && lastHit) {
    coachAdd("coach", "<b>" + FOLLOWUP_MAP[text] + "</b>（关于：" + esc(lastHit.t) + "）" + lastHit.a, "🤖");
    coachChips(lastHit.id, 3);
    return;
  }
  if (text === "再详细点" && lastHit) {
    coachAdd("coach", "<b>把「" + esc(lastHit.t) + "」拆到能直接执行👇</b><ul><li>把上面的每句话抄成你自己的话术模板，改掉产品名就能用</li><li>去🎯实战页找同类客户练3遍，练出肌肉记忆</li><li>每次用完记下客户反应，第二天只微调一句话，一周就是一套你的专属话术</li></ul>", "🤖");
    coachChips(lastHit.id, 3);
    return;
  }
  if (text === "举个例子" && lastHit) {
    coachAdd("coach", "例子都在上面的话术框里啦😊 想要按<b>你的产品</b>定制的例子，直接说「帮我写+场景」，比如：<b>帮我写朋友圈文案</b>、<b>帮我写开场白</b>、<b>帮我写抖音口播稿</b>", "🤖");
    coachChips(lastHit.id, 3);
    return;
  }

  // ② 「帮我写」生成意图
  if (/(帮我写|写一|来一|编一|生成|想想|文案$|话术$|口播稿$)/.test(text)) {
    const out = genWrite(text);
    if (out) {
      coachAdd("coach", out, "🤖");
      coachChips(null, 3);
      return;
    }
  }

  // ② 真AI大脑（配置了Key才启用；失败自动回落内置教练）
  if (hasAI()) {
    try {
      const ans = await askAI([{ role: "system", content: coachSystem() }, { role: "user", content: text }]);
      aiHistory("ask", text);
      coachAdd("coach", esc(ans).replace(/\n/g, "<br>"), "🤖");
      coachChips(null, 3);
      return;
    } catch (e) {
      toast("⚠️ 真大脑连接失败，内置教练先顶上（可去大脑设置测试）");
    }
  }

  const hit = coachMatch(text);
  if (hit) {
    lastHit = hit;
    coachAdd("coach", hit.a, "🤖");
    coachChips(hit.id, 3);
  } else {
    coachAdd("coach", FALLBACK_ANSWER, "🤖");
    coachChips(null, 6);
  }
}

function initCoach() {
  const welcome =
    "你好呀，我是你的<b>AI成交教练</b>🤖<br>24小时贴身秘书，教你<b>获客、沟通、成交</b>，还能陪你实战演练、自动安排客户跟进。<br>v1.1新技能：直接对我说「<b>帮我写朋友圈文案</b>」「<b>帮我写口播稿</b>」，以及「<b>换个说法</b>」「<b>再详细点</b>」追着我问 👇";
  coachAdd("coach", welcome, "🤖");
  coachChips(null, 6);
  $("#coachSend").addEventListener("click", () => coachAsk($("#coachInput").value));
  $("#coachInput").addEventListener("keydown", (e) => { if (e.key === "Enter") coachAsk($("#coachInput").value); });
}

/* =====================================================
   模块二：实战模拟
   ===================================================== */
const ROLE_RULES = {
  xiaomei: { greet: 2, empathy: 7, probe: 8, value: 6, price: -6, hardpush: -12, exaggerate: -8, discount: -3, perfunctory: -4, generic: -1 },
  wangzong: { greet: 1, empathy: 4, probe: 7, value: 8, price: -4, hardpush: -10, exaggerate: -9, discount: 6, perfunctory: -4, generic: -1 },
  lijie: { greet: 2, empathy: 8, probe: 8, value: 7, price: -5, hardpush: -14, exaggerate: -15, discount: 3, perfunctory: -5, generic: -1 },
  zhangge: { greet: 1, empathy: 5, probe: 6, value: 9, price: -3, hardpush: -10, exaggerate: -10, discount: 2, perfunctory: -6, generic: -1 }
};

const CAT_DETECT = [
  { cat: "hardpush", kws: ["不买", "赶紧", "必须买", "求你", "买吧", "别犹豫", "再不买", "错过就", "最后机会"] },
  { cat: "exaggerate", kws: ["最好", "第一", "绝对", "百分百", "100%", "保证有效", "全球", "顶级", "没人比", "包治", "根治"] },
  { cat: "discount", kws: ["便宜点", "打折", "降价", "给你优惠", "给你减免", "免费送你", "再减", "让利"] },
  { cat: "close", kws: ["下单", "定下来", "现在定", "今天定", "成交", "签约", "拍下", "付款", "名额", "安排", "收货", "地址"] },
  { cat: "price", kws: ["多少钱", "价格", "贵不贵", "费用", "报价", "什么价位", "几块钱"] },
  { cat: "empathy", kws: ["理解", "明白", "是的", "没错", "你说得对", "你说的对", "确实", "辛苦", "谢谢", "认同", "支持你", "我懂"] },
  { cat: "probe", kws: ["为什么", "怎么样", "怎么想", "什么情况", "哪里", "有没有", "多久", "能不能", "方便问", "多大", "什么问题", "您是不是", "你是怎么"] },
  { cat: "value", kws: ["产品", "效果", "方案", "服务", "成分", "技术", "案例", "见证", "体验", "适合", "帮助", "解决", "改善", "特点", "优势", "区别"] },
  { cat: "greet", kws: ["你好", "您好", "在吗", "hi", "hello", "早上好", "下午好", "晚上好", "哈喽"] }
];

function detectCat(text) {
  const t = text.toLowerCase();
  for (const item of CAT_DETECT) {
    if (item.kws.some((w) => t.includes(w))) return item.cat;
  }
  if (t.includes("？") || t.includes("?")) return "probe";
  if (text.trim().length <= 4) return "perfunctory";
  return "generic";
}

let role = null; // 当前演练状态

function renderPersonaSelect() {
  const grid = $("#personaGrid");
  grid.innerHTML = "";
  PERSONAS.forEach((p) => {
    const card = document.createElement("div");
    card.className = "persona-card";
    card.innerHTML = '<div class="p-avatar">' + p.avatar + '</div><div class="p-name">' + p.name + '</div><div class="p-tag">' + p.tag + '</div><div class="p-desc">' + p.desc + "</div>";
    card.addEventListener("click", () => startRole(p));
    grid.appendChild(card);
  });
}

function startRole(p) {
  role = {
    persona: p,
    interest: p.start,
    ended: false,
    discountUsed: false,
    counters: { probe: 0, empathy: 0, value: 0, hardpush: 0, exaggerate: 0, perfunctory: 0, close: 0, price: 0 }
  };
  $("#roleSelect").classList.add("hidden");
  $("#roleRoom").classList.remove("hidden");
  $("#reviewOverlay").classList.add("hidden");
  $("#rAvatar").textContent = p.avatar;
  $("#rName").textContent = p.name;
  $("#rTag").textContent = p.tag;
  $("#roleChat").innerHTML = "";
  roleAddCust(p.open);
  updateMeter();
}

function roleAddMe(text) {
  const box = $("#roleChat");
  box.appendChild(bubble("me", esc(text)));
  scrollBottom(box);
}
function roleAddCust(text) {
  const box = $("#roleChat");
  box.appendChild(bubble("cust", esc(text), role.persona.avatar));
  scrollBottom(box);
}

function updateMeter() {
  const v = Math.max(0, Math.min(100, role.interest));
  $("#meterNum").textContent = v + "%";
  $("#meterFill").style.width = v + "%";
  if (v >= 75) $("#meterFill").style.background = "linear-gradient(90deg,#3ecf8e,#7bedb0)";
  else if (v >= 40) $("#meterFill").style.background = "linear-gradient(90deg,#ff6b81,#ffc24b)";
  else $("#meterFill").style.background = "linear-gradient(90deg,#ff4d5e,#ff8fa3)";
}

async function roleSend() {
  const input = $("#roleInput");
  const text = (input.value || "").trim();
  if (!text || !role || role.ended) return;
  input.value = "";
  roleAddMe(text);

  const cat = detectCat(text);
  if (role.counters[cat] !== undefined) role.counters[cat]++;

  const p = role.persona;
  const rules = ROLE_RULES[p.id];
  let delta = rules[cat] !== undefined ? rules[cat] : rules.generic;

  // 特殊处理：让利只第一次有效；忙碌型长篇大论扣分
  if (cat === "discount") {
    if (!role.discountUsed) { role.discountUsed = true; } else { delta = -4; }
  }
  if (p.id === "zhangge" && (cat === "value" || cat === "generic") && text.length > 60) {
    delta = -2;
  }

  // 成交判定
  if (cat === "close" && role.interest + delta >= 75 && role.interest >= 70) {
    role.ended = true;
    role.result = "deal";
    role.interest = 100;
    updateMeter();
    const box = $("#roleChat");
    const tip = bubble("cust", '<div class="typing"><i></i><i></i><i></i></div>', p.avatar);
    box.appendChild(tip); scrollBottom(box);
    await delay(700);
    tip.remove();
    roleAddCust(p.deal);
    await delay(900);
    showReview();
    return;
  }

  // 流失判定
  role.interest = Math.max(0, Math.min(100, role.interest + delta));
  updateMeter();
  if (role.interest <= 15) {
    role.ended = true;
    role.result = "lose";
    const box = $("#roleChat");
    const tip = bubble("cust", '<div class="typing"><i></i><i></i><i></i></div>', p.avatar);
    box.appendChild(tip); scrollBottom(box);
    await delay(700);
    tip.remove();
    roleAddCust(p.lose);
    await delay(900);
    showReview();
    return;
  }

  // 客户回复
  const box = $("#roleChat");
  const tip = bubble("cust", '<div class="typing"><i></i><i></i><i></i></div>', p.avatar);
  box.appendChild(tip); scrollBottom(box);
  await delay(450 + Math.random() * 450);
  tip.remove();

  // ②.5 真AI客户：台词交给真模型演（兴趣度评分仍走本地规则，保证复盘公平）
  if (hasAI()) {
    try {
      const styleRefs = [].concat(p.lines.close_fail || [], p.deal || "", p.lose || "").filter(Boolean).join("；");
      const sys = "你现在扮演一名真实客户「" + p.name + "」（" + p.tag + "，" + p.desc + "），正在被推销。当前你对这位销售的兴趣度=" + role.interest + "/100（越高越愿意聊，低于40会明显不耐烦）。说话要符合人设、口语化、一次只说1~3句，可以提出真实顾虑（价格/时间/怕被骗/家人反对），不要跳出角色、不要给销售建议。参考语气：" + styleRefs + "。销售刚说：" + text;
      const line = await askAI([{ role: "system", content: sys }], { temperature: 0.9 });
      aiHistory("practice", text);
      roleAddCust(line);
      return;
    } catch (e) { /* AI失手就走内置剧本 */ }
  }

  let line = null;
  if (p.id === "zhangge" && text.length > 60 && (cat === "value" || cat === "generic")) {
    line = "太长了，没耐心看，挑重点说。";
  } else if (cat === "close") {
    line = pick(p.lines.close_fail);
    role.interest = Math.max(0, role.interest - 6);
    updateMeter();
  } else {
    line = pick(p.lines[cat] || p.lines.generic);
  }
  roleAddCust(line);
}

function showReview() {
  const p = role.persona;
  const finalScore = role.result === "deal" ? 100 : role.interest;
  const c = role.counters;
  const good = [], bad = [];

  if (c.probe >= 2) good.push("善于提问，挖掘了客户的真实需求");
  if (c.empathy >= 2) good.push("会先认同再引导，客户感受很舒服");
  if (c.value >= 2) good.push("持续输出了产品价值，客户听得进去");
  if (c.close >= 1 && role.result === "deal") good.push("抓住了成交信号，果断促单");
  if (role.result === "deal") good.push("最终拿下成交，漂亮的实战！");

  if (c.probe === 0) bad.push("全程没问客户一个问题——需求是问出来的");
  if (c.hardpush >= 2) bad.push("硬推了 " + c.hardpush + " 次，把客户越推越远");
  if (c.exaggerate >= 1) bad.push("夸大其词触发了客户的戒备心");
  if (role.discountUsed && role.result !== "deal") bad.push("还没建立价值就想降价，利润被白白让掉");
  if (c.perfunctory >= 3) bad.push("多次敷衍应付，客户的热度被消耗了");
  if (role.result === "lose") bad.push("客户兴趣度跌到冰点，跟丢了");
  if (role.result !== "deal" && c.close === 0) bad.push("从没尝试过促单——机会都是要开口争取的");

  if (!good.length) good.push("敢于开口，完成了完整的实战演练");
  if (!bad.length) bad.push("整体节奏平稳，可以尝试更主动地推进成交");

  const tier = finalScore >= 85 ? "🏆 金牌销售 · 教科书级表现"
    : finalScore >= 75 ? "优秀 · 成交可期"
    : finalScore >= 50 ? "不错 · 差临门一脚"
    : finalScore >= 30 ? "沟通有待加强"
    : "需要回炉再造 💪";

  $("#reviewScore").textContent = finalScore;
  $("#reviewScore").style.background = "conic-gradient(var(--gold) " + finalScore + "%, rgba(255,255,255,0.1) 0)";
  $("#reviewTier").textContent = tier;
  $("#reviewGood").innerHTML = good.map((g) => "<li>" + g + "</li>").join("");
  $("#reviewBad").innerHTML = bad.map((b) => "<li>" + b + "</li>").join("");
  $("#reviewTips").innerHTML = p.tips.map((t) => "<li>" + t + "</li>").join("");
  $("#reviewOverlay").classList.remove("hidden");
}

function exitRoleRoom() {
  $("#roleRoom").classList.add("hidden");
  $("#roleSelect").classList.remove("hidden");
}

function initRole() {
  renderPersonaSelect();
  $("#roleSend").addEventListener("click", roleSend);
  $("#roleInput").addEventListener("keydown", (e) => { if (e.key === "Enter") roleSend(); });
  $("#roleBack").addEventListener("click", () => { role = null; exitRoleRoom(); });
  $("#roleEnd").addEventListener("click", () => { if (role && !role.ended) { role.result = role.interest >= 50 ? "quit_ok" : "quit_bad"; } showReview(); });
  $("#reviewAgain").addEventListener("click", () => { startRole(role.persona); });
  $("#reviewSwitch").addEventListener("click", () => { role = null; $("#reviewOverlay").classList.add("hidden"); exitRoleRoom(); });
}

/* =====================================================
   模块三：话术库
   ===================================================== */
let scriptCat = "全部";
let scriptKw = "";

function renderScripts() {
  const pills = $("#scriptPills");
  pills.innerHTML = "";
  SCRIPT_CATS.forEach((c) => {
    const el = document.createElement("span");
    el.className = "pill" + (c === scriptCat ? " active" : "");
    el.textContent = c;
    el.addEventListener("click", () => { scriptCat = c; renderScripts(); });
    pills.appendChild(el);
  });

  const list = $("#scriptList");
  list.innerHTML = "";
  SCRIPTS
    .filter((s) => (scriptCat === "全部" || s.cat === scriptCat) && (!scriptKw || s.t.includes(scriptKw) || s.txt.includes(scriptKw)))
    .forEach((s) => {
      const card = document.createElement("div");
      card.className = "script-card";
      card.innerHTML = "<h4>「" + esc(s.t) + "」</h4><p>" + esc(s.txt) + '</p><button class="copy-btn">📋 一键复制</button>';
      card.querySelector(".copy-btn").addEventListener("click", () => copyText(s.txt));
      list.appendChild(card);
    });
  if (!list.children.length) list.innerHTML = '<p class="sec-sub" style="padding:20px 0">没有匹配的话术，换个关键词试试～</p>';
}

function initScripts() {
  renderScripts();
  $("#scriptSearch").addEventListener("input", (e) => { scriptKw = e.target.value.trim(); renderScripts(); });
}

/* =====================================================
   模块四：客户跟进
   ===================================================== */
const LS_KEY = "aiCoachClientsV1";
let clients = [];

function loadClients() {
  try { clients = JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch (e) { clients = []; }
}
function saveClients() { localStorage.setItem(LS_KEY, JSON.stringify(clients)); }

function stageOf(id) { return STAGES.find((s) => s.id === id) || STAGES[0]; }

function daysText(ts) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  return d === 0 ? "今天添加" : d + "天前添加";
}

function renderClients() {
  const list = $("#clientList");
  list.innerHTML = "";
  if (!clients.length) {
    list.innerHTML = '<p class="sec-sub" style="padding:16px 4px">还没有客户～ 录入第一位客户，AI帮你安排跟进节奏和话术 🚀</p>';
    return;
  }
  clients.slice().sort((a, b) => b.ts - a.ts).forEach((c) => {
    const st = stageOf(c.stage);
    const card = document.createElement("div");
    card.className = "client-card";
    card.innerHTML =
      '<div class="cc-head"><span class="cc-name">' + esc(c.name) + '</span>' +
      '<span class="stage-badge ' + st.cls + '">' + st.label + '</span>' +
      '<span class="cc-days">' + daysText(c.ts) + "</span></div>" +
      (c.note ? '<div class="cc-note">📝 ' + esc(c.note) + "</div>" : "") +
      '<div class="cc-actions"><button class="btn-ghost adv-btn">🤖 AI跟进方案</button><button class="btn-ghost del-btn">删除</button></div>' +
      '<div class="advice-box hidden"></div>';

    const adviceBox = card.querySelector(".advice-box");
    const note = c.note || "暂无备注";
    card.querySelector(".adv-btn").addEventListener("click", () => {
      if (!adviceBox.classList.contains("hidden")) { adviceBox.classList.add("hidden"); return; }
      const tpl = st.tpl(c.name, note);
      adviceBox.innerHTML =
        "<h5>🤖 AI跟进节奏建议</h5>" +
        st.rhythm.map((r) => '<div class="rhy"><b>' + r.when + "</b>：" + esc(r.what) + "</div>").join("") +
        '<h5 style="margin-top:8px">✉️ AI生成的跟进话术</h5>' +
        '<div class="msg-tpl">' + esc(tpl) + "</div>" +
        '<button class="copy-btn" style="margin-top:8px">📋 复制话术</button>';
      adviceBox.querySelector(".copy-btn").addEventListener("click", () => copyText(tpl));
      adviceBox.classList.remove("hidden");
    });
    card.querySelector(".del-btn").addEventListener("click", () => {
      clients = clients.filter((x) => x.id !== c.id);
      saveClients();
      renderClients();
      toast("已删除");
    });
    list.appendChild(card);
  });
}

function initClients() {
  loadClients();
  renderClients();
  $("#cAdd").addEventListener("click", () => {
    const name = $("#cName").value.trim();
    if (!name) { toast("先给客户起个称呼吧～"); return; }
    clients.push({ id: Date.now() + "" + Math.floor(Math.random() * 999), name: name, stage: $("#cStage").value, note: $("#cNote").value.trim(), ts: Date.now() });
    $("#cName").value = "";
    $("#cNote").value = "";
    saveClients();
    renderClients();
    toast("客户已录入，AI跟进方案已就绪 🚀");
  });
}

/* ---------- 启动 ---------- */
initCoach();
initRole();
initScripts();
initClients();
initAICfg();
