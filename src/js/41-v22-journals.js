// ================= v22: skill journals (tiered reading), craft XP only on success =================
const MAGS = {
  carp:{series:'«Сделай сам»', base:'book_carp'}, cook:{series:'«Домашняя кухня»', base:'book_cook'},
  farm:{series:'«Сад и огород»', base:'book_farm'}, fight:{series:'«Самооборона»', base:'book_fight'},
};
const MAG_TIER = {1:[0, 1], 2:[2, 3], 3:[4, 4]};
for (const k in MAGS) {
  const m = MAGS[k];
  for (const n of [1, 2, 3]) {
    const id = n === 1 ? m.base : m.base + n;
    ITEMS[id] = {name:'Журнал ' + m.series + ' №' + n, sh:'Журнал №' + n, kind:'book', skill:k, vol:n, verb:'Читать'};
    if (n > 1) ICONA[id] = m.base;
    DESC[id] = 'Журнал для ' + (n === 1 ? 'новичков' : n === 2 ? 'опытных' : 'мастеров') + ' о навыке «' + SKILLS[k].name + '». Подходит на уровнях ' + MAG_TIER[n][0] + '–' + (MAG_TIER[n][1] + 1) + '. Прочитав, учишься втрое быстрее, пока не перерастёшь журнал.';
  }
}
{ const add = (k, ...ids) => CONT[k] && CONT[k].loot.push(...ids);
  add('bookshelf', 'book_carp2', 'book_cook2', 'book_farm2', 'book_fight2', 'book_carp3', 'book_cook3', 'book_farm3', 'book_fight3');
  add('desk', 'book_fight2', 'book_cook2'); add('nightstand', 'book_cook2', 'book_farm2'); add('crate', 'book_carp2', 'book_carp3', 'book_farm2');
  add('toolrack', 'book_carp2', 'book_carp3'); add('locker', 'book_fight2', 'book_fight3'); add('counter', 'book_cook3'); }
// reading: right volume gives a learning boost, wrong volume teaches nothing
defUse((it, d) => d && d.kind === 'book' && d.skill, (it, k) => readMag(k));   // журнал навыка — читать
function readMag(k) {
  const it = P.inv[k], d = ITEMS[it.id], lv = skillLv(d.skill), [lo, hi] = MAG_TIER[d.vol || 1];
  P.readMag = P.readMag || {}; P.boost = P.boost || {};
  if (P.readMag[it.id]) { toast('Этот журнал ты уже прочитал'); return; }
  if (lv > hi + (d.vol === 3 ? 1 : 0)) { toast('Тут нет ничего нового: ты уже знаешь больше'); return; }
  if (lv < lo) { toast('Слишком сложно. Сначала прочитай №' + (d.vol - 1)); return; }
  P.readMag[it.id] = true; stat('books');
  P.boost[d.skill] = {mult:3, max:hi};
  addXp(d.skill, 2);
  toast('Прочитано: ' + d.name + '. До уровня ' + (hi + 1) + ' навык «' + SKILLS[d.skill].name + '» растёт втрое быстрее');
  SFX.rustle(); P.bored = Math.max(0, (P.bored || 0) - 20); renderInv();
}
const addXp0 = addXp;
addXp = function (k, n) { const b = P.boost && P.boost[k]; if (b && skillLv(k) <= b.max) n *= b.mult; else if (b) delete P.boost[k]; addXp0(k, n); };
