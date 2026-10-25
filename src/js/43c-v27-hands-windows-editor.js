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

// ---- a dressing can be taken off (to look at the wound, or to put a clean one on later) ----

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
function ghostRect(f, x, y, wd) { canPlace(f, x, y, wd); return f._place ? f._place.r : (rectFor(artOf(f), x, y, wd, 1, !isWallT9(get(x + wd[0], y + wd[1]))) || {r:[x, y, x + 1, y + 1]}).r; }
function placeTgt() {
  const f = EDIT.sel, tg = EDIT.tgt; if (!f || !tg) return;
  tg.why = canPlace(f, tg.x, tg.y); if (tg.why) { toast(tg.why); editUI(); return; }
  P.act = {kind:'furn', t:0, dur:.9, f, x:tg.x, y:tg.y, wd:tg.wd}; SFX.wood(f.cx, f.cy); EDIT.tgt = null; editUI();
}

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
