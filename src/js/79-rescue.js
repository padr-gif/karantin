// ================= сигнализация в доме и привычное оружие =================
// Людей в игре нет и концовки нет: конец — только смерть героя (см. CLAUDE.md).
// Сигнализация: раз в несколько дней в чужом доме срабатывает охранная сигнализация (батарея ещё жива). Дом отмечается
//   на карте, мертвецы тянутся на вой и бродят вокруг. Дошёл до утра — выключаешь её, кладовка цела, припасы твои;
//   опоздал — мертвецы выломали дверь и растоптали всё. Цель на день и повод выйти из дома.
// Привычное оружие: оружие помнит, сколько мертвецов им убито; на 10, 30 и 75 оно «ложится в руку» — урон выше (dmgK).
const SOS_REWARD = ['canned', 'stew', 'mre', 'water', 'water', 'bandage', 'antibio', 'medkit', 'painkill', 'antisep', 'battery', 'matches', 'ammo9'].filter(id => ITEMS[id]);
const sosHouse = s => { const H = s && houses[hAt[s.y * MW + s.x] - 1]; return H && H.x === s.hx && H.y === s.hy ? H : null; };
function sosUnmark(s) { const L = world.marks || []; for (let k = L.length - 1; k >= 0; k--) if (Math.abs(L[k].x - s.x) < 1 && Math.abs(L[k].y - s.y) < 1 && !L[k].t) L.splice(k, 1); }
function sosStart() {
  const L = houses.filter((H, i) => H.kind === 'house' && H.rooms && i + 1 !== spawnHouse && !H.sosDone).map(H => [H, Math.hypot(H.x + H.w / 2 - P.x, H.y + H.h / 2 - P.y)]).filter(([, d]) => d > 22 && d < 85);
  if (!L.length) return false;
  const [H] = pick(L), x = Math.round(H.x + H.w / 2), y = Math.round(H.y + H.h / 2);
  if (!hAt[y * MW + x]) return false;
  world.sos = {x, y, hx:H.x, hy:H.y, until:gameMin + 1440};
  markMap(x, y);
  eventBanner('Сигнализация', 'В чужом доме воет охранная сигнализация, мертвецы тянутся на звук. Внутри, похоже, нетронутая кладовка. Дом на карте — успей до утра', 'warn', 'i-horn');
  logEv('Где-то воет сигнализация. Мертвецы идут туда. Отметил дом на карте');
  for (let k = ri(5, 9); k > 0; k--) {                                       // мертвецы скребутся у дома
    const a = rng() * 6.283, r = Math.max(H.w, H.h) / 2 + 1.5 + rng() * 2.5, zx = H.x + H.w / 2 + Math.cos(a) * r, zy = H.y + H.h / 2 + Math.sin(a) * r;
    if (!blocked(zx, zy, .3) && zx > 2 && zy > 2 && zx < MW - 2 && zy < MH - 2) zType(mkZombie(zx, zy, zPal(), ri(48, 72), (.82 + rng() * .3) * DIFF[world.diff].spd));
  }
  noise(x, y, 10);
  return true;
}
function sosEnd(ok) {
  const s = world.sos, H = sosHouse(s); world.sos = null; world.sosNext = gameMin + 1440 * (2 + rng() * 2) / Math.max(.05, world.sosK != null ? world.sosK : 1); sosUnmark(s);
  if (H) H.sosDone = true;
  if (ok) {
    const n = ri(3, 5); for (let k = 0; k < n; k++) addToPile(P.x, P.y, mkItem(pick(SOS_REWARD)));
    P.unh = Math.max(0, (P.unh || 0) - 15); P.bored = Math.max(0, (P.bored || 0) - 30);
    eventBanner('Тишина', 'Выдрал провода — сигнализация смолкла. Кладовка цела: припасы у твоих ног', 'ok', 'i-star');
    logEv('Заглушил сигнализацию в чужом доме. Кладовка нетронута — забрал припасы');
  } else {
    P.unh = Math.min(100, (P.unh || 0) + 5);
    eventBanner('Сигнализация смолкла', 'Не успел: мертвецы выломали дверь и растоптали всё, что там было', '', 'i-skull');
    logEv('Не успел к дому с сигнализацией. Мертвецы всё растоптали');
  }
}
{ let chk = 0, more = 0;
  onUpdate(dt => {
    if (!P || mode !== 'play' || P.sleep) return;
    chk -= dt; if (chk > 0) return; chk = .5;
    const s = world.sos;
    if (s) {
      const H = sosHouse(s); if (!H) { world.sos = null; sosUnmark(s); return; }   // другой район или дом пропал
      if (gameMin > s.until) { sosEnd(false); return; }
      if (P.x > H.ix0 && P.x < H.ix1 && P.y > H.iy0 && P.y < H.iy1) { sosEnd(true); return; }
      if (gameMin > more) { more = gameMin + 120; noise(s.x, s.y, 12); }    // вой не смолкает: подтягивает новых
      return;
    }
    if (world.sosK === 0) return;                                          // сигнализации выключены в настройках мира
    if (world.sosNext == null) world.sosNext = gameMin + 1440 * 1.5 / Math.max(.05, world.sosK != null ? world.sosK : 1);
    if (gameMin > world.sosNext && lightLevel() > .3 && !zs.some(z => z.state === 'chase')) { if (!sosStart()) world.sosNext = gameMin + 240; }
  });
  onSave(d => { d.x79 = {sos:world.sos || null, next:world.sosNext == null ? null : Math.round(world.sosNext), done:houses.map((H, i) => H.sosDone ? i : -1).filter(i => i >= 0)}; });
  onLoad(d => { const x = (d && d.x79) || {}; world.sos = x.sos || null; world.sosNext = x.next == null ? null : x.next; for (const i of x.done || []) if (houses[i]) houses[i].sosDone = true; });
  onStartNew(() => { world.sos = null; world.sosNext = null; });
}

// ---- привычное оружие: счёт убийств на самой вещи ----
const WK_NAMES = ['пристрелялся', 'лежит в руке', 'как продолжение руки'];   // уровни — wkLv в 06-actions
{ let k0 = -1;
  onUpdate(() => {
    if (!P) return;
    if (k0 >= 0 && kills > k0 && P.weapon && ITEMS[P.weapon.id]) {
      const w = P.weapon, lv = wkLv(w); w.kx = (w.kx || 0) + (kills - k0);
      if (wkLv(w) > lv) { const n = ITEMS[w.id].sh || ITEMS[w.id].name; toast(n + ': ' + WK_NAMES[wkLv(w) - 1] + ' — урон +' + wkLv(w) * 8 + '%'); logEv(n + ' — уже ' + w.kx + ' мертвецов. Привык к нему'); }
    }
    k0 = kills;
  });
  onLoad(() => { k0 = -1; }); onStartNew(() => { k0 = -1; });
}
