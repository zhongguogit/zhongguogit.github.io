// Global Safety Net — 20 域交互图
(() => {
  'use strict';
  const DOMAINS = [
    {n:1,id:'①',name:'身份与通行证',one:'一人一号，密钥永不出设备。',in:'领卡请求 / KYC 第三方回执',out:'SubjectCreated · VC 出示',red:'服务器存过私钥 = P0 事故',link:'⑧凭证 · ②合规 · ⑥去重'},
    {n:2,id:'②',name:'合规与准入',one:'制裁、驻留、数据出境的第一道闸。',in:'主体/法域/用途',out:'ComplianceVerdict',red:'不自封裁判，结论须可复核 + 本地顾问签',link:'⑩事件 · ⑪审计'},
    {n:3,id:'③',name:'权益与资格',one:'吐出“差哪一份”，不是“请等待”。',in:'EligibilityQueried + 证据',out:'四态结论 PASS/NEEDS/REVIEW/DENY',red:'踩 LOW 证据不得出 PASS',link:'⑯RuleOS · ⑧VC'},
    {n:4,id:'④',name:'岗位与市场',one:'召回、投递、上岗回响。',in:'能力卡 + 岗位流',out:'JobMatched · Onboarded',red:'救助记录绝不喂招聘方',link:'⑤档案 · ⑫网'},
    {n:5,id:'⑤',name:'AI 档案与能力',one:'把经历压成能用的能力卡。',in:'简历/口述',out:'SkillProfileUpdated',red:'AI 只起草，结论要证据或人签',link:'⑯规则'},
    {n:6,id:'⑥',name:'全局去重',one:'跨基金会防重复领，谁都看不到谁名单。',in:'派生标识（PSI）',out:'DedupeResult(bool)',red:'不交换明文、不吐置信细节',link:'② · TEE'},
    {n:7,id:'⑦',name:'支付网关',one:'平台一分钱都不碰。',in:'PayoutAuthorized(签名)',out:'ReleasedByEscrow',red:'无持牌通道 = 指令永不发出',link:'⑭Agent · ⑮分账'},
    {n:8,id:'⑧',name:'凭证工厂',one:'一次一证、限时、限场景。',in:'VC 请求',out:'VCPresentation(SD-JWT)',red:'不可通吃全场景，撤销列表必查',link:'①身份'},
    {n:9,id:'⑨',name:'网关与边缘',one:'mTLS、限流、熔断、鉴权。',in:'Ingress',out:'路由判定',red:'没有“内网可信”，每调用带身份+用途',link:'OPA'},
    {n:10,id:'⑩',name:'事件中枢',one:'全域唯一事实，断网可回放。',in:'所有事件',out:'有序广播 + DLQ',red:'schema 破坏 = 拒绝入库',link:'全站'},
    {n:11,id:'⑪',name:'观测与审计',one:'一笔钱 10 分钟还原全链路。',in:'全链路 span/事件',out:'AuditTrail(WORM)',red:'审计仓不可删、不可改',link:'⑩'},
    {n:12,id:'⑫',name:'互助网引擎',one:'卡点拆解、匹配、回响、熔断。',in:'HardshipDetected',out:'VolunteerMatched · TaskSpawned',red:'危机不交志愿者，双向匿名',link:'⑰⑱'},
    {n:13,id:'⑬',name:'共建与委托',one:'需求格子化 + RFP + 里程碑托管。',in:'NeedGrigged',out:'MilestoneReleased',red:'无预算格不动钱，超阈人工签',link:'⑦⑭'},
    {n:14,id:'⑭',name:'Agent 治理',one:'自动跑流程，人只签刀口那一下。',in:'AgentIntent',out:'Approved / Denied',red:'无账户只有额度；一键全网熔断',link:'⑦⑮ · ⑪'},
    {n:15,id:'⑮',name:'贡献与分账',one:'下载不分钱，事件才归因。',in:'ContributionEvent',out:'Attribution · PayoutInstruction',red:'凭证不可交易、单人封顶、金库留 30%',link:'⑦ · ⑰'},
    {n:16,id:'⑯',name:'RuleOS ★',one:'规则即代码，可时间旅行、可影子跑。',in:'规则 PR + 黄金用例',out:'RuleEvaluated → Decision',red:'AI 不拥有生效权，变动必留版本',link:'⑩⑪'},
    {n:17,id:'⑰',name:'热度与归属',one:'停的是带宽，不是你的卡。',in:'PulseEvent(回响)',out:'BelongingStateChanged',red:'锚层永不可降级，休眠不罚',link:'①⑫⑱'},
    {n:18,id:'⑱',name:'任务拓扑',one:'任务跟着人生阶段长，能拒绝、能冻结。',in:'TaskSpawned',out:'TaskCompleted',red:'任务不绑生存权',link:'⑫⑲'},
    {n:19,id:'⑲',name:'学习大厅',one:'学完必落一格真任务，不发证。',in:'LessonCompleted',out:'真任务事件',red:'刷课不发证，凭证绑定真实产出',link:'⑱⑳'},
    {n:20,id:'⑳',name:'开荒域',one:'奖励第一个踩进去的人。',in:'FrontierClaimed',out:'Graduated / Released',red:'占格不垄断；高合规区不许 solo',link:'⑬⑯'}
  ];

  const grid = document.getElementById('grid');
  const D = document.getElementById('detail');
  if (!grid || !D) return;

  const buttons = [];

  const show = (d, el, scroll) => {
    buttons.forEach(x => {
      x.classList.remove('on');
      x.setAttribute('aria-expanded', 'false');
    });
    el.classList.add('on');
    el.setAttribute('aria-expanded', 'true');

    document.getElementById('d-tag').textContent = `域 ${d.n} · ${d.id}`;
    document.getElementById('d-name').textContent = d.name;
    document.getElementById('d-one').textContent = d.one;
    document.getElementById('d-in').textContent = d.in;
    document.getElementById('d-out').textContent = d.out;
    const red = document.getElementById('d-red');
    red.replaceChildren();
    const strong = document.createElement('span');
    strong.className = 'red';
    strong.textContent = d.red;
    red.appendChild(strong);
    document.getElementById('d-link').textContent = d.link;

    D.classList.remove('show');
    void D.offsetWidth;
    D.classList.add('show');
    if (scroll) D.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (history.replaceState) history.replaceState(null, '', `#domain-${d.n}`);
  };

  DOMAINS.forEach(d => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'd';
    el.dataset.n = d.n;
    el.setAttribute('aria-expanded', 'false');
    el.innerHTML = `<b>${d.id}</b><span>${d.name}</span>`;
    el.addEventListener('click', () => show(d, el, true));
    grid.appendChild(el);
    buttons.push(el);
  });

  const m = /domain-(\d+)/.exec(location.hash);
  const n = m ? Math.min(Math.max(+m[1], 1), DOMAINS.length) : 16;
  const target = buttons[n - 1];
  if (target) show(DOMAINS[n - 1], target, false);
})();
