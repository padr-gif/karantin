// ================= events =================
function noise(x, y, rad) {
  for (const z of zs) {
    if (z.state === 'chase') continue;
    if (Math.hypot(z.x - x, z.y - y) < rad) { z.state = 'investigate'; z.tx = x; z.ty = y; z.it = 0; }
  }
}
function addBlood(x, y, s) {
  if (!settings.gore) return;
  const d = {x:x + (rng() - .5) * .4, y:y + (rng() - .5) * .4, r:s * (.5 + rng() * .5), a:.5 + rng() * .3, k:rng()};
  decals.push(d); stampQ.push({d});
  if (decals.length > 800) decals.shift();
}
function toast(text) {
  if (!text) return;
  const ev = eventFor(text); if (ev) { eventBanner(ev[0], text, ev[1], ev[2]); return; }
  const box = ntfBox();
  for (const t of box.children) if (t._text === text && !t._gone) { const u = t.querySelector('u'); if (u) { u.style.animation = 'none'; void u.offsetWidth; u.style.animation = ''; } t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump'); clearTimeout(t._tm); t._tm = setTimeout(() => dropNtf(t), ntfLife(text)); return; }
  const el = mk('div', 'ntf ' + ntfKind(text)); el._text = text;
  el.appendChild(svgIc(ntfIcon(text))); el.appendChild(mk('span', 'nt', text));
  const bar = mk('i', 'nbar'), u = mk('u'); u.style.animationDuration = ntfLife(text) + 'ms'; bar.appendChild(u); el.appendChild(bar);
  box.appendChild(el);
  while (box.children.length > 3) dropNtf(box.firstChild, true);
  el._tm = setTimeout(() => dropNtf(el), ntfLife(text));
}
function hurtPlayer(z) {
  if (godMode) return;
  if (P.car && P.car.hp > 0) { P.car.hp = Math.max(0, P.car.hp - 4); if ((P.carMsgT || 0) < gameMin) { P.carMsgT = gameMin + 20; toast(P.car.hp > 0 ? 'Мертвецы ломятся в машину! Корпус ' + Math.round(P.car.hp) + '%' : 'Стекло выбито!'); } SFX.knock(P.x, P.y); return; }
  if (panel && panel.kind === 'loot') { closePanel(); toast('На тебя напали! Обыск прерван'); }
  const brute = !!(z && z.brute), crawl = !!(z && z.crawl), part = crawl ? 'leg' : rollPart();
  const dmg = (6 + rng() * 7) * DIFF[world.diff].dmg * (brute ? 1.45 : 1) * (crawl ? .75 : 1);
  let arm = 1;
  if (P.armor && (part === 'torso' || (part === 'arm' && rng() < .4))) { arm = .5; P.armor.dur -= 6 + rng() * 4; if (P.armor.dur <= 0) { P.armor = null; toast('Бронежилет разорван в клочья'); } }
  P.stress = Math.min(100, (P.stress || 0) + 10); P.panic = Math.min(100, (P.panic || 0) + 12 * panicK());
  P.hp -= dmg * (arm < 1 ? .55 : 1); P.hurt = .45; lastCause = 'Загрызли';
  if (!P.act || (P.act.kind !== 'vault' && P.act.kind !== 'reload')) P.act = null;
  SFX.bite();
  if (P.sleep) wake('Тебя разбудили зубы мертвеца');
  if (!reduceMotion && settings.shake) shake = .35;
  addBlood(P.x, P.y, .5); emit('blood', P.x, P.y, 1.2, 6, null, 0, 1.8);
  const skin = hasTr('thick') ? .75 : hasTr('thin') ? 1.3 : 1;
  const roll = rng() / arm / (1 - partProt(part)) / skin;
  tearCloth(clothAt(part), roll < .4 ? 1.6 : 1);
  if (crawl) { P.grabT = 1.6; if ((P._grabMsg || 0) < gameMin) { P._grabMsg = gameMin + 60; toast('Ползун вцепился в ногу! Вырвись и отойди'); } }
  let w = null;
  if (roll < .1 && !P.inf) { P.inf = true; P.infT = 0; w = addWound('bite', part); toast('Укус: ' + w.where + '. Рана глубокая'); }
  else if (roll < .2) { w = addWound('deep', part); toast('Рваная рана: ' + w.where + '. Нужен бинт'); }
  else if (roll < .4) { w = addWound('scratch', part); toast('Царапина: ' + w.where); }
  const crowd = zs.filter(q => q.state === 'chase' && Math.hypot(q.x - P.x, q.y - P.y) < 1.3).length;
  if (!brute && crowd >= 3 && rng() < .04) { const f = addWound('frac', 'leg'); if (f) toast('Толпа сбила тебя с ног. Перелом: ' + f.where); }
  if (brute && rng() < .28) { const fp = rng() < .5 ? 'arm' : 'leg', f = addWound('frac', fp); if (f) { toast('Громила сломал тебе ' + (fp === 'leg' ? 'ногу' : 'руку') + '! Нужна шина'); SFX.wood(P.x, P.y); } }
  P.bleed = wounds().some(bleeding);
}
function damageOpening(i, dmg) {
  const o = obs[i]; if (!o) return;
  if (o.alarm) rattle(i);
  const near = Math.hypot((i % MW) + .5 - P.x, ((i / MW) | 0) + .5 - P.y) < 12;
  const ex = (i % MW) + .5, ey = ((i / MW) | 0) + .5;
  if (o.bhp > 0 || o.t === 'door') { emit('wood', ex, ey, 1, 3, null, 0, 1.5); SFX.knock(ex, ey); }
  if (o.bhp > 0) {
    const before = Math.ceil(o.bhp / 45);
    o.bhp = Math.max(0, o.bhp - dmg);
    if (Math.ceil(o.bhp / 45) < before && near) toast(o.bhp > 0 ? 'Мертвецы отрывают доски' : 'Баррикада сломана');
  } else if (o.t === 'door' && !o.open) {
    o.hp -= dmg;
    if (o.hp <= 0) { o.dead = true; o.open = true; SFX.wood(ex, ey); if (near) toast('Дверь выбита'); }
  } else if (o.t === 'win' && !o.broken) {
    o.ghp -= dmg;
    if (o.ghp <= 0) { o.broken = true; SFX.glass(ex, ey); emit('glass', ex, ey, 1.2, 16, null, 0, 2); noise((i % MW) + .5, ((i / MW) | 0) + .5, 9); if (near) toast('Звон стекла'); }
  }
}
function hasTool(id) { return (P.weapon && P.weapon.id === id) || P.inv.some(i => i.id === id); }
function countItem(id) { return P.inv.filter(i => i.id === id).length; }
function removeItem(id) { const k = P.inv.findIndex(i => i.id === id); if (k >= 0) P.inv.splice(k, 1); }
const powerOn = () => gameMin < powerOffAt;
const waterOn = () => gameMin < waterOffAt;
const isRotten = it => it.rot != null && gameMin > it.rot;
const flashlight = () => P.inv.find(i => (i.id === 'flashlight' || i.id === 'candle') && i.on && i.ch > 0);

// удар (или выстрел); кулаки чередуются — правой, левой
function attack() { const t0 = P.atkT; attackSwing(); if (P.atkT === 0 && t0 !== 0) P._altHand = !P._altHand; }
function attackSwing() {
  if (P.car) { honk(); return; }
  if (mode !== 'play' || paused || panel || P.sleep || P.cd > 0) return;
  if (P.act && P.act.kind === 'reload') return;
  const W0 = P.weapon ? ITEMS[P.weapon.id] : FISTS;
  if (W0.gun) {
    if (P.weapon.mag > 0) { shoot(W0); return; }
    if (ammoFor(P.weapon).length) { startReload(); return; }
    if ((P._clickT || 0) < animT) { P._clickT = animT + 3; SFX.click(); toast('Патронов нет: остаётся бить прикладом'); }
  }
  const w = W0.gun ? {dmg:W0.melee, range:.95, cd:.6, cleave:1} : W0;
  P.cd = w.cd * (P.en < 15 ? 1.3 : 1) * (1 + (P.panic || 0) / 300) * (fracAt('arm') ? 1.25 : 1); P.swing = .2; P.act = null; P.atkT = 0; P.atkDur = Math.max(.28, w.cd * .75);
  SFX.swing(w.dmg > 30);
  if (!mouseAim) {
    let near = null, nd = w.range + .9;
    for (const z of zs) { const d = Math.hypot(z.x - P.x, z.y - P.y); if (d < nd && los(P.x, P.y, z.x, z.y)) { nd = d; near = z; } }
    if (near) P.face = Math.atan2(near.y - P.y, near.x - P.x);
  }
  const hits = [];
  for (const z of zs) {
    const dx = z.x - P.x, dy = z.y - P.y, d = Math.hypot(dx, dy);
    if (d > w.range + z.r) continue;
    let a = Math.atan2(dy, dx) - P.face; a = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(a) < 1.0 && los(P.x, P.y, z.x, z.y)) hits.push([d, z]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  let n = Math.min(w.cleave, hits.length), quiet = n > 0;
  if (n && rng() < missChance()) { n = 0; quiet = false; if ((P._missT || 0) < animT) { P._missT = animT + 4; toast((P.panic || 0) > 50 ? 'Мимо! Руки трясутся от страха' : 'Мимо!'); } }
  for (let i = 0; i < n; i++) {
    const z = hits[i][1], dx = z.x - P.x, dy = z.y - P.y;
    const unaware = z.state !== 'chase' && !((z.aw || 0) > .7);
    const behind = Math.abs(wrapA(Math.atan2(P.y - z.y, P.x - z.x) - z.face)) > 1.9;
    const sneakHit = unaware && (P.sneak || behind);
    let dmg = w.dmg * (.85 + rng() * .3) * (P.en < 15 ? .7 : 1) * (1 + .06 * skillLv('fight')) * ((P.stress || 0) > 60 ? .85 : 1) * dmgK();
    if (rng() < .12) dmg *= 2;
    if (sneakHit) { dmg *= z.brute ? 2.2 : P.sneak ? 4 : 2.5; if (!world.snkMsg) { world.snkMsg = true; toast('Удар со спины! Мертвецы, которые тебя не видят, получают в разы больше урона'); } }
    else quiet = false;
    z.hp -= dmg; SFX.hit(w.dmg > 30, z.x, z.y);
    const l = Math.hypot(dx, dy) || 1;
    z.kx = dx / l * 3.2; z.ky = dy / l * 3.2; z.stun = .45; z.state = 'chase'; z.lost = 0; z.aw = 0;
    z.pal.blood = Math.min(5, z.pal.blood + 1);
    addBlood(z.x, z.y, .45); emit('blood', z.x, z.y, 1.2, 7, Math.atan2(dy, dx), 1.3, 2.4);
    if (z.hp <= 0) {
      corpses.push({x:z.x, y:z.y, face:z.face, pal:z.pal, fall:0, dir:-1, seed:z.seed}); emit('blood', z.x, z.y, 1, 10, Math.atan2(dy, dx), 1.6, 2.8);
      if (corpses.length > 120) corpses.shift();
      addBlood(z.x, z.y, .9);
      zs.splice(zs.indexOf(z), 1); kills++; SFX.splat(z.x, z.y); addXp('fight', 1); onZDeath(z);
      if (sneakHit) { stat('sneakk'); if (((P.stats && P.stats.sneakk) || 0) >= 5) ach('ninja'); }
    } else quiet = false;
  }
  if (!n && !hits.length) {
    const tx = Math.floor(P.x + Math.cos(P.face) * .8), ty = Math.floor(P.y + Math.sin(P.face) * .8), i = ty * MW + tx;
    if (get(tx, ty) === WIN && !obs[i].broken && !obs[i].bhp) {
      obs[i].broken = true; noise(P.x, P.y, 9); toast('Окно разбито'); SFX.glass(tx + .5, ty + .5); emit('glass', tx + .5, ty + .5, 1.2, 16, P.face, 1.6, 2.2);
      if (!P.weapon) glassCut(.5, 'Разбил стекло кулаком и порезался');
    }
  }
  if (n && P.weapon) {
    P.weapon.dur--;
    if (P.weapon.dur <= 0) { toast('Сломалось: ' + ITEMS[P.weapon.id].name); P.weapon = null; }
  }
  P.en = Math.max(0, P.en - .7);
  noise(P.x, P.y, quiet ? 2.2 : 6.5); if (!quiet) scareCrows(P.x, P.y, 7);
}

function nearOpenings() {
  const out = [], cx = Math.floor(P.x), cy = Math.floor(P.y);
  for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
    const t = get(x, y); if (t !== DOOR && t !== WIN) continue;
    const d = Math.hypot(x + .5 - P.x, y + .5 - P.y);
    if (d < 1.2) out.push({x, y, i:y * MW + x, d});
  }
  return out.sort((a, b) => a.d - b.d);
}
function getAction(excl) {
  if (P.car) return {kind:'exit', label:Math.abs(P.car.v) > 2 ? 'тормози' : 'выйти из машины', f:P.car};
  let best = null, bd = 1.15;
  for (const f of furns) {
    if (f.gone) continue;
    if (Math.abs(f.cx - P.x) > 2.6 || Math.abs(f.cy - P.y) > 2.6) continue;
    // distance to the nearest edge, so a long bed or sofa can be used from any side
    const qx = clamp(P.x, f.r[0], f.r[2]), qy = clamp(P.y, f.r[1], f.r[3]), d = Math.hypot(qx - P.x, qy - P.y) + .42;
    if (d >= bd || (excl && excl.has(f))) continue;
    if (!reachOK(qx, qy)) continue;
    let a = null;
    if (f.type === 'bed') a = {kind:'sleep', label:'Спать', f};
    else if (f.type === 'sink') a = {kind:'sink', label:'Попить', f};
    else if (f.type === 'stove') a = {kind:'cook', label:'Готовить', f};
    else if (f.type === 'toilet') { if (waterOn()) f.w = 4; a = {kind:'toilet', label:f.w >= 1 ? 'попить из бачка (' + Math.floor(f.w) + ')' : 'бачок пуст', f}; }
    else if (f.type === 'bath') a = {kind:'sink', label:'Попить из крана', f};
    else if (f.type === 'sofa') a = {kind:'sleep', label:'Прилечь на диван', f};
    else if (f.type === 'tv') a = {kind:'tv', label:poweredAt(f.cx, f.cy) ? 'смотреть новости' : 'нет электричества', f};
    else if (CONT[f.type].loot) a = f.searched ? {kind:'open', label:'Открыть', f} : {kind:'search', label:'Обыскать', f};
    if (a) { best = a; bd = d; }
  }
  for (const p of props) {
    if (Math.abs(p.cx - P.x) > 4 || Math.abs(p.cy - P.y) > 4) continue;
    if (p.type !== 'car' && p.type !== 'barrel' && p.type !== 'gen' && p.type !== 'pump' && p.type !== 'gbed' && p.type !== 'trap' && p.type !== 'bin' && p.type !== 'mail') continue;
    const qx = clamp(P.x, p.r[0], p.r[2]), qy = clamp(P.y, p.r[1], p.r[3]), d = Math.hypot(P.x - qx, P.y - qy) + (p.type === 'car' || p.type === 'barrel' ? .45 : .15);
    if (d >= bd || (excl && excl.has(p)) || p.dead) continue;
    if (!reachOK(qx, qy)) continue;
    let a = null;
    if (p.type === 'car') {
      const ca = carAng(p), rear = ((P.x - p.cx) * Math.cos(ca) + (P.y - p.cy) * Math.sin(ca)) < -.35;
      if (!p.searched) a = {kind:'search', label:'Обыскать', f:p};
      else if (rear) a = {kind:'open', label:'Открыть багажник', f:p};
      else if (p.fuel < 95 && fuelCans().length) a = {kind:'carfuel', label:'залить бензин (' + Math.round(p.fuel) + '%)', f:p};
      else if (p.key) a = {kind:'drive', label:'сесть за руль', f:p};
      else a = {kind:'hotwire', label:hasTool('knife') || hasTool('crowbar') ? 'завести без ключа' : 'нет ключей', f:p};
    }
    else if (p.type === 'bin' || p.type === 'mail') a = !p.searched ? {kind:'search', label:'Обыскать', f:p} : {kind:'open', label:'Открыть', f:p};
    else if (p.type === 'barrel') a = p.w >= 1 ? {kind:'barrel', label:'Попить (' + Math.floor(p.w) + ' л)', f:p} : {kind:'none', label:'Пусто, ждём дождя', f:p};
    else if (p.type === 'gen') a = p.fuel < 92 && fuelCans().length ? {kind:'refuel', label:'залить бензин (' + Math.round(p.fuel) + '%)', f:p} : {kind:'gen', label:(p.on ? 'выключить' : 'включить') + ' (' + Math.round(p.fuel) + '%)', f:p};
    else if (p.type === 'pump') a = P.inv.some(i => i.id === 'jerrycan') ? {kind:'pumpfill', label:'налить в канистру', f:p} : {kind:'info', label:'нужна канистра', f:p};
    else if (p.type === 'trap') a = {kind:'trapget', label:p.armed ? 'забрать капкан' : 'забрать сработавший капкан', f:p};
    else if (p.type === 'gbed') a = !p.crop ? {kind:'plant', label:countItem('seeds') ? 'посадить семена' : 'нужны семена', f:p} : p.g >= 1 ? {kind:'harvest', label:'собрать урожай', f:p} : (p.w < .4 && waterSource()) ? {kind:'waterbed', label:'полить', f:p} : {kind:'info', label:'растёт ' + Math.round(p.g * 100) + '%' + (p.w <= 0 ? ', сухо' : ''), f:p};
    if (a) { best = a; bd = d; }
  }
  for (const pl of piles) {
    if (!pl.items.length || (excl && excl.has(pl))) continue;
    const d = Math.hypot(pl.x - P.x, pl.y - P.y);
    if (d >= Math.min(bd, 1.0)) continue;
    if (!reachOK(pl.x, pl.y)) continue;
    best = {kind:'pile', label:pl.items.length === 1 ? 'поднять: ' + ITEMS[pl.items[0].id].name.toLowerCase() : 'вещи (' + pl.items.length + ')', f:pl}; bd = d;
  }
  for (const fi of fires) {
    if (excl && excl.has(fi)) continue;
    const d = Math.hypot(fi.x - P.x, fi.y - P.y);
    if (d >= Math.max(bd, 1.3)) continue;
    if (!reachOK(fi.x, fi.y)) continue;
    best = {kind:'cook', label:'Готовить', f:fi}; bd = d;
  }
  for (const o of nearOpenings()) {
    if (o.d >= bd + .1) continue;
    const ob = obs[o.i];
    let cands;
    if (ob.t === 'win') cands = windowActions(o);
    else { cands = []; if (ob.bhp > 0) cands.push({kind:'unbar', label:'Оторвать доску', o}); else if (!ob.dead) cands.push(ob.locked && !ob.open ? {kind:'locked', label:hasTool('crowbar') ? 'взломать ломом' : 'заперто', o} : {kind:'door', label: ob.open ? 'Закрыть' : 'Открыть', o}); const al = doorAlarmAction(o); if (al) cands.push(al); }
    for (const a of cands) { if (excl && excl.has(a.tk || ob)) continue; best = a; bd = o.d; break; }
  }
  if (!best) { const fa = forageAction(excl); if (fa) best = fa; }
  if (!best && excl && excl.size && !excl.has('w')) excl.add('w');
  else if (!best && nearWater()) best = hasTool('rod') ? {kind:'fish', label:'рыбачить', f:{type:'pond', cx:P.x, cy:P.y}} : {kind:'pond', label:'попить из пруда', f:{type:'pond', cx:P.x, cy:P.y}};
  if (!best && (world.snow || 0) > .3 && !insideHouse(P.x, P.y) && P.inv.some(i => i.id === 'bottle')) best = {kind:'snow', label:'набрать снега в бутылки', f:{type:'snow', cx:P.x, cy:P.y}};
  if (best && best.kind === 'unbar' && best.o && obs[best.o.i].mhp > 0) best = {kind:'unmetal', label:'снять лист металла', o:best.o};
  if (best || P.car) return best;
  best = extraAction(excl); if (best) return best;                            // машины, приманки, таблички… (XACT)
  best = null; bd = 1.15;                                                     // раковина в ванной
  for (const f of furns) {
    if (f.gone || f.type !== 'bsink' || (excl && excl.has(f))) continue;
    const qx = clamp(P.x, f.r[0], f.r[2]), qy = clamp(P.y, f.r[1], f.r[3]), d = Math.hypot(qx - P.x, qy - P.y) + .42;
    if (d < bd && reachOK(qx, qy)) { best = {kind:'sink', label:'Попить', f}; bd = d; }
  }
  return best;
}
function getBarricade() {
  if (!hasTool('hammer') || !countItem('plank')) return null;
  for (const o of nearOpenings()) if (obs[o.i].bhp < 135) return o;
  return null;
}
function cellOccupied(x, y) {
  const near = e => Math.hypot(e.x - x - .5, e.y - y - .5) < .55;
  return near(P) || zs.some(near);
}
// выполнить действие (a0 — из списка; без него — главное действие рядом)
function doAction(a0) {
  const d = a0 && ACT[a0.kind];
  if (d && d.run) return d.run(a0);                                // своё действие механики (лазать, душ, свет, тайник, кошка, грядка…)
  const was = P && P.act;
  doActionMain(a0);
  const A = P && P.act;                                             // начался обыск — звук открывания и шуршания
  if (A && A !== was && A.kind === 'search' && A.f) { SFX.contOpen(A.f.type); SFX.rummage(A.f.type); sndOpened = [A.f, performance.now()]; }
}
function doActionMain(a0) {
  if (mode !== 'play' || paused || panel || P.sleep) return;
  const a = a0 || getAction(); if (!a) return;
  if (a.o && ((a.kind === 'door' && obs[a.o.i].open) || (a.kind === 'window' && obs[a.o.i].open))) {   // закрыть проём, где кто-то стоит, нельзя
    const r = clearDoorway(a.o);
    if (r === 'z') { toast('В проёме мертвец, не закрыть'); return; }
    if (r === 'stuck') { toast('Отойди от проёма'); return; }
  }
  const h = XACT[a.kind];                                          // действия из таблицы XACT (v23: машины, приманки, таблички…)
  if (h) { $('actMenu').hidden = true; goTo = null; h(a); return; }
  doActionBase(a);
  if (a.kind === 'tv' && poweredAt(a.f.cx, a.f.cy)) P.unh = Math.max(0, (P.unh || 0) - 6);
}
function doActionBase(a0) {
  if (mode !== 'play' || paused || panel || P.sleep) return;
  $('actMenu').hidden = true; goTo = null;
  const a = a0 || getAction(); if (!a) return;
  if (winAction(a)) return;
  if (a.kind === 'forage') { doForage(a); return; }
  if (a.kind === 'alarm' && a.o) { const ob = obs[a.o.i]; removeItem('cansalarm'); ob.alarm = true; SFX.rustle(); toast('Банки висят на двери. Если её начнут ломать, услышишь'); renderInv(); return; }
  if (a.kind === 'unalarm' && a.o) { const ob = obs[a.o.i]; ob.alarm = false; if (!invFull()) P.inv.push(mkItem('cansalarm')); else addToPile(P.x, P.y, mkItem('cansalarm')); SFX.rustle(); toast('Банки сняты'); renderInv(); return; }
  if (a.kind === 'search') { if (!a.f.items && CONT[a.f.type]) { a.f.items = []; const c = CONT[a.f.type]; for (let n = ri(c.n[0], c.n[1]); n > 0; n--) a.f.items.push(mkItem(pick(c.loot))); } P.act = {kind:'search', t:0, dur:a.f.type === 'car' ? .8 : .5, f:a.f}; SFX.rustle(); }
  else if (a.kind === 'cook') openPanel('cook', {src:a.f});
  else if (a.kind === 'open') openPanel('loot', {src:a.f});
  else if (a.kind === 'feed') { removeItem('plank'); a.f.t += 150; toast('Костёр разгорелся сильнее'); emit('wood', a.f.x, a.f.y, .6, 4, null, 0, 1); renderInv(); }
  else if (a.kind === 'barrel') {
    const b = a.f; let used = 0;
    while (P.hyd < 95 && b.w >= 1) { P.hyd = Math.min(100, P.hyd + 35); b.w -= 1; used++; }
    if (used && rng() < .25) { P.pois = Math.max(P.pois, 90); toast('Сырая вода. Живот крутит'); }
    let n = 0; for (const it of P.inv) if (it.id === 'bottle' && b.w >= 1) { it.id = 'waterD'; b.w -= 1; n++; }
    if (used || n) SFX.drink();
    toast((used ? 'Напился из бочки' : 'Пить не хочется') + (n ? `, набрал ${n} бут.` : ''));
    renderInv();
  }
  else if (a.kind === 'none') toast('Бочка пустая. Вода наберётся во время дождя');
  else if (a.kind === 'info') toast(CONT[a.f.type].name + ': ' + a.label);
  else if (a.kind === 'exit') exitCar();
  else if (a.kind === 'snow') { let n = 0; for (const it of P.inv) if (it.id === 'bottle') { it.id = 'waterD'; n++; } SFX.rustle(); toast(`Набрал снега: ${n} бут. Растопи и вскипяти в кастрюле`); }
  else if (a.kind === 'move') moveFurn(a.f);
  else if (a.kind === 'fish') P.act = {kind:'fish', t:0, dur:10 + rng() * 6};
  else if (a.kind === 'pond') { let used = 0; while (P.hyd < 90) { P.hyd = Math.min(100, P.hyd + 30); used++; } if (used && rng() < .35) { P.pois = Math.max(P.pois, 100); toast('Вода из пруда. Живот крутит'); } let n = 0; for (const it of P.inv) if (it.id === 'bottle') { it.id = 'waterD'; n++; } SFX.drink(); toast((used ? 'Попил прудовой воды' : 'Пить не хочется') + (n ? `, набрал ${n} бут.` : '')); }
  else if (a.kind === 'toilet') { const t = a.f; if (t.w < 1) { toast('Бачок пуст'); return; } let used = 0; while (P.hyd < 90 && t.w >= 1) { P.hyd = Math.min(100, P.hyd + 25); t.w -= 1; used++; } for (const it of P.inv) { if (t.w < 1) break; if (it.id === 'bottle') { it.id = 'water'; t.w -= 1; } else if (ITEMS[it.id].kind === 'canteen') while ((it.w || 0) < wcap(it) && t.w >= 1) { it.w = (it.w || 0) + 1; t.w -= 1; } } SFX.drink(); toast(used ? 'Попил из бачка. Вода чистая' : 'Набрал воды из бачка'); renderInv(); }
  else if (a.kind === 'tv') { if (!poweredAt(a.f.cx, a.f.cy)) { toast('Без электричества телевизор не включить'); return; } SFX.radio(); P.bored = Math.max(0, (P.bored || 0) - 25); openPanel('radio', {it:{ch:100}, tv:true, news:radioNews()}); }
  else if (a.kind === 'trapget') { if (invFull()) { toast('Слишком тяжело — не унести'); return; } const t = a.f, i = props.indexOf(t) + 1; for (let q = 0; q < NT; q++) if (propAt[q] === i) propAt[q] = 0; t.dead = true; traps = traps.filter(x => x !== t); P.inv.push(mkItem('trap')); toast('Капкан в рюкзаке'); }
  else if (a.kind === 'drive') enterCar(a.f);
  else if (a.kind === 'carfuel') { const c = a.f; for (const j of fuelCans()) { const m = Math.min(j.fuel, 100 - c.fuel); j.fuel -= m; c.fuel += m; if (c.fuel >= 100) break; } SFX.drink(); toast('Бак машины: ' + Math.round(c.fuel) + '%'); }
  else if (a.kind === 'hotwire') { if (!hasTool('knife') && !hasTool('crowbar')) { toast('Ключей нет. Чтобы завести без ключа, нужен нож или лом'); return; } P.act = {kind:'hotwire', t:0, dur:5, f:a.f}; }
  else if (a.kind === 'gen') { const g = a.f; if (!g.on && g.fuel <= 0) { toast('В баке нет бензина'); return; } g.on = !g.on; if (g.on) ach('gen'); SFX.knock(g.cx, g.cy); toast(g.on ? 'Генератор работает: рядом есть свет и плита. Он шумит!' : 'Генератор выключен'); }
  else if (a.kind === 'refuel') { const g = a.f; for (const c of fuelCans()) { const m = Math.min(c.fuel, 100 - g.fuel); c.fuel -= m; g.fuel += m; if (g.fuel >= 100) break; } SFX.drink(); toast('Бак генератора: ' + Math.round(g.fuel) + '%'); }
  else if (a.kind === 'pumpfill') { if (!powerOn()) { toast('Колонка не работает без электричества'); return; } let n = 0; for (const c of P.inv) if (c.id === 'jerrycan' && c.fuel < 100) { c.fuel = 100; n++; } SFX.drink(); noise(P.x, P.y, 3); toast(n ? `Наполнено канистр: ${n}` : 'Канистры уже полные'); }
  else if (a.kind === 'plant') { const sd = P.inv.find(i => i.id === 'seeds'); if (!sd) { toast('Нужны семена'); return; } sd.uses--; if (sd.uses <= 0) P.inv.splice(P.inv.indexOf(sd), 1); const b = a.f; b.crop = pick(['carrot', 'potato', 'cabbage']); b.g = 0; b.dry = 0; SFX.rustle(); toast('Посажено: ' + ITEMS[b.crop].name.toLowerCase() + '. Не забывай поливать'); }
  else if (a.kind === 'waterbed') { const w = waterSource(); if (w.id === 'water') w.id = 'bottle'; else w.w--; a.f.w = 1; SFX.drink(); toast('Грядка полита'); }
  else if (a.kind === 'harvest') { const b = a.f, n = ri(2, 3) + Math.floor(skillLv('farm') / 2); let got = 0; for (let k = 0; k < n; k++) { const it = mkItem(b.crop); it.rot = gameMin + 2880; if (!invFull()) { P.inv.push(it); got++; } else addToPile(b.cx, b.cy, it); } toast(`Урожай: ${ITEMS[b.crop].name.toLowerCase()} ×${n}` + (got < n ? ' (часть на земле)' : '')); b.crop = null; b.g = 0; addXp('farm', 3); ach('harvest'); SFX.rustle(); }
  else if (a.kind === 'take') takeItems(a.f);
  else if (a.kind === 'pile') P.act = {kind:'pickup', t:0, dur:.75, f:a.f};
  else if (a.kind === 'sleep') startSleep(a.f);
  else if (a.kind === 'sink') {
    if (!waterOn()) { toast('Из крана ничего не течёт'); return; }
    P.hyd = 100; let n = 0;
    for (const it of P.inv) if (it.id === 'bottle') { it.id = 'water'; n++; }
    let cn = 0; for (const it of P.inv) if (ITEMS[it.id].kind === 'canteen' && (it.w || 0) < wcap(it)) { it.w = wcap(it); cn++; }
    SFX.drink();
    toast((n ? `Напился и набрал воды: ${n} бут.` : 'Напился воды') + (cn ? `, фляг: ${cn}` : ''));
    noise(P.x, P.y, 2);
  }
  else if (a.kind === 'locked') { if (!hasTool('crowbar')) { toast('Заперто. Нужен лом — или разбей окно'); SFX.knock(P.x, P.y); return; } P.act = {kind:'pry', t:0, dur:3, o:a.o}; }
  else if (a.kind === 'door') {
    const ob = obs[a.o.i];
    if (ob.open && cellOccupied(a.o.x, a.o.y)) { toast('В проёме кто-то стоит'); return; }
    ob.open = !ob.open; noise(P.x, P.y, 2.5); SFX.door(ob.open);
  }
  else if (a.kind === 'unbar') {
    if (!hasTool('hammer')) { toast('Нужен молоток'); return; }
    P.act = {kind:'unbar', t:0, dur:2.2, o:a.o};
  }
}
function doBarricade() {
  if (mode !== 'play' || paused || panel || P.sleep || P.car) return;
  const o = getBarricade();
  if (!o) { toast(hasTool('hammer') ? (countItem('plank') ? 'Подойди к окну или двери' : 'Нужны доски') : 'Нужен молоток и доски'); return; }
  P.act = {kind:'bar', t:0, dur:2.5 * (1 - .08 * skillLv('carp')), o};
}
function hasCookable() { return P.inv.some(it => ITEMS[it.id].raw); }
function nearTap() { return waterOn() && furns.some(f => f.type === 'sink' && Math.hypot(f.cx - P.x, f.cy - P.y) < 3); }
function cook(src) {
  if (src.type === 'fire' && src.t <= 0) { toast('Костёр погас'); return; }
  if (src.type === 'stove' && !powerOn()) { toast('Электричества нет'); return; }
  const pot = hasTool('pot'), pan = hasTool('pan');
  let water = false; const done = [], miss = new Set();
  for (const it of P.inv) {
    const d = ITEMS[it.id]; if (!d.raw) continue;
    if (it.id === 'meat') { if (!pan) { miss.add('сковорода'); continue; } }
    else {
      if (!pot) { miss.add('кастрюля'); continue; }
      if (!water) {
        if (nearTap()) water = true;
        else { const w = P.inv.find(i => i.id === 'water'); if (w) { w.id = 'bottle'; water = true; } }
      }
      if (!water) { miss.add('вода'); continue; }
    }
    const nm = d.raw; done.push(ITEMS[nm].name); it.id = nm;
    if (ITEMS[nm].rot) it.rot = gameMin + 1440; else delete it.rot;
  }
  noise(P.x, P.y, 3);
  if (done.length) toast('Готово: ' + [...new Set(done)].join(', '));
  if (miss.size) toast('Не хватает: ' + [...miss].join(', '));
  renderInv();
}
// действие дошло до конца (полоска заполнилась)
function finishAct(a) {
  if (a.kind === 'bar' && a.o && obs[a.o.i].t === 'door' && obs[a.o.i].open) { const r = clearDoorway(a.o); if (r === 'z') { toast('В проёме мертвец'); return; } }
  if (a.kind === 'job') {
    a.fn();
    if (a.reopen && mode === 'play' && !P.act && !paused && !P.sleep) { openPanel('inv', a.sub ? {sub:a.sub} : null); panel.tab = a.reopen; if (a.sel !== undefined) panel.sel = a.sel; if (a.part !== undefined) panel.part = a.part; renderPanel(); }
    return;
  }
  if (a.kind === 'reload') { finishReload(a); return; }
  if (a.kind === 'hotwire') {
    if (rng() < .38 + .12 * skillLv('mech') + .03 * skillLv('carp')) { a.f.key = true; toast('Провода соединены: машина заведётся'); addXp('mech', 2); }
    else { noise(P.x, P.y, 6); addXp('mech', .5); toast('Не вышло. Попробуй ещё раз'); }
    return;
  }
  if (a.kind === 'vault') { finishVault(a); return; }
  if (a.kind === 'forage') { finishForage(a); return; }
  if (a.kind === 'dismantle') { finishDismantle(a); return; }
  if (a.kind === 'cookx') { a.fn(); return; }
  if (a.kind === 'furn') { finishFurn(a); return; }
  if (a.kind === 'fish') { if (rng() < .5 + .05 * skillLv('farm')) { if (!invFull()) P.inv.push(mkItem('fish')); else addToPile(P.x, P.y, mkItem('fish')); stat('fish'); ach('fish'); toast('Клюёт! Поймал карася'); addXp('farm', 1); } else toast('Сорвалась. Попробуй ещё'); SFX.rustle(); return; }
  if (a.kind === 'pry') { const ob = obs[a.o.i]; ob.locked = false; ob.open = true; ob.ang = 1; noise(P.x, P.y, 9); SFX.wood(a.o.x, a.o.y); toast('Дверь взломана'); addXp('carp', 1); return; }
  if (a.kind === 'use') { finishUse(a); return; }
  if (a.kind === 'pickup') { pickFromPile(a.f); return; }
  if (a.kind === 'search') { if (a.f.air) ach('drop'); a.f.searched = true; { const H = furns.includes(a.f) && houseOf(a.f); if (H && !H._done && houseSearched(H)) toast('✓ Дом обыскан полностью. Отмечено на карте'); } noise(P.x, P.y, a.f.type === 'car' ? 4 : 2.5); openPanel('loot', {src:a.f}); if (a.f.type === 'car') toast(a.f.key ? 'В замке зажигания торчат ключи! Бензин: ' + Math.round(a.f.fuel) + '%' : 'Ключей нет. Бензин: ' + Math.round(a.f.fuel) + '%'); }
  else if (a.kind === 'cook') cookRecipe(a.rc, a.n, a.src);
  else if (a.kind === 'bar') {
    const ob = obs[a.o.i];
    if (!countItem('plank')) return;
    if (ob.t === 'door' && ob.open && !ob.dead) { if (cellOccupied(a.o.x, a.o.y)) { toast('В проёме кто-то стоит'); return; } ob.open = false; }
    removeItem('plank'); SFX.hammer(); ob.bhp = Math.min(135 + 15 * skillLv('carp'), ob.bhp + 45 + 5 * skillLv('carp')); addXp('carp', 1); emit('wood', a.o.x + .5, a.o.y + .5, 1, 5, null, 0, 1.4);
    noise(P.x, P.y, 10);
    toast(`Заколочено: ${Math.ceil(ob.bhp / 45)}/3 доски`);
    renderInv();
  }
  else if (a.kind === 'unbar') {
    const ob = obs[a.o.i];
    ob.bhp = Math.max(0, ob.bhp - 45); noise(P.x, P.y, 6); SFX.wood(a.o.x, a.o.y); emit('wood', a.o.x + .5, a.o.y + .5, 1, 6, null, 0, 1.6);
    if (rng() < .7 && !invFull()) { P.inv.push(mkItem('plank')); toast('Доска оторвана и цела'); }
    else toast('Доска раскололась');
    renderInv();
  }
}
function takeItems(c) {
  const got = [];
  while (c.items.length && !invFull()) {
    const it = c.items.shift();
    if (ITEMS[it.id].rot && it.rot == null) it.rot = powerOn() ? gameMin + 2160 : powerOffAt + 900;
    if (ITEMS[it.id].kind === 'weapon' && !P.weapon) { P.weapon = it; got.push(ITEMS[it.id].name + ' (в руках)'); }
    else { P.inv.push(it); got.push(ITEMS[it.id].name); }
  }
  if (got.length) toast('Найдено: ' + got.join(', '));
  else if (!c.items.length) toast(CONT[c.type].name + ': пусто');
  if (c.items.length) toast('Слишком тяжело — не унести');
  renderInv();
}
function startSleep(bed) {
  if (P.en > 75) { toast('Пока не хочется спать'); return; }
  if (zs.some(z => z.state === 'chase' && Math.hypot(z.x - P.x, z.y - P.y) < 14)) { toast('Нельзя спать: мертвецы рядом'); return; }
  P.sleep = true; P.bed = bed || null; P.act = null; joy.id = null; joy.x = joy.y = 0; $('stick').hidden = true;
  $('sleep').hidden = false; $('ctrl').hidden = true; sleepAlarmUI();
}
function wake(msg) {
  if (!P.sleep) return;
  P.sleep = false; $('sleep').hidden = true; $('ctrl').hidden = false;
  if (msg) toast(msg);
}

// применить вещь: особые вещи (defUse) — своим способом, остальные — по виду (еда, оружие, одежда…)
function useItem(id, idx) {
  const k = idx != null ? idx : P.inv.findIndex(i => i.id === id);
  const it = P.inv[k]; if (!it) return;
  const d = ITEMS[it.id], hp0 = P.hp;
  let sp = null; for (let i = USE.length - 1; i >= 0 && !sp; i--) if (USE[i].test(it, d)) sp = USE[i];
  if (sp) sp.fn(it, k, d); else useItemPlain(it, k, d);
  const q = uniqOf(it); if (q && q.u === 'medkit' && P.hp > hp0) P.hp = Math.min(100, P.hp + 20);   // аптечка скорой лечит сильнее
}
// обычное применение и его последствия: настроение, боль, простуда, желудок
function useItemPlain(it, k, d) {
  const pois0 = P.pois || 0, hp0 = P.hp, bad = isRotten(it), raw = it.id === 'mushroom';
  if (P.flu > 0 && ['painkill', 'vitamins', 'pills', 'thermos', 'antibio'].includes(it.id)) { P.flu = Math.max(0, P.flu - 480); toast(P.flu > 0 ? 'Полегчало, насморк слабее' : 'Простуда отступила'); }
  useItemBase(it, k, d);
  if (d.calm) P.stress = Math.max(0, (P.stress || 0) - d.calm);
  if (d.warm) P.cold = Math.max(0, (P.cold || 0) - 30);
  if (raw && skillLv('farm') < 2 && rng() < .3) { P.pois = Math.max(P.pois || 0, 140); P.hp -= 6; lastCause = 'Отравление грибами'; toast('Грибы оказались ядовитыми. Мутит'); }   // сырые грибы — риск
  if (it.id === 'pills' || it.id === 'painkill') { P.painkT = Math.max(P.painkT || 0, it.id === 'painkill' ? 420 : 300); toast('Боль притупилась'); }
  if (it.id === 'vodka' || it.id === 'whiskey') P.painkT = Math.max(P.painkT || 0, 90);
  if (it.id === 'antibio') for (const w of wounds()) w.sep = Math.max(0, w.sep - 60);
  if (d.kind === 'smoke') { P.smokeT = 0; P._smokeMsg = 0; }
  if (d.kind === 'fun') P.unh = Math.max(0, (P.unh || 0) - 15);
  if (d.warm && (d.kind === 'food' || d.kind === 'drink')) P.unh = Math.max(0, (P.unh || 0) - 5);
  if (d.sweet) P.unh = Math.max(0, (P.unh || 0) - 5);
  if (d.calm && (d.kind === 'drink')) P.unh = Math.max(0, (P.unh || 0) - 6);
  if (bad) P.unh = Math.min(100, (P.unh || 0) + 8);
  if ((P.pois || 0) > pois0) {
    if (hasTr('irongut') && rng() < .5) { P.pois = pois0; P.hp = Math.max(P.hp, hp0); toast('Железный желудок справился'); }
  } else if (hasTr('weakgut') && (bad || d.rawRisk || d.dirty) && rng() < .3) { P.pois = Math.max(P.pois || 0, 100); P.hp -= 4; lastCause = 'Отравление'; toast('Слабый желудок: тебя мутит'); }
}
function useItemBase(it, k, d) {
  if (d.kind === 'weapon') {
    P.inv.splice(k, 1);
    if (P.weapon) P.inv.push(P.weapon);
    P.weapon = it; toast('В руках: ' + d.name); SFX.equip();
  } else if (d.kind === 'light') {
    if (it.ch <= 0) { toast('Батарейка села'); return; }
    it.on = !it.on; toast(it.on ? 'Фонарик включён' : 'Фонарик выключен');
  } else if (d.kind === 'battery') {
    const fl = P.inv.filter(i => i.id === 'flashlight' || i.id === 'radio').sort((a, b) => (a.ch || 0) - (b.ch || 0))[0];
    if (!fl) { toast('Некуда вставить: нужен фонарик или радио'); return; }
    fl.ch = 100; P.inv.splice(k, 1); toast('Батарейка вставлена: ' + ITEMS[fl.id].name.toLowerCase());
  } else if (d.kind === 'cloth') { wearCloth(k); return;
  } else if (d.kind === 'fun') { P.bored = Math.max(0, (P.bored || 0) - d.fun); P.stress = Math.max(0, (P.stress || 0) - 10); if (!d.keep) P.inv.splice(k, 1); toast(it.id === 'cards' ? 'Пасьянс сошёлся. Полегчало' : 'Дочитал. Скука отступила'); renderInv(); return;
  } else if (d.kind === 'smoke') { const ft = fireTool(); if (!ft) { toast('Нечем прикурить: нужны спички или зажигалка'); return; } useFireTool(); it.uses--; if (it.uses <= 0) P.inv.splice(k, 1); P.stress = Math.max(0, (P.stress || 0) - 35); P.hp = Math.max(1, P.hp - 1); emit('smoke', P.x, P.y, 1.4, 2, null, 0, .3); toast('Затянулся. Нервы успокаиваются'); renderInv(); return;
  } else if (d.kind === 'generator') { placeGen(k); return;
  } else if (d.kind === 'fuel') { toast(it.fuel > 0 ? `В канистре бензина: ${Math.round(it.fuel)}%. Залей в генератор` : 'Канистра пустая. Наполни на заправке'); return;
  } else if (d.kind === 'seeds') { toast('Сколоти грядку (Рюкзак → Создать), подойди к ней и посади семена'); return;
  } else if (d.kind === 'armor') {
    P.inv.splice(k, 1); if (P.armor) P.inv.push(P.armor); P.armor = it; toast('Бронежилет надет'); SFX.equip();
  } else if (d.kind === 'canteen') {
    if (!(it.w > 0)) { toast('Фляга пуста'); return; }
    it.w--; P.hyd = clamp(P.hyd + 30, 0, 100); SFX.drink();
  } else if (d.kind === 'map') {
    if (!P.mapRead) { P.mapRead = true; toast('Ты изучил карту: весь район отмечен'); }
    openMap(); return;
  } else if (d.kind === 'radio') { listenRadio(it); return;
  } else if (it.id === 'alarm' || it.id === 'bottle' || it.id === 'molotov' || it.id === 'flare') { throwItem(k); return;
  } else if (d.kind === 'bino') { useBino(); return;
  } else if (d.kind === 'trap') { placeTrap(k); return;
  } else if (d.kind === 'note') { openPanel('note', {it}); return;
  } else if (d.kind === 'book') { stat('books'); P.inv.splice(k, 1); addXp(d.skill, 14); toast('Прочитано: «' + d.name + '». Навык «' + SKILLS[d.skill].name + '» подрос'); SFX.rustle(); renderInv(); return;
  } else if (d.kind === 'burner') {
    if (!(it.uses > 0)) { toast('Баллон пуст'); return; }
    if (insideHouse(P.x, P.y) && false) return;
    openPanel('cook', {src:{type:'burner', it}}); return;
  } else if (d.kind === 'sleepbag') { closePanel(); startSleep(null); return;
  } else if (d.kind === 'tape') {
    if (!P.weapon) { toast('Нечего чинить: возьми оружие в руки'); return; }
    const wd = ITEMS[P.weapon.id];
    if (P.weapon.dur >= wd.dur) { toast('Оружие и так целое'); return; }
    P.weapon.dur = Math.min(wd.dur, P.weapon.dur + Math.ceil(wd.dur * .4)); it.uses--; if (it.uses <= 0) P.inv.splice(k, 1);
    SFX.rustle(); toast('Обмотал изолентой: ' + wd.name.toLowerCase() + ' ' + P.weapon.dur + '/' + wd.dur);
  } else if (d.kind === 'food' || d.kind === 'drink' || d.kind === 'heal') {
    if (d.opener && !hasTool('opener') && !hasTool('knife')) { toast('Нечем открыть: нужен консервный нож или нож'); return; }
    const bad = isRotten(it), m = bad ? .5 : 1;
    if (d.sat) P.sat = clamp(P.sat + d.sat * (d.sat > 0 ? m * (it.q || 1) : 1), 0, 100);
    if (d.hyd) P.hyd = clamp(P.hyd + d.hyd * (d.hyd > 0 ? m : 1), 0, 100);
    if (d.en) P.en = clamp(P.en + d.en, 0, 100);
    if (d.hp) P.hp = clamp(P.hp + d.hp, 0, 100);
    if (d.stop && P.bleed) { P.bleed = false; toast('Рана перевязана'); }
    if (it.id === 'whiskey') P.stress = Math.max(0, (P.stress || 0) - 25);
    if (d.antibio) { if (P.inf) { P.infT = Math.max(0, P.infT - 300); toast('Жар отступил. Ненадолго'); } else toast('На всякий случай. Лишним не будет'); }
    if (bad) { P.pois = 180; P.hp -= 8; lastCause = 'Отравление'; toast('Оно было испорчено. Тошнит.'); }
    else if (d.rawRisk && rng() < .6) { P.pois = 120; P.hp -= 5; lastCause = 'Отравление'; toast('Сырое мясо. Живот скрутило.'); }
    if (d.kind === 'drink') SFX.drink(); else if (d.kind === 'food') SFX.eat(); else SFX.rustle();
    if (d.dirty && rng() < .3) { P.pois = Math.max(P.pois, 100); lastCause = 'Отравление'; toast('Сырая вода. Живот крутит'); }
    if (d.leaves) P.inv[k] = {id:d.leaves}; else P.inv.splice(k, 1);
  }
  renderInv(); updateHud();
}
function dropItem(k) { const it = P.inv[k]; if (!it) return; P.inv.splice(k, 1); toast('Выброшено: ' + ITEMS[it.id].name); renderInv(); }
function unequip() {
  if (!P.weapon) return;
  if (invFull()) { toast('Слишком тяжело — не унести'); return; }
  P.inv.push(P.weapon); P.weapon = null; renderInv(); updateHud();
}
// подпись вещи в рюкзаке: свойства и вес
function itemInfo(it) {
  const d = ITEMS[it.id], s = itemText(it) || '';
  const kg = fmtKg(itemKg(it)) + ' кг';
  if (d && d.kind === 'bag') return 'вместимость ' + d.bcap + ' кг · весит ' + kg;
  return (s ? s.replace(/ · карманы \+(\d+)/, (m, n) => ' · карманы +' + fmtKg(n * .7) + ' кг') + ' · ' : '') + kg;
}
function itemText(it) {
  const d = ITEMS[it.id], parts = []; if (!d) return '';
  if (d.kind === 'cloth' && d.slot !== 'wrist') {                                  // одежда: слот, тепло, защита, особенности, целость
    const pc = (k, more, less) => { const v = d[k]; if (!v || v === 1) return null; const n = Math.round(Math.abs(1 - v) * 100); return (v > 1 ? more : less) + ' ' + n + '%'; };
    const s = [SLOT_WHERE[d.slot], 'тепло ' + (d.ins >= 0 ? '+' : '') + (d.ins || 0)];
    if (d.prot) s.push('защита от укусов ' + Math.round(d.prot * 100) + '%');
    if (d.cap) s.push('карманы +' + d.cap);
    if (d.dry) s.push(d.slot === 'feet' ? 'ноги не промокают' : 'не промокаешь');
    if (d.glass) s.push('стекло не режет руки');
    for (const x of [pc('spd', 'быстрее', 'медленнее'), pc('noise', 'громче шаги', 'тише шаги'), pc('tire', 'устаёшь сильнее', 'устаёшь меньше')]) if (x) s.push(x);
    return s.join(' · ') + ` · целость ${Math.round(cdur(it))}%` + (it.pad ? ' · утеплено' : '');
  }
  if (d.kind === 'weapon' && d.gun) return `урон ${d.dmg} · патронов ${it.mag || 0}/${d.mag} · прочность ${it.dur}/${d.dur} · очень громко`;
  if (d.kind === 'ammo') return `патронов: ${it.uses} · для оружия «${ITEMS[d.gun].sh}»`;
  if (it.id === 'sewkit') return `ниток на ${it.uses} раз · зашить, утеплить`;
  if (it.id === 'antisep') return 'обеззараживает все раны · +4 здоровье';
  if (it.id === 'rag') return 'временная повязка · материал для бинтов и шитья';
  if (it.id === 'lure') return `заводов: ${it.ch != null ? it.ch : 3}/3 · гремит ~15 секунд`;
  if (d.kind === 'weapon') return `урон ${d.dmg} · прочность ${it.dur}/${d.dur}` + (it.id === 'hammer' ? ' · для баррикад' : it.id === 'knife' ? ' · открывает консервы' : '');
  if (d.kind === 'light') return `заряд ${Math.round(it.ch)}%` + (it.on ? ' · включён' : '');
  if (d.kind === 'canteen') return `воды ${it.w || 0}/${wcap(it)} · +30 вода за глоток`;
  if (d.kind === 'fun') return 'прогоняет скуку' + (d.keep ? ' · колода остаётся' : '');
  if (d.kind === 'smoke') return `успокаивает · осталось ${it.uses}`;
  if (d.info) return d.info;
  if (d.kind === 'cloth') return `тепло +${d.ins}` + (d.dry ? ' · не промокаешь' : '') + (d.slot === 'head' ? ' · на голову' : ' · на тело');
  if (d.kind === 'fuel') return `бензин ${Math.round(it.fuel || 0)}%`;
  if (d.kind === 'generator') return `бензин в баке ${Math.round(it.fuel || 0)}%`;
  if (d.kind === 'seeds') return `пакетиков: ${it.uses}`;
  if (d.kind === 'armor') return `прочность ${Math.max(0, Math.round(it.dur))}/60 · урон от укусов вдвое меньше`;
  if (d.kind === 'radio') return `заряд ${Math.round(it.ch || 0)}%`;
  if (d.kind === 'burner') return `газа на ${it.uses} готовок`;
  if (d.kind === 'tape') return `хватит на ${it.uses} починки · +40% прочности`;
  if (d.kind === 'map') return P.mapRead ? 'район уже отмечен' : 'откроет весь район на карте';
  if (it.id === 'alarm') return 'звенит ~9 секунд';
  if (it.id === 'molotov') return 'горит ~10 секунд';
  if (it.id === 'flare') return 'горит ~30 секунд, шумит';
  if (d.kind === 'bino') return 'обзор на 30 секунд';
  if (d.kind === 'trap') return 'урон 30, держит ~9 секунд';
  if (d.kind === 'book') return 'навык «' + SKILLS[d.skill].name + '» · читать ~6 секунд';
  if (d.antibio) return 'сбивает жар после укуса';
  if (d.uses) return d.info + ' · осталось ' + it.uses;
  if (d.info) return d.info;
  if (d.sat) parts.push((d.sat > 0 ? '+' : '') + d.sat + ' сытость');
  if (d.hyd) parts.push((d.hyd > 0 ? '+' : '') + d.hyd + ' вода');
  if (d.en) parts.push('+' + d.en + ' бодрость');
  if (d.hp) parts.push('+' + d.hp + ' здоровье');
  if (d.stop) parts.push('останавливает кровь');
  if (d.opener) parts.push('нужен консервный нож или нож');
  if (d.rawRisk) parts.push('лучше пожарить на сковороде');
  if (d.rot && it.rot != null) { const left = it.rot - gameMin; parts.push(left <= 0 ? '<em>испорчено</em>' : left < 600 ? 'скоро испортится' : 'свежее'); }
  return parts.join(' · ');
}
function fireTool() { return P.inv.find(i => (i.id === 'matches' || i.id === 'lighter') && i.uses > 0); }
function useFireTool() { const t = fireTool(); if (!t) return; t.uses--; if (t.uses <= 0) { P.inv.splice(P.inv.indexOf(t), 1); toast(ITEMS[t.id].name + ': закончились'); } }
function insideHouse(x, y) { return houses.some(Hs => x > Hs.ix0 && x < Hs.ix1 && y > Hs.iy0 && y < Hs.iy1); }
function frontTile() { const tx = Math.floor(P.x + Math.cos(P.face) * .95), ty = Math.floor(P.y + Math.sin(P.face) * .95); return [tx, ty]; }
function tileFree(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return false;
  const i = ty * MW + tx, t = map[i];
  if (!(t === GRASS || t === WALK || t === FLOOR || t === ROAD) || furn[i] || propAt[i]) return false;
  return !zs.some(z => Math.floor(z.x) === tx && Math.floor(z.y) === ty);
}
const RECIPES = [
  {name:'Костёр', icon:'campfire', parts:() => [{id:'plank', ok:countItem('plank') >= 2, badge:'2'}, {id:fireTool() ? fireTool().id : 'matches', ok:!!fireTool()}, {label:'на улице', ok:!insideHouse(P.x, P.y)}], need:'2 доски, спички или зажигалка · только на улице', can:() => countItem('plank') >= 2 && !!fireTool() && !insideHouse(P.x, P.y), make:() => {
    const fx = P.x + Math.cos(P.face) * .7, fy = P.y + Math.sin(P.face) * .7;
    if (insideHouse(fx, fy) || insideHouse(P.x, P.y)) { toast('В доме костёр разводить нельзя. Выйди на улицу'); return false; }
    removeItem('plank'); removeItem('plank'); useFireTool();
    fires.push({type:'fire', x:fx, y:fy, cx:fx, cy:fy, t:240, seed:rng()});
    noise(P.x, P.y, 5); toast('Костёр горит. На нём можно готовить'); toggleInv(false);
  }},
  {name:'Бочка для дождевой воды', icon:'barrel', parts:() => [{id:'plank', ok:countItem('plank') >= 4, badge:'4'}, {id:'hammer', ok:hasTool('hammer')}], need:'4 доски, молоток · ставится перед тобой', can:() => countItem('plank') >= 4 && hasTool('hammer'), make:() => {
    let [tx, ty] = frontTile();
    if (!tileFree(tx, ty)) {
      const cx = Math.floor(P.x), cy = Math.floor(P.y);
      const opts = D8.map(([ox2, oy2]) => [cx + ox2, cy + oy2]).filter(([x, y]) => tileFree(x, y));
      if (!opts.length) { toast('Рядом нет места для бочки'); return false; }
      [tx, ty] = opts[0];
    }
    for (let k = 0; k < 4; k++) removeItem('plank');
    const p = {type:'barrel', cx:tx + .5, cy:ty + .5, solid:true, r:[tx + .26, ty + .26, tx + .74, ty + .74], w:0, outside:!insideHouse(tx + .5, ty + .5)};
    addProp(p, [[tx, ty]]); barrels.push(p);
    noise(P.x, P.y, 8); toast(p.outside ? 'Бочка готова. Дождь её наполнит' : 'Бочка в доме: дождь до неё не достанет'); toggleInv(false);
  }},
  {name:'Грядка', icon:'seeds', parts:() => [{id:'plank', ok:countItem('plank') >= 3, badge:'3'}], need:'3 доски · на траве под открытым небом. Сажай семена и поливай', can:() => countItem('plank') >= 3, make:() => placeBed()},
];
