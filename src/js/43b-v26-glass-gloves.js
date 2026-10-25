// ================= v26: gloves (hands slot), clearing glass out of a broken window, curtains only from indoors, glass shiv, water filter =================

Object.assign(ITEMS, {
  gloves:{name:'Рабочие перчатки', sh:'Перчатки', kind:'cloth', slot:'hands', ins:1, glass:1, verb:'Надеть', info:'стекло не режет руки · на руки'},
  glovesR:{name:'Перчатки из тряпок', sh:'Перчатки', kind:'cloth', slot:'hands', ins:1, glass:.7, verb:'Надеть', info:'от стекла спасают не всегда · на руки'},
  mittens:{name:'Шерстяные варежки', sh:'Варежки', kind:'cloth', slot:'hands', ins:3, glass:.85, verb:'Надеть', info:'тёплые · на руки'},
  glass:{name:'Осколки стекла', kind:'misc', info:'острые · из них делают заточку'},
  shiv:{name:'Стеклянная заточка', sh:'Заточка', kind:'weapon', dmg:22, range:.95, cd:.32, cleave:1, dur:9, verb:'Взять в руки'},
  filter:{name:'Фильтр для воды', sh:'Фильтр', kind:'misc', verb:'Процедить воду', info:'делает сырую воду питьевой без огня'},
});
Object.assign(DESC, {
  gloves:'Плотные строительные перчатки. В них можно лезть через битое окно и выбирать осколки голыми… то есть не голыми руками.',
  glovesR:'Тряпки, сшитые в подобие перчаток. Греют и спасают от большинства порезов, но рвутся.',
  mittens:'Тёплые вязаные варежки. Зимой без них пальцы деревенеют. От стекла тоже немного защищают.',
  glass:'Осколки, выбранные из рамы. Если обмотать край тряпкой, получится заточка.',
  shiv:'Осколок стекла с рукоятью из тряпки. Бьёт быстро и глубоко, но ломается после нескольких ударов.',
  filter:'Обрезанная бутылка, слои ткани и угля. Процеживает сырую воду: пить её можно сразу, без кастрюли и огня. Хватает на несколько бутылок.',
});
Object.assign(WSPEC, {shiv:{segs:[[0, 2.2, 1, '#c4ae86'], [2.2, 4.8, .9, '#bcd8e2']]}});
{ const add = (k, ...ids) => CONT[k] && CONT[k].loot.push(...ids);
  add('toolrack', 'gloves', 'gloves'); add('locker', 'gloves'); add('crate', 'gloves'); add('car', 'gloves');
  add('wardrobe', 'mittens'); add('dresser', 'mittens'); add('hanger', 'mittens'); add('armybox', 'gloves'); }

const FILTER_USES = 6;
const mkItem26 = mkItem; mkItem = function (id) { const it = mkItem26(id); if (id === 'filter') it.uses = FILTER_USES; return it; };

// ---- hands slot ----
const gloveItem = () => { const g = P && P.cloth && P.cloth.hands; return g && cdur(g) > 0 ? g : null; };
// chance that a glove saves you from a glass cut (rag gloves wear through)
const gloveGuard = () => { const g = gloveItem(); return g ? ITEMS[g.id].glass * Math.min(1, .4 + cdur(g) / 100) : 0; };
function glassCut(chance, what) {
  if (rng() >= chance) return false;
  const g = gloveItem();
  if (g && rng() < gloveGuard()) { tearCloth(g, .25); return false; }   // the glove takes the cut and wears a little
  const w = addWound('cut', 'arm'); P.hp -= 3; lastCause = 'Порезы';
  toast((what || 'Порезался о стекло') + (w ? ': ' + w.where : '') + '. Перевяжи');
  return true;
}
const insulation26 = insulation;
insulation = function () { const g = P.cloth && P.cloth.hands; return insulation26() + (g ? Math.round(clothIns(g)) : 0); };


// ---- windows ----
const winGlass = ob => ob && ob.broken && !ob.open && !ob.cleared;
// curtains belong to the room: from the street you can't reach them
const windowActions26 = windowActions;
windowActions = function (o) {
  const ob = obs[o.i], indoors = insideHouse(P.x, P.y);
  let c = windowActions26(o);
  if (!indoors) c = c.filter(a => a.kind !== 'curtain' && a.kind !== 'takecur' && a.kind !== 'hangcur');
  if (winGlass(ob) && !(ob.bhp > 0)) c.splice(1, 0, {kind:'clearglass', label:'Убрать осколки', o, tk:'cg' + o.i});
  return c;
};
// climbing through: a cleared frame doesn't cut, gloves usually save your hands
const finishVault26 = finishVault;
finishVault = function (a) {
  const ob = a.o && obs[a.o.i];
  if (a.br && ob && !ob.cleared) { a.br = false; finishVault26(a); glassCut(.3, 'Порезался о битое стекло'); return; }
  a.br = false; finishVault26(a);
};

// ---- water filter ----
defUse(it => it.id === 'filter', it => {
  const raw = P.inv.filter(i => i.id === 'waterD');
  if (!raw.length) { toast('Нечего процеживать: нужна сырая вода в бутылках'); return; }
  if (it.uses == null) it.uses = FILTER_USES;
  job(1.2 + raw.length * .5, () => {
    let n = 0; for (const w of P.inv) if (w.id === 'waterD' && it.uses > 0) { w.id = 'water'; it.uses--; n++; }
    SFX.rustle(); addXp('farm', 1);
    if (it.uses <= 0) { const j = P.inv.indexOf(it); if (j >= 0) P.inv.splice(j, 1); toast(`Процежено ${n} бут. Фильтр забился, выброшен`); }
    else toast(`Процежено ${n} бут. Фильтра хватит ещё на ${it.uses}`);
    renderInv();
  }, {an:'work'});
});

// ---- recipes ----
RECIPES.push(
  {name:'Перчатки из тряпок', icon:'glovesR', parts:() => [{id:'rag', ok:countItem('rag') >= 2, badge:'2'}, {id:'sewkit', ok:!!sewkit()}], need:'2 тряпки и набор для шитья', can:() => countItem('rag') >= 2 && !!sewkit(),
    make:() => { removeItem('rag'); removeItem('rag'); useSew(); P.inv.push(mkItem('glovesR')); addXp('tail', 1); toast('Перчатки готовы. Надень их в рюкзаке'); }},
  {name:'Стеклянная заточка', icon:'shiv', parts:() => [{id:'glass', ok:countItem('glass') >= 1}, {id:'rag', ok:countItem('rag') >= 1}], need:'осколки стекла и тряпка', can:() => countItem('glass') >= 1 && countItem('rag') >= 1,
    make:() => { removeItem('glass'); removeItem('rag'); P.inv.push(mkItem('shiv')); if (!gloveItem() && rng() < .25) glassCut(1, 'Порезался, пока обматывал осколок'); else toast('Заточка готова'); }},
  {name:'Фильтр для воды', icon:'filter', parts:() => [{id:'bottle', ok:countItem('bottle') >= 1}, {id:'rag', ok:countItem('rag') >= 2, badge:'2'}, {id:'sticks', ok:countItem('sticks') >= 1}], need:'пустая бутылка, 2 тряпки и хворост на уголь',
    can:() => countItem('bottle') >= 1 && countItem('rag') >= 2 && countItem('sticks') >= 1,
    make:() => { removeItem('bottle'); removeItem('rag'); removeItem('rag'); removeItem('sticks'); P.inv.push(mkItem('filter')); addXp('farm', 1); toast('Фильтр готов: процеживай сырую воду без огня'); }},
);
// crafting hints (v25): what the result does and where to find what is missing
Object.assign(SRC_HINT, {glass:'убери осколки из разбитого окна, лучше в перчатках', waterD:'набери в бочку дождевой воды, снега или воды из пруда'});
Object.assign(RES_INFO, {
  'Перчатки из тряпок':'Надеваются на руки. Обычно спасают от стекла, когда лезешь в окно или убираешь осколки, и чуть греют. Со временем рвутся.',
  'Стеклянная заточка':'Быстрое, но хрупкое оружие: выдерживает около девяти ударов. Без перчаток можно порезаться при сборке.',
  'Фильтр для воды':'Превращает сырую воду в питьевую без огня и кастрюли. Хватает на шесть бутылок.',
});
