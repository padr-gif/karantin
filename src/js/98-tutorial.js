// ================= обучение: своя маленькая карта, шаги с подсказками, в конце герой погибает =================
// «Обучение» в главном меню. Карта — один дом за высоким забором (86-tut-map), строится за экраном загрузки.
// Шаги: идти, обыскать, забрать, поесть, почитать чужой телефон, взять оружие, красться, выйти во двор, убить мертвеца —
// и толпа: ворота не выдерживают. После смерти — «Создать мир» (экран нового выжившего).
// Обучение ничего не пишет: ни сохранений, ни рекорда, ни достижений. «Новая игра» без обучения — как раньше.
const TUT_SEED = 20261028;
const TUT = {on:false, dead:false, step:-1, wait:false, t0:0, d:{}, iv:0, ui:null};

// ---- оформление (своё, чтобы не трогать styles.css) ----
{
  const css = `
#tutCard{position:fixed;top:calc(var(--st,0px) + 8px);left:50%;transform:translateX(-50%);z-index:40;width:min(380px,calc(100vw - 500px));min-width:250px;
  color:#e9e3d6;font:14px/1.3 system-ui,sans-serif;display:grid;gap:4px;pointer-events:none}
#tutCard[hidden]{display:none}
#tutCard .tbar{pointer-events:auto;display:flex;align-items:center;gap:8px;background:rgba(14,18,20,.86);border:1px solid rgba(240,196,119,.4);
  border-radius:20px;padding:4px 4px 4px 6px;box-shadow:0 4px 14px rgba(0,0,0,.35);transition:border-color .2s}
#tutCard .tn{flex:none;min-width:34px;height:26px;border-radius:13px;background:#f0c477;color:#1a1408;font:700 12px/26px system-ui,sans-serif;text-align:center;padding:0 6px}
#tutCard .tt{flex:1;min-width:0;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tutCard .tb{flex:none;width:30px;height:30px;border-radius:15px;border:0;background:rgba(233,227,214,.1);color:#e9e3d6;font:700 15px/30px system-ui,sans-serif;cursor:pointer;padding:0}
#tutCard .tdet{pointer-events:auto;background:rgba(14,18,20,.82);border-radius:10px;padding:7px 11px;color:#d8d2c4;font-size:13px;line-height:1.35;transition:opacity .3s}
#tutCard .tdet[hidden]{display:none}
#tutCard.ok .tbar{border-color:#9fd58a}
#tutCard.ok .tn{background:#9fd58a}
#tutIntro{position:fixed;inset:0;z-index:41;display:grid;place-items:center;background:rgba(6,8,8,.45)}
#tutIntro[hidden]{display:none}
#tutIntro .ti{width:min(400px,calc(100% - 32px));background:rgba(16,20,22,.96);border:1px solid rgba(240,196,119,.45);border-radius:10px;padding:16px 18px;display:grid;gap:8px;color:#e9e3d6;font:14px/1.4 system-ui,sans-serif}
#tutIntro .tst{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#f0c477}
#tutIntro h3{margin:0;font-size:18px;color:#fff}
#tutIntro p{margin:0;color:#cfc8b8}
#tutIntro .trow{display:flex;gap:8px;justify-content:flex-end;margin-top:4px}
#tutIntro button{min-height:42px;padding:8px 16px;border-radius:6px;font:600 14px system-ui,sans-serif;cursor:pointer}
#tutIntro .tgo{background:#f0c477;color:#1a1408;border:0}
#tutIntro .tskip{background:transparent;color:#a9a294;border:1px solid rgba(233,227,214,.25)}
.tutHi{animation:tutHi 1.1s ease-in-out infinite;position:relative;z-index:6}
@keyframes tutHi{0%,100%{box-shadow:0 0 0 0 rgba(240,196,119,.0)}50%{box-shadow:0 0 0 6px rgba(240,196,119,.55)}}
#tutLoad{position:fixed;inset:0;z-index:85;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 40%,#1a2024,#0c0f12 70%);color:#e9e3d6;transition:opacity .35s}
#tutLoad[hidden]{display:none}
#tutLoad.out{opacity:0}
#tutLoad .tl{width:min(420px,calc(100% - 48px));display:grid;gap:14px;text-align:center}
#tutLoad .tlt{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#f0c477}
#tutLoad h2{margin:0;font-size:26px;letter-spacing:.04em}
#tutLoad .tlb{height:6px;border-radius:3px;background:rgba(233,227,214,.12);overflow:hidden}
#tutLoad .tlb i{display:block;height:100%;width:0;background:#f0c477;transition:width .25s}
#tutLoad .tls{font-size:13px;color:#a9a294;min-height:2.6em}
#mTut small{display:inline-block;margin-left:10px;font-size:11px;letter-spacing:.08em;color:#f0c477;text-transform:none;font-family:system-ui,sans-serif}
#tutDeadMsg{margin:0;color:#cfc8b8;line-height:1.45}
#tutTips{margin:0;padding-left:18px;color:#f0c477;font-size:14px;line-height:1.45}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
}

// ---- что считается «дома», где ящик, есть ли вещь ----
const tutTile = (x, y) => Math.floor(y) * MW + Math.floor(x);
const tutHome = () => P && spawnHouse && hAt[tutTile(P.x, P.y)] === spawnHouse;
const tutHas = id => P && (P.inv.some(i => i && i.id === id) || (P.weapon && P.weapon.id === id));
const tutCount = id => P ? P.inv.filter(i => i && i.id === id).length : 0;
// мертвец обучения: где-то во дворе (как будто перелез) или на дороге за воротами (road)
const tutInYard = (x, y) => x > TUT_FENCE.x0 && x < TUT_FENCE.x1 && y > TUT_FENCE.y0 && y < TUT_FENCE.y1;
function tutZombie(dmin, dmax, hp, spd, road) {
  const gate = props.find(p => p.type === 'hfence' && p.gate);
  for (let k = 0; k < 120; k++) {
    let x, y;
    if (road && gate) { x = gate.cx + (Math.random() - .5) * 16; y = TUT_FENCE.y1 + 2 + Math.random() * 5; }
    else { const a = Math.random() * 6.283, d = dmin + Math.random() * (dmax - dmin); x = P.x + Math.cos(a) * d; y = P.y + Math.sin(a) * d; }
    const tx = Math.floor(x), ty = Math.floor(y);
    if (tx < 2 || ty < 2 || tx >= MW - 2 || ty >= MH - 2 || navBlocked(tx, ty) || hAt[ty * MW + tx]) continue;
    if (!road && !tutInYard(tx, ty)) continue;
    const z = mkZombie(tx + .5, ty + .5, {pi:Math.floor(Math.random() * 10), b:Math.random() < .4 ? 'f' : 'm', blood:Math.floor(Math.random() * 2)}, hp, spd);
    z.crawl = false; z.tut = true; z.state = 'chase'; z.lost = 0; z.aw = 0; z.tx = P.x; z.ty = P.y;
    return z;
  }
  return null;
}

// ---- шаги ----
const TUT_STEPS = [
  {title:'Пройдись', text:() => isTouch ? 'Левая половина экрана — джойстик: прижми палец и веди.' : 'WASD или стрелки — идти, Shift — бежать.',
   enter() { TUT.d.sx = P.x; TUT.d.sy = P.y; },
   check:() => Math.hypot(P.x - TUT.d.sx, P.y - TUT.d.sy) > 2.5},
  {title:'Обыщи отмеченную мебель', text:() => 'Подойди к кольцу: мебель засветится, а справа внизу появится кнопка «Обыскать». Нажми её' + (isTouch ? '.' : ' (или E).'),
   hi:['bAct'], target:() => TUT.d.box && [TUT.d.box.x + .5, TUT.d.box.y + .5],
   check:() => panel && panel.kind === 'loot'},
  {title:'Забери чипсы, биту и телефон', text:() => 'Нажми на вещь и «Взять». Двойной тап переносит сразу.',
   target:() => TUT.d.box && [TUT.d.box.x + .5, TUT.d.box.y + .5],
   check:() => tutHas('bat') && tutHas('phone') && (tutHas('chips') || !((TUT.d.box && TUT.d.box.items) || []).some(i => i && i.id === 'chips'))},
  {title:'Нажми на саму мебель', text:() => 'Закрой ящик и нажми прямо на саму тумбочку: откроется меню со всеми действиями с ней. Так с любым предметом.',
   target:() => TUT.d.box && [TUT.d.box.x + .5, TUT.d.box.y + .5],
   enter() { TUT.d.op = (window.__actUI && window.__actUI.opened) || 0; },
   check:() => !window.__actUI || (window.__actUI.opened || 0) > TUT.d.op},
  {title:'Поешь', text:() => 'Ты голоден — значок слева вверху. Открой рюкзак' + (isTouch ? '' : ' (I)') + ', выбери чипсы, «Съесть».',
   hi:['bInv'], enter() { P.sat = Math.min(P.sat, 28); TUT.d.sat = P.sat; TUT.d.chips = tutCount('chips'); },
   check:() => !TUT.d.chips || tutCount('chips') < TUT.d.chips || P.sat > TUT.d.sat + 6},
  {title:'Почитай чужой телефон', text:() => 'Он принадлежал хозяину дома. Кнопка телефона — справа вверху' + (isTouch ? '' : ' (N)') + '. В чужих телефонах бывают метки с припасами, а фонарик светит, пока есть заряд.',
   hi:['bPhone'], enter() { TUT.d.op = PH.opened; },
   check:() => PH.opened > TUT.d.op && !PH.open},
  {title:'Возьми биту в руки', text:() => 'В рюкзаке выбери биту и нажми «Взять в руки».',
   hi:['bInv'], check:() => P.weapon && P.weapon.id === 'bat'},
  {title:'Крадись', text:() => 'Шаги слышно далеко. Включи «Красться»' + (isTouch ? '' : ' (C)') + ' — мертвецы услышат только вблизи.',
   hi:['bSneak'], check:() => !!P.sneak},
  {title:'Выйди во двор', text:() => 'Подойди к двери — справа внизу появится кнопка «Открыть». Со двора не уйти: забор высокий, ворота на засове.',
   hi:['bAct'], target:() => TUT.d.door && [TUT.d.door.x + .5, TUT.d.door.y + .5],
   check:() => !tutHome() && !panel},
  {title:'Убей мертвеца', text:() => 'Один перелез через забор. Бей кнопкой «Удар»' + (isTouch ? ' или тапом справа' : ', мышью или Пробелом') + '. Ударил — отступи и снова.',
   hi:['bAtk'], enter() { TUT.d.k0 = kills; TUT.d.z = tutZombie(6, 8, 40, .72); },
   target:() => TUT.d.z && zs.includes(TUT.d.z) && [TUT.d.z.x, TUT.d.z.y],
   tick() { if (!TUT.d.z || !zs.includes(TUT.d.z)) { if (kills <= TUT.d.k0) TUT.d.z = tutZombie(6, 8, 40, .72); } },
   check:() => kills > TUT.d.k0},
  {title:'Ворота не выдержали', text:() => 'Шум драки услышали с дороги. Держись, сколько сможешь — так кончается любая история.',
   enter() {
     TUT.t0 = performance.now(); for (let k = 0; k < 18; k++) tutZombie(0, 0, 55, .85 + Math.random() * .2, true);
     for (let k = 0; k < 4; k++) tutZombie(6, 12, 55, .9);                                             // и пара — через забор
     tutBreakGate(); if (!reduceMotion && settings.shake) shake = .5;
     SFX.scream && SFX.scream(); if (typeof logEv === 'function') logEv('Ворота выломали. Если кто-то найдёт этот дневник — не шумите');
   },
   tick() {
     const s = (performance.now() - TUT.t0) / 1000, mine = zs.filter(z => z.tut);
     if (mine.length < 14) for (let k = 0; k < 4; k++) tutZombie(0, 0, 55, 1, true);                   // толпа с дороги не кончается
     for (const z of mine) { z.state = 'chase'; z.lost = 0; if (s > 25 && !z.fastT) { z.spd *= 1.35; z.fastT = 1; } }
     if (s > 55) { P.hp -= 1.6; lastCause = 'Не продержался против толпы'; }                              // финал не тянется вечно
   }},
];

// ---- плашка с заданием: одна строка сверху, подробности — на 7 секунд при новом шаге или по кнопке «?» ----
function tutCard() {
  if (TUT.ui) return TUT.ui;
  const c = mk('div'); c.id = 'tutCard'; c.hidden = true; c.setAttribute('role', 'status'); c.setAttribute('aria-live', 'polite');
  c.innerHTML = '<div class="tbar"><span class="tn"></span><span class="tt"></span><button type="button" class="tb tq" aria-label="Подсказка">?</button><button type="button" class="tb tx" aria-label="Выйти из обучения">✕</button></div><div class="tdet" hidden></div>';
  c.querySelector('.tq').addEventListener('click', () => { SFX.ui(); tutDet(c.querySelector('.tdet').hidden); });
  c.querySelector('.tx').addEventListener('click', () => {                     // второй тап за 3 с — выйти
    const x = c.querySelector('.tx');
    if (x._arm && Date.now() - x._arm < 3000) { SFX.ui(); toMenu(); return; }
    x._arm = Date.now(); c.querySelector('.tt').textContent = 'Ещё раз ✕ — выйти из обучения';
    setTimeout(() => { x._arm = 0; if (TUT.on && TUT_STEPS[TUT.step]) c.querySelector('.tt').textContent = TUT_STEPS[TUT.step].title; }, 3000);
  });
  document.body.appendChild(c); return (TUT.ui = c);
}
function tutDet(on, ms) {
  const d = tutCard().querySelector('.tdet'); clearTimeout(TUT.detT);
  d.hidden = !on || !!panel;                                                    // в открытом окне (ящик, рюкзак, карта) не мешает
  if (on && ms) TUT.detT = setTimeout(() => { d.hidden = true; }, ms);
}
function tutSay(n, title, text) {
  const c = tutCard(); c.hidden = false; c.classList.remove('ok');
  c.querySelector('.tn').textContent = n; c.querySelector('.tt').textContent = title; c.querySelector('.tdet').textContent = text;
  tutDet(true, 7000);
}
function tutIntro() {
  let o = $('tutIntro');
  if (!o) {
    o = mk('div'); o.id = 'tutIntro';
    o.innerHTML = '<div class="ti" role="dialog" aria-modal="true"><div class="tst">Обучение</div><h3>Добро пожаловать в Dead Line</h3><p>Город закрыт, на улицах мертвецы, помощи не будет. Покажу самое нужное: ходить, обыскивать, есть, прятаться и драться. Пара минут.</p><p>Задание будет висеть сверху одной строкой. Нажми «?», чтобы перечитать подсказку.</p><div class="trow"><button type="button" class="tskip">В меню</button><button type="button" class="tgo">Начать</button></div></div>';
    o.querySelector('.tskip').addEventListener('click', () => { SFX.ui(); o.hidden = true; toMenu(); });
    o.querySelector('.tgo').addEventListener('click', () => { SFX.ui(); o.hidden = true; paused = false; tutGo(0); });
    document.body.appendChild(o);
  }
  o.hidden = false;
}
function tutHi(ids) {
  for (const e of document.querySelectorAll('.tutHi')) e.classList.remove('tutHi');
  for (const id of ids || []) { const e = $(id); if (e) e.classList.add('tutHi'); }
}
function tutGo(i) {
  TUT.step = i; TUT.wait = false;
  const st = TUT_STEPS[i]; if (!st) return;
  if (st.enter) st.enter();
  tutSay((i + 1) + '/' + TUT_STEPS.length, st.title, st.text());
  tutHi(st.hi);
  if (i === TUT_STEPS.length - 1) { tutHi([]); buzzTut([60, 60, 120]); }
}
const buzzTut = p => { try { settings.vib !== false && navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
function tutDone() {
  const c = tutCard(); c.classList.add('ok'); c.querySelector('.tn').textContent = '✓'; tutDet(false);
  SFX.select && SFX.select(); buzzTut(15);
  setTimeout(() => { if (TUT.on) tutGo(TUT.step + 1); }, 900);
}
function tutTick() {
  if (!TUT.on || mode !== 'play') return;
  for (let i = zs.length - 1; i >= 0; i--) if (!zs[i].tut) zs.splice(i, 1);      // в обучении только свои мертвецы
  if (panel && TUT.ui) TUT.ui.querySelector('.tdet').hidden = true;
  const st = TUT_STEPS[TUT.step]; if (!st || TUT.wait) return;
  if (st.tick) st.tick();
  if (st.check && st.check()) { TUT.wait = true; tutDone(); }
}

// ---- метка цели в мире: пульсирующее кольцо и стрелка ----
if (typeof onDraw === 'function') onDraw(() => {
  if (!TUT.on || mode !== 'play' || TUT.wait) return;
  const st = TUT_STEPS[TUT.step], t = st && st.target && st.target(); if (!t) return;
  const sx = SX(t[0], t[1]), sy = SY(t[0], t[1], 0), now = performance.now(), ph = (now / 900) % 1, r = 14 + ph * 34, bob = Math.sin(now / 260) * 6;
  ctx.save();
  ctx.fillStyle = 'rgba(240,196,119,.18)'; ctx.beginPath(); ctx.ellipse(sx, sy, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `rgba(240,196,119,${(1 - ph) * .95})`; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(sx, sy, r, r * .5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#f0c477'; ctx.strokeStyle = 'rgba(20,16,8,.8)'; ctx.lineWidth = 2;
  const ay = sy - 54 + bob; ctx.beginPath(); ctx.moveTo(sx - 14, ay - 14); ctx.lineTo(sx + 14, ay - 14); ctx.lineTo(sx, ay + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
});

// ---- экран загрузки мира ----
const TUT_TIPS = ['Мертвецы идут на шум и свет.', 'Бег слышно далеко, крадущийся шаг — почти нет.', 'Свет и воду скоро отключат — запасайся.', 'Двери держат дольше окон.', 'Спать лучше в кровати и за запертой дверью.'];
function tutLoad() {
  let o = $('tutLoad'); if (o) return o;
  o = mk('div'); o.id = 'tutLoad'; o.hidden = true;
  o.innerHTML = '<div class="tl"><div class="tlt">Обучение</div><h2>Загрузка мира</h2><div class="tlb"><i></i></div><div class="tls"></div></div>';
  document.body.appendChild(o); return o;
}
function tutStart() {
  if ($('mNew') && $('mNew').disabled) return;
  SFX.ui();
  const o = tutLoad(), bar = o.querySelector('.tlb i'), tip = o.querySelector('.tls');
  o.classList.remove('out'); o.hidden = false; bar.style.width = '0%';
  const lines = ['Строю дом…', 'Ставлю забор…', 'Прячу припасы…', 'Слушаю дорогу…'];
  let p = 0, k = 0;
  const iv = setInterval(() => { p = Math.min(88, p + 6 + Math.random() * 8); bar.style.width = p + '%'; tip.textContent = lines[Math.min(lines.length - 1, Math.floor(p / 25))] + '\n' + TUT_TIPS[k++ % TUT_TIPS.length]; }, 260);
  tip.style.whiteSpace = 'pre-line'; tip.textContent = lines[0];
  setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => {
    try { tutBuild(); }
    catch (e) { clearInterval(iv); o.hidden = true; TUT.on = false; console.error(e); toast('Не удалось построить мир обучения'); return; }
    clearInterval(iv); bar.style.width = '100%'; tip.textContent = 'Готово';
    setTimeout(() => {
      o.classList.add('out'); setTimeout(() => { o.hidden = true; }, 380);
      beginPlay(); paused = true;
      tutIntro();
      clearInterval(TUT.iv); TUT.iv = setInterval(tutTick, 200);
    }, 450);
  })), 900);
}
function tutBuild() {
  TUT.on = true; TUT.dead = false; TUT.step = -1; TUT.wait = false; TUT.d = {};
  const keep = {hour:NEWCFG.hour, seed:NEWCFG.seedNum, season:NEWCFG.season, power:NEWCFG.power, water:NEWCFG.water};
  NEWCFG.hour = 10; NEWCFG.seedNum = TUT_SEED; NEWCFG.season = 'autumn'; NEWCFG.power = 30; NEWCFG.water = 30;
  try {
    const lk = Object.assign({}, look, {name:'Новичок'});
    genTutMap = true;                                                            // свой маленький двор вместо города (86-tut-map)
    runHooked('startNew', () => {
      newGame({look:lk, diff:DIFF.easy ? 'easy' : 'normal', seed:TUT_SEED});
      if (typeof applyProf === 'function') applyProf('none');
    });
  } finally { Object.assign(NEWCFG, keep); genTutMap = false; }
  zs.length = 0;                                                                 // мертвецы появятся по шагам
  P.sat = Math.max(P.sat, 50); P.hp = 100;
  // ящик дома с едой и битой — ближайшая к герою мебель, которую можно обыскать
  let best = null, bd = 1e9;
  for (const f of furns) {
    if (f.gone || !CONT[f.type] || !CONT[f.type].loot || hAt[f.y * MW + f.x] !== spawnHouse) continue;
    const d = Math.hypot(f.x + .5 - P.x, f.y + .5 - P.y); if (d > 1.2 && d < bd) { bd = d; best = f; }
  }
  if (best) { best.items = best.items || []; best.items = best.items.filter(i => i && i.id !== 'phone'); const ph = mkPhone('viktor'); ph.ch = 64; best.items.unshift(mkItem('chips'), mkItem('bat'), ph); }
  TUT.d.box = best;
  const H = houses[spawnHouse - 1]; TUT.d.door = H && H.doors && H.doors[0];
  P.inv = P.inv.filter(i => i && i.id !== 'chips' && i.id !== 'bat' && i.id !== 'phone'); if (P.weapon && P.weapon.id === 'bat') P.weapon = null;
  world.marks = [];
}

// ---- финал: смерть, «Создать мир» ----
function tutEnd() {
  clearInterval(TUT.iv); TUT.on = false; TUT.dead = true; tutHi([]);
  if (TUT.ui) TUT.ui.hidden = true;
  try { localStorage.setItem('deadline-tut', '1'); } catch (e) {}
  const D = $('dead'); if (!D) return;
  const keep = TUT.deadKeep = {stamp:D.querySelector('.stamp'), h2:D.querySelector('h2')};
  keep.stampT = keep.stamp && keep.stamp.textContent; keep.h2T = keep.h2 && keep.h2.textContent;
  keep.hid = [];
  const apply = () => {
    if (!TUT.dead) return;
    if (keep.stamp) keep.stamp.textContent = 'Обучение пройдено';
    if (keep.h2) keep.h2.textContent = 'Так заканчивается любая история';
    if (!$('tutDeadMsg')) { const msg = mk('p', '', 'В Dead Line нельзя победить — можно только продержаться дольше. Основы ты знаешь. Теперь создай свой мир: выбери героя, профессию и сложность.');
    msg.id = 'tutDeadMsg'; const facts = D.querySelector('.facts'); if (facts) facts.before(msg);
    const tips = mk('ul'); tips.id = 'tutTips';
    for (const t of ['Первый день: обыщи свой дом и соседние, пока светло.', 'Набери воды во всё, пока она течёт из крана.', 'Ночью сиди дома за закрытой дверью и не включай свет у окон.']) tips.appendChild(mk('li', '', t));
    msg.after(tips); }
    for (const e of D.querySelectorAll('.row-btns button')) if (e.id !== 'dMenu' && e.id !== 'tutCreate' && !e.hidden) { e.hidden = true; keep.hid.push(e); }   // «Новая игра», «Загрузить», «Ещё одна жизнь»…
    for (const id of ['dRec']) { const dd = $(id); if (dd) { dd.hidden = true; if (dd.previousElementSibling) dd.previousElementSibling.hidden = true; } }
    const row = D.querySelector('.row-btns');
    if (row && !$('tutCreate')) { const b = btn('Создать мир', () => { SFX.ui(); toMenu(); openCreate(); }, 'go'); b.id = 'tutCreate'; row.prepend(b); }
  };
  setTimeout(apply, 60); setTimeout(apply, 1500);                                // и после показа экрана — вдруг игра добавила свои кнопки
}
function tutCleanup() {
  clearInterval(TUT.iv); TUT.on = false; tutHi([]);
  if (TUT.ui) TUT.ui.hidden = true;
  const lo = $('tutLoad'); if (lo) lo.hidden = true;
  const ti = $('tutIntro'); if (ti) ti.hidden = true;
  if (!TUT.dead) return;
  TUT.dead = false;
  const k = TUT.deadKeep || {};
  if (k.stamp) k.stamp.textContent = k.stampT; if (k.h2) k.h2.textContent = k.h2T;
  for (const id of ['tutDeadMsg', 'tutTips', 'tutCreate']) { const e = $(id); if (e) e.remove(); }
  for (const e of k.hid || []) e.hidden = false;
  for (const id of ['dRec']) { const dd = $(id); if (dd) { dd.hidden = false; if (dd.previousElementSibling) dd.previousElementSibling.hidden = false; } }
}

// ---- обучение ничего не сохраняет и не ставит рекордов ----
{ const f = writeSave; writeSave = async function () { if (TUT.on || TUT.dead) return false; return f.apply(this, arguments); }; }
{ const f = writeRecord; writeRecord = function () { if (TUT.on) return; return f.apply(this, arguments); }; }
if (typeof ach === 'function') { const f = ach; ach = function () { if (TUT.on) return; return f.apply(this, arguments); }; }
{ const f = die; die = function () { const tut = TUT.on && mode === 'play'; const r = f.apply(this, arguments); if (tut && mode === 'dead') tutEnd(); return r; }; }
{ const f = toMenu; toMenu = function () { if (TUT.on || TUT.dead) tutCleanup(); return f.apply(this, arguments); }; }
{ const f = show; show = function (id) { if (TUT.dead && id !== 'dead') tutCleanup(); return f.apply(this, arguments); }; }
{ const f = setMenuEnabled; setMenuEnabled = function (on) { f.apply(this, arguments); if ($('mTut')) $('mTut').disabled = !on; }; }

// ---- кнопка в главном меню ----
{
  const nb = $('mNew');
  if (nb) {
    const b = mk('button', 'mbtn', 'Обучение'); b.type = 'button'; b.id = 'mTut'; b.disabled = nb.disabled;
    let done = false; try { done = localStorage.getItem('deadline-tut') === '1'; } catch (e) {}
    if (!done) b.appendChild(mk('small', '', 'для новичков'));
    b.addEventListener('click', tutStart);
    nb.after(b);
  }
}
