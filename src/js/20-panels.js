// ================= panels: inventory, container, cooking =================
let panel = null;
const CATS = ['Еда', 'Питьё', 'Медицина', 'Оружие', 'Одежда', 'Снаряжение', 'Книги', 'Материалы'];
function catOf(id) {
  const d = ITEMS[id]; if (!d) return 'Материалы';
  if (d.kind === 'ammo') return 'Оружие';
  if (id === 'splint') return 'Медицина';
  if (id === 'sewkit' || id === 'lure') return 'Снаряжение';
  if (d.kind === 'weapon') return 'Оружие';
  if (d.kind === 'food' || d.raw) return 'Еда';
  if (d.kind === 'drink') return 'Питьё';
  if (d.kind === 'heal') return 'Медицина';
  if (d.kind === 'canteen') return 'Питьё';
  if (d.kind === 'book' || d.kind === 'fun') return 'Книги';
  if (d.kind === 'smoke') return 'Медицина';
  if (d.kind === 'cloth') return 'Одежда';
  if (['light', 'battery', 'bag', 'map', 'radio', 'burner', 'sleepbag', 'tape', 'armor', 'generator', 'fuel', 'seeds'].includes(d.kind) || ['pot', 'opener', 'matches', 'lighter', 'alarm', 'molotov', 'flare'].includes(id) || d.kind === 'bino' || d.kind === 'trap') return 'Снаряжение';
  return 'Материалы';
}
const COOK = [
  {id:'steak', raw:'meat', tool:'pan', toolName:'сковорода', water:false},
  {id:'pastaC', raw:'pasta', tool:'pot', toolName:'кастрюля', water:true},
  {id:'riceC', raw:'rice', tool:'pot', toolName:'кастрюля', water:true},
];
let sndOpened = null;                                                       // [мебель, время] последнего звука открывания — чтобы не открыть дважды
let markPick = null;                                                        // всплывающий выбор метки на карте
// открыть окно (рюкзак, обыск, готовка, карта…); при обыске — звук открывания ящика
function openPanel(kind, opt) {
  const was = panel && panel.kind === 'loot' ? panel.src : null;
  if (mode === 'play' && !P.sleep && !(P.car && kind !== 'inv' && kind !== 'map' && kind !== 'radio')) {
    const tab = kind === 'inv' ? (panel && panel.kind === 'inv' ? panel.tab : 'items') : null;
    panel = Object.assign({kind, tab}, opt || {});
    paused = true; P.act = null; atkHeld = false; joy.id = null; joy.x = joy.y = 0; $('stick').hidden = true;
    $('panel').hidden = false; $('panel').classList.toggle('live', kind === 'loot');
    if (kind === 'loot') paused = false;
    renderPanel();
  }
  if (panel && kind === 'inv') panel.sub = (opt && opt.sub) || 'body';
  const src = panel && panel.kind === 'loot' && panel.src;
  if (src && src !== was && src.type && src.type !== 'pile' && !(sndOpened && sndOpened[0] === src && performance.now() - sndOpened[1] < 4000)) SFX.contOpen(src.type);
}
function closePanel() {
  if (markPick) { markPick.remove(); markPick = null; }                     // выбор метки на карте
  const src = panel && panel.kind === 'loot' && panel.src;
  if (panel) { panel = null; $('panel').hidden = true; if ($('pause').hidden) paused = false; }
  if (src && src.type && src.type !== 'pile') SFX.contClose(src.type);
}
function renderInv() { if (panel) renderPanel(); }
function toggleInv(force) { if (force === false) closePanel(); else if (panel && panel.kind === 'inv') closePanel(); else openPanel('inv'); }
// одинаковые вещи — в одну ячейку (с зарядом/прочностью — каждая своя; в рюкзаке и в карманах — отдельно; находки — отдельно)
function groupItems(list) {
  const inv = list === P.inv;
  if (!inv) for (const it of list) if (it && it.bp != null && !P.inv.includes(it)) delete it.bp;   // вещь вне инвентаря забывает карман/рюкзак
  const groups = [];
  list.forEach((it, k) => {
    const d = ITEMS[it.id];
    const key = ((d.kind === 'weapon' || d.kind === 'light' || d.uses) ? 'u' + k : it.id + (isRotten(it) ? '!' : '')) + (inv && it.bp ? '@b' : '') + (it.u ? '#' + it.u : '');
    let g = groups.find(g => g.key === key);
    if (!g) groups.push(g = {key, idx:k, n:0, it});
    g.n++;
  });
  return groups;
}
function itemRow_unused(it, n, buttons, eq) {
  const d = ITEMS[it.id], r = mk('div', 'row' + (eq ? ' eq' : ''));
  const nm = mk('div', 'nm'); nm.appendChild(document.createTextNode(d.name + (n > 1 ? ' ×' + n : '')));
  const sm = mk('small'); sm.innerHTML = (eq ? 'В руках · ' : '') + itemInfo(it); nm.appendChild(sm);
  const a = mk('div', 'acts'); for (const b of buttons) a.appendChild(b);
  r.appendChild(nm); r.appendChild(a); return r;
}
function takeOne(c, k) {
  if (invFull()) { toast('Слишком тяжело — не унести'); return; }
  const it = c.items.splice(k, 1)[0]; if (!it) return; SFX.rustle();
  if (ITEMS[it.id].rot && it.rot == null) it.rot = powerOn() ? gameMin + 2160 : powerOffAt + 900;
  if (ITEMS[it.id].kind === 'weapon' && !P.weapon) P.weapon = it; else P.inv.push(it);
  renderPanel(); updateHud();
}
function takeAll(c) { while (c.items.length && !invFull()) takeOne(c, 0); if (c.items.length) toast('Слишком тяжело — не унести'); renderPanel(); }
function putOne(c, k) { if (c.items.length >= capOf(c)) { toast('Сюда больше не влезет: ' + capOf(c) + ' мест'); return; } const it = P.inv.splice(k, 1)[0]; if (it) c.items.push(it); renderPanel(); }
function heatOk(src) { return src.type === 'fire' ? src.t > 0 && !src.out : src.type === 'burner' ? src.it.uses > 0 && P.inv.includes(src.it) : poweredAt(src.cx, src.cy); }
function waterOk() { return nearTap() || countItem('water') > 0; }
function startCook(rc, n, src) {
  closePanel();
  P.act = {kind:'cook', t:0, dur:2 + n * .7, src, rc, n}; SFX.sizzle();
}
function cookRecipe(rc, n, src) {
  if (!heatOk(src)) { toast(src.type === 'fire' ? 'Костёр погас' : src.type === 'burner' ? 'Нет горелки или газа' : 'Электричества нет'); return; }
  if (src.type === 'burner') { src.it.uses--; if (src.it.uses <= 0) { P.inv.splice(P.inv.indexOf(src.it), 1); toast('Газ в горелке кончился'); } }
  if (!hasTool(rc.tool)) { toast('Нужна ' + rc.toolName); return; }
  if (rc.water && !nearTap() && !rc.boil) { const w = P.inv.find(i => i.id === 'water'); if (!w) { toast('Нужна вода'); return; } w.id = 'bottle'; }
  let done = 0;
  const q = 1 + .1 * skillLv('cook');
  for (const it of P.inv) { if (done >= n) break; if (it.id !== rc.raw) continue; it.id = rc.id; it.q = q; if (ITEMS[rc.id].rot) it.rot = gameMin + 1440; else delete it.rot; done++; }
  if (done) addXp('cook', done);
  noise(P.x, P.y, 3);
  if (done) toast(rc.boil ? 'Вода вскипела и остыла: ' + done + ' бут.' : 'Готово: ' + ITEMS[rc.id].name + (done > 1 ? ' ×' + done : ''));
}
function moodleList() {
  const m = [];
  if (P.bleed) m.push('Кровотечение: перевяжи рану бинтом');
  if (P.inf) m.push(P.infT > 360 ? 'Жар: укус убивает' : 'Укус: заражение уже внутри');
  if (P.pois > 0) m.push('Отравление: пройдёт само');
  if (P.sat < 30) m.push('Голод: поешь');
  if (P.hyd < 30) m.push('Жажда: попей');
  if (P.en < 30) m.push('Усталость: поспи в кровати');
  if (P.hp < 30) m.push('Тяжёлые раны: отдохни сытым и напоенным');
  if (P.cold > 55) m.push('Холод: оденься теплее, зайди в дом или погрейся у костра');
  if (P.wet > 40) m.push('Промок: обсохни в доме или у огня');
  m.push(...moodText());
  const W = wounds();
  if (W.some(w => w.k === 'frac' && !w.spl)) m.push('Перелом: наложи шину (доска + бинт или тряпка)');
  if (W.some(w => w.sep > 50)) m.push('Воспаление: антисептик, антибиотики или аптечка');
  if (W.some(dirtyBand)) m.push('Грязная повязка: смени бинт');
  if ((P.pain || 0) > 35) m.push('Боль: обезболивающее притупит её');
  if ((P.unh || 0) > 50) m.push('Уныние: книги, музыка, горячая еда и сладкое');
  if ((P.panic || 0) > 30) m.push('Паника: отойди от мертвецов, иначе будешь промахиваться');
  return m.length ? m : ['Всё в порядке'];
}
// ---- item cells ----
function iconEl(id, size) {
  const e = mk('span', 'ico'), ic = ART.meta && ART.meta.icons && (ART.meta.icons[id] || ART.meta.icons[ICONA[id]]);
  size = size || 44;
  if (ic && ART_EMBED) {
    const k = size / ic[2], sh = ART.imgs.icons;
    e.style.cssText = `width:${size}px;height:${size}px;background-image:var(--icons);background-size:${sh.width * k}px ${sh.height * k}px;background-position:-${ic[0] * k}px -${ic[1] * k}px`;
  } else { e.textContent = (ITEMS[id] ? ITEMS[id].name : id).slice(0, 2); e.style.width = e.style.height = size + 'px'; }
  return e;
}
function cell(it, n, onTap, opt) {
  opt = opt || {};
  const c = mk('button', 'cell' + (opt.sel ? ' sel' : '') + (it && isRotten(it) ? ' rot' : '') + (opt.cls ? ' ' + opt.cls : ''));
  c.type = 'button';
  if (!it) { c.disabled = true; c.classList.add('void'); if (opt.label) c.appendChild(mk('span', 'lab', opt.label)); return c; }
  const d = ITEMS[it.id] || {name:{campfire:'Костёр', barrel:'Бочка', seeds:'Грядка'}[it.id] || it.id};
  c.setAttribute('aria-label', d.name + (n > 1 ? ' ×' + n : ''));
  c.title = d.name;
  c.appendChild(iconEl(it.id, opt.size || 36));
  if (n > 1) c.appendChild(mk('span', 'cnt', '×' + n));
  let frac = null;
  if (d.kind === 'weapon') frac = it.dur / d.dur;
  else if (d.kind === 'light' || d.kind === 'radio') frac = (it.ch || 0) / 100;
  else if (d.kind === 'canteen') frac = (it.w || 0) / wcap(it);
  else if (d.kind === 'armor') frac = Math.max(0, it.dur) / 60;
  else if (d.kind === 'fuel') frac = (it.fuel || 0) / 100;
  else if (d.uses) frac = it.uses / d.uses;
  if (frac != null) { const b = mk('span', 'bar'), f = mk('i'); f.style.width = Math.max(4, Math.round(frac * 100)) + '%'; if (frac < .3) f.className = 'lo'; b.appendChild(f); c.appendChild(b); }
  if (opt.badge) c.appendChild(mk('span', 'badge', opt.badge));
  if (!opt.size && ITEMS[it.id]) { c.classList.add('lbl'); c.appendChild(mk('span', 'nmL', d.sh || d.name)); }
  if (onTap) c.addEventListener('click', () => { SFX.ui(); onTap(); });
  if (d.kind === 'cloth' && it.cd != null && it.cd < 100 && !c.querySelector('.bar')) { const b = mk('span', 'bar'), f = mk('i'); f.style.width = Math.max(4, Math.round(it.cd)) + '%'; if (it.cd < 30) f.className = 'lo'; b.appendChild(f); c.appendChild(b); }   // целость одежды
  if (d.kind === 'weapon' && d.gun) c.appendChild(mk('span', 'cnt', (it.mag || 0) + '/' + d.mag));                  // патроны в магазине
  const q = uniqOf(it);                                                                                              // уникальная вещь — своё имя
  if (q) { c.classList.add('uniq'); c.title = q.name; c.setAttribute('aria-label', q.name); const l = c.querySelector('.nmL'); if (l) l.textContent = q.name.split(' ')[0]; }
  return c;
}
function gridOf(groups, onTap, slots, selKey) {
  const g = mk('div', 'grid');
  for (const gr of groups) g.appendChild(cell(gr.it, gr.n, () => onTap(gr), {sel:selKey === gr.key}));
  const used = groups.reduce((a, b) => a + b.n, 0);
  for (let k = groups.length; k < Math.max(groups.length, Math.min(slots, groups.length + Math.max(0, slots - used))); k++) g.appendChild(cell(null));
  return g;
}
function detailCard(it, n, buttons, eq) {
  const d = ITEMS[it.id], r = mk('div', 'detail');
  r.appendChild(iconEl(it.id, 64));
  const t = mk('div', 'nm'); t.appendChild(mk('span', 'cat', catOf(it.id))); t.appendChild(mk('b', '', d.name + (n > 1 ? ' ×' + n : '')));
  const sm = mk('small'); sm.innerHTML = (eq ? 'В руках · ' : '') + itemInfo(it); t.appendChild(sm);
  r.appendChild(t);
  if (DESC[it.id]) r.appendChild(mk('p', 'desc', DESC[it.id]));
  const a = mk('div', 'acts'); for (const b of buttons) a.appendChild(b); r.appendChild(a);
  return r;
}
function recipeCard(title, parts, result, buttons, note) {
  const r = mk('div', 'recipe rc4'); r.dataset.result = result; r.dataset.parts = parts.map(p => (p.ok ? '+' : '-') + (p.id || '')).join(',');
  const out = mk('div', 'rout'); out.appendChild(iconEl(result, 36)); r.appendChild(out);
  const mid = mk('div', 'rmid'); mid.appendChild(mk('b', '', title));
  const chips = mk('div', 'chips');
  for (const p of parts) {
    const ch = mk('span', 'chip ' + (p.ok ? 'ok' : 'no'));
    if (p.id && (ITEMS[p.id] || PNAMES[p.id])) ch.appendChild(iconEl(p.id, 18));
    const nm = p.id && ITEMS[p.id] ? (ITEMS[p.id].sh || ITEMS[p.id].name) : (PNAMES[p.id] || p.label || p.id || '');
    const bd = p.badge && !String(p.badge).startsWith('×') ? (String(p.badge).includes('%') ? ' ' + p.badge : ' ×' + p.badge) : '';
    ch.appendChild(mk('span', '', (p.ok ? '✓ ' : '') + nm + bd)); chips.appendChild(ch);
  }
  mid.appendChild(chips);
  if (note) { const s = mk('small', 'rnote'); s.innerHTML = note; r.title = s.textContent; mid.appendChild(s); }
  r.appendChild(mid);
  const a = mk('div', 'acts'); for (const b of buttons) { if (b.disabled && /Создать|Приготовить/.test(b.textContent)) b.textContent = 'Не хватает'; a.appendChild(b); } r.appendChild(a);
  return r;
}
function renderPanel() { runHooked('panel', renderPanelCore); }
function renderPanelCore() {
  if (!panel) return;
  const body = $('pnBody'), tabs = $('pnTabs'); body.textContent = ''; tabs.textContent = '';
  const sec = t => body.appendChild(mk('div', 'sect', t));
  const empty = t => body.appendChild(mk('p', 'empty', t));
  if (panel.kind === 'inv') {
    $('pnTitle').textContent = 'Рюкзак'; $('pnSub').textContent = invCapTxt();
    for (const [k, label] of [['items', 'Вещи'], ['craft', 'Создать'], ['self', 'Состояние']]) tabs.appendChild(btn(label, () => { panel.tab = k; renderPanel(); }, panel.tab === k ? 'on' : ''));
    if (panel.tab === 'items') {                                                   // кукла, карманы и рюкзак, карточка вещи
      const groups = groupItems(P.inv);
      if (panel.sel && panel.sel !== 'hand' && panel.sel !== 'armor' && !panel.sel.startsWith('cl_') && !(panel.sel === 'bagslot' && P.bag) && !groups.find(g => g.key === panel.sel)) panel.sel = null;
      buildInvDoll(body);
    } else if (panel.tab === 'craft') {
      RECIPES.forEach(rc => {
        const b = btn('Создать', () => { if (rc.can()) { const ok = rc.make(); if (ok !== false) { SFX.craft(); addXp('carp', rc.xp != null ? rc.xp : 2); } renderPanel(); } }); b.disabled = !rc.can();
        body.appendChild(recipeCard(rc.name, rc.parts(), rc.icon, [b], rc.need));
      });
      empty('Еду готовят у плиты или костра: подойди и нажми «Готовить».');
    } else {
      const dl = mk('dl', 'kv');
      const add = (k, v) => { dl.appendChild(mk('dt', '', k)); dl.appendChild(mk('dd', '', v)); };
      add('Здоровье', Math.round(P.hp) + '%'); add('Сытость', Math.round(P.sat) + '%'); add('Вода', Math.round(P.hyd) + '%'); add('Бодрость', Math.round(P.en) + '%');
      add('Прожито', fmtDur(gameMin - startMin)); add('Убито', String(kills)); add('Сложность', DIFF[world.diff].name);
      add('Дата', dateStr(gameMin) + ' · ' + seasonName());
      add('Температура', Math.round(airTemp(P.x, P.y)) + '°C' + (P.cold > 30 ? ' · тебе холодно' : '')); add('Одежда', wornNames()); add('Намокание', Math.round(P.wet || 0) + '%'); add('Стресс', Math.round(P.stress || 0) + '%'); add('Скука', Math.round(P.bored || 0) + '%');
      add('Электричество', powerOn() ? 'есть' : gens.some(g => g.on) ? 'от генератора' : 'отключено'); add('Водопровод', waterOn() ? 'работает' : 'отключён');
      body.appendChild(dl); sec('Навыки');
      const sk = mk('div', 'skills');
      for (const k in SKILLS) {
        const lv = skillLv(k), xp = (P.skills && P.skills[k]) || 0, lo = XPL[lv], hi = XPL[Math.min(5, lv + 1)];
        const r = mk('div', 'skill'); r.appendChild(mk('b', '', SKILLS[k].name)); r.appendChild(mk('span', 'lv', lv + '/5' + (P.boost && P.boost[k] && lv <= P.boost[k].max ? ' · ×3' : '')));
        const bar = mk('i'), fill = mk('u'); fill.style.width = (lv >= 5 ? 100 : Math.round((xp - lo) / (hi - lo) * 100)) + '%'; bar.appendChild(fill); r.appendChild(bar);
        r.appendChild(mk('small', '', SKILLS[k].per)); sk.appendChild(r);
      }
      body.appendChild(sk); sec('Самочувствие');
      for (const t of moodleList()) body.appendChild(mk('p', 'empty', t));
    }
  } else if (panel.kind === 'loot') {
    const c = panel.src;
    $('pnTitle').textContent = (CONT[c.type] && CONT[c.type].name) || PROPN[c.type] || 'Вещи';
    $('pnSub').textContent = xferQ.length ? 'переношу… в очереди ' + xferQ.length + ' · тап по вещи отменит' : 'тап: подробнее · двойной тап: перенести';
    const lay = mk('div', 'lay3'), A = mk('div', 'pcol'), B = mk('div', 'pcol'), Dd = mk('div', 'pdet');
    const gA = groupItems(c.items), gB = groupItems(P.inv);
    const hA = mk('div', 'secrow'), tA = mk('div', 'sect', 'Здесь'); tA.appendChild(mk('small', '', c.items.length + '/' + capOf(c))); hA.appendChild(tA);
    if (c.items.length) { const bx = mk('div', 'row-btns'); bx.appendChild(btn('Взять всё', () => queueXfer(c, c.items.slice(), 'take'))); hA.appendChild(bx); }
    A.appendChild(hA);
    A.appendChild(markQueued(gridOf(gA, g => lootTap(c, 'c', g), Math.max(capOf(c), 1), (panel.sel || '').startsWith('c:') ? panel.sel.slice(2) : null), gA, c));
    const hB = mk('div', 'secrow'), tB = mk('div', 'sect', 'Рюкзак'); tB.appendChild(mk('small', '', invCapTxt())); hB.appendChild(tB);
    B.appendChild(hB);
    B.appendChild(markQueued(gridOf(gB, g => lootTap(c, 'b', g), gB.length + 2, (panel.sel || '').startsWith('b:') ? panel.sel.slice(2) : null), gB, P));
    const side = (panel.sel || '').slice(0, 1), key = (panel.sel || '').slice(2);
    const gr = side === 'c' ? gA.find(g => g.key === key) : side === 'b' ? gB.find(g => g.key === key) : null;
    if (panel.sel && !gr) panel.sel = null;
    if (gr) {
      const d = ITEMS[gr.it.id] || {}, bs = [], same = (side === 'c' ? c.items : P.inv).filter(i => sameStack(i, gr.it));
      if (side === 'c') {
        bs.push(btn('Взять · ' + xferDur(gr.it).toFixed(1) + ' с', () => queueXfer(c, [gr.it], 'take')));
        if (gr.n > 1) bs.push(btn('Взять все ×' + gr.n, () => queueXfer(c, same, 'take'), 'ghost'));
        if (useKind(gr.it) && d.verb) bs.push(btn(d.verb, () => useFromCont(c, gr.it), 'ghost'));
      } else {
        bs.push(btn('Положить сюда', () => queueXfer(c, [gr.it], 'put')));
        if (gr.n > 1) bs.push(btn('Положить все ×' + gr.n, () => queueXfer(c, same, 'put'), 'ghost'));
        if (d.verb) bs.push(btn(d.verb, () => { const k = P.inv.indexOf(gr.it); if (k >= 0) { panel.reopen = c; beginUse(k); } }, 'ghost'));
      }
      const dc = detailCard(gr.it, gr.n, bs); dc.replaceChild(iconEl(gr.it.id, 40), dc.firstChild); Dd.appendChild(dc);
    } else Dd.appendChild(pickHint(c.items.length ? 'Тапни вещь, чтобы увидеть, что с ней можно сделать. Двойной тап сразу переносит её' : 'Здесь пусто. Можно сложить сюда лишнее из рюкзака'));
    lay.appendChild(A); lay.appendChild(B); lay.appendChild(Dd); body.appendChild(lay);
    body.classList.add('fit');
  } else if (panel.kind === 'note') {
    $('pnTitle').textContent = 'Записка'; $('pnSub').textContent = 'написано от руки, торопливо';
    const c = mk('div', 'news'); c.appendChild(mk('p', '', panel.it.text || NOTES[0])); body.appendChild(c);
  } else if (panel.kind === 'radio') {
    const it = panel.it;
    $('pnTitle').textContent = panel.tv ? 'Телевизор' : 'Радиоприёмник'; $('pnSub').textContent = panel.tv ? 'экстренный выпуск' : `день ${Math.floor(gameMin / 1440) + 1} · заряд ${Math.round(it.ch)}%`;
    for (const [who, text] of panel.news) { const c = mk('div', 'news'); c.appendChild(mk('span', 'freq', who)); c.appendChild(mk('p', '', text)); body.appendChild(c); }
    if (!panel.tv) { const r = mk('div', 'secrow'); r.appendChild(mk('span', 'empty', 'Каждое прослушивание тратит 10% заряда'));
    const b = btn('Поймать ещё', () => listenRadio(it)); b.disabled = !(it.ch > 0); r.appendChild(b); body.appendChild(r); }
  } else if (panel.kind === 'map') {
    $('pnTitle').textContent = 'Карта'; $('pnSub').textContent = P.mapRead ? 'район изучен по бумажной карте' : 'отмечено только то, что ты видел своими глазами';
    const zr = mk('div', 'secrow'), zs2 = mk('div', 'seg mapz');
    for (const [z, t] of [[1, 'Весь город'], [2, '×2'], [3, '×3']]) zs2.appendChild(btn(t, () => { world.mapZ = z; renderPanel(); }, (world.mapZ || 2) === z ? 'on' : ''));
    zr.appendChild(zs2); zr.appendChild(mk('span', 'empty', 'Тап по карте: поставить значок — обыскано, опасно, вода, база…')); body.appendChild(zr);
    const mw = mk('div', 'mapwrap'), c = mk('canvas', 'mapc'); mw.appendChild(c); body.appendChild(mw);
    const lg = mk('div', 'legend');
    for (const [col, t] of [['#e8473a', 'ты'], ['#ff9a3c', 'костёр'], ['#5aa8e0', 'бочка'], ['#f2ead8', 'вещи'], ['#e7c531', 'ограждение'], ['#c4312a', 'блокпост'], ['#e3c13a', 'генератор'], ['#7bc46a', 'грядка'], ['#7fd0ff', 'метки'], ['#3f8a4a', 'обысканный дом'], ['#6fdc5f', 'эвакуация'], ['#c9a46a', 'ящики'], ['#ff7ab0', 'приманки']]) { const e = mk('span'); const dt = mk('i'); dt.style.background = col; e.appendChild(dt); e.appendChild(document.createTextNode(t)); lg.appendChild(e); }
    body.appendChild(lg);
    if (!P.mapRead) body.appendChild(mk('p', 'empty', 'Найди бумажную карту района в машинах или шкафах, чтобы увидеть весь город.'));
    requestAnimationFrame(() => drawMapCanvas(c));
    c.addEventListener('click', e => mapPin(e, c));
  } else if (panel.kind === 'cook') {
    const src = panel.src, fire = src.type === 'fire', brn = src.type === 'burner';
    $('pnTitle').textContent = fire ? 'Костёр' : brn ? 'Газовая горелка' : 'Плита';
    $('pnSub').textContent = fire ? (src.t > 0 ? `горит ещё ~${Math.round(src.t)} мин` : 'погас') : brn ? `газа на ${src.it.uses} готовок` : (poweredAt(src.cx, src.cy) ? (powerOn() ? 'электричество есть' : 'работает от генератора') : 'нет электричества');
    for (const rc of COOK) {
      const n = countItem(rc.raw), tool = hasTool(rc.tool), water = !rc.water || waterOk(), heat = heatOk(src);
      const parts = [{id:rc.raw, ok:n > 0, badge:'×' + n}, {id:rc.tool, ok:tool}];
      if (rc.water) parts.push({id:'water', ok:water, label:'вода'});
      parts.push({id:fire ? 'campfire' : brn ? 'burner' : null, label:'Электричество', ok:heat});
      const ok = n > 0 && tool && water && heat;
      const miss = [n > 0 ? '' : 'нет: ' + ITEMS[rc.raw].name.toLowerCase(), tool ? '' : 'нужна ' + rc.toolName, water ? '' : 'нужна вода', heat ? '' : (fire ? 'огонь погас' : brn ? 'нет газа' : 'нет электричества')].filter(Boolean);
      const b1 = btn('Приготовить', () => startCook(rc, 1, src)); b1.disabled = !ok;
      const bs = [b1];
      if (n > 1) { const b2 = btn('Всё ×' + n, () => startCook(rc, n, src), 'ghost'); b2.disabled = !ok; bs.push(b2); }
      body.appendChild(recipeCard(ITEMS[rc.id].name, parts, rc.id, bs, miss.length ? `<span class="no">${miss.join(' · ')}</span>` : '<span class="ok">всё готово</span>'));
    }
    if (fire) {
      const b = btn('Подкинуть', () => { removeItem('plank'); src.t = Math.max(src.t, 0) + 150; src.out = false; emit('wood', src.x, src.y, .6, 4, null, 0, 1); SFX.fireUp(); renderPanel(); });
      b.disabled = !countItem('plank');
      body.appendChild(recipeCard('Подкинуть доску', [{id:'plank', ok:countItem('plank') > 0, badge:'×' + countItem('plank')}], 'campfire', [b], '+150 минут горения'));
    }
  }
}
