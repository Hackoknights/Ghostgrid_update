const CACHE_NAME = 'ghostgrid-chrono-rescue-v5';
const SHELL_URL = './index.html';
const PRECACHE = [
  './',
  './index.html',
  './ghostgrid-manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './ghostgrid-sw.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Best-effort: don't fail install if one asset 404s (e.g. icons not deployed yet).
    await Promise.all(PRECACHE.map(url => cache.add(url).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const requestUrl = new URL(event.request.url);
    const isLocalApp = requestUrl.origin === self.location.origin;
    const cachedFirst = isLocalApp && (event.request.mode === 'navigate' || /\.(html|js|json|css|png|svg|webp|ico)$/i.test(requestUrl.pathname));
    if (cachedFirst) {
      const cachedFirstResponse = await cache.match(event.request);
      if (cachedFirstResponse) return cachedFirstResponse;
    }
    try {
      const response = await fetch(event.request);
      if (response.ok && isLocalApp) {
        cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        const shell = await cache.match(SHELL_URL);
        if (shell) return shell;
      }
      return new Response('GhostGrid is offline and this resource is not cached yet.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
  })());
});
