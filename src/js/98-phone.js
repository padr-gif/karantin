// ================= телефон героя: сообщения родных, звонки, новости, фото, заметки =================
// Кнопка «Телефон» (N) рядом с картой. Сети нет: можно только читать то, что пришло до карантина.
// Батарея садится, пока экран включён; заряжается сама, когда герой в доме со светом или работающим генератором.
// Тексты — история последней недели глазами родных; концовок у веток нет, как и у игры.
const PH = {open:false, app:'lock', arg:null, back:[], acc:0, lastGM:null, chMsg:false};
const phNew = () => ({bat:62 + Math.floor(Math.random() * 30), read:{}, sent:{}, newsSeen:false});
const phG = s => s.replace(/\{([^|}]*)\|([^}]*)\}/g, (_, m, f) => (P && P.look && P.look.g === 'f' ? f : m));   // {поел|поела}

// ---- переписки: [день от начала игры, время, 'in'|'out', текст] ----
const PH_THREADS = [
  {id:'mom', name:'Мама', col:'#d9776a', msgs:[
    [-6, '19:02', 'in', 'Ты {поел|поела}? Не забывай обедать, а то знаю тебя'],
    [-6, '19:40', 'out', '{Поел|Поела}, мам'],
    [-4, '08:15', 'in', '{Видел|Видела} новости? На севере какой-то грипп. Купи лимонов и мёда'],
    [-3, '21:30', 'in', 'Тётю Валю увезли на скорой. Сорок и одна, бредит. Папа поехал с ней'],
    [-3, '21:34', 'out', 'Держи в курсе. Пусть папа маску наденет'],
    [-2, '02:48', 'in', 'Ты спишь? У соседей всю ночь кричали, а теперь тихо'],
    [-1, '10:20', 'in', 'Папа не отвечает шесть часов. Из больницы никого не выпускают'],
    [-1, '10:22', 'out', 'Мам, я приеду'],
    [-1, '10:23', 'in', 'Не надо. По радио говорят сидеть дома'],
    [0, '06:05', 'in', 'Выезды перекрыли. Мы к тебе не пробьёмся'],
    [0, '06:07', 'in', 'Закрой дверь и никому не открывай. Слышишь? НИКОМУ'],
    [0, '06:31', 'in', 'Папа вернулся. Он какой-то не такой. Не узнаёт меня'],
    [0, '06:40', 'in', 'Он ломится в ванную. Я люблю тебя'],
  ]},
  {id:'kat', name:'Катя', col:'#8fa4d9', msgs:[
    [-7, '17:10', 'in', 'Скинь мамин рецепт пирога с капустой, я опять всё забыла'],
    [-7, '17:25', 'out', 'Мука, яйца, капуста. Остальное — по любви'],
    [-7, '17:26', 'in', 'Очень смешно'],
    [-2, '13:40', 'in', 'У нас в общаге карантин. Никого не выпускают, еду ставят под дверь'],
    [-1, '23:12', 'in', 'Парень из 214-й укусил охранника. Охранника потом застрелили. ЗАСТРЕЛИЛИ, понимаешь?'],
    [-1, '23:13', 'out', 'Катя, сиди в комнате. Подопри дверь шкафом'],
    [0, '04:02', 'in', 'Нас грузят в автобусы. Говорят, в лагерь за городом'],
    [0, '04:03', 'in', 'Если что — я тебя люблю, {дурак|дурочка}'],
  ]},
  {id:'lex', name:'Лёха', col:'#c9a14a', msgs:[
    [-5, '20:00', 'in', 'Пятница в силе? Я жарю мясо'],
    [-5, '20:03', 'out', 'В силе'],
    [-2, '01:17', 'in', '{Брат|Сестрёнка}, я сегодня на смене в морге видел, как жмурик сел. Сам. Я не пил'],
    [-2, '01:18', 'out', 'Иди спать'],
    [-1, '19:44', 'in', 'Еду к тебе. Канистра, топор, тушёнка. Держись'],
    [0, '02:30', 'in', 'Машину бросил у моста — там бетонные блоки и солдаты. Иду дворами'],
    [0, '02:52', 'in', 'Их тут много. Очень много'],
    [0, '02:53', 'in', 'Если не дойду — не ищи меня'],
  ]},
  {id:'unk', name:'+7 914 ••• •• 03', col:'#6c6c6c', msgs:[
    [-2, '23:59', 'in', 'Вы в списке контактов О. Орлова, НИИ «Северный». Он не выходит на связь'],
    [-2, '23:59', 'in', 'Если он у вас или вы знаете, где он, — немедленно ответьте на этот номер. Близко к нему не подходите'],
  ]},
  {id:'mchs', name:'МЧС России', col:'#c8322b', msgs:[
    [-1, '18:00', 'in', 'МЧС: из-за вспышки опасной инфекции ограничьте выход из дома. Следите за сообщениями'],
    [0, '00:00', 'in', 'ЭКСТРЕННОЕ ОПОВЕЩЕНИЕ. В городе введён карантин. Выезды закрыты. Оставайтесь дома, не открывайте двери посторонним, ожидайте указаний'],
  ]},
  {id:'boss', name:'Сергей Петрович', col:'#7f8a92', msgs:[
    [-3, '18:00', 'in', 'Завтра планёрка в 9:00. Без опозданий'],
    [-2, '08:57', 'in', 'Где все? В офисе я один'],
    [-1, '09:00', 'in', 'Офис закрыт до особого распоряжения. Отпуск за свой счёт'],
  ]},
  {id:'dlv', name:'Доставка', col:'#5f9e8a', msgs:[
    [0, '09:00', 'in', 'Курьер не смог до вас дозвониться. Новая дата доставки: завтра с 10:00 до 14:00'],
  ]},
];
const PH_CALLS = [[0, '06:44', 'Мама', 'miss', 14], [0, '03:10', 'Лёха', 'miss', 2], [-1, '23:20', 'Катя', 'in', 1], [-1, '10:25', 'Мама', 'out', 1], [-1, '10:18', 'Папа', 'out', 6], [-3, '21:40', 'Мама', 'in', 1], [-5, '20:05', 'Лёха', 'in', 1]];
const PH_NEWS = [
  [0, 'Город закрыт на карантин', 'Выезды перекрыты. Жителей просят оставаться дома и ждать указаний.'],
  [-1, 'Связь с НИИ «Северный» потеряна', 'Сотрудники института не выходят на связь вторые сутки.'],
  [-2, 'Видео с «ожившим» пациентом — фейк, заявили в полиции', 'За распространение слухов грозит штраф.'],
  [-3, 'Больницы города переходят на особый режим', 'Посещения пациентов запрещены до конца недели.'],
  [-4, 'Минздрав: поводов для паники нет', 'Ведомство советует мыть руки и не ходить на массовые мероприятия.'],
  [-5, 'На вахте вспышка тяжёлого гриппа: трое в реанимации', 'Врачи говорят о небывалом жаре и бреде.'],
  [-21, 'НИИ «Северный» изучит реликтовые бактерии', '«Уникальный материал», — сказал руководитель лаборатории О. Орлов.'],
  [-40, 'На северном месторождении вскрыли пласт древней мерзлоты', 'Буровики нашли полости со льдом возрастом в десятки тысяч лет. Образцы передадут учёным.'],
];
const PH_NOTES = [
  ['Если что-то случится', 'Мамин адрес: ул. Садовая, 12, кв. 5\nКатя — общежитие №3, комната 208\nЛёха — гаражи за школой, бокс 17', -1],
  ['Купить', 'Хлеб\nБатарейки (АА)\nЛимоны маме\nКорм соседскому коту, пока они в отъезде', -4],
  ['День рождения Кати', '14 ноября. Подарок: наушники? Спросить у мамы', -9],
  ['Пароль от вайфая', 'Kvartira_42', -30],
];
const PH_PHOTOS = [['sea', 'Море, прошлое лето'], ['dacha', 'Мама с папой на даче'], ['kat', 'Катя, выпускной'], ['car', 'Лёха и его «девятка»'], ['night', 'Ночью из окна. Кто это стоит?']];

// ---- даты ----
function phDate(day) {
  const b = typeof dateOf === 'function' ? new Date(dateOf(startMin)) : new Date(); b.setDate(b.getDate() + day);
  return b.getDate() + ' ' + (typeof MONTHS !== 'undefined' ? MONTHS[b.getMonth()] : '');
}
const phDayNow = () => Math.floor((gameMin - startMin) / 1440);
const phWhen = day => { const d = phDayNow() - day; return d === 0 ? 'сегодня' : d === 1 ? 'вчера' : phDate(day); };
const phUnread = t => t.msgs.filter(m => m[2] === 'in').length - ((P.phone.read || {})[t.id] || 0);
const phUnreadAll = () => P && P.phone ? PH_THREADS.reduce((a, t) => a + Math.max(0, phUnread(t)), 0) : 0;

// ---- оформление ----
{
  const css = `
#phone{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:rgba(4,6,8,.62);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);padding:var(--st,0) var(--sxr,0) var(--sb,0) var(--sx,0)}
#phone[hidden]{display:none}
#phone .pdev{position:relative;width:min(700px,94vw);height:min(390px,calc(100vh - 20px));background:#0b0d0f;border-radius:30px;padding:10px 14px 10px 26px;box-shadow:0 18px 50px rgba(0,0,0,.6),inset 0 0 0 2px #2a2e33}
#phone .pdev:before{content:'';position:absolute;left:10px;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:#1d232a;box-shadow:0 0 0 2px #111}
#phone .scr{position:relative;width:100%;height:100%;border-radius:20px;overflow:hidden;background:#101418;color:#eef0f2;font:14px/1.35 system-ui,-apple-system,sans-serif;display:flex;flex-direction:column}
#phone .sb{flex:none;height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;font-size:12px;font-weight:600;color:#e8eaec;background:rgba(0,0,0,.25)}
#phone .sb .net{color:#ff8a7a;font-weight:500}
#phone .sbl{display:flex;align-items:center;gap:6px;min-width:90px}
#phone .nback{width:38px;height:26px;margin-left:-8px;border:0;border-radius:6px;background:rgba(255,255,255,.1);color:#fff;font:700 20px/20px system-ui;cursor:pointer;padding:0 0 2px}
#phone .nback:active{background:rgba(255,255,255,.22)}
#phone .nback[hidden]{display:none}
#phone .bat{display:inline-flex;align-items:center;gap:5px}
#phone .bat i{position:relative;width:22px;height:11px;border:1.5px solid currentColor;border-radius:3px;display:inline-block}
#phone .bat i:after{content:'';position:absolute;right:-4px;top:2px;width:2px;height:4px;background:currentColor;border-radius:0 1px 1px 0}
#phone .bat b{position:absolute;left:1px;top:1px;bottom:1px;border-radius:1px;background:currentColor}
#phone .bat.low{color:#ff6a5a}
#phone .bd{flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch}
#phone .nav{flex:none;height:34px;display:flex;justify-content:center;gap:42px;align-items:center;background:rgba(0,0,0,.3)}
#phone .nav button{width:44px;height:30px;border:0;background:transparent;color:#cfd3d7;font-size:16px;cursor:pointer;border-radius:8px}
#phone .nav button:active{background:rgba(255,255,255,.08)}
#phone .lock{height:100%;display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px 22px;background:radial-gradient(ellipse at 20% 30%,#33405a,#141a24 70%);cursor:pointer}
#phone .lock .clk{align-self:center;font-size:64px;font-weight:200;letter-spacing:-1px;line-height:1}
#phone .lock .pdt{font-size:15px;color:#c9d0da;margin-top:6px}
#phone .lock .hint{font-size:12px;color:#9aa6b4;margin-top:18px}
#phone .pntf{align-self:center;display:grid;gap:8px}
#phone .pntf div{background:rgba(255,255,255,.12);border-radius:12px;padding:8px 10px;font-size:12.5px}
#phone .pntf b{display:block;font-size:12px;color:#fff;margin-bottom:2px}
#phone .home{min-height:100%;padding:16px 20px;background:radial-gradient(ellipse at 70% 20%,#3a4a52,#141a1f 70%);display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));align-content:start;gap:14px 10px}
#phone .app{display:grid;justify-items:center;gap:5px;border:0;background:transparent;color:#eef0f2;font:12px system-ui,sans-serif;cursor:pointer;position:relative;padding:0}
#phone .app .pic{width:54px;height:54px;border-radius:14px;display:grid;place-items:center;box-shadow:0 3px 8px rgba(0,0,0,.35)}
#phone .app .pic svg{width:28px;height:28px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#phone .app .dot{position:absolute;top:-4px;right:calc(50% - 32px);min-width:20px;height:20px;border-radius:10px;background:#e5483b;color:#fff;font:700 11px/20px system-ui;text-align:center;padding:0 5px}
#phone .hd{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:10px;padding:8px 14px;background:#161b20;border-bottom:1px solid #232a31;font-weight:700;font-size:15px}
#phone .prow{display:flex;gap:12px;align-items:center;padding:9px 14px;border:0;border-bottom:1px solid #1d232a;background:transparent;color:inherit;width:100%;text-align:left;font:inherit;cursor:pointer}
#phone .prow:active{background:#1a2026}
#phone .av{flex:none;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-weight:700;color:#fff;font-size:15px}
#phone .prow .m{flex:1;min-width:0}
#phone .prow .m b{display:block;font-size:14px}
#phone .prow .m span{display:block;font-size:12.5px;color:#9aa6b0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#phone .prow .r{flex:none;text-align:right;font-size:11.5px;color:#8b96a0;display:grid;gap:4px;justify-items:end}
#phone .prow .r i{font-style:normal;min-width:18px;height:18px;border-radius:9px;background:#3d8bfd;color:#fff;font:700 11px/18px system-ui;text-align:center;padding:0 5px}
#phone .chat{padding:8px 14px 12px;display:flex;flex-direction:column;gap:5px}
#phone .pday{align-self:center;font-size:11.5px;color:#8b96a0;margin:8px 0 2px}
#phone .bub{max-width:76%;padding:7px 11px;border-radius:16px;font-size:14px;white-space:pre-line;word-wrap:break-word}
#phone .bub small{display:block;font-size:10.5px;opacity:.6;margin-top:2px;text-align:right}
#phone .bub.in{align-self:flex-start;background:#262d35;border-bottom-left-radius:5px}
#phone .bub.out{align-self:flex-end;background:#2f6fdb;border-bottom-right-radius:5px}
#phone .bub.fail{background:#4a2f33}
#phone .bub.fail small{color:#ff9a8a;opacity:1}
#phone .inp{position:sticky;bottom:0;display:flex;gap:8px;padding:7px 10px;background:#161b20;border-top:1px solid #232a31}
#phone .inp input{flex:1;min-width:0;height:34px;border-radius:17px;border:1px solid #2c343c;background:#0f1317;color:#eef0f2;padding:0 12px;font:14px system-ui}
#phone .inp button{width:34px;height:34px;border-radius:17px;border:0;background:#2f6fdb;color:#fff;font-size:15px;cursor:pointer}
#phone .miss b{color:#ff7a6a}
#phone .pnews{padding:4px 0}
#phone .pnews .n{padding:10px 14px;border-bottom:1px solid #1d232a}
#phone .pnews .n small{color:#8b96a0;font-size:11.5px}
#phone .pnews .n b{display:block;font-size:14.5px;margin:2px 0 3px}
#phone .pnews .n p{margin:0;color:#b6c0c8;font-size:13px}
#phone .pnews .err{padding:12px 14px;color:#ff9a8a;font-size:12.5px;text-align:center}
#phone .pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:4px;padding:4px}
#phone .pgrid button{border:0;padding:0;background:#000;cursor:pointer;aspect-ratio:16/10;overflow:hidden}
#phone .pgrid canvas,#phone .ph canvas{width:100%;height:100%;display:block}
#phone .ph{height:100%;display:grid;grid-template-rows:1fr auto;background:#000}
#phone .ph p{margin:0;padding:8px 14px;color:#cfd3d7;font-size:13px;text-align:center}
#phone .note{padding:12px 16px;white-space:pre-line;font-size:15px;line-height:1.5}
#phone .call{height:100%;display:grid;place-items:center;align-content:center;gap:10px;background:radial-gradient(ellipse at 50% 30%,#2b3542,#0f1419 70%);text-align:center}
#phone .call .av{width:70px;height:70px;font-size:28px}
#phone .call .st{color:#ff9a8a;font-size:13px}
#phone .call button{width:56px;height:56px;border-radius:50%;border:0;background:#e5483b;color:#fff;font-size:22px;cursor:pointer;margin-top:8px}
#phone .off{height:100%;display:grid;place-items:center;align-content:center;gap:12px;background:#000;color:#8b96a0;text-align:center;font-size:13px;padding:20px}
#phone .off .bigbat{width:70px;height:34px;border:3px solid #ff5a4a;border-radius:6px;position:relative}
#phone .off .bigbat:after{content:'';position:absolute;right:-9px;top:9px;width:5px;height:10px;background:#ff5a4a;border-radius:0 2px 2px 0}
#phone .off .bigbat b{position:absolute;left:3px;top:3px;bottom:3px;width:6px;background:#ff5a4a;border-radius:2px}
#bPhone{position:relative}
#bMap,#taskChip{display:none!important}
#bPhone .pdot{position:absolute;top:2px;right:4px;width:9px;height:9px;border-radius:50%;background:#e5483b;box-shadow:0 0 0 2px rgba(0,0,0,.5)}
#bPhone .pdot[hidden]{display:none}
#bPhone .pch{position:absolute;top:1px;left:5px;font-size:11px;color:#f0c477}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
}

// ---- значки приложений (векторные, белые) ----
const PH_ICON = {
  msgs:'<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  calls:'<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/></svg>',
  news:'<svg viewBox="0 0 24 24"><path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h5"/></svg>',
  photos:'<svg viewBox="0 0 24 24"><path d="M3 6h18v13H3zM3 16l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9.5" r="1.5"/></svg>',
  notes:'<svg viewBox="0 0 24 24"><path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/></svg>',
  map:'<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/></svg>',
  diary:'<svg viewBox="0 0 24 24"><path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6zM6 3v18M9 8h6M9 12h6M9 16h4"/></svg>',
  self:'<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  craft:'<svg viewBox="0 0 24 24"><path d="M14 4l6 6-3 3-6-6zM11 7l-7 7 3 3 7-7M4 20l3-3"/></svg>',
};
const PH_APPS = [['map', 'Карта', '#3d7fd6'], ['diary', 'Дневник', '#8a6a3a'], ['self', 'Состояние', '#c8473d'], ['craft', 'Создать', '#6f7f8f'], ['msgs', 'Сообщения', '#2fbf5a'], ['calls', 'Телефон', '#2f9e44'], ['news', 'Новости', '#d9534f'], ['photos', 'Фото', '#e8a33a'], ['notes', 'Заметки', '#c9a14a']];

// ---- фото: простые картинки на холсте ----
function phPhoto(kind) {
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 200; const g = cv.getContext('2d');
  const grad = (y0, y1, a, b) => { const l = g.createLinearGradient(0, y0, 0, y1); l.addColorStop(0, a); l.addColorStop(1, b); return l; };
  const man = (x, y, s, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y - 34 * s, 7 * s, 0, 6.28); g.fill(); g.beginPath(); g.moveTo(x - 10 * s, y); g.quadraticCurveTo(x - 11 * s, y - 26 * s, x, y - 26 * s); g.quadraticCurveTo(x + 11 * s, y - 26 * s, x + 10 * s, y); g.fill(); };
  if (kind === 'sea') {
    g.fillStyle = grad(0, 120, '#7fb7e6', '#f6d6a8'); g.fillRect(0, 0, 320, 120); g.fillStyle = '#ffe29a'; g.beginPath(); g.arc(240, 70, 18, 0, 6.28); g.fill();
    g.fillStyle = grad(110, 160, '#3c7fb0', '#2a5f8a'); g.fillRect(0, 110, 320, 50); g.fillStyle = '#e9d3a5'; g.fillRect(0, 158, 320, 42);
    man(130, 178, 1, '#3a2c28'); man(158, 180, .92, '#5a3a32');
  } else if (kind === 'dacha') {
    g.fillStyle = grad(0, 120, '#a9d0ef', '#e3f0f7'); g.fillRect(0, 0, 320, 120); g.fillStyle = '#5f9a4a'; g.fillRect(0, 118, 320, 82);
    g.fillStyle = '#b8794a'; g.fillRect(190, 70, 90, 60); g.fillStyle = '#8a3a2a'; g.beginPath(); g.moveTo(180, 72); g.lineTo(235, 38); g.lineTo(290, 72); g.fill();
    g.fillStyle = '#e8e0c0'; g.fillRect(212, 88, 18, 16); g.fillStyle = '#2f5f2a'; g.beginPath(); g.arc(70, 80, 34, 0, 6.28); g.fill(); g.fillStyle = '#5a3a22'; g.fillRect(64, 100, 12, 30);
    man(120, 176, 1, '#6a4a6a'); man(146, 178, 1.06, '#3a4a5a');
  } else if (kind === 'kat') {
    g.fillStyle = grad(0, 200, '#2a2140', '#5a3a5a'); g.fillRect(0, 0, 320, 200);
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(255,${200 + (k * 7) % 55},120,${.25 + (k % 5) / 10})`; g.beginPath(); g.arc((k * 73) % 320, (k * 41) % 120, 2 + k % 3, 0, 6.28); g.fill(); }
    man(160, 200, 2.4, '#1c1622'); g.fillStyle = '#111'; g.fillRect(138, 98, 44, 7); g.fillRect(150, 92, 20, 7);
  } else if (kind === 'car') {
    g.fillStyle = grad(0, 130, '#f2b880', '#c87a5a'); g.fillRect(0, 0, 320, 130); g.fillStyle = '#4a4a4e'; g.fillRect(0, 130, 320, 70);
    g.fillStyle = '#d8d8d0'; for (let x = 0; x < 320; x += 40) g.fillRect(x, 165, 22, 4);
    g.fillStyle = '#7a1e1e'; g.beginPath(); g.moveTo(120, 150); g.lineTo(135, 128); g.lineTo(205, 126); g.lineTo(228, 146); g.lineTo(250, 150); g.lineTo(250, 168); g.lineTo(115, 168); g.fill();
    g.fillStyle = '#9fc3d8'; g.fillRect(142, 131, 26, 14); g.fillRect(174, 130, 30, 15); g.fillStyle = '#111'; g.beginPath(); g.arc(145, 168, 10, 0, 6.28); g.arc(225, 168, 10, 0, 6.28); g.fill();
    man(90, 172, 1.1, '#2a2420');
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
  o.innerHTML = '<div class="pdev"><div class="scr"><div class="sb"><span class="sbl"><button type="button" class="nback" aria-label="Назад">‹</button><span class="tm"></span></span><span class="net">Нет сети</span><span class="bat"><span class="pc"></span><i><b></b></i></span></div><div class="bd"></div><div class="nav"><button type="button" class="nb" aria-label="Назад">◀</button><button type="button" class="nh" aria-label="Домой">●</button><button type="button" class="nx" aria-label="Убрать телефон">✕</button></div></div></div>';
  o.addEventListener('click', e => { if (e.target === o) phClose(); });
  o.querySelector('.nb').addEventListener('click', () => { SFX.ui(); phBack(); });
  o.querySelector('.nback').addEventListener('click', () => { SFX.ui(); phBack(); });
  o.querySelector('.nh').addEventListener('click', () => { SFX.ui(); if (PH.app !== 'lock' && PH.app !== 'off') { PH.back = []; phShow('home'); } });
  o.querySelector('.nx').addEventListener('click', () => { SFX.ui(); phClose(); });
  document.body.appendChild(o); return o;
}
function phBar() {
  const o = phEl(), b = Math.max(0, Math.round(P.phone.bat));
  o.querySelector('.tm').textContent = fmtTime(gameMin);
  o.querySelector('.pc').textContent = (phCharging() ? '⚡ ' : '') + b + '%';
  o.querySelector('.bat b').style.width = Math.max(1, b * .17) + 'px';
  o.querySelector('.bat').classList.toggle('low', b <= 10);
}
function phShow(app, arg, noPush) {
  if (!noPush && PH.app && PH.app !== app && PH.app !== 'lock' && PH.app !== 'off') PH.back.push([PH.app, PH.arg]);
  PH.app = app; PH.arg = arg;
  const bd = phEl().querySelector('.bd'); bd.textContent = ''; bd.scrollTop = 0;
  (PH_VIEWS[app] || PH_VIEWS.home)(bd, arg); phBar(); phBadge();
  phEl().querySelector('.nback').hidden = app === 'lock' || app === 'off';
}
function phBack() {
  if (PH.app === 'lock' || PH.app === 'off') return phClose();
  const p = PH.back.pop(); if (p) phShow(p[0], p[1], true); else if (PH.app !== 'home') phShow('home', null, true); else phClose();
}
const phRow = (av, col, title, sub, right, fn, cls) => {
  const r = btn('', fn, 'prow' + (cls ? ' ' + cls : ''));
  const a = mk('span', 'av', av); a.style.background = col; r.appendChild(a);
  const m = mk('span', 'm'); m.appendChild(mk('b', '', title)); m.appendChild(mk('span', '', sub)); r.appendChild(m);
  if (right) r.appendChild(right); return r;
};
const PH_VIEWS = {
  lock(bd) {
    const L = mk('div', 'lock'); L.addEventListener('click', () => { SFX.ui(); phShow('home'); });
    const left = mk('div'); left.appendChild(mk('div', 'clk', fmtTime(gameMin))); left.appendChild(mk('div', 'pdt', phDate(phDayNow())));
    left.appendChild(mk('div', 'hint', 'Нажми, чтобы открыть')); L.appendChild(left);
    const n = mk('div', 'pntf');
    const last = [];
    for (const t of PH_THREADS) if (phUnread(t) > 0) { const m = t.msgs.filter(x => x[2] === 'in').slice(-1)[0]; last.push([m[0], m[1], t.name, m[3]]); }
    last.sort((a, b) => b[0] - a[0] || (b[1] > a[1] ? 1 : -1));
    for (const [, tm, who, text] of last.slice(0, 3)) { const d = mk('div'); d.appendChild(mk('b', '', who + ' · ' + tm)); d.appendChild(document.createTextNode(phG(text))); n.appendChild(d); }
    if (!last.length) n.appendChild(mk('div', '', 'Новых уведомлений нет'));
    const miss = PH_CALLS.filter(c => c[3] === 'miss').reduce((a, c) => a + c[4], 0);
    if (miss) { const d = mk('div'); d.appendChild(mk('b', '', 'Телефон')); d.appendChild(document.createTextNode('Пропущенных вызовов: ' + miss)); n.appendChild(d); }
    L.appendChild(n); bd.appendChild(L);
  },
  home(bd) {
    const h = mk('div', 'home');
    for (const [id, name, col] of PH_APPS) {
      const a = btn('', () => { SFX.ui(); if (PH_GAME[id]) { phClose(); PH_GAME[id](); } else phShow(id); }, 'app');
      const ic = mk('span', 'pic'); ic.style.background = col; ic.innerHTML = PH_ICON[id]; a.appendChild(ic); a.appendChild(mk('span', '', name));
      const n = id === 'msgs' ? phUnreadAll() : id === 'calls' ? PH_CALLS.filter(c => c[3] === 'miss').length : id === 'news' && !P.phone.newsSeen ? 1 : id === 'diary' && P.tasks ? P.tasks.list.filter(t => !t.done).length : 0;
      if (n) a.appendChild(mk('span', 'dot', String(n)));
      h.appendChild(a);
    }
    bd.appendChild(h);
  },
  msgs(bd) {
    bd.appendChild(mk('div', 'hd', 'Сообщения'));
    const list = PH_THREADS.map(t => ({t, last:(P.phone.sent[t.id] || []).length ? [phDayNow(), fmtTime(gameMin), 'out', P.phone.sent[t.id].slice(-1)[0][1]] : t.msgs[t.msgs.length - 1]}));
    list.sort((a, b) => b.last[0] - a.last[0] || (b.last[1] > a.last[1] ? 1 : -1));
    for (const {t, last} of list) {
      const r = mk('span', 'r'); r.appendChild(mk('span', '', phWhen(last[0]) === 'сегодня' ? last[1] : phWhen(last[0])));
      const u = phUnread(t); if (u > 0) r.appendChild(mk('i', '', String(u)));
      bd.appendChild(phRow(t.name[0] === '+' ? '?' : t.name[0], t.col, t.name, (last[2] === 'out' ? 'Вы: ' : '') + phG(last[3]), r, () => { SFX.ui(); phShow('chat', t.id); }));
    }
  },
  chat(bd, id) {
    const t = PH_THREADS.find(x => x.id === id); if (!t) return;
    P.phone.read[t.id] = t.msgs.filter(m => m[2] === 'in').length;
    const hd = mk('div', 'hd'); const a = mk('span', 'av', t.name[0] === '+' ? '?' : t.name[0]); a.style.background = t.col; a.style.width = a.style.height = '28px'; a.style.fontSize = '12px'; hd.appendChild(a); hd.appendChild(mk('span', '', t.name)); bd.appendChild(hd);
    const c = mk('div', 'chat'); let day = null;
    for (const m of t.msgs) {
      if (m[0] !== day) { day = m[0]; c.appendChild(mk('div', 'pday', phWhen(day))); }
      const b = mk('div', 'bub ' + m[2], phG(m[3])); b.appendChild(mk('small', '', m[1])); c.appendChild(b);
    }
    for (const [, text, when] of P.phone.sent[t.id] || []) { if (day !== 'sent') { day = 'sent'; c.appendChild(mk('div', 'pday', 'после карантина')); } const b = mk('div', 'bub out fail', text); b.appendChild(mk('small', '', when + ' · не доставлено')); c.appendChild(b); }
    bd.appendChild(c);
    if (t.id !== 'mchs' && t.id !== 'dlv') {
      const f = mk('form', 'inp'); const inp = mk('input'); inp.type = 'text'; inp.maxLength = 120; inp.placeholder = 'Сообщение'; inp.setAttribute('aria-label', 'Сообщение');
      const s = mk('button', '', '➤'); s.type = 'submit'; s.setAttribute('aria-label', 'Отправить'); f.appendChild(inp); f.appendChild(s);
      inp.addEventListener('keydown', e => e.stopPropagation());                    // буквы не уходят в управление игрой
      f.addEventListener('submit', e => { e.preventDefault(); const v = inp.value.trim(); if (!v) return; (P.phone.sent[t.id] = P.phone.sent[t.id] || []).push([phDayNow(), v, fmtTime(gameMin)]); if (P.phone.sent[t.id].length > 20) P.phone.sent[t.id].shift(); SFX.ui(); phShow('chat', t.id, true); });
      bd.appendChild(f);
    }
    requestAnimationFrame(() => { bd.scrollTop = bd.scrollHeight; });
  },
  calls(bd) {
    bd.appendChild(mk('div', 'hd', 'Недавние'));
    for (const [day, tm, who, kind, n] of PH_CALLS) {
      const sub = (kind === 'miss' ? 'Пропущенный' : kind === 'out' ? 'Исходящий' : 'Входящий') + ' · ' + phWhen(day) + ', ' + tm;
      const th = PH_THREADS.find(t => t.name === who);
      bd.appendChild(phRow(who[0], th ? th.col : '#5a6470', who + (n > 1 ? ' (' + n + ')' : ''), sub, null, () => { SFX.ui(); phShow('call', who); }, kind === 'miss' ? 'miss' : ''));
    }
  },
  call(bd, who) {
    const c = mk('div', 'call'); const th = PH_THREADS.find(t => t.name === who);
    const a = mk('span', 'av', who[0]); a.style.background = th ? th.col : '#5a6470'; c.appendChild(a); c.appendChild(mk('b', '', who));
    const st = mk('div', 'st', 'Вызов…'); c.appendChild(st);
    c.appendChild(btn('✕', () => { SFX.ui(); phBack(); }));
    bd.appendChild(c);
    setTimeout(() => { if (PH.app === 'call') st.textContent = 'Нет сети. Вызов невозможен'; }, 1400);
    if (who === 'Мама' && typeof logEv === 'function' && !P.phone.calledMom) { P.phone.calledMom = true; logEv('Пробовал' + (P.look && P.look.g === 'f' ? 'а' : '') + ' дозвониться маме. Нет сети'); }
  },
  news(bd) {
    P.phone.newsSeen = true;
    bd.appendChild(mk('div', 'hd', 'Новости'));
    const box = mk('div', 'pnews');
    box.appendChild(mk('div', 'err', 'Не удалось обновить ленту: нет подключения. Показаны сохранённые новости'));
    for (const [day, title, text] of PH_NEWS) { const n = mk('div', 'n'); n.appendChild(mk('small', '', phWhen(day))); n.appendChild(mk('b', '', title)); n.appendChild(mk('p', '', text)); box.appendChild(n); }
    bd.appendChild(box);
  },
  photos(bd) {
    bd.appendChild(mk('div', 'hd', 'Фото'));
    const g = mk('div', 'pgrid');
    PH_PHOTOS.forEach(([k, cap], i) => { const b = btn('', () => { SFX.ui(); phShow('photo', i); }); b.setAttribute('aria-label', cap); b.appendChild(phPhoto(k)); g.appendChild(b); });
    bd.appendChild(g);
  },
  photo(bd, i) {
    const [k, cap] = PH_PHOTOS[i] || PH_PHOTOS[0], w = mk('div', 'ph');
    const f = mk('div'); f.style.cssText = 'display:grid;place-items:center;min-height:0;overflow:hidden'; const cv = phPhoto(k); cv.style.cssText = 'max-width:100%;max-height:100%;width:auto;height:100%;object-fit:contain'; f.appendChild(cv);
    w.appendChild(f); w.appendChild(mk('p', '', cap)); bd.appendChild(w);
  },
  notes(bd) {
    bd.appendChild(mk('div', 'hd', 'Заметки'));
    PH_NOTES.forEach(([title, text, day], i) => bd.appendChild(phRow('✎', '#8a7a4a', title, phWhen(day) + ' · ' + text.split('\n')[0], null, () => { SFX.ui(); phShow('note', i); })));
  },
  note(bd, i) { const [title, text] = PH_NOTES[i] || PH_NOTES[0]; bd.appendChild(mk('div', 'hd', title)); bd.appendChild(mk('div', 'note', text)); },
  off(bd) {
    const o = mk('div', 'off'); const b = mk('div', 'bigbat'); b.appendChild(mk('b')); o.appendChild(b);
    o.appendChild(mk('div', '', 'Телефон разряжен')); o.appendChild(mk('div', '', 'Зарядится сам, пока ты в доме со светом или рядом работает генератор'));
    bd.appendChild(o);
  },
};

// ---- приложения-окна игры: карта, дневник, состояние, создать ----
const phInv = tab => { openPanel('inv'); if (panel) { panel.tab = tab; renderPanel(); } };
const PH_GAME = {map:() => openMap(), diary:() => phInv('tasks'), self:() => phInv('self'), craft:() => phInv('craft')};
// ---- открыть, закрыть, батарея ----
function phCharging() { return !!(P && P.phone && P.phone.bat < 100 && insideHouse(P.x, P.y) && ((typeof powerOn === 'function' && powerOn()) || (typeof gens !== 'undefined' && gens.some(g => g.on)))); }
function phOpen() {
  if (mode !== 'play' || !P || P.sleep) return;
  if (!P.phone) P.phone = phNew();
  if (typeof closePanel === 'function' && panel) closePanel();
  PH.open = true; PH.back = []; PH.acc = 0; paused = true; atkHeld = false; joy.id = null; joy.x = joy.y = 0; if ($('stick')) $('stick').hidden = true;
  phEl().hidden = false;
  phShow(phUnreadAll() ? 'lock' : 'home', null, true);                          // есть новые сообщения — сначала экран с уведомлениями
  SFX.select && SFX.select();
}
function phClose() {
  if (!PH.open) return;
  PH.open = false; phEl().hidden = true;
  if (mode === 'play' && !panel && $('pause').hidden) paused = false;
  phBadge();
}
function phBadge() {
  const b = $('bPhone'); if (!b || !P || !P.phone) return;
  b.querySelector('.pdot').hidden = !phUnreadAll();
  b.querySelector('.pch').textContent = phCharging() ? '⚡' : '';
}
setInterval(() => {
  if (PH.open && mode !== 'play') { phClose(); return; }
  if (!P || !P.phone) return;
  // заряд: 1% за 2 игровые минуты в доме со светом
  if (PH.lastGM == null) PH.lastGM = gameMin;
  const gm = Math.max(0, Math.min(240, gameMin - PH.lastGM)); PH.lastGM = gameMin;
  if (phCharging()) {
    const was = P.phone.bat; P.phone.bat = Math.min(100, P.phone.bat + gm / 2);
  }
  // пока экран включён, батарея садится медленно и никогда не до нуля: телефон — это меню, он не должен отключаться
  if (PH.open) { PH.acc += 1; if (PH.acc >= 30) { PH.acc = 0; if (!phCharging()) P.phone.bat = Math.max(18, P.phone.bat - 1); } phBar(); }
  phBadge();
}, 1000);

// ---- кнопка в нижней панели, клавиша N ----
{
  const m = $('bMap');
  const b = mk('button', m ? m.className.replace('mapslot', '') : 'hslot'); b.id = 'bPhone'; b.type = 'button'; b.setAttribute('aria-label', 'Телефон'); b.title = 'Телефон (N)';
  b.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/></svg><span class="hk">N</span><span class="hl">Телефон</span><span class="pdot" hidden></span><span class="pch"></span>';
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
onStartNew(() => { if (P) { P.phone = phNew(); PH.lastGM = null; PH.chMsg = false; } });
onSave(d => { if (P) d.xPhone = P.phone; });
onLoad(d => { if (P) P.phone = (d && d.xPhone) || phNew(); PH.lastGM = null; PH.chMsg = false; });
{ const f = toMenu; toMenu = function () { phClose(); return f.apply(this, arguments); }; }
