// ================= двор промзоны: контейнеры, поддоны, трубы, бочки, погрузчик =================
// Бетонные дворы цеха и складов (genIndustrial, 71-terrain) были пустыми полями плитки. После мебели (generate)
// двор обставляется группами: ряды морских контейнеров, штабеля поддонов, трубы, бочки, кабельные катушки,
// покрышки, бетонные блоки и погрузчик. Всё твёрдое — укрытие и узкие проходы, мертвецы обходят.
// Случайность своя (от семени карты), а не rng(): старые сохранения промзоны получают тот же мир, только обставленный;
// новые вещи добавляются в конец props — номера машин и баков в сохранении не сдвигаются.
// Контейнер с дверью можно обыскать (лут — CONT.icont); часть заперта — вскрыть ломом, это громко.
let INDY_BLOCKS = [];                                                         // дворы района: {x0,y0,x1,y1,role} (заполняет genIndustrial)
Object.assign(CONT, {icont:{name:'Морской контейнер', loot:['plank', 'plank', 'nails', 'scrap', 'scrap', 'pipe', 'rope', 'tape', 'wire', 'jerrycan', 'beans', 'noodles', 'water', 'water', 'battery', 'cigs', 'rag', 'sledge', 'crowbar', 'milbag', 'matches'], n:[2, 5], cap:12}});
const ICONT_COL = [[164, 62, 44], [46, 92, 140], [58, 112, 74], [196, 140, 48], [120, 124, 128], [142, 52, 60]];
const YARD_SOLID = (x, y, k) => [x + k, y + k, x + 1 - k, y + 1 - k];

function dressYards() {
  if (!INDY_BLOCKS.length) return;
  const R = mulberry32(((world.seed || 1) ^ 0x51ed27) >>> 0), ri2 = (a, b) => a + Math.floor(R() * (b - a + 1)), pk = a => a[Math.floor(R() * a.length)];
  const used = new Set();                                                      // клетки групп и их «рамка» в 1 клетку — чтобы между группами всегда был проход
  for (const b of INDY_BLOCKS) {
    if (b.role !== 'factory' && b.role !== 'depot') continue;
    // клетка свободна: бетон двора, не у самого забора, не у стен и дверей, ничего не стоит
    const nearWall = (x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const i = (y + dy) * MW + x + dx; if (hAt[i] || map[i] === WALL || map[i] === DOOR || map[i] === WIN) return true; } return false; };
    const gx = (b.x0 + b.x1) >> 1, gy = (b.y0 + b.y1) >> 1;
    const free = (x, y) => {
      if (x < b.x0 + 2 || x > b.x1 - 2 || y < b.y0 + 2 || y > b.y1 - 2) return false;
      if (Math.abs(x - gx) <= 1 || Math.abs(y - gy) <= 1) return false;       // прямые проходы от ворот к воротам — открыты
      const i = y * MW + x;
      return map[i] === WALK && !furn[i] && !propAt[i] && !used.has(i) && !nearWall(x, y);
    };
    const fits = cells => cells.every(([x, y]) => free(x, y));
    const claim = cells => { for (const [x, y] of cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) used.add((y + dy) * MW + x + dx); };
    const put = (p, x, y) => addProp(Object.assign({proc:true, cx:x + .5, cy:y + .5}, p), [[x, y]]);
    const line = (x, y, ax, n) => Array.from({length:n}, (_, k) => ax === 'x' ? [x + k, y] : [x, y + k]);
    let fork = 0, n = 0;
    const want = Math.round((b.x1 - b.x0) * (b.y1 - b.y0) / 50);              // около одной группы на 50 клеток двора
    for (let t = 0; t < 900 && n < want; t++) {
      const x = ri2(b.x0 + 2, b.x1 - 2), y = ri2(b.y0 + 2, b.y1 - 2), ax = R() < .5 ? 'x' : 'y', r = R();
      if (r < .3) {                                                            // контейнер(ы): 3 клетки, иногда два рядом
        const two = R() < .45, rows = two ? [0, 1] : [0];
        const cells = rows.flatMap(o => line(ax === 'x' ? x : x + o, ax === 'x' ? y + o : y, ax, 3));
        if (!fits(cells)) continue;
        claim(cells);
        for (const o of rows) {
          const c = pk(ICONT_COL), door = R() < .75;
          line(ax === 'x' ? x : x + o, ax === 'x' ? y + o : y, ax, 3).forEach(([cx, cy], k) => {
            const p = {type:k === 2 && door ? 'icont' : 'icseg', ax, k, c, solid:true, r:YARD_SOLID(cx, cy, 0)};
            if (p.type === 'icont') { p.items = null; p.searched = false; p.locked = R() < .4; }
            put(p, cx, cy);
          });
        }
      } else if (r < .5) {                                                     // поддоны штабелями
        const cells = line(x, y, ax, ri2(1, 3)); if (!fits(cells)) continue; claim(cells);
        for (const [cx, cy] of cells) put({type:'ypal', h:ri2(1, 5), solid:true, r:YARD_SOLID(cx, cy, .08)}, cx, cy);
      } else if (r < .62) {                                                    // трубы
        const cells = line(x, y, ax, ri2(2, 3)); if (!fits(cells)) continue; claim(cells);
        cells.forEach(([cx, cy], k) => put({type:'ypipe', ax, k, last:k === cells.length - 1, solid:true, r:YARD_SOLID(cx, cy, .1)}, cx, cy));
      } else if (r < .76) {                                                    // бочки кучкой
        const cells = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]].filter(() => R() < .8); if (cells.length < 2 || !fits(cells)) continue; claim(cells);
        for (const [cx, cy] of cells) put({type:'ydrum', c:R() < .5 ? [52, 84, 128] : R() < .5 ? [160, 60, 40] : [70, 90, 60], rust:R(), solid:true, r:YARD_SOLID(cx, cy, .2)}, cx, cy);
      } else if (r < .84) {                                                    // кабельная катушка или покрышки
        if (!fits([[x, y]])) continue; claim([[x, y]]);
        put(R() < .5 ? {type:'yspool', ax, solid:true, r:YARD_SOLID(x, y, .08)} : {type:'ytire', h:ri2(2, 4), solid:true, r:YARD_SOLID(x, y, .14)}, x, y);
      } else if (r < .93) {                                                    // бетонные блоки
        const cells = line(x, y, ax, ri2(2, 3)); if (!fits(cells)) continue; claim(cells);
        for (const [cx, cy] of cells) put({type:'jersey', ax:ax === 'x' ? 'y' : 'x', solid:true, r:ax === 'x' ? [cx, cy + .3, cx + 1, cy + .7] : [cx + .3, cy, cx + .7, cy + 1]}, cx, cy);
      } else {                                                                 // погрузчик — один на двор
        if (fork) continue;
        const cells = line(x, y, ax, 2); if (!fits(cells)) continue; claim(cells); fork = 1;
        cells.forEach(([cx, cy], k) => put({type:'yfork', ax, k, solid:true, r:YARD_SOLID(cx, cy, .08)}, cx, cy));
      }
      n++;
    }
  }
}

// ---- рисование (координаты клетки, высота в единицах стены: стена 50) ----
const dk = (c, m) => c.map(v => Math.round(v * m));
const segBox = (p, x, y, inset, z0, z1, c, f) => {                            // клетка длинной вещи: торцы только у крайних
  const a = p.k === 0 ? inset : 0, e = p.last || p.k === 2 ? inset : 0;
  return p.ax === 'x' ? box(x + a, y + inset, x + 1 - e, y + 1 - inset, z0, z1, c, f) : box(x + inset, y + a, x + 1 - inset, y + 1 - e, z0, z1, c, f);
};
for (const t of ['icseg', 'icont']) defProc(t, (p, f) => {
  const x = Math.floor(p.cx), y = Math.floor(p.cy), c = p.c, d = dk(c, .62), X = p.ax === 'x', H = 30;
  segBox({k:p.k, ax:p.ax, last:p.k === 2}, x, y, .08, 0, H, c, f);
  if (gfxCap > 1.5) for (let j = 0; j < 2; j++) {                              // рёбра гофры на видимом боку (на «Экономии» и «Минимуме» без них)
    const u = .3 + j * .4;
    X ? box(x + u, y + .9, x + u + .07, y + .93, 1, H - 1, d, f) : box(x + .9, y + u, x + .93, y + u + .07, 1, H - 1, d, f);
  }
  if (p.type === 'icont') {                                                    // двери в торце, запорные штанги, замок
    const open = p.searched, dc = open ? [24, 22, 20] : d;
    X ? box(x + .92, y + .12, x + .95, y + .88, 1.5, H - 1.5, dc, f) : box(x + .12, y + .92, x + .88, y + .95, 1.5, H - 1.5, dc, f);
    if (!open && gfxCap > 1.5) for (const u of [.36, .62]) X ? box(x + .945, y + u, x + .975, y + u + .04, 3, H - 3, [196, 192, 180], f) : box(x + u, y + .945, x + u + .04, y + .975, 3, H - 3, [196, 192, 180], f);
    if (p.locked) X ? box(x + .95, y + .47, x + .99, y + .55, 12, 16, [226, 190, 60], f) : box(x + .47, y + .95, x + .55, y + .99, 12, 16, [226, 190, 60], f);
  }
});
defProc('ypal', (p, f) => {                                                    // штабель: один брус и тёмные щели верхнего поддона
  const x = Math.floor(p.cx), y = Math.floor(p.cy), H = p.h * 3.2;
  box(x + .1, y + .1, x + .9, y + .9, 0, H - 1, [132, 98, 62], f);
  box(x + .1, y + .1, x + .9, y + .9, H - 1, H, [158, 120, 76], f);
});
defProc('ypipe', (p, f) => {                                                   // нижний ряд из трёх труб и верхний из двух — по одному брусу
  const x = Math.floor(p.cx), y = Math.floor(p.cy), a = p.k === 0 ? .04 : 0, e = p.last ? .04 : 0, c = [96, 104, 110];
  if (p.ax === 'x') { box(x + a, y + .05, x + 1 - e, y + .95, 0, 5.2, c, f); box(x + a, y + .21, x + 1 - e, y + .79, 5.2, 10.4, dk(c, 1.08), f); if (p.last) box(x + .94, y + .1, x + .97, y + .9, .8, 9.6, [34, 36, 38], f); }
  else { box(x + .05, y + a, x + .95, y + 1 - e, 0, 5.2, c, f); box(x + .21, y + a, x + .79, y + 1 - e, 5.2, 10.4, dk(c, 1.08), f); if (p.last) box(x + .1, y + .94, x + .9, y + .97, .8, 9.6, [34, 36, 38], f); }
});
defProc('ydrum', (p, f) => {
  const x = Math.floor(p.cx), y = Math.floor(p.cy), c = p.rust > .6 ? dk(p.c, .75).map((v, i) => i === 0 ? v + 30 : v) : p.c;
  box(x + .24, y + .24, x + .76, y + .76, 0, 15, c, f);
  box(x + .22, y + .22, x + .78, y + .78, 9.5, 10.5, dk(c, .7), f);
});
defProc('yspool', (p, f) => {
  const x = Math.floor(p.cx), y = Math.floor(p.cy), X = p.ax === 'x', w = [156, 118, 76];
  X ? (box(x + .14, y + .12, x + .24, y + .88, 0, 15, w, f), box(x + .24, y + .3, x + .76, y + .7, 3, 12, [62, 64, 66], f), box(x + .76, y + .12, x + .86, y + .88, 0, 15, w, f))
    : (box(x + .12, y + .14, x + .88, y + .24, 0, 15, w, f), box(x + .3, y + .24, x + .7, y + .76, 3, 12, [62, 64, 66], f), box(x + .12, y + .76, x + .88, y + .86, 0, 15, w, f));
});
defProc('ytire', (p, f) => {
  const x = Math.floor(p.cx), y = Math.floor(p.cy), H = p.h * 3.4;
  box(x + .16, y + .16, x + .84, y + .84, 0, H, [38, 38, 40], f);
  box(x + .36, y + .36, x + .64, y + .64, H - .1, H, [14, 14, 15], f);
});
defProc('yfork', (p, f) => {                                                   // клетка 0 — кабина и противовес, клетка 1 — мачта и вилы
  const x = Math.floor(p.cx), y = Math.floor(p.cy), X = p.ax === 'x', Y = [226, 170, 40], D = [44, 44, 46];
  const B = (a0, b0, a1, b1, z0, z1, c) => X ? box(x + a0, y + b0, x + a1, y + b1, z0, z1, c, f) : box(x + b0, y + a0, x + b1, y + a1, z0, z1, c, f);
  if (p.k === 0) {
    B(.1, .18, 1, .82, 3, 14, Y);                                             // корпус
    for (const b of [.14, .74]) { B(.18, b, .42, b + .12, 0, 6, D); B(.66, b, .9, b + .12, 0, 6, D); }   // колёса
    B(.4, .26, .5, .3, 14, 30, D); B(.4, .7, .5, .74, 14, 30, D); B(.4, .26, .9, .74, 30, 31.5, D);      // стойки и крыша кабины
    B(.62, .38, .82, .62, 14, 18, [60, 58, 54]);                               // сиденье
  } else {
    B(0, .3, .1, .36, 0, 34, D); B(0, .64, .1, .7, 0, 34, D);                  // мачта
    B(.1, .32, .78, .4, 1, 2.2, [150, 150, 146]); B(.1, .6, .78, .68, 1, 2.2, [150, 150, 146]);   // вилы
  }
});

// ---- контейнер: обыскать, а запертый — вскрыть ломом (громко) ----
defAction('icpry', {run:a0 => {
  if (mode !== 'play' || paused || panel || P.sleep) return;
  $('actMenu').hidden = true;
  const p = a0.f;
  if (!hasTool('crowbar')) { toast('Контейнер заперт на замок. Нужен лом'); return; }
  p.locked = false; P.face = P.fd = Math.atan2(p.cy - P.y, p.cx - P.x);
  SFX.hit(true, p.cx, p.cy); SFX.knock(p.cx, p.cy); noise(p.cx, p.cy, 7);     // скрежет и лязг на весь двор
  toast('Замок сорван. Лязг разнёсся по двору');
  doAction({kind:'search', label:'Обыскать', f:p});
}});
