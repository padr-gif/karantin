// ================= обучение: свой мир, шаги с подсказками, в конце герой погибает =================
// «Обучение» в главном меню. Мир строится за экраном загрузки, дальше шаги: идти, обыскать, забрать, поесть, взять оружие,
// выйти на улицу, убить мертвеца — и толпа, от которой не уйти. После смерти — «Создать мир» (экран нового выжившего).
// Обучение ничего не пишет: ни сохранений, ни рекорда, ни достижений. «Новая игра» без обучения — как раньше.
const TUT_SEED = 20261028;
const TUT = {on:false, dead:false, step:-1, wait:false, t0:0, d:{}, iv:0, ui:null};

// ---- оформление (своё, чтобы не трогать styles.css) ----
{
  const css = `
#tutCard{position:fixed;top:calc(var(--st,0px) + 10px);left:50%;transform:translateX(-50%);z-index:40;width:min(460px,calc(100% - 24px));
  background:rgba(16,20,22,.94);border:1px solid rgba(240,196,119,.45);border-radius:8px;padding:12px 14px 12px;color:#e9e3d6;
  box-shadow:0 8px 24px rgba(0,0,0,.45);font:15px/1.35 system-ui,sans-serif;display:grid;gap:6px;transition:opacity .25s}
#tutCard[hidden]{display:none}
#tutCard .tst{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#f0c477}
#tutCard h3{margin:0;font-size:17px;font-weight:700;color:#fff}
#tutCard p{margin:0;color:#cfc8b8}
#tutCard .trow{display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:4px}
#tutCard button{min-height:40px;padding:8px 14px;border-radius:5px;font:600 14px system-ui,sans-serif;cursor:pointer}
#tutCard .tgo{background:#f0c477;color:#1a1408;border:0}
#tutCard .tskip{background:transparent;color:#a9a294;border:1px solid rgba(233,227,214,.25)}
#tutCard.ok{border-color:#9fd58a}
#tutCard.ok .tst{color:#9fd58a}
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
#tutDeadMsg{margin:0;color:#cfc8b8;line-height:1.45}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
}

// ---- что считается «дома», где ящик, есть ли вещь ----
const tutTile = (x, y) => Math.floor(y) * MW + Math.floor(x);
const tutHome = () => P && spawnHouse && hAt[tutTile(P.x, P.y)] === spawnHouse;
const tutHas = id => P && (P.inv.some(i => i && i.id === id) || (P.weapon && P.weapon.id === id));
const tutCount = id => P ? P.inv.filter(i => i && i.id === id).length : 0;
function tutZombie(dmin, dmax, hp, spd) {
  for (let k = 0; k < 80; k++) {
    const a = Math.random() * 6.283, d = dmin + Math.random() * (dmax - dmin), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
    const tx = Math.floor(x), ty = Math.floor(y);
    if (tx < 2 || ty < 2 || tx >= MW - 2 || ty >= MH - 2 || navBlocked(tx, ty) || hAt[ty * MW + tx] === spawnHouse) continue;
    const z = mkZombie(tx + .5, ty + .5, {pi:Math.floor(Math.random() * 10), b:Math.random() < .4 ? 'f' : 'm', blood:Math.floor(Math.random() * 2)}, hp, spd);
    z.crawl = false; z.tut = true; z.state = 'chase'; z.lost = 0; z.aw = 0; z.tx = P.x; z.ty = P.y;
    return z;
  }
  return null;
}

// ---- шаги ----
const TUT_STEPS = [
  {title:'Иди', text:() => isTouch ? 'Левая половина экрана — джойстик: прижми палец и веди туда, куда идти.' : 'WASD или стрелки — идти. Shift — бежать, C — красться.',
   enter() { TUT.d.sx = P.x; TUT.d.sy = P.y; },
   check:() => Math.hypot(P.x - TUT.d.sx, P.y - TUT.d.sy) > 2.5},
  {title:'Обыщи мебель', text:() => 'Подойди к отмеченной мебели и нажми кнопку действия справа внизу' + (isTouch ? '' : ' (или E)') + '. Так обыскиваются шкафы, холодильники, машины.',
   hi:['bAct'], target:() => TUT.d.box && [TUT.d.box.x + .5, TUT.d.box.y + .5],
   check:() => panel && panel.kind === 'loot'},
  {title:'Забери находки', text:() => 'Перенеси в рюкзак чипсы и биту: нажми на вещь, потом «Взять». Двойной тап переносит сразу.',
   target:() => TUT.d.box && [TUT.d.box.x + .5, TUT.d.box.y + .5],
   check:() => tutHas('bat') && (tutHas('chips') || !((TUT.d.box && TUT.d.box.items) || []).some(i => i && i.id === 'chips'))},
  {title:'Поешь', text:() => 'Голод — значок слева вверху. Закрой ящик, открой рюкзак' + (isTouch ? '' : ' (I)') + ', выбери чипсы и нажми «Съесть». Еда и вода — первое, о чём думать.',
   hi:['bInv'], enter() { P.sat = Math.min(P.sat, 28); TUT.d.sat = P.sat; TUT.d.chips = tutCount('chips'); },
   check:() => !TUT.d.chips || tutCount('chips') < TUT.d.chips || P.sat > TUT.d.sat + 6},
  {title:'Возьми биту в руки', text:() => 'В рюкзаке выбери биту и нажми «Взять в руки». Голыми руками от мертвеца не отбиться.',
   hi:['bInv'], check:() => P.weapon && P.weapon.id === 'bat'},
  {title:'Выйди на улицу', text:() => 'Подойди к двери — она открывается той же кнопкой действия. Сейчас день и тихо — самое время.',
   hi:['bAct'], target:() => TUT.d.door && [TUT.d.door.x + .5, TUT.d.door.y + .5],
   check:() => !tutHome() && !panel},
  {title:'Убей мертвеца', text:() => 'Он заметил тебя и идёт. Бей кнопкой «Удар»' + (isTouch ? ' или тапом справа' : ' — мышь или Пробел') + '. Ударил — отступи, дождись, пока подойдёт, и снова.',
   hi:['bAtk'], enter() { TUT.d.k0 = kills; TUT.d.z = tutZombie(6, 8, 40, .72); },
   target:() => TUT.d.z && zs.includes(TUT.d.z) && [TUT.d.z.x, TUT.d.z.y],
   tick() { if (!TUT.d.z || !zs.includes(TUT.d.z)) { if (kills <= TUT.d.k0) TUT.d.z = tutZombie(6, 8, 40, .72); } },
   check:() => kills > TUT.d.k0},
  {title:'Шум привлёк остальных', text:() => 'Их слишком много, и они со всех сторон. Бей, отступай, ищи проход — держись, сколько сможешь. В этом городе так заканчивается любая история.',
   enter() { TUT.t0 = performance.now(); for (let k = 0; k < 24; k++) tutZombie(6, 12, 55, .85 + Math.random() * .2); SFX.scream && SFX.scream(); },
   tick() {
     const s = (performance.now() - TUT.t0) / 1000, mine = zs.filter(z => z.tut);
     if (mine.length < 14) for (let k = 0; k < 4; k++) tutZombie(7, 11, 55, 1);                          // толпа не кончается
     for (const z of mine) { z.state = 'chase'; z.lost = 0; if (s > 25 && !z.fastT) { z.spd *= 1.35; z.fastT = 1; } }
     if (s > 55) { P.hp -= 1.6; lastCause = 'Не продержался против толпы'; }                              // финал не тянется вечно
   }},
];

// ---- карточка с заданием ----
function tutCard() {
  if (TUT.ui) return TUT.ui;
  const c = mk('div'); c.id = 'tutCard'; c.hidden = true; c.setAttribute('role', 'status'); c.setAttribute('aria-live', 'polite');
  c.innerHTML = '<div class="tst"></div><h3></h3><p></p><div class="trow"><button type="button" class="tskip">Выйти из обучения</button><button type="button" class="tgo" hidden>Начать</button></div>';
  c.querySelector('.tskip').addEventListener('click', () => { SFX.ui(); toMenu(); });
  c.querySelector('.tgo').addEventListener('click', () => { SFX.ui(); c.querySelector('.tgo').hidden = true; paused = false; tutGo(0); });
  document.body.appendChild(c); return (TUT.ui = c);
}
function tutSay(stamp, title, text, go) {
  const c = tutCard(); c.hidden = false; c.classList.remove('ok');
  c.querySelector('.tst').textContent = stamp; c.querySelector('h3').textContent = title; c.querySelector('p').textContent = text;
  const g = c.querySelector('.tgo'); g.hidden = !go; if (go) g.textContent = go;
}
function tutHi(ids) {
  for (const e of document.querySelectorAll('.tutHi')) e.classList.remove('tutHi');
  for (const id of ids || []) { const e = $(id); if (e) e.classList.add('tutHi'); }
}
function tutGo(i) {
  TUT.step = i; TUT.wait = false;
  const st = TUT_STEPS[i]; if (!st) return;
  if (st.enter) st.enter();
  tutSay('Обучение · шаг ' + (i + 1) + ' из ' + TUT_STEPS.length, st.title, st.text(), null);
  tutHi(st.hi);
  if (i === TUT_STEPS.length - 1) { tutHi([]); buzzTut([60, 60, 120]); }
}
const buzzTut = p => { try { settings.vib !== false && navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
function tutDone() {
  const c = tutCard(); c.classList.add('ok'); c.querySelector('.tst').textContent = 'Готово';
  SFX.select && SFX.select(); buzzTut(15);
  setTimeout(() => { if (TUT.on) tutGo(TUT.step + 1); }, 900);
}
function tutTick() {
  if (!TUT.on || mode !== 'play') return;
  for (let i = zs.length - 1; i >= 0; i--) if (!zs[i].tut) zs.splice(i, 1);      // в обучении только свои мертвецы
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
  const lines = ['Строю город…', 'Расставляю мебель…', 'Прячу припасы…', 'Выпускаю мертвецов…'];
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
      tutSay('Обучение', 'Добро пожаловать в Dead Line', 'Город закрыт, на улицах мертвецы, помощи не будет. Покажу самое нужное: как ходить, обыскивать, есть и драться. Это займёт пару минут.', 'Начать');
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
    runHooked('startNew', () => {
      newGame({look:lk, diff:DIFF.easy ? 'easy' : 'normal', seed:TUT_SEED});
      if (typeof applyProf === 'function') applyProf('none');
    });
  } finally { Object.assign(NEWCFG, keep); }
  zs.length = 0;                                                                 // мертвецы появятся по шагам
  P.sat = Math.max(P.sat, 50); P.hp = 100;
  // ящик дома с едой и битой — ближайшая к герою мебель, которую можно обыскать
  let best = null, bd = 1e9;
  for (const f of furns) {
    if (f.gone || !CONT[f.type] || !CONT[f.type].loot || hAt[f.y * MW + f.x] !== spawnHouse) continue;
    const d = Math.hypot(f.x + .5 - P.x, f.y + .5 - P.y); if (d > 1.2 && d < bd) { bd = d; best = f; }
  }
  if (best) { best.items = best.items || []; best.items.unshift(mkItem('chips'), mkItem('bat')); }
  TUT.d.box = best;
  const H = houses[spawnHouse - 1]; TUT.d.door = H && H.doors && H.doors[0];
  P.inv = P.inv.filter(i => i && i.id !== 'chips' && i.id !== 'bat'); if (P.weapon && P.weapon.id === 'bat') P.weapon = null;
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
    msg.id = 'tutDeadMsg'; const facts = D.querySelector('.facts'); if (facts) facts.before(msg); }
    for (const e of D.querySelectorAll('.row-btns button')) if (e.id !== 'dMenu' && e.id !== 'tutCreate' && !e.hidden) { e.hidden = true; keep.hid.push(e); }   // «Новая игра», «Загрузить», «Ещё одна жизнь»…
    for (const id of ['dRec', 'dLast']) { const dd = $(id); if (dd) { dd.hidden = true; if (dd.previousElementSibling) dd.previousElementSibling.hidden = true; } }
    const row = D.querySelector('.row-btns');
    if (row && !$('tutCreate')) { const b = btn('Создать мир', () => { SFX.ui(); toMenu(); openCreate(); }, 'go'); b.id = 'tutCreate'; row.prepend(b); }
  };
  setTimeout(apply, 60); setTimeout(apply, 1500);                                // и после показа экрана — вдруг игра добавила свои кнопки
}
function tutCleanup() {
  clearInterval(TUT.iv); TUT.on = false; tutHi([]);
  if (TUT.ui) TUT.ui.hidden = true;
  const lo = $('tutLoad'); if (lo) lo.hidden = true;
  if (!TUT.dead) return;
  TUT.dead = false;
  const k = TUT.deadKeep || {};
  if (k.stamp) k.stamp.textContent = k.stampT; if (k.h2) k.h2.textContent = k.h2T;
  for (const id of ['tutDeadMsg', 'tutCreate']) { const e = $(id); if (e) e.remove(); }
  for (const e of k.hid || []) e.hidden = false;
  for (const id of ['dRec', 'dLast']) { const dd = $(id); if (dd) { dd.hidden = false; if (dd.previousElementSibling) dd.previousElementSibling.hidden = false; } }
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
