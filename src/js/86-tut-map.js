// ================= карта обучения: один дом за высоким забором, лес вокруг, дорога за воротами =================
// Строится вместо района, когда genTutMap = true (его ставит обучение, 98-tutorial). Маленькая (TUT_MW клеток),
// уйти со двора нельзя: забор глухой и высокий, через него не перелезть; за ним — лес, перед воротами — дорога.
// В финале обучения ворота ломаются, и мертвецы с дороги идут во двор (tutBreakGate).
let genTutMap = false;
const TUT_MW = 52;
const TUT_FENCE = {x0:12, y0:9, x1:39, y1:38};                              // линия забора (клетки)

function genTutorial() {
  const F = TUT_FENCE;
  // дом с входной дверью на юг (к воротам); генератор комнат случайный — пробуем, пока дверь не встанет как надо
  let H = null;
  for (let t = 0; t < 60; t++) {
    genReset();
    H = bld(19, 17, 12, 9, 'house');
    if (H && H.doors.some(d => d.s === 1)) break;
  }
  const door = H.doors.find(d => d.s === 1) || H.doors[0];
  // дорога за воротами: тротуар, две полосы, тротуар
  const ry = F.y1 + 3;
  for (let x = 0; x < MW; x++) { set(x, ry - 1, WALK); for (let k = 0; k < RW; k++) set(x, ry + k, ROAD); set(x, ry + RW, WALK); }
  // дорожка от двери к воротам (две клетки шириной) и за ворота к тротуару
  const gx = Math.min(Math.max(door.x, F.x0 + 3), F.x1 - 4);
  for (let y = door.y + 1; y < ry - 1; y++) { set(gx, y, WALK); set(gx + 1, y, WALK); }
  // сарай в углу заднего двора
  const shed = bld(F.x0 + 2, F.y0 + 2, 5, 4, 'shed');
  if (shed) { const sd = shed.doors[0]; if (sd) { const o = [[0, -1], [0, 1], [-1, 0], [1, 0]][sd.s]; for (let k = 1; k < 3; k++) if (get(sd.x + o[0] * k, sd.y + o[1] * k) === GRASS) set(sd.x + o[0] * k, sd.y + o[1] * k, WALK); } }
  // высокий забор по периметру, в нём ворота напротив дорожки
  const put = (x, y, ax, gate) => addProp({type:'hfence', proc:true, ax, gate:!!gate, cx:x + .5, cy:y + .5, solid:true,
    r:ax === 'x' ? [x, y + .42, x + 1, y + .58] : [x + .42, y, x + .58, y + 1]}, [[x, y]]);
  for (let x = F.x0; x <= F.x1; x++) { put(x, F.y0, 'x'); put(x, F.y1, 'x', x === gx || x === gx + 1); }
  for (let y = F.y0 + 1; y < F.y1; y++) { put(F.x0, y, 'y'); put(F.x1, y, 'y'); }
  // грядки у забора справа от дорожки
  for (let y = H.y + H.h + 3; y <= H.y + H.h + 5; y++) for (let x = F.x1 - 6; x <= F.x1 - 3; x++) {
    const i = y * MW + x; if (map[i] === GRASS && !propAt[i] && !hAt[i]) addProp({type:'veg', proc:true, cx:x + .5, cy:y + .5, solid:false, r:[x + .08, y + .08, x + .92, y + .92], dug:false, v:(x + y) % 3}, [[x, y]]);
  }
  // брошенная машина на дороге — видно через ворота
  parkCarAt(gx - 6, ry + 1, 'x');
  // деревья: за забором — сплошной лес (кроме дороги), во дворе — несколько у заднего забора, позади дома
  const nearWall = (x, y) => D8.some(([a, b]) => { const t = get(x + a, y + b); return t === WALL || t === DOOR || t === WIN; });
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x; if (map[i] !== GRASS || propAt[i] || hAt[i]) continue;
    const out = x < F.x0 || x > F.x1 || y < F.y0 || y > F.y1;
    if (out) {
      if (y >= ry - 2 && y <= ry + RW + 1) continue;                            // у дороги — обочина без деревьев
      const nearF = x >= F.x0 - 1 && x <= F.x1 + 1 && y >= F.y0 - 1 && y <= F.y1 + 1;
      if (rng() < (nearF ? .45 : .82)) set(x, y, TREE);
    } else if (y < H.y - 1 && y > F.y0 + 1 && !nearWall(x, y) && !(x > F.x0 && x < F.x0 + 9 && y < F.y0 + 8) && rng() < .3) set(x, y, TREE);
    else if (y > F.y0 && (x === F.x0 + 1 || x === F.x1 - 1) && y < H.y + H.h && !nearWall(x, y) && rng() < .35) set(x, y, TREE);
  }
  // как genFinish, но без тайника выживших (он заколотил бы этот единственный дом) и без почтового ящика
  for (let i = 0; i < NT; i++) if (map[i] === WALL) { const x = i % MW, y = (i / MW) | 0; wpC[i] = pieces(x, y, HWC); wpV[i] = pieces(x, y, HWV); } else { wpC[i] = wpV[i] = null; }
  for (let i = 0; i < NT; i++) {
    const x = i % MW, y = (i / MW) | 0;
    if (map[i] === GRASS && !propAt[i] && !furn[i] && !hAt[i] && rng() < .06) addProp({type:'bush', cx:x + .5, cy:y + .5, solid:false, s:.6 + rng() * .5}, [[x, y]]);
  }
  for (const p of props) if (p.type === 'car') { p.items = [mkItem('water')]; p.searched = false; p.fuel = 0; p.key = false; p.hp = 40; }
  world.nofence = true;
}

// ---- со двора не уйти: ни через сломанные ворота, ни как-то ещё. Мертвецы заходят, герой выйти не может ----
function tutKeepIn() {
  if (!P || mode !== 'play' || world.dtype !== 'tut') return;
  const F = TUT_FENCE, x0 = F.x0 + .5 + P.r + .05, x1 = F.x1 + .5 - P.r - .05, y0 = F.y0 + .5 + P.r + .05, y1 = F.y1 + .5 - P.r - .05;
  if (P.x >= x0 && P.x <= x1 && P.y >= y0 && P.y <= y1) return;
  P.x = Math.min(x1, Math.max(x0, P.x)); P.y = Math.min(y1, Math.max(y0, P.y));
  if (P.act && P.act.tx != null) P.act = null;
  if ((P._tutWallT || 0) < performance.now()) { P._tutWallT = performance.now() + 4000; toast('Там толпа. Назад во двор'); }
}
onUpdate(tutKeepIn);

// ---- финал обучения: ворота не выдержали ----
function tutBreakGate() {
  let n = 0;
  for (const p of props) if (p.type === 'hfence' && p.gate && !p.broken) {
    p.broken = true; p.solid = false; n++;
    emit('wood', p.cx, p.cy, 1, 6, null, 0, 1.6);
  }
  if (n) { const g = props.find(p => p.type === 'hfence' && p.gate); if (g) { SFX.knock(g.cx, g.cy); SFX.wood(g.cx, g.cy); } buildFlow(); clearCaches(); }
  return n;
}

// ---- как рисуется высокий дощатый забор и ворота ----
{
  PROPN.hfence = 'Высокий забор';
  const HF = 46;                                                                // выше человека: через такой не перелезть
  const hfAt = (x, y) => { const id = x >= 0 && y >= 0 && x < MW && y < MH ? propAt[y * MW + x] : 0, q = id && props[id - 1]; return q && q.type === 'hfence' ? q : null; };
  defProc('hfence', (p, f) => {
    const x = Math.floor(p.cx), y = Math.floor(p.cy), X = p.ax === 'x', t = .05, cx = x + .5, cy = y + .5;
    const col = p.gate ? [96, 72, 50] : [118, 92, 64], dark = [col[0] * .72, col[1] * .72, col[2] * .72];
    const tex = typeof TX !== 'undefined' && TX.planksV ? {s:TX.planksV(col), e:TX.planksV(col), t:C(col, 1)} : null;
    // рядом с героем и между ним и камерой — полупрозрачный, чтобы не прятать его целиком
    const a = mode === 'play' && P && x + y + 1 > P.x + P.y && Math.hypot(p.cx - P.x, p.cy - P.y) < 2.6 ? .4 : 1;
    const seg = (u0, u1, z0, z1, c, tx) => X ? box(x + u0, cy - t, x + u1, cy + t, z0, z1, c, f, a, tx) : box(cx - t, y + u0, cx + t, y + u1, z0, z1, c, f, a, tx);
    if (p.gate && p.broken) {                                                     // выломанная створка лежит на земле
      if (X) box(x + .05, cy - .1, x + .95, cy + .55, 0, 2.5, col, f, 1); else box(cx - .1, y + .05, cx + .55, y + .95, 0, 2.5, col, f, 1);
      seg(0, .08, 0, HF + 4, dark); return;
    }
    // угол: короткий отросток к соседнему куску поперёк, чтобы стык был без щели
    for (const [dx, dy] of X ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]]) {
      const q = hfAt(x + dx, y + dy); if (!q || q.ax === p.ax) continue;
      if (dx) box(dx > 0 ? cx : x, cy - t, dx > 0 ? x + 1 : cx, cy + t, 0, HF, col, f, a, tex);
      else box(cx - t, dy > 0 ? cy : y, cx + t, dy > 0 ? y + 1 : cy, 0, HF, col, f, a, tex);
    }
    seg(0, 1, 0, HF, col, tex);
    seg(0, 1, 10, 13, dark); seg(0, 1, HF - 12, HF - 9, dark);                      // поперечины
    seg(0, .07, 0, HF + 3, dark);                                                   // столб
    if (p.gate) { seg(.08, .92, HF - 2, HF, dark); seg(.8, .86, 22, 26, [190, 160, 90]); }   // ворота: верхний брус и ручка
  });
}
