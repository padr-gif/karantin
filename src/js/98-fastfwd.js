// ================= ускорение времени: только пока герой стоит =================
// Кнопка ▶▶ под часами, тап по часам или F переключает скорость: обычная → ×3 → ×10 → обычная. Ускоряется только игровое время
// (часы, голод, жажда, раны, огород, передачи), мертвецы и движения — как обычно.
// Герой пошёл, побежал, сел в машину, ударил — сразу обычная скорость; встал — снова быстрая (режим остаётся включённым).
// Опасность (погоня рядом, удар, кровотечение, голод/жажда на нуле, начало осады) — режим сам выключается.
const FF_LV = [1, 3, 10];
const FF = {i:0, run:false};
function ffWhy() {                                                               // почему нельзя ускорять: строка — выключить совсем, 1 — просто подождать
  if (!P || mode !== 'play' || P.sleep) return 1;
  if (zs.some(z => z.state === 'chase' && Math.hypot(z.x - P.x, z.y - P.y) < 14)) return 'Мертвецы рядом — время снова обычное';
  if (P.hurt > 0) return 'Тебя ранили — время снова обычное';
  if (P.bleed) return 'Кровотечение — сначала перевяжись';
  if (P.sat < 6 || P.hyd < 6) return 'Голод и жажда — время снова обычное';
  if (P.hp < 25) return 'Ты слишком слаб — время снова обычное';
  if (typeof SIEGE !== 'undefined' && SIEGE.on && zs.some(z => z.siege && Math.hypot(z.x - P.x, z.y - P.y) < 10)) return 'Осада у дверей — время снова обычное';
  if (P.moving || P.running || P.car || atkHeld || P.swing > 0 || (P.act && P.act.kind === 'vault')) return 1;
  return 0;
}
// множитель игрового времени за кадр (сон — ×40, как раньше)
function timeK() { return P && P.sleep ? 40 : FF.run ? FF_LV[FF.i] : 1; }
function ffSet(i, quiet) {
  FF.i = i % FF_LV.length;
  if (FF.i) { const w = ffWhy(); if (typeof w === 'string') { FF.i = 0; if (!quiet) toast(w); ffUI(); return; } }
  if (!quiet) toast(FF.i ? 'Время ×' + FF_LV[FF.i] + ': идёт быстрее, пока стоишь на месте' : 'Обычная скорость времени');
  ffUI();
}
function ffTap() { if (mode !== 'play' || paused || !P || P.sleep || document.body.classList.contains('ctledit')) return; SFX.ui && SFX.ui(); ffSet(FF.i + 1); }
function ffUI() {
  const t = $('ffTag'); if (!t) return;
  t.hidden = !FF.i; t.textContent = '×' + FF_LV[FF.i];
  t.classList.toggle('hold', !!FF.i && !FF.run);
  const c = $('clockBox'); if (c) c.classList.toggle('ff', !!FF.i);
  const b = $('bFF'); if (b) { b.classList.toggle('on', !!FF.i); b.classList.toggle('hold', !!FF.i && !FF.run); $('ffLv').textContent = FF.i ? '×' + FF_LV[FF.i] : ''; }
}
onUpdate(() => {
  if (!P || mode !== 'play') return;
  if (!FF.i) { FF.run = false; return; }
  const w = ffWhy();
  if (typeof w === 'string') { FF.i = 0; FF.run = false; toast(w); ffUI(); return; }
  const run = !w;
  if (run !== FF.run) { FF.run = run; ffUI(); }
});
onNewWorld(() => { FF.i = 0; FF.run = false; ffUI(); });
onLoad(() => { FF.i = 0; FF.run = false; ffUI(); });
{
  const c = $('clockBox');
  if (c) {
    c.setAttribute('role', 'button'); c.title = 'Ускорить время (F)';
    c.addEventListener('click', ffTap);
    const t = document.createElement('span'); t.id = 'ffTag'; t.className = 'fftag'; t.hidden = true; c.appendChild(t);
  }
  const b = $('bFF'); if (b) b.addEventListener('click', e => { e.stopPropagation(); ffTap(); });
  addEventListener('keydown', e => {
    if (mode !== 'play' || paused || !P || P.sleep || panel) return;
    const k = e.key.toLowerCase();
    if (k === 'f' || k === 'а') ffSet(FF.i + 1);
  });
}
