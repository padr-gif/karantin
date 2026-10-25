// ================= v44: оружие в руке свисает по-человечески, рюкзак — 4 ячейки в ряд с прокруткой, перенос пачкой,
// крупный герой в редакторе =================

// ---- оружие в покое и на ходу: висит в руке вниз и чуть вперёд, а не торчит палкой вбок ----
const WPN_LOOSE = /_(idle|walk|run|sneak|sneakidle|hit|vault)_\d_\d+$/;

// ---- рюкзак: ровно 4 ячейки в ряд, список прокручивается ----
{ const fg = fitGrid;
  fitGrid = function (g) {
    if (!g.closest || !g.closest('.invsec')) return fg(g);
    const host = g.closest('.pcol'); if (!host || !host.clientWidth) return;
    const gap = 6, w = host.clientWidth - 22, s = Math.max(40, Math.min(70, Math.floor((w - gap * 3) / 4)));
    g.style.gridTemplateColumns = `repeat(4, ${s}px)`; g.style.setProperty('--cs', s + 'px'); g.classList.toggle('tiny', s < 50);
  };
}
// пустые ячейки — до конца ряда (минимум один ряд)
{ const sec = invSection;
  invSection = function (title, sub, frac, list, onlyBag) {
    const box = sec(title, sub, frac, list, onlyBag), g = box.querySelector('.grid'); if (!g) return box;
    for (const v of [...g.querySelectorAll('.cell.void')]) v.remove();
    const n = g.children.length, need = Math.max(4, Math.ceil(n / 4) * 4) - n;
    for (let k = 0; k < need; k++) g.appendChild(cell(null));
    // «всё туда» — в заголовке раздела
    if (P.bag && P.inv.some(it => !!it.bp === onlyBag)) {
      const b = btn(onlyBag ? 'Всё в карманы' : 'Всё в рюкзак', () => moveAll(!onlyBag), 'ghost'); b.classList.add('mvall');
      box.querySelector('.secrow').appendChild(b);
    }
    return box;
  };
}
// переложить сразу несколько: в рюкзак — сколько влезет, по весу
function moveItems(items, toBag) {
  let moved = 0, left = 0;
  for (const it of items) {
    if (!!it.bp === toBag) continue;
    if (toBag && bagKgUsed() + itemKg(it) > bagCapKg() + 1e-6) { left++; continue; }
    it.bp = toBag ? 1 : 0; moved++;
  }
  if (moved) SFX.rustle();
  if (left) toast(moved ? `Переложил ${moved}, ещё ${left} не влезло в рюкзак` : 'В рюкзак не влезет: свободно ' + fmtKg(bagCapKg() - bagKgUsed()) + ' кг');
  panel.sel = null; renderPanel(); updateHud();
}
function moveAll(toBag) {
  const its = P.inv.filter(it => !!it.bp !== toBag).sort((a, b) => itemKg(a) - itemKg(b));   // сначала лёгкое — влезет больше вещей
  moveItems(its, toBag);
}
// ---- обыск: в заголовке видно, сколько ещё унесёшь ----
{ onPanel(() => {
    if (panel && panel.kind === 'loot' && $('pnSub') && !xferQ.length) $('pnSub').textContent = 'унесёшь ещё ' + fmtKg(Math.max(0, invHardKg() - invKg())) + ' кг · ' + (invOver() > 0 ? 'уже перегруз' : 'без перегруза ещё ' + fmtKg(Math.max(0, invCapKg() - invKg())) + ' кг');
  });
}

// ---- редактор персонажа: герой крупнее ----
