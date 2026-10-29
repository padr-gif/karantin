// ================= экран «Новый выживший»: внешность, одежда, профессия, черты, мир =================
// Имя, возраст и сложение лежат в look (сохраняются вместе с внешностью); их особенности — heroK/heroAdd (04-state).
// Профессия кладёт свои особенности в P.pk (после загрузки — заново из PROFS). Мир: сложность — база, ползунки — множители
// поверх неё (DIFF.custom), плюс бегуны, погода, орды, сигнализации, время начала, код мира.

// ---- имена ----
const NAMES = {
  m:['Алексей', 'Андрей', 'Антон', 'Артём', 'Борис', 'Вадим', 'Виктор', 'Владимир', 'Геннадий', 'Григорий', 'Денис', 'Дмитрий', 'Евгений', 'Егор', 'Иван', 'Игорь', 'Илья', 'Кирилл', 'Константин', 'Леонид', 'Максим', 'Михаил', 'Никита', 'Николай', 'Олег', 'Павел', 'Пётр', 'Роман', 'Сергей', 'Степан', 'Тимур', 'Фёдор', 'Юрий', 'Ярослав'],
  f:['Алина', 'Анастасия', 'Анна', 'Валентина', 'Вера', 'Виктория', 'Галина', 'Дарья', 'Евгения', 'Екатерина', 'Елена', 'Жанна', 'Зоя', 'Ирина', 'Ксения', 'Лариса', 'Людмила', 'Марина', 'Мария', 'Надежда', 'Наталья', 'Нина', 'Оксана', 'Ольга', 'Полина', 'Светлана', 'Софья', 'Татьяна', 'Юлия'],
  s:['Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Соколов', 'Лебедев', 'Козлов', 'Новиков', 'Морозов', 'Волков', 'Соловьёв', 'Васильев', 'Зайцев', 'Павлов', 'Семёнов', 'Голубев', 'Виноградов', 'Богданов', 'Воробьёв', 'Фёдоров', 'Михайлов', 'Беляев', 'Тарасов', 'Белов', 'Комаров', 'Орлов', 'Киселёв', 'Макаров', 'Андреев', 'Ковалёв', 'Ильин', 'Гусев', 'Титов', 'Кузьмин', 'Кудрявцев', 'Баранов', 'Куликов', 'Алексеев', 'Степанов', 'Яковлев', 'Сорокин', 'Сергеев', 'Романов', 'Захаров', 'Борисов', 'Королёв', 'Герасимов', 'Пономарёв', 'Григорьев', 'Лазарев'],
};
const rpick = a => a[Math.floor(Math.random() * a.length)];
function randomName(g) { const s = rpick(NAMES.s); return rpick(NAMES[g === 'f' ? 'f' : 'm']) + ' ' + (g === 'f' ? s + 'а' : s); }

// ---- профессии: прежние + новые. Особенности: thrift — голод и жажда, xp — опыт, en — усталость, panic — паника,
//      cold — холод, sight — дальше видит (клеток), noise — шаги, carry — унесёт кг, dmg — урон ----
PROFS.none.thrift = .8;
Object.assign(PROFS, {
  fire:{name:'Пожарный', icon:'hatchet', info:'Физподготовка 2. Вынослив: устаёт на 10% меньше. С собой туристический топорик и рабочие перчатки.', sk:{fit:2}, items:['hatchet', 'gloves'], en:.9},
  vet:{name:'Ветеран', icon:'knife', info:'Служил по контракту. Ближний бой 2, физподготовка 1, паника растёт вдвое медленнее. С собой нож и бинт.', sk:{fight:2, fit:1}, items:['knife', 'bandage'], panic:.55},
  hunter:{name:'Охотник', icon:'trap', info:'Видит на 2 клетки дальше, ступает тихо. С собой нож, бинокль и капкан.', items:['knife', 'bino', 'trap'], sight:2, noise:.8},
  teacher:{name:'Учитель', icon:'novel', info:'Привык учиться: опыт на 25% быстрее. С собой роман — от скуки.', items:['novel'], xp:1.25},
  coach:{name:'Тренер', icon:'energy', info:'Физподготовка 3, бегает дольше всех: устаёт на 15% меньше. С собой вода и энергетик.', sk:{fit:3}, items:['water', 'energy'], en:.85},
  homeless:{name:'Бездомный', icon:'sleepbag', info:'Голод и жажда растут на 25% медленнее, холод переносит легче. С собой спальник, тряпки и сигареты.', items:['sleepbag', 'rag', 'rag', 'cigs'], thrift:.75, cold:.7},
  electric:{name:'Электрик', icon:'flashlight', info:'Механика 2. С собой фонарик, батарейка и изолента.', sk:{mech:2}, items:['flashlight', 'battery', 'tape']},
  burglar:{name:'Домушник', icon:'crowbar', info:'Ходит неслышно: шаги на 40% тише. С собой лом.', items:['crowbar'], noise:.6},
  postman:{name:'Почтальон', icon:'map', info:'Знает каждый двор: карта района с собой, видит на клетку дальше, устаёт на 8% меньше.', items:['map'], sight:1, en:.92},
});
Object.assign(PROFS.none, {icon:'chips'}); Object.assign(PROFS.police, {icon:'baton'}); Object.assign(PROFS.carp, {icon:'hammer'}); Object.assign(PROFS.chef, {icon:'pot'});
Object.assign(PROFS.farmer, {icon:'seeds'}); Object.assign(PROFS.medic, {icon:'bandage'}); Object.assign(PROFS.tailor, {icon:'sewkit'}); Object.assign(PROFS.mech, {icon:'wrench'});
for (const p of Object.values(PROFS)) if (p.items) p.items = p.items.filter(id => ITEMS[id]);
const PK_KEYS = ['thrift', 'xp', 'en', 'panic', 'cold', 'sight', 'noise', 'carry', 'dmg'];
function profPk(k) { const p = PROFS[k] || PROFS.none, o = {}; for (const key of PK_KEYS) if (p[key] != null) o[key] = p[key]; return o; }

// ---- одежда на старте ----
const NG_WEAR = [
  ['shirt', 'Верх', ['tshirt', 'tank', 'longsl', 'flannel', 'hoodie', 'thermal']],
  ['torso', 'Куртка', [null, 'denimJ', 'leather', 'jacket', 'sweater', 'raincoat', 'workvest']],
  ['legs', 'Низ', ['jeans', 'cargo', 'shorts', 'milP']],
  ['feet', 'Обувь', ['sneakers', 'boots', 'rubberB', 'slippers']],
  ['head', 'Голова', [null, 'cap', 'ushanka']],
];
const NG_COLS = [[56, 92, 128], [124, 42, 38], [72, 98, 66], [58, 60, 66], [196, 170, 120], [154, 112, 62], [198, 198, 192], [226, 214, 188], [36, 36, 40], [104, 72, 112], [180, 120, 40], [70, 118, 122]];
const NG_RECOLOR = new Set(['tshirt', 'tank', 'longsl', 'hoodie', 'thermal', 'jacket', 'sweater', 'raincoat', 'jeans', 'cargo', 'shorts', 'cap']);   // однотонные — можно выбрать цвет
const ngWear = {shirt:{id:'tshirt'}, torso:{id:null}, legs:{id:'jeans'}, feet:{id:'sneakers'}, head:{id:null}};
function ngCloth() { const c = {v:34}; for (const [s] of NG_WEAR) { const w = ngWear[s]; if (w && w.id && ITEMS[w.id]) { c[s] = {id:w.id}; if (w.col) c[s].col = w.col.slice(); } } return c; }

// ---- мир ----
const NG_WORLD = [
  ['zk', 'Мертвецов', [[.5, 'Мало'], [1, 'Обычно'], [1.6, 'Много'], [2.4, 'Орда']]],
  ['zspd', 'Скорость', [[.85, 'Шаркают'], [1, 'Обычная'], [1.15, 'Быстрые']]],
  ['fastK', 'Бегуны', [[0, 'Нет'], [.5, 'Редко'], [1, 'Обычно'], [2, 'Часто']]],
  ['dmgk', 'Укусы', [[.7, 'Слабые'], [1, 'Обычные'], [1.35, 'Сильные']]],
  ['lootk', 'Находки', [[1.5, 'Щедро'], [1, 'Обычно'], [.6, 'Скудно']]],
  ['mut', 'Особые', [[false, 'Нет'], [true, 'Громилы и крикуны']]],
  ['season', 'Сезон', null],
  ['hour', 'Начало', [[7, 'Утро'], [13, 'День'], [19, 'Вечер'], [23, 'Ночь']]],
  ['power', 'Свет', [[3, '3 дня'], [8, '8 дней'], [15, '15 дней'], [30, '30 дней'], [0, 'Никогда']]],
  ['water', 'Вода', [[3, '3 дня'], [9, '9 дней'], [15, '15 дней'], [30, '30 дней'], [0, 'Никогда']]],
  ['rainK', 'Погода', [[.4, 'Сухо'], [1, 'Обычно'], [1.8, 'Дождливо']]],
  ['hordeK', 'Орды', [[0, 'Нет'], [.6, 'Редко'], [1, 'Обычно'], [1.7, 'Часто']]],
  ['sosK', 'Сигнализации', [[0, 'Нет'], [.6, 'Редко'], [1, 'Обычно'], [1.8, 'Часто']]],
];
Object.assign(NEWCFG, {zk:1, zspd:1, fastK:1, dmgk:1, lootk:1, hour:7, rainK:1, hordeK:1, sosK:1});
// сложность — набор положений ползунков; выбрал сложность — ползунки встали, сдвинул ползунок — сложность «своя»
const NG_PRESETS = {
  easy:{name:'Лёгкая', info:'Мертвецов мало, они шаркают и слабо кусают, бегунов почти нет, вещей больше, орды редко.', zk:.5, zspd:.85, fastK:.5, dmgk:.7, lootk:1.5, hordeK:.6},
  normal:{name:'Обычная', info:'Как задумано: выжить трудно, но можно.', zk:1, zspd:1, fastK:1, dmgk:1, lootk:1, hordeK:1},
  hard:{name:'Тяжёлая', info:'Мертвецов много, они быстрые и кусают сильно, бегунов вдвое больше, вещей мало, орды часто.', zk:1.6, zspd:1.15, fastK:2, dmgk:1.35, lootk:.6, hordeK:1.7},
};
const NG_PKEYS = ['zk', 'zspd', 'fastK', 'dmgk', 'lootk', 'hordeK'];
const ngPreset = () => Object.keys(NG_PRESETS).find(k => NG_PKEYS.every(q => NG_PRESETS[k][q] === NEWCFG[q])) || 'own';
const ngMods = () => true;
const FIXED_SEED = 2718;                                                      // город один и тот же: проверенная раскладка домов и вещей

// ---- превью: поворачивается сам, стрелками — вручную; идёт или стоит ----
let ngDir = 1, ngWalk = true, ngTurnT = 0;
const prevCache = new Map();
function drawPreview() {
  const cvp = $('cPrev'), g = cvp.getContext('2d');
  g.clearRect(0, 0, cvp.width, cvp.height);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(120, 282, 52, 16, 0, 0, 6.283); g.fill();
  if (performance.now() > ngTurnT) { ngTurnT = performance.now() + 2200; ngDir = (ngDir + 1) % 8; }
  const an = ngWalk ? 'walk' : 'idle', cl = ngCloth(), rig = heroRig(look), n = (rig ? ART.meta.anims[heroPre(look)] : ART.meta.anims.p)[an];   // число кадров — по полу превью, а не героя меню
  let name, key, pal;
  if (rig) {
    const top = cl.shirt || cl.torso, legs = cl.legs && ITEMS[cl.legs.id].cov === 'pants', v = top ? (legs ? 'f' : 't') : '', vv = v && ART.meta.frames[heroPre(look) + v + '_idle_0_0'] ? v : '';
    name = heroPre(look) + vv + '_' + an + '_' + ngDir + '_' + (Math.floor(animT * (ngWalk ? 18 : 4)) % n);
    pal = {outfit:outfitRegs(cl, look)}; key = 'NG' + look.g + '|' + outfitKey(cl, look);
  } else {
    name = 'pf_' + an + '_' + ngDir + '_' + (Math.floor(animT * (ngWalk ? 12 : 3)) % n);
    pal = lookPal(look); const t = cl.torso || cl.shirt, h = cl.head, s = cl.shirt, l = cl.legs, col = c => c.col || ITEMS[c.id].col;
    if (t) pal[3] = pal[4] = col(t); if (cl.torso && s) pal[4] = col(s); if (l) pal[5] = col(l); if (h) pal[2] = col(h);
    key = 'NGF|' + JSON.stringify([look.skin, look.hair, cl]);
  }
  const fr = charFrame(name, key, pal, true); if (!fr) return;
  const ps = 3.5 / ((fr && fr.s) || ART.meta.charScale || 1);
  g.imageSmoothingEnabled = false; g.drawImage(fr.cv, 120 - fr.ax * ps, 282 - fr.ay * ps, fr.w * ps, fr.h * ps);
}

// ---- экран ----
let cTab = 'look';
function showCTab(t) {
  cTab = t;
  for (const b of $('cTabs').children) b.classList.toggle('on', b.dataset.t === t);
  for (const o of document.querySelectorAll('#create .opts')) o.hidden = o.dataset.tab !== t;
  const o = document.querySelector('#create .opts:not([hidden])'); if (o) o.scrollTop = 0;
  cSummary();
}
function cSummary() {
  const s = $('cSum'); if (!s) return;
  const prof = (PROFS[newProf] || PROFS.none).name, nt = (newTraits || []).length, se = SEASONS[NEWCFG.season] ? SEASONS[NEWCFG.season].name : '';
  const p = ngPreset(), df = p === 'own' ? 'своя сложность' : NG_PRESETS[p].name.toLowerCase();
  s.innerHTML = '<b>' + prof + '</b> · ' + (AGES[look.age] || AGES.mid).name.toLowerCase() + ', ' + (BUILDS[look.build] || BUILDS.avg).name.toLowerCase() + (nt ? ' · черт: ' + nt : '') + '<br>' + se + ' · ' + df;
}
function ngIcon(id, size) { return id && ITEMS[id] ? iconEl(id, size || 26) : mk('span', 'noic', '—'); }
function renderLook() {
  const re = () => { prevCache.clear(); renderLook(); cSummary(); };
  seg($('oGender'), [['m', 'Мужчина'], ['f', 'Женщина']], () => look.g, v => { const auto = !look.name || look.name === look._auto; look.g = v; if (v === 'f' && look.hair < 0) look.hair = 0; if (auto) { look.name = look._auto = randomName(v); $('cName').value = look.name; } re(); });
  seg($('oAge'), Object.entries(AGES).map(([k, a]) => [k, lkName(a, look)]), () => look.age, v => { look.age = v; re(); });
  $('oAgeInfo').textContent = (AGES[look.age] || AGES.mid).info;
  seg($('oBuild'), Object.entries(BUILDS).map(([k, a]) => [k, lkName(a, look)]), () => look.build, v => { look.build = v; re(); });
  $('oBuildInfo').textContent = (BUILDS[look.build] || BUILDS.avg).info;
  swatches($('oSkin'), LOOK.skin, () => look.skin, v => { look.skin = v; re(); });
  swatches($('oHair'), LOOK.hair, () => look.hair, v => { look.hair = v; re(); }, look.g === 'm');
}
function renderWear() {
  const box = $('oWear'); box.textContent = '';
  for (const [slot, label, ids] of NG_WEAR) {
    const row = mk('div', 'opt wrow'), w = ngWear[slot]; row.appendChild(mk('span', 'olbl', label));
    const list = mk('div', 'witems');
    for (const id of ids) {
      if (id && !ITEMS[id]) continue;
      const b = btn('', () => { w.id = id; if (!NG_RECOLOR.has(id)) delete w.col; SFX.ui(); renderWear(); cSummary(); }, 'witem' + (w.id === id ? ' on' : ''));
      b.appendChild(ngIcon(id)); b.appendChild(mk('span', '', id ? (ITEMS[id].sh || ITEMS[id].name) : 'Нет')); b.title = id ? ITEMS[id].name : 'Без вещи'; list.appendChild(b);
    }
    row.appendChild(list); box.appendChild(row);
    if (w.id && NG_RECOLOR.has(w.id)) {
      const cr = mk('div', 'opt wcol'); cr.appendChild(mk('span', 'olbl', ''));
      const sw = mk('div', 'sw'), def = ITEMS[w.id].col;
      [def].concat(NG_COLS).forEach((c, i) => { const b = btn('', () => { if (i) w.col = c.slice(); else delete w.col; renderWear(); }, ((i === 0 && !w.col) || (w.col && i && w.col.join() === c.join()) ? 'on' : '')); b.style.background = `rgb(${c.join(',')})`; b.setAttribute('aria-label', i ? 'Цвет ' + i : 'Как есть'); sw.appendChild(b); });
      cr.appendChild(sw); box.appendChild(cr);
    }
  }
}
function renderProf() {
  const grid = $('oProfs'); grid.textContent = '';
  for (const [k, p] of Object.entries(PROFS)) {
    const b = btn('', () => { newProf = k; SFX.ui(); renderProf(); cSummary(); }, 'pcard' + (newProf === k ? ' on' : ''));
    b.appendChild(ngIcon(p.icon || (p.items && p.items[0]), 34)); b.appendChild(mk('span', '', p.name)); grid.appendChild(b);
  }
  const p = PROFS[newProf] || PROFS.none, det = $('oProfDet'); det.textContent = '';
  det.appendChild(mk('b', 'pname', p.name)); det.appendChild(mk('p', 'pinfo', p.info));
  const sk = Object.entries(p.sk || {});
  if (sk.length) { const sl = mk('div', 'pskills'); for (const [s, lv] of sk) { const r = mk('div', 'psk'); r.appendChild(mk('span', '', (SKILLS[s] || {name:s}).name)); const dots = mk('i'); for (let q = 0; q < 5; q++) dots.appendChild(mk('u', q < lv ? 'f' : '')); r.appendChild(dots); sl.appendChild(r); } det.appendChild(sl); }
  if (p.items && p.items.length) { const il = mk('div', 'pitems'); il.appendChild(mk('small', '', 'С собой:')); for (const id of p.items) { const c = mk('span', 'pit'); c.appendChild(ngIcon(id, 30)); c.title = ITEMS[id].name; il.appendChild(c); } det.appendChild(il); }
}
function renderWorld() {
  const pr = ngPreset();
  seg($('oDiff'), Object.entries(NG_PRESETS).map(([k, d]) => [k, d.name]).concat(pr === 'own' ? [['own', 'Своя']] : []), ngPreset, v => { if (v === 'own') return; for (const q of NG_PKEYS) NEWCFG[q] = NG_PRESETS[v][q]; renderWorld(); cSummary(); });
  $('oDiffInfo').textContent = pr === 'own' ? 'Своя настройка — подстроено по отдельности.' : NG_PRESETS[pr].info + ' Ниже можно подстроить по отдельности.';
  const box = $('oWorld'); box.textContent = '';
  for (const [k, label, opts0] of NG_WORLD) {
    const opts = opts0 || Object.entries(SEASONS).map(([s, d]) => [s, d.name]);
    const row = mk('div', 'opt'); row.appendChild(mk('span', 'olbl', label)); const sg = mk('div', 'seg'); row.appendChild(sg); box.appendChild(row);
    seg(sg, opts, () => NEWCFG[k], v => { NEWCFG[k] = v; renderWorld(); cSummary(); });
    if (k === 'season') box.appendChild(mk('p', 'rec', SEASONS[NEWCFG.season].info));
    if (k === 'water') box.appendChild(mk('p', 'rec', 'Через сколько дней в городе отключат электричество и водопровод'));
  }
}
function ngRandom() {
  look.g = Math.random() < .5 ? 'm' : 'f'; look.name = look._auto = randomName(look.g); look.age = rpick(Object.keys(AGES)); look.build = rpick(Object.keys(BUILDS));
  look.skin = Math.floor(Math.random() * LOOK.skin.length); look.hair = look.g === 'm' && Math.random() < .15 ? -1 : Math.floor(Math.random() * LOOK.hair.length);
  for (const [slot, , ids] of NG_WEAR) { const w = ngWear[slot]; w.id = rpick(ids.filter(id => !id || ITEMS[id])); delete w.col; if (w.id && NG_RECOLOR.has(w.id) && Math.random() < .6) w.col = rpick(NG_COLS).slice(); }
  newProf = rpick(Object.keys(PROFS));
  newTraits = []; const T = Object.keys(TRAITS).sort(() => Math.random() - .5);
  for (const k of T.slice(0, 3)) if (TRAITS[k].pts < 0 && newTraits.length < 2 && !newTraits.includes(TRAITS[k].vs)) newTraits.push(k);
  for (const k of T) { const t = TRAITS[k]; if (t.pts > 0 && newTraits.length < 4 && traitPts() - t.pts >= 0 && !newTraits.includes(t.vs) && !newTraits.includes(k)) newTraits.push(k); }
  $('cName').value = look.name; prevCache.clear(); ngRender();
}
function ngRender() { renderLook(); renderWear(); renderProf(); renderTraitsUI(); renderWorld(); cSummary(); }
function openCreate() {
  show('create'); prevCache.clear();
  if (!look.age) look.age = 'mid'; if (!look.build) look.build = 'avg';
  if (!look.name) look.name = look._auto = randomName(look.g);
  $('cName').value = look.name;
  ngRender(); showCTab('look');
}
$('cTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; SFX.ui(); showCTab(b.dataset.t); });
document.getElementById('create').addEventListener('click', () => setTimeout(cSummary, 0));
$('cName').addEventListener('input', e => { look.name = e.target.value.trim(); });
$('cNameR').addEventListener('click', () => { SFX.ui(); look.name = look._auto = randomName(look.g); $('cName').value = look.name; });
$('cRotL').addEventListener('click', () => { ngDir = (ngDir + 7) % 8; ngTurnT = performance.now() + 6000; });
$('cRotR').addEventListener('click', () => { ngDir = (ngDir + 1) % 8; ngTurnT = performance.now() + 6000; });
$('cPose').addEventListener('click', () => { ngWalk = !ngWalk; $('cPose').textContent = ngWalk ? 'Идёт' : 'Стоит'; });
$('cRand').addEventListener('click', () => { SFX.ui(); ngRandom(); });

// ---- старт новой игры: до постройки мира — сложность и настройки мира, после — одежда, профессия, возраст, время ----
let ngBase = null;
onStartNew(() => {
  if (ngBase) { newDiff = ngBase; ngBase = null; }
  if (!P) return;
  if (!P.look.name) P.look.name = randomName(P.look.g);
  P.pk = profPk(P.prof);
  const age = AGES[P.look.age];
  if (age && age.skill) for (const k in (PROFS[P.prof] || {}).sk || {}) P.skills[k] = XPL[Math.min(5, skillLv(k) + age.skill)];
  P.cloth = ngCloth();
  if (typeof invPlace === 'function') invPlace();
  const d = (NEWCFG.hour || 7) * 60 - gameMin % 1440;                         // время начала первого дня
  gameMin += d; startMin += d; powerOffAt += d; waterOffAt += d;
  logEv(P.look.name + '. ' + (PROFS[P.prof] || PROFS.none).name + '. Записываю, чтобы не забыть, кто я');
}, () => {
  world.fastK = NEWCFG.fastK; world.rainK = NEWCFG.rainK; world.hordeK = NEWCFG.hordeK; world.sosK = NEWCFG.sosK;
  { const p = ngPreset();                                                    // сложность целиком из ползунков
    DIFF.custom = {name:p === 'own' ? 'Своя' : NG_PRESETS[p].name, z:NEWCFG.zk, spd:NEWCFG.zspd, dmg:NEWCFG.dmgk, loot:NEWCFG.lootk, info:'Своя настройка'};
    ngBase = newDiff; newDiff = 'custom'; }
  NEWCFG.seedNum = FIXED_SEED;
});
onSave(d => { d.x81 = {custom:DIFF.custom || null, fastK:world.fastK, rainK:world.rainK, hordeK:world.hordeK, sosK:world.sosK}; });
onLoad(() => { if (P) P.pk = profPk(P.prof); }, d => {
  const x = (d && d.x81) || {}; if (x.custom) DIFF.custom = x.custom;
  world.fastK = x.fastK != null ? x.fastK : 1; world.rainK = x.rainK != null ? x.rainK : 1; world.hordeK = x.hordeK != null ? x.hordeK : 1; world.sosK = x.sosK != null ? x.sosK : 1;
});

// ---- двери не загорожены: мебель, вставшая вплотную к двери изнутри или снаружи, убирается при постройке мира ----
// (и для новой игры, и для загрузки — мир строится одинаково, поэтому номера мебели в сохранении совпадают)
onNewWorld(() => {
  let n = 0;
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
    if (map[y * MW + x] !== DOOR) continue;
    const ax = alongX(x, y);
    for (const [qx, qy] of ax ? [[x, y - 1], [x, y + 1]] : [[x - 1, y], [x + 1, y]]) { const j = qy * MW + qx, f = furn[j] && furns[furn[j] - 1]; if (f && !f.gone) { f.gone = true; n++; }
      const p = propAt[j] && props[propAt[j] - 1]; if (p && p.solid && p.type !== 'fence' && p.type !== 'pfence') p.solid = false; }   // почтовый ящик у самой двери — обходится
  }
  if (n) reRegisterAll();
});
