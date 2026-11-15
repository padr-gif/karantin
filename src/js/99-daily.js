// ================= ежедневный груз: награда за вход (v107) =================
// Раз в реальные сутки (по часам телефона) над районом героя сбрасывают груз на парашюте — в 26–46 клетках,
// не у самого дома: за ним надо сходить. Серия на 7 дней: в дни 1–6 скромные припасы, на 3-й и 5-й день —
// вещь из коллекции «Dead Line» (одежда с особым видом, характеристики как у обычной), на 7-й — ценное:
// редкая кассета VHS, электронные часы, фонарик или радио, и вещь из коллекции. Пропустил день — серия
// откатывается на день, пропустил больше — на два; после 7-го дня — снова с первого.
//  • С радио (заряженным) герой слышит точное место: метка на карте. Без радио — на карте только круг,
//    где искать. Над ящиком, пока его не обыскали, поднимается красный дым. Подошёл ближе 12 клеток — место известно.
//  • Не забрал до следующего сброса — старый ящик разграблен (пустеет).
//  • Серия и день — в профиле браузера (`karantin.daily`), не в сохранении: награда одна на устройство в сутки,
//    и попадает в тот мир, где играешь. Переведённые назад часы награды не дают.
//  • В обучении и в отладочной сборке (?dbg, тесты) сам не срабатывает: `dlyCheck(true)` — вручную.
const DLY_KEY = 'karantin.daily';
const DLY_OFF = /[?&]dbg\b/.test(location.search) && !/[?&]daily\b/.test(location.search);
const DLY_STEPS = 7;
const DLY = {acc:0, warned:false, puffs:[], pt:0};

// ---- коллекция «Dead Line»: свой вид, характеристики обычной вещи ----
Object.assign(ITEMS, {
  dl_jacket:{name:'Куртка «Dead Line»', sh:'Куртка DL', kind:'cloth', slot:'torso', cov:'long', ins:7, prot:.1, col:[34, 34, 38], acc:[190, 40, 36], pat:'stripe', cosm:1, verb:'Надеть'},
  dl_bomber:{name:'Бомбер «Карантин»', sh:'Бомбер', kind:'cloth', slot:'torso', cov:'long', ins:5, prot:.1, col:[64, 78, 52], acc:[214, 120, 40], pat:'chevron', cosm:1, verb:'Надеть'},
  dl_hoodie:{name:'Толстовка «Выживший»', sh:'Толстовка DL', kind:'cloth', slot:'shirt', cov:'long', ins:4, col:[150, 30, 34], acc:[30, 26, 28], pat:'stripe', cosm:1, verb:'Надеть'},
  dl_tee:{name:'Футболка «Сигнал»', sh:'Футболка DL', kind:'cloth', slot:'shirt', cov:'tee', ins:1, col:[226, 222, 210], acc:[200, 44, 38], pat:'chevron', cosm:1, verb:'Надеть'},
  dl_cargo:{name:'Карго «Ночной патруль»', sh:'Карго DL', kind:'cloth', slot:'legs', cov:'pants', ins:2, prot:.1, cap:3, col:[30, 32, 36], acc:[92, 96, 104], pat:'chevron', cosm:1, verb:'Надеть'},
  dl_sneak:{name:'Кроссовки «Красная линия»', sh:'Кроссовки DL', kind:'cloth', slot:'feet', cov:'shoe', ins:0, spd:1.04, noise:.95, col:[236, 234, 228], acc:[196, 38, 34], pat:'stripe', cosm:1, verb:'Обуть'},
  dl_cap:{name:'Кепка «Dead Line»', sh:'Кепка DL', kind:'cloth', slot:'head', cov:'hat', ins:0, col:[26, 26, 30], acc:[200, 40, 36], pat:'stripe', cosm:1, verb:'Надеть'},
  dl_beanie:{name:'Шапка «Сигнальная»', sh:'Шапка DL', kind:'cloth', slot:'head', cov:'hat', ins:2, col:[226, 104, 30], acc:[30, 30, 32], pat:'stripe', cosm:1, verb:'Надеть'},
});
Object.assign(DESC, {
  dl_jacket:'Чёрная куртка с красной полосой — из коллекции ежедневного груза. Греет как обычная тёплая куртка.',
  dl_bomber:'Оливковый бомбер с оранжевыми шевронами. Коллекция ежедневного груза.',
  dl_hoodie:'Красная толстовка с чёрной полосой. Коллекция ежедневного груза.',
  dl_tee:'Белая футболка с красными шевронами. Коллекция ежедневного груза.',
  dl_cargo:'Чёрные штаны карго с серыми шевронами: +3 места в карманах. Коллекция ежедневного груза.',
  dl_sneak:'Белые кроссовки с красной полосой. Лёгкие и тихие. Коллекция ежедневного груза.',
  dl_cap:'Чёрная кепка с красной полосой. Коллекция ежедневного груза.',
  dl_beanie:'Оранжевая шапка с чёрной полосой — видно издалека. Коллекция ежедневного груза.',
});
Object.assign(ICONA, {dl_jacket:'jacket', dl_bomber:'jacket', dl_hoodie:'hoodie', dl_tee:'tshirt', dl_cargo:'cargo', dl_sneak:'sneakers', dl_cap:'cap', dl_beanie:'hat'});
Object.assign(KG, {dl_jacket:1.2, dl_bomber:1, dl_hoodie:.6, dl_tee:.2, dl_cargo:.6, dl_sneak:.7, dl_cap:.1, dl_beanie:.1});
const DLY_COSM = Object.keys(ITEMS).filter(id => ITEMS[id].cosm);

// ---- профиль: серия и день ----
function dlyProf() { try { return JSON.parse(localStorage.getItem(DLY_KEY)) || {}; } catch (e) { return {}; } }
function dlyPut(p) { try { localStorage.setItem(DLY_KEY, JSON.stringify(p)); } catch (e) {} }
const dlyToday = (t = Date.now()) => Math.floor((t - new Date(t).getTimezoneOffset() * 60000) / 864e5);   // номер местных суток
// какой день серии будет сегодня: 1 подряд — дальше, пропустил день — тот же, больше — на шаг назад
function dlyNextStep(p, today) {
  if (p.day == null) return 1;
  const gap = today - p.day, base = p.step >= DLY_STEPS ? 0 : (p.step || 0);
  if (gap <= 0) return 0;
  if (gap === 1) return base + 1;
  if (gap === 2) return Math.max(1, base);
  return Math.max(1, base - 1);
}

// ---- что внутри ----
const DLY_POOL = [['canned', 'beans', 'tuna', 'crackers', 'water', 'water'], ['bandage', 'bandage', 'painkill', 'antisep'],
  ['battery', 'matches', 'nails', 'seeds', 'candle', 'lighter']].map(L => L.filter(id => ITEMS[id]));
function dlyLoot(step) {
  const R = Math.random, pk = L => L[Math.floor(R() * L.length)], out = [];
  const n = step >= DLY_STEPS ? 3 : 2 + (step >> 1);                         // 2, 3, 3, 4, 4, 5 … и 3 на седьмой
  for (let k = 0; k < n; k++) out.push(mkItem(pk(DLY_POOL[k % DLY_POOL.length])));
  const have = new Set((P.inv || []).map(it => it.id).concat(Object.values(P.cloth || {}).filter(Boolean).map(it => it.id)));
  if (step === 3 || step === 5 || step >= DLY_STEPS) {
    const fresh = DLY_COSM.filter(id => !have.has(id));
    out.push(mkItem(pk(fresh.length ? fresh : DLY_COSM)));
  }
  if (step >= DLY_STEPS) {
    const rare = Object.keys(ITEMS).filter(id => ITEMS[id].kind === 'vhs' && id !== 'vhs_film' && !have.has(id));
    for (const id of ['watchD', 'flashlight', 'radio']) if (ITEMS[id] && !have.has(id)) rare.push(id);
    if (rare.length) out.push(mkItem(pk(rare)));
  }
  return out;
}

// ---- сброс ----
const dlyDK = () => (world.dx || 0) + ',' + (world.dy || 0);
const dlyRadio = () => (P.inv || []).some(it => ITEMS[it.id] && ITEMS[it.id].kind === 'radio' && it.ch > 0);
// ящик ежедневного груза в этом районе (или null)
function dlyDrop() {
  const D = world.dly; if (!D || D.dk !== dlyDK()) return null;
  return airdrops.find(a => a.tx === D.x && a.ty === D.y) || null;
}
// на карте: точное место, только если известно (23-survival-kit и 31-interface2 спрашивают перед тем, как рисовать ящик)
function dlyHidden(a) { const D = world.dly; return !!D && !D.known && D.dk === dlyDK() && a.tx === D.x && a.ty === D.y; }
function dlyPlace(items) {
  for (let t = 0; t < 500; t++) {
    const an = Math.random() * 6.283, r = 26 + Math.random() * 20, x = Math.floor(P.x + Math.cos(an) * r), y = Math.floor(P.y + Math.sin(an) * r), i = y * MW + x;
    if (!inMap(x, y, 3) || !insideFence(x, y) || hAt[i] || furn[i] || propAt[i] || !tileFree(x, y)) continue;
    if (map[i] !== GRASS && map[i] !== ROAD && map[i] !== WALK) continue;
    if (airdrops.some(d => Math.hypot(d.tx - x, d.ty - y) < 6)) continue;
    airdrops.push({x:x + .5, y:y + .5, z:300, landed:false, tx:x, ty:y, items, searched:0});
    return [x, y];
  }
  return null;
}
// прошлый ящик, если его не забрали, к новому сбросу разграблен
function dlyExpire() {
  const a = dlyDrop();
  if (a && a.f && !a.f.searched) { a.f.items = []; a.f.searched = true; logEv('Вчерашний груз так и не забрал — его разграбили'); }
  world.dly = null;
}
function dlyCheck(force) {
  if (!P || mode !== 'play' || (typeof TUT !== 'undefined' && TUT.on)) return false;
  const p = dlyProf(), now = Date.now(), today = dlyToday(now);
  if (p.ts && now < p.ts - 3600e3) {                                           // часы перевели назад
    if (!DLY.warned) { DLY.warned = true; toast('Часы телефона переведены назад — ежедневного груза сегодня не будет'); }
    return false;
  }
  const step = force ? (p.step >= DLY_STEPS ? 1 : (p.step || 0) + 1) : dlyNextStep(p, today);
  if (!step) return false;
  dlyExpire();
  const items = dlyLoot(step), at = dlyPlace(items);
  if (!at) return false;
  const known = dlyRadio(), ox = at[0] + Math.round((Math.random() - .5) * 12), oy = at[1] + Math.round((Math.random() - .5) * 12);
  world.dly = {x:at[0], y:at[1], dk:dlyDK(), known, ox, oy, step};
  dlyPut({day:today, step, ts:Math.max(now, p.ts || 0)});
  const strip = '●'.repeat(step) + '○'.repeat(DLY_STEPS - step);
  const big = step >= DLY_STEPS ? ' Сегодня в нём что-то ценное.' : step === 3 || step === 5 ? ' Внутри есть вещь из коллекции.' : '';
  eventBanner('Ежедневный груз · день ' + step + ' из ' + DLY_STEPS + '  ' + strip,
    (known ? 'По радио передали, где упал груз — место отмечено на карте.' : 'Над районом прошёл самолёт и сбросил груз. Ищи красный дым — примерное место обведено на карте.') + big, '', 'i-star');
  logEv('Ежедневный груз, день ' + step + ' из ' + DLY_STEPS);
  return true;
}

onUpdate(dt => {
  if (!P || mode !== 'play' || paused) return;
  DLY.acc += dt; if (DLY.acc < 2) return; DLY.acc = 0;
  const D = world.dly, a = dlyDrop();
  if (D && a && !D.known && Math.hypot(P.x - a.x, P.y - a.y) < 12) { D.known = true; toast('Вот он, ящик с грузом!'); }
  if (D && a && a.f && a.f.searched && !D.got) { D.got = true; stat('daily'); }
  if (!DLY_OFF && !P.sleep && !traveling) dlyCheck(false);
});
onStartNew(() => { world.dly = null; });
onSave(d => { if (world.dly) d.xDly = world.dly; });
onLoad(d => { world.dly = (d && d.xDly) || null; });

// ---- красный дым над ящиком, пока его не обыскали ----
onDraw(() => {
  if (mode !== 'play') return;
  const D = world.dly, a = dlyDrop();
  if (!D || !a || !a.landed || (a.f && a.f.searched)) { DLY.puffs.length = 0; return; }
  const now = animT;
  if (now - DLY.pt > .12) { DLY.pt = now; DLY.puffs.push({t:now, dx:(Math.random() - .5) * 4, s:.7 + Math.random() * .6}); if (DLY.puffs.length > 40) DLY.puffs.shift(); }
  const gx = SX(a.x, a.y), gy = SY(a.x, a.y, 6);
  ctx.save();
  for (const q of DLY.puffs) {
    const age = now - q.t; if (age < 0 || age > 4.8) continue;
    const k = age / 4.8, r = (3 + k * 14) * q.s, x = gx + q.dx + Math.sin(age * 1.3 + q.s * 5) * 3 + k * 18, y = gy - age * 34;
    ctx.globalAlpha = (1 - k) * .55; ctx.fillStyle = k < .25 ? '#e0402e' : '#c25a4c';
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  }
  ctx.restore();
});
