// ================= перелезть через низкую мебель (тумбочку, стол, кровать…); через шкаф — нельзя =================
// Упёрся в низкую мебель — через долю секунды перелезаешь сам; на бегу — быстрый прыжок (громче), крадучись — медленно и тихо.
// Ещё «Перелезть» есть в списке действий. Мертвецы через мебель не лазят: стол в проходе их держит.
const LOW_FURN = new Set(['nightstand', 'endtable', 'coffeetab', 'table', 'desk', 'wdesk', 'chair', 'armchair', 'sofa', 'bed', 'chest', 'stash', 'boxes',
  'laundry', 'kbin', 'toilet', 'bath', 'dresser', 'counter', 'crate', 'armybox', 'cabinet', 'sink', 'stove', 'washer', 'bsink', 'bin', 'shoerack']);
const inRect = (f, x, y, m) => x > f.r[0] - m && x < f.r[2] + m && y > f.r[1] - m && y < f.r[3] + m;
function wallAt(x, y) { const t = get(Math.floor(x), Math.floor(y)), o = obs[Math.floor(y) * MW + Math.floor(x)]; return t === WALL || t === WIN || (t === DOOR && o && !o.open); }
// куда приземлиться, если лезть в направлении (dx, dy); null — нельзя
function climbPlan(dx, dy) {
  if (!P || P.car) return null;
  const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  const px = P.x + dx * (P.r + .14), py = P.y + dy * (P.r + .14);
  const f = furns.find(f => !f.gone && f.r && inRect(f, px, py, .02));
  if (!f) return null;
  if (!LOW_FURN.has(f.type)) return {no:f};
  // идём сквозь мебель, пока не выйдем с другой стороны (не дальше 1.7 клетки)
  let t = P.r + .14;
  for (; t < 2.4; t += .05) {
    const x = P.x + dx * t, y = P.y + dy * t;
    if (wallAt(x, y)) return {no:f, wall:true};
    if (!furns.some(g => !g.gone && g.r && inRect(g, x, y, .02))) break;
    if (t > 1.9) return {no:f, deep:true};
  }
  const tx = P.x + dx * (t + P.r + .06), ty = P.y + dy * (t + P.r + .06);
  if (wallAt(tx, ty) || blocked(tx, ty, P.r)) return {no:f, land:true};
  return {f, tx, ty};
}
function startClimb(pl) {
  const run = P.running, sneak = P.sneak;
  P.act = {kind:'vault', t:0, dur:run ? .55 : sneak ? 1.1 : .8, fx:P.x, fy:P.y, tx:pl.tx, ty:pl.ty, climb:true};
  P.face = P.fd = Math.atan2(pl.ty - P.y, pl.tx - P.x);
  noise(P.x, P.y, run ? 5 : sneak ? 1 : 2.5);
  SFX.step(true, run); setTimeout(() => SFX.step(true, false), run ? 250 : 420); SFX.rustle();
  if (run && rng() < .06) { P.en = Math.max(0, P.en - 3); toast('Задел ногой — чуть не упал'); }
}
// упёрся и толкаешь — лезем
onUpdate((dt, {x0, y0}) => {
  if (!P || mode !== 'play' || paused || P.car || P.act || P.sleep || !P.moving) { if (P) P._pushT = 0; return; }
  const moved = Math.hypot(P.x - x0, P.y - y0);
  if (moved > dt * .5) { P._pushT = 0; return; }
  P._pushT = (P._pushT || 0) + dt;
  if (P._pushT < (P.running ? .12 : .3)) return;
  P._pushT = 0;
  const pl = climbPlan(Math.cos(P.face), Math.sin(P.face));
  if (pl && pl.f) startClimb(pl);
  else if (!pl) {                                                                 // упёрся в открытое/разбитое окно — перелезть через него
    const tx = Math.floor(P.x + Math.cos(P.face) * .6), ty = Math.floor(P.y + Math.sin(P.face) * .6), i = ty * MW + tx;
    if (map[i] === WIN && !openingBlocks(i)) { winAction({kind:'vault', o:{i, x:tx, y:ty}}); return; }
  }
  else if (pl && pl.no && !LOW_FURN.has(pl.no.type) && (P._noClimbT || 0) < gameMin) { P._noClimbT = gameMin + 30; toast('Слишком высоко — не перелезть'); }
}, dt => { const x0 = P && P.x, y0 = P && P.y; return {x0, y0}; });
// в списке действий: «Перелезть» через то, к чему стоишь лицом
addActions(out => { const pl = climbPlan(Math.cos(P.face), Math.sin(P.face));
  if (pl && pl.f) out.push({kind:'climb', label:'Перелезть', f:pl.f, pl});
});
defAction('climb', {run:a0 => { if (mode !== 'play' || paused || panel || P.sleep) return; $('actMenu').hidden = true; const pl = climbPlan(a0.pl.tx - P.x, a0.pl.ty - P.y); if (pl && pl.f) startClimb(pl);
}});
// после прыжка — мягкое приземление
