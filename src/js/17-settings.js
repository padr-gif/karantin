// ================= flow =================
// ================= appearance, difficulty, settings =================
const LOOK = {
  skin:[[236,198,164],[214,176,138],[180,132,96],[132,92,62],[96,66,46],[232,190,154]],
  hair:[[38,30,24],[92,64,40],[164,124,72],[216,188,124],[130,120,112],[150,62,40],[156,106,64]],
  shirt:[[56,92,128],[124,42,38],[72,98,66],[58,60,66],[196,170,120],[154,112,62],[198,198,192],[226,214,188]],
  pants:[[48,52,64],[72,68,60],[38,38,42],[92,100,116],[112,92,66]],
};
const DIFF = {
  easy:  {name:'Лёгкая',  z:.6,  spd:.88, dmg:.7, loot:1.4, info:'Меньше мертвецов, они медленнее и слабее кусают. Вещей больше.'},
  normal:{name:'Обычная', z:1,   spd:1,   dmg:1,  loot:1,   info:'Как задумано: выжить трудно, но можно.'},
  hard:  {name:'Тяжёлая', z:1.5, spd:1.12, dmg:1.3, loot:.75, info:'Орды больше и быстрее, укусы сильнее, вещей мало.'},
};
const world = {seed:0, diff:'normal'};
let look = {g:'m', skin:5, hair:6, shirt:7, pants:2};   // по умолчанию — герой по фото автора: светлая кожа, русый, бежевая футболка, тёмные брюки
let newDiff = 'normal';
const NEWCFG = {power:8, water:9, mut:false};
function lookPal(lk, weapon) {
  const pal = Object.assign({}, PBASE);
  pal[1] = LOOK.skin[lk.skin]; pal[2] = lk.hair < 0 ? LOOK.skin[lk.skin].map(v => v * .9) : LOOK.hair[lk.hair];
  pal[3] = pal[4] = pal[9] = LOOK.shirt[lk.shirt]; pal[5] = LOOK.pants[lk.pants];
  if (lk.g === 'm') pal[10] = [34, 34, 36];   // у героя чёрная сумка через плечо (слот рюкзака)
  if (weapon) { pal[11] = WCOL[weapon][0]; pal[12] = WCOL[weapon][1]; }
  return pal;
}
const SETTINGS_DEF = {gfx:2, mini:true, vol:.7, zoom:0, dayLen:1, rain:true, shake:true, gore:true, hints:true, autosave:true, uia:1};
const settings = Object.assign({}, SETTINGS_DEF);
function loadSettings() { try { const s = JSON.parse(localStorage.getItem('karantin-settings') || 'null'); if (s) Object.assign(settings, s); } catch (e) {} applySettings(); }
function saveSettings() { try { localStorage.setItem('karantin-settings', JSON.stringify(settings)); } catch (e) {} applySettings(); }
function applySettings() { zoomOff = settings.zoom; gfxCap = settings.gfx || 2; resize(); document.body.classList.toggle('nohints', !settings.hints); document.body.style.setProperty('--uia', settings.uia || 1); }
