// ================= new items, descriptions, ground piles, throwing, radio, map =================
Object.assign(ITEMS, {
  medkit:  {name:'Аптечка', kind:'heal', hp:35, stop:true, verb:'Обработать раны', anim:'work', dur:2.4},
  antibio: {name:'Антибиотики', sh:'Антибиотик', kind:'heal', hp:4, antibio:true, verb:'Принять'},
  apple:   {name:'Яблоко', kind:'food', sat:12, hyd:6, rot:true, verb:'Съесть'},
  choco:   {name:'Шоколад', kind:'food', sat:14, en:8, verb:'Съесть'},
  stew:    {name:'Тушёнка', kind:'food', sat:45, opener:true, verb:'Открыть и съесть'},
  mre:     {name:'Сухпаёк', kind:'food', sat:55, hyd:-6, verb:'Съесть'},
  energy:  {name:'Энергетик', kind:'drink', hyd:14, en:35, verb:'Выпить'},
  canteen: {name:'Фляга', kind:'canteen', verb:'Выпить'},
  map:     {name:'Карта района', sh:'Карта', kind:'map', verb:'Изучить'},
  radio:   {name:'Радиоприёмник', sh:'Радио', kind:'radio', verb:'Слушать'},
  alarm:   {name:'Будильник', kind:'misc', verb:'Завести и бросить'},
  burner:  {name:'Газовая горелка', sh:'Горелка', kind:'burner', uses:6, verb:'Готовить'},
  sleepbag:{name:'Спальник', kind:'sleepbag', verb:'Лечь спать'},
  tape:    {name:'Изолента', kind:'tape', uses:3, verb:'Починить оружие'},
});
Object.assign(ITEMS, {
  baton:{name:'Полицейская дубинка', sh:'Дубинка', kind:'weapon', dmg:26, range:1.15, cd:.45, cleave:1, dur:80, verb:'Взять в руки'},
  vest:{name:'Бронежилет', kind:'armor', verb:'Надеть'},
});
ITEMS.bottle.verb = 'Бросить'; ITEMS.battery.verb = 'Вставить';
Object.assign(ITEMS.bat, {sh:'Бита'}); Object.assign(ITEMS.opener, {sh:'Открывашка'}); Object.assign(ITEMS.water, {sh:'Вода'});
Object.assign(ITEMS.bottle, {sh:'Бутылка'}); Object.assign(ITEMS.pills, {sh:'Таблетки'}); Object.assign(ITEMS.pastaC, {sh:'Макароны'});
Object.assign(ITEMS.riceC, {sh:'Рис'}); Object.assign(ITEMS.steak, {sh:'Стейк'}); Object.assign(ITEMS.meat, {sh:'Мясо'});
Object.assign(ITEMS.bag, {sh:'Рюкзак'}); Object.assign(ITEMS.pipe, {sh:'Труба'}); Object.assign(ITEMS.knife, {sh:'Нож'}); Object.assign(ITEMS.coffee, {sh:'Кофе'});
const DESC = {
  canned:'Банка фасоли с мясом. Хранится вечно, но без ножа или открывашки не открыть.',
  chips:'Солёные и хрустящие. Утоляют голод совсем чуть-чуть и вызывают жажду.',
  bread:'Свежий батон. Через пару дней зацветёт, особенно без холодильника.',
  sausage:'Копчёная колбаса. Сытно, но портится, когда пропадёт электричество.',
  milk:'Пакет молока. И попить, и немного поесть. Скисает быстро.',
  water:'Пол-литра чистой воды. Пустую бутылку не выбрасывай: её можно наполнить.',
  soda:'Сладкая газировка. Неплохо утоляет жажду и даёт капельку калорий.',
  coffee:'Холодный кофе в банке. Прогоняет сон, когда спать нельзя.',
  bottle:'Пустая бутылка. Наполни у раковины или из бочки. А ещё её можно бросить: звон стекла уведёт мертвецов.',
  bandage:'Чистый бинт. Останавливает кровотечение и немного лечит.',
  pills:'Обезболивающее. Снимает боль и чуть-чуть восстанавливает здоровье.',
  opener:'Консервный нож. С ним любая банка становится едой.',
  plank:'Крепкая доска. Заколоти окна и двери молотком или пусти на костёр.',
  battery:'Батарейка. Вставляется в фонарик или радиоприёмник, в тот, где заряд меньше.',
  flashlight:'Фонарик. Светит в темноте, но мертвецы тоже видят свет.',
  hammer:'Молоток. Слабое оружие, зато без него не заколотить окна.',
  bat:'Бейсбольная бита. Длинная, бьёт двоих сразу, но быстро трескается.',
  knife:'Кухонный нож. Быстрые удары, открывает консервы. Тупится быстро.',
  pipe:'Обрезок трубы. Тяжёлый и надёжный, но медленный.',
  axe:'Пожарный топор. Самое мощное оружие: раскалывает черепа и цепляет двоих.',
  pan:'Чугунная сковорода. Бьёт глухо, служит долго. Нужна, чтобы жарить мясо.',
  crowbar:'Лом. Очень прочный, бьёт сильно. Классика жанра.',
  meat:'Сырое мясо. Съесть можно, но живот скорее всего скрутит. Лучше пожарить на сковороде.',
  steak:'Жареное мясо. Одна из самых сытных вещей в городе.',
  pasta:'Пачка макарон. Свари в кастрюле с водой на плите или костре.',
  pastaC:'Горячие макароны. Простая, но сытная еда.',
  rice:'Пакет риса. Свари в кастрюле с водой.',
  riceC:'Варёный рис. Сытно и не портится.',
  pot:'Кастрюля. Нужна, чтобы варить макароны и рис.',
  matches:'Коробок спичек. Каждая спичка — один костёр.',
  lighter:'Зажигалка. Хватит на много костров.',
  bag:'Большой туристический рюкзак. Надень, и в инвентаре станет на 10 мест больше.',
  vitamins:'Витамины. Немного бодрят и чуть подлечивают.',
  medkit:'Армейская аптечка. Останавливает кровь и хорошо лечит, но перевязка занимает время.',
  antibio:'Антибиотики. Укус не вылечат, но собьют жар и подарят время.',
  apple:'Яблоко. Немного еды и немного воды. Через пару дней сгниёт.',
  choco:'Плитка шоколада. Быстрая энергия, не портится.',
  stew:'Тушёнка. Очень сытно и хранится годами. Нужен нож или открывашка.',
  mre:'Армейский сухпаёк. Самая сытная еда в городе, после него хочется пить.',
  energy:'Энергетик. Сильно бодрит. Спасает, когда спать опасно.',
  canteen:'Металлическая фляга на 3 порции воды. Наполняется у раковины и из бочки.',
  map:'Карта района. Изучи её, и на карте (кнопка «Карта» или M) проявятся все дома и улицы.',
  radio:'Радиоприёмник на батарейках. Новости, прогноз погоды и когда отключат свет и воду.',
  alarm:'Механический будильник. Заведи и брось: несколько секунд звона уведут мертвецов от тебя.',
  burner:'Туристическая газовая горелка. Готовь где угодно, баллона хватит на несколько раз.',
  sleepbag:'Спальный мешок. Можно поспать где угодно, а не только в кровати.',
  tape:'Изолента. Чинит оружие в руках: обмотай трещину, и прочность вернётся.',
};
DESC.baton = 'Резиновая дубинка. Быстрая и очень прочная, но бьёт слабее топора.';
DESC.vest = 'Полицейский бронежилет. Принимает на себя укусы: урон меньше, шанс заразиться ниже. Со временем рвётся.';
const RADIO_TIPS = ['Набирайте воду во все ёмкости, пока работает водопровод. Ванны, кастрюли, бутылки.', 'Готовьтесь к зиме: тёплая одежда, топливо для костра, консервы. Свежие продукты не доживут до холодов.', 'Мебель можно разобрать на доски. Топор или молоток ускорят работу.', 'Некоторые жители заколотились в своих домах. Заколоченные окна — знак, что внутри могут быть припасы.', 'Город закрыт на карантин. Все выезды перекрыты военными. Не приближайтесь к ограждению.', 'В полицейском участке остались бронежилеты и дубинки. В аптеке — лекарства.', 'Не выходите ночью без нужды. Свет фонаря видно издалека.', 'Заколачивайте окна первого этажа. Двери держат дольше окон.',
  'Шум бега и разбитого стекла слышно за квартал.', 'Не ешьте сырое мясо и испорченные продукты.', 'Укушенных изолируйте. Лекарства от инфекции нет.',
  'Собирайте дождевую воду: бочку можно сколотить из досок.', 'Держитесь подальше от толп. Сражайтесь в узких проходах.',
  'Бутылку или будильник можно бросить, чтобы отвлечь заражённых.'];
Object.assign(CONT, {pile:{name:'На земле'}});
{
  const add = (k, ...ids) => CONT[k].loot.push(...ids);
  add('fridge', 'apple', 'apple', 'energy');
  add('cabinet', 'stew', 'choco', 'burner', 'tape', 'apple', 'alarm');
  add('wardrobe', 'sleepbag', 'medkit', 'antibio', 'radio', 'alarm', 'map', 'canteen');
  add('shelf', 'choco', 'energy', 'stew', 'tape', 'radio', 'map');
  add('crate', 'tape', 'burner', 'canteen', 'sleepbag');
  add('car', 'map', 'map', 'medkit', 'choco', 'energy', 'radio', 'mre', 'canteen', 'mre');
}
// ---- ground piles ----
let piles = [], thrown = [], rings = [];
function addToPile(x, y, it) {
  if (it) delete it.bp;                                                       // вещь, ушедшая из инвентаря, забывает, где лежала (карман/рюкзак)
  let p = piles.find(p => Math.hypot(p.x - x, p.y - y) < .7);
  if (!p) { p = {type:'pile', x, y, cx:x, cy:y, items:[]}; piles.push(p); }
  p.items.push(it); return p;
}
function dropItemGround(k) {
  const it = P.inv[k]; if (!it) return;
  P.inv.splice(k, 1); if (it.on) it.on = false;
  addToPile(P.x + Math.cos(P.face) * .35, P.y + Math.sin(P.face) * .35, it);
  SFX.rustle(); toast('Положено на землю: ' + ITEMS[it.id].name); renderInv(); updateHud();
}
function pickFromPile(f) {
  if (f.items.length === 1) {
    if (invFull() && !(ITEMS[f.items[0].id].kind === 'weapon' && !P.weapon)) { toast('Слишком тяжело — не унести'); return; }
    const it = f.items.pop();
    if (ITEMS[it.id].kind === 'weapon' && !P.weapon) P.weapon = it; else P.inv.push(it);
    toast('Подобрано: ' + ITEMS[it.id].name); SFX.rustle();
  } else if (f.items.length) openPanel('loot', {src:f});
  piles = piles.filter(p => p.items.length || p === (panel && panel.src));
  updateHud();
}
// ---- throwing ----
function throwItem(k) {
  const it = P.inv[k]; if (!it) return;
  P.inv.splice(k, 1); closePanel();
  const dx = Math.cos(P.face), dy = Math.sin(P.face);
  let s = .6;
  for (let q = .6; q <= 6.5; q += .25) { const qx = P.x + dx * q, qy = P.y + dy * q; if (!los(P.x, P.y, qx, qy) || isWallish(get(Math.floor(qx), Math.floor(qy)))) break; s = q; }
  thrown.push({x0:P.x, y0:P.y, x1:P.x + dx * s, y1:P.y + dy * s, t:0, dur:.22 + s * .07, it});
  P.thrT = .32; SFX.swing(false); updateHud();
}
function updateThrown(dt) {
  for (const t of thrown) {
    t.t += dt;
    if (t.t >= t.dur) {
      const x = t.x1, y = t.y1;
      if (t.it.id === 'bottle') { SFX.glass(x, y); emit('glass', x, y, 1, 12, null, 0, 1.6); noise(x, y, 11); }
      else if (t.it.id === 'flare') { flares.push({x, y, t:30, n:0}); toast('Фальшфейер горит. Мертвецы потянутся к нему'); }
      else if (t.it.id === 'molotov') { emit('glass', x, y, 1, 10, null, 0, 1.6); startBlaze(x, y); }
      else { rings.push({x, y, t:9, n:0, it:t.it}); SFX.knock(x, y); toast('Будильник звенит. Мертвецы идут на звук'); }
    }
  }
  thrown = thrown.filter(t => t.t < t.dur);
  for (const r of rings) {
    r.t -= dt; r.n -= dt;
    if (r.n <= 0 && r.t > 0) { r.n = .9; noise(r.x, r.y, 16); SFX.alarm(r.x, r.y); }
    if (r.t <= 0) addToPile(r.x, r.y, r.it);
  }
  rings = rings.filter(r => r.t > 0);
  if (P.thrT > 0) P.thrT -= dt;
}
// ---- timed use (eat / drink / heal) ----
function useKind(it) {
  if (it.id === 'rag') return ['work', 2.2]; if (it.id === 'splint') return ['work', 3];
  const d = ITEMS[it.id];
  if (d.kind === 'book') return ['read', 6];
  if (d.kind === 'fun') return ['read', d.dur];
  if (d.kind === 'food') return ['eat', 1.7];
  if (d.kind === 'drink' || d.kind === 'canteen') return ['drink', 1.4];
  if (d.kind === 'heal') return d.anim ? [d.anim, d.dur || 2] : it.id === 'bandage' ? ['work', 1.8] : ['eat', 1.1];
  return null;
}
function beginUse(k) {
  const it = P.inv[k]; if (!it) return;
  const d = ITEMS[it.id], u = useKind(it);
  if (!u) { useItem(null, k); return; }
  if (d.opener && !hasTool('opener') && !hasTool('knife')) { toast('Нечем открыть: нужен консервный нож или нож'); return; }
  if (d.kind === 'canteen' && !(it.w > 0)) { toast(d.name + ' пуста. Набери воды у раковины или из бочки'); return; }
  const re = panel && panel.reopen; closePanel();
  P.act = {kind:'use', t:0, dur:u[1], it, an:u[0], reopen:re};
  if (u[0] === 'work') SFX.rustle();
}
// применение закончилось: вещь из инвентаря или прямо из ящика (a.from); вернуться в окно обыска
function finishUse(a) {
  if (a.from) {
    const c = a.from, k = c.items.indexOf(a.it); if (k < 0) return;
    c.items.splice(k, 1); P.inv.push(a.it); const n0 = P.inv.length;
    useItem(null, P.inv.length - 1);
    if (invKg() > invHardKg()) { const left = P.inv.pop(); if (c.items.length < capOf(c)) c.items.push(left); else addToPile(P.x, P.y, left); }
    if (!P.act && !paused && mode === 'play' && Math.hypot(P.x - (c.cx != null ? c.cx : c.x), P.y - (c.cy != null ? c.cy : c.y)) < 2.2) openPanel('loot', {src:c});
    return;
  }
  const re = a.reopen;
  { const k = P.inv.indexOf(a.it); if (k >= 0) useItem(null, k); }
  if (re && !P.act && mode === 'play' && !paused) openPanel('loot', {src:re});
}
// ---- radio ----
function radioNews() {
  const hrs = m => Math.max(1, Math.round(m / 60)), out = [];
  out.push(['Метеослужба', rainTarget || rain > .5 ? `Дождь продлится ещё около ${hrs(weatherTimer)} ч. Выставьте бочки на улицу.` : `Ближайшие ${hrs(weatherTimer)} ч без осадков, потом возможен дождь.`]);
  out.push(['Энергосеть', powerOn() ? `Электричество пока подаётся. Отключение ожидается через ${fmtDur(powerOffAt - gameMin)}. Холодильники перестанут работать.` : 'Энергосистема обесточена. Света больше не будет. Берегите батарейки.']);
  out.push(['Водоканал', waterOn() ? `Водопровод проработает ещё около ${fmtDur(waterOffAt - gameMin)}. Наберите воду во все бутылки.` : 'Насосные станции остановлены. Пейте дождевую воду из бочек.']);
  if (world.heliAt - gameMin < 1440 && world.heliAt > gameMin) out.push(['Военные', 'В ближайшие сутки над городом пройдёт вертолёт. Его шум поднимет всех заражённых. Не стойте на открытом месте.']);
  if (world.hordeAt - gameMin < 720 && world.hordeAt > gameMin) out.push(['Военные', 'Крупная группа заражённых смещается через город. Укрепите окна и не шумите.']);
  out.push(['Погода', dateStr(gameMin) + ', ' + seasonName() + '. Сейчас около ' + Math.round(outsideTemp()) + '°C' + (outsideTemp() < 4 ? ', ночью заморозки.' : ', ночью будет холоднее.') + ' Одевайтесь теплее.']);
  if (airdrops.some(a => a.landed && a.f && !a.f.searched)) out.push(['Военные', 'Над районом сброшен груз гуманитарной помощи. Ищите парашют.']);
  const near = zs.filter(z => Math.hypot(z.x - P.x, z.y - P.y) < 14).length;
  out.push(['Гражданская оборона', near >= 6 ? `Рядом с вами скопление заражённых (${near}). Не шумите и не бегите.` : RADIO_TIPS[Math.floor(Math.random() * RADIO_TIPS.length)]]);
  return out;
}
function listenRadio(it) {
  if (!(it.ch > 0)) { toast('Батарейка села. Вставь новую'); return; }
  it.ch = Math.max(0, it.ch - 10); SFX.radio(); P.bored = Math.max(0, (P.bored || 0) - 8);
  openPanel('radio', {it, news:radioNews()});
}
// ---- map ----
const MAPC = {8:'#2f5d78', 0:'#3b5634', 1:'#2c2e33', 2:'#7a7a74', 3:'#8d6e50', 4:'#d6c6a4', 5:'#9fc0d0', 6:'#24401f', 7:'#b07a44'};
function drawMapCanvas(c) {
  const g = c.getContext('2d'); let dpr = Math.min(3, devicePixelRatio || 1);
  const wrap = c.parentNode, aw = Math.max(200, (wrap ? wrap.clientWidth : 560) - 4), ah = Math.max(120, (wrap ? wrap.clientHeight : 300) - 4);
  const m0 = FEN - 5, N = MW - 2 * m0, mz = world.mapZ || 2;
  const fit = Math.min(aw / (2 * N), ah / N), s = mz <= 1.01 ? fit : Math.max(fit, aw / (2 * N) * (mz - .5));   // масштаб плавный: щипок и колесо (21-panels mapDrag)
  const cw = Math.floor(2 * N * s), chh = Math.floor(N * s); c._mp = {s, cw, m0};   // для «Где я»: мир → холст
  dpr = Math.min(dpr, Math.sqrt(12e6 / Math.max(1, cw * chh)));               // холст не больше ~12 Мпикс: телефоны (iOS) большие не рисуют
  c.width = Math.round(cw * dpr); c.height = Math.round(chh * dpr); c.style.width = cw + 'px'; c.style.height = chh + 'px';
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, cw, chh);
  g.setTransform(dpr * s, dpr * s / 2, -dpr * s, dpr * s / 2, dpr * cw / 2, -dpr * m0 * s);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x, sn = seen[i];
    if (!sn && !P.mapRead) continue;
    g.globalAlpha = sn ? 1 : .42;
    g.fillStyle = soilCol(i); g.fillRect(x, y, 1.04, 1.04);
  }
  g.globalAlpha = 1;
  // quarantine fence
  if (!world.nofence) g.strokeStyle = '#e7c531', g.lineWidth = .35, g.setLineDash([.9, .6]), g.strokeRect(FEN + .5, FEN + .5, MW - 2 * FEN - 1, MH - 2 * FEN - 1); g.setLineDash([]);
  const dot = (x, y, r, col) => { g.setTransform(dpr, 0, 0, dpr, 0, 0); const px = cw / 2 + (x - y) * s, py = (x + y - 2 * m0) * s / 2; g.fillStyle = col; g.beginPath(); g.arc(px, py, r, 0, 6.283); g.fill(); return [px, py]; };
  for (const f of fires) if (!f.out) dot(f.x, f.y, 3, '#ff9a3c');
  for (const b of barrels) dot(b.cx, b.cy, 2.6, '#5aa8e0');
  for (const p of piles) dot(p.x, p.y, 2, '#f2ead8');
  for (const g of gens) dot(g.cx, g.cy, 2.6, '#e3c13a');
  for (const b of beds) dot(b.cx, b.cy, 2.2, '#7bc46a');
  for (const l of lures) if (!l.dead) dot(l.cx, l.cy, 2.4, '#ff7ab0');
  for (const s of stashes) if (!s.gone) dot(s.cx, s.cy, 2.6, '#c9a46a');
  for (const a of airdrops) if (!(a.f && a.f.searched && !a.f.items.length)) { const [qx, qy] = dot(a.x, a.y, 4, '#f2ead8'); g.strokeStyle = '#d0472f'; g.lineWidth = 1.5; g.beginPath(); g.arc(qx, qy, 6, 0, 6.283); g.stroke(); }
  for (const m of world.marks || []) { const [qx, qy] = dot(m.x, m.y, 0, '#000'); drawMark(g, qx, qy, m); }   // значки — 69-world
  for (const c of CHECKPOINTS) { const [qx, qy] = dot(c.x, c.y, 4.5, '#c4312a'); g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(qx - 2.4, qy - 2.4); g.lineTo(qx + 2.4, qy + 2.4); g.moveTo(qx + 2.4, qy - 2.4); g.lineTo(qx - 2.4, qy + 2.4); g.stroke(); }
  g.font = '600 10px "PT Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom';
  for (const H of houses) {
    if (!H.sign) continue;
    const cx = (H.ix0 + H.ix1) / 2, cy = (H.iy0 + H.iy1) / 2;
    if (!P.mapRead && !seen[Math.floor(cy) * MW + Math.floor(cx)] && !seen[H.doors.length ? H.doors[0].y * MW + H.doors[0].x : 0]) continue;
    const [qx, qy] = dot(cx, cy, 3, H.sign.bg);
    g.lineWidth = 3; g.strokeStyle = 'rgba(10,12,14,.85)'; g.strokeText(H.sign.label, qx, qy - 4); g.fillStyle = '#f2ead8'; g.fillText(H.sign.label, qx, qy - 4);
  }
  for (const H of houses) {
    if (!houseSearched(H)) continue;
    const cx = (H.ix0 + H.ix1) / 2, cy = (H.iy0 + H.iy1) / 2, [qx, qy] = dot(cx, cy, 4.6, '#3f8a4a');
    g.strokeStyle = '#eaf7e4'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(qx - 2.2, qy); g.lineTo(qx - .6, qy + 1.8); g.lineTo(qx + 2.4, qy - 1.8); g.stroke();
  }
  const [px, py] = dot(P.x, P.y, 4.2, '#e8473a');
  g.strokeStyle = '#e8473a'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py);
  g.lineTo(px + (Math.cos(P.face) - Math.sin(P.face)) * 7, py + (Math.cos(P.face) + Math.sin(P.face)) * 3.5); g.stroke();
  c._s = s; c._cw = cw; c._m0 = m0;
  if (wrap && !c._centered) { c._centered = true; wrap.scrollLeft = px - wrap.clientWidth / 2; wrap.scrollTop = py - wrap.clientHeight / 2; }
}
function openMap() { if (mode === 'play' && !P.sleep) openPanel('map'); }
// ---- world drawing of icons ----
function drawIcon(id, sx, sy, size, alpha) {
  const ic = ART.meta.icons && (ART.meta.icons[id] || ART.meta.icons[ICONA[id]]); if (!ic || !ART.imgs.icons) return;
  ctx.imageSmoothingEnabled = false; if (alpha != null) ctx.globalAlpha = alpha;
  ctx.drawImage(ART.imgs.icons, ic[0], ic[1], ic[2], ic[3], sx - size / 2, sy - size / 2, size, size);
  ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
}
function drawPile(p) {
  const sx = SX(p.x, p.y), sy = SY(p.x, p.y, 0);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(sx, sy, 6, 2.6, 0, 0, 6.283); ctx.fill();
  const n = Math.min(3, p.items.length);
  for (let q = 0; q < n; q++) drawIcon(p.items[p.items.length - 1 - q].id, sx + (q - (n - 1) / 2) * 5, sy - 5 - q * 1.4, 14);
}
