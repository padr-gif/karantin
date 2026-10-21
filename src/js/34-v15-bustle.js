// ================= v15: landscape-only, no zoom/jumps, closable windows, world bustle =================
// ---- touch: no double-tap / pinch zoom of the page, stable viewport ----
(() => {
  try {
    let m = document.querySelector('meta[name=viewport]');
    if (!m) { m = document.createElement('meta'); m.name = 'viewport'; document.head.appendChild(m); }
    m.content = 'width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no,viewport-fit=cover';
  } catch (e) {}
  let lastEnd = 0;
  document.addEventListener('touchend', e => { const t = e.timeStamp; if (t - lastEnd < 320 && !(e.target.closest && e.target.closest('input,textarea'))) e.preventDefault(); lastEnd = t; }, {passive:false});
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) document.addEventListener(ev, e => e.preventDefault(), {passive:false});
  document.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, {passive:false});
})();
// ---- landscape only ----
const portraitMQ = matchMedia('(orientation: portrait) and (max-width: 900px)');
function checkOrient() {
  const p = portraitMQ.matches; $('rotate').hidden = !p;
  if (p && mode === 'play' && !paused) openPause();
}
portraitMQ.addEventListener ? portraitMQ.addEventListener('change', checkOrient) : portraitMQ.addListener(checkOrient);
function tryLandscape() { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }
// ---- windows close on a tap outside ----
$('panel').addEventListener('pointerdown', e => { if (e.target === $('panel')) { e.preventDefault(); closePanel(); } });
$('pause').addEventListener('pointerdown', e => { if (e.target === $('pause')) { e.preventDefault(); resume(); } });
for (const id of ['settings', 'help', 'ach', 'saves']) $(id).addEventListener('pointerdown', e => { if (e.target === $(id) && mode === 'play') { e.preventDefault(); goBack(); } });
cv.addEventListener('pointerdown', () => { if (!$('actMenu').hidden) $('actMenu').hidden = true; }, true);

// ---- bustle: crows, wind debris, distant smoke, car alarms, far-off sounds ----
const BZ = {flocks:[], perched:[], debris:[], smokes:null, alarms:[], evT:25, flockT:8, perchT:0};
function bzRand(a, b) { return a + Math.random() * (b - a); }
function initSmokes() {
  BZ.smokes = [];
  const R = mulberry32((world.seed || 1) * 7 + 3);
  const cands = houses.filter(h => !COMM.has(h.kind) && h.kind !== 'shed');
  for (let k = 0; k < 3 && cands.length; k++) {
    const H = cands[Math.floor(R() * cands.length)];
    BZ.smokes.push({x:(H.ix0 + H.ix1) / 2, y:(H.iy0 + H.iy1) / 2, end:(9 * 60) + 1440 * (1 + R() * 3), puffs:[]});
  }
}
function spawnFlock() {
  const a = Math.random() * 6.283, d = 22, n = 4 + Math.floor(Math.random() * 7);
  const x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d, b = a + Math.PI + bzRand(-.5, .5), sp = bzRand(3.2, 4.6);
  BZ.flocks.push({x, y, vx:Math.cos(b) * sp, vy:Math.sin(b) * sp, z:bzRand(185, 240), t:0, birds:Array.from({length:n}, (_, i) => ({ox:bzRand(-1.6, 1.6), oy:bzRand(-1.6, 1.6), oz:bzRand(-14, 14), ph:Math.random() * 6}))});
}
function perchCrows() {
  // crows gather at corpses and on lawns; they take off when you get close or make noise
  if (BZ.perched.length > 10) return;
  const src = corpses.filter(c => Math.hypot(c.x - P.x, c.y - P.y) > 6 && Math.hypot(c.x - P.x, c.y - P.y) < 16);
  let x, y;
  if (src.length && Math.random() < .7) { const c = src[Math.floor(Math.random() * src.length)]; x = c.x; y = c.y; }
  else { const a = Math.random() * 6.283, d = bzRand(7, 13); x = P.x + Math.cos(a) * d; y = P.y + Math.sin(a) * d; if (get(Math.floor(x), Math.floor(y)) !== GRASS) return; }
  for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) if (hAt[(Math.floor(y) + oy) * MW + Math.floor(x) + ox]) return;
  const n = 2 + Math.floor(Math.random() * 3);
  for (let k = 0; k < n; k++) BZ.perched.push({x:x + bzRand(-.6, .6), y:y + bzRand(-.6, .6), ph:Math.random() * 6, peck:Math.random() * 3});
}
function scareCrows(x, y, r) {
  const fly = BZ.perched.filter(c => Math.hypot(c.x - x, c.y - y) < r);
  if (!fly.length) return;
  BZ.perched = BZ.perched.filter(c => !fly.includes(c));
  const cx = fly.reduce((s, c) => s + c.x, 0) / fly.length, cy = fly.reduce((s, c) => s + c.y, 0) / fly.length;
  const a = Math.atan2(cy - y, cx - x) + bzRand(-.6, .6), sp = 4.5;
  BZ.flocks.push({x:cx, y:cy, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, z:4, climb:true, t:0, birds:fly.map(c => ({ox:c.x - cx, oy:c.y - cy, oz:bzRand(-6, 6), ph:Math.random() * 6}))});
  SFX.caw && SFX.caw(cx, cy);
}
function startCarAlarm() {
  const cars = props.filter(p => p.type === 'car' && !p.dyn && p !== P.car && !p.alarmDone && Math.hypot(p.cx - P.x, p.cy - P.y) > 8 && Math.hypot(p.cx - P.x, p.cy - P.y) < 24);
  if (!cars.length) return false;
  const c = cars[Math.floor(Math.random() * cars.length)]; c.alarmDone = true;
  BZ.alarms.push({c, t:28, beep:0, ring:0});
  toast('Где-то рядом завыла автосигнализация. Мертвецы пойдут на звук');
  return true;
}
function farEvent() {
  const r = Math.random(), a = Math.random() * 6.283, fx = P.x + Math.cos(a) * 40, fy = P.y + Math.sin(a) * 40;
  if (r < .3 && startCarAlarm()) return;
  if (r < .5) { SFX.shots && SFX.shots(); if (Math.random() < .5) toast('Вдалеке стреляют'); noise(P.x + Math.cos(a) * 20, P.y + Math.sin(a) * 20, 10); }
  else if (r < .65) { SFX.scream && SFX.scream(); toast('Где-то кричит человек. Потом тишина'); }
  else if (r < .8) { SFX.dog && SFX.dog(); }
  else if (r < .9) { SFX.siren && SFX.siren(); }
  else { SFX.boom && SFX.boom(); toast('Глухой взрыв на окраине'); scareCrows(P.x, P.y, 30); }
}
function tickBustle(dt) {
  if (!BZ.smokes) initSmokes();
  const out = !insideHouse(P.x, P.y), L = lightLevel();
  // events
  BZ.evT -= dt; if (BZ.evT <= 0) { BZ.evT = bzRand(45, 110); if (!P.sleep) farEvent(); }
  BZ.flockT -= dt; if (BZ.flockT <= 0) { BZ.flockT = bzRand(20, 45); if (L > .4 && !rain && out) spawnFlock(); }
  BZ.perchT -= dt; if (BZ.perchT <= 0) { BZ.perchT = bzRand(12, 25); if (L > .4 && out) perchCrows(); }
  if (!out) { BZ.flocks.length = 0; }
  // flocks
  for (const f of BZ.flocks) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.climb) f.z = Math.min(220, f.z + dt * 260); }
  BZ.flocks = BZ.flocks.filter(f => f.t < 18 && Math.hypot(f.x - P.x, f.y - P.y) < 40);
  // perched crows flee from the player, running, shots and zombies
  const scare = P.running ? 6 : P.sneak ? 2.2 : 3.8;
  if (BZ.perched.length) {
    if (BZ.perched.some(c => Math.hypot(c.x - P.x, c.y - P.y) < scare)) scareCrows(P.x, P.y, scare + 2);
    for (const z of zs) if (z.state === 'chase' && BZ.perched.some(c => Math.hypot(c.x - z.x, c.y - z.y) < 2)) { scareCrows(z.x, z.y, 3); break; }
    BZ.perched = BZ.perched.filter(c => Math.hypot(c.x - P.x, c.y - P.y) < 26);
  }
  // wind debris (leaves / paper), only outdoors
  const want = out && settings.rain !== false ? 14 : 0;
  while (BZ.debris.length < want) BZ.debris.push({x:camX + bzRand(-14, 14), y:camY + bzRand(-14, 14), z:bzRand(0, 30), ph:Math.random() * 6, paper:Math.random() < .25, s:bzRand(.7, 1.2)});
  if (BZ.debris.length > want) BZ.debris.length = want;
  const wx = .9 + rain * 1.4;
  for (const d of BZ.debris) {
    d.ph += dt * (2 + d.s); d.x += (wx + Math.sin(d.ph) * .4) * dt; d.y += (Math.cos(d.ph * .7) * .5 - .2) * dt; d.z = Math.max(0, d.z + Math.sin(d.ph * 1.3) * dt * 14 - dt * 2);
    if (Math.abs(d.x - camX) > 15 || Math.abs(d.y - camY) > 15) { d.x = camX - 14 + Math.random() * 2; d.y = camY + bzRand(-14, 14); }
  }
  // smoke plumes
  for (const s of BZ.smokes) {
    if (gameMin > s.end || Math.hypot(s.x - camX, s.y - camY) > 34) { s.puffs.length = 0; continue; }
    s.acc = (s.acc || 0) + dt * 6;
    while (s.acc > 1) { s.acc--; s.puffs.push({x:s.x + bzRand(-.4, .4), y:s.y + bzRand(-.4, .4), z:U * 2.2, r:bzRand(.4, .7), t:0}); }
    for (const p of s.puffs) { p.t += dt; p.z += dt * 26; p.x += dt * (.5 + wx * .4); p.y -= dt * .15; p.r += dt * .35; }
    s.puffs = s.puffs.filter(p => p.t < 9);
  }
  // car alarms
  for (const al of BZ.alarms) {
    al.t -= dt; al.beep -= dt; al.ring -= dt;
    if (al.beep <= 0) { al.beep = .55; SFX.carAlarm && SFX.carAlarm(al.c.cx, al.c.cy); }
    if (al.ring <= 0) { al.ring = 1.2; noise(al.c.cx, al.c.cy, 16); scareCrows(al.c.cx, al.c.cy, 8); }
  }
  BZ.alarms = BZ.alarms.filter(a => a.t > 0);
}
function drawBustle() {
  const L = lightLevel(), dark = 1 - L;
  // smoke plumes (behind birds)
  for (const s of BZ.smokes || []) {
    if (!s.puffs.length) continue;
    if (dark > .3) { const gx = SX(s.x, s.y), gy = SY(s.x, s.y, U * 2); const g = ctx.createRadialGradient(gx, gy, 2, gx, gy, U * 2.2); g.addColorStop(0, `rgba(255,140,50,${.5 * dark})`); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.fillRect(gx - U * 2.2, gy - U * 2.2, U * 4.4, U * 4.4); }
    for (const p of s.puffs) { const a = Math.min(1, p.t * 1.5) * (1 - p.t / 9), sx = SX(p.x, p.y), sy = SY(p.x, p.y, p.z), r = U * p.r; ctx.fillStyle = `rgba(${48 + 30 * L | 0},${46 + 30 * L | 0},${46 + 28 * L | 0},${.5 * a})`; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.283); ctx.fill(); }
  }
  const indoors = mode === 'play' && insideHouse(P.x, P.y);
  // perched crows
  ctx.fillStyle = '#15161a';
  if (!indoors)
  for (const c of BZ.perched) {
    if (!vis[Math.floor(c.y) * MW + Math.floor(c.x)]) continue;
    const sx = SX(c.x, c.y), sy = SY(c.x, c.y, 0), bob = Math.sin(animT * 3 + c.ph) > .7 ? 1.2 : 0;
    ctx.fillRect(Math.round(sx - 2.5), Math.round(sy - 4 + bob), 5, 3); ctx.fillRect(Math.round(sx + 1.5), Math.round(sy - 5 + bob * 1.5), 2, 2);
  }
  // flying flocks
  ctx.strokeStyle = 'rgba(20,20,24,.9)'; ctx.lineWidth = 1.3;
  if (!indoors) for (const f of BZ.flocks) for (const b of f.birds) {
    const x = f.x + b.ox, y = f.y + b.oy, sx = SX(x, y), sy = SY(x, y, f.z + b.oz), w = Math.sin(animT * 12 + b.ph) * 2.6;
    ctx.beginPath(); ctx.moveTo(sx - 4, sy - w); ctx.lineTo(sx, sy); ctx.lineTo(sx + 4, sy - w); ctx.stroke();
  }
  // car alarm lights
  for (const al of BZ.alarms) if (Math.floor(animT * 3.6) % 2) {
    const c = al.c, sx = SX(c.cx, c.cy), sy = SY(c.cx, c.cy, U * .5);
    const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, U * 1.4); g.addColorStop(0, 'rgba(255,214,110,.55)'); g.addColorStop(1, 'rgba(255,200,90,0)'); ctx.fillStyle = g; ctx.fillRect(sx - U * 1.4, sy - U * 1.4, U * 2.8, U * 2.8);
  }
  // wind debris
  if (BZ.debris.length) {
    for (const d of BZ.debris) {
      const sx = SX(d.x, d.y), sy = SY(d.x, d.y, d.z), fl = Math.abs(Math.sin(d.ph * 2));
      ctx.fillStyle = d.paper ? `rgba(226,220,204,${.75})` : (seasonTint() ? 'rgba(170,96,40,.8)' : 'rgba(90,130,60,.75)');
      ctx.fillRect(Math.round(sx), Math.round(sy), Math.max(1, Math.round((d.paper ? 4 : 3) * d.s * (.4 + fl * .6))), d.paper ? 3 : 2);
    }
  }
}
