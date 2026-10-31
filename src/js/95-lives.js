// ================= прошлые жизни и итог смерти: статистика, достижения этой жизни, рекорды =================
// Концовки нет (см. CLAUDE.md), поэтому смерть — итог: экран смерти показывает, чего герой добился,
// а «Прошлые жизни» (localStorage 'karantin-lives', последние LIVES_MAX) — с чем сравнить.
// Достижения этой жизни (achRun) в сохранение не пишутся: после загрузки список начинается заново.
const LIVES_MAX = 10, LIVES_SHOW = 5;
let achRun = [];
function readLives() { try { const a = JSON.parse(localStorage.getItem('karantin-lives') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function writeLives(a) { try { localStorage.setItem('karantin-lives', JSON.stringify(a.slice(-LIVES_MAX))); } catch (e) {} }
const lifeDists = () => world.visited || 1;
const lifeUniq = () => (world.uniq || []).length;

// одна строка таблицы жизней: «Имя, профессия — 3 дн. 4 ч · 27 убито · Загрызли»
function lifeRow(l, best) {
  const r = mk('li', l.lived >= best && best > 0 ? 'best' : '');
  r.appendChild(mk('b', '', (l.lived >= best && best > 0 ? '★ ' : '') + (l.name || 'Выживший') + (l.prof ? ', ' + l.prof.toLowerCase() : '')));
  r.appendChild(mk('small', '', [fmtDur(l.lived), l.kills + ' убито', l.dists > 1 ? 'районов: ' + l.dists : '', l.cause].filter(Boolean).join(' · ')));
  return r;
}
// now: первая (самая свежая) строка — только что закончившаяся жизнь
function renderLives(box, now) {
  box.textContent = '';
  const L = readLives(); if (!L.length) { box.hidden = true; return; }
  box.hidden = false;
  const best = Math.max(...L.map(l => l.lived || 0));
  box.appendChild(mk('h3', '', now ? 'Прошлые жизни' : 'Прошлые жизни · рекорд ' + fmtDur(best)));
  const ul = mk('ul');
  L.slice(-LIVES_SHOW).reverse().forEach((l, i) => { const r = lifeRow(l, best); if (now && !i) r.classList.add('now'); ul.appendChild(r); });
  box.appendChild(ul);
}

// зовётся из die(): дописывает экран смерти и запоминает жизнь (обучение не запоминается)
function deathSummary(lived) {
  const tut = TUT.on;
  $('dDist').textContent = lifeDists() + (lifeUniq() ? ' · находок ' + lifeUniq() + ' из ' + UNIQ.length : '');
  const box = $('dAch'); box.textContent = '';
  const got = achRun.map(id => ACH.find(a => a[0] === id)).filter(Boolean);
  box.hidden = !got.length;
  if (got.length) { box.appendChild(mk('h3', '', 'Новые достижения')); const ul = mk('div', 'dachs'); for (const a of got) ul.appendChild(mk('span', '', '★ ' + a[1])); box.appendChild(ul); }
  const lv = $('dLives');
  if (tut) { lv.hidden = true; lv.textContent = ''; }
  else {
    const L = readLives();
    L.push({at:Date.now(), name:(P.look && P.look.name) || '', prof:(PROFS[P.prof] || {}).name || '', lived:Math.round(lived), kills, cause:lastCause, dists:lifeDists(), uniq:lifeUniq(), ach:achRun.length});
    writeLives(L); renderLives(lv, true);
  }
  achRun = [];
}
onStartNew(() => { achRun = []; });
onLoad(() => { achRun = []; });

// ---- цели без концовки: долгие достижения ----
ACH.push(
  ['day100', 'Сто дней', 'Прожить 100 дней'], ['kill500', 'Никто не встанет', 'Убить 500 мертвецов'],
  ['uniq6', 'Коллекционер', 'Собрать 6 особых находок'],
  ['uniq12', 'Все истории', 'Собрать все особые находки'], ['lives3', 'Третья попытка', 'Начать третью жизнь в том же городе'],
);
function checkAchLong() {   // зовётся из checkAch
  const days = (gameMin - startMin) / 1440, u = lifeUniq();
  if (days >= 100) ach('day100'); if (kills >= 500) ach('kill500');
  if (u >= 6) ach('uniq6'); if (u >= UNIQ.length) ach('uniq12');
  if ((world.lives || 1) >= 3) ach('lives3');
}
