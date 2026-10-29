// ================= рогатка и камни, жгут, точильный брусок, доспех из газет =================
// Рогатка — тихое оружие дальнего боя: стреляет камнями (камни набираешь на улице), сбивает с ног, почти не шумит.
//   Работает через огнестрел (shoot в 43): gun + quiet — без грохота, отдачи и ворон.
// Жгут — держит кровь пару часов, пока нет бинта; из него же делается рогатка.
// Брусок — точит лезвие: 30 ударов урон выше (sharp в dmgK). Доспех из газет — дешёвая защита от укусов (armK в 06).
Object.assign(ITEMS, {
  slingshot:{name:'Рогатка', sh:'Рогатка', kind:'weapon', gun:true, quiet:true, ammo:'stone', mag:1, dmg:16, range:6.5, cd:.5, cleave:1, dur:120, melee:6, loud:1.5, reload:.55, verb:'Взять в руки'},
  stone:{name:'Камни', sh:'Камни', kind:'ammo', uses:8, gun:'slingshot', unit:'камней', verb:'Зарядить'},
  tourniquet:{name:'Резиновый жгут', sh:'Жгут', kind:'misc', verb:'Наложить жгут'},
  whetstone:{name:'Точильный брусок', sh:'Брусок', kind:'misc', uses:8, verb:'Заточить'},
  paparmor:{name:'Доспех из газет', sh:'Газеты', kind:'armor', armK:.75, broke:'Газетный доспех размок и порвался', verb:'Надеть'},
  nailplank:{name:'Доска с гвоздями', sh:'Доска', kind:'weapon', dmg:29, range:1.2, cd:.6, cleave:1, dur:45, verb:'Взять в руки'},
});
Object.assign(DESC, {
  slingshot:'Рогатка из ветки и жгута. Почти бесшумна: камнем можно сбить мертвеца с ног или отвлечь, не поднимая весь квартал. Заряжается по одному камню.',
  stone:'Горсть гладких камней. Снаряды для рогатки — набираются на улице, в траве и у дороги.',
  tourniquet:'Резиновый жгут из аптечки. Пережимает руку или ногу — кровь останавливается на пару часов, пока не найдёшь бинт. Ещё из него выходит отличная рогатка.',
  whetstone:'Брусок для заточки. Заточенное лезвие режет заметно лучше, пока не затупится — примерно 30 ударов. Подходит ножу, мачете, тесаку, топорам, заточке и копью.',
  paparmor:'Газеты, примотанные изолентой к груди и рукам. Зубы вязнут в бумаге: укус слабее. Долго не прослужит.',
  nailplank:'Доска, в которую вбиты гвозди остриём наружу. Сделать — минута, бьёт больно, но быстро разваливается.',
});
Object.assign(KG, {slingshot:.3, stone:.15, tourniquet:.1, whetstone:.4, paparmor:1.2, nailplank:1.4});
Object.assign(WSPEC, {nailplank:{segs:[[0, 3, .9, '#8c643e'], [3, 9.5, 1.5, '#b08452']], head:{at:8.2, w:.6, len:1.6, col:'#c8ccd2'}}, slingshot:{segs:[[0, 3.2, 1.3, '#8a5a32'], [3.2, 5.6, .8, '#8a5a32']], head:{at:5.6, w:.9, len:1.8, col:'#8a5a32'}}});
{ const add = (k, ...ids) => { if (CONT[k] && CONT[k].loot) CONT[k].loot.push(...ids); };
  add('medshelf', 'tourniquet', 'tourniquet'); add('medcab', 'tourniquet'); add('armybox', 'tourniquet'); add('car', 'tourniquet');
  add('toolrack', 'whetstone', 'whetstone'); add('crate', 'whetstone'); add('kbin', 'whetstone');
  add('dresser', 'slingshot'); add('chest', 'slingshot'); add('boxes', 'stone');
}
WSTYLE.nailplank = 'bash';
const BLADES = new Set(['knife', 'machete', 'cleaver', 'axe', 'hatchet', 'shiv', 'spear']);

// ---- рецепты ----
RECIPES.push(
  {name:'Рогатка', icon:'slingshot', parts:() => [{id:'sticks', ok:countItem('sticks') >= 1}, {id:'tourniquet', ok:countItem('tourniquet') >= 1}, {id:'knife', ok:!!cutTool()}],
    need:'хворост, резиновый жгут и что-нибудь режущее · тихое оружие для камней', can:() => countItem('sticks') >= 1 && countItem('tourniquet') >= 1 && !!cutTool(),
    make:() => { removeItem('sticks'); removeItem('tourniquet'); P.inv.push(mkItem('slingshot')); toast('Рогатка готова. Камни набирают на улице'); }},
  {name:'Доспех из газет', icon:'paparmor', parts:() => [{id:'newspaper', ok:countItem('newspaper') >= 3, badge:'3'}, {id:'tape', ok:P.inv.some(i => i.id === 'tape' && i.uses > 0)}],
    need:'3 газеты и изолента · укусы слабее, пока не размокнет', can:() => countItem('newspaper') >= 3 && P.inv.some(i => i.id === 'tape' && i.uses > 0),
    make:() => { for (let k = 0; k < 3; k++) removeItem('newspaper'); const t = P.inv.find(i => i.id === 'tape' && i.uses > 0); t.uses--; if (t.uses <= 0) P.inv.splice(P.inv.indexOf(t), 1);
      const a = mkItem('paparmor'); a.dur = 45; P.inv.push(a); toast('Доспех из газет готов. Надень его'); }},
  {name:'Доска с гвоздями', icon:'nailplank', parts:() => [{id:'plank', ok:countItem('plank') >= 1}, {id:'nails', ok:countItem('nails') >= 1}, {id:'hammer', ok:hasTool('hammer')}],
    need:'доска, гвозди и молоток · быстрое, но непрочное оружие', can:() => countItem('plank') >= 1 && countItem('nails') >= 1 && hasTool('hammer'),
    make:() => { removeItem('plank'); removeItem('nails'); P.inv.push(mkItem('nailplank')); SFX.hammer && SFX.hammer(); toast('Доска с гвоздями готова'); }},
);

// ---- камни: набрать на улице (если есть рогатка) ----
addActions(out => {
  if (P.car || insideHouse(P.x, P.y) || !P.inv.concat(P.weapon || []).some(i => i.id === 'slingshot')) return;
  const t = get(Math.floor(P.x), Math.floor(P.y)); if (t !== GRASS && t !== ROAD && t !== WALK) return;
  if (countItem('stone') >= 4) return;
  out.push({kind:'stones', label:'Набрать камней'});
});
defAction('stones', {name:() => 'Для рогатки', icon:() => 'i-search', run:() => {
  if (mode !== 'play' || paused || panel || P.sleep) return; $('actMenu').hidden = true;
  job(4, () => { const s = mkItem('stone'); s.uses = ri(5, 8); P.inv.push(s); P.dirt = Math.min(100, (P.dirt || 0) + 3); toast('Набрал камней: ' + s.uses); renderInv(); }, {an:'searchlow'});
}});

// ---- применение: жгут и брусок ----
defUse(it => it.id === 'tourniquet', (it, k) => {
  const W = wounds().filter(bleeding);
  if (!W.length) { toast('Кровь не идёт из раны — жгут не нужен'); return; }
  for (const w of W) w.tq = gameMin + 120;
  P.inv.splice(k, 1); P.pain = Math.min(100, (P.pain || 0) + 10);
  SFX.rustle(); toast('Жгут наложен: кровь остановлена на два часа. Перевяжи раны'); renderInv(); updateHud();
});
defUse(it => it.id === 'whetstone', it => {
  const w = P.weapon;
  if (!w || !BLADES.has(w.id)) { toast('Возьми в руки нож, топор или мачете'); return; }
  job(5, () => { w.sharp = 30; it.uses = (it.uses || 1) - 1; if (it.uses <= 0) { const j = P.inv.indexOf(it); if (j >= 0) P.inv.splice(j, 1); toast('Брусок стёрся'); }
    toast(ITEMS[w.id].sh + ': заточено, режет лучше'); renderInv(); }, {an:'work'});
});
// заточка тупится с каждым ударом
{ let sw0 = 0;
  onUpdate(() => { if (!P) return; if ((P.swing || 0) > sw0 + .01 && P.weapon && P.weapon.sharp > 0) P.weapon.sharp--; sw0 = P.swing || 0; });
}
