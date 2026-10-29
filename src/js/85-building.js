// ================= лесоруб и стройка: рубить деревья и кусты, пилить брёвна, разбирать технику, строить свой дом =================
// Дерево рубят топором или топориком: остаётся пень, рядом падает бревно. Бревно пилят ножовкой на доски или колют топором на хворост.
// Куст срубается любым лезвием — выходят ветки (хворост). Пни, брёвна и срубленные кусты переживают сохранение (x85).
// Технику и сантехнику разбирают ключом, ломом или кувалдой (SALVAGE в 38): в руках инструмент — у холодильника появляется «Разобрать».
// Стройка (кнопка «Стройка» внизу или в «Создать»): стены, дверь, пол, колья, колючка — тапом по клетке рядом с героем.
//   Прочность и скорость зависят от плотничества: на нулевом уровне стена кривая и хлипкая, на пятом — мастерская.
//   Мертвецы ломятся в постройки (поле путей пускает их через стену с ценой — 05 buildFlow, bw), колья и колючка ранят и держат.
Object.assign(ITEMS, {
  saw:{name:'Ножовка', sh:'Пила', kind:'misc', info:'распилить бревно на доски'},
  wire:{name:'Медный провод', sh:'Провод', kind:'misc', info:'колючая проволока в стройке'},
  toiletlid:{name:'Крышка бачка', sh:'Крышка', kind:'weapon', dmg:34, range:1, cd:.8, cleave:1, dur:14, verb:'Взять в руки'},
});
Object.assign(DESC, {
  saw:'Ножовка по дереву. Бревно — на доски, и никакого магазина не надо.',
  wire:'Моток медного провода из холодильника или стиральной машины. Из него крутят колючую проволоку.',
  toiletlid:'Фаянсовая крышка от сливного бачка. Тяжёлая, бьёт оглушительно — и разлетается вдребезги после пары голов.',
});
Object.assign(KG, {saw:.8, wire:.4, toiletlid:2.2});
WSPEC.toiletlid = {segs:[[0, 2.5, 1.4, '#e8e6e0']], head:{at:2.5, w:2.6, len:4.2, col:'#f2f0ea'}};
WSTYLE.toiletlid = 'bash';
{ const add = (k, ...ids) => { if (CONT[k] && CONT[k].loot) CONT[k].loot.push(...ids); };
  add('toolrack', 'saw', 'saw', 'wire'); add('crate', 'saw'); add('boxes', 'wire', 'saw'); add('kbin', 'wire'); }
PROFS.carp.items.push('saw'); PROFS.carp.info = 'Плотничество 3. С собой молоток, ножовка и 2 доски.';
ACH.push(['lumber', 'Лесоруб', 'Срубить дерево'], ['builder', 'Прораб', 'Построить 10 стен'], ['lid', 'Фаянсовый аргумент', 'Снять крышку с бачка']);
Object.assign(SRC_HINT, {saw:'ищи в ящиках и на стеллажах с инструментом', wire:'разбери холодильник, плиту или стиральную машину ключом или ломом'});

const LUMBER = {log:[], cut:[], bush:[]};                                   // брёвна [x, y, ax]; срубленные деревья [x, y]; срубленные кусты (номер вещи мира)
const AXES = ['axe', 'hatchet'];
const axeTool = () => AXES.find(t => hasTool(t));
const bladeTool = () => axeTool() || ['machete', 'cleaver', 'knife', 'shiv'].find(t => hasTool(t));
function equipTool(id) {                                                      // взять инструмент в руки, чтобы им и махать
  if (P.weapon && P.weapon.id === id) return;
  const k = P.inv.findIndex(i => i.id === id); if (k < 0) return;
  const it = P.inv.splice(k, 1)[0]; if (P.weapon) P.inv.push(P.weapon); P.weapon = it; renderInv(); updateHud();
}
const dropOrGive = (id, n, x, y) => { for (let q = 0; q < n; q++) { const it = mkItem(id); if (!invFull()) P.inv.push(it); else addToPile(x, y, it); } };
const freeGround = (x, y) => { if (x < 2 || y < 2 || x >= MW - 2 || y >= MH - 2) return false; const i = y * MW + x, t = map[i]; return (t === GRASS || t === WALK || t === ROAD || t === FLOOR) && !propAt[i] && !furn[i]; };
function dropProp(p) { p.dead = true; const id = props.indexOf(p) + 1; for (let y = Math.floor(p.cy) - 2; y <= Math.floor(p.cy) + 2; y++) for (let x = Math.floor(p.cx) - 2; x <= Math.floor(p.cx) + 2; x++) if (x >= 0 && y >= 0 && x < MW && y < MH && propAt[y * MW + x] === id) propAt[y * MW + x] = 0; }

// ---- пень и бревно ----
function addStump(x, y) { return addProp({type:'stump', proc:true, cx:x + .5, cy:y + .5, solid:false, r:[x + .3, y + .3, x + .7, y + .7], dz:-.4}, [[x, y]]); }
function addLog(x, y, ax) { return addProp({type:'blog', proc:true, ax, cx:x + .5, cy:y + .5, solid:false, r:[x + .1, y + .1, x + .9, y + .9], dz:-.3}, [[x, y]]); }
function cutTree(x, y) { map[y * MW + x] = GRASS; addStump(x, y); }        // дерево → трава и пень
defProc('stump', (p, f) => {
  const x = Math.floor(p.cx), y = Math.floor(p.cy);
  box(x + .32, y + .32, x + .68, y + .68, 0, 5, [118, 86, 56], f);
  box(x + .36, y + .36, x + .64, y + .64, 5, 5.6, [196, 160, 112], f);
});
defProc('blog', (p, f) => {
  const x = Math.floor(p.cx), y = Math.floor(p.cy), X = p.ax === 'x';
  for (const [o, z0, z1, c] of [[0, 0, 5, [104, 76, 50]], [.05, 5, 7.5, [124, 92, 60]]]) X ? box(x + .04, y + .32 + o, x + .96, y + .68 - o, z0, z1, c, f) : box(x + .32 + o, y + .04, x + .68 - o, y + .96, z0, z1, c, f);
  X ? box(x + .9, y + .34, x + .96, y + .66, 0, 7, [206, 170, 120], f) : box(x + .34, y + .9, x + .66, y + .96, 0, 7, [206, 170, 120], f);   // спил
});

// ---- действия: срубить дерево, срубить куст, распилить и расколоть бревно, разобрать технику ----
function nearTree() {
  const cx = Math.floor(P.x), cy = Math.floor(P.y); let best = null, bd = 1.45;
  for (const [ox, oy] of [[0, 0], ...D8]) { const x = cx + ox, y = cy + oy; if (get(x, y) !== TREE) continue; const d = Math.hypot(x + .5 - P.x, y + .5 - P.y); if (d < bd && reachOK(x + .5, y + .5)) { bd = d; best = [x, y]; } }
  return best;
}
function nearProp(type, r) {
  const cx = Math.floor(P.x), cy = Math.floor(P.y); let best = null, bd = r;
  for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) {
    const id = x >= 0 && y >= 0 && x < MW && y < MH && propAt[y * MW + x]; if (!id) continue;
    const p = props[id - 1]; if (p.dead || p.type !== type) continue;
    const d = Math.hypot(p.cx - P.x, p.cy - P.y); if (d < bd && reachOK(p.cx, p.cy)) { bd = d; best = p; }
  }
  return best;
}
function nearSalvage() {                                                      // ближайшая разбираемая мебель (инструмент для неё — в руках)
  const cx = Math.floor(P.x), cy = Math.floor(P.y); let best = null, bd = 1.35;
  if (!P.weapon) return null;
  for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) {
    const id = x >= 0 && y >= 0 && x < MW && y < MH && furn[y * MW + x]; if (!id) continue;
    const f = furns[id - 1]; if (!f || f.gone || !f.r) continue;
    const s = salvageOf(f); if (!s || !s.tools.includes(P.weapon.id)) continue;
    const qx = clamp(P.x, f.r[0], f.r[2]), qy = clamp(P.y, f.r[1], f.r[3]), d = Math.hypot(qx - P.x, qy - P.y);
    if (d < bd && reachOK(qx, qy)) { bd = d; best = f; }
  }
  return best;
}
addActions(out => {
  if (!P || P.car || P.sleep || BLD.on) return;
  const tr = axeTool() && nearTree(); if (tr) out.push({kind:'chop', label:'срубить дерево', x:tr[0], y:tr[1], f:{type:'tree', cx:tr[0] + .5, cy:tr[1] + .5}});
  const bu = bladeTool() && nearProp('bush', 1.35); if (bu) out.push({kind:'cutbush', label:'срубить куст', f:bu});
  const lg = nearProp('blog', 1.4);
  if (lg) { if (hasTool('saw')) out.push({kind:'sawlog', label:'распилить на доски', f:lg}); if (axeTool()) out.push({kind:'splitlog', label:'наколоть хворост', f:lg});
    if (!hasTool('saw') && !axeTool()) out.push({kind:'sawlog', label:'распилить: нужна ножовка', f:lg}); }
  const sv = nearSalvage(); if (sv) out.push({kind:'salvage', label:'разобрать', f:sv});
});
const busy = () => mode !== 'play' || paused || panel || P.sleep;
defAction('chop', {name:() => 'Дерево', icon:() => 'i-hammer', run:a => {
  if (busy()) return; $('actMenu').hidden = true;
  const t = axeTool(); if (!t) { toast('Нужен топор или топорик'); return; }
  equipTool(t); P.face = P.fd = Math.atan2(a.y + .5 - P.y, a.x + .5 - P.x);
  const lv = skillLv('carp'), dur = (t === 'axe' ? 7 : 11) * (1 - .07 * lv);
  job(dur, () => {
    if (get(a.x, a.y) !== TREE) return;
    cutTree(a.x, a.y); LUMBER.cut.push([a.x, a.y]);
    // бревно падает от героя: на свободную клетку дальше по линии удара, иначе рядом
    const dx = Math.sign(Math.round(a.x + .5 - P.x)), dy = Math.sign(Math.round(a.y + .5 - P.y));
    const cand = [[a.x + dx, a.y + dy], [a.x + (dx || 1), a.y], [a.x, a.y + (dy || 1)], ...D8.map(([ox, oy]) => [a.x + ox, a.y + oy])];
    const spot = cand.find(([x, y]) => freeGround(x, y) && !(Math.floor(P.x) === x && Math.floor(P.y) === y));
    if (spot) { const ax = Math.abs(spot[0] - a.x) >= Math.abs(spot[1] - a.y) ? 'x' : 'y'; addLog(spot[0], spot[1], ax); LUMBER.log.push([spot[0], spot[1], ax]); }
    else dropOrGive('sticks', 3, a.x + .5, a.y + .5);
    dropOrGive('sticks', 2, a.x + .5, a.y + .5);
    noise(a.x + .5, a.y + .5, 14); SFX.wood(a.x + .5, a.y + .5); emit('wood', a.x + .5, a.y + .5, 30, 16, null, 0, 2.6); emit('dust', a.x + .5, a.y + .5, 4, 10, null, 0, 1.4);
    P.en = Math.max(0, P.en - 8); addXp('carp', 3); ach('lumber'); stat('trees');
    clearCaches(); fogDirty = true; buildFlow(); renderInv();
    toast(rng() < .3 ? 'Береги-и-ись! Дерево рухнуло — грохот слышно на весь квартал' : spot ? 'Дерево срублено. Бревно распили ножовкой или наколи хворост' : 'Дерево срублено, бревну некуда упасть — пошло на хворост');
  }, {loopAn:'chop', noisy:8, chop:true});
}});
defAction('cutbush', {name:() => 'Куст', icon:() => 'i-hammer', run:a => {
  if (busy()) return; $('actMenu').hidden = true;
  const t = bladeTool(); if (!t) { toast('Нужен нож, мачете или топор'); return; }
  equipTool(t);
  job(AXES.includes(t) ? 2.4 : 3.6, () => {
    const p = a.f; if (p.dead) return;
    const k = props.indexOf(p); dropProp(p); if (k >= 0) LUMBER.bush.push(k);
    const n = 2 + ri(0, 2); dropOrGive('sticks', n, p.cx, p.cy);
    SFX.rustle(); emit('wood', p.cx, p.cy, 8, 8, null, 0, 1.6); noise(p.cx, p.cy, 3); addXp('farm', 1);
    clearCaches(); renderInv(); toast('Куст срублен: веточки ×' + n);
  }, {loopAn:AXES.includes(t) ? 'chop' : 'work'});
}});
function takeLog(p) { const k = LUMBER.log.findIndex(l => l[0] === Math.floor(p.cx) && l[1] === Math.floor(p.cy)); if (k >= 0) LUMBER.log.splice(k, 1); dropProp(p); }
defAction('sawlog', {name:() => 'Бревно', icon:() => 'i-hammer', run:a => {
  if (busy()) return; $('actMenu').hidden = true;
  if (!hasTool('saw')) { toast('Нужна ножовка: ищи в ящиках и на стеллажах с инструментом'); return; }
  const lv = skillLv('carp');
  job(8 * (1 - .08 * lv), () => {
    const p = a.f; if (p.dead) return; takeLog(p);
    const n = 2 + (lv >= 1 ? 1 : 0) + (lv >= 3 ? 1 : 0) + (lv >= 5 ? 1 : 0);
    dropOrGive('plank', n, p.cx, p.cy); emit('wood', p.cx, p.cy, 4, 14, null, 0, 1.4);
    P.en = Math.max(0, P.en - 6); addXp('carp', 3); renderInv(); toast('Бревно распилено: досок ×' + n + (lv < 3 ? '. Опытный плотник выпилит больше' : ''));
  }, {noisy:4});
}});
defAction('splitlog', {name:() => 'Бревно', icon:() => 'i-hammer', run:a => {
  if (busy()) return; $('actMenu').hidden = true;
  const t = axeTool(); if (!t) return; equipTool(t);
  job(5, () => {
    const p = a.f; if (p.dead) return; takeLog(p);
    dropOrGive('sticks', 6, p.cx, p.cy); emit('wood', p.cx, p.cy, 6, 14, null, 0, 2);
    P.en = Math.max(0, P.en - 5); addXp('carp', 1); renderInv(); toast('Наколол хвороста: 6 охапок — костру на шесть часов');
  }, {loopAn:'chop', noisy:6, chop:true});
}});
defAction('salvage', {name:a => furnLabel(a.f), icon:() => 'i-hammer', run:a => {
  if (busy()) return; $('actMenu').hidden = true;
  if (startDismantle(a.f) && a.f.type === 'toilet') ach('lid');
}});
// стук топора в такт взмахам
{ let lastC = -1;
  onUpdate(() => {
    const A = P && P.act; if (!A || A.kind !== 'job' || !A.chop) return;
    const k = Math.floor(A.t / .75); if (k !== lastC) { lastC = k; if (A.t > .2) { SFX.wood(P.x + Math.cos(P.face), P.y + Math.sin(P.face)); emit('wood', P.x + Math.cos(P.face) * .8, P.y + Math.sin(P.face) * .8, 18, 3, null, 0, 1.4); } }
  });
}

// ================= стройка =================
// hp — прочность при качестве 1; качество q = .6 + .2 × плотничество; lv — с какого уровня плотничества доступно
const BUILD = [
  {k:'wall', name:'Стена', col:'#a87c50', hp:130, dur:5, cost:[['plank', 3], ['nails', 1]], tool:'hammer', solid:true},
  {k:'door', name:'Дверь', col:'#8a6038', hp:110, dur:6, cost:[['plank', 3], ['nails', 1], ['scrap', 1]], tool:'hammer', solid:true, lv:1},
  {k:'mwall', name:'Стена с железом', col:'#8a8e94', hp:280, dur:7, cost:[['plank', 2], ['scrap', 2], ['nails', 1]], tool:'hammer', solid:true, lv:2},
  {k:'floor', name:'Пол', col:'#c49a66', hp:0, dur:3, cost:[['plank', 2], ['nails', 1]], tool:'hammer'},
  {k:'spikes', name:'Колья', col:'#6e5434', hp:60, dur:4, cost:[['sticks', 3]], tool:'blade'},
  {k:'barbed', name:'Колючка', col:'#9aa0a6', hp:90, dur:3, cost:[['wire', 2]], tool:null, lv:1},
];
const BK = Object.fromEntries(BUILD.map(b => [b.k, b]));
const QN = ['кривая', 'шаткая', 'обычная', 'крепкая', 'добротная', 'мастерская'];
const BLD = {on:false, tool:'wall', last:null, built:0};
const bq = lv => .6 + .2 * lv;
const toolOk = b => !b.tool || (b.tool === 'blade' ? !!bladeTool() : hasTool(b.tool));
const costOk = b => b.cost.every(([id, n]) => countItem(id) >= n);
const costTxt = b => b.cost.map(([id, n]) => (ITEMS[id].sh || ITEMS[id].name).toLowerCase() + (n > 1 ? ' ' + n : '')).join(', ') + (b.tool === 'hammer' ? ' · молоток' : b.tool === 'blade' ? ' · лезвие' : '');
function bldWhy(b, x, y) {
  if (b.lv && skillLv('carp') < b.lv) return 'нужно плотничество ' + b.lv;
  if (!toolOk(b)) return b.tool === 'hammer' ? 'нужен молоток' : 'нужен нож или топор';
  if (!costOk(b)) return 'не хватает: ' + costTxt(b);
  if (!freeGround(x, y)) return 'здесь не построить';
  if (Math.hypot(x + .5 - P.x, y + .5 - P.y) > 2.4 || !reachOK(x + .5, y + .5)) return 'подойди ближе';
  if (b.solid && (Math.floor(P.x) === x && Math.floor(P.y) === y || zs.some(z => Math.floor(z.x) === x && Math.floor(z.y) === y))) return 'клетка занята';
  return '';
}
function mkPiece(k, x, y, o) {
  const b = BK[k]; if (!b) return null;
  const p = Object.assign({type:'bw', bw:k, proc:true, cx:x + .5, cy:y + .5, solid:!!b.solid, r:[x + .02, y + .02, x + .98, y + .98], q:1, open:false}, o || {});
  if (k === 'floor') p.dz = -1.2; else if (k === 'spikes' || k === 'barbed') { p.r = [x + .1, y + .1, x + .9, y + .9]; p.dz = -.2; }
  if (p.mhp == null) p.mhp = Math.round(b.hp * p.q); if (p.hp == null) p.hp = p.mhp;
  if (k === 'door' && p.open) p.solid = false;
  return addProp(p, [[x, y]]) ? p : null;
}
function bldTap(cx, cy) {
  if (!BLD.on) return false;
  if (P.act) return true;
  const [wx, wy] = worldFromScreen(cx, cy), x = Math.floor(wx), y = Math.floor(wy);
  BLD.last = {x, y, t:1.2, ok:false};
  if (BLD.tool === 'erase') { bldErase(x, y); return true; }
  const b = BK[BLD.tool], why = bldWhy(b, x, y);
  if (why) { toast(why); return true; }
  BLD.last.ok = true; P.face = P.fd = Math.atan2(y + .5 - P.y, x + .5 - P.x);
  const lv = skillLv('carp');
  if (b.tool === 'hammer') equipTool('hammer');
  job(b.dur * (1.25 - .1 * lv), () => {
    const w = bldWhy(b, x, y); if (w) { toast('Не вышло: ' + w); return; }
    for (const [id, n] of b.cost) for (let q = 0; q < n; q++) removeItem(id);
    const p = mkPiece(b.k, x, y, {q:bq(lv)}); if (!p) return;
    addXp('carp', b.k === 'floor' ? 1 : 3); SFX.hammer && SFX.hammer(); noise(x + .5, y + .5, b.tool === 'hammer' ? 8 : 3); emit('wood', x + .5, y + .5, 10, 8, null, 0, 1.6);
    if (b.solid) { BLD.built++; if (BLD.built >= 10) ach('builder'); }
    const left = Math.min(...b.cost.map(([id, n]) => Math.floor(countItem(id) / n)));
    if (lv === 0 && b.tool === 'hammer' && rng() < .15) { P.pain = Math.min(100, (P.pain || 0) + 8); toast('Попал молотком по пальцу! Подрастёт плотничество — будешь попадать по гвоздям'); }
    else toast(b.name + (b.hp ? ': ' + QN[lv] + ', прочность ' + p.mhp : '') + (left ? '. Материала ещё на ' + left : '. Материал кончился'));
    buildFlow(); renderInv(); bldUI();
  }, {noisy:b.tool === 'hammer' ? 7 : 2});
  return true;
}
function bldErase(x, y) {
  const id = propAt[y * MW + x], p = id && props[id - 1];
  if (!p || p.type !== 'bw') { toast('Сносить можно только своё'); return; }
  if (!hasTool('hammer') && !hasTool('crowbar')) { toast('Нужен молоток или лом'); return; }
  if (Math.hypot(p.cx - P.x, p.cy - P.y) > 2.4) { toast('Подойди ближе'); return; }
  BLD.last.ok = true;
  job(2.5, () => {
    if (p.dead) return; dropProp(p);
    for (const [cid, n] of BK[p.bw].cost) dropOrGive(cid, Math.floor(n / 2), p.cx, p.cy);
    SFX.wood(p.cx, p.cy); buildFlow(); renderInv(); toast(BK[p.bw].name + ': разобрано, половина материалов вернулась');
  }, {noisy:5});
}
// постройка ломается: мертвецы проломили, колья сточились
function breakPiece(p, why) {
  if (p.dead) return; dropProp(p); if (p.bw !== 'barbed') addToPile(p.cx, p.cy, mkItem('plank'));
  emit('wood', p.cx, p.cy, 14, 14, null, 0, 2.4); SFX.wood(p.cx, p.cy); buildFlow();
  if (Math.hypot(p.cx - P.x, p.cy - P.y) < 14) toast(why);
}
// ---- вид: стены из досок (кривые у новичка), дверь с поперечиной, пол, колья, колючка ----
defProc('bw', (p, f) => {
  const x = Math.floor(p.cx), y = Math.floor(p.cy), dmg = p.mhp ? Math.round((1 - p.hp / p.mhp) * 4) / 4 : 0, q = p.q || 1;   // урон ступенями — узоров досок немного
  const wob = k => q < .9 ? (hash(x * 7 + k, y * 3) - .5) * .5 * (1 - q) : 0;   // у новичка доски гуляют
  const a = p.solid && x + y + 1 > P.x + P.y && Math.hypot(p.cx - P.x, p.cy - P.y) < 2.3 ? .45 : 1;   // герой за стеной — стена прозрачнее
  if (p.bw === 'floor') { box(x, y, x + 1, y + 1, 0, 1.4, [176, 136, 90], f); for (let k = 1; k < 4; k++) box(x + k / 4 - .01, y + .02, x + k / 4 + .01, y + .98, 1.4, 1.5, [120, 88, 56], f); return; }
  if (p.bw === 'spikes') { for (let k = 0; k < 5; k++) { const sx = x + .2 + (k % 3) * .3, sy = y + .25 + Math.floor(k / 3) * .45; box(sx - .05, sy - .05, sx + .05, sy + .05, 0, 9 + 3 * hash(x + k, y), [110, 82, 50], f); } return; }
  if (p.bw === 'barbed') { for (let k = 0; k < 3; k++) box(x + .08, y + .2 + k * .3, x + .92, y + .24 + k * .3, 3 + k * 2, 4.2 + k * 2, [150, 154, 160], f); for (const sx of [x + .12, x + .88]) box(sx - .04, y + .45, sx + .04, y + .55, 0, 11, [90, 92, 96], f); return; }
  const H = 50, col = p.bw === 'mwall' ? [128 - dmg * 30, 132 - dmg * 30, 138 - dmg * 30] : [168 - dmg * 40, 124 - dmg * 30, 80 - dmg * 20];
  if (p.bw === 'door' && p.open) { box(x + .02, y + .02, x + .14, y + .98, 0, H, [110, 80, 52], f, a); return; }   // открытая — створка у косяка
  const tex = p.bw === 'mwall' ? null : {s:TX.planksV(col), e:TX.planksV(col), t:C(col, 1)};
  box(x + .02 + wob(1), y + .02 + wob(2), x + .98 + wob(3), y + .98 + wob(4), 0, H + wob(5) * 30, col, f, a, tex);
  if (p.bw === 'door') { box(x + .02, y + .97, x + .98, y + 1, 18, 23, [92, 64, 40], f, a); box(x + .97, y + .02, x + 1, y + .98, 18, 23, [92, 64, 40], f, a); }
  if (p.bw === 'mwall') for (const z of [12, 34]) box(x, y, x + 1, y + 1, z, z + 3, [90, 94, 100], f, a);
});
// ---- дверь: открыть и закрыть; починить постройку доской ----
addActions(out => {
  if (!P || P.car || BLD.on) return;
  const d = nearProp('bw', 1.5); if (!d) return;
  if (d.bw === 'door') out.push({kind:'bdoor', label:d.open ? 'закрыть дверь' : 'открыть дверь', f:d});
  if (d.mhp && d.hp < d.mhp * .9 && hasTool('hammer') && countItem('plank')) out.push({kind:'bfix', label:'починить (' + Math.round(d.hp / d.mhp * 100) + '%)', f:d});
});
defAction('bdoor', {name:() => 'Самодельная дверь', icon:() => 'i-door', run:a => {
  if (busy()) return; $('actMenu').hidden = true;
  const p = a.f, x = Math.floor(p.cx), y = Math.floor(p.cy);
  if (p.open && (Math.hypot(P.x - p.cx, P.y - p.cy) < .75 || zs.some(z => Math.floor(z.x) === x && Math.floor(z.y) === y))) { toast('В проёме кто-то стоит'); return; }
  p.open = !p.open; p.solid = !p.open; SFX.wood(p.cx, p.cy); noise(p.cx, p.cy, 2); buildFlow();
}});
defAction('bfix', {name:a => BK[a.f.bw].name, icon:() => 'i-hammer', run:a => {
  if (busy()) return; $('actMenu').hidden = true; equipTool('hammer');
  job(3, () => { if (a.f.dead || !countItem('plank')) return; removeItem('plank'); a.f.hp = Math.min(a.f.mhp, a.f.hp + a.f.mhp * .5); addXp('carp', 1); SFX.hammer && SFX.hammer(); buildFlow(); renderInv(); }, {noisy:6});
}});

// ---- мертвецы и постройки: ломятся в стены и дверь, ранятся о колья и колючку ----
onUpdate(dt => {
  if (!P || mode !== 'play' || paused) return;
  for (let n = zs.length - 1; n >= 0; n--) {
    const z = zs[n]; if (!z || Math.abs(z.x - P.x) > 30 || Math.abs(z.y - P.y) > 30) continue;
    const zx = Math.floor(z.x), zy = Math.floor(z.y), hid = propAt[zy * MW + zx], here = hid && props[hid - 1];
    if (here && !here.dead && (here.bw === 'spikes' || here.bw === 'barbed')) {               // колья и колючка: держат (удар оглушает) и ранят
      here.hp -= dt * (here.bw === 'barbed' ? 3 : 5); z._spT = (z._spT || 0) - dt;
      if (here.hp <= 0) breakPiece(here, here.bw === 'barbed' ? 'Колючку порвали' : 'Колья сломаны');
      if (z._spT <= 0) { z._spT = .8; hitZombie(z, here.bw === 'barbed' ? 9 : 12, Math.atan2(z.y - here.cy, z.x - here.cx), 0); }
      continue;
    }
    if (z.state !== 'chase' || z.down > 0 || z.wind > 0) continue;
    const dx = P.x - z.x, dy = P.y - z.y, dl = Math.hypot(dx, dy) || 1;
    let wall = null;
    for (const [ox, oy] of D4) {
      const tx = zx + ox, ty = zy + oy, id = tx >= 0 && ty >= 0 && tx < MW && ty < MH && propAt[ty * MW + tx], p = id && props[id - 1];
      if (!p || p.dead || p.type !== 'bw' || !p.solid) continue;
      if ((ox * dx + oy * dy) / dl < .3 || Math.hypot(tx + .5 - z.x, ty + .5 - z.y) > 1.05) continue;
      wall = p; break;
    }
    if (!wall) { z.bwT = 0; continue; }
    z.face = Math.atan2(wall.cy - z.y, wall.cx - z.x);
    z.bwT = (z.bwT || 1) - dt;
    if (z.bwT <= 0) {
      z.bwT = 1.1 + rng() * .5; wall.hp -= (7 + rng() * 6) * (z.brute ? 2.2 : 1);
      SFX.knock(wall.cx, wall.cy); noise(wall.cx, wall.cy, 5); emit('wood', wall.cx, wall.cy, 20, 3, null, 0, 1.2);
      if (wall.hp <= 0) breakPiece(wall, 'Мертвецы проломили ' + (wall.bw === 'door' ? 'дверь' : 'стену') + '!');
    }
  }
});

// ---- режим стройки: панель деталей и тап по клетке ----
function bldUI() {
  let bar = $('bldBar');
  if (!bar) {
    bar = mk('div'); bar.id = 'bldBar'; document.body.appendChild(bar);
    const tools = mk('div', 'wedtools');
    for (const b of BUILD.concat([{k:'erase', name:'Снести', col:'#e0604f'}])) {
      const bt = btn('', () => { BLD.tool = b.k; SFX.ui(); bldUI(); }); bt.dataset.t = b.k;
      const i = mk('i'); i.style.background = b.col; bt.appendChild(i);
      const tx = mk('span'); tx.appendChild(mk('b', '', b.name)); tx.appendChild(mk('small', '', b.cost ? costTxt(b) : 'молоток или лом')); bt.appendChild(tx); tools.appendChild(bt);
    }
    bar.appendChild(tools);
    const side = mk('div', 'wedside'); side.appendChild(mk('span', 'bq')); side.appendChild(btn('Готово', () => bldToggle(false), 'done')); bar.appendChild(side);
  }
  bar.hidden = !BLD.on; document.body.classList.toggle('building', BLD.on);
  const lv = skillLv('carp');
  for (const bt of bar.querySelectorAll('.wedtools button')) {
    const b = BK[bt.dataset.t]; bt.classList.toggle('on', bt.dataset.t === BLD.tool);
    bt.classList.toggle('no', !!b && (!costOk(b) || !toolOk(b) || !!(b.lv && lv < b.lv)));
  }
  const q = bar.querySelector('.bq'); if (q) q.textContent = 'Плотничество ' + lv + ' · ' + QN[lv];
  const bb = $('bBuild'); if (bb) bb.classList.toggle('on', BLD.on);
}
function bldToggle(on) {
  if (mode !== 'play' || P.sleep || P.car) return;
  BLD.on = on == null ? !BLD.on : !!on;
  if (BLD.on) { if (EDIT.on) toggleEditor(false); if (WED.on) wedToggle(false); if (panel) closePanel(); toast('Стройка: выбери деталь и тапни по клетке рядом с собой'); }
  bldUI();
}
onTap(bldTap);
onDraw(() => {
  if (!BLD.on) return;
  const quad = (x0, y0, x1, y1, fill, stroke) => { ctx.beginPath(); ctx.moveTo(SX(x0, y0), SY(x0, y0, 0)); ctx.lineTo(SX(x1, y0), SY(x1, y0, 0)); ctx.lineTo(SX(x1, y1), SY(x1, y1, 0)); ctx.lineTo(SX(x0, y1), SY(x0, y1, 0)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); };
  const px = Math.floor(P.x), py = Math.floor(P.y), b = BK[BLD.tool];
  for (let y = py - 2; y <= py + 2; y++) for (let x = px - 2; x <= px + 2; x++) {             // куда можно поставить
    if (Math.hypot(x + .5 - P.x, y + .5 - P.y) > 2.4) continue;
    const id = propAt[y * MW + x], ok = b ? !bldWhy(b, x, y) : !!(id && props[id - 1].type === 'bw');
    if (ok) quad(x + .06, y + .06, x + .94, y + .94, 'rgba(240,196,119,.12)', 'rgba(240,196,119,.45)');
  }
  const L = BLD.last;
  if (L && L.t > 0) { L.t -= 1 / 60; const a = Math.min(1, L.t); quad(L.x, L.y, L.x + 1, L.y + 1, L.ok ? `rgba(130,220,120,${.3 * a})` : `rgba(230,80,60,${.3 * a})`, L.ok ? `rgba(191,240,168,${a})` : `rgba(255,138,118,${a})`); }
});
// кнопка внизу рядом с «Мебелью» и рецепт в «Создать»
{ const ref = $('bEdit');
  if (ref) { const b = mk('button', 'hslot editslot'); b.type = 'button'; b.id = 'bBuild'; b.title = 'Стройка: стены, двери, пол, колья'; b.setAttribute('aria-label', 'Стройка');
    b.innerHTML = '<svg class="ic"><use href="#i-hammer"/></svg><span class="hl">Стройка</span>'; b.addEventListener('click', () => { SFX.ui(); bldToggle(); }); ref.after(b); } }
RECIPES.unshift({name:'Стройка: стены, дверь, пол', icon:'hammer', xp:0, parts:() => [{id:'plank', ok:countItem('plank') >= 3, badge:'3+'}, {id:'nails', ok:countItem('nails') >= 1}, {id:'hammer', ok:hasTool('hammer')}],
  need:'свой дом из досок: чем выше плотничество, тем крепче стены · кнопка «Стройка» внизу', can:() => true, make:() => { bldToggle(true); return false; }});

// ---- сохранение ----
onSave(d => {
  d.x85 = {log:LUMBER.log, cut:LUMBER.cut, bush:LUMBER.bush, n:BLD.built,
    bw:props.filter(p => p.type === 'bw' && !p.dead).map(p => [p.bw, Math.floor(p.cx), Math.floor(p.cy), Math.round(p.hp), p.mhp, +(p.q || 1).toFixed(2), p.open ? 1 : 0])};
});
onLoad(d => {
  const s = (d && d.x85) || {};
  LUMBER.log = []; LUMBER.cut = []; LUMBER.bush = []; BLD.built = s.n || 0;
  for (const [x, y] of s.cut || []) if (get(x, y) === TREE) { cutTree(x, y); LUMBER.cut.push([x, y]); }
  for (const k of s.bush || []) { const p = props[k]; if (p && p.type === 'bush' && !p.dead) { dropProp(p); LUMBER.bush.push(k); } }
  for (const [x, y, ax] of s.log || []) if (freeGround(x, y) && addLog(x, y, ax)) LUMBER.log.push([x, y, ax]);
  for (const [k, x, y, hp, mhp, q, open] of s.bw || []) mkPiece(k, x, y, {hp, mhp, q, open:!!open});
  buildFlow(); clearCaches();
});
onNewWorld(o => { if (!o || !o.save) { LUMBER.log = []; LUMBER.cut = []; LUMBER.bush = []; BLD.built = 0; } BLD.on = false; if ($('bldBar')) bldUI(); });

// ---- своя крепость: уснул внутри стен, которые построил сам (выхода нет, кроме своей двери), — проснулся спокойным ----
function fortress() {
  const sx = Math.floor(P.x), sy = Math.floor(P.y), R = 10, seen = new Set([sy * MW + sx]), q = [[sx, sy]]; let own = 0;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [ox, oy] of D4) {
      const nx = x + ox, ny = y + oy, j = ny * MW + nx; if (seen.has(j)) continue; seen.add(j);
      if (Math.abs(nx - sx) > R || Math.abs(ny - sy) > R) return false;                         // вышли за округу — стены не замкнуты
      if (map[j] === WALL) continue;
      const p = propAt[j] && props[propAt[j] - 1];
      if (p && p.type === 'bw' && (p.solid || p.bw === 'door')) { own++; continue; }
      q.push([nx, ny]);
    }
  }
  return own >= 3;
}
{ let was = false, safe = false;
  onUpdate(() => {
    if (!P || mode !== 'play') return;
    if (P.sleep && !was) { was = true; safe = fortress(); }
    else if (!P.sleep && was) { was = false; if (safe) { P.stress = Math.max(0, (P.stress || 0) - 25); P.unh = Math.max(0, (P.unh || 0) - 10); toast('Выспался за своими стенами. Впервые за долгое время — спокойно'); ach('fort'); } safe = false; }
  });
}
ACH.push(['fort', 'Мой дом — моя крепость', 'Выспаться в доме, который построил сам']);
