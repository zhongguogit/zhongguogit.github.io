/* =====================================================
   创作工坊 · 营销档案 / 每日自动任务 / 文生图 / 图生图 / 短视频
   ===================================================== */
/* 依赖 app.js 中的全局工具：$ $$ esc pick toast copyText shuffle */

const IMG_EP = "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt={prompt}&image_size={image_size}";
const imgURL = (prompt, size) => IMG_EP.replace("{prompt}", encodeURIComponent(prompt)).replace("{image_size}", size);

/* ---------- 营销档案 ---------- */
const P_KEY = "aiCoachProfileV1";
function loadProfile() {
  try { return JSON.parse(localStorage.getItem(P_KEY)) || {}; } catch (e) { return {}; }
}
function profile() {
  const p = loadProfile();
  return {
    product: p.product || "儿童营养定制方案",
    selling: p.selling || "两周改善孩子挑食",
    audience: p.audience || "25-40岁宝妈"
  };
}

/* ---------- 文生图模板 ---------- */
const TPLS = [
  {
    id: "seeding", name: "朋友圈种草图", size: "portrait_4_3",
    prompt: (p, s) => "社交媒体生活方式照片：温馨明亮的现代厨房，年轻妈妈微笑着看孩子开心吃健康辅食，" + s + "，晨光柔和，浅景深，真实自然，高清摄影，画面无文字",
    cap: (p) => "每天最治愈的瞬间，就是看着孩子大口吃饭的样子😋\n自从用对方法，挑食的毛病真的在改善——\n" + p.selling + "，想了解的姐妹评论区扣1，我把方法整理给你～\n#宝妈日常 #挑食宝宝 " + (p.product || "")
  },
  {
    id: "poster", name: "产品海报", size: "portrait_4_3",
    prompt: (p, s) => "高端电商产品海报背景：" + p.product + "，琥珀色玻璃瓶置于简洁展台，新鲜水果绿叶环绕，" + s + "，蜜桃奶油色渐变背景，影棚灯光，下方三分之一留白供文案排版，无文字",
    cap: (p) => "📢 很多姐妹问的" + p.product + "来啦\n✅ " + p.selling + "\n✅ 营养师一对一指导，不是标准化产品\n✅ 7天体验不满意全额退，零风险\n本月体验名额只剩3个，私我锁定～"
  },
  {
    id: "avatar", name: "人设头像", size: "square",
    prompt: (p, s) => "职业形象照：30岁左右亲和力强的中国女性营养顾问，微笑自信，鼠尾草绿衬衫，浅米色干净背景，柔光，" + s + "，高清人像，居中构图",
    cap: () => "换上新头像啦😊 做营养顾问第3年，专注帮妈妈们解决孩子吃饭难题。有困惑随时来聊，交个朋友～"
  },
  {
    id: "banner", name: "活动横幅", size: "landscape_16_9",
    prompt: (p, s) => "宽幅活动宣传图：明亮现代的社区课堂，一群年轻妈妈微笑记笔记，前两侧留白供文字排版，" + s + "，空气感日光，真实摄影，无文字",
    cap: (p) => "📣 本周五晚8点·免费直播课\n《" + p.selling + "·家长必听的一堂课》\n只开放20个名额，评论区扣「1」帮你留位～"
  },
  {
    id: "review", name: "客户见证图", size: "square",
    prompt: (p, s) => "左右对比见证图：左半边学龄前儿童皱眉推开饭碗，右半边同一个孩子开心大口吃饭、空碗见底，同一儿童形象一致，家庭餐厅明亮背景，" + s + "，真实摄影，中间分割线，无文字",
    cap: (p) => "不是所有孩子都天生爱吃饭🍜\n左边的照片是朵朵上个月，右边是现在。\n妈妈的原话：'终于不用追着喂了！'\n" + p.selling + "，下一个见证的，就是你家宝贝😊"
  },
  {
    id: "kbcard", name: "知识干货卡", size: "square",
    prompt: (p, s) => "知识分享类配图：简洁明亮俯拍，木桌上一本翻开笔记本、水果、牛奶和笔，干净清爽排版留白，" + s + "，柔和自然光，无文字",
    cap: (p) => "挑食误区自查表📝\n1️⃣ 追着喂 → 越喂越拒食\n2️⃣ 零食补位 → 正餐更没胃口\n3️⃣ 强迫吃完 → 建立负面联想\n中了两条以上的，评论区举个手，我发你《" + p.selling + "·一周食谱》～"
  }
];

/* ---------- 每日自动任务 ---------- */
const PLAN_POOL = [
  {
    time: "07:30", type: "发圈", title: "早圈 · 价值种草",
    cap: (p) => "早上好呀☀️ 很多妈妈问我孩子不爱吃饭怎么办，其实80%是方法问题——今天分享一个实用小技巧：把食物做成小动物形状，接受度提升一倍。\n" + p.selling + "，晚上8点直播间细讲，记得来～"
  },
  {
    time: "12:30", type: "发圈", title: "午圈 · 客户见证",
    cap: (p) => "客户反馈截图来啦📸 李姐家宝宝用了两周，昨天主动要添第二碗饭。做这行最大的成就感，就是每天收到这样的消息。\n" + p.selling + "，想让孩子也告别追着喂的，私我～"
  },
  {
    time: "15:00", type: "私聊", title: "跟进3位意向客户",
    cap: (p) => "跟进话术（复制即用）：\n「姐，想到你上次提到孩子吃饭的问题😊 刚整理了一份" + p.selling + "的一周食谱，先发你参考，不买没关系，对你肯定有帮助～」"
  },
  {
    time: "20:00", type: "发圈", title: "晚圈 · 促单转化",
    cap: (p) => "🌙 睡前说个事：本月" + p.product + "体验名额只剩最后3个了，7天不满意全额退，等于零风险试试。\n孩子吃饭这事拖不得，评论区扣1，我帮你留名额～"
  },
  {
    time: "21:30", type: "复盘", title: "复盘 + 明日计划",
    cap: () => "复盘三问：\n1. 今天加了几个人？聊透了几个？\n2. 哪句话没说到位？\n3. 明天的3个动作是什么？（加3人/聊5人/发2圈）\n动作到位，业绩自然来💪"
  },
  {
    time: "22:00", type: "私聊", title: "唤醒1位沉睡客户",
    cap: (p) => "唤醒话术（复制即用）：\n「姐好久不见！最近孩子吃饭还好吗😊 突然想到你，是因为刚出了一份" + p.selling + "的新食谱，第一个想到你，发你一份，不用客气～」"
  }
];

function dateSeed(ymd) {
  let h = 0;
  for (let i = 0; i < ymd.length; i++) h = (h * 31 + ymd.charCodeAt(i)) >>> 0;
  return h;
}

function renderPlan() {
  const p = profile();
  const now = new Date();
  const ymd = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  $("#planDate").textContent = ymd;
  const seed = dateSeed(ymd);
  const tasks = [PLAN_POOL[seed % 3], PLAN_POOL[3 + ((seed >> 3) % 3)], PLAN_POOL[2], PLAN_POOL[5]]
    .filter((t, i, a) => a.indexOf(t) === i);
  if (tasks.length < 4) tasks.push(PLAN_POOL[0]);
  tasks.length = Math.min(tasks.length, 4);
  const list = $("#planList");
  list.innerHTML = "";
  tasks.forEach((t) => {
    const el = document.createElement("div");
    el.className = "plan-item";
    el.innerHTML = '<div class="plan-time">' + t.time + '</div><div class="plan-body"><div class="plan-title">' + t.type + " · " + t.title + '</div><div class="plan-txt">' + esc(t.cap(p)) + '</div><button class="copy-btn plan-copy">📋 一键复制</button></div>';
    el.querySelector(".copy-btn").addEventListener("click", () => copyText(t.cap(p)));
    list.appendChild(el);
  });
}

/* ---------- 文生图 ---------- */
let curTpl = TPLS[0];

function renderTplPills() {
  const box = $("#tplPills");
  box.innerHTML = "";
  TPLS.forEach((t) => {
    const el = document.createElement("span");
    el.className = "pill" + (t === curTpl ? " active" : "");
    el.textContent = t.name;
    el.addEventListener("click", () => { curTpl = t; renderTplPills(); });
    box.appendChild(el);
  });
}

function status(id, msg, isErr) {
  const el = $(id);
  el.classList.remove("hidden");
  el.classList.toggle("err", !!isErr);
  el.textContent = msg;
}

function previewImg(src) {
  $("#bigImg").src = src;
  $("#imgOverlay").classList.remove("hidden");
}

async function saveBigImg() {
  const src = $("#bigImg").src;
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ai-coach-" + Date.now() + ".jpg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("已开始下载/保存 ✨");
  } catch (e) {
    toast("浏览器限制下载，请长按图片保存 📱");
  }
}

function genImages() {
  const p = profile();
  const extra = $("#genExtra").value.trim();
  const selling = extra || p.selling;
  const grid = $("#imgGrid");
  grid.innerHTML = "";
  status("#genStatus", "🎨 AI正在生成4张「" + curTpl.name + "」…大约10-30秒，请稍候");
  for (let i = 0; i < 4; i++) {
    const v = i % 2 === 0 ? selling : p.selling;
    const prompt = curTpl.prompt(p, v) + "，风格变体" + (i + 1);
    const url = imgURL(prompt, curTpl.size);
    const cell = document.createElement("div");
    cell.className = "img-cell";
    const img = document.createElement("img");
    img.src = url;
    img.alt = curTpl.name;
    img.addEventListener("click", () => previewImg(url));
    img.addEventListener("error", () => {
      cell.innerHTML = '<div class="gen-status err" style="margin-top:0">生成失败，点「生成」重试</div>';
    });
    const tag = document.createElement("span");
    tag.className = "img-tag";
    tag.textContent = "方案" + (i + 1);
    cell.appendChild(img);
    cell.appendChild(tag);
    grid.appendChild(cell);
  }
  const copyCard = document.createElement("button");
  copyCard.className = "copy-btn";
  copyCard.style.gridColumn = "1 / -1";
  copyCard.textContent = "📋 复制配套朋友圈文案";
  copyCard.addEventListener("click", () => copyText(curTpl.cap(p)));
  grid.appendChild(copyCard);
  status("#genStatus", "✅ 已出图！点图片可放大，长按图片保存到相册；记得配文发圈～");
}

/* ---------- 图生图（API模式） ---------- */
const API_KEY_NAME = "aiCoachApiV1";
function apiCfg() {
  try {
    const c = JSON.parse(localStorage.getItem(API_KEY_NAME)) || {};
    return {
      base: c.base || "https://ark.cn-beijing.volces.com/api/v3",
      key: c.key || "",
      imgModel: c.imgModel || "doubao-seedream-4-0-250828",
      videoModel: c.videoModel || "doubao-seedance-1-0-lite-t2v-250428"
    };
  } catch (e) { return { base: "https://ark.cn-beijing.volces.com/api/v3", key: "", imgModel: "doubao-seedream-4-0-250828", videoModel: "doubao-seedance-1-0-lite-t2v-250428" }; }
}

let i2iData = "";
function initI2I() {
  $("#i2iPick").addEventListener("click", () => $("#i2iFile").click());
  $("#i2iFile").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { i2iData = r.result; $("#i2iImg").src = i2iData; $("#i2iPreview").classList.remove("hidden"); };
    r.readAsDataURL(f);
  });
  $("#i2iBtn").addEventListener("click", async () => {
    if (!i2iData) { toast("先选择一张照片哦～"); return; }
    const cfg = apiCfg();
    if (!cfg.key) {
      status("#i2iStatus", "⚠️ 图生图需要API密钥：点上方「API设置」配置即梦/方舟密钥后即可使用。不配置也能用上方免Key文生图～", true);
      return;
    }
    const prompt = $("#i2iPrompt").value.trim() || "改成高端产品海报风格，专业商业摄影，画面无文字";
    status("#i2iStatus", "🖼️ AI重绘中，请稍候…");
    try {
      const res = await fetch(cfg.base + "/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.key },
        body: JSON.stringify({ model: cfg.imgModel, prompt: prompt, image: [i2iData], response_format: "url", size: "2048x2048", watermark: false })
      });
      const data = await res.json();
      const url = data && data.data && data.data[0] && (data.data[0].url || data.data[0].b64_json);
      if (!url) throw new Error(data.error ? data.error.message : "返回为空");
      const grid = $("#i2iGrid");
      grid.innerHTML = "";
      const img = document.createElement("img");
      img.src = url;
      img.addEventListener("click", () => previewImg(url));
      grid.appendChild(img);
      status("#i2iStatus", "✅ 重绘完成！点图放大，长按保存");
    } catch (err) {
      status("#i2iStatus", "❌ 生成失败：" + err.message + "（如在浏览器中试用，可能是跨域限制；打包成App后正常）", true);
    }
  });
}

/* ---------- 短视频脚本（离线引擎）+ AI视频（API模式） ---------- */
const VIDEO_GOALS = ["引流款", "信任款", "促单款"];
let videoGoal = "引流款";

function renderVideoPills() {
  const box = $("#videoGoalPills");
  box.innerHTML = "";
  VIDEO_GOALS.forEach((g) => {
    const el = document.createElement("span");
    el.className = "pill" + (g === videoGoal ? " active" : "");
    el.textContent = g;
    el.addEventListener("click", () => { videoGoal = g; renderVideoPills(); });
    box.appendChild(el);
  });
}

function buildVideoScript() {
  const p = profile();
  const pack = {
    "引流款": {
      hook: "孩子追着喂饭？你不是一个人！",
      body: "我家之前也是，一顿饭喂一个小时，体重还不长。后来才知道，问题不在孩子，在方法——把" + p.selling + "拆成三步：定时定位、快乐进食、营养补齐。两周下来，孩子自己坐餐椅，追着要吃。",
      cta: "方法我整理成了一份清单，评论区扣“食谱”免费送！",
      shots: [["1", "0-3秒", "怼脸拍，表情夸张", "孩子追着喂饭？你不是一个人！"], ["2", "3-12秒", "实拍喂饭混乱场景", "我家之前一顿饭喂一小时…"], ["3", "12-22秒", "对比：孩子自己大口吃", "问题不在孩子，在方法——三步走"], ["4", "22-30秒", "举清单拍桌面", "评论区扣“食谱”免费送！"]]
    },
    "信任款": {
      hook: "做了3年儿童营养，说点大实话",
      body: "市面上90%的方法都在贩卖焦虑。真正有用的就三件事：查缺口、调结构、给耐心。我服务过200多个家庭，最常见的变化不是孩子马上爱吃，而是妈妈终于不焦虑了。" + p.selling + "，都是一步一步来的。",
      cta: "关注我，每天一条实操干货，不贩卖焦虑。",
      shots: [["1", "0-3秒", "坐姿口播，眼神坚定", "做了3年儿童营养，说点大实话"], ["2", "3-15秒", "手比数字123", "真正有用的就三件事…"], ["3", "15-25秒", "展示客户聊天截图", "200多个家庭的真实变化"], ["4", "25-30秒", "微笑靠近镜头", "关注我，不贩卖焦虑"]]
    },
    "促单款": {
      hook: "本月体验名额只剩3个了！",
      body: p.selling + "，7天体验装先试，有效果再继续，没效果全额退——你零风险。营养师一对一评估定制，不是标准化产品。上一期3天就抢完了。",
      cta: "想要名额的评论区扣“1”，我私发你详情！",
      shots: [["1", "0-3秒", "产品怼镜头，语气急", "本月体验名额只剩3个了！"], ["2", "3-12秒", "展示产品+评估表", "先评估定制，不是标准化产品"], ["3", "12-20秒", "字幕强调风险逆转", "7天不满意，全额退，零风险"], ["4", "20-30秒", "指向评论区", "扣“1”，私发你详情！"]]
    }
  }[videoGoal];

  const sb = pack.shots.map((r) => "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td><td>" + r[2] + "</td><td>" + r[3] + "</td></tr>").join("");
  return {
    text: "【" + videoGoal + " · 30秒口播稿】\n\n开场钩子（3秒抓人）：\n" + pack.hook + "\n\n正文（价值+证据）：\n" + pack.body + "\n\n行动号召：\n" + pack.cta + "\n\n📌 拍摄要点：手机竖屏、光线朝窗、每段单独拍再拼接；BGM用平台热门轻快曲；字幕全程加大字。",
    shotsHTML: '<div class="storyboard"><table><tr><th>镜头</th><th>时间</th><th>画面</th><th>台词/字幕</th></tr>' + sb + "</table></div>"
  };
}

async function aiGenVideo() {
  const cfg = apiCfg();
  if (!cfg.key) { toast("先在API设置里配置密钥"); return; }
  const p = profile();
  status("#videoStatus", "🎬 提交AI视频任务…");
  try {
    const res = await fetch(cfg.base + "/contents/generations/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.key },
      body: JSON.stringify({ model: cfg.videoModel, content: [{ type: "text", text: "竖版带货短视频：" + p.selling + "，真实亲子场景，暖色调，节奏轻快，画面无文字" }] })
    });
    const d = await res.json();
    if (!d.id) throw new Error(d.error ? d.error.message : "任务创建失败");
    status("#videoStatus", "⏳ 生成中（约1-5分钟）…任务ID：" + d.id);
    for (let i = 0; i < 60; i++) {
      await delay(5000);
      const r = await fetch(cfg.base + "/contents/generations/tasks/" + d.id, { headers: { "Authorization": "Bearer " + cfg.key } });
      const j = await r.json();
      if (j.status === "succeeded") {
        const url = j.content && j.content.video_url;
        $("#videoOut").insertAdjacentHTML("beforeend", '<video src="' + esc(url) + '" controls style="width:100%;border-radius:12px;margin-top:10px"></video>');
        status("#videoStatus", "✅ 视频已生成！");
        return;
      }
      if (j.status === "failed") throw new Error("生成失败");
      status("#videoStatus", "⏳ 生成中…（" + j.status + "）");
    }
    throw new Error("超时，请稍后在作品里查看");
  } catch (err) {
    status("#videoStatus", "❌ " + err.message + "（浏览器直连可能跨域受限，App壳内使用正常）", true);
  }
}

function genVideoScript() {
  const p = profile();
  const s = buildVideoScript();
  const out = $("#videoOut");
  out.innerHTML = "";
  const pre = document.createElement("div");
  pre.className = "video-script";
  pre.textContent = s.text;
  out.appendChild(pre);
  out.insertAdjacentHTML("beforeend", s.shotsHTML);
  const bar = document.createElement("button");
  bar.className = "copy-btn";
  bar.style.width = "100%";
  bar.textContent = "📋 复制口播稿";
  bar.addEventListener("click", () => copyText(s.text));
  out.appendChild(bar);
  const cfg = apiCfg();
  if (cfg.key) {
    const ai = document.createElement("button");
    ai.className = "btn-ghost";
    ai.style.width = "100%";
    ai.style.marginTop = "8px";
    ai.textContent = "🎬 不想拍？直接AI生成这条视频";
    ai.addEventListener("click", aiGenVideo);
    out.appendChild(ai);
    out.insertAdjacentHTML("beforeend", '<div class="gen-status hidden" id="videoStatus"></div>');
  } else {
    out.insertAdjacentHTML("beforeend", '<div class="gen-status">💡 配置API密钥后，可以不拍摄直接让AI把这条视频生成出来（点「API设置」）</div>');
  }
}

/* ---------- API设置弹层 ---------- */
function initApiOverlay() {
  const cfg = apiCfg();
  $("#apiBase").value = cfg.base === "https://ark.cn-beijing.volces.com/api/v3" ? "" : cfg.base;
  $("#apiKey").value = cfg.key;
  $("#apiImgModel").value = cfg.imgModel === "doubao-seedream-4-0-250828" ? "" : cfg.imgModel;
  $("#apiVideoModel").value = cfg.videoModel === "doubao-seedance-1-0-lite-t2v-250428" ? "" : cfg.videoModel;
  $("#apiSave").addEventListener("click", () => {
    localStorage.setItem(API_KEY_NAME, JSON.stringify({
      base: $("#apiBase").value.trim() || "https://ark.cn-beijing.volces.com/api/v3",
      key: $("#apiKey").value.trim(),
      imgModel: $("#apiImgModel").value.trim() || "doubao-seedream-4-0-250828",
      videoModel: $("#apiVideoModel").value.trim() || "doubao-seedance-1-0-lite-t2v-250428"
    }));
    $("#apiOverlay").classList.add("hidden");
    renderApiEntry();
    toast("API配置已保存 ✅");
  });
  $("#apiClose").addEventListener("click", () => $("#apiOverlay").classList.add("hidden"));
}

function renderApiEntry() {
  let el = $("#apiEntry");
  if (!el) {
    el = document.createElement("div");
    el.id = "apiEntry";
    el.className = "api-entry";
    const view = $("#view-creative");
    view.insertBefore(el, view.firstChild.nextSibling);
  }
  const has = apiCfg().key ? "已配置 ✅" : "未配置";
  el.innerHTML = "<span>⚙️ API设置（图生图 / AI生视频）：<b>" + has + "</b></span><b id=\"apiOpen\">去设置</b>";
  el.querySelector("#apiOpen").addEventListener("click", () => $("#apiOverlay").classList.remove("hidden"));
}

/* ---------- 初始化 ---------- */
function initCreative() {
  const p = loadProfile();
  $("#pProduct").value = p.product || "";
  $("#pSelling").value = p.selling || "";
  $("#pAudience").value = p.audience || "";
  $("#pSave").addEventListener("click", () => {
    localStorage.setItem(P_KEY, JSON.stringify({
      product: $("#pProduct").value.trim(),
      selling: $("#pSelling").value.trim(),
      audience: $("#pAudience").value.trim()
    }));
    renderPlan();
    toast("档案已保存，今日任务和文案已按新档案刷新 ✅");
  });

  renderPlan();
  renderTplPills();
  renderVideoPills();
  initI2I();
  initApiOverlay();
  renderApiEntry();

  $("#genBtn").addEventListener("click", genImages);
  $("#videoBtn").addEventListener("click", genVideoScript);
  $("#closeImgBtn").addEventListener("click", () => $("#imgOverlay").classList.add("hidden"));
  $("#saveImgBtn").addEventListener("click", saveBigImg);
}
initCreative();
