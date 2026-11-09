/* CarMsg service worker: app shell + offline support.
   Bump CACHE_VERSION whenever the static assets change. */
const CACHE_VERSION = 'carmsg-v10';
const APP_SHELL = [
  './',
  './index.html',
  './view.html',
  './assets/css/base.css',
  './assets/css/index.css',
  './assets/css/view.css',
  './assets/js/theme.js',
  './assets/js/qrcode.js',
  './assets/js/plate-data.js',
  './assets/js/libphonenumber.js',
  './assets/js/countries.js',
  './assets/js/i18n.js',
  './assets/js/common.js',
  './assets/js/qr-render.js',
  './assets/js/country-picker.js',
  './assets/js/app.js',
  './assets/js/view.js',
  './assets/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /* Page navigations: network first, cached shell when offline. */
  if (request.mode === 'navigate') {
    const isView = url.pathname.endsWith('/view.html');
    event.respondWith(
      fetch(request)
        .then((response) => {
          /* Never store contact URLs (legacy query-string links) in the cache. */
          if (!isView && response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => {
          if (cached) return cached;
          return caches.match(isView ? './view.html' : './index.html');
        }))
    );
    return;
  }

  /* Static assets: serve from cache instantly, refresh in the background. */
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
