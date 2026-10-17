/**
 * 上架表单：字段校验 + 抽成实时计算 + 写入 market_items
 */
(function () {
  'use strict';
  var C = window.MKT_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };

  var PLAT_NAME = {
    doubao: '豆包', kouzi: '扣子 Coze', qwen: '通义千问',
    agent: 'AI 智能体', voice: '语音口令', skill: 'Skill 包'
  };

  function fee(price) {
    var pct = C.platformFeePct || 3;
    var cut = price * pct / 100;
    return {
      cut: cut.toFixed(2),
      get: (price - cut).toFixed(2)
    };
  }

  function recalc() {
    var p = parseFloat($('price').value || '0');
    if (!isFinite(p) || p < 0) p = 0;
    var f = fee(p);
    $('feePrice').textContent = p ? p : '0';
    $('buyerPay').textContent = p ? p : '0';
    $('feeCut').textContent = f.cut;
    $('sellerGet').textContent = f.get;
  }

  function makeId() {
    var d = new Date();
    var p = function (x) { return String(x).padStart(2, '0'); };
    return 'MK' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) +
      Math.floor(1000 + Math.random() * 9000);
  }

  function showErr(msg) {
    var e = $('err');
    e.innerHTML = msg;
    e.style.display = 'block';
    e.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function validate(d) {
    if (d.title.length < 6) return '标题太短了，至少写清「哪个平台 + 干什么用」';
    if (!(d.price > 0)) return '价格要大于 0';
    if (d.price > 2000) return '单品价格上限 ¥2000，再高请拆成多个商品';
    if (d.summary.length < 10) return '一句话说明至少 10 个字，说清楚省下什么';
    if (d.free_text.length < 80) return '免费层至少 80 字，且必须能独立跑通（现在是 ' + d.free_text.length + ' 字）';
    if (d.free_text.length > 4000) return '免费层太长了，压缩到 4000 字以内，剩下的放付费层';
    if (d.pro_text.length < 20) return '付费层请逐条列出包含什么，不要留空';
    if (/更多惊喜|超值|大礼包|详情咨询/.test(d.pro_text)) return '付费层不能用「更多惊喜」这类模糊说法，请逐条写清';
    if (d.version.length < 3) return '请填适用版本，例如「豆包 App 2026.09 版」';
    if (d.seller.length < 2) return '请填联系方式（微信号），买家付款后要能找到你';
    if (d.fail_case.length < 10) return '请老实写这个提示词什么情况下不好用（至少 10 字）';
    return null;
  }

  function submit() {
    var price = parseFloat($('price').value || '0');
    var cat = $('category').value;
    var d = {
      item_id: makeId(),
      title: $('title').value.trim(),
      category: cat,
      platform: PLAT_NAME[cat] || cat,
      price: isFinite(price) ? price : 0,
      summary: $('summary').value.trim(),
      free_text: $('freeText').value.trim(),
      pro_text: $('proText').value.trim(),
      version: $('version').value.trim(),
      seller: $('seller').value.trim(),
      fail_case: $('failCase').value.trim(),
      tags: $('tags').value.trim(),
      status: 'review',
      sales: 0,
      created_at: new Date().toISOString()
    };

    var bad = validate(d);
    if (bad) { showErr(bad); return; }

    $('err').style.display = 'none';
    var btn = $('submit');
    btn.disabled = true;
    btn.textContent = '提交中…';

    fetch(C.supabase.url + '/rest/v1/' + C.supabase.items, {
      method: 'POST',
      headers: {
        'apikey': C.supabase.key,
        'Authorization': 'Bearer ' + C.supabase.key,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(d)
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 160)); });
      return r.json();
    }).then(function (rows) {
      // 幻觉成功防护：必须确认写入了一行
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('服务端没有返回写入结果（可能 market_items 表还没建）');
      }
      $('okId').textContent = d.item_id;
      $('formCard').style.display = 'none';
      $('okCard').style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(function (e) {
      showErr('提交失败：' + (e.message || e) +
        '<br><span style="font-size:12px">如果提示表不存在，说明站长还没在 Supabase 建 market_items 表。</span>');
      btn.disabled = false;
      btn.textContent = '提交上架申请';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var sel = $('category');
    sel.innerHTML = (C.cats || [])
      .filter(function (c) { return c.id !== 'all'; })
      .map(function (c) { return '<option value="' + c.id + '">' + c.icon + ' ' + c.name + '</option>'; })
      .join('');

    $('price').addEventListener('input', recalc);
    $('submit').onclick = submit;
    recalc();
  });
})();
