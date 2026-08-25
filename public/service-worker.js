const CACHE_NAME = 'aayoj-shell-v3';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/aayoj-icon.png',
  '/icons/aayoj-icon-192.png',
  '/icons/aayoj-icon-512.png',
  '/icons/aayoj-icon-maskable-192.png',
  '/icons/aayoj-icon-maskable-512.png',
  '/icons/aayoj-apple-touch-icon.png',
];
const CACHEABLE_DESTINATIONS = new Set(['font', 'image', 'script', 'style']);
const PRIVATE_PATH_PREFIXES = ['/api/', '/auth/', '/oauth/'];

function isCacheableStaticRequest(request) {
  const url = new URL(request.url);
  return url.origin === self.location.origin
    && CACHEABLE_DESTINATIONS.has(request.destination)
    && !PRIVATE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html')),
    );
    return;
  }
  if (!isCacheableStaticRequest(event.request)) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    })),
  );
});
