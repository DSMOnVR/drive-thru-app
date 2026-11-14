const CACHE='dsmd-v25';
const ASSETS=['./','./index.html','./menu.html','./register.html','./drive-thru.html','./phone.html','./phone-call.html','./maps.html','./delivery.html','./admin.html','./cash.html','./dsmdonalds.html','./css/styles.css','./js/app.js','./manifest.webmanifest','./assets/icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin){ return; }
  e.respondWith(caches.match(e.request).then(r=>r || fetch(e.request).then(res=>{const copy=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); return res;}).catch(()=>caches.match('./index.html'))));
});
