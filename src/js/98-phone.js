// ================= чужие телефоны: героя без телефона, их находят в мире =================
// У каждого найденного телефона свой хозяин и свои переписки: старые сообщения — последняя неделя до карантина,
// новые приходят по ходу игры (связь иногда ловит на секунду), если телефон заряжен.
// Игровой смысл: фонарик (садит батарею), геометки с припасами в переписках, звонок на весь двор, если не выключить звук.
// Зарядить можно только в доме, где есть свет. Кнопка телефона (под «−/+») появляется, когда в рюкзаке есть телефон; клавиша N.
Object.assign(ITEMS, {phone:{name:'Телефон', kind:'phone', verb:'Включить'}});
DESC.phone = 'Чужой телефон. Сети почти нет, но переписки на месте. Есть фонарик. Зарядить — в доме, где есть свет. Звук лучше выключить: мертвецы слышат звонок.';
KG.phone = .2;

// ---- истории: хозяин, род (для {сделал|сделала}), где лежит, переписки ----
// сообщение: [день от начала игры, время, 'in'|'out', текст, фото?, тайник?]; тайник: {items, at:'garage'|'shed'|'house'}
const PH_STORIES = {
  sasha:{owner:'Саша', g:'m', at:'home', threads:[
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
  ]},
  irina:{owner:'Ирина', g:'f', at:'car', threads:[
    {id:'work', name:'Старшая смена', col:'#5fa8a0', msgs:[
      [-3, '07:50', 'in', 'Ира, выйди сегодня в ночь. Половина отделения на больничном'],
      [-3, '07:52', 'out', 'Выйду'],
      [-1, '02:10', 'in', 'Укушенных больше не принимаем. Приказ главврача. Двери в приёмный заблокировать'],
      [-1, '02:11', 'out', 'А тех, кто уже внутри?'],
      [-1, '02:30', 'in', 'Не спрашивай'],
      [0, '05:15', 'in', 'Подвал не держит. Кто может — уходите через гараж скорой'],
      [0, '06:02', 'in', 'Кто выбрался: я спрятала сумку с перевязкой и антибиотиками. Метка ниже. Берите, мне уже не нужно', 'pin', {items:['medkit', 'antibio', 'bandage', 'bandage', 'painkill'], at:'shed'}],
    ]},
    {id:'man', name:'Муж', col:'#7f8fb8', msgs:[
      [-2, '21:00', 'in', 'Ты когда домой? Дима не спит, ждёт'],
      [-2, '21:40', 'out', 'Утром. Заприте дверь и никому не открывайте, даже соседям'],
      [0, '08:20', 'out', 'Я выбралась. Иду пешком, машину бросила у моста'],
      [0, '08:21', 'in', 'Мы в подвале у бабушки. Дима спрашивает про тебя'],
      [1, '18:00', 'out', 'Меня поцарапал один в подъезде. Неглубоко. Обработала'],
      [1, '18:30', 'in', 'Покажи'],
      [2, '09:12', 'out', 'Не приходите ко мне. Я серьёзно'],
      [2, '09:40', 'in', 'Ира, мы идём'],
    ]},
    {id:'apt', name:'Аптека «Здоровье»', col:'#4f9a5a', msgs:[
      [-6, '10:00', 'in', 'Скидка 20% на противовирусные! Только до воскресенья'],
      [-1, '10:00', 'in', 'Уважаемые клиенты! Аптека закрыта до особого распоряжения'],
    ]},
  ]},
  timur:{owner:'Тимур', g:'m', at:'car', threads:[
    {id:'bro', name:'Рустам', col:'#c98a5a', msgs:[
      [-1, '20:00', 'out', 'У меня полный багажник еды из заказов. Склад закрыли, всё списали'],
      [-1, '20:01', 'in', 'Вези к нам'],
      [0, '11:30', 'out', 'Машина встала, бензина ноль. Коробки спрятал, кидаю метку', 'pin', {items:['canned', 'canned', 'beans', 'noodles', 'noodles', 'water', 'water', 'chips'], at:'garage'}],
      [0, '11:32', 'in', 'Понял. Сам-то куда?'],
      [0, '11:40', 'out', 'Пешком к вам. Если что — коробки ваши'],
      [3, '16:00', 'in', 'Тимур?'],
      [4, '16:00', 'in', 'Тимур ответь'],
    ]},
    {id:'disp', name:'Доставка · диспетчер', col:'#e0a030', msgs:[
      [-4, '12:00', 'in', 'Тимур, у тебя 34 заказа, шевелись'],
      [-2, '15:40', 'in', 'Заказы в «карантинную зону» не берём. Возвращай на склад'],
      [-1, '19:05', 'in', 'Склад закрыт. Всё, что в багажнике, — списано. Делай что хочешь'],
      [0, '10:00', 'in', 'Сервис временно недоступен'],
    ]},
    {id:'mama', name:'Мама', col:'#d98a9a', msgs:[
      [-5, '09:00', 'in', 'Сынок, ты покушал?'],
      [-5, '13:20', 'out', 'Да, мам'],
      [0, '12:00', 'in', 'Рустам сказал, ты идёшь пешком. Я жду, чай поставила'],
      [1, '12:00', 'in', 'Чай остыл. Ничего, подогрею'],
    ]},
  ]},
  nikolai:{owner:'Николай Петрович', g:'m', at:'home', threads:[
    {id:'anya', name:'Внучка Аня', col:'#d98ac0', msgs:[
      [-7, '16:00', 'in', 'Деда, с днём рождения! Приеду на выходных, испеку торт'],
      [-7, '16:30', 'out', 'Спасибо внученька жду'],
      [-3, '20:00', 'in', 'Деда, не выходи из дома. У нас в универе всех распустили, говорят карантин'],
      [-1, '11:00', 'out', 'Аня аптека закрыта а таблетки кончились'],
      [-1, '11:05', 'in', 'В серванте, на верхней полке, я оставляла запас. Посмотри'],
      [0, '09:30', 'in', 'Деда, ты как?'],
      [1, '09:30', 'in', 'Деда'],
      [2, '09:30', 'in', 'Я приеду, как только откроют дороги. Держись'],
    ]},
    {id:'gena', name:'Гена сосед', col:'#8a9a6a', msgs:[
      [-2, '08:00', 'in', 'Петрович, у тебя погреб глубокий? Если что — пустишь?'],
      [-2, '08:10', 'out', 'Пущу. Там картошки и банок на всю зиму. Ключ под ведром у сарая', 'pin', {items:['potato', 'potato', 'carrot', 'pickles', 'jam', 'canned'], at:'shed'}],
      [0, '03:10', 'in', 'Петрович, я пришёл, а ты не открываешь. Я у сарая'],
      [0, '03:12', 'in', 'Тут кто-то ходит в огороде'],
      [0, '03:15', 'in', 'Это не ты'],
    ]},
  ]},
  kotov:{owner:'Рядовой Котов', g:'m', at:'army', threads:[
    {id:'squad', name:'Взвод 3', col:'#7a8a5a', msgs:[
      [-1, '06:00', 'in', 'Сержант Белов: стоим на блокпосту у моста. Гражданских не пропускать. Совсем'],
      [0, '17:40', 'in', 'Белов: у кого укус — к медику. Не скрывать'],
      [1, '02:00', 'in', 'Рыжов: медик сам укушен'],
      [1, '02:05', 'in', 'Белов: уходим к школе. Ящик с пайками оставили, метка ниже. Кто отстал — забирайте', 'pin', {items:['mre', 'mre', 'mre', 'canteen', 'bandage', 'energy'], at:'house'}],
      [2, '04:30', 'in', 'Рыжов: школа пала. Кто живой — к реке'],
    ]},
    {id:'mama', name:'Мама', col:'#d9776a', msgs:[
      [-4, '20:00', 'in', 'Серёжа, вас куда-то отправляют? По телевизору показывают колонны'],
      [-4, '21:00', 'out', 'Мам, учения. Всё нормально'],
      [0, '23:00', 'out', 'Мама, не выходи из дома. Правда не выходи'],
      [2, '07:00', 'in', 'Серёжа, ты где'],
    ]},
  ]},
  // телефон хозяина дома из обучения: лежит в тумбочке, больше нигде не встречается
  viktor:{owner:'Виктор', g:'m', at:'tut', threads:[
    {id:'lena', name:'Лена', col:'#d98ac0', msgs:[
      [0, '07:10', 'in', 'Витя, мы с детьми у мамы в деревне. Не приезжай, дороги закрыли'],
      [0, '07:12', 'out', 'Я поднял забор до двух с половиной метров. Ворота на засове. Сюда не залезут'],
      [0, '07:13', 'in', 'Ты всегда так говоришь'],
      [0, '08:45', 'out', 'Слышу их на дороге. Стучат в ворота. Если что — я тебя люблю'],
    ]},
  ]},
};
const MCHS = {id:'mchs', name:'МЧС России', col:'#c8322b', msgs:[
  [0, '00:00', 'in', 'ЭКСТРЕННОЕ ОПОВЕЩЕНИЕ. В городе введён карантин. Выезды закрыты. Оставайтесь дома, не открывайте двери посторонним'],
  [1, '08:00', 'in', 'Пункт эвакуации на стадионе закрыт. Оставайтесь дома и ждите указаний'],
  [7, '08:00', 'in', 'Связь в городе будет отключена. Берегите себя'],
]};
for (const k in PH_STORIES) PH_STORIES[k].threads.push(MCHS);                 // оповещение МЧС пришло на все телефоны

const PH = {open:false, it:null, cur:null, opened:0};
const phStory = it => PH_STORIES[it && it.ph] || PH_STORIES.sasha;
const phG = (s, g) => s.replace(/\{([^|}]*)\|([^}]*)\}/g, (_, m, f) => (g === 'f' ? f : m));   // {поел|поела} — по хозяину
const phMine = () => P && P.inv ? P.inv.filter(i => i && i.id === 'phone') : [];

// ---- время сообщений ----
const phDay0 = () => Math.floor(startMin / 1440);
const phAt = m => { const [h, n] = m[1].split(':'); return (phDay0() + m[0]) * 1440 + +h * 60 + +n; };
const phVis = t => t.msgs.filter(m => phAt(m) <= gameMin);
const phInCnt = t => phVis(t).filter(m => m[2] === 'in').length;
const phRd = it => (it.rd = it.rd || {});
const phUnread = (it, t) => Math.max(0, phInCnt(t) - (phRd(it)[t.id] || 0));
const phUnreadIt = it => phStory(it).threads.reduce((a, t) => a + phUnread(it, t), 0);
const phUnreadAll = () => phMine().filter(i => i.ch > 0).reduce((a, i) => a + phUnreadIt(i), 0);
const phInAll = it => phStory(it).threads.reduce((a, t) => a + phInCnt(t), 0);
const phLast = t => { const v = phVis(t); return v[v.length - 1]; };
function phWhen(m) {
  const d = Math.floor(gameMin / 1440) - (phDay0() + m[0]);
  if (d === 0) return 'сегодня'; if (d === 1) return 'вчера';
  const b = typeof dateOf === 'function' ? new Date(dateOf((phDay0() + m[0]) * 1440)) : null;
  return b && typeof MONTHS !== 'undefined' ? b.getDate() + ' ' + MONTHS[b.getMonth()] : d + ' дн. назад';
}
// заряжать можно в доме, где есть свет (сеть или генератор)
const phCanCharge = () => P && insideHouse(P.x, P.y) && poweredAt(P.x, P.y);

// ---- оформление ----
{
  const css = `
#phone{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:rgba(4,6,8,.6);padding:var(--st,0) var(--sxr,0) var(--sb,0) var(--sx,0)}
#phone[hidden]{display:none}
#phone .pdev{width:min(660px,94vw);height:min(380px,calc(var(--vh,100vh) - 24px));background:#0b0d0f;border-radius:26px;padding:9px;box-shadow:0 18px 50px rgba(0,0,0,.6),inset 0 0 0 2px #2a2e33}
#phone .scr{width:100%;height:100%;border-radius:18px;overflow:hidden;background:#101418;color:#eef0f2;font:14px/1.35 system-ui,-apple-system,sans-serif;display:grid;grid-template-rows:38px minmax(0,1fr);position:relative}
#phone .sb{display:flex;align-items:center;gap:6px;padding:0 8px 0 4px;font-size:12px;font-weight:600;background:#0c1013;border-bottom:1px solid #1d232a}
#phone .sb button{flex:none;height:30px;min-width:32px;border:0;border-radius:8px;background:transparent;color:#fff;cursor:pointer;padding:0 6px;display:grid;place-items:center;font:400 13px system-ui}
#phone .sb button:active{background:rgba(255,255,255,.12)}
#phone .sb .x{font:400 24px/24px system-ui;padding:0 0 3px}
#phone .sb button.on{background:rgba(240,196,119,.22);color:#f0c477}
#phone .sb svg{width:18px;height:18px}
#phone .sb .who{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.1}
#phone .sb .who b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#phone .sb .who small{font-size:10.5px;color:#8b96a0;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#phone .sb .bat{font-variant-numeric:tabular-nums;color:#c8d0d6;white-space:nowrap}
#phone .sb .bat.low{color:#ff8a7a}
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
#phone .bub .pin{display:flex;align-items:center;gap:8px;margin-bottom:5px;padding:7px 9px;border-radius:9px;background:rgba(0,0,0,.25);font-size:12.5px;font-weight:600}
#phone .bub .pin span{font-size:18px}
#phone .foot{align-self:center;margin-top:8px;font-size:11.5px;color:#6f7a84}
#phone .dead{position:absolute;inset:0;background:#030405;display:grid;place-items:center;text-align:center;padding:24px;color:#8b96a0;font-size:13px;gap:6px;align-content:center}
#phone .dead b{color:#d8dde2;font-size:16px}
#phone .dead button{margin-top:8px;justify-self:center;min-height:38px;padding:0 18px;border-radius:19px;border:1px solid #2a3038;background:#141a20;color:#e9e3d6;font:600 13px system-ui;cursor:pointer}
@media (max-width:540px){#phone .main{grid-template-columns:52px minmax(0,1fr)}#phone .ct .nm{display:none}#phone .ct i{position:absolute;top:3px;right:3px;margin:0}#phone .ct{padding:8px 10px}}
#bPhone{position:relative}
#bPhone .pdot{position:absolute;top:2px;right:3px;width:9px;height:9px;border-radius:50%;background:#e5483b;box-shadow:0 0 0 2px rgba(0,0,0,.5)}
#bPhone .pdot[hidden]{display:none}
#bPhone.ring{animation:phRing .5s 3}
@keyframes phRing{0%,100%{transform:rotate(0)}25%{transform:rotate(-14deg)}75%{transform:rotate(14deg)}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
}
const PH_IC = {
  light:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2h8l-1 6H9z"/><path d="M9 8v12a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V8"/><path d="M12 12v3"/></svg>',
  bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/></svg>',
  mute:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2H8"/><path d="M10 21h4"/><path d="M3 3l18 18"/></svg>',
  swap:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4L3 8l4 4"/><path d="M3 8h14"/><path d="M17 20l4-4-4-4"/><path d="M21 16H7"/></svg>',
};

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

// ---- геометка в переписке: прочитал — тайник с припасами появился и отмечен на карте ----
function phGift(it, t, m, k) {
  const gift = m[5]; if (!gift) return;
  const key = it.ph + ':' + t.id + ':' + k;
  world.phg = world.phg || {};
  if (world.phg[key]) return;
  world.phg[key] = true;
  const kinds = gift.at === 'house' ? ['house'] : [gift.at, 'shed', 'garage'];
  let L = houses.filter((H, i) => kinds.includes(H.kind) && i + 1 !== spawnHouse);
  if (!L.length) L = houses.filter((H, i) => H.kind === 'house' && i + 1 !== spawnHouse);
  if (!L.length) return;
  L.sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y));
  const H = L[Math.min(L.length - 1, Math.floor(rng() * Math.min(4, L.length)))];   // одно из ближайших — не на краю света
  const fl = typeof houseFloor === 'function' ? houseFloor(H) : null, x = fl ? fl[0] : H.x + H.w / 2, y = fl ? fl[1] : H.y + H.h / 2;
  for (const id of gift.items) if (ITEMS[id]) addToPile(x, y, mkItem(id));
  world.marks = world.marks || []; world.marks.push({x:Math.round(x), y:Math.round(y), t:'stash', ph:key});
  setTimeout(() => toast('📍 Метка из переписки — тайник отмечен на карте'), 250);
  if (typeof logEv === 'function') logEv('В чужом телефоне нашлась метка с припасами');
}

// ---- экран ----
function phEl() {
  let o = $('phone'); if (o) return o;
  o = mk('div'); o.id = 'phone'; o.hidden = true; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Телефон');
  o.innerHTML = '<div class="pdev"><div class="scr"><div class="sb">'
    + '<button type="button" class="x" aria-label="Убрать телефон">‹</button>'
    + '<span class="who"><b></b><small></small></span>'
    + '<button type="button" class="sw" aria-label="Другой телефон" title="Другой телефон">' + PH_IC.swap + '</button>'
    + '<button type="button" class="lt" aria-label="Фонарик" title="Фонарик">' + PH_IC.light + '</button>'
    + '<button type="button" class="mu" aria-label="Звук" title="Звук"></button>'
    + '<span class="bat"></span></div>'
    + '<div class="main"><div class="cl"></div><div class="chat"></div></div><div class="dead" hidden></div></div></div>';
  o.addEventListener('click', e => { if (e.target === o) phClose(); });
  o.querySelector('.x').addEventListener('click', () => { SFX.ui(); phClose(); });
  o.querySelector('.sw').addEventListener('click', () => { const L = phMine(); if (L.length < 2) return; SFX.ui(); PH.it = L[(L.indexOf(PH.it) + 1) % L.length]; PH.cur = null; phShow(); });
  o.querySelector('.lt').addEventListener('click', () => { if (!PH.it || PH.it.ch <= 0) return; SFX.ui(); phLight(PH.it); phBar(); });
  o.querySelector('.mu').addEventListener('click', () => { if (!PH.it) return; SFX.ui(); PH.it.mute = !PH.it.mute; toast(PH.it.mute ? 'Звук выключен: телефон только вибрирует' : 'Звук включён — звонок услышат и мертвецы'); phBar(); });
  document.body.appendChild(o); return o;
}
function phLight(it) {
  if (it.ch <= 0) { toast('Телефон сел'); return; }
  it.on = !it.on;
  if (it.on) for (const f of P.inv) if (f !== it && (f.id === 'flashlight' || f.id === 'candle' || f.id === 'phone') && f.on) f.on = false;   // светит что-то одно
  toast(it.on ? 'Фонарик телефона включён. Батарея садится быстрее' : 'Фонарик телефона выключен');
  if (typeof renderPanel === 'function' && panel && panel.kind === 'inv') renderPanel();
}
// строка вверху: чей телефон, заряд, кнопки
function phBar() {
  const o = phEl(), it = PH.it; if (!it) return;
  const s = phStory(it), L = phMine();
  o.querySelector('.who b').textContent = 'Телефон: ' + s.owner;
  o.querySelector('.who small').textContent = (it.plug ? 'Заряжается · ' : '') + 'Нет сети · ' + fmtTime(gameMin);
  const b = o.querySelector('.bat'), c = Math.max(0, Math.round(it.ch)); b.textContent = c + '%'; b.classList.toggle('low', c <= 15);
  o.querySelector('.sw').hidden = L.length < 2;
  o.querySelector('.lt').classList.toggle('on', !!it.on);
  const mu = o.querySelector('.mu'); mu.innerHTML = it.mute ? PH_IC.mute : PH_IC.bell; mu.title = it.mute ? 'Без звука' : 'Звук включён';
}
function phShow(id, keep) {
  const o = phEl(), it = PH.it; if (!it) return;
  const s = phStory(it), rd = phRd(it);
  phBar();
  const dead = o.querySelector('.dead');
  if (!(it.ch > 0)) {
    dead.hidden = false; dead.textContent = '';
    dead.appendChild(mk('b', '', 'Телефон сел'));
    dead.appendChild(mk('div', '', phCanCharge() ? 'Здесь есть свет — можно поставить на зарядку.' : 'Зарядить можно в доме, где есть свет: от сети или генератора.'));
    if (phCanCharge() && !it.plug) dead.appendChild(btn('На зарядку', () => { SFX.ui(); phPlug(it, true); phShow(); }));
    return;
  }
  dead.hidden = true;
  const t = s.threads.find(x => x.id === (id || PH.cur)) || s.threads.filter(x => phVis(x).length).sort((a, b) => phAt(phLast(b)) - phAt(phLast(a)))[0] || s.threads[0];
  PH.cur = t.id;
  // сколько последних входящих подсветить (при обновлении той же переписки подсветка сохраняется)
  const fresh = phInCnt(t) - (rd[t.id] || 0) + (keep ? PH.fresh || 0 : 0); PH.fresh = fresh;
  rd[t.id] = phInCnt(t);
  // контакты: у кого свежее — выше
  const cl = o.querySelector('.cl'); cl.textContent = '';
  const list = s.threads.filter(x => phVis(x).length).sort((a, b) => phAt(phLast(b)) - phAt(phLast(a)));
  for (const x of list) {
    const b = btn('', () => { SFX.ui(); phShow(x.id); }, 'ct' + (x.id === t.id ? ' on' : ''));
    const a = mk('span', 'av', x.name[0] === '+' ? '?' : x.name[0]); a.style.background = x.col;
    b.appendChild(a); b.appendChild(mk('span', 'nm', x.name));
    const u = phUnread(it, x); if (u) b.appendChild(mk('i', '', String(u))); b.title = x.name; cl.appendChild(b);
  }
  // переписка
  const c = o.querySelector('.chat'); c.textContent = '';
  const vis = phVis(t); let day = null, inN = vis.filter(m => m[2] === 'in').length;
  vis.forEach(m => {
    if (m[0] !== day) { day = m[0]; c.appendChild(mk('div', 'pday', phWhen(m))); }
    const isNew = m[2] === 'in' && inN-- <= fresh && phAt(m) >= startMin;   // пришло уже в игре
    const b = mk('div', 'bub ' + m[2] + (isNew ? ' nw' : ''));
    if (m[4] === 'pin') { const p = mk('div', 'pin'); p.appendChild(mk('span', '', '📍')); p.appendChild(mk('div', '', 'Геометка')); b.appendChild(p); }
    else if (m[4]) b.appendChild(phPhoto(m[4]));
    b.appendChild(document.createTextNode(phG(m[3], s.g))); b.appendChild(mk('small', '', m[1])); c.appendChild(b);
    if (m[5]) phGift(it, t, m, t.msgs.indexOf(m));
  });
  c.appendChild(mk('div', 'foot', 'Нет сети — ответить нельзя'));
  requestAnimationFrame(() => { c.scrollTop = c.scrollHeight; });
  phBadge();
}
function phOpen(it) {
  if (mode !== 'play' || !P || P.sleep) return;
  const L = phMine(); if (!L.length) return;
  if (!it || !L.includes(it)) it = L.filter(i => i.ch > 0 && phUnreadIt(i)).sort((a, b) => phUnreadIt(b) - phUnreadIt(a))[0] || (L.includes(PH.it) ? PH.it : L[0]);
  if (typeof closePanel === 'function' && panel) closePanel();
  if (PH.it !== it) PH.cur = null;
  PH.it = it; PH.open = true; PH.opened++; paused = true; atkHeld = false; joy.id = null; joy.x = joy.y = 0; if ($('stick')) $('stick').hidden = true;
  phEl().hidden = false;
  // сразу открыта переписка, где есть непрочитанное (самое свежее)
  const un = it.ch > 0 && phStory(it).threads.filter(t => phUnread(it, t)).sort((a, b) => phAt(phLast(b)) - phAt(phLast(a)))[0];
  phShow(un ? un.id : PH.cur);
  SFX.select && SFX.select();
}
function phClose() {
  if (!PH.open) return;
  PH.open = false; phEl().hidden = true;
  if (mode === 'play' && !panel && $('pause').hidden) paused = false;
  phBadge();
}
function phBadge() { const b = $('bPhone'); if (b && P) b.querySelector('.pdot').hidden = !phUnreadAll(); }
function phPlug(it, on) {
  it.plug = !!on;
  toast(on ? 'Телефон заряжается. Не уходи из дома' : 'Телефон снят с зарядки · ' + Math.round(it.ch) + '%');
}
// кнопки в карточке телефона в рюкзаке (34-watches-windows → invDetail)
function phButtons(it) {
  const bs = [];
  if (it.ch > 0) bs.push(btn(it.on ? 'Погасить фонарик' : 'Фонарик', () => { phLight(it); }, 'ghost'));
  if (it.plug) bs.push(btn('Снять с зарядки', () => { phPlug(it, false); renderPanel(); }, 'ghost'));
  else if (phCanCharge() && it.ch < 100) bs.push(btn('На зарядку', () => { phPlug(it, true); renderPanel(); }, 'ghost'));
  return bs;
}
defUse(it => it.id === 'phone', it => phOpen(it));

// ---- батарея: ждёт сигнала (медленно), экран открыт (быстрее); фонарик садит в 08-update; зарядка в доме со светом ----
{
  let gm0 = null;
  onUpdate(dt => {
    if (!P || mode !== 'play') { gm0 = null; return; }
    const gm = gm0 == null ? 0 : Math.max(0, gameMin - gm0); gm0 = gameMin;
    const L = phMine(); if (!L.length) return;
    const can = phCanCharge();
    for (const it of L) {
      if (it.plug) {
        if (!can) { it.plug = false; toast('Ушёл от розетки — телефон больше не заряжается'); continue; }
        it.ch = Math.min(100, (it.ch || 0) + gm * 1.25);
        if (it.ch >= 100) { it.plug = false; toast('Телефон ' + phStory(it).owner + ' заряжен'); SFX.select && SFX.select(); }
        continue;
      }
      if (it.ch > 0) {
        it.ch = Math.max(0, it.ch - gm / 150 - (PH.open && PH.it === it ? dt * .25 : 0));
        if (it.ch <= 0) { it.on = false; if (PH.open && PH.it === it) phShow(); }
      }
    }
    if (PH.open && PH.it && !PH.it.plug && Math.floor(gameMin) % 5 === 0) phBar();
  });
}

// ---- новое сообщение пришло по ходу игры: строчка вверху, вибрация, звонок. Со звуком — слышат мертвецы ----
function phRing(it) {
  try { settings.vib !== false && navigator.vibrate && navigator.vibrate([60, 80, 60]); } catch (e) {}
  const b = $('bPhone'); if (b) { b.classList.remove('ring'); void b.offsetWidth; b.classList.add('ring'); }
  if (it.mute) return;
  if (typeof SOFT !== 'undefined') for (let k = 0; k < 3; k++) { SOFT.note(1318, .07, .14, k * .32, 'square'); SOFT.note(1046, .06, .14, k * .32 + .15, 'square'); }
  noise(P.x, P.y, 9);                                                          // мелодия на весь двор
  if (!it._muteTip) { it._muteTip = 1; setTimeout(() => toast('Звонок слышно далеко. Выключи звук в телефоне'), 1600); }
}
setInterval(() => {
  if (PH.open && mode !== 'play') { phClose(); return; }
  if (!P || mode !== 'play') return;
  for (const it of phMine()) {
    const n = phInAll(it);
    if (it.n0 == null || it.ch <= 0) { it.n0 = n; continue; }                   // только что нашли или сел — без звонка
    if (n > it.n0) {
      let last = null, lt = null;
      for (const t of phStory(it).threads) for (const m of phVis(t)) if (m[2] === 'in' && (!last || phAt(m) >= phAt(last))) { last = m; lt = t; }
      if (last && !(typeof TUT !== 'undefined' && TUT.on)) {
        const txt = phG(last[3], phStory(it).g);
        toast('📱 ' + lt.name + ': ' + (txt.length > 60 ? txt.slice(0, 58) + '…' : txt));
        phRing(it);
      }
      if (PH.open && PH.it === it) phShow(PH.cur, true);
    }
    it.n0 = n;
  }
  phBadge();
}, 1000);

// ---- кнопка (её место под «−/+» задаёт модуль действий; видна, когда есть телефон), клавиша N ----
{
  const m = $('bMap');
  const b = mk('button', m ? m.className.replace('mapslot', '') : 'hslot'); b.id = 'bPhone'; b.type = 'button'; b.setAttribute('aria-label', 'Телефон'); b.title = 'Телефон (N)'; b.hidden = true;
  b.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/></svg><span class="hk">N</span><span class="hl">Телефон</span><span class="pdot" hidden></span>';
  b.addEventListener('click', e => { e.stopPropagation(); phOpen(); });
  if (m) m.after(b); else { const h = $('hud'); if (h) h.appendChild(b); }
  addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const k = e.key.toLowerCase();
    if (PH.open && (k === 'escape' || k === 'n' || k === 'т')) { e.preventDefault(); e.stopImmediatePropagation(); phClose(); return; }
    if ((k === 'n' || k === 'т') && mode === 'play' && !paused && phMine().length) { e.preventDefault(); phOpen(); }
  }, true);
}

// ---- где лежат: при создании района. В родном — все истории, в соседних — пара ещё не найденных ----
function mkPhone(story) { const it = mkItem('phone'); it.ph = story; it.ch = ri(8, 70); it.mute = false; it.on = false; return it; }
function placePhones() {
  const HOMEC = ['nightstand', 'dresser', 'wdesk', 'coffeetab', 'bookshelf', 'hanger', 'cabinet', 'wardrobe', 'chest'];
  const inHouse = f => { const k = hAt[f.y * MW + f.x], H = houses[k - 1]; return H && H.kind === 'house' && k !== spawnHouse; };
  const pool = {
    home:furns.filter(f => !f.gone && HOMEC.includes(f.type) && CONT[f.type] && inHouse(f)),
    car:props.filter(p => p.type === 'car' && !p.army),
    army:furns.filter(f => !f.gone && f.type === 'armybox').concat(props.filter(p => p.type === 'car' && p.army)),
  };
  const fill = c => { if (!c.items) { c.items = []; const C = CONT[c.type]; if (C && C.loot) for (let n = ri(C.n[0], C.n[1]); n > 0; n--) c.items.push(mkItem(pick(C.loot))); } };
  const home = !world.dx && !world.dy, got = world.phGot || [];
  let ids = Object.keys(PH_STORIES).filter(k => PH_STORIES[k].at !== 'tut');
  if (!home) { const rest = ids.filter(k => !got.includes(k)); ids = shuffle(rest.length ? rest : ids).slice(0, ri(1, 2)); }
  const used = new Set();
  for (const id of ids) {
    const at = PH_STORIES[id].at;
    let L = (pool[at] && pool[at].length ? pool[at] : pool.home.length ? pool.home : pool.car).filter(c => !used.has(c));
    if (!L.length) continue;
    const c = pick(L); used.add(c); fill(c); c.items.push(mkPhone(id));
  }
}
onNewWorld(o => { if (!(o && o.save) && !genTutMap) placePhones(); });
// подобрал — запомнили историю (в соседних районах таких уже не будет)
onUpdate(() => {
  if (!P || mode !== 'play') return;
  for (const it of phMine()) if (!it._got) { it._got = 1; world.phGot = world.phGot || []; if (!world.phGot.includes(it.ph)) world.phGot.push(it.ph); }
});

// ---- сохранение: найденные истории и выданные тайники — у мира; сам телефон хранится как вещь ----
onStartNew(() => { PH.it = null; PH.cur = null; }, () => { world.phGot = []; world.phg = {}; });
onSave(d => { d.xPh = {got:world.phGot || [], g:world.phg || {}}; });
onLoad(d => { const x = d && d.xPh; world.phGot = (x && x.got) || []; world.phg = (x && x.g) || {}; PH.it = null; PH.cur = null; });
{ const f = toMenu; toMenu = function () { phClose(); return f.apply(this, arguments); }; }
