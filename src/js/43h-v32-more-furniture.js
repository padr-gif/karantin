// ================= v32: больше мебели и декора =================
// 17 новых вещей (модели — tools/furn3d/game.py, EXTRA_MODELS): кресло, журнальный и приставной столики, торшер,
// фикус, письменный стол, стул, зеркало, корзина для белья, стиральная машина, мусорное ведро, кухонный пенал,
// раковина в ванной, полотенцесушитель, обувная полка, коробки, батарея под окном.
// Генератор дописывает их в комнаты после основной мебели; планировка комнаты (43e) ставит обязательное первым
// и оставляет из декора столько, сколько влезает без помех проходу.

Object.assign(CONT, {
  armchair:{name:'Кресло'}, floorlamp:{name:'Торшер'}, plant:{name:'Фикус'}, chair:{name:'Стул'}, mirror:{name:'Зеркало'},
  radiator:{name:'Батарея'}, washer:{name:'Стиральная машина', loot:['rag', 'rag', 'sweater', 'hat'], n:[0, 2], cap:4},
  coffeetab:{name:'Журнальный столик', loot:['newspaper', 'cards', 'novel', 'candle', 'cigs', 'note', 'map'], n:[0, 2], cap:4},
  endtable:{name:'Приставной столик', loot:['candle', 'matches', 'novel', 'battery', 'lighter', 'watchQ'], n:[0, 1], cap:2},
  wdesk:{name:'Письменный стол', loot:['note', 'newspaper', 'novel', 'battery', 'map', 'watchQ', 'book_fight', 'book_carp', 'handheld'], n:[1, 3], cap:6},
  laundry:{name:'Корзина для белья', loot:['rag', 'rag', 'sweater', 'hat', 'gloves'], n:[0, 2], cap:4},
  kbin:{name:'Мусорное ведро', loot:['jar', 'newspaper', 'rag', 'scrap'], n:[0, 1], cap:3},
  pantry:{name:'Кухонный пенал', loot:['beans', 'noodles', 'cereal', 'oatmeal', 'crackers', 'condmilk', 'sprats', 'jar', 'pbutter', 'honey'], n:[1, 4], cap:10},
  bsink:{name:'Раковина'}, towels:{name:'Полотенцесушитель', loot:['rag', 'rag'], n:[0, 2], cap:3},
  shoerack:{name:'Обувная полка', loot:['umbrella', 'gloves', 'hat', 'rag'], n:[0, 2], cap:4},
  boxes:{name:'Коробки', loot:['rag', 'newspaper', 'candle', 'novel', 'jar', 'scrap', 'nails', 'cards'], n:[1, 3], cap:8},
});
// предметы могли быть переименованы или убраны — в добычу только существующие
for (const k of ['washer', 'coffeetab', 'endtable', 'wdesk', 'laundry', 'kbin', 'pantry', 'towels', 'shoerack', 'boxes']) CONT[k].loot = CONT[k].loot.filter(id => ITEMS[id]);
Object.assign(FSZ, {armchair:[.88, .7], coffeetab:[.9, .5], floorlamp:[.4, .4], plant:[.5, .5], endtable:[.45, .45], wdesk:[.96, .55], chair:[.45, .45],
  mirror:[.6, .25], laundry:[.45, .4], washer:[.6, .6], kbin:[.34, .34], pantry:[.6, .58], bsink:[.55, .45], towels:[.5, .15], shoerack:[.8, .32], boxes:[.6, .6], radiator:[.8, .15]});

// (раковина в ванной — тоже вода: её находит getAction в 05-actions)

// что ещё ставить в комнату (после основного списка), по площади; без rng генератора здесь нельзя — вызывается из него
function extraFurn(type, area, rnd) {
  const L = [], maybe = (p, ...t) => { if (rnd() < p) L.push(...t); };
  if (type === 'living') { L.push('armchair', 'floorlamp'); maybe(.7, 'plant'); maybe(.6, 'endtable'); maybe(.6, 'radiator'); maybe(.4, 'plant'); if (area >= 14) maybe(.4, 'boxes'); }
  else if (type === 'bedroom') { L.push('nightstand'); maybe(.7, 'wdesk'); maybe(.6, 'mirror'); maybe(.6, 'laundry'); maybe(.5, 'floorlamp'); maybe(.6, 'radiator'); maybe(.4, 'plant'); maybe(.3, 'boxes'); }
  else if (type === 'kitchen') { L.push('kbin'); maybe(.7, 'pantry'); maybe(.45, 'washer'); maybe(.5, 'radiator'); maybe(.3, 'plant'); }
  else if (type === 'bath') { L.push('bsink'); maybe(.6, 'towels'); maybe(.45, 'washer'); maybe(.4, 'laundry'); maybe(.3, 'radiator'); }
  else if (type === 'hall') { L.push('shoerack'); maybe(.5, 'plant'); maybe(.4, 'mirror'); maybe(.4, 'boxes'); maybe(.3, 'radiator'); }
  return L;
}

// Дописываем после того, как мир сгенерирован, своим отдельным генератором случайных чисел: общий rng и номера
// прежней мебели не меняются — старые сохранения (они хранят мебель по номеру) остаются верными.
function addExtraFurniture() {
  const keep = rng;
  try {
    houses.forEach((Hs, hi) => {
      if (!Hs || !Hs.rooms) return;
      Hs.rooms.forEach((r, ri_) => {
        rng = mulberry32(((world.seed | 0) ^ Math.imul(hi + 1, 0x9E3779B1) ^ Math.imul(ri_ + 7, 0x85EBCA77)) >>> 0);
        const area = (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);
        for (const t of extraFurn(r.type, area, rng)) { const f = addFurnIn(Hs, t, r); if (f) f.extra = true; }
      });
    });
  } finally { rng = keep; }
}

// ---- декор на стенах внутри домов: картины, фото, часы, календари, постеры ----
// Рисуется прямо на внутренней грани стены (в её плоскости), примерно на каждой седьмой клетке стены.
const WALLART = [
  [[124, 92, 60], [[150, 186, 210], [96, 132, 76]]],          // пейзаж: рама, небо, луг
  [[60, 44, 32], [[214, 200, 170], [150, 110, 86]]],           // семейное фото
  [[40, 40, 44], 'clock'], [[230, 228, 220], 'calendar'],
  [[200, 196, 186], [[178, 60, 52], [230, 220, 190]]],         // постер
  [[150, 120, 70], [[60, 90, 120], [210, 180, 110]]],          // морской пейзаж
];
function wallArt(p0x, p0y, p1x, p1y, kind, f) {
  const dx = p1x - p0x, dy = p1y - p0y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  ctx.setTransform(DPR * (ux - uy) * U, DPR * (ux + uy) * hh, 0, -DPR * U, DPR * (ox + (p0x - p0y) * U), DPR * (oy + (p0x + p0y) * hh));
  const [frame, inner] = WALLART[kind], c = (rgb, k) => C(rgb, f * (k || 1)), u = len / 2;
  if (inner === 'clock') {
    ctx.fillStyle = c(frame); ctx.beginPath(); ctx.arc(u, 1.62, .17, 0, 6.283); ctx.fill();
    ctx.fillStyle = c([236, 232, 222]); ctx.beginPath(); ctx.arc(u, 1.62, .14, 0, 6.283); ctx.fill();
    ctx.strokeStyle = c([30, 30, 32]); ctx.lineWidth = .025; ctx.beginPath(); ctx.moveTo(u, 1.62); ctx.lineTo(u + .06, 1.69); ctx.moveTo(u, 1.62); ctx.lineTo(u - .02, 1.52); ctx.stroke();
  } else if (inner === 'calendar') {
    ctx.fillStyle = c(frame); ctx.fillRect(u - .14, 1.18, .28, .42);
    ctx.fillStyle = c([176, 50, 44]); ctx.fillRect(u - .14, 1.5, .28, .1);
    ctx.fillStyle = c([150, 146, 140]); for (let r = 0; r < 4; r++) ctx.fillRect(u - .1, 1.24 + r * .06, .2, .012);
  } else {
    const w = kind === 1 ? .3 : .4, h = kind === 1 ? .38 : .32, z = 1.3;
    ctx.fillStyle = 'rgba(0,0,0,' + (.25 * f).toFixed(2) + ')'; ctx.fillRect(u - w / 2 + .03, z - .04, w, h);   // тень на обоях
    ctx.fillStyle = c(frame); ctx.fillRect(u - w / 2, z, w, h);
    const iw = w - .08, ih = h - .08, ix = u - iw / 2, iz = z + .04;
    if (kind === 1) { ctx.fillStyle = c(inner[0]); ctx.fillRect(ix, iz, iw, ih); ctx.fillStyle = c(inner[1]); ctx.beginPath(); ctx.ellipse(u, iz + ih * .55, iw * .28, ih * .3, 0, 0, 6.283); ctx.fill(); }
    else if (kind === 4) { ctx.fillStyle = c(inner[1]); ctx.fillRect(ix, iz, iw, ih); ctx.fillStyle = c(inner[0]); ctx.fillRect(ix, iz + ih * .55, iw, ih * .3); ctx.fillRect(ix + iw * .1, iz + ih * .1, iw * .35, ih * .08); }
    else { ctx.fillStyle = c(inner[0]); ctx.fillRect(ix, iz + ih * .45, iw, ih * .55); ctx.fillStyle = c(inner[1]); ctx.fillRect(ix, iz, iw, ih * .45);
      ctx.fillStyle = c(inner[1], .8); ctx.beginPath(); ctx.moveTo(ix, iz + ih * .45); ctx.lineTo(ix + iw * .35, iz + ih * .78); ctx.lineTo(ix + iw * .7, iz + ih * .45); ctx.fill(); }
  }
  resetT();
}
const wallPiece32 = wallPiece;
wallPiece = function (x0, y0, x1, y1, z0, z1, Hs) {
  wallPiece32(x0, y0, x1, y1, z0, z1, Hs);
  if (!Hs || !Hs.rooms || z0 > 1 || z1 < WH * .9) return;
  for (const side of [0, 1]) {
    const L = side ? y1 - y0 : x1 - x0; if (L < .4) continue;   // стена тайла — два куска по .44 и стык .13
    const px = side ? x1 + .05 : (x0 + x1) / 2, py = side ? (y0 + y1) / 2 : y1 + .05;
    if (!faceTex(Hs, px, py)[1]) continue;                                   // только внутри дома
    const tx = Math.floor(px), ty = Math.floor(py), hx2 = Math.floor(px * 2), hy2 = Math.floor(py * 2), hv = hash(hx2 * 7 + side * 131, hy2 * 13 + 17);
    if (hv > .12) continue;
    const fg = fogAt(tx, ty), f = Math.max(.06, fg * (side ? .76 : .94));   // fogAt: 1 — видно; восточная грань темнее, как у стены
    if (side) wallArt(x1, y0, x1, y1, Math.floor(hash(hx2 + 5, hy2 + 9) * WALLART.length), f);
    else wallArt(x0, y1, x1, y1, Math.floor(hash(hx2 + 5, hy2 + 9) * WALLART.length), f);
  }
};
