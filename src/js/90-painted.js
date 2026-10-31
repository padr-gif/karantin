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
  const m = /^(pine|tree)_\d+_c$/.exec(name), base = m && ART.meta.frames[name];
  if (base && ART.imgs[base[0]]) { try { fr = paintCanopy(name, base, m[1] === 'pine'); } catch (e) { fr = null; } }
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
  for (const [y, x, l, k] of pts) {
    const lit = (l - avg) / 60 + (1 - y / h) * .25 - (x - w * .45) / w * .3;  // свет сверху слева
    const kk = Math.max(.5, Math.min(1.45, 1 + lit * .55 + (hash(k, 5) - .5) * .25));
    const c = pal[Math.floor(hash(k, 7) * pal.length)];
    g.fillStyle = `rgb(${Math.min(255, c[0] * kk) | 0},${Math.min(255, c[1] * kk) | 0},${Math.min(255, c[2] * kk) | 0})`;
    if (pine) {                                                               // иголки: от оси наружу и вниз
      const side = x < cxAxis ? -1 : 1, len = 5 + hash(k, 9) * 7, a = side < 0 ? Math.PI - .5 - hash(k, 11) * .5 : .5 + hash(k, 11) * .5;
      g.strokeStyle = g.fillStyle; g.lineWidth = 1.6 + hash(k, 13); g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len * .8); g.stroke();
    } else {                                                                  // листок-ромбик
      const s = 3 + hash(k, 9) * 4, a = hash(k, 11) * Math.PI, dx = Math.cos(a) * s, dy = Math.sin(a) * s * .6;
      g.beginPath(); g.moveTo(x - dx, y - dy); g.lineTo(x + dy * .45, y - dx * .3); g.lineTo(x + dx, y + dy); g.lineTo(x - dy * .45, y + dx * .3); g.closePath(); g.fill();
    }
  }
  const key = 'painted:' + name; ART.imgs[key] = out;
  return [key, 0, 0, w, h, b[5] * S, b[6] * S, S];
}
