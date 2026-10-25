// ================= v31: детальные полы, земля и стены =================
// Полы и земля — плитки hd_g_* (лист tiles3, ×3): доски с волокнами, кафель с затиркой, ковролин, трава, асфальт.
// Стены — те же текстуры-узоры, но в детальном режиме нарисованы плавно, в непрерывных координатах:
// обои с узором и швами, профильный плинтус, тень под потолком; сайдинг, кирпич, доски, кровля.
// Единицы текстуры: TP = 32 px на метр; на стене y = 0 у пола, высота стены ~77.

// ---- плитки: детальный кадр, если он есть ----

// ---- плавные текстуры стен ----
const smo = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const md = (v, m) => ((v % m) + m) % m;
const nz = (x, y, per) => vnP(x, y, per);                    // гладкий периодический шум
const TX30 = Object.assign({}, TX);
const detail = (key, base, fn) => HDQ > 1 ? pattern(key + '@d', () => paint(256, fn)) : base();
// обои: 0 — однотонные с фактурой, 1 — полосы, 2 — мелкий узор; профильный плинтус, тень у пола и под потолком
TX.paper = (rgb, style) => detail('paper' + rgb + style, () => TX30.paper(rgb, style), (x, y) => {
  if (y < 5.2) {                                                             // плинтус
    const k = y > 4.4 ? 1.12 : y > 3.6 ? 1.02 : .9 + y * .025;
    return shadeC([214, 208, 196], k * (1 - .04 * smo(nz(x / 9, y / 3, 28), .4, .9)));
  }
  if (y < 5.9) return [96, 88, 78];                                           // щель над плинтусом
  let k = 1 + (nz(x / 3, y / 3, 85) - .5) * .035 + (nz(x / 1.2, y / 1.2, 213) - .5) * .02;   // фактура бумаги
  if (style === 1) { const u = md(x, 16); k *= .94 + .06 * smo(Math.abs(u - 8), 3.5, 4.5) - .05 * (1 - smo(Math.abs(u - 1), .3, .8)); }
  if (style === 2) {
    const row = Math.floor(y / 12), u = md(x + (row & 1) * 8, 16) - 8, v = md(y, 12) - 6;
    const d = Math.abs(u) / 2.6 + Math.abs(v) / 2.2;                          // ромбик
    k *= 1 - .1 * (1 - smo(d, .8, 1.15)) + .04 * (1 - smo(Math.hypot(u, v - 6), .5, 1));
  }
  k *= 1 - .025 * (1 - smo(Math.abs(md(x, 32) - 16), 15.4, 16));             // стыки полотен
  k *= 1 - .1 * (1 - smo(y, 5.9, 11));                                        // тень над полом
  k *= 1 - .12 * smo(y, 58, 77);                                              // тень под потолком
  return shadeC(rgb, k);
});
// сайдинг: доски внахлёст, тень под нижним краем каждой, волокна, редкие торцевые стыки
TX.siding = rgb => detail('siding' + rgb, () => TX30.siding(rgb), (x, y) => {
  const row = Math.floor(y / 8), yy = md(y, 8);
  let k = .86 + .16 * (yy / 8) + (nz(x / 22, y / 2.5 + row * 7, 12) - .5) * .06 + (nz(x / 3, y / 1.5, 85) - .5) * .025;
  k *= .6 + .4 * smo(yy, 0, 1.4);                                             // тень от верхней доски
  if (yy > 6.9) k *= 1.06;                                                    // светлая кромка
  const j = md(x + hash(row, 5) * 256, 128);
  k *= 1 - .3 * (1 - smo(Math.min(j, 128 - j), .2, .9));                      // стык досок
  return shadeC(rgb, k);
});
TX.brick = () => detail('brick', () => TX30.brick(), (x, y) => {
  const row = Math.floor(y / 6), bx = x + (row & 1) * 8, xx = md(bx, 16), yy = md(y, 6);
  const m = Math.min(smo(xx, .3, 1.2), smo(16 - xx, .3, 1.2), smo(yy, .3, 1.1), smo(6 - yy, .2, .9));
  const t = hash(Math.floor(bx / 16), row);
  const brick = shadeC(mix([146, 74, 54], [116, 60, 46], t), .93 + (nz(x / 2, y / 2, 128) - .5) * .12 + .06 * smo(yy, 4, 5.5));
  return mix([156, 150, 140], brick, m);
});
TX.planksV = rgb => detail('planksV' + rgb, () => TX30.planksV(rgb), (x, y) => {
  const xx = md(x, 8), col = Math.floor(x / 8);
  let k = .9 + hash(col, 5) * .12 + Math.sin(y * .05 + nz(x / 6, y / 30, 40) * 6) * .04 + (nz(x / 2, y / 8, 128) - .5) * .04;
  k *= .55 + .45 * Math.min(smo(xx, 0, 1), smo(8 - xx, 0, .6));
  return shadeC(rgb, k);
});
TX.shingles = (rgb, rot) => detail('shing' + rgb + rot, () => TX30.shingles(rgb, rot), (px, py) => {
  const x = rot ? py : px, y = rot ? px : py;
  const row = Math.floor(y / 8), yy = md(y, 8), bx = x + (row & 1) * 8, xx = md(bx, 16);
  let k = .86 + hash(Math.floor(bx / 16), row) * .16 + (nz(px / 1.5, py / 1.5, 170) - .5) * .1;    // зернистая посыпка
  k *= 1 - .38 * smo(yy, 6, 8);                                               // тень под рядом
  k *= 1 - .25 * (1 - smo(Math.min(xx, 16 - xx), .2, .9)) * smo(yy, 2, 3);    // прорези между лепестками
  return shadeC(rgb, k);
});
TX.woodLight = rgb => detail('woodL' + rgb, () => TX30.woodLight(rgb), (x, y) => {
  const k = .92 + Math.sin(y * .06 + nz(x / 50, y / 8, 5) * 6) * .06 + (nz(x / 2, y / 6, 128) - .5) * .04;
  return shadeC(rgb, k);
});
// ковры на полу — с каймой и узором вместо трёх вложенных прямоугольников
function rugTex(c) {
  const k = c.join(); let cv = RUGTEX.get(k); if (cv) return cv;
  const S = 96; cv = mkCanvas(S, S); const g = cv.getContext('2d'), img = g.createImageData(S, S), d = img.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = (x + .5) / S - .5, v = (y + .5) / S - .5, e = Math.max(Math.abs(u), Math.abs(v));
    let t = 1;
    if (e > .44) t = .78; else if (e > .4) t = 1.12; else if (e > .37) t = .86;
    const dm = Math.abs(u) / .26 + Math.abs(v) / .26;
    if (e < .37 && Math.abs(md(dm * 3, 1) - .5) < .08) t *= .82;
    t *= .94 + nz(x / 2, y / 2, 48) * .1;
    const i = (y * S + x) * 4; d[i] = c[0] * t; d[i + 1] = c[1] * t; d[i + 2] = c[2] * t; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); RUGTEX.set(k, cv); return cv;
}
