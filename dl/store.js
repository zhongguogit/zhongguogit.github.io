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
    if (key.length !== (C.key || {}).length) {
      msg('卡密是 ' + ((C.key || {}).length || 8) + ' 位，你填了 ' + key.length + ' 位', 'no');
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
        msg('没查到这个订单号。检查有没有输错，或微信联系站长。', 'no');
        return;
      }
      var row = rows[0];

      if (row.status !== 'paid') {
        msg('这个订单还没开通（当前状态：' + (row.status || 'pending') + '）。<br>' +
            '付款后把订单号发给站长，核验到账就会开通并给你卡密。', 'no');
        return;
      }
      if (!row.key_code) {
        msg('订单已开通，但卡密还没生成。请联系站长补发。', 'no');
        return;
      }
      if (String(row.key_code).toUpperCase() !== key) {
        msg('卡密不对。卡密只对应这一个订单，注意大小写和容易看错的字符（已排除 0/O/1/I）。', 'no');
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
          '<span style="color:#9ca3af;font-size:12.5px">文件 ' + esc(it.file) + ' · ' + esc(it.size) + '</span><br>' +
          '<a class="dlfile" href="' + href + '" download>↓ 下载 ' + esc(it.file) + '</a><br>' +
          '<span style="color:#9ca3af;font-size:12px;margin-top:10px;display:inline-block">' +
          '下载后按详情页的安装步骤放好目录。卡密请自己保存，重装可再次下载。</span>');
    }).catch(function (e) {
      msg('验证失败：' + esc(e.message) + '<br><span style="color:#9ca3af;font-size:12px">' +
          '如果是网络问题，稍后重试；如果一直失败，直接微信联系站长发货。</span>', 'no');
    });
  }

  /* ---------- 初始化 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
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
