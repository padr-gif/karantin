// ================= v29: new furniture art (tools/furn/sketch.py) at real size; big pieces take several tiles =================
// Sizes come from the art (atlas fsize: [along the wall, depth] in tiles = metres). A bed is 1.4 × 2, a sofa 2 × 0.9 …
// Big furniture is registered in every floor tile it covers, so walking, pathfinding and zombies treat it as solid,
// and is drawn once from its front-most tile. If a big piece doesn't fit where the old generator put it,
// it keeps one tile and its old compact sprite.
const FART = {locker:'wardrobe', desk:'cabinet', medshelf:'shelf', toolrack:'shelf', counter:'cabinet', armybox:'crate'};
const fartType = t => FART[t] || t;
function fsizeOf(t) { const m = ART.meta && ART.meta.fsize; return m && m[fartType(t)]; }
const artOf = f => f.art || fartType(f.type);
// smaller pieces for rooms where the full-size one doesn't fit
const FALLBACK = {bed:['bed1'], tv:['tv1'], table:['table1'], bath:['bath1'], sofa:['sofa1']};   // уменьшенные: односпальная, сидячая ванна, кресло
const isWallT9 = t => t === WALL || t === WIN;
// rectangle a piece of type `t` takes when put on tile (x, y), back to the wall in direction wd (or free-standing)
function rectFor(t, x, y, wd, dir, free, oneTile) {
  const sz = fsizeOf(t); if (!sz) return null;
  let [sa, sb] = sz;
  if (oneTile) { sa = Math.min(sa, .96); sb = Math.min(sb, free ? .96 : 1.5 - HWV - .06); }
  const na = Math.max(1, Math.ceil(sa - .08)); sa = Math.min(sa, na - .04);
  const alongX = wd[1] !== 0, d = dir || 1;
  const a0 = (alongX ? x : y) + (d > 0 ? 0 : 1 - na), ca = a0 + na / 2;   // along the wall: na whole tiles
  let cd;
  if (free) { cd = (alongX ? y : x) + .5; sb = Math.min(sb, .96); }
  else {
    const nd = Math.max(1, Math.ceil(sb - .42)); sb = Math.min(sb, nd + .5 - HWV - .06);
    const w = alongX ? wd[1] : wd[0], base = alongX ? y : x;
    const back = w < 0 ? base - .5 + HWV + .02 : base + 1.5 - HWV - .02;  // walls stand on the middle of their tile
    cd = back - w * sb / 2;
  }
  const cx = alongX ? ca : cd, cy = alongX ? cd : ca, sx = alongX ? sa : sb, sy = alongX ? sb : sa;
  return {cx, cy, sx, sy, r:[cx - sx / 2, cy - sy / 2, cx + sx / 2, cy + sy / 2], na};
}
function tilesOfRect(r, ox, oy) {
  const out = [];
  for (let ty = Math.floor(r[1] + .03); ty <= Math.floor(r[3] - .03); ty++) for (let tx = Math.floor(r[0] + .03); tx <= Math.floor(r[2] - .03); tx++) {
    const t = get(tx, ty); if (!isWallT9(t)) out.push(ty * MW + tx);
  }
  if (ox != null && !out.includes(oy * MW + ox)) out.push(oy * MW + ox);   // thin pieces stand wholly in the wall's half of the tile
  return out;
}
const furnIdx = f => furns.indexOf(f) + 1;
function unregFurn(f) { const idx = furnIdx(f); for (const t of f.tiles || [f.y * MW + f.x]) if (furn[t] === idx) furn[t] = 0; }
function regFurn(f) {
  const idx = furnIdx(f), T = tilesOfRect(f.r, f.x, f.y);
  for (const t of T) furn[t] = idx;
  f.tiles = T; f.big = T.length > 1;
  f.dt = f.big ? T.reduce((a, b) => (b % MW) + ((b / MW) | 0) > (a % MW) + ((a / MW) | 0) ? b : a) : null;
}
// does a rect fit: every covered tile is free floor, the wall is behind every back tile, no doorway is blocked (generation)
function rectFits(f, R, wd, opt) {
  const T = tilesOfRect(R.r, opt.x != null ? opt.x : f.x, opt.y != null ? opt.y : f.y), idx = furnIdx(f); if (!T.length) return false;
  for (const t of T) {
    const tx = t % MW, ty = (t / MW) | 0, m = map[t];
    if (!(m === FLOOR || (opt.door && m === DOOR && T.length === 1 && obs[t] && obs[t].open && !obs[t].dead))) return false;
    if (furn[t] && furn[t] !== idx) return false;
    if (propAt[t]) return false;
    if (opt.gen) for (const [ox, oy] of D4) if (get(tx + ox, ty + oy) === DOOR) return false;
  }
  if (!opt.free && !opt.door) {
    for (const t of T) { const nx = (t % MW) + wd[0], ny = ((t / MW) | 0) + wd[1]; if (T.includes(ny * MW + nx)) continue; if (!isWallT9(get(nx, ny))) return false; }   // the back row stands against the wall
  }
  return true;
}
// after the world is generated: give every piece its real size (deterministic — no rng, saves stay valid).
// Try the full-size piece against each wall of its tile and in both directions, then smaller stand-ins,
// and only if nothing fits keep the old one-tile size with the old compact sprite.
function wallsAround(x, y, wd) { const out = [wd]; for (const d of WDS) if (isWallT9(get(x + d[0], y + d[1])) && !(d[0] === wd[0] && d[1] === wd[1])) out.push(d); return out; }
// Большая вещь (кровать, ванна, диван) не влезла на своё место — чаще всего соседнюю клетку уже заняла тумбочка.
// Ищем у стен той же комнаты ближайшее место, где она встаёт целиком. Без rng: тот же мир даёт ту же расстановку.
function relocateBig(f, Hs, arts) {
  const room = Hs.rooms && Hs.rooms.find(r => f.x >= r.x0 && f.x <= r.x1 && f.y >= r.y0 && f.y <= r.y1); if (!room) return false;
  const cand = [];
  for (let y = room.y0; y <= room.y1; y++) for (let x = room.x0; x <= room.x1; x++) {
    if (get(x, y) !== FLOOR || furn[y * MW + x] || propAt[y * MW + x]) continue;
    if (D4.some(([ox, oy]) => get(x + ox, y + oy) === DOOR)) continue;
    const wds = WDS.filter(d => isWallT9(get(x + d[0], y + d[1]))); if (wds.length) cand.push([x, y, wds, Math.hypot(x - f.x, y - f.y)]);
  }
  cand.sort((a, b) => a[3] - b[3] || a[1] - b[1] || a[0] - b[0]);
  const keep = {x:f.x, y:f.y, cx:f.cx, cy:f.cy, sx:f.sx, sy:f.sy, r:f.r.slice(), wd:f.wd};
  for (const art of arts) for (const [x, y, wds] of cand) for (const wd of wds) for (const d of [1, -1]) {
    const R = rectFor(art, x, y, wd, d, false); if (!R) continue;
    if (!rectFits(f, R, wd, {gen:true, free:false, x, y})) continue;
    Object.assign(f, {x, y, cx:R.cx, cy:R.cy, sx:R.sx, sy:R.sy, r:R.r, wd, art:art === fartType(f.type) ? null : art}); regFurn(f);
    if (houseOk(Hs)) return true;
    unregFurn(f); Object.assign(f, keep);
  }
  return false;
}
// ---- планировка комнаты целиком: сначала большие вещи в полный размер, потом мелкие вокруг ----
// Раньше всё ставилось по клетке вперемешку и только потом кровать «раздувалась» — тумбочка или унитаз уже
// занимали соседнюю клетку, и кровать оставалась кубиком. Теперь: снимаем мебель комнаты, ставим по убыванию
// размера; каждая вещь сначала пробует своё прежнее место, затем ближайшие места у стен; к каждой должен быть
// подход, и все свободные клетки дома остаются достижимыми от дверей. Без rng — тот же мир, та же расстановка.
const drop = f => { f.gone = true; f.big = false; f.tiles = []; f.dt = null; };   // вещь не поместилась: её нет
const ESSENTIAL = new Set(['bed', 'bath', 'toilet', 'stove', 'fridge', 'sink', 'sofa', 'bsink']);
const fArea = f => { const z = fsizeOf(f.type); return z ? z[0] * z[1] : 0; };
const D8F = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function canReach(f) {
  // с соседней клетки, в том числе по диагонали: действие доступно до 0,73 м от края вещи (getAction)
  return (f.tiles || []).some(t => D8F.some(([ox, oy]) => { const x = (t % MW) + ox, y = ((t / MW) | 0) + oy, j = y * MW + x; return (map[j] === FLOOR || map[j] === DOOR) && !furn[j]; }));
}
function roomSpots(room) {
  const out = [];
  for (let y = room.y0; y <= room.y1; y++) for (let x = room.x0; x <= room.x1; x++) {
    if (get(x, y) !== FLOOR || furn[y * MW + x] || propAt[y * MW + x]) continue;
    if (D4.some(([ox, oy]) => get(x + ox, y + oy) === DOOR)) continue;
    const wds = WDS.filter(d => isWallT9(get(x + d[0], y + d[1]))); if (wds.length) out.push([x, y, wds]);
  }
  return out;
}
// куда вещи «хочется» встать по смыслу (тумбочка — у изголовья, ТВ — напротив дивана …): задаётся в 43i
let furnTarget = (f, placed, room, Hs) => null;
let furnPrio = f => ESSENTIAL.has(fartType(f.type)) ? 0 : f.extra ? 2 : 1;   // порядок расстановки (43i уточняет)
let wallOk = (f, x, y, wd) => true;   // например, высокий шкаф не ставим перед окном
function placeInRoom(f, Hs, room, arts, placed) {
  const T = furnTarget(f, placed, room, Hs) || [f.x0 + .5, f.y0 + .5];
  const spots = roomSpots(room).sort((a, b) => Math.hypot(a[0] + .5 - T[0], a[1] + .5 - T[1]) - Math.hypot(b[0] + .5 - T[0], b[1] + .5 - T[1]) || a[1] - b[1] || a[0] - b[0]);
  for (const art of arts) for (const [x, y, wds0] of spots) {
    const wds = wds0.filter(wd => wallOk(f, x, y, wd)); if (!wds.length) continue;
    const ws = wds.slice().sort((a, b) => (a[0] === f.wd0[0] && a[1] === f.wd0[1] ? -1 : 0) - (b[0] === f.wd0[0] && b[1] === f.wd0[1] ? -1 : 0));
    for (const wd of ws) for (const d of [1, -1]) {
      const R = rectFor(art, x, y, wd, d, false); if (!R) continue;
      if (!rectFits(f, R, wd, {gen:true, free:false, x, y})) { if (R.na === 1) break; continue; }
      Object.assign(f, {x, y, cx:R.cx, cy:R.cy, sx:R.sx, sy:R.sy, r:R.r, wd, art:art === fartType(f.type) ? null : art, compact:false}); regFurn(f);
      if (houseOk(Hs) && canReach(f) && placed.every(canReach)) { placed.push(f); return true; }
      unregFurn(f);
      if (R.na === 1) break;
    }
  }
  return false;
}
function layoutRooms(done) {
  for (const Hs of houses) {
    if (!Hs || !Hs.rooms) continue;
    const hi = houses.indexOf(Hs) + 1;
    for (const room of Hs.rooms) {
      const inRoom = f => !f.gone && hAt[f.y * MW + f.x] === hi && f.x >= room.x0 && f.x <= room.x1 && f.y >= room.y0 && f.y <= room.y1;
      const list = furns.filter(f => inRoom(f) && f.wd && fsizeOf(f.type) && !isFreeGen(f));
      const mid = furns.filter(f => inRoom(f) && isFreeGen(f));
      if (!list.length) continue;
      const all = [...list, ...mid];
      const keep = new Map(all.map(f => [f, {x:f.x, y:f.y, cx:f.cx, cy:f.cy, sx:f.sx, sy:f.sy, r:f.r.slice(), wd:f.wd, art:f.art}]));
      list.sort((a, b) => furnPrio(a) - furnPrio(b) || fArea(b) - fArea(a) || furns.indexOf(a) - furns.indexOf(b));
      const clear = () => { for (const f of all) { if (!f.gone) unregFurn(f); Object.assign(f, keep.get(f), {gone:false, compact:false}); } };
      // одна попытка; small — большие вещи сразу уменьшенными (односпальная кровать, малый стол)
      const attempt = small => {
        for (const f of all) unregFurn(f);
        const placed = []; let lost = 0, midDone = false;
        const placeMid = () => {   // стол — на своё место, если не отрезает проход и подход к мебели
          midDone = true;
          for (const f of mid) {
            if (furn[f.y * MW + f.x]) { drop(f); lost += .3; continue; }
            regFurn(f); if (!houseOk(Hs) || !placed.every(canReach)) { unregFurn(f); drop(f); lost += .3; }
          }
        };
        for (const f of list) {
          if (f.extra && !midDone) placeMid();   // стол раньше декора: декор не должен его вытеснять
          const k = keep.get(f); f.x0 = k.x; f.y0 = k.y; f.wd0 = k.wd;
          const fb = FALLBACK[fartType(f.type)] || [], arts = small && fb.length ? fb : [fartType(f.type)].concat(fb);
          const ok = placeInRoom(f, Hs, room, arts, placed);
          delete f.x0; delete f.y0; delete f.wd0;
          if (ok) continue;
          // совсем некуда: большая — компактной на прежней клетке, если там свободно; иначе вещи нет
          if (!furn[k.y * MW + k.x] && !f.extra) {   // декор без места просто не ставим
            Object.assign(f, k, {art:null, compact:Math.max(...fsizeOf(f.type)) > 1.06}); regFurn(f); f.big = false; f.dt = null;
            if (houseOk(Hs) && canReach(f) && placed.every(canReach)) { placed.push(f); lost += f.compact ? .5 : 0; continue; }
            unregFurn(f);
          }
          drop(f); lost += ESSENTIAL.has(fartType(f.type)) ? 10 : f.extra ? .05 : 1;   // ради декора кровать не уменьшаем
        }
        if (!midDone) placeMid();
        return lost;
      };
      const lost = attempt(false);
      if (lost > 0 && list.some(f => FALLBACK[fartType(f.type)])) {
        const snap = new Map(all.map(f => [f, {x:f.x, y:f.y, cx:f.cx, cy:f.cy, sx:f.sx, sy:f.sy, r:f.r.slice(), wd:f.wd, art:f.art, gone:!!f.gone, compact:!!f.compact}]));
        clear();
        if (attempt(true) >= lost) { clear(); for (const f of all) unregFurn(f); for (const [f, st] of snap) Object.assign(f, st); for (const f of all) if (!f.gone) regFurn(f); }
      }
      for (const f of all) done.add(f);
    }
  }
}
// стол посреди кухни и прочие отдельно стоящие — их планировка не трогает
const isFreeGen = f => Math.abs(f.cx - (f.x + .5)) < .01 && Math.abs(f.cy - (f.y + .5)) < .01 && f.wd && f.wd[0] === 0 && f.wd[1] === -1 && !isWallT9(get(f.x, f.y - 1));
function growFurniture() {
  const laid = new Set(); layoutRooms(laid);
  for (const f of furns) {
    if (laid.has(f)) continue;
    if (f.gone || !fsizeOf(f.type) || !f.wd) continue;
    const free = Math.abs(f.cx - (f.x + .5)) < .01 && Math.abs(f.cy - (f.y + .5)) < .01;
    const Hs = houses[(hAt[f.y * MW + f.x] || 0) - 1], old = {cx:f.cx, cy:f.cy, sx:f.sx, sy:f.sy, r:f.r.slice(), wd:f.wd};
    const dirs = hash(f.x * 13, f.y * 7) < .5 ? [1, -1] : [-1, 1];
    const arts = [fartType(f.type)].concat(FALLBACK[fartType(f.type)] || []);
    let done = false;
    unregFurn(f);
    for (const art of arts) {
      for (const wd of free ? [f.wd] : wallsAround(f.x, f.y, f.wd)) {
        for (const d of dirs) {
          const R = rectFor(art, f.x, f.y, wd, d, free); if (!R) continue;
          if (!rectFits(f, R, wd, {gen:true, free})) { if (R.na === 1) break; continue; }
          Object.assign(f, {cx:R.cx, cy:R.cy, sx:R.sx, sy:R.sy, r:R.r, wd, art:art === fartType(f.type) ? null : art}); regFurn(f);
          if (!f.big || !Hs || houseOk(Hs)) { done = true; break; }
          unregFurn(f);
          if (R.na === 1) break;
        }
        if (done) break;
      }
      if (done) break;
    }
    if (!done && Hs && Math.max(...fsizeOf(f.type)) > 1.06) done = relocateBig(f, Hs, arts);   // в другое место той же комнаты
    if (!done) {   // nothing fits: old footprint, old compact sprite
      Object.assign(f, old, {art:null, compact:true}); regFurn(f); f.big = false; f.dt = null;
      const R = rectFor(fartType(f.type), f.x, f.y, f.wd, 1, free, true);
      if (R && Math.max(...fsizeOf(f.type)) <= 1.06) { Object.assign(f, {cx:R.cx, cy:R.cy, sx:R.sx, sy:R.sy, r:R.r, compact:false}); unregFurn(f); regFurn(f); f.big = false; f.dt = null; }
    }
  }
}
// saves: moved pieces come back by their stored rect; re-register every big one
function reRegisterAll() {
  for (let i = 0; i < furn.length; i++) if (furn[i]) { const f = furns[furn[i] - 1]; if (!f || f.gone || f.big) furn[i] = 0; }
  for (const f of furns) if (!f.gone && f.tiles && f.tiles.length > 1) { const T = tilesOfRect(f.r, f.x, f.y); if (T.length > 1) regFurn(f); }
}
onLoad((d) => { try { for (const f of furns) if (f.moved && !f.gone) f.tiles = tilesOfRect(f.r, f.x, f.y); reRegisterAll(); buildFlow(); } catch (e) {}
});

// ---- drawing ----

// ---- furniture editor: whole footprint, any size ----
const finishDismantle29 = finishDismantle;
finishDismantle = function (a) { const f = a.f; unregFurn(f); f.tiles = [f.y * MW + f.x]; furn[f.y * MW + f.x] = furnIdx(f); finishDismantle29(a); f.tiles = []; f.big = false; f.dt = null; };
const moveFurn29 = moveFurn;
moveFurn = function (f) { if (f.big) { toast('Слишком большое: двигай в режиме обустройства'); return false; } return moveFurn29(f); };
