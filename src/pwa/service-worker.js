/* global self, caches, fetch, Request, Response, URL, __CACHE_NAME__, __ASSETS__, __OFFLINE_URL__ */
/* Built from the public inventory. No runtime data is written to caches. */
const CACHE_NAME = __CACHE_NAME__;
const ASSETS = __ASSETS__;
const OFFLINE_URL = __OFFLINE_URL__;
const paths = new Set(ASSETS);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      for (const path of ASSETS) {
        const response = await fetch(new Request(path, { cache: 'reload', credentials: 'omit' }));
        if (!response.ok || response.redirected || /private|no-store/i.test(response.headers.get('cache-control') || '')) throw new Error('Public asset unavailable');
        const mime = response.headers.get('content-type') || '';
        if ((path.endsWith('.html') && !mime.includes('text/html')) || (path.endsWith('.js') && !/javascript/.test(mime)) || (path.endsWith('.css') && !mime.includes('text/css')) || (path.startsWith('/assets/') && mime.includes('text/html'))) throw new Error('Public asset type mismatch');
        await cache.put(path, response);
      }
    } catch (error) { await caches.delete(CACHE_NAME); throw error; }
    // Updates wait for user acceptance or for older clients to close.
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith('prism-public-') && name !== CACHE_NAME) await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('authorization')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(new Request(request, { cache: 'no-store' })).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return await cache.match(OFFLINE_URL) || new Response('Offline / Luar talian', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
    }));
  } else if (!url.search && paths.has(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      return await cache.match(url.pathname) || fetch(request);
    })());
  }
  // Auth, APIs, exports, search, cross-origin requests and all writes bypass us.
});
