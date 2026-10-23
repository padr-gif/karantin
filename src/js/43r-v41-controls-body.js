// ================= v41: удары руками по очереди, удар в движении без скольжения, присед на месте,
// одежда не в облипку, свои места для кнопок, анатомическая фигура в «Состоянии» =================

// ---- одежда не в облипку: под одеждой — кадры с чуть «раздутым» телом ----
heroVar = function (lk) {
  if (!lk || lk.g !== 'm' || !P || !P.cloth || P._inShower) return '';
  const c = P.cloth, top = c.shirt || c.torso, legs = c.legs && ITEMS[c.legs.id].cov === 'pants';
  const v = top ? (legs ? 'f' : 't') : '';
  return v && ART.meta.frames['pm' + v + '_idle_0_0'] ? v : '';
};

// ---- удары: кулаки по очереди (правой — левой), в движении ноги продолжают идти ----
{ const at = attack;
  attack = function () { const t0 = P.atkT; at(); if (P.atkT === 0 && t0 !== 0) P._altHand = !P._altHand; };
  const pa = playerAnim;
  playerAnim = function (pAtk) {
    if (heroMale() && !(mode === 'dead')) {
      const gun = P.weapon && ITEMS[P.weapon.id].gun;
      if (pAtk >= 0 && !gun) {
        const alt = !P.weapon && P._altHand;
        const an = P.moving ? (P.weapon ? 'attackrun' : alt ? 'punchrun2' : 'punchrun') : (P.weapon ? 'attack' : alt ? 'punch2' : 'punch');
        const n = AN('p', an); if (n > 1) return [an, Math.min(n - 1, Math.floor(pAtk * n))];
      }
      if (P.sneak && !P.moving && !P.act && AN('p', 'sneakidle') > 1) return pmLoop('sneakidle');
    }
    return pa(pAtk);
  };
}

// ---- настройки: «Готово» всегда под рукой — список прокручивается внутри карточки ----
// (стили — в styles.css: #settings .setlist)

// ---- свои места для кнопок управления ----
const CTL_IDS = ['bAct', 'bAtk', 'bSneak', 'bRun', 'bInv', 'dock', 'mini'];
const CTL_NAME = {bAct:'Действие', bAtk:'Удар', bSneak:'Красться', bRun:'Бег', bInv:'Рюкзак', dock:'Нижняя панель', mini:'Мини-карта'};
function ctlApply() {
  const B = settings.btn || {};
  for (const id of CTL_IDS) {
    const el = $(id); if (!el) continue; const b = B[id];
    el.style.translate = b ? b.x + 'px ' + b.y + 'px' : ''; el.style.scale = b && b.s && b.s !== 1 ? String(b.s) : '';
  }
}
let CTLE = null;
function ctlEditOpen() {
  const back = !$('settings').hidden ? 'settings' : null;
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  const ctrlWasHidden = $('ctrl').hidden; $('ctrl').hidden = false;
  const ov = document.createElement('div'); ov.id = 'ctlEdit';
  ov.innerHTML = '<div class="ceBar"><b>Перетащи кнопку пальцем</b><span id="ceSel">Выбери кнопку</span>' +
    '<button type="button" id="ceMinus" aria-label="Меньше">−</button><button type="button" id="cePlus" aria-label="Больше">+</button>' +
    '<button type="button" id="ceReset">Сбросить</button><button type="button" class="go" id="ceDone">Готово</button></div>';
  document.body.appendChild(ov); document.body.classList.add('ctledit');
  settings.btn = settings.btn || {};
  CTLE = {sel:null, drag:null, back, ctrlWasHidden};
  const sel = id => { CTLE.sel = id; for (const k of CTL_IDS) { const e = $(k); if (e) e.classList.toggle('ceSel', k === id); } $('ceSel').textContent = id ? CTL_NAME[id] : 'Выбери кнопку'; };
  const size = d => { const id = CTLE.sel; if (!id) return; const b = settings.btn[id] = settings.btn[id] || {x:0, y:0, s:1}; b.s = Math.max(.6, Math.min(1.8, Math.round(((b.s || 1) + d) * 10) / 10)); ctlApply(); };
  $('ceMinus').onclick = () => size(-.1); $('cePlus').onclick = () => size(.1);
  $('ceReset').onclick = () => { settings.btn = {}; ctlApply(); sel(null); };
  $('ceDone').onclick = () => {
    saveSettings(); for (const k of CTL_IDS) { const e = $(k); if (e) e.classList.remove('ceSel'); }
    ov.remove(); document.body.classList.remove('ctledit'); $('ctrl').hidden = CTLE.ctrlWasHidden;
    const b = CTLE.back; CTLE = null; if (b) openSettings(settingsFrom || 'menu');
  };
  CTLE.down = e => {
    if (!CTLE) return;
    const el = e.target.closest && CTL_IDS.map(id => $(id)).find(x => x && x.contains(e.target));
    if (!el) return;
    e.preventDefault(); e.stopPropagation();
    sel(el.id); const b = settings.btn[el.id] = settings.btn[el.id] || {x:0, y:0, s:1};
    CTLE.drag = {id:el.id, sx:e.clientX, sy:e.clientY, bx:b.x, by:b.y, pid:e.pointerId};
  };
  CTLE.move = e => { const d = CTLE && CTLE.drag; if (!d || e.pointerId !== d.pid) return; e.preventDefault(); const b = settings.btn[d.id]; b.x = Math.round(d.bx + e.clientX - d.sx); b.y = Math.round(d.by + e.clientY - d.sy); ctlApply(); };
  CTLE.up = e => { if (CTLE && CTLE.drag && e.pointerId === CTLE.drag.pid) CTLE.drag = null; };
}
// перехватываем касания раньше игры, пока идёт настройка
addEventListener('pointerdown', e => { if (CTLE) CTLE.down(e); }, true);
addEventListener('pointermove', e => { if (CTLE) CTLE.move(e); }, true);
addEventListener('pointerup', e => { if (CTLE) CTLE.up(e); }, true);
addEventListener('click', e => { if (CTLE && CTL_IDS.some(id => $(id) && $(id).contains(e.target))) { e.preventDefault(); e.stopPropagation(); } }, true);
let settingsFrom = 'menu';
{ const os = openSettings;
  openSettings = function (from) {
    settingsFrom = from || settingsFrom; os(from);
    const list = document.querySelector('#settings .setlist'); if (!list || $('sCtl')) return;
    const row = document.createElement('div'); row.className = 'set';
    row.innerHTML = '<div><b>Кнопки управления</b><small>Передвинь и измени размер кнопок под свои пальцы</small></div><div class="seg" id="sCtl"><button type="button" id="sCtlGo">Настроить</button><button type="button" id="sCtlReset">Сбросить</button></div>';
    list.appendChild(row);
    $('sCtlGo').onclick = () => { SFX.ui(); ctlEditOpen(); };
    $('sCtlReset').onclick = () => { SFX.ui(); settings.btn = {}; saveSettings(); ctlApply(); toast('Кнопки на своих местах'); };
  };
}
{ const as = applySettings; applySettings = function () { as(); ctlApply(); }; }
ctlApply();

// ---- «Состояние»: анатомическая фигура — мышцы и вены ----
Object.assign(REGP, {
  head:'<path d="M70 6 C80 6 84 13 84 21 C84 29 80 36 70 37 C60 36 56 29 56 21 C56 13 60 6 70 6 Z"/><ellipse cx="55.6" cy="22" rx="2" ry="3.6"/><ellipse cx="84.4" cy="22" rx="2" ry="3.6"/>',
  neck:'<path d="M63 33 L77 33 L79 46 L61 46 Z"/>',
  chest:'<path d="M61 45 Q70 48 79 45 L93 48 Q99 51 99 60 L97 78 Q70 84 43 78 L41 60 Q41 51 47 48 Z"/>',
  belly:'<path d="M43 78 Q70 84 97 78 L94 104 Q70 110 46 104 Z"/>',
  armR:'<path d="M47 48 Q38 49 35 59 L32 84 Q29 100 27 113 L33 116 L37 115 Q40 100 42 88 L45 68 Z"/>',
  armL:'<path d="M93 48 Q102 49 105 59 L108 84 Q111 100 113 113 L107 116 L103 115 Q100 100 98 88 L95 68 Z"/>',
  handR:'<path d="M26 114 Q22 122 24 129 Q27 134 32 133 Q36 128 37 116 Z"/>',
  handL:'<path d="M114 114 Q118 122 116 129 Q113 134 108 133 Q104 128 103 116 Z"/>',
  legR:'<path d="M46 104 Q57 110 69 108 L67 150 Q66 160 65 172 L64 192 Q58 198 49 196 L52 190 Q51 172 50 160 Q47 148 47 132 Z"/>',
  legL:'<path d="M94 104 Q83 110 71 108 L73 150 Q74 160 75 172 L76 192 Q82 198 91 196 L88 190 Q89 172 90 160 Q93 148 93 132 Z"/>',
});
const ANAT_MUSCLE = 'M50 66 Q60 73 69 68 M90 66 Q80 73 71 68 M70 50 L70 80 M70 84 L70 105 M58 88 Q70 90 82 88 M58 96 Q70 98 82 96 ' +
  'M47 50 Q41 55 41 64 M93 50 Q99 55 99 64 M38 64 Q42 72 40 82 M102 64 Q98 72 100 82 M34 88 Q33 98 30 108 M106 88 Q107 98 110 108 ' +
  'M54 116 Q58 132 60 146 M86 116 Q82 132 80 146 M55 150 Q60 155 65 150 M85 150 Q80 155 75 150 M52 164 Q56 176 55 186 M88 164 Q84 176 85 186 ' +
  'M64 39 Q60 44 52 48 M76 39 Q80 44 88 48';
const ANAT_VEIN = {
  neck:'M66 36 Q65 41 66 46 M74 36 Q75 41 74 46',
  armR:'M40 58 Q38 70 37 84 Q34 96 31 110 M37 86 Q36 98 34 112', armL:'M100 58 Q102 70 103 84 Q106 96 109 110 M103 86 Q104 98 106 112',
  handR:'M29 118 Q30 124 28 129', handL:'M111 118 Q110 124 112 129',
  legR:'M61 112 Q58 138 59 160 Q58 178 57 192 M52 150 Q53 170 55 189', legL:'M79 112 Q82 138 81 160 Q82 178 83 192 M88 150 Q87 170 85 189',
  chest:'M58 52 Q62 58 60 64 M82 52 Q78 58 80 64', belly:'M54 100 Q58 104 62 106 M86 100 Q82 104 78 106',
};
{ const bs = bodySvg;
  bodySvg = function (sel) {
    let s = bs(sel);
    const lk = P.look || look, skin = rgbS(LOOK.skin[lk.skin]);
    // вены — только там, где кожа не закрыта одеждой
    const open = {}; for (const m of s.matchAll(/data-r="(\w+)" fill="([^"]*)"/g)) open[m[1]] = m[2] === skin;
    let ov = '<g class="anat" pointer-events="none"><path d="' + ANAT_MUSCLE + '" fill="none" stroke="rgba(40,22,16,.28)" stroke-width=".7" stroke-linecap="round"/>';
    let vd = ''; for (const r in ANAT_VEIN) if (open[r]) vd += ANAT_VEIN[r] + ' ';
    if (vd) ov += '<path d="' + vd + '" fill="none" stroke="#5b7fc4" stroke-opacity=".55" stroke-width=".8" stroke-linecap="round"/>';
    ov += '</g>';
    const k = s.indexOf('<g pointer-events="none">');
    return k > 0 ? s.slice(0, k) + ov + s.slice(k) : s;
  };
}
