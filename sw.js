// Service worker minimal : rend l'appli installable, sans mettre de pages en cache
// (les infos affichées sont toujours à jour).
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){
  e.respondWith(fetch(e.request));
});
