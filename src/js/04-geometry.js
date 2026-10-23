// ================= geometry =================
let _cx, _cy, _r2;
const _hit = (x0, y0, x1, y1) => { const qx = Math.max(x0, Math.min(_cx, x1)), qy = Math.max(y0, Math.min(_cy, y1)); const dx = _cx - qx, dy = _cy - qy; return dx * dx + dy * dy < _r2; };
function blocked(x, y, r) {
  _cx = x; _cy = y; _r2 = r * r;
  const x0 = Math.floor(x - r - .5), x1 = Math.floor(x + r + .5), y0 = Math.floor(y - r - .5), y1 = Math.floor(y + r + .5);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (tileRects(tx, ty, _hit)) return true;
  return false;
}
function move(e, dx, dy) {
  winSolid = e === P;
  try { move0(e, dx, dy); } finally { winSolid = false; }
}
function move0(e, dx, dy) {
  if (dx) {
    if (!blocked(e.x + dx, e.y, e.r)) e.x += dx;
    else if (Math.abs(dy) < 1e-4) { for (const n of [.04, -.04]) if (!blocked(e.x + dx, e.y + n, e.r)) { e.y += n; break; } }
  }
  if (dy) {
    if (!blocked(e.x, e.y + dy, e.r)) e.y += dy;
    else if (Math.abs(dx) < 1e-4) { for (const n of [.04, -.04]) if (!blocked(e.x + n, e.y + dy, e.r)) { e.x += n; break; } }
  }
}
function los(ax, ay, bx, by, skipLast) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / .11);
  const ex = Math.floor(bx), ey = Math.floor(by);
  for (let i = 1; i < n; i++) {
    const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    if (skipLast && Math.floor(x) === ex && Math.floor(y) === ey) continue;
    if (opaquePt(x, y)) return false;
  }
  return true;
}
function computeVis() {
  vis.fill(0);
  const R = (P.binoT > 0 ? 26 : 15) + (hasTr('eagle') ? 4 : 0) - (hasTr('short') ? 4 : 0), px = P.x, py = P.y, cx = Math.floor(px), cy = Math.floor(py);
  for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
    if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > R * R) continue;
    const i = y * MW + x;
    let ok;
    if (isWallish(map[i])) {
      // a wall tile is seen if either of its sides is
      ok = los(px, py, x + .5 + Math.sign(px - x - .5) * .3, y + .5 + Math.sign(py - y - .5) * .3, false) || los(px, py, x + .5, y + .5, true);
    } else ok = los(px, py, x + .5, y + .5, false);
    if (ok) { vis[i] = 1; seen[i] = 1; }
  }
}
// tile an entity stands on, for navigation (sides of thin walls resolve to the open neighbour)
function navTile(ex, ey) {
  const x = Math.floor(ex), y = Math.floor(ey);
  if (!navBlocked(x, y) || !isWallish(get(x, y))) return [x, y];
  const ox = ex - x - .5, oy = ey - y - .5;
  const opts = Math.abs(ox) > Math.abs(oy) ? [[Math.sign(ox), 0], [0, Math.sign(oy) || 1]] : [[0, Math.sign(oy)], [Math.sign(ox) || 1, 0]];
  for (const [dx, dy] of opts) if (dx || dy) { if (!navBlocked(x + dx, y + dy)) return [x + dx, y + dy]; }
  return [x, y];
}
function openingCost(i) {
  const t = map[i]; if (t !== DOOR && t !== WIN) return 1;
  const o = obs[i];
  if (!openingBlocks(i)) return t === WIN ? 2 : 1;
  return 4 + Math.ceil(o.bhp / 45) * 3 + (o.mhp > 0 ? 8 : 0);
}
function buildFlow() {
  flow.fill(-1);
  for (const b of buckets) b.length = 0;
  const [sx, sy] = navTile(P.x, P.y), s = sy * MW + sx;
  flow[s] = 0; buckets[0].push(s);
  for (let d = 0; d < buckets.length; d++) {
    const b = buckets[d];
    while (b.length) {
      const i = b.pop(); if (flow[i] !== d) continue;
      const x = i % MW, y = (i / MW) | 0;
      for (const [ox, oy] of D4) {
        const nx = x + ox, ny = y + oy;
        if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
        const j = ny * MW + nx, t = map[j];
        if (t === WALL || t === TREE || t === WATER || furn[j] || (propAt[j] && props[propAt[j] - 1].solid)) continue;
        const nd = d + openingCost(j);
        if (nd >= buckets.length) continue;
        if (flow[j] === -1 || nd < flow[j]) { flow[j] = nd; buckets[nd].push(j); }
      }
    }
  }
}
function flowStep(z) {
  const [x, y] = navTile(z.x, z.y), here = flow[y * MW + x];
  if (here < 0) return null;
  if (x !== Math.floor(z.x) || y !== Math.floor(z.y)) return [x, y];
  let best = here, bx = 0, by = 0;
  for (const [ox, oy] of D8) {
    const nx = x + ox, ny = y + oy;
    if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
    const v = flow[ny * MW + nx]; if (v < 0) continue;
    if (ox && oy && (navBlocked(nx, ny) || navBlocked(x + ox, y) || navBlocked(x, y + oy))) continue;
    if (v < best) { best = v; bx = ox; by = oy; }
  }
  if (!bx && !by) return null;
  return [x + bx, y + by];
}
