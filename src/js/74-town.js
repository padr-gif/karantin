// ================= городок по плану (world.gen = 5) =================
// Не сетка одинаковых квадратов, а спланированный городок вдоль трассы:
//  • поперёк трассы — две параллельные улицы с каждой стороны (d = 36 и 74 клетки от трассы), поперечные улицы с шагом
//    ~38 клеток в центре и ~50 на окраинах — кварталы длинные;
//  • квартал — два ряда участков спина к спине: у каждого участка граница (общий забор с соседом, общая задняя межа),
//    дом фасадом к улице с одинаковым отступом, дорожка от двери, иногда гараж с подъездом, огород и деревья во дворе;
//  • центр — у перекрёстка трасс: площадь с фонтаном, полицией и администрацией; магазины, аптека, кафе, клиника
//    сплошным фасадом вдоль главной улицы, за ними общая парковка с въездом с поперечных улиц, дальше — жилой ряд;
//  • школа со стадионом, микрорайон из панелек с парковкой и двором, парк с прудом, набережная у реки;
//  • за рекой — дачный посёлок, у трасс — заправка, склады, гаражный кооператив; дальше фермы, озеро, охотничьи домики.
// Координаты внутри: a — вдоль главной трассы, sd — сторона (−1/+1), d — клеток от трассы вглубь стороны.
// Старые сохранения (gen ≤ 4) строятся прежним генератором (74-county).

const T5 = {RIV:88};                                                          // середина реки (d клеток от трассы)

function genTown5() {
  genReset(); cityMask = new Uint8Array(NT);
  const V = rng() < .5, H0 = EXIT_R, H1 = EXIT_R + RW - 1, sgR = rng() < .5 ? -1 : 1, sgL = -sgR;
  const {RIV} = T5;
  const cc = (sd, d) => sd < 0 ? H0 - d : H1 + d;
  const XY = (a, c) => V ? [c, a] : [a, c];
  const AD = (a, sd, d) => XY(a, cc(sd, d));
  const rectAD = (a0, a1, sd, d0, d1) => { const [x0, y0] = AD(a0, sd, d0), [x1, y1] = AD(a1, sd, d1); return [Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) + 1, Math.abs(y1 - y0) + 1]; };
  const fillAD = (a0, a1, sd, d0, d1, t) => { const [x, y, w, h] = rectAD(a0, a1, sd, d0, d1); carve(x, y, x + w - 1, y + h - 1, t); };
  const maskAD = (a0, a1, sd, d0, d1) => { const [x, y, w, h] = rectAD(a0, a1, sd, d0, d1); for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) cityMask[yy * MW + xx] = 1; };
  const getAD = (a, sd, d) => get(...AD(a, sd, d));
  const faceV = (dx, dy) => dy < 0 ? 0 : dy > 0 ? 1 : dx < 0 ? 2 : 3;
  const faceD = (sd, out) => V ? faceV(sd * out, 0) : faceV(0, sd * out);   // out −1 — к трассе, +1 — от неё
  const faceA = dir => V ? faceV(0, dir) : faceV(dir, 0);
  const AX = V ? 'y' : 'x', CX = V ? 'x' : 'y';                              // оси вдоль a и поперёк
  const OPP = [1, 0, 3, 2], sidesOf = s => [s, OPP[s], ...[0, 1, 2, 3].filter(k => k !== s && k !== OPP[s])];
  const bldF = (x, y, w, h, kind, front) => {
    const n = houses.length; buildHouse(x, y, w, h, kind, {front, sides:sidesOf(front)});
    const H = houses[n]; if (H && BLOOK[kind]) Object.assign(H, BLOOK[kind]); return H;
  };
  const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  // ---- река: петляет параллельно главной трассе; где подходит близко — у квартала нет задней улицы ----
  const ph = rng() * 6.28, ph2 = rng() * 6.28;
  const rc = a => RIV + Math.round(6 * Math.sin(a / 37 + ph) + 2.5 * Math.sin(a / 13 + ph2)), rw = a => 4 + Math.round(1.3 * Math.sin(a / 17 + ph2));
  for (let a = 0; a < MW; a++) for (let d = rc(a) - rw(a); d <= rc(a) + rw(a); d++) { const [x, y] = AD(a, sgR, d); set(x, y, WATER); }
  const nearBank = (a0, a1) => { let m = 1e9; for (let a = a0; a <= a1; a++) m = Math.min(m, rc(a) - rw(a)); return m; };
  const farBank = (a0, a1) => { let m = 0; for (let a = a0; a <= a1; a++) m = Math.max(m, rc(a) + rw(a)); return m; };

  // ---- улицы: поперечные с неровным шагом; у каждого квартала свои отступы параллельных улиц (s1, s2),
  //      поэтому они идут со сдвигом и упираются в поперечные Т-образно; задней улицы бывает нет — край города рваный ----
  const cross = [EXIT_R];
  for (let a = EXIT_R, k = 0; ; k++) { a -= k ? ri(30, 50) : ri(36, 42); if (a < FEN + 26) break; cross.unshift(a); }
  for (let a = EXIT_R, k = 0; ; k++) { a += k ? ri(30, 50) : ri(36, 42); if (a + RW > MW - FEN - 30) break; cross.push(a); }
  const A0 = cross[0], A1 = cross[cross.length - 1] + RW - 1, ci = cross.indexOf(EXIT_R);
  const cols = [];
  for (let k = 0; k + 1 < cross.length; k++) {
    const col = {k, a0:cross[k], a1:cross[k + 1] + RW - 1, ia0:cross[k] + RW + 1, ia1:cross[k + 1] - 2, mid:(cross[k] + cross[k + 1] + RW) / 2,
      core:k === ci || k === ci - 1, edge:k === 0 || k === cross.length - 2, B:{}};
    for (const sd of [-1, 1]) {
      const s1 = col.core ? ri(36, 40) : ri(30, 43);
      let s2 = s1 + RW + ri(29, 38);
      if (!col.core && rng() > (col.edge ? .45 : .8)) s2 = 0;
      const nb = sd === sgR ? nearBank(col.a0 - 2, col.a1 + 2) : 1e9;
      if (s2 && s2 + RW + 3 > nb) s2 = 0;
      const b1lo = s1 + RW + 1;
      let b1hi = s2 ? s2 - 2 : sd === sgR ? Math.min(nb - 3, b1lo + ri(16, 24)) : b1lo + ri(15, 24);
      if (b1hi - b1lo < 13) b1hi = 0;
      col.B[sd] = {s1, s2, b1lo, b1hi, nb};
    }
    cols.push(col);
  }
  // поперечная улица иногда обрывается: m1 — не идёт дальше первой улицы (сливаются дальние кварталы),
  // m0 — начинается только от первой улицы (сливаются кварталы у трассы). Слитые кварталы — одной глубины
  for (let k = 1; k < cols.length; k++) for (const sd of [-1, 1]) {
    const P = cols[k - 1], C = cols[k]; if (P.core || C.core) continue;
    const r = rng();
    if (r < .35 && P.B[sd].b1hi) { C.B[sd] = Object.assign({}, P.B[sd], {nb:Math.min(P.B[sd].nb, C.B[sd].nb)}); C.B[sd].m1 = true; }
    else if (r < .55) { C.B[sd] = Object.assign({}, P.B[sd], {nb:Math.min(P.B[sd].nb, C.B[sd].nb)}); C.B[sd].m0 = true; }
    const B = C.B[sd];
    if (sd === sgR && B.s2 && B.s2 + RW + 3 > B.nb) { B.s2 = 0; B.b1hi = Math.min(B.nb - 3, B.b1lo + 20); if (B.b1hi - B.b1lo < 13) B.b1hi = 0; P.B[sd].s2 = 0; P.B[sd].b1hi = B.b1hi; }
  }
  const streets = [];                                                        // в координатах карты: p — первая клетка проезжей части, lo..hi — вдоль
  const street = (alongA, p, lo, hi, main) => streets.push({p, lo, hi, wd:RW, vert:alongA === V, main});
  const pmin = (sd, d) => Math.min(cc(sd, d), cc(sd, d + RW - 1));
  let dTop = {[-1]:0, [1]:0};
  for (const col of cols) for (const sd of [-1, 1]) for (const d of [col.B[sd].s1, col.B[sd].s2]) if (d) {
    fillAD(col.a0, col.a1, sd, d, d + RW - 1, ROAD); street(true, pmin(sd, d), col.a0, col.a1);
    dTop[sd] = Math.max(dTop[sd], d + RW - 1);
  }
  cross.forEach((a, k) => {
    if (a === EXIT_R) { street(false, a, Math.min(cc(-1, dTop[-1]), cc(1, dTop[1])), Math.max(cc(-1, dTop[-1]), cc(1, dTop[1]))); return; }
    for (const sd of [-1, 1]) {
      const B = cols[k] && cols[k].B[sd];
      let d0 = 0, dm = Math.max(...[cols[k - 1], cols[k]].filter(Boolean).map(c => (c.B[sd].s2 || c.B[sd].s1) + RW - 1));
      if (B && B.m1) dm = B.s1 + RW - 1;
      if (B && B.m0) d0 = B.s1;
      if (dm < d0) continue;
      fillAD(a, a + RW - 1, sd, d0, dm, ROAD); street(false, a, Math.min(cc(sd, d0), cc(sd, dm)), Math.max(cc(sd, d0), cc(sd, dm)));
    }
  });
  street(true, H0, A0 - 1, A1 + 1, true);
  highway(false);
  // тротуары вокруг всех улиц города
  { const [bx, by, bw, bh] = rectAD(A0 - 1, A1 + 1, -1, dTop[-1] + 1, dTop[-1] + 1), [cx, cy, cw, ch] = rectAD(A0 - 1, A1 + 1, 1, dTop[1] + 1, dTop[1] + 1);
    const x0 = Math.min(bx, cx), y0 = Math.min(by, cy), x1 = Math.max(bx + bw - 1, cx + cw - 1), y1 = Math.max(by + bh - 1, cy + ch - 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++)
      if (get(x, y) === GRASS && inMap(x, y, 1) && D4.some(([ox, oy]) => get(x + ox, y + oy) === ROAD)) set(x, y, WALK);
  }
  const RX = [...new Set(streets.filter(s => s.vert).map(s => s.p).concat([EXIT_R]))], RY = [...new Set(streets.filter(s => !s.vert).map(s => s.p).concat([EXIT_R]))];
  ROADSX = RX; ROADSY = RY; ROADS.length = 0; ROADS.push(...new Set([...RX, ...RY]));
  // рамка города (для загородной части и леса): по суше — до конца частного сектора, у реки — до воды
  const box = (() => { const [x0, y0, w0, h0] = rectAD(A0 - 3, A1 + 3, sgL, 0, dTop[sgL] + 24), [x1, y1, w1, h1] = rectAD(A0 - 3, A1 + 3, sgR, 0, Math.max(dTop[sgR] + 4, ...cols.map(c => c.B[sgR].b1hi + 2)));
    return [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0 + w0, x1 + w1) - 1, Math.max(y0 + h0, y1 + h1) - 1]; })();
  const nearTown = (x, y, w, h, m) => x + w - 1 >= box[0] - m && x <= box[2] + m && y + h - 1 >= box[1] - m && y <= box[3] + m;

  // ---- мелочи: дорожка от двери, подъезд от ворот гаража, забор участка, деревья ----
  const pathOut = (dr, len) => {                                             // от двери по прямой до тротуара или дороги
    const o = DIRS[dr.s], cells = [];
    for (let k = 1; k < (len || 16); k++) {
      const x = dr.x + o[0] * k, y = dr.y + o[1] * k, t = get(x, y), i = y * MW + x;
      if (t === ROAD || t === WALK || soil[i] === 1) { for (const [cx, cy] of cells) set(cx, cy, WALK); return true; }   // до тротуара, дороги или грунтовки
      if (t !== GRASS || hAt[i] || propAt[i] || furn[i] || soil[i]) return false;
      cells.push([x, y]);
    }
    return false;
  };
  const drive = (G, car) => {                                                // подъезд от ворот гаража до улицы; машина у ворот
    if (!G || !G.doors.length) return;
    const dr = G.doors[0], o = DIRS[dr.s], cells = [], ax = dr.s < 2;
    for (let k = 1; k < 14; k++) {
      const pts = [[dr.x + o[0] * k, dr.y + o[1] * k], ax ? [dr.x + 1 + o[0] * k, dr.y + o[1] * k] : [dr.x + o[0] * k, dr.y + 1 + o[1] * k]];
      if (pts.some(([x, y]) => get(x, y) === ROAD || get(x, y) === WALK)) {
        for (const [x, y] of cells) set(x, y, ROAD);
        if (car && cells.length >= 6) { const xs = cells.slice(0, 4).map(c => c[0]), ys = cells.slice(0, 4).map(c => c[1]); ax ? parkCarAt(Math.min(...xs), Math.min(...ys), 'y') : parkCarAt(Math.min(...xs), Math.min(...ys), 'x'); }
        return;
      }
      if (pts.some(([x, y]) => get(x, y) !== GRASS || hAt[y * MW + x] || propAt[y * MW + x])) return;
      cells.push(...pts);
    }
  };
  const putPF = (x, y, ax, st) => {                                          // забор участка (как у yardFence), не у дверей и не на дорожках
    const i = y * MW + x; if (!inMap(x, y, 1) || !insideFence(x, y) || map[i] !== GRASS || hAt[i] || propAt[i] || furn[i] || soil[i]) return;
    if (D4.some(([ox, oy]) => get(x + ox, y + oy) === DOOR)) return;
    addProp({type:'pfence', proc:true, ax, st, cx:x + .5, cy:y + .5, solid:true, r:ax === 'x' ? [x, y + .44, x + 1, y + .56] : [x + .44, y, x + .56, y + 1]}, [[x, y]]);
  };
  const treeOK = (x, y) => { const i = y * MW + x; return inMap(x, y, 2) && map[i] === GRASS && !propAt[i] && !hAt[i] && !furn[i] && !soil[i] && !D8.some(([ox, oy]) => { const t = get(x + ox, y + oy); return isWallish(t) || t === DOOR; }) && !D4.some(([ox, oy]) => { const t = get(x + ox, y + oy); return t === ROAD; }); };
  const plant = (x, y) => { if (treeOK(x, y)) { set(x, y, TREE); return true; } return false; };
  const veg = (x, y) => { const i = y * MW + x; if (!inMap(x, y, 2) || map[i] !== GRASS || hAt[i] || propAt[i] || furn[i] || soil[i]) return; addProp({type:'veg', proc:true, cx:x + .5, cy:y + .5, solid:false, r:[x + .08, y + .08, x + .92, y + .92], dug:false, v:ri(0, 2)}, [[x, y]]); };

  // ---- ряд участков вдоль улицы ----
  // a: ia0..ia1 (крайние клетки — межи), d: dF (клетка у тротуара) .. dB (задняя межа). Дома — фасадом к улице.
  const lotRow = (ia0, ia1, sd, dF, dB, o) => {
    o = o || {};
    const s = Math.sign(dB - dF), depth = Math.abs(dB - dF) + 1, D = k => dF + s * k, front = faceD(sd, -s), lots = [];
    // ряд ровный: участки одной ширины, все дома на одной линии с одинаковым отступом и глубиной, дом посередине участка
    const SET = o.set || 3, L = ia1 - ia0, n = Math.max(1, Math.round(L / (o.lw || ri(14, 17))));
    const dd = Math.min(ri(8, o.dmax || 10), depth - SET - 3);
    if (L < 11 || dd < 8) return lots;
    for (let q = 0; q < n; q++) {
      const a = ia0 + Math.round(q * L / n), b = ia0 + Math.round((q + 1) * L / n), lw = b - a - 1;
      if (lw < 10) continue;
      const gar = rng() < (o.gar != null ? o.gar : .3) && depth >= SET + 10 && lw - 2 >= 8 + 6;
      const hw = Math.min(ri(8, 11), lw - 2 - (gar ? 6 : 0)), gl = gar && rng() < .5, off = a + 1 + ((lw - hw - (gar ? 6 : 0)) >> 1), h0 = off + (gl ? 6 : 0);
      const [hx, hy, hwx, hhy] = rectAD(h0, h0 + hw - 1, sd, D(SET), D(SET + dd - 1));
      const H = bldF(hx, hy, hwx, hhy, 'house', front); let G = null;
      if (H) {
        pathOut(H.doors[0]);
        if (gar) { const g0 = gl ? h0 - 6 : h0 + hw + 1, [gx, gy, gw, gh] = rectAD(g0, g0 + 4, sd, D(SET + 2), D(SET + 7)); G = bldF(gx, gy, gw, gh, 'garage', front); drive(G, rng() < .3); }
      }
      lots.push({a, b, H, G});
    }
    // заборы, огороды, деревья
    for (const L of lots) {
      if (!L.H) continue;
      const st = ri(0, 3), A0b = L.a, A1b = L.b;
      if (rng() < (o.fence != null ? o.fence : .6)) {
        for (let aa = A0b; aa <= A1b; aa++) { putPF(...AD(aa, sd, D(0)), AX, st); putPF(...AD(aa, sd, dB), AX, st); }
        for (let k = 1; k < depth - 1; k++) { putPF(...AD(A0b, sd, D(k)), CX, st); putPF(...AD(A1b, sd, D(k)), CX, st); }
      }
      if (rng() < (o.garden != null ? o.garden : .45)) { const n = o.rows || 2; for (let k = depth - 1 - n; k < depth - 1; k++) for (let aa = A0b + 2; aa <= A1b - 2; aa++) veg(...AD(aa, sd, D(k))); }
      if (rng() < .5) plant(...AD(A1b - 2, sd, D(depth - 2 - (o.rows || 2))));      // яблоня в дальнем углу двора
      if (rng() < .5) plant(...AD(A0b + 1, sd, D(1)));                           // дерево у калитки — всегда в одном углу
    }
    return lots;
  };

  // ---- кварталы ----
  const byCenter = cols.slice().sort((p, q) => Math.abs(p.mid - EXIT_R) - Math.abs(q.mid - EXIT_R));
  const near0 = cols.filter(c => c.core);                                       // две колонки у перекрёстка трасс — центр
  const used = new Set(), key = (c, sd, band) => c.k + ':' + sd + ':' + band;

  // площадь: у перекрёстка, со стороны суши — фонтан, деревья, полиция и администрация фасадами на площадь
  { const c = near0[0], sd = sgL, {ia0, ia1} = c; used.add(key(c, sd, 0));
    fillAD(ia0, ia1, sd, 2, 21, WALK); maskAD(ia0, ia1, sd, 2, 21);
    const am = (ia0 + ia1) >> 1;
    fillAD(am - 1, am + 1, sd, 10, 12, WATER);
    for (let a = ia0 + 2; a <= ia1 - 2; a += 5) for (const d of [4, 18]) { const [x, y] = AD(a, sd, d); if (Math.abs(a - am) > 3) set(x, y, TREE); }
    const put = (kind, a0) => { const [cw, ch] = CSIZE[kind], [x, y, w, h] = rectAD(a0, a0 + cw - 1, sd, 22, 22 + ch - 1); const H = bldF(x, y, w, h, kind, faceD(sd, -1)); if (H) SPECIAL.push({x:x + w / 2, y:y + h / 2, pi:kind === 'police' ? 10 : ri(0, 9), n:kind === 'police' ? 4 : 2}); return H; };
    const pl = rng() < .5, wP = CSIZE.police[0], wO = CSIZE.office[0], gap = Math.max(2, (ia1 - ia0 + 1 - wP - wO) / 3 | 0);
    put(pl ? 'police' : 'office', ia0 + gap); put(pl ? 'office' : 'police', ia1 - gap - (pl ? wO : wP) + 1);
    for (let q = 0; q < 1; q++) { const lane = sd < 0 ? H0 : H1, a = ia0 + 2 + q * 6; V ? parkCarAt(lane, a, 'y', {ci:2, police:true}) : parkCarAt(a, lane, 'x', {ci:2, police:true}); }
    SPECIAL.push({x:AD(am, sd, 8)[0] + .5, y:AD(am, sd, 8)[1] + .5, pi:ri(0, 9), n:4});
  }

  // главная улица: магазины сплошным фасадом, за ними парковка, дальше жилой ряд к первой улице
  const commQ = shuffle(['store', 'pharmacy', 'hardware', 'cafe']).concat(shuffle(['store', 'clinic', 'cafe', 'office']));
  const commBlock = (c, sd) => {
    const {ia0, ia1} = c; used.add(key(c, sd, 0));
    fillAD(ia0, ia1, sd, 2, 2, WALK);
    let p = ia0 + 1;
    while (commQ.length && p < ia1 - 6) {
      let qi = commQ.findIndex(k => p + CSIZE[k][0] - 1 <= ia1 - 1); if (qi < 0) break;
      const k = commQ.splice(qi, 1)[0], [cw, ch] = CSIZE[k], [x, y, w, h] = rectAD(p, p + cw - 1, sd, 3, 3 + ch - 1);
      const H = bldF(x, y, w, h, k, faceD(sd, -1));
      if (H && (k === 'pharmacy' || k === 'clinic')) SPECIAL.push({x:x + w / 2, y:y + h / 2, pi:11, n:k === 'clinic' ? 5 : 3});
      if (H && k === 'store') SPECIAL.push({x:x + w / 2, y:y + h / 2, pi:ri(0, 9), n:2});
      p += cw + 1;
    }
    // парковка: асфальт с въездами с обеих поперечных улиц, машины вдоль
    fillAD(ia0 - 1, ia1 + 1, sd, 14, 19, ROAD); maskAD(ia0, ia1, sd, 13, 20);
    for (const d of [14, 18]) for (let a = ia0 + 1; a < ia1 - 2; a += 5) if (rng() < .18) { const [x, y] = AD(a, sd, d), [x2, y2] = AD(a, sd, sd > 0 ? d : d + 1); V ? parkCarAt(Math.min(x, x2), y, 'y') : parkCarAt(x, Math.min(y, y2), 'x'); }
    lotRow(ia0, ia1, sd, c.B[sd].s1 - 2, 21, {dmax:9, gar:0, garden:.2, rows:1});
  };
  for (const c of byCenter) for (const sd of [sgL, sgR]) if (commQ.length && !used.has(key(c, sd, 0))) commBlock(c, sd);

  // школа со стадионом: за центром, со стороны суши
  const rest = cols.filter(c => !near0.includes(c)).sort((p, q) => Math.abs(p.mid - EXIT_R) - Math.abs(q.mid - EXIT_R));
  const merged = (c, sd) => c.B[sd].m0 || c.B[sd].m1 || (cols[c.k + 1] && (cols[c.k + 1].B[sd].m0 || cols[c.k + 1].B[sd].m1));
  const deep = (c, sd) => c.B[sd].s2 && c.B[sd].b1hi - c.B[sd].b1lo >= 28 && !used.has(key(c, sd, 1)) && !merged(c, sd);
  { const c = rest.find(c => deep(c, sgL)) || near0.find(c => deep(c, sgL)); if (c) { const sd = sgL; used.add(key(c, sd, 1));
    const {ia0, ia1} = c, {s1:S1, s2:S2} = c.B[sd], [cw, ch] = CSIZE.school, s0 = ia0 + 2;
    fillAD(ia0, ia1, sd, S1 + RW + 1, S1 + RW + 3, WALK);                   // школьный двор у улицы
    const [x, y, w, h] = rectAD(s0, s0 + cw - 1, sd, S1 + RW + 4, S1 + RW + 3 + ch); const Sc = bldF(x, y, w, h, 'school', faceD(sd, -1));
    if (Sc) SPECIAL.push({x:x + w / 2, y:y + h / 2, pi:ri(0, 9), n:6});
    const f0 = s0 + cw + 3, f1 = ia1 - 1, d0 = S1 + RW + 5, d1 = S2 - 3;
    if (f1 - f0 >= 12) {                                                       // поле: грунт, вокруг сетка с калиткой со двора
      for (let a = f0 + 1; a < f1; a++) for (let d = d0 + 1; d < d1; d++) { const [xx, yy] = AD(a, sd, d); soil[yy * MW + xx] = 1; }
      const run = (p0, p1, gaps) => fenceRun(Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.max(p0[0], p1[0]), Math.max(p0[1], p1[1]), gaps);
      const g = (f0 + f1) >> 1;
      run(AD(f0, sd, d0), AD(f1, sd, d0), [[g - 1, g + 1]]); run(AD(f0, sd, d1), AD(f1, sd, d1), []);
      run(AD(f0, sd, d0 + 1), AD(f0, sd, d1 - 1), []); run(AD(f1, sd, d0 + 1), AD(f1, sd, d1 - 1), []);
    }
    maskAD(ia0, ia1, sd, S1 + RW + 1, S2 - 2);
    for (let a = ia0 + 1; a <= s0 + cw + 1; a += 4) plant(...AD(a, sd, S2 - 3));
  } }

  // микрорайон: две-три панельки, двор с деревьями, парковка у задней улицы
  const flatsBlock = (c, sd) => {
    const {ia0, ia1} = c, {s1:S1, s2:S2} = c.B[sd]; used.add(key(c, sd, 1));
    maskAD(ia0, ia1, sd, S1 + RW + 1, S2 - 2);
    const L = ia1 - ia0 + 1, d0 = S1 + RW + 3, n = V ? 3 : Math.max(2, Math.min(3, Math.floor(((L - 6) / 2 - 1) / 6))), fw = 6 * n + 1, fh = 14;                 // в клетках карты: fw — вдоль x, fh — вдоль y
    const la = V ? fh : fw, ld = V ? fw : fh;                                 // размер здания вдоль a и вдоль d
    const cnt = Math.max(1, Math.min(3, Math.floor((ia1 - ia0 + 3) / (la + 3))));
    const sp = Math.floor((ia1 - ia0 + 1 - cnt * la) / (cnt + 1));
    fillAD(ia0, ia1, sd, S1 + RW + 1, d0 - 1, WALK);                        // площадка перед домами у тротуара
    for (let q = 0; q < cnt; q++) {
      const a0 = ia0 + sp + q * (la + sp), [x, y, w, h] = rectAD(a0, a0 + la - 1, sd, d0, d0 + ld - 1);
      fillAD(a0 - 1, a0 + la, sd, d0 - 1, d0 + ld, WALK);                     // отмостка
      carve(x, y, x + w - 1, y + h - 1, GRASS);
      buildFlats(x, y, n); SPECIAL.push({x:x + w / 2, y:y + h / 2, pi:ri(0, 9), n:3});
    }
    // парковка вдоль задней улицы
    fillAD(ia0 - 1, ia1 + 1, sd, S2 - 7, S2 - 2, ROAD);
    for (let a = ia0 + 1; a < ia1 - 2; a += 5) if (rng() < .2) { const d = S2 - 6, [x, y] = AD(a, sd, d), [x2, y2] = AD(a, sd, sd > 0 ? d : d + 1); V ? parkCarAt(Math.min(x, x2), y, 'y') : parkCarAt(x, Math.min(y, y2), 'x'); }
    // двор: деревья, кусты, песочница
    for (let t = 0; t < 60; t++) { const a = ri(ia0 + 1, ia1 - 1), d = ri(d0 + ld + 2, S2 - 9); plant(...AD(a, sd, d)); }
    { const a = (ia0 + ia1) >> 1; for (let q = 0; q < 3; q++) for (let r = 0; r < 3; r++) { const [x, y] = AD(a + q, sd, d0 + ld + 3 + r); if (get(x, y) === GRASS && !propAt[y * MW + x]) soil[y * MW + x] = 1; } }
  };
  // парк: деревья, пруд, грунтовые дорожки крест-накрест, фонари
  const parkBlock = (c, sd) => {
    const {ia0, ia1} = c, S1 = c.B[sd].s1, S2 = c.B[sd].b1hi + 2; used.add(key(c, sd, 1));
    maskAD(ia0, ia1, sd, S1 + RW + 1, S2 - 2);
    const am = (ia0 + ia1) >> 1, dm = (S1 + RW + S2) >> 1;
    for (let a = ia0; a <= ia1; a++) for (const d of [dm, dm + 1]) { const [x, y] = AD(a, sd, d); soil[y * MW + x] = 1; }
    for (let d = S1 + RW + 1; d <= S2 - 2; d++) for (const a of [am, am + 1]) { const [x, y] = AD(a, sd, d); soil[y * MW + x] = 1; }
    { const pa = ri(0, 1) ? ia0 + 9 : ia1 - 9, pd = dm + (rng() < .5 ? -8 : 9), [px, py] = AD(pa, sd, pd); pond(px + .5, py + .5, 4 + rng() * 1.5, 3 + rng()); }
    for (let t = 0; t < 320; t++) plant(...AD(ri(ia0 + 1, ia1 - 1), sd, ri(S1 + RW + 2, S2 - 3)));
    for (const a of [ia0 + 6, am - 8, am + 10, ia1 - 5]) { const [x, y] = AD(a, sd, dm - 1); if (get(x, y) === GRASS && !propAt[y * MW + x]) addProp({type:'lamp', flick:rng() < .2, cx:x + .5, cy:y + .5 + .3, hx:0, hy:1, solid:true, r:[x + .4, y + .7, x + .6, y + .9]}, [[x, y]]); }
  };
  { const fc = rest.concat(near0).find(c => deep(c, sgL)) || rest.concat(near0).find(c => deep(c, sgR)); if (fc) flatsBlock(fc, deep(fc, sgL) ? sgL : sgR);
    const pk = rest.concat(near0).find(c => !used.has(key(c, sgR, 1)) && !merged(c, sgR) && c.B[sgR].b1hi - c.B[sgR].b1lo >= 22); if (pk) parkBlock(pk, sgR);
  }

  // жилые кварталы: где глубоко — два ряда участков спина к спине, где мелко — один ряд
  const band = (c, sd, lo, hi, faceHi, o) => {
    const depth = hi - lo + 1;
    if (depth >= 29) { const m = lo + (depth >> 1) + ri(-2, 2); lotRow(c.ia0, c.ia1, sd, lo, m, o); lotRow(c.ia0, c.ia1, sd, hi, m, o); }
    else if (depth >= 13) faceHi ? lotRow(c.ia0, c.ia1, sd, hi, lo, o) : lotRow(c.ia0, c.ia1, sd, lo, hi, o);
  };
  const span = (c, sd, f) => {                                               // слитые кварталы — один длинный ряд участков
    if (c.B[sd][f]) return null;
    let j = c.k; while (cols[j + 1] && cols[j + 1].B[sd][f]) j++;
    return Object.assign({}, c, {ia1:cols[j].ia1});
  };
  for (const c of cols) for (const sd of [-1, 1]) {
    const B = c.B[sd], c0 = span(c, sd, 'm0'), c1 = span(c, sd, 'm1');
    if (c0 && !used.has(key(c, sd, 0))) band(c0, sd, 2, B.s1 - 2, rng() < .5);
    if (c1 && !used.has(key(c, sd, 1)) && B.b1hi) {
      if (B.s2) band(c1, sd, B.b1lo, B.b1hi, false);
      else lotRow(c1.ia0, c1.ia1, sd, B.b1lo, B.b1hi, {garden:.7, rows:3, fence:.7});   // за домами лес или река
    }
    if (B.s2) {                                                               // за задней улицей: частный сектор или дома огородами к реке
      const lo = B.s2 + RW + 1;
      if (sd === sgL && rng() < .65) lotRow(c.ia0, c.ia1, sd, lo, lo + ri(15, 20), {gar:.2, garden:.8, rows:4, fence:.85});
      if (sd === sgR && B.nb - 3 - lo >= 13) lotRow(c.ia0, c.ia1, sd, lo, Math.min(B.nb - 3, lo + 20), {gar:.1, garden:.7, rows:3});
    }
  }
  // тупики-грунтовки на краях города: дом на отшибе
  for (const end of [0, cols.length - 1]) for (const sd of [-1, 1]) {
    if (rng() < .45) continue;
    const c = cols[end], B = c.B[sd], d = B.s2 && rng() < .5 ? B.s2 : B.s1, dir = end ? 1 : -1, aS = end ? c.a1 + 1 : c.a0 - 1, len = ri(14, 24);
    const aE = aS + dir * len;
    let ok = true; for (let a = Math.min(aS, aE); a <= Math.max(aS, aE) && ok; a++) for (let dd = d - 12; dd <= d + RW + 12 && ok; dd++) { const [x, y] = AD(a, sd, dd); if (!inMap(x, y, FEN + 3) || get(x, y) !== GRASS || hAt[y * MW + x] || propAt[y * MW + x] || soil[y * MW + x]) ok = false; }
    if (!ok) continue;
    for (let a = Math.min(aS, aE); a <= Math.max(aS, aE); a++) for (const dd of [d + 1, d + 2]) { const [x, y] = AD(a, sd, dd); soil[y * MW + x] = 1; }
    for (const side of [-1, 1]) if (rng() < .7) {
      const dF = side < 0 ? d - 1 : d + RW, hw = ri(8, 10), a0 = end ? aE - hw - ri(0, 3) : aE + ri(0, 3), lo = Math.min(a0, a0 + hw - 1);
      const D = k => dF + side * k, [hx, hy, w, h] = rectAD(lo, lo + hw - 1, sd, D(2), D(9));
      if (rectFree(hx, hy, w, h, 1)) { const H = bldF(hx, hy, w, h, 'house', faceD(sd, -side)); if (H) { pathOut(H.doors[0]); for (let k = 0; k < 6; k++) veg(...AD(lo + 1 + k, sd, D(11))); } }
    }
  }
  // набережная: ивы у воды
  for (let a = A0; a <= A1; a++) {
    const dw = rc(a) - rw(a) - 1;
    if (rng() < .16) plant(...AD(a, sgR, dw));
  }

  // ---- фонари на тротуарах, машины у обочин ----
  for (const s of streets) for (let k = s.lo + 3; k < s.hi - 1; k += 9) {
    const open = t => t === WALK || t === ROAD;                               // за фонарём дорожка или подъезд — не загораживаем
    if (s.vert) { const x = s.p - 1; if (get(x, k) === WALK && !propAt[k * MW + x] && !open(get(x - 1, k))) addProp({type:'lamp', flick:rng() < .15, cx:x + .5 + .3, cy:k + .5, hx:1, hy:0, solid:true, r:[x + .7, k + .4, x + .9, k + .6]}, [[x, k]]); }
    else { const y = s.p - 1; if (get(k, y) === WALK && !propAt[y * MW + k] && !open(get(k, y - 1))) addProp({type:'lamp', flick:rng() < .15, cx:k + .5, cy:y + .5 + .3, hx:0, hy:1, solid:true, r:[k + .4, y + .7, k + .6, y + .9]}, [[k, y]]); }
  }
  const crossing = (s, a) => (s.vert ? RY : RX).some(q => a >= q - 2 && a <= q + RW + 1);
  for (let t = 0, n = 0; t < 1200 && n < 14; t++) {
    const s = pick(streets), a = ri(s.lo, s.hi - 1), lane = s.p + (rng() < .5 ? 0 : RW - 1);
    if (crossing(s, a) || crossing(s, a + 1)) continue;
    if (s.vert ? parkCarAt(lane, a, 'y') : parkCarAt(a, lane, 'x')) n++;
  }
  for (let k = 0; k < 5; k++) { const a = ri(A0, A1), [x, y] = XY(a, rng() < .5 ? H0 - 1 : H1 + 1); SPECIAL.push({x:x + .5, y:y + .5, pi:ri(0, 9), n:3}); }

  // ---- за городом ----
  const K = outskirtsKit(nearTown); dirtL = true;                          // грунтовки — прямые, с одним поворотом
  // дачи за рекой: грунтовая улица от поперечной трассы, участки по обе стороны
  { const plotW = 12, n = ri(5, 6), lenA = n * plotW + 1, dir = rng() < .5 ? 1 : -1;
    const a0 = dir > 0 ? EXIT_R + RW + 6 : EXIT_R - 6 - lenA, a1 = a0 + lenA - 1, dl = Math.min(farBank(a0 - 2, a1 + 2) + 18, MW - EXIT_R - FEN - 24);
    const [rx, ry, rw_, rh] = rectAD(a0 - 2, a1 + 2, sgR, dl - 16, dl + 16);
    if (K.freeArea(rx, ry, rw_, rh, 0)) {
      for (let a = Math.min(a0, EXIT_R + RW), aE = Math.max(a1, EXIT_R - 1); a <= aE; a++) for (let d = dl - 1; d <= dl + 1; d++) { const [x, y] = AD(a, sgR, d); if (get(x, y) === GRASS) soil[y * MW + x] = 1; }
      for (const side of [-1, 1]) for (let q = 0; q < n; q++) {
        const pa = a0 + q * plotW, dF = dl + side * 2, dB = dl + side * 16, s = side, D = k => dF + s * k, front = faceD(sgR, -s);
        if (rng() < .12) continue;                                             // пустой заросший участок
        const hw = 8, hd = 8, h0 = pa + 2 + ri(0, 1), [hx, hy, hwx, hhy] = rectAD(h0, h0 + hw - 1, sgR, D(2), D(2 + hd - 1));
        const H = bldF(hx, hy, hwx, hhy, 'house', front);
        if (H) pathOut(H.doors[0]);
        if (rng() < .5) { const [sx, sy, sw, sh] = rectAD(pa + plotW - 5, pa + plotW - 2, sgR, D(11), D(13)); if (rectFree(sx, sy, sw, sh, 0)) bldF(sx, sy, sw, sh, 'shed', front); }
        const st = ri(0, 3);
        for (let a = pa; a <= pa + plotW; a++) { putPF(...AD(a, sgR, D(0)), AX, st); putPF(...AD(a, sgR, dB), AX, st); }
        for (let k = 1; k < 14; k++) { putPF(...AD(pa, sgR, D(k)), CX, st); putPF(...AD(pa + plotW, sgR, D(k)), CX, st); }
        for (let k = 12; k <= 13; k++) for (let a = pa + 2; a <= pa + 6; a++) veg(...AD(a, sgR, D(k)));
        if (rng() < .7) plant(...AD(pa + plotW - 2, sgR, D(1)));
      }
      K.claim(rx, ry, rw_, rh);
      SPECIAL.push({x:AD((a0 + a1) >> 1, sgR, dl)[0] + .5, y:AD((a0 + a1) >> 1, sgR, dl)[1] + .5, pi:ri(0, 9), n:4});
    }
  }
  K.gas(); K.depot();
  // гаражный кооператив: два ряда гаражей воротами к грунтовому проезду
  { const nG = ri(6, 8), FU = 2 + nG * 6, FV = 16, F = K.findFrame(FU, FV, 3, 1, 1, 400); if (F) {
    for (let u = 0; u < FU; u++) for (let v = 6; v <= 9; v++) { const [x, y] = F.L(u, v); soil[y * MW + x] = 1; }
    for (let v = -1; v < 6; v++) for (const u of [0, 1]) { const [x, y] = F.L(u, v); if (get(x, y) === GRASS) soil[y * MW + x] = 1; }
    K.driveway(F);
    for (let q = 0; q < nG; q++) {
      if (rng() < .9) { const [x, y, w, h] = F.LR(2 + q * 6, 0, 5, 6); bld(x, y, w, h, 'garage', [F.LS(0, 1)]); }
      if (rng() < .9) { const [x, y, w, h] = F.LR(2 + q * 6, 10, 5, 6); bld(x, y, w, h, 'garage', [F.LS(0, -1)]); }
    }
    { const [x, y] = F.L(FU >> 1, 7), along = F.LS(1, 0) < 2 ? 'y' : 'x'; set(x, y, ROAD); const [x2, y2] = along === 'x' ? [x + 1, y] : [x, y + 1]; set(x2, y2, ROAD); if (!parkCarAt(Math.min(x, x2), Math.min(y, y2), along)) { set(x, y, GRASS); set(x2, y2, GRASS); } }
  } }
  K.farms(ri(3, 4)); K.roadHouses(ri(5, 7), 600, true); K.lake([1, 0, 2, 3]); K.cabins(3);
  highwayCars(3);

  // карантин: блокпосты на трассах и забор
  for (const side of ['w', 'e', 'n', 's']) checkpoint(side);
  quarantineFence(MW - 1 - FEN, true);
  const nearCP = (x, y) => (Math.abs(x - EXIT_R - 2) < 10 && (y < FEN + 10 || y > MH - FEN - 11)) || (Math.abs(y - EXIT_R - 2) < 10 && (x < FEN + 10 || x > MW - FEN - 11));
  const nearYard = (x, y) => { for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const id = propAt[(y + b) * MW + x + a]; if (id && props[id - 1].type === 'pfence') return true; } return false; };
  genFinish({tree:(x, y, n) => {
    if (nearCP(x, y) || cityMask[y * MW + x] || nearYard(x, y)) return 0;
    if (x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3]) return .008;
    return insideFence(x, y) ? .07 + .14 * n : .36 + .2 * n;
  }, bush:.035, bins:.014, hideouts:3, binOK:(x, y) => {                   // урны — у бордюра на сплошном тротуаре, не в устье дорожки
    const n = D4.map(([ox, oy]) => get(x + ox, y + oy));
    return n.includes(ROAD) && n.filter(t => t === WALK).length <= 2 && !n.includes(DOOR);
  }});
  cityMask = null; world.nofence = false; dirtL = false;
}
