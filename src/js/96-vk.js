// ================= ВКонтакте: мини-приложение-игра =================
// Сборка сайта кладёт версию для ВК в site/vk/ (window.__PLAT = 'vk' и VK Bridge с CDN, см. build.mjs);
// в настройках мини-приложения её адрес: https://padr-gif.github.io/karantin/vk/
// Здесь — то же, что в 95-platform для Яндекса, только через VK Bridge:
//  • VKWebAppInit сразу после загрузки моста;
//  • реклама за награду (сброс припасов в паузе) и межстраничная (смерть, переход в район) — VKWebAppShowNativeAds;
//  • сохранения — в хранилище ВК (VKWebAppStorageSet/Get). Там значение не длиннее 4096 байт, поэтому
//    сохранение сжимается (deflate → base64) и режется на куски; список слотов с их мета — в ключе dl_i.
//    Все слоты читаются один раз при запуске и дальше лежат в памяти, как облако игрока у Яндекса.
// Без моста (открыли адрес напрямую, CDN недоступен) игра работает как сайт: сохранения в браузере, без рекламы.
if (PLAT.name === 'vk') {
  const VK_CHUNK = 3800, VK_AUTO_GAP = 120000;
  let B = null, idx = {}, lastAuto = 0;
  const send = (m, p) => B.send(m, p || {});
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  async function pack(str) {
    if (window.CompressionStream) {
      try { return 'z' + b64(new Uint8Array(await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer())); } catch (e) {}
    }
    return 'u' + encodeURIComponent(str);                                    // без сжатия: только ASCII, чтобы куски точно влезали
  }
  async function unpack(s) {
    if (s[0] === 'z') return await new Response(new Blob([unb64(s.slice(1))]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    if (s[0] === 'u') return decodeURIComponent(s.slice(1));
    return s;
  }
  async function getKeys(keys) {
    const out = {};
    for (let i = 0; i < keys.length; i += 10) {
      const r = await send('VKWebAppStorageGet', {keys:keys.slice(i, i + 10)});
      for (const kv of (r && r.keys) || []) out[kv.key] = kv.value;
    }
    return out;
  }
  const setKey = (key, value) => send('VKWebAppStorageSet', {key, value});
  const ck = (id, k) => 'dl_' + id.replace(/[^a-z0-9]/gi, '') + '_' + k;
  async function loadAll() {
    const r = await getKeys(['dl_i']);
    try { idx = JSON.parse(r.dl_i || '{}') || {}; } catch (e) { idx = {}; }
    const data = {};
    for (const id in idx) {
      try {
        const n = idx[id].n, keys = []; for (let k = 0; k < n; k++) keys.push(ck(id, k));
        const got = await getKeys(keys); let s = '';
        for (const k of keys) { if (got[k] == null) throw new Error('chunk'); s += got[k]; }
        data[id] = JSON.parse(await unpack(s));
      } catch (e) {}
    }
    return data;
  }
  function vkDB(data) {
    let chain = Promise.resolve();                                           // записи по очереди, чтобы куски двух сохранений не перемешались
    const write = (id, v) => chain = chain.then(async () => {
      const old = idx[id] ? idx[id].n : 0;
      if (v) {
        const s = await pack(JSON.stringify(v)), n = Math.ceil(s.length / VK_CHUNK);
        for (let k = 0; k < n; k++) await setKey(ck(id, k), s.slice(k * VK_CHUNK, (k + 1) * VK_CHUNK));
        for (let k = n; k < old; k++) await setKey(ck(id, k), '');
        idx[id] = {n, t:Date.now()};
      } else {
        for (let k = 0; k < old; k++) await setKey(ck(id, k), '');
        delete idx[id];
      }
      await setKey('dl_i', JSON.stringify(idx));
    });
    const doc = id => ({
      get: async () => { const v = data[id]; return {exists:!!v, data:() => v}; },
      set: async v => {
        data[id] = v;
        if (id === 'save-auto') { if (Date.now() - lastAuto < VK_AUTO_GAP) return; lastAuto = Date.now(); }   // автосейв в облако — не чаще раза в 2 минуты (в браузере — каждый раз)
        await write(id, v);
      },
      delete: async () => { delete data[id]; await write(id, null); },
    });
    return {collection:() => ({doc})};
  }

  const preload = () => { for (const f of ['interstitial', 'reward']) send('VKWebAppCheckNativeAds', {ad_format:f}).catch(() => {}); };
  PLAT.rewarded = function (onReward) {
    if (!B || PLAT.ad) return false;
    platAdPause(true);
    send('VKWebAppShowNativeAds', {ad_format:'reward'})
      .then(d => { platAdPause(false); if (d && d.result) onReward(); else toast('Ролик не досмотрен — награды нет'); })
      .catch(() => { platAdPause(false); toast('Реклама сейчас недоступна, попробуй позже'); })
      .finally(preload);
    return true;
  };
  PLAT.interstitial = function () {
    if (!B || PLAT.ad || Date.now() - PLAT.lastFS < PLAT_FS_GAP) return;
    PLAT.lastFS = Date.now();
    platAdPause(true);
    send('VKWebAppShowNativeAds', {ad_format:'interstitial'}).catch(() => {}).finally(() => { platAdPause(false); preload(); });
  };

  (async () => {
    for (let t = 0; t < 100 && !window.vkBridge; t++) await new Promise(r => setTimeout(r, 100));
    if (!window.vkBridge) return;
    B = window.vkBridge;
    try { await send('VKWebAppInit'); } catch (e) {}
    document.documentElement.classList.add('plat-vk');
    try {
      B.subscribe(e => {
        const t = e && e.detail && e.detail.type;
        if (t === 'VKWebAppViewHide') { platFocus = false; platSound(); }
        else if (t === 'VKWebAppViewRestore') { platFocus = true; platSound(); }
      });
    } catch (e) {}
    PLAT.sdk = {vk:true, features:{}};                                       // кнопка рекламы в паузе видна только с мостом
    preload();
    try { const data = await loadAll(); store.db = vkDB(data); store.uid = 'vk'; } catch (e) {}
    if (mode === 'menu' && typeof refreshMenu === 'function') refreshMenu();
    if (typeof platDropBtn === 'function') platDropBtn();
  })();
}
