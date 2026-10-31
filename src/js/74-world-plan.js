// ================= один мир для всех (world.gen = 5) =================
// Округ из пяти районов: родной городок в центре и по району с каждой стороны — деревня на севере, промзона на востоке,
// старый город на юге, лес с дачами на западе. Дальше дорог нет. Карта всегда одна и та же (FIXED_SEED и постоянные
// сиды районов); меняется только добыча: после постройки района rollLoot раскладывает вещи заново своим генератором
// (world.lroot — свой у каждой игры). Сохранения gen ≤ 4 строятся как раньше.
// Правила застройки gen 5: к каждому дому ведёт дорожка от двери до тротуара, почтовый ящик — сбоку от дорожки у самой
// дороги; в городке всегда есть школа, поликлиника, автосервис, почта, библиотека, пожарная часть и парк с прудом.

const W5 = () => (world.gen || 1) >= 5;
const W5_DIST = {
  '0,-1':{t:'village', name:'Берёзовка'}, '1,0':{t:'industrial', name:'Комбинат'},
  '0,1':{t:'downtown', name:'Старый город'}, '-1,0':{t:'forest', name:'Сосновка'},
};
const distAllowed = (dx, dy) => !W5() || (!dx && !dy) || !!W5_DIST[distKey(dx, dy)];

// ---- новые здания ----
for (const k of ['autoshop', 'post', 'library', 'fire']) COMM.add(k);
Object.assign(CSIZE, {autoshop:[12, 9], post:[10, 7], library:[11, 8], fire:[13, 9]});
Object.assign(FLIST, {
  autoshop:['toolrack', 'toolrack', 'toolrack', 'crate', 'crate', 'boxes', 'locker', 'desk', 'counter'],
  post:['counter', 'boxes', 'boxes', 'boxes', 'shelf', 'shelf', 'desk', 'cabinet'],
  library:['bookshelf', 'bookshelf', 'bookshelf', 'bookshelf', 'bookshelf', 'desk', 'desk', 'cabinet'],
  fire:['locker', 'locker', 'locker', 'toolrack', 'toolrack', 'crate', 'desk', 'bed', 'bed', 'medcab', 'sink'],
});
{ const ok = L => L.filter(id => ITEMS[id]);
  const add = (kind, o) => { LOOTK[kind] = LOOTK[kind] || {}; for (const t in o) LOOTK[kind][t] = ok(o[t]); };
  add('autoshop', {toolrack:['wrench', 'wrench', 'scrap', 'scrap', 'tape', 'jerrycan', 'hammer', 'crowbar', 'battery', 'nails', 'book_mech'],
    crate:['scrap', 'scrap', 'jerrycan', 'jerrycan', 'pipe', 'wrench', 'tape'], boxes:['scrap', 'tape', 'battery', 'nails', 'jerrycan'],
    locker:['flashlight', 'battery', 'coffee', 'cigs', 'lighter', 'water'], desk:['map', 'coffee', 'radio', 'book_mech', 'tape'], counter:['map', 'battery', 'tape', 'choco', 'water']});
  add('post', {counter:['map', 'newspaper', 'tape', 'candy', 'battery', 'matches'], boxes:['tape', 'candle', 'battery', 'choco', 'sweater', 'book_cook', 'book_farm', 'seeds', 'tea', 'coffee'],
    shelf:['newspaper', 'map', 'tape', 'candle', 'matches'], desk:['map', 'coffee', 'radio', 'tape'], cabinet:['tape', 'newspaper', 'coffee']});
  add('library', {bookshelf:['book_med', 'book_mech', 'book_carp', 'book_cook', 'book_farm', 'book_fight', 'book_tail', 'map', 'newspaper'],
    desk:['map', 'book_med', 'coffee', 'candle'], cabinet:['candle', 'matches', 'map', 'newspaper']});
  add('fire', {locker:['axe', 'flashlight', 'battery', 'bandage', 'vest', 'water', 'radio'], toolrack:['axe', 'crowbar', 'sledge', 'hatchet', 'tape', 'jerrycan'],
    crate:['bandage', 'medkit', 'water', 'jerrycan', 'plank'], desk:['map', 'radio', 'coffee', 'battery'], medcab:['bandage', 'antisep', 'painkill', 'medkit', 'splint']});
}
Object.assign(WALLK, {autoshop:[146, 148, 150], post:[208, 196, 170], library:[184, 150, 118], fire:[176, 72, 58]});
Object.assign(SIGNS, {
  autoshop:{text:'АВТОСЕРВИС', bg:'#d6a62a', fg:'#1b1b1b', label:'Автосервис'},
  post:{text:'ПОЧТА', bg:'#1f4e9a', fg:'#ffffff', label:'Почта'},
  library:{text:'БИБЛИОТЕКА', bg:'#5a3b2a', fg:'#f3e6c8', label:'Библиотека'},
  fire:{text:'ПОЖАРНАЯ', bg:'#b3261e', fg:'#ffffff', label:'Пожарная часть'},
});
Object.assign(BLOOK, {autoshop:{concrete:true}, post:{brick:true}, library:{brick:true}, fire:{brick:true, concrete:true}});
const W5_COMM = ['school', 'clinic', 'autoshop', 'post', 'library', 'fire'];          // в городке gen 5 — все обязательно

// ---- дорожка от двери до тротуара (обход препятствий) и почтовый ящик у дороги ----
const roadish = (x, y) => { const t = get(x, y); return t === ROAD || t === WALK || (soil[y * MW + x] === 1 && t === GRASS); };
function doorPath(H, maxL) {
  if (!H || !H.doors.length) return null;
  const d = H.doors[0], o = [[0, -1], [0, 1], [-1, 0], [1, 0]][d.s], sx = d.x + o[0], sy = d.y + o[1];
  if (!inMap(sx, sy, 1)) return null;
  if (roadish(sx, sy)) return {cells:[], end:[sx, sy], dir:o};
  const free = (x, y) => { const i = y * MW + x; return inMap(x, y, 1) && map[i] === GRASS && !hAt[i] && !propAt[i] && !furn[i] && soil[i] !== 2 && soil[i] !== 3; };
  if (!free(sx, sy)) return null;
  const prev = new Map([[sy * MW + sx, -1]]), q = [[sx, sy, 0]];
  for (let h = 0; h < q.length; h++) {
    const [x, y, L] = q[h]; if (L >= maxL) continue;
    // сначала прямо от двери — дорожки ровные
    for (const [ox, oy] of [o, ...D4.filter(v => v[0] !== o[0] || v[1] !== o[1])]) {
      const nx = x + ox, ny = y + oy, j = ny * MW + nx; if (prev.has(j)) continue;
      if (roadish(nx, ny) && !hAt[j]) {
        const cells = []; for (let k = y * MW + x; k >= 0; k = prev.get(k)) cells.unshift([k % MW, (k / MW) | 0]);
        return {cells, end:[nx, ny], dir:o};
      }
      if (!free(nx, ny)) continue;
      prev.set(j, y * MW + x); q.push([nx, ny, L + 1]);
    }
  }
  return null;
}
function pathToDoor(H) {                                                     // проложить дорожку; вернёт клетки
  const p = doorPath(H, 26); if (!p) return null;
  for (const [x, y] of p.cells) { set(x, y, WALK); soil[y * MW + x] = 0; }
  return p;
}
// «хребет» дорожки — клетки от двери до дороги, ближние к дороге первыми
function pathSpine(H, p) {
  const d = H.doors[0], o = p.dir, out = [];
  if (p.cells.length) { for (let k = p.cells.length - 1; k >= 0; k--) out.push(p.cells[k]); return out; }
  for (let k = 1; k < 12; k++) { const x = d.x + o[0] * k, y = d.y + o[1] * k, t = get(x, y); if (t === ROAD || (t !== WALK && t !== GRASS)) break; out.unshift([x, y]); }
  return out;
}
function mailboxAt(H, p) {                                                   // ящик там, где дорожка выходит к дороге, сбоку от неё
  if (!p) return false;
  const spine = pathSpine(H, p);
  const street = (x, y) => { const j = y * MW + x, t = map[j]; return t === ROAD || (t === WALK && !W5PATH.has(j)) || soil[j] === 1; };
  for (let k = 0; k < spine.length; k++) {
    const [sx, sy] = spine[k], nx = k + 1 < spine.length ? spine[k + 1] : null;
    const ax = nx ? (nx[0] !== sx ? 'x' : 'y') : (p.dir[0] ? 'x' : 'y');     // куда идёт дорожка: ящик — поперёк
    for (const s of [1, -1, 2, -2]) {
      const mx = sx + (ax === 'y' ? s : 0), my = sy + (ax === 'x' ? s : 0), i = my * MW + mx;
      if (!inMap(mx, my, 1) || map[i] !== GRASS || hAt[i] || propAt[i] || furn[i] || soil[i] || W5PATH.has(i)) continue;
      if (!D4.some(([a, b]) => street(mx + a, my + b))) continue;           // у самой дороги или тротуара
      if (D8.some(([a, b]) => get(mx + a, my + b) === DOOR)) continue;       // не загораживает дверь
      return !!addProp({type:'mail', cx:mx + .5, cy:my + .5, solid:true, r:[mx + .4, my + .4, mx + .6, my + .6]}, [[mx, my]]);
    }
  }
  return false;
}
// из genFinish: дорожки ко всем жилым домам (до деревьев, чтобы лес не встал на дорожке), потом ящики у дороги.
// Клетки дорожек запоминаются: урны на них не ставятся
let W5PATH = null;
function w5Paths() {
  W5PATH = new Set();
  for (const H of houses) if (H.kind === 'house' && H.rooms) { const p = pathToDoor(H); H._path = p; if (p) for (const [x, y] of pathSpine(H, p)) W5PATH.add(y * MW + x); }
}
// не у каждого дома одно и то же: у большинства ящик, у кого-то урна у тротуара, у кого-то ничего
function w5Mail() {
  for (const H of houses) {
    if (H.kind === 'house' && H.rooms && H._path) { const r = rng(); if (r < .62) mailboxAt(H, H._path); else if (r < .82) curbBin(H, H._path); }
    delete H._path;
  }
  W5PATH = null;
}
function curbBin(H, p) {                                                     // урна на тротуаре рядом с выходом дорожки
  const [ex, ey] = p.end;
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
    const x = ex + a, y = ey + b, i = y * MW + x;
    if (!inMap(x, y, 1) || map[i] !== WALK || propAt[i] || furn[i] || W5PATH.has(i) || !curbOk(x, y)) continue;
    return !!addProp({type:'bin', cx:x + .5, cy:y + .5, solid:true, r:[x + .3, y + .3, x + .7, y + .7], ci:ri(0, 2)}, [[x, y]]);
  }
  return false;
}

// ---- парк: дорожка кольцом, пруд, скамейки, качели, деревья ----
function addBench(x, y, ax, face) {
  const i = y * MW + x; if (!inMap(x, y, 1) || map[i] !== GRASS || propAt[i] || hAt[i]) return null;
  const cx = x + .5, cy = y + .5;
  return addProp({type:'bench', proc:true, ax, face, cx, cy, solid:true, r:ax === 'x' ? [x + .08, y + .3, x + .92, y + .7] : [x + .3, y + .08, x + .7, y + .92]}, [[x, y]]);
}
function parkW5(x0, y0, w, h) {
  const x1 = x0 + w - 1, y1 = y0 + h - 1, lx0 = x0 + 2, ly0 = y0 + 2, lx1 = x1 - 2, ly1 = y1 - 2;
  for (let x = lx0; x <= lx1; x++) for (const y of [ly0, ly1]) set(x, y, WALK);
  for (let y = ly0; y <= ly1; y++) for (const x of [lx0, lx1]) set(x, y, WALK);
  const mx = (x0 + x1) >> 1, my = (y0 + y1) >> 1;
  for (let y = y0; y < ly0; y++) set(mx, y, WALK); for (let y = ly1 + 1; y <= y1; y++) set(mx, y, WALK);   // входы с четырёх сторон
  for (let x = x0; x < lx0; x++) set(x, my, WALK); for (let x = lx1 + 1; x <= x1; x++) set(x, my, WALK);
  const prx = Math.max(2, (lx1 - lx0) / 2 - 3.5), pry = Math.max(1.6, (ly1 - ly0) / 2 - 3);
  pond((lx0 + lx1 + 1) / 2, (ly0 + ly1 + 1) / 2, prx, pry);
  for (const [bx, by, ax] of [[mx - 2, ly0 + 1, 'x'], [mx + 2, ly0 + 1, 'x'], [mx - 2, ly1 - 1, 'x'], [mx + 2, ly1 - 1, 'x'], [lx0 + 1, my, 'y'], [lx1 - 1, my, 'y']])
    addBench(bx, by, ax, ax === 'x' ? (by === ly0 + 1 ? 1 : 0) : (bx === lx0 + 1 ? 3 : 2));
  { const sx = lx1 - 3, sy = ly1 - 2, i = sy * MW + sx;                       // качели в углу у кольца
    if (map[i] === GRASS && map[i + 1] === GRASS && !propAt[i] && !propAt[i + 1]) addProp({type:'swing', proc:true, cx:sx + 1, cy:sy + .5, solid:true, r:[sx + .1, sy + .35, sx + 1.9, sy + .65]}, [[sx, sy], [sx + 1, sy]]); }
  for (const [tx, ty] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [x0 + 1, y0], [x1 - 1, y1], [x0, y0 + 1], [x1, y1 - 1]]) if (get(tx, ty) === GRASS && !propAt[ty * MW + tx]) set(tx, ty, TREE);
}
defProc('bench', (p, f) => {
  const x = Math.floor(p.cx), y = Math.floor(p.cy), wood = [150, 104, 62], iron = [52, 54, 58];
  if (p.ax === 'x') {
    for (const lx of [x + .14, x + .8]) box(lx, y + .34, lx + .06, y + .66, 0, 8, iron, f);
    box(x + .08, y + .34, x + .92, y + .66, 8, 9.6, wood, f);
    const by = p.face === 1 ? y + .3 : y + .64; box(x + .08, by, x + .92, by + .06, 9.6, 18, wood, f);
  } else {
    for (const ly of [y + .14, y + .8]) box(x + .34, ly, x + .66, ly + .06, 0, 8, iron, f);
    box(x + .34, y + .08, x + .66, y + .92, 8, 9.6, wood, f);
    const bx = p.face === 3 ? x + .3 : x + .64; box(bx, y + .08, bx + .06, y + .92, 9.6, 18, wood, f);
  }
});
defProc('swing', (p, f) => {
  const [x0, y0, x1, y1] = p.r, c = [70, 96, 140], cy = (y0 + y1) / 2;
  for (const px of [x0, x1 - .08]) { box(px, y0, px + .08, y0 + .08, 0, 44, c, f); box(px, y1 - .08, px + .08, y1, 0, 44, c, f); }
  box(x0, cy - .04, x1, cy + .04, 42, 45, c, f);
  for (const sx of [x0 + .35, x0 + 1.15]) { box(sx + .04, cy - .01, sx + .06, cy + .01, 12, 42, [60, 60, 60], f); box(sx + .4, cy - .01, sx + .42, cy + .01, 12, 42, [60, 60, 60], f); box(sx, cy - .12, sx + .46, cy + .12, 10, 12, [180, 64, 50], f); }
});
Object.assign(PROPN, {bench:'Скамейка', swing:'Качели', mail:'Почтовый ящик'});
CONT.bench = CONT.bench || {name:'Скамейка'};

// ---- добыча: раскладка заново своим генератором (карта не меняется) ----
const lootSeed = () => mix32(world.lroot >>> 0, (world.dx || 0) + 1000, (world.dy || 0) + 2000);
const HIDE_LOOT = ['canned', 'stew', 'water', 'water', 'mre', 'bandage', 'medkit', 'battery', 'flashlight', 'crowbar', 'axe', 'molotov', 'jerrycan', 'seeds', 'cereal', 'pbutter', 'jug', 'antibio', 'honey'];
function rollLoot() {
  if (!W5() || genTutMap) return;
  const keep = rng; rng = mulberry32(lootSeed());
  try {
    const special = it => it.u || it.story || it.id === 'note';
    for (const f of furns) {
      const C = CONT[f.type]; if (!C || !C.loot) continue;
      const H = houses[hAt[f.y * MW + f.x] - 1], kind = H ? H.kind : null, comm = kind && COMM.has(kind);
      const kept = (f.items || []).filter(special); f.items = kept;
      if (H && H.hideout && f.type === 'crate') { for (let n = ri(3, 5); n > 0; n--) f.items.push(mkItem(pick(HIDE_LOOT))); continue; }
      const n = comm && (f.type === 'shelf' || f.type === 'medshelf' || f.type === 'toolrack') ? ri(1, 3) : ri(C.n[0], C.n[1]);
      const L = (kind && LOOTK[kind] && LOOTK[kind][f.type]) || C.loot;
      for (let q = 0; q < n; q++) f.items.push(mkItem(rng() < .04 ? 'pipe' : pick(L)));
    }
    stockCarsAndTools();                                                       // машины (бензин, ключи, вещи), молоток и доски
    for (const p of props) if (p.type === 'car' && p.shop) { p.hp = ri(25, 55); p.key = rng() < .7; p.fuel = ri(0, 25); }   // в автосервисе: на ремонте, ключи в замке
  } finally { rng = keep; }
}
function w5AfterWorld() { if (W5() && !genTutMap) rng = mulberry32(lootSeed() ^ 0x5bd1e995); }   // записки, находки, тайники, телефоны — свои в каждой игре

// ---- новая игра, сохранение, загрузка ----
onStartNew(() => {}, () => { world.lroot = NEWCFG.lootSeed != null ? NEWCFG.lootSeed >>> 0 : ((Date.now() * 2654435761) ^ (Math.random() * 4294967296)) >>> 0; });
onSave(d => { d.x74 = {lroot:world.lroot >>> 0}; });
onLoad(() => {}, d => { world.lroot = (d && d.x74 && d.x74.lroot) >>> 0; });

// ---- схема округа на карте: пять районов крестом, где ты и где уже был ----
function countyGrid() {
  const g = mk('div', 'county'), cx = world.dx || 0, cy = world.dy || 0;
  for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) {
    if (!distAllowed(x, y) || (x && y)) { g.appendChild(mk('i')); continue; }
    const here = x === cx && y === cy, been = here || (!x && !y) || !!(world.dist && world.dist[distKey(x, y)]);
    const c = mk('div', 'cty' + (here ? ' here' : '') + (been ? ' been' : ''));
    c.appendChild(mk('b', '', distName(x, y)));
    c.appendChild(mk('small', '', here ? 'ты здесь' : DTYPES[distType(x, y)].label + (been ? '' : ' · не был')));
    g.appendChild(c);
  }
  return g;
}

// ---- перекрёстки, тротуары, концы трассы ----
// клетки перекрёстков (дорога тянется и вдоль x, и вдоль y дальше ширины улицы) с запасом m клеток вокруг
function crossMask(m) {
  const out = new Uint8Array(NT), run = (x, y, dx, dy) => { let n = 0; for (let k = 1; k <= RW + 2; k++) { if (get(x + dx * k, y + dy * k) !== ROAD) break; n++; } return n; };
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
    if (map[y * MW + x] !== ROAD) continue;
    if (run(x, y, 1, 0) + run(x, y, -1, 0) < RW + 1 || run(x, y, 0, 1) + run(x, y, 0, -1) < RW + 1) continue;
    for (let b = -m; b <= m; b++) for (let a = -m; a <= m; a++) if (inMap(x + a, y + b, 0)) out[(y + b) * MW + x + a] = 1;
  }
  return out;
}
// урна — только на тротуаре у самой дороги, не у входа в дом и не на углу
function curbOk(x, y) {
  if (!D4.some(([a, b]) => get(x + a, y + b) === ROAD)) return false;
  if (D8.some(([a, b]) => get(x + a, y + b) === DOOR || (W5PATH && W5PATH.has((y + b) * MW + x + a)))) return false;
  return true;
}
// конец трассы у края района: там ни деревьев, ни кустов — дорога видна до самого перехода
function hwEnd(x, y) {
  const e = Math.min(x, y, MW - 1 - x, MH - 1 - y); if (e > 12) return false;
  const c = EXIT_R + RW / 2, d = 6 + RW / 2;
  return (Math.abs(y + .5 - c) < d && (x < 12 || x > MW - 13)) || (Math.abs(x + .5 - c) < d && (y < 12 || y > MH - 13));
}

// ---- интерьеры общественных зданий (gen 5): не только мебель вдоль стен, а планировка как в жизни ----
// магазин, аптека, хозтовары, библиотека, склад — ряды стеллажей с проходами; у входа — касса или стойка;
// школа и контора — ряды столов со стульями; поликлиника — стойка регистрации, стулья ожидания, палата с койками;
// полиция — стойка дежурного и столы; пожарная часть — шкафчики и спальня; кафе — столики со стульями.
// Каждая вещь ставится через placeFree: если мешает проходу или подходу к другой мебели — не ставится.
function w5Interior(Hs) {
  if (!Hs || !COMM.has(Hs.kind) || Hs.w < 7 || Hs.h < 6 || !Hs.doors.length) return;
  const room = {x0:Hs.x + 1, y0:Hs.y + 1, x1:Hs.x + Hs.w - 2, y1:Hs.y + Hs.h - 2};
  const d = Hs.doors[0], inw = [[0, 1], [0, -1], [1, 0], [-1, 0]][d.s];
  const put = (t, cx, cy, wd) => {                                          // только на свободные клетки: вещи не делят клетку
    const sz = fsizeOf(t); if (!sz) return null;
    const sx = wd[1] !== 0 ? sz[0] : sz[1], sy = wd[1] !== 0 ? sz[1] : sz[0];
    for (let y = Math.floor(cy - sy / 2); y <= Math.floor(cy + sy / 2 - 1e-3); y++) for (let x = Math.floor(cx - sx / 2); x <= Math.floor(cx + sx / 2 - 1e-3); x++) if (furn[y * MW + x]) return null;
    return placeFree(Hs, room, t, cx, cy, wd);
  };
  const X = Hs.w >= Hs.h;                                                    // ряды — вдоль длинной стороны
  const nearDoor = (c, y) => Math.abs(c - d.x) + Math.abs(y - d.y) < 4;
  // стойка у входа: в двух шагах внутрь, чуть в сторону; спиной в зал
  const desk = t => { const s = (d.s < 2 ? d.x : d.y) - (d.s < 2 ? Hs.x : Hs.y) > (d.s < 2 ? Hs.w : Hs.h) / 2 ? -1 : 1;
    return put(t, d.x + .5 + inw[0] * 2 + (inw[1] ? s * 1.5 : 0), d.y + .5 + inw[1] * 2 + (inw[0] ? s * 1.5 : 0), inw); };
  // ряды стеллажей: через ряд проход, посередине поперечный проход; ряды повёрнуты спинами друг к другу через один
  const aisles = (t, from) => {
    const a0 = X ? room.y0 + 2 : room.x0 + 2, a1 = X ? room.y1 - 2 : room.x1 - 2, b0 = X ? room.x0 + 2 : room.y0 + 2, b1 = X ? room.x1 - 2 : room.y1 - 2, mid = (b0 + b1) >> 1;
    let n = 0;
    for (let a = from != null ? from : a0, k = 0; a <= a1; a += 2, k++) for (let b = b0; b <= b1; b++) {
      if (b === mid && b1 - b0 > 4) continue;
      const x = X ? b : a, y = X ? a : b; if (nearDoor(x, y)) continue;
      if (put(t, x + .5, y + .5, X ? [0, k % 2 ? 1 : -1] : [k % 2 ? 1 : -1, 0])) n++;
    }
    return n;
  };
  // столы рядами, у каждого стул; dir — куда смотрят сидящие (к «доске» у дальней от входа стены)
  // стол спиной к «доске» (дальняя от входа стена), стул перед ним со стороны входа — сидящий смотрит к доске
  const small = Math.min(Hs.w, Hs.h) <= 8, ins = small ? 1 : 2;
  const desks = (t, chair, part) => {
    const x0 = room.x0 + ins, x1 = room.x1 - ins, y0 = room.y0 + ins, y1 = room.y1 - ins;
    for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) {
      if (part && !part(x, y)) continue; if (nearDoor(x, y)) continue;
      const f = put(t, x + .5, y + .5, inw); if (f && chair) put('chair', x + .5 - inw[0], y + .5 - inw[1], inw.map(v => -v));
    }
  };
  // ряд вдоль стены с дверью, через клетку от неё: стулья ожидания, лицом в зал
  const row = (t, depth) => {
    const along = d.s < 2 ? [1, 0] : [0, 1], a0 = d.s < 2 ? room.x0 + 1 : room.y0 + 1, a1 = d.s < 2 ? room.x1 - 1 : room.y1 - 1, dp = d.s < 2 ? d.x : d.y;
    const base = d.s === 0 ? room.y0 : d.s === 1 ? room.y1 : d.s === 2 ? room.x0 : room.x1;
    for (let a = a0; a <= a1; a++) { if (Math.abs(a - dp) < 3) continue;
      const c = base + inw[0] * depth + inw[1] * depth; put(t, (d.s < 2 ? a : c) + .5, (d.s < 2 ? c : a) + .5, inw.map(v => -v)); }
  };
  const backHalf = (x, y) => (inw[0] ? (x - d.x) * inw[0] : (y - d.y) * inw[1]) > (inw[0] ? Hs.w : Hs.h) / 2;
  const frontHalf = (x, y) => !backHalf(x, y);
  switch (Hs.kind) {
    case 'store': case 'selpo': case 'gas': desk('counter'); aisles('shelf'); break;
    case 'pharmacy': desk('counter'); aisles('medshelf'); break;
    case 'hardware': desk('counter'); aisles('toolrack'); break;
    case 'library': desk('desk'); aisles('bookshelf'); put('plant', d.x + .5 + inw[0] * 1.2 + (inw[1] ? -1.5 : 0), d.y + .5 + inw[1] * 1.2 + (inw[0] ? -1.5 : 0), inw); break;
    case 'post': desk('counter'); aisles('boxes'); break;
    case 'warehouse': aisles('shelf'); break;
    case 'school': case 'office': desks('wdesk', true); break;
    case 'police': desk('counter'); desks('wdesk', true); break;
    case 'clinic': desk('counter'); row('chair', 1); desks('bed', false, backHalf); put('plant', d.x + .5 + inw[0] * 1.2 + (inw[1] ? 1.5 : 0), d.y + .5 + inw[1] * 1.2 + (inw[0] ? 1.5 : 0), inw); break;
    case 'fire': aisles('locker'); desks('bed', false, backHalf); break;
    case 'cafe': desks('table', false); for (const f of furns.filter(f => f.type === 'table' && hAt[f.y * MW + f.x] === houses.indexOf(Hs) + 1)) { put('chair', f.cx + .75, f.cy, [1, 0]); put('chair', f.cx - .75, f.cy, [-1, 0]); } break;
    case 'factory': aisles('toolrack'); break;
    case 'autoshop': desk('counter'); break;
  }
}
