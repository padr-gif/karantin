// ================= армейская колонна: цель на поздние дни =================
// С пятого дня где-то в районе, в стороне от героя, появляется армейский ящик разбитой колонны: оружие, патроны,
// пайки, аптечка. Место видно на карте (как сброшенный груз). Ящик стерегут мертвецы в военной форме — они
// появляются, когда герой подходит, и с каждым разом их больше. Обыскал ящик — через пять дней придёт следующая колонна.
// Ящик — обычный «груз» (airdrops): сохраняется вместе с районом, рисуется и обыскивается как он.
{
  const DAY = 1440, FIRST = 4, GAP = 5;
  const distKey = () => (world.dx || 0) + ',' + (world.dy || 0);
  const LOOT = ['mre', 'mre', 'medkit', 'vest', 'canteen', 'antibio', 'bandage', 'battery', 'flashlight', 'energy', 'milB', 'milP', 'milJ', 'whetstone', 'flare'].filter(id => ITEMS[id]);
  function loot(n) {
    const out = [];
    const gun = n % 2 ? 'shotgun' : 'pistol', ammo = gun === 'shotgun' ? 'shells' : 'ammo9';
    if (ITEMS[gun]) out.push(mkItem(gun));
    if (ITEMS[ammo]) { out.push(mkItem(ammo)); out.push(mkItem(ammo)); }
    if (ITEMS.machete && n % 3 === 2) out.push(mkItem('machete'));
    for (let k = ri(5, 7); k > 0; k--) out.push(mkItem(pick(LOOT)));
    return out;
  }
  function place() {
    const C = world.cv;
    for (let t = 0; t < 400; t++) {
      const a = rng() * 6.283, r = 42 + rng() * 40, x = Math.floor(P.x + Math.cos(a) * r), y = Math.floor(P.y + Math.sin(a) * r), i = y * MW + x;
      if (!inMap(x, y, 3) || !insideFence(x, y) || hAt[i] || furn[i] || propAt[i] || vis[i] || !tileFree(x, y)) continue;
      if (map[i] !== GRASS && map[i] !== ROAD && map[i] !== WALK) continue;
      if (airdrops.some(d => Math.hypot(d.tx - x, d.ty - y) < 6)) continue;
      const d = {x:x + .5, y:y + .5, z:0, landed:false, tx:x, ty:y, items:loot(C.n), searched:0};
      airdrops.push(d); landDrop(d);
      if (!d.f) { airdrops.pop(); continue; }
      d.f.searched = false;
      C.x = x; C.y = y; C.on = 1; C.sp = 0; C.dk = distKey();
      eventBanner('Армейская колонна', 'Утром в городе стреляли, потом стихло. Колонна с грузом не дошла до блокпоста: ящик остался у дороги, место отмечено на карте. Солдаты там же — уже не люди.', '', 'i-star');
      logEv('Армейская колонна не дошла. Ящик отмечен на карте');
      return true;
    }
    return false;
  }
  function guards() {
    const C = world.cv, K = (DIFF[world.diff] || DIFF.normal).z || 1;
    const n = Math.round(Math.min(16, 6 + C.n * 2) * K);
    let made = 0;
    for (let t = 0; t < 500 && made < n; t++) {
      const a = rng() * 6.283, r = 1.4 + rng() * 4.5, x = C.x + .5 + Math.cos(a) * r, y = C.y + .5 + Math.sin(a) * r, i = Math.floor(y) * MW + Math.floor(x);
      if (!inMap(Math.floor(x), Math.floor(y), 2) || navBlocked(Math.floor(x), Math.floor(y)) || vis[i] || zs.some(q => Math.hypot(q.x - x, q.y - y) < .9)) continue;
      const z = mkZombie(x, y, {pi:13, b:rng() < .25 ? 'h' : 'm', blood:ri(0, 2)}, 72, .68);
      if (z) { zType(z); z.lc = true; made++; }
    }
    C.sp = 1;
  }
  let acc = 0;
  onUpdate(dt => {
    if (!P || mode !== 'play' || paused || (typeof TUT !== 'undefined' && TUT.on)) return;
    acc += dt; if (acc < 1.5) return; acc = 0;
    const C = world.cv || (world.cv = {n:0, on:0, next:startMin + FIRST * DAY + 60});
    if (!C.on) { if (gameMin >= C.next && !P.sleep && !place()) C.next = gameMin + 120; return; }
    if (C.dk !== distKey()) return;                                           // ящик остался в другом районе — ждёт там
    const d = airdrops.find(a => a.tx === C.x && a.ty === C.y);
    if (!d || !d.f) { C.on = 0; C.next = gameMin + 2 * DAY; return; }
    if (!C.sp && Math.hypot(P.x - d.x, P.y - d.y) < 24) guards();
    if (d.f.searched) {
      C.on = 0; C.n++; C.next = gameMin + GAP * DAY; stat('convoy');
      logEv('Вскрыл армейский ящик колонны'); toast('Армейский ящик твой. Такие колонны ещё будут — и стеречь их будут сильнее');
    }
  });
  onStartNew(() => { world.cv = null; });
  onSave(d => { d.xCv = world.cv || null; });
  onLoad(d => { world.cv = (d && d.xCv) || null; });
}
