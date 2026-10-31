// ================= звук машины: мотор, стартер, гудок (v83) =================
// Как в играх с записанным мотором, только записи готовим сами, один раз при первой заводке (~30 мс):
//   мотор — 8 петель по ~1 с на разных оборотах (850…5600 об/мин). Каждая — вспышки цилиндров (4 цилиндра, чуть разные,
//     с дрожанием), пропущенные через «выхлопную трубу»: набор резонансов 70–1000 Гц. Резонансы у всех петель одинаковые,
//     меняется только частота вспышек — поэтому на высоких оборотах звучит мотор, а не ускоренная пластинка (v82 разгонял
//     одну петлю — тон трубы задирался вместе с оборотами, отсюда «пылесос»). Играют только две соседние петли,
//     плавно сменяя друг друга; скорость проигрывания подгоняет обороты между ними (не больше ±15%);
//   стартер — жужжание стартера, которое проседает на тактах сжатия, затем мотор «схватывает» и чуть подгазовывает;
//   гудок — два электрических клаксона (≈ 415 и 520 Гц): дребезжащая мембрана через раструб (форманты 1–3.4 кГц);
//     зажал кнопку — гудит, пока держишь (и шумит на всю округу: мертвецы сходятся).
// Параметры звука меняются 20 раз в секунду, не каждый кадр. Буферы — 22 кГц: для мотора этого с запасом, вдвое легче.
// Обороты — от скорости по передачам (ENG_GEARS) и от газа (p.thr, 26-driving). На паузе и в меню звук стихает (onDraw).
const ENG = {on:false, lp:null, gain:null, rpm:.15, crank:0, car:null, vol:0, loops:null, crankBuf:null, hornBuf:null, horn:null, tUp:0, act:new Map()};
const ENG_GEARS = [0, 2.2, 4.4, 6.6, 9];                                     // границы передач по скорости (клеток/с)
const ENG_RPM = [850, 1100, 1450, 1900, 2500, 3300, 4300, 5600];             // обороты петель (шаг ×1.3)
const ENG_SR = 22050;

// ---- синтез (чистые функции: Float32Array) ----
// резонатор: полосовой фильтр (RBJ, постоянное усиление в пике)
function sndBP(f, q, sr) {
  const w = 2 * Math.PI * f / sr, al = Math.sin(w) / (2 * q), a0 = 1 + al;
  return {b0:al / a0, b2:-al / a0, a1:-2 * Math.cos(w) / a0, a2:(1 - al) / a0, x1:0, x2:0, y1:0, y2:0};
}
function sndRun(F, x) { const y = F.b0 * x + F.b2 * F.x2 - F.a1 * F.y1 - F.a2 * F.y2; F.x2 = F.x1; F.x1 = x; F.y2 = F.y1; F.y1 = y; return y; }
function sndNorm(d, pk) { let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); if (m) for (let i = 0; i < d.length; i++) d[i] *= pk / m; return d; }
// «выхлоп»: резонансы трубы и глушителя, общие для мотора и стартера
const ENG_RES = [[72, 1.6, .35], [150, 3, .5], [235, 5, .55], [410, 4, .6], [640, 3, .5], [1000, 2.5, .35], [1650, 2, .15]];   // телефон играет от ~250 Гц — середина важнее баса
function engExhaust(sr) { return ENG_RES.map(([f, q, g]) => Object.assign(sndBP(f, q, sr), {g})); }
function engVoice(bank, ex, st) {                                           // вспышка → труба → лёгкий перегруз
  let s = 0; for (const F of bank) s += sndRun(F, ex) * F.g;
  st.lp += (ex - st.lp) * .25; s += st.lp * .18;                             // механический стук (прямой звук мотора)
  st.dc += (s - st.dc) * .004; return Math.tanh((s - st.dc) * 2.2);
}
// петля мотора на rpm оборотах: целое число рабочих циклов (два оборота), прогоняем дважды — стык без щелчка
function genEngineLoop(rpm, sr, seed) {
  const rnd = mulberry32(seed), cyc = 120 / rpm, nc = Math.max(4, Math.round(1 / cyc)), n = Math.round(nc * cyc * sr);
  const fire = new Float32Array(n), amp = [1, .82, .94, .77];                // 4 цилиндра, порядок 1-3-4-2, чуть неровные
  for (let c = 0; c < nc; c++) for (let k = 0; k < 4; k++) {
    const t0 = Math.floor(((c + k / 4) * cyc + (rnd() - .5) * cyc * .02) * sr), a = amp[k] * (.88 + rnd() * .24);
    const len = Math.round(sr * .012);
    for (let j = 0; j < len; j++) {                                           // хлопок: резкий фронт, спад ~2.5 мс + шум газов
      const t = j / sr, e = Math.exp(-t / .0011) * (1 - Math.exp(-t / .00015));
      fire[(t0 + j) % n] += a * (e + (rnd() * 2 - 1) * Math.exp(-t / .003) * .6);
    }
  }
  const bank = engExhaust(sr), st = {lp:0, dc:0}, d = new Float32Array(n);
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) { const v = engVoice(bank, fire[i], st); if (pass) d[i] = v; }
  let e = 0; for (let i = 0; i < n; i++) e += d[i] * d[i];                   // по средней громкости, не по пику: петли ровные между собой
  const k = .2 / Math.sqrt(e / n); for (let i = 0; i < n; i++) d[i] = Math.tanh(d[i] * k * 1.1) / 1.1;
  return d;
}
// стартер: 0.75 с жужжания, проседающего на сжатиях, потом мотор схватывает (1 с, обороты 1500 → 900)
function genCrank(sr) {
  const n = Math.round(1.75 * sr), d = new Float32Array(n), rnd = mulberry32(11), bank = engExhaust(sr), st = {lp:0, dc:0};
  let ph = 0, nextFire = .75, lp = 0;
  for (let i = 0; i < n; i++) {
    const T = i / sr;
    let s = 0;
    if (T < .8) {                                                            // стартер: зубцы шестерни ~ 160–190 Гц, «р-р-р» ~5 раз/с
      const comp = .55 + .45 * Math.cos(2 * Math.PI * 5.2 * T), f = 150 + 40 * comp + T * 25;
      ph += f / sr; const saw = 2 * (ph % 1) - 1;
      lp += ((rnd() * 2 - 1) - lp) * .3;
      s = (saw * .35 + lp * .25) * (.35 + .65 * comp) * Math.min(1, T * 30) * Math.min(1, (.8 - T) * 15) * .5;
      s += engVoice(bank, (rnd() * 2 - 1) * .04 * comp, st) * .3;            // глухо отзывается труба
    }
    let ex = 0;
    if (T >= nextFire) {                                                     // схватил: вспышки всё чаще, потом холостые
      const age = nextFire - .75, rpm = age < .25 ? 700 + age * 3600 : Math.max(900, 1600 - (age - .25) * 1400);
      nextFire += 30 / rpm * (.96 + rnd() * .08); ex = .9 + rnd() * .3;
    }
    const v = engVoice(bank, ex, st);
    d[i] = s + (T > .74 ? v * Math.min(1, (1.75 - T) * 3) : 0);
  }
  return sndNorm(d, .85);
}
// гудок: две «тарелки» клаксона — дребезжащий импульсный ток мембраны через раструб.
// 0.3 с: начало 0.1 с, дальше петля 0.1–0.3 с (ровно 83 и 104 периода тонов и один период дрожания 5 Гц — стык без щелчка):
// пока кнопка зажата, гудок тянется (v83)
const HORN_LOOP = [.1, .3];
function genHorn(sr) {
  const n = Math.round(HORN_LOOP[1] * sr), d = new Float32Array(n);
  const tones = [[415, 1], [520, .8]], form = [[1050, 4, 1], [2300, 6, .7], [3400, 7, .35]].map(([f, q, g]) => Object.assign(sndBP(f, q, sr), {g}));
  const hp = sndBP(700, .5, sr), ph = [.13, .61], run = (T, w) => {
    const att = Math.min(1, T / .018), sag = 1 - .03 * Math.exp(-T / .012);   // мембрана раскачивается: первые мс тон чуть ниже
    let src = 0;
    for (let k = 0; k < 2; k++) {
      ph[k] = (ph[k] + tones[k][0] * sag * (1 + .002 * Math.sin(2 * Math.PI * 5 * T)) / sr) % 1;
      const x = ph[k];                                                        // удар якоря о сердечник: узкий импульс + отскок
      src += tones[k][1] * (Math.exp(-x / .06) - .35 * Math.exp(-Math.abs(x - .5) / .05));
    }
    src *= att;
    let s = sndRun(hp, src) * .6; for (const F of form) s += sndRun(F, src) * F.g;
    return Math.tanh(s * 3);
  };
  for (let i = 0; i < n; i++) d[i] = run(i / sr);
  return sndNorm(d, .8);
}

// ---- проигрывание ----
function engBuffers() {
  const ac = SFX.ac; if (!ac) return false; if (ENG.loops) return true;
  const mk = d => { const b = ac.createBuffer(1, d.length, ENG_SR); b.getChannelData(0).set(d); return b; };
  try {
    ENG.loops = ENG_RPM.map((r, k) => mk(genEngineLoop(r, ENG_SR, 7 + k)));
    ENG.crankBuf = mk(genCrank(ENG_SR)); ENG.hornBuf = mk(genHorn(ENG_SR));
  } catch (e) { logErr(e, 'engBuffers'); ENG.loops = null; return false; }
  return true;
}
function playBuf(b, v, rate) {
  const ac = SFX.ac, out = SFX.out; if (!ac || !out || !b) return;
  const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = b; s.playbackRate.value = rate || 1; g.gain.value = v * SFX.vol();
  s.connect(g); g.connect(out); s.start(); s.onended = () => { try { g.disconnect(); } catch (e) {} };
}
// гудок (SFX.horn, 26-driving honk): тап — короткий «би-ип», зажал — тянется, пока держишь
function carHorn() {
  const ac = SFX.ac; if (!ac || !SFX.out || !engBuffers()) return;
  if (ENG.horn) { ENG.horn.t1 = ac.currentTime; return; }
  const s = ac.createBufferSource(), g = ac.createGain();
  s.buffer = ENG.hornBuf; s.loop = true; s.loopStart = HORN_LOOP[0]; s.loopEnd = HORN_LOOP[1];
  g.gain.value = .5 * SFX.vol(); s.connect(g); g.connect(SFX.out); s.start();
  s.onended = () => { try { g.disconnect(); } catch (e) {} };
  ENG.horn = {s, g, t0:ac.currentTime};
}
function carHornOff() {
  const H = ENG.horn; if (!H || !SFX.ac) return; ENG.horn = null;
  const t = SFX.ac.currentTime; H.g.gain.setTargetAtTime(0, t, .018); try { H.s.stop(t + .15); } catch (e) {}
}
// отпустил кнопку (не раньше 0.3 с — короткий гудок не обрывается), вышел из машины, пауза — гудок стихает
onUpdate(() => { const H = ENG.horn; if (H && (!atkHeld || !P.car) && SFX.ac.currentTime - H.t0 > .3) carHornOff(); });
function engStart() {
  const ac = SFX.ac; if (!ac || !engBuffers()) return;
  const lp = ac.createBiquadFilter(), g = ac.createGain();
  lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = .5; g.gain.value = 0;
  lp.connect(g); g.connect(SFX.out); ENG.lp = lp; ENG.gain = g; ENG._lastV = null;
}
// петля k: запустить (если ещё не играет) и вести к громкости v со скоростью rate
function engLoop(k, v, rate, t) {
  let L = ENG.act.get(k);
  if (!L) {
    if (v < .01) return;
    const ac = SFX.ac, s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = ENG.loops[k]; s.loop = true; s.loopStart = 0; s.playbackRate.value = rate; g.gain.value = 0;
    s.connect(g); g.connect(ENG.lp); s.start(t, Math.random() * ENG.loops[k].duration);
    ENG.act.set(k, L = {s, g});
  }
  L.g.gain.setTargetAtTime(v, t, .04); L.s.playbackRate.setTargetAtTime(rate, t, .04);
  if (v < .01) { try { L.s.stop(t + .25); } catch (e) {} ENG.act.delete(k); }
}
function engStop() {
  const g = ENG.gain, act = [...ENG.act.values()]; ENG.act.clear(); ENG.lp = ENG.gain = null; ENG.on = false;
  if (!g || !SFX.ac) return;
  const t = SFX.ac.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, .12);
  for (const L of act) try { L.s.stop(t + .7); } catch (e) {}
}
// в игре: заведена ли машина героя, заводка, обороты (параметры звука — 20 раз в секунду)
onUpdate(dt => {
  const p = P && P.car, run = !!(p && p.engine && p.fuel > 0 && p.hp > 0);
  if (!run) { if (ENG.on) engStop(); ENG.car = p || null; return; }
  if (!SFX.ac) return;
  if (!ENG.on || ENG.car !== p) {
    if (ENG.on) engStop();
    ENG.on = true; ENG.car = p; ENG.crank = 1.1; ENG.rpm = .02;
    if (engBuffers()) playBuf(ENG.crankBuf, .6);
  }
  if (ENG.crank > 0) { ENG.crank -= dt; if (ENG.crank > 0) return; }
  if (!ENG.gain) engStart(); if (!ENG.gain) return;
  // обороты: внутри передачи растут со скоростью, на переключении падают; газ поднимает
  const sp = Math.abs(p.v || 0); let g = 1; while (g < ENG_GEARS.length - 1 && sp > ENG_GEARS[g]) g++;
  const inGear = Math.min(1, (sp - ENG_GEARS[g - 1]) / (ENG_GEARS[g] - ENG_GEARS[g - 1]));
  const thr = Math.abs(p.thr || 0), target = sp < .15 ? .02 + thr * .3 : .2 + inGear * .6 + thr * .15 - (g - 1) * .03;
  ENG.rpm += (target - ENG.rpm) * Math.min(1, dt * (target > ENG.rpm ? 3 : 4.5));
  ENG.thr = (ENG.thr || 0) + (thr - (ENG.thr || 0)) * Math.min(1, dt * 6);
  ENG.vol = (.5 + ENG.rpm * .25 + ENG.thr * .2) * SFX.vol();
  ENG.tUp -= dt; if (ENG.tUp > 0) return; ENG.tUp = .05;
  const t = SFX.ac.currentTime, R = ENG_RPM, rpm = R[0] * Math.pow(R[R.length - 1] / R[0], Math.max(0, Math.min(1, ENG.rpm)));
  let k = 0; while (k < R.length - 2 && rpm > R[k + 1]) k++;
  const f = Math.max(0, Math.min(1, Math.log(rpm / R[k]) / Math.log(R[k + 1] / R[k])));
  for (const j of [...ENG.act.keys()]) if (j !== k && j !== k + 1) engLoop(j, 0, 1, t);
  engLoop(k, Math.cos(f * Math.PI / 2), rpm / R[k], t);
  engLoop(k + 1, Math.sin(f * Math.PI / 2), rpm / R[k + 1], t);
  ENG.lp.frequency.setTargetAtTime(900 + ENG.rpm * 1800 + ENG.thr * 1600, t, .06);   // под газом мотор звонче
});
onDraw(() => {
  if (!ENG.gain || !SFX.ac) return;
  if (ENG.horn && (mode !== 'play' || paused)) carHornOff();
  const live = mode === 'play' && !paused && P && P.car === ENG.car;
  const v = live ? ENG.vol : 0; if (ENG._lastV != null && Math.abs(ENG._lastV - v) < .01) return;
  ENG._lastV = v; ENG.gain.gain.setTargetAtTime(v, SFX.ac.currentTime, .1);
});
