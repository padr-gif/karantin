// ================= sound: everything synthesised with WebAudio =================
const LOW_AUDIO = /Android/i.test(navigator.userAgent) || /[?&]lowaudio\b/.test(location.search);
let ACTIVE_SND = 0; const MAX_SND = LOW_AUDIO ? 10 : 24;          // сколько звуков одновременно; лишние пропускаем
const sndStart = (src, t, off) => { ACTIVE_SND++; src.onended = () => { ACTIVE_SND--; }; off != null ? src.start(t, off) : src.start(t); };
const SFX = (() => {
  let ac = null, out = null, noiseBuf = null, rainG = null, rainF = null, windG = null, last = {};
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    // Android: крупный звуковой буфер — звук будит процессор реже (на планшете звук съедал треть кадра); задержка ~0.1 с на слух не мешает
    try { ac = new AC(LOW_AUDIO ? {latencyHint:'playback'} : undefined); } catch (e) { try { ac = new AC(); } catch (e2) { return; } }
    out = ac.createDynamicsCompressor(); out.threshold.value = -14; out.ratio.value = 4;
    const master = ac.createGain(); master.gain.value = 1; out.connect(master); master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // ambience loops
    const loop = (type, f, q) => { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ac.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(out); s.start(); return [g, fl]; };
    [rainG, rainF] = loop('bandpass', 2400, .5);
    [windG] = loop('lowpass', 380, .8);
  }
  const vol = () => settings.vol == null ? .7 : settings.vol;
  const ok = (k, gap) => { const t = performance.now(); if (last[k] && t - last[k] < gap) return false; last[k] = t; return true; };
  function at(x, y) { if (x == null || !P) return 1; const d = Math.hypot(x - P.x, y - P.y); return Math.max(0, 1 - d / 16) ** 1.4; }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + dec); }
  function noise(peak, dur, type, f, q, delay, a, f2) {
    if (!ac || peak * vol() < .002 || ACTIVE_SND >= MAX_SND) return;
    const t = ac.currentTime + (delay || 0), s = ac.createBufferSource(); s.buffer = noiseBuf;
    const fl = ac.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.setValueAtTime(f || 1000, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q || 1;
    const g = ac.createGain(); env(g, t, a || .004, peak * vol(), dur);
    s.connect(fl); fl.connect(g); g.connect(out); sndStart(s, t, Math.random() * 1.5); s.stop(t + dur + .1);
  }
  function tone(peak, dur, type, f, f2, delay, a) {
    if (!ac || peak * vol() < .002 || ACTIVE_SND >= MAX_SND) return;
    const t = ac.currentTime + (delay || 0), o = ac.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ac.createGain(); env(g, t, a || .005, peak * vol(), dur);
    o.connect(g); g.connect(out); sndStart(o, t); o.stop(t + dur + .1);
  }
  function voice(peak, dur, f, f2, delay, form) {
    if (!ac || peak * vol() < .002 || ACTIVE_SND >= MAX_SND) return;
    const t = ac.currentTime + (delay || 0), o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 1.12, t + dur * .3); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5 + Math.random() * 4; lg.gain.value = f * .05; lfo.connect(lg); lg.connect(o.frequency);
    const fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = form || 600; fl.Q.value = 3;
    const g = ac.createGain(); env(g, t, dur * .25, peak * vol(), dur * .75);
    o.connect(fl); fl.connect(g); g.connect(out); sndStart(o, t); lfo.start(t); o.stop(t + dur + .1); lfo.stop(t + dur + .1);
  }
  return {
    mute(on) { if (!ac) return; try { on ? ac.suspend() : ac.resume(); } catch (e) {} },
    init, get ac() { return ac; }, get out() { return out; }, vol, ok,
    ui() { noise(.05, .03, 'highpass', 3000, .7); },
    step(inside, run) { const r = .8 + Math.random() * .4; if (inside) { noise((run ? .16 : .1), .07, 'bandpass', 420 * r, 1.4); tone(.05, .06, 'sine', 110 * r, 70); } else noise((run ? .14 : .08), .09, 'bandpass', 1700 * r, .8, 0, .006, 900); },
    swing(heavy) { noise(heavy ? .22 : .15, heavy ? .22 : .14, 'bandpass', heavy ? 700 : 1300, 1.2, 0, .05, heavy ? 250 : 500); },
    hit(heavy, x, y) { const v = at(x, y); noise(.5 * v, .12, 'lowpass', heavy ? 600 : 900, 1); tone(.4 * v, .12, 'sine', heavy ? 95 : 130, 45); noise(.18 * v, .2, 'bandpass', 300, 2, .02); },
    splat(x, y) { const v = at(x, y); noise(.35 * v, .35, 'lowpass', 500, 1.5, .03, .01, 150); tone(.3 * v, .25, 'sine', 70, 35, .05); },
    bite() { noise(.4, .09, 'bandpass', 2200, 1.5); noise(.3, .18, 'lowpass', 700, 1, .05); voice(.25, .4, 180, 120, .02, 900); },
    glass(x, y) { const v = at(x, y); noise(.5 * v, .5, 'highpass', 3500, .8); for (let k = 0; k < 7; k++) tone(.08 * v, .18 + Math.random() * .2, 'triangle', 2500 + Math.random() * 3000, null, .02 + Math.random() * .3); },
    knock(x, y) { if (!ok('knock', 140)) return; const v = at(x, y); tone(.35 * v, .14, 'sine', 120 + Math.random() * 30, 60); noise(.25 * v, .1, 'lowpass', 700, 1); },
    wood(x, y) { const v = at(x, y); noise(.4 * v, .25, 'bandpass', 500, 2, 0, .004); tone(.2 * v, .2, 'triangle', 180, 90); },
    hammer() { for (let k = 0; k < 3; k++) { tone(.3, .07, 'square', 900 + k * 40, 400, k * .32); noise(.25, .08, 'bandpass', 2500, 2, k * .32); tone(.15, .1, 'sine', 160, 100, k * .32); } },
    door(open) { noise(.18, .5, 'bandpass', open ? 900 : 700, 9, 0, .08, open ? 1300 : 450); tone(.25, .1, 'sine', 90, 55, open ? .45 : .4); },
    rustle() { if (!ok('rustle', 90)) return; for (let k = 0; k < 4; k++) noise(.09, .1, 'bandpass', 3000 + Math.random() * 2000, 1.2, k * .07); },
    eat() { for (let k = 0; k < 4; k++) noise(.16, .07, 'bandpass', 1200 + Math.random() * 800, 2, k * .18); },
    drink() { for (let k = 0; k < 4; k++) tone(.14, .1, 'sine', 300 + k * 30, 600 + k * 40, k * .22, .01); },
    sizzle() { noise(.14, 2.2, 'highpass', 4000, .5, 0, .3); for (let k = 0; k < 10; k++) noise(.06, .03, 'highpass', 5000, .5, Math.random() * 2); },
    craft() { this.hammer(); },
    fireUp() { noise(.3, .8, 'lowpass', 900, .7, 0, .1, 300); },
    equip() { tone(.12, .08, 'triangle', 1500, 900); noise(.08, .06, 'bandpass', 3000, 2, .03); },
    moan(z) { const v = at(z.x, z.y); if (v < .05 || !ok('moan', 700)) return; const f = (z.pal.b === 'f' ? 190 : z.pal.b === 'h' ? 85 : 120) * (.85 + Math.random() * .3); voice(.22 * v, 1 + Math.random() * .9, f, f * .6, 0, 450 + Math.random() * 400); },
    growl(z) { const v = at(z.x, z.y); if (!ok('growl', 300)) return; const f = z.pal.b === 'f' ? 170 : 105; voice(.3 * v, .45, f * 1.2, f * .8, 0, 800); },
    crackle(x, y) { const v = at(x, y); if (v < .05) return; noise(.12 * v, .02, 'highpass', 2500, .5); if (Math.random() < .3) noise(.18 * v, .04, 'bandpass', 900, 2, .01); },
    alarm(x, y) { const v = at(x, y); for (let k = 0; k < 6; k++) { tone(.16 * v, .05, 'square', 2600, null, k * .07); tone(.12 * v, .05, 'square', 3100, null, k * .07 + .035); } },
    radio() { noise(.18, .35, 'bandpass', 1800, .6, 0, .02); for (let k = 0; k < 5; k++) tone(.05, .08, 'sawtooth', 300 + Math.random() * 500, null, .3 + k * .09); },
    pickup() { this.rustle(); },
    thunder(v) { noise(.7 * v, 2.2, 'lowpass', 140, .8, 0, .05, 60); noise(.4 * v, .4, 'lowpass', 600, 1, 0, .01); tone(.3 * v, 1.6, 'sine', 45, 30, .05, .05); },
    horn() { tone(.22, .5, 'square', 392, null, 0, .02); tone(.18, .5, 'square', 494, null, 0, .02); },
    caw(x, y) { const v = Math.max(.25, at(x, y)); for (let k = 0; k < 3; k++) voice(.16 * v, .2, 950 + Math.random() * 200, 640, k * .22 + Math.random() * .05, 1700); for (let k = 0; k < 8; k++) noise(.05 * v, .06, 'bandpass', 700, 1.5, k * .05); },
    shots() { const n = 1 + Math.floor(Math.random() * 4); for (let k = 0; k < n; k++) { const d = k * (.18 + Math.random() * .5); noise(.22, .18, 'lowpass', 1300, .8, d, .002, 220); noise(.1, 1.1, 'lowpass', 260, .6, d + .06, .08); } },
    scream() { voice(.12, 1.3, 760, 420, 0, 1300); voice(.06, .8, 900, 500, 1.1, 1500); },
    dog() { const n = 2 + Math.floor(Math.random() * 3); for (let k = 0; k < n; k++) { voice(.13, .16, 520, 360, k * .32, 1100); noise(.05, .1, 'bandpass', 800, 2, k * .32); } },
    siren() { for (let k = 0; k < 3; k++) { tone(.045, 1.1, 'sawtooth', 620, 1180, k * 2.2, .2); tone(.045, 1.1, 'sawtooth', 1180, 620, k * 2.2 + 1.1, .05); } },
    boom() { noise(.45, 2.6, 'lowpass', 120, .7, 0, .02, 50); tone(.3, 1.8, 'sine', 50, 28, 0, .02); },
    sneeze() { noise(.12, .05, 'bandpass', 1800, 2); voice(.16, .35, 520, 300, .04, 1500); noise(.2, .25, 'highpass', 2600, .8, .1, .01); },
    carAlarm(x, y) { const v = Math.max(.12, at(x, y)); tone(.13 * v, .26, 'square', 720, 1450, 0, .01); tone(.1 * v, .24, 'square', 1450, 760, .27, .01); },
    engine(k) { tone(.07 + .05 * k, .13, 'sawtooth', 48 + k * 70 + Math.random() * 3, null, 0, .02); noise(.03 + .03 * k, .1, 'lowpass', 220 + k * 400, 1); },
    fizz(x, y) { const v = at(x, y); noise(.12 * v, 1.2, 'highpass', 3000, .5, 0, .05); },
    heli(v) { if (v < .02) return; noise(.5 * v, .07, 'lowpass', 160, 1.2, 0, .004); tone(.25 * v, .06, 'sine', 70, 45); noise(.06 * v, .05, 'highpass', 2500, .5); },
    gen(x, y) { const v = at(x, y); if (v < .03) return; tone(.06 * v, .15, 'sawtooth', 58 + Math.random() * 4, null, 0, .02); noise(.04 * v, .14, 'lowpass', 300, 1); },
    heart(k) { tone(.25 * k, .1, 'sine', 55, 40); tone(.18 * k, .1, 'sine', 50, 38, .16); },
    gun(big) { noise(big ? .95 : .8, big ? .5 : .32, 'lowpass', big ? 900 : 1600, .7, 0, .001, 120); noise(big ? .5 : .4, .06, 'highpass', 2500, .5); tone(big ? .5 : .35, .25, 'sine', big ? 70 : 110, 35); noise(.18, 1.4, 'lowpass', 300, .5, .05, .05); },
    click() { tone(.15, .03, 'square', 2200, null); noise(.08, .03, 'highpass', 4000, .6, .01); },
    reload() { for (let k = 0; k < 3; k++) { tone(.12, .04, 'square', 1500 - k * 200, null, k * .25); noise(.1, .05, 'bandpass', 3000, 2, k * .25); } tone(.18, .06, 'square', 900, 600, .8); },
    clang(x, y) { if (!ok('clang', 160)) return; const v = at(x, y); tone(.3 * v, .35, 'triangle', 620 + Math.random() * 80, 540); tone(.16 * v, .5, 'sine', 1240, 1100, .01); noise(.2 * v, .1, 'bandpass', 2500, 3); },
    shriek(z) { const v = at(z.x, z.y); if (!ok('shriek', 900)) return; voice(.32 * v, .7, 420, 260, 0, 1400); voice(.2 * v, .5, 600, 300, .25, 1700); },
    ambient(rainV, night, inside) {
      if (!ac) return;
      if (P && P._inShower) rainV = Math.max(rainV, 1);                      // в душе шумит вода
      const t = ac.currentTime, v = vol();
      rainG.gain.setTargetAtTime((settings.rain ? rainV : 0) * (inside ? .05 : .11) * v, t, .5);
      rainF.frequency.setTargetAtTime(inside ? 700 : 2400, t, .4);
      windG.gain.setTargetAtTime((.02 + night * .03) * v, t, 1);
    },
  };
})();
addEventListener('pointerdown', () => SFX.init(), {passive:true});
addEventListener('keydown', () => SFX.init());

// ---- procedural props: quarantine fence, concrete blocks, sandbags, booth, signs, fuel pumps ----
function planeText(x0, y0, ax, len, zTop, lines, col, px) {
  // text on a vertical plane; reads left-to-right on screen
  const sx = ax === 'x' ? SX(x0, y0) : SX(x0, y0 + len), sy = ax === 'x' ? SY(x0, y0, zTop) : SY(x0, y0 + len, zTop);
  ctx.setTransform(DPR, DPR * (ax === 'x' ? .5 : -.5), 0, DPR, DPR * sx, DPR * sy);
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((t, k) => { ctx.font = (k ? '600 ' : '700 ') + (k ? px * .62 : px) + 'px Oswald, "Arial Narrow", sans-serif'; ctx.fillText(t, len * U / 2, px * .7 + k * px * 1.05, len * U - 4); });
  resetT();
}
function board(x0, y0, ax, len, z0, z1, bg, edge) {
  const x1 = ax === 'x' ? x0 + len : x0, y1 = ax === 'x' ? y0 : y0 + len;
  poly4(x0, y0, z0, x1, y1, z0, x1, y1, z1, x0, y0, z1, edge);
  const ix0 = ax === 'x' ? x0 + .04 : x0, iy0 = ax === 'x' ? y0 : y0 + .04, ix1 = ax === 'x' ? x1 - .04 : x1, iy1 = ax === 'x' ? y1 : y1 - .04;
  poly4(ix0, iy0, z0 + 1.2, ix1, iy1, z0 + 1.2, ix1, iy1, z1 - 1.2, ix0, iy0, z1 - 1.2, bg);
}
const shadeHex = (hex, f) => { const n = parseInt(hex.slice(1), 16); return C([(n >> 16) & 255, (n >> 8) & 255, n & 255], f); };
function drawFence(p, f) {
  const H = 34, x = Math.floor(p.cx), y = Math.floor(p.cy);
  const a0 = p.ax === 'x' ? [x, y + .5] : [x + .5, y], a1 = p.ax === 'x' ? [x + 1, y + .5] : [x + .5, y + 1];
  // mesh
  const dx = a1[0] - a0[0], dy = a1[1] - a0[1];
  ctx.strokeStyle = C([168, 176, 182], f, .55); ctx.lineWidth = .5; ctx.beginPath();
  const segC = (ua, za, ub, zb) => {
    let t0 = 0, t1 = 1; const du = ub - ua;
    if (Math.abs(du) > 1e-9) { const ta = (0 - ua) / du, tb = (1 - ua) / du; t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb)); }
    if (t1 <= t0) return;
    const u0 = ua + du * t0, u1 = ua + du * t1, z0 = za + (zb - za) * t0, z1 = za + (zb - za) * t1;
    ctx.moveTo(SX(a0[0] + dx * u0, a0[1] + dy * u0), SY(a0[0] + dx * u0, a0[1] + dy * u0, z0));
    ctx.lineTo(SX(a0[0] + dx * u1, a0[1] + dy * u1), SY(a0[0] + dx * u1, a0[1] + dy * u1, z1));
  };
  for (let k = -4; k <= 10; k++) { const u = k / 6; segC(u, 1, u + .5, H); segC(u, 1, u - .5, H); }
  ctx.stroke();
  // rails + barbed wire
  ctx.strokeStyle = C([120, 126, 132], f); ctx.lineWidth = .9; ctx.beginPath();
  for (const z of [1, H]) { ctx.moveTo(SX(a0[0], a0[1]), SY(a0[0], a0[1], z)); ctx.lineTo(SX(a1[0], a1[1]), SY(a1[0], a1[1], z)); }
  ctx.stroke();
  ctx.strokeStyle = C([90, 92, 96], f); ctx.lineWidth = .6; ctx.beginPath();
  for (let q = 0; q < 8; q++) { const u = q / 8, px = a0[0] + dx * u, py = a0[1] + dy * u, zz = H + 3 + (q % 2) * 2.5; q ? ctx.lineTo(SX(px, py), SY(px, py, zz)) : ctx.moveTo(SX(px, py), SY(px, py, zz)); }
  ctx.stroke();
  // post
  box(a0[0] - .05, a0[1] - .05, a0[0] + .05, a0[1] + .05, 0, H + 6, [92, 96, 100], f);
  if (p.sign) {
    const ax = p.ax, sx0 = ax === 'x' ? x + .18 : x + .5, sy0 = ax === 'x' ? y + .5 : y + .18;
    board(sx0, sy0, ax, .64, 13, 27, shadeHex('#e7c531', f), C([30, 26, 20], f));
    if (f > .3) planeText(sx0, sy0, ax, .64, 27, ['КАРАНТИН'], C([24, 20, 16], f), 7.5);
  }
}
// процедурная вещь мира (забор, генератор, грядка…); готовые — из кэша спрайтов (PROC_CACHE)
function drawProc(p, f) {
  if (baking || !PROC_CACHE.has(p.type)) return drawProcRaw(p, f);
  if (!p._sid) p._sid = ++procSid;
  const x = Math.floor(p.cx), y = Math.floor(p.cy), fq = Math.round(f * 20) / 20;
  sprite('Q' + p._sid, p.type + '|' + fq + '|' + (p.dug ? 1 : 0) + '|' + (p.sign ? 1 : 0), x, y, -U - 6, -78, U + 6, 2 * hh + 6, () => drawProcRaw(p, fq));
}
function drawProcRaw(p, f) {
  if (p.type === 'pfence') {
    const x = Math.floor(p.cx), y = Math.floor(p.cy), c = PF_COL[p.st || 0], X = p.ax === 'x';
    const a0 = X ? [x, y + .5] : [x + .5, y], d = X ? [1, 0] : [0, 1], t = .035;
    if (p.st === 3) {                                                       // профлист
      box(X ? x : x + .5 - t, X ? y + .5 - t : y, X ? x + 1 : x + .5 + t, X ? y + .5 + t : y + 1, 0, 22, c, f);
      return;
    }
    box(a0[0] - .05, a0[1] - .05, a0[0] + .05, a0[1] + .05, 0, 17, [c[0] * .8, c[1] * .8, c[2] * .8], f);
    for (const z of [5, 12]) box(X ? x : x + .5 - t, X ? y + .5 - t : y, X ? x + 1 : x + .5 + t, X ? y + .5 + t : y + 1, z, z + 1.6, c, f);
    for (let k = 1; k < 5; k++) { const u = k / 5, px = a0[0] + d[0] * u, py = a0[1] + d[1] * u; box(px - .045, py - .045, px + .045, py + .045, 0, 15 + (k % 2) * 1.5, c, f); }
    return;
  }
  if (p.type === 'veg') {
    const x = Math.floor(p.cx), y = Math.floor(p.cy);
    box(x + .06, y + .06, x + .94, y + .94, 0, 1.5, [86, 64, 44], f);
    if (!p.dug) for (let k = 0; k < 3; k++) { const yy = y + .22 + k * .28, g = p.v === 2 ? [96, 140, 70] : p.v === 1 ? [70, 128, 64] : [84, 120, 58]; for (let q = 0; q < 3; q++) { const xx = x + .22 + q * .28; box(xx - .07, yy - .05, xx + .07, yy + .05, 1.5, p.v === 2 ? 5 : 4, g, f); } }
    else for (let k = 0; k < 3; k++) { const yy = y + .22 + k * .28; box(x + .15, yy - .04, x + .85, yy + .04, 1.5, 2, [64, 46, 32], f); }
    return;
  }
  if (PROCS[p.type]) return PROCS[p.type](p, f);                            // свои виды механик (defProc)
  const [x0, y0, x1, y1] = p.r;
  switch (p.type) {
    case 'fence': return drawFence(p, f);
    case 'gen': return drawGen(p, f);
    case 'gbed': return drawGbed(p, f);
    case 'trap': return drawTrap(p, f);
    case 'lure': return drawLure(p, f);
    case 'jersey':
      box(x0, y0, x1, y1, 0, 16, [178, 176, 168], f); box(x0, y0, x1, y1, 10, 13, [196, 58, 46], f);
      return;
    case 'sandbag':
      for (let r = 0; r < 3; r++) { const z = r * 5, ins = r * .06; box(x0 + ins, y0 + ins, x1 - ins, y1 - ins, z, z + 5, r % 2 ? [150, 134, 96] : [138, 124, 88], f); }
      return;
    case 'booth':
      box(x0, y0, x1, y1, 0, 40, [92, 108, 78], f);
      box(x0, y0, x1, y1, 24, 33, [40, 52, 60], f * .9);
      box(x0 - .08, y0 - .08, x1 + .08, y1 + .08, 40, 44, [66, 78, 58], f);
      return;
    case 'pump':
      box(x0 - .05, y0 - .05, x1 + .05, y1 + .05, 0, 3, [120, 122, 126], f);
      box(x0, y0, x1, y1, 3, 30, [196, 52, 42], f);
      box(x0 + .03, y0 + .03, x1 - .03, y1 - .03, 30, 33, [236, 236, 230], f);
      poly4(x0 + .06, y1 + .001, 18, x1 - .06, y1 + .001, 18, x1 - .06, y1 + .001, 26, x0 + .06, y1 + .001, 26, C([30, 40, 44], f));
      return;
    case 'qsign': {
      const ax = p.ax, len = 2.1, bx = ax === 'x' ? p.cx - len / 2 : p.cx, by = ax === 'x' ? p.cy : p.cy - len / 2;
      const pa = ax === 'x' ? [bx + .15, by] : [bx, by + .15], pb = ax === 'x' ? [bx + len - .15, by] : [bx, by + len - .15];
      for (const q of [pa, pb]) box(q[0] - .04, q[1] - .04, q[0] + .04, q[1] + .04, 0, 18, [70, 72, 76], f);
      board(bx, by, ax, len, 18, 52, shadeHex('#f2efe6', f), shadeHex('#c4312a', f));
      if (f > .3) planeText(bx, by, ax, len, 51, ['КАРАНТИН', 'ПРОЕЗД ЗАКРЫТ'], shadeHex('#b3271f', f), 13);
      return;
    }
  }
}
function drawShopSign(Hs, a) {
  const sg = Hs.sign; if (!sg) return;
  const f = fogAt(Math.floor((Hs.ix0 + Hs.ix1) / 2), Math.floor(Hs.iy1 + 1));
  const east = Hs.doors.length && Hs.doors[0].s === 3 && !Hs.doors.some(d => d.s === 1);
  const ax = east ? 'y' : 'x', span = east ? Hs.iy1 - Hs.iy0 : Hs.ix1 - Hs.ix0, len = Math.min(span - .6, Math.max(2.6, sg.text.length * .58));
  const bx = east ? Hs.ix1 + .32 : (Hs.ix0 + Hs.ix1) / 2 - len / 2, by = east ? (Hs.iy0 + Hs.iy1) / 2 - len / 2 : Hs.iy1 + .32;
  const z0 = WH + 2, z1 = WH + 25;
  if (a < 1) ctx.globalAlpha = a;
  board(bx, by, ax, len, z0, z1, shadeHex(sg.bg, Math.max(f, .35)), C([28, 26, 24], f));
  planeText(bx, by, ax, len, z1, [sg.text], shadeHex(sg.fg, Math.max(f, .4)), 15);
  if (sg.cross) { const cx = ax === 'x' ? bx - .4 : bx, cy = ax === 'x' ? by : by + len + .4 - .8; board(cx, cy, ax, .36, z0 + 1, z1 - 1, shadeHex('#2f8a4a', Math.max(f, .35)), C([28, 26, 24], f)); planeText(cx, cy, ax, .36, z1 - 1, ['+'], '#fff', 20); }
  ctx.globalAlpha = 1;
}
function drawCarExtras(p, f) {
  if (p.police) {
    const on = Math.floor(animT * 5) % 2, zx = SX(p.cx, p.cy), zy = SY(p.cx, p.cy, 25);
    ctx.fillStyle = C([30, 30, 34], f); ctx.fillRect(zx - 5, zy - 1, 10, 3);
    ctx.fillStyle = on ? '#ff3b30' : '#6a1a16'; ctx.fillRect(zx - 4.5, zy - 1.5, 4, 2);
    ctx.fillStyle = on ? '#1c3f8a' : '#3d7bff'; ctx.fillRect(zx + .5, zy - 1.5, 4, 2);
    if (lightLevel() < .7) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(zx, zy, 0, zx, zy, 22); g.addColorStop(0, on ? 'rgba(255,60,50,.35)' : 'rgba(60,110,255,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(zx, zy, 22, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  }
  if (p.army) {
    const back = p.flip ? 1 : -1;
    if (p.dir === 'x') { const xa = p.cx + back * .05, xb = p.cx + back * .92; box(Math.min(xa, xb), p.cy - .4, Math.max(xa, xb), p.cy + .4, 12, 36, [86, 100, 70], f); }
    else { const ya = p.cy + back * .05, yb = p.cy + back * .92; box(p.cx - .4, Math.min(ya, yb), p.cx + .4, Math.max(ya, yb), 12, 36, [86, 100, 70], f); }
  }
}
