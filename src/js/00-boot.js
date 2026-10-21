const cv = document.getElementById('game'), mainCtx = cv.getContext('2d');
let ctx = mainCtx;
const lc = document.createElement('canvas'), lx = lc.getContext('2d');
const $ = id => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouch) document.body.classList.add('touch');
$('keysHelp').textContent = isTouch
  ? 'Левая половина экрана — джойстик. Тап справа или «Удар» — атака. «Действие» — обыскать, открыть дверь, лечь спать, попить. Держи телефон горизонтально.'
  : 'WASD — идти · Shift — бег · C — красться · мышь — направление · ЛКМ или Пробел — удар · E — действие · B — забить доской · T — перезарядка · I — рюкзак · колесо — зум';

const low = document.createElement('canvas'), lowCtx = low.getContext('2d');
let W = 0, H = 0, DPR = 1, DEV = 1, SCALE = 3, kBase = 3, zoomOff = 0, resQ = 1, slowT = 0, fastT = 0;
let gfxCap = 2;
function resize() {
  DEV = Math.max(1, Math.min(gfxCap, window.devicePixelRatio || 1) * resQ);
  const cw = innerWidth, chh = innerHeight;
  cv.width = Math.round(cw * DEV); cv.height = Math.round(chh * DEV);
  cv.style.width = cw + 'px'; cv.style.height = chh + 'px';
  const D0 = Math.min(gfxCap, window.devicePixelRatio || 1);
  kBase = Math.max(1, Math.round(Math.max(cw, chh) / 24 * D0 / 32));
  if (kBase + zoomOff < 1) zoomOff = 1 - kBase;
  SCALE = (kBase + zoomOff) * DEV / D0;
  W = cv.width / SCALE; H = cv.height / SCALE;
  lc.width = Math.ceil(W / 2); lc.height = Math.ceil(H / 2);
}
addEventListener('resize', resize); resize();

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rng = mulberry32((Date.now() ^ 0x5bd1e995) >>> 0);
const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = a => a[Math.floor(rng() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const hash = (x, y) => { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
