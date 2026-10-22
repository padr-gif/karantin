// ================= v5: driving =================
const CAR_L = 1.9, CAR_W = .84;
let dynCars = [];
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
function carIdx(p) { return props.indexOf(p) + 1; }
function carAng(p) { return p.ang != null ? p.ang : p.dir === 'x' ? (p.flip ? Math.PI : 0) : (p.flip ? -Math.PI / 2 : Math.PI / 2); }
function carCircles(x, y, a) { const dx = Math.cos(a), dy = Math.sin(a); return [-.62, 0, .62].map(k => [x + dx * k, y + dy * k]); }
function carBlocked(x, y, a) {
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  for (const [cx, cy] of carCircles(x, y, a)) if (blocked(cx, cy, .36)) return true;
  for (const u of [-.93, -.45, 0, .45, .93]) for (const w of [-.4, .4]) if (blocked(x + dx * u + nx * w, y + dy * u + ny * w, .05)) return true;
  for (const w of [-.2, .2]) for (const u of [-.95, .95]) if (blocked(x + dx * u + nx * w, y + dy * u + ny * w, .05)) return true;
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
    x0 = Math.min(x0, cx - .38); y0 = Math.min(y0, cy - .38); x1 = Math.max(x1, cx + .38); y1 = Math.max(y1, cy + .38);
    const tx = Math.floor(cx), ty = Math.floor(cy), i = ty * MW + tx;
    if (tx >= 0 && ty >= 0 && tx < MW && ty < MH && !propAt[i]) propAt[i] = id;
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
  const spots = [[nx * 1.05, ny * 1.05], [-nx * 1.05, -ny * 1.05], [Math.cos(a) * 1.5, Math.sin(a) * 1.5], [-Math.cos(a) * 1.5, -Math.sin(a) * 1.5], [nx * 1.6, ny * 1.6], [-nx * 1.6, -ny * 1.6]];
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
    const rx = z.x - p.cx, ry = z.y - p.cy, along = Math.max(-.95, Math.min(.95, rx * dx + ry * dy));
    const qx = p.cx + dx * along, qy = p.cy + dy * along, d = Math.hypot(z.x - qx, z.y - qy);
    if (d > .44 + z.r) continue;
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
  p.sT = (p.sT || 0) - dt; if (p.sT <= 0 && p.engine) { p.sT = .11; SFX.engine(Math.abs(p.v) / 8.5); }
}
function drawCarDyn(p, f) {
  const a = p.ang, dx = Math.cos(a), dy = Math.sin(a), ax = p.cx - dx * CAR_L / 2, ay = p.cy - dy * CAR_L / 2;
  const col = CARC[p.ci] || [120, 120, 120], nx = -dy, ny = dx;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath();
  const sh = [[ax + nx * .5, ay + ny * .5], [ax + dx * CAR_L + nx * .5, ay + dy * CAR_L + ny * .5], [ax + dx * CAR_L - nx * .5, ay + dy * CAR_L - ny * .5], [ax - nx * .5, ay - ny * .5]];
  sh.forEach(([x, y], k) => k ? ctx.lineTo(SX(x, y), SY(x, y, 0)) : ctx.moveTo(SX(x, y), SY(x, y, 0))); ctx.closePath(); ctx.fill();
  for (const [u, s] of [[.32, 1], [.32, -1], [1.55, 1], [1.55, -1]]) obox(ax + dx * u + nx * s * .38 - dx * .15, ay + dy * u + ny * s * .38 - dy * .15, dx, dy, .3, .14, 0, 7, [24, 24, 26], f);
  obox(ax, ay, dx, dy, CAR_L, CAR_W, 4, 15, col, f);
  obox(ax + dx * .5, ay + dy * .5, dx, dy, .92, CAR_W * .84, 15, 24, [52, 64, 76], f);
  obox(ax + dx * .56, ay + dy * .56, dx, dy, .8, CAR_W * .8, 24, 26, col, f);
  if (p.police) { const zx = SX(p.cx, p.cy), zy = SY(p.cx, p.cy, 28); ctx.fillStyle = Math.floor(animT * 5) % 2 ? '#ff3b30' : '#3d7bff'; ctx.fillRect(zx - 3, zy - 1.5, 6, 2); }
  const lights = p.engine ? '#ffe9a8' : C([200, 196, 170], f);
  for (const s of [1, -1]) {
    const fx = ax + dx * (CAR_L - .02) + nx * s * .3, fy = ay + dy * (CAR_L - .02) + ny * s * .3, bx = ax + dx * .02 + nx * s * .3, by = ay + dy * .02 + ny * s * .3;
    ctx.fillStyle = lights; ctx.fillRect(SX(fx, fy) - 1.2, SY(fx, fy, 11) - 1, 2.4, 2);
    ctx.fillStyle = p.engine && p.v < -.1 ? '#ffffff' : '#c0281e'; ctx.fillRect(SX(bx, by) - 1.2, SY(bx, by, 11) - 1, 2.4, 2);
  }
  if (p.hp < 40) { if (!reduceMotion && Math.random() < .15) emit('smoke', ax + dx * CAR_L, ay + dy * CAR_L, .5, 1, null, 0, .3); }
}
