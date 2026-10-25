// ================= админ-меню =================
// Включается в настройках («Админ-меню»). Открывается кнопкой с ключом на панели внизу или клавишей ` (Ё).
// Герой: бессмертие, вылечить и накормить. Вещи: поиск и выдача любой вещи, готовые наборы.
// Мир: убрать или призвать мертвецов, время суток, дождь, открыть всю карту, телепорт тапом по карте.

let adminTp = false;                                                         // следующий тап по карте — телепорт
SETTINGS_DEF.admin = false; if (settings.admin == null) settings.admin = false;
function adminApply() { const b = $('bAdmin'); if (b) b.hidden = !settings.admin; }
function openAdmin() { if (!settings.admin || mode !== 'play' || P.sleep) return; if (panel && panel.kind === 'admin') { closePanel(); return; } if (panel) closePanel(); openPanel('admin'); }

function adminGive(id, n) {
  for (let k = 0; k < (n || 1); k++) { const it = mkItem(id); if (invFull()) addToPile(P.x, P.y, it); else P.inv.push(it); }
  if (typeof updateHud === 'function') updateHud();
}
const ADMIN_KITS = [
  ['Оружие', ['bat', 'crowbar', 'pistol', 'ammo', 'ammo', 'shotgun', 'shells', 'shells']],
  ['Еда и вода', ['water', 'water', 'water', 'canned', 'canned', 'stew', 'choco', 'mre']],
  ['Аптечка', ['bandage', 'bandage', 'antisep', 'antibio', 'painkill', 'medkit', 'splint']],
  ['Стройка', ['hammer', 'nails', 'nails', 'plank', 'plank', 'plank', 'plank', 'wrench', 'scrap']],
];
function adminZombies(n, r) {
  for (let k = 0, t = 0; k < n && t < n * 20; t++) {
    const a = rng() * 6.283, d = 6 + rng() * (r || 6), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
    if (navBlocked(Math.floor(x), Math.floor(y))) continue;
    zType(mkZombie(x, y, zPal(), ri(48, 72), (.82 + rng() * .38) * DIFF[world.diff].spd)); k++;
  }
}
function adminTeleport(x, y) {
  const tx = clamp(Math.floor(x), 1, MW - 2), ty = clamp(Math.floor(y), 1, MH - 2);
  for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const cx = tx + dx + .5, cy = ty + dy + .5;
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || cx < 1 || cy < 1 || cx > MW - 1 || cy > MH - 1 || blocked(cx, cy, P.r + .05)) continue;
    if (P.car) { toast('Сначала выйди из машины'); return; }
    P.x = cx; P.y = cy; P.act = null; camX = P.x; camY = P.y; computeVis(); buildFlow(); fogDirty = true;
    toast('Телепорт'); return;
  }
  toast('Туда не встать');
}
function adminHour(h) {                                                      // перевести часы на ближайшее h:00 впереди
  const day = Math.floor(gameMin / 1440) * 1440; let t = day + h * 60; if (t <= gameMin) t += 1440; gameMin = t;
}

onPanel(() => {
  if (!panel || panel.kind !== 'admin') return;
  const body = $('pnBody'), tabs = $('pnTabs');
  $('pnTitle').textContent = 'Админ-меню'; $('pnSub').textContent = 'район ' + (world.dx || 0) + ',' + (world.dy || 0) + ' · ' + MW + '×' + MH + ' · ты на ' + Math.floor(P.x) + ', ' + Math.floor(P.y) + ' · мертвецов ' + zs.length;
  const tab = panel.tab || 'hero';
  for (const [k, label] of [['hero', 'Герой'], ['items', 'Вещи'], ['world', 'Мир']]) tabs.appendChild(btn(label, () => { panel.tab = k; renderPanel(); }, tab === k ? 'on' : ''));
  const sec = t => body.appendChild(mk('div', 'sect', t));
  const row = (list) => { const r = mk('div', 'seg'); r.style.margin = '6px 0 10px'; for (const [t, f, on] of list) r.appendChild(btn(t, () => { f(); renderPanel(); }, on ? 'on' : '')); body.appendChild(r); };
  if (tab === 'hero') {
    sec('Герой');
    row([['Бессмертие: ' + (godMode ? 'вкл' : 'выкл'), () => { godMode = !godMode; }, godMode],
         ['Вылечить всё', () => { P.hp = 100; P.bleed = false; P.inf = false; P.infT = 0; P.pois = 0; P.wounds = []; toast('Здоров как новенький'); }],
         ['Сыт, напоен, бодр', () => { P.sat = 100; P.hyd = 100; P.en = 100; }]]);
  } else if (tab === 'items') {
    sec('Наборы');
    row(ADMIN_KITS.filter(([, L]) => L.some(id => ITEMS[id])).map(([t, L]) => [t, () => { for (const id of L) if (ITEMS[id]) adminGive(id); toast('Выдан набор: ' + t.toLowerCase()); }]));
    sec('Любая вещь');
    const inp = mk('input'); inp.type = 'search'; inp.placeholder = 'Найти: бинт, топор, вода…'; inp.value = panel.q || '';
    Object.assign(inp.style, {width:'100%', boxSizing:'border-box', padding:'8px 10px', margin:'6px 0', font:'inherit', color:'inherit', background:'rgba(0,0,0,.25)', border:'1px solid var(--line)', borderRadius:'3px'});
    const list = mk('div', 'seg');
    const fill = () => {
      list.textContent = ''; const q = inp.value.trim().toLowerCase(); panel.q = inp.value;
      const ids = Object.keys(ITEMS).filter(id => !q || (ITEMS[id].name || '').toLowerCase().includes(q) || id.includes(q)).sort((a, b) => (ITEMS[a].name || a).localeCompare(ITEMS[b].name || b, 'ru'));
      for (const id of ids.slice(0, 60)) list.appendChild(btn(ITEMS[id].name || id, () => { adminGive(id); toast('Выдано: ' + (ITEMS[id].name || id)); }));
      if (ids.length > 60) list.appendChild(mk('span', 'empty', 'и ещё ' + (ids.length - 60) + ' — уточни поиск'));
      if (!ids.length) list.appendChild(mk('span', 'empty', 'Ничего не нашлось'));
    };
    inp.addEventListener('input', fill); inp.addEventListener('keydown', e => e.stopPropagation());
    body.appendChild(inp); body.appendChild(list); fill();
  } else {
    sec('Мертвецы');
    row([['Убрать рядом', () => { const n = zs.length; zs = zs.filter(z => Math.hypot(z.x - P.x, z.y - P.y) > 25); toast('Убрано: ' + (n - zs.length)); }],
         ['Убрать всех', () => { const n = zs.length; zs = []; toast('Убрано: ' + n); }],
         ['+1 рядом', () => adminZombies(1, 2)], ['+10 рядом', () => adminZombies(10, 8)], ['Орда (+40)', () => adminZombies(40, 14)]]);
    sec('Время');
    row([['+1 час', () => { gameMin += 60; }], ['Утро 8:00', () => adminHour(8)], ['День 13:00', () => adminHour(13)], ['Вечер 19:00', () => adminHour(19)], ['Ночь 23:00', () => adminHour(23)], ['+1 день', () => { gameMin += 1440; }]]);
    sec('Погода');
    row([['Дождь', () => { rain = rainTarget = 1; }, rain > .5], ['Ясно', () => { rain = rainTarget = 0; }, rain <= .5]]);
    sec('Карта');
    row([['Открыть всю карту', () => { P.mapRead = true; for (let i = 0; i < NT; i++) seen[i] = 1; fogFull = true; fogDirty = true; toast('Район открыт'); }],
         ['Телепорт по карте', () => { adminTp = true; closePanel(); openMap(); toast('Тапни по карте — куда перенести'); }]]);
  }
});

addEventListener('keydown', e => {
  if (e.key !== '`' && e.key !== 'ё' && e.key !== 'Ё' && e.key !== '~') return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  openAdmin(); e.preventDefault();
});
{ const b = $('bAdmin'); if (b) b.addEventListener('click', openAdmin); }
adminApply();
