// ================= textures =================
const TP = 32; // texture pixels per tile / per U of height
const texCache = new Map();
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function vnP(x, y, per) { // periodic value noise
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const m = v => ((v % per) + per) % per;
  const s = t => t * t * (3 - 2 * t);
  const a = hash(m(xi), m(yi)), b = hash(m(xi + 1), m(yi)), c = hash(m(xi), m(yi + 1)), d = hash(m(xi + 1), m(yi + 1));
  const u = s(xf), v = s(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, per) { return vnP(x, y, per) * .55 + vnP(x * 2, y * 2, per * 2) * .3 + vnP(x * 4, y * 4, per * 4) * .15; }
// per-pixel painter: fn(x, y) -> [r,g,b,a?]
// текстура size×size из функции цвета fn(x, y); в детальной графике — HDQ× мельче и слегка размыта (бесшовно)
function paint(size, fn) {
  if (HDQ <= 1) return paintRaw(size, fn);
  const q = HDQ, c = paintRaw(size * q, (x, y) => fn(x / q, y / q));
  const g = c.getContext('2d'); g.setTransform(q, 0, 0, q, 0, 0);   // later strokes by the maker land in the same place
  c._q = q;
  try {
    const t = mkCanvas(c.width, c.height), g = t.getContext('2d');
    g.filter = 'blur(' + (c._q * .45).toFixed(2) + 'px)';
    for (const [dx, dy] of [[0, 0], [-c.width, 0], [c.width, 0], [0, -c.height], [0, c.height]]) g.drawImage(c, dx, dy);   // wrap so the tile stays seamless
    const cg = c.getContext('2d'); cg.save(); cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, c.width, c.height); cg.drawImage(t, 0, 0); cg.restore();
  } catch (e) {}
  return c;
}
function paintRaw(size, fn) {
  const c = mkCanvas(size, size), g = c.getContext('2d');
  const img = g.createImageData(size, size), d = img.data;
  if (d && d.length) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const p = fn(x, y), k = (y * size + x) * 4;
    d[k] = p[0]; d[k + 1] = p[1]; d[k + 2] = p[2]; d[k + 3] = p.length > 3 ? p[3] : 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shadeC = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
function pattern(key, make) {
  const k = key + '@' + HDQ; let p = texCache.get(k);
  if (!p) {
    const cnv = make(); hdCtx(mainCtx);
    p = mainCtx.createPattern(cnv, 'repeat');
    const q = cnv._q || (cnv.width > 0 && HDQ > 1 ? HDQ : 1);
    try { if (p && p.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix([1 / (TP * q), 0, 0, 1 / (TP * q), 0, 0])); } catch (e) {}
    texCache.set(k, p);
  }
  return p;
}
const TX = {
  grass: () => pattern('grass', () => {
    const S = 512, per = 8;
    const c = paint(S, (x, y) => {
      const n = fbm(x / 64, y / 64, per), m = vnP(x / 22, y / 22, 24), sp = hash(x, y);
      let col = mix([46,62,36], [74,92,50], n);
      col = mix(col, [86,84,52], Math.max(0, m - .72) * 1.6);
      const k = .92 + sp * .16;
      return shadeC(col, k);
    });
    const g = c.getContext('2d');
    const blades = [[64,86,44],[84,108,56],[100,124,62],[52,72,38],[110,120,70]];
    for (let i = 0; i < 4200; i++) {
      const x = hash(i, 11) * S, y = hash(i, 37) * S, l = 3 + hash(i, 5) * 7, a = -1.57 + (hash(i, 9) - .5) * .9;
      const col = blades[Math.floor(hash(i, 3) * blades.length)];
      g.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},.85)`; g.lineWidth = 1 + hash(i, 13);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    for (let i = 0; i < 40; i++) { g.fillStyle = hash(i, 71) < .5 ? 'rgba(230,222,140,.9)' : 'rgba(240,240,236,.9)'; g.fillRect(hash(i, 51) * S, hash(i, 61) * S, 2, 2); }
    return c;
  }),
  asphalt: () => pattern('asphalt', () => paint(256, (x, y) => {
    const n = fbm(x / 48, y / 48, 256 / 48 | 0 || 5), s = hash(x * 3, y * 7);
    let v = 46 + n * 14 + (s - .5) * 10;
    if (s > .965) v += 34; else if (s < .03) v -= 14;
    return [v, v + 1, v + 4];
  })),
  sidewalk: () => pattern('sidewalk', () => {
    const c = paint(256, (x, y) => {
      const n = fbm(x / 40, y / 40, 6), s = hash(x * 5, y * 3);
      let v = 138 + n * 22 + (s - .5) * 12;
      if (x % 64 < 2 || y % 64 < 2) v -= 42;
      else if (x % 64 < 3 || y % 64 < 3) v += 10;
      return [v, v, v - 2];
    });
    const g = c.getContext('2d'); g.strokeStyle = 'rgba(70,70,70,.5)'; g.lineWidth = 1;
    for (let i = 0; i < 6; i++) { let x = hash(i, 4) * 256, y = hash(i, 8) * 256; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (hash(i, k) - .5) * 24; y += hash(k, i) * 14; g.lineTo(x, y); } g.stroke(); }
    return c;
  }),
  wood: () => pattern('wood', () => {
    const tones = [[122,88,58],[112,80,52],[132,96,62],[104,74,48],[126,92,56]];
    return paint(256, (x, y) => {
      const row = Math.floor(y / 16), off = hash(row, 3) * 256, len = 96 + Math.floor(hash(row, 7) * 3) * 32;
      const seg = Math.floor((x + off) / len);
      const base = tones[Math.floor(hash(row, seg + 13) * tones.length)];
      const yy = y % 16, xx = (x + off) % len;
      const grain = Math.sin((x * .07 + fbm(x / 30, y / 6, 64) * 7 + row * 3)) * .06 + (hash(x, y) - .5) * .06;
      let k = 1 + grain;
      if (yy < 1) k = .55; else if (yy < 2) k *= .85; else if (yy > 14) k *= 1.05;
      if (xx < 1) k = .6;
      const knot = Math.hypot(xx - len * hash(row, seg), yy - 8);
      if (knot < 3) k *= .75 + knot * .07;
      return shadeC(base, k);
    });
  }),
  kitchen: () => pattern('kitchen', () => paint(256, (x, y) => {
    const tx = Math.floor(x / 32), ty = Math.floor(y / 32), xx = x % 32, yy = y % 32;
    const base = (tx + ty) & 1 ? [204,200,188] : [150,160,166];
    let k = .96 + hash(tx, ty) * .06 + (hash(x, y) - .5) * .05;
    if (xx < 2 || yy < 2) return [96, 94, 90];
    if (xx < 6 && yy < 6) k *= 1.06;
    return shadeC(base, k);
  })),
  store: () => pattern('store', () => paint(256, (x, y) => {
    const xx = x % 32, yy = y % 32;
    if (xx < 1 || yy < 1) return [120,120,116];
    const k = .95 + hash(Math.floor(x / 32), Math.floor(y / 32)) * .08 + fbm(x / 50, y / 50, 5) * .06;
    return shadeC([190,188,180], k);
  })),
  concrete: () => pattern('concrete', () => paint(256, (x, y) => {
    const n = fbm(x / 34, y / 34, 7), st = vnP(x / 70, y / 70, 4);
    let v = 104 + n * 20 + (hash(x, y) - .5) * 10 - Math.max(0, st - .6) * 50;
    return [v, v - 2, v - 6];
  })),
  siding: rgb => pattern('siding' + rgb, () => paint(256, (x, y) => {
    // rows grow upward on the wall; each 16px board has a shadow at its lower edge
    const yy = y % 8, grain = (hash(x >> 2, y >> 3) - .5) * .05 + (hash(x, y) - .5) * .03;
    let k = .9 + yy / 8 * .14 + grain;
    if (yy < 1) k = .64;
    return shadeC(rgb, k);
  })),
  paper: (rgb, style) => pattern('paper' + rgb + style, () => paint(256, (x, y) => {
    if (y < 4) { const k = y > 2 ? 1.1 : .92; return shadeC([210,204,192], k); } // baseboard at the floor
    if (y < 5) return [120,110,96];
    let k = 1 + (hash(x, y) - .5) * .03;
    if (style === 1 && x % 16 < 6) k *= .93;
    if (style === 2 && (x + (Math.floor(y / 12) % 2) * 8) % 16 < 2 && y % 12 < 2) k *= .84;
    if (y > 250) k *= .92;
    return shadeC(rgb, k);
  })),
  brick: () => pattern('brick', () => paint(256, (x, y) => {
    const row = Math.floor(y / 6), xx = (x + (row & 1) * 8) % 16, yy = y % 6;
    if (yy < 1 || xx < 1) return [150,146,138];
    const t = hash(Math.floor((x + (row & 1) * 8) / 16), row);
    return shadeC(mix([140,70,52], [118,62,48], t), .92 + (hash(x, y) - .5) * .12);
  })),
  planksV: rgb => pattern('planksV' + rgb, () => paint(256, (x, y) => {
    const col = Math.floor(x / 8), xx = x % 8;
    let k = .9 + hash(col, 5) * .14 + Math.sin(y * .05 + fbm(x / 6, y / 30, 40) * 6) * .04;
    if (xx < 1) k = .55;
    return shadeC(rgb, k);
  })),
  shingles: (rgb, rot) => pattern('shing' + rgb + rot, () => paint(256, (px, py) => {
    const x = rot ? py : px, y = rot ? px : py;
    const row = Math.floor(y / 8), yy = y % 8, xx = (x + (row & 1) * 8) % 16;
    const tab = hash(Math.floor((x + (row & 1) * 8) / 16), row);
    let k = .86 + tab * .18 + (hash(px, py) - .5) * .06;
    if (yy > 6) k *= .62;
    else if (xx < 1 && yy > 2) k *= .72;
    return shadeC(rgb, k);
  })),
  metal: (rgb, rot) => pattern('metal' + rgb + rot, () => paint(256, (px, py) => {
    const v = rot ? py : px;
    const k = .86 + Math.sin(v / 4 * Math.PI) * .1 + (hash(px, py) - .5) * .03;
    return shadeC(rgb, k);
  })),
  grain: () => pattern('grain', () => paint(128, (x, y) => {
    const n = fbm(x / 10, y / 10, 12), s = hash(x, y);
    const v = n * .6 + s * .4;
    return v > .5 ? [255,255,255, (v - .5) * 50] : [0,0,0, (.5 - v) * 70];
  })),
  fabric: () => pattern('fabric', () => paint(64, (x, y) => ((x + y) % 4 < 2) ? [0,0,0,28] : [255,255,255,14])),
  woodLight: rgb => pattern('woodL' + rgb, () => paint(256, (x, y) => {
    const k = .92 + Math.sin(y * .06 + fbm(x / 50, y / 8, 5) * 6) * .06 + (hash(x, y) - .5) * .05;
    return shadeC(rgb, k);
  })),
};
