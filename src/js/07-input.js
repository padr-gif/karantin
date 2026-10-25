// ================= input =================
const keys = new Set();
let joy = {id:null, ox:0, oy:0, x:0, y:0}, runToggle = false, atkHeld = false, mouseAim = false, mouseX = 0, mouseY = 0;
addEventListener('keydown', e => {
  if (mode !== 'play') return;
  const k = e.key.toLowerCase();
  if (k === 'i' || k === 'tab' || k === 'ш') { e.preventDefault(); if ($('pause').hidden) toggleInv(); return; }
  if ((k === 'r' || k === 'к') && mode === 'play' && !P.car) { toggleEditor(); return; }
  if (k === 'm' || k === 'ь') { if (panel && panel.kind === 'map') closePanel(); else if ($('pause').hidden && !P.sleep) { if (panel) closePanel(); openMap(); } return; }
  if (P.sleep) { if (k === 'escape' || k === ' ') wake(); return; }
  if (k === 'e' || k === 'у') doAction();
  if (k === 'q' || k === 'й') { if ($('actMenu').hidden) openActMenu(); else $('actMenu').hidden = true; }
  if (k >= '1' && k <= '5') useHot(+k - 1);
  if (k === 'b' || k === 'и') doBarricade();
  if (k === 'c' || k === 'с') setSneak(!P.sneak);
  if (k === ' ') { e.preventDefault(); atkHeld = true; }
  keys.add(e.code);
});
addEventListener('keyup', e => { keys.delete(e.code); if (e.key === ' ') atkHeld = false; });
addEventListener('blur', () => { keys.clear(); atkHeld = false; joy.id = null; joy.x = joy.y = 0; $('stick').hidden = true; });
let wheelT = 0;
function setZoom(d) { settings.zoom = clamp(settings.zoom + d, -1, 2); saveSettings(); }
addEventListener('wheel', e => { if (mode !== 'play') return; const now = performance.now(); if (now - wheelT < 160) return; wheelT = now; setZoom(e.deltaY > 0 ? -1 : 1); }, {passive:true});

cv.addEventListener('pointerdown', e => {
  if (mode !== 'play' || paused || P.sleep) return;
  $('actMenu').hidden = true;
  if (e.pointerType === 'mouse') { if (e.button === 2) { tapWorld(e.clientX, e.clientY); return; } if (e.button === 0) { if (tapWorld(e.clientX, e.clientY)) return; atkHeld = true; attack(); } return; }
  if (e.clientX < innerWidth * .45 && joy.id === null) {
    joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0; joy.t0 = performance.now(); joy.moved = 0;
    const st = $('stick'); st.style.left = joy.ox + 'px'; st.style.top = joy.oy + 'px'; st.hidden = false;
    $('knob').style.transform = '';
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  } else if (!tapWorld(e.clientX, e.clientY)) attack();
});
cv.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { mouseAim = !isTouch; mouseX = e.clientX; mouseY = e.clientY; return; }
  if (e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const l = Math.hypot(dx, dy), m = 55; joy.moved = Math.max(joy.moved || 0, l);
  if (l > m) { dx = dx / l * m; dy = dy / l * m; }
  joy.x = dx / m; joy.y = dy / m;
  $('knob').style.transform = `translate(${dx}px,${dy}px)`;
});
const endJoy = e => {
  if (e.pointerType === 'mouse') { atkHeld = false; return; }
  if (e.pointerId !== joy.id) return;
  const tap = (joy.moved || 0) < 12 && performance.now() - (joy.t0 || 0) < 350;
  joy.id = null; joy.x = joy.y = 0; $('stick').hidden = true;
  if (tap && e.type === 'pointerup' && mode === 'play' && !paused) tapWorld(e.clientX, e.clientY);
};
cv.addEventListener('pointerup', endJoy); cv.addEventListener('pointercancel', endJoy);
cv.addEventListener('contextmenu', e => e.preventDefault());

const bAtk = $('bAtk');
bAtk.addEventListener('pointerdown', e => { e.preventDefault(); atkHeld = true; bAtk.classList.add('held'); attack(); });
const relAtk = () => { atkHeld = false; bAtk.classList.remove('held'); };
bAtk.addEventListener('pointerup', relAtk); bAtk.addEventListener('pointercancel', relAtk); bAtk.addEventListener('pointerleave', relAtk);
$('bAct').addEventListener('pointerdown', e => { e.preventDefault(); doAction(); });
$('bMore').addEventListener('pointerdown', e => { e.preventDefault(); if ($('actMenu').hidden) openActMenu(); else $('actMenu').hidden = true; });
$('bBar').addEventListener('pointerdown', e => { e.preventDefault(); doBarricade(); });
function setRun(v) { runToggle = v; if (v) setSneak(false, true); $('bRun').classList.toggle('on', v); }
function setSneak(v, quiet) { if (P) P.sneak = v; if (v && runToggle) setRun(false); $('bSneak').classList.toggle('on', v); }
$('bRun').addEventListener('pointerdown', e => { e.preventDefault(); setRun(!runToggle); });
$('bSneak').addEventListener('pointerdown', e => { e.preventDefault(); setSneak(!P.sneak); });
$('zIn').addEventListener('click', () => setZoom(1));
$('zOut').addEventListener('click', () => setZoom(-1));
