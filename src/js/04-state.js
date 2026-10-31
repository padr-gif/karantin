// ================= state =================
let P, zs, decals, corpses, kills, gameMin, startMin, powerOffAt, waterOffAt, powerMsg, waterMsg;
let mode = 'menu', paused = false, spawnHouse = 0;
let godMode = false, uiOff = false;                                    // тест скорости: герой неуязвим / без миникарты
let spawnTimer = 0, flowTimer = 0, visTimer = 0, noiseTimer = 0, hudTimer = 0, weatherTimer = 0;
// особенности героя из профессии (P.pk — копия при создании, 81-newgame), возраста и телосложения (P.look.age / P.look.build)
const AGES = {young:{name:'Молодой', nameF:'Молодая', info:'20–30 лет. Меньше устаёт, но опыт копится чуть медленнее.', en:.88, xp:.92}, mid:{name:'Средних лет', info:'30–50 лет. Без особенностей.'},
  old:{name:'В возрасте', info:'За 50. Быстрее устаёт, зато опытный: навыки профессии на уровень выше, учится быстрее.', en:1.15, xp:1.2, skill:1}};
const BUILDS = {thin:{name:'Худой', nameF:'Худая', info:'Тише и легче: шаги тише, устаёт меньше. Удар слабее, унесёт на 2 кг меньше.', dmg:.88, en:.92, noise:.85, carry:-2}, avg:{name:'Обычный', nameF:'Обычная', info:'Без особенностей.'},
  stocky:{name:'Крепкий', nameF:'Крепкая', info:'Удар сильнее, унесёт на 3 кг больше. Устаёт быстрее и ест больше.', dmg:1.14, en:1.07, food:1.1, carry:3}};
const lkName = (o, lk) => (o && ((lk || {}).g === 'f' && o.nameF || o.name)) || '';   // «Молодая», «Худая» у героини
function heroK(k) { const p = P && P.pk && P.pk[k], lk = (P && P.look) || {}, a = AGES[lk.age] || {}, b = BUILDS[lk.build] || {}; return (p != null ? p : 1) * (a[k] != null ? a[k] : 1) * (b[k] != null ? b[k] : 1); }
function heroAdd(k) { const lk = (P && P.look) || {}, p = (P && P.pk && P.pk[k]) || 0, a = (AGES[lk.age] || {})[k] || 0, b = (BUILDS[lk.build] || {})[k] || 0; return p + a + b; }
let shake = 0, camX = 0, camY = 0, lastCause = 'Загрызли', curAct = null, curBar = null;
let rain = 0, rainTarget = 0;
let flow = new Int16Array(NT);
const buckets = Array.from({length:90}, () => []);
function zPal() {
  const r = rng(), rb = rng(), b = rb < .34 ? 'f' : rb < .5 ? 'h' : 'm';
  if (r < (typeof gameMin === 'number' && lightLevel() < .3 ? .12 : .025) * (world.fastK != null ? world.fastK : 1)) return {pi:14, fast:true, b:b === 'h' ? 'm' : b, blood:0};   // fastK — бегунов меньше/больше (настройка мира)
  let pi = r < .28 ? ri(10, 13) : ri(0, 9);
  for (let k = 0; k < 10 && b === 'f' && ZPALS[pi] && ZPALS[pi].bald; k++) pi = (pi + 1) % 10;
  return {pi, b, blood:0};
}
function mkZombie(x, y, pal, hp, spd) {
  spd *= weekMod() === 'restless' ? 1.15 : 1;                              // беспокойная неделя
  const z = {x, y, r:.26, hp, spd, state:'wander', tx:x, ty:y, wt:0, it:0,
    atk:rng(), wind:0, stun:0, kx:0, ky:0, face:rng() * 6.28, lost:0, pal, sway:rng() * 6, bash:0, walk:rng() * 6,
    seed:rng(), gait:0, mv:0, reachA:0};
  if (!pal.pi || pal.pi < 10) z.crawl = rng() < .07;
  if (z.crawl) z.hp = Math.min(z.hp, 45);
  zs.push(z); return z;
}
let fires = [], barrels = [];

function newGame(o) { return runHooked('newWorld', newGameCore, o); }
function newGameCore(o) {
  o = o || {};
  world.seed = o.seed != null ? o.seed : ((Date.now() * 2654435761) >>> 0);
  world.diff = o.diff || 'normal';
  rng = mulberry32(world.seed);
  generate();
  rollLoot();                                                               // gen 5: карта одна, добыча своя в каждой игре (74-world-plan)
  { const Lm = DIFF[world.diff].loot; for (const c of furns.filter(f => CONT[f.type].loot).concat(props.filter(p => p.type === 'car'))) { if (Lm > 1 && rng() < Lm - 1) c.items.push(mkItem(pick(CONT[c.type].loot))); if (Lm < 1) c.items = c.items.filter(() => rng() < Lm + .1); } }
  growCars(); mergeFences();                                                 // машины в полный размер (26-driving), двойные заборы соседних дворов — в один (72-city)                                                                 // машины в полный размер (26-driving): после раздачи добычи — она тратит случайные числа по числу машин
  const homes = houses.map((h, i) => [h, i]).filter(([h]) => h.kind === 'house' && !h.hideout && h.rooms);
  const [Hs, hi] = pick(homes); spawnHouse = hi + 1;
  for (const d of Hs.doors) { const o = obs[d.y * MW + d.x]; if (o) o.locked = false; }
  let sx = 0, sy = 0, best = 1e9;
  for (let y = Hs.y + 1; y < Hs.y + Hs.h - 1; y++) for (let x = Hs.x + 1; x < Hs.x + Hs.w - 1; x++) {
    const i = y * MW + x; if (map[i] !== FLOOR || furn[i]) continue;
    const d = Math.abs(x - (Hs.x + Hs.w / 2)) + Math.abs(y - (Hs.y + Hs.h / 2));
    if (d < best) { best = d; sx = x; sy = y; }
  }
  P = {x:sx + .5, y:sy + .5, r:.26, face:.8, hp:100, sat:80, hyd:76, en:85, bleed:false, inf:false, infT:0, pois:0,
       weapon:null, inv:[mkItem('water')], cd:0, swing:0, hurt:0, act:null, moving:false, running:false, sneak:false,
       sleep:false, walk:0, cap:18, look:o.look || Object.assign({}, look), fd:.8};
  if (typeof BZ !== 'undefined') { BZ.flocks = []; BZ.perched = []; BZ.alarms = []; BZ.smokes = null; BZ.evT = 30; }
  zs = []; decals = []; corpses = []; kills = 0; fires = []; barrels = []; piles = []; thrown = []; rings = []; gens = []; beds = []; airdrops = []; heli = null; blazes = []; dynCars = []; traps = []; flares = []; if (typeof $ === 'function' && $('bAtk')) { $('bSneak').hidden = $('bRun').hidden = false; setAtk(false); }
  gameMin = startMin = 9 * 60; spawnTimer = 0; rain = rainTarget = 0; weatherTimer = 0;
  world.dayOff = (SEASONS[NEWCFG.season] || SEASONS.autumn).off; world.season = null; powerOffAt = startMin + (NEWCFG.power || 99999) * 1440; waterOffAt = startMin + (NEWCFG.water || 99999) * 1440; world.mut = !!NEWCFG.mut;
  powerMsg = waterMsg = false; world.marks = []; scheduleHeli(startMin - 300); scheduleHorde(startMin); world.storm = false; world.snow = 0; world.snowMsg = false;
  { const hw = furns.filter(f => f.type === 'crate' && houses[hAt[f.y * MW + f.x] - 1] && houses[hAt[f.y * MW + f.x] - 1].kind === 'hardware'); if (hw.length) hw[0].items.push(mkItem('generator'), mkItem('jerrycan')); }
  if (!o.save) {
    { const hi = hAt[Math.floor(P.y) * MW + Math.floor(P.x)]; const fs = furns.filter(f => hi && hAt[f.y * MW + f.x] === hi && CONT[f.type] && CONT[f.type].loot && ['nightstand', 'dresser', 'wardrobe', 'hanger'].includes(f.type)); if (fs.length) fs[Math.floor(rng() * fs.length)].items.push(mkItem('watchQ')); }
    for (let i = 0, n = Math.round(125 * DIFF[world.diff].z * NT / 33856); i < n; i++) spawnZombie(11, true);   // на большой карте — больше, плотность та же
    for (const g of SPECIAL) if (g.corpse) { corpses.push({x:g.x, y:g.y, face:rng() * 6.28, pal:{pi:g.pi, b:rng() < .4 ? 'f' : 'm', blood:3}, fall:1, dir:-1, seed:rng()}); for (let q = 0; q < 3; q++) addBlood(g.x + (rng() - .5), g.y + (rng() - .5), .8); }
    for (const g of SPECIAL) for (let k = 0; k < g.n && !g.corpse; k++) { const x = g.x + (rng() - .5) * 3, y = g.y + (rng() - .5) * 3; if (navBlocked(Math.floor(x), Math.floor(y)) || Math.hypot(x - P.x, y - P.y) < 12) continue; mkZombie(x, y, {pi:g.pi, b:rng() < .3 ? 'f' : 'm', blood:0}, ri(55, 80), (.8 + rng() * .3) * DIFF[world.diff].spd); }
  }
  camX = P.x; camY = P.y;
  buildFlow(); computeVis(); fogDirty = true; parts = [];
  clearCaches();
  w5AfterWorld();
}
function spawnZombie(minD, init) {
  if (!init && weekMod() === 'calm' && rng() < .45) return;                 // тихая неделя
  for (let t = 0; t < 200; t++) {
    const x = ri(FEN + 1, MW - FEN - 2), y = ri(FEN + 1, MH - FEN - 2), i = y * MW + x;
    if (navBlocked(x, y) || map[i] === DOOR || map[i] === WIN) continue;
    const d = Math.hypot(x + .5 - P.x, y + .5 - P.y);
    if (d < minD) continue;
    if (init && hAt[i] === spawnHouse) continue;
    if (!init && (vis[i] || d < 14)) continue;
    zType(mkZombie(x + .5, y + .5, zPal(), ri(48, 72), (.82 + rng() * .38) * DIFF[world.diff].spd));
    return;
  }
}
