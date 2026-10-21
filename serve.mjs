// Локальный сервер для разработки: пересобирает игру при каждом изменении в src/ и assets/.
//   node serve.mjs  →  http://localhost:5173  (с телефона в той же Wi-Fi: http://<IP компьютера>:5173)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {build} from './build.mjs';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
let file = build({dev: true, out: 'dist/karantin-dev.html'}), timer = null;
for (const d of ['src', 'assets']) fs.watch(path.join(ROOT, d), {recursive: true}, () => {
  clearTimeout(timer);
  timer = setTimeout(() => { try { file = build({dev: true, out: 'dist/karantin-dev.html'}); console.log(new Date().toLocaleTimeString(), 'пересобрано'); } catch (e) { console.error(e.message); } }, 150);
});
http.createServer((req, res) => {
  res.writeHead(200, {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store'});
  fs.createReadStream(file).pipe(res);
}).listen(5173, '0.0.0.0', () => console.log('Игра: http://localhost:5173  (отладка: http://localhost:5173/?dbg)'));
