// Service worker : les infos viennent toujours du réseau pour rester à jour.
// La page d'accueil est gardée en réserve pour que l'appli s'ouvre même sans connexion.
var CACHE='cloca-v13';
var SHELL=['./','index.html','app.js','confidentialite.html','manifest.webmanifest','icon-192.png','icon-512.png','logo.png'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL)}).catch(function(){}));
  self.skipWaiting();
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin){return}
  e.respondWith(fetch(r).then(function(res){
    var copy=res.clone();
    if(res.ok){caches.open(CACHE).then(function(c){c.put(r,copy)})}
    return res;
  }).catch(function(){
    return caches.match(r).then(function(m){return m||caches.match('index.html')});
  }));
});

// Notifications push (raquette prête, etc.)
self.addEventListener('push',function(e){
  var d={};try{d=e.data?e.data.json():{}}catch(x){d={title:'CLOCA Tennis',body:e.data?e.data.text():''}}
  e.waitUntil(self.registration.showNotification(d.title||'CLOCA Tennis',{
    body:d.body||'',icon:'/app/icon-192.png',badge:'/app/icon-192.png',tag:d.tag||undefined,data:{url:d.url||'/app/'}
  }));
});
self.addEventListener('notificationclick',function(e){
  e.notification.close();
  var url=(e.notification.data&&e.notification.data.url)||'/app/';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(l){
    for(var i=0;i<l.length;i++){if(l[i].url.indexOf('/app/')>=0&&'focus' in l[i]){l[i].navigate(url);return l[i].focus()}}
    return self.clients.openWindow(url);
  }));
});
