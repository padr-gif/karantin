// ================= state =================
let P, zs, decals, corpses, kills, gameMin, startMin, powerOffAt, waterOffAt, powerMsg, waterMsg;
let mode = 'menu', paused = false, spawnHouse = 0;
let spawnTimer = 0, flowTimer = 0, visTimer = 0, noiseTimer = 0, hudTimer = 0, weatherTimer = 0;
let shake = 0, camX = 0, camY = 0, lastCause = 'Загрызли', curAct = null, curBar = null;
let rain = 0, rainTarget = 0;
const flow = new Int16Array(NT);
const buckets = Array.from({length:90}, () => []);
function zPal() {
  const r = rng(), rb = rng(), b = rb < .34 ? 'f' : rb < .5 ? 'h' : 'm';
  if (r < (typeof gameMin === 'number' && lightLevel() < .3 ? .12 : .025)) return {pi:14, fast:true, b:b === 'h' ? 'm' : b, blood:0};
  let pi = r < .28 ? ri(10, 13) : ri(0, 9);
  for (let k = 0; k < 10 && b === 'f' && ZPALS[pi] && ZPALS[pi].bald; k++) pi = (pi + 1) % 10;
  return {pi, b, blood:0};
}
function mkZombie(x, y, pal, hp, spd) {
  const z = {x, y, r:.26, hp, spd, state:'wander', tx:x, ty:y, wt:0, it:0,
    atk:rng(), wind:0, stun:0, kx:0, ky:0, face:rng() * 6.28, lost:0, pal, sway:rng() * 6, bash:0, walk:rng() * 6,
    seed:rng(), gait:0, mv:0, reachA:0};
  if (!pal.pi || pal.pi < 10) z.crawl = rng() < .07;
  if (z.crawl) z.hp = Math.min(z.hp, 45);
  zs.push(z); return z;
}
let fires = [], barrels = [];
const PPAL = {skin:[214,176,138], cloth:[56,92,128], pants:[48,52,64], hair:[60,44,30], shoes:[44,38,34], blood:0, pack:true};

function newGame(o) {
  o = o || {};
  world.seed = o.seed != null ? o.seed : ((Date.now() * 2654435761) >>> 0);
  world.diff = o.diff || 'normal';
  rng = mulberry32(world.seed);
  generate();
  { const Lm = DIFF[world.diff].loot; for (const c of furns.filter(f => CONT[f.type].loot).concat(props.filter(p => p.type === 'car'))) { if (Lm > 1 && rng() < Lm - 1) c.items.push(mkItem(pick(CONT[c.type].loot))); if (Lm < 1) c.items = c.items.filter(() => rng() < Lm + .1); } }
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
  EV.h = null;
  if (!o.save) {
    world.evac = null;
    { const hi = hAt[Math.floor(P.y) * MW + Math.floor(P.x)]; const fs = furns.filter(f => hi && hAt[f.y * MW + f.x] === hi && CONT[f.type] && CONT[f.type].loot && ['nightstand', 'dresser', 'wardrobe', 'hanger'].includes(f.type)); if (fs.length) fs[Math.floor(rng() * fs.length)].items.push(mkItem('watchQ')); }
    for (let i = 0, n = Math.round(125 * DIFF[world.diff].z); i < n; i++) spawnZombie(11, true);
    for (const g of SPECIAL) if (g.corpse) { corpses.push({x:g.x, y:g.y, face:rng() * 6.28, pal:{pi:g.pi, b:rng() < .4 ? 'f' : 'm', blood:3}, fall:1, dir:-1, seed:rng()}); for (let q = 0; q < 3; q++) addBlood(g.x + (rng() - .5), g.y + (rng() - .5), .8); }
    for (const g of SPECIAL) for (let k = 0; k < g.n && !g.corpse; k++) { const x = g.x + (rng() - .5) * 3, y = g.y + (rng() - .5) * 3; if (navBlocked(Math.floor(x), Math.floor(y)) || Math.hypot(x - P.x, y - P.y) < 12) continue; mkZombie(x, y, {pi:g.pi, b:rng() < .3 ? 'f' : 'm', blood:0}, ri(55, 80), (.8 + rng() * .3) * DIFF[world.diff].spd); }
  }
  camX = P.x; camY = P.y;
  buildFlow(); computeVis(); fogDirty = true; parts = [];
  clearCaches();
}
function spawnZombie(minD, init) {
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
