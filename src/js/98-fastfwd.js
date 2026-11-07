// ================= ускорение времени: только пока герой стоит =================
// Кнопка ▶▶ слева от масштаба, тап по часам или F: обычная → ×2 → ×4 → обычная. Ускоряется только игровое время
// (часы, голод, жажда, раны, огород, передачи), мертвецы — как обычно.
// Шагнул, побежал, сел в машину, ударил — ускорение сбрасывается совсем: включать заново.
// Опасность (мертвец рядом, удар, кровотечение, голод/жажда, мало здоровья, осада) — тоже сброс, с подсказкой.
// Пока ускорено, на часах видно, сколько времени уже «прокручено» (без часов на руке точного времени нет — это и есть отклик).
const FF_LV = [1, 2, 4];
const FF = {i:0, run:false, g0:0, warn:{}};
function ffWhy() {                                                               // строка — сбросить с подсказкой, 1 — сбросить молча, 0 — можно
  if (!P || mode !== 'play') return 1;
  if (P.sleep) return 1;
  if (zs.some(z => !z.dead && (z.state === 'chase' ? Math.hypot(z.x - P.x, z.y - P.y) < 16 : Math.hypot(z.x - P.x, z.y - P.y) < 9 && vis[Math.floor(z.y) * MW + Math.floor(z.x)]))) return 'Мертвец рядом — время снова обычное';
  if (P.hurt > 0) return 'Тебя ранили — время снова обычное';
  if (P.bleed) return 'Кровотечение — сначала перевяжись';
  if (P.hp < 25) return 'Ты слишком слаб — время снова обычное';
  if (typeof SIEGE !== 'undefined' && SIEGE.on && zs.some(z => z.siege && Math.hypot(z.x - P.x, z.y - P.y) < 12)) return 'Осада у дверей — время снова обычное';
  if (P.moving || P.running || P.car || atkHeld || P.swing > 0 || (P.act && P.act.kind === 'vault')) return 1;
  return 0;
}
// «будильники» ускорения: нужда подступила — останавливаемся один раз, чтобы не проморгать
const FF_ALARM = [
  ['sat', () => P.sat < 20, 'Проголодался — время снова обычное'],
  ['hyd', () => P.hyd < 20, 'Хочется пить — время снова обычное'],
  ['en', () => P.en < 15, 'Клонит в сон — время снова обычное'],
  ['night', () => lightLevel() < .3, 'Стемнело — время снова обычное'],
  ['power', () => !powerOn(), 'Отключили электричество — время снова обычное'],
  ['siege', () => typeof SIEGE !== 'undefined' && SIEGE.warned && !SIEGE.on, 'Сегодня ночью осада — время снова обычное'],
];
// множитель игровых минут за кадр (сон — ×40, как раньше)
function timeK() { return P && P.sleep ? 40 : FF.run ? FF_LV[FF.i] : 1; }
function ffSet(i, quiet) {
  FF.i = i % FF_LV.length; FF.g0 = gameMin; FF.run = false;
  if (FF.i) {
    const w = ffWhy();
    if (typeof w === 'string') { FF.i = 0; if (!quiet) toast(w); ffUI(); return; }
    for (const [k, test] of FF_ALARM) FF.warn[k] = !!(P && test());             // то, что уже есть, — не повод сразу останавливаться
    FF.run = !w;
  }
  if (!quiet) toast(FF.i ? 'Время ×' + FF_LV[FF.i] + '. Пошёл — и скорость снова обычная' : 'Обычная скорость времени');
  ffUI();
}
function ffStop(msg) { if (!FF.i) return; FF.i = 0; FF.run = false; if (msg) toast(msg); ffUI(); }
function ffTap() { if (mode !== 'play' || paused || !P || P.sleep || document.body.classList.contains('ctledit')) return; if (SFX.ui) SFX.ui(); ffSet(FF.i + 1); }
function ffSpan(m) { m = Math.floor(m); return m < 60 ? '+' + m + ' мин' : '+' + Math.floor(m / 60) + ' ч' + (m % 60 >= 5 ? ' ' + (m % 60) + ' мин' : ''); }
let ffShown = '';
function ffUI() {
  const t = $('ffTag'), c = $('clockBox'), b = $('bFF');
  const txt = FF.i ? '×' + FF_LV[FF.i] + (gameMin - FF.g0 >= 1 ? ' · ' + ffSpan(gameMin - FF.g0) : '') : '';
  if (t) { t.hidden = !FF.i; t.textContent = txt; }
  if (c) c.classList.toggle('ff', !!FF.i);
  if (b) { b.classList.toggle('on', !!FF.i); $('ffLv').textContent = FF.i ? '×' + FF_LV[FF.i] : ''; }
  ffShown = txt;
}
onUpdate(() => {
  if (!P || mode !== 'play') return;
  if (!FF.i) { FF.run = false; return; }
  const w = ffWhy();
  if (w) { ffStop(typeof w === 'string' ? w : P.sleep ? '' : 'Обычная скорость времени'); return; }
  for (const [k, test, msg] of FF_ALARM) { const on = test(); if (on && !FF.warn[k]) { FF.warn[k] = true; ffStop(msg); return; } if (!on) FF.warn[k] = false; }
  FF.run = true;
  if (frameNo % 10 === 0) { const g = Math.floor(gameMin - FF.g0); if (ffShown.indexOf(ffSpan(g)) < 0) ffUI(); }
});
// подсказка один раз за игру: постоял спокойно полминуты в доме — показать, где кнопка
onUpdate(dt => {
  if (!P || mode !== 'play' || paused || FF.i || P._ffHint || panel) return;
  if (ffWhy() || !insideHouse(P.x, P.y) || P.act) { FF.idle = 0; return; }
  FF.idle = (FF.idle || 0) + dt;
  if (FF.idle > 30) { P._ffHint = 1; toast('Ждёшь? Кнопка ▶▶ под часами ускоряет время, пока стоишь на месте'); const b = $('bFF'); if (b) { b.classList.add('hint'); setTimeout(() => b.classList.remove('hint'), 4000); } }
});
onNewWorld(() => ffStop());
onLoad(() => ffStop());
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
    if (k === 'f' || k === 'а') ffTap();
  });
}
