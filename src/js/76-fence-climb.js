// ================= перелезть через забор двора (и сетку у складов и ферм); карантинную сетку — нельзя =================
// Как с низкой мебелью (56-climb): упёрся в забор — через долю секунды перелезаешь; на бегу быстрее и громче, крадучись — медленно и тихо.
// Сетка гремит громче деревянного штакетника. Ещё «Перелезть через забор» есть в списке действий.
// Мертвецы тоже лезут через такие заборы и валятся с них лицом вперёд (zFenceCheck в 45-polish, поле путей — climbFence в 05-geometry).
function fencePlan(dx, dy) {
  if (!P || P.car) return null;
  const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  const fx = P.x + dx * (P.r + .16), fy = P.y + dy * (P.r + .16), pi = propAt[Math.floor(fy) * MW + Math.floor(fx)], p = pi && props[pi - 1];
  if (!p || !p.solid || (p.type !== 'pfence' && p.type !== 'fence')) return null;
  if (!climbFence(p)) return {no:p};
  const ax = p.ax === 'x', side = ax ? Math.sign(P.y - p.cy) : Math.sign(P.x - p.cx);
  if (!side || (ax ? dy : dx) * side > -.33) return null;                       // идёшь вдоль забора (на забор — круче ~20°)
  if ((ax ? Math.abs(P.y - p.cy) : Math.abs(P.x - p.cx)) > P.r + .2) return null;   // ещё не вплотную
  const tx = ax ? P.x : p.cx - side * .64, ty = ax ? p.cy - side * .64 : P.y;
  if (wallAt(tx, ty) || blocked(tx, ty, P.r)) return {no:p, land:true};
  return {p, tx, ty};
}
function startFence(pl) {
  const run = P.running, sneak = P.sneak, mesh = pl.p.type === 'fence' || pl.p.st === 1;   // сетка-рабица гремит
  P.act = {kind:'vault', t:0, dur:run ? .75 : sneak ? 1.5 : 1.05, fx:P.x, fy:P.y, tx:pl.tx, ty:pl.ty, climb:true};
  P.face = P.fd = Math.atan2(pl.ty - P.y, pl.tx - P.x);
  noise(P.x, P.y, (mesh ? 4 : 2.5) * (run ? 1.5 : sneak ? .45 : 1));
  SFX.step(true, run); setTimeout(() => SFX.step(true, false), run ? 330 : 560); if (mesh) SFX.knock(pl.p.cx, pl.p.cy); else SFX.rustle();
  P.en = Math.max(0, P.en - (run ? 1.5 : .8));
}
// упёрся в забор и толкаешь — лезем
// идёшь на забор вплотную — лезешь, даже если ноги при этом скользят вдоль него (под углом)
onUpdate(dt => {
  if (!P || mode !== 'play' || paused || P.car || P.act || P.sleep || !P.moving) { if (P) P._fenceT = 0; return; }
  const pl = fencePlan(Math.cos(P.face), Math.sin(P.face));
  if (!pl) { P._fenceT = 0; return; }
  P._fenceT = (P._fenceT || 0) + dt;
  if (P._fenceT < (P.running ? .1 : .25)) return;
  P._fenceT = 0;
  if (pl.p) startFence(pl);
  else if (pl.no && !pl.land && (P._noFenceT || 0) < gameMin) { P._noFenceT = gameMin + 30; toast('Карантинная сетка: здесь не перелезть'); }
});
addActions(out => { const pl = fencePlan(Math.cos(P.face), Math.sin(P.face));
  if (pl && pl.p) out.push({kind:'fclimb', label:'Перелезть через забор', pl});
});
defAction('fclimb', {name:() => 'Забор', run:a0 => { if (mode !== 'play' || paused || panel || P.sleep) return; $('actMenu').hidden = true;
  const pl = fencePlan(a0.pl.tx - P.x, a0.pl.ty - P.y); if (pl && pl.p) startFence(pl);
}});
