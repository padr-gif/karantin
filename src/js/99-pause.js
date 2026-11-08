// ================= пауза: карточка героя слева, кнопки справа =================
// Слева — фигурка героя (та же, что во вкладке «Тело»), имя, профессия, четыре шкалы и мысль дня из дневника.
// Справа — большая «Продолжить» и плитки с иконками. Время — только если есть часы (34-watches-windows),
// иначе часть суток. Кнопки — те же элементы (#pResume, #pSave…), поэтому их обработчики не меняются.
{
  const card = document.querySelector('#pause .card');
  if (card && $('pResume')) {
    const I = (d, extra) => `<svg class="pz-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"${extra || ''}>${d}</svg>`;
    const ICON = {
      pResume:I('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>'),
      pSave:I('<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>'),
      pLoad:I('<path d="M3.5 7.5h6l2 2h9v9.5h-17z"/><path d="M12 17v-5m-2.5 2.5L12 12l2.5 2.5"/>'),
      pAch:I('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>'),
      pSettings:I('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>'),
      pMenu:I('<path d="M14 4h5v16h-5"/><path d="M10 8l-4 4 4 4M6 12h9"/>'),
      pDrop:I('<path d="M12 3v4M7 7h10l-1.5 4h-7z"/><rect x="6" y="13" width="12" height="7" rx="1"/>'),
    };
    const NAME = {pResume:'Продолжить', pSave:'Сохранить', pLoad:'Загрузить', pAch:'Достижения', pSettings:'Настройки', pMenu:'В главное меню'};
    for (const id in ICON) { const b = $(id); if (!b) continue; b.classList.add('pz-b'); if (NAME[id]) b.textContent = ''; b.insertAdjacentHTML('afterbegin', ICON[id]); if (NAME[id]) b.appendChild(mk('span', '', NAME[id])); }
    $('pResume').classList.add('pz-go');
    $('pMenu').classList.add('pz-exit');

    const hero = mk('aside', 'pz-hero');
    hero.innerHTML = '<div class="pz-fig"></div><div class="pz-who"><b class="pz-name"></b><span class="pz-prof"></span></div><div class="pz-bars"></div><p class="pz-quote"></p>';
    const main = mk('div', 'pz-main');
    const head = mk('div', 'pz-head'); head.appendChild(card.querySelector('.stamp')); head.appendChild(mk('span', 'pz-when'));
    main.appendChild(head);
    const grid = mk('div', 'pz-grid');
    for (const id of ['pDrop', 'pSave', 'pLoad', 'pAch', 'pSettings']) if ($(id)) grid.appendChild($(id));
    main.appendChild($('pResume')); main.appendChild(grid); main.appendChild(mk('div', 'pz-meta')); main.appendChild($('pMenu'));
    const old = card.querySelector('.mlist'); if (old) old.remove();
    $('pInfo').hidden = true; main.appendChild($('pInfo'));
    card.textContent = ''; card.classList.add('pz'); card.appendChild(hero); card.appendChild(main);

    const bar = (cls, ic, v, name) => `<div class="pz-bar ${cls}" title="${name}"><svg class="ic"><use href="#${ic}"/></svg><i><s style="width:${Math.max(0, Math.min(100, Math.round(v)))}%"></s></i></div>`;
    const f0 = openPause;
    openPause = function () {
      const r = f0.apply(this, arguments);
      if ($('pause').hidden || !P) return r;
      { const d = $('pDrop'); if (d && !d.querySelector('.pz-i')) d.insertAdjacentHTML('afterbegin', ICON.pDrop); }   // 95-platform меняет текст кнопки
      const q = s => card.querySelector(s);
      try { q('.pz-fig').innerHTML = bodySvg(null); } catch (e) { q('.pz-fig').textContent = ''; }
      q('.pz-name').textContent = (P.look && P.look.name) || 'Выживший';
      q('.pz-prof').textContent = (PROFS[P.prof] || PROFS.none).name;
      q('.pz-bars').innerHTML = bar('hp', 'i-heart', P.hp, 'Здоровье') + bar('sat', 'i-food', P.sat, 'Сытость') + bar('hyd', 'i-drop', P.hyd, 'Вода') + bar('en', 'i-bolt', P.en, 'Бодрость');
      let th = ''; try { th = tasksToday().head || ''; } catch (e) {}
      q('.pz-quote').textContent = th ? '«' + th.replace(/\.$/, '') + '»' : '';
      q('.pz-when').textContent = hasClock() ? clockLine() : partOfDay();
      const W = typeof wounds === 'function' ? wounds().length : 0;
      q('.pz-meta').innerHTML = `<span><b>${kills}</b> убито</span><span><b>${W || '—'}</b> ${W ? (W === 1 ? 'рана' : W < 5 ? 'раны' : 'ран') : 'без ран'}</span><span>${(DIFF[world.diff] || DIFF.normal).name}</span>`;
      return r;
    };
  }
}
