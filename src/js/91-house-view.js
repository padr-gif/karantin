// ================= видимость дома в духе Project Zomboid =================
// Стены больше не срезаются: они всегда в полный рост, а то, что заслоняет героя, становится прозрачным.
//   • У каждого дома плавная «открытость» Hs.open (0 — закрыт, 1 — открыт). Дом открывается, когда герой внутри,
//     заглядывает в его окно (стоит снаружи у окна и смотрит в него — v83) или зашёл за него так, что дом заслоняет
//     его на экране. Просто подойти к стене — ничего не исчезает.
//     Крыша рисуется с прозрачностью 1 − open и растворяется за ~0.3 с, а не пропадает рывком.
//   • У открытого дома передние стены (нижняя и правая на экране) и перегородки перед героем полупрозрачные.
//   • Стена прямо перед героем (ближе к камере) рядом с ним на экране — полупрозрачная целиком (wallSeeAt);
//     у закрытого дома — нет (v83: стены закрытого дома не тают, пока в окно не заглянешь).
//   • У открытого дома (крыша растворилась) окна и двери в полупрозрачной стене чуть заметнее самой стены: поверх
//     рисуется слой «только проём» (наличник, стекло, рама, подоконник, полотно двери, доски) с прозрачностью HV_OPEN_A.
//     У закрытого дома и снаружи окна и двери как обычно.
// Обе графики, пиксельная и детальная.
const HV_PEEK_R = 1.25, HV_PEEK_COS = .72, HV_FRONT_A = .34, HV_SEE_A = .3, HV_OPEN_A = .62, HV_SPEED = 7;
let WT_OPEN = false;                                                          // drawWallTile рисует только проём (окно, дверь), без стены
const HV = {inside:0, pD:0, hx:0, hy:0, rx:0, ry:0, on:false, peek:0, peekT:0};

// в какое окно смотрит герой: окно дома рядом (ближе HV_PEEK_R), герой снаружи, взгляд в сторону окна.
// Возвращает номер дома + 1 или 0. Чтобы не мигало, отпускаем с задержкой (HV.peekT)
function peekHouse(dt) {
  let best = 0, bd = 9;
  if (!P.car && !P.sleep && !HV.inside) {
    const fx = Math.cos(P.face), fy = Math.sin(P.face), x0 = Math.floor(P.x), y0 = Math.floor(P.y);
    for (let y = y0 - 2; y <= y0 + 2; y++) for (let x = x0 - 2; x <= x0 + 2; x++) {
      if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
      const i = y * MW + x; if (map[i] !== WIN || !hAt[i]) continue;
      const dx = x + .5 - P.x, dy = y + .5 - P.y, d = Math.hypot(dx, dy);
      if (d > HV_PEEK_R || d < .05 || (dx * fx + dy * fy) / d < HV_PEEK_COS || d >= bd) continue;
      bd = d; best = hAt[i];
    }
  }
  if (best) { HV.peek = best; HV.peekT = .35; }
  else if ((HV.peekT -= dt || 0) <= 0) HV.peek = 0;
  return HV.peek;
}

// заслоняет ли дом героя на экране: герой позади дома (не перед его нижним и правым краем) и под его силуэтом
// v85: дом открывается, только когда действительно заслоняет героя: туловище (пояс и грудь) внутри силуэта дома
// на экране — выпуклой оболочки углов дома у земли и под крышей. Рядом с домом и у его угла дом цел.
function houseHull(Hs) {
  if (Hs._hull && Hs._hullU === U) return Hs._hull;
  const pts = [];
  for (const [wx, wy] of [[Hs.x - .2, Hs.y - .2], [Hs.x + Hs.w + .2, Hs.y - .2], [Hs.x + Hs.w + .2, Hs.y + Hs.h + .2], [Hs.x - .2, Hs.y + Hs.h + .2]])
    for (const z of [0, WH + U * .9]) pts.push([SX(wx, wy) - SX(Hs.x, Hs.y), SY(wx, wy, z) - SY(Hs.x, Hs.y, 0)]);
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  Hs._hull = lo.slice(0, -1).concat(up.slice(0, -1)); Hs._hullU = U;
  return Hs._hull;
}
function inHull(h, x, y) { for (let k = 0; k < h.length; k++) { const a = h[k], b = h[(k + 1) % h.length]; if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return false; } return true; }
function houseHidesHero(Hs) {
  if (P.x >= Hs.x + Hs.w + .2 || P.y >= Hs.y + Hs.h + .2) return false;      // перед домом — не заслоняет
  if (P.x < Hs.x - 4 || P.y < Hs.y - 4) return false;
  const h = houseHull(Hs), ox = SX(Hs.x, Hs.y), oy = SY(Hs.x, Hs.y, 0), sx = SX(P.x, P.y) - ox;
  return inHull(h, sx, SY(P.x, P.y, U * .55) - oy) && inHull(h, sx, SY(P.x, P.y, U * 1.1) - oy);   // скрыто туловище, а не только макушка
}
function houseOpenTarget(Hs, k) {
  if (mode === 'menu') return 0;
  if (k + 1 === HV.inside) return 1;
  if (k + 1 === HV.peek) return 1;                                            // заглядывает в окно
  if (!houseHidesHero(Hs)) return 0;
  // v85: стоит у задней стены (ближе 1.5 клетки) — дом цел, а герой просвечивает сквозь него силуэтом;
  // зашёл за дом дальше — дом открывается, как раньше
  if (Math.max(Hs.x - P.x, Hs.y - P.y) < 1.5) { HV.ghost = true; return 0; }
  return 1;
}
// раз в кадр, до списка рисования: открытость домов, точка и размер прозрачного окна вокруг героя
function houseViewUpdate(dt, inside) {
  HV.inside = inside; HV.pD = P.x + P.y; HV.on = mode !== 'menu' && !P.sleep && !P.car;
  HV.hx = SX(P.x, P.y); HV.hy = SY(P.x, P.y, U * .95); HV.rx = U * 1.35; HV.ry = U * 1.7;
  peekHouse(dt); HV.ghost = false;
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
function wallSeeAt(x, y, i) {
  if (!HV.on || x + y + 1 < HV.pD + .45) return 1;
  const h = i != null ? hAt[i] : 0; if (h && !(houses[h - 1].open > .01)) return 1;   // стены закрытого дома не тают
  const cx = SX(x + .5, y + .5), cy = SY(x + .5, y + .5, WH * .5);
  const d = Math.hypot((cx - HV.hx) / (HV.rx + U * .9), (cy - HV.hy) / (HV.ry + WH * .5));
  if (d >= 1.5) return 1;
  return d <= 1 ? HV_SEE_A : HV_SEE_A + (1 - HV_SEE_A) * (d - 1) / .5;
}
function drawWallView(e, draw, open) {
  const a = Math.min(wallAlphaAt(e.x, e.y, e.i), wallSeeAt(e.x, e.y, e.i)); draw(a);
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

// ---- герой у задней стены закрытого дома: просвечивает силуэтом поверх дома (дом не раскрывается) ----
onDraw(() => {
  if (!HV.ghost || !HV.on || mode !== 'play' || P.car || P.sleep) return;
  const pAtk = P.atkT != null && P.atkT < P.atkDur ? P.atkT / P.atkDur : -1, [an, fi] = playerAnim(pAtk), a = ctx.globalAlpha;
  ctx.globalAlpha = .42;
  try { withPose(P.x, P.y, playerPose(an), () => drawHeroSprite(an, fi, vaultZ())); } finally { ctx.globalAlpha = a; }
});
