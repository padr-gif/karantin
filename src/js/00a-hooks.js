// ================= точки расширения =================
// Механики подключаются к общим местам игры (кадр логики, сохранение, новая игра, действия) через эти списки,
// а не подменой функций. Порядок вызова — порядок подключения (по номеру файла).
//   onUpdate(post, pre)  — каждый кадр логики: pre(dt) до основного шага, post(dt, x) после (x — то, что вернул pre)
//   onSave(fn)           — fn(d): дописать своё в объект сохранения
//   onLoad(post, pre)    — загрузка сохранения: pre(d) до восстановления мира, post(d) после
//   onStartNew(post, pre)— новая игра (экран «Новый выживший»)
//   onNewWorld(fn)       — fn(o) после постройки мира в newGame (o.save — мир строится под загрузку)
const HOOKS = {update:[], save:[], load:[], startNew:[], newWorld:[]};
const onUpdate = (post, pre) => HOOKS.update.push({post, pre});
const onSave = fn => HOOKS.save.push({post:fn});
const onLoad = (post, pre) => HOOKS.load.push({post, pre});
const onStartNew = (post, pre) => HOOKS.startNew.push({post, pre});
const onNewWorld = fn => HOOKS.newWorld.push({post:fn});
// pre — с последнего подключённого к первому, post — с первого к последнему (как вложенные вызовы)
function runHooked(name, core, arg) {
  const L = HOOKS[name], x = new Array(L.length);
  for (let i = L.length - 1; i >= 0; i--) if (L[i].pre) x[i] = L[i].pre(arg);
  const r = core(arg);
  for (let i = 0; i < L.length; i++) if (L[i].post) L[i].post(arg, x[i], r);
  return r;
}
