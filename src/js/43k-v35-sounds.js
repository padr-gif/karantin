// ================= v35: настоящие звуки (Kenney, CC0): шаги по поверхностям, двери, обыск, открыть/закрыть мебель =================
// Записи лежат в SND_EMBED (build.mjs встраивает assets/sounds/*.mp3). Пока они не загрузились — играет старый синтез.
const SMP = {}, SMP_LAST = {};
let smpLoad = false;
function loadSamples() {
  const ac = SFX.ac; if (smpLoad || !ac || typeof SND_EMBED === 'undefined') return; smpLoad = true;
  for (const k in SND_EMBED) {
    fetch(SND_EMBED[k]).then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no))).then(buf => { SMP[k] = buf; }).catch(() => {});
  }
}
const init35 = SFX.init;
SFX.init = function () { init35(); loadSamples(); };
// один случайный вариант из группы (не повторяя прошлый)
function smpPick(g) {
  const keys = Object.keys(SMP).filter(k => k.startsWith(g + '_')); if (!keys.length) return null;
  let k = keys[Math.floor(Math.random() * keys.length)];
  if (keys.length > 1 && k === SMP_LAST[g]) k = keys[(keys.indexOf(k) + 1) % keys.length];
  SMP_LAST[g] = k; return SMP[k];
}
function smp(g, v, rate, delay, lp) {
  const ac = SFX.ac, b = smpPick(g); if (!ac || !b || !SFX.out) return false;
  const s = ac.createBufferSource(); s.buffer = b; s.playbackRate.value = (rate || 1) * (.94 + Math.random() * .12);
  const gn = ac.createGain(); gn.gain.value = v * (SMP_GAIN[g] || 1) * SFX.vol();
  let node = s;
  if (lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; s.connect(f); node = f; }
  node.connect(gn); gn.connect(SFX.out); s.start(ac.currentTime + (delay || 0));
  return true;
}
const SMP_GAIN = {soft:.5, step_bare:1.2};   // выравниваем громкость записей

// ---- шаги: по чему идёшь ----
function surfaceAt(x, y) {
  const tx = Math.floor(x), ty = Math.floor(y), i = ty * MW + tx, t = map[i];
  const snowy = (world.snow || 0) > .4;
  if (!insideHouse(x, y)) return t === GRASS || t === TREE ? (snowy ? 'snow' : 'grass') : snowy && t !== FLOOR ? 'snow' : 'concrete';
  if (P && !(P.cloth && P.cloth.feet)) return 'bare';                            // босиком по дому — шлёп-шлёп
  const h = hAt[i], Hs = h ? houses[h - 1] : null;
  if (!Hs || COMM.has(Hs.kind) || Hs.kind === 'shed') return 'tile';
  if (Hs.rugs && Hs.rugs.some(r => x > r[0] && x < r[2] && y > r[1] && y < r[3])) return 'carpet';
  const r = Hs.rooms && Hs.rooms.find(r => tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1);
  if (!r) return 'wood';
  if (r.type === 'kitchen' || r.type === 'bath') return 'tile';
  return r.carpet != null ? 'carpet' : 'wood';
}
const STEP_V = {wood:.3, carpet:.3, tile:.3, concrete:.3, grass:.32, snow:.26, bare:.3};
const step35 = SFX.step;
SFX.step = function (inside, run) {
  if (!P) return step35(inside, run);
  const s = surfaceAt(P.x, P.y), k = (run ? 1.3 : .8) * (P.sneak ? .45 : 1) * Math.min(1.3, Math.max(.6, stepNoiseK()));
  if (!smp('step_' + s, STEP_V[s] * k, run ? 1.06 : 1)) step35(inside, run);
};

// ---- двери, окна, машина ----
const door35 = SFX.door;
SFX.door = function (open) { if (!smp(open ? 'door_open' : 'door_close', .55)) door35(open); };
SFX.window = function (open) { if (!smp(open ? 'window_open' : 'window_close', .45)) SFX.wood(); };
SFX.carDoor = function (open) { if (!smp(open ? 'cardoor_open' : 'cardoor_close', .55)) door35(open); };

// ---- вещи: взять, переложить, надеть ----
const rustle35 = SFX.rustle;
SFX.rustle = function () { if (!SFX.ok('rustle35', 120)) return; if (!smp(Math.random() < .6 ? 'handle' : 'cloth', .3)) rustle35(); };
SFX.pickup = function () { if (!smp('handle', .32)) rustle35(); };
const equip35 = SFX.equip;
SFX.equip = function () { if (!smp('cloth', .35)) equip35(); };

// ---- мебель: открыть и закрыть по материалу ----
const CMAT = {
  cab:['wardrobe', 'cabinet', 'shelf', 'bookshelf', 'hanger', 'shoerack', 'pantry', 'medcab', 'counter'],
  chest:['chest', 'stash', 'crate', 'boxes'],
  drawer:['dresser', 'nightstand', 'desk', 'wdesk', 'endtable', 'coffeetab', 'table', 'tv'],
  locker:['locker', 'toolrack', 'medshelf', 'mail', 'washer', 'stove', 'gen', 'radiator', 'towels', 'sink', 'bsink'],
  safe:['armybox', 'airdrop'],
  fridge:['fridge'], car:['car'],
  soft:['bed', 'sofa', 'armchair', 'laundry', 'bin', 'kbin', 'pile', 'bath', 'toilet', 'plant', 'chair', 'floorlamp', 'mirror'],
};
const MAT_OF = {}; for (const m in CMAT) for (const t of CMAT[m]) MAT_OF[t] = m;
SFX.contOpen = function (type) {
  const m = MAT_OF[type] || 'soft';
  if (m === 'cab') smp('door_open', .32, 1.3);                                   // дверца шкафа — та же дверь, только меньше
  else if (m === 'chest') smp('chest_open', .45);
  else if (m === 'drawer') smp('door_close', .22, 1.6);                        // ящик: короткий деревянный стук, без «жужжания»
  else if (m === 'locker') smp('mdoor_open', .32, 1.35);
  else if (m === 'safe') smp('safe_open', .45);
  else if (m === 'fridge') smp('soft', .3, 1.4);
  else if (m === 'car') smp('trunk_open', .45);
  else smp('cloth', .3);
};
SFX.contClose = function (type) {
  const m = MAT_OF[type] || 'soft';
  if (m === 'cab') smp('door_close', .35, 1.3);
  else if (m === 'chest') smp('chest_close', .45);
  else if (m === 'drawer') smp('door_close', .3, 1.45);
  else if (m === 'locker') smp('safe_close', .3, 1.3);
  else if (m === 'safe') smp('safe_close', .45);
  else if (m === 'fridge') smp('soft', .45, .9);
  else if (m === 'car') smp('trunk_close', .5);
  else smp('cloth', .22, .9);
};
// обыск: пока шарит — шорох вещей, бумага, звяк
SFX.rummage = function (type) {
  const m = MAT_OF[type] || 'soft';
  smp('cloth', .3, 1, .05); smp('handle', .2, 1, .3);
  if (Math.random() < .35) smp('paper', .18, 1.1, .2);
};

// открываем/закрываем вместе с окном обыска; обыск начинается с открытия
let sndOpened = null;                                                             // [мебель, время] — чтобы не открыть дважды
const doAction35 = doAction;
doAction = function (a0) {
  const was = P && P.act;
  doAction35(a0);
  const A = P && P.act;
  if (A && A !== was && A.kind === 'search' && A.f) { SFX.contOpen(A.f.type); SFX.rummage(A.f.type); sndOpened = [A.f, performance.now()]; }
};
const openPanel35 = openPanel;
openPanel = function (kind, opt) {
  const was = panel && panel.kind === 'loot' ? panel.src : null;
  openPanel35(kind, opt);
  const src = panel && panel.kind === 'loot' && panel.src;
  if (src && src !== was && src.type && src.type !== 'pile' && !(sndOpened && sndOpened[0] === src && performance.now() - sndOpened[1] < 4000)) SFX.contOpen(src.type);
};
const closePanel35 = closePanel;
closePanel = function () {
  const src = panel && panel.kind === 'loot' && panel.src;
  closePanel35();
  if (src && src.type && src.type !== 'pile') SFX.contClose(src.type);
};
