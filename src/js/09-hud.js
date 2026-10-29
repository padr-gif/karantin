// ================= HUD =================
const statEls = {};
document.querySelectorAll('.stat').forEach(el => statEls[el.dataset.k] = el);
let lastUse = '', lastBar = null;
// значок состояния в HUD (77-moodicons рисует их картинками); сколько показать, остальное — «+N»
let moodChip = (t, c) => `<span class="mood ${c}">${t}</span>`, MOOD_MAX = 5;
function fmtTime(m) { const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60); return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }
function updateHud() {
  for (const k of ['hp', 'sat', 'hyd', 'en']) {
    const v = P[k], el = statEls[k];
    const fg = el.querySelector('.fg'); if (fg) { const o = (GAUGE_C * (1 - clamp(v, 0, 100) / 100)).toFixed(1); if (fg._o !== o) { fg._o = o; fg.style.strokeDashoffset = o; } }
    el.classList.toggle('low', v < 20); el.title = el.getAttribute('aria-label') + ': ' + Math.round(Math.max(0, v)) + '%';
  }
  clockHud();
  updateHud3(); carHud();
  $('time').textContent = fmtTime(gameMin);
  $('kills').textContent = String(kills);
  const m = [];
  const chasing = zs.filter(z => z.state === 'chase' && Math.hypot(z.x - P.x, z.y - P.y) < 12).length;
  if ((P.panic || 0) > 65) m.push(['Паника', 'crit']); else if ((P.panic || 0) > 30 || chasing) m.push(['Тревога', 'warn']);
  if (P.bleed) m.push(['Кровотечение', 'crit']);
  m.push(...woundMoodles());
  for (const s of MOODS) if (s.hud) s.hud(m);
  if (P.sneak && !chasing && !P.car) m.push(['Незаметен', '']);
  if (P.inf && P.infT > 360) m.push(['Жар', 'crit']); else if (P.inf && P.infT > 120) m.push(['Тошнота', 'warn']);
  if (P.pois > 0) m.push(['Отравление', 'crit']);
  if (P.sat < 10) m.push(['Сильный голод', 'crit']); else if (P.sat < 30) m.push(['Голод', 'warn']);
  if (P.hyd < 10) m.push(['Сильная жажда', 'crit']); else if (P.hyd < 30) m.push(['Жажда', 'warn']);
  if (P.en < 12) m.push(['Валится с ног', 'crit']); else if (P.en < 30) m.push(['Хочет спать', 'warn']);
  if (P.hp < 30) m.push(['Тяжёлые раны', 'crit']);
  if (P.cold > 85) m.push(['Переохлаждение', 'crit']); else if (P.cold > 55) m.push(['Холодно', 'warn']); else if (P.cold > 30) m.push(['Прохладно', '']);
  if (P.wet > 40) m.push(['Промок', P.wet > 75 ? 'warn' : '']);
  if (P.flu > 0) m.push(['Простуда', 'warn']);
  if ((P.stress || 0) > 80) m.push(['Нервы на пределе', 'crit']); else if ((P.stress || 0) > 50) m.push(['Стресс', 'warn']);
  if ((P.bored || 0) > 60) m.push(['Скука', 'warn']);
  m.sort((a, b) => (b[1] === 'crit') - (a[1] === 'crit') || (b[1] === 'warn') - (a[1] === 'warn'));
  if (m.length > MOOD_MAX) { const n = m.length - MOOD_MAX + 1; m.length = MOOD_MAX - 1; m.push(['+' + n, '']); }
  const html = m.map(([t, c]) => moodChip(t, c)).join('');
  const mo = $('moodles'); if (mo._h !== html) { mo._h = html; mo.innerHTML = html; }
  curAct = getAction(); curBar = getBarricade();
  const key = curAct ? curAct.label : '';
  if (key + actName(curAct || {}) !== lastUse) { lastUse = key + actName(curAct || {}); setActButton(curAct); }
  { const L = getActions(); $('bMore').hidden = true; if (L.length < 2) $('actMenu').hidden = true; renderActStack(L); }
  renderHotbar();
  if (!!curBar !== lastBar) { lastBar = !!curBar; $('bBar').hidden = !curBar; stackKey = ''; }
  $('vig').style.opacity = Math.max(P.hurt * 1.6, P.hp < 30 ? (30 - P.hp) / 45 : 0).toFixed(2);
  if (P.sleep) { $('sTime').textContent = wristId() ? (wristId() === 'watchD' ? 'День ' + (Math.floor(gameMin / 1440) + 1) + ', ' : '') + fmtTime(gameMin) : partOfDay(); $('sEn').textContent = 'Бодрость ' + Math.round(P.en) + '%'; }
}
