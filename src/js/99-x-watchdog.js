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
  { const le = logErr;
    logErr = function () {
      const r = le.apply(this, arguments);
      try { localStorage.setItem(ERRK, JSON.stringify({v:GAME_VER, t:Date.now(), log:ERRLOG.slice(-6)})); } catch (e) {}
      return r;
    };
  }
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
  function showDiag(text) {
    const w = mk('div', 'wd-win');
    w.innerHTML = '<div class="wd-card"><b>Прошлый раз игра зависла</b><p>Пришли этот текст разработчику — скриншотом или кнопкой «Скопировать». По нему видно, в каком месте игра остановилась.</p><pre></pre><div class="wd-row"><button class="wd-copy">Скопировать</button><button class="wd-close">Закрыть</button></div></div>';
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
  (async () => {
    try {
      const seen = +(localStorage.getItem(SEEN) || 0);
      const log = (await readLog()).filter(r => r && r.t > seen);
      let err = null; try { err = JSON.parse(localStorage.getItem(ERRK) || 'null'); } catch (e) {}
      if (err && !(err.t > seen)) err = null;
      const hangs = log.filter(r => r.k === 'hang'), stalls = log.filter(r => r.k === 'stall');
      localStorage.setItem(SEEN, String(Date.now()));
      if (log.length > 30) clearLog();
      if (!hangs.length && !stalls.length) return;
      const L = ['Dead Line сейчас ' + GAME_VER + ' · ' + (PLAT.name || 'сайт') + ' · экран ' + innerWidth + '×' + innerHeight + '@' + (devicePixelRatio || 1)];
      for (const r of hangs.slice(-2)) {
        L.push('', 'ЗАВИСЛА в ' + hhmm(r.t) + ' (версия ' + r.v + ')', 'Где: ' + r.crumb + (r.alive == null ? '' : r.alive ? ' · код страницы работал, кадры не шли' : ' · страница не отвечала совсем'), 'Перед этим: ' + (r.seq || []).slice(-7, -1).map(x => String(x).slice(0, 48)).join(' > '), 'Состояние: ' + r.ctx);
      }
      if (stalls.length) {
        L.push('', 'Подвисания (' + stalls.length + '):');
        for (const r of stalls.slice(-5)) L.push(hhmm(r.t) + ' ' + (r.ms / 1000).toFixed(1) + ' с — ' + r.crumb + (r.ctx ? ' · ' + String(r.ctx).slice(0, 90) : ''));
      }
      if (err && err.log && err.log.length) { L.push('', 'Ошибки (' + err.v + '):'); for (const e of err.log) L.push((e.n > 1 ? '×' + e.n + ' ' : '') + (e.where ? e.where + ': ' : '') + String(e.msg).slice(0, 260)); }
      if (hangs.length || stalls.some(r => r.ms > 4000)) showDiag(L.join('\n'));
    } catch (e) {}
  })();

  // фоновому кэшу (service worker): докладывать листы спрайтов можно только когда игра не идёт
  if ('serviceWorker' in navigator) setInterval(() => {
    try { const c = navigator.serviceWorker.controller; if (c) c.postMessage({t:'idle', v:mode !== 'play' || paused || document.hidden}); } catch (e) {}
  }, 2000);
  if (on && window.Worker && window.indexedDB) try {
    const WSRC = `
      let last = Date.now(), tick = Date.now(), crumb = '', ctx = '', armed = false, reported = false, seq = [], LAB = [], ver = '';
      const save = r => { try { const q = indexedDB.open('dl-diag', 1); q.onupgradeneeded = () => q.result.createObjectStore('log', {autoIncrement:true});
        q.onsuccess = () => { const db = q.result, tx = db.transaction('log', 'readwrite'); tx.objectStore('log').add(r); tx.oncomplete = () => db.close(); }; } catch (e) {} };
      onmessage = e => { const d = e.data;
        if (typeof d === 'number') {
          const now = Date.now();
          if (d === -1) { armed = false; return; }
          if (d === -2) { armed = true; reported = false; last = now; return; }
          if (d === -3) { tick = now; return; }
          if (armed && now - last > 1500) save({k:'stall', ms:now - last, crumb, seq:seq.slice(-8), ctx, t:now, v:ver});
          reported = false; crumb = LAB[d] || ('#' + d); if (seq[seq.length - 1] !== crumb) seq.push(crumb); if (seq.length > 60) seq.splice(0, 30); last = now;
        } else if (d && d.lab) { LAB = d.lab; ver = d.ver; } else if (d && d.ctx) ctx = d.ctx;
      };
      setInterval(() => { if (armed && !reported && Date.now() - last > 3000) { reported = true; save({k:'hang', crumb, seq:seq.slice(-14), ctx, t:Date.now(), v:ver, alive:Date.now() - tick < 1200}); } }, 500);`;
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
    const arm = v => { if (v !== armed) { armed = v; W.postMessage(v ? -2 : -1); } };
    setInterval(() => {
      try {
        const play = mode === 'play' && !paused && !document.hidden && !!P;
        arm(play);
        if (!P) return;
        const i = Math.floor(P.y) * MW + Math.floor(P.x);
        W.postMessage({ctx:'день ' + (Math.floor((gameMin - startMin) / 1440) + 1) + ' ' + Math.floor(gameMin / 60 % 24) + ':' + String(Math.floor(gameMin % 60)).padStart(2, '0') +
          ', убито ' + kills + ', мертвецов ' + zs.length + ' (лежат ' + zs.filter(z => z.down > 0).length + ', притв. ' + zs.filter(z => z.lurk).length + ')' +
          ', герой ' + P.x.toFixed(1) + ';' + P.y.toFixed(1) + (hAt[i] ? ' в доме' : ' на улице') + ', район ' + (world.dx || 0) + ',' + (world.dy || 0) +
          ', масштаб ' + settings.zoom + ', оружие ' + (P.weapon ? P.weapon.id : 'нет') + ', окно ' + (panel ? panel.kind : 'нет') + ', дело ' + (P.act ? P.act.kind : 'нет') +
          (P.car ? ', в машине' : '') + (P.sleep ? ', спит' : '') + ', колонна ' + JSON.stringify(world.cv || null) + ', холст ' + cv.width + '×' + cv.height +
          ', заготовок ' + SPR.size + '/' + CHUNKS.size + ', кадров перс. ' + frameCache.size + ', листов ' + sheetMb() + ', ошибок ' + ERRLOG.length + ', кэш ' + swState + ', память ' + (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' МБ' : '?') + ' | ' + recent.join(' ')});
      } catch (e) {}
    }, 1000);
    W.postMessage({lab:LAB, ver:GAME_VER + (PLAT.name ? '-' + PLAT.name : '')});   // названия шагов — когда все они уже заведены
    document.addEventListener('visibilitychange', () => { if (document.hidden) arm(false); });
    addEventListener('pagehide', () => arm(false));
  } catch (e) { logErr(e, 'сторож'); }
}
