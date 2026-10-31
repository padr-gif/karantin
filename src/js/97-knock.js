// ================= сбить почтовый ящик, урну: машиной на ходу или ногой («Опрокинуть») =================
// Сбитый предмет лежит на земле (рисуется своим видом через defProc: p.proc = true), не мешает пройти и проехать,
// гремит — мертвецы слышат. Обыскать его по-прежнему можно. Сбитые хранятся в сохранении (x97) и в районе.
const KNOCK = new Set(['mail', 'bin']);
function knockProp(p, dir, loud) {
  if (!p || p.down || !KNOCK.has(p.type)) return false;
  p.down = 1; p.solid = false; p.proc = true;
  p.dax = Math.abs(Math.cos(dir)) >= Math.abs(Math.sin(dir)) ? 'x' : 'y';
  p.dsg = (p.dax === 'x' ? Math.cos(dir) : Math.sin(dir)) < 0 ? -1 : 1;
  SFX.knock(p.cx, p.cy); noise(p.cx, p.cy, loud || 6);
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
  } else if (A.an === 'bandage') {
    A._bT = (A._bT || 0) - dt; if (A._bT <= 0) { A._bT = .7; SFX.rustle && SFX.rustle(); }
  }
});
onDraw(() => {                                                              // огонёк сигареты у руки или у губ
  const A = P.act; if (!A || A.kind !== 'use' || A.an !== 'smoke' || P.car) return;
  const t = A.t % 2, up = t < .5 ? t / .5 : t < 1 ? 1 : t < 1.4 ? 1 - (t - 1) / .4 : 0;
  const fx = Math.cos(P.face), fy = Math.sin(P.face), x = P.x + fx * .2, y = P.y + fy * .2, z = U * (.95 + .55 * up);
  const sx = SX(x, y), sy = SY(x, y, z), glow = t > .5 && t < 1 ? 1 : .55;
  ctx.fillStyle = `rgba(255,${120 + 60 * glow},60,${.55 + .4 * glow})`; ctx.beginPath(); ctx.arc(sx, sy, U * .035 * (1 + glow), 0, 6.283); ctx.fill();
});
