// ================= бег спокойнее, удар на бегу, книга в руках, одышка после бега =================
// бег чуть медленнее
// удар на бегу: ноги продолжают бежать, руки бьют
// ---- книга в руках: раскрытая, между кистями; на первой трети цикла правая страница переворачивается ----
const BOOKC = {carp:'#8a5a32', cook:'#b0302a', farm:'#3f7a3a', fight:'#2f4f8a', med:'#d8d2c4', tail:'#6a3a7a', mech:'#c8782a'};
function bookColor() { const it = P.act && P.act.it, d = it && ITEMS[it.id]; return (d && d.skill && BOOKC[d.skill]) || '#7a3a2e'; }
function drawBook(name, zoff) {
  const w = ART.meta.wpn && ART.meta.wpn[name]; if (!w || w.length < 7) return;
  const bx = SX(P.x, P.y), by = SY(P.x, P.y, zoff || 0);
  const ax = bx + w[0], ay = by + w[1], cx = bx + w[5], cy = by + w[6];
  const mx = (ax + cx) / 2, my = (ay + cy) / 2;
  // книга лежит в руках раскрытой: ширина — поперёк взгляда героя, глубина — от него; переводим в экран
  const f = P.fd != null ? P.fd : P.face, W = .17, Dp = .12;
  const lx = -Math.sin(f) * W, ly = Math.cos(f) * W, fx = Math.cos(f) * Dp, fy = Math.sin(f) * Dp;
  const sx = (dx, dy) => (dx - dy) * U, sy = (dx, dy) => (dx + dy) * hh;
  const P4 = (a, b, c, d, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill(); };
  const at = (s, t) => [mx + sx(lx * s + fx * t, ly * s + fy * t), my + sy(lx * s + fx * t, ly * s + fy * t) - 1];
  P4(at(-1.12, -.65), at(1.12, -.65), at(1.12, .75), at(-1.12, .75), bookColor());       // обложка
  P4(at(-1, -.55), at(-.04, -.55), at(-.04, .62), at(-1, .62), '#ece6d6');              // страницы
  P4(at(.04, -.55), at(1, -.55), at(1, .62), at(.04, .62), '#e2dccb');
  ctx.fillStyle = 'rgba(60,50,40,.55)'; for (const s of [-.75, -.5, .3, .55]) { const p = at(s, -.2); ctx.fillRect(Math.round(p[0]), Math.round(p[1]), 1, 1); }
  const n = AN('p', 'read'), fi = Math.floor(animT / ((ART.meta.anims.pmdur && ART.meta.anims.pmdur.read) || 3.2) * n) % n, k = fi / n;
  if (k < .3) {                                                                         // страница поднимается и ложится налево
    const u = k / .3, sx = 1 - 2 * u, lift = Math.sin(Math.PI * u) * 2.4;
    const p0 = at(0, -.55), p1 = at(0, .62), q1 = at(sx, .62), q0 = at(sx, -.55);
    P4(p0, [q0[0], q0[1] - lift], [q1[0], q1[1] - lift], p1, '#f6f1e4');
  }
}
// ---- одышка: пробежал долго или устал — слышно, как герой переводит дух ----
{ onUpdate(dt => {
    if (!P || mode !== 'play') return;
    if (P.running && P.moving) { P._runSec = (P._runSec || 0) + dt; return; }
    const ran = P._runSec || 0; P._runSec = 0;
    if ((ran > 5 || (ran > 1 && P.en < 30)) && (P._breathT || 0) < animT && SFX.ac) { P._breathT = animT + 9; smp(P.en < 30 ? 'breathh' : 'breathl', .3); }
  });
}
