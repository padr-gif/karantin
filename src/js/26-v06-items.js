// ================= v6: more items =================
Object.assign(ITEMS, {
  machete:{name:'Мачете', kind:'weapon', dmg:38, range:1.25, cd:.55, cleave:2, dur:45, verb:'Взять в руки'},
  sledge:{name:'Кувалда', kind:'weapon', dmg:68, range:1.3, cd:1.3, cleave:3, dur:70, verb:'Взять в руки'},
  shovel:{name:'Лопата', kind:'weapon', dmg:33, range:1.5, cd:.75, cleave:2, dur:55, verb:'Взять в руки'},
  golf:{name:'Клюшка для гольфа', sh:'Клюшка', kind:'weapon', dmg:29, range:1.4, cd:.55, cleave:1, dur:30, verb:'Взять в руки'},
  honey:{name:'Банка мёда', sh:'Мёд', kind:'food', sat:22, en:6, verb:'Съесть'},
  crackers:{name:'Сухари', kind:'food', sat:12, hyd:-4, verb:'Съесть'},
  tuna:{name:'Тунец', kind:'food', sat:30, opener:true, verb:'Открыть и съесть'},
  juice:{name:'Пакет сока', sh:'Сок', kind:'drink', hyd:30, sat:6, verb:'Выпить'},
  whiskey:{name:'Виски', kind:'drink', hyd:4, hp:5, en:-14, verb:'Выпить'},
  rag:{name:'Тряпки', kind:'misc', info:'Из двух тряпок выйдет бинт'},
  binoculars:{name:'Бинокль', kind:'bino', verb:'Осмотреться'},
  trap:{name:'Капкан', kind:'trap', verb:'Поставить'},
  flare:{name:'Фальшфейер', kind:'misc', verb:'Зажечь и бросить'},
});
Object.assign(DESC, {
  machete:'Длинный тесак. Быстрый, рубит двоих за раз. Лучший нож в городе.',
  sledge:'Тяжеленная кувалда. Медленная, но сносит до трёх мертвецов одним махом.',
  shovel:'Штыковая лопата. Длинная и прочная, бьёт сразу двоих.',
  golf:'Клюшка для гольфа. Лёгкая и быстрая, но гнётся.',
  honey:'Банка мёда. Не портится никогда и немного бодрит.',
  crackers:'Пачка сухарей. Хранятся вечно, но после них хочется пить.',
  tuna:'Консервированный тунец. Нужен нож или открывашка.',
  juice:'Пакет яблочного сока. Хорошо утоляет жажду.',
  whiskey:'Бутылка виски. Притупляет боль, но клонит в сон.',
  rag:'Лоскуты ткани. Из двух тряпок получится бинт (вкладка «Создать»).',
  binoculars:'Полевой бинокль. Позволяет на полминуты осмотреть округу далеко вокруг.',
  trap:'Медвежий капкан. Поставь на пути: мертвец, наступивший в него, застрянет и покалечится. Потом капкан можно забрать и взвести снова.',
  flare:'Сигнальный фальшфейер. Брось подальше: полминуты он горит красным огнём и шипит, собирая к себе мертвецов со всей округи.',
});
WSPEC.machete = {segs:[[0, 3, 1, '#1e1e20'], [3, 10.5, 1.5, '#c6cace']]};
WSPEC.sledge = {segs:[[0, 10, .85, '#8c643e']], head:{at:10, w:2.6, len:2, col:'#5c6066'}};
WSPEC.shovel = {segs:[[0, 10.5, .8, '#96704a']], head:{at:11.2, w:2.6, len:1.4, col:'#727880'}};
WSPEC.golf = {segs:[[0, 2.5, .9, '#1e1e20'], [2.5, 12, .5, '#b4b8bc']], head:{at:12, w:1.2, len:1, col:'#c6cace'}};
{
  const add = (k, ...ids) => CONT[k].loot.push(...ids);
  add('wardrobe', 'rag', 'rag', 'golf', 'binoculars', 'whiskey'); add('cabinet', 'honey', 'crackers', 'tuna', 'whiskey', 'rag');
  add('fridge', 'juice', 'juice'); add('shelf', 'crackers', 'tuna', 'juice', 'honey'); add('counter', 'crackers', 'juice', 'flare');
  add('crate', 'shovel', 'sledge', 'trap', 'machete', 'rag'); add('toolrack', 'shovel', 'sledge', 'trap', 'machete', 'flare');
  add('car', 'flare', 'binoculars', 'rag'); add('armybox', 'flare', 'flare', 'binoculars', 'machete'); add('locker', 'binoculars', 'flare');
  add('airdrop', 'flare', 'machete');
}
Object.assign(ITEMS, {
  note:{name:'Записка', kind:'note', verb:'Прочитать'},
  cereal:{name:'Хлопья', kind:'food', sat:16, hyd:-2, verb:'Съесть'},
  pbutter:{name:'Арахисовая паста', sh:'Арах. паста', kind:'food', sat:30, hyd:-6, verb:'Съесть'},
  jug:{name:'Бутыль 5 л', sh:'Бутыль', kind:'canteen', verb:'Выпить'},
});
Object.assign(DESC, {
  note:'Клочок бумаги, исписанный от руки. Кто-то оставил его здесь.', cereal:'Коробка сухих хлопьев. Хранится долго.',
  pbutter:'Банка арахисовой пасты. Очень сытно и не портится.', jug:'Пластиковая бутыль на пять порций воды. Наполняется у крана, из бочки и из бачка унитаза.',
});
Object.assign(CONT, {
  nightstand:{name:'Тумбочка', loot:['pills', 'bandage', 'matches', 'battery', 'book_fight', 'book_cook', 'flashlight', 'lighter', 'vitamins', 'note'], n:[0, 2], cap:4},
  dresser:{name:'Комод', loot:['rag', 'rag', 'bandage', 'battery', 'book_carp', 'lighter', 'vitamins', 'binoculars', 'alarm'], n:[0, 3], cap:8},
  bookshelf:{name:'Книжный шкаф', loot:['book_carp', 'book_cook', 'book_farm', 'book_fight', 'map', 'note'], n:[0, 2], cap:8},
  medcab:{name:'Шкафчик в ванной', loot:['bandage', 'pills', 'vitamins', 'antibio', 'bandage', 'rag'], n:[0, 3], cap:5},
  hanger:{name:'Вешалка', loot:['rag', 'map', 'flashlight', 'bag', 'lighter'], n:[0, 1], cap:3},
  toilet:{name:'Унитаз'}, bath:{name:'Ванна'}, table:{name:'Стол'}, sofa:{name:'Диван'}, tv:{name:'Телевизор'},
});
SPRA.counter = 'counter2';
{ const add = (k, ...ids) => CONT[k].loot.push(...ids); add('cabinet', 'cereal', 'pbutter'); add('shelf', 'cereal', 'pbutter', 'jug'); add('counter', 'cereal'); add('crate', 'jug'); add('armybox', 'jug'); }
// container capacity
const CAPS = {fridge:12, cabinet:8, sink:4, stove:4, wardrobe:10, shelf:8, crate:14, locker:8, desk:6, medshelf:10, toolrack:10, counter:8, armybox:12, airdrop:12, car:12, pile:40};
function capOf(c) { return (CONT[c.type] && CONT[c.type].cap) || CAPS[c.type] || 10; }
const wcap = it => it.id === 'jug' ? 5 : 3;
RECIPES.push({name:'Бинт из тряпок', icon:'bandage', parts:() => [{id:'rag', ok:countItem('rag') >= 2, badge:'2'}], need:'2 тряпки', can:() => countItem('rag') >= 2, make:() => { removeItem('rag'); removeItem('rag'); P.inv.push(mkItem('bandage')); toast('Бинт готов'); }});
// ---- traps ----
let traps = [], flares = [];
function placeTrap(k) {
  const t = freeFront(); if (!t) { toast('Нет места для капкана'); return; }
  const [x, y] = t, p = {type:'trap', proc:true, cx:x + .5, cy:y + .5, solid:false, r:[x + .2, y + .2, x + .8, y + .8], armed:true};
  if (!addProp(p, [[x, y]])) { toast('Нет места'); return; }
  traps.push(p); P.inv.splice(k, 1); closePanel(); SFX.knock(p.cx, p.cy); toast('Капкан взведён');
}
function updateTraps() {
  for (const t of traps) if (t.armed) for (const z of zs) if (Math.hypot(z.x - t.cx, z.y - t.cy) < .42) {
    t.armed = false; z.trapT = 9; z.hp -= 30; z.x = t.cx; z.y = t.cy; addBlood(z.x, z.y, .5); SFX.hit(true, z.x, z.y); noise(t.cx, t.cy, 6);
    if (z.hp <= 0) killZombie(z);
    break;
  }
}
function drawTrap(p, f) {
  const sx = SX(p.cx, p.cy), sy = SY(p.cx, p.cy, 0);
  ctx.strokeStyle = C([150, 154, 160], f); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(sx, sy, 8, 4, 0, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = C([90, 94, 100], f); ctx.lineWidth = .8; ctx.beginPath();
  if (p.armed) { for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; ctx.moveTo(sx + Math.cos(a) * 8, sy + Math.sin(a) * 4); ctx.lineTo(sx + Math.cos(a) * 6, sy + Math.sin(a) * 3 - 2); } ctx.moveTo(sx - 3, sy); ctx.lineTo(sx + 3, sy); }
  else { ctx.moveTo(sx - 8, sy); ctx.lineTo(sx + 8, sy); ctx.moveTo(sx - 7, sy - 3); ctx.lineTo(sx + 7, sy - 3); }
  ctx.stroke();
}
// ---- flares ----
function updateFlares(dt) {
  for (const f of flares) {
    f.t -= dt; f.n -= dt;
    if (f.n <= 0) { f.n = 1.4; noise(f.x, f.y, 18); SFX.fizz(f.x, f.y); }
    if (!reduceMotion && Math.random() < dt * 14) emit('smoke', f.x, f.y, .2, 1, null, 0, .3);
  }
  flares = flares.filter(f => f.t > 0);
}
function drawFlare(f) {
  const sx = SX(f.x, f.y), sy = SY(f.x, f.y, 0);
  ctx.fillStyle = '#7a1612'; ctx.fillRect(sx - 3, sy - 1, 6, 2);
  ctx.globalCompositeOperation = 'lighter';
  const r = 26 + Math.sin(animT * 30) * 3, g = ctx.createRadialGradient(sx, sy - 2, 0, sx, sy - 2, r);
  g.addColorStop(0, 'rgba(255,90,70,.9)'); g.addColorStop(.25, 'rgba(255,40,30,.35)'); g.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, sy - 2, r, r * .6, 0, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#fff0e0'; ctx.fillRect(sx + 2.5, sy - 3, 2, 2);
}
// ---- binoculars ----
function useBino() {
  closePanel(); P.binoT = 30; P.binoZ = true; zoomOff = Math.max(1 - kBase, settings.zoom - 1); resize(); computeVis(); fogDirty = true;
  toast('Осматриваешься в бинокль…');
}
function updateBino(dt) {
  if (!(P.binoT > 0)) return;
  P.binoT -= dt;
  if (P.binoT <= 0 || P.moving || P.car) { P.binoT = 0; zoomOff = settings.zoom; resize(); computeVis(); fogDirty = true; }
}
