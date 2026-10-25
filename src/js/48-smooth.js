// ================= smooth graphics =================
// The world is drawn from vector pieces (walls, floors, boxes) into caches, but the caches used to be one game
// pixel per pixel and were then blown up ~3× without smoothing — hence the blocky look. In smooth mode the caches
// are drawn HDQ times finer, textures are generated at the same density and everything is scaled with smoothing.
let HDQ = 1;
const hdOn = () => !!settings.smooth;
const HD_CH_MAX = 22;   // finer chunks take HDQ² more memory: keep fewer of them
// about one cache pixel per screen pixel: finer costs speed for no visible gain
function hdQ() { return hdOn() ? Math.min(3, Math.max(2, Math.round(SCALE))) : 1; }
// canvases stop switching smoothing off while smooth mode is on
const smoothDesc = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'imageSmoothingEnabled');
function hdCtx(g) {
  if (!g || g._hd) return g; g._hd = true;
  try { Object.defineProperty(g, 'imageSmoothingEnabled', {configurable:true, get() { return smoothDesc.get.call(this); }, set(v) { smoothDesc.set.call(this, HDQ > 1 ? true : v); if (HDQ > 1) this.imageSmoothingQuality = 'low'; }}); } catch (e) {}
  return g;
}
hdCtx(mainCtx);
const HDFOG = new Map();                       // затемнённые туманом копии: кадр в полном разрешении, LRU (50-detail)
const RUGTEX = new Map();                      // текстуры ковров (51-surfaces)
function hdReset() { clearCaches(); texCache.clear(); fogDirty = true; HDFOG.clear(); RUGTEX.clear(); }
function hdApply() { const q = hdQ(); if (q !== HDQ) { HDQ = q; hdReset(); } }

// (кусок земли в детальной графике HDQ× крупнее — уменьшает mainCtx.drawImage, 73-stability)

// ---- textures: painted HDQ× denser from the same continuous noise ----

// ---- setting ----
SETTINGS_DEF.smooth = false; if (settings.smooth == null) settings.smooth = false;
addEventListener('resize', () => hdApply());
hdApply();

// ---- smooth furniture: drawn from simple shapes (in the spirit of Kenney's low-poly kits) instead of pixel sprites ----
// Local frame: the back of a piece faces the wall (fu.wd); "u" runs along the front edge (0..1), heights are in px.
function fvFrame(fu) {
  const [x0, y0, x1, y1] = fu.r, wd = fu.wd || [0, -1], n = [-wd[0], -wd[1]];
  // front edge from its left end (seen from the room) to its right end
  const L = n[1] > 0 ? [x1, y1] : n[1] < 0 ? [x0, y0] : n[0] > 0 ? [x1, y0] : [x0, y1];
  const R = n[1] > 0 ? [x0, y1] : n[1] < 0 ? [x1, y0] : n[0] > 0 ? [x1, y1] : [x0, y0];
  const vis = n[0] > 0 || n[1] > 0;   // only fronts facing +x or +y are seen from the camera
  const depth = Math.abs(n[0]) ? x1 - x0 : y1 - y0;
  // point at (u along front, d inwards from the front)
  const at = (u, d) => [L[0] + (R[0] - L[0]) * u - n[0] * d, L[1] + (R[1] - L[1]) * u - n[1] * d];
  return {x0, y0, x1, y1, n, vis, depth, at};
}
const shade = (rgb, k) => [rgb[0] * k, rgb[1] * k, rgb[2] * k];
function fvQuad(F, u0, u1, z0, z1, rgb, f, d) {   // a flat panel on the front face, slightly in front of it
  if (!F.vis) return;
  const a = F.at(u0, -(d || .004)), b = F.at(u1, -(d || .004)), k = F.n[0] > 0 ? .62 : .82;
  poly4(a[0], a[1], z0, b[0], b[1], z0, b[0], b[1], z1, a[0], a[1], z1, C(rgb, f * (1 - (1 - k) * .9)));
}
function fvLine(F, u0, z0, u1, z1, rgb, f, w) {
  if (!F.vis) return; const a = F.at(u0, -.006), b = F.at(u1, -.006);
  ctx.strokeStyle = C(rgb, f); ctx.lineWidth = w || 1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(SX(a[0], a[1]), SY(a[0], a[1], z0)); ctx.lineTo(SX(b[0], b[1]), SY(b[0], b[1], z1)); ctx.stroke();
}
function fvTopRect(F, u0, u1, d0, d1, z, fill) {   // a patch on the top surface
  const p = [F.at(u0, d0), F.at(u1, d0), F.at(u1, d1), F.at(u0, d1)];
  ctx.fillStyle = fill; ctx.beginPath(); p.forEach((q, k) => k ? ctx.lineTo(SX(q[0], q[1]), SY(q[0], q[1], z)) : ctx.moveTo(SX(q[0], q[1]), SY(q[0], q[1], z))); ctx.closePath(); ctx.fill();
}
function fvEll(F, u, d, z, rx, ry, fill) { const q = F.at(u, d); ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(SX(q[0], q[1]), SY(q[0], q[1], z), rx, ry, 0, 0, 6.283); ctx.fill(); }
const FBOX = (fu, z0, z1, rgb, f, inset) => { const [x0, y0, x1, y1] = fu.r, i = inset || 0; box(x0 + i, y0 + i, x1 - i, y1 - i, z0, z1, rgb, f); };
const FV = {
  fridge(fu, f) { const F = fvFrame(fu), H = 66, c = [226, 228, 224]; FBOX(fu, 0, H, c, f); resetT();
    fvQuad(F, .05, .95, 4, 24, shade(c, 1.02), f); fvQuad(F, .05, .95, 27, H - 3, shade(c, 1.02), f);
    fvLine(F, .86, 30, .86, 50, [120, 124, 128], f, 1.6); fvLine(F, .86, 10, .86, 20, [120, 124, 128], f, 1.6); },
  cabinet(fu, f) { const F = fvFrame(fu), H = 30, c = COL.cabinet; FBOX(fu, 0, H - 3, c, f); FBOX(fu, H - 3, H, [208, 202, 190], f, -.015); resetT();
    fvQuad(F, .06, .48, 4, H - 7, shade(c, 1.1), f); fvQuad(F, .52, .94, 4, H - 7, shade(c, 1.1), f);
    fvLine(F, .42, 14, .42, 18, [230, 210, 160], f, 1.6); fvLine(F, .58, 14, .58, 18, [230, 210, 160], f, 1.6); },
  counter2(fu, f) { FV.cabinet(fu, f); },
  stove(fu, f) { const F = fvFrame(fu), H = 31, c = [232, 232, 228]; FBOX(fu, 0, H, c, f); resetT();
    fvQuad(F, .1, .9, 5, 21, [40, 40, 44], f); fvLine(F, .15, 23, .85, 23, [150, 150, 150], f, 1.4);
    for (const [u, d] of [[.28, .25], [.72, .25], [.28, .62], [.72, .62]]) { fvEll(F, u, d * F.depth, H + .3, 5, 2.6, C([36, 36, 40], f)); fvEll(F, u, d * F.depth, H + .5, 2.6, 1.3, C([90, 90, 96], f)); }
    if (F.vis) { const p = F.at(.5, F.depth * .97); ctx.fillStyle = C([210, 210, 206], f); } },
  sink(fu, f) { const F = fvFrame(fu), H = 30, c = [214, 216, 214]; FBOX(fu, 0, H, c, f); resetT();
    fvTopRect(F, .18, .82, F.depth * .18, F.depth * .78, H + .3, C([150, 158, 164], f)); fvTopRect(F, .24, .76, F.depth * .26, F.depth * .7, H + .3, C([120, 130, 138], f));
    fvQuad(F, .08, .92, 4, H - 6, shade(c, .97), f); },
  wardrobe(fu, f) { const F = fvFrame(fu), H = 74, c = COL.wardrobe; FBOX(fu, 0, H, c, f); resetT();
    fvQuad(F, .05, .49, 4, H - 4, shade(c, 1.12), f); fvQuad(F, .51, .95, 4, H - 4, shade(c, 1.12), f);
    fvLine(F, .44, 34, .44, 42, [220, 190, 120], f, 1.8); fvLine(F, .56, 34, .56, 42, [220, 190, 120], f, 1.8); },
  dresser(fu, f) { const F = fvFrame(fu), H = 40, c = [128, 92, 60]; FBOX(fu, 0, H, c, f); resetT();
    for (let k = 0; k < 3; k++) { const z = 4 + k * 12; fvQuad(F, .06, .94, z, z + 10, shade(c, 1.12), f); fvLine(F, .44, z + 5, .56, z + 5, [220, 190, 120], f, 1.6); } },
  nightstand(fu, f) { const F = fvFrame(fu), H = 28, c = [128, 92, 60]; FBOX(fu, 0, H, c, f); resetT();
    fvQuad(F, .1, .9, 15, 24, shade(c, 1.12), f); fvLine(F, .4, 19.5, .6, 19.5, [220, 190, 120], f, 1.6); },
  table(fu, f) { const [x0, y0, x1, y1] = fu.r, c = [146, 108, 70], t = .07;
    for (const [a, b] of [[x0 + .05, y0 + .05], [x1 - .05 - t, y0 + .05], [x0 + .05, y1 - .05 - t], [x1 - .05 - t, y1 - .05 - t]]) box(a, b, a + t, b + t, 0, 22, shade(c, .8), f);
    box(x0, y0, x1, y1, 22, 26, c, f); resetT(); },
  bed(fu, f) { const F = fvFrame(fu), wood = COL.bedF, sheet = COL.blanket[(fu.x + fu.y) % 3]; FBOX(fu, 0, 10, wood, f); resetT();
    // headboard against the wall, mattress, pillow, blanket
    const hb = [F.at(0, F.depth), F.at(1, F.depth)]; const [x0, y0, x1, y1] = fu.r;
    const inset = (a, b) => box(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), 10, 17, [236, 232, 224], f);
    inset(F.at(.04, .02), F.at(.96, F.depth - .02));
    const bl0 = F.at(.02, 0), bl1 = F.at(.98, F.depth * .62); box(Math.min(bl0[0], bl1[0]), Math.min(bl0[1], bl1[1]), Math.max(bl0[0], bl1[0]), Math.max(bl0[1], bl1[1]), 10, 19, sheet, f);
    const p0 = F.at(.15, F.depth * .72), p1 = F.at(.85, F.depth * .92); box(Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.max(p0[0], p1[0]), Math.max(p0[1], p1[1]), 17, 22, COL.pillow, f);
    const h0 = F.at(0, F.depth - .05), h1 = F.at(1, F.depth); box(Math.min(h0[0], h1[0]), Math.min(h0[1], h1[1]), Math.max(h0[0], h1[0]), Math.max(h0[1], h1[1]), 0, 34, wood, f); resetT(); },
  sofa(fu, f) { const F = fvFrame(fu), c = [[96, 70, 58], [64, 84, 104], [86, 98, 70]][fu.v || 0];
    const part = (u0, u1, d0, d1, z0, z1, k) => { const a = F.at(u0, d0), b = F.at(u1, d1); box(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), z0, z1, shade(c, k || 1), f); };
    part(0, 1, 0, F.depth, 0, 9, .8); part(0, 1, F.depth * .7, F.depth, 9, 32, .95); part(0, .14, 0, F.depth * .7, 9, 22, 1); part(.86, 1, 0, F.depth * .7, 9, 22, 1);
    part(.15, .5, .02, F.depth * .69, 9, 16, 1.12); part(.5, .85, .02, F.depth * .69, 9, 16, 1.12); resetT(); },
  tv(fu, f) { const F = fvFrame(fu), c = [86, 62, 44]; FBOX(fu, 0, 18, c, f); resetT();
    const a = F.at(.12, F.depth * .35), b = F.at(.88, F.depth * .55); box(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), 18, 44, [34, 34, 38], f); resetT();
    if (F.vis) { const p = [F.at(.16, F.depth * .35 - .006), F.at(.84, F.depth * .35 - .006)]; poly4(p[0][0], p[0][1], 21, p[1][0], p[1][1], 21, p[1][0], p[1][1], 41, p[0][0], p[0][1], 41, C([52, 70, 84], f)); } },
  shelf(fu, f) { const F = fvFrame(fu), H = 66, c = COL.shelf, [x0, y0, x1, y1] = fu.r, t = .04;
    const back = [F.at(0, F.depth - t), F.at(1, F.depth)]; box(Math.min(back[0][0], back[1][0]), Math.min(back[0][1], back[1][1]), Math.max(back[0][0], back[1][0]), Math.max(back[0][1], back[1][1]), 0, H, shade(c, .8), f);
    for (const u of [[0, t], [1 - t, 1]]) { const a = F.at(u[0], 0), b = F.at(u[1], F.depth); box(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), 0, H, c, f); }
    for (const z of [2, 22, 42, 62]) { const a = F.at(t, 0), b = F.at(1 - t, F.depth - t); box(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), z, z + 3, c, f); }
    if (fu.items && fu.items.length) for (let k = 0; k < 5; k++) { const u = .12 + k * .16, z = [5, 25, 45][k % 3], a = F.at(u, F.depth * .25), b = F.at(u + .1, F.depth * .8), col = [[180, 70, 60], [70, 110, 160], [210, 190, 90], [90, 140, 90], [200, 200, 196]][k];
      box(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), z, z + 12, col, f); }
    resetT(); },
  bookshelf(fu, f) { FV.shelf(Object.assign({}, fu, {items:[1]}), f); },
  crate(fu, f) { const F = fvFrame(fu), c = COL.crate; FBOX(fu, 0, 26, c, f, .04); resetT(); fvLine(F, .1, 4, .9, 22, shade(c, .7), f, 2); fvLine(F, .1, 13, .9, 13, shade(c, .7), f, 2); },
};
const FV_ALIAS = {locker:'wardrobe', desk:'cabinet', medshelf:'shelf', toolrack:'shelf', counter:'cabinet', armybox:'crate'};
// гладкая графика: мебель рисуется векторно (FV), иначе — пиксельный кадр
function objAtVec(id, name, wx, wy, f, alpha, offX, tint) {
  if (HDQ > 1 && id[0] === 'F' && name.startsWith('f_')) {
    const fu = furns[(+id.slice(1)) - 1], t = fu && (FV[fu.type] ? fu.type : FV_ALIAS[fu.type]);
    if (fu && FV[t]) {
      const [x0, y0, x1, y1] = fu.r, pad = 6;
      const xs = [SX(x0, y0), SX(x1, y0), SX(x0, y1), SX(x1, y1)].map(v => v - SX(wx, wy)), ys = [SY(x0, y0, 0), SY(x1, y0, 0), SY(x0, y1, 0), SY(x1, y1, 0)].map(v => v - SY(wx, wy, 0));
      const bx0 = Math.floor(Math.min(...xs) - pad), bx1 = Math.ceil(Math.max(...xs) + pad), by0 = Math.floor(Math.min(...ys) - 80), by1 = Math.ceil(Math.max(...ys) + pad);
      const key = 'v|' + t + '|' + Math.round(f * 40) + '|' + fu.r.map(v => Math.round(v * 100)).join(',') + '|' + (fu.items ? fu.items.length > 0 : 0) + '|' + (fu.v || 0);
      sprite(id + 'v', key, wx, wy, bx0, by0, bx1, by1, () => {
        // soft contact shadow, then the piece
        groundT(0); const g = ctx.createRadialGradient((x0 + x1) / 2, (y0 + y1) / 2, 0, (x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) * .75);
        g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x0 - .2, y0 - .2, x1 - x0 + .4, y1 - y0 + .4); resetT();
        FV[t](fu, f);
      }, alpha, offX);
      return;
    }
  }
  objAtPix(id, name, wx, wy, f, alpha, offX, tint);
}

// ---- finishing touches for smooth mode: soft edge lines on boxes, textures without blocky noise ----
FV.crate = function (fu, f) {
  const [x0, y0, x1, y1] = fu.r.map((v, k) => v + (k < 2 ? .04 : -.04)), c = COL.crate, H = 26;
  box(x0, y0, x1, y1, 0, H, c, f); resetT();
  const dk = C(c, f * .62), lt = C(c, f * 1.1);
  const seam = (ax, ay, bx, by, z, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(SX(ax, ay), SY(ax, ay, z)); ctx.lineTo(SX(bx, by), SY(bx, by, z)); ctx.stroke(); };
  for (const z of [H / 3, H * 2 / 3]) { seam(x0, y1, x1, y1, z, dk, 1); seam(x1, y1, x1, y0, z, dk, 1); }
  // corner posts and a diagonal brace on both visible sides
  ctx.strokeStyle = dk; ctx.lineWidth = 1.4; ctx.beginPath();
  ctx.moveTo(SX(x0 + .04, y1), SY(x0 + .04, y1, 2)); ctx.lineTo(SX(x1 - .04, y1), SY(x1 - .04, y1, H - 2));
  ctx.moveTo(SX(x1, y1 - .04), SY(x1, y1 - .04, 2)); ctx.lineTo(SX(x1, y0 + .04), SY(x1, y0 + .04, H - 2)); ctx.stroke();
  ctx.strokeStyle = lt; ctx.lineWidth = .6; ctx.beginPath(); for (const t of [.33, .66]) { const y = y0 + (y1 - y0) * t; ctx.moveTo(SX(x0, y), SY(x0, y, H)); ctx.lineTo(SX(x1, y), SY(x1, y, H)); } ctx.stroke();
};
// textures: the noise was painted pixel by pixel; in smooth mode soften it a touch so floors read as surfaces, not grids

// ---- small details on the kitchen pieces ----
const fvBox = (F, u0, u1, d0, d1, z0, z1, rgb, f) => { const a = F.at(u0, d0), b = F.at(u1, d1); box(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), z0, z1, rgb, f); };
FV.stove = function (fu, f) {
  const F = fvFrame(fu), H = 31, c = [234, 234, 230], D = F.depth;
  fvBox(F, 0, 1, 0, D, 0, H, c, f);
  fvBox(F, 0, 1, D * .82, D, H, H + 9, shade(c, .96), f);                       // back panel with the knobs
  resetT();
  for (const u of [.18, .34, .66, .82]) { fvEll(F, u, D * .86, H + 5, 2.2, 1.4, C([60, 60, 66], f)); fvEll(F, u, D * .86, H + 5.4, 1, .7, C([170, 170, 176], f)); }
  fvTopRect(F, .42, .58, D * .83, D * .9, H + 6.5, C([60, 160, 220], f * 1.1));     // little clock
  for (const [u, d] of [[.27, .22], [.73, .22], [.27, .58], [.73, .58]]) { fvEll(F, u, d * D, H + .3, 5.4, 2.8, C([30, 30, 34], f)); fvEll(F, u, d * D, H + .5, 3.6, 1.9, C([62, 62, 68], f)); fvEll(F, u, d * D, H + .7, 1.2, .7, C([120, 120, 126], f)); }
  fvQuad(F, .1, .9, 4, 21, [34, 34, 38], f); fvQuad(F, .16, .84, 7, 18, [58, 66, 74], f);   // oven door with its glass
  fvLine(F, .2, 22.5, .8, 22.5, [170, 170, 172], f, 1.8);                          // door handle
  fvQuad(F, .1, .9, 25.5, 29, shade(c, .9), f);                                    // control strip
  for (const u of [.25, .5, .75]) fvLine(F, u, 27, u, 27.6, [60, 60, 66], f, 2.2);
};
FV.sink = function (fu, f) {
  const F = fvFrame(fu), H = 30, wood = COL.cabinet, top = [212, 208, 198], D = F.depth;
  fvBox(F, .02, .98, .04, D, 0, H - 3, wood, f); fvBox(F, 0, 1, 0, D, H - 3, H, top, f);
  resetT();
  fvTopRect(F, .2, .8, D * .16, D * .7, H + .3, C([150, 156, 162], f)); fvTopRect(F, .25, .75, D * .21, D * .65, H + .3, C([112, 120, 128], f));
  fvEll(F, .5, D * .45, H + .4, 1.3, .7, C([60, 64, 70], f));                     // drain
  fvBox(F, .47, .53, D * .78, D * .88, H, H + 11, [196, 200, 206], f);             // faucet
  fvBox(F, .48, .52, D * .52, D * .84, H + 9, H + 11, [196, 200, 206], f);
  fvBox(F, .38, .43, D * .8, D * .86, H, H + 4, [180, 70, 64], f); fvBox(F, .57, .62, D * .8, D * .86, H, H + 4, [70, 110, 180], f);   // hot / cold
  resetT();
  fvQuad(F, .07, .48, 4, H - 7, shade(wood, 1.1), f); fvQuad(F, .52, .93, 4, H - 7, shade(wood, 1.1), f);
  fvLine(F, .42, 14, .42, 18, [230, 210, 160], f, 1.6); fvLine(F, .58, 14, .58, 18, [230, 210, 160], f, 1.6);
};
FV.cabinet = function (fu, f) {
  const F = fvFrame(fu), H = 30, wood = COL.cabinet, top = [212, 208, 198], D = F.depth;
  fvBox(F, .02, .98, .04, D, 0, H - 3, wood, f); fvBox(F, 0, 1, -.02, D, H - 3, H, top, f);   // the worktop overhangs a little
  resetT();
  fvQuad(F, .06, .94, H - 9, H - 4.5, shade(wood, 1.14), f); fvLine(F, .44, H - 6.8, .56, H - 6.8, [230, 210, 160], f, 1.5);   // drawer
  fvQuad(F, .06, .48, 3, H - 11, shade(wood, 1.1), f); fvQuad(F, .52, .94, 3, H - 11, shade(wood, 1.1), f);
  fvLine(F, .42, 11, .42, 15, [230, 210, 160], f, 1.6); fvLine(F, .58, 11, .58, 15, [230, 210, 160], f, 1.6);
  fvQuad(F, .02, .98, 0, 2, shade(wood, .55), f);                                  // toe kick
  if ((fu.x * 7 + fu.y * 3) % 3 === 0) {   // something left on the worktop
    fvBox(F, .2, .34, D * .4, D * .6, H, H + 7, [196, 70, 56], f); fvBox(F, .2, .34, D * .4, D * .6, H + 7, H + 8, [220, 220, 216], f);
  } else if ((fu.x + fu.y) % 3 === 1) { fvTopRect(F, .55, .85, D * .25, D * .7, H + .4, C([150, 104, 60], f)); }   // chopping board
  resetT();
};
FV.fridge = function (fu, f) {
  const F = fvFrame(fu), H = 66, c = [228, 230, 226], D = F.depth;
  fvBox(F, 0, 1, 0, D, 2, H, c, f); fvBox(F, .04, .96, .05, D * .95, 0, 2, [60, 60, 64], f);
  resetT();
  fvQuad(F, .04, .96, 4, 40, shade(c, 1.03), f); fvQuad(F, .04, .96, 42, H - 3, shade(c, 1.03), f);
  fvLine(F, .84, 22, .84, 36, [150, 154, 158], f, 2); fvLine(F, .84, 45, .84, 54, [150, 154, 158], f, 2);
  // magnets and a note when the door is in view
  fvQuad(F, .2, .36, 46, 56, [244, 236, 190], f); fvQuad(F, .45, .52, 52, 56, [200, 60, 60], f); fvQuad(F, .3, .4, 30, 34, [70, 130, 200], f);
  // the top edge gets a slight highlight so the box doesn't look flat from the back
  const p = [F.at(0, 0), F.at(1, 0)]; ctx.strokeStyle = C(c, f * 1.12, .7); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(SX(p[0][0], p[0][1]), SY(p[0][0], p[0][1], H)); ctx.lineTo(SX(p[1][0], p[1][1]), SY(p[1][0], p[1][1], H)); ctx.stroke();
};
FV.counter2 = FV.cabinet;
FV.table = function (fu, f) {
  const [x0, y0, x1, y1] = fu.r, c = [146, 106, 68], t = .06;
  for (const [a, b] of [[x0 + .06, y0 + .06], [x1 - .06 - t, y0 + .06], [x0 + .06, y1 - .06 - t], [x1 - .06 - t, y1 - .06 - t]]) box(a, b, a + t, b + t, 0, 21, shade(c, .78), f);
  box(x0 + .05, y0 + .05, x1 - .05, y1 - .05, 18, 21, shade(c, .85), f);   // apron under the top
  box(x0, y0, x1, y1, 21, 24, c, f); resetT();
  // a mug and a plate
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  ctx.fillStyle = C([236, 234, 228], f); ctx.beginPath(); ctx.ellipse(SX(cx - .12, cy + .06), SY(cx - .12, cy + .06, 24.3), 6, 3, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = C([210, 206, 196], f); ctx.beginPath(); ctx.ellipse(SX(cx - .12, cy + .06), SY(cx - .12, cy + .06, 24.4), 3.6, 1.8, 0, 0, 6.283); ctx.fill();
  box(cx + .1, cy - .12, cx + .2, cy - .02, 24, 30, [70, 110, 160], f); resetT();
};
