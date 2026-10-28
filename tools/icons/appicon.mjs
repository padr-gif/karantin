// Иконка приложения: рисует tools/icons/appicon.svg (силуэт зомби за окном) в PNG нужных размеров.
//   node tools/icons/appicon.mjs pwa
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const {chromium} = createRequire(import.meta.url)('playwright');
const out = process.argv[2] || 'pwa';
const svg = fs.readFileSync(new URL('./appicon.svg', import.meta.url), 'utf8');
const BG = '#cfc8b8';   // фон под маску Android
const page = s => `<body style="margin:0;background:${BG}"><div style="width:${s}px;height:${s}px;display:flex;align-items:center;justify-content:center">${svg}</div></body>`;
fs.mkdirSync(out, {recursive: true});
const b = await chromium.launch(), pg = await b.newPage();
const shot = async (size, file, inner = size) => {
  await pg.setViewportSize({width: size, height: size});
  await pg.setContent(page(size).replace('width="512" height="512"', `width="${inner}" height="${inner}"`));
  await pg.screenshot({path: path.join(out, file)});
};
await shot(512, 'icon-512.png');
await shot(192, 'icon-192.png');
await shot(180, 'apple-touch-icon.png');
await shot(512, 'icon-maskable.png', 410);   // маска Android срезает края: рисунок в безопасной зоне 80%
await b.close();
console.log('ok');
