// ================= characters (simple skeleton) =================
const easeIO = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function drawFigure(wx, wy, face, pal, st) {
  const bx = SX(wx, wy), by = SY(wx, wy, st.zoff || 0);
  const c = Math.cos(face), s = Math.sin(face);
  const Fx = (c - s) * U, Fy = (c + s) * hh, Sx = (-s - c) * U, Sy = (-s + c) * hh;
  const th = (st.dead || 0) * Math.PI / 2, dir = st.fallDir || -1, ct = Math.cos(th), sn = Math.sin(th);
  const lunge = st.lunge ? .14 : 0;
  const P3 = p => {
    let f = p[0] + lunge, sd = p[1], z = p[2];
    const f2 = f * ct + dir * z * sn, z2 = Math.max(.02, z * ct - dir * f * sn);
    return [bx + Fx * f2 + Sx * sd, by + Fy * f2 + Sy * sd - z2 * U];
  };
  const t = animT + (st.seed || 0);
  const A = clamp(st.spd || 0, 0, 1), ph = st.walk || 0;
  const k = st.crouch || 0, rec = st.recoil || 0;
  const zomb = !!st.zombie;
  // posture
  let hipZ = .92 - .3 * k, shZ = 1.42 - .34 * k + Math.sin(t * 2.2) * .008, hdZ = 1.66 - .36 * k;
  let shF = .2 * k - .12 * rec + (zomb ? .1 : 0) + A * .05, hdF = .24 * k - .16 * rec + (zomb ? .14 : .03) + A * .06;
  const loll = zomb ? Math.sin(t * 1.3 + (st.seed || 0)) * .05 : 0;
  const bob = Math.abs(Math.sin(ph)) * .03 * A;
  hipZ += bob; shZ += bob; hdZ += bob;
  if (zomb) { hdZ -= .04; }
  const sway = zomb ? Math.sin(ph * .5) * .04 * A : 0;
  // legs
  const legs = [-1, 1].map(sg => {
    const drag = zomb && st.gait === sg;
    const q = ph + (sg > 0 ? Math.PI : 0), amp = drag ? .45 : 1;
    const footF = Math.sin(q) * .24 * A * amp + (drag ? -.08 * A : 0) + .06 * k;
    const lift = drag ? 0 : Math.max(0, -Math.cos(q)) * .08 * A;
    const hip = [0, sg * .09 + sway, hipZ];
    const foot = [footF, sg * .11, lift];
    const knee = [(hip[0] + foot[0]) / 2 + .05 + .06 * A * Math.max(0, -Math.cos(q)) + .26 * k, sg * .1, (hip[2] + foot[2]) / 2 + .02];
    return {sg, hip, knee, foot};
  });
  // arms
  const atk = st.atk == null ? -1 : st.atk;
  const arms = [-1, 1].map(sg => {
    const q = ph + (sg > 0 ? 0 : Math.PI);
    const sh = [shF, sg * .21 + sway, shZ - .03];
    let hand = [shF - Math.sin(q) * .17 * A, sg * .25, hipZ - .04];
    if (zomb && st.reach > 0) {
      const r = st.reach, up = st.lunge ? .12 : 0;
      const rh = [shF + .5 + Math.sin(t * 3 + sg) * .04, sg * .15, shZ - .06 + Math.sin(t * 2.5 + sg * 2) * .06 + up];
      hand = lerp3(hand, rh, r);
    }
    if (st.search) hand = [.38, sg * .12 + Math.sin(t * 7 + sg) * .06, hipZ - .12 + Math.cos(t * 7 + sg) * .05];
    if (st.work && sg > 0) { const w = (t * 2.2) % 1; const lift = w < .6 ? w / .6 : 1 - (w - .6) / .4; hand = [.42, .05, shZ + .05 - lift * .5]; }
    if (atk >= 0 && sg > 0) {
      const rest = hand, wind = [-.05, .32, shZ + .28], hit = [.5, -.12, hipZ + .12];
      if (atk < .3) hand = lerp3(rest, wind, easeIO(atk / .3));
      else if (atk < .55) hand = lerp3(wind, hit, easeIO((atk - .3) / .25));
      else hand = lerp3(hit, rest, easeIO((atk - .55) / .45));
    }
    if (atk >= 0 && sg < 0 && !st.weapon) { // two-handed jab look for fists
      const j = atk < .4 ? atk / .4 : 1 - (atk - .4) / .6;
      hand = lerp3(hand, [.45, -.05, shZ - .05], Math.max(0, j) * .6);
    }
    const elbow = [(sh[0] + hand[0]) / 2 - .06, sg * .24, (sh[2] + hand[2]) / 2 - .04];
    return {sg, sh, elbow, hand};
  });
  const ol = 'rgba(16,14,12,.78)';
  const seg = (pts, w, col) => {
    const sp = pts.map(P3);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = w + 2.2; ctx.strokeStyle = ol; ctx.beginPath(); sp.forEach((p, i2) => i2 ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    ctx.lineWidth = w; ctx.strokeStyle = col; ctx.beginPath(); sp.forEach((p, i2) => i2 ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    return sp;
  };
  const f = st.f == null ? 1 : st.f;
  // shadow
  if (!st.dead && !st.zoff) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(bx, by, U * .32, U * .16, 0, 0, 6.283); ctx.fill(); }
  const sideDepth = c - s, fwdDepth = c + s; // world depth of +side / +forward
  const frontSide = sideDepth >= 0 ? 1 : -1;
  const drawLeg = L => {
    seg([L.hip, L.knee, L.foot], U * .14, C(pal.pants, f));
    const fp = P3([L.foot[0] + .05, L.foot[1], L.foot[2] + .02]);
    ctx.fillStyle = C(pal.shoes, f); ctx.beginPath(); ctx.ellipse(fp[0], fp[1], U * .085, U * .05, 0, 0, 6.283); ctx.fill();
  };
  const weaponId = st.weapon;
  const drawArm = Aa => {
    const sleeve = zomb && hash(Math.floor((st.seed || 0) * 10), 3) < .5 ? pal.skin : pal.cloth;
    seg([Aa.sh, Aa.elbow], U * .11, C(sleeve, f));
    seg([Aa.elbow, Aa.hand], U * .1, C(zomb ? pal.skin : pal.cloth, f));
    const hp = P3(Aa.hand);
    ctx.fillStyle = C(pal.skin, f); ctx.beginPath(); ctx.arc(hp[0], hp[1], U * .055, 0, 6.283); ctx.fill();
    if (weaponId && Aa.sg > 0) {
      let d;
      if (atk >= 0) d = [Aa.hand[0] - Aa.sh[0] + .1, Aa.hand[1] - Aa.sh[1], Aa.hand[2] - Aa.sh[2] + .2];
      else if (st.work) d = [.4, 0, .5];
      else d = [.55, .05, .55];
      const l = Math.hypot(d[0], d[1], d[2]) || 1, len = weaponId === 'knife' ? .32 : weaponId === 'hammer' ? .42 : weaponId === 'axe' ? .7 : .78;
      const tip = [Aa.hand[0] + d[0] / l * len, Aa.hand[1] + d[1] / l * len, Aa.hand[2] + d[2] / l * len];
      const wc = weaponId === 'knife' ? '#c4c7ca' : weaponId === 'pipe' ? '#7d8288' : weaponId === 'axe' || weaponId === 'hammer' ? '#7a5a3a' : '#b08452';
      const sp = seg([Aa.hand, tip], U * (weaponId === 'bat' ? .09 : .06), wc);
      if (weaponId === 'axe' || weaponId === 'hammer') { ctx.fillStyle = '#9aa0a6'; ctx.strokeStyle = ol; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sp[1][0], sp[1][1], U * (weaponId === 'axe' ? .12 : .07), 0, 6.283); ctx.fill(); ctx.stroke(); }
    }
  };
  const drawPack = () => {
    if (!pal.pack) return;
    const p0 = P3([shF - .2, 0, shZ - .22]), p1 = P3([shF - .2, 0, hipZ + .1]);
    ctx.lineCap = 'round'; ctx.lineWidth = U * .3 + 2; ctx.strokeStyle = ol; ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
    ctx.lineWidth = U * .3; ctx.strokeStyle = C([108,86,56], f); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
  };
  const drawTorso = () => {
    const hipC = [0, sway, hipZ + .05], shC = [shF, sway, shZ];
    seg([hipC, shC], U * .4, C(pal.cloth, f));
    // collar / shoulders
    const sl = P3([shF, sway - .17, shZ - .02]), sr = P3([shF, sway + .17, shZ - .02]);
    ctx.lineWidth = U * .16; ctx.strokeStyle = C(pal.cloth, f); ctx.beginPath(); ctx.moveTo(sl[0], sl[1]); ctx.lineTo(sr[0], sr[1]); ctx.stroke();
    for (let q = 0; q < (pal.blood || 0); q++) { const bp = P3([shF * .6 + .12 * (fwdDepth >= 0 ? 1 : -1), (hash(q, 3) - .5) * .3, hipZ + .1 + hash(q, 9) * .38]); ctx.fillStyle = 'rgba(100,16,12,.85)'; ctx.beginPath(); ctx.arc(bp[0], bp[1], U * (.035 + hash(q, 5) * .05), 0, 6.283); ctx.fill(); }
    // belt
    const b0 = P3([0, sway - .18, hipZ + .02]), b1 = P3([0, sway + .18, hipZ + .02]);
    ctx.lineWidth = U * .06; ctx.strokeStyle = C(shadeC(pal.pants, .7), f); ctx.beginPath(); ctx.moveTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]); ctx.stroke();
  };
  const drawHead = () => {
    const hc = P3([hdF, loll + sway, hdZ]);
    ctx.fillStyle = C(pal.skin, f); ctx.strokeStyle = ol; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(hc[0], hc[1], U * .15, 0, 6.283); ctx.fill(); ctx.stroke();
    const faceVis = fwdDepth > -.3;
    if (pal.hair) {
      ctx.fillStyle = C(pal.hair, f); ctx.beginPath();
      if (faceVis) { const back = P3([hdF - .06, loll + sway, hdZ + .04]); ctx.arc(back[0], back[1], U * .14, 0, 6.283); }
      else ctx.arc(hc[0], hc[1] - U * .01, U * .152, 0, 6.283);
      ctx.fill();
    }
    if (faceVis && !st.dead) {
      const e1 = P3([hdF + .13, loll + sway - .05, hdZ + .02]), e2 = P3([hdF + .13, loll + sway + .05, hdZ + .02]);
      ctx.fillStyle = zomb ? 'rgba(70,10,8,.9)' : 'rgba(30,24,20,.9)';
      ctx.fillRect(e1[0] - 1.2, e1[1] - 1.2, 2.4, 2.4); ctx.fillRect(e2[0] - 1.2, e2[1] - 1.2, 2.4, 2.4);
      if (zomb && st.lunge) { const m = P3([hdF + .13, loll + sway, hdZ - .07]); ctx.fillStyle = 'rgba(40,6,4,.9)'; ctx.beginPath(); ctx.ellipse(m[0], m[1], U * .04, U * .035, 0, 0, 6.283); ctx.fill(); }
    }
  };
  const backLeg = legs.find(L => L.sg !== frontSide), frontLeg = legs.find(L => L.sg === frontSide);
  const backArm = arms.find(L => L.sg !== frontSide), frontArm = arms.find(L => L.sg === frontSide);
  drawLeg(backLeg);
  drawArm(backArm);
  if (fwdDepth >= 0) drawPack();
  drawLeg(frontLeg);
  drawTorso();
  if (fwdDepth < 0) drawPack();
  drawHead();
  drawArm(frontArm);
  if (st.flash) { const tc = P3([shF * .5, 0, (hipZ + shZ) / 2]); ctx.fillStyle = 'rgba(255,240,230,.35)'; ctx.beginPath(); ctx.ellipse(tc[0], tc[1], U * .26, U * .4, 0, 0, 6.283); ctx.fill(); }
}
