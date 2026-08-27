// Belhandar Partner - Basit service worker
// NOT: CACHE_NAME her onemli guncellemede degistirilmelidir; boylece eski
// cache otomatik temizlenir ve kullanicilar guncel dosyalari gorur.
const CACHE_NAME = 'belhandar-partner-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
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

// NETWORK-FIRST: once internetten guncel dosyayi almayi dener; sadece offline
// durumda (network hatasi) cache'e duser. Boylece yeni deploy edilen JS/CSS
// dosyalari her zaman gorulur, kullanicilar eski surumde takili kalmaz.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
