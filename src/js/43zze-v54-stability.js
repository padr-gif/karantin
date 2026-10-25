// ================= v54: надёжные сохранения и отчёт об ошибках (этап 1 плана) =================
// Сохранения: тело сжимается (LZW из v50), у каждого слота есть запасная копия — прошлое удачное сохранение.
// Если основное не читается или не загружается, игра берёт запасное. Сохранение можно выгрузить файлом и загрузить
// из файла (перенести игру на другой телефон). Ошибки кадра и скрипта пишутся в журнал; в паузе — «Отчёт об ошибках».

const GAME_VER = '0.62';
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
  L.push('Экран ' + innerWidth + '×' + innerHeight + ' @' + (devicePixelRatio || 1) + ', графика ' + settings.gfx + ', холст ' + cv.width + '×' + cv.height + (settings.smooth ? ', сглаживание' : '') + (typeof perfStat === 'function' ? ' · ' + perfStat() : ''));
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
function perfStat() { return BENCH ? 'тест скорости: ' + BENCH.rows.map(r => r.n + ' ' + r.fps + ' FPS (худшие ' + r.low + ', код ' + r.js + ' мс)').join('; ') + ', качество ' + BENCH.res + (BENCH.diag && BENCH.diag.length ? '\nдиагностика (улица): ' + BENCH.diag.map(r => r.n + ' ' + r.fps + (r.j != null ? ' (' + r.u + '+' + (r.j - r.u).toFixed(1) + ' мс)' : '')).join(' · ') : '') : 'тест скорости не запускался'; }
const BENCH_SCENES = [
  ['Улица днём', () => { const H = houses.find(h => h.kind === 'store') || houses[0]; P.x = H.x + H.w / 2; P.y = H.y + H.h + 2.5; gameMin = 12 * 60; rain = rainTarget = 0; }],
  ['Ночь и дождь', () => { gameMin = 23 * 60; rain = rainTarget = 1; P.inv.push(mkItem('flashlight')); }],
  ['Толпа 40', () => { gameMin = 12 * 60; rain = rainTarget = 0; for (let i = 0; i < 40; i++) mkZombie(P.x + (rng() - .5) * 14, P.y + (rng() - .5) * 14, zPal(), 999, .15); }],
  ['В доме', () => { const H = houses.find(h => h.kind === 'house' && h.rooms) || houses[0], r = H.rooms[0]; P.x = (r.x0 + r.x1) / 2 + .5; P.y = (r.y0 + r.y1) / 2 + .5; zs.length = 0; }],
];
async function runBench() {
  if (mode !== 'menu' || !ART.ready) { toast('Тест скорости запускается из главного меню'); return; }
  const ov = mk('div'); ov.id = 'benchov'; document.body.appendChild(ov);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  godMode = true; resLock = true;                                         // герой неуязвим, качество не меняется посреди замера
  let js = 0, upd = 0, frames = [], lastT = 0, on = false;
  const tick = t => { if (!on) return; if (lastT) frames.push(t - lastT); lastT = t; js += FT.u + FT.r; upd += FT.u; requestAnimationFrame(tick); };
  const measure = async ms => { js = 0; upd = 0; frames = []; lastT = 0; on = true; requestAnimationFrame(tick); await wait(ms); on = false; return frames.slice(); };
  const rows = [];
  try {
    newGame(); beginPlay(); P.hp = 1e9; P.inf = false;
    for (let k = 0; k < BENCH_SCENES.length; k++) {
      const [n, setup] = BENCH_SCENES[k];
      ov.textContent = 'Тест скорости · ' + (k + 1) + ' из ' + BENCH_SCENES.length + ': ' + n.toLowerCase() + '…';
      setup(); camX = P.x; camY = P.y; computeVis(); fogDirty = true; keys.clear(); keys.add('KeyD');
      await wait(2500);
      const f = (await measure(5000)).sort((a, b) => a - b), sum = f.reduce((a, b) => a + b, 0) || 1, n2 = f.length || 1;
      rows.push({n, fps:Math.round(1000 * n2 / sum), low:Math.round(1000 / (f[Math.floor(n2 * .95)] || 1000)), js:+(js / n2).toFixed(1)});
      P.hp = 1e9;
    }
    // диагностика: одна и та же сцена (улица днём), каждый раз выключаем что-то одно — видно, что съедает кадр на этом устройстве
    BENCH_SCENES[0][1](); camX = P.x; camY = P.y; computeVis(); fogDirty = true;
    const keepQ = resQ, keepV = settings.vol; let keepZ = null;
    const DIAG = [
      ['как есть', () => {}, () => {}],
      ['стоя', () => keys.clear(), () => keys.add('KeyD')],
      ['без мертвецов', () => { keepZ = zs; zs = []; }, () => { zs = keepZ; }],
      ['без звука', () => { settings.vol = 0; SFX.mute(true); }, () => { settings.vol = keepV; SFX.mute(false); }],
      ['без логики', () => { logicOff = true; }, () => { logicOff = false; }],
      ['без интерфейса', () => { document.body.classList.add('benchnoui'); uiOff = true; }, () => { document.body.classList.remove('benchnoui'); uiOff = false; }],
      ['пол-разрешения', () => { resQ = keepQ * .5; resize(); clearCaches(); }, () => { resQ = keepQ; resize(); clearCaches(); }],
      ['пустой кадр', () => { renderOff = true; }, () => { renderOff = false; }],
    ];
    const diag = [];
    for (let k = 0; k < DIAG.length; k++) {
      const [n, on1, off1] = DIAG[k];
      ov.textContent = 'Диагностика · ' + (k + 1) + ' из ' + DIAG.length + ': ' + n + '…';
      on1(); await wait(1500);
      const f = await measure(3000); off1();
      const sum = f.reduce((a, b) => a + b, 0) || 1, nf = f.length || 1;
      diag.push({n, fps:Math.round(1000 * nf / sum), u:+(upd / nf).toFixed(1), j:+(js / nf).toFixed(1)});
    }
    rows.diag = diag;
  } catch (e) { logErr(e, 'тест скорости'); }
  finally {
    godMode = false; resLock = false; logicOff = false; renderOff = false; uiOff = false; keys.clear(); ov.remove();
    BENCH = {t:Date.now(), rows, diag:rows.diag || [], res:+resQ.toFixed(2), dpr:devicePixelRatio || 1, gfx:settings.gfx};
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
{ $('sBench').addEventListener('click', () => { if (backTo !== 'menu') { toast('Запусти тест из главного меню'); return; } SFX.ui(); show(null); runBench(); });
  const st = document.createElement('style');
  st.textContent = 'body.benchnoui #hud,body.benchnoui #ctrl,body.benchnoui #dock,body.benchnoui #mini,body.benchnoui #toasts,body.benchnoui #events{visibility:hidden!important}#benchov{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:80;background:rgba(12,16,18,.9);color:#efe7d2;font:600 14px "PT Sans",sans-serif;padding:8px 14px;border-radius:8px;border:1px solid #2c343a;pointer-events:none}';
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

// ---- статичные процедурные предметы (заборы дворов, грядки, блоки, мешки, колонки, сетка карантина) рисуются один раз в спрайт ----
// раньше каждый штакетник собирался из десятков граней каждый кадр; на слабом планшете это заметная доля кадра
const PROC_CACHE = new Set(['pfence', 'veg', 'jersey', 'sandbag', 'pump', 'fence']);
let procSid = 0;
{ const dp = drawProc;
  drawProc = function (p, f) {
    if (baking || !PROC_CACHE.has(p.type)) return dp(p, f);
    if (!p._sid) p._sid = ++procSid;
    const x = Math.floor(p.cx), y = Math.floor(p.cy), fq = Math.round(f * 20) / 20;
    sprite('Q' + p._sid, p.type + '|' + fq + '|' + (p.dug ? 1 : 0) + '|' + (p.sign ? 1 : 0), x, y, -U - 6, -78, U + 6, 2 * hh + 6, () => dp(p, fq));
  };
}

// ---- мебель за стеной без clip(): на планшетах с Mali каждый clip по большому контуру стоил кадра.
// Мебель с вырезанными кусками стен один раз запекается в отдельную картинку (кусок стены стирается из неё),
// и дальше рисуется как обычный спрайт. Перепекается, только когда меняется вырез (например, стена срезалась рядом с героем).
function occBox(name, fu, wx, wy) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const add = (a, b, c, d) => { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d); };
  for (const fr of [hdFrame(name), ART.meta.frames[name]]) if (fr) { const s = fr[7] || 1; add(-fr[5] / s, -fr[6] / s, (fr[3] - fr[5]) / s, (fr[4] - fr[6]) / s); }
  if (fu && fu.r) {                                                        // детальная мебель (v28) рисуется по своей коробке
    const [a, b, c, d] = fu.r, bx = SX(wx, wy), by = SY(wx, wy, 0);
    const xs = [SX(a, b), SX(c, b), SX(a, d), SX(c, d)].map(v => v - bx), ys = [SY(a, b, 0), SY(c, b, 0), SY(a, d, 0), SY(c, d, 0)].map(v => v - by);
    add(Math.min(...xs) - 6, Math.min(...ys) - 80, Math.max(...xs) + 6, Math.max(...ys) + 6);
  }
  return x0 < x1 ? [Math.floor(x0) - 4, Math.floor(y0) - 4, Math.ceil(x1) + 4, Math.ceil(y1) + 4] : null;
}
{ const objClip = objAt;                                                   // версия v37 (с clip) — запасной путь
  objAt = function (id, name, wx, wy, f, alpha, offX, tint) {
    if (typeof id !== 'string' || id.charCodeAt(0) !== 70 /* F */ || baking) return objClip(id, name, wx, wy, f, alpha, offX, tint);
    const fu = furns[+id.slice(1) - 1];
    const masks = fu && fu.r ? occMasks(fu) : [];
    if (!masks.length) return objAt37(id, name, wx, wy, f, alpha, offX, tint);
    const box = occBox(name, fu, wx, wy); if (!box) return objClip(id, name, wx, wy, f, alpha, offX, tint);
    const bx = SX(wx, wy), by = SY(wx, wy, 0), q = v => Math.round(v * 2) / 2;
    const rel = masks.map(m => m.map(p => [q(p[0] - bx), q(p[1] - by)]));
    const key = 'occ|' + name + '|' + Math.round(f * 40) + '|' + (tint || '') + '|' + (offX || 0) + '|' + (fu.items ? fu.items.length > 0 : 0) + '|' + (fu.v || 0) + '|' + fu.r.map(v => Math.round(v * 100)).join(',') + '|' + rel.map(m => m.join(' ')).join(';');
    sprite(id + 'o', key, wx, wy, box[0], box[1], box[2], box[3], () => {
      objAt37(id, name, wx, wy, f, 1, offX, tint);
      resetT(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
      const cx = SX(wx, wy), cy = SY(wx, wy, 0);
      for (const m of rel) { ctx.beginPath(); ctx.moveTo(cx + m[0][0], cy + m[0][1]); for (let k = 1; k < m.length; k++) ctx.lineTo(cx + m[k][0], cy + m[k][1]); ctx.closePath(); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
    }, alpha, 0);
  };
}

// ---- номер версии в углу главного меню: видно, обновилась ли игра ----
{ const m = $('menu');
  if (m && !$('verTag')) { const v = mk('div', '', 'версия ' + GAME_VER); v.id = 'verTag'; m.appendChild(v); }
  const st = document.createElement('style');
  st.textContent = '#verTag{position:absolute;right:calc(12px + env(safe-area-inset-right,0px));bottom:calc(8px + env(safe-area-inset-bottom,0px));font:600 11px "PT Mono",monospace;color:rgba(239,231,210,.55);pointer-events:none}';
  document.head.appendChild(st);
}

// ---- готовые картинки — в ImageBitmap. На Android (Mali) каждая отрисовка холста-источника стоила дорого:
// 100–200 заготовок за кадр (спрайты, куски пола, кадры персонажей) давали ~20 FPS при любом разрешении.
// Неизменную заготовку один раз превращаем в ImageBitmap (готовая текстура) и рисуем её. Если заготовку
// перерисовали (_v вырос), до готовности новой копии рисуется сам холст.
const BMP_OK = typeof createImageBitmap === 'function' && !/[?&]nobmp\b/.test(location.search);
const bmpStat = {made:0, used:0}, bmpBudget = {f:-1, n:3};
function bmpOf(c) {
  if (!BMP_OK || !c || !c._st) return null;
  const v0 = c._v || 0;
  if (c._bmp && c._bv === v0) { bmpStat.used++; return c._bmp; }
  // в текстуру — только то, что рисуется кадр за кадром (≥ 8 раз в этой версии), и не больше 3 штук за кадр:
  // иначе после перехода в новую сцену десятки преобразований разом тормозили первые секунды
  if (c._nv !== v0) { c._nv = v0; c._n = 0; }
  if (++c._n < 8 || bmpBudget.f !== frameNo) { if (bmpBudget.f !== frameNo) { bmpBudget.f = frameNo; bmpBudget.n = 3; } if (c._n < 8) return null; }
  if (!c._bp && c.width && c.height && bmpBudget.n > 0) {
    bmpBudget.n--; c._bp = true; const v = v0;
    createImageBitmap(c).then(b => { c._bp = false; if ((c._v || 0) !== v) { b.close && b.close(); return; } if (c._bmp && c._bmp.close) c._bmp.close(); c._bmp = b; c._bv = v; bmpStat.made++; })
      .catch(() => { c._bp = false; c._st = false; });
  }
  return null;
}
const bump = c => { if (c) { c._v = (c._v || 0) + 1; c._st = true; } };
{ const di = mainCtx.drawImage;                                           // поверх обёртки v28 (куски пола в HD)
  mainCtx.drawImage = function (img, a, b, c, d, e, f, g, h) {
    const bm = img && img._st ? bmpOf(img) : null;
    if (!bm) return di.apply(this, arguments);
    const n = arguments.length;
    if (n === 3) { const q = img._chq > 1 ? img._chq : 1; return di.call(this, bm, a, b, img.width / q, img.height / q); }
    if (n === 5) return di.call(this, bm, a, b, c, d);
    return di.call(this, bm, a, b, c, d, e, f, g, h);
  };
}
{ const sp = sprite;
  sprite = function (id, key) { const s = SPR.get(id); if (s && s.key !== key) bump(s.c); sp.apply(this, arguments); const s2 = SPR.get(id); if (s2 && !s2.c._st) bump(s2.c); };
}
{ const wc = withChunk; withChunk = function (ch, fn) { bump(ch.c); return wc(ch, fn); }; }
{ const cf = charFrame; charFrame = function () { const r = cf.apply(this, arguments); if (r && r.cv && !r.cv._st) r.cv._st = true; return r; }; }
{ const hf = hdFogged; hdFogged = function () { const c = hf.apply(this, arguments); if (c && !c._st) c._st = true; return c; }; }

// ---- Android: листы спрайтов (≈250 МБ в распакованном виде) — в ImageBitmap. Картинка <img> может быть выгружена
// браузером из памяти и распакована заново при следующем обращении (лист 4096×1500 — это десятки миллисекунд).
// ImageBitmap держит пиксели распакованными: перекраска кадров персонажей больше не упирается в повторную распаковку.
const BIG_SHEETS_BMP = BMP_OK && (/Android/i.test(navigator.userAgent) || /[?&]sheetbmp\b/.test(location.search));
let sheetsBmp = 0;
async function sheetsToBitmaps() {
  for (const n of Object.keys(ART.imgs)) {
    const im = ART.imgs[n];
    if (n === 'icons' || !im || typeof HTMLImageElement === 'undefined' || !(im instanceof HTMLImageElement)) continue;
    try { const b = await createImageBitmap(im); if (ART.imgs[n] === im) { ART.imgs[n] = b; sheetsBmp++; } } catch (e) { logErr(e, 'лист ' + n); }
    await new Promise(r => setTimeout(r, 30));                          // по одному листу, не мешая кадрам
  }
}
{ const la = loadArt; loadArt = function () { return la.apply(this, arguments).then(r => { if (BIG_SHEETS_BMP) sheetsToBitmaps(); return r; }); }; }
if (/Android/i.test(navigator.userAgent)) { const cf = charFrame; charFrame = function (name, palKey, pal, force) { if (!force && recolorsThisFrame > 8) return null; return cf(name, palKey, pal, force); }; }

// ---- интерфейс поверх игры перерисовывался 7–20 раз в секунду: каждые 0.15 с HUD заново писал те же тексты,
// подсказки и флаги hidden. На планшете каждая такая запись перерисовывала весь слой интерфейса (тест: «без
// интерфейса» — 60 FPS против 30). Теперь запись пропускается, если значение не изменилось, а кнопки и
// индикаторы лежат на своих маленьких слоях: изменение одной кнопки не трогает остальной экран.
function guardEl(el) {
  if (el._g) return; el._g = 1;
  const tc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent'), hd = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidden'), ti = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'title');
  Object.defineProperty(el, 'textContent', {configurable:true, get() { return tc.get.call(this); }, set(v) { if (this.childElementCount || tc.get.call(this) !== String(v)) tc.set.call(this, v); }});
  Object.defineProperty(el, 'hidden', {configurable:true, get() { return hd.get.call(this); }, set(v) { if (hd.get.call(this) !== !!v) hd.set.call(this, v); }});
  Object.defineProperty(el, 'title', {configurable:true, get() { return ti.get.call(this); }, set(v) { if (ti.get.call(this) !== String(v)) ti.set.call(this, v); }});
  const ih = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(el, 'innerHTML', {configurable:true, get() { return ih.get.call(this); }, set(v) { v = String(v); if (this._ih !== v || ih.get.call(this) === '') { this._ih = v; ih.set.call(this, v); } }});
  const sa = el.setAttribute; el.setAttribute = function (k, v) { if (this.getAttribute(k) !== String(v)) sa.call(this, k, v); };
}
function guardSvg(el) { if (el._g) return; el._g = 1; const sa = el.setAttribute; el.setAttribute = function (k, v) { if (this.getAttribute(k) !== String(v)) sa.call(this, k, v); }; }
function guardUI() { for (const id of ['hud', 'ctrl', 'dock', 'pad', 'moodles', 'clockBox', 'vitals', 'taskChip', 'mini']) { const r = $(id); if (!r) continue; guardEl(r); for (const e of r.querySelectorAll('*')) if (e instanceof HTMLElement) guardEl(e); else guardSvg(e); } }
guardUI();
{ const bp = beginPlay; beginPlay = function () { bp(); guardUI(); }; }
setInterval(() => { if (mode === 'play') guardUI(); }, 2000);   // новые элементы (чип дневника и т. п.)
{ const st = document.createElement('style');
  st.textContent = '.gauge,.clock,#dock,.ibtn,#bAct,#bAtk,#bRun,#bSneak,#bInv,#bBar,#actAlt,#moodles,#knob,#stick,#mini,#taskChip,#toasts,#events{will-change:transform}'
    + '.gauge,.clock,#dock,#actAlt,#moodles{contain:layout paint style}'
    + '@keyframes gpulse{50%{transform:scale(1.08)}}';                     // было box-shadow: перерисовка каждый кадр при низком показателе
  document.head.appendChild(st);
}
