// sw.js — Service Worker: كاش للواجهة + عمل دون اتصال.
const CACHE_NAME = 'waez-yusufiya-v8';
const APP_SHELL = [
  './', './index.html', './manifest.json', './icon.svg', './logo-192.png',
  './js/config.js', './js/icons.js', './js/utils.js', './js/auth.js', './js/router.js',
  './js/requests.js', './js/community.js', './js/filters.js', './js/map.js',
  './js/shops.js', './js/shop-modal.js', './js/owner.js', './js/admin.js',
  './js/notifications.js', './js/actions.js', './js/main.js',
];
// مكتبات CDN بإصدارات مثبّتة (لا تتغير) → كاش أولاً.
const CDN_HOSTS = ['unpkg.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // مكتبات CDN: كاش أولاً، ثم الشبكة.
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
        }
        return res;
      }))
    );
    return;
  }

  // لا نخزّن استجابات Supabase أو الخرائط أو أي بيانات خاصة بالمستخدم.
  if (url.origin !== self.location.origin) return;

  // صفحات التنقل: الشبكة أولاً، ثم النسخة المخزّنة دون اتصال.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }

  // ملفات التطبيق: stale-while-revalidate (سريع + يتحدّث بالخلفية).
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
