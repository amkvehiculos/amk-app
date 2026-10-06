/* AMK · service worker (2026-09-29): las apps (Sistema, Vendedores, Corea) abren aunque no haya internet.
   - Páginas de la app: primero internet (para tener siempre la última versión); sin internet, o si tarda más de 3,5 s, la última copia guardada.
   - Librerías de Firebase y tipografías: se guardan una vez y se usan desde el aparato.
   - Los datos (Firestore) NO pasan por aquí: los guarda el propio Firebase en el aparato y los sube al volver internet. */
const CACHE='amk-app-v1';  // no cambiar el nombre: así no se pierde la copia ya guardada en los teléfonos
self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil((async()=>{ const ks=await caches.keys(); await Promise.all(ks.filter(k=>k.startsWith('amk-app-')&&k!==CACHE).map(k=>caches.delete(k))); await self.clients.claim(); })()); });
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url);
  const propia=u.origin===self.location.origin;
  const lib=(u.hostname==='www.gstatic.com'&&u.pathname.startsWith('/firebasejs/'))||u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com';
  if(propia){
    /* 06/10/2026: con señal mala (patio de Zofri, Corea) ya no se espera hasta que internet falle del todo:
       si en ESPERA ms no llegó la versión nueva, se abre la copia guardada. La descarga sigue por detrás y
       guarda la versión nueva, que se ve la próxima vez que se abra la app. */
    const ESPERA=3500;
    e.respondWith((async()=>{
      const c=await caches.open(CACHE);
      const red=fetch(r).then(res=>{ if(res&&res.ok){ const k=new Request(u.origin+u.pathname); return c.put(k,res.clone()).then(()=>res); } return res; });
      e.waitUntil(red.catch(()=>{}));
      const hit=await c.match(u.origin+u.pathname)||await c.match(r,{ignoreSearch:true});
      if(!hit) return red;
      const plazo=new Promise(ok=>setTimeout(()=>ok(null),ESPERA));
      try{ const res=await Promise.race([red,plazo]); return res||hit; }catch(err){ return hit; }
    })());
  }else if(lib){
    e.respondWith((async()=>{
      const c=await caches.open(CACHE); const hit=await c.match(r); if(hit) return hit;
      const res=await fetch(r); if(res&&(res.ok||res.type==='opaque')) c.put(r,res.clone()); return res;
    })());
  }
});
