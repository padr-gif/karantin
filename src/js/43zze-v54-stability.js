// ================= v54: надёжные сохранения и отчёт об ошибках (этап 1 плана) =================
// Сохранения: тело сжимается (LZW из v50), у каждого слота есть запасная копия — прошлое удачное сохранение.
// Если основное не читается или не загружается, игра берёт запасное. Сохранение можно выгрузить файлом и загрузить
// из файла (перенести игру на другой телефон). Ошибки кадра и скрипта пишутся в журнал; в паузе — «Отчёт об ошибках».

const GAME_VER = '0.54';
const PKEY = s => LKEY(s) + '-prev';
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) {} };
// запись {meta, body, z?} → объект сохранения; null, если не читается
function unpackRec(rec) {
  if (!rec || typeof rec.body !== 'string') return null;
  try { return JSON.parse(rec.z ? lzUnpack(rec.body) : rec.body); } catch (e) { return null; }
}
function readLocal(k) { const raw = lsGet(k); if (!raw) return null; try { return JSON.parse(raw); } catch (e) { return null; } }
function saveMeta() { return {day:Math.floor(gameMin / 1440) + 1, time:fmtTime(gameMin), kills, t:Date.now(), diff:world.diff, ver:GAME_VER}; }
function packSave() { const json = JSON.stringify(serialize()); return {meta:saveMeta(), body:lzPack(json), z:1, raw:json.length}; }

writeSave = async function (s) {
  if (saving) return false; saving = true;
  try {
    const rec = packSave(), raw = rec.raw; delete rec.raw;
    const str = JSON.stringify(rec);
    // проверка до записи: сжатое читается обратно
    if (!unpackRec(JSON.parse(str))) { logErr(new Error('save-roundtrip ' + s)); return false; }
    // прежнее удачное сохранение становится запасным
    const cur = lsGet(LKEY(s)); if (cur && unpackRec(readLocal(LKEY(s)))) lsSet(PKEY(s), cur);
    let ok = lsSet(LKEY(s), str);
    if (!ok) {                                                               // не влезло: освобождаем место за счёт запасных копий других слотов
      for (const o of SAVE_SLOTS) if (o !== s) lsDel(PKEY(o));
      ok = lsSet(LKEY(s), str);
      if (!ok) { lsDel(PKEY(s)); ok = lsSet(LKEY(s), str); }
    }
    await waitStore();
    if (store.db && str.length < 240000) { try { await cloudDoc(s).set({meta:rec.meta, body:rec.body, z:1}); ok = true; } catch (e) {} }
    if (!ok) logErr(new Error('save-failed ' + s + ' ' + Math.round(str.length / 1024) + 'KB, raw ' + Math.round(raw / 1024) + 'KB'));
    return ok;
  } catch (e) { logErr(e); return false; }
  finally { saving = false; }
};
// все кандидаты слота: облако, браузер, запасная копия — свежие первыми
async function slotCands(s) {
  await waitStore();
  const out = [];
  if (store.db) { try { const d = await cloudDoc(s).get(); if (d.exists) out.push({src:'cloud', rec:d.data()}); } catch (e) {} }
  const l = readLocal(LKEY(s)); if (l) out.push({src:'local', rec:l});
  out.sort((a, b) => ((b.rec.meta && b.rec.meta.t) || 0) - ((a.rec.meta && a.rec.meta.t) || 0));
  const p = readLocal(PKEY(s)); if (p) out.push({src:'prev', rec:p});
  return out;
}
readSave = async function (s) { for (const c of await slotCands(s)) { const d = unpackRec(c.rec); if (d) return d; } return null; };
deleteSave = async function (s) {
  lsDel(LKEY(s)); lsDel(PKEY(s));
  await waitStore();
  if (store.db) { try { await cloudDoc(s).delete(); } catch (e) {} }
};
// загрузка: если основное не применяется — пробуем запасное
function applyOrNull(d) { try { applySave(d); return true; } catch (e) { if (e && e.message === 'old') throw e; logErr(e); return false; } }
loadSlot = async function (s) {
  const C = await slotCands(s);
  if (!C.length) { toast('Сохранение не найдено'); return; }
  for (let k = 0; k < C.length; k++) {
    const d = unpackRec(C[k].rec); if (!d) continue;
    try { if (!applyOrNull(d)) continue; }
    catch (e) { toast('Это сохранение от старой версии города. Начни новую игру'); return; }
    beginPlay();
    toast(C[k].src === 'prev' || k > 0 ? 'Основное сохранение повреждено — загружена предыдущая копия' : 'Загружено: день ' + (Math.floor(gameMin / 1440) + 1) + ', ' + fmtTime(gameMin));
    return;
  }
  toast('Сохранение повреждено, запасной копии нет');
};

// ---- файл сохранения ----
function downloadText(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], {type:type || 'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
}
async function exportSlot(s) {
  const C = await slotCands(s), c = C.find(c => unpackRec(c.rec));
  if (!c) { toast('Нечего выгружать'); return; }
  const m = c.rec.meta || {};
  downloadText('karantin-den-' + (m.day || 0) + '-' + (s === 'auto' ? 'avto' : 'slot' + s) + '.karantin', JSON.stringify({karantin:1, meta:m, body:c.rec.body, z:c.rec.z ? 1 : 0}));
  toast('Файл сохранения скачан');
}
function importFile() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.karantin,.json,application/json';
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let rec = null; try { rec = JSON.parse(r.result); } catch (e) {}
      const d = rec && rec.karantin ? unpackRec(rec) : null;
      if (!d) { toast('Это не файл сохранения «Карантина»'); return; }
      try { if (!applyOrNull(d)) { toast('Файл сохранения повреждён'); return; } }
      catch (e) { toast('Это сохранение от старой версии города'); return; }
      beginPlay(); writeSave('auto');
      toast('Загружено из файла: день ' + (Math.floor(gameMin / 1440) + 1));
    };
    r.readAsText(f);
  };
  inp.click();
}
{ const rs = renderSaves;
  renderSaves = async function () {
    await rs();
    const list = $('svList'); if (!list) return;
    const rows = list.querySelectorAll('.slot'), slots = SAVE_SLOTS.filter(s => !(svMode === 'save' && s === 'auto'));
    rows.forEach((row, k) => {
      const s = slots[k], acts = row.querySelector('.acts');
      if (!s || !acts) return;
      const has = !!(readLocal(LKEY(s)) || readLocal(PKEY(s)));
      if (svMode === 'load' && has) acts.appendChild(btn('В файл', () => exportSlot(s)));
    });
    if (svMode === 'load') { const b = btn('Загрузить из файла…', importFile, 'mbtn'); b.style.marginTop = '8px'; list.appendChild(b); }
  };
}

// ---- журнал ошибок ----
const ERRLOG = [];
function logErr(e, where) {
  try {
    const msg = String((e && (e.stack || e.message)) || e).split('\n').slice(0, 6).join('\n');
    const last = ERRLOG[ERRLOG.length - 1];
    if (last && last.msg === msg) { last.n++; return; }
    ERRLOG.push({t:new Date().toISOString(), where:where || '', msg, n:1});
    if (ERRLOG.length > 30) ERRLOG.shift();
  } catch (x) {}
}
addEventListener('error', e => logErr(e.error || e.message, 'window'));
addEventListener('unhandledrejection', e => logErr(e.reason, 'promise'));
function errReport() {
  const L = [];
  L.push('Карантин ' + GAME_VER + ' · ' + new Date().toLocaleString('ru-RU'));
  L.push(navigator.userAgent);
  L.push('Экран ' + innerWidth + '×' + innerHeight + ' @' + (devicePixelRatio || 1) + ', графика ' + settings.gfx + (typeof perfStat === 'function' ? ' · ' + perfStat() : ''));
  if (P && mode !== 'menu') L.push('День ' + (Math.floor(gameMin / 1440) + 1) + ', район ' + (world.dx || 0) + ',' + (world.dy || 0) + ' (' + (world.dtype || '?') + '), мертвецов ' + (zs ? zs.length : 0));
  L.push('');
  if (!ERRLOG.length) L.push('Ошибок не было.');
  for (const e of ERRLOG) L.push('[' + e.t.slice(11, 19) + '] ' + (e.where ? e.where + ': ' : '') + (e.n > 1 ? '×' + e.n + ' ' : '') + e.msg);
  return L.join('\n');
}
async function copyReport() {
  const text = errReport();
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {}
  if (!ok) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch (e) {} ta.remove(); }
  toast(ok ? 'Отчёт скопирован — вставь его в сообщение' : 'Не удалось скопировать');
}
{ const nav = document.querySelector('#pause .mlist');
  if (nav && !$('pReport')) { const b = mk('button', 'mbtn', 'Отчёт об ошибках'); b.id = 'pReport'; b.type = 'button'; b.addEventListener('click', () => { SFX.ui(); copyReport(); }); nav.insertBefore(b, $('pMenu')); }
}

// ---- тест скорости: из главного меню, ~25 секунд, четыре сцены. Результат — в отчёт и на экран ----
let BENCH = null; try { BENCH = JSON.parse(localStorage.getItem('karantin-bench') || 'null'); } catch (e) {}
function perfStat() { return BENCH ? 'тест скорости: ' + BENCH.rows.map(r => r.n + ' ' + r.fps + ' FPS (худшие ' + r.low + ', код ' + r.js + ' мс)').join('; ') + ', качество ' + BENCH.res : 'тест скорости не запускался'; }
const BENCH_SCENES = [
  ['Улица днём', () => { const H = houses.find(h => h.kind === 'store') || houses[0]; P.x = H.x + H.w / 2; P.y = H.y + H.h + 2.5; gameMin = 12 * 60; rain = rainTarget = 0; }],
  ['Ночь и дождь', () => { gameMin = 23 * 60; rain = rainTarget = 1; P.inv.push(mkItem('flashlight')); }],
  ['Толпа 40', () => { gameMin = 12 * 60; rain = rainTarget = 0; for (let i = 0; i < 40; i++) mkZombie(P.x + (rng() - .5) * 14, P.y + (rng() - .5) * 14, zPal(), 999, .15); }],
  ['В доме', () => { const H = houses.find(h => h.kind === 'house' && h.rooms) || houses[0], r = H.rooms[0]; P.x = (r.x0 + r.x1) / 2 + .5; P.y = (r.y0 + r.y1) / 2 + .5; zs.length = 0; }],
];
async function runBench() {
  if (mode !== 'menu' || !ART.ready) { toast('Тест скорости запускается из главного меню'); return; }
  const ov = mk('div'); ov.id = 'benchov'; document.body.appendChild(ov);
  const keepU = update, keepR = render, wait = ms => new Promise(r => setTimeout(r, ms));
  let js = 0, frames = [], lastT = 0, on = false;
  update = function (dt) { const t = performance.now(); try { return keepU(dt); } finally { if (on) js += performance.now() - t; } };
  render = function (dt) { const t = performance.now(); try { return keepR(dt); } finally { if (on) js += performance.now() - t; } };
  const tick = t => { if (!on) return; if (lastT) frames.push(t - lastT); lastT = t; requestAnimationFrame(tick); };
  const rows = [];
  try {
    newGame(); beginPlay(); P.hp = 1e9; P.inf = false;
    for (let k = 0; k < BENCH_SCENES.length; k++) {
      const [n, setup] = BENCH_SCENES[k];
      ov.textContent = 'Тест скорости · ' + (k + 1) + ' из ' + BENCH_SCENES.length + ': ' + n.toLowerCase() + '…';
      setup(); camX = P.x; camY = P.y; computeVis(); fogDirty = true; keys.clear(); keys.add('KeyD');
      await wait(1200);
      js = 0; frames = []; lastT = 0; on = true; requestAnimationFrame(tick);
      await wait(5000); on = false;
      const f = frames.slice().sort((a, b) => a - b), sum = f.reduce((a, b) => a + b, 0) || 1, n2 = f.length || 1;
      rows.push({n, fps:Math.round(1000 * n2 / sum), low:Math.round(1000 / (f[Math.floor(n2 * .95)] || 1000)), js:+(js / n2).toFixed(1)});
      P.hp = 1e9;
    }
  } catch (e) { logErr(e, 'тест скорости'); }
  finally {
    update = keepU; render = keepR; keys.clear(); ov.remove();
    BENCH = {t:Date.now(), rows, res:+resQ.toFixed(2), dpr:devicePixelRatio || 1, gfx:settings.gfx};
    try { localStorage.setItem('karantin-bench', JSON.stringify(BENCH)); } catch (e) {}
    newGame(); for (let i = 0; i < NT; i++) seen[i] = 1; toMenu();
    showBench();
  }
}
function showBench() {
  if (!BENCH || !BENCH.rows.length) { toast('Тест не завершился'); return; }
  const worst = Math.min(...BENCH.rows.map(r => r.fps));
  const verdict = worst >= 45 ? 'Отлично: играется плавно.' : worst >= 28 ? 'Нормально: играть можно.' : 'Медленно. Поставь графику «Экономия» в настройках.';
  eventBanner('Тест скорости', BENCH.rows.map(r => r.n + ': ' + r.fps + ' FPS').join(' · ') + '. ' + verdict, '', 'i-star');
  if (worst < 28 && settings.gfx > 1.5) { settings.gfx = 1.5; saveSettings(); applySettings(); toast('Включил графику «Экономия»'); }
}
{ const list = document.querySelector('#settings .setlist');
  if (list && !$('sBench')) {
    const row = mk('div', 'set'), info = mk('div');
    info.appendChild(mk('b', '', 'Тест скорости')); info.appendChild(mk('small', '', 'Около 25 секунд. Результат попадёт в отчёт об ошибках'));
    const b = mk('button', 'mbtn', 'Проверить'); b.type = 'button'; b.id = 'sBench';
    b.addEventListener('click', () => { if (backTo !== 'menu') { toast('Запусти тест из главного меню'); return; } SFX.ui(); show(null); runBench(); });
    row.appendChild(info); row.appendChild(b); list.appendChild(row);
  }
  const st = document.createElement('style');
  st.textContent = '#benchov{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:80;background:rgba(12,16,18,.9);color:#efe7d2;font:600 14px "PT Sans",sans-serif;padding:8px 14px;border-radius:8px;border:1px solid #2c343a;pointer-events:none}';
  document.head.appendChild(st);
}

// ---- панель быстрых слотов не заезжает под кнопки справа (узкие телефоны 640–760 px) ----
const shown = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';   // offsetParent у fixed-элементов всегда null
function fitDock() {
  const dock = $('dock'); if (!shown(dock)) return;
  dock.classList.remove('tight'); dock.style.marginLeft = '';
  const pad = ['bSneak', 'bRun', 'bAtk', 'bInv'].map($).filter(shown).map(e => e.getBoundingClientRect());
  if (!pad.length) return;
  const fits = () => { const r = dock.getBoundingClientRect(); return pad.every(p => r.right + 6 <= p.left || r.bottom <= p.top || r.top >= p.bottom); };
  const shift = () => { const r = dock.getBoundingClientRect(), lim = Math.min(...pad.filter(p => !(r.bottom <= p.top || r.top >= p.bottom)).map(p => p.left)) - 8; if (r.right > lim) dock.style.marginLeft = Math.max(8 - r.left, lim - r.right) + 'px'; };
  if (fits()) return;
  shift(); if (fits()) return;
  dock.classList.add('tight'); dock.style.marginLeft = ''; shift();
}
addEventListener('resize', () => setTimeout(fitDock, 60));
setInterval(() => { if (mode === 'play') fitDock(); }, 1500);
{ const bp = beginPlay; beginPlay = function () { bp(); setTimeout(fitDock, 50); }; }
{ const st = document.createElement('style');
  st.textContent = '#dock.tight{gap:3px!important;padding:3px!important}#dock.tight .hslot{width:40px!important}#dock.tight .wslot{width:48px!important}#dock.tight .hslot small,#dock.tight .wslot small{font-size:9px!important}'
    + '#zoomBox .ibtn.sm{width:38px!important;height:38px!important}#zoomBox .ibtn.sm .ic{width:18px;height:18px}';
  document.head.appendChild(st);
}
