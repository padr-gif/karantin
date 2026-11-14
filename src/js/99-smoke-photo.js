// ================= перекур и фотография: инвентарь прячется, герой занят делом =================
// Раньше «Закурить» и «Посмотреть» на фотографии срабатывали мгновенно, прямо поверх открытого рюкзака: дыма и
// подписи было не видно. Теперь это действия со временем, как еда: окно закрывается, герой делает своё.
//   • Перекур (≈5 с): две затяжки — рука ко рту, огонёк разгорается (в темноте видно), выдох — облачко дыма.
//     Спички/зажигалка проверяются сразу, тратятся при прикуривании. Можно прервать, сдвинувшись с места.
//   • Фотография (≈4 с): герой разглядывает снимок, а на экране — сам снимок: выцветшая карточка с картинкой
//     и подписью на обороте. У каждой фотографии свой сюжет (запоминается в вещи и в сохранении).
{
  const isSmoke = it => it && ITEMS[it.id] && ITEMS[it.id].kind === 'smoke';
  const isPhoto = it => it && it.id === 'photo';
  const SMOKE_DUR = 5.2, PHOTO_DUR = 4.2;

  { const uk0 = useKind;
    useKind = function (it) {
      if (isSmoke(it)) return ['smoke', SMOKE_DUR];
      if (isPhoto(it)) return ['read', PHOTO_DUR];
      return uk0.apply(this, arguments);
    };
  }
  { const bu0 = beginUse;
    beginUse = function (k) {
      const it = P.inv[k];
      if (isSmoke(it) && !fireTool()) { toast('Нечем прикурить: нужны спички или зажигалка'); return; }
      if (isPhoto(it) && it.ph == null) it.ph = Math.floor(rng() * PHOTO_TXT.length);
      const r = bu0.apply(this, arguments);
      if (P.act && P.act.kind === 'use' && P.act.it === it) {
        if (isSmoke(it)) { SFX.rustle && SFX.rustle(); P.act.lit = false; }
        if (isPhoto(it)) photoShow(it);
      }
      return r;
    };
  }
  // ---- анимация перекура: две затяжки (рука ко рту — кадры «еды»), между ними рука опущена ----
  const puffOf = A => { const p = A.t / A.dur; return p < .12 ? 0 : p < .5 ? (p - .12) / .38 : p < .58 ? 0 : p < .96 ? (p - .58) / .38 : 0; };
  const handUp = A => { const q = puffOf(A); return q <= 0 ? 0 : Math.sin(q * Math.PI); };      // 0 — рука внизу, 1 — у рта
  { const pa0 = playerAnimBase;
    playerAnimBase = function (pAtk) {
      const A = P.act;
      if (pAtk < 0 && A && A.kind === 'use' && A.an === 'smoke' && mode !== 'dead') {
        const n = AN('p', 'eat'); return ['eat', Math.max(0, Math.min(n - 1, Math.round(handUp(A) * (n - 1) * .8)))];
      }
      return pa0.apply(this, arguments);
    };
  }
  // прикурил — в начале; дым на выдохе (рука пошла вниз)
  onUpdate(() => {
    const A = P.act; if (!A || A.kind !== 'use' || A.an !== 'smoke') return;
    if (!A.lit && A.t > .35) A.lit = true;
    const q = puffOf(A), was = A._q || 0; A._q = q;
    if (was > .6 && (q < was || q === 0) && !A['ex' + (A.t / A.dur < .55 ? 1 : 2)]) {
      A['ex' + (A.t / A.dur < .55 ? 1 : 2)] = 1;
      if (!reduceMotion) for (let k = 0; k < 4; k++) emit('smoke', P.x + Math.cos(P.face) * .25, P.y + Math.sin(P.face) * .25, 1.6, 1, null, 0, .25);
    }
  });
  // огонёк сигареты у руки: разгорается на затяжке, в темноте с ореолом
  onDraw(() => {
    const A = P.act; if (mode !== 'play' || !A || A.kind !== 'use' || A.an !== 'smoke' || !A.lit || !heroRig() || P.car) return;
    const lk = P.look || look, n = AN('p', 'eat'), fi = Math.max(0, Math.min(n - 1, Math.round(handUp(A) * (n - 1) * .8)));
    const name = 'p' + lk.g + heroVar(lk) + '_eat_' + dirOf(P.fd != null ? P.fd : P.face) + '_' + fi, wm = ART.meta.wpn && ART.meta.wpn[name]; if (!wm) return;
    const x = SX(P.x, P.y) + wm[0], y = SY(P.x, P.y, 0) + wm[1] - 1, glow = .45 + handUp(A) * .55 + Math.sin(animT * 9) * .05, dark = 1 - lightLevel();
    ctx.save();
    if (dark > .2) { const g = ctx.createRadialGradient(x, y, 0, x, y, 7 + glow * 5); g.addColorStop(0, `rgba(255,140,60,${.35 * glow * dark})`); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.fillRect(x - 13, y - 13, 26, 26); }
    ctx.fillStyle = `rgba(255,${Math.round(120 + glow * 80)},70,${.7 + glow * .3})`; ctx.fillRect(Math.round(x * DPR) / DPR - .75, Math.round(y * DPR) / DPR - .75, 1.5, 1.5);
    ctx.restore();
  });

  // ---- фотография на экране ----
  const PH_CARD = {el:null, t:0};
  const BACK = ['Дача, лето', 'Таня и Серёжа, 14 августа', 'Ладога. 9 кг!', 'Мама с папой у нашего подъезда', 'Тузик встречает Новый год', 'Выпускной, 11 «Б»'];   // подписи от руки под снимком
  // сюжеты — в том же порядке, что подписи PHOTO_TXT (99-home-life): качели, свадьба, щука, пара у подъезда, собака, выпускной
  const SCENES = [
    g => { sky(g, '#b9c7c0'); grass(g, 112); tree(g, 30, 112, 26); g.strokeStyle = '#4a3b2c'; g.lineWidth = 3; line(g, 120, 40, 120, 112); line(g, 180, 40, 180, 112); line(g, 112, 40, 188, 40);
      g.lineWidth = 1.2; line(g, 136, 40, 140, 88); line(g, 152, 40, 148, 88); line(g, 158, 40, 162, 92); line(g, 174, 40, 170, 92); kid(g, 144, 88, '#c0503c'); kid(g, 166, 92, '#3c6ab0'); },
    g => { sky(g, '#d8d0c0'); floor(g, 118, '#9a8a76'); person(g, 60, 118, '#2b2b30', 1); person(g, 84, 118, '#f2efe6', 1, true); person(g, 120, 118, '#55606a'); person(g, 146, 118, '#8a4a5a', 0, true); person(g, 172, 118, '#3f4a3a'); confetti(g); },
    g => { sky(g, '#a9bccb'); water(g, 96); floor(g, 120, '#7a6a50'); person(g, 96, 120, '#4f5a3c', 1); g.fillStyle = '#7d8a6a'; g.beginPath(); g.ellipse(124, 84, 30, 7, -.15, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(152, 80); g.lineTo(162, 72); g.lineTo(162, 92); g.closePath(); g.fill(); },
    g => { sky(g, '#c9c2b4'); g.fillStyle = '#8e8476'; g.fillRect(20, 20, 180, 100); g.fillStyle = '#5a5248'; g.fillRect(92, 58, 36, 62); for (let i = 0; i < 4; i++) { g.fillStyle = '#b8c4c8'; g.fillRect(32 + i * 46 - (i > 1 ? -8 : 0), 30, 20, 18); }
      floor(g, 120, '#6e675e'); person(g, 84, 120, '#5a4a6a', 0, true); person(g, 140, 120, '#4a4a40', 1); g.fillStyle = '#6a5a4a'; g.fillRect(70, 122, 80, 4); },
    g => { sky(g, '#d6c8b2'); floor(g, 112, '#a08060'); g.fillStyle = '#c0a37a'; g.beginPath(); g.ellipse(110, 98, 34, 18, 0, 0, 6.283); g.fill(); g.beginPath(); g.arc(110, 70, 17, 0, 6.283); g.fill();
      g.fillStyle = '#3a2a20'; g.fillRect(102, 66, 3, 3); g.fillRect(115, 66, 3, 3); g.fillStyle = '#c0302a'; g.beginPath(); g.moveTo(94, 58); g.lineTo(124, 56); g.lineTo(112, 30); g.closePath(); g.fill(); g.fillStyle = '#f4f0e6'; g.fillRect(93, 56, 32, 5); g.beginPath(); g.arc(112, 30, 4, 0, 6.283); g.fill(); },
    g => { sky(g, '#c8d2c6'); tree(g, 186, 110, 24); grass(g, 110); person(g, 110, 118, '#20242c', 0, true); g.strokeStyle = '#d23a3a'; g.lineWidth = 4; line(g, 98, 76, 120, 102); g.fillStyle = '#f2efe6'; g.beginPath(); g.arc(150, 46, 10, 0, 6.283); g.fill(); },
  ];
  function sky(g, c) { const gr = g.createLinearGradient(0, 0, 0, 140); gr.addColorStop(0, c); gr.addColorStop(1, '#e8e2d2'); g.fillStyle = gr; g.fillRect(0, 0, 220, 140); }
  function grass(g, y) { g.fillStyle = '#6f8458'; g.fillRect(0, y, 220, 140 - y); }
  function floor(g, y, c) { g.fillStyle = c; g.fillRect(0, y, 220, 140 - y); }
  function water(g, y) { g.fillStyle = '#6f8a9a'; g.fillRect(0, y, 220, 30); }
  function line(g, a, b, c, d) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
  function tree(g, x, y, r) { g.fillStyle = '#4a3a2a'; g.fillRect(x - 3, y - r, 6, r); g.fillStyle = '#4e6a3e'; g.beginPath(); g.arc(x, y - r - r * .5, r * .9, 0, 6.283); g.fill(); }
  function kid(g, x, y, c) { g.fillStyle = c; g.fillRect(x - 5, y - 16, 10, 12); g.fillStyle = '#e0b090'; g.beginPath(); g.arc(x, y - 20, 4.5, 0, 6.283); g.fill(); g.fillStyle = '#3a3040'; g.fillRect(x - 4, y - 4, 3, 8); g.fillRect(x + 1, y - 4, 3, 8); }
  function person(g, x, y, c, tall, dress) {
    const h = tall ? 62 : 56; g.fillStyle = c;
    if (dress) { g.beginPath(); g.moveTo(x - 8, y - h + 16); g.lineTo(x + 8, y - h + 16); g.lineTo(x + 14, y); g.lineTo(x - 14, y); g.closePath(); g.fill(); }
    else { g.fillRect(x - 9, y - h + 16, 18, h * .5); g.fillStyle = '#2e2e34'; g.fillRect(x - 8, y - h * .5 + 16, 7, h * .5 - 16); g.fillRect(x + 1, y - h * .5 + 16, 7, h * .5 - 16); }
    g.fillStyle = '#e2b896'; g.beginPath(); g.arc(x, y - h + 9, 7.5, 0, 6.283); g.fill(); g.fillStyle = '#4a3a2e'; g.beginPath(); g.arc(x, y - h + 6, 7.5, Math.PI, 0); g.fill();
  }
  function confetti(g) { const r = mulberry(7); for (let i = 0; i < 40; i++) { g.fillStyle = ['#d65a5a', '#e2c04a', '#6aa0d0', '#f0f0f0'][i % 4]; g.fillRect(r() * 220, r() * 70, 2, 3); } }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // старый снимок: сепия, зерно, светлый край, царапины
  function age(g, seed) {
    const im = g.getImageData(0, 0, 220, 140), d = im.data, r = mulberry(seed + 11);
    for (let i = 0; i < d.length; i += 4) {
      const p = i / 4, x = p % 220, y = (p / 220) | 0, l = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11;
      const v = Math.hypot((x - 110) / 130, (y - 70) / 90), n = (r() - .5) * 22, k = .55;
      d[i] = (d[i] * (1 - k) + (l + 34) * k) + n - v * 26; d[i + 1] = (d[i + 1] * (1 - k) + (l + 14) * k) + n - v * 30; d[i + 2] = (d[i + 2] * (1 - k) + (l - 14) * k) + n - v * 34;
    }
    g.putImageData(im, 0, 0);
    g.strokeStyle = 'rgba(255,250,235,.35)'; g.lineWidth = .7; for (let i = 0; i < 3; i++) { const x = r() * 220; line(g, x, 0, x + (r() - .5) * 30, 140); }
  }
  function photoShow(it) {
    photoHide();
    const i = ((it.ph | 0) % SCENES.length + SCENES.length) % SCENES.length;
    const el = mk('div', 'ph-card'), c = mkCanvas(220, 140), g = c.getContext('2d', {willReadFrequently:true});
    try { SCENES[i](g); age(g, i); } catch (e) { logErr(e, 'фото'); }
    el.appendChild(c);
    el.appendChild(mk('div', 'ph-cap', BACK[i] || ''));
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
    PH_CARD.el = el;
  }
  function photoHide() { const el = PH_CARD.el; if (!el) return; PH_CARD.el = null; el.classList.remove('on'); setTimeout(() => el.remove(), 350); }
  onUpdate(() => { if (PH_CARD.el && !(P.act && P.act.kind === 'use' && isPhoto(P.act.it))) photoHide(); });
  // фото досмотрено: вместо общей подписи — какая именно (сюжет тот же, что на карточке)
  defUse(it => it.id === 'photo', it => {
    const i = it.ph != null ? it.ph % PHOTO_TXT.length : Math.floor(rng() * PHOTO_TXT.length);
    const seen = (it.seen = (it.seen || 0) + 1);
    toast(seen > 2 ? 'Снова смотришь на чужих людей. Почему-то спокойнее' : PHOTO_TXT[i] + '. Когда-то у кого-то была жизнь');
    P.bored = Math.max(0, (P.bored || 0) - (seen > 2 ? 2 : 4)); P.stress = Math.max(0, (P.stress || 0) - 3);
  });
}
