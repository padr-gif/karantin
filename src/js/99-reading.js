// ================= чтение: журналы и книги навыков (как в Project Zomboid) =================
// Журналы (№1–3 на каждый навык, генераторы) читаются 45 секунд и дают разовую порцию опыта.
// Книги навыков — тома 1–3 на каждый навык: читаются 2 минуты, а пока навык в пределах тома, опыт идёт втрое быстрее.
// Без прочитанной книги навык растёт очень медленно (треть обычного) — книги стоит искать.
// Прерванное чтение не пропадает: закладка остаётся в книге, начнёшь снова — продолжишь с того же места.
{
  const BOOKS = {carp:'«Плотницкое дело»', cook:'«Кулинария для всех»', farm:'«Огород круглый год»', fight:'«Рукопашный бой»',
    med:'«Первая помощь»', tail:'«Шитьё и крой»', mech:'«Устройство автомобиля»'};
  const TIER_NAME = {1:'для начинающих', 2:'для опытных', 3:'для мастеров'};
  const READ_BOOK = 120, READ_MAG = 45;
  const isBook = d => d && d.kind === 'book';

  // ---- книги навыков: новые вещи ----
  for (const k in BOOKS) {
    if (!SKILLS[k]) continue;
    for (const n of [1, 2, 3]) {
      const id = 'sb_' + k + n;
      ITEMS[id] = {name:'Книга ' + BOOKS[k] + ', том ' + n, sh:'Том ' + n, kind:'book', skill:k, vol:n, sbook:true, verb:'Читать'};
      ICONA[id] = 'novel'; KG[id] = .6;
      DESC[id] = 'Книга ' + TIER_NAME[n] + ' о навыке «' + SKILLS[k].name + '». Подходит на уровнях ' + MAG_TIER[n][0] + '–' + (MAG_TIER[n][1] + 1) +
        '. Прочитав, учишься втрое быстрее до уровня ' + (MAG_TIER[n][1] + 1) + '. Читается долго, около двух минут — закладка сохраняется, если прервёшься.';
    }
  }
  // журналы теперь — разовый опыт, а «втрое быстрее» — у книг
  for (const id in ITEMS) {
    const d = ITEMS[id]; if (!isBook(d) || d.sbook || !d.skill || !d.vol) continue;
    DESC[id] = 'Журнал для ' + (d.vol === 1 ? 'новичков' : d.vol === 2 ? 'опытных' : 'мастеров') + ' о навыке «' + SKILLS[d.skill].name + '». Подходит на уровнях ' + MAG_TIER[d.vol][0] + '–' + (MAG_TIER[d.vol][1] + 1) +
      '. Прочитав, сразу получаешь немного опыта. Чтобы учиться быстрее, нужны книги навыка.';
  }
  { const add = (c, ...ids) => { if (CONT[c] && CONT[c].loot) for (const id of ids) if (ITEMS[id]) CONT[c].loot.push(id); };
    const v1 = k => 'sb_' + k + '1', v2 = k => 'sb_' + k + '2', v3 = k => 'sb_' + k + '3', all = Object.keys(BOOKS);
    add('bookshelf', ...all.map(v1), ...all.map(v1), ...all.map(v2), ...all.map(v3));
    add('desk', v1('carp'), v1('mech'), v1('cook'), v2('mech'));
    add('nightstand', v1('cook'), v1('tail'), v1('med'));
    add('medcab', v1('med')); add('medshelf', v1('med'), v2('med'), v3('med'));
    add('toolrack', v1('carp'), v2('carp'), v1('mech'), v3('carp'));
    add('crate', v1('farm'), v2('farm'), v2('carp')); add('locker', v1('fight'), v2('fight'), v3('fight'));
    add('counter', v1('cook'), v2('cook'), v3('cook')); add('dresser', v1('tail'), v2('tail'));
  }

  // ---- проверка до чтения (раньше — после, впустую) ----
  function canRead(it) {
    const d = ITEMS[it.id]; if (!d || !d.skill || !d.vol) return true;
    const lv = skillLv(d.skill), [lo, hi] = MAG_TIER[d.vol];
    P.readMag = P.readMag || {};
    if (P.readMag[it.id]) { toast(d.sbook ? 'Эту книгу ты уже прочитал' : 'Этот журнал ты уже прочитал'); return false; }
    if (lv > hi + (d.vol === 3 ? 1 : 0)) { toast('Тут нет ничего нового: ты уже знаешь больше'); return false; }
    if (lv < lo) { toast('Слишком сложно. Сначала ' + (d.sbook ? 'том ' : '№') + (d.vol - 1)); return false; }
    return true;
  }
  { const uk0 = useKind;
    useKind = function (it) {
      const d = it && ITEMS[it.id];
      if (isBook(d)) return ['read', d.sbook ? READ_BOOK : READ_MAG];
      return uk0.apply(this, arguments);
    };
  }
  { const bu0 = beginUse;
    beginUse = function (k) {
      const it = P.inv[k], d = it && ITEMS[it.id];
      if (isBook(d) && !canRead(it)) return;
      const r = bu0.apply(this, arguments);
      const A = P.act;
      if (A && A.kind === 'use' && A.it === it && isBook(d) && it.rp > 0) {             // закладка
        A.t = Math.min(A.dur * .98, it.rp); toast('Продолжаешь с закладки: ' + Math.round(A.t / A.dur * 100) + '%');
      }
      return r;
    };
  }
  // закладка обновляется по ходу чтения: прервался — она остаётся в книге
  onUpdate(() => { const A = P && P.act; if (A && A.kind === 'use' && A.an === 'read' && A.it && isBook(ITEMS[A.it.id])) A.it.rp = A.t; });

  // ---- что даёт прочитанное ----
  readMag = function (k) {
    const it = P.inv[k], d = ITEMS[it.id];
    P.readMag = P.readMag || {}; P.boost = P.boost || {};
    if (P.readMag[it.id]) { toast('Уже прочитано'); return; }
    const [lo, hi] = MAG_TIER[d.vol || 1];
    P.readMag[it.id] = true; delete it.rp; stat('books');
    let msg;
    if (d.sbook) {
      P.boost[d.skill] = {mult:3, max:hi};
      addXp(d.skill, 2);
      msg = 'До уровня ' + (hi + 1) + ' навык «' + SKILLS[d.skill].name + '» растёт втрое быстрее';
    } else {
      const xp = Math.max(2, Math.round((XPL[Math.min(5, hi + 1)] - XPL[lo]) * .3));
      const b0 = P.boost[d.skill]; P.boost[d.skill] = {mult:1, max:9};                   // разовый опыт не умножается и не режется
      addXp(d.skill, xp); if (b0) P.boost[d.skill] = b0; else delete P.boost[d.skill];
      msg = 'Навык «' + SKILLS[d.skill].name + '»: прибавилось опыта. Учиться быстрее помогут книги навыка';
    }
    SFX.rustle(); P.bored = Math.max(0, (P.bored || 0) - 20);
    openPanel('mag', {it, msg, hi});
    if (!panel || panel.kind !== 'mag') { toast('Прочитано: ' + d.name + '. ' + msg); renderInv(); }
  };
  // ---- без книги навык растёт медленно ----
  { const ax0 = addXp;
    addXp = function (k, n) {
      const bst = P && P.boost && P.boost[k];
      if (BOOKS[k] && !(bst && skillLv(k) <= bst.max)) n *= .35;
      return ax0.call(this, k, n);
    };
  }
  // в описании — сколько прочитано
  { const it0 = itemText;
    itemText = function (it) {
      const t = it0.apply(this, arguments), d = it && ITEMS[it.id];
      if (!isBook(d)) return t;
      const done = P && P.readMag && P.readMag[it.id];
      const add = done ? 'прочитано' : it.rp > 0 ? 'закладка на ' + Math.round(it.rp / (d.sbook ? READ_BOOK : READ_MAG) * 100) + '%' : '';
      return add ? (t ? t + ' · ' : '') + add : t;
    };
  }
}
