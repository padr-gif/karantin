// ================= world pieces =================
function faceTex(Hs, px, py) {
  if (!Hs) return [TX.siding([150,140,120]), false];
  const inside = px > Hs.ix0 && px < Hs.ix1 && py > Hs.iy0 && py < Hs.iy1;
  if (inside) return [TX.paper(Hs.paper, Hs.pstyle), true];
  if (Hs.kind === 'store' || Hs.kind === 'hardware') return [TX.brick(), false];
  if (COMM.has(Hs.kind)) return [TX.siding(Hs.wallC), false];
  if (Hs.kind === 'shed') return [TX.planksV(Hs.wallC), false];
  return [TX.siding(Hs.wallC), false];
}
function wallPiece(x0, y0, x1, y1, z0, z1, Hs) {
  const [sT] = faceTex(Hs, (x0 + x1) / 2, y1 + .05), [eT] = faceTex(Hs, x1 + .05, (y0 + y1) / 2);
  const fS = fogAt(Math.floor((x0 + x1) / 2), Math.floor(y1 + .05)), fE = fogAt(Math.floor(x1 + .05), Math.floor((y0 + y1) / 2));
  vface(x0, y1, x1, y1, z0, z1, sT, 1 - fS * .92);
  vface(x1, y0, x1, y1, z0, z1, eT, 1 - fE * .74);
  resetT();
  poly4(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, C(COL.cap, Math.max(fS, fE)));
}
function drawWallTile(x, y, i, cut) {
  const t = map[i], Hs = houses[hAt[i] - 1];
  const top = cut ? U * .32 : WH;
  if (t === WALL) { for (const r of wpV[i]) wallPiece(x + r[0], y + r[1], x + r[2], y + r[3], 0, top, Hs); return; }
  const ax = alongX(x, y), o = obs[i], h = HWV;
  const f = Math.max(fogAt(x + (ax ? 0 : 1), y + (ax ? 1 : 0)), fogF(i));
  const band = (z0, z1) => ax ? wallPiece(x, y + .5 - h, x + 1, y + .5 + h, z0, z1, Hs) : wallPiece(x + .5 - h, y, x + .5 + h, y + 1, z0, z1, Hs);
  const plane = (z0, z1, fill, k) => { k = k || 0;
    if (ax) poly4(x + .06, y + .5 + k, z0, x + .94, y + .5 + k, z0, x + .94, y + .5 + k, z1, x + .06, y + .5 + k, z1, fill);
    else poly4(x + .5 + k, y + .06, z0, x + .5 + k, y + .94, z0, x + .5 + k, y + .94, z1, x + .5 + k, y + .06, z1, fill); };
  const planks = o.bhp > 0 ? Math.ceil(o.bhp / 45) : 0;
  const plankBar = (zc, tilt) => {
    const k = h + .03, d = tilt * U * .22, th = U * .13;
    ctx.fillStyle = C(COL.plank, f); ctx.beginPath();
    if (ax) { ctx.moveTo(SX(x - .02, y + .5 + k), SY(x - .02, y + .5 + k, zc - d)); ctx.lineTo(SX(x + 1.02, y + .5 + k), SY(x + 1.02, y + .5 + k, zc + d)); ctx.lineTo(SX(x + 1.02, y + .5 + k), SY(x + 1.02, y + .5 + k, zc + d + th)); ctx.lineTo(SX(x - .02, y + .5 + k), SY(x - .02, y + .5 + k, zc - d + th)); }
    else { ctx.moveTo(SX(x + .5 + k, y - .02), SY(x + .5 + k, y - .02, zc - d)); ctx.lineTo(SX(x + .5 + k, y + 1.02), SY(x + .5 + k, y + 1.02, zc + d)); ctx.lineTo(SX(x + .5 + k, y + 1.02), SY(x + .5 + k, y + 1.02, zc + d + th)); ctx.lineTo(SX(x + .5 + k, y - .02), SY(x + .5 + k, y - .02, zc - d + th)); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(40,30,20,.7)'; const mx = ax ? x + .12 : x + .5 + k, my = ax ? y + .5 + k : y + .12, mx2 = ax ? x + .88 : x + .5 + k, my2 = ax ? y + .5 + k : y + .88;
    ctx.fillRect(SX(mx, my) - 1, SY(mx, my, zc - d * .76 + th / 2) - 1, 2, 2); ctx.fillRect(SX(mx2, my2) - 1, SY(mx2, my2, zc + d * .76 + th / 2) - 1, 2, 2);
  };
  const metal = (z0, z1) => {
    if (!(o.mhp > 0)) return;
    const k = h + .055, col = C([132, 138, 144], f), dk = C([84, 88, 94], f);
    if (ax) poly4(x + .04, y + .5 + k, z0, x + .96, y + .5 + k, z0, x + .96, y + .5 + k, z1, x + .04, y + .5 + k, z1, col);
    else poly4(x + .5 + k, y + .04, z0, x + .5 + k, y + .96, z0, x + .5 + k, y + .96, z1, x + .5 + k, y + .04, z1, col);
    ctx.fillStyle = dk;
    for (const u of [.12, .88]) for (const zz of [z0 + 3, z1 - 3]) { const px = ax ? x + u : x + .5 + k, py = ax ? y + .5 + k : y + u; ctx.fillRect(SX(px, py) - 1, SY(px, py, zz) - 1, 2, 2); }
    if (o.mhp < 110) { ctx.strokeStyle = dk; ctx.lineWidth = 1; ctx.beginPath(); const px = ax ? x + .35 : x + .5 + k, py = ax ? y + .5 + k : y + .35, zm = (z0 + z1) / 2; line3(px, py, zm, ax ? px + .25 : px, ax ? py : py + .25, zm + U * .18); if (o.mhp < 55) line3(ax ? px + .3 : px, ax ? py : py + .3, zm - U * .2, ax ? px + .45 : px, ax ? py : py + .45, zm); ctx.stroke(); }
  };
  const night = lightLevel() < .5 && poweredAt(x, y) && winLit(x, y);
  if (t === WIN) {
    const sill = WH * .36, lint = WH * .8;
    band(0, Math.min(top, sill));
    if (!cut) {
      if (ax) wallPiece(x, y + .5 - h, x + .07, y + .5 + h, sill, lint, Hs); else wallPiece(x + .5 - h, y, x + .5 + h, y + .07, sill, lint, Hs);
      if (o.cur) {
        const cc = C(o.cur, f * .8, 1), cd = C(o.cur, f * .55, 1), kk = -h - .02;
        const pp = (u0, u1, fill) => { if (ax) poly4(x + u0, y + .5 + kk, sill, x + u1, y + .5 + kk, sill, x + u1, y + .5 + kk, lint, x + u0, y + .5 + kk, lint, fill); else poly4(x + .5 + kk, y + u0, sill, x + .5 + kk, y + u1, sill, x + .5 + kk, y + u1, lint, x + .5 + kk, y + u0, lint, fill); };
        if (o.cc) { pp(.06, .94, cc); for (let q = 0; q < 4; q++) pp(.15 + q * .21, .2 + q * .21, cd); }
        else { pp(.06, .26, cc); pp(.74, .94, cc); pp(.15, .19, cd); pp(.81, .85, cd); }
      }
      const wk = o.ang == null ? (o.open ? 1 : 0) : o.ang;   // 0 shut … 1 lower sash fully raised (animated)
      if (!o.broken && wk > .02) {
        const mid = (sill + lint) / 2, z0 = sill + (mid - sill) * wk;
        plane(z0, lint, night ? `rgba(255,206,120,${.62 * f})` : `rgba(160,192,210,${.4 * f})`);
        ctx.strokeStyle = C(COL.frame, f * .9); ctx.lineWidth = Math.max(1.5, U * .04); ctx.beginPath();
        if (ax) { line3(x + .5, y + .5, z0, x + .5, y + .5, lint); line3(x + .06, y + .5, mid, x + .94, y + .5, mid); line3(x + .06, y + .5, z0, x + .94, y + .5, z0); }
        else { line3(x + .5, y + .5, z0, x + .5, y + .5, lint); line3(x + .5, y + .06, mid, x + .5, y + .94, mid); line3(x + .5, y + .06, z0, x + .5, y + .94, z0); }
        ctx.stroke();
      } else if (!o.broken) {
        plane(sill, lint, night ? `rgba(255,206,120,${.62 * f})` : `rgba(160,192,210,${.4 * f})`);
        if (!night) { ctx.strokeStyle = `rgba(255,255,255,${.4 * f})`; ctx.lineWidth = 1.5; ctx.beginPath();
          if (ax) { line3(x + .25, y + .5, sill + U * .15, x + .45, y + .5, lint - U * .15); line3(x + .35, y + .5, sill + U * .1, x + .5, y + .5, sill + U * .5); }
          else { line3(x + .5, y + .25, sill + U * .15, x + .5, y + .45, lint - U * .15); line3(x + .5, y + .35, sill + U * .1, x + .5, y + .5, sill + U * .5); }
          ctx.stroke(); }
        // mullion
        ctx.strokeStyle = C(COL.frame, f * .9); ctx.lineWidth = Math.max(1.5, U * .04); ctx.beginPath();
        if (ax) { line3(x + .5, y + .5, sill, x + .5, y + .5, lint); line3(x + .06, y + .5, (sill + lint) / 2, x + .94, y + .5, (sill + lint) / 2); }
        else { line3(x + .5, y + .5, sill, x + .5, y + .5, lint); line3(x + .5, y + .06, (sill + lint) / 2, x + .5, y + .94, (sill + lint) / 2); }
        ctx.stroke();
      } else if (!o.cleared) {   // jagged glass left in the frame (gone once the shards are cleared out)
        ctx.fillStyle = `rgba(190,215,225,${.45 * f})`; ctx.beginPath();
        const pts = ax ? [[x + .06, sill], [x + .2, sill + U * .35], [x + .3, sill + U * .1], [x + .45, sill + U * .28], [x + .6, sill], [x + .8, sill + U * .22], [x + .94, sill]] : null;
        if (ax) { pts.forEach(([px, pz], k) => k ? ctx.lineTo(SX(px, y + .5), SY(px, y + .5, pz)) : ctx.moveTo(SX(px, y + .5), SY(px, y + .5, pz))); }
        else { [[y + .06, sill], [y + .2, sill + U * .35], [y + .3, sill + U * .1], [y + .45, sill + U * .28], [y + .6, sill], [y + .8, sill + U * .22], [y + .94, sill]].forEach(([py, pz], k) => k ? ctx.lineTo(SX(x + .5, py), SY(x + .5, py, pz)) : ctx.moveTo(SX(x + .5, py), SY(x + .5, py, pz))); }
        ctx.closePath(); ctx.fill();
      }
      if (ax) wallPiece(x + .93, y + .5 - h, x + 1, y + .5 + h, sill, lint, Hs); else wallPiece(x + .5 - h, y + .93, x + .5 + h, y + 1, sill, lint, Hs);
      band(lint, WH);
      if (ax) box(x + .02, y + .5 - h - .01, x + .98, y + .5 + h + .04, sill - U * .06, sill, COL.frame, f * .95);
      else box(x + .5 - h - .01, y + .02, x + .5 + h + .04, y + .98, sill - U * .06, sill, COL.frame, f * .95);
      for (let k = 0; k < planks; k++) plankBar(sill + U * (.22 + k * .36), k % 2 ? -1 : 1);
      metal(sill + 2, lint - 2);
    } else { for (let k = 0; k < planks; k++) plankBar(U * .04 + k * U * .08, 0); metal(U * .02, U * .3); }
    return;
  }
  // door with animated leaf
  const lint = WH * .84, th = .06, sw = o.sw || 1, ang = o.ang == null ? (o.open ? 1 : 0) : o.ang;
  const wood = TX.woodLight(COL.door);
  if (!cut) {
    if (!o.dead) {
      const th2 = ang * Math.PI / 2;
      let hx, hy, cdx, cdy, odx, ody;
      if (ax) { hx = x + .06; hy = y + .5; cdx = 1; cdy = 0; odx = 0; ody = sw; } else { hx = x + .5; hy = y + .06; cdx = 0; cdy = 1; odx = sw; ody = 0; }
      const dx = cdx * Math.cos(th2) + odx * Math.sin(th2), dy = cdy * Math.cos(th2) + ody * Math.sin(th2);
      obox(hx, hy, dx, dy, .88, th, 0, lint, COL.door, f, wood);
      // panels & knob on the visible side
      const kx = hx + dx * .78, ky = hy + dy * .78;
      ctx.fillStyle = C([210,186,110], f); ctx.beginPath(); ctx.arc(SX(kx, ky) + 2, SY(kx, ky, lint * .48), Math.max(1.5, U * .045), 0, 6.283); ctx.fill();
    } else {
      // broken leaf lying on the floor
      if (ax) hface(x + .1, y + .5 + .1 * sw, x + .95, y + .5 + .85 * sw, 2, wood, 1 - f * .9);
      else hface(x + .5 + .1 * sw, y + .1, x + .5 + .85 * sw, y + .95, 2, wood, 1 - f * .9);
      resetT();
    }
    if (ax) { wallPiece(x, y + .5 - h, x + .06, y + .5 + h, 0, lint, Hs); wallPiece(x + .94, y + .5 - h, x + 1, y + .5 + h, 0, lint, Hs); }
    else { wallPiece(x + .5 - h, y, x + .5 + h, y + .06, 0, lint, Hs); wallPiece(x + .5 - h, y + .94, x + .5 + h, y + 1, 0, lint, Hs); }
    band(lint, WH);
    for (let k = 0; k < planks; k++) plankBar(U * (.35 + k * .45), k % 2 ? -1 : 1);
    metal(U * .12, lint * .94);
  } else {
    if (!o.open && !o.dead) { if (ax) box(x + .06, y + .5 - th / 2, x + .94, y + .5 + th / 2, 0, top, COL.door, f); else box(x + .5 - th / 2, y + .06, x + .5 + th / 2, y + .94, 0, top, COL.door, f); }
    for (let k = 0; k < planks; k++) plankBar(U * .04 + k * U * .08, 0);
    metal(U * .02, U * .3);
  }
}
function roofZ(Hs, x, y) {
  const pitch = Hs.kind === 'house' ? U * 1.2 : U * .22;
  if (Hs.ridgeX) { const c = Hs.y + Hs.h / 2, half = (Hs.h - 1) / 2; return WH + pitch * (1 - Math.abs(y - c) / half); }
  const c = Hs.x + Hs.w / 2, half = (Hs.w - 1) / 2; return WH + pitch * (1 - Math.abs(x - c) / half);
}
function roofRect(Hs, x0, y0, x1, y1, a) {
  // one planar roof patch (does not cross the ridge)
  const pitch = Hs.kind === 'house' ? U * 1.2 : U * .22;
  let A, B, tex, dark;
  const house = Hs.kind === 'house';
  if (Hs.ridgeX) {
    const c = Hs.y + Hs.h / 2, half = (Hs.h - 1) / 2, s = (y0 + y1) / 2 < c ? 1 : -1;
    // z = WH + pitch*(1 - s*(c - y)/half)  → linear in y
    B = s * pitch / half; A = WH + pitch - s * pitch * c / half;
    tex = house ? TX.shingles(Hs.roofC, 0) : TX.metal(Hs.roofC, 0);
    dark = s > 0 ? .3 : 0;
    ctx.setTransform(DPR * U, DPR * hh, -DPR * U, DPR * (hh - B), DPR * ox, DPR * (oy - A));
  } else {
    const c = Hs.x + Hs.w / 2, half = (Hs.w - 1) / 2, s = (x0 + x1) / 2 < c ? 1 : -1;
    B = s * pitch / half; A = WH + pitch - s * pitch * c / half;
    tex = house ? TX.shingles(Hs.roofC, 1) : TX.metal(Hs.roofC, 1);
    dark = s > 0 ? .05 : .26;
    ctx.setTransform(DPR * U, DPR * (hh - B), -DPR * U, DPR * hh, DPR * ox, DPR * (oy - A));
  }
  if (a < 1) ctx.globalAlpha = a;
  ctx.fillStyle = tex; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  { const sl = snowLvl(); if (sl > 0 && Hs.kind !== 'store') { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * sl * .92; ctx.fillStyle = snowPat('roof'); ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.globalAlpha = ga; } }
  if (dark) { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); }
  ctx.globalAlpha = 1;
}
function drawRoof(x, y, Hs, a) {
  const ov = .3;
  const rx0 = Hs.ix0 - ov, ry0 = Hs.iy0 - ov, rx1 = Hs.ix1 + ov, ry1 = Hs.iy1 + ov;
  const x0 = Math.max(x, rx0), y0 = Math.max(y, ry0), x1 = Math.min(x + 1, rx1), y1 = Math.min(y + 1, ry1);
  if (x0 >= x1 || y0 >= y1) return;
  const z = (px, py) => roofZ(Hs, px, py);
  if (a < 1) ctx.globalAlpha = a;
  if (Hs.kind === 'house') { // gable wall triangles
    if (Hs.ridgeX && x === Hs.x + Hs.w - 1) { const ya = Math.max(y, Hs.iy0), yb = Math.min(y + 1, Hs.iy1); if (ya < yb) { const c = Hs.y + Hs.h / 2; const pts = [[ya, WH], [yb, WH], [yb, z(Hs.ix1, yb)]]; if (c > ya && c < yb) pts.push([c, z(Hs.ix1, c)]); pts.push([ya, z(Hs.ix1, ya)]); gable(Hs.ix1, pts, false, Hs); } }
    if (!Hs.ridgeX && y === Hs.y + Hs.h - 1) { const xa = Math.max(x, Hs.ix0), xb = Math.min(x + 1, Hs.ix1); if (xa < xb) { const c = Hs.x + Hs.w / 2; const pts = [[xa, WH], [xb, WH], [xb, z(xb, Hs.iy1)]]; if (c > xa && c < xb) pts.push([c, z(c, Hs.iy1)]); pts.push([xa, z(xa, Hs.iy1)]); gable(Hs.iy1, pts, true, Hs); } }
  }
  ctx.globalAlpha = 1;
  // split at ridge
  if (Hs.ridgeX) { const c = Hs.y + Hs.h / 2; if (c > y0 && c < y1) { roofRect(Hs, x0, y0, x1, c, a); roofRect(Hs, x0, c, x1, y1, a); } else roofRect(Hs, x0, y0, x1, y1, a); }
  else { const c = Hs.x + Hs.w / 2; if (c > x0 && c < x1) { roofRect(Hs, x0, y0, c, y1, a); roofRect(Hs, c, y0, x1, y1, a); } else roofRect(Hs, x0, y0, x1, y1, a); }
  resetT();
  if (a < 1) ctx.globalAlpha = a;
  if (Hs.kind === 'house') {
    const ridge = Hs.ridgeX ? Hs.y + Hs.h / 2 : Hs.x + Hs.w / 2;
    ctx.strokeStyle = C(Hs.roofC, .5); ctx.lineWidth = Math.max(2, U * .07); ctx.beginPath();
    if (Hs.ridgeX && ridge >= y && ridge < y + 1) line3(x0, ridge, z(x0, ridge) + 1, x1, ridge, z(x1, ridge) + 1);
    if (!Hs.ridgeX && ridge >= x && ridge < x + 1) line3(ridge, y0, z(ridge, y0) + 1, ridge, y1, z(ridge, y1) + 1);
    ctx.stroke();
    if (Hs.chimney && Hs.chimney[0] === x && Hs.chimney[1] === y) { const zc = z(x + .5, y + .5); box(x + .3, y + .3, x + .62, y + .62, zc - U * .3, zc + U * .9, COL.brick, 1, a, {s:TX.brick(), e:TX.brick()}); if (a < 1) ctx.globalAlpha = a; }
    // eave edge
    ctx.strokeStyle = C(Hs.roofC, .38); ctx.lineWidth = 2; ctx.beginPath();
    if (Hs.ridgeX && y1 === ry1) line3(x0, y1, z(x0, y1), x1, y1, z(x1, y1));
    if (!Hs.ridgeX && x1 === rx1) line3(x1, y0, z(x1, y0), x1, y1, z(x1, y1));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function gable(fixed, pts, alongXAxis, Hs) {
  // vertical polygon on plane x=fixed (alongXAxis=false, coords along y) or y=fixed (true, coords along x)
  const tex = Hs.kind === 'house' ? TX.siding(Hs.wallC) : TX.planksV(Hs.wallC);
  if (alongXAxis) ctx.setTransform(DPR * U, DPR * hh, 0, -DPR * U, DPR * (ox - fixed * U), DPR * (oy + fixed * hh));
  else ctx.setTransform(-DPR * U, DPR * hh, 0, -DPR * U, DPR * (ox + fixed * U), DPR * (oy + fixed * hh));
  ctx.beginPath(); pts.forEach(([u, zz], k) => k ? ctx.lineTo(u, zz / U) : ctx.moveTo(u, zz / U)); ctx.closePath();
  ctx.fillStyle = tex; ctx.fill();
  ctx.fillStyle = `rgba(0,0,0,${alongXAxis ? .12 : .32})`; ctx.fill();
  resetT();
}
function occludes(x, y, height) {
  const top = height / U + .3;
  for (let s = .15; s <= top; s += .2)
    for (const o of [-.22, 0, .22])
      if (Math.floor(P.x + s + o) === x && Math.floor(P.y + s - o) === y) return true;
  return false;
}
function drawFurniture(fu, f, hi, a) {
  const [x0, y0, x1, y1] = fu.r, empty = fu.searched && !fu.items.length && CONT[fu.type].loot;
  const g = empty ? f * .82 : f;
  const wx = fu.wd[0], wy = fu.wd[1];
  const woodT = rgb => ({s:TX.woodLight(rgb), e:TX.woodLight(rgb), t:TX.woodLight(rgb)});
  switch (fu.type) {
    case 'fridge': box(x0, y0, x1, y1, 0, U * 1.75, COL.fridge, g, a);
      ctx.strokeStyle = C([80,80,80], g); ctx.lineWidth = 1; ctx.beginPath();
      line3(x0, y1, U * 1.1, x1, y1, U * 1.1); line3(x1, y0, U * 1.1, x1, y1, U * 1.1);
      line3(x0 + .1, y1, U * 1.2, x0 + .1, y1, U * 1.5); ctx.stroke(); break;
    case 'cabinet': box(x0, y0, x1, y1, 0, U * .86, COL.cabinet, g, a, woodT(COL.cabinet)); box(x0 - .02, y0 - .02, x1 + .02, y1 + .02, U * .86, U * .94, COL.counter, g, a);
      ctx.strokeStyle = C([60,44,30], g); ctx.lineWidth = 1; ctx.beginPath(); line3((x0 + x1) / 2, y1, U * .1, (x0 + x1) / 2, y1, U * .78); line3(x1, (y0 + y1) / 2, U * .1, x1, (y0 + y1) / 2, U * .78); ctx.stroke(); break;
    case 'sink': box(x0, y0, x1, y1, 0, U * .86, [180,174,164], g, a); box(x0 - .02, y0 - .02, x1 + .02, y1 + .02, U * .86, U * .94, COL.counter, g, a);
      poly4(x0 + .14, y0 + .14, U * .945, x1 - .14, y0 + .14, U * .945, x1 - .14, y1 - .14, U * .945, x0 + .14, y1 - .14, U * .945, C([110,118,126], g));
      box((x0 + x1) / 2 + wx * .25 - .03, (y0 + y1) / 2 + wy * .25 - .03, (x0 + x1) / 2 + wx * .25 + .03, (y0 + y1) / 2 + wy * .25 + .03, U * .94, U * 1.15, [196,200,204], g, a); break;
    case 'wardrobe': box(x0, y0, x1, y1, 0, U * 1.95, COL.wardrobe, g, a, woodT(COL.wardrobe));
      ctx.strokeStyle = C([50,34,20], g); ctx.lineWidth = 1; ctx.beginPath(); line3((x0 + x1) / 2, y1, U * .1, (x0 + x1) / 2, y1, U * 1.85); line3(x1, (y0 + y1) / 2, U * .1, x1, (y0 + y1) / 2, U * 1.85); ctx.stroke(); break;
    case 'shelf':
      for (let k = 0; k < 4; k++) box(x0, y0, x1, y1, U * (.04 + k * .5), U * (.1 + k * .5), COL.shelf, g, a);
      box(x0, y0, x0 + .06, y1, 0, U * 1.6, COL.shelf, g * .9, a); box(x1 - .06, y0, x1, y1, 0, U * 1.6, COL.shelf, g * .9, a);
      if (fu.items.length) { box(x0 + .12, y0 + .1, x0 + .32, y1 - .1, U * .1, U * .38, [176,120,70], g, a); box(x0 + .4, y0 + .12, x0 + .55, y1 - .12, U * .6, U * .9, [90,130,150], g, a); box(x0 + .62, y0 + .15, x0 + .72, y1 - .15, U * 1.1, U * 1.32, [170,60,50], g, a); }
      break;
    case 'crate': box(x0, y0, x1, y1, 0, U * .6, COL.crate, g, a, {s:TX.planksV(COL.crate), e:TX.planksV(COL.crate), t:TX.woodLight(COL.crate)});
      ctx.strokeStyle = C([90,68,40], g); ctx.lineWidth = 1.5; ctx.beginPath(); line3(x0, y1, 0, x1, y1, U * .6); line3(x1, y0, 0, x1, y1, U * .6); ctx.stroke(); break;
    case 'bed': {
      box(x0, y0, x1, y1, 0, U * .4, COL.bedF, f, a, woodT(COL.bedF));
      const bl = COL.blanket[(fu.x + fu.y) % 3];
      const px0 = wx > 0 ? x1 - .26 : x0 + .04, px1 = wx > 0 ? x1 - .04 : wx < 0 ? x0 + .26 : x1 - .04;
      const py0 = wy > 0 ? y1 - .26 : y0 + .04, py1 = wy > 0 ? y1 - .04 : wy < 0 ? y0 + .26 : y1 - .04;
      const bx0 = wx < 0 ? x0 + .28 : x0 + .03, bx1 = wx > 0 ? x1 - .28 : x1 - .03, by0 = wy < 0 ? y0 + .28 : y0 + .03, by1 = wy > 0 ? y1 - .28 : y1 - .03;
      box(bx0, by0, bx1, by1, U * .4, U * .52, bl, f, a);
      if (a == null || a >= 1) { hface(bx0, by0, bx1, by1, U * .52, TX.fabric(), 0); resetT(); }
      box(wx ? px0 : x0 + .1, wy ? py0 : y0 + .1, wx ? px1 : x1 - .1, wy ? py1 : y1 - .1, U * .4, U * .58, COL.pillow, f, a);
      break; }
  }
  if (hi) {
    ctx.strokeStyle = '#d39b3a'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(SX(x0, y0), SY(x0, y0, 0)); ctx.lineTo(SX(x1, y0), SY(x1, y0, 0)); ctx.lineTo(SX(x1, y1), SY(x1, y1, 0)); ctx.lineTo(SX(x0, y1), SY(x0, y1, 0)); ctx.closePath(); ctx.stroke();
  }
}
function drawTree(x, y, f, a, part) {
  const pine = hash(x * 3, y * 7) > .62;
  if (part !== 'canopy') box(x + .44, y + .44, x + .56, y + .56, 0, U * (pine ? .7 : 1.3), COL.trunk, f, a);
  if (part === 'trunk') return;
  const wind = baking ? 0 : Math.sin(animT * 1.1 + x * .7 + y * .3) * U * .05 * (1 + rain * 1.8);
  const cx = SX(x + .5, y + .5), base = SY(x + .5, y + .5, 0);
  ctx.globalAlpha = a == null ? 1 : a;
  if (pine) {
    for (let k = 0; k < 3; k++) {
      const w = U * (.8 - k * .2), yb = base - U * (.5 + k * .75), yt = yb - U * 1.2, sw = wind * (k + 1) * .5;
      ctx.fillStyle = C(COL.pine[k & 1], f * (1 - k * .05)); ctx.beginPath(); ctx.moveTo(cx - w + sw * .5, yb); ctx.lineTo(cx + w + sw * .5, yb); ctx.lineTo(cx + sw, yt); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C(COL.pine[0], f * .7); ctx.beginPath(); ctx.moveTo(cx + sw * .5, yb); ctx.lineTo(cx + w + sw * .5, yb); ctx.lineTo(cx + sw, yt); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C(COL.pine[1], f * 1.15); ctx.lineWidth = 1; ctx.beginPath(); for (let q = 0; q < 4; q++) { const tx = cx - w * .6 + q * w * .4 + sw * .6; ctx.moveTo(tx, yb - 2); ctx.lineTo(tx + 2, yb - U * .3); } ctx.stroke();
    }
  } else {
    const cy = base - U * 2.2, r = U * (.85 + hash(y, x) * .3), c2 = cx + wind;
    ctx.fillStyle = C(COL.leaf[2], f * .8); ctx.beginPath(); ctx.arc(c2 + r * .25, cy + r * .25, r * .9, 0, 6.283); ctx.fill();
    ctx.fillStyle = C(COL.leaf[0], f); ctx.beginPath(); ctx.arc(c2, cy, r, 0, 6.283); ctx.fill();
    // leaf clusters
    for (let q = 0; q < 9; q++) {
      const a2 = hash(x * 13 + q, y) * 6.283, rr = r * (.3 + hash(q, x + y) * .55);
      ctx.fillStyle = C(COL.leaf[q % 3 === 0 ? 1 : 0], f * (.9 + hash(q, x) * .3));
      ctx.beginPath(); ctx.arc(c2 + Math.cos(a2) * rr + wind * .3, cy + Math.sin(a2) * rr * .8, r * (.22 + hash(y, q) * .15), 0, 6.283); ctx.fill();
    }
    ctx.fillStyle = C(COL.leaf[1], f * 1.15); ctx.beginPath(); ctx.arc(c2 - r * .38, cy - r * .42, r * .25, 0, 6.283); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawProp(p, f) {
  if (p.type === 'car') {
    const {cx, cy, col} = p, axd = p.dir === 'x';
    const Lh = .95, Wh = .42;
    const x0 = axd ? cx - Lh : cx - Wh, x1 = axd ? cx + Lh : cx + Wh, y0 = axd ? cy - Wh : cy - Lh, y1 = axd ? cy + Wh : cy + Lh;
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.moveTo(SX(x0 - .05, y0), SY(x0 - .05, y0, 0)); ctx.lineTo(SX(x1 + .12, y0), SY(x1 + .12, y0, 0)); ctx.lineTo(SX(x1 + .12, y1 + .12), SY(x1 + .12, y1 + .12, 0)); ctx.lineTo(SX(x0 - .05, y1 + .12), SY(x0 - .05, y1 + .12, 0)); ctx.fill();
    const wheel = (wx2, wy2) => { ctx.fillStyle = C([22,22,24], f); ctx.beginPath(); ctx.ellipse(SX(wx2, wy2), SY(wx2, wy2, U * .18), U * .17, U * .17, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = C([120,120,118], f); ctx.beginPath(); ctx.ellipse(SX(wx2, wy2), SY(wx2, wy2, U * .18), U * .07, U * .07, 0, 0, 6.283); ctx.fill(); };
    if (axd) { wheel(x0 + .35, y1); wheel(x1 - .35, y1); wheel(x1, y0 + .2); } else { wheel(x1, y0 + .35); wheel(x1, y1 - .35); wheel(x0 + .2, y1); }
    box(x0, y0, x1, y1, U * .16, U * .6, col, f);
    // body crease + bumper
    ctx.strokeStyle = C(col, f * .65); ctx.lineWidth = 1; ctx.beginPath();
    if (axd) { line3(x0, y1, U * .42, x1, y1, U * .42); } else { line3(x1, y0, U * .42, x1, y1, U * .42); }
    ctx.stroke();
    const s = p.flip ? -1 : 1;
    let c0, c1, d0, d1;
    if (axd) { c0 = cx - .55 * s; c1 = cx + .3 * s; [c0, c1] = [Math.min(c0, c1), Math.max(c0, c1)]; d0 = y0 + .05; d1 = y1 - .05; box(c0, d0, c1, d1, U * .6, U * 1.0, col, f * .95);
      poly4(c0 + .06, d1, U * .66, c1 - .06, d1, U * .66, c1 - .06, d1, U * .95, c0 + .06, d1, U * .95, C(COL.glass, f));
      poly4(c1, d0 + .06, U * .66, c1, d1 - .06, U * .66, c1, d1 - .06, U * .95, c1, d0 + .06, U * .95, C(COL.glass, f * 1.15));
      ctx.strokeStyle = `rgba(255,255,255,${.25 * f})`; ctx.beginPath(); line3(c0 + .2, d1, U * .7, c0 + .35, d1, U * .92); ctx.stroke(); }
    else { c0 = cy - .55 * s; c1 = cy + .3 * s; [c0, c1] = [Math.min(c0, c1), Math.max(c0, c1)]; d0 = x0 + .05; d1 = x1 - .05; box(d0, c0, d1, c1, U * .6, U * 1.0, col, f * .95);
      poly4(d1, c0 + .06, U * .66, d1, c1 - .06, U * .66, d1, c1 - .06, U * .95, d1, c0 + .06, U * .95, C(COL.glass, f));
      poly4(d0 + .06, c1, U * .66, d1 - .06, c1, U * .66, d1 - .06, c1, U * .95, d0 + .06, c1, U * .95, C(COL.glass, f * 1.15));
      ctx.strokeStyle = `rgba(255,255,255,${.25 * f})`; ctx.beginPath(); line3(d1, c0 + .2, U * .7, d1, c0 + .35, U * .92); ctx.stroke(); }
    ctx.fillStyle = C([230,220,170], f);
    if (axd) { ctx.fillRect(SX(x1, y1 - .1) - 2, SY(x1, y1 - .1, U * .42) - 2, 4, 3); ctx.fillRect(SX(x1, y0 + .1) - 2, SY(x1, y0 + .1, U * .42) - 2, 4, 3); }
    else { ctx.fillRect(SX(x1 - .1, y1) - 2, SY(x1 - .1, y1, U * .42) - 2, 4, 3); ctx.fillRect(SX(x0 + .1, y1) - 2, SY(x0 + .1, y1, U * .42) - 2, 4, 3); }
  } else if (p.type === 'lamp') {
    const x = p.cx, y = p.cy;
    box(x - .05, y - .05, x + .05, y + .05, 0, U * 3.3, COL.lampPost, f);
    const hx2 = x + p.hx * .55, hy2 = y + p.hy * .55;
    ctx.strokeStyle = C(COL.lampPost, f); ctx.lineWidth = Math.max(2, U * .07); ctx.beginPath(); line3(x, y, U * 3.25, hx2, hy2, U * 3.25); ctx.stroke();
    const on = powerOn() && lightLevel() < .6 && !(p.flick && Math.sin(animT * 23 + p.cx) > .7);
    box(hx2 - .1, hy2 - .07, hx2 + .1, hy2 + .07, U * 3.1, U * 3.25, on ? [255,226,160] : [120,120,116], on ? 1 : f);
  } else if (p.type === 'bin') {
    const x = p.cx, y = p.cy;
    box(x - .18, y - .18, x + .18, y + .18, 0, U * .75, p.col, f); box(x - .2, y - .2, x + .2, y + .2, U * .75, U * .82, [44,46,44], f);
  } else if (p.type === 'mail') {
    const x = p.cx, y = p.cy;
    box(x - .03, y - .03, x + .03, y + .03, 0, U * .9, [80,70,56], f); box(x - .1, y - .16, x + .1, y + .16, U * .9, U * 1.15, COL.mail, f);
    ctx.fillStyle = C([190,40,36], f); ctx.fillRect(SX(x + .1, y - .1), SY(x + .1, y - .1, U * 1.3), Math.max(2, U * .06), U * .2);
  } else if (p.type === 'bush') {
    const sx = SX(p.cx, p.cy), sy = SY(p.cx, p.cy, 0), r = U * .42 * p.s, w = 0;
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(sx + r * .2, sy, r * 1.2, r * .55, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = C(COL.bush[0], f); ctx.beginPath(); ctx.arc(sx - r * .5 + w * .5, sy - r * .6, r * .8, 0, 6.283); ctx.arc(sx + r * .5 + w * .5, sy - r * .55, r * .75, 0, 6.283); ctx.fill();
    ctx.fillStyle = C(COL.bush[1], f); ctx.beginPath(); ctx.arc(sx + w, sy - r * 1.0, r * .85, 0, 6.283); ctx.fill();
    ctx.fillStyle = C(COL.bush[1], f * 1.2); for (let q = 0; q < 5; q++) { ctx.beginPath(); ctx.arc(sx + w + (hash(q, p.cx * 9) - .5) * r * 1.6, sy - r * (.5 + hash(p.cy * 7, q) * .9), r * .18, 0, 6.283); ctx.fill(); }
  }
}
