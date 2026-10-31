// ================= вес вещей, карманы и рюкзак, виды рюкзаков, перегруз =================
// Вместимость — в килограммах. На тебе: карманы (одежда с карманами — больше) и рюкзак (у каждого своя вместимость).
// Больше, чем помещается, нести можно — но это перегруз: идёшь медленнее и быстрее устаёшь. Совсем неподъёмное не взять.

// ---- вес вещей (кг), примерно как в жизни ----
const KG_KIND = {food:.3, drink:.5, heal:.1, weapon:1, misc:.3, light:.3, battery:.05, book:.2, cloth:.5, fun:.2, ammo:.2, smoke:.05, note:.01,
  bag:.8, canteen:.3, map:.05, radio:.6, burner:.8, sleepbag:1.5, tape:.1, armor:3.5, generator:25, fuel:1, seeds:.05, bino:.6, trap:2};
const KG = {
  canned:.4, chips:.15, bread:.4, sausage:.4, milk:1, water:.5, soda:.5, coffee:.25, bottle:.05, bandage:.05, pills:.05, opener:.1, plank:2.5,
  flashlight:.3, hammer:.7, bat:1, knife:.2, pipe:1.5, axe:2, pan:1.2, crowbar:2, meat:.5, steak:.4, pasta:.5, pastaC:.4, rice:1, riceC:.4, pot:1,
  matches:.02, lighter:.03, vitamins:.1, medkit:.6, antibio:.05, apple:.2, choco:.1, stew:.4, mre:.6, energy:.3, alarm:.3, baton:.6, vest:3.5,
  carrot:.1, potato:.2, potatoC:.2, cabbage:1, spear:1.5, molotov:.6, machete:.7, sledge:5, shovel:2, golf:.5, honey:.5, crackers:.2, tuna:.2,
  juice:1, whiskey:.8, rag:.1, flare:.2, cereal:.4, pbutter:.4, jacket:1.2, sweater:.6, raincoat:.4, hat:.1, waterD:.5, novel:.3, cards:.1,
  cigs:.05, rod:.5, fish:.4, fishC:.3, watchQ:.05, watchD:.05, curtain:.8, cleaver:.5, nailbat:1.2, nails:.3, painkill:.05, antisep:.1,
  candle:.1, beans:.4, noodles:.1, soupC:.5, ragout:.5, nuts:.2, candy:.1, newspaper:.1, leather:1.5, helmet:1.2, cansalarm:.4, berries:.2,
  mushroom:.2, mushroomC:.2, sticks:.8, parka:1.5, ushanka:.3, jar:.4, pickles:1, jerky:.2, hatchet:.8, wrench:.6, thermos:.6, hotpack:.1,
  umbrella:.4, oatmeal:.5, porridge:.4, condmilk:.4, sprats:.2, salo:.3, pelmeni:.5, pelmeniC:.5, vodka:.7, handheld:.3, splint:.3, sewkit:.2,
  scrap:1, pistol:.8, shotgun:3.2, ammo9:.2, shells:.4, lure:.1, jam:.5, stewH:.5, fishJ:.5, kraut:.8, mushD:.1, gloves:.1, glovesR:.1,
  mittens:.15, glass:.2, shiv:.2, filter:.1, tshirt:.2, tank:.15, longsl:.25, flannel:.4, hoodie:.6, thermal:.3, denimJ:1, workvest:.3, milJ:1,
  jeans:.8, shorts:.3, sweatp:.5, cargo:.8, milP:.8, motoP:1.5, sneakers:.8, boots:1.4, milB:1.6, slippers:.3, rubberB:1.6, cap:.1, balacl:.1,
  bag_school:.5, sportbag:.8, bag:1.2, milbag:1.6, jug:.3, jerrycan:1,
};
function itemKg(it) {
  if (!it || !ITEMS[it.id]) return 0;
  const d = ITEMS[it.id];
  let k = KG[it.id] != null ? KG[it.id] : KG_KIND[d.kind] != null ? KG_KIND[d.kind] : .3;
  if (d.kind === 'canteen') k += (it.w || 0) * .35;                      // вода во фляге
  if (it.id === 'jerrycan') k += (it.fuel || 0) / 100 * 8;               // бензин в канистре
  return k;
}
function fmtKg(k) { k = Math.max(0, k); return (k < 10 ? (Math.round(k * 10) / 10).toFixed(1) : String(Math.round(k))).replace('.', ','); }

// ---- рюкзаки: чем вместительнее, тем реже попадается ----
Object.assign(ITEMS, {
  bag_school:{name:'Школьный рюкзак', sh:'Рюкзак', kind:'bag', bcap:6, verb:'Надеть'},
  sportbag:{name:'Спортивная сумка', sh:'Сумка', kind:'bag', bcap:10, verb:'Надеть'},
});
Object.assign(ITEMS.bag, {name:'Туристический рюкзак', sh:'Турист.', bcap:15, info:''});
Object.assign(ITEMS.milbag, {name:'Военный рюкзак', sh:'Военный', bcap:22}); delete ITEMS.milbag.cap;
Object.assign(DESC, {
  bag_school:'Маленький школьный рюкзак. Влезет немного: 6 кг.',
  sportbag:'Спортивная сумка через плечо. Вместительнее школьного рюкзака: 10 кг.',
  bag:'Большой туристический рюкзак с поясным ремнём. 15 кг.',
  milbag:'Армейский рюкзак. Самый вместительный: 22 кг. Попадается редко.',
});
const BAG_ROLL = [['bag_school', 6], ['sportbag', 10], ['bag', 15], ['milbag', 22]];
function rollBag() {                                                      // вес шанса ~ 1/вместимость²
  const w = BAG_ROLL.map(([, c]) => 1 / (c * c)), s = w.reduce((a, b) => a + b, 0); let r = rng() * s;
  for (let k = 0; k < w.length; k++) { r -= w[k]; if (r <= 0) return BAG_ROLL[k][0]; }
  return 'bag_school';
}
// в добыче «рюкзак» — случайный вид по редкости (mkItem), mkBag — именно этот
for (const k of ['hanger', 'wardrobe', 'car', 'locker', 'desk']) { const L = CONT[k] && CONT[k].loot; if (L) L.push('bag'); }
const mkBag = id => { exactBag = true; try { return mkItem(id); } finally { exactBag = false; } };

// ---- вместимость ----
const POCKET_KG = 2;
function pocketKg() {
  let k = POCKET_KG;
  for (const s in (P.cloth || {})) { const c = P.cloth[s]; if (c && c.id && ITEMS[c.id] && ITEMS[c.id].cap) k += ITEMS[c.id].cap * .7; }
  if (hasTr('organized')) k += 1.5;
  return k;
}
const bagCapKg = () => (P.bag && ITEMS[P.bag.id] && ITEMS[P.bag.id].bcap) || 0;
const strK = () => (hasTr('strong') ? 1.2 : 1) * (hasTr('weak') ? .8 : 1);
function invCapKg() { return Math.max(1, (pocketKg() + bagCapKg() + heroAdd('carry')) * strK()); }
function invKg() {
  let k = 0; for (const it of P.inv) k += itemKg(it);
  return k + itemKg(P.weapon) + itemKg(P.armor) + itemKg(P.bag);
}
function invHardKg() { return invCapKg() * 1.75 + 2; }                     // дальше уже не поднять
function invRoomKg() { return invHardKg() - invKg(); }
function invFull() { return invKg() >= invHardKg() - .05; }
function invOver() { const c = invCapKg(); return Math.max(0, invKg() / c - 1); }   // 0 — нормально, .5 — на 50% больше
function invCapTxt() { return fmtKg(invKg()) + ' из ' + fmtKg(invCapKg()) + ' кг' + (invOver() > 0 ? ' · перегруз' : ''); }
const bagKgUsed = () => P.inv.reduce((s, it) => s + (it.bp ? itemKg(it) : 0), 0);
const pocketKgUsed = () => P.inv.reduce((s, it) => s + (it.bp ? 0 : itemKg(it)), 0);

// куда легла вещь: в рюкзак, пока помещается, иначе — в карманы
function invPlace() {
  if (!P || !P.inv) return;
  if (!P.bag) { for (const it of P.inv) if (it.bp) it.bp = 0; return; }
  const cap = bagCapKg(); let used = 0;
  for (const it of P.inv) if (it.bp) used += itemKg(it);
  for (let k = P.inv.length - 1; k >= 0 && used > cap + 1e-6; k--) { const it = P.inv[k]; if (it.bp) { it.bp = 0; used -= itemKg(it); } }   // рюкзак стал меньше
  for (const it of P.inv) if (it.bp == null) { const w = itemKg(it); if (used + w <= cap + 1e-6) { it.bp = 1; used += w; } else it.bp = 0; }
}
// в группах инвентаря вещи из карманов и из рюкзака — отдельно

// ---- надеть / снять рюкзак ----
function wearBag(k) {
  const it = P.inv[k]; if (!it) return;
  const old = P.bag; P.inv.splice(k, 1); P.bag = it; delete it.bp;
  if (old) { old.bp = 0; P.inv.push(old); }
  for (const x of P.inv) if (!x.bp) x.bp = null;                          // из карманов — в новый рюкзак, сколько влезет
  invPlace(); SFX.equip();
  toast('Надел: ' + ITEMS[it.id].name.toLowerCase() + ' — ' + ITEMS[it.id].bcap + ' кг');
  renderInv(); updateHud();
}
function takeOffBag() {
  if (!P.bag) return;
  const b = P.bag; P.bag = null; for (const x of P.inv) x.bp = 0; b.bp = 0; P.inv.push(b);
  SFX.rustle(); toast('Рюкзак снят. Вещи из него — в руках и карманах'); renderInv(); updateHud();
}
defUse((it, d) => d && d.kind === 'bag', (it, k) => wearBag(k));   // рюкзак — надеть

// ---- перегруз: медленнее и тяжелее ----
{ const ed = enDrainK; enDrainK = function () { return ed() * (1 + invOver() * 1.4); }; }
{ let t42 = 0, was = false;
  onUpdate(dt => {
    if (mode !== 'play' || !P) return;
    t42 += dt; if (t42 < .3) return; t42 = 0;
    invPlace();
    const o = invOver() > 0;
    if (o && !was) toast('Перегруз: вещей больше, чем помещается. Идёшь медленнее и быстрее устаёшь');
    was = o;
  });
}

// ---- старт: базовый школьный рюкзак; старые сохранения — по прежнему числу мест ----
{ onStartNew(() => { if (P) { P.bag = mkBag('bag_school'); invPlace(); }
}); }
{ onSave(d => { if (d && d.p) d.p.bag = P.bag || null;
}); }
{ onLoad((d) => {
    if (!P) return;
    if (d && d.p && 'bag' in d.p) P.bag = d.p.bag;
    else { const c = (d && d.p && d.p.cap) || 18, b = c >= 34 ? 'milbag' : c >= 28 ? 'bag' : 'bag_school'; P.bag = mkBag(b); }
    for (const it of P.inv) if (it.bp == null) it.bp = null;
    invPlace();
});
}

// ---- рюкзак в интерфейсе: карманы и рюкзак — два отдельных списка ----
function invSection(title, sub, frac, list, onlyBag) {
  const box = mk('div', 'invsec' + (onlyBag ? ' bagsec' : ''));
  const hd = mk('div', 'secrow'), t = mk('div', 'sect', title); t.appendChild(mk('small', '', sub)); hd.appendChild(t);
  const cap = mk('div', 'capbar' + (frac > 1 ? ' over' : '')), ci = mk('i'); ci.style.width = Math.min(100, Math.round(frac * 100)) + '%'; cap.appendChild(ci); hd.appendChild(cap);
  box.appendChild(hd);
  const groups = groupItems(P.inv).filter(g => !!g.it.bp === onlyBag && invFltOk(g.it)).sort((a, b) => CATS.indexOf(catOf(a.it.id)) - CATS.indexOf(catOf(b.it.id)));
  box.appendChild(gridOf(groups, g => invTap(g), Math.max(4, groups.length + (4 - groups.length % 4) % 4), panel.sel));
  const g = box.querySelector('.grid'); if (!g) return box;
  for (const v of [...g.querySelectorAll('.cell.void')]) v.remove();                // пустые ячейки — до полного ряда из 4
  const n = g.children.length, need = Math.max(4, Math.ceil(n / 4) * 4) - n;
  for (let k = 0; k < need; k++) g.appendChild(cell(null));
  if (P.bag && P.inv.some(it => !!it.bp === onlyBag)) {                              // «всё туда» — в заголовке раздела
    const b = btn(onlyBag ? 'Всё в карманы' : 'Всё в рюкзак', () => moveAll(!onlyBag), 'ghost'); b.classList.add('mvall');
    box.querySelector('.secrow').appendChild(b);
  }
  return box;
}
// подзаголовок окна рюкзака — вес
{ onPanel(() => { if (panel && panel.kind === 'inv' && $('pnSub')) $('pnSub').textContent = invCapTxt(); });
}
