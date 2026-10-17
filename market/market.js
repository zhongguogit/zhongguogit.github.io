/**
 * 市场逻辑：浏览 / 筛选 / 详情 / 购买（跳 /pay 走同一套收款码）
 */
(function () {
  'use strict';
  var C = window.MKT_CONFIG || {};
  var P = window.PAY_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var items = [];
  var cat = 'all';
  var kw = '';

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }
  function money(n) {
    n = Number(n);
    return '¥' + (n % 1 === 0 ? n : n.toFixed(2));
  }

  function sb(path, opts) {
    opts = opts || {};
    return fetch(C.supabase.url + '/rest/v1/' + path, {
      method: opts.method || 'GET',
      headers: {
        'apikey': C.supabase.key,
        'Authorization': 'Bearer ' + C.supabase.key,
        'Content-Type': 'application/json'
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 120)); });
      return r.status === 204 ? null : r.json();
    });
  }

  /* ---------- 渲染分类 ---------- */
  function renderCats() {
    var box = $('cats');
    box.innerHTML = (C.cats || []).map(function (c) {
      return '<button class="cat' + (c.id === cat ? ' on' : '') + '" data-c="' + c.id + '">' +
        c.icon + ' ' + c.name + '</button>';
    }).join('');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.cat');
      if (!b) return;
      cat = b.getAttribute('data-c');
      document.querySelectorAll('.cat').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      var meta = (C.cats || []).filter(function (c) { return c.id === cat; })[0];
      $('catDesc').textContent = (meta && meta.desc) ? meta.desc : '';
      render();
    });
  }

  /* ---------- 渲染商品 ---------- */
  function filtered() {
    return items.filter(function (it) {
      if (cat !== 'all' && it.category !== cat) return false;
      if (kw) {
        var hay = (it.title + ' ' + (it.summary || '') + ' ' + (it.tags || '')).toLowerCase();
        if (hay.indexOf(kw.toLowerCase()) < 0) return false;
      }
      return true;
    });
  }

  function card(it) {
    var fee = Number(it.price) * (C.platformFeePct || 3) / 100;
    return '' +
      '<div class="item" data-id="' + esc(it.id) + '">' +
        '<div class="it-top">' +
          '<span class="plat ' + esc(it.category) + '">' + esc(it.platform || '') + '</span>' +
          '<span class="sales">' + (it.sales || 0) + ' 人买过</span>' +
        '</div>' +
        '<h3>' + esc(it.title) + '</h3>' +
        '<p class="sum">' + esc(it.summary || '') + '</p>' +
        '<div class="it-foot">' +
          '<span class="price">' + money(it.price) + '</span>' +
          '<button class="btn-sm" data-buy="' + esc(it.id) + '">看一下 →</button>' +
        '</div>' +
      '</div>';
  }

  function render() {
    var list = filtered();
    var box = $('list');
    if (!list.length) {
      box.innerHTML = '<div class="empty">这个分类下还没有商品。' +
        '<br><a href="/market/sell.html">你可以第一个上架 →</a></div>';
      return;
    }
    box.innerHTML = list.map(card).join('');
  }

  /* ---------- 详情弹层 ---------- */
  function openDetail(id) {
    var it = items.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!it) return;
    var fee = (Number(it.price) * (C.platformFeePct || 3) / 100).toFixed(2);
    $('dTitle').textContent = it.title;
    $('dMeta').textContent = (it.platform || '') + ' · ' + (it.version || '版本未标') +
      ' · ' + (it.sales || 0) + ' 人买过';
    $('dBody').innerHTML =
      '<div class="free">' +
        '<div class="free-h">🆓 免费层（现在就能复制去用）</div>' +
        '<pre>' + esc(it.free_text || '暂无') + '</pre>' +
        '<button class="cp2" id="cpFree">复制免费提示词</button>' +
      '</div>' +
      '<div class="pro">' +
        '<div class="free-h">🔓 付费层 ' + money(it.price) + ' 包含</div>' +
        '<div class="pro-body">' + esc(it.pro_text || '') + '</div>' +
      '</div>' +
      (it.fail_case ? '<div class="fail"><b>⚠ 什么情况下不好用：</b>' + esc(it.fail_case) + '</div>' : '') +
      '<div class="sellinfo">卖家：' + esc(it.seller || '匿名') +
        ' · 平台服务费 ' + fee + ' 元（' + (C.platformFeePct || 3) + '%）</div>';
    $('dBuy').onclick = function () { goPay(it); };
    $('dModal').classList.add('on');

    var cp = $('cpFree');
    if (cp) cp.onclick = function () {
      var t = it.free_text || '';
      if (navigator.clipboard) navigator.clipboard.writeText(t);
      cp.textContent = '已复制';
      setTimeout(function () { cp.textContent = '复制免费提示词'; }, 1400);
    };
  }

  /* ---------- 去付款 ---------- */
  function goPay(it) {
    // 带到 /pay/，用 URL 参数指定商品，收款页会识别
    var q = '?item=' + encodeURIComponent(it.id) +
      '&name=' + encodeURIComponent(it.title) +
      '&price=' + encodeURIComponent(it.price) +
      '&type=market';
    location.href = '/pay/' + q;
  }

  /* ---------- 初始化 ---------- */
  function init() {
    renderCats();

    $('kw').addEventListener('input', function (e) {
      kw = e.target.value.trim();
      render();
    });

    $('list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-buy]');
      if (b) { openDetail(b.getAttribute('data-buy')); return; }
      var c = e.target.closest('.item');
      if (c) openDetail(c.getAttribute('data-id'));
    });

    $('dClose').onclick = function () { $('dModal').classList.remove('on'); };
    $('dModal').addEventListener('click', function (e) {
      if (e.target === $('dModal')) $('dModal').classList.remove('on');
    });

    $('list').innerHTML = '<div class="empty">加载中…</div>';
    sb(C.supabase.items + '?select=*&order=created_at.desc&limit=200')
      .then(function (d) {
        items = d || [];
        render();
        $('stat').textContent = items.length ? ('已上架 ' + items.length + ' 个商品') : '';
      })
      .catch(function (e) {
        items = [];
        render();
        $('stat').innerHTML = '<span style="color:#b45309">读取商品失败：' + esc(e.message) +
          '。若 market_items 表还没建，请先跑 README 里的建表 SQL。</span>';
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
