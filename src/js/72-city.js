// ================= разнообразные города и дворы =================
// Новый генератор городка и центра: неровная сетка улиц (свой шаг по каждой оси), улицы, которые обрываются
// на перекрёстке, тупики-проезды внутри больших кварталов, многоэтажки, школа, дома разного размера.
// Дворы: заборы из штакетника, сетки и профлиста, гаражи с подъездом и машиной, огороды, яблони.
// Включается в новых играх (world.gen ≥ 2; с gen 3 городок строит 74-county, а этот генератор — только центр города): старые сохранения строятся старым генератором, как были.

// ---- школа и многоэтажка ----
COMM.add('school');
FLIST.school = ['desk', 'desk', 'wdesk', 'wdesk', 'wdesk', 'bookshelf', 'bookshelf', 'locker', 'locker', 'medcab', 'counter', 'fridge', 'sink'];
{ const ok = L => L.filter(id => ITEMS[id]);
  LOOTK.school = {desk:ok(['map', 'choco', 'coffee', 'battery', 'tape', 'pills']), wdesk:ok(['map', 'choco', 'book_med', 'battery', 'tape']), bookshelf:ok(['book_med', 'book_mech', 'map', 'book_mech2']),
    locker:ok(['flashlight', 'bandage', 'battery', 'bat', 'golf', 'water']), medcab:ok(['bandage', 'pills', 'antisep', 'painkill']), fridge:ok(['milk', 'water', 'bread', 'apple']), counter:ok(['choco', 'chips', 'water', 'soda'])};
}
WALLK.school = [214, 200, 150];
SIGNS.school = {text:'ШКОЛА', bg:'#2a5a8a', fg:'#ffffff', label:'Школа'};
BLOOK.school = {brick:true};
const CSIZE = {police:[12, 9], pharmacy:[9, 7], hardware:[11, 8], store:[13, 9], gas:[8, 6], clinic:[14, 10], cafe:[9, 7], office:[12, 9], school:[15, 10]};
const PANEL_C = [[184, 180, 170], [196, 186, 164], [170, 176, 178], [204, 196, 182]];

// многоэтажка: коридор посередине, по квартире на каждые 6 клеток сверху и снизу
function buildFlats(x, y, n) {
  const w = 6 * n + 1, h = 14, idx = houses.length + 1;
  const Hs = {x, y, w, h, kind:'flats', ridgeX:true, inner:-1, doors:[], ix0:x + .5, iy0:y + .5, ix1:x + w - .5, iy1:y + h - .5,
    wallC:pick(PANEL_C), paper:pick(PAPER), roofC:[88, 90, 94], sign:null, chimney:null, rugs:[], kitchen:0, pstyle:ri(0, 2), brick:rng() < .4};
  houses.push(Hs);
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { const b = xx === x || yy === y || xx === x + w - 1 || yy === y + h - 1; set(xx, yy, b ? WALL : FLOOR); hAt[yy * MW + xx] = idx; }
  for (let xx = x + 1; xx < x + w - 1; xx++) { set(xx, y + 5, WALL); set(xx, y + 8, WALL); }
  const rooms = [{x0:x + 1, x1:x + w - 2, y0:y + 6, y1:y + 7, type:'hall'}];
  for (let k = 0; k < n; k++) {
    const ax = x + 1 + k * 6;
    if (k > 0) for (const [y0, y1] of [[y + 1, y + 4], [y + 9, y + 12]]) for (let yy = y0; yy <= y1; yy++) set(ax - 1, yy, WALL);
    for (const [y0, y1, wy] of [[y + 1, y + 4, y + 5], [y + 9, y + 12, y + 8]]) {
      rooms.push({x0:ax, x1:ax + 4, y0, y1, type:rng() < .5 ? 'living' : 'bedroom', carpet:rng() < .4 ? ri(0, 2) : undefined});
      mkDoorAt(ax + ri(1, 3), wy, 0, true, Hs);
    }
  }
  Hs.rooms = rooms;
  mkDoorAt(x, y + 6, 2, false, Hs); mkDoorAt(x + w - 1, y + 7, 3, false, Hs);
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const border = xx === x || yy === y || xx === x + w - 1 || yy === y + h - 1, corner = (xx === x || xx === x + w - 1) && (yy === y || yy === y + h - 1);
    if (!border || corner || get(xx, yy) !== WALL || (yy >= y + 5 && yy <= y + 8)) continue;
    if (get(xx + 1, yy) === DOOR || get(xx - 1, yy) === DOOR || get(xx, yy + 1) === DOOR || get(xx, yy - 1) === DOOR) continue;
    const inX = xx === x ? xx + 1 : xx === x + w - 1 ? xx - 1 : xx, inY = yy === y ? yy + 1 : yy === y + h - 1 ? yy - 1 : yy;
    if (get(inX, inY) === WALL) continue;
    if (rng() < .45) { set(xx, yy, WIN); obs[yy * MW + xx] = {t:'win', broken:rng() < .1, ghp:10, bhp:0, cur:rng() < .6 ? pick([[150,70,60],[90,110,90],[200,190,160],[90,100,140]]) : null}; }
  }
  for (const r of rooms.slice(1)) for (const t of ['bed', 'fridge', 'stove', 'wardrobe'].concat(rng() < .5 ? ['sink'] : ['nightstand'])) addFurnIn(Hs, t, r);
  addFurnIn(Hs, 'hanger', rooms[0]);
  return Hs;
}

// ---- город ----
let cityMask = null;
const freeC = (x, y, w, h, m) => {
  if (!rectFree(x, y, w, h, m)) return false;
  for (let yy = y - m; yy < y + h + m; yy++) for (let xx = x - m; xx < x + w + m; xx++) if (cityMask[yy * MW + xx]) return false;
  return true;
};
function genCity(t) {
  const DT = t === 'downtown';
  genReset(); cityMask = new Uint8Array(NT);
  const axis = () => {                                                       // 4–5 линий с разным шагом, город всегда на всю площадь
    const g = () => ri(26, 34), L = [EXIT_R - g(), EXIT_R, EXIT_R + g()];
    const lo = Math.max(28, L[0] - g()), hi = Math.min(152, L[2] + g());
    if (L[0] - lo >= 22 && rng() > .15) L.unshift(lo);
    if (hi - L[L.length - 1] >= 22 && rng() > .15) L.push(hi);
    return L;
  };
  const RX = axis(), RY = axis();
  ROADSX = RX; ROADSY = RY; ROADS.length = 0; ROADS.push(...new Set([...RX, ...RY]));
  const C0 = Math.min(RX[0], RY[0]) - 1, C1 = Math.max(RX[RX.length - 1], RY[RY.length - 1]) + RW;
  const streets = [];
  // улица по каждой линии сетки: иногда обрывается на перекрёстке (Т-образный перекрёсток), но всегда пересекает трассу
  const span = (L, cross) => {
    const n = cross.length, i90 = cross.indexOf(EXIT_R);
    for (const p of L) {
      let lo = 0, hi = n - 1;
      if (p !== EXIT_R) { if (rng() < (DT ? .2 : .38)) lo = ri(0, i90); if (rng() < (DT ? .2 : .38)) hi = ri(i90, n - 1); }
      streets.push({p, lo:cross[lo], hi:cross[hi] + RW - 1, wd:RW, walk:true, vert:L === RX});
    }
  };
  span(RX, RY); span(RY, RX);
  for (const s of streets) s.vert ? carve(s.p, s.lo, s.p + RW - 1, s.hi, ROAD) : carve(s.lo, s.p, s.hi, s.p + RW - 1, ROAD);
  // тротуары вокруг городских улиц
  for (let y = C0 - 1; y <= C1 + 1; y++) for (let x = C0 - 1; x <= C1 + 1; x++) if (get(x, y) === GRASS && D4.some(([ox, oy]) => get(x + ox, y + oy) === ROAD) && inMap(x, y, 1)) set(x, y, WALK);
  highway(false);
  // большие кварталы: проезд-тупик с разворотом
  { const seenT = new Uint8Array(NT), comps = [];
    for (let y = C0; y <= C1; y++) for (let x = C0; x <= C1; x++) {
      const i0 = y * MW + x; if (seenT[i0] || map[i0] !== GRASS) continue;
      let x0 = x, x1 = x, y0 = y, y1 = y, n = 0; const q = [i0]; seenT[i0] = 1;
      while (q.length) { const i = q.pop(), cx = i % MW, cy = (i / MW) | 0; n++; x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
        for (const [ox, oy] of D4) { const nx = cx + ox, ny = cy + oy, j = ny * MW + nx; if (nx < C0 || ny < C0 || nx > C1 || ny > C1 || seenT[j] || map[j] !== GRASS) continue; seenT[j] = 1; q.push(j); } }
      comps.push({x0, x1, y0, y1, n});
    }
    for (const c of comps) {
      const W = c.x1 - c.x0 + 1, H = c.y1 - c.y0 + 1;
      if (W < 34 || H < 34 || rng() < .25) continue;
      const vert = H >= W, from = rng() < .5 ? -1 : 1, mid = vert ? ri(c.x0 + 12, c.x1 - 13) : ri(c.y0 + 12, c.y1 - 13);
      const len = Math.min(24, Math.floor((vert ? H : W) * .55));
      const a0 = vert ? (from < 0 ? c.y0 : c.y1) : (from < 0 ? c.x0 : c.x1), a1 = a0 - from * len;
      let ok = true; for (let a = Math.min(a0, a1); a <= Math.max(a0, a1) && ok; a++) for (let k = 0; k < 2; k++) { const xx = vert ? mid + k : a, yy = vert ? a : mid + k; if (get(xx, yy) !== GRASS) ok = false; }
      if (!ok) continue;
      vert ? carve(mid, a0, mid + 1, a1, ROAD) : carve(a0, mid, a1, mid + 1, ROAD);
      vert ? carve(mid - 1, a1 - from, mid + 2, a1 - from * 4, ROAD) : carve(a1 - from, mid - 1, a1 - from * 4, mid + 2, ROAD);   // разворот
      streets.push({p:mid, lo:Math.min(a0, a1), hi:Math.max(a0, a1), wd:2, walk:false, vert, lane:true});
    }
  }
  const city = (x, y, w, h) => x >= C0 && y >= C0 && x + w - 1 <= C1 && y + h - 1 <= C1;
  // место у улицы: здание лицом к ней
  const streetSpot = (w, h, gap, lanes) => {
    const L = streets.filter(s => !s.lane || lanes);
    for (let t2 = 0; t2 < 400; t2++) {
      const s = pick(L), side = rng() < .5 ? -1 : 1, ln = s.vert ? h : w;
      if (s.hi - s.lo - ln < 4) continue;
      const a = ri(s.lo + 1, s.hi - ln - 1), off = s.walk ? 1 : 0;
      const near = side < 0 ? s.p - off - 1 - gap - (s.vert ? w : h) : s.p + s.wd + off + 1 + gap;
      const x = s.vert ? near : a, y = s.vert ? a : near;
      if (!city(x, y, w, h) || !freeC(x, y, w, h, 1)) continue;
      return {x, y, s:s.vert ? (side < 0 ? 3 : 2) : (side < 0 ? 1 : 0)};
    }
    return null;
  };
  const OPP = [1, 0, 3, 2];
  const sidesOf = s => [s, OPP[s], ...[0, 1, 2, 3].filter(k => k !== s && k !== OPP[s])];
  // парки
  for (let k = 0, n = DT ? 1 : ri(1, 2); k < n; k++) {
    const w = ri(16, 24), h = ri(14, 20), sp = streetSpot(w, h, 0); if (!sp) continue;
    for (let yy = sp.y; yy < sp.y + h; yy++) for (let xx = sp.x; xx < sp.x + w; xx++) cityMask[yy * MW + xx] = 1;
    pond(sp.x + w / 2 + (rng() - .5) * 3, sp.y + h / 2 + (rng() - .5) * 3, 3 + rng() * 2.5, 2.5 + rng() * 2);
    for (let i = 0; i < w * h * .22; i++) { const xx = ri(sp.x, sp.x + w - 1), yy = ri(sp.y, sp.y + h - 1); if (get(xx, yy) === GRASS && !D8.some(([ox, oy]) => get(xx + ox, yy + oy) === WATER)) set(xx, yy, TREE); }
  }
  // общественные здания
  const comm = DT ? ['police', 'pharmacy', 'pharmacy', 'clinic', 'hardware', 'gas', 'store', 'store', 'store', 'cafe', 'cafe', 'office', 'office', 'school']
                  : ['police', 'pharmacy', 'hardware', 'gas', 'store', 'store'].concat(shuffle(['school', 'cafe', 'clinic', 'office']).slice(0, ri(1, 3)));
  for (const k of comm) {
    const [w, h] = CSIZE[k], sp = streetSpot(w, h, k === 'gas' ? 3 : 0); if (!sp) continue;
    const Hs = bld(sp.x, sp.y, w, h, k, sidesOf(sp.s));
    const mid = [sp.x + w / 2, sp.y + h / 2];
    if (k === 'police') SPECIAL.push({x:mid[0], y:mid[1], pi:10, n:4});
    if (k === 'pharmacy' || k === 'clinic') SPECIAL.push({x:mid[0], y:mid[1], pi:11, n:k === 'clinic' ? 5 : 3});
    if (k === 'gas') {                                                         // колонки перед заправкой
      const o = [[0, -1], [0, 1], [-1, 0], [1, 0]][sp.s], along = o[0] ? [0, 1] : [1, 0];
      const bx = sp.s === 0 ? sp.x + 1 : sp.s === 1 ? sp.x + 1 : sp.s === 2 ? sp.x - 3 : sp.x + w + 2, by = sp.s === 0 ? sp.y - 3 : sp.s === 1 ? sp.y + h + 2 : sp.y + 1;
      for (const k2 of [1, 5]) { const px = bx + along[0] * k2, py = by + along[1] * k2; if (get(px, py) === GRASS) addProp({type:'pump', proc:true, cx:px + .5, cy:py + .5, solid:true, r:[px + .3, py + .32, px + .7, py + .68]}, [[px, py]]); }
      SPECIAL.push({x:bx + .5, y:by + .5, pi:12, n:2});
    }
    if (k === 'police' && Hs) { for (let q = 0; q < 2; q++) { const s = streets.find(s => !s.lane && (s.vert ? Math.abs(s.p - sp.x) < 16 : Math.abs(s.p - sp.y) < 16)); if (!s) break; const a = Math.max(s.lo + 1, Math.min(s.hi - 3, (s.vert ? sp.y : sp.x) + ri(0, 6))); s.vert ? parkCarAt(s.p + (q ? RW - 1 : 0), a, 'y', {ci:2, police:true}) : parkCarAt(a, s.p + (q ? RW - 1 : 0), 'x', {ci:2, police:true}); } }
  }
  // многоэтажки
  for (let k = 0, n = DT ? ri(5, 7) : ri(1, 3); k < n; k++) {
    const nn = rng() < .5 ? 3 : 4, sp = streetSpot(6 * nn + 1, 14, 1); if (!sp) continue;
    buildFlats(sp.x, sp.y, nn);
  }
  // жилые дома вдоль улиц и проездов
  const SZ = DT ? [[9, 8, 4], [10, 9, 3], [10, 10, 1]] : [[9, 8, 4], [10, 9, 3], [10, 10, 1.5], [12, 11, .8], [13, 12, .4]];
  const pickSz = () => { let r = rng() * SZ.reduce((a, s) => a + s[2], 0); for (const s of SZ) { if ((r -= s[2]) < 0) return rng() < .5 ? [s[0], s[1]] : [s[1], s[0]]; } return [9, 8]; };
  for (const s of shuffle(streets.slice())) for (const side of [-1, 1]) for (let a = s.lo + 1; a < s.hi - 7;) {
    const [w, h] = pickSz(), off = s.walk ? 1 : 0;
    const near = side < 0 ? s.p - off - 1 - (s.vert ? w : h) - 1 : s.p + s.wd + off + 2;
    const x = s.vert ? near : a, y = s.vert ? a : near;
    if (city(x, y, w, h) && freeC(x, y, w, h, 1)) { const H = bld(x, y, w, h, 'house'); pathFromDoor(H); a += (s.vert ? h : w) + (DT ? ri(1, 2) : ri(1, 4)); }
    else a += 2;
  }
  // редкие дома в глубине кварталов
  for (let k = 0, t2 = 0; k < (DT ? 6 : 14) && t2 < 900; t2++) { const w = ri(9, 10), h = ri(8, 9), x = ri(C0, C1 - w), y = ri(C0, C1 - h); if (!freeC(x, y, w, h, 1)) continue; bld(x, y, w, h, 'house'); k++; }
  // дворы
  const homes = houses.filter(H => H.kind === 'house');
  for (const H of homes) if (rng() < (DT ? .2 : .4)) yardGarage(H);
  for (const H of homes) if (rng() < (DT ? .3 : .6)) yardFence(H);
  for (const H of homes) if (!DT && rng() < .5) yardGarden(H);
  // охотничьи домики в лесу между городом и забором
  for (let n = 0, t2 = 0; n < (DT ? 1 : 4) && t2 < 300; t2++) { const x = ri(FEN + 3, MW - FEN - 8), y = ri(FEN + 3, MH - FEN - 8); if (x + 7 >= C0 - 2 && x <= C1 + 2 && y + 7 >= C0 - 2 && y <= C1 + 2) continue; if (!rectFree(x, y, 5, 4, 2)) continue; bld(x, y, 5, 4, 'shed'); n++; }
  // фонари и машины на улицах
  for (const s of streets) if (!s.lane) for (let k = s.lo + 2; k < s.hi - 1; k += DT ? 6 : 8) {
    if (s.vert) { const x = s.p - 1; if (get(x, k) === WALK && !propAt[k * MW + x]) addProp({type:'lamp', flick:rng() < .15, cx:x + .5 + .3, cy:k + .5, hx:1, hy:0, solid:true, r:[x + .7, k + .4, x + .9, k + .6]}, [[x, k]]); }
    else { const y = s.p - 1; if (get(k, y) === WALK && !propAt[y * MW + k]) addProp({type:'lamp', flick:rng() < .15, cx:k + .5, cy:y + .5 + .3, hx:0, hy:1, solid:true, r:[k + .4, y + .7, k + .6, y + .9]}, [[k, y]]); }
  }
  const crossing = (s, a) => (s.vert ? RY : RX).some(q => a >= q - 1 && a <= q + RW);
  for (let t2 = 0, n = 0; t2 < 900 && n < (DT ? 150 : 80); t2++) {
    const s = pick(streets); if (s.lane) continue;
    const a = ri(s.lo, s.hi - 1), lane = s.p + (rng() < .5 ? 0 : RW - 1);
    if (crossing(s, a) || crossing(s, a + 1)) continue;
    if (s.vert ? parkCarAt(lane, a, 'y') : parkCarAt(a, lane, 'x')) n++;
  }
  // карантин: блокпосты на трассе и забор
  for (const side of ['w', 'e', 'n', 's']) checkpoint(side);
  const F2 = MW - 1 - FEN;
  quarantineFence(F2, false);
  const nearCP = (x, y) => (Math.abs(x - EXIT_R - 2) < 10 && (y < FEN + 10 || y > MH - FEN - 11)) || (Math.abs(y - EXIT_R - 2) < 10 && (x < FEN + 10 || x > MW - FEN - 11));
  genFinish({tree:(x, y, n) => {
    if (nearCP(x, y) || cityMask[y * MW + x]) return 0;
    if (x >= C0 - 1 && x <= C1 + 1 && y >= C0 - 1 && y <= C1 + 1) return DT ? .006 : .02;
    return insideFence(x, y) ? .1 + .14 * n : .36 + .2 * n;
  }, bush:DT ? .015 : .03, bins:.018, hideouts:3});
  cityMask = null; world.nofence = false;
}

// ---- дворы ----
function frontSide(H) {                                                      // сторона, к которой ближе дорога: 0 верх, 1 низ, 2 лево, 3 право
  let best = 0, bd = 99;
  for (let s = 0; s < 4; s++) for (let k = 1; k < 9 && k < bd; k++) {
    const span = s < 2 ? H.w : H.h;
    for (let q = 0; q < span; q += 2) {
      const x = s < 2 ? H.x + q : s === 2 ? H.x - k : H.x + H.w - 1 + k, y = s < 2 ? (s === 0 ? H.y - k : H.y + H.h - 1 + k) : H.y + q, t = get(x, y);
      if (t === ROAD || t === WALK) { if (k < bd) { bd = k; best = s; } break; }
    }
  }
  return bd < 99 ? best : -1;
}
function yardGarage(H) {
  const s = frontSide(H); if (s < 0) return;
  const gw = s < 2 ? 6 : 5, gh = s < 2 ? 5 : 6;
  const cand = s < 2 ? [[H.x - gw - 2, s === 0 ? H.y : H.y + H.h - gh], [H.x + H.w + 2, s === 0 ? H.y : H.y + H.h - gh]]
                     : [[s === 2 ? H.x : H.x + H.w - gw, H.y - gh - 2], [s === 2 ? H.x : H.x + H.w - gw, H.y + H.h + 2]];
  for (const [gx, gy] of shuffle(cand)) {
    if (!(cityMask ? freeC(gx, gy, gw, gh, 1) : rectFree(gx, gy, gw, gh, 1))) continue;
    const n = houses.length; bld(gx, gy, gw, gh, 'garage', [s, OPPS[s], 2, 3]);
    const G = houses[n]; if (!G || !G.doors.length) return;
    // подъезд от ворот до дороги
    const d = G.doors[0], o = [[0, -1], [0, 1], [-1, 0], [1, 0]][d.s], cells = [];
    for (let k = 1; k < 12; k++) {
      const pts = [[d.x + o[0] * k, d.y + o[1] * k], s < 2 ? [d.x + 1 + o[0] * k, d.y + o[1] * k] : [d.x + o[0] * k, d.y + 1 + o[1] * k]];
      const ts = pts.map(([x, y]) => get(x, y));
      if (ts.some(t => t === ROAD || t === WALK)) { for (const [x, y] of cells) set(x, y, ROAD); if (cells.length >= 4 && rng() < .6) { const [x, y] = cells[0]; s < 2 ? parkCarAt(Math.min(x, cells[1][0]), Math.min(...cells.slice(0, 4).map(c => c[1])), 'y') : parkCarAt(Math.min(...cells.slice(0, 4).map(c => c[0])), Math.min(y, cells[1][1]), 'x'); } return; }
      if (pts.some(([x, y]) => get(x, y) !== GRASS || hAt[y * MW + x] || propAt[y * MW + x])) return;
      cells.push(...pts);
    }
    return;
  }
}
const OPPS = [1, 0, 3, 2];
function yardFence(H) {
  const s = frontSide(H), st = ri(0, 3);
  const back = s < 0 ? -1 : OPPS[s];
  let x0 = H.x - 2, x1 = H.x + H.w + 1, y0 = H.y - 2, y1 = H.y + H.h + 1;
  if (back === 0) y0 -= 3; if (back === 1) y1 += 3; if (back === 2) x0 -= 3; if (back === 3) x1 += 3;
  const gate = new Set();
  for (const d of H.doors) { const o = [[0, -1], [0, 1], [-1, 0], [1, 0]][d.s]; for (let k = 1; k < 7; k++) { const x = d.x + o[0] * k, y = d.y + o[1] * k; gate.add(y * MW + x); gate.add((y + (o[0] ? 1 : 0)) * MW + x + (o[1] ? 1 : 0)); } }
  const put = (x, y, ax) => {
    const i = y * MW + x; if (!inMap(x, y, 1) || !insideFence(x, y) || map[i] !== GRASS || hAt[i] || propAt[i] || furn[i] || gate.has(i)) return;
    if (D4.some(([ox, oy]) => { const t = get(x + ox, y + oy); return t === DOOR; })) return;
    addProp({type:'pfence', proc:true, ax, st, cx:x + .5, cy:y + .5, solid:true, r:ax === 'x' ? [x, y + .44, x + 1, y + .56] : [x + .44, y, x + .56, y + 1]}, [[x, y]]);
  };
  for (let x = x0; x <= x1; x++) { put(x, y0, 'x'); put(x, y1, 'x'); }
  for (let y = y0 + 1; y < y1; y++) { put(x0, y, 'y'); put(x1, y, 'y'); }
}
function yardGarden(H) {
  const s = frontSide(H), back = s < 0 ? ri(0, 3) : OPPS[s];
  const [gx, gy] = back === 0 ? [H.x + 1, H.y - 4] : back === 1 ? [H.x + 1, H.y + H.h + 2] : back === 2 ? [H.x - 4, H.y + 1] : [H.x + H.w + 2, H.y + 1];
  const W = back < 2 ? Math.min(5, H.w - 2) : 2, Hh = back < 2 ? 2 : Math.min(5, H.h - 2);
  for (let yy = gy; yy < gy + Hh; yy++) for (let xx = gx; xx < gx + W; xx++) { const i = yy * MW + xx; if (!inMap(xx, yy, 1) || map[i] !== GRASS || hAt[i] || propAt[i]) continue; addProp({type:'veg', proc:true, cx:xx + .5, cy:yy + .5, solid:false, r:[xx + .08, yy + .08, xx + .92, yy + .92], dug:false, v:ri(0, 2)}, [[xx, yy]]); }
  for (let k = 0; k < 2; k++) { const tx = gx + ri(-1, W), ty = gy + (back < 2 ? (back === 0 ? -2 : Hh + 1) : ri(0, Hh)), i = ty * MW + tx; if (inMap(tx, ty, 2) && map[i] === GRASS && !propAt[i] && !hAt[i] && !D8.some(([ox, oy]) => isWallish(get(tx + ox, ty + oy)))) set(tx, ty, TREE); }
}
// деревня и дачи тоже получают заборы и огороды

// ---- как рисуются забор двора и грядка ----
const PF_COL = [[132, 98, 64], [78, 112, 72], [74, 98, 134], [128, 132, 136]];
{
  PROPN.pfence = 'Забор'; PROPN.veg = 'Грядка';
}
// выкопать овощи
const VEG_LOOT = [['potato', 'potato', 'carrot'], ['carrot', 'cabbage', 'potato'], ['cabbage', 'potato', 'carrot']];
{ addActions(out => {
    if (P && !P.car) for (const p of propsNear(P.x, P.y)) if (p.type === 'veg' && !p.dug && Math.hypot(p.cx - P.x, p.cy - P.y) < 1.3) { out.push({kind:'veg', label:'Выкопать овощи', p, f:p}); break; }
});
  defAction('veg', {run:a => {
      $('actMenu').hidden = true; if (a.p.dug) return;
      const m = typeof monthNow === 'function' ? monthNow() : 9, ripe = m >= 7 && m <= 10;
      a.p.dug = true; SFX.rustle(); noise(P.x, P.y, 2);
      const n = ripe ? ri(1, 3) : (rng() < .4 ? 1 : 0), L = VEG_LOOT[a.p.v || 0].filter(id => ITEMS[id]);
      for (let k = 0; k < n && L.length; k++) { const it = mkItem(pick(L)); if (invFull()) { piles.push({type:'pile', x:P.x, y:P.y, cx:P.x, cy:P.y, items:[it]}); } else P.inv.push(it); }
      toast(n ? 'Выкопал: ' + n + ' шт. овощей' : ripe ? 'Пусто — кто-то успел раньше' : 'Не сезон: на грядке почти ничего');
      clearCaches(); updateHud();
}});
  defAction('veg', {name:a => 'Грядка'});
}

// ---- включение: новые игры строят города новым генератором ----
{ onStartNew(() => {
}, () => { world.gen = 4; world.townN = 320; }); }   // v73: 4 — тот же городок, но плотнее и с меньшим лесом   // v72: город крупнее — 320×320   // 3 — городок в духе Project Zomboid (74-county); 2 — сетка этого файла
DIST_FIELDS.push('x53v');
{ onSave(d => { d.x53 = {gen:world.gen || 1, n:world.townN || 256}; d.x53v = {dug:props.map((p, k) => p.type === 'veg' && p.dug ? k : -1).filter(k => k >= 0)};
}); }
{ onLoad((d) => { for (const k of (d && d.x53v && d.x53v.dug) || []) if (props[k] && props[k].type === 'veg') props[k].dug = true;
}, d => { world.gen = (d && d.x53 && d.x53.gen) || 1; world.townN = (d && d.x53 && d.x53.n) || 256; }); }
// ---- соседние дворы: два забора вплотную — один (v82) ----
// Каждый дом ставит забор вокруг своего двора сам, и между соседями выходили два параллельных забора через клетку.
// После генерации (без случайных чисел, 04-state) второй из такой пары убираем: type 'gone', номер объекта остаётся
// (сохранения ссылаются на объекты по номеру). На стыке и в калитках забор не трогаем — только параллельные пары.
function mergeFences() {
  for (let k = 0; k < props.length; k++) {
    const p = props[k]; if (p.type !== 'pfence') continue;
    const x = Math.floor(p.cx), y = Math.floor(p.cy);
    for (const d of [1, -1]) {
      const nx = p.ax === 'x' ? x : x + d, ny = p.ax === 'x' ? y + d : y; if (!inMap(nx, ny, 0)) continue;
      const j = propAt[ny * MW + nx] - 1, q = props[j];
      if (!q || j <= k || q.type !== 'pfence' || q.ax !== p.ax) continue;
      q.type = 'gone'; q.solid = false; propAt[ny * MW + nx] = 0;
    }
  }
}
