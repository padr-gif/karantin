// ================= v45: дневник героя — он сам записывает себе дела на день, чтобы не сойти с ума =================

// ---- счётчики законченных дел: что бы ни делал герой, доделанное считается (для заданий) ----
{ let lastA = null;
  onUpdate((dt, {A0}) => {
    if (!P) return;
    if (lastA && P.act !== lastA && lastA.t >= (lastA.dur || 0) - .06) {
      const k = lastA.kind; stat('f_' + k);
      if (k === 'use' && lastA.it && ITEMS[lastA.it.id]) { const d = ITEMS[lastA.it.id]; if (d.kind === 'food') stat('f_eat'); if (d.kind === 'drink' || d.kind === 'canteen') stat('f_drink'); if (d.warm) stat('f_warm'); }
      if (k === 'cookx' || k === 'cook') stat('f_cookany');
      if (lastA.an === 'read') stat('f_read');
    }
    lastA = P.act || null; void A0;
  }, dt => { const A0 = P && P.act; return {A0}; });
}


// ---- дела на день: три пункта в дневнике. Без наград — это просто способ держаться: план, вычеркнул, легче ----
const TASKS = [
  {k:'kill', t:n => `Упокоить ${n} этих. Не думать, кем они были.`, n:[3, 6], c:() => kills},
  {k:'search', t:n => `Обыскать ${n} мест. Еда сама не придёт.`, n:[6, 10], c:() => (P.stats.f_search || 0)},
  {k:'forage', t:n => `Собрать что-нибудь съедобное или хворост — ${n} раза.`, n:[2, 3], c:() => (P.stats.f_forage || 0)},
  {k:'cook', t:() => 'Приготовить нормальную еду. Не жрать из банки.', n:[1, 1], c:() => (P.stats.f_cookany || 0)},
  {k:'bar', t:() => 'Заколотить хоть одно окно или дверь.', n:[1, 1], c:() => (P.stats.f_bar || 0)},
  {k:'walk', t:n => `Пройтись: ${n} шагов. Ноги должны помнить, как бегать.`, n:[400, 700], c:() => Math.floor((P.walk || 0) / 5.2 * 1.4), step:50},
  {k:'warm', t:() => 'Поесть горячего.', n:[1, 1], c:() => (P.stats.f_warm || 0)},
  {k:'drink', t:() => 'Пить воду. Хотя бы два раза.', n:[2, 2], c:() => (P.stats.f_drink || 0)},
  {k:'sneak', t:() => 'Подкрасться к одному со спины. Тихо.', n:[1, 1], c:() => (P.stats.sneakk || 0)},
  {k:'workout', t:() => 'Зарядка. Сколько бы ни было лет — зарядка.', n:[1, 1], c:() => (P.stats.workout || 0)},
  {k:'read', t:() => 'Почитать. Голове нужно что-то кроме этого.', n:[1, 1], c:() => (P.stats.books || 0) + (P.stats.f_read || 0)},
];
const DONE_NOTE = ['Сделано.', 'Есть. Руки ещё дрожат.', 'Вычеркнул. Уже легче.', 'Получилось.', 'Готово. Дышу ровнее.', 'Сделал. Хоть что-то по плану.', 'Есть.'];
const DAY_HEAD = ['Если делать по списку — не сойду с ума.', 'Главное — не сидеть без дела.', 'Ещё один день. Пишу, чтобы помнить, что я человек.', 'Утро. Плана три пункта.', 'Записываю, чтобы было за что держаться.'];
const dayNo = () => Math.floor(gameMin / 1440);
function tasksToday() {
  if (!P) return null; P.stats = P.stats || {};
  let T = P.tasks;
  if (!T || T.day !== dayNo() || !T.list || T.list.some(t => !TASKS.find(d => d.k === t.k))) {
    const prev = T, pool = TASKS.slice(), list = [];
    const streak = prev && prev.day === dayNo() - 1 && prev.list && prev.list.every(t => t.done) ? (prev.streak || 0) + 1 : 0;
    for (let q = 0; q < 3 && pool.length; q++) {
      const d = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      let n = ri(d.n[0], d.n[1]); if (d.step) n = Math.round(n / d.step) * d.step;
      list.push({k:d.k, n, base:d.c(), done:false, note:''});
    }
    T = P.tasks = {day:dayNo(), list, streak, head:pick(DAY_HEAD)}; diaryChip();
  }
  return T;
}
const taskDef = t => TASKS.find(d => d.k === t.k);
const taskProg = t => Math.max(0, Math.min(t.n, taskDef(t).c() - t.base));
// вычёркивает сам, как только сделано
function diaryTick() {
  const T = tasksToday(); if (!T) return;
  for (const t of T.list) if (!t.done && taskProg(t) >= t.n) {
    t.done = true; t.note = pick(DONE_NOTE); SFX.rustle();
    toast('Дневник: вычеркнул «' + taskDef(t).t(t.n).split('.')[0] + '»');
    if (T.list.every(x => x.done)) { logEv('Всё из дневника на сегодня сделано'); toast('Все дела на сегодня вычеркнуты. Можно выдохнуть'); }
    diaryChip();
  }
}
function diaryChip() {
  let c = $('taskChip');
  if (!c) {
    c = document.createElement('button'); c.type = 'button'; c.id = 'taskChip';
    c.onclick = () => { if (mode !== 'play') return; SFX.ui(); openPanel('inv'); if (panel) { panel.tab = 'tasks'; renderPanel(); } };
    const L = document.querySelector('#hud .left'); if (L) L.insertBefore(c, $('moodles')); else return;
  }
  const T = P && P.tasks; if (!T) { c.hidden = true; return; }
  const done = T.list.filter(t => t.done).length;
  c.hidden = mode !== 'play'; c.classList.toggle('all', done === T.list.length);
  c.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6z"/><path d="M6 3v18M9 8h6M9 12h6M9 16h4"/></svg><span>Дневник ' + done + '/' + T.list.length + '</span>';
}
function buildDiary(body) {
  const T = tasksToday(); body.textContent = '';
  const pg = mk('div', 'diary');
  const d0 = dayNo() - Math.floor(startMin / 1440) + 1;
  pg.appendChild(mk('div', 'dhead', 'День ' + d0 + ', ' + fmtTime(gameMin)));
  pg.appendChild(mk('p', 'dline', T.head || DAY_HEAD[0]));
  pg.appendChild(mk('p', 'dline dsub', 'Сегодня надо:'));
  for (const t of T.list) {
    const d = taskDef(t), p = taskProg(t), r = mk('div', 'ditem' + (t.done ? ' done' : ''));
    r.appendChild(mk('span', 'dbox', t.done ? '✗' : ''));
    const tx = mk('div', 'dtx'); tx.appendChild(mk('span', 'dt', d.t(t.n)));
    if (t.done) tx.appendChild(mk('span', 'dnote', t.note));
    else if (t.n > 1) tx.appendChild(mk('span', 'dprog', p + ' из ' + t.n));
    r.appendChild(tx); pg.appendChild(r);
  }
  if (T.streak) pg.appendChild(mk('p', 'dline dsub', 'Уже ' + (T.streak + 1) + '-й день подряд держусь плана.'));
  // что случилось сегодня — из записей
  const from = dayNo() * 1440, ev = (P.log || []).filter(e => e[0] >= from).slice(-6);
  if (ev.length) {
    pg.appendChild(mk('p', 'dline dsub', 'Что было:'));
    for (const e of ev) pg.appendChild(mk('p', 'dline dev', fmtTime(e[0]) + ' — ' + e[1]));
  }
  body.appendChild(pg);
}
{ const rp = renderPanel;
  renderPanel = function () {
    rp();
    if (!panel || panel.kind !== 'inv') return;
    const tabs = $('pnTabs');
    if (tabs && !tabs.querySelector('.ttab')) { const b = btn('Дневник', () => { panel.tab = 'tasks'; renderPanel(); }, panel.tab === 'tasks' ? 'on' : ''); b.classList.add('ttab'); tabs.appendChild(b); }
    if (panel.tab === 'tasks') { const body = $('pnBody'); body.classList.remove('fit'); buildDiary(body); for (const b of tabs.querySelectorAll('button')) b.classList.toggle('on', b.classList.contains('ttab')); }
  };
}
{ let tc = 0;
  onUpdate(dt => { if (mode !== 'play' || !P) return; tc += dt; if (tc > .5) { tc = 0; diaryTick(); diaryChip(); }
  });
}
{ const ser = serialize; serialize = function () { const d = ser(); d.x45 = {tasks:P.tasks || null}; return d; }; }
{ const as = applySave; applySave = function (d) { as(d); if (d && d.x45 && d.x45.tasks) P.tasks = d.x45.tasks; diaryChip(); }; }
{ const sn = startNew; startNew = function () { sn(); if (P) P.tasks = null; tasksToday(); diaryChip(); }; }
