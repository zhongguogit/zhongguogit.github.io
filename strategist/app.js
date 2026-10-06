// 军师阁 - 多军师献策 + 任务分配 + 锦囊妙计
const MASTERS = [
  { id: "zhugeliang", name: "诸葛亮", avatar: "🪶", motto: "运筹帷幄之中，决胜千里之外", style: "全局战略 · 三分天下", on: true },
  { id: "zhangliang", name: "张良", avatar: "📜", motto: "运筹策帷帐之中，决胜于千里之外", style: "曲线救国 · 借势而为", on: true },
  { id: "hanxin", name: "韩信", avatar: "⚔️", motto: "韩信点兵，多多益善", style: "战术执行 · 背水一战", on: true },
  { id: "sunbin", name: "孙膑", avatar: "🎯", motto: "围魏救赵，田忌赛马", style: "以弱胜强 · 避实击虚", on: false },
  { id: "guojia", name: "郭嘉", avatar: "⚡", motto: "十胜十败，兵贵神速", style: "冒险激进 · 速战速决", on: false },
  { id: "wangyangming", name: "王阳明", avatar: "🧘", motto: "知行合一，致良知", style: "心学内圣 · 破心中贼", on: false }
];

function $(id) { return document.getElementById(id); }

function toggleMaster(id) {
  const m = MASTERS.find(x => x.id === id);
  m.on = !m.on;
  const el = document.querySelector(`[data-master="${id}"]`);
  el.classList.toggle("on", m.on);
}

function renderMasters() {
  $("master-list").innerHTML = MASTERS.map(m =>
    `<div class="master ${m.on ? 'on' : ''}" data-master="${m.id}" onclick="toggleMaster('${m.id}')">
      <div class="avatar">${m.avatar}</div>
      <div class="name">${m.name}</div>
      <div class="motto">${m.motto}</div>
    </div>`
  ).join("");
}

async function convene() {
  const task = $("task-input").value.trim();
  if (!task) { alert("请先输入要商议的任务！"); return; }
  const people = $("people-input").value.trim() || "团队成员";
  const deadline = $("deadline-input").value.trim() || "尽快";
  const budget = $("budget-input").value.trim() || "不限";
  const selected = MASTERS.filter(m => m.on);
  if (selected.length === 0) { alert("请至少选择一位军师！"); return; }

  $("convene-btn").disabled = true;
  $("convene-btn").innerHTML = '<span class="spinner"></span>军师们正在商议…';
  $("result-area").classList.remove("hidden");
  $("result-area").scrollIntoView({ behavior: "smooth" });

  const masterNames = selected.map(m => `${m.name}（${m.style}）`).join("、");
  const prompt = `你现在扮演中国古代的多位军师，集体为用户出谋划策。

【用户任务】${task}
【参与人员】${people}
【时间要求】${deadline}
【预算】${budget}
【参与军师】${masterNames}

请按以下格式输出（必须严格使用这些标记，不要省略任何部分）：

【形势】
用2-3句话分析当前形势与关键矛盾。

【各军师献策】
` + selected.map(m => `${m.name}（${m.avatar}）：
给出2-3条具体建议，风格要符合${m.style}的特点。`).join("\n") + `

【任务分配表】
请用Markdown表格输出，列：负责人 | 具体任务 | 完成时间 | 验收标准。根据参与人员"${people}"分配，确保每人任务明确、合力完成。

【总体妙计】
给出一条最核心的总策略，一句话概括。

【风险与应对】
列出2-3个可能的风险及应对方案。

【锦囊妙计】
给出一个出人意料的、能扭转局面的奇招（适合作为关键时刻的秘密武器）。

用中文，语言要生动有古风，但内容要务实可执行。`;

  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "openai" })
    });
    const text = await res.text();
    parseAndRender(text, selected);
  } catch (e) {
    $("advice-grid").innerHTML = `<div style="color:#f5b7b1">⚠️ 军师商议失败：${e.message}，请稍后再试。</div>`;
  }
  $("convene-btn").disabled = false;
  $("convene-btn").textContent = "🔄 再次召集军师";
}

function parseAndRender(text, selected) {
  const get = (marker) => {
    const idx = text.indexOf(`【${marker}】`);
    if (idx === -1) return "";
    const next = text.indexOf("【", idx + marker.length + 2);
    return text.slice(idx + marker.length + 2, next === -1 ? undefined : next).trim();
  };

  // 形势
  $("situation").textContent = get("形势") || "（形势分析待补充）";

  // 各军师献策
  const adviceHTML = selected.map(m => {
    // 找到该军师的献策
    const start = text.indexOf(`${m.name}（${m.avatar}）`);
    let body = "";
    if (start !== -1) {
      const after = text.slice(start + m.name.length + m.avatar.length + 3);
      const nextMaster = selected.find(s => s.id !== m.id && after.indexOf(`${s.name}（`) !== -1);
      const end = nextMaster ? after.indexOf(`${nextMaster.name}（`) : after.length;
      body = after.slice(0, end).trim();
    }
    if (!body) body = `（${m.name}的献策见下方总体方案）`;
    return `<div class="advice-card">
      <div class="advice-head">
        <div class="advice-avatar">${m.avatar}</div>
        <div><div class="advice-name">${m.name}</div><div class="advice-style">${m.style}</div></div>
      </div>
      <div class="advice-body">${body}</div>
    </div>`;
  }).join("");
  $("advice-grid").innerHTML = adviceHTML || `<div style="color:var(--muted)">（暂无献策内容）</div>`;

  // 任务分配表
  const taskText = get("任务分配表");
  $("task-table").innerHTML = taskText ? markdownTableToHTML(taskText) : `<tr><td colspan="4" style="text-align:center;color:var(--muted)">（任务分配待补充）</td></tr>`;

  // 总体妙计
  $("master-plan").textContent = get("总体妙计") || "（待补充）";

  // 风险
  $("risks").textContent = get("风险与应对") || "（待补充）";

  // 锦囊
  const jinNang = get("锦囊妙计");
  $("jinnang-content").textContent = jinNang || "（暂无锦囊）";
  $("jinnang-content").classList.add("hidden");
  $("jinnang-hint").classList.remove("hidden");
}

function markdownTableToHTML(md) {
  const lines = md.split("\n").filter(l => l.includes("|")).map(l => l.trim());
  if (lines.length < 2) return `<tr><td colspan="4"><pre>${md}</pre></td></tr>`;
  const headers = lines[0].split("|").map(s => s.trim()).filter(s => s);
  const rows = lines.slice(2).map(l => l.split("|").map(s => s.trim()).filter(s => s));
  let html = "<thead><tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr></thead><tbody>";
  rows.forEach(r => {
    html += "<tr>" + headers.map((_, i) => `<td>${r[i] || ""}</td>`).join("") + "</tr>";
  });
  html += "</tbody>";
  return html;
}

function revealJinNang() {
  $("jinnang-content").classList.toggle("hidden");
  $("jinnang-hint").classList.toggle("hidden");
}

// ===== 今日军师排行榜 =====
const TODAY = new Date().toISOString().slice(0, 10);

function getVotes() {
  const raw = localStorage.getItem("strategist_votes") || "{}";
  const data = JSON.parse(raw);
  // 每日重置
  if (data.date !== TODAY) {
    const fresh = { date: TODAY, votes: {} };
    MASTERS.forEach(m => fresh.votes[m.id] = 0);
    localStorage.setItem("strategist_votes", JSON.stringify(fresh));
    return fresh;
  }
  // 补齐新军师
  MASTERS.forEach(m => { if (data.votes[m.id] === undefined) data.votes[m.id] = 0; });
  return data;
}

function voteFor(id) {
  const data = getVotes();
  data.votes[id] = (data.votes[id] || 0) + 1;
  localStorage.setItem("strategist_votes", JSON.stringify(data));
  renderLeaderboard();
  // 反馈动画
  const btn = document.querySelector(`[data-vote="${id}"]`);
  if (btn) { btn.textContent = "✅ 已投票"; btn.style.opacity = ".6"; setTimeout(() => renderLeaderboard(), 1500); }
}

function renderLeaderboard() {
  const data = getVotes();
  const ranked = [...MASTERS].sort((a, b) => (data.votes[b.id] || 0) - (data.votes[a.id] || 0));
  const medals = ["🥇", "🥈", "🥉"];
  const maxVotes = Math.max(1, ...ranked.map(m => data.votes[m.id] || 0));
  $("leaderboard").innerHTML = ranked.map((m, i) => {
    const votes = data.votes[m.id] || 0;
    const pct = (votes / maxVotes * 100).toFixed(0);
    const medal = medals[i] || `<span style="color:var(--muted)">${i + 1}</span>`;
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:22px;width:32px;text-align:center">${medal}</div>
      <div style="font-size:24px">${m.avatar}</div>
      <div style="flex:1">
        <div style="color:var(--gold-light);font-weight:600;font-size:14px">${m.name} <span style="color:var(--muted);font-size:11px;font-weight:400">${m.style}</span></div>
        <div style="height:6px;background:rgba(0,0,0,0.4);border-radius:3px;margin-top:5px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--gold),var(--red));border-radius:3px;transition:width .4s"></div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="color:var(--gold-light);font-weight:700;font-size:16px">${votes}</div>
        <div style="font-size:10px;color:var(--muted)">票</div>
      </div>
      <button data-vote="${m.id}" onclick="voteFor('${m.id}')" style="padding:6px 12px;border-radius:8px;border:1px solid var(--gold);background:rgba(212,175,55,0.1);color:var(--gold-light);cursor:pointer;font-size:12px">👍 投他</button>
    </div>`;
  }).join("");
  $("leaderboard-date").textContent = `${TODAY} 每日零点重置`;
}

renderMasters();
renderLeaderboard();
window.toggleMaster = toggleMaster;
window.convene = convene;
window.revealJinNang = revealJinNang;
window.voteFor = voteFor;
