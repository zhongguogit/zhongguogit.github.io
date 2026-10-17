/**
 * 赚钱包页逻辑：今日行情 + 包列表 + 详情弹层 + 跳收款
 */
(function () {
  'use strict';
  var C = window.KIT_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };

  function money(n) {
    n = Number(n);
    return '¥' + (n % 1 === 0 ? n : n.toFixed(2));
  }
  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  /* ---------- 今日行情 ---------- */
  function renderDaily() {
    var D = C.daily || { items: [] };
    $('dTitle').textContent = D.title || '今日行情';
    $('dNote').textContent = D.note || '';

    var d = new Date();
    var wk = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    $('dDate').textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + wk;

    var trendTxt = { up: '↑ 涨', down: '↓ 落', flat: '— 平' };
    $('dList').innerHTML = (D.items || []).map(function (it) {
      return '<div class="drow">' +
        '<div class="n">' + esc(it.name) +
          '<span class="tr ' + esc(it.trend || 'flat') + '">' + (trendTxt[it.trend] || '—') + '</span>' +
        '</div>' +
        '<div class="p">' + it.low + '–' + it.high + '<span style="font-size:11px;color:#9ca3af;font-weight:400"> 元/' + esc(it.unit) + '</span></div>' +
        '<div class="t">' + esc(it.tip || '') + '</div>' +
      '</div>';
    }).join('');
  }

  /* ---------- 包卡片 ---------- */
  function renderKits() {
    $('kits').innerHTML = (C.kits || []).map(function (k) {
      var e = k.earn || {};
      return '<div class="kit" style="--kc:' + esc(k.color) + '" data-k="' + esc(k.id) + '">' +
        '<div class="kit-h">' +
          '<div class="kit-ic">' + esc(k.icon) + '</div>' +
          '<h3>' + esc(k.name) + '</h3>' +
        '</div>' +
        '<div class="tagline">' + esc(k.tagline) + '</div>' +
        '<div class="earn">参考收入 <b>' + money(e.low) + '–' + money(e.high) + '</b>' +
          '<span class="u">/' + esc(e.unit || '月') + '</span>' +
          '<div style="font-size:11.5px;color:var(--tx3);margin-top:2px">' + esc(e.note || '') + '</div>' +
        '</div>' +
        '<div class="kit-foot">' +
          '<div class="p">' + money(k.price) + '<small> 永久</small></div>' +
          '<button data-buy="' + esc(k.id) + '">看包里有什么</button>' +
        '</div>' +
        '<div class="starts">' + (k.steps || []).length + ' 步走到第一笔收款</div>' +
      '</div>';
    }).join('');
  }

  /* ---------- 详情 ---------- */
  function openKit(id) {
    var k = (C.kits || []).filter(function (x) { return x.id === id; })[0];
    if (!k) return;

    $('kTitle').textContent = k.name;
    $('kSub').textContent = k.tagline;

    var e = k.earn || {};
    var html = '';

    html += '<div class="note-box"><b>为什么现在能赚到：</b>' + esc(k.whyNow) + '</div>';

    html += '<div class="sec"><div class="sec-h">📦 你会拿到</div><ul>' +
      (k.deliver || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') +
      '</ul></div>';

    html += '<div class="sec"><div class="sec-h">🚶 从零到第一笔钱</div><ul class="steps">' +
      (k.steps || []).map(function (s) {
        return '<li><span class="t">' + esc(s.t) + '</span><span class="d">' + esc(s.d) + '</span></li>';
      }).join('') +
      '</ul></div>';

    html += '<div class="sec"><div class="sec-h">💰 能赚多少</div>' +
      '<div class="note-box gray">' + money(e.low) + '–' + money(e.high) + ' / ' + esc(e.unit || '月') +
      '　口径：' + esc(e.note || '') + '</div></div>';

    if (k.moat) {
      html += '<div class="sec"><div class="sec-h">🛡 为什么 AI 不会替掉你</div>' +
        '<div class="note-box gray">' + esc(k.moat) + '</div></div>';
    }

    if (k.notFor) {
      html += '<div class="note-box"><b>⚠ 不适合谁：</b>' + esc(k.notFor) + '</div>';
    }

    $('kBody').innerHTML = html;
    $('kBuy').onclick = function () { goPay(k); };
    $('modal').classList.add('on');
  }

  function goPay(k) {
    var q = '?type=market&item=KIT-' + encodeURIComponent(k.id) +
      '&name=' + encodeURIComponent('赚钱包 · ' + k.name) +
      '&price=' + encodeURIComponent(k.price);
    location.href = '/pay/' + q;
  }

  /* ---------- 初始化 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    renderDaily();
    renderKits();

    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-buy]');
      if (b) { openKit(b.getAttribute('data-buy')); return; }
      var c = e.target.closest('.kit');
      if (c) openKit(c.getAttribute('data-k'));
    });

    $('mClose').onclick = function () { $('modal').classList.remove('on'); };
    $('modal').addEventListener('click', function (e) {
      if (e.target === $('modal')) $('modal').classList.remove('on');
    });
  });
})();
