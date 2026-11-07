// ================= «Состояние → Тело»: новая фигурка героя и пульс =================
// Фигура рисуется слоями: тёмный контур под всем, кожа, бельё, одежда по зонам (короткий/длинный рукав, шорты/штаны,
// кроссовки/ботинки, перчатки, шапка, маска), объём, лицо с мимикой, раны и шрамы, поверх — прозрачные зоны для нажатия.
// Лицо живое: боль — оскал, стресс — брови домиком, усталость — тяжёлые веки, жар — румянец, холод — бледность и синие губы.
// Под фигурой — пульс: частота и сила зависят от паники, бега, кровопотери, жара и холода.

// ---- контуры частей тела (мужчина; женщине — свои грудь, талия и бёдра) ----
const BF = {
  head:'M70 7 C79 7 84.5 13.5 84.5 22 C84.5 29.5 79.5 36.5 70 36.5 C60.5 36.5 55.5 29.5 55.5 22 C55.5 13.5 61 7 70 7 Z' +
    'M56 19.5 Q52.6 19.6 53 23.4 Q53.6 27 56.6 26.6 Z M84 19.5 Q87.4 19.6 87 23.4 Q86.4 27 83.4 26.6 Z',
  neck:'M63.5 31.5 Q70 37 76.5 31.5 L77.6 43.6 Q70 46.6 62.4 43.6 Z',
  chest:'M62.4 42.6 Q70 46.6 77.6 42.6 Q85 45 91 46 Q98 47.5 99 55 L97.5 66 Q96 73.5 94.5 80 Q70 85 45.5 80 Q44 73.5 42.5 66 L41 55 Q42 47.5 49 46 Q55 45 62.4 42.6 Z',
  belly:'M45.5 80 Q70 85 94.5 80 Q93.5 87 93 93 Q93.5 99.5 95 105.5 Q70 112 45 105.5 Q46.5 99.5 47 93 Q46.5 87 45.5 80 Z',
  armR:'M50 46.5 Q40.5 46.5 37.6 55.5 Q36.2 62 35.6 70 L34.6 84 Q33.6 90 32.6 98 L30.2 114.5 Q33.4 116.8 36.6 115.6 L38.8 99 Q40.2 91 41.2 86 L42.8 74 Q43.6 68 44.2 62 Z',
  handR:'M30 114 Q26.2 117.5 25.4 123.5 Q25 129.5 28.6 132.6 Q32.4 134.8 35.4 131.4 Q37.2 128.6 37.4 124.4 Q39.4 121.6 39.2 119.2 Q38.2 118 37 118.6 L36.8 115.4 Z',
  legR:'M45 104 Q56 110.5 69.4 109.5 Q69.6 116 69 124 Q68.2 138 67 150 Q66.6 156 66.4 162 Q65.8 175 64.8 187 Q66.4 191 66.8 194.6 Q67 198.6 63 198.8 L55.6 198.8 ' +
    'Q51.6 198.6 51.8 194.6 Q52.2 191 53.6 187 Q52.4 176 51.6 166 Q50.6 158 49.4 150 Q46.4 133 45.6 118 Q45.2 110 45 104 Z',
};
const BF_F = {
  chest:'M63.5 42.6 Q70 46.2 76.5 42.6 Q83 45 88.5 46 Q95 47.5 95.8 55 L94.6 64 Q95.6 70.5 92 75 Q91 78 90.6 80 Q70 84 49.4 80 Q49 78 48 75 Q44.4 70.5 45.4 64 L44.2 55 Q45 47.5 51.5 46 Q57 45 63.5 42.6 Z',
  belly:'M49.4 80 Q70 84 90.6 80 Q89.6 87 90 92 Q92.5 99 96.2 105.5 Q70 112.5 43.8 105.5 Q47.5 99 50 92 Q50.4 87 49.4 80 Z',
};
// зеркало пути: x → 140 − x (числа в путях — пары x y; у Q/C/L/M все аргументы — пары)
const bfMirror = d => d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (m, x, y) => +(140 - x).toFixed(2) + ' ' + y);
BF.armL = bfMirror(BF.armR); BF.handL = bfMirror(BF.handR); BF.legL = bfMirror(BF.legR);
const BF_ORDER = ['legR', 'legL', 'armR', 'armL', 'handR', 'handL', 'belly', 'chest', 'neck', 'head'];   // руки и ноги под торсом: швы прячутся
function bfShapes(lk) {
  const S = Object.assign({}, BF);
  if (lk && lk.g === 'f') {
    Object.assign(S, BF_F);
    for (const k of ['legR', 'legL']) S[k] = k === 'legR' ? BF.legR.replace('M45 104', 'M43.6 104').replace('Q45.2 110 45 104', 'Q43.8 110 43.6 104') : bfMirror(BF.legR.replace('M45 104', 'M43.6 104').replace('Q45.2 110 45 104', 'Q43.8 110 43.6 104'));
  }
  return S;
}
const bfShift = (lk, r) => lk && lk.g === 'f' && /^(arm|hand)/.test(r) ? (r.endsWith('R') ? ' transform="translate(3 0)"' : ' transform="translate(-3 0)"') : '';
// раны и шрамы — по новой фигуре
Object.assign(REG.head, {at:[70, 21]}); Object.assign(REG.neck, {at:[70, 39]}); Object.assign(REG.chest, {at:[70, 61]}); Object.assign(REG.belly, {at:[70, 94]});
Object.assign(REG.armR, {at:[38.5, 80]}); Object.assign(REG.armL, {at:[101.5, 80]}); Object.assign(REG.legR, {at:[58.5, 145]}); Object.assign(REG.legL, {at:[81.5, 145]});
if (REG.handR) { REG.handR.at = [31, 124]; REG.handL.at = [109, 124]; }
Object.assign(SCAR_AT, {head:[70, 15], neck:[70, 39], chest:[70, 59], belly:[70, 95], armR:[38.5, 84], armL:[101.5, 84], legR:[58, 147], legL:[82, 147]});
for (const r of BF_ORDER) REGP[r] = '<path d="' + BF[r] + '"/>';                // зоны нажатия совпадают с рисунком

// ---- одежда по зонам outfitRegs: 1 торс, 2–4 рука сверху вниз, 5 кисть, 6 таз, 7–10 нога сверху вниз, 11 стопа, 12 макушка, 13 шея и лицо ----
const BF_ZONE = {
  1:[['chest'], ['belly']],
  2:[['armR', 0, 66], ['armL', 0, 66]], 3:[['armR', 66, 87], ['armL', 66, 87]], 4:[['armR', 87, 117], ['armL', 87, 117]], 5:[['handR'], ['handL']],
  6:[['belly', 99, 206], ['legR', 0, 116], ['legL', 0, 116]], 7:[['legR', 116, 133], ['legL', 116, 133]], 8:[['legR', 133, 152], ['legL', 133, 152]],
  9:[['legR', 152, 172], ['legL', 152, 172]], 10:[['legR', 172, 188.5], ['legL', 172, 188.5]], 11:[['legR', 188.5, 206], ['legL', 188.5, 206]],
};
const BF_HAT = 'M54.6 19.6 Q53.8 5.6 70 4.8 Q86.2 5.6 85.4 19.6 Q70 15.4 54.6 19.6 Z';
const BF_MASK = 'M56.4 24.6 Q70 22.2 83.6 24.6 Q83.4 32.6 77.4 35.8 Q70 38.8 62.6 35.8 Q56.6 32.6 56.4 24.6 Z';
const bfMix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const bfRgb = c => 'rgb(' + c.slice(0, 3).join(',') + ')';
const bfDark = (c, k) => bfRgb(c.map(v => v * (1 - k)));
let bfClipN = 0, bfExtra = '';
function bfPiece(S, lk, list, attrs) {
  let s = '';
  for (const [r, y0, y1] of list) {
    const p = `<path d="${S[r]}"${attrs || ''}/>`;
    if (y0 == null) { s += `<g${bfShift(lk, r)}>${p}</g>`; continue; }
    const id = 'bfy' + (bfClipN++); bfExtra += `<clipPath id="${id}"><rect x="0" y="${y0}" width="140" height="${y1 - y0}"/></clipPath>`;
    s += `<g${bfShift(lk, r)} clip-path="url(#${id})">${p}</g>`;
  }
  return s;
}
function bfDefs(S, lk) {
  let s = '<defs>';
  for (const r of BF_ORDER) s += `<clipPath id="bfc-${r}"><path d="${S[r]}"${bfShift(lk, r)}/></clipPath>`;
  s += '<linearGradient id="bf-sh" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff2dc" stop-opacity=".2"/><stop offset=".38" stop-color="#fff" stop-opacity="0"/><stop offset=".72" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></linearGradient>';
  s += '<radialGradient id="bf-glow"><stop offset="0" stop-color="#ff5a48" stop-opacity=".55"/><stop offset="1" stop-color="#ff5a48" stop-opacity="0"/></radialGradient>';
  s += '<pattern id="bfp-denim" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0 V3" stroke="#fff" stroke-opacity=".13" stroke-width="1"/></pattern>';
  s += '<pattern id="bfp-plaid" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 2 H9 M2 0 V9" stroke="#000" stroke-opacity=".32" stroke-width="2.2"/><path d="M0 6.5 H9 M6.5 0 V9" stroke="#fff" stroke-opacity=".14" stroke-width=".7"/></pattern>';
  s += '<pattern id="bfp-camo" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M2 3 q5 -3 8 1 t6 4 q-3 4 -8 2 t-6 -7 Z M13 13 q4 -2 7 1 q-1 5 -5 5 q-4 -1 -2 -6 Z" fill="#1e2412" fill-opacity=".42"/><path d="M3 15 q3 -2 5 1 q-1 3 -4 2 Z M15 2 q3 0 3 3 q-3 1 -4 -1 Z" fill="#c8b98a" fill-opacity=".28"/></pattern>';
  s += '<pattern id="bfp-hiviz" width="140" height="13" patternUnits="userSpaceOnUse"><rect y="8" width="140" height="2.6" fill="#e8ecef" fill-opacity=".9"/></pattern>';
  s += '<pattern id="bfp-armor" width="9" height="8" patternUnits="userSpaceOnUse"><rect x=".5" y=".5" width="8" height="7" rx="1.2" fill="none" stroke="#000" stroke-opacity=".35"/></pattern>';
  return s + '</defs>';
}
// линия по краю одежды (манжета, подол, край шорт), обрезанная по форме руки или ноги
function bfHem(lk, list, y, col) {
  let s = '';
  for (const [r] of list) s += `<g clip-path="url(#bfc-${r})"><path d="M0 ${y} H140" stroke="${col}" stroke-width="1.6"/><path d="M0 ${y - 1.4} H140" stroke="#fff" stroke-opacity=".12" stroke-width=".6"/></g>`;
  return s;
}
// соседние зоны одной вещи на одной руке/ноге — одним куском, без тонких швов между ними
function bfMerge(list) {
  const out = [], by = {};
  for (const [r, a, b] of list) {
    if (a == null) { out.push([r]); continue; }
    const L = by[r] = by[r] || []; const hit = L.find(q => a <= q[2] + .01 && b >= q[1] - .01);
    if (hit) { hit[1] = Math.min(hit[1], a); hit[2] = Math.max(hit[2], b); } else { const q = [r, a, b]; L.push(q); out.push(q); }
  }
  return out;
}
function bfClothes(S, lk, reg) {
  let s = '';
  const owners = new Map();                                                   // одна вещь — один цвет на всех её зонах
  for (const z of [6, 7, 8, 9, 10, 11, 1, 2, 3, 4, 5]) { const o = reg[z]; if (!o) continue; if (!owners.has(o)) owners.set(o, []); owners.get(o).push(z); }
  for (const [o, zs] of owners) {
    const c = o.d.col || [120, 120, 120], list = bfMerge(zs.flatMap(z => BF_ZONE[z]));
    s += `<g fill="${bfRgb(c)}" stroke="${bfRgb(c)}" stroke-width=".5">${bfPiece(S, lk, list)}</g>`;
    if (o.d.pat && o.d.pat !== 'armor') s += `<g fill="url(#bfp-${o.d.pat})">${bfPiece(S, lk, list)}</g>`;
    if (o.d.pat === 'armor') s += `<g fill="url(#bfp-armor)">${bfPiece(S, lk, list)}</g>`;
    // нижние края: где вещь кончается, а ниже — кожа или другая вещь
    for (const z of zs) {
      const nx = z === 2 || z === 3 ? z + 1 : z === 4 ? 5 : z >= 6 && z <= 10 ? z + 1 : null;
      if (nx && reg[nx] !== o) { const lim = BF_ZONE[z][0][2]; s += bfHem(lk, BF_ZONE[z], lim, bfDark(c, .45)); }
    }
    if (o.torn) for (const [r, a, b] of list.slice(0, 3)) { const y = a != null ? (a + Math.min(b, 190)) / 2 : 70; s += `<g clip-path="url(#bfc-${r})"><path d="M0 ${y} l4 2 l3 -3 l4 2" transform="translate(${r.endsWith('L') ? 92 : r.endsWith('R') ? 30 : 58} 0)" stroke="#1a1410" stroke-width="1.1" fill="none" opacity=".7"/></g>`; }
  }
  return s;
}
// мелкие детали: ворот, молния куртки, ширинка и карманы, шнурки
function bfDetails(lk, reg) {
  const cl = P.cloth || {}, f = lk.g === 'f';
  let s = '<g fill="none" stroke-linecap="round" pointer-events="none">';
  const top = reg[1];
  if (top) {
    const c = top.d.col || [120, 120, 120], d = bfDark(c, .5);
    s += `<path d="M62.6 43.4 Q70 ${cl.torso ? 50 : 48.4} 77.4 43.4" stroke="${d}" stroke-width="1.3"/>`;
    if (cl.torso && ITEMS[cl.torso.id].cov !== 'vest') s += `<path d="M70 49 V108" stroke="${d}" stroke-width="1"/><path d="M70 49 V108" stroke="#d8d0b8" stroke-opacity=".5" stroke-width=".35" stroke-dasharray="1 1.2"/>`;
    if (cl.torso && ITEMS[cl.torso.id].cap) s += `<rect x="${f ? 52 : 50}" y="88" width="11" height="9" rx="1.5" stroke="${d}" stroke-width=".9"/><rect x="${f ? 77 : 79}" y="88" width="11" height="9" rx="1.5" stroke="${d}" stroke-width=".9"/>`;
  }
  const pants = reg[6];
  if (pants && reg[7] === pants) { const d = bfDark(pants.d.col || [90, 90, 90], .5); s += `<path d="M70 104 V117" stroke="${d}" stroke-width=".9"/><path d="M50 108 Q55 109 57 114 M90 108 Q85 109 83 114" stroke="${d}" stroke-width=".8"/>`; }
  const shoe = reg[11];
  if (shoe) { const d = bfDark(shoe.d.col || [60, 50, 40], .55); s += `<path d="M52.4 196.8 H66.2 M73.8 196.8 H87.6" stroke="${d}" stroke-width="1.4"/><path d="M56.5 191 l5 1.2 M56.5 193 l5 -1.2 M78.5 191 l5 1.2 M78.5 193 l5 -1.2" stroke="#e8e0cc" stroke-opacity=".55" stroke-width=".5"/>`; }
  return s + '</g>';
}
// бельё — когда на этом месте нет одежды
function bfUnder(lk, reg, skin) {
  let s = '';
  if (!reg[6]) s += `<path d="M44.8 100.4 Q70 106.4 95.2 100.4 L95.4 105.8 Q95 110.4 92.4 114.2 Q80 112.6 71 117.6 L69 117.6 Q60 112.6 47.6 114.2 Q45 110.4 44.6 105.8 Z" fill="${lk.g === 'f' ? '#8a5868' : '#4e5870'}" stroke="rgba(0,0,0,.35)" stroke-width=".5"/><path d="M45 102.6 Q70 108.6 95 102.6" stroke="rgba(255,255,255,.22)" stroke-width="1.2" fill="none"/>`;
  if (lk.g === 'f' && !reg[1]) s += `<path d="M51.6 63.6 Q58 59.6 66 62.8 L70 66.2 L74 62.8 Q82 59.6 88.4 63.6 Q88 71.2 81 72.8 Q74 73.4 70 69.6 Q66 73.4 59 72.8 Q52 71.2 51.6 63.6 Z" fill="#8a5868" stroke="rgba(0,0,0,.35)" stroke-width=".5"/><path d="M56 61 L60 47.5 M84 61 L80 47.5" stroke="#8a5868" stroke-width="1.1"/>`;
  return s;
}
// мышцы — тонко и только на голой коже
function bfAnat(lk, reg) {
  const f = lk.g === 'f'; let d = '';
  if (!reg[1]) d += (f ? 'M58 74 Q64 77 68 74 M72 74 Q76 77 82 74 ' : 'M50 66 Q60 73 69 68 M90 66 Q80 73 71 68 M70 50 V80 M62 87 Q70 88.6 78 87 M63 95 Q70 96.4 77 95 M70 84 V104 ') + 'M64 46 Q58 47.6 53 48.6 M76 46 Q82 47.6 87 48.6 ';
  if (!reg[3]) d += 'M38.4 84 Q40.4 85.6 42 84.4 M101.6 84 Q99.6 85.6 98 84.4 ';
  if (!reg[2]) d += 'M38.6 57 Q40 63 41 68 M101.4 57 Q100 63 99 68 ';
  if (!reg[8] && !reg[9]) d += 'M54 151 Q58.4 154.6 63.4 151 M86 151 Q81.6 154.6 76.6 151 M53.6 162 Q55.6 170 55 180 M86.4 162 Q84.4 170 85 180 ';
  if (!reg[7]) d += 'M53 118 Q56 132 59 144 M87 118 Q84 132 81 144 ';
  return d ? `<path d="${d}" fill="none" stroke="rgba(60,30,20,.26)" stroke-width=".75" stroke-linecap="round" pointer-events="none"/>` : '';
}
// лицо: глаза, брови, нос, рот — по самочувствию
function bfFace(lk, skin) {
  const pain = P.pain || 0, st = Math.max(P.stress || 0, P.panic || 0), tired = P.en < 25, hurt = P.hp < 30, panic = (P.panic || 0) > 60;
  const cold = (P.cold || 0) > 55, fever = (P.inf && P.infT > 120) || (P.fever || 0) > .3;
  const ink = '#1d1612', lip = cold ? '#6a7ea8' : '#7a3a30';
  let s = '<g class="bf-face" pointer-events="none">';
  if (fever) s += '<ellipse cx="61.6" cy="27.4" rx="3.4" ry="2" fill="#e0483a" opacity=".38"/><ellipse cx="78.4" cy="27.4" rx="3.4" ry="2" fill="#e0483a" opacity=".38"/>';
  // брови: при стрессе внутренние концы вверх, при боли — сведены
  const by = st > 45 ? -1.4 : pain > 45 ? 1 : 0;
  s += `<path d="M61.4 18.4 Q64 ${17.2} 67 ${18.2 + by} M79 18.4 Q76 17.2 73 ${18.2 + by}" stroke="${lk.hair < 0 ? '#6a5a4a' : bfRgb(bfMix(LOOK.hair[lk.hair] || [80, 60, 40], [20, 14, 10], .35))}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  for (const x of [64.4, 75.6]) {
    const ry = panic ? 1.9 : 1.45;
    s += `<ellipse cx="${x}" cy="22.2" rx="2.3" ry="${ry}" fill="#f4efe6"/><circle cx="${x}" cy="22.3" r="${panic ? .75 : 1.05}" fill="${ink}"/>`;
    if (tired || hurt) s += `<path d="M${x - 2.6} 22.3 Q${x} 20 ${x + 2.6} 22.3 L${x + 2.6} 20.2 L${x - 2.6} 20.2 Z" fill="${skin}"/><path d="M${x - 2.4} 22.3 Q${x} 21.2 ${x + 2.4} 22.3" stroke="${ink}" stroke-width=".7" fill="none"/>`;
  }
  s += `<path d="M70.2 23.4 Q68.6 27.2 70.8 27.8" stroke="rgba(60,30,20,.55)" stroke-width=".9" fill="none" stroke-linecap="round"/>`;
  if (pain > 45 || hurt) s += `<path d="M66.2 30.4 L73.8 30.4 L73.2 32.6 L66.8 32.6 Z" fill="#f2ead8" stroke="${lip}" stroke-width=".8" stroke-linejoin="round"/><path d="M68.6 30.4 V32.6 M71.2 30.4 V32.6" stroke="#b8ac98" stroke-width=".4"/>`;
  else if (st > 50 || (P.unh || 0) > 60) s += `<path d="M66.6 32.2 Q70 29.8 73.4 32.2" stroke="${lip}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  else if (st < 20 && P.hp > 70 && !tired) s += `<path d="M66.4 30.4 Q70 33.2 73.6 30.4" stroke="${lip}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  else s += `<path d="M66.8 31.2 Q70 31.9 73.2 31.2" stroke="${lip}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  if ((P.wet || 0) > 40) s += '<path d="M57 12 q-1.2 2.2 0 3 q1.2 -.8 0 -3 Z M83.6 15 q-1.2 2.2 0 3 q1.2 -.8 0 -3 Z M86 30 q-1 2 0 2.6 q1 -.6 0 -2.6 Z" fill="#8ec4f0" opacity=".85"/>';
  return s + '</g>';
}
function bfHair(lk, back) {
  if (lk.hair < 0) return '';
  const c = LOOK.hair[lk.hair] || [80, 60, 40], col = bfRgb(c), dk = bfDark(c, .35);
  if (lk.g === 'f') return back
    ? `<path d="M55 20 Q53.4 7.6 70 6.4 Q86.6 7.6 85 20 L86.8 40 Q83 43.4 78.6 40.6 L78.6 30 Q82.6 22 80 15.4 Q70 18.4 60 15.4 Q57.4 22 61.4 30 L61.4 40.6 Q57 43.4 53.2 40 Z" fill="${dk}"/>`
    : `<path d="M55.4 22 Q54.6 8 70 6.8 Q85.4 8 84.6 22 Q81.6 13.4 74 13.2 Q66 16.4 61 14.6 Q56.8 17 55.4 22 Z" fill="${col}"/>`;
  return back ? '' : `<path d="M55.6 21.4 Q54.8 9.4 66 7.4 Q74 6 80 9.4 Q85.8 13.4 84.4 21.6 Q82.6 15.4 77.6 13.6 Q72 15.8 64 14.2 Q58.4 15 55.6 21.4 Z" fill="${col}"/><path d="M60 12 Q66 9.6 74 10.4" stroke="${dk}" stroke-width=".7" fill="none"/>`;
}
// вся фигура
bodySvg = function (sel) {
  const lk = P.look || look, S = bfShapes(lk);
  const base = LOOK.skin[lk.skin] || LOOK.skin[5];
  let sk = base;
  if (P.hp < 30 || P.bleed) sk = bfMix(sk, [206, 200, 190], .3);                 // кровопотеря — бледный
  if ((P.cold || 0) > 55) sk = bfMix(sk, [170, 190, 220], .28);                   // замёрз — синеватый
  const skin = bfRgb(sk), reg = outfitRegs();
  const W = wounds(), byReg = {};
  for (const w of W) { const r = WHERE2REG[w.where] || 'chest'; (byReg[r] = byReg[r] || []).push(w); }
  bfClipN = 0; bfExtra = '';
  let s = '<svg viewBox="0 0 140 206" class="bodysvg bfig" role="img" aria-label="Схема тела">' + bfDefs(S, lk);
  s += '<ellipse cx="70" cy="200" rx="30" ry="4.6" fill="rgba(0,0,0,.38)"/>';
  s += '<g class="bf-breath">';
  s += bfHair(lk, true);
  // контур: тёмная подложка шире фигуры — снаружи остаётся ровная обводка, внутренние швы закрывает заливка
  s += '<g fill="#14100d" stroke="#14100d" stroke-width="2.4" stroke-linejoin="round">';
  for (const r of BF_ORDER) s += `<path d="${S[r]}"${bfShift(lk, r)}/>`;
  s += '</g><g fill="' + skin + '">';
  for (const r of BF_ORDER) s += `<path d="${S[r]}"${bfShift(lk, r)}/>`;
  s += '</g>';
  s += bfAnat(lk, reg) + bfUnder(lk, reg, skin) + bfClothes(S, lk, reg) + bfDetails(lk, reg);
  // голова: шапка и маска поверх
  if (reg[12]) { const c = reg[12].d.col || [80, 80, 80]; s += `<path d="${BF_HAT}" fill="${bfRgb(c)}" stroke="#14100d" stroke-width="1"/><path d="M55 18.6 Q70 14.6 85 18.6" stroke="${bfDark(c, .45)}" stroke-width="1.6" fill="none"/>`; }
  s += '<g fill="url(#bf-sh)" pointer-events="none">';
  for (const r of BF_ORDER) s += `<path d="${S[r]}"${bfShift(lk, r)}/>`;
  s += '</g>';
  if (!reg[12]) s += bfHair(lk, false);
  s += bfFace(lk, skin);
  if (reg[13]) { const c = reg[13].d.col || [60, 60, 60]; s += `<path d="${BF_MASK}" fill="${bfRgb(c)}" stroke="#14100d" stroke-width=".8"/>`; }
  s += bodyScarsSvg();
  s += '</g>';
  // зоны нажатия и подсветка ран
  for (const r of BF_ORDER) {
    const ws = byReg[r] || [], bad = ws.some(bleeding) ? 'bleed' : ws.some(w => w.sep > 50) ? 'sep' : ws.length ? 'hurt' : '';
    s += `<g class="reg ${bad}${sel === r ? ' sel' : ''}" data-r="${r}"${bfShift(lk, r)}><path d="${S[r]}"/></g>`;
  }
  s += '<g pointer-events="none">';
  for (const r in byReg) {
    const R = REG[r]; if (!R) continue; const [x0, y] = R.at, x = x0 + (lk.g === 'f' && /^(arm|hand)/.test(r) ? (r.endsWith('R') ? 3 : -3) : 0);
    if (byReg[r].some(bleeding)) s += `<circle class="bf-pulse" cx="${x}" cy="${y}" r="12" fill="url(#bf-glow)"/>`;
    byReg[r].forEach((w, k) => { s += woundSvg(w, x + (k % 2 ? 5 : -2), y + (k - (byReg[r].length - 1) / 2) * 13, k); });
  }
  s += '<text x="10" y="14" font-size="8" fill="#8d918c">П</text><text x="125" y="14" font-size="8" fill="#8d918c">Л</text></g><defs>' + bfExtra + '</defs></svg>';
  return s;
};

// ---- пульс ----
function pulseState() {
  let bpm = 68 + (P.panic || 0) * .9 + (P.stress || 0) * .22;
  if (P.running) bpm += 34;
  if (zs.some(z => z.state === 'chase' && Math.hypot(z.x - P.x, z.y - P.y) < 12)) bpm += 18;
  if (P.bleed) bpm += 24;
  if (P.hp < 30) bpm += 18;
  if ((P.inf && P.infT > 120) || (P.fever || 0) > .3) bpm += 14;
  if ((P.cold || 0) > 55) bpm -= 10;
  if (P.en < 20) bpm -= 4;
  if (P.sleep) bpm -= 12;
  bpm = Math.round(Math.max(46, Math.min(172, bpm)));
  const weak = P.bleed || P.hp < 25;
  const word = weak ? 'слабый и частый' : bpm < 58 ? 'медленный' : bpm < 92 ? 'ровный' : bpm < 120 ? 'учащённый' : 'колотится';
  const cls = weak || bpm >= 120 ? 'crit' : bpm >= 92 || bpm < 54 ? 'warn' : 'ok';
  return {bpm, word, cls, weak};
}
const ECG_BEAT = 'h10 l2 -2 l2 2 h3 l1.5 3 l2.5 -13 l2.5 14 l1.5 -4 h3 q3 -5 6 0 h6';   // один удар — 40 единиц
function pulseEl() {
  const ps = pulseState(), per = (60 / ps.bpm).toFixed(3), amp = ps.weak ? .5 : 1;
  const e = mk('div', 'bf-ecg ' + ps.cls); e.style.setProperty('--beat', per + 's');
  e.innerHTML = '<svg class="bf-heart" viewBox="0 0 24 24"><path d="M12 21 C5 15.5 2 12 2 8.2 C2 5.2 4.4 3 7.2 3 C9.2 3 11 4.1 12 5.8 C13 4.1 14.8 3 16.8 3 C19.6 3 22 5.2 22 8.2 C22 12 19 15.5 12 21 Z"/></svg>' +
    `<div class="bf-ecg-t"><b>${ps.bpm}</b><small>уд/мин · ${ps.word}</small></div>` +
    `<svg class="bf-trace" viewBox="0 0 120 28" preserveAspectRatio="none"><g transform="translate(0 14) scale(1 ${amp}) translate(0 -14)"><path class="bf-line" d="M0 14 ${(ECG_BEAT + ' ').repeat(6)}"/></g></svg>`;
  e.title = 'Пульс: ' + ps.bpm + ' ударов в минуту, ' + ps.word;
  return e;
}
{ const build0 = buildBodyTab;
  buildBodyTab = function (host) {
    build0(host);
    const fig = host.querySelector('.bodyfig'); if (!fig) return;
    const cap = fig.querySelector('.figcap'); if (cap) cap.remove();
    const svg = fig.querySelector('.bodysvg'); if (svg) { const k = Math.max(2.4, Math.min(6, 240 / pulseState().bpm)); svg.style.setProperty('--breath', k.toFixed(2) + 's'); }
    fig.appendChild(pulseEl());
    fig.appendChild(mk('span', 'figcap', 'нажми на часть тела'));
  };
}
