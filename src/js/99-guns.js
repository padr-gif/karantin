// ================= огнестрел: выстрел как выстрел =================
// Было: поза выстрела мелькала на 0,2 с, вспышка и трассер шли от пояса, у героя ничего не происходило.
//   • Поза: оружие вскинуто к прицелу и держится, пока стреляешь (раньше мелькала на 0,2 с).
//   • Вспышка и трассер — от дула (точка берётся из того, как оружие нарисовано в руках в этот кадр).
//   • Отдача толкает героя назад: из пистолета чуть-чуть, из ружья заметно. У дула — дымок.
//   • Пистолет выбрасывает гильзу (летит вбок, звякает об асфальт и лежит на земле). Ружьё — переломное:
//     стреляные гильзы выпадают при перезарядке.
{
  const isGun = () => { const w = P.weapon && ITEMS[P.weapon.id]; return w && w.gun && !w.quiet ? w : null; };
  let G = null;                                        // {t, d, sg}
  let shells = [];                                     // гильзы: летят и лежат

  // ---- точка дула: запоминается, когда оружие рисуется в руках ----
  { const dw0 = drawWeapon;
    drawWeapon = function (name, wid, wx, wy, zoff) {
      const r = dw0.apply(this, arguments);
      const d = ITEMS[wid];
      if (d && d.gun && !d.quiet && WSPEC[wid]) {
        const wm = ART.meta.wpn && ART.meta.wpn[WPN_LOOSE.test(name) ? '__w' : name];
        if (wm) { const sp = WSPEC[wid], u = Math.max(...sp.segs.map(s => s[1])), hx = SX(wx, wy) + wm[0], hy = SY(wx, wy, zoff || 0) + wm[1];
          P._muz = {x:hx + wm[2] * (u - 1), y:hy + wm[3] * (u - 1), f:frameNo}; }
      }
      return r;
    };
  }
  // трассер и вспышка (drawV23) — от дула, пока оно известно
  muzzlePt = (s) => (P._muz && frameNo - P._muz.f <= 1 && s.t > 0 ? [P._muz.x, P._muz.y] : null);

  // ---- выстрел: поза, отдача, дым, гильза ----
  { const sh0 = shoot;
    shoot = function (w) {
      const r = sh0.apply(this, arguments);
      if (!w || w.quiet) return r;
      const sg = !!w.spread, f = P.face;
      G = {t:0, d:sg ? .62 : .42, sg};
      const k = sg ? .16 : .05, nx = P.x - Math.cos(f) * k, ny = P.y - Math.sin(f) * k;   // отдача — назад, если есть куда
      if (!navBlocked(Math.floor(nx), Math.floor(ny))) { P.x = nx; P.y = ny; }
      if (!reduceMotion) for (let i = 0; i < (sg ? 4 : 2); i++) emit('smoke', P.x + Math.cos(f) * .75, P.y + Math.sin(f) * .75, 1.15, 1, null, 0, .25);
      if (!sg) eject(1, false);
      return r;
    };
  }
  { const fr0 = finishReload;
    finishReload = function (a) {
      const it = a && a.it, d = it && ITEMS[it.id], spent = d && d.spread ? d.mag - (it.mag || 0) : 0;
      const r = fr0.apply(this, arguments);
      if (spent > 0) eject(spent, true);                                        // переломил ружьё — стреляные гильзы на землю
      return r;
    };
  }
  function eject(n, shotgun) {
    const f = P.face;
    for (let i = 0; i < n; i++) {
      const side = f + Math.PI / 2 + (rng() - .5) * .8, sp = shotgun ? .6 + rng() * .4 : 1.6 + rng() * .8;
      shells.push({x:P.x + Math.cos(f) * .3, y:P.y + Math.sin(f) * .3, z:U * (shotgun ? .7 : 1.05), vx:Math.cos(side) * sp, vy:Math.sin(side) * sp, vz:U * (shotgun ? .5 : 2.2), rot:rng() * 6, vr:(rng() - .5) * 30, life:40, sg:shotgun, b:0});
    }
    if (shells.length > 60) shells.splice(0, shells.length - 60);
  }
  function tink(x, y, sg) {
    const ac = SFX.ac, out = SFX.out; if (!ac || !out) return;
    const d = Math.hypot(x - P.x, y - P.y), v = Math.max(0, 1 - d / 10) * (SFX.vol ? SFX.vol() : .7) * (sg ? .06 : .09); if (v < .004) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(sg ? 900 + rng() * 200 : 3800 + rng() * 900, t);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + (sg ? .08 : .12));
    o.connect(g); g.connect(out); o.start(t); o.stop(t + .15);
  }
  onUpdate(dt => {
    if (G) { G.t += dt; if (G.t >= G.d || !isGun() || P.car) G = null; }
    for (const s of shells) {
      s.life -= dt;
      if (s.z > 0 || s.vz > 0) {
        s.vz -= U * 9 * dt; s.z += s.vz * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt;
        if (s.z <= 0) { s.z = 0; if (s.b < 2 && Math.abs(s.vz) > U * .6) { s.vz = -s.vz * .35; s.vx *= .5; s.vy *= .5; s.vr *= .5; s.b++; tink(s.x, s.y, s.sg); } else { s.vz = 0; s.vx = s.vy = 0; s.vr = 0; } }
        if (opaquePt(s.x, s.y)) { s.vx = -s.vx * .3; s.vy = -s.vy * .3; s.x += s.vx * dt * 2; s.y += s.vy * dt * 2; }
      }
    }
    if (shells.length && shells[0].life <= 0) shells = shells.filter(s => s.life > 0);
  });
  onNewWorld(() => { G = null; shells = []; });
  onDraw(() => {
    if (mode !== 'play') return;
    for (const s of shells) {
      const i = Math.floor(s.y) * MW + Math.floor(s.x); if (!vis[i] && s.z <= 0) continue;
      const x = SX(s.x, s.y), y = SY(s.x, s.y, s.z), a = Math.min(1, s.life / 3);
      ctx.save(); ctx.translate(x, y); ctx.rotate(s.rot); ctx.globalAlpha = a;
      if (s.sg) { ctx.fillStyle = '#9a2a22'; ctx.fillRect(-1.6, -.7, 2.2, 1.4); ctx.fillStyle = '#c9a24a'; ctx.fillRect(.6, -.7, 1, 1.4); }
      else { ctx.fillStyle = '#c9a24a'; ctx.fillRect(-1, -.45, 2, .9); ctx.fillStyle = 'rgba(255,240,180,.7)'; ctx.fillRect(-1, -.45, 2, .3); }
      ctx.restore();
    }
  });

  // ---- поза: вскинул (последний кадр прицеливания), выстрел — отдача ----
  { const pa0 = playerAnim;
    playerAnim = function (pAtk) {
      if (G && heroRig() && mode !== 'dead' && isGun()) {
        // кадры «shoot» задирали ствол вверх на 45° и держали так — выглядело как стрельба в небо;
        // поза прицела держится, отдача — толчком назад, вспышкой и дымом
        const an = G.sg && AN('p', 'aim2') > 1 ? 'aim2' : 'aim1', n = AN('p', an);
        return [an, n - 1];
      }
      return pa0.apply(this, arguments);
    };
  }
}
