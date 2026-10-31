// ================= действия у предмета: контур по силуэту, кнопка над предметом, меню по тапу =================
// Подошёл к мебели, двери, машине — предмет обводится светящейся линией точно по силуэту, над ним кнопка главного
// действия («Обыскать», «Открыть»). Тап по самому предмету — меню со всеми действиями с ним. Старые плашки действий
// справа внизу не показываются. Клавиша E работает как раньше. Здесь же: компактная нижняя панель и телефон под «−/+».
if (typeof getActions === 'function' && typeof onDraw === 'function') {
  const css = `
#bMore,#actAlt{display:none!important}
#actBtn{position:fixed;left:0;top:0;z-index:9;display:flex;align-items:center;gap:7px;height:40px;padding:0 14px 0 10px;border-radius:20px;
  background:rgba(16,20,22,.9);border:2px solid #f0c477;color:#f6e7c4;font:700 14px system-ui,sans-serif;white-space:nowrap;cursor:pointer;
  box-shadow:0 4px 14px rgba(0,0,0,.45);transform:translate(-50%,-100%);touch-action:manipulation;transition:opacity .15s}
#actBtn[hidden]{display:none}
#actBtn .ic{width:20px;height:20px;color:#f0c477}
#actBtn small{font:600 11.5px system-ui;color:#b9b2a2}
#actBtn:after{content:'';position:absolute;left:50%;bottom:-7px;margin-left:-6px;width:10px;height:10px;background:rgba(16,20,22,.9);border-right:2px solid #f0c477;border-bottom:2px solid #f0c477;transform:rotate(45deg)}
#actBtn:active{background:#2a2418}
body.popon #bAct{visibility:hidden}
#actPop{position:fixed;z-index:12;min-width:160px;max-width:min(280px,70vw);background:rgba(16,20,22,.97);border:1px solid rgba(240,196,119,.5);border-radius:12px;
  box-shadow:0 10px 26px rgba(0,0,0,.55);padding:5px;font:600 13.5px system-ui,sans-serif;color:#e9e3d6}
#actPop[hidden]{display:none}
#actPop .ttl{padding:5px 10px 7px;color:#f0c477;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
#actPop button{display:flex;align-items:center;gap:9px;width:100%;min-height:38px;padding:6px 10px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
#actPop button:first-of-type{background:rgba(240,196,119,.15)}
#actPop button:active{background:rgba(240,196,119,.28)}
#actPop .ic{width:19px;height:19px;color:#f0c477;flex:none}
/* компактная нижняя панель: только иконки, пустые слоты спрятаны */
#dock .hslot.empty{display:none!important}
#dock .hslot .hl,#dock .hslot .hk,#dock .wslot strong{display:none!important}
#dock{gap:4px!important;padding:4px!important}
#dock .hslot{width:42px!important;min-width:42px!important;height:42px!important;padding:0!important;place-items:center!important;align-content:center!important}
#dock .wslot{width:46px!important;min-width:46px!important;height:42px!important;padding:0!important;place-items:center!important;align-content:center!important}
#dock .hslot .ic,#dock .hslot img,#dock .hslot canvas{width:24px!important;height:24px!important}
#dock .hslot .cnt{font-size:9px!important}
/* телефон — под кнопками масштаба */
#bPhone.top{position:fixed;z-index:6;padding:0}
#bPhone.top .hl,#bPhone.top .hk{display:none}
#bPhone.top .ic{width:20px;height:20px}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const AU = {btn:null, pop:null, key:'', popT:null, lpT:0, outl:null, opened:0};
  const cssXY = (gx, gy) => { const r = cv.getBoundingClientRect(), k = SCALE / DEV; return [r.left + gx * k, r.top + gy * k]; };
  const TALL = new Set(['wardrobe', 'fridge', 'shelf', 'bookshelf', 'hanger', 'locker', 'toolrack', 'medshelf', 'pantry', 'floorlamp']);
  // где над предметом встаёт кнопка (высота предмета в игровых единицах)
  function topOf(a) {
    const [x, y] = actPos(a);
    let z = U * 1.15;
    if (a.o) z = U * 2.3;
    else if (a.f && a.f.type === 'car') z = U * 1.6;
    else if (a.f && TALL.has(SPRA && SPRA[a.f.type] || a.f.type)) z = U * 2.2;
    else if (a.f && (a.f.type === 'bed' || a.f.type === 'sofa' || a.f.type === 'bath')) z = U * 1.1;
    else if (!a.f) return [x, y, U * 2.4];                                         // действие без предмета — над героем
    return [x, y, z];
  }
  const verb = a => a.label.charAt(0).toUpperCase() + a.label.slice(1);

  // ---- контур: предмет рисуется один в запасной холст, вокруг силуэта — светящаяся линия ----
  const O = {a:null, b:null, c:null};
  const cvOf = (k, w, h) => { let c = O[k]; if (!c) { c = O[k] = document.createElement('canvas'); c._g = c.getContext('2d'); } if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c; };
  function drawAlone(a) {                                                         // нарисовать только цель, в текущий ctx
    if (a.o) { const i = a.o.y * MW + a.o.x; drawWallTile(a.o.x, a.o.y, i, false); return true; }
    const f = a.f; if (!f) return false;
    if (f.wd && furns.includes(f)) { if (f._fi == null || furns[f._fi] !== f) f._fi = furns.indexOf(f); objAtDraw('F' + (f._fi + 1), furnName(f), f.cx, f.cy, 1, 1); return true; }
    if (typeof dynCars !== 'undefined' && dynCars.includes(f)) { drawCarDyn(f, 1); return true; }
    if (props.includes(f)) { if (f.proc) drawProc(f, 1); else if (f.type === 'car' && drawCarProp(f, 1)) { if (f.police || f.army) drawCarExtras(f, 1); } else { if (f._pi == null || props[f._pi] !== f) f._pi = props.indexOf(f); objAt('P' + (f._pi + 1), propName(f, false), f.cx, f.cy, 1, null, 0, null); } return true; }
    return false;
  }
  // кольцо считается один раз на цель (и раз в полсекунды — вдруг дверь открылась), а каждый кадр только
  // переносится за предметом: два drawImage вместо дюжины перерисовок и размытия — на планшете это заметно
  const OC = {key:null, f:null, t:0, ax:0, ay:0, dx:0, dy:0, pad:0, ok:false};
  function outlineBuild(a, ax, ay) {
    const k = DPR, [x, y, zt] = topOf(a);
    const cx = SX(x, y) * k, by = SY(x, y, -U * .9) * k, ty = SY(x, y, zt + U * .9) * k, hw = U * (a.f && a.f.type === 'car' ? 2.6 : 1.9) * k;
    const rx = Math.floor(cx - hw), ry = Math.floor(ty), rw = Math.ceil(cx + hw) - rx, rh = Math.ceil(by) - ry;
    OC.ok = false; if (rw < 4 || rh < 4 || rw > 2400 || rh > 2400) return;
    const A = cvOf('a', rw, rh), B = cvOf('b', rw, rh), C = cvOf('c', rw, rh), ga = A._g, gb = B._g, gc = C._g;
    ga.setTransform(1, 0, 0, 1, 0, 0); ga.clearRect(0, 0, rw, rh);
    const sc = ctx, sox = ox, soy = oy; let ok = false;
    ctx = ga; ox = sox - rx / k; oy = soy - ry / k; resetT();
    try { ok = drawAlone(a); } catch (e) { ok = false; } finally { ctx = sc; ox = sox; oy = soy; resetT(); }
    if (!ok) return;
    { const im = ga.getImageData(0, 0, rw, rh), d = im.data;                      // силуэт — только плотные пиксели: мягкая тень под машиной
      for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 150 ? 255 : 0;           // и мебелью не обводится (была светящаяся плита под машиной)
      ga.putImageData(im, 0, 0); }
    gb.setTransform(1, 0, 0, 1, 0, 0); gb.globalCompositeOperation = 'source-over'; gb.clearRect(0, 0, rw, rh); gb.drawImage(A, 0, 0);
    gb.globalCompositeOperation = 'source-in'; gb.fillStyle = '#ffd88a'; gb.fillRect(0, 0, rw, rh); gb.globalCompositeOperation = 'source-over';
    const d = Math.max(1.5, k * 1.1);
    gc.setTransform(1, 0, 0, 1, 0, 0); gc.globalCompositeOperation = 'source-over'; gc.clearRect(0, 0, rw, rh);
    for (let n = 0; n < 12; n++) { const t = n / 12 * Math.PI * 2; gc.drawImage(B, Math.cos(t) * d, Math.sin(t) * d); }
    gc.globalCompositeOperation = 'destination-out'; gc.drawImage(A, 0, 0); gc.globalCompositeOperation = 'source-over';
    // свечение запекается заранее
    const pad = Math.ceil(8 * k), G = cvOf('g', rw + pad * 2, rh + pad * 2), gg = G._g;
    gg.setTransform(1, 0, 0, 1, 0, 0); gg.clearRect(0, 0, G.width, G.height);
    gg.shadowColor = 'rgba(240,196,119,.9)'; gg.shadowBlur = 10 * k / 2; gg.drawImage(C, pad, pad); gg.shadowBlur = 0;
    Object.assign(OC, {ok:true, pad, dx:rx - ax, dy:ry - ay});
  }
  function outline(a) {
    const k = DPR, [x, y] = topOf(a), ax = SX(x, y) * k, ay = SY(x, y, 0) * k, now = performance.now();
    const key = tgtKey(a), st = U + '|' + k + '|' + a.kind + '|' + a.label;
    if (key !== OC.f || st !== OC.key || now - OC.t > 500) { OC.f = key; OC.key = st; OC.t = now; outlineBuild(a, ax, ay); }
    if (!OC.ok) return;
    const rx = ax + OC.dx, ry = ay + OC.dy, pulse = .75 + Math.sin(now / 380) * .25;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = .55 * pulse; ctx.drawImage(O.g, rx - OC.pad, ry - OC.pad);
    ctx.globalAlpha = .95; ctx.drawImage(O.c, rx, ry);
    ctx.restore(); resetT();
  }
  // старая прямоугольная рамка под целью больше не нужна
  drawHi = function () {};

  // ---- кнопка над предметом ----
  function btnEl() {
    if (AU.btn) return AU.btn;
    const b = mk('button'); b.id = 'actBtn'; b.type = 'button'; b.hidden = true; b.setAttribute('aria-label', 'Действие');
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      AU.lpT = setTimeout(() => { AU.lpT = 0; if (curAct) popOpen(curAct); }, 450);   // зажать — меню всех действий
    });
    const up = e => { if (!AU.lpT) return; clearTimeout(AU.lpT); AU.lpT = 0; e.preventDefault(); e.stopPropagation(); if (curAct) { popClose(); doAction(curAct); } };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', () => { clearTimeout(AU.lpT); AU.lpT = 0; }); b.addEventListener('pointerleave', () => { clearTimeout(AU.lpT); AU.lpT = 0; });
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
    document.body.appendChild(b); return (AU.btn = b);
  }
  function btnShow(a) {
    const b = btnEl();
    if (!a || (AU.pop && !AU.pop.hidden) || mode !== 'play' || paused || panel || P.sleep || (typeof BLD !== 'undefined' && BLD.on) || (typeof EDIT !== 'undefined' && EDIT.on)) { b.hidden = true; return; }
    const key = a.kind + '|' + a.label + '|' + actName(a);
    if (key !== AU.key) {
      AU.key = key; b.textContent = '';
      b.appendChild(svgIc(actIcon(a))); b.appendChild(document.createTextNode(verb(a)));
      const n = actName(a); if (n && !a.label.toLowerCase().includes(n.toLowerCase())) b.appendChild(mk('small', '', n.toLowerCase()));
    }
    const [x, y, z] = topOf(a), [px, py] = cssXY(SX(x, y), SY(x, y, z));
    const vx = Math.max(70, Math.min(innerWidth - 70, px)), vy = Math.max(56, Math.min(innerHeight - 12, py - 8));
    b.style.left = Math.round(vx) + 'px'; b.style.top = Math.round(vy) + 'px'; b.hidden = false;
  }

  // ---- меню у предмета ----
  function popEl() {
    if (AU.pop) return AU.pop;
    const p = mk('div'); p.id = 'actPop'; p.hidden = true; p.setAttribute('role', 'menu');
    document.body.appendChild(p);
    document.addEventListener('pointerdown', e => { if (!p.hidden && !p.contains(e.target) && e.target !== AU.btn) popClose(); }, true);
    return (AU.pop = p);
  }
  // одна цель — один проём (у окна свои ключи на каждое действие: шторы, закрыть…) или один предмет
  const tgtKey = a => a.o ? 'o' + a.o.i : a.f && a.f.type !== 'pond' && a.f.type !== 'snow' ? a.f : 'k' + a.kind;
  function actionsFor(a) {
    const t = tgtKey(a), all = getActions();
    const same = all.filter(b => tgtKey(b) === t);
    const list = same.length ? same : [a];
    // дополнительно: заколотить этот проём, переставить эту мебель
    if (a.o && typeof curBar !== 'undefined' && curBar && curBar.i === a.o.i) list.push({kind:'_bar', label:'заколотить доской', o:a.o});
    if (a.f && a.f.wd && furns.includes(a.f) && typeof toggleEditor === 'function') list.push({kind:'_move', label:'переставить или разобрать', f:a.f});
    return list;
  }
  function runIt(b) {
    if (b.kind === '_bar') { doBarricade(); return; }
    if (b.kind === '_move') { toggleEditor(true); EDIT.sel = b.f; EDIT.tgt = null; editUI(); return; }
    doAction(b);
  }
  const iconOf = b => b.kind === '_bar' ? 'i-hammer' : b.kind === '_move' ? 'i-sofa' : actIcon(b);
  function popOpen(a) {
    const p = popEl(), list = actionsFor(a); p.textContent = '';
    p.appendChild(mk('div', 'ttl', actName(a) || 'Действия'));
    for (const b of list) { const it = btn('', () => { popClose(); runIt(b); }); it.setAttribute('role', 'menuitem'); it.appendChild(svgIc(iconOf(b))); it.appendChild(document.createTextNode(verb(b))); p.appendChild(it); }
    AU.popFor = tgtKey(a); p.hidden = false; document.body.classList.add('popon');
    const [x, y, z] = topOf(a), [px, py] = cssXY(SX(x, y), SY(x, y, z)), [, by] = cssXY(SX(x, y), SY(x, y, 0)), r = p.getBoundingClientRect();
    const W = innerWidth, H = innerHeight, w = r.width, h = r.height, m = 8;
    // где стоят кнопки: меню выбирает место, которое их не накрывает
    const obs = [];
    for (const id of ['bAct', 'bAtk', 'bRun', 'bSneak', 'bInv', 'bBar', 'dock', 'stick', 'knob', 'hud', 'zoomBox', 'bPhone', 'moodles', 'carPad', 'toasts', 'taskChip']) {
      const e = $(id); if (!e || e.hidden || !e.offsetParent && getComputedStyle(e).position !== 'fixed') continue;
      if (id === 'hud') { for (const c of e.children) { if (c.hidden) continue; const q = c.getBoundingClientRect(); if (q.width) obs.push(q); } continue; }
      const q = e.getBoundingClientRect(); if (q.width && q.height) obs.push(q);
    }
    const hit = (l, t) => { let s = 0; for (const q of obs) { const ix = Math.min(l + w, q.right) - Math.max(l, q.left), iy = Math.min(t + h, q.bottom) - Math.max(t, q.top); if (ix > 0 && iy > 0) s += ix * iy; } return s; };
    const cl = (l, t) => [Math.max(m, Math.min(W - w - m, l)), Math.max(m, Math.min(H - h - m, t))];
    const cand = [cl(px - w / 2, py - h - 12), cl(px - w - 34, (py + by) / 2 - h / 2), cl(px + 34, (py + by) / 2 - h / 2), cl(px - w / 2, by + 16)];
    let best = cand[0], bs = 1e12;
    cand.forEach((c, i) => { const s = hit(c[0], c[1]) + i * 50; if (s < bs) { bs = s; best = c; } });
    p.style.left = Math.round(best[0]) + 'px'; p.style.top = Math.round(best[1]) + 'px';
    SFX.select && SFX.select(); AU.opened = (AU.opened || 0) + 1;
  }
  function popClose() { if (AU.pop) AU.pop.hidden = true; AU.popFor = null; document.body.classList.remove('popon'); }

  // тап по предмету рядом — меню его действий
  onTap((cx, cy) => {
    if (mode !== 'play' || paused || panel || P.car) return false;
    let best = null, bd = 1e9;
    const k = SCALE / DEV, r = cv.getBoundingClientRect();
    for (const a of getActions()) {
      const [x, y, z] = topOf(a), bx = r.left + SX(x, y) * k, by = r.top + SY(x, y, -U * .25) * k, ty = r.top + SY(x, y, z) * k;
      const hw = U * (a.o ? .7 : a.f && a.f.type === 'car' ? 1.6 : .95) * k;
      if (cx < bx - hw || cx > bx + hw || cy < ty - 12 || cy > by + 10) continue;   // мимо силуэта
      const d = Math.abs(cx - bx) + Math.abs(cy - (by + ty) / 2) * .5; if (d < bd) { bd = d; best = a; }
    }
    if (!best) { popClose(); return false; }
    // окно, дверь и предмет рядом: тап по нему — сразу меню, а не удар по стеклу
    popOpen(best); return true;
  });

  // каждый кадр: контур и кнопка над текущей целью
  onDraw(() => {
    if (mode !== 'play' || !P) { if (AU.btn) AU.btn.hidden = true; return; }
    const a = curAct;
    if (a && !P.car && !P.sleep) outline(a);
    if (AU.btn) AU.btn.hidden = true;                                           // главное действие — обычной кнопкой справа внизу
    if (AU.pop && !AU.pop.hidden && (panel || paused || !getActions().some(b => tgtKey(b) === AU.popFor))) popClose();
  });
  // на кнопке справа внизу — одна строка: «Открыть окно», без повтора «окно» снизу
  if (typeof setActButton === 'function' && $('bActN')) { const f = setActButton; setActButton = function (a) { const r = f.apply(this, arguments); if (a) { const n = actName(a) || ''; if (n && a.label.toLowerCase().includes(n.toLowerCase())) $('bActN').textContent = ''; } return r; }; }
  { const f = toMenu; toMenu = function () { popClose(); if (AU.btn) AU.btn.hidden = true; return f.apply(this, arguments); }; }
  // кнопка действия и E делают ровно то, что подсвечено (а не «ближайшее» заново)
  { const f = doAction; doAction = function (a0) { return f.call(this, a0 || (mode === 'play' && curAct) || undefined); }; }
  { let t0 = 0, keep = null;
    const f = updateHud;
    updateHud = function () {
      const r = f.apply(this, arguments);
      if (mode !== 'play' || !P || P.car || !curAct) return r;
      const now = performance.now();
      if (now - t0 > 150) {
        t0 = now; const list = getActions(); keep = curAct;
        if (list.length > 1) {
          const seen = new Set(); let best = null, bs = 1e9;
          for (const a of list) {
            if (!a.f && !a.o) continue;                                          // кнопка справа и метка игры ждут предмет или проём
            const key = tgtKey(a); if (seen.has(key)) continue; seen.add(key);   // у каждой цели — её главное действие
            const [x, y] = actPos(a), d = Math.hypot(x - P.x, y - P.y), ang = Math.abs(((Math.atan2(y - P.y, x - P.x) - (P.face || 0)) % 6.2832 + 9.4248) % 6.2832 - 3.1416);
            const sc = d + ang * .55; if (sc < bs) { bs = sc; best = a; }
          }
          if (best) keep = best;
        }
      }
      if (keep && keep !== curAct) { curAct = keep; if (typeof setActButton === 'function') setActButton(curAct); }
      return r;
    };
  }
  addEventListener('keydown', e => { if (e.key === 'Escape' && AU.pop && !AU.pop.hidden) { popClose(); e.stopImmediatePropagation(); } }, true);
  window.__actUI = AU;

  // ---- телефон под кнопками масштаба ----
  const placePhone = () => {
    const b = $('bPhone'), z = $('zoomBox'); if (!b || !z) return;
    if (!b.classList.contains('top')) { b.className = 'ibtn sm top'; document.body.appendChild(b); }
    const r = z.getBoundingClientRect(); if (!r.width || mode !== 'play' || $('hud').hidden) { b.hidden = true; return; }
    const s = Math.round(r.height) || 38; b.style.width = b.style.height = s + 'px';
    b.style.left = Math.round(r.right - s) + 'px'; b.style.top = Math.round(r.bottom + 8) + 'px';
    b.hidden = mode !== 'play' || $('hud').hidden || !(typeof phMine === 'function' && phMine().length);   // телефон — только когда нашёл
  };
  addEventListener('resize', () => setTimeout(placePhone, 80)); setInterval(placePhone, 700); setTimeout(placePhone, 50);
}
