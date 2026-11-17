/* =====================================================
   v1.1 · 版本系统 & 更新日志（迭代速度看得见）
   ===================================================== */

const APP_VERSION = "v1.3";
const CHANGELOG = [
  {
    v: "v1.3", date: "2026-11-18", items: [
      "⚡ 热拔插器2.0：社区插件一键安装/卸载/更新，全网上线秒级生效",
      "🌐 社区插件通道：开发者提PR → 合并 → 所有用户「拉取最新」即装",
      "🏅 社区贡献榜上线：提交PR即上榜，作品署名全网可见",
      "🎁 奖励办法公开征集：欢迎任何人提PR写下激励方案，采纳即由你署名上线"
    ]
  },
  {
    v: "v1.2", date: "2026-11-18", items: [
      "🔌 开放插件系统上线：人人皆可参与开发，行业话术包做成插件即装即用",
      "🛠️ 插件广场：复制模板→改内容→导入，3分钟装上你的独家知识",
      "⚙️ 开发者JS API：AICoach.registerTopics / registerChips / list",
      "🎁 示例插件「房产中介话术包」，安装后教练即刻学会新本领"
    ]
  },
  {
    v: "v1.1", date: "2026-11-18", items: [
      "🧠 教练大脑升级：说「帮我写朋友圈文案 / 开场白 / 跟进话术 / 抖音口播稿」，一句话直接生成，按你的营销档案个性化",
      "💬 支持追问上下文：「换个说法」「再来一条」「再详细点」「举个例子」，追着问不停",
      "🚀 可安装到手机桌面（添加到主屏幕，全屏App体验）",
      "📋 全新更新日志系统，每次迭代看得见"
    ]
  },
  {
    v: "v1.0", date: "2026-11-18", items: [
      "💬 教练问答：15大成交主题知识库随问随答",
      "🎯 实战演练：4类AI客户陪练 + 兴趣度实时反馈 + 自动复盘打分",
      "📚 话术库：27条现成话术，6大分类一键复制",
      "🎨 创作工坊：营销档案 + 每日自动任务 + AI文生图配文案 + 口播稿分镜",
      "👥 客户跟进：自动安排节奏、自动生成跟进话术"
    ]
  }
];

function renderLog() {
  $("#logList").innerHTML = CHANGELOG.map((c) =>
    '<div class="log-item"><h4>' + c.v + " · " + c.date + "</h4><ul>" +
    c.items.map((i) => "<li>" + i + "</li>").join("") + "</ul></div>"
  ).join("");
}

function initUpgrade() {
  // 顶部版本徽章（替换原今日一招位）
  const chip = $("#topDaily");
  chip.textContent = APP_VERSION + " ⚡";
  chip.title = "点击查看更新日志";
  chip.style.cursor = "pointer";
  chip.addEventListener("click", () => { renderLog(); $("#logOverlay").classList.remove("hidden"); });
  $("#logClose").addEventListener("click", () => $("#logOverlay").classList.add("hidden"));

  // 教练页补一条今日一招
  if (typeof coachAdd === "function") {
    coachAdd("coach", "💡 <b>今日一招：</b>" + pick(DAILY_TIPS), "🤖");
  }

  // 新版本升级弹窗
  const seen = localStorage.getItem("aiCoachSeenVer");
  if (seen !== APP_VERSION) {
    renderLog();
    $("#logOverlay").classList.remove("hidden");
    localStorage.setItem("aiCoachSeenVer", APP_VERSION);
  }
}
initUpgrade();
