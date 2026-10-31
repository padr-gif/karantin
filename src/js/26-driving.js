// ================= driving =================
const CAR_L = 3.8, CAR_W = 1.64;                                             // ~4.2 × 1.8 м: машина по плечо герою (v80: была вдвое меньше)
let dynCars = [];
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
function carIdx(p) { return props.indexOf(p) + 1; }
function carAng(p) { return p.ang != null ? p.ang : p.dir === 'x' ? (p.flip ? Math.PI : 0) : (p.flip ? -Math.PI / 2 : Math.PI / 2); }
function carCircles(x, y, a) { const dx = Math.cos(a), dy = Math.sin(a); return [-1.28, -.43, .43, 1.28].map(k => [x + dx * k, y + dy * k]); }
function carBlocked(x, y, a) {
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  for (const [cx, cy] of carCircles(x, y, a)) if (blocked(cx, cy, .72)) return true;
  for (const u of [-1.86, -1.4, -.93, -.47, 0, .47, .93, 1.4, 1.86]) for (const w of [-.8, .8]) if (blocked(x + dx * u + nx * w, y + dy * u + ny * w, .05)) return true;
  for (const w of [-.55, 0, .55]) for (const u of [-1.9, 1.9]) if (blocked(x + dx * u + nx * w, y + dy * u + ny * w, .05)) return true;
  return false;
}
function unparkCar(p) {
  const id = carIdx(p);
  for (let i = 0; i < NT; i++) if (propAt[i] === id) propAt[i] = 0;
}
function parkCar(p) {
  const id = carIdx(p), a = p.ang, cs = carCircles(p.cx, p.cy, a);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [cx, cy] of cs) {
    x0 = Math.min(x0, cx - .7); y0 = Math.min(y0, cy - .7); x1 = Math.max(x1, cx + .7); y1 = Math.max(y1, cy + .7);
  }
  for (let ty = Math.floor(y0); ty <= Math.floor(y1 - 1e-3); ty++) for (let tx = Math.floor(x0); tx <= Math.floor(x1 - 1e-3); tx++) {
    const i = ty * MW + tx; if (tx >= 0 && ty >= 0 && tx < MW && ty < MH && !propAt[i]) propAt[i] = id;
  }
  p.r = [x0, y0, x1, y1];
}
function makeDyn(p) { if (p.dyn) return; p.dyn = true; p.ang = carAng(p); p.v = p.v || 0; if (!dynCars.includes(p)) dynCars.push(p); }
function enterCar(p, silent) {
  if (!silent && p.fuel > 0) ach('drive');
  makeDyn(p); unparkCar(p);
  P.car = p; P.act = null; P.sneak = false; P.x = p.cx; P.y = p.cy;
  p.engine = p.fuel > 0 && p.hp > 0;
  if (!silent) { (SFX.carDoor || SFX.door)(true); toast(p.hp <= 0 ? 'Машина разбита, не заводится' : p.fuel > 0 ? 'Завёл мотор. Бензин ' + Math.round(p.fuel) + '%' : 'Бак пустой. Нужна канистра бензина'); }
  $('bSneak').hidden = $('bRun').hidden = true; setAtk(true);
}
function exitCar() {
  const p = P.car; if (!p) return;
  if (Math.abs(p.v) > 2) { toast('Сначала остановись'); return; }
  const a = p.ang, nx = -Math.sin(a), ny = Math.cos(a);
  const fx = Math.cos(a), fy = Math.sin(a);                                  // у двери водителя, у пассажирской, спереди, сзади, чуть дальше
  const spots = [[nx * 1.25 + fx * .3, ny * 1.25 + fy * .3], [-nx * 1.25 + fx * .3, -ny * 1.25 + fy * .3], [fx * 2.4, fy * 2.4], [-fx * 2.4, -fy * 2.4], [nx * 1.8, ny * 1.8], [-nx * 1.8, -ny * 1.8]];
  const s = spots.find(([ox, oy]) => !blocked(p.cx + ox, p.cy + oy, .27));
  if (!s) { toast('Двери не открыть: вокруг тесно'); return; }
  p.v = 0; p.engine = false; P.car = null;
  P.x = p.cx + s[0]; P.y = p.cy + s[1]; P.face = Math.atan2(s[1], s[0]); P.fd = P.face;
  parkCar(p); (SFX.carDoor || SFX.door)(false);
  $('bSneak').hidden = $('bRun').hidden = false; setAtk(false);
}
function honk() { const p = P.car; if (!p || (p.hornT || 0) > 0) return; p.hornT = .6; SFX.horn(); noise(p.cx, p.cy, 20); }
function driveUpdate(dt, wx, wy, mag) {
  const p = P.car; p.hornT = Math.max(0, (p.hornT || 0) - dt);
  if (atkHeld) honk();
  const run = p.engine && p.fuel > 0 && p.hp > 0;
  let thr = 0, steer = 0;
  // classic controls: wheel left/right, gas pedal, brake that turns into reverse once stopped
  const ctl = carCtl(); steer = ctl.steer;
  if (run) { if (ctl.gas) thr = 1; else if (ctl.brake) thr = -1; }
  mag = ctl.gas || ctl.brake ? 1 : 0;
  const maxV = thr >= 0 ? 8 : 3;
  if (thr > 0) p.v += (thr * maxV - p.v) * dt * (p.v < 0 ? 4 : 1.25);
  else if (thr < 0) p.v += (p.v > .3 ? -14 * dt : (thr * maxV - p.v) * dt * 2.5);
  else p.v *= Math.max(0, 1 - dt * (mag > 0 ? .5 : 1.8));
  if (Math.abs(p.v) < .02) p.v = 0;
  const tr = Math.abs(p.v) < .1 ? 0 : 2.6 * Math.max(.3, Math.min(1, Math.abs(p.v) / 2)) * (Math.abs(p.v) > 6 ? .75 : 1);
  const na = p.ang + steer * tr * Math.sign(p.v) * dt;
  const nx = p.cx + Math.cos(na) * p.v * dt, ny = p.cy + Math.sin(na) * p.v * dt;
  carKnock(nx, ny, na, p.v);                                                // ящики и урны на пути — сбить (97-knock)
  if (!carBlocked(nx, ny, na)) { p.cx = nx; p.cy = ny; p.ang = na; }
  else if (!carBlocked(p.cx, p.cy, na)) { p.ang = na; p.v *= .5; }
  else {
    if (Math.abs(p.v) > 3) { p.hp = Math.max(0, p.hp - Math.abs(p.v) * 1.6); SFX.knock(p.cx, p.cy); noise(p.cx, p.cy, 10); if (!reduceMotion && settings.shake) shake = .25; if (Math.abs(p.v) > 6.2) crashInjury(p.v); }
    p.v = -p.v * .25;
  }
  if (run) { p.fuel = Math.max(0, p.fuel - Math.abs(p.v) * dt * .3 - dt * .004); if (p.fuel <= 0) { p.engine = false; toast('Бензин кончился'); } }
  if (p.hp <= 0 && p.engine) { p.engine = false; toast('Мотор заглох: машина разбита'); }
  P.x = p.cx; P.y = p.cy; P.face = p.ang; P.fd = p.ang;
  // zombies: ram at speed, get pushed at low speed
  const dx = Math.cos(p.ang), dy = Math.sin(p.ang);
  for (const z of zs.slice()) {
    const rx = z.x - p.cx, ry = z.y - p.cy, along = Math.max(-CAR_L / 2, Math.min(CAR_L / 2, rx * dx + ry * dy));
    const qx = p.cx + dx * along, qy = p.cy + dy * along, d = Math.hypot(z.x - qx, z.y - qy);
    if (d > CAR_W / 2 + z.r) continue;
    const sp = Math.abs(p.v);
    if (sp > 1.2) {
      const dmg = sp * sp * 1.6 + sp * 3; z.hp -= dmg; z.stun = .6;
      const side = Math.sign((z.x - qx) * -dy + (z.y - qy) * dx) || 1;
      z.kx = dx * p.v * .7 - dy * side * 2; z.ky = dy * p.v * .7 + dx * side * 2;
      addBlood(z.x, z.y, .6); emit('blood', z.x, z.y, 1, 8, Math.atan2(dy, dx), 1.2, 2.6); SFX.hit(true, z.x, z.y);
      p.hp = Math.max(0, p.hp - .8); p.v *= sp > 4 ? .9 : .97;
      if (z.hp <= 0) killZombie(z);
    } else { const l = d || 1; z.x += (z.x - qx) / l * .09 + dx * p.v * dt; z.y += (z.y - qy) / l * .09 + dy * p.v * dt; p.v *= .97; }
  }
  p.nT = (p.nT || 0) - dt; if (p.nT <= 0 && p.engine) { p.nT = 1; noise(p.cx, p.cy, 6 + Math.abs(p.v) * 1.4); }
  p.thr = thr;                                                               // газ для звука мотора (92-car-sound)
}
function drawCarDyn(p, f) {
  const a = p.ang, dx = Math.cos(a), dy = Math.sin(a), ax = p.cx - dx * CAR_L / 2, ay = p.cy - dy * CAR_L / 2;
  const col = CARC[p.ci] || [120, 120, 120], nx = -dy, ny = dx;
  const painted = drawPaintedAt(carFrame(p.ci, a), p.cx, p.cy, f);           // рисованная модель, обе графики (90-painted)
  if (!painted) {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath();
    const sh = [[ax + nx * .5, ay + ny * .5], [ax + dx * CAR_L + nx * .5, ay + dy * CAR_L + ny * .5], [ax + dx * CAR_L - nx * .5, ay + dy * CAR_L - ny * .5], [ax - nx * .5, ay - ny * .5]];
    sh.forEach(([x, y], k) => k ? ctx.lineTo(SX(x, y), SY(x, y, 0)) : ctx.moveTo(SX(x, y), SY(x, y, 0))); ctx.closePath(); ctx.fill();
    for (const [u, s] of [[.32, 1], [.32, -1], [1.55, 1], [1.55, -1]]) obox(ax + dx * u + nx * s * .38 - dx * .15, ay + dy * u + ny * s * .38 - dy * .15, dx, dy, .3, .14, 0, 7, [24, 24, 26], f);
    obox(ax, ay, dx, dy, CAR_L, CAR_W, 4, 15, col, f);
    obox(ax + dx * .5, ay + dy * .5, dx, dy, .92, CAR_W * .84, 15, 24, [52, 64, 76], f);
    obox(ax + dx * .56, ay + dy * .56, dx, dy, .8, CAR_W * .8, 24, 26, col, f);
  }
  if (p.police) { const zx = SX(p.cx, p.cy), zy = SY(p.cx, p.cy, 47); ctx.fillStyle = Math.floor(animT * 5) % 2 ? "#ff3b30" : "#3d7bff"; ctx.fillRect(zx - 7, zy - 2.5, 14, 4); }
  const lights = p.engine ? '#ffe9a8' : C([200, 196, 170], f);
  if (!painted || p.engine) for (const s of [1, -1]) {                       // у рисованной модели фары свои — поверх только горящие
    const fx = ax + dx * (CAR_L - .02) + nx * s * .3, fy = ay + dy * (CAR_L - .02) + ny * s * .3, bx = ax + dx * .02 + nx * s * .3, by = ay + dy * .02 + ny * s * .3;
    ctx.fillStyle = lights; ctx.fillRect(SX(fx, fy) - 1.2, SY(fx, fy, 11) - 1, 2.4, 2);
    ctx.fillStyle = p.engine && p.v < -.1 ? '#ffffff' : '#c0281e'; ctx.fillRect(SX(bx, by) - 1.2, SY(bx, by, 11) - 1, 2.4, 2);
  }
  if (p.hp < 40) { if (!reduceMotion && Math.random() < .15) emit('smoke', ax + dx * CAR_L, ay + dy * CAR_L, .5, 1, null, 0, .3); }
}

// ---- машины крупнее (v80) ----
// Генерация мира ставит машину на 2 клетки (1.9 × 0.84). Её не трогаем: номера объектов и случайные числа те же,
// старые сохранения (машины в них — по номеру) грузятся как раньше. После генерации каждую машину увеличиваем
// вокруг центра до CAR_L × CAR_W, двигаем поперёк, чтобы стояла на дороге, и вдоль, если налезает на соседку.
// Если места нет совсем — машина убирается (type 'gone'), но остаётся в списке, чтобы номера остальных не сдвинулись.
function carRectAt(cx, cy, dir) { const a = CAR_L / 2, b = CAR_W / 2; return dir === 'x' ? [cx - a, cy - b, cx + a, cy + b] : [cx - b, cy - a, cx + b, cy + a]; }
function growCars() {
  const fitTiles = (R, id, strict) => {
    for (let ty = Math.floor(R[1]); ty <= Math.floor(R[3] - 1e-3); ty++) for (let tx = Math.floor(R[0]); tx <= Math.floor(R[2] - 1e-3); tx++) {
      if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return false;
      const i = ty * MW + tx, t = map[i];
      if (isWallish(t) || t === TREE || t === WATER || furn[i] || (propAt[i] && propAt[i] !== id)) return false;
      if (strict && t !== ROAD) return false;
      if (cross && cross[i]) return false;                                    // gen 5: не в перекрёстке и не у самого края его
    }
    return true;
  };
  const cross = W5() ? crossMask(2) : null;
  const shifts = [];                                                          // поперёк — ближе к середине дороги, вдоль — до 1.5 клетки
  for (const al of [0, .5, -.5, 1, -1, 1.5, -1.5]) for (const ac of [0, .4, -.4, .8, -.8]) shifts.push([al, ac]);
  for (let k = 0; k < props.length; k++) {
    const p = props[k]; if (p.type !== 'car' || p.big) continue;
    const id = k + 1, onRoad = get(Math.floor(p.cx), Math.floor(p.cy)) === ROAD;
    for (let i = 0; i < NT; i++) if (propAt[i] === id) propAt[i] = 0;
    let best = null;
    for (const strict of onRoad ? [true, false] : [false]) {
      for (const [al, ac] of shifts) {
        const cx = p.cx + (p.dir === 'x' ? al : ac), cy = p.cy + (p.dir === 'x' ? ac : al), R = carRectAt(cx, cy, p.dir);
        if (fitTiles(R, id, strict)) { best = [cx, cy, R]; break; }
      }
      if (best) break;
    }
    if (!best) { p.type = 'gone'; p.solid = false; continue; }                 // не влезла: убрать, номер оставить
    p.cx = best[0]; p.cy = best[1]; p.r = best[2]; p.big = true;
    for (let ty = Math.floor(p.r[1]); ty <= Math.floor(p.r[3] - 1e-3); ty++) for (let tx = Math.floor(p.r[0]); tx <= Math.floor(p.r[2] - 1e-3); tx++) propAt[ty * MW + tx] = id;
  }
}

// ---- порядок рисования рядом с машиной (v82) ----
// Машина длинная (CAR_L), а в общей сортировке у неё одна глубина — по центру. Столб, человек или куст у её переднего
// края по этой глубине оказывались «ближе» и рисовались поверх кузова, хотя стоят сбоку и позади. Здесь для всего,
// что рядом (≤3 клеток), порядок решается по положению относительно кузова: позади кузова — до машины, перед — после.
// Ось выбирается по тому, за какую грань кузова точка выступает дальше; работает и для машины под углом.
function carDepthFix(dl) {
  let cars = null;
  for (const e of dl) if (e.k === 16 || (e.k === 7 && e.p.type === 'car')) (cars || (cars = [])).push(e);
  if (!cars) return;
  const pos = e => e.k === 5 ? [e.z.x, e.z.y] : e.k === 6 ? [P.x, P.y] : e.k === 7 ? [e.p.cx, e.p.cy] : e.k === 2 ? [e.x + .5, e.y + .5] : e.k === 8 ? [e.c.x, e.c.y] : e.k === 10 ? [e.p.x, e.p.y] : null;
  for (const c of cars) {
    const p = c.p, a = p.dyn ? p.ang : carAng(p), dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
    for (const e of dl) {
      if (e === c || (e.k === 7 && e.p.type === 'car') || e.k === 16) continue;
      const q = pos(e); if (!q) continue;
      const rx = q[0] - p.cx, ry = q[1] - p.cy; if (rx * rx + ry * ry > 9) continue;
      const u = rx * dx + ry * dy, v = rx * nx + ry * ny, eu = Math.abs(u) - CAR_L / 2, ev = Math.abs(v) - CAR_W / 2;
      if (eu <= 0 && ev <= 0) continue;                                       // внутри кузова (сидит в машине) — как есть
      const side = eu > ev ? Math.sign(u) * (dx + dy) : Math.sign(v) * (nx + ny);   // > 0 — со стороны камеры
      if (side < -1e-3 && e.d > c.d) e.d = c.d - .001;
      else if (side > 1e-3 && e.d < c.d) e.d = c.d + .001;
    }
  }
}
