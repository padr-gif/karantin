// Скриншот игры с новыми персонажами: Chromium через протокол отладки (без Playwright).
//   node build.mjs --dev && node tools/mh3d/ingame_shot.mjs "file://$PWD/dist/karantin-dev.html?dbg" спрайты.json out.png 1280 600 street|home
import {spawn} from 'node:child_process';
import fs from 'node:fs';
const [, , PAGE, SPR, OUT, W = '1280', H = '600'] = process.argv;   // SPR не используется
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn('/opt/pw-browsers/chromium-1194/chrome-linux/chrome', ['--headless=new', '--no-sandbox', '--remote-debugging-port=9333',
  '--allow-file-access-from-files', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', `--window-size=${W},${H}`, 'about:blank'], {stdio: 'ignore'});
let ver;
for (let i = 0; i < 50; i++) { try { ver = await (await fetch('http://127.0.0.1:9333/json/list')).json(); if (ver.length) break; } catch (e) {} await sleep(200); }
const ws = new WebSocket(ver.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map();
const errs = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : m.params.exceptionDetails.text); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({id: i, method, params})); });
const ev = async expr => { const r = await cmd('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true}); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result.result.value; };
await cmd('Runtime.enable');
await cmd('Emulation.setDeviceMetricsOverride', {width: +W, height: +H, deviceScaleFactor: 1, mobile: false});
await cmd('Page.navigate', {url: PAGE});
for (let i = 0; i < 300; i++) { try { if (await ev("!!(window.__dbg && !document.getElementById('mNew').disabled)")) break; } catch (e) {} await sleep(300); }
const D = s => ev(`window.__dbg(${JSON.stringify(s)})`);
await D(`newTraits = []; newProf = 'none'; startNew(); startPlayAfterStory(); zs.length = 0; true`);
const scene = process.argv[7] || 'street';
await D(`(() => {
  if ('${scene}' === 'street') {                        // ближайшая улица: дорога, вокруг свободно
    let best = null;
    for (let r = 1; r < 60 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = Math.floor(P.x) + dx, y = Math.floor(P.y) + dy; let ok = true;
      for (let j = -2; j <= 2 && ok; j++) for (let i = -2; i <= 2; i++) { const t = get(x + i, y + j); if (t !== ROAD && t !== WALK && t !== GRASS) { ok = false; break; } }
      if (ok && get(x, y) === WALK && !blocked(x + .5, y + .5, .4)) { best = [x + .5, y + .5]; break; }
    }
    if (best) { P.x = best[0]; P.y = best[1]; }
  }
  computeVis();
  const spot = a0 => { for (let k = 0; k < 400; k++) { const a = a0 + (Math.random() - .5) * 1.4, r = 3.2 + Math.random() * 1.8;
    const x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (!blocked(x, y, .35) && los(P.x, P.y, x, y)) return [x, y]; } return null; };
  let n = 0;
  for (const [a0, pi] of [[.1, 0], [1.7, 1], [-1.3, 2]]) { const s = spot(a0); if (!s) continue;
    const z = mkZombie(s[0], s[1], {pi: pi * 3 + 1, b:'mfh'[n], blood:0}, 999, 0); z.face = Math.atan2(P.y - z.y, P.x - z.x); z.state = 'idle'; z.spd = 0; n++; }
  P.face = .8; return n; })()`);
const frames = []; const snap = async () => { const r = await cmd('Page.captureScreenshot', {format: 'png'}); frames.push(r.result.data); };
const hold = async (codes, ms, step = 110) => { await D(`${JSON.stringify(codes)}.forEach(c => keys.add(c)); true`); for (let t = 0; t < ms; t += step) { await sleep(step - 40); await snap(); } await D(`${JSON.stringify(codes)}.forEach(c => keys.delete(c)); true`); };
await D(`zs.forEach(z => { z.spd = 1; z.state = 'chase'; }); true`);
await sleep(300);
await hold(['KeyD'], 2000);
await hold(['KeyS'], 1300);
await hold(['KeyA', 'ShiftLeft'], 1300);
await D(`P.weapon = mkItem('bat'); P.face = Math.atan2(zs[0].y - P.y, zs[0].x - P.x); true`);
for (let k = 0; k < 2; k++) { await D(`P.cd = 0; attack(); true`); for (let j = 0; j < 7; j++) { await sleep(70); await snap(); } }
fs.mkdirSync(OUT, {recursive: true});
frames.forEach((f, i) => fs.writeFileSync(OUT + '/f' + String(i).padStart(3, '0') + '.png', Buffer.from(f, 'base64')));
console.log('кадров', frames.length, 'ошибок JS', errs.length, errs.slice(0, 3).join(' | ').slice(0, 400));
ws.close(); chrome.kill();
