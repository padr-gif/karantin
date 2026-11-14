// Работа без интернета и быстрый повторный запуск.
// Спрайты и шрифты лежат в art/ с хэшем в имени: файл с таким именем никогда не меняется, поэтому он берётся
// из кэша без запроса в сеть. При обновлении игры заново качаются только листы, которые правда поменялись.
// Страница игры берётся из сети (чтобы обновления приходили сразу), но если сеть не ответила за 4 секунды,
// игра стартует из кэша, а свежая страница докачивается в фоне к следующему запуску.
const CACHE = 'karantin-@@VERSION@@';
// Листы спрайтов лежат в ОДНОМ общем кэше на все версии. Раньше каждое обновление игры заводило новый кэш и разом
// переписывало в него все листы (десятки мегабайт, ~70 файлов одновременно) — прямо во время игры. На iPhone, когда
// игра запущена с иконки, такая запись может намертво остановить страницу. Теперь при обновлении ставится только
// сама страница и значки; листы докладываются по одному, с паузами, а нужные прямо сейчас берутся по запросу.
const ART = 'karantin-art';
const ASSETS = [/*@@ASSETS@@*/];
const FILES = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png', './apple-touch-icon.png'];
const pause = ms => new Promise(r => setTimeout(r, ms));
// страница сообщает, идёт ли сейчас игра: листы докладываются только в меню, на паузе и в свёрнутой игре
let idle = false;
self.addEventListener('message', e => { const d = e.data; if (d && d.t === 'idle') idle = !!d.v; });
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
// листы: что уже есть в старых кэшах — переложить (по одному), остального дождаться из сети; потом убрать старые кэши и лишние листы
async function tidy() {
  const art = await caches.open(ART);
  for (const a of ASSETS) {
    try {
      for (let w = 0; !idle && w < 600; w++) await pause(1000);                  // во время игры диск не трогаем
      if (await art.match(a)) continue;
      const res = (await caches.match(a)) || await fetch(a, {cache: 'force-cache'});
      if (res && res.ok) await art.put(a, res);
    } catch (err) {}
    await pause(250);
  }
  for (const k of await caches.keys()) if (k !== CACHE && k !== ART) await caches.delete(k);
  const want = new Set(ASSETS.map(a => new URL(a, self.registration.scope).href));
  for (const rq of await art.keys()) if (!want.has(rq.url)) await art.delete(rq);
}
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); tidy().catch(() => {}); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const url = new URL(r.url);
  if (url.origin !== location.origin) {   // чужие файлы: из кэша, если уже скачаны
    e.respondWith(caches.open(CACHE).then(c => c.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit))));
    return;
  }
  if (url.pathname.includes('/vk/')) return;   // версия для ВКонтакте живёт сама по себе, офлайн-кэш сайта её не трогает
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
  if (url.pathname.includes('/art/')) {   // файлы с хэшем: из общего кэша листов; нет — из старого кэша или сети, и запомнить
    e.respondWith(caches.open(ART).then(c => c.match(r).then(hit => hit || caches.match(r).then(old => old || fetch(r)).then(res => { if (res.ok) c.put(r, res.clone()); return res; }))));
    return;
  }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r)));
});
