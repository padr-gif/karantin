// ================= v27: hands on the body map, taking a dressing off, stiff windows that swing, clearer furniture moving =================

// ---- body map: hands are their own regions ----
WPART.arm.push('левая кисть', 'правая кисть');
Object.assign(WHERE2REG, {'левая кисть':'handL', 'правая кисть':'handR'});
Object.assign(REG, {handR:{name:'Правая кисть', at:[30, 125], slot:'hands'}, handL:{name:'Левая кисть', at:[110, 125], slot:'hands'}});
REGP.armR = '<path d="M45 48 Q37 50 35 60 L27 108 Q26 116 31 117 L37 116 L46 64 Z"/>';
REGP.armL = '<path d="M95 48 Q103 50 105 60 L113 108 Q114 116 109 117 L103 116 L94 64 Z"/>';
REGP.handR = '<path d="M25 117 Q24 128 29 132 Q35 133 37 126 L38 117 Z"/>';
REGP.handL = '<path d="M115 117 Q116 128 111 132 Q105 133 103 126 L102 117 Z"/>';
// glass cuts land on the hands
glassCut = function (chance, what) {
  if (rng() >= chance) return false;
  const g = gloveItem();
  if (g && rng() < gloveGuard()) { tearCloth(g, .25); return false; }
  const w = addWound('cut', 'arm', pick(['левая кисть', 'правая кисть'])); P.hp -= 3; lastCause = 'Порезы';
  toast((what || 'Порезался о стекло') + (w ? ': ' + w.where : '') + '. Перевяжи');
  return true;
};

// ---- a dressing can be taken off (to look at the wound, or to put a clean one on later) ----
const woundRow27 = woundRow;
woundRow = function (w) {
  const r = woundRow27(w);
  if (w.band && w.k !== 'frac') {
    const acts = r.querySelector('.acts') || r;
    const b = btn(dirtyBand(w) ? 'Снять грязную' : 'Снять повязку', () => {
      w.band = 0; w.bT = 0; SFX.rustle();
      toast(WOUND[w.k].bleed > 0 && w.t < (WOUND[w.k].clot || 1e9) ? 'Повязка снята. Рана снова кровоточит' : 'Повязка снята: ' + w.where);
      renderPanel();
    }, 'ghost');
    acts.appendChild(b);
  }
  return r;
};

// ---- windows: some are stiff or jammed; the sash slides up and down instead of jumping ----
// stiff: 0 opens easily (sometimes needs a second try), 1 tight (takes a few tries), 2 jammed (only a crowbar helps)
const winAnim = new Set();
function winStiff(ob) { if (ob.stiff == null) { const r = rng(); ob.stiff = r < .62 ? 0 : r < .9 ? 1 : 2; } return ob.stiff; }
function winJiggle(i) { const ob = obs[i]; ob.jig = .5; winAnim.add(i); }
function tickWindows(dt) {
  for (const i of winAnim) {
    const ob = obs[i]; if (!ob) { winAnim.delete(i); continue; }
    const tg = ob.open && !ob.broken ? 1 : 0; if (ob.ang == null) ob.ang = tg;
    if (ob.jig > 0) {   // the sash twitches but stays put
      ob.jig = Math.max(0, ob.jig - dt);
      const j = Math.abs(Math.sin((1 - ob.jig / .5) * Math.PI * 3)) * .14 * (ob.jig / .5); ob.ang = ob.jig ? (tg ? tg - j : j) : tg;
    }
    else ob.ang += clamp(tg - ob.ang, -dt * 2.4, dt * 2.4);
    if (!(ob.jig > 0) && Math.abs(ob.ang - tg) < .001) { ob.ang = tg; winAnim.delete(i); }
  }
}
onUpdate(dt => { if (winAnim.size) tickWindows(dt);
});

// ---- furniture moving: pick only what you can reach (not through a wall), preview the spot, then confirm ----
// A tap on the floor shows a ghost of the furniture there (green: fits, red: says why not); a second tap on the
// same spot or the «Поставить» button moves it. Next to a wall it turns its back to the wall and stands flush.
EDIT.tgt = null;
{ const bar = $('editBar'), put = mk('button', 'put'); put.type = 'button'; put.id = 'edPut'; put.innerHTML = '<svg class="ic"><use href="#i-plus"/></svg>Поставить';
  bar.insertBefore(put, $('edDone')); put.addEventListener('click', () => { SFX.ui(); placeTgt(); }); }
const isWallT = t => t === WALL || t === WIN;
function autoWd(f, x, y) {
  if (get(x, y) === DOOR) return f.wd;
  if (isWallT(get(x + f.wd[0], y + f.wd[1]))) return f.wd;
  const w = WDS.find(d => isWallT(get(x + d[0], y + d[1])));
  return w || f.wd;
}
function ghostRect(f, x, y, wd) {
  const base = f.wd[0] ? [f.sy, f.sx] : [f.sx, f.sy], sx = wd[0] ? base[1] : base[0], sy = wd[0] ? base[0] : base[1];
  let cx = x + .5, cy = y + .5;
  if (get(x, y) !== DOOR && isWallT(get(x + wd[0], y + wd[1]))) { cx = x + .5 + wd[0] * (1 - HWV - sx / 2 - .02); cy = y + .5 + wd[1] * (1 - HWV - sy / 2 - .02); }
  return [cx - sx / 2, cy - sy / 2, cx + sx / 2, cy + sy / 2];
}
editUI = function () {
  const sel = EDIT.sel, tg = EDIT.tgt;
  $('editBar').hidden = !EDIT.on; document.body.classList.toggle('editing', EDIT.on); $('bEdit').classList.toggle('on', EDIT.on);
  $('edTxt').innerHTML = !sel ? '<b>Обустройство</b><br>выбери мебель'
    : !tg ? '<b>' + furnLabel(sel) + '</b><br>тапни пол, куда поставить'
    : tg.why ? '<b>' + furnLabel(sel) + '</b><br><span class="bad">' + tg.why + '</span>'
    : '<b>' + furnLabel(sel) + '</b><br>сюда? Тапни ещё раз';
  $('edRot').disabled = !sel; if ($('edBreak')) $('edBreak').disabled = !sel || !!tg;
  $('edPut').hidden = !sel || !tg; $('edPut').disabled = !tg || !!tg.why;
};
toggleEditor = function (on) {
  if (P.car || P.sleep || mode !== 'play') return;
  EDIT.on = on == null ? !EDIT.on : !!on; EDIT.sel = null; EDIT.tgt = null; if (EDIT.on && panel) closePanel();
  if (EDIT.on) toast('Выбери мебель, потом место для неё'); editUI();
};
function placeTgt() {
  const f = EDIT.sel, tg = EDIT.tgt; if (!f || !tg) return;
  tg.why = canPlace(f, tg.x, tg.y); if (tg.why) { toast(tg.why); editUI(); return; }
  P.act = {kind:'furn', t:0, dur:.9, f, x:tg.x, y:tg.y, wd:tg.wd}; SFX.wood(f.cx, f.cy); EDIT.tgt = null; editUI();
}
editorTap = function (cx, cy) {
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
};
rotateSel = function () {
  const f = EDIT.sel; if (!f) return;
  if (EDIT.tgt) { const k = WDS.findIndex(w => w[0] === EDIT.tgt.wd[0] && w[1] === EDIT.tgt.wd[1]); EDIT.tgt.wd = WDS[(k + 1) % 4]; SFX.ui(); return; }   // turn the preview
  const k = WDS.findIndex(w => w[0] === f.wd[0] && w[1] === f.wd[1]); relocate(f, f.x, f.y, WDS[(k + 1) % 4]); SFX.wood(f.cx, f.cy);
};
const finishFurn27 = finishFurn;
finishFurn = function (a) { finishFurn27(a); EDIT.tgt = null; editUI(); };
drawEditMarks = function () {
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
};

// ---- new survivor screen: three tabs instead of one long page; «Начать» is always in view ----
let cTab = 'look';
function showCTab(t) {
  cTab = t;
  for (const b of $('cTabs').children) b.classList.toggle('on', b.dataset.t === t);
  for (const o of document.querySelectorAll('#create .opts')) o.hidden = o.dataset.tab !== t;
  const o = document.querySelector('#create .opts:not([hidden])'); if (o) o.scrollTop = 0;
  cSummary();
}
function cSummary() {
  const s = $('cSum'); if (!s) return;
  const prof = PROFS[newProf] ? PROFS[newProf].name : 'Безработный', nt = (newTraits || []).length;
  const se = SEASONS[NEWCFG.season] ? SEASONS[NEWCFG.season].name : '', df = {easy:'лёгкая', normal:'обычная', hard:'тяжёлая'}[newDiff] || newDiff;
  s.innerHTML = '<b>' + prof + '</b>' + (nt ? ' · черт: ' + nt : '') + '<br>' + se + ' · ' + df + (NEWCFG.mut ? ' · громилы' : '');
}
$('cTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; SFX.ui(); showCTab(b.dataset.t); });
document.getElementById('create').addEventListener('click', () => setTimeout(cSummary, 0));
const openCreate27 = openCreate;
openCreate = function () { openCreate27(); showCTab('look'); };
