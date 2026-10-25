// ================= v21: better snow, breath, footprints, colds, bins & mailboxes, morning fog =================
// ---- snow textures ----
const SNP = {};
function snowPat(kind) {
  if (SNP[kind]) return SNP[kind];
  const S = 128, c = mkCanvas(S, S), g = c.getContext('2d'), R = mulberry32(kind === 'road' ? 77 : kind === 'roof' ? 55 : 33);
  g.fillStyle = kind === 'road' ? '#dde0e5' : '#f2f5fa'; g.fillRect(0, 0, S, S);
  const blob = (x, y, r, col) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, col); gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); } };
  for (let k = 0; k < 60; k++) blob(R() * S, R() * S, 10 + R() * 22, kind === 'road' ? `rgba(130,132,140,${.04 + R() * .06})` : `rgba(176,192,218,${.03 + R() * .05})`);
  for (let k = 0; k < 30; k++) blob(R() * S, R() * S, 6 + R() * 12, 'rgba(255,255,255,.35)');
  if (kind === 'road') for (let k = 0; k < 18; k++) blob(R() * S, R() * S, 3 + R() * 5, 'rgba(110,106,100,.08)');
  for (let k = 0; k < 50; k++) { g.fillStyle = `rgba(255,255,255,${.4 + R() * .4})`; g.fillRect(Math.floor(R() * S), Math.floor(R() * S), 1, 1); }
  const p = ctx.createPattern(c, 'repeat');
  try { p.setTransform(new DOMMatrix().scale(kind === 'roof' ? 1 / 40 : 1 / 34)); } catch (e) {}
  return SNP[kind] = p;
}
// frosted trees and bushes once the snow settles
// snow on the roofs (roof sprites are cached per snow level)
const snowLvl = () => Math.round(Math.min(1, (world.snow || 0) * 1.25) * 4) / 4;

// ---- breath on frosty air, footprints, morning fog ----
function tickWinterFx(dt) {
  const out = mode === 'play' && !insideHouse(P.x, P.y);
  BZ.steps = BZ.steps || []; BZ.breath = BZ.breath || [];
  for (const f of BZ.steps) f.t += dt; if (BZ.steps.length && BZ.steps[0].t > 120) BZ.steps = BZ.steps.filter(f => f.t < 120);
  if ((world.snow || 0) > .3) {
    const step = (e, key) => { const d = Math.hypot(e.x - (e[key + 'x'] || 0), e.y - (e[key + 'y'] || 0)); if (d > .42) { e[key + 'x'] = e.x; e[key + 'y'] = e.y; e[key + 's'] = -(e[key + 's'] || 1); const a = e === P ? (P.fd != null ? P.fd : P.face) : e.face; const t = get(Math.floor(e.x), Math.floor(e.y)); if (t !== FLOOR && !hAt[Math.floor(e.y) * MW + Math.floor(e.x)]) BZ.steps.push({x:e.x - Math.sin(a) * .08 * e[key + 's'], y:e.y + Math.cos(a) * .08 * e[key + 's'], a, t:0}); } };
    if (!P.car) step(P, '_ft');
    for (const z of zs) if (Math.abs(z.x - P.x) < 12 && Math.abs(z.y - P.y) < 12) step(z, '_ft');
    if (BZ.steps.length > 500) BZ.steps.splice(0, BZ.steps.length - 500);
  }
  BZ.brT = (BZ.brT || 0) - dt;
  if (out && outsideTemp() < 3 && BZ.brT <= 0 && !P.car) { BZ.brT = P.running ? .55 : 1.3; const a = P.fd != null ? P.fd : P.face; BZ.breath.push({x:P.x + Math.cos(a) * .25, y:P.y + Math.sin(a) * .25, z:U * 1.75, t:0}); }
  for (const b of BZ.breath) { b.t += dt; b.z += dt * 6; } BZ.breath = BZ.breath.filter(b => b.t < 1.4);
  // fog on autumn and spring mornings
  const h = hourOf(), m = monthNow(), day = Math.floor(gameMin / 1440);
  if (world.fogDay !== day && h >= 4 && h < 5) { world.fogDay = day; world.fogOn = ([2, 3, 4, 8, 9, 10].includes(m) && rng() < .4); }
  const want = world.fogOn && h >= 4 && h < 10.5 ? (h < 9 ? 1 : 1 - (h - 9) / 1.5) : 0;
  world.fog = (world.fog || 0) + clamp(want - (world.fog || 0), -dt * .08, dt * .08);
}
function drawBreath() {
  for (const b of BZ.breath || []) { const a = (1 - b.t / 1.4) * .35, sx = SX(b.x, b.y), sy = SY(b.x, b.y, b.z), r = 2 + b.t * 6; ctx.fillStyle = `rgba(235,240,250,${a})`; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.283); ctx.fill(); }
}
function drawFog() {
  const f = world.fog || 0; if (f < .02 || mode !== 'play') return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const w = ctx.canvas.width, h = ctx.canvas.height, px = SX(P.x, P.y) * DPR, py = SY(P.x, P.y, U) * DPR;
  const g = ctx.createRadialGradient(px, py, Math.min(w, h) * .12, px, py, Math.max(w, h) * .55);
  const L = Math.max(.35, lightLevel()), c = Math.round(205 * L + 40);
  g.addColorStop(0, `rgba(${c},${c + 4},${c + 8},${.05 * f})`); g.addColorStop(1, `rgba(${c},${c + 4},${c + 8},${.72 * f})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.restore();
}

// ---- catching a cold: wet + cold → sneezing that zombies hear ----
function tickFlu(gm) {
  const f0 = P.fluR || 0;
  if (P.sleep && P.flu > 0) { P.flu = Math.max(0, P.flu - gm * .5); }
  if ((P.wet || 0) > 40 && (P.cold || 0) > 45) P.fluR = (P.fluR || 0) + gm * .0016; else P.fluR = Math.max(0, (P.fluR || 0) - gm * .0008);
  if (!(P.flu > 0) && P.fluR > 1) { P.fluR = 0; P.flu = 1440 * 2; toast('Ты простудился: насморк и чих. Чихание слышат мертвецы. Нужно тепло, сон и лекарства'); }
  if (P.flu > 0) {
    const warmDry = (P.cold || 0) < 20 && (P.wet || 0) < 10;
    P.flu = Math.max(0, P.flu - gm * (warmDry ? 1.6 : .8)); if (P.flu <= 0) toast('Простуда прошла');
    P.en = Math.max(0, P.en - gm * .01);
    P.snT = (P.snT == null ? 30 : P.snT) - gm;
    if (P.snT <= 0 && !P.sleep) { P.snT = 25 + rng() * 60; SFX.sneeze && SFX.sneeze(); noise(P.x, P.y, P.sneak ? 6 : 8); }
  }
  { const d = (P.fluR || 0) - f0; if (d > 0) P.fluR = f0 + d * (hasTr('hardy') ? .5 : 1) * (hasTr('cold') ? 1.3 : 1); }   // черты
}

// ---- trash bins and mailboxes can be searched ----
Object.assign(CONT, {
  bin:{name:'Мусорный бак', loot:['rag', 'rag', 'bottle', 'bottle', 'newspaper', 'chips', 'battery', 'matches', 'cigs', 'jar', 'tape', 'note'], n:[0, 3], cap:6},
  mail:{name:'Почтовый ящик', loot:['newspaper', 'newspaper', 'note', 'map', 'candy', 'cigs', 'battery'], n:[0, 2], cap:3},
});
