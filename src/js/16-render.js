// ================= frame render =================
let drops = [], animT = 0, fogDirty = true;
function render(dt) {
  mainCtx.setTransform(1, 0, 0, 1, 0, 0);
  mainCtx.fillStyle = '#0c0f12'; mainCtx.fillRect(0, 0, cv.width, cv.height);
  if (!P || !ART.ready) return;
  ctx = mainCtx; ctx.imageSmoothingEnabled = false;
  U = 32; hh = 16; WH = 77; DPR = SCALE;
  resetT();
  cachesValid(); bakes = 0; recolorsThisFrame = 0;
  let shx = 0, shy = 0;
  if (shake > 0) { shx = (rng() - .5) * shake * 6; shy = (rng() - .5) * shake * 6; }
  ox = Math.round((W / 2 - (camX - camY) * U + shx) * SCALE) / SCALE;
  oy = Math.round((H / 2 - (camX + camY) * hh + U * .9 + shy) * SCALE) / SCALE;
  let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
  for (const [sx, sy] of [[-U, -U], [W + U, -U], [-U, H + U * 5], [W + U, H + U * 5]]) {
    const [x, y] = screenToWorld(sx, sy);
    mnx = Math.min(mnx, x); mny = Math.min(mny, y); mxx = Math.max(mxx, x); mxy = Math.max(mxy, y);
  }
  const x0 = Math.max(0, Math.floor(mnx)), x1 = Math.min(MW - 1, Math.ceil(mxx)), y0 = Math.max(0, Math.floor(mny)), y1 = Math.min(MH - 1, Math.ceil(mxy));
  const inView = (x, y) => { const sx = SX(x + .5, y + .5), sy = SY(x + .5, y + .5, 0); return sx > -2 * U && sx < W + 2 * U && sy > -U && sy < H + U * 5; };
  const wet = rain;

  if (stampQ.length) {
    const q = stampQ; stampQ = [];
    for (const s of q) {
      if (s.d) for (const ch of chunksNear(s.d.x, s.d.y, 1)) withChunk(ch, () => drawDecal(s.d));
      else if (s.c) for (const ch of chunksNear(s.c.x, s.c.y, 1.6)) withChunk(ch, () => drawCorpse(s.c));
    }
  }
  const ncx = Math.ceil(MW / CH), ncy = Math.ceil(MH / CH);
  for (let cy = -3; cy < ncy + 3; cy++) for (let cx = -3; cx < ncx + 3; cx++) {
    const ax = cx * CH, ay = cy * CH, sx = SX(ax, ay), sy = SY(ax, ay, 0);
    if (sx + CH * U < 0 || sx - CH * U > W || sy > H || sy + CH * U < 0) continue;
    const ch = getChunk(cx, cy);
    ctx.drawImage(ch.c, sx - CH * U, sy);
  }
  if (fogDirty) { updateFog(); fogDirty = false; }
  drawSnowCover(x0, y0, x1, y1);
  groundT(0); ctx.imageSmoothingEnabled = true; ctx.drawImage(fogC, 0, 0, MW, MH); ctx.imageSmoothingEnabled = false; resetT();

  let inside = 0;
  if (mode !== 'menu') for (let k = 0; k < houses.length; k++) { const Hs = houses[k]; if (P.x > Hs.ix0 && P.x < Hs.ix1 && P.y > Hs.iy0 && P.y < Hs.iy1) inside = k + 1; }
  const pD = P.x + P.y;
  for (let k = 0; k < houses.length; k++) {
    const Hs = houses[k];
    Hs.mode = (k + 1 === inside) ? 1 : 0;
    if (!Hs.mode && mode !== 'menu') {
      const top = WH + U * 1.2;
      for (let s = .15; s <= top / U + .3 && !Hs.mode; s += .25)
        for (const o of [-.25, 0, .25]) { const qx = P.x + s + o, qy = P.y + s - o; if (qx >= Hs.ix0 - .3 && qx < Hs.ix1 + .3 && qy >= Hs.iy0 - .3 && qy < Hs.iy1 + .3) { Hs.mode = 2; break; } }
    }
  }
  const dl = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!inView(x, y)) continue;
    const i = y * MW + x, t = map[i];
    if (isWallish(t)) dl.push({d:x + y + 1, k:1, x, y, i});
    else if (t === TREE) dl.push({d:x + y + 1, k:2, x, y, i});
    if (furn[i]) { const fu = furns[furn[i] - 1]; if (fu.dt == null ? seen[i] : fu.dt === i && fu.tiles.some(t => seen[t])) dl.push({d:furnDepth(fu), k:3, x, y, i, fu}); }   // big furniture: drawn once, from its front tile
    if (propAt[i]) { const p = props[propAt[i] - 1]; if (p._f !== frameNo && !p.dyn) { p._f = frameNo; dl.push({d:p.cx + p.cy + (p.type === 'car' ? .3 : 0), k:7, p, i, pid:propAt[i]}); } }
  }
  {
    const ex0 = Math.floor(mnx), ex1 = Math.ceil(mxx), ey0 = Math.floor(mny), ey1 = Math.ceil(mxy);
    if (ex0 < 0 || ey0 < 0 || ex1 >= MW || ey1 >= MH)
      for (let y = ey0; y <= ey1; y++) for (let x = ex0; x <= ex1; x++) {
        if (x >= 0 && y >= 0 && x < MW && y < MH) continue;
        if (hash(x * 3 + 11, y * 5 + 7) > .42 || !inView(x, y)) continue;
        dl.push({d:x + y + 1, k:2, x, y, i:-1, oob:true});
      }
  }
  for (let k = 0; k < houses.length; k++) {
    const Hs = houses[k]; if (Hs.mode === 1) continue;
    const b = roofBounds(Hs), sx = SX(Hs.x, Hs.y), sy = SY(Hs.x, Hs.y, 0);
    if (sx + b[2] < 0 || sx + b[0] > W || sy + b[3] < 0 || sy + b[1] > H) continue;
    dl.push({d:Hs.x + Hs.y + Hs.w + Hs.h - 1 + .95, k:4, Hs, hi:k});
  }
  for (const z of zs) { const i = Math.floor(z.y) * MW + Math.floor(z.x); if (vis[i] || (mode === 'menu' && seen[i])) dl.push({d:z.x + z.y + .02, k:5, z}); }
  for (const c of corpses) if (c.fall < 1) dl.push({d:c.x + c.y + .02, k:8, c});
  for (const fi of fires) { const i = Math.floor(fi.y) * MW + Math.floor(fi.x); if (seen[i] && inView(Math.floor(fi.x), Math.floor(fi.y))) dl.push({d:fi.x + fi.y, k:9, fi, i}); }
  for (const p of piles) { const i = Math.floor(p.y) * MW + Math.floor(p.x); if (p.items.length && vis[i]) dl.push({d:p.x + p.y - .1, k:10, p}); }
  for (const t of thrown) { const u = t.t / t.dur; dl.push({d:t.x0 + (t.x1 - t.x0) * u + t.y0 + (t.y1 - t.y0) * u + .5, k:11, t}); }
  for (const r of rings) { const i = Math.floor(r.y) * MW + Math.floor(r.x); if (vis[i]) dl.push({d:r.x + r.y, k:12, r}); }
  for (const b of blazes) dl.push({d:b.x + b.y + 1.6, k:15, b});
  for (const f of flares) dl.push({d:f.x + f.y, k:17, f});
  for (const p of dynCars) { const i = Math.floor(p.cy) * MW + Math.floor(p.cx); if (inView(Math.floor(p.cx), Math.floor(p.cy)) && (vis[i] || seen[i])) dl.push({d:p.cx + p.cy + .35, k:16, p, i}); }
  for (const a of airdrops) { if (a.landed && !vis[Math.floor(a.y) * MW + Math.floor(a.x)]) continue; dl.push({d:a.landed ? a.x + a.y - .2 : a.x + a.y + 2, k:14, a}); }
  if (typeof extraDl === 'function') extraDl(dl);                         // свои объекты (собака) — в общей сортировке по глубине
  if (mode !== 'menu') dl.push({d:pD + .02, k:6});
  dl.sort((a, b) => a.d - b.d);

  const tgtF = curAct && curAct.f, leafTint = seasonTint();
  const pAtk = P.atkT != null && P.atkT < P.atkDur ? P.atkT / P.atkDur : -1;
  for (const e of dl) {
    if (e.k === 99) { e.fn(); continue; }
    if (e.k === 1) {
      const cut = mode !== 'menu' && ((inside && hAt[e.i] === inside && e.d > pD - .3) ||
        (e.d > pD + .2 && Math.hypot(e.x + .5 - P.x, e.y + .5 - P.y) < 2.4) || occludes(e.x, e.y, WH));
      const door = map[e.i] === DOOR, bw = door ? 1.5 : 1.1;
      sprite('w' + e.i, wallKey(e.x, e.y, e.i, cut), e.x, e.y, Math.floor(-bw * U), Math.floor(-WH - .25 * U), Math.ceil(bw * U), Math.ceil((door ? 1.5 : 1.15) * U), () => drawWallTile(e.x, e.y, e.i, cut));
    } else if (e.k === 2) {
      const fade = !e.oob && mode !== 'menu' && occludes(e.x, e.y, U * 3.2), f = e.oob ? .24 : fogF(e.i), a = fade ? .3 : 1;
      const pine = hash(e.x * 3, e.y * 7) > .62, v = pine ? (hash(e.x, e.y * 5) < .5 ? 0 : 1) : Math.floor(hash(e.y, e.x) * 3);
      const base = (pine ? 'pine_' : 'tree_') + v;
      const tid = e.oob ? 'To' + e.x + ',' + e.y : 'T' + e.i;
      objAt(tid, base + '_t', e.x + .5, e.y + .5, f, a);
      const wind = reduceMotion ? 0 : Math.round(Math.sin(animT * 1.1 + e.x * .7 + e.y * .3) * 1.4 * (1 + rain * 1.5));
      objAt(e.oob ? 'Co' + e.x + ',' + e.y : 'C' + e.i, base + '_c', e.x + .5, e.y + .5, f, a, wind, pine ? null : leafTint);
    } else if (e.k === 3) {
      const fu = e.fu, ft = SPRA[fu.type] || fu.type, tall = ft === 'wardrobe' || ft === 'fridge' || ft === 'shelf' || ft === 'bookshelf' || ft === 'hanger';
      const fade = tall && mode !== 'menu' && fu.cx + fu.cy > pD && Math.hypot(fu.cx - P.x, fu.cy - P.y) < 1.6;
      objAt('F' + furn[e.i], furnName(fu), fu.cx, fu.cy, fogF(e.i), fade ? .35 : 1);
      if (fu === tgtF) drawHi(fu);
      else if (tgtF && tgtF.type === 'stove' && fu === tgtF) drawHi(fu);
    } else if (e.k === 4) {
      const Hs = e.Hs, b = roofBounds(Hs);
      sprite('R' + e.hi, 'r' + snowLvl(), Hs.x, Hs.y, b[0], b[1], b[2], b[3], () => { for (let y = Hs.y; y < Hs.y + Hs.h; y++) for (let x = Hs.x; x < Hs.x + Hs.w; x++) drawRoof(x, y, Hs, 1); }, Hs.mode === 2 ? .22 : 1);
      if (Hs.sign) drawShopSign(Hs, Hs.mode === 2 ? .3 : 1);
    } else if (e.k === 5) {
      const z = e.z, [an, fi] = zombieAnim(z);
      drawZombie(z, an, fi, zAlpha(z));
      if (z.burn > 0) flames(SX(z.x, z.y), SY(z.x, z.y, z.crawl ? 6 : 40), 7, 1.6, z.seed * 9);
    } else if (e.k === 8) {
      const c = e.c, i = Math.floor(c.y) * MW + Math.floor(c.x);
      if (vis[i]) { const n = AN('z', 'death'); drawZombie(c, 'death', Math.min(n - 1, Math.floor(c.fall * n))); }
    } else if (e.k === 7) {
      const p = e.p, f = fogF(e.i);
      const on = p.type === 'lamp' && powerOn() && lightLevel() < .6 && !(p.flick && Math.sin(animT * 23 + p.cx) > .7);
      if (p.proc) drawProc(p, f); else { objAt('P' + e.pid, propName(p, on), p.cx, p.cy, f, null, 0, p.type === 'bush' ? leafTint : null); if (p.type === 'car' && (p.police || p.army)) drawCarExtras(p, f); }
      if (p === tgtF) drawHi(p);
    } else if (e.k === 9) {
      const fi = e.fi;
      objAt('fire' + fi.seed, 'campfire', fi.x, fi.y, fogF(e.i));
      if (!fi.out) {
        const bx = Math.round(SX(fi.x, fi.y)), by = Math.round(SY(fi.x, fi.y, 3));
        const cols = ['#ffe08a', '#ffb050', '#ff7a2e', '#d84a1e'];
        for (let q = 0; q < 9; q++) {
          const ph = animT * (5 + q * .7) + q * 1.7 + fi.seed * 9;
          const hgt = Math.max(1, Math.round((5 + 4 * Math.sin(ph)) * Math.min(1, fi.t / 60 + .3)));
          const xo = Math.round((q - 4) * 1.1 + Math.sin(ph * 1.3) * .8);
          ctx.fillStyle = cols[Math.min(3, Math.floor(Math.abs(q - 4) / 1.4))];
          ctx.fillRect(bx + xo, by - hgt, 1 + (q % 2), hgt);
        }
        ctx.fillStyle = '#fff2c0'; ctx.fillRect(bx - 1, by - 3 - Math.round(Math.sin(animT * 9) + 1), 2, 2);
      }
    } else if (e.k === 16) { drawCarDyn(e.p, fogF(e.i)); if (e.p === tgtF && !P.car) drawHi(e.p);
    } else if (e.k === 17) { drawFlare(e.f);
    } else if (e.k === 15) { drawBlaze(e.b);
    } else if (e.k === 14) { drawChute(e.a);
    } else if (e.k === 10) { drawPile(e.p);
    } else if (e.k === 11) {
      const t = e.t, u = t.t / t.dur, x = t.x0 + (t.x1 - t.x0) * u, y = t.y0 + (t.y1 - t.y0) * u;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(SX(x, y), SY(x, y, 0), 3, 1.3, 0, 0, 6.283); ctx.fill();
      ctx.save(); const cx = SX(x, y), cy = SY(x, y, U * (.9 + 1.4 * Math.sin(Math.PI * u)) * (1 - u * .4));
      ctx.translate(cx, cy); ctx.rotate(u * 9); drawIcon(t.it.id, 0, 0, 9); ctx.restore();
    } else if (e.k === 12) {
      const r = e.r, jx = Math.sin(animT * 60) * .8;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(SX(r.x, r.y), SY(r.x, r.y, 0), 5, 2.2, 0, 0, 6.283); ctx.fill();
      drawIcon(r.it.id, SX(r.x, r.y) + jx, SY(r.x, r.y, 4), 11);
      const ph = (animT * 2) % 1; ctx.strokeStyle = `rgba(255,220,150,${.6 * (1 - ph)})`; ctx.lineWidth = .8; ctx.beginPath(); ctx.ellipse(SX(r.x, r.y), SY(r.x, r.y, 2), 4 + ph * 14, (4 + ph * 14) * .5, 0, 0, 6.283); ctx.stroke();
    } else if (e.k === 6) {
      if (P.sleep || P.car) continue;
      const [an, fi] = playerAnim(pAtk);
      drawPlayer(an, fi, vaultZ());
    }
  }
  if (P.sleep && !P.bed) { const sx = SX(P.x, P.y), sy = SY(P.x, P.y, 0); ctx.fillStyle = '#3c6e78'; ctx.strokeStyle = 'rgba(16,14,12,.85)'; ctx.lineWidth = .6; ctx.beginPath(); ctx.ellipse(sx, sy, 15, 7, 0, 0, 6.283); ctx.fill(); ctx.stroke(); }
  if (P.sleep) { const bed = P.bed, lk = P.look || look; drawChar(P, 'p' + lk.g + '_death_' + dirOf(bed ? Math.atan2(-bed.wd[1], -bed.wd[0]) : P.face) + '_' + (AN('p', 'death') - 1), 'P' + lk.g + lk.skin + lk.hair + lk.shirt + lk.pants, lookPal(lk), bed ? bed.cx : P.x, bed ? bed.cy : P.y, bed ? 15 : 3); }
  ctx.fillStyle = 'rgba(10,10,10,.9)';
  for (const c of corpses) {
    if (c.fall < 1) continue; const i = Math.floor(c.y) * MW + Math.floor(c.x); if (!vis[i]) continue;
    for (let q = 0; q < 3; q++) { const a = animT * (3 + q) + q * 2 + c.seed * 9; const fx = c.x + Math.cos(a) * .3, fy = c.y + Math.sin(a * 1.3) * .25; ctx.fillRect(Math.round(SX(fx, fy)), Math.round(SY(fx, fy, U * (.35 + Math.sin(a * 2) * .15))), 1, 1); }
  }
  drawParts();
  drawBreath(); drawBustle(); drawEvac(); drawScreamFx(); drawLootMarks(); drawV23(); drawEditMarks(); drawFog(); if (tapMark) tapMark.t -= dt;

  // time-of-day tint
  const hr = hourOf(), L = lightLevel();
  let tint = null;
  if (hr >= 16.5 && hr < 20.5) { const k = hr < 18.5 ? (hr - 16.5) / 2 : 1 - (hr - 18.5) / 2; tint = `rgba(255,128,48,${.16 * k})`; }
  else if (hr >= 5 && hr < 7.5) { const k = hr < 6 ? hr - 5 : 1 - (hr - 6) / 1.5; tint = `rgba(255,150,170,${.1 * k})`; }
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }
  if (wet > .02) { ctx.fillStyle = `rgba(40,54,70,${.2 * wet})`; ctx.fillRect(0, 0, W, H); }

  // darkness & lights
  const fl = mode === 'play' ? flashlight() : null;
  if (!(mode === 'play' && L >= .999 && !P.sleep)) {
    const alpha = mode === 'menu' ? .5 : (P.sleep ? .25 : .1) + .74 * (1 - L) + .08 * wet;
    let rTiles = mode === 'menu' ? 9 : 3.4 + 9 * L + (hasTr('eagle') ? 1.2 : 0) - (hasTr('short') ? 1 : 0);
    if (inside && poweredAt(P.x, P.y) && roomLitAt(P.x, P.y) && L < .6 && mode === 'play') rTiles = Math.max(rTiles, 7);
    const vr = rTiles * U * .55;
    lx.globalCompositeOperation = 'source-over';
    lx.clearRect(0, 0, lc.width, lc.height);
    lx.fillStyle = `rgba(6,10,22,${Math.min(.92, alpha)})`; lx.fillRect(0, 0, lc.width, lc.height);
    lx.globalCompositeOperation = 'destination-out';
    const hole = (cx, cy, r, s2) => { const g = lx.createRadialGradient(cx, cy, r * .2, cx, cy, r); g.addColorStop(0, `rgba(0,0,0,${s2})`); g.addColorStop(1, 'rgba(0,0,0,0)'); lx.fillStyle = g; lx.beginPath(); lx.arc(cx, cy, r, 0, 6.283); lx.fill(); };
    { const dk = mode === 'play' && L < .75 && inside && !roomLitAt(P.x, P.y); hole(SX(P.x, P.y) / 2, SY(P.x, P.y, U * .9) / 2, dk ? vr * .55 : vr, dk ? .55 : 1); }   // свет выключен — темно
    const fireGlow = [];
    for (const fi of fires) if (!fi.out) { const sx = SX(fi.x, fi.y), sy = SY(fi.x, fi.y, 6); if (sx > -200 && sx < W + 200 && sy > -200 && sy < H + 200) { const fl2 = 1 + Math.sin(animT * 11 + fi.seed * 7) * .06; hole(sx / 2, sy / 2, U * 2.6 * fl2, .95); fireGlow.push([sx, sy, fl2]); } }
    for (const p of dynCars) if (p.engine) for (let q = 1; q <= 3; q++) { const bx = p.cx + Math.cos(p.ang) * (q * 1.4 + .6), by = p.cy + Math.sin(p.ang) * (q * 1.4 + .6); hole(SX(bx, by) / 2, SY(bx, by, 0) / 2, U * (.8 + q * .5), .9); }
    for (const f of flares) { const sx = SX(f.x, f.y), sy = SY(f.x, f.y, 4); hole(sx / 2, sy / 2, U * 3, .9); }
    for (const s of gunFx) hole(SX(s.x0, s.y0) / 2, SY(s.x0, s.y0, U) / 2, U * 2.8, Math.min(.95, s.t * 9));
    for (const b of blazes) { const sx = SX(b.x, b.y), sy = SY(b.x, b.y, 6); hole(sx / 2, sy / 2, U * 3.4, .95); fireGlow.push([sx, sy, 1.4]); }
    const lamps = [];
    if (L < .9 && (powerOn() || gens.some(g => g.on))) {
      if (powerOn()) for (const p of props) if (p.type === 'lamp' && !(p.flick && Math.sin(animT * 23 + p.cx) > .7)) { const gx = p.cx + p.hx * .6, gy = p.cy + p.hy * .6, sx = SX(gx, gy), sy = SY(gx, gy, 0); if (sx > -200 && sx < W + 200 && sy > -200 && sy < H + 200) { lamps.push([sx, sy]); hole(sx / 2, sy / 2, U * 1.9, .85); } }
      for (const Hs of houses) {
        if (Hs.kind === 'shed') continue;
        if (!powerOn() && !poweredAt((Hs.ix0 + Hs.ix1) / 2, (Hs.iy0 + Hs.iy1) / 2)) continue;
        const sx = SX((Hs.ix0 + Hs.ix1) / 2, (Hs.iy0 + Hs.iy1) / 2); if (sx < -300 || sx > W + 300) continue;
        litHousePoly(Hs);
      }
    }
    if (fl && fl.id === 'candle' && L < .9) hole(SX(P.x, P.y) / 2, SY(P.x, P.y, U * .9) / 2, U * 3.4, .8);
    else if (fl && L < .9) {
      for (let q = 1; q <= 3; q++) { const bx = P.x + Math.cos(P.face) * q * 1.3, by = P.y + Math.sin(P.face) * q * 1.3; hole(SX(bx, by) / 2, SY(bx, by, 0) / 2, U * (.9 + q * .55), .9); }
    }
    lx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true; ctx.drawImage(lc, 0, 0, W, H); ctx.imageSmoothingEnabled = false;
    if (fireGlow.length && L < .95) {
      ctx.globalCompositeOperation = 'lighter';
      for (const [sx, sy, k] of fireGlow) { const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, U * 2.4 * k); g.addColorStop(0, `rgba(255,140,60,${.3 * (1 - L * .7)})`); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, U * 2.4 * k, 0, 6.283); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (lamps.length && L < .9) {
      ctx.globalCompositeOperation = 'lighter';
      for (const [sx, sy] of lamps) { const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, U * 2.2); g.addColorStop(0, `rgba(255,190,110,${.18 * (1 - L)})`); g.addColorStop(1, 'rgba(255,190,110,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, U * 2.2, 0, 6.283); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  drawHeliLight(); drawHeli();
  // ---- screen-space overlays ----
  mainCtx.setTransform(1, 0, 0, 1, 0, 0); mainCtx.imageSmoothingEnabled = false;
  if (flash > 0) { mainCtx.fillStyle = `rgba(230,236,255,${flash * .55})`; mainCtx.fillRect(0, 0, cv.width, cv.height); flash = Math.max(0, flash - dt * (flash > .6 ? 6 : 2.2)); }
  const K = SCALE;

  // rain at screen resolution
  if (wet > .02 && !reduceMotion && settings.rain && !(mode === 'play' && insideHouse(P.x, P.y))) {
    const want = Math.floor(140 * wet), SW = cv.width, SH = cv.height;
    while (drops.length < want) drops.push({x:Math.random() * SW, y:Math.random() * SH, s:.7 + Math.random() * .6});
    if (drops.length > want) drops.length = want;
    if (snowing()) {
      mainCtx.fillStyle = 'rgba(245,248,255,.85)';
      for (const d of drops) { d.y += 55 * DEV * d.s * dt; d.x += (Math.sin(animT * 1.3 + d.s * 9) * 22 - 8) * DEV * dt; if (d.y > SH) { d.y = -5; d.x = Math.random() * SW; } const r = (.8 + d.s * d.s * 1.6) * DEV; mainCtx.globalAlpha = .45 + d.s * .45; mainCtx.beginPath(); mainCtx.arc(d.x, d.y, r, 0, 6.283); mainCtx.fill(); } mainCtx.globalAlpha = 1;
    } else {
    mainCtx.strokeStyle = 'rgba(190,205,220,.35)'; mainCtx.lineWidth = DEV; mainCtx.beginPath();
    for (const d of drops) {
      d.y += 900 * DEV * d.s * dt; d.x -= 160 * DEV * d.s * dt;
      if (d.y > SH) { d.y = -20 * DEV; d.x = Math.random() * (SW + 100 * DEV); }
      mainCtx.moveTo(d.x, d.y); mainCtx.lineTo(d.x + 4 * DEV * d.s, d.y - 20 * DEV * d.s);
    }
    mainCtx.stroke();
    }
  }
  // labels at screen resolution
  if (mode === 'play' && !P.sleep) {
    const px = SX(P.x, P.y) * K, py = SY(P.x, P.y, U * 2.25) * K;
    if (P.act) {
      const k = P.act.t / P.act.dur, r = 9 * DEV;
      mainCtx.strokeStyle = 'rgba(0,0,0,.6)'; mainCtx.lineWidth = 5 * DEV; mainCtx.beginPath(); mainCtx.arc(px, py, r, 0, 6.283); mainCtx.stroke();
      mainCtx.strokeStyle = '#d39b3a'; mainCtx.lineWidth = 3 * DEV; mainCtx.beginPath(); mainCtx.arc(px, py, r, -1.57, -1.57 + k * 6.283); mainCtx.stroke();
    } else if (curAct && !paused) {
      let label, tx, ty;
      if (curAct.f) { label = (actName(curAct) || 'Тут') + ' · ' + curAct.label.toLowerCase(); tx = curAct.f.cx != null ? curAct.f.cx : curAct.f.x; ty = curAct.f.cy != null ? curAct.f.cy : curAct.f.y; }
      else { tx = curAct.o.x + .5; ty = curAct.o.y + .5; label = (obs[curAct.o.i].t === 'door' ? 'Дверь' : 'Окно') + ' · ' + curAct.label.toLowerCase(); }
      if (isTouch) { const lx = SX(tx, ty) * K, ly = SY(tx, ty, U * 2.1) * K + Math.sin(animT * 5) * 2 * DEV, r = 5 * DEV; mainCtx.fillStyle = '#f0c477'; mainCtx.strokeStyle = 'rgba(0,0,0,.7)'; mainCtx.lineWidth = 2 * DEV; mainCtx.beginPath(); mainCtx.moveTo(lx - r, ly - r); mainCtx.lineTo(lx + r, ly - r); mainCtx.lineTo(lx, ly + r * .6); mainCtx.closePath(); mainCtx.stroke(); mainCtx.fill(); label = ''; }
      const fs = 13 * DEV;
      if (label) { mainCtx.font = `700 ${fs}px "PT Sans", sans-serif`; mainCtx.textAlign = 'center';
      const tw = mainCtx.measureText(label).width, lx0 = SX(tx, ty) * K, ly0 = SY(tx, ty, U * 2.3) * K;
      mainCtx.fillStyle = 'rgba(13,17,21,.86)'; mainCtx.fillRect(lx0 - tw / 2 - 7 * DEV, ly0 - fs * 1.1, tw + 14 * DEV, fs * 1.5);
      mainCtx.fillStyle = '#ddd6c6'; mainCtx.fillText(label, lx0, ly0); }
    }
  }
  if (frameNo % 60 === 0) evict();
}
let frameNo = 0;
