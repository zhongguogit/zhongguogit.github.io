(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Data
   * ------------------------------------------------------------------ */

  const CAMERA = {
    "dolly-in": { cn: "镜头缓慢推近", en: "slow dolly in" },
    "dolly-out": { cn: "镜头缓慢拉远", en: "slow dolly out" },
    orbit: { cn: "镜头缓慢环绕主体", en: "slow orbit around the subject" },
    handheld: { cn: "手持跟随，轻微晃动", en: "handheld follow with subtle shake" },
    static: { cn: "固定机位，画面内运动", en: "locked-off static camera with internal motion" },
    crane: { cn: "镜头缓慢上升", en: "slow crane up" },
    truck: { cn: "镜头横向平移", en: "slow truck right" },
    "top-down": { cn: "高角度俯拍下降", en: "high-angle descend" },
    close: { cn: "特写，浅景深，轻微手持跟随", en: "close-up, shallow depth of field, subtle handheld follow" },
    wide: { cn: "广角，镜头缓慢上升并拉远", en: "wide shot, slow crane up and pull back" }
  };

  const CAMERA_OPTIONS = [
    "dolly-in", "dolly-out", "orbit", "handheld", "static", "crane", "truck", "top-down"
  ];

  const LIGHTING = {
    golden: { cn: "黄金时刻逆光，暖色轮廓光", en: "golden hour backlight, warm rim light" },
    "cool-top": { cn: "冷色顶光，高对比", en: "cool top light, high contrast" },
    neon: { cn: "品红与青色霓虹侧光，湿地反光", en: "magenta and cyan neon side light, wet reflections" },
    "soft-window": { cn: "柔和窗光，低对比", en: "soft diffused window light, low contrast" },
    "low-key": { cn: "低调轮廓光，深色背景", en: "low-key rim light, dark background" },
    overcast: { cn: "阴天漫射光，均匀柔和", en: "overcast diffused light, even and soft" },
    hard: { cn: "硬光，高对比，清晰阴影", en: "hard light, high contrast, crisp shadows" },
    candle: { cn: "暖色烛光，柔和明暗过渡", en: "warm candlelight, soft falloff" }
  };

  const STYLE = {
    cinematic: { cn: "电影写实，35mm 胶片颗粒，浅景深", en: "cinematic photorealism, 35mm film grain, shallow depth of field" },
    anime: { cn: "日式动画，赛璐璐上色，干净线条", en: "Japanese anime style, cel shading, clean line art" },
    clay: { cn: "粘土定格动画，手作质感", en: "claymation stop-motion, handmade texture" },
    ink: { cn: "中国水墨动画，留白与晕染", en: "Chinese ink wash animation, negative space and bleeding ink" },
    cyberpunk: { cn: "赛博朋克，霓虹，湿润反光，电影感", en: "cyberpunk, neon, wet reflections, cinematic" },
    film90s: { cn: "90 年代复古胶片，轻微柔焦，低饱和", en: "1990s vintage film, soft focus, desaturated" },
    render3d: { cn: "风格化 3D 渲染，干净材质，柔和布光", en: "stylized 3D render, clean materials, soft studio lighting" },
    bw: { cn: "黑白默片，颗粒感，戏剧性光影", en: "black-and-white silent film, grain, dramatic lighting" }
  };

  const NEG_CN = "模糊，低清晰度，噪点，过曝，平光，畸形手，多手指，多肢体，面部扭曲，重复主体，水印，字幕，闪烁，抖动，形变，人物不一致，突然切镜";
  const NEG_EN = "blurry, low resolution, jpeg artifacts, oversaturated, flat lighting, extra fingers, deformed hands, extra limbs, fused fingers, distorted face, duplicate subject, text watermark, logo, subtitles, flicker, jitter, morphing, warping, inconsistent identity, abrupt cut, camera shake";

  const MODELS = [
    {
      id: "runway-gen45",
      name: "Runway Gen-4.5",
      vendor: "Runway",
      type: "api",
      params: "Gen-4.5",
      resolution: "720P–4K",
      maxDuration: 10,
      durationText: "5–10s",
      audio: false,
      vram: null,
      license: "平台 ToS",
      commercial: "conditional",
      chinese: false,
      price: "125 免费 credits（一次性）· $15/月起",
      creditsPerSec: 12,
      pros: "工作流最完整，镜头控制与角色一致性最好",
      cons: "免费额度一次性，credits 消耗快",
      tags: ["125 免费 credits", "Gen-4.5", "专业工作流"],
      score: 91,
      url: "https://app.runwayml.com/"
    },
    {
      id: "kling-30",
      name: "Kling 3.0 Pro",
      vendor: "快手 Kling",
      type: "api",
      params: "Kling 3.0",
      resolution: "1080P–4K",
      maxDuration: 10,
      durationText: "5–10s",
      audio: true,
      vram: null,
      license: "平台 ToS",
      commercial: "conditional",
      chinese: true,
      price: "$0.168/秒（含音频）",
      costUSD: 0.168,
      pros: "运动与运镜第一梯队，原生音频",
      cons: "单价较高，地区/账号限制",
      tags: ["原生音频", "4K", "写实运动"],
      score: 88,
      url: "https://klingai.com/"
    },
    {
      id: "veo-31",
      name: "Google Veo 3.1",
      vendor: "Google DeepMind",
      type: "api",
      params: "Veo 3.1",
      resolution: "1080P",
      maxDuration: 8,
      durationText: "8s",
      audio: true,
      vram: null,
      license: "平台 ToS",
      commercial: "conditional",
      chinese: false,
      price: "$0.03–0.50/秒（分档）",
      costUSD: 0.4,
      pros: "电影感与原生对白最强",
      cons: "价格高、区域限制、免费额度不稳定",
      tags: ["原生音频", "对白", "电影感"],
      score: 85,
      url: "https://aistudio.google.com/"
    },
    {
      id: "seedance-20",
      name: "Seedance 2.0",
      vendor: "字节跳动",
      type: "api",
      params: "Seedance 2.0",
      resolution: "720P–1080P",
      maxDuration: 12,
      durationText: "4–12s",
      audio: true,
      vram: null,
      license: "平台 ToS",
      commercial: "conditional",
      chinese: true,
      price: "720P 有声 $0.3034/秒",
      costUSD: 0.3034,
      pros: "运动自然、多镜头、中文语义好",
      cons: "单价最高档之一",
      tags: ["原生音频", "多镜头", "中文"],
      score: 84,
      url: "https://fal.ai/models"
    },
    {
      id: "wan-30",
      name: "Wan 3.0 API",
      vendor: "阿里云百炼",
      type: "api",
      params: "Wan 3.0",
      resolution: "480P–1080P",
      maxDuration: 10,
      durationText: "5–10s",
      audio: true,
      vram: null,
      license: "阿里云服务条款",
      commercial: "conditional",
      chinese: true,
      price: "¥0.3–1.2/秒（按分辨率）",
      costCNY: 0.6,
      pros: "国内直连、按秒计费、失败不计费",
      cons: "需实名与内容审核",
      tags: ["原生音频", "国内合规", "失败不计费"],
      score: 89,
      url: "https://bailian.console.aliyun.com/"
    },
    {
      id: "jimeng",
      name: "即梦 AI",
      vendor: "字节跳动 / 剪映",
      type: "free",
      params: "Seedance",
      resolution: "720P–1080P",
      maxDuration: 10,
      durationText: "5–10s",
      audio: false,
      vram: null,
      license: "平台 ToS",
      commercial: "conditional",
      chinese: true,
      price: "每日约 60 积分",
      pros: "国内直连，Seedance 画质好",
      cons: "排队、额度每日清零",
      tags: ["免费", "国内直连", "Seedance"],
      score: 82,
      url: "https://jimeng.jianying.com/"
    },
    {
      id: "hailuo",
      name: "海螺 AI",
      vendor: "MiniMax",
      type: "free",
      params: "Hailuo 02 / H3",
      resolution: "720P",
      maxDuration: 6,
      durationText: "5–6s",
      audio: false,
      vram: null,
      license: "平台 ToS",
      commercial: "conditional",
      chinese: true,
      price: "注册 3000 积分 + 每日额度",
      pros: "物理表现好，免费额度慷慨",
      cons: "高峰期排队、长镜头一致性一般",
      tags: ["免费", "物理运动", "中文"],
      score: 81,
      url: "https://hailuoai.com/"
    },
    {
      id: "vidu",
      name: "Vidu",
      vendor: "生数科技",
      type: "free",
      params: "Vidu",
      resolution: "1080P",
      maxDuration: 8,
      durationText: "5–8s",
      audio: false,
      vram: null,
      license: "平台 ToS",
      commercial: "conditional",
      chinese: true,
      price: "每日约 10 次",
      pros: "参考生视频、动漫风格强",
      cons: "免费档分辨率/时长受限",
      tags: ["免费", "参考生视频", "动漫"],
      score: 78,
      url: "https://www.vidu.studio/"
    },
    {
      id: "qingying",
      name: "清影",
      vendor: "智谱 AI",
      type: "free",
      params: "CogVideoX",
      resolution: "720P",
      maxDuration: 6,
      durationText: "6s",
      audio: false,
      vram: null,
      license: "平台 ToS",
      commercial: true,
      chinese: true,
      price: "免费 · 无水印 · 可商用",
      pros: "零成本、可商用、中文",
      cons: "画质/时长有限",
      tags: ["免费", "可商用", "无水印"],
      score: 76,
      url: "https://chatglm.cn/video"
    },
    {
      id: "wanxiang",
      name: "通义万相",
      vendor: "阿里巴巴",
      type: "free",
      params: "万相 3.0",
      resolution: "1080P",
      maxDuration: 10,
      durationText: "5–10s",
      audio: false,
      vram: null,
      license: "平台 ToS",
      commercial: "conditional",
      chinese: true,
      price: "每日签到灵感值",
      pros: "国内直连、多参考/首尾帧",
      cons: "高级能力需付费",
      tags: ["免费", "国内直连", "首尾帧"],
      score: 77,
      url: "https://tongyi.aliyun.com/wan/"
    },
    {
      id: "wan22-5b",
      name: "Wan2.2 TI2V-5B",
      vendor: "阿里 Wan",
      type: "local",
      params: "5B",
      resolution: "720P",
      maxDuration: 5,
      durationText: "5s 级",
      audio: false,
      vram: 24,
      license: "Apache 2.0",
      commercial: true,
      chinese: true,
      price: "开源免费 · 24GB 显存",
      pros: "4090 可跑，商用许可最省心",
      cons: "无原生音频，运镜较弱",
      tags: ["Apache 2.0", "24GB", "720P"],
      score: 92,
      url: "https://github.com/Wan-Video/Wan2.2"
    },
    {
      id: "hunyuan-15",
      name: "HunyuanVideo 1.5",
      vendor: "腾讯混元",
      type: "local",
      params: "8.3B",
      resolution: "480P/720P/1080P SR",
      maxDuration: 10,
      durationText: "5–10s",
      audio: false,
      vram: 14,
      license: "腾讯混元社区许可",
      commercial: "conditional",
      chinese: true,
      price: "开源免费 · 14GB 起",
      pros: "轻量、中文指令遵循强",
      cons: "许可不含 EU/UK/韩国",
      tags: ["14GB", "中文友好", "LoRA"],
      score: 89,
      url: "https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5"
    },
    {
      id: "ltx-25",
      name: "LTX-2.5",
      vendor: "Lightricks",
      type: "local",
      params: "22B 蒸馏",
      resolution: "最高 4K / 50fps",
      maxDuration: 20,
      durationText: "10–20s",
      audio: true,
      vram: 24,
      license: "LTX 社区许可",
      commercial: "conditional",
      chinese: false,
      price: "开源免费 · 24GB+",
      pros: "开源少见的音视频同步与 4K",
      cons: "权重约 66GiB，许可需核对",
      tags: ["原生音频", "4K", "音视频同步"],
      score: 86,
      url: "https://github.com/Lightricks/LTX-2"
    },
    {
      id: "wan22-14b",
      name: "Wan2.2 T2V-A14B",
      vendor: "阿里 Wan",
      type: "local",
      params: "14B MoE",
      resolution: "480P/720P",
      maxDuration: 5,
      durationText: "5s 级",
      audio: false,
      vram: 80,
      license: "Apache 2.0",
      commercial: true,
      chinese: true,
      price: "开源免费 · 80GB 显存",
      pros: "开源高质量，Apache 2.0",
      cons: "单卡 80GB，需 offload/多卡",
      tags: ["Apache 2.0", "80GB", "MoE"],
      score: 84,
      url: "https://github.com/Wan-Video/Wan2.2"
    },
    {
      id: "cogvideox-15",
      name: "CogVideoX 1.5-5B",
      vendor: "智谱 / THUDM",
      type: "local",
      params: "5B",
      resolution: "768P",
      maxDuration: 10,
      durationText: "10s",
      audio: false,
      vram: 16,
      license: "CogVideoX 许可",
      commercial: "conditional",
      chinese: true,
      price: "开源免费 · 8–33GB",
      pros: "低显存可跑，中文生态好",
      cons: "16fps，画质落后一代",
      tags: ["低显存", "10s", "中文"],
      score: 78,
      url: "https://github.com/THUDM/CogVideo"
    },
    {
      id: "opensora-20",
      name: "Open-Sora 2.0",
      vendor: "HPC-AI Tech",
      type: "local",
      params: "11B",
      resolution: "256/768px",
      maxDuration: 5,
      durationText: "4–5s",
      audio: false,
      vram: 80,
      license: "Apache 2.0",
      commercial: true,
      chinese: false,
      price: "开源免费 · 多卡 H100",
      pros: "训练代码完整，适合研究复现",
      cons: "768px 需多卡，工程复杂",
      tags: ["Apache 2.0", "研究", "多卡"],
      score: 70,
      url: "https://github.com/hpcaitech/Open-Sora"
    },
    {
      id: "mochi-1",
      name: "Mochi 1",
      vendor: "Genmo",
      type: "local",
      params: "10B",
      resolution: "480P",
      maxDuration: 5,
      durationText: "5.4s",
      audio: false,
      vram: 60,
      license: "Apache 2.0",
      commercial: true,
      chinese: false,
      price: "开源免费 · 1×H100",
      pros: "运动质量好，完全开放",
      cons: "分辨率低，4090 约 8 分钟/5s",
      tags: ["Apache 2.0", "480P", "研究"],
      score: 68,
      url: "https://github.com/genmoai/mochi"
    },
    {
      id: "animatediff",
      name: "AnimateDiff",
      vendor: "社区 / SD 生态",
      type: "local",
      params: "SD1.5 模块",
      resolution: "512px",
      maxDuration: 3,
      durationText: "2–3s",
      audio: false,
      vram: 8,
      license: "Apache 2.0",
      commercial: true,
      chinese: false,
      price: "开源免费 · 8GB",
      pros: "SD 生态/ControlNet，风格控制强",
      cons: "2023 技术，时长与一致性有限",
      tags: ["低显存", "风格化", "ControlNet"],
      score: 62,
      url: "https://github.com/guoyww/AnimateDiff"
    },
    {
      id: "svd",
      name: "Stable Video Diffusion",
      vendor: "Stability AI",
      type: "local",
      params: "1.1B",
      resolution: "576×1024",
      maxDuration: 2,
      durationText: "2s",
      audio: false,
      vram: 8,
      license: "Stability 社区许可",
      commercial: "conditional",
      chinese: false,
      price: "开源免费 · 8GB",
      pros: "稳定，ComfyUI 支持好",
      cons: "仅图生视频，帧数短，画质落后",
      tags: ["低显存", "图生视频", "旧项目"],
      score: 52,
      url: "https://github.com/Stability-AI/generative-models"
    }
  ];

  const LAUNCH = [
    { name: "Runway", meta: "Gen-4.5 · 125 credits", tag: "云 API", url: "https://app.runwayml.com/" },
    { name: "Kling 可灵", meta: "每日 66 灵感值", tag: "免费额度", url: "https://klingai.com/" },
    { name: "即梦 AI", meta: "每日约 60 积分", tag: "国内直连", url: "https://jimeng.jianying.com/" },
    { name: "海螺 AI", meta: "注册 3000 积分", tag: "免费额度", url: "https://hailuoai.com/" },
    { name: "Vidu", meta: "每日约 10 次", tag: "免费额度", url: "https://www.vidu.studio/" },
    { name: "清影", meta: "免费 · 无水印", tag: "免费", url: "https://chatglm.cn/video" },
    { name: "通义万相", meta: "每日签到灵感值", tag: "国内直连", url: "https://tongyi.aliyun.com/wan/" },
    { name: "LTX Studio", meta: "LTX-2.5 · 在线试用", tag: "云 API", url: "https://ltx.studio/" }
  ];

  const QUOTA_KEY = "vidlab.runway.quota.v1";
  const DAILY_LIMIT = 3;
  const RUNWAY_CREDITS_PER_SEC = 12;
  const RUNWAY_FREE_CREDITS = 125;

  const state = {
    duration: 5,
    aspect: "16:9",
    shots: 1,
    promptTab: "cn",
    selectedModelId: "runway-gen45",
    typeFilter: "all",
    needs: new Set()
  };

  let quota = loadQuota();
  let lastShots = [];

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */

  const $ = (id) => document.getElementById(id);

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function nowTime() {
    const d = new Date();
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function clampInt(value, min, max) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function getModel(id) {
    return MODELS.find((m) => m.id === id) || MODELS[0];
  }

  function typeLabel(type) {
    return type === "local" ? "本地开源" : type === "free" ? "免费网页" : "云 API";
  }

  function loadQuota() {
    try {
      const raw = localStorage.getItem(QUOTA_KEY);
      if (!raw) return { credits: RUNWAY_FREE_CREDITS, records: [] };
      const parsed = JSON.parse(raw);
      return {
        credits: clampInt(parsed.credits, 0, RUNWAY_FREE_CREDITS),
        records: Array.isArray(parsed.records) ? parsed.records : []
      };
    } catch (err) {
      return { credits: RUNWAY_FREE_CREDITS, records: [] };
    }
  }

  function saveQuota() {
    try {
      localStorage.setItem(QUOTA_KEY, JSON.stringify(quota));
    } catch (err) {
      /* localStorage may be unavailable; the page still works in-memory */
    }
  }

  function todayRecords() {
    const today = todayStr();
    return quota.records.filter((r) => r.date === today);
  }

  function toast(message, isError) {
    const el = $("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("error", Boolean(isError));
    el.classList.add("show");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => el.classList.remove("show"), 2600);
  }

  function copyText(text, message) {
    const done = () => toast(message || "已复制到剪贴板");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      done();
    } catch (err) {
      toast("复制失败，请手动选择文本", true);
    }
    document.body.removeChild(area);
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ------------------------------------------------------------------ *
   * Prompt builder
   * ------------------------------------------------------------------ */

  function trimEnd(value) {
    return String(value).trim().replace(/[。，,.;；]+$/, "");
  }

  function fieldValue(id, fallback) {
    const el = $(id);
    return trimEnd(el && el.value) || fallback;
  }

  function composePrompt(cameraKey, shotNumber) {
    const subject = fieldValue("subject", "一位年轻女性");
    const action = fieldValue("action", "缓慢转身看向镜头");
    const scene = fieldValue("scene", "空旷的夜晚街道");
    const idea = trimEnd($("idea").value);
    const cam = CAMERA[cameraKey] || CAMERA[$("camera").value] || CAMERA["dolly-in"];
    const light = LIGHTING[$("lighting").value] || LIGHTING.neon;
    const style = STYLE[$("style").value] || STYLE.cinematic;

    const cnParts = [subject + "，" + action, "场景是" + scene];
    if (idea) cnParts.push(idea);
    const cn = cnParts.join("。") + "。" + cam.cn + "，" + light.cn + "，" + style.cn +
      "。时长 " + state.duration + " 秒，" + state.aspect + " 画幅。";

    const en = subject + " " + action + ", in " + scene + "." +
      (idea ? " Additional context: " + idea + "." : "") +
      " " + cam.en + ". " + light.en + ". " + style.en + ". " +
      state.duration + " seconds, " + state.aspect + ".";

    return { cn: cn, en: en, label: ["建立镜头", "细节镜头", "收尾镜头"][shotNumber - 1] || "镜头" };
  }

  function composeShots() {
    if (state.shots === 3) {
      return [composePrompt(null, 1), composePrompt("close", 2), composePrompt("wide", 3)];
    }
    return [composePrompt(null, 1)];
  }

  function renderPrompt() {
    lastShots = composeShots();
    const current = lastShots[0];
    const meta = $("promptMeta");
    const text = $("promptText");

    if (state.promptTab === "en") {
      text.textContent = current.en;
    } else if (state.promptTab === "neg") {
      text.textContent = "中文负面词：\n" + NEG_CN + "\n\nEnglish negative prompt:\n" + NEG_EN;
    } else {
      text.textContent = current.cn;
    }

    if (state.promptTab === "neg") {
      meta.textContent = "负面词 · 平台支持时使用";
    } else if (state.shots === 3) {
      meta.textContent = "3 分镜 · 主镜头 " + current.cn.length + " 字";
    } else {
      const words = current.en.trim().split(/\s+/).filter(Boolean).length;
      meta.textContent = "中文 " + current.cn.length + " 字 · EN " + words + " words";
    }

    const list = $("shotList");
    if (state.shots === 3) {
      list.classList.add("show");
      list.innerHTML = lastShots.map((shot, index) => (
        '<article class="shot">' +
          '<div class="shot-head"><strong>镜头 ' + (index + 1) + ' · ' + esc(shot.label) + '</strong>' +
          '<button type="button" data-copy-shot="' + index + '">复制</button></div>' +
          '<p>' + esc(shot.cn) + '</p>' +
        '</article>'
      )).join("");
    } else {
      list.classList.remove("show");
      list.innerHTML = "";
    }

    document.querySelectorAll(".output-tabs button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === state.promptTab);
    });
  }

  /* ------------------------------------------------------------------ *
   * Model picker
   * ------------------------------------------------------------------ */

  function modelScore(model) {
    let score = model.score;
    if (state.needs.has("audio")) score += model.audio ? 18 : -26;
    if (state.needs.has("long")) score += model.maxDuration >= 10 ? 14 : -14;
    if (state.needs.has("lowVram")) {
      score += model.type !== "local" ? 12 : (model.vram && model.vram <= 16 ? 14 : -20);
    }
    if (state.needs.has("commercial")) score += model.commercial === true ? 14 : -10;
    if (state.needs.has("chinese")) score += model.chinese ? 10 : -4;
    return score;
  }

  function modelMatchesType(model) {
    return state.typeFilter === "all" || model.type === state.typeFilter;
  }

  function matchReasons(model) {
    const reasons = [];
    if (state.needs.has("audio") && model.audio) reasons.push("原生音频");
    if (state.needs.has("long") && model.maxDuration >= 10) reasons.push("10 秒以上");
    if (state.needs.has("lowVram") && (model.type !== "local" || (model.vram && model.vram <= 16))) reasons.push("低显存/免部署");
    if (state.needs.has("commercial") && model.commercial === true) reasons.push("商用友好");
    if (state.needs.has("chinese") && model.chinese) reasons.push("中文友好");
    return reasons;
  }

  function renderModels() {
    const models = MODELS
      .filter(modelMatchesType)
      .map((model) => ({ model: model, score: modelScore(model) }))
      .sort((a, b) => b.score - a.score);

    $("modelCount").textContent = String(models.length);

    if (!models.length) {
      $("modelList").innerHTML = '<p class="hint-line">没有匹配的模型，请放宽筛选条件。</p>';
      return;
    }

    $("modelList").innerHTML = models.map(({ model }, index) => {
      const selected = model.id === state.selectedModelId;
      const reasons = matchReasons(model);
      const specBits = [model.params, model.resolution, model.durationText, model.vram ? model.vram + "GB" : "", model.license]
        .filter(Boolean);
      const tags = model.tags.slice(0, 3).map((tag) => '<span class="tag">' + esc(tag) + '</span>').join("");
      const reasonTags = reasons.slice(0, 2).map((tag) => '<span class="tag good">' + esc(tag) + '</span>').join("");
      const priority = index === 0 ? '<span class="tag good">优先</span>' : "";

      return '<article class="model-item' + (selected ? " selected" : "") + '">' +
        '<div class="model-top"><div><h3>' + esc(model.name) + '</h3><span class="vendor">' + esc(model.vendor) + '</span></div>' +
        '<span class="type-badge ' + model.type + '">' + typeLabel(model.type) + '</span></div>' +
        '<div class="model-specs">' + esc(specBits.join(" · ")) + '</div>' +
        '<p class="model-pros">' + esc(model.pros) + '</p>' +
        '<p class="model-cons">' + esc(model.cons) + '</p>' +
        '<div class="model-tags">' + priority + reasonTags + tags + '</div>' +
        '<div class="model-foot"><span class="model-price">' + esc(model.price) + '</span>' +
        '<button type="button" data-select="' + model.id + '">' + (selected ? "已选" : "选它") + '</button></div>' +
      '</article>';
    }).join("");
  }

  /* ------------------------------------------------------------------ *
   * Cost / quota
   * ------------------------------------------------------------------ */

  function formatCost(model, seconds) {
    if (model.type === "local") {
      return { main: "$0 API 成本", sub: "本地推理 · " + (model.vram || "—") + "GB 显存" };
    }
    if (model.type === "free") {
      return { main: "免费额度", sub: "超出后按平台套餐计费" };
    }
    if (model.creditsPerSec) {
      const credits = model.creditsPerSec * seconds;
      return {
        main: credits + " credits",
        sub: "≈ $" + (credits * 0.024).toFixed(2) + " · " + model.creditsPerSec + " credits/秒"
      };
    }
    if (model.costCNY) {
      return {
        main: "¥" + (model.costCNY * seconds).toFixed(2),
        sub: "≈ $" + (model.costCNY * seconds / 7.2).toFixed(2) + " · ¥" + model.costCNY + "/秒"
      };
    }
    if (model.costUSD) {
      return {
        main: "$" + (model.costUSD * seconds).toFixed(2),
        sub: "$" + model.costUSD + "/秒"
      };
    }
    return { main: "—", sub: "" };
  }

  function renderPlan() {
    const model = getModel(state.selectedModelId);
    const cost = formatCost(model, state.duration);

    $("selectedModelName").textContent = model.name;
    const badge = $("selectedModelType");
    badge.textContent = typeLabel(model.type);
    badge.className = "type-badge " + model.type;

    const metaBits = [model.params, model.resolution, model.durationText, model.license].filter(Boolean);
    $("selectedModelMeta").textContent = metaBits.join(" · ");
    $("selectedCost").textContent = cost.main + (cost.sub ? " · " + cost.sub : "");

    const link = $("selectedLink");
    link.href = model.url;
    link.textContent = model.type === "local" ? "打开仓库" : "打开平台";

    $("deployLink").style.display = model.type === "local" ? "inline-flex" : "none";
  }

  function renderQuota() {
    const model = getModel(state.selectedModelId);
    const isRunway = model.id === "runway-gen45";
    const cost = RUNWAY_CREDITS_PER_SEC * state.duration;
    const used = todayRecords().length;
    const remainingToday = Math.max(0, DAILY_LIMIT - used);
    const possible = Math.min(Math.floor(quota.credits / cost), remainingToday);

    const input = $("creditsRemaining");
    if (document.activeElement !== input) {
      input.value = String(quota.credits);
    }

    $("usedToday").textContent = used + " / " + DAILY_LIMIT;
    $("quotaDuration").textContent = state.duration + "s";
    $("quotaCost").textContent = cost + " credits";
    $("quotaLeft").textContent = possible + " 次";

    const alert = $("quotaAlert");
    const button = $("recordRunway");
    let message = "";
    let bad = false;
    let blocked = false;

    if (!isRunway) {
      message = "当前方案为 " + model.name + "，不是 Runway。额度账本仅用于 Runway 免费额度验证；切换到 Runway Gen-4.5 后可记账。";
      blocked = true;
    } else if (used >= DAILY_LIMIT) {
      message = "今日已达 3 次上限，按项目规则不再生成。";
      bad = true;
      blocked = true;
    } else if (quota.credits < cost) {
      message = "剩余 " + quota.credits + " credits，不足本次 " + cost + " credits。";
      bad = true;
      blocked = true;
    } else {
      message = "额度充足：生成后剩余 " + (quota.credits - cost) + " credits。请先到 Runway 核对实际余额。";
    }

    alert.textContent = message;
    alert.hidden = false;
    alert.classList.toggle("bad", bad);
    button.disabled = blocked;
    button.textContent = isRunway
      ? "记录一次 Runway 生成（" + state.duration + "s / " + cost + " credits）"
      : "仅 Runway 方案可记账";

    $("heroCredits").textContent = String(quota.credits);
    $("heroToday").textContent = String(used);
    $("heroMeter").style.width = Math.max(0, Math.min(100, (quota.credits / RUNWAY_FREE_CREDITS) * 100)) + "%";

    const dots = $("heroDots");
    dots.innerHTML = "";
    for (let i = 0; i < DAILY_LIMIT; i += 1) {
      const dot = document.createElement("i");
      if (i < used) dot.className = "on";
      dots.appendChild(dot);
    }
  }

  /* ------------------------------------------------------------------ *
   * Records
   * ------------------------------------------------------------------ */

  function fileName(record) {
    return "generated/" + record.date + "/" + record.file;
  }

  function renderRecords() {
    const today = todayRecords();
    const list = quota.records.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const spent = today.reduce((sum, record) => sum + record.credits, 0);

    $("recordSummary").textContent = today.length
      ? "今天 " + today.length + " 次 · 消耗 " + spent + " credits · 剩余 " + quota.credits + " credits · 累计 " + quota.records.length + " 条"
      : "今天还没有生成记录；累计 " + quota.records.length + " 条。";

    const wrap = $("tableWrap");
    const empty = $("recordsEmpty");

    if (!list.length) {
      wrap.hidden = true;
      empty.hidden = false;
      $("recordsBody").innerHTML = "";
      return;
    }

    wrap.hidden = false;
    empty.hidden = true;

    $("recordsBody").innerHTML = list.map((record) => {
      const prompt = record.prompt || "";
      return "<tr>" +
        "<td>" + esc(record.date) + "<br><span class=\"vendor\">" + esc(record.time) + "</span></td>" +
        "<td>" + esc(record.model) + "</td>" +
        "<td>" + esc(record.duration) + "s</td>" +
        "<td>" + esc(record.credits) + "</td>" +
        "<td><span class=\"file-name\">" + esc(fileName(record)) + "</span></td>" +
        "<td><div class=\"prompt-cell\">" + esc(prompt.slice(0, 88)) + (prompt.length > 88 ? "…" : "") + "</div></td>" +
        "<td><button type=\"button\" class=\"row-btn\" data-copy-file=\"" + esc(record.id) + "\">复制命名</button></td>" +
      "</tr>";
    }).join("");
  }

  function recordRunway() {
    const model = getModel(state.selectedModelId);
    if (model.id !== "runway-gen45") {
      toast("请先选择 Runway Gen-4.5 方案", true);
      return;
    }

    const cost = RUNWAY_CREDITS_PER_SEC * state.duration;
    const used = todayRecords().length;

    if (used >= DAILY_LIMIT) {
      toast("今日已达 3 次上限，按规则不再生成", true);
      return;
    }
    if (quota.credits < cost) {
      toast("剩余 credits 不足本次生成", true);
      return;
    }

    const date = todayStr();
    const seq = used + 1;
    const base = date + "_runway-gen45_" + state.duration + "s_" + pad(seq);
    const prompt = lastShots[0] ? lastShots[0].cn : "";

    quota.records.push({
      id: String(Date.now()) + "-" + seq,
      date: date,
      time: nowTime(),
      ts: Date.now(),
      model: "Runway Gen-4.5",
      duration: state.duration,
      credits: cost,
      prompt: prompt,
      file: base + ".mp4"
    });
    quota.credits -= cost;
    saveQuota();

    renderQuota();
    renderRecords();
    toast("已记录：" + base + ".mp4（请到 Runway 生成后按此命名归档）");
  }

  function exportMarkdown() {
    if (!quota.records.length) {
      toast("还没有记录可导出", true);
      return;
    }
    const list = quota.records.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const lines = [
      "# Runway 生成记录",
      "",
      "- 导出时间：" + new Date().toLocaleString("zh-CN"),
      "- 剩余 credits：" + quota.credits,
      "- 累计记录：" + quota.records.length + " 条",
      ""
    ];
    list.forEach((record, index) => {
      lines.push("## " + (index + 1) + ". " + record.date + " " + record.time + " · " + record.model + " · " + record.duration + "s");
      lines.push("");
      lines.push("- 视频文件：`" + fileName(record) + "`");
      lines.push("- 提示词文件：`" + fileName(record).replace(/\.mp4$/, ".txt") + "`");
      lines.push("- 消耗：" + record.credits + " credits");
      lines.push("");
      lines.push("> " + (record.prompt || "").replace(/\n/g, "\n> "));
      lines.push("");
    });
    download("runway-records-" + todayStr() + ".md", lines.join("\n"), "text/markdown;charset=utf-8");
    toast("已导出 Markdown 清单");
  }

  function exportJson() {
    download(
      "runway-records-" + todayStr() + ".json",
      JSON.stringify({ exportedAt: new Date().toISOString(), credits: quota.credits, records: quota.records }, null, 2),
      "application/json;charset=utf-8"
    );
    toast("已导出 JSON");
  }

  function clearRecords() {
    if (!quota.records.length) {
      toast("没有记录可清空", true);
      return;
    }
    if (!window.confirm("清空所有生成记录？credits 余额不会恢复。")) return;
    quota.records = [];
    saveQuota();
    renderQuota();
    renderRecords();
    toast("已清空生成记录");
  }

  function adjustQuota() {
    const next = window.prompt("输入当前剩余 credits（0–125）", String(quota.credits));
    if (next === null) return;
    quota.credits = clampInt(next, 0, RUNWAY_FREE_CREDITS);
    saveQuota();
    renderQuota();
    renderRecords();
    toast("已更新剩余额度为 " + quota.credits + " credits");
  }

  /* ------------------------------------------------------------------ *
   * Launch grid
   * ------------------------------------------------------------------ */

  function renderLaunch() {
    $("launchGrid").innerHTML = LAUNCH.map((item, index) => (
      '<button type="button" class="launch-card" data-launch="' + index + '">' +
        '<strong>' + esc(item.name) + '</strong>' +
        '<span>' + esc(item.meta) + '</span>' +
        '<em>' + esc(item.tag) + ' · 复制提示词并打开</em>' +
      '</button>'
    )).join("");
  }

  function launchProvider(index) {
    const item = LAUNCH[index];
    if (!item) return;
    const prompt = lastShots[0] ? lastShots[0].cn : "";
    const win = window.open(item.url, "_blank", "noopener");
    copyText(prompt, "已复制提示词，正在打开 " + item.name);
    if (!win) toast("提示词已复制；浏览器拦截了新窗口，请手动打开平台", true);
  }

  /* ------------------------------------------------------------------ *
   * Wiring
   * ------------------------------------------------------------------ */

  function fillSelect(id, map, keys) {
    const select = $(id);
    keys.forEach((key) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = map[key].cn;
      select.appendChild(option);
    });
  }

  function bindSegments() {
    document.querySelectorAll(".segment").forEach((group) => {
      group.addEventListener("click", (event) => {
        const btn = event.target.closest("button[data-value]");
        if (!btn) return;
        const value = btn.dataset.value;
        group.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === btn));

        if (group.dataset.group === "duration") {
          state.duration = Number(value);
          renderPrompt();
          renderPlan();
          renderQuota();
        } else if (group.dataset.group === "aspect") {
          state.aspect = value;
          renderPrompt();
        } else if (group.dataset.group === "shots") {
          state.shots = Number(value);
          renderPrompt();
        }
      });
    });
  }

  function bindEvents() {
    ["idea", "subject", "action", "scene"].forEach((id) => {
      $(id).addEventListener("input", renderPrompt);
    });
    ["camera", "lighting", "style"].forEach((id) => {
      $(id).addEventListener("change", renderPrompt);
    });

    document.querySelectorAll(".output-tabs button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.promptTab = btn.dataset.tab;
        renderPrompt();
      });
    });

    $("fillExample").addEventListener("click", () => {
      $("idea").value = "雨丝在霓虹灯下清晰可见，偶尔有行人撑伞经过";
      $("subject").value = "穿透明雨衣的年轻女孩";
      $("action").value = "握着折伞，低头看向街道尽头";
      $("scene").value = "雨夜东京便利店门口，湿润路面反射霓虹";
      $("camera").value = "dolly-in";
      $("lighting").value = "neon";
      $("style").value = "cyberpunk";
      renderPrompt();
      toast("已填入示例，可直接修改");
    });

    $("copyPrompt").addEventListener("click", () => {
      const text = $("promptText").textContent;
      copyText(text, "已复制当前提示词");
    });

    $("copyNegative").addEventListener("click", () => {
      copyText("中文负面词：\n" + NEG_CN + "\n\nEnglish negative prompt:\n" + NEG_EN, "已复制负面提示词");
    });

    $("usePrompt").addEventListener("click", () => {
      $("models").scrollIntoView({ behavior: "smooth", block: "start" });
      toast("提示词已就绪，请在右侧选择模型");
    });

    $("typeFilters").addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-type]");
      if (!btn) return;
      state.typeFilter = btn.dataset.type;
      document.querySelectorAll("#typeFilters .filter").forEach((item) => item.classList.toggle("active", item === btn));
      renderModels();
    });

    $("needs").addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-need]");
      if (!btn) return;
      const need = btn.dataset.need;
      if (state.needs.has(need)) {
        state.needs.delete(need);
        btn.classList.remove("active");
      } else {
        state.needs.add(need);
        btn.classList.add("active");
      }
      renderModels();
    });

    $("modelList").addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-select]");
      if (!btn) return;
      state.selectedModelId = btn.dataset.select;
      renderModels();
      renderPlan();
      renderQuota();
    });

    $("shotList").addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-copy-shot]");
      if (!btn) return;
      const shot = lastShots[Number(btn.dataset.copyShot)];
      if (!shot) return;
      copyText(shot.cn + "\n\n" + shot.en, "已复制镜头 " + (Number(btn.dataset.copyShot) + 1) + " 提示词");
    });

    $("creditsRemaining").addEventListener("change", (event) => {
      quota.credits = clampInt(event.target.value, 0, RUNWAY_FREE_CREDITS);
      saveQuota();
      renderQuota();
      renderRecords();
    });

    $("resetQuota").addEventListener("click", adjustQuota);
    $("recordRunway").addEventListener("click", recordRunway);
    $("exportMd").addEventListener("click", exportMarkdown);
    $("exportJson").addEventListener("click", exportJson);
    $("clearRecords").addEventListener("click", clearRecords);

    $("recordsBody").addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-copy-file]");
      if (!btn) return;
      const record = quota.records.find((item) => item.id === btn.dataset.copyFile);
      if (!record) return;
      copyText(fileName(record), "已复制文件路径");
    });

    $("launchGrid").addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-launch]");
      if (!btn) return;
      launchProvider(Number(btn.dataset.launch));
    });
  }

  function init() {
    fillSelect("camera", CAMERA, CAMERA_OPTIONS);
    fillSelect("lighting", LIGHTING, Object.keys(LIGHTING));
    fillSelect("style", STYLE, Object.keys(STYLE));

    $("camera").value = "dolly-in";
    $("lighting").value = "neon";
    $("style").value = "cinematic";

    bindSegments();
    bindEvents();
    renderLaunch();

    renderPrompt();
    renderModels();
    renderPlan();
    renderQuota();
    renderRecords();
  }

  init();
})();
