// Эталонный прогон: игра в детерминированном режиме (фиксированный Math.random, Date.now и кадры по 1/30 с),
// заскриптованная игра ~2 игровых часа + переход в соседний район. Снимаем состояние (serialize) и пиксели кадров.
//   node tests/golden.mjs save   — записать эталон в tests/golden.json
//   node tests/golden.mjs        — сравнить с эталоном (для чистки кода: поведение не должно меняться)
import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const PAGE = 'file://' + path.join(ROOT, 'dist/karantin-dev.html') + '?dbg&nobmp';
const FILE = path.join(ROOT, 'tests/golden.json');
const save = process.argv[2] === 'save';

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 900, height: 420}, deviceScaleFactor: 1});
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.addInitScript(() => {
  let s = 0x9e3779b9; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let now = 1.8e12; Date.now = () => (now += 7);
  // после загрузки (window.__virt = true) время виртуальное: кадры, таймеры и performance.now двигает только тест
  const rST = setTimeout, rSI = setInterval, rCT = clearTimeout, rCI = clearInterval, rPN = performance.now.bind(performance);
  let vt = 0, seq = 0; const timers = new Map();
  window.setTimeout = (fn, ms, ...a) => { if (!window.__virt) return rST(fn, ms, ...a); const id = 1e6 + ++seq; timers.set(id, {at:vt + (ms || 0), fn, a, seq}); return id; };
  window.setInterval = (fn, ms, ...a) => { if (!window.__virt) return rSI(fn, ms, ...a); const id = 1e6 + ++seq; timers.set(id, {at:vt + (ms || 0), fn, a, every:Math.max(1, ms || 0), seq}); return id; };
  window.clearTimeout = id => { if (id > 1e6) timers.delete(id); else rCT(id); };
  window.clearInterval = id => { if (id > 1e6) timers.delete(id); else rCI(id); };
  performance.now = () => window.__virt ? vt : rPN();
  const q = []; window.__raf = q; window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
  window.__step = t => {
    vt = t;
    for (;;) { let best = null, bid = 0; for (const [id, x] of timers) if (x.at <= vt && (!best || x.at < best.at || (x.at === best.at && x.seq < best.seq))) { best = x; bid = id; } if (!best) break;
      if (best.every) best.at += best.every; else timers.delete(bid); try { typeof best.fn === 'function' ? best.fn(...best.a) : 0; } catch (e) {} }
    const L = q.splice(0); for (const cb of L) cb(t);
  };
});
await page.goto(PAGE);
// загрузка идёт на setTimeout/промисах; кадры — только наши
for (let k = 0; k < 600 && !(await page.evaluate(() => window.__dbg && !document.getElementById('mNew').disabled)); k++) await page.waitForTimeout(100);
const D = s => page.evaluate(s => window.__dbg(s), s);
await page.evaluate(() => document.fonts.ready.then(() => document.fonts.forEach(f => f.load()))); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(500);
await page.evaluate(() => { window.__virt = true; });
let T = 0;
const frames = n => page.evaluate(n => { let t = window.__t || 1000; for (let k = 0; k < n; k++) { t += 1000 / 30; window.__step(t); } window.__t = t; }, n);
const shot = async () => crypto.createHash('sha1').update(await D(`cv.toDataURL()`)).digest('hex').slice(0, 16);
const state = async () => D(`(() => { const d = serialize(); delete d.x50; return JSON.stringify(d); })()`);
const out = {};

await D(`settings.vol = 0; settings.gfx = 2; settings.smooth = false; settings.mini = true; settings.hints = true; applySettings(); NEWCFG.season = 'autumn'; NEWCFG.mut = true; newTraits = ['athlete']; newProf = 'none'; startNew(); startPlayAfterStory();`);
await frames(10);
out.start = {state: await state(), shot: await shot()};
// идти, драться — по сценарию: открытое место на улице, рядом мертвецы
await D(`(() => { for (let y = 34; y < MH - 34; y++) for (let x = 34; x < MW - 40; x++) { let ok = true; for (let dx = -3; dx <= 6 && ok; dx++) for (let dy = -3; dy <= 3 && ok; dy++) { const i = (y + dy) * MW + x + dx; if (![GRASS, ROAD, WALK].includes(map[i]) || propAt[i] || furn[i] || hAt[i]) ok = false; } if (ok) { P.x = x + .5; P.y = y + .5; return; } } })(); P.weapon = mkItem('bat'); for (let i = 0; i < 6; i++) mkZombie(P.x + 3 + i * .7, P.y + (i % 3) - 1, {pi:i, b:i % 2 ? 'f' : 'm', blood:0}, 160, .9); computeVis();`);
const script = [['KeyD', 40], ['KeyS', 30], ['KeyA', 30], ['KeyW', 40], [null, 20]];
for (let round = 0; round < 4; round++) {
  for (const [key, n] of script) {
    await D(`keys.clear(); ${key ? `keys.add('${key}');` : ''}`);
    for (let k = 0; k < n; k += 5) { await D(`${round < 2 ? 'P.cd = 0; attack();' : ''} if (P.hp < 40) { P.hp = 90; }`); await frames(5); }
  }
  await D(`P.inv.push(mkItem('water'), mkItem('canned')); useItem('water'); if (panel) closePanel();`); await frames(10);
  out['round' + round] = {state: await state(), shot: await shot()};
}
// дом изнутри, обыск, ремесло
await D(`(() => { const H = houses.find(h => h.kind === 'house' && h.rooms && hAt[Math.floor(P.y) * MW + Math.floor(P.x)] !== houses.indexOf(h) + 1); const r = H.rooms[0]; P.x = (r.x0 + r.x1) / 2 + .5; P.y = (r.y0 + r.y1) / 2 + .5; computeVis(); fogDirty = true; })()`);
await frames(20);
out.house = {state: await state(), shot: await shot()};
await D(`(() => { const f = furns.filter(f => !f.gone && CONT[f.type] && CONT[f.type].loot).sort((a, b) => Math.hypot(a.cx - P.x, a.cy - P.y) - Math.hypot(b.cx - P.x, b.cy - P.y))[0]; P.x = f.cx + (f.wd ? -f.wd[0] * .8 : .8); P.y = f.cy + (f.wd ? -f.wd[1] * .8 : 0); computeVis(); const a = getActions().find(a => a.f === f) || getActions()[0]; if (a) doAction(a); })()`);
await frames(90);
out.loot = {html: await D(`(document.getElementById('panel').hidden ? 'закрыто' : document.getElementById('panel').textContent) + '|' + getActions().map(a => a.kind + ':' + a.label).join(',')`), shot: await shot()};
await D(`if (panel) closePanel(); P.inv.push(mkItem('plank'), mkItem('plank'), mkItem('nails'), mkItem('hammer')); openPanel('inv'); panel.tab = 'craft'; renderPanel();`); await frames(3);
out.craft = {html: await D(`document.getElementById('panel').textContent`)};
await D(`closePanel();`);
// ночь и мертвецы рядом
await D(`gameMin = Math.floor(gameMin / 1440) * 1440 + 22 * 60; for (let i = 0; i < 12; i++) spawnZombie(6, false);`);
await frames(150);
out.night = {state: await state(), shot: await shot()};
// инвентарь и панели
await D(`openPanel('inv');`); await frames(3);
out.inv = {html: await D(`document.getElementById('panel').innerHTML.length + ':' + document.getElementById('panel').textContent`), shot: await shot()};
await D(`closePanel();`);
// сохранение → загрузка
await D(`applySave(JSON.parse(JSON.stringify(serialize())));`); await frames(10);
out.reload = {state: await state(), shot: await shot()};
// соседний район
await D(`P.x = .5; P.y = EXIT_R + .5; doTravel('w', -1, 0);`); await frames(60);
out.district = {state: await state(), shot: await shot(), type: await D(`world.dtype`)};
out.errors = errors.length;

const hash = s => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 16);
const compact = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([a, b]) => [a, a === 'state' || a === 'html' ? {hash: hash(b), body: b} : b])) : v]));
if (save) { fs.writeFileSync(FILE, JSON.stringify(compact)); console.log('эталон записан:', Object.keys(out).join(', '), 'ошибок', errors.length); }
else {
  const ref = JSON.parse(fs.readFileSync(FILE, 'utf8')); let bad = 0;
  for (const k of Object.keys(ref)) {
    if (typeof ref[k] !== 'object') { if (ref[k] !== compact[k]) { bad++; console.log('✗', k, ref[k], '→', compact[k]); } continue; }
    for (const a of Object.keys(ref[k])) {
      const r = ref[k][a], c = compact[k] && compact[k][a];
      const same = r && r.hash ? c && r.hash === c.hash : r === c;
      if (!same) {
        bad++;
        if (r && r.body && c && c.body) { const x = JSON.parse(r.body.startsWith('{') ? r.body : '{}'), y = JSON.parse(c.body.startsWith('{') ? c.body : '{}'); const diff = Object.keys({...x, ...y}).filter(f => JSON.stringify(x[f]) !== JSON.stringify(y[f])); console.log('✗', k + '.' + a, 'отличаются поля:', diff.slice(0, 12).join(', ') || '(текст)'); }
        else console.log('✗', k + '.' + a, r, '→', c);
      }
    }
  }
  console.log(bad ? `\nЭталон не совпал: ${bad}` : 'Эталон совпал');
  process.exitCode = bad ? 1 : 0;
}
await browser.close();
