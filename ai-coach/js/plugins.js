/* =====================================================
   v1.2 · 开放插件系统（人人皆可参与开发）
   插件 = 纯JSON包（话题 + 快捷问题），导入即装，安全可控
   ===================================================== */

const PLUG_KEY = "aiCoachPluginsV2";
const customChips = [];

/* ---------- 存储 ---------- */
function loadPlugins() {
  try { return JSON.parse(localStorage.getItem(PLUG_KEY)) || []; } catch (e) { return []; }
}
function savePlugins(list) { localStorage.setItem(PLUG_KEY, JSON.stringify(list)); }

/* ---------- 应用/卸载插件 ---------- */
function applyPlugin(pl) {
  (pl.code.topics || []).forEach((t) => {
    if (!t.id || !t.t || !t.a) return;
    t._plugin = pl.id;
    t.kws = t.kws || [];
    const exist = COACH_KB.findIndex((k) => k.id === t.id);
    if (exist >= 0) COACH_KB[exist] = t; else COACH_KB.push(t);
  });
  (pl.code.chips || []).forEach((c) => {
    const item = typeof c === "string" ? { t: c } : c;
    item._plugin = pl.id;
    if (!customChips.some((x) => x.t === item.t)) customChips.push(item);
  });
  refreshCoachChips();
  renderMarket();
}

function removePlugin(id) {
  for (let i = COACH_KB.length - 1; i >= 0; i--) if (COACH_KB[i]._plugin === id) COACH_KB.splice(i, 1);
  for (let i = customChips.length - 1; i >= 0; i--) if (customChips[i]._plugin === id) customChips.splice(i, 1);
  savePlugins(loadPlugins().filter((p) => p.id !== id));
  refreshCoachChips();
  renderMarket();
  toast("插件已卸载");
}

/* ---------- 接管教练快捷chips，追加插件chips ---------- */
function refreshCoachChips() {
  const box = $("#coachChips");
  if (!box) return;
  const hasCustom = Array.from(box.children).some((el) => el.dataset && el.dataset.custom === "1");
  $$("#coachChips [data-custom]").forEach((el) => el.remove());
  if (!box.children.length && !customChips.length) return;
  customChips.forEach((c) => {
    const el = document.createElement("span");
    el.className = "chip";
    el.dataset.custom = "1";
    el.textContent = "🧩 " + c.t;
    el.addEventListener("click", () => coachAsk(c.t));
    box.appendChild(el);
  });
  box.classList.remove("hidden");
}
if (typeof coachChips === "function") {
  const _origChips = coachChips;
  coachChips = function (excludeId, count) {
    _origChips(excludeId, count);
    refreshCoachChips();
  };
}

/* ---------- 全局开发接口 ---------- */
window.AICoach = {
  version: "1.2",
  /** 注册教练话题 {id,kws,t,a} 数组或单个（会话内生效） */
  registerTopics(topics, pluginId) {
    const arr = Array.isArray(topics) ? topics : [topics];
    arr.forEach((t) => {
      t._plugin = pluginId || "api";
      const exist = COACH_KB.findIndex((k) => k.id === t.id);
      if (exist >= 0) COACH_KB[exist] = t; else COACH_KB.push(t);
    });
    if (typeof coachChips === "function") coachChips(null, 3);
    return { ok: true, count: arr.length };
  },
  /** 注册教练快捷问题（数组字符串） */
  registerChips(chips, pluginId) {
    (Array.isArray(chips) ? chips : [chips]).forEach((t) => {
      customChips.push({ t: t, _plugin: pluginId || "api" });
    });
    refreshCoachChips();
    return { ok: true };
  },
  /** 当前已安装插件列表 */
  list() { return loadPlugins().map((p) => ({ id: p.id, name: p.name, version: p.version })); }
};

/* ---------- 插件广场 UI ---------- */
function renderMarket() {
  const list = $("#pluginList");
  if (!list) return;
  const installed = loadPlugins();
  if (!installed.length) {
    list.innerHTML = '<p class="sec-sub" style="padding:8px 2px">还没有插件～ 点上方「安装示例插件」体验，或复制模板自己做一个 🛠️</p>';
    return;
  }
  list.innerHTML = "";
  installed.forEach((p) => {
    const card = document.createElement("div");
    card.className = "client-card";
    const nTopics = (p.code.topics || []).length, nChips = (p.code.chips || []).length;
    card.innerHTML = '<div class="cc-head"><span style="font-size:20px">' + (p.icon || "🧩") + '</span><span class="cc-name">' + esc(p.name) +
      '</span><span class="stage-badge st-deal">v' + esc(p.version || "1.0.0") + '</span><span class="cc-days">' + esc(p.author || "匿名开发者") + '</span></div>' +
      '<div class="cc-note">' + esc(p.desc || "") + '<br>🧠 贡献 ' + nTopics + ' 个话题 · 💬 ' + nChips + ' 个快捷问题</div>' +
      '<div class="cc-actions"><button class="btn-ghost un-btn">🗑️ 卸载</button></div>';
    card.querySelector(".un-btn").addEventListener("click", () => removePlugin(p.id));
    list.appendChild(card);
  });
}

function importPlugin() {
  const raw = $("#plugInput").value.trim();
  if (!raw) { toast("先粘贴插件JSON哦～"); return; }
  let pack;
  try { pack = JSON.parse(raw); } catch (e) { toast("JSON格式有误：" + e.message); return; }
  const arr = Array.isArray(pack) ? pack : [pack];
  let okCount = 0;
  const store = loadPlugins();
  arr.forEach((p) => {
    if (!p.id || !p.name || !p.code) return;
    p.version = p.version || "1.0.0";
    p.icon = p.icon || "🧩";
    const idx = store.findIndex((x) => x.id === p.id);
    if (idx >= 0) store[idx] = p; else store.push(p);
    applyPlugin(p);
    okCount++;
  });
  savePlugins(store);
  $("#plugInput").value = "";
  if (okCount) toast("✅ 成功安装 " + okCount + " 个插件，教练已更新！");
  else toast("没有有效的插件包（需要 id/name/code 字段）");
}

function installSample() {
  const sample = {
    id: "sample-realestate", name: "示例：房产中介话术包", icon: "🏠", author: "社区开发者·老陈", version: "1.1.0",
    desc: "示例插件：展示任何人都能给AI教练加装行业能力。把里面的内容换成你的行业即可",
    code: {
      topics: [
        { id: "re-visit", kws: ["带看", "带看话术", "约客户看房"], t: "约客户带看的黄金话术", a: "<b>带看三步法：</b><ul><li><b>看前铺垫</b>：提前发3张房屋实拍+1个缺点说明，先讲缺点建立信任</li><li><b>看中节奏</b>：先进次卧再进主卧，好戏放后面</li><li><b>看后逼定</b>：当晚22点前必须回访</li></ul><div class=\"script-box\">回访话术：「X姐，今天那套您回去后家里人怎么说？我就问一句——如果价格能谈到您的心理位，您今天能定吗？」</div>" },
        { id: "re-price", kws: ["业主降价", "谈价", "砍价"], t: "帮业主降价谈判术", a: "<b>让业主降价的关键：数据+订单压迫。</b><div class=\"script-box\">「哥，同户型上周成交价X万，咱挂X万已经3周没带看了。现在有个客户出价X万5，差2万他今晚就签——这2万您让，我保证他马上签；不让，房子还得再挂俩月。您选哪个？」</div>" }
      ],
      chips: ["带看话术怎么讲", "怎么跟业主谈降价"]
    }
  };
  const store = loadPlugins();
  if (!store.some((p) => p.id === sample.id)) { store.push(sample); savePlugins(store); }
  applyPlugin(sample);
  toast("✅ 示例插件已安装，去「教练」页看看新话题！");
}

const PLUGIN_TEMPLATE = JSON.stringify({
  id: "my-pack-001", name: "我的行业话术包", icon: "🏷️", author: "你的名字", version: "1.0.0",
  desc: "一句话说明这个包做什么",
  code: {
    topics: [
      { id: "my-topic-1", kws: ["关键词1", "关键词2"], t: "话题标题（也会出现在教练问答里）", a: "<b>回答正文，支持 &lt;b&gt;加粗&lt;/b&gt;、&lt;ul&gt;&lt;li&gt;列表</b>" },
      { id: "my-topic-2", kws: ["关键词3"], t: "第二个话题", a: "正文…<div class=\"script-box\">话术示例框</div>" }
    ],
    chips: ["打开教练页的快捷问题", "第二个快捷问题"]
  }
}, null, 2);

/* ---------- 社区插件拉取 ---------- */
async function pullCommunity(silent) {
  const list = $("#communityList");
  if (!list) return;
  if (!silent) list.innerHTML = '<p class="sec-sub">🔄 正在拉取社区插件目录…</p>';
  try {
    const res = await fetch("plugins/index.json", { cache: "no-store" });
    const idx = await res.json();
    const items = idx.plugins || [];
    if (!items.length) { list.innerHTML = '<p class="sec-sub">社区插件暂空，第一个贡献者就是你 👇</p>'; return; }
    list.innerHTML = "";
    items.forEach((m) => {
      const card = document.createElement("div");
      card.className = "client-card";
      const installed = loadPlugins().some((p) => p.id === m.id);
      card.innerHTML = '<div class="cc-head"><span style="font-size:20px">' + (m.icon || "🧩") + '</span><span class="cc-name">' + esc(m.name) +
        '</span><span class="stage-badge st-new">v' + esc(m.version || "1.0.0") + '</span><span class="cc-days">' + esc(m.author || "社区") + '</span></div>' +
        '<div class="cc-note">' + esc(m.desc || "") + '</div>' +
        '<div class="cc-actions"><button class="btn-ghost inst-btn">' + (installed ? "✅ 已安装 · 点击更新" : "⚡ 一键安装") + '</button></div>';
      card.querySelector(".inst-btn").addEventListener("click", async () => {
        try {
          const r = await fetch("plugins/" + m.file, { cache: "no-store" });
          const pack = await r.json();
          pack.id = pack.id || m.id;
          removePluginSilent(pack.id);
          const store = loadPlugins();
          const i = store.findIndex((x) => x.id === pack.id);
          if (i >= 0) store[i] = pack; else store.push(pack);
          savePlugins(store);
          applyPlugin(pack);
          pullCommunity(true);
          toast("✅ 已安装「" + pack.name + "」");
        } catch (e) { toast("拉取失败：" + e.message); }
      });
      list.appendChild(card);
    });
  } catch (e) {
    list.innerHTML = '<p class="sec-sub">社区目录暂不可用（本地模式，部署后自动生效）</p>';
  }
}

function removePluginSilent(id) {
  for (let i = COACH_KB.length - 1; i >= 0; i--) if (COACH_KB[i]._plugin === id) COACH_KB.splice(i, 1);
  for (let i = customChips.length - 1; i >= 0; i--) if (customChips[i]._plugin === id) customChips.splice(i, 1);
}

function initPlugins() {
  loadPlugins().forEach(applyPlugin);
  renderMarket();
  $("#plugImport").addEventListener("click", importPlugin);
  $("#plugSample").addEventListener("click", installSample);
  $("#plugTpl").addEventListener("click", () => copyText(PLUGIN_TEMPLATE));
  $("#plugPull").addEventListener("click", () => pullCommunity());
  pullCommunity();
}
initPlugins();
