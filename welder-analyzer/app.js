// 焊工图纸分析器 - OCR识图 + 3D参数化建模 + 焊接计算 + 施工方案
// Three.js 改为动态导入，避免 CDN 加载失败导致整个页面脚本瘫痪
// 施工方案改为本地参数模板生成，不依赖外部 AI API（国内网络稳定可用）
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
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    const fd = new FormData();
    fd.append("apikey", "helloworld");
    fd.append("language", "chs");
    fd.append("file", file);
    fd.append("OCREngine", "2");
    const res = await fetch("https://api.ocr.space/parse/image", { method: "POST", body: fd, signal: ctrl.signal });
    clearTimeout(timer);
    const data = await res.json();
    const text = (data.ParsedResults || []).map(r => r.ParsedText).join("\n").trim();
    state.ocrText = text || "（未识别到文字，可在下方手动填写参数后生成方案）";
    $("ocr-status").innerHTML = text ? `✅ 识别完成，共 ${state.ocrText.length} 字` : "ℹ️ 未识别到文字，请手动填写参数";
    $("ocr-text").textContent = state.ocrText;
    $("ocr-text").classList.remove("hidden");
  } catch (e) {
    state.ocrText = "（OCR 服务暂不可用，已切换为手动参数模式，仍可正常生成施工方案）";
    $("ocr-status").innerHTML = "⚠️ OCR 识别失败（网络原因），可手动填写参数后生成方案";
    $("ocr-text").textContent = state.ocrText;
    $("ocr-text").classList.remove("hidden");
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
  const heatInput = (state.current * state.voltage * 60) / (state.travelSpeed * 1000);
  let preheat = m.preheat;
  if (t > 20) preheat = Math.max(preheat, 100);
  if (t > 30) preheat = Math.max(preheat, 150);
  const interpass = m.name.includes("不锈钢") ? 150 : preheat + 100;
  const weldArea = state.weldSize * state.weldSize * 0.5;
  const weldVolume = weldArea * 100;
  const fillerMass = (weldVolume * m.density) / 1000;
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

// ===== 施工方案（本地参数模板生成，无需外部 AI API）=====
async function generatePlan() {
  const calc = calcWelding();
  $("plan-btn").disabled = true;
  $("plan-btn").innerHTML = '<span class="spinner"></span>正在生成方案…';
  $("plan-box").innerHTML = "";
  // 模拟短暂"生成"过程，体验更自然
  await new Promise(r => setTimeout(r, 500));
  try {
    const plan = buildPlanText(calc);
    $("plan-box").textContent = plan;
  } catch (e) {
    $("plan-box").textContent = "⚠️ 方案生成失败：" + e.message;
  }
  $("plan-btn").disabled = false;
  $("plan-btn").textContent = "🔄 重新生成方案";
}

function buildPlanText(calc) {
  const m = MATERIALS.find(x => x.name === state.material);
  const t = state.thickness;
  const s = state.weldSize;
  const isSS = m.name.includes("不锈钢");
  const isAl = m.name.includes("铝");
  const isC = m.name.includes("45#") || m.name.includes("碳");
  const isLowAlloy = m.name.includes("低合金");
  const needPreheat = calc.preheat > 0;
  const thick = t >= 20;
  const veryThick = t >= 30;
  const processShort = state.process.split(" ")[0];

  // 根据板厚与坡口形式估算层数
  let layers = 1;
  if (state.weldType === "不开坡口" || state.weldType === "角焊缝") {
    layers = t > 12 ? 2 : 1;
  } else {
    layers = Math.max(1, Math.ceil(t / 4));
  }
  if (state.weldType === "X形坡口") layers = Math.max(2, layers);

  const out = [];
  const line = (s) => out.push(s);
  const sep = () => line("─".repeat(44));

  line(`《${m.name} ${state.joint}焊接施工参考方案》`);
  line(`坡口：${state.weldType}　方法：${state.process}　板厚：${t}mm　焊脚：${s}mm`);
  line("=".repeat(44));
  line("");

  // 一、焊前准备
  line("一、焊前准备");
  sep();
  // 坡口加工
  const grooveMap = {
    "V形坡口": `采用 V 形坡口，坡口角度 60°±5°，钝边 ${Math.min(2, Math.max(1, t*0.1)).toFixed(1)}mm，组对间隙 ${Math.min(3, Math.max(1, t*0.15)).toFixed(1)}mm。`,
    "X形坡口": `采用 X 形双面坡口，坡口角度 60°±5°，钝边 ${Math.min(2, Math.max(1, t*0.1)).toFixed(1)}mm，组对间隙 ${Math.min(3, Math.max(1, t*0.15)).toFixed(1)}mm，宜对称施焊控制变形。`,
    "U形坡口": `采用 U 形坡口，坡口半径 R≈${Math.max(3, t*0.2).toFixed(1)}mm，钝边 ${Math.min(2, Math.max(1, t*0.1)).toFixed(1)}mm，适合厚板深熔。`,
    "单面V形": `采用单面 V 形坡口（带垫板），坡口角度 60°±5°，背面加钢/铜衬垫强制成形。`,
    "不开坡口": `不开坡口，采用 I 形对接，组对间隙 ${Math.min(2, Math.max(0.5, t*0.1)).toFixed(1)}mm，适合薄板。`,
    "角焊缝": `角焊缝，焊脚尺寸 ${s}mm，需保证焊喉厚度 ≥ ${(s*0.7).toFixed(1)}mm。`
  };
  line("1. 坡口加工");
  line("   " + (grooveMap[state.weldType] || "按图纸要求加工坡口。"));
  line("   坡口面应平整，无裂纹、夹层、切割瘤；加工后用样板检查角度与钝边。");

  // 清理
  line("2. 焊前清理");
  if (isAl) {
    line("   焊前用不锈钢丝刷或化学方法去除坡口及两侧各 30mm 范围内的氧化膜与油污，");
    line("   清理后 4 小时内施焊，避免再次氧化。");
  } else if (isSS) {
    line("   坡口及两侧各 20mm 范围内用丙酮或酒精清除油污、水分，再用不锈钢丝刷除锈，");
    line("   严禁使用碳钢钢丝刷，防止铁离子污染。");
  } else {
    line("   坡口及两侧各 20mm 范围内清除油、锈、氧化皮、水分等，露出金属光泽。");
  }

  // 组对
  line("3. 组对与定位焊");
  const gap = Math.min(3, Math.max(1, t * 0.15)).toFixed(1);
  line(`   组对间隙 ${gap}mm，错边量 ≤ ${(t*0.1).toFixed(1)}mm 且不大于 2mm。`);
  line(`   定位焊焊缝长 15~25mm，间距 150~200mm，焊脚约 ${Math.max(3, s-1)}mm；`);
  line("   定位焊两端应修磨成缓坡，以利正式焊缝接头。");

  // 预热
  line("4. 预热要求");
  if (needPreheat) {
    line(`   焊前预热至 ${calc.preheat}℃ 以上，预热范围为焊缝两侧各不小于 3 倍板厚（≥100mm），`);
    line("   用红外测温仪或测温笔在距焊缝 50mm 处测量，确保温度均匀。");
    if (isC) line("   中碳钢淬硬倾向大，预热必须充分，防止冷裂纹。");
  } else {
    line(`   母材为 ${m.name}，板厚 ${t}mm，通常无需预热；`);
    line("   当环境温度低于 0℃ 或工件潮湿时，应适当预热至 20~50℃ 除潮。");
  }

  line("");

  // 二、焊接参数
  line("二、焊接参数");
  sep();
  line(`焊接方法：${state.process}`);
  line(`焊接电流：${state.current} A　电弧电压：${state.voltage} V`);
  line(`焊接速度：${state.travelSpeed} cm/min　线能量：${calc.heatInput.toFixed(2)} kJ/cm`);
  line(`预热温度：${calc.preheat}℃　层间温度：≤ ${calc.interpass}℃`);
  line(`填充金属消耗：约 ${calc.fillerMass.toFixed(1)} g/m 焊缝`);
  line("");

  // 推荐层数与道次
  line(`推荐焊层数：${layers} 层`);
  const passPlan = [];
  for (let i = 1; i <= layers; i++) {
    if (i === 1) {
      passPlan.push(`  第${i}层（打底）：电流 ${Math.round(state.current*0.85)}A，电压 ${(state.voltage-1).toFixed(1)}V，单面焊双面成形`);
    } else if (i === layers) {
      passPlan.push(`  第${i}层（盖面）：电流 ${state.current}A，电压 ${state.voltage}V，焊缝余高 0~3mm`);
    } else {
      passPlan.push(`  第${i}层（填充）：电流 ${Math.round(state.current*0.95)}A，电压 ${state.voltage}V，逐层清渣`);
    }
  }
  passPlan.forEach(p => line(p));

  // 线能量控制提示
  line("");
  if (calc.heatInput > 25) {
    line("⚠️ 当前线能量偏高，建议适当提高焊接速度或降低电流，避免晶粒粗大、韧性下降。");
  } else if (calc.heatInput < 8) {
    line("ℹ️ 当前线能量较低，注意未熔合、未焊透风险，可适当降低焊速。");
  } else {
    line("✅ 线能量处于合理范围。");
  }

  // 层间温度控制
  if (isSS) {
    line("⚠️ 不锈钢应严格控制层间温度 ≤ 150℃，必要时间隔冷却，防止晶间腐蚀。");
  }
  if (needPreheat) {
    line(`ℹ️ 层间温度保持在预热温度与 ${calc.interpass}℃ 之间，温度下降应及时补热。`);
  }

  line("");

  // 三、施工步骤
  line("三、施工步骤");
  sep();
  const steps = [];
  steps.push("① 按本方案第一节完成坡口加工、清理、组对与预热。");
  steps.push(`② 选用 ${processShort} 方法，${state.weldType === "X形坡口" ? "先焊一侧 1~2 层后翻面清根，再交替施焊" : "自一端向另一端分段退焊或跳焊"}，`);
  steps.push(`   长焊缝（>1m）采用分段退焊，每段 200~300mm，减少焊接变形。`);
  steps.push("③ 打底焊：控制熔池形状，保证背面成形，焊后清渣检查，无缺陷方可进入下一层。");
  if (layers > 2) {
    steps.push(`④ 填充焊：逐层施焊，每层厚度不大于 ${Math.max(3, s*0.6).toFixed(0)}mm，`);
    steps.push("   每层间彻底清渣，前一层焊缝表面不得有气孔、夹渣、裂纹。");
  }
  steps.push("⑤ 盖面焊：保持运条均匀，焊缝余高 0~3mm，宽出坡口每侧 1~2mm，避免咬边。");
  if (state.joint === "T形接头" || state.joint === "角接接头") {
    steps.push("⑥ 角接/T 形接头注意焊脚对称，防止未焊透与焊脚不等。");
  }
  if (state.weldType === "X形坡口") {
    steps.push("⑦ 双面坡口应对称施焊，翻面后用碳弧气刨清根并打磨露出金属光泽。");
  }
  steps.push("⑧ 焊后清理：清除焊渣、飞溅，焊缝表面光滑过渡至母材。");
  if (isAl) {
    steps.push("⑨ 铝合金焊后易变形，宜采用工装夹具刚性固定，焊后自然冷却，禁止水冷。");
  }
  if (needPreheat && (isC || isLowAlloy)) {
    steps.push("⑨ 焊后缓冷：用保温棉覆盖焊缝区，缓慢冷却至室温，防止冷裂纹。");
  }
  steps.forEach(st => line(st));

  line("");

  // 四、质量控制
  line("四、质量控制");
  sep();
  line("1. 外观检查");
  line("   焊缝表面不得有裂纹、气孔、夹渣、未熔合、咬边（深度≤0.5mm）、焊瘤等缺陷；");
  line("   焊缝余高 0~3mm，宽度均匀，与母材平滑过渡。");
  line("2. 尺寸检查");
  line(`   焊脚尺寸 ${s}mm（±1mm），焊缝长度符合图纸要求。`);
  line("3. 无损检测");
  if (isC || isLowAlloy || veryThick) {
    line("   重要接头建议 100% 射线检测（RT）或超声检测（UT），Ⅱ级合格；");
    line("   表面检测采用磁粉（MT）或渗透（PT），Ⅰ级合格。");
  } else {
    line("   一般结构按比例抽样 RT/UT 检测，Ⅲ级合格；重要部位增加 MT/PT 表面检测。");
  }
  if (isSS) {
    line("   不锈钢焊缝需进行酸洗钝化处理，确保耐蚀性能。");
  }
  line("4. 焊后热处理");
  if (veryThick && (isC || isLowAlloy)) {
    line(`   板厚 ≥ 30mm 的 ${m.name}，建议焊后进行消除应力热处理，`);
    line("   加热温度 600~650℃，保温时间按板厚 2~2.5min/mm，随炉缓冷。");
  } else if (needPreheat) {
    line("   一般无需焊后热处理；若结构拘束度大或有延迟裂纹倾向，可考虑低温去应力处理。");
  } else {
    line("   通常无需焊后热处理。");
  }

  line("");

  // 五、安全注意
  line("五、安全注意");
  sep();
  line(`1. 防护：${processShort} 焊接弧光强烈，焊工必须佩戴焊接面罩（遮光号 11~13）、`);
  line("   阻燃工作服、绝缘鞋、焊接手套，防止弧光灼伤与触电。");
  if (processShort === "GMAW/MIG" || processShort === "FCAW") {
    line("2. 通风：气保焊产生大量烟尘与臭氧，作业区必须保持良好通风，必要时配备排烟除尘装置。");
  } else if (processShort === "GTAW/TIG") {
    line("2. 通风：氩弧焊产生臭氧与氮氧化物，应加强局部通风，避免长期吸入。");
  } else {
    line("2. 通风：焊接烟尘较大，作业区保持通风，高处或密闭空间必须设机械通风。");
  }
  line("3. 防火：焊区 10m 内清除易燃易爆物品，配备灭火器材，监火人到位后方可施焊。");
  if (needPreheat) {
    line("4. 防烫：预热后工件温度较高，搬运与操作时注意防烫伤，佩戴隔热手套。");
  }
  if (isAl) {
    line("5. 铝合金焊接烟尘含铝氧化物，应加强个人呼吸防护。");
  }
  line("6. 用电：焊机接地可靠，电缆无破损，潮湿环境作业应采取绝缘隔离措施。");
  line("7. 焊后：确认作业区无复燃危险，清理现场后方可离开。");

  // OCR 图纸信息摘录
  if (state.ocrText && state.ocrText !== "（未识别到文字）" && !state.ocrText.startsWith("（OCR")) {
    line("");
    line("=".repeat(44));
    line("附：图纸 OCR 识别信息摘录");
    line("─".repeat(44));
    line(state.ocrText.slice(0, 400));
  }

  line("");
  line("=".repeat(44));
  line("⚠️ 本方案由焊接参数模板自动生成，仅供施工参考。");
  line("   实际施焊前应按相应标准编制正式焊接工艺规程（WPS），");
  line("   并经焊接工艺评定（PQR）验证及技术负责人审批后方可执行。");

  return out.join("\n");
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
  calcWelding();
}
bindAll();
