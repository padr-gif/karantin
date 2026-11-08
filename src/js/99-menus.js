// ================= все меню — в одном стиле с паузой (99-pause) =================
// Тёмная карточка с золотой рамкой, золотая главная кнопка, остальные — плитки с иконками, вкладки и переключатели
// одного вида. Стили — в конце styles.css («все меню»). Здесь — только иконки на кнопках (те же элементы, обработчики не меняются).
// Заставки (досье, дневник, радио в #story) не трогаем: это бумаги из мира игры, а не меню.
const MENU_IC = (() => {
  const I = d => `<svg class="pz-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  return {
    play:I('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>'),
    save:I('<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>'),
    load:I('<path d="M3.5 7.5h6l2 2h9v9.5h-17z"/><path d="M12 17v-5m-2.5 2.5L12 12l2.5 2.5"/>'),
    ach:I('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>'),
    gear:I('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>'),
    exit:I('<path d="M14 4h5v16h-5"/><path d="M10 8l-4 4 4 4M6 12h9"/>'),
    book:I('<path d="M4 5.5A2 2 0 0 1 6 4h5v15H6a2 2 0 0 0-2 1.5zM20 5.5A2 2 0 0 0 18 4h-5v15h5a2 2 0 0 1 2 1.5z"/>'),
    cap:I('<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4c1.5 1.6 3.4 2.4 5.5 2.4s4-.8 5.5-2.4v-4M21.5 9.5v5"/>'),
    back:I('<path d="M15 5l-7 7 7 7"/>'),
    check:I('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    again:I('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 4.5v4h4"/>'),
    sun:I('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
    dice:I('<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>'),
  };
})();
// иконка в начало кнопки; текст оборачиваем в <span>, чтобы его можно было менять, не теряя иконку
function menuIcon(id, ic) {
  const b = $(id); if (!b || b.querySelector('.pz-i')) return;
  b.classList.add('pz-b');
  const small = b.querySelector('small');
  const txt = [...b.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
  for (const n of [...b.childNodes]) if (n.nodeType === 3) n.remove();
  b.insertAdjacentHTML('afterbegin', MENU_IC[ic]);
  const s = mk('span', 'pz-t', txt); if (small) b.insertBefore(s, small); else b.appendChild(s);
}
{
  const MAP = {mContinue:'play', mNew:'play', mTut:'cap', mLoad:'load', mSettings:'gear', mAch:'ach', mHelp:'book',
    svBack:'back', setBack:'check', helpBack:'check', achBack:'back', cBack:'back', cStart:'play',
    bLife:'play', bAgain:'again', dLoad:'load', dMenu:'exit', bWake:'sun'};
  const apply = () => { for (const id in MAP) menuIcon(id, MAP[id]); };
  apply();
  // «Обучение» добавляется в меню позже (98-tutorial) — догоняем, когда меню показывается
  const f = show; show = function (id) { const r = f.apply(this, arguments); if (id) { apply(); requestAnimationFrame(apply); } return r; };
}
