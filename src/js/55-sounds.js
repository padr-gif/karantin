// ================= настоящие звуки (Kenney, CC0): шаги по поверхностям, двери, обыск, открыть/закрыть мебель =================
// Записи лежат в SND_EMBED (build.mjs встраивает assets/sounds/*.mp3). Пока они не загрузились — играет старый синтез.
// синтез из 22-sound — запасной звук, пока записи не загрузились (и если их нет); ниже SFX.* играют записи
const SYN = {init:SFX.init, step:SFX.step, door:SFX.door, rustle:SFX.rustle, equip:SFX.equip, moan:SFX.moan, growl:SFX.growl, shriek:SFX.shriek, bite:SFX.bite, splat:SFX.splat, scream:SFX.scream, glass:SFX.glass, knock:SFX.knock, wood:SFX.wood, carAlarm:SFX.carAlarm};
const SMP = {}, SMP_LAST = {};
let smpLoad = false;
function loadSamples() {
  const ac = SFX.ac; if (smpLoad || !ac || typeof SND_EMBED === 'undefined') return; smpLoad = true;
  for (const k in SND_EMBED) {
    fetch(SND_EMBED[k]).then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no))).then(buf => { SMP[k] = buf; }).catch(() => {});
  }
}
SFX.init = function () { SYN.init(); loadSamples(); };
// один случайный вариант из группы (не повторяя прошлый)
function smpPick(g) {
  const keys = Object.keys(SMP).filter(k => k.startsWith(g + '_')); if (!keys.length) return null;
  let k = keys[Math.floor(Math.random() * keys.length)];
  if (keys.length > 1 && k === SMP_LAST[g]) k = keys[(keys.indexOf(k) + 1) % keys.length];
  SMP_LAST[g] = k; return SMP[k];
}
// ---- мягкий приглушённый звук: общая шина записей ----
// срез верхов (как сквозь стены и одежду), мягкое начало и затухание каждого звука, лёгкая «комната» для хвоста;
// дома глуше и гулче, на улице чуть звонче — переход между ними плавный
let BUS = null;
function makeIR(ac, sec) {
  const n = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let y = 0; for (let i = 0; i < n; i++) { y = y * .82 + (Math.random() * 2 - 1) * .18; d[i] = y * Math.pow(1 - i / n, 5); } }
  return b;
}
function bus() {
  const ac = SFX.ac; if (!ac || !SFX.out) return null; if (BUS) return BUS;
  const inp = ac.createGain(), hp = ac.createBiquadFilter(), shelf = ac.createBiquadFilter(), lp = ac.createBiquadFilter(), dry = ac.createGain(), conv = ac.createConvolver(), wet = ac.createGain();
  hp.type = 'highpass'; hp.frequency.value = 70;
  shelf.type = 'highshelf'; shelf.frequency.value = 1500; shelf.gain.value = -6;
  lp.type = 'lowpass'; lp.frequency.value = 2800; lp.Q.value = .4;
  dry.gain.value = 1; wet.gain.value = .05;
  inp.connect(hp); hp.connect(shelf); shelf.connect(lp); lp.connect(dry); dry.connect(SFX.out);
  if (!LOW_AUDIO) { conv.buffer = makeIR(ac, .45); lp.connect(conv); conv.connect(wet); wet.connect(SFX.out); }   // «комната» (свёртка) — дорогая; на Android без неё, её почти не слышно
  return (BUS = {inp, lp, wet, inside:null});
}
function busPlace() {                                                             // дом / улица — плавно, за полсекунды
  const B = bus(); if (!B || !P) return; const ins = insideHouse(P.x, P.y); if (ins === B.inside) return; B.inside = ins;
  const t = SFX.ac.currentTime; B.lp.frequency.setTargetAtTime(ins ? 2300 : 3200, t, .25); B.wet.gain.setTargetAtTime(ins ? .06 : .015, t, .25);
}
function smp(g, v, rate, delay, lp) {
  const ac = SFX.ac, b = smpPick(g), B = bus(); if (!ac || !b || !B || ACTIVE_SND >= MAX_SND) return false;
  busPlace();
  const s = ac.createBufferSource(); s.buffer = b; const r = (rate || 1) * (.94 + Math.random() * .12); s.playbackRate.value = r;
  const gn = ac.createGain(), t = ac.currentTime + (delay || 0), dur = b.duration / r, peak = v * .78 * (SMP_GAIN[g] || 1) * SFX.vol();
  gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(peak, t + .014);                 // мягкое начало, без щелчка
  gn.gain.setTargetAtTime(0, t + dur * .55, dur * .18);                                          // плавное затухание вместо обрыва
  let node = s;
  if (lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; s.connect(f); node = f; }
  node.connect(gn); gn.connect(B.inp); sndStart(s, t); s.stop(t + dur + .05);
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
SFX.step = function (inside, run) {
  if (!P) return SYN.step(inside, run);
  const s = surfaceAt(P.x, P.y), k = (run ? 1.3 : .8) * (P.sneak ? .45 : 1) * Math.min(1.3, Math.max(.6, stepNoiseK()));
  if (!smp('step_' + s, STEP_V[s] * k, run ? 1.04 : .97, 0, P.sneak ? 1400 : run ? null : 2400)) SYN.step(inside, run);
};

// ---- двери, окна, машина ----
SFX.door = function (open) { if (!smp(open ? 'door_open' : 'door_close', .55)) SYN.door(open); };
SFX.window = function (open) { if (!smp(open ? 'window_open' : 'window_close', .45)) SFX.wood(); };
SFX.carDoor = function (open) { if (!smp(open ? 'cardoor_open' : 'cardoor_close', .55)) SYN.door(open); };

// ---- вещи: взять, переложить, надеть ----
SFX.rustle = function () { if (!SFX.ok('rustle35', 120)) return; if (!smp(Math.random() < .6 ? 'handle' : 'cloth', .3)) SYN.rustle(); };
SFX.pickup = function () { if (!smp('handle', .32)) SYN.rustle(); };
SFX.equip = function () { if (!smp('cloth', .35)) SYN.equip(); };

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

// ---- мертвецы: настоящие стоны вместо синтеза (синтез «голоса» жужжал, как комар) ----
const zNear = (x, y) => !P ? 1 : Math.max(0, 1 - Math.hypot(x - P.x, y - P.y) / 16) ** 1.4;
const zRate = z => (z.pal && z.pal.b === 'f' ? 1.15 : z.pal && z.pal.b === 'h' ? .82 : 1) * (.92 + ((z.seed || 0) * 7 % 1) * .16);
const zLp = v => 900 + 2600 * v;                                                 // дальний стон глуше
SFX.moan = function (z) { const v = zNear(z.x, z.y); if (v < .05 || !SFX.ok('moan35', 900)) return; if (!smp('groan', .42 * v, zRate(z) * .9, 0, zLp(v))) SYN.moan(z); };
SFX.growl = function (z) { const v = zNear(z.x, z.y); if (!SFX.ok('growl35', 350)) return; if (!smp('groan', .55 * Math.max(.3, v), zRate(z) * 1.08, 0, zLp(v))) SYN.growl(z); };
SFX.shriek = function (z) { const v = zNear(z.x, z.y); if (!SFX.ok('shriek35', 900)) return; if (!smp('groan', .6 * Math.max(.3, v), zRate(z) * 1.3, 0, zLp(v))) SYN.shriek(z); };
SFX.bite = function () { if (!smp('bite', .5)) return SYN.bite(); smp('groan', .4, 1.1, .03); };
SFX.splat = function (x, y) { SYN.splat(x, y); const v = zNear(x, y); if (v > .05) smp('zdeath', .35 * v, .95, .05, zLp(v)); };
// синтетические «голоса» на фоне (вороны, собаки) звучали как насекомые — без записей лучше тишина
SFX.caw = function () {};
SFX.dog = function () {};
SFX.scream = function () { if (!smp('groan', .25, 1.45, 0, 1400)) SYN.scream(); };

// ---- стекло, стук в дверь, ломающееся дерево — записи вместо синтеза («звенело, как опыт») ----
SFX.glass = function (x, y) { const v = zNear(x, y); if (v < .03) return; if (!smp('glass', .6 * v, 1, 0, zLp(v) + 800)) SYN.glass(x, y); };
SFX.knock = function (x, y) { if (!SFX.ok('knock35', 160)) return; const v = zNear(x, y); if (v < .03) return; if (!smp('knock', .5 * v, .95, 0, zLp(v))) SYN.knock(x, y); };
SFX.wood = function (x, y) { const v = zNear(x, y); if (v < .03) return; if (!smp('woodbreak', .55 * v, 1, 0, zLp(v) + 600)) SYN.wood(x, y); };
// ---- автосигнализация: запись вместо пищащего синтеза; играет целиком, раз в ~2 секунды ----
SFX.carAlarm = function (x, y) { const v = Math.max(.12, zNear(x, y)); if (!SFX.ok('carAlarm35', 2150)) return; if (!smp('caralarm', .4 * v, 1, 0, zLp(v) + 1500)) SYN.carAlarm(x, y); };
// ---- удары: прежние звуки замаха и попадания (записи убраны по просьбе) ----
