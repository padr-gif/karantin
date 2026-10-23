// ================= v39: спокойные анимации героя, зарядка «прыжки руки в стороны», душ — заходишь в кабину =================
// У героя (tools/glbchar/bake_hero.py) свои числа кадров: anims.pm, и длительности клипов: anims.pmdur (секунды).
// Циклы (стойка, обыск, работа, чтение, зарядка) идут с настоящей скоростью клипа — плавно, без рывков.
const heroMale = () => ((P && P.look) || look).g === 'm' && ART.meta && ART.meta.anims && ART.meta.anims.pm;
const AN39 = AN;
AN = function (k, a) { if (k === 'p' && heroMale() && ART.meta.anims.pm[a]) return ART.meta.anims.pm[a]; return AN39(k, a); };
const pmLoop = (an, speed) => { const n = AN('p', an), d = (ART.meta.anims.pmdur && ART.meta.anims.pmdur[an]) || 2; return [an, Math.floor(animT * (speed || 1) / d * n) % n]; };
const playerAnim39 = playerAnim;
playerAnim = function (pAtk) {
  const r = playerAnim39(pAtk);
  if (!heroMale() || mode === 'dead') return r;
  const A = P.act, act = A && A.kind;
  if (A && act === 'job' && A.an === 'jacks' && AN('p', 'jacks') > 1) return pmLoop('jacks');
  if (A && act === 'job' && A.shower) return pmLoop('idle', .8);
  if (A && act === 'use' && A.an === 'read' && AN('p', 'read') > 1) return pmLoop('read');
  if (r[0] === 'idle' || r[0] === 'search' || r[0] === 'work') return pmLoop(r[0]);
  return r;
};

// ---- зарядка: прыжки «ноги врозь — руки в стороны», дольше и полезнее ----
workout = function () {
  const why = canWorkout(); if (why) { toast(why); return; }
  job(25, () => {
    P.en = Math.max(0, P.en - 16); P.sat = Math.max(0, P.sat - 4); P.hyd = Math.max(0, P.hyd - 7);
    P.bored = Math.max(0, (P.bored || 0) - 20); P.stress = Math.max(0, (P.stress || 0) - 14); P.unh = Math.max(0, (P.unh || 0) - 8);
    P.fitT = gameMin + 240; addXp('fit', 4); stat('workout'); SFX.rustle();
    toast('Сотня прыжков с руками в стороны. Сердце стучит, голова ясная');
  }, {reopen:'self', sub:'skills', noisy:2, an:'jacks'});
};
// шаги в такт прыжкам
{ let lastJ = -1;
  const upd39 = update;
  update = function (dt) {
    upd39(dt);
    if (P && P.act && P.act.kind === 'job' && P.act.an === 'jacks') { const k = Math.floor(animT * 2); if (k !== lastJ) { lastJ = k; SFX.step(true, false); } }
  };
}

// ---- душ: заходишь в кабину, моешься ~30 секунд, выходишь ----
const SHOWER_S = 30;
const doAction39 = doAction;
doAction = function (a0) {
  if (!(a0 && a0.kind === 'wash')) return doAction39(a0);
  const f = a0.f, x0 = P.x, y0 = P.y;
  doAction39(a0);
  const A = P.act; if (!A || A.kind !== 'job') return;
  A.dur = SHOWER_S * (isShower(f) ? 1 : 1.3); A.shower = {f, x0, y0, cx:(f.r[0] + f.r[2]) / 2, cy:(f.r[1] + f.r[3]) / 2};
};
{ const upd = update;
  update = function (dt) {
    const A = P && P.act, sh = A && A.kind === 'job' && A.shower;
    upd(dt);
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
  };
  // вода шумит (как дождь за окном), пока моешься
  const amb39 = SFX.ambient;
  SFX.ambient = function (rainV, night, inside) { amb39(P && P._inShower ? Math.max(rainV, 1) : rainV, night, inside); };
  // в кабине тебя видно сквозь матовое стекло
  const dp39 = drawPlayer;
  drawPlayer = function (an, fi, zoff) {
    if (!P._inShower) return dp39(an, fi, zoff);
    const a = ctx.globalAlpha; ctx.globalAlpha = .5; try { dp39(an, fi, zoff); } finally { ctx.globalAlpha = a; }
    if (Math.random() < .5) emit('glass', P.x + (Math.random() - .5) * .3, P.y + (Math.random() - .5) * .3, .3, 1, null, 0, .6);
  };
}
