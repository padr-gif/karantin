// ================= data =================
const ITEMS = {
  canned:  {name:'Консервы', kind:'food', sat:35, opener:true, verb:'Открыть и съесть'},
  chips:   {name:'Чипсы', kind:'food', sat:15, hyd:-5, verb:'Съесть'},
  bread:   {name:'Хлеб', kind:'food', sat:22, rot:true, verb:'Съесть'},
  sausage: {name:'Колбаса', kind:'food', sat:30, rot:true, verb:'Съесть'},
  milk:    {name:'Молоко', kind:'drink', hyd:22, sat:8, rot:true, verb:'Выпить'},
  water:   {name:'Бутылка воды', kind:'drink', hyd:40, leaves:'bottle', verb:'Выпить'},
  soda:    {name:'Газировка', kind:'drink', hyd:25, sat:4, verb:'Выпить'},
  coffee:  {name:'Банка кофе', kind:'drink', hyd:8, en:30, verb:'Выпить'},
  bottle:  {name:'Пустая бутылка', kind:'misc', info:'Набери воды у раковины, пока она идёт'},
  bandage: {name:'Бинт', kind:'heal', hp:20, stop:true, verb:'Перевязать'},
  pills:   {name:'Обезболивающее', kind:'heal', hp:10, verb:'Принять'},
  opener:  {name:'Консервный нож', kind:'misc', info:'Открывает консервы'},
  plank:   {name:'Доска', kind:'misc', info:'Для баррикад, нужен молоток'},
  battery: {name:'Батарейка', kind:'battery', verb:'Вставить в фонарик'},
  flashlight:{name:'Фонарик', kind:'light'},
  hammer:  {name:'Молоток', kind:'weapon', dmg:22, range:1.0, cd:.5, cleave:1, dur:50, verb:'Взять в руки'},
  bat:     {name:'Бейсбольная бита', kind:'weapon', dmg:32, range:1.45, cd:.62, cleave:2, dur:40, verb:'Взять в руки'},
  knife:   {name:'Кухонный нож', kind:'weapon', dmg:27, range:1.05, cd:.4, cleave:1, dur:25, verb:'Взять в руки'},
  pipe:    {name:'Обрезок трубы', kind:'weapon', dmg:40, range:1.35, cd:.8, cleave:2, dur:60, verb:'Взять в руки'},
  axe:     {name:'Топор', kind:'weapon', dmg:55, range:1.3, cd:.95, cleave:2, dur:45, verb:'Взять в руки'},
  pan:     {name:'Сковорода', kind:'weapon', dmg:24, range:1.0, cd:.55, cleave:1, dur:70, verb:'Взять в руки'},
  crowbar: {name:'Лом', kind:'weapon', dmg:38, range:1.3, cd:.7, cleave:1, dur:90, verb:'Взять в руки'},
  meat:    {name:'Сырое мясо', kind:'food', sat:20, rot:true, raw:'steak', rawRisk:true, verb:'Съесть сырым'},
  steak:   {name:'Жареное мясо', kind:'food', sat:48, rot:true, verb:'Съесть'},
  pasta:   {name:'Макароны', kind:'misc', raw:'pastaC', info:'Сварить в кастрюле с водой'},
  pastaC:  {name:'Варёные макароны', kind:'food', sat:40, verb:'Съесть'},
  rice:    {name:'Рис', kind:'misc', raw:'riceC', info:'Сварить в кастрюле с водой'},
  riceC:   {name:'Варёный рис', kind:'food', sat:42, verb:'Съесть'},
  pot:     {name:'Кастрюля', kind:'misc', info:'Для варки макарон и риса'},
  matches: {name:'Спички', kind:'misc', uses:5, info:'Разжечь костёр'},
  lighter: {name:'Зажигалка', kind:'misc', uses:15, info:'Разжечь костёр'},
  bag:     {name:'Туристический рюкзак', kind:'bag', verb:'Надеть', info:'+10 мест в инвентаре'},
  vitamins:{name:'Витамины', kind:'heal', hp:5, en:12, verb:'Принять'},
};
const FISTS = {name:'Кулаки', dmg:11, range:.95, cd:.5, cleave:1};
const CONT = {
  fridge:   {name:'Холодильник', loot:['bread','sausage','milk','water','soda','bread','sausage','meat','meat'], n:[1,3]},
  cabinet:  {name:'Кухонный шкафчик', loot:['canned','canned','chips','opener','knife','pills','bandage','coffee','water','bottle','battery','pasta','rice','pot','pan','matches'], n:[0,3]},
  wardrobe: {name:'Шкаф', loot:['bandage','bat','pills','flashlight','battery','bottle','coffee','bag','vitamins','lighter'], n:[0,2]},
  shelf:    {name:'Полка', loot:['chips','canned','water','soda','battery','bandage','flashlight','canned','water','pasta','rice','lighter','matches','vitamins'], n:[0,2]},
  crate:    {name:'Ящик с инструментом', loot:['plank','plank','plank','plank','hammer','pipe','axe','battery','crowbar','matches','lighter'], n:[1,3]},
  car:      {name:'Машина', loot:['water','soda','chips','bandage','lighter','flashlight','battery','crowbar','hammer','pills','bag','coffee','canned'], n:[0,3]},
  bed:      {name:'Кровать'},
  sink:     {name:'Раковина'},
  stove:    {name:'Плита'},
  fire:     {name:'Костёр'},
  barrel:   {name:'Бочка'},
};
Object.assign(CONT, {
  locker:  {name:'Шкафчик', loot:['baton','vest','flashlight','battery','radio','bandage','map','baton','medkit'], n:[1,2]},
  desk:    {name:'Рабочий стол', loot:['coffee','map','battery','pills','choco','radio','tape','energy'], n:[0,2]},
  medshelf:{name:'Аптечный стеллаж', loot:['bandage','bandage','pills','pills','antibio','medkit','vitamins','vitamins'], n:[1,3]},
  toolrack:{name:'Стеллаж с инструментом', loot:['hammer','plank','plank','tape','axe','crowbar','pipe','burner','matches','lighter','flashlight','battery'], n:[1,2]},
  counter: {name:'Прилавок', loot:['chips','soda','energy','water','choco','map','lighter','coffee','canned'], n:[1,3]},
  armybox: {name:'Армейский ящик', loot:['mre','mre','medkit','vest','canteen','antibio','flashlight','battery','bandage','map','energy'], n:[2,4]},
});
const SPRA = {locker:'wardrobe', desk:'cabinet', medshelf:'shelf', toolrack:'shelf', counter:'cabinet', armybox:'crate'};
const FLIST = {
  store:['fridge','fridge','crate','counter','shelf','shelf','shelf','shelf','shelf','shelf','shelf','shelf','shelf'],
  police:['locker','locker','locker','locker','desk','desk','desk','armybox','sink'],
  pharmacy:['medshelf','medshelf','medshelf','medshelf','medshelf','counter','fridge'],
  hardware:['toolrack','toolrack','toolrack','toolrack','toolrack','toolrack','crate','crate'],
  gas:['counter','shelf','shelf','shelf','fridge','fridge'],
};
const LOOTK = {
  store:{counter:['choco','chips','soda','energy','lighter','water']},
  gas:{shelf:['chips','soda','energy','water','choco','canned','map','lighter','coffee','stew'], fridge:['soda','water','energy','milk','water']},
  pharmacy:{fridge:['water','milk','antibio','vitamins']},
  police:{sink:[]},
};
const WALLK = {store:[176,170,158], police:[118,130,150], pharmacy:[214,216,208], hardware:[176,150,120], gas:[206,196,170]};
const SIGNS = {
  store:{text:'ПРОДУКТЫ', bg:'#b8322a', fg:'#fff4e0', label:'Продукты'},
  police:{text:'ПОЛИЦИЯ', bg:'#24406e', fg:'#ffffff', label:'Полиция'},
  pharmacy:{text:'АПТЕКА', bg:'#2f8a4a', fg:'#ffffff', label:'Аптека', cross:true},
  hardware:{text:'ХОЗТОВАРЫ', bg:'#d07a22', fg:'#1e1a16', label:'Хозтовары'},
  gas:{text:'АЗС', bg:'#e3c13a', fg:'#1b1b1b', label:'Заправка'},
};
const SIDING = [[168,156,132],[122,138,148],[176,164,140],[146,122,104],[150,156,136],[184,180,170]];
const PAPER  = [[198,186,158],[178,190,184],[206,190,168],[172,172,188],[190,176,150]];
const ROOFC  = [[112,60,50],[70,76,88],[92,84,66],[64,78,62],[100,90,84]];
const CARC   = [[128,42,36],[52,72,100],[156,156,150],[62,66,60],[176,154,110],[90,104,80]];
const ZSKIN  = [[148,156,122],[156,152,126],[138,148,118],[160,160,140]];
const ZCLOTH = [[92,104,82],[104,88,74],[76,86,104],[128,112,92],[150,148,140],[110,60,56],[64,74,64],[136,124,70]];
const ZPANTS = [[56,58,52],[62,56,50],[50,56,70],[80,70,58]];
const HAIR   = [[52,40,30],[96,72,46],[150,130,96],[40,38,36],[120,110,100]];
