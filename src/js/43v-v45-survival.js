// ================= v45: задания дня с наградами и серией, бездомный пёс-компаньон, надёжность убежища =================

// ---- счётчики законченных дел: что бы ни делал герой, доделанное считается (для заданий) ----
{ let lastA = null;
  const up = update;
  update = function (dt) {
    const A0 = P && P.act;
    up(dt);
    if (!P) return;
    if (lastA && P.act !== lastA && lastA.t >= (lastA.dur || 0) - .06) {
      const k = lastA.kind; stat('f_' + k);
      if (k === 'use' && lastA.it && ITEMS[lastA.it.id]) { const d = ITEMS[lastA.it.id]; if (d.kind === 'food') stat('f_eat'); if (d.kind === 'drink' || d.kind === 'canteen') stat('f_drink'); if (d.warm) stat('f_warm'); }
      if (k === 'cookx' || k === 'cook') stat('f_cookany');
    }
    lastA = P.act || null; void A0;
  };
}

// ---- задания дня: три небольших дела, за каждое — награда, за все три — подарок и серия дней ----
const TASKS = [
  {k:'kill', t:n => `Упокой мертвецов: ${n}`, n:[3, 7], c:() => kills, xp:'fight'},
  {k:'search', t:n => `Обыщи мебель или машины: ${n}`, n:[6, 12], c:() => (P.stats.f_search || 0), xp:null},
  {k:'forage', t:n => `Собери в лесу или саду: ${n}`, n:[2, 4], c:() => (P.stats.f_forage || 0), xp:'farm'},
  {k:'cook', t:n => n > 1 ? `Приготовь еду: ${n} раза` : 'Приготовь еду', n:[1, 2], c:() => (P.stats.f_cookany || 0), xp:'cook'},
  {k:'bar', t:n => n > 1 ? `Заколоти окна или двери: ${n}` : 'Заколоти окно или дверь', n:[1, 2], c:() => (P.stats.f_bar || 0), xp:'carp'},
  {k:'walk', t:n => `Пройди пешком ${n} м`, n:[300, 600], c:() => Math.floor((P.walk || 0) / 5.2), xp:'fit', step:50},
  {k:'warm', t:() => 'Поешь горячего', n:[1, 1], c:() => (P.stats.f_warm || 0), xp:'cook'},
  {k:'drink', t:n => `Попей воды: ${n} раза`, n:[2, 3], c:() => (P.stats.f_drink || 0), xp:null},
  {k:'sneak', t:() => 'Убей мертвеца со спины', n:[1, 1], c:() => (P.stats.sneakk || 0), xp:'fight'},
  {k:'workout', t:() => 'Сделай зарядку', n:[1, 1], c:() => (P.stats.workout || 0), xp:'fit'},
];
const TASK_GIFT = ['canned', 'bandage', 'battery', 'water', 'matches', 'choco', 'vitamins', 'painkill', 'mre', 'tape', 'nails', 'stew', 'antisep', 'candle', 'crackers'];
const TASK_BIG = ['medkit', 'antibio', 'ammo9', 'flashlight', 'bag', 'binoculars', 'canteen', 'sewkit', 'thermos', 'molotov'];
const dayNo = () => Math.floor(gameMin / 1440);
function tasksToday() {
  if (!P) return null; P.stats = P.stats || {};
  let T = P.tasks;
  if (!T || T.day !== dayNo()) {
    const prev = T, pool = TASKS.slice(), list = [];
    if (prev && prev.day === dayNo() - 1 && prev.list.every(t => t.claimed)) T = {streak:(prev.streak || 0)};
    else T = {streak:0};
    for (let q = 0; q < 3 && pool.length; q++) {
      const k = Math.floor(rng() * pool.length), d = pool.splice(k, 1)[0];
      let n = ri(d.n[0], d.n[1]); if (d.step) n = Math.round(n / d.step) * d.step;
      list.push({k:d.k, n, base:d.c(), claimed:false});
    }
    Object.assign(T, {day:dayNo(), list, bonus:false}); P.tasks = T; taskChip();
  }
  return T;
}
const taskDef = t => TASKS.find(d => d.k === t.k);
const taskProg = t => Math.max(0, Math.min(t.n, taskDef(t).c() - t.base));
function claimTask(t) {
  if (t.claimed || taskProg(t) < t.n) return;
  t.claimed = true; const d = taskDef(t), T = P.tasks;
  if (d.xp && SKILLS[d.xp]) addXp(d.xp, 3);
  const it = mkItem(pick(TASK_GIFT)); giveItem(it);
  SFX.equip(); toast('Награда: ' + ITEMS[it.id].name.toLowerCase() + (d.xp && SKILLS[d.xp] ? ' и опыт «' + SKILLS[d.xp].name + '»' : ''));
  if (T.list.every(x => x.claimed) && !T.bonus) {
    T.bonus = true; T.streak = (T.streak || 0) + 1;
    const n = Math.min(3, 1 + Math.floor(T.streak / 3)), got = [];
    for (let q = 0; q < n; q++) { const b = mkItem(pick(TASK_BIG)); giveItem(b); got.push(ITEMS[b.id].name.toLowerCase()); }
    eventBanner('День закрыт · серия ' + T.streak, 'Подарок: ' + got.join(', ') + (T.streak >= 3 ? '. Чем длиннее серия — тем больше подарков' : '. Не прерывай серию — завтра будет больше'), 'gold', 'i-star');
    logEv('Все задания дня выполнены (серия ' + T.streak + ')');
  }
  taskChip(); renderPanel(); updateHud();
}
function taskChip() {
  let c = $('taskChip');
  if (!c) {
    c = document.createElement('button'); c.type = 'button'; c.id = 'taskChip';
    c.onclick = () => { if (mode !== 'play') return; SFX.ui(); openPanel('inv'); if (panel) { panel.tab = 'tasks'; renderPanel(); } };
    const L = document.querySelector('#hud .left'); if (L) L.insertBefore(c, $('moodles')); else return;
  }
  const T = P && P.tasks; if (!T) { c.hidden = true; return; }
  const done = T.list.filter(t => t.claimed).length, ready = T.list.some(t => !t.claimed && taskProg(t) >= t.n);
  c.hidden = mode !== 'play'; c.classList.toggle('ready', ready); c.classList.toggle('all', done === T.list.length);
  c.innerHTML = '<svg class="ic"><use href="#i-star"/></svg><span>' + (ready ? 'Забрать награду' : done === T.list.length ? 'День закрыт' : 'Задания ' + done + '/' + T.list.length) + '</span>' + (T.streak ? '<small>серия ' + T.streak + '</small>' : '');
}
function buildTasks(body) {
  const T = tasksToday(); body.textContent = '';
  const w = mk('div', 'tasks');
  const hd = mk('div', 'thead'); hd.appendChild(mk('b', '', 'Задания на день ' + (dayNo() - Math.floor(startMin / 1440) + 1)));
  hd.appendChild(mk('span', '', T.streak ? 'Серия: ' + T.streak + ' ' + (T.streak === 1 ? 'день' : T.streak < 5 ? 'дня' : 'дней') + ' подряд' : 'Выполни все три — получишь подарок и начнёшь серию'));
  w.appendChild(hd);
  for (const t of T.list) {
    const d = taskDef(t), p = taskProg(t), ok = p >= t.n;
    const r = mk('div', 'task' + (t.claimed ? ' got' : ok ? ' ok' : ''));
    const tx = mk('div', 'tt'); tx.appendChild(mk('b', '', d.t(t.n)));
    tx.appendChild(mk('small', '', (d.xp && SKILLS[d.xp] ? 'опыт «' + SKILLS[d.xp].name + '» + ' : '') + 'полезная находка'));
    const bar = mk('div', 'tbar'), i = mk('i'); i.style.width = Math.round(p / t.n * 100) + '%'; bar.appendChild(i); tx.appendChild(bar);
    r.appendChild(tx);
    if (t.claimed) r.appendChild(mk('span', 'tdone', '✓ Получено'));
    else if (ok) r.appendChild(btn('Забрать', () => claimTask(t)));
    else r.appendChild(mk('span', 'tnum', p + ' / ' + t.n));
    w.appendChild(r);
  }
  const ft = mk('p', 'tfoot', 'Новые задания — каждое утро в 00:00 по игровым часам. Серия растёт, если закрывать все три каждый день: с третьего дня подарков больше.');
  w.appendChild(ft); body.appendChild(w);
}
{ const rp = renderPanel;
  renderPanel = function () {
    rp();
    if (!panel || panel.kind !== 'inv') return;
    const tabs = $('pnTabs');
    if (tabs && !tabs.querySelector('.ttab')) {
      const b = btn('Задания', () => { panel.tab = 'tasks'; renderPanel(); }, panel.tab === 'tasks' ? 'on' : ''); b.classList.add('ttab');
      const T = P.tasks; if (T && T.list.some(t => !t.claimed && taskProg(t) >= t.n)) b.classList.add('dot');
      tabs.appendChild(b);
    }
    if (panel.tab === 'tasks') { const body = $('pnBody'); body.classList.remove('fit'); buildTasks(body); for (const b of tabs.querySelectorAll('button')) b.classList.toggle('on', b.classList.contains('ttab')); }
  };
}
{ let tc = 0;
  const up = update;
  update = function (dt) { up(dt); if (mode !== 'play' || !P) return; tc += dt; if (tc > .5) { tc = 0; const T = tasksToday(); const was = $('taskChip') && $('taskChip').classList.contains('ready'); taskChip(); const now = $('taskChip') && $('taskChip').classList.contains('ready'); if (now && !was && T) toast('Задание выполнено — забери награду'); } };
}

// ---- надёжность убежища: заколоченные/закрытые окна со шторами, закрытые двери, кровать, свет не виден с улицы ----
function houseAt(x, y) { const hi = hAt[Math.floor(y) * MW + Math.floor(x)]; return hi ? houses[hi - 1] : null; }
function shelterScore(Hs) {
  if (!Hs || Hs.kind === 'shed') return null;
  let w = 0, ws = 0, d = 0, ds = 0, leak = false;
  const night = lightLevel() < .5;
  for (let y = Hs.y; y < Hs.y + Hs.h; y++) for (let x = Hs.x; x < Hs.x + Hs.w; x++) {
    if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
    const i = y * MW + x, t = map[i], o = obs[i]; if (!o || (t !== WIN && t !== DOOR)) continue;
    if (hAt[i] && hAt[i] !== houses.indexOf(Hs) + 1) continue;
    if (t === WIN) { w++; if (o.bhp > 0 || (!o.open && !o.broken && (o.cc || o.mhp > 0))) ws++; else if (!o.open && !o.broken) ws += .5;
      if (night && !o.cc && !(o.bhp > 0) && winLit(x, y) && poweredAt(x, y)) leak = true; }
    else { d++; if (o.bhp > 0 || o.mhp > 0) ds++; else if (!o.open) ds += .6; }
  }
  const bed = furns.some(f => !f.gone && (f.type === 'bed' || f.type === 'sofa') && houseAt(f.cx, f.cy) === Hs);
  const s = .45 * (w ? ws / w : 1) + .3 * (d ? ds / d : 1) + .15 * (bed ? 1 : 0) + .1 * (leak ? 0 : 1);
  return {stars:Math.max(0, Math.min(5, Math.round(s * 5))), w, ws, d, ds, bed, leak};
}
const starStr = n => '★'.repeat(n) + '☆'.repeat(5 - n);
{ const wm = woundMoodles;
  woundMoodles = function () {
    const m = wm();
    if (mode === 'play' && P && !P.car) { const Hs = houseAt(P.x, P.y), s = Hs && insideHouse(P.x, P.y) ? shelterScore(Hs) : null; if (s) m.push(['Убежище ' + starStr(s.stars), s.stars >= 4 ? 'good' : s.stars <= 1 ? 'warn' : '']); }
    return m;
  };
}
// сон в надёжном убежище — спокойнее и полезнее; в дырявом — тревожно
{ let acc = 0, msg = false;
  const up = update;
  update = function (dt) {
    up(dt);
    if (!P || mode !== 'play') return;
    if (!P.sleep) { if (msg && P._shStars != null) { const n = P._shStars; if (n >= 4) toast('Выспался в надёжном убежище: на душе спокойнее'); else if (n <= 1) toast('Спал вполуха: дом дырявый, каждый шорох будил'); } msg = false; P._shStars = null; return; }
    acc += dt; if (acc < 1) return; acc = 0;
    const s = insideHouse(P.x, P.y) ? shelterScore(houseAt(P.x, P.y)) : null, n = s ? s.stars : 0;
    P._shStars = n; msg = true;
    if (n >= 4) { P.stress = Math.max(0, (P.stress || 0) - .6); P.unh = Math.max(0, (P.unh || 0) - .25); P.en = Math.min(100, P.en + .15); }
    else if (n <= 1) P.stress = Math.min(100, (P.stress || 0) + .25);
  };
}
function shelterTips(s) {
  const t = [];
  if (s.w && s.ws < s.w) t.push(`окна: защищено ${Math.floor(s.ws)} из ${s.w} — заколоти или закрой и задёрни шторы`);
  if (s.d && s.ds < s.d) t.push('двери: закрой или заколоти');
  if (!s.bed) t.push('нет кровати или дивана');
  if (s.leak) t.push('свет в окнах виден с улицы');
  return t;
}
{ const bs = buildSelf;
  buildSelf = function (body) {
    bs(body);
    const Hs = P && houseAt(P.x, P.y), s = Hs && insideHouse(P.x, P.y) ? shelterScore(Hs) : null;
    const box = mk('div', 'shelter');
    box.appendChild(mk('div', 'sect', 'Убежище'));
    if (!s) box.appendChild(mk('p', 'empty', 'Ты не в доме. Найди дом, заколоти окна, закрой двери — и спи спокойно.'));
    else {
      box.appendChild(mk('b', 'stars', starStr(s.stars)));
      const tips = shelterTips(s);
      box.appendChild(mk('p', '', tips.length ? 'Чтобы стало надёжнее: ' + tips.join('; ') + '.' : 'Надёжное убежище. Сон здесь снимает стресс и лучше восстанавливает силы.'));
    }
    body.appendChild(box);
  };
}

// ---- бездомный пёс: прикорми — станет другом, будет рычать на мертвецов и кусать их; корми раз в день ----
const DOG_NAMES = ['Шарик', 'Рекс', 'Бим', 'Найда', 'Тузик', 'Жучка', 'Барон', 'Лайка'];
const DOG_FOOD = new Set(['meat', 'steak', 'sausage', 'stew', 'stewH', 'jerky', 'fish', 'fishC', 'salo', 'tuna', 'sprats', 'pelmeniC', 'bread', 'crackers']);
let dog = null;
function spawnDog() {
  for (let t = 0; t < 400; t++) {
    const a = rng() * 6.283, r = 12 + rng() * 18, x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
    const i = Math.floor(y) * MW + Math.floor(x);
    if (x < FEN + 2 || y < FEN + 2 || x > MW - FEN - 3 || y > MH - FEN - 3 || hAt[i] || blocked(x, y, .3)) continue;
    dog = {x, y, face:0, st:'stray', trust:0, fedAt:-1e9, bite:0, petT:-1e9, name:pick(DOG_NAMES), wx:x, wy:y, mv:0, step:0, warn:0};
    return;
  }
}
function dogMove(tx, ty, sp, dt) {
  const dx = tx - dog.x, dy = ty - dog.y, l = Math.hypot(dx, dy); if (l < .05) { dog.mv = 0; return; }
  const s = Math.min(l, sp * dt), mx = dx / l * s, my = dy / l * s;
  if (!blocked(dog.x + mx, dog.y, .22)) dog.x += mx; if (!blocked(dog.x, dog.y + my, .22)) dog.y += my;
  dog.face = Math.atan2(dy, dx); dog.mv = s / dt; dog.step += s * 9;
}
{ const up = update;
  update = function (dt) {
    up(dt);
    if (mode !== 'play' || !P || paused) return;
    if (!dog) { spawnDog(); if (!dog) return; }
    const dP = Math.hypot(dog.x - P.x, dog.y - P.y);
    if (dog.st === 'stray') {
      if (dP < 3.2 && !dog.trust) dogMove(dog.x + (dog.x - P.x), dog.y + (dog.y - P.y), 1.6, dt);   // пугливый: держится подальше
      else { if (Math.hypot(dog.wx - dog.x, dog.wy - dog.y) < .3 || rng() < dt * .05) { const a = rng() * 6.283; dog.wx = dog.x + Math.cos(a) * 3; dog.wy = dog.y + Math.sin(a) * 3; } dogMove(dog.wx, dog.wy, .7, dt); }
      return;
    }
    // друг: идёт рядом, если отстал — догоняет; если потерялся из виду — прибегает
    const near = zs.filter(z => z.hp > 0 && Math.hypot(z.x - dog.x, z.y - dog.y) < 8).sort((a, b) => Math.hypot(a.x - dog.x, a.y - dog.y) - Math.hypot(b.x - dog.x, b.y - dog.y))[0];
    if (near && Math.hypot(near.x - P.x, near.y - P.y) < 9) {
      dog.warn = Math.max(dog.warn, .6);
      if (!dog._told) { dog._told = true; toast(dog.name + ' рычит: рядом мертвец'); }
      const dz = Math.hypot(near.x - dog.x, near.y - dog.y);
      if (dz > 1) dogMove(near.x, near.y, 3.4, dt);
      else { dog.face = Math.atan2(near.y - dog.y, near.x - dog.x); dog.bite -= dt; if (dog.bite <= 0) { dog.bite = 1.4; hitZombie(near, 7, dog.face, .5); near.stun = Math.max(near.stun || 0, .9); } }
    } else if (dP > 16 || (dP > 7 && !vis[Math.floor(dog.y) * MW + Math.floor(dog.x)])) {
      const a = P.face + Math.PI + (rng() - .5); dog.x = P.x + Math.cos(a) * 1.2; dog.y = P.y + Math.sin(a) * 1.2; if (blocked(dog.x, dog.y, .22)) { dog.x = P.x; dog.y = P.y; }
    } else if (dP > 1.8) dogMove(P.x, P.y, P.running ? 4.6 : 3, dt);
    else dog.mv = 0;
    dog.warn = Math.max(0, dog.warn - dt * .5);
    // голод: не кормил больше суток — обижается и уходит
    if (gameMin - dog.fedAt > 1440 * 1.5) { dog.st = 'stray'; dog.trust = 0; toast(dog.name + ' ушёл искать еду. Прикорми снова, если встретишь'); }
  };
}
{ const ga = getActions;
  getActions = function () {
    const out = ga();
    if (dog && mode === 'play' && Math.hypot(dog.x - P.x, dog.y - P.y) < 2.6) {
      const food = P.inv.find(it => DOG_FOOD.has(it.id));
      if (dog.st === 'stray') out.push({kind:'dogfeed', label:food ? 'Подманить едой' : 'Нужно мясо или хлеб', f:{type:'dog', cx:dog.x, cy:dog.y}, food});
      else {
        if (gameMin - dog.fedAt > 600 && food) out.push({kind:'dogfeed', label:'Покормить', f:{type:'dog', cx:dog.x, cy:dog.y}, food});
        out.push({kind:'dogpet', label:'Погладить', f:{type:'dog', cx:dog.x, cy:dog.y}});
      }
    }
    return out;
  };
  const da = doAction;
  doAction = function (a0) {
    if (!(a0 && (a0.kind === 'dogfeed' || a0.kind === 'dogpet'))) return da(a0);
    if (mode !== 'play' || paused || panel || P.sleep || !dog) return;
    $('actMenu').hidden = true;
    if (a0.kind === 'dogpet') {
      if (gameMin - dog.petT < 120) { toast(dog.name + ' виляет хвостом'); return; }
      dog.petT = gameMin; P.stress = Math.max(0, (P.stress || 0) - 15); P.unh = Math.max(0, (P.unh || 0) - 10); SFX.rustle(); toast('Погладил ' + dog.name + '. Стало спокойнее'); return;
    }
    const k = P.inv.findIndex(it => DOG_FOOD.has(it.id)); if (k < 0) { toast('Пёс ест мясо, рыбу, колбасу или хлеб'); return; }
    P.inv.splice(k, 1); dog.fedAt = gameMin; SFX.rustle();
    if (dog.st === 'stray') {
      dog.trust++;
      if (dog.trust >= 2) { dog.st = 'friend'; ach('dog'); eventBanner('Новый друг', dog.name + ' теперь с тобой: рычит на мертвецов и кусает их. Корми раз в день.', 'gold', 'i-heart'); logEv('Приручил пса ' + dog.name); }
      else toast('Пёс съел и подошёл ближе. Ещё раз — и он твой');
    } else toast(dog.name + ' доволен');
    renderInv();
  };
  const an = actName; actName = function (a) { return a && a.f && a.f.type === 'dog' ? (dog && dog.st === 'friend' ? dog.name : 'Бездомный пёс') : an(a); };
  const ai = actIcon; actIcon = function (a) { return a && (a.kind === 'dogfeed' || a.kind === 'dogpet') ? 'i-heart' : ai(a); };
}
ACH.push(['dog', 'Лучший друг', 'Приручить бездомного пса']);
// пиксельный пёс: 4 кадра (стоит, 2 шага, сидит), бок; смотрит влево или вправо
// пиксельный пёс: рисуем фигурами, потом «пикселизуем» (жёсткая альфа) и обводим, как остальной пиксель-арт
const DOGC = {o:'#1b1512', f:'#8a5a32', d:'#5e3a1e', l:'#c89a6a', e:'#140f0c', n:'#2a1e18', h:'#a8744a'};
const dogArt = col => [0, 1, 2, 3].map(fr => {
  const W = 42, H = 30, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const el = (x, y, rx, ry, c, r) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, r || 0, 0, 6.283); g.fill(); };
  const ln = (x0, y0, x1, y1, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const sit = fr === 3, sw = fr === 1 ? 2.5 : fr === 2 ? -2.5 : 0;
  if (!sit) {
    ln(9, 13, 4, 6, 2.6, DOGC.f); ln(4, 6, 5, 3, 2.2, DOGC.f);                          // хвост бубликом
    for (const [x, s2] of [[11, -sw], [15, sw], [26, sw], [30, -sw]]) { ln(x, 18, x + s2, 26, 3.2, x === 15 || x === 30 ? DOGC.d : DOGC.f); ln(x + s2 - .5, 26.5, x + s2 + 1.2, 26.5, 2, DOGC.n); }
    el(20, 15, 11, 5.2, DOGC.f); el(28, 13.5, 5, 5.3, DOGC.f);                         // туловище и грудь
    el(20, 12.2, 9, 2, DOGC.h); el(20, 18.6, 8, 1.8, DOGC.l);                           // спина светлее, живот — светлый
    g.fillStyle = col; g.fillRect(29, 8, 3, 6);                                          // ошейник
    el(33, 7.5, 4.6, 4.3, DOGC.f); el(37.5, 9.4, 3.6, 2.3, DOGC.l); el(40.2, 8.6, 1.3, 1.2, DOGC.n);
    g.fillStyle = DOGC.d; g.beginPath(); g.moveTo(30, 5); g.lineTo(32, 0); g.lineTo(34, 4.5); g.fill();
    g.fillStyle = DOGC.e; g.fillRect(34, 6, 1.6, 1.6);
  } else {
    ln(8, 24, 3, 22, 2.6, DOGC.f);
    el(17, 19, 9, 5.6, DOGC.f, -.55); el(13, 24, 6, 3.4, DOGC.d);                      // сидит: спина наклонена, задние лапы поджаты
    for (const x of [22, 26]) { ln(x, 17, x, 26, 3.2, x === 26 ? DOGC.d : DOGC.f); ln(x - .5, 26.5, x + 1.5, 26.5, 2, DOGC.n); }
    el(23, 15, 5, 5.5, DOGC.f); el(22, 18, 3, 3.5, DOGC.l);
    g.fillStyle = col; g.fillRect(24, 7, 3, 6);
    el(28, 6.3, 4.6, 4.3, DOGC.f); el(32.5, 8.2, 3.6, 2.3, DOGC.l); el(35.2, 7.4, 1.3, 1.2, DOGC.n);
    g.fillStyle = DOGC.d; g.beginPath(); g.moveTo(25, 4); g.lineTo(27, -1); g.lineTo(29, 3.5); g.fill();
    g.fillStyle = DOGC.e; g.fillRect(29, 5, 1.6, 1.6);
  }
  const im = g.getImageData(0, 0, W, H), a = im.data, on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && a[(y * W + x) * 4 + 3] > 110;
  const mask = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) mask[y * W + x] = on(x, y) ? 1 : 0;
  for (let k = 0; k < W * H; k++) { if (mask[k]) a[k * 4 + 3] = 255; else a[k * 4 + 3] = 0; }
  const O = [27, 21, 18];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (mask[y * W + x]) continue;
    const nb = (x > 0 && mask[y * W + x - 1]) || (x < W - 1 && mask[y * W + x + 1]) || (y > 0 && mask[(y - 1) * W + x]) || (y < H - 1 && mask[(y + 1) * W + x]);
    if (nb) { const k = (y * W + x) * 4; a[k] = O[0]; a[k + 1] = O[1]; a[k + 2] = O[2]; a[k + 3] = 255; }
  }
  g.putImageData(im, 0, 0); return cv;
});
const DOG_ART = {friend:dogArt('#b8322a'), stray:dogArt(DOGC.f)};                  // у своего — красный ошейник
function drawDog() {
  if (!dog) return;
  const i = Math.floor(dog.y) * MW + Math.floor(dog.x); if (!vis[i]) return;
  const sx = Math.round(SX(dog.x, dog.y)), sy = Math.round(SY(dog.x, dog.y, 0));
  const A = DOG_ART[dog.st === 'friend' ? 'friend' : 'stray'], fr = dog.mv > .2 ? A[1 + (Math.floor(dog.step) & 1)] : dog.st === 'friend' && !dog.warn ? A[3] : A[0];
  const left = Math.cos(dog.face) - Math.sin(dog.face) < 0;                // на экране — влево
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(sx, sy, 15, 4, 0, 0, 6.283); ctx.fill();
  ctx.save(); ctx.translate(sx, sy - fr.height + 3); if (left) { ctx.scale(-1, 1); } ctx.drawImage(fr, -Math.floor(fr.width / 2), 0); ctx.restore();
  if (dog.st === 'friend' && dog.warn > .1) { ctx.fillStyle = '#e8c547'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', sx, sy - fr.height - 3); }
}
function extraDl(dl) { if (dog && mode !== 'menu') dl.push({d:dog.x + dog.y + .01, k:99, fn:drawDog}); }
// сохранение
{ const ser = serialize; serialize = function () { const d = ser(); d.x45 = {dog, tasks:P.tasks || null}; return d; }; }
{ const as = applySave; applySave = function (d) { as(d); dog = (d && d.x45 && d.x45.dog) || null; if (d && d.x45 && d.x45.tasks) P.tasks = d.x45.tasks; taskChip(); }; }
{ const sn = startNew; startNew = function () { sn(); dog = null; if (P) P.tasks = null; tasksToday(); taskChip(); }; }
