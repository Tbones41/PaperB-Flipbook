// Paper B service worker — caches everything for offline use
const CACHE = 'paperb-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './days.json',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(ASSETS).catch((err) => console.warn('SW cache partial:', err))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Cache-first for assets, network fallback, then cached opaque for fonts
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          // Cache a clone of font/asset responses (including cross-origin opaque)
          const clone = resp.clone();
          if (req.url.startsWith('http')) {
            caches.open(CACHE).then((cache) => cache.put(req, clone));
          }
          return resp;
        })
        .catch(() => cached);
    })
  );
});
