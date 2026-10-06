// 焊工图纸分析器 - OCR识图 + 3D参数化建模 + 焊接计算 + AI施工方案
// Three.js 改为动态导入，避免 CDN 加载失败导致整个页面脚本瘫痪
let THREE, OrbitControls;

const MATERIALS = [
  { name: "Q235 碳钢", density: 7.85, preheat: 0, notes: "普通碳钢结构钢" },
  { name: "Q345 低合金钢", density: 7.85, preheat: 80, notes: "强度较高，厚板需预热" },
  { name: "304 不锈钢", density: 7.93, preheat: 0, notes: "注意控制层间温度≤150℃" },
  { name: "316L 不锈钢", density: 7.98, preheat: 0, notes: "低碳不锈钢，耐腐蚀" },
  { name: "铝合金 6061", density: 2.70, preheat: 100, notes: "MIG/TIG，注意变形" },
  { name: "45# 钢", density: 7.85, preheat: 150, notes: "中碳钢，焊前必须预热" }
];

const JOINTS = ["对接接头", "搭接接头", "T形接头", "角接接头", "端接接头"];
const WELD_TYPES = ["V形坡口", "X形坡口", "U形坡口", "单面V形", "不开坡口", "角焊缝"];
const PROCESSES = ["SMAW 焊条电弧焊", "GMAW/MIG 熔化极气保焊", "GTAW/TIG 钨极氩弧焊", "SAW 埋弧焊", "FCAW 药芯焊丝"];

const state = {
  joint: "对接接头",
  material: "Q235 碳钢",
  thickness: 10,
  weldSize: 6,
  weldType: "V形坡口",
  process: "GMAW/MIG 熔化极气保焊",
  current: 180,
  voltage: 24,
  travelSpeed: 15, // cm/min
  ocrText: ""
};

let scene, camera, renderer, controls, weldGroup;

function $(id) { return document.getElementById(id); }

// ===== Tab 切换 =====
function switchTab(t) {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === t));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === "panel-" + t));
  if (t === "model" && !scene) init3D();
}

// ===== OCR 识图 =====
async function handleUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    $("preview").src = e.target.result;
    $("preview").classList.remove("hidden");
    runOCR(file);
  };
  reader.readAsDataURL(file);
}

async function runOCR(file) {
  $("ocr-status").innerHTML = '<span class="spinner"></span>正在识别图纸文字…';
  try {
    const fd = new FormData();
    fd.append("apikey", "helloworld");
    fd.append("language", "chs");
    fd.append("file", file);
    fd.append("OCREngine", "2");
    const res = await fetch("https://api.ocr.space/parse/image", { method: "POST", body: fd });
    const data = await res.json();
    const text = (data.ParsedResults || []).map(r => r.ParsedText).join("\n").trim();
    state.ocrText = text || "（未识别到文字）";
    $("ocr-status").innerHTML = `✅ 识别完成，共 ${state.ocrText.length} 字`;
    $("ocr-text").textContent = state.ocrText;
    $("ocr-text").classList.remove("hidden");
  } catch (e) {
    $("ocr-status").innerHTML = `⚠️ OCR 失败：${e.message}（仍可手动填写参数）`;
  }
}

// ===== 3D 建模 =====
async function init3D() {
  try {
    if (!THREE) {
      THREE = await import('three');
      const oc = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js');
      OrbitControls = oc.OrbitControls;
    }
  } catch (e) {
    const c = $("model3d");
    c.innerHTML = '<div style="padding:20px;color:#f59e0b;font-size:14px;text-align:center">⚠️ 3D 模型库加载失败（网络问题），请刷新重试。其他功能不受影响。</div>';
    return;
  }
  const c = $("model3d");
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, c.clientWidth / c.clientHeight, 0.1, 1000);
  camera.position.set(15, 12, 18);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(c.clientWidth, c.clientHeight);
  c.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dl = new THREE.DirectionalLight(0xffffff, 0.8);
  dl.position.set(10, 20, 10);
  scene.add(dl);
  const grid = new THREE.GridHelper(40, 40, 0x334155, 0x1e293b);
  scene.add(grid);
  buildModel();
  animate();
  window.addEventListener("resize", () => {
    camera.aspect = c.clientWidth / c.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(c.clientWidth, c.clientHeight);
  });
}

function buildModel() {
  if (!scene) return;
  if (weldGroup) scene.remove(weldGroup);
  weldGroup = new THREE.Group();
  const t = state.thickness;
  const s = state.weldSize;
  const L = 20; // 板长
  const mat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.4 });
  const weldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.5, roughness: 0.5, emissive: 0x451a03, emissiveIntensity: 0.3 });
  const plate1 = new THREE.Mesh(new THREE.BoxGeometry(L, t, 10), mat);
  const plate2 = new THREE.Mesh(new THREE.BoxGeometry(L, t, 10), mat);

  switch (state.joint) {
    case "对接接头":
      plate1.position.set(-L / 2 - 0.5, 0, 0);
      plate2.position.set(L / 2 + 0.5, 0, 0);
      weldGroup.add(plate1, plate2);
      // 焊缝
      const weld = new THREE.Mesh(new THREE.BoxGeometry(1.2, s * 0.5, 10), weldMat);
      weldGroup.add(weld);
      break;
    case "搭接接头":
      plate1.position.set(0, t / 2, 0);
      plate2.position.set(0, -t / 2, 5);
      weldGroup.add(plate1, plate2);
      const w1 = new THREE.Mesh(new THREE.BoxGeometry(10, s * 0.4, s * 0.4), weldMat);
      w1.position.set(-5, 0, 0);
      weldGroup.add(w1);
      break;
    case "T形接头":
      plate1.position.set(0, 0, 0);
      plate2.rotation.x = Math.PI / 2;
      plate2.position.set(0, t / 2 + 5, 0);
      weldGroup.add(plate1, plate2);
      const wt = new THREE.Mesh(new THREE.BoxGeometry(L, s * 0.5, s * 0.5), weldMat);
      wt.position.set(0, t / 2, 5 - s / 2);
      weldGroup.add(wt);
      break;
    case "角接接头":
      plate1.rotation.y = Math.PI / 2;
      plate1.position.set(-5, 0, 0);
      plate2.position.set(0, 0, 5);
      weldGroup.add(plate1, plate2);
      const wc = new THREE.Mesh(new THREE.BoxGeometry(s * 0.5, s * 0.5, 10), weldMat);
      wc.position.set(-5 + s / 2, 0, 5 - s / 2);
      weldGroup.add(wc);
      break;
    case "端接接头":
      plate1.position.set(0, 0, 0);
      plate2.position.set(0, t + s * 0.3, 0);
      weldGroup.add(plate1, plate2);
      break;
  }
  scene.add(weldGroup);
  updateModelInfo();
}

function updateModelInfo() {
  const m = MATERIALS.find(x => x.name === state.material);
  $("model-info").innerHTML = `
    <span class="chip">🔩 ${state.joint}</span>
    <span class="chip">📏 板厚 ${state.thickness}mm</span>
    <span class="chip">🔗 焊脚 ${state.weldSize}mm</span>
    <span class="chip">🧱 ${state.material}</span>`;
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// ===== 焊接工艺计算 =====
function calcWelding() {
  const m = MATERIALS.find(x => x.name === state.material);
  const t = state.thickness;
  // 热输入 kJ/cm
  const heatInput = (state.current * state.voltage * 60) / (state.travelSpeed * 1000);
  // 预热温度
  let preheat = m.preheat;
  if (t > 20) preheat = Math.max(preheat, 100);
  if (t > 30) preheat = Math.max(preheat, 150);
  // 层间温度
  const interpass = m.name.includes("不锈钢") ? 150 : preheat + 100;
  // 填充金属消耗量（简化估算）
  const weldArea = state.weldSize * state.weldSize * 0.5; // mm²
  const weldVolume = weldArea * 100; // 每米焊缝体积 mm³
  const fillerMass = (weldVolume * m.density) / 1000; // g/m

  const rows = [
    ["接头形式", state.joint],
    ["母材", `${state.material}（密度 ${m.density} g/cm³）`],
    ["板厚", `${t} mm`],
    ["焊接方法", state.process],
    ["焊接电流", `${state.current} A`],
    ["电弧电压", `${state.voltage} V`],
    ["焊接速度", `${state.travelSpeed} cm/min`],
    ["线能量", `${heatInput.toFixed(2)} kJ/cm`],
    ["预热温度", `${preheat} ℃ ${m.preheat > 0 ? "（建议）" : "（通常无需）"}`],
    ["层间温度", `≤ ${interpass} ℃`],
    ["填充金属消耗", `约 ${fillerMass.toFixed(1)} g/m 焊缝`],
    ["备注", m.notes]
  ];
  $("calc-rows").innerHTML = rows.map(([k, v]) =>
    `<div class="calc-row"><span>${k}</span><span class="val">${v}</span></div>`
  ).join("");
  return { heatInput, preheat, interpass, fillerMass };
}

// ===== AI 施工方案 =====
async function generatePlan() {
  const calc = calcWelding();
  const params = `接头=${state.joint}; 母材=${state.material}; 板厚=${state.thickness}mm; 焊脚=${state.weldSize}mm; 坡口=${state.weldType}; 方法=${state.process}; 电流=${state.current}A; 电压=${state.voltage}V; 速度=${state.travelSpeed}cm/min; 线能量=${calc.heatInput.toFixed(2)}kJ/cm; 预热=${calc.preheat}℃`;
  const ocrContext = state.ocrText ? `\n图纸OCR识别内容：\n${state.ocrText.slice(0, 500)}` : "";
  const prompt = `你是一位资深焊接工程师。请根据以下焊接参数，生成一份可直接落地的施工参考方案。\n\n参数：${params}${ocrContext}\n\n请用中文输出，包含以下部分（每项简洁实用）：\n1. 【焊前准备】坡口加工、清理、组对要求\n2. 【焊接参数】推荐的电流/电压/速度/层数\n3. 【施工步骤】从打底到盖面的详细步骤\n4. 【质量控制】外观检查、无损检测建议\n5. 【安全注意】防护、通风、防火\n\n直接输出方案，不要多余寒暄。`;

  $("plan-btn").disabled = true;
  $("plan-btn").innerHTML = '<span class="spinner"></span>AI 生成中…';
  $("plan-box").innerHTML = "";
  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "openai" })
    });
    const text = await res.text();
    $("plan-box").textContent = text;
  } catch (e) {
    $("plan-box").textContent = "⚠️ AI 生成失败：" + e.message;
  }
  $("plan-btn").disabled = false;
  $("plan-btn").textContent = "🔄 重新生成方案";
}

// ===== 绑定 =====
function bindAll() {
  document.querySelectorAll(".tab").forEach(b => b.onclick = () => switchTab(b.dataset.tab));
  $("upload-zone").onclick = () => $("file-input").click();
  $("file-input").onchange = e => handleUpload(e.target.files[0]);

  const selects = {
    joint: "joint", material: "material", weldType: "weldType", process: "process"
  };
  Object.entries(selects).forEach(([id, key]) => {
    const sel = $(id);
    const opts = key === "joint" ? JOINTS : key === "material" ? MATERIALS.map(m => m.name) : key === "weldType" ? WELD_TYPES : PROCESSES;
    sel.innerHTML = opts.map(o => `<option>${o}</option>`).join("");
    sel.onchange = () => { state[key] = sel.value; buildModel(); };
  });
  ["thickness", "weldSize", "current", "voltage", "travelSpeed"].forEach(id => {
    $(id).oninput = () => { state[id] = +$(id).value; buildModel(); };
  });
  $("calc-btn").onclick = calcWelding;
  $("plan-btn").onclick = generatePlan;

  // 默认触发一次计算
  calcWelding();
}

bindAll();
