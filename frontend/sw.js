// Belhandar Partner - Basit service worker (Asama 10'da genisletilecek)
const CACHE_NAME = 'belhandar-partner-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/api.js',
  './js/auth.js',
  './js/toast.js',
  './js/layout.js',
  './js/router.js',
  './js/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// Sadece GET + ayni origin isteklerini cache'ler; API cagrilari (farkli origin/backend)
// her zaman network'ten gider, boylece veriler asla eskimis gosterilmez.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});
