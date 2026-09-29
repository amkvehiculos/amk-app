/* AMK · service worker (2026-09-29): las apps (Sistema, Vendedores, Corea) abren aunque no haya internet.
   - Páginas de la app: primero internet (para tener siempre la última versión); sin internet, la última copia guardada.
   - Librerías de Firebase y tipografías: se guardan una vez y se usan desde el aparato.
   - Los datos (Firestore) NO pasan por aquí: los guarda el propio Firebase en el aparato y los sube al volver internet. */
const CACHE='amk-app-v1';
self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil((async()=>{ const ks=await caches.keys(); await Promise.all(ks.filter(k=>k.startsWith('amk-app-')&&k!==CACHE).map(k=>caches.delete(k))); await self.clients.claim(); })()); });
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url);
  const propia=u.origin===self.location.origin;
  const lib=(u.hostname==='www.gstatic.com'&&u.pathname.startsWith('/firebasejs/'))||u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com';
  if(propia){
    e.respondWith((async()=>{
      const c=await caches.open(CACHE);
      try{ const res=await fetch(r); if(res&&res.ok){ const k=new Request(u.origin+u.pathname); c.put(k,res.clone()); } return res; }
      catch(err){ const hit=await c.match(u.origin+u.pathname)||await c.match(r,{ignoreSearch:true}); if(hit) return hit; throw err; }
    })());
  }else if(lib){
    e.respondWith((async()=>{
      const c=await caches.open(CACHE); const hit=await c.match(r); if(hit) return hit;
      const res=await fetch(r); if(res&&(res.ok||res.type==='opaque')) c.put(r,res.clone()); return res;
    })());
  }
});
