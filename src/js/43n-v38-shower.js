// ================= v38: душ вместо «ванны в один куб»; помыться в ванне или в душе =================
function isShower(f) { return f && f.type === 'bath' && (f.compact || f.art === 'bath1'); }
// ---- помыться: пока есть вода. Снимает стресс и уныние, но ты мокрый — в холодном доме замёрзнешь ----
function washTarget() {
  let best = null, bd = 1.25;
  for (const f of furns) {
    if (f.gone || f.type !== 'bath' || !f.r) continue;
    const qx = clamp(P.x, f.r[0], f.r[2]), qy = clamp(P.y, f.r[1], f.r[3]), d = Math.hypot(qx - P.x, qy - P.y) + .42;
    if (d < bd && reachOK(qx, qy)) { best = f; bd = d; }
  }
  return best;
}
addActions(out => {
  const f = washTarget();
  if (f) out.push({kind:'wash', label:waterOn() ? (isShower(f) ? 'Принять душ' : 'Помыться') : 'Помыться: воды нет', f});
});
function washStart(a0) {
  if (mode !== 'play' || paused || panel || P.sleep) return;
  $('actMenu').hidden = true;
  if (!waterOn()) { toast('Из крана не течёт. Воду отключили'); return; }
  if ((P.washT || 0) > gameMin) { toast('Ты недавно мылся'); return; }
  const shower = isShower(a0.f), cold = !(typeof powerOn === 'function' && powerOn());
  if (zs.some(z => z.state === 'chase' && Math.hypot(z.x - P.x, z.y - P.y) < 14)) { toast('Не время: мертвецы рядом'); return; }
  job(shower ? 4 : 6, () => {
    P.washT = gameMin + 360;
    P.stress = Math.max(0, (P.stress || 0) - (cold ? 8 : 20)); P.unh = Math.max(0, (P.unh || 0) - (cold ? 6 : 18));
    P.wet = Math.min(100, (P.wet || 0) + 70);
    toast(cold ? 'Вода ледяная: света нет и бойлер не греет. Бодрит, но вытрись и согрейся' : shower ? 'Горячий душ. Будто снова обычная жизнь' : 'Полежал в горячей воде. Голова прояснилась');
    if (cold) P.cold = Math.min(100, (P.cold || 0) + 15);
  }, {noisy:1});
  if (SFX.ac) smp('cloth', .25);
}
