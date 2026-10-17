/* ================= 节点类型定义 ================= */
const TYPES = {
  novel:  {ic:'📖', name:'小说原文',   desc:'输入源：粘贴小说或章节文本'},
  split:  {ic:'✂️', name:'章节拆分',   desc:'把长文切成可处理的段落'},
  outline:{ic:'🧭', name:'剧情大纲',   desc:'提炼主线、人物、冲突'},
  shot:   {ic:'🎬', name:'分镜拆解',   desc:'把大纲拆成一个个镜头'},
  prompt: {ic:'✍️', name:'提示词生成', desc:'为每个镜头写画面提示词'},
  human:  {ic:'👤', name:'人工确认',   desc:'停在这里，等人过目后再继续'},
  link:   {ic:'🔗', name:'外部工具',   desc:'跳转到网页工具手动完成'},
  out:    {ic:'📦', name:'成果打包',   desc:'汇总成可粘贴的交付物'}
};

/* ================= 状态 ================= */
let nodes = [];      // {id,type,x,y}
let edges = [];      // {from,to}
let sel = null;
let seq = 1;
let dragging = null, dragOff = {x:0,y:0};
let linking = null;  // {from, x2, y2} 临时连线
const nodesEl = document.getElementById('nodes');
const canvas  = document.getElementById('canvas');
const edgesEl = document.getElementById('edges');

/* ================= 模板 ================= */
const TEMPLATES = {
  drama: {
    name: '短剧生产流程（示例）',
    nodes: [
      ['novel',   40, 40],
      ['split',   40, 175],
      ['outline', 290, 175],
      ['shot',    290, 310],
      ['prompt',  540, 310],
      ['human',   540, 445],
      ['link',    790, 445],
      ['out',     790, 310]
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]]
  },
  research: {
    name: '资料整理流程（示例）',
    nodes: [
      ['novel',  40, 40],
      ['split',  40, 175],
      ['outline',290, 175],
      ['out',    290, 310]
    ],
    edges: [[0,1],[1,2],[2,3]]
  }
};

/* ================= 渲染 ================= */
function addNode(type, x, y){
  nodes.push({id:'n'+(seq++), type, x, y});
  render();
}
function render(){
  nodesEl.innerHTML = '';
  nodes.forEach(n=>{
    const t = TYPES[n.type];
    const el = document.createElement('div');
    el.className = 'node' + (sel===n.id?' sel':'') + (n.state?' '+n.state:'');
    el.style.left = n.x+'px'; el.style.top = n.y+'px';
    el.dataset.id = n.id;
    const demoTag = ['novel','split','outline','shot','prompt'].includes(n.type)
      ? '<span class="demo-badge">演示</span>' : '';
    el.innerHTML = `<div class="nh"><span class="ic">${t.ic}</span>${t.name}${demoTag}</div>
      <div class="nt">${n.type}</div>
      <div class="nd">${n.out || t.desc}</div>
      <button class="del" title="删除">×</button>`;
    el.querySelector('.del').onclick = e=>{ e.stopPropagation(); delNode(n.id); };
    el.onmousedown = e=>{
      if(e.target.classList.contains('del')) return;
      sel = n.id; render();
      dragging = n.id;
      const r = el.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
      dragOff = {x: e.clientX - r.left, y: e.clientY - r.top};
      e.preventDefault();
      // 右键/按住 shift 拖动 = 连线
      if(e.shiftKey){ dragging=null; linking={from:n.id}; }
    };
    nodesEl.appendChild(el);
  });
  drawEdges();
}

function drawEdges(){
  edgesEl.innerHTML = '';
  edges.forEach(e=>{
    const a = nodes.find(n=>n.id===e.from), b = nodes.find(n=>n.id===e.to);
    if(!a||!b) return;
    const x1=a.x+93, y1=a.y+72, x2=b.x+93, y2=b.y;
    const my = (y1+y2)/2;
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`);
    path.setAttribute('class','edge'+(e.state?' '+e.state:''));
    path.setAttribute('marker-end', e.state==='run'?'url(#ar2)':'url(#ar)');
    edgesEl.appendChild(path);
  });
  if(linking){
    const a = nodes.find(n=>n.id===linking.from);
    if(a){
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',`M${a.x+93},${a.y+72} L${linking.x2},${linking.y2}`);
      path.setAttribute('class','edge run');
      edgesEl.appendChild(path);
    }
  }
}

function delNode(id){
  nodes = nodes.filter(n=>n.id!==id);
  edges = edges.filter(e=>e.from!==id && e.to!==id);
  if(sel===id) sel=null;
  render();
}

/* ================= 鼠标交互 ================= */
document.addEventListener('mousemove', e=>{
  const cr = canvas.getBoundingClientRect();
  if(dragging){
    const n = nodes.find(x=>x.id===dragging);
    if(n){
      n.x = Math.max(0, Math.min(cr.width-190, e.clientX-cr.left-dragOff.x));
      n.y = Math.max(0, Math.min(cr.height-80, e.clientY-cr.top-dragOff.y));
      const el = nodesEl.querySelector(`[data-id="${n.id}"]`);
      if(el){ el.style.left=n.x+'px'; el.style.top=n.y+'px'; }
      drawEdges();
    }
  }
  if(linking){
    linking.x2 = e.clientX-cr.left; linking.y2 = e.clientY-cr.top;
    drawEdges();
  }
});
document.addEventListener('mouseup', e=>{
  if(linking){
    const cr = canvas.getBoundingClientRect();
    const tgt = document.elementFromPoint(e.clientX, e.clientY)?.closest('.node');
    if(tgt && tgt.dataset.id && tgt.dataset.id !== linking.from){
      const to = tgt.dataset.id;
      if(!edges.some(x=>x.from===linking.from && x.to===to))
        edges.push({from:linking.from, to});
    }
    linking=null; render();
  }
  dragging=null;
});
canvas.onclick = e=>{
  if(e.target===canvas || e.target.id==='svg' || e.target.tagName==='g'){
    sel=null; render();
  }
};

/* ================= 左侧节点库 ================= */
const pal = document.getElementById('pal');
Object.entries(TYPES).forEach(([k,t])=>{
  const d = document.createElement('div');
  d.className='pal-i';
  d.innerHTML = `<span class="ic">${t.ic}</span>${t.name}<span class="add">+</span>`;
  d.onclick = ()=>{
    const i = nodes.length;
    addNode(k, 60 + (i%3)*40, 60 + (i%7)*52);
  };
  pal.appendChild(d);
});

/* ================= 日志 ================= */
const logbody = document.getElementById('logbody');
function log(kind, title, msg){
  const d = document.createElement('div');
  d.className = 'lg ' + kind;
  const now = new Date().toLocaleTimeString('zh-CN',{hour12:false});
  d.innerHTML = `<span class="t">${now}</span><div class="m"><b>${title}</b>${msg?'<br>'+msg:''}</div>`;
  logbody.appendChild(d);
  logbody.scrollTop = logbody.scrollHeight;
}
function clearLog(){ logbody.innerHTML=''; }

/* ================= 运行演示 ================= */
const DEMO_OUT = {
  novel:  '已载入示例文本：<br>「她推开那扇门，风灌进来，桌上的信被吹落……」<br><i>（约 1,200 字，演示用）</i>',
  split:  '切分为 6 个段落，平均 200 字/段',
  outline:'主线：一次未说出口的告别<br>人物：她 / 母亲<br>冲突：留下的信 vs 即将离开的车',
  shot:   '拆出 8 个镜头：<br>① 推门 ② 风吹信 ③ 俯拍信纸 ④ 她拾起 ⑤ 特写眼睛 ⑥ 窗外车 ⑦ 手停在门把 ⑧ 空椅子',
  prompt: '镜头①：「老旧木门被推开，逆光，尘埃在光柱中浮动，35mm，浅景深」<br>镜头②：「信纸在地板上被风卷起，慢动作，暖色调」<br>…（共 8 条，可直接复制粘贴）',
  human:  '⏸ 已暂停：需人工确认分镜是否符合预期。<br><i>真实系统中，这里应停下等你说“继续”。</i>',
  link:   '已生成提示词包。<br>下一步需人工前往 <b>app.pavo-ai.work</b> 粘贴生成视频——本页无法代为操作。',
  out:    '📦 交付物：<br>· 分镜表 8 条<br>· 提示词包 8 条<br>· 素材清单 1 份'
};

let running = false;
function topo(){
  // 简单的按 y 排序（演示足够）：按连线结构做 BFS
  const hasIn = new Set(edges.map(e=>e.to));
  const starts = nodes.filter(n=>!hasIn.has(n.id));
  const order = [], seen = new Set();
  const q = starts.length? [...starts] : [...nodes];
  while(q.length){
    const n = q.shift();
    if(seen.has(n.id)) continue;
    seen.add(n.id); order.push(n);
    edges.filter(e=>e.from===n.id).forEach(e=>{
      const t = nodes.find(x=>x.id===e.to);
      if(t && !seen.has(t.id)) q.push(t);
    });
  }
  nodes.forEach(n=>{ if(!seen.has(n.id)) order.push(n); });
  return order;
}

async function run(){
  if(running) return;
  if(!nodes.length){ log('err','没有节点','先点「载入示例」或从左侧添加。'); return; }
  running = true;
  document.getElementById('btn-run').disabled = true;
  clearLog();
  nodes.forEach(n=>{ n.state=null; n.out=null; });
  edges.forEach(e=>{ e.state=null; });
  render();

  const order = topo();
  log('run','开始运行', `共 ${order.length} 个节点，按连线顺序执行。<br><i>注意：以下内容为预设演示数据，非真实 AI 输出。</i>`);

  for(let i=0;i<order.length;i++){
    const n = order[i];
    const t = TYPES[n.type];
    n.state='run'; render();
    log('run', `▶ ${t.name}`, '执行中…');
    await sleep(760);

    if(n.type==='human'){
      n.state='ok';
      n.out = DEMO_OUT.human.replace(/<[^>]+>/g,'');
      render();
      log('wait', `⏸ ${t.name}`, '流程在此暂停 —— 需要人工确认。');
      log('wait','等待用户', '真实系统会停在这里等「继续」。本演示到此结束该分支。');
      // 边标记
      const outE = edges.filter(e=>e.from===n.id);
      outE.forEach(e=>e.state='wait');
      drawEdges();
      break;
    }

    n.state='ok';
    n.out = (DEMO_OUT[n.type]||t.desc).replace(/<br>/g,' / ');
    render();
    log('ok', `✓ ${t.name}`, DEMO_OUT[n.type]||t.desc);

    edges.filter(e=>e.from===n.id).forEach(e=>{ e.state='done'; });
    drawEdges();
    await sleep(340);
  }

  log('ok','演示结束', '回顾：节点=能力，连线=数据流向，暂停点=人来兜底。');
  running = false;
  document.getElementById('btn-run').disabled = false;
}
const sleep = ms=>new Promise(r=>setTimeout(r,ms));

/* ================= 按钮 ================= */
document.getElementById('btn-run').onclick = run;

document.getElementById('btn-tpl').onclick = ()=>{
  loadTemplate('drama');
};
function loadTemplate(key){
  const t = TEMPLATES[key];
  nodes = []; edges = []; sel=null; seq=1;
  const ids = t.nodes.map(([type,x,y])=>{
    const id='n'+(seq++); nodes.push({id,type,x,y}); return id;
  });
  t.edges.forEach(([a,b])=> edges.push({from:ids[a], to:ids[b]}));
  document.getElementById('tplname').textContent = t.name;
  render(); clearLog();
  log('ok','已载入示例', t.name + '<br>点「▶ 运行工作流」看它一步步走。');
}

document.getElementById('btn-clear').onclick = ()=>{
  nodes=[]; edges=[]; sel=null; running=false;
  document.getElementById('btn-run').disabled=false;
  document.getElementById('tplname').textContent='（空画布）';
  render(); clearLog();
};

const modal = document.getElementById('modal');
document.getElementById('btn-help').onclick = ()=> modal.classList.add('on');
document.getElementById('btn-close-modal').onclick = ()=> modal.classList.remove('on');
modal.onclick = e=>{ if(e.target===modal) modal.classList.remove('on'); };

/* 首次进入自动弹教程 */
window.addEventListener('load', ()=>{
  modal.classList.add('on');
  loadTemplate('drama');
  clearLog();
});

window.addEventListener('resize', drawEdges);

/* ================= 待改进清单 ================= */
const GAPS = [
  {
    n:1, lv:'阻断', t:'AI 输出是假的（写死的示例文本）',
    miss:'一个能持有 API Key 的服务端。（Key 放前端 = 公开泄露，这是硬约束，不是偷懒）',
    file:'新增 <code>api/generate.js</code>（Vercel / Netlify / Cloudflare Worker 均可）',
    code:`export default async function handler(req, res) {
  const { prompt } = req.body;                    // 前端只传 prompt
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": \`Bearer \${process.env.OPENAI_KEY}\`   // Key 只在服务端
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    })
  });
  const d = await r.json();
  res.status(r.ok ? 200 : 502).json({ text: d.choices?.[0]?.message?.content ?? null });
}`,
    client:`// workflow.js 里把 DEMO_OUT[type] 换成真调用
async function callAI(prompt){
  const r = await fetch("/api/generate", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ prompt })
  });
  if(!r.ok) throw new Error("API " + r.status);
  return (await r.json()).text;
}`,
    verify:'把 OPENAI_KEY 设为环境变量后部署；点运行时观察日志里出现真实生成内容；故意清空 Key，应看到 502 而不是「成功」。'
  },
  {
    n:2, lv:'阻断', t:'分镜 / 提示词质量不可控',
    miss:'结构化输出约束 + 校验器。否则模型每次返回的格式都不一样，下游节点无法消费。',
    file:'新增 <code>prompts/shot.js</code> 与 <code>lib/validate.js</code>',
    code:`// prompts/shot.js —— 强制 JSON 结构
export const SHOT_PROMPT = (novel) => \`
你是短剧分镜师。把以下小说拆成镜头，只输出 JSON，不要任何解释。
严格遵循此 schema：
{"shots":[{"no":1,"scene":"场景描述","camera":"景别+机位",
           "lines":"台词或旁白","prompt":"文生视频中文提示词"}]}
小说：\${novel}\`;`,
    client:`// lib/validate.js —— 不合格就退回重生成，不要直接展示
export function validateShots(o){
  if(!o || !Array.isArray(o.shots) || !o.shots.length) return "缺少 shots 数组";
  for(const s of o.shots){
    if(!s.no || !s.prompt) return \`镜头 \${s.no ?? "?"} 缺 prompt\`;
    if(s.prompt.length < 8) return \`镜头 \${s.no} 提示词过短\`;
  }
  return null;   // null = 通过
}`,
    verify:'喂一段小说，检查返回能否 <code>JSON.parse</code>；再故意喂空字符串，应返回「缺少 shots 数组」而不是崩掉。'
  },
  {
    n:3, lv:'重要', t:'工作流不会保存（刷新就没了）',
    miss:'持久化。前端 localStorage 可解 90%，要跨设备才需数据库。',
    file:'改 <code>workflow.js</code> 的 <code>render()</code> 之后，新增两个函数并挂到按钮',
    code:`// 保存 / 读取（约 15 行搞定）
function saveWF(){
  localStorage.setItem("wf", JSON.stringify({
    nodes: nodes.map(({id,type,x,y})=>({id,type,x,y})),
    edges, seq
  }));
}
function loadWF(){
  const raw = localStorage.getItem("wf");
  if(!raw) return false;
  const d = JSON.parse(raw);
  nodes = d.nodes || []; edges = d.edges || [];
  seq = d.seq || nodes.length + 1;
  render(); return true;
}
// 每次结构变化后调用
const _render = render;
render = function(){ _render(); saveWF(); };`,
    client:`// 导出 / 导入 JSON（加到顶栏）
document.getElementById("btn-export").onclick = () => {
  const blob = new Blob([JSON.stringify({nodes,edges},null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "workflow.json"; a.click();
};`,
    verify:'拖几个节点 → 刷新页面 → 节点还在；点导出应下载 workflow.json，内容与画布一致。'
  },
  {
    n:4, lv:'阻断', t:'不能真的出片（Pavo AI 无 API）',
    miss:'一个对外开放 API 的视频服务，或承认「必须人工」并把这个环节做顺。',
    file:'改 <code>workflow.js</code> 的 <code>link</code> 节点逻辑',
    code:`// 方案 A：有 API 的服务（以 Replicate 为例）
async function makeVideo(prompt){
  const r = await fetch("/api/video", {        // 同样走后端代理
    method:"POST", body: JSON.stringify({prompt})
  });
  const { url, id } = await r.json();
  return { url, id };                          // 轮询 id 直到 ready
}

// 方案 B：保留人工，但把交接做顺
function handoff(promptPack){
  navigator.clipboard.writeText(promptPack);   // 提示词进剪贴板
  window.open("https://app.pavo-ai.work/", "_blank");  // 同时开新标签
  log("wait", "已复制提示词", "已打开 Pavo AI，粘贴即可。注意：不会替你提交。");
}`,
    client:`注意：Pavo AI 是网页应用，<b>没有公开 API</b>，无法自动提交。
如果坚持走它，只能做方案 B（剪贴板 + 开新标签）。
想全自动，必须换有 API 的服务——这是「换供应商」级别的决策，不是改代码能绕过。`,
    verify:'点运行到「外部工具」节点，检查剪贴板里是否真有提示词、是否新开标签页；若用方案 A，检查能否拿到视频 URL。'
  },
  {
    n:5, lv:'重要', t:'连线手感粗糙（要按 Shift）',
    miss:'从节点边缘圆点起拖的标准交互 + 可点选删除的单条连线。',
    file:'改 <code>workflow.js</code> 的节点模板与 <code>drawEdges()</code>',
    code:`// 1) 节点右侧加一个「输出口」
el.innerHTML += \`<div class="port" data-id="\${n.id}"></div>\`;

// 2) 从 port 起拖才开始连线（替代 Shift 键）
el.querySelector(".port").onmousedown = (e) => {
  e.stopPropagation();
  const cr = canvas.getBoundingClientRect();
  linking = { from: n.id, x2: e.clientX-cr.left, y2: e.clientY-cr.top };
};

// 3) 连线可点击删除
path.style.pointerEvents = "stroke";
path.onclick = () => { edges = edges.filter(x => x !== e); render(); };`,
    client:`.port{
  position:absolute; right:-7px; top:50%; transform:translateY(-50%);
  width:14px; height:14px; border-radius:50%;
  background:#0a0a0b; border:2px solid var(--ac); cursor:crosshair;
}
.port:hover{ background:var(--ac); }
.edge{ pointer-events:stroke; cursor:pointer; }`,
    verify:'不按 Shift，直接从右侧圆点拖到另一个节点，应成功连线；点连线应删除；鼠标悬停圆点应变色。'
  },
  {
    n:6, lv:'重要', t:'不能撤销 / 重做',
    miss:'一个快照栈。40 行内可完成，不需要任何库。',
    file:'改 <code>workflow.js</code>，包住所有结构变更',
    code:`const hist = { stack: [], idx: -1 };

function snapshot(){
  const s = JSON.stringify({nodes, edges});
  if(hist.stack[hist.idx] === s) return;   // 无变化不记
  hist.stack = hist.stack.slice(0, hist.idx + 1);
  hist.stack.push(s);
  hist.idx = hist.stack.length - 1;
  if(hist.stack.length > 50) { hist.stack.shift(); hist.idx--; }
}

function undo(){
  if(hist.idx <= 0) return;
  hist.idx--;
  const s = JSON.parse(hist.stack[hist.idx]);
  nodes = s.nodes; edges = s.edges; render();
}
function redo(){
  if(hist.idx >= hist.stack.length - 1) return;
  hist.idx++;
  const s = JSON.parse(hist.stack[hist.idx]);
  nodes = s.nodes; edges = s.edges; render();
}

document.addEventListener("keydown", e => {
  if((e.metaKey || e.ctrlKey) && e.key === "z"){ e.preventDefault(); e.shiftKey ? redo() : undo(); }
});`,
    client:`调用时机：在 <code>addNode</code> / <code>delNode</code> / 连线成功 / 拖动结束 之后各调一次 <code>snapshot()</code>。
<b>不要</b>在 <code>mousemove</code> 里调，否则每一帧都会存一次。`,
    verify:'加 3 个节点 → Ctrl+Z 三次应逐个消失 → Ctrl+Shift+Z 应恢复回来；连续拖拽只应产生一条历史记录。'
  },
  {
    n:7, lv:'体验', t:'手机端不可用',
    miss:'一套不依赖拖拽的窄屏视图。拖拽在触屏上永远难用，正确做法是换交互形态，不是修拖拽。',
    file:'改 <code>workflow.html</code> 的媒体查询 + 新增列表视图',
    code:`@media (max-width: 680px){
  .canvaswrap{ display:none; }      /* 窄屏隐藏画布 */
  .side{ display:block; width:100%; }
  #mobileflow{ display:block; }     /* 改用纵向列表 */
}
#mobileflow{ display:none; padding:14px; }`,
    client:`// 用同一份 nodes/edges 渲染成纵向列表
function renderMobile(){
  const order = topo();
  document.getElementById("mobileflow").innerHTML = order.map((n, i) => \`
    <div class="mrow">
      <span class="mno">\${i+1}</span>
      <div><b>\${TYPES[n.type].ic} \${TYPES[n.type].name}</b>
      <p>\${TYPES[n.type].desc}</p></div>
      <button onclick="delNode('\${n.id}')">删</button>
    </div>\`).join("");
}`,
    verify:'用浏览器设备模拟选 iPhone，应看到纵向流程列表而非空白画布；增删节点应同步反映在列表里。'
  }
];

const LV_COLOR = {
  '阻断': 'bad',
  '重要': 'warn',
  '体验': 'low'
};

function renderGaps(){
  const box = document.getElementById('gaplist');
  if(!box) return;
  box.innerHTML = GAPS.map(g=>`
    <div class="gapitem">
      <div class="gaph">
        <span class="gapn">${g.n}</span>
        <span class="gaplv" data-lv="${g.lv}">${g.lv}</span>
        <span class="gapt">${g.t}</span>
      </div>

      <div class="gaprow"><b>缺什么</b><span>${g.miss}</span></div>
      <div class="gaprow"><b>改哪里</b><span>${g.file}</span></div>

      <div class="codelbl">服务端 / 核心逻辑</div>
      <pre class="gcode">${esc(g.code)}</pre>

      <div class="codelbl">前端改动 / 样式</div>
      <pre class="gcode">${esc(g.client)}</pre>

      <div class="gaprow verify"><b>怎么验证</b><span>${g.verify}</span></div>
    </div>
  `).join('');
}

function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

const gapmodal = document.getElementById('gapmodal');
const btnGaps = document.getElementById('btn-gaps');
if(btnGaps){
  btnGaps.onclick = ()=>{ renderGaps(); gapmodal.classList.add('on'); };
  const c = document.createElement('style');
  c.textContent = `
    .warnbtn{border-color:rgba(251,191,36,.45);color:var(--warn)}
    .warnbtn:hover{border-color:var(--warn);background:rgba(251,191,36,.08)}
    .warnbtn .cnt{font-family:var(--mono);font-size:10px;background:rgba(251,191,36,.2);
      border-radius:10px;padding:1px 6px;margin-left:2px}
    .gaps{display:flex;flex-direction:column;gap:14px;margin-top:16px}
    .gapitem{background:var(--bg);border:1px solid var(--line);border-radius:9px;padding:16px 18px}
    .gaph{display:flex;align-items:center;gap:9px;margin-bottom:12px}
    .gapn{font-family:var(--mono);font-size:11px;color:var(--tx3);width:18px}
    .gaplv{font-size:10px;font-family:var(--mono);padding:2px 8px;border-radius:20px;font-weight:600}
    .gaplv[data-lv="阻断"]{background:rgba(248,113,113,.14);color:var(--bad)}
    .gaplv[data-lv="重要"]{background:rgba(251,191,36,.14);color:var(--warn)}
    .gaplv[data-lv="体验"]{background:rgba(96,165,250,.14);color:#60a5fa}
    .gapt{font-size:14.5px;font-weight:600;color:var(--tx);line-height:1.4}
    .gaprow{display:grid;grid-template-columns:60px 1fr;gap:10px;font-size:13px;
      line-height:1.7;color:var(--tx2);margin-bottom:7px}
    .gaprow b{color:var(--tx3);font-family:var(--mono);font-size:11px;font-weight:400;padding-top:3px}
    .gaprow.verify{background:rgba(74,222,128,.06);border-radius:6px;padding:8px 10px;
      margin:10px 0 0;grid-template-columns:60px 1fr}
    .gaprow.verify b{color:var(--ok)}
    .gaprow.verify span{color:var(--tx2)}
    .gaprow code, .gapitem code{font-family:var(--mono);font-size:.9em;background:var(--card);
      border:1px solid var(--line);border-radius:4px;padding:1px 4px;color:var(--ac)}
    .codelbl{font-family:var(--mono);font-size:10px;color:var(--tx3);
      letter-spacing:.05em;text-transform:uppercase;margin:13px 0 5px}
    .gcode{background:#07070a;border:1px solid var(--line2);border-radius:7px;
      padding:12px 14px;overflow-x:auto;font-family:var(--mono);font-size:11.5px;
      line-height:1.7;color:#c8d3de;max-height:260px;overflow-y:auto;white-space:pre;margin:0}
  `;
  document.head.appendChild(c);
}
document.getElementById('btn-close-gap').onclick = ()=> gapmodal.classList.remove('on');
gapmodal.onclick = e=>{ if(e.target===gapmodal) gapmodal.classList.remove('on'); };
