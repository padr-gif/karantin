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
const FALLBACK = {bed:['bed1'], tv:['tv1'], table:['table1']};
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
function growFurniture() {
  for (const f of furns) {
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
const generate29 = generate;
generate = function () { generate29(); growFurniture(); };
// saves: moved pieces come back by their stored rect; re-register every big one
function reRegisterAll() {
  for (let i = 0; i < furn.length; i++) if (furn[i]) { const f = furns[furn[i] - 1]; if (!f || f.gone || f.big) furn[i] = 0; }
  for (const f of furns) if (!f.gone && f.tiles && f.tiles.length > 1) { const T = tilesOfRect(f.r, f.x, f.y); if (T.length > 1) regFurn(f); }
}
const applySave29 = applySave;
applySave = function (d) { const r = applySave29(d); try { for (const f of furns) if (f.moved && !f.gone) f.tiles = tilesOfRect(f.r, f.x, f.y); reRegisterAll(); buildFlow(); } catch (e) {} return r; };

// ---- drawing ----
const furnName29 = furnName;
furnName = function (fu) {
  const fr = ART.meta.frames;
  let n = furnName29(fu); if (fu.art) n = n.replace(/^f_[a-z0-9]+_/, 'f_' + fu.art + '_');
  if (fu.compact && fr['old_' + n]) return 'old_' + n;
  if (fr[n]) return n;
  const n0 = n.replace(/_(\d)_(\d)$/, '_0_$2'); return fr[n0] ? n0 : n;
};

// ---- furniture editor: whole footprint, any size ----
canPlace = function (f, x, y, wd) {
  wd = wd || (EDIT.tgt && EDIT.tgt.x === x && EDIT.tgt.y === y ? EDIT.tgt.wd : autoWd(f, x, y));
  const behind = isWallT9(get(x + wd[0], y + wd[1])), door = get(x, y) === DOOR;
  let R = null;
  for (const d of [1, -1]) { const c = rectFor(artOf(f), x, y, wd, d, !behind && !door); if (!c) break; if (rectFits(f, c, wd, {free:!behind, door, x, y})) { R = c; break; } if (c.na === 1) break; }
  if (!R) {
    const i = y * MW + x, t = get(x, y);
    if (!(t === FLOOR || t === DOOR)) return 'Ставить можно на пол в доме или в открытый дверной проём';
    if (furn[i] && furns[furn[i] - 1] !== f) return 'Тут уже стоит мебель';
    return Math.max(...(fsizeOf(artOf(f)) || [1, 1])) > 1.1 ? 'Не влезает: нужно больше места' : 'Место занято';
  }
  const [r0, r1, r2, r3] = R.r, px = clamp(P.x, r0, r2), py = clamp(P.y, r1, r3);
  if (Math.hypot(px - P.x, py - P.y) < P.r * .9) return 'Ты стоишь на этом месте';
  if (zs.some(z => z.x > r0 - .2 && z.x < r2 + .2 && z.y > r1 - .2 && z.y < r3 + .2)) return 'Мешает мертвец';
  if (Math.hypot(R.cx - P.x, R.cy - P.y) > 3.6 + Math.max(R.sx, R.sy) / 2) return 'Далеко. Подойди ближе к месту';
  f._place = R; return null;
};
relocate = function (f, x, y, wd) {
  const why = canPlace(f, x, y, wd), R = !why && f._place;
  if (!R) return false;
  for (const t of f.tiles || [f.y * MW + f.x]) for (const ch of chunksNear((t % MW) + .5, ((t / MW) | 0) + .5, 2)) for (const [k, v] of CHUNKS) if (v === ch) CHUNKS.delete(k);
  unregFurn(f);
  Object.assign(f, {x, y, wd, cx:R.cx, cy:R.cy, sx:R.sx, sy:R.sy, r:R.r, moved:true, blockDoor:get(x, y) === DOOR, compact:false});
  regFurn(f);
  for (const t of f.tiles) for (const ch of chunksNear((t % MW) + .5, ((t / MW) | 0) + .5, 2)) for (const [k, v] of CHUNKS) if (v === ch) CHUNKS.delete(k);
  buildFlow(); return true;
};
ghostRect = function (f, x, y, wd) { canPlace(f, x, y, wd); return f._place ? f._place.r : (rectFor(artOf(f), x, y, wd, 1, !isWallT9(get(x + wd[0], y + wd[1]))) || {r:[x, y, x + 1, y + 1]}).r; };
const finishDismantle29 = finishDismantle;
finishDismantle = function (a) { const f = a.f; unregFurn(f); f.tiles = [f.y * MW + f.x]; furn[f.y * MW + f.x] = furnIdx(f); finishDismantle29(a); f.tiles = []; f.big = false; f.dt = null; };
const moveFurn29 = moveFurn;
moveFurn = function (f) { if (f.big) { toast('Слишком большое: двигай в режиме обустройства'); return false; } return moveFurn29(f); };
finishFurn = function (a) {
  if (!relocate(a.f, a.x, a.y, a.wd)) { toast('Не получилось поставить'); EDIT.tgt = null; editUI(); return; }
  noise(P.x, P.y, 5); P.en = Math.max(0, P.en - (a.f.big ? 4 : 2)); SFX.wood(a.f.cx, a.f.cy);
  toast(a.f.blockDoor ? 'Проход загорожен: мертвецам придётся ломать' : furnLabel(a.f) + ': переставлено');
  EDIT.sel = null; EDIT.tgt = null; editUI();
};
rotateSel = function () {
  const f = EDIT.sel; if (!f) return;
  if (EDIT.tgt) { const k = WDS.findIndex(w => w[0] === EDIT.tgt.wd[0] && w[1] === EDIT.tgt.wd[1]); EDIT.tgt.wd = WDS[(k + 1) % 4]; EDIT.tgt.why = canPlace(f, EDIT.tgt.x, EDIT.tgt.y, EDIT.tgt.wd); SFX.ui(); editUI(); return; }
  const k = WDS.findIndex(w => w[0] === f.wd[0] && w[1] === f.wd[1]);
  for (let s = 1; s < 4; s++) if (relocate(f, f.x, f.y, WDS[(k + s) % 4])) { SFX.wood(f.cx, f.cy); return; }
  toast('Здесь не развернуть: мало места');
};
