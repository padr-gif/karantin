// ================= v49: свои значки на карте, тайники по запискам, город ветшает, шрамы, кошка =================

// ---- 3. значки на карте: сам решаешь, что отметить ----
const MARKT = {
  pin:{c:'#7fd0ff', g:'•', n:'Метка'}, done:{c:'#7bc46a', g:'✓', n:'Обыскано'}, danger:{c:'#e0523f', g:'!', n:'Опасно'},
  water:{c:'#4aa3e8', g:'≈', n:'Вода'}, back:{c:'#e7c531', g:'★', n:'Вернуться'}, home:{c:'#d8b48a', g:'⌂', n:'База'}, stash:{c:'#c98a3a', g:'✕', n:'Тайник'},
};
function drawMark(g, x, y, m) {
  const T = MARKT[m.t] || MARKT.pin;
  g.fillStyle = '#0c1012'; g.beginPath(); g.arc(x, y, 7, 0, 6.283); g.fill();
  g.fillStyle = T.c; g.beginPath(); g.arc(x, y, 5.6, 0, 6.283); g.fill();
  g.fillStyle = '#0c1012'; g.font = '700 8.5px "PT Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(T.g, x, y + .5);
  if (m.note) { g.fillStyle = 'rgba(12,16,18,.75)'; g.font = '600 9px "PT Sans", sans-serif'; g.textBaseline = 'top'; g.fillText(m.note, x, y + 8); }
}
let markPick = null;
mapPin = function (e, c) {
  const r = c.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  const m0 = c._m0, s = c._s, cw = c._cw; if (!s) return;
  const u = (mx - cw / 2) / s, v = my / (s / 2) + 2 * m0, x = (u + v) / 2, y = (v - u) / 2;
  world.marks = world.marks || [];
  const near = world.marks.findIndex(m => Math.hypot(m.x - x, m.y - y) < 3);
  if (markPick) markPick.remove();
  const box = markPick = document.createElement('div'); box.className = 'markpick';
  const host = document.body;
  box.style.left = Math.max(6, Math.min(innerWidth - 240, e.clientX - 118)) + 'px';
  box.style.top = (e.clientY + 140 < innerHeight ? e.clientY + 12 : Math.max(6, e.clientY - 140)) + 'px';
  const done = () => { box.remove(); markPick = null; drawMapCanvas(c); miniT = 0; };
  for (const k of ['done', 'danger', 'water', 'back', 'home', 'pin']) {
    const b = document.createElement('button'); b.type = 'button'; b.innerHTML = '<i style="background:' + MARKT[k].c + '">' + MARKT[k].g + '</i>' + MARKT[k].n;
    b.onclick = ev => { ev.stopPropagation(); if (near >= 0) world.marks.splice(near, 1); world.marks.push({x, y, t:k}); SFX.ui(); done(); };
    box.appendChild(b);
  }
  if (near >= 0) { const b = document.createElement('button'); b.type = 'button'; b.className = 'del'; b.textContent = 'Убрать метку'; b.onclick = ev => { ev.stopPropagation(); world.marks.splice(near, 1); SFX.ui(); done(); }; box.appendChild(b); }
  box.addEventListener('click', ev => ev.stopPropagation());
  host.appendChild(box);
};
{ const cp = closePanel; closePanel = function () { if (markPick) { markPick.remove(); markPick = null; } cp(); }; }

// ---- 2. тайники по запискам: человек закопал припасы у приметного места. Прочитал — знаешь примету, ищи и копай ----
const LANDMARK = {lamp:'фонарного столба', mail:'почтового ящика', bin:'мусорных баков', pump:'колонки на заправке', booth:'будки у блокпоста', car:'брошенной машины'};
const CACHE_LOOT = [['canned', 'canned', 'water', 'bandage', 'matches'], ['ammo9', 'mre', 'antibio', 'water'], ['stew', 'stew', 'vitamins', 'battery', 'candle'], ['medkit', 'painkill', 'water', 'choco'], ['jerky', 'crackers', 'tape', 'nails', 'water']];
function placeCaches() {
  world.caches = [];
  const marks = props.filter(p => LANDMARK[p.type] && insideFence(Math.floor(p.cx), Math.floor(p.cy)));
  for (let k = 0; k < 4 && marks.length; k++) {
    const p = marks.splice(Math.floor(rng() * marks.length), 1)[0];
    let spot = null;
    for (let t = 0; t < 40 && !spot; t++) {
      const a = rng() * 6.283, d = .9 + rng() * .7, x = p.cx + Math.cos(a) * d, y = p.cy + Math.sin(a) * d, i = Math.floor(y) * MW + Math.floor(x);
      if (!hAt[i] && !blocked(x, y, .25) && (map[i] === GRASS || map[i] === WALK || map[i] === ROAD)) spot = [x, y];
    }
    if (!spot) continue;
    const side = (dx, dy) => Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'с восточной стороны' : 'с западной стороны') : (dy > 0 ? 'с южной стороны' : 'с северной стороны');
    world.caches.push({id:'c' + k, x:spot[0], y:spot[1], lx:p.cx, ly:p.cy, lm:p.type, side:side(spot[0] - p.cx, spot[1] - p.cy), loot:CACHE_LOOT[k % CACHE_LOOT.length], read:false, dug:false});
  }
  // записки с приметами — в шкафах по городу
  const HOMEC = ['wdesk', 'nightstand', 'dresser', 'coffeetab', 'endtable', 'chest', 'cabinet'];
  const L = furns.filter(f => !f.gone && HOMEC.includes(f.type) && CONT[f.type] && hAt[f.y * MW + f.x] && hAt[f.y * MW + f.x] !== spawnHouse);
  for (const c of world.caches) {
    if (!L.length) break; const f = L.splice(Math.floor(rng() * L.length), 1)[0];
    if (!f.items) { f.items = []; const C = CONT[f.type]; for (let n = ri(C.n[0], C.n[1]); n > 0; n--) f.items.push(mkItem(pick(C.loot))); }
    const it = mkItem('note'); it.cache = c.id; it.text = cacheText(c); f.items.push(it);
  }
}
function cacheText(c) {
  const lead = ['Закопал всё, что осталось', 'Спрятал припасы на чёрный день', 'Если не вернусь — пусть кому-то пригодится'];
  return lead[c.id.charCodeAt(1) % lead.length] + ': у ' + LANDMARK[c.lm] + ', в шаге от него. Земля там рыхлая — заметишь.';
}
{ const ng = newGame; newGame = function (o) { const r = ng(o); if (!(o && o.save)) placeCaches(); return r; }; }
{ const rp = renderPanel;
  renderPanel = function () {
    rp();
    if (!panel || panel.kind !== 'note' || !panel.it || !panel.it.cache) return;
    const c = (world.caches || []).find(c => c.id === panel.it.cache); if (!c) return;
    $('pnTitle').textContent = 'Записка с приметами'; $('pnSub').textContent = 'кто-то спрятал припасы';
    const body = $('pnBody'); body.textContent = ''; const pg = mk('div', 'diary snote'); pg.appendChild(mk('p', 'dline', panel.it.text));
    if (c.dug) pg.appendChild(mk('p', 'dline dsub', 'Этот тайник уже раскопан.'));
    else pg.appendChild(mk('p', 'dline dsub', 'Примета отмечена на карте. Подойди и копай рядом.'));
    body.appendChild(pg);
    if (!c.read) { c.read = true; world.marks = world.marks || []; world.marks.push({x:c.lx, y:c.ly, t:'stash', cid:c.id}); logEv('Нашёл записку с приметами тайника'); }
  };
}
function nearCache() { return (world.caches || []).find(c => c.read && !c.dug && Math.hypot(c.x - P.x, c.y - P.y) < 1.3); }
{ const ga = getActions;
  getActions = function () { const out = ga(), c = mode === 'play' && !P.car && nearCache(); if (c) out.push({kind:'digcache', label:'Раскопать тайник', f:{type:'cache', cx:c.x, cy:c.y}, c}); return out; };
  const da = doAction;
  doAction = function (a0) {
    if (!(a0 && a0.kind === 'digcache')) return da(a0);
    if (mode !== 'play' || paused || panel || P.sleep) return;
    $('actMenu').hidden = true;
    const c = a0.c, shovel = P.weapon && P.weapon.id === 'shovel' || P.inv.some(i => i.id === 'shovel');
    job(shovel ? 4 : 9, () => {
      c.dug = true; for (const id of c.loot) addToPile(c.x, c.y, mkItem(id));
      world.marks = (world.marks || []).filter(m => m.cid !== c.id);
      SFX.rustle(); toast('Под землёй — свёрток в клеёнке. Припасы на земле рядом'); logEv('Раскопал чужой тайник');
    }, {an:'searchlow', noisy:1});
    toast(shovel ? 'Копаешь лопатой…' : 'Копаешь руками — без лопаты долго');
  };
  const an = actName; actName = function (a) { return a && a.kind === 'digcache' ? 'Тайник' : an(a); };
  const ai = actIcon; actIcon = function (a) { return a && a.kind === 'digcache' ? 'i-search' : ai(a); };
}
// раскопанная земля / рыхлое пятно, если знаешь, где искать
function drawCache(c) {
  {
    const i = Math.floor(c.y) * MW + Math.floor(c.x); if (!vis[i]) return;
    const sx = SX(c.x, c.y), sy = SY(c.x, c.y, 0);
    ctx.fillStyle = c.dug ? 'rgba(70,48,30,.75)' : 'rgba(92,66,42,.45)'; ctx.beginPath(); ctx.ellipse(sx, sy, 7, 3, 0, 0, 6.283); ctx.fill();
    if (c.dug) { ctx.fillStyle = 'rgba(40,28,18,.8)'; ctx.beginPath(); ctx.ellipse(sx, sy, 3.5, 1.5, 0, 0, 6.283); ctx.fill(); }
  }
}

// ---- 4. город ветшает: каждый день где-то бьются окна, разграблены машины, на улицах больше следов ----
function decayDay() {
  const far = (x, y) => Math.hypot(x - P.x, y - P.y) > 14;
  let w = 0;
  for (let t = 0; t < 400 && w < 3; t++) {
    const i = Math.floor(rng() * NT), o = obs[i]; if (!o || map[i] !== WIN || o.broken || o.bhp > 0) continue;
    const x = i % MW, y = (i / MW) | 0; if (!far(x, y) || hAt[i] === hAt[Math.floor(P.y) * MW + Math.floor(P.x)]) continue;
    o.broken = true; o.open = false; w++;
  }
  const cars = props.filter(p => p.type === 'car' && !p.searched && far(p.cx, p.cy));
  for (let k = 0; k < 2 && cars.length; k++) { const p = cars.splice(Math.floor(rng() * cars.length), 1)[0]; p.searched = true; p.items = (p.items || []).filter(() => rng() < .3); }
  for (let k = 0; k < 4; k++) {
    for (let t = 0; t < 40; t++) { const x = 4 + rng() * (MW - 8), y = 4 + rng() * (MH - 8), i = Math.floor(y) * MW + Math.floor(x); if (!far(x, y) || (map[i] !== ROAD && map[i] !== WALK)) continue; addBlood(x, y, .7 + rng() * .5); break; }
  }
  if (corpses.length < 110 && rng() < .6) for (let t = 0; t < 40; t++) {
    const x = 4 + rng() * (MW - 8), y = 4 + rng() * (MH - 8), i = Math.floor(y) * MW + Math.floor(x); if (!far(x, y) || (map[i] !== ROAD && map[i] !== WALK)) continue;
    corpses.push({x, y, face:rng() * 6.28, pal:zPal(), fall:1, dir:-1, seed:rng()}); addBlood(x, y, 1); break;
  }
  clearCaches(); fogDirty = true;
}
{ let lastD = null;
  onUpdate(dt => {
    if (mode !== 'play' || !P) return;
    const d = Math.floor(gameMin / 1440);
    if (lastD == null) lastD = world.decayDay != null ? world.decayDay : d;
    if (d > lastD) { for (let k = lastD; k < d && k < lastD + 3; k++) decayDay(); lastD = d; world.decayDay = d; }
  });
  const sn = startNew; startNew = function () { sn(); lastD = null; world.decayDay = null; };
  const as = applySave; applySave = function (d) { as(d); lastD = null; };
}

// ---- 5. шрамы: зажившая рана оставляет след на теле и строчку в истории ----
const SCAR_REG = {'левая рука':'armL', 'правая рука':'armR', 'левая нога':'legL', 'правая нога':'legR', 'грудь':'chest', 'спина':'chest', 'живот':'belly', 'голова':'head', 'шея':'neck'};
const SCAR_AT = {head:[70, 18], neck:[70, 40], chest:[70, 62], belly:[70, 93], armR:[37, 86], armL:[103, 86], legR:[58, 148], legL:[82, 148]};
{ const aw = addWound;
  addWound = function (k, part, where) {
    const w = aw(k, part, where); if (!w) return w;
    w.day = Math.floor((gameMin - startMin) / 1440) + 1;
    w.ctx = P.act && P.act.kind === 'vault' ? 'когда лез через окно' : zs.some(z => Math.hypot(z.x - P.x, z.y - P.y) < 1.6) ? 'в драке с мертвецом' : insideHouse(P.x, P.y) ? 'в доме' : 'на улице';
    return w;
  };
}
{ const tw = tickWounds;
  tickWounds = function (gm) {
    const before = wounds().slice();
    tw(gm);
    const now = wounds();
    for (const w of before) if (!now.includes(w) && w.h >= 1 && w.k !== 'scratch') {
      P.scars = P.scars || [];
      const D = WOUND[w.k], seed = (P.scars.length * 37 + (w.where || '').length * 11) % 100;
      P.scars.push({k:w.k, where:w.where, day:w.day || Math.floor((gameMin - startMin) / 1440) + 1, ctx:w.ctx || '', s:seed});
      logEv('Остался шрам: ' + D.name.toLowerCase() + ', ' + w.where);
    }
  };
}
{ const bs = bodySvg;
  bodySvg = function (sel) {
    let s = bs(sel);
    const sc = (P && P.scars) || []; if (!sc.length) return s;
    let d = '', st = '';
    for (const c of sc) {
      const r = SCAR_REG[c.where], at = r && SCAR_AT[r]; if (!at) continue;
      const ox = ((c.s % 10) - 5) * .9, oy = ((Math.floor(c.s / 10) % 10) - 5) * 1.2, a = (c.s % 7) / 7 * 1.6 - .8, L = c.k === 'bite' ? 4 : 6;
      const x0 = at[0] + ox - Math.cos(a) * L, y0 = at[1] + oy - Math.sin(a) * L, x1 = at[0] + ox + Math.cos(a) * L, y1 = at[1] + oy + Math.sin(a) * L;
      if (c.k === 'bite') d += `M${x0} ${y0} Q${at[0] + ox} ${at[1] + oy + 3} ${x1} ${y1} M${x0} ${y0 + 2} Q${at[0] + ox} ${at[1] + oy - 1} ${x1} ${y1 + 2} `;
      else { d += `M${x0} ${y0} L${x1} ${y1} `; for (let q = -1; q <= 1; q++) { const mx = at[0] + ox + Math.cos(a) * q * 3.5, my = at[1] + oy + Math.sin(a) * q * 3.5; st += `M${mx - Math.sin(a) * 1.6} ${my + Math.cos(a) * 1.6} L${mx + Math.sin(a) * 1.6} ${my - Math.cos(a) * 1.6} `; } }
    }
    const g = `<g class="scars" pointer-events="none"><path d="${d}" fill="none" stroke="#2a1410" stroke-width="2.2" stroke-linecap="round" opacity=".5"/><path d="${d}" fill="none" stroke="#e0a090" stroke-width="1.2" stroke-linecap="round"/><path d="${st}" stroke="#7a3a30" stroke-width=".7" stroke-linecap="round"/></g>`;
    const k = s.indexOf('<g pointer-events="none">');
    return k > 0 ? s.slice(0, k) + g + s.slice(k) : s.replace('</svg>', g + '</svg>');
  };
}
{ const bs = buildSelf;
  buildSelf = function (body) {
    bs(body);
    const sc = (P && P.scars) || []; if (!sc.length) return;
    const box = mk('div', 'scarlist'); box.appendChild(mk('div', 'sect', 'Шрамы · ' + sc.length));
    for (const c of sc.slice(-8).reverse()) box.appendChild(mk('p', '', (WOUND[c.k] ? WOUND[c.k].name : 'Рана') + ', ' + c.where + ' — день ' + c.day + (c.ctx ? ', ' + c.ctx : '')));
    body.appendChild(box);
  };
}

// ---- 6. кошка: живёт в чьём-то доме. Прикорми — переедет к тебе: спит на кровати, мурчит, снимает тоску, просит есть ----
const CAT_NAMES = ['Мурка', 'Васька', 'Барсик', 'Дымка', 'Рыжик', 'Муся', 'Пушок'];
const CAT_FOOD = new Set(['fish', 'fishC', 'tuna', 'sprats', 'meat', 'sausage', 'milk', 'condmilk', 'salo', 'steak', 'jerky', 'fishJ']);
const CAT_COL = [['#8a8a86', '#5e5e5a', '#b4b4ae'], ['#c8782a', '#9a5418', '#e8a868'], ['#2a2626', '#141212', '#4a4444'], ['#e8e4da', '#b8b2a4', '#ffffff']];
let cats = [];
function placeCats() {
  cats = [];
  const homes = houses.map((H, k) => [H, k]).filter(([H, k]) => H.kind === 'house' && H.rooms && k + 1 !== spawnHouse && !H.hideout);
  for (let n = 0; n < 2 && homes.length; n++) {
    const [H, hk] = homes.splice(Math.floor(rng() * homes.length), 1)[0];
    const p = houseFloor(H); if (!p) continue;
    cats.push({x:p[0], y:p[1], tx:p[0], ty:p[1], face:0, home:hk, base:hk, st:'wild', trust:0, fedAt:-1e9, petT:-1e9, askT:0, name:CAT_NAMES.filter(n => !cats.some(c => c.name === n))[Math.floor(rng() * (CAT_NAMES.length - cats.length))], col:Math.floor(rng() * CAT_COL.length), mv:0, step:0, nap:0});
  }
}
function houseFloor(H) { for (let t = 0; t < 80; t++) { const x = ri(H.x + 1, H.x + H.w - 2), y = ri(H.y + 1, H.y + H.h - 2), i = y * MW + x; if (map[i] === FLOOR && !furn[i]) return [x + .5, y + .5]; } return null; }
{ const ng = newGame; newGame = function (o) { const r = ng(o); if (!(o && o.save)) placeCats(); return r; }; }
function catMove(c, tx, ty, sp, dt) {
  const dx = tx - c.x, dy = ty - c.y, l = Math.hypot(dx, dy); if (l < .08) { c.mv = 0; return true; }
  const s = Math.min(l, sp * dt), mx = dx / l * s, my = dy / l * s; let moved = false;
  if (!blocked(c.x + mx, c.y, .15)) { c.x += mx; moved = true; } if (!blocked(c.x, c.y + my, .15)) { c.y += my; moved = true; }
  c.face = Math.atan2(dy, dx); c.mv = moved ? s / dt : 0; c.step += s * 12; return !moved;
}
{ let catFx = 0;
  onUpdate(dt => {
    if (mode !== 'play' || !P || paused) return;
    const pHouse = hAt[Math.floor(P.y) * MW + Math.floor(P.x)] - 1, inHouse = pHouse >= 0 && insideHouse(P.x, P.y);
    if (P.sleep && inHouse) for (const c of cats) if (c.st === 'friend') c.base = pHouse;                     // где спишь — там и дом
    for (const c of cats) {
      const H = houses[c.st === 'friend' ? c.base : c.home]; if (!H) continue;
      const dP = Math.hypot(c.x - P.x, c.y - P.y);
      // своя приходит к тебе, когда ты в доме-базе; если её не видно — просто оказывается рядом
      if (c.st === 'friend' && inHouse && pHouse === c.base && hAt[Math.floor(c.y) * MW + Math.floor(c.x)] - 1 !== pHouse) { const p = houseFloor(houses[pHouse]); if (p && !vis[Math.floor(p[1]) * MW + Math.floor(p[0])]) { c.x = p[0]; c.y = p[1]; } }
      if (c.nap > 0) { c.nap -= dt; c.mv = 0; continue; }
      if (c.st === 'wild' && dP < 2.4 && !c.trust) { catMove(c, c.x + (c.x - P.x), c.y + (c.y - P.y), 2.2, dt); continue; }   // дикая — держится подальше
      if (c.st === 'friend' && inHouse && pHouse === c.base && dP > 3 && rng() < .5) { catMove(c, P.x, P.y, 1.4, dt); continue; }
      const stuck = catMove(c, c.tx, c.ty, .6, dt);
      if (stuck || rng() < dt * .08) {
        if (rng() < .35) { c.nap = 6 + rng() * 14; const bed = furns.find(f => !f.gone && (f.type === 'bed' || f.type === 'sofa' || f.type === 'armchair') && hAt[f.y * MW + f.x] - 1 === (c.st === 'friend' ? c.base : c.home)); if (bed && rng() < .6) { c.x = bed.cx; c.y = bed.cy; c.onBed = true; } else c.onBed = false; }
        else { const p = houseFloor(H); if (p) { c.tx = p[0]; c.ty = p[1]; c.onBed = false; } }
      }
    }
    // рядом своя кошка — тоска и стресс уходят понемногу; голодная — просит
    catFx += dt; if (catFx < 1) return; catFx = 0;
    for (const c of cats) {
      if (c.st !== 'friend') continue;
      const near = Math.hypot(c.x - P.x, c.y - P.y) < 6 && inHouse && pHouse === c.base;
      if (near) { P.unh = Math.max(0, (P.unh || 0) - .12); P.stress = Math.max(0, (P.stress || 0) - .05); }
      const hungry = gameMin - c.fedAt;
      if (hungry > 1440 && near && gameMin - c.askT > 180) { c.askT = gameMin; toast(c.name + ' трётся о ноги и требует еды'); }
      if (hungry > 2880) { c.st = 'wild'; c.trust = 0; const p = houseFloor(houses[c.home]); if (p) { c.x = p[0]; c.y = p[1]; c.tx = p[0]; c.ty = p[1]; } toast(c.name + ' ушла: два дня без еды'); logEv(c.name + ' ушла из дома — я её не кормил'); }
    }
  });
}
function catNear() { return cats.find(c => Math.hypot(c.x - P.x, c.y - P.y) < 1.8 && vis[Math.floor(c.y) * MW + Math.floor(c.x)]); }
{ const ga = getActions;
  getActions = function () {
    const out = ga(), c = mode === 'play' && !P.car && catNear(); if (!c) return out;
    const food = P.inv.some(it => CAT_FOOD.has(it.id)), f = {type:'cat', cx:c.x, cy:c.y};
    if (c.st === 'wild') out.push({kind:'catfeed', label:food ? 'Угостить кошку' : 'Кошке нужна рыба или мясо', f, c});
    else { if (food && gameMin - c.fedAt > 600) out.push({kind:'catfeed', label:'Покормить', f, c}); out.push({kind:'catpet', label:'Погладить', f, c}); }
    return out;
  };
  const da = doAction;
  doAction = function (a0) {
    if (!(a0 && (a0.kind === 'catfeed' || a0.kind === 'catpet'))) return da(a0);
    if (mode !== 'play' || paused || panel || P.sleep) return;
    $('actMenu').hidden = true; const c = a0.c;
    if (a0.kind === 'catpet') {
      if (gameMin - c.petT < 120) { toast(c.name + ' жмурится и мурчит'); return; }
      c.petT = gameMin; c.nap = 4; P.unh = Math.max(0, (P.unh || 0) - 15); P.stress = Math.max(0, (P.stress || 0) - 8); SFX.rustle(); toast('Погладил ' + c.name + '. Мурчит — и на душе теплее'); return;
    }
    const k = P.inv.findIndex(it => CAT_FOOD.has(it.id)); if (k < 0) { toast('Кошка ест рыбу, мясо, колбасу или молоко'); return; }
    P.inv.splice(k, 1); c.fedAt = gameMin; c.nap = 3; SFX.rustle();
    if (c.st === 'wild') {
      c.trust++;
      if (c.trust >= 2) { c.st = 'friend'; const ph = hAt[Math.floor(P.y) * MW + Math.floor(P.x)] - 1; if (ph >= 0) c.base = ph; eventBanner('Кошка ' + c.name, 'Теперь живёт с тобой: там, где ты спишь. Корми раз в день — и рядом с ней тоска уходит.', 'gold', 'i-heart'); logEv('Приручил кошку. Назвал ' + c.name); }
      else toast('Съела и не убежала. Ещё раз — и подпустит');
    } else toast(c.name + ' довольна');
    renderInv();
  };
  const an = actName; actName = function (a) { return a && a.f && a.f.type === 'cat' ? (a.c && a.c.st === 'friend' ? a.c.name : 'Кошка') : an(a); };
  const ai = actIcon; actIcon = function (a) { return a && (a.kind === 'catfeed' || a.kind === 'catpet') ? 'i-heart' : ai(a); };
}
// пиксельная кошка: сидит, идёт (2 кадра), спит клубком
const catArt = (() => {
  const cache = {};
  return k => {
    if (cache[k]) return cache[k];
    const [F, D, L] = CAT_COL[k];
    cache[k] = [0, 1, 2, 3].map(fr => {
      const W = 26, H = 20, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
      const el = (x, y, rx, ry, c, r) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, r || 0, 0, 6.283); g.fill(); };
      const ln = (x0, y0, x1, y1, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
      const ear = (x, y) => { g.fillStyle = F; g.beginPath(); g.moveTo(x - 1.6, y + 1); g.lineTo(x, y - 2.6); g.lineTo(x + 1.6, y + 1); g.fill(); };
      if (fr === 3) {                                                             // спит клубком
        el(13, 14, 8, 4.2, F); el(9, 13.5, 4, 3.2, F); ear(7.5, 10.5); ear(10.5, 10.5); ln(20, 14, 12, 18, 2, D); el(13, 12.2, 6, 1.4, L);
        g.fillStyle = D; g.fillRect(7, 13, 1.5, .8); g.fillRect(10, 13, 1.5, .8);
      } else if (fr === 0) {                                                      // сидит
        ln(16, 17, 22, 13, 2, F); ln(22, 13, 22, 9, 2, F);
        el(13, 13, 5, 5, F); el(12, 9.5, 3.5, 3.5, F); el(12.5, 7, 3.2, 2.8, F); ear(10.6, 4.6); ear(14.2, 4.6);
        ln(11, 11, 11, 18, 2, F); ln(14, 11, 14, 18, 2, D); el(12.5, 12, 1.8, 3, L);
        g.fillStyle = '#d6c040'; g.fillRect(11, 6.5, 1, 1); g.fillRect(13.6, 6.5, 1, 1);
      } else {                                                                    // идёт
        const sw = fr === 1 ? 1.6 : -1.6;
        ln(5, 11, 2, 6, 2, F);
        for (const [x, s2, c] of [[7, -sw, F], [9.5, sw, D], [16, sw, F], [18.5, -sw, D]]) ln(x, 13, x + s2, 18, 2, c);
        el(12.5, 11.5, 7.5, 3.4, F); el(12.5, 13.6, 5.5, 1.3, L); el(20, 8.6, 3.2, 3, F); ear(18.6, 5.8); ear(21.4, 5.8);
        g.fillStyle = '#d6c040'; g.fillRect(21, 8, 1, 1);
      }
      const im = g.getImageData(0, 0, W, H), a = im.data, M = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) { M[i] = a[i * 4 + 3] > 110 ? 1 : 0; a[i * 4 + 3] = M[i] ? 255 : 0; }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (M[i]) continue; if ((x > 0 && M[i - 1]) || (x < W - 1 && M[i + 1]) || (y > 0 && M[i - W]) || (y < H - 1 && M[i + W])) { a[i * 4] = 27; a[i * 4 + 1] = 21; a[i * 4 + 2] = 18; a[i * 4 + 3] = 255; } }
      g.putImageData(im, 0, 0); return cv;
    });
    return cache[k];
  };
})();
function drawCat(c) {
  if (!vis[Math.floor(c.y) * MW + Math.floor(c.x)]) return;
  const A = catArt(c.col), fr = c.nap > 0 ? A[3] : c.mv > .1 ? A[1 + (Math.floor(c.step) & 1)] : A[0];
  const sx = Math.round(SX(c.x, c.y)), sy = Math.round(SY(c.x, c.y, c.onBed ? U * .32 : 0));
  const left = Math.cos(c.face) - Math.sin(c.face) < 0;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(sx, sy, 8, 2.6, 0, 0, 6.283); ctx.fill();
  ctx.save(); ctx.translate(sx, sy - fr.height + 2); if (left) ctx.scale(-1, 1); ctx.drawImage(fr, -Math.floor(fr.width / 2), 0); ctx.restore();
}
{ const ex = typeof extraDl === 'function' ? extraDl : null;
  extraDl = function (dl) {
    if (ex) ex(dl);
    if (mode === 'menu') return;
    for (const c of cats) dl.push({d:c.x + c.y + (c.onBed ? .6 : .01), k:99, fn:() => drawCat(c)});
    for (const c of world.caches || []) if (c.read) dl.push({d:c.x + c.y - .6, k:99, fn:() => drawCache(c)});
  };
}

// ---- сохранение ----
{ const ser = serialize;
  serialize = function () { const d = ser(); d.x49 = {caches:world.caches || [], cats, scars:P.scars || [], decay:world.decayDay != null ? world.decayDay : null}; return d; };
  const as = applySave;
  applySave = function (d) { as(d); const x = d && d.x49; if (x) { world.caches = x.caches || []; cats = x.cats || []; P.scars = x.scars || []; world.decayDay = x.decay; } else { world.caches = []; cats = []; } };
  const sn = startNew; startNew = function () { sn(); if (P) P.scars = []; };
}

// копать — присев
{ const pa = playerAnim; playerAnim = function (pAtk) { const A = P.act; if (pAtk < 0 && A && A.kind === 'job' && A.an === 'searchlow' && heroMale() && AN('p', 'searchlow') > 1) return pmLoop('searchlow'); return pa(pAtk); }; }
// тап мимо — закрыть выбор значка
addEventListener('pointerdown', e => { if (markPick && !markPick.contains(e.target) && !(e.target && e.target.tagName === 'CANVAS' && e.target.closest('#pnBody'))) { markPick.remove(); markPick = null; } }, true);
