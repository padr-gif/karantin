// ================= sprite & chunk caches =================
let baking = false;
const SPR = new Map(), CHUNKS = new Map(), CH = 8;
let sprU = 0, sprDPR = 0, bakes = 0, stampQ = [];
const SPR_MAX = 1100, CH_MAX = 56, BAKE_BUDGET = 40;
function clearCaches() { SPR.clear(); CHUNKS.clear(); stampQ.length = 0; }
function cachesValid() { if (sprU !== U) { clearCaches(); sprU = U; sprDPR = DPR; } }
// спрайт из кэша: рисуется один раз (fn) в свой холст HDQ× крупнее, дальше — готовой картинкой
function sprite(id, key, wx, wy, bx0, by0, bx1, by1, fn, alpha, offX) {
  let s = SPR.get(id);
  if (s && s.key !== key) bump(s.c);                                            // учёт перерисовок для запекания в ImageBitmap
  const w = Math.max(1, Math.ceil(bx1 - bx0)), h = Math.max(1, Math.ceil(by1 - by0));
  if (!s || s.q !== HDQ || (s.key !== key && bakes < BAKE_BUDGET)) {
    const cw = w * HDQ, chh = h * HDQ;
    const c = s && s.c.width === cw && s.c.height === chh ? s.c : mkCanvas(cw, chh);
    const g = hdCtx(c.getContext('2d'));
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, chh); g.imageSmoothingEnabled = false;
    const sc = ctx, sox = ox, soy = oy, sd = DPR;
    ctx = g; ox = -bx0 - (wx - wy) * U; oy = -by0 - (wx + wy) * hh; baking = true; DPR = HDQ;
    resetT();
    try { fn(); } finally { ctx = sc; ox = sox; oy = soy; baking = false; DPR = sd; resetT(); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false; }
    if (!s) { s = {c}; SPR.set(id, s); }
    s.c = c; s.key = key; s.q = HDQ; s.w = w; s.h = h; bakes++;
  }
  s.used = frameNo;
  const px = rd(SX(wx, wy) + bx0 + (offX || 0)), py = rd(SY(wx, wy, 0) + by0);
  if (alpha != null && alpha < 1) ctx.globalAlpha = alpha;
  if (HDQ > 1) ctx.drawImage(s.c, px, py, s.w, s.h); else ctx.drawImage(s.c, px, py);
  ctx.globalAlpha = 1;
  const s2 = SPR.get(id); if (s2 && !s2.c._st) bump(s2.c);
}
// выбросить давно не нужные спрайты и куски земли; в детальной графике — следить за памятью кусков
function evict() {
  if (SPR.size > SPR_MAX) { const arr = [...SPR].sort((a, b) => a[1].used - b[1].used); for (let k = 0; k < arr.length - SPR_MAX * .75; k++) SPR.delete(arr[k][0]); }
  if (CHUNKS.size > CH_MAX) { const arr = [...CHUNKS].sort((a, b) => a[1].used - b[1].used); for (let k = 0; k < arr.length - CH_MAX * .75; k++) CHUNKS.delete(arr[k][0]); }
  if (HDQ > 1 && CHUNKS.size > HD_CH_MAX) { const arr = [...CHUNKS].sort((a, b) => a[1].used - b[1].used); for (let k = 0; k < arr.length - HD_CH_MAX * .75; k++) CHUNKS.delete(arr[k][0]); }
  if (HDQ <= 1) return;
  let bytes = 0; for (const ch of CHUNKS.values()) bytes += ch.c.width * ch.c.height * 4;
  if (bytes <= CHUNK_BUDGET) return;
  const arr = [...CHUNKS].filter(e => e[1].used < frameNo - 1).sort((a, b) => a[1].used - b[1].used);
  for (const [k, ch] of arr) { if (bytes <= CHUNK_BUDGET * .8) break; bytes -= ch.c.width * ch.c.height * 4; CHUNKS.delete(k); }
}
function withChunk(ch, fn) {
  bump(ch.c);
  const sc = ctx, sox = ox, soy = oy, sd = DPR;
  ctx = ch.g; ox = CH * U - (ch.ax - ch.ay) * U; oy = -(ch.ax + ch.ay) * hh; baking = true; DPR = ch.q || 1;
  ctx.save();
  groundT(0); ctx.beginPath(); ctx.rect(ch.ax, ch.ay, CH, CH); resetT(); ctx.clip();
  try { fn(); } finally { ctx.restore(); ctx = sc; ox = sox; oy = soy; baking = false; DPR = sd; resetT(); }
}
// кусок земли CH×CH клеток (кэш, HDQ× крупнее в детальной графике)
function getChunk(cx, cy) {
  const key = cx + ',' + cy;
  let ch = CHUNKS.get(key);
  if (!ch || ch.q !== HDQ) {
    const c = mkCanvas((2 * CH * U + 2) * HDQ, (CH * U + 2) * HDQ);
    ch = {c, g:hdCtx(c.getContext('2d')), ax:cx * CH, ay:cy * CH, used:0, q:HDQ};
    ch.g.imageSmoothingEnabled = false;
    withChunk(ch, () => drawGroundRange(ch.ax - 1, ch.ay - 1, ch.ax + CH, ch.ay + CH));
    CHUNKS.set(key, ch);
  }
  ch.used = frameNo; ch.c._chq = ch.q;
  return ch;
}
function chunksNear(x, y, m) {
  const out = [];
  for (let cy = Math.floor((y - m) / CH); cy <= Math.floor((y + m) / CH); cy++)
    for (let cx = Math.floor((x - m) / CH); cx <= Math.floor((x + m) / CH); cx++) { const ch = CHUNKS.get(cx + ',' + cy); if (ch) out.push(ch); }
  return out;
}
function drawDecal(d) { blitObj('blood_' + clamp(Math.floor(d.r * 5), 0, 4), SX(d.x, d.y), SY(d.x, d.y, 0)); }
function drawCorpse(c) { drawZombie(c, 'death', AN('z', 'death') - 1, 1, true); }
function drawGroundRange(gx0, gy0, gx1, gy1) {
  for (let y = gy0; y <= gy1; y++) for (let x = gx0; x <= gx1; x++) if (x < 0 || y < 0 || x >= MW || y >= MH) blitObj('g_grass_' + Math.floor(hash(x + 999, y + 999) * 4), SX(x, y), SY(x, y, 0));
  const x0 = Math.max(0, gx0), y0 = Math.max(0, gy0), x1 = Math.min(MW - 1, gx1), y1 = Math.min(MH - 1, gy1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const t = map[y * MW + x], hv = hash(x, y), sx = SX(x, y), sy = SY(x, y, 0);
    if (t === ROAD) {
      blitObj('g_asph_' + (hv < .1 ? 2 : hv < .55 ? 0 : 1), sx, sy);
      let hR = false, vR = false;
      const RXs = ROADSX || ROADS, RYs = ROADSY || ROADS, inX = v => RXs.some(r => v >= r - 1 && v <= r + RW), inY = v => RYs.some(r => v >= r - 1 && v <= r + RW);
      for (const r of RYs) if (y === r + 1) hR = true;
      for (const r of RXs) if (x === r + 1) vR = true;
      if ((hR && !inX(x) && x % 2 === 0) || (vR && !inY(y) && y % 2 === 0)) {
        groundT(0); ctx.fillStyle = '#c8ac56';
        if (hR && !inX(x) && x % 2 === 0) ctx.fillRect(x + .15, y + .95, .7, .1);
        if (vR && !inY(y) && y % 2 === 0) ctx.fillRect(x + .95, y + .15, .1, .7);
        resetT();
      }
    } else if (t === WALK) {
      blitObj('g_walk_' + (hv < .5 ? 0 : 1), sx, sy);
      if (get(x, y + 1) === ROAD) blitObj('g_curb_s', sx, sy);
      if (get(x + 1, y) === ROAD) blitObj('g_curb_e', sx, sy);
      if (get(x, y - 1) === ROAD) blitObj('g_curb_n', sx, sy);
      if (get(x - 1, y) === ROAD) blitObj('g_curb_w', sx, sy);
    } else if (t === WATER) { blitObj('g_grass_' + Math.floor(hv * 4), sx, sy); drawWaterTile(x, y); }
    else blitObj('g_grass_' + Math.floor(hv * 4), sx, sy);
  }
  for (const Hs of houses) {
    if (Hs.x > x1 + 1 || Hs.x + Hs.w < x0 - 1 || Hs.y > y1 + 1 || Hs.y + Hs.h < y0 - 1) continue;
    const floorTiles = (name, rx0, ry0, rx1, ry1) => {
      ctx.save(); groundT(0); ctx.beginPath(); ctx.rect(rx0, ry0, rx1 - rx0, ry1 - ry0); resetT(); ctx.clip();
      for (let y = Hs.y; y < Hs.y + Hs.h; y++) for (let x = Hs.x; x < Hs.x + Hs.w; x++) blitObj(typeof name === 'function' ? name(x, y) : name, SX(x, y), SY(x, y, 0));
      ctx.restore();
    };
    if (Hs.concrete) floorTiles('g_concrete', Hs.ix0, Hs.iy0, Hs.ix1, Hs.iy1);
    else if (COMM.has(Hs.kind)) floorTiles('g_store', Hs.ix0, Hs.iy0, Hs.ix1, Hs.iy1);
    else if (Hs.kind === 'shed') floorTiles('g_concrete', Hs.ix0, Hs.iy0, Hs.ix1, Hs.iy1);
    else if (Hs.rooms) {
      for (const r of Hs.rooms) {
        const nm = r.type === 'kitchen' ? 'g_kitchen' : r.type === 'bath' ? 'g_bath' : r.type === 'hall' ? 'g_hall' : r.carpet != null ? 'g_carpet_' + r.carpet : (x, y) => 'g_wood_' + (hash(x + 3, y) < .5 ? 0 : 1);
        floorTiles(nm, r.x0 - .5, r.y0 - .5, r.x1 + 1.5, r.y1 + 1.5);
      }
    }
    else {
      floorTiles((x, y) => 'g_wood_' + (hash(x + 3, y) < .5 ? 0 : 1), Hs.ix0, Hs.iy0, Hs.ix1, Hs.iy1);
      if (Hs.inner >= 0 && Hs.kitchen) {
        if (Hs.kitchen < 0) floorTiles('g_kitchen', Hs.ix0, Hs.iy0, Hs.inner + .5, Hs.iy1);
        else floorTiles('g_kitchen', Hs.inner + .5, Hs.iy0, Hs.ix1, Hs.iy1);
      }
    }
    groundT(0);
    for (const r of Hs.rugs) {
      if (HDQ > 1) { ctx.imageSmoothingEnabled = true; ctx.drawImage(rugTex(r[4]), r[0], r[1], r[2] - r[0], r[3] - r[1]); continue; }   // детальный режим: ковёр с каймой
      ctx.fillStyle = C(r[4], 1); ctx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
      ctx.fillStyle = C(r[4], .78); ctx.fillRect(r[0] + .12, r[1] + .12, r[2] - r[0] - .24, r[3] - r[1] - .24);
      ctx.fillStyle = C(r[4], 1.08); ctx.fillRect(r[0] + .2, r[1] + .2, r[2] - r[0] - .4, r[3] - r[1] - .4);
    }
    resetT();
    for (const d of Hs.decor || []) blitObj('dec_' + d.k + '_' + d.v, SX(d.x, d.y), SY(d.x, d.y, 0));   // мелочи на полу (43i)
    resetT();
  }
  groundT(0);
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * MW + x; if (map[i] !== WALL) continue;
    for (const r of wpV[i]) ctx.rect(x + r[0] - .08, y + r[1] - .08, r[2] - r[0] + .16, r[3] - r[1] + .16);
  }
  ctx.fill(); ctx.beginPath();
  for (const fu of furns) { if (fu.x < x0 - 1 || fu.x > x1 + 1 || fu.y < y0 - 1 || fu.y > y1 + 1) continue; ctx.rect(fu.r[0] - .04, fu.r[1] - .04, fu.r[2] - fu.r[0] + .12, fu.r[3] - fu.r[1] + .12); }
  ctx.fill();
  resetT();
  for (const d of decals) if (d.x > x0 - 1 && d.x < x1 + 2 && d.y > y0 - 1 && d.y < y1 + 2) drawDecal(d);
  for (const c of corpses) if (c.fall >= 1 && c.x > x0 - 1.5 && c.x < x1 + 2.5 && c.y > y0 - 1.5 && c.y < y1 + 2.5) drawCorpse(c);
}
function wallKey(x, y, i, cut) {
  buildSwitches();
  const t = map[i];
  let k = (cut ? 'c' : 'f') + fogF(i) + '|' + fogAt(x, y + 1) + '|' + fogAt(x + 1, y);
  if (t !== WALL) {
    const o = obs[i];
    k += '|' + (o.open ? 1 : 0) + (o.dead ? 1 : 0) + (o.broken ? (o.cleared ? 2 : 1) : 0) + (o.bhp > 0 ? Math.ceil(o.bhp / 45) : 0) + '|' + Math.round((o.ang == null ? (o.open ? 1 : 0) : o.ang) * 12) + (o.mhp > 0 ? 'm' + Math.ceil(o.mhp / 55) : '');
    if (t === WIN) k += ((lightLevel() < .5 && poweredAt(x, y) && winLit(x, y)) ? 'n' : 'd') + (o.cc ? 'c' : '') + (o.cur ? 'u' : '');
  }
  { const r = SWT.get(i); if (r) k += r.off ? '|s0' : '|s1'; }                // выключатель на стене
  return k;
}
function roofBounds(Hs) {
  if (Hs._rb && Hs._rbU === U) return Hs._rb;
  const pts = [[Hs.ix0 - .3, Hs.iy0 - .3], [Hs.ix1 + .3, Hs.iy0 - .3], [Hs.ix1 + .3, Hs.iy1 + .3], [Hs.ix0 - .3, Hs.iy1 + .3]];
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for (const [wx, wy] of pts) {
    const rx = (wx - wy - Hs.x + Hs.y) * U, ry = (wx + wy - Hs.x - Hs.y) * hh;
    a = Math.min(a, rx); c = Math.max(c, rx); b = Math.min(b, ry - WH - U * 2.3); d = Math.max(d, ry - WH);
  }
  Hs._rb = [Math.floor(a - 4), Math.floor(b - 4), Math.ceil(c + 4), Math.ceil(d + 4)]; Hs._rbU = U;
  return Hs._rb;
}
function drawHi(fu) {
  const [x0, y0, x1, y1] = fu.r;
  ctx.strokeStyle = '#d39b3a'; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(SX(x0, y0), SY(x0, y0, 0)); ctx.lineTo(SX(x1, y0), SY(x1, y0, 0)); ctx.lineTo(SX(x1, y1), SY(x1, y1, 0)); ctx.lineTo(SX(x0, y1), SY(x0, y1, 0)); ctx.closePath(); ctx.stroke();
}
const WDI = (wd) => wd[1] < 0 ? 0 : wd[0] > 0 ? 1 : wd[1] > 0 ? 2 : 3;
// имя кадра мебели в атласе: вид, вариант, поворот; своя картинка (fu.art), старая компактная, запасной вариант 0
function furnName(fu) {
  const fr = ART.meta.frames;
  if (isShower(fu) && fr['f_shower_0_' + WDI(fu.wd)]) return 'f_shower_0_' + WDI(fu.wd);
  const t = SPRA[fu.type] || fu.type;
  const v = t === 'shelf' ? (fu.items.length ? 1 : 0) : t === 'bed' ? (fu.x + fu.y) % 3 : (fu.v || 0);
  let n = 'f_' + t + '_' + v + '_' + WDI(fu.wd); if (fu.art) n = n.replace(/^f_[a-z0-9]+_/, 'f_' + fu.art + '_');
  if (fu.compact && fr['old_' + n]) return 'old_' + n;
  if (fr[n]) return n;
  const n0 = n.replace(/_(\d)_(\d)$/, '_0_$2'); return fr[n0] ? n0 : n;
}
function propName(p, on) {
  if (p.type === 'car') return 'car_' + p.ci + '_' + (p.dir === 'x' ? (p.flip ? 'nx' : 'px') : (p.flip ? 'ny' : 'py'));
  if (p.type === 'lamp') return 'lamp_' + (p.hx ? 'x' : 'y') + '_' + (on ? 1 : 0);
  if (p.type === 'bin') return 'bin_' + p.ci;
  if (p.type === 'mail') return 'mail';
  if (p.type === 'barrel') return 'barrel';
  return 'bush_' + (Math.floor(hash(Math.floor(p.cx * 7), Math.floor(p.cy * 3)) * 3));
}
// кадр анимации героя: у мужского героя есть свои клипы (удар на бегу, двуручное, присед, душ…), остальное — общее
function playerAnim(pAtk) {
  if (heroMale()) {
    const A = P.act;
    if (pAtk < 0 && A && A.kind === 'job' && A.an === 'searchlow' && AN('p', 'searchlow') > 1) return pmLoop('searchlow');
    if (mode !== 'dead') {
      const w = P.weapon && ITEMS[P.weapon.id];
      if (pAtk >= 0 && w && !w.gun && TWO_H.has(P.weapon.id)) {                       // двуручное
        const an = P.moving ? 'attack2hrun' : 'attack2h', n = AN('p', an);
        if (n > 1) return [an, Math.min(n - 1, Math.floor(pAtk * n))];
      }
      if (A && A.kind === 'forage' && A.a && (A.a.what === 'berries' || A.a.what === 'mushroom') && AN('p', 'searchlow') > 1) return pmLoop('searchlow');   // присел и копается
      if (pAtk >= 0 && !(w && w.gun)) {                                                // удар на ходу и вторая рука
        const alt = !P.weapon && P._altHand;
        const an = P.moving ? (P.weapon ? 'attackrun' : alt ? 'punchrun2' : 'punchrun') : (P.weapon ? 'attack' : alt ? 'punch2' : 'punch');
        const n = AN('p', an); if (n > 1) return [an, Math.min(n - 1, Math.floor(pAtk * n))];
      }
      if (P.sneak && !P.moving && !P.act && AN('p', 'sneakidle') > 1) return pmLoop('sneakidle');
    }
    if (pAtk >= 0 && P.running && P.moving && !(P.weapon && ITEMS[P.weapon.id].gun)) {
      const an = P.weapon ? 'attackrun' : 'punchrun', n = AN('p', an);
      if (n > 1) return [an, Math.min(n - 1, Math.floor(pAtk * n))];
    }
  }
  const r = playerAnimBase(pAtk);
  if (!heroMale() || mode === 'dead') return r;
  const A = P.act, act = A && A.kind;
  if (A && act === 'job' && A.an === 'jacks' && AN('p', 'jacks') > 1) return pmLoop('jacks');
  if (A && act === 'job' && A.shower) return P._inShower && AN('p', 'shower') > 1 ? pmLoop('shower') : pmLoop('idle', .8);
  // обыск низкой мебели и вещей на полу — присев
  if (r[0] === 'search' && A && A.f && AN('p', 'searchlow') > 1 && (LOW_FURN.has(A.f.type) || A.f.type === 'pile' || !A.f.type)) return pmLoop('searchlow');
  if (A && act === 'use' && A.an === 'read' && AN('p', 'read') > 1) return pmLoop('read');
  if (r[0] === 'idle' || r[0] === 'search' || r[0] === 'work') return pmLoop(r[0]);   // живые циклы стояния и работы
  return r;
}
function playerAnimBase(pAtk) {
  if (mode === 'dead') { const n = AN('p', 'death'); return ['death', Math.min(n - 1, Math.floor((P.fall || 0) * n))]; }
  if (pAtk >= 0 && P.weapon && ITEMS[P.weapon.id].gun && P.atkDur <= .21) return ['punch', Math.min(AN('p', 'punch') - 1, 2)];
  if (pAtk >= 0) { const an = P.weapon ? 'attack' : 'punch', n = AN('p', an); return [an, Math.min(n - 1, Math.floor(pAtk * n))]; }
  if (P.hurt > .05 && !P.moving) { const n = AN('p', 'hit'); return ['hit', Math.min(n - 1, Math.floor((1 - P.hurt / .45) * n))]; }
  const act = P.act && P.act.kind;
  if (P.thrT > 0) { const n = AN('p', 'punch'); return ['punch', Math.min(n - 1, Math.floor((1 - P.thrT / .32) * n))]; }
  if (act === 'use' && P.act.an === 'read') return ['eat', 1];
  if (act === 'use') { const an = P.act.an, n = AN('p', an); if (an === 'work') return ['work', Math.floor(animT * 6) % n]; return [an, Math.min(n - 1, Math.floor(P.act.t / P.act.dur * n))]; }
  if (act === 'pickup') { const n = AN('p', 'pickup'); return ['pickup', Math.min(n - 1, Math.floor(P.act.t / P.act.dur * n))]; }
  if (act === 'search' || act === 'cook' || act === 'cookx' || act === 'forage') return ['search', Math.floor(animT * 7) % AN('p', 'search')];
  if (act === 'fish') return ['idle', Math.floor(animT * 2) % AN('p', 'idle')];
  if (act === 'pry') return ['work', Math.floor(animT * 6) % AN('p', 'work')];
  if (act === 'hotwire') return ['search', Math.floor(animT * 7) % AN('p', 'search')];
  if (act === 'bar' || act === 'unbar' || act === 'furn' || act === 'dismantle' || act === 'job' || act === 'reload') return ['work', Math.floor(animT * 6) % AN('p', 'work')];
  if (act === 'vault') return vaultAnim();
  const an = P.running ? 'run' : P.sneak ? 'sneak' : 'walk', n = AN('p', an);
  const k = P.running ? .62 : 1;
  const wf = ((Math.floor(P.walk * k / (Math.PI * 2) * n) % n) + n) % n;
  if (P.moving) return [an, wf];
  if (P.sneak) return ['sneak', 0];
  return ['idle', Math.floor(animT * 2.6) % AN('p', 'idle')];
}
function zombieAnim(z) {
  {                                                                          // тянется за героем через проём, лежит сбитый и встаёт
    const n = AN('z', 'death');
    if (z.vt) { const k = z.vt.t / z.vt.dur, m = AN('z', 'hit'); return k < .55 ? ['attack', Math.min(AN('z', 'attack') - 1, 3)] : ['hit', Math.min(m - 1, Math.floor((k - .55) / .45 * m))]; }
    if (z.down > 0) {
      const up = .45;   // last part of the time on the ground: getting back up
      if (z.down < up) return ['death', Math.max(0, Math.min(n - 1, Math.floor(z.down / up * n)))];
      return ['death', Math.min(n - 1, Math.floor(Math.min(1, z.downT * 3) * n))];
    }
  }
  if (z.crawl) { const n = AN('z', 'death'); return ['death', (z.mv || 0) > .05 || z.wind > 0 ? n - 1 - (Math.floor(z.walk * .9) % 2) : n - 1]; }
  if (z.stun > 0) { const n = AN('z', 'hit'); return ['hit', Math.min(n - 1, Math.floor((1 - z.stun / .45) * n))]; }
  if (z.wind > 0) { const n = AN('z', 'attack'); return ['attack', Math.min(n - 1, Math.floor((1 - z.wind / .35) * n))]; }
  const an = (z.reachA || 0) > .5 ? 'chase' : 'walk', n = AN('z', an);
  const wf = ((Math.floor(z.walk / (Math.PI * 2) * n) % n) + n) % n;
  if ((z.mv || 0) > .05) return [an, wf];
  return ['idle', Math.floor(animT * 2.2 + z.seed * 3) % AN('z', 'idle')];
}
