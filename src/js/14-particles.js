// ================= particles =================
let parts = [];
function emit(type, x, y, z, n, dirA, spread, speed) {
  if (type === 'blood' && !settings.gore) return;
  for (let k = 0; k < n; k++) {
    const a = (dirA == null ? rng() * 6.283 : dirA + (rng() - .5) * (spread || 1.2)), sp = (speed || 2) * (.4 + rng() * .8);
    parts.push({type, x, y, z, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, vz:type === 'dust' || type === 'smoke' ? .2 : 1.2 + rng() * 2, life:0,
      max:type === 'smoke' ? 2.4 : type === 'dust' ? .6 : type === 'glass' ? 1.6 : type === 'wood' ? 1.2 : .9, s:.6 + rng() * .8, rot:rng() * 6});
  }
  if (parts.length > 400) parts.splice(0, parts.length - 400);
}
function updateParts(dt) {
  for (const p of parts) {
    p.life += dt;
    if (p.type === 'dust' || p.type === 'smoke') { p.x += p.vx * dt * .3; p.y += p.vy * dt * .3; p.z += p.vz * dt * (p.type === 'smoke' ? 4 : 1); continue; }
    if (p.z > 0) { p.vz -= 9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += dt * 8; }
    if (p.z <= 0 && !p.landed) {
      p.z = 0; p.landed = true;
      if (p.type === 'blood' && rng() < .5) addBlood(p.x, p.y, .15 + rng() * .15);
      if (p.type === 'glass' && rng() < .4) { p.vz = .8; p.z = .01; p.landed = false; p.vx *= .3; p.vy *= .3; }
    }
  }
  parts = parts.filter(p => p.life < p.max);
}
function drawParts() {
  for (const p of parts) {
    const i = Math.floor(p.y) * MW + Math.floor(p.x); if (i < 0 || i >= NT || !vis[i]) continue;
    const sx = SX(p.x, p.y), sy = SY(p.x, p.y, p.z * U), a = 1 - p.life / p.max;
    if (p.type === 'blood') { ctx.fillStyle = `rgba(120,18,12,${.9 * Math.min(1, a * 2)})`; ctx.beginPath(); ctx.arc(sx, sy, U * .03 * p.s + 1, 0, 6.283); ctx.fill(); }
    else if (p.type === 'glass') { ctx.fillStyle = `rgba(210,232,240,${a})`; ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.rot); ctx.fillRect(-U * .04, -1, U * .08 * p.s, 2); ctx.restore(); }
    else if (p.type === 'wood') { ctx.fillStyle = `rgba(150,110,66,${a})`; ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.rot); ctx.fillRect(-U * .06, -1.2, U * .12 * p.s, 2.4); ctx.restore(); }
    else if (p.type === 'smoke') { const r = U * (.06 + p.life * .1) * p.s; ctx.fillStyle = `rgba(150,150,150,${.22 * a})`; ctx.fillRect(Math.round(sx - r), Math.round(sy - r), Math.round(r * 2), Math.round(r * 2)); }
    else if (p.type === 'dust') { const r = U * (.08 + p.life * .35) * p.s; ctx.fillStyle = `rgba(150,140,120,${.28 * a})`; ctx.beginPath(); ctx.ellipse(sx, sy, r, r * .55, 0, 0, 6.283); ctx.fill(); }
  }
}
