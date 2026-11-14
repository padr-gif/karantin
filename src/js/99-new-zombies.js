// ================= новые мертвецы: под машиной, раздутый; громила выносит двери =================
//   • «Под машиной» — ползун лежит под брошенной машиной, из-под днища видна только рука (пальцы шевелятся).
//     Пройдёшь вплотную — хватает за ногу (ты почти не можешь идти пару секунд) и выползает. Замечен заранее —
//     обойди или ударь первым: удар по руке выволакивает его, но схватить уже не успеет. Крадучись подойти можно ближе.
//   • «Раздутый» — медленный, вокруг него зелёный смрад и мухи. Убьёшь — лопается облаком газа: стоять в нём
//     тошнотворно (отравление), рядом — забрызгает. Таких лучше валить издалека: рогаткой, из пистолета или ружья.
//   • Громила (здоровяк) теперь ломает двери, окна и баррикады в разы быстрее остальных — дверь его долго не держит.
{
  const once = (flag, text) => { if (world[flag]) return; world[flag] = true; toast(text); };
  const free = (x, y) => { const tx = Math.floor(x), ty = Math.floor(y); return tx > 1 && ty > 1 && tx < MW - 2 && ty < MH - 2 && !navBlocked(tx, ty) && !opaquePt(x, y) && !hAt[ty * MW + tx]; };

  // ---------- под машиной ----------
  function spawnUnder(minD) {
    const cars = props.filter(p => p.type === 'car' && p.r && !p.burnt && !p.under && Math.hypot(p.cx - P.x, p.cy - P.y) > minD);
    let n = zs.filter(z => z.under).length;
    for (const c of cars) {
      if (n >= 6) break;
      if (rng() > .16) continue;
      // лицом к камере (юг/восток) — рука видна и не прячется за кузовом
      const xs = c.dir === 'x', x = xs ? c.cx + (rng() - .5) * 1.1 : c.r[2] + .45, y = xs ? c.r[3] + .45 : c.cy + (rng() - .5) * 1.1;
      if (!free(x, y)) continue;
      const z = mkZombie(x, y, zPal(), 45, .55);
      z.crawl = true; z.under = true; z.ua = xs ? Math.PI / 2 : 0; z.uh = z.hp; z.down = 99; z.downT = 1; z.downF = false; z.state = 'wander';
      c.under = true; n++;
    }
  }
  function crawlOut(z, grab) {
    z.under = false; z.down = 0; z.kd = false; z.state = 'chase'; z.lost = 0; z.aw = 1; z.tx = P.x; z.ty = P.y;
    z.x += Math.cos(z.ua) * .25; z.y += Math.sin(z.ua) * .25;
    SFX.growl && SFX.growl(z);
    if (!grab) return;
    P.grabT = Math.max(P.grabT || 0, 2.2); P.stress = Math.min(100, (P.stress || 0) + 10);
    if (!reduceMotion && settings.shake) shake = Math.max(shake, .07);
    buzz && buzz(30, 'grab', 300);
    once('ucMsg', 'Из-под машины схватили за ногу! Вырвись и отойди. Видишь руку под машиной — обходи или бей первым');
  }
  let ucAcc = 0;
  onUpdate(dt => {
    if (!P || mode !== 'play' || paused) return;
    for (const z of zs) {
      if (!z.under) continue;
      if (z.hp < z.uh) { crawlOut(z, false); continue; }                       // ударили по руке — выволок
      z.down = 99; z.downT = 1;
      if (P.car || P.sleep) continue;
      const d = Math.hypot(z.x - P.x, z.y - P.y), trig = P.sneak ? .85 : P.running ? 1.5 : 1.2;
      if (d < trig) crawlOut(z, true);
    }
    ucAcc += dt; if (ucAcc < 5) return; ucAcc = 0;
    const key = (world.dx || 0) + ',' + (world.dy || 0);
    world.ucD = world.ucD || {};
    if (!world.ucD[key] && !(typeof TUT !== 'undefined' && TUT.on)) { world.ucD[key] = 1; spawnUnder(14); }
  });
  // рука из-под днища
  onDraw(() => {
    if (mode !== 'play') return;
    for (const z of zs) {
      if (!z.under) continue;
      const i = Math.floor(z.y) * MW + Math.floor(z.x); if (!vis[i]) continue;
      const fx = Math.cos(z.ua), fy = Math.sin(z.ua), t = animT + z.seed * 9, tw = Math.max(0, Math.sin(t * 1.3)) ** 8;   // время от времени скребёт пальцами
      const bx = z.x - fx * .62, by = z.y - fy * .62, hx = z.x - fx * (.3 - tw * .05), hy = z.y - fy * (.3 - tw * .05);   // из-под края кузова
      const a = [SX(bx, by), SY(bx, by, 1)], b = [SX(hx, hy), SY(hx, hy, 1)], f = lightLevel() < .3 ? .55 : 1;
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(14,12,12,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.strokeStyle = `rgba(${Math.round(128 * f)},${Math.round(136 * f)},${Math.round(112 * f)},1)`; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      const px = -fy, py = fx;
      ctx.fillStyle = `rgba(${Math.round(124 * f)},${Math.round(132 * f)},${Math.round(108 * f)},1)`; ctx.beginPath(); ctx.ellipse(b[0], b[1], 1.6, 1.1, 0, 0, 6.283); ctx.fill();   // ладонь
      for (let k = -1; k <= 1; k++) {
        const ex = hx + fx * (.12 - tw * .06) + px * k * .06, ey = hy + fy * (.12 - tw * .06) + py * k * .06;
        ctx.strokeStyle = `rgba(${Math.round(120 * f)},${Math.round(128 * f)},${Math.round(104 * f)},1)`; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(SX(ex, ey), SY(ex, ey, .5)); ctx.stroke();
      }
      ctx.restore();
    }
  });
  { const dz0 = drawZombie;                                                   // сам он под машиной — не виден
    drawZombie = function (z) { if (z && z.under) return; return dz0.apply(this, arguments); };
  }

  // ---------- раздутый ----------
  function makeBloat(z) { z.bloat = true; z.hp *= 1.35; z.spd *= .78; }
  let clouds = [];
  onNewWorld(o => {
    clouds = [];
    if (o && o.save) return;
    for (const z of zs) if (!z.crawl && !z.brute && !z.scream && !(z.pal && z.pal.fast) && !z.first && rng() < .035) makeBloat(z);
  });
  { const kz0 = killZombie;
    killZombie = function (z) {
      const b = z && z.bloat && zs.includes(z), x = z && z.x, y = z && z.y;
      const r = kz0.apply(this, arguments);
      if (b) burst(x, y);
      return r;
    };
  }
  function burst(x, y) {
    clouds.push({x, y, t:0, life:9});
    addBlood && addBlood(x, y, .9);
    if (!reduceMotion) { emit('blood', x, y, .9, 14, null, 6.283, 2.2); for (let k = 0; k < 8; k++) emit('smoke', x + (rng() - .5), y + (rng() - .5), .6, 1, null, 0, .3); }
    try { smp('hitu', .6, .7); } catch (e) {}
    noise(x, y, 6);
    const d = Math.hypot(x - P.x, y - P.y);
    if (d < 1.4) { P.dirt = Math.min(100, (P.dirt || 0) + 25); P.stress = Math.min(100, (P.stress || 0) + 6); toast('Раздутый лопнул прямо на тебя. Отойди от газа!'); }
    else once('blMsg', 'Раздутый лопнул облаком газа. Таких лучше валить издалека — рогаткой или из оружия');
  }
  onUpdate(dt => {
    if (!clouds.length || !P) return;
    for (const c of clouds) {
      c.t += dt;
      if (P.car || Math.hypot(c.x - P.x, c.y - P.y) > 1.9 * Math.min(1, .5 + c.t / 2)) continue;
      c.inT = (c.inT || 0) + dt;
      if (c.inT > .8) { P.pois = Math.max(P.pois || 0, Math.min(90, (P.pois || 0) + dt * 30)); if (!c.msg) { c.msg = 1; toast('Смрад выворачивает наизнанку. Тошнит'); lastCause = 'Трупный газ'; } }
    }
    clouds = clouds.filter(c => c.t < c.life);
  });
  onDraw(() => {
    if (mode !== 'play') return;
    // облака газа
    for (const c of clouds) {
      const k = Math.min(1, c.t / .6) * Math.min(1, (c.life - c.t) / 2), r = 1.9 * Math.min(1, .5 + c.t / 2);
      for (let j = 0; j < 9; j++) {
        const a = j / 9 * 6.283 + c.t * .25 + j, rr = r * (.35 + (j % 3) * .25), x = c.x + Math.cos(a) * rr, y = c.y + Math.sin(a) * rr;
        const sx = SX(x, y), sy = SY(x, y, U * (.25 + .15 * Math.sin(c.t + j))), s = U * (.55 + .2 * Math.sin(c.t * 1.3 + j));
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s); g.addColorStop(0, `rgba(150,170,70,${.28 * k})`); g.addColorStop(1, 'rgba(120,150,60,0)');
        ctx.fillStyle = g; ctx.fillRect(sx - s, sy - s, s * 2, s * 2);
      }
    }
    // смрад и мухи вокруг живых раздутых
    for (const z of zs) {
      if (!z.bloat || z.under) continue;
      const i = Math.floor(z.y) * MW + Math.floor(z.x); if (!vis[i]) continue;
      const sx = SX(z.x, z.y), sy = SY(z.x, z.y, U * .9), t = animT + z.seed * 7;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, U * .75); g.addColorStop(0, 'rgba(140,170,55,.32)'); g.addColorStop(.6, 'rgba(130,160,55,.12)'); g.addColorStop(1, 'rgba(140,165,60,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - U, sy - U, U * 2, U * 2);
      ctx.fillStyle = 'rgba(20,20,16,.85)';
      for (let k = 0; k < 8; k++) { const a = t * (2 + k * .4) + k * 1.7, rx = Math.cos(a) * U * (.3 + k * .05), ry = Math.sin(a * 1.3) * U * .25 - U * (.2 + k * .08); ctx.fillRect(Math.round(sx + rx), Math.round(sy + ry), 1, 1); }
    }
  });

  // ---------- громила выносит двери ----------
  { const do0 = damageOpening;
    damageOpening = function (i, dmg) {
      const ex = (i % MW) + .5, ey = ((i / MW) | 0) + .5;
      const br = zs.find(z => z.brute && !(z.down > 0) && Math.hypot(z.x - ex, z.y - ey) < 1.05);
      if (br) {
        dmg *= 2.8;
        SFX.knock && SFX.knock(ex, ey);
        if (Math.hypot(ex - P.x, ey - P.y) < 9) { if (!reduceMotion && settings.shake) shake = Math.max(shake, .04); once('brDoor', 'Громила выносит дверь — долго она не продержится'); }
      }
      return do0.call(this, i, dmg);
    };
  }

  // ---------- сохранение ----------
  onSave(d => { d.xNZ = {u:[], b:[], ucD:world.ucD || {}}; zs.forEach((z, k) => { if (z.under) d.xNZ.u.push([k, +z.ua.toFixed(2)]); if (z.bloat) d.xNZ.b.push(k); }); });
  onLoad(d => {
    const x = d && d.xNZ; if (!x) return;
    if (x.ucD) world.ucD = x.ucD;
    for (const [k, a] of x.u || []) { const z = zs[k]; if (z) { z.under = true; z.ua = a; z.uh = z.hp; z.crawl = true; z.down = 99; z.downT = 1; } }
    for (const k of x.b || []) { const z = zs[k]; if (z) z.bloat = true; }
  });
}
