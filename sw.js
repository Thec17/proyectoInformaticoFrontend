const CACHE_NAME = 'v3_cache_app';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/scripts/main.js',
  '/icon-192.png'
];

// 1. INSTALACIÓN
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. ACTIVACIÓN: limpieza de cachés viejos
self.addEventListener('activate', e => {
  const cacheWhitelist = [CACHE_NAME];
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Si el nombre del caché guardado no es el actual, se borra
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Borrando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Toma el control de las pestañas abiertas de inmediato
  );
});

// 3. FETCH: Estrategia "Cache First"
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request)
      .then(res => {
        if (res) return res;
        return fetch(e.request);
      })
  );
});
