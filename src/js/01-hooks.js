// ================= точки расширения =================
// Механики подключаются к общим местам игры (кадр логики, сохранение, новая игра, действия) через эти списки,
// а не подменой функций. Порядок вызова — порядок подключения (по номеру файла).
//   onUpdate(post, pre)  — каждый кадр логики: pre(dt) до основного шага, post(dt, x) после (x — то, что вернул pre)
//   onSave(fn)           — fn(d): дописать своё в объект сохранения
//   onLoad(post, pre)    — загрузка сохранения: pre(d) до восстановления мира, post(d) после
//   onStartNew(post, pre)— новая игра (экран «Новый выживший»); onLoad/onStartNew/onNewWorld — тоже pre до, post после
//   onNewWorld(post, pre)— newGame(o): pre(o) до постройки мира, post(o) после (o.save — мир строится под загрузку)
const HOOKS = {update:[], save:[], load:[], startNew:[], newWorld:[], panel:[]};
const onUpdate = (post, pre) => HOOKS.update.push({post, pre});
const onSave = fn => HOOKS.save.push({post:(a, x, d) => fn(d)});
const onLoad = (post, pre) => HOOKS.load.push({post, pre});
const onStartNew = (post, pre) => HOOKS.startNew.push({post, pre});
const onNewWorld = (post, pre) => HOOKS.newWorld.push({post, pre});
//   onPanel(post, pre)   — перерисовка открытого окна (renderPanel): pre() до, post() после; дописать вкладку, блок, подпись
const onPanel = (post, pre) => HOOKS.panel.push({post, pre});
//   onDraw(fn)           — fn(dt): дорисовать своё поверх мира каждый кадр (контур цели, метки), в координатах мира (SX/SY)
const DRAW = [];
const onDraw = fn => DRAW.push(fn);
//   onTap(fn)            — fn(clientX, clientY) → true: тап по миру обработан (дальше не идёт: ни удар, ни обычный выбор цели)
const TAPS = [];
const onTap = fn => TAPS.push(fn);
// Действия рядом с героем (кнопка «Действие» и список действий):
//   addActions(fn)       — fn(out): дописать свои действия в список (после основных)
//   defAction(kind, {name, icon, run}) — у действия этого вида своё имя цели, иконка и выполнение
const ACT = {}, ACT_SOURCES = [];
const addActions = fn => ACT_SOURCES.push(fn);
const defAction = (kind, d) => { ACT[kind] = Object.assign(ACT[kind] || {}, d); };
// Применение вещи из рюкзака (useItem):
//   defUse(test, fn)     — test(it, d) → true: вещь применяется по-своему, fn(it, k, d); проверяются с последнего подключённого
const USE = [];
const defUse = (test, fn) => USE.push({test, fn});
// pre — с последнего подключённого к первому, post — с первого к последнему (как вложенные вызовы)
function runHooked(name, core, arg) {
  const L = HOOKS[name], x = new Array(L.length);
  for (let i = L.length - 1; i >= 0; i--) if (L[i].pre) x[i] = L[i].pre(arg);
  const r = core(arg);
  for (let i = 0; i < L.length; i++) if (L[i].post) L[i].post(arg, x[i], r);
  return r;
}
