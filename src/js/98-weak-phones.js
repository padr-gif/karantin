// ================= слабые телефоны (v0.86) =================
// • Первый запуск: по числу ядер и памяти телефон сразу получает «Экономию» или «Минимум».
// • Во время игры: если кадров стабильно мало, графика сама опускается на ступень (пока игрок не выбрал её сам).
// • «Частота кадров»: ограничение 30 к/с (в «Минимуме» включено по умолчанию, 99-wiring).
const GFX_STEPS = [1, 1.5, 2, 3];
const GFX_NAME = {1:'Минимум', 1.5:'Экономия', 2:'Обычная', 3:'Максимум'};

// --- первый запуск: оценка по железу ---
function weakGuess() {
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory;   // deviceMemory есть только в Chrome/Android
  if ((mem && mem <= 2) || cores <= 2) return 1;
  if (isTouch && ((mem && mem <= 4) || cores <= 4)) return 1.5;
  return 2;
}
if (settings.gfxAuto == null) {
  const g = weakGuess();
  settings.gfxAuto = true;                                                   // графику пока подбирает игра
  if (g < settings.gfx) settings.gfx = g;
  try { localStorage.setItem('karantin-settings', JSON.stringify(settings)); } catch (e) {}   // применится в loadSettings (99-wiring)
}

// --- во время игры: подстройка по настоящей скорости ---
{
  let acc = 0, n = 0, warm = 0, cool = 0, ld = -1, prev = 0;
  const tick = t => {
    requestAnimationFrame(tick);
    if (ld === lastDraw) return; ld = lastDraw;
    const raw = prev ? (t - prev) / 1000 : 0; prev = t;
    if (mode !== 'play' || paused || resLock || document.hidden || !settings.gfxAuto || raw <= 0 || raw > .5) { acc = n = 0; return; }
    if ((warm += raw) < 6) return;                                           // первые секунды — догрузка кусков земли, не показатель
    if (cool > 0) { cool -= raw; return; }
    acc += raw; n++;
    if (acc < 8) return;
    const fps = n / acc; acc = n = 0;
    const i = GFX_STEPS.indexOf(settings.gfx);
    if (fps < (fpsCap() ? 22 : 26) && i > 0) {
      settings.gfx = GFX_STEPS[i - 1]; saveSettings(); cool = 12;
      toast('Телефону тяжело — графика «' + GFX_NAME[settings.gfx] + '». Поменять можно в настройках');
    }
  };
  requestAnimationFrame(tick);
}

// --- настройки: ручной выбор графики выключает автоподбор; строка «Частота кадров» ---
setRowAdd('Частота кадров', '30 к/с — ровнее и холоднее на слабом телефоне, меньше тратит батарею', 'sCap', 'img');
{ const f = openSettings; openSettings = function () { const r = f.apply(this, arguments);
    const g = $('sGfx'); if (g && !g._auto) { g._auto = true; g.addEventListener('click', () => { if (settings.gfxAuto) { settings.gfxAuto = false; saveSettings(); } }, true); }
    if ($('sCap')) seg($('sCap'), [[false, '60 к/с'], [true, '30 к/с']], () => fpsCap(), v => { settings.cap30 = v; saveSettings(); });
    return r; }; }

// тест скорости: совсем медленно — сразу «Минимум»
{ const f = showBench; showBench = function () {
    f.apply(this, arguments);
    if (BENCH && BENCH.rows.length && Math.min(...BENCH.rows.map(r => r.fps)) < 18 && settings.gfx > 1) { settings.gfx = 1; settings.gfxAuto = false; saveSettings(); toast('Включил графику «Минимум»'); }
  }; }
