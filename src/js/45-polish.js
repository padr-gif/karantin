// ================= notifications & event banners, zombies tumbling through windows, livelier animation, doorways, bigger doll, recipe info =================

// ---- notifications: icon, colour by meaning, a bar that runs out like an item transfer ----
// action messages leave quickly; injuries and danger stay a little longer; event banners have their own timer (EV_LIFE)
const NTF_LIFE = 1800, NTF_LIFE_CRIT = 2800;
const ntfLife = t => ntfKind(t) === 'crit' ? NTF_LIFE_CRIT : NTF_LIFE;
function ntfKind(t) {
  if (/укус|кров|рваная|перелом|сломал|разорван|загрыз|напали|ломятся|выбит|сорвали|схвач|вцепился|отравл|тошнит|мутит|жар|воспал|порезался|умира|сгорел|кончил|погиб/i.test(t)) return 'crit';
  if (/найдено|подобрано|готов|заведен|зажило|вырос|сохранено|набрал|напился|посажено|урожай|залатан|зашито|прочитано|получено|закатан|высушен|перевязан|наложена|обработаны|снята|прибит|разобран|слил/i.test(t)) return 'good';
  if (/нет |нужн|нечем|не хватает|не вышло|полон|нельзя|пуст|слишком|не время|мешает|не пройти|не пролезть|заперто|сначала/i.test(t)) return 'warn';
  return '';
}
function ntfIcon(t) {
  const R = [[/укус|кров|рана|перелом|бинт|повязк|шина|антисепт|лекарств|таблет|аптечк|зажило|воспал/i, 'i-cross'], [/мертвец|зомби|орда|ползун|бегун|крикун|громил/i, 'i-skull'],
    [/найдено|подобрано|рюкзак|положено|выброшено|вещ/i, 'i-bag'], [/готов|создан|сколот|прибит|зашит|разобран|починит|залатан|ремонт/i, 'i-tool'], [/костёр|огонь|горит|поджар|свар/i, 'i-fire'],
    [/вод|пить|попил|напился|бутыл|фляг/i, 'i-drop'], [/дожд|гроз|промок/i, 'i-rain'], [/снег|зим|мороз|холод/i, 'i-snow'], [/машин|бензин|бак|мотор|руль/i, 'i-car'],
    [/двер|окн|шторы/i, 'i-door'], [/сп(ать|ал)|проснул|выспался|будильник/i, 'i-bed'], [/навык|журнал|прочитано|черт/i, 'i-user'], [/ноч|стемнело/i, 'i-moon'], [/звон|гремит|приманк|шум/i, 'i-horn']];
  for (const [re, ic] of R) if (re.test(t)) return ic;
  return 'i-hand';
}
function ntfBox() { let b = $('toasts'); return b; }
function dropNtf(el, now) { if (!el) return; if (el._gone && !now) return; el._gone = true;   // now — убрать сразу, даже если уже исчезает (иначе toast зацикливался)
  clearTimeout(el._tm); if (now) { el.remove(); return; } el.classList.add('out'); setTimeout(() => el.remove(), 320); }
// ---- special events get their own banner ----
const EVENTS = [
  [/орда/i, 'Орда', 'danger', 'i-skull'], [/эвакуац/i, 'Эвакуация', 'good', 'i-run'], [/сбросили груз|груз на парашюте/i, 'Груз с неба', 'good', 'i-bag'],
  [/вертол/i, 'Вертолёт', 'warn', 'i-heli'], [/свет погас|электричества больше нет/i, 'Света больше нет', 'danger', 'i-bolt'], [/вода в кранах кончилась/i, 'Водопровод отключён', 'danger', 'i-drop'],
  [/^пришла зима/i, 'Зима', 'cold', 'i-snow'], [/^весна!/i, 'Весна', 'good', 'i-sun'], [/^лето\./i, 'Лето', 'warn', 'i-sun'], [/^осень\./i, 'Осень', 'warn', 'i-rain'],
  [/^пошёл снег/i, 'Первый снег', 'cold', 'i-snow'], [/^надвигается гроза/i, 'Гроза', 'warn', 'i-rain'], [/^крикун!/i, 'Крикун', 'danger', 'i-skull'], [/^бегун!/i, 'Бегун', 'danger', 'i-skull'],
  [/^стемнело/i, 'Ночь', 'night', 'i-moon'],
];
const eventFor = t => { for (const e of EVENTS) if (e[0].test(t)) return [e[1], e[2], e[3]]; return null; };
const EV_LIFE = 3800;   // compact banner, one at a time: a newer event replaces the older one
function eventBanner(title, text, kind, icon) {
  let box = $('events'); if (!box) { box = mk('div'); box.id = 'events'; document.body.appendChild(box); }
  const el = mk('div', 'evb ' + (kind || ''));
  const ic = mk('div', 'evi'); ic.appendChild(svgIc(icon || 'i-star')); el.appendChild(ic);
  const tx = mk('div', 'evt'); tx.appendChild(mk('b', '', title)); if (text && text !== title) tx.appendChild(mk('span', '', text)); el.appendChild(tx);
  const bar = mk('i', 'nbar'), u = mk('u'); u.style.animationDuration = EV_LIFE + 'ms'; bar.appendChild(u); el.appendChild(bar);
  box.appendChild(el); while (box.children.length > 1) box.firstChild.remove();
  const sync = () => { document.body.classList.toggle('evon', box.children.length > 0); document.body.style.setProperty('--evh', box.offsetHeight + 'px'); };   // toasts sit right under the banner, however tall it is
  sync();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); sync(); }, 400); }, EV_LIFE);
}

// ---- zombies tumble through open or broken windows instead of gliding through the wall ----
function zWindowCheck(z, px, py) {
  if (z.crawl || z.vt) return false;
  const tx = Math.floor(z.x), ty = Math.floor(z.y), i = ty * MW + tx;
  if (map[i] !== WIN || openingBlocks(i)) return false;
  if (Math.floor(px) === tx && Math.floor(py) === ty) return false;   // entered the window tile this step
  const ax = alongX(tx, ty), cx = tx + .5, cy = ty + .5;
  const from = ax ? Math.sign(py - cy) || 1 : Math.sign(px - cx) || 1;
  const gx = ax ? clamp(z.x, tx + .25, tx + .75) : cx - from * .85, gy = ax ? cy - from * .85 : clamp(z.y, ty + .25, ty + .75);
  if (blocked(gx, gy, z.r)) { z.x = px; z.y = py; return true; }
  const ob = obs[i];
  z.vt = {t:0, dur:.9 + rng() * .35, fx:px, fy:py, tx:gx, ty:gy, glass:!!(ob && ob.broken && !ob.open && !ob.cleared)};
  z.face = Math.atan2(gy - py, gx - px); noise(cx, cy, 4); SFX.knock(cx, cy);
  return true;
}
function tickZVault(z, dt) {
  const v = z.vt; v.t += dt; const k = Math.min(1, v.t / v.dur), e = k * k * (3 - 2 * k);
  z.x = v.fx + (v.tx - v.fx) * e; z.y = v.fy + (v.ty - v.fy) * e; z.vz = Math.sin(Math.PI * Math.min(1, k * 1.1)) * U * .42; z.mv = 0;
  if (k >= 1) {
    z.vt = null; z.vz = 0; z.down = 1.1 + rng() * .6; z.downT = 0;
    SFX.knock(z.x, z.y); addBlood(z.x, z.y, .25);
    if (v.glass) { emit('glass', z.x, z.y, .4, 6, null, 0, 1.2); z.hp -= 4; z.pal.blood = Math.min(5, z.pal.blood + 1); }
  }
}

// ---- livelier animation: step bob, lean, breathing, lunges, stagger, shambling sway ----
function withPose(x, y, pose, fn) {
  if (!pose) return fn();
  const fx = SX(x, y), fy = SY(x, y, 0);
  ctx.save(); ctx.translate(fx + (pose.ox || 0), fy + (pose.oy || 0)); if (pose.r) ctx.rotate(pose.r); ctx.scale(pose.sx || 1, pose.sy || 1); ctx.translate(-fx, -fy);
  try { fn(); } finally { ctx.restore(); }
}
const scrDir = a => { const vx = Math.cos(a) - Math.sin(a), vy = (Math.cos(a) + Math.sin(a)) / 2, l = Math.hypot(vx, vy) || 1; return [vx / l, vy / l]; };
function playerPose(an) {
  if (reduceMotion || an === 'death') return null;
  const a = P.fd != null ? P.fd : P.face, [vx, vy] = scrDir(a), t = animT, p = {ox:0, oy:0, r:0, sx:1, sy:1};
  // no bob, lean or breathing: rotating and squashing pixel sprites made the picture shake while walking
  if (P.atkT != null && P.atkT < P.atkDur) { const k = P.atkT / P.atkDur, l = Math.sin(Math.PI * k) * (k < .35 ? -.6 : 1) * 2.4; p.ox += vx * l; p.oy += vy * l; p.r += vx * Math.sin(Math.PI * k) * .05; }
  if (P.hurt > 0) { p.ox += (Math.random() - .5) * P.hurt * 3; p.r -= vx * P.hurt * .12; }
  if (P.sneak && !P.moving) p.sy -= .02;
  return p;
}
function zombiePose(z, an) {
  if (reduceMotion || (an === 'death' && !z.crawl && !(z.down > 0))) return null;
  const [vx, vy] = scrDir(z.face), s = z.seed || 0, t = animT, p = {ox:0, oy:0, r:0, sx:1, sy:1};
  if (z.vt) { p.oy -= z.vz || 0; p.r = vx * .25 * Math.sin(Math.PI * z.vt.t / z.vt.dur); return p; }
  if (z.crawl) return p;
  if (z.down > 0) return p;
  // walking and idle sway removed (it shook the picture); lunges and staggering from hits stay
  if (z.wind > 0) { const k = 1 - z.wind / .35; p.ox += vx * (k < .5 ? -1 : 2.2) * 1.5; p.oy += vy * (k < .5 ? -1 : 2.2) * 1.5; p.r += vx * .12 * k; }
  if (z.stun > 0) p.r -= vx * Math.min(.3, z.stun) * .5;
  return p;
}

// ---- doorways: closing a door you stand in steps you out to your side ----
function clearDoorway(o) {
  const cx = o.x + .5, cy = o.y + .5, ax = alongX(o.x, o.y);
  if (zs.some(z => Math.hypot(z.x - cx, z.y - cy) < .55)) return 'z';
  if (Math.hypot(P.x - cx, P.y - cy) >= .55) return 'ok';
  const side = ax ? (P.y < cy ? -1 : 1) : (P.x < cx ? -1 : 1);
  for (const s of [side, -side]) {
    const nx = ax ? clamp(P.x, o.x + .3, o.x + .7) : cx + s * .64, ny = ax ? cy + s * .64 : clamp(P.y, o.y + .3, o.y + .7);
    if (!blocked(nx, ny, P.r)) { P.slide = {fx:P.x, fy:P.y, tx:nx, ty:ny, t:0}; P.x = nx; P.y = ny; return 'ok'; }
  }
  return 'stuck';
}
// never stay stuck inside something (a door shut on you, a car parked on you, furniture moved)
function unstick() {
  if (P && P.act && P.act.shower) { P._stuckT = 0; return; }               // в кабине душа «застрять» — нормально
  if (P.car || (P.act && P.act.kind === 'vault') || !blocked(P.x, P.y, P.r * .85)) { P._stuckT = 0; return; }
  P._stuckT = (P._stuckT || 0) + 1; if (P._stuckT < 3) return;
  for (let r = .1; r <= 1.4; r += .1) for (let k = 0; k < 16; k++) {
    const a = k / 16 * 6.283, x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
    if (!blocked(x, y, P.r)) { P.x = x; P.y = y; P._stuckT = 0; return; }
  }
}

// ---- bigger character in the backpack ----

// ---- recipe detail: what you get and where to find what is missing ----
const RES_INFO = {'Костёр':'Горит около четырёх часов: на нём готовят и греются. Дождь заливает огонь, в доме разводить нельзя.', 'Бочка для дождевой воды':'Собирает дождевую воду, до 20 литров. Ставь на улице, сырую воду лучше вскипятить.',
  'Грядка':'Сажай семена и поливай: через пару дней будет урожай. Мороз губит всходы.', 'Ящик для хранения':'Вмещает 24 вещи. Подпиши табличкой, и кнопка «Разложить» разнесёт вещи по ящикам. Еда в нём портится медленнее.'};
const SRC_HINT = {plank:'разбери мебель в режиме обустройства (кнопка с диваном внизу) или поищи в ящиках с инструментом', scrap:'разбери машину ключом или ломом', rag:'распусти ненужную одежду или поищи в комодах и шкафах', sticks:'наломай хвороста у любого дерева',
  berries:'собери с кустов летом и осенью', mushroom:'поищи под деревьями в конце лета и осенью', water:'набери в бутылку у раковины, из бочки или бачка унитаза', fish:'порыбачь у пруда в парке', bottle:'остаётся, когда выпьешь воду или газировку',
  meat:'в холодильниках, пока работает электричество', jar:'на кухонных полках и в ящиках', carrot:'вырасти на грядке', potato:'вырасти на грядке', cabbage:'вырасти на грядке', campfire:'разведи костёр: 2 доски и спички', burner:'газовая горелка: кухни и хозтовары'};
function whereFind(id) {
  if (SRC_HINT[id]) return SRC_HINT[id];
  const sc = {};
  for (const k in CONT) { const L = CONT[k].loot; if (!L || !L.length) continue; const n = L.filter(x => x === id).length; if (!n) continue; const nm = CONT[k].name; sc[nm] = Math.max(sc[nm] || 0, n / L.length); }
  const top = Object.entries(sc).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0].toLowerCase());
  return top.length ? 'ищи: ' + top.join(', ') : 'редкая вещь';
}
function recipeInfo(det) {
  const card = det.querySelector('.recipe'); if (!card || det.querySelector('.rinfo')) return;
  const res = card.dataset.result, title = (card.querySelector('.rmid > b') || {}).textContent || '', box = mk('div', 'rinfo');
  const d = ITEMS[res], txt = RES_INFO[title] || (d && DESC[res]);
  if (txt) {
    const r = mk('div', 'rres'); r.appendChild(iconEl(res, 34));
    const t = mk('div'); t.appendChild(mk('b', '', d ? d.name : title));
    if (d) { const fake = {id:res, dur:d.dur, uses:d.uses, ch:100, mag:d.mag, w:0, fuel:0}; let info = ''; try { info = itemInfo(fake); } catch (e) {} if (info) { const s = mk('small'); s.innerHTML = info; t.appendChild(s); } }
    t.appendChild(mk('p', '', txt)); r.appendChild(t); box.appendChild(r);
  }
  const miss = (card.dataset.parts || '').split(',').filter(p => p[0] === '-' && p.length > 1).map(p => p.slice(1));
  if (miss.length) {
    box.appendChild(mk('div', 'sect', 'Где взять недостающее'));
    for (const id of [...new Set(miss)]) {
      const row = mk('div', 'rmiss'); row.appendChild(iconEl(id, 24));
      const t = mk('div'); t.appendChild(mk('b', '', ITEMS[id] ? ITEMS[id].name : (PNAMES[id] || id))); t.appendChild(mk('small', '', whereFind(id))); row.appendChild(t); box.appendChild(row);
    }
  } else if ((card.dataset.parts || '').length) box.appendChild(mk('p', 'rready', '✓ Всё есть, можно делать'));
  det.appendChild(box);
}
onPanel(() => {
  if (!panel) return;
  if ((panel.kind === 'inv' && panel.tab === 'craft') || panel.kind === 'cook') { const det = $('pnBody').querySelector('.rdet'); if (det) recipeInfo(det); }
});

