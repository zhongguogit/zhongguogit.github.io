// 全站 AI 助手 - 基于 Pollinations.ai（免费、无需密钥、浏览器直连）
// 能力：文本对话 + 图片生成 + 内置本站 AI 工具知识库

const SUPABASE_URL = 'https://dnqswjrevffwdcksnwan.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_O23O8vd8DYWDBoydPjl9LA_uYGspSHC';

const SYSTEM_PROMPT = `你是「zhongguogit 万能助手」，一个集成在 zhongguogit.github.io 上的免费 AI 助手。
你的能力：
1. 回答任何问题、聊天、写作、翻译、编程、创意
2. 了解本站收录的所有免费 AI 工具（文生视频、文生图等），可以推荐
3. 用户说"画/生成一张图片"时，你只需回复一个提示词，系统会自动生成图片
语气：友好、简洁、实用。回答控制在合理长度。`;

let toolsKnowledge = '';
let mode = 'chat'; // chat | image
let chatHistory = [];

async function loadTools() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/discovery_chain?select=title,url,category,free_quota,verified&order=created_at`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    const data = await r.json();
    toolsKnowledge = '【本站收录的免费AI工具】\n' + data.map(t =>
      `- ${t.title}（${t.category}）：${t.free_quota} | ${t.url}`
    ).join('\n');
  } catch { toolsKnowledge = ''; }
}

function $(id) { return document.getElementById(id); }
const chat = $('chat');

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

function addMsg(role, content) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  const avatar = role === 'user' ? '🧑' : '🤖';
  div.innerHTML = `<div class="avatar">${avatar}</div><div class="bubble"></div>`;
  div.querySelector('.bubble').textContent = content;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

function addImageMsg(prompt) {
  const div = document.createElement('div');
  div.className = 'msg ai';
  const seed = Math.floor(Math.random() * 999999);
  const safe = esc(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&seed=${seed}&nologo=true`;
  div.innerHTML = `<div class="avatar">🤖</div><div class="bubble">🎨 已为你生成：<b>${safe}</b><br><img src="${url}" alt="${safe}" loading="lazy"></div>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  div.querySelector('img').onclick = () => window.open(url, '_blank');
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'msg ai';
  div.id = 'typing-indicator';
  div.innerHTML = `<div class="avatar">🤖</div><div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}
function removeTyping() { document.getElementById('typing-indicator')?.remove(); }

const IMAGE_KEYWORDS = ['画', '生成图片', '生成一张', '图片', '图像', '画一张', '做一张图', 'photo', 'image', 'picture', 'draw'];

function wantsImage(text) {
  return IMAGE_KEYWORDS.some(k => text.includes(k));
}

async function send() {
  const input = $('user-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  addMsg('user', text);

  if (mode === 'image' || wantsImage(text)) {
    addImageMsg(text);
    return;
  }

  showTyping();
  chatHistory.push({ role: 'user', content: text });

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + (toolsKnowledge ? '\n\n' + toolsKnowledge : '') },
      ...chatHistory
    ];
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model: 'openai' })
    });
    removeTyping();
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const reply = await res.text();
    chatHistory.push({ role: 'assistant', content: reply });
    addMsg('ai', reply);
    if (chatHistory.length > 12) chatHistory = chatHistory.slice(-12);
  } catch (e) {
    removeTyping();
    addMsg('ai', '⚠️ 连接出了点问题，请重试。错误：' + e.message);
  }
}

function setMode(m) {
  mode = m;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
  $('user-input').placeholder = m === 'image' ? '描述你想要的图片，例如：一只在月亮上弹吉他的猫' : '问我任何问题，或说「画一只猫」生成图片…';
}

function quickAsk(text) { $('user-input').value = text; send(); }

function clearChat() {
  chat.innerHTML = '';
  chatHistory = [];
  addMsg('ai', '你好！我是 zhongguogit 万能助手 🤖\n\n我可以：\n💬 回答任何问题、聊天、写作、编程\n🎨 说「画……」生成图片\n🔧 推荐本站收录的免费 AI 工具\n\n有什么可以帮你的？');
}

$('send-btn').onclick = send;
$('user-input').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
document.querySelectorAll('.mode-btn').forEach(b => b.onclick = () => setMode(b.dataset.mode));
$('clear-btn').onclick = clearChat;

loadTools();
clearChat();
