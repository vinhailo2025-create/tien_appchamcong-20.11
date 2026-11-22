const CACHE_NAME = 'np-one-hr-v6';
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
  '/v2-workspace.js',
  '/v2-workspace.css',
  '/manifest.json',
  '/assets/np-app-icon.png',
  '/assets/np-mark.png',
  '/assets/np-construction.webp'
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
