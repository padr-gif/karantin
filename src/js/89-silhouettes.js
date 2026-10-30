// ================= контур героя и мертвецов за стеной или крышей =================
// Стены чужих домов и крыши больше не просвечивают (57-occlusion: wallCutAt), поэтому того, кто зашёл за них,
// видно контуром поверх: герой — светлым, мертвецы — красным. Мертвецов, которых герой не видит (туман), нет и в контуре.
// Заслонён ли: от ног к камере (по экрану вверх-вниз это шаг +s,+s по карте) ищем стену в полный рост или крышу дома.
function silHidden(x, y) {
  const ins = occInsideHouse();
  for (let s = .2; s <= 3.6; s += .2) for (const o of [-.22, 0, .22]) {
    const tx = Math.floor(x + s + o), ty = Math.floor(y + s - o);
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH || (tx === Math.floor(x) && ty === Math.floor(y))) continue;   // своя клетка (стоит в проёме) не заслоняет
    const i = ty * MW + tx, h = hAt[i];
    if (s <= 2.4 && isWallish(map[i]) && !wallCutAt(tx, ty, i, ins)) {
      const o2 = obs[i]; if (!(map[i] === DOOR && o2 && o2.open && !(o2.bhp > 0))) return true;   // открытая дверь не заслоняет
    }
    if (h && h !== ins) return true;                                            // крыша чужого дома
  }
  return false;
}
// контур кадра: расширенный силуэт минус сам силуэт, плюс лёгкая заливка — один раз на кадр анимации и цвет
const SIL_C = new WeakMap();
function silOutline(cv, col) {
  let m = SIL_C.get(cv); if (!m) { m = {}; SIL_C.set(cv, m); }
  if (m[col]) return m[col];
  const p = 3, r = Math.max(1, Math.round(cv.width / 90)), o = document.createElement('canvas');
  o.width = cv.width + p * 2; o.height = cv.height + p * 2;
  const g = o.getContext('2d');
  for (const [a, b] of [[-r, 0], [r, 0], [0, -r], [0, r], [-r, -r], [r, r], [-r, r], [r, -r]]) g.drawImage(cv, p + a, p + b);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, o.width, o.height);
  g.globalCompositeOperation = 'destination-out'; g.drawImage(cv, p, p);
  const f = document.createElement('canvas'); f.width = cv.width; f.height = cv.height;   // заливка силуэта
  const gf = f.getContext('2d'); gf.drawImage(cv, 0, 0); gf.globalCompositeOperation = 'source-in'; gf.fillStyle = col; gf.fillRect(0, 0, f.width, f.height);
  return (m[col] = {o, f, p});
}
onDraw(() => {
  if (mode !== 'play' || !P || !SIL.q.length) return;
  const seen = new Set();
  for (const e of SIL.q) {
    const ent = e.ent; if (seen.has(ent)) continue; seen.add(ent);
    const hero = ent === P;
    if (!hero && !zs.includes(ent)) continue;
    if (!silHidden(ent.x, ent.y)) continue;
    const S = silOutline(e.cv, hero ? '#f3ead2' : '#ff5a44'), k = e.w / e.cv.width, pk = S.p * k;
    ctx.save(); ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = hero ? .32 : .28; ctx.drawImage(S.f, e.dx, e.dy, e.w, e.h);
    ctx.globalAlpha = .95; ctx.drawImage(S.o, e.dx - pk, e.dy - pk, e.w + pk * 2, e.h + pk * 2);
    ctx.restore();
  }
});
