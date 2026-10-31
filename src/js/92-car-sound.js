// ================= звук машины: мотор и гудок =================
// Мотор — один непрерывный голос, пока заведён (раньше — короткие писки каждые 0.11 с):
//   основной тон вспышек f0 (пила + пила на октаву выше + квадрат на октаву ниже) через фильтр низких частот,
//   пульсация громкости с частотой вспышек, шум выхлопа. Обороты — от скорости по передачам и от газа (p.thr, 26-driving):
//   при разгоне слышно, как обороты растут и падают на переключении. Заводка — стартер ~0.7 с, глушение — плавное затухание.
// Гудок — два тона в терцию (как у настоящих машин) с хрипотцой, через полосовой фильтр.
const ENG = {on:false, nodes:null, rpm:.15, crank:0, car:null, gain:0};
const ENG_GEARS = [0, 2.2, 4.4, 6.6, 9];                                     // границы передач по скорости (клеток/с)
function engNodes() {
  const ac = SFX.ac, out = SFX.out; if (!ac || !out) return null;
  const mk = (type, f) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; return o; };
  // тон вспышек и гармоники ×2 и ×3: динамик телефона не играет ниже ~100 Гц, «урчание» слышно по гармоникам
  const o1 = mk('sawtooth', 45), o2 = mk('sawtooth', 90), o3 = mk('square', 135);
  const g1 = ac.createGain(), g2 = ac.createGain(), g3 = ac.createGain(); g1.gain.value = .5; g2.gain.value = .45; g3.gain.value = .18;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; lp.Q.value = 1.4;
  const body = ac.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 260; body.Q.value = 1.1; body.gain.value = 7;   // «бочка» глушителя
  const pulse = ac.createGain(); pulse.gain.value = .6;                       // пульсация вспышек: громкость качается с частотой f0/2
  const lfo = mk('sine', 20), lfoG = ac.createGain(); lfoG.gain.value = .35; lfo.connect(lfoG); lfoG.connect(pulse.gain);
  const ns = ac.createBufferSource(); { const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; ns.buffer = b; ns.loop = true; }
  const nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 180; nf.Q.value = .9;
  const ng = ac.createGain(); ng.gain.value = .25;
  const master = ac.createGain(); master.gain.value = 0;
  o1.connect(g1); o2.connect(g2); o3.connect(g3); g1.connect(lp); g2.connect(lp); g3.connect(lp); lp.connect(body); body.connect(pulse);
  ns.connect(nf); nf.connect(ng); ng.connect(pulse); pulse.connect(master); master.connect(out);
  const t = ac.currentTime; for (const n of [o1, o2, o3, lfo, ns]) n.start(t);
  return {o1, o2, o3, lp, body, lfo, nf, ng, master, all:[o1, o2, o3, lfo, ns]};
}
function engStop() {
  const n = ENG.nodes; ENG.nodes = null; ENG.on = false; if (!n || !SFX.ac) return;
  const t = SFX.ac.currentTime; n.master.gain.cancelScheduledValues(t); n.master.gain.setTargetAtTime(0, t, .12);
  for (const o of n.all) try { o.stop(t + .8); } catch (e) {}
}
// стартер: жужжание с рывками ~0.7 с перед тем, как мотор схватит
function engCrank() {
  const ac = SFX.ac, out = SFX.out; if (!ac || !out) return;
  const t = ac.currentTime, v = SFX.vol();
  const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(130, t + .65);
  const am = ac.createOscillator(); am.frequency.value = 11; const amG = ac.createGain(); amG.gain.value = .5;
  const g = ac.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.16 * v, t + .05); g.gain.setValueAtTime(.16 * v, t + .6); g.gain.linearRampToValueAtTime(.0001, t + .75);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  am.connect(amG); amG.connect(g.gain); o.connect(lp); lp.connect(g); g.connect(out);
  o.start(t); am.start(t); o.stop(t + .8); am.stop(t + .8);
}
// в игре (onUpdate): заведена ли машина героя, заводка, обороты. Громкость ставит onDraw ниже: на паузе и в меню
// update не идёт, а звук должен стихнуть — и не заводиться заново после паузы
onUpdate(dt => {
  const p = P && P.car, run = !!(p && p.engine && p.fuel > 0 && p.hp > 0);
  if (!run) { if (ENG.on) engStop(); ENG.car = p || null; return; }
  if (!SFX.ac) return;
  if (!ENG.on || ENG.car !== p) {
    if (ENG.on) engStop();
    ENG.on = true; ENG.car = p; ENG.crank = .7; ENG.rpm = .12; engCrank();
  }
  if (ENG.crank > 0) { ENG.crank -= dt; if (ENG.crank > 0) return; }
  if (!ENG.nodes) ENG.nodes = engNodes(); const n = ENG.nodes; if (!n) return;
  // обороты: внутри передачи растут со скоростью, на переключении падают; газ поднимает, сброс — опускает
  const sp = Math.abs(p.v || 0); let g = 1; while (g < ENG_GEARS.length - 1 && sp > ENG_GEARS[g]) g++;
  const lo = ENG_GEARS[g - 1], hi = ENG_GEARS[g], inGear = Math.min(1, (sp - lo) / (hi - lo));
  const thr = Math.abs(p.thr || 0), target = sp < .15 ? .12 + thr * .3 : .25 + inGear * .55 + thr * .15;
  ENG.rpm += (target - ENG.rpm) * Math.min(1, dt * (target > ENG.rpm ? 3.5 : 5));
  const r = ENG.rpm, f0 = 38 + r * 125, t = SFX.ac.currentTime, k = .06;
  n.o1.frequency.setTargetAtTime(f0, t, k); n.o2.frequency.setTargetAtTime(f0 * 2.01, t, k); n.o3.frequency.setTargetAtTime(f0 * 3.02, t, k);
  n.lfo.frequency.setTargetAtTime(f0 / 2, t, k);
  n.lp.frequency.setTargetAtTime(420 + r * 1500 + thr * 500, t, k); n.body.frequency.setTargetAtTime(200 + r * 260, t, k);
  n.nf.frequency.setTargetAtTime(260 + r * 600, t, k); n.ng.gain.setTargetAtTime(.14 + thr * .22, t, k);
  ENG.gain = (.16 + r * .12 + thr * .06) * SFX.vol();
});
onDraw(() => {
  const n = ENG.nodes; if (!n || !SFX.ac) return;
  const live = mode === 'play' && !(typeof paused !== 'undefined' && paused) && P && P.car === ENG.car;
  n.master.gain.setTargetAtTime(live ? ENG.gain : 0, SFX.ac.currentTime, .08);
});
