// ================= climate, clothing, dirty water, storms, hordes =================
Object.assign(ITEMS, {
  jacket:{name:'Тёплая куртка', sh:'Куртка', kind:'cloth', slot:'torso', ins:7, col:[70, 84, 60], verb:'Надеть'},
  sweater:{name:'Свитер', kind:'cloth', slot:'torso', ins:4, col:[150, 50, 46], verb:'Надеть'},
  raincoat:{name:'Дождевик', kind:'cloth', slot:'torso', ins:2, dry:true, col:[220, 186, 40], verb:'Надеть'},
  hat:{name:'Вязаная шапка', sh:'Шапка', kind:'cloth', slot:'head', ins:2, col:[60, 80, 130], verb:'Надеть'},
  waterD:{name:'Сырая вода', kind:'drink', hyd:40, leaves:'bottle', dirty:true, verb:'Выпить'},
});
Object.assign(DESC, {
  jacket:'Тёплая куртка. Сильно греет в холодные ночи.', sweater:'Шерстяной свитер. Неплохо держит тепло.',
  raincoat:'Жёлтый дождевик. Почти не греет, зато под ним не промокнешь.', hat:'Вязаная шапка. Немного тепла для головы.',
  waterD:'Дождевая вода из бочки. Пить можно, но рискуешь отравиться. Лучше вскипятить в кастрюле на огне.',
});
ICONA.waterD = 'waterD';
{
  const add = (k, ...ids) => CONT[k].loot.push(...ids);
  add('wardrobe', 'jacket', 'sweater', 'hat', 'raincoat', 'sweater'); add('dresser', 'sweater', 'hat'); add('hanger', 'jacket', 'raincoat', 'hat');
  add('locker', 'jacket'); add('armybox', 'jacket'); add('car', 'raincoat'); add('crate', 'raincoat');
}
COOK.push({id:'water', raw:'waterD', tool:'pot', toolName:'кастрюля', water:false, boil:true});
// ---- temperature ----
function airTemp(x, y) {
  const h = (gameMin % 1440) / 60, day = Math.floor(gameMin / 1440);
  let t = 10 + 6 * Math.sin((h - 9) / 24 * 6.283) - seasonDrop(day) - rain * 2;
  if (insideHouse(x, y)) t += poweredAt(x, y) ? 12 : 8;
  for (const f of fires) if (!f.out && f.t > 0) { const d = Math.hypot(f.x - x, f.y - y); if (d < 3.2) t += 16 * (1 - d / 3.2); }
  if (P.car && P.car.engine) t += 6;
  return t;
}
// тепло одежды: бельё, всё надетое (с учётом износа и утепления), босиком холоднее, в кровати теплее
function insulation() {
  let s = 1;
  for (const c of worn()) s += clothIns(c);
  if (barefoot()) s -= 1;
  if (P.sleep && (!P.bed || P.bed.type === 'bed' || P.bed.type === 'sofa')) s += 6;
  return Math.round(s);
}
// холод и сырость: дождь, укрытие, огонь, одежда; черты «мерзляк»/«закалённый»; сапоги — ноги сухие
function updateClimate(gm) {
  const w0 = P.wet || 0, c0 = P.cold || 0;
  P.cold = P.cold || 0; P.wet = P.wet || 0;
  const inside = insideHouse(P.x, P.y) || !!P.car, dryCoat = P.cloth && P.cloth.torso && ITEMS[P.cloth.torso.id].dry;
  let nearFire = false; for (const f of fires) if (!f.out && f.t > 0 && Math.hypot(f.x - P.x, f.y - P.y) < 3) nearFire = true;
  if (!inside && rain > .5) P.wet = Math.min(100, P.wet + gm * (dryCoat ? .15 : 1.3) * (P.inv.some(i => i.id === 'umbrella') && !P.running ? .33 : 1));
  else P.wet = Math.max(0, P.wet - gm * (nearFire ? 2.5 : inside ? .6 : .25));
  const feels = airTemp(P.x, P.y) + insulation() * 1.6 - P.wet * .12;
  if (feels < 16) P.cold = Math.min(100, P.cold + gm * (16 - feels) * .035);
  else P.cold = Math.max(0, P.cold - gm * (feels - 15) * .06);
  if (P.cold > 85) { P.hp -= gm * .06; lastCause = 'Переохлаждение'; }
  if (P.cold > 55) P.en -= gm * .05;
  const dc = (P.cold || 0) - c0; if (dc > 0) P.cold = clamp(c0 + dc * heroK('cold') * (hasTr('cold') ? 1.45 : 1) * (hasTr('hardy') ? .7 : 1), 0, 100);
  const f = P.cloth && P.cloth.feet; if (f && ITEMS[f.id].dry && (P.wet || 0) > w0) P.wet = w0 + (P.wet - w0) * .7;
}
// надеть / снять одежду (снятое — в инвентарь; вещи раскладываются по карманам и рюкзаку заново)
function wearCloth(k) {
  const it = P.inv[k], d = ITEMS[it.id]; P.cloth = P.cloth || {};
  const old = P.cloth[d.slot];
  P.inv.splice(k, 1); if (old) { delete old.bp; P.inv.push(old); } P.cloth[d.slot] = it; delete it.bp;
  SFX.equip(); toast((d.slot === 'feet' ? 'Обул: ' : 'Надел: ') + d.name.toLowerCase()); invPlace(); renderInv(); updateHud();
}
function takeOffCloth(slot) {
  const it = P.cloth && P.cloth[slot]; if (!it) return;
  P.inv.push(it); P.cloth[slot] = null; SFX.rustle(); invPlace(); renderInv(); updateHud();
}
// ---- thunderstorms ----
let flash = 0;
function updateStorm(dt) {
  if (rain < .6 || !world.storm) return;
  world.thT = (world.thT == null ? 6 : world.thT) - dt;
  if (world.thT <= 0) {
    world.thT = 7 + Math.random() * 14; flash = 1;
    const a = Math.random() * 6.283, r = 8 + Math.random() * 20, x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
    setTimeout(() => SFX.thunder(Math.max(.25, 1 - r / 30)), 300 + r * 60);
    noise(x, y, 12);
  }
}
// ---- hordes on the move ----
function scheduleHorde(from) { const k = world.hordeK != null ? world.hordeK : 1; world.hordeAt = k > 0 ? from + (1440 * ri(2, 3) + ri(-300, 300)) / k : 1e12; }   // hordeK — орды реже/чаще, 0 — нет
// орда: толпа с дальнего края идёт к герою (или к шумовой приманке)
function startHorde() {
  const before = new Set(zs);
  scheduleHorde(gameMin);
  const sides = [[FEN + 3, ri(CITY0, CITY1)], [MW - FEN - 4, ri(CITY0, CITY1)], [ri(CITY0, CITY1), FEN + 3], [ri(CITY0, CITY1), MH - FEN - 4]];
  sides.sort((a, b) => Math.hypot(b[0] - P.x, b[1] - P.y) - Math.hypot(a[0] - P.x, a[1] - P.y));
  const [sx, sy] = sides[0], tx = P.x + (rng() - .5) * 10, ty = P.y + (rng() - .5) * 10;
  let n = 0;
  for (let k = 0; k < 140 && n < 24; k++) {
    const x = sx + (rng() - .5) * 8, y = sy + (rng() - .5) * 8;
    if (navBlocked(Math.floor(x), Math.floor(y)) || vis[Math.floor(y) * MW + Math.floor(x)]) continue;
    const z = zType(mkZombie(x, y, zPal(), ri(48, 72), (.82 + rng() * .3) * DIFF[world.diff].spd));
    z.state = 'investigate'; z.tx = tx; z.ty = ty; z.it = -200; n++;
  }
  const dir = Math.abs(sx - P.x) > Math.abs(sy - P.y) ? (sx < P.x ? 'запада' : 'востока') : (sy < P.y ? 'севера' : 'юга');
  toast('Издалека доносится гул сотен ног: орда идёт с ' + dir);
  P.hordeSurv = gameMin + 720;
  const fresh = zs.filter(z => !before.has(z)); for (const z of fresh) z.horde = true;
  const lu = lures.filter(p => !p.dead && p.ch > 0 && Math.hypot(p.cx - P.x, p.cy - P.y) > 7 && Math.hypot(p.cx - P.x, p.cy - P.y) < 50).sort((a, b) => Math.hypot(a.cx - P.x, a.cy - P.y) - Math.hypot(b.cx - P.x, b.cy - P.y))[0];
  if (lu) { lu.horde = true; for (const z of fresh) { z.tx = lu.cx + (rng() - .5) * 5; z.ty = lu.cy + (rng() - .5) * 5; } toast('Орда учуяла шумовую приманку и идёт к ней'); }
  logEv('Через город пошла орда');
}
function updateHorde() { if (world.hordeAt != null && gameMin >= world.hordeAt) startHorde(); }
