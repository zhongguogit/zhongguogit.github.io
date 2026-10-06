// 转折点预测 App - 智能预测算法
// 算法：多维度加权评分 -> 选出最高潜力行动方向 -> AI 生成明日具体行动

const QUESTIONS = [
  {
    key: "stage",
    title: "你当前处于哪个阶段？",
    hint: "选最符合你现状的",
    type: "single",
    options: [
      { label: "🎓 学生 / 刚毕业", value: "student", scores: { skill: 30, network: 10, career: 5, startup: 5, health: 10, self: 25 } },
      { label: "💼 工作 1-3 年（新人）", value: "junior", scores: { skill: 25, network: 15, career: 20, startup: 5, health: 10, self: 10 } },
      { label: "👔 工作 3-5 年", value: "mid", scores: { skill: 15, network: 20, career: 25, startup: 15, health: 10, self: 5 } },
      { label: "🏢 工作 5 年以上", value: "senior", scores: { skill: 10, network: 20, career: 20, startup: 25, health: 15, self: 5 } },
      { label: "🚀 正在创业", value: "founder", scores: { skill: 10, network: 25, career: 5, startup: 30, health: 15, self: 5 } },
      { label: "🧭 迷茫期 / 待业", value: "lost", scores: { skill: 15, network: 10, career: 10, startup: 10, health: 15, self: 35 } }
    ]
  },
  {
    key: "pain",
    title: "当前最让你焦虑的是什么？",
    hint: "选一个最痛的点",
    type: "single",
    options: [
      { label: "💰 收入太低", value: "money", scores: { skill: 25, network: 10, career: 25, startup: 20, health: 5, self: 5 } },
      { label: "📈 感觉没有成长", value: "growth", scores: { skill: 35, network: 10, career: 10, startup: 10, health: 5, self: 10 } },
      { label: "😮‍💨 不喜欢现在做的事", value: "hate", scores: { skill: 10, network: 5, career: 20, startup: 15, health: 10, self: 30 } },
      { label: "🌀 完全没方向", value: "nodir", scores: { skill: 10, network: 5, career: 5, startup: 5, health: 10, self: 40 } },
      { label: "🫂 人际关系 / 没资源", value: "people", scores: { skill: 5, network: 40, career: 10, startup: 15, health: 5, self: 10 } },
      { label: "🩺 健康 / 精力问题", value: "health", scores: { skill: 5, network: 5, career: 5, startup: 5, health: 50, self: 10 } }
    ]
  },
  {
    key: "time",
    title: "每天能投入多少时间改变自己？",
    hint: "真实一点，别高估自己",
    type: "single",
    options: [
      { label: "不到 1 小时", value: "t1", scores: { skill: 5, network: 10, career: 5, startup: 0, health: 15, self: 10 } },
      { label: "1-2 小时", value: "t2", scores: { skill: 15, network: 15, career: 10, startup: 5, health: 10, self: 5 } },
      { label: "2-4 小时", value: "t3", scores: { skill: 20, network: 20, career: 15, startup: 15, health: 5, self: 0 } },
      { label: "4 小时以上", value: "t4", scores: { skill: 15, network: 15, career: 10, startup: 30, health: 0, self: 0 } }
    ]
  },
  {
    key: "risk",
    title: "你的风险承受力？",
    hint: "如果明天做的事可能失败，你能接受吗",
    type: "single",
    options: [
      { label: "🛡️ 保守 - 求稳", value: "low", scores: { skill: 20, network: 10, career: 20, startup: 0, health: 15, self: 10 } },
      { label: "⚖️ 稳健 - 可承受小失败", value: "mid", scores: { skill: 15, network: 20, career: 20, startup: 15, health: 10, self: 5 } },
      { label: "🔥 激进 - 愿赌一把", value: "high", scores: { skill: 10, network: 15, career: 10, startup: 35, health: 5, self: 5 } }
    ]
  },
  {
    key: "buffer",
    title: "你的经济储备能撑多久？",
    hint: "不工作也能活的月数",
    type: "single",
    options: [
      { label: "不到 1 个月", value: "b1", scores: { skill: 20, network: 10, career: 25, startup: 0, health: 10, self: 5 } },
      { label: "1-3 个月", value: "b2", scores: { skill: 15, network: 15, career: 20, startup: 10, health: 10, self: 5 } },
      { label: "3-6 个月", value: "b3", scores: { skill: 10, network: 15, career: 15, startup: 25, health: 10, self: 5 } },
      { label: "6 个月以上", value: "b4", scores: { skill: 5, network: 10, career: 10, startup: 35, health: 10, self: 10 } }
    ]
  },
  {
    key: "goal",
    title: "1 年后你最想变成什么样？",
    hint: "选最核心的一个",
    type: "single",
    options: [
      { label: "💵 收入翻倍", value: "g_money", scores: { skill: 25, network: 15, career: 25, startup: 15, health: 0, self: 0 } },
      { label: "🧠 掌握一项硬技能", value: "g_skill", scores: { skill: 40, network: 5, career: 10, startup: 5, health: 0, self: 5 } },
      { label: "🌐 建立人脉圈", value: "g_net", scores: { skill: 5, network: 40, career: 10, startup: 15, health: 0, self: 0 } },
      { label: "🚀 开始自己的事业", value: "g_start", scores: { skill: 10, network: 15, career: 0, startup: 45, health: 0, self: 0 } },
      { label: "💪 身心健康", value: "g_health", scores: { skill: 0, network: 5, career: 0, startup: 0, health: 45, self: 10 } },
      { label: "🧭 找到人生方向", value: "g_dir", scores: { skill: 10, network: 5, career: 5, startup: 0, health: 5, self: 40 } }
    ]
  }
];

const CATEGORIES = {
  skill:   { icon: "🎯", name: "技能突破", color: "#3b82f6" },
  network: { icon: "🤝", name: "人脉连接", color: "#06b6d4" },
  career:  { icon: "💼", name: "职业跃迁", color: "#10b981" },
  startup: { icon: "🚀", name: "创业试水", color: "#f59e0b" },
  health:  { icon: "💪", name: "健康筑基", color: "#ef4444" },
  self:    { icon: "🔍", name: "自我探索", color: "#8b5cf6" }
};

let answers = {};
let currentQ = 0;

function $(id) { return document.getElementById(id); }

function renderQuestion() {
  const q = QUESTIONS[currentQ];
  $("q-title").textContent = q.title;
  $("q-hint").textContent = q.hint;
  const opts = $("q-options");
  opts.innerHTML = q.options.map((o, i) =>
    `<div class="option" data-val="${o.value}" data-i="${i}">
      <div class="dot"></div><span>${o.label}</span>
    </div>`
  ).join("");
  opts.querySelectorAll(".option").forEach(el => {
    el.onclick = () => {
      opts.querySelectorAll(".option").forEach(e => e.classList.remove("selected"));
      el.classList.add("selected");
      answers[q.key] = q.options[+el.dataset.i];
      $("btn-next").disabled = false;
    };
  });
  $("btn-next").disabled = !answers[q.key];
  $("btn-prev").style.visibility = currentQ === 0 ? "hidden" : "visible";
  $("progress-fill").style.width = ((currentQ) / QUESTIONS.length * 100) + "%";
  $("progress-label").textContent = `第 ${currentQ + 1} / ${QUESTIONS.length} 题`;
}

function computeScores() {
  const totals = { skill: 0, network: 0, career: 0, startup: 0, health: 0, self: 0 };
  Object.values(answers).forEach(a => {
    Object.entries(a.scores).forEach(([k, v]) => { totals[k] += v; });
  });
  // 归一化到 0-100
  const max = Math.max(...Object.values(totals), 1);
  const normalized = {};
  Object.entries(totals).forEach(([k, v]) => { normalized[k] = Math.round(v / max * 100); });
  return normalized;
}

function pickTop(scores) {
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
}

async function generatePrediction() {
  $("screen-questions").classList.add("hidden");
  $("screen-predicting").classList.remove("hidden");
  const scores = computeScores();
  const [topKey, topScore] = pickTop(scores);
  const top = CATEGORIES[topKey];

  // 用 AI 生成具体明日行动
  const stageLabel = answers.stage.label;
  const painLabel = answers.pain.label;
  const goalLabel = answers.goal.label;
  const aiPrompt = `你是一位人生战略顾问。用户信息：
阶段：${stageLabel}
痛点：${painLabel}
每天可投入：${answers.time.label}
风险承受：${answers.risk.label}
经济储备：${answers.buffer.label}
1年目标：${goalLabel}
预测方向：${top.icon} ${top.name}（匹配度 ${topScore}%）

请用中文给出：
1. "明天第一件该做的事"——一个具体、可执行、30分钟内能开始的行动（不超过30字）
2. 为什么这是人生转折点（100字内，结合用户情况）
3. 难度（低/中/高）和预计见效时间
用 JSON 返回：{"action":"...","reason":"...","difficulty":"...","timeline":"..."}`;

  let aiResult = null;
  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: aiPrompt }], model: "openai", jsonMode: true })
    });
    const text = await res.text();
    const match = text.match(/\{[\s\S]*\}/);
    if (match) aiResult = JSON.parse(match[0]);
  } catch (e) { console.warn("AI 生成失败，使用模板", e); }

  const fallback = {
    action: `今天就开始${top.name}：花30分钟${topKey === 'skill' ? '学一项新技能的第一课' : topKey === 'network' ? '联系一位很久没聊的朋友' : topKey === 'career' ? '更新简历并投出1份' : topKey === 'startup' ? '写下你的第一个商业想法' : topKey === 'health' ? '出门快走30分钟' : '写下你的3个优势和3个困惑'}`,
    reason: `根据你的阶段（${stageLabel}）、痛点（${painLabel}）和目标（${goalLabel}），${top.name}是当前投入产出比最高的方向。一个微小但正确的起步，可能成为你人生轨迹的分水岭。`,
    difficulty: "中",
    timeline: "1-3 个月可见变化"
  };
  const result = aiResult || fallback;

  showResult(top, topScore, scores, result);
}

function showResult(top, topScore, scores, result) {
  $("screen-predicting").classList.add("hidden");
  $("screen-result").classList.remove("hidden");
  $("progress-fill").style.width = "100%";
  $("progress-label").textContent = "预测完成";

  $("result-action").textContent = result.action;
  $("result-reason").textContent = result.reason;

  const conf = Math.min(95, 55 + Math.floor(topScore * 0.4));
  $("m-conf").textContent = conf + "%";
  $("m-conf").style.color = conf >= 75 ? "var(--green)" : conf >= 55 ? "var(--gold)" : "var(--red)";
  $("m-diff").textContent = result.difficulty;
  $("m-time").textContent = result.timeline;

  // 条形图
  const chart = $("bar-chart");
  chart.innerHTML = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => {
      const c = CATEGORIES[k];
      return `<div class="bar-row">
        <div class="bar-label">${c.icon} ${c.name}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${v}%;background:${c.color}"></div></div>
        <div class="bar-score">${v}</div>
      </div>`;
    }).join("");
}

$("btn-next").onclick = () => {
  if (currentQ < QUESTIONS.length - 1) { currentQ++; renderQuestion(); }
  else { generatePrediction(); }
};
$("btn-prev").onclick = () => { if (currentQ > 0) { currentQ--; renderQuestion(); } };
$("btn-restart").onclick = () => {
  answers = {}; currentQ = 0;
  $("screen-result").classList.add("hidden");
  $("screen-questions").classList.remove("hidden");
  renderQuestion();
};

renderQuestion();
