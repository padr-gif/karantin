// ================= v20: starting season, item pack 3 =================
Object.assign(ITEMS, {
  hatchet:{name:'Туристический топорик', sh:'Топорик', kind:'weapon', dmg:36, range:1.1, cd:.55, cleave:1, dur:60, verb:'Взять в руки'},
  wrench:{name:'Разводной ключ', sh:'Ключ', kind:'weapon', dmg:27, range:1.15, cd:.6, cleave:1, dur:90, verb:'Взять в руки'},
  thermos:{name:'Термос с чаем', sh:'Термос', kind:'drink', hyd:30, calm:10, warm:true, verb:'Выпить горячего'},
  hotpack:{name:'Химическая грелка', sh:'Грелка', kind:'misc', verb:'Активировать', info:'мгновенно согревает'},
  umbrella:{name:'Зонт', kind:'misc', info:'пока в рюкзаке, под дождём мокнешь втрое медленнее'},
  oatmeal:{name:'Овсянка', kind:'food', sat:8, verb:'Грызть сухой'},
  porridge:{name:'Каша', kind:'food', sat:40, hyd:5, warm:true, verb:'Съесть'},
  condmilk:{name:'Сгущёнка', kind:'food', sat:25, en:5, calm:5, opener:true, verb:'Открыть и съесть'},
  sprats:{name:'Шпроты', kind:'food', sat:22, opener:true, verb:'Открыть и съесть'},
  salo:{name:'Сало', kind:'food', sat:30, verb:'Съесть'},
  pelmeni:{name:'Пельмени', kind:'food', sat:6, rot:true, rawRisk:true, verb:'Съесть сырыми'},
  pelmeniC:{name:'Варёные пельмени', sh:'Пельмени', kind:'food', sat:48, warm:true, verb:'Съесть'},
  vodka:{name:'Водка', kind:'drink', hyd:-5, calm:35, warm:true, verb:'Выпить'},
  handheld:{name:'Портативная приставка', sh:'Приставка', kind:'fun', fun:40, dur:5, keep:true, verb:'Поиграть'},
});
ICONA.pelmeniC = 'porridge';
Object.assign(WSPEC, {
  hatchet:{segs:[[0, 7, .8, '#9c744a']], blade:{at:6.2, col:'#b8bec6'}},
  wrench:{segs:[[0, 8.5, .9, '#9aa0a8']], head:{at:8.5, w:1.4, len:1.2, col:'#8a9098'}},
});
Object.assign(DESC, {
  hatchet:'Лёгкий туристический топорик. Хорошее оружие, рубит хворост и разбирает мебель.',
  wrench:'Тяжёлый разводной ключ. Бьёт несильно, зато почти не ломается.',
  thermos:'Термос горячего чая. Утоляет жажду, согревает и успокаивает.',
  hotpack:'Химическая грелка. Сломай пакет, и она мгновенно согреет. Спасает на морозе.',
  umbrella:'Обычный зонт. Пока он в рюкзаке, под дождём мокнешь втрое медленнее.',
  oatmeal:'Пачка овсяных хлопьев. Свари в кастрюле с водой, и получится горячая каша.',
  porridge:'Горячая овсяная каша. Сытно и согревает.',
  condmilk:'Банка сгущёнки. Сладко, сытно, поднимает настроение.',
  sprats:'Шпроты в масле. Нужен нож или открывалка.',
  salo:'Кусок солёного сала. Не портится и отлично кормит.',
  pelmeni:'Пачка замороженных пельменей. Без морозилки быстро испортятся. Свари в кастрюле.',
  pelmeniC:'Горячие варёные пельмени. Очень сытно.',
  vodka:'Бутылка водки. Снимает стресс и согревает, но не утоляет жажду.',
  handheld:'Портативная игровая приставка. Отлично прогоняет скуку.',
});
{ const add = (k, ...ids) => CONT[k] && CONT[k].loot.push(...ids);
  add('toolrack', 'hatchet', 'wrench', 'wrench'); add('crate', 'hatchet', 'wrench', 'hotpack'); add('car', 'wrench', 'umbrella', 'thermos', 'hotpack', 'vodka');
  add('cabinet', 'oatmeal', 'condmilk', 'sprats', 'salo', 'vodka'); add('shelf', 'oatmeal', 'condmilk', 'sprats'); add('counter', 'sprats', 'condmilk', 'vodka', 'hotpack');
  add('fridge', 'pelmeni', 'pelmeni', 'salo'); add('hanger', 'umbrella', 'umbrella'); add('wardrobe', 'umbrella', 'hotpack'); add('nightstand', 'handheld', 'thermos');
  add('desk', 'handheld', 'thermos'); add('dresser', 'handheld'); add('locker', 'thermos', 'hotpack'); add('armybox', 'hotpack', 'salo', 'hatchet'); }
for (const k in LOOTK) { if (LOOTK[k].counter) LOOTK[k].counter.push('condmilk', 'sprats', 'vodka'); if (LOOTK[k].fridge) LOOTK[k].fridge.push('pelmeni'); }
defUse(it => it.id === 'hotpack', (it, k) => { P.inv.splice(k, 1); P.cold = Math.max(0, (P.cold || 0) - 60); toast('Грелка нагрелась. Тепло разливается по телу'); SFX.rustle(); renderInv(); updateHud(); });
defUse(it => it.id === 'umbrella', () => toast(DESC.umbrella));
COOK.push({id:'porridge', raw:'oatmeal', tool:'pot', toolName:'кастрюля', water:true}, {id:'pelmeniC', raw:'pelmeni', tool:'pot', toolName:'кастрюля', water:true});

// ---- starting season ----
const SEASONS = {autumn:{name:'Осень', off:0, info:'15 сентября. Тепло, но впереди долгая зима.'}, winter:{name:'Зима', off:91, info:'15 декабря. Мороз, снег, короткие дни. Жёсткий старт.'}, spring:{name:'Весна', off:181, info:'15 марта. Снег тает, скоро можно сажать огород.'}, summer:{name:'Лето', off:273, info:'15 июня. Жара, ягоды и долгие светлые вечера.'}};
NEWCFG.season = 'autumn';
const dayOff = () => (world && world.dayOff) || 0;
