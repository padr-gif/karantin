// ================= interface 2.0 — context actions, tap-to-interact, hotbar, minimap, map pins, loot markers =================
const actTarget = a => a.tk || (a.o ? obs[a.o.i] : a.f);
const actPos = a => a.o ? [a.o.x + .5, a.o.y + .5] : a.f ? [a.f.cx != null ? a.f.cx : a.f.x, a.f.cy != null ? a.f.cy : a.f.y] : [P.x, P.y];
function getActions() {
  const out = [], excl = new Set(), seenK = new Set();
  for (let k = 0; k < 7; k++) {
    const a = getAction(excl); if (!a) break;
    const t = actTarget(a), key = a.kind + '|' + a.label + '|' + actPos(a).map(v => Math.round(v * 2)).join(',');
    if (t) { if (excl.has(t)) break; excl.add(t); }
    if (seenK.has(key)) break; seenK.add(key);
    out.push(a);
    if (a.kind === 'exit') break;
  }
  // одинаковые по виду (одна подпись у одной цели) — один раз
  const seen2 = new Set(), list = [];
  for (const a of out) { const k = a.label + '|' + actName(a); if (seen2.has(k)) continue; seen2.add(k); list.push(a); }
  for (const f of ACT_SOURCES) f(list);
  return list;
}
// ---- action list popup ----
function openActMenu() {
  const list = getActions(), box = $('actMenu');
  if (list.length < 2) { box.hidden = true; return; }
  box.textContent = '';
  for (const a of list) {
    const verb = a.label.charAt(0).toUpperCase() + a.label.slice(1), name = actName(a), b = mk('button', 'actItem'); b.type = 'button';
    b.appendChild(svgIc(actIcon(a))); const tx = mk('span'); tx.appendChild(mk('b', '', verb)); if (name) tx.appendChild(mk('small', '', name)); b.appendChild(tx);
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); box.hidden = true; doAction(a); });
    box.appendChild(b);
  }
  box.classList.toggle('hi', !$('bBar').hidden && !$('bAct').classList.contains('off'));
  box.hidden = false;
}
// ---- tap / click on the world ----
let goTo = null;
function worldFromScreen(cx, cy) { const r = cv.getBoundingClientRect(), k = DEV / SCALE; return screenToWorld((cx - r.left) * k, (cy - r.top) * k + U * .9 * 0); }
function tapWorld(cx, cy) {
  if (EDIT.on) return editorTap(cx, cy);                                     // обустройство: тап выбирает и ставит мебель
  for (const fn of TAPS) if (fn(cx, cy)) return true;                         // редакторы и прочее (onTap)
  if (P.car) return false;
  const [wx, wy] = worldFromScreen(cx, cy);
  // nearest interactable around the tapped point
  let best = null, bd = 1.4;
  for (const a of getActions()) { const [x, y] = actPos(a), d = Math.hypot(x - wx, y - wy); if (d < bd) { bd = d; best = a; } }
  if (best) { doAction(best); return true; }
  // tapping somewhere further away no longer walks you there: you move with the stick only
  return false;
}
let tapMark = null;
function updateGoTo(dt) {
  if (!goTo) return null;
  goTo.time -= dt;
  const reach = getActions().find(a => actTarget(a) === goTo.t);
  if (reach) { const g = goTo; goTo = null; doAction(reach); return null; }
  if (goTo.time <= 0 || P.car) { goTo = null; return null; }
  while (goTo.path && goTo.path.length && Math.hypot(goTo.path[0][0] - P.x, goTo.path[0][1] - P.y) < .45) goTo.path.shift();
  const [qx, qy] = goTo.path && goTo.path.length ? goTo.path[0] : [goTo.x, goTo.y];
  { const i = Math.floor(qy) * MW + Math.floor(qx), o = obs[i]; if (map[i] === DOOR && o && !o.open && Math.hypot(qx - P.x, qy - P.y) < 1.3) { o.open = true; SFX.door(true); noise(P.x, P.y, 2.5); } }
  const dx = qx - P.x, dy = qy - P.y, l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}
// ---- loot markers above unsearched containers ----
// мебель и машины в квадрате 21×21 вокруг героя; пересчёт, только когда герой перешёл в другую клетку (или раз в секунду)
const LN = {k:-1, t:0, f:[], p:[]};
function lootNear() {
  const px = Math.floor(P.x), py = Math.floor(P.y), k = py * MW + px;
  if (k === LN.k && animT - LN.t < 1) return LN;
  LN.k = k; LN.t = animT; LN.f = []; LN.p = [];
  const sf = new Set(), sp = new Set();
  for (let y = Math.max(0, py - 10); y <= Math.min(MH - 1, py + 10); y++) for (let x = Math.max(0, px - 10); x <= Math.min(MW - 1, px + 10); x++) {
    const i = y * MW + x;
    if (furn[i]) sf.add(furns[furn[i] - 1]);
    if (propAt[i]) { const p = props[propAt[i] - 1]; if (p && p.type === 'car') sp.add(p); }
  }
  for (const p of typeof dynCars !== 'undefined' ? dynCars : []) if (Math.abs(p.cx - P.x) < 10 && Math.abs(p.cy - P.y) < 10) sp.add(p);
  LN.f = [...sf].filter(Boolean); LN.p = [...sp]; return LN;
}
function drawLootMarks() {
  if (mode !== 'play') return;
  const pulse = .6 + .4 * Math.sin(animT * 4);
  const mark = (x, y, z, col) => { const sx = SX(x, y), sy = SY(x, y, z); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(sx, sy - 3); ctx.lineTo(sx + 2.4, sy); ctx.lineTo(sx, sy + 3); ctx.lineTo(sx - 2.4, sy); ctx.closePath(); ctx.fill(); };
  // только клетки вокруг героя (раньше — вся мебель и все предметы города каждый кадр)
  const near = lootNear();
  for (const f of near.f) {
    if (f.searched || !CONT[f.type] || !CONT[f.type].loot) continue;
    if (Math.abs(f.cx - P.x) > 9 || Math.abs(f.cy - P.y) > 9 || !vis[f.y * MW + f.x]) continue;
    mark(f.cx, f.cy, 38, `rgba(232,180,70,${pulse})`);
  }
  for (const p of near.p) if (p.type === 'car' && !p.searched && Math.abs(p.cx - P.x) < 9 && Math.abs(p.cy - P.y) < 9 && vis[Math.floor(p.cy) * MW + Math.floor(p.cx)]) mark(p.cx, p.cy, 58, `rgba(232,180,70,${pulse})`);
  if (tapMark && tapMark.t > 0) { const sx = SX(tapMark.x, tapMark.y), sy = SY(tapMark.x, tapMark.y, 0); ctx.strokeStyle = `rgba(232,180,70,${tapMark.t})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(sx, sy, 10 * (1.4 - tapMark.t * .5), 5 * (1.4 - tapMark.t * .5), 0, 0, 6.283); ctx.stroke(); }
  if (goTo) { const sx = SX(goTo.x, goTo.y), sy = SY(goTo.x, goTo.y, 0); ctx.strokeStyle = 'rgba(232,180,70,.8)'; ctx.setLineDash([2, 2]); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(SX(P.x, P.y), SY(P.x, P.y, 0)); ctx.lineTo(sx, sy); ctx.stroke(); ctx.setLineDash([]); }
}
// ---- hotbar ----
const HOT = [
  {id:'food', label:'Еда', pick:() => P.inv.map((it, k) => [it, k]).filter(([it]) => ITEMS[it.id].kind === 'food' && !ITEMS[it.id].rawRisk && !isRotten(it)).sort((a, b) => (ITEMS[b[0].id].sat || 0) - (ITEMS[a[0].id].sat || 0))[0]},
  {id:'drink', label:'Вода', pick:() => P.inv.map((it, k) => [it, k]).filter(([it]) => (ITEMS[it.id].kind === 'drink' && !ITEMS[it.id].dirty && it.id !== 'whiskey') || (ITEMS[it.id].kind === 'canteen' && it.w > 0)).sort((a, b) => (ITEMS[b[0].id].hyd || 30) - (ITEMS[a[0].id].hyd || 30))[0]},
  {id:'med', label:'Лечение', pick:() => { const L = P.inv.map((it, k) => [it, k]); return (P.bleed && L.find(([it]) => it.id === 'antisep' || it.id === 'bandage' || it.id === 'medkit')) || L.find(([it]) => it.id === 'medkit') || L.find(([it]) => it.id === 'bandage') || L.find(([it]) => it.id === 'pills'); }},
  {id:'throw', label:'Бросок', pick:() => { const L = P.inv.map((it, k) => [it, k]); for (const id of ['molotov', 'flare', 'alarm', 'bottle']) { const f = L.find(([it]) => it.id === id); if (f) return f; } }},
  {id:'light', label:'Свет', pick:() => P.inv.map((it, k) => [it, k]).find(([it]) => it.id === 'flashlight')},
];
let hotKey = '';
function renderHotbar() {
  const bar = $('hotbar'); if (!bar || mode !== 'play') return;
  const picks = HOT.map(h => h.pick());
  const key = picks.map((p, i) => p ? p[0].id + (p[0].on ? 'on' : '') + countItem(p[0].id) + (p[0].w || '') + (p[0].uses || '') : '-').join('|') + (P.car ? 'car' : '');
  if (key === hotKey) return; hotKey = key; bar.textContent = '';
  HOT.forEach((h, i) => {
    const p = picks[i], b = mk('button', 'hslot' + (p ? '' : ' empty') + (p && p[0].on ? ' on' : '')); b.type = 'button';
    b.title = h.label + (p ? ': ' + ITEMS[p[0].id].name : '');
    if (p) { b.appendChild(iconEl(p[0].id, 28)); const n = countItem(p[0].id); if (n > 1) b.appendChild(mk('span', 'cnt', n)); }
    else b.appendChild(svgIc(HOTIC[h.id]));
    b.appendChild(mk('span', 'hl', h.label));
    b.appendChild(mk('span', 'hk', String(i + 1)));
    b.addEventListener('pointerdown', e => { e.preventDefault(); useHot(i); });
    bar.appendChild(b);
  });
}
function useHot(i) {
  if (mode !== 'play' || paused || P.sleep) return;
  const p = HOT[i].pick(); if (!p) { toast(HOT[i].label + ': ничего нет'); return; }
  const [it, k] = p; SFX.ui();
  if (it.id === 'flashlight') useItem(null, k); else beginUse(k);
  hotKey = ''; renderHotbar();
}
// ---- minimap ----
let miniT = 0;
function drawMinimap(dt) {
  const c = $('mini'); if (uiOff) return;
  if (!c || mode !== 'play' || settings.mini === false) { if (c) c.hidden = true; return; }
  c.hidden = false; miniT -= dt; if (miniT > 0) return; miniT = .2;
  const dpr = Math.min(2, devicePixelRatio || 1), S = 100; if (c.width !== S * dpr) { c.width = c.height = S * dpr; }
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, S, S);
  g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 1, 0, 6.283); g.clip();
  g.fillStyle = '#0c1012'; g.fillRect(0, 0, S, S);
  const R = 21, s = 2.3, cx = S / 2, cy = S / 2, px = P.x, py = P.y;
  for (let y = Math.floor(py - R); y <= py + R; y++) for (let x = Math.floor(px - R); x <= px + R; x++) {
    if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
    const i = y * MW + x; if (!seen[i] && !P.mapRead) continue;
    const dx = x + .5 - px, dy = y + .5 - py, sx = cx + (dx - dy) * s, sy = cy + (dx + dy) * s / 2;
    g.globalAlpha = seen[i] ? (vis[i] ? 1 : .7) : .35; g.fillStyle = soilCol(i); g.fillRect(sx - s, sy - s / 2, s * 2, s);
  }
  g.globalAlpha = 1;
  const dot = (x, y, r, col) => { const dx = x - px, dy = y - py, sx = cx + (dx - dy) * s, sy = cy + (dx + dy) * s / 2; g.fillStyle = col; g.beginPath(); g.arc(sx, sy, r, 0, 6.283); g.fill(); };
  for (const f of fires) if (!f.out) dot(f.x, f.y, 2.5, '#ff9a3c');
  for (const m of world.marks || []) dot(m.x, m.y, 3, (MARKT[m.t] || MARKT.pin).c);
  for (const a of airdrops) if (a.landed && !(a.f && a.f.searched)) dot(a.x, a.y, 3, '#f2ead8');
  for (const z of zs) { const i = Math.floor(z.y) * MW + Math.floor(z.x); if (vis[i] && Math.abs(z.x - px) < R && Math.abs(z.y - py) < R && (zAlpha(z) || 1) >= .5) dot(z.x, z.y, 1.8, '#e8473a'); }
  for (const s of stashes) if (!s.gone) dot(s.cx, s.cy, 2, '#c9a46a');
  if (heli) dot(heli.x, heli.y, 4, '#d6e4ff');
  // player arrow
  const a = P.car ? P.car.ang : (P.fd != null ? P.fd : P.face), fx = Math.cos(a), fy = Math.sin(a), ax = (fx - fy), ay = (fx + fy) / 2, l = Math.hypot(ax, ay) || 1;
  g.translate(cx, cy); g.rotate(Math.atan2(ay / l, ax / l)); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, 4); g.lineTo(-2, 0); g.lineTo(-4, -4); g.closePath(); g.fill();
  g.restore();
  g.strokeStyle = 'rgba(221,214,198,.35)'; g.lineWidth = 1; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 1, 0, 6.283); g.stroke();
}
// ---- map pins ----
function mapPin(e, c) {
  const r = c.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  const m0 = c._m0, s = c._s, cw = c._cw; if (!s) return;
  const u = (mx - cw / 2) / s, v = my / (s / 2) + 2 * m0, x = (u + v) / 2, y = (v - u) / 2;
  if (adminTp) { adminTp = false; closePanel(); adminTeleport(x, y); return; }   // админ-меню: телепорт тапом
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
}
