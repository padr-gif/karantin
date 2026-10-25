// ================= screens =================
const SCREENS = ['menu', 'create', 'saves', 'settings', 'help', 'pause', 'dead', 'ach', 'story'];
let backTo = 'menu', svMode = 'load';
function show(id) { for (const s of SCREENS) $(s).hidden = s !== id; }
const visibleScreen = () => SCREENS.find(s => !$(s).hidden);
function mk(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function btn(label, fn, cls) { const b = mk('button', cls || '', label); b.type = 'button'; b.addEventListener('click', fn); return b; }
function confirmBtn(label, ask, fn, cls) {
  let armed = 0;
  const b = btn(label, () => { if (armed && Date.now() - armed < 3000) { armed = 0; fn(); } else { armed = Date.now(); b.textContent = ask; setTimeout(() => { if (armed) { armed = 0; b.textContent = label; } }, 3000); } }, cls);
  return b;
}
function seg(el, opts, get, set) {
  el.textContent = '';
  for (const [val, label] of opts) { const b = btn(label, () => { set(val); seg(el, opts, get, set); }); if (get() === val) b.className = 'on'; el.appendChild(b); }
}
function swatches(el, arr, get, set, none) {
  el.textContent = '';
  if (none) { const b = btn('', () => { set(-1); swatches(el, arr, get, set, none); }, 'none' + (get() === -1 ? ' on' : '')); b.setAttribute('aria-label', 'Без волос'); el.appendChild(b); }
  arr.forEach((c, i) => { const b = btn('', () => { set(i); swatches(el, arr, get, set, none); }, get() === i ? 'on' : ''); b.style.background = `rgb(${c.join(',')})`; b.setAttribute('aria-label', 'Цвет ' + (i + 1)); el.appendChild(b); });
}
function setMenuEnabled(on) { for (const id of ['mNew', 'mLoad', 'mContinue']) $(id).disabled = !on; }
let latestSlot = null;
async function refreshMenu() {
  const r = readRecord();
  $('rec').textContent = r ? 'Рекорд: ' + fmtDur(r) : '';
  const metas = await listSaves();
  latestSlot = null; let best = 0;
  for (const s of SAVE_SLOTS) if (metas[s] && metas[s].t > best) { best = metas[s].t; latestSlot = s; }
  $('mContinue').hidden = !latestSlot;
  if (latestSlot) $('mContinue').textContent = 'Продолжить · день ' + metas[latestSlot].day;
}
function toMenu() {
  closePanel(); wake();
  mode = 'menu'; paused = false;
  $('hud').hidden = true; $('ctrl').hidden = true; $('sleep').hidden = true;
  for (let i = 0; i < NT; i++) seen[i] = 1;
  fogFull = true;
  show('menu'); refreshMenu();
}
async function exitToMenu() { if (settings.autosave && mode === 'play') { await writeSave('auto'); } toMenu(); }
function beginPlay() {
  tryLandscape(); checkOrient();
  { const h = $('hint'); h.classList.remove('fade'); clearTimeout(h._t); h._t = setTimeout(() => h.classList.add('fade'), 20000); }
  mode = 'play'; paused = false; atkHeld = false; setRun(false); setSneak(P.sneak, true);
  show(null); $('sleep').hidden = true; closePanel();
  $('hud').hidden = false; $('ctrl').hidden = false; $('toasts').textContent = '';
  lastUse = ''; lastBar = null; autoT = 0; hud3Key = '';
  updateHud();
  try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => {}); } catch (e) {}
  setTimeout(fitDock, 50); guardUI();                                         // кнопки по размеру экрана, защита HUD от лишних перерисовок
}
function startNew() {
  if (typeof traitPts === 'function' && traitPts() < 0) { toast('Не хватает очков на черты'); return; }   // черты (v23)
  runHooked('startNew', startNewCore);
}
function startNewCore() {
  newGame({look:Object.assign({}, look), diff:newDiff});
  applyProf(newProf);
  if (NEWCFG.season === 'winter') { world.snow = .8; world.snowMsg = true; P.inv.push(mkItem('sweater')); P.inv.push(mkItem('hotpack')); }
  world.season = null;
  showStory(0);
}
function startPlayAfterStory() {
  show(null); beginPlay();
  toast('Город закрыт на карантин. Ты дома: обыщи комнаты, пока на улице тихо.');
}
const STORY = [
  ['12 сентября', 'Сначала это называли северной лихорадкой', 'Жар, бред, потом тишина. По телевизору говорили про тяжёлый грипп и просили не паниковать. В аптеках закончились жаропонижающие, у больницы выстроились очереди.'],
  ['13–14 сентября', 'Умершие поднялись', 'Через сутки после смерти заболевшие вставали. Они не узнавали родных и кусали всех, кто оказывался рядом. Больница №2 замолчала за одну ночь. К вечеру укушенные становились такими же.'],
  ['15 сентября, утро', 'Город закрыли', 'Ночью военные перекрыли все выезды бетонными блоками и колючей проволокой. По радио крутят одно и то же: «Оставайтесь дома. Ожидайте указаний». Тех, кто пытался прорваться к блокпосту, ты видел из окна.'],
  ['Сегодня', 'Никто не придёт', 'Свет обещают держать ещё неделю, воду — чуть дольше. Потом город останется один. Спасения не будет. Твоя задача прожить ещё один день. И ещё один. Осень, зима, весна… Сколько ты продержишься?'],
];
let storyI = 0;
function showStory(i) {
  storyI = i; let [when, title, text] = STORY[i];
  { const base = dateOf(gameMin), fmt = dd => { const t = new Date(base); t.setDate(t.getDate() + dd); return t.getDate() + ' ' + MONTHS[t.getMonth()]; };
    when = i === 0 ? fmt(-3) : i === 1 ? fmt(-2) + ' – ' + fmt(-1) : i === 2 ? fmt(0) + ', утро' : 'Сегодня';
    if (i === 3 && world.dayOff) text = text.replace('Осень, зима, весна', ({91:'Зима, весна, лето', 181:'Весна, лето, осень', 273:'Лето, осень, зима'})[world.dayOff] || 'Осень, зима, весна'); }
  $('stWhen').textContent = when; $('stTitle').textContent = title; $('stText').textContent = text;
  $('stDots').textContent = STORY.map((_, k) => k === i ? '●' : '○').join(' ');
  $('stNext').textContent = i === STORY.length - 1 ? 'Начать выживать' : 'Далее';
  show('story');
}
async function loadSlot(s) {
  const d = await readSave(s);
  if (!d) { toast('Сохранение не найдено'); return; }
  try { applySave(d); } catch (e) { toast(e.message === 'old' ? 'Это сохранение от старой версии города. Начни новую игру' : 'Сохранение повреждено'); return; }
  beginPlay(); toast('Загружено: день ' + (Math.floor(gameMin / 1440) + 1) + ', ' + fmtTime(gameMin));
}
function openPause() {
  if (mode !== 'play' || P.sleep) return;
  closePanel(); paused = true; atkHeld = false; joy.id = null; joy.x = joy.y = 0; $('stick').hidden = true;
  $('pInfo').textContent = `День ${Math.floor(gameMin / 1440) + 1}, ${fmtTime(gameMin)} · убито ${kills} · ${DIFF[world.diff].name.toLowerCase()} сложность`;
  show('pause');
}
function resume() { show(null); if (!panel) paused = false; }
function goBack() { show(backTo); if (backTo === 'menu') refreshMenu(); }
async function openSaves(m, from) {
  backTo = from; svMode = m;
  $('svTitle').textContent = m === 'save' ? 'Сохранить' : 'Загрузить';
  show('saves'); await renderSaves();
}
async function renderSaves() {
  const list = $('svList'); list.textContent = ''; list.appendChild(mk('p', 'rec', 'Читаю сохранения…'));
  const metas = await listSaves();
  $('svWhere').textContent = store.db ? 'В облаке: доступны с любого устройства' : 'В этом браузере';
  list.textContent = '';
  for (const s of SAVE_SLOTS) {
    if (svMode === 'save' && s === 'auto') continue;
    const m = metas[s], row = mk('div', 'slot'), info = mk('div');
    info.appendChild(mk('b', '', s === 'auto' ? 'Автосохранение' : 'Слот ' + s));
    info.appendChild(mk('small', '', m ? `День ${m.day}, ${m.time} · убито ${m.kills} · ${(DIFF[m.diff] || DIFF.normal).name.toLowerCase()} · ${new Date(m.t).toLocaleString('ru-RU', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}` : 'Пусто'));
    const acts = mk('div', 'acts');
    if (svMode === 'load') {
      const b = btn('Загрузить', () => loadSlot(s)); b.disabled = !m; acts.appendChild(b);
      if (m) acts.appendChild(confirmBtn('Удалить', 'Точно удалить?', async () => { await deleteSave(s); renderSaves(); }, 'danger'));
    } else {
      const doSave = async () => { const ok = await writeSave(s); toast(ok ? 'Сохранено в слот ' + s : 'Не удалось сохранить'); renderSaves(); };
      acts.appendChild(m ? confirmBtn('Перезаписать', 'Точно перезаписать?', doSave) : btn('Сохранить', doSave));
    }
    row.appendChild(info); row.appendChild(acts); list.appendChild(row);
  }
}
let settingsFrom = 'menu';                                           // откуда открыли настройки (вернуться туда после настройки кнопок)
function openSettings(from) {
  settingsFrom = from || settingsFrom;
  backTo = from; show('settings');
  const onoff = [[true, 'Вкл'], [false, 'Выкл']];
  const bind = (id, opts, key) => seg($(id), opts, () => settings[key], v => { settings[key] = v; saveSettings(); });
  bind('sZoom', [[-1, 'Мельче'], [0, 'Обычно'], [1, 'Крупнее'], [2, 'Очень крупно']], 'zoom');
  bind('sVol', [[0, 'Выкл'], [.35, 'Тихо'], [.7, 'Обычно'], [1, 'Громко']], 'vol');
  bind('sDay', [[.5, 'Медленно'], [1, 'Обычно'], [2, 'Быстро']], 'dayLen');
  bind('sGfx', [[1.5, 'Экономия'], [2, 'Обычная'], [3, 'Максимум']], 'gfx');
  bind('sRain', onoff, 'rain'); bind('sShake', onoff, 'shake'); bind('sGore', onoff, 'gore'); bind('sHints', onoff, 'hints'); bind('sAuto', onoff, 'autosave');
  bind('sUia', [[1, 'Нет'], [.8, '20%'], [.6, '40%'], [.4, '60%']], 'uia');
  seg($('sSmooth'), [[false, 'Пиксели'], [true, 'Детальная']], () => !!settings.smooth, v => { settings.smooth = v; saveSettings(); });
  seg($('sFps'), [[false, 'Нет'], [true, 'Да']], () => !!settings.fps, v => { settings.fps = v; saveSettings(); });
  seg($('sJoy'), [[false, 'Где коснулся'], [true, 'Закреплён']], () => !!settings.joyFix, v => { settings.joyFix = v; saveSettings(); if (!v) { $('stick').hidden = true; $('stick').classList.remove('fixed'); } });
  seg($('sNight'), onoff, () => settings.nightSnd !== false, v => { settings.nightSnd = v; saveSettings(); });
  seg($('sAdmin'), onoff, () => !!settings.admin, v => { settings.admin = v; saveSettings(); adminApply(); });
}
function openCreate() {
  show('create'); prevCache.clear();
  const re = () => { prevCache.clear(); openCreateFields(); };
  function openCreateFields() {
    seg($('oGender'), [['m', 'Мужчина'], ['f', 'Женщина']], () => look.g, v => { look.g = v; if (v === 'f' && look.hair < 0) look.hair = 0; re(); });
    swatches($('oSkin'), LOOK.skin, () => look.skin, v => { look.skin = v; re(); });
    swatches($('oHair'), LOOK.hair, () => look.hair, v => { look.hair = v; re(); }, look.g === 'm');
    swatches($('oShirt'), LOOK.shirt, () => look.shirt, v => { look.shirt = v; re(); });
    swatches($('oPants'), LOOK.pants, () => look.pants, v => { look.pants = v; re(); });
    seg($('oProf'), Object.entries(PROFS).map(([k, d]) => [k, d.name]), () => newProf, v => { newProf = v; $('oProfInfo').textContent = PROFS[v].info; });
    $('oProfInfo').textContent = PROFS[newProf].info;
    seg($('oDiff'), Object.entries(DIFF).map(([k, d]) => [k, d.name]), () => newDiff, v => { newDiff = v; $('oDiffInfo').textContent = DIFF[v].info; });
    $('oDiffInfo').textContent = DIFF[newDiff].info;
    seg($('oPower'), [[3, '3 дня'], [8, '8 дней'], [15, '15 дней'], [30, '30 дней'], [0, 'Никогда']], () => NEWCFG.power, v => { NEWCFG.power = v; });
    seg($('oWater'), [[3, '3 дня'], [9, '9 дней'], [15, '15 дней'], [30, '30 дней'], [0, 'Никогда']], () => NEWCFG.water, v => { NEWCFG.water = v; });
    seg($('oSeason'), Object.entries(SEASONS).map(([k, d]) => [k, d.name]), () => NEWCFG.season, v => { NEWCFG.season = v; $('oSeasonInfo').textContent = SEASONS[v].info; });
    $('oSeasonInfo').textContent = SEASONS[NEWCFG.season].info;
    seg($('oMut'), [[false, 'Обычные и бегуны'], [true, '+ громилы и крикуны']], () => NEWCFG.mut, v => { NEWCFG.mut = v; });
  }
  openCreateFields();
  renderTraitsUI();
  showCTab('look');
}
// character preview: recolour single frames
const prevCache = new Map();
function recolorFrame(name, pal) {
  const f = ART.meta.frames[name]; if (!f) return null;
  const c = mkCanvas(f[3], f[4]), g = c.getContext('2d');
  g.drawImage(ART.imgs[f[0]], f[1], f[2], f[3], f[4], 0, 0, f[3], f[4]);
  const d = g.getImageData(0, 0, f[3], f[4]), a = d.data;
  if (f[8] !== 1) for (let i = 0; i < a.length; i += 4) if (a[i + 3]) keyPx(a, i, pal);   // цветные кадры не перекрашиваем
  g.putImageData(d, 0, 0);
  return {c, ax:f[5], ay:f[6]};
}
function drawPreview() {
  const cvp = $('cPrev'); if (cvp.width !== 240) { cvp.width = 240; cvp.height = 300; }
  const g = cvp.getContext('2d');
  g.clearRect(0, 0, cvp.width, cvp.height);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(120, 282, 52, 16, 0, 0, 6.283); g.fill();
  const dir = Math.floor(animT / 1.2) % 8, nw = AN('p', 'walk'), fi = Math.floor(animT * 12) % nw;
  const name = 'p' + look.g + '_walk_' + dir + '_' + fi;
  const fr = charFrame(name, 'P' + look.g + look.skin + look.hair + look.shirt + look.pants, lookPal(look), true);
  if (!fr) return;
  const ps = 3.5 / ((fr && fr.s) || ART.meta.charScale || 1);                // вчетверо — крупно, пиксели ровные, размер не прыгает
  g.imageSmoothingEnabled = false; g.drawImage(fr.cv, 120 - fr.ax * ps, 282 - fr.ay * ps, fr.w * ps, fr.h * ps);
}
