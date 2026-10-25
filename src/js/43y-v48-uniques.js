// ================= v48: особые находки — 12 вещей с историей и маленьким свойством, коллекция во вкладке «Находки» =================
// Особая вещь — это обычная вещь (it.id прежний, всё в игре с ней работает), у которой есть it.u — своё имя, история и свойство.
const UNIQ = [
  {u:'lighter', id:'lighter', name:'Зажигалка пожарного', text:'Гравировка «Расчёт №7». Не кончается и не гаснет на ветру.', where:'Сарай во дворе', at:['shed']},
  {u:'bat', id:'bat', name:'Счастливая бита', text:'Вся в подписях детской команды. Бьёт на 20% сильнее и не ломается.', where:'Полицейский участок', at:['police']},
  {u:'watch', id:'watchQ', name:'Часы деда', text:'Механические, «Победа». Тикают громче, чем бьётся сердце. Успокаивают: стресс копится медленнее.', where:'Старый сундук или комод', at:['chest', 'dresser']},
  {u:'diary', id:'novel', name:'Дневник врача Ковалёвой', text:'Её почерк, её смены, её страх. Перечитывать можно сколько угодно — каждый раз становится легче.', where:'Аптека', at:['pharmacy']},
  {u:'radio', id:'radio', name:'Рация патруля', text:'Армейская. Не садится от слушания.', where:'Блокпост на выезде', at:['armybox']},
  {u:'bino', id:'binoculars', name:'Бинокль охотника', text:'С просветлённой оптикой. Чей-то подарок на юбилей.', where:'Брошенная машина', at:['car']},
  {u:'flask', id:'canteen', name:'Фляга ветерана', text:'Вмещает шесть глотков вместо трёх.', where:'Хозяйственный магазин', at:['hardware']},
  {u:'knife', id:'knife', name:'Нож рыбака', text:'Самодельная рукоять из бересты. Не тупится.', where:'Заправка', at:['gas']},
  {u:'map', id:'map', name:'Карта участкового', text:'Карта района с пометками от руки.', where:'Полицейский участок', at:['police']},
  {u:'cards', id:'cards', name:'Колода с пометками', text:'Кто-то записывал на картах, где прятал припасы. Посмотри — отметишь тайники на карте.', where:'Журнальный столик в чьём-то доме', at:['coffeetab', 'endtable']},
  {u:'medkit', id:'medkit', name:'Аптечка скорой', text:'Укладка фельдшера. Лечит заметно сильнее обычной.', where:'Шкафчик в ванной', at:['medcab']},
  {u:'flash', id:'flashlight', name:'Фонарь сторожа', text:'Тяжёлый, на четырёх батарейках. Светит вдвое дольше.', where:'Магазин', at:['store']},
];
function uniqOf(it) { return it && it.u && UNIQ.find(q => q.u === it.u); }
function mkUniq(q) { const it = mkItem(q.id); it.u = q.u; if (q.u === 'flask') it.w = 6; if (q.u === 'flash') it.ch = 100; if (q.u === 'radio') it.ch = 100; if (q.u === 'lighter') it.uses = 99; return it; }
function placeUniques() {
  const kindOf = f => { const H = houses[hAt[f.y * MW + f.x] - 1]; return H ? H.kind : null; };
  const fill = c => { if (!c.items) { c.items = []; const C = CONT[c.type]; if (C && C.loot) for (let n = ri(C.n[0], C.n[1]); n > 0; n--) c.items.push(mkItem(pick(C.loot))); } };
  const used = new Set();
  for (const q of UNIQ) {
    let L = [];
    for (const tag of q.at) {
      if (tag === 'car') L = L.concat(props.filter(p => p.type === 'car'));
      else L = L.concat(furns.filter(f => !f.gone && CONT[f.type] && CONT[f.type].loot && (f.type === tag || (kindOf(f) === tag && !['fridge', 'kbin', 'bin', 'pantry'].includes(f.type))) && hAt[f.y * MW + f.x] !== spawnHouse));
    }
    L = L.filter(c => !used.has(c));
    if (!L.length) L = furns.filter(f => !f.gone && CONT[f.type] && CONT[f.type].loot && hAt[f.y * MW + f.x] && hAt[f.y * MW + f.x] !== spawnHouse && !used.has(f));
    if (!L.length) continue;
    const c = pick(L); used.add(c); fill(c); c.items.push(mkUniq(q));
  }
}
{ onNewWorld((o) => { if (!(o && o.save)) placeUniques();
}); }

// ---- как выглядит: своё имя, золотая рамка, своя история в карточке ----

// ---- свойства ----
{ let g0 = null;
  onUpdate((dt, {s0}) => {
    if (mode !== 'play' || !P) return;
    const gm = g0 == null ? 0 : Math.max(0, gameMin - g0); g0 = gameMin;
    const w = P.weapon; if (w && (w.u === 'bat' || w.u === 'knife') && ITEMS[w.id].dur) w.dur = ITEMS[w.id].dur;     // не ломаются
    for (const it of P.inv) {
      if (it.u === 'flash' && it.on && it.ch > 0) it.ch = Math.min(100, it.ch + gm / 10);                              // садится вдвое медленнее
      if (it.u === 'radio') it.ch = 100;
      if (it.u === 'lighter') it.uses = 99;
    }
    if (P.cloth && P.cloth.wrist && P.cloth.wrist.u === 'watch' && s0 != null && P.stress > s0) P.stress = s0 + (P.stress - s0) * .7;   // часы деда
    // нашёл — в коллекцию (и для следующих жизней тоже)
    world.uniq = world.uniq || [];
    for (const it of P.inv.concat(P.weapon ? [P.weapon] : [], P.cloth ? Object.values(P.cloth).filter(Boolean) : [])) {
      const q = uniqOf(it); if (!q || world.uniq.includes(q.u)) continue;
      world.uniq.push(q.u); SFX.equip();
      eventBanner('Особая находка: ' + q.name, q.text + ' Находок: ' + world.uniq.length + ' из ' + UNIQ.length + '.', 'gold', 'i-star');
      logEv('Особая находка: ' + q.name);
    }
  }, dt => { const s0 = P && P.stress; return {s0}; });
}
// дневник врача: читать можно снова и снова; колода — отмечает тайники; аптечка скорой — лечит сильнее
// (бонус аптечки скорой — в useItem)
defUse(it => { const q = uniqOf(it); return q && q.u === 'diary'; }, () => { P.stress = Math.max(0, (P.stress || 0) - 25); P.bored = Math.max(0, (P.bored || 0) - 35); P.unh = Math.max(0, (P.unh || 0) - 20); SFX.rustle(); toast('Перечитал записи Ковалёвой. Кто-то держался — и я продержусь'); renderInv(); });
defUse(it => { const q = uniqOf(it); return q && q.u === 'cards'; }, () => {
      const L = furns.filter(f => !f.gone && !f.searched && ['locker', 'armybox', 'crate', 'chest', 'pantry'].includes(f.type)).sort(() => rng() - .5).slice(0, 3);
      world.marks = world.marks || []; for (const f of L) world.marks.push({x:Math.round(f.cx), y:Math.round(f.cy)});
      SFX.rustle(); toast(L.length ? 'На картах — адреса. Отметил на карте ' + L.length + ' места' : 'Все пометки на картах уже проверены');
});

// ---- вкладка «Находки» ----
function buildUniq(body) {
  body.textContent = ''; const got = world.uniq || [];
  const hd = mk('div', 'chead'); hd.appendChild(mk('b', '', 'Особые находки')); hd.appendChild(mk('span', '', got.length + ' из ' + UNIQ.length + ' · у каждой вещи своя история и маленькое свойство')); body.appendChild(hd);
  const g = mk('div', 'coll');
  for (const q of UNIQ) {
    const ok = got.includes(q.u), c = mk('div', 'ci ' + (ok ? 'got' : 'no'));
    c.appendChild(iconEl(q.id, 44)); c.appendChild(mk('b', '', ok ? q.name : '???')); c.appendChild(mk('small', '', ok ? q.text : 'Ещё не найдено'));
    if (!ok) c.appendChild(mk('span', 'where', 'Где-то: ' + q.where));
    g.appendChild(c);
  }
  body.appendChild(g);
}
{ onPanel(() => {
    if (!panel || panel.kind !== 'inv') return;
    const tabs = $('pnTabs');
    if (tabs && !tabs.querySelector('.utab')) { const b = btn('Находки', () => { panel.tab = 'uniq'; renderPanel(); }, panel.tab === 'uniq' ? 'on' : ''); b.classList.add('utab'); tabs.appendChild(b); }
    $('pnBody').classList.toggle('scrolly', panel.tab === 'uniq');
    if (panel.tab === 'uniq') { const body = $('pnBody'); body.classList.remove('fit'); buildUniq(body); for (const b of tabs.querySelectorAll('button')) b.classList.toggle('on', b.classList.contains('utab')); }
  });
}
// сохранение: коллекция — у города
{ onSave(d => { d.x48 = {uniq:world.uniq || []};
}); }
{ onLoad((d) => { world.uniq = (d && d.x48 && d.x48.uniq) || [];
}); }
{ onStartNew(() => {
}, () => { world.uniq = []; }); }
