// ================= v13: live looting (timed transfers, use from containers), map slot, searched houses =================
const xferQ = [];
let xferKey = 0;
function sameStack(a, b) { if (a === b) return true; const d = ITEMS[a.id]; if (!d || d.kind === 'weapon' || d.kind === 'light' || d.uses) return false; return a.id === b.id && isRotten(a) === isRotten(b); }
function xferDur(it) {
  const d = ITEMS[it.id] || {}, k = d.kind;
  let t = {weapon:.8, cloth:.9, armor:1.1, fuel:1.4, generator:2.2, sleepbag:1.2, bag:1, trap:1, book:.5, radio:.6, light:.5}[k] || .45;
  if (P.en < 20) t *= 1.3;
  if (P.hp < 30) t *= 1.2;
  return t;
}
function queueXfer(c, items, dir) {
  let room = dir === 'take' ? invRoomKg() - xferQ.filter(q => q.dir === 'take').reduce((s, q) => s + itemKg(q.it), 0) : capOf(c) - c.items.length - xferQ.filter(q => q.dir === 'put').length;
  let added = 0;
  for (const it of items) {
    if (xferQ.some(q => q.it === it)) continue;
    const need = dir === 'take' ? itemKg(it) : 1;
    if (room < need - 1e-6) { toast(dir === 'take' ? 'Слишком тяжело — не унести' : 'Сюда больше не влезет: ' + capOf(c) + ' мест'); break; }
    xferQ.push({c, it, dir, t:0, dur:xferDur(it)}); room -= need; added++;
  }
  if (added) { SFX.rustle(); panel.sel = null; renderPanel(); }
}
function tickXfer(dt) {
  if (!xferQ.length) return;
  if (!panel || panel.kind !== 'loot') { xferQ.length = 0; return; }
  const q = xferQ[0]; q.t += dt;
  const f = document.getElementById('xferFill'); if (f) f.style.width = Math.min(100, q.t / q.dur * 100) + '%';
  if (q.t < q.dur) return;
  xferQ.shift();
  if (q.dir === 'take') { const k = q.c.items.indexOf(q.it); if (k >= 0) takeOne(q.c, k); }
  else { const k = P.inv.indexOf(q.it); if (k >= 0) putOne(q.c, k); }
  if (xferQ.length && Math.random() < .5) SFX.rustle();
  renderPanel(); updateHud();
}
function xferRow() {
  const q = xferQ[0], r = mk('div', 'xfer'), d = ITEMS[q.it.id] || {name:q.it.id};
  const ic = mk('span', 'xi'); ic.appendChild(iconEl(q.it.id, 28)); r.appendChild(ic);
  const t = mk('div'); t.appendChild(mk('b', '', (q.dir === 'take' ? 'Берёшь: ' : 'Кладёшь: ') + d.name)); t.appendChild(mk('small', '', xferQ.length > 1 ? 'в очереди ещё ' + (xferQ.length - 1) + ' · мир не стоит на месте' : 'мир не стоит на месте, следи за округой')); r.appendChild(t);
  r.appendChild(btn('Отмена', () => { xferQ.length = 0; renderPanel(); }));
  const b = mk('div', 'xb'), i = mk('i'); i.id = 'xferFill'; i.style.width = Math.min(100, q.t / q.dur * 100) + '%'; b.appendChild(i); r.appendChild(b);
  return r;
}
function markQueued(grid, groups, owner) {
  const cells = grid.children;
  groups.forEach((g, i) => { if (cells[i] && xferQ.some(q => (owner === P ? q.dir === 'put' : q.dir === 'take' && q.c === owner) && sameStack(q.it, g.it))) cells[i].classList.add('q'); });
  return grid;
}
function useFromCont(c, it) {
  const d = ITEMS[it.id], u = useKind(it);
  if (d.opener && !hasTool('opener') && !hasTool('knife')) { toast('Нечем открыть: нужен консервный нож или нож'); return; }
  if (d.kind === 'canteen' && !(it.w > 0)) { toast(d.name + ' пуста'); return; }
  xferQ.length = 0; closePanel();
  P.act = {kind:'use', t:0, dur:u ? u[1] : .5, it, an:u ? u[0] : 'work', from:c};
}
// finishing a use that started from a container: take the item at the last moment, put leftovers back, reopen the container
const finishUse0 = finishUse;
finishUse = function (a) {
  if (a.from) {
    const c = a.from, k = c.items.indexOf(a.it); if (k < 0) return;
    c.items.splice(k, 1); P.inv.push(a.it); const n0 = P.inv.length;
    useItem(null, P.inv.length - 1);
    if (invKg() > invHardKg()) { const left = P.inv.pop(); if (c.items.length < capOf(c)) c.items.push(left); else addToPile(P.x, P.y, left); }
    if (!P.act && !paused && mode === 'play' && Math.hypot(P.x - (c.cx != null ? c.cx : c.x), P.y - (c.cy != null ? c.cy : c.y)) < 2.2) openPanel('loot', {src:c});
    return;
  }
  const re = a.reopen; finishUse0(a);
  if (re && !P.act && mode === 'play' && !paused) openPanel('loot', {src:re});
};
// houses fully searched
function houseOf(f) { const h = hAt[f.y * MW + f.x]; return h ? houses[h - 1] : null; }
function houseSearched(H) {
  if (H._done) return true;
  let n = 0;
  const hid = houses.indexOf(H) + 1;
  for (const f of furns) { if (!CONT[f.type] || !CONT[f.type].loot || hAt[f.y * MW + f.x] !== hid) continue; n++; if (!f.searched) return false; }
  if (n) H._done = true;
  return n > 0;
}
