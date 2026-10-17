/**
 * 站长核销台
 * 打开 /admin/ → 输 PIN → 看订单 → 点「已到账」开通
 *
 * 这是「收款码 + 人工核验」模式里最关键的一块：
 * 用户付完钱，你得有个地方看到这笔订单，并且一键标记已开通。
 */
(function () {
  'use strict';
  var C = window.PAY_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var PIN_KEY = 'zg_admin_ok';
  var rows = [];
  var filter = 'pending';

  function headers() {
    return {
      'apikey': C.supabase.key,
      'Authorization': 'Bearer ' + C.supabase.key,
      'Content-Type': 'application/json'
    };
  }

  function api(path, opts) {
    opts = opts || {};
    return fetch(C.supabase.url + '/rest/v1/' + C.supabase.table + path, {
      method: opts.method || 'GET',
      headers: Object.assign(headers(), opts.headers || {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 160)); });
      }
      return r.status === 204 ? null : r.json();
    });
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function when(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    var diff = (Date.now() - d.getTime()) / 60000;
    if (diff < 1) return '刚刚';
    if (diff < 60) return Math.floor(diff) + ' 分钟前';
    if (diff < 1440) return Math.floor(diff / 60) + ' 小时前';
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /* ---------- 卡密生成 ---------- */
  // 8 位，去掉 0/O/1/I，减少用户报错
  function makeKey() {
    var AB = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    if (window.crypto && crypto.getRandomValues) {
      var buf = new Uint8Array(8);
      crypto.getRandomValues(buf);
      for (var i = 0; i < 8; i++) out += AB[buf[i] % AB.length];
    } else {
      for (var j = 0; j < 8; j++) out += AB[Math.floor(Math.random() * AB.length)];
    }
    return out;
  }

  function badge(st) {
    var m = {
      pending: ['待核验', '#d97706', '#fffbeb', '#fde68a'],
      paid: ['已开通', '#059669', '#ecfdf5', '#a7f3d0'],
      rejected: ['已驳回', '#dc2626', '#fef2f2', '#fecaca']
    };
    var v = m[st] || m.pending;
    return '<span style="display:inline-block;font-size:11.5px;padding:2px 9px;border-radius:20px;' +
      'background:' + v[2] + ';color:' + v[1] + ';border:1px solid ' + v[3] + '">' + v[0] + '</span>';
  }

  function render() {
    var box = $('list');
    var list = rows.filter(function (r) {
      if (filter === 'all') return true;
      return (r.status || 'pending') === filter;
    });

    $('cPending').textContent = rows.filter(function (r) { return (r.status || 'pending') === 'pending'; }).length;
    $('cPaid').textContent = rows.filter(function (r) { return r.status === 'paid'; }).length;
    $('cAll').textContent = rows.length;

    if (!list.length) {
      box.innerHTML = '<div class="empty">' + (filter === 'pending' ? '没有待核验的订单，清静。' : '暂无记录') + '</div>';
      return;
    }

    box.innerHTML = list.map(function (r) {
      var st = r.status || 'pending';
      var diff = (r.paid_amount && r.amount && Math.abs(r.paid_amount - r.amount) > 0.01)
        ? '<span style="color:#dc2626;font-weight:600">⚠ 金额不符</span>' : '';
      return '' +
        '<div class="o" data-id="' + esc(r.order_id) + '">' +
          '<div class="o-top">' +
            '<div><span class="oid">' + esc(r.order_id) + '</span> ' + badge(st) + '</div>' +
            '<div class="time">' + when(r.created_at) + '</div>' +
          '</div>' +
          '<div class="o-mid">' +
            '<div><b>' + esc(r.plan_name) + '</b></div>' +
            '<div class="amt">' + (r.paid_amount != null ? '¥' + r.paid_amount : '—') +
              '<span class="should">应付 ¥' + (r.amount != null ? r.amount : '—') + '</span> ' + diff + '</div>' +
          '</div>' +
          '<div class="o-c">微信/手机：<b>' + esc(r.contact) + '</b></div>' +
          (r.key_code
            ? '<div class="o-c">卡密：<b style="font-family:var(--mono);letter-spacing:.12em;color:#34d399">' +
              esc(r.key_code) + '</b> <button class="cpk" data-copy="' + esc(r.key_code) + '">复制发给买家</button></div>'
            : '') +
          (r.note ? '<div class="o-c">备注：' + esc(r.note) + '</div>' : '') +
          '<div class="o-act">' +
            (st !== 'paid' ? '<button class="ok" data-act="paid">✓ 已到账，开通</button>' : '') +
            (st !== 'rejected' ? '<button class="no" data-act="rejected">✕ 驳回</button>' : '') +
            '<button class="del" data-act="del">删除</button>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  function load() {
    $('list').innerHTML = '<div class="empty">加载中…</div>';
    api('?select=*&order=created_at.desc&limit=300').then(function (d) {
      rows = d || [];
      render();
    }).catch(function (e) {
      $('list').innerHTML = '<div class="empty" style="color:#dc2626">读取失败：' + esc(e.message) +
        '<br><br>最常见原因：Supabase 里还没建 orders 表。<br>' +
        '把 <code>/pay/README.md</code> 里的建表 SQL 贴进 Supabase SQL Editor 跑一次即可。</div>';
    });
  }

  function update(oid, patch) {
    return api('?order_id=eq.' + encodeURIComponent(oid), {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: patch
    });
  }

  function remove(oid) {
    return api('?order_id=eq.' + encodeURIComponent(oid), { method: 'DELETE' });
  }

  /* 市场商品单的状态映射：主订单 paid → 成交单 delivered */
  var MK_STATUS = { 'paid': 'delivered', 'cancelled': 'cancelled', 'refunded': 'refunded' };

  function syncMarketOrder(oid, act) {
    var st = MK_STATUS[act];
    if (!st) return;
    fetch(C.supabase.url + '/rest/v1/market_orders?order_id=eq.' + encodeURIComponent(oid), {
      method: 'PATCH',
      headers: Object.assign(headers(), { 'Prefer': 'return=minimal' }),
      body: JSON.stringify({ status: st })
    }).catch(function () {
      // 成交单同步失败不影响主流程，卖家后台可以手工核对
      console.warn('market_orders 同步失败，订单号：' + oid);
    });
  }

  function login() {
    var v = ($('pin').value || '').trim();
    if (v === String(C.adminPin)) {
      sessionStorage.setItem(PIN_KEY, '1');
      $('gate').style.display = 'none';
      $('panel').style.display = 'block';
      load();
    } else {
      $('pinErr').textContent = '口令不对。口令在 /pay/config.js 的 adminPin 里。';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (sessionStorage.getItem(PIN_KEY) === '1') {
      $('gate').style.display = 'none';
      $('panel').style.display = 'block';
      load();
    }

    $('btnLogin').onclick = login;
    $('pin').addEventListener('keydown', function (e) { if (e.key === 'Enter') login(); });
    $('btnRefresh').onclick = load;

    document.querySelectorAll('.tab').forEach(function (t) {
      t.onclick = function () {
        document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
        t.classList.add('on');
        filter = t.getAttribute('data-f');
        render();
      };
    });

    $('list').addEventListener('click', function (e) {
      // 复制卡密
      var cb = e.target.closest('button[data-copy]');
      if (cb) {
        var code = cb.getAttribute('data-copy');
        var done = function () {
          var t = cb.textContent;
          cb.textContent = '已复制';
          setTimeout(function () { cb.textContent = t; }, 1400);
        };
        if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, function(){ alert('复制失败：' + code); });
        else { alert('卡密：' + code); }
        return;
      }

      var b = e.target.closest('button[data-act]');
      if (!b) return;
      var card = b.closest('.o');
      var oid = card.getAttribute('data-id');
      var act = b.getAttribute('data-act');
      b.disabled = true;

      var p;
      if (act === 'del') {
        if (!confirm('彻底删除订单 ' + oid + '？删掉就查不到了，一般不用删。')) { b.disabled = false; return; }
        p = remove(oid).then(function () {
          rows = rows.filter(function (r) { return r.order_id !== oid; });
          render();
        });
      } else {
        var patch = { status: act, updated_at: new Date().toISOString() };
        // 标记已到账时自动生成卡密（买家凭它自助下载）
        if (act === 'paid') {
          var cur = rows.filter(function (r) { return r.order_id === oid; })[0];
          if (!cur || !cur.key_code) patch.key_code = makeKey();
        }
        p = update(oid, patch).then(function (res) {
          // 关键：确认真的改到了，不能凭 HTTP 200 就认为成功
          if (!Array.isArray(res) || res.length === 0) {
            throw new Error('没有更新到任何一行（订单号可能不存在）');
          }
          rows = rows.map(function (r) { return r.order_id === oid ? res[0] : r; });
          render();
          // 市场商品单：同步更新 market_orders，否则卖家后台的成交额永远是 0
          var cur0 = res[0];
          if (cur0 && cur0.item_id) syncMarketOrder(oid, act);
        });
      }

      p.catch(function (err) {
        alert('操作失败：' + err.message);
        b.disabled = false;
      });
    });
  });
})();
