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
// iOS в режиме «На экран Домой» иногда «застревает» с укороченной высотой окна (после поворота, сворачивания):
// снизу остаётся чёрная полоса. Ожидаемая высота — короткая или длинная сторона экрана; если окно меньше,
// один раз заставляем WebKit перемерить окно (скрыть и показать body), а если не помогло — растягиваем холст сами.
const standalone = () => navigator.standalone === true || (window.matchMedia && (matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches));
let vpTried = '', vpStretch = false;
function expectedH() { const a = Math.min(screen.width, screen.height), b = Math.max(screen.width, screen.height); return innerWidth > innerHeight ? a : b; }
function viewH() {
  const h = innerHeight;
  if (!standalone() || !/iP(hone|ad|od)|Macintosh/.test(navigator.userAgent) || !('ontouchend' in document)) return h;
  const exp = expectedH(), key = (innerWidth > innerHeight ? 'L' : 'P') + exp;
  if (exp - h <= 4 || exp - h > 140) { vpStretch = false; return h; }
  if (vpTried !== key) {                                           // перемерить один раз на ориентацию
    vpTried = key; const b = document.body; b.style.display = 'none'; void b.offsetHeight; b.style.display = '';
    if (exp - innerHeight <= 4) return innerHeight;
  }
  vpStretch = true; return exp;
}
// большой экран (планшет) в «Экономии»: картинку можно считать в 0.75 от размера экрана — на треть меньше пикселей за кадр
const devMin = () => gfxCap <= 1.5 && innerWidth * innerHeight > 800000 ? .75 : 1;
function resize() {
  const cw = innerWidth, chh = viewH();
  DEV = Math.max(devMin(), Math.min(gfxCap, window.devicePixelRatio || 1) * resQ);
  if (gfxCap <= 1.5) DEV = Math.min(DEV, Math.max(.6, Math.sqrt(1.3e6 / (cw * chh))));   // «Экономия»: не больше ~1.3 Мп холста (планшеты)
  cv.width = Math.round(cw * DEV); cv.height = Math.round(chh * DEV);
  cv.style.width = cw + 'px'; cv.style.height = chh + 'px'; cv.style.bottom = vpStretch ? 'auto' : '';
  // 100vh on phones can include the strip under the system buttons; panels size themselves to what is really visible
  document.documentElement.style.setProperty('--vh', chh + 'px');
  const D0 = Math.min(gfxCap, window.devicePixelRatio || 1);
  kBase = Math.max(1, Math.round(Math.max(cw, chh) / 24 * D0 / 32));
  if (kBase + zoomOff < 1) zoomOff = 1 - kBase;
  SCALE = (kBase + zoomOff) * DEV / D0;
  W = cv.width / SCALE; H = cv.height / SCALE;
  lc.width = Math.ceil(W / 2); lc.height = Math.ceil(H / 2);
}
addEventListener('resize', resize); resize();
// A phone can still be unfolding the app to full screen when the game starts, and some browsers never send a
// "resize" for that. So the size is compared every frame and, if it changed, everyone hears a normal resize event.
{ let lw = innerWidth, lh = innerHeight;
  let wn = 0;
  const watch = () => { if (++wn % 15 === 0 && (innerWidth !== lw || innerHeight !== lh)) { lw = innerWidth; lh = innerHeight; dispatchEvent(new Event('resize')); } requestAnimationFrame(watch); };
  requestAnimationFrame(watch);
  if (window.visualViewport) visualViewport.addEventListener('resize', () => requestAnimationFrame(() => dispatchEvent(new Event('resize'))));
  addEventListener('pageshow', () => dispatchEvent(new Event('resize')));
  addEventListener('orientationchange', () => { vpTried = ''; setTimeout(() => dispatchEvent(new Event('resize')), 300); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { vpTried = ''; setTimeout(() => dispatchEvent(new Event('resize')), 300); } }); }

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rng = mulberry32((Date.now() ^ 0x5bd1e995) >>> 0);
const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = a => a[Math.floor(rng() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const hash = (x, y) => { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
