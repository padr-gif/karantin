// ================= оружие в руке свисает по-человечески, рюкзак — 4 ячейки в ряд с прокруткой, перенос пачкой,
// крупный герой в редакторе =================

// ---- оружие в покое и на ходу: висит в руке вниз и чуть вперёд, а не торчит палкой вбок ----
const WPN_LOOSE = /_(idle|walk|run|sneak|sneakidle|hit|vault)_\d_\d+$/;

// ---- рюкзак: ровно 4 ячейки в ряд, список прокручивается ----
// пустые ячейки — до конца ряда (минимум один ряд)
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
