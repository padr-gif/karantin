// Работа без интернета и быстрый повторный запуск.
// Спрайты и шрифты лежат в art/ с хэшем в имени: файл с таким именем никогда не меняется, поэтому он берётся
// из кэша без запроса в сеть. При обновлении игры заново качаются только листы, которые правда поменялись.
// Страница игры берётся из сети (чтобы обновления приходили сразу), но если сеть не ответила за 4 секунды,
// игра стартует из кэша, а свежая страница докачивается в фоне к следующему запуску.
const CACHE = 'karantin-0.54.0-mvmgorp8';
const ASSETS = ["./art/obj.eb9bead3db.webp", "./art/obj2.e2c663972f.webp", "./art/furn2.7897b9b435.webp", "./art/furn3.54044109c2.webp", "./art/tiles3.6cacc42fc9.webp", "./art/pchar_m.725c14d518.webp", "./art/pchar_mr.2b9aecd8f9.webp", "./art/pchar_mfr.1a2453229c.webp", "./art/pchar_mf.fee987bd84.webp", "./art/pchar_mtr.24a5ce05cc.webp", "./art/pchar_mt.d19eca3091.webp", "./art/pchar_f.d02c6c98f6.webp", "./art/zchar_m.1723355ab7.webp", "./art/zchar_f.da3d3c657a.webp", "./art/zchar_h.197c88bd00.webp", "./art/pchar_mx.3709836d81.webp", "./art/pchar_mxr.0817f4819b.webp", "./art/pchar_mfxr.99756b9f11.webp", "./art/pchar_mfx.81f46ebe16.webp", "./art/pchar_mtxr.6014826bb0.webp", "./art/pchar_mtx.baec666a28.webp", "./art/pchar_fx.ffdce9f746.webp", "./art/icons.2419bba4ed.webp", "./art/oswald-500.2ba2b4468e.woff", "./art/oswald-700.21f9d47599.woff", "./art/ptsans-400.cb62735e16.woff", "./art/ptsans-700.36684b7cb3.woff", "./art/ptmono-400.b60befc0e2.woff"];
const FILES = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png', './apple-touch-icon.png'];
const fromAnyCache = url => caches.match(url).then(hit => hit || fetch(url, {cache: 'force-cache'}));
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all([
    c.addAll(FILES),
    // листы из прошлой версии переезжают в новый кэш без скачивания; новые берутся из кэша браузера, если страница их уже загрузила
    ...ASSETS.map(a => fromAnyCache(a).then(res => { if (!res.ok) throw new Error(a); return c.put(a, res); })),
  ])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const url = new URL(r.url);
  if (url.origin !== location.origin) {   // чужие файлы: из кэша, если уже скачаны
    e.respondWith(caches.open(CACHE).then(c => c.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit))));
    return;
  }
  if (r.mode === 'navigate') {
    const net = fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); } return res; });
    e.waitUntil(net.catch(() => {}));
    e.respondWith(caches.match('./index.html').then(cached => {
      if (!cached) return net;
      const slow = new Promise(res => setTimeout(() => res(cached), 4000));
      return Promise.race([net.catch(() => cached), slow]);
    }));
    return;
  }
  if (url.pathname.includes('/art/')) {   // файлы с хэшем: из кэша, а если их там нет, скачать и запомнить
    e.respondWith(caches.open(CACHE).then(c => c.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }))));
    return;
  }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r)));
});
