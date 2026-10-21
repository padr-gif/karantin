// Собирает игру в один HTML-файл: dist/karantin.html
//   node build.mjs          — релиз
//   node build.mjs --dev    — с отладочным хуком window.__dbg (нужен тестам), открывать с ?dbg
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

export function build({dev = false, pwa = false, out = 'dist/karantin.html'} = {}) {
  // 1. sprite atlas: frame rects + every sheet as a data URL
  const meta = JSON.parse(rd('assets/atlas.json'));
  meta.icons = JSON.parse(rd('assets/icons.json'));
  const png = {};
  for (const name of JSON.parse(rd('assets/sheets.json')).order)
    png[name] = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'assets/sprites', name + '.png')).toString('base64');
  const art = 'const ART_EMBED = ' + JSON.stringify({meta, png}) + ';';

  // 2. game code: all files from src/js in name order share one scope
  const dir = path.join(ROOT, 'src/js');
  const parts = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => rd('src/js/' + f));
  let js = "(() => {\n'use strict';\n" + parts.join('\n') + '\n})();\n';
  js = js.replace('/*@@ART_EMBED@@*/', () => art);
  js = js.replace('/*@@DEBUG@@*/', dev ? "if (/[?&]dbg\\b/.test(location.search)) window.__dbg = s => eval(s);" : '');

  // 3. page
  const head = pwa ? '<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#0c0f12"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Карантин"><link rel="apple-touch-icon" href="apple-touch-icon.png"><link rel="icon" href="icon-192.png">'
 : '';
  // fonts live in the page itself: an outside font server that hangs must never block the game from starting
  const FONTS = [['Oswald', 500, 'oswald-500'], ['Oswald', 700, 'oswald-700'], ['PT Sans', 400, 'ptsans-400'], ['PT Sans', 700, 'ptsans-700'], ['PT Mono', 400, 'ptmono-400']];
  const fonts = FONTS.map(([fam, w, f]) => `@font-face{font-family:"${fam}";font-weight:${w};font-style:normal;font-display:swap;src:url(data:font/woff;base64,${fs.readFileSync(path.join(ROOT, 'assets/fonts', f + '.woff')).toString('base64')}) format("woff")}`).join('\n');
  const html = rd('src/index.html').replace('/*@@FONTS@@*/', () => fonts).replace('<!--@@PWA@@-->', head).replace('/*@@CSS@@*/', () => rd('src/styles.css')).replace('/*@@SCRIPT@@*/', () => js);
  const dst = path.join(ROOT, out);
  fs.mkdirSync(path.dirname(dst), {recursive: true});
  fs.writeFileSync(dst, html);
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
    if (f === 'sw.js') fs.writeFileSync(dst, fs.readFileSync(src, 'utf8').replace('@@VERSION@@', version)); else fs.copyFileSync(src, dst);
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
