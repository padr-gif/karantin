// ================= одежда: грязь, дырки, осмотр, стирка; умыться проще =================
//   • Одежда пачкается вместе с героем (кровь, слякоть, работа). Сам умылся, а одежда грязная — чистым не станешь:
//     грязь с одежды снова пачкает (не ниже половины её грязи). Очень грязная одежда — тоскливо.
//   • Ношеная одежда понемногу изнашивается, от укусов и драк рвётся — появляются дырки. Чем их больше, тем хуже
//     держит тепло и защищает (это та же «целость», что и раньше).
//   • «Осмотреть» у любой одежды: она крупно, видны пятна и дырки. Тап по дырке — зашить (нужен набор для шитья;
//     большую дыру — ещё и латка из тряпки). Там же «Постирать», если рядом вода.
//   • «Постирать одежду» — у раковины или ванны с водой, у пруда или водой из бутылок. Постиранная одежда мокрая,
//     пока не высохнет (быстрее у огня): надетая — холодит.
//   • «Умыться» — в списке действий у раковины (вода в кране), у пруда, или водой из бутылки, как только испачкался.
{
  const isCloth = it => { const d = it && ITEMS[it.id]; return d && d.kind === 'cloth' && d.slot !== 'wrist'; };
  const wornList = () => CLOTH_SLOTS.filter(s => s !== 'wrist').map(s => P.cloth && P.cloth[s]).filter(Boolean);
  const allCloth = () => wornList().concat(P.inv.filter(isCloth));
  const dd = it => it.dd || 0;

  // ---- форма вещи на картинке осмотра (220×220) ----
  function shapeOf(d) {
    const p = new Path2D(), s = d.slot;
    if (s === 'legs') { p.moveTo(62, 30); p.lineTo(158, 30); p.lineTo(170, 205); p.lineTo(122, 205); p.lineTo(110, 90); p.lineTo(98, 205); p.lineTo(50, 205); p.closePath(); }
    else if (s === 'feet') { for (const x of [42, 120]) { p.moveTo(x, 70); p.lineTo(x + 34, 70); p.lineTo(x + 38, 140); p.quadraticCurveTo(x + 62, 150, x + 60, 172); p.lineTo(x - 2, 172); p.lineTo(x, 70); p.closePath(); } }
    else if (s === 'head') { p.moveTo(40, 160); p.bezierCurveTo(40, 50, 180, 50, 180, 160); p.closePath(); }
    else if (s === 'hands') { for (const x of [36, 122]) { p.moveTo(x, 190); p.lineTo(x, 110); p.lineTo(x + 8, 50); p.lineTo(x + 18, 108); p.lineTo(x + 26, 46); p.lineTo(x + 36, 106); p.lineTo(x + 46, 54); p.lineTo(x + 56, 112); p.lineTo(x + 62, 190); p.closePath(); } }
    else if (d.cov === 'tank') { p.moveTo(70, 26); p.lineTo(92, 26); p.quadraticCurveTo(110, 60, 128, 26); p.lineTo(150, 26); p.lineTo(160, 80); p.lineTo(162, 205); p.lineTo(58, 205); p.lineTo(60, 80); p.closePath(); }
    else {                                                                        // футболка, свитер, куртка: рукава по длине
      const long = s === 'torso' || d.cov === 'long';
      p.moveTo(80, 22); p.quadraticCurveTo(110, 44, 140, 22); p.lineTo(176, 36);
      if (long) { p.lineTo(206, 180); p.lineTo(182, 186); p.lineTo(160, 90); } else { p.lineTo(204, 86); p.lineTo(176, 100); p.lineTo(162, 82); }
      p.lineTo(164, 205); p.lineTo(56, 205); p.lineTo(58, long ? 90 : 82);
      if (long) { p.lineTo(38, 186); p.lineTo(14, 180); } else { p.lineTo(44, 100); p.lineTo(16, 86); }
      p.lineTo(44, 36); p.closePath();
    }
    return p;
  }
  const probe = mkCanvas(4, 4).getContext('2d');
  // дырки: столько, сколько велит целость (каждые ~14% — дыра); новые — в случайном месте ткани
  function syncHoles(it) {
    const d = ITEMS[it.id]; if (!isCloth(it)) return [];
    const H = it.holes || (it.holes = []), need = Math.min(7, Math.round((100 - cdur(it)) / 14));
    while (H.length > need) H.splice(Math.floor(rng() * H.length), 1);
    if (H.length < need) {
      const sh = shapeOf(d);
      for (let t = 0; t < 200 && H.length < need; t++) {
        const x = 20 + rng() * 180, y = 25 + rng() * 175;
        if (!probe.isPointInPath(sh, x, y) || H.some(h => Math.hypot(h.x - x, h.y - y) < 26)) continue;
        H.push({x:Math.round(x), y:Math.round(y), big:rng() < .3, s:Math.floor(rng() * 1e6)});
      }
    }
    return H;
  }

  // ---- грязь одежды и износ ----
  { let dirt0 = null, acc = 0;
    onUpdate(dt => {
      if (!P || mode !== 'play') { dirt0 = null; return; }
      const W = wornList(), gm = dt * settings.dayLen * timeK();
      const dD = dirt0 == null ? 0 : (P.dirt || 0) - dirt0;
      if (dD > 0) for (const c of W) c.dd = Math.min(100, dd(c) + dD * .8);
      // грязная одежда снова пачкает
      if (W.length) { const avg = W.reduce((s, c) => s + dd(c), 0) / W.length; if ((P.dirt || 0) < avg * .5) P.dirt = avg * .5; if (avg > 70) P.unh = Math.min(100, (P.unh || 0) + gm * .003); }
      // мокрая после стирки: надетая — холодит, сохнет за несколько часов
      for (const c of allCloth()) if (c.wetC > 0) {
        const near = fires.some(f => !f.out && f.t > 0 && Math.hypot(f.x - P.x, f.y - P.y) < 3);
        c.wetC = Math.max(0, c.wetC - gm * (near ? 1.6 : .4));
        if (W.includes(c)) P.wet = Math.max(P.wet || 0, c.wetC * .6);
      }
      dirt0 = P.dirt || 0;
      // износ ношеного: примерно дыра в три-четыре дня
      acc += gm; if (acc >= 30) { for (const c of W) c.cd = Math.max(0, cdur(c) - acc * .0028 * (P.running ? 1.5 : 1)); acc = 0; }
    });
  }

  // ---- источник воды рядом: раковина/ванна с водой, пруд; иначе бутылки ----
  function waterNear() {
    const tx = Math.floor(P.x), ty = Math.floor(P.y);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const i = (ty + dy) * MW + tx + dx;
      if (map[i] === WATER) return 'pond';
      const f = furn[i] && furns[furn[i] - 1];
      if (f && !f.gone && (f.type === 'sink' || f.type === 'bsink' || f.type === 'bath') && waterOn()) return 'tap';
    }
    return null;
  }
  const bottles = () => P.inv.filter(i => i.id === 'waterD' || i.id === 'water');
  function wash(list, done) {
    const src = waterNear(), need = src ? 0 : list.length;
    if (!src && bottles().length < need) { toast(list.length > 1 ? 'Нужна вода: раковина с водой, пруд или по бутылке на вещь' : 'Нужна вода: раковина с водой, пруд или бутылка воды'); return; }
    if (!list.length) { toast('Вся одежда и так чистая'); return; }
    SFX.drink && SFX.drink();
    job(Math.min(14, 3 + list.length * 2.2), () => {
      if (!src) { for (let k = 0; k < list.length; k++) { const b = bottles()[0]; if (!b) break; b.id = 'bottle'; } }
      for (const c of list) { c.dd = 0; c.wetC = 100; c.blood = false; }
      const W = wornList(); if (list.some(c => W.includes(c))) P.wet = Math.max(P.wet || 0, 60);
      toast(list.length > 1 ? 'Постирал: ' + list.length + ' вещ' + (list.length < 5 ? 'и' : 'ей') + '. Пока мокрое — холодит' : 'Постирал: ' + ITEMS[list[0].id].name.toLowerCase() + '. Пока мокрое — холодит');
      renderInv(); if (done) setTimeout(done, 0);
    }, {an:'searchlow'});
  }
  addActions(out => {
    if (P.car) return;
    const L = allCloth().filter(c => dd(c) > 15);
    if (L.length && (waterNear() || bottles().length >= L.length)) out.push({kind:'laundry', label:'Постирать одежду (' + L.length + ')'});
  });
  defAction('laundry', {name:() => 'Одежда', icon:() => 'i-drop', run:() => {
    if (mode !== 'play' || paused || panel || P.sleep) return; $('actMenu').hidden = true;
    wash(allCloth().filter(c => dd(c) > 15));
  }});
  // «Умыться» — как только испачкался (было: от 15% у раковины, бутылкой — только от 50%)
  { const ws0 = washSource;
    washSource = function () {
      const s = ws0.apply(this, arguments); if (s) return s;
      const it = P.inv.find(i => i.id === 'waterD') || P.inv.find(i => i.id === 'water');
      if (it && (P.dirt || 0) > 12) return {k:'bottle', it, label:it.id === 'waterD' ? 'Умыться сырой водой' : 'Умыться водой из бутылки'};
      return null;
    };
  }

  // ---- осмотр ----
  let VIEW = null;
  function inspect(it) {
    closeView();
    const d = ITEMS[it.id], H = syncHoles(it);
    const w = mk('div', 'cv-win'), card = mk('div', 'cv-card');
    card.appendChild(mk('b', 'cv-t', d.name));
    const cv = mkCanvas(220, 220); cv.className = 'cv-pic'; card.appendChild(cv);
    const info = mk('div', 'cv-info'); card.appendChild(info);
    const row = mk('div', 'cv-btns'); card.appendChild(row);
    w.appendChild(card); document.body.appendChild(w);
    VIEW = {w, it};
    const draw = () => {
      const g = cv.getContext('2d'), sh = shapeOf(d), col = d.col || [120, 120, 124], rr = mulb(String(it.id).length * 977 + (it.uid || 7));
      g.clearRect(0, 0, 220, 220);
      g.save(); g.fillStyle = 'rgba(0,0,0,.35)'; g.translate(4, 6); g.fill(sh); g.restore();
      g.fillStyle = `rgb(${col})`; g.fill(sh);
      g.save(); g.clip(sh);
      g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; for (let y = 0; y < 220; y += 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(220, y + 3); g.stroke(); }   // фактура ткани
      const n = Math.round(dd(it) / 7);
      for (let k = 0; k < n; k++) { const x = rr() * 220, y = rr() * 220, r = 8 + rr() * 22; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(70,50,28,${.18 + dd(it) / 300})`); gr.addColorStop(1, 'rgba(70,50,28,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      if (it.blood) for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(110,16,12,.55)'; g.beginPath(); g.ellipse(40 + rr() * 140, 50 + rr() * 140, 6 + rr() * 9, 4 + rr() * 6, rr() * 3, 0, 6.283); g.fill(); }
      if (it.wetC > 0) { g.fillStyle = `rgba(30,50,80,${it.wetC / 400})`; g.fillRect(0, 0, 220, 220); }
      for (const h of H) {                                                       // дыра с бахромой
        const hr = mulb(h.s), R = h.big ? 13 : 8;
        g.fillStyle = '#121416'; g.beginPath();
        for (let a = 0; a < 14; a++) { const t = a / 14 * 6.283, q = R * (.65 + hr() * .55); a ? g.lineTo(h.x + Math.cos(t) * q, h.y + Math.sin(t) * q * .8) : g.moveTo(h.x + Math.cos(t) * q, h.y + Math.sin(t) * q * .8); }
        g.closePath(); g.fill();
        g.strokeStyle = `rgba(${col.map(v => Math.min(255, v + 40))},.9)`; g.lineWidth = 1;
        for (let a = 0; a < 10; a++) { const t = hr() * 6.283, q = R * .9; g.beginPath(); g.moveTo(h.x + Math.cos(t) * q, h.y + Math.sin(t) * q * .8); g.lineTo(h.x + Math.cos(t) * (q + 4), h.y + Math.sin(t) * (q + 4) * .8); g.stroke(); }
      }
      g.restore();
      g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 2; g.stroke(sh);
      info.textContent = 'Целость ' + Math.round(cdur(it)) + '% · дыр: ' + H.length + ' · грязь ' + Math.round(dd(it)) + '%' + (it.wetC > 0 ? ' · мокрая' : '') + (H.length ? ' — тапни по дыре, чтобы зашить' : '');
    };
    const mulb = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    draw();
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 220, y = (e.clientY - r.top) / r.height * 220;
      const h = H.find(h => Math.hypot(h.x - x, h.y - y) < (h.big ? 22 : 17)); if (!h) return;
      if (!sewkit()) { toast('Нечем зашить: нужен набор для шитья'); return; }
      if (h.big && !countItem('rag')) { toast('Большая дыра: на латку нужна тряпка'); return; }
      const sel = panel && panel.sel, lv = skillLv('tail');
      closeView();
      job((h.big ? 3.2 : 2) * (1 - .08 * lv), () => {
        if (!sewkit()) return; useSew(); if (h.big) removeItem('rag');
        const k = it.holes.indexOf(h); if (k >= 0) it.holes.splice(k, 1);
        it.cd = Math.min(100, cdur(it) + 14 + 3 * lv); addXp('tail', 1); ach && ach('sew'); SFX.rustle();
        toast(h.big ? 'Наложил латку' : 'Зашил дыру');
        setTimeout(() => { if (P.cloth && Object.values(P.cloth).includes(it) || P.inv.includes(it)) inspect(it); }, 0);
      }, {reopen:'items', sel});
    });
    if (dd(it) > 5 || it.blood) row.appendChild(btn('Постирать', () => { const sel = panel && panel.sel; closeView(); if (panel) closePanel(); wash([it], () => { openPanel('inv'); if (panel) { panel.sel = sel; renderPanel(); } inspect(it); }); }, 'ghost'));
    row.appendChild(btn('Закрыть', closeView));
    w.addEventListener('click', e => { if (e.target === w) closeView(); });
  }
  function closeView() { if (VIEW) { VIEW.w.remove(); VIEW = null; } }
  onUpdate(() => { if (VIEW && (mode !== 'play' || !panel)) closeView(); });
  { const tb0 = tailorButtons;
    tailorButtons = function (it, worn) {
      const out = tb0.apply(this, arguments);
      if (isCloth(it)) out.unshift(btn('Осмотреть', () => inspect(it), 'ghost'));
      return out;
    };
  }
  // в описании — грязь, дырки, мокрая
  { const t0 = itemText;
    itemText = function (it) {
      const t = t0.apply(this, arguments); if (!isCloth(it)) return t;
      const H = syncHoles(it), add = [];
      if (H.length) add.push('дыр: ' + H.length);
      if (dd(it) > 15) add.push(dd(it) > 60 ? 'очень грязная' : 'грязная');
      if (it.wetC > 0) add.push('мокрая');
      return add.length ? t + ' · ' + add.join(' · ') : t;
    };
  }
}
