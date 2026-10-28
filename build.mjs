// Собирает игру в один HTML-файл: dist/karantin.html
//   node build.mjs          — релиз
//   node build.mjs --dev    — с отладочным хуком window.__dbg (нужен тестам), открывать с ?dbg
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const hash = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);

// WebP-копии листов лежат в assets/sprites/webp/<лист>.<хэш PNG>.webp. Если PNG поменялся, копия
// пересоздаётся через tools/webp.py (нужен Python + Pillow); без него сайт просто возьмёт PNG.
function webpOf(name, h) {
  const dir = path.join(ROOT, 'assets/sprites/webp'), f = path.join(dir, `${name}.${h}.webp`);
  if (fs.existsSync(f)) return f;
  fs.mkdirSync(dir, {recursive: true});
  const r = spawnSync('python3', [path.join(ROOT, 'tools/webp.py'), path.join(ROOT, 'assets/sprites', name + '.png'), f], {stdio: 'inherit'});
  if (r.status !== 0 || !fs.existsSync(f)) { console.warn('WebP для', name, 'не сделан, на сайте будет PNG'); return null; }
  for (const old of fs.readdirSync(dir)) if (old.startsWith(name + '.') && old !== path.basename(f)) fs.rmSync(path.join(dir, old));
  return f;
}

// pwa: сайт. Спрайты и шрифты тогда идут отдельными файлами в <папка сайта>/art/ с хэшем в имени:
// браузер качает их параллельно и не разбирает мегабайты текста, а service worker хранит их, пока они не поменяются.
// Без pwa всё зашито в один HTML, как раньше.
export function build({dev = false, pwa = false, out = 'dist/karantin.html'} = {}) {
  const dst = path.join(ROOT, out), assets = [], preload = [];
  const put = (file, buf, spare) => { fs.mkdirSync(path.join(path.dirname(dst), 'art'), {recursive: true}); fs.writeFileSync(path.join(path.dirname(dst), 'art', file), buf); if (!spare) assets.push('art/' + file); return 'art/' + file; };   // spare: запасной файл, в офлайн-кэш заранее не кладётся
  // 1. sprite atlas: frame rects + every sheet (a data URL, or a file on the site)
  const meta = JSON.parse(rd('assets/atlas.json'));
  meta.icons = JSON.parse(rd('assets/icons.json'));
  const png = {}, alt = {}, size = {};
  for (const name of JSON.parse(rd('assets/sheets.json')).order) {
    const buf = fs.readFileSync(path.join(ROOT, 'assets/sprites', name + '.png'));
    if (!pwa) { png[name] = 'data:image/png;base64,' + buf.toString('base64'); continue; }
    const h = hash(buf), wf = webpOf(name, h);
    alt[name] = put(`${name}.${h}.png`, buf, !!wf);
    png[name] = wf ? put(`${name}.${h}.webp`, fs.readFileSync(wf)) : alt[name];
    size[name] = wf ? fs.statSync(wf).size : buf.length;
  }
  // звуки (assets/sounds/*.mp3, Kenney CC0) — встраиваем как data URL: их немного и они маленькие
  const snd = {}, sdir = path.join(ROOT, 'assets/sounds');
  if (fs.existsSync(sdir)) for (const f of fs.readdirSync(sdir).filter(f => f.endsWith('.mp3')).sort()) snd[f.slice(0, -4)] = 'data:audio/mpeg;base64,' + fs.readFileSync(path.join(sdir, f)).toString('base64');
  const art = 'const ART_EMBED = ' + JSON.stringify(pwa ? {meta, png, alt, size} : {meta, png}) + ';\nconst SND_EMBED = ' + JSON.stringify(snd) + ';';

  // 2. game code: all files from src/js in name order share one scope
  const dir = path.join(ROOT, 'src/js');
  const parts = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => rd('src/js/' + f));
  let js = "(() => {\n'use strict';\n" + parts.join('\n') + '\n})();\n';
  js = js.replace('/*@@ART_EMBED@@*/', () => art);
  js = js.replace('/*@@DEBUG@@*/', dev ? "if (/[?&]dbg\\b/.test(location.search)) window.__dbg = s => eval(s);" : '');

  // 3. page
  // the sheets start downloading straight from <head>, while the browser is still busy with the game code
  if (pwa) preload.push(`<script>window.__pre={};(function(u){try{if(window.fetch)for(var k in u)window.__pre[k]=fetch(u[k]);}catch(e){}})(${JSON.stringify(png)})</script>`);
  const head = (pwa ? preload.join('') : '') + (pwa ? '<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#0c0f12"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Dead Line"><link rel="apple-touch-icon" href="apple-touch-icon.png"><link rel="icon" href="icon-192.png">'
 : '');
  // fonts live in the page itself: an outside font server that hangs must never block the game from starting
  const FONTS = [['Oswald', 500, 'oswald-500'], ['Oswald', 700, 'oswald-700'], ['PT Sans', 400, 'ptsans-400'], ['PT Sans', 700, 'ptsans-700'], ['PT Mono', 400, 'ptmono-400']];
  // (on the site they are files of our own, same origin, so that rule still holds)
  const fonts = FONTS.map(([fam, w, f]) => {
    const buf = fs.readFileSync(path.join(ROOT, 'assets/fonts', f + '.woff'));
    const src = pwa ? put(`${f}.${hash(buf)}.woff`, buf) : 'data:font/woff;base64,' + buf.toString('base64');
    return `@font-face{font-family:"${fam}";font-weight:${w};font-style:normal;font-display:swap;src:url(${src}) format("woff")}`;
  }).join('\n');
  const html = rd('src/index.html').replace('/*@@FONTS@@*/', () => fonts).replace('<!--@@PWA@@-->', head).replace('/*@@CSS@@*/', () => rd('src/styles.css')).replace('/*@@SCRIPT@@*/', () => js);
  fs.mkdirSync(path.dirname(dst), {recursive: true});
  fs.writeFileSync(dst, html);
  build.assets = assets;
  return dst;
}

// сайт-приложение (PWA) для GitHub Pages: папка site/
export function buildSite() {
  const dir = path.join(ROOT, 'site');
  fs.rmSync(dir, {recursive: true, force: true}); fs.mkdirSync(dir, {recursive: true});
  build({pwa: true, out: 'site/index.html'});
  const version = JSON.parse(rd('package.json')).version + '-' + Date.now().toString(36);
  for (const f of fs.readdirSync(path.join(ROOT, 'pwa'))) {
    const src = path.join(ROOT, 'pwa', f), dst = path.join(dir, f);
    if (f === 'sw.js') fs.writeFileSync(dst, fs.readFileSync(src, 'utf8').replace('@@VERSION@@', version).replace('/*@@ASSETS@@*/', build.assets.map(a => JSON.stringify('./' + a)).join(', '))); else fs.copyFileSync(src, dst);
  }
  fs.writeFileSync(path.join(dir, '.nojekyll'), '');
  return dir;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--site')) { console.log('Сайт собран:', path.relative(ROOT, buildSite())); process.exit(0); }
  const dev = process.argv.includes('--dev');
  const dst = build({dev, out: dev ? 'dist/karantin-dev.html' : 'dist/karantin.html'});
  console.log('Собрано:', path.relative(ROOT, dst), (fs.statSync(dst).size / 1048576).toFixed(1) + ' МБ');
}
