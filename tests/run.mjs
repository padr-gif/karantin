// Автотесты: открывают отладочную сборку в headless Chromium и проверяют механики через window.__dbg.
//   npm test   (сначала соберёт dist/karantin-dev.html)
import {chromium} from 'playwright';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const PAGE = 'file://' + path.join(ROOT, 'dist/karantin-dev.html') + '?dbg';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (name, ok, info) => { console.log((ok ? '  ✓ ' : '  ✗ ') + name + (ok ? '' : '  → ' + JSON.stringify(info))); if (!ok) failed++; };

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 932, height: 430}});
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); });
await page.goto(PAGE);
await page.waitForFunction(() => window.__dbg && !document.getElementById('mNew').disabled, null, {timeout: 60000});
const D = s => page.evaluate(s => window.__dbg(s), s);
const fresh = async (traits = '[]') => { await D(`newTraits = ${traits}; newProf = 'none'; startNew(); startPlayAfterStory(); zs.length = 0;`); await sleep(200); };

console.log('Черты и создание персонажа');
await fresh("['organized','smoker']");
check('черты сохранились', await D("P.traits.join()") === 'organized,smoker');
check('организованный: +4 места', await D("P.cap") === 22);
check('курильщик получил сигареты', await D("P.inv.some(i => i.id === 'cigs')"));
await D("newTraits = ['eagle','athlete']"); check('нельзя взять черты без очков', await D("traitPts()") < 0);

console.log('Раны и лечение');
await fresh();
await D("P.wounds = []; addWound('deep', 'arm'); addWound('frac', 'leg'); tickV23(.1, 1)");
check('рваная рана кровоточит', await D("P.bleed"));
check('перелом ноги замедляет', await D("moveK() < .6 && !canRun()"));
await D("P.inv.push(mkItem('bandage'), mkItem('splint')); useItem('bandage'); useItem('splint'); tickV23(.1, 1)");
check('бинт остановил кровь', !(await D("P.bleed")));
check('шина наложена', await D("wounds().some(w => w.k === 'frac' && w.spl)"));
await D("for (let i = 0; i < 400; i++) tickWounds(30)");
check('перелом в шине сросся, рана заживает', await D("!wounds().some(w => w.k === 'frac') && wounds().every(w => w.h > .2)"), await D("wounds().map(w => w.k + ' ' + w.h.toFixed(2))"));

console.log('Бой');
await fresh();
check('удар со спины убивает', await D(`(() => { P.x = 61.5; P.y = 40.5; computeVis(); const z = mkZombie(P.x + .7, P.y, {pi:1, b:'m', blood:0}, 60, 1); z.state = 'wander'; z.face = 0; P.face = 0; P.sneak = true; P.cd = 0; P.weapon = mkItem('knife'); attack(); return !zs.includes(z); })()`));
check('пистолет попадает на открытом месте', await D(`(() => { let hits = 0; for (let k = 0; k < 10; k++) { P.x = 61.5; P.y = 40.5; zs.length = 0; const z = mkZombie(P.x + 3.5, P.y + .2, {pi:1, b:'m', blood:0}, 999, 1); computeVis(); P.weapon = mkItem('pistol'); P.weapon.mag = 2; P.cd = 0; P.panic = 0; attack(); if (z.hp < 999) hits++; } return hits >= 6; })()`));
check('перезарядка из пачки', await D(`(() => { P.weapon.mag = 0; P.inv.push(mkItem('ammo9')); P.cd = 0; attack(); const a = P.act; P.act = null; finishAct(a); return P.weapon.mag > 0; })()`));

console.log('Хранилище, приманка, сохранение');
await fresh();
const saved = await D(`(() => {
  for (let k = 0; k < 4; k++) P.inv.push(mkItem('plank')); P.inv.push(mkItem('hammer'));
  RECIPES.find(r => r.name === 'Ящик для хранения').make(); stashes[0].label = 'food'; stashes[0].items.push(mkItem('canned'));
  P.inv.push(mkItem('lure')); { let best = null; for (let r = 2; r < 40 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) { const x = Math.floor(P.x) + dx, y = Math.floor(P.y) + dy; if ([0, 1, 2].every(k => [GRASS, ROAD, WALK].includes(get(x + k, y)) && !propAt[y * MW + x + k])) { best = [x + 2.5, y + .5]; break; } } if (best) { P.x = best[0]; P.y = best[1]; } } useItem('lure'); logEv('проверка');
  const d = JSON.parse(JSON.stringify(serialize())); applySave(d);
  return {st:stashes.length, lab:stashes[0] && stashes[0].label, items:stashes[0] && stashes[0].items.length, lu:lures.length, log:P.log.some(l => l[1] === 'проверка')};
})()`);
check('ящик, приманка и дневник пережили сохранение', saved.st === 1 && saved.lab === 'food' && saved.items === 1 && saved.lu === 1 && saved.log, saved);

console.log('Интерфейс');
await fresh();
await D("P.wounds = []; addWound('cut', 'arm', 'левая рука'); openPanel('inv'); panel.tab = 'self'; renderPanel();");
check('вкладка «Тело» открывается первой', await D("panel.sub === 'body' && !!document.querySelector('.bodysvg')"));
check('рана нарисована на схеме', await D("document.querySelector('.reg[data-r=armL]').classList.contains('bleed')"));
await D("closePanel(); openPanel('inv'); panel.tab = 'craft'; renderPanel(); document.querySelector('.rlist').scrollTop = 300;");
const top = await D("document.querySelector('.rlist').scrollTop");
await D("[...document.querySelectorAll('.rlist .rrow')].slice(-1)[0].click()");
check('прокрутка рецептов не сбрасывается', top > 0 && await D("document.querySelector('.rlist').scrollTop") === top);
check('у всех предметов есть иконка', await D("Object.keys(ITEMS).every(id => ART.meta.icons[id] || ART.meta.icons[ICONA[id]])"), await D("Object.keys(ITEMS).filter(id => !(ART.meta.icons[id] || ART.meta.icons[ICONA[id]]))"));

console.log('Окна, перчатки, фильтр');
await fresh();
// окно дома, у которого с одной стороны комната, с другой улица
const findWin = `(() => { for (const Hs of houses) for (let y = Math.floor(Hs.iy0) - 1; y <= Hs.iy1 + 1; y++) for (let x = Math.floor(Hs.ix0) - 1; x <= Hs.ix1 + 1; x++) {
  if (get(x, y) !== WIN) continue; const ax = alongX(x, y), pts = ax ? [[x + .5, y - .7], [x + .5, y + 1.7]] : [[x - .7, y + .5], [x + 1.7, y + .5]];
  const inn = pts.find(p => insideHouse(p[0], p[1])), out = pts.find(p => !insideHouse(p[0], p[1]));
  if (inn && out && !blocked(inn[0], inn[1], .3) && !blocked(out[0], out[1], .3)) return {i:y * MW + x, x, y, inn, out}; } return null; })()`;
const W = await D(findWin);
check('нашлось окно для проверки', !!W);
if (W) {
  const setup = `const ob = obs[${W.i}]; ob.broken = true; ob.open = false; ob.cleared = false; ob.bhp = 0; ob.cur = [150, 60, 56]; ob.cc = false; P.wounds = []; P.cloth = {};`;
  const labels = where => D(`${setup} P.x = ${W[where][0]}; P.y = ${W[where][1]}; windowActions({i:${W.i}, x:${W.x}, y:${W.y}}).map(a => a.label)`);
  const inL = await labels('inn'), outL = await labels('out');
  check('изнутри можно задёрнуть шторы', inL.includes('Задёрнуть шторы'), inL);
  check('с улицы шторы недоступны', !outL.some(l => /штор/i.test(l)), outL);
  check('у разбитого окна есть «Убрать осколки»', inL.includes('Убрать осколки'), inL);
  await D(`${setup} P.x = ${W.inn[0]}; P.y = ${W.inn[1]}; P.cloth.hands = mkItem('gloves'); P.inv = P.inv.filter(i => i.id !== 'glass');
    winAction({kind:'clearglass', o:{i:${W.i}, x:${W.x}, y:${W.y}}}); const a = P.act; P.act = null; finishAct(a);`);
  check('осколки убраны и лежат в рюкзаке', await D(`obs[${W.i}].cleared && countItem('glass') >= 1`));
  check('в перчатках стекло не режет', await D(`P.cloth.hands = mkItem('gloves'); delete P.cloth.hands.cd; for (let k = 0; k < 10; k++) glassCut(1); wounds().length === 0`), await D('wounds().length'));
  check('без перчаток режет', await D(`P.cloth.hands = null; for (let k = 0; k < 5; k++) glassCut(1); wounds().length > 0`));
  check('через очищенную раму лезешь без порезов', await D(`P.wounds = []; for (let k = 0; k < 30; k++) finishVault({br:true, o:{i:${W.i}}, tx:${W.out[0]}, ty:${W.out[1]}}); wounds().length === 0`));
  check('очищенная рама и перчатки переживают сохранение', await D(`P.cloth.hands = mkItem('gloves'); applySave(JSON.parse(JSON.stringify(serialize()))); obs[${W.i}].cleared === true && P.cloth.hands && P.cloth.hands.id === 'gloves'`));
}
await D("P.inv = [mkItem('waterD'), mkItem('waterD'), mkItem('filter')]; useItem('filter'); const a = P.act; P.act = null; finishAct(a);");
check('фильтр делает сырую воду питьевой', await D("countItem('water') === 2 && !countItem('waterD') && P.inv.find(i => i.id === 'filter').uses === 4"));
await D("P.inv = [mkItem('rag'), mkItem('glass')]; RECIPES.find(r => r.name === 'Стеклянная заточка').make();");
check('заточка из осколка и тряпки', await D("countItem('shiv') === 1"));
check('варежки греют', await D("P.cloth = {}; const a = insulation(); P.cloth.hands = mkItem('mittens'); insulation() > a"));

console.log('Размер экрана');
await D("window.__iw = Object.getOwnPropertyDescriptor(window, 'innerWidth'); Object.defineProperty(window, 'innerWidth', {get: () => 400, configurable: true})");
await sleep(300);
check('холст сам подстроился под новый размер без события resize', await D("cv.style.width") === '400px');
await D("Object.defineProperty(window, 'innerWidth', window.__iw)"); await sleep(300);
check('и вернулся обратно', await D("cv.style.width === innerWidth + 'px'"));

console.log('Версия 0.41');
await fresh();
const W2 = await D(findWin);
check('внутренние двери закрыты, но не заперты', await D("houses.length > 0 && obs.filter(o => o && o.t === 'door' && o.sw === 1 && o.hp === 60).every(o => !o.open && !o.locked)"));
check('тап по пустому месту не ведёт персонажа', await D("const x = P.x, y = P.y; tapWorld(5, 5); goTo == null"));
await D("P.wounds = []; const w = addWound('cut', 'arm', 'левая кисть'); w.band = 1; w.t = 10;");
check('кисть — отдельная часть тела', await D("WHERE2REG[wounds()[0].where] === 'handL' && bodySvg().includes('data-r=\"handL\"')"));
await D("openPanel('inv'); panel.tab = 'self'; renderPanel(); [...document.querySelectorAll('.wound button')].find(b => /Снять/.test(b.textContent)).click();");
check('повязку можно снять', await D("!wounds()[0].band && bleeding(wounds()[0])"));
await D("closePanel()");
if (W2) {
  await D(`const ob = obs[${W2.i}]; ob.broken = false; ob.open = false; ob.bhp = 0; ob.stiff = 2; P.x = ${W2.inn[0]}; P.y = ${W2.inn[1]}; P.inv = P.inv.filter(i => i.id !== 'crowbar'); P.weapon = null; winAction({kind:'window', o:{i:${W2.i}, x:${W2.x}, y:${W2.y}}});`);
  check('заклинившее окно без лома не открыть', await D(`!obs[${W2.i}].open`));
  const tries = await D(`(() => { const ob = obs[${W2.i}]; ob.stiff = 1; ob.tries = 0; let n = 0; while (!ob.open && n < 40) { winAction({kind:'window', o:{i:${W2.i}, x:${W2.x}, y:${W2.y}}}); n++; } return n; })()`);
  check('тугое окно открывается за несколько попыток', tries >= 1 && tries < 40, tries);
  await D(`winAction({kind:'window', o:{i:${W2.i}, x:${W2.x}, y:${W2.y}}})`);
  check('закрывается с первого раза', await D(`!obs[${W2.i}].open`));
  await sleep(200);
  check('створка едет плавно', await D(`obs[${W2.i}].ang > 0 && obs[${W2.i}].ang < 1`), await D(`obs[${W2.i}].ang`));
}
check('мебель за стеной не выбирается', await D(`(() => { toggleEditor(true); const f = furns.find(f => !FIXED.has(f.type) && Math.hypot(f.cx - P.x, f.cy - P.y) < 3.2 && !reachOK(clamp(P.x, f.r[0], f.r[2]), clamp(P.y, f.r[1], f.r[3])));
  if (!f) return true; const R = cv.getBoundingClientRect(), k = SCALE / DEV; editorTap(SX(f.cx, f.cy) * k + R.left, SY(f.cx, f.cy, 10) * k + R.top); const ok = EDIT.sel !== f; toggleEditor(false); return ok; })()`));

console.log('Мебель в реальный размер');
await fresh();
check('большая мебель занимает все свои клетки', await D("(() => { const b = furns.filter(f => f.big); return b.length > 10 && b.every(f => f.tiles.length > 1 && f.tiles.every(t => furn[t] === furns.indexOf(f) + 1)); })()"), await D("furns.filter(f => f.big).length"));
check('проходы в домах не перекрыты', await D("houses.every(h => houseOk([h]))"));
check('спрайты новой мебели есть', await D("furns.every(f => frameOf(furnName(f)))"), await D("furns.filter(f => !frameOf(furnName(f))).map(furnName).slice(0, 5)"));
check('большая мебель переживает сохранение', await D("(() => { const sig = () => furns.filter(f => f.big).map(f => f.tiles.join(',')).join('|'); const a = sig(); applySave(JSON.parse(JSON.stringify(serialize()))); return a === sig(); })()"));
check('у большой мебели есть действие', await D("(() => { const f = furns.find(f => f.big && (f.type === 'bed' || f.type === 'sofa' || f.type === 'wardrobe')); if (!f) return true; const cx = (f.r[0] + f.r[2]) / 2, cy = (f.r[1] + f.r[3]) / 2; for (const [x, y] of [[f.r[0] - .35, cy], [f.r[2] + .35, cy], [cx, f.r[1] - .35], [cx, f.r[3] + .35]]) { P.x = x; P.y = y; if (getAction()) return true; } return false; })()"));

console.log('Одежда');
await fresh();
check('стартовая одежда надета', await D("!!(P.cloth.shirt && P.cloth.legs && P.cloth.feet && P.cloth.shirt.id === 'tshirt')"));
check('одежду можно снять до белья', await D("(() => { for (const s of ['shirt', 'legs', 'feet']) takeOffCloth(s); return !P.cloth.shirt && !P.cloth.legs && !P.cloth.feet && P.inv.some(i => i.id === 'jeans'); })()"));
check('голым холоднее', await D("insulation() < 3"));
check('карго дают карманы', await D("(() => { const c0 = pocketKg(); P.inv.push(mkItem('cargo')); wearCloth(P.inv.findIndex(i => i.id === 'cargo')); return pocketKg() > c0 + 1 && P.cloth.legs.id === 'cargo'; })()"));
check('вес: у вещей свой вес, рюкзак по килограммам', await D("(() => itemKg(mkItem('plank')) > itemKg(mkItem('bandage')) && !!P.bag && invCapKg() > 5)()"));
check('перегруз замедляет, неподъёмное не взять', await D("(() => { const inv = P.inv.slice(), m0 = moveK(); for (let k = 0; k < 6; k++) P.inv.push(mkItem('plank')); const slow = moveK() < m0, over = invOver() > 0; for (let k = 0; k < 12; k++) P.inv.push(mkItem('plank')); const full = invFull(); P.inv = inv; return slow && over && full; })()"));
check('рюкзаки: большие реже', await D("(() => { const c = {}; for (let k = 0; k < 1500; k++) { const id = mkItem('bag').id; c[id] = (c[id] || 0) + 1; } return c.bag_school > c.sportbag && c.sportbag > c.bag && c.bag > (c.milbag || 0); })()"));
check('надеть рюкзак побольше — вместимость растёт', await D("(() => { const c0 = invCapKg(); P.inv.push(mkBag('milbag')); useItem(null, P.inv.length - 1); const ok = P.bag.id === 'milbag' && invCapKg() > c0 && P.inv.some(i => i.id === 'bag_school'); return ok; })()"));
check('выключатель гасит свет в комнате', await D("(() => { buildSwitches(); const Hs = houses.find(H => H.rooms && H.rooms.some(r => r.sw)), r = Hs.rooms.find(r => r.sw); r.off = true; const off = !roomLitAt(r.x0 + .5, r.y0 + .5); r.off = false; return off && roomLitAt(r.x0 + .5, r.y0 + .5); })()"));
check('кадр героя в одежде собирается', await D("(() => { P.inv.push(mkItem('milJ')); wearCloth(P.inv.findIndex(i => i.id === 'milJ')); const pp = playerLookPal(P.look); const f = charFrame('pm_idle_1_0', pp.key, pp.pal, true); return !!(f && f.cv && f.w > 10); })()"));
check('сохранение хранит одежду', await D("(() => { const d = JSON.parse(JSON.stringify(serialize())); return d.p.cloth.legs.id === 'cargo' && d.p.cloth.v === 34; })()"));
check('старое сохранение получает стартовую одежду', await D("(() => { const d = JSON.parse(JSON.stringify(serialize())); d.p.cloth = {}; applySave(d); return P.cloth.shirt && P.cloth.shirt.id === 'tshirt'; })()"));
{ const miss = await D("Object.keys(ITEMS).filter(k => ITEMS[k].kind === 'cloth' && !ART.meta.icons[k] && !ART.meta.icons[ICONA[k]])"); check('у всей одежды есть иконки', miss.length === 0, miss); }

console.log('Звуки');
await fresh();
await D("SFX.init()"); await sleep(1500);
{ const n = await D("Object.keys(SMP).length"); check('записи звуков загружены', n >= 50, n); }
check('звуки шагов, дверей и мебели играют без ошибок', await D("(() => { SFX.step(true, false); SFX.step(false, true); SFX.door(true); SFX.door(false); SFX.rustle(); SFX.pickup(); SFX.equip(); for (const t of ['wardrobe', 'dresser', 'locker', 'fridge', 'car', 'bin']) { SFX.contOpen(t); SFX.contClose(t); SFX.rummage(t); } return true; })()"));
check('поверхность под ногами определяется', await D("['wood', 'carpet', 'tile', 'bare', 'concrete', 'grass', 'snow'].includes(surfaceAt(P.x, P.y))"));

console.log('Перелезть через мебель');
await fresh();
{ const r = await D(`(() => {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const f of furns) { if (f.gone || !f.r || !LOW_FURN.has(f.type)) continue;
    for (const [dx, dy] of dirs) { const cx = (f.r[0] + f.r[2]) / 2, cy = (f.r[1] + f.r[3]) / 2;
      const sx = dx ? (dx > 0 ? f.r[0] - P.r - .05 : f.r[2] + P.r + .05) : cx, sy = dy ? (dy > 0 ? f.r[1] - P.r - .05 : f.r[3] + P.r + .05) : cy;
      if (blocked(sx, sy, P.r)) continue; P.x = sx; P.y = sy; P.act = null; const pl = climbPlan(dx, dy); if (!pl || !pl.f) continue;
      startClimb(pl); for (let k = 0; k < 120 && P.act; k++) update(1 / 60);
      return {type:f.type, ok:!P.act && Math.hypot(P.x - pl.tx, P.y - pl.ty) < .05 && !blocked(P.x, P.y, P.r * .9)}; } }
  return {none:true}; })()`);
  check('через низкую мебель перелезаешь', r.ok, r); }
{ const r = await D(`(() => { for (const f of furns) { if (f.gone || !f.r || f.type !== 'wardrobe') continue;
    const cx = (f.r[0] + f.r[2]) / 2, cy = (f.r[1] + f.r[3]) / 2;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const sx = dx ? (dx > 0 ? f.r[0] - P.r - .05 : f.r[2] + P.r + .05) : cx, sy = dy ? (dy > 0 ? f.r[1] - P.r - .05 : f.r[3] + P.r + .05) : cy;
      if (blocked(sx, sy, P.r)) continue; P.x = sx; P.y = sy; const pl = climbPlan(dx, dy); if (pl) return !pl.f; } }
  return true; })()`);
  check('через шкаф не перелезть', r); }

console.log('Душ');
await fresh();
check('у душа свои кадры', await D("!!(ART.meta.frames['f_shower_0_0'] && ART.meta.frames['hd_f_shower_0_0'])"));
check('компактная ванна рисуется душем', await D("(() => { const f = furns.find(f => f.type === 'bath'); if (!f) return true; const c = f.compact; f.compact = true; const n = furnName(f); f.compact = c; return n.startsWith('f_shower'); })()"));
check('помыться: снимает стресс, ты мокрый', await D("(() => { const f = furns.find(f => f.type === 'bath' && !f.gone); if (!f) return true; P.x = (f.r[0] + f.r[2]) / 2; P.y = f.r[3] + .35; if (blocked(P.x, P.y, P.r)) P.y = f.r[1] - .35; zs.length = 0; P.stress = 50; P.wet = 0; P.washT = 0; const a = getActions().find(a => a.kind === 'wash'); if (!a) return 'нет действия'; doAction(a); const A = P.act; if (!A) return 'не началось'; P.act = null; finishAct(A); return P.stress < 50 && P.wet > 50; })()"));

console.log('Открытое окно');
await fresh();
check('в открытое окно не войти шагом', await D(`(() => { const i = obs.findIndex((o, k) => o && map[k] === WIN && !o.bhp); if (i < 0) return true; const o = obs[i], x = i % MW, y = (i / MW) | 0; o.open = true;
  const ax = alongX(x, y); P.act = null; P.x = ax ? x + .5 : x + .5 - 1.2; P.y = ax ? y + .5 - 1.2 : y + .5; const d = ax ? [0, 1] : [1, 0];
  for (let k = 0; k < 120; k++) move(P, d[0] * .03, d[1] * .03); const passed = ax ? P.y > y + .5 : P.x > x + .5; o.open = false; return !passed; })()`));

console.log('Детальная графика');
await fresh();
await D("settings.smooth = true; applySettings();"); await sleep(1500);
check('детальный режим рисует мир без ошибок', await D("HDQ > 1 && CHUNKS.size > 0 && [...CHUNKS.values()].every(c => c.q === HDQ)"), await D("[HDQ, CHUNKS.size]"));
check('у мебели в доме есть детальные кадры', await D("furns.filter(f => !f.gone && !f.compact).every(f => ART.meta.frames['hd_' + furnName(f)])"), await D("furns.filter(f => !f.gone && !f.compact && !ART.meta.frames['hd_' + furnName(f)]).map(f => furnName(f)).slice(0, 5)"));
check('лист детальной мебели загружен', await D("!!ART.imgs.furn3 && ART.imgs.furn3.naturalWidth === 4096"));
await D("settings.fps = true"); await sleep(1300);
check('счётчик FPS показывает кадры и память', await D("/FPS \\d+[\\s\\S]*спрайты \\d+ МБ/.test(document.getElementById('fpsBox').textContent)"), await D("document.getElementById('fpsBox').textContent"));
await D("settings.fps = false");
await D("settings.smooth = false; applySettings();"); await sleep(500);
check('и возвращается к пикселям', await D("HDQ === 1 && [...CHUNKS.values()].every(c => c.q === 1)"));

console.log('Живая игра 15 секунд');
await fresh("['coward']");
await D("P.weapon = mkItem('shotgun'); P.weapon.mag = 2; P.inv.push(mkItem('shells')); gameMin += 14 * 60; for (let i = 0; i < 25; i++) spawnZombie(4, false);");
for (let k = 0; k < 30; k++) { await D("P.hp = Math.max(P.hp, 60); P.cd = 0; attack(); keys.clear(); keys.add(Math.random() < .5 ? 'KeyW' : 'KeyD');"); await sleep(500); }
check('кадры без ошибок', await D("frameErr") === 0);
check('ошибок в консоли нет', errors.length === 0, errors.slice(0, 5));

await browser.close();
console.log(failed ? `\nПровалено: ${failed}` : '\nВсе тесты пройдены');
process.exit(failed ? 1 : 0);
