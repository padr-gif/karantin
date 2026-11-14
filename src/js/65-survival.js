// ================= дневник героя — он сам записывает себе дела на день, чтобы не сойти с ума =================

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
    const prev = T, pool = TASKS.filter(d => !d.fd), list = [];   // дела первого дня (99-new-firstday) в случайный список не попадают
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
    ctlApply();                                                              // своё место и размер из настройки кнопок
  }
  const T = P && P.tasks; if (!T) { c.hidden = true; return; }
  const done = T.list.filter(t => t.done).length;
  c.hidden = mode !== 'play'; c.classList.toggle('all', done === T.list.length);
  c.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6z"/><path d="M6 3v18M9 8h6M9 12h6M9 16h4"/></svg><span>Дневник ' + done + '/' + T.list.length + '</span>';
}
// дневник: «Дела на сегодня» или прочитанные записки; переключатель сверху
function buildDiary(body) {
  const page = (panel && panel.dpage) || 'day';
  if (page === 'day') diaryDay(body); else { body.textContent = ''; body.appendChild(storyPage()); }
  const sw = mk('div', 'dswitch');
  for (const [k, t] of [['day', 'Дела на сегодня'], ['notes', 'Записки ' + ((world.story || []).length) + '/' + STORY_NOTES.length]]) sw.appendChild(btn(t, () => { panel.dpage = k; renderPanel(); }, page === k ? 'on' : 'ghost'));
  body.insertBefore(sw, body.firstChild);
}
// «Дела на сегодня» — разворот блокнота: слева — шапка, мысль дня и список дел, справа — записи по порядку, сверху вниз.
// Рукописный шрифт, линейки совпадают со строками (у каждой строки ровно одна высота) и прокручиваются вместе с текстом.
// Блокнот тянется на всю высоту окна; правая страница сама опускается к последней записи.
// Дату и время герой пишет, только если они есть на часах (34-watches-windows: hasClock / hasDate).
const DIARY_WD = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
function diaryHead() {
  const d0 = dayNo() - Math.floor(startMin / 1440) + 1;
  if (hasDate()) return ['День ' + d0, DIARY_WD[(dayNo() + 6) % 7] + ', ' + dateStr(gameMin) + ', ' + fmtTime(gameMin)];
  return ['Сегодня', hasClock() ? fmtTime(gameMin) : partOfDay().toLowerCase()];
}
function diaryDay(body) {
  const T = tasksToday();
  const oldR = body.querySelector('.nb-r'), oldL = body.querySelector('.nb-l');
  const atEnd = !oldR || oldR.scrollTop + oldR.clientHeight >= oldR.scrollHeight - 6, rTop = oldR ? oldR.scrollTop : 0, lTop = oldL ? oldL.scrollTop : 0;
  body.textContent = '';
  const done = T.list.filter(t => t.done).length;
  const book = mk('div', 'nbook'), L = mk('div', 'nb-pg nb-l'), R = mk('div', 'nb-pg nb-r');
  // левая страница
  const [hb, hs] = diaryHead(), dt = mk('div', 'nb-date'); dt.appendChild(mk('b', '', hb)); dt.appendChild(mk('span', '', hs)); L.appendChild(dt);
  L.appendChild(mk('p', 'nb-ln nb-quote', T.head || DAY_HEAD[0]));
  { const m = weekMod(); if (m) L.appendChild(mk('p', 'nb-ln nb-week', WEEK_MODS[m].name)); }
  L.appendChild(mk('p', 'nb-ln nb-h', 'Сегодня надо' + (T.list.length ? ' · ' + done + ' из ' + T.list.length : '')));
  for (const t of T.list) {
    const d = taskDef(t), p = taskProg(t), r = mk('div', 'nb-ln nb-task' + (t.done ? ' done' : ''));
    r.appendChild(mk('i', 'nb-box'));
    const tx = mk('span', 'nb-tx', d.t(t.n)); r.appendChild(tx);
    if (t.done && t.note) tx.appendChild(mk('em', 'nb-note', ' — ' + t.note));
    else if (!t.done && t.n > 1) r.appendChild(mk('em', 'nb-prog', p + '/' + t.n));
    L.appendChild(r);
  }
  if (done === T.list.length && T.list.length) L.appendChild(mk('p', 'nb-ln nb-ok', 'Всё сделал. Можно выдохнуть.'));
  if (T.streak) L.appendChild(mk('p', 'nb-ln nb-streak', (T.streak + 1) + '-й день подряд по плану'));
  // правая страница: записи по порядку — старые наверху, свежие внизу
  const today = dayNo(), d0 = Math.floor(startMin / 1440), dated = hasDate();
  const ev = (P.log || []).filter(e => !OLD_DAY_EV.test(e[1])).slice(-40).sort((a, b) => a[0] - b[0]);
  let key = null;
  for (const e of ev) {
    const d = Math.floor(e[0] / 1440), k = dated || d >= today - 2 ? d : 'old';
    if (k !== key) {
      key = k;
      const rel = d === today ? 'Сегодня' : d === today - 1 ? 'Вчера' : d === today - 2 ? 'Позавчера' : 'Раньше';
      R.appendChild(mk('p', 'nb-ln nb-h' + (d === today ? ' nb-today' : ''), dated ? 'День ' + Math.max(1, d - d0 + 1) + (d >= today - 1 ? ' · ' + rel.toLowerCase() : '') : rel));
    }
    const r = mk('p', 'nb-ln nb-ev ' + jlogKind(e[1])); r.appendChild(mk('time', '', clockStamp(e[0]))); r.appendChild(mk('span', '', e[1])); R.appendChild(r);
  }
  if (!ev.some(e => Math.floor(e[0] / 1440) === today)) { if (key !== today) R.appendChild(mk('p', 'nb-ln nb-h nb-today', dated ? 'День ' + (today - d0 + 1) + ' · сегодня' : 'Сегодня')); R.appendChild(mk('p', 'nb-ln nb-empty', 'Пока тихо. И слава богу.')); }
  R.appendChild(mk('p', 'nb-ln nb-pen', ''));                                  // пустая строка под ручку: сюда ляжет следующая запись
  book.appendChild(L); book.appendChild(mk('i', 'nb-spine')); book.appendChild(R);
  body.appendChild(book);
  L.scrollTop = lTop; R.scrollTop = atEnd ? R.scrollHeight : rTop;
}
{ onPanel(() => {
    { const pb = $('pnBody'); if (pb) pb.classList.toggle('nbody', !!(panel && panel.kind === 'inv' && panel.tab === 'tasks' && (panel.dpage || 'day') === 'day')); }
    if (!panel || panel.kind !== 'inv') return;
    const tabs = $('pnTabs');
    if (tabs && !tabs.querySelector('.ttab')) { const b = btn('Дневник', () => { panel.tab = 'tasks'; renderPanel(); }, panel.tab === 'tasks' ? 'on' : ''); b.classList.add('ttab'); tabs.appendChild(b); }
    if (panel.tab === 'tasks') { const body = $('pnBody'); body.classList.remove('fit'); buildDiary(body); for (const b of tabs.querySelectorAll('button')) b.classList.toggle('on', b.classList.contains('ttab')); }
  });
}
{ let tc = 0;
  onUpdate(dt => { if (mode !== 'play' || !P) return; tc += dt; if (tc > .5) { tc = 0; diaryTick(); diaryChip(); }
  });
}
{ onSave(d => { d.x45 = {tasks:P.tasks || null};
}); }
{ onLoad((d) => { if (d && d.x45 && d.x45.tasks) P.tasks = d.x45.tasks; diaryChip();
}); }
{ onStartNew(() => { if (P) P.tasks = null; tasksToday(); diaryChip();
}); }
