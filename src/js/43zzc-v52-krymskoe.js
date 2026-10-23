// ================= v52: родной район — село Крымское (по карте OpenStreetMap) =================
// Схема села сжата под карту игры (184×184 клетки, ~1 м на клетку): сохранены порядок и названия улиц,
// сквер Авель с братской могилой, ДК «Крымский», площадь с памятником Ленину, школа, детсад, сельсовет,
// храм, амбулатория, магазины, улица Ленина наискосок, объездная и трасса 35Н-491 за забором.
// Дома — игровые, стандартного размера, стоят вдоль настоящих улиц. Данные карты © участники OpenStreetMap (ODbL).

// ---- новые здания села ----
for (const k of ['school', 'dk', 'council', 'kinder', 'church', 'fap']) COMM.add(k);
Object.assign(FLIST, {
  school:['desk', 'desk', 'wdesk', 'wdesk', 'wdesk', 'bookshelf', 'bookshelf', 'locker', 'locker', 'medcab', 'counter', 'fridge', 'sink'],
  dk:['locker', 'locker', 'bookshelf', 'desk', 'counter', 'wardrobe', 'boxes', 'chair', 'chair', 'chair'],
  council:['wdesk', 'wdesk', 'desk', 'desk', 'bookshelf', 'cabinet', 'locker', 'wardrobe'],
  kinder:['bed', 'bed', 'bed', 'bed', 'table', 'fridge', 'stove', 'sink', 'wardrobe', 'shelf'],
  church:['bookshelf', 'counter', 'wardrobe', 'wardrobe'],
  fap:['medshelf', 'medshelf', 'bed', 'medcab', 'desk', 'locker', 'sink'],
});
{ const ok = L => L.filter(id => ITEMS[id]);
  const add = (kind, o) => { LOOTK[kind] = LOOTK[kind] || {}; for (const t in o) LOOTK[kind][t] = ok(o[t]); };
  add('school', {desk:['map', 'choco', 'coffee', 'battery', 'tape', 'pills'], wdesk:['map', 'choco', 'book_med', 'battery', 'tape'], bookshelf:['book_med', 'book_mech', 'map', 'book_mech2'],
    locker:['flashlight', 'bandage', 'battery', 'bat', 'golf', 'water'], medcab:['bandage', 'pills', 'antisep', 'painkill'], fridge:['milk', 'water', 'bread', 'apple'], counter:['choco', 'chips', 'water', 'soda']});
  add('dk', {locker:['radio', 'flashlight', 'battery', 'candle', 'tape'], wardrobe:['sweater', 'bag', 'candle'], desk:['coffee', 'map', 'radio', 'choco'],
    boxes:['candle', 'tape', 'battery', 'nails'], counter:['choco', 'soda', 'water', 'chips'], bookshelf:['map', 'book_mech']});
  add('council', {wdesk:['map', 'coffee', 'radio', 'battery', 'choco', 'pills'], desk:['map', 'coffee', 'battery'], locker:['flashlight', 'radio', 'map', 'ammo9', 'pistol', 'bandage'],
    cabinet:['coffee', 'water', 'choco'], wardrobe:['bag', 'sweater', 'flashlight'], bookshelf:['map']});
  add('kinder', {fridge:['milk', 'water', 'bread', 'apple', 'apple'], shelf:['bandage', 'pills', 'vitamins', 'water', 'choco'], wardrobe:['bag', 'sweater']});
  add('church', {wardrobe:['candle', 'candle', 'matches', 'bread', 'water'], counter:['candle', 'candle', 'matches', 'honey'], bookshelf:['candle', 'map']});
  add('fap', {medshelf:['bandage', 'bandage', 'antisep', 'antibio', 'painkill', 'medkit', 'splint', 'pills', 'vitamins'], locker:['bandage', 'pills', 'medkit', 'painkill'],
    medcab:['pills', 'antisep', 'bandage', 'painkill'], desk:['pills', 'book_med', 'coffee']});
}
Object.assign(WALLK, {school:[214,200,150], dk:[206,198,178], council:[196,184,160], kinder:[226,206,150], church:[232,228,216], fap:[220,222,214]});
Object.assign(SIGNS, {
  school:{text:'ШКОЛА', bg:'#2a5a8a', fg:'#ffffff', label:'Школа'},
  dk:{text:'ДК «КРЫМСКИЙ»', bg:'#7a2a2a', fg:'#ffe9c0', label:'ДК «Крымский»'},
  council:{text:'СЕЛЬСОВЕТ', bg:'#2c3a4c', fg:'#e8eef6', label:'Сельсовет'},
  kinder:{text:'ДЕТСАД', bg:'#e0a030', fg:'#2a1e10', label:'Детский сад'},
  church:{text:'ХРАМ', bg:'#3a5a8a', fg:'#f6e6a8', label:'Храм'},
  fap:{text:'АМБУЛАТОРИЯ', bg:'#f2f2f0', fg:'#b22a28', label:'Амбулатория', cross:true},
});
Object.assign(BLOOK, {school:{brick:true}, council:{brick:true}});

// ---- схема села (координаты клеток; забор карантина на 20 и 163) ----
const KRYM = {
  roads:[                                                                    // [x0, y0, x1, y1, название, дома вдоль]
    [30, 0, 32, 160, 'Объездная улица', 1],
    [50, 24, 51, 72, 'улица Комарова', 1],
    [68, 24, 69, 72, 'Строительная улица', 1],
    [86, 24, 88, 56, 'улица Гагарина', 1],
    [104, 30, 107, 183, 'Парковая улица', 1],
    [128, 30, 130, 121, 'Солнечная улица', 1],
    [148, 30, 149, 96, 'улица Горького', 1],
    [104, 30, 158, 31, 'Садовая улица', 1],
    [30, 52, 88, 53, '', 1],
    [0, 72, 107, 73, '', 0],
    [33, 94, 104, 95, '', 1],
    [30, 110, 104, 111, 'Театральная улица', 1],
    [30, 126, 104, 127, 'Винницкая улица', 1],
    [30, 142, 160, 143, 'Киевская улица', 1],
    [131, 96, 183, 97, '', 1],
    [170, 0, 173, 183, 'трасса 35Н-491', 0],
  ],
  lenin:[111, 105, 149, 141],                                                // улица Ленина — наискосок от площади к Киевской
  walks:[[103, 30, 103, 162], [108, 30, 108, 95]],                           // тротуары вдоль Парковой
  plaza:[109, 96, 116, 104],
  // здания: [x, y, w, h, вид]
  blds:[
    [90, 58, 12, 10, 'school'], [89, 77, 12, 9, 'dk'], [76, 84, 9, 7, 'pharmacy'], [90, 98, 12, 9, 'council'],
    [110, 84, 12, 9, 'police'], [118, 97, 9, 7, 'selpo'], [110, 115, 10, 8, 'store'], [110, 128, 11, 9, 'kinder'],
    [134, 99, 9, 9, 'church'], [146, 99, 10, 8, 'fap'], [34, 56, 11, 8, 'hardware'],
  ],
  park:[33, 75, 86, 92],                                                     // сквер Авель
  labels:[['улица Ленина', 130, 123, 'd'], ['Сквер Авель', 56, 86, 'x'], ['Площадь', 113, 99, 'x']],
};
const MONU_TEXT = {
  lenin:'Памятник В. И. Ленину. Кто-то повязал ему на руку белую тряпку — знак «здесь живые». Давно.',
  war:'Памятник воинам-односельчанам. У подножия свежие цветы: их принесли уже после того, как закрыли карантин.',
  grave:'Братская могила. Фамилии на плите читаются с трудом. Тишина здесь какая-то другая.',
  stela:'Въездная стела «Крымское». За ней трасса и блокпост.',
};

function placeNear(kind, x, y, w, h) {
  for (let r = 0; r <= 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    if (!rectFree(x + dx, y + dy, w, h, 1)) continue;
    const X = x + dx, Y = y + dy;
    // дверь — к ближайшей дороге
    const sideD = [[0, X, Y - 1, 0, -1], [1, X, Y + h, 0, 1], [2, X - 1, Y, -1, 0], [3, X + w, Y, 1, 0]].map(([s, sx, sy, ox, oy]) => {
      let best = 99; for (let k = 0; k < 8; k++) { const span = s < 2 ? w : h; for (let q = 0; q < span; q += 2) { const t = get(sx + ox * k + (s < 2 ? q : 0), sy + oy * k + (s < 2 ? 0 : q)); if (t === ROAD || t === WALK) { best = Math.min(best, k); break; } } }
      return [s, best];
    }).sort((a, b) => a[1] - b[1]).map(a => a[0]);
    const H = bld(X, Y, w, h, kind, sideD); pathFromDoor(H); return H;
  }
  return null;
}
function frontage(r) {
  const [x0, y0, x1, y1] = r, vert = (y1 - y0) > (x1 - x0);
  const lo = vert ? y0 : x0, hi = vert ? y1 : x1;
  const inside = (x, y, w, h) => x >= FEN + 2 && y >= FEN + 2 && x + w <= MW - FEN - 3 && y + h <= MH - FEN - 3;
  for (const side of [-1, 1]) for (let a = lo + 1; a < hi - 7;) {
    const w = ri(9, 10), h = ri(8, 9);
    const x = vert ? (side < 0 ? x0 - 2 - w : x1 + 3) : a, y = vert ? a : (side < 0 ? y0 - 2 - h : y1 + 3);
    if (inside(x, y, w, h) && rectFree(x, y, w, h, 1)) {
      const H = bld(x, y, w, h, 'house'); pathFromDoor(H);
      // сад или огород за домом, иногда сарай
      const bx = vert ? (side < 0 ? x - 5 : x + w + 1) : x + 1, by = vert ? y + 1 : (side < 0 ? y - 5 : y + h + 1);
      if (rng() < .55) { for (let yy = 0; yy < (vert ? h - 2 : 4); yy += 2) for (let xx = 0; xx < (vert ? 4 : w - 2); xx += 2) { const tx = bx + xx, ty = by + yy, i = ty * MW + tx; if (inMap(tx, ty, 1) && map[i] === GRASS && !propAt[i] && !hAt[i] && insideFence(tx, ty)) set(tx, ty, TREE); } }
      else if (rng() < .6) { const sx = vert ? x + ri(1, w - 5) : x + ri(1, w - 5), sy = vert ? (rng() < .5 ? y - 6 : y + h + 2) : (side < 0 ? y - 6 : y + h + 2); if (inside(sx, sy, 4, 4) && rectFree(sx, sy, 4, 4, 1)) bld(sx, sy, 4, 4, 'shed'); }
      a += (vert ? h : w) + ri(2, 5);
    } else a += 2;
  }
}
function monument(type, x, y) {
  const p = {type:'monu', proc:true, mt:type, cx:x + .5, cy:y + .5, solid:true, r:[x + .2, y + .2, x + .8, y + .8]};
  return addProp(p, [[x, y]]) ? p : null;
}
function genKrym() {
  genReset();
  const K = KRYM;
  for (const r of K.roads) carve(r[0], r[1], r[2], r[3], ROAD);
  { const [ax, ay, bx, by] = K.lenin; for (let y = ay; y <= by; y++) { const x = Math.round(ax + (y - ay) * (bx - ax) / (by - ay)); carve(x, y, x + 2, y, ROAD); } }
  for (const w of K.walks) for (let y = w[1]; y <= w[3]; y++) if (get(w[0], y) === GRASS) set(w[0], y, WALK);
  { const [px0, py0, px1, py1] = K.plaza; for (let y = py0; y <= py1; y++) for (let x = px0; x <= px1; x++) if (get(x, y) === GRASS) set(x, y, WALK); }
  // промзона бывшего совхоза за западным забором
  carve(1, 24, 18, 62, WALK); carve(9, 63, 10, 71, WALK);
  for (const [x, y, w, h, k] of [[2, 26, 16, 10, 'warehouse'], [3, 42, 14, 9, 'farm'], [4, 54, 10, 6, 'garage']]) { carve(x, y, x + w - 1, y + h - 1, GRASS); bld(x, y, w, h, k, [1, 3, 0, 2]); }
  // общественные здания
  const lm = {};
  for (const [x, y, w, h, k] of K.blds) { const H = placeNear(k, x, y, w, h); if (H) lm[k] = H; }
  for (const [k, pi, n] of [['police', 10, 3], ['fap', 11, 2], ['pharmacy', 11, 2], ['school', 0, 3], ['dk', 1, 2]]) { const H = lm[k]; if (H) SPECIAL.push({x:H.x + H.w / 2, y:H.y + H.h / 2, pi, n}); }
  if (lm.school) pond(lm.school.x + 5, lm.school.y + lm.school.h + 2.2, 1.8, .9);   // бассейн у школы
  // сквер Авель: дорожки, ряды деревьев, братская могила
  { const [x0, y0, x1, y1] = K.park;
    for (let x = x0; x <= x1; x++) if (get(x, 84) === GRASS) set(x, 84, WALK);
    for (const px of [48, 66]) for (let y = y0 - 1; y <= y1 + 1; y++) if (get(px, y) === GRASS) set(px, y, WALK);
    monument('grave', 41, 79);
    for (let y = y0 + 1; y <= y1; y += 3) for (let x = x0 + 1; x <= x1; x += 3) { const i = y * MW + x; if (map[i] === GRASS && !hAt[i] && !propAt[i] && Math.hypot(x - 41, y - 79) > 3) set(x, y, TREE); }
  }
  monument('lenin', 113, 99); monument('war', 113, 103);
  // дома вдоль улиц
  for (const r of K.roads) if (r[5]) frontage(r);
  // машины на улицах и трассе
  for (let t = 0, n = 0; t < 600 && n < 26; t++) {
    const r = pick(K.roads.filter(r => r[5])), vert = (r[3] - r[1]) > (r[2] - r[0]);
    const a = vert ? ri(r[1], r[3] - 1) : ri(r[0], r[2] - 1), lane = vert ? pick([r[0], r[2]]) : pick([r[1], r[3]]);
    if (!insideFence(vert ? lane : a, vert ? a : lane)) continue;
    if (vert ? parkCarAt(lane, a, 'y') : parkCarAt(a, lane, 'x')) n++;
  }
  for (let t = 0, n = 0; t < 80 && n < 6; t++) { const y = ri(4, MH - 6), lane = pick([170, 173]); if (y > 93 && y < 99) continue; if (parkCarAt(lane, y, 'y')) n++; }
  // въездная стела у трассы, фонари вдоль Парковой
  monument('stela', 167, 103);
  for (let y = 34; y < 160; y += 7) if (get(108, y) === WALK || get(108, y) === GRASS) { if (!propAt[y * MW + 108] && !hAt[y * MW + 108] && get(108, y) !== ROAD) addProp({type:'lamp', flick:rng() < .15, cx:108.5, cy:y + .5, hx:-1, hy:0, solid:true, r:[108.4, y + .4, 108.6, y + .6]}, [[108, y]]); }
  // блокпосты там, где дороги пересекают забор, и сам забор
  const CPS = [['n', 30], ['w', 72], ['s', 104], ['e', 96]];
  for (const [side, c] of CPS) checkpoint(side, c);
  const F2 = MW - 1 - FEN;
  for (let v = FEN; v <= F2; v++) {
    for (const x of [FEN, F2]) if (get(x, v) !== ROAD && !propAt[v * MW + x] && !hAt[v * MW + x]) { if (get(x, v) === TREE) set(x, v, GRASS); addProp({type:'fence', proc:true, ax:'y', cx:x + .5, cy:v + .5, solid:true, r:[x + .42, v, x + .58, v + 1], sign:(v % 9) === 4}, [[x, v]]); }
    for (const y of [FEN, F2]) if (get(v, y) !== ROAD && !propAt[y * MW + v] && !hAt[y * MW + v]) { if (get(v, y) === TREE) set(v, y, GRASS); addProp({type:'fence', proc:true, ax:'x', cx:v + .5, cy:y + .5, solid:true, r:[v, y + .42, v + 1, y + .58], sign:(v % 9) === 4}, [[v, y]]); }
  }
  const nearCP = (x, y) => CPS.some(([s, c]) => { const [cx, cy] = s === 'n' ? [c + 2, FEN] : s === 's' ? [c + 2, MH - 1 - FEN] : s === 'w' ? [FEN, c + 1] : [MW - 1 - FEN, c + 1]; return Math.abs(x - cx) < 11 && Math.abs(y - cy) < 11; });
  genFinish({tree:(x, y, n) => {
    if (nearCP(x, y)) return 0;
    if (x < 20 && y > 22 && y < 64) return 0;                                 // двор промзоны
    if (!insideFence(x, y)) return x > 160 ? .05 : .22 + .25 * n;             // за трассой — поля
    return .012;
  }, bush:.03, bins:.01, hideouts:2});
  world.nofence = false;
}

// ---- памятники: рисуются кодом ----
{ const dp = drawProc;
  drawProc = function (p, f) {
    if (p.type !== 'monu') return dp(p, f);
    const x = Math.floor(p.cx), y = Math.floor(p.cy);
    if (p.mt === 'stela') {
      for (const q of [[x + .1, y + .5], [x + 1.9, y + .5]]) box(q[0] - .06, q[1] - .06, q[0] + .06, q[1] + .06, 0, 40, [150, 150, 150], f);
      board(x, y + .5, 'x', 2, 26, 50, shadeHex('#2e5a8a', f), shadeHex('#d8d4c8', f));
      if (f > .3) planeText(x, y + .5, 'x', 2, 49, ['КРЫМСКОЕ'], shadeHex('#ffffff', f), 12);
      return;
    }
    if (p.mt === 'grave') {
      box(x + .05, y + .05, x + .95, y + .95, 0, 5, [150, 148, 140], f);
      box(x + .3, y + .3, x + .7, y + .7, 5, 52, [214, 210, 198], f);
      box(x + .36, y + .36, x + .64, y + .64, 52, 60, [196, 52, 42], f);
      return;
    }
    // постамент и фигура
    box(x + .12, y + .12, x + .88, y + .88, 0, 6, [140, 138, 132], f);
    box(x + .24, y + .24, x + .76, y + .76, 6, 26, p.mt === 'war' ? [120, 118, 112] : [176, 172, 160], f);
    const c = p.mt === 'war' ? [88, 96, 74] : [70, 72, 76];
    box(x + .38, y + .4, x + .62, y + .6, 26, 44, c, f);
    box(x + .33, y + .36, x + .67, y + .64, 40, 52, c, f);
    box(x + .43, y + .44, x + .57, y + .56, 52, 59, c, f);
    if (p.mt === 'lenin') box(x + .6, y + .44, x + .82, y + .52, 46, 50, c, f);   // рука вперёд
    else box(x + .28, y + .46, x + .34, y + .54, 30, 62, [60, 58, 54], f);       // знамя
  };
}
// осмотреть памятник
{ const ga = getActions;
  getActions = function () {
    const out = ga();
    if (P && !P.car) for (const p of propsNear(P.x, P.y)) if (p.type === 'monu' && Math.hypot(p.cx - P.x, p.cy - P.y) < 1.6) out.push({kind:'monu', label:'Осмотреть', p});
    return out;
  };
  const da = doAction;
  doAction = function (a) { if (a && a.kind === 'monu') { $('actMenu').hidden = true; eventBanner(PROPN.monu, MONU_TEXT[a.p.mt] || '', '', 'i-star'); return; } da(a); };
  const an = actName; actName = function (a) { return a && a.kind === 'monu' ? ({lenin:'Памятник Ленину', war:'Памятник воинам', grave:'Братская могила', stela:'Стела «Крымское»'})[a.p.mt] : an(a); };
  PROPN.monu = 'Памятник';
}

// ---- выбор родного города при создании игры ----
NEWCFG.home = 'krym';
{ const oc = openCreate;
  openCreate = function () {
    oc();
    const box = document.querySelector('.opts[data-tab="world"]');
    if (box && !$('oHome')) {
      const row = mk('div', 'opt'); row.appendChild(mk('span', 'olbl', 'Родной город')); const sg = mk('div', 'seg'); sg.id = 'oHome'; row.appendChild(sg);
      const info = mk('p', 'rec'); info.id = 'oHomeInfo';
      box.insertBefore(info, box.firstChild); box.insertBefore(row, info);
    }
    const INFO = {krym:'Село Крымское по настоящей карте: сквер Авель, ДК, площадь с Лениным, школа, улицы с настоящими названиями.', random:'Каждый раз новый городок по случайной схеме.'};
    seg($('oHome'), [['krym', 'Крымское'], ['random', 'Случайный']], () => NEWCFG.home, v => { NEWCFG.home = v; $('oHomeInfo').textContent = INFO[v]; });
    $('oHomeInfo').textContent = INFO[NEWCFG.home];
  };
}
{ const sn = startNew; startNew = function () { world.home = NEWCFG.home; sn(); }; }
{ const ser = serialize; serialize = function () { const d = ser(); d.x52 = {home:world.home || 'random'}; return d; }; }
{ const as = applySave; applySave = function (d) { world.home = (d && d.x52 && d.x52.home) || 'random'; as(d); }; }   // до постройки: от этого зависит родной город
{ const gen = generate;
  generate = function () {
    if (!world.dx && !world.dy && world.home === 'krym') { world.dtype = 'town'; GCFG = {}; ROADS.length = 0; ROADS.push(104, 170); return genKrym(); }
    return gen();
  };
}
{ const dn = distName; distName = function (dx, dy) { return !dx && !dy && world.home === 'krym' ? 'Крымское' : dn(dx, dy); }; }

// ---- названия улиц на карте ----
{ const dm = drawMapCanvas;
  drawMapCanvas = function (c) {
    dm(c);
    if (world.home !== 'krym' || world.dx || world.dy || !c._s) return;
    const g = c.getContext('2d'), dpr = Math.min(3, devicePixelRatio || 1), s = c._s, cw = c._cw, m0 = c._m0;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const lab = (text, x, y, dir) => {
      const tx = Math.floor(x), ty = Math.floor(y); if (!P.mapRead && !seen[ty * MW + tx]) return;
      const px = cw / 2 + (x - y) * s, py = (x + y - 2 * m0) * s / 2, ang = dir === 'y' ? -Math.atan2(.5, 1) : dir === 'd' ? 0 : Math.atan2(.5, 1);
      g.save(); g.translate(px, py); g.rotate(ang); g.font = '600 ' + Math.max(8, Math.min(12, s * 2.2)) + 'px "PT Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 3; g.strokeStyle = 'rgba(12,16,18,.85)'; g.strokeText(text, 0, 0); g.fillStyle = '#efe7d2'; g.fillText(text, 0, 0); g.restore();
    };
    for (const r of KRYM.roads) if (r[4]) { const vert = (r[3] - r[1]) > (r[2] - r[0]); lab(r[4], (r[0] + r[2]) / 2 + .5, vert ? (Math.max(r[1], FEN) + Math.min(r[3], MH - FEN)) / 2 : (r[1] + r[3]) / 2 + .5, vert ? 'y' : 'x'); }
    for (const [t, x, y, d] of KRYM.labels) lab(t, x, y, d);
  };
}
