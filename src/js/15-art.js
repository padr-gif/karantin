// ================= art atlas =================
// Sprites live in art/*.png with rects in art/atlas.json (made by gen.py). Character sheets are
// palette-key encoded (R = slot*16+8, G = shade*64+32) and recoloured here per palette.
const ART = {meta:null, imgs:{}, ready:false, failed:false};
// ---- листы по требованию (v81): героев 24 листа (оба пола × одежда, ~400 МБ в памяти), а в игре нужны 2;
// мебель детальной графики (furn3) — только в детальной. Такие листы скачиваются как все (для игры без сети), но в
// память раскрываются при первом обращении: needSheet(n) → true, если уже готов; иначе начинает раскрывать и false
// (кадр пропускается и ничего пустого не кэшируется). На планшете все 34 листа сразу — ~600 МБ, и игра тормозила.
const ART_LAZY = n => /^pchar_/.test(n) || (n === 'furn3' && !(typeof settings !== 'undefined' && settings.smooth));   // детальная включена — furn3 сразу
ART.src = {}; ART.pend = new Set();
function needSheet(n) {
  if (ART.imgs[n]) return true;
  const src = ART.src[n]; if (!src || ART.pend.has(n)) return false;
  ART.pend.add(n);
  const im = new Image(), url = typeof src === 'string' ? src : URL.createObjectURL(src);
  im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => {
    ART.imgs[n] = im; ART.pend.delete(n);
    if (n === 'furn3' && typeof SPR !== 'undefined') {                        // мебель была нарисована запасным способом — пересобрать только её
      for (const k of [...SPR.keys()]) if (typeof k === 'string' && k[0] === 'F') SPR.delete(k);
      if (typeof HDFOG !== 'undefined') HDFOG.clear();
    }
  });
  im.onerror = () => {                                                         // нет WebP — берём PNG; совсем не открылся — больше не пробуем
    ART.pend.delete(n);
    ART.src[n] = typeof src !== 'string' && ART_EMBED && ART_EMBED.alt && ART_EMBED.alt[n] ? ART_EMBED.alt[n] : null;
    if (typeof logErr === 'function' && !ART.src[n]) logErr(new Error('лист ' + n + ' не открылся'), 'needSheet');
  };
  im.src = url; return false;
}
/*@@ART_EMBED@@*/
// Sheets are decoded two at a time with progress on the loading screen; a sheet that fails is retried once.
// (Ten big images at once used to stall weak phones, and a single 20-second cap for all of them was too tight.)
// On the site sheets are separate files: they are fetched as streams so the loading screen shows real megabytes,
// a slow connection is never cut off (only 25 s with no bytes at all counts as a failure), each sheet gets three tries,
// and a sheet already loaded is kept when the player presses "retry".
function loadArtFiles() {
  const names = Object.keys(ART_EMBED.png).filter(n => !ART.imgs[n] && !ART.src[n]), size = ART_EMBED.size || {};
  const boot = (k, t) => { try { window.__boot && window.__boot(k, t); } catch (e) {} };
  const total = Object.values(size).reduce((a, b) => a + b, 0) || 1, mb = v => (v / 1048576).toFixed(1).replace('.', ',');
  let got = Object.keys(ART.imgs).concat(Object.keys(ART.src)).reduce((a, n) => a + (size[n] || 0), 0), done = Object.keys(ART.imgs).length + Object.keys(ART.src).length;
  const N = Object.keys(ART_EMBED.png).length;
  const show = () => boot(.08 + .84 * Math.min(1, got / total), done < N ? 'Загружаю спрайты: ' + mb(got) + ' из ' + mb(total) + ' МБ' : 'Почти готово…');
  show();
  const pre = window.__pre || {};
  const download = (n, url, first) => new Promise((res, rej) => {
    const ac = window.AbortController ? new AbortController() : null; let tm = 0, mine = 0;
    const quiet = () => { clearTimeout(tm); tm = setTimeout(() => { if (ac) ac.abort(); rej(new Error('сеть молчит')); }, 25000); };
    quiet();
    const req = first && pre[n] ? pre[n] : fetch(url, ac ? {signal: ac.signal} : undefined);
    req.then(r => {
      if (!r.ok) throw new Error('код ' + r.status);
      const type = r.headers.get('content-type') || '';
      if (!r.body || !r.body.getReader) return r.blob();
      const rd = r.body.getReader(), parts = [];
      const pump = () => rd.read().then(({done: end, value}) => {
        if (end) return new Blob(parts, {type});
        quiet(); parts.push(value); mine += value.length; got += value.length; show(); return pump();
      });
      return pump();
    }).then(b => { clearTimeout(tm); res(b); }, e => { clearTimeout(tm); got -= mine; show(); rej(e); });
  });
  const decode = blob => new Promise((res, rej) => {
    const im = new Image(); im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => res(im)); im.onerror = () => rej(new Error('не открылся'));
    im.src = URL.createObjectURL(blob);
  });
  let decoding = Promise.resolve();   // big sheets are unpacked one at a time: weak phones choke on several at once
  const one = (n, tries, alt) => {
    const url = alt ? ART_EMBED.alt[n] : ART_EMBED.png[n];
    return download(n, url, tries === 0 && !alt)
      .then(b => ART_LAZY(n) ? (ART.src[n] = b, null) : (decoding = decoding.catch(() => {}).then(() => decode(b))))   // по требованию: только скачать
      .then(im => { if (im) ART.imgs[n] = im; done++; show(); }, e => {
        if (!alt && ART_EMBED.alt && /не открылся|код 4/.test(e.message)) return one(n, tries, true);   // no WebP here (or no such file): take the PNG
        if (tries < 2) return one(n, tries + 1, alt);
        throw new Error('спрайт ' + n + ' не загрузился (' + e.message + ')');
      });
  };
  return Promise.all(names.map(n => one(n, 0, false))).then(() => {
    ART.meta = ART_EMBED.meta; ART.ready = true;
    document.documentElement.style.setProperty('--icons', 'url(' + ART.imgs.icons.src + ')');
    boot(.97, 'Почти готово…');
  });
}
// загрузка атласов; на Android листы потом переводятся в ImageBitmap
function loadArt() { return loadArtSheets().then(r => { if (BIG_SHEETS_BMP) sheetsToBitmaps(); return r; }); }
function loadArtSheets() {
  const names = ART_EMBED ? Object.keys(ART_EMBED.png) : ['obj'];
  if (ART_EMBED && ART_EMBED.alt) return loadArtFiles();
  if (ART_EMBED) {
    for (const n of names) if (ART_LAZY(n)) ART.src[n] = ART_EMBED.png[n];      // по требованию: раскроем, когда понадобится
    const q = names.filter(n => !ART_LAZY(n)), N = q.length; let done = 0;
    const boot = (k, t) => { try { window.__boot && window.__boot(k, t); } catch (e) {} };
    boot(.12, 'Распаковываю спрайты…');
    const one = n => new Promise((res, rej) => {
      const im = new Image(), t = setTimeout(() => rej(new Error('спрайт ' + n + ' не распаковался')), 60000);
      im.onload = () => { clearTimeout(t); (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => { ART.imgs[n] = im; done++; boot(.12 + .83 * done / N, 'Распаковываю спрайты: ' + done + ' из ' + N); res(); }); };
      im.onerror = () => { clearTimeout(t); rej(new Error('спрайт ' + n + ' повреждён')); };
      im.src = ART_EMBED.png[n];
    });
    const next = () => q.length ? (n => one(n).catch(() => one(n)))(q.shift()).then(next) : Promise.resolve();
    return Promise.all([next(), next()]).then(() => { ART.meta = ART_EMBED.meta; ART.ready = true; if (ART_EMBED.png.icons) document.documentElement.style.setProperty('--icons', 'url(' + (ART.imgs.icons.currentSrc || ART.imgs.icons.src) + ')'); boot(.97, 'Почти готово…'); });
  }
  return fetch('art/atlas.json').then(r => { if (!r.ok) throw new Error('atlas'); return r.json(); }).then(meta =>
    Promise.all(names.map(n => new Promise((res, rej) => { const im = new Image(); im.onload = () => { ART.imgs[n] = im; res(); }; im.onerror = rej; im.src = 'art/' + n + '.png'; })))
      .then(() => { ART.meta = meta; ART.ready = true; }));
}
// palettes: slot -> rgb (0 outline,1 skin,2 hair,3 shirt,4 sleeve,5 pants,6 shoes,7 eye,8 mouth,9 blood,10 pack,11 handle,12 head,13 belt)
const PBASE = {0:[24,20,18], 1:[214,176,138], 2:[60,44,30], 3:[56,92,128], 4:[56,92,128], 5:[48,52,64], 6:[44,38,34], 7:[30,24,20], 8:[90,20,16], 9:[56,92,128], 10:[108,86,56], 11:[40,36,34], 12:[150,156,162], 13:[36,32,30]};
const WCOL = {pan:[[46,46,48],[74,76,80]], crowbar:[[160,40,34],[62,64,68]], knife:[[40,36,34],[200,204,208]], hammer:[[122,88,56],[120,124,130]], bat:[[176,132,82],[176,132,82]], pipe:[[125,130,136],[125,130,136]], axe:[[122,88,56],[160,166,172]]};
const ZPALS = [];
{
  const r = mulberry32(99);
  const pk = a => a[Math.floor(r() * a.length)];
  for (let k = 0; k < 10; k++) {
    const skin = ZSKIN[k % ZSKIN.length], shirt = pk(ZCLOTH), bald = r() < .3;
    ZPALS.push({0:[22,20,18], 1:skin, 2:bald ? skin.map(v => v * .9) : pk(HAIR), 3:shirt, 4:r() < .5 ? shirt : skin, 5:pk(ZPANTS), 6:[40,36,34], 7:[70,10,8], 8:[56,8,6],
      9:r() < .75 ? [112,22,16] : shirt, 10:[0,0,0], 11:[0,0,0], 12:[0,0,0], 13:shirt, bald});
  }
}
{
  // uniforms: police, doctor, worker, soldier, jogger (sprinter)
  const base = ZPALS[0];
  const U5 = [{3:[40,52,88], 4:[40,52,88], 5:[34,38,56], 13:[20,20,22], 2:[40,32,26]},
              {3:[214,216,212], 4:[214,216,212], 5:[110,150,146], 9:[150,30,24]},
              {3:[214,118,36], 4:[214,118,36], 5:[60,70,96], 2:[220,190,60]},
              {3:[86,94,62], 4:[86,94,62], 5:[80,88,58], 6:[40,36,30], 2:[70,74,52]},
              {3:[190,50,46], 4:null, 5:null, 6:[220,220,214]}];
  for (const u of U5) {
    const p = Object.assign({}, ZPALS[ZPALS.length % 10]);
    for (const k in u) p[k] = u[k] || p[1];
    if (!u[9]) p[9] = [112,22,16];
    ZPALS.push(p);
  }
}
const rd = v => Math.round(v * DPR) / DPR;
function frameOf(name) { return ART.meta.frames[name]; }
function blitObj(name, sx, sy) {
  const h = HDQ > 1 && ART.meta.frames['hd_' + name];                          // детальный кадр, если есть
  if (h && needSheet(h[0])) {
    const s = h[7] || 1, sm = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(ART.imgs[h[0]], h[1], h[2], h[3], h[4], sx - h[5] / s, sy - h[6] / s, h[3] / s, h[4] / s);
    ctx.imageSmoothingEnabled = sm; return;
  }
  const f = ART.meta.frames[name]; if (!f) return;
  ctx.drawImage(ART.imgs[f[0]], f[1], f[2], f[3], f[4], rd(sx - f[5]), rd(sy - f[6]), f[3], f[4]);
}
// ---- characters: palette-keyed frames recoloured on demand (LRU) ----
const SHADE8 = [.5, .58, .66, .74, .82, .89, .95, 1];
const frameCache = new Map(); let recolorsThisFrame = 0;
const FRAME_MAX = 1600;   // кадры персонажей ~35 КБ: 1600 ≈ 55 МБ. При 640 в толпе кадры выкидывались и перекрашивались заново ~45 раз в секунду
// один пиксель кадра персонажа: R — слот палитры, G — ступень тени; у кадров из tools/mh3d (метка G&31 = 8)
// точная яркость лежит в B (0..240 -> .3..1.35, 16 уровней), а тени на коже теплее — как в превью рендера
function keyPx(a, i, pal) {
  const s = a[i] >> 4, col = pal[s] || [255, 0, 255], flat = s === 0 || s === 7 || s === 8;
  if ((a[i + 1] & 31) === 8) {
    const m = flat ? 1 : .3 + a[i + 2] * (1.05 / 240), k = s === 1 && m < 1 ? Math.min(.6, (1 - m) * .6) : 0;
    a[i] = Math.min(255, col[0] * m); a[i + 1] = Math.min(255, col[1] * m * (1 - k * .45)); a[i + 2] = Math.min(255, col[2] * m * (1 - k * .64));
  } else {
    const m = flat ? 1 : SHADE8[a[i + 1] >> 5];
    a[i] = Math.min(255, col[0] * m); a[i + 1] = Math.min(255, col[1] * m); a[i + 2] = Math.min(255, col[2] * m);
  }
}
function recolor8(f, pal) {
  const c = mkCanvas(f[3], f[4]), g = c.getContext('2d', {willReadFrequently:true});   // перекраска читает пиксели: холст в памяти, без чтения с видеокарты
  g.drawImage(ART.imgs[f[0]], f[1], f[2], f[3], f[4], 0, 0, f[3], f[4]);
  if (f[8] === 1) return pal && pal.outfit ? dressFrame(f, c, pal.outfit) : {cv:c, ax:f[5], ay:f[6], w:f[3], h:f[4], s:f[7] || 1};   // цветной кадр (готовая модель): не перекрашиваем
  const d = g.getImageData(0, 0, f[3], f[4]), a = d.data;
  for (let i = 0; i < a.length; i += 4) if (a[i + 3]) keyPx(a, i, pal);
  g.putImageData(d, 0, 0);
  return {cv:c, ax:f[5], ay:f[6], w:f[3], h:f[4], s:f[7] || ART.meta.charScale || 1};   // s: пикселей кадра на игровой пиксель
}
// кадр персонажа в его цветах (перекраска палитры, LRU-кэш); холст помечен _st — для запекания в ImageBitmap
const RECOLOR_MAX = /Android/i.test(navigator.userAgent) ? 8 : 16;          // перекрасок за кадр: толпа появляется за пару кадров, без рывка
function charFrame(name, palKey, pal, force) {
  const k = palKey + '|' + name; let c = frameCache.get(k);
  if (c) { frameCache.delete(k); frameCache.set(k, c); c.cv._st = true; return c; }
  if (!force && recolorsThisFrame > RECOLOR_MAX) return null;
  const f = ART.meta.frames[name]; if (!f) return null;
  if (!needSheet(f[0])) return null;                                          // лист ещё раскрывается (по требованию)
  { const rn = f[0] + 'r'; if (pal && pal.outfit && (ART.src[rn] || ART.imgs[rn]) && !needSheet(rn)) return null; }
  recolorsThisFrame++;
  c = recolor8(f, pal); frameCache.set(k, c);
  if (frameCache.size > FRAME_MAX) { let n = 200; for (const key of frameCache.keys()) { frameCache.delete(key); if (--n <= 0) break; } }
  if (c && c.cv) c.cv._st = true;
  return c;
}
function drawChar(ent, name, palKey, pal, wx, wy, zoff, flash, alpha, force) {
  const c = charFrame(name, palKey, pal, force) || ent._lc; if (!c) return;
  ent._lc = c;
  const CS = c.s || 1;
  const dx = rd(SX(wx, wy) - c.ax / CS), dy = rd(SY(wx, wy, zoff || 0) - c.ay / CS);
  // детальные кадры (×2) в детальном режиме — со сглаживанием, в пиксельном — без: мир там чёткий пиксель
  ctx.imageSmoothingEnabled = CS > 1 && HDQ > 1; ctx.imageSmoothingQuality = 'high';
  if (alpha != null && alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(c.cv, dx, dy, c.w / CS, c.h / CS);
  if (flash) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .4; ctx.drawImage(c.cv, dx, dy, c.w / CS, c.h / CS); ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
}
// weapons drawn in the hand from per-frame hand data (lengths in model units)
const WSPEC = {
  knife:{segs:[[0, 2.6, .9, '#2a2624'], [2.6, 6.6, .75, '#c9cdd1']]},
  hammer:{segs:[[0, 6.2, .8, '#8c643e']], head:{at:6.2, w:1.5, len:1.7, col:'#7c8086'}},
  bat:{segs:[[0, 5, .8, '#b08452'], [5, 11.5, 1.55, '#b88a58']]},
  pipe:{segs:[[0, 11.5, 1.05, '#868c92']]},
  axe:{segs:[[0, 10.5, .8, '#8c643e']], blade:{at:9.4, col:'#a8aeb4'}},
  pan:{segs:[[0, 4.6, .8, '#2e2e30']], disc:{at:7.2, r:2.7, col:'#38383c'}},
  crowbar:{segs:[[0, 10.5, .8, '#a62a22'], [10.5, 11.8, .8, '#3e4044']]},
  baton:{segs:[[0, 3, 1, '#2a2a2e'], [3, 9.5, .95, '#1c1c20']]},
};
function drawWeapon(name, wid, wx, wy, zoff) {
  { const wm = ART.meta.wpn && ART.meta.wpn[name];                              // свободная рука (WPN_LOOSE): оружие смотрит туда, куда герой
    if (wm && WPN_LOOSE.test(name)) {
      const f = P.fd != null ? P.fd : P.face, fx = Math.cos(f), fy = Math.sin(f), long = TWO_H.has(wid);
      let x = fx * (long ? .84 : .6), y = fy * (long ? .84 : .6), z = -1;      // длинное — наклонено сильнее, чтобы не чиркать по земле
      const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l;
      ART.meta.wpn.__w = [wm[0], wm[1], (x - y) * 32 * .08, ((x + y) * 16 - z * 31) * .08, wm[4]];
      name = '__w';
    } }
  const wm = ART.meta.wpn && ART.meta.wpn[name], sp = WSPEC[wid]; if (!wm || !sp) return;
  const hx = SX(wx, wy) + wm[0], hy = SY(wx, wy, zoff || 0) + wm[1], dx = wm[2], dy = wm[3];
  const L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L;
  const pt = u => [hx + dx * (u - 1), hy + dy * (u - 1)];
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const pass of [0, 1]) for (const [u0, u1, w, col] of sp.segs) {
    const a = pt(u0), b = pt(u1);
    ctx.strokeStyle = pass ? col : 'rgba(16,14,12,.85)'; ctx.lineWidth = pass ? w : w + .7;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  if (sp.head) { const c = pt(sp.head.at); ctx.strokeStyle = 'rgba(16,14,12,.85)'; ctx.lineWidth = sp.head.w + .7; ctx.beginPath(); ctx.moveTo(c[0] - px * sp.head.len, c[1] - py * sp.head.len); ctx.lineTo(c[0] + px * sp.head.len, c[1] + py * sp.head.len); ctx.stroke(); ctx.strokeStyle = sp.head.col; ctx.lineWidth = sp.head.w; ctx.stroke(); }
  if (sp.blade) { const c = pt(sp.blade.at), e = pt(sp.blade.at + 2); ctx.fillStyle = sp.blade.col; ctx.strokeStyle = 'rgba(16,14,12,.85)'; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); ctx.lineTo(e[0] + px * 3, e[1] + py * 3); ctx.lineTo(c[0] + px * 2.2, c[1] + py * 2.2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if (sp.disc) { const c = pt(sp.disc.at); ctx.fillStyle = sp.disc.col; ctx.strokeStyle = 'rgba(16,14,12,.9)'; ctx.lineWidth = .6; ctx.beginPath(); ctx.ellipse(c[0], c[1], sp.disc.r * 1.3, sp.disc.r * .75, Math.atan2(dy, dx) * .3, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(c[0] - .6, c[1] - .4, sp.disc.r * .6, sp.disc.r * .3, 0, 0, 6.283); ctx.fill(); }
}
// герой на экране: поза (наклон, отдача), полупрозрачный за стеклом душа, книга в руках при чтении
function drawPlayer(an, fi, zoff) {
  const it = P.act && P.act.it, bk = it && ITEMS[it.id] && (ITEMS[it.id].kind === 'book' || it.id === 'novel' || it.id === 'newspaper');
  const reading = bk && P.act.kind === 'use' && P.act.an === 'read' && heroRig() && AN('p', 'read') > 1;
  const bname = reading ? heroPre() + heroVar(P.look || look) + '_read_' + dirOf(P.fd != null ? P.fd : P.face) + '_' + fi : '';
  const front = reading && ![4, 5, 6].includes(dirOf(P.fd != null ? P.fd : P.face));   // со спины книгу не видно
  if (reading && !front) drawBook(bname, zoff);
  if (P._inShower) {
    const a = ctx.globalAlpha; ctx.globalAlpha = .5; try { withPose(P.x, P.y, playerPose(an), () => drawHeroSprite(an, fi, zoff)); } finally { ctx.globalAlpha = a; }
    if (Math.random() < .5) emit('glass', P.x + (Math.random() - .5) * .3, P.y + (Math.random() - .5) * .3, .3, 1, null, 0, .6);
  } else withPose(P.x, P.y, playerPose(an), () => drawHeroSprite(an, fi, zoff));
  if (reading) {
    if (front) drawBook(bname, zoff);
    const cyc = Math.floor(animT / heroDur('read', 3.2));
    if (P._pageCyc !== cyc) { P._pageCyc = cyc; if (SFX.ac) smp('paper', .22, 1.05); }   // шелест страницы
  }
}
function drawHeroSprite(an, fi, zoff) {
  const lk = P.look || look, w = P.weapon && P.weapon.id;
  const name = 'p' + lk.g + heroVar(lk) + '_' + an + '_' + dirOf(P.fd != null ? P.fd : P.face) + '_' + fi;
  const wm = ART.meta.wpn && ART.meta.wpn[name];
  const front = !wm || wm[4];
  const busy = an === 'eat' || an === 'drink' || an === 'pickup' || an === 'work';
  const showW = w && an !== 'death' && an !== 'search' && !busy;
  if (showW && !front) drawWeapon(name, w, P.x, P.y, zoff);
  const pk = packSpot(an, name, zoff);
  if (pk && !pk.front) drawPack(pk);
  const pp = playerLookPal(lk);
  drawChar(P, name, pp.key, pp.pal, P.x, P.y, zoff, P.hurt > .3, null, true);   // герой не ждёт очереди перекраски: в толпе из сотен мертвецов он иначе застывал на старом кадре
  if (pk) { if (pk.front) drawPack(pk); else drawStraps(pk); }
  if (showW && front) drawWeapon(name, w, P.x, P.y, zoff);
  if ((an === 'eat' || an === 'drink') && P.act && P.act.kind === 'use' && P.act.it && wm) drawIcon(P.act.it.id, SX(P.x, P.y) + wm[0], SY(P.x, P.y, zoff || 0) + wm[1] - 1, 7);
}
// ---- надетый рюкзак на герое: объёмный спрайт pk_<вид>_<направление> (tools/glbchar/packs.py) на спине ----
// Где спина в кадре, берём из карты областей тела (лист <имя>r, область 1 — туловище): так рюкзак сидит на месте
// при ходьбе, наклоне, ударе и приседе. Лямки на груди — когда герой лицом к нам.
const PACK_STRAP = {bag_school:'#26406e', sportbag:'#1c1d22', bag:'#6e3416', milbag:'#363d24'};
const TORSO = new Map();
function torsoOf(name) {
  if (TORSO.has(name)) return TORSO.get(name);
  const f = ART.meta.frames[name], rimg = f && needSheet(f[0] + 'r') && ART.imgs[f[0] + 'r']; if (!rimg) return null;   // карта ещё грузится
  const w = f[3], h = f[4], c = mkCanvas(w, h), g = c.getContext('2d', {willReadFrequently:true}); g.drawImage(rimg, f[1], f[2], w, h, 0, 0, w, h);
  const R = g.getImageData(0, 0, w, h).data; let x0 = w, x1 = -1, y0 = h, y1 = -1, sx = 0, n = 0;
  for (let p = 0; p < w * h; p++) if (R[p * 4 + 3] >= 128 && (R[p * 4] >> 4) === 1) { const x = p % w, y = (p / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; sx += x; n++; }
  const t = n > 6 ? {cx:sx / n - f[5], top:y0 - f[6], bot:y1 - f[6], w:x1 - x0} : null;
  TORSO.set(name, t); return t;
}
function packSpot(an, name, zoff) {
  const b = P.bag, id = b && b.id;
  if (!id || !PACK_STRAP[id] || !heroRig() || an === 'death' || P._inShower || P.sleep) return null;
  const T = torsoOf(name); if (!T) return null;
  const a = P.fd != null ? P.fd : P.face, c = Math.cos(a), s = Math.sin(a), d = dirOf(a), k = .08;   // от середины туловища к спине
  const bx = SX(P.x, P.y), by = SY(P.x, P.y, zoff || 0);
  return {id, name:'pk_' + id + '_' + d, T, bx, by, x:bx + T.cx + (-c + s) * 32 * k, y:by + T.top + (T.bot - T.top) * .36 + (-c - s) * 16 * k,
    front:-c - s > -.01, sling:id === 'sportbag'};
}
function drawPack(p) {
  const fr = ART.meta.frames[p.name]; if (!fr) return;
  if (p.sling) drawSling(p);
  ctx.drawImage(ART.imgs[fr[0]], fr[1], fr[2], fr[3], fr[4], Math.round(p.x - fr[5]), Math.round(p.y - fr[6]), fr[3], fr[4]);
}
function drawSling(p) {                                                       // ремень сумки: с левого плеча к правому бедру
  ctx.strokeStyle = PACK_STRAP[p.id]; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(p.bx + p.T.cx + p.T.w * .3, p.by + p.T.top + 1); ctx.lineTo(p.bx + p.T.cx - p.T.w * .3, p.by + p.T.bot - 1); ctx.stroke();
}
// герой лицом к нам: рюкзак за спиной, на плечах видны лямки
function drawStraps(p) {
  if (p.sling) return drawSling(p);
  ctx.fillStyle = PACK_STRAP[p.id];
  const L = Math.max(3, Math.round((p.T.bot - p.T.top) * .4)), y = Math.round(p.by + p.T.top);
  for (const o of [-.28, .28]) ctx.fillRect(Math.round(p.bx + p.T.cx + p.T.w * o), y, 1, L);
}
// мертвец: поза (наклон, отдача); ползущий разворачивается головой вперёд
function drawZombie(z, an, fi, alpha, force) {
  if (force) return drawZombieSprite(z, an, fi, alpha, force);
  const f0 = z.face; if (z.crawl && an === 'death') z.face = f0 + Math.PI;   // старые листы без кадров ползания: лежит навзничь головой вперёд
  try { withPose(z.x, z.y, zombiePose(z, an), () => drawZombieSprite(z, an, fi, alpha, force)); } finally { z.face = f0; }
}
function drawZombieSprite(z, an, fi, alpha, force) {
  const pal = z.pal;
  const near = force || Math.abs(z.x - P.x) + Math.abs(z.y - P.y) < 5;   // те, кто рядом с героем, тоже без очереди
  drawChar(z, 'z' + (pal.b || 'm') + '_' + an + '_' + dirOf(z.face) + '_' + fi, 'z' + pal.pi, ZPALS[pal.pi], z.x, z.y, 0, !force && z.stun > .3, alpha, near);
}
// вариант кадров героя: '' — без одежды, 't' — в верхе, 'f' — в верхе и штанах (одежда не в облипку); 61-controls-body решает
let heroVar = lk => '';
// палитра героя для кадра: старая схема (перекраска слотов); 54-clothes заменяет её на одежду по областям тела
let playerLookPal = function (lk) {
  const pal = lookPal(lk), ct = P.cloth && P.cloth.torso, ch = P.cloth && P.cloth.head;
  const cs = P.cloth && P.cloth.shirt, cl = P.cloth && P.cloth.legs, top = ct || cs;               // героиня (палитровые кадры): верх, штаны, шапка
  if (top) pal[3] = pal[4] = top.col || ITEMS[top.id].col; if (ct && cs) pal[4] = cs.col || ITEMS[cs.id].col; if (cl) pal[5] = cl.col || ITEMS[cl.id].col; if (ch) pal[2] = ch.col || ITEMS[ch.id].col;
  const ck = c => c ? c.id + (c.col ? c.col.join('.') : '') : '';
  return {pal, key:'P' + lk.g + lk.skin + lk.hair + lk.shirt + lk.pants + ck(ct) + ck(cs) + ck(cl) + ck(ch)};
};
const dirOf = a => ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
// число кадров в анимации (у мужского героя — свои клипы pm)
function AN(k, a) { if (k === 'p' && heroRig() && ART.meta.anims[heroPre()][a]) return ART.meta.anims[heroPre()][a]; return (ART.meta.anims && ART.meta.anims[k] && ART.meta.anims[k][a]) || 1; }
// object sprite with fog darkening (fogged variants cached)
// предмет мира из атласа (пиксельный кадр); с туманом f<1 или оттенком — через кэш спрайтов
function objAtPix(id, name, wx, wy, f, alpha, offX, tint) {
  const fr = ART.meta.frames[name]; if (!fr) return;
  if (f >= .99 && !tint) {
    if (alpha != null && alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(ART.imgs[fr[0]], fr[1], fr[2], fr[3], fr[4], rd(SX(wx, wy) - fr[5] + (offX || 0)), rd(SY(wx, wy, 0) - fr[6]), fr[3], fr[4]);
    ctx.globalAlpha = 1; return;
  }
  sprite(id, name + '|' + f + '|' + (tint || ''), wx, wy, -fr[5], -fr[6], fr[3] - fr[5], fr[4] - fr[6], () => {
    ctx.drawImage(ART.imgs[fr[0]], fr[1], fr[2], fr[3], fr[4], rd(SX(wx, wy) - fr[5]), rd(SY(wx, wy, 0) - fr[6]), fr[3], fr[4]);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-atop';
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); }
    ctx.fillStyle = `rgba(6,8,14,${(1 - f) * .95})`; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalCompositeOperation = 'source-over'; resetT();
  }, alpha, offX);
}
