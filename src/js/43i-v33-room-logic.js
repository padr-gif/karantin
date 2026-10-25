// ================= v33: расстановка по смыслу, центр комнаты, мелочи на полу =================
// 1) У стен — «куда хочется встать»: тумбочки у изголовья, ТВ на стене напротив дивана, торшер и кресло у края
//    дивана, кухня одним рядом, полотенцесушитель у ванны, раковина у унитаза, обувная полка и вешалка у входа,
//    письменный стол и батарея к окну; высокие шкафы окна не загораживают.
// 2) Центр: журнальный столик перед диваном, кресло лицом к нему, ковёр под группой; сундук в ногах кровати,
//    ковёр у кровати; стул перед письменным столом; стулья вокруг кухонного стола; дорожка в прихожей.
// 3) Мелочи на полу (одежда, книги, бутылки, газеты, обувь, мусорные пакеты) — по смыслу комнаты, сквозь них ходят.
// Всё ставится после генерации своим генератором случайных чисел — сохранения не ломаются.

Object.assign(CONT, {chest:{name:'Сундук', loot:['rag', 'sweater', 'jacket', 'hat', 'candle', 'novel', 'cards', 'watchQ', 'note'].filter(id => ITEMS[id]), n:[1, 3], cap:10}});
const VARN = {plant:3, floorlamp:2, boxes:3, chair:2, chest:2, armchair:3};
const TALL = new Set(['wardrobe', 'fridge', 'bookshelf', 'pantry', 'shelf', 'medcab', 'mirror', 'hanger', 'locker']);
const KSET = new Set(['fridge', 'stove', 'sink', 'cabinet', 'counter', 'pantry', 'washer', 'kbin']);
const typeIs = (f, ...t) => t.includes(fartType(f.type));
const roomDoors = room => { const o = []; for (let y = room.y0 - 1; y <= room.y1 + 1; y++) for (let x = room.x0 - 1; x <= room.x1 + 1; x++) if (get(x, y) === DOOR) o.push([x + .5, y + .5]); return o; };
const roomWins = room => { const o = []; for (let y = room.y0 - 1; y <= room.y1 + 1; y++) for (let x = room.x0 - 1; x <= room.x1 + 1; x++) if (get(x, y) === WIN) o.push([x + .5, y + .5]); return o; };
const nearest = (pts, x, y) => pts.reduce((b, p) => !b || Math.hypot(p[0] - x, p[1] - y) < Math.hypot(b[0] - x, b[1] - y) ? p : b, null);
const alongOf = wd => wd[1] !== 0 ? [1, 0] : [0, 1];     // ось вдоль стены за вещью
const depthOf = f => f.wd[1] !== 0 ? f.sy : f.sx;
const widthOf = f => f.wd[1] !== 0 ? f.sx : f.sy;

// сначала главное, сразу за ним — то, что к нему привязано (тумбочка к кровати, ТВ к дивану), потом остальное, декор последним
const ATTACH = new Set(['nightstand', 'tv', 'tv1']);
furnPrio = f => ESSENTIAL.has(fartType(f.type)) ? 0 : ATTACH.has(fartType(f.type)) ? 1 : f.extra ? 3 : 2;
furnTarget = function (f, placed, room, Hs) {
  const find = (...t) => placed.find(g => typeIs(g, ...t));
  const T = fartType(f.type);
  if (T === 'bed' || T === 'sofa') return [(room.x0 + room.x1 + 1) / 2, (room.y0 + room.y1 + 1) / 2];   // к середине стены, а не в угол
  if (T === 'tv') {                                    // напротив дивана: луч от дивана вперёд до стены
    const s = find('sofa'); if (!s) return null;
    let x = s.cx, y = s.cy; for (let k = 0; k < 12; k++) { const nx = x - s.wd[0], ny = y - s.wd[1]; if (get(Math.floor(nx), Math.floor(ny)) !== FLOOR) break; x = nx; y = ny; }
    return [x, y];
  }
  if (T === 'nightstand') {                            // у изголовья, сбоку; вторая — с другой стороны (первая место уже заняла)
    const b = find('bed'); if (!b) return null;
    const a = alongOf(b.wd), hw = widthOf(b) / 2 + .3, bx = b.cx + b.wd[0] * (depthOf(b) / 2 - .3), by = b.cy + b.wd[1] * (depthOf(b) / 2 - .3);
    const c = [[bx + a[0] * hw, by + a[1] * hw], [bx - a[0] * hw, by - a[1] * hw]];
    return c.find(([x, y]) => !furn[Math.floor(y) * MW + Math.floor(x)] && get(Math.floor(x), Math.floor(y)) === FLOOR) || c[0];
  }
  if (['floorlamp', 'endtable', 'armchair', 'plant'].includes(T) && room.type === 'living') {
    const s = find('sofa'); if (!s) return null;
    const a = alongOf(s.wd), hw = widthOf(s) / 2 + .35, sg = T === 'armchair' ? -1 : 1;
    return [s.cx + a[0] * hw * sg, s.cy + a[1] * hw * sg];
  }
  if (T === 'mirror') { const w = find('wardrobe', 'dresser'); return w ? [w.cx, w.cy] : null; }
  if (KSET.has(T) && room.type === 'kitchen') {        // кухня одним рядом: к уже стоящим кухонным вещам
    const k = placed.filter(g => KSET.has(fartType(g.type))); if (!k.length) return null;
    return [k.reduce((s, g) => s + g.cx, 0) / k.length, k.reduce((s, g) => s + g.cy, 0) / k.length];
  }
  if (T === 'towels') { const b = find('bath', 'bath1'); return b ? [b.cx, b.cy] : null; }
  if (T === 'bsink' || T === 'medcab') { const t = find('toilet', 'bsink'); return t ? [t.cx, t.cy] : null; }
  if (T === 'shoerack' || T === 'hanger') { const d = roomDoors(room); return d.length ? nearest(d, f.x0 + .5, f.y0 + .5) : null; }
  if (T === 'wdesk' || T === 'radiator') { const w = roomWins(room); return w.length ? nearest(w, f.x0 + .5, f.y0 + .5) : null; }
  return null;
};
wallOk = function (f, x, y, wd) {
  const t = get(x + wd[0], y + wd[1]), T = fartType(f.type);
  if (T === 'radiator') return t === WIN;               // батарея — только под окном
  if (TALL.has(T) && t === WIN) return false;            // высокое окно не загораживает
  return true;
};
// что дописывать к основной мебели: центр комнаты (журнальный столик, стул к столу, сундук) ставится отдельно

// ---- вещи посреди комнаты ----
function roomFurn(Hs, room) { const hi = houses.indexOf(Hs) + 1; return furns.filter(f => !f.gone && hAt[f.y * MW + f.x] === hi && f.x >= room.x0 && f.x <= room.x1 && f.y >= room.y0 && f.y <= room.y1); }
function inRoomRect(room, r) { return r[0] > room.x0 - .5 + HWV + .02 && r[1] > room.y0 - .5 + HWV + .02 && r[2] < room.x1 + 1.5 - HWV - .02 && r[3] < room.y1 + 1.5 - HWV - .02; }
// поставить вещь центром в (cx, cy); wd — куда смотрит её «спина»; не мешает проходу и подходу к остальной мебели
function placeFree(Hs, room, type, cx, cy, wd, v) {
  const sz = fsizeOf(type); if (!sz) return null;
  const sx = wd[1] !== 0 ? sz[0] : sz[1], sy = wd[1] !== 0 ? sz[1] : sz[0];
  const r = [cx - sx / 2, cy - sy / 2, cx + sx / 2, cy + sy / 2];
  if (!inRoomRect(room, r)) return null;
  const x = Math.floor(cx), y = Math.floor(cy);
  if (x < room.x0 || x > room.x1 || y < room.y0 || y > room.y1) return null;
  const f = {x, y, type, items:[], searched:false, wd, cx, cy, sx, sy, r, v:v || 0, extra:true, center:true};
  furns.push(f);
  const R = {r, cx, cy, sx, sy};
  if (!rectFits(f, R, wd, {gen:true, free:true, x, y})) { furns.pop(); return null; }
  regFurn(f);
  const others = roomFurn(Hs, room).filter(g => g !== f && g.tiles);
  if (!houseOk(Hs) || !canReach(f) || !others.every(canReach)) { unregFurn(f); furns.pop(); return null; }
  const c = CONT[type]; if (c && c.loot) for (let q = ri(c.n[0], c.n[1]); q > 0; q--) f.items.push(mkItem(pick(c.loot)));
  return f;
}
// поставить вплотную, насколько позволяет сетка клеток: идём от края опоры (bx, by) в сторону dir, пока вещь не встанет
// (мебель занимает клетки целиком, поэтому столик перед диваном иногда отодвигается до следующего ряда клеток)
function placeNear(Hs, room, type, bx, by, dir, minGap, wd, v, maxGap) {
  const sz = fsizeOf(type); if (!sz) return null;
  const depth = (dir[1] !== 0) === (wd[1] !== 0) ? sz[1] : sz[0];
  for (let g = minGap; g <= (maxGap || minGap + 1.0); g += .05) {
    const cx = bx + dir[0] * (g + depth / 2), cy = by + dir[1] * (g + depth / 2);
    const f = placeFree(Hs, room, type, cx, cy, wd, v); if (f) return f;
  }
  return null;
}
const RUGC = [[124, 58, 52], [64, 84, 110], [120, 104, 70], [86, 96, 74], [110, 70, 90]];
function addRug(Hs, room, x0, y0, x1, y1) {
  const r = [Math.max(x0, room.x0 - .5 + HWV + .05), Math.max(y0, room.y0 - .5 + HWV + .05), Math.min(x1, room.x1 + 1.5 - HWV - .05), Math.min(y1, room.y1 + 1.5 - HWV - .05)];
  if (r[2] - r[0] < .6 || r[3] - r[1] < .6) return;
  Hs.rugs.push([r[0], r[1], r[2], r[3], pick(RUGC)]);
}
function centerGroups(Hs, room) {
  const F = roomFurn(Hs, room), find = (...t) => F.find(g => typeIs(g, ...t));
  if (room.type === 'living') {
    const s = find('sofa');
    if (s) {
      const fd = [-s.wd[0], -s.wd[1]], a = alongOf(s.wd), d0 = depthOf(s) / 2;
      const t = placeNear(Hs, room, 'coffeetab', s.cx + fd[0] * d0, s.cy + fd[1] * d0, fd, .35, s.wd, 0, 1.1);
      if (t) {
        let ac = null;
        for (const sg of rng() < .5 ? [1, -1] : [-1, 1]) {   // кресло сбоку от столика, лицом к нему
          const ax = t.cx + a[0] * sg * .5, ay = t.cy + a[1] * sg * .5;
          if (ac = placeNear(Hs, room, 'armchair', ax, ay, [a[0] * sg, a[1] * sg], .2, [a[0] * sg, a[1] * sg], ri(0, 2), .9)) break;
        }
        // сбоку места нет — напротив дивана, по другую сторону столика
        if (!ac) placeNear(Hs, room, 'armchair', t.cx + fd[0] * .275, t.cy + fd[1] * .275, fd, .3, fd, ri(0, 2), 1.0);
        const ex = Math.abs(a[0]) * 1.0 + .45, ey = Math.abs(a[1]) * 1.0 + .45;   // ковёр под группой
        addRug(Hs, room, t.cx - ex - Math.abs(fd[0]) * .25, t.cy - ey - Math.abs(fd[1]) * .25, t.cx + ex + Math.abs(fd[0]) * .25, t.cy + ey + Math.abs(fd[1]) * .25);
      }
    }
  }
  if (room.type === 'bedroom') {
    const b = find('bed');
    if (b) {
      const fd = [-b.wd[0], -b.wd[1]], a = alongOf(b.wd), d0 = depthOf(b) / 2, w0 = widthOf(b) / 2;
      if (rng() < .65) placeNear(Hs, room, 'chest', b.cx + fd[0] * d0, b.cy + fd[1] * d0, fd, .04, b.wd, ri(0, 1), .7);
      for (const sg of [1, -1]) {                          // ковёр у той стороны кровати, где пол свободен
        const cx = b.cx + a[0] * sg * (w0 + .45), cy = b.cy + a[1] * sg * (w0 + .45);
        if (get(Math.floor(cx), Math.floor(cy)) !== FLOOR || furn[Math.floor(cy) * MW + Math.floor(cx)]) continue;
        const hx = Math.abs(a[0]) * .4 + Math.abs(fd[0]) * .7, hy = Math.abs(a[1]) * .4 + Math.abs(fd[1]) * .7;
        addRug(Hs, room, cx - hx, cy - hy, cx + hx, cy + hy); break;
      }
    }
    const d = find('wdesk');   // стул перед столом, лицом к нему (спинка — от стола)
    if (d) { const fd = [-d.wd[0], -d.wd[1]]; placeNear(Hs, room, 'chair', d.cx + fd[0] * depthOf(d) / 2, d.cy + fd[1] * depthOf(d) / 2, fd, .03, fd, 0, 1.0); }
  }
  if (room.type === 'kitchen') {
    const t = F.find(g => isFreeGen(g) && typeIs(g, 'table', 'table1'));
    if (t) {
      const v = ri(0, 1); let n = 0;
      for (const d of WDS) {                               // стулья вокруг стола, спинкой от стола
        const ext = d[0] ? t.sx / 2 : t.sy / 2;
        if (placeNear(Hs, room, 'chair', t.cx + d[0] * ext, t.cy + d[1] * ext, d, .04, d, v, .5)) n++;
      }
      if (n && rng() < .5) addRug(Hs, room, t.r[0] - .45, t.r[1] - .45, t.r[2] + .45, t.r[3] + .45);
    }
  }
  if (room.type === 'hall') {                              // дорожка вдоль прихожей
    const w = room.x1 - room.x0 + 1, h = room.y1 - room.y0 + 1;
    if (w >= h) addRug(Hs, room, room.x0 + .2, room.y0 + h / 2 - .1, room.x1 + .8, room.y0 + h / 2 + .7);
    else addRug(Hs, room, room.x0 + w / 2 - .1, room.y0 + .2, room.x0 + w / 2 + .7, room.y1 + .8);
  }
}
// ---- мелочи на полу ----
const DECOR_BY = {bedroom:['clothes', 'clothes', 'books', 'shoes', 'bottles'], living:['newspaper', 'books', 'bottles', 'newspaper', 'clothes'],
  kitchen:['bottles', 'trash', 'newspaper'], bath:['clothes'], hall:['shoes', 'shoes', 'trash', 'newspaper']};
const DECOR_N = {clothes:3, books:2, bottles:2, newspaper:1, shoes:2, trash:2};
function floorDecor(Hs, room) {
  const kinds = DECOR_BY[room.type]; if (!kinds) return;
  const n = ri(1, room.type === 'bath' ? 1 : 3);
  const cells = [];
  for (let y = room.y0; y <= room.y1; y++) for (let x = room.x0; x <= room.x1; x++) {
    const i = y * MW + x; if (get(x, y) !== FLOOR || furn[i] || propAt[i]) continue;
    if (D4.some(([ox, oy]) => get(x + ox, y + oy) === DOOR)) continue;
    const near = D8F.some(([ox, oy]) => furn[(y + oy) * MW + x + ox] || isWallT9(get(x + ox, y + oy)));   // у стены или мебели, не посреди прохода
    if (near) cells.push([x, y]);
  }
  Hs.decor = Hs.decor || [];
  for (let k = 0; k < n && cells.length; k++) {
    const [x, y] = cells.splice(ri(0, cells.length - 1), 1)[0], kd = pick(kinds);
    if (ART.meta && !ART.meta.frames['dec_' + kd + '_0']) continue;   // мир для меню строится до загрузки спрайтов
    Hs.decor.push({x:x + .3 + rng() * .4, y:y + .3 + rng() * .4, k:kd, v:ri(0, DECOR_N[kd] - 1)});
  }
}
function roomLogic() {
  const keep = rng;
  try {
    houses.forEach((Hs, hi) => {
      if (!Hs || !Hs.rooms) return;
      rng = mulberry32(((world.seed | 0) ^ Math.imul(hi + 3, 0x27D4EB2F)) >>> 0);
      Hs.rugs = Hs.rugs.filter(r => !Hs.rooms.some(room => ['living', 'bedroom', 'hall'].includes(room.type) && r[0] >= room.x0 - 1 && r[2] <= room.x1 + 2 && r[1] >= room.y0 - 1 && r[3] <= room.y1 + 2));
      Hs.decor = [];
      for (const room of Hs.rooms) { centerGroups(Hs, room); floorDecor(Hs, room); }
      // варианты вида у вещей с несколькими моделями
      for (const f of roomFurnAll(Hs)) if (VARN[f.type] && !f.center && f.extra) f.v = Math.floor(hash(f.x * 3 + 1, f.y * 5 + 2) * VARN[f.type]);
    });
  } finally { rng = keep; }
}
function roomFurnAll(Hs) { const hi = houses.indexOf(Hs) + 1; return furns.filter(f => !f.gone && hAt[f.y * MW + f.x] === hi); }
