// ================= v47: сюжет в записках (без концовки) и ночные звуки =================

// ---- записки: 19 штук, пять линий. Разложены по городу при создании мира; прочитанные собираются в дневнике ----
const STORY_LINES = {hosp:'Больница', army:'Военные', people:'Люди', lab:'Лаборатория', rumor:'Слухи'};
const STORY_NOTES = [
  {id:'h1', line:'hosp', at:'home', title:'Записка на холодильнике', text:'Лёша, я на сутках. Ужин в духовке. Если по телевизору снова скажут «грипп» — не верь. Мама.'},
  {id:'h2', line:'hosp', at:'home', title:'Блокнот врача, 11 сентября', text:'Третий за смену. Жар 41, бред. Все трое — с вахты с северного месторождения. Вернулись неделю назад.'},
  {id:'h3', line:'hosp', at:'home', title:'Блокнот врача, 12 сентября', text:'Пациент Г., 46 лет. Умер в 14:10. В 15:30 санитар сказал, что он сел на каталке. Я не видела. Не хочу видеть.'},
  {id:'h4', line:'hosp', at:'home', title:'Блокнот врача, 13 сентября', text:'Главврачу звонили «оттуда». Выписку запретили. Укушенных держим в подвале. Подвал уже не закрывается.'},
  {id:'a1', line:'army', at:'army', title:'Распоряжение №14', text:'Периметр по линии железной дороги. Лиц, пытающихся покинуть зону, предупреждать. При неподчинении — действовать по обстановке.'},
  {id:'a2', line:'army', at:'army', title:'Журнал дежурного, 16 сентября', text:'У блоков двое с детьми. Капитан сказал — не открывать. Я не открыл. Третью ночь не сплю.'},
  {id:'a3', line:'army', at:'desk', title:'Факс в администрацию', text:'Зона считается временной. Эвакуация не планируется до получения результатов из лаборатории.\n\nСнизу от руки: «Каких результатов?»'},
  {id:'p1', line:'people', at:'home', title:'Детский рисунок', text:'Дом, солнце и человек в каске. Подпись крупными буквами: «Папа вернётся с вахты в пятницу».'},
  {id:'p2', line:'people', at:'car', title:'Телефон с треснутым экраном', text:'«Мам, мы в школе, тут военные, всё хорошо».\n\nЧерез два дня: «мам ответь».\n\nПотом ещё три сообщения: «мам».'},
  {id:'p3', line:'people', at:'home', title:'Записка соседа', text:'Кто прочитает: в гараже канистра бензина. Мы ушли к реке, там лодки. Удачи.', gift:'jerrycan'},
  {id:'p4', line:'people', at:'home', title:'Радиоведущий', text:'Если кто-то слышит — я ещё здесь. Эфир каждый вечер в девять.'},
  {id:'p5', line:'people', at:'home', title:'Радиоведущий, позже', text:'Сегодня ко мне стучали. Я не открыл. Эфир будет, пока есть бензин в генераторе.'},
  {id:'l1', line:'lab', at:'car', title:'Пропуск', text:'НИИ «Северный». Допуск 3. Сотрудник: Орлов В. С.'},
  {id:'l2', line:'lab', at:'desk', title:'Записка Орлова', text:'Мы знали ещё в августе. Образцы из мерзлоты дали рост при плюс четырёх. Нам сказали: это не наша зона ответственности.'},
  {id:'l3', line:'lab', at:'desk', title:'Записка Орлова', text:'Они не мертвы в том смысле, в каком мы думаем. Мозг отвечает на звук и свет — поэтому шум их тянет.'},
  {id:'l4', line:'lab', at:'home', title:'Записка Орлова', text:'Если нас не вывезут, образцы надо уничтожить. Ключ от хранилища я отдал врачу из второй больницы.'},
  {id:'l5', line:'lab', at:'home', title:'Последняя запись Ковалёвой', text:'Орлов был прав. Ключ я спрятала там, где Лёша прятал сигареты.'},
  {id:'r1', line:'rumor', at:'home', title:'Листовка', text:'«Спасение есть! Церковь на Садовой принимает всех».\n\nПоверх ручкой, с нажимом: «НЕ ХОДИТЕ».'},
  {id:'r2', line:'rumor', at:'car', title:'Список мародёра', text:'Адреса домов в столбик. Половина зачёркнута крестиками. Напротив одного — «собака, не лезть».'},
];
const storyNote = id => STORY_NOTES.find(n => n.id === id);
function placeStoryNotes() {
  const HOMEC = ['wdesk', 'nightstand', 'dresser', 'bookshelf', 'coffeetab', 'chest', 'wardrobe', 'cabinet'];
  const inHouse = f => { const H = houses[hAt[f.y * MW + f.x] - 1]; return H && H.kind === 'house' && hAt[f.y * MW + f.x] !== spawnHouse; };
  const pool = {
    home:furns.filter(f => !f.gone && HOMEC.includes(f.type) && CONT[f.type] && inHouse(f)),
    desk:furns.filter(f => !f.gone && (f.type === 'wdesk' || f.type === 'desk') && CONT[f.type]),
    army:furns.filter(f => !f.gone && f.type === 'armybox'),
    car:props.filter(p => p.type === 'car'),
  };
  const fill = c => { if (!c.items) { c.items = []; const C = CONT[c.type]; if (C && C.loot) for (let n = ri(C.n[0], C.n[1]); n > 0; n--) c.items.push(mkItem(pick(C.loot))); } };
  const used = new Set();
  for (const n of STORY_NOTES) {
    let L = (pool[n.at] && pool[n.at].length ? pool[n.at] : pool.home).filter(c => !used.has(c));
    if (!L.length) L = pool.home; if (!L.length) continue;
    const c = pick(L); used.add(c); fill(c);
    const it = mkItem('note'); it.story = n.id; it.text = n.text; c.items.push(it);
  }
}
{ onNewWorld((o) => { if (!(o && o.save)) placeStoryNotes();
}); }
// прочитать записку из сюжета
function readStory(it) {
  const n = storyNote(it.story); if (!n) return;
  world.story = world.story || [];
  if (!world.story.includes(n.id)) {
    world.story.push(n.id);
    const of = STORY_NOTES.filter(x => x.line === n.line), got = of.filter(x => world.story.includes(x.id)).length;
    setTimeout(() => toast('Записка сохранена в дневнике · ' + STORY_LINES[n.line] + ': ' + got + ' из ' + of.length), 300);
    logEv('Нашёл записку: «' + n.title + '»');
    if (n.gift && !world['gift_' + n.id]) {                                  // подсказка из записки — правда
      world['gift_' + n.id] = true;
      const sheds = houses.filter(H => H.kind === 'shed' || H.kind === 'garage'), H = sheds.length ? pick(sheds) : null;
      if (H) { const x = H.x + H.w / 2, y = H.y + H.h / 2; addToPile(x, y, mkItem(n.gift)); world.marks = world.marks || []; world.marks.push({x:Math.round(x), y:Math.round(y)}); }
    }
  }
}
{ const rp = renderPanel;
  renderPanel = function () {
    rp();
    if (!panel || panel.kind !== 'note' || !panel.it || !panel.it.story) return;
    const n = storyNote(panel.it.story); if (!n) return;
    readStory(panel.it);
    $('pnTitle').textContent = n.title; $('pnSub').textContent = STORY_LINES[n.line];
    const body = $('pnBody'); body.textContent = '';
    const pg = mk('div', 'diary snote'); for (const para of n.text.split('\n\n')) pg.appendChild(mk('p', 'dline', para)); body.appendChild(pg);
  };
}
// в дневнике — страница «Записки»: по линиям, ненайденные — пропуски
{ const bd = buildDiary;
  buildDiary = function (body) {
    const page = (panel && panel.dpage) || 'day';
    if (page === 'day') bd(body); else { body.textContent = ''; body.appendChild(storyPage()); }
    const sw = mk('div', 'dswitch');
    for (const [k, t] of [['day', 'Дела на сегодня'], ['notes', 'Записки ' + ((world.story || []).length) + '/' + STORY_NOTES.length]]) sw.appendChild(btn(t, () => { panel.dpage = k; renderPanel(); }, page === k ? 'on' : 'ghost'));
    body.insertBefore(sw, body.firstChild);
  };
}
function storyPage() {
  const pg = mk('div', 'diary'), got = world.story || [];
  pg.appendChild(mk('div', 'dhead', 'Что я нашёл'));
  if (!got.length) pg.appendChild(mk('p', 'dline', 'Пока ничего. Люди оставляют записки в столах, тумбочках, машинах. Кто-то знал больше, чем говорили по радио.'));
  for (const k in STORY_LINES) {
    const of = STORY_NOTES.filter(n => n.line === k), have = of.filter(n => got.includes(n.id));
    if (!have.length) continue;
    pg.appendChild(mk('p', 'dline dsub', STORY_LINES[k] + ' · ' + have.length + ' из ' + of.length));
    for (const n of of) {
      if (got.includes(n.id)) { const p = mk('p', 'dline sn'); p.appendChild(mk('b', '', n.title + '. ')); p.appendChild(document.createTextNode(n.text.replace(/\n\n/g, ' '))); pg.appendChild(p); }
      else pg.appendChild(mk('p', 'dline dmiss', '…ещё не найдено'));
    }
  }
  return pg;
}
// сохранение: найденные записки — у города (переживают «ещё одну жизнь»)
{ onSave(d => { d.x47 = {story:world.story || [], gifts:Object.keys(world).filter(k => k.startsWith('gift_'))};
}); }
{ onLoad((d) => { const x = d && d.x47; world.story = (x && x.story) || []; for (const k of (x && x.gifts) || []) world[k] = true;
}); }
{ onStartNew(() => {
}, () => { world.story = []; for (const k of Object.keys(world)) if (k.startsWith('gift_')) delete world[k]; }); }

// ---- ночные звуки: ночью, не чаще раза в 1–2 игровых часа. Безобидные — всегда ложные, скрежет — всегда правда,
// стук — 50 на 50 (пойди проверь). Ложные никогда не будят; настоящий рядом — будит ----
SETTINGS_DEF.nightSnd = true; if (settings.nightSnd == null) settings.nightSnd = true;
let nightNext = null, nightMarks = [];
function nsPlay(g, v, x, y, rate, lpAdd) { const k = x == null ? 1 : Math.max(.15, zNear(x, y)); return smp(g, v * k, rate || 1, 0, (x == null ? 1600 : zLp(k)) + (lpAdd || 0)); }
function nsMark(x, y, real, ambig) { nightMarks.push({x, y, t:0, real, ambig, checked:false, at:gameMin}); if (nightMarks.length > 4) nightMarks.shift(); }
function unseenZombie(maxD) {
  return zs.filter(z => z.hp > 0 && z.state !== 'chase' && !vis[Math.floor(z.y) * MW + Math.floor(z.x)] && Math.hypot(z.x - P.x, z.y - P.y) < maxD)
    .sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
}
function nightSound() {
  const home = insideHouse(P.x, P.y), r = rng(), a = rng() * 6.283;
  const off = d => [P.x + Math.cos(a) * d, P.y + Math.sin(a) * d];
  if (home) {
    const z = unseenZombie(9);
    if (z && r < .45) {                                                      // правда: скребётся мертвец — там, где он есть
      nsPlay('knock', .22, z.x, z.y, .75, -500); setTimeout(() => nsPlay('knock', .18, z.x, z.y, .7, -500), 650);
      nsMark(z.x, z.y, true, false);
      if (P.sleep && Math.hypot(z.x - P.x, z.y - P.y) < 7) wake('Проснулся: кто-то скребётся совсем рядом');
      return;
    }
    if (r < .75) {                                                           // безобидное: дом скрипит, капает
      const [x, y] = off(2.5); nsPlay(rng() < .5 ? 'door_open' : 'drop', .08, x, y, .55 + rng() * .2, -900); return;
    }
    const [x, y] = off(4 + rng() * 2), real = rng() < .5;                   // стук: то ли показалось, то ли нет
    nsPlay('drop', .18, x, y, .8); nsMark(x, y, real, true);
    if (real) { spawnNear(x, y); }
    return;
  }
  // на улице: шорох в кустах там, где правда кто-то есть; далёкий стон; хруст ветки
  const z = unseenZombie(13);
  if (z && r < .45) { nsPlay('step_grass', .2, z.x, z.y, .85); nsMark(z.x, z.y, true, false); return; }
  if (r < .8) { const [x, y] = off(12); nsPlay(rng() < .5 ? 'groan' : 'woodbreak', .08, x, y, .8, -1200); return; }
  const [x, y] = off(6), real = rng() < .5; nsPlay('step_grass', .16, x, y, .9); nsMark(x, y, real, true); if (real) spawnNear(x, y);
}
function spawnNear(x, y) {
  for (let t = 0; t < 30; t++) {
    const a = rng() * 6.283, d = 1.5 + rng() * 2, zx = x + Math.cos(a) * d, zy = y + Math.sin(a) * d, i = Math.floor(zy) * MW + Math.floor(zx);
    if (zx < 1 || zy < 1 || zx > MW - 2 || zy > MH - 2 || navBlocked(Math.floor(zx), Math.floor(zy)) || vis[i]) continue;
    const z = mkZombie(zx, zy, zPal(), ri(48, 70), .9); z.state = 'investigate'; z.tx = P.x; z.ty = P.y; return;
  }
}
{ onUpdate(dt => {
    if (mode !== 'play' || !P || P.car) return;
    const night = lightLevel() < .4;
    if (!settings.nightSnd || !night) { nightNext = null; }
    else {
      if (nightNext == null) nightNext = gameMin + 60 + rng() * 60;
      if (gameMin >= nightNext) { nightNext = gameMin + 60 + rng() * 60; nightSound(); }
    }
    // двусмысленный звук: проверил — спокойнее, оставил без внимания — тревожно
    for (const m of nightMarks) {
      m.t += dt;
      if (m.ambig && !m.checked && Math.hypot(m.x - P.x, m.y - P.y) < 2.2) { m.checked = true; if (!m.real) { P.stress = Math.max(0, (P.stress || 0) - 6); toast('Ничего. Показалось'); } }
      if (m.ambig && !m.checked && gameMin - m.at > 60) { m.checked = true; P.stress = Math.min(100, (P.stress || 0) + 5); }
    }
    nightMarks = nightMarks.filter(m => m.t < 6 || (m.ambig && !m.checked));
  });
}
// откуда был звук — бледный «?» на несколько секунд
function drawNightMarks() {
  for (const m of nightMarks) {
    if (m.t > 6) continue;
    const a = Math.min(1, m.t * 3) * Math.max(0, 1 - m.t / 6), sx = SX(m.x, m.y), sy = SY(m.x, m.y, U * 1.1) + Math.sin(m.t * 3) * 1.5;
    ctx.globalAlpha = a * .75; ctx.fillStyle = 'rgba(14,17,20,.6)'; ctx.beginPath(); ctx.arc(sx, sy, 5.5, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#d8d0bc'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', sx, sy + .5); ctx.globalAlpha = 1;
  }
}
function extraDl(dl) { if (nightMarks.length && mode === 'play') dl.push({d:1e9, k:99, fn:drawNightMarks}); }
{ const os = openSettings;
  openSettings = function (from) {
    os(from);
    const list = document.querySelector('#settings .setlist'); if (!list || $('sNight')) return;
    const row = document.createElement('div'); row.className = 'set';
    row.innerHTML = '<div><b>Ночные звуки</b><small>Скрипы, стуки и шорохи ночью. Скрежет — всегда правда, стук — проверь сам</small></div><div class="seg" id="sNight"></div>';
    list.appendChild(row);
    seg($('sNight'), [[true, 'Вкл'], [false, 'Выкл']], () => settings.nightSnd !== false, v => { settings.nightSnd = v; saveSettings(); });
  };
}
