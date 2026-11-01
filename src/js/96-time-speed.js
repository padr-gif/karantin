// ================= ускорение времени: ×1, ×2, ×4 =================
// Как в Project Zomboid: за кадр игра делает несколько шагов логики, поэтому ускоряется всё — часы, голод, погода,
// мертвецы. Опасность сама возвращает обычную скорость: мертвец гонится совсем рядом (ближе 7 клеток), героя ударили,
// начал кровоточить. Опасность прошла (3 с спокойно) — выбранная скорость возвращается сама (v87: раньше сбрасывалась
// навсегда, а погоня в 16 клетках начиналась от любого шага — на ходу ускорение не держалось).
// Кнопка у масштаба (тап — следующая скорость) и клавиша F. В сохранение не пишется: после загрузки — ×1.
const TSPD = {n:1, list:[1, 2, 4], want:1, calm:0};
function setTimeSpeed(n, why) {
  if (TSPD.n === n) return;
  TSPD.n = n; const b = $('tSpd'); if (b) { b.textContent = '×' + n; b.classList.toggle('on', n > 1); }
  if (why) toast(why);
}
function cycleTimeSpeed() {
  if (mode !== 'play' || P.sleep) return;
  const L = TSPD.list, n = L[(L.indexOf(TSPD.n) + 1) % L.length];
  if (n > 1 && timeDanger()) { toast('Не сейчас: рядом опасно'); return; }
  SFX.ui(); TSPD.want = n; setTimeSpeed(n, n > 1 ? 'Время ×' + n + '. Рядом опасность — на время обычная скорость' : 'Обычная скорость');
}
const timeDanger = () => P.hurt > 0 || zs.some(z => z.state === 'chase' && Math.hypot(z.x - P.x, z.y - P.y) < 7) || (P.act && P.act.kind === 'reload');
onUpdate(dt => {
  const danger = timeDanger() || (P.bleed && !TSPD.bled); TSPD.bled = !!P.bleed;
  if (danger) { TSPD.calm = 0; if (TSPD.n > 1) setTimeSpeed(1, 'Опасность — обычная скорость'); return; }
  if (TSPD.want > 1 && TSPD.n === 1 && (TSPD.calm += dt) > 3) setTimeSpeed(TSPD.want, 'Спокойно — снова ×' + TSPD.want);
});
onStartNew(() => { TSPD.want = 1; setTimeSpeed(1); });
onLoad(() => { TSPD.want = 1; setTimeSpeed(1); });
$('tSpd').addEventListener('click', e => { e.stopPropagation(); cycleTimeSpeed(); });
addEventListener('keydown', e => { if ((e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') && !e.repeat && !panel && $('pause').hidden) cycleTimeSpeed(); });
