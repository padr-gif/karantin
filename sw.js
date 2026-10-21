// Работа без интернета и быстрый повторный запуск.
// Спрайты и шрифты лежат в art/ с хэшем в имени: файл с таким именем никогда не меняется, поэтому он берётся
// из кэша без запроса в сеть. При обновлении игры заново качаются только листы, которые правда поменялись.
// Страница игры берётся из сети (чтобы обновления приходили сразу), но если сеть не ответила за 4 секунды,
// игра стартует из кэша, а свежая страница докачивается в фоне к следующему запуску.
const CACHE = 'karantin-0.43.0-mvijb6r5';
const ASSETS = ["./art/obj.eb9bead3db.webp", "./art/obj2.e2c663972f.webp", "./art/furn2.01b07d7cf2.webp", "./art/pchar_m.4e06485d7c.webp", "./art/pchar_f.9ff1a79552.webp", "./art/zchar_m.cb985ba9cb.webp", "./art/zchar_f.c76fb0e28f.webp", "./art/zchar_h.39b85861e5.webp", "./art/pchar_mx.18385ecd89.webp", "./art/pchar_fx.f9ffd7fbb8.webp", "./art/icons.e03a5e59f0.webp", "./art/oswald-500.2ba2b4468e.woff", "./art/oswald-700.21f9d47599.woff", "./art/ptsans-400.cb62735e16.woff", "./art/ptsans-700.36684b7cb3.woff", "./art/ptmono-400.b60befc0e2.woff"];
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
