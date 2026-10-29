// ================= телефон героя: одни переписки, история идёт вместе с игрой =================
// Один экран: слева контакты, справа переписка. Сети нет, ответить нельзя — только читать.
// Старые сообщения рассказывают последнюю неделю до карантина. Новые приходят по ходу игры (связь иногда
// ловит на секунду): телефон вздрагивает, вверху всплывает строчка, на кнопке загорается точка.
// Кнопка — под «−/+» справа вверху, клавиша N.
const PH = {open:false, cur:null, cnt:-1};
const phNew = () => ({read:{}});
const phG = s => s.replace(/\{([^|}]*)\|([^}]*)\}/g, (_, m, f) => (P && P.look && P.look.g === 'f' ? f : m));   // {поел|поела}

// ---- переписки: [день от начала игры, время, 'in'|'out', текст, фото] ----
// день 0 — первый день игры (она начинается в 9:00); всё, что позже текущего игрового времени, ещё не пришло
const PH_THREADS = [
  {id:'mom', name:'Мама', col:'#d9776a', msgs:[
    [-6, '19:02', 'in', 'Ты {поел|поела}? Не забывай обедать, а то знаю тебя'],
    [-6, '19:40', 'out', '{Поел|Поела}, мам'],
    [-5, '12:10', 'in', 'Нашла старую фотку с дачи. Приезжай летом, папа баню доделал', 'dacha'],
    [-4, '08:15', 'in', '{Видел|Видела} новости? На севере какой-то грипп. Купи лимонов и мёда'],
    [-3, '21:30', 'in', 'Тётю Валю увезли на скорой. Сорок и одна, бредит. Папа поехал с ней'],
    [-1, '10:20', 'in', 'Папа не отвечает шесть часов. Из больницы никого не выпускают'],
    [-1, '10:22', 'out', 'Мам, я приеду'],
    [-1, '10:23', 'in', 'Не надо. По радио говорят сидеть дома'],
    [0, '06:05', 'in', 'Выезды перекрыли. Мы к тебе не пробьёмся'],
    [0, '06:31', 'in', 'Папа вернулся. Он какой-то не такой. Не узнаёт меня'],
    [0, '06:40', 'in', 'Он ломится в ванную. Я люблю тебя'],
    [3, '03:33', 'in', 'ты дома'],
    [3, '03:34', 'in', 'открой'],
  ]},
  {id:'kat', name:'Катя', col:'#8fa4d9', msgs:[
    [-7, '17:10', 'in', 'Скинь мамин рецепт пирога с капустой, я опять всё забыла'],
    [-7, '17:25', 'out', 'Мука, яйца, капуста. Остальное — по любви'],
    [-2, '13:40', 'in', 'У нас в общаге карантин. Никого не выпускают, еду ставят под дверь'],
    [-1, '23:12', 'in', 'Парень из 214-й укусил охранника. Охранника потом застрелили. ЗАСТРЕЛИЛИ, понимаешь?'],
    [0, '04:02', 'in', 'Нас грузят в автобусы. Говорят, в лагерь за городом'],
    [0, '15:20', 'in', 'Мы в лагере у элеватора. Палатки, солдаты, всем меряют температуру', 'kat'],
    [0, '15:21', 'in', 'Телефоны отбирают. Пишу из туалета, не отвечай'],
    [1, '22:05', 'in', 'В карантинной палатке ночью кто-то кричит. Солдаты делают вид, что не слышат'],
    [2, '05:40', 'in', 'Началось. Стреляют. Я бегу к реке'],
    [5, '12:00', 'in', 'Я на том берегу, у старой мельницы. Тут тихо. Если читаешь — живи, {дурак|дурочка}, слышишь?'],
  ]},
  {id:'lex', name:'Лёха', col:'#c9a14a', msgs:[
    [-5, '20:00', 'in', 'Пятница в силе? Я жарю мясо'],
    [-5, '20:03', 'out', 'В силе'],
    [-2, '01:17', 'in', '{Брат|Сестрёнка}, я на смене в морге видел, как жмурик сел. Сам. Я не пил', 'night'],
    [-2, '01:18', 'out', 'Иди спать'],
    [0, '02:30', 'in', 'Машину бросил у моста — там блоки и солдаты. Иду к тебе дворами'],
    [0, '02:53', 'in', 'Их тут много. Если не дойду — не ищи меня'],
    [0, '13:10', 'in', 'Живой. Сижу на крыше гаражей, внизу трое'],
    [0, '13:12', 'in', 'Запомни: они идут на звук. Не бегай без нужды и не бей стёкла'],
    [1, '19:50', 'in', 'Ушли наконец. Батарея 3%. Пойду искать воду'],
    [4, '02:14', 'in', 'Укусили за руку. Ерунда, царапина. Завтра буду у тебя'],
  ]},
  {id:'unk', name:'+7 914 ••• •• 03', col:'#6c6c6c', msgs:[
    [-2, '23:59', 'in', 'Вы в контактах О. Орлова, НИИ «Северный». Он не выходит на связь. Близко к нему не подходите'],
    [0, '21:00', 'in', 'Это Орлов. Мне дали этот номер. Не ищите меня'],
    [0, '21:01', 'in', 'Из мерзлоты мы подняли не вирус. Оно живое. Оно почти слепое, но слышит всё'],
    [2, '00:30', 'in', 'Задёрните шторы. Они видят вас в окнах'],
    [6, '23:59', 'in', 'Простите меня'],
  ]},
  {id:'mchs', name:'МЧС России', col:'#c8322b', msgs:[
    [0, '00:00', 'in', 'ЭКСТРЕННОЕ ОПОВЕЩЕНИЕ. В городе введён карантин. Выезды закрыты. Оставайтесь дома, не открывайте двери посторонним'],
    [1, '08:00', 'in', 'Пункт эвакуации на стадионе закрыт. Оставайтесь дома и ждите указаний'],
    [7, '08:00', 'in', 'Связь в городе будет отключена. Берегите себя'],
  ]},
];

// ---- время сообщений ----
const phDay0 = () => Math.floor(startMin / 1440);
const phAt = m => { const [h, n] = m[1].split(':'); return (phDay0() + m[0]) * 1440 + +h * 60 + +n; };
const phVis = t => t.msgs.filter(m => phAt(m) <= gameMin);
const phInCnt = t => phVis(t).filter(m => m[2] === 'in').length;
const phUnread = t => Math.max(0, phInCnt(t) - ((P.phone.read || {})[t.id] || 0));
const phUnreadAll = () => P && P.phone ? PH_THREADS.reduce((a, t) => a + phUnread(t), 0) : 0;
const phLast = t => { const v = phVis(t); return v[v.length - 1]; };
function phWhen(m) {
  const d = Math.floor(gameMin / 1440) - (phDay0() + m[0]);
  if (d === 0) return 'сегодня'; if (d === 1) return 'вчера';
  const b = typeof dateOf === 'function' ? new Date(dateOf((phDay0() + m[0]) * 1440)) : null;
  return b && typeof MONTHS !== 'undefined' ? b.getDate() + ' ' + MONTHS[b.getMonth()] : d + ' дн. назад';
}

// ---- оформление ----
{
  const css = `
#phone{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:rgba(4,6,8,.6);padding:var(--st,0) var(--sxr,0) var(--sb,0) var(--sx,0)}
#phone[hidden]{display:none}
#phone .pdev{width:min(660px,94vw);height:min(380px,calc(var(--vh,100vh) - 24px));background:#0b0d0f;border-radius:26px;padding:9px;box-shadow:0 18px 50px rgba(0,0,0,.6),inset 0 0 0 2px #2a2e33}
#phone .scr{width:100%;height:100%;border-radius:18px;overflow:hidden;background:#101418;color:#eef0f2;font:14px/1.35 system-ui,-apple-system,sans-serif;display:grid;grid-template-rows:34px minmax(0,1fr)}
#phone .sb{display:flex;align-items:center;gap:10px;padding:0 12px 0 6px;font-size:12px;font-weight:600;background:#0c1013;border-bottom:1px solid #1d232a}
#phone .sb .x{width:34px;height:28px;border:0;border-radius:8px;background:transparent;color:#fff;font:400 24px/24px system-ui;cursor:pointer;padding:0 0 3px}
#phone .sb .x:active{background:rgba(255,255,255,.12)}
#phone .sb .who{flex:1;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#phone .sb .net{color:#ff8a7a;font-weight:500}
#phone .main{display:grid;grid-template-columns:150px minmax(0,1fr);min-height:0}
#phone .cl{overflow:auto;border-right:1px solid #1d232a;background:#0e1215}
#phone .ct{display:flex;align-items:center;gap:9px;width:100%;padding:8px 10px;border:0;background:transparent;color:inherit;font:600 13px system-ui,sans-serif;text-align:left;cursor:pointer;position:relative}
#phone .ct.on{background:#1b2229}
#phone .ct .nm{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#phone .av{flex:none;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-weight:700;color:#fff;font-size:14px;position:relative}
#phone .ct i{margin-left:auto;flex:none;min-width:18px;height:18px;border-radius:9px;background:#e5483b;color:#fff;font:700 10.5px/18px system-ui;text-align:center;padding:0 5px;font-style:normal}
#phone .chat{overflow:auto;padding:8px 12px 12px;display:flex;flex-direction:column;gap:5px}
#phone .pday{align-self:center;font-size:11px;color:#8b96a0;margin:6px 0 1px}
#phone .bub{max-width:80%;padding:7px 11px;border-radius:15px;font-size:14px;white-space:pre-line;word-wrap:break-word}
#phone .bub small{display:block;font-size:10.5px;opacity:.55;margin-top:2px;text-align:right}
#phone .bub.in{align-self:flex-start;background:#262d35;border-bottom-left-radius:4px}
#phone .bub.out{align-self:flex-end;background:#2f6fdb;border-bottom-right-radius:4px}
#phone .bub.in.nw{background:#3a3424;box-shadow:inset 3px 0 0 #f0c477}
#phone .bub canvas{display:block;width:100%;max-width:220px;border-radius:9px;margin-bottom:5px}
#phone .foot{align-self:center;margin-top:8px;font-size:11.5px;color:#6f7a84}
@media (max-width:540px){#phone .main{grid-template-columns:52px minmax(0,1fr)}#phone .ct .nm{display:none}#phone .ct i{position:absolute;top:3px;right:3px;margin:0}#phone .ct{padding:8px 10px}}
#bPhone{position:relative}
#bPhone .pdot{position:absolute;top:2px;right:3px;width:9px;height:9px;border-radius:50%;background:#e5483b;box-shadow:0 0 0 2px rgba(0,0,0,.5)}
#bPhone .pdot[hidden]{display:none}
#bPhone.ring{animation:phRing .5s 3}
@keyframes phRing{0%,100%{transform:rotate(0)}25%{transform:rotate(-14deg)}75%{transform:rotate(14deg)}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
}

// ---- фото во вложениях: простые картинки на холсте ----
function phPhoto(kind) {
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 200; const g = cv.getContext('2d');
  const grad = (y0, y1, a, b) => { const l = g.createLinearGradient(0, y0, 0, y1); l.addColorStop(0, a); l.addColorStop(1, b); return l; };
  const man = (x, y, s, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y - 34 * s, 7 * s, 0, 6.28); g.fill(); g.beginPath(); g.moveTo(x - 10 * s, y); g.quadraticCurveTo(x - 11 * s, y - 26 * s, x, y - 26 * s); g.quadraticCurveTo(x + 11 * s, y - 26 * s, x + 10 * s, y); g.fill(); };
  if (kind === 'dacha') {
    g.fillStyle = grad(0, 120, '#a9d0ef', '#e3f0f7'); g.fillRect(0, 0, 320, 120); g.fillStyle = '#5f9a4a'; g.fillRect(0, 118, 320, 82);
    g.fillStyle = '#b8794a'; g.fillRect(190, 70, 90, 60); g.fillStyle = '#8a3a2a'; g.beginPath(); g.moveTo(180, 72); g.lineTo(235, 38); g.lineTo(290, 72); g.fill();
    g.fillStyle = '#e8e0c0'; g.fillRect(212, 88, 18, 16); g.fillStyle = '#2f5f2a'; g.beginPath(); g.arc(70, 80, 34, 0, 6.28); g.fill(); g.fillStyle = '#5a3a22'; g.fillRect(64, 100, 12, 30);
    man(120, 176, 1, '#6a4a6a'); man(146, 178, 1.06, '#3a4a5a');
  } else if (kind === 'kat') {
    g.fillStyle = grad(0, 130, '#8a9aa6', '#c4c8c4'); g.fillRect(0, 0, 320, 130); g.fillStyle = '#6a6a52'; g.fillRect(0, 128, 320, 72);
    g.fillStyle = '#9a9a8a'; g.fillRect(230, 20, 60, 110); g.fillRect(212, 50, 20, 80);
    for (let k = 0; k < 4; k++) { const x = 20 + k * 50; g.fillStyle = '#4e5a3a'; g.beginPath(); g.moveTo(x, 150); g.lineTo(x + 22, 118); g.lineTo(x + 44, 150); g.fill(); }
    man(260, 178, 1, '#2e3424'); man(285, 180, 1, '#2e3424');
  } else {
    g.fillStyle = '#05070a'; g.fillRect(0, 0, 320, 200); g.fillStyle = 'rgba(255,190,90,.25)'; g.beginPath(); g.ellipse(230, 150, 70, 30, 0, 0, 6.28); g.fill();
    g.fillStyle = '#1a1e24'; g.fillRect(222, 40, 5, 110); g.fillStyle = 'rgba(255,200,120,.5)'; g.beginPath(); g.arc(224, 40, 6, 0, 6.28); g.fill();
    man(250, 160, .9, '#000'); g.fillStyle = 'rgba(255,40,30,.8)'; g.fillRect(247, 126, 2, 1.5); g.fillRect(252, 126, 2, 1.5);
    const im = g.getImageData(0, 0, 320, 200), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 36; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(im, 0, 0);
  }
  return cv;
}

// ---- экран ----
function phEl() {
  let o = $('phone'); if (o) return o;
  o = mk('div'); o.id = 'phone'; o.hidden = true; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Телефон');
  o.innerHTML = '<div class="pdev"><div class="scr"><div class="sb"><button type="button" class="x" aria-label="Убрать телефон">‹</button><span class="who"></span><span class="net">Нет сети</span><span class="tm"></span></div><div class="main"><div class="cl"></div><div class="chat"></div></div></div></div>';
  o.addEventListener('click', e => { if (e.target === o) phClose(); });
  o.querySelector('.x').addEventListener('click', () => { SFX.ui(); phClose(); });
  document.body.appendChild(o); return o;
}
function phShow(id, keep) {
  const o = phEl(), t = PH_THREADS.find(x => x.id === id) || PH_THREADS[0]; PH.cur = t.id;
  // сколько последних входящих подсветить (при обновлении той же переписки подсветка сохраняется)
  const fresh = phInCnt(t) - (P.phone.read[t.id] || 0) + (keep ? PH.fresh || 0 : 0); PH.fresh = fresh;
  P.phone.read[t.id] = phInCnt(t);
  o.querySelector('.who').textContent = t.name; o.querySelector('.tm').textContent = fmtTime(gameMin);
  // контакты: у кого свежее — выше
  const cl = o.querySelector('.cl'); cl.textContent = '';
  const list = PH_THREADS.filter(x => phVis(x).length).sort((a, b) => phAt(phLast(b)) - phAt(phLast(a)));
  for (const x of list) {
    const b = btn('', () => { SFX.ui(); phShow(x.id); }, 'ct' + (x.id === t.id ? ' on' : ''));
    const a = mk('span', 'av', x.name[0] === '+' ? '?' : x.name[0]); a.style.background = x.col;
    b.appendChild(a); b.appendChild(mk('span', 'nm', x.name));
    const u = phUnread(x); if (u) b.appendChild(mk('i', '', String(u))); b.title = x.name; cl.appendChild(b);
  }
  // переписка
  const c = o.querySelector('.chat'); c.textContent = '';
  const vis = phVis(t); let day = null, inN = vis.filter(m => m[2] === 'in').length;
  for (const m of vis) {
    if (m[0] !== day) { day = m[0]; c.appendChild(mk('div', 'pday', phWhen(m))); }
    const isNew = m[2] === 'in' && inN-- <= fresh && phAt(m) >= startMin;   // пришло уже в игре
    const b = mk('div', 'bub ' + m[2] + (isNew ? ' nw' : ''));
    if (m[4]) b.appendChild(phPhoto(m[4]));
    b.appendChild(document.createTextNode(phG(m[3]))); b.appendChild(mk('small', '', m[1])); c.appendChild(b);
  }
  c.appendChild(mk('div', 'foot', 'Нет сети — ответить нельзя'));
  requestAnimationFrame(() => { c.scrollTop = c.scrollHeight; });
  phBadge();
}
function phOpen() {
  if (mode !== 'play' || !P || P.sleep) return;
  if (!P.phone) P.phone = phNew();
  if (typeof closePanel === 'function' && panel) closePanel();
  PH.open = true; paused = true; atkHeld = false; joy.id = null; joy.x = joy.y = 0; if ($('stick')) $('stick').hidden = true;
  phEl().hidden = false;
  // сразу открыта переписка, где есть непрочитанное (самое свежее), иначе последняя открытая
  const un = PH_THREADS.filter(t => phUnread(t)).sort((a, b) => phAt(phLast(b)) - phAt(phLast(a)))[0];
  phShow(un ? un.id : PH.cur || 'mom');
  SFX.select && SFX.select();
}
function phClose() {
  if (!PH.open) return;
  PH.open = false; phEl().hidden = true;
  if (mode === 'play' && !panel && $('pause').hidden) paused = false;
  phBadge();
}
function phBadge() { const b = $('bPhone'); if (b && P && P.phone) b.querySelector('.pdot').hidden = !phUnreadAll(); }

// ---- новое сообщение пришло по ходу игры: строчка вверху, вибрация, кнопка качнулась ----
setInterval(() => {
  if (PH.open && mode !== 'play') { phClose(); return; }
  if (!P || !P.phone || mode !== 'play') return;
  let n = 0, last = null, lt = null;
  for (const t of PH_THREADS) for (const m of phVis(t)) if (m[2] === 'in') { n++; if (!last || phAt(m) >= phAt(last)) { last = m; lt = t; } }
  if (PH.cnt >= 0 && n > PH.cnt && last && !(typeof TUT !== 'undefined' && TUT.on)) {
    const txt = phG(last[3]); toast('📱 ' + lt.name + ': ' + (txt.length > 60 ? txt.slice(0, 58) + '…' : txt));
    SFX.select && SFX.select();
    try { settings.vib !== false && navigator.vibrate && navigator.vibrate([60, 80, 60]); } catch (e) {}
    const b = $('bPhone'); if (b) { b.classList.remove('ring'); void b.offsetWidth; b.classList.add('ring'); }
    if (PH.open) phShow(PH.cur, true);
  }
  PH.cnt = n; phBadge();
}, 1000);

// ---- кнопка (её место под «−/+» задаёт модуль действий), клавиша N ----
{
  const m = $('bMap');
  const b = mk('button', m ? m.className.replace('mapslot', '') : 'hslot'); b.id = 'bPhone'; b.type = 'button'; b.setAttribute('aria-label', 'Телефон'); b.title = 'Телефон (N)';
  b.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/></svg><span class="hk">N</span><span class="hl">Телефон</span><span class="pdot" hidden></span>';
  b.addEventListener('click', e => { e.stopPropagation(); phOpen(); });
  if (m) m.after(b); else { const h = $('hud'); if (h) h.appendChild(b); }
  addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const k = e.key.toLowerCase();
    if (PH.open && (k === 'escape' || k === 'n' || k === 'т')) { e.preventDefault(); e.stopImmediatePropagation(); phClose(); return; }
    if ((k === 'n' || k === 'т') && mode === 'play' && !paused) { e.preventDefault(); phOpen(); }
  }, true);
}

// ---- сохранение ----
onStartNew(() => { if (P) { P.phone = phNew(); PH.cnt = -1; PH.cur = null; } });
onSave(d => { if (P && P.phone) d.xPhone = {read:P.phone.read}; });
onLoad(d => { if (P) P.phone = {read:(d && d.xPhone && d.xPhone.read) || {}}; PH.cnt = -1; PH.cur = null; });
{ const f = toMenu; toMenu = function () { phClose(); return f.apply(this, arguments); }; }
