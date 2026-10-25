// ================= округ в духе Project Zomboid (world.gen = 3) =================
// Городок вытянут вдоль одной трассы: главная улица с магазинами и тротуарами, жилые кварталы по обе стороны,
// задние улицы, тупики на окраинах. За городом — заправка, склады за забором, фермы с пашней и пастбищем,
// лесополосы, грунтовки в лес к охотничьим домикам и озеру с рыбацким домиком.
// Так строится только городок (родной район и соседние городки); центр, деревня, лес, промзона — прежние генераторы.

// ---- грунт: лежит поверх травы (soil из 03-map), клетка остаётся травой для всей остальной игры ----
const SOILC = {1:'#77623f', 2:'#5c4830', 3:'#5c4830'};
const soilCol = i => SOILC[soil[i]] || MAPC[map[i]] || '#444';                // цвет клетки на карте и мини-карте
function soilPaint(x, y, k) {
  const i = y * MW + x;
  if (inMap(x, y, 1) && map[i] === GRASS && !hAt[i] && !propAt[i] && !furn[i] && (!soil[i] || k === 1 && soil[i] === 1)) soil[i] = k;
}
function soilRect(x0, y0, x1, y1, k) { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) soilPaint(x, y, k); }
// грунтовка из точки в точку: отрезки по 5–12 клеток то вдоль x, то вдоль y, шириной 2
function dirtTrack(x0, y0, x1, y1) {
  let x = x0, y = y0, horiz = rng() < .5;
  for (let g = 0; g < 80 && (x !== x1 || y !== y1); g++) {
    const dx = x1 - x, dy = y1 - y;
    if (!dx) horiz = false; else if (!dy) horiz = true;
    const d = horiz ? dx : dy, L = Math.sign(d) * Math.min(Math.abs(d), ri(5, 12));
    const nx = horiz ? x + L : x, ny = horiz ? y : y + L;
    soilRect(x, y, nx + 1, ny + 1, 1);
    x = nx; y = ny; horiz = !horiz;
  }
}
// ближайшая точка у обочины трассы (трассы — крест по EXIT_R)
function toHighway(x, y) {
  const H0 = EXIT_R, H1 = EXIT_R + RW - 1;
  const dx = Math.min(Math.abs(x - H0), Math.abs(x - H1)), dy = Math.min(Math.abs(y - H0), Math.abs(y - H1));
  return dx < dy ? [x < H0 ? H0 - 2 : H1 + 1, y] : [x, y < H0 ? H0 - 2 : H1 + 1];
}
// как рисуется грунт (вызывается из drawGroundRange поверх травы, в координатах клеток)
function drawSoil(x, y, k) {
  const ok = (ox, oy) => { const xx = x + ox, yy = y + oy; return xx >= 0 && yy >= 0 && xx < MW && yy < MH && soil[yy * MW + xx] === k; };
  groundT(0);
  if (k === 1) {                                                              // грунтовка: рваный край, камешки
    const e = (ox, oy, s) => ok(ox, oy) ? 0 : .06 + hash(x * 3 + ox * 7 + s, y * 5 + oy * 11) * .2;
    const x0 = x + e(-1, 0, 1), x1 = x + 1 - e(1, 0, 2), y0 = y + e(0, -1, 3), y1 = y + 1 - e(0, 1, 4);
    ctx.fillStyle = hash(x * 13 + 5, y * 7 + 11) < .5 ? '#6e5a3c' : '#745f3f'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = 'rgba(52,40,26,.45)';
    for (let q = 0; q < 3; q++) { const px = x0 + hash(x + q * 17, y * 3) * (x1 - x0 - .12), py = y0 + hash(x * 5, y + q * 23) * (y1 - y0 - .1); ctx.fillRect(px, py, .1, .08); }
    ctx.fillStyle = 'rgba(160,140,108,.5)';
    { const px = x0 + hash(x * 9 + 1, y * 2 + 7) * (x1 - x0 - .1), py = y0 + hash(x * 4 + 3, y * 9 + 5) * (y1 - y0 - .1); ctx.fillRect(px, py, .08, .06); }
  } else {                                                                    // пашня: борозды и гребни
    const along = k === 2;
    ctx.fillStyle = '#5a4630'; ctx.fillRect(x, y, 1, 1);
    for (const [o, c, w] of [[.12, '#46362a', .14], [.62, '#46362a', .14], [.36, '#735a3c', .1], [.86, '#735a3c', .1]]) {
      ctx.fillStyle = c; along ? ctx.fillRect(x, y + o, 1, w) : ctx.fillRect(x + o, y, w, 1);
    }
  }
  resetT();
}

// ---- городок вдоль трассы ----
function genCounty() {
  genReset(); cityMask = new Uint8Array(NT);
  const V = rng() < .5;                                                       // главная трасса вдоль y (true) или вдоль x
  const H0 = EXIT_R, H1 = EXIT_R + RW - 1;
  // в абстрактных координатах: a — вдоль главной трассы, c — поперёк (трасса на c = H0..H1)
  const XY = (a, c) => V ? [c, a] : [a, c];
  const carveAC = (a0, c0, a1, c1, t) => { const [x0, y0] = XY(a0, c0), [x1, y1] = XY(a1, c1); carve(x0, y0, x1, y1, t); };
  // сторона здания: к +c / −c / +a / −a → 0 верх, 1 низ, 2 лево, 3 право
  const face = (da, dc) => { const [dx, dy] = XY(da, dc); return dy < 0 ? 0 : dy > 0 ? 1 : dx < 0 ? 2 : 3; };

  // ---- река параллельно главной трассе (как в Riverside): с одной стороны от трассы, в 46–56 клетках; трасса-поперёк идёт по мосту
  const sgR = rng() < .5 ? -1 : 1, RD = ri(46, 56), ph = rng() * 6.28, ph2 = rng() * 6.28;
  const rc = a => (sgR < 0 ? H0 - RD : H1 + RD) + Math.round(4 * Math.sin(a / 23 + ph) + 2.5 * Math.sin(a / 9 + ph2));
  const rw = a => 4 + Math.round(1.4 * Math.sin(a / 17 + ph2));
  const bank = a => sgR < 0 ? rc(a) + rw(a) : rc(a) - rw(a);                  // ближний к городу берег
  for (let a = 0; a < MW; a++) for (let c = rc(a) - rw(a); c <= rc(a) + rw(a); c++) { const [x, y] = XY(a, c); set(x, y, WATER); }

  // ---- город: длинный и узкий вдоль трассы, поперечные улицы с разным шагом, задние улицы со сдвигом в каждом квартале
  const A0lim = Math.max(FEN + 14, EXIT_R - ri(56, 80)), A1lim = Math.min(MW - FEN - 18, EXIT_R + ri(56, 80));
  const cross = [EXIT_R];
  const gap = () => rng() < .35 ? ri(16, 19) : ri(24, 30);
  for (let a = EXIT_R - gap(); a >= A0lim; a -= gap()) cross.unshift(a);
  for (let a = EXIT_R + gap(); a <= A1lim; a += gap()) cross.push(a);
  const TC = EXIT_R, A0 = cross[0], A1 = cross[cross.length - 1];
  // колонка k — между cross[k] и cross[k+1]; по каждой стороне (0 — к −c, 1 — к +c) — свои задние улицы
  const sideSg = s => s ? 1 : -1, riverSide = sgR < 0 ? 0 : 1;
  const nearBank = (a0, a1) => { let m = 1e9; for (let a = a0; a <= a1; a++) m = Math.min(m, Math.abs(bank(a) - (sgR < 0 ? H0 : H1))); return m; };
  const cols = [];
  for (let k = 0; k + 1 < cross.length; k++) {
    const a0 = cross[k], a1 = cross[k + 1] + RW - 1, w = 1 - Math.min(1, Math.abs((a0 + a1) / 2 - TC) / ((A1 - A0) / 2 + 1));
    const col = {a0, a1, lines:[[], []]};
    for (const sd of [0, 1]) {
      let lvl = rng() < .3 + .55 * w ? 2 : 1;
      const g1 = ri(20, 26), g2 = ri(19, 23), room = sd === riverSide ? nearBank(a0, a1) : 1e9;
      if (lvl === 2 && g1 + RW + g2 + RW + 14 > room) lvl = 1;
      if (g1 + RW + 14 > room) lvl = 0;                                     // у самой реки — только дома у главной
      const L = [];
      if (lvl >= 1) L.push(sd ? H1 + 1 + g1 : H0 - RW - g1);
      if (lvl >= 2) L.push(sd ? L[0] + RW + g2 : L[0] - RW - g2);
      col.lines[sd] = L;
    }
    cols.push(col);
  }
  const streets = [];
  // задние улицы — отрезками по колонкам; поперечные — до самой дальней задней улицы соседних колонок
  for (const col of cols) for (const sd of [0, 1]) for (const c of col.lines[sd]) { carveAC(col.a0, c, col.a1, c + RW - 1, ROAD); streets.push({p:c, lo:col.a0, hi:col.a1, wd:RW, walk:true, vert:V}); }
  let cMin = H0 - 14, cMax = H1 + 14;
  cross.forEach((a, k) => {
    const adj = [cols[k - 1], cols[k]].filter(Boolean);
    const far0 = Math.min(H0, ...adj.flatMap(c => c.lines[0])), far1 = Math.max(H1, ...adj.flatMap(c => c.lines[1].map(v => v + RW - 1)));
    cMin = Math.min(cMin, far0 - 14); cMax = Math.max(cMax, far1 + 14);
    if (a !== EXIT_R && (far0 < H0 || far1 > H1)) carveAC(a, far0, a + RW - 1, far1, ROAD);
    streets.push({p:a, lo:a === EXIT_R ? far0 - 14 : far0, hi:a === EXIT_R ? far1 + 14 : far1, wd:RW, walk:true, vert:!V});
  });
  const BA0 = A0 - 3, BA1 = A1 + RW + 2, BC0 = cMin, BC1 = cMax;           // рамка города
  streets.unshift({p:H0, lo:BA0, hi:BA1, wd:RW, walk:true, vert:V, main:true});
  // трассы (мост через реку — сама трасса), затем тротуары вокруг всех улиц города
  highway(false);
  { const [x0, y0] = XY(BA0, BC0), [x1, y1] = XY(BA1, BC1);
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
      if (get(x, y) === GRASS && inMap(x, y, 1) && D4.some(([ox, oy]) => get(x + ox, y + oy) === ROAD)) set(x, y, WALK);
  }
  const RX = [...new Set(streets.filter(s => s.vert).map(s => s.p).concat([EXIT_R]))], RY = [...new Set(streets.filter(s => !s.vert).map(s => s.p).concat([EXIT_R]))];
  ROADSX = RX; ROADSY = RY; ROADS.length = 0; ROADS.push(...new Set([...RX, ...RY]));
  const box = (() => { const [x0, y0] = XY(BA0, BC0), [x1, y1] = XY(BA1, BC1); return [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)]; })();
  const inTown = (x, y, w, h) => x >= box[0] && y >= box[1] && x + w - 1 <= box[2] && y + h - 1 <= box[3];
  const nearTown = (x, y, w, h, m) => x + w - 1 >= box[0] - m && x <= box[2] + m && y + h - 1 >= box[1] - m && y <= box[3] + m;
  // кварталы: в каждой колонке — между главной и задними улицами, плюс внешний ряд за последней задней улицей
  // (у реки — дома окнами на воду) или, если задних улиц нет, ряд у главной
  const blocks = [];
  for (const col of cols) for (const sd of [0, 1]) {
    const a0 = col.a0 + RW + 1, a1 = col.a1 - RW - 1, L = col.lines[sd];
    if (a1 - a0 < 8) continue;
    const edges = [];                                                         // [c ближе к трассе, c дальше] — края травы
    let prev = sd ? H1 + 2 : H0 - 2;
    for (const c of L) { edges.push(sd ? [prev, c - 2] : [c + RW + 1, prev]); prev = sd ? c + RW + 1 : c - 2; }
    edges.push(sd ? [prev, prev + 12] : [prev - 12, prev]);                     // внешний ряд (у реки отсеется, если там вода)
    for (const [c0, c1] of edges) {
      if (c1 - c0 < 8) continue;
      const [x0, y0] = XY(a0, c0), [x1, y1] = XY(a1, c1), b = {x0:Math.min(x0, x1), y0:Math.min(y0, y1), x1:Math.max(x0, x1), y1:Math.max(y0, y1)};
      let g = 0, n = 0; for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) { n++; if (get(x, y) === GRASS) g++; }
      if (g > n * .85) blocks.push(b);
    }
  }
  const spot = (w, h, gap, L) => {                                            // место у улицы, здание лицом к ней
    for (let t = 0; t < 400; t++) {
      const s = pick(L), side = rng() < .5 ? -1 : 1, ln = s.vert ? h : w;
      if (s.hi - s.lo - ln < 4) continue;
      const a = ri(s.lo + 1, s.hi - ln - 1);
      const near = side < 0 ? s.p - 2 - gap - (s.vert ? w : h) : s.p + s.wd + 2 + gap;
      const x = s.vert ? near : a, y = s.vert ? a : near;
      if (!inTown(x, y, w, h) || !freeC(x, y, w, h, 1)) continue;
      return {x, y, s:s.vert ? (side < 0 ? 3 : 2) : (side < 0 ? 1 : 0)};
    }
    return null;
  };
  const OPP = [1, 0, 3, 2], sidesOf = s => [s, OPP[s], ...[0, 1, 2, 3].filter(k => k !== s && k !== OPP[s])];
  const mainSt = streets.filter(s => s.main), sideSt = streets.filter(s => !s.main);

  // общественные здания: очередь; главная улица заполняется ими при нарезке кварталов (ниже), остаток — где придётся
  const commQ = shuffle(['store', 'pharmacy', 'hardware', 'police']).concat(shuffle(['store', 'cafe', 'office']), shuffle(['school', 'clinic', 'cafe']).slice(0, ri(1, 2)));
  const putComm = (k, x, y, w, h, front) => {
    const Hs = bld(x, y, w, h, k, sidesOf(front));
    const mx = x + w / 2, my = y + h / 2;
    if (k === 'police') SPECIAL.push({x:mx, y:my, pi:10, n:4});
    if (k === 'pharmacy' || k === 'clinic') SPECIAL.push({x:mx, y:my, pi:11, n:k === 'clinic' ? 5 : 3});
    if (k === 'police' && Hs) for (let q = 0; q < 2; q++) { const s = streets.find(s => s.vert ? Math.abs(s.p - x) < 16 : Math.abs(s.p - y) < 16); if (!s) break; const a = Math.max(s.lo + 1, Math.min(s.hi - 3, (s.vert ? y : x) + ri(0, 6))); s.vert ? parkCarAt(s.p + (q ? RW - 1 : 0), a, 'y', {ci:2, police:true}) : parkCarAt(a, s.p + (q ? RW - 1 : 0), 'x', {ci:2, police:true}); }
    return Hs;
  };
  // кварталы режутся на участки: по ряду вдоль каждой длинной стороны. Сначала магазины и конторы — в ряды лицом
  // к главной улице, остаток очереди — в другие ряды, потом жилые дома во все свободные места
  const rowsAll = [];
  for (const b of shuffle(blocks)) {
    const W = b.x1 - b.x0 + 1, Hh = b.y1 - b.y0 + 1, alongX = !V, Lp = alongX ? W : Hh, Dq = alongX ? Hh : W;
    if (Lp < 10 || Dq < 9) continue;
    const at = (p, q) => alongX ? [b.x0 + p, b.y0 + q] : [b.x0 + q, b.y0 + p];
    const street = q => { const [x, y] = at(Lp >> 1, q); const t = get(x, y); return t === WALK || t === ROAD; };
    const onMain = q => { const [x, y] = at(Lp >> 1, q), c = V ? x : y; return c === H0 - 1 || c === H1 + 1; };
    const R = (q0, d, far, main) => rowsAll.push({at, alongX, Lp, q0, d, far, main, front:alongX ? (far ? 1 : 0) : (far ? 3 : 2)});
    if (Dq >= 19) {
      const m0 = onMain(-1), m1 = onMain(Dq), d0 = m0 ? 10 : Math.min(11, (Dq - 3) >> 1), d1 = m1 ? 10 : Math.min(11, Dq - 3 - d0);
      R(1, d0, 0, m0); R(Dq - 1 - d1, d1, 1, m1);
    } else { const back = !street(-1) && street(Dq), d = Math.min(12, Dq - 2); back ? R(Dq - 1 - d, d, 1, onMain(Dq)) : R(1, d, 0, onMain(-1)); }
  }
  const commRow = r => {                                                      // заполнить ряд зданиями из очереди, сколько влезет
    for (let p = 1; p < r.Lp - 6 && commQ.length;) {
      const k = commQ[0], [cw, ch] = CSIZE[k];
      if (ch > r.d || p + cw > r.Lp - 1) { if (commQ.length > 1 && commQ.slice(1).some(k2 => CSIZE[k2][1] <= r.d && p + CSIZE[k2][0] <= r.Lp - 1)) { commQ.push(commQ.shift()); continue; } break; }
      const [x, y] = r.at(p, r.far ? r.q0 + r.d - ch : r.q0), [w, h] = r.alongX ? [cw, ch] : [ch, cw];
      if (freeC(x, y, w, h, 1)) { commQ.shift(); putComm(k, x, y, w, h, r.front); p += cw + ri(1, 2); } else p += 2;
    }
  };
  const rowMid = r => { const [x, y] = r.at(r.Lp >> 1, r.q0); return Math.abs((V ? y : x) - TC); };
  for (const r of rowsAll.filter(r => r.main).sort((p, q) => rowMid(p) - rowMid(q))) commRow(r);   // центр города — магазины
  for (const r of rowsAll) if (!r.main && commQ.length) commRow(r);
  for (const r of rowsAll) for (let p = 1; p < r.Lp - 8;) {
    const wp = Math.min(ri(8, 10), r.Lp - 1 - p); if (wp < 8) break;
    const [x, y] = r.at(p, r.q0), [w, h] = r.alongX ? [wp, r.d] : [r.d, wp];
    if (rng() < .08 || !freeC(x, y, w, h, 1)) { p += 3; continue; }
    const H = bld(x, y, w, h, 'house', sidesOf(r.front)); pathFromDoor(H);
    p += wp + ri(1, 2);
  }
  for (const k of commQ.splice(0)) { const [w, h] = CSIZE[k], sp = spot(w, h, 0, streets); if (sp) putComm(k, sp.x, sp.y, w, h, sp.s); }
  // сквер с прудом
  if (rng() < .7) { const w = ri(14, 20), h = ri(12, 16), sp = spot(w, h, 0, sideSt); if (sp) {
    for (let yy = sp.y; yy < sp.y + h; yy++) for (let xx = sp.x; xx < sp.x + w; xx++) cityMask[yy * MW + xx] = 1;
    pond(sp.x + w / 2, sp.y + h / 2, 2.5 + rng() * 2, 2 + rng() * 1.5);
    for (let i = 0; i < w * h * .18; i++) { const xx = ri(sp.x, sp.x + w - 1), yy = ri(sp.y, sp.y + h - 1); if (get(xx, yy) === GRASS && !D8.some(([ox, oy]) => get(xx + ox, yy + oy) === WATER)) set(xx, yy, TREE); }
  } }
  // иногда многоэтажка на задней улице, если осталось место
  for (let k = 0, n = rng() < .4 ? 1 : 0; k < n; k++) { const nn = 3, sp = spot(6 * nn + 1, 14, 1, sideSt); if (sp) buildFlats(sp.x, sp.y, nn); }
  const homes = houses.filter(H => H.kind === 'house');
  for (const H of homes) if (rng() < .3) yardGarage(H);
  for (const H of homes) if (rng() < .5) yardFence(H);
  for (const H of homes) if (rng() < .35) yardGarden(H);
  // тупики-грунтовки с краю города: 1–3 дома на отшибе
  for (let n = 0, t = 0; n < ri(1, 3) && t < 60; t++) {
    const s = pick(sideSt.filter(s => s.vert !== V)); if (!s) break;
    const end = rng() < .5 ? s.lo : s.hi, dir = end === s.lo ? -1 : 1, len = ri(10, 16);
    const [x0, y0] = s.vert ? [s.p + 1, end + dir] : [end + dir, s.p + 1], [x1, y1] = s.vert ? [s.p + 2, end + dir * len] : [end + dir * len, s.p + 2];
    let ok = true; for (let y = Math.min(y0, y1); y <= Math.max(y0, y1) && ok; y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1) && ok; x++) if (get(x, y) !== GRASS || hAt[y * MW + x] || propAt[y * MW + x] || !insideFence(x, y)) ok = false;
    if (!ok) continue;
    soilRect(x0, y0, x1, y1, 1); n++;
    const w = 9, h = 8, side = rng() < .5 ? -1 : 1, ex = s.vert ? x1 : x1, ey = s.vert ? y1 : y1;
    const hx = s.vert ? (side < 0 ? x0 - w - 2 : x1 + 2) : ex - (dir > 0 ? w : 0) + (dir > 0 ? 0 : 1), hy = s.vert ? ey - (dir > 0 ? h : 0) + (dir > 0 ? 0 : 1) : (side < 0 ? y0 - h - 2 : y1 + 2);
    if (rectFree(hx, hy, w, h, 1)) { const H = bld(hx, hy, w, h, 'house'); if (H && rng() < .6) yardGarden(H); }
  }
  // фонари и машины на улицах города
  for (const s of streets) for (let k = s.lo + 2; k < s.hi - 1; k += 8) {
    if (s.vert) { const x = s.p - 1; if (get(x, k) === WALK && !propAt[k * MW + x]) addProp({type:'lamp', flick:rng() < .15, cx:x + .5 + .3, cy:k + .5, hx:1, hy:0, solid:true, r:[x + .7, k + .4, x + .9, k + .6]}, [[x, k]]); }
    else { const y = s.p - 1; if (get(k, y) === WALK && !propAt[y * MW + k]) addProp({type:'lamp', flick:rng() < .15, cx:k + .5, cy:y + .5 + .3, hx:0, hy:1, solid:true, r:[k + .4, y + .7, k + .6, y + .9]}, [[k, y]]); }
  }
  const crossing = (s, a) => (s.vert ? RY : RX).some(q => a >= q - 1 && a <= q + RW);
  for (let t = 0, n = 0; t < 900 && n < 70; t++) {
    const s = pick(streets), a = ri(s.lo, s.hi - 1), lane = s.p + (rng() < .5 ? 0 : RW - 1);
    if (crossing(s, a) || crossing(s, a + 1)) continue;
    if (s.vert ? parkCarAt(lane, a, 'y') : parkCarAt(a, lane, 'x')) n++;
  }
  // мертвецы толпятся на главной улице
  for (let k = 0; k < 5; k++) { const a = ri(A0, A1), c = rng() < .5 ? H0 - 1 : H1 + 1, [x, y] = XY(a, c); SPECIAL.push({x:x + .5, y:y + .5, pi:ri(0, 9), n:3}); }

  // ---- за городом ----
  const freeArea = (x, y, w, h, m) => {
    if (!inMap(x - m, y - m, FEN + 3) || !inMap(x + w + m - 1, y + h + m - 1, FEN + 3) || nearTown(x, y, w, h, 3)) return false;
    for (let yy = y - m; yy < y + h + m; yy++) for (let xx = x - m; xx < x + w + m; xx++) { const i = yy * MW + xx; if (map[i] !== GRASS || hAt[i] || propAt[i] || soil[i] || cityMask[i]) return false; }
    return true;
  };
  const claim = (x, y, w, h) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) cityMask[yy * MW + xx] = 1; };
  // участок: u — вдоль ближнего края (0..FU-1), v — вглубь (0 — ближний край); vd — куда растёт v: 0 +y, 1 −y, 2 +x, 3 −x
  const frame = (rx, ry, FU, FV, vd, mf) => {
    const ax = vd < 2;
    const L = (u, v) => { u = mf ? FU - 1 - u : u; return ax ? [rx + u, vd === 0 ? ry + v : ry + FV - 1 - v] : [vd === 2 ? rx + v : rx + FV - 1 - v, ry + u]; };
    const LR = (u, v, lu, lv) => { const [x0, y0] = L(u, v), [x1, y1] = L(u + lu - 1, v + lv - 1); return [Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) + 1, Math.abs(y1 - y0) + 1]; };
    const LS = (du, dv) => { const [x0, y0] = L(0, 0), [x1, y1] = L(du, dv), dx = x1 - x0, dy = y1 - y0; return dy < 0 ? 0 : dy > 0 ? 1 : dx < 0 ? 2 : 3; };
    return {rect:[rx, ry, ax ? FU : FV, ax ? FV : FU], L, LR, LS};
  };
  // участок у трассы (отступ off от обочины) или где-то в лесу, лицом к ближайшей трассе
  const hwFrame = (hd, sg, u0, FU, FV, off, mf) => hd === 'x' ? frame(u0, sg < 0 ? H0 - off - FV : H1 + 1 + off, FU, FV, sg < 0 ? 1 : 0, mf)
                                                             : frame(sg < 0 ? H0 - off - FV : H1 + 1 + off, u0, FU, FV, sg < 0 ? 3 : 2, mf);
  const findFrame = (FU, FV, off, m, pAdj, tries) => {
    for (let t = 0; t < tries; t++) {
      let F;
      if (rng() < pAdj) F = hwFrame(rng() < .5 ? 'x' : 'y', rng() < .5 ? -1 : 1, ri(FEN + 4, MW - FEN - 5 - FU), FU, FV, off, rng() < .5);
      else {                                                                  // в глубине: ближний край смотрит на ближайшую трассу
        const ax = rng() < .5, w = ax ? FU : FV, h = ax ? FV : FU, rx = ri(FEN + 4, MW - FEN - 5 - w), ry = ri(FEN + 4, MH - FEN - 5 - h);
        const cx = rx + w / 2, cy = ry + h / 2;
        F = frame(rx, ry, FU, FV, ax ? (cy < H0 ? 1 : 0) : (cx < H0 ? 3 : 2), rng() < .5);
      }
      if (freeArea(...F.rect, m)) { claim(...F.rect); return F; }
    }
    return null;
  };
  const driveway = F => {                                                     // грунтовка от ближнего края к трассе
    const [x0, y0] = F.L(1, -1), [x1, y1] = F.L(2, -1), sx = Math.min(x0, x1), sy = Math.min(y0, y1), [tx, ty] = toHighway(sx, sy);
    const hx = Math.abs(tx - sx) > Math.abs(ty - sy);
    hx ? soilRect(Math.min(sx, tx), sy, Math.max(sx, tx), sy + 1, 1) : soilRect(sx, Math.min(sy, ty), sx + 1, Math.max(sy, ty), 1);
    if ((hx ? ty !== sy && ty !== sy + 1 : tx !== sx && tx !== sx + 1)) dirtTrack(sx, sy, tx, ty);
  };
  const putPump = (x, y) => addProp({type:'pump', proc:true, cx:x + .5, cy:y + .5, solid:true, r:[x + .3, y + .32, x + .7, y + .68]}, [[x, y]]);
  // заправка: площадка с колонками у трассы, за ней здание
  { const F = findFrame(12, 11, 1, 1, 1, 300); if (F) {
    const [fx, fy, fw, fh] = F.LR(0, 0, 12, 4); carve(fx, fy, fx + fw - 1, fy + fh - 1, WALK);
    for (const u of [3, 8]) putPump(...F.L(u, 2));
    const [x, y, w, h] = F.LR(2, 5, 8, 6); bld(x, y, w, h, 'gas', [F.LS(0, -1)]);
    SPECIAL.push({x:x + w / 2, y:y + h / 2, pi:12, n:2});
  } }
  // склады: бетонный двор за забором, ворота и въезд к трассе
  { const FU = ri(22, 28), FV = ri(17, 20), F = findFrame(FU, FV, 4, 1, 1, 300); if (F) {
    const [x, y, w, h] = F.rect; carve(x, y, x + w - 1, y + h - 1, WALK);
    const nW = FU >= 26 && rng() < .5 ? 2 : 1, bl = Math.floor((FU - 4) / nW) - (nW - 1) * 2;
    for (let k = 0; k < nW; k++) {
      const [bx, by, bw, bh] = F.LR(2 + k * (bl + 2), FV - 11, bl, 9);
      carve(bx, by, bx + bw - 1, by + bh - 1, GRASS); bld(bx, by, bw, bh, 'warehouse', [F.LS(0, -1), F.LS(-1, 0), F.LS(1, 0)]);
      SPECIAL.push({x:bx + bw / 2, y:by + bh / 2, pi:12, n:2});
    }
    for (let k = 0; k < 10; k++) { const [bx, by] = F.L(ri(1, FU - 2), ri(1, FV - 13)); yardBox(bx, by, 'crate'); }
    { const [tx0, ty0] = F.L(ri(3, FU - 6), 3), [tx1, ty1] = F.L(0, 3), along = Math.abs(tx1 - tx0) > 0 ? 'x' : 'y', tx = along === 'x' ? Math.min(tx0, tx0 + (tx1 > tx0 ? 1 : -1)) : tx0, ty = along === 'y' ? Math.min(ty0, ty0 + (ty1 > ty0 ? 1 : -1)) : ty0;
      const c2 = along === 'x' ? [tx + 1, ty] : [tx, ty + 1];
      if (get(tx, ty) === WALK && get(...c2) === WALK && !propAt[ty * MW + tx] && !propAt[c2[1] * MW + c2[0]]) { set(tx, ty, ROAD); set(...c2, ROAD); if (!parkCarAt(tx, ty, along, {ci:5})) { set(tx, ty, WALK); set(...c2, WALK); } } }
    const gf = F.LS(0, -1), mid = F.L(FU >> 1, 0), gx = mid[0], gy = mid[1];
    fenceRun(x - 1, y - 1, x + w, y - 1, gf === 0 ? [[gx - 2, gx + 2]] : []); fenceRun(x - 1, y + h, x + w, y + h, gf === 1 ? [[gx - 2, gx + 2]] : []);
    fenceRun(x - 1, y, x - 1, y + h - 1, gf === 2 ? [[gy - 2, gy + 2]] : []); fenceRun(x + w, y, x + w, y + h - 1, gf === 3 ? [[gy - 2, gy + 2]] : []);
    { const [ax, ay, aw, ah] = F.LR((FU >> 1) - 2, -4, 5, 4); carve(ax, ay, ax + aw - 1, ay + ah - 1, WALK); }
  } }
  // фермы: дом и амбар рядом, двор, за ними пашня и пастбище, лесополоса; у трассы или в глубине, тогда к ним ведёт грунтовка
  for (let f = 0, nf = ri(2, 4); f < nf; f++) {
    let FU = ri(30, 34), FV = ri(20, 23), F = findFrame(FU, FV, 2, 2, .5, 400);
    if (!F) { FU = 30; FV = 19; F = findFrame(FU, FV, 2, 1, .5, 600); }
    if (!F) break;
    const {L, LR, LS} = F;
    { const [x, y, w, h] = LR(4, 1, 10, 9); bld(x, y, w, h, 'house', [LS(0, 1), LS(0, -1)]); }
    { const [x, y, w, h] = LR(15, 1, 14, 9); bld(x, y, w, h, 'farm', [LS(0, 1), LS(1, 0)]); SPECIAL.push({x:x + w / 2, y:y + h / 2, pi:ri(0, 9), n:2}); }
    { const [x0, y0] = L(1, 0), [x1, y1] = L(2, FV - 2); soilRect(x0, y0, x1, y1, 1); driveway(F); }   // въезд вдоль участка и грунтовка к трассе
    { const [x0, y0] = L(3, 10), [x1, y1] = L(FU - 2, 11); soilRect(x0, y0, x1, y1, 1); }               // двор перед домом и амбаром
    for (const u of [17, 20, 23]) yardBox(...L(u, 11), 'crate');
    const mid = 4 + ((FU - 6) >> 1), pasture = rng() < .5;
    [[4, mid - 4], [mid + 1, FU - 2 - mid]].forEach(([u, lu], k) => {
      const lv = FV - 15; if (lu < 5 || lv < 4) return;
      const [x, y, w, h] = LR(u, 13, lu, lv);
      if (k === 1 && pasture) {                                               // пастбище за изгородью, калитка со двора
        const gs = LS(0, -1), g = gs < 2 ? x + (w >> 1) : y + (h >> 1);
        fenceRun(x - 1, y - 1, x + w, y - 1, gs === 0 ? [[g - 1, g + 1]] : []); fenceRun(x - 1, y + h, x + w, y + h, gs === 1 ? [[g - 1, g + 1]] : []);
        fenceRun(x - 1, y, x - 1, y + h - 1, gs === 2 ? [[g - 1, g + 1]] : []); fenceRun(x + w, y, x + w, y + h - 1, gs === 3 ? [[g - 1, g + 1]] : []);
        return;
      }
      const kk = rng() < .5 ? 2 : 3; soilRect(x, y, x + w - 1, y + h - 1, kk);
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {   // кусты урожая вдоль борозд, редко — их можно выкопать
        const row = kk === 2 ? yy - y : xx - x, col = kk === 2 ? xx - x : yy - y;
        if (row % 3 === 1 && col % 3 === 0 && rng() < .55) addProp({type:'veg', proc:true, cx:xx + .5, cy:yy + .5, solid:false, r:[xx + .08, yy + .08, xx + .92, yy + .92], dug:false, v:ri(0, 2)}, [[xx, yy]]);
      }
    });
    for (let u = -1; u <= FU; u++) { const [x, y] = L(u, FV + 1); if (inMap(x, y, FEN + 2) && get(x, y) === GRASS && !propAt[y * MW + x] && !soil[y * MW + x] && rng() < .85) set(x, y, TREE); }   // лесополоса
  }
  // дома вдоль трасс за городом: город «растекается» по дороге
  for (let n = 0, nn = ri(7, 11), t = 0; n < nn && t < 400; t++) {
    const FU = ri(9, 11), FV = ri(8, 9), F = findFrame(FU, FV, 3, 2, 1, 1); if (!F) continue;
    const [x, y, w, h] = F.rect, H = bld(x, y, w, h, 'house', [F.LS(0, -1), F.LS(0, 1)]); if (!H) continue;
    pathFromDoor(H); n++;
    if (rng() < .5) yardFence(H); if (rng() < .5) yardGarden(H); if (rng() < .3) yardGarage(H);
  }
  // озеро с рыбацким домиком и грунтовкой
  for (let t = 0; t < 120; t++) {
    const rx = 7 + rng() * 5, ry = 5 + rng() * 4, cx = ri(FEN + 16, MW - FEN - 17), cy = ri(FEN + 14, MH - FEN - 15);
    const x0 = Math.floor(cx - rx) - 4, y0 = Math.floor(cy - ry) - 4, w = Math.ceil(rx * 2) + 8, h = Math.ceil(ry * 2) + 8;
    if (!freeArea(x0, y0, w, h, 2)) continue;
    pond(cx, cy, rx, ry); claim(x0, y0, w, h);
    const sx = Math.round(cx + (rng() < .5 ? -1 : 1) * (rx + 2)) - 2, sy = Math.round(cy) - 2;
    if (rectFree(sx, sy, 5, 4, 0)) { bld(sx, sy, 5, 4, 'shed'); const [tx, ty] = toHighway(sx + 2, sy + 4); dirtTrack(sx + 2, sy + 4, tx, ty); }
    break;
  }
  // охотничьи домики в лесу, к двум из них — грунтовка
  for (let n = 0, t = 0; n < 4 && t < 400; t++) {
    const x = ri(FEN + 4, MW - FEN - 10), y = ri(FEN + 4, MH - FEN - 10);
    if (!freeArea(x, y, 5, 4, 4)) continue;
    bld(x, y, 5, 4, 'shed'); n++;
    if (n <= 2) { const [tx, ty] = toHighway(x + 2, y + 4); dirtTrack(x + 2, y + 5, tx, ty); }
  }
  highwayCars(8);

  // карантин: блокпосты на трассах и забор
  for (const side of ['w', 'e', 'n', 's']) checkpoint(side);
  const F2 = MW - 1 - FEN;
  for (let v = FEN; v <= F2; v++) {
    for (const x of [FEN, F2]) if (get(x, v) !== ROAD && get(x, v) !== WATER && !propAt[v * MW + x]) { if (get(x, v) === TREE) set(x, v, GRASS); addProp({type:'fence', proc:true, ax:'y', cx:x + .5, cy:v + .5, solid:true, r:[x + .42, v, x + .58, v + 1], sign:(v % 9) === 4}, [[x, v]]); }
    for (const y of [FEN, F2]) if (get(v, y) !== ROAD && get(v, y) !== WATER && !propAt[y * MW + v]) { if (get(v, y) === TREE) set(v, y, GRASS); addProp({type:'fence', proc:true, ax:'x', cx:v + .5, cy:y + .5, solid:true, r:[v, y + .42, v + 1, y + .58], sign:(v % 9) === 4}, [[v, y]]); }
  }
  const nearCP = (x, y) => (Math.abs(x - EXIT_R - 2) < 10 && (y < FEN + 10 || y > MH - FEN - 11)) || (Math.abs(y - EXIT_R - 2) < 10 && (x < FEN + 10 || x > MW - FEN - 11));
  genFinish({tree:(x, y, n) => {
    if (nearCP(x, y) || cityMask[y * MW + x]) return 0;
    if (x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3]) return .02;
    return insideFence(x, y) ? .15 + .22 * n : .36 + .2 * n;
  }, bush:.03, bins:.018, hideouts:3});
  cityMask = null; world.nofence = false;
}
