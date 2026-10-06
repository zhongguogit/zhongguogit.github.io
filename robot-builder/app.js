// 机器人制作助手 - 想法输入 + 3D可视化配置 + BOM + 代码 + 电路图 + 步骤
import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const COMPONENTS = [
  { id: "chassis", name: "亚克力底盘", icon: "⬛", price: 25, default: true },
  { id: "wheels", name: "驱动轮×2", icon: "⚙️", price: 18, default: true },
  { id: "caster", name: "万向轮", icon: "⭕", price: 6, default: true },
  { id: "motor", name: "TT减速电机×2", icon: "🔧", price: 20, default: true },
  { id: "driver", name: "L298N驱动板", icon: "🔌", price: 12, default: true },
  { id: "uno", name: "Arduino UNO", icon: "💻", price: 35, default: true },
  { id: "ultrasonic", name: "HC-SR04超声波", icon: "📡", price: 8, default: false },
  { id: "ir", name: "红外循迹×2", icon: "🛤️", price: 10, default: false },
  { id: "servo", name: "SG90舵机", icon: "🦾", price: 12, default: false },
  { id: "arm", name: "机械臂套件", icon: "🦿", price: 45, default: false },
  { id: "camera", name: "ESP32-CAM", icon: "📷", price: 30, default: false },
  { id: "led", name: "WS2812灯带", icon: "💡", price: 15, default: false },
  { id: "battery", name: "18650电池盒", icon: "🔋", price: 15, default: true },
  { id: "jumper", name: "杜邦线+面包板", icon: "🧵", price: 10, default: true }
];

const state = { enabled: {}, idea: "" };
COMPONENTS.forEach(c => state.enabled[c.id] = c.default);

let scene, camera, renderer, controls, robotGroup;

function $(id) { return document.getElementById(id); }

function switchTab(t) {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === t));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === "panel-" + t));
  if (t === "config" && !scene) init3D();
  if (t === "bom") renderBOM();
  if (t === "code") renderCode();
  if (t === "circuit") renderCircuit();
  if (t === "steps") renderSteps();
}

// ===== AI 想法解析 =====
function useSuggestion(text) { $("idea-input").value = text; }

async function analyzeIdea() {
  const idea = $("idea-input").value.trim();
  if (!idea) { alert("请先描述你想做的机器人想法"); return; }
  state.idea = idea;
  $("analyze-btn").disabled = true;
  $("analyze-btn").innerHTML = '<span class="spinner"></span>AI 分析中…';
  $("ai-result").innerHTML = "";
  try {
    const prompt = `用户想做一个机器人，描述如下："${idea}"\n\n请作为资深机器人工程师，给出一份简洁的方案建议，包含：\n1. 功能定位（一句话）\n2. 推荐核心模块（列出3-6个关键部件）\n3. 实现难度（低/中/高）\n4. 预计总成本（元）\n5. 一句话鼓励\n\n用中文，简洁明了。`;
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "openai" })
    });
    const text = await res.text();
    $("ai-result").innerHTML = `<div style="white-space:pre-wrap;font-size:14px;line-height:1.8;background:rgba(0,0,0,0.25);padding:16px;border-radius:12px">${text}</div>`;
    // 自动跳到3D配置
    setTimeout(() => switchTab("config"), 800);
  } catch (e) {
    $("ai-result").textContent = "⚠️ 分析失败：" + e.message;
  }
  $("analyze-btn").disabled = false;
  $("analyze-btn").textContent = "✨ 重新分析";
}

// ===== 3D 机器人配置 =====
function init3D() {
  const c = $("model3d");
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, c.clientWidth / c.clientHeight, 0.1, 1000);
  camera.position.set(8, 8, 12);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(c.clientWidth, c.clientHeight);
  c.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dl = new THREE.DirectionalLight(0xffffff, 0.8);
  dl.position.set(10, 20, 10);
  scene.add(dl);
  const grid = new THREE.GridHelper(30, 30, 0x334155, 0x1e293b);
  scene.add(grid);
  buildRobot();
  animate();
  window.addEventListener("resize", () => {
    camera.aspect = c.clientWidth / c.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(c.clientWidth, c.clientHeight);
  });
}

function mat(color, metal = 0.3, rough = 0.6) {
  return new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });
}

function buildRobot() {
  if (!scene) return;
  if (robotGroup) scene.remove(robotGroup);
  robotGroup = new THREE.Group();
  const e = state.enabled;

  // 底盘
  if (e.chassis) {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 6), mat(0x475569, 0.1, 0.8));
    chassis.position.y = 1.2;
    robotGroup.add(chassis);
  }
  // 驱动轮
  if (e.wheels) {
    const wheelGeo = new THREE.CylinderGeometry(1, 1, 0.5, 24);
    const wheelMat = mat(0x1e293b, 0.2, 0.9);
    const w1 = new THREE.Mesh(wheelGeo, wheelMat);
    w1.rotation.z = Math.PI / 2;
    w1.position.set(-2.5, 0.5, 3.2);
    const w2 = w1.clone();
    w2.position.z = -3.2;
    robotGroup.add(w1, w2);
  }
  // 万向轮
  if (e.caster) {
    const caster = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), mat(0x64748b, 0.3, 0.8));
    caster.position.set(4, 0.6, 0);
    robotGroup.add(caster);
  }
  // Arduino UNO
  if (e.uno) {
    const uno = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 2.2), mat(0x065f46, 0.3, 0.5));
    uno.position.set(0, 1.7, 0);
    robotGroup.add(uno);
  }
  // L298N
  if (e.driver) {
    const drv = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 1.5), mat(0x14532d, 0.3, 0.5));
    drv.position.set(-2.5, 1.7, 0);
    robotGroup.add(drv);
  }
  // 超声波
  if (e.ultrasonic) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 1.2), mat(0x0f766e, 0.3, 0.5));
    base.position.set(4.2, 2, 0);
    robotGroup.add(base);
    const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 12), mat(0x94a3b8));
    s1.rotation.x = Math.PI / 2;
    s1.position.set(5, 2, 0.4);
    const s2 = s1.clone();
    s2.position.z = -0.4;
    robotGroup.add(s1, s2);
  }
  // 红外
  if (e.ir) {
    for (let i = 0; i < 2; i++) {
      const ir = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), mat(0x7f1d1d));
      ir.position.set(3.8, 0.9, i === 0 ? 1.5 : -1.5);
      robotGroup.add(ir);
    }
  }
  // 舵机+机械臂
  if (e.servo || e.arm) {
    const arm = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.6, 16), mat(0x475569));
    arm.add(base);
    const link1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.5, 0.4), mat(0x64748b));
    link1.position.y = 1.5;
    arm.add(link1);
    if (e.arm) {
      const link2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.8, 0.35), mat(0x94a3b8));
      link2.position.set(0.6, 2.8, 0);
      link2.rotation.z = -Math.PI / 4;
      arm.add(link2);
      const claw = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.8), mat(0xf59e0b));
      claw.position.set(1.4, 2.1, 0);
      arm.add(claw);
    }
    arm.position.set(0, 1.9, -2);
    robotGroup.add(arm);
  }
  // 摄像头
  if (e.camera) {
    const cam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1), mat(0x1e293b));
    cam.position.set(0, 3, 2);
    robotGroup.add(cam);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.3, 12), mat(0x0ea5e9, 0.4, 0.3));
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 3, 2.6);
    robotGroup.add(lens);
  }
  // LED灯带
  if (e.led) {
    for (let i = 0; i < 8; i++) {
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), mat(0x06b6d4, 0.8, 0.2));
      led.position.set(-3.5 + i, 1.5, 3.1);
      robotGroup.add(led);
    }
  }
  // 电池
  if (e.battery) {
    const bat = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 1.8), mat(0x422006, 0.2, 0.7));
    bat.position.set(2.5, 1.9, 0);
    robotGroup.add(bat);
  }
  scene.add(robotGroup);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function toggleComp(id) {
  state.enabled[id] = !state.enabled[id];
  const btn = document.querySelector(`[data-comp="${id}"]`);
  btn.classList.toggle("on", state.enabled[id]);
  buildRobot();
}

// ===== BOM =====
function renderBOM() {
  const items = COMPONENTS.filter(c => state.enabled[c.id]);
  const total = items.reduce((s, c) => s + c.price, 0);
  $("bom-list").innerHTML = items.map(c =>
    `<div class="bom-item"><span>${c.icon} ${c.name}</span><span class="price">¥${c.price}</span></div>`
  ).join("");
  $("bom-total").textContent = `合计：¥${total}（参考价，淘宝可更低）`;
}

// ===== Arduino 代码 =====
function renderCode() {
  const e = state.enabled;
  let code = `// 机器人控制代码 - Arduino UNO
// 由 zhongguogit 机器人制作助手生成
#include <Servo.h>

// ===== 引脚定义 =====
#define IN1  8   // L298N 输入1
#define IN2  9   // L298N 输入2
#define IN3  10  // L298N 输入3
#define IN4  11  // L298N 输入4
#define ENA  5   // 左电机PWM
#define ENB  6   // 右电机PWM
`;
  if (e.ultrasonic) {
    code += `#define TRIG 2\n#define ECHO 3\nlong duration; int distance;\n`;
  }
  if (e.ir) code += `#define IR1 A0\n#define IR2 A1\n`;
  if (e.servo) code += `Servo myServo;\n`;
  if (e.led) code += `#include <Adafruit_NeoPixel.h>\n#define LED_PIN 4\n#define LED_COUNT 8\nAdafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);\n`;

  code += `\nvoid setup() {\n  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);\n  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);\n  Serial.begin(9600);\n`;
  if (e.servo) code += `  myServo.attach(7);\n`;
  if (e.led) code += `  strip.begin(); strip.show();\n`;
  code += `  Serial.println("机器人启动！");\n}\n\n`;

  code += `void loop() {\n`;
  if (e.ultrasonic) {
    code += `  // 超声波测距避障\n  distance = readDistance();\n  if (distance < 20) { stop(); delay(300); turnRight(); delay(500); }\n  else forward();\n`;
  } else if (e.ir) {
    code += `  // 红外循迹\n  int l = analogRead(IR1);\n  int r = analogRead(IR2);\n  if (l > 500 && r > 500) forward();\n  else if (l < 500) turnLeft();\n  else if (r < 500) turnRight();\n  else stop();\n`;
  } else {
    code += `  forward();\n`;
  }
  code += `  delay(50);\n}\n\n`;

  code += `// ===== 电机控制 =====\nvoid forward() { setMotor(200, 200); }\nvoid turnLeft() { setMotor(100, 200); }\nvoid turnRight() { setMotor(200, 100); }\nvoid stop() { setMotor(0, 0); }\nvoid setMotor(int l, int r) {\n  digitalWrite(IN1, l > 0); digitalWrite(IN2, l < 0);\n  digitalWrite(IN3, r > 0); digitalWrite(IN4, r < 0);\n  analogWrite(ENA, abs(l)); analogWrite(ENB, abs(r));\n}\n`;

  if (e.ultrasonic) {
    code += `\nint readDistance() {\n  digitalWrite(TRIG, LOW); delayMicroseconds(2);\n  digitalWrite(TRIG, HIGH); delayMicroseconds(10);\n  digitalWrite(TRIG, LOW);\n  duration = pulseIn(ECHO, HIGH);\n  return duration * 0.034 / 2;\n}\n`;
  }
  $("code-box").textContent = code;
}

// ===== 电路图 (SVG) =====
function renderCircuit() {
  const e = state.enabled;
  let svg = `<svg viewBox="0 0 600 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">`;
  svg += `<rect width="600" height="380" fill="#0d1117"/>`;
  // Arduino
  svg += `<rect x="20" y="140" width="120" height="100" rx="6" fill="#065f46" stroke="#10b981" stroke-width="2"/>`;
  svg += `<text x="80" y="195" fill="#fff" font-size="14" text-anchor="middle" font-family="monospace">Arduino UNO</text>`;
  svg += `<text x="80" y="215" fill="#6ee7b7" font-size="10" text-anchor="middle" font-family="monospace">5V  GND  D2-D13</text>`;
  let x = 200;
  if (e.driver) {
    svg += `<rect x="${x}" y="140" width="100" height="100" rx="6" fill="#14532d" stroke="#22c55e" stroke-width="2"/>`;
    svg += `<text x="${x+50}" y="195" fill="#fff" font-size="12" text-anchor="middle" font-family="monospace">L298N</text>`;
    svg += `<text x="${x+50}" y="215" fill="#86efac" font-size="9" text-anchor="middle" font-family="monospace">驱动板</text>`;
    svg += `<line x1="140" y1="170" x2="${x}" y2="170" stroke="#f59e0b" stroke-width="1.5"/>`;
    svg += `<line x1="140" y1="190" x2="${x}" y2="190" stroke="#f59e0b" stroke-width="1.5"/>`;
    svg += `<line x1="140" y1="210" x2="${x}" y2="210" stroke="#94a3b8" stroke-width="1.5"/>`;
    x += 140;
  }
  if (e.motor || e.wheels) {
    svg += `<circle cx="${x+30}" cy="160" r="18" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>`;
    svg += `<text x="${x+30}" y="164" fill="#fff" font-size="11" text-anchor="middle" font-family="monospace">M1</text>`;
    svg += `<circle cx="${x+30}" cy="220" r="18" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>`;
    svg += `<text x="${x+30}" y="224" fill="#fff" font-size="11" text-anchor="middle" font-family="monospace">M2</text>`;
    svg += `<line x1="${x-10}" y1="160" x2="${x+12}" y2="160" stroke="#38bdf8" stroke-width="1.5"/>`;
    svg += `<line x1="${x-10}" y1="220" x2="${x+12}" y2="220" stroke="#38bdf8" stroke-width="1.5"/>`;
    x += 100;
  }
  if (e.ultrasonic) {
    svg += `<rect x="${x}" y="40" width="80" height="50" rx="4" fill="#0f766e" stroke="#2dd4bf" stroke-width="2"/>`;
    svg += `<text x="${x+40}" y="70" fill="#fff" font-size="11" text-anchor="middle" font-family="monospace">HC-SR04</text>`;
    svg += `<line x1="80" y1="140" x2="${x+40}" y2="90" stroke="#2dd4bf" stroke-width="1.5" stroke-dasharray="4"/>`;
    x += 110;
  }
  if (e.servo) {
    svg += `<rect x="${x}" y="40" width="70" height="50" rx="4" fill="#475569" stroke="#fbbf24" stroke-width="2"/>`;
    svg += `<text x="${x+35}" y="70" fill="#fff" font-size="11" text-anchor="middle" font-family="monospace">SG90</text>`;
    x += 100;
  }
  if (e.ir) {
    svg += `<rect x="${x}" y="40" width="70" height="50" rx="4" fill="#7f1d1d" stroke="#f87171" stroke-width="2"/>`;
    svg += `<text x="${x+35}" y="70" fill="#fff" font-size="11" text-anchor="middle" font-family="monospace">IR×2</text>`;
  }
  if (e.battery) {
    svg += `<rect x="20" y="280" width="80" height="50" rx="4" fill="#422006" stroke="#f59e0b" stroke-width="2"/>`;
    svg += `<text x="60" y="310" fill="#fcd34d" font-size="11" text-anchor="middle" font-family="monospace">🔋 7.4V</text>`;
    svg += `<line x1="60" y1="280" x2="60" y2="240" stroke="#f59e0b" stroke-width="1.5"/>`;
  }
  svg += `<text x="300" y="360" fill="#64748b" font-size="11" text-anchor="middle" font-family="monospace">电路连接示意图（实际接线请参考各模块数据手册）</text>`;
  svg += `</svg>`;
  $("circuit-svg").innerHTML = svg;
}

// ===== 组装步骤 =====
function renderSteps() {
  const e = state.enabled;
  const steps = [
    { t: "准备所有零件，对照BOM清单清点", d: "将底盘、电机、轮子、Arduino、驱动板等所有部件摆放在桌面上，避免遗漏。" },
    { t: "安装电机和轮子到底盘", d: "用螺丝将TT减速电机固定在底盘两侧的电机孔位，安装驱动轮。" + (e.caster ? " 在底盘前端安装万向轮。" : "") },
    { t: "固定Arduino和L298N驱动板", d: "用铜柱或双面胶将Arduino UNO和L298N驱动板固定在底盘上方，留出接线空间。" },
    { t: "接线：电机 → L298N → Arduino", d: "将左右电机线分别接入L298N的OUT1/OUT2和OUT3/OUT4；L298N的IN1-IN4接Arduino D8-D11，ENA/ENB接D5/D6。" },
    { t: "安装传感器", d: (e.ultrasonic ? "在底盘前方安装HC-SR04超声波模块，TRIG接D2，ECHO接D3。" : "") + (e.ir ? "在底盘底部安装红外循迹模块，接A0/A1。" : "") + (!e.ultrasonic && !e.ir ? "（当前未选传感器，可跳过）" : "") },
    { t: "安装机械臂/舵机", d: (e.servo || e.arm ? "将舵机固定在底盘上，信号脚接D7。如果有机械臂套件，按说明书组装连杆和夹爪。" : "（未选舵机/机械臂，跳过）") },
    { t: "安装摄像头和LED", d: (e.camera ? "将ESP32-CAM固定在底盘前方高处。" : "") + (e.led ? "将WS2812灯带沿底盘边缘粘贴，数据脚接D4。" : "") },
    { t: "连接电源", d: "将18650电池盒输出接到L298N的电源输入（注意正负极），Arduino可由L298N的5V输出供电。" },
    { t: "上传代码测试", d: "用USB线连接Arduino到电脑，打开Arduino IDE，选择对应板卡和端口，上传生成的代码。观察串口输出和电机动作。" },
    { t: "调试与优化", d: "根据实际效果调整PWM速度、传感器阈值、舵机角度。如果机器人走偏，微调左右电机速度。" }
  ];
  $("steps-box").innerHTML = steps.map((s, i) =>
    `<div class="step"><div class="step-num">${i + 1}</div><div class="step-text"><b>${s.t}</b><br>${s.d}</div></div>`
  ).join("");
}

// ===== 绑定 =====
function bindAll() {
  document.querySelectorAll(".tab").forEach(b => b.onclick = () => switchTab(b.dataset.tab));
  $("analyze-btn").onclick = analyzeIdea;
  const grid = $("comp-grid");
  grid.innerHTML = COMPONENTS.map(c =>
    `<button class="comp-btn ${state.enabled[c.id] ? 'on' : ''}" data-comp="${c.id}">${c.icon}<br>${c.name}<br><span style="color:var(--amber);font-size:11px">¥${c.price}</span></button>`
  ).join("");
  grid.querySelectorAll(".comp-btn").forEach(b =>
    b.onclick = () => toggleComp(b.dataset.comp)
  );
}

bindAll();
