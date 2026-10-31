// ================= без рывков: заготовка заранее (v82) =================
// Замер на ходу и за рулём (детальная графика) показал, откуда рывки: кусок земли собирается 11–15 мс (до 100 мс),
// и за кадр их приходилось собирать несколько; первая текстура нового цвета дома — до 50 мс; новый угол машины — 3–6 мс;
// мебель и перегородки закрытых домов рисовались и запекались, хотя их закрывают стены и крыша (это убрано в 17-render).
// Здесь — то, что можно сделать заранее, не мешая кадру:
//   • warmWorld — перед первым кадром игры: куски земли вокруг героя, текстуры ближних домов, кроны, кадры машин;
//   • chunkAhead — в каждом кадре, если время осталось: один кусок земли за краем экрана, сначала по ходу движения;
//   • машина героя — пока едешь, по одному углу за кадр дорисовываются все 64 (carFrame, 90-painted).
const PERF = {mx:0, my:0, px:0, py:0};

// куски земли, которые нужны вокруг точки (x, y) в пределах r клеток
function chunksAround(x, y, r) {
  const out = [];
  for (let cy = Math.floor((y - r) / CH); cy <= Math.floor((y + r) / CH); cy++)
    for (let cx = Math.floor((x - r) / CH); cx <= Math.floor((x + r) / CH); cx++) out.push([cx, cy]);
  return out;
}
// до первого кадра: всё, что иначе собиралось бы в первые секунды игры рывками
function warmWorld() {
  if (!P || !ART.ready) return;
  const t0 = performance.now();
  try {
    for (const [cx, cy] of chunksAround(P.x, P.y, 22)) { getChunk(cx, cy); if (performance.now() - t0 > 900) break; }
    for (const H of houses) if (Math.abs(H.x + H.w / 2 - P.x) < 26 && Math.abs(H.y + H.h / 2 - P.y) < 26) for (const f of houseTex(H)) f();
    if (HDQ > 1) for (const n of ['tree_0_c', 'tree_1_c', 'tree_2_c', 'pine_0_c', 'pine_1_c']) paintedFrame(n);
    for (const p of props) if (p.type === 'car' && Math.abs(p.cx - P.x) < 22 && Math.abs(p.cy - P.y) < 22) carFrame(p.ci, carAng(p));
  } catch (e) { logErr(e, 'warmWorld'); }
}
// после лёгкого кадра (99-wiring): один недостающий кусок земли сразу за краем экрана — по ходу движения.
// Стоим — ничего не строим. Кусков в кэше немного (HD_CH_MAX), поэтому заготавливаем только одну полосу
function chunkAhead() {
  const vx = P.x - PERF.px, vy = P.y - PERF.py; PERF.px = P.x; PERF.py = P.y;
  PERF.mx = PERF.mx * .85 + vx * .15; PERF.my = PERF.my * .85 + vy * .15;     // куда движемся (сглажено)
  const sp = Math.hypot(PERF.mx, PERF.my); if (sp < .004) return;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [sx, sy] of [[0, 0], [W, 0], [0, H], [W, H]]) { const [x, y] = screenToWorld(sx, sy); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const dx = PERF.mx / sp, dy = PERF.my / sp, cx0 = Math.floor(x0 / CH) - 1, cx1 = Math.floor(x1 / CH) + 1, cy0 = Math.floor(y0 / CH) - 1, cy1 = Math.floor(y1 / CH) + 1;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  let best = null, bs = -1e9;
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    if (CHUNKS.has(cx + ',' + cy)) continue;
    const ox = cx * CH + CH / 2 - mx, oy = cy * CH + CH / 2 - my, along = ox * dx + oy * dy;   // впереди по ходу — выше
    if (along <= 0) continue;
    const s = along - Math.hypot(ox, oy) * .5; if (s > bs) { bs = s; best = [cx, cy]; }
  }
  if (best) getChunk(best[0], best[1]);
}
// машина героя: недостающий угол — по одному за кадр, если время есть
onUpdate(() => {
  const p = P && P.car; if (!p || frameNo % 2) return;
  for (let k = 0; k < CAR_DIRS; k++) {
    const key = 'painted:car_' + p.ci + '_' + k + '@' + (HDQ > 1 ? 2 : 1);
    if (!CARF.has(key)) { carFrame(p.ci, k / CAR_DIRS * Math.PI * 2); return; }
  }
});
