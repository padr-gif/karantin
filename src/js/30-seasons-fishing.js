// ================= calendar & seasons, foliage, ponds & fishing, achievements =================
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MSHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const dateOf = m => new Date(2026, 8, 15 + Math.floor(m / 1440) + ((typeof world !== 'undefined' && world.dayOff) || 0));
function dateStr(m, short) { const d = dateOf(m); return d.getDate() + ' ' + (short ? MSHORT : MONTHS)[d.getMonth()]; }
const seasonDrop = day => 3 - 13 * Math.cos(2 * Math.PI * (day + (world.dayOff || 0) - 313) / 365);
function seasonTint() {
  { const s = world.snow || 0; if (s > .25) return `rgba(232,238,248,${(Math.round((.12 + .2 * Math.min(1, s)) * 10) / 10).toFixed(1)})`; }   // снег
  const d = Math.floor(gameMin / 1440) + (world.dayOff || 0);
  const dy = ((d % 365) + 365) % 365; if (dy > 190) return null;
  const t1 = Math.max(0, Math.min(1, (dy - 4) / 18)), t2 = Math.max(0, Math.min(1, (dy - 24) / 16));
  if (t1 <= 0) return null;
  const r = Math.round(214 - 70 * t2), g = Math.round(152 - 60 * t2), b = Math.round(40 + 10 * t2);
  return `rgba(${r},${g},${b},${(.3 + .2 * t2) * t1})`;
}
function seasonName() { const m = dateOf(gameMin).getMonth(); return ['зима', 'зима', 'ранняя весна', 'весна', 'поздняя весна', 'лето', 'лето', 'конец лета', 'ранняя осень', 'золотая осень', 'поздняя осень', 'зима'][m]; }
// ---- fishing ----
Object.assign(ITEMS, {
  rod:{name:'Удочка', kind:'misc', info:'Подойди к пруду в парке и рыбачь'},
  fish:{name:'Сырая рыба', sh:'Рыба', kind:'food', sat:14, rot:true, raw:'fishC', rawRisk:true, verb:'Съесть сырой'},
  fishC:{name:'Жареная рыба', sh:'Жар. рыба', kind:'food', sat:42, rot:true, verb:'Съесть'},
});
Object.assign(DESC, {
  rod:'Складная удочка. В парках остались пруды — там ещё водится рыба.',
  fish:'Свежий карась. Пожарь на сковороде, сырым лучше не есть.', fishC:'Жареная рыба. Сытно и вкусно.',
});
COOK.push({id:'fishC', raw:'fish', tool:'pan', toolName:'сковорода', water:false});
{ const add = (k, ...ids) => CONT[k].loot.push(...ids); add('crate', 'rod', 'rod'); add('toolrack', 'rod'); add('car', 'rod'); add('hanger', 'rod'); }
function nearWater() { const x = Math.floor(P.x), y = Math.floor(P.y); for (const [ox, oy] of D8) if (get(x + ox, y + oy) === WATER) return true; return get(x, y) === WATER; }
function makePond(b) {
  const cx = (b.x0 + b.x1) / 2 + (rng() - .5) * 3, cy = (b.y0 + b.y1) / 2 + (rng() - .5) * 3, rx = 3.5 + rng() * 2.5, ry = 3 + rng() * 2.5;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const n = (hash(x * 3, y * 5) - .5) * .35;
    if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 < 1 + n && get(x, y) === GRASS) set(x, y, WATER);
  }
}
function drawWaterTile(x, y) {
  groundT(0);
  ctx.fillStyle = '#2f5d78'; ctx.fillRect(x, y, 1.01, 1.01);
  const h = hash(x * 7, y * 11);
  ctx.fillStyle = 'rgba(160,200,220,.18)'; ctx.fillRect(x + .15 + h * .4, y + .3, .35, .05); ctx.fillRect(x + .5 - h * .3, y + .7, .3, .04);
  ctx.fillStyle = 'rgba(30,50,40,.35)';
  if (get(x, y - 1) !== WATER) ctx.fillRect(x, y, 1, .1);
  if (get(x - 1, y) !== WATER) ctx.fillRect(x, y, .1, 1);
  ctx.fillStyle = 'rgba(200,190,150,.5)';
  if (get(x, y + 1) !== WATER) ctx.fillRect(x, y + .92, 1, .08);
  if (get(x + 1, y) !== WATER) ctx.fillRect(x + .92, y, .08, 1);
  resetT();
}
// ---- achievements ----
const ACH = [
  ['forage', 'Собиратель', 'Найти ягоды или грибы'], ['canning', 'Заготовки', 'Закатать банку на зиму'],
  ['winter', 'Пережил зиму', 'Дожить до весны'], ['year', 'Год в карантине', 'Прожить 365 дней'],
['brute', 'Против громилы', 'Убить здоровенного мертвеца'], ['scream', 'Тишина', 'Убить крикуна'],
  ['dism', 'Всё на доски', 'Разобрать мебель на доски'], ['ragout', 'Шеф', 'Приготовить рагу'], ['nailbat', 'Гвоздь программы', 'Сделать биту с гвоздями'],
  ['kill1', 'Первая кровь', 'Убить первого мертвеца'], ['kill50', 'Мясник', 'Убить 50 мертвецов'], ['kill200', 'Легенда карантина', 'Убить 200 мертвецов'],
  ['day3', 'Три дня', 'Прожить 3 дня'], ['day7', 'Неделя в аду', 'Прожить 7 дней'], ['day30', 'Месяц в карантине', 'Прожить 30 дней'],
  ['ram10', 'Тарань их!', 'Сбить 10 мертвецов машиной'], ['fire5', 'Пироман', 'Сжечь 5 мертвецов'], ['harvest', 'Дачник', 'Собрать урожай'],
  ['gen', 'Да будет свет', 'Запустить генератор'], ['drop', 'Посылка с неба', 'Обыскать сброшенный груз'], ['hide', 'Чужой схрон', 'Пробраться в убежище выжившего'],
  ['books', 'Книжный червь', 'Прочитать 3 книги'], ['skill5', 'Мастер своего дела', 'Довести любой навык до 5'], ['fish', 'Рыбак', 'Поймать рыбу'],
  ['heli', 'Под винтами', 'Пережить облёт вертолёта'], ['horde', 'Против орды', 'Пережить проход орды'], ['snow', 'Первый снег', 'Дожить до снега'],
  ['drive', 'За рулём', 'Проехать на машине'], ['cold', 'Морж', 'Пережить переохлаждение'],
];
let achDone = {}; try { achDone = JSON.parse(localStorage.getItem('karantin-ach') || '{}') || {}; } catch (e) {}
function ach(id) {
  if (achDone[id]) return; achDone[id] = Date.now();
  try { localStorage.setItem('karantin-ach', JSON.stringify(achDone)); } catch (e) {}
  const a = ACH.find(a => a[0] === id); if (!a) return;
  eventBanner('Достижение: ' + a[1], a[2], 'gold', 'i-star');
  SFX.equip();
  logEv('Достижение: «' + a[1] + '»');
}
function checkAch() {
  const st = P.stats || {}, days = (gameMin - startMin) / 1440;
  if ((gameMin - startMin) / 1440 >= 365) ach('year');
  if (kills >= 1) ach('kill1'); if (kills >= 50) ach('kill50'); if (kills >= 200) ach('kill200');
  if (days >= 3) ach('day3'); if (days >= 7) ach('day7'); if (days >= 30) ach('day30');
  if ((st.ram || 0) >= 10) ach('ram10'); if ((st.fire || 0) >= 5) ach('fire5'); if ((st.books || 0) >= 3) ach('books');
  if (Object.keys(SKILLS).some(k => skillLv(k) >= 5)) ach('skill5');
  if ((world.snow || 0) > .2) ach('snow');
  const hi = hAt[Math.floor(P.y) * MW + Math.floor(P.x)]; if (hi && houses[hi - 1] && houses[hi - 1].hideout && insideHouse(P.x, P.y)) ach('hide');
  if (P.hordeSurv && gameMin > P.hordeSurv) { P.hordeSurv = 0; ach('horde'); }
  if (P.cold > 85) P.wasCold = true; else if (P.wasCold && P.cold < 20) { P.wasCold = false; ach('cold'); }
}
const stat = (k, n) => { P.stats = P.stats || {}; P.stats[k] = (P.stats[k] || 0) + (n || 1); };
function renderAch() {
  const box = $('achList'); box.textContent = '';
  const n = ACH.filter(a => achDone[a[0]]).length; $('achCount').textContent = `${n} из ${ACH.length}`;
  { const bar = mk('div', 'achbar'), f = mk('i'); f.style.width = Math.round(n / ACH.length * 100) + '%'; bar.appendChild(f); box.appendChild(bar); }   // прогресс, полученные — первыми
  for (const [id, t, d] of ACH.slice().sort((a, b) => !!achDone[b[0]] - !!achDone[a[0]])) { const r = mk('div', 'achi' + (achDone[id] ? ' on' : '')); r.appendChild(mk('b', '', (achDone[id] ? '★ ' : '☆ ') + t)); r.appendChild(mk('small', '', d)); box.appendChild(r); }
}
