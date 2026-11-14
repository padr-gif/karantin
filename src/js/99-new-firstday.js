// ================= первый день: дела по порядку, оружие в доме, первый мертвец =================
// Новичок не должен гадать, что делать. В первый день в дневнике не случайные дела, а три по порядку:
// обыскать дом → взять что-нибудь в руки → упокоить первого. После каждого — короткая подсказка, что дальше.
// В своём доме обязательно есть чем отбиться (кухонный нож, если ничего не выпало).
// Через минуту-полторы к дому приходит один слабый мертвец — сосед: первый бой случается быстро и по силам,
// а в его карманах — кварцевые часы (без часов герой не знает времени) и бинт.
// В обучении и в «ещё одной жизни» ничего этого нет.
{
  const fresh = () => P && !(typeof TUT !== 'undefined' && TUT.on) && (world.lives || 1) <= 1 && gameMin - startMin < 1440 && Math.floor(gameMin / 1440) === Math.floor(startMin / 1440);
  const FD = [
    {k:'fd_search', fd:true, t:n => `Обыскать дом: ${n} места. Шкафы, холодильник, тумбочки.`, n:[3, 3], c:() => (P.stats.f_search || 0)},
    {k:'fd_arm', fd:true, t:() => 'Взять в руки что-нибудь тяжёлое или острое. Нож, молоток — что найдётся.', n:[1, 1], c:() => (P.weapon ? 1 : 0) + (P.stats.fdArm || 0)},
    {k:'fd_kill', fd:true, t:() => 'Упокоить первого. Бить в голову, в лицо не смотреть.', n:[1, 1], c:() => kills},
  ];
  TASKS.push(...FD);
  const t0 = tasksToday;
  tasksToday = function () {
    if (fresh() && !world.fdGiven) {
      world.fdGiven = true; P.stats = P.stats || {};
      P.tasks = {day:dayNo(), streak:0, head:'Первый день. По порядку, без паники.', fd:true,
        list:FD.map(d => ({k:d.k, n:d.n[0], base:d.k === 'fd_arm' ? 0 : d.c(), done:false, note:''}))};
      diaryChip();
    }
    return t0.apply(this, arguments);
  };

  // ---- в своём доме есть чем отбиться ----
  const isWpn = it => it && ITEMS[it.id] && ITEMS[it.id].kind === 'weapon';
  onStartNew(() => {
    if (!P || (typeof TUT !== 'undefined' && TUT.on)) return;
    world.fdGiven = false; world.fz = null;
    if (P.weapon || P.inv.some(isWpn)) return;
    const h = hAt[Math.floor(P.y) * MW + Math.floor(P.x)]; if (!h) return;
    const mine = furns.filter(f => f && f.items && hAt[f.y * MW + f.x] === h && CONT[f.type] && CONT[f.type].loot);
    if (!mine.length || mine.some(f => f.items.some(isWpn))) return;
    const f = mine.find(f => f.type === 'cabinet') || mine.find(f => f.type === 'counter') || mine[0];
    f.items.push(mkItem('knife'));
  });

  // ---- первый мертвец: сосед ----
  function spawnNeighbour() {
    const h = hAt[Math.floor(P.y) * MW + Math.floor(P.x)];
    for (let t = 0; t < 300; t++) {
      const a = rng() * 6.283, r = 7 + rng() * 5, x = Math.floor(P.x + Math.cos(a) * r), y = Math.floor(P.y + Math.sin(a) * r), i = y * MW + x;
      if (!inMap(x, y, 2) || hAt[i] || navBlocked(x, y) || !tileFree(x, y) || vis[i]) continue;
      const z = mkZombie(x + .5, y + .5, {pi:ri(0, 9), b:'m', blood:0}, 42, .55);
      if (!z) continue;
      z.first = true; z.state = 'investigate'; z.tx = P.x; z.ty = P.y; z.it = 0;
      return z;
    }
    void h; return null;
  }
  const say = (flag, text) => { const T = P.tasks; if (!T || T[flag]) return; T[flag] = 1; toast(text); };
  let acc = 0;
  onUpdate(dt => {
    if (!P || mode !== 'play' || paused || !fresh()) return;
    const T = P.tasks; if (!T || !T.fd) return;
    if (P.weapon && !P.stats.fdArm) P.stats.fdArm = 1;                         // взял в руки — засчитано, даже если потом убрал
    acc += dt; if (acc < .5) return; const step = acc; acc = 0;
    const [s, a, k] = T.list;
    if (s.done && !a.done) say('h1', 'Теперь найди, чем отбиться: нож на кухне, молоток в кладовке. Тапни вещь в рюкзаке — «Взять в руки»');
    if (a.done && !k.done) say('h2', 'Оружие в руках. Мертвецы идут на шум и на свет — бей первым, кнопка удара справа внизу');
    if (T.list.every(t => t.done) && !T.fdR) {
      T.fdR = 1; P.stress = Math.max(0, (P.stress || 0) - 20); logEv('Первый день: сделал всё по списку');
      toast('Первый день пережит по плану. Дальше сам: еда, вода и тихое место на ночь');
    }
    // сосед приходит, когда игрок уже осмотрелся: через ~80 секунд игры, если ещё никого не убил
    const F = world.fz || (world.fz = {t:0, s:0});
    if (!F.s && kills === 0) {
      F.t += step;
      if (F.t > 80 && !P.sleep && !P.car && hAt[Math.floor(P.y) * MW + Math.floor(P.x)]) {
        const z = spawnNeighbour();
        if (z) { F.s = 1; SFX.knock && SFX.knock(z.x, z.y); toast(P.weapon ? 'Снаружи кто-то есть. Шаркает к дому. Один — справишься' : 'Снаружи кто-то есть. Шаркает к дому. Найди, чем отбиться, пока он один'); }
        else F.t = 60;
      }
    } else if (!F.s) F.s = 1;
  });
  // в карманах соседа — часы и бинт
  const d0 = onZDeath;
  onZDeath = function (z) {
    const r = d0.apply(this, arguments);
    if (z && z.first) {
      let c = null; for (let k = corpses.length - 1; k >= 0 && k >= corpses.length - 4; k--) if (corpses[k].seed === z.seed) { c = corpses[k]; break; }
      const add = [mkItem('watchQ'), mkItem('bandage')];
      if (c && c.items) c.items.push(...add); else for (const it of add) addToPile(z.x, z.y, it);
      logEv('Упокоил соседа. Первый'); toast('Это был сосед. На руке у него часы — обыщи тело');
    }
    return r;
  };
  onSave(d => { d.xFD = {g:world.fdGiven ? 1 : 0, fz:world.fz || null}; });
  onLoad(d => { const x = d && d.xFD; world.fdGiven = x ? !!x.g : true; world.fz = x ? x.fz : {t:0, s:1}; });
}
