const CACHE_NAME = 'v1_cache_app';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/scripts/main.js',
  '/icon-192.png'
];

// Instalación del Service Worker y almacenamiento en caché de activos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Estrategia de respuesta: primero busca en caché, luego en red
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request)
      .then(res => {
        if (res) return res;
        return fetch(e.request);
      })
  );
});