// ================= v12: interface 3.0 — icon HUD, ring gauges, context pill, weapon slot, two-pane panels =================
const svgIc = (id, cls) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'ic' + (cls ? ' ' + cls : '')); const u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#' + id); s.appendChild(u); return s; };
const PROPN = {tree:'Дерево', car:'Машина', barrel:'Бочка', crate:'Ящик', trap:'Капкан', pump:'Колонка', gen:'Генератор', bush:'Куст', fire:'Костёр', pile:'Вещи на земле', gbed:'Грядка', pond:'Пруд', drop:'Груз'};
function actIcon(a) {
  const d = a && ACT[a.kind]; if (d && d.icon) return d.icon(a);
  const l = (a.label || '').toLowerCase();
  if (/кузов|ремонт/.test(l)) return 'i-tool';
  if (/разобрать|лист/.test(l)) return 'i-hammer';
  if (/приманк/.test(l)) return 'i-bottle';
  if (/таблич|подписать/.test(l)) return 'i-hand';
  if (/штор/.test(l)) return 'i-curtain';
  if (/перелез/.test(l)) return 'i-run';
  if (/окно/.test(l)) return 'i-window';
  if (a.kind === 'exit' || /руль|багаж|машин|бензин|канистр/.test(l)) return 'i-car';
  if (/обыск|осмотр|урожай/.test(l)) return 'i-search';
  if (/откр|закр|взлом|отпер|дверь/.test(l)) return 'i-door';
  if (/спать|прилечь|лечь/.test(l)) return 'i-bed';
  if (/готов|костёр|разж|подкин|огонь/.test(l)) return 'i-fire';
  if (/пить|попить|налить|набрать|рыбач|полить|снег/.test(l)) return 'i-drop';
  if (/доск|заколот|оторв/.test(l)) return 'i-hammer';
  return 'i-hand';
}
function actName(a) {
  const d = a && ACT[a.kind]; if (d && d.name) return d.name(a);
  if (a && isShower(a.f)) return 'Душ';
  if (a.o) return obs[a.o.i].t === 'door' ? 'Дверь' : 'Окно';
  const t = a.f && a.f.type;
  if (!t) return '';
  return (CONT[t] && CONT[t].name) || PROPN[t] || '';
}
const setUse = (el, id) => { const u = el.querySelector('use'); if (u && u.getAttribute('href') !== '#' + id) u.setAttribute('href', '#' + id); };
const GAUGE_C = 106.8;
let hud3Key = '';
function updateHud3() {
  // weather icon
  const L = lightLevel(), wi = snowing() ? 'i-snow' : rain > .5 ? 'i-rain' : L < .35 ? 'i-moon' : 'i-sun';
  const w = $('wxIc'); setUse(w, wi); w.setAttribute('class', 'ic wx ' + ({'i-snow':'snow', 'i-rain':'rain', 'i-moon':'night'}[wi] || ''));
  $('temp').textContent = Math.round(outsideTemp()) + '°';
  // backpack fill
  const cp = $('invCap'), cf = invFull(); cp.textContent = fmtKg(invKg()) + '/' + fmtKg(invCapKg()); cp.classList.toggle('full', cf || invKg() > invCapKg());
  // weapon slot
  const ws = $('weapon'), key = P.car ? 'car' + Math.round(P.car.fuel) : P.weapon ? P.weapon.id + '|' + P.weapon.dur + '|' + (P.weapon.mag || 0) : 'fist';
  if (key !== hud3Key) {
    hud3Key = key; const ico = $('wico'); ico.textContent = '';
    ws.classList.toggle('car', !!P.car);
    let frac = null;
    if (P.car) { ico.appendChild(svgIc('i-car')); $('wname').textContent = 'Бак ' + Math.round(P.car.fuel) + '%'; frac = P.car.fuel / 100; }
    else if (P.weapon) { ico.appendChild(iconEl(P.weapon.id, 26)); const d = ITEMS[P.weapon.id]; $('wname').textContent = (d.sh || d.name) + (d.gun ? ' ' + (P.weapon.mag || 0) + '/' + d.mag : ''); frac = P.weapon.dur / d.dur; }
    else { ico.appendChild(svgIc('i-fist')); $('wname').textContent = 'Кулаки'; }
    const bar = $('wdur'); bar.parentNode.style.visibility = frac == null ? 'hidden' : ''; if (frac != null) { bar.style.width = Math.max(4, Math.round(frac * 100)) + '%'; bar.className = frac < .3 ? 'lo' : ''; }
    ws.title = P.car ? 'За рулём' : 'В руках: ' + $('wname').textContent + ' · нажми, чтобы сменить';
  }
}
function setActButton(a) {
  const b = $('bAct');
  b.classList.toggle('off', !a);
  if (!a) return;
  $('bActV').textContent = a.label.charAt(0).toUpperCase() + a.label.slice(1);
  $('bActN').textContent = actName(a);
  setUse($('bActIc'), actIcon(a));
}
function cycleWeapon() {
  if (mode !== 'play' || paused || P.sleep || P.car) return;
  const k = P.inv.findIndex(it => ITEMS[it.id].kind === 'weapon');
  if (k >= 0) { useItem(null, k); hud3Key = ''; updateHud(); return; }
  if (P.weapon) { toast('Другого оружия нет. Открой рюкзак, чтобы убрать его'); return; }
  toast('Оружия нет. Ищи в шкафах, гаражах и машинах');
}
function setAtk(car) { document.body.classList.toggle('incar', !!car); if ($('carPad')) $('carPad').hidden = !car; for (const k in CARB) CARB[k] = 0; const b = $('bAtk'); b.innerHTML = '<svg class="ic"><use href="#' + (car ? 'i-horn' : 'i-strike') + '"/></svg>'; b.setAttribute('aria-label', car ? 'Гудок' : 'Удар'); }
const HOTIC = {food:'i-food', drink:'i-drop', med:'i-cross', throw:'i-bottle', light:'i-light'};
// two-pane wrappers around renderPanel
const renderPanel0 = renderPanel;
renderPanel = function () {
  renderPanel0();
  if (!panel) return;
  const body = $('pnBody'), tabs = $('pnTabs');
  // tab icons
  const TI = {'Вещи':'i-bag', 'Создать':'i-tool', 'Состояние':'i-user'};
  for (const b of tabs.querySelectorAll('button')) { const t = b.textContent; if (TI[t] && !b.querySelector('svg')) b.prepend(svgIc(TI[t])); }
  if (panel.kind === 'inv' && panel.tab === 'items') {
    buildInvDoll(body);

  }
};
