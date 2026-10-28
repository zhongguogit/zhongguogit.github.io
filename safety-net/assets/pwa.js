// Global Safety Net — PWA 注册 + 在线状态
(() => {
  'use strict';
  const pill = document.getElementById('netStatus');

  const paint = (online, ready) => {
    if (!pill) return;
    pill.hidden = false;
    pill.classList.toggle('off', !online);
    if (!online) pill.textContent = '◈ 离线中 · 缓存仍在';
    else if (ready) pill.textContent = '◈ 在线 · 已可离线使用';
    else pill.textContent = '◈ 在线';
  };

  const update = (ready) => paint(navigator.onLine, ready);
  update(false);

  window.addEventListener('online', () => update(true));
  window.addEventListener('offline', () => update(true));

  if (!('serviceWorker' in navigator)) return;
  const script = document.currentScript;
  if (!script) return;
  const swUrl = new URL('../sw.js', script.src).href;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swUrl).then(() => {
      update(true);
    }).catch(() => { /* 非 https 或旧浏览器：静默降级 */ });
  });
})();
