// ================= быт выжившего: часы на батарейке, настенные часы, свет из окон, ремонт дома,
// карманы мертвецов, вынести труп, отмыть кровь =================
//  · кварцевые и электронные часы идут от батарейки; села — встали, время пропало до новой батарейки;
//    настенные часы в доме показывают время, пока стоишь рядом (часть из них давно встала)
//  · ночью свет в доме (фонарик или лампы) видно с улицы через окна без штор и досок — мертвецы идут посмотреть
//  · ремонт: вставить стекло или затянуть окно плёнкой, починить, укрепить и навесить выбитую дверь
//  · у мертвецов в карманах — сигареты, зажигалки, бумажники, часы, кольца, одежда (в крови); у полицейских, врачей,
//    рабочих и солдат — своё. Тело можно обыскать
//  · тело можно взять и вытащить из дома: тело в доме воняет и портит настроение
//  · кровь на полу отмывается отбеливателем или моющим средством с тряпкой; окровавленную одежду можно застирать

// ---------- новые вещи ----------
Object.assign(ITEMS, {
  bleach:{name:'Отбеливатель', kind:'misc', uses:5, info:'с тряпкой — отмыть кровь с пола, застирать одежду'},
  cleaner:{name:'Моющее средство', sh:'Средство', kind:'misc', uses:3, info:'с тряпкой — отмыть кровь с пола, застирать одежду'},
  glassP:{name:'Оконное стекло', sh:'Стекло', kind:'misc', info:'вставить в разбитое окно'},
  plastic:{name:'Плёнка', kind:'misc', info:'с изолентой — затянуть разбитое окно'},
  wallet:{name:'Бумажник', kind:'misc', verb:'Открыть'},
  ring:{name:'Обручальное кольцо', sh:'Кольцо', kind:'misc', verb:'Прочитать гравировку'},
  glasses:{name:'Очки', kind:'misc', info:'при плохом зрении — в рюкзаке возвращают обзор'},
  gum:{name:'Жвачка', kind:'food', sat:1, calm:6, verb:'Пожевать'},
  photo:{name:'Фотография', sh:'Фото', kind:'misc', verb:'Посмотреть'},
});
Object.assign(DESC, {
  bleach:'Бутыль отбеливателя. С тряпкой отмывает кровь с пола и одежды. Хватает на пять раз.',
  cleaner:'Средство для мытья полов. С тряпкой отмывает кровь. Хватает на три раза.',
  glassP:'Целое оконное стекло. Вставишь в разбитое окно — снова не продувает и не слышно улицу.',
  plastic:'Рулон плотной плёнки. С изолентой затянешь разбитое окно: не стекло, но от ветра и чужих глаз спасёт.',
  wallet:'Чей-то бумажник. Деньги больше ничего не стоят, но внутри может быть что-то важнее.',
  ring:'Обручальное кольцо. Внутри гравировка.',
  glasses:'Очки в тонкой оправе. Если у героя плохое зрение, с ними видно дальше.',
  gum:'Пластинка жвачки. Мятный вкус немного успокаивает.',
  photo:'Фотография из чужого бумажника.',
});
Object.assign(KG, {bleach:1, cleaner:.5, glassP:2, plastic:.4, wallet:.1, ring:.01, glasses:.05, gum:.02, photo:.01});
{ const add = (k, ...ids) => CONT[k] && CONT[k].loot && CONT[k].loot.push(...ids);
  add('bsink', 'bleach', 'cleaner'); add('washer', 'bleach', 'cleaner', 'bleach'); add('cabinet', 'cleaner'); add('counter', 'cleaner');
  add('shelf', 'bleach', 'cleaner'); add('pantry', 'cleaner');
  add('toolrack', 'glassP', 'plastic', 'tape'); add('crate', 'plastic', 'glassP'); add('locker', 'cleaner');
  add('nightstand', 'glasses', 'photo'); add('dresser', 'photo', 'ring'); add('desk', 'glasses', 'gum'); add('car', 'gum', 'glasses');
}
const CLEANERS = ['bleach', 'cleaner'];
const cleanerIt = () => P.inv.find(i => CLEANERS.includes(i.id) && (i.uses == null || i.uses > 0));
function useCleaner() { const c = cleanerIt(); if (!c) return; if (c.uses == null) c.uses = ITEMS[c.id].uses; c.uses--; if (c.uses <= 0) { P.inv.splice(P.inv.indexOf(c), 1); toast(ITEMS[c.id].name + ' закончилось'); } }
// очки снимают «плохое зрение»
{ const h0 = hasTr; hasTr = function (k) { if (k === 'short' && P && P.inv && P.inv.some(i => i.id === 'glasses')) return false; return h0(k); }; }

// ---------- часы на батарейке ----------
const WATCH_DAYS = {watchQ:30, watchD:18};                                    // на сколько игровых дней хватает новой батарейки
{ const m0 = mkItem; mkItem = function (id) { const it = m0.apply(this, arguments); if (WATCH_DAYS[id] && it && it.ch == null) it.ch = ri(35, 100); return it; }; }
{ let lastM = null;
  onUpdate(() => {
    if (!P || mode !== 'play') { lastM = null; return; }
    if (lastM == null || gameMin < lastM) { lastM = gameMin; return; }
    const dm = gameMin - lastM; if (dm < 1) return; lastM = gameMin;
    const w = P.cloth && P.cloth.wrist;
    for (const it of [w, ...P.inv]) {
      if (!it || !WATCH_DAYS[it.id]) continue;
      if (it.ch == null) it.ch = 100;
      if (it.ch <= 0) continue;
      it.ch = Math.max(0, it.ch - dm * 100 / (WATCH_DAYS[it.id] * 1440));
      if (it.ch <= 0 && it === w) { toast('Часы встали: села батарейка. Без новой время не узнать'); updateHud(); }
    }
  });
}
// батарейка — в то, что разрядилось сильнее: фонарик, радио или часы (на руке и в рюкзаке)
defUse(it => it.id === 'battery', (it, k) => {
  const list = [P.cloth && P.cloth.wrist, ...P.inv].filter(i => i && (i.id === 'flashlight' || i.id === 'radio' || WATCH_DAYS[i.id]) && (i.ch == null || i.ch < 99));
  list.sort((a, b) => (a.ch || 0) - (b.ch || 0));
  const t = list[0]; if (!t) { toast('Некуда вставить: фонарик, радио и часы заряжены'); return; }
  t.ch = 100; P.inv.splice(P.inv.indexOf(it), 1); toast('Батарейка вставлена: ' + ITEMS[t.id].name.toLowerCase()); renderInv(); updateHud();
});
{ const t0 = itemText; itemText = function (it) {
    const d = ITEMS[it.id];
    if (d && WATCH_DAYS[it.id]) return (it.ch != null && it.ch <= 0 ? 'стоят: нужна батарейка' : 'идут · батарейка ' + Math.round(it.ch == null ? 100 : it.ch) + '%') + (it.id === 'watchD' ? ' · время, дата, будильник' : ' · время');
    if (d && CLEANERS.includes(it.id)) return 'отмыть кровь, застирать одежду · осталось на ' + (it.uses == null ? d.uses : it.uses) + ' раз';
    const s = t0.apply(this, arguments);
    return it.blood ? 'в крови · ' + s : s;
  };
}

// ---------- настенные часы: запоминаем, где они нарисованы ----------
const WCLOCKS = new Map();
{ const w0 = wallArt;
  wallArt = function (p0x, p0y, p1x, p1y, kind) {
    if (WALLART[kind] && WALLART[kind][1] === 'clock') {
      const x = (p0x + p1x) / 2, y = (p0y + p1y) / 2, key = Math.round(x * 4) + ',' + Math.round(y * 4);
      if (!WCLOCKS.has(key)) WCLOCKS.set(key, {x, y, stop:hash(Math.round(x * 4) + 3, Math.round(y * 4) + 7) < .3});
    }
    return w0.apply(this, arguments);
  };
}
onNewWorld(() => WCLOCKS.clear());
function wallClockNear() {
  if (!P || !insideHouse(P.x, P.y)) return false;
  const hi = hAt[Math.floor(P.y) * MW + Math.floor(P.x)];
  for (const c of WCLOCKS.values()) {
    if (c.stop || Math.abs(c.x - P.x) > 4.5 || Math.abs(c.y - P.y) > 4.5) continue;
    let same = false; for (const [a, b] of [[0, 0], [-.3, 0], [0, -.3], [.3, 0], [0, .3]]) if (hAt[Math.floor(c.y + b) * MW + Math.floor(c.x + a)] === hi) same = true;
    if (same) return true;
  }
  return false;
}

// ---------- свет из окон ночью ----------
function houseWindows(H) {
  if (H._wins) return H._wins;
  const out = [];
  for (let y = Math.floor(H.iy0) - 1; y <= Math.ceil(H.iy1); y++) for (let x = Math.floor(H.ix0) - 1; x <= Math.ceil(H.ix1); x++) {
    const i = y * MW + x; if (map[i] !== WIN) continue;
    const out1 = D4.map(([a, b]) => [x + a, y + b]).find(([qx, qy]) => !insideHouse(qx + .5, qy + .5) && !isWallish(get(qx, qy)));
    if (out1) out.push({i, x, y, ox:out1[0] + .5, oy:out1[1] + .5});
  }
  return (H._wins = out);
}
{ let t = 0, told = -1;
  onUpdate(dt => {
    if (!P || mode !== 'play' || paused || (t -= dt) > 0) return; t = 2.5;
    if (lightLevel() > .4 || !insideHouse(P.x, P.y)) return;
    const lit = flashlight() || (poweredAt(P.x, P.y) && roomLitAt(P.x, P.y)); if (!lit) return;
    const H = houses.find(Hs => P.x > Hs.ix0 && P.x < Hs.ix1 && P.y > Hs.iy0 && P.y < Hs.iy1); if (!H) return;
    let shown = 0;
    for (const w of houseWindows(H)) {
      const ob = obs[w.i]; if (!ob || ob.cc || ob.bhp > 0 || Math.hypot(w.x + .5 - P.x, w.y + .5 - P.y) > 7) continue;
      shown++;
      for (const z of zs) {
        if (z.state === 'chase' || z.state === 'investigate' || Math.hypot(z.x - w.ox, z.y - w.oy) > 11 || insideHouse(z.x, z.y)) continue;
        if (rng() < .3) { z.state = 'investigate'; z.tx = w.ox; z.ty = w.oy; z.it = 0; }
      }
    }
    if (shown && told !== dayNo()) { told = dayNo(); toast('Свет в окнах видно с улицы. Задёрни шторы или заколоти окна — иначе мертвецы придут посмотреть'); }
  });
}

// ---------- ремонт дома: окна и двери ----------
const DOOR_BASE = 70;
onNewWorld(() => { for (const o of obs) if (o && o.t === 'door') o.hp0 = o.hp; });   // целая дверь: межкомнатная 60, входная 70
addActions(out => {
  if (!P || P.car || P.sleep || (typeof BLD !== 'undefined' && BLD.on)) return;
  for (const o of nearOpenings()) {
    if (o.d > 1.35) continue;
    const ob = obs[o.i]; if (!ob) continue;
    if (ob.t === 'win' && ob.broken && !(ob.bhp > 0)) {
      if (countItem('glassP')) out.push({kind:'glaze', label:'вставить стекло', o, tk:'gz' + o.i});
      else if (countItem('plastic') && countItem('tape')) out.push({kind:'film', label:'затянуть плёнкой', o, tk:'gz' + o.i});
      else if (insideHouse(P.x, P.y)) out.push({kind:'fixwin', label:'заделать окно: нужно стекло или плёнка с изолентой', o, tk:'gz' + o.i});
    }
    if (ob.t === 'door') {
      if (ob.dead) out.push({kind:'hangdoor', label:'навесить дверь', o, tk:'dr' + o.i});
      else if (ob.bhp > 0) {}
      else if (ob.hp < (ob.hp0 || DOOR_BASE) - 5) out.push({kind:'fixdoor', label:'починить дверь', o, tk:'dr' + o.i});
      else if ((ob.reinf || 0) < 2 && insideHouse(P.x, P.y)) out.push({kind:'reinf', label:(ob.reinf ? 'ещё укрепить дверь' : 'укрепить дверь'), o, tk:'dr' + o.i});
    }
  }
});
function needKit(planks, nails) {
  const miss = [];
  if (!hasTool('hammer')) miss.push('молоток');
  if (countItem('plank') < planks) miss.push('доски ×' + planks);
  if (nails && countItem('nails') < 1) miss.push('гвозди');
  if (miss.length) { toast('Нужно: ' + miss.join(', ')); return false; }
  return true;
}
const busyH = () => mode !== 'play' || paused || panel || P.sleep;
const refresh = () => { clearCaches(); fogDirty = true; buildFlow(); renderInv(); updateHud(); };
defAction('glaze', {name:() => 'Окно', icon:() => 'i-window', run:a => {
  if (busyH()) return; $('actMenu').hidden = true;
  job(6 * (1 - .06 * skillLv('carp')), () => {
    const ob = obs[a.o.i]; if (!ob.broken || !countItem('glassP')) return;
    removeItem('glassP'); ob.broken = false; ob.cleared = false; ob.ghp = 10; ob.film = false; ob.open = false;
    SFX.glass && SFX.glass(a.o.x + .5, a.o.y + .5); addXp('carp', 2); refresh(); toast('Стекло вставлено. Окно как новое');
  }, {noisy:2});
}});
defAction('film', {name:() => 'Окно', icon:() => 'i-window', run:a => {
  if (busyH()) return; $('actMenu').hidden = true;
  job(4, () => {
    const ob = obs[a.o.i]; if (!ob.broken || !countItem('plastic') || !countItem('tape')) return;
    removeItem('plastic'); removeItem('tape'); ob.broken = false; ob.cleared = false; ob.ghp = 3; ob.film = true; ob.open = false;
    SFX.rustle(); addXp('carp', 1); refresh(); toast('Окно затянуто плёнкой. Не стекло — мертвецы прорвут её быстрее');
  }, {noisy:1});
}});
defAction('fixwin', {name:() => 'Окно', icon:() => 'i-window', run:() => toast('Нужно оконное стекло — или плёнка и изолента. Ищи на стеллажах в гаражах и сараях')});
defAction('fixdoor', {name:() => 'Дверь', icon:() => 'i-door', run:a => {
  if (busyH() || !needKit(1, true)) return; $('actMenu').hidden = true;
  equipTool && equipTool('hammer');
  job(5 * (1 - .06 * skillLv('carp')), () => {
    const ob = obs[a.o.i]; if (!countItem('plank') || !countItem('nails')) return;
    removeItem('plank'); removeItem('nails'); ob.hp = Math.max(ob.hp, (ob.hp0 || DOOR_BASE) + 70 * (ob.reinf || 0));
    SFX.wood(a.o.x + .5, a.o.y + .5); noise(P.x, P.y, 7); addXp('carp', 2); refresh(); toast('Дверь починена');
  }, {loopAn:'work', noisy:6});
}});
defAction('reinf', {name:() => 'Дверь', icon:() => 'i-door', run:a => {
  if (busyH() || !needKit(2, true)) return; $('actMenu').hidden = true;
  equipTool && equipTool('hammer');
  job(7 * (1 - .06 * skillLv('carp')), () => {
    const ob = obs[a.o.i]; if (countItem('plank') < 2 || !countItem('nails')) return;
    removeItem('plank'); removeItem('plank'); removeItem('nails');
    ob.reinf = (ob.reinf || 0) + 1; ob.hp = Math.max(ob.hp, ob.hp0 || DOOR_BASE) + 70;
    SFX.wood(a.o.x + .5, a.o.y + .5); noise(P.x, P.y, 8); addXp('carp', 3); refresh();
    toast(ob.reinf >= 2 ? 'Дверь укреплена вдвойне. Выбить её — долгая работа' : 'Дверь укреплена досками изнутри');
  }, {loopAn:'work', noisy:8});
}});
defAction('hangdoor', {name:() => 'Дверной проём', icon:() => 'i-door', run:a => {
  if (busyH() || !needKit(3, true)) return; $('actMenu').hidden = true;
  equipTool && equipTool('hammer');
  job(10 * (1 - .06 * skillLv('carp')), () => {
    const ob = obs[a.o.i]; if (countItem('plank') < 3 || !countItem('nails')) return;
    for (let q = 0; q < 3; q++) removeItem('plank'); removeItem('nails');
    ob.dead = false; ob.open = true; ob.ang = 1; ob.hp = ob.hp0 || DOOR_BASE; ob.locked = false; ob.reinf = 0;
    SFX.wood(a.o.x + .5, a.o.y + .5); noise(P.x, P.y, 9); addXp('carp', 4); refresh(); toast('Дверь сколочена из досок и навешена');
  }, {loopAn:'work', noisy:9});
}});

// ---------- карманы мертвецов ----------
const ZPOCKET = [['cigs', 14], ['lighter', 8], ['matches', 5], ['gum', 6], ['candy', 4], ['wallet', 11], ['ring', 4], ['glasses', 4], ['watchQ', 5], ['watchD', 3],
  ['painkill', 3], ['pills', 2], ['bandage', 3], ['note', 3], ['water', 2], ['chips', 2], ['newspaper', 2], ['rag', 5], ['battery', 3], ['photo', 3]].filter(([id]) => ITEMS[id]);
const ZWEAR = ['tshirt', 'longsl', 'flannel', 'hoodie', 'tank', 'jeans', 'jeans', 'sweatp', 'shorts', 'cargo', 'sneakers', 'sneakers', 'boots', 'cap', 'jacket', 'denimJ', 'sweater', 'hat'].filter(id => ITEMS[id]);
const ZUNI = {10:['baton', 'flashlight', 'battery', 'bandage', 'ammo9', 'cap'], 11:['bandage', 'antisep', 'painkill', 'pills', 'vitamins', 'antibio'],
  12:['tape', 'nails', 'workvest', 'gloves', 'boots', 'wrench', 'hammer'], 13:['mre', 'canteen', 'milB', 'milP', 'milJ', 'bandage', 'shells'], 14:['water', 'energy', 'sneakers', 'watchD', 'shorts', 'sweatp']};
function wpick(L) { let s = 0; for (const [, w] of L) s += w; let r = rng() * s; for (const [id, w] of L) if ((r -= w) <= 0) return id; return L[0][0]; }
function zPockets(z) {
  const out = [], pi = z.pal && z.pal.pi, r = rng();
  let n = r < .3 ? 0 : r < .7 ? 1 : r < .92 ? 2 : 3;
  for (let k = 0; k < n; k++) out.push(mkItem(wpick(ZPOCKET)));
  if (rng() < .35 && ZWEAR.length) { const it = mkItem(pick(ZWEAR)); it.blood = true; if (it.cd != null || ITEMS[it.id].kind === 'cloth') it.cd = ri(35, 80); out.push(it); }
  const U = ZUNI[pi]; if (U) { const L = U.filter(id => ITEMS[id]); for (let k = 0, m = rng() < .5 ? 1 : 2; k < m && L.length; k++) { const it = mkItem(pick(L)); if (ITEMS[it.id].kind === 'cloth') { it.blood = true; it.cd = ri(40, 85); } out.push(it); } }
  return out;
}
CONT.corpse = {name:'Мертвец', loot:[], n:[0, 0]};
onZDeath = function (z) {
  if (z.brute) { stat('brute'); ach('brute'); }
  if (z.scream) ach('scream');
  let c = null; for (let k = corpses.length - 1; k >= 0 && k >= corpses.length - 4; k--) if (corpses[k].seed === z.seed) { c = corpses[k]; break; }
  const items = zPockets(z);
  if (c) { c.items = items; c.t = gameMin; c.type = 'corpse'; }
  else for (const it of items) addToPile(z.x, z.y, it);
};
const corpseNear = r => { let best = null, bd = r; for (const c of corpses) { if (c.drag) continue; const d = Math.hypot(c.x - P.x, c.y - P.y); if (d < bd && (d < .8 || reachOK(c.x, c.y))) { bd = d; best = c; } } return best; };
addActions(out => {
  if (!P || P.car || P.sleep) return;
  if (P.drag) { out.unshift({kind:'dropbody', label:'бросить тело', f:P.drag}); return; }
  const c = corpseNear(1.3); if (!c) return;
  if (!c.type) c.type = 'corpse';
  if (c.items && !c.searched) out.push({kind:'search', label:'обыскать мертвеца', f:c});
  else if (c.items && c.items.length) out.push({kind:'open', label:'карманы мертвеца', f:c});
  out.push({kind:'dragbody', label:'тащить тело', f:c});
});

// ---------- тащить тело ----------
const unbake = (x, y) => { for (const ch of chunksNear(x, y, 2)) for (const [k, v] of CHUNKS) if (v === ch) CHUNKS.delete(k); };
defAction('dragbody', {name:() => 'Мертвец', icon:() => 'i-hand', run:a => {
  if (busyH()) return; $('actMenu').hidden = true;
  const c = a.f; if (!c || P.drag) return;
  P.drag = c; c.drag = true; c.fall = .999; unbake(c.x, c.y); P.running = false; SFX.rustle();
  if (!P._dragTip) { P._dragTip = 1; toast('Тащишь тело — медленно и без бега. Брось его на улице, подальше от дома'); }
}});
defAction('dropbody', {name:() => 'Мертвец', icon:() => 'i-hand', run:() => dropBody()});
function dropBody() {
  const c = P.drag; if (!c) return;
  P.drag = null; c.drag = false; c.fall = 1; stampQ.push({c}); SFX.rustle(); updateHud();
}
{ const k0 = moveK; moveK = function () { return k0.apply(this, arguments) * (P && P.drag ? .5 : 1); }; }
{ let trail = 0;
  onUpdate(() => {
    const c = P && P.drag; if (!c) return;
    if (mode !== 'play' || P.car || P.sleep || !corpses.includes(c)) { if (c) { P.drag = null; c.drag = false; c.fall = 1; stampQ.push({c}); } return; }
    P.running = false;
    const a = P.fd != null ? P.fd : P.face, tx = P.x - Math.cos(a) * .8, ty = P.y - Math.sin(a) * .8;
    const nx = c.x + (tx - c.x) * .35, ny = c.y + (ty - c.y) * .35;
    if (!wallHit(nx, ny)) { trail += Math.hypot(nx - c.x, ny - c.y); c.x = nx; c.y = ny; }
    else if (Math.hypot(P.x - c.x, P.y - c.y) > 2.2) { dropBody(); toast('Тело застряло — пришлось бросить'); return; }
    c.face = Math.atan2(P.y - c.y, P.x - c.x) + Math.PI; c.fall = .999;
    if (trail > 1.6) { trail = 0; if (rng() < .25) addBlood(c.x, c.y, .3); }
  });
}
// при загрузке/новой игре ничего не тащим
onLoad(() => { if (P) P.drag = null; for (const c of corpses) c.drag = false; });

// ---------- тело в доме воняет ----------
{ let t = 0, told = -1;
  onUpdate(dt => {
    if (!P || mode !== 'play' || paused || (t -= dt) > 0) return; t = 3;
    if (!insideHouse(P.x, P.y)) return;
    const hi = hAt[Math.floor(P.y) * MW + Math.floor(P.x)];
    let n = 0; for (const c of corpses) if (!c.drag && c.fall >= 1 && hAt[Math.floor(c.y) * MW + Math.floor(c.x)] === hi && insideHouse(c.x, c.y)) n++;
    if (!n) return;
    P.unh = Math.min(100, (P.unh || 0) + .25 * Math.min(3, n));
    if (told !== dayNo()) { told = dayNo(); toast(n > 1 ? 'В доме воняет мертвечиной. Вынеси тела на улицу' : 'В доме воняет мертвечиной. Вынеси тело на улицу'); }
  });
}

// ---------- отмыть кровь ----------
const bloodNear = r => decals.filter(d => Math.hypot(d.x - P.x, d.y - P.y) < r);
addActions(out => {
  if (!P || P.car || P.sleep || P.drag) return;
  const near = bloodNear(1.25); if (!near.length) return;
  if (cleanerIt() && countItem('rag')) out.push({kind:'scrub', label:'отмыть кровь', f:{type:'blood', cx:near[0].x, cy:near[0].y}});
  else if (insideHouse(P.x, P.y)) out.push({kind:'scrub', label:'отмыть кровь: нужны средство и тряпка', f:{type:'blood', cx:near[0].x, cy:near[0].y}});
});
defAction('scrub', {name:() => 'Кровь на полу', icon:() => 'i-drop', run:a => {
  if (busyH()) return; $('actMenu').hidden = true;
  if (!cleanerIt() || !countItem('rag')) { toast('Нужны отбеливатель или моющее средство и тряпка. Ищи под раковинами и у стиральных машин'); return; }
  job(4.5, () => {
    if (!cleanerIt() || !countItem('rag')) return;
    const gone = bloodNear(1.8); if (!gone.length) return;
    decals = decals.filter(d => !gone.includes(d));
    useCleaner(); if (rng() < .3) { removeItem('rag'); toast('Кровь отмыта. Тряпку пришлось выбросить'); } else toast('Кровь отмыта');
    unbake(P.x, P.y); renderInv(); P.unh = Math.max(0, (P.unh || 0) - 2);
  }, {loopAn:'work'});
}});
// окровавленная одежда: пока надета — портит настроение; застирать — средство и вода
{ const tb0 = tailorButtons;
  tailorButtons = function (it, worn) {
    const out = tb0.apply(this, arguments);
    if (it && it.blood) {
      const ok = !!cleanerIt() && waterOk();
      const b = btn(ok ? 'Застирать кровь' : 'Застирать: нужны средство и вода', () => job(4, () => {
        if (!cleanerIt() || !waterOk()) { toast('Не хватает средства или воды'); return; }
        useCleaner(); if (!nearTap()) { const w = P.inv.find(i => i.id === 'water'); if (w) w.id = 'bottle'; }
        it.blood = false; SFX.rustle(); toast('Застирано: ' + ITEMS[it.id].name.toLowerCase()); renderInv();
      }, {reopen:'items', sel:panel && panel.sel}), 'ghost');
      b.disabled = !ok; out.push(b);
    }
    if (it && WATCH_DAYS[it.id] && it.ch != null && it.ch < 99) {
      const ok = countItem('battery') > 0;
      const b = btn(ok ? 'Поменять батарейку' : 'Батарейки нет', () => { const k = P.inv.findIndex(i => i.id === 'battery'); if (k < 0) return; P.inv.splice(k, 1); it.ch = 100; toast('Часы снова идут'); renderInv(); updateHud(); }, 'ghost');
      b.disabled = !ok; out.push(b);
    }
    return out;
  };
}
{ let t = 0;
  onUpdate(dt => {
    if (!P || mode !== 'play' || (t -= dt) > 0) return; t = 5;
    let n = 0; for (const s in P.cloth || {}) { const c = P.cloth[s]; if (c && c.blood) n++; }
    if (n) P.unh = Math.min(100, (P.unh || 0) + .15 * n);
  });
}

// ---------- бумажник, кольцо, фото ----------
const RING_TXT = ['«Навсегда. Л. + С. 2009»', '«Маше от Вовы — до конца»', '«Ты мой дом»', '«17.08.1996»', '«С.А. и Н.В.»'];
const PHOTO_TXT = ['Двое детей на качелях, на обороте: «Дача, лето»', 'Свадьба, все смеются', 'Мужчина с огромной щукой', 'Пожилая пара у подъезда', 'Собака в новогодней шапке', 'Выпускной, девушка с лентой «Выпускница»'];
defUse(it => it.id === 'ring', () => { toast('Гравировка: ' + pick(RING_TXT)); P.unh = Math.max(0, (P.unh || 0) - 2); });
defUse(it => it.id === 'photo', () => { toast(pick(PHOTO_TXT) + '. Когда-то у кого-то была жизнь'); P.bored = Math.max(0, (P.bored || 0) - 4); });
defUse(it => it.id === 'wallet', (it, k) => {
  P.inv.splice(k, 1);
  const r = rng();
  if (r < .35) {                                                              // права с адресом: дом хозяина отмечен на карте, в нём заначка
    const hs = houses.filter(H => !['shed', 'garage', 'store', 'police', 'pharmacy', 'hardware', 'gas'].includes(H.kind) && !(typeof houseSearched === 'function' && houseSearched(H)) && Math.hypot((H.ix0 + H.ix1) / 2 - P.x, (H.iy0 + H.iy1) / 2 - P.y) > 8);
    const H = hs.length ? pick(hs) : null;
    if (H) {
      const x = Math.round((H.ix0 + H.ix1) / 2), y = Math.round((H.iy0 + H.iy1) / 2); world.marks = world.marks || []; world.marks.push({x, y});
      const fs = furns.filter(f => houseOf && houseOf(f) === H && CONT[f.type] && CONT[f.type].loot);
      if (fs.length) { const f = pick(fs); f.items = f.items || []; for (const id of ['canned', 'water', 'painkill'].filter(i => ITEMS[i])) f.items.push(mkItem(id)); }
      toast('В бумажнике права с адресом. Дом хозяина отмечен на карте — может, там что-то осталось');
    } else toast('В бумажнике права. Адрес — на другом конце области');
  } else if (r < .7) { P.inv.push(mkItem('photo')); toast('В бумажнике фотография. Забрал'); }
  else toast(pick(['Бумажник: немного денег. Теперь это просто бумага', 'Бумажник: скидочные карты и чек из аптеки', 'Бумажник пустой. Кто-то успел раньше']));
  renderInv();
});

// ---------- сохранение ----------
onSave(d => {
  d.xHome = {
    cor:corpses.slice(-80).map(c => c.items ? [c.items, c.searched ? 1 : 0, c.t || 0] : 0),
    obs:obs.map((o, i) => o && (o.reinf || o.film) ? [i, o.reinf || 0, o.film ? 1 : 0] : null).filter(Boolean),
  };
});
onLoad(d => {
  const x = d && d.xHome; if (!x) return;
  (x.cor || []).forEach((e, k) => { const c = corpses[k]; if (c && e) { c.items = e[0]; c.searched = !!e[1]; c.t = e[2]; c.type = 'corpse'; } });
  for (const [i, r, f] of x.obs || []) if (obs[i]) { obs[i].reinf = r; obs[i].film = !!f; }
});
