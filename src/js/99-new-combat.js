// ================= бой ощутимее: сбить с ног, добить лежачего, толчок кулаками, притворщики =================
// 1. Сбить с ног. Тяжёлый или критический удар валит мертвеца на землю (обычный z.down — он лежит и встаёт сам).
//    Тяжёлое оружие валит чаще, нож и молоток — редко, здоровяка свалить трудно.
// 2. Добить. По лежачему удары сильнее в 1,6 раза.
// 3. Кулаки — это ещё и толчок: отбрасывают дальше и иногда сбивают с ног, чтобы можно было вырваться и убежать.
// 4. Отдача удара: на крите и убийстве — короткая пауза кадра и лёгкая тряска (если тряска включена в настройках).
// 5. Притворщики. Со второго дня часть мертвецов не бродит, а лежит как труп (без лужи крови) и встаёт,
//    когда герой подходит близко. Крадущегося подпускают вплотную — лежачего можно добить первым.
{
  let HS = 0;
  const u0 = update;
  update = function (dt) { if (HS > 0) { HS -= dt; return; } return u0.apply(this, arguments); };
  const feel = (stop, sh) => {
    if (reduceMotion) return;
    HS = Math.max(HS, stop);
    if (settings.shake) shake = Math.max(shake, sh);
  };
  const once = (flag, text) => { if (world[flag]) return; world[flag] = true; toast(text); };

  const a0 = attackSwing;
  attackSwing = function () {
    if (!P || P.car || mode !== 'play') return a0.apply(this, arguments);
    const W0 = P.weapon ? ITEMS[P.weapon.id] : FISTS;
    if (W0.gun && P.weapon.mag > 0) return a0.apply(this, arguments);
    const cd0 = P.cd, fists = !P.weapon, base = W0.gun ? W0.melee : W0.dmg;
    const near = [];
    for (const z of zs) if (Math.abs(z.x - P.x) < 3.5 && Math.abs(z.y - P.y) < 3.5) near.push([z, z.hp, z.down > 0]);
    const k0 = kills, r = a0.apply(this, arguments);
    if (cd0 > 0 || !(P.cd > 0)) return r;                                      // удара не было
    let crit = false;
    for (const [z, hp0, wasDown] of near) {
      const dealt = hp0 - z.hp; if (dealt <= 0) continue;
      if (dealt > base * 1.55) crit = true;
      if (!zs.includes(z)) continue;                                          // уже упокоен
      if (z.lurk) wake(z, true);
      if (wasDown) {
        z.hp -= dealt * .6;
        if (z.hp <= 0) { emit('blood', z.x, z.y, 1, 10, P.face, 1.6, 2.8); SFX.splat(z.x, z.y); killZombie(z); once('finMsg', 'Добил лежачего. По сбитым с ног удары гораздо сильнее'); }
        continue;
      }
      let p = dealt > base * 1.55 ? .5 : fists ? .12 : base >= 38 ? .22 : base >= 30 ? .12 : .05;   // сбить с ног — событие, а не каждый второй удар
      if (z.brute) p = fists ? 0 : p * .3;
      if (z.crawl || z.vt) p = 0;
      if (fists) { z.kx *= 1.6; z.ky *= 1.6; }
      if (rng() < p) {
        z.down = 2 + rng() * .8; z.downT = 0; z.downF = false; z.kd = true; z.stun = 0;
        once('kdMsg', fists ? 'Оттолкнул — он упал. Пока лежит, можно уйти или добить' : 'Сбил с ног! Пока он лежит, удары по нему гораздо сильнее');
      }
    }
    if (kills > k0) feel(base >= 38 ? .06 : .045, base >= 38 ? .1 : .06);
    else if (crit) feel(.04, .07);
    return r;
  };

  // ---------- падение и подъём: не «кадры смерти задом наперёд», а по частям ----------
  // пошатнулся от удара → падает с ускорением (как под весом) → лежит → поднимается медленно, с усилием.
  // Плюс поза: отклоняется назад в падении, чуть подпрыгивает при ударе о землю, покачивается, вставая.
  const KD_HIT = .16, KD_FALL = .5, KD_UP = 1;
  const sm = k => k * k * (3 - 2 * k);
  const za0 = zombieAnim;
  zombieAnim = function (z) {
    if (!(z.kd && z.down > 0) || z.vt || z.downF) return za0.apply(this, arguments);
    const m = AN('z', 'death'), t = z.downT || 0;
    if (z.down < KD_UP) return ['death', Math.max(0, Math.min(m - 1, Math.round(sm(z.down / KD_UP) * (m - 1))))];
    if (t < KD_HIT) { const h = AN('z', 'hit'); return ['hit', Math.min(h - 1, Math.floor(t / KD_HIT * h))]; }
    const k = Math.min(1, (t - KD_HIT) / KD_FALL);
    return ['death', Math.min(m - 1, Math.round(Math.pow(k, 1.8) * (m - 1)))];
  };
  const zp0 = zombiePose;
  zombiePose = function (z, an) {
    if (reduceMotion || !(z.kd && z.down > 0) || z.vt || z.downF) return zp0.apply(this, arguments);
    const [vx] = scrDir(z.face), t = z.downT || 0, p = {ox:0, oy:0, r:0, sx:1, sy:1};
    if (z.down < KD_UP) { const k = 1 - z.down / KD_UP; p.oy -= Math.sin(Math.PI * k) * 1.6; p.r = vx * .05 * Math.sin(Math.PI * 2 * k); return p; }
    if (t < KD_HIT + KD_FALL) { const k = t / (KD_HIT + KD_FALL); p.r = -vx * .14 * Math.sin(Math.PI * k); p.oy -= Math.sin(Math.PI * Math.min(1, k * 1.6)) * 1.5; return p; }
    const b = t - KD_HIT - KD_FALL;
    if (b < .28) p.oy -= Math.sin(Math.PI * b / .28) * 2.2 * (1 - b / .28);       // удар о землю
    return p;
  };
  // удар о землю: глухой стук, облачко пыли и лёгкая отдача в руку (вибрация, если включена)
  onUpdate(() => {
    for (const z of zs) {
      if (!z.kd) continue;
      if (!(z.down > 0)) { z.kd = false; z.kdL = false; continue; }
      if (!z.kdL && z.down >= KD_UP && (z.downT || 0) >= KD_HIT + KD_FALL) {
        z.kdL = true; emit('dust', z.x, z.y, .1, 7, null, 6.283, 1.6); SFX.knock && SFX.knock(z.x, z.y);
        if (Math.hypot(z.x - P.x, z.y - P.y) < 3) buzz(12, 'kd', 150);
      }
    }
  });

  // ---------- притворщики ----------
  const UP = KD_UP;
  function wake(z, hit) {
    z.lurk = false; z.down = UP; z.kd = true; z.state = 'chase'; z.lost = 0;
    if (hit) return;
    SFX.growl && SFX.growl(z.x, z.y);
    P.stress = Math.min(100, (P.stress || 0) + 6);
    if (!reduceMotion && settings.shake) shake = Math.max(shake, .05);
    once('lurkMsg', 'Он не был мёртв! Не все лежащие — трупы: под настоящим трупом лужа крови. К лежачим подходи крадучись и бей первым');
  }
  let acc = 0;
  onUpdate(dt => {
    if (!P || mode !== 'play' || paused) return;
    for (const z of zs) {
      if (!z.lurk) continue;
      if (z.hp < z.lhp) { wake(z, true); continue; }
      z.down = 99; z.downT = 1; z.downF = false;
      if (P.car || P.sleep) continue;
      const d = Math.hypot(z.x - P.x, z.y - P.y), trig = P.sneak ? 1.1 : P.running ? 3 : 2.2;
      if (d < trig && (d < .9 || los(P.x, P.y, z.x, z.y))) wake(z);
    }
    acc += dt; if (acc < 2) return; acc = 0;
    if (gameMin - startMin < 1440 || (typeof TUT !== 'undefined' && TUT.on)) return;
    for (const z of zs) {
      if (z.lc) continue;
      const i = Math.floor(z.y) * MW + Math.floor(z.x);
      if (vis[i] || Math.hypot(z.x - P.x, z.y - P.y) < 16) continue;         // на глазах никто не «умирает»
      z.lc = true;
      if (z.state === 'chase' || z.crawl || z.brute || z.scream || z.first || z.ghost || z.vt || z.down > 0 || (z.pal && z.pal.fast)) continue;
      if (rng() < (hAt[i] ? .16 : .05)) { z.lurk = true; z.lhp = z.hp; z.down = 99; z.downT = 1; z.downF = false; z.state = 'wander'; }
    }
  });
  onSave(d => { d.xLurk = []; zs.forEach((z, k) => { if (z.lurk) d.xLurk.push(k); }); });
  onLoad(d => { for (const k of (d && d.xLurk) || []) { const z = zs[k]; if (z) { z.lurk = true; z.lc = true; z.lhp = z.hp; z.down = 99; z.downT = 1; } } });
}
