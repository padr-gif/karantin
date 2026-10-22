// Скриншот игры с новыми персонажами: Chromium через протокол отладки (без Playwright).
//   node build.mjs --dev && node tools/mh3d/ingame_shot.mjs "file://$PWD/dist/karantin-dev.html?dbg" спрайты.json out.png 1280 600 street|home
import {spawn} from 'node:child_process';
import fs from 'node:fs';
const [, , PAGE, SPR, OUT, W = '1280', H = '600'] = process.argv;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn('/opt/pw-browsers/chromium-1194/chrome-linux/chrome', ['--headless=new', '--no-sandbox', '--remote-debugging-port=9333',
  '--allow-file-access-from-files', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', `--window-size=${W},${H}`, 'about:blank'], {stdio: 'ignore'});
let ver;
for (let i = 0; i < 50; i++) { try { ver = await (await fetch('http://127.0.0.1:9333/json/list')).json(); if (ver.length) break; } catch (e) {} await sleep(200); }
const ws = new WebSocket(ver.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({id: i, method, params})); });
const ev = async expr => { const r = await cmd('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true}); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result.result.value; };
await cmd('Emulation.setDeviceMetricsOverride', {width: +W, height: +H, deviceScaleFactor: 1, mobile: false});
await cmd('Page.navigate', {url: PAGE});
for (let i = 0; i < 300; i++) { try { if (await ev("!!(window.__dbg && !document.getElementById('mNew').disabled)")) break; } catch (e) {} await sleep(300); }
const spr = fs.readFileSync(SPR, 'utf8');
await ev(`window.__MHdata = ${spr}; true`);
await ev(`(async () => {
  const mk = o => new Promise(r => { const im = new Image(); im.onload = () => r({im, ax:o.ax, ay:o.ay}); im.src = o.src; });
  const D = window.__MHdata; window.__MH = {p: await Promise.all(D.p.map(mk)), z: await Promise.all(D.z.map(a => Promise.all(a.map(mk))))};
  return true; })()`);
const D = s => ev(`window.__dbg(${JSON.stringify(s)})`);
await D(`newTraits = []; newProf = 'none'; startNew(); startPlayAfterStory(); zs.length = 0; true`);
await D(`drawChar = function (ent, name, palKey, pal, wx, wy, zoff, flash, alpha) {
  const d = +name.split('_')[2] || 0, M = window.__MH;
  const set = ent === P ? M.p : M.z[((ent.pal && ent.pal.pi) || 0) % M.z.length]; const f = set[d];
  const CS = 2, dx = rd(SX(wx, wy) - f.ax / CS), dy = rd(SY(wx, wy, zoff || 0) - f.ay / CS);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (alpha != null && alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(f.im, dx, dy, f.im.width / CS, f.im.height / CS);
  ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false; }; true`);
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
  const spot = a0 => { for (let k = 0; k < 400; k++) { const a = a0 + (Math.random() - .5) * 1.4, r = 1.6 + Math.random() * 1.8;
    const x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (!blocked(x, y, .35) && los(P.x, P.y, x, y)) return [x, y]; } return null; };
  let n = 0;
  for (const [a0, pi] of [[.1, 0], [1.7, 1], [-1.3, 2]]) { const s = spot(a0); if (!s) continue;
    const z = mkZombie(s[0], s[1], {pi, b:'m', blood:0}, 999, 0); z.face = Math.atan2(P.y - z.y, P.x - z.x); z.state = 'idle'; z.spd = 0; n++; }
  P.face = .8; return n; })()`);
await sleep(1200);
const shot = await cmd('Page.captureScreenshot', {format: 'png'});
fs.writeFileSync(OUT, Buffer.from(shot.result.data, 'base64'));
console.log('saved', OUT, await D(`JSON.stringify({x:P.x.toFixed(1), y:P.y.toFixed(1), zs:zs.length, t:typeof gameTime !== 'undefined' ? gameTime : null})`));
ws.close(); chrome.kill();
