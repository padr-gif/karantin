// ================= музыка: тихий эмбиент, тревога в погоне, скример у двери или окна =================
// Всё синтезом на том же AudioContext, что и звуки. Эмбиент — медленные минорные аккорды через мягкий фильтр
// и редкие «капли» с эхом. Тревога растёт, когда за героем гонятся (z.state === 'chase' рядом): глухой пульс
// и дрожащая пара нот. Скример — резкий удар, только если мертвец внезапно показался вплотную у двери или окна
// (или в доме), не чаще раза в полторы минуты и не всегда. Громкость — настройка «Музыка».
const MUS = {g:null, amb:null, ten:null, lp:null, oscs:[], tr:[], chord:0, chordT:0, dropT:4, beatT:0, lvl:0, scareT:-1e9, iv:0};
const musVol = () => (settings.music == null ? .7 : settings.music);
const MUS_CHORDS = [[110, 164.8, 261.6], [87.3, 130.8, 220], [73.4, 110, 174.6], [82.4, 123.5, 196], [98, 146.8, 233.1]];   // Am, F, Dm, Em, Gm — низко и тихо
function musBuild() {
  const ac = SFX.ac; if (!ac || MUS.g) return !!MUS.g;
  const g = ac.createGain(); g.gain.value = 0; g.connect(ac.destination);
  // эмбиент: три треугольника → мягкий фильтр с медленным «дыханием»
  const amb = ac.createGain(); amb.gain.value = 0; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = .6;
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .06; lg.gain.value = 220; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
  amb.connect(lp); lp.connect(g);
  MUS.oscs = MUS_CHORDS[0].map((f, k) => { const o = ac.createOscillator(), og = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = (k - 1) * 6; og.gain.value = k === 2 ? .22 : .32; o.connect(og); og.connect(amb); o.start(); return o; });
  // эхо для «капель»
  const dl = ac.createDelay(1.5), fb = ac.createGain(), wet = ac.createGain(); dl.delayTime.value = .42; fb.gain.value = .38; wet.gain.value = .5;
  dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(g);
  // тревога: дрожащая пара нот (малая секунда) через полосовой фильтр
  const ten = ac.createGain(); ten.gain.value = 0; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.2;
  const trem = ac.createGain(); trem.gain.value = .5; const tl = ac.createOscillator(), tlg = ac.createGain(); tl.frequency.value = 7; tlg.gain.value = .5; tl.connect(tlg); tlg.connect(trem.gain); tl.start();
  MUS.tr = [329.6, 349.2].map(f => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(bp); o.start(); return o; });
  bp.connect(trem); trem.connect(ten); ten.connect(g);
  Object.assign(MUS, {g, amb, lp, ten, dl}); return true;
}
// одна мягкая нота: «капля» в эмбиенте или удар пульса
function musNote(f, peak, dur, type, toEcho, f2) {
  const ac = SFX.ac; if (!ac || !MUS.g) return;
  const t = ac.currentTime, o = ac.createOscillator(), og = ac.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(peak, t + .015); og.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(og); og.connect(MUS.g); if (toEcho) og.connect(MUS.dl); o.start(t); o.stop(t + dur + .05);
}
// скример: шумовой удар, диссонанс вниз и низкий «бум»
function musScare() {
  const ac = SFX.ac; if (!ac || !MUS.g) return;
  const t = ac.currentTime, v = Math.max(.35, SFX.vol());
  { const s = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * .6, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = .8; g.gain.value = .55 * v;
    s.buffer = b; s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t); }
  for (const f of [233, 247, 466, 494, 698]) {
    const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter(); o.type = 'sawtooth'; lp.type = 'lowpass'; lp.frequency.value = 3200;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .94, t + 1.3);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.075 * v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + 1.4);
    o.connect(lp); lp.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 1.5);
  }
  { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(75, t); o.frequency.exponentialRampToValueAtTime(28, t + .9);
    g.gain.setValueAtTime(.6 * v, t); g.gain.exponentialRampToValueAtTime(.0001, t + 1); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 1.05); }
  // вспышка, тряска, толчок
  let fx = $('scareFx'); if (!fx) { fx = mk('div'); fx.id = 'scareFx'; fx.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;background:radial-gradient(ellipse at center,rgba(255,240,230,.0) 30%,rgba(160,20,12,.55) 100%);opacity:0;transition:opacity .5s'; document.body.appendChild(fx); }
  fx.style.transition = 'none'; fx.style.opacity = '1'; void fx.offsetWidth; fx.style.transition = 'opacity .9s'; fx.style.opacity = '0';
  if (settings.shake !== false && typeof shake !== 'undefined') shake = .6;
  try { settings.vib !== false && navigator.vibrate && navigator.vibrate([90, 40, 180]); } catch (e) {}
  MUS.lvl = 1;
}
// мертвец внезапно вплотную: только у двери/окна или когда герой в доме — на открытой улице не пугаем
function musScareSpot(z) {
  if (insideHouse(P.x, P.y)) return true;
  const x0 = Math.floor(z.x), y0 = Math.floor(z.y);
  for (let y = y0 - 1; y <= y0 + 1; y++) for (let x = x0 - 1; x <= x0 + 1; x++) { const m = map[y * MW + x]; if (m === DOOR || m === WIN) return true; }
  return false;
}
function musTick() {
  if (!SFX.ac || !musBuild()) return;
  const ac = SFX.ac, now = ac.currentTime, dt = .1, vol = musVol();
  const play = mode === 'play' && P, live = play && !paused;
  // тревога: сколько мертвецов гонится рядом
  let target = 0;
  if (live) {
    let n = 0;
    for (const z of zs) {
      const d = Math.hypot(z.x - P.x, z.y - P.y);
      if (z.state === 'chase' && d < 12) n++;
      // скример: мертвец только что показался вплотную
      const v = vis[Math.floor(z.y) * MW + Math.floor(z.x)];
      if (!v) { z._mh = 1; continue; }
      if (z._mh === 1) {
        z._mh = 0;
        if (d < 2.6 && performance.now() - MUS.scareT > 90000 && !(typeof TUT !== 'undefined' && TUT.on) && musScareSpot(z) && Math.random() < .8) { MUS.scareT = performance.now(); musScare(); }
      } else z._mh = 0;
    }
    target = Math.min(1, n / 3);
  }
  MUS.lvl += (target - MUS.lvl) * (target > MUS.lvl ? .25 : .015);
  // громкости: в игре эмбиент тише, когда страшно; в меню и на паузе — фоном
  const base = vol * (mode === 'menu' ? .55 : mode === 'dead' ? .35 : paused ? .5 : .8);
  MUS.g.gain.setTargetAtTime(vol > 0 ? .22 : 0, now, .4);
  MUS.amb.gain.setTargetAtTime(base * (1 - MUS.lvl * .6) * (vol > 0 ? 1 : 0), now, .8);
  MUS.ten.gain.setTargetAtTime(live ? MUS.lvl * .06 * vol : 0, now, .3);
  // смена аккорда раз в 9–14 секунд, ночью ниже
  MUS.chordT -= dt;
  if (MUS.chordT <= 0) {
    MUS.chordT = 9 + Math.random() * 5; MUS.chord = (MUS.chord + 1 + Math.floor(Math.random() * 2)) % MUS_CHORDS.length;
    const k = play && typeof lightLevel === 'function' && lightLevel() < .3 ? .75 : 1;
    MUS_CHORDS[MUS.chord].forEach((f, i) => MUS.oscs[i].frequency.setTargetAtTime(f * k, now, 1.6));
  }
  // «капли» с эхом — редкие высокие ноты из аккорда
  MUS.dropT -= dt;
  if (MUS.dropT <= 0 && vol > 0 && MUS.lvl < .5) { MUS.dropT = 5 + Math.random() * 9; const c = MUS_CHORDS[MUS.chord]; musNote(c[Math.floor(Math.random() * 3)] * 4, .05 * vol, 2.2, 'sine', true); }
  // пульс погони
  MUS.beatT -= dt;
  if (live && MUS.lvl > .15 && MUS.beatT <= 0) { MUS.beatT = .55 - MUS.lvl * .17; musNote(62, .5 * MUS.lvl * vol, .22, 'sine', false, 38); }
}
MUS.iv = setInterval(() => { try { musTick(); } catch (e) {} }, 100);

// ---- настройки «Музыка» и «Туман по краям» (строки добавляются в список настроек) ----
function setRowAdd(title, note, id, group) {
  const list = document.querySelector('#settings .setlist'); if (!list || $(id)) return;
  const r = mk('div', 'set'), t = mk('div'); t.appendChild(mk('b', '', title)); t.appendChild(mk('small', '', note)); r.appendChild(t);
  const s = mk('div', 'seg'); s.id = id; r.appendChild(s); list.appendChild(r);
  if (typeof SET_GROUPS !== 'undefined') { const g = SET_GROUPS.find(x => x[0] === group); if (g && !g[2].includes(title)) g[2].push(title); }
}
setRowAdd('Музыка', 'Тихий фон, тревога в погоне и внезапные испуги', 'sMusic', 'snd');
{ const f = openSettings; openSettings = function () { const r = f.apply(this, arguments);
    if ($('sMusic')) seg($('sMusic'), [[0, 'Выкл'], [.4, 'Тихо'], [.7, 'Обычно'], [1, 'Громко']], musVol, v => { settings.music = v; saveSettings(); });
    return r; }; }
