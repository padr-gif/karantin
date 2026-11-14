// ================= рогатка: как выглядит, как стреляет, куда летит камень =================
// Раньше рогатка рисовалась палкой с поперечиной (как клюшка), выстрел был мгновенным, с трассером и вспышкой, как у пистолета.
//   • В руках — настоящая рогатка: рукоять в кулаке, развилка, резинка и кожаный кармашек. Камень в кармашке виден, пока заряжено.
//   • Выстрел — натяжение (руки поднимаются, резинка тянется к лицу) и отпуск: резинка хлёстко возвращается, камень летит дугой.
//   • Попадание — когда камень долетел, а не в момент нажатия. Камень может сбить мертвеца с ног.
//   • Промах шумит там, куда упал камень: мертвецы идут на стук — рогаткой можно отвлечь их от себя.
//   • Упавшие камни лежат на земле, их можно подобрать снова. Пустая рогатка сама берёт камень из рюкзака — заряжать отдельно не нужно.
{
  const PULL = .3, REL = .26;                                        // натяжение и отпуск, секунды
  const isSling = () => P.weapon && P.weapon.id === 'slingshot';
  let SL = null;                                                     // {ph:'pull'|'rel', t, a, w}
  let stones = [];                                                   // летящие камни
  let bypass = false;

  // ---- нажатие: не мгновенный выстрел, а натяжение ----
  { const as0 = attackSwing;
    attackSwing = function () {
      if (isSling() && !P.car && mode === 'play' && !paused && !panel && !P.sleep && !(P.cd > 0) && !SL) {
        const it = P.weapon, w = ITEMS[it.id];
        if (!(it.mag > 0) && ammoFor(it).length) {                                    // пустая — камень из рюкзака сам ложится в кармашек
          const am = ammoFor(it)[0]; am.uses--; if (am.uses <= 0) P.inv.splice(P.inv.indexOf(am), 1); it.mag = 1; hud3Key = '';
        }
        if (it.mag > 0) {
          if (P.act && P.act.kind !== 'reload') P.act = null;
          let a = P.face;
          if (!mouseAim) {                                                               // повернуться к ближайшему, как при выстреле
            let best = null;
            for (const z of zs) { const d = Math.hypot(z.x - P.x, z.y - P.y); if (d > w.range || d < .05 || (best && d >= best.d)) continue; if (!vis[Math.floor(z.y) * MW + Math.floor(z.x)] || !los(P.x, P.y, z.x, z.y)) continue; best = {d, a:Math.atan2(z.y - P.y, z.x - P.x)}; }
            if (best) a = best.a;
          }
          P.face = P.fd = a; SL = {ph:'pull', t:0, a, w}; P.cd = PULL + w.cd;
          SFX.rustle && SFX.rustle(); return;
        }
      }
      return as0.apply(this, arguments);
    };
  }
  onUpdate(dt => {
    if (SL && (!isSling() || mode !== 'play' || P.car || P.sleep || (P.act && P.act.kind !== 'reload'))) SL = null;
    if (SL) {
      SL.t += dt;
      if (!mouseAim) P.face = P.fd = SL.a; else SL.a = P.face;
      if (SL.ph === 'pull' && SL.t >= PULL) { SL.ph = 'rel'; SL.t = 0; bypass = true; try { shoot(SL.w); } finally { bypass = false; } P.cd = SL.w.cd; }
      else if (SL.ph === 'rel' && SL.t >= REL) SL = null;
    }
    // летящие камни
    for (const s of stones) {
      s.t += dt;
      if (s.t < s.dur) continue;
      s.done = true; land(s);
    }
    if (stones.length) stones = stones.filter(s => !s.done);
  }, null);

  // ---- выстрел: попадания запоминаются и случаются, когда камень долетит ----
  { const sh0 = shoot;
    shoot = function (w) {
      if (!w || !w.quiet) return sh0.apply(this, arguments);
      const hits = [], hz0 = hitZombie, n0 = gunFx.length;
      hitZombie = (z, dmg, ang, kb) => { hits.push({z, dmg, ang, kb}); return false; };
      try { sh0.apply(this, arguments); } finally { hitZombie = hz0; }
      const fx = gunFx.length > n0 ? gunFx.splice(n0, 1)[0] : null; if (!fx) return;   // вместо трассера и вспышки — камень
      const L = Math.hypot(fx.x1 - P.x, fx.y1 - P.y), z0 = hits[0] && hits[0].z;
      const x1 = z0 ? z0.x : fx.x1, y1 = z0 ? z0.y : fx.y1;
      stones.push({x0:P.x + Math.cos(P.face) * .35, y0:P.y + Math.sin(P.face) * .35, x1, y1, t:0, dur:Math.max(.08, L / 15), h:Math.min(.5, L * .06), hits});
    };
  }
  function land(s) {
    let hit = false;
    for (const h of s.hits) {
      const z = h.z; if (!(z.hp > 0) || !zs.includes(z) || Math.hypot(z.x - s.x1, z.y - s.y1) > 1.2) continue;   // успел отойти — мимо
      hit = true;
      try { smp('hitu', .45, 1.25); } catch (e) {}
      const dead = hitZombie(z, h.dmg, h.ang, h.kb);
      if (!dead && !z.brute && !z.crawl && !z.vt && !(z.down > 0) && rng() < (h.dmg > ITEMS.slingshot.dmg * 1.6 ? .55 : .16)) {   // в голову — чаще валит с ног
        z.down = 1.6 + rng() * .6; z.downT = 0; z.downF = false; z.kd = true; z.stun = 0;
        if (!world.slKd) { world.slKd = true; toast('Камнем в голову — свалился. Есть пара секунд'); }
      }
    }
    if (!hit) {
      try { smp('knock', .22, 1.9); } catch (e) {}
      noise(s.x1, s.y1, 4.5);                                                       // стук камня уводит мертвецов туда
      emit('dust', s.x1, s.y1, .1, 3, null, 0, .2);
    }
    // камень остаётся лежать (не в стене и не в воде) — подобрать можно
    const tx = Math.floor(s.x1), ty = Math.floor(s.y1);
    if (rng() < (hit ? .5 : .85) && !opaquePt(s.x1, s.y1) && get(tx, ty) !== WATER) dropStone(s.x1 + (rng() - .5) * .3, s.y1 + (rng() - .5) * .3);
  }
  function dropStone(x, y) {
    const p = piles.find(p => Math.hypot(p.x - x, p.y - y) < 1 && p.items.some(i => i.id === 'stone'));
    if (p) { const st = p.items.find(i => i.id === 'stone'); st.uses = (st.uses || 0) + 1; return; }
    const st = mkItem('stone'); st.uses = 1; addToPile(x, y, st);
  }
  onNewWorld(() => { SL = null; stones = []; });

  // ---- поза: натяжение — руки поднимаются (кадры прицеливания), отпуск — отдача ----
  const pullK = () => !SL ? 0 : SL.ph === 'pull' ? Math.min(1, SL.t / PULL) : Math.max(0, 1 - SL.t / .05);
  { const pa0 = playerAnim;
    playerAnim = function (pAtk) {
      if (SL && isSling() && heroRig() && mode !== 'dead') {
        if (SL.ph === 'pull') { const n = AN('p', 'aim1'); if (n > 1) return ['aim1', Math.min(n - 1, Math.floor(Math.min(1, SL.t / PULL * 1.25) * n))]; }
        else { const n = AN('p', 'shoot'); if (n > 1) return ['shoot', Math.min(n - 1, Math.floor(SL.t / REL * n))]; }
      }
      return pa0.apply(this, arguments);
    };
  }

  // ---- как рогатка выглядит в руке ----
  // точки в «мире руки»: F — куда смотрит герой, S — вбок, Z — вверх; переводятся в экран так же, как вся изометрия
  { const dw0 = drawWeapon;
    drawWeapon = function (name, wid, wx, wy, zoff) {
      if (wid !== 'slingshot') return dw0.apply(this, arguments);
      const wm = ART.meta.wpn && ART.meta.wpn[name]; if (!wm) return;
      const f = P.fd != null ? P.fd : P.face, cf = Math.cos(f), sf = Math.sin(f);
      const hx = SX(wx, wy) + wm[0], hy = SY(wx, wy, zoff || 0) + wm[1];
      const aiming = !!SL || /_(aim1|shoot)_/.test(name), pull = pullK();
      // вертикаль рогатки: при прицеливании стоит прямо, в опущенной руке — наклонена вперёд
      const up = aiming ? [cf * .15, sf * .15, 1] : [cf * .8, sf * .8, -.35];     // в опущенной руке — развилкой вперёд-вниз
      const P3 = (a, b, c) => {                                                         // a — вперёд, b — вбок, c — по вертикали рогатки
        const wx3 = cf * a - sf * b + up[0] * c, wy3 = sf * a + cf * b + up[1] * c, wz = up[2] * c;
        return [hx + (wx3 - wy3) * 1.45, hy + (wx3 + wy3) * .72 - wz * 1.45];
      };
      const g0 = P3(0, 0, -2.6), crotch = P3(0, 0, 1.6), tL = P3(0, -2.3, 5), tR = P3(0, 2.3, 5);
      const rest = P3(-.6, 0, 4.2), back = P3(-11, 0, 3.6), pouch = [rest[0] + (back[0] - rest[0]) * pull, rest[1] + (back[1] - rest[1]) * pull];
      // после отпуска резинка ещё подрагивает
      if (SL && SL.ph === 'rel') { const k = Math.max(0, 1 - SL.t / REL), wob = Math.sin(SL.t * 70) * 1.6 * k; const fw = P3(1.5 * k, 0, 4.4); pouch[0] = fw[0] + wob * .3; pouch[1] = fw[1] + wob * .5; }
      const seg = (a, b, w, col) => { ctx.strokeStyle = 'rgba(16,14,12,.9)'; ctx.lineWidth = w + .8; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
      const band = (a, b) => { ctx.strokeStyle = 'rgba(16,14,12,.55)'; ctx.lineWidth = 1.05; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.strokeStyle = '#c4683e'; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const farFirst = cf - sf < 0;                                                     // дальняя от камеры резинка — первой
      const loaded = P.weapon.mag > 0 && !(SL && SL.ph === 'rel');
      band(farFirst ? tR : tL, pouch);
      seg(g0, crotch, 1.5, '#7b4f2c');                                                  // рукоять
      seg(crotch, tL, 1.1, '#8a5a32'); seg(crotch, tR, 1.1, '#8a5a32');                 // развилка
      ctx.fillStyle = '#5a3a24'; ctx.beginPath(); ctx.ellipse(pouch[0], pouch[1], 1.3, .9, 0, 0, 6.283); ctx.fill();   // кармашек
      if (loaded) { ctx.fillStyle = '#9a9c98'; ctx.beginPath(); ctx.arc(pouch[0], pouch[1] - .3, .95, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(pouch[0] - .5, pouch[1] - .9, .6, .45); }
      band(farFirst ? tL : tR, pouch);
      ctx.restore();
    };
  }

  // ---- летящий камень: дугой, с тенью на земле ----
  onDraw(() => {
    if (mode !== 'play' || !stones.length) return;
    for (const s of stones) {
      const p = Math.min(1, s.t / s.dur), x = s.x0 + (s.x1 - s.x0) * p, y = s.y0 + (s.y1 - s.y0) * p;
      const z = U * (1.05 - .55 * p) + Math.sin(p * Math.PI) * U * s.h * 2;
      const gx = SX(x, y), gy = SY(x, y, 0), sx = gx, sy = SY(x, y, z);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(gx, gy, 1.4, .7, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(16,14,12,.9)'; ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#a6a8a2'; ctx.beginPath(); ctx.arc(sx, sy, 1.05, 0, 6.283); ctx.fill();
    }
  });
}
