// ================= рюкзак удобнее (v83) =================
//   • окно полупрозрачное: мир за ним видно (класс glass на #panel, styles.css);
//   • двойной тап по вещи — сразу главное действие: съесть, выпить, надеть, взять в руки, включить фонарь;
//   • полоска фильтров по видам вещей (Еда, Медицина, Оружие…) — когда вещей много; выбор помнится до закрытия игры.
let invTapK = '', invTapT = 0;
function invTap(g) {
  const now = performance.now();
  if (invTapK === g.key && now - invTapT < 380) { invTapK = ''; invQuick(g); return; }
  invTapK = g.key; invTapT = now;
  panel.sel = panel.sel === g.key ? null : g.key; renderPanel();
}
function invQuick(g) {
  const d = ITEMS[g.it.id], k = P.inv.indexOf(g.it); if (!d || k < 0) return;
  if (d.kind === 'light') { useItem(null, k); renderPanel(); return; }
  if (!d.verb) { panel.sel = g.key; renderPanel(); toast(d.name + ': тут нечего делать сразу'); return; }
  panel.sel = null; beginUse(k); updateHud(); if (panel) renderPanel();
}
// фильтр по виду вещей
const INV_FLT = {cat:null};
const invFltOk = it => !INV_FLT.cat || catOf(it.id) === INV_FLT.cat;
function invFilterRow(R) {
  const n = {}; for (const it of P.inv) { const c = catOf(it.id); n[c] = (n[c] || 0) + 1; }
  const cats = CATS.filter(c => n[c]);
  if (INV_FLT.cat && !n[INV_FLT.cat]) INV_FLT.cat = null;
  if (cats.length < 2 && !INV_FLT.cat) return;
  const row = mk('div', 'invflt');
  const chip = (label, c, cnt) => {
    const b = btn(label, () => { INV_FLT.cat = c; panel.sel = null; renderPanel(); }, INV_FLT.cat === c ? 'on' : '');
    if (cnt != null) b.appendChild(mk('small', '', String(cnt)));
    row.appendChild(b);
  };
  chip('Все', null, P.inv.length);
  for (const c of cats) chip(c, c, n[c]);
  R.appendChild(row);
}

// ---- окно закрывается само (v85): отошёл от шкафа — обыск закрылся; при открытом рюкзаке шаг (WASD, стрелки) закрывает его ----
onUpdate(() => {
  if (!panel || panel.kind !== 'loot' || !panel.src || P.car) return;
  const s = panel.src, x = s.cx != null ? s.cx : s.x, y = s.cy != null ? s.cy : s.y;
  if (x != null && Math.hypot(x - P.x, y - P.y) > 2.2) closePanel();
});
addEventListener('keydown', e => {
  if (!panel || panel.kind !== 'inv' || mode !== 'play') return;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) closePanel();
});
