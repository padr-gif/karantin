// ================= правки мира: экран без полосы снизу, заборы дворов, тонкие стены в стройке =================

// ---- 1. чёрная полоса снизу: на части телефонов окно (innerHeight) ниже, чем экран под fixed-слоями.
//         Холст тогда не доставал до низа. Берём высоту по самому fixed-слою, если она чуть больше. ----
if (typeof viewH === 'function') {
  // iOS Safari рисует страницу и под своей панелью внизу, а innerHeight её не считает — fixed-слои кончаются выше.
  // «Большая» высота окна (100lvh) — это вся видимая область; холст растягиваем до неё.
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:100vh;height:100lvh;pointer-events:none;visibility:hidden';
  document.body.appendChild(probe);
  const f = viewH;
  viewH = function () {
    try { vpStretch = false; } catch (e) {}                                    // игра сама поднимет флаг, если растянула
    const h = f.apply(this, arguments);
    if (typeof vpStretch !== 'undefined' && vpStretch) return h;
    const ph = Math.round(probe.getBoundingClientRect().height), vv = window.visualViewport ? Math.round(visualViewport.height + visualViewport.offsetTop) : 0;
    const m = Math.max(ph, vv);
    if (m - h > 1 && m - h < 160) { try { vpStretch = true; } catch (e) {} return m; }
    return h;
  };
  try { resize(); } catch (e) {}
}

// ---- 2. заборы дворов: без сплошного профлиста, без двойных линий вплотную, без огрызков ----
// Мир строится одинаково и для новой игры, и для загрузки, поэтому правка повторяется так же; лишний забор
// не удаляется из списка (номера вещей в сохранении не сдвигаются), а становится пустым местом 'pgone'.
if (typeof yardFence === 'function' && typeof defProc === 'function') {
  defProc('pgone', () => {});
  const gone = p => { p.type = 'pgone'; p.solid = false; p.sign = false; };
  const comps = list => {                                                       // связные куски забора (по 8 соседям)
    const at = new Map(); for (const p of list) at.set(Math.floor(p.cy) * MW + Math.floor(p.cx), p);
    const id = new Map(); let n = 0;
    for (const p of list) {
      if (id.has(p)) continue; const q = [p]; id.set(p, n);
      while (q.length) { const c = q.pop(), x = Math.floor(c.cx), y = Math.floor(c.cy);
        for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const o = at.get((y + b) * MW + x + a); if (o && !id.has(o)) { id.set(o, n); q.push(o); } } }
      n++;
    }
    return id;
  };
  onNewWorld(() => {
    let pf = props.filter(p => p.type === 'pfence' && !p.dead); if (!pf.length) return;
    let id = comps(pf);
    for (const p of pf) if (p.st === 3) p.st = Math.floor(hash(id.get(p) * 31 + 7, 11) * 3) % 3;   // профлист → штакетник (доски, зелёный, синий)
    // двойная линия: два параллельных куска в соседних клетках от разных дворов — оставляем один
    const at = new Map(); for (const p of pf) at.set(Math.floor(p.cy) * MW + Math.floor(p.cx), p);
    for (const p of pf) {
      if (p.type !== 'pfence') continue;
      const x = Math.floor(p.cx), y = Math.floor(p.cy), nb = p.ax === 'x' ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];
      for (const [a, b] of nb) { const o = at.get((y + b) * MW + x + a); if (o && o.type === 'pfence' && o.ax === p.ax && id.get(o) !== id.get(p)) { gone(o); } }
    }
    // огрызки: куски забора короче трёх клеток — убрать
    pf = pf.filter(p => p.type === 'pfence'); id = comps(pf);
    const size = new Map(); for (const p of pf) size.set(id.get(p), (size.get(id.get(p)) || 0) + 1);
    for (const p of pf) if (size.get(id.get(p)) < 3) gone(p);
    // забор не встаёт вплотную перед окном дома
    for (const p of pf) if (p.type === 'pfence') { const x = Math.floor(p.cx), y = Math.floor(p.cy); if (D4.some(([a, b]) => map[(y + b) * MW + x + a] === WIN)) gone(p); }
    buildFlow(); clearCaches();
  });
}

// ---- 3. стройка: стена, дверь, окно и проём — тонкой панелью посередине клетки, как стены домов;
//         куски сами стыкуются углами и буквой «Т». Направление — само (по соседям и по тому, где стоишь)
//         или кнопкой «Поворот». От себя: ставни на окне — закрыл, и в окно не заглянуть. ----
if (typeof BUILD !== 'undefined' && typeof BK !== 'undefined' && typeof defProc === 'function') {
  BUILD.splice(2, 0,
    {k:'window', name:'Окно', col:'#7fa8c0', hp:90, dur:6, cost:[['plank', 3], ['nails', 1]], tool:'hammer', solid:true},
    {k:'arch', name:'Проём', col:'#b08a5a', hp:0, dur:3, cost:[['plank', 2], ['nails', 1]], tool:'hammer'});
  for (const b of BUILD) BK[b.k] = b;
  const THIN = new Set(['wall', 'door', 'mwall', 'window', 'arch']);
  BLD.ax = 'auto';
  const pieceAt = (x, y) => { const id = propAt[y * MW + x], p = id && props[id - 1]; return p && p.type === 'bw' && !p.dead && THIN.has(p.bw) ? p : null; };
  const wallish = (x, y) => map[y * MW + x] === WALL || map[y * MW + x] === WIN || map[y * MW + x] === DOOR || !!pieceAt(x, y);
  function autoAx(x, y) {
    const lr = (wallish(x - 1, y) ? 1 : 0) + (wallish(x + 1, y) ? 1 : 0), ud = (wallish(x, y - 1) ? 1 : 0) + (wallish(x, y + 1) ? 1 : 0);
    if (lr !== ud) return lr > ud ? 'x' : 'y';
    return Math.abs(P.y - (y + .5)) >= Math.abs(P.x - (x + .5)) ? 'x' : 'y';     // стоишь сбоку — стена встаёт к тебе лицом
  }
  const thinR = (x, y, ax, open) => open ? [x + .02, y + .02, x + .03, y + .03] : ax === 'x' ? [x, y + .4, x + 1, y + .6] : [x + .4, y, x + .6, y + 1];
  const f0 = mkPiece;
  mkPiece = function (k, x, y, o) {
    if (!THIN.has(k)) return f0.apply(this, arguments);
    o = Object.assign({}, o || {}); const ax = o.ax || (BLD.ax !== 'auto' ? BLD.ax : autoAx(x, y));
    const p = f0.call(this, k, x, y, Object.assign(o, {ax}));
    if (p) { p.ax = ax; p.r = thinR(x, y, ax); if (k === 'arch') p.solid = false; if (k === 'door' && p.open) p.solid = false; if (k === 'window') p.solid = true; }
    return p;
  };
  // направление каждой стены — в сохранение и обратно (основное сохранение стройки его не знает)
  onSave(d => { d.xBw = props.filter(p => p.type === 'bw' && !p.dead && p.ax).map(p => [Math.floor(p.cx), Math.floor(p.cy), p.ax, p.shut ? 1 : 0]); });
  onLoad(d => { for (const [x, y, ax, sh] of (d && d.xBw) || []) { const p = pieceAt(x, y); if (p) { p.ax = ax; p.r = thinR(x, y, ax); p.shut = !!sh; } } clearCaches(); });

  // ---- вид ----
  const fDraw = PROCS.bw;
  const C3 = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  defProc('bw', (p, f) => {
    if (!THIN.has(p.bw) || !p.ax) return fDraw(p, f);
    const x = Math.floor(p.cx), y = Math.floor(p.cy), H = 50, X = p.ax === 'x', t = .09;
    const dmg = p.mhp ? Math.round((1 - p.hp / p.mhp) * 4) / 4 : 0;
    const col = p.bw === 'mwall' ? [128 - dmg * 30, 132 - dmg * 30, 138 - dmg * 30] : p.bw === 'window' ? [176 - dmg * 40, 140 - dmg * 30, 96 - dmg * 20] : [168 - dmg * 40, 124 - dmg * 30, 80 - dmg * 20];
    const a = x + y + 1 > P.x + P.y && Math.hypot(p.cx - P.x, p.cy - P.y) < 2.3 ? .45 : 1;
    const tex = p.bw === 'mwall' || typeof TX === 'undefined' ? null : {s:TX.planksV(col), e:TX.planksV(col), t:C(col, 1)};
    const cx = x + .5, cy = y + .5;
    // отрезок панели от a0 до a1 вдоль своей оси (0..1), высотой z0..z1
    const seg = (u0, u1, z0, z1, c, al, tx) => X ? box(x + u0, cy - t, x + u1, cy + t, z0, z1, c, f, al, tx) : box(cx - t, y + u0, cx + t, y + u1, z0, z1, c, f, al, tx);
    // стыки: к соседней стене поперёк — короткий отросток от середины, чтобы углы сходились
    const stub = (dx, dy) => { if (!wallish(x + dx, y + dy)) return; const z1 = p.bw === 'arch' ? H : H; if (dx) box(dx > 0 ? cx : x, cy - t, dx > 0 ? x + 1 : cx, cy + t, 0, z1, col, f, a, tex); else box(cx - t, dy > 0 ? cy : y, cx + t, dy > 0 ? y + 1 : cy, 0, z1, col, f, a, tex); };
    if (X) { stub(0, -1); stub(0, 1); } else { stub(-1, 0); stub(1, 0); }
    if (p.bw === 'wall' || p.bw === 'mwall') {
      seg(0, 1, 0, H, col, a, tex);
      if (p.bw === 'mwall') for (const z of [12, 34]) seg(0, 1, z, z + 3, [90, 94, 100], a);
      return;
    }
    if (p.bw === 'arch') {                                                       // проём: два столба и перемычка
      seg(0, .14, 0, H, col, a, tex); seg(.86, 1, 0, H, col, a, tex); seg(.14, .86, H - 9, H, col, a, tex);
      return;
    }
    if (p.bw === 'window') {                                                     // низ стены, стекло, верх; ставни
      seg(0, 1, 0, 18, col, a, tex); seg(0, 1, 38, H, col, a, tex); seg(0, .1, 18, 38, col, a, tex); seg(.9, 1, 18, 38, col, a, tex);
      if (p.shut) { seg(.1, .5, 18, 38, [118, 86, 54], a); seg(.5, .9, 18, 38, [110, 80, 50], a); }
      else seg(.1, .9, 18.5, 37.5, [150, 196, 220], Math.min(a, .38));
      seg(0, 1, 17, 18.6, [92, 64, 40], a);                                      // подоконник
      return;
    }
    // дверь: косяки и перемычка; створка закрыта — в проёме, открыта — вдоль стены у косяка
    seg(0, .1, 0, H, col, a, tex); seg(.9, 1, 0, H, col, a, tex); seg(.1, .9, H - 7, H, col, a, tex);
    if (!p.open) { seg(.1, .9, 0, H - 7, [124, 88, 56], a); seg(.66, .72, 20, 24, [210, 180, 90], a); }
    else if (X) box(x + .1, cy - .4, x + .16, cy, 0, H - 7, [124, 88, 56], f, a);
    else box(cx - .4, y + .1, cx, y + .16, 0, H - 7, [124, 88, 56], f, a);
  });
  // дверь открыта/закрыта: форма столкновения тоже меняется
  { const fRun = ACT.bdoor && ACT.bdoor.run;
    if (fRun) defAction('bdoor', {run:a => { fRun(a); const p = a.f; if (p && p.ax) p.r = thinR(Math.floor(p.cx), Math.floor(p.cy), p.ax, p.open); }}); }
  // ставни на окне
  addActions(out => {
    if (!P || P.car || BLD.on) return;
    const w = nearProp('bw', 1.5); if (!w || w.bw !== 'window') return;
    out.push({kind:'bshut', label:w.shut ? 'открыть ставни' : 'закрыть ставни', f:w});
  });
  defAction('bshut', {name:() => 'Окно', icon:() => 'i-door', run:a => { if (busy()) return; $('actMenu').hidden = true; a.f.shut = !a.f.shut; SFX.wood(a.f.cx, a.f.cy); noise(a.f.cx, a.f.cy, 2); clearCaches(); }});
  // кнопка «Поворот» в панели стройки
  { const fUI = bldUI;
    bldUI = function () {
      fUI.apply(this, arguments);
      const bar = $('bldBar'), side = bar && bar.querySelector('.wedside'); if (!side) return;
      let r = $('bldRot');
      if (!r) { r = btn('', () => { BLD.ax = BLD.ax === 'auto' ? 'x' : BLD.ax === 'x' ? 'y' : 'auto'; SFX.ui(); bldUI(); }); r.id = 'bldRot'; side.insertBefore(r, side.lastChild); }
      r.textContent = 'Поворот: ' + (BLD.ax === 'auto' ? 'сам' : BLD.ax === 'x' ? '⟋' : '⟍');
      r.title = 'Как встанет стена: сама по соседям или вдоль выбранной стороны';
    };
  }
  // предпросмотр: куда встанет стена под последним тапом
  onDraw(() => {
    if (!BLD.on || !BLD.last || !THIN.has(BLD.tool)) return;
    const {x, y} = BLD.last; if (pieceAt(x, y)) return;
    const ax = BLD.ax !== 'auto' ? BLD.ax : autoAx(x, y), r = thinR(x, y, ax);
    box(r[0], r[1], r[2], r[3], 0, 50, BLD.last.ok ? [130, 220, 120] : [230, 120, 100], 1, .28);
  });
}

// ---- 4. мебель не торчит за стены: выступающую за внутренние границы дома сдвигаем внутрь, не влезает — убираем.
//         Делается одинаково при постройке и при загрузке мира, поэтому номера мебели в сохранении не сбиваются. ----
if (typeof reRegisterAll === 'function' && typeof onNewWorld === 'function') {
  onNewWorld(() => {
    let n = 0;
    for (const f of furns) {
      if (f.gone || !f.r || f.moved) continue;
      const H = houses[hAt[f.y * MW + f.x] - 1]; if (!H || H.ix0 == null) continue;
      const [x0, y0, x1, y1] = f.r, e = .02;
      let dx = 0, dy = 0;
      if (x0 < H.ix0 + e) dx = H.ix0 + e - x0; else if (x1 > H.ix1 - e) dx = H.ix1 - e - x1;
      if (y0 < H.iy0 + e) dy = H.iy0 + e - y0; else if (y1 > H.iy1 - e) dy = H.iy1 - e - y1;
      if (!dx && !dy) continue;
      if (x1 - x0 > H.ix1 - H.ix0 - 2 * e || y1 - y0 > H.iy1 - H.iy0 - 2 * e || Math.abs(dx) > .9 || Math.abs(dy) > .9) { f.gone = true; n++; continue; }
      f.r = [x0 + dx, y0 + dy, x1 + dx, y1 + dy]; f.cx += dx; f.cy += dy;
      if (f.tiles && typeof tilesOfRect === 'function') f.tiles = tilesOfRect(f.r, f.x, f.y);
      n++;
    }
    if (n) { reRegisterAll(); if (typeof clearCaches === 'function') clearCaches(); }
  });
}
