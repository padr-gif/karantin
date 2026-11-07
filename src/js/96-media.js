// ================= радио, телевизор, газета, записки, журналы, роман: у каждого своё окно =================
// Окна рисуются из renderPanelCore (21-panels) по виду окна: 'radio' (и телевизор: panel.tv), 'note', 'paper', 'mag', 'novel'.
// Вид окна — в #panel[data-skin] (стили в конце styles.css). Тексты новостей — те же radioNews (23-survival-kit).
// Таймеры (печать текста, бегущая строка, помехи) сами останавливаются, когда окно закрыли или сменили (mediaStop).
const MEDIA = {tok:0, timers:[], raf:0};
function mediaStop() {
  MEDIA.tok++;
  for (const t of MEDIA.timers) clearInterval(t);
  MEDIA.timers.length = 0;
  if (MEDIA.raf) { cancelAnimationFrame(MEDIA.raf); MEDIA.raf = 0; }
}
const mediaAlive = (tok, kind) => tok === MEDIA.tok && panel && panel.kind === kind;
const mpick = a => a[Math.floor(Math.random() * a.length)];                 // не rng(): чтение не должно сдвигать случайность мира
// текст печатается по буквам; тап — сразу целиком
// У каждого поля свой таймер: новый текст (следующий сюжет, другая станция) сначала гасит старую печать — иначе
// два таймера пишут в одно поле по очереди и буквы перемешиваются. Недопечатанная часть стоит невидимой,
// поэтому строки не прыгают и не наезжают друг на друга, пока текст печатается.
function stopType(el) { if (el._tt) { clearInterval(el._tt); el._tt = 0; } el.onclick = null; }
function typeInto(el, text, cps) {
  stopType(el);
  el.textContent = '';
  if (reduceMotion || !text) { el.textContent = text || ''; return; }
  const tok = MEDIA.tok, step = Math.max(1, Math.round((cps || 70) / 40));
  const vis = mk('span'), rest = mk('span', 'tw-rest', text);
  el.appendChild(vis); el.appendChild(rest);
  let n = 0;
  const done = () => { stopType(el); el.textContent = text; };
  const t = setInterval(() => {
    if (tok !== MEDIA.tok || !el.isConnected) { stopType(el); return; }
    n = Math.min(text.length, n + step); vis.textContent = text.slice(0, n); rest.textContent = text.slice(n);
    if (n >= text.length) done();
  }, 25);
  el._tt = t; MEDIA.timers.push(t);
  el.onclick = e => { if (el._tt) { done(); e.stopPropagation(); } };   // тап по недопечатанному — дописать, дальше не листать
}
const hhmm = m => { m = ((Math.floor(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };

// =============== радиоприёмник ===============
// Каждый источник новостей — своя станция на шкале 88–108 МГц. Крути ручку или тащи по шкале; между станциями — треск,
// рядом со станцией голос пробивается сквозь помехи. Вечером на 99,9 — пиратская «Волна» радиоведущего из записок.
const RADIO_FQ = {'Штаб эвакуации':101.4, 'Метеослужба':91.2, 'Погода':91.2, 'Энергосеть':94.6, 'Водоканал':97.1, 'Военные':104.3, 'Гражданская оборона':107.2};
const RADIO_MERGE = {'Погода':'Метеослужба'};
const FQ_LO = 88, FQ_HI = 108, FQ_LOCK = .25, FQ_EDGE = .7;
const DJ_LINES = [
  'Добрый вечер, город. Это «Волна», и я всё ещё здесь. Если вы меня слышите — значит, вы тоже.',
  'Совет вечера: не жгите свет у окон. Они идут на свет, как мотыльки. Только мотыльки не кусаются.',
  'Сегодня без музыки. Пластинки остались в студии на втором этаже, а туда я больше не хожу.',
  'Мне никто не пишет — связи нет. Но я представляю, что пишете. Спасибо, мне тоже вас не хватает.',
  'Кто-то оставил на крыльце банку тушёнки. Я не открыл дверь. Но спасибо. Правда спасибо.',
  'Говорят, у реки остались лодки. Я не проверял. Если проверите — расскажите кому-нибудь.',
  'Они слышат шаги. Ходите медленно, дышите тихо. Я вот шепчу уже третью неделю.',
  'Генератор кашляет, но тянет. Пока он тянет — я в эфире. Не выключайтесь и вы.',
];
function radioStations(news) {
  const out = [];
  for (const [who, text] of news) {
    const name = RADIO_MERGE[who] || who;
    let s = out.find(s => s.name === name);
    if (!s) out.push(s = {name, f:RADIO_FQ[who] || 100.6 + out.length * .9, msgs:[]});
    s.msgs.push(text);
  }
  if (dayNo() < 21) {                                                        // «Волна» вещает, пока у ведущего есть бензин
    const h = (gameMin % 1440) / 60, on = h >= 20 || h < 2;
    const a = mpick(DJ_LINES); let b = mpick(DJ_LINES); if (b === a) b = DJ_LINES[(DJ_LINES.indexOf(a) + 3) % DJ_LINES.length];
    out.push({name:'Радио «Волна»', f:99.9, dj:true, msgs:on ? [a, b] : null});
  }
  return out.sort((x, y) => x.f - y.f);
}
const fqTxt = f => f.toFixed(1).replace('.', ',');
function nearSt(sts, fq) { let b = null, bd = 1e9; for (const s of sts) { const d = Math.abs(s.f - fq); if (d < bd) { bd = d; b = s; } } return [b, bd]; }
// чем дальше от станции, тем больше букв съедает треск
function garble(text, k) {
  const N = '░▒·~-–…'; let o = '';
  for (const ch of text) o += ch !== ' ' && Math.random() > k ? N[Math.floor(Math.random() * N.length)] : ch;
  return o;
}
function mediaRadio(body) {
  const it = panel.it;
  $('pnTitle').textContent = 'Радиоприёмник'; $('pnSub').textContent = 'Крути ручку или веди пальцем по шкале';
  if (!panel.st) panel.st = radioStations(panel.news);
  const sts = panel.st;
  if (panel.fq == null) {                                                    // с той же волны, что слушал в прошлый раз; иначе — самое важное
    const ev = sts.find(s => s.name === 'Штаб эвакуации'), mil = sts.find(s => s.name === 'Военные' && s.msgs);
    panel.fq = it.fq && it.fq >= FQ_LO && it.fq <= FQ_HI ? it.fq : (ev || mil || sts[0]).f;
  }
  const dev = mk('div', 'rdo'), tok = MEDIA.tok;
  // шкала
  const sc = mk('div', 'rdo-scale');
  for (let f = 88; f <= 108; f += 4) { const l = mk('span', 'rdo-num', String(f)); l.style.left = ((f - FQ_LO) / (FQ_HI - FQ_LO) * 100) + '%'; sc.appendChild(l); }
  for (const s of sts) { const m = mk('i', 'rdo-mark' + (s.msgs ? '' : ' off')); m.style.left = ((s.f - FQ_LO) / (FQ_HI - FQ_LO) * 100) + '%'; sc.appendChild(m); }
  const needle = mk('b', 'rdo-needle'); sc.appendChild(needle);
  dev.appendChild(sc);
  // экран и ручка
  const mid = mk('div', 'rdo-mid'), disp = mk('div', 'rdo-disp');
  const head = mk('div', 'rdo-st'), stName = mk('span', 'rdo-name'), stF = mk('span', 'rdo-f'), bars = mk('span', 'rdo-bars');
  for (let k = 0; k < 5; k++) bars.appendChild(mk('i'));
  head.appendChild(stName); head.appendChild(stF); head.appendChild(bars);
  const txt = mk('div', 'rdo-txt');
  disp.appendChild(head); disp.appendChild(txt); mid.appendChild(disp);
  const side = mk('div', 'rdo-side'), knob = mk('div', 'rdo-knob'); knob.appendChild(mk('i', 'rdo-dot'));
  const bp = btn('', () => jump(-1), 'rdo-b'), bn = btn('', () => jump(1), 'rdo-b');
  bp.appendChild(svgIc('i-left')); bn.appendChild(svgIc('i-right')); bp.setAttribute('aria-label', 'Предыдущая станция'); bn.setAttribute('aria-label', 'Следующая станция');
  const brow = mk('div', 'rdo-brow'); brow.appendChild(bp); brow.appendChild(bn);
  side.appendChild(knob); side.appendChild(brow); mid.appendChild(side);
  dev.appendChild(mid);
  // низ: динамик, батарейка, «поймать ещё»
  const bot = mk('div', 'rdo-bot');
  bot.appendChild(mk('div', 'rdo-grill'));
  const bat = mk('div', 'rdo-bat' + (it.ch <= 20 ? ' low' : '')); bat.appendChild(mk('i', 'rdo-led')); bat.appendChild(mk('span', '', 'батарея ' + Math.round(it.ch) + '%')); bot.appendChild(bat);
  const more = btn('Поймать ещё', () => listenRadio(it), 'rdo-more'); more.disabled = !(it.ch > 0); more.title = 'Каждое прослушивание тратит 10% заряда';
  bot.appendChild(more);
  dev.appendChild(bot);
  body.appendChild(dev);

  let locked = null, lastTune = 0;
  const show = (fq, final) => {
    const [s, d] = nearSt(sts, fq), k = clamp(1 - d / FQ_EDGE, 0, 1);
    needle.style.left = ((fq - FQ_LO) / (FQ_HI - FQ_LO) * 100) + '%';
    knob.style.transform = 'rotate(' + Math.round((fq - FQ_LO) / (FQ_HI - FQ_LO) * 300 - 150) + 'deg)';
    stF.textContent = fqTxt(fq) + ' МГц';
    bars.dataset.n = d <= FQ_LOCK ? 5 : Math.ceil(k * 4);
    if (d <= FQ_LOCK) {
      stName.textContent = s.name; disp.classList.remove('noise');
      if (locked !== s) {
        locked = s;
        if (!s.msgs) { stopType(txt); txt.textContent = s.dj ? 'Несущая есть, голоса нет. «Волна» выходит в эфир по вечерам, с восьми.' : '…тишина в эфире…'; disp.classList.add('quiet'); }
        else { disp.classList.remove('quiet'); typeInto(txt, s.msgs.join('\n\n'), 90); }
        if (final) SFX.ui();
      }
    } else {
      locked = null; disp.classList.remove('quiet');
      stName.textContent = k > 0 ? 'Слабый сигнал…' : 'Помехи';
      disp.classList.toggle('noise', k === 0);
      stopType(txt);
      txt.textContent = k > 0 && s.msgs ? garble(s.msgs[0], k * k) : garble('ш-ш-ш-ш   ш-ш-ш   тр-р-р   ш-ш-ш-ш-ш   ш-ш   кх-х-х', .55);
      const t = performance.now(); if (t - lastTune > 90) { lastTune = t; SFX.tune(); }
    }
    panel.fq = fq; it.fq = fq;
  };
  const animTo = f => {
    needle.classList.add('glide'); knob.classList.add('glide');
    show(f, true);
    setTimeout(() => { needle.classList.remove('glide'); knob.classList.remove('glide'); }, 260);
  };
  function jump(dir) {
    const live = sts;                                                          // станции по порядку частоты; молчащие тоже на шкале
    const cur = panel.fq, nx = dir > 0 ? live.find(s => s.f > cur + .05) : [...live].reverse().find(s => s.f < cur - .05);
    animTo(nx ? nx.f : (dir > 0 ? live[0].f : live[live.length - 1].f));
  }
  // перетаскивание по шкале и по ручке
  const drag = (el, fromX) => {
    let on = false, x0 = 0, f0 = 0;
    el.addEventListener('pointerdown', e => { on = true; el.setPointerCapture(e.pointerId); x0 = e.clientX; f0 = panel.fq; if (fromX) move(e); e.preventDefault(); });
    const move = e => {
      if (!on || !mediaAlive(tok, 'radio')) return;
      let f;
      if (fromX) { const r = el.getBoundingClientRect(); f = FQ_LO + clamp((e.clientX - r.left) / r.width, 0, 1) * (FQ_HI - FQ_LO); }
      else f = clamp(f0 + (e.clientX - x0) / 14, FQ_LO, FQ_HI);              // ручка: вбок — вращать
      show(Math.round(f * 10) / 10, false);
    };
    el.addEventListener('pointermove', move);
    const up = () => { if (!on) return; on = false; const [s, d] = nearSt(sts, panel.fq); if (d < FQ_EDGE) animTo(s.f); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
  drag(sc, true); drag(knob, false);
  show(panel.fq, false); locked && SFX.ui();
}

// =============== телевизор ===============
// Четыре канала: новости с бегущей строкой, погода, настроечная таблица «вещание прервано» и пустой канал с «снегом».
// Новости листаются сами, тап по экрану — следующий сюжет.
function mediaTV(body) {
  $('pnTitle').textContent = 'Телевизор'; $('pnSub').textContent = 'ГТВ · городское телевидение';
  if (!panel.ch) panel.ch = 1;
  if (panel.si == null) panel.si = 0;
  const dev = mk('div', 'tv'), scr = mk('div', 'tv-scr ch' + panel.ch), inn = mk('div', 'tv-in'), tok = MEDIA.tok;
  scr.appendChild(inn); scr.appendChild(mk('div', 'tv-fx'));
  const ctl = mk('div', 'tv-ctl');
  ctl.appendChild(mk('div', 'tv-brand', 'ЭФИР-4'));
  const chs = mk('div', 'tv-chs');
  for (const [n, name] of [[1, 'Новости'], [2, 'Погода'], [3, 'ГТВ-2'], [4, 'ТВ-4']]) {
    const b = btn(String(n), () => { if (panel.ch === n) return; panel.ch = n; SFX.tvSwitch(); renderPanel(); }, 'tv-chb' + (panel.ch === n ? ' on' : ''));
    b.title = name; b.setAttribute('aria-label', 'Канал ' + n + ': ' + name); chs.appendChild(b);
  }
  ctl.appendChild(chs);
  const kn = mk('div', 'tv-knobs'); kn.appendChild(mk('i', 'tv-knob')); kn.appendChild(mk('i', 'tv-knob')); ctl.appendChild(kn);
  ctl.appendChild(mk('i', 'tv-led'));
  dev.appendChild(scr); dev.appendChild(ctl); body.appendChild(dev);
  scr.classList.add('tvflash'); setTimeout(() => scr.classList.remove('tvflash'), 180);   // переключение — вспышка помех

  if (panel.ch === 1) {
    const news = panel.news;
    const top = mk('div', 'tvn-top');
    top.appendChild(mk('span', 'tvn-logo', 'ГТВ'));
    const live = mk('span', 'tvn-live'); live.appendChild(mk('i')); live.appendChild(document.createTextNode('ПРЯМОЙ ЭФИР')); top.appendChild(live);
    top.appendChild(mk('span', 'tvn-clock', hhmm(gameMin)));
    inn.appendChild(top);
    const rub = mk('div', 'tvn-rub'), msg = mk('div', 'tvn-txt'), dots = mk('div', 'tvn-dots');
    inn.appendChild(rub); inn.appendChild(msg); inn.appendChild(dots);
    news.forEach(() => dots.appendChild(mk('i')));
    const tick = mk('div', 'tvn-tick'); tick.appendChild(mk('b', '', 'СРОЧНО'));
    const run = mk('div', 'tvn-run'), line = mk('span', '', news.map(n => n[0].toUpperCase() + ': ' + n[1]).join('   ●   '));
    run.appendChild(line); tick.appendChild(run); inn.appendChild(tick);
    line.style.animationDuration = Math.max(20, Math.round(line.textContent.length / 9)) + 's';
    const story = () => {
      const [who, text] = news[panel.si % news.length];
      rub.textContent = who; typeInto(msg, text, 60);
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k === panel.si % news.length));
    };
    story();
    scr.addEventListener('click', () => { panel.si++; SFX.ui(); story(); });
    const t = setInterval(() => { if (!mediaAlive(tok, 'radio')) { clearInterval(t); return; } panel.si++; story(); }, 9000);
    MEDIA.timers.push(t);
  } else if (panel.ch === 2) {
    const tC = Math.round(outsideTemp()), wet = rainTarget || rain > .5, snow = (world.snow || 0) > .25 || (wet && tC <= 0);
    const hrs = Math.max(1, Math.round(weatherTimer / 60));
    inn.appendChild(mk('div', 'tvw-head', 'ПОГОДА · ' + dateStr(gameMin).toUpperCase()));
    const big = mk('div', 'tvw-big'); big.appendChild(svgIc(snow ? 'i-snow' : wet ? 'i-rain' : ((gameMin % 1440) / 60 > 6 && (gameMin % 1440) / 60 < 20 ? 'i-sun' : 'i-moon')));
    big.appendChild(mk('span', 'tvw-t', (tC > 0 ? '+' : '') + tC + '°'));
    big.appendChild(mk('span', 'tvw-w', snow ? 'снег' : wet ? 'дождь' : 'без осадков'));
    inn.appendChild(big);
    const rows = mk('div', 'tvw-rows');
    const night = tC - 5;
    for (const [a, b] of [['Ночью', (night > 0 ? '+' : '') + night + '°' + (night < 1 ? ', заморозки' : '')], ['Осадки', wet ? `ещё около ${hrs} ч` : `не раньше чем через ${hrs} ч`], ['Сезон', seasonName()]]) {
      const r = mk('div', 'tvw-row'); r.appendChild(mk('span', '', a)); r.appendChild(mk('b', '', b)); rows.appendChild(r);
    }
    inn.appendChild(rows);
    inn.appendChild(mk('div', 'tvw-foot', wet ? 'Выставьте бочки и вёдра под водостоки' : 'Наполните ёмкости заранее'));
  } else if (panel.ch === 3) {
    const bars = mk('div', 'tvb-bars'); for (let k = 0; k < 7; k++) bars.appendChild(mk('i')); inn.appendChild(bars);
    const box = mk('div', 'tvb-box'); box.appendChild(mk('b', '', 'ГТВ-2')); box.appendChild(mk('span', '', 'Вещание прервано по техническим причинам')); box.appendChild(mk('small', '', 'Оставайтесь дома · ' + hhmm(gameMin)));
    inn.appendChild(box);
    SFX.tvTone();
  } else {
    const c = mk('canvas', 'tvs-snow'); c.width = 160; c.height = 90; inn.appendChild(c); inn.appendChild(mk('div', 'tvs-lbl', 'НЕТ СИГНАЛА'));
    const g = c.getContext('2d'), img = g.createImageData(160, 90);
    let last = 0;
    const draw = t => {
      if (!mediaAlive(tok, 'radio') || !c.isConnected) { MEDIA.raf = 0; return; }
      MEDIA.raf = requestAnimationFrame(draw);
      if (t - last < 66) return; last = t;                                      // 15 к/с: «снегу» больше не надо, а слабому телефону легче
      const d = img.data; for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255 | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      g.putImageData(img, 0, 0);
    };
    if (reduceMotion) draw(0); else MEDIA.raf = requestAnimationFrame(draw);
    SFX.tvSnow();
  }
}

// =============== газета ===============
// Шесть выпусков «Городских вестей» за последнюю неделю до карантина — от «вахтовики вернулись с рекордом» до «не открывайте двери».
// Выпуск выбирается при первом прочтении и остаётся у этой газеты (it.ed). Объявления и памятки — настоящие подсказки.
const PAPER_NAME = 'Городские вести';
const PAPER_SCRIBBLE = ['купить батарейки!!', 'позвонить маме', 'НЕ ВЕРЮ', 'река → лодки?', 'вода в ванну', 'Лёша — больница №2??'];
const EDITIONS = [
  {d:-6, no:1281,
    head:'Северная вахта вернулась с рекордом',
    lead:['Бригада месторождения «Северное» досрочно закрыла сезонный план и вернулась домой на неделю раньше графика. На вокзале вахтовиков встречали семьи и оркестр районной школы искусств.',
      'Вместе с нефтяниками в город вернулись сотрудники НИИ «Северный»: этим летом институт впервые брал пробы вечной мерзлоты на глубине до сорока метров. «Материал уникальный, изучать его будем не один год», — рассказал нашей газете старший научный сотрудник В. С. Орлов.'],
    photo:'Встреча вахты на вокзале. Фото редакции',
    side:['Мост на Садовой: ремонт до зимы', 'Подрядчик снова сдвинул сроки. Объезд — по Заводской, автобус №7 временно ходит через рынок.'],
    brief:['В школах началась прививочная кампания против сезонного гриппа.', '«Локомотив» сыграл вничью с гостями из области — 1:1.', 'Пропала собака: рыжая, отзывается на Тузика.'],
    ads:['Продам генератор б/у. Шумит, но работает.', 'Бочки 200 л под дождевую воду. Недорого.', 'Курсы первой помощи по субботам. Записывайтесь!']},
  {d:-5, no:1282,
    head:'Грипп пришёл раньше обычного',
    lead:['В поликлиниках города очереди: жалобы на высокую температуру, ломоту и спутанность сознания. Главный врач горбольницы №2 призывает не поддаваться панике: «Это сезонный вирус, просто он пришёл на месяц раньше».',
      'Врачи советуют больше пить, отлежаться дома и не ходить на работу с температурой. Аптеки сообщают о перебоях с жаропонижающим — его обещают подвезти до конца недели.'],
    photo:'Очередь в поликлинике на Ленина',
    side:['Ярмарка: рекордные тыквы', 'Победитель конкурса — тыква на 71 килограмм. Её вырастил пенсионер с дачи у реки. Секрет, говорит, в навозе и терпении.'],
    brief:['Энергосети предупреждают о плановых отключениях в частном секторе.', 'Цены на лимоны и мёд на рынке выросли вдвое.', 'В НИИ «Северный» прошёл день открытых дверей.'],
    ads:['Семена: морковь, картофель, капуста. Сажайте с умом!', 'Решётки на окна, железные двери, ремонт замков.', 'Мёд с пасеки, свой. Звоните вечером.']},
  {d:-3, no:1284,
    head:'Больница №2 закрыта на карантин',
    lead:['С сегодняшнего дня посещения в горбольнице №2 запрещены. Официально — из-за «тяжёлой формы гриппа». По нашим сведениям, первые больные — вахтовики с северного месторождения.',
      'Родственники третий день дежурят у ворот. Охрана больницы на вопросы не отвечает. Мэрия обещает сделать заявление «в ближайшее время».'],
    photo:'У ворот больницы №2. Снимать внутри запрещено',
    side:['Учения у железной дороги', 'Военные проводят плановые учения вдоль железнодорожной линии. Жителей просят не беспокоиться и не подходить к технике.'],
    brief:['Отменены плановые операции: не хватает персонала.', 'Полиция просит не вмешиваться, если больной ведёт себя агрессивно, и звонить 112.', 'Очереди за бутилированной водой в супермаркетах.'],
    ads:['Срочно куплю билеты на любой поезд из города.', 'Сдам дачу у реки. Есть лодка.', 'Пропал муж. Ушёл в больницу №2 и не вернулся.']},
  {d:-2, no:1285,
    head:'«Оставайтесь дома»',
    lead:['Администрация города закрыла школы и отменила массовые мероприятия. Жителям рекомендовано без необходимости не выходить из дома, запасти воду и продукты на две недели.',
      'Очевидцы рассказывают о нападениях: больные с высокой температурой бросаются на людей и кусаются. Редакция не может подтвердить эти сведения. В полиции от комментариев отказались.'],
    photo:'Пустая площадь у администрации в полдень',
    side:['Что известно о болезни', 'Жар, бред, затем резкое «улучшение»: больной встаёт и перестаёт узнавать близких. Врачи просят изолировать таких людей и не подходить к ним.'],
    brief:['Связь работает с перебоями: сети перегружены.', 'Заправки отпускают не больше 20 литров в одни руки.', 'Хлеб в магазинах заканчивается к полудню.'],
    ads:['Заколачиваем окна. Быстро, надёжно, свои доски.', 'Ищу сына, 12 лет, синяя куртка. Школа №5.', 'Обмен: тушёнка на батарейки.']},
  {d:-1, no:1286,
    head:'Город закрыт',
    lead:['Ночью на выездах из города появились военные посты. Граница зоны проходит по линии железной дороги. Покинуть город нельзя — «временная мера до получения результатов анализов».',
      'Последний поезд ушёл в 14:20 без пассажиров. Эвакуация, по словам военных, «прорабатывается». Электричество и воду обещают подавать, «сколько будет возможно».'],
    photo:'Пост на выезде к трассе. Дальше не пускают',
    side:['Как подготовить дом', 'Наберите воду во все ёмкости и в ванну, пока работает водопровод. Повесьте банки на верёвке на двери — звон разбудит. Не включайте свет у окон: заражённые идут на свет и шум. Заколотите окна первого этажа.'],
    brief:['Аптеки работают до последнего покупателя.', 'Церковь на Садовой «принимает всех».', 'Редакция будет выходить, пока есть бумага.'],
    ads:['Если вы это читаете — мы ушли к реке.', 'Отдам даром собачий корм. Собаки больше нет.', 'Ищу попутчиков на север пешком.']},
  {d:0, no:1287, special:true,
    head:'Не открывайте двери',
    lead:['Специальный выпуск. Отпечатан ночью, один лист, раздаётся бесплатно.',
      'Заражённые реагируют на звук и свет. Не кричите, не бегите, не стучите. Если в дом ломятся — уходите через другой выход, а не держите дверь.',
      'Больные близкие не выздоровеют. Мы знаем, как это звучит. Простите.'],
    photo:null, side:null,
    brief:['Помощь придёт. Слушайте радио.'],
    ads:[]},
];
function paperDate(d) { return dateStr(d * 1440 + 6 * 60); }
function mediaPaper(body) {
  const it = panel.it, ed = EDITIONS[(it.ed || 0) % EDITIONS.length];
  $('pnTitle').textContent = 'Газета'; $('pnSub').textContent = ed.special ? 'спецвыпуск, один лист' : 'выпуск за ' + paperDate(ed.d);
  const pg = mk('article', 'np' + (ed.special ? ' special' : '')); pg.lang = 'ru';   // lang — для переносов в колонках
  const mh = mk('header', 'np-mast');
  mh.appendChild(mk('div', 'np-meta', '№ ' + ed.no + ' · ' + paperDate(ed.d) + ' · выходит с 1957 года'));
  mh.appendChild(mk('h1', 'np-name', PAPER_NAME));
  mh.appendChild(mk('div', 'np-meta', ed.special ? 'СПЕЦИАЛЬНЫЙ ВЫПУСК · БЕСПЛАТНО' : 'общественно-политическая газета · цена свободная'));
  pg.appendChild(mh);
  pg.appendChild(mk('h2', 'np-head', ed.head));
  const cols = mk('div', 'np-cols');
  const main = mk('div', 'np-main');
  if (ed.photo) { const ph = mk('figure', 'np-photo'); ph.appendChild(mk('div', 'np-ht')); ph.appendChild(mk('figcaption', '', ed.photo)); main.appendChild(ph); }
  ed.lead.forEach((t, k) => main.appendChild(mk('p', k === 0 ? 'np-lead' : '', t)));
  cols.appendChild(main);
  const aside = mk('aside', 'np-side');
  if (ed.side) { const b = mk('section', 'np-box'); b.appendChild(mk('h3', '', ed.side[0])); b.appendChild(mk('p', '', ed.side[1])); aside.appendChild(b); }
  if (ed.brief.length) { const b = mk('section', 'np-box'); b.appendChild(mk('h3', '', ed.special ? 'Главное' : 'Коротко')); for (const t of ed.brief) b.appendChild(mk('p', 'np-brief', t)); aside.appendChild(b); }
  if (ed.ads.length) { const b = mk('section', 'np-box np-ads'); b.appendChild(mk('h3', '', 'Объявления')); for (const t of ed.ads) b.appendChild(mk('p', '', t)); aside.appendChild(b); }
  cols.appendChild(aside);
  pg.appendChild(cols);
  if (it.scr) pg.appendChild(mk('div', 'np-scr', it.scr));                 // чья-то пометка ручкой на полях
  body.appendChild(pg);
  body.appendChild(mk('p', 'np-after', panel.first ? 'Дочитал. Скука отступила. Газету можно пустить на растопку или на доспех' : 'Уже читал. Газета сгодится на растопку или на доспех'));
}
// прочитать газету: выпуск остаётся у этой газеты, скука уходит только в первый раз
function readPaper(it) {
  if (it.ed == null) { it.ed = Math.floor(Math.random() * EDITIONS.length); if (Math.random() < .35) it.scr = mpick(PAPER_SCRIBBLE); }
  const first = !it.read; it.read = true;
  openPanel('paper', {it, first});
  if (!panel || panel.kind !== 'paper') toast(first ? 'Дочитал. Скука отступила' : 'Эту газету ты уже читал');
  return first;
}

// =============== роман в мягкой обложке ===============
const NOVELS = [
  {t:'Тени над Заречьем', a:'Вера Ланская', g:'детектив', p:214, ex:'Следователь Громов закурил и посмотрел на реку. Убийца был где-то здесь, в этом сонном городке, и, судя по всему, прекрасно знал, что Громов приехал за ним.'},
  {t:'Последнее лето', a:'Аркадий Белов', g:'роман', p:88, ex:'В то лето мы ещё не знали, что больше не увидимся. Сидели на крыше гаража, ели незрелые яблоки и спорили, кто первым уедет из этого города.'},
  {t:'Звёздный патруль', a:'И. К. Сомов', g:'фантастика', p:301, ex:'«Капитан, у нас гости», — сказал бортовой компьютер голосом, в котором впервые за двести лет полёта прозвучало что-то похожее на страх.'},
  {t:'Сердце в залог', a:'Марина Вешняя', g:'любовный роман', p:156, ex:'Он вернулся в дождь, без зонта и без объяснений, и встал на пороге так, будто никогда не уходил. Лиза поняла, что снова ничего ему не скажет.'},
  {t:'Тайга не прощает', a:'Олег Кедров', g:'приключения', p:72, ex:'Спички отсырели ещё вчера. Степан пересчитал патроны — семь — и решил, что до зимовья дойдёт к ночи, если медведь не решит иначе.'},
  {t:'Кукла в окне', a:'Вера Ланская', g:'детектив', p:243, ex:'Кукла смотрела на улицу третий день подряд, и каждое утро её поворачивали чуть левее. Соседка клялась, что в доме никто не живёт с весны.'},
];
function readNovel(it) {
  const n = NOVELS[Math.floor(Math.random() * NOVELS.length)];
  openPanel('novel', {n});
  if (!panel || panel.kind !== 'novel') toast('Дочитал «' + n.t + '». Скука отступила');
}
function mediaNovel(body) {
  const n = panel.n;
  $('pnTitle').textContent = 'Роман в мягкой обложке'; $('pnSub').textContent = 'дочитал до конца';
  const bk = mk('div', 'bk'), L = mk('div', 'bk-pg bk-l'), R = mk('div', 'bk-pg bk-r');
  L.appendChild(mk('div', 'bk-a', n.a)); L.appendChild(mk('div', 'bk-t', n.t)); L.appendChild(mk('div', 'bk-orn', '❦')); L.appendChild(mk('div', 'bk-g', n.g));
  R.appendChild(mk('p', 'bk-ex', n.ex)); R.appendChild(mk('div', 'bk-n', '— ' + n.p + ' —'));
  bk.appendChild(L); bk.appendChild(R); body.appendChild(bk);
  body.appendChild(mk('p', 'np-after', 'Дочитал. Скука отступила, на душе спокойнее'));
}

// =============== записки ===============
// Обычные — от руки на тетрадном листе. Сюжетные (67-notes-night) — у каждой своя бумага: бланк с печатью, факс,
// листовка, клетчатый блокнот врача, пропуск, экран телефона, детский рисунок.
const NOTE_SKIN = {h1:'fridge', h2:'grid', h3:'grid', h4:'grid', a1:'typed', a2:'log', a3:'fax', p1:'kid', p2:'phone', p3:'hand', p4:'hand', p5:'hand', l1:'card', l2:'hand', l3:'hand', l4:'hand', l5:'hand', r1:'flyer', r2:'list'};
const NOTE_STAMP = {a1:'СЕКРЕТНО', a3:'ДСП'};
const HAND_RE = /^(Снизу от руки|Поверх ручкой|Через два дня|Потом)/;
function mediaNote(body, text, sid) {
  const skin = NOTE_SKIN[sid] || 'hand', paras = String(text || '').split('\n\n');
  const pg = mk('div', 'notep nt-' + skin);
  if (skin === 'phone') {                                                     // переписка: кавычки — сообщения, остальное — пометки
    const scr = mk('div', 'nt-scr'); scr.appendChild(mk('div', 'nt-who', 'Солнышко'));
    for (const p of paras) {
      const msgs = p.match(/«[^»]*»/g);
      if (msgs) {
        const pre = p.slice(0, p.indexOf('«')).replace(/[:\s]+$/, ''), rep = /три сообщения/.test(pre) ? 3 : 1;
        if (pre) scr.appendChild(mk('div', 'nt-sys', pre.replace(/^Потом ещё три сообщения$/, 'Потом')));
        for (const m of msgs) for (let k = 0; k < rep; k++) scr.appendChild(mk('div', 'nt-msg', m.slice(1, -1)));
      }
      else scr.appendChild(mk('div', 'nt-sys', p));
    }
    scr.appendChild(mk('div', 'nt-sys', 'прочитано')); 
    pg.appendChild(scr);
  } else if (skin === 'card') {
    pg.appendChild(mk('div', 'nt-ph'));                                       // пропуск: фото и строки «НИИ…», «Допуск…», «Сотрудник…»
    const t = mk('div', 'nt-ct'); for (const line of paras[0].split(/\.\s+(?=[А-ЯЁ][а-яё])/)) t.appendChild(mk('div', '', line.replace(/([а-яё0-9»])\.$/, '$1'))); pg.appendChild(t);
  } else {
    if (skin === 'fax') pg.appendChild(mk('div', 'nt-faxh', 'ФАКС · 03:12 · стр. 1/1 · от: штаб периметра'));
    if (skin === 'flyer') pg.appendChild(mk('div', 'nt-flyh', '✝'));
    for (const p of paras) {
      const hand = HAND_RE.test(p) && skin !== 'hand' && skin !== 'grid' && skin !== 'kid';
      let el;
      if (skin === 'flyer' && p.startsWith('«')) el = mk('p', 'nt-big', p.replace(/[«»]/g, ''));
      else if (skin === 'flyer' && hand) { el = mk('p', 'nt-marker', (p.match(/«([^»]*)»/) || [0, p])[1]); }
      else el = mk('p', hand ? 'nt-inked' : '', hand ? p.replace(/^Снизу от руки:\s*/, '').replace(/^«(.*)»$/, '$1') : p);
      pg.appendChild(el);
    }
    if (NOTE_STAMP[sid]) pg.appendChild(mk('div', 'nt-stamp', NOTE_STAMP[sid]));
  }
  body.appendChild(pg);
}

// =============== журнал навыка ===============
// Обложка выпуска своего цвета, темы номера и то, что герой вынес из чтения.
const MAG_COVER = {
  carp:{c:'#d9822b', main:['Полка за вечер', 'Дверь, которая выдержит', 'Дом-крепость своими руками'], sub:['Какой гвоздь для какой доски', 'Молоток держат за конец, а не за середину', 'Заколотить окно за пять минут', 'Уровень — ваш лучший друг']},
  cook:{c:'#b83a32', main:['Вкусно из того, что есть', 'Тушёнка: 12 новых рецептов', 'Высокая кухня на костре'], sub:['Как не пересолить суп', 'Консервы, которые хранятся годами', 'Хлеб без духовки', 'Специи — секрет простой еды']},
  farm:{c:'#4f8a3a', main:['Первая грядка', 'Урожай в любую погоду', 'Сад, который прокормит семью'], sub:['Когда сажать морковь', 'Полив: утром или вечером?', 'Компост из ничего', 'Капуста против вредителей']},
  fight:{c:'#2c3e57', main:['Защити себя', 'Удар, который решает всё', 'Мастер ближнего боя'], sub:['Дистанция — половина победы', 'Короткий удар быстрее размаха', 'Как не выдохнуться за минуту', 'Упал — сразу вставай']},
  med:{c:'#e8e2d6', ink:'#b3261e', main:['Первая помощь дома', 'Раны и переломы', 'Полевая хирургия'], sub:['Что должно быть в аптечке', 'Повязка, которая не сползёт', 'Шина из подручных средств', 'Когда нужен антибиотик']},
  tail:{c:'#8e4f8f', main:['Шьём сами', 'Одежда на все сезоны', 'Мастер иглы'], sub:['Заплатка, которую не видно', 'Тёплая подкладка из старого пледа', 'Какие нитки крепче', 'Выкройка за пять минут']},
  mech:{c:'#1f6f8b', main:['Машина без секретов', 'Ремонт в дороге', 'Мотор как на ладони'], sub:['Как завести в мороз', 'Аккумулятор: продлить жизнь', 'Запаска за десять минут', 'Почему стучит двигатель']},
};
function mediaMag(body) {
  const it = panel.it, d = ITEMS[it.id], v = d.vol || 1, C = MAG_COVER[d.skill] || MAG_COVER.carp, m = MAGS[d.skill];
  $('pnTitle').textContent = d.name; $('pnSub').textContent = 'прочитано от корки до корки';
  const wrap = mk('div', 'mg'), cov = mk('div', 'mg-cov' + (C.ink ? ' light' : ''));
  cov.style.setProperty('--mg', C.c); if (C.ink) cov.style.setProperty('--mgi', C.ink);
  const top = mk('div', 'mg-top'); top.appendChild(mk('span', 'mg-name', m ? m.series.replace(/[«»]/g, '') : d.name)); top.appendChild(mk('span', 'mg-no', '№' + v)); cov.appendChild(top);
  cov.appendChild(mk('div', 'mg-for', 'журнал для ' + (v === 1 ? 'новичков' : v === 2 ? 'опытных' : 'мастеров')));
  const art = mk('div', 'mg-art'); art.appendChild(iconEl(m ? m.base : it.id, 56)); cov.appendChild(art);
  cov.appendChild(mk('div', 'mg-main', C.main[v - 1] || C.main[0]));
  const ul = mk('ul', 'mg-sub'); for (let k = 0; k < 3; k++) ul.appendChild(mk('li', '', C.sub[(v - 1 + k) % C.sub.length])); cov.appendChild(ul);
  wrap.appendChild(cov);
  const res = mk('div', 'mg-res');
  res.appendChild(mk('div', 'mg-rh', 'Что ты вынес'));
  res.appendChild(mk('p', '', panel.msg));
  const sk = SKILLS[d.skill], lv = skillLv(d.skill);
  if (sk) { const bar = mk('div', 'mg-lv'); for (let k = 0; k < 5; k++) bar.appendChild(mk('i', k < lv ? 'on' : k <= (panel.hi || 0) ? 'boost' : '')); res.appendChild(mk('div', 'mg-sk', sk.name + ' · уровень ' + lv)); res.appendChild(bar); res.appendChild(mk('small', '', 'Светлые деления — растут втрое быстрее, пока не дойдёшь')); }
  wrap.appendChild(res);
  body.appendChild(wrap);
}
