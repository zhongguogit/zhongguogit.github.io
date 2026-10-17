/**
 * 卖家后台：看自己的商品 + 成交 + 该到手多少
 */
(function () {
  'use strict';
  var C = window.MKT_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var PIN_KEY = 'zg_seller_ok';
  var who = '';

  function h() {
    return {
      'apikey': C.supabase.key,
      'Authorization': 'Bearer ' + C.supabase.key,
      'Content-Type': 'application/json'
    };
  }
  function get(table, qs) {
    return fetch(C.supabase.url + '/rest/v1/' + table + qs, { headers: h() }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 120)); });
      return r.json();
    });
  }
  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }
  function money(n) {
    n = Number(n || 0);
    return '¥' + (n % 1 === 0 ? n : n.toFixed(2));
  }

  var ST = {
    review: ['待审核', 'b-review'],
    live: ['已上架', 'b-live'],
    offline: ['已下架', 'b-offline']
  };

  function loadMine() {
    if (!who) return;
    $('mineList').innerHTML = '<div class="empty">加载中…</div>';
    get(C.supabase.items, '?select=*&seller=eq.' + encodeURIComponent(who) + '&order=created_at.desc')
      .then(function (rows) {
        if (!rows || !rows.length) {
          $('mineList').innerHTML = '<div class="empty">这个联系方式下还没有商品。<br>' +
            '<a href="/market/sell.html" style="color:#a5b4fc">去上架一个 →</a></div>';
          return;
        }
        $('mineList').innerHTML = rows.map(function (r) {
          var st = ST[r.status] || ST.review;
          return '<div class="mine">' +
            '<div class="mine-top"><span class="mine-id">' + esc(r.item_id) + '</span>' +
            '<span class="badge ' + st[1] + '">' + st[0] + '</span></div>' +
            '<h3>' + esc(r.title) + '</h3>' +
            '<div class="meta">' + esc(r.platform) + ' · ' + money(r.price) + ' · 卖出 ' + (r.sales || 0) + ' 件</div>' +
            '</div>';
        }).join('');
      }).catch(function (e) {
        $('mineList').innerHTML = '<div class="empty" style="color:#fca5a5">读取失败：' + esc(e.message) +
          '<br>若 market_items 表还没建，请先跑 schema.sql</div>';
      });
  }

  function loadOrders() {
    var qs = '?select=*&order=created_at.desc&limit=200';
    if (who) qs += '&seller=eq.' + encodeURIComponent(who);
    $('orderBox').innerHTML = '<div class="empty">加载中…</div>';

    get(C.supabase.ordersTable || 'market_orders', qs).then(function (rows) {
      rows = (rows || []).filter(function (r) { return r.status === 'delivered'; });
      var gross = 0, fee = 0, net = 0;
      rows.forEach(function (r) {
        gross += Number(r.gross || 0);
        fee += Number(r.fee_amount || 0);
        net += Number(r.net_to_seller || 0);
      });
      $('sOrders').textContent = rows.length;
      $('sGross').textContent = money(gross);
      $('sFee').textContent = money(fee);
      $('sNet').textContent = money(net);

      if (!rows.length) {
        $('orderBox').innerHTML = '<div class="empty">还没有成交记录。</div>';
        return;
      }
      $('orderBox').innerHTML =
        '<table class="tbl"><thead><tr>' +
        '<th>订单号</th><th>商品</th><th class="n">成交额</th><th class="n">3%</th><th class="n">到手</th>' +
        '</tr></thead><tbody>' +
        rows.map(function (r) {
          return '<tr><td style="font-family:var(--mono);font-size:12px">' + esc(r.order_id) + '</td>' +
            '<td>' + esc(r.item_title || r.item_id) + '</td>' +
            '<td class="n">' + money(r.gross) + '</td>' +
            '<td class="n" style="color:#fbbf24">' + money(r.fee_amount) + '</td>' +
            '<td class="n" style="color:#34d399">' + money(r.net_to_seller) + '</td></tr>';
        }).join('') +
        '</tbody></table>' +
        '<div style="font-size:12px;color:var(--tx3);margin-top:10px;line-height:1.7">' +
        '结算：每月 1 号对账，未满 ¥50 顺延到下月。退款单不计入上表。</div>';
    }).catch(function (e) {
      $('orderBox').innerHTML = '<div class="empty" style="color:#fca5a5">读取失败：' + esc(e.message) +
        '<br>若 market_orders 表还没建，请先跑 schema.sql</div>';
    });
  }

  function login() {
    if (($('pin').value || '').trim() === String(C.sellerPin)) {
      sessionStorage.setItem(PIN_KEY, '1');
      $('gate').style.display = 'none';
      $('panel').style.display = 'block';
      loadOrders();
    } else {
      $('pinErr').textContent = '口令不对。口令在 /market/config.js 的 sellerPin 里。';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (sessionStorage.getItem(PIN_KEY) === '1') {
      $('gate').style.display = 'none';
      $('panel').style.display = 'block';
      loadOrders();
    }
    $('btnLogin').onclick = login;
    $('pin').addEventListener('keydown', function (e) { if (e.key === 'Enter') login(); });
    $('btnMine').onclick = function () {
      who = ($('who').value || '').trim();
      loadMine();
      loadOrders();
    };
    $('who').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('btnMine').click();
    });
  });
})();
