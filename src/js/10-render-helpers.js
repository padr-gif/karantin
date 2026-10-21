// ================= render helpers =================
const COL = {
  line:[196,170,84], curb:[168,168,166],
  door:[124,88,56], plank:[156,118,74], frame:[230,226,216], cap:[46,42,40], brick:[130,74,58],
  trunk:[78,58,40], leaf:[[44,66,38],[54,80,44],[38,58,34]], pine:[[34,58,40],[40,68,46]], bush:[[50,74,42],[62,88,50]],
  fridge:[218,220,214], cabinet:[136,100,66], counter:[200,194,182], wardrobe:[110,78,48], shelf:[124,116,102], crate:[146,114,72],
  bedF:[108,78,56], blanket:[[140,62,56],[66,92,128],[96,110,70]], pillow:[230,224,214], sink:[190,194,198],
  glass:[46,58,68], lampPost:[64,66,68], mail:[70,82,114],
};
const colCache = new Map();
function C(rgb, f, a) {
  const q = Math.round(f * 40) / 40;
  const k = rgb[0] * 1e6 + rgb[1] * 1e3 + rgb[2] + '|' + q + '|' + (a == null ? 1 : a);
  let s = colCache.get(k);
  if (!s) {
    const r = Math.min(255, rgb[0] * q) | 0, g = Math.min(255, rgb[1] * q) | 0, b = Math.min(255, rgb[2] * q) | 0;
    s = a != null && a < 1 ? `rgba(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`;
    if (colCache.size > 6000) colCache.clear();
    colCache.set(k, s);
  }
  return s;
}
const SX = (x, y) => ox + (x - y) * U;
const SY = (x, y, z) => oy + (x + y) * hh - z;
const resetT = () => ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
const groundT = (z) => ctx.setTransform(DPR * U, DPR * hh, -DPR * U, DPR * hh, DPR * ox, DPR * (oy - (z || 0)));
let gAlpha = 1;
// vertical face from p0 to p1 (world), between heights z0..z1 (px); fill = colour or pattern; dark = 0..1 overlay
function vface(p0x, p0y, p1x, p1y, z0, z1, fill, dark, grain) {
  const dx = p1x - p0x, dy = p1y - p0y, len = Math.hypot(dx, dy); if (len < 1e-4 || z1 <= z0) return;
  const ux = dx / len, uy = dy / len;
  ctx.setTransform(DPR * (ux - uy) * U, DPR * (ux + uy) * hh, 0, -DPR * U, DPR * (ox + (p0x - p0y) * U), DPR * (oy + (p0x + p0y) * hh));
  // align patterns to world: offset u by the face's world coordinate along its axis
  const u0 = Math.abs(ux) > .5 ? p0x * Math.sign(ux) : p0y * Math.sign(uy);
  ctx.translate(-u0, 0);
  ctx.fillStyle = fill; ctx.fillRect(u0, z0 / U, len, (z1 - z0) / U);
  if (grain) { ctx.fillStyle = TX.grain(); ctx.fillRect(u0, z0 / U, len, (z1 - z0) / U); }
  if (dark > .01) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, dark)})`; ctx.fillRect(u0, z0 / U, len, (z1 - z0) / U); }
}
function hface(x0, y0, x1, y1, z, fill, dark, grain) {
  groundT(z);
  ctx.fillStyle = fill; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  if (grain) { ctx.fillStyle = TX.grain(); ctx.fillRect(x0, y0, x1 - x0, y1 - y0); }
  if (dark > .01) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, dark)})`; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); }
}
// axis-aligned box; tex: {s,e,t} patterns or undefined (flat colour + grain)
function box(x0, y0, x1, y1, z0, z1, rgb, f, a, tex) {
  if (a != null && a < 1) ctx.globalAlpha = a;
  const g = false;
  vface(x0, y1, x1, y1, z0, z1, tex && tex.s || C(rgb, 1), 1 - f * .82, g);
  vface(x1, y0, x1, y1, z0, z1, tex && tex.e || C(rgb, 1), 1 - f * .62, g);
  hface(x0, y0, x1, y1, z1, tex && tex.t || C(rgb, 1), 1 - f, g);
  resetT(); ctx.globalAlpha = 1;
}
// oriented thin slab from (ax,ay) along (dx,dy)
function obox(ax, ay, dx, dy, len, th, z0, z1, rgb, f, tex) {
  const nx = -dy * th / 2, ny = dx * th / 2, bx = ax + dx * len, by = ay + dy * len;
  const pts = [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]];
  for (let k = 0; k < 4; k++) {
    const p = pts[k], q = pts[(k + 1) % 4];
    const ex = q[0] - p[0], ey = q[1] - p[1];
    const onx = -ey, ony = ex; // outward normal
    if (onx + ony <= 0) continue;
    vface(p[0], p[1], q[0], q[1], z0, z1, tex || C(rgb, 1), 1 - f * (Math.abs(onx) > Math.abs(ony) ? .62 : .82), !tex);
  }
  resetT();
  ctx.fillStyle = C(rgb, f); ctx.beginPath();
  for (let k = 0; k < 4; k++) { const p = pts[k]; k ? ctx.lineTo(SX(p[0], p[1]), SY(p[0], p[1], z1)) : ctx.moveTo(SX(p[0], p[1]), SY(p[0], p[1], z1)); }
  ctx.closePath(); ctx.fill();
}
function poly4(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, fill) {
  ctx.fillStyle = fill; ctx.beginPath();
  ctx.moveTo(SX(ax, ay), SY(ax, ay, az)); ctx.lineTo(SX(bx, by), SY(bx, by, bz));
  ctx.lineTo(SX(cx, cy), SY(cx, cy, cz)); ctx.lineTo(SX(dx, dy), SY(dx, dy, dz));
  ctx.closePath(); ctx.fill();
}
function line3(ax, ay, az, bx, by, bz) { ctx.moveTo(SX(ax, ay), SY(ax, ay, az)); ctx.lineTo(SX(bx, by), SY(bx, by, bz)); }
const fogF = i => vis[i] ? 1 : seen[i] ? .55 : .24;
const fogAt = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH) ? .24 : fogF(y * MW + x);

// smooth fog of war layer: one pixel per tile, drawn stretched with smoothing
const fogC = mkCanvas(MW, MH), fogG = fogC.getContext('2d');
function updateFog() {
  const img = fogG.createImageData(MW, MH), d = img.data;
  if (!d || !d.length) return;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x;
    let f = fogF(i);
    if (isWallish(map[i])) { let s = 0, n = 0; for (const [ox2, oy2] of D4) { const t = get(x + ox2, y + oy2); if (!isWallish(t)) { s += fogAt(x + ox2, y + oy2); n++; } } if (n) f = Math.max(s / n, f * .8); }
    const k = i * 4; d[k] = 4; d[k + 1] = 6; d[k + 2] = 12; d[k + 3] = (1 - f) * 255;
  }
  fogG.putImageData(img, 0, 0);
}
