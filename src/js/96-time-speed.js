// ================= ускорение времени: ×1, ×2, ×4 =================
// Как в Project Zomboid: за кадр игра делает несколько шагов логики, поэтому ускоряется всё — часы, голод, погода,
// мертвецы. Опасность сама возвращает обычную скорость: мертвец гонится рядом, героя ранили, начал кровоточить.
// Кнопка у масштаба (тап — следующая скорость) и клавиша F. В сохранение не пишется: после загрузки — ×1.
const TSPD = {n:1, list:[1, 2, 4]};
function setTimeSpeed(n, why) {
  if (TSPD.n === n) return;
  TSPD.n = n; const b = $('tSpd'); if (b) { b.textContent = '×' + n; b.classList.toggle('on', n > 1); }
  if (why) toast(why);
}
function cycleTimeSpeed() {
  if (mode !== 'play' || P.sleep) return;
  const L = TSPD.list, n = L[(L.indexOf(TSPD.n) + 1) % L.length];
  if (n > 1 && timeDanger()) { toast('Не сейчас: рядом опасно'); return; }
  SFX.ui(); setTimeSpeed(n, n > 1 ? 'Время ×' + n + '. Опасность вернёт обычную скорость' : 'Обычная скорость');
}
const timeDanger = () => P.hurt > 0 || zs.some(z => z.state === 'chase' && Math.hypot(z.x - P.x, z.y - P.y) < 16) || (P.act && P.act.kind === 'reload');
onUpdate(() => {
  if (TSPD.n > 1 && (timeDanger() || (P.bleed && !TSPD.bled))) setTimeSpeed(1, 'Опасность — обычная скорость');
  TSPD.bled = !!P.bleed;
});
onStartNew(() => setTimeSpeed(1));
onLoad(() => setTimeSpeed(1));
$('tSpd').addEventListener('click', e => { e.stopPropagation(); cycleTimeSpeed(); });
addEventListener('keydown', e => { if ((e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') && !e.repeat && !panel && $('pause').hidden) cycleTimeSpeed(); });
