// ================= watches & clock, windows (open / vault / curtains), paper-doll backpack, alarm =================
Object.assign(ITEMS, {
  watchQ:{name:'Кварцевые часы', sh:'Часы', kind:'cloth', slot:'wrist', ins:0, verb:'Надеть', info:'показывают время · на запястье'},
  watchD:{name:'Электронные часы', sh:'Эл. часы', kind:'cloth', slot:'wrist', ins:0, verb:'Надеть', info:'время, дата, температура, будильник · на запястье'},
  curtain:{name:'Шторы', kind:'misc', info:'повесь на окно без занавесок'},
});
Object.assign(DESC, {
  watchQ:'Простые кварцевые часы на кожаном ремешке. Надень, и в углу экрана появится точное время.',
  watchD:'Электронные часы с подсветкой: время, дата, температура на улице и будильник, который поднимет тебя со сна.',
  curtain:'Плотные шторы. Повесь на окно без занавесок: задёрнутые шторы скрывают тебя от мертвецов снаружи.',
});
{ const add = (k, ...ids) => CONT[k] && CONT[k].loot.push(...ids);
  add('nightstand', 'watchQ', 'watchQ', 'watchD'); add('dresser', 'watchQ', 'watchD', 'curtain'); add('car', 'watchQ'); add('locker', 'watchD', 'watchD'); add('desk', 'watchQ'); add('counter', 'watchD'); add('crate', 'curtain'); add('wardrobe', 'curtain', 'watchQ'); }
RECIPES.push({name:'Шторы из тряпок', icon:'curtain', parts:() => [{id:'rag', ok:countItem('rag') >= 3, badge:'3'}], need:'3 тряпки', can:() => countItem('rag') >= 3, make:() => { for (let k = 0; k < 3; k++) removeItem('rag'); P.inv.push(mkItem('curtain')); toast('Шторы готовы. Повесь на окно'); }});
const wristId = () => P && P.cloth && P.cloth.wrist ? P.cloth.wrist.id : null;
function partOfDay() { const h = hourOf(); return h < 5 ? 'Глубокая ночь' : h < 8 ? 'Рассвет' : h < 12 ? 'Утро' : h < 17 ? 'День' : h < 20 ? 'Вечер' : h < 22 ? 'Сумерки' : 'Ночь'; }
function clockHud() {
  const w = wristId(), dig = w === 'watchD';
  $('time').hidden = !w; $('day').hidden = !dig; $('temp').hidden = !dig; $('pod').hidden = !!w;
  if (!w) $('pod').textContent = partOfDay();
  $('day').textContent = 'День ' + (Math.floor(gameMin / 1440) + 1) + ' · ' + dateStr(gameMin, true);
}
// ---- windows ----
// действия у окна: доска, перелезть, открыть/закрыть, осколки; шторы — только изнутри дома
function windowActions(o) {
  const ob = obs[o.i], c = [];
  if (ob.bhp > 0) c.push({kind:'unbar', label:'Оторвать доску', o});
  else {
    if (ob.open || ob.broken) c.push({kind:'vault', label:'Перелезть', o});
    if (!ob.broken) c.push({kind:'window', label:ob.open ? 'Закрыть окно' : 'Открыть окно', o, tk:ob.open ? 'wc' + o.i : null});
  }
  if (insideHouse(P.x, P.y)) {
    if (ob.cur) { c.push({kind:'curtain', label:ob.cc ? 'Раздвинуть шторы' : 'Задёрнуть шторы', o, tk:'cu' + o.i}); c.push({kind:'takecur', label:'Снять шторы', o, tk:'ct' + o.i}); }
    else if (countItem('curtain')) c.push({kind:'hangcur', label:'Повесить шторы', o, tk:'cu' + o.i});
  }
  if (winGlass(ob) && !(ob.bhp > 0)) c.splice(1, 0, {kind:'clearglass', label:'Убрать осколки', o, tk:'cg' + o.i});
  return c;
}
// окна и шторы: открыть/закрыть, перелезть, убрать осколки, снять/повесить шторы
function winAction(a) {
  if (!a.o) return false;
  if (a.kind === 'window') {                                         // тугие и заклинившие окна открываются не с первого раза
    const ob = obs[a.o.i], x = a.o.x + .5, y = a.o.y + .5;
    if (!ob.open && !ob.broken && !(ob.bhp > 0)) {
      const st = winStiff(ob);
      if (st === 2) {
        if (hasTool('crowbar')) {
          job(2.6, () => { const o2 = obs[a.o.i]; if (o2.open) return; o2.stiff = 1; o2.tries = 3; o2.open = true; winAnim.add(a.o.i); SFX.wood(x, y); noise(P.x, P.y, 6); fogDirty = true; toast('Поддел ломом: окно открыто'); }, {an:'work', noisy:4});
          return true;
        }
        winJiggle(a.o.i); SFX.wood(x, y); noise(P.x, P.y, 3);
        toast('Окно заклинило намертво. Нужен лом, или разбей стекло'); return true;
      }
      const fail = st === 1 ? Math.max(.15, .6 - .15 * (ob.tries || 0)) : .2;
      if (rng() < fail) {
        ob.tries = (ob.tries || 0) + 1; winJiggle(a.o.i); SFX.wood(x, y); noise(P.x, P.y, 2.5);
        toast(st === 1 ? 'Окно туго идёт. Ещё попытка' : 'Окно не поддалось. Попробуй ещё раз'); return true;
      }
      ob.tries = 0;
    }
  }
  if (a.kind === 'clearglass') {
    const ob = obs[a.o.i]; if (!winGlass(ob)) return true;
    const gl = !!gloveItem();
    if (!gl) toast('Без перчаток можно порезать руки');
    job(gl ? 2.2 : 2.8, () => {
      const o2 = obs[a.o.i]; if (!winGlass(o2)) return;
      o2.cleared = true; fogDirty = true; SFX.glass(a.o.x + .5, a.o.y + .5); noise(P.x, P.y, 3);
      emit('glass', a.o.x + .5, a.o.y + .5, .5, 6, null, 0, 1);
      glassCut(.45, 'Порезал руку об осколок');
      const n = 1 + (rng() < .5 ? 1 : 0);
      for (let k = 0; k < n; k++) { const s = mkItem('glass'); if (!invFull()) P.inv.push(s); else addToPile(P.x, P.y, s); }
      toast('Осколки убраны: через окно можно лезть без порезов'); renderInv();
    }, {an:'pickup'});
    return true;
  }
  if ((a.kind === 'curtain' || a.kind === 'takecur' || a.kind === 'hangcur') && !insideHouse(P.x, P.y)) { toast('До штор не дотянуться: они в доме'); return true; }
  if (a.kind === 'takecur') {
    const ob = obs[a.o.i]; if (invFull()) { toast('Слишком тяжело — не унести'); return true; }
    P.inv.push({id:'curtain', col:ob.cur}); ob.cur = null; ob.cc = false; SFX.rustle(); fogDirty = true; toast('Шторы сняты и сложены в рюкзак'); renderInv(); return true;
  }
  if (a.kind === 'hangcur') {
    const ob = obs[a.o.i], k = P.inv.findIndex(i => i.id === 'curtain'); if (k < 0) return true;
    const it = P.inv.splice(k, 1)[0]; ob.cur = it.col || [150, 60, 56]; ob.cc = true; SFX.rustle(); fogDirty = true; toast('Шторы повешены и задёрнуты'); renderInv(); return true;
  }
  if (!['window', 'vault', 'curtain'].includes(a.kind)) return false;
  const ob = obs[a.o.i], x = a.o.x, y = a.o.y;
  if (a.kind === 'window') {
    if (ob.open && cellOccupied(x, y)) { toast('Что-то мешает закрыть'); return true; }
    const was = ob.open;
    ob.open = !ob.open; SFX.window ? SFX.window(ob.open) : SFX.wood(x + .5, y + .5); noise(P.x, P.y, 2); fogDirty = true;
    if (ob.open) toast('Окно открыто: можно перелезть. Мертвецы тоже пролезут');
    if (ob.open !== was) { if (ob.ang == null) ob.ang = was ? 1 : 0; winAnim.add(a.o.i); }   // створка поворачивается плавно
  } else if (a.kind === 'curtain') { ob.cc = !ob.cc; SFX.rustle(); fogDirty = true; }
  else if (a.kind === 'vault') {
    const ax = alongX(x, y), side = ax ? (P.y < y + .5 ? 1 : -1) : (P.x < x + .5 ? 1 : -1);
    const tx = ax ? clamp(P.x, x + .25, x + .75) : x + .5 + side * .78, ty = ax ? y + .5 + side * .78 : clamp(P.y, y + .25, y + .75);
    if (blocked(tx, ty, P.r)) { toast('С той стороны не пролезть'); return true; }
    P.act = {kind:'vault', t:0, dur:1.15, o:a.o, fx:P.x, fy:P.y, tx, ty, br:ob.broken && !ob.open};
    P.face = P.fd = Math.atan2(ty - P.y, tx - P.x);
    noise(P.x, P.y, 3); SFX.rustle();
  }
  return true;
}
// перелез через окно или на мебель (climb); битое неубранное стекло может порезать
function finishVault(a) {
  P.x = a.tx; P.y = a.ty; fogDirty = true;
  if (a.climb) { SFX.step(true, false); return; }
  const ob = a.o && obs[a.o.i], cut = a.br && ob && !ob.cleared; a.br = false;
  if (cut) glassCut(.3, 'Порезался о битое стекло');
}
// ---- alarm (digital watch) ----
function sleepAlarmUI() {
  const box = $('alarmSeg'), dig = wristId() === 'watchD';
  box.hidden = !dig; $('alarmInfo').hidden = !dig;
  if (!dig) return;
  seg(box, [[null, 'Выкл'], [360, '06:00'], [480, '08:00'], [600, '10:00']], () => P.alarm == null ? null : P.alarm, v => { P.alarm = v; sleepAlarmUI(); });
  $('alarmInfo').textContent = P.alarm == null ? 'Будильник на электронных часах' : 'Будильник прозвенит в ' + fmtTime(P.alarm);
}
function tickAlarm() {
  if (!P.sleep || P.alarm == null || wristId() !== 'watchD') { P._am = null; return; }
  const m = gameMin % 1440, pm = P._am == null ? m : P._am, A = P.alarm; P._am = m;
  if ((pm < A && m >= A) || (pm > m && (A > pm || A <= m))) { SFX.alarm(P.x, P.y); wake('Пищит будильник: ' + fmtTime(A)); }
}
// ---- paper-doll backpack ----
function drawDoll() {
  const cv2 = document.getElementById('dollCv'); if (!cv2 || !P) return;
  const g = cv2.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv2.width, cv2.height);
  const lk = P.look, dir = (Math.floor(animT / 1.6) + 1) % 8, nw = AN('p', 'idle'), fi = Math.floor(animT * 2.6) % nw;
  const pp = playerLookPal(lk);
  const fr = charFrame('p' + lk.g + heroVar(lk) + '_idle_' + dir + '_' + fi, pp.key, pp.pal, true);
  const W = cv2.width, H = cv2.height, foot = H - 18;
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(W / 2, foot, W * .2, 11, 0, 0, 6.283); g.fill();
  if (!fr) return;
  const k = (fr.s || 1) > 1 ? Math.min((H - 30) / fr.ay, 3.2) : Math.max(1, Math.floor((H - 30) / 62)), b = 1 + Math.sin(animT * 2.3) * .012;   // пиксельный герой — целый масштаб, во весь рост
  g.imageSmoothingEnabled = (fr.s || 1) > 1; g.imageSmoothingQuality = 'high';               // пиксельный герой — без размытия
  g.translate(W / 2, foot); g.scale(k, k * b); g.drawImage(fr.cv, -fr.ax, -fr.ay); g.setTransform(1, 0, 0, 1, 0, 0);
}
// карточка выбранной вещи или ячейки куклы: описание и кнопки (надеть/снять, зашить, перезарядить, переложить)
function invDetail(body) {
  const sel = panel.sel, groups = groupItems(P.inv);
  let dc = null, it = null, g = null;
  if (sel === 'bagslot' && P.bag) { it = P.bag; dc = detailCard(it, 1, [btn('Снять', () => { takeOffBag(); panel.sel = null; renderPanel(); }, 'ghost')]); }
  else if (sel && sel.startsWith('cl_') && P.cloth && P.cloth[sel.slice(3)]) { const sl = sel.slice(3); it = P.cloth[sl]; dc = detailCard(it, 1, [btn('Снять', () => { takeOffCloth(sl); panel.sel = null; renderPanel(); updateHud(); }, 'ghost')]); }
  else if (sel === 'armor' && P.armor) { it = P.armor; dc = detailCard(it, 1, [btn('Снять', () => { if (invFull()) { toast('Слишком тяжело — не унести'); return; } P.inv.push(P.armor); P.armor = null; panel.sel = null; renderPanel(); }, 'ghost')]); }
  else if (sel === 'hand' && P.weapon) { it = P.weapon; dc = detailCard(it, 1, [btn('Убрать в рюкзак', () => { unequip(); panel.sel = null; renderPanel(); }, 'ghost')], true); }
  else if (sel && sel !== 'bagslot') {
    g = groups.find(g => g.key === sel);
    if (g) {
      const d = ITEMS[g.it.id], bs = []; it = g.it;
      if (d.kind === 'light') bs.push(btn(g.it.on ? 'Выключить' : 'Включить', () => useItem(null, g.idx)));
      else if (d.verb) bs.push(btn(d.verb, () => { beginUse(g.idx); updateHud(); }));
      bs.push(btn('На землю', () => dropItemGround(g.idx), 'ghost'));
      dc = detailCard(g.it, g.n, bs);
    } else panel.sel = null;
  }
  if (!dc) return;
  dc.classList.add('lootdet'); dc.replaceChild(iconEl(it.id, 40), dc.firstChild); body.appendChild(dc);
  if (sel === 'bagslot') return;
  const acts = dc.querySelector('.acts'), d = ITEMS[it.id]; if (!acts || !d) return;
  for (const b of tailorButtons(it, !g)) acts.appendChild(b);                     // зашить, утеплить
  if (d.gun && it === P.weapon && it.mag < d.mag) { const b = btn(ammoFor(it).length ? 'Перезарядить' : 'Нет патронов', () => { closePanel(); startReload(); }, 'ghost'); b.disabled = !ammoFor(it).length; acts.appendChild(b); }
  if (!g || !P.bag) return;
  const toBag = !it.bp;                                                            // переложить между карманами и рюкзаком
  acts.appendChild(btn(toBag ? 'В рюкзак' : 'В карманы', () => {
    const w = itemKg(it);
    if (toBag && bagKgUsed() + w > bagCapKg() + 1e-6) { toast('В рюкзак не влезет: свободно ' + fmtKg(bagCapKg() - bagKgUsed()) + ' кг'); return; }
    it.bp = toBag ? 1 : 0; SFX.rustle(); panel.sel = null; renderPanel(); updateHud();
  }, 'ghost'));
  if (g.n >= 2) {                                                                  // и всю стопку сразу
    const same = P.inv.filter(x => x.id === it.id && !!x.bp === !!it.bp && isRotten(x) === isRotten(it));
    acts.appendChild(btn((it.bp ? 'В карманы' : 'В рюкзак') + ' все ×' + same.length, () => moveItems(same, !it.bp), 'ghost'));
  }
}
// окно рюкзака: кукла со слотами одежды, вещи по карманам и рюкзаку, карточка выбранного
function buildInvDoll(body) {
  invPlace();
  body.textContent = ''; body.classList.add('fit');
  const lay = mk('div', 'lay3 inv'), D = mk('div', 'dollside'), R = mk('div', 'pcol'), Dd = mk('div', 'pdet');
  const slot = (it, key, label, onTap) => { const c = cell(it, 1, it ? onTap || (() => { panel.sel = panel.sel === key ? null : key; renderPanel(); }) : null, {sel:panel.sel === key, label, size:30}); c.classList.add('dslot'); const w = mk('div', 'dwrap'); w.appendChild(c); if (it) w.appendChild(mk('span', 'dlab', label)); return w; };
  const cl = P.cloth || {}, colL = mk('div', 'dcol'), colR = mk('div', 'dcol');
  for (const s of ['head', 'torso', 'shirt', 'hands']) colL.appendChild(slot(cl[s], 'cl_' + s, SLOT_NAME[s]));
  colR.appendChild(slot(P.weapon, 'hand', 'В руках')); colR.appendChild(slot(P.armor, 'armor', 'Броня'));
  colR.appendChild(slot(P.bag, 'bagslot', 'Рюкзак'));
  for (const s of ['legs', 'feet', 'wrist']) colR.appendChild(slot(cl[s], 'cl_' + s, SLOT_NAME[s]));
  const mid = mk('div', 'dmid'), cv2 = mk('canvas'); cv2.id = 'dollCv'; cv2.width = 300; cv2.height = 380; mid.appendChild(cv2);
  const st = mk('div', 'dstat'); st.appendChild(mk('span', '', 'Тепло ' + insulation()));
  const pr = Math.round(partProt('torso') * 100); st.appendChild(mk('span', '', P.armor ? 'Броня ' + Math.max(0, Math.round(P.armor.dur)) : pr ? 'Защита ' + pr + '%' : 'Без защиты'));
  mid.appendChild(st);
  D.appendChild(colL); D.appendChild(mid); D.appendChild(colR);
  const tot = mk('div', 'kgline' + (invOver() > 0 ? ' over' : ''));
  tot.appendChild(mk('b', '', 'Несёшь ' + fmtKg(invKg()) + ' кг')); tot.appendChild(mk('span', '', 'из ' + fmtKg(invCapKg()) + (invOver() > 0 ? ' · перегруз' : '')));
  R.appendChild(tot);
  const pk = pocketKgUsed(), pc = pocketKg() * strK();
  R.appendChild(invSection('Карманы', fmtKg(pk) + ' / ' + fmtKg(pc) + ' кг', pk / pc, P.inv, false));
  if (P.bag) { const bk = bagKgUsed(), bc = bagCapKg(); R.appendChild(invSection(ITEMS[P.bag.id].name, fmtKg(bk) + ' / ' + fmtKg(bc) + ' кг', bk / bc, P.inv, true)); }
  else R.appendChild(mk('div', 'nobag', 'Рюкзака нет. Найди его в шкафах, машинах и на вешалках'));
  lay.appendChild(D); lay.appendChild(R); lay.appendChild(Dd); body.appendChild(lay);
  invDetail(Dd);
  if (!Dd.children.length) Dd.appendChild(pickHint(P.inv.length ? 'Тапни вещь или ячейку одежды, чтобы увидеть описание и действия' : 'Рюкзак пуст. Обыщи дома и машины поблизости'));
  drawDoll();
}
