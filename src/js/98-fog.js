// ================= туман по краям экрана: мир кажется больше, дальние края не видно =================
// Отдельный слой прямо над холстом игры и под интерфейсом (значки, кнопки, карта — поверх тумана).
// Днём — серая дымка, в сумерках темнеет, ночью края уходят в черноту; в дождь гуще. Настройка «Туман по краям».
{
  const el = mk('div'); el.id = 'edgeFog'; el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;transition:background 2s linear,opacity .6s';
  const game = $('game'); if (game && game.parentNode) game.after(el); else document.body.appendChild(el);
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  let last = '';
  const paint = () => {
    const on = settings.fog !== false && (mode === 'play' || mode === 'dead' || mode === 'menu');
    el.style.opacity = on ? '1' : '0'; if (!on) return;
    const L = typeof lightLevel === 'function' && P ? lightLevel() : .3;               // 1 — день, 0 — ночь
    const wet = typeof rain === 'number' ? Math.min(1, rain) : 0;
    const col = mix([6, 8, 11], [150, 158, 162], L), a = (L > .5 ? .42 : .68) + wet * .08;
    const inner = Math.round(44 - wet * 8);                                          // где начинается дымка, % от центра
    const css = `radial-gradient(ellipse 72% 80% at 50% 52%, rgba(${col},0) ${inner}%, rgba(${col},${(a * .45).toFixed(2)}) ${inner + 30}%, rgba(${col},${a.toFixed(2)}) 100%)`;
    if (css !== last) { el.style.background = css; last = css; }
  };
  paint(); setInterval(paint, 1000);
}
setRowAdd('Туман по краям', 'Дымка по краям экрана: дальнее не видно, мир кажется больше', 'sFog', 'img');
{ const f = openSettings; openSettings = function () { const r = f.apply(this, arguments);
    if ($('sFog')) seg($('sFog'), [[true, 'Вкл'], [false, 'Выкл']], () => settings.fog !== false, v => { settings.fog = v; saveSettings(); });
    return r; }; }
