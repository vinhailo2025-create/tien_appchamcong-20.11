const CACHE_NAME = 'np-one-hr-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/v2-shell.css',
  '/v2-dashboard.css',
  '/v2-tables.css',
  '/v2-mobile.css',
  '/seed.js',
  '/app.js',
  '/manifest.json',
  '/assets/logo-np-one-3d.png',
  '/assets/logo-np-one-flat.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
