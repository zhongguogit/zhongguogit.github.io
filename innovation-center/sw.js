// 科创中心 Service Worker
const CACHE = "kc-v1";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then(cached => {
    const fp = fetch(e.request).then(res => { if (res && res.status === 200) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)).catch(()=>{}); } return res; }).catch(() => cached);
    return cached || fp;
  }));
});
