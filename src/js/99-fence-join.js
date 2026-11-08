// ================= заборы дворов: сплошные, проём — только калитка =================
// Раньше в линии забора оставались дырки: клетку занимал куст или почтовый ящик, у калитки проём выходил в две клетки
// (дорожка в одну), а на углах звенья не сходились — каждое рисовалось поперёк всей своей клетки, и на стыке зияла полклетки.
// Теперь после постройки мира (и так же при загрузке — мир строится заново одинаково):
//  1) короткие разрывы в линии (до 3 клеток) заделываются тем же забором;
//     проём остаётся только на дорожке к дому (калитка) и на въезде для машины;
//     куст из линии убирается, почтовый ящик переезжает на соседнюю клетку за забор;
//  2) каждое звено знает соседей и рисует перекладины только к ним — углы и стыки буквой «Т» сходятся в одном столбе.
// Новые звенья добавляются в конец списка вещей самым последним шагом постройки мира,
// поэтому номера машин и мусорных баков в сохранениях не сдвигаются.
{
  const isPF = (x, y) => { if (!inMap(x, y, 0)) return null; const id = propAt[y * MW + x], p = id && props[id - 1]; return p && p.type === 'pfence' ? p : null; };
  const MOVABLE = new Set(['bush', 'mail']);
  const gonePr = p => { p.type = 'pgone'; p.proc = true; p.solid = false; };
  const pathy = t => t === WALK || t === ROAD;
  function freeGround(x, y) {
    if (!inMap(x, y, 1)) return false;
    const i = y * MW + x, t = map[i];
    if (t !== GRASS || hAt[i] || furn[i]) return false;
    if (D4.some(([a, b]) => { const q = map[(y + b) * MW + x + a]; return q === DOOR || q === WIN; })) return false;
    return true;
  }
  // освободить клетку под забор: куст убрать, ящик переставить за забор
  function clearCell(x, y, ax) {
    const i = y * MW + x, id = propAt[i]; if (!id) return true;
    const p = props[id - 1]; if (!p || p.type === 'pgone') { propAt[i] = 0; return true; }
    if (!MOVABLE.has(p.type)) return false;
    if (p.type === 'mail') {
      const sides = ax === 'x' ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];
      // ближе к дороге — туда и ставим ящик
      sides.sort((A, B) => +[1, 2].some(k => pathy(map[(y + B[1] * k) * MW + x + B[0] * k])) - +[1, 2].some(k => pathy(map[(y + A[1] * k) * MW + x + A[0] * k])));
      for (const [a, b] of sides) {
        const nx = x + a, ny = y + b, j = ny * MW + nx;
        if (!inMap(nx, ny, 1) || propAt[j] || hAt[j] || furn[j] || (map[j] !== GRASS && map[j] !== WALK)) continue;
        propAt[i] = 0; propAt[j] = id; p.cx += a; p.cy += b; if (p.r) p.r = [p.r[0] + a, p.r[1] + b, p.r[2] + a, p.r[3] + b];
        return true;
      }
    }
    gonePr(p); propAt[i] = 0; return true;
  }
  function fillGaps() {
    const add = [];
    for (const p of props.slice()) {
      if (p.type !== 'pfence') continue;
      const x = Math.floor(p.cx), y = Math.floor(p.cy), X = p.ax === 'x';
      for (const s of [1, -1]) {
        const at = k => X ? [x + s * k, y] : [x, y + s * k];
        if (isPF(...at(1))) continue;
        let k = 2; for (; k <= 4; k++) if (isPF(...at(k))) break;
        if (k > 4) continue;                                                     // линия кончилась — это не разрыв
        const gap = []; for (let j = 1; j < k; j++) gap.push(at(j));
        const gate = gap.some(([gx, gy]) => pathy(map[gy * MW + gx]));
        if (gate && gap.every(([gx, gy]) => map[gy * MW + gx] === ROAD)) continue;   // въезд для машины
        const fill = gap.filter(([gx, gy]) => !pathy(map[gy * MW + gx]));          // калитка — ровно по ширине дорожки
        if (!fill.every(([gx, gy]) => freeGround(gx, gy) && (!propAt[gy * MW + gx] || MOVABLE.has((props[propAt[gy * MW + gx] - 1] || {}).type) || (props[propAt[gy * MW + gx] - 1] || {}).type === 'pgone'))) continue;
        for (const [gx, gy] of fill) {
          if (isPF(gx, gy) || !clearCell(gx, gy, p.ax)) continue;
          const q = {type:'pfence', proc:true, ax:p.ax, st:p.st, cx:gx + .5, cy:gy + .5, solid:true, joined:true,
            r:X ? [gx, gy + .44, gx + 1, gy + .56] : [gx + .44, gy, gx + .56, gy + 1]};
          if (addProp(q, [[gx, gy]])) add.push(q);
        }
      }
    }
    return add.length;
  }
  // соседи звена: 1 — север (y−1), 2 — восток, 4 — юг, 8 — запад
  const DIRS = [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]];
  function linkAll() {
    for (const p of props) {
      if (p.type !== 'pfence') continue;
      const x = Math.floor(p.cx), y = Math.floor(p.cy), X = p.ax === 'x';
      let m = 0;
      for (const [a, b, bit] of DIRS) {
        if (isPF(x + a, y + b)) m |= bit;
        else if ((X ? a : b) && isWallish(get(x + a, y + b))) m |= bit;           // упирается в стену дома — доводим до стены
      }
      if (!m) m = X ? 2 | 8 : 1 | 4;
      p.m = m;
      // твёрдая часть — по перекладинам вдоль своей оси
      const lo = X ? (m & 8 ? 0 : .44) : (m & 1 ? 0 : .44), hi = X ? (m & 2 ? 1 : .56) : (m & 4 ? 1 : .56);
      p.r = X ? [x + lo, y + .44, x + hi, y + .56] : [x + .44, y + lo, x + .56, y + hi];
    }
  }
  onNewWorld(() => {
    if (!props.some(p => p.type === 'pfence')) return;
    fillGaps(); linkAll();
    if (typeof buildFlow === 'function') buildFlow();
    clearCaches();
  });

  // ---- рисование: столб в середине клетки, перекладины и штакетины — к каждому соседу ----
  const raw0 = drawProcRaw;
  drawProcRaw = function (p, f) {
    if (p.type !== 'pfence' || p.m == null) return raw0.apply(this, arguments);
    const x = Math.floor(p.cx), y = Math.floor(p.cy), c = PF_COL[p.st || 0], cx = x + .5, cy = y + .5, t = .035;
    const dark = [c[0] * .8, c[1] * .8, c[2] * .8];
    for (const [a, b, bit] of DIRS) {
      if (!(p.m & bit)) continue;
      const ex = cx + a * .5, ey = cy + b * .5;
      const x0 = Math.min(cx, ex) - (a ? 0 : t), x1 = Math.max(cx, ex) + (a ? 0 : t), y0 = Math.min(cy, ey) - (b ? 0 : t), y1 = Math.max(cy, ey) + (b ? 0 : t);
      if (p.st === 3) { box(x0, y0, x1, y1, 0, 22, c, f); continue; }
      for (const z of [5, 12]) box(x0, y0, x1, y1, z, z + 1.6, c, f);
      for (const [u, h] of [[.1, 16.5], [.3, 15]]) { const px = cx + a * u, py = cy + b * u; box(px - .045, py - .045, px + .045, py + .045, 0, h, c, f); }
    }
    if (p.st !== 3) box(cx - .05, cy - .05, cx + .05, cy + .05, 0, 17, dark, f);
  };
}
