// ================= snow, mood, moving furniture =================
Object.assign(ITEMS, {
  novel:{name:'Роман в мягкой обложке', sh:'Роман', kind:'fun', fun:50, dur:7, verb:'Читать'},
  cards:{name:'Колода карт', sh:'Карты', kind:'fun', fun:35, dur:5, keep:true, verb:'Разложить пасьянс'},
  cigs:{name:'Сигареты', kind:'smoke', uses:10, verb:'Закурить'},
});
Object.assign(DESC, {
  novel:'Затёртый детектив. Чтение отлично прогоняет скуку.',
  cards:'Колода игральных карт. Пасьянс скрашивает долгие вечера, а колода остаётся с тобой.',
  cigs:'Пачка сигарет. Затяжка успокаивает нервы, но нужен огонь — спички или зажигалка.',
});
ICONA.novel = 'novel';
{ const add = (k, ...ids) => CONT[k].loot.push(...ids); add('bookshelf', 'novel', 'novel'); add('nightstand', 'novel', 'cigs', 'cards'); add('dresser', 'cards'); add('counter', 'cigs', 'cigs'); add('car', 'cigs'); add('desk', 'cigs', 'cards'); add('locker', 'cigs'); add('armybox', 'cigs', 'cards'); add('shelf', 'novel'); }
// ---- snow ----
function outsideTemp() { const h = (gameMin % 1440) / 60, day = Math.floor(gameMin / 1440); return 10 + 6 * Math.sin((h - 9) / 24 * 6.283) - seasonDrop(day) - rain * 2 - (weekMod() === 'cold' ? 8 : 0); }
const snowing = () => rain > .5 && outsideTemp() < -2;
function updateSnow(gm) {
  world.snow = world.snow || 0;
  if (snowing()) world.snow = Math.min(1, world.snow + gm / 500);
  else if (outsideTemp() > 3) world.snow = Math.max(0, world.snow - gm / (rain > .5 ? 120 : 400));
  if (snowing() && !world.snowMsg) { world.snowMsg = true; toast('Пошёл снег. Зима близко'); }
  { const sn = seasonName(), k = sn.includes('зима') ? 'w' : sn.includes('весна') ? 's' : sn.includes('лето') ? 'u' : 'a'; if (world.season && world.season !== k) { toast({w:'Пришла зима. Держись в тепле', s:'Весна! Снег тает, днём теплеет', u:'Лето. Жара, долгие дни и короткие ночи', a:'Осень. Холодает, листья желтеют'}[k]); if (k === 's') ach('winter'); if (k === 'w') world.snowMsg = false; } world.season = k; }
}
function drawSnowCover(x0, y0, x1, y1) {
  const s = world.snow || 0; if (s < .03) return;
  groundT(0);
  const a = Math.min(1, s * 1.25);
  for (const kind of ['ground', 'road']) {
    ctx.beginPath(); let any = false;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * MW + x, t = map[i]; if (t === FLOOR || isWallish(t) || hAt[i] || t === WATER) continue;
      const road = t === ROAD || t === WALK; if (road !== (kind === 'road')) continue;
      ctx.rect(x - .01, y - .01, 1.02, 1.02); any = true;
    }
    if (!any) continue;
    ctx.globalAlpha = kind === 'road' ? a * .86 : a; ctx.fillStyle = snowPat(kind); ctx.fill();
  }
  // footprints
  ctx.globalAlpha = 1;
  for (const f of BZ.steps || []) {
    if (f.x < x0 - 1 || f.x > x1 + 1 || f.y < y0 - 1 || f.y > y1 + 1) continue;
    const al = (1 - f.t / 120) * .5 * a; if (al <= 0) continue;
    ctx.fillStyle = `rgba(120,132,152,${al})`; ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a); ctx.beginPath(); ctx.ellipse(0, 0, .09, .045, 0, 0, 6.283); ctx.fill(); ctx.restore();
  }
  resetT();
}
// ---- mood ----
function updateMood(gm, dt) {
  P.stress = P.stress || 0; P.bored = P.bored || 0;
  const chasing = zs.filter(z => z.state === 'chase' && Math.hypot(z.x - P.x, z.y - P.y) < 8).length;
  if (chasing) P.stress = Math.min(100, P.stress + gm * .35 * Math.min(3, chasing));
  else if (lightLevel() < .3 && !insideHouse(P.x, P.y)) P.stress = Math.min(100, P.stress + gm * .04);
  P.stress = Math.max(0, P.stress - gm * (P.sleep ? .25 : .03));
  if (!P.sleep) P.bored = Math.min(100, P.bored + gm * (insideHouse(P.x, P.y) && !P.moving ? .05 : .012));
}
function moodText() { const m = []; if (P.stress > 60) m.push('Стресс: удары слабее. Помогут сон, сигареты или виски'); if (P.bored > 60) m.push('Скука: навыки растут медленнее. Почитай, раскинь карты, посмотри ТВ'); return m; }
// ---- moving furniture ----
function moveFurn(f) {
  if (f.big) { toast('Слишком большое: двигай в режиме обустройства'); return false; }
  const ax = f.cx - P.x, ay = f.cy - P.y, dx = Math.abs(ax) > Math.abs(ay) ? Math.sign(ax) : 0, dy = dx ? 0 : Math.sign(ay);
  const nx = f.x + dx, ny = f.y + dy, i = ny * MW + nx, oi = f.y * MW + f.x;
  const t = get(nx, ny);
  if (!(t === FLOOR || (t === DOOR && obs[i] && obs[i].open && !obs[i].dead)) || furn[i] || propAt[i] || zs.some(z => Math.floor(z.x) === nx && Math.floor(z.y) === ny)) { toast('Дальше не сдвинуть'); return false; }
  const idx = furn[oi]; furn[oi] = 0; furn[i] = idx; f.moved = true;
  f.x = nx; f.y = ny; f.cx += dx; f.cy += dy; f.r = [f.r[0] + dx, f.r[1] + dy, f.r[2] + dx, f.r[3] + dy];
  if (t === DOOR) { f.cx = nx + .5; f.cy = ny + .5; const w = f.r[2] - f.r[0], h2 = f.r[3] - f.r[1]; f.r = [f.cx - w / 2, f.cy - h2 / 2, f.cx + w / 2, f.cy + h2 / 2]; f.blockDoor = true; }
  for (const ch of chunksNear(f.x + .5, f.y + .5, 2)) for (const [k, v] of CHUNKS) if (v === ch) CHUNKS.delete(k);
  SFX.wood(f.cx, f.cy); noise(f.cx, f.cy, 6); P.en = Math.max(0, P.en - 2);
  toast(t === DOOR ? 'Проход загорожен мебелью' : 'Мебель сдвинута'); buildFlow();
  return true;
}
