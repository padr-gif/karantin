// ================= v34: гардероб — герой в трусах, слоями одежда на 3D-модели, много вещей с характеристиками =================
// Кадры героя (tools/glbchar/bake_hero.py) лежат парой листов: pchar_m — сам рендер (кожа, трусы, босиком),
// pchar_mr — карта областей тела: R/16 = номер области, G = светотень, B = покрытие пикселя.
// Надетая вещь красит свои области; верхний слой перекрывает нижний.
const CLOTH_SLOTS = ['head', 'shirt', 'torso', 'legs', 'feet', 'hands', 'wrist'];
const SLOT_NAME = {head:'Голова', shirt:'Футболка', torso:'Верх', legs:'Штаны', feet:'Обувь', hands:'Руки', wrist:'Запястье'};
const SLOT_WHERE = {head:'на голову', shirt:'под низ', torso:'поверх', legs:'на ноги', feet:'на ступни', hands:'на руки', wrist:'на запястье'};
// области: 1 торс, 2 плечо (короткий рукав), 3 плечо низ, 4 предплечье, 5 кисть, 6 таз, 7 бедро верх, 8 бедро низ,
// 9 голень верх, 10 голень низ, 11 стопа, 12 макушка, 13 шея
const COVER = {tee:[1, 2], tank:[1], long:[1, 2, 3, 4], vest:[1], pants:[6, 7, 8, 9, 10], shorts:[6, 7], shoe:[11], boot:[10, 11],
  glove:[5], hat:[12], mask:[12, 13]};
const PART_REG = {arm:[2, 3, 4, 5], torso:[1], leg:[7, 8, 9, 10, 11], head:[12], neck:[13, 12]};
const DRAW_ORDER = ['legs', 'shirt', 'torso', 'feet', 'hands', 'head'];          // кто кого перекрывает на картинке
const PROT_ORDER = ['torso', 'shirt', 'head', 'feet', 'legs', 'hands'];          // кого зубы встречают первым

Object.assign(ITEMS, {
  // футболки и рубашки — нижний слой
  tshirt:{name:'Футболка', kind:'cloth', slot:'shirt', cov:'tee', ins:1, col:[201, 188, 158], verb:'Надеть'},
  tank:{name:'Майка', kind:'cloth', slot:'shirt', cov:'tank', ins:0, tire:.97, col:[226, 226, 220], verb:'Надеть'},
  longsl:{name:'Лонгслив', kind:'cloth', slot:'shirt', cov:'long', ins:2, col:[61, 95, 134], verb:'Надеть'},
  flannel:{name:'Фланелевая рубашка', sh:'Фланель', kind:'cloth', slot:'shirt', cov:'long', ins:3, prot:.05, col:[168, 52, 46], pat:'plaid', verb:'Надеть'},
  hoodie:{name:'Толстовка', kind:'cloth', slot:'shirt', cov:'long', ins:4, col:[122, 126, 134], verb:'Надеть'},
  thermal:{name:'Термобельё', sh:'Термо', kind:'cloth', slot:'shirt', cov:'long', ins:5, tire:1.03, col:[216, 207, 192], verb:'Надеть'},
  // верхний слой
  denimJ:{name:'Джинсовая куртка', sh:'Джинсовка', kind:'cloth', slot:'torso', cov:'long', ins:3, prot:.15, col:[74, 106, 154], pat:'denim', verb:'Надеть'},
  workvest:{name:'Сигнальный жилет', sh:'Жилет', kind:'cloth', slot:'torso', cov:'vest', ins:1, cap:3, col:[208, 122, 30], pat:'hiviz', verb:'Надеть'},
  milJ:{name:'Армейский китель', sh:'Китель', kind:'cloth', slot:'torso', cov:'long', ins:4, prot:.2, cap:2, col:[90, 106, 58], pat:'camo', verb:'Надеть'},
  // штаны
  jeans:{name:'Джинсы', kind:'cloth', slot:'legs', cov:'pants', ins:1, prot:.15, col:[62, 90, 134], pat:'denim', verb:'Надеть'},
  shorts:{name:'Шорты', kind:'cloth', slot:'legs', cov:'shorts', ins:0, spd:1.03, col:[138, 122, 90], verb:'Надеть'},
  sweatp:{name:'Спортивные штаны', sh:'Треники', kind:'cloth', slot:'legs', cov:'pants', ins:2, noise:.88, tire:.95, col:[58, 60, 68], verb:'Надеть'},
  cargo:{name:'Штаны карго', sh:'Карго', kind:'cloth', slot:'legs', cov:'pants', ins:2, prot:.1, cap:3, col:[122, 114, 88], verb:'Надеть'},
  milP:{name:'Армейские брюки', sh:'Брюки', kind:'cloth', slot:'legs', cov:'pants', ins:3, prot:.2, cap:2, col:[90, 106, 58], pat:'camo', verb:'Надеть'},
  motoP:{name:'Мотоштаны', kind:'cloth', slot:'legs', cov:'pants', ins:3, prot:.35, spd:.95, noise:1.12, col:[42, 42, 46], verb:'Надеть'},
  // обувь
  sneakers:{name:'Кроссовки', kind:'cloth', slot:'feet', cov:'shoe', ins:0, spd:1.04, noise:.95, col:[226, 226, 222], verb:'Обуть'},
  boots:{name:'Рабочие ботинки', sh:'Ботинки', kind:'cloth', slot:'feet', cov:'boot', ins:1, prot:.25, spd:.97, noise:1.25, col:[128, 84, 48], verb:'Обуть'},
  milB:{name:'Армейские берцы', sh:'Берцы', kind:'cloth', slot:'feet', cov:'boot', ins:2, prot:.3, noise:1.15, tire:.96, col:[40, 40, 42], verb:'Обуть'},
  slippers:{name:'Домашние тапочки', sh:'Тапочки', kind:'cloth', slot:'feet', cov:'shoe', ins:1, spd:.9, noise:.6, col:[122, 90, 138], verb:'Обуть'},
  rubberB:{name:'Резиновые сапоги', sh:'Сапоги', kind:'cloth', slot:'feet', cov:'boot', ins:1, dry:true, spd:.93, noise:1.15, col:[58, 106, 58], verb:'Обуть'},
  // голова
  cap:{name:'Бейсболка', kind:'cloth', slot:'head', cov:'hat', ins:0, col:[176, 58, 48], verb:'Надеть'},
  balacl:{name:'Балаклава', kind:'cloth', slot:'head', cov:'mask', ins:3, prot:.1, col:[38, 38, 42], verb:'Надеть'},
});
// старые вещи: какие области закрывают и как выглядят
for (const [id, cov, col] of [['jacket', 'long'], ['sweater', 'long'], ['raincoat', 'long'], ['leather', 'long'], ['parka', 'long'],
  ['hat', 'hat'], ['ushanka', 'hat'], ['helmet', 'hat'], ['gloves', 'glove', [200, 154, 60]], ['glovesR', 'glove', [186, 168, 134]], ['mittens', 'glove', [168, 52, 46]]])
  if (ITEMS[id]) { ITEMS[id].cov = cov; if (col) ITEMS[id].col = col; }
if (ITEMS.parka) Object.assign(ITEMS.parka, {spd:.96, tire:1.06});
if (ITEMS.leather) delete ITEMS.leather.info;
if (ITEMS.helmet) { delete ITEMS.helmet.info; ITEMS.helmet.noise = 1; }
Object.assign(DESC, {
  tshirt:'Обычная хлопковая футболка. Почти не греет, зато не мешает.',
  tank:'Белая майка. Летом в ней легко дышится, зимой — смерть.',
  longsl:'Футболка с длинным рукавом. Прикрывает руки от царапин и немного греет.',
  flannel:'Клетчатая рубашка из плотной фланели. Тёплая и крепкая.',
  hoodie:'Мягкая толстовка. Хорошо держит тепло под курткой.',
  thermal:'Термобельё: под ним тепло даже в мороз, но на бегу жарко и быстрее устаёшь.',
  denimJ:'Джинсовая куртка. Плотная ткань неплохо держит зубы.',
  workvest:'Оранжевый жилет дорожника. Не греет, зато карманов полно: +3 места.',
  milJ:'Камуфляжный китель. Тёплый, крепкий и с карманами.',
  jeans:'Обычные джинсы. Плотная ткань чуть защищает ноги.',
  shorts:'Шорты. Ноги открыты, зато бегать легко.',
  sweatp:'Спортивные штаны. Мягкие и тихие, в них меньше устаёшь.',
  cargo:'Штаны с большими карманами по бокам: +3 места.',
  milP:'Армейские брюки: тёплые, прочные, с карманами.',
  motoP:'Мотоштаны со вставками. Укусы почти не проходят, но в них тяжело и шуршишь.',
  sneakers:'Лёгкие кроссовки. Быстро и почти бесшумно.',
  boots:'Тяжёлые рабочие ботинки. Защищают ноги, но топают на всю улицу.',
  milB:'Армейские берцы. Тёплые, крепкие, ноги в них устают меньше.',
  slippers:'Домашние тапочки. Тихо, но далеко в них не убежишь.',
  rubberB:'Резиновые сапоги. Ноги не промокают, но бежать неудобно.',
  cap:'Бейсболка. Просто кепка.',
  balacl:'Вязаная балаклава: греет голову и прикрывает шею.',
});
{
  const add = (k, ...ids) => { if (CONT[k]) CONT[k].loot.push(...ids); };
  add('wardrobe', 'tshirt', 'longsl', 'flannel', 'hoodie', 'jeans', 'cargo', 'shorts', 'denimJ', 'sweatp', 'thermal');
  add('dresser', 'tshirt', 'tank', 'thermal', 'shorts', 'sweatp', 'longsl', 'cap');
  add('hanger', 'denimJ', 'hoodie', 'cap'); add('shoerack', 'sneakers', 'boots', 'slippers', 'rubberB', 'sneakers');
  add('laundry', 'tshirt', 'jeans', 'tank', 'sweatp'); add('washer', 'tshirt', 'jeans', 'longsl');
  add('locker', 'workvest', 'boots', 'cargo'); add('armybox', 'milJ', 'milP', 'milB', 'balacl');
  add('crate', 'workvest', 'boots', 'rubberB'); add('car', 'cap', 'hoodie'); add('boxes', 'flannel', 'thermal', 'slippers');
}
TEXTILE.add('tshirt'); TEXTILE.add('tank'); TEXTILE.add('longsl'); TEXTILE.add('flannel'); TEXTILE.add('hoodie'); TEXTILE.add('thermal');
TEXTILE.add('denimJ'); TEXTILE.add('jeans'); TEXTILE.add('shorts'); TEXTILE.add('sweatp'); TEXTILE.add('cargo'); TEXTILE.add('milJ'); TEXTILE.add('milP'); TEXTILE.add('balacl');

// ---- что надето ----
const worn = () => CLOTH_SLOTS.filter(s => s !== 'wrist').map(s => P.cloth && P.cloth[s]).filter(Boolean);
const wornK = key => worn().reduce((k, c) => k * (ITEMS[c.id][key] || 1), 1);
const barefoot = () => !(P.cloth && P.cloth.feet);
function wornNames() { const w = worn(); return w.length ? w.map(c => ITEMS[c.id].name.toLowerCase()).join(', ') : 'одно бельё'; }
function coverOf(part) {
  const R = PART_REG[part] || [], out = [];
  for (const s of PROT_ORDER) { const c = P.cloth && P.cloth[s]; if (c && (COVER[ITEMS[c.id].cov] || []).some(r => R.includes(r))) out.push(c); }
  return out;
}
clothAt = part => coverOf(part)[0] || null;
partProt = function (part) {
  let keep = 1; for (const c of coverOf(part)) keep *= 1 - (ITEMS[c.id].prot || 0) * cdur(c) / 100;
  let p = 1 - keep; if (part === 'neck') p *= .4; return Math.min(.7, p);
};
const REG2PART = {head:'head', neck:'neck', chest:'torso', belly:'torso', armR:'arm', armL:'arm', handR:'arm', handL:'arm', legR:'leg', legL:'leg'};
function regClothText(sel) {
  const part = REG2PART[sel] || 'torso', cs = (sel === 'handR' || sel === 'handL') ? [P.cloth && P.cloth.hands].filter(Boolean) : coverOf(part);
  if (!cs.length) return 'Ничем не прикрыто';
  const p = Math.round(partProt(part) * 100);
  return 'Прикрывает: ' + cs.map(c => ITEMS[c.id].name.toLowerCase() + ' ' + Math.round(cdur(c)) + '%').join(', ') + (p ? ' · защита ' + p + '%' : '');
}
insulation = function () {
  let s = 1;                                                                        // одно бельё
  for (const c of worn()) s += clothIns(c);
  if (barefoot()) s -= 1;
  if (P.sleep && (!P.bed || P.bed.type === 'bed' || P.bed.type === 'sofa')) s += 6;
  return Math.round(s);
};
const stepNoiseK34 = stepNoiseK;
stepNoiseK = () => stepNoiseK34() * wornK('noise') * (barefoot() ? .7 : 1);
const enDrainK34 = enDrainK;
enDrainK = () => enDrainK34() * wornK('tire');
const updateClimate34 = updateClimate;
updateClimate = function (gm) {                                                   // резиновые сапоги: ноги сухие — промокаешь медленнее
  const w0 = P.wet || 0; updateClimate34(gm);
  const f = P.cloth && P.cloth.feet; if (f && ITEMS[f.id].dry && (P.wet || 0) > w0) P.wet = w0 + (P.wet - w0) * .7;
};

// ---- надеть / снять (карманы меняют вместимость) ----
const pockets = it => (it && ITEMS[it.id].cap) || 0;
wearCloth = function (k) {
  const it = P.inv[k], d = ITEMS[it.id]; P.cloth = P.cloth || {};
  const old = P.cloth[d.slot], room = P.cap - pockets(old) + pockets(it);
  if (P.inv.length - 1 + (old ? 1 : 0) > room) { toast('Некуда деть вещи из карманов'); return; }
  P.inv.splice(k, 1); if (old) P.inv.push(old); P.cloth[d.slot] = it;
  P.cap = room; SFX.equip(); toast((d.slot === 'feet' ? 'Обул: ' : 'Надел: ') + d.name.toLowerCase()); renderInv(); updateHud();
};
takeOffCloth = function (slot) {
  const it = P.cloth && P.cloth[slot]; if (!it) return;
  const room = P.cap - pockets(it);
  if (P.inv.length + 1 > room) { toast(pockets(it) ? 'Сначала освободи место: в карманах вещи' : 'Рюкзак полон'); return; }
  P.inv.push(it); P.cloth[slot] = null; P.cap = room; SFX.rustle(); renderInv(); updateHud();
};

// ---- описание вещи ----

// ---- стартовая одежда: на герое футболка, джинсы и кроссовки; всё снимается ----
function starterClothes() {
  P.cloth = P.cloth || {};
  for (const [s, id] of [['shirt', 'tshirt'], ['legs', 'jeans'], ['feet', 'sneakers']]) if (!P.cloth[s]) { const it = mkItem(id); delete it.cd; P.cloth[s] = it; }
  P.cloth.v = 34;
}
onStartNew(() => { if (P) starterClothes();
});
onLoad((d) => { if (P && !(P.cloth && P.cloth.v)) starterClothes();
});   // старые сохранения: раньше одежда была «нарисована»

// ---- картинка: красим области тела цветом надетых вещей ----
const hash34 = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;
function outfitRegs() {
  const reg = new Array(16).fill(null);
  for (const s of DRAW_ORDER) {
    const c = P.cloth && P.cloth[s]; if (!c) continue;
    const d = ITEMS[c.id], o = {d, torn:cdur(c) < 35};
    for (const r of COVER[d.cov] || []) reg[r] = o;
  }
  if (P.armor) reg[1] = {d:{col:[46, 56, 74], pat:'armor'}};
  return reg;
}
function outfitKey() { return DRAW_ORDER.map(s => { const c = P.cloth && P.cloth[s]; return c ? c.id + (cdur(c) < 35 ? '~' : '') : ''; }).join(',') + (P.armor ? ',A' : ''); }
function patCol(d, x, y) {
  const c = d.col;
  switch (d.pat) {
    case 'plaid': return ((x >> 1) % 3 === 0 || ((y + 1) >> 1) % 3 === 0) ? [c[0] * .55, c[1] * .55, c[2] * .6] : (((x + y) & 3) === 0 ? [c[0] * 1.15, c[1] * 1.1, c[2]] : c);
    case 'camo': { const h = hash34(x >> 1, y >> 1); return h < .3 ? [46, 52, 36] : h < .55 ? [110, 92, 62] : c; }
    case 'denim': { const k = .9 + hash34(x, y) * .18; return [c[0] * k, c[1] * k, c[2] * k]; }
    case 'hiviz': return y % 7 < 1 ? [226, 230, 214] : c;
    case 'armor': return (x + y) % 9 === 0 ? [c[0] * .7, c[1] * .7, c[2] * .7] : c;
  }
  return c;
}
let tmp34 = null;
function dressFrame(f, cv, reg) {
  const rimg = ART.imgs[f[0] + 'r'], w = f[3], h = f[4];
  if (!rimg) return null;                                                        // карта ещё грузится — кадр соберём позже
  if (!tmp34 || tmp34.width < w || tmp34.height < h) tmp34 = mkCanvas(Math.max(w, tmp34 ? tmp34.width : 0), Math.max(h, tmp34 ? tmp34.height : 0));
  const tg = tmp34.getContext('2d', {willReadFrequently:true}); tg.clearRect(0, 0, w, h); tg.drawImage(rimg, f[1], f[2], w, h, 0, 0, w, h);
  const R = tg.getImageData(0, 0, w, h).data, g = cv.getContext('2d', {willReadFrequently:true}), D = g.getImageData(0, 0, w, h), a = D.data;
  const n = w * h, O = new Array(n);
  for (let p = 0; p < n; p++) O[p] = R[p * 4 + 3] < 128 ? undefined : reg[R[p * 4] >> 4];
  for (let i = 0, p = 0; i < a.length; i += 4, p++) {
    const o = O[p]; if (!o) continue;
    const x = p % w, y = (p / w) | 0;
    if (o.torn && hash34(x + 7, y) < .16) continue;                              // дыры: видно кожу
    // край вещи (рядом тело без неё) — тёмный шов: манжеты, низ штанин, ворот
    const hem = (y + 1 < h && O[p + w] !== undefined && O[p + w] !== o) || (y > 0 && O[p - w] !== undefined && O[p - w] !== o);
    const s = R[i + 1] * (1.5 / 255) * (hem ? .68 : 1), k = R[i + 2] / 255, c = patCol(o.d, x, y);
    a[i] = a[i] * (1 - k) + Math.min(255, c[0] * s) * k; a[i + 1] = a[i + 1] * (1 - k) + Math.min(255, c[1] * s) * k; a[i + 2] = a[i + 2] * (1 - k) + Math.min(255, c[2] * s) * k;
  }
  g.putImageData(D, 0, 0);
  return {cv, ax:f[5], ay:f[6], w, h, s:f[7] || 1};
}
const playerLookPal34 = playerLookPal;
playerLookPal = function (lk) {
  if (lk.g === 'm') return {pal:{outfit:outfitRegs()}, key:'PM|' + outfitKey()};
  // героиня — старые палитровые кадры: верх, штаны, шапка цветом вещей; без вещи — кожа / бельё
  const pal = lookPal(lk), cl = P.cloth || {}, top = cl.torso || cl.shirt, skin = LOOK.skin[lk.skin];
  pal[3] = pal[9] = top ? ITEMS[top.id].col : [226, 226, 220];
  pal[4] = cl.torso || (cl.shirt && ITEMS[cl.shirt.id].cov === 'long') ? ITEMS[top.id].col : skin;
  pal[5] = cl.legs ? ITEMS[cl.legs.id].col : [57, 70, 92];
  if (cl.head) pal[2] = ITEMS[cl.head.id].col;
  if (cl.feet) pal[6] = ITEMS[cl.feet.id].col; else pal[6] = skin;
  return {pal, key:'PF|' + lk.skin + lk.hair + '|' + outfitKey()};
};


// ---- схема тела: цвета по надетому ----

// ---- пиксельный вайб по умолчанию: мир без сглаживания (детальный режим остаётся в настройках) ----
SETTINGS_DEF.smooth = false;
if (settings.gfxv !== 35) { settings.smooth = false; settings.gfxv = 35; try { localStorage.setItem('karantin-settings', JSON.stringify(settings)); } catch (e) {} }
