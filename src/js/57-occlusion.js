// ================= мебель за стеной не просвечивает =================
// Мебель рисуется одним спрайтом, а стены — по клеткам. Высокий спрайт (телевизор, шкаф, холодильник) за стеной
// мог оказаться поверх соседних клеток той же стены, которые нарисованы раньше. Теперь перед рисованием мебели
// вырезаем из картинки все куски стен, стоящие между ней и камерой: что за стеной — то за стеной.
let occFrame = -1, occInside = 0;
function occInsideHouse() {
  if (occFrame === frameNo) return occInside;
  occFrame = frameNo; occInside = 0;
  if (mode !== 'menu') for (let k = 0; k < houses.length; k++) { const Hs = houses[k]; if (P.x > Hs.ix0 && P.x < Hs.ix1 && P.y > Hs.iy0 && P.y < Hs.iy1) occInside = k + 1; }
  return occInside;
}
// стены всегда в полный рост; прозрачность стены (91-house-view) — у каждого выреза своя (m.a):
// за непрозрачной стеной мебели не видно, за полупрозрачной она проступает настолько, насколько стена прозрачна
function occWallTop(x, y, i) { return WH; }
function occWallAlpha(x, y, i) { return Math.min(wallAlphaAt(x, y, i), wallSeeAt(x, y)); }
// куски стены клетки (прямоугольники в координатах карты)
function occPieces(x, y) {
  const i = y * MW + x, t = map[i];
  if (t === WALL) return (wpV[i] || []).map(r => [x + r[0], y + r[1], x + r[2], y + r[3]]);
  if (t === DOOR || t === WIN) {
    const o = obs[i]; if (t === DOOR && o && o.open && !(o.bhp > 0)) return [];
    const h = HWV; return alongX(x, y) ? [[x, y + .5 - h, x + 1, y + .5 + h]] : [[x + .5 - h, y, x + .5 + h, y + 1]];
  }
  return [];
}
function hull(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let k = pts.length - 1; k >= 0; k--) { const p = pts[k]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
// куски стен перед мебелью (ближе к камере по x или по y), как многоугольники на экране
function occMasks(f) {
  const R = f.r, out = [], e = .02;
  for (let y = Math.floor(R[1]) - 2; y <= Math.floor(R[3]) + 1; y++) for (let x = Math.floor(R[0]) - 2; x <= Math.floor(R[2]) + 1; x++) {
    if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
    const ps = occPieces(x, y); if (!ps.length) continue;
    let top = -1;
    for (const s of ps) {
      const front = (s[1] >= R[3] - e && s[0] < R[2] + 2 && s[2] > R[0] - 2) || (s[0] >= R[2] - e && s[1] < R[3] + 2 && s[3] > R[1] - 2);
      const behind = s[3] <= R[1] + e || s[2] <= R[0] + e;
      if (!front || behind) continue;
      if (top < 0) top = occWallTop(x, y, y * MW + x);
      const pts = [];
      for (const [px, py] of [[s[0], s[1]], [s[2], s[1]], [s[0], s[3]], [s[2], s[3]]]) for (const z of [0, top]) pts.push([SX(px, py), SY(px, py, z)]);
      const m = hull(pts); m.a = occWallAlpha(x, y, y * MW + x); out.push(m);
    }
  }
  return out;
}
// мебель, заслонённая стеной перед ней: рисуем с вырезом (clip)
function objAtClip(id, name, wx, wy, f, alpha, offX, tint) {
  if (typeof id !== 'string' || id.charCodeAt(0) !== 70 /* F */) return objAtDraw(id, name, wx, wy, f, alpha, offX, tint);
  const fu = furns[+id.slice(1) - 1];
  const masks = fu && fu.r ? occMasks(fu) : [];
  if (!masks.length) return objAtDraw(id, name, wx, wy, f, alpha, offX, tint);
  ctx.save();
  const big = 1e5;
  for (const m of masks) {                                  // каждый clip — «всё, кроме этого куска»; вместе — минус их объединение
    ctx.beginPath(); ctx.moveTo(-big, -big); ctx.lineTo(big, -big); ctx.lineTo(big, big); ctx.lineTo(-big, big); ctx.closePath();
    ctx.moveTo(m[0][0], m[0][1]); for (let k = 1; k < m.length; k++) ctx.lineTo(m[k][0], m[k][1]); ctx.closePath();
    ctx.clip('evenodd');
  }
  try { objAtDraw(id, name, wx, wy, f, alpha, offX, tint); } finally { ctx.restore(); }
  occSeeThrough(masks, () => objAtDraw(id, name, wx, wy, f, (alpha == null ? 1 : alpha) * (1 - occMinA(masks)), offX, tint));
}
// часть мебели под полупрозрачными стенами: та же картинка внутри их вырезов, слабее (1 − прозрачность стены)
const occMinA = masks => masks.reduce((a, m) => Math.min(a, m.a == null ? 1 : m.a), 1);
function occSeeThrough(masks, draw) {
  const see = masks.filter(m => m.a != null && m.a < .98); if (!see.length) return;
  ctx.save(); ctx.beginPath();
  for (const m of see) { ctx.moveTo(m[0][0], m[0][1]); for (let k = 1; k < m.length; k++) ctx.lineTo(m[k][0], m[k][1]); ctx.closePath(); }
  ctx.clip();
  try { draw(); } finally { ctx.restore(); }
}

// ---- глубина мебели: мебель, задвинутая к стене, стоит своей частью в клетке этой стены. Стена такой клетки
// рисуется по её номеру клетки (x + y + 1), а мебель — по своему центру (меньше), и стена ложилась поверх стола.
// Теперь мебель всегда рисуется после стен, которые стоят у неё за спиной.
function furnDepth(f) {
  const R = f.r, key = R ? R.join() : '';
  if (f._dk === key) return f._dd;
  let d = f.cx + f.cy;
  if (R) for (let y = Math.floor(R[1]) - 1; y <= Math.floor(R[3] - 1e-3); y++) for (let x = Math.floor(R[0]) - 1; x <= Math.floor(R[2] - 1e-3); x++) {
    if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
    for (const s of occPieces(x, y)) {
      const behind = s[3] <= R[1] + .03 || s[2] <= R[0] + .03;
      const touches = s[0] < R[2] + .05 && s[2] > R[0] - .05 && s[1] < R[3] + .05 && s[3] > R[1] - .05;
      if (behind && touches) d = Math.max(d, x + y + 1.01);
    }
  }
  f._dk = key; f._dd = d; return d;
}
