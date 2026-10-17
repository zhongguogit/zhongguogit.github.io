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
    n:1, lv:'阻断', t:'AI 输出是假的',
    now:'节点跑完显示的那段文字是写死在代码里的示例，不是模型真生成的。',
    why:'纯静态页面没法安全地调模型——Key 写在前端等于公开泄露。',
    fix:'加一个后端（Serverless Function / Cloudflare Worker / 自建 Node），由后端持有 Key 并转发请求。前端只调自己的 <code>/api/generate</code>。'
  },
  {
    n:2, lv:'阻断', t:'提示词与分镜质量不可控',
    now:'分镜和提示词都是固定模板，换个小说还是同一套。',
    why:'没有真实的 prompt 工程，也没有对输出做结构化校验。',
    fix:'① 定义分镜 JSON schema，让模型必须按格式输出；② 加一道校验器（本项目的 <code>validate_skill.py</code> 就是同类思路）；③ 关键节点加人工确认。'
  },
  {
    n:3, lv:'重要', t:'工作流不会保存',
    now:'刷新页面就没了，只能靠「导出」手动留存（且当前版本还没接导出）。',
    why:'没写持久化层。',
    fix:'短期：把 <code>nodes/edges</code> 存进 <code>localStorage</code>，加导入导出 JSON 按钮。长期：Supabase（你站上已有）建 <code>workflows</code> 表。'
  },
  {
    n:4, lv:'阻断', t:'不能真的出片',
    now:'「外部工具」节点只是给出 Pavo AI 的链接，得你自己去粘贴。',
    why:'<code>app.pavo-ai.work</code> 是网页应用，无公开 API，需要登录态和浏览器交互，前端页面无权代操作。',
    fix:'两条路：① 换成有 API 的视频服务（需付费 Key）；② 保留人工环节，但把提示词包做成「一键复制 + 自动开新标签」。不要假装能自动提交。'
  },
  {
    n:5, lv:'重要', t:'连线手感粗糙',
    now:'要按住 Shift 拖到目标节点才能连线；不能改线、不能删单条线。',
    why:'简化的交互实现，优先保证「能演示」。',
    fix:'改成从节点边缘圆点起拖；点击连线可删除；加正交路由（直角折线）比贝塞尔更好读。'
  },
  {
    n:6, lv:'重要', t:'不能撤销 / 重做',
    now:'删错了只能重新点回来。',
    why:'没有历史栈。',
    fix:'维护一个 <code>history[]</code> 快照数组，每次变更 push，Ctrl+Z / Ctrl+Y 前后移动指针即可。约 40 行代码。'
  },
  {
    n:7, lv:'体验', t:'手机端不可用',
    now:'画布依赖鼠标拖拽，窄屏下左右两栏被隐藏。',
    why:'按桌面端设计。',
    fix:'窄屏改为「列表式流程」视图：节点纵向排列，点节点弹出配置，不要求拖拽。'
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
      <div class="gaprow"><b>现在</b><span>${g.now}</span></div>
      <div class="gaprow"><b>为什么</b><span>${g.why}</span></div>
      <div class="gaprow fix"><b>怎么改</b><span>${g.fix}</span></div>
    </div>
  `).join('');
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
    .gaps{display:flex;flex-direction:column;gap:12px;margin-top:16px}
    .gapitem{background:var(--bg);border:1px solid var(--line);border-radius:9px;padding:15px 17px}
    .gaph{display:flex;align-items:center;gap:9px;margin-bottom:11px}
    .gapn{font-family:var(--mono);font-size:11px;color:var(--tx3);width:18px}
    .gaplv{font-size:10px;font-family:var(--mono);padding:2px 8px;border-radius:20px;font-weight:600}
    .gaplv[data-lv="阻断"]{background:rgba(248,113,113,.14);color:var(--bad)}
    .gaplv[data-lv="重要"]{background:rgba(251,191,36,.14);color:var(--warn)}
    .gaplv[data-lv="体验"]{background:rgba(96,165,250,.14);color:#60a5fa}
    .gapt{font-size:14px;font-weight:600;color:var(--tx)}
    .gaprow{display:grid;grid-template-columns:52px 1fr;gap:10px;font-size:12.5px;
      line-height:1.65;color:var(--tx2);margin-bottom:5px}
    .gaprow b{color:var(--tx3);font-family:var(--mono);font-size:11px;font-weight:400;padding-top:2px}
    .gaprow.fix b{color:var(--ac)}
    .gaprow.fix span{color:var(--tx2)}
    .gaprow code{font-family:var(--mono);font-size:.9em;background:var(--card);
      border:1px solid var(--line);border-radius:4px;padding:1px 4px;color:var(--ac)}
  `;
  document.head.appendChild(c);
}
document.getElementById('btn-close-gap').onclick = ()=> gapmodal.classList.remove('on');
gapmodal.onclick = e=>{ if(e.target===gapmodal) gapmodal.classList.remove('on'); };
