// ================= records =================
function readRecord() { try { return +localStorage.getItem('karantin-best') || 0; } catch (e) { return 0; } }
function writeRecord(v) { try { localStorage.setItem('karantin-best', String(v)); } catch (e) {} }
function fmtDur(m) { m = Math.floor(m); const d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mm = m % 60; return (d ? d + ' дн. ' : '') + h + ' ч ' + mm + ' мин'; }

// ================= saves (cloud per-viewer db, browser storage as fallback) =================
const SAVE_SLOTS = ['auto', '1', '2', '3'];
const store = {db:null, uid:null};
const storeReady = (async () => {
  try {
    if (!window.claude || !window.claude.use) return;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    store.db = db; store.uid = id;
  } catch (e) {}
})();
const waitStore = () => Promise.race([storeReady, new Promise(r => setTimeout(r, 4000))]);
const LKEY = s => 'karantin-save-' + s;
const cloudDoc = s => store.db.collection('data/users/' + store.uid).doc('save-' + s);
async function listSaves() {
  await waitStore();
  const out = {};
  for (const s of SAVE_SLOTS) {
    let m = null;
    if (store.db) { try { const d = await cloudDoc(s).get(); if (d.exists) m = d.data().meta; } catch (e) {} }
    try { const raw = localStorage.getItem(LKEY(s)); if (raw) { const l = JSON.parse(raw).meta; if (!m || (l && l.t > m.t)) m = l; } } catch (e) {}
    out[s] = m;
  }
  return out;
}
let saving = false;
async function writeSave(s) {
  if (saving) return false; saving = true;
  try {
    const body = JSON.stringify(serialize());
    const meta = {day:Math.floor(gameMin / 1440) + 1, time:fmtTime(gameMin), kills, t:Date.now(), diff:world.diff, dn:(DIFF[world.diff] || DIFF.normal).name, name:(P.look && P.look.name) || ''};
    let ok = false;
    try { localStorage.setItem(LKEY(s), JSON.stringify({meta, body})); ok = true; } catch (e) {}
    await waitStore();
    if (store.db && body.length < 240000) { try { await cloudDoc(s).set({meta, body}); ok = true; } catch (e) {} }
    return ok;
  } finally { saving = false; }
}
async function readSave(s) {
  await waitStore();
  let rec = null;
  if (store.db) { try { const d = await cloudDoc(s).get(); if (d.exists) rec = d.data(); } catch (e) {} }
  try { const raw = localStorage.getItem(LKEY(s)); if (raw) { const l = JSON.parse(raw); if (!rec || (l.meta && rec.meta && l.meta.t > rec.meta.t)) rec = l; } } catch (e) {}
  try { return rec ? JSON.parse(rec.body) : null; } catch (e) { return null; }
}
async function deleteSave(s) {
  try { localStorage.removeItem(LKEY(s)); } catch (e) {}
  await waitStore();
  if (store.db) { try { await cloudDoc(s).delete(); } catch (e) {} }
}
const r2 = v => Math.round(v * 100) / 100;
function packBits(arr) { const b = new Uint8Array(Math.ceil(arr.length / 8)); for (let i = 0; i < arr.length; i++) if (arr[i]) b[i >> 3] |= 1 << (i & 7); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
function unpackBits(str, arr) { const s = atob(str); arr.fill(0); for (let i = 0; i < arr.length; i++) if (s.charCodeAt(i >> 3) & (1 << (i & 7))) arr[i] = 1; }
function serialize() { return runHooked('save', serializeCore); }
function serializeCore() {
  const obsL = [];
  for (let i = 0; i < NT; i++) { const o = obs[i]; if (!o) continue; obsL.push(o.t === 'door' ? [i, 0, o.open ? 1 : 0, r2(o.hp), o.dead ? 1 : 0, r2(o.bhp), o.locked ? 1 : 0, o.alarm ? 1 : 0] : [i, 1, o.broken ? 1 : 0, r2(o.ghp), r2(o.bhp), o.open ? 1 : 0, o.cc ? 1 : 0, o.cur || 0, o.cleared ? 1 : 0, o.stiff == null ? -1 : o.stiff]); }
  return {v:3, seed:world.seed, diff:world.diff, look:P.look,
    gm:r2(gameMin), sm:startMin, poff:powerOffAt, woff:waterOffAt, pm:powerMsg, wm:waterMsg, rain:r2(rain), rt:rainTarget, wt:r2(weatherTimer), st:r2(spawnTimer), kills,
    p:{x:r2(P.x), y:r2(P.y), face:r2(P.face), hp:r2(P.hp), sat:r2(P.sat), hyd:r2(P.hyd), en:r2(P.en), bleed:P.bleed, cloth:P.cloth || {}, cold:r2(P.cold || 0), wet:r2(P.wet || 0), stress:r2(P.stress || 0), boost:P.boost || {}, readMag:P.readMag || {}, flu:r2(P.flu || 0), fluR:r2(P.fluR || 0), bored:r2(P.bored || 0), stats:P.stats || {}, mapRead:!!P.mapRead, skills:P.skills || {}, prof:P.prof || 'none', inf:P.inf, infT:r2(P.infT), pois:r2(P.pois), weapon:P.weapon, armor:P.armor || null, inv:P.inv, cap:P.cap, sneak:P.sneak},
    obs:obsL, furn:furns.map(f => [f.searched ? 1 : 0, f.items]), fmov:furns.map((f, k) => f.moved ? [k, f.x, f.y, r2(f.cx), r2(f.cy), f.wd, r2(f.sx), r2(f.sy), f.blockDoor ? 1 : 0, f.gone ? 1 : 0] : null).filter(Boolean), evac:world.evac || null,
    cars:props.map((p, k) => p.type === 'car' ? [k, p.searched ? 1 : 0, p.items, p.dyn ? [r2(p.cx), r2(p.cy), r2(p.ang)] : 0, r2(p.fuel), p.key ? 1 : 0, r2(p.hp)] : null).filter(Boolean), incar:P.car ? props.indexOf(P.car) : -1,
    barrels:barrels.map(b => [b.cx, b.cy, r2(b.w), b.outside ? 1 : 0]),
    fires:fires.filter(f => !f.out).map(f => [r2(f.x), r2(f.y), r2(f.t)]),
    zs:zs.map(z => [r2(z.x), r2(z.y), r2(z.hp), z.pal.pi, z.pal.b || 'm', z.pal.fast ? 1 : 0, r2(z.spd), z.crawl ? 1 : 0]),
    corpses:corpses.slice(-80).map(c => [r2(c.x), r2(c.y), r2(c.face), c.pal.pi, c.pal.b || 'm']),
    decals:decals.slice(-250).map(d => [r2(d.x), r2(d.y), r2(d.r), r2(d.a), r2(d.k)]),
    piles:piles.filter(p => p.items.length).map(p => [r2(p.x), r2(p.y), p.items]),
    traps:traps.map(t => [t.cx, t.cy, t.armed ? 1 : 0]),
    gens:gens.map(g => [g.cx, g.cy, r2(g.fuel), g.on ? 1 : 0]), beds:beds.map(b => [b.cx, b.cy, b.crop, r2(b.g), r2(b.w), r2(b.dry)]),
    drops:airdrops.map(a => [a.tx, a.ty, a.landed && a.f ? a.f.items : null, a.landed && a.f && a.f.searched ? 1 : 0]), heliAt:world.heliAt, hordeAt:world.hordeAt, marks:world.marks || [], storm:!!world.storm, mut:!!world.mut, pbin:props.map((p, k) => (p.type === 'bin' || p.type === 'mail') && p.searched ? [k, p.items || []] : null).filter(Boolean), doff:world.dayOff || 0, bcd:world.bcd || {}, tcd:world.tcd || {}, snow:r2(world.snow || 0), snowMsg:!!world.snowMsg,
    moved:furns.map((f, k) => f.moved ? [k, f.x, f.y, r2(f.cx), r2(f.cy), f.r.map(r2)] : null).filter(Boolean),
    seen:packBits(seen)};
}
function applySave(d) { return runHooked('load', applySaveCore, d); }
function applySaveCore(d) {
  if (d.v !== 3) throw new Error('old');
  newGame({seed:d.seed, diff:d.diff, look:d.look, save:true});
  gameMin = d.gm; startMin = d.sm; powerOffAt = d.poff; waterOffAt = d.woff; powerMsg = d.pm; waterMsg = d.wm;
  rain = d.rain; rainTarget = d.rt; weatherTimer = d.wt; spawnTimer = d.st; kills = d.kills;
  Object.assign(P, d.p); P.fd = P.face;
  for (const o of d.obs) { const ob = obs[o[0]]; if (!ob) continue;
    if (o[1] === 0) { ob.open = !!o[2]; ob.hp = o[3]; ob.dead = !!o[4]; ob.bhp = o[5]; ob.locked = !!o[6]; ob.alarm = !!o[7]; ob.ang = ob.open && !ob.dead ? 1 : 0; }
    else { ob.broken = !!o[2]; ob.ghp = o[3]; ob.bhp = o[4]; if (o.length > 5) { ob.open = !!o[5]; ob.cc = !!o[6]; ob.cur = o[7] || null; ob.cleared = !!o[8]; if (o[9] >= 0) ob.stiff = o[9]; } } }
  d.furn.forEach((f, k) => { if (furns[k]) { furns[k].searched = !!f[0]; furns[k].items = f[1]; } });
  if (d.fmov) { for (const m of d.fmov) { const f = furns[m[0]]; if (!f) continue; if (furn[f.y * MW + f.x] === m[0] + 1) furn[f.y * MW + f.x] = 0; Object.assign(f, {x:m[1], y:m[2], cx:m[3], cy:m[4], wd:m[5], sx:m[6], sy:m[7], blockDoor:!!m[8], moved:true}); f.r = [f.cx - f.sx / 2, f.cy - f.sy / 2, f.cx + f.sx / 2, f.cy + f.sy / 2]; if (m[9]) { Object.assign(f, {gone:true, cx:-999, cy:-999, r:[-999, -999, -999, -999], items:[], searched:true}); continue; } furn[f.y * MW + f.x] = m[0] + 1; } clearCaches(); buildFlow(); }
  for (const c of d.cars) { const p = props[c[0]]; if (p && p.type === 'car') { p.searched = !!c[1]; p.items = c[2]; if (c[4] != null) { p.fuel = c[4]; p.key = !!c[5]; p.hp = c[6]; } if (c[3]) { makeDyn(p); unparkCar(p); p.cx = c[3][0]; p.cy = c[3][1]; p.ang = c[3][2]; p.v = 0; parkCar(p); } } }
  if (d.incar >= 0 && props[d.incar]) enterCar(props[d.incar], true);
  for (const b of d.barrels) { const tx = Math.floor(b[0]), ty = Math.floor(b[1]); const p = {type:'barrel', cx:b[0], cy:b[1], solid:true, r:[tx + .26, ty + .26, tx + .74, ty + .74], w:b[2], outside:!!b[3]}; if (addProp(p, [[tx, ty]])) barrels.push(p); }
  fires = d.fires.map(f => ({type:'fire', x:f[0], y:f[1], cx:f[0], cy:f[1], t:f[2], seed:rng()}));
  zs = []; for (const z of d.zs) { const m = mkZombie(z[0], z[1], {pi:z[3], b:z[4], fast:!!z[5], blood:0}, z[2], z[6]); m.crawl = !!z[7]; if (m.pal.b === 'h' && d.mut) { m.brute = true; m.r = .3; } }
  corpses = d.corpses.map(c => ({x:c[0], y:c[1], face:c[2], pal:{pi:c[3], b:c[4]}, fall:1, dir:-1, seed:rng()}));
  decals = d.decals.map(a => ({x:a[0], y:a[1], r:a[2], a:a[3], k:a[4]}));
  unpackBits(d.seen, seen);
  piles = (d.piles || []).map(p => ({type:'pile', x:p[0], y:p[1], cx:p[0], cy:p[1], items:p[2]}));
  for (const t of d.traps || []) { const x = Math.floor(t[0]), y = Math.floor(t[1]), p = {type:'trap', proc:true, cx:t[0], cy:t[1], solid:false, r:[x + .2, y + .2, x + .8, y + .8], armed:!!t[2]}; if (addProp(p, [[x, y]])) traps.push(p); }
  for (const g of d.gens || []) { const x = Math.floor(g[0]), y = Math.floor(g[1]), p = {type:'gen', proc:true, cx:g[0], cy:g[1], solid:true, r:[x + .2, y + .25, x + .8, y + .75], fuel:g[2], on:!!g[3]}; if (addProp(p, [[x, y]])) gens.push(p); }
  for (const b of d.beds || []) { const x = Math.floor(b[0]), y = Math.floor(b[1]), p = {type:'gbed', proc:true, cx:b[0], cy:b[1], solid:false, r:[x + .06, y + .06, x + .94, y + .94], crop:b[2], g:b[3], w:b[4], dry:b[5]}; if (addProp(p, [[x, y]])) beds.push(p); }
  for (const a of d.drops || []) { const o = {x:a[0] + .5, y:a[1] + .5, tx:a[0], ty:a[1], z:a[2] ? 0 : 300, landed:false, items:a[2], searched:a[3]}; airdrops.push(o); if (a[2]) landDrop(o); }
  if (d.heliAt) world.heliAt = d.heliAt;
  for (const b of d.pbin || []) { const p = props[b[0]]; if (p) { p.searched = true; p.items = b[1]; } }
  world.evac = null; world.mut = !!d.mut; world.dayOff = d.doff || 0; world.bcd = d.bcd || {}; world.tcd = d.tcd || {};
  world.marks = d.marks || [];
  if (d.hordeAt) world.hordeAt = d.hordeAt; world.storm = !!d.storm; world.snow = d.snow || 0; world.snowMsg = !!d.snowMsg;
  for (const m of d.moved || []) { const f = furns[m[0]]; if (!f) continue; furn[f.y * MW + f.x] = 0; f.x = m[1]; f.y = m[2]; f.cx = m[3]; f.cy = m[4]; f.r = m[5]; f.moved = true; furn[f.y * MW + f.x] = m[0] + 1; }
  camX = P.x; camY = P.y;
  buildFlow(); computeVis(); fogDirty = true; clearCaches();
}
