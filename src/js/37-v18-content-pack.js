// ================= v18: big content pack — items, recipes, zombie types, evacuation ending, dismantling =================
Object.assign(ITEMS, {
  cleaver:{name:'Тесак', kind:'weapon', dmg:34, range:1.15, cd:.5, cleave:1, dur:55, verb:'Взять в руки'},
  nailbat:{name:'Бита с гвоздями', sh:'Бита+', kind:'weapon', dmg:42, range:1.35, cd:.7, cleave:2, dur:40, verb:'Взять в руки'},
  nails:{name:'Гвозди', kind:'misc', info:'для биты с гвоздями'},
  painkill:{name:'Обезболивающее', sh:'Обезбол.', kind:'heal', hp:8, calm:25, verb:'Принять'},
  antisep:{name:'Антисептик', kind:'heal', hp:12, stop:true, anim:'work', dur:2, verb:'Обработать рану'},
  candle:{name:'Свеча', kind:'light', candle:true, verb:'Зажечь'},
  beans:{name:'Фасоль', kind:'food', sat:30, opener:true, verb:'Открыть и съесть'},
  noodles:{name:'Лапша б/п', sh:'Лапша', kind:'food', sat:10, verb:'Грызть сухой'},
  soupC:{name:'Суп-лапша', sh:'Суп', kind:'food', sat:38, hyd:15, warm:true, verb:'Съесть'},
  ragout:{name:'Рагу', kind:'food', sat:62, hyd:8, warm:true, verb:'Съесть'},
  nuts:{name:'Орехи', kind:'food', sat:15, verb:'Съесть'},
  candy:{name:'Леденцы', kind:'food', sat:4, calm:10, verb:'Рассосать'},
  newspaper:{name:'Газета', kind:'fun', fun:20, dur:3, verb:'Почитать'},
  leather:{name:'Кожаная куртка', sh:'Кожанка', kind:'cloth', slot:'torso', ins:5, prot:.3, col:[70, 46, 34], verb:'Надеть', info:'тепло +5 · укусы реже прокусывают'},
  helmet:{name:'Мотошлем', sh:'Шлем', kind:'cloth', slot:'head', ins:1, prot:.35, col:[40, 40, 46], verb:'Надеть', info:'тепло +1 · защищает голову от укусов'},
  milbag:{name:'Военный рюкзак', sh:'Рюкзак+', kind:'bag', cap:34, verb:'Надеть'},
  cansalarm:{name:'Банки на верёвке', sh:'Банки', kind:'misc', info:'подойди к двери и повесь: зазвенят, если её начнут ломать'},
});
Object.assign(DESC, {
  cleaver:'Тяжёлый кухонный тесак. Короткий, но рубит быстро.',
  nailbat:'Бита, утыканная гвоздями. Сильнее обычной, но гвозди со временем гнутся.',
  nails:'Горсть строительных гвоздей. Пригодятся, чтобы сделать оружие пострашнее.',
  painkill:'Блистер обезболивающего. Немного лечит и снимает нервы.',
  antisep:'Пузырёк антисептика. Останавливает кровь и лечит лучше обычного бинта.',
  candle:'Восковая свеча. Светит слабее фонарика, зато без батареек. Нужны спички или зажигалка.',
  beans:'Консервированная фасоль. Сытно, но без ножа не открыть.',
  noodles:'Сухая лапша быстрого приготовления. Свари её в кастрюле с водой и получится горячий суп.',
  soupC:'Горячий суп. Сытный, утоляет жажду и согревает.',
  ragout:'Густое рагу из мяса и овощей. Самая сытная еда в городе, к тому же согревает.',
  nuts:'Пакетик орехов. Не портится.',
  candy:'Пачка леденцов. Почти не кормит, зато успокаивает.',
  newspaper:'Старая газета за день до карантина. Почитать от скуки.',
  leather:'Плотная кожаная куртка. Тёплая, и зубам её прокусить трудно.',
  helmet:'Мотоциклетный шлем. Укусы в голову теперь не страшны.',
  milbag:'Армейский рюкзак на 34 места.',
  cansalarm:'Пустые бутылки на верёвке. Повесь на дверь: если мертвецы начнут её ломать, звон разбудит тебя.',
});
Object.assign(WSPEC, {
  cleaver:{segs:[[0, 3, .9, '#2c2420'], [3, 7.5, 2.2, '#c3c7cc']]},
  nailbat:{segs:[[0, 5, .8, '#9c744a'], [5, 11.5, 1.6, '#b88a58']], head:{at:9.5, w:.5, len:1.6, col:'#c9cdd2'}},
  machete:{segs:[[0, 3, .8, '#26262a'], [3, 10.5, 1.2, '#c9cdd1']]},
  sledge:{segs:[[0, 10, .85, '#8c643e']], head:{at:10, w:2, len:1.9, col:'#5c6066'}},
  shovel:{segs:[[0, 9, .75, '#9a7044'], [9, 12, 2, '#6e747c']]},
  golf:{segs:[[0, 2.6, .9, '#222'], [2.6, 11.5, .5, '#b9bdc2']], head:{at:11.5, w:1.1, len:1.1, col:'#c9cdd2'}},
  spear:{segs:[[0, 11, .7, '#9c744a'], [11, 13, .9, '#c9cdd1']]},
});
{ const add = (k, ...ids) => CONT[k] && CONT[k].loot.push(...ids);
  add('cabinet', 'beans', 'noodles', 'noodles', 'candle', 'cleaver'); add('counter', 'cleaver', 'nuts', 'candy', 'newspaper', 'beans');
  add('shelf', 'beans', 'noodles', 'nuts', 'candle'); add('fridge', 'beans');
  add('medcab', 'painkill', 'painkill', 'antisep'); add('medshelf', 'painkill', 'antisep', 'antisep');
  add('nightstand', 'candle', 'candy', 'newspaper', 'painkill'); add('dresser', 'candle', 'newspaper');
  add('wardrobe', 'leather', 'helmet'); add('hanger', 'leather'); add('locker', 'leather', 'helmet', 'painkill', 'milbag');
  add('toolrack', 'nails', 'nails', 'helmet', 'cleaver'); add('crate', 'nails', 'candle', 'nailbat');
  add('armybox', 'milbag', 'antisep', 'beans'); add('car', 'nuts', 'candy', 'newspaper', 'helmet'); add('desk', 'newspaper', 'candy');
  if (CONT.airdrop) add('airdrop', 'antisep', 'beans', 'milbag'); }
for (const k in LOOTK) { if (LOOTK[k].counter) LOOTK[k].counter.push('candy', 'nuts', 'newspaper'); }
if (LOOTK.store) { LOOTK.store.shelf = (LOOTK.store.shelf || CONT.shelf.loot.slice()).concat(['beans', 'noodles', 'nuts', 'candle']); }
if (LOOTK.pharmacy) LOOTK.pharmacy.medshelf = (LOOTK.pharmacy.medshelf || CONT.medshelf.loot.slice()).concat(['painkill', 'antisep', 'antisep']);
RECIPES.push(
  {name:'Бита с гвоздями', icon:'nailbat', parts:() => [{id:'bat', ok:hasTool('bat')}, {id:'nails', ok:countItem('nails') >= 1}, {id:'hammer', ok:hasTool('hammer')}], need:'бита, гвозди и молоток', can:() => hasTool('bat') && countItem('nails') >= 1 && hasTool('hammer'), make:() => {
    removeItem('nails'); const inHand = P.weapon && P.weapon.id === 'bat'; if (inHand) P.weapon = null; else removeItem('bat');
    const nb = mkItem('nailbat'); if (!P.weapon) P.weapon = nb; else P.inv.push(nb); toast('Бита с гвоздями готова'); ach('nailbat'); }},
  {name:'Банки на верёвке', icon:'cansalarm', parts:() => [{id:'bottle', ok:countItem('bottle') >= 2, badge:'2'}, {id:'rag', ok:countItem('rag') >= 1}], need:'2 пустые бутылки и тряпка', can:() => countItem('bottle') >= 2 && countItem('rag') >= 1, make:() => { removeItem('bottle'); removeItem('bottle'); removeItem('rag'); P.inv.push(mkItem('cansalarm')); toast('Сигнализация готова. Подойди к двери и повесь'); }},
);
COOK.push({id:'soupC', raw:'noodles', tool:'pot', toolName:'кастрюля', water:true});
// candles light up and burn down; they need fire to light
const mkItem0 = mkItem; mkItem = function (id) { const it = mkItem0(id); if (id === 'candle') { it.ch = 100; it.on = false; } return it; };
const useItem0 = useItem;
useItem = function (id, idx) {
  const k = idx != null ? idx : P.inv.findIndex(i => i.id === id), it = P.inv[k]; if (!it) return;
  const d = ITEMS[it.id];
  if (it.id === 'candle') {
    if (!it.on && !fireTool()) { toast('Нечем зажечь: нужны спички или зажигалка'); return; }
    if (!it.on) useFireTool(); it.on = !it.on; toast(it.on ? 'Свеча горит' : 'Свеча потушена'); SFX.fireUp(); renderInv(); updateHud(); return;
  }
  if (d.kind === 'bag' && d.cap) {
    if (P.cap >= d.cap) { toast('Рюкзак не меньше уже надет'); return; }
    P.cap = d.cap; P.inv.splice(k, 1); toast('Надел ' + d.name.toLowerCase() + ': ' + d.cap + ' мест'); SFX.equip(); renderInv(); updateHud(); return;
  }
  if (it.id === 'cansalarm') { toast('Подойди к двери и выбери «Повесить банки»'); return; }
  const calm = d.calm, warm = d.warm;
  if (P.flu > 0 && ['painkill', 'vitamins', 'pills', 'thermos', 'antibio'].includes(it.id)) { P.flu = Math.max(0, P.flu - 480); toast(P.flu > 0 ? 'Полегчало, насморк слабее' : 'Простуда отступила'); }
  useItem0(id, idx);
  if (calm) P.stress = Math.max(0, (P.stress || 0) - calm);
  if (warm) P.cold = Math.max(0, (P.cold || 0) - 30);
};
const clothProt = () => { let p = 0; for (const s of ['torso', 'head']) { const c = P.cloth && P.cloth[s]; if (c && ITEMS[c.id].prot) p += ITEMS[c.id].prot; } return Math.min(.6, p); };

// ---- door alarm made of bottles ----
function doorAlarmAction(o) { const ob = obs[o.i]; if (ob.t !== 'door' || ob.dead) return null; if (ob.alarm) return {kind:'unalarm', label:'Снять банки', o, tk:'al' + o.i}; if (countItem('cansalarm')) return {kind:'alarm', label:'Повесить банки', o, tk:'al' + o.i}; return null; }
function rattle(i) {
  const o = obs[i]; if (!o || !o.alarm) return; if (o._rt && gameMin - o._rt < 3) return; o._rt = gameMin;
  const x = (i % MW) + .5, y = ((i / MW) | 0) + .5, d = Math.hypot(x - P.x, y - P.y);
  if (d < 40) { SFX.glass(P.x + (x - P.x) * .3, P.y + (y - P.y) * .3); if (P.sleep) wake('Звенят банки у двери! Кто-то ломится'); else toast('Звенят банки у двери: мертвецы ломятся'); }
}

// ---- zombie types: brutes (heavy), screamers, loot on bodies ----
function zType(z) {
  if (!z) return z;
  if (!world.mut) return z;
  if (z.pal.b === 'h') { z.hp *= 1.8; z.spd *= .85; z.r = .3; z.brute = true; }
  else if (!z.pal.fast && !z.crawl && rng() < .06) z.scream = true;
  return z;
}
const ZLOOT = ['cigs', 'lighter', 'water', 'chips', 'bandage', 'note', 'candy', 'nuts', 'painkill', 'watchQ', 'battery', 'newspaper', 'matches'];
function onZDeath(z) {
  if (z.brute) { stat('brute'); ach('brute'); }
  if (z.scream) ach('scream');
  if (rng() < (z.pal.pi >= 10 ? .35 : .12)) addToPile(z.x, z.y, mkItem(z.pal.pi >= 10 && rng() < .5 ? pick(['baton', 'bandage', 'antisep', 'painkill', 'flashlight', 'battery']) : pick(ZLOOT)));
}
function tickScreamers(dt) {
  for (const z of zs) {
    if (!z.scream || z.state !== 'chase') continue;
    z.scT = (z.scT == null ? 1 : z.scT) - dt;
    if (z.scT <= 0) {
      z.scT = 8 + Math.random() * 4; z.scFx = 1.2;
      const v = Math.max(.15, 1 - Math.hypot(z.x - P.x, z.y - P.y) / 30); SFX.scream && SFX.scream(); noise(z.x, z.y, 22);
      if (!world.scrMsg) { world.scrMsg = true; toast('Крикун! Его вопль созывает всех мертвецов вокруг. Убей его первым'); }
    }
    if (z.scFx > 0) z.scFx -= dt;
  }
}
function drawScreamFx() {
  for (const z of zs) if (z.scFx > 0 && vis[Math.floor(z.y) * MW + Math.floor(z.x)]) {
    const sx = SX(z.x, z.y), sy = SY(z.x, z.y, U * 2.4), k = 1.2 - z.scFx;
    ctx.strokeStyle = `rgba(255,90,70,${z.scFx / 1.2})`; ctx.lineWidth = 1.2;
    for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.ellipse(sx, sy, 6 + (k * 30 + q * 7) % 26, (3 + (k * 15 + q * 3.5) % 13), 0, 0, 6.283); ctx.stroke(); }
  }
}

// ---- dismantling furniture into planks (editor) ----
const PLANKS = {bed:3, sofa:2, wardrobe:3, dresser:3, bookshelf:3, table:2, nightstand:1, desk:2, shelf:2, crate:2, cabinet:2, counter:2, hanger:1, tv:0, locker:0, toolrack:1};
const canBreak = () => hasTool('hammer') || hasTool('axe') || hasTool('hatchet') || hasTool('crowbar') || hasTool('sledge');
function dismantleSel() {
  const f = EDIT.sel; if (!f) return;
  if (!canBreak()) { toast('Нужен молоток, топор, лом или кувалда'); return; }
  if (!(f.type in PLANKS) || PLANKS[f.type] === 0) { toast(furnLabel(f) + ': на доски не разобрать'); return; }
  P.act = {kind:'dismantle', t:0, dur:hasTool('axe') || hasTool('sledge') ? 2.4 : 3.6, f};
  SFX.wood(f.cx, f.cy);
}
function finishDismantle(a) {
  const f = a.f, n = PLANKS[f.type] || 1;
  if (f.items && f.items.length) for (const it of f.items) addToPile(f.cx, f.cy, it);
  const oi = f.y * MW + f.x; if (furns[furn[oi] - 1] === f) furn[oi] = 0;
  for (const ch of chunksNear(f.x + .5, f.y + .5, 2)) for (const [k, v] of CHUNKS) if (v === ch) CHUNKS.delete(k);
  for (let q = 0; q < n; q++) { if (!invFull()) P.inv.push(mkItem('plank')); else addToPile(f.cx, f.cy, mkItem('plank')); }
  Object.assign(f, {gone:true, moved:true, items:[], searched:true, cx:-999, cy:-999, r:[-999, -999, -999, -999]});
  buildFlow(); noise(P.x, P.y, 9); P.en = Math.max(0, P.en - 5); SFX.wood(P.x, P.y); emit('wood', a.f.x + .5, a.f.y + .5, .6, 10, null, 0, 2);
  toast('Разобрано: +' + n + ' ' + (n === 1 ? 'доска' : 'доски')); stat('dism'); ach('dism'); EDIT.sel = null; editUI(); renderInv();
}

// ---- ragout: a cooking recipe with several ingredients ----
function ragoutCard(src) {
  const have = id => countItem(id) > 0, heat = heatOk(src), water = waterOk(), pot = hasTool('pot');
  const ok = have('meat') && have('potato') && have('carrot') && pot && water && heat;
  const b = btn('Приготовить', () => {
    closePanel();
    P.act = {kind:'cookx', t:0, dur:4.5, fn:() => {
      if (!heatOk(src) || !hasTool('pot') || !(countItem('meat') && countItem('potato') && countItem('carrot'))) { toast('Не вышло: чего-то не хватило'); return; }
      if (src.type === 'burner') { src.it.uses--; if (src.it.uses <= 0) { P.inv.splice(P.inv.indexOf(src.it), 1); toast('Газ в горелке кончился'); } }
      if (!nearTap()) { const w = P.inv.find(i => i.id === 'water'); if (w) w.id = 'bottle'; }
      removeItem('meat'); removeItem('potato'); removeItem('carrot');
      const r = mkItem('ragout'); r.q = 1 + .1 * skillLv('cook'); P.inv.push(r); addXp('cook', 3); ach('ragout'); toast('Рагу готово. Пахнет как дома');
    }};
    SFX.sizzle();
  }); b.disabled = !ok;
  return recipeCard('Рагу', [{id:'meat', ok:have('meat')}, {id:'potato', ok:have('potato')}, {id:'carrot', ok:have('carrot')}, {id:'pot', ok:pot}, {id:'water', ok:water, label:'вода'}, {id:src.type === 'fire' ? 'campfire' : src.type === 'burner' ? 'burner' : null, label:'Электричество', ok:heat}], 'ragout', [b], 'мясо, картошка и морковь в кастрюле с водой');
}

// ---- evacuation: the way out ----
function setupEvac() {
  if (!CHECKPOINTS.length) return;
  const c = CHECKPOINTS[Math.floor(rng() * CHECKPOINTS.length)], cx = MW / 2, cy = MH / 2;
  let x = c.x, y = c.y; const d = Math.hypot(cx - x, cy - y);
  for (let s = 3; s < 14; s++) { const qx = c.x + (cx - c.x) / d * s, qy = c.y + (cy - c.y) / d * s; if (!navBlocked(Math.floor(qx), Math.floor(qy))) { x = Math.floor(qx) + .5; y = Math.floor(qy) + .5; if (s >= 6) break; } }
  const day = 7 + ri(0, 2);
  world.evac = {x, y, at:(day - 1) * 1440 + 12 * 60, told:false, rem:false, side:c.side};
}
const EV = {h:null, nT:0, smoke:0};
const evDay = () => Math.floor(world.evac.at / 1440) + 1;
function evacWhere() { const e = world.evac; const sx = e.x < MW / 3 ? 'западный' : e.x > MW * 2 / 3 ? 'восточный' : '', sy = e.y < MH / 3 ? 'северный' : e.y > MH * 2 / 3 ? 'южный' : ''; return ((sy || sx) ? (sy && sx ? sy.replace('ый', 'о') + '-' + sx : sy || sx) + ' ' : '') + 'блокпост'; }
function tickEvac(dt) {
  const e = world.evac; if (!e) return;
  if (!e.told && gameMin >= e.at - 4 * 1440 + 10 * 60 - 720) { e.told = true; toast('📻 Экстренно: эвакуация! ' + evacWhere() + ', день ' + evDay() + ', 12:00–15:00. Отмечено на карте'); world.marks = world.marks || []; }
  if (!e.rem && gameMin >= e.at - 360) { e.rem = true; toast('Сегодня эвакуация в 12:00. ' + evacWhere() + ' отмечен на карте'); }
  const on = gameMin >= e.at - 20 && gameMin <= e.at + 180;
  if (on) {
    if (!EV.h) { EV.h = {x:e.x, y:e.y - 2, vx:0, vy:0, lx:e.x, ly:e.y, sa:0}; if (P.sleep) wake('Над городом гудит вертолёт эвакуации!'); toast('Вертолёт эвакуации над точкой! Беги к блокпосту'); }
    EV.nT -= dt; if (EV.nT <= 0) { EV.nT = 1.4; noise(e.x, e.y, 26); SFX.heli && SFX.heli(Math.max(0, 1 - Math.hypot(e.x - P.x, e.y - P.y) / 48)); }
    EV.smoke -= dt; if (EV.smoke <= 0) { EV.smoke = .12; BZ.evacPuffs = BZ.evacPuffs || []; BZ.evacPuffs.push({x:e.x + bzRand(-.3, .3), y:e.y + bzRand(-.3, .3), z:4, t:0, r:.3}); }
    if (!P.car && mode === 'play' && Math.hypot(P.x - e.x, P.y - e.y) < 2.2) winGame();
  } else if (EV.h && gameMin > e.at + 180) {
    EV.h = null; e.at += 5 * 1440; e.told = true; e.rem = false;
    toast('Вертолёт улетел без тебя. Следующая эвакуация — день ' + evDay() + ', 12:00');
  }
  if (BZ.evacPuffs) { for (const p of BZ.evacPuffs) { p.t += dt; p.z += dt * 30; p.r += dt * .5; p.x += dt * .4; } BZ.evacPuffs = BZ.evacPuffs.filter(p => p.t < 5); }
}
function drawEvac() {
  const e = world.evac; if (!e) return;
  for (const p of BZ.evacPuffs || []) { const a = (1 - p.t / 5) * .55, sx = SX(p.x, p.y), sy = SY(p.x, p.y, p.z); ctx.fillStyle = `rgba(120,230,110,${a})`; ctx.beginPath(); ctx.arc(sx, sy, U * p.r, 0, 6.283); ctx.fill(); }
  if (!EV.h) return;
  const sx = SX(e.x, e.y), sy = SY(e.x, e.y, 0);
  ctx.strokeStyle = 'rgba(120,230,110,.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(sx, sy, U * 1.6, U * .8, 0, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = 'rgba(200,190,150,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(SX(EV.h.x, EV.h.y), SY(EV.h.x, EV.h.y, 160)); ctx.lineTo(sx, sy - 4); ctx.stroke();
  const keep = heli; heli = EV.h; try { drawHeli(); } finally { heli = keep; }
}
function winGame() {
  closePanel(); mode = 'win'; atkHeld = false; joy.id = null; $('stick').hidden = true; EV.h = null;
  ach('evac'); const lived = gameMin - startMin;
  $('wTime').textContent = fmtDur(lived); $('wKills').textContent = kills; $('wDays').textContent = 'день ' + (Math.floor(gameMin / 1440) + 1);
  $('ctrl').hidden = true; $('hud').hidden = true; SFX.heli && SFX.heli(1);
  try { if (settings.autosave) {} } catch (e) {}
  setTimeout(() => show('win'), 600);
}
