// ================= сбить почтовый ящик, урну: машиной на ходу или ногой («Опрокинуть»); содержимое высыпается =================
// Сбитый предмет лежит на земле (рисуется своим видом через defProc: p.proc = true), не мешает пройти и проехать,
// гремит — мертвецы слышат. Обыскать его по-прежнему можно. Сбитые хранятся в сохранении (x97) и в районе.
const KNOCK = new Set(['mail', 'bin']);
function knockProp(p, dir, loud) {
  if (!p || p.down || !KNOCK.has(p.type)) return false;
  p.down = 1; p.solid = false; p.proc = true;
  p.dax = Math.abs(Math.cos(dir)) >= Math.abs(Math.sin(dir)) ? 'x' : 'y';
  p.dsg = (p.dax === 'x' ? Math.cos(dir) : Math.sin(dir)) < 0 ? -1 : 1;
  SFX.knock(p.cx, p.cy); noise(p.cx, p.cy, loud || 6);
  // v86: что было внутри — высыпается на землю кучкой рядом (газеты из ящика, мусор из урны); подобрать можно
  if (!p.searched) { fillCont(p); const ox = Math.cos(dir) * .55, oy = Math.sin(dir) * .55;
    for (const it of p.items || []) addToPile(p.cx + ox, p.cy + oy, it);
    p.items = []; p.searched = true; }
  emit('dust', p.cx, p.cy, .05, 4, null, 0, .6);
  if (typeof clearCaches === 'function') clearCaches();
  return true;
}
// машина: всё сбиваемое на пути кузова — падает, машина чуть теряет скорость
function carKnock(x, y, a, v) {
  if (Math.abs(v) < 1) return;
  const cs = carCircles(x, y, a), x0 = Math.floor(x) - 3, y0 = Math.floor(y) - 3;
  for (let ty = y0; ty <= y0 + 6; ty++) for (let tx = x0; tx <= x0 + 6; tx++) {
    if (!inMap(tx, ty, 0)) continue;
    const id = propAt[ty * MW + tx], p = id && props[id - 1]; if (!p || p.down || !KNOCK.has(p.type)) continue;
    if (cs.some(([cx, cy]) => Math.hypot(cx - p.cx, cy - p.cy) < 1.05) && knockProp(p, a + (v < 0 ? Math.PI : 0), 9)) P.car.v *= .85;
  }
}
// ногой: «Опрокинуть» рядом с героем
function knockNear() {
  let best = null, bd = 1.15;
  for (let ty = Math.floor(P.y) - 1; ty <= Math.floor(P.y) + 1; ty++) for (let tx = Math.floor(P.x) - 1; tx <= Math.floor(P.x) + 1; tx++) {
    if (!inMap(tx, ty, 0)) continue;
    const id = propAt[ty * MW + tx], p = id && props[id - 1]; if (!p || p.down || !KNOCK.has(p.type)) continue;
    const d = Math.hypot(p.cx - P.x, p.cy - P.y); if (d < bd) { bd = d; best = p; }
  }
  return best;
}
addActions(out => { if (!P || P.car || P.sleep) return; const p = knockNear(); if (p) out.push({kind:'knock', label:'Опрокинуть', f:p}); });
defAction('knock', {name:a => PROPN[a.f.type] || 'Предмет', run:a => {
  $('actMenu').hidden = true;
  const dir = Math.atan2(a.f.cy - P.y, a.f.cx - P.x); P.face = P.fd = dir;
  if (knockProp(a.f, dir, 6)) { P.en = Math.max(0, P.en - 1); P.swing = .25; toast(a.f.type === 'mail' ? 'Ящик с грохотом повалился' : 'Урна покатилась, мусор по асфальту'); }
}});
// как лежит: ящик — столб с коробом на земле, урна — на боку, мусор рядом
defProc('mail', (p, f) => {
  const x = Math.floor(p.cx), y = Math.floor(p.cy), s = p.dsg || 1, X = p.dax === 'x';
  const post = [70, 70, 74], boxC = [52, 64, 96];
  if (X) { const a = s > 0 ? x + .45 : x + .1, b = s > 0 ? x + .9 : x + .55; box(Math.min(a, b), y + .46, Math.max(a, b), y + .54, 0, 1.6, post, f); const bx = s > 0 ? x + .82 : x - .1; box(bx, y + .36, bx + .28, y + .64, 0, 4, boxC, f); }
  else { const a = s > 0 ? y + .45 : y + .1, b = s > 0 ? y + .9 : y + .55; box(x + .46, Math.min(a, b), x + .54, Math.max(a, b), 0, 1.6, post, f); const by = s > 0 ? y + .82 : y - .1; box(x + .36, by, x + .64, by + .28, 0, 4, boxC, f); }
});
defProc('bin', (p, f) => {
  const x = Math.floor(p.cx), y = Math.floor(p.cy), X = p.dax === 'x', s = p.dsg || 1, c = [[46, 74, 52], [60, 64, 70], [80, 56, 40]][p.ci || 0];
  X ? box(x + .15, y + .32, x + .85, y + .68, 0, 6, c, f) : box(x + .32, y + .15, x + .68, y + .85, 0, 6, c, f);
  const ox = X ? (s > 0 ? .9 : .1) : .5, oy = X ? .5 : (s > 0 ? .9 : .1);
  box(x + ox - .1, y + oy - .1, x + ox + .1, y + oy + .1, 0, 5, [24, 26, 28], f);                // горловина
  for (let k = 0; k < 4; k++) { const h1 = hash(x * 7 + k, y * 3 + k * 5), h2 = hash(x * 5 + k * 3, y * 11 + k); box(x + ox + (h1 - .5) * .7, y + oy + (h2 - .5) * .7, x + ox + (h1 - .5) * .7 + .1, y + oy + (h2 - .5) * .7 + .08, 0, .8, [170 + k * 15, 160, 140], f); }
});
DIST_FIELDS.push('x97');
onSave(d => { d.x97 = props.map((p, k) => p.down ? [k, p.dax, p.dsg] : null).filter(Boolean); });
onLoad(d => { for (const [k, ax, sg] of (d && d.x97) || []) { const p = props[k]; if (p && KNOCK.has(p.type)) { p.down = 1; p.solid = false; p.proc = true; p.dax = ax; p.dsg = sg; } } });

// ================= курение и перевязка (v85): из готовых кадров + огонёк и дым =================
// затяжка — 2 с: рука ко рту (кадры «еды» вперёд), пауза у губ, вниз (кадры назад), секунда у пояса
function smokeFrame(an) {
  const n = AN('p', an), t = P.act ? P.act.t % 2 : 0;
  const k = t < .5 ? t / .5 : t < 1 ? 1 : t < 1.4 ? 1 - (t - 1) / .4 : 0;
  return [an, Math.min(n - 1, Math.floor(k * (n - 1) * .55))];             // до середины клипа — рука у рта, без «откусывания»
}
onUpdate(dt => {
  const A = P.act; if (!A || A.kind !== 'use') return;
  if (A.an === 'smoke') {
    const t = A.t % 2, hx = P.x + Math.cos(P.face) * .18, hy = P.y + Math.sin(P.face) * .18;
    A._sT = (A._sT || 0) - dt;
    if (t > 1.05 && t < 1.6 && A._sT <= 0) { A._sT = .14; emit('smoke', hx, hy, 1.55, 1, null, 0, .25); }   // выдох
    if (t < .3 && !A._lit) { A._lit = true; if (A.t < .3) SFX.rustle && SFX.rustle(); }
    A._wT = (A._wT || 0) - dt; if (A._wT <= 0 && (t < .45 || t > 1.5)) { A._wT = .5; emit('smoke', hx, hy, 1.05, 1, null, 0, .08); }   // тонкая струйка с кончика
  } else if (A.an === 'bandage') {
    A._bT = (A._bT || 0) - dt; if (A._bT <= 0) { A._bT = .7; SFX.rustle && SFX.rustle(); }
  }
});
// ---- сигарета (v86): отдельная вещь; пачка — «Достать сигарету»; в руке во время курения — сама сигарета ----
Object.assign(ITEMS, {cig:{name:'Сигарета', kind:'smoke', uses:1, verb:'Закурить'}});
DESC.cig = 'Одна сигарета. Нужен огонь — спички или зажигалка. Пара затяжек успокаивает нервы.';
KG.cig = .005;
ITEMS.cigs.verb = 'Достать сигарету';
for (const c of ['bin', 'car', 'coffeetab', 'desk']) if (CONT[c] && CONT[c].loot) CONT[c].loot.push('cig');
ZLOOT.push('cig', 'cig');
defUse((it) => it.id === 'cigs', (it, k) => {                               // пачка: достать одну, в карман
  if (invFull()) { toast('Некуда положить сигарету'); return; }
  it.uses = (it.uses || 1) - 1; if (it.uses <= 0) P.inv.splice(k, 1);
  P.inv.push(mkItem('cig')); SFX.rustle(); toast(it.uses > 0 ? 'Достал сигарету. В пачке ' + it.uses : 'Достал последнюю сигарету');
  if (typeof invPlace === 'function') invPlace(); renderInv();
});
// где кисть с сигаретой: правая кисть текущего кадра героя (как рукоять оружия), направление — вдоль пальцев
onDraw(() => {
  const A = P.act; if (!A || A.kind !== 'use' || A.an !== 'smoke' || P.car || mode !== 'play') return;
  const lk = P.look || look, [an, fi] = playerAnim(-1), name = 'p' + lk.g + heroVar(lk) + '_' + an + '_' + dirOf(P.fd != null ? P.fd : P.face) + '_' + fi;
  const wm = ART.meta.wpn && ART.meta.wpn[name], t = A.t % 2, glow = t > .5 && t < 1 ? 1 : .45;
  let hx, hy, ux, uy;
  if (wm) { hx = SX(P.x, P.y) + wm[0]; hy = SY(P.x, P.y, 0) + wm[1]; const L = Math.hypot(wm[2], wm[3]) || 1; ux = wm[2] / L; uy = wm[3] / L; }
  else { const up = t < .5 ? t / .5 : t < 1 ? 1 : t < 1.4 ? 1 - (t - 1) / .4 : 0, x = P.x + Math.cos(P.face) * .2, y = P.y + Math.sin(P.face) * .2; hx = SX(x, y); hy = SY(x, y, U * (.95 + .55 * up)); ux = .8; uy = -.6; }
  const L = 4.2, fx = hx + ux * .6, fy = hy + uy * .6, ex = fx + ux * L, ey = fy + uy * L;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = 'rgba(20,16,14,.75)'; ctx.lineWidth = 1.9; ctx.beginPath(); ctx.moveTo(fx - ux * .3, fy - uy * .3); ctx.lineTo(ex + ux * .3, ey + uy * .3); ctx.stroke();
  ctx.strokeStyle = '#d58a3a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + ux * 1.3, fy + uy * 1.3); ctx.stroke();       // фильтр
  ctx.strokeStyle = '#f4f1ea'; ctx.beginPath(); ctx.moveTo(fx + ux * 1.3, fy + uy * 1.3); ctx.lineTo(ex, ey); ctx.stroke();                          // бумага
  ctx.fillStyle = `rgba(255,${110 + 70 * glow},50,${.6 + .4 * glow})`; ctx.beginPath(); ctx.arc(ex, ey, .75 + .45 * glow, 0, 6.283); ctx.fill();        // тлеет
  if (glow > .9) { ctx.fillStyle = 'rgba(255,160,60,.25)'; ctx.beginPath(); ctx.arc(ex, ey, 2.4, 0, 6.283); ctx.fill(); }
  A._ex = ex; A._ey = ey;
});

// ================= автосигнализация (v87) =================
// У части припаркованных машин (каждая пятая, не у полиции и армии) стоит сигнализация. Врезался на ходу или полез
// обыскивать — воет 25 с, мигает фарами и шумит на всю округу (мертвецы идут на вой). Срабатывает один раз; в сохранении.
const hasCarAlarm = p => p && p.type === 'car' && !p.police && !p.army && !p.shop && hash(props.indexOf(p) * 7 + 3, 13) < .2;
let CALARM = [];
function triggerCarAlarm(p) {
  if (!hasCarAlarm(p) || p.alarmed || p === P.car) return false;
  p.alarmed = 1; CALARM.push({p, t:25, n:0});
  toast('Сработала сигнализация! Вой слышно на всю округу');
  return true;
}
function carCrashAlarm(car) {                                                  // во что врезалась машина героя
  for (const q of props) if (q !== car && q.type === 'car' && !q.alarmed && Math.hypot(q.cx - car.cx, q.cy - car.cy) < 4.2) triggerCarAlarm(q);
}
onUpdate(dt => {
  if (!CALARM.length) return;
  for (const a of CALARM) { a.t -= dt; a.n -= dt; if (a.n <= 0) { a.n = .7; SFX.alarm(a.p.cx, a.p.cy); noise(a.p.cx, a.p.cy, 22); } }
  CALARM = CALARM.filter(a => a.t > 0 && a.p.type === 'car');
});
onDraw(() => {                                                                 // фары и поворотники мигают
  if (!CALARM.length || Math.floor(animT * 3) % 2) return;
  for (const a of CALARM) {
    const p = a.p, ang = p.dyn ? p.ang : p.dir === 'x' ? (p.flip ? Math.PI : 0) : (p.flip ? -Math.PI / 2 : Math.PI / 2);
    const fx = Math.cos(ang), fy = Math.sin(ang), nx = -fy, ny = fx;
    for (const [u, s] of [[1.8, .55], [1.8, -.55], [-1.8, .55], [-1.8, -.55]]) {
      const x = p.cx + fx * u + nx * s, y = p.cy + fy * u + ny * s, sx = SX(x, y), sy = SY(x, y, U * .45);
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, U * .6); g.addColorStop(0, 'rgba(255,214,120,.85)'); g.addColorStop(1, 'rgba(255,190,80,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, U * .6, 0, 6.283); ctx.fill();
    }
  }
});
DIST_FIELDS.push('x97a');
onSave(d => { d.x97a = props.map((p, k) => p.alarmed ? k : -1).filter(k => k >= 0); });
onLoad(d => { CALARM = []; for (const k of (d && d.x97a) || []) if (props[k]) props[k].alarmed = 1; });
onNewWorld(() => { CALARM = []; });
