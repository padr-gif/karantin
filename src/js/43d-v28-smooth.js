// ================= v28 (trial): smooth graphics =================
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
function hdReset() { clearCaches(); texCache.clear(); fogDirty = true; }
function hdApply() { const q = hdQ(); if (q !== HDQ) { HDQ = q; hdReset(); } }

// ---- caches: same layout, HDQ× finer ----
sprite = function (id, key, wx, wy, bx0, by0, bx1, by1, fn, alpha, offX) {
  let s = SPR.get(id);
  const w = Math.max(1, Math.ceil(bx1 - bx0)), h = Math.max(1, Math.ceil(by1 - by0));
  if (!s || s.q !== HDQ || (s.key !== key && bakes < BAKE_BUDGET)) {
    const cw = w * HDQ, chh = h * HDQ;
    const c = s && s.c.width === cw && s.c.height === chh ? s.c : mkCanvas(cw, chh);
    const g = hdCtx(c.getContext('2d'));
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, chh); g.imageSmoothingEnabled = false;
    const sc = ctx, sox = ox, soy = oy, sd = DPR;
    ctx = g; ox = -bx0 - (wx - wy) * U; oy = -by0 - (wx + wy) * hh; baking = true; DPR = HDQ;
    resetT();
    try { fn(); } finally { ctx = sc; ox = sox; oy = soy; baking = false; DPR = sd; resetT(); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false; }
    if (!s) { s = {c}; SPR.set(id, s); }
    s.c = c; s.key = key; s.q = HDQ; s.w = w; s.h = h; bakes++;
  }
  s.used = frameNo;
  const px = rd(SX(wx, wy) + bx0 + (offX || 0)), py = rd(SY(wx, wy, 0) + by0);
  if (alpha != null && alpha < 1) ctx.globalAlpha = alpha;
  if (HDQ > 1) ctx.drawImage(s.c, px, py, s.w, s.h); else ctx.drawImage(s.c, px, py);
  ctx.globalAlpha = 1;
};
withChunk = function (ch, fn) {
  const sc = ctx, sox = ox, soy = oy, sd = DPR;
  ctx = ch.g; ox = CH * U - (ch.ax - ch.ay) * U; oy = -(ch.ax + ch.ay) * hh; baking = true; DPR = ch.q || 1;
  ctx.save();
  groundT(0); ctx.beginPath(); ctx.rect(ch.ax, ch.ay, CH, CH); resetT(); ctx.clip();
  try { fn(); } finally { ctx.restore(); ctx = sc; ox = sox; oy = soy; baking = false; DPR = sd; resetT(); }
};
getChunk = function (cx, cy) {
  const key = cx + ',' + cy;
  let ch = CHUNKS.get(key);
  if (!ch || ch.q !== HDQ) {
    const c = mkCanvas((2 * CH * U + 2) * HDQ, (CH * U + 2) * HDQ);
    ch = {c, g:hdCtx(c.getContext('2d')), ax:cx * CH, ay:cy * CH, used:0, q:HDQ};
    ch.g.imageSmoothingEnabled = false;
    withChunk(ch, () => drawGroundRange(ch.ax - 1, ch.ay - 1, ch.ax + CH, ch.ay + CH));
    CHUNKS.set(key, ch);
  }
  ch.used = frameNo;
  return ch;
};
const evict28 = evict;
evict = function () {
  evict28();
  if (HDQ > 1 && CHUNKS.size > HD_CH_MAX) { const arr = [...CHUNKS].sort((a, b) => a[1].used - b[1].used); for (let k = 0; k < arr.length - HD_CH_MAX * .75; k++) CHUNKS.delete(arr[k][0]); }
};
// the frame draws a chunk at its 1× size; in smooth mode it is HDQ× bigger, so scale it down
{ const di = CanvasRenderingContext2D.prototype.drawImage;
  mainCtx.drawImage = function (img, a, b, c, d, e, f, g, h) {
    if (arguments.length === 3 && img && img._chq > 1) return di.call(this, img, a, b, img.width / img._chq, img.height / img._chq);
    return di.apply(this, arguments);
  }; }
const getChunk28 = getChunk;
getChunk = function (cx, cy) { const ch = getChunk28(cx, cy); ch.c._chq = ch.q; return ch; };

// ---- textures: painted HDQ× denser from the same continuous noise ----
const paint28 = paint;
paint = function (size, fn) {
  if (HDQ <= 1) return paint28(size, fn);
  const q = HDQ, c = paint28(size * q, (x, y) => fn(x / q, y / q));
  const g = c.getContext('2d'); g.setTransform(q, 0, 0, q, 0, 0);   // later strokes by the maker land in the same place
  c._q = q; return c;
};
pattern = function (key, make) {
  const k = key + '@' + HDQ; let p = texCache.get(k);
  if (!p) {
    const cnv = make(); hdCtx(mainCtx);
    p = mainCtx.createPattern(cnv, 'repeat');
    const q = cnv._q || (cnv.width > 0 && HDQ > 1 ? HDQ : 1);
    try { if (p && p.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix([1 / (TP * q), 0, 0, 1 / (TP * q), 0, 0])); } catch (e) {}
    texCache.set(k, p);
  }
  return p;
};

// ---- setting ----
SETTINGS_DEF.smooth = false; if (settings.smooth == null) settings.smooth = false;
const applySettings28 = applySettings;
applySettings = function () { applySettings28(); hdApply(); };
addEventListener('resize', () => hdApply());
{ const row = document.querySelector('#sGfx'); if (row) { const set = row.closest('.set'), n = set.cloneNode(true);
  n.querySelector('b').textContent = 'Стиль графики'; n.querySelector('small').textContent = 'Пиксели как раньше или гладкая картинка (проба)'; n.querySelector('.seg').id = 'sSmooth'; set.after(n); } }
const openSettings28 = openSettings;
openSettings = function (from) { openSettings28(from); seg($('sSmooth'), [[false, 'Пиксели'], [true, 'Гладкая']], () => !!settings.smooth, v => { settings.smooth = v; saveSettings(); }); };
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
const objAt28 = objAt;
objAt = function (id, name, wx, wy, f, alpha, offX, tint) {
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
  objAt28(id, name, wx, wy, f, alpha, offX, tint);
};

// ---- finishing touches for smooth mode: soft edge lines on boxes, textures without blocky noise ----
const box28 = box;
box = function (x0, y0, x1, y1, z0, z1, rgb, f, a, tex) {
  box28(x0, y0, x1, y1, z0, z1, rgb, f, a, tex);
  if (HDQ <= 1 || !baking) return;
  const P_ = (x, y, z) => [SX(x, y), SY(x, y, z)], L = (pts, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };
  if (a != null && a < 1) ctx.globalAlpha = a;
  // outline of the silhouette, a lit rim on the top's front edges, a dark crease at the front corner
  L([P_(x0, y1, z0), P_(x1, y1, z0), P_(x1, y0, z0), P_(x1, y0, z1), P_(x0, y0, z1), P_(x0, y1, z1), P_(x0, y1, z0)], C(rgb, f * .38, .55), .7);
  L([P_(x0, y1, z1), P_(x1, y1, z1), P_(x1, y0, z1)], C(rgb, Math.min(1.6, f * 1.35), .6), .6);
  L([P_(x1, y1, z1), P_(x1, y1, z0)], C(rgb, f * .55, .5), .6);
  ctx.globalAlpha = 1;
};
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
const paint28b = paint;
paint = function (size, fn) {
  const c = paint28b(size, fn); if (HDQ <= 1 || !c._q) return c;
  try {
    const t = mkCanvas(c.width, c.height), g = t.getContext('2d');
    g.filter = 'blur(' + (c._q * .45).toFixed(2) + 'px)';
    for (const [dx, dy] of [[0, 0], [-c.width, 0], [c.width, 0], [0, -c.height], [0, c.height]]) g.drawImage(c, dx, dy);   // wrap so the tile stays seamless
    const cg = c.getContext('2d'); cg.save(); cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, c.width, c.height); cg.drawImage(t, 0, 0); cg.restore();
  } catch (e) {}
  return c;
};
