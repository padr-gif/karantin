// ================= вибрация: удары, находки, стекло, выбитая дверь, смерть =================
// Укус уже вздрагивает сам (06-actions). Здесь — остальное, поверх звуков: где играет звук, там и толчок.
// Работает там, где есть navigator.vibrate (Android); на iPhone браузер вибрацию не даёт — там просто тихо.
const buzz = (p, key, gap) => {
  if (settings.vib === false || !navigator.vibrate || mode !== 'play') return;
  if (key && !SFX.ok('vib_' + key, gap || 80)) return;
  try { navigator.vibrate(p); } catch (e) {}
};
const nearHero = (x, y, r) => x == null || !P || Math.hypot(x - P.x, y - P.y) < (r || 3.5);
{
  const wrap = (k, fn) => { const f = SFX[k]; if (typeof f === 'function') SFX[k] = function () { fn.apply(null, arguments); return f.apply(this, arguments); }; };
  wrap('hit', (heavy, x, y) => { if (nearHero(x, y, 2.5)) buzz(heavy ? 35 : 20, 'hit', 60); });          // попал по мертвецу
  wrap('splat', (x, y) => { if (nearHero(x, y, 3)) buzz([25, 30, 40], 'splat', 150); });                   // мертвец упал
  wrap('glass', (x, y) => { if (nearHero(x, y)) buzz([15, 25, 15, 25, 15], 'glass', 300); });             // стекло рядом
  wrap('wood', (x, y) => { if (nearHero(x, y)) buzz(30, 'wood', 120); });                                // доска, дверь, лом
  wrap('pickup', () => buzz(12, 'pickup', 120));                                                          // взял вещь
  wrap('equip', () => buzz(15, 'equip', 120));                                                            // взял в руки
}
// смерть — длинный тяжёлый толчок
{ const _die = die; die = function () { const was = mode; _die.apply(this, arguments); if (was === 'play' && mode === 'dead') try { settings.vib !== false && navigator.vibrate && navigator.vibrate([120, 80, 300]); } catch (e) {} }; }
// подпись в настройках (строка «Вибрация» есть, если её добавила версия игры)
{ const s = $('sVib'), n = s && s.parentNode && s.parentNode.querySelector('small'); if (n) n.textContent = 'Телефон вздрагивает от укусов, ударов, находок и выбитых дверей'; }
