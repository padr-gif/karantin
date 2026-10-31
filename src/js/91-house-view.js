// ================= видимость дома в духе Project Zomboid =================
// Стены больше не срезаются: они всегда в полный рост, а то, что заслоняет героя, становится прозрачным.
//   • У каждого дома плавная «открытость» Hs.open (0 — закрыт, 1 — открыт). Дом открывается, когда герой внутри,
//     вплотную к нему (ближе HV_NEAR клеток) или зашёл за него так, что дом заслоняет его на экране.
//     Крыша рисуется с прозрачностью 1 − open и растворяется за ~0.3 с, а не пропадает рывком.
//   • У открытого дома передние стены (нижняя и правая на экране) и перегородки перед героем полупрозрачные.
//   • Любая стена прямо перед героем (ближе к камере) рядом с ним на экране — полупрозрачная целиком (wallSeeAt).
//   • У открытого дома (крыша растворилась) окна и двери в полупрозрачной стене чуть заметнее самой стены: поверх
//     рисуется слой «только проём» (наличник, стекло, рама, подоконник, полотно двери, доски) с прозрачностью HV_OPEN_A.
//     У закрытого дома и снаружи окна и двери как обычно.
// Обе графики, пиксельная и детальная.
const HV_NEAR = 1.4, HV_FRONT_A = .34, HV_SEE_A = .3, HV_OPEN_A = .62, HV_SPEED = 7;
let WT_OPEN = false;                                                          // drawWallTile рисует только проём (окно, дверь), без стены
const HV = {inside:0, pD:0, hx:0, hy:0, rx:0, ry:0, on:false};

// заслоняет ли дом героя на экране: герой позади дома (не перед его нижним и правым краем) и под его силуэтом
function houseHidesHero(Hs) {
  if (P.x >= Hs.x + Hs.w + .2 || P.y >= Hs.y + Hs.h + .2) return false;      // перед домом — не заслоняет
  if (P.x < Hs.x - 4 || P.y < Hs.y - 4) return false;
  const b = roofBounds(Hs), sx = SX(P.x, P.y) - SX(Hs.x, Hs.y), sy = SY(P.x, P.y, U * .9) - SY(Hs.x, Hs.y, 0);
  return sx > b[0] && sx < b[2] && sy > b[1] && sy < b[3];
}
function houseOpenTarget(Hs, k) {
  if (mode === 'menu') return 0;
  if (k + 1 === HV.inside) return 1;
  const dx = Math.max(Hs.x - P.x, 0, P.x - (Hs.x + Hs.w)), dy = Math.max(Hs.y - P.y, 0, P.y - (Hs.y + Hs.h));
  if (Math.hypot(dx, dy) < HV_NEAR) return 1;
  return houseHidesHero(Hs) ? 1 : 0;
}
// раз в кадр, до списка рисования: открытость домов, точка и размер прозрачного окна вокруг героя
function houseViewUpdate(dt, inside) {
  HV.inside = inside; HV.pD = P.x + P.y; HV.on = mode !== 'menu' && !P.sleep && !P.car;
  HV.hx = SX(P.x, P.y); HV.hy = SY(P.x, P.y, U * .95); HV.rx = U * 1.35; HV.ry = U * 1.7;
  const k = Math.min(1, (dt || 0) * HV_SPEED);
  for (let i = 0; i < houses.length; i++) {
    const Hs = houses[i], t = houseOpenTarget(Hs, i);
    if (Hs.open == null || mode === 'menu') Hs.open = t;
    else Hs.open += (t - Hs.open) * k;
    if (Math.abs(Hs.open - t) < .01) Hs.open = t;
    Hs.mode = Hs.open > .99 ? 1 : 0;                                          // 1 — крыши нет совсем (её и не кладём в список)
  }
}
// прозрачность стены клетки: передние стены открытого дома и перегородки перед героем — полупрозрачные
function wallAlphaAt(x, y, i) {
  const h = hAt[i]; if (!h) return 1;
  const H = houses[h - 1]; if (!H || !(H.open > 0)) return 1;
  const front = y === H.y + H.h - 1 || x === H.x + H.w - 1;                   // нижняя и правая наружные стены
  const inner = x > H.x && y > H.y && x < H.x + H.w - 1 && y < H.y + H.h - 1;
  if (!front && !(inner && x + y + 1 > HV.pD + .3)) return 1;
  return 1 - (1 - HV_FRONT_A) * H.open;
}
// стена перед героем, которая на экране рядом с ним: полупрозрачная целиком (без вырезанного окна).
// Ближе к герою — прозрачнее, дальше — плавно до обычной: соседние клетки стены не обрываются резко
function wallSeeAt(x, y) {
  if (!HV.on || x + y + 1 < HV.pD + .45) return 1;
  const cx = SX(x + .5, y + .5), cy = SY(x + .5, y + .5, WH * .5);
  const d = Math.hypot((cx - HV.hx) / (HV.rx + U * .9), (cy - HV.hy) / (HV.ry + WH * .5));
  if (d >= 1.5) return 1;
  return d <= 1 ? HV_SEE_A : HV_SEE_A + (1 - HV_SEE_A) * (d - 1) / .5;
}
function drawWallView(e, draw, open) {
  const a = Math.min(wallAlphaAt(e.x, e.y, e.i), wallSeeAt(e.x, e.y)); draw(a);
  const t = map[e.i], H = houses[hAt[e.i] - 1];                               // проём выделяем только у открытого дома (крыши нет)
  if (a < .98 && (t === WIN || t === DOOR) && H && H.open > .01) open(a + (Math.max(HV_OPEN_A, a) - a) * H.open);
}

// закрытый дом (крыша на месте): мебель и перегородки внутри не видны — их не рисуем (93-perf: это была самая
// большая лишняя работа за рулём). Наружные стены рисуются всегда.
const closedAt = i => { const h = hAt[i]; return h > 0 && mode !== 'menu' && !(houses[h - 1].open > .01); };
function hiddenInside(x, y, i) {
  if (!closedAt(i)) return false;
  const H = houses[hAt[i] - 1];
  return x > H.x && y > H.y && x < H.x + H.w - 1 && y < H.y + H.h - 1;
}
