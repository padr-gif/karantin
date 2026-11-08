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
