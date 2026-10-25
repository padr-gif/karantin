// ================= v19: no reaching through walls, seasonal foraging, winter prep =================
// ---- reach check: you can only use what you could actually touch ----
function wallHit(x, y) {
  const tx = Math.floor(x), ty = Math.floor(y); if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
  const i = ty * MW + tx, t = map[i], lx = x - tx, ly = y - ty, m = .03;
  if (t === WALL) { for (const r of wpC[i]) if (lx > r[0] - m && lx < r[2] + m && ly > r[1] - m && ly < r[3] + m) return true; return false; }
  if (t === WIN || (t === DOOR && openingBlocks(i))) return alongX(tx, ty) ? Math.abs(ly - .5) < HWC + m : Math.abs(lx - .5) < HWC + m;
  return false;
}
function reachOK(tx, ty) {
  const d = Math.hypot(tx - P.x, ty - P.y), n = Math.max(2, Math.ceil(d / .05));
  for (let k = 1; k < n; k++) { const t = k / n; if (wallHit(P.x + (tx - P.x) * t, P.y + (ty - P.y) * t)) return false; }
  return true;
}
// ---- seasonal content ----
Object.assign(ITEMS, {
  berries:{name:'Ягоды', kind:'food', sat:8, hyd:5, rot:true, verb:'Съесть'},
  mushroom:{name:'Грибы', kind:'food', sat:8, rot:true, verb:'Съесть сырыми'},
  mushroomC:{name:'Жареные грибы', sh:'Грибы', kind:'food', sat:24, warm:true, verb:'Съесть'},
  sticks:{name:'Хворост', kind:'misc', info:'подкинуть в костёр: +60 минут огня'},
  parka:{name:'Зимний пуховик', sh:'Пуховик', kind:'cloth', slot:'torso', ins:10, col:[44, 70, 96], verb:'Надеть'},
  ushanka:{name:'Шапка-ушанка', sh:'Ушанка', kind:'cloth', slot:'head', ins:4, col:[96, 70, 50], verb:'Надеть'},
  jar:{name:'Стеклянная банка', sh:'Банка', kind:'misc', info:'для заготовок на зиму'},
  pickles:{name:'Соленья', kind:'food', sat:28, hyd:6, verb:'Открыть и съесть'},
  jerky:{name:'Вяленое мясо', sh:'Вяленое', kind:'food', sat:26, verb:'Съесть'},
});
ICONA.mushroomC = 'mushroom';
Object.assign(DESC, {
  berries:'Лесные ягоды с куста. Растут летом и осенью, быстро портятся.',
  mushroom:'Грибы из-под деревьев. Сырыми есть рискованно: без опыта огородника легко отравиться. Лучше пожарить на сковороде.',
  mushroomC:'Грибы, жаренные на сковороде. Сытно и безопасно.',
  sticks:'Сухие ветки. Подкинь в костёр, чтобы он горел дольше.',
  parka:'Толстый зимний пуховик. В нём можно пережить мороз даже на улице.',
  ushanka:'Тёплая шапка-ушанка. Без неё зимой уши отмёрзнут.',
  jar:'Пустая стеклянная банка с крышкой. В неё можно закатать овощи на зиму.',
  pickles:'Овощи, закатанные в банку. Не портятся месяцами: лучшая еда на зиму.',
  jerky:'Мясо, провяленное над костром. Не портится.',
});
{ const add = (k, ...ids) => CONT[k] && CONT[k].loot.push(...ids);
  add('wardrobe', 'parka', 'ushanka'); add('hanger', 'parka', 'ushanka'); add('dresser', 'ushanka'); add('locker', 'parka');
  add('cabinet', 'jar', 'jar'); add('counter', 'jar'); add('crate', 'jar', 'jar'); add('shelf', 'jar'); add('car', 'ushanka'); }
COOK.push({id:'mushroomC', raw:'mushroom', tool:'pan', toolName:'сковорода', water:false});
const monthNow = () => dateOf(gameMin).getMonth();
function forageAction(excl) {
  const m = monthNow(); world.bcd = world.bcd || {}; world.tcd = world.tcd || {};
  // berry bushes: June to October
  for (let k = 0; k < props.length; k++) {
    const p = props[k]; if (p.type !== 'bush' || Math.abs(p.cx - P.x) > 1.3 || Math.abs(p.cy - P.y) > 1.3) continue;
    if (Math.hypot(p.cx - P.x, p.cy - P.y) > 1.25 || !reachOK(p.cx, p.cy)) continue;
    const tk = 'bu' + k; if (excl && excl.has(tk)) continue;
    if (m < 5 || m > 9 || (world.bcd[k] || 0) > gameMin) continue;
    return {kind:'forage', what:'berries', key:k, label:'Собрать ягоды', f:{type:'bush', cx:p.cx, cy:p.cy}, tk};
  }
  // trees: brushwood all year, mushrooms from August to October
  const cx = Math.floor(P.x), cy = Math.floor(P.y);
  for (const [ox, oy] of [[0, 0], ...D8]) {
    const x = cx + ox, y = cy + oy, i = y * MW + x; if (get(x, y) !== TREE) continue;
    if (Math.hypot(x + .5 - P.x, y + .5 - P.y) > 1.3) continue;
    if (m >= 7 && m <= 9 && !(excl && excl.has('mu' + i)) && (world.tcd['m' + i] || 0) <= gameMin) return {kind:'forage', what:'mushroom', key:'m' + i, label:'Поискать грибы', f:{type:'tree', cx:x + .5, cy:y + .5}, tk:'mu' + i};
    if (!(excl && excl.has('st' + i)) && (world.tcd['s' + i] || 0) <= gameMin) return {kind:'forage', what:'sticks', key:'s' + i, label:'Наломать хворост', f:{type:'tree', cx:x + .5, cy:y + .5}, tk:'st' + i};
  }
  return null;
}
function doForage(a) { P.act = {kind:'forage', t:0, dur:a.what === 'mushroom' ? 2.6 : 1.6, a}; SFX.rustle(); }
function finishForage(act) {
  const a = act.a, give = (id, n) => { let got = 0; for (let q = 0; q < n; q++) { const it = mkItem(id); if (ITEMS[id].rot) it.rot = gameMin + 2160; if (!invFull()) { P.inv.push(it); got++; } else addToPile(P.x, P.y, it); } return got; };
  if (a.what === 'berries') { const n = 2 + ri(0, 2) + Math.floor(skillLv('farm') / 2); give('berries', n); world.bcd[a.key] = gameMin + 4 * 1440; toast('Собрано ягод: ' + n); addXp('farm', 1); ach('forage'); }
  else if (a.what === 'mushroom') { world.tcd[a.key] = gameMin + 2 * 1440; if (rng() < .55 + .08 * skillLv('farm')) { const n = 1 + ri(0, 1); give('mushroom', n); toast('Нашёл грибы: ' + n); addXp('farm', 1); ach('forage'); } else toast('Грибов под этим деревом нет'); }
  else { world.tcd[a.key] = gameMin + 1440; const n = hasTool('axe') || hasTool('hatchet') ? 4 : 2; give('sticks', n); toast('Наломал хвороста: ' + n); }
  renderInv(); updateHud();
}
// crops sleep in the cold and die in frost
const updateBeds0 = updateBeds;
updateBeds = function (gm) {
  const t = outsideTemp();
  if (t < -3) { for (const b of beds) if (b.crop && b.g < 1) { b.crop = null; b.g = 0; if (Math.hypot(b.cx - P.x, b.cy - P.y) < 14) toast('Заморозки погубили всходы на грядке'); } return; }
  if (t < 4) { for (const b of beds) if (rain > .5) b.w = 1; return; }
  updateBeds0(gm);
};
// extra cooking cards: pickles, jerky, brushwood
function cookCard(title, parts, result, ok, dur, fn, note) {
  const b = btn('Приготовить', () => { closePanel(); P.act = {kind:'cookx', t:0, dur, fn}; SFX.sizzle(); }); b.disabled = !ok;
  return recipeCard(title, parts, result, [b], note);
}
function extraCookCards(src) {
  const out = [], heat = heatOk(src), pot = hasTool('pot'), water = waterOk();
  const veg = () => countItem('carrot') + countItem('cabbage') + countItem('potato');
  const heatPart = {id:src.type === 'fire' ? 'campfire' : src.type === 'burner' ? 'burner' : null, label:'Электричество', ok:heat};
  out.push(cookCard('Соленья (×2)', [{id:'jar', ok:countItem('jar') > 0}, {id:'carrot', label:'овощи', ok:veg() >= 2, badge:'2'}, {id:'pot', ok:pot}, {id:'water', ok:water}, heatPart], 'pickles', countItem('jar') > 0 && veg() >= 2 && pot && water && heat, 5, () => {
    if (!countItem('jar') || veg() < 2 || !heatOk(src)) { toast('Не вышло: чего-то не хватило'); return; }
    removeItem('jar'); let n = 0; for (const v of ['carrot', 'cabbage', 'potato']) while (n < 2 && countItem(v)) { removeItem(v); n++; }
    if (!nearTap()) { const w = P.inv.find(i => i.id === 'water'); if (w) w.id = 'bottle'; }
    P.inv.push(mkItem('pickles'), mkItem('pickles')); addXp('cook', 2); ach('canning'); toast('Закатал банку: соленья ×2. Не испортятся до весны');
  }, 'любые 2 овоща (морковь, капуста, картошка) и пустая банка · не портятся'));
  if (src.type === 'fire') {
    out.push(cookCard('Вяленое мясо', [{id:'meat', ok:countItem('meat') > 0}, {id:'campfire', ok:heat}], 'jerky', countItem('meat') > 0 && heat, 6, () => {
      if (!countItem('meat') || !heatOk(src)) { toast('Не вышло'); return; }
      removeItem('meat'); P.inv.push(mkItem('jerky')); addXp('cook', 1); toast('Мясо провялено над огнём. Теперь не испортится');
    }, 'сырое мясо над костром · не портится'));
    const bs = btn('Подкинуть', () => { removeItem('sticks'); src.t = Math.max(src.t, 0) + 60; src.out = false; SFX.fireUp(); renderPanel(); }); bs.disabled = !countItem('sticks');
    out.push(recipeCard('Подкинуть хворост', [{id:'sticks', ok:countItem('sticks') > 0, badge:'×' + countItem('sticks')}], 'campfire', [bs], '+60 минут горения'));
  }
  // заготовки: варенье, тушёнка, консервы, квашеная капуста, сушёные грибы
  { const heat = heatOk(src), pot = hasTool('pot'), water = waterOk(), jar = countItem('jar') > 0;
    const heatPart = {id:src.type === 'fire' ? 'campfire' : src.type === 'burner' ? 'burner' : null, label:'Электричество', ok:heat};
    const useWater = () => { if (!nearTap()) { const w = P.inv.find(i => i.id === 'water'); if (w) w.id = 'bottle'; } };
    const can = (title, ing, n, result, note) => out.push(cookCard(title, [{id:'jar', ok:jar}, {id:ing, ok:countItem(ing) >= n, badge:String(n)}, {id:'pot', ok:pot}, {id:'water', ok:water}, heatPart], result, jar && countItem(ing) >= n && pot && water && heat, 5, () => {
      if (!countItem('jar') || countItem(ing) < n || !heatOk(src) || !hasTool('pot')) { toast('Не вышло: чего-то не хватило'); return; }
      removeItem('jar'); for (let q = 0; q < n; q++) removeItem(ing); useWater();
      P.inv.push(mkItem(result)); addXp('cook', 2); ach('canning'); toast('Закатано: ' + ITEMS[result].name.toLowerCase() + '. Не испортится');
    }, note));
    can('Варенье', 'berries', 3, 'jam', '3 горсти ягод и пустая банка · не портится, поднимает настроение');
    can('Домашняя тушёнка', 'meat', 2, 'stewH', '2 куска сырого мяса и пустая банка · не портится');
    can('Рыбные консервы', 'fish', 2, 'fishJ', '2 сырые рыбы и пустая банка · не портится');
    out.push(cookCard('Квашеная капуста', [{id:'jar', ok:jar}, {id:'cabbage', ok:countItem('cabbage') > 0}], 'kraut', jar && countItem('cabbage') > 0, 3, () => {
      if (!countItem('jar') || !countItem('cabbage')) { toast('Не вышло'); return; }
      removeItem('jar'); removeItem('cabbage'); P.inv.push(mkItem('kraut')); addXp('cook', 1); ach('canning'); toast('Капуста заквашена в банке. Не испортится');
    }, 'кочан капусты и банка · огонь не нужен'));
    if (src.type === 'fire') out.push(cookCard('Сушёные грибы ×2', [{id:'mushroom', ok:countItem('mushroom') >= 2, badge:'2'}, {id:'campfire', ok:heat}], 'mushD', countItem('mushroom') >= 2 && heat, 5, () => {
      if (countItem('mushroom') < 2 || !heatOk(src)) { toast('Не вышло'); return; }
      removeItem('mushroom'); removeItem('mushroom'); P.inv.push(mkItem('mushD'), mkItem('mushD')); addXp('cook', 1); toast('Грибы высушены над огнём. Не испортятся');
    }, '2 сырых гриба над костром · безопасны и не портятся'));
  }
  return out;
}
