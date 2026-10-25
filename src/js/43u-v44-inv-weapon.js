// ================= v44: оружие в руке свисает по-человечески, рюкзак — 4 ячейки в ряд с прокруткой, перенос пачкой,
// крупный герой в редакторе =================

// ---- оружие в покое и на ходу: висит в руке вниз и чуть вперёд, а не торчит палкой вбок ----
const WPN_LOOSE = /_(idle|walk|run|sneak|sneakidle|hit|vault)_\d_\d+$/;
{ const dw = drawWeapon;
  drawWeapon = function (name, wid, wx, wy, zoff) {
    const wm = ART.meta.wpn && ART.meta.wpn[name];
    if (!wm || !WPN_LOOSE.test(name)) return dw(name, wid, wx, wy, zoff);
    const f = P.fd != null ? P.fd : P.face, fx = Math.cos(f), fy = Math.sin(f), long = TWO_H.has(wid);
    let x = fx * (long ? .84 : .6), y = fy * (long ? .84 : .6), z = -1;   // длинное — наклонено сильнее, чтобы не чиркать по земле
    const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l;
    ART.meta.wpn.__w = [wm[0], wm[1], (x - y) * 32 * .08, ((x + y) * 16 - z * 31) * .08, wm[4]];
    return dw('__w', wid, wx, wy, zoff);
  };
}

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
drawPreview = function () {
  const cvp = $('cPrev'); if (cvp.width !== 240) { cvp.width = 240; cvp.height = 300; }
  const g = cvp.getContext('2d');
  g.clearRect(0, 0, cvp.width, cvp.height);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(120, 282, 52, 16, 0, 0, 6.283); g.fill();
  const dir = Math.floor(animT / 1.2) % 8, nw = AN('p', 'walk'), fi = Math.floor(animT * 12) % nw;
  const name = 'p' + look.g + '_walk_' + dir + '_' + fi;
  const fr = charFrame(name, 'P' + look.g + look.skin + look.hair + look.shirt + look.pants, lookPal(look), true);
  if (!fr) return;
  const ps = 3.5 / ((fr && fr.s) || ART.meta.charScale || 1);                // вчетверо — крупно, пиксели ровные, размер не прыгает
  g.imageSmoothingEnabled = false; g.drawImage(fr.cv, 120 - fr.ax * ps, 282 - fr.ay * ps, fr.w * ps, fr.h * ps);
};
