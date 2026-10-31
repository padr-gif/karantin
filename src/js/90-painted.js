// ================= мягкий рисованный стиль (детальная графика) =================
// Всё здесь рисуется один раз — в кэш куска земли (drawGroundRange в 16-caches) — и на скорость кадра почти не влияет.
// Только в детальном режиме (HDQ > 1): в пиксельном земля остаётся прежней.
//   paintedGrass — травинки поверх травы: вертикальные на экране штрихи, тёмные у корня, светлые у кончика;
//                  кое-где пучки повыше. Кончики заходят на соседние клетки, поэтому край газона у тротуара неровный.
//   softWallShadow — мягкая тень у основания стен: несколько расширяющихся слоёв вместо одной резкой полосы.
// Цоколь из камня у наружных стен — в текстуре сайдинга (TX.siding, 51-surfaces).

const GRASS_BLADES = [[44, 62, 30], [56, 78, 36], [68, 92, 42], [80, 104, 48], [92, 116, 54], [104, 124, 60], [96, 104, 58]];
const GRASS_N = 96, GRASS_TUFT = .38;          // травинок на клетку; доля клеток с пучком повыше

// травинки на клетках травы в прямоугольнике клеток; рисуем в пикселях мира (resetT), координаты — SX/SY
function paintedGrass(x0, y0, x1, y1) {
  if (HDQ <= 1) return;
  const paths = GRASS_BLADES.map(() => [new Path2D(), new Path2D()]);       // [корень, кончик] для каждого цвета
  const tw = U * 2, th = hh * 2;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * MW + x;
    if (map[i] !== GRASS || hAt[i] || soil[i]) continue;
    const n = GRASS_N + Math.floor(hash(x * 3 + 7, y * 5 + 1) * 14);
    for (let k = 0; k < n; k++) {
      const u = hash(x * 131 + k, y * 71 + 3), v = hash(x * 17 + 5, y * 113 + k);   // точка внутри клетки
      const px = SX(x + u, y + v), py = SY(x + u, y + v, 0);
      const h = hash(k * 7 + x, k * 11 + y);
      const L = (2.4 + h * 4.2) * U / 30, lean = (hash(k + x * 5, y * 3 - k) - .5) * 1.1;
      const c = Math.floor(hash(k * 3 + y, x * 7 + k) * GRASS_BLADES.length);
      const [pr, pt] = paths[c];
      const mx = px + lean * L * .4, my = py - L * .55;
      pr.moveTo(px, py); pr.lineTo(mx, my);
      pt.moveTo(mx, my); pt.lineTo(px + lean * L, py - L);
    }
    if (hash(x + 41, y + 77) < GRASS_TUFT) {                                  // пучок: веером, длиннее
      const cx = SX(x + .2 + hash(x, y + 9) * .6, y + .2 + hash(x + 9, y) * .6), cy = SY(x + .5, y + .5, 0) + (hash(x + 3, y + 3) - .5) * th * .4;
      for (let k = 0; k < 22; k++) {
        const s = (hash(k, x * 9 + y) - .5), L = (5 + hash(k + 5, y * 9 + x) * 5) * U / 30;
        const bx = cx + s * tw * .16, by = cy + (hash(k + 2, x) - .5) * 2;
        const c = Math.floor(hash(k * 5 + x, y * 3) * GRASS_BLADES.length), [pr, pt] = paths[c];
        const mx = bx + s * L * .5, my = by - L * .55;
        pr.moveTo(bx, by); pr.lineTo(mx, my); pt.moveTo(mx, my); pt.lineTo(bx + s * L * 1.1, by - L);
      }
    }
  }
  resetT(); ctx.lineCap = 'round';
  const w = Math.max(.6, U / 27);
  GRASS_BLADES.forEach((col, c) => {
    const [pr, pt] = paths[c];
    ctx.lineWidth = w * 1.15; ctx.strokeStyle = `rgb(${col[0] * .74 | 0},${col[1] * .74 | 0},${col[2] * .74 | 0})`; ctx.stroke(pr);
    ctx.lineWidth = w * .85; ctx.strokeStyle = `rgb(${Math.min(255, col[0] * 1.06) | 0},${Math.min(255, col[1] * 1.06) | 0},${Math.min(255, col[2] * 1.06) | 0})`; ctx.stroke(pt);
  });
  ctx.lineCap = 'butt';
}

// мягкая тень у основания стен: в пиксельном режиме — прежняя полоса, в детальном — три слоя, чуть смещённые вниз-вправо (свет сверху слева)
function softWallShadow(x0, y0, x1, y1) {
  groundT(0);
  const layers = HDQ > 1 ? [[.08, .1, 0], [.2, .07, .04], [.36, .05, .08]] : [[.08, .22, 0]];
  for (const [g, a, sh] of layers) {
    ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.beginPath();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * MW + x; if (map[i] !== WALL) continue;
      for (const r of wpV[i]) ctx.rect(x + r[0] - g + sh, y + r[1] - g + sh, r[2] - r[0] + g * 2, r[3] - r[1] + g * 2);
    }
    ctx.fill();
  }
}

// ---- рисованные кроны деревьев и ёлок ----
// Готовых детальных кадров для деревьев нет, а старые спрайты при увеличении выглядят кубиками. Кадр строим один раз,
// при первом показе: силуэт и светотень берём из старого спрайта (увеличенного втрое со сглаживанием), а заполняем
// мазками: у лиственных — листьями-ромбиками, у ёлки — иголками, которые свисают от ствола вниз и наружу.
// Размер и точка опоры те же, что у старого кадра (×3), поэтому прозрачность у героя, ветер и осенний тон работают как раньше.
const PAINTED = new Map();
const LEAVES = [[46, 72, 36], [56, 86, 42], [66, 98, 48], [78, 110, 54], [92, 122, 60], [52, 78, 40]];
const NEEDLES = [[30, 54, 38], [36, 64, 44], [44, 76, 50], [54, 88, 58], [28, 46, 34]];
function paintedFrame(name) {
  let fr = PAINTED.get(name);
  if (fr !== undefined) return fr;
  fr = null;
  const m = /^(pine|tree)_\d+_c$/.exec(name), base = ART.meta.frames[name];
  if (m && base && ART.imgs[base[0]]) {
    try { fr = paintCanopy(name, base, m[1] === 'pine'); }
    catch (e) { fr = null; logErr(e, 'painted ' + name); }
  }
  PAINTED.set(name, fr);
  return fr;
}
function paintCanopy(name, b, pine) {
  const S = 3, w = b[3] * S, h = b[4] * S;
  const src = mkCanvas(w, h), sg = src.getContext('2d', {willReadFrequently:true});
  sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = 'high';
  sg.drawImage(ART.imgs[b[0]], b[1], b[2], b[3], b[4], 0, 0, w, h);
  const px = sg.getImageData(0, 0, w, h).data;
  const at = (x, y) => { x = x | 0; y = y | 0; if (x < 0 || y < 0 || x >= w || y >= h) return null; const i = (y * w + x) * 4; return px[i + 3] > 110 ? (px[i] * .3 + px[i + 1] * .59 + px[i + 2] * .11) : null; };
  // средняя яркость исходника — от неё считаем светлее/темнее
  let sum = 0, cnt = 0; for (let i = 3; i < px.length; i += 16) if (px[i] > 110) { sum += px[i - 3] * .3 + px[i - 2] * .59 + px[i - 1] * .11; cnt++; }
  const avg = cnt ? sum / cnt : 80;
  const out = mkCanvas(w, h), g = out.getContext('2d');
  // подложка: тот же силуэт, затемнённый, — чтобы между мазками не просвечивало
  g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = pine ? 'rgba(14,26,18,.62)' : 'rgba(18,30,14,.55)'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over';
  const pal = pine ? NEEDLES : LEAVES, n = Math.round(cnt * 16 / (pine ? 9 : 14));
  const cxAxis = b[5] * S;                                                    // ось ствола — по точке опоры
  const pts = [];
  for (let k = 0; k < n; k++) {
    const x = hash(k, 17 + name.length) * w, y = hash(k * 3 + 1, 29) * h, l = at(x, y);
    if (l == null) continue;
    pts.push([y, x, l, k]);
  }
  pts.sort((a, c) => a[0] - c[0]);                                            // сверху вниз: нижние мазки ложатся поверх
  // мазки копим пачками (цвет × ступень света) и заливаем пачку одним вызовом — в разы быстрее, чем по одному.
  // Порядок «сверху вниз» сохраняем полосами: каждая полоса по высоте — свой проход по пачкам
  const STEPS = 7, BAND = 24 * S;
  let band = -1, packs = null;
  const flush = () => {
    if (!packs) return;
    packs.forEach((pk, idx) => {
      if (!pk) return;
      const c = pal[idx % pal.length], kk = .5 + Math.floor(idx / pal.length) / (STEPS - 1) * .95;
      const st = `rgb(${Math.min(255, c[0] * kk) | 0},${Math.min(255, c[1] * kk) | 0},${Math.min(255, c[2] * kk) | 0})`;
      if (pine) { g.strokeStyle = st; g.lineWidth = 2.1; g.lineCap = 'round'; g.stroke(pk); } else { g.fillStyle = st; g.fill(pk); }
    });
    packs = null;
  };
  for (const [y, x, l, k] of pts) {
    if (Math.floor(y / BAND) !== band) { flush(); band = Math.floor(y / BAND); packs = []; }
    const lit = (l - avg) / 60 + (1 - y / h) * .25 - (x - w * .45) / w * .3;  // свет сверху слева
    const kk = Math.max(.5, Math.min(1.45, 1 + lit * .55 + (hash(k, 5) - .5) * .25));
    const idx = Math.round((kk - .5) / .95 * (STEPS - 1)) * pal.length + Math.floor(hash(k, 7) * pal.length);
    const pk = packs[idx] || (packs[idx] = new Path2D());
    if (pine) {                                                               // иголки: от оси наружу и вниз
      const side = x < cxAxis ? -1 : 1, len = 5 + hash(k, 9) * 7, a = side < 0 ? Math.PI - .5 - hash(k, 11) * .5 : .5 + hash(k, 11) * .5;
      pk.moveTo(x, y); pk.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len * .8);
    } else {                                                                  // листок-ромбик
      const s = 3 + hash(k, 9) * 4, a = hash(k, 11) * Math.PI, dx = Math.cos(a) * s, dy = Math.sin(a) * s * .6;
      pk.moveTo(x - dx, y - dy); pk.lineTo(x + dy * .45, y - dx * .3); pk.lineTo(x + dx, y + dy); pk.lineTo(x - dy * .45, y + dx * .3); pk.closePath();
    }
  }
  flush();
  const key = 'painted:' + name; ART.imgs[key] = out;
  return [key, 0, 0, w, h, b[5] * S, b[6] * S, S];
}

// ---- рисованные машины ----
// Седан из объёмных частей вместо воксельного спрайта: кузов со скосами, кабина со скошенными стёклами, колёса в арках,
// фары, решётка, бамперы, стыки дверей, мягкая тень. Машина строится в своих осях (u — вдоль, перёд на +u; v — поперёк;
// z — высота в пикселях мира) и поворачивается под кадр: px — вдоль x передом к +x, nx — передом к −x, py/ny — то же по y.
// Видимые грани выбираются по обходу на экране, свет — сверху и со стороны +y, как у стен.
// кадр машины цвета ci под углом ang (статичные — 4 угла, за рулём — любые из CAR_DIRS). Обе графики: в детальной
// масштаб 2 со смягчением, в пиксельной — 1 без смягчения. Кадр 184×140 пикселей мира (~400 КБ при 2×): храним
// не больше CARF_MAX, старые вытесняем
const CAR_DIRS = 64, CARF_MAX = 40, CARF = new Map();
function carFrame(ci, ang) {
  const S = HDQ > 1 ? 2 : 1, k = ((Math.round(ang / (Math.PI * 2) * CAR_DIRS) % CAR_DIRS) + CAR_DIRS) % CAR_DIRS;
  const key = 'painted:car_' + ci + '_' + k + '@' + S;
  let fr = CARF.get(key);
  if (fr !== undefined) { CARF.delete(key); CARF.set(key, fr); return fr; }
  const w = 184 * S, h = 140 * S, ax = 92 * S, ay = 94 * S, a = k / CAR_DIRS * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
  try { ART.imgs[key] = carModel(w, h, ax, ay, S, ci, (u, v) => [u * c - v * s, u * s + v * c]); fr = [key, 0, 0, w, h, ax, ay, S]; }
  catch (e) { logErr(e, 'painted car'); fr = null; }
  CARF.set(key, fr);
  if (CARF.size > CARF_MAX) { const old = CARF.keys().next().value; CARF.delete(old); delete ART.imgs[old]; }
  return fr;
}
// неподвижная машина (17-render, 98-actions-ui): та же модель, что за рулём
function drawCarProp(p, f) { return drawPaintedAt(carFrame(p.ci, carAng(p)), p.cx, p.cy, f); }
// модель машины: холст w×h, точка опоры (центр машины на земле) ax,ay, масштаб S, поворот rot(u,v) → (x,y) мира
// Модель описана в «малых» единицах (длина 1.86, крыша 25) и растягивается: по земле ×2, по высоте ×1.8 (CAR_L × CAR_W);
// S — масштаб проекции, толщины линий, фары и размытие — ×1.9 от него
function carModel(w, h, ax, ay, PS, ci, rot0) {
  const cv = mkCanvas(w, h), g = cv.getContext('2d');
  const col = CARC[ci] || [120, 120, 120], KZ = 1.8, S = PS * 1.9, rot = (u, v) => rot0(u * 2, v * 2);
  const P3 = (u, v, z) => { const [x, y] = rot(u, v); return [ax + (x - y) * 30 * PS, ay + ((x + y) * 15 - z * KZ) * PS]; };
  const rgb = (c, k, a) => `rgba(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0},${a == null ? 1 : a})`;
  const area = pts => { let s = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; s += p[0] * q[1] - q[0] * p[1]; } return s; };
  // свет грани по её нормали (в осях мира, высота в «клетках» ≈ z/32)
  const light = q => {
    const W3 = q.map(([u, v, z]) => { const [x, y] = rot(u, v); return [x, y, z * KZ / 32]; });
    const a = W3[1].map((c, i) => c - W3[0][i]), c2 = W3[W3.length - 1].map((c, i) => c - W3[0][i]);
    let n = [a[1] * c2[2] - a[2] * c2[1], a[2] * c2[0] - a[0] * c2[2], a[0] * c2[1] - a[1] * c2[0]];
    const l = Math.hypot(...n) || 1; n = n.map(c => c / l);
    const L = [.25, .6, 1], ll = Math.hypot(...L);
    return .55 + .45 * Math.max(0, (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / ll);
  };
  const path = pts => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };
  // грань q (точки u,v,z против часовой снаружи); видна — красим; fn(lerp) дорисовывает детали в её координатах
  const face = (q, c, fn, gloss) => {
    const pts = q.map(p => P3(...p)); if (area(pts) <= 0) return false;
    const k = light(q); path(pts); g.fillStyle = rgb(c, k); g.fill();
    if (gloss) {                                                              // блик: светлее у верхнего края грани
      const top = pts.reduce((m, p) => p[1] < m[1] ? p : m), bot = pts.reduce((m, p) => p[1] > m[1] ? p : m);
      const gr = g.createLinearGradient(top[0], top[1], bot[0], bot[1]); gr.addColorStop(0, `rgba(255,255,255,${gloss})`); gr.addColorStop(.6, 'rgba(255,255,255,0)');
      path(pts); g.fillStyle = gr; g.fill();
    }
    if (fn) { const at = (s, t) => { const a = [0, 1, 2].map(i => q[0][i] + (q[1][i] - q[0][i]) * s), d = [0, 1, 2].map(i => q[3][i] + (q[2][i] - q[3][i]) * s); return P3(...[0, 1, 2].map(i => a[i] + (d[i] - a[i]) * t)); }; fn(at, k); }
    return true;
  };
  const quadIn = (at, s0, s1, t0, t1) => [at(s0, t0), at(s1, t0), at(s1, t1), at(s0, t1)];
  const fillQ = (pts, style) => { path(pts); g.fillStyle = style; g.fill(); };
  // призма: нижний и верхний прямоугольники (u0,u1,v0,v1,z) → грани
  const prism = (B, T, c, deco, gloss) => {
    const bq = [[B[0], B[2]], [B[1], B[2]], [B[1], B[3]], [B[0], B[3]]], tq = [[T[0], T[2]], [T[1], T[2]], [T[1], T[3]], [T[0], T[3]]];
    const zb = B[4], zt = T[4];
    for (let i = 0; i < 4; i++) {                                             // бока: снизу по контуру, сверху обратно
      const j = (i + 1) % 4, q = [[...bq[i], zb], [...bq[j], zb], [...tq[j], zt], [...tq[i], zt]];
      face(q, c, deco && deco[i], gloss);
    }
    face([[...tq[0], zt], [...tq[1], zt], [...tq[2], zt], [...tq[3], zt]], c, deco && deco[4], gloss);
  };
  const L = .93, Wd = .41;
  // тень
  g.save(); g.filter = `blur(${2.2 * S}px)`; g.fillStyle = 'rgba(0,0,0,.42)';
  path([P3(-L - .06, -Wd - .02, 0), P3(L + .1, -Wd - .02, 0), P3(L + .1, Wd + .12, 0), P3(-L - .06, Wd + .12, 0)]); g.fill(); g.restore();
  // колёса: окружность в плоскости борта
  const wheel = (u, side) => {
    const v = side * (Wd - .02), r = 6.4, rt = r / 32;
    const ring = (rr, dv) => { const pts = []; for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; pts.push(P3(u + Math.cos(a) * rr / 32, v + dv, 6.6 + Math.sin(a) * rr)); } return pts; };
    fillQ(ring(r, 0), '#17171a'); fillQ(ring(r * .98, side * .05), '#202024');
    fillQ(ring(r * .55, side * .055), side > 0 ? '#9a9ea2' : '#5e6266'); fillQ(ring(r * .22, side * .06), '#3a3c40');
  };
  const vis = (u, v) => { const [x, y] = rot(u, v); return x + y > 0; };     // борт со стороны камеры
  for (const u of [-.56, .56]) for (const s of [1, -1]) if (!vis(0, s)) wheel(u, s);
  // кузов: низ со скосом к порогам и капот/багажник
  const sideDeco = (front) => (at, k) => {                                    // борт: арки, стыки дверей, ручки, молдинг
    g.fillStyle = 'rgba(0,0,0,.55)';
    for (const sc of [.2, .8]) {                                              // арка в плоскости борта: полуокружность от низа грани
      const pts = []; for (let k = 0; k <= 14; k++) { const a = Math.PI * k / 14; pts.push(at(sc + Math.cos(a) * .145, Math.sin(a) * .9)); }
      path(pts); g.fill();
    }
    g.strokeStyle = rgb(col, k * .55); g.lineWidth = .9 * S;
    for (const s of [.36, .62]) { const a = at(s, .12), c = at(s, .95); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.stroke(); }
    g.strokeStyle = 'rgba(220,224,226,.7)'; g.lineWidth = .7 * S; { const a = at(.06, .55), c = at(.94, .55); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.stroke(); }
    g.fillStyle = 'rgba(30,30,30,.6)'; for (const s of [.42, .68]) { const a = at(s, .72), c = at(s + .05, .72); g.fillRect(Math.min(a[0], c[0]), Math.min(a[1], c[1]) - .4 * S, Math.abs(c[0] - a[0]) + 1, 1.1 * S); }
  };
  const endDeco = (front) => (at, k) => {                                     // перёд: фары, решётка; зад: фонари; бампер
    fillQ(quadIn(at, 0, 1, 0, .26), 'rgb(58,60,64)');
    fillQ(quadIn(at, .02, .98, .26, .36), 'rgba(196,200,204,.95)');
    if (front) {
      fillQ(quadIn(at, .3, .7, .45, .85), 'rgb(34,36,40)');
      g.strokeStyle = 'rgba(150,154,158,.8)'; g.lineWidth = .5 * S; for (let t = .5; t < .85; t += .09) { const a = at(.31, t), c = at(.69, t); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.stroke(); }
      for (const s of [.15, .85]) { const c = at(s, .64); g.fillStyle = 'rgb(236,232,210)'; g.beginPath(); g.ellipse(c[0], c[1], 2.4 * S, 2.6 * S, 0, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(c[0] - .6 * S, c[1] - .7 * S, .9 * S, .9 * S, 0, 0, 6.283); g.fill(); }
    } else {
      for (const s of [[.04, .26], [.74, .96]]) fillQ(quadIn(at, s[0], s[1], .5, .82), 'rgb(176,36,30)');
      fillQ(quadIn(at, .38, .62, .5, .74), 'rgba(222,214,170,.9)');
    }
  };
  // порядок граней призмы: 0 — борт v−, 1 — торец u+, 2 — борт v+, 3 — торец u−, 4 — верх
  const sd = [sideDeco(), endDeco(true), sideDeco(), endDeco(false), null];
  prism([-L + .05, L - .05, -Wd + .03, Wd - .03, 3.2], [-L, L, -Wd, Wd, 8], [70, 72, 76], null);   // порог/днище
  prism([-L, L, -Wd, Wd, 8], [-L + .04, L - .02, -Wd + .02, Wd - .02, 16.5], col, sd, .14);
  // кабина: скошенные лобовое и заднее стекло
  const glass = [64, 80, 96];
  const winSide = (at, k) => {                                                // боковые стёкла: два окна и стойка
    const fr = 'rgba(30,32,36,.85)';
    for (const [s0, s1] of [[.08, .47], [.53, .9]]) {
      const q = quadIn(at, s0, s1, .1, .88); fillQ(q, fr);
      const qi = quadIn(at, s0 + .02, s1 - .02, .16, .84); fillQ(qi, rgb(glass, k * 1.05));
      const a = at(s0 + .1, .16), c = at(s0 + .2, .84), d = at(s0 + .27, .84), e = at(s0 + .17, .16);
      fillQ([a, c, d, e], 'rgba(220,232,240,.22)');                          // отблеск
    }
  };
  const winEnd = (at, k) => { fillQ(quadIn(at, .06, .94, .08, .9), 'rgba(30,32,36,.85)'); fillQ(quadIn(at, .1, .9, .14, .86), rgb(glass, k * 1.1));
    const a = at(.2, .14), c = at(.45, .86), d = at(.58, .86), e = at(.33, .14); fillQ([a, c, d, e], 'rgba(220,232,240,.2)'); };
  prism([-.48, .42, -Wd + .05, Wd - .05, 16.5], [-.32, .2, -Wd + .1, Wd - .1, 25], col, [winSide, winEnd, winSide, winEnd, null], .1);
  for (const u of [-.56, .56]) for (const s of [1, -1]) if (vis(0, s)) wheel(u, s);
  // мягкость: лёгкое размытие краёв, как у остальных детальных кадров
  if (PS <= 1) return cv;                                                     // пиксельная графика: без смягчения
  const out = mkCanvas(w, h), og = out.getContext('2d'); og.filter = `blur(${(PS * .28).toFixed(2)}px)`; og.drawImage(cv, 0, 0);
  return out;
}

// рисованный кадр с точкой опоры в (wx, wy) — как objAtDraw (50-detail): туман через hdFogged, привязка к пикселю экрана
function drawPaintedAt(fr, wx, wy, f) {
  if (!fr) return false;
  const s = fr[7] || 1, src = f >= .99 ? ART.imgs[fr[0]] : hdFogged(fr, f);
  const q = DPR || 1, x = Math.round((SX(wx, wy) - fr[5] / s) * q) / q, y = Math.round((SY(wx, wy, 0) - fr[6] / s) * q) / q;
  ctx.imageSmoothingEnabled = s > 1; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, x, y, fr[3] / s, fr[4] / s);
  ctx.imageSmoothingEnabled = false;
  return true;
}

// лист героя раскрываем заранее (15-art: листы по требованию), чтобы в начале игры он не пропадал на полсекунды
function preloadHeroSheets() {
  try { const lk = P && P.look || look, f = ART.meta && ART.meta.frames['p' + lk.g + heroVar(lk) + '_idle_0_0']; if (f) { needSheet(f[0]); needSheet(f[0] + 'r'); } } catch (e) {}
}
onStartNew(preloadHeroSheets); onLoad(preloadHeroSheets);
onUpdate(() => { if (frameNo % 60 === 0) preloadHeroSheets(); });             // сменил одежду — нужный лист подтянется заранее
