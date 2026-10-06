#!/usr/bin/env node
/**
 * 自主更新引擎 - 存活检测脚本
 * 每天由 GitHub Actions 定时运行：
 * 1. 从 Supabase 读取发现接龙的所有 AI 工具网址
 * 2. 逐个检测 HTTP 存活状态
 * 3. 将失效链接的 verified 标记为 false，有效链接标为 true
 *
 * 用法: node scripts/health-check.mjs
 * 环境变量: SUPABASE_ANON_KEY（GitHub Secrets 中配置）
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dnqswjrevffwdcksnwan.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!ANON_KEY) {
  console.error('❌ 缺少环境变量 SUPABASE_ANON_KEY');
  process.exit(1);
}

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal'
};

async function fetchAll() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/discovery_chain?select=id,title,url,verified`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
  });
  if (!r.ok) throw new Error('读取失败: ' + r.status);
  return r.json();
}

async function checkUrl(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, {
      method: 'HEAD',
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; zhongguogit-bot/1.0)' }
    });
    clearTimeout(t);
    return r.ok; // 2xx / 3xx 视为存活
  } catch {
    clearTimeout(t);
    // HEAD 被拒时降级为 GET
    try {
      const r2 = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Mozilla/5.0' } });
      return r2.ok;
    } catch { return false; }
  }
}

async function updateStatus(id, verified) {
  await fetch(`${SUPABASE_URL}/rest/v1/discovery_chain?id=eq.${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ verified })
  });
}

(async () => {
  console.log('🔍 开始存活检测...');
  const entries = await fetchAll();
  console.log(`共 ${entries.length} 条记录待检测\n`);

  let alive = 0, dead = 0;
  for (const e of entries) {
    const ok = await checkUrl(e.url);
    if (ok) alive++; else dead++;
    console.log(`${ok ? '✅' : '❌'} ${e.title}  ->  ${e.url}`);
    if (ok !== e.verified) {
      await updateStatus(e.id, ok);
    }
  }
  console.log(`\n📊 检测完成：存活 ${alive}，失效 ${dead}`);
})().catch(e => { console.error(e); process.exit(1); });
