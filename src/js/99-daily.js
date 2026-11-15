// ================= награды за ежедневный вход (v107) =================
// Главное меню → «Награды»: календарь на 7 дней, раз в реальные сутки (по часам телефона) — «Забрать».
// Забранная награда ждёт в профиле и прилетает в мир, когда герой в игре: груз на парашюте в 26–46 клетках,
// за ним надо сходить. Что в какой день — DLY_TABLE: припасы, на 3-й и 5-й день — вещь из коллекции «Dead Line»
// (одежда с особым видом, характеристики как у обычной), на 7-й — вещь из коллекции и ценное: кассета VHS,
// электронные часы, фонарик или радио. Пропустил день — тот же день серии, больше — на день назад; после 7-го — с первого.
//  • С заряженным радио — точная метка на карте. Без радио — на карте только круг, где искать, над ящиком красный дым
//    (пока не обыскан). Подошёл ближе 12 клеток — место известно.
//  • Серия и ждущая награда — в профиле браузера (`karantin.daily`), не в сохранении: награда одна на устройство в сутки
//    и прилетает в тот мир, где играешь. Переведённые назад часы награды не дают. В обучении груз не прилетает.
const DLY_KEY = 'karantin.daily';
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
// какой день серии будет сегодня: 1 подряд — дальше, пропустил день — тот же, больше — на шаг назад; 0 — сегодня уже забрал
function dlyNextStep(p, today) {
  if (p.day == null) return 1;
  const gap = today - p.day, base = p.step >= DLY_STEPS ? 0 : (p.step || 0);
  if (gap <= 0) return 0;
  if (gap === 1) return base + 1;
  if (gap === 2) return Math.max(1, base);
  return Math.max(1, base - 1);
}
const dlyBackClock = p => !!p.ts && Date.now() < p.ts - 3600e3;              // часы перевели назад

// ---- что в какой день: '@cosm' — вещь из коллекции, '@rare' — ценная вещь (выбираются, когда забираешь) ----
const DLY_TABLE = [
  ['canned', 'canned', 'water'],
  ['bandage', 'bandage', 'battery'],
  ['@cosm', 'beans', 'water'],
  ['matches', 'nails', 'seeds', 'tuna'],
  ['@cosm', 'painkill', 'canned'],
  ['tuna', 'crackers', 'antisep', 'candle'],
  ['@rare', '@cosm', 'canned', 'water'],
].map(L => L.filter(id => id[0] === '@' || ITEMS[id]));
const dlyPick = L => L[Math.floor(Math.random() * L.length)];
function dlyLoot(step) {
  const own = dlyProf().own || [];
  return DLY_TABLE[step - 1].map(id => {
    if (id === '@cosm') { const f = DLY_COSM.filter(c => !own.includes(c)); return dlyPick(f.length ? f : DLY_COSM); }
    if (id === '@rare') return dlyPick(Object.keys(ITEMS).filter(k => ITEMS[k].kind === 'vhs' && k !== 'vhs_film').concat(['watchD', 'flashlight', 'radio'].filter(k => ITEMS[k])));
    return id;
  });
}
// забрать сегодняшнюю награду (из меню); force — без проверки дня (тесты)
function dlyClaim(force) {
  const p = dlyProf(), now = Date.now(), today = dlyToday(now);
  if (!force && dlyBackClock(p)) return 0;
  const step = force ? (p.step >= DLY_STEPS ? 1 : (p.step || 0) + 1) : dlyNextStep(p, today);
  if (!step) return 0;
  const ids = dlyLoot(step);
  p.day = today; p.step = step; p.ts = Math.max(now, p.ts || 0);
  p.pend = (p.pend || []).concat(ids); p.pstep = step;
  p.own = (p.own || []).concat(ids.filter(id => ITEMS[id].cosm));
  dlyPut(p);
  return step;
}

// ---- доставка в мир ----
const dlyDK = () => (world.dx || 0) + ',' + (world.dy || 0);
const dlyRadio = () => (P.inv || []).some(it => ITEMS[it.id] && ITEMS[it.id].kind === 'radio' && it.ch > 0);
// последний ящик награды в этом районе (или null)
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
function dlyDeliver() {
  if (!P || mode !== 'play' || (typeof TUT !== 'undefined' && TUT.on)) return false;
  const p = dlyProf(); if (!p.pend || !p.pend.length) return false;
  const at = dlyPlace(p.pend.filter(id => ITEMS[id]).map(mkItem));
  if (!at) return false;
  const known = dlyRadio(), step = p.pstep || p.step || 1;
  world.dly = {x:at[0], y:at[1], dk:dlyDK(), known, ox:at[0] + Math.round((Math.random() - .5) * 12), oy:at[1] + Math.round((Math.random() - .5) * 12), step};
  p.pend = []; dlyPut(p);
  eventBanner('Награда за вход · день ' + step + ' из ' + DLY_STEPS,
    known ? 'По радио передали, где упал груз — место отмечено на карте.' : 'Над районом прошёл самолёт и сбросил груз. Ищи красный дым — примерное место обведено на карте.', '', 'i-star');
  logEv('Прилетел груз — награда за вход, день ' + step);
  return true;
}
onUpdate(dt => {
  if (!P || mode !== 'play' || paused) return;
  DLY.acc += dt; if (DLY.acc < 2) return; DLY.acc = 0;
  const D = world.dly, a = dlyDrop();
  if (D && a && !D.known && Math.hypot(P.x - a.x, P.y - a.y) < 12) { D.known = true; toast('Вот он, ящик с грузом!'); }
  if (D && a && a.f && a.f.searched && !D.got) { D.got = true; stat('daily'); }
  if (!P.sleep && !traveling) dlyDeliver();
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

// ---- экран «Награды» в главном меню ----
function dlyState() {
  const p = dlyProf(), today = dlyToday(), next = dlyNextStep(p, today), back = dlyBackClock(p);
  return {p, next, back, can:!!next && !back, done:next ? next - 1 : (p.step || 0)};
}
function dlyMenuBtn() {
  const b = $('mDaily'); if (!b) return;
  const S = dlyState(), t = b.querySelector('.pz-t') || b;
  t.textContent = S.can ? 'Награды · забрать!' : 'Награды';
  b.classList.toggle('dly-has', S.can);
}
function dlyLeft() {
  const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n, h = Math.floor(m / 3600e3), mi = Math.floor(m % 3600e3 / 60e3);
  return h ? h + ' ч ' + mi + ' мин' : mi + ' мин';
}
function renderDaily(got) {
  const S = dlyState(), box = $('dlyList'); box.textContent = '';
  $('dlyCount').textContent = 'День ' + (S.can ? S.next : S.done || 1) + ' из ' + DLY_STEPS;
  for (let d = 1; d <= DLY_STEPS; d++) {
    const st = d <= S.done && !(S.can && d >= S.next) ? 'got' : S.can && d === S.next ? 'now' : 'wait';
    const c = mk('div', 'dlyc ' + st + (d === DLY_STEPS ? ' big' : ''));
    c.appendChild(mk('b', 'dlyd', st === 'got' ? '✓ День ' + d : 'День ' + d));
    const row = mk('div', 'dlyi'), cnt = {};
    for (const id of DLY_TABLE[d - 1]) cnt[id] = (cnt[id] || 0) + 1;
    for (const id in cnt) {
      const cell = mk('span', 'dlyit'), ic = id === '@cosm' ? 'dl_jacket' : id === '@rare' ? 'vhs_cook' : id;
      cell.appendChild(iconEl(ic, 30));
      cell.title = id === '@cosm' ? 'Вещь из коллекции «Dead Line»' : id === '@rare' ? 'Ценная находка: кассета, часы, фонарик или радио' : ITEMS[id].name;
      if (cnt[id] > 1) cell.appendChild(mk('i', '', '×' + cnt[id]));
      if (id[0] === '@') cell.classList.add('sp');
      row.appendChild(cell);
    }
    c.appendChild(row);
    if (DLY_TABLE[d - 1].includes('@rare')) c.appendChild(mk('small', '', 'ценная находка + коллекция'));
    else if (DLY_TABLE[d - 1].includes('@cosm')) c.appendChild(mk('small', '', 'вещь из коллекции'));
    box.appendChild(c);
  }
  const info = $('dlyInfo'), b = $('dlyGet');
  b.hidden = !S.can;
  if (S.back) info.textContent = 'Часы телефона переведены назад — награду сейчас забрать нельзя.';
  else if (got) info.textContent = 'Забрал! Груз прилетит в твой мир, когда зайдёшь в игру: ищи красный дым, а с радио место будет на карте. Следующая награда — через ' + dlyLeft() + '.';
  else if (S.can) info.textContent = S.p.day != null && S.next <= (S.p.step || 0) && S.p.step < DLY_STEPS ? 'Ты пропустил день — серия откатилась. Заходи каждый день, чтобы дойти до седьмого.' : 'Награда прилетит в твой мир грузом на парашюте.';
  else info.textContent = 'Сегодня награда уже получена' + ((S.p.pend || []).length ? ' — она ждёт тебя в игре' : '') + '. Следующая — через ' + dlyLeft() + '.';
}
{
  const nav = $('mAch') && $('mAch').parentNode;
  if (nav) {
    const b = btn('Награды', () => { backTo = 'menu'; renderDaily(); show('daily'); }, 'mbtn'); b.id = 'mDaily';
    nav.insertBefore(b, $('mAch'));
  }
  $('dlyBack').addEventListener('click', () => { show('menu'); dlyMenuBtn(); });
  $('dlyGet').addEventListener('click', () => { if (dlyClaim(false)) { try { SFX.ui(); } catch (e) {} renderDaily(true); dlyMenuBtn(); } });
  dlyMenuBtn();
}
