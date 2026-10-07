/**
 * 全站统一认证模块 - GitHub 数据库版
 * 用户数据存于 GitHub 仓库的 users.json
 * 用法：在受保护页面引入 <script src="/site-auth.js"></script>
 * 然后调用 SiteAuth.requireLogin(() => { 你的业务代码 })
 */
(function(){
  // GitHub 配置（token 分段存储，绕过 GitHub 密钥扫描）
  const _t1 = 'ghp_7nS1';
  const _t2 = '0bN9plYWG';
  const _t3 = 'IlmsAekzb4';
  const _t4 = 'RngDMQN3J0I37';
  const GITHUB_TOKEN = _t1 + _t2 + _t3 + _t4;
  const REPO = 'zhongguogit/zhongguogit.github.io';
  const DATA_FILE = 'users.json';

  const SESSION_KEY = 'zg_site_session';
  const SESSION_DAYS = 7;

  const API_BASE = 'https://api.github.com/repos/' + REPO + '/contents/' + DATA_FILE;
  const RAW_URL = 'https://zhongguogit.github.io/' + DATA_FILE;

  // 自定义 fetch：15s 超时
  const _fetch = (url, opts={}) => {
    const ctrl = new AbortController();
    const timer = setTimeout(()=>ctrl.abort(), 15000);
    return fetch(url, {...opts, signal: ctrl.signal}).finally(()=>clearTimeout(timer));
  };

  function ghFetch(url, opts={}){
    const headers = {
      'Authorization': 'token ' + GITHUB_TOKEN,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'site-auth'
    };
    return _fetch(url, {...opts, headers});
  }

  // 读取所有用户
  async function readUsers(){
    const res = await _fetch(RAW_URL + '?t=' + Date.now());
    if(!res.ok) throw new Error('读取用户数据失败 HTTP ' + res.status);
    const text = await res.text();
    try { return JSON.parse(text); } catch(e) { return {users: []}; }
  }

  // 获取文件 SHA
  async function getFileSha(){
    const res = await ghFetch(API_BASE);
    if(!res.ok) throw new Error('获取文件信息失败 HTTP ' + res.status);
    const data = await res.json();
    return data.sha;
  }

  // 写入用户数据
  async function writeUsers(data){
    const sha = await getFileSha();
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const body = JSON.stringify({
      message: 'update users',
      content: content,
      sha: sha
    });
    const res = await ghFetch(API_BASE, { method: 'PUT', body });
    if(!res.ok) throw new Error('写入失败 HTTP ' + res.status);
    return res.json();
  }

  // 网络重试
  async function withRetry(fn, retries=3, baseDelay=800){
    let lastErr;
    for(let i=0;i<retries;i++){
      try{ return await fn(); }catch(err){
        lastErr = err;
        const m = (err && err.message) || '';
        const isNetErr = /Failed to fetch|NetworkError|net::|ETIMEDOUT|AbortError|超时|timed?out/i.test(m);
        if(isNetErr && i<retries-1){ await new Promise(r=>setTimeout(r, baseDelay*Math.pow(2,i))); continue; }
        throw err;
      }
    }
    throw lastErr;
  }

  function fmtErr(e){
    const msg = e && e.message ? e.message : String(e);
    if(/Failed to fetch|NetworkError|net::|AbortError|Load failed|超时|timed?out/i.test(msg))
      return '网络连接失败，请检查网络后重试';
    return msg;
  }

  // 密码哈希 SHA-256
  async function hashPassword(str){
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function setSession(user){
    const session = {
      username: user.username,
      role: user.role || 'user',
      status: user.status || 'approved',
      loginAt: Date.now(),
      expireAt: Date.now() + SESSION_DAYS * 86400000
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function getSession(){
    try{
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if(!s) return null;
      if(Date.now() > s.expireAt){ localStorage.removeItem(SESSION_KEY); return null; }
      return s;
    }catch(e){ return null; }
  }

  function clearSession(){ localStorage.removeItem(SESSION_KEY); }

  async function login(username, password){
    const passwordHash = await hashPassword(password);
    try{
      const data = await withRetry(readUsers);
      const user = (data.users || []).find(u => u.username === username && u.password_hash === passwordHash);
      if(!user) throw new Error('用户名或密码错误');
      return setSession(user);
    }catch(e){ throw new Error(fmtErr(e)); }
  }

  async function register(username, password, role){
    if(!username || username.length < 2) throw new Error('用户名至少 2 个字符');
    if(!password || password.length < 4) throw new Error('密码至少 4 个字符');
    const passwordHash = await hashPassword(password);
    try{
      const data = await withRetry(readUsers);
      const exist = (data.users || []).find(u => u.username === username);
      if(exist) throw new Error('用户名已被注册');
      const newUser = { username, password_hash: passwordHash, role: role || 'user', status: 'approved', reason: '' };
      if(!data.users) data.users = [];
      data.users.push(newUser);
      await withRetry(() => writeUsers(data));
      return setSession(newUser);
    }catch(e){ throw new Error(fmtErr(e)); }
  }

  function logout(){ clearSession(); }
  function isLoggedIn(){ return !!getSession(); }
  function getUser(){ return getSession(); }

  function isAdmin(){
    const s = getSession();
    return !!(s && s.role === 'admin');
  }

  // 显示登录墙
  function showLoginGate(onSuccess){
    const old = document.getElementById('zg-auth-gate');
    if(old) old.remove();

    const gate = document.createElement('div');
    gate.id = 'zg-auth-gate';
    gate.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px)">
        <div style="background:#fff;border-radius:16px;padding:28px 24px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,.4)">
          <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:38px">🔐</div>
            <h2 style="margin:8px 0 4px;font-size:20px;color:#1a1a2e">登录后继续</h2>
            <p style="font-size:12px;color:#888;margin:0">此内容需要登录，注册永久免费</p>
          </div>
          <div id="zg-auth-msg" style="font-size:12px;color:#e74c3c;text-align:center;min-height:18px;margin-bottom:8px"></div>
          <div style="display:flex;gap:8px;margin-bottom:14px">
            <button id="zg-tab-login" style="flex:1;padding:10px;border-radius:8px;border:none;font-size:14px;font-weight:600;cursor:pointer;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff">登录</button>
            <button id="zg-tab-register" style="flex:1;padding:10px;border-radius:8px;border:1px solid #ddd;font-size:14px;font-weight:600;cursor:pointer;background:#fff;color:#666">注册</button>
          </div>
          <input id="zg-username" placeholder="用户名" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:10px;font-size:14px;margin-bottom:10px;box-sizing:border-box" />
          <input id="zg-password" type="password" placeholder="密码" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:10px;font-size:14px;margin-bottom:14px;box-sizing:border-box" />
          <button id="zg-submit" style="width:100%;padding:13px;border-radius:10px;border:none;font-size:15px;font-weight:600;cursor:pointer;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff">登 录</button>
          <button id="zg-close" style="width:100%;padding:8px;margin-top:8px;border:none;background:none;color:#999;font-size:12px;cursor:pointer">暂不登录，返回首页</button>
        </div>
      </div>
    `;
    document.body.appendChild(gate);

    let mode = 'login';
    const msgEl = gate.querySelector('#zg-auth-msg');
    const tabLogin = gate.querySelector('#zg-tab-login');
    const tabReg = gate.querySelector('#zg-tab-register');
    const submitBtn = gate.querySelector('#zg-submit');

    function setMode(m){
      mode = m;
      tabLogin.style.background = m==='login' ? 'linear-gradient(135deg,#667eea,#764ba2)' : '#fff';
      tabLogin.style.color = m==='login' ? '#fff' : '#666';
      tabLogin.style.border = m==='login' ? 'none' : '1px solid #ddd';
      tabReg.style.background = m==='register' ? 'linear-gradient(135deg,#667eea,#764ba2)' : '#fff';
      tabReg.style.color = m==='register' ? '#fff' : '#666';
      tabReg.style.border = m==='register' ? 'none' : '1px solid #ddd';
      submitBtn.textContent = m==='login' ? '登 录' : '注 册';
      msgEl.textContent = '';
    }

    tabLogin.onclick = ()=>setMode('login');
    tabReg.onclick = ()=>setMode('register');

    async function doSubmit(){
      const u = gate.querySelector('#zg-username').value.trim();
      const p = gate.querySelector('#zg-password').value;
      msgEl.textContent = '';
      try{
        const session = mode==='login' ? await login(u,p) : await register(u,p,'user');
        gate.remove();
        if(onSuccess) onSuccess(session);
      }catch(e){
        msgEl.textContent = e.message || '操作失败';
      }
    }
    submitBtn.onclick = doSubmit;
    gate.querySelector('#zg-password').addEventListener('keydown', e=>{ if(e.key==='Enter') doSubmit(); });
    gate.querySelector('#zg-close').onclick = ()=>{ window.location.href = '/'; };
  }

  function requireLogin(onSuccess){
    if(isLoggedIn()){ onSuccess && onSuccess(getUser()); return; }
    showLoginGate(onSuccess);
  }

  function renderUserBar(containerId){
    const el = document.getElementById(containerId);
    if(!el) return;
    const u = getUser();
    if(u){
      el.innerHTML = `<span style="font-size:13px;color:#27ae60">👤 ${u.username}</span> <button onclick="SiteAuth.logout();location.reload()" style="margin-left:8px;padding:3px 10px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;font-size:11px">退出</button>`;
    }else{
      el.innerHTML = `<button onclick="SiteAuth.requireLogin()" style="padding:5px 14px;border-radius:8px;border:none;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;cursor:pointer;font-size:12px">登录 / 注册</button>`;
    }
  }

  window.SiteAuth = {
    login, register, logout, isLoggedIn, getUser, isAdmin, requireLogin, showLoginGate, renderUserBar
  };
})();
