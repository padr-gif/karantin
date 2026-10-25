// ================= v23: injuries & first aid, traits, panic & gloom, tailoring, mechanics, stealth, firearms, special zombies, base defence, storage & canning =================
function hasTr(k) { return !!(P && P.traits && P.traits.indexOf(k) >= 0); }
const giveItem = (it, x, y) => { if (!invFull()) { P.inv.push(it); return true; } addToPile(x == null ? P.x : x, y == null ? P.y : y, it); return false; };
// ---- new skills, their journal series, professions ----
Object.assign(SKILLS, {
  med:{name:'Первая помощь', per:'раны заживают быстрее, повязки дольше чистые'},
  tail:{name:'Портняжное дело', per:'зашиваешь и утепляешь одежду'},
  mech:{name:'Механика', per:'чинишь машины, сливаешь бензин, заводишь без ключа'},
});
Object.assign(MAGS, {med:{series:'«Скорая помощь»', base:'book_med'}, tail:{series:'«Кройка и шитьё»', base:'book_tail'}, mech:{series:'«За рулём»', base:'book_mech'}});
for (const k of ['med', 'tail', 'mech']) {
  const m = MAGS[k];
  for (const n of [1, 2, 3]) {
    const id = n === 1 ? m.base : m.base + n;
    ITEMS[id] = {name:'Журнал ' + m.series + ' №' + n, sh:'Журнал №' + n, kind:'book', skill:k, vol:n, verb:'Читать'};
    if (n > 1) ICONA[id] = m.base;
    DESC[id] = 'Журнал для ' + (n === 1 ? 'новичков' : n === 2 ? 'опытных' : 'мастеров') + ' о навыке «' + SKILLS[k].name + '». Подходит на уровнях ' + MAG_TIER[n][0] + '–' + (MAG_TIER[n][1] + 1) + '. Прочитав, учишься втрое быстрее, пока не перерастёшь журнал.';
  }
}
PROFS.medic.sk = {med:3};
PROFS.medic.info = 'Первая помощь 3, раны заживают в 1,5 раза быстрее. С собой бинты и антибиотики.';
PROFS.tailor = {name:'Портной', info:'Портняжное дело 3. С собой набор для шитья и тряпки.', sk:{tail:3}, items:['sewkit', 'rag', 'rag']};
PROFS.mech = {name:'Автомеханик', info:'Механика 3: чинит машины и заводит их без ключа. С собой разводной ключ и металлолом.', sk:{mech:3}, items:['wrench', 'scrap']};

// ---- new items ----
Object.assign(ITEMS, {
  splint:{name:'Шина', kind:'misc', verb:'Наложить шину', info:'фиксирует перелом: срастается вчетверо быстрее'},
  sewkit:{name:'Набор для шитья', sh:'Шитьё', kind:'misc', uses:6, verb:'Как шить?', info:'иголка и нитки'},
  scrap:{name:'Металлолом', kind:'misc', info:'ремонт машин и листы на окна'},
  pistol:{name:'Пистолет Макарова', sh:'ПМ', kind:'weapon', gun:true, ammo:'ammo9', mag:8, dmg:54, range:9.5, cd:.36, cleave:1, dur:240, melee:12, loud:26, reload:1.6, verb:'Взять в руки'},
  shotgun:{name:'Охотничье ружьё', sh:'Ружьё', kind:'weapon', gun:true, ammo:'shells', mag:2, dmg:80, range:6.5, cd:.85, cleave:3, dur:150, melee:20, loud:34, reload:2.4, spread:.42, verb:'Взять в руки'},
  ammo9:{name:'Патроны 9 мм', sh:'9 мм', kind:'ammo', uses:16, gun:'pistol', verb:'Зарядить'},
  shells:{name:'Патроны 12 калибра', sh:'Дробь', kind:'ammo', uses:10, gun:'shotgun', verb:'Зарядить'},
  lure:{name:'Шумовая приманка', sh:'Приманка', kind:'misc', verb:'Поставить'},
  jam:{name:'Варенье', kind:'food', sat:20, calm:8, sweet:true, leaves:'jar', verb:'Открыть и съесть'},
  stewH:{name:'Домашняя тушёнка', sh:'Тушёнка', kind:'food', sat:46, leaves:'jar', verb:'Открыть и съесть'},
  fishJ:{name:'Рыбные консервы', sh:'Рыба в банке', kind:'food', sat:38, leaves:'jar', verb:'Открыть и съесть'},
  kraut:{name:'Квашеная капуста', sh:'Квашеная', kind:'food', sat:16, hyd:5, leaves:'jar', verb:'Открыть и съесть'},
  mushD:{name:'Сушёные грибы', sh:'Сушёные', kind:'food', sat:12, verb:'Съесть'},
});
ITEMS.pickles.leaves = 'jar';
ITEMS.rag.verb = 'Перевязать рану';
ITEMS.antisep.stop = false; ITEMS.antisep.clean = true; ITEMS.medkit.clean = true;
ITEMS.bandage.hp = 4; ITEMS.medkit.hp = 25; ITEMS.antisep.hp = 4;
for (const id of ['choco', 'candy', 'honey', 'condmilk']) if (ITEMS[id]) ITEMS[id].sweet = true;
Object.assign(DESC, {
  splint:'Две дощечки, плотно примотанные бинтом. Наложи на сломанную руку или ногу: кость срастётся вчетверо быстрее, а ходить станет легче.',
  sewkit:'Иголки, напёрсток и катушки ниток. С тряпками им можно зашить порванную одежду, а портной ещё и утеплит её подкладкой.',
  scrap:'Куски жести и железа. Нужны, чтобы залатать кузов машины или прибить лист на заколоченное окно. Добывается из разобранных машин.',
  pistol:'Пистолет Макарова на 8 патронов. Убивает с пары выстрелов, но грохот слышно за несколько кварталов. Когда патроны кончатся, им можно разве что ударить.',
  shotgun:'Двуствольное охотничье ружьё. Дробь разносит сразу нескольких мертвецов перед тобой. Заряжается двумя патронами, а выстрел поднимает всю округу.',
  ammo9:'Картонная пачка пистолетных патронов 9 мм. Подходят к пистолету Макарова.',
  shells:'Патроны 12 калибра с дробью. Подходят к охотничьему ружью.',
  lure:'Будильник, бутылки и изолента. Поставь подальше от дома: приманка загремит, когда мертвецы начнут ломиться к тебе, наступят на растяжку или подойдёт орда. Трёх заводов хватит на три раза, потом заведи снова.',
  jam:'Банка варенья из лесных ягод. Не портится, сладкое поднимает настроение. Пустую банку можно использовать снова.',
  stewH:'Мясо, тушёное и закатанное в банку. Хранится всю зиму.',
  fishJ:'Рыба, сваренная и закатанная в банку. Не портится.',
  kraut:'Капуста, заквашенная в банке. Хранится долго, немного утоляет жажду.',
  mushD:'Грибы, высушенные над огнём. Лёгкие, не портятся и безопасны.',
  antisep:'Пузырёк антисептика. Обеззараживает все раны: воспаление отступает и сутки не возвращается. Кровь не останавливает, для этого нужен бинт.',
  medkit:'Армейская аптечка: бинты, антисептик и пластыри. Перевязывает и обеззараживает все раны сразу и хорошо лечит, но работа занимает время.',
  bandage:'Чистый бинт. Перевязывает самую опасную рану и останавливает кровь. Через полсуток повязка грязнится, её стоит сменить.',
  rag:'Лоскуты ткани. Ими можно перевязать рану, но такая повязка быстро грязнится. Из двух тряпок выйдет чистый бинт (вкладка «Создать»).',
  pills:'Обезболивающее. Снимает боль на несколько часов и чуть-чуть восстанавливает здоровье.',
  painkill:'Блистер обезболивающего. Надолго снимает боль и немного успокаивает нервы.',
  antibio:'Антибиотики. Подавляют воспаление в ранах и сбивают жар после укуса, но сам укус не вылечат.',
});
{ const add = (k, ...ids) => CONT[k] && CONT[k].loot.push(...ids);
  add('locker', 'pistol', 'ammo9', 'ammo9', 'book_med', 'book_mech2'); add('armybox', 'shotgun', 'ammo9', 'shells', 'shells', 'splint', 'ammo9');
  add('desk', 'ammo9', 'book_mech'); add('wardrobe', 'shotgun', 'shells', 'sewkit', 'book_tail'); add('crate', 'shells', 'scrap', 'scrap', 'book_mech', 'book_mech2');
  add('toolrack', 'scrap', 'scrap', 'nails', 'book_mech', 'book_mech3'); add('car', 'scrap', 'shells', 'book_mech'); add('airdrop', 'ammo9', 'splint', 'sewkit', 'shells');
  add('dresser', 'sewkit', 'sewkit', 'book_tail', 'book_tail2'); add('nightstand', 'sewkit', 'book_med', 'book_tail'); add('hanger', 'sewkit');
  add('medcab', 'splint', 'book_med'); add('medshelf', 'splint', 'splint', 'book_med2', 'book_med3'); add('bin', 'scrap', 'rag');
  add('bookshelf', 'book_med', 'book_med2', 'book_med3', 'book_tail', 'book_tail2', 'book_tail3', 'book_mech', 'book_mech2', 'book_mech3'); add('shelf', 'sewkit'); add('counter', 'book_mech'); }
if (LOOTK.pharmacy && LOOTK.pharmacy.medshelf) LOOTK.pharmacy.medshelf.push('splint', 'book_med', 'book_med2');
Object.assign(WSPEC, {
  pistol:{segs:[[0, 2.2, 1.6, '#2b2a2c'], [2.2, 5.2, 1.25, '#3b3e44']]},
  shotgun:{segs:[[0, 4, 1.7, '#7a5232'], [4, 6, 1.2, '#2e3034'], [6, 14.5, .85, '#45484e']]},
});

// ---- timed jobs: anything that takes a few seconds and then runs a function ----
function job(dur, fn, extra) { closePanel(); P.act = Object.assign({kind:'job', t:0, dur, fn, an:'work'}, extra || {}); SFX.rustle(); }

// ================= injuries =================
const WOUND = {
  scratch:{name:'Царапина', bleed:.08, clot:25, heal:1440, pain:4, sep:.35},
  cut:{name:'Порез', bleed:.25, clot:150, heal:2880, pain:9, sep:1},
  deep:{name:'Рваная рана', bleed:.5, clot:0, heal:5040, pain:20, sep:1.25},
  bite:{name:'Укус', bleed:.38, clot:0, heal:4320, pain:16, sep:1.5},
  frac:{name:'Перелом', bleed:0, clot:0, heal:8640, pain:32, sep:0},
};
const WPART = {arm:['левая рука', 'правая рука'], leg:['левая нога', 'правая нога'], torso:['грудь', 'спина', 'живот'], head:['голова'], neck:['шея']};
const PARTW = [['arm', .38], ['torso', .26], ['leg', .14], ['head', .1], ['neck', .12]];
function rollPart() { let r = rng(); for (const [p, w] of PARTW) { r -= w; if (r < 0) return p; } return 'arm'; }
function wounds() { return P.wounds || (P.wounds = []); }
function addWound(k, part, where) {
  const W = wounds(); part = part || rollPart(); where = where || pick(WPART[part]);
  if (k === 'frac' && W.some(w => w.k === 'frac' && w.where === where)) return null;
  const w = {k, part, where, t:0, band:0, bT:0, cl:0, sep:0, h:0, spl:0};
  w.day = Math.floor((gameMin - startMin) / 1440) + 1;                          // для шрама: когда и при каких обстоятельствах
  w.ctx = P.act && P.act.kind === 'vault' ? 'когда лез через окно' : zs.some(z => Math.hypot(z.x - P.x, z.y - P.y) < 1.6) ? 'в драке с мертвецом' : insideHouse(P.x, P.y) ? 'в доме' : 'на улице';
  W.push(w);
  if (k !== 'scratch') logEv(WOUND[k].name + ': ' + where);
  while (W.length > 9) { const j = W.findIndex(x => x.k === 'scratch'); W.splice(j >= 0 ? j : 0, 1); }
  return w;
}
function bleeding(w) { const D = WOUND[w.k]; return D.bleed > 0 && !w.band && (!D.clot || w.t < D.clot); }
function bleedRate() { let s = 0; for (const w of wounds()) if (bleeding(w)) s += WOUND[w.k].bleed; return s || (P.bleed ? .3 : 0); }
const fracAt = part => wounds().find(w => w.k === 'frac' && w.part === part);
const dirtyBand = w => w.band && w.bT > 720;
function needBand(w) { return w.k !== 'frac' && (!w.band || dirtyBand(w)) && (bleeding(w) || w.k !== 'scratch' || w.t < 240); }
// множитель скорости ходьбы: перелом, захват, боль, обувь и одежда, бег, перегруз
function moveK() {
  let k = 1; const lf = fracAt('leg'); if (lf) k *= lf.spl ? .78 : .55; if (P.grabT > 0) k *= .25; if ((P.pain || 0) > 60) k *= .9;
  const o = invOver();
  return k * wornK('spd') * (barefoot() ? .9 : 1) * (P && P.running ? .88 : 1) * (o > 0 ? Math.max(.5, 1 - o * .55) : 1);
}
function canRun() { return !fracAt('leg') && !(P.grabT > 0); }
function healK() { return (P.prof === 'medic' ? 1.5 : 1) * (1 + .1 * skillLv('med')) * (hasTr('fastheal') ? 1.5 : 1) * (hasTr('slowheal') ? .66 : 1); }
function tickWounds(gm) {
  const before = wounds().slice();
  const W = wounds();
  if (P.bleed && !W.some(bleeding)) addWound('cut', rng() < .6 ? 'arm' : 'leg');   // older code paths (glass) only flag bleeding
  const lv = skillLv('med');
  let hk = healK() * (P.sleep ? 2 : 1); if (P.sat < 15 || P.hyd < 15) hk *= .3;
  let fever = 0, pain = 0;
  for (let i = W.length - 1; i >= 0; i--) {
    const w = W[i], D = WOUND[w.k]; w.t += gm;
    if (w.band) w.bT += gm * (1 - .08 * lv);
    if (w.cl > 0) w.cl -= gm;
    if (D.sep) {
      if (w.cl > 0 || (w.band && !dirtyBand(w))) w.sep = Math.max(0, w.sep - gm * .02);
      else if (dirtyBand(w)) w.sep = Math.min(100, w.sep + gm * .04 * D.sep);
      else if (w.k !== 'scratch' || w.t < 360) w.sep = Math.min(100, w.sep + gm * .085 * D.sep * ((P.wet || 0) > 50 ? 1.4 : 1));
    }
    if (!bleeding(w) && w.sep < 45) {
      let r = hk / D.heal;
      if (w.k === 'frac' && !w.spl) r *= .25;
      if (w.k !== 'frac' && w.k !== 'scratch' && !w.band && !(w.cl > 0)) r *= .4;
      w.h += gm * r;
    }
    if (w.h >= 1) { W.splice(i, 1); toast('Зажило: ' + D.name.toLowerCase() + ', ' + w.where); if (w.k !== 'scratch') logEv('Зажило: ' + D.name.toLowerCase() + ', ' + w.where); addXp('med', 1); if (w.k === 'frac') ach('splint'); continue; }
    if (w.sep > 50) fever = Math.max(fever, (w.sep - 50) / 50);
    pain += D.pain * (1 - w.h * .7) * (w.spl ? .45 : 1) * (w.sep > 50 ? 1.3 : 1);
  }
  if (fever > 0) { P.hp -= gm * (.025 * fever + (fever > .9 ? .04 : 0)); P.en = Math.max(0, P.en - gm * .03 * fever); lastCause = 'Заражение раны'; }
  if (P.painkT > 0) { P.painkT -= gm; pain *= .35; }
  P.pain = Math.min(100, pain); P.fever = fever;
  P.bleed = W.some(bleeding);
  // зажившая рана оставляет шрам
  const now = wounds();
  for (const w of before) if (!now.includes(w) && w.h >= 1 && w.k !== 'scratch') {
    P.scars = P.scars || [];
    const D = WOUND[w.k], seed = (P.scars.length * 37 + (w.where || '').length * 11) % 100;
    P.scars.push({k:w.k, where:w.where, day:w.day || Math.floor((gameMin - startMin) / 1440) + 1, ctx:w.ctx || '', s:seed});
    logEv('Остался шрам: ' + D.name.toLowerCase() + ', ' + w.where);
  }
}
// treatment: which wound an item goes to, and what it does
function woundFor(id) {
  const W = wounds();
  if (id === 'splint') return W.find(w => w.k === 'frac' && !w.spl) || null;
  if (id === 'antisep') return W.find(w => WOUND[w.k].sep && !(w.cl > 0)) || null;
  const nb = W.filter(needBand).sort((a, b) => (bleeding(b) - bleeding(a)) || (WOUND[b.k].bleed - WOUND[a.k].bleed) || (b.sep - a.sep));
  return nb[0] || null;
}
function applyTreat(id, w) {
  const k = P.inv.findIndex(i => i.id === id); if (k < 0) { toast('Нет: ' + ITEMS[id].name.toLowerCase()); return false; }
  const W = wounds(), lv = skillLv('med');
  if (id === 'splint') { if (!w) return false; w.spl = 1; P.inv.splice(k, 1); addXp('med', 3); toast('Шина наложена: ' + w.where + '. Кость срастётся быстрее'); }
  else if (id === 'antisep') { let n = 0; for (const x of W) if (WOUND[x.k].sep) { x.cl = 1440; x.sep = Math.max(0, x.sep - 40); n++; } if (!n) { toast('Обрабатывать нечего'); return false; } P.inv.splice(k, 1); P.hp = Math.min(100, P.hp + 4); addXp('med', 1); toast('Раны обработаны антисептиком. Щиплет'); }
  else if (id === 'medkit') {
    let n = 0; for (const x of W) { if (needBand(x)) { x.band = 1; x.bT = 0; n++; } if (WOUND[x.k].sep) { x.cl = 1440; x.sep = Math.max(0, x.sep - 40); n++; } }
    P.inv.splice(k, 1); P.hp = Math.min(100, P.hp + 25); addXp('med', n ? 2 : 0); toast(n ? 'Аптечка: все раны перевязаны и обработаны' : 'Обработал ссадины. Стало легче');
  } else {
    if (!w) { toast('Перевязывать нечего'); return false; }
    const was = w.band; w.band = 1; w.bT = id === 'rag' ? 560 : -60 * lv; P.inv.splice(k, 1);
    if (id === 'bandage') P.hp = Math.min(100, P.hp + 4);
    addXp('med', 1); toast((was ? 'Повязка сменена: ' : id === 'rag' ? 'Рана перевязана тряпкой: ' : 'Рана перевязана: ') + w.where + (id === 'rag' ? '. Повязка быстро загрязнится' : ''));
  }
  P.bleed = W.some(bleeding); SFX.rustle(); renderInv(); updateHud(); return true;
}
const TREAT_DUR = {bandage:1.8, rag:2.2, splint:3, antisep:2, medkit:2.4};
function startTreat(id, w) { const part = panel && panel.part; job(TREAT_DUR[id] || 2, () => applyTreat(id, w), {reopen:'self', sub:'body', part}); }

// ---- getting hurt: body parts, clothes take the bite, brutes break bones, crawlers grab ankles ----
const cdur = it => it.cd == null ? 100 : it.cd;
const slotOf = part => part === 'head' || part === 'neck' ? 'head' : part === 'torso' || part === 'arm' ? 'torso' : null;
let clothAt = part => { const s = slotOf(part); return s && P.cloth ? P.cloth[s] : null; };
function partProt(part) {
  let keep = 1; for (const c of coverOf(part)) keep *= 1 - (ITEMS[c.id].prot || 0) * cdur(c) / 100;
  let p = 1 - keep; if (part === 'neck') p *= .4; return Math.min(.7, p);
}
function tearCloth(c, k) {
  if (!c || ITEMS[c.id].slot === 'wrist') return;
  const before = cdur(c); c.cd = Math.max(0, before - (3 + rng() * 6) * (k || 1));
  if (before > 0 && c.cd <= 0) toast(ITEMS[c.id].name + ': порвано в клочья, почти не греет');
  else if (before >= 50 && c.cd < 50) toast(ITEMS[c.id].name + ': порвано. Зашей, пока не развалилось');
}
function crashInjury(v) {
  if (rng() > .4) return;
  if (rng() < .45) { const fp = rng() < .5 ? 'arm' : 'leg', f = addWound('frac', fp); if (f) { toast('Удар о руль! Перелом: ' + f.where); P.hp -= 8; lastCause = 'Авария'; return; } }
  const w = addWound(rng() < .5 ? 'cut' : 'deep', rng() < .5 ? 'head' : 'arm'); P.hp -= 5; lastCause = 'Авария'; toast('Ударился в аварии: ' + WOUND[w.k].name.toLowerCase() + ', ' + w.where);
}

// ================= traits =================
const TRAITS = {
  eagle:{name:'Зоркий', pts:3, info:'видишь на 4 клетки дальше, в темноте тоже', vs:'short'},
  athlete:{name:'Спортсмен', pts:4, info:'бегаешь на 15% быстрее и меньше устаёшь на бегу'},
  strong:{name:'Силач', pts:4, info:'урон в ближнем бою +20%', vs:'weak'},
  quiet:{name:'Тихоня', pts:3, info:'шаги и бег вдвое тише', vs:'clumsy'},
  fastlearn:{name:'Схватывает на лету', pts:4, info:'опыт +30%', vs:'slowlearn'},
  irongut:{name:'Железный желудок', pts:2, info:'вдвое реже травишься', vs:'weakgut'},
  thick:{name:'Толстокожий', pts:3, info:'укусы и царапины реже ранят', vs:'thin'},
  wakeful:{name:'Мало спит', pts:3, info:'бодрость тратится на 30% медленнее', vs:'sleepy'},
  brave:{name:'Хладнокровный', pts:3, info:'паника растёт вдвое медленнее', vs:'coward'},
  organized:{name:'Организованный', pts:3, info:'+4 места в рюкзаке'},
  fastheal:{name:'Быстро заживает', pts:3, info:'раны заживают в 1,5 раза быстрее', vs:'slowheal'},
  hardy:{name:'Закалённый', pts:2, info:'меньше мёрзнешь и реже простужаешься', vs:'cold'},
  short:{name:'Близорукий', pts:-2, info:'видишь на 4 клетки меньше', vs:'eagle'},
  clumsy:{name:'Неуклюжий', pts:-2, info:'шаги громче в полтора раза', vs:'quiet'},
  weak:{name:'Хилый', pts:-3, info:'урон в ближнем бою −20%', vs:'strong'},
  slowlearn:{name:'Тугодум', pts:-3, info:'опыт −30%', vs:'fastlearn'},
  weakgut:{name:'Слабый желудок', pts:-2, info:'травишься чаще', vs:'irongut'},
  thin:{name:'Неженка', pts:-3, info:'укусы чаще ранят', vs:'thick'},
  sleepy:{name:'Соня', pts:-2, info:'устаёшь на 30% быстрее', vs:'wakeful'},
  coward:{name:'Трусишка', pts:-3, info:'паника растёт вдвое быстрее', vs:'brave'},
  smoker:{name:'Курильщик', pts:-2, info:'без сигарет через полсуток начинаешь нервничать'},
  slowheal:{name:'Плохо заживает', pts:-3, info:'раны заживают в полтора раза дольше', vs:'fastheal'},
  cold:{name:'Мерзляк', pts:-2, info:'мёрзнешь заметно быстрее', vs:'hardy'},
  hearty:{name:'Обжора', pts:-3, info:'голод растёт на 30% быстрее'},
  insomnia:{name:'Бессонница', pts:-2, info:'сон восстанавливает силы медленнее'},
};
const TRAIT_FREE = 2;
let newTraits = [];
const traitPts = () => TRAIT_FREE - newTraits.reduce((s, k) => s + TRAITS[k].pts, 0);
function renderTraitsUI() {
  const box = $('oTraits'); if (!box) return; box.textContent = '';
  const info = $('oTraitInfo'), left = traitPts();
  for (const [k, t] of Object.entries(TRAITS)) {
    const on = newTraits.includes(k), b = btn('', () => {
      if (on) newTraits = newTraits.filter(x => x !== k);
      else {
        if (t.vs) newTraits = newTraits.filter(x => x !== t.vs);
        if (t.pts > 0 && traitPts() - t.pts < 0) { if (info) info.textContent = 'Не хватает очков на «' + t.name + '». Возьми плохую черту, чтобы получить очки'; return; }
        newTraits.push(k);
      }
      renderTraitsUI(); if (info) info.textContent = t.name + ': ' + t.info + '. Осталось очков: ' + traitPts();
    }, (t.pts > 0 ? 'pos' : 'neg') + (on ? ' on' : ''));
    b.appendChild(document.createTextNode(t.name)); b.appendChild(mk('small', '', (t.pts > 0 ? '−' : '+') + Math.abs(t.pts)));
    b.title = t.info; box.appendChild(b);
  }
  const pts = $('oTraitPts'); if (pts) { pts.textContent = 'Очки: ' + left; pts.classList.toggle('neg', left < 0); }
  if (info && !info.textContent) info.textContent = 'Хорошие черты стоят очков, плохие их дают. Можно ничего не выбирать.';
}
onStartNew(() => {
  P.traits = newTraits.slice();
  if (hasTr('organized')) { P.capB = 4; P.cap += 4; }
  if (hasTr('smoker')) P.inv.push(mkItem('cigs'), mkItem('lighter'));
});

// ================= panic & gloom =================
function panicK() { return (hasTr('brave') ? .5 : 1) * (hasTr('coward') ? 2 : 1) * ((P.stress || 0) > 60 ? 1.3 : 1) * (1 - .06 * fitLv()); }
function tickMind(dt, gm) {
  let near = 0, close = 0;
  for (const z of zs) { if (z.state !== 'chase') continue; const d = Math.hypot(z.x - P.x, z.y - P.y); if (d < 9) { near++; if (d < 2.6) close++; } }
  P.panic = P.panic || 0;
  const armed = P.weapon && ITEMS[P.weapon.id].gun && P.weapon.mag > 0;
  if (near && !P.car && !P.sleep) P.panic = Math.min(100, P.panic + dt * (near * .7 + close * 1.0) * panicK() * (armed ? .75 : 1));
  else P.panic = Math.max(0, P.panic - dt * (insideHouse(P.x, P.y) || P.car ? 6 : 3.5));
  P.unh = P.unh || 0;
  let up = 0;
  if ((P.bored || 0) > 60) up += .012; if ((P.stress || 0) > 60) up += .012; if ((P.wet || 0) > 60) up += .006;
  if ((P.cold || 0) > 55) up += .008; if ((P.pain || 0) > 40) up += .008; if (P.sat < 20) up += .006;
  if (up) P.unh = Math.min(100, P.unh + gm * up); else P.unh = Math.max(0, P.unh - gm * (P.sleep ? .02 : .008));
  if (hasTr('smoker')) { P.smokeT = (P.smokeT || 0) + gm; if (P.smokeT > 720) { P.stress = Math.min(100, (P.stress || 0) + gm * .05); if (!P._smokeMsg) { P._smokeMsg = 1; toast('Хочется курить. Нервы шалят'); } } }
}
function missChance() { let m = Math.max(0, ((P.panic || 0) - 30) / 200); if ((P.pain || 0) > 40) m += (P.pain - 40) / 300; if (fracAt('arm')) m += .1; if (P.en < 10) m += .05; return Math.min(.45, m); }
// множитель урона: черты, перелом руки, уныние, боль, физподготовка, счастливая бита
function dmgK() { let k = 1; if (hasTr('strong')) k *= 1.2; if (hasTr('weak')) k *= .8; const af = fracAt('arm'); if (af) k *= af.spl ? .75 : .5; if ((P.unh || 0) > 80) k *= .85; if ((P.pain || 0) > 50) k *= .9; return k * (1 + .03 * fitLv()) * (P.weapon && P.weapon.u === 'bat' ? 1.2 : 1); }
let stepNoiseK = () => (hasTr('quiet') ? .5 : 1) * (hasTr('clumsy') ? 1.5 : 1);
let enDrainK = () => (1 - .05 * skillLv('fit')) * (hasTr('wakeful') ? .7 : 1) * (hasTr('sleepy') ? 1.3 : 1) * ((P.unh || 0) > 50 ? 1.2 : 1);

// ================= tailoring =================
const TEXTILE = new Set(['jacket', 'sweater', 'raincoat', 'hat', 'leather', 'parka', 'ushanka']);
function clothIns(c) { const d = ITEMS[c.id]; return (d.ins || 0) * (.4 + .6 * cdur(c) / 100) + (c.pad ? 2 : 0); }
const sewkit = () => P.inv.find(i => i.id === 'sewkit' && i.uses > 0);
const cutTool = () => ['knife', 'cleaver', 'machete', 'hatchet', 'axe'].find(hasTool);
function useSew() { const s = sewkit(); s.uses--; if (s.uses <= 0) { P.inv.splice(P.inv.indexOf(s), 1); toast('Нитки закончились'); } }
function tailorButtons(it, worn) {
  const d = ITEMS[it.id], out = [], lv = skillLv('tail'), sel = panel && panel.sel;
  if (d.kind !== 'cloth' || d.slot === 'wrist') return out;
  const cd = cdur(it), rags = countItem('rag');
  if (cd < 100) {
    const ok = sewkit() && rags >= 1, b = btn(ok ? 'Зашить · ' + Math.round(cd) + '%' : 'Зашить: нужны нитки и тряпка', () => job(3.2 * (1 - .08 * lv), () => {
      if (!sewkit() || !countItem('rag')) { toast('Не хватает ниток или тряпок'); return; }
      useSew(); removeItem('rag'); it.cd = Math.min(100, cdur(it) + 25 + 10 * lv); addXp('tail', 2); ach('sew'); SFX.rustle(); toast('Зашито: ' + d.name.toLowerCase() + ' ' + Math.round(it.cd) + '%');
    }, {reopen:'items', sel}), 'ghost'); b.disabled = !ok; out.push(b);
  }
  if (!it.pad && it.id !== 'helmet' && it.id !== 'raincoat') {
    const ok = sewkit() && rags >= 2 && lv >= 1, b = btn(ok ? 'Утеплить подкладкой' : lv < 1 ? 'Утеплить: нужен навык шитья 1' : 'Утеплить: нитки и 2 тряпки', () => job(4.5 * (1 - .08 * lv), () => {
      if (!sewkit() || countItem('rag') < 2) { toast('Не хватает ниток или тряпок'); return; }
      useSew(); removeItem('rag'); removeItem('rag'); it.pad = true; addXp('tail', 3); SFX.rustle(); toast('Подкладка пришита: ' + d.name.toLowerCase() + ' греет сильнее');
    }, {reopen:'items', sel}), 'ghost'); b.disabled = !ok; out.push(b);
  }
  if (!worn && TEXTILE.has(it.id)) {
    const ok = !!cutTool(), b = btn(ok ? 'Распустить на тряпки' : 'Распустить: нужен нож', () => job(2.6, () => {
      const k = P.inv.indexOf(it); if (k < 0) return;
      P.inv.splice(k, 1); const n = 1 + Math.floor((d.ins || 2) / 3) + (lv >= 2 ? 1 : 0) + (it.pad ? 1 : 0);
      for (let q = 0; q < n; q++) giveItem(mkItem('rag')); addXp('tail', 1); SFX.rustle(); toast('Получено тряпок: ' + n);
    }, {reopen:'items', sel:null}), 'ghost'); b.disabled = !ok; out.push(b);
  }
  return out;
}
function selItem() {
  const sel = panel && panel.sel; if (!sel) return [null, false];
  if (sel.startsWith('cl_')) return [P.cloth && P.cloth[sel.slice(3)], true];
  if (sel === 'hand') return [P.weapon, true];
  if (sel === 'armor') return [P.armor, true];
  const g = groupItems(P.inv).find(g => g.key === sel); return [g ? g.it : null, false];
}

// ================= firearms =================
let gunFx = [];
function ammoFor(it) { const d = ITEMS[it.id]; return P.inv.filter(a => a.id === d.ammo && (a.uses || 0) > 0); }
function startReload() {
  const it = P.weapon, d = it && ITEMS[it.id]; if (!d || !d.gun) return;
  if (it.mag >= d.mag) { toast('Заряжено: ' + it.mag + '/' + d.mag); return; }
  if (!ammoFor(it).length) { toast('Нет патронов: ' + ITEMS[d.ammo].name.toLowerCase()); return; }
  P.act = {kind:'reload', t:0, dur:d.reload, it}; SFX.reload();
}
function finishReload(a) {
  const it = a.it, d = ITEMS[it.id]; if (it !== P.weapon) return;
  const need = d.mag - it.mag; let got = 0;
  for (const am of ammoFor(it)) { const m = Math.min(am.uses, need - got); am.uses -= m; got += m; if (am.uses <= 0) P.inv.splice(P.inv.indexOf(am), 1); if (got >= need) break; }
  it.mag += got; hud3Key = ''; toast(d.sh + ': заряжено ' + it.mag + '/' + d.mag); renderInv(); updateHud();
}
function hitZombie(z, dmg, ang, kb) {
  z.hp -= dmg; z.kx = Math.cos(ang) * kb; z.ky = Math.sin(ang) * kb; z.stun = .4; z.state = 'chase'; z.lost = 0; z.aw = 0;
  z.pal.blood = Math.min(5, z.pal.blood + 1); addBlood(z.x, z.y, .45); emit('blood', z.x, z.y, 1.2, 7, ang, 1.3, 2.4);
  if (z.hp <= 0) { emit('blood', z.x, z.y, 1, 10, ang, 1.6, 2.8); SFX.splat(z.x, z.y); killZombie(z); return true; }
  return false;
}
function shoot(w) {
  const it = P.weapon;
  let T = [];
  for (const z of zs) { const dx = z.x - P.x, dy = z.y - P.y, d = Math.hypot(dx, dy); if (d > w.range || d < .05) continue; if (!vis[Math.floor(z.y) * MW + Math.floor(z.x)] || !los(P.x, P.y, z.x, z.y)) continue; T.push({z, d, a:Math.atan2(dy, dx)}); }
  if (!mouseAim) { const near = T.slice().sort((a, b) => a.d - b.d)[0]; if (near) P.face = P.fd = near.a; }
  const cone = w.spread || .2;
  T = T.filter(t => Math.abs(wrapA(t.a - P.face)) < cone + .3 / Math.max(.6, t.d)).sort((a, b) => a.d - b.d);
  it.mag--; it.dur = Math.max(0, it.dur - 1);
  P.cd = w.cd * (1 + (P.panic || 0) / 250); P.atkT = 0; P.atkDur = .2; if (P.act) P.act = null;
  SFX.gun(!!w.spread); noise(P.x, P.y, w.loud * (rain > .5 ? .85 : 1)); scareCrows(P.x, P.y, 20);
  P.stress = Math.min(100, (P.stress || 0) + 2); if (!reduceMotion && settings.shake) shake = Math.max(shake, w.spread ? .16 : .08);
  let L = w.range;
  for (let q = .4; q <= w.range; q += .15) if (opaquePt(P.x + Math.cos(P.face) * q, P.y + Math.sin(P.face) * q)) { L = q; break; }
  const list = w.spread ? T.slice(0, w.cleave) : T.slice(0, 1);
  let hitD = null;
  for (const t of list) {
    if (t.d > L) continue;
    const acc = (w.spread ? .94 : .88) - missChance() - t.d / w.range * (w.spread ? .12 : .25);
    if (rng() > acc) continue;
    let dmg = w.dmg * (.85 + rng() * .3) * (w.spread ? 1 - t.d / w.range * .45 : 1);
    if (!w.spread && rng() < .22) dmg *= 2.2;
    hitZombie(t.z, dmg, t.a, w.spread ? 4 : 2.6);
    if (hitD == null) hitD = t.d;
  }
  if (!w.spread && hitD != null) L = hitD;
  gunFx.push({x0:P.x + Math.cos(P.face) * .5, y0:P.y + Math.sin(P.face) * .5, x1:P.x + Math.cos(P.face) * L, y1:P.y + Math.sin(P.face) * L, t:.1, big:!!w.spread, a:P.face});
  stat('shots'); ach('gun'); hud3Key = '';
  if (it.dur <= 0) { toast('Сломалось: ' + w.name); P.weapon = null; }
  else if (it.mag <= 0) toast(ammoFor(it).length ? 'Патроны кончились. Удар — перезарядка' : 'Патроны кончились');
}

// ================= mechanics, base defence, lures, storage: world actions =================
let lures = [], stashes = [];
const LABELS = {food:{name:'Еда и вода', icon:'canned'}, med:{name:'Медицина', icon:'medkit'}, weap:{name:'Оружие', icon:'axe'}, tool:{name:'Снаряжение', icon:'flashlight'}, mat:{name:'Материалы', icon:'plank'}, cloth:{name:'Одежда', icon:'jacket'}, book:{name:'Книги', icon:'novel'}};
const LABEL_ORDER = [null, 'food', 'med', 'weap', 'tool', 'mat', 'cloth', 'book'];
const CAT2LAB = {'Еда':'food', 'Питьё':'food', 'Медицина':'med', 'Оружие':'weap', 'Снаряжение':'tool', 'Материалы':'mat', 'Одежда':'cloth', 'Книги':'book'};
const labelOf = it => CAT2LAB[catOf(it.id)] || 'mat';
Object.assign(CONT, {stash:{name:'Ящик для хранения', loot:[], cap:24}, lure:{name:'Шумовая приманка'}});
SPRA.stash = 'crate'; PLANKS.stash = 3; PROPN.lure = 'Приманка';
function addStash(x, y, label, items) {
  const i = y * MW + x;
  const f = {x, y, type:'stash', items:items || [], searched:true, wd:[0, 1], cx:x + .5, cy:y + .5, sx:.8, sy:.66, r:[x + .1, y + .17, x + .9, y + .83], label:label || null};
  furns.push(f); furn[i] = furns.length; stashes.push(f); seen[i] = 1;
  for (const ch of chunksNear(x + .5, y + .5, 2)) for (const [k, v] of CHUNKS) if (v === ch) CHUNKS.delete(k);
  buildFlow(); return f;
}
function craftStash() {
  const t = freeFront(); if (!t) { toast('Нет места для ящика'); return false; }
  const [x, y] = t; if (furn[y * MW + x]) { toast('Здесь уже что-то стоит'); return false; }
  for (let k = 0; k < 4; k++) removeItem('plank');
  addStash(x, y, null, []); toggleInv(false); ach('stash');
  toast('Ящик готов. Подпиши его и раскладывай вещи: на нём будет табличка');
  return true;
}
function sortInto(list) {
  let n = 0;
  for (const f of list) {
    if (!f.label || f.gone) continue;
    let room = capOf(f) - f.items.length - xferQ.filter(q => q.c === f && q.dir === 'put').length;
    for (const it of P.inv) { if (room <= 0) break; if (it.on || xferQ.some(q => q.it === it) || labelOf(it) !== f.label) continue; xferQ.push({c:f, it, dir:'put', t:0, dur:xferDur(it)}); room--; n++; }
  }
  if (n) { SFX.rustle(); if (panel) panel.sel = null; renderPanel(); toast('Раскладываю по ящикам: ' + n); }
  else toast(list.some(f => f.label) ? 'Нечего раскладывать: подходящих вещей нет или ящики полны' : 'Сначала подпиши ящики');
}
function tickStash(gm) {
  for (const f of stashes) {
    if (f.gone || !f.items.length) continue;
    const out = !insideHouse(f.cx, f.cy), k = out && outsideTemp() < 3 ? 1 : !poweredAt(f.cx, f.cy) ? .4 : .2;
    for (const it of f.items) if (it.rot != null) it.rot += gm * k;
  }
}
// noise lures
function placeLure(k) {
  const it = P.inv[k], t = freeFront(); if (!t) { toast('Нет места для приманки'); return; }
  const [x, y] = t, p = {type:'lure', proc:true, cx:x + .5, cy:y + .5, solid:false, r:[x + .3, y + .3, x + .7, y + .7], ch:it.ch != null ? it.ch : 3, ring:0, cd:0, n:0};
  if (!addProp(p, [[x, y]])) { toast('Нет места'); return; }
  lures.push(p); P.inv.splice(k, 1); closePanel(); SFX.knock(p.cx, p.cy);
  toast('Приманка взведена. Загремит, когда мертвецы полезут к тебе, наступят на растяжку или подойдёт орда');
}
function ringLure(p, msg) {
  if (p.ch <= 0 || p.ring > 0 || (p.cd || 0) > gameMin) return false;
  p.ch--; p.ring = 15; p.cd = gameMin + 45; p.n = 0;
  if (msg && Math.hypot(p.cx - P.x, p.cy - P.y) < 50) toast(msg + (p.ch <= 0 ? '. Завод кончился' : ''));
  return true;
}
function updateLures(dt) {
  const bash = world.bash && gameMin - world.bash.t < 2 ? world.bash : null;
  for (const p of lures) {
    if (p.dead) continue;
    if (p.ring > 0) {
      p.ring -= dt; p.n -= dt;
      if (p.n <= 0) {
        p.n = .8; noise(p.cx, p.cy, 19); SFX.alarm(p.cx, p.cy);
        for (const z of zs) if (z.state === 'chase' && (z.lost || 0) > .8 && Math.hypot(z.x - p.cx, z.y - p.cy) < 19) { z.state = 'investigate'; z.tx = p.cx + (rng() - .5) * 2; z.ty = p.cy + (rng() - .5) * 2; z.it = -20; }
      }
      continue;
    }
    if (p.ch <= 0) continue;
    if (p.horde && zs.some(z => z.horde && Math.hypot(z.x - p.cx, z.y - p.cy) < 16)) { if (ringLure(p, 'Приманка гремит: орда сворачивает к ней')) { p.horde = false; ach('lure'); } continue; }
    if (bash && Math.hypot(bash.x - p.cx, bash.y - p.cy) < 30 && Math.hypot(bash.x - p.cx, bash.y - p.cy) > 5) { if (ringLure(p, 'Загремела приманка: мертвецы отвлекаются от дома')) continue; }
    for (const z of zs) if (Math.abs(z.x - p.cx) < .8 && Math.abs(z.y - p.cy) < .8) { ringLure(p, 'Где-то загремела приманка'); break; }
  }
}
function drawLure(p, f) {
  const sx = SX(p.cx, p.cy), sy = SY(p.cx, p.cy, 0), ring = p.ring > 0, jx = ring ? Math.sin(animT * 60) * .9 : 0;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(sx, sy, 7, 3, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = C([150, 150, 140], f); ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(sx - 14, sy + 2); ctx.lineTo(sx + 14, sy - 3); ctx.stroke();
  drawIcon('bottle', sx - 5 + jx, sy - 4, 9, f); drawIcon('bottle', sx + 5 - jx, sy - 4, 9, f); drawIcon('alarm', sx + jx, sy - 7, 11, f);
  if (ring) { const ph = (animT * 2) % 1; ctx.strokeStyle = `rgba(255,220,150,${.7 * (1 - ph)})`; ctx.lineWidth = .8; ctx.beginPath(); ctx.ellipse(sx, sy - 2, 5 + ph * 18, (5 + ph * 18) * .5, 0, 0, 6.283); ctx.stroke(); }
  else if (p.ch <= 0) { ctx.fillStyle = 'rgba(230,90,70,.9)'; ctx.fillRect(sx + 6, sy - 14, 2, 2); }
}
// actions that the stock action finder does not know about
function extraAction(excl) {
  const cand = [];
  for (let k = 0; k < props.length; k++) {
    const p = props[k]; if (p.type !== 'car' || p.dead || !p.searched) continue;
    if (Math.abs(p.cx - P.x) > 3 || Math.abs(p.cy - P.y) > 3) continue;
    const qx = clamp(P.x, p.r[0], p.r[2]), qy = clamp(P.y, p.r[1], p.r[3]), d = Math.hypot(P.x - qx, P.y - qy);
    if (d > .75 || !reachOK(qx, qy)) continue;
    // repair is always offered on a damaged car, and the label says what is missing
    if (p.hp < 100 && !p.stripped) { const w = hasTool('wrench'), sc = countItem('scrap'); cand.push([d, {kind:'carfix', label:w && sc ? 'починить кузов (' + Math.round(p.hp) + '%)' : 'починить: нужен ' + [!w && 'разводной ключ', !sc && 'металлолом'].filter(Boolean).join(' и '), f:p, tk:'cf' + k}]); }
    if (p.fuel >= 1 && P.inv.some(i => i.id === 'jerrycan' && (i.fuel || 0) < 99)) cand.push([d + .01, {kind:'siphon', label:'слить бензин (' + Math.round(p.fuel) + '%)', f:p, tk:'sp' + k}]);
    if (!p.stripped && (hasTool('wrench') || hasTool('crowbar'))) cand.push([d + .02, {kind:'strip', label:'разобрать на металлолом', f:p, tk:'st' + k}]);
  }
  for (const o of nearOpenings()) { const ob = obs[o.i]; if (ob.bhp > 0 && !(ob.mhp > 0) && !ob.dead && hasTool('hammer')) cand.push([o.d, {kind:'metal', label:countItem('scrap') && countItem('nails') ? 'прибить лист металла' : 'лист: нужны металлолом и гвозди', o, tk:'mt' + o.i}]); }
  for (const p of lures) {
    if (p.dead) continue; const d = Math.hypot(p.cx - P.x, p.cy - P.y); if (d > 1.25 || !reachOK(p.cx, p.cy)) continue; const k = props.indexOf(p);
    if (p.ch < 3) cand.push([d - .01, {kind:'lurewind', label:'завести приманку (' + p.ch + '/3)', f:p, tk:'lw' + k}]);
    cand.push([d, {kind:'lureget', label:'забрать приманку', f:p, tk:'lg' + k}]);
  }
  for (const f of stashes) {
    if (f.gone) continue; const d = Math.hypot(f.cx - P.x, f.cy - P.y); if (d > 1.3 || !reachOK(f.cx, f.cy)) continue;
    cand.push([d + .05, {kind:'stashlabel', label:f.label ? 'табличка: ' + LABELS[f.label].name.toLowerCase() : 'подписать ящик', f, tk:'sl' + furns.indexOf(f)}]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  for (const [, a] of cand) if (!(excl && excl.has(a.tk))) return a;
  return null;
}
const XACT = {
  carfix(a) {
    const p = a.f, lv = skillLv('mech');
    if (!hasTool('wrench')) { toast('Нужен разводной ключ: ищи в гаражах и ящиках с инструментом'); return; }
    if (!countItem('scrap')) { toast('Нужен металлолом: разбери другую машину ключом или ломом'); return; }
    job(6 * (1 - .07 * lv), () => { if (!countItem('scrap')) return; removeItem('scrap'); p.hp = Math.min(100, p.hp + 18 + 7 * lv); addXp('mech', 3); ach('fixcar'); SFX.hammer(); noise(p.cx, p.cy, 7); toast('Кузов залатан: ' + Math.round(p.hp) + '%'); }, {noisy:5});
  },
  siphon(a) {
    const p = a.f, lv = skillLv('mech');
    job(4.2 * (1 - .06 * lv), () => {
      let moved = 0; const cap = 30 + 10 * lv;
      for (const c of P.inv) if (c.id === 'jerrycan' && (c.fuel || 0) < 100) { const m = Math.min(100 - (c.fuel || 0), p.fuel, cap - moved); c.fuel = (c.fuel || 0) + m; p.fuel -= m; moved += m; if (moved >= cap || p.fuel <= 0) break; }
      addXp('mech', 1); SFX.drink();
      if (lv < 1 && rng() < .2) { P.pois = Math.max(P.pois || 0, 60); lastCause = 'Отравление бензином'; toast('Глотнул бензина через шланг. Тошнит'); }
      else toast('Слил бензин: +' + Math.round(moved) + '%. В баке осталось ' + Math.round(p.fuel) + '%');
    });
  },
  strip(a) {
    const p = a.f, lv = skillLv('mech');
    job(9 * (1 - .07 * lv), () => {
      p.stripped = true; p.hp = 0; p.fuel = 0; p.key = false;
      const n = 2 + Math.floor(lv / 2) + (hasTool('wrench') ? 1 : 0);
      for (let q = 0; q < n; q++) giveItem(mkItem('scrap'), p.cx, p.cy);
      addXp('mech', 3); noise(p.cx, p.cy, 12); SFX.wood(p.cx, p.cy); toast('Машина разобрана: металлолом ×' + n);
    }, {noisy:9});
  },
  metal(a) {
    const ob = obs[a.o.i];
    if (!hasTool('hammer')) { toast('Нужен молоток'); return; }
    if (!countItem('scrap') || !countItem('nails')) { toast('Нужны металлолом и гвозди'); return; }
    job(4 * (1 - .08 * skillLv('carp')), () => {
      if (!countItem('scrap') || !countItem('nails') || !(ob.bhp > 0)) { toast('Не вышло'); return; }
      removeItem('scrap'); removeItem('nails'); ob.mhp = 160 + 20 * skillLv('carp'); addXp('carp', 2); SFX.clang(a.o.x + .5, a.o.y + .5); SFX.hammer(); noise(P.x, P.y, 12);
      toast('Лист металла прибит. Мертвецам придётся повозиться');
    }, {noisy:10});
  },
  unmetal(a) {
    const ob = obs[a.o.i];
    if (!hasTool('hammer') && !hasTool('crowbar')) { toast('Нужен молоток или лом'); return; }
    job(3.5, () => { ob.mhp = 0; giveItem(mkItem('scrap')); SFX.clang(a.o.x + .5, a.o.y + .5); noise(P.x, P.y, 8); toast('Лист снят'); });
  },
  lurewind(a) { job(2, () => { a.f.ch = 3; SFX.alarm(a.f.cx, a.f.cy); toast('Приманка заведена: 3 раза'); }); },
  lureget(a) {
    if (invFull()) { toast('Слишком тяжело — не унести'); return; }
    const p = a.f, i = props.indexOf(p) + 1; for (let q = 0; q < NT; q++) if (propAt[q] === i) propAt[q] = 0;
    p.dead = true; lures = lures.filter(x => x !== p); const it = mkItem('lure'); it.ch = p.ch; P.inv.push(it); SFX.rustle(); toast('Приманка в рюкзаке');
  },
  stashlabel(a) {
    const f = a.f, j = LABEL_ORDER.indexOf(f.label || null), nx = LABEL_ORDER[(j + 1) % LABEL_ORDER.length];
    f.label = nx; SFX.rustle(); toast(nx ? 'Табличка: ' + LABELS[nx].name : 'Табличка снята');
  },
};
// metal sheets take the hits first; bashing zombies set off lures
// horde heads for the nearest wound-up lure

// ================= stealth & special zombies =================
// how hard you are to see this frame (cached once per frame, used for every zombie)
function hideK() {
  let k = 1; P._fl = !!flashlight();
  if (!P.sneak) return k;
  if (!P.moving) k *= .8;
  if (lightLevel() < .3 && !P._fl) k *= .8;
  const cx = Math.floor(P.x), cy = Math.floor(P.y);
  for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) { const i = y * MW + x, pa = propAt[i]; if (pa && props[pa - 1].type === 'bush' && Math.abs(props[pa - 1].cx - P.x) < 1 && Math.abs(props[pa - 1].cy - P.y) < 1) return k * .55; }
  return k;
}
function sightK(z) { return (P._hk || 1) * (z.crawl && z.state !== 'chase' ? .5 : 1); }
function noticeStep(z, d, sight, dt) {
  z.aw = (z.aw || 0) + dt * (.55 + 1.4 * Math.max(0, 1 - d / Math.max(1, sight))) * (P._fl ? 1.6 : 1) * (P.running ? 3 : 1);
  if (z.state === 'wander') { z.tx = z.x; z.ty = z.y; }
  const ta = Math.atan2(P.y - z.y, P.x - z.x); z.face += Math.atan2(Math.sin(ta - z.face), Math.cos(ta - z.face)) * Math.min(1, dt * 1.5);
  return z.aw >= 1;
}
function zAlpha(z) {
  if (!z.crawl || z.state === 'chase' || mode !== 'play') return null;
  if (get(Math.floor(z.x), Math.floor(z.y)) !== GRASS || (world.snow || 0) > .35) return null;
  const d = Math.hypot(z.x - P.x, z.y - P.y); return d < 2.2 ? null : d < 4 ? .45 : .13;
}
function runnerMsg(z) {
  if (!z.pal.fast || world.runMsg || lightLevel() >= .3) return;
  world.runMsg = true; toast('Бегун! Ночью они носятся быстрее тебя. Держись стен и дверей');
}

// ================= canning =================

// ================= recipes =================
RECIPES.push(
  {name:'Шина', icon:'splint', xp:0, parts:() => [{id:'plank', ok:countItem('plank') >= 1}, {id:countItem('bandage') ? 'bandage' : 'rag', ok:countItem('bandage') + countItem('rag') >= 1}], need:'доска и бинт или тряпка · для перелома', can:() => countItem('plank') >= 1 && countItem('bandage') + countItem('rag') >= 1, make:() => {
    removeItem('plank'); removeItem(countItem('rag') ? 'rag' : 'bandage'); P.inv.push(mkItem('splint')); addXp('med', 1); toast('Шина готова');
  }},
  {name:'Ящик для хранения', icon:'stash', parts:() => [{id:'plank', ok:countItem('plank') >= 4, badge:'4'}, {id:'hammer', ok:hasTool('hammer')}], need:'4 доски и молоток · ставится перед тобой, вмещает 24 вещи', can:() => countItem('plank') >= 4 && hasTool('hammer'), make:() => craftStash()},
  {name:'Шумовая приманка', icon:'lure', xp:1, parts:() => [{id:'alarm', ok:countItem('alarm') >= 1}, {id:'bottle', ok:countItem('bottle') >= 2, badge:'2'}, {id:'tape', ok:countItem('tape') >= 1}], need:'будильник, 2 пустые бутылки и изолента · уводит мертвецов от дома', can:() => countItem('alarm') >= 1 && countItem('bottle') >= 2 && countItem('tape') >= 1, make:() => {
    removeItem('alarm'); removeItem('bottle'); removeItem('bottle'); const t = P.inv.find(i => i.id === 'tape'); t.uses--; if (t.uses <= 0) P.inv.splice(P.inv.indexOf(t), 1);
    P.inv.push(mkItem('lure')); toast('Приманка готова. Поставь её подальше от дома');
  }},
);

// ================= item use =================
defUse(it => ['bandage', 'rag', 'splint', 'antisep', 'medkit'].includes(it.id), it => {   // перевязки и лечение ран
  const w = woundFor(it.id);
  if (!w && it.id !== 'medkit' && it.id !== 'antisep') { toast(it.id === 'splint' ? 'Переломов нет' : 'Перевязывать нечего'); return; }
  if (!w && it.id === 'antisep') { toast('Обрабатывать нечего'); return; }
  applyTreat(it.id, w);
});
defUse((it, d) => d.kind === 'ammo', (it, k, d) => { const g = P.weapon && ITEMS[P.weapon.id]; if (g && g.ammo === it.id) startReload(); else toast('Возьми в руки: ' + ITEMS[d.gun].name.toLowerCase()); });
defUse(it => it.id === 'sewkit', () => toast('Открой одежду в рюкзаке: там появятся кнопки «Зашить» и «Утеплить»'));
defUse(it => it.id === 'lure', (it, k) => placeLure(k));
HOT[2].pick = () => {
  const L = P.inv.map((it, k) => [it, k]), f = id => L.find(([it]) => it.id === id), W = wounds();
  if (W.some(w => w.k === 'frac' && !w.spl) && f('splint')) return f('splint');
  if (P.bleed) return f('bandage') || f('medkit') || f('rag');
  if (W.some(w => w.sep > 30 && !(w.cl > 0))) return f('antisep') || f('medkit') || f('antibio');
  if (W.some(needBand)) return f('bandage') || f('rag');
  if ((P.pain || 0) > 35 && !(P.painkT > 0)) return f('painkill') || f('pills');
  return (P.hp < 90 && (f('medkit') || f('pills') || f('painkill'))) || f('bandage');
};
function woundMoodles() {
  const m = [], W = wounds();
  const fl = fracAt('leg'), fa = fracAt('arm');
  if (fl) m.push([fl.spl ? 'Нога в шине' : 'Перелом ноги', fl.spl ? 'warn' : 'crit']);
  if (fa) m.push([fa.spl ? 'Рука в шине' : 'Перелом руки', fa.spl ? 'warn' : 'crit']);
  if ((P.fever || 0) > 0) m.push(['Воспаление', P.fever > .5 ? 'crit' : 'warn']);
  else if (W.some(dirtyBand)) m.push(['Грязная повязка', 'warn']);
  if ((P.pain || 0) > 65) m.push(['Сильная боль', 'crit']); else if ((P.pain || 0) > 30) m.push(['Боль', 'warn']);
  if ((P.unh || 0) > 80) m.push(['Депрессия', 'crit']); else if ((P.unh || 0) > 50) m.push(['Уныние', 'warn']);
  if (P.grabT > 0) m.push(['Схвачен!', 'crit']);
  { const o = invOver(); if (o > .45) m.push(['Сильный перегруз', 'crit']); else if (o > 0) m.push(['Перегруз', 'warn']); }
  return m;
}
// ---- character tab: wounds with buttons, traits, mood numbers ----
function woundRow(w) {
  const D = WOUND[w.k], r = mk('div', 'wound' + (bleeding(w) ? ' bleed' : w.sep > 50 ? ' sep' : ''));
  r.appendChild(mk('b', '', D.name));
  const st = [w.where];
  if (bleeding(w)) st.push('кровоточит'); else if (w.k !== 'frac') st.push(w.band ? (dirtyBand(w) ? 'повязка грязная' : 'перевязана') : 'открыта');
  if (w.k === 'frac') st.push(w.spl ? 'в шине' : 'без шины');
  if (w.sep > 50) st.push('воспалилась'); else if (w.sep > 20) st.push('краснеет'); else if (w.cl > 0) st.push('обработана');
  st.push('зажило ' + Math.floor(w.h * 100) + '%');
  r.appendChild(mk('small', '', st.join(' · ')));
  const acts = mk('div', 'acts'), add = (label, id) => { const b = btn(label, () => startTreat(id, w)); acts.appendChild(b); };
  if (needBand(w)) { const id = countItem('bandage') ? 'bandage' : countItem('rag') ? 'rag' : null; if (id) add(w.band ? 'Сменить ' + (id === 'rag' ? 'на тряпку' : 'бинт') : id === 'rag' ? 'Тряпкой' : 'Перевязать', id); }
  if (w.k === 'frac' && !w.spl && countItem('splint')) add('Шина', 'splint');
  if (WOUND[w.k].sep && !(w.cl > 0) && countItem('antisep')) add('Антисептик', 'antisep');
  if (!acts.children.length && (needBand(w) || (w.k === 'frac' && !w.spl))) acts.appendChild(mk('span', 'need', w.k === 'frac' ? 'нужна шина' : 'нужен бинт или тряпка'));
  r.appendChild(acts);
  const bar = mk('i', 'wbar'), u = mk('u'); u.style.width = Math.floor(w.h * 100) + '%'; bar.appendChild(u); r.appendChild(bar);
  if (w.band && w.k !== 'frac') {
    const acts = r.querySelector('.acts') || r;
    const b = btn(dirtyBand(w) ? 'Снять грязную' : 'Снять повязку', () => {
      w.band = 0; w.bT = 0; SFX.rustle();
      toast(WOUND[w.k].bleed > 0 && w.t < (WOUND[w.k].clot || 1e9) ? 'Повязка снята. Рана снова кровоточит' : 'Повязка снята: ' + w.where);
      renderPanel();
    }, 'ghost');
    acts.appendChild(b);
  }
  return r;
}
onPanel(() => {
  if (!panel) return;
  const body = $('pnBody');
  if (panel.kind === 'inv' && panel.tab === 'self') buildSelf(body);
  if (panel.kind === 'loot' && panel.src && panel.src.type === 'stash') {
    const f = panel.src;
    $('pnTitle').textContent = 'Ящик' + (f.label ? ' · ' + LABELS[f.label].name : '');
    const row = body.querySelector('.lay3 .pcol .secrow'); if (!row) return;
    const bx = mk('div', 'stashrow');
    bx.appendChild(btn(f.label ? 'Табличка: ' + LABELS[f.label].name.toLowerCase() : 'Подписать ящик', () => { XACT.stashlabel({f}); renderPanel(); }));
    if (f.label) bx.appendChild(btn('Разложить из рюкзака', () => sortInto(stashes.filter(s => !s.gone && Math.hypot(s.cx - P.x, s.cy - P.y) < 9))));
    row.after(bx); fitPanel();
  }
});

// ================= HUD helpers =================
function drawV23() {
  if (mode !== 'play') return;
  // gunfire: tracer and muzzle flash
  for (const s of gunFx) {
    const k = s.t / .1;
    ctx.strokeStyle = `rgba(255,230,160,${.85 * k})`; ctx.lineWidth = s.big ? 1.4 : 1; ctx.beginPath(); ctx.moveTo(SX(s.x0, s.y0), SY(s.x0, s.y0, U * 1.1)); ctx.lineTo(SX(s.x1, s.y1), SY(s.x1, s.y1, U * 1)); ctx.stroke();
    if (s.big) for (const o of [-.18, .18]) { const ex = s.x0 + Math.cos(s.a + o) * 4.5, ey = s.y0 + Math.sin(s.a + o) * 4.5; ctx.strokeStyle = `rgba(255,220,150,${.4 * k})`; ctx.beginPath(); ctx.moveTo(SX(s.x0, s.y0), SY(s.x0, s.y0, U * 1.1)); ctx.lineTo(SX(ex, ey), SY(ex, ey, U)); ctx.stroke(); }
    ctx.globalCompositeOperation = 'lighter';
    const fx = SX(s.x0, s.y0), fy = SY(s.x0, s.y0, U * 1.1), g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 10 * k + 2);
    g.addColorStop(0, `rgba(255,240,190,${k})`); g.addColorStop(1, 'rgba(255,160,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, 10 * k + 2, 0, 6.283); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  // zombies that are noticing you
  ctx.font = '700 9px "PT Sans", sans-serif'; ctx.textAlign = 'center';
  for (const z of zs) {
    const show = z.spT > 0 ? '!' : z.aw > .08 && z.state !== 'chase' ? '?' : '';
    if (!show || !vis[Math.floor(z.y) * MW + Math.floor(z.x)]) continue;
    const sx = SX(z.x, z.y), sy = SY(z.x, z.y, z.crawl ? U * .7 : U * 2.05);
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(10,12,14,.85)'; ctx.strokeText(show, sx, sy);
    ctx.fillStyle = show === '!' ? '#ff5a48' : z.aw > .6 ? '#ffae4a' : '#f0d27a'; ctx.fillText(show, sx, sy);
  }
  // stash signs
  for (const f of stashes) {
    if (f.gone || !f.label || !vis[f.y * MW + f.x] || Math.abs(f.cx - P.x) > 14 || Math.abs(f.cy - P.y) > 14) continue;
    const sx = SX(f.cx, f.cy), sy = SY(f.cx, f.cy, 30);
    ctx.fillStyle = 'rgba(30,24,18,.9)'; ctx.fillRect(sx - 7, sy - 7, 14, 13); ctx.fillStyle = '#c9a46a'; ctx.fillRect(sx - 6, sy - 6, 12, 11);
    drawIcon(LABELS[f.label].icon, sx, sy - .5, 11);
  }
}
function tickV23(dt, gm) {
  P._hk = hideK();
  tickWounds(gm); tickMind(dt, gm); tickStash(gm); updateLures(dt);
  if (P.grabT > 0) P.grabT -= dt;
  for (const s of gunFx) s.t -= dt; if (gunFx.length) gunFx = gunFx.filter(s => s.t > 0);
  for (const z of zs) if (z.spT > 0) z.spT -= dt;
  if (P.act && P.act.kind === 'job' && P.act.noisy) { P.act.nT = (P.act.nT || 0) - dt; if (P.act.nT <= 0) { P.act.nT = 1.5; noise(P.x, P.y, P.act.noisy); } }
  tickDiary(); unstick();
}
onNewWorld((o) => {
}, o => { lures = []; stashes = []; gunFx = []; });
addEventListener('keydown', e => { if (mode !== 'play' || paused || !P || P.sleep) return; const k = e.key.toLowerCase(); if (k === 't' || k === 'е') startReload(); });
ACH.push(['gun', 'Громкое решение', 'Выстрелить из огнестрела'], ['ninja', 'Тихий убийца', 'Убить 5 мертвецов со спины'], ['splint', 'Срослось', 'Вылечить перелом'],
  ['sew', 'Портной', 'Зашить одежду'], ['fixcar', 'Механик', 'Починить машину'], ['stash', 'Свой склад', 'Сколотить ящик для хранения'], ['lure', 'Ложный след', 'Увести орду приманкой']);
RADIO_TIPS.push('Переломы фиксируйте шиной: доска и бинт. Без шины кость срастается неделями.', 'Не стреляйте без крайней нужды: выстрел слышно на несколько кварталов.',
  'Меняйте повязки раз в полсуток. Грязный бинт — прямая дорога к воспалению.', 'По ночам заражённые бегуны особенно опасны. Не выходите после заката.',
  'Ползуны прячутся в высокой траве. Смотрите под ноги.', 'Шумовая приманка вдали от дома отвлечёт толпу от вашего убежища.');

// ================= saves =================
onSave(d => {
  Object.assign(d.p, {traits:P.traits || [], capB:P.capB || 0, wounds:wounds(), pain:r2(P.pain || 0), painkT:r2(P.painkT || 0), panic:r2(P.panic || 0), unh:r2(P.unh || 0), smokeT:r2(P.smokeT || 0)});
  const si = new Set(stashes.map(f => furns.indexOf(f)));
  if (d.fmov) d.fmov = d.fmov.filter(m => !si.has(m[0]));
  if (d.moved) d.moved = d.moved.filter(m => !si.has(m[0]));
  d.x23 = {
    stash:stashes.filter(f => !f.gone).map(f => [f.x, f.y, f.label, f.items]),
    lures:lures.filter(p => !p.dead).map(p => [p.cx, p.cy, p.ch]),
    metal:obs.map((o, i) => o && o.mhp > 0 ? [i, r2(o.mhp)] : null).filter(Boolean),
    strip:props.map((p, k) => p.type === 'car' && p.stripped ? k : -1).filter(k => k >= 0),
  };
});
onLoad((d) => {
  if (!P.wounds) { P.wounds = []; if (P.bleed) addWound('cut', 'arm'); if (P.inf) addWound('bite', 'arm'); }
  P.traits = P.traits || [];
  const x = d.x23; if (!x) return;
  for (const s of x.stash || []) { const i = s[1] * MW + s[0]; if (!furn[i]) addStash(s[0], s[1], s[2], s[3]); }
  for (const l of x.lures || []) { const tx = Math.floor(l[0]), ty = Math.floor(l[1]), p = {type:'lure', proc:true, cx:l[0], cy:l[1], solid:false, r:[tx + .3, ty + .3, tx + .7, ty + .7], ch:l[2], ring:0, cd:0, n:0}; if (addProp(p, [[tx, ty]])) lures.push(p); }
  for (const [i, h] of x.metal || []) if (obs[i]) obs[i].mhp = h;
  for (const k of x.strip || []) if (props[k] && props[k].type === 'car') props[k].stripped = true;
  buildFlow(); clearCaches();
});
