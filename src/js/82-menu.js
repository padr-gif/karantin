// ================= главное меню: живая сцена на движке игры =================
// Ночь, дождь, герой с фонарём у дома, вокруг бредут мертвецы, камера медленно проплывает вдоль улицы, изредка — молния.
// Мир меню одноразовый: «Новая игра» строит новый, «Продолжить» — из сохранения. menuTick вызывается из кадра (99-wiring).
let MS = null;
function menuScene() {
  if (!P) return;
  // место: улица у дома, вокруг открыто
  let best = null;
  for (const H of houses) {
    if (H.kind !== 'house') continue;
    const x = H.x + H.w / 2 + .5, y = H.y + H.h + 2.2;
    if (x < 30 || y < 30 || x > MW - 30 || y > MH - 30 || blocked(x, y, .3)) continue;
    let open = 0; for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; if (!blocked(x + Math.cos(a) * 4, y + Math.sin(a) * 4, .3)) open++; }
    if (!best || open > best.open) best = {x, y, open};
    if (open >= 15) break;
  }
  if (best) { P.x = best.x; P.y = best.y; }
  P.face = P.fd = -Math.PI * .75; P.moving = false; P.act = null; P.weapon = mkItem('bat'); P.sleep = false;
  const fl = mkItem('flashlight'); fl.on = true; fl.ch = 100; P.inv = [fl];
  gameMin = Math.floor(gameMin / 1440) * 1440 + 22 * 60 + 40; rain = rainTarget = .75; world.storm = true;
  zs.length = 0;
  for (let k = 0; k < 9; k++) {
    for (let t = 0; t < 20; t++) {
      const a = rng() * 6.283, r = 5 + rng() * 7, x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
      if (blocked(x, y, .3)) continue;
      const z = mkZombie(x, y, zPal(), 60, .6 + rng() * .3); z.crawl = k === 4; z.state = 'wander'; z.mt = {x, y, t:0}; break;
    }
  }
  computeVis(); for (let i = 0; i < NT; i++) seen[i] = 1; fogFull = true; fogDirty = true;
  MS = {t:0, flash:6 + Math.random() * 6, look:3};
  camX = P.x; camY = P.y;
}
function menuTick(dt) {
  if (!MS) { menuDrift += dt * .2; camX = P.x + Math.cos(menuDrift) * 4; camY = P.y + Math.sin(menuDrift * .7) * 3; return; }
  MS.t += dt;
  // камера: медленный проезд вдоль улицы туда и обратно
  const s = Math.sin(MS.t * .05);
  camX = P.x + s * 5 + 1.5; camY = P.y - s * 2.5 - 1.5;
  // мертвецы бредут: к точке недалеко от героя, постоят, и дальше
  for (const z of zs) {
    const m = z.mt || (z.mt = {x:z.x, y:z.y, t:0});
    m.t -= dt;
    if (m.t <= 0) { const a = Math.random() * 6.283, r = 3 + Math.random() * 7; m.x = P.x + Math.cos(a) * r; m.y = P.y + Math.sin(a) * r; m.t = 6 + Math.random() * 8; }
    const dx = m.x - z.x, dy = m.y - z.y, d = Math.hypot(dx, dy);
    if (d > .4) {
      const sp = (z.crawl ? .12 : .32) * z.spd * (.5 + .78 * Math.abs(Math.sin(z.walk * .5 + z.seed * 3))), px = z.x, py = z.y;
      move(z, dx / d * sp * dt, dy / d * sp * dt);
      const moved = Math.hypot(z.x - px, z.y - py); z.walk += moved * 6.5; z.mv = moved > .0005 ? 1 : 0;
      if (moved < .0005) m.t = 0;
      const ta = Math.atan2(dy, dx); z.face += Math.atan2(Math.sin(ta - z.face), Math.cos(ta - z.face)) * Math.min(1, dt * 3);
    } else z.mv = 0;
  }
  // герой оглядывается
  MS.look -= dt; if (MS.look <= 0) { MS.look = 3 + Math.random() * 4; MS.face = -Math.PI * .75 + (Math.random() - .5) * 2.2; }
  if (MS.face != null) P.fd = P.face = P.face + Math.atan2(Math.sin(MS.face - P.face), Math.cos(MS.face - P.face)) * Math.min(1, dt * 2);
  // молния
  MS.flash -= dt;
  if (MS.flash <= 0) { MS.flash = 7 + Math.random() * 10; const f = $('mmFlash'); if (f && !reduceMotion) { f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); } }
  updateParts(dt);
  if (frameNo % 30 === 0) computeVis();
}
// бегущие строки: записи из найденных дневников (людей нет — только то, что они оставили)
const MM_LINES = [
  '12 сентября. Жар 41, бред. Все трое — с вахты с северного месторождения.',
  '13 сентября. Пациент Г. умер в 14:10. В 15:30 санитар сказал, что он сел на каталке.',
  '15 сентября. Ночью перекрыли все выезды. По радио одно и то же: «Оставайтесь дома».',
  'Образцы из мерзлоты дали рост при плюс четырёх. Нам сказали: это не наша забота.',
  'Они не мертвы в том смысле, в каком мы думаем. Мозг отвечает на звук и свет.',
  'Свет обещают держать ещё неделю, воду — чуть дольше. Потом город останется один.',
  'Если читаешь это — не открывай дверь на стук. Это не соседи.',
  'День 9. Заколотил окна на первом этаже. Слышу их каждую ночь.',
];
{ let i = 0;
  const tick = () => { const el = $('mmTicker'); if (!el) return; if (mode === 'menu' && !$('menu').hidden) { el.classList.remove('in'); setTimeout(() => { el.textContent = MM_LINES[i++ % MM_LINES.length]; el.classList.add('in'); }, 700); } };
  setInterval(tick, 7000); setTimeout(tick, 1200);
}
// новый мир (новая игра, загрузка) — сцена меню больше не управляет ни мертвецами, ни героем
onNewWorld(() => { MS = null; });
