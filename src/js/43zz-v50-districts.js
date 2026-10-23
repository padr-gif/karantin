// ================= v50: бесконечный округ — соседние районы =================
// Игра без конца: остановить выживание может только смерть. Город — один район большого округа.
// Через бетонные блоки на блокпосту можно перелезть, дойти по трассе до края карты и уйти в соседний район.
// В памяти всегда живёт только один район (как и раньше, 184×184), поэтому игра не тяжелеет со временем:
// покинутый район сохраняется как сид + изменения (обысканное, двери, мертвецы…) и строится заново из сида,
// когда в него возвращаешься. Дальние районы опаснее, а пока тебя нет, районы пустеют и ветшают.

const DIST_KEEP = 16;                                               // сколько покинутых районов помнить (родной — всегда)
// поля сохранения, которые принадлежат району, а не выжившему
const DIST_FIELDS = ['obs', 'furn', 'fmov', 'cars', 'barrels', 'fires', 'zs', 'corpses', 'decals', 'piles', 'traps', 'gens', 'beds', 'drops',
  'pbin', 'moved', 'seen', 'marks', 'bcd', 'tcd', 'x23', 'x43'];
const DIST_NAMES = ['Заречье', 'Сосновка', 'Луговой', 'Кирпичный', 'Садовый', 'Нагорный', 'Тополиный', 'Вокзальный', 'Северный посёлок', 'Берёзовка',
  'Рабочий посёлок', 'Слободка', 'Затон', 'Кленовый', 'Новостройки', 'Старый парк', 'Промзона', 'Озёрный', 'Каменка', 'Липовый',
  'Дачный', 'Солнечный', 'Посёлок ГЭС', 'Ключи', 'Овражный', 'Песчаный', 'Мостовой', 'Ветряный', 'Рябиновка', 'Тихий', 'Хуторской', 'Элеватор'];
const mix32 = (a, b, c) => { let h = (a ^ Math.imul(b | 0, 0x9E3779B1) ^ Math.imul(c | 0, 0x85EBCA77)) >>> 0; h = Math.imul(h ^ (h >>> 16), 0x7feb352d); h = Math.imul(h ^ (h >>> 15), 0x846ca68b); return (h ^ (h >>> 16)) >>> 0; };
const distKey = (dx, dy) => dx + ',' + dy;
function distSeed(dx, dy) { return dx === 0 && dy === 0 ? world.root : mix32(world.root, dx * 7919 + 13, dy * 104729 + 7); }
function distName(dx, dy) { if (!dx && !dy) return 'Родной район'; return DIST_NAMES[mix32(world.root || 1, dx + 500, dy + 900) % DIST_NAMES.length]; }
function distRing(dx, dy) { return Math.max(Math.abs(dx), Math.abs(dy)); }
function distInit(root) { world.root = root >>> 0; world.dx = 0; world.dy = 0; world.dist = {}; world.visited = 1; }
const SIDE_D = {w:[-1, 0], e:[1, 0], n:[0, -1], s:[0, 1]};
const SIDE_NAME = {w:'на запад', e:'на восток', n:'на север', s:'на юг'};

// ---- сжатие покинутых районов (LZW в строку): район ~50 КБ → ~10 КБ, чтобы сохранение не пухло ----
// коды пишутся символами от 32 и в обход суррогатов, чтобы строка без потерь проходила через JSON и localStorage
const LZ_LIM = 0xFFFF - 0x800 - 32;
const lzCh = v => { let x = v + 32; if (x >= 0xD800) x += 0x800; return String.fromCharCode(x); };
const lzV = c => { let x = c.charCodeAt(0); if (x >= 0xE000) x -= 0x800; return x - 32; };
function lzPack(s) {
  const dict = new Map(), out = []; let next = 1, w = '';
  const emit = w => { if (w.length === 1 && !dict.has(w)) { const c = w.charCodeAt(0); out.push(lzCh(0), lzCh(c >> 8), lzCh(c & 255)); if (next < LZ_LIM) dict.set(w, next++); } else out.push(lzCh(dict.get(w))); };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (!w) { w = c; continue; }
    const wc = w + c;
    if (dict.has(wc)) w = wc;
    else { emit(w); if (next < LZ_LIM) dict.set(wc, next++); w = c; }
  }
  if (w) emit(w);
  return out.join('');
}
function lzUnpack(z) {
  const dict = [null], out = []; let prev = null;
  for (let i = 0; i < z.length;) {
    const v = lzV(z[i++]); let e;
    if (v === 0) {
      e = String.fromCharCode((lzV(z[i]) << 8) | lzV(z[i + 1])); i += 2;
      if (prev != null && dict.length < LZ_LIM) dict.push(prev + e[0]);
      if (dict.length < LZ_LIM) dict.push(e);
    } else {
      e = v < dict.length ? dict[v] : prev + prev[0];
      if (prev != null && dict.length < LZ_LIM) dict.push(prev + e[0]);
    }
    out.push(e); prev = e;
  }
  return out.join('');
}
const packDist = o => ({z:lzPack(JSON.stringify(o)), left:o.left});
const unpackDist = s => s && s.z != null ? JSON.parse(lzUnpack(s.z)) : s;

// ---- новая игра и сохранение ----
{ const sn = startNew; startNew = function () { sn(); distInit(world.seed); }; }
{ const ser = serialize;
  serialize = function () { const d = ser(); d.x50 = {root:world.root >>> 0, dx:world.dx || 0, dy:world.dy || 0, dist:world.dist || {}, vis:world.visited || 1}; return d; };
  const as = applySave;
  applySave = function (d) {
    as(d);
    const x = d && d.x50;
    if (x) { world.root = x.root >>> 0; world.dx = x.dx || 0; world.dy = x.dy || 0; world.dist = x.dist || {}; world.visited = x.vis || 1; }
    else distInit(d.seed);                                         // старое сохранение: его город и есть родной район
  };
}

// ---- перелезть через бетонный блок или мешки на блокпосту ----
const CLIMB_PROPS = new Set(['jersey', 'sandbag']);
const inPR = (p, x, y, m) => p.r && x > p.r[0] - m && x < p.r[2] + m && y > p.r[1] - m && y < p.r[3] + m;
function propsNear(x, y) { const out = []; for (let ty = Math.floor(y) - 1; ty <= Math.floor(y) + 1; ty++) for (let tx = Math.floor(x) - 1; tx <= Math.floor(x) + 1; tx++) { if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) continue; const k = propAt[ty * MW + tx]; if (k && !out.includes(props[k - 1])) out.push(props[k - 1]); } return out; }
function blockClimbPlan(dx, dy) {
  if (!P || P.car) return null;
  const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  const px = P.x + dx * (P.r + .14), py = P.y + dy * (P.r + .14);
  const p = propsNear(px, py).find(p => p.solid && CLIMB_PROPS.has(p.type) && inPR(p, px, py, .02));
  if (!p) return null;
  let t = P.r + .14;
  for (; t < 2.4; t += .05) {
    const x = P.x + dx * t, y = P.y + dy * t;
    if (!propsNear(x, y).some(q => q.solid && inPR(q, x, y, .02))) break;
    if (t > 1.9) return null;
  }
  const tx = P.x + dx * (t + P.r + .06), ty = P.y + dy * (t + P.r + .06);
  if (blocked(tx, ty, P.r)) return null;
  return {p, tx, ty};
}
{ const up = update;
  update = function (dt) {
    const x0 = P && P.x, y0 = P && P.y;
    up(dt);
    if (!P || mode !== 'play' || paused || P.car || P.act || P.sleep || !P.moving) { if (P) P._pushJ = 0; return; }
    if (Math.hypot(P.x - x0, P.y - y0) > dt * .5) { P._pushJ = 0; return; }
    P._pushJ = (P._pushJ || 0) + dt;
    if (P._pushJ < (P.running ? .15 : .35)) return;
    P._pushJ = 0;
    const pl = blockClimbPlan(Math.cos(P.face), Math.sin(P.face));
    if (pl) startClimb(pl);
  };
}
{ const ga = getActions;
  getActions = function () {
    const out = ga(), pl = blockClimbPlan(Math.cos(P.face), Math.sin(P.face));
    if (pl) out.push({kind:'climbj', label:'Перелезть через блок', pl});
    return out;
  };
  const da = doAction;
  doAction = function (a) {
    if (a && a.kind === 'climbj') { if (mode !== 'play' || paused || panel || P.sleep) return; $('actMenu').hidden = true; const pl = blockClimbPlan(a.pl.tx - P.x, a.pl.ty - P.y); if (pl) startClimb(pl); return; }
    da(a);
  };
  const an = actName; actName = function (a) { return a && a.kind === 'climbj' ? 'Перелезть' : an(a); };
}

// ---- край карты: уйти в соседний район ----
function edgeSide() {
  if (!P) return null;
  const m = .75;
  if (P.x < m) return 'w'; if (P.x > MW - m) return 'e'; if (P.y < m) return 'n'; if (P.y > MH - m) return 's';
  return null;
}
let travelAsk = null;
function closeTravelAsk() { if (travelAsk) { travelAsk.remove(); travelAsk = null; if ($('pause').hidden && !panel) paused = false; } }
function askTravel(side) {
  if (travelAsk) return;
  const [ox, oy] = SIDE_D[side], nx = (world.dx || 0) + ox, ny = (world.dy || 0) + oy, key = distKey(nx, ny);
  const known = !!(world.dist && world.dist[key]) || (nx === 0 && ny === 0), ring = distRing(nx, ny);
  paused = true; atkHeld = false; joy.id = null; joy.x = joy.y = 0; $('stick').hidden = true; P.moving = false;
  const box = travelAsk = mk('div', 'travelask');
  const card = mk('div', 'tcard');
  card.appendChild(mk('small', '', 'Граница района'));
  card.appendChild(mk('b', '', (known ? 'Вернуться: «' : 'Дальше ' + SIDE_NAME[side] + ': «') + distName(nx, ny) + '»'));
  card.appendChild(mk('p', '', known
    ? 'Ты здесь уже был. Всё осталось там, где ты бросил, но за это время мертвецов могло прибавиться.'
    : 'Чужой район: целые дома и нетронутые припасы, но и мертвецов больше' + (ring >= 2 ? ', а чем дальше от дома, тем их гуще' : '') + '. Этот район останется как есть — сюда можно вернуться.'));
  const row = mk('div', 'trow');
  const go = mk('button', 'mbtn go', 'Идти'); go.type = 'button';
  const stay = mk('button', 'mbtn', 'Остаться'); stay.type = 'button';
  go.onclick = () => { SFX.ui(); P._edgeHold = true; closeTravelAsk(); travelTo(side); };
  stay.onclick = () => { SFX.ui(); closeTravelAsk(); P._edgeHold = true; };
  row.appendChild(stay); row.appendChild(go); card.appendChild(row); box.appendChild(card);
  document.body.appendChild(box);
}
{ const up = update;
  update = function (dt) {
    up(dt);
    if (!P || mode !== 'play' || paused || P.sleep || traveling) return;
    const side = edgeSide();
    if (!side) { if (P.x > 2 && P.y > 2 && P.x < MW - 2 && P.y < MH - 2) P._edgeHold = false; return; }
    if (P._edgeHold || P.act) return;
    if (P.car) { if ((P._edgeMsgT || 0) < gameMin) { P._edgeMsgT = gameMin + 30; toast('Дальше дороги нет — машину придётся бросить'); } return; }
    askTravel(side);
  };
}

// куда встать в новом районе: на противоположном краю, ближе к той же линии
function entrySpot(side, along) {
  const pos = a => side === 'w' ? [MW - 1.2, a] : side === 'e' ? [1.2, a] : side === 'n' ? [a, MH - 1.2] : [a, 1.2];
  for (let d = 0; d < 60; d++) for (const s of d ? [d, -d] : [0]) for (const inw of [0, 1, 2, 3]) {
    const a = Math.max(2.5, Math.min((side === 'w' || side === 'e' ? MH : MW) - 2.5, along + s * .5));
    let [x, y] = pos(a);
    if (side === 'w') x -= inw; else if (side === 'e') x += inw; else if (side === 'n') y -= inw; else y += inw;
    if (!blocked(x, y, P.r + .05)) return [x, y];
  }
  return pos(EXIT_R + RW / 2);
}
function stripFromFresh() {                                                 // записки сюжета и особые находки есть только в родном городе
  const clean = c => { if (c && c.items) c.items = c.items.filter(it => !it.u && !it.story); };
  for (const f of furns) clean(f); for (const p of props) clean(p);
}
function pickDist(d) { const o = {}; for (const k of DIST_FIELDS) if (k in d) o[k] = d[k]; o.x49 = {caches:(d.x49 && d.x49.caches) || [], cats:(d.x49 && d.x49.cats) || []}; return o; }

function showRoad(text, cb) {
  let ov = $('roadov');
  if (!ov) { ov = mk('div'); ov.id = 'roadov'; document.body.appendChild(ov); }
  ov.textContent = text; ov.hidden = false; ov.style.opacity = '1';
  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => {
    try { cb(); } finally { ov.style.opacity = '0'; setTimeout(() => { ov.hidden = true; }, 500); }
  }, 30)));
}
let traveling = false;
function travelTo(side) {
  if (traveling) return;
  const [ox, oy] = SIDE_D[side], nx = (world.dx || 0) + ox, ny = (world.dy || 0) + oy;
  traveling = true; paused = true;
  showRoad('Дорога в район «' + distName(nx, ny) + '»…', () => { try { doTravel(side, nx, ny); } finally { traveling = false; if ($('pause').hidden && !panel && !travelAsk) paused = false; } });
}
function doTravel(side, nx, ny) {
  const along = side === 'w' || side === 'e' ? P.y : P.x;
  closePanel(); P.act = null;
  const cur = JSON.parse(JSON.stringify(serialize()));
  const fromKey = distKey(world.dx || 0, world.dy || 0), toKey = distKey(nx, ny);
  world.dist = world.dist || {};
  const snap = pickDist(cur); snap.left = gameMin; world.dist[fromKey] = packDist(snap);
  // помним не больше DIST_KEEP районов: забытые застроятся заново из сида
  const keys = Object.keys(world.dist).filter(k => k !== '0,0' && k !== toKey).sort((a, b) => (world.dist[a].left || 0) - (world.dist[b].left || 0));
  while (keys.length > DIST_KEEP) delete world.dist[keys.shift()];
  let stored = unpackDist(world.dist[toKey]), fresh = !stored;
  const seed = distSeed(nx, ny), root = world.root, dist = world.dist;
  if (fresh) {                                                              // новый район: строим и заселяем
    newGame({seed, diff:cur.diff, look:cur.look});
    stripFromFresh();
    const day = Math.floor((cur.gm - cur.sm) / 1440), extra = Math.min(1.6, .22 * distRing(nx, ny) + .03 * day);
    const n = Math.round(125 * DIFF[cur.diff || 'normal'].z * extra);
    for (let i = 0; i < n; i++) spawnZombie(11, true);
    stored = pickDist(JSON.parse(JSON.stringify(serialize())));
  }
  delete dist[toKey];
  const d = Object.assign({}, cur, stored, {seed, incar:-1, evac:null});
  d.x49 = Object.assign({}, cur.x49 || {}, {caches:stored.x49.caches, cats:stored.x49.cats});
  d.x50 = {root, dx:nx, dy:ny, dist, vis:(cur.x50 && cur.x50.vis || 1) + (fresh ? 1 : 0)};
  applySave(d);
  gameMin += 30;                                                            // дорога по трассе — полчаса
  const [x, y] = entrySpot(side, along);
  P.x = x; P.y = y; P.act = null; P.moving = false; P._edgeHold = true; P.fd = P.face = Math.atan2(MH / 2 - y, MW / 2 - x);
  // зомби не стоят прямо у входа
  zs = zs.filter(z => Math.hypot(z.x - P.x, z.y - P.y) > 9);
  const away = fresh ? 0 : Math.max(0, (gameMin - (stored.left || gameMin)) / 1440);
  if (away >= 1) {                                                          // пока тебя не было: забрели новые мертвецы, город обветшал
    const n = Math.min(70, Math.round(9 * away * DIFF[world.diff].z));
    for (let i = 0; i < n; i++) spawnZombie(18, false);
    for (let k = 0; k < Math.min(4, Math.floor(away)); k++) decayDay();
  } else if (fresh) { const day = Math.floor((gameMin - startMin) / 1440); for (let k = 0; k < Math.min(6, Math.floor(day / 3)); k++) decayDay(); }
  camX = P.x; camY = P.y; computeVis(); buildFlow(); fogDirty = true; clearCaches();
  const nm = distName(nx, ny);
  eventBanner(nm, fresh ? 'Новый район. Перелезь через блоки на блокпосту, чтобы попасть в город.' : 'Ты вернулся. Всё там, где ты оставил.', '', 'i-map');
  logEv((fresh ? 'Пришёл в район «' : 'Вернулся в район «') + nm + '»');
  if ((world.visited || 1) >= 5) ach('nomad');
  if (distRing(nx, ny) >= 3) ach('farland');
  updateHud();
}
ACH.push(['nomad', 'Кочевник', 'Побывать в 5 районах'], ['farland', 'Дальние земли', 'Уйти на 3 района от дома']);

// ---- стили ----
{ const st = document.createElement('style');
  st.textContent = `
.travelask{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(6,8,10,.55);padding:16px}
.travelask .tcard{max-width:420px;width:100%;background:#151a1e;border:1px solid #2c343a;border-radius:10px;padding:16px 18px;color:#d9d4c7;font-family:"PT Sans",sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.6)}
.travelask small{display:block;font:600 11px "PT Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:#8d9a93;margin-bottom:4px}
.travelask b{display:block;font:600 21px Oswald,sans-serif;color:#efe7d2;margin-bottom:8px}
.travelask p{margin:0 0 14px;font-size:14px;line-height:1.4;color:#b9b4a7}
.travelask .trow{display:flex;gap:10px;justify-content:flex-end}
.travelask .trow .mbtn{min-width:120px}
#roadov{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:#0c0f12;color:#d9d4c7;font:500 20px Oswald,sans-serif;letter-spacing:.04em;transition:opacity .45s}
#roadov[hidden]{display:none}`;
  document.head.appendChild(st);
}
