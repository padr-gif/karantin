// Собирает игру в один HTML-файл: dist/karantin.html
//   node build.mjs          — релиз
//   node build.mjs --dev    — с отладочным хуком window.__dbg (нужен тестам), открывать с ?dbg
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

export function build({dev = false, out = 'dist/karantin.html'} = {}) {
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
  const html = rd('src/index.html').replace('/*@@CSS@@*/', () => rd('src/styles.css')).replace('/*@@SCRIPT@@*/', () => js);
  const dst = path.join(ROOT, out);
  fs.mkdirSync(path.dirname(dst), {recursive: true});
  fs.writeFileSync(dst, html);
  return dst;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dev = process.argv.includes('--dev');
  const dst = build({dev, out: dev ? 'dist/karantin-dev.html' : 'dist/karantin.html'});
  console.log('Собрано:', path.relative(ROOT, dst), (fs.statSync(dst).size / 1048576).toFixed(1) + ' МБ');
}
