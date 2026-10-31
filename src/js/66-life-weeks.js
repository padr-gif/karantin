// ================= «Ещё одна жизнь» в том же городе; каждая неделя меняет город =================

// ---- ещё одна жизнь: новый выживший в том же городе. Дом, тайники, заколоченные окна — всё как было.
// Прежний герой бродит мертвецом в своей одежде; упокоишь — его вещи останутся на земле ----
const GHOST_PI0 = 60;
function ghostPal(lk, cloth) {
  const skin = (LOOK.skin[lk.skin] || [200, 170, 140]).map((v, k) => Math.round(v * .62 + [120, 128, 104][k] * .38));   // кожа мертвеца
  const col = s => cloth && cloth[s] && ITEMS[cloth[s].id] && ITEMS[cloth[s].id].col;
  const top = col('torso') || col('shirt') || [150, 140, 120], legs = col('legs') || [60, 64, 80];
  const hair = (LOOK.hair && LOOK.hair[lk.hair]) || [60, 44, 30];
  return Object.assign({}, ZPALS[0], {1:skin, 2:hair, 3:top, 4:top, 5:legs, 13:top, bald:false});
}
function setGhostPal(pi, pal) { while (ZPALS.length < pi) ZPALS.push(ZPALS[ZPALS.length % 10]); ZPALS[pi] = pal; }
let ghosts = [];                                                            // {pi, pal, items, name, x, y}
function newLife() {
  const old = {x:P.x, y:P.y, look:Object.assign({}, P.look || look), cloth:JSON.parse(JSON.stringify(P.cloth || {})),
    items:[].concat(P.inv || [], P.weapon ? [P.weapon] : [], P.bag ? [P.bag] : [], P.armor ? [P.armor] : []).map(it => { const c = JSON.parse(JSON.stringify(it)); delete c.bp; return c; })};
  for (const s in old.cloth) if (old.cloth[s] && old.cloth[s].id) old.items.push(old.cloth[s]);
  const d = JSON.parse(JSON.stringify(serialize()));                       // город — как он есть сейчас
  const prevLook = Object.assign({}, look);
  look = Object.assign({}, look, {skin:ri(0, LOOK.skin.length - 1), hair:ri(0, (LOOK.hair || [1]).length - 1)});   // другой человек
  startNew();                                                               // свежий выживший (одежда, рюкзак, профессия)
  const fresh = P; look = prevLook;
  applySave(d);                                                             // вернули город
  const lives = (world.lives || 1) + 1;
  // новый — в доме подальше от места гибели
  const homes = houses.filter(H => H.kind === 'house' && H.rooms && !H.hideout && Math.hypot(H.x + H.w / 2 - old.x, H.y + H.h / 2 - old.y) > 25);
  const Hs = homes.length ? pick(homes) : pick(houses.filter(H => H.rooms));
  let sx = Hs.x + Hs.w / 2, sy = Hs.y + Hs.h / 2;
  for (let t = 0; t < 200; t++) { const x = ri(Hs.x + 1, Hs.x + Hs.w - 2), y = ri(Hs.y + 1, Hs.y + Hs.h - 2); if (map[y * MW + x] === FLOOR && !furn[y * MW + x]) { sx = x + .5; sy = y + .5; break; } }
  P = fresh; P.x = sx; P.y = sy; P.act = null; P.car = null; P.log = []; P.tasks = null;
  for (const dd of Hs.doors || []) { const o = obs[dd.y * MW + dd.x]; if (o) o.locked = false; }
  zs = zs.filter(z => Math.hypot(z.x - sx, z.y - sy) > 9);                  // в новом доме пусто
  // прежний герой — среди мертвецов
  const pi = GHOST_PI0 + ghosts.length, pal = ghostPal(old.look, old.cloth); setGhostPal(pi, pal);
  const z = mkZombie(old.x, old.y, {pi, b:old.look.g === 'f' ? 'f' : 'm', blood:2}, 90, .9);
  ghosts.push({pi, pal, items:old.items, n:lives - 1});
  z.ghost = ghosts[ghosts.length - 1];
  if (world.weekStart == null) world.weekStart = startMin; kills = 0; startMin = gameMin; world.lives = lives;
  mode = 'play'; paused = false; camX = P.x; camY = P.y;
  buildFlow(); computeVis(); fogDirty = true; clearCaches();
  show(null); beginPlay();
  logEv('Я не первый, кто пытался тут выжить. Видел дом, где кто-то жил до меня');
  eventBanner('Жизнь ' + lives, 'Тот же город. Где-то бродит тот, кем ты был: упокой его — и его вещи твои. Его дом и тайники — на прежних местах.', 'gold', 'i-user');
}
// кнопка на экране смерти
{ const row = document.querySelector('#dead .row-btns');
  if (row && !$('bLife')) {
    const b = document.createElement('button'); b.type = 'button'; b.id = 'bLife'; b.className = 'go'; b.textContent = 'Ещё одна жизнь';
    b.title = 'Новый выживший в этом же городе'; row.insertBefore(b, row.firstChild);
    $('bAgain').className = 'mbtn'; $('bAgain').textContent = 'Новый город';
    b.addEventListener('click', () => { SFX.ui(); newLife(); });
  }
}
// сохранение: прежние герои-мертвецы и их вещи
{ onSave(d => {
    d.x46 = {ghosts:ghosts.filter(g => !g.dead).map(g => { const z = zs.find(z => z.ghost === g); return {pi:g.pi, pal:g.pal, items:g.items, n:g.n, at:z ? [r2(z.x), r2(z.y)] : null}; }), lives:world.lives || 1, week:world.week || null, ws:world.weekStart != null ? world.weekStart : null};
});
  onLoad((d, {x}) => {
    ghosts = [];
    if (x) {
      world.lives = x.lives || 1; world.week = x.week || null; world.weekStart = x.ws != null ? x.ws : null;
      for (const g of x.ghosts || []) {
        const G = {pi:g.pi, pal:g.pal, items:g.items, n:g.n}; ghosts.push(G);
        const z = zs.filter(z => z.pal.pi === g.pi).sort((a, b) => (g.at ? Math.hypot(a.x - g.at[0], a.y - g.at[1]) - Math.hypot(b.x - g.at[0], b.y - g.at[1]) : 0))[0];
        if (z) z.ghost = G;
      }
    }
}, d => { const x = d && d.x46;
    if (x) for (const g of x.ghosts || []) setGhostPal(g.pi, g.pal);           // палитры — до того, как появятся мертвецы
    return {x};
  });
  onStartNew(() => { ghosts = []; world.lives = 1; world.week = null; world.weekStart = null;
});
}

// ---- каждая неделя меняет город: одно событие оставляет след навсегда, одна «погода недели» действует только эту неделю ----
const WEEK_MODS = {
  cold:{name:'Морозная неделя', text:'Ударили морозы. На улице на 8° холоднее — одевайся теплее и держи огонь.'},
  rain:{name:'Неделя дождей', text:'Льёт почти без перерыва. Промокнуть легко, зато шаги не слышно.'},
  restless:{name:'Беспокойная неделя', text:'Мертвецы ведут себя иначе: быстрее и злее. Не задерживайся на улице.'},
  swarm:{name:'Миграция', text:'Из соседних районов тянутся новые мертвецы. Их на улицах заметно больше.'},
  calm:{name:'Тихая неделя', text:'Подозрительно тихо. Мертвецов на улицах меньше — самое время для вылазок.'},
};
const WEEK_EVENTS = ['looters', 'drop', 'barricade', 'checkpoint'];
function weekNo() { return Math.floor((gameMin - (world.weekStart != null ? world.weekStart : startMin)) / (7 * 1440)); }
function farHouse(minD) {
  const L = houses.filter(H => H.rooms && H.kind === 'house' && Math.hypot(H.x + H.w / 2 - P.x, H.y + H.h / 2 - P.y) > minD && !(P.x >= H.x && P.x < H.x + H.w && P.y >= H.y && P.y < H.y + H.h));
  return L.length ? pick(L) : null;
}
function houseFurns(H) { return furns.filter(f => !f.gone && f.x >= H.x && f.x < H.x + H.w && f.y >= H.y && f.y < H.y + H.h); }
function markMap(x, y) { world.marks = world.marks || []; world.marks.push({x:Math.round(x), y:Math.round(y)}); }
function runWeekEvent(k) {
  if (k === 'looters') {                                                    // мародёры: несколько домов пусты, двери выбиты — навсегда
    let n = 0;
    for (let q = 0; q < 3; q++) { const H = farHouse(18); if (!H || H._looted) continue; H._looted = true; n++;
      for (const f of houseFurns(H)) if (CONT[f.type] && CONT[f.type].loot) { f.searched = true; f.items = (f.items || []).filter(() => rng() < .15); }
      for (const dd of H.doors || []) { const o = obs[dd.y * MW + dd.x]; if (o) { o.open = true; o.ang = 1; o.locked = false; } } }
    clearCaches(); return 'Мародёры прошлись по соседним улицам: ' + n + ' дома выпотрошены, двери нараспашку. Туда можно не ходить.';
  }
  if (k === 'drop') { dropSupply(); return 'Над городом кружил вертолёт и сбросил груз. Место отмечено на карте.'; }
  if (k === 'barricade') {                                                  // чужое убежище: заколочено, внутри припасы
    const H = farHouse(20); if (!H) return null;
    for (let y = H.y; y < H.y + H.h; y++) for (let x = H.x; x < H.x + H.w; x++) { const i = y * MW + x, o = obs[i]; if (o && map[i] === WIN) o.bhp = 90; }
    const fs = houseFurns(H).filter(f => CONT[f.type] && CONT[f.type].loot);
    if (fs.length) { const f = pick(fs); f.searched = true; f.items = (f.items || []).concat(['canned', 'water', 'bandage', 'matches', 'stew', 'battery', 'candle'].map(mkItem)); }
    markMap(H.x + H.w / 2, H.y + H.h / 2); clearCaches(); buildFlow();
    return 'По радио кто-то говорил о своём убежище: заколоченный дом, припасы внутри. Сам он ушёл к блокпосту. Дом отмечен на карте.';
  }
  if (k === 'checkpoint') {                                                 // военные бросили ящики на блокпосту
    const boxes = furns.filter(f => !f.gone && f.type === 'armybox');
    if (!boxes.length) return null;
    for (const f of boxes) { f.searched = false; f.items = (f.items || []).concat(['mre', 'ammo9', 'antibio', 'water', 'flare'].filter(() => rng() < .7).map(mkItem)); }
    markMap(boxes[0].cx, boxes[0].cy);
    return 'Военные снялись с блокпоста и бросили ящики. Там может что-то остаться. Место отмечено на карте.';
  }
  return null;
}
function weekTick() {
  const n = weekNo(); if (n < 1) return;
  const W = world.week;
  if (W && W.n === n) return;
  const prevMod = W && W.mod, done = (W && W.done) || [];
  const mods = Object.keys(WEEK_MODS).filter(k => k !== prevMod), mod = pick(mods);
  const evs = WEEK_EVENTS.filter(k => !done.includes(k) || k === 'drop' || k === 'looters');
  let msg = null, ev = null;
  for (let t = 0; t < 4 && !msg; t++) { ev = pick(evs); msg = runWeekEvent(ev); }
  world.week = {n, mod, ev, done:done.concat(ev ? [ev] : [])};
  const M = WEEK_MODS[mod];
  eventBanner('Неделя ' + (n + 1) + ': ' + M.name, M.text + (msg ? ' ' + msg : ''), 'gold', 'i-star');
  logEv('Неделя ' + (n + 1) + ': ' + M.name.toLowerCase() + (msg ? '. ' + msg.split('.')[0] : ''));
}
function weekMod() { return mode === 'play' && world.week && world.week.mod; }   // особенность недели: cold, restless, calm…
{ let t = 0, sw = 0;
  onUpdate(dt => {
    if (mode !== 'play' || !P) return;
    t += dt; if (t > 2) { t = 0; weekTick(); }
    const m = weekMod();
    if (m === 'rain' && rainTarget < .6) rainTarget = .75;
    if (m === 'swarm') { sw += dt; if (sw > 18) { sw = 0; spawnZombie(16, false); } }
  });
}
// в дневнике — что за неделя
