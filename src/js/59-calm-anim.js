// ================= спокойные анимации героя, зарядка «прыжки руки в стороны», душ — заходишь в кабину =================
// У героя (tools/glbchar/bake_hero.py) свои числа кадров: anims.pm, и длительности клипов: anims.pmdur (секунды).
// Циклы (стойка, обыск, работа, чтение, зарядка) идут с настоящей скоростью клипа — плавно, без рывков.
function heroMale() { return ((P && P.look) || look).g === 'm' && ART.meta && ART.meta.anims && ART.meta.anims.pm; }
const pmLoop = (an, speed) => { const n = AN('p', an), d = (ART.meta.anims.pmdur && ART.meta.anims.pmdur[an]) || 2; return [an, Math.floor(animT * (speed || 1) / d * n) % n]; };

// ---- зарядка: прыжки «ноги врозь — руки в стороны», дольше и полезнее ----
// шаги в такт прыжкам
{ let lastJ = -1;
  onUpdate(dt => {
    if (P && P.act && P.act.kind === 'job' && P.act.an === 'jacks') { const k = Math.floor(animT * 2); if (k !== lastJ) { lastJ = k; SFX.step(true, false); } }
  });
}

// ---- душ: заходишь в кабину, моешься ~30 секунд, выходишь ----
const SHOWER_S = 30;
defAction('wash', {run: a0 => {                                                   // помыться (58-shower), затем зайти в кабину на SHOWER_S секунд
  const f = a0.f, x0 = P.x, y0 = P.y;
  washStart(a0);
  const A = P.act; if (!A || A.kind !== 'job') return;
  A.dur = SHOWER_S * (isShower(f) ? 1 : 1.3); A.shower = {f, x0, y0, cx:(f.r[0] + f.r[2]) / 2, cy:(f.r[1] + f.r[3]) / 2};
}});
{ onUpdate((dt, {A, sh}) => {
    if (!sh) { if (P && P._inShower) { P._inShower = false; } return; }
    if (P.act !== A) {                                                           // прервали (мертвец, кнопка) — выходим из кабины
      P.x = sh.x0; P.y = sh.y0; P._inShower = false; return;
    }
    const k = A.t / A.dur, e = t => t * t * (3 - 2 * t);
    const into = Math.min(1, A.t / 1.1), out = Math.max(0, (A.t - (A.dur - 1.1)) / 1.1);
    const w = e(into) * (1 - e(out));                                             // 0 — у входа, 1 — внутри
    P.x = sh.x0 + (sh.cx - sh.x0) * w; P.y = sh.y0 + (sh.cy - sh.y0) * w; P.moving = false;
    if (into < 1 || out > 0) P.face = P.fd = Math.atan2(out > 0 ? sh.y0 - sh.cy : sh.cy - sh.y0, out > 0 ? sh.x0 - sh.cx : sh.cx - sh.x0);
    P._inShower = w > .5;
    if (k > .99) { P.x = sh.x0; P.y = sh.y0; }
  }, dt => { const A = P && P.act, sh = A && A.kind === 'job' && A.shower; return {A, sh}; });
  // (вода шумит, пока моешься — SFX.ambient; в душе без одежды — outfitRegs; не «застревает» в кабине — unstick)
}
