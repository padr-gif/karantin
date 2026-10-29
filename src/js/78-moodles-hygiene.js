// ================= нарисованные значки состояний (эмоции, болезни, травмы, нужды) =================
// Вместо надписей в HUD — круглые значки-эмодзи. Тап по значку: из него выезжает название и через секунду с небольшим заезжает обратно.
// Значок по названию состояния (то, что кладут в список в updateHud, woundMoodles и т.д.); незнакомое — восклицательный знак.
const MO_LINE = '#2a1d12';
const moFace = (fill, inner, extra) => `<circle cx="16" cy="16.5" r="12.5" fill="${fill}" stroke="${MO_LINE}" stroke-width="1.6"/><ellipse cx="11.5" cy="10" rx="4" ry="2.2" fill="#fff" opacity=".35"/>${inner}${extra || ''}`;
const MO = {
  eyes:'<circle cx="12" cy="15" r="1.7" fill="#2a1d12"/><circle cx="20" cy="15" r="1.7" fill="#2a1d12"/>',
  wide:'<circle cx="11.5" cy="14.5" r="3.2" fill="#fff" stroke="#2a1d12" stroke-width="1.2"/><circle cx="20.5" cy="14.5" r="3.2" fill="#fff" stroke="#2a1d12" stroke-width="1.2"/><circle cx="11.5" cy="14.8" r="1.2" fill="#2a1d12"/><circle cx="20.5" cy="14.8" r="1.2" fill="#2a1d12"/>',
  shut:'<path d="M9 15q3 2.4 6 0M17 15q3 2.4 6 0" fill="none" stroke="#2a1d12" stroke-width="1.5" stroke-linecap="round"/>',
  squint:'<path d="M9 12.5l4 2.5-4 2.5M23 12.5l-4 2.5 4 2.5" fill="none" stroke="#2a1d12" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  xeyes:'<path d="M9.5 12.5l4 4M13.5 12.5l-4 4M18.5 12.5l4 4M22.5 12.5l-4 4" stroke="#2a1d12" stroke-width="1.6" stroke-linecap="round"/>',
  lids:'<path d="M9 14.5h6M17 14.5h6" stroke="#2a1d12" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="16" r="1.2" fill="#2a1d12"/><circle cx="20" cy="16" r="1.2" fill="#2a1d12"/>',
  dizzy:'<path d="M12 15m-2.2 0a2.2 2.2 0 1 0 2.2-2.2q-1 0-1 1t1 1M20 15m-2.2 0a2.2 2.2 0 1 0 2.2-2.2q-1 0-1 1t1 1" fill="none" stroke="#2a1d12" stroke-width="1.2"/>',
  worry:'<path d="M8.5 11l4.5-2M23.5 11l-4.5-2" stroke="#2a1d12" stroke-width="1.5" stroke-linecap="round"/>',
  sadb:'<path d="M9 10.5l4 1.5M23 10.5l-4 1.5" stroke="#2a1d12" stroke-width="1.5" stroke-linecap="round"/>',
  angry:'<path d="M8.5 10l5 2.2M23.5 10l-5 2.2" stroke="#2a1d12" stroke-width="1.8" stroke-linecap="round"/>',
  flat:'<path d="M12.5 22h7" stroke="#2a1d12" stroke-width="1.6" stroke-linecap="round"/>',
  side:'<path d="M13 22.5l7-1.2" stroke="#2a1d12" stroke-width="1.6" stroke-linecap="round"/>',
  frown:'<path d="M11.5 23.5q4.5-4 9 0" fill="none" stroke="#2a1d12" stroke-width="1.6" stroke-linecap="round"/>',
  o:'<ellipse cx="16" cy="22.5" rx="2.6" ry="3.2" fill="#5a1f1a" stroke="#2a1d12" stroke-width="1.3"/>',
  yawn:'<ellipse cx="16" cy="22.5" rx="2.2" ry="2.6" fill="#5a1f1a" stroke="#2a1d12" stroke-width="1.2"/>',
  wave:'<path d="M10.5 22.5q1.4-2 2.8 0t2.8 0 2.8 0 2.8 0" fill="none" stroke="#2a1d12" stroke-width="1.5" stroke-linecap="round"/>',
  teeth:'<rect x="10.5" y="20" width="11" height="5" rx="1.5" fill="#fff" stroke="#2a1d12" stroke-width="1.3"/><path d="M10.5 22.5h11M13.3 20v5M16 20v5M18.7 20v5" stroke="#2a1d12" stroke-width=".8"/>',
  grim:'<path d="M10.5 23q2.7-3 5.5-.5t5.5-.5" fill="none" stroke="#2a1d12" stroke-width="1.6" stroke-linecap="round"/>',
  tear:'<path d="M21.5 18q-1.6 2.6 0 3.6 1.6-1 0-3.6z" fill="#6cc0f0" stroke="#2a6a9a" stroke-width=".7"/>',
  tears:'<path d="M10.5 17v8M21.5 17v8" stroke="#6cc0f0" stroke-width="2" stroke-linecap="round" opacity=".9"/>',
  sweat:'<path d="M25.5 6q-2.6 3.6-.3 5 2.6-1 .3-5z" fill="#7cc8f4" stroke="#2a6a9a" stroke-width=".8"/>',
};
const moDrop = (x, y, s, fill, line) => `<path d="M${x} ${y - 4.5 * s}q${-3.6 * s} ${4.6 * s} ${-3.6 * s} ${6.4 * s}a${3.6 * s} ${3.6 * s} 0 0 0 ${7.2 * s} 0q0-${1.8 * s}-${3.6 * s}-${6.4 * s}z" fill="${fill}" stroke="${line || MO_LINE}" stroke-width="1.3"/>`;
const moZ = (x, y, s) => `<path d="M${x} ${y}h${4 * s}l${-4 * s} ${4 * s}h${4 * s}" fill="none" stroke="#e8f0ff" stroke-width="${1.4 * s}" stroke-linecap="round" stroke-linejoin="round"/><path d="M${x} ${y}h${4 * s}l${-4 * s} ${4 * s}h${4 * s}" fill="none" stroke="#3a4a7a" stroke-width=".5"/>`;
const moSnow = (x, y, r) => `<path d="M${x} ${y - r}v${2 * r}M${x - r * .87} ${y - r / 2}l${r * 1.74} ${r}M${x - r * .87} ${y + r / 2}l${r * 1.74} ${-r}" stroke="#eaf6ff" stroke-width="1.6" stroke-linecap="round"/><path d="M${x} ${y - r}v${2 * r}M${x - r * .87} ${y - r / 2}l${r * 1.74} ${r}M${x - r * .87} ${y + r / 2}l${r * 1.74} ${-r}" stroke="#3a78b8" stroke-width=".6" stroke-linecap="round"/>`;
const moBone = (rot, extra) => `<g transform="rotate(${rot} 16 16)"><path d="M10 9.5a2.6 2.6 0 1 1 3.4-2.4h5.2a2.6 2.6 0 1 1 3.4 2.4v13a2.6 2.6 0 1 1-3.4 2.4h-5.2a2.6 2.6 0 1 1-3.4-2.4z" fill="#f4ecd8" stroke="${MO_LINE}" stroke-width="1.4" stroke-linejoin="round"/>${extra || ''}</g>`;
const moCrack = '<path d="M13.5 13.5l2 2-1.5 1.5 2.5 2" fill="none" stroke="#d8352a" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>';
const moSplint = '<rect x="8.5" y="8" width="2.6" height="16" rx="1" fill="#b88a58" stroke="#2a1d12" stroke-width="1"/><rect x="20.9" y="8" width="2.6" height="16" rx="1" fill="#b88a58" stroke="#2a1d12" stroke-width="1"/><path d="M8 12h16M8 20h16" stroke="#f8f8f0" stroke-width="2.4"/><path d="M8 12h16M8 20h16" stroke="#c8c0b0" stroke-width=".5"/>';
const MOOD_ART = {
  // эмоции
  'Паника':moFace('#f7dc6f', MO.wide + MO.o + '<path d="M8 9.5q3-3 6-1M24 9.5q-3-3-6-1" fill="none" stroke="#2a1d12" stroke-width="1.4" stroke-linecap="round"/>', MO.sweat + '<path d="M3.5 10l2.5 1M3 15h2.6M28.5 15h-2.6" stroke="#e05a3c" stroke-width="1.4" stroke-linecap="round"/>'),
  'Тревога':moFace('#f5d56a', MO.eyes + MO.worry + '<path d="M12 23q4-2.6 8 0" fill="none" stroke="#2a1d12" stroke-width="1.5" stroke-linecap="round"/>', MO.sweat),
  'Стресс':moFace('#f0b35a', MO.eyes + MO.angry + MO.teeth, '<path d="M21.5 4.5l2 2.6M24.5 4l-.4 3.2M26.5 6.5l-3 1" stroke="#d8352a" stroke-width="1.6" stroke-linecap="round"/>'),
  'Нервы на пределе':moFace('#e8664f', MO.squint + MO.angry + MO.teeth, '<path d="M4 7q2-2 1-4M28 7q-2-2-1-4M3 12q1.8-.8 1.4-2.6M29 12q-1.8-.8-1.4-2.6" fill="none" stroke="#f0f0f0" stroke-width="1.6" stroke-linecap="round"/>'),
  'Скука':moFace('#f2d36c', MO.lids + MO.side, '<circle cx="24" cy="26.5" r="1" fill="#e8e0c8"/><circle cx="27" cy="26.5" r="1" fill="#e8e0c8"/><circle cx="30" cy="26.5" r="1" fill="#e8e0c8"/>'),
  'Уныние':moFace('#e3cf78', MO.eyes + MO.sadb + MO.frown, MO.tear),
  'Депрессия':moFace('#8ea4c6', MO.shut + MO.sadb + MO.frown + MO.tears, '<path d="M7 6.5a3 3 0 0 1 5.6-1.5 3.4 3.4 0 0 1 6.4 1.5 2.4 2.4 0 0 1-.4 4.7H8a2.4 2.4 0 0 1-1-4.7z" fill="#7d8796" stroke="#2a1d12" stroke-width="1.1"/>'),
  'Незаметен':`<circle cx="16" cy="16.5" r="12.5" fill="#3a4048" stroke="${MO_LINE}" stroke-width="1.6"/><rect x="5" y="12" width="22" height="7" rx="3.5" fill="#d9b48a"/><circle cx="12" cy="15.5" r="1.6" fill="#1a1410"/><circle cx="20" cy="15.5" r="1.6" fill="#1a1410"/><path d="M8.5 13.2l4.5 1M23.5 13.2l-4.5 1" stroke="#1a1410" stroke-width="1.2" stroke-linecap="round"/><path d="M26 9l4-3M27 12l4-1" stroke="#3a4048" stroke-width="1.6" stroke-linecap="round"/>`,
  // болезни
  'Жар':moFace('#ef7d5c', MO.squint + '<path d="M13 22h6" stroke="#2a1d12" stroke-width="1.5" stroke-linecap="round"/>', '<rect x="17" y="19.5" width="11" height="3" rx="1.5" transform="rotate(-18 17 21)" fill="#f2f2f2" stroke="#2a1d12" stroke-width="1"/><circle cx="27.2" cy="17.6" r="1.8" fill="#e0352a" stroke="#2a1d12" stroke-width=".9"/>' + MO.sweat),
  'Тошнота':moFace('#a5cc6e', MO.dizzy + MO.wave, '<path d="M16 3.5q1.5 1.5 0 3t0 3" fill="none" stroke="#6a9a3a" stroke-width="1.2" stroke-linecap="round"/>'),
  'Отравление':moFace('#86b552', MO.xeyes + MO.wave, '<path d="M15 24.5q1 3.6 3.4 2.6t.6-3" fill="#e46a7a" stroke="#2a1d12" stroke-width="1"/><circle cx="25" cy="6.5" r="3.8" fill="#f2f2f2" stroke="#2a1d12" stroke-width="1"/><circle cx="23.7" cy="6.2" r=".9" fill="#2a1d12"/><circle cx="26.3" cy="6.2" r=".9" fill="#2a1d12"/><path d="M24 9h2" stroke="#2a1d12" stroke-width=".8"/>'),
  'Простуда':moFace('#f0d478', MO.lids + MO.frown, '<circle cx="16" cy="19" r="2.4" fill="#e65a4a" stroke="#2a1d12" stroke-width="1"/><path d="M14.8 21.2q-.6 2 .5 3 1-1 .4-3" fill="#bfe8a0" stroke="#5a8a3a" stroke-width=".6"/><path d="M23 21l5.5 3.5-1.5 4-5-2.5z" fill="#fff" stroke="#9aa" stroke-width=".9"/>'),
  // холод и сырость
  'Прохладно':moFace('#bfe2f0', MO.eyes + MO.flat, moSnow(26, 6.5, 3.2)),
  'Холодно':moFace('#9ccbe8', MO.eyes + MO.teeth + MO.worry, moSnow(26, 6.5, 4)),
  'Переохлаждение':moFace('#6fa6d6', MO.shut + MO.teeth, moSnow(25.5, 6.5, 4.4) + '<path d="M8 25l1.2 4 1.2-4M13 27l1 3 1-3M19 27l1 3 1-3M24 25l1.2 4 1.2-4" fill="#eaf6ff" stroke="#3a78b8" stroke-width=".7"/>'),
  'Промок':moFace('#f0d478', MO.eyes + MO.frown, moDrop(9, 5.5, .8, '#7cc8f4', '#2a6a9a') + moDrop(17, 3.5, .7, '#7cc8f4', '#2a6a9a') + moDrop(25, 6, .8, '#7cc8f4', '#2a6a9a')),
  // сон
  'Хочет спать':moFace('#f2d36c', MO.shut + MO.yawn, moZ(23, 3.5, 1)),
  'Валится с ног':moFace('#d8c58a', MO.shut + '<path d="M13.5 22.5q2.5 1.5 5 0" fill="none" stroke="#2a1d12" stroke-width="1.4" stroke-linecap="round"/><path d="M17.5 23q.6 2.6 1.6 3" stroke="#7cc8f4" stroke-width="1.4" stroke-linecap="round"/>', moZ(21, 6, .8) + moZ(25, 1.5, 1.1)),
  // боль и раны
  'Боль':moFace('#f2cf6a', MO.squint + MO.grim),
  'Сильная боль':moFace('#ec8a62', MO.squint + '<path d="M11 21.5q5-3 10 0v1.5q-5 3.5-10 0z" fill="#5a1f1a" stroke="#2a1d12" stroke-width="1.2" stroke-linejoin="round"/>' + MO.tears),
  'Кровотечение':moDrop(13, 9, 1.55, '#d3241e') + moDrop(23, 17, 1, '#d3241e') + '<ellipse cx="10.5" cy="12" rx="1.6" ry="2.4" fill="#ff8a7a" opacity=".7"/>',
  'Тяжёлые раны':'<path d="M16 27S4.5 20 4.5 11.8A6 6 0 0 1 16 8.6a6 6 0 0 1 11.5 3.2C27.5 20 16 27 16 27z" fill="#d83a32" stroke="#2a1d12" stroke-width="1.5" stroke-linejoin="round"/><path d="M16 8.8l-2.4 5 3.6 2.6-2.8 4.8 1.6 5.8" fill="none" stroke="#2a1d12" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="10" cy="11.5" rx="2.2" ry="1.4" fill="#fff" opacity=".4"/>',
  'Перелом ноги':moBone(0, moCrack),
  'Перелом руки':moBone(-55, moCrack),
  'Нога в шине':moBone(0, moSplint),
  'Рука в шине':moBone(-55, moSplint),
  'Воспаление':'<circle cx="16" cy="16" r="11" fill="#e8553f" opacity=".45"/><rect x="5" y="11" width="22" height="10" rx="3" transform="rotate(-30 16 16)" fill="#f0e2c4" stroke="#2a1d12" stroke-width="1.4"/><rect x="12" y="12.5" width="8" height="7" rx="1" transform="rotate(-30 16 16)" fill="#f4c6a8" stroke="#c0503a" stroke-width="1"/><circle cx="16" cy="16" r="2" fill="#d83a32"/>',
  'Грязная повязка':'<rect x="5" y="11" width="22" height="10" rx="3" transform="rotate(-30 16 16)" fill="#cdbb92" stroke="#2a1d12" stroke-width="1.4"/><circle cx="13" cy="15" r="2.2" fill="#7a5a32" opacity=".8"/><circle cx="19" cy="18" r="1.6" fill="#6a4a28" opacity=".8"/><circle cx="17" cy="13" r="1.1" fill="#7a5a32" opacity=".8"/><circle cx="25" cy="6" r="1.2" fill="#2a1d12"/><circle cx="7" cy="25" r="1" fill="#2a1d12"/><path d="M24 5l-1.5-1.2M26 5l1.5-1.2" stroke="#9ab" stroke-width=".8"/>',
  'Схвачен!':'<path d="M9 30V20q0-3 3-3h8q3 0 3 3v10" fill="#4a6aa0" stroke="#2a1d12" stroke-width="1.3"/><path d="M6 17q2-6 7-6l3 .5 1-4q.6-2 2.2-1.4.8.4.6 2l-.6 3.6 2.4-3.4q1.2-1.4 2.4-.4.8.8 0 2.2l-2.6 3.8 3-.6q1.6-.2 1.8 1 .2 1.2-1.4 1.8L20 17.8q-1.6 3-5 3.6L9 22z" fill="#8fb36a" stroke="#2a1d12" stroke-width="1.2" stroke-linejoin="round"/><path d="M11 15l1 2M14 14.5l.6 2" stroke="#4a6a32" stroke-width=".9"/>',
  // голод, жажда, ноша
  'Голод':'<path d="M19.5 5.5a7 7 0 0 1 6 9.5c-1.6 3.6-5.6 4.6-8.4 3.2L11 24.3a2.4 2.4 0 1 1-2.9 1.5 2.4 2.4 0 1 1-1.5-2.9l6.1-6.1c-1.4-2.8-.4-6.8 3.2-8.4a7 7 0 0 1 3.6-2.9z" fill="#c8823e" stroke="#2a1d12" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 24.8l2.4-2.4" stroke="#f4ecd8" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="20" cy="10" rx="3" ry="1.8" transform="rotate(-40 20 10)" fill="#f0c088" opacity=".8"/>',
  'Сильный голод':'<path d="M22 6.5a3 3 0 0 1 3.5 3.5 3 3 0 0 1-2.4 3.5L11.4 25.2a2.4 2.4 0 1 1-2.9 1.5 2.4 2.4 0 1 1-1.5-2.9L18.7 12.1A3 3 0 0 1 22 6.5z" fill="#f4ecd8" stroke="#2a1d12" stroke-width="1.4" stroke-linejoin="round"/><path d="M4 8q2 1 3 3M27 22q-1 2-3 3M6 4l1.4 2" stroke="#e05a3c" stroke-width="1.5" stroke-linecap="round"/>',
  'Жажда':moDrop(16, 11, 2.2, '#cfeaf8', '#1f4f7a') + '<path d="M8.6 19.5h14.8a7.4 7.4 0 0 1-14.8 0z" fill="#3a8ad0"/><ellipse cx="12.5" cy="15" rx="1.6" ry="2.6" fill="#fff" opacity=".5"/>',
  'Сильная жажда':moDrop(16, 11, 2.2, '#f2e2b8', '#7a4a2a') + '<path d="M16 9.5l-2 4 3 2.2-2.2 4 1.4 3" fill="none" stroke="#7a4a2a" stroke-width="1.4" stroke-linejoin="round"/><path d="M4.5 9q1.2-1.4 0-2.8M27.5 9q-1.2-1.4 0-2.8" fill="none" stroke="#e05a3c" stroke-width="1.4" stroke-linecap="round"/>',
  'Перегруз':'<path d="M9 12h14l3.5 15h-21z" fill="#5a5e66" stroke="#2a1d12" stroke-width="1.5" stroke-linejoin="round"/><path d="M12.5 12a3.5 3.5 0 0 1 7 0" fill="none" stroke="#2a1d12" stroke-width="2.4"/><text x="16" y="23.5" text-anchor="middle" font-family="Oswald,sans-serif" font-weight="700" font-size="7.5" fill="#e8e8e8">КГ</text>',
  'Сильный перегруз':'<path d="M9 12h14l3.5 15h-21z" fill="#a8392e" stroke="#2a1d12" stroke-width="1.5" stroke-linejoin="round"/><path d="M12.5 12a3.5 3.5 0 0 1 7 0" fill="none" stroke="#2a1d12" stroke-width="2.4"/><text x="16" y="23.5" text-anchor="middle" font-family="Oswald,sans-serif" font-weight="700" font-size="7.5" fill="#fff">КГ</text><path d="M3 30h26" stroke="#2a1d12" stroke-width="1.6"/><path d="M5 29l2-3M27 29l-2-3" stroke="#e05a3c" stroke-width="1.4" stroke-linecap="round"/>',
};
const moodSvg = t => `<svg viewBox="0 0 32 32" aria-hidden="true">${MOOD_ART[t] || `<circle cx="16" cy="16" r="12.5" fill="#f2d36c" stroke="${MO_LINE}" stroke-width="1.6"/><path d="M16 9v9" stroke="${MO_LINE}" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="23" r="1.8" fill="${MO_LINE}"/>`}</svg>`;
// один значок в HUD; «+N» — кружок с числом
moodChip = (t, c) => /^\+\d+$/.test(t) ? `<span class="mood mi more ${c}" data-t="Ещё ${t.slice(1)}">${t}</span>`
  : `<span class="mood mi ${c}" data-t="${t}" role="img" aria-label="${t}" title="${t}">${moodSvg(t)}</span>`;
MOOD_MAX = 8;
// тап по значку: название выезжает из него и через ~1,3 с заезжает обратно
{ const tip = mk('div'); tip.id = 'moodTip'; document.body.appendChild(tip); let tm = 0;
  const show = el => {
    const r = el.getBoundingClientRect(); tip.textContent = el.dataset.t; tip.className = el.classList.contains('crit') ? 'crit' : el.classList.contains('warn') ? 'warn' : '';
    tip.style.left = Math.round(r.right - 4) + 'px'; tip.style.top = Math.round(r.top + r.height / 2) + 'px'; tip.style.setProperty('--pad', '12px');   // выезжает из правого края значка
    void tip.offsetWidth; tip.classList.add('show'); if (SFX.ui) SFX.ui();
    clearTimeout(tm); tm = setTimeout(() => tip.classList.remove('show'), 1300);
  };
  $('moodles').addEventListener('pointerdown', e => { if (document.body.classList.contains('ctledit')) return; const el = e.target.closest && e.target.closest('.mood'); if (el && el.dataset.t) { e.preventDefault(); show(el); } });
}

// ================= гигиена, жара, ломота в мышцах =================
// Грязь (P.dirt 0..100): копится сама, от драк, работы и слякоти; грязным — тоскливо, открытые раны воспаляются быстрее.
//   Смывается: душ, дождь (до ~25), «Умыться» у раковины или ванны с водой, у пруда, сырой водой или водой из бутылки.
// Жара (P.heat 0..100): летом днём на солнце, в тёплом или у огня; жажда и усталость, на пределе — тепловой удар.
//   Проходит в тени и в доме, если раздеться, промокнуть или попить.
// Ломота (P.sore 0..100): частые удары забивают мышцы — удары медленнее; проходит от отдыха, сна и горячего душа.
const gmOf = dt => dt * settings.dayLen * (P.sleep ? 40 : 1);                // игровые минуты за кадр, как в updateCore
const feelsTemp = () => airTemp(P.x, P.y) + insulation() * 1.6 - (P.wet || 0) * .12;
function dirtK() { return (P.dirt || 0) / 100; }

// ---- грязь ----
{ let kills0 = -1;
  onUpdate(dt => {
    if (!P || mode !== 'play') return;
    const gm = gmOf(dt), out = !insideHouse(P.x, P.y) && !P.car, A = P.act && P.act.kind;
    let d = P.dirt || 0;
    d += gm * .0045;                                                          // ~6 за сутки: пот, пыль
    if (out && rain > .5 && P.moving) d += gm * .03;                          // слякоть
    if (A === 'forage' || A === 'dismantle' || A === 'bar' || A === 'pry' || (A === 'job' && P.act.an === 'searchlow')) d += gm * .04;
    if (kills0 >= 0 && kills > kills0) d += (kills - kills0) * 2.5;          // кровь мертвецов на руках и одежде
    kills0 = kills;
    if (out && rain > .5) d = Math.max(Math.min(d, 25), d - gm * .05);       // дождь смывает, но не дочиста
    if (P._inShower) d = Math.max(0, d - gm * 2);
    P.dirt = clamp(d, 0, 100);
    if (P.dirt > 60) {
      P.unh = Math.min(100, (P.unh || 0) + gm * .006 * dirtK());             // противно от себя
      for (const w of wounds()) if (WOUND[w.k].sep && !(w.cl > 0) && !(w.band && !dirtyBand(w))) w.sep = Math.min(100, w.sep + gm * .03 * dirtK());   // грязь в открытой ране
    }
  });
  onStartNew(() => { kills0 = -1; });
  onLoad(() => { kills0 = -1; });
}
// чем умыться рядом: раковина или ванна с водой, пруд, вода в рюкзаке (сначала сырая — пить её всё равно нельзя)
function washSource() {
  const tx = Math.floor(P.x), ty = Math.floor(P.y);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const i = (ty + dy) * MW + tx + dx;
    if (map[i] === WATER) return {k:'pond', label:'Умыться в пруду'};
    const f = furn[i] && furns[furn[i] - 1];
    if (f && !f.gone && (f.type === 'sink' || f.type === 'bsink' || f.type === 'bath') && waterOn()) return {k:'tap', label:'Умыться'};
  }
  const it = P.inv.find(i => i.id === 'waterD') || P.inv.find(i => i.id === 'water');
  if (it && (P.dirt || 0) > 50) return {k:'bottle', it, label:it.id === 'waterD' ? 'Умыться сырой водой' : 'Умыться водой из бутылки'};
  return null;
}
addActions(out => { if ((P.dirt || 0) < 15 || P.car) return; const s = washSource(); if (s) out.push({kind:'washup', label:s.label, s}); });
defAction('washup', {name:() => 'Грязь: ' + Math.round(P.dirt || 0) + '%', icon:() => 'i-drop', run:a0 => {
  if (mode !== 'play' || paused || panel || P.sleep) return; $('actMenu').hidden = true;
  const s = washSource(); if (!s) return;
  SFX.drink && SFX.drink();
  job(s.k === 'bottle' ? 3 : 5, () => {
    if (s.k === 'bottle') { const it = P.inv.includes(s.it) ? s.it : P.inv.find(i => i.id === s.it.id); if (!it) return; it.id = 'bottle'; P.dirt = Math.max(0, (P.dirt || 0) - 40); }
    else P.dirt = Math.max(0, (P.dirt || 0) - (s.k === 'pond' ? 55 : 70));
    P.unh = Math.max(0, (P.unh || 0) - 4); P.heat = Math.max(0, (P.heat || 0) - 20);
    toast(P.dirt < 20 ? 'Умылся. Совсем другое дело' : 'Умылся, но до чистоты далеко'); renderInv();
  }, {an:'searchlow'});
}});

// ---- жара ----
{ let hyd0 = null;
  onUpdate(dt => {
    if (!P || mode !== 'play') return;
    const gm = gmOf(dt), inside = insideHouse(P.x, P.y) || !!P.car, feels = feelsTemp();
    let h = P.heat || 0;
    let fire = false; for (const f of fires) if (!f.out && f.t > 0 && Math.hypot(f.x - P.x, f.y - P.y) < 3) fire = true;
    if (feels > 28 && (!inside || fire) && !P.sleep && !(P.cold > 10)) h += gm * (feels - 28) * (P.running ? .06 : P.moving ? .035 : .02);   // дом — тень: греет только солнце и огонь
    else h -= gm * (inside ? .12 : .06) * (1 + (P.wet || 0) / 60);
    if (hyd0 != null && P.hyd > hyd0 + 4) h -= 15;                            // попил — полегчало
    hyd0 = P.hyd;
    P.heat = clamp(h, 0, 100);
    if (P.heat > 40) P.hyd = Math.max(0, P.hyd - gm * .02 * P.heat / 100);   // потеешь
    if (P.heat > 75) { P.en = Math.max(0, P.en - gm * .03); P.hp -= gm * .025; lastCause = 'Тепловой удар'; }
  });
  onStartNew(() => { hyd0 = null; });
}

// ---- ломота в мышцах ----
{ let sw0 = 0;
  onUpdate(dt => {
    if (!P || mode !== 'play') return;
    const gm = gmOf(dt);
    if ((P.swing || 0) > sw0 + .01) {                                         // только что ударил
      const w = P.weapon && ITEMS[P.weapon.id], two = P.weapon && TWO_H.has(P.weapon.id);
      if (!(w && w.gun)) {
        P.sore = Math.min(100, (P.sore || 0) + (two ? 3.4 : 2.2) * (1 - .06 * fitLv()));
        if (P.sore > 40) P.cd *= P.sore > 75 ? 1.35 : 1.15;                   // забитые руки — удар медленнее
      }
    }
    sw0 = P.swing || 0;
    const rest = P.sleep ? .5 : P._inShower ? 2 : P.moving || P.act ? .12 : .4;     // за игровую минуту: в покое отходит за пару часов
    P.sore = Math.max(0, (P.sore || 0) - gm * rest);
  });
}

// ---- значки и советы ----
addMoodles(m => {
  if (P.dirt > 85) m.push(['Весь в грязи', 'warn']); else if (P.dirt > 60) m.push(['Грязный', '']);
  if (P.heat > 75) m.push(['Перегрев', 'crit']); else if (P.heat > 40) m.push(['Жарко', 'warn']);
  if (P.sore > 75) m.push(['Руки не слушаются', 'crit']); else if (P.sore > 40) m.push(['Ломит мышцы', 'warn']);
}, m => {
  if (P.dirt > 60) m.push('Грязь: умойся у раковины или пруда, сойдёт и сырая вода. Открытые раны в грязи воспаляются');
  if (P.heat > 40) m.push('Жара: уйди в тень или в дом, сними тёплое, попей');
  if (P.sore > 40) m.push('Ломота: передохни — удары медленнее, пока мышцы не отойдут');
});
onSave(d => { d.x78 = {dirt:Math.round(P.dirt || 0), heat:Math.round(P.heat || 0), sore:Math.round(P.sore || 0)}; });
onLoad(d => { const x = (d && d.x78) || {}; P.dirt = x.dirt || 0; P.heat = x.heat || 0; P.sore = x.sore || 0; });
onStartNew(() => { if (P) { P.dirt = 0; P.heat = 0; P.sore = 0; } });

// ---- нарисованные значки новых состояний ----
Object.assign(MOOD_ART, {
  'Грязный':moFace('#d9bf72', MO.eyes + MO.side, '<circle cx="10" cy="20" r="2.4" fill="#7a5a32" opacity=".75"/><circle cx="21.5" cy="10" r="1.8" fill="#7a5a32" opacity=".7"/><circle cx="23" cy="21" r="1.3" fill="#7a5a32" opacity=".7"/>'),
  'Весь в грязи':moFace('#b89a5a', MO.lids + MO.frown, '<path d="M5 13q3-2 5 1t4 3M19 8q3 0 5 3M20 24q3-1 6 1" fill="none" stroke="#6a4a28" stroke-width="2.6" stroke-linecap="round" opacity=".85"/><circle cx="25" cy="4.5" r="1.2" fill="#2a1d12"/><circle cx="29" cy="8" r="1" fill="#2a1d12"/><path d="M24 3.5l-1.3-1.1M26 3.5l1.3-1.1M28 7l-1.2-1M30 7l1.2-1" stroke="#9ab" stroke-width=".7"/>'),
  'Жарко':moFace('#f6c25a', MO.shut + '<path d="M12 22.5q4 2.4 8 0" fill="none" stroke="#2a1d12" stroke-width="1.5" stroke-linecap="round"/>', MO.sweat + '<path d="M5 25q1.5-1.5 0-3t0-3M9 28q1.5-1.5 0-3" fill="none" stroke="#f08a3a" stroke-width="1.3" stroke-linecap="round"/>'),
  'Перегрев':moFace('#ef6a4a', MO.dizzy + '<path d="M12.5 21.5q3.5 3.5 7 0z" fill="#e46a7a" stroke="#2a1d12" stroke-width="1.2"/>', '<circle cx="25.5" cy="6" r="3.2" fill="#ffd23a" stroke="#c8781a" stroke-width="1"/><path d="M25.5 .8v1.6M25.5 9.6v1.6M20.3 6h1.6M29.1 6h1.6M21.9 2.4l1.1 1.1M28 8.5l1.1 1.1M21.9 9.6 23 8.5M28 3.5l1.1-1.1" stroke="#e8a02a" stroke-width="1.1" stroke-linecap="round"/>' + MO.sweat),
  'Ломит мышцы':'<path d="M6 27q-2-8 3-12l4-3q2-5 6-5 3 0 3 3l-3 2q3 1 4 4 4 1 5 5-1 6-9 7z" fill="#e8b48a" stroke="#2a1d12" stroke-width="1.4" stroke-linejoin="round"/><path d="M13 16q3 2 7 1" fill="none" stroke="#b07a52" stroke-width="1.2" stroke-linecap="round"/><path d="M2.5 9l3 1.5-2 1.5 3 1.5M27 4l-1.5 3 2 .5-1.5 3" fill="none" stroke="#e05a3c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  'Руки не слушаются':'<path d="M6 27q-2-8 3-12l4-3q2-5 6-5 3 0 3 3l-3 2q3 1 4 4 4 1 5 5-1 6-9 7z" fill="#e88a6a" stroke="#2a1d12" stroke-width="1.4" stroke-linejoin="round"/><path d="M11 14l2 2-1.5 1.5 2.5 2M18 18l1.5 1.5-1 1.5 2 1.5" fill="none" stroke="#c0281e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.5 9l3 1.5-2 1.5 3 1.5M27 4l-1.5 3 2 .5-1.5 3M29 14l-3 1" fill="none" stroke="#e05a3c" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
});
