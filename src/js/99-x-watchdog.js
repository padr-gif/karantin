// ================= сторож зависаний (диагностика на устройстве) =================
// Игра на iPhone иногда зависает намертво, а на компьютере это не повторяется. Когда страница зависла, она сама
// уже ничего записать не может, поэтому за ней следит отдельный поток (Web Worker): игра по ходу кадра шлёт ему
// короткие метки «где я сейчас» (номер шага), а он, не дождавшись следующей метки три секунды, записывает в
// IndexedDB последнюю метку, цепочку перед ней и состояние игры. При следующем запуске игра показывает окно
// «Прошлый раз игра зависла» с этим текстом — его можно скопировать или снять скриншотом и прислать разработчику.
// Туда же попадают долгие подвисания (от 1,5 с), после которых игра ожила, и ошибки прошлого запуска.
// Включён на iPhone/iPad и по адресу с ?wd (для проверки на компьютере). На остальных устройствах ничего не делает.
{
  const UA = navigator.userAgent;
  const on = /iPhone|iPad|iPod/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1) || /[?&]wd\b/.test(location.search);
  const SEEN = 'dl-diag-seen', ERRK = 'dl-diag-err';
  // ошибки переживают закрытие игры: журнал ERRLOG живёт только в памяти
  // Ошибка, которая повторяется каждый кадр, выглядит как зависание: картинка стоит, хотя страница жива (сторож такого
  // «зависания» не видит — кадры идут). Поэтому журнал пишется на диск (не чаще раза в секунду, новая ошибка — сразу),
  // а когда одна и та же ошибка кадра повторилась 45 раз, окно с ней показывается прямо во время игры.
  let errShown = false;
  { const le = logErr; let lastW = 0, lastN = 0;
    logErr = function () {
      const r = le.apply(this, arguments);
      try {
        const now = Date.now(), top = ERRLOG[ERRLOG.length - 1];
        if (ERRLOG.length !== lastN || now - lastW > 1000) { lastN = ERRLOG.length; lastW = now; localStorage.setItem(ERRK, JSON.stringify({v:GAME_VER, t:now, log:ERRLOG.slice(-6)})); }
        if (!errShown && top && top.n >= 45) { errShown = true; showDiag(errText({v:GAME_VER, log:ERRLOG.slice(-6)}), 'Игра остановилась из-за ошибки'); }
      } catch (e) {}
      return r;
    };
  }
  const errText = err => { const L = ['Dead Line ' + err.v + ' · ' + (PLAT.name || 'сайт') + ' · экран ' + innerWidth + '×' + innerHeight + '@' + (devicePixelRatio || 1), navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 110), '', 'Ошибки:'];
    for (const e of err.log) L.push((e.n > 1 ? '×' + e.n + ' ' : '') + (e.where ? e.where + ': ' : '') + String(e.msg).slice(0, 420)); return L.join('\n'); };
  const openDb = () => new Promise((res, rej) => {
    const q = indexedDB.open('dl-diag', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('log', {autoIncrement:true});
    q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
  });
  async function readLog() {
    const db = await openDb();
    return await new Promise(res => {
      const out = [], rq = db.transaction('log', 'readonly').objectStore('log').openCursor();
      rq.onsuccess = () => { const c = rq.result; if (c) { out.push(c.value); c.continue(); } else { db.close(); res(out); } };
      rq.onerror = () => { db.close(); res(out); };
    });
  }
  async function clearLog() { try { const db = await openDb(); const tx = db.transaction('log', 'readwrite'); tx.objectStore('log').clear(); tx.oncomplete = () => db.close(); } catch (e) {} }

  // ---- окно при запуске: что случилось в прошлый раз ----
  function showDiag(text, title) {
    const w = mk('div', 'wd-win');
    w.innerHTML = '<div class="wd-card"><b>' + (title || 'Прошлый раз игра зависла') + '</b><p>Пришли этот текст разработчику — скриншотом или кнопкой «Скопировать». По нему видно, в каком месте игра остановилась.</p><pre></pre><div class="wd-row"><button class="wd-copy">Скопировать</button><button class="wd-close">Закрыть</button></div></div>';
    w.querySelector('pre').textContent = text;
    w.querySelector('.wd-close').onclick = () => w.remove();
    w.querySelector('.wd-copy').onclick = async () => {
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {}
      if (!ok) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch (e) {} ta.remove(); }
      w.querySelector('.wd-copy').textContent = ok ? 'Скопировано' : 'Не вышло — сделай скриншот';
    };
    document.body.appendChild(w);
  }
  const hhmm = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0'); };
  const report = async force => {
    try {
      const seen = force ? 0 : +(localStorage.getItem(SEEN) || 0);
      const log = (await readLog()).filter(r => r && r.t > seen);
      let err = null; try { err = JSON.parse(localStorage.getItem(ERRK) || 'null'); } catch (e) {}
      let heal = null; try { heal = JSON.parse(localStorage.getItem('dl-diag-heal') || 'null'); } catch (e) {}
      if (heal && !force) { if (heal.shown) heal = null; else try { localStorage.setItem('dl-diag-heal', JSON.stringify(Object.assign({}, heal, {shown:1}))); } catch (e) {} }
      if (err && err.shown && !force) err = null;                                        // ошибки показываем один раз, даже если с тех пор игру уже открывали
      if (err) try { localStorage.setItem(ERRK, JSON.stringify(Object.assign({}, err, {shown:1}))); } catch (e) {}
      const hangs = log.filter(r => r.k === 'hang'), stalls = log.filter(r => r.k === 'stall');
      localStorage.setItem(SEEN, String(Date.now()));
      if (log.length > 30 && !force) clearLog();
      const errBad = err && err.log && err.log.some(e => e.n >= 3 || e.where === 'кадр');
      if (!hangs.length && !stalls.length && !heal && !force) { if (errBad) showDiag(errText(err), 'Прошлый раз в игре была ошибка'); return; }
      const L = ['Dead Line сейчас ' + GAME_VER + ' · ' + (PLAT.name || 'сайт') + ' · экран ' + innerWidth + '×' + innerHeight + '@' + (devicePixelRatio || 1)];
      for (const r of hangs.slice(-2)) {
        L.push('', 'ЗАВИСЛА в ' + hhmm(r.t) + ' (версия ' + r.v + ')', 'Где: ' + r.crumb + (r.alive == null ? '' : r.alive ? ' · код страницы работал, кадры не шли' + (r.ev ? ', нажатия доходили' : '') : ' · страница не отвечала совсем'), 'Перед этим: ' + (r.seq || []).slice(-7, -1).map(x => String(x).slice(0, 48)).join(' > '), 'Состояние: ' + r.ctx);
      }
      if (stalls.length) {
        L.push('', 'Подвисания (' + stalls.length + '):');
        for (const r of stalls.slice(-5)) L.push(hhmm(r.t) + ' ' + (r.ms / 1000).toFixed(1) + ' с — ' + r.crumb + (r.ctx ? ' · ' + String(r.ctx).slice(0, 90) : ''));
      }
      if (err && err.log && err.log.length) { L.push('', 'Ошибки (' + err.v + '):'); for (const e of err.log) L.push((e.n > 1 ? '×' + e.n + ' ' : '') + (e.where ? e.where + ': ' : '') + String(e.msg).slice(0, 260)); }
      if (force && !hangs.length && !stalls.length && !heal && !(err && err.log && err.log.length)) L.push('', 'Зависаний и ошибок не записано.');
      if (heal) L.push('', 'Кадры останавливались, игра перезапускала их сама: ' + heal.n + ' раз (' + hhmm(heal.t) + ')');
      if (force || hangs.length || stalls.length >= 2 || stalls.some(r => r.ms > 4000) || errBad || heal) showDiag(L.join('\n'), force ? 'Отчёт о работе игры' : null);
    } catch (e) {}
  };
  report(false);
  // кнопка в меню паузы: отчёт можно открыть в любой момент, даже если окно при запуске не появилось
  try { const b = mk('button', 'mbtn'); b.type = 'button'; b.textContent = 'Отчёт о зависаниях'; b.onclick = () => report(true); $('pMenu').parentNode.insertBefore(b, $('pMenu')); } catch (e) {}

  // фоновому кэшу (service worker): докладывать листы спрайтов можно только когда игра не идёт
  if ('serviceWorker' in navigator) setInterval(() => {
    try { const c = navigator.serviceWorker.controller; if (c) c.postMessage({t:'idle', v:mode !== 'play' || paused || document.hidden}); } catch (e) {}
  }, 2000);
  if (on && window.Worker && window.indexedDB) try {
    const WSRC = `
      let last = Date.now(), lastF = Date.now(), fid = -9, tick = Date.now(), crumb = '', ctx = '', armed = false, reported = false, seq = [], LAB = [], ver = '';
      const save = r => { try { const q = indexedDB.open('dl-diag', 1); q.onupgradeneeded = () => q.result.createObjectStore('log', {autoIncrement:true});
        q.onsuccess = () => { const db = q.result, tx = db.transaction('log', 'readwrite'); tx.objectStore('log').add(r); tx.oncomplete = () => db.close(); }; } catch (e) {} };
      onmessage = e => { const d = e.data;
        if (typeof d === 'number') {
          const now = Date.now();
          if (d === -1) { armed = false; return; }
          if (d === -2) { armed = true; reported = false; last = now; lastF = now; return; }
          if (d === -3) { tick = now; return; }
          if (armed && now - last > 1500) save({k:'stall', ms:now - last, crumb, seq:seq.slice(-8), ctx, t:now, v:ver});
          if (d === fid) { lastF = now; reported = false; } crumb = LAB[d] || ('#' + d); if (seq[seq.length - 1] !== crumb) seq.push(crumb); if (seq.length > 60) seq.splice(0, 30); last = now;
        } else if (d && d.lab) { LAB = d.lab; ver = d.ver; fid = d.fid; } else if (d && d.ctx) ctx = d.ctx;
      };
      setInterval(() => { const now = Date.now(); if (armed && !reported && now - lastF > 3000) { reported = true; save({k:'hang', crumb, seq:seq.slice(-14), ctx, t:now, v:ver, alive:now - tick < 1200, ev:now - last < 3000}); } }, 500);`;
    const W = new Worker(URL.createObjectURL(new Blob([WSRC], {type:'text/javascript'})));
    const LAB = []; let sent = 0, budget = 0;
    const lab = s => LAB.push(s) - 1;
    const beat = id => { if (budget-- > 0) W.postMessage(id); };
    const short = fn => String(fn).replace(/\s+/g, ' ').slice(0, 110);
    // шаги кадра: функции верхнего уровня
    const wrapG = (name, every) => {
      const f = window[name]; if (typeof f !== 'function') return;
      const id = lab(name); let fr = -1;
      window[name] = function () { if (every || fr !== frameNo) { fr = frameNo; beat(id); } return f.apply(this, arguments); };
    };
    const idFrame = lab('кадр: начало'), idEnd = lab('кадр: конец');
    { const f = frameBody; frameBody = function () { budget = 220; W.postMessage(idFrame); const r = f.apply(this, arguments); W.postMessage(idEnd); return r; }; }
    for (const n of ['update', 'updateParts', 'render', 'chunkAhead', 'drawMinimap', 'updateHud', 'resTick', 'cachesValid', 'updateFog', 'drawSnowCover', 'houseViewUpdate',
      'drawPlayer', 'drawParts', 'drawBustle', 'drawFog', 'drawHeli', 'drawHeliLight', 'evict', 'reapCv', 'drawLootMarks', 'drawTvSubs']) wrapG(n);
    for (const n of ['computeVis', 'buildFlow', 'clearCaches', 'getChunk', 'drawZombie', 'drawWallView', 'drawProc', 'drawCarProp', 'drawRoof', 'drawCorpse', 'drawChar', 'drawPile',
      'attackSwing', 'killZombie', 'doAction', 'renderPanel', 'openPanel', 'closePanel', 'useItem', 'writeSave', 'serialize', 'applySave', 'tasksToday', 'noise', 'updateDrops',
      'spawnZombie', 'mkZombie', 'toast', 'eventBanner', 'startSleep', 'wakeUp', 'enterCar', 'computePath', 'findPath', 'pathTo']) wrapG(n, true);
    // путь нажатия «открыть дверь» и звук — по шагам
    for (const n of ['getActions', 'getAction', 'doActionMain', 'doActionBase', 'clearDoorway', 'cellOccupied', 'winAction', 'smp', 'smpPick', 'bus', 'busPlace', 'sndStart', 'loadSamples', 'refreshMenu']) wrapG(n, true);
    for (const k in SFX) { const f = SFX[k]; if (typeof f !== 'function' || k === 'ok' || k === 'vol') continue; const id = lab('звук ' + k); SFX[k] = function () { beat(id); return f.apply(this, arguments); }; }
    try { for (const k in ACT) { const d = ACT[k]; if (d && typeof d.run === 'function') { const f = d.run, id = lab('действие ' + k); d.run = function () { beat(id); return f.apply(this, arguments); }; } } } catch (e) {}
    try { for (const k in XACT) { const f = XACT[k]; if (typeof f === 'function') { const id = lab('действие x ' + k); XACT[k] = function () { beat(id); return f.apply(this, arguments); }; } } } catch (e) {}
    // обработчики кадра и слои поверх мира — по одному, с началом их текста (по нему видно, какой это файл)
    HOOKS.update.forEach((h, i) => { for (const k of ['pre', 'post']) { const f = h[k]; if (!f) continue; const id = lab('update.' + k + '#' + i + ' ' + short(f)); h[k] = function () { beat(id); return f.apply(this, arguments); }; } });
    OVERLAYS.forEach((f, i) => { const id = lab('слой#' + i + ' ' + short(f)); OVERLAYS[i] = function () { beat(id); return f.apply(this, arguments); }; });
    // состояние игры — раз в секунду; последние события — что игрок делал
    const recent = [];
    { const t0 = toast; toast = function (text) { recent.push('«' + String(text).slice(0, 40) + '»'); if (recent.length > 8) recent.shift(); return t0.apply(this, arguments); }; }
    { const d0 = doAction; doAction = function (a) { recent.push('действие:' + (typeof a === 'string' ? a : ((a || (typeof curAct !== 'undefined' && curAct) || {}).kind) || '?')); if (recent.length > 8) recent.shift(); return d0.apply(this, arguments); }; }
    const sheetMb = () => { try { let n = 0, px = 0; for (const k in ART.imgs) { const i = ART.imgs[k]; if (i && i.width) { n++; px += i.width * i.height; } } return n + ' шт ' + Math.round(px * 4 / 1048576) + ' МБ'; } catch (e) { return '?'; } };
    let armed = false;
    setInterval(() => W.postMessage(-3), 300);                                 // пульс: главный поток жив, даже если кадры не идут
    // события и таймеры вне кадра: метка перед обработчиками нажатий
    for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown', 'resize', 'focus', 'blur', 'visibilitychange', 'pageshow']) {
      const id = lab('событие ' + ev), idA = lab('после события ' + ev);
      addEventListener(ev, () => { budget = 120; W.postMessage(id); setTimeout(() => W.postMessage(idA), 0); }, true);   // вне кадра метки идут без ограничения кадра
    }
    let swState = 'нет';
    try { navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(r => { if (!r) return; const upd = () => { swState = (r.installing ? 'ставится ' : '') + (r.waiting ? 'ждёт ' : '') + (r.active ? 'работает' : ''); };
      upd(); r.addEventListener('updatefound', () => { upd(); const w = r.installing; if (w) w.addEventListener('statechange', () => { swState = 'новый: ' + w.state; }); }); }).catch(() => {}); } catch (e) {}
    // Кадры встали, а страница жива (на iPhone так бывает: очередь кадров просто перестаёт вызываться) — запускаем её заново.
    // Второй цепочки не будет: кадр с тем же временем, что уже отрисован, пропускается.
    let fps1 = 0, fN = frameNo, still = 0, heals = 0, lastT = -1;
    { const f = frame; frame = function (t) { if (t === lastT) return; lastT = t; return f.apply(this, arguments); }; }
    const selfHeal = play => {
      fps1 = frameNo - fN; fN = frameNo;
      if (!play || fps1 > 0) { still = 0; return; }
      if (++still < 2) return;
      still = 0; heals++; recent.push('кадры встали — перезапуск ' + heals);
      try { requestAnimationFrame(frame); } catch (e) {}
      if (heals % 2 === 0) try { resize(); } catch (e) {}                      // не помогло — пересоздать холст
      try { localStorage.setItem('dl-diag-heal', JSON.stringify({t:Date.now(), n:heals, v:GAME_VER})); } catch (e) {}
    };
    const arm = v => { if (v !== armed) { armed = v; W.postMessage(v ? -2 : -1); } };
    setInterval(() => {
      try {
        const play = mode === 'play' && !document.hidden && !!P;
        arm(play); selfHeal(play);
        if (!P) return;
        const i = Math.floor(P.y) * MW + Math.floor(P.x);
        W.postMessage({ctx:'день ' + (Math.floor((gameMin - startMin) / 1440) + 1) + ' ' + Math.floor(gameMin / 60 % 24) + ':' + String(Math.floor(gameMin % 60)).padStart(2, '0') +
          ', убито ' + kills + ', мертвецов ' + zs.length + ' (лежат ' + zs.filter(z => z.down > 0).length + ', притв. ' + zs.filter(z => z.lurk).length + ')' +
          ', герой ' + P.x.toFixed(1) + ';' + P.y.toFixed(1) + (hAt[i] ? ' в доме' : ' на улице') + ', район ' + (world.dx || 0) + ',' + (world.dy || 0) +
          ', масштаб ' + settings.zoom + ', оружие ' + (P.weapon ? P.weapon.id : 'нет') + ', окно ' + (panel ? panel.kind : 'нет') + ', дело ' + (P.act ? P.act.kind : 'нет') +
          (P.car ? ', в машине' : '') + (P.sleep ? ', спит' : '') + ', колонна ' + JSON.stringify(world.cv || null) + ', холст ' + cv.width + '×' + cv.height +
          ', пауза ' + (paused ? 1 : 0) + (logicOff ? ' логика выкл' : '') + (renderOff ? ' рисование выкл' : '') + (typeof PH !== 'undefined' && PH.open ? ' телефон' : '') + (typeof traveling !== 'undefined' && traveling ? ' переезд' : '') + ', к/с ' + fps1 + ', заготовок ' + SPR.size + '/' + CHUNKS.size + ', кадров перс. ' + frameCache.size + ', листов ' + sheetMb() + ' + в памяти ' + Object.keys(ART.px).length + ', ошибок ' + ERRLOG.length + ', кэш ' + swState + ', память ' + (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' МБ' : '?') + ' | ' + recent.join(' ')});
      } catch (e) {}
    }, 1000);
    W.postMessage({lab:LAB, fid:idFrame, ver:GAME_VER + (PLAT.name ? '-' + PLAT.name : '')});   // названия шагов — когда все они уже заведены
    document.addEventListener('visibilitychange', () => { if (document.hidden) arm(false); });
    addEventListener('pagehide', () => arm(false));
  } catch (e) { logErr(e, 'сторож'); }
}
