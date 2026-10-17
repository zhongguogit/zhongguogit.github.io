/**
 * 收款页逻辑：套餐渲染 + 三步下单 + 订单落库 + 回查
 * 依赖：/pay/config.js（必须先加载）
 */
(function () {
  'use strict';

  var C = window.PAY_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var LS_ORDER = 'zg_last_order';   // 本地记住最近一单，方便用户回查
  var LS_MINE = 'zg_my_orders';     // 本机下单历史

  /* ---------------- 工具 ---------------- */
  function money(n) {
    return '¥' + (Number(n) % 1 === 0 ? Number(n) : Number(n).toFixed(2));
  }

  // 订单号：ZG + 年月日 + 4 位随机（好读、好报、难撞）
  function makeOrderId() {
    var d = new Date();
    var p = function (x) { return String(x).padStart(2, '0'); };
    var stamp = String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate());
    var rnd = Math.floor(1000 + Math.random() * 9000);
    return 'ZG' + stamp + rnd;
  }

  function copy(text, btn) {
    var done = function () {
      if (!btn) return;
      var t = btn.textContent;
      btn.textContent = '已复制';
      setTimeout(function () { btn.textContent = t; }, 1400);
    };
    if (navigator.clipboard && location.protocol === 'https:') {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else { fallback(); }

    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { alert('复制失败，请手动记下：' + text); }
      document.body.removeChild(ta);
    }
  }

  /* ---------------- Supabase 直连（REST，不依赖 SDK） ---------------- */
  var SB = C.supabase || {};

  function sbHeaders() {
    return {
      'apikey': SB.key,
      'Authorization': 'Bearer ' + SB.key,
      'Content-Type': 'application/json'
    };
  }

  function sbCall(path, opts) {
    return sbCallTable(SB.table || 'orders', path, opts);
  }

  /* 指定表名的通用调用（写 market_orders 等其它表时用） */
  function sbCallTable(table, path, opts) {
    opts = opts || {};
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 12000);
    return fetch(SB.url + '/rest/v1/' + table + (path || ''), {
      method: opts.method || 'GET',
      headers: Object.assign(sbHeaders(), opts.headers || {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal
    }).finally(function () { clearTimeout(timer); });
  }

  /**
   * 写入订单。
   * 关键：必须确认服务端真的返回了数据，不能因为 HTTP 200 就当成功。
   * Prefer: return=representation 会回传插入的行；空数组=没写进去。
   */
  function saveOrder(order) {
    return sbCall('', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: order
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error('HTTP ' + res.status + ' ' + t.slice(0, 200));
        });
      }
      return res.json();
    }).then(function (rows) {
      if (!Array.isArray(rows) || rows.length === 0) {
        // 幻觉成功：请求没报错，但一行都没写进去
        throw new Error('服务端未返回写入结果（可能表不存在或权限不足）');
      }
      return rows[0];
    });
  }

  function fetchOrder(oid) {
    return sbCall('?order_id=eq.' + encodeURIComponent(oid) + '&select=*', {}).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (rows) {
      return (rows && rows[0]) || null;
    });
  }

  /* ---------------- 商品名 ---------------- */
  function planLabel(p) {
    if (!p) return '';
    var t = '';
    if (p.id === 'once' && state.onceTarget) {
      t = ' · ' + state.onceTarget;
    }
    return p.name + t;
  }

  /* ---------------- 状态 ---------------- */
  var state = { plan: null, oid: '', onceTarget: '', paidAt: 0, market: null };

  /* ---------------- 渲染套餐 ---------------- */
  function renderPlans() {
    var box = $('plans');
    if (!box) return;
    var plans = C.plans || [];
    box.innerHTML = plans.map(function (p) {
      var monthly = '';
      if (p.id === 'year') {
        monthly = '<div style="font-size:12px;color:var(--tx3);margin-top:6px">折合每月 ' + money((p.price / 12).toFixed(1)) + '</div>';
      }
      var missing = (p.missing || []).map(function (m) { return '<li class="no">' + m + '</li>'; }).join('');
      var feats = (p.features || []).map(function (f) { return '<li>' + f + '</li>'; }).join('');
      return '' +
        '<div class="plan' + (p.hot ? ' hot' : '') + '">' +
          (p.badge ? '<div class="tag">' + p.badge + '</div>' : '') +
          '<h3>' + p.name + '</h3>' +
          '<div class="sub">' + p.sub + '</div>' +
          '<div class="price">' + money(p.price) + '<small> / ' + p.period + '</small></div>' +
          monthly +
          '<ul>' + feats + missing + '</ul>' +
          '<button class="buy' + (p.hot ? ' primary' : '') + '" data-plan="' + p.id + '">' +
            (p.hot ? '立即开通' : '选这个') + '</button>' +
        '</div>';
    }).join('');

    box.addEventListener('click', function (e) {
      var b = e.target.closest('.buy');
      if (!b) return;
      openFlow(b.getAttribute('data-plan'));
    });
  }

  /* ---------------- 弹层流程 ---------------- */
  function show(step) {
    ['s1', 's2', 's3', 's4'].forEach(function (id) {
      var el = $(id);
      if (el) el.style.display = 'none';
    });
    var target = $('s' + step);
    if (target) target.style.display = 'block';

    var spans = document.querySelectorAll('#steps span');
    var map = { 1: 0, 2: 1, 3: 2, 4: 3 };
    spans.forEach(function (s, i) {
      s.classList.toggle('on', i === (map[step] || 0));
    });
    // 第 4 步是完成页，把步骤条里的第 3 步也点亮
    if (step === 4 && spans[2]) spans[2].classList.add('on');
  }

  function openFlow(planId) {
    var plan = (C.plans || []).filter(function (p) { return p.id === planId; })[0];
    if (!plan) return;
    state.plan = plan;
    state.oid = makeOrderId();
    state.onceTarget = '';

    state.market = null;
    $('s1title').textContent = '确认套餐 · ' + plan.name;

    // 单次解锁：让用户选具体工具
    var pick = $('oncePick');
    if (plan.id === 'once') {
      if (pick) {
        pick.style.display = 'block';
        pick.innerHTML = '<label>解锁哪个工具？</label><select id="onceSel">' +
          (C.onceTargets || []).map(function (t) {
            return '<option value="' + t.name + '">' + t.name + '</option>';
          }).join('') + '</select>';
        state.onceTarget = (C.onceTargets[0] || {}).name || '';
        $('onceSel').addEventListener('change', function (e) {
          state.onceTarget = e.target.value;
          $('s1desc').textContent = planLabel(plan);
        });
      }
    } else if (pick) {
      pick.style.display = 'none';
      pick.innerHTML = '';
    }

    $('s1desc').textContent = planLabel(plan);
    $('s1price').textContent = money(plan.price);
    $('modal').classList.add('on');
    show(1);
  }

  function closeModal() {
    $('modal').classList.remove('on');
  }

  /* ---------------- 收款码 ---------------- */
  function renderQR() {
    var img = $('qr');
    var ph = $('qrph');
    if ($('qrWarn')) $('qrWarn').style.display = 'none';
    var checked = document.querySelector('input[name="pm"]:checked');
    var method = checked ? checked.value : 'wx';
    var url = (C.qr || {})[method];

    if (!url) { img.style.display = 'none'; ph.style.display = 'grid'; return; }

    // 占位图检测：没上传真收款码时，绝不能显示一张空白图让人对着扫
    img.onload = function () {
      var ph = (C.qr || {}).placeholderSize;
      if (ph && img.naturalWidth === 420 && img.naturalHeight === 420) {
        img.style.display = 'none';
        $('qrph').style.display = 'grid';
        $('qrph').innerHTML = '收款码还没上传<br><span style="font-size:11px">站长请把收款码截图存成 ' + url + ' 后提交</span>';
        var warn = $('qrWarn');
        if (warn) warn.style.display = 'block';
        return;
      }
      img.style.display = 'block';
      $('qrph').style.display = 'none';
    };
    img.onerror = function () {
      img.style.display = 'none';
      $('qrph').style.display = 'grid';
      $('qrph').innerHTML = '收款码没加载出来<br><span style="font-size:11px">检查 ' + url + ' 是否存在</span>';
      var warn = $('qrWarn');
      if (warn) warn.style.display = 'block';
    };
    img.src = url + '?v=1';
  }

  /* ---------------- 提交 ---------------- */
  function submit() {
    var contact = ($('contact').value || '').trim();
    var amtRaw = ($('paidamt').value || '').trim();
    var note = ($('note').value || '').trim();
    var btn = $('btn-submit');
    var err = $('subErr');
    err.style.display = 'none';

    if (contact.length < 3) {
      err.textContent = '请填一个能找到你的联系方式（QQ / 邮箱 / 手机号）';
      err.style.display = 'block';
      return;
    }
    var amt = parseFloat(amtRaw);
    if (!amt || amt <= 0) {
      err.textContent = '请填实际付款金额，例如 ' + state.plan.price;
      err.style.display = 'block';
      return;
    }
    if (Math.abs(amt - state.plan.price) > 0.01) {
      // 金额不符先提醒，但不拦死——用户可能多付了
      if (!confirm('你填的金额是 ¥' + amt + '，套餐价是 ' + money(state.plan.price) + '。\n\n如果确实按这个金额付的款，点「确定」继续；否则点「取消」回去改。')) {
        return;
      }
    }

    var order = {
      order_id: state.oid,
      plan_id: state.plan.id,
      item_id: state.market ? state.market.id : null,
      plan_name: planLabel(state.plan),
      amount: state.plan.price,
      paid_amount: amt,
      contact: contact,
      note: note,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    btn.disabled = true;
    btn.textContent = '提交中…';

    saveOrder(order).then(function () {
      // 市场商品：同步写一条成交记录到 market_orders，否则卖家后台永远统计不到这笔钱
      if (state.market) {
        try {
          var feePct = Number((C.marketFeePct != null ? C.marketFeePct : 3));
          var gross = Number(order.amount) || 0;
          var fee = Math.round(gross * feePct) / 100;
          sbCallTable('market_orders', '', {
            method: 'POST',
            headers: { 'Prefer': 'return=minimal' },
            body: {
              order_id: order.order_id,
              item_id: state.market.id,
              item_title: state.market.name,
              seller: state.market.seller || 'unknown',
              gross: gross,
              fee_pct: feePct,
              fee_amount: fee,
              net_to_seller: Math.round((gross - fee) * 100) / 100,
              buyer_contact: order.contact,
              status: 'pending'
            }
          }).catch(function () { /* 写失败不影响主订单，核销台仍可手动补 */ });
        } catch (e) { /* 同上 */ }
      }
      try {
        localStorage.setItem(LS_ORDER, JSON.stringify(order));
        var mine = JSON.parse(localStorage.getItem(LS_MINE) || '[]');
        mine.unshift({ order_id: order.order_id, plan_name: order.plan_name, amount: order.amount, at: order.created_at, status: 'pending' });
        localStorage.setItem(LS_MINE, JSON.stringify(mine.slice(0, 20)));
      } catch (e) { /* 隐私模式忽略 */ }

      $('oid3').textContent = order.order_id;
      show(4);
    }).catch(function (e) {
      // 落库失败是真实失败，必须让用户看见，不能假装成功
      err.innerHTML = '提交失败：订单没存上。<br>' +
        '<span style="font-size:12px;color:var(--tx3)">' + (e.message || e) + '</span><br><br>' +
        '请<strong>先保存这张订单号 ' + order.order_id + '</strong>，稍后刷新本页重试；' +
        '若仍失败，说明数据服务暂时不可用，你的付款记录在微信账单里可查。';
      err.style.display = 'block';
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = '提交，等待开通';
    });
  }

  /* ---------------- 订单回查 ---------------- */
  function recall() {
    var input = $('recallInput');
    var box = $('recallBox');
    var oid = (input.value || '').trim().toUpperCase();
    if (!oid) return;
    box.innerHTML = '<div class="empty">查询中…</div>';

    fetchOrder(oid).then(function (row) {
      if (!row) {
        box.innerHTML = '<div class="empty">没查到这个订单号。检查一下有没有输错，或直接微信联系站长。</div>';
        return;
      }
      var st = row.status || 'pending';
      var map = {
        pending: { t: '待核验', c: 'var(--warn)', d: '我们还没确认到账。如果你已经付了，正常情况下 10 分钟内就会自动开通，请稍后再点一次「查询」。' },
        paid: { t: '已开通', c: 'var(--ok)', d: '已核验到账并开通。' },
        rejected: { t: '已驳回', c: 'var(--bad)', d: '金额不符或没查到这笔款。请核对订单号和付款金额，确认无误后重新提交一次。' }
      };
      var s = map[st] || map.pending;
      var extra = '';
      if (st === 'paid' && row.key_code) {
        extra = '<div style="margin-top:12px;padding:12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px">' +
          '<div style="font-size:12px;color:#047857;margin-bottom:6px">你的卡密 · 下载时要用</div>' +
          '<div style="font-family:var(--mono);font-size:20px;font-weight:700;letter-spacing:.08em;color:#065f46">' + row.key_code + '</div>' +
          '<div style="font-size:12px;color:#047857;margin-top:8px">' +
          (row.item_id ? '这是市场商品，请联系卖家发货。' : '带上订单号 + 这串卡密，去 <a href="/dl/">技能商店</a> 自助下载。') +
          '</div></div>';
      }
      box.innerHTML =
        '<div class="rc">' +
          '<div class="rc-h"><b>' + row.order_id + '</b>' +
          '<span style="color:' + s.c + ';font-weight:600">' + s.t + '</span></div>' +
          '<div class="rc-b">' + (row.plan_name || '') + ' · ' + money(row.paid_amount || row.amount) + '<br>' +
          '<span style="font-size:12px;color:var(--tx3)">' + s.d + '</span>' + extra + '</div>' +
        '</div>';
    }).catch(function (e) {
      box.innerHTML = '<div class="empty">查询失败：' + (e.message || e) + '。请稍后重试或直接联系站长。</div>';
    });
  }

  /* ---------------- 绑定 ---------------- */
  /* ---------------- 市场商品直购（?item=&name=&price=&type=market） ---------------- */
  function readMarketParam() {
    var q = new URLSearchParams(location.search);
    if (q.get('type') !== 'market') return null;
    var price = parseFloat(q.get('price') || '0');
    var name = q.get('name') || '';
    if (!name || !(price > 0)) return null;
    return { id: q.get('item') || '', name: name, price: price };
  }

  function openMarketFlow(m) {
    state.market = m;
    state.plan = { id: 'market', name: m.name, price: m.price, period: '件' };
    state.oid = makeOrderId();
    $('s1title').textContent = '确认购买';
    $('s1desc').textContent = m.name + ' · 市场商品（卖家交付）';
    $('s1price').textContent = money(m.price);
    var pick = $('oncePick');
    if (pick) { pick.style.display = 'none'; pick.innerHTML = ''; }
    $('modal').classList.add('on');
    show(1);
  }

  function init() {
    renderPlans();
    var mk = readMarketParam();
    if (mk) {
      // 市场直购：不展示套餐，直接进下单
      var plans = $('plans');
      if (plans) plans.innerHTML = '<div style="grid-column:1/-1;background:#fff;border:1px solid var(--line);' +
        'border-radius:12px;padding:22px;text-align:center">' +
        '<div style="font-size:13px;color:var(--tx3);margin-bottom:6px">你正在购买市场商品</div>' +
        '<div style="font-size:19px;font-weight:650">' + mk.name + '</div>' +
        '<div class="price" style="margin-top:10px">' + money(mk.price) + '</div>' +
        '<button class="buy primary" style="max-width:260px;margin:18px auto 0" id="mkBuy">扫码购买</button>' +
        '<div style="font-size:12px;color:var(--tx3);margin-top:10px">平台服务费 3%，卖家拿 97%</div>' +
        '</div>';
      var b = $('mkBuy');
      if (b) b.onclick = function () { openMarketFlow(mk); };
      window.__mk = mk;
    }

    // 联系方式：QQ + QQ 邮箱（微信号不可添加，所以不用微信）
    var qq = C.contactQQ || '';
    var mail = C.contactMail || '';
    ['qqLine', 'footQQ'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      if (qq) el.textContent = qq; else el.parentNode.style.display = 'none';
    });
    ['mailLine', 'footMail'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      if (mail) el.textContent = mail; else el.parentNode.style.display = 'none';
    });
    if ($('navMail') && mail) {
      $('navMail').href = 'mailto:' + mail + '?subject=' + encodeURIComponent('订单咨询');
    }

    $('mclose').onclick = closeModal;
    $('btn-cancel1').onclick = closeModal;
    $('btn-close4').onclick = closeModal;
    $('modal').addEventListener('click', function (e) {
      if (e.target === $('modal')) closeModal();
    });

    $('btn-next').onclick = function () {
      $('oid').textContent = state.oid;
      $('oid2').textContent = state.oid;
      renderQR();
      show(2);
    };

    if ($('payMethod')) $('payMethod').addEventListener('change', renderQR);
    document.querySelectorAll('input[name="pm"]').forEach(function (r) {
      r.addEventListener('change', renderQR);
    });

    // 没配支付宝收款码时，直接隐藏支付宝选项，不给买家一个走不通的按钮
    var aliOn = !!((C.qr || {}).aliEnabled);
    if ($('tabAli')) $('tabAli').style.display = aliOn ? '' : 'none';
    if (!aliOn) {
      var tabWrap = $('paytabs');
      if (tabWrap) {
        // 只剩一个选项时，把选择条也藏掉，视觉上更干净
        tabWrap.style.display = 'none';
      }
      if ($('payDesc')) {
        $('payDesc').innerHTML = '用微信扫码，<b>金额请照填</b>。付完点下一步。';
      }
      var wxRadio = document.querySelector('input[name="pm"][value="wx"]');
      if (wxRadio) wxRadio.checked = true;
    } else if ($('payDesc')) {
      $('payDesc').innerHTML = '用微信或支付宝扫码，<b>金额请照填</b>。付完点下一步。';
    }

    $('btn-paid').onclick = function () { show(3); };
    $('btn-back2').onclick = function () { show(1); };
    $('btn-back3').onclick = function () { show(2); };

    $('cp-oid').onclick = function () { copy(state.oid, this); };
    $('cp-oid2').onclick = function () { copy(state.oid, this); };
    $('btn-submit').onclick = submit;

    $('btn-copyall').onclick = function () {
      copy(state.oid, this);
    };

    // 完成页直接查询：把订单号填进查询框并滚过去，不用手打
    if ($('btn-recall4')) {
      $('btn-recall4').onclick = function () {
        closeModal();
        if ($('recallInput')) {
          $('recallInput').value = state.oid;
          var target = $('recallInput').closest('section') || $('recallInput');
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(recall, 400);
        }
      };
    }

    if ($('btnRecall')) $('btnRecall').onclick = recall;
    if ($('recallInput')) {
      $('recallInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') recall();
      });
    }

    // 上次订单提示
    try {
      var last = JSON.parse(localStorage.getItem(LS_ORDER) || 'null');
      if (last && $('recallInput')) {
        $('recallInput').value = last.order_id;
        if ($('lastHint')) {
          $('lastHint').textContent = '你上次的订单号已自动填入，点「查询」看状态。';
        }
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
