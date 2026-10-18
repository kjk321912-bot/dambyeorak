// 앱 파일을 고치면 VERSION을 올려야 설치된 기기에 새 버전이 반영된다.
const VERSION = 'v3';
const CORE = ['./', 'index.html', 'style.css', 'app.js', 'firebase-config.js', 'backend.js', 'templates.js', 'mock-firebase.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// 같은 출처의 앱 파일만 캐시한다. Firebase 통신은 건드리지 않는다.
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request).then((m) => m || caches.match('index.html'))));
});
