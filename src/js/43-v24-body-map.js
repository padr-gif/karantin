// ================= v24: character screen with a body map, fitness, survivor's diary, kept scroll =================
SKILLS.fit = {name:'Физподготовка', per:'сильнее бьёшь, меньше устаёшь на бегу, спокойнее в драке'};
// ---- diary ----
function logEv(t) { if (!P) return; P.log = P.log || []; P.log.push([Math.round(gameMin), t]); if (P.log.length > 80) P.log.splice(0, P.log.length - 80); }
const KILL_MS = [1, 10, 25, 50, 100, 200, 300, 500];
const ach24 = ach;
ach = function (id) { const had = achDone[id]; ach24(id); if (!had) { const a = ACH.find(a => a[0] === id); if (a) logEv('Достижение: «' + a[1] + '»'); } };
const addXp24 = addXp;
addXp = function (k, n) { const b = skillLv(k); addXp24(k, n); const a = skillLv(k); if (a > b) logEv('Навык «' + SKILLS[k].name + '» вырос до ' + a); };
const startHorde24 = startHorde;
startHorde = function () { startHorde24(); logEv('Через город пошла орда'); };
onStartNew(() => { if (P && !P.log) { P.log = []; logEv('Город закрыли на карантин. Я дома, один. Нужно продержаться'); }
});
function tickDiary() {
  const day = Math.floor(gameMin / 1440);
  if (P._logDay !== day) { if (P._logDay != null) logEv('Начался день ' + (day + 1) + ': ' + dateStr(gameMin) + ', ' + Math.round(outsideTemp()) + '°C'); P._logDay = day; }
  const nk = KILL_MS.find(m => m > (P._logK || 0)); if (nk && kills >= nk) { P._logK = nk; logEv(nk === 1 ? 'Убил первого мертвеца' : 'Убито мертвецов: ' + nk); }
  if (!P._logPw && !powerOn()) { P._logPw = 1; logEv('Отключили электричество'); }
  if (!P._logWt && !waterOn()) { P._logWt = 1; logEv('Из кранов больше не течёт вода'); }
}
// ---- fitness: a workout at home ----
const fitLv = () => skillLv('fit');
function canWorkout() {
  if (P.car) return 'Не в машине';
  if (fracAt('leg') || fracAt('arm')) return 'С переломом не позанимаешься';
  if ((P.pain || 0) > 45) return 'Слишком больно';
  if (P.en < 20) return 'Нет сил: сначала поспи';
  if (P.sat < 15 || P.hyd < 15) return 'Сначала поешь и попей';
  if ((P.fitT || 0) > gameMin) return 'Мышцы ещё ноют, отдохни ~' + Math.ceil((P.fitT - gameMin) / 60) + ' ч';
  if (zs.some(z => z.state === 'chase' && Math.hypot(z.x - P.x, z.y - P.y) < 14)) return 'Не время: мертвецы рядом';
  return null;
}
function workout() {
  const why = canWorkout(); if (why) { toast(why); return; }
  job(7, () => {
    P.en = Math.max(0, P.en - 12); P.sat = Math.max(0, P.sat - 3); P.hyd = Math.max(0, P.hyd - 5);
    P.bored = Math.max(0, (P.bored || 0) - 15); P.stress = Math.max(0, (P.stress || 0) - 10); P.unh = Math.max(0, (P.unh || 0) - 5);
    P.fitT = gameMin + 150; addXp('fit', 3); stat('workout'); SFX.rustle();
    toast('Зарядка сделана: отжимания, приседания, пресс. Голова прояснилась');
  }, {reopen:'self', sub:'skills', noisy:2});
}
const dmgK24 = dmgK; dmgK = function () { return dmgK24() * (1 + .03 * fitLv()); };
const panicK24 = panicK; panicK = function () { return panicK24() * (1 - .06 * fitLv()); };
// ---- body map ----
const WHERE2REG = {'голова':'head', 'шея':'neck', 'грудь':'chest', 'спина':'chest', 'живот':'belly', 'левая рука':'armL', 'правая рука':'armR', 'левая нога':'legL', 'правая нога':'legR'};
const REG = {
  head:{name:'Голова', at:[70, 21], slot:'head'}, neck:{name:'Шея', at:[70, 42], slot:'head'}, chest:{name:'Грудь и спина', at:[70, 62], slot:'torso'}, belly:{name:'Живот', at:[70, 92], slot:'torso'},
  armR:{name:'Правая рука', at:[37, 84], slot:'torso'}, armL:{name:'Левая рука', at:[103, 84], slot:'torso'}, legR:{name:'Правая нога', at:[59, 150], slot:null}, legL:{name:'Левая нога', at:[81, 150], slot:null},
};
const REGP = {
  head:'<ellipse cx="70" cy="22" rx="13" ry="15"/>', neck:'<rect x="63" y="36" width="14" height="10" rx="2"/>',
  chest:'<path d="M48 46 L92 46 Q97 48 96 57 L93 80 L47 80 L44 57 Q43 48 48 46 Z"/>', belly:'<path d="M47 80 L93 80 L92 105 L48 105 Z"/>',
  armR:'<path d="M45 48 Q37 50 35 60 L27 108 Q26 117 32 118 L37 116 L46 64 Z"/><circle cx="30" cy="123" r="5.5"/>',
  armL:'<path d="M95 48 Q103 50 105 60 L113 108 Q114 117 108 118 L103 116 L94 64 Z"/><circle cx="110" cy="123" r="5.5"/>',
  legR:'<path d="M48 105 L69 105 L67 194 Q60 199 50 197 L52 192 Z"/>', legL:'<path d="M71 105 L92 105 L88 192 L90 197 Q80 199 73 194 Z"/>',
};
const rgbS = c => 'rgb(' + c.slice(0, 3).join(',') + ')';
function woundSvg(w, x, y, k) {
  let s = '';
  if (w.sep > 50) s += `<circle cx="${x}" cy="${y}" r="10" fill="#e8742a" opacity=".35"/>`;
  if (w.k === 'scratch') s += `<path d="M${x - 5} ${y - 2} l9 -4 M${x - 5} ${y + 1} l9 -4 M${x - 4} ${y + 4} l8 -4" stroke="#ff5a48" stroke-width="1.3" stroke-linecap="round"/>`;
  else if (w.k === 'cut') s += `<path d="M${x - 7} ${y + 3} L${x + 7} ${y - 3}" stroke="#2a0806" stroke-width="3.6" stroke-linecap="round"/><path d="M${x - 7} ${y + 3} L${x + 7} ${y - 3}" stroke="#e0302a" stroke-width="2" stroke-linecap="round"/>`;
  else if (w.k === 'deep') s += `<ellipse cx="${x}" cy="${y}" rx="7" ry="3.4" transform="rotate(-25 ${x} ${y})" fill="#7a0e0a" stroke="#2a0806" stroke-width="1"/><path d="M${x - 4} ${y} L${x + 4} ${y - 2}" stroke="#d0302a" stroke-width="1.2"/>`;
  else if (w.k === 'bite') { for (let a = 0; a < 7; a++) { const t = Math.PI * (.1 + a / 7.5), r = 5.5; s += `<circle cx="${(x + Math.cos(t) * r).toFixed(1)}" cy="${(y - 1 + Math.sin(t) * r).toFixed(1)}" r="1.3" fill="#9a1410"/>`; } for (let a = 0; a < 5; a++) { const t = Math.PI * (1.15 + a / 6), r = 4.5; s += `<circle cx="${(x + Math.cos(t) * r).toFixed(1)}" cy="${(y + 1 + Math.sin(t) * r).toFixed(1)}" r="1.1" fill="#9a1410"/>`; } }
  else if (w.k === 'frac') s += `<path d="M${x - 7} ${y - 5} L${x - 2} ${y + 2} L${x + 2} ${y - 3} L${x + 7} ${y + 5}" stroke="#1a1410" stroke-width="3.6" fill="none" stroke-linejoin="round"/><path d="M${x - 7} ${y - 5} L${x - 2} ${y + 2} L${x + 2} ${y - 3} L${x + 7} ${y + 5}" stroke="#f6e6b0" stroke-width="1.8" fill="none" stroke-linejoin="round"/>`;
  if (w.spl) s += `<rect x="${x - 10}" y="${y - 11}" width="3" height="22" fill="#a8743e" stroke="#3a2412" stroke-width=".7"/><rect x="${x + 7}" y="${y - 11}" width="3" height="22" fill="#a8743e" stroke="#3a2412" stroke-width=".7"/>`;
  if (w.band) s += `<rect x="${x - 9}" y="${y - 4}" width="18" height="8" rx="1.5" fill="${dirtyBand(w) ? '#b8a27a' : '#f2eee4'}" stroke="#4a4438" stroke-width=".7"/><path d="M${x - 5} ${y - 4} v8 M${x} ${y - 4} v8 M${x + 5} ${y - 4} v8" stroke="${dirtyBand(w) ? '#8a7450' : '#cfc8b8'}" stroke-width=".7"/>`;
  if (bleeding(w)) s += `<path class="drip" d="M${x + 2} ${y + 5} q-2.5 4 0 6 q2.5 -2 0 -6 Z" fill="#d0302a"/>`;
  if (w.where === 'спина') s += `<text x="${x + 10}" y="${y + 3}" font-size="7" fill="#f0c477">спина</text>`;
  return s;
}
function bodySvg(sel) {
  const lk = P.look || look, skin = rgbS(LOOK.skin[lk.skin]), ct = P.cloth && P.cloth.torso, ch = P.cloth && P.cloth.head;
  const shirt = rgbS(ct ? ITEMS[ct.id].col : LOOK.shirt[lk.shirt]), pants = rgbS(LOOK.pants[lk.pants]);
  const fill = {head:ch ? rgbS(ITEMS[ch.id].col) : skin, neck:skin, chest:shirt, belly:shirt, armR:shirt, armL:shirt, legR:pants, legL:pants};
  const W = wounds(), byReg = {};
  for (const w of W) { const r = WHERE2REG[w.where] || 'chest'; (byReg[r] = byReg[r] || []).push(w); }
  let s = '<svg viewBox="0 0 140 206" class="bodysvg" role="img" aria-label="Схема тела">';
  s += '<ellipse cx="70" cy="200" rx="34" ry="5" fill="rgba(0,0,0,.35)"/>';
  for (const r in REGP) {
    const ws = byReg[r] || [], hurt = ws.length, bad = ws.some(bleeding) ? 'bleed' : ws.some(w => w.sep > 50) ? 'sep' : hurt ? 'hurt' : '';
    s += `<g class="reg ${bad}${sel === r ? ' sel' : ''}" data-r="${r}" fill="${fill[r]}">${REGP[r]}</g>`;
  }
  s += `<g pointer-events="none"><path d="M64 20 h2 M74 20 h2" stroke="#1a1410" stroke-width="2" stroke-linecap="round"/><path d="M66 29 q4 2 8 0" stroke="#1a1410" stroke-width="1.2" fill="none"/></g>`;
  if (!(P.cloth && P.cloth.head)) s += `<path d="M57 17 Q58 5 70 6 Q82 5 83 17 Q76 11 70 12 Q63 11 57 17 Z" pointer-events="none" fill="${lk.hair < 0 ? skin : rgbS(LOOK.hair[lk.hair])}"/>`;
  s += '<g pointer-events="none">';
  for (const r in byReg) { const [x, y] = REG[r].at; byReg[r].forEach((w, k) => { s += woundSvg(w, x + (k % 2 ? 5 : -2), y + (k - (byReg[r].length - 1) / 2) * 13, k); }); }
  s += '<text x="12" y="16" font-size="8" fill="#8d918c">П</text><text x="124" y="16" font-size="8" fill="#8d918c">Л</text></g></svg>';
  return s;
}
function statusChips() {
  const out = [], W = wounds();
  if (P.bleed) out.push(['Кровотечение', 'crit']);
  if (P.inf) out.push([P.infT > 360 ? 'Жар от укуса' : 'Заражение от укуса', 'crit']);
  if ((P.fever || 0) > 0) out.push(['Воспаление раны', P.fever > .5 ? 'crit' : 'warn']);
  if ((P.pain || 0) > 10) out.push(['Боль ' + Math.round(P.pain) + '%' + (P.painkT > 0 ? ' · таблетки' : ''), P.pain > 60 ? 'crit' : 'warn']);
  if (W.some(dirtyBand)) out.push(['Грязная повязка', 'warn']);
  if (!out.length) out.push([W.length ? 'Раны под контролем' : 'Цел и невредим', 'ok']);
  return out;
}
function buildBodyTab(host) {
  const lay = mk('div', 'bodylay'), fig = mk('div', 'bodyfig'), info = mk('div', 'bodyinfo');
  const sel = panel.part && REG[panel.part] ? panel.part : null;
  fig.innerHTML = bodySvg(sel);
  fig.querySelectorAll('.reg').forEach(g => g.addEventListener('click', () => { SFX.ui(); panel.part = panel.part === g.dataset.r ? null : g.dataset.r; renderPanel(); }));
  fig.appendChild(mk('span', 'figcap', 'Нажми на часть тела'));
  const chips = mk('div', 'schips'); for (const [t, c] of statusChips()) chips.appendChild(mk('span', 'mood ' + c, t)); info.appendChild(chips);
  const W = wounds(), list = sel ? W.filter(w => (WHERE2REG[w.where] || 'chest') === sel) : W;
  const head = mk('div', 'binfoh'); head.appendChild(mk('b', '', sel ? REG[sel].name : 'Все раны'));
  if (sel) {
    head.appendChild(mk('small', '', regClothText(sel)));
    head.appendChild(btn('Показать все', () => { panel.part = null; renderPanel(); }, 'ghost'));
  }
  info.appendChild(head);
  if (list.length) { const box = mk('div', 'wounds'); for (const w of list.slice().sort((a, b) => bleeding(b) - bleeding(a) || b.sep - a.sep)) box.appendChild(woundRow(w)); info.appendChild(box); }
  else info.appendChild(mk('p', 'empty', sel ? 'Здесь всё цело' : 'Ран нет. Будь осторожен'));
  if (W.length && countItem('medkit')) { const b = btn('Аптечка: обработать всё сразу', () => startTreat('medkit', null)); b.className = 'wide'; info.appendChild(b); }
  const meds = ['bandage', 'rag', 'antisep', 'medkit', 'splint', 'painkill', 'pills', 'antibio'].filter(id => countItem(id));
  info.appendChild(mk('div', 'sect', 'Аптечка в рюкзаке'));
  const mr = mk('div', 'medrow'); if (meds.length) for (const id of meds) { const e = mk('span', 'medc'); e.appendChild(iconEl(id, 22)); e.appendChild(mk('span', '', (ITEMS[id].sh || ITEMS[id].name) + ' ×' + countItem(id))); mr.appendChild(e); } else mr.appendChild(mk('span', 'empty', 'Ни бинтов, ни лекарств'));
  info.appendChild(mr);
  lay.appendChild(fig); lay.appendChild(info); host.appendChild(lay);
}
function buildSkillsTab(host) {
  const wrap = mk('div', 'skillwrap');
  const fit = mk('div', 'workout'), why = canWorkout();
  const tx = mk('div'); tx.appendChild(mk('b', '', 'Зарядка')); tx.appendChild(mk('small', '', why || 'Отжимания и приседания: качает физподготовку, прогоняет скуку и стресс. Тратит силы'));
  fit.appendChild(tx); const b = btn('Заняться', workout); b.disabled = !!why; fit.appendChild(b); wrap.appendChild(fit);
  const sk = mk('div', 'skills');
  for (const k in SKILLS) {
    const lv = skillLv(k), xp = (P.skills && P.skills[k]) || 0, lo = XPL[lv], hi = XPL[Math.min(5, lv + 1)];
    const r = mk('div', 'skill'); r.appendChild(mk('b', '', SKILLS[k].name)); r.appendChild(mk('span', 'lv', lv + '/5' + (P.boost && P.boost[k] && lv <= P.boost[k].max ? ' · ×3' : '')));
    const bar = mk('i'), u = mk('u'); u.style.width = (lv >= 5 ? 100 : Math.round((xp - lo) / (hi - lo) * 100)) + '%'; bar.appendChild(u); r.appendChild(bar);
    r.appendChild(mk('small', '', SKILLS[k].per)); sk.appendChild(r);
  }
  wrap.appendChild(sk); host.appendChild(wrap);
}
function buildInfoTab(host) {
  const lay = mk('div', 'infolay'), a = mk('div'), b = mk('div');
  const dl = mk('dl', 'kv'), add = (k, v) => { dl.appendChild(mk('dt', '', k)); dl.appendChild(mk('dd', '', v)); };
  add('Здоровье', Math.round(P.hp) + '%'); add('Сытость', Math.round(P.sat) + '%'); add('Вода', Math.round(P.hyd) + '%'); add('Бодрость', Math.round(P.en) + '%');
  add('Прожито', fmtDur(gameMin - startMin)); add('Убито', String(kills)); add('Профессия', (PROFS[P.prof] || PROFS.none).name); add('Сложность', DIFF[world.diff].name);
  add('Дата', dateStr(gameMin) + ' · ' + seasonName()); add('Температура', Math.round(airTemp(P.x, P.y)) + '°C' + (P.cold > 30 ? ' · тебе холодно' : ''));
  add('Одежда', [P.cloth && P.cloth.torso, P.cloth && P.cloth.head].filter(Boolean).map(i => ITEMS[i.id].name.toLowerCase()).join(', ') || 'обычная'); add('Тепло', String(insulation()));
  add('Намокание', Math.round(P.wet || 0) + '%'); add('Стресс', Math.round(P.stress || 0) + '%'); add('Скука', Math.round(P.bored || 0) + '%'); add('Паника', Math.round(P.panic || 0) + '%'); add('Уныние', Math.round(P.unh || 0) + '%');
  add('Электричество', powerOn() ? 'есть' : gens.some(g => g.on) ? 'от генератора' : 'отключено'); add('Водопровод', waterOn() ? 'работает' : 'отключён');
  a.appendChild(dl);
  if (P.traits && P.traits.length) { a.appendChild(mk('div', 'sect', 'Черты')); const tl = mk('div', 'tlist'); for (const k of P.traits) { const t = TRAITS[k]; if (!t) continue; const e = mk('span', 'tr ' + (t.pts > 0 ? 'pos' : 'neg'), t.name); e.title = t.info; tl.appendChild(e); } a.appendChild(tl); }
  b.appendChild(mk('div', 'sect', 'Самочувствие')); for (const t of moodleList()) b.appendChild(mk('p', 'empty', t));
  b.appendChild(mk('div', 'sect', 'Дневник'));
  const log = (P.log || []).slice().reverse(), dv = mk('div', 'diary');
  if (!log.length) dv.appendChild(mk('p', 'empty', 'Пока пусто'));
  for (const [m, t] of log.slice(0, 40)) { const r = mk('p', 'dent'); r.appendChild(mk('span', 'dw', 'День ' + (Math.floor(m / 1440) + 1) + ', ' + fmtTime(m))); r.appendChild(document.createTextNode(t)); dv.appendChild(r); }
  b.appendChild(dv);
  lay.appendChild(a); lay.appendChild(b); host.appendChild(lay);
}
function buildSelf(body) {
  body.textContent = ''; body.classList.add('fit');
  const wrap = mk('div', 'selfwrap'), tabs = mk('div', 'subtabs'), host = mk('div', 'subbody');
  const sub = panel.sub || 'body';
  for (const [k, t] of [['body', 'Тело'], ['skills', 'Навыки'], ['info', 'Общее']]) {
    const n = k === 'body' ? wounds().length : 0, b = btn(t + (n ? ' · ' + n : ''), () => { panel.sub = k; SFX.ui(); renderPanel(); }, sub === k ? 'on' : '');
    if (k === 'body' && (P.bleed || (P.fever || 0) > 0)) b.classList.add('alert');
    tabs.appendChild(b);
  }
  wrap.appendChild(tabs); wrap.appendChild(host); body.appendChild(wrap);
  if (sub === 'skills') buildSkillsTab(host); else if (sub === 'info') buildInfoTab(host); else buildBodyTab(host);
}
// the character tab always opens on the body map
const openPanel24 = openPanel;
openPanel = function (kind, opt) { openPanel24(kind, opt); if (panel && kind === 'inv') panel.sub = (opt && opt.sub) || 'body'; };
// ---- keep scroll positions when a panel re-renders (recipe lists, columns) ----
const SCROLL_SEL = ['.rlist', '.rdet', '.pcol', '.pdet', '.bodyinfo', '.skillwrap', '.infolay > div', '.self3 > div'];
let scrollKey = '';
onPanel((a, {key, keep}) => {
  const body = $('pnBody');
  scrollKey = key;
  for (const [sel, i, v] of keep) { const e = sel ? body.querySelectorAll(sel)[i] : body; if (e) e.scrollTop = v; }
}, () => {
  const body = $('pnBody'), key = panel ? panel.kind + '|' + (panel.tab || '') + '|' + (panel.sub || '') : '', keep = [];
  if (panel && key === scrollKey) { keep.push(['', 0, body.scrollTop]); for (const sel of SCROLL_SEL) body.querySelectorAll(sel).forEach((e, i) => { if (e.scrollTop) keep.push([sel, i, e.scrollTop]); }); }
  return {key, keep};
});
// ---- save the diary and fitness timer too ----
onSave(d => { Object.assign(d.p, {log:P.log || [], fitT:r2(P.fitT || 0), _logDay:P._logDay, _logK:P._logK || 0, _logPw:P._logPw || 0, _logWt:P._logWt || 0});
});
const tickV23b = tickV23;
tickV23 = function (dt, gm) { tickV23b(dt, gm); tickDiary(); };
