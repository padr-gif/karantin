// ================= playable layout pass, furniture editor, readable recipes, curtains, vault animation =================
// ---- readable recipe cards: every requirement is a named chip, green when you have it ----
const PNAMES = {campfire:'Огонь', burner:'Горелка', seeds:'Грядка', barrel:'Бочка'};
function vaultZ() { const A = P.act; if (!A || A.kind !== 'vault') return 0; const k = Math.min(1, A.t / A.dur); return Math.sin(Math.PI * Math.min(1, k * 1.15)) * U * .62; }
function vaultAnim() {
  const A = P.act, k = Math.min(1, A.t / A.dur);
  if (heroRig() && AN('p', 'vault') >= 2) {                                    // у мужского героя — свой клип перелезания
    const np = AN('p', 'pickup');
    if (k < .35) return ['pickup', Math.min(np - 1, Math.floor(k / .35 * np))];
    if (k < .75) { const n = AN('p', 'vault'); return ['vault', Math.floor((k - .35) / .4 * n * 1.5) % n]; }
    return ['pickup', Math.max(0, np - 1 - Math.floor((k - .75) / .25 * np))];
  }
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
  const sel = EDIT.sel, tg = EDIT.tgt;
  $('editBar').hidden = !EDIT.on; document.body.classList.toggle('editing', EDIT.on); $('bEdit').classList.toggle('on', EDIT.on);
  $('edTxt').innerHTML = !sel ? '<b>Обустройство</b><br>выбери мебель'
    : !tg ? '<b>' + furnLabel(sel) + '</b><br>тапни пол, куда поставить'
    : tg.why ? '<b>' + furnLabel(sel) + '</b><br><span class="bad">' + tg.why + '</span>'
    : '<b>' + furnLabel(sel) + '</b><br>сюда? Тапни ещё раз';
  $('edRot').disabled = !sel; if ($('edBreak')) $('edBreak').disabled = !sel || !!tg;
  $('edPut').hidden = !sel || !tg; $('edPut').disabled = !tg || !!tg.why;
}
function toggleEditor(on) {
  if (P.car || P.sleep || mode !== 'play') return;
  EDIT.on = on == null ? !EDIT.on : !!on; EDIT.sel = null; EDIT.tgt = null; if (EDIT.on && panel) closePanel();
  if (EDIT.on) toast('Выбери мебель, потом место для неё'); editUI();
}
function canPlace(f, x, y, wd) {
  wd = wd || (EDIT.tgt && EDIT.tgt.x === x && EDIT.tgt.y === y ? EDIT.tgt.wd : autoWd(f, x, y));
  const behind = isWallT9(get(x + wd[0], y + wd[1])), door = get(x, y) === DOOR;
  let R = null;
  for (const d of [1, -1]) { const c = rectFor(artOf(f), x, y, wd, d, !behind && !door); if (!c) break; if (rectFits(f, c, wd, {free:!behind, door, x, y})) { R = c; break; } if (c.na === 1) break; }
  if (!R) {
    const i = y * MW + x, t = get(x, y);
    if (!(t === FLOOR || t === DOOR)) return 'Ставить можно на пол в доме или в открытый дверной проём';
    if (furn[i] && furns[furn[i] - 1] !== f) return 'Тут уже стоит мебель';
    return Math.max(...(fsizeOf(artOf(f)) || [1, 1])) > 1.1 ? 'Не влезает: нужно больше места' : 'Место занято';
  }
  const [r0, r1, r2, r3] = R.r, px = clamp(P.x, r0, r2), py = clamp(P.y, r1, r3);
  if (Math.hypot(px - P.x, py - P.y) < P.r * .9) return 'Ты стоишь на этом месте';
  if (zs.some(z => z.x > r0 - .2 && z.x < r2 + .2 && z.y > r1 - .2 && z.y < r3 + .2)) return 'Мешает мертвец';
  if (Math.hypot(R.cx - P.x, R.cy - P.y) > 3.6 + Math.max(R.sx, R.sy) / 2) return 'Далеко. Подойди ближе к месту';
  f._place = R; return null;
}
function relocate(f, x, y, wd) {
  const why = canPlace(f, x, y, wd), R = !why && f._place;
  if (!R) return false;
  for (const t of f.tiles || [f.y * MW + f.x]) for (const ch of chunksNear((t % MW) + .5, ((t / MW) | 0) + .5, 2)) for (const [k, v] of CHUNKS) if (v === ch) CHUNKS.delete(k);
  unregFurn(f);
  Object.assign(f, {x, y, wd, cx:R.cx, cy:R.cy, sx:R.sx, sy:R.sy, r:R.r, moved:true, blockDoor:get(x, y) === DOOR, compact:false});
  regFurn(f);
  for (const t of f.tiles) for (const ch of chunksNear((t % MW) + .5, ((t / MW) | 0) + .5, 2)) for (const [k, v] of CHUNKS) if (v === ch) CHUNKS.delete(k);
  buildFlow(); return true;
}
function editorTap(cx, cy) {
  const [wx, wy] = worldFromScreen(cx, cy), tx = Math.floor(wx), ty = Math.floor(wy);
  if (EDIT.sel && EDIT.tgt && EDIT.tgt.x === tx && EDIT.tgt.y === ty) { placeTgt(); return true; }   // second tap on the preview
  let best = null, bd = .95;
  for (const f of furns) { if (Math.abs(f.cx - wx) > 1.5 || Math.abs(f.cy - wy) > 1.5) continue; const d = Math.hypot(f.cx - wx, f.cy - wy); if (d < bd) { bd = d; best = f; } }
  if (best && best !== EDIT.sel && !(EDIT.sel && tx === EDIT.sel.x && ty === EDIT.sel.y)) {
    if (FIXED.has(best.type)) { toast(furnLabel(best) + ': прикручено к трубам, не сдвинуть'); return true; }
    if (!reachOK(clamp(P.x, best.r[0], best.r[2]), clamp(P.y, best.r[1], best.r[3]))) { toast('Через стену не достать. Зайди в эту комнату'); return true; }
    if (Math.hypot(best.cx - P.x, best.cy - P.y) > 3.2) { toast('Подойди ближе к мебели'); return true; }
    EDIT.sel = best; EDIT.tgt = null; SFX.ui(); editUI(); return true;
  }
  if (!EDIT.sel) { toast('Тапни на мебель, чтобы выбрать её'); return true; }
  if (tx === EDIT.sel.x && ty === EDIT.sel.y) { EDIT.tgt = null; editUI(); return true; }
  EDIT.tgt = {x:tx, y:ty, wd:autoWd(EDIT.sel, tx, ty)}; EDIT.tgt.why = canPlace(EDIT.sel, tx, ty); SFX.ui(); editUI();
  return true;
}
function finishFurn(a) {
  if (!relocate(a.f, a.x, a.y, a.wd)) { toast('Не получилось поставить'); EDIT.tgt = null; editUI(); return; }
  noise(P.x, P.y, 5); P.en = Math.max(0, P.en - (a.f.big ? 4 : 2)); SFX.wood(a.f.cx, a.f.cy);
  toast(a.f.blockDoor ? 'Проход загорожен: мертвецам придётся ломать' : furnLabel(a.f) + ': переставлено');
  EDIT.sel = null; EDIT.tgt = null; editUI();
}
function rotateSel() {
  const f = EDIT.sel; if (!f) return;
  if (EDIT.tgt) { const k = WDS.findIndex(w => w[0] === EDIT.tgt.wd[0] && w[1] === EDIT.tgt.wd[1]); EDIT.tgt.wd = WDS[(k + 1) % 4]; EDIT.tgt.why = canPlace(f, EDIT.tgt.x, EDIT.tgt.y, EDIT.tgt.wd); SFX.ui(); editUI(); return; }
  const k = WDS.findIndex(w => w[0] === f.wd[0] && w[1] === f.wd[1]);
  for (let s = 1; s < 4; s++) if (relocate(f, f.x, f.y, WDS[(k + s) % 4])) { SFX.wood(f.cx, f.cy); return; }
  toast('Здесь не развернуть: мало места');
}
function drawEditMarks() {
  if (!EDIT.on) return;
  const quad = (r, z, fill, stroke, lw) => { ctx.beginPath(); ctx.moveTo(SX(r[0], r[1]), SY(r[0], r[1], z)); ctx.lineTo(SX(r[2], r[1]), SY(r[2], r[1], z)); ctx.lineTo(SX(r[2], r[3]), SY(r[2], r[3], z)); ctx.lineTo(SX(r[0], r[3]), SY(r[0], r[3], z)); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); } };
  const box = (r, h, fill, stroke) => {   // a see-through box: footprint, top and the four uprights
    quad(r, 0, fill, stroke, 1.5); quad(r, h, null, stroke, 1);
    ctx.beginPath(); for (const [x, y] of [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]]) { ctx.moveTo(SX(x, y), SY(x, y, 0)); ctx.lineTo(SX(x, y), SY(x, y, h)); } ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();
  };
  const tile = (x, y, fill, stroke) => quad([x, y, x + 1, y + 1], 0, fill, stroke, 1);
  const pulse = .55 + .45 * Math.sin(animT * 5), H = U * .9;
  if (EDIT.sel) {
    const f = EDIT.sel, cx = Math.floor(P.x), cy = Math.floor(P.y);
    for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) if (vis[y * MW + x] && !canPlace(f, x, y)) tile(x, y, 'rgba(120,200,110,.10)', 'rgba(150,220,130,.22)');
    box(f.r, H, `rgba(232,180,70,${.18 + .12 * pulse})`, 'rgba(240,196,119,.95)');
    const tg = EDIT.tgt;
    if (tg) {
      const ok = !tg.why, r = ghostRect(f, tg.x, tg.y, tg.wd);
      tile(tg.x, tg.y, ok ? 'rgba(120,210,110,.22)' : 'rgba(230,80,60,.22)', ok ? 'rgba(160,230,140,.9)' : 'rgba(240,110,90,.9)');
      box(r, H, ok ? `rgba(130,220,120,${.25 + .15 * pulse})` : 'rgba(230,80,60,.25)', ok ? '#bff0a8' : '#ff8a76');
      // arrow from the furniture to its new place
      const ax = SX(f.cx, f.cy), ay = SY(f.cx, f.cy, H * .5), bx = SX((r[0] + r[2]) / 2, (r[1] + r[3]) / 2), by = SY((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, H * .5);
      ctx.setLineDash([4, 4]); ctx.strokeStyle = ok ? 'rgba(191,240,168,.8)' : 'rgba(255,138,118,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
      // which side faces the room: a small mark on the front edge
      const fx = (r[0] + r[2]) / 2 - tg.wd[0] * (r[2] - r[0]) / 2, fy = (r[1] + r[3]) / 2 - tg.wd[1] * (r[3] - r[1]) / 2;
      ctx.fillStyle = ok ? '#bff0a8' : '#ff8a76'; ctx.beginPath(); ctx.arc(SX(fx, fy), SY(fx, fy, 2), 2.2, 0, 6.283); ctx.fill();
    }
  } else for (const f of furns) {
    if (Math.abs(f.cx - P.x) > 3.4 || Math.abs(f.cy - P.y) > 3.4 || FIXED.has(f.type) || !vis[f.y * MW + f.x]) continue;
    if (!reachOK(clamp(P.x, f.r[0], f.r[2]), clamp(P.y, f.r[1], f.r[3]))) continue;   // behind a wall: not offered
    quad(f.r, 0, null, `rgba(240,196,119,${.4 + .4 * pulse})`, 1.5);
  }
}
$('bEdit').addEventListener('click', () => { SFX.ui(); toggleEditor(); });
$('edBreak').addEventListener('click', () => dismantleSel());
$('stNext').addEventListener('click', () => { SFX.ui(); if (storyI < STORY.length - 1) showStory(storyI + 1); else startPlayAfterStory(); });
$('stSkip').addEventListener('click', () => startPlayAfterStory());
$('edDone').addEventListener('click', () => toggleEditor(false));
$('edRot').addEventListener('click', rotateSel);
$('cExit').addEventListener('pointerdown', e => { e.preventDefault(); exitCar(); });
