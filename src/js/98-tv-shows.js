// ================= телевизор как в Project Zomboid: передачи по расписанию и кассеты VHS =================
// Телевизор включается и работает фоном. Первую неделю (TV_DAYS) по каналам «Домашний» и «Мастер» идут передачи
// по расписанию (TV_SCHED): каждая — час, реплика каждые 5 игровых минут, реплики видны над телевизором.
// Пока герой рядом (до 6 клеток и видит экран или совсем близко) и не спит, каждая реплика-совет даёт опыт
// навыку передачи (TV_XP) — эфиром можно дорасти до 3-го уровня (TV_CAP). Фильмы снимают скуку.
// После недели эфир кончается: настроечная таблица и «снег». Канал «Новости» — прежние radioNews (96-media).
// Кассеты VHS (vhs_*) смотрят на канале «Видео»: реплика каждые 4 минуты, пока герой рядом; опыт — только
// за ещё не просмотренные реплики (it.best), до 4-го уровня (VHS_CAP). Досмотрел — кассета выезжает.
// Телевизор шумит: каждая реплика — негромкий звук для мертвецов рядом (noise). Без электричества гаснет.
const TV_DAYS = 7, TV_XP = .3, TV_CAP = 3, VHS_XP = .6, VHS_CAP = 4, TV_NEAR = 6, TV_LINE = 5, VHS_LINE = 4;
const TV_CH = [[1, 'ГТВ · новости'], [2, 'Домашний'], [3, 'Мастер'], [4, 'Видео']];
const TVS = {f:null, ch:2, key:'', vhs:null, vt:0, sub:null, news:null};
KG_KIND.vhs = .25;

const SHOWS = {
  farm:{t:'Огород круглый год', host:'Нина Петровна', tips:[
    'Морковь любит рыхлую землю: перед посевом вскопайте грядку поглубже.',
    'Поливайте утром или вечером. Днём вода уходит в пар, а листья обжигает солнце.',
    'Картофель сажают в прогретую землю. Мёрзлую грядку не мучайте.',
    'Сорняки забирают воду у овощей. Пять минут прополки в день — и урожай вдвое больше.',
    'Дождевую воду собирайте в бочки: растения любят её больше, чем из-под крана.',
    'Капусту сажайте пореже, ей нужно место, чтобы завязать кочан.',
    'Семена храните в сухом тёмном месте, в бумажных конвертах.',
    'Перезрелые овощи гниют прямо на грядке. Собирайте вовремя.',
    'Тыква растёт долго, зато в прохладном подвале хранится всю зиму.',
    'Заморозки губят рассаду. Обещают холод — укройте грядки.']},
  cook:{t:'Вкусно и просто', host:'Шеф Аркадий', tips:[
    'Сырое мясо всегда жарим до конца. Розовое — это не модно, это больница.',
    'Вода, крупа и банка тушёнки — вот вам суп на три дня.',
    'Воду из реки и луж обязательно кипятим. Пять минут кипения — и можно пить.',
    'Консервы хранятся годами, а вздутую банку — сразу в мусор.',
    'Открытая банка в тепле портится за день. Ешьте сразу.',
    'Костёр — не плита. Держите котелок над углями, а не над пламенем.',
    'Соль и специи делают скучную еду съедобной, а настроение — лучше.',
    'Хлеб черствеет за пару дней, а сухари хранятся неделями.',
    'Рыбу чистим, потрошим и жарим в тот же день.',
    'Горячая еда согревает лучше любого свитера.']},
  carp:{t:'Своими руками', host:'Мастер Степаныч', tips:[
    'Доску к окну прибивают минимум четырьмя гвоздями, по два с каждой стороны.',
    'Молоток держим за конец рукояти: удар сильнее, рука устаёт меньше.',
    'Из старой мебели выходят отличные доски. Разбирайте, а не выбрасывайте.',
    'Пила режет на себя. Не давите, пусть работают зубья.',
    'Двойная доска на двери держит втрое дольше одинарной.',
    'Гвозди храните в банке с крышкой — не ржавеют и не теряются.',
    'Прежде чем строить стену, разметьте её. Кривая стена падает первой.',
    'Колья вокруг дома ставьте остриём наружу, с наклоном от себя.',
    'Треснувшую доску не латайте, меняйте целиком.',
    'Хороший мастер убирает за собой: гвоздь под ногой — к травме.']},
  tail:{t:'Иголка с ниткой', host:'Валентина Сергеевна', tips:[
    'Порванную куртку проще зашить сразу, пока дыра маленькая.',
    'Заплатка из плотной ткани превращает старые джинсы в рабочие.',
    'Старую одежду — на тряпки: пригодятся и для перевязки, и для оружия.',
    'Шов «назад иголку» самый прочный. Им шьют всё, что носят на улице.',
    'Шерстяная подкладка греет даже мокрой.',
    'Нитку не делайте длиннее локтя: путается и рвётся.',
    'Толстую ткань прокалывайте с напёрстком, а не пальцем.',
    'Кожаные вещи живут дольше, если не сушить их у огня.',
    'Перед зимой проверьте одежду на дыры: холод найдёт каждую.',
    'Две тонкие вещи под курткой теплее одной толстой.']},
  med:{t:'Будьте здоровы', host:'Доктор Самойлов', tips:[
    'Любую рану сначала промойте чистой водой, потом перевязывайте.',
    'Повязку меняют, как только она промокла или испачкалась.',
    'Горячая красная кожа вокруг раны — заражение. Нужен антисептик.',
    'Кровь из руки или ноги останавливает жгут выше раны. Не дольше часа!',
    'Перелом фиксируют шиной: две ровные палки и бинт.',
    'При высокой температуре пейте больше воды и лежите.',
    'Обезболивающее не лечит, а только глушит боль. Не путайте.',
    'Чистые руки — половина лечения, даже когда воды мало.',
    'Сон лечит лучше многих таблеток.',
    'Укус обработайте сразу, даже если он совсем маленький.']},
  fit:{t:'Зарядка с Петровичем', host:'Петрович', tips:[
    'Встали, расправили плечи! Двадцать приседаний — и день начался.',
    'На подъёме вдох носом, на выдохе — ртом. Дыхание не задерживаем!',
    'Пять минут бега трусцой каждый день — и через неделю не задохнётесь на лестнице.',
    'Отжимания от пола: сколько можете — и ещё одно.',
    'Тяжёлое носите на спине, а не в руках. Спина сильнее.',
    'Наклоны в стороны — для тех, кто много сидит.',
    'Разомните ноги перед бегом, иначе завтра не встанете.',
    'После нагрузки — вода и отдых. Мышцы растут во сне.',
    'Сильный меньше устаёт, а уставший делает глупости.',
    'Планка, тридцать секунд. Держим! Держим! Отлично.']},
  mech:{t:'Гараж', host:'Михалыч', tips:[
    'Не заводится? Сначала бензин, потом аккумулятор.',
    'Бензин из бака сливают шлангом в канистру. И не курить рядом!',
    'На морозе аккумулятор садится. Держите машину в гараже.',
    'Пробили колесо — ставим запаску. Домкрат, ключ и десять минут.',
    'Масло проверяют щупом, на холодном двигателе.',
    'Стучит мотор — не газуйте. Остановитесь и послушайте.',
    'Ключ от машины чаще всего висит в доме, на крючке у двери.',
    'Мотор слышно за квартал. Подумайте, кто ещё его услышит.',
    'Генератор — тот же мотор: бензин, масло и свежий воздух.',
    'Инструмент кладите на место. В темноте будете искать на ощупь.']},
  fight:{t:'Самооборона для всех', host:'Тренер Карина', tips:[
    'Главное в драке — дистанция. Держите противника на длине руки и палки.',
    'Короткий удар быстрее размаха. Размахнулись — открылись.',
    'Толчок, шаг назад, удар. Толчок, шаг назад, удар!',
    'С толпой не деритесь. Отступайте в узкий проход — пусть идут по одному.',
    'Упали — сразу вставайте и откатывайтесь в сторону.',
    'Тяжёлое оружие бьёт сильнее, но быстрее выматывает.',
    'Цельтесь в голову, по корпусу — только силы терять.',
    'Затупленное лезвие легко ломается. Следите за оружием.',
    'Устали — уходите. Уставший боец промахивается.',
    'Лучшая драка — та, которой удалось избежать.']},
};
const FILMS = [
  {t:'Тайна старой дачи', lines:['— Ты слышал? На чердаке кто-то ходит.', '— Это ветер, Маша. Просто ветер.', '— Ветер не скрипит половицами.', '— Ладно. Возьми фонарь, я — топор.', '— Здесь пахнет… яблоками?', '— Смотри, следы. Детские.', '— В этом доме двадцать лет никто не жил.', '— Тогда кто зажёг свечу?', '— Бежим! Бежим к машине!', '— Ключи… где ключи?!']},
  {t:'Неуловимый Лис', lines:['— Сейф открыт, генерал. Пустой.', '— Опять Лис. Третий раз за месяц.', '— Он оставил записку: «Спасибо за гостеприимство».', '— Перекрыть все дороги из города!', '— А если он не уехал? Если он среди нас?', '— Официант, ещё кофе. С сахаром.', '— Конечно, месье. Вам с корицей?', '— Вы весьма наблюдательны, мой друг.', '— Взять его! Это он!', '— Слишком поздно, генерал. Слишком поздно.']},
  {t:'Звёзды над степью', lines:['— Посмотри, сколько звёзд. В городе такого не увидишь.', '— Останемся здесь до утра?', '— Трактор чинить надо, а ты про звёзды.', '— Трактор подождёт. Звёзды — нет.', '— Знаешь, я ведь тогда не уехал из-за тебя.', '— Знаю. Я ждала.', '— Слышишь? Сверчки.', '— Это не сверчки. Это сердце стучит.', '— Завтра будет дождь.', '— Пусть. Нам будет тепло.']},
  {t:'Последний рейс', lines:['— Командир, топлива на сорок минут.', '— До аэродрома пятьдесят.', '— Значит, будем садиться в поле.', '— Пассажиров предупредить?', '— Скажи, что небольшая болтанка. И улыбайся.', '— Шасси не выходит!', '— Выпустим вручную. Держи штурвал.', '— Поле! Вижу поле!', '— Держитесь крепче, ребята.', '— Мы… сели? Мы сели!']},
];
// расписание: [час начала, передача]; передача длится час
const TV_SCHED = {
  2:{name:'Домашний', slots:[[7, 'farm'], [10, 'cook'], [13, 'carp'], [16, 'tail'], [19, 'med'], [21, 'film']]},
  3:{name:'Мастер', slots:[[8, 'fit'], [11, 'mech'], [14, 'fight'], [17, 'cook'], [20, 'fit'], [22, 'film']]},
};
const VHS = {
  cook:{t:'Кухня на скорую руку'}, carp:{t:'Дом своими руками'}, farm:{t:'Секреты урожая'}, tail:{t:'Шьём дома'},
  med:{t:'Первая помощь. Учебный фильм'}, fit:{t:'Аэробика за 30 минут'}, mech:{t:'Ремонт «Жигулей»'}, fight:{t:'Уличная самооборона'},
};
// ---- кассеты: предметы, описание, где лежат ----
{
  const add = {}, desc = {};
  for (const [k, v] of Object.entries(VHS)) {
    add['vhs_' + k] = {name:'VHS «' + v.t + '»', sh:'VHS', kind:'vhs', skill:k, verb:'Смотреть'};
    desc['vhs_' + k] = 'Видеокассета: «' + v.t + '». Поставь в телевизор с электричеством и смотри рядом — растёт навык «' + SKILLS[k].name + '» (до ' + VHS_CAP + '-го уровня). Опыт — только в первый просмотр.';
  }
  add.vhs_film = {name:'Кассета с фильмом', sh:'VHS', kind:'vhs', verb:'Смотреть'};
  desc.vhs_film = 'Видеокассета с фильмом. Поставь в телевизор — скука и тревога отступят.';
  Object.assign(ITEMS, add); Object.assign(DESC, desc);
  const ids = Object.keys(add), push = (k, ...a) => CONT[k] && CONT[k].loot.push(...a);
  push('bookshelf', ...ids.filter(i => i !== 'vhs_film'), 'vhs_film', 'vhs_film');
  push('coffeetab', 'vhs_film', 'vhs_film', 'vhs_cook', 'vhs_fit');
  push('boxes', 'vhs_film', 'vhs_carp', 'vhs_mech', 'vhs_farm');
  push('dresser', 'vhs_film', 'vhs_tail', 'vhs_med');
}
defUse(it => ITEMS[it.id] && ITEMS[it.id].kind === 'vhs', it => {
  // ближайший телевизор с электричеством
  let best = null, bd = 4;
  for (const f of furns) if (f.type === 'tv' && !f.dead) { const d = Math.hypot(f.cx - P.x, f.cy - P.y); if (d < bd) { bd = d; best = f; } }
  if (!best) { toast('Кассету смотрят по телевизору. Подойди к нему'); return; }
  if (!poweredAt(best.cx, best.cy)) { toast('Без электричества телевизор не включить'); return; }
  tvOn(best); tvInsert(it); openPanel('radio', {tv:true, f:best, news:radioNews()});
});

// ---- что сейчас в эфире ----
function tvNow(ch, gm) {
  const S = TV_SCHED[ch], day = Math.floor(gm / 1440), m = gm - day * 1440;
  if (!S) return null;
  if (day >= TV_DAYS) return {ended:true};
  for (const [h, k] of S.slots) {
    const st = h * 60;
    if (m >= st && m < st + 60) {
      const idx = Math.floor((m - st) / TV_LINE), film = k === 'film';
      const sh = film ? null : SHOWS[k], F = film ? FILMS[(day + ch) % FILMS.length] : null;
      return {k, film, ch, day, st, idx, left:st + 60 - m, title:film ? 'Вечерний фильм: «' + F.t + '»' : sh.t, host:film ? F.t : sh.host, skill:film ? null : k, line:tvLine(k, day, idx, ch)};
    }
  }
  const nx = S.slots.find(([h]) => h * 60 > m) || null;
  return {gap:true, next:nx ? [nx[0], nx[1]] : (day + 1 < TV_DAYS ? [S.slots[0][0], S.slots[0][1], true] : null)};
}
function tvLine(k, day, idx, ch) {
  const last = idx >= 11;
  if (k === 'film') {
    const F = FILMS[(day + ch) % FILMS.length];
    return idx === 0 ? 'Смотрите фильм «' + F.t + '».' : last ? 'Конец фильма. Спокойной ночи.' : F.lines[(idx - 1) % F.lines.length];
  }
  const sh = SHOWS[k];
  if (idx === 0) return day >= 4 ? 'Мы в эфире, несмотря ни на что. «' + sh.t + '», выпуск ' + (day + 1) + '.' : 'Здравствуйте! В эфире «' + sh.t + '», выпуск ' + (day + 1) + '.';
  if (last) return day >= TV_DAYS - 1 ? 'На сегодня всё. Берегите себя… и друг друга.' : 'На сегодня всё. Завтра в это же время — до встречи!';
  return sh.tips[(idx - 1 + day * 3) % sh.tips.length];
}
const tvTitleOf = k => k === 'film' ? 'Вечерний фильм' : SHOWS[k].t;
function tvNowLabel() {
  if (TVS.ch === 1) return 'новости';
  if (TVS.ch === 4) return TVS.vhs ? 'кассета' : 'видео';
  const n = tvNow(TVS.ch, gameMin);
  return !n || n.ended ? 'нет сигнала' : n.gap ? 'перерыв' : '«' + n.title.replace(/^Вечерний фильм: /, '').replace(/[«»]/g, '') + '»';
}

// ---- включить, выключить, кассета ----
function tvOn(f) {
  if (TVS.f !== f) { TVS.f = f; TVS.ch = f.tch || 2; TVS.key = ''; TVS.vhs = null; TVS.sub = null; SFX.tvSwitch(); }
}
function tvOff() {
  if (TVS.f) TVS.f.tch = TVS.ch;
  TVS.f = null; TVS.vhs = null; TVS.key = ''; TVS.sub = null; SFX.ui();
}
function tvInsert(it) {
  TVS.vhs = it; TVS.ch = 4; TVS.vt = 0; TVS.key = '';
  it.vp = it.vp && it.vp < tapeLines(it).length ? it.vp : 0;
  SFX.ui();
}
function tapeLines(it) {
  const d = ITEMS[it.id];
  if (d.skill) { const sh = SHOWS[d.skill]; return ['«' + VHS[d.skill].t + '». Ведущий — ' + sh.host + '.', ...sh.tips, 'Конец записи. Перемотайте кассету.']; }
  if (it.film == null) it.film = Math.floor(Math.random() * FILMS.length);
  const F = FILMS[it.film]; return ['Фильм «' + F.t + '».', ...F.lines, 'Конец фильма.'];
}
function tvSay(who, text, col) { TVS.sub = {who, text, col, t:6}; }

// герой смотрит: рядом, не спит, видит экран (или стоит совсем близко)
function tvWatching() {
  const f = TVS.f; if (!f || P.sleep || P.dead) return false;
  const d = Math.hypot(f.cx - P.x, f.cy - P.y);
  return d <= 2.2 || (d <= TV_NEAR && tvSeen(f));
}
// экран видно: клетка телевизора или соседняя открыта взгляду (сама клетка мебели бывает «невидимой»)
function tvSeen(f) { const x = Math.floor(f.cx), y = Math.floor(f.cy); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (vis[(y + dy) * MW + x + dx]) return true; return false; }

onUpdate(dt => {
  if (!P || mode !== 'play' || paused) return;
  const f = TVS.f; if (!f) return;
  if (f.dead || !poweredAt(f.cx, f.cy)) { const near = Math.hypot(f.cx - P.x, f.cy - P.y) < 8; tvOff(); if (near) toast('Телевизор погас: нет электричества'); return; }
  if (TVS.sub) TVS.sub.t -= dt;
  const watch = tvWatching();
  if (TVS.ch === 4) {                                                         // видео: идёт, только пока смотришь
    const it = TVS.vhs;
    if (!it) return;
    if (!P.inv.includes(it)) { TVS.vhs = null; tvSay('Видео', 'Кассета извлечена', '#9fb3c0'); return; }
    if (!watch) return;
    const L = tapeLines(it), d = ITEMS[it.id], gm = dt * settings.dayLen;
    if (TVS.key !== 'v' + it.vp) {
      TVS.key = 'v' + it.vp;
      tvSay('VHS', L[it.vp], '#ffd166'); noise(f.cx, f.cy, 3);
      if (d.skill && it.vp > 0 && it.vp < L.length - 1 && it.vp > (it.best != null ? it.best : 0)) { if (skillLv(d.skill) < VHS_CAP) addXp(d.skill, VHS_XP); it.best = it.vp; }
      if (!d.skill) { P.bored = Math.max(0, (P.bored || 0) - (it.done ? 1.5 : 3)); P.stress = Math.max(0, (P.stress || 0) - 1); }
    }
    TVS.vt += gm;
    if (TVS.vt >= VHS_LINE) {
      TVS.vt = 0; it.vp++;
      if (it.vp >= L.length) { it.vp = 0; it.done = true; TVS.vhs = null; TVS.key = ''; toast(d.skill ? 'Кассета досмотрена. Новое из неё уже не узнать' : 'Фильм кончился. Кассету можно пересмотреть'); renderInv(); }
    }
    return;
  }
  let who, text, col, k, skill = null, fun = false;
  if (TVS.ch === 1) {                                                          // новости: сюжет каждые 5 минут
    const news = TVS.news && TVS.news.d === dayNo() ? TVS.news.v : (TVS.news = {d:dayNo(), v:radioNews()}).v;
    const n = Math.floor(gameMin / TV_LINE); k = 'n' + n; [who, text] = news[n % news.length]; col = '#9fd3ff';
  } else {
    const n = tvNow(TVS.ch, gameMin);
    if (!n || n.ended || n.gap) { TVS.key = ''; return; }
    k = TVS.ch + ':' + n.day + ':' + n.st + ':' + n.idx; who = n.film ? '«' + n.host + '»' : n.host; text = n.line; col = n.film ? '#e8c6ff' : '#ffd166';
    if (!n.film && n.idx > 0 && n.idx < 11) skill = n.skill;
    fun = n.film;
  }
  if (k === TVS.key) return;
  TVS.key = k; tvSay(who, text, col); noise(f.cx, f.cy, 3);
  if (!watch) return;
  if (skill && skillLv(skill) < TV_CAP) addXp(skill, TV_XP);
  P.bored = Math.max(0, (P.bored || 0) - (fun ? 2.5 : .8));
});
onLoad(() => { TVS.f = null; TVS.vhs = null; TVS.sub = null; TVS.key = ''; });
onNewWorld(() => { TVS.f = null; TVS.vhs = null; TVS.sub = null; TVS.key = ''; });

// ---- реплики над телевизором (в разрешении экрана, после подписей действий — 17-render) ----
function drawTvSubs() {
  const f = TVS.f, s = TVS.sub;
  if (!f || !s || s.t <= 0 || mode !== 'play' || P.sleep) return;
  if (Math.hypot(f.cx - P.x, f.cy - P.y) > 12 || !tvSeen(f)) return;
  const a = Math.min(1, s.t / .6, (6 - s.t) / .25), K = SCALE, fs = 12 * DEV, maxW = 230 * DEV;
  const x = SX(f.cx, f.cy) * K, y0 = SY(f.cx, f.cy, U * 2.2) * K;
  const c = mainCtx; c.save(); c.globalAlpha = Math.max(0, a); c.font = `700 ${fs}px "PT Sans", sans-serif`; c.textAlign = 'center';
  const words = s.text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  const lh = fs * 1.25, w = Math.min(maxW, Math.max(...lines.map(l => c.measureText(l).width), c.measureText(s.who).width)) + 14 * DEV, h = lh * (lines.length + 1) + 8 * DEV;
  const y = y0 - h;
  c.fillStyle = 'rgba(10,14,18,.82)'; c.fillRect(x - w / 2, y, w, h);
  c.fillStyle = s.col; c.font = `700 ${fs * .92}px "PT Sans", sans-serif`; c.fillText(s.who, x, y + 4 * DEV + fs);
  c.fillStyle = '#e8e2d4'; c.font = `400 ${fs}px "PT Sans", sans-serif`;
  lines.forEach((l, i) => c.fillText(l, x, y + 4 * DEV + fs + lh * (i + 1)));
  c.restore();
}

// ---- экраны каналов в окне телевизора (96-media: mediaTV) ----
const SK_SHORT = k => SKILLS[k] ? SKILLS[k].name : '';
function tvShowScreen(inn, ch, tok) {
  const S = TV_SCHED[ch], n = tvNow(ch, gameMin);
  if (n.ended) { if (ch === 2) tvBars(inn, S.name.toUpperCase(), 'Вещание прекращено'); else tvSnow(inn, tok); return; }
  const top = mk('div', 'tvn-top'); top.appendChild(mk('span', 'tvn-logo ch' + ch, S.name.toUpperCase()));
  const live = mk('span', 'tvn-live'); live.appendChild(mk('i')); live.appendChild(document.createTextNode('ЭФИР')); top.appendChild(live);
  top.appendChild(mk('span', 'tvn-clock', hhmm(gameMin))); inn.appendChild(top);
  if (n.gap) {
    inn.appendChild(mk('div', 'tvs-gap', '♪ Музыкальная пауза ♪'));
    if (n.next) inn.appendChild(mk('div', 'tvs-next', (n.next[2] ? 'Завтра в ' : 'Далее в ') + String(n.next[0]).padStart(2, '0') + ':00 — «' + tvTitleOf(n.next[1]) + '»'));
    return;
  }
  const tag = mk('div', 'tvs-tag', n.film ? 'Кино · снимает скуку' : 'Навык: ' + SK_SHORT(n.skill) + (skillLv(n.skill) >= TV_CAP ? ' · ты уже знаешь больше' : ' · до ' + TV_CAP + '-го уровня'));
  inn.appendChild(tag);
  inn.appendChild(mk('div', 'tvs-title', n.title));
  const msg = mk('div', 'tvn-txt'); inn.appendChild(msg);
  typeInto(msg, (n.film ? '' : n.host + ': ') + n.line, 60);
  const bar = mk('div', 'tvs-bar'); const fill = mk('i'); fill.style.width = Math.round((60 - n.left) / 60 * 100) + '%'; bar.appendChild(fill); inn.appendChild(bar);
  const nx = S.slots.find(([h]) => h * 60 >= n.st + 60);
  inn.appendChild(mk('div', 'tvs-next', 'Осталось ' + Math.ceil(n.left) + ' мин' + (nx ? ' · далее в ' + String(nx[0]).padStart(2, '0') + ':00 «' + tvTitleOf(nx[1]) + '»' : '')));
}
function tvVideoScreen(inn) {
  const top = mk('div', 'tvn-top'); top.appendChild(mk('span', 'tvn-logo ch4', 'ВИДЕО')); top.appendChild(mk('span', 'tvn-clock', TVS.vhs ? '▶ PLAY' : '■ STOP')); inn.appendChild(top);
  const it = TVS.vhs && TVS.f === panel.f ? TVS.vhs : null;
  if (it) {
    const L = tapeLines(it), d = ITEMS[it.id];
    inn.appendChild(mk('div', 'tvs-tag', d.skill ? 'Навык: ' + SK_SHORT(d.skill) + (it.done ? ' · уже смотрел, опыта не будет' : ' · до ' + VHS_CAP + '-го уровня') : 'Кино · снимает скуку'));
    inn.appendChild(mk('div', 'tvs-title', d.name.replace(/^VHS /, '')));
    const msg = mk('div', 'tvn-txt'); inn.appendChild(msg); typeInto(msg, L[it.vp], 60);
    const bar = mk('div', 'tvs-bar'); const fill = mk('i'); fill.style.width = Math.round(it.vp / (L.length - 1) * 100) + '%'; bar.appendChild(fill); inn.appendChild(bar);
    const row = mk('div', 'tvs-vrow'); row.appendChild(mk('span', 'tvs-next', 'Запись ' + (it.vp + 1) + ' из ' + L.length + ' · идёт, пока ты рядом'));
    row.appendChild(btn('Извлечь', () => { TVS.vhs = null; TVS.key = ''; SFX.ui(); renderPanel(); }, 'tvs-ej')); inn.appendChild(row);
    return;
  }
  const tapes = P.inv.filter(i => ITEMS[i.id] && ITEMS[i.id].kind === 'vhs');
  if (!tapes.length) { inn.appendChild(mk('div', 'tvs-gap', 'Нет кассеты')); inn.appendChild(mk('div', 'tvs-next', 'Кассеты VHS лежат в книжных шкафах, на журнальных столиках, в комодах и коробках')); return; }
  inn.appendChild(mk('div', 'tvs-tag', 'Вставь кассету:'));
  const list = mk('div', 'tvs-tapes');
  for (const t of tapes) {
    const d = ITEMS[t.id], b = btn('', () => { if (!panel.f) return; tvOn(panel.f); tvInsert(t); panel.ch = 4; renderPanel(); }, 'tvs-tape' + (t.done ? ' done' : ''));
    b.appendChild(mk('b', '', d.name.replace(/^VHS /, ''))); b.appendChild(mk('small', '', (d.skill ? SK_SHORT(d.skill) : 'фильм') + (t.done ? ' · просмотрено' : '')));
    list.appendChild(b);
  }
  inn.appendChild(list);
}
// программа передач на сегодня: оба канала, текущая подсвечена, прошедшие бледнее
function tvGuide(cur) {
  const g = mk('div', 'tvg'), day = dayNo(), m = gameMin - day * 1440;
  if (day >= TV_DAYS) { g.appendChild(mk('div', 'tvg-end', 'Телепрограммы больше нет: вещание прекращено. Остались новости и кассеты VHS.')); return g; }
  g.appendChild(mk('div', 'tvg-h', 'Программа на ' + dateStr(gameMin) + (day === TV_DAYS - 1 ? ' · последний день эфира' : ' · эфир ещё ' + (TV_DAYS - day) + ' дн.')));
  const cols = mk('div', 'tvg-cols');
  for (const ch of [2, 3]) {
    const c = mk('div', 'tvg-col' + (cur === ch ? ' cur' : '')); c.appendChild(mk('div', 'tvg-ch', ch + ' · ' + TV_SCHED[ch].name));
    for (const [h, k] of TV_SCHED[ch].slots) {
      const st = h * 60, r = mk('div', 'tvg-row' + (m >= st + 60 ? ' past' : m >= st ? ' now' : ''));
      r.appendChild(mk('span', 'tvg-t', String(h).padStart(2, '0') + ':00')); r.appendChild(mk('span', 'tvg-n', tvTitleOf(k)));
      r.appendChild(mk('span', 'tvg-s', k === 'film' ? 'кино' : SK_SHORT(k)));
      c.appendChild(r);
    }
    cols.appendChild(c);
  }
  g.appendChild(cols);
  return g;
}
