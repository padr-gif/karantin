// ================= update =================
const hourOf = () => (gameMin % 1440) / 60;
function lightLevel() {
  const h = hourOf();
  if (h >= 7 && h < 19) return 1;
  if (h >= 19 && h < 21) return 1 - (h - 19) / 2;
  if (h >= 5 && h < 7) return (h - 5) / 2;
  return 0;
}
let U = 30, hh = 15, WH = 72, ox = 0, oy = 0;
function screenToWorld(sx, sy) { const a = (sx - ox) / U, b = (sy - oy) / hh; return [(a + b) / 2, (b - a) / 2]; }

const doorList = {src:null, t:0, L:[]};
let sepHead = new Int32Array(NT); let sepNext = new Int32Array(256);
const sepCell = z => clamp(Math.floor(z.y), 0, MH - 1) * MW + clamp(Math.floor(z.x), 0, MW - 1);
function update(dt) { runHooked('update', updateCore, dt); }
// мертвец вне активной зоны: раз в ~секунду одним шагом идёт к шуму (investigate) или бредёт куда-то рядом
function farZombie(z, dt) {
  z.mv = 0; z.sl = (z.sl == null ? (z.seed || 0) % 1 : z.sl) + dt;
  if (z.sl < 1) return;
  const t = z.sl; z.sl = 0;
  if (z.state === 'investigate') { z.it = (z.it || 0) + t; if (z.it > 16) { z.state = 'wander'; z.wt = 0; } }
  else { z.wt = (z.wt || 0) - t; if (z.wt <= 0) { z.wt = 4 + rng() * 8; z.tx = clamp(z.x + (rng() - .5) * 10, 1, MW - 1); z.ty = clamp(z.y + (rng() - .5) * 10, 1, MH - 1); } }
  if (z.crawl || z.tx == null) return;
  const tx = z.tx - z.x, ty = z.ty - z.y, td = Math.hypot(tx, ty); if (td < .5) { if (z.state === 'investigate') { z.state = 'wander'; z.wt = 0; } return; }
  const step = Math.min(td, (z.state === 'investigate' ? .8 : .33) * z.spd * t, 1.5);
  for (let k = 0, n = Math.ceil(step / .4); k < n; k++) move(z, tx / td * step / n, ty / td * step / n);
  z.face = Math.atan2(ty, tx);
}
function updateCore(dt) {
  const gm = dt * settings.dayLen * (P.sleep ? 40 : 1);
  autoT += gm; if (settings.autosave && autoT >= 120) { autoT = 0; writeSave('auto').then(flashSaved); }
  gameMin += gm;
  const L = lightLevel();
  if (!powerMsg && !powerOn()) { powerMsg = true; toast('Свет погас. Электричества больше нет.'); }
  if (!waterMsg && !waterOn()) { waterMsg = true; toast('Вода в кранах кончилась.'); }
  weatherTimer -= gm;
  if (weatherTimer <= 0) { weatherTimer = 120 + rng() * 240; rainTarget = rainTarget ? (rng() < .55 / (world.rainK || 1) ? 0 : 1) : (rng() < .3 * (world.rainK != null ? world.rainK : 1) ? 1 : 0); world.storm = !!rainTarget && rng() < .4; if (world.storm) toast('Надвигается гроза'); }
  rain += clamp(rainTarget - rain, -dt * .25, dt * .25);
  SFX.ambient(snowing() ? rain * .2 : rain, 1 - L, insideHouse(P.x, P.y));
  for (const fi of fires) if (!fi.out && fi.t > 0 && Math.random() < dt * 9) SFX.crackle(fi.x, fi.y);
  if (P.hp < 25 && !P.sleep) { P.hbT = (P.hbT || 0) - dt; if (P.hbT <= 0) { P.hbT = .9; SFX.heart(1 - P.hp / 25); } }

  let ix = joy.x, iy = joy.y;
  const gw = (ix || iy) ? (goTo = null) : updateGoTo(dt);
  if (gw && !P.sleep) { const [gx, gy] = gw; ix = gx - gy; iy = (gx + gy) / 2; const l = Math.hypot(ix, iy) || 1; ix /= l; iy /= l; }
  if (!P.sleep) {
    if (keys.has('KeyW') || keys.has('ArrowUp')) iy -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) iy += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  } else { ix = iy = 0; }
  let mag = Math.min(1, Math.hypot(ix, iy));
  if (mag < .15) mag = 0;
  if (panel) { mag = 0; goTo = null; }
  tickXfer(dt); tickAlarm(); tickBustle(dt); tickScreamers(dt); tickEvac(dt); tickWinterFx(dt); tickFlu(dt * settings.dayLen * (P.sleep ? 40 : 1)); tickV23(dt, gm);
  if (P.act && P.act.kind === 'vault') { mag = 0; const A = P.act, k = Math.min(1, A.t / A.dur), e = k * k * (3 - 2 * k); P.x = A.fx + (A.tx - A.fx) * e; P.y = A.fy + (A.ty - A.fy) * e; }
  let wx = 0, wy = 0;
  if (mag) { const a = ix, b = 2 * iy; wx = (a + b) / 2; wy = (b - a) / 2; const l = Math.hypot(wx, wy) || 1; wx /= l; wy /= l; }
  P.running = (runToggle || keys.has('ShiftLeft') || keys.has('ShiftRight')) && mag > 0 && P.en > 3 && !P.sneak && canRun();
  P.moving = mag > 0;
  if (P.car) { driveUpdate(dt, wx, wy, mag); P.moving = false; P.running = false; }
  if (P.moving) {
    if ((!goTo || joy.id !== null) && !(P.act && P.act.kind === 'reload')) P.act = null;
    let sp = (P.running ? 4.0 * (hasTr('athlete') ? 1.15 : 1) : P.sneak ? 1.15 : 2.3) * mag * moveK();
    if (P.en < 15) sp *= .72;
    if (P.hp < 25) sp *= .82;
    if (get(Math.floor(P.x), Math.floor(P.y)) === WIN) sp *= .4;
    if ((world.snow || 0) > .4 && !insideHouse(P.x, P.y)) sp *= .88;
    const px = P.x, py = P.y;
    move(P, wx * sp * dt, wy * sp * dt);
    { const w0 = P.walk; P.walk += Math.hypot(P.x - px, P.y - py) * 5.2; const sk = P.running ? .62 : 1; if (Math.floor(w0 * sk / Math.PI) !== Math.floor(P.walk * sk / Math.PI)) SFX.step(insideHouse(P.x, P.y), P.running); }   // шаг — в такт анимации (бег — тот же множитель .62, что в playerAnim)
    if (!mouseAim) P.face = Math.atan2(wy, wx);
  }
  {
    const fd = P.fd != null ? P.fd : P.face;
    P.fd = fd + Math.atan2(Math.sin(P.face - fd), Math.cos(P.face - fd)) * Math.min(1, dt * 14);
  }
  if (mouseAim && !P.sleep) { const [mx, my] = screenToWorld(mouseX * DEV / SCALE, (mouseY * DEV / SCALE) + U * .9); P.face = Math.atan2(my - P.y, mx - P.x); }

  P.cd = Math.max(0, P.cd - dt); P.swing = Math.max(0, P.swing - dt); P.hurt = Math.max(0, P.hurt - dt);
  if (atkHeld && P.cd <= 0) attack();
  if (P.atkT != null) P.atkT += dt;
  if (P.running) { P.dustT = (P.dustT || 0) - dt; if (P.dustT <= 0) { P.dustT = .22; emit('dust', P.x, P.y, .02, 1, null, 0, .6); } }
  noiseTimer -= dt;
  if (noiseTimer <= 0 && P.moving && !P.sneak) { noise(P.x, P.y, (P.running ? 7 : 1.6) * (rain > .5 ? .8 : 1) * stepNoiseK()); noiseTimer = .5; }
  if (P.act) { P.act.t += dt; if (P.act.t >= P.act.dur) { const a = P.act; P.act = null; finishAct(a); } }
  updateThrown(dt);
  updateGens(dt, gm); updateBeds(gm); updateHeli(dt); updateDrops(dt); updateBlazes(dt); updateTraps(); updateFlares(dt); updateBino(dt); updateClimate(gm); updateStorm(dt); updateHorde(); updateSnow(gm); updateMood(gm, dt); P.achT = (P.achT || 0) - dt; if (P.achT <= 0) { P.achT = 1; checkAch(); }
  { const dark = lightLevel() < .3, day = Math.floor(gameMin / 1440); if (dark && P.nightDay !== day) { P.nightDay = day; toast('Стемнело. Ночью мертвецы бегают быстрее'); } }
  P.fenceT = Math.max(0, (P.fenceT || 0) - dt);
  if (!P.fenceT && !world.nofence && (P.x < FEN + 2.3 || P.y < FEN + 2.3 || P.x > MW - FEN - 2.3 || P.y > MH - FEN - 2.3)) { P.fenceT = 45; toast('Карантинная зона. Через сетку не перелезть, а через бетонные блоки на блокпосту можно: дальше соседние районы'); }
  if (!panel && piles.some(p => !p.items.length)) piles = piles.filter(p => p.items.length);

  const rate = P.sleep ? .5 : 1;
  const thrift = heroK('thrift') * heroK('food');                              // профессия и телосложение (безработный — .8)
  P.sat -= gm / 12 * rate * thrift * (hasTr('hearty') ? 1.3 : 1); P.hyd -= gm / 9 * rate * thrift;
  if (P.sleep) P.en += gm * .22 * (hasTr('insomnia') ? .65 : 1); else if (P.running) P.en -= gm * .9 * (hasTr('athlete') ? .7 : 1) * enDrainK(); else P.en -= gm * .1 * enDrainK();
  if (P.sat <= 0) { P.hp -= gm * .45; lastCause = 'Голод'; }
  if (P.hyd <= 0) { P.hp -= gm * .75; lastCause = 'Жажда'; }
  if (P.bleed) { P.hp -= gm * bleedRate(); lastCause = P.inf ? 'Укус' : 'Кровопотеря'; if (rng() < dt * .8) addBlood(P.x, P.y, .2); }
  if (P.pois > 0) { P.pois -= gm; P.hp -= gm * .06; lastCause = 'Отравление'; }
  if (P.inf) { P.infT += gm; if (P.infT > 360) { P.hp -= gm * .2; lastCause = 'Укус'; } }
  else if (P.sat > 40 && P.hyd > 40 && !P.bleed && P.pois <= 0 && !(P.cold > 55)) P.hp += gm * (P.sleep ? .2 : .1) * (P.prof === 'medic' ? 1.5 : 1) * (hasTr('fastheal') ? 1.3 : hasTr('slowheal') ? .75 : 1) * ((P.unh || 0) > 80 ? .5 : 1) * ((P.fever || 0) > 0 ? 0 : 1);
  P.sat = clamp(P.sat, 0, 100); P.hyd = clamp(P.hyd, 0, 100); P.en = clamp(P.en, 0, 100); P.hp = Math.min(100, P.hp);
  for (const fi of fires) {
    fi.t -= gm * (rain > .5 ? 2 : 1);
    if (fi.t <= 0 && !fi.out) { fi.out = true; if (Math.hypot(fi.x - P.x, fi.y - P.y) < 10) toast(rain > .5 ? 'Дождь залил костёр' : 'Костёр догорел'); }
    if (!reduceMotion && !fi.out && rng() < dt * 3) emit('smoke', fi.x + (rng() - .5) * .2, fi.y + (rng() - .5) * .2, .5, 1, null, 0, .3);
  }
  fires = fires.filter(fi => !fi.out || fi.t > -600);
  if (rain > .3) for (const b of barrels) if (b.outside) b.w = Math.min(20, b.w + gm * .06 * rain);
  const fl = flashlight();
  if (fl) { fl.ch -= gm / (fl.id === 'candle' ? 4 : fl.id === 'phone' ? 2.5 : 5); if (fl.ch <= 0) { fl.ch = 0; fl.on = false; if (fl.id === 'candle') { P.inv.splice(P.inv.indexOf(fl), 1); toast('Свеча догорела'); } else toast(fl.id === 'phone' ? 'Телефон сел — фонарик погас' : 'Фонарик погас: батарейка села'); } }

  flowTimer -= dt; if (flowTimer <= 0) { buildFlow(); flowTimer = .3; }
  visTimer -= dt; if (visTimer <= 0) { computeVis(); fogDirty = true; visTimer = .12; }
  // двери: список дверей кэшируется (раньше каждый кадр перебирались все 34 тыс. клеток карты)
  if (doorList.src !== obs || (doorList.t -= dt) < 0) { doorList.src = obs; doorList.t = 3; doorList.L = obs.filter(o => o && o.t === 'door'); }
  for (const o of doorList.L) { const tg = o.open && !o.dead ? 1 : 0; if (o.ang == null) o.ang = tg; if (o.ang !== tg) o.ang += clamp(tg - o.ang, -dt * 5, dt * 5); }
  for (const c of corpses) if (c.fall < 1) { c.fall = Math.min(1, c.fall + dt / .5); if (c.fall >= 1) stampQ.push({c}); }

  const sight = (4 + 6 * L + (fl ? 2.5 : 0)) * (P.sneak ? .6 : 1) * (rain > .5 ? .85 : 1);
  for (const z of zs) {
    z.atk -= dt;
    if (z.kx || z.ky) { move(z, z.kx * dt, z.ky * dt); z.kx *= .82; z.ky *= .82; if (Math.abs(z.kx) + Math.abs(z.ky) < .05) z.kx = z.ky = 0; }
    z.mv = 0;
    z.reachA = (z.reachA || 0) + clamp((z.state === 'chase' ? 1 : 0) - (z.reachA || 0), -dt * 2, dt * 2);
    if (z.trapT > 0) { z.trapT -= dt; z.stun = Math.max(z.stun, .1); }
    if (z.vt) { tickZVault(z, dt); continue; }
    if (z.down > 0) { z.down -= dt; z.downT = (z.downT || 0) + dt; z.wind = 0; z.mv = 0; continue; }
    if (z.stun > 0) { z.stun -= dt; z.wind = 0; continue; }
    if (z.state !== 'chase' && (Math.abs(P.x - z.x) > ZONE_R || Math.abs(P.y - z.y) > ZONE_R)) { farZombie(z, dt); continue; }   // вне активной зоны — спит
    const dx = P.x - z.x, dy = P.y - z.y, d = Math.hypot(dx, dy);
    const zsg = sight * sightK(z), sees = d < zsg && los(z.x, z.y, P.x, P.y);
    let spot = sees;
    if (sees && z.state !== 'chase' && P.sneak && d > 1.3 && !P.car) spot = noticeStep(z, d, zsg, dt);
    else if (!sees && z.aw > 0) z.aw = Math.max(0, z.aw - dt * .35);
    if (spot) { if (z.state !== 'chase') { SFX.growl(z); if (P.sneak || z.aw > 0) z.spT = 1.2; if (z.pal.fast) { runnerMsg(z); if (lightLevel() < .3) SFX.shriek(z); } } z.state = 'chase'; z.lost = 0; z.aw = 0; }
    if (d < 14 && !(z.crawl && z.state !== 'chase') && Math.random() < dt * (z.state === 'chase' ? .25 : .05)) SFX.moan(z);
    else if (z.state === 'chase') { z.lost += dt; if (z.lost > 6) { z.state = 'investigate'; z.it = 0; } }
    if (z.wind > 0) {
      z.wind -= dt;
      if (z.wind <= 0) { if (d < .85 && sees) hurtPlayer(z); z.atk = 1.25; }
      continue;
    }
    let mx = 0, my = 0, sp = 0;
    if (z.state === 'chase' || z.state === 'investigate') {
      sp = (z.state === 'chase' ? 1.12 * (z.pal.fast ? (lightLevel() < .3 ? 1.65 : 1.15) : 1) * (lightLevel() < .3 ? 1.3 : 1) : .8) * z.spd * (z.crawl ? .38 : 1);
      if (z.state === 'investigate') { z.it += dt; if (z.it > 16) { z.state = 'wander'; z.wt = 0; } }
      if (d < .68 && z.atk <= 0 && sees) { z.wind = .35; z.face = Math.atan2(dy, dx); SFX.growl(z); continue; }
      if (d < 1.6 && sees) { mx = dx / d; my = dy / d; if (d < .55) sp = 0; }
      else if (z.state === 'investigate' && Math.hypot(z.tx - P.x, z.ty - P.y) > 4) {
        const tdx = z.tx - z.x, tdy = z.ty - z.y, td = Math.hypot(tdx, tdy);
        if (td < 1.2) { z.state = 'wander'; z.wt = 0; } else { mx = tdx / td; my = tdy / td; }
      }
      else {
        const st = flowStep(z);
        if (st) {
          const [nx, ny] = st, ni = ny * MW + nx;
          if ((map[ni] === DOOR || map[ni] === WIN) && openingBlocks(ni)) {
            const cd = Math.hypot(nx + .5 - z.x, ny + .5 - z.y);
            if (cd < .75) {
              sp = 0; z.face = Math.atan2(ny + .5 - z.y, nx + .5 - z.x);
              z.bash -= dt;
              if (z.bash <= 0) { z.bash = 1.1 + rng() * .4; damageOpening(ni, 7 + rng() * 6); noise(nx + .5, ny + .5, 5); }
            } else { mx = (nx + .5 - z.x) / cd; my = (ny + .5 - z.y) / cd; }
          } else {
            const tx = nx + .5 - z.x, ty = ny + .5 - z.y, l = Math.hypot(tx, ty) || 1;
            mx = tx / l; my = ty / l;
          }
        } else if (d > 0) { mx = dx / d; my = dy / d; }
      }
    } else {
      z.wt -= dt;
      if (z.wt <= 0) {
        z.wt = 2 + rng() * 5;
        if (rng() < .45) { z.tx = z.x; z.ty = z.y; }
        else { z.tx = clamp(z.x + (rng() - .5) * 8, 1, MW - 1); z.ty = clamp(z.y + (rng() - .5) * 8, 1, MH - 1); }
      }
      const tx = z.tx - z.x, ty = z.ty - z.y, td = Math.hypot(tx, ty);
      if (td > .3 && !z.crawl) { mx = tx / td; my = ty / td; sp = .33 * z.spd; }
    }
    if (sp && (mx || my)) {
      if (get(Math.floor(z.x), Math.floor(z.y)) === WIN) sp *= .35;
      z.sway += dt * 5;
      const sw = Math.sin(z.sway) * .25;
      const ax = mx - my * sw, ay = my + mx * sw;
      if (!z.crawl && !z.pal.fast) sp *= .5 + .78 * Math.abs(Math.sin(z.walk * .5 + z.seed * 3));  // shambling: pushes on each step, drags in between
      const px = z.x, py = z.y;
      move(z, ax * sp * dt, ay * sp * dt);
      if (zWindowCheck(z, px, py) || zFenceCheck(z, px, py, mx, my)) continue;
      const moved = Math.hypot(z.x - px, z.y - py); z.walk += moved * 6.5; z.mv = clamp(moved / dt / 1.6, 0, 1);
      const ta = Math.atan2(my, mx);
      z.face += Math.atan2(Math.sin(ta - z.face), Math.cos(ta - z.face)) * Math.min(1, dt * 6);
    }
  }
  // расталкивание мертвецов: сетка по клеткам вместо перебора всех пар (190 мертвецов = 18 тыс. пар за кадр)
  if (sepNext.length < zs.length) sepNext = new Int32Array(zs.length * 2);
  sepHead.fill(-1);
  for (let i = 0; i < zs.length; i++) { const c = sepCell(zs[i]); sepNext[i] = sepHead[c]; sepHead[c] = i; }
  for (let i = 0; i < zs.length; i++) {
    const a = zs[i], cx = clamp(Math.floor(a.x), 0, MW - 1), cy = clamp(Math.floor(a.y), 0, MH - 1);
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const nx = cx + ox, ny = cy + oy; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
      for (let j = sepHead[ny * MW + nx]; j >= 0; j = sepNext[j]) {
        if (j <= i) continue;
        const b = zs[j], dx = b.x - a.x, dy = b.y - a.y;
        if (Math.abs(dx) > .6 || Math.abs(dy) > .6) continue;
        const d = Math.hypot(dx, dy);
        if (d < .5 && d > 1e-4) { const p = (.5 - d) * .5, ux = dx / d * p, uy = dy / d * p; move(a, -ux, -uy); move(b, ux, uy); }
      }
    }
    const dx = a.x - P.x, dy = a.y - P.y, d = Math.hypot(dx, dy);
    if (d < .52 && d > 1e-4) { const p = .52 - d; move(a, dx / d * p, dy / d * p); }
  }
  if (P.sleep) {
    if (P.en >= 99.5) wake('Ты выспался');
    else if (zs.some(z => z.state === 'chase' && Math.hypot(z.x - P.x, z.y - P.y) < 8)) wake('Ты проснулся: рядом мертвецы!');
    else if (P.hyd < 8 || P.sat < 8) wake('Ты проснулся от голода и жажды');
  }
  spawnTimer += gm;
  const cap = Math.round(Math.min(100, 48 + Math.floor((gameMin - startMin) / 1440) * 12 + (L < .5 ? 10 : 0)) * DIFF[world.diff].z);
  if (spawnTimer > 14) { spawnTimer = 0; const n = L < .5 ? 3 : 1; for (let i = 0; i < n && zs.length < cap; i++) spawnZombie(14, false); }
  { const la = P.car ? .45 : 0, tx = P.x + (P.car ? Math.cos(P.car.ang) * P.car.v * la : 0), ty = P.y + (P.car ? Math.sin(P.car.ang) * P.car.v * la : 0); camX += (tx - camX) * Math.min(1, dt * (P.car ? 4 : 8)); camY += (ty - camY) * Math.min(1, dt * (P.car ? 4 : 8)); }
  shake = Math.max(0, shake - dt);
  if (P.hp <= 0) die();
}
