// ================= wiring =================
$('mNew').addEventListener('click', openCreate);
$('mContinue').addEventListener('click', () => latestSlot && loadSlot(latestSlot));
$('mLoad').addEventListener('click', () => openSaves('load', 'menu'));
$('mSettings').addEventListener('click', () => openSettings('menu'));
$('mHelp').addEventListener('click', () => { backTo = 'menu'; show('help'); });
$('helpBack').addEventListener('click', goBack);
$('mAch').addEventListener('click', () => { backTo = 'menu'; renderAch(); show('ach'); });
$('pAch').addEventListener('click', () => { backTo = 'pause'; renderAch(); show('ach'); });
$('achBack').addEventListener('click', goBack);
$('setBack').addEventListener('click', goBack);
$('svBack').addEventListener('click', goBack);
$('cBack').addEventListener('click', () => { show('menu'); refreshMenu(); });
$('cStart').addEventListener('click', startNew);
$('pResume').addEventListener('click', resume);
$('pSave').addEventListener('click', () => openSaves('save', 'pause'));
$('pLoad').addEventListener('click', () => openSaves('load', 'pause'));
$('pSettings').addEventListener('click', () => openSettings('pause'));
$('pMenu').addEventListener('click', exitToMenu);
$('bAgain').addEventListener('click', openCreate);
$('dLoad').addEventListener('click', () => openSaves('load', 'dead'));
$('dMenu').addEventListener('click', toMenu);
$('bPause').addEventListener('click', openPause);
$('bMap').addEventListener('click', () => { if (panel && panel.kind === 'map') closePanel(); else { if (panel) closePanel(); openMap(); } });
$('pnClose').addEventListener('click', closePanel);
$('bInv').addEventListener('click', () => toggleInv());
$('weapon').addEventListener('click', () => { SFX.ui(); cycleWeapon(); });
document.querySelectorAll('.gauge').forEach(g => g.addEventListener('click', () => { if (mode !== 'play' || P.sleep) return; openPanel('inv'); panel.tab = 'self'; renderPanel(); }));
$('bWake').addEventListener('click', () => wake());
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (panel) { closePanel(); return; }
  const v = visibleScreen();
  if (v === 'pause') resume();
  else if (v === 'settings' || v === 'saves' || v === 'help' || v === 'ach') goBack();
  else if (v === 'create') { show('menu'); refreshMenu(); }
  else if (!v && mode === 'play') openPause();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play' && settings.autosave) writeSave('auto'); });
let autoT = 0;
function die() {
  if (godMode) { P.hp = 100; return; }
  closePanel();
  mode = 'dead'; P.fall = 0; P.act = null; atkHeld = false; joy.id = null; $('stick').hidden = true;
  if (P.sleep) { P.sleep = false; $('sleep').hidden = true; }
  const lived = gameMin - startMin;
  const best = Math.max(readRecord(), lived); writeRecord(best);
  $('dTime').textContent = fmtDur(lived);
  $('dKills').textContent = kills;
  { const h = document.querySelector('#dead h2'); if (h) h.textContent = P.look && P.look.name ? 'Так закончилась история: ' + P.look.name : 'Так закончилась твоя история'; }
  { const L = (P.log || []).filter(e => !/^Умер/.test(e[1])), l = L[L.length - 1], el = $('dLast'); if (el) el.textContent = l ? '«' + l[1] + '»' : '—'; }
  $('dCause').textContent = lastCause;
  $('dRec').textContent = fmtDur(best);
  $('ctrl').hidden = true;
  setTimeout(() => { if (mode === 'dead') show('dead'); }, 1400);
}
function flashSaved(ok) { $('saveInd').textContent = ok ? 'сохранено ' + fmtTime(gameMin) : ''; setTimeout(() => { $('saveInd').textContent = ''; }, 4000); }

loadSettings();
newGame(); for (let i = 0; i < NT; i++) seen[i] = 1; fogFull = true; menuScene();
mode = 'menu'; show('menu'); setMenuEnabled(false);
$('keysHelp').textContent = isTouch
  ? 'Левая половина экрана — джойстик. Тап справа или «Удар» — атака. «Действие» — обыскать, открыть, готовить, спать. Держи телефон горизонтально.'
  : 'WASD — идти · Shift — бег · C — красться · мышь — направление · ЛКМ или Пробел — удар/выстрел · E — действие · B — забить доской · T — перезарядка · I — рюкзак · M — карта · Esc — пауза · колесо — масштаб';
function hideBoot() { try { window.__regSW && window.__regSW(); } catch (e) {} const b = $('boot'); if (!b) return; try { window.__boot(1, 'Готово'); } catch (e) {} setTimeout(() => { b.classList.add('gone'); setTimeout(() => b.remove(), 500); }, 150); }
function bootFail(e) {
  ART.failed = true; $('rec').textContent = 'Не удалось загрузить спрайты. Обнови страницу.';
  const s = $('bootStat'), r = $('bootRetry'); if (s) s.textContent = 'Не удалось загрузить игру: ' + ((e && e.message) || 'ошибка'); if (r) { r.hidden = false; r.onclick = startLoad; }   // retry keeps the sheets that already arrived
}
function startLoad() { const r = $('bootRetry'); if (r) r.hidden = true; loadArt().then(() => { setMenuEnabled(true); refreshMenu(); hideBoot(); }).catch(bootFail); }
startLoad();
let menuDrift = 0, last = performance.now();
let frameErr = 0;
let logicOff = false, renderOff = false, resLock = false;          // для теста скорости: без логики, пустой кадр, качество не трогать
const FT = {u:0, r:0};                                               // время последнего кадра: логика и отрисовка, мс
function frame(t) {
  requestAnimationFrame(frame);
  try { frameBody(t); } catch (err) { console.error(err); logErr(err, 'кадр'); if (!frameErr++) toast('Ошибка отрисовки, игра продолжает работать'); }
}
function frameBody(t) {
  const raw = (t - last) / 1000;
  const dt = Math.min(.05, Math.max(0, raw)); last = t;
  frameNo++; animT += dt;
  if (!$('create').hidden && ART.ready) drawPreview();
  if (panel && panel.kind === 'inv' && panel.tab === 'items' && ART.ready && frameNo % 2 === 0) drawDoll();
  if (mode === 'play' && !paused) { const t0 = performance.now(); if (!logicOff) update(dt); FT.u = performance.now() - t0; updateParts(dt); } else FT.u = 0;
  if (mode === 'dead') { P.fall = (P.fall || 0) + dt * 2.2; updateParts(dt); camX += (P.x - camX) * .05; camY += (P.y - camY) * .05; }
  else if (mode === 'menu') menuTick(dt);                                        // живая сцена меню (82-menu)
  else if (mode === 'dead') { camX += (P.x - camX) * .05; camY += (P.y - camY) * .05; }
  { const t0 = performance.now(); if (renderOff) { mainCtx.setTransform(1, 0, 0, 1, 0, 0); mainCtx.fillStyle = '#0c0f12'; mainCtx.fillRect(0, 0, cv.width, cv.height); } else render(dt); FT.r = performance.now() - t0; }
  FPS.rt += FT.r; FPS.ut += FT.u;
  // adaptive resolution: drop the backing-store density if the device can't keep up
  if (mode === 'play' && !paused && !resLock && raw > 0 && raw < .5) {
    if (raw > 1 / 38) { slowT += raw; fastT = 0; } else { fastT += raw; if (fastT > 4) slowT = 0; }
    if (slowT > 2.5 && Math.min(gfxCap, devicePixelRatio || 1) * resQ > devMin() + .05) { resQ *= .75; slowT = 0; resize(); }
  }
  drawMinimap(dt);
  hudTimer -= dt;
  if (mode === 'play' && hudTimer <= 0) { updateHud(); hudTimer = .15; }
}
requestAnimationFrame(frame);
/*@@DEBUG@@*/
