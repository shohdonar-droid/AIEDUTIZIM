// Clean pass-through service worker to clear caches and prevent aggressive route hijacking
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Pass-through: Let the browser pull fresh static assets and HTML normally
});

