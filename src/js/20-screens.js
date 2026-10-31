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
  { const m = latestSlot && metas[latestSlot], ci = $('mContInfo'); if (ci) { ci.hidden = !m; if (m) ci.textContent = [m.name, m.time, (m.dn || (DIFF[m.diff] || DIFF.normal).name).toLowerCase(), 'убито ' + m.kills].filter(Boolean).join(' · '); } }
}
function toMenu() {
  closePanel(); wake();
  mode = 'menu'; paused = false;
  $('hud').hidden = true; $('ctrl').hidden = true; $('sleep').hidden = true;
  for (let i = 0; i < NT; i++) seen[i] = 1;
  fogFull = true; menuScene();
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
  camX = P.x; camY = P.y; warmWorld();                                         // земля, текстуры, кроны — до первого кадра (93-perf)
  setTimeout(fitDock, 50); guardUI();                                         // кнопки по размеру экрана, защита HUD от лишних перерисовок
}
function startNew() {
  if (typeof traitPts === 'function' && traitPts() < 0) { toast('Не хватает очков на черты'); return; }   // черты (v23)
  runHooked('startNew', startNewCore);
}
function startNewCore() {
  newGame({look:Object.assign({}, look), diff:newDiff, seed:NEWCFG.seedNum});   // seedNum — код мира с экрана создания (null — новый город)
  applyProf(newProf);
  if (NEWCFG.season === 'winter') { world.snow = .8; world.snowMsg = true; P.inv.push(mkItem('sweater')); P.inv.push(mkItem('hotpack')); }
  world.season = null;
  showStory(0);
}
function startPlayAfterStory() {
  show(null); beginPlay();
  toast('Город закрыт на карантин. Ты дома: обыщи комнаты, пока на улице тихо.');
}
// вступление: пять датированных листов — откуда пришла лихорадка и почему никто не придёт. Людей в живых нет, развязки нет.
// [сдвиг даты от начала игры в днях (null — «сегодня»), заголовок, текст, вид листа]
const STORY = [
  [-40, 'Образцы из мерзлоты', 'На северном месторождении вскрыли старую мерзлоту. В лаборатории НИИ «Северный» образцы дали рост при плюс четырёх. Отчёт отправили наверх. Ответа не пришло.', 'doc'],
  [-4, 'Северная лихорадка', 'Первые трое — с вахты. Жар сорок один, бред, потом тишина. По телевизору сказали: тяжёлый грипп, без паники. Жаропонижающие в аптеках кончились за день.', 'diary'],
  [-2, 'Умершие поднялись', 'Через несколько часов после смерти они вставали. Не узнавали родных, шли на звук и на свет. Укушенные к вечеру горели в жару — и тоже вставали.', 'diary'],
  [0, 'Город закрыли', 'Ночью на выездах поставили бетонные блоки и сетку. По радио крутили одно и то же: «Оставайтесь дома». Потом замолчало и радио.', 'radio'],
  [null, 'Никто не придёт', 'Свет обещают держать ещё неделю, воду — чуть дольше. Потом город останется один. Спасения не будет. История кончится только тогда, когда кончишься ты. Осень, зима, весна — сколько ты протянешь?', 'diary'],
];
const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
let storyI = 0, storyType = 0;
function showStory(i) {
  storyI = i; let [dd, title, text, kind] = STORY[i];
  const base = dateOf(gameMin), fmt = d => { const t = new Date(base); t.setDate(t.getDate() + d); return t.getDate() + ' ' + MONTHS[t.getMonth()]; };
  const when = dd == null ? 'Сегодня' : dd <= -20 ? MONTHS_NOM[new Date(new Date(base).setDate(new Date(base).getDate() + dd)).getMonth()] + ' · НИИ «Северный»' : fmt(dd) + (dd === 0 ? ', утро' : '');
  if (i === STORY.length - 1) {
    if (world.dayOff) text = text.replace('Осень, зима, весна', ({91:'Зима, весна, лето', 181:'Весна, лето, осень', 273:'Лето, осень, зима'})[world.dayOff] || 'Осень, зима, весна');
    if (P && P.look && P.look.name) text = P.look.name + ', ' + ((PROFS[P.prof] || PROFS.none).name).toLowerCase() + '. ' + text;
  }
  $('stWhen').textContent = when; $('stTitle').textContent = title;
  const card = document.querySelector('#story .story'); if (card) card.dataset.kind = kind;
  $('stDots').textContent = STORY.map((_, k) => k === i ? '●' : '○').join(' ');
  $('stNext').textContent = i === STORY.length - 1 ? 'Начать выживать' : 'Далее';
  show('story');
  // текст печатается по буквам; тап по листу — сразу целиком
  const el = $('stText'); clearInterval(storyType); el.textContent = '';
  if (reduceMotion) { el.textContent = text; return; }
  let n = 0; storyType = setInterval(() => { n += 2; el.textContent = text.slice(0, n); if (n >= text.length) clearInterval(storyType); }, 18);
  el.onclick = () => { clearInterval(storyType); el.textContent = text; };
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
  $('pInfo').innerHTML = (P.look && P.look.name ? '<b>' + P.look.name.replace(/</g, '') + '</b> · ' + (PROFS[P.prof] || PROFS.none).name.toLowerCase() + '<br>' : '') + `День ${Math.floor(gameMin / 1440) + 1}, ${fmtTime(gameMin)} · убито ${kills} · ${(DIFF[world.diff] || DIFF.normal).name.toLowerCase()}`;
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
    info.appendChild(mk('b', '', (s === 'auto' ? 'Автосохранение' : 'Слот ' + s) + (m && m.name ? ' · ' + m.name : '')));
    info.appendChild(mk('small', '', m ? `День ${m.day}, ${m.time} · убито ${m.kills} · ${(m.dn || (DIFF[m.diff] || DIFF.normal).name).toLowerCase()} · ${new Date(m.t).toLocaleString('ru-RU', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}` : 'Пусто'));
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
  if ($('sBright')) bind('sBright', [[1.15, 'Темнее'], [1, 'Обычно'], [.82, 'Светлее'], [.65, 'Ярко']], 'nightK');
  if ($('sVib')) bind('sVib', onoff, 'vib');
  if (typeof setTabs === 'function') setTabs();
}
// экран «Новый выживший» — 81-newgame.js
