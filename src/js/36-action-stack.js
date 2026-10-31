// recipes: list on the left, the chosen recipe with every requirement on the right
function recipeSplit(body) {
  const cards = [...body.querySelectorAll(':scope > .recipe')]; if (!cards.length) return;
  const key = panel.kind + (panel.tab || ''); panel.rsel = panel.rsel || {};
  let si = panel.rsel[key]; if (si == null || si >= cards.length) { si = cards.findIndex(c => c.querySelector('.acts button:not([disabled])')); if (si < 0) si = 0; }
  const lay = mk('div', 'rsplit'), list = mk('div', 'rlist'), det = mk('div', 'rdet');
  cards.forEach((c, i) => {
    const ready = !!c.querySelector('.acts button:not([disabled])'), row = mk('button', 'rrow' + (i === si ? ' on' : '') + (ready ? ' ready' : '')); row.type = 'button';
    const ic = c.querySelector('.rout'); if (ic) row.appendChild(ic.cloneNode(true));
    row.appendChild(mk('span', 'rn', (c.querySelector('.rmid > b') || {}).textContent || ''));
    row.appendChild(mk('span', 'rs', ready ? 'можно' : 'не хватает'));
    row.addEventListener('click', () => { panel.rsel[key] = i; SFX.ui(); renderPanel(); });
    list.appendChild(row);
  });
  det.appendChild(cards[si]);
  const tips = [...body.querySelectorAll(':scope > p.empty')].filter(e => !/Еду готовят/.test(e.textContent));
  for (const c of cards) if (c.parentNode === body) c.remove();
  for (const e of body.querySelectorAll(':scope > p.empty')) e.remove();
  for (const t of tips) det.appendChild(t);
  lay.appendChild(list); lay.appendChild(det);
  const rest = [...body.children]; body.textContent = ''; for (const r of rest) body.appendChild(r); body.appendChild(lay); body.classList.add('fit');
}
function pickHint(t) { const h = mk('div', 'pickhint'); h.appendChild(svgIc('i-hand')); h.appendChild(mk('span', '', t)); return h; }
let lootTapT = 0, lootTapK = '';
function lootTap(c, side, g) {
  const k = side + ':' + g.key, now = performance.now();
  const qd = xferQ.filter(q => sameStack(q.it, g.it) && (side === 'c' ? q.dir === 'take' && q.c === c : q.dir === 'put'));
  if (qd.length) { for (const q of qd) xferQ.splice(xferQ.indexOf(q), 1); renderPanel(); return; }
  if (lootTapK === k && now - lootTapT < 380) { lootTapK = ''; queueXfer(c, [g.it], side === 'c' ? 'take' : 'put'); return; }
  lootTapK = k; lootTapT = now;
  panel.sel = panel.sel === k ? null : k; renderPanel();
}
// transfer progress lives inside the item's own cell
function fitGrid(g) {
  if (g.closest && g.closest('.invsec')) {                                      // разделы рюкзака: по 4 в ряд
    const host = g.closest('.pcol'); if (!host || !host.clientWidth) return;
    const gap = 6, w = host.clientWidth - 22, s = Math.max(40, Math.min(70, Math.floor((w - gap * 3) / 4)));
    g.style.gridTemplateColumns = `repeat(4, ${s}px)`; g.style.setProperty('--cs', s + 'px'); g.classList.toggle('tiny', s < 50);
    return;
  }
  const host = g.parentNode; if (!host || !host.clientHeight) return;
  let used = 0; for (const ch of host.children) if (ch !== g && ch.offsetParent !== null) used += ch.offsetHeight + 6;
  const cs = getComputedStyle(host), padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom), padH = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const n = g.children.length, gap = 5, w = host.clientWidth - padH - 2, h = host.clientHeight - padV - used - 4;
  let s = 64, cols = 1;
  for (; s > 46; s--) { cols = Math.max(1, Math.floor((w + gap) / (s + gap))); if (Math.ceil(n / cols) * (s + gap) - gap <= h) break; }   // не мельче 46 px — под палец; что не влезло, листается в колонке
  cols = Math.max(1, Math.floor((w + gap) / (s + gap)));
  g.style.gridTemplateColumns = `repeat(${cols}, ${s}px)`; g.style.setProperty('--cs', s + 'px'); g.classList.toggle('tiny', s < 50);
}
function fitPanel() { const body = $('pnBody'); if (!body.classList.contains('fit')) return; for (const g of body.querySelectorAll('.grid')) fitGrid(g); }
addEventListener('resize', () => { if (panel) fitPanel(); });
// header: tabs sit in the title row, so the body keeps all the height
{ const head = document.querySelector('#panel .sheet-head'), tabs = $('pnTabs'); if (head && tabs) head.insertBefore(tabs, head.lastElementChild); }
// после каждой перерисовки окна: карточки готовки, раскладка рецептов и «Состояния», размер сеток под окно
onPanel(() => {
  const body = $('pnBody'); if (!panel) return;
  if (panel.kind === 'cook' && panel.src) { const first = body.querySelector(':scope > .recipe'); const rc = ragoutCard(panel.src); if (first) first.after(rc); else body.appendChild(rc); let last = rc; for (const c of extraCookCards(panel.src)) { last.after(c); last = c; } }
  if ((panel.kind === 'inv' && panel.tab === 'craft') || panel.kind === 'cook') recipeSplit(body);
  if (panel.kind === 'inv' && panel.tab === 'self') { const kids = [...body.children], a = mk('div'), b = mk('div'), c = mk('div'); let cur = a; for (const k of kids) { if (k.classList.contains('sect')) cur = /Навык/.test(k.textContent) ? b : c; cur.appendChild(k); } body.textContent = ''; const w = mk('div', 'self3'); w.append(a, b, c); body.appendChild(w); body.classList.add('fit'); }
  fitPanel();
}, () => $('pnBody').classList.remove('fit'));
// drop the old floating transfer row (progress is in the cell now)

// ---- stacked context buttons (each action gets its own full-size button) ----
let stackKey = '';
function renderActStack(list) {
  const box = $('actAlt'), bar = !$('bBar').hidden, prim = !$('bAct').classList.contains('off');
  const alts = prim ? list.slice(1) : [], maxAlt = bar ? 1 : 2;
  const key = alts.map(a => a.kind + a.label + actName(a)).join('|') + bar + prim + (P.car ? 'c' : '') + document.body.classList.contains('ctledit');
  const base = 72, step = 50;
  if (key !== stackKey) {
    stackKey = key; box.textContent = '';
    const shown = alts.length > maxAlt ? maxAlt - 1 : alts.length;
    const mkPill = (icon, verb, name, fn) => { const b = mk('button', 'act alt'); b.type = 'button'; b.appendChild(svgIc(icon)); const t = mk('span', 'at'); t.appendChild(mk('b', '', verb)); if (name) t.appendChild(mk('small', '', name)); b.appendChild(t); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); }); box.appendChild(b); return b; };
    for (let i = 0; i < shown; i++) { const a = alts[i]; mkPill(actIcon(a), a.label.charAt(0).toUpperCase() + a.label.slice(1), actName(a), () => doAction(a)); }
    if (alts.length > shown) mkPill('i-menu', 'Ещё ' + (alts.length - shown), 'другие действия', () => { if ($('actMenu').hidden) openActMenu(); else $('actMenu').hidden = true; });
    if (!box.children.length && document.body.classList.contains('ctledit')) mkPill('i-hand', 'Взаимодействие', 'вторая кнопка', () => {}).classList.add('ceDummy');   // примерка в настройке кнопок
  }
  let k = 0;
  const sb = (el, v) => { if (el._sb !== v) { el._sb = v; el.style.bottom = v; } };   // не трогаем стиль, если не изменился
  if (prim) sb($('bAct'), base + step * k++ + 'px'); else sb($('bAct'), base + 'px');
  for (const el of box.children) sb(el, base + step * k++ + 'px');
  sb($('bBar'), base + step * k++ + 'px');
  sb($('actMenu'), `calc(var(--sb) + ${base + step * k + 6}px)`);
}

// ---- car: steering buttons, gas and brake pedals, speedometer ----
const CARB = {l:0, r:0, g:0, b:0};
for (const [id, k] of [['cL', 'l'], ['cR', 'r'], ['cGas', 'g'], ['cBrake', 'b']]) {
  const el = $(id), on = e => { e.preventDefault(); CARB[k] = 1; el.classList.add('on'); }, off = () => { CARB[k] = 0; el.classList.remove('on'); };
  el.addEventListener('pointerdown', on); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, off);
}
$('cHorn').addEventListener('pointerdown', e => { e.preventDefault(); honk(); });
function carCtl() {
  let steer = (CARB.r ? 1 : 0) - (CARB.l ? 1 : 0);
  if (keys.has('KeyD') || keys.has('ArrowRight')) steer += 1; if (keys.has('KeyA') || keys.has('ArrowLeft')) steer -= 1;
  if (joy.id !== null) steer += joy.x * 1.3;
  const gas = !!CARB.g || keys.has('KeyW') || keys.has('ArrowUp') || (joy.id !== null && joy.y < -.45);
  const brake = !!CARB.b || keys.has('KeyS') || keys.has('ArrowDown') || (joy.id !== null && joy.y > .45);
  return {steer:clamp(steer, -1, 1), gas, brake};
}
function carHud() {
  const p = P.car; if (!p) return;
  $('spd').textContent = Math.round(Math.abs(p.v) * 12);
  $('gear').textContent = !p.engine ? 'ВЫКЛ' : p.v < -.2 ? 'R' : Math.abs(p.v) < .2 ? 'N' : 'D';
  const f = $('fuelI'), h = $('hullI');
  f.style.width = Math.round(p.fuel) + '%'; f.className = p.fuel < 20 ? 'lo' : '';
  h.style.width = Math.round(p.hp) + '%'; h.className = p.hp < 30 ? 'lo' : '';
}
