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
  P.inv.push(mkItem('lure')); P.x += 2; useItem('lure'); logEv('проверка');
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

console.log('Живая игра 15 секунд');
await fresh("['coward']");
await D("P.weapon = mkItem('shotgun'); P.weapon.mag = 2; P.inv.push(mkItem('shells')); gameMin += 14 * 60; for (let i = 0; i < 25; i++) spawnZombie(4, false);");
for (let k = 0; k < 30; k++) { await D("P.hp = Math.max(P.hp, 60); P.cd = 0; attack(); keys.clear(); keys.add(Math.random() < .5 ? 'KeyW' : 'KeyD');"); await sleep(500); }
check('кадры без ошибок', await D("frameErr") === 0);
check('ошибок в консоли нет', errors.length === 0, errors.slice(0, 5));

await browser.close();
console.log(failed ? `\nПровалено: ${failed}` : '\nВсе тесты пройдены');
process.exit(failed ? 1 : 0);
