const CACHE_NAME = 'waez-yusufiya-v7';
const APP_SHELL = [
  './', './index.html', './manifest.json',
  './js/config.js', './js/icons.js', './icon.svg', './js/utils.js', './js/auth.js', './js/router.js',
  './js/requests.js', './js/community.js', './js/filters.js', './js/map.js',
  './js/shops.js', './js/shop-modal.js', './js/owner.js', './js/admin.js',
  './js/notifications.js', './js/main.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => Promise.resolve())
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // لا نخزن استجابات Supabase أو أي بيانات خاصة بالمستخدم.
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
