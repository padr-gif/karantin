// ================= ночь осады: раз в неделю мертвецы идут на героя со всех сторон =================
// Каждая седьмая ночь (первая — в ночь седьмого дня) — осада. Утром об этом говорит баннер и военное радио,
// вечером напоминание. С 22:00 до 06:00 три волны: 22:00, 00:30 и 03:00. Мертвецы осады появляются кольцом
// вне поля зрения и всю ночь ищут героя: ломятся в двери и окна, в стены из «Стройки» (85-building).
// Каждая следующая осада больше и злее: больше мертвецов в волне, больше бегунов, они крепче.
// Пережил до рассвета — меньше стресса, достижение и груз с вертолёта (dropSupply, 24).
// Орды (28-climate) тоже растут: чем дольше живёшь, тем толпа больше (hordeSize).
// Нет орд в настройках мира (hordeK 0) — нет и осад; в обучении осад нет.
const SIEGE = {n:0, at:1e12, on:false, w:0, end:0, sp:0, warned:false, warn2:false, life:0};
const SIEGE_WAVES = [0, 150, 300], SIEGE_LEN = 480, SIEGE_MAX = 36;   // волны от начала (мин), длина ночи, мертвецов осады одновременно
const siegeOff = () => world.hordeK === 0 || (typeof TUT !== 'undefined' && TUT.on);
function siegeFirst(gm) { return (Math.floor(gm / 1440) + 6) * 1440 + 22 * 60; }                 // ночь седьмого дня, 22:00
function siegeReset(gm) { Object.assign(SIEGE, {n:0, at:siegeFirst(gm), on:false, w:0, end:0, sp:0, warned:false, warn2:false, life:0}); }
function hordeSize() { return Math.min(44, Math.round(24 * (1 + .05 * Math.max(0, dayNo())))); }   // орда: 24 в начале, +5% в день, не больше 44 (телефон)
function siegeWaveN() {
  const k = SIEGE.n + 1, hk = world.hordeK != null ? world.hordeK : 1;
  return clamp(Math.round((5 + 3 * k) * DIFF[world.diff].z * Math.sqrt(hk)), 4, 22);
}
const siegeAlive = () => zs.filter(z => z.siege).length;

// волна: кольцом 15–23 клетки вокруг героя, на улице и вне поля зрения
function siegeSpawn(n) {
  const k = SIEGE.n + 1; let made = 0;
  for (let t = 0; t < n * 50 && made < n; t++) {
    const a = rng() * 6.283, r = 15 + rng() * 8, x = Math.floor(P.x + Math.cos(a) * r), y = Math.floor(P.y + Math.sin(a) * r);
    if (!insideFence(x, y)) continue;
    const i = y * MW + x;
    if (navBlocked(x, y) || map[i] === DOOR || map[i] === WIN || vis[i] || hAt[i] || propAt[i]) continue;
    const pal = zPal();
    if (!pal.fast && rng() < Math.min(.3, .06 * k)) { pal.fast = true; pal.pi = 14; if (pal.b === 'h') pal.b = 'm'; }   // бегунов с каждой осадой больше
    const z = zType(mkZombie(x + .5, y + .5, pal, ri(48, 72) * (1 + .06 * (k - 1)), (.85 + rng() * .3) * DIFF[world.diff].spd));
    z.siege = true; z.state = 'investigate'; z.tx = P.x; z.ty = P.y; z.it = 0; made++;
  }
  SIEGE.sp += made; return made;
}
const siegeNight = gm => { const h = (gm % 1440) / 60; return h >= 21 || h < 6; };
const siegeLeft = () => Math.max(0, Math.ceil((SIEGE.end - gameMin) / 60));      // часов до конца осады
function siegeNext22(gm) { return (Math.floor(gm / 1440) + 7) * 1440 + 22 * 60; }   // через неделю, ровно в 22:00
function siegeStart() {
  SIEGE.on = true; SIEGE.w = 0; SIEGE.end = SIEGE.at + SIEGE_LEN; SIEGE.sp = 0; SIEGE.life = world.lives || 0;
  if (P.sleep) wake('Вокруг стонут и скребутся. Началась осада!');
  eventBanner('Осада', siegeNight(SIEGE.at) ? 'Они идут со всех сторон. Держись до рассвета: три волны, последняя около трёх ночи.' : 'Они идут со всех сторон. Держись восемь часов: три волны.', 'danger', 'i-skull');
  logEv('Ночь осады №' + (SIEGE.n + 1));
}
function siegeWave() {
  const n = Math.min(siegeWaveN(), SIEGE_MAX - siegeAlive());
  if (n > 0) siegeSpawn(n);
  if (SIEGE.w > 0) { toast(SIEGE.w === 1 ? 'Вторая волна: мертвецов стало больше' : 'Последняя волна. ' + (siegeNight(gameMin) ? 'До рассвета три часа' : 'Ещё три часа')); if (P.sleep) wake('Снова стоны за стенами — новая волна'); }
  SIEGE.w++;
}
function siegeEnd() {
  let left = 0;
  for (const z of zs) if (z.siege) { z.siege = false; left++; if (z.state !== 'chase') { z.state = 'wander'; z.wt = 0; } }
  const k = SIEGE.n + 1, alive = mode === 'play' && (world.lives || 0) === SIEGE.life;
  SIEGE.on = false; SIEGE.n++; SIEGE.at = siegeNext22(SIEGE.at);              // следующая — через неделю в 22:00, даже если эту запустили не вовремя (админ-меню) SIEGE.warned = SIEGE.warn2 = false;
  if (!alive) return;
  const killed = Math.max(0, SIEGE.sp - left);
  P.stress = Math.max(0, (P.stress || 0) - 25); P.unh = Math.max(0, (P.unh || 0) - 10);
  ach('siege'); if (SIEGE.n >= 3) ach('siege3');
  dropSupply();                                                                // до баннера: тост о грузе иначе вытеснил бы «Осада отбита»
  eventBanner('Осада отбита', (siegeNight(gameMin) || hourOf() < 8 ? 'Рассвет. ' : '') + 'Мертвецы расходятся.' + (killed ? ' Упокоено за ночь: ' + killed + '.' : '') + ' Военные видели выживших — с вертолёта сбросят груз.', 'good', 'i-sun');
  logEv('Пережил ночь осады №' + k + (killed ? ', упокоено ' + killed : ''));
}

onUpdate(dt => {
  if (!P || mode !== 'play' || paused) return;
  if (siegeOff()) { if (SIEGE.on) siegeEnd(); return; }
  if (!SIEGE.on) {
    if (gameMin >= SIEGE.at + SIEGE_LEN) { SIEGE.at += 7 * 1440 * Math.ceil((gameMin - SIEGE.at - SIEGE_LEN + 1) / (7 * 1440)); SIEGE.warned = SIEGE.warn2 = false; return; }   // проспал/пропустил ночь целиком (загрузка, дорога) — следующая через неделю
    if (!SIEGE.warned && gameMin >= SIEGE.at - 14 * 60) {
      SIEGE.warned = true;
      eventBanner('Сегодня ночью — осада', 'Мертвецы пойдут на тебя со всех сторон с 22:00 до рассвета. Укрепи дом: доски и металл на окна, стены и колья из «Стройки», банки и растяжки — чтобы проснуться вовремя.', 'danger', 'i-skull');
      logEv('Военные предупредили: ночью осада');
    }
    if (!SIEGE.warn2 && gameMin >= SIEGE.at - 120) { SIEGE.warn2 = true; toast('Через два часа начнётся осада. Запрись и проверь окна'); }
    if (gameMin < SIEGE.at) return;
    siegeStart();                                                              // и сразу первая волна
  }
  while (SIEGE.w < SIEGE_WAVES.length && gameMin >= SIEGE.at + SIEGE_WAVES[SIEGE.w]) siegeWave();
  SIEGE._k = (SIEGE._k || 0) - dt;
  if (SIEGE._k <= 0) {                                                         // мертвецы осады всю ночь ищут героя (к нему — по полю путей, ломая проёмы)
    SIEGE._k = .5;
    for (const z of zs) if (z.siege && z.state !== 'chase') { z.state = 'investigate'; z.tx = P.x; z.ty = P.y; z.it = 0; }
  }
  if (gameMin >= SIEGE.end) siegeEnd();
});

addMoodles(m => {
  if (!P || siegeOff()) return;
  if (SIEGE.on) m.push(['Осада', 'crit']);
  else if (SIEGE.warned) m.push(['Ночью осада', 'warn']);
}, m => {
  if (siegeOff()) return;
  if (SIEGE.on) { const h = siegeLeft(); m.push('Осада: ещё ' + (h <= 1 ? 'меньше часа' : '~' + h + ' ч') + (siegeNight(gameMin) && SIEGE.end % 1440 <= 7 * 60 ? ', до рассвета,' : '') + ' мертвецы ищут тебя. Сиди за прочными дверьми, чини проломы доской, не выходи'); }
  else if (SIEGE.warned) m.push('Ночью осада (с 22:00): заколоти окна, поставь стены и колья, повесь банки на двери');
});

ACH.push(['siege', 'Ночь длиною в жизнь', 'Пережить ночь осады'], ['siege3', 'Неприступный', 'Пережить три осады']);

onSave(d => { d.x89 = {n:SIEGE.n, at:SIEGE.at, on:SIEGE.on, w:SIEGE.w, end:SIEGE.end, sp:SIEGE.sp, warned:SIEGE.warned, warn2:SIEGE.warn2, life:SIEGE.life}; });
onLoad(d => {
  const x = d && d.x89;
  if (!x) { siegeReset(gameMin); return; }                                     // старое сохранение: первая осада через неделю от сейчас
  Object.assign(SIEGE, x);
  if (!SIEGE.on && SIEGE.at % 1440 !== 22 * 60) SIEGE.at = Math.floor(SIEGE.at / 1440) * 1440 + 22 * 60;   // сбитое расписание (старая «осада сейчас») — снова в 22:00
  if (SIEGE.on) for (const z of zs) if (Math.hypot(z.x - P.x, z.y - P.y) < 30) z.siege = true;   // посреди осады: ближние снова охотятся
});
onNewWorld(o => { if (!o || !o.save) siegeReset(gameMin); });
