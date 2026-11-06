/* BK Trip 서비스워커 (하나로 통합)
   - 앱 껍데기는 미리 저장, 여행 데이터·사진은 한 번 열면 저장 → 해외에서 데이터 끊겨도 보임
   - 온라인이면 항상 최신(네트워크 먼저, 4초 넘게 걸리면 저장본) */
const VERSION = 'bk-trip-v2';
const SHELL = ['/', '/app/index.html', '/app/app.js', '/app/theme.js', '/app/app.css', '/app/base.css', '/app/skin.css', '/trips.json', '/manifest.webmanifest', '/assets/icon.svg', '/assets/icon-192.png'];
const IMG = /\.(png|jpe?g|webp|gif|svg|avif)$/i;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

function put(key, res) { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(key, cp)); } return res; }
function match(key) { return caches.match(key, { ignoreSearch: true }); }

// 네트워크 먼저, 늦으면 저장본
function netFirst(req, key, fallbackKey, ms) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done && r) { done = true; resolve(r); } };
    const timer = setTimeout(() => { match(key).then(finish); }, ms || 4000);
    fetch(req).then((res) => {
      clearTimeout(timer);
      if (res.ok) put(key, res);
      if (res.ok || done) return finish(res);
      // 404 등: 저장본이 있으면 그걸, 없으면 그대로
      return match(key).then((hit) => finish(hit || res));
    }).catch(() => {
      clearTimeout(timer);
      match(key).then((hit) => hit || (fallbackKey ? match(fallbackKey) : null)).then((hit) => finish(hit || new Response('오프라인이라 아직 저장 안 된 화면이야.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })));
    });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;

  if (req.mode === 'navigate' && same) {
    const key = url.pathname === '/index.html' ? '/' : url.pathname.replace(/\/$/, '') || '/';
    const fb = key === '/' ? '/' : '/app/index.html';
    e.respondWith(netFirst(req, key, fb));
    return;
  }
  if (same) {
    if (IMG.test(url.pathname)) {
      e.respondWith(match(url.pathname).then((hit) => hit || fetch(req).then((res) => put(url.pathname, res))));
    } else {
      e.respondWith(netFirst(req, url.pathname));
    }
    return;
  }
  if (/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))));
  }
});

// 여행 화면이 "이 파일들 저장해줘" 하고 보내는 목록
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'cache-urls' && Array.isArray(d.urls)) {
    e.waitUntil(caches.open(VERSION).then((c) => Promise.all(d.urls.filter((u) => typeof u === 'string' && u.startsWith('/')).map((u) =>
      fetch(u).then((res) => { if (res.ok) return c.put(new URL(u, location.origin).pathname, res); }).catch(() => {})))));
  }
});
