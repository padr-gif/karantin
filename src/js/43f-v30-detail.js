// ================= v30: детальная графика в духе Project Zomboid + счётчик FPS =================
// Мебель рендерится из 3D-моделей втрое крупнее (лист furn3, кадры hd_<имя>, восьмое поле кадра — масштаб).
// В детальном режиме такой кадр рисуется уменьшенным со сглаживанием: на телефоне, где мир растянут ~3×,
// это один пиксель картинки на пиксель экрана — видны волокна дерева, ткань, скругления. В пиксельном режиме
// всё как раньше. Детальный режим — это прежний «гладкий» (стены и полы тоньше) плюс эти кадры.

// ---- кадры повышенной детализации ----
const hdFrame = name => HDQ > 1 && ART.meta.frames['hd_' + name];
function hdFogged(fr, f, tint) {
  const fq = Math.round(f * 20) / 20, k = fr[1] + ',' + fr[2] + '|' + fq + '|' + (tint || '');
  let c = HDFOG.get(k);
  if (c) { HDFOG.delete(k); HDFOG.set(k, c); return c; }
  c = mkCanvas(fr[3], fr[4]); const g = c.getContext('2d');
  g.drawImage(ART.imgs[fr[0]], fr[1], fr[2], fr[3], fr[4], 0, 0, fr[3], fr[4]);
  g.globalCompositeOperation = 'source-atop';
  if (tint) { g.fillStyle = tint; g.fillRect(0, 0, fr[3], fr[4]); }
  g.fillStyle = `rgba(6,8,14,${(1 - fq) * .95})`; g.fillRect(0, 0, fr[3], fr[4]);
  HDFOG.set(k, c);
  if (HDFOG.size > 140) { let n = 30; for (const key of HDFOG.keys()) { HDFOG.delete(key); if (--n <= 0) break; } }
  return c;
}
// детальная графика: кадр высокого разрешения, если есть
function objAtDraw(id, name, wx, wy, f, alpha, offX, tint) {
  const fr = hdFrame(name);
  if (!fr) return objAtVec(id, name, wx, wy, f, alpha, offX, tint);
  const s = fr[7] || 1, src = f >= .99 && !tint ? null : hdFogged(fr, f, tint);
  // к пикселю экрана, а не мира: иначе при движении кадр дрожит на долю мирового пикселя
  const q = DPR || 1, x = Math.round((SX(wx, wy) - fr[5] / s + (offX || 0)) * q) / q, y = Math.round((SY(wx, wy, 0) - fr[6] / s) * q) / q;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (alpha != null && alpha < 1) ctx.globalAlpha = alpha;
  if (src) ctx.drawImage(src, x, y, fr[3] / s, fr[4] / s);
  else ctx.drawImage(ART.imgs[fr[0]], fr[1], fr[2], fr[3], fr[4], x, y, fr[3] / s, fr[4] / s);
  ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
}

// ---- настройка: «Пиксели» или «Детальная»; детальная теперь по умолчанию ----
SETTINGS_DEF.smooth = true;
if (settings.gfxv !== 30) { settings.smooth = true; settings.gfxv = 30; try { localStorage.setItem('karantin-settings', JSON.stringify(settings)); } catch (e) {} }
SETTINGS_DEF.fps = false;

// ---- счётчик FPS и памяти: включается в настройках или адресом ?fps ----
const FPS = {el:null, frames:0, t0:0, worst:0, last:0, rt:0, ut:0, txt:''};
const fpsOn = () => settings.fps || /[?&]fps\b/.test(location.search);
function fpsEl() {
  if (FPS.el) return FPS.el;
  const d = document.createElement('div'); d.id = 'fpsBox';
  d.style.cssText = 'position:fixed;left:50%;top:max(4px,env(safe-area-inset-top));transform:translateX(-50%);z-index:60;pointer-events:none;' +
    'font:600 11px/1.35 "PT Mono",monospace;color:#e8e4d8;background:rgba(10,12,14,.72);padding:3px 8px;border-radius:6px;white-space:pre;text-align:center';
  document.body.appendChild(d); return FPS.el = d;
}
const mbOf = c => c ? c.width * c.height * 4 / 1048576 : 0;
function fpsMem() {
  let spr = 0, cache = 0;
  for (const n in ART.imgs) { const im = ART.imgs[n]; spr += (im.naturalWidth || im.width) * (im.naturalHeight || im.height) * 4 / 1048576; }
  for (const ch of CHUNKS.values()) cache += mbOf(ch.c);
  for (const s of SPR.values()) cache += mbOf(s.c);
  for (const c of frameCache.values()) cache += mbOf(c.cv);
  for (const c of HDFOG.values()) cache += mbOf(c);
  const js = performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0;
  return {spr, cache, js};
}
// время логики и отрисовки копит главный цикл (frameBody): FPS.ut, FPS.rt
function fpsTick() {
  requestAnimationFrame(fpsTick);
  if (!fpsOn()) { if (FPS.el) FPS.el.hidden = true; return; }
  const t = performance.now(), el = fpsEl(); el.hidden = false;
  if (FPS.last) FPS.worst = Math.max(FPS.worst, t - FPS.last);
  FPS.last = t; FPS.frames++;
  if (!FPS.t0) { FPS.t0 = t; FPS.rt = FPS.ut = 0; return; }
  if (t - FPS.t0 >= 1000) {
    const fps = FPS.frames * 1000 / (t - FPS.t0), m = fpsMem(), n = FPS.frames;
    el.textContent = `FPS ${fps.toFixed(0)}  мин ${(1000 / Math.max(FPS.worst, 1)).toFixed(0)}  отрисовка ${(FPS.rt / n).toFixed(1)} мс  логика ${(FPS.ut / n).toFixed(1)} мс\n` +
      `спрайты ${m.spr.toFixed(0)} МБ  кэш ${m.cache.toFixed(0)} МБ` + (m.js ? `  JS ${m.js.toFixed(0)} МБ` : '') + `  ${settings.smooth ? 'детальная ×' + HDQ : 'пиксели'}  разр. ${(resQ * 100).toFixed(0)}%`;
    FPS.t0 = t; FPS.frames = 0; FPS.worst = 0; FPS.rt = FPS.ut = 0;
  }
}
requestAnimationFrame(fpsTick);

// ---- память кэша: куски мира в детальном режиме ×3 весят ~5 МБ каждый; держим не больше ~48 МБ ----
// (раньше лимит был числом кусков — 22, это до 105 МБ при ×3). Выкидываем самые давние, но не те, что нужны в этом кадре.
const CHUNK_BUDGET = 48 * 1048576;
const evict30 = evict;
evict = function () {
  evict30();
  if (HDQ <= 1) return;
  let bytes = 0; for (const ch of CHUNKS.values()) bytes += ch.c.width * ch.c.height * 4;
  if (bytes <= CHUNK_BUDGET) return;
  const arr = [...CHUNKS].filter(e => e[1].used < frameNo - 1).sort((a, b) => a[1].used - b[1].used);
  for (const [k, ch] of arr) { if (bytes <= CHUNK_BUDGET * .8) break; bytes -= ch.c.width * ch.c.height * 4; CHUNKS.delete(k); }
};
