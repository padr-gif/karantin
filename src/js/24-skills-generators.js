// ================= skills, generators & fuel, gardening, helicopter & airdrops =================
Object.assign(ITEMS, {
  generator:{name:'Генератор', kind:'generator', verb:'Установить'},
  jerrycan: {name:'Канистра', kind:'fuel', verb:'Осмотреть'},
  seeds:    {name:'Семена овощей', sh:'Семена', kind:'seeds', uses:4, verb:'Как сажать?'},
  carrot:   {name:'Морковь', kind:'food', sat:10, hyd:4, rot:true, verb:'Съесть'},
  potato:   {name:'Картофель', sh:'Картошка', kind:'food', sat:8, rot:true, raw:'potatoC', verb:'Съесть сырым'},
  potatoC:  {name:'Варёная картошка', sh:'Картошка', kind:'food', sat:36, verb:'Съесть'},
  cabbage:  {name:'Капуста', kind:'food', sat:12, hyd:6, rot:true, verb:'Съесть'},
});
Object.assign(DESC, {
  generator:'Бензиновый генератор. Поставь у дома, залей бензин и включи: в радиусе нескольких метров будет свет и заработает плита. Тарахтит громко.',
  jerrycan:'Канистра для бензина. Наполняется у колонки на заправке, пока есть электричество. Нужна для генератора.',
  seeds:'Пакетики с семенами моркови, картошки и капусты. Сколоти грядку из досок (вкладка «Создать»), посади и поливай.',
  carrot:'Свежая морковь с грядки.', potato:'Картошка. Сырой много не наешься, лучше сварить в кастрюле.', potatoC:'Горячая варёная картошка. Сытно.',
  cabbage:'Кочан капусты. Немного еды и воды.',
});
const ICONA = {potatoC:'potato'};
COOK.push({id:'potatoC', raw:'potato', tool:'pot', toolName:'кастрюля', water:true});
Object.assign(CONT, {pond:{name:'Пруд'}, snow:{name:'Снег'}, gen:{name:'Генератор'}, pump:{name:'Колонка'}, gbed:{name:'Грядка'}, trap:{name:'Капкан'}, airdrop:{name:'Сброшенный груз', loot:['mre','mre','medkit','antibio','vest','canteen','battery','map','seeds','jerrycan','energy','water','bandage','stew'], n:[4,6]}});
SPRA.airdrop = 'crate';
{
  const add = (k, ...ids) => CONT[k].loot.push(...ids);
  add('toolrack', 'jerrycan', 'seeds', 'seeds', 'generator'); add('crate', 'jerrycan', 'seeds'); add('counter', 'jerrycan'); add('armybox', 'jerrycan');
  add('car', 'jerrycan'); add('cabinet', 'seeds');
}
// ---- skills ----
const SKILLS = {fight:{name:'Ближний бой', per:'+6% урона за уровень'}, carp:{name:'Плотничество', per:'быстрее и прочнее баррикады'}, cook:{name:'Кулинария', per:'+10% сытости готовой еды'}, farm:{name:'Огородничество', per:'больше урожай, быстрее растёт'}};
const XPL = [0, 4, 12, 26, 48, 80];
function skillLv(k) { const xp = (P.skills && P.skills[k]) || 0; let l = 0; while (l < 5 && xp >= XPL[l + 1]) l++; return l; }
// опыт в навыке: черты, уныние, журналы (P.boost) и скука меняют скорость; новый уровень — в сообщение и дневник
function addXp(k, n) {
  let m = 1; if (hasTr('fastlearn')) m *= 1.3; if (hasTr('slowlearn')) m *= .7; if ((P.unh || 0) > 50) m *= .75; n *= m;
  const bst = P.boost && P.boost[k]; if (bst && skillLv(k) <= bst.max) n *= bst.mult; else if (bst) delete P.boost[k];
  if ((P.bored || 0) > 60) n *= .5;
  P.skills = P.skills || {}; const b = skillLv(k); P.skills[k] = (P.skills[k] || 0) + n;
  const a = skillLv(k); if (a > b) { toast(`Навык «${SKILLS[k].name}» вырос до ${a}`); SFX.equip(); logEv('Навык «' + SKILLS[k].name + '» вырос до ' + a); }
}
// ---- generators ----
let gens = [], beds = [], airdrops = [], heli = null;
function poweredAt(x, y) { if (powerOn()) return true; for (const g of gens) if (g.on && g.fuel > 0 && Math.hypot(g.cx - x, g.cy - y) < 7.5) return true; return false; }
function freeFront() {
  let [tx, ty] = frontTile();
  if (tileFree(tx, ty)) return [tx, ty];
  const cx = Math.floor(P.x), cy = Math.floor(P.y);
  const o = D8.map(([a, b]) => [cx + a, cy + b]).find(([x, y]) => tileFree(x, y));
  return o || null;
}
function placeGen(k) {
  const it = P.inv[k], t = freeFront(); if (!t) { toast('Нет места, чтобы поставить генератор'); return; }
  const [x, y] = t, p = {type:'gen', proc:true, cx:x + .5, cy:y + .5, solid:true, r:[x + .2, y + .25, x + .8, y + .75], fuel:it.fuel || 0, on:false};
  if (!addProp(p, [[x, y]])) { toast('Нет места'); return; }
  gens.push(p); P.inv.splice(k, 1); closePanel(); SFX.knock(p.cx, p.cy);
  toast(p.fuel > 0 ? 'Генератор установлен. Подойди и включи' : 'Генератор установлен, но бак пуст. Нужна канистра бензина');
}
function fuelCans() { return P.inv.filter(i => i.id === 'jerrycan' && i.fuel > 0); }
function updateGens(dt, gm) {
  for (const g of gens) {
    if (!g.on) continue;
    g.fuel = Math.max(0, g.fuel - gm / 20);
    g.nT = (g.nT || 0) - dt; if (g.nT <= 0) { g.nT = 3; noise(g.cx, g.cy, 9); }
    g.sT = (g.sT || 0) - dt; if (g.sT <= 0) { g.sT = .16; SFX.gen(g.cx, g.cy); }
    if (!reduceMotion && Math.random() < dt * 4) emit('smoke', g.cx + .25, g.cy - .1, .5, 1, null, 0, .3);
    if (g.fuel <= 0) { g.on = false; if (Math.hypot(g.cx - P.x, g.cy - P.y) < 15) toast('Генератор заглох: кончился бензин'); }
  }
}
// ---- gardening ----
function placeBed() {
  const t = freeFront(); if (!t) { toast('Нет места для грядки'); return false; }
  const [x, y] = t;
  if (map[y * MW + x] !== GRASS || insideHouse(x + .5, y + .5)) { toast('Грядку можно сделать только на траве под открытым небом'); return false; }
  for (let k = 0; k < 3; k++) removeItem('plank');
  const p = {type:'gbed', proc:true, cx:x + .5, cy:y + .5, solid:false, r:[x + .06, y + .06, x + .94, y + .94], crop:null, g:0, w:0, dry:0};
  addProp(p, [[x, y]]); beds.push(p); toggleInv(false); toast('Грядка готова. Посади семена');
  return true;
}
function waterSource() { return P.inv.find(i => i.id === 'water') || P.inv.find(i => ITEMS[i.id].kind === 'canteen' && i.w > 0); }
function updateBeds(gm) {
  const t = outsideTemp();
  if (t < -3) { for (const b of beds) if (b.crop && b.g < 1) { b.crop = null; b.g = 0; if (Math.hypot(b.cx - P.x, b.cy - P.y) < 14) toast('Заморозки погубили всходы на грядке'); } return; }
  if (t < 4) { for (const b of beds) if (rain > .5) b.w = 1; return; }      // холодно: не растёт, но дождь поливает
  for (const b of beds) {
    if (rain > .5) b.w = 1;
    if (!b.crop || b.g >= 1) continue;
    if (b.w > 0) { b.g = Math.min(1, b.g + gm / (2880 * (1 - .08 * skillLv('farm')))); b.w = Math.max(0, b.w - gm / 720); b.dry = 0; }
    else { b.dry += gm; if (b.dry > 1800) { b.crop = null; b.g = 0; b.dry = 0; if (Math.hypot(b.cx - P.x, b.cy - P.y) < 14) toast('Всходы на грядке засохли без воды'); } }
  }
}
// ---- helicopter ----
function scheduleHeli(from) { world.heliAt = from + 1440 * ri(1, 2) + ri(-240, 360); }
function startHeli() {
  const a = rng() * 6.283;
  heli = {x:P.x + Math.cos(a) * 42, y:P.y + Math.sin(a) * 42, ph:'in', hover:75, ang:0, lx:P.x, ly:P.y, vx:0, vy:0, nT:0, sT:0, drop:rng() < .65};
  if (P.sleep) wake('Тебя разбудил гул вертолёта');
  toast('Слышен гул вертолёта. Он привлечёт мертвецов со всей округи');
  scheduleHeli(gameMin);
}
function updateHeli(dt) {
  if (!heli) { if (gameMin >= world.heliAt) startHeli(); return; }
  const h = heli, inside = insideHouse(P.x, P.y);
  if (!inside) { h.lx = P.x; h.ly = P.y; }
  let tx, ty, sp = 7;
  if (h.ph === 'in') { tx = h.lx; ty = h.ly; if (Math.hypot(h.x - tx, h.y - ty) < 3) h.ph = 'hover'; }
  else if (h.ph === 'hover') {
    h.ang += dt * .45; tx = h.lx + Math.cos(h.ang) * 3.2; ty = h.ly + Math.sin(h.ang) * 3.2; sp = 4.5;
    h.hover -= dt * (inside ? 2.2 : 1);
    if (h.hover <= 0) {
      h.ph = 'out'; const a = Math.atan2(h.y - P.y, h.x - P.x); h.ox = P.x + Math.cos(a) * 60; h.oy = P.y + Math.sin(a) * 60;
      if (h.drop) dropSupply();
    }
  } else { tx = h.ox; ty = h.oy; sp = 8; if (Math.hypot(h.x - P.x, h.y - P.y) > 50) { heli = null; if (mode === 'play') ach('heli'); return; } }
  const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy) || 1, v = Math.min(sp, d * 1.5);
  h.vx += ((dx / d) * v - h.vx) * Math.min(1, dt * 1.5); h.vy += ((dy / d) * v - h.vy) * Math.min(1, dt * 1.5);
  h.x += h.vx * dt; h.y += h.vy * dt;
  h.nT -= dt; if (h.nT <= 0) { h.nT = 1.2; noise(h.x, h.y, h.ph === 'out' ? 14 : 22); }
  h.sT -= dt; if (h.sT <= 0) { h.sT = .085; SFX.heli(Math.max(0, 1 - Math.hypot(h.x - P.x, h.y - P.y) / 48)); }
  const near = Math.hypot(h.x - P.x, h.y - P.y);
  if (near < 6 && !reduceMotion && settings.shake) shake = Math.max(shake, .06);
}
function dropSupply() {
  for (let t = 0; t < 200; t++) {
    const a = rng() * 6.283, r = 14 + rng() * 14, x = Math.floor(P.x + Math.cos(a) * r), y = Math.floor(P.y + Math.sin(a) * r);
    if (!insideFence(x, y) || !tileFree(x, y) || hAt[y * MW + x] || (map[y * MW + x] !== GRASS && map[y * MW + x] !== ROAD && map[y * MW + x] !== WALK)) continue;
    airdrops.push({x:x + .5, y:y + .5, z:300, landed:false, tx:x, ty:y});
    toast('С вертолёта сбросили груз на парашюте! Место отмечено на карте');
    return;
  }
}
function landDrop(a) {
  a.landed = true; a.z = 0;
  const x = a.tx, y = a.ty, i = y * MW + x;
  if (furn[i] || propAt[i]) return;
  const sx = .7, sy = .7, f = {x, y, type:'airdrop', items:[], searched:false, wd:[0, 1], cx:x + .5, cy:y + .5, sx, sy, r:[x + .15, y + .15, x + .85, y + .85], air:true};
  if (!a.items) for (let n = ri(CONT.airdrop.n[0], CONT.airdrop.n[1]); n > 0; n--) f.items.push(mkItem(pick(CONT.airdrop.loot)));
  else { f.items = a.items; f.searched = !!a.searched; }
  furns.push(f); furn[i] = furns.length; a.f = f; seen[i] = 1;
  SFX.knock(a.x, a.y); noise(a.x, a.y, 12);
}
function updateDrops(dt) { for (const a of airdrops) if (!a.landed) { a.z -= dt * 26; if (a.z <= 0) landDrop(a); } }
function drawChute(a) {
  const sx = SX(a.x, a.y), sy = SY(a.x, a.y, a.z);
  if (!a.landed) {
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(SX(a.x, a.y), SY(a.x, a.y, 0), 9, 4, 0, 0, 6.283); ctx.fill();
    const sw = Math.sin(animT * 1.6) * 3, top = sy - 34;
    ctx.strokeStyle = 'rgba(40,40,40,.7)'; ctx.lineWidth = .5; ctx.beginPath();
    for (const k of [-14, -6, 6, 14]) { ctx.moveTo(sx + sw + k, top + 4); ctx.lineTo(sx, sy - 5); } ctx.stroke();
    ctx.fillStyle = '#e8e4d8'; ctx.beginPath(); ctx.ellipse(sx + sw, top, 17, 9, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#d0472f'; ctx.beginPath(); ctx.ellipse(sx + sw, top, 6, 9, 0, Math.PI, 0); ctx.fill();
    box(a.x - .3, a.y - .3, a.x + .3, a.y + .3, a.z - 12, a.z, [110, 120, 80], 1);
  } else {
    // canopy draped over the ground next to the crate
    const gx = SX(a.x + .7, a.y + .3), gy = SY(a.x + .7, a.y + .3, 0);
    ctx.fillStyle = 'rgba(232,228,216,.9)'; ctx.beginPath(); ctx.ellipse(gx, gy, 13, 5, .3, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(208,71,47,.9)'; ctx.beginPath(); ctx.ellipse(gx + 2, gy, 5, 4, .3, 0, 6.283); ctx.fill();
  }
}
function drawHeli() {
  if (!heli) return;
  const h = heli, alt = 175, K = 2.4, gx = SX(h.x, h.y), gy = SY(h.x, h.y, 0), bx = gx, by = SY(h.x, h.y, alt);
  const lv = Math.max(.32, lightLevel()), col = (r, g, b, a) => `rgba(${r * lv | 0},${g * lv | 0},${b * lv | 0},${a == null ? 1 : a})`;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(gx, gy, 26 * K, 11 * K, 0, 0, 6.283); ctx.fill();
  const svx = (h.vx - h.vy) * U, svy = (h.vx + h.vy) * hh, ang = Math.hypot(svx, svy) > 2 ? Math.atan2(svy, svx) : (h.sa || 0); h.sa = ang;
  ctx.save(); ctx.translate(bx, by); ctx.scale(K, K); ctx.rotate(ang);
  ctx.strokeStyle = col(43, 48, 36); ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-34, -2); ctx.stroke();
  ctx.fillStyle = col(61, 74, 51); ctx.beginPath(); ctx.ellipse(0, 0, 17, 8.5, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = col(84, 100, 70); ctx.beginPath(); ctx.ellipse(-2, -2.5, 12, 4, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = `rgba(150,190,210,${.55 + .3 * lv})`; ctx.beginPath(); ctx.ellipse(9, -1, 6, 5, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = col(29, 31, 26); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-10, 9); ctx.lineTo(12, 9); ctx.moveTo(-10, -9); ctx.lineTo(12, -9); ctx.stroke();
  ctx.fillStyle = col(43, 48, 36); ctx.fillRect(-36, -7, 3, 9);
  ctx.fillStyle = col(200, 60, 50); ctx.fillRect(-14, -1, 6, 2); ctx.fillRect(-12, -3, 2, 6);
  const tr = animT * 50; ctx.strokeStyle = col(20, 22, 18, .7); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(-34.5 + Math.cos(tr) * 4, -2.5 + Math.sin(tr) * 4); ctx.lineTo(-34.5 - Math.cos(tr) * 4, -2.5 - Math.sin(tr) * 4); ctx.stroke();
  ctx.restore();
  const ra = animT * 28, R = 36 * K, Ry = 17 * K;
  ctx.fillStyle = col(30, 32, 28, .16); ctx.beginPath(); ctx.ellipse(bx, by - 6 * K, R, Ry, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = col(20, 22, 18, .8); ctx.lineWidth = 1.6 * K; ctx.beginPath();
  for (const k of [0, Math.PI / 2]) { const c = Math.cos(ra + k), sn = Math.sin(ra + k); ctx.moveTo(bx - c * R, by - 6 * K - sn * Ry); ctx.lineTo(bx + c * R, by - 6 * K + sn * Ry); }
  ctx.stroke();
  if (Math.floor(animT * 2.5) % 2) { ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(bx, by + 8 * K, 2.2, 0, 6.283); ctx.fill(); }
}
function drawHeliLight() {
  if (!heli || lightLevel() > .55) return;
  const h = heli, gx = SX(h.lx, h.ly), gy = SY(h.lx, h.ly, 0), bx = SX(h.x, h.y), by = SY(h.x, h.y, 175);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,250,220,.07)'; ctx.beginPath(); ctx.moveTo(bx - 3, by); ctx.lineTo(gx - 26, gy); ctx.lineTo(gx + 26, gy); ctx.lineTo(bx + 3, by); ctx.closePath(); ctx.fill();
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 40); g.addColorStop(0, 'rgba(255,250,220,.45)'); g.addColorStop(1, 'rgba(255,250,220,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(gx, gy, 40, 22, 0, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}
// ---- procedural props for these systems ----
function drawGen(p, f) {
  const [x0, y0, x1, y1] = p.r, j = p.on ? Math.sin(animT * 70) * .01 : 0;
  box(x0 + j, y0, x1 + j, y1, 0, 3, [40, 40, 44], f);
  box(x0 + .06 + j, y0 + .05, x1 - .06 + j, y1 - .05, 3, 20, [214, 168, 40], f);
  box(x0 + .2 + j, y0 + .15, x0 + .36 + j, y0 + .3, 20, 25, [60, 60, 64], f);
  ctx.fillStyle = p.on ? '#7bff6a' : '#5a1a14'; const lx = SX(x1 - .1, y1 - .06), ly = SY(x1 - .1, y1 - .06, 14); ctx.fillRect(lx - .8, ly - .8, 1.6, 1.6);
}
function drawGbed(p, f) {
  const [x0, y0, x1, y1] = p.r;
  box(x0, y0, x1, y1, 0, 4, [120, 86, 52], f);
  box(x0 + .08, y0 + .08, x1 - .08, y1 - .08, 0, 4.5, p.w > 0 ? [58, 40, 28] : [92, 70, 48], f);
  if (!p.crop) return;
  const g = p.g, col = C([70, 150, 60], f), fruit = {carrot:[232, 120, 34], potato:[176, 136, 88], cabbage:[140, 200, 96]}[p.crop];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const px = x0 + .22 + c * .28, py = y0 + .22 + r * .28, sx = SX(px, py), sy = SY(px, py, 4.5), hgt = 1 + g * 7;
    ctx.strokeStyle = col; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 1.6 * g - .4, sy - hgt); ctx.moveTo(sx, sy); ctx.lineTo(sx + 1.6 * g + .4, sy - hgt * .9); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - hgt * 1.1); ctx.stroke();
    if (g >= 1) { ctx.fillStyle = C(fruit, f); ctx.beginPath(); ctx.ellipse(sx, sy - 1, p.crop === 'cabbage' ? 2.6 : 1.6, p.crop === 'cabbage' ? 2 : 1.2, 0, 0, 6.283); ctx.fill(); }
  }
}
