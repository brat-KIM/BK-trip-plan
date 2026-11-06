const CACHE='sapporo-20261014214732';
const CORE=["/", "/app.css", "/app2.css", "/app.js", "/pb1.js", "/pb2.js", "/pb3.js", "/parts/home.html", "/parts/day1.html", "/parts/day2.html", "/parts/day3.html", "/parts/day4.html", "/parts/eat1.html", "/parts/eat2.html", "/parts/eat3.html", "/parts/eat4.html", "/parts/eat5.html", "/parts/eat6.html", "/parts/eat7.html", "/parts/eat8.html", "/parts/eat9.html", "/parts/eat10.html", "/parts/eat11.html", "/parts/wish1.html", "/parts/wish2.html", "/parts/wish3.html", "/parts/talk.html", "/parts/shoot1.html", "/parts/shoot2.html", "/parts/shoot3.html", "/parts/shoot4.html", "/parts/shoot5.html", "/parts/shoot6.html", "/parts/more.html", "/parts/stay.html", "/parts/todo.html", "/parts/pack.html", "/parts/car.html", "/parts/taxi.html", "/parts/money.html", "/parts/sos.html", "/manifest.webmanifest", "/icon-192.png", "/icon.svg"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url);
  const same=u.origin===location.origin;
  if(r.mode==='navigate'||(same&&!/\.(png)$/.test(u.pathname))){
    e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r.mode==='navigate'?'/':r,cp));}return res;}).catch(()=>caches.match(r.mode==='navigate'?'/':r,{ignoreSearch:true})));
    return;
  }
  if(same||/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){
    e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}return res;})));
  }
});
