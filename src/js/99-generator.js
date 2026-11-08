// ================= генератор: выбор места, подключение к дому проводом, угарный газ =================
// «Установить» больше не ставит генератор сразу перед героем: появляется призрак-клетка, её можно двигать тапом
// (на 2–3 клетки вокруг), внизу — «Поставить» и «Отмена». В доме ставить можно, но выхлоп копится: угарный газ,
// головная боль, обморок и смерть. Открытые и разбитые окна проветривают. Лучше — на улице у стены.
// Сам по себе генератор ничего не питает: его нужно подключить к дому медным проводом (действие у генератора).
// Тогда свет, холодильник и всё остальное работают во всём этом доме. Провод виден на земле.
// Генератор можно отключить и забрать с собой (бензин в баке остаётся).

// ---------- что питает генератор ----------
const genHouse = g => g && g.hid != null ? houses[g.hid] : null;
const inHouseRect = (H, x, y, m) => x > H.ix0 - m && x < H.ix1 + m && y > H.iy0 - m && y < H.iy1 + m;
poweredAt = function (x, y) {
  if (powerOn()) return true;
  for (const g of gens) { if (!g.on || g.fuel <= 0) continue; const H = genHouse(g); if (H && inHouseRect(H, x, y, .6)) return true; }
  return false;
};
// ближайший дом, до которого дотянется провод (до 8 клеток от генератора до стены)
function genNearHouse(g) {
  let best = -1, bd = 8;
  houses.forEach((H, k) => {
    if (H.kind === 'shed') return;
    const qx = clamp(g.cx, H.ix0, H.ix1), qy = clamp(g.cy, H.iy0, H.iy1), d = Math.hypot(g.cx - qx, g.cy - qy);
    if (d < bd) { bd = d; best = k; }
  });
  return best;
}

// ---------- выбор места ----------
const GPL = {on:false, it:null, x:0, y:0, fixed:false, bar:null};
function genWhy(x, y) {
  if (Math.hypot(x + .5 - P.x, y + .5 - P.y) > 2.8) return 'далеко — подойди ближе';
  if (!tileFree(x, y) || isWallish(get(x, y)) || map[y * MW + x] === WATER || map[y * MW + x] === TREE) return 'здесь занято';
  if (Math.floor(P.x) === x && Math.floor(P.y) === y) return 'ты стоишь здесь';
  return '';
}
function genBar() {
  if (GPL.bar) return GPL.bar;
  const b = mk('div', 'gpl'); b.id = 'genPlace'; b.hidden = true;
  b.innerHTML = '<div class="gpl-t"><b>Куда поставить генератор?</b><span></span></div><div class="gpl-b"></div>';
  const ok = btn('Поставить', () => genPlaceHere()), no = btn('Отмена', () => genPlaceEnd(), 'ghost');
  ok.className = 'go'; no.className = 'mbtn'; b.querySelector('.gpl-b').append(no, ok);
  document.body.appendChild(b); return (GPL.bar = b);
}
placeGen = function (k) {
  const it = P.inv[k]; if (!it) return;
  closePanel();
  GPL.on = true; GPL.it = it; GPL.fixed = false;
  const t = freeFront() || frontTile(); GPL.x = t[0]; GPL.y = t[1];
  genBar().hidden = false; genBarText();
};
function genBarText() {
  const b = GPL.bar; if (!b) return;
  const why = genWhy(GPL.x, GPL.y), inside = insideHouse(GPL.x + .5, GPL.y + .5), s = b.querySelector('.gpl-t span');
  s.textContent = why ? 'Нельзя: ' + why : inside ? 'В доме выхлоп копится — угарный газ может отравить. Лучше на улице у стены' : 'Тапни по клетке рядом, чтобы выбрать другое место';
  s.className = why ? 'bad' : inside ? 'warn' : '';
  b.querySelector('.go').disabled = !!why;
}
function genPlaceHere() {
  const it = GPL.it, k = P.inv.indexOf(it), [x, y] = [GPL.x, GPL.y];
  if (k < 0) { genPlaceEnd(); return; }
  const why = genWhy(x, y); if (why) { toast('Нельзя: ' + why); return; }
  const p = {type:'gen', proc:true, cx:x + .5, cy:y + .5, solid:true, r:[x + .2, y + .25, x + .8, y + .75], fuel:it.fuel || 0, on:false};
  if (!addProp(p, [[x, y]])) { toast('Нет места'); return; }
  gens.push(p); P.inv.splice(k, 1); SFX.knock(p.cx, p.cy); genPlaceEnd(); renderInv(); clearCaches(); buildFlow();
  const inside = insideHouse(p.cx, p.cy);
  toast((inside ? 'Генератор в доме. Не забывай проветривать — угарный газ без запаха. ' : 'Генератор установлен. ') + 'Подключи его к дому проводом' + (p.fuel > 0 ? '' : ' и залей бензин'));
}
function genPlaceEnd() { GPL.on = false; GPL.it = null; if (GPL.bar) GPL.bar.hidden = true; }
onTap((cx, cy) => {
  if (!GPL.on) return false;
  const [wx, wy] = worldFromScreen(cx, cy), x = Math.floor(wx), y = Math.floor(wy);
  if (Math.hypot(x + .5 - P.x, y + .5 - P.y) > 4) return true;               // мимо — ничего не делаем, но и не бьём
  GPL.x = x; GPL.y = y; GPL.fixed = true; genBarText(); SFX.select && SFX.select(); return true;
});
onUpdate(() => {
  if (!GPL.on) return;
  if (mode !== 'play' || !P || P.sleep || P.car || !P.inv.includes(GPL.it)) { genPlaceEnd(); return; }
  if (GPL.fixed && Math.hypot(GPL.x + .5 - P.x, GPL.y + .5 - P.y) > 3.2) GPL.fixed = false;
  if (!GPL.fixed) { const t = freeFront() || frontTile(); if (t[0] !== GPL.x || t[1] !== GPL.y) { GPL.x = t[0]; GPL.y = t[1]; genBarText(); } }
});
addEventListener('keydown', e => { if (GPL.on && e.key === 'Escape') { genPlaceEnd(); e.stopImmediatePropagation(); } }, true);
onDraw(() => {
  if (!GPL.on || mode !== 'play') return;
  const x = GPL.x, y = GPL.y, why = genWhy(x, y), inside = insideHouse(x + .5, y + .5);
  const col = why ? [230, 110, 96] : inside ? [240, 180, 80] : [140, 220, 120], pulse = .22 + .08 * Math.sin(animT * 5);
  box(x + .04, y + .04, x + .96, y + .96, 0, 2, col, 1, .35);
  box(x + .2, y + .25, x + .8, y + .75, 0, 22, col, 1, pulse);
});

// ---------- провод к дому ----------
function genCableEnd(g) {
  const H = genHouse(g); if (!H) return null;
  return [clamp(g.cx, H.ix0 - .05, H.ix1 + .05), clamp(g.cy, H.iy0 - .05, H.iy1 + .05)];
}
onDraw(() => {
  if (mode !== 'play') return;
  for (const g of gens) {
    const e = genCableEnd(g); if (!e) continue;
    if (Math.abs(g.cx - P.x) > 24 || Math.abs(g.cy - P.y) > 24) continue;
    const ax = g.cx + .28, ay = g.cy, d = Math.hypot(e[0] - ax, e[1] - ay), n = Math.max(2, Math.ceil(d * 3));
    ctx.strokeStyle = 'rgba(18,18,20,.9)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let k = 0; k <= n; k++) {
      const t = k / n, wob = Math.sin(t * Math.PI * 3 + g.cx) * .08 * Math.sin(t * Math.PI);
      const x = ax + (e[0] - ax) * t + wob, y = ay + (e[1] - ay) * t - wob, z = k === 0 ? 9 : k === n ? 10 : 1;
      if (k) ctx.lineTo(SX(x, y), SY(x, y, z)); else ctx.moveTo(SX(x, y), SY(x, y, z));
    }
    ctx.stroke();
    ctx.fillStyle = g.on && g.fuel > 0 ? '#ffd166' : '#3a3a3e'; ctx.fillRect(SX(e[0], e[1]) - 1.5, SY(e[0], e[1], 10) - 1.5, 3, 3);   // щиток: горит, когда есть ток
  }
});
addActions(out => {
  if (!P || P.car || P.sleep || GPL.on) return;
  for (const g of gens) {
    if (g.dead || Math.hypot(g.cx - P.x, g.cy - P.y) > 1.5) continue;
    if (g.hid == null) {
      const hk = genNearHouse(g);
      if (hk < 0) out.push({kind:'gencon', label:'подключить: рядом нет дома', f:g});
      else out.push({kind:'gencon', label:countItem('wire') ? 'подключить к дому' : 'подключить к дому: нужен медный провод', f:g});
    } else out.push({kind:'genoff', label:'отключить от дома', f:g});
    if (!g.on) out.push({kind:'gentake', label:'забрать генератор', f:g});
  }
});
defAction('gencon', {name:() => 'Генератор', icon:() => 'i-bolt', run:a => {
  if (mode !== 'play' || paused || panel) return; $('actMenu').hidden = true;
  const g = a.f, hk = genNearHouse(g);
  if (hk < 0) { toast('Провод не дотянется: поставь генератор ближе к дому, в 8 клетках от стены'); return; }
  if (!countItem('wire')) { toast('Нужен медный провод: он есть в разобранной технике — холодильниках, плитах, лампах — и на стеллажах с инструментом'); return; }
  job(4 * (1 - .06 * skillLv('mech')), () => {
    if (!countItem('wire')) return;
    removeItem('wire'); g.hid = hk; SFX.knock(g.cx, g.cy); addXp('mech', 2); clearCaches();
    toast(g.on ? 'Подключено: в доме появился ток' : 'Подключено к дому. Включи генератор — и будет свет');
  }, {loopAn:'work'});
}});
defAction('genoff', {name:() => 'Генератор', icon:() => 'i-bolt', run:a => {
  if (mode !== 'play' || paused || panel) return; $('actMenu').hidden = true;
  const g = a.f; g.hid = null; if (!invFull()) P.inv.push(mkItem('wire')); else addToPile(P.x, P.y, mkItem('wire'));
  SFX.knock(g.cx, g.cy); clearCaches(); renderInv(); toast('Провод смотан. Дом остался без тока');
}});
defAction('gentake', {name:() => 'Генератор', icon:() => 'i-bolt', run:a => {
  if (mode !== 'play' || paused || panel) return; $('actMenu').hidden = true;
  const g = a.f; if (g.on) { toast('Сначала выключи'); return; }
  const it = mkItem('generator'); it.fuel = g.fuel;
  if (g.hid != null) { if (!invFull()) P.inv.push(mkItem('wire')); else addToPile(P.x, P.y, mkItem('wire')); }
  if (typeof dropProp === 'function') dropProp(g); else g.dead = true;
  gens.splice(gens.indexOf(g), 1);
  if (!invFull()) P.inv.push(it); else addToPile(P.x, P.y, it);
  SFX.knock(g.cx, g.cy); clearCaches(); buildFlow(); renderInv(); toast('Генератор забран' + (it.fuel > 0 ? ' — бензин в баке остался' : ''));
}});
// включил, а дом не подключён — подсказка

// ---------- угарный газ ----------
const genIndoors = g => g.on && g.fuel > 0 && insideHouse(g.cx, g.cy);
function houseAt(x, y) { return houses.find(H => x > H.ix0 && x < H.ix1 && y > H.iy0 && y < H.iy1); }
function houseVents(H) {
  let n = 0;
  if (typeof houseWindows === 'function') for (const w of houseWindows(H)) { const o = obs[w.i]; if (o && (o.open || o.broken) && !o.film) n++; }
  for (let y = Math.floor(H.iy0) - 1; y <= Math.ceil(H.iy1); y++) for (let x = Math.floor(H.ix0) - 1; x <= Math.ceil(H.ix1); x++) { const o = obs[y * MW + x]; if (o && o.t === 'door' && (o.open || o.dead)) { const out = D4.some(([a, b]) => !insideHouse(x + a + .5, y + b + .5) && !isWallish(get(x + a, y + b))); if (out) n++; } }
  return n;
}
{ let lastM = null, woke = false;
  onUpdate(() => {
    if (!P || mode !== 'play') { lastM = null; return; }
    if (lastM == null || gameMin < lastM) { lastM = gameMin; return; }
    const gm = gameMin - lastM; if (gm <= 0) return; lastM = gameMin;
    const H = insideHouse(P.x, P.y) ? houseAt(P.x, P.y) : null;
    let rate = 0;
    if (H) for (const g of gens) if (genIndoors(g) && houseAt(g.cx, g.cy) === H) rate += 1.1;
    if (rate) { const v = houseVents(H); rate *= Math.max(.12, 1 - v * .22); P.co = Math.min(100, (P.co || 0) + rate * gm); }
    else P.co = Math.max(0, (P.co || 0) - 2.5 * gm);
    const co = P.co || 0;
    if (co > 60) { P.en = Math.max(0, P.en - .08 * gm); P.pain = Math.max(P.pain || 0, 35); }
    if (co > 85) { P.hp -= .35 * gm; lastCause = 'Угарный газ от генератора'; }
    if (co >= 100) { P.hp -= 2 * gm; lastCause = 'Угарный газ от генератора'; }
    if (P.sleep && co > 55 && !woke && rng() < .6) { woke = true; wake('Голова раскалывается, тошнит — в доме угар! Выключи генератор и открой окна'); }
    if (co < 20) woke = false;
  });
}
Object.assign(MOOD_ART, {
  'Угарный газ':moFace('#b8c4a0', MO.dizzy + MO.wave, '<path d="M3.5 9a3 3 0 0 1 4.6-2.4 3.4 3.4 0 0 1 6 .6 2.4 2.4 0 0 1-.6 4.6H5a2.4 2.4 0 0 1-1.5-2.8z" fill="#8a8f96" stroke="#2a1d12" stroke-width="1"/>'),
  'Отравление угарным газом':moFace('#9aa88a', MO.xeyes + MO.wave, '<path d="M3.5 9a3 3 0 0 1 4.6-2.4 3.4 3.4 0 0 1 6 .6 2.4 2.4 0 0 1-.6 4.6H5a2.4 2.4 0 0 1-1.5-2.8z" fill="#6a6f76" stroke="#2a1d12" stroke-width="1"/>'),
});
addMoodles(m => {
  const co = (P && P.co) || 0;
  if (co > 60) m.push(['Отравление угарным газом', 'crit']); else if (co > 25) m.push(['Угарный газ', 'warn']);
}, m => {
  const co = (P && P.co) || 0;
  if (co > 25) m.push('Угарный газ: генератор работает в доме. Выключи его или вынеси на улицу, открой окна и двери, выйди подышать');
});

// ---------- сохранение ----------
onSave(d => { d.xGen = {hid:gens.map(g => g.hid == null ? -1 : g.hid), co:Math.round(P.co || 0)}; });
onLoad(d => {
  const x = d && d.xGen;
  gens.forEach((g, k) => {
    if (x && x.hid && x.hid[k] != null) g.hid = x.hid[k] >= 0 ? x.hid[k] : null;
    else { const hk = genNearHouse(g); g.hid = hk >= 0 ? hk : null; }          // старые сохранения: уже стоящий генератор считаем подключённым
  });
  P.co = (x && x.co) || 0;
});
onStartNew(() => { if (P) P.co = 0; genPlaceEnd(); });

// ---------- журнал «Генераторы: подключение и уход» ----------
// Без него к дому не подключить: где щиток, как не спалить проводку и не убить себя током. Электрик знает и так.
ITEMS.mag_gen = {name:'Журнал «Генераторы: подключение и уход»', sh:'Журнал: генераторы', kind:'book', mag:'gen', verb:'Читать'};
DESC.mag_gen = 'Тонкий журнал из хозяйственного: как подключить генератор к щитку дома, заземлить и не отравиться выхлопом. Прочитаешь — сможешь подключать.';
KG.mag_gen = .2;
{ const add = (k, ...ids) => CONT[k] && CONT[k].loot && CONT[k].loot.push(...ids);
  add('toolrack', 'mag_gen', 'mag_gen'); add('crate', 'mag_gen'); add('bookshelf', 'mag_gen'); add('desk', 'mag_gen'); add('boxes', 'mag_gen'); add('locker', 'mag_gen'); }
onStartNew(() => {
  // в хозяйственном, где лежит генератор, рядом и журнал
  const hw = furns.filter(f => f.type === 'crate' && f.items && f.items.some(i => i.id === 'generator'));
  for (const f of hw) f.items.push(mkItem('mag_gen'));
});
const genKnown = () => !!(P && ((P.readMag && P.readMag.mag_gen) || P.prof === 'electric'));
defUse(it => it.id === 'mag_gen', (it, k) => {
  P.readMag = P.readMag || {};
  if (P.readMag.mag_gen) { toast('Этот журнал ты уже прочитал'); return; }
  P.readMag.mag_gen = true; stat && stat('books'); SFX.rustle(); P.bored = Math.max(0, (P.bored || 0) - 15); addXp('mech', 2);
  openPanel('mag', {it, msg:'Теперь ты знаешь, как подключить генератор к щитку дома проводом — и почему его нельзя гонять в закрытой комнате.'});
  if (!panel || panel.kind !== 'mag') { toast('Прочитано. Теперь генератор можно подключать к дому'); renderInv(); }
});
MAG_COVER.gen = {c:'#1f5f7a', main:['Свет в каждый дом'], sub:['Щиток: куда и как подключать', 'Угарный газ не пахнет', 'Бензин: сколько хватит на ночь', 'Заземление за пять минут']};
{ const mm0 = mediaMag;
  mediaMag = function (body) {
    const it = panel.it, d = ITEMS[it.id]; if (!d || !d.mag) return mm0.apply(this, arguments);
    const C = MAG_COVER[d.mag];
    $('pnTitle').textContent = d.name; $('pnSub').textContent = 'прочитано от корки до корки';
    const wrap = mk('div', 'mg'), cov = mk('div', 'mg-cov'); cov.style.setProperty('--mg', C.c);
    const top = mk('div', 'mg-top'); top.appendChild(mk('span', 'mg-name', 'Генераторы')); top.appendChild(mk('span', 'mg-no', 'спецвыпуск')); cov.appendChild(top);
    cov.appendChild(mk('div', 'mg-for', 'подключение и уход'));
    const art = mk('div', 'mg-art'); art.appendChild(iconEl('mag_gen', 56)); cov.appendChild(art);
    cov.appendChild(mk('div', 'mg-main', C.main[0]));
    const ul = mk('ul', 'mg-sub'); for (const s of C.sub.slice(0, 3)) ul.appendChild(mk('li', '', s)); cov.appendChild(ul);
    wrap.appendChild(cov);
    const res = mk('div', 'mg-res'); res.appendChild(mk('div', 'mg-rh', 'Что ты вынес')); res.appendChild(mk('p', '', panel.msg));
    wrap.appendChild(res); body.appendChild(wrap);
  };
}
// подключение — только если знаешь как
{ const run0 = ACT.gencon.run;
  ACT.gencon.run = function (a) {
    if (!genKnown()) { toast('Как подключать к щитку, ты не знаешь. Найди журнал «Генераторы: подключение и уход» — в хозяйственных, гаражах, на стеллажах с инструментом'); return; }
    return run0.apply(this, arguments);
  };
  // подпись действия: подсказать, чего не хватает
  addActions(out => { for (const a of out) if (a.kind === 'gencon' && !genKnown() && /^подключить к дому/.test(a.label)) a.label = 'подключить к дому: нужен журнал «Генераторы»'; });
}

// ---------- новый вид генератора ----------
// открытая рама из чёрных труб, красный бак сверху с крышкой, серый мотор с рёбрами, тёмный альтернатор,
// пульт с розетками и лампочкой (зелёная — работает), блестящий глушитель и два колеса
drawGen = function (p, f) {
  const [x0, y0, x1, y1] = p.r, on = p.on && p.fuel > 0, j = on ? Math.sin(animT * 70) * .008 : 0, jz = on ? Math.sin(animT * 55) * .35 : 0;
  const X0 = x0 + j, X1 = x1 + j, mx = (X0 + X1) / 2, my = (y0 + y1) / 2, w = X1 - X0, h = y1 - y0;
  const BLK = [34, 34, 38], STEEL = [150, 154, 160];
  box(X0 + .02, y0 + .02, X1 - .02, y1 - .02, 0, 1.4, [46, 46, 50], f);                                    // поддон
  for (const [cx, cy] of [[X0 + .03, y0 + .03], [X1 - .07, y0 + .03], [X0 + .03, y1 - .07], [X1 - .07, y1 - .07]]) box(cx, cy, cx + .04, cy + .04, 1.4, 19, BLK, f);   // стойки рамы
  box(X0 + .05, my - .14, X0 + w * .58, my + .14, 2 + jz, 12 + jz, [120, 124, 130], f);                   // мотор
  for (let k = 0; k < 4; k++) box(X0 + .07 + k * .065, my - .16, X0 + .1 + k * .065, my + .16, 8 + jz, 12.6 + jz, [86, 90, 96], f);   // рёбра цилиндра
  box(X0 + w * .58, my - .12, X1 - .06, my + .12, 3 + jz, 11 + jz, [58, 60, 66], f);                      // альтернатор
  box(X1 - .07, my - .1, X1 - .03, my + .1, 4 + jz, 11 + jz, [30, 30, 34], f);                            // пульт
  box(X1 - .075, my - .07, X1 - .068, my - .02, 6 + jz, 8 + jz, [230, 196, 70], f);                       // розетка
  box(X1 - .075, my + .02, X1 - .068, my + .07, 6 + jz, 8 + jz, [230, 196, 70], f);
  box(X0 + .08, y0 + .07, X1 - .1, y1 - .07, 13 + jz, 18 + jz, [196, 52, 42], f);                         // бак
  box(X0 + .1, y0 + .09, X1 - .12, y1 - .09, 18 + jz, 18.6 + jz, [214, 74, 60], f);
  box(mx - .06, my - .06, mx + .02, my + .02, 18.6 + jz, 20.4 + jz, BLK, f);                              // крышка бака
  box(X0 + .02, y0 + .04, X0 + w, y0 + .07, 18.5, 19.5, BLK, f); box(X0 + .02, y1 - .07, X1 - .02, y1 - .04, 18.5, 19.5, BLK, f);   // верхние трубы рамы
  box(X0 + .07, y1 - .14, X0 + .27, y1 - .04, 3 + jz, 7 + jz, STEEL, f);                                  // глушитель
  for (const wx of [X0 + .03, X1 - .13]) box(wx, y1 - .03, wx + .1, y1 + .02, 0, 3.6, [24, 24, 26], f);   // колёса
  const lx = SX(X1 - .06, my + .1), ly = SY(X1 - .06, my + .1, 10 + jz);
  ctx.fillStyle = on ? '#7bff6a' : '#5a1a14'; ctx.fillRect(lx - .9, ly - .9, 1.8, 1.8);
  if (on) { ctx.fillStyle = 'rgba(123,255,106,.25)'; ctx.fillRect(lx - 2.2, ly - 2.2, 4.4, 4.4); }
};
