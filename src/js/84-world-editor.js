// ================= редактор мира: земля, деревья, кусты, фонари, заборы, машины — тапом по миру =================
// Город один и тот же (FIXED_SEED), поэтому правки хранятся списком операций world.wed и повторяются после загрузки.
// Включается из админ-меню. Ходить можно как обычно — джойстиком; тап по земле ставит выбранное.
const WED = {on:false, tool:'grass', brush:1, last:null};
const WED_TOOLS = [
  ['grass', 'Трава', '#5f8a45'], ['road', 'Асфальт', '#55585a'], ['walk', 'Тротуар', '#a49c8c'], ['dirt', 'Грунт', '#8a6c46'],
  ['water', 'Вода', '#3f7fae'], ['tree', 'Дерево', '#2f5e2c'], ['bush', 'Куст', '#5d8f3e'], ['lamp', 'Фонарь', '#e8d48a'],
  ['fencex', 'Забор ⟍', '#c9b89a'], ['fencey', 'Забор ⟋', '#c9b89a'], ['car', 'Машина', '#b04a3a'], ['erase', 'Убрать', '#e0604f'],
];
const WED_GROUND = {grass:GRASS, road:ROAD, walk:WALK, water:WATER};
// можно ли править клетку: не дом, не мебель, не край карты
function wedFree(x, y) {
  if (x < 2 || y < 2 || x >= MW - 2 || y >= MH - 2) return 'край карты';
  const i = y * MW + x, t = map[i];
  if (hAt[i] || furn[i] || !(t === GRASS || t === ROAD || t === WALK || t === WATER || t === TREE)) return 'здесь дом';
  return '';
}
const wedUnderHero = (x, y) => Math.abs(P.x - (x + .5)) < .9 && Math.abs(P.y - (y + .5)) < .9;
function wedDropProp(i) {
  const id = propAt[i]; if (!id) return false;
  const p = props[id - 1]; if (p.type === 'trap') return false;                // капкан снимают своим действием
  p.dead = true; for (let q = 0; q < NT; q++) if (propAt[q] === id) propAt[q] = 0;
  return true;
}
// одна операция редактора; '' — получилось, иначе причина
function wedApply(tool, x, y) {
  const why = wedFree(x, y); if (why) return why;
  const i = y * MW + x;
  if (tool === 'erase') {
    if (wedDropProp(i)) return '';
    if (map[i] === TREE) { map[i] = GRASS; return ''; }
    if (soil[i]) { soil[i] = 0; return ''; }
    return 'тут нечего убирать';
  }
  if (WED_GROUND[tool] != null) {
    if (tool === 'water' && (propAt[i] || wedUnderHero(x, y))) return propAt[i] ? 'сначала убери, что стоит' : 'ты стоишь здесь';
    map[i] = WED_GROUND[tool]; soil[i] = 0; return '';
  }
  if (tool === 'dirt') { if (map[i] === WATER || map[i] === TREE) map[i] = GRASS; soil[i] = 1; return ''; }
  if (propAt[i] || map[i] === TREE) return 'место занято';
  if (map[i] === WATER) return 'в воде нельзя';
  if (tool === 'tree') { if (wedUnderHero(x, y)) return 'ты стоишь здесь'; map[i] = TREE; return ''; }
  if (tool === 'bush') return addProp({type:'bush', cx:x + .5, cy:y + .5, solid:false, s:.6 + hash(x, y) * .4}, [[x, y]]) ? '' : 'место занято';
  if (tool === 'lamp') return addProp({type:'lamp', flick:false, cx:x + .5, cy:y + .8, hx:0, hy:1, solid:true, r:[x + .4, y + .7, x + .6, y + .9]}, [[x, y]]) ? '' : 'место занято';
  if (tool === 'fencex' || tool === 'fencey') {                                // забор двора: через него перелезают (05-geometry climbFence)
    if (wedUnderHero(x, y)) return 'ты стоишь здесь';
    const ax = tool === 'fencex' ? 'x' : 'y';
    return addProp({type:'fence', proc:true, ax, cx:x + .5, cy:y + .5, solid:true, sign:false, r:ax === 'x' ? [x, y + .42, x + 1, y + .58] : [x + .42, y, x + .58, y + 1]}, [[x, y]]) ? '' : 'место занято';
  }
  if (tool === 'car') {
    const j = i + 1; if (wedFree(x + 1, y) || propAt[j] || map[j] === TREE || map[j] === WATER) return 'машине нужно две клетки вдоль';
    if (wedUnderHero(x, y) || wedUnderHero(x + 1, y)) return 'ты стоишь здесь';
    const cx = x + 1, cy = y + .5;
    return addProp({type:'car', dir:'x', cx, cy, ci:Math.floor(hash(x * 7, y * 3) * 6), solid:true, flip:hash(y, x) < .5, r:[cx - .95, cy - .42, cx + .95, cy + .42]}, [[x, y], [x + 1, y]]) ? '' : 'место занято';
  }
  return 'не умею';
}
function wedTap(cx, cy) {
  if (!WED.on) return false;
  const [wx, wy] = worldFromScreen(cx, cy), x0 = Math.floor(wx), y0 = Math.floor(wy), r = WED.brush === 3 && WED.tool !== 'car' ? 1 : 0;
  let ok = 0, why = '';
  for (let y = y0 - r; y <= y0 + r; y++) for (let x = x0 - r; x <= x0 + r; x++) {
    const w = wedApply(WED.tool, x, y);
    if (w) why = why || w; else { ok++; (world.wed = world.wed || []).push([WED.tool, x, y]); }
  }
  WED.last = {x:x0, y:y0, r, t:1.2, ok:ok > 0};
  if (ok) { clearCaches(); fogDirty = true; SFX.ui(); } else if (why) toast(why);
  return true;
}
// после постройки мира под загрузку — те же правки по порядку
function wedReplay(list) { let n = 0; for (const [t, x, y] of list || []) if (!wedApply(t, x, y)) n++; if (n) clearCaches(); return n; }
function wedUI() {
  let bar = $('wedBar');
  if (!bar) {
    bar = mk('div'); bar.id = 'wedBar'; document.body.appendChild(bar);
    const tools = mk('div', 'wedtools');
    for (const [k, t, col] of WED_TOOLS) { const b = btn('', () => { WED.tool = k; SFX.ui(); wedUI(); }); b.dataset.t = k; const i = mk('i'); i.style.background = col; b.appendChild(i); b.appendChild(document.createTextNode(t)); tools.appendChild(b); }
    bar.appendChild(tools);
    const side = mk('div', 'wedside');
    side.appendChild(btn('Кисть 1×1', () => { WED.brush = WED.brush === 1 ? 3 : 1; SFX.ui(); wedUI(); }, 'wedbrush'));
    side.appendChild(btn('Готово', () => wedToggle(false), 'done'));
    bar.appendChild(side);
  }
  bar.hidden = !WED.on; document.body.classList.toggle('wediting', WED.on);
  for (const b of bar.querySelectorAll('.wedtools button')) b.classList.toggle('on', b.dataset.t === WED.tool);
  const bb = bar.querySelector('.wedbrush'); if (bb) bb.textContent = WED.brush === 3 ? 'Кисть 3×3' : 'Кисть 1×1';
}
function wedToggle(on) {
  if (mode !== 'play' || P.sleep || P.car) return;
  WED.on = on == null ? !WED.on : !!on; if (WED.on) { if (EDIT.on) toggleEditor(false); if (panel) closePanel(); toast('Редактор мира: выбери, что ставить, и тапни по земле рядом'); }
  wedUI();
}
onTap(wedTap);
onDraw(() => {
  if (!WED.on) return;
  const L = WED.last, quad = (x0, y0, x1, y1, fill, stroke) => { ctx.beginPath(); ctx.moveTo(SX(x0, y0), SY(x0, y0, 0)); ctx.lineTo(SX(x1, y0), SY(x1, y0, 0)); ctx.lineTo(SX(x1, y1), SY(x1, y1, 0)); ctx.lineTo(SX(x0, y1), SY(x0, y1, 0)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); };
  const px = Math.floor(P.x), py = Math.floor(P.y);                          // сетка вокруг героя — видно клетки
  ctx.strokeStyle = 'rgba(240,196,119,.16)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let k = -6; k <= 7; k++) { ctx.moveTo(SX(px + k, py - 6), SY(px + k, py - 6, 0)); ctx.lineTo(SX(px + k, py + 7), SY(px + k, py + 7, 0)); ctx.moveTo(SX(px - 6, py + k), SY(px - 6, py + k, 0)); ctx.lineTo(SX(px + 7, py + k), SY(px + 7, py + k, 0)); }
  ctx.stroke();
  if (L && L.t > 0) { L.t -= 1 / 60; const a = Math.min(1, L.t); quad(L.x - L.r, L.y - L.r, L.x + L.r + 1 + (WED.tool === 'car' ? 1 : 0), L.y + L.r + 1, L.ok ? `rgba(130,220,120,${.25 * a})` : `rgba(230,80,60,${.25 * a})`, L.ok ? `rgba(191,240,168,${a})` : `rgba(255,138,118,${a})`); }
});
onSave(d => { d.x84 = world.wed || []; });
onLoad(d => { world.wed = (d && d.x84) || []; wedReplay(world.wed); });
onNewWorld(o => { if (!o || !o.save) world.wed = []; WED.on = false; if ($('wedBar')) wedUI(); });
// кнопки — только в админ-меню (в паузе их нет)
onPanel(() => {
  if (!panel || panel.kind !== 'admin') return;
  const body = $('pnBody'); body.appendChild(mk('div', 'sect', 'Мир'));
  const r = mk('div', 'secrow'); r.appendChild(btn(WED.on ? 'Выключить редактор мира' : 'Редактор мира', () => { closePanel(); wedToggle(); }));
  const rb = btn('Отчёт об ошибках', () => { SFX.ui(); copyReport(); }); rb.id = 'pReport'; r.appendChild(rb); body.appendChild(r);
});
