// ================= v17: playable layout pass, furniture editor, readable recipes, curtains, vault animation =================
// ---- readable recipe cards: every requirement is a named chip, green when you have it ----
const PNAMES = {campfire:'Огонь', burner:'Горелка', seeds:'Грядка', barrel:'Бочка'};
recipeCard = function (title, parts, result, buttons, note) {
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
};
// ---- curtains: take down and hang back ----
windowActions = function (o) {
  const ob = obs[o.i], c = [];
  if (ob.bhp > 0) c.push({kind:'unbar', label:'Оторвать доску', o});
  else {
    if (ob.open || ob.broken) c.push({kind:'vault', label:'Перелезть', o});
    if (!ob.broken) c.push({kind:'window', label:ob.open ? 'Закрыть окно' : 'Открыть окно', o, tk:ob.open ? 'wc' + o.i : null});
  }
  if (ob.cur) { c.push({kind:'curtain', label:ob.cc ? 'Раздвинуть шторы' : 'Задёрнуть шторы', o, tk:'cu' + o.i}); c.push({kind:'takecur', label:'Снять шторы', o, tk:'ct' + o.i}); }
  else if (countItem('curtain')) c.push({kind:'hangcur', label:'Повесить шторы', o, tk:'cu' + o.i});
  return c;
};
const winAction0 = winAction;
winAction = function (a) {
  if (a.o && a.kind === 'takecur') {
    const ob = obs[a.o.i]; if (invFull()) { toast('Слишком тяжело — не унести'); return true; }
    P.inv.push({id:'curtain', col:ob.cur}); ob.cur = null; ob.cc = false; SFX.rustle(); fogDirty = true; toast('Шторы сняты и сложены в рюкзак'); renderInv(); return true;
  }
  if (a.o && a.kind === 'hangcur') {
    const ob = obs[a.o.i], k = P.inv.findIndex(i => i.id === 'curtain'); if (k < 0) return true;
    const it = P.inv.splice(k, 1)[0]; ob.cur = it.col || [150, 60, 56]; ob.cc = true; SFX.rustle(); fogDirty = true; toast('Шторы повешены и задёрнуты'); renderInv(); return true;
  }
  if (a.o && a.kind === 'vault') { const r = winAction0(a); if (P.act && P.act.kind === 'vault') { P.act.dur = 1.15; P.face = P.fd = Math.atan2(P.act.ty - P.act.fy, P.act.tx - P.act.fx); } return r; }
  return winAction0(a);
};
function vaultZ() { const A = P.act; if (!A || A.kind !== 'vault') return 0; const k = Math.min(1, A.t / A.dur); return Math.sin(Math.PI * Math.min(1, k * 1.15)) * U * .62; }
function vaultAnim() {
  const A = P.act, k = Math.min(1, A.t / A.dur);
  if (k < .35) { const n = AN('p', 'pickup'); return ['pickup', Math.min(n - 1, Math.floor(k / .35 * n))]; }
  if (k < .75) { const n = AN('p', 'sneak'); return ['sneak', Math.floor((k - .35) / .4 * n * 1.5) % n]; }
  const n = AN('p', 'pickup'); return ['pickup', Math.max(0, n - 1 - Math.floor((k - .75) / .25 * n))];
}
// ---- action list: no duplicates (two windows → one "Открыть окно", the nearest) ----

// ---- furniture editor ("Обустройство") ----
const EDIT = {on:false, sel:null};
const FIXED = new Set(['sink', 'toilet', 'bath']);
const WDS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const furnLabel = f => (CONT[f.type] && CONT[f.type].name) || ({bed:'Кровать', sofa:'Диван', table:'Стол', tv:'Телевизор', stove:'Плита'})[f.type] || 'Мебель';
function editUI() {
  if ($('edBreak')) $('edBreak').disabled = !EDIT.sel;
  $('editBar').hidden = !EDIT.on; document.body.classList.toggle('editing', EDIT.on);
  $('bEdit').classList.toggle('on', EDIT.on);
  $('edTxt').innerHTML = !EDIT.sel ? '<b>Обустройство</b> · тапни мебель рядом, чтобы взять' : '<b>' + furnLabel(EDIT.sel) + '</b> · тапни свободный пол рядом, куда поставить';
  $('edRot').disabled = !EDIT.sel;
}
function toggleEditor(on) {
  if (P.car || P.sleep || mode !== 'play') return;
  EDIT.on = on == null ? !EDIT.on : !!on; EDIT.sel = null; if (EDIT.on && panel) closePanel();
  if (EDIT.on) toast('Двигай мебель: загороди окна и двери, обустрой убежище'); editUI();
}
function canPlace(f, x, y) {
  const i = y * MW + x, t = get(x, y);
  if (!(t === FLOOR || (t === DOOR && obs[i] && obs[i].open && !obs[i].dead))) return 'Ставить можно на пол в доме или в открытый дверной проём';
  if (furn[i] && furns[furn[i] - 1] !== f) return 'Тут уже стоит мебель';
  if (propAt[i]) return 'Место занято';
  if (Math.floor(P.x) === x && Math.floor(P.y) === y) return 'Ты стоишь на этом месте';
  if (zs.some(z => Math.floor(z.x) === x && Math.floor(z.y) === y)) return 'Мешает мертвец';
  if (Math.hypot(x + .5 - P.x, y + .5 - P.y) > 3.6) return 'Далеко. Подойди ближе к месту';
  return null;
}
function relocate(f, x, y, wd) {
  const base = f.wd[0] ? [f.sy, f.sx] : [f.sx, f.sy];
  const center = Math.abs(f.cx - (f.x + .5)) < .02 && Math.abs(f.cy - (f.y + .5)) < .02;
  const sx = wd[0] ? base[1] : base[0], sy = wd[0] ? base[0] : base[1], t = get(x, y);
  let cx = x + .5, cy = y + .5;
  const wt = get(x + wd[0], y + wd[1]);
  if (t !== DOOR && (wt === WALL || wt === WIN)) { cx = x + .5 + wd[0] * (1 - HWV - sx / 2 - .02); cy = y + .5 + wd[1] * (1 - HWV - sy / 2 - .02); }
  const oi = f.y * MW + f.x, ni = y * MW + x, idx = furn[oi] || furns.indexOf(f) + 1, ox = f.x, oy = f.y;
  furn[oi] = 0; furn[ni] = idx;
  Object.assign(f, {x, y, wd, sx, sy, cx, cy, r:[cx - sx / 2, cy - sy / 2, cx + sx / 2, cy + sy / 2], moved:true, blockDoor:t === DOOR});
  for (const [ax, ay] of [[ox, oy], [x, y]]) for (const ch of chunksNear(ax + .5, ay + .5, 2)) for (const [k, v] of CHUNKS) if (v === ch) CHUNKS.delete(k);
  buildFlow();
}
function editorTap(cx, cy) {
  const [wx, wy] = worldFromScreen(cx, cy);
  let best = null, bd = .95;
  for (const f of furns) { if (Math.abs(f.cx - wx) > 1.5 || Math.abs(f.cy - wy) > 1.5) continue; const d = Math.hypot(f.cx - wx, f.cy - wy); if (d < bd) { bd = d; best = f; } }
  if (best && best !== EDIT.sel && !(EDIT.sel && Math.floor(wx) === EDIT.sel.x && Math.floor(wy) === EDIT.sel.y)) {
    if (FIXED.has(best.type)) { toast(furnLabel(best) + ': прикручено к трубам, не сдвинуть'); return true; }
    if (Math.hypot(best.cx - P.x, best.cy - P.y) > 3.2) { toast('Подойди ближе к мебели'); return true; }
    EDIT.sel = best; SFX.ui(); editUI(); return true;
  }
  if (!EDIT.sel) { toast('Тапни на мебель, чтобы выбрать её'); return true; }
  const tx = Math.floor(wx), ty = Math.floor(wy), why = canPlace(EDIT.sel, tx, ty);
  if (why) { toast(why); return true; }
  P.act = {kind:'furn', t:0, dur:.9, f:EDIT.sel, x:tx, y:ty, wd:EDIT.sel.wd}; SFX.wood(EDIT.sel.cx, EDIT.sel.cy);
  return true;
}
function finishFurn(a) {
  if (canPlace(a.f, a.x, a.y)) { toast('Не получилось поставить'); return; }
  relocate(a.f, a.x, a.y, a.wd); noise(P.x, P.y, 5); P.en = Math.max(0, P.en - 2); SFX.wood(a.f.cx, a.f.cy);
  toast(a.f.blockDoor ? 'Проход загорожен: мертвецам придётся ломать' : furnLabel(a.f) + ' переставлен(а)');
  EDIT.sel = null; editUI();
}
function rotateSel() {
  const f = EDIT.sel; if (!f) return;
  const k = WDS.findIndex(w => w[0] === f.wd[0] && w[1] === f.wd[1]);
  relocate(f, f.x, f.y, WDS[(k + 1) % 4]); SFX.wood(f.cx, f.cy);
}
function drawEditMarks() {
  if (!EDIT.on) return;
  const dia = (x, y, fill, stroke) => { ctx.beginPath(); ctx.moveTo(SX(x + .5, y), SY(x + .5, y, 0) + 0); ctx.moveTo(SX(x, y), SY(x, y, 0)); ctx.lineTo(SX(x + 1, y), SY(x + 1, y, 0)); ctx.lineTo(SX(x + 1, y + 1), SY(x + 1, y + 1, 0)); ctx.lineTo(SX(x, y + 1), SY(x, y + 1, 0)); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); } };
  const cx = Math.floor(P.x), cy = Math.floor(P.y);
  if (EDIT.sel) {
    for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) if (vis[y * MW + x] && !canPlace(EDIT.sel, x, y)) dia(x, y, 'rgba(120,200,110,.16)', 'rgba(150,220,130,.35)');
    dia(EDIT.sel.x, EDIT.sel.y, 'rgba(232,180,70,.35)', 'rgba(240,196,119,.95)');
  } else for (const f of furns) if (Math.abs(f.cx - P.x) < 3.4 && Math.abs(f.cy - P.y) < 3.4 && !FIXED.has(f.type) && vis[f.y * MW + f.x]) dia(f.x, f.y, null, 'rgba(240,196,119,.6)');
}
const tapWorld0 = tapWorld;
tapWorld = function (cx, cy) { if (EDIT.on) return editorTap(cx, cy); return tapWorld0(cx, cy); };
$('bEdit').addEventListener('click', () => { SFX.ui(); toggleEditor(); });
$('edBreak').addEventListener('click', () => dismantleSel());
$('stNext').addEventListener('click', () => { SFX.ui(); if (storyI < STORY.length - 1) showStory(storyI + 1); else startPlayAfterStory(); });
$('stSkip').addEventListener('click', () => startPlayAfterStory());
$('edDone').addEventListener('click', () => toggleEditor(false));
$('edRot').addEventListener('click', rotateSel);
$('cExit').addEventListener('pointerdown', e => { e.preventDefault(); exitCar(); });
