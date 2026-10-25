// ================= professions, books, spear, molotov, crawlers =================
const PROFS = {
  none:{name:'Безработный', info:'Привык обходиться малым: голод и жажда растут на 20% медленнее.'},
  police:{name:'Полицейский', info:'Ближний бой 2. Начинает с дубинкой в руках.', sk:{fight:2}, items:['baton']},
  carp:{name:'Плотник', info:'Плотничество 3. С собой молоток и 2 доски.', sk:{carp:3}, items:['hammer', 'plank', 'plank']},
  chef:{name:'Повар', info:'Кулинария 3. С собой кастрюля и нож.', sk:{cook:3}, items:['pot', 'knife']},
  farmer:{name:'Фермер', info:'Огородничество 3. С собой семена и фляга.', sk:{farm:3}, items:['seeds', 'seeds', 'canteen']},
  medic:{name:'Медик', info:'Раны заживают в 1,5 раза быстрее. С собой бинты и антибиотики.', items:['bandage', 'bandage', 'antibio'], heal:1.5},
};
let newProf = 'none';
function applyProf(k) {
  const pr = PROFS[k] || PROFS.none; P.prof = k; P.skills = {};
  for (const s in pr.sk || {}) P.skills[s] = XPL[pr.sk[s]];
  for (const id of pr.items || []) { const it = mkItem(id); if (ITEMS[id].kind === 'weapon' && !P.weapon) P.weapon = it; else P.inv.push(it); }
}
Object.assign(ITEMS, {
  spear:{name:'Самодельное копьё', sh:'Копьё', kind:'weapon', dmg:30, range:1.75, cd:.7, cleave:1, dur:22, verb:'Взять в руки'},
  molotov:{name:'Коктейль Молотова', sh:'Молотов', kind:'misc', verb:'Поджечь и бросить'},
  book_carp:{name:'Журнал «Сделай сам»', sh:'Журнал', kind:'book', skill:'carp', verb:'Читать'},
  book_cook:{name:'Поваренная книга', sh:'Кулинария', kind:'book', skill:'cook', verb:'Читать'},
  book_farm:{name:'Справочник садовода', sh:'Садовод', kind:'book', skill:'farm', verb:'Читать'},
  book_fight:{name:'Пособие по самообороне', sh:'Самооборона', kind:'book', skill:'fight', verb:'Читать'},
});
Object.assign(DESC, {
  spear:'Доска с примотанным ножом. Держит мертвецов на расстоянии, но быстро ломается.',
  molotov:'Бутылка с бензином и тряпкой. Брось в толпу: огонь горит секунд десять и поджигает всех, кто в нём окажется. Сам не подходи.',
  book_carp:'Подшивка журналов про ремонт. Чтение прокачивает плотничество.', book_cook:'Толстая поваренная книга. Чтение прокачивает кулинарию.',
  book_farm:'Справочник для дачников. Чтение прокачивает огородничество.', book_fight:'Тонкое пособие с картинками. Чтение прокачивает ближний бой.',
});
WSPEC.spear = {segs:[[0, 13, .7, '#9c7648'], [13, 15.6, 1.0, '#c9cdd1']]};
{
  const add = (k, ...ids) => CONT[k].loot.push(...ids);
  add('wardrobe', 'book_carp', 'book_fight'); add('shelf', 'book_cook', 'book_farm', 'book_carp'); add('desk', 'book_fight', 'book_cook');
  add('toolrack', 'book_carp'); add('counter', 'book_farm');
}
RECIPES.push(
  {name:'Самодельное копьё', icon:'spear', parts:() => [{id:'plank', ok:countItem('plank') >= 1, badge:'1'}, {id:'knife', ok:hasTool('knife')}], need:'доска и нож · бьёт с расстояния', can:() => countItem('plank') >= 1 && hasTool('knife'), make:() => {
    removeItem('plank'); const inHand = P.weapon && P.weapon.id === 'knife';
    if (inHand) P.weapon = null; else removeItem('knife');
    const sp = mkItem('spear'); if (!P.weapon) P.weapon = sp; else P.inv.push(sp); toast('Копьё готово' + (P.weapon === sp ? ' и уже в руках' : ''));
  }},
  {name:'Коктейль Молотова', icon:'molotov', parts:() => [{id:'bottle', ok:countItem('bottle') >= 1}, {id:'jerrycan', ok:fuelCans().some(c => c.fuel >= 25), badge:'25%'}, {id:'bandage', ok:countItem('bandage') >= 1}], need:'пустая бутылка, 25% канистры бензина, бинт на фитиль', can:() => countItem('bottle') >= 1 && countItem('bandage') >= 1 && fuelCans().some(c => c.fuel >= 25), make:() => {
    const c = fuelCans().find(c => c.fuel >= 25); c.fuel -= 25; removeItem('bandage'); P.inv.find(i => i.id === 'bottle').id = 'molotov'; toast('Коктейль Молотова готов');
  }},
);
// ---- fire on the ground ----
let blazes = [];
// мертвец убит не ударом (огонь, машина, капкан…); если это был прежний ты — его вещи на земле
function killZombie(z, cause) {
  const g = z && z.ghost, x = z && z.x, y = z && z.y;
  if (zs.includes(z)) {
    if (cause === 'fire') stat('fire'); else if (P.car) stat('ram');
    corpses.push({x:z.x, y:z.y, face:z.face, pal:z.pal, fall:0, dir:-1, seed:z.seed});
    if (corpses.length > 120) corpses.shift();
    if (!cause) addBlood(z.x, z.y, .9);
    zs.splice(zs.indexOf(z), 1); kills++; addXp('fight', 1); onZDeath(z);
  }
  if (g && !zs.includes(z)) {
    for (const it of g.items) addToPile(x, y, it);
    g.items = []; g.dead = true;
    toast('Это был ты. Его вещи лежат на земле'); logEv('Упокоил того, кем был раньше');
  }
}
function startBlaze(x, y) { blazes.push({x, y, t:10, seed:Math.random() * 9}); SFX.glass(x, y); SFX.fireUp(); noise(x, y, 12); }
function updateBlazes(dt) {
  for (const b of blazes) {
    b.t -= dt;
    for (const z of zs) if (Math.hypot(z.x - b.x, z.y - b.y) < 1.7) { z.burn = 4; z.hp -= 26 * dt; z.stun = Math.max(z.stun, .05); }
    if (Math.hypot(P.x - b.x, P.y - b.y) < 1.25 && !P.sleep) { P.hp -= 14 * dt; P.hurt = Math.max(P.hurt, .2); lastCause = 'Сгорел'; }
    if (!reduceMotion && Math.random() < dt * 8) emit('smoke', b.x + (Math.random() - .5) * 2, b.y + (Math.random() - .5) * 2, .6, 1, null, 0, .3);
    b.cT = (b.cT || 0) - dt; if (b.cT <= 0) { b.cT = .12; SFX.crackle(b.x, b.y); }
  }
  blazes = blazes.filter(b => b.t > 0);
  for (const z of zs.slice()) {
    if (!(z.burn > 0)) continue;
    z.burn -= dt; z.hp -= 9 * dt;
    if (!reduceMotion && Math.random() < dt * 6) emit('smoke', z.x, z.y, 1.2, 1, null, 0, .3);
    if (z.hp <= 0) killZombie(z, 'fire');
  }
}
function flames(sx, sy, w, k, seed) {
  const cols = ['#ffe08a', '#ffb050', '#ff7a2e', '#d84a1e'];
  for (let q = 0; q < w; q++) {
    const ph = animT * (6 + q * .6) + q * 1.9 + seed * 7, hgt = Math.max(1, (4 + 4 * Math.sin(ph)) * k);
    const xo = (q - (w - 1) / 2) * 1.4 + Math.sin(ph * 1.3) * .8;
    ctx.fillStyle = cols[Math.min(3, Math.floor(Math.abs(q - (w - 1) / 2) / (w / 6)))];
    ctx.fillRect(sx + xo, sy - hgt, 1.5, hgt);
  }
}
function drawBlaze(b) {
  const k = Math.min(1, b.t / 2 + .3), cx = SX(b.x, b.y), cy = SY(b.x, b.y, 0);
  ctx.fillStyle = 'rgba(30,18,10,.4)'; ctx.beginPath(); ctx.ellipse(cx, cy, 50, 24, 0, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(cx, cy - 8, 0, cx, cy - 8, 60); g.addColorStop(0, `rgba(255,150,50,${.45 * k})`); g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy - 8, 60, 34, 0, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39 + b.seed, r = ((i * 7) % 5) * .32 + .1, x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r;
    flames(SX(x, y), SY(x, y, 0), 7, k * (1.8 + (i % 3) * .6), b.seed + i);
  }
}
