// ================= звук машины: мотор, стартер, гудок (v82) =================
// Всё готовится один раз в буферы (при первой заводке), дальше только проигрывается — почти не стоит процессора:
//   мотор — петля 0.5 с: 20 вспышек цилиндров (затухающий хлопок с гулом) + ровный низкий гул. Играет по кругу через
//     один фильтр и одну громкость; обороты — скорость проигрывания (вместе растут частота хлопков и тон, как у мотора);
//     параметры меняются 10 раз в секунду, а не каждый кадр (раньше: пять генераторов, шум, три фильтра, ~10 изменений за кадр);
//   стартер — 0.7 с медленных хлопков с жужжанием; гудок — два тона в терцию с хрипотцой, 0.55 с.
// Обороты — от скорости по передачам (ENG_GEARS) и от газа (p.thr, 26-driving). На паузе и в меню звук стихает (onDraw).
const ENG = {on:false, src:null, lp:null, gain:null, rpm:.15, crank:0, car:null, vol:0, buf:null, crankBuf:null, hornBuf:null, tUp:0};
const ENG_GEARS = [0, 2.2, 4.4, 6.6, 9];                                     // границы передач по скорости (клеток/с)
const ENG_F = 40;                                                            // частота вспышек в петле (холостые — скорость 1)

function engBuffers() {
  const ac = SFX.ac; if (!ac || ENG.buf) return !!ENG.buf;
  const sr = ac.sampleRate, rnd = mulberry32(7);
  const mk = (sec, fn) => { const n = Math.round(sec * sr), b = ac.createBuffer(1, n, sr), d = b.getChannelData(0); fn(d, n); let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i])); if (pk) for (let i = 0; i < n; i++) d[i] *= .9 / pk; return b; };
  // мотор: целое число вспышек — петля без щелчка на стыке
  ENG.buf = mk(20 / ENG_F, (d, n) => {
    const cyc = sr / ENG_F; let lp = 0;
    const amp = []; for (let k = 0; k < 20; k++) amp.push(.75 + rnd() * .35);    // цилиндры чуть разные — живее
    for (let i = 0; i < n; i++) {
      const k = Math.floor(i / cyc), t = (i - k * cyc) / sr, T = i / sr;
      lp += ((rnd() * 2 - 1) - lp) * .18;                                        // шум выхлопа (мягкий)
      const env = Math.exp(-t / .0075) * amp[k];
      const pop = env * (.65 * Math.sin(2 * Math.PI * 150 * t) + .45 * Math.sin(2 * Math.PI * 300 * t + 1) + .55 * lp);   // хлопок: телефон играет от ~100 Гц
      const hum = .06 * Math.sin(2 * Math.PI * ENG_F * T) + .12 * Math.sin(2 * Math.PI * ENG_F * 3 * T + .5) + .07 * Math.sin(2 * Math.PI * ENG_F * 5 * T);
      d[i] = Math.tanh((pop + hum) * 1.6);
    }
  });
  // стартер: жужжание моторчика и редкие тугие хлопки
  ENG.crankBuf = mk(.7, (d, n) => {
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const T = i / sr, f = 11 + T * 6, ph = (T * f) % 1;
      lp += ((rnd() * 2 - 1) - lp) * .12;
      const whine = .25 * Math.sin(2 * Math.PI * (110 + T * 40) * T) * (.6 + .4 * Math.sin(2 * Math.PI * f * T));
      d[i] = (whine + Math.exp(-ph / .06) * .5 * lp) * Math.min(1, T * 20) * Math.min(1, (.7 - T) * 12);
    }
  });
  // гудок: две пилы в терцию (370 и 466 Гц), по 10 гармоник, лёгкий дребезг, перегруз
  ENG.hornBuf = mk(.55, (d, n) => {
    for (let i = 0; i < n; i++) {
      const T = i / sr, wob = 1 + .004 * Math.sin(2 * Math.PI * 31 * T); let s = 0;
      for (const [f, k] of [[370, 1], [466, .85]]) for (let h = 1; h <= 10; h++) s += k * Math.sin(2 * Math.PI * f * h * wob * T) / h * (h > 4 ? .6 : 1);
      d[i] = Math.tanh(s * .7) * Math.min(1, T * 60) * Math.min(1, (.55 - T) * 25);
    }
  });
  return true;
}
function playBuf(b, v, rate) {
  const ac = SFX.ac, out = SFX.out; if (!ac || !out || !b) return;
  const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = b; s.playbackRate.value = rate || 1; g.gain.value = v * SFX.vol();
  s.connect(g); g.connect(out); s.start(); s.onended = () => { try { g.disconnect(); } catch (e) {} };
}
function carHorn() { if (engBuffers()) playBuf(ENG.hornBuf, .55); }            // SFX.horn (22-sound)
function engStart() {
  const ac = SFX.ac; if (!ac || !engBuffers()) return;
  const s = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = ENG.buf; s.loop = true; s.playbackRate.value = 1;
  lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = .8; g.gain.value = 0;
  s.connect(lp); lp.connect(g); g.connect(SFX.out); s.start();
  ENG.src = s; ENG.lp = lp; ENG.gain = g;
}
function engStop() {
  const s = ENG.src, g = ENG.gain; ENG.src = ENG.lp = ENG.gain = null; ENG.on = false;
  if (!s || !SFX.ac) return;
  const t = SFX.ac.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, .12);
  try { s.stop(t + .7); } catch (e) {}
}
// в игре: заведена ли машина героя, заводка, обороты (параметры звука — 10 раз в секунду)
onUpdate(dt => {
  const p = P && P.car, run = !!(p && p.engine && p.fuel > 0 && p.hp > 0);
  if (!run) { if (ENG.on) engStop(); ENG.car = p || null; return; }
  if (!SFX.ac) return;
  if (!ENG.on || ENG.car !== p) {
    if (ENG.on) engStop();
    ENG.on = true; ENG.car = p; ENG.crank = .65; ENG.rpm = .1;
    if (engBuffers()) playBuf(ENG.crankBuf, .5);
  }
  if (ENG.crank > 0) { ENG.crank -= dt; if (ENG.crank > 0) return; }
  if (!ENG.src) engStart(); if (!ENG.src) return;
  // обороты: внутри передачи растут со скоростью, на переключении падают; газ поднимает
  const sp = Math.abs(p.v || 0); let g = 1; while (g < ENG_GEARS.length - 1 && sp > ENG_GEARS[g]) g++;
  const inGear = Math.min(1, (sp - ENG_GEARS[g - 1]) / (ENG_GEARS[g] - ENG_GEARS[g - 1]));
  const thr = Math.abs(p.thr || 0), target = sp < .15 ? .1 + thr * .3 : .25 + inGear * .55 + thr * .15;
  ENG.rpm += (target - ENG.rpm) * Math.min(1, dt * (target > ENG.rpm ? 3.5 : 5));
  ENG.vol = (.42 + ENG.rpm * .3 + thr * .12) * SFX.vol();
  ENG.tUp -= dt; if (ENG.tUp > 0) return; ENG.tUp = .1;
  const t = SFX.ac.currentTime, r = ENG.rpm;
  ENG.src.playbackRate.setTargetAtTime(.95 + r * 2.4, t, .08);                  // 38 → 134 вспышек в секунду
  ENG.lp.frequency.setTargetAtTime(600 + r * 2200 + thr * 500, t, .08);
});
onDraw(() => {
  if (!ENG.gain || !SFX.ac) return;
  const live = mode === 'play' && !paused && P && P.car === ENG.car;
  const v = live ? ENG.vol : 0; if (ENG._lastV != null && Math.abs(ENG._lastV - v) < .01) return;
  ENG._lastV = v; ENG.gain.gain.setTargetAtTime(v, SFX.ac.currentTime, .1);
});
