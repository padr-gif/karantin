// ================= map =================
const MW = 184, MH = 184, NT = MW * MH;
const RW = 4, FEN = 20, CITY0 = 30, CITY1 = 154, EXIT_R = 90;
let SPECIAL = [], CHECKPOINTS = [];
const COMM = new Set(['store', 'police', 'pharmacy', 'hardware', 'gas']);
const inCityBox = (x, y) => x >= CITY0 - 1 && x <= CITY1 && y >= CITY0 - 1 && y <= CITY1;
const insideFence = (x, y) => x > FEN && y > FEN && x < MW - 1 - FEN && y < MH - 1 - FEN;
const GRASS=0, ROAD=1, WALK=2, FLOOR=3, WALL=4, WIN=5, TREE=6, DOOR=7, WATER=8;
const map = new Uint8Array(NT), furn = new Int16Array(NT), hAt = new Int16Array(NT), propAt = new Int16Array(NT);
const vis = new Uint8Array(NT), seen = new Uint8Array(NT);
let obs = new Array(NT).fill(null), wpC = new Array(NT).fill(null), wpV = new Array(NT).fill(null);
let houses = [], furns = [], props = [];
const D4 = [[1,0],[-1,0],[0,1],[0,-1]];
const D8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const ROADS = [30, 60, 90, 120, 150];
const HWV = .065, HWC = .1; // wall half-thickness: visual / collision
const get = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH) ? WALL : map[y * MW + x];
const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < MW && y < MH) map[y * MW + x] = t; };
const isWallish = t => t === WALL || t === WIN || t === DOOR;
const wallishAt = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && isWallish(map[y * MW + x]);
const alongX = (x, y) => wallishAt(x - 1, y) || wallishAt(x + 1, y);
const inRoadCol = x => ROADS.some(r => x >= r - 1 && x <= r + RW);

function pieces(x, y, h) {
  const a = .5 - h, b = .5 + h, r = [];
  if (wallishAt(x, y - 1)) r.push([a, 0, b, a]);
  if (wallishAt(x - 1, y)) r.push([0, a, a, b]);
  r.push([a, a, b, b]);
  if (wallishAt(x + 1, y)) r.push([b, a, 1, b]);
  if (wallishAt(x, y + 1)) r.push([a, b, b, 1]);
  return r;
}
function openingBlocks(i) {
  const t = map[i], o = obs[i];
  if (t === DOOR) return !o.open || o.bhp > 0;
  if (t === WIN) return !(o.broken || o.open) || o.bhp > 0;
  return false;
}
// tile-level navigation blocking (for path field / spawning)
function navBlocked(x, y) {
  if (x < 0 || y < 0 || x >= MW || y >= MH) return true;
  const i = y * MW + x, t = map[i];
  if (t === WALL || t === TREE || t === WATER || furn[i]) return true;
  if (propAt[i] && props[propAt[i] - 1].solid) return true;
  return openingBlocks(i);
}
// precise collision rects of a tile, world coords
function tileRects(x, y, cb) {
  if (x < 0 || y < 0 || x >= MW || y >= MH) return cb(x, y, x + 1, y + 1);
  const i = y * MW + x, t = map[i];
  if (t === WALL) { for (const r of wpC[i]) if (cb(x + r[0], y + r[1], x + r[2], y + r[3])) return true; }
  else if ((t === DOOR || t === WIN) && openingBlocks(i)) {
    if (alongX(x, y)) { if (cb(x, y + .5 - HWC, x + 1, y + .5 + HWC)) return true; }
    else if (cb(x + .5 - HWC, y, x + .5 + HWC, y + 1)) return true;
  }
  else if (t === TREE) { if (cb(x + .36, y + .36, x + .64, y + .64)) return true; }
  else if (t === WATER) { if (cb(x, y, x + 1, y + 1)) return true; }
  if (furn[i]) { const f = furns[furn[i] - 1]; if (cb(f.r[0], f.r[1], f.r[2], f.r[3])) return true; }
  if (propAt[i]) { const p = props[propAt[i] - 1]; if (p.solid && cb(p.r[0], p.r[1], p.r[2], p.r[3])) return true; }
  return false;
}
function opaquePt(x, y) {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
  const i = ty * MW + tx, t = map[i];
  if (t !== WALL && t !== DOOR && t !== WIN) return false;
  const lx0 = x - tx, ly0 = y - ty, h = HWV + .03;
  if (t === WALL) { for (const r of wpV[i]) if (lx0 >= r[0] - .03 && lx0 <= r[2] + .03 && ly0 >= r[1] - .03 && ly0 <= r[3] + .03) return true; return false; }
  const o = obs[i];
  const op = t === DOOR ? (!o.open || o.bhp > 0) : (o.bhp >= 90 || (o.cc && o.cur));
  if (!op) return false;
  return alongX(tx, ty) ? Math.abs(ly0 - .5) < h : Math.abs(lx0 - .5) < h;
}

function mkItem(id) {
  const d = ITEMS[id], it = {id};
  if (d.kind === 'weapon') it.dur = d.dur;
  if (id === 'flashlight') { it.ch = ri(25, 100); it.on = false; }
  if (d.uses) it.uses = id === 'matches' ? ri(2, d.uses) : ri(6, d.uses);
  return it;
}
function houseOk(Hs) {
  const mark = new Set(), q = [];
  for (let y = Hs.y; y < Hs.y + Hs.h; y++) for (let x = Hs.x; x < Hs.x + Hs.w; x++) {
    const border = x === Hs.x || y === Hs.y || x === Hs.x + Hs.w - 1 || y === Hs.y + Hs.h - 1;
    if (border && get(x, y) === DOOR) { const i = y * MW + x; mark.add(i); q.push(i); }
  }
  while (q.length) {
    const i = q.pop(), x = i % MW, y = (i / MW) | 0;
    for (const [ox, oy] of D4) {
      const nx = x + ox, ny = y + oy;
      if (nx < Hs.x || ny < Hs.y || nx >= Hs.x + Hs.w || ny >= Hs.y + Hs.h) continue;
      const j = ny * MW + nx, t = map[j];
      if (mark.has(j) || furn[j] || (t !== FLOOR && t !== DOOR)) continue;
      mark.add(j); q.push(j);
    }
  }
  for (let y = Hs.y + 1; y < Hs.y + Hs.h - 1; y++) for (let x = Hs.x + 1; x < Hs.x + Hs.w - 1; x++) {
    const i = y * MW + x;
    if (map[i] === FLOOR && !furn[i] && !mark.has(i)) return false;
  }
  return true;
}
// ---- residential houses with rooms ----
const FSZ = {stove:[.8,.7], fridge:[.72,.72], sink:[.8,.7], cabinet:[.84,.72], bed:[.86,.86], wardrobe:[.8,.6], shelf:[.8,.56], crate:[.62,.62],
  toilet:[.5,.7], bath:[.9,.9], medcab:[.66,.5], table:[.78,.78], sofa:[.92,.72], tv:[.8,.5], nightstand:[.46,.42], dresser:[.84,.42], bookshelf:[.8,.42], hanger:[.34,.34], counter2:[.88,.6]};
const ROOMN = {kitchen:'Кухня', hall:'Прихожая', living:'Гостиная', bedroom:'Спальня', bath:'Ванная'};
function addFurnIn(Hs, type, room, center) {
  const cand = [];
  for (let y = room.y0; y <= room.y1; y++) for (let x = room.x0; x <= room.x1; x++) {
    if (get(x, y) !== FLOOR || furn[y * MW + x]) continue;
    let wd = null, doorN = false, winN = false;
    for (const [ox, oy] of shuffle([[0,-1],[-1,0],[1,0],[0,1]])) { const t = get(x + ox, y + oy); if (!wd && t === WALL) wd = [ox, oy]; if (t === WIN) winN = true; if (t === DOOR) doorN = true; }
    if (!wd && winN && type !== 'medcab' && type !== 'bookshelf' && type !== 'wardrobe') for (const [ox, oy] of [[0,-1],[-1,0],[1,0],[0,1]]) if (get(x + ox, y + oy) === WIN) { wd = [ox, oy]; break; }
    if (doorN) continue;
    if (center) { if (!wd) cand.push([x, y, [0, -1]]); continue; }
    if (wd) cand.push([x, y, wd]);
  }
  shuffle(cand);
  const t = SPRA[type] && FSZ[SPRA[type]] && !FSZ[type] ? SPRA[type] : type;
  for (const [x, y, wd] of cand) {
    const i = y * MW + x, [sa, sb] = FSZ[t] || [.8, .7];
    const sx = wd[0] ? sb : sa, sy = wd[0] ? sa : sb;
    const cx = center ? x + .5 : x + .5 + wd[0] * (.5 - HWV - sx / 2 - .02 + .5), cy = center ? y + .5 : y + .5 + wd[1] * (.5 - HWV - sy / 2 - .02 + .5);
    const f = {x, y, type, items:[], searched:false, wd, cx, cy, sx, sy, r:[cx - sx / 2, cy - sy / 2, cx + sx / 2, cy + sy / 2], v:type === 'sofa' ? ri(0, 2) : type === 'bookshelf' ? ri(0, 1) : 0};
    furns.push(f); furn[i] = furns.length;
    if (houseOk(Hs)) {
      const c = CONT[type];
      if (c && c.loot) for (let q = ri(c.n[0], c.n[1]); q > 0; q--) f.items.push(mkItem(rng() < .03 ? 'pipe' : pick(c.loot)));
      if (type === 'toilet') f.w = 4;
      return f;
    }
    furns.pop(); furn[i] = 0;
  }
  return null;
}
function mkDoorAt(x, y, s, inner, Hs) {
  set(x, y, DOOR);
  obs[y * MW + x] = inner ? {t:'door', open:false, hp:60, dead:false, bhp:0, sw:1} : {t:'door', open:false, hp:70, dead:false, bhp:0, sw:(s === 0 || s === 2) ? 1 : -1, locked:rng() < .45};
  if (!inner) Hs.doors.push({x, y, s});
}
function buildResidential(Hs) {
  const hx = Hs.x, hy = Hs.y, w = Hs.w, h = Hs.h;
  const X0 = hx + 1, X1 = hx + w - 2, Y0 = hy + 1, Y1 = hy + h - 2, rows = h - 2;
  const leftW = Math.max(3, Math.min(w - 6, Math.round((w - 2) * (.42 + rng() * .12))));
  const flip = rng() < .5;
  const vx = flip ? X1 - leftW : X0 + leftW;
  const L = flip ? [vx + 1, X1] : [X0, vx - 1], R = flip ? [X0, vx - 1] : [vx + 1, X1];
  for (let y = Y0; y <= Y1; y++) set(vx, y, WALL);
  Hs.inner = vx;
  const kTop = rng() < .5, kRows = Math.min(rows - 4, ri(3, 4)), lwy = kTop ? Y0 + kRows : Y1 - kRows;
  for (let x = L[0]; x <= L[1]; x++) set(x, lwy, WALL);
  const kitchen = {x0:L[0], x1:L[1], y0:kTop ? Y0 : lwy + 1, y1:kTop ? lwy - 1 : Y1, type:'kitchen'};
  const hallRows = rows - kRows - 1, hall = {x0:L[0], x1:L[1], y0:kTop ? lwy + 1 : Y0, y1:kTop ? Y1 : lwy - 1, type:hallRows * (L[1] - L[0] + 1) >= 15 ? 'living' : 'hall'};
  mkDoorAt(ri(L[0], L[1]), lwy, 0, true, Hs);
  // right side: bedroom(s) + bathroom
  const rr = [];
  const rwall = y => { for (let x = R[0]; x <= R[1]; x++) set(x, y, WALL); };
  if (rows >= 10 && rng() < .6) {
    const b1 = ri(3, rows - 7);
    rr.push({y0:Y0, y1:Y0 + b1 - 1, type:'bedroom'}); rwall(Y0 + b1);
    rr.push({y0:Y0 + b1 + 1, y1:Y0 + b1 + 2, type:'bath'}); rwall(Y0 + b1 + 3);
    rr.push({y0:Y0 + b1 + 4, y1:Y1, type:'bedroom'});
  } else {
    const br = rows >= 8 ? 3 : 2, top = rng() < .5;
    if (top) { rr.push({y0:Y0, y1:Y0 + br - 1, type:'bath'}); rwall(Y0 + br); rr.push({y0:Y0 + br + 1, y1:Y1, type:'bedroom'}); }
    else { rr.push({y0:Y0, y1:Y1 - br - 1, type:'bedroom'}); rwall(Y1 - br); rr.push({y0:Y1 - br + 1, y1:Y1, type:'bath'}); }
  }
  for (const r of rr) {
    r.x0 = R[0]; r.x1 = R[1];
    const opts = []; for (let y = r.y0; y <= r.y1; y++) if (y !== lwy && get(vx - 1, y) !== WALL && get(vx + 1, y) !== WALL) opts.push(y);
    mkDoorAt(vx, opts.length ? pick(opts) : r.y0, 0, true, Hs);
  }
  Hs.rooms = [kitchen, hall, ...rr];
  for (const r of Hs.rooms) if (r.type === 'bedroom' && rng() < .55) r.carpet = ri(0, 2);
  // exterior doors: front door from the hallway, sometimes a back door from the kitchen
  const outY = r => (r.y0 === Y0 ? 0 : 1), outX = flip ? hx + w - 1 : hx;
  { const s = outY(hall); mkDoorAt(ri(L[0], L[1]), s ? hy + h - 1 : hy, s, false, Hs); }
  if (rng() < .45) { const s = outY(kitchen); const opts = []; for (let x = L[0]; x <= L[1]; x++) opts.push(x); mkDoorAt(pick(opts), s ? hy + h - 1 : hy, s, false, Hs); }
  else if (rng() < .3) { const y = ri(hall.y0, hall.y1); if (get(outX, y - 1) === WALL && get(outX, y + 1) === WALL) mkDoorAt(outX, y, flip ? 3 : 2, false, Hs); }
  // windows on outer walls
  for (let y = hy; y < hy + h; y++) for (let x = hx; x < hx + w; x++) {
    const border = x === hx || y === hy || x === hx + w - 1 || y === hy + h - 1;
    const corner = (x === hx || x === hx + w - 1) && (y === hy || y === hy + h - 1);
    if (!border || corner || get(x, y) !== WALL) continue;
    if (get(x + 1, y) === DOOR || get(x - 1, y) === DOOR || get(x, y + 1) === DOOR || get(x, y - 1) === DOOR) continue;
    const inX = x === hx ? x + 1 : x === hx + w - 1 ? x - 1 : x, inY = y === hy ? y + 1 : y === hy + h - 1 ? y - 1 : y;
    if (get(inX, inY) === WALL) continue;
    if (rng() < .3) { set(x, y, WIN); obs[y * MW + x] = {t:'win', broken:rng() < .07, ghp:10, bhp:0, cur:rng() < .5 ? pick([[150,70,60],[90,110,90],[200,190,160],[90,100,140]]) : null}; }
  }
  // furniture by room
  const area = r => (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);
  for (const r of Hs.rooms) {
    let list = [];
    if (r.type === 'kitchen') list = ['fridge', 'stove', 'sink', 'cabinet', 'cabinet'];
    else if (r.type === 'living') list = ['sofa', 'tv', 'bookshelf', 'hanger'];
    else if (r.type === 'hall') list = ['hanger', 'dresser'];
    else if (r.type === 'bedroom') list = ['bed', 'wardrobe', 'nightstand'].concat(area(r) >= 12 ? ['dresser'] : []);
    else if (r.type === 'bath') list = ['toilet', 'medcab'].concat(area(r) >= 6 ? ['bath'] : []);
    for (const t of list) addFurnIn(Hs, t, r);
    if (r.type === 'kitchen' && area(r) >= 12) addFurnIn(Hs, 'table', r, true);
    if ((r.type === 'living' || r.type === 'bedroom') && rng() < .6) {
      const rw = Math.min(r.x1 - r.x0 + 1, ri(2, 3)) - .3, rh = Math.min(r.y1 - r.y0 + 1, ri(1, 2)) + .2;
      const rx = r.x0 + rng() * Math.max(0, r.x1 - r.x0 + 1 - rw), ry = r.y0 + rng() * Math.max(0, r.y1 - r.y0 + 1 - rh);
      Hs.rugs.push([rx + .15, ry + .15, rx + rw, ry + rh, pick([[124,58,52],[64,84,110],[120,104,70],[86,96,74]])]);
    }
  }
}
// survivors' hideouts: boarded up, stocked, someone didn't make it
const NOTES = [
  'Зима здесь злая. Запаси дрова, тёплую одежду и еду, которая не портится. Летом будет легче, если доживёшь.',
  'Свет отрубили на восьмой день, воду — на следующий. Наполни всё, что можно, пока краны ещё текут.',
  'По радио каждый час одно и то же: «оставайтесь дома». Никто не приедет. Я перестал ждать на пятый день.',
  'Банки на верёвке на двери спасли нам жизнь. Проснулись от звона за минуту до того, как они вломились.',
  'Разобрал шкаф на доски, заколотил окна. Топор — лучший друг. И оружие, и инструмент.',
  'Мясо, картошка, морковь, кастрюля воды. Рагу на костре — и жить снова хочется.',
  'Снял с мертвого полицейского дубинку и бинты. У них часто что-то есть в карманах.',
  'Свечи кончаются быстро. Береги батарейки для фонаря, свечи — для дома.',

  'День 3. Заколотили окна. Мама кашляет всё сильнее. Если найдёшь это — не открывай дверь в спальню.',
  'Военные сказали ждать эвакуации у школы. Никто не пришёл. Мы ушли к блокпосту на востоке. Не ходите туда.',
  'Свет отключат со дня на день. Запасся бензином для генератора, канистры в гараже.',
  'Укус на руке почернел. Оставляю вам всё, что собрал. Простите, что не дождался.',
  'Они идут на звук. Один раз бросил будильник во двор соседа — ушли все до одного.',
  'Вертолёт кружил над нами час. После него пришла целая толпа. Прячьтесь в доме, когда услышите винты.',
  'Список: вода, тушёнка, бинты, батарейки. Аптеку на углу уже вычистили. Полиция — пока нет.',
  'Если читаешь это, значит я так и не вернулся с заправки. Ключи от синей машины под ковриком.',
];
function stockHideout(Hs) {
  Hs.hideout = true;
  for (let y = Hs.y; y < Hs.y + Hs.h; y++) for (let x = Hs.x; x < Hs.x + Hs.w; x++) {
    const o = obs[y * MW + x]; if (!o) continue;
    const border = x === Hs.x || y === Hs.y || x === Hs.x + Hs.w - 1 || y === Hs.y + Hs.h - 1;
    if (!border) continue;
    if (o.t === 'win') { o.bhp = pick([90, 135, 135]); o.broken = false; }
    else { o.bhp = 90; o.open = false; o.locked = true; }
  }
  const room = Hs.rooms.find(r => r.type === 'living' || r.type === 'hall') || Hs.rooms[0];
  const loot = ['canned', 'stew', 'water', 'water', 'mre', 'bandage', 'medkit', 'battery', 'flashlight', 'crowbar', 'axe', 'molotov', 'jerrycan', 'seeds', 'cereal', 'pbutter', 'jug', 'antibio', 'honey'];
  for (let k = 0; k < 3; k++) { const f = addFurnIn(Hs, 'crate', room); if (f) { f.items = []; for (let n = ri(3, 5); n > 0; n--) f.items.push(mkItem(pick(loot))); } }
  const bed = Hs.rooms.find(r => r.type === 'bedroom'), f2 = bed && addFurnIn(Hs, 'nightstand', bed);
  const tgt = f2 || furns.find(f => hAt[f.y * MW + f.x] === houses.indexOf(Hs) + 1 && CONT[f.type] && CONT[f.type].loot);
  if (tgt) tgt.items.push(mkItem('note'));
  SPECIAL.push({x:(room.x0 + room.x1) / 2 + .5, y:(room.y0 + room.y1) / 2 + .5, pi:ri(0, 9), n:1, corpse:true});
}

function buildHouse(hx, hy, w, h, kind, opts) {
  const comm = COMM.has(kind);
  const idx = houses.length + 1;
  const Hs = {x:hx, y:hy, w, h, kind, ridgeX: w >= h, inner:-1, doors:[],
    ix0:hx + .5, iy0:hy + .5, ix1:hx + w - .5, iy1:hy + h - .5,
    wallC: comm ? (WALLK[kind] || [176,170,158]) : kind === 'shed' ? [128,108,82] : pick(SIDING),
    paper: comm ? [206,204,196] : kind === 'shed' ? [118,100,78] : pick(PAPER),
    roofC: comm ? [96,98,102] : kind === 'shed' ? [84,80,74] : pick(ROOFC), sign:SIGNS[kind] || null,
    chimney: kind === 'house' && rng() < .6 ? [ri(hx + 1, hx + w - 2), ri(hy + 1, hy + h - 2)] : null,
    rugs:[], kitchen:0, pstyle:ri(0, 2)};
  houses.push(Hs);
  for (let y = hy; y < hy + h; y++) for (let x = hx; x < hx + w; x++) {
    const border = x === hx || y === hy || x === hx + w - 1 || y === hy + h - 1;
    set(x, y, border ? WALL : FLOOR); hAt[y * MW + x] = idx;
  }
  if (kind === 'house') { buildResidential(Hs); return Hs; }
  let inner = -1;
  if (false) {
    inner = hx + ri(3, w - 4); Hs.inner = inner;
    for (let y = hy + 1; y < hy + h - 1; y++) set(inner, y, WALL);
    const dy = ri(hy + 1, hy + h - 2); set(inner, dy, DOOR);
    obs[dy * MW + inner] = {t:'door', open:false, hp:60, dead:false, bhp:0, sw:1};
  }
  const sides = opts && opts.sides ? opts.sides.slice() : shuffle([0, 1, 2, 3]);
  const nd = comm ? (kind === 'store' || kind === 'police' ? 2 : 1) : kind === 'shed' ? 1 : (rng() < .45 ? 2 : 1);
  const dbl = comm;
  for (let k = 0; k < nd; k++) {
    const s = sides[k]; let x, y, tries = 0;
    do {
      if (s < 2) { x = ri(hx + 1, hx + w - (dbl ? 3 : 2)); y = s === 0 ? hy : hy + h - 1; }
      else { y = ri(hy + 1, hy + h - (dbl ? 3 : 2)); x = s === 2 ? hx : hx + w - 1; }
      tries++;
    } while ((x === inner || (dbl && x + 1 === inner)) && tries < 30);
    const cells = [[x, y]];
    if (dbl) cells.push(s < 2 ? [x + 1, y] : [x, y + 1]);
    const sw = (s === 0 || s === 2) ? 1 : -1; // swing toward inside
    for (const [cx, cy] of cells) { set(cx, cy, DOOR); obs[cy * MW + cx] = {t:'door', open:false, hp:70, dead:false, bhp:0, sw}; }
    Hs.doors.push({x, y, s});
  }
  const winP = comm ? .4 : kind === 'shed' ? 0 : .26;
  for (let y = hy; y < hy + h; y++) for (let x = hx; x < hx + w; x++) {
    const border = x === hx || y === hy || x === hx + w - 1 || y === hy + h - 1;
    const corner = (x === hx || x === hx + w - 1) && (y === hy || y === hy + h - 1);
    if (!border || corner || get(x, y) !== WALL || x === inner) continue;
    if (get(x+1,y)===DOOR||get(x-1,y)===DOOR||get(x,y+1)===DOOR||get(x,y-1)===DOOR) continue;
    if (rng() < winP) { set(x, y, WIN); obs[y * MW + x] = {t:'win', broken:rng() < .07, ghp:10, bhp:0, cur:rng() < .5 ? pick([[150,70,60],[90,110,90],[200,190,160],[90,100,140]]) : null}; }
  }
  const cand = [];
  for (let y = hy + 1; y < hy + h - 1; y++) for (let x = hx + 1; x < hx + w - 1; x++) {
    if (get(x, y) !== FLOOR) continue;
    let wd = null, doorN = false;
    for (const [ox, oy] of [[0,-1],[-1,0],[1,0],[0,1]]) { const t = get(x+ox, y+oy); if (!wd && (t === WALL || t === WIN)) wd = [ox, oy]; if (t === DOOR) doorN = true; }
    if (wd && !doorN) cand.push([x, y, wd]);
  }
  shuffle(cand);
  let list;
  if (FLIST[kind]) list = FLIST[kind].slice();
  else if (kind === 'shed') list = rng() < .5 ? ['crate', 'crate'] : ['crate'];
  else { list = ['fridge', 'stove', 'sink', 'cabinet', 'bed']; for (let i = ri(0, 2); i > 0; i--) list.push(pick(['cabinet','wardrobe','shelf','wardrobe'])); }
  const fsz = Object.assign({}, FSZ);
  for (const k in SPRA) if (!fsz[k]) fsz[k] = fsz[SPRA[k]];
  for (const type of list) {
    for (let k = 0; k < cand.length; k++) {
      const [x, y, wd] = cand[k], i = y * MW + x;
      if (furn[i]) continue;
      const [sa, sb] = fsz[type];
      const sx = wd[0] ? sb : sa, sy = wd[0] ? sa : sb; // depth axis points at the wall
      const cx = x + .5 + wd[0] * (.5 - HWV - sx / 2 - .02 + .5) , cy = y + .5 + wd[1] * (.5 - HWV - sy / 2 - .02 + .5);
      const f = {x, y, type, items:[], searched:false, wd, cx, cy, sx, sy, r:[cx - sx / 2, cy - sy / 2, cx + sx / 2, cy + sy / 2]};
      furns.push(f); furn[i] = furns.length;
      if (houseOk(Hs)) {
        cand.splice(k, 1);
        const c = CONT[type];
        if (c.loot) {
          const n = comm && (type === 'shelf' || type === 'medshelf' || type === 'toolrack') ? ri(1, 3) : ri(c.n[0], c.n[1]);
          const L = (LOOTK[kind] && LOOTK[kind][type]) || c.loot;
          for (let q = 0; q < n; q++) f.items.push(mkItem(rng() < .04 ? 'pipe' : pick(L)));
        }
        if ((type === 'fridge' || type === 'sink') && inner >= 0) Hs.kitchen = x < inner ? -1 : 1;
        break;
      }
      furns.pop(); furn[i] = 0;
    }
  }
  if (kind === 'house') {
    const n = ri(0, 2);
    for (let k = 0; k < n; k++) {
      const rw = ri(2, 3) - .2, rh = ri(1, 2) + .3;
      const rx = hx + 1 + rng() * Math.max(0, w - 2 - rw), ry = hy + 1 + rng() * Math.max(0, h - 2 - rh);
      Hs.rugs.push([rx + .2, ry + .2, rx + rw, ry + rh, pick([[124,58,52],[64,84,110],[120,104,70],[86,96,74]])]);
    }
  }
}
function addProp(p, tiles) {
  for (const [x, y] of tiles) { if (x < 0 || y < 0 || x >= MW || y >= MH) return false; const i = y * MW + x; if (propAt[i] || map[i] === TREE) return false; }
  props.push(p); for (const [x, y] of tiles) propAt[y * MW + x] = props.length; return true;
}
function generate() {
  map.fill(GRASS); furn.fill(0); hAt.fill(0); propAt.fill(0); seen.fill(0); vis.fill(0);
  obs = new Array(NT).fill(null); houses = []; furns = []; props = []; SPECIAL = []; CHECKPOINTS = [];
  const RL = ROADS[ROADS.length - 1] + RW - 1;
  // city streets
  for (const r of ROADS) for (let i = CITY0; i <= RL; i++) for (let k = 0; k < RW; k++) { set(i, r + k, ROAD); set(r + k, i, ROAD); }
  // highway exits: the middle street runs out of town in all four directions
  for (let i = 0; i < MW; i++) for (let k = 0; k < RW; k++) { set(i, EXIT_R + k, ROAD); set(EXIT_R + k, i, ROAD); }
  for (const r of ROADS) for (let i = CITY0 - 1; i <= CITY1; i++) for (const s of [r - 1, r + RW]) {
    if (get(i, s) === GRASS) set(i, s, WALK);
    if (get(s, i) === GRASS) set(s, i, WALK);
  }
  const NB = ROADS.length - 1, blocks = [];
  for (let bj = 0; bj < NB; bj++) for (let bi = 0; bi < NB; bi++)
    blocks.push({x0:ROADS[bi] + RW + 2, x1:ROADS[bi + 1] - 2, y0:ROADS[bj] + RW + 2, y1:ROADS[bj + 1] - 2});
  const order = shuffle(blocks.map((_, i) => i));
  const role = {};
  ['police', 'pharmacy', 'hardware', 'gas', 'store', 'store', 'park', 'park'].forEach((k, n) => role[order[n]] = k);
  const SIZE = {police:[12, 9], pharmacy:[9, 7], hardware:[11, 8], store:[13, 9], gas:[8, 6]};
  blocks.forEach((b, i) => {
    const k = role[i];
    if (k === 'park') { b.park = true; return; }
    const rects = [];
    if (k) {
      const [w, h] = SIZE[k];
      if (k === 'gas') {
        rects.push({x:b.x0 + 1, y:b.y0 + 1, w, h, kind:k});
        const py = b.y0 + h + 3;
        for (const px of [b.x0 + 2, b.x0 + 6]) addProp({type:'pump', proc:true, cx:px + .5, cy:py + .5, solid:true, r:[px + .3, py + .32, px + .7, py + .68]}, [[px, py]]);
        SPECIAL.push({x:b.x0 + 4, y:py, pi:12, n:2});
      } else {
        rects.push({x:b.x0 + 1, y:b.y1 - h + 1, w, h, kind:k});
        const mid = [b.x0 + 1 + w / 2, b.y1 - h / 2];
        if (k === 'police') SPECIAL.push({x:mid[0], y:mid[1], pi:10, n:4}), b.police = true;
        if (k === 'pharmacy') SPECIAL.push({x:mid[0], y:mid[1], pi:11, n:3});
      }
    }
    for (let t = 0; t < 200 && rects.length < (k ? 3 : 4); t++) {
      const big = t < 30 && rects.filter(r => r.kind === 'house' && r.h >= 12).length < 1, w = big ? ri(10, 12) : ri(9, 10), h = big ? ri(12, 13) : ri(8, 10);
      const hx = ri(b.x0, b.x1 - w + 1), hy = ri(b.y0, b.y1 - h + 1);
      if (rects.some(r => hx < r.x + r.w + 2 && hx + w + 2 > r.x && hy < r.y + r.h + 2 && hy + h + 2 > r.y)) continue;
      if (k === 'gas' && hy < b.y0 + 13) continue;
      rects.push({x:hx, y:hy, w, h, kind:'house'});
    }
    if (rects.length < 3) for (let t = 0; t < 60 && rects.length < 4; t++) { const w = 9, h = 8, hx = ri(b.x0, b.x1 - w + 1), hy = ri(b.y0, b.y1 - h + 1); if (rects.some(r => hx < r.x + r.w + 2 && hx + w + 2 > r.x && hy < r.y + r.h + 2 && hy + h + 2 > r.y)) continue; rects.push({x:hx, y:hy, w, h, kind:'house'}); }
    if (!k && rng() < .7) for (let t = 0; t < 30; t++) {
      const hx = ri(b.x0, b.x1 - 3), hy = ri(b.y0, b.y1 - 3);
      if (rects.some(r => hx < r.x + r.w + 1 && hx + 5 > r.x && hy < r.y + r.h + 1 && hy + 5 > r.y)) continue;
      rects.push({x:hx, y:hy, w:4, h:4, kind:'shed'}); break;
    }
    for (const r of rects) buildHouse(r.x, r.y, r.w, r.h, r.kind, COMM.has(r.kind) ? {sides:[1, 3, 0, 2]} : null);
  });
  // cabins in the woods between the town and the fence
  for (let n = 0, t = 0; n < 4 && t < 300; t++) {
    const x = ri(FEN + 3, MW - FEN - 8), y = ri(FEN + 3, MH - FEN - 8);
    if (inCityBox(x - 2, y - 2) || inCityBox(x + 6, y + 6) || inCityBox(x - 2, y + 6) || inCityBox(x + 6, y - 2)) continue;
    let ok = true; for (let yy = y - 2; yy < y + 7 && ok; yy++) for (let xx = x - 2; xx < x + 7; xx++) if (get(xx, yy) !== GRASS) { ok = false; break; }
    if (!ok) continue;
    buildHouse(x, y, 5, 4, 'shed'); n++;
  }
  { const homes = shuffle(houses.filter(H => H.kind === 'house' && H.rooms && H.w >= 8)); for (const H of homes.slice(0, 3)) stockHideout(H); }
  const plantTree = (x, y) => {
    if (get(x, y) !== GRASS) return;
    for (const [ox, oy] of D8) if (get(x + ox, y + oy) !== GRASS) return;
    set(x, y, TREE);
  };
  const nearFence = (x, y, d) => Math.min(Math.abs(x - FEN), Math.abs(x - (MW - 1 - FEN)), Math.abs(y - FEN), Math.abs(y - (MH - 1 - FEN))) <= d;
  const nearRoad = (x, y, d) => { for (let yy = y - d; yy <= y + d; yy++) for (let xx = x - d; xx <= x + d; xx++) { const t = get(xx, yy); if (t === ROAD || t === WALK) return true; } return false; };
  // city greenery
  for (let i = 0; i < 900; i++) { const x = ri(CITY0, CITY1), y = ri(CITY0, CITY1); plantTree(x, y); }
  for (const b of blocks) if (b.park) makePond(b);
  for (const b of blocks) if (b.park) for (let i = 0; i < 70; i++) plantTree(ri(b.x0, b.x1), ri(b.y0, b.y1));
  // forests: thin wood inside the fence, dense wood beyond it
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (inCityBox(x, y) || get(x, y) !== GRASS || hAt[y * MW + x] || nearFence(x, y, 1) || nearRoad(x, y, 1)) continue;
    let near = false; for (const H of houses) if (x >= H.x - 2 && x <= H.x + H.w + 1 && y >= H.y - 2 && y <= H.y + H.h + 1) { near = true; break; }
    if (near) continue;
    const outside = !insideFence(x, y), n = hash(x * 7 + 3, y * 5 + 1);
    if (rng() < (outside ? .36 + .2 * n : .1 + .14 * n)) set(x, y, TREE);
  }
  // wall geometry cache
  for (let i = 0; i < NT; i++) if (map[i] === WALL) { const x = i % MW, y = (i / MW) | 0; wpC[i] = pieces(x, y, HWC); wpV[i] = pieces(x, y, HWV); } else { wpC[i] = wpV[i] = null; }
  // quarantine checkpoints on every exit
  for (const side of ['w', 'e', 'n', 's']) checkpoint(side);
  // quarantine fence all around the town
  const F2 = MW - 1 - FEN;
  for (let v = FEN; v <= F2; v++) {
    for (const x of [FEN, F2]) if (get(x, v) !== ROAD && !propAt[v * MW + x]) { if (get(x, v) === TREE) set(x, v, GRASS); addProp({type:'fence', proc:true, ax:'y', cx:x + .5, cy:v + .5, solid:true, r:[x + .42, v, x + .58, v + 1], sign:(v % 9) === 4}, [[x, v]]); }
    for (const y of [FEN, F2]) if (get(v, y) !== ROAD && !propAt[y * MW + v]) { if (get(v, y) === TREE) set(v, y, GRASS); addProp({type:'fence', proc:true, ax:'x', cx:v + .5, cy:y + .5, solid:true, r:[v, y + .42, v + 1, y + .58], sign:(v % 9) === 4}, [[v, y]]); }
  }
  // parked cars in town
  for (let t = 0; t < 90; t++) {
    const r = pick(ROADS), lane = r + pick([0, RW - 1]);
    if (rng() < .5) {
      const x = ri(CITY0, CITY1 - 2); if (inRoadCol(x) || inRoadCol(x + 1) || get(x, lane) !== ROAD || get(x + 1, lane) !== ROAD) continue;
      const cx = x + 1, cy = lane + .5;
      addProp({type:'car', dir:'x', cx, cy, ci:ri(0, 5), solid:true, r:[cx - .95, cy - .42, cx + .95, cy + .42], flip:rng() < .5}, [[x, lane], [x + 1, lane]]);
    } else {
      const y = ri(CITY0, CITY1 - 2); if (inRoadCol(y) || inRoadCol(y + 1) || get(lane, y) !== ROAD || get(lane, y + 1) !== ROAD) continue;
      const cx = lane + .5, cy = y + 1;
      addProp({type:'car', dir:'y', cx, cy, ci:ri(0, 5), solid:true, r:[cx - .42, cy - .95, cx + .42, cy + .95], flip:rng() < .5}, [[lane, y], [lane, y + 1]]);
    }
  }
  // police cruisers in front of the station
  for (const b of blocks) if (b.police) {
    const lane = b.y1 + 2;
    for (let n = 0, x = b.x0 + 1; n < 3 && x < b.x1; x += 3) {
      const cx = x + 1, cy = lane + .5;
      if (addProp({type:'car', dir:'x', cx, cy, ci:2, police:true, solid:true, r:[cx - .95, cy - .42, cx + .95, cy + .42], flip:rng() < .5}, [[x, lane], [x + 1, lane]])) n++;
    }
  }
  // street lamps
  for (const r of ROADS) for (let k = CITY0 + 2; k < CITY1; k += 8) {
    if (!inRoadCol(k) && get(k, r - 1) === WALK) addProp({type:'lamp', flick:rng() < .15, cx:k + .5, cy:r - .5 + .3, hx:0, hy:1, solid:true, r:[k + .4, r - 1 + .7, k + .6, r - 1 + .9]}, [[k, r - 1]]);
    if (!inRoadCol(k) && get(r - 1, k) === WALK) addProp({type:'lamp', flick:rng() < .15, cx:r - .5 + .3, cy:k + .5, hx:1, hy:0, solid:true, r:[r - 1 + .7, k + .4, r - 1 + .9, k + .6]}, [[r - 1, k]]);
  }
  // bins, mailboxes, bushes
  for (let i = 0; i < NT; i++) {
    const x = i % MW, y = (i / MW) | 0;
    if (map[i] === WALK && rng() < .018) addProp({type:'bin', cx:x + .5, cy:y + .5, solid:true, r:[x + .3, y + .3, x + .7, y + .7], ci:ri(0, 2)}, [[x, y]]);
    else if (map[i] === GRASS && rng() < (inCityBox(x, y) ? .025 : .05)) addProp({type:'bush', cx:x + .5, cy:y + .5, solid:false, s:.6 + rng() * .5}, [[x, y]]);
  }
  for (const Hs of houses) {
    if (Hs.kind !== 'house' || !Hs.doors.length) continue;
    const d = Hs.doors[0], out = [[0,-1],[0,1],[-1,0],[1,0]][d.s];
    const mx = d.x + out[0] * 2 + (out[0] ? 0 : 1), my = d.y + out[1] * 2 + (out[1] ? 0 : 1);
    if (get(mx, my) === GRASS) addProp({type:'mail', cx:mx + .5, cy:my + .5, solid:true, r:[mx + .4, my + .4, mx + .6, my + .6]}, [[mx, my]]);
    for (let y = Hs.y - 1; y <= Hs.y + Hs.h; y++) for (let x = Hs.x - 1; x <= Hs.x + Hs.w; x++) {
      if (get(x, y) === GRASS && !hAt[y * MW + x] && rng() < .14) addProp({type:'bush', cx:x + .5, cy:y + .5, solid:false, s:.55 + rng() * .4}, [[x, y]]);
    }
  }
  for (const p of props) if (p.type === 'car') {
    p.items = []; p.searched = false; p.fuel = rng() < .25 ? 0 : ri(5, 70); p.key = rng() < (p.army || p.police ? .55 : .3); p.hp = ri(60, 100);
    const L = p.army ? CONT.armybox.loot : p.police ? CONT.locker.loot : CONT.car.loot;
    for (let n = ri(p.army || p.police ? 1 : 0, 3); n > 0; n--) p.items.push(mkItem(pick(L)));
  }
  const crates = furns.filter(f => f.type === 'crate');
  const pool = crates.length ? crates : furns.filter(f => f.type === 'cabinet' || f.type === 'wardrobe');
  if (pool.length && !furns.some(f => f.items.some(it => it.id === 'hammer'))) pick(pool).items.push(mkItem('hammer'));
  if (pool.length) { const c = pick(pool); c.items.push(mkItem('plank'), mkItem('plank')); }
}
// exit checkpoint: concrete blocks across the road at the fence, sandbags, a booth, an army truck, a jam of cars
function checkpoint(side) {
  // a = distance from the map edge along the exit, c = cross coordinate
  const XY = (a, c) => side === 'w' ? [a, c] : side === 'e' ? [MW - 1 - a, c] : side === 'n' ? [c, a] : [c, MH - 1 - a];
  const along = (side === 'w' || side === 'e') ? 'x' : 'y', cross = along === 'x' ? 'y' : 'x';
  const sgn = (side === 'w' || side === 'n') ? 1 : -1;
  const clear = (a, c) => { const [x, y] = XY(a, c); if (get(x, y) === TREE) set(x, y, GRASS); };
  for (let a = FEN - 6; a <= FEN + 8; a++) for (let c = EXIT_R - 5; c <= EXIT_R + 8; c++) clear(a, c);
  const put = (a, c, p) => { const [x, y] = XY(a, c); p.cx = x + .5; p.cy = y + .5; if (!p.r) p.r = [x + .1, y + .1, x + .9, y + .9]; return addProp(p, [[x, y]]); };
  const thin = (a, c, th) => { const [x, y] = XY(a, c); return cross === 'y' ? [x + .5 - th, y + .02, x + .5 + th, y + .98] : [x + .02, y + .5 - th, x + .98, y + .5 + th]; };
  // concrete blocks on the fence line and a second staggered row outside
  for (let c = EXIT_R - 1; c <= EXIT_R + RW; c++) put(FEN, c, {type:'jersey', proc:true, ax:cross, solid:true, r:thin(FEN, c, .2)});
  for (const c of [EXIT_R, EXIT_R + 3]) put(FEN - 3, c, {type:'jersey', proc:true, ax:cross, solid:true, r:thin(FEN - 3, c, .2)});
  // warning sign in the middle of the road just inside
  put(FEN + 2, EXIT_R + 1, {type:'qsign', proc:true, ax:cross, solid:true, r:thin(FEN + 2, EXIT_R + 1, .12)});
  put(FEN + 2, EXIT_R + 2, {type:'jersey', proc:true, ax:cross, solid:true, r:thin(FEN + 2, EXIT_R + 2, .2)});
  // sandbag nests either side
  for (const c of [EXIT_R - 2, EXIT_R - 3, EXIT_R + 5, EXIT_R + 6]) put(FEN + 1, c, {type:'sandbag', proc:true, solid:true});
  for (const c of [EXIT_R - 3, EXIT_R + 6]) put(FEN + 2, c, {type:'sandbag', proc:true, solid:true});
  put(FEN + 3, EXIT_R + 6, {type:'booth', proc:true, solid:true});
  // army trucks: one inside, one outside
  const truck = (a, c) => {
    const [x0, y0] = XY(a, c), [x1, y1] = XY(a + 1, c), x = Math.min(x0, x1), y = Math.min(y0, y1);
    const p = along === 'x' ? {type:'car', dir:'x', cx:x + 1, cy:y + .5, r:[x + .05, y + .08, x + 1.95, y + .92]} : {type:'car', dir:'y', cx:x + .5, cy:y + 1, r:[x + .08, y + .05, x + .92, y + 1.95]};
    Object.assign(p, {ci:5, army:true, solid:true, flip:sgn < 0});
    addProp(p, along === 'x' ? [[x, y], [x + 1, y]] : [[x, y], [x, y + 1]]);
  };
  truck(FEN + 5, EXIT_R + 3); truck(FEN - 6, EXIT_R);
  // ammo/supply crates by the booth
  for (const c of [EXIT_R - 2, EXIT_R + 7]) {
    const [x, y] = XY(FEN + 4, c); const i = y * MW + x;
    if (furn[i] || propAt[i] || map[i] !== GRASS) continue;
    const wd = along === 'x' ? [sgn * -1, 0] : [0, sgn * -1], sx = .62, sy = .62, cx = x + .5, cy = y + .5;
    const f = {x, y, type:'armybox', items:[], searched:false, wd, cx, cy, sx, sy, r:[cx - sx / 2, cy - sy / 2, cx + sx / 2, cy + sy / 2]};
    for (let n = ri(CONT.armybox.n[0], CONT.armybox.n[1]); n > 0; n--) f.items.push(mkItem(pick(CONT.armybox.loot)));
    furns.push(f); furn[i] = furns.length;
  }
  // abandoned cars jammed on the way out
  for (let a = FEN + 8; a < CITY0 - 2; a += 2 + ri(0, 2)) {
    const lane = EXIT_R + (rng() < .5 ? 0 : RW - 1);
    if (rng() < .45) continue;
    const [x0, y0] = XY(a, lane), [x1, y1] = XY(a + 1, lane), x = Math.min(x0, x1), y = Math.min(y0, y1);
    const pol = rng() < .12;
    const p = along === 'x' ? {type:'car', dir:'x', cx:x + 1, cy:y + .5, r:[x + .05, y + .08, x + 1.95, y + .92]} : {type:'car', dir:'y', cx:x + .5, cy:y + 1, r:[x + .08, y + .05, x + 1.95 - 1.03, y + 1.95]};
    if (along === 'y') p.r = [x + .08, y + .05, x + .92, y + 1.95];
    Object.assign(p, {ci:pol ? 2 : ri(0, 5), police:pol, solid:true, flip:sgn > 0 ? rng() < .85 : rng() < .15});
    addProp(p, along === 'x' ? [[x, y], [x + 1, y]] : [[x, y], [x, y + 1]]);
  }
  const [sx, sy] = XY(FEN + 3, EXIT_R + 1);
  CHECKPOINTS.push({x:sx + .5, y:sy + .5, side});
  SPECIAL.push({x:sx + .5 + (along === 'x' ? sgn * 2 : 0), y:sy + .5 + (along === 'y' ? sgn * 2 : 0), pi:13, n:3});
}
