// ================= разные типы районов — деревня, лес с дачами, промзона, центр города =================
// Родной район — всегда обычный город. Тип соседнего района зависит от сида и расстояния до дома:
// рядом чаще деревня и лес, дальше — промзона и центр. Всё строится из сида района, поэтому при возвращении
// район собирается заново таким же, а изменения игрока накладываются поверх (см. v50).

const DTYPES = {
  town:      {label:'Городок', desc:'Обычный городок, как твой: улицы, магазины, аптека, полиция.', zk:1, fence:true,
              names:['Заречье', 'Луговой', 'Садовый', 'Нагорный', 'Тополиный', 'Кленовый', 'Липовый', 'Солнечный', 'Мостовой', 'Каменка']},
  village:   {label:'Деревня', desc:'Дома с огородами и садами, сараи, сельпо, ферма. Мертвецов мало, зато много еды с грядок и инструмента.', zk:.55,
              names:['Берёзовка', 'Рябиновка', 'Хуторской', 'Слободка', 'Малиновка', 'Ольховка', 'Дубки', 'Покровка', 'Ивановка', 'Жуковка']},
  forest:    {label:'Лес и дачи', desc:'Глухой лес, озёра и дачный посёлок. Тихо, мертвецов почти нет. Рыбалка, кордон лесника, охотничьи домики.', zk:.3,
              names:['Сосновка', 'Озёрный', 'Ключи', 'Тихий', 'Дачный', 'Лесной кордон', 'Борок', 'Ельники', 'Глухое', 'Светлое']},
  industrial:{label:'Промзона', desc:'Склады, цеха и гаражи за заборами. Металл, инструмент, канистры и оптовые запасы еды. Еды в домах почти нет.', zk:.9,
              names:['Промзона', 'Элеватор', 'Посёлок ГЭС', 'Кирпичный', 'Затон', 'Депо', 'Комбинат', 'Цементный', 'Нефтебаза', 'Станкозавод']},
  downtown:  {label:'Центр города', desc:'Плотная застройка: поликлиника, кафе, конторы, магазины на каждом углу. Лута очень много, мертвецов — ещё больше.', zk:1.8, fence:true,
              names:['Центр', 'Вокзальный', 'Новостройки', 'Старый город', 'Площадь', 'Проспект', 'Торговый', 'Набережный', 'Соборный', 'Театральный']},
};
// вероятности по кольцу удалённости: [town, village, forest, industrial, downtown]
const DT_W = {1:[22, 30, 26, 22, 0], 2:[20, 20, 15, 22, 23], 3:[15, 12, 10, 28, 35]};
const DT_ORDER = ['town', 'village', 'forest', 'industrial', 'downtown'];
function distType(dx, dy) {
  if (!dx && !dy) return 'town';
  const w = DT_W[Math.min(3, distRing(dx, dy))], sum = w.reduce((a, b) => a + b, 0);
  let r = mix32(world.root || 1, dx * 31 + 7, dy * 17 + 3) % sum;
  for (let k = 0; k < w.length; k++) { if (r < w[k]) return DT_ORDER[k]; r -= w[k]; }
  return 'town';
}
function curDType() { return (world.dx || world.dy) ? distType(world.dx, world.dy) : 'town'; }

// ---- новые здания ----
for (const k of ['warehouse', 'garage', 'factory', 'clinic', 'cafe', 'office', 'selpo', 'farm', 'ranger']) COMM.add(k);
Object.assign(FLIST, {
  warehouse:['crate', 'crate', 'crate', 'crate', 'crate', 'crate', 'shelf', 'shelf', 'shelf', 'shelf', 'shelf', 'toolrack', 'boxes', 'boxes'],
  garage:['toolrack', 'crate', 'boxes'],
  factory:['toolrack', 'toolrack', 'toolrack', 'toolrack', 'crate', 'crate', 'crate', 'locker', 'locker', 'desk', 'boxes'],
  clinic:['medshelf', 'medshelf', 'medshelf', 'bed', 'bed', 'bed', 'locker', 'locker', 'desk', 'counter', 'medcab', 'sink'],
  cafe:['counter', 'fridge', 'fridge', 'stove', 'sink', 'kbin', 'pantry', 'cabinet'],
  office:['wdesk', 'wdesk', 'wdesk', 'wdesk', 'desk', 'desk', 'bookshelf', 'bookshelf', 'cabinet', 'locker'],
  selpo:['counter', 'shelf', 'shelf', 'shelf', 'shelf', 'fridge', 'pantry', 'crate'],
  farm:['crate', 'crate', 'crate', 'toolrack', 'toolrack', 'boxes', 'pantry'],
  ranger:['locker', 'desk', 'armybox', 'crate', 'bed', 'stove', 'bookshelf'],
});
{ const ok = L => L.filter(id => ITEMS[id]);
  const add = (kind, o) => { LOOTK[kind] = LOOTK[kind] || {}; for (const t in o) LOOTK[kind][t] = ok(o[t]); };
  add('warehouse', {crate:['canned', 'canned', 'water', 'water', 'pasta', 'rice', 'beans', 'stew', 'plank', 'nails', 'tape', 'scrap'],
    shelf:['canned', 'water', 'pasta', 'rice', 'battery', 'candle', 'matches', 'beans', 'noodles', 'water'], boxes:['canned', 'candle', 'battery', 'tape', 'nails', 'water'],
    toolrack:['wrench', 'scrap', 'tape', 'nails', 'hammer', 'crowbar', 'jerrycan']});
  add('garage', {toolrack:['wrench', 'scrap', 'scrap', 'tape', 'jerrycan', 'hammer', 'crowbar', 'battery', 'flashlight', 'nails'],
    crate:['scrap', 'scrap', 'wrench', 'jerrycan', 'plank', 'nails', 'sledge', 'pipe'], boxes:['scrap', 'tape', 'battery', 'nails']});
  add('factory', {toolrack:['scrap', 'scrap', 'wrench', 'sledge', 'pipe', 'nails', 'tape', 'crowbar', 'jerrycan'], crate:['scrap', 'scrap', 'plank', 'nails', 'pipe'],
    locker:['flashlight', 'battery', 'coffee', 'energy', 'water', 'map', 'bandage', 'vest'], desk:['coffee', 'map', 'battery', 'radio', 'tape']});
  add('clinic', {medshelf:['bandage', 'bandage', 'antisep', 'antibio', 'painkill', 'medkit', 'splint', 'pills', 'vitamins', 'book_med'],
    locker:['bandage', 'pills', 'medkit', 'painkill', 'flashlight', 'antisep'], medcab:['pills', 'painkill', 'antisep', 'bandage'], desk:['pills', 'coffee', 'book_med', 'map']});
  add('cafe', {fridge:['milk', 'sausage', 'meat', 'meat', 'water', 'soda'], counter:['choco', 'chips', 'coffee', 'soda', 'water', 'energy'],
    pantry:['pasta', 'rice', 'canned', 'beans', 'coffee', 'honey'], cabinet:['pot', 'pan', 'knife', 'cleaver', 'matches', 'coffee']});
  add('office', {wdesk:['coffee', 'map', 'battery', 'choco', 'radio', 'tape', 'energy', 'pills'], desk:['coffee', 'battery', 'choco', 'map', 'radio'],
    cabinet:['coffee', 'water', 'choco', 'pills']});
  add('selpo', {shelf:['canned', 'bread', 'pasta', 'rice', 'beans', 'matches', 'candle', 'water', 'stew', 'honey'], counter:['choco', 'cigs', 'lighter', 'matches', 'water', 'chips'],
    pantry:['potato', 'carrot', 'cabbage', 'apple', 'honey', 'canned']});
  add('farm', {crate:['seeds', 'seeds', 'potato', 'carrot', 'cabbage', 'shovel', 'hatchet', 'plank', 'nails', 'trap'], toolrack:['shovel', 'hatchet', 'sledge', 'seeds', 'jerrycan', 'pipe'],
    boxes:['potato', 'carrot', 'cabbage', 'apple', 'seeds'], pantry:['potato', 'carrot', 'cabbage', 'apple', 'milk', 'honey']});
  add('ranger', {locker:['shotgun', 'shells', 'shells', 'rod', 'trap', 'map', 'flashlight'], armybox:['shells', 'shells', 'mre', 'canteen', 'map', 'medkit'],
    crate:['trap', 'rod', 'hatchet', 'plank', 'matches'], desk:['map', 'radio', 'matches', 'shells'], bookshelf:['map', 'book_med']});
}
Object.assign(WALLK, {warehouse:[150,152,150], garage:[134,138,140], factory:[140,128,116], clinic:[220,222,214], cafe:[196,160,120], office:[170,176,184], selpo:[150,120,90], farm:[118,82,62], ranger:[112,92,70]});
Object.assign(SIGNS, {
  warehouse:{text:'СКЛАД', bg:'#5a6470', fg:'#f2f2ee', label:'Склад'},
  factory:{text:'ЦЕХ', bg:'#7a3428', fg:'#f6eee0', label:'Цех'},
  clinic:{text:'ПОЛИКЛИНИКА', bg:'#f2f2f0', fg:'#b22a28', label:'Поликлиника', cross:true},
  cafe:{text:'КАФЕ', bg:'#6a2d4a', fg:'#ffe6a8', label:'Кафе'},
  office:{text:'КОНТОРА', bg:'#2c3a4c', fg:'#e8eef6', label:'Контора'},
  selpo:{text:'СЕЛЬПО', bg:'#3d6b34', fg:'#fff7da', label:'Сельпо'},
  farm:{text:'ФЕРМА', bg:'#8a5a2a', fg:'#fff1d6', label:'Ферма'},
  ranger:{text:'КОРДОН', bg:'#2f4a2a', fg:'#e6f0d6', label:'Кордон лесника'},
});
// как выглядят снаружи и внутри
const BLOOK = {warehouse:{brick:false, concrete:true}, garage:{concrete:true}, factory:{brick:true, concrete:true}, farm:{planks:true, concrete:true}, ranger:{planks:true}};

// ---- общие кирпичики генерации ----
function genReset() {
  map.fill(GRASS); soil.fill(0); furn.fill(0); hAt.fill(0); propAt.fill(0); seen.fill(0); vis.fill(0);
  obs = new Array(NT).fill(null); houses = []; furns = []; props = []; SPECIAL = []; CHECKPOINTS = [];
}
const inMap = (x, y, m) => x >= m && y >= m && x < MW - m && y < MH - m;
function rectFree(x, y, w, h, m) {
  if (!inMap(x - m, y - m, 2) || !inMap(x + w + m - 1, y + h + m - 1, 2)) return false;
  for (let yy = y - m; yy < y + h + m; yy++) for (let xx = x - m; xx < x + w + m; xx++) { const i = yy * MW + xx; if (map[i] !== GRASS || hAt[i] || propAt[i] || soil[i]) return false; }
  return true;
}
function carve(x0, y0, x1, y1, t) { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) set(x, y, t); }
function highway(walk) {
  for (let i = 0; i < MW; i++) for (let k = 0; k < RW; k++) { set(i, EXIT_R + k, ROAD); set(EXIT_R + k, i, ROAD); }
  if (walk) for (let i = 0; i < MW; i++) for (const s of [EXIT_R - 1, EXIT_R + RW]) { if (get(i, s) === GRASS) set(i, s, WALK); if (get(s, i) === GRASS) set(s, i, WALK); }
}
function bld(x, y, w, h, kind, sides) {
  const n = houses.length;
  buildHouse(x, y, w, h, kind, sides ? {sides} : null);
  const H = houses[n];
  if (H && BLOOK[kind]) Object.assign(H, BLOOK[kind]);
  return H;
}
// дорожка от двери к ближайшей дороге (по прямой, только по траве)
function pathFromDoor(H) {
  if (!H || !H.doors.length) return;
  const d = H.doors[0], o = [[0, -1], [0, 1], [-1, 0], [1, 0]][d.s], cells = [];
  for (let k = 1; k < 16; k++) {
    const x = d.x + o[0] * k, y = d.y + o[1] * k, t = get(x, y);
    if (t === ROAD || t === WALK) { for (const [cx, cy] of cells) set(cx, cy, WALK); return; }
    if (t !== GRASS || hAt[y * MW + x] || propAt[y * MW + x]) return;
    cells.push([x, y]);
  }
}
function pond(cx, cy, rx, ry) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
    const n = (hash(x * 3, y * 5) - .5) * .35;
    if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 < 1 + n && get(x, y) === GRASS && !hAt[y * MW + x] && !propAt[y * MW + x]) set(x, y, WATER);
  }
}
function parkCarAt(x, y, dir, extra) {
  const ok = dir === 'x' ? get(x, y) === ROAD && get(x + 1, y) === ROAD : get(x, y) === ROAD && get(x, y + 1) === ROAD;
  if (!ok) return false;
  const cx = dir === 'x' ? x + 1 : x + .5, cy = dir === 'x' ? y + .5 : y + 1;
  const p = Object.assign({type:'car', dir, cx, cy, ci:ri(0, 5), solid:true, flip:rng() < .5,
    r:dir === 'x' ? [cx - .95, cy - .42, cx + .95, cy + .42] : [cx - .42, cy - .95, cx + .42, cy + .95]}, extra || {});
  return addProp(p, dir === 'x' ? [[x, y], [x + 1, y]] : [[x, y], [x, y + 1]]);
}
function highwayCars(n) {
  const hw = c => c >= EXIT_R - 1 && c <= EXIT_R + RW;
  for (let t = 0, k = 0; t < n * 6 && k < n; t++) {
    const a = ri(4, MW - 6), lane = EXIT_R + (rng() < .5 ? 0 : RW - 1);
    if (hw(a) || hw(a + 1)) continue;
    if (rng() < .5 ? parkCarAt(a, lane, 'x') : parkCarAt(lane, a, 'y')) k++;
  }
}
// ящик, поддон или армейский ящик на улице (как у блокпоста)
function yardBox(x, y, type) {
  const i = y * MW + x; if (furn[i] || propAt[i] || hAt[i] || (map[i] !== GRASS && map[i] !== WALK)) return null;
  const sx = .62, sy = .62, cx = x + .5, cy = y + .5;
  const f = {x, y, type, items:[], searched:false, wd:[0, 1], cx, cy, sx, sy, r:[cx - sx / 2, cy - sy / 2, cx + sx / 2, cy + sy / 2]};
  const C = CONT[type]; for (let n = ri(C.n[0], C.n[1]); n > 0; n--) f.items.push(mkItem(pick(C.loot)));
  furns.push(f); furn[i] = furns.length; return f;
}
function fenceRun(x0, y0, x1, y1, gaps) {                                 // забор-сетка по прямой, с проходами
  const ax = y0 === y1 ? 'x' : 'y';
  for (let v = ax === 'x' ? x0 : y0; v <= (ax === 'x' ? x1 : y1); v++) {
    if (gaps.some(g => v >= g[0] && v <= g[1])) continue;
    const x = ax === 'x' ? v : x0, y = ax === 'x' ? y0 : v;
    if (!inMap(x, y, 1) || hAt[y * MW + x] || map[y * MW + x] === ROAD) continue;
    if (get(x, y) === TREE) set(x, y, GRASS);
    addProp({type:'fence', proc:true, ax:ax === 'x' ? 'x' : 'y', cx:x + .5, cy:y + .5, solid:true, sign:false,
      r:ax === 'x' ? [x, y + .42, x + 1, y + .58] : [x + .42, y, x + .58, y + 1]}, [[x, y]]);
  }
}
// финал: лес, кусты, почтовые ящики, геометрия стен, лут в машинах, молоток где-нибудь
function genFinish(o) {
  const near = new Uint8Array(NT);
  for (const H of houses) for (let y = H.y - 2; y <= H.y + H.h + 1; y++) for (let x = H.x - 2; x <= H.x + H.w + 1; x++) if (inMap(x, y, 0)) near[y * MW + x] = 1;
  const nearRoad = (x, y) => { for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) { const t = get(xx, yy); if (t === ROAD || t === WALK || t === WATER) return true; } return false; };
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x; if (map[i] !== GRASS || near[i] || propAt[i] || furn[i] || soil[i] || nearRoad(x, y)) continue;
    if (rng() < o.tree(x, y, hash(x * 7 + 3, y * 5 + 1))) set(x, y, TREE);
  }
  for (let i = 0; i < NT; i++) if (map[i] === WALL) { const x = i % MW, y = (i / MW) | 0; wpC[i] = pieces(x, y, HWC); wpV[i] = pieces(x, y, HWV); } else { wpC[i] = wpV[i] = null; }
  for (let i = 0; i < NT; i++) {
    if (propAt[i] || furn[i]) continue;
    const x = i % MW, y = (i / MW) | 0;
    if (map[i] === WALK && rng() < (o.bins || .012)) addProp({type:'bin', cx:x + .5, cy:y + .5, solid:true, r:[x + .3, y + .3, x + .7, y + .7], ci:ri(0, 2)}, [[x, y]]);
    else if (map[i] === GRASS && !soil[i] && rng() < (o.bush || .04)) addProp({type:'bush', cx:x + .5, cy:y + .5, solid:false, s:.6 + rng() * .5}, [[x, y]]);
  }
  for (const Hs of houses) {
    if (Hs.kind !== 'house' || !Hs.doors.length) continue;
    const d = Hs.doors[0], out = [[0, -1], [0, 1], [-1, 0], [1, 0]][d.s];
    const mx = d.x + out[0] * 2 + (out[0] ? 0 : 1), my = d.y + out[1] * 2 + (out[1] ? 0 : 1);
    if (get(mx, my) === GRASS && !propAt[my * MW + mx]) addProp({type:'mail', cx:mx + .5, cy:my + .5, solid:true, r:[mx + .4, my + .4, mx + .6, my + .6]}, [[mx, my]]);
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
  { const homes = shuffle(houses.filter(H => H.kind === 'house' && H.rooms && H.w >= 8)); for (const H of homes.slice(0, o.hideouts || 1)) stockHideout(H); }
}
// дом на участке у дороги: сам дом, сарай, сад; side — с какой стороны дорога
function plot(x, y, w, h) {
  if (!rectFree(x, y, w, h, 1)) return null;
  const H = bld(x, y, w, h, 'house'); pathFromDoor(H);
  if (world.gen >= 2) { if (rng() < .55) yardFence(H); if (rng() < .5) yardGarden(H); }   // новые карты: заборы и огороды и в деревне
  return H;
}

// ---- ДЕРЕВНЯ ----
function genVillage() {
  highway(false);
  const lanes = [];
  // улицы-просёлки от трассы в обе стороны
  for (let n = 0, t = 0; n < 6 && t < 60; t++) {
    const vert = rng() < .5, pos = ri(36, 146), len = ri(26, 44), dir = rng() < .5 ? -1 : 1;
    if (Math.abs(pos - EXIT_R) < 14 || lanes.some(l => l.vert === vert && Math.abs(l.pos - pos) < 22 && l.dir === dir)) continue;
    const a0 = dir > 0 ? EXIT_R + RW : EXIT_R - 1, a1 = a0 + dir * len;
    if (!inMap(a1, a1, 6)) continue;
    if (vert) carve(pos, a0, pos + 1, a1, ROAD); else carve(a0, pos, a1, pos + 1, ROAD);
    lanes.push({vert, pos, dir, a0, a1}); n++;
  }
  // сельпо и ферма у трассы
  for (const [kind, w, h] of [['selpo', 10, 7], ['farm', 14, 9]]) {
    for (let t = 0; t < 80; t++) {
      const vert = rng() < .5, a = ri(46, 134), side = rng() < .5 ? -1 : 1;
      const x = vert ? (side < 0 ? EXIT_R - w - 3 : EXIT_R + RW + 3) : a, y = vert ? a : (side < 0 ? EXIT_R - h - 3 : EXIT_R + RW + 3);
      if (!rectFree(x, y, w, h, 1)) continue;
      const H = bld(x, y, w, h, kind); pathFromDoor(H);
      if (kind === 'farm') for (let k = 0; k < 4; k++) yardBox(x + w + 1, y + 1 + k * 2, 'crate');
      break;
    }
  }
  // дома вдоль просёлков и трассы, отступив от дороги
  const along = (vert, pos, a0, a1, wd) => {
    const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
    for (const side of [-1, 1]) for (let a = lo + 2; a < hi - 6;) {
      const w = ri(9, 10), h = ri(8, 9);
      const off = side < 0 ? -(vert ? w : h) - 2 : wd + 2;
      const x = vert ? pos + off : a, y = vert ? a : pos + off;
      const H = plot(x, y, w, h);
      if (H) {
        // огород/сад за домом
        const bx = vert ? (side < 0 ? x - 5 : x + w + 1) : x + 1, by = vert ? y + 1 : (side < 0 ? y - 5 : y + h + 1);
        if (rng() < .65) for (let yy = 0; yy < (vert ? h - 2 : 4); yy += 2) for (let xx = 0; xx < (vert ? 4 : w - 2); xx += 2) { const tx = bx + xx, ty = by + yy; if (get(tx, ty) === GRASS && !propAt[ty * MW + tx] && !hAt[ty * MW + tx]) set(tx, ty, TREE); }
        else for (let k = 0; k < 6; k++) { const tx = bx + ri(0, 3), ty = by + ri(0, 3); if (get(tx, ty) === GRASS && !propAt[ty * MW + tx]) addProp({type:'bush', cx:tx + .5, cy:ty + .5, solid:false, s:.6 + rng() * .4}, [[tx, ty]]); }
        if (rng() < .55) { const sx = vert ? x + ri(1, w - 5) : (rng() < .5 ? x - 6 : x + w + 2), sy = vert ? (rng() < .5 ? y - 6 : y + h + 2) : y + ri(1, h - 5); if (rectFree(sx, sy, 4, 4, 1)) bld(sx, sy, 4, 4, 'shed'); }
        a += (vert ? h : w) + ri(4, 8);
      } else a += 3;
    }
  };
  for (const l of lanes) along(l.vert, l.pos, l.a0, l.a1, 2);
  along(false, EXIT_R, 40, 140, RW); along(true, EXIT_R, 40, 140, RW);
  // пруды и поля
  for (let k = 0; k < 2; k++) for (let t = 0; t < 40; t++) { const cx = ri(36, 148), cy = ri(36, 148), rx = 4 + rng() * 4, ry = 3 + rng() * 3; if (!rectFree(Math.floor(cx - rx), Math.floor(cy - ry), Math.ceil(rx * 2), Math.ceil(ry * 2), 2)) continue; pond(cx, cy, rx, ry); break; }
  highwayCars(10);
  for (const l of lanes) for (let k = 0; k < 2; k++) { const a = ri(Math.min(l.a0, l.a1) + 2, Math.max(l.a0, l.a1) - 3); l.vert ? parkCarAt(l.pos, a, 'y') : parkCarAt(a, l.pos, 'x'); }
  const fields = [[ri(30, 60), ri(30, 60)], [ri(120, 150), ri(120, 150)]];
  genFinish({tree:(x, y, n) => { const c = Math.hypot(x - 92, y - 92); if (fields.some(([fx, fy]) => Math.abs(x - fx) < 14 && Math.abs(y - fy) < 10)) return 0; return c < 55 ? .015 : .18 + .25 * n; }, bush:.03, bins:.004, hideouts:1});
  world.nofence = true;
}

// ---- ЛЕС И ДАЧИ ----
function genForest() {
  highway(false);
  // два больших озера
  for (let k = 0; k < 2; k++) for (let t = 0; t < 60; t++) {
    const cx = ri(30, 154), cy = ri(30, 154), rx = 8 + rng() * 7, ry = 6 + rng() * 5;
    if (!rectFree(Math.floor(cx - rx), Math.floor(cy - ry), Math.ceil(rx * 2), Math.ceil(ry * 2), 3)) continue;
    pond(cx, cy, rx, ry); break;
  }
  // дачный посёлок в одной четверти: свои улочки, маленькие домики, сараи, сады
  const qx = rng() < .5 ? -1 : 1, qy = rng() < .5 ? -1 : 1;
  const X0 = qx < 0 ? EXIT_R - 52 : EXIT_R + RW + 8, Y0 = qy < 0 ? EXIT_R - 46 : EXIT_R + RW + 8;
  const rows = [Y0 + 10, Y0 + 33];
  const link = qx < 0 ? EXIT_R - 1 : EXIT_R + RW;                            // улочки упираются прямо в трассу
  for (const ry of rows) carve(qx < 0 ? X0 : link, ry, qx < 0 ? link : X0 + 44, ry + 1, ROAD);
  for (const ry of rows) for (const side of [-1, 1]) for (let a = X0 + 1; a < X0 + 42;) {
    const w = 9, h = 8, y = side < 0 ? ry - h - 2 : ry + 4, H = plot(a, y, w, h);
    if (H) { if (rng() < .5 && rectFree(a + 2, side < 0 ? y - 5 : y + h + 1, 4, 4, 0)) bld(a + 2, side < 0 ? y - 5 : y + h + 1, 4, 4, 'shed'); a += w + ri(3, 5); }
    else a += 3;
  }
  // кордон лесника у дороги и охотничьи домики в лесу
  for (let t = 0; t < 80; t++) {
    const a = ri(36, 146), side = rng() < .5 ? -1 : 1, vert = rng() < .5, w = 10, h = 8;
    const x = vert ? (side < 0 ? EXIT_R - w - 3 : EXIT_R + RW + 3) : a, y = vert ? a : (side < 0 ? EXIT_R - h - 3 : EXIT_R + RW + 3);
    if (!rectFree(x, y, w, h, 2)) continue;
    const H = bld(x, y, w, h, 'ranger'); pathFromDoor(H);
    SPECIAL.push({x:x + w / 2, y:y + h / 2, pi:13, n:1, corpse:true});
    parkCarAt(vert ? (side < 0 ? EXIT_R : EXIT_R + RW - 1) : x + 2, vert ? y + 2 : (side < 0 ? EXIT_R : EXIT_R + RW - 1), vert ? 'y' : 'x', {ci:5});
    break;
  }
  for (let n = 0, t = 0; n < 7 && t < 400; t++) { const x = ri(10, MW - 16), y = ri(10, MH - 16); if (!rectFree(x, y, 5, 4, 3)) continue; bld(x, y, 5, 4, 'shed'); n++; }
  highwayCars(6);
  genFinish({tree:(x, y, n) => (x >= X0 - 3 && x <= X0 + 46 && y >= Y0 - 3 && y <= Y0 + 50) ? .06 : .42 + .25 * n, bush:.05, bins:0, hideouts:1});
  world.nofence = true;
}

// ---- ПРОМЗОНА ----
function genIndustrial() {
  const R = [42, 90, 138];
  ROADS.length = 0; ROADS.push(...R);
  highway(true);
  for (const r of R) for (let i = R[0]; i <= R[2] + RW - 1; i++) for (let k = 0; k < RW; k++) { set(i, r + k, ROAD); set(r + k, i, ROAD); }
  for (const r of R) for (let i = R[0] - 1; i <= R[2] + RW; i++) for (const s of [r - 1, r + RW]) { if (get(i, s) === GRASS) set(i, s, WALK); if (get(s, i) === GRASS) set(s, i, WALK); }
  const blocks = [];
  for (let bj = 0; bj < 2; bj++) for (let bi = 0; bi < 2; bi++) blocks.push({x0:R[bi] + RW + 2, x1:R[bi + 1] - 3, y0:R[bj] + RW + 2, y1:R[bj + 1] - 3});
  const roles = shuffle(['depot', 'factory', 'garages', 'homes']);
  blocks.forEach((b, n) => {
    const role = roles[n];
    if (role !== 'homes') carve(b.x0, b.y0, b.x1, b.y1, WALK);                        // бетонный двор
    if (role === 'depot') {                                                              // склады и поддоны
      for (let k = 0, t = 0; k < 3 && t < 200; t++) {
        const w = ri(14, 20), h = ri(9, 12), x = ri(b.x0 + 1, b.x1 - w), y = ri(b.y0 + 1, b.y1 - h);
        if (houses.some(H => x < H.x + H.w + 4 && x + w + 4 > H.x && y < H.y + H.h + 4 && y + h + 4 > H.y)) continue;
        carve(x, y, x + w - 1, y + h - 1, GRASS); bld(x, y, w, h, 'warehouse', [1, 0, 3, 2]); k++;
        SPECIAL.push({x:x + w / 2, y:y + h / 2, pi:12, n:2});
      }
      for (let k = 0; k < 14; k++) yardBox(ri(b.x0, b.x1), ri(b.y0, b.y1), 'crate');
      for (let k = 0; k < 2; k++) { const x = ri(b.x0 + 1, b.x1 - 3), y = ri(b.y0 + 1, b.y1 - 2); if (get(x, y) === WALK && get(x + 1, y) === WALK) { set(x, y, ROAD); set(x + 1, y, ROAD); if (!parkCarAt(x, y, 'x', {ci:5, army:false})) { set(x, y, WALK); set(x + 1, y, WALK); } } }
    } else if (role === 'factory') {                                                     // большой цех
      const w = Math.min(28, b.x1 - b.x0 - 4), h = Math.min(18, b.y1 - b.y0 - 6), x = b.x0 + 2, y = b.y0 + 2;
      carve(x, y, x + w - 1, y + h - 1, GRASS); bld(x, y, w, h, 'factory', [1, 3, 0, 2]);
      SPECIAL.push({x:x + w / 2, y:y + h / 2, pi:12, n:5});
      const by = y + h + 3; if (by + 6 < b.y1) { carve(b.x1 - 11, by, b.x1 - 2, by + 6, GRASS); bld(b.x1 - 11, by, 9, 6, 'warehouse', [0, 1, 2, 3]); }
      for (let k = 0; k < 8; k++) yardBox(ri(b.x0, b.x1), ri(by, b.y1), 'crate');
    } else if (role === 'garages') {                                                     // ряды гаражей
      for (let gy = b.y0 + 2; gy + 5 < b.y1; gy += 10) for (let gx = b.x0 + 1; gx + 6 < b.x1; gx += 7) {
        carve(gx, gy, gx + 5, gy + 4, GRASS); bld(gx, gy, 6, 5, 'garage', [rng() < .5 ? 1 : 0]);
      }
      for (let k = 0; k < 3; k++) { const x = ri(b.x0 + 1, b.x1 - 3), y = ri(b.y0, b.y1); if (get(x, y) === WALK && get(x + 1, y) === WALK) { set(x, y, ROAD); set(x + 1, y, ROAD); if (!parkCarAt(x, y, 'x')) { set(x, y, WALK); set(x + 1, y, WALK); } } }
    } else {                                                                             // общежития рабочих и столовая
      for (let k = 0, t = 0; k < 5 && t < 200; t++) {
        const w = ri(9, 11), h = ri(8, 10), x = ri(b.x0, b.x1 - w + 1), y = ri(b.y0, b.y1 - h + 1);
        if (!rectFree(x, y, w, h, 2)) continue;
        bld(x, y, w, h, 'house'); k++;
      }
      for (let t = 0; t < 100; t++) { const x = ri(b.x0, b.x1 - 9), y = ri(b.y0, b.y1 - 7); if (!rectFree(x, y, 9, 7, 2)) continue; bld(x, y, 9, 7, 'cafe', [1, 0, 3, 2]); break; }
    }
    // забор вокруг двора с воротами на улицу
    if (role !== 'homes') {
      const gx = (b.x0 + b.x1) >> 1, gy = (b.y0 + b.y1) >> 1;
      fenceRun(b.x0 - 1, b.y0 - 1, b.x1 + 1, b.y0 - 1, [[gx - 2, gx + 2]]); fenceRun(b.x0 - 1, b.y1 + 1, b.x1 + 1, b.y1 + 1, [[gx - 2, gx + 2]]);
      fenceRun(b.x0 - 1, b.y0, b.x0 - 1, b.y1, [[gy - 2, gy + 2]]); fenceRun(b.x1 + 1, b.y0, b.x1 + 1, b.y1, [[gy - 2, gy + 2]]);
    }
  });
  // заправка у трассы за пределами сетки
  for (let t = 0; t < 60; t++) { const x = ri(8, 30), y = EXIT_R + RW + 2; if (!rectFree(x, y, 8, 6, 1)) continue; const H = bld(x, y, 8, 6, 'gas', [1]); for (const px of [x + 2, x + 5]) addProp({type:'pump', proc:true, cx:px + .5, cy:y - 1.5, solid:true, r:[px + .3, y - 2 + .32, px + .7, y - 2 + .68]}, [[px, y - 2]]); SPECIAL.push({x:x + 4, y:y + 3, pi:12, n:2}); break; }
  // фонари вдоль улиц
  for (const r of R) for (let k = R[0] + 2; k < R[2]; k += 7) {
    if (!inRoadCol(k) && get(k, r - 1) === WALK && !propAt[(r - 1) * MW + k]) addProp({type:'lamp', flick:rng() < .25, cx:k + .5, cy:r - .5 + .3, hx:0, hy:1, solid:true, r:[k + .4, r - 1 + .7, k + .6, r - 1 + .9]}, [[k, r - 1]]);
  }
  for (let t = 0; t < 40; t++) { const r = pick(R), lane = r + pick([0, RW - 1]), a = ri(R[0], R[2]); if (inRoadCol(a) || inRoadCol(a + 1)) continue; rng() < .5 ? parkCarAt(a, lane, 'x', rng() < .3 ? {ci:5} : null) : parkCarAt(lane, a, 'y', rng() < .3 ? {ci:5} : null); }
  highwayCars(8);
  genFinish({tree:(x, y, n) => (x > R[0] - 4 && x < R[2] + RW + 4 && y > R[0] - 4 && y < R[2] + RW + 4) ? .02 : .2 + .2 * n, bush:.025, bins:.02, hideouts:1});
  world.nofence = true;
}

// ---- генератор по типу района ----
// построить карту района по его типу (curDType): город нового вида (world.gen ≥ 2), старый город, деревня, лес, промзона
function generate() {
  ROADSX = ROADSY = null; curAct = null;                                    // прежнее действие ссылается на старую карту
  if (genTutMap) { setWorldSize(TUT_MW); world.dtype = 'tut'; GCFG = {}; genTutorial(); growFurniture(); return; }   // обучение: один двор за забором (86-tut-map)
  const t = curDType();
  setWorldSize(world.gen >= 3 && t === 'town' ? (world.townN || 256) : 184);   // новый городок — большая карта (v72: 320, старые сохранения — 256), остальные районы как были
  if (world.gen >= 3 && t === 'town') { world.dtype = t; GCFG = {}; genCounty(); growFurniture(); return; }   // городок вдоль трассы с фермами (74-county)
  if (world.gen >= 2 && (t === 'town' || t === 'downtown')) { world.dtype = t; GCFG = {}; genCity(t); growFurniture(); return; }
  world.dtype = t; world.nofence = false;
  ROADS.length = 0; ROADS.push(30, 60, 90, 120, 150);
  if (t === 'town') { GCFG = {}; genTown(); return; }
  if (t === 'downtown') {
    GCFG = {roles:['police', 'pharmacy', 'clinic', 'hardware', 'gas', 'store', 'store', 'store', 'cafe', 'cafe', 'office', 'office', 'pharmacy', 'office', 'park'], per:5, gap:1, cars:170, lamp:6, cabins:1, greens:250};
    try { genTown(); } finally { GCFG = {}; }
    return;
  }
  ROADS.length = 0; ROADS.push(EXIT_R);
  genReset();
  if (t === 'village') genVillage(); else if (t === 'forest') genForest(); else genIndustrial();
  if (!houses.some(H => H.kind === 'house' && H.rooms)) {                       // подстраховка: хоть один жилой дом для появления героя
    for (let t2 = 0; t2 < 400; t2++) { const x = ri(30, 144), y = ri(30, 144); if (!rectFree(x, y, 9, 8, 1)) continue; const H = bld(x, y, 9, 8, 'house'); pathFromDoor(H); for (let i = 0; i < NT; i++) if (map[i] === WALL) { const xx = i % MW, yy = (i / MW) | 0; wpC[i] = pieces(xx, yy, HWC); wpV[i] = pieces(xx, yy, HWV); } break; }
  }
  if (world.gen >= 2) growFurniture();                                          // деревня, лес, промзона: крупная мебель и вещи в комнатах, как в городе
}
// после постройки нового района: дождевые бочки в деревне, мусор и т. п. (только при первом заходе)
function postGen(t) {
  if (t === 'village') {
    for (const H of houses.filter(H => H.kind === 'house')) if (rng() < .45) {
      for (let k = 0; k < 20; k++) { const x = H.x - 1 + ri(0, H.w + 1), y = H.y - 1 + ri(0, H.h + 1), i = y * MW + x; if (!inMap(x, y, 1) || map[i] !== GRASS || propAt[i] || furn[i] || hAt[i]) continue;
        const p = {type:'barrel', cx:x + .5, cy:y + .5, solid:true, r:[x + .26, y + .26, x + .74, y + .74], w:ri(2, 12), outside:true}; if (addProp(p, [[x, y]])) { barrels.push(p); break; } }
    }
  }
}
