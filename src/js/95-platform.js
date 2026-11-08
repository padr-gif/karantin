// ================= площадки: Яндекс Игры (v85) =================
// Сборка `npm run yandex` (build.mjs --yandex) кладёт в страницу window.__PLAT = 'yandex' и скрипт SDK (/sdk.js).
// Вне площадки модуль ничего не делает: PLAT.sdk === null, кнопки рекламы скрыты.
//  • LoadingAPI.ready() — когда главное меню готово; GameplayAPI.start/stop — когда игра идёт / стоит;
//  • game_api_pause/resume от площадки — пауза и тишина;
//  • реклама за награду — сброс припасов с вертолёта, раз в игровые сутки (кнопка в паузе);
//  • межстраничная — при переходе в соседний район и на экране смерти, не чаще раза в 3 минуты (площадка ограничивает и сама);
//  • сохранения — в облаке игрока (player.setData) через ту же прослойку store.db, что и облако артефакта (19-saves):
//    список слотов, запасные копии и выбор свежего работают как есть.
// Всё общение с SDK — в этом файле: если API площадки поменяется, править только здесь.
const PLAT = {name:window.__PLAT || '', sdk:null, player:null, data:null, ad:false, wasPaused:false, lastFS:0, readySent:false, live:null};
const PLAT_FS_GAP = 180000;                                                    // межстраничная — не чаще раза в 3 минуты
const PLAT_DATA_MAX = 190000;                                                  // облако игрока небольшое: держим запас

if (PLAT.name) window.__regSW = null;                                          // в окне площадки свой кэш, service worker не нужен

// облако игрока как store.db: collection(...).doc(id) с get/set/delete. Все слоты — в одном объекте данных
function platDB() {
  const flush = () => {
    let s = JSON.stringify(PLAT.data);
    while (s.length > PLAT_DATA_MAX) {                                         // не влезло — из облака уходит самый старый слот (в браузере он остаётся)
      const ks = Object.keys(PLAT.data).filter(k => PLAT.data[k] && PLAT.data[k].meta).sort((a, b) => PLAT.data[a].meta.t - PLAT.data[b].meta.t);
      if (ks.length <= 1) break; delete PLAT.data[ks[0]]; s = JSON.stringify(PLAT.data);
    }
    if (s.length > PLAT_DATA_MAX) return Promise.reject(new Error('cloud-full'));
    return PLAT.player.setData(PLAT.data, true);
  };
  const doc = id => ({
    get: async () => { const v = PLAT.data[id]; return {exists:!!v, data:() => v}; },
    set: async v => { PLAT.data[id] = v; await flush(); },
    delete: async () => { delete PLAT.data[id]; await flush(); },
  });
  return {collection:() => ({doc})};
}

// пауза и тишина на время рекламы
function platAdPause(on) {
  if (on === PLAT.ad) return;
  PLAT.ad = on;
  if (on) { PLAT.wasPaused = paused; paused = true; atkHeld = false; joy.id = null; joy.x = joy.y = 0; try { SFX.mute(true); } catch (e) {} }
  else {
    if (!PLAT.wasPaused && !panel && $('pause').hidden && !traveling) paused = false;
    platSound();
  }
}
// звук молчит, пока вкладка скрыта, окно без фокуса или идёт реклама (требование площадки 1.3; полезно и на сайте)
let platFocus = true;
function platSound() { try { SFX.mute(document.hidden || !platFocus || PLAT.ad); } catch (e) {} }
document.addEventListener('visibilitychange', platSound);
addEventListener('blur', () => { platFocus = false; platSound(); });
addEventListener('focus', () => { platFocus = true; platSound(); });
addEventListener('pointerdown', () => { if (!platFocus) { platFocus = true; platSound(); } }, true);   // фрейм площадки не всегда шлёт focus
// долгое нажатие и правая кнопка нигде не открывают меню браузера (кроме полей ввода)
document.addEventListener('contextmenu', e => { if (!(e.target && e.target.closest && e.target.closest('input,textarea'))) e.preventDefault(); });

// реклама за награду; onReward вызывается, только если ролик досмотрен
PLAT.rewarded = function (onReward) {
  if (!PLAT.sdk || PLAT.ad) return false;
  let got = false;
  try {
    PLAT.sdk.adv.showRewardedVideo({callbacks:{
      onOpen: () => platAdPause(true),
      onRewarded: () => { got = true; },
      onClose: () => { platAdPause(false); if (got) onReward(); else toast('Ролик не досмотрен — награды нет'); },
      onError: () => { platAdPause(false); toast('Реклама сейчас недоступна, попробуй позже'); },
    }});
  } catch (e) { platAdPause(false); return false; }
  return true;
};
// межстраничная реклама в естественной паузе (переход, смерть)
PLAT.interstitial = function () {
  if (!PLAT.sdk || PLAT.ad || Date.now() - PLAT.lastFS < PLAT_FS_GAP) return;
  PLAT.lastFS = Date.now();
  try {
    PLAT.sdk.adv.showFullscreenAdv({callbacks:{
      onOpen: () => platAdPause(true),
      onClose: () => platAdPause(false),
      onError: () => platAdPause(false),
    }});
  } catch (e) { platAdPause(false); }
};

// ---- сброс припасов за рекламу: раз в игровые сутки, кнопка в паузе ----
const platDay = () => Math.floor(gameMin / 1440);
function platDropBtn() {
  const b = $('pDrop'); if (!b) return;
  const can = !!PLAT.sdk && mode === 'play' && world.adDay !== platDay();
  b.hidden = !PLAT.sdk; b.disabled = !can;
  b.textContent = can ? 'Сброс припасов — за рекламу' : 'Сброс припасов — завтра';
}
if ($('pDrop')) $('pDrop').addEventListener('click', () => {
  if (!PLAT.sdk || world.adDay === platDay()) return;
  PLAT.rewarded(() => {
    world.adDay = platDay();
    resume();
    if (typeof dropSupply === 'function') dropSupply();
    platDropBtn();
  });
});
onStartNew(null, () => { world.adDay = -1; });
onSave(d => { if (world.adDay >= 0) d.x95 = {ad:world.adDay}; });          // поле есть, только если реклама смотрелась: вне площадки сохранение прежнее
onLoad(null, d => { world.adDay = d && d.x95 && d.x95.ad != null ? d.x95.ad : -1; });

// ---- запуск SDK ----
if (PLAT.name === 'yandex') (async () => {
  for (let t = 0; t < 100 && !window.YaGames; t++) await new Promise(r => setTimeout(r, 100));   // скрипт SDK грузится асинхронно
  if (!window.YaGames) return;
  try {
    const sdk = await window.YaGames.init(); PLAT.sdk = sdk;
    try { sdk.on('game_api_pause', () => platAdPause(true)); sdk.on('game_api_resume', () => platAdPause(false)); } catch (e) {}
    try {
      const player = await sdk.getPlayer({scopes:false});
      const data = await player.getData();
      PLAT.player = player; PLAT.data = data && typeof data === 'object' ? data : {};
      store.db = platDB(); store.uid = 'yandex';
      if (mode === 'menu' && typeof refreshMenu === 'function') refreshMenu();
    } catch (e) {}
  } catch (e) { PLAT.sdk = null; }
})();
// готовность и «игра идёт / стоит» — раз в полсекунды по состоянию игры
setInterval(() => {
  const sdk = PLAT.sdk; if (!sdk) return;
  const F = sdk.features || {};
  if (!PLAT.readySent && $('mNew') && !$('mNew').disabled) { PLAT.readySent = true; try { F.LoadingAPI && F.LoadingAPI.ready(); } catch (e) {} }
  const live = mode === 'play' && !paused && !PLAT.ad && !document.hidden;
  if (live !== PLAT.live) { PLAT.live = live; try { F.GameplayAPI && (live ? F.GameplayAPI.start() : F.GameplayAPI.stop()); } catch (e) {} }
}, 500);

// Android-приложение (build.mjs --android, Capacitor): системная кнопка «Назад» спрашивает игру через window.__androidBack.
// true — игра обработала сама (закрыла панель, открыла/закрыла паузу, вернулась на экран назад);
// false — мы в главном меню и закрывать нечего: приложение сворачивается.
window.__androidBack = () => {
  const v = visibleScreen();
  if (!panel && (v === 'menu' || (!v && mode !== 'play'))) return false;
  dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
  return true;
};
