// ================= v43: выключатели света в комнатах, сбор присев, перелезание как раньше, удар двумя руками =================

// ---- анимации героя ----
const TWO_H = new Set(['bat', 'nailbat', 'pipe', 'axe', 'crowbar', 'sledge', 'shovel', 'golf', 'spear']);   // большое — обеими руками
{ const pa = playerAnim;
  playerAnim = function (pAtk) {
    if (heroMale() && mode !== 'dead') {
      const w = P.weapon && ITEMS[P.weapon.id];
      if (pAtk >= 0 && w && !w.gun && TWO_H.has(P.weapon.id)) {
        const an = P.moving ? 'attack2hrun' : 'attack2h', n = AN('p', an);
        if (n > 1) return [an, Math.min(n - 1, Math.floor(pAtk * n))];
      }
      const A = P.act;
      if (A && A.kind === 'forage' && A.a && (A.a.what === 'berries' || A.a.what === 'mushroom') && AN('p', 'searchlow') > 1) return pmLoop('searchlow');   // присел и копается
    }
    return pa(pAtk);
  };
}
// перелезть через окно: присесть на подоконник, перебраться в глубоком приседе, встать — как было
{ const va = vaultAnim;
  vaultAnim = function () {
    if (!heroMale() || AN('p', 'vault') < 2) return va();
    const A = P.act, k = Math.min(1, A.t / A.dur), np = AN('p', 'pickup');
    if (k < .35) return ['pickup', Math.min(np - 1, Math.floor(k / .35 * np))];
    if (k < .75) { const n = AN('p', 'vault'); return ['vault', Math.floor((k - .35) / .4 * n * 1.5) % n]; }
    return ['pickup', Math.max(0, np - 1 - Math.floor((k - .75) / .25 * np))];
  };
}

// ---- выключатели: в каждой комнате у двери на стене; свет горит, пока есть электричество и выключатель «вкл» ----
function roomAtXY(x, y) {
  const hi = hAt[Math.floor(y) * MW + Math.floor(x)]; if (!hi) return null;
  const Hs = houses[hi - 1]; if (!Hs || !Hs.rooms) return null;
  const tx = Math.floor(x), ty = Math.floor(y);
  return Hs.rooms.find(r => tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1) || null;
}
function roomLitAt(x, y) { const r = roomAtXY(x, y); return !r || !r.off; }
const SWT = new Map();                                                     // клетка стены → комната
let swBuilt = null;
function buildSwitches() {
  if (swBuilt === map) return; swBuilt = map; SWT.clear();
  for (const Hs of houses) for (const r of Hs.rooms || []) {
    r.sw = null; let best = null;
    const doors = [];
    for (let x = r.x0 - 1; x <= r.x1 + 1; x++) for (const y of [r.y0 - 1, r.y1 + 1]) if (map[y * MW + x] === DOOR) doors.push([x, y]);
    for (let y = r.y0 - 1; y <= r.y1 + 1; y++) for (const x of [r.x0 - 1, r.x1 + 1]) if (map[y * MW + x] === DOOR) doors.push([x, y]);
    const cand = [];
    for (let x = r.x0; x <= r.x1; x++) cand.push([x, r.y0 - 1, 'y']);            // задняя стена (её видно изнутри)
    for (let y = r.y0; y <= r.y1; y++) cand.push([r.x0 - 1, y, 'x']);            // левая стена
    for (const [x, y, ax] of cand) {
      const i = y * MW + x; if (map[i] !== WALL || !wpV[i] || SWT.has(i)) continue;
      const P_ = wpV[i], cov = p => ax === 'y' ? p[0] <= .5 && p[2] >= .5 : p[1] <= .5 && p[3] >= .5;
      const pc = P_.find(p => cov(p) && (ax === 'y' ? p[1] < .5 : p[0] < .5));
      if (!pc || P_.some(p => p !== pc && cov(p) && (ax === 'y' ? p[1] >= .5 : p[0] >= .5))) continue;   // стык со стеной внутрь комнаты — не сюда
      const d = doors.length ? Math.min(...doors.map(([dx, dy]) => Math.hypot(dx - x, dy - y))) : 9;
      if (!best || d < best.d) best = {x, y, i, ax, d, f:ax === 'y' ? y + pc[3] : x + pc[2]};
    }
    if (best) { r.sw = best; SWT.set(best.i, r); }
  }
}
function swPoint(r) { const s = r.sw; return s.ax === 'y' ? [s.x + .5, s.f + .35] : [s.f + .35, s.y + .5]; }
{ const dw = drawWallTile;
  drawWallTile = function (x, y, i, cut) {
    dw(x, y, i, cut);
    const r = SWT.get(i); if (!r || !r.sw || map[i] !== WALL) return;
    const s = r.sw, top = cut ? U * .32 : WH, zc = cut ? top * .55 : WH * .42, hz = U * .1, hw = .1, k = .012;
    const q = (u0, u1, z0, z1, fill) => s.ax === 'y'
      ? poly4(x + u0, s.f + k, z0, x + u1, s.f + k, z0, x + u1, s.f + k, z1, x + u0, s.f + k, z1, fill)
      : poly4(s.f + k, y + u0, z0, s.f + k, y + u1, z0, s.f + k, y + u1, z1, s.f + k, y + u0, z1, fill);
    q(.5 - hw - .012, .5 + hw + .012, zc - hz - 1, zc + hz + 1, 'rgba(30,26,22,.75)');
    q(.5 - hw, .5 + hw, zc - hz, zc + hz, '#ddd6c6');
    q(.5 - hw * .45, .5 + hw * .45, r.off ? zc - hz * .7 : zc + hz * .05, r.off ? zc - hz * .05 : zc + hz * .7, '#8f877a');   // клавиша: вверх — вкл
  };
  const wk = wallKey;
  wallKey = function (x, y, i, cut) { buildSwitches(); const k = wk(x, y, i, cut); const r = SWT.get(i); return r ? k + (r.off ? '|s0' : '|s1') : k; };
}
// подсветка дома: только комнаты, где свет включён
function litHousePoly(Hs) {
  const poly = (x0, y0, x1, y1) => {
    lx.beginPath(); lx.moveTo(SX(x0, y0) / 2, SY(x0, y0, 0) / 2); lx.lineTo(SX(x1, y0) / 2, SY(x1, y0, 0) / 2);
    lx.lineTo(SX(x1, y1) / 2, SY(x1, y1, 0) / 2); lx.lineTo(SX(x0, y1) / 2, SY(x0, y1, 0) / 2); lx.closePath(); lx.fill();
  };
  lx.fillStyle = 'rgba(0,0,0,.5)';
  if (!Hs.rooms || !Hs.rooms.length) { poly(Hs.ix0, Hs.iy0, Hs.ix1, Hs.iy1); return; }
  if (Hs.rooms.every(r => !r.off)) { poly(Hs.ix0, Hs.iy0, Hs.ix1, Hs.iy1); return; }
  for (const r of Hs.rooms) if (!r.off) poly(r.x0, r.y0, r.x1 + 1, r.y1 + 1);
}
// действие у выключателя
function nearSwitch() {
  if (mode !== 'play' || !P || P.car) return null;
  buildSwitches();
  const r = roomAtXY(P.x, P.y); if (!r || !r.sw) return null;
  const [sx, sy] = swPoint(r); return Math.hypot(sx - P.x, sy - P.y) < 1.8 ? r : null;
}
{ addActions(out => { const r = nearSwitch();
    if (r) out.push({kind:'lightsw', label:r.off ? 'Включить свет' : 'Выключить свет', r, tk:'ls' + r.sw.i});
});
  defAction('lightsw', {run:a0 => {
    if (mode !== 'play' || paused || panel || P.sleep) return;
    $('actMenu').hidden = true;
    const r = a0.r; r.off = !r.off; clearCaches();
    smp('handle', .35, 1.5);
    const [sx, sy] = swPoint(r); P.face = P.fd = Math.atan2(sy - P.y, sx - P.x);
    if (!poweredAt(P.x, P.y)) toast('Щёлк. Электричества нет — свет не загорится');
    else toast(r.off ? 'Свет в комнате выключен' : 'Свет включён');
    updateHud();
}});
  defAction('lightsw', {name:a => 'Выключатель'});
  defAction('lightsw', {icon:a => 'i-light'});
}
// сохранение: какие комнаты выключены
{ onSave(d => { const off = [];
    houses.forEach((Hs, h) => (Hs.rooms || []).forEach((r, k) => { if (r.off) off.push([h, k]); }));
    d.x43 = {off};
});
  onLoad((d) => { swBuilt = null;
    for (const [h, k] of (d && d.x43 && d.x43.off) || []) { const r = houses[h] && houses[h].rooms && houses[h].rooms[k]; if (r) r.off = true; }
    clearCaches();
});
  onStartNew(() => { swBuilt = null;
});
}

// ---- закреплённый джойстик: всегда на одном месте (его можно передвинуть в настройке кнопок) ----
SETTINGS_DEF.joyFix = false;
if (settings.joyFix == null) settings.joyFix = false;
function joyHome() {
  const b = (settings.btn || {}).stick || {x:0, y:0};
  return [Math.max(70, 118 + (b.x || 0)), Math.min(innerHeight - 70, innerHeight - 112 + (b.y || 0))];
}
cv.addEventListener('pointerdown', e => {
  if (!settings.joyFix || e.pointerType === 'mouse' || joy.id !== e.pointerId) return;
  const [hx, hy] = joyHome();
  if (Math.hypot(e.clientX - hx, e.clientY - hy) > 105) {                  // не по джойстику — это тап по миру
    joy.id = null; joy.x = joy.y = 0; if (mode === 'play' && !paused) tapWorld(e.clientX, e.clientY); return;
  }
  joy.ox = hx; joy.oy = hy;
  let dx = e.clientX - hx, dy = e.clientY - hy; const l = Math.hypot(dx, dy), m = 55; if (l > m) { dx = dx / l * m; dy = dy / l * m; }
  joy.x = dx / m; joy.y = dy / m; $('knob').style.transform = `translate(${dx}px,${dy}px)`;
});
setInterval(() => {
  if (!settings.joyFix) return;
  const st = $('stick'), show = (mode === 'play' && !paused && !panel && P && !P.sleep && !P.car) || (typeof CTLE !== 'undefined' && CTLE);
  const [hx, hy] = joyHome(); st.style.left = hx + 'px'; st.style.top = hy + 'px';
  st.hidden = !show; st.classList.add('fixed');
  if (joy.id === null) $('knob').style.transform = '';
}, 120);
{ const os = openSettings;
  openSettings = function (from) {
    os(from);
    const list = document.querySelector('#settings .setlist'); if (!list || $('sJoy')) return;
    const row = document.createElement('div'); row.className = 'set';
    row.innerHTML = '<div><b>Джойстик</b><small>Закреплённый всегда стоит на одном месте слева внизу</small></div><div class="seg" id="sJoy"></div>';
    const ctl = $('sCtl'); list.insertBefore(row, ctl ? ctl.closest('.set') : null);
    seg($('sJoy'), [[false, 'Где коснулся'], [true, 'Закреплён']], () => !!settings.joyFix, v => { settings.joyFix = v; saveSettings(); if (!v) { $('stick').hidden = true; $('stick').classList.remove('fixed'); } });
  };
}
$('kills').title = 'Убито мертвецов'; $('kills').setAttribute('aria-label', 'Убито мертвецов');

// ---- выключенный свет — правда темно: окна не светятся, вокруг героя видно меньше (16-render) ----
function winLit(x, y) {
  let any = false;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const r = roomAtXY(x + dx + .5, y + dy + .5); if (r) { any = true; if (!r.off) return true; } }
  return !any;
}
// ---- свет в окнах ночью видно с улицы: мертвецы подтягиваются к горящим окнам (шторы спасают) ----
{ let tW = 0, told = false;
  onUpdate(dt => {
    if (mode !== 'play' || !P || paused) return;
    tW += dt; if (tW < 5) return; tW = 0;
    if (lightLevel() >= .5) return;
    let lure = false;
    for (const Hs of houses) {
      if (!Hs.rooms || Math.hypot((Hs.ix0 + Hs.ix1) / 2 - P.x, (Hs.iy0 + Hs.iy1) / 2 - P.y) > 30) continue;
      for (const r of Hs.rooms) {
        if (r.off || !poweredAt((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)) continue;
        for (let x = r.x0 - 1; x <= r.x1 + 1; x++) for (let y = r.y0 - 1; y <= r.y1 + 1; y++) {
          if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) continue;
          const i = y * MW + x; if (map[i] !== WIN) continue;
          const o = obs[i]; if (o && (o.cc || o.bhp > 0)) continue;           // задёрнуто или заколочено — не видно
          if (rng() < .3) { noise(x + .5, y + .5, 9); lure = true; }
        }
      }
    }
    if (lure && !told && zs.some(z => z.state === 'investigate' && Math.hypot(z.x - P.x, z.y - P.y) < 16)) {
      told = true; toast('Свет в окнах видно с улицы — мертвецы идут на него. Выключи свет или задёрни шторы');
    }
  });
}
