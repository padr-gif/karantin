// ================= мягкие звуки интерфейса: обыск, взять вещь, выбор иконки, кнопки =================
// Вместо записей handle/cloth и резкого щелчка: синус и треугольник с плавной атакой, всё через мягкий фильтр.
// Небольшой разброс высоты, чтобы частые звуки (перекладывание вещей) не надоедали.
const SOFT = (() => {
  let lp = null, nb = null;
  function bus() {
    const ac = SFX.ac; if (!ac || !SFX.out) return null;
    if (!lp) { lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = .3; lp.connect(SFX.out); }
    return lp;
  }
  const jit = () => .97 + Math.random() * .06;
  // одна нота: мягкое начало 12 мс, плавное затухание
  function note(f, peak, dur, delay, type, f2) {
    const ac = SFX.ac, b = bus(); if (!b || ACTIVE_SND >= MAX_SND) return;
    const v = peak * SFX.vol(); if (v < .002) return;
    const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(b); sndStart(o, t); o.stop(t + dur + .05);
  }
  // мягкий «шурх» ткани: приглушённый шум с медленной атакой
  function brush(peak, dur, f, delay) {
    const ac = SFX.ac, b = bus(); if (!b || ACTIVE_SND >= MAX_SND) return;
    const v = peak * SFX.vol(); if (v < .002) return;
    if (!nb) { nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = nb.getChannelData(0); let y = 0; for (let i = 0; i < d.length; i++) { y = y * .6 + (Math.random() * 2 - 1) * .4; d[i] = y; } }
    const t = ac.currentTime + (delay || 0), s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nb; fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = .7;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + dur * .35); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(b); sndStart(s, t, Math.random() * .5); s.stop(t + dur + .05);
  }
  return {note, brush, jit};
})();

// кнопки интерфейса: тихий округлый «тук»
SFX.ui = function () { if (!SFX.ok('ui', 40)) return; const r = SOFT.jit(); SOFT.note(700 * r, .07, .09, 0, 'sine', 600 * r); SOFT.note(1400 * r, .012, .05); };
// выбор иконки в инвентаре и ящиках: короткая нежная нота
SFX.select = function () { if (!SFX.ok('select', 35)) return; const r = SOFT.jit(); SOFT.note(880 * r, .055, .13, 0, 'triangle'); SOFT.note(1760 * r, .01, .08); };
// обыск и перекладывание вещей: мягкий шорох и тихая нота
SFX.rustle = function () { if (!SFX.ok('rustle35', 120)) return; const r = SOFT.jit(); SOFT.brush(.07, .16, 850 * r); SOFT.note(523 * r, .03, .12, .03); };
// взять вещь: шорох и две ноты вверх, как маленькая награда
SFX.pickup = function () { if (!SFX.ok('pickup', 90)) return; const r = SOFT.jit(); SOFT.brush(.05, .12, 1000 * r); SOFT.note(659 * r, .06, .16, .02); SOFT.note(988 * r, .05, .24, .09); };
// надеть, взять в руки: низкий мягкий «тум»
SFX.equip = function () { const r = SOFT.jit(); SOFT.brush(.06, .14, 700 * r); SOFT.note(330 * r, .08, .16, 0, 'sine', 290 * r); SOFT.note(660 * r, .02, .1, .04); };

// тап по иконке вещи (инвентарь, ящики, земля) — мягкая нота выбора
document.addEventListener('click', ev => {
  const c = ev.target && ev.target.closest && ev.target.closest('button.cell');
  if (c && !c.disabled) SFX.select();
}, true);
