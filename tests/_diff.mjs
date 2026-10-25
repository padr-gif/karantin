// разностный прогон: старая и новая сборка, одинаковые действия — одинаковый итог
import {chromium} from 'playwright';
const [A, B, script] = process.argv.slice(2);
const b = await chromium.launch();
async function run(file) {
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { let s = 0x12345; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; let now = 1.8e12; Date.now = () => (now += 7); });
  await p.goto('file://' + file + '?dbg&nobmp');
  for (let k = 0; k < 100 && !(await p.evaluate(() => window.__dbg && !document.getElementById('mNew').disabled)); k++) await p.waitForTimeout(100);
  const r = await p.evaluate(s => window.__dbg(s), (await import('node:fs')).readFileSync(script, 'utf8'));
  await p.close(); return r + (errs.length ? '\nERR ' + errs.join(' | ') : '');
}
const ra = await run(A), rb = await run(B);
const la = ra.split('\n'), lb = rb.split('\n'); let bad = 0;
for (let i = 0; i < Math.max(la.length, lb.length); i++) if (la[i] !== lb[i]) { bad++; if (bad < 15) console.log('✗', i, '\n  старое:', (la[i] || '').slice(0, 300), '\n  новое: ', (lb[i] || '').slice(0, 300)); }
if (process.env.SHOW) console.log(ra.slice(0, 600)); console.log(bad ? 'различий: ' + bad : 'совпало, строк ' + la.length); await b.close();
