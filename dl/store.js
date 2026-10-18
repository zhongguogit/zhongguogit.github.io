/**
 * 商店页：商品渲染 + 详情 + 卡密校验下载
 */
(function () {
  'use strict';
  var C = window.STORE_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var items = C.items || [];

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }
  function money(n) {
    n = Number(n);
    return '¥' + (n % 1 === 0 ? n : n.toFixed(2));
  }

  /* ---------- 商品卡 ---------- */
  function render() {
    var minPrice = Math.min.apply(null, items.map(function (x) { return x.price; }));
    $('grid').innerHTML = items.map(function (it) {
      var hot = it.tags.indexOf('组合包') >= 0;
      return '<div class="card' + (hot ? ' hot' : '') + '" data-id="' + esc(it.id) + '">' +
        '<h3>' + esc(it.name) + '</h3>' +
        '<div class="tagline">' + esc(it.tagline) + '</div>' +
        '<div class="tags">' + it.tags.map(function (t) { return '<i>' + esc(t) + '</i>'; }).join('') +
          '<i style="background:#f3f4f6;color:#6b7280">' + esc(it.size) + '</i></div>' +
        '<ul class="inc">' + it.includes.slice(0, 4).map(function (x) {
          return '<li>' + esc(x) + '</li>';
        }).join('') +
          (it.includes.length > 4 ? '<li style="color:#9ca3af">还有 ' + (it.includes.length - 4) + ' 项…</li>' : '') +
        '</ul>' +
        '<div class="foot">' +
          '<div class="p">' + money(it.price) + '</div>' +
          '<button data-detail="' + esc(it.id) + '">看详情</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ---------- 免费验货下载（加密包，无密码打不开） ---------- */
  var PWDS_FILE = '/dl/pwds-y484e0.json';
  function renderPreview(){
    var g = $('previewGrid'); if(!g) return; g.innerHTML = '';
    items.forEach(function(it){
      var d = document.createElement('div'); d.className = 'card';
      d.innerHTML = '<h3>' + esc(it.name) + '</h3><div class="sub">' + esc(it.file) + ' · ' + esc(it.size) + '</div>' +
        '<a class="dlfile" style="margin-top:8px" href="' + (C.base || '/downloads/') + it.file + '" download>↓ 下载加密包</a>' +
        '<div style="color:#9ca3af;font-size:12px;margin-top:6px">🔒 加密 · 解压需密码（付款核验后取得）</div>';
      g.appendChild(d);
    });
  }

  /* ---------- 详情 ---------- */
  function openDetail(id) {
    var it = items.filter(function (x) { return x.id === id; })[0];
    if (!it) return;
    $('mTitle').textContent = it.name;
    $('mSub').textContent = it.tagline + ' · ' + money(it.price);
    $('mInc').innerHTML = it.includes.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    $('mInst').innerHTML = it.install.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    if (it.note) {
      $('mNoteWrap').style.display = 'block';
      $('mNote').textContent = it.note;
    } else {
      $('mNoteWrap').style.display = 'none';
    }
    $('mBuy').onclick = function () { goPay(it); };
    $('modal').classList.add('on');
  }

  function goPay(it) {
    var q = '?type=market&item=DL-' + encodeURIComponent(it.id) +
      '&name=' + encodeURIComponent(it.name) +
      '&price=' + encodeURIComponent(it.price);
    location.href = '/pay/' + q;
  }

  /* ---------- 卡密校验 ---------- */
  function msg(html, cls) {
    $('dlMsg').innerHTML = '<div class="' + (cls || '') + '">' + html + '</div>';
  }

  function verify() {
    var oid = ($('oid').value || '').trim().toUpperCase();
    var key = ($('key').value || '').trim().toUpperCase().replace(/\s/g, '');

    if (!oid) { msg('请填订单号（形如 ZG2610173821）', 'no'); return; }
    if (key && key.length !== (C.key || {}).length) {
      msg('卡密填了 ' + key.length + ' 位，应为 ' + ((C.key || {}).length || 8) + ' 位。留空则只按订单号核对。', 'no');
      return;
    }

    msg('验证中…');

    var url = C.supabase.url + '/rest/v1/' + C.supabase.table +
      '?order_id=eq.' + encodeURIComponent(oid) + '&select=order_id,status,key_code,item_id,plan_name';

    fetch(url, {
      headers: {
        'apikey': C.supabase.key,
        'Authorization': 'Bearer ' + C.supabase.key
      }
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 120)); });
      return r.json();
    }).then(function (rows) {
      if (!rows || !rows.length) {
        msg('没查到这个订单号。检查有没有输错（形如 ZG2610173821）。<br>' +
            '还是不行就发邮件 3923833208@qq.com 或加 QQ 3923833208，标题写「订单号」，处理更快。', 'no');
        return;
      }
      var row = rows[0];

      if (row.status !== 'paid') {
        msg('这个订单还没开通（当前状态：' + (row.status || 'pending') + '）。<br>' +
            '站长核对到账后（一般 10 分钟内）就能换密码，回来再输一次订单号即可。', 'no');
        return;
      }
      if (key && row.key_code && String(row.key_code).toUpperCase() !== key) {
        msg('卡密不对。也可以<b>把卡密留空</b>，只凭订单号换取密码。', 'no');
        return;
      }

      // 找到对应商品
      var it = null;
      var iid = String(row.item_id || '').replace(/^DL-/, '');
      it = items.filter(function (x) { return x.id === iid; })[0];
      if (!it && row.plan_name) {
        it = items.filter(function (x) { return row.plan_name.indexOf(x.name) >= 0; })[0];
      }
      if (!it) {
        msg('验证通过，但没找到对应的商品文件。请把订单号发给站长，人工发你。', 'no');
        return;
      }

      var href = (C.base || '/downloads/') + it.file;
      msg('<span class="ok">✓ 验证通过：' + esc(it.name) + '</span><br>' +
          '<span style="color:#9ca3af;font-size:12.5px">文件 ' + esc(it.file) + ' · ' + esc(it.size) + ' · 正在取解压密码…</span>');
      fetch(PWDS_FILE).then(function(r){ return r.json(); }).then(function(pw){
        var rec = pw[it.id] || {};
        var pwd = rec.pwd || '';
        msg('<span class="ok">✓ 验证通过：' + esc(it.name) + '</span><br>' +
          '<a class="dlfile" href="' + href + '" download>↓ 下载加密包 ' + esc(it.file) + '</a><br>' +
          '<div style="margin-top:10px;font-size:14px">解压密码：<b id="zpwd" style="font-size:18px;letter-spacing:2px">' + esc(pwd) + '</b> ' +
          '<button class="cpk" data-copy="' + esc(pwd) + '" style="padding:4px 12px;cursor:pointer">复制密码</button></div>' +
          '<span style="color:#9ca3af;font-size:12px;display:inline-block;margin-top:8px">' +
          '解压方法：右键 zip → 解压/打开 → 输入密码。手机用「文件」App 或 QQ 浏览器也可解压。<br>' +
          '订单号请自己保存，重装或再次下载时，填订单号即可重新换密码。</span>');
      }).catch(function(){
        msg('<span class="ok">✓ 验证通过</span>，但密码加载失败，请把订单号发给站长人工发密码。', 'no');
      });
    }).catch(function (e) {
      msg('验证失败：' + esc(e.message) + '<br><span style="color:#9ca3af;font-size:12px">' +
          '如果是网络问题，稍后重试；如果一直失败，QQ 3923833208 / 3923833208@qq.com 找站长补发。</span>', 'no');
    });
  }

  /* ---------- 初始化 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    renderPreview();
    render();

    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-detail]');
      if (b) { openDetail(b.getAttribute('data-detail')); return; }
      var c = e.target.closest('.card');
      if (c) openDetail(c.getAttribute('data-id'));
    });

    $('mClose').onclick = function () { $('modal').classList.remove('on'); };
    $('modal').addEventListener('click', function (e) {
      if (e.target === $('modal')) $('modal').classList.remove('on');
    });

    $('btnDl').onclick = verify;
    $('oid').addEventListener('keydown', function (e) { if (e.key === 'Enter') verify(); });
    $('key').addEventListener('keydown', function (e) { if (e.key === 'Enter') verify(); });

    // 从本地记录自动填订单号
    try {
      var last = JSON.parse(localStorage.getItem('zg_last_order') || 'null');
      if (last && last.order_id) $('oid').value = last.order_id;
    } catch (e) {}
  });
})();
