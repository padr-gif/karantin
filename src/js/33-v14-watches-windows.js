// ================= v14: watches & clock, windows (open / vault / curtains), paper-doll backpack, alarm =================
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
function windowActions(o) {
  const ob = obs[o.i], c = [];
  if (ob.bhp > 0) c.push({kind:'unbar', label:'Оторвать доску', o});
  else {
    if (ob.open || ob.broken) c.push({kind:'vault', label:'Перелезть', o});
    if (!ob.broken) c.push({kind:'window', label:ob.open ? 'Закрыть окно' : 'Открыть окно', o, tk:ob.open ? 'wc' + o.i : null});
  }
  if (ob.cur) c.push({kind:'curtain', label:ob.cc ? 'Раздвинуть шторы' : 'Задёрнуть шторы', o, tk:'cu' + o.i});
  else if (countItem('curtain')) c.push({kind:'hangcur', label:'Повесить шторы', o, tk:'cu' + o.i});
  return c;
}
function winAction(a) {
  if (!a.o || !['window', 'vault', 'curtain', 'hangcur'].includes(a.kind)) return false;
  const ob = obs[a.o.i], x = a.o.x, y = a.o.y;
  if (a.kind === 'window') {
    if (ob.open && cellOccupied(x, y)) { toast('Что-то мешает закрыть'); return true; }
    ob.open = !ob.open; SFX.wood ? SFX.wood(x + .5, y + .5) : 0; noise(P.x, P.y, 2); fogDirty = true;
    if (ob.open) toast('Окно открыто: можно перелезть. Мертвецы тоже пролезут');
  } else if (a.kind === 'curtain') { ob.cc = !ob.cc; SFX.rustle(); fogDirty = true; }
  else if (a.kind === 'hangcur') { removeItem('curtain'); ob.cur = [150, 60, 56]; ob.cc = true; SFX.rustle(); toast('Шторы повешены и задёрнуты'); renderInv(); }
  else if (a.kind === 'vault') {
    const ax = alongX(x, y), side = ax ? (P.y < y + .5 ? 1 : -1) : (P.x < x + .5 ? 1 : -1);
    const tx = ax ? clamp(P.x, x + .25, x + .75) : x + .5 + side * .78, ty = ax ? y + .5 + side * .78 : clamp(P.y, y + .25, y + .75);
    if (blocked(tx, ty, P.r)) { toast('С той стороны не пролезть'); return true; }
    P.act = {kind:'vault', t:0, dur:.85, o:a.o, fx:P.x, fy:P.y, tx, ty, br:ob.broken && !ob.open};
    noise(P.x, P.y, 3); SFX.rustle();
  }
  return true;
}
function finishVault(a) {
  P.x = a.tx; P.y = a.ty; fogDirty = true;
  if (a.br && rng() < .3 && !(P.cloth && P.cloth.torso && ITEMS[P.cloth.torso.id].ins >= 4)) { P.bleed = true; P.hp -= 4; lastCause = 'Порезы'; toast('Порезался о битое стекло. Перевяжи рану'); }
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
  const g = cv2.getContext('2d'); g.clearRect(0, 0, cv2.width, cv2.height);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(96, 206, 34, 12, 0, 0, 6.283); g.fill();
  const lk = P.look, dir = (Math.floor(animT / 1.6) + 1) % 8, nw = AN('p', 'idle'), fi = Math.floor(animT * 2.6) % nw;
  const pal = lookPal(lk), ct = P.cloth && P.cloth.torso, ch = P.cloth && P.cloth.head;
  if (ct) pal[3] = pal[4] = ITEMS[ct.id].col; if (ch) pal[2] = ITEMS[ch.id].col;
  const fr = charFrame('p' + lk.g + '_idle_' + dir + '_' + fi, 'P' + lk.g + lk.skin + lk.hair + lk.shirt + lk.pants + (ct ? ct.id : '') + (ch ? ch.id : ''), pal, true);
  if (fr) { g.imageSmoothingEnabled = false; g.drawImage(fr.cv, 96 - fr.ax, 206 - fr.ay); }
}
function invDetail(body) {
  const sel = panel.sel, groups = groupItems(P.inv);
  let dc = null, it = null;
  if (sel && sel.startsWith('cl_') && P.cloth && P.cloth[sel.slice(3)]) { const sl = sel.slice(3); it = P.cloth[sl]; dc = detailCard(it, 1, [btn('Снять', () => { takeOffCloth(sl); panel.sel = null; renderPanel(); updateHud(); }, 'ghost')]); }
  else if (sel === 'armor' && P.armor) { it = P.armor; dc = detailCard(it, 1, [btn('Снять', () => { if (P.inv.length >= P.cap) { toast('Рюкзак полон'); return; } P.inv.push(P.armor); P.armor = null; panel.sel = null; renderPanel(); }, 'ghost')]); }
  else if (sel === 'hand' && P.weapon) { it = P.weapon; dc = detailCard(it, 1, [btn('Убрать в рюкзак', () => { unequip(); panel.sel = null; renderPanel(); }, 'ghost')], true); }
  else if (sel) {
    const g = groups.find(g => g.key === sel);
    if (g) {
      const d = ITEMS[g.it.id], bs = []; it = g.it;
      if (d.kind === 'light') bs.push(btn(g.it.on ? 'Выключить' : 'Включить', () => useItem(null, g.idx)));
      else if (d.verb) bs.push(btn(d.verb, () => { beginUse(g.idx); updateHud(); }));
      bs.push(btn('На землю', () => dropItemGround(g.idx), 'ghost'));
      dc = detailCard(g.it, g.n, bs);
    } else panel.sel = null;
  }
  if (dc) { dc.classList.add('lootdet'); dc.replaceChild(iconEl(it.id, 40), dc.firstChild); body.appendChild(dc); }
}
function buildInvDoll(body) {
  body.textContent = '';
  const lay = mk('div', 'invdoll'), D = mk('div', 'dollside'), R = mk('div', 'invside');
  const slot = (it, key, label, onTap) => { const c = cell(it, 1, it ? onTap || (() => { panel.sel = panel.sel === key ? null : key; renderPanel(); }) : null, {sel:panel.sel === key, label}); c.classList.add('dslot'); const w = mk('div', 'dwrap'); w.appendChild(c); if (it) w.appendChild(mk('span', 'dlab', label)); return w; };
  const cl = P.cloth || {};
  const colL = mk('div', 'dcol'), colR = mk('div', 'dcol');
  colL.appendChild(slot(cl.head, 'cl_head', 'Голова'));
  colL.appendChild(slot(cl.torso, 'cl_torso', 'Тело'));
  colL.appendChild(slot(cl.wrist, 'cl_wrist', 'Запястье'));
  colR.appendChild(slot(P.weapon, 'hand', 'В руках'));
  colR.appendChild(slot(P.armor, 'armor', 'Броня'));
  colR.appendChild(slot(P.cap > 18 + (P.capB || 0) ? {id:'bag'} : null, 'bagx', 'Рюкзак', () => toast('Большой рюкзак: ' + P.cap + ' мест')));
  const mid = mk('div', 'dmid'), cv2 = mk('canvas'); cv2.id = 'dollCv'; cv2.width = 192; cv2.height = 240; mid.appendChild(cv2);
  const st = mk('div', 'dstat'); st.appendChild(mk('span', '', 'Тепло ' + insulation())); st.appendChild(mk('span', '', P.armor ? 'Броня ' + Math.max(0, Math.round(P.armor.dur)) : 'Без брони')); mid.appendChild(st);
  D.appendChild(colL); D.appendChild(mid); D.appendChild(colR);
  // right: items
  const hd = mk('div', 'secrow'), t = mk('div', 'sect', 'Вещи'); t.appendChild(mk('small', '', P.inv.length + '/' + P.cap)); hd.appendChild(t);
  const cap = mk('div', 'capbar'), ci = mk('i'); ci.style.width = Math.round(P.inv.length / P.cap * 100) + '%'; cap.appendChild(ci); hd.appendChild(cap);
  R.appendChild(hd);
  const groups = groupItems(P.inv).sort((a, b) => CATS.indexOf(catOf(a.it.id)) - CATS.indexOf(catOf(b.it.id)));
  R.appendChild(gridOf(groups, g => { panel.sel = panel.sel === g.key ? null : g.key; renderPanel(); }, P.cap, panel.sel));
  if (!P.inv.length) R.appendChild(mk('p', 'empty', 'Пусто. Обыщи дома и машины поблизости.'));
  lay.appendChild(D); lay.appendChild(R); body.appendChild(lay);
  invDetail(body);
  drawDoll();
}
