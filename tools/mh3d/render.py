#!/usr/bin/env python3
"""Персонажи «Нулевого дня» из модели человека MakeHuman (CC0): морфинг тела, скелет, поза, одежда покраской
и оболочками, свет с тенями, рендер в проекции игры (клетка 1 м = 64×32 px, 31 px на метр высоты).
   python3 tools/mh3d/render.py out.png            # превью: четверо выживших + 8 направлений
Данные: tools/mh3d/mh.npz (собирается build_data.py из репозитория MakeHuman).
"""
import json, math, os, sys, ctypes, subprocess
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SS = 3
def nrm(v): v = np.asarray(v, float); return v / np.linalg.norm(v)
LIGHT = nrm((.25, .6, 1.0))
VIEW = nrm((1, 1, 32 / 31))

# ---------- растеризатор на C ----------
def _lib():
    so, c = os.path.join(HERE, 'raster.so'), os.path.join(HERE, 'raster.c')
    if not os.path.exists(so) or os.path.getmtime(so) < os.path.getmtime(c):
        subprocess.check_call(['cc', '-O2', '-shared', '-fPIC', c, '-o', so, '-lm'])
    return ctypes.CDLL(so)
LIB = _lib()
def raster(sv, tri, W, H):
    zb = np.full(W * H, np.inf, np.float32); tid = np.full(W * H, -1, np.int32)
    b1 = np.zeros(W * H, np.float32); b2 = np.zeros(W * H, np.float32)
    sv = np.ascontiguousarray(sv, np.float32); tri = np.ascontiguousarray(tri, np.int32)
    P = lambda a: a.ctypes.data_as(ctypes.c_void_p)
    LIB.raster(ctypes.c_int(len(tri)), P(sv), P(tri), ctypes.c_int(W), ctypes.c_int(H), P(zb), P(tid), P(b1), P(b2))
    return zb.reshape(H, W), tid.reshape(H, W), b1.reshape(H, W), b2.reshape(H, W)

# ---------- данные MakeHuman ----------
with np.load(os.path.join(HERE, 'mh.npz')) as _z: DAT = {k: _z[k] for k in _z.files}   # целиком в память: безопасно для нескольких процессов
SK = json.loads(bytes(DAT['skeleton']).decode())
BONES = list(SK['bones'])
def _order():
    out, seen = [], set()
    def add(b):
        if b in seen: return
        p = SK['bones'][b]['parent']
        if p: add(p)
        seen.add(b); out.append(b)
    for b in BONES: add(b)
    return out
ORDER = _order()
BI = {b: i for i, b in enumerate(BONES)}
V0 = DAT['verts'].astype(float)
NV = len(V0)
# веса: нормируем на вершину
WV, WB, WW = DAT['w_vert'], DAT['w_bone'].astype(int), DAT['w_val'].astype(float)
_s = np.bincount(WV, WW, NV); WW = WW / _s[WV]
DOM = np.full(NV, -1); _best = np.zeros(NV)
for v, b, w in zip(WV, WB, WW):
    if w > _best[v]: _best[v] = w; DOM[v] = b
def bone_class(name):
    """часть тела по цепочке предков кости: всё, что висит на голове, — голова, и т. д."""
    keys = [('finger', 'hand'), ('metacarpal', 'hand'), ('wrist', 'hand'), ('lowerarm', 'farm'), ('upperarm', 'uarm'),
            ('toe', 'foot'), ('foot', 'foot'), ('lowerleg', 'shin'), ('upperleg', 'thigh'), ('head', 'head'), ('neck', 'neck')]
    b = name
    while b:
        for k, c in keys:
            if b.startswith(k): return c
        b = SK['bones'][b]['parent']
    return 'torso'
CLS_NAMES = ['torso', 'neck', 'head', 'uarm', 'farm', 'hand', 'thigh', 'shin', 'foot']
VCLS = np.array([CLS_NAMES.index(bone_class(BONES[b])) for b in DOM])
BCLS = np.array([CLS_NAMES.index(bone_class(b)) for b in BONES])
CLSW = np.zeros((NV, len(CLS_NAMES)))                  # доля каждой части тела в вершине: границы одежды плавные
np.add.at(CLSW, (WV, BCLS[WB]), WW)
def T(k): return DAT['t_ix_' + k], DAT['t_d_' + k].astype(float).reshape(-1, 3)

def to_local(p):
    """MakeHuman (дм, y вверх, z вперёд, +x — левая сторона) -> метры, x вперёд, y влево, z вверх"""
    return np.stack([p[..., 2], p[..., 0], p[..., 1]], -1) * .1

# ---------- тело по внешности ----------
def lerp3(x):
    return [('min', 1 - 2 * x), ('average', 2 * x)] if x <= .5 else [('average', 2 - 2 * x), ('max', 2 * x - 1)]
_cache = {}
def body(o):
    key = json.dumps(o, sort_keys=True)
    if key in _cache: return _cache[key]
    V = V0.copy()
    g = 0.0 if o.get('fem') else 1.0
    for gname, gw in (('male', g), ('female', 1 - g)):
        if gw <= 0: continue
        for mu, mw in lerp3(o.get('muscle', .5)):
            for wt, ww in lerp3(o.get('weight', .5)):
                if mw * ww <= 0: continue
                ix, d = T('universal-%s-young-%smuscle-%sweight' % (gname, mu, wt)); V[ix] += d * gw * mw * ww
        ix, d = T('caucasian-%s-young' % gname); V[ix] += d * gw
        h = o.get('height', .5)
        if h != .5:
            ix, d = T('%s-young-averagemuscle-averageweight-%sheight' % (gname, 'max' if h > .5 else 'min')); V[ix] += d * gw * abs(h - .5) * 2
    L = to_local(V)
    L[:, 2] -= L[DAT['faces_body'].ravel(), 2].min()            # подошвы на полу
    J = {n: L[ix].mean(0) for n, ix in SK['joints'].items()}
    heads = np.array([J[SK['bones'][b]['head']] for b in BONES]); tails = np.array([J[SK['bones'][b]['tail']] for b in BONES])
    r = dict(L=L, heads=heads, tails=tails, H=L[DAT['faces_body'].ravel(), 2].max())
    _cache[key] = r; return r

# ---------- поза ----------
def rot(axis, a):
    axis = nrm(axis); x, y, z = axis; c, s = math.cos(a), math.sin(a); C = 1 - c
    return np.array([[c + x * x * C, x * y * C - z * s, x * z * C + y * s], [y * x * C + z * s, c + y * y * C, y * z * C - x * s], [z * x * C - y * s, z * y * C + x * s, c + z * z * C]])
def aim(target, twist=0.0):
    """поворот, переводящий текущее направление кости в target (в осях персонажа)"""
    t = nrm(target)
    def f(cur):
        c = nrm(cur); ax = np.cross(c, t); s = np.linalg.norm(ax)
        R = np.eye(3) if s < 1e-8 else rot(ax, math.atan2(s, c @ t))
        return rot(t, twist) @ R if twist else R
    return f
def pose_matrices(B, pose):
    Rs = np.zeros((len(BONES), 3, 3)); ts = np.zeros((len(BONES), 3))
    for b in ORDER:
        i = BI[b]; p = SK['bones'][b]['parent']
        R, t = (Rs[BI[p]].copy(), ts[BI[p]].copy()) if p else (np.eye(3), np.zeros(3))
        spec = pose.get(b)
        if spec is not None:
            h = R @ B['heads'][i] + t
            if callable(spec): Rx = spec(R @ (B['tails'][i] - B['heads'][i]))
            elif isinstance(spec, list):                     # [(ось в покое, угол), ...]: сгиб сустава в его собственных осях
                Rx = np.eye(3)
                for ax, ang in spec: Rx = rot(R @ ax, ang) @ Rx
            else: Rx = spec
            R = Rx @ R; t = Rx @ (t - h) + h
        Rs[i], ts[i] = R, t
    return Rs, ts
def skin(P, Rs, ts):
    """линейное смешивание костей: P — вершины в покое (NV,3)"""
    contrib = np.einsum('kij,kj->ki', Rs[WB], P[WV]) + ts[WB]
    out = np.zeros_like(P)
    for k in range(3): out[:, k] = np.bincount(WV, contrib[:, k] * WW, len(P))
    return out

def hand_rig(B, sd):
    """оси кисти в покое: поперёк костяшек (ось сгиба) и нормаль ладони (в сторону большого пальца)"""
    h = lambda b: B['heads'][BI[b + '.' + sd]]; t = lambda b: B['tails'][BI[b + '.' + sd]]
    W, I, Pk = h('wrist'), h('finger2-1'), h('finger5-1')
    d = nrm(h('finger3-1') - W); a = nrm(Pk - I); n = nrm(np.cross(d, a))
    if (t('finger1-3') - (I + Pk) / 2) @ n < 0: n = -n
    return d, a, n
def idle_pose(o, B):
    """стойка: руки вдоль тела, локти чуть согнуты, кисть в расслабленном полукулаке, ноги прямо"""
    fem = o.get('fem')
    p = {}
    for sd, s in (('L', 1), ('R', -1)):
        p['upperarm02.' + sd] = aim((-.06, s * (.2 if not fem else .15), -1))
        fa = (.16, s * .06, -1)
        p['lowerarm01.' + sd] = aim(fa); p['lowerarm02.' + sd] = aim(fa)
        p['wrist.' + sd] = aim((.08, s * .02, -1))
        d, a, n = hand_rig(B, sd)
        mid = nrm(B['tails'][BI['finger3-1.' + sd]] - B['heads'][BI['finger3-1.' + sd]])
        for f in range(2, 6):
            fd = nrm(B['tails'][BI['finger%d-1.%s' % (f, sd)]] - B['heads'][BI['finger%d-1.%s' % (f, sd)]])
            spread = math.atan2(np.cross(fd, mid) @ n, fd @ mid) * 1.0          # свести к среднему пальцу
            curl = (.95, 1.15, .8) if f != 2 else (.8, 1.0, .7)                    # указательный чуть прямее
            sgn = 1 if (rot(a, .3) @ fd) @ n > fd @ n else -1                     # сгиб — в сторону ладони
            for k in (1, 2, 3):
                lst = [(a, sgn * curl[k - 1])]
                if k == 1: lst.insert(0, (n, spread))
                p['finger%d-%d.%s' % (f, k, sd)] = lst
        td = nrm(B['tails'][BI['finger1-1.' + sd]] - B['heads'][BI['finger1-1.' + sd]])
        ax = nrm(np.cross(td, mid)); p['finger1-1.' + sd] = [(ax, .5)]               # большой палец прижат к кисти
        p['finger1-2.' + sd] = [(ax, .25)]; p['finger1-3.' + sd] = [(ax, .2)]
        p['upperleg02.' + sd] = aim((.03, s * .02, -1))
        p['lowerleg01.' + sd] = aim((-.03, s * .012, -1)); p['lowerleg02.' + sd] = aim((-.03, s * .012, -1))
    p['head'] = [((0, 1, 0), -.14)]                          # подбородок чуть поднят: лицо видно сверху
    return p

# ---------- одежда и волосы: какие грани рисуем ----------
def vnormals(P, F):
    n = np.zeros_like(P)
    a, b, c, d = (P[F[:, k]] for k in range(4))
    fn = np.cross(c - a, d - b)
    for k in range(4): np.add.at(n, F[:, k], fn)
    return n / np.maximum(np.linalg.norm(n, axis=-1, keepdims=True), 1e-12)
def outfit(o, B):
    """возвращает список (грани-квады, имя оболочки) и смещённые вершины покоя"""
    L = B['L'].copy(); H = B['H']; zn = L[:, 2] / H * 1.78
    parts = [(DAT['faces_body'], 'body'), (DAT['faces_helper-l-eye'], 'eye'), (DAT['faces_helper-r-eye'], 'eye')]
    def shell(F, off):
        u = np.unique(F); n = vnormals(L, F)
        L[u] += n[u] * (off(zn[u])[:, None] if callable(off) else off)
    Ft = DAT['faces_helper-tights']; zf = zn[Ft].min(1); zt = L[Ft, 2].max(1)
    bottom = o.get('bottom', 'shorts')
    waist = B['heads'][BI['root']][2] + .075
    if bottom == 'shorts':
        F = Ft[(zf > .6) & (zt < waist)]; shell(F, lambda z: .009 + .016 * np.clip((.8 - z) / .2, 0, 1)); parts.append((F, 'pants'))
    elif bottom == 'pants':
        F = Ft[(zf > .075) & (zt < waist)]
        shell(F, lambda z: .006 + .014 * np.clip((.62 - z) / .5, 0, 1))   # брюки свободнее книзу
        parts.append((F, 'pants'))
    Fh = DAT['faces_helper-hair']; hz = zn[Fh].min(1)
    hair = o.get('hair', 'short')
    if hair not in ('bald', 'buzz'):                  # buzz — не оболочка, а покраска кожи головы (см. paint)
        cut = {'short': 1.62, 'buzz': 1.635, 'side': 1.6, 'bob': 1.5, 'long': 1.3}[hair]
        F = Fh[hz > cut]
        if hair == 'side':                                    # венчик: без макушки
            c = L[F].mean(1); F = F[(zn[F].max(1) < 1.70) | (c[:, 0] < -.04)]
        c = L[F].mean(1); ey = L[np.unique(DAT['faces_helper-l-eye'])].mean(0)
        F = F[~((c[:, 0] > ey[0] - .045) & (c[:, 2] < ey[2] + .05))]          # открыть лоб и лицо
        shell(F, .0018 if hair == 'buzz' else .004 if hair in ('short', 'side') else .01); parts.append((F, 'hair'))   # buzz — машинка, почти по коже
    # ботинки: стопа и щиколотка чуть толще, без пальцев
    fv = np.unique(DAT['faces_body']); fv = fv[(VCLS[fv] == CLS_NAMES.index('foot')) | ((VCLS[fv] == CLS_NAMES.index('shin')) & (L[fv, 2] < .1))]
    Fb = DAT['faces_body']; m = np.isin(Fb, fv).any(1); Fm = Fb[m]
    for _ in range(12):                                                  # сгладить пальцы: ботинок, а не носок
        acc = np.zeros_like(L); cnt = np.zeros(len(L))
        for k in range(4):
            for j in (1, 3):
                np.add.at(acc, Fm[:, k], L[Fm[:, (k + j) % 4]]); np.add.at(cnt, Fm[:, k], 1)
        L[fv] = L[fv] * .4 + acc[fv] / np.maximum(cnt[fv], 1)[:, None] * .6
    n = vnormals(L, Fb); L[fv] += n[fv] * .011
    L[fv, 2] = np.maximum(L[fv, 2], 0)
    return parts, L

# ---------- материалы ----------
def hexc(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float) / 255
def noise(p, f=14.0, s=0):
    x, y, z = p[:, 0] * f, p[:, 1] * f, p[:, 2] * f
    return (np.sin(x * 1.3 + s) * np.sin(y * 1.7 + 1.1 * s) * np.sin(z * 1.1 + 2.3)
            + .5 * np.sin(x * 2.9 + z * 1.7 + s) * np.sin(y * 3.1 - z * 2.3))
def palette(o):
    skin = hexc(o.get('skin', '#e8b07a')); hc = hexc(o.get('hairc', '#6a3a1e'))
    return {'skin': (skin, .04, .55, 'skin'), 'hair': (hc, .1, .4, 'hair'), 'beard': (hc * .85, .03, .7, 'hair'), 'stubble': (hc * .95, .02, .8, 'hair'), 'buzz': (hc * .9, .05, .7, 'hair'),
            'brow': (hc * .6, 0, .8, None), 'eye': (hexc('#d8cdc2') * .85, .3, .2, None), 'iris': (hexc('#2e2018'), .4, .2, None), 'lip': (skin * np.array([.85, .6, .55]), 0, .8, None),
            'shirt': (hexc(o.get('shirt', '#8fa6c6')), .03, .8, 'cloth'), 'pants': (hexc(o.get('pants', '#55575c')), .03, .8, 'cloth'),
            'shoe': (hexc('#2a2a2c'), .15, .4, None), 'sole': (hexc('#161616'), 0, .8, None),
            'belt': (hexc('#1e1e20'), .3, .3, None), 'glass': (hexc('#141414'), .4, .2, None), 'buckle': (hexc('#b8b8b0'), .6, .2, None)}
def paint(o, B, part, cls, p):
    """имя материала для пикселей: part — оболочка, cls — часть тела по кости, p — точка в покое (метры)"""
    H = B['H']; z = p[:, 2] / H * 1.78; x, y = p[:, 0], p[:, 1]
    out = np.full(len(p), 'skin', dtype=object)
    if part == 'eye':
        ey = B['eye']; d = np.hypot(np.abs(y) - abs(ey[1]), p[:, 2] - ey[2])
        out[:] = 'eye'; out[(x > ey[0] + .004) & (d < .0065)] = 'iris'
        return out
    if part in ('hair', 'pants', 'pack'):
        out[:] = part
        if part == 'pants' and o.get('belt'):
            top = B['heads'][BI['root']][2] + .075; zz = p[:, 2]
            out[zz > top - .03] = 'belt'; out[(zz > top - .03) & (x > .05) & (np.abs(y) < .022)] = 'buckle'
        if part == 'pants' and o.get('blood'):
            out[(noise(p, 7, o['blood']) + .4 * noise(p, 19, 2 * o['blood']) > .9) & (x > -.02)] = 'blood'
        return out
    top = o.get('top', 'tank')
    zs, ys = B['sh'][2], B['sh'][1]                 # плечевой сустав в покое
    ay = np.abs(y); zz = p[:, 2]; front = x > 0
    ell = lambda cy, cz, ry, rz: ((ay - cy) / ry) ** 2 + ((zz - cz) / rz) ** 2 < 1
    body_ = (cls <= 1) & (zz > B['waist'] - .04) & (zz < zs + .14)
    if top == 'tank':
        deep = .15 if o.get('fem') else .17
        sh = body_ & ~ell(ys, zs + .02, .46 * ys, .15)                      # пройма вокруг плеча
        sh &= ~(front & ell(0, zs + .06, .3 * ys, deep))                     # круглый вырез спереди
        sh &= ~(~front & ell(0, zs + .08, .3 * ys, .1))                      # вырез на спине
    else:
        sh = body_ & ~(front & ell(0, zs + .075, .27 * ys, .062)) & ~(~front & ell(0, zs + .08, .27 * ys, .06))
    out[sh] = 'shirt'
    if top == 'tee':                                                         # короткий рукав
        dist = np.linalg.norm(np.stack([p[:, 0] - B['sh'][0], ay - ys, zz - zs], -1), axis=-1)
        out[(cls == 3) & (dist < .15)] = 'sleeve'
    elif top in ('jacket', 'long'):                                          # длинный рукав до запястья (слот рукава)
        out[(cls == 3) | (cls == 4)] = 'sleeve'
    if o.get('sling'):                                                       # ремень сумки через плечо: с левого плеча к правому бедру
        t = (zs + .06 - zz) / (zs + .06 - (B['waist'] + .02)); yl = ys * .85 - t * ys * 1.55
        out[body_ & (t > -.05) & (t < 1.05) & (np.abs(y - yl) < .02 + .008 * front)] = 'strap'
    if o.get('pack'):                                                        # лямки рюкзака спереди
        out[sh & front & (np.abs(ay - .5 * ys) < .028) & (zz > zs - .3)] = 'strap'
    if o.get('blood'):
        bl = (noise(p, 7, o['blood']) + .4 * noise(p, 19, 2 * o['blood']) > .72 - .25 * np.clip((zs - .1 - zz) / .3, 0, 1) * (x > 0)) & ((out == 'shirt') | (out == 'sleeve'))
        out[bl] = 'blood'
    bottom = o.get('bottom', 'shorts')                     # тело под шортами/брюками — в цвет ткани (без просветов)
    if bottom in ('shorts', 'pants'):
        under = (zz < B['waist']) & ((cls == 0) | (cls == 6) | ((cls == 7) & (bottom == 'pants')))
        under &= z > (.62 if bottom == 'shorts' else .1)
        out[under] = 'pants'
    out[cls == 8] = 'shoe'; out[(cls == 8) & (z < .02)] = 'sole'
    out[(cls == 7) & (z < .1)] = 'shoe'
    # лицо: брови, губы, борода, очки (по точкам в покое головы)
    hd = cls == 2; ey = B['eye']; ex, eyy, ez = ey[0], abs(ey[1]), ey[2]
    face = hd & (x > ex - .03)
    brow = face & (np.abs(ay - eyy - .002) < .016) & (np.abs(zz - (ez + .021 - (ay - eyy) ** 2 * 8)) < .0038)
    out[brow] = 'brow'
    if o.get('hair') == 'buzz':                                               # стрижка машинкой: волосы «нарисованы» по коже головы
        scalp = hd & (((x > ex - .03) & (zz > ez + .042 + .012 * (ay / .06) ** 2)) | ((x <= ex - .03) & (zz > ez - .035 - .03 * np.clip((ex - .03 - x) / .08, 0, 1))))
        scalp &= ~((ay > .062) & (zz < ez + .02) & (x > ex - .11))            # уши открыты
        out[scalp] = 'buzz'
    if o.get('beard') == 'stubble' or (o.get('beard') and o.get('hair') == 'buzz'):   # щетина: челюсть, подбородок, над губой; неровно
        st = hd & (x > ex - .075) & (zz < ez - .038) & (ay < .066) & ~((ay < .016) & (np.abs(zz - (ez - .072)) < .006))
        st &= noise(p, 90, 3) > -.55
        out[st] = 'stubble'
        out[face & (ay < .02) & (np.abs(zz - (ez - .072)) < .0045)] = 'lip'
    elif o.get('beard'):
        out[hd & (x > ex - .075) & (zz < ez - .042) & (ay < .066)] = 'beard'
    elif o.get('blood'):
        out[face & (ay < .028) & (zz < ez - .06) & (zz > ez - .1)] = 'blood'
        out[face & (ay < .022) & (np.abs(zz - (ez - .072)) < .006)] = 'mouth'
    else:
        out[face & (ay < .02) & (np.abs(zz - (ez - .072)) < .0045)] = 'lip'
    if o.get('mustache'):
        out[face & (ay < .034) & (np.abs(zz - (ez - .057)) < .009)] = 'beard'
    if o.get('glasses'):                                                      # тонкая оправа и перемычка
        r = np.sqrt(((ay - eyy) / .021) ** 2 + ((zz - ez) / .015) ** 2)
        out[face & (r > .78) & (r < 1.0)] = 'glass'
        out[face & (ay < .012) & (np.abs(zz - ez - .004) < .0028)] = 'glass'
    return out

# ---------- рюкзак: скруглённый ящик на спине, жёстко на кости spine01 ----------
def rbox_mesh(c, h, n=4, pw=4.0):
    V, F = [], []
    for k in range(3):
        for sgn in (1, -1):
            u, v = (k + 1) % 3, (k + 2) % 3
            if sgn < 0: u, v = v, u
            base = len(V)
            for i in range(n + 1):
                for j in range(n + 1):
                    q = np.zeros(3); q[k] = sgn; q[u] = -1 + 2 * i / n; q[v] = -1 + 2 * j / n
                    q = q / (np.abs(q) ** pw).sum() ** (1 / pw)
                    V.append(np.array(c) + q * np.array(h))
            for i in range(n):
                for j in range(n):
                    a = base + i * (n + 1) + j; F.append([a, a + n + 1, a + n + 2, a + 1])
    return np.array(V), np.array(F)

# ---------- кадр ----------
SLOT = {'outline': 0, 'glass': 0, 'skin': 1, 'eye': 1, 'lip': 1, 'hair': 2, 'beard': 2, 'stubble': 2, 'buzz': 2, 'brow': 2, 'shirt': 3, 'sleeve': 4,
        'pants': 5, 'shoe': 6, 'sole': 6, 'iris': 7, 'mouth': 8, 'blood': 9, 'pack': 10, 'strap': 10, 'belt': 13, 'buckle': 13}
LUMK = {'eye': 1.4, 'lip': .82, 'beard': .78, 'stubble': .98, 'buzz': .92, 'brow': .55, 'sole': .6, 'buckle': 3.2, 'strap': .72, 'mouth': 1.0}
TEX = {'skin': 'skin', 'eye': None, 'lip': 'skin', 'hair': 'hair', 'beard': 'hair', 'stubble': 'hair', 'buzz': 'hair', 'shirt': 'cloth', 'sleeve': 'cloth', 'pants': 'cloth',
       'pack': 'cloth', 'strap': 'cloth', 'blood': 'cloth'}
SPEC = {'skin': (.04, .55), 'hair': (.1, .4), 'eye': (.3, .2), 'iris': (.4, .2), 'shoe': (.15, .4), 'belt': (.3, .3), 'buckle': (.6, .2), 'glass': (.4, .2)}
LUM_MAX = 1.6
LUM_LO, LUM_SPAN = .3, 1.05                             # яркость в B: .3 + B / 240 * 1.05, 16 уровней (как точность старых 8 ступеней)

def scene(o, pose, face):
    """поза -> вершины в мире, грани, части, всё для растеризации"""
    B = body(o)
    parts, Lrest = outfit(o, B)
    e = DAT['faces_helper-l-eye']; B['eye'] = Lrest[np.unique(e)].mean(0); B['sh'] = B['heads'][BI['upperarm01.L']]; B['waist'] = B['heads'][BI['root']][2] + .075
    if pose is None: pose = idle_pose(o, B)
    elif callable(pose): pose = pose(o, B)
    Rs, ts = pose_matrices(B, pose)
    Pp = skin(Lrest, Rs, ts)
    clsw = CLSW
    if o.get('pack'):                                      # рюкзак: ящик за спиной
        fb = np.unique(DAT['faces_body']); zs = B['sh'][2]
        band = fb[(VCLS[fb] == 0) & (np.abs(Lrest[fb, 2] - (zs - .2)) < .03) & (np.abs(Lrest[fb, 1]) < .05)]
        bx = Lrest[band, 0].min()
        pv, pf = rbox_mesh((bx - .075, 0, zs - .21), (.075, .155, .19))
        bi = BI['spine01']; n0 = len(Lrest)
        Lrest = np.concatenate([Lrest, pv]); Pp = np.concatenate([Pp, pv @ Rs[bi].T + ts[bi]])
        parts = parts + [(pf + n0, 'pack')]
        clsw = np.concatenate([CLSW, np.tile(np.eye(len(CLS_NAMES))[0], (len(pv), 1))])
    if o.get('sling'):                                     # сумка-слинг на груди, на кости spine01 (как рюкзак)
        fb = np.unique(DAT['faces_body']); zs = B['sh'][2]
        band = fb[(VCLS[fb] == 0) & (np.abs(Lrest[fb, 2] - (zs - .17)) < .03) & (np.abs(Lrest[fb, 1] - .06) < .04)]
        fx = Lrest[band, 0].max()
        pv, pf = rbox_mesh((fx + .03, .07, zs - .17), (.03, .075, .1))
        bi = BI['spine01']; n0 = len(Lrest)
        Lrest = np.concatenate([Lrest, pv]); Pp = np.concatenate([Pp, pv @ Rs[bi].T + ts[bi]])
        parts = parts + [(pf + n0, 'pack')]
        clsw = np.concatenate([clsw, np.tile(np.eye(len(CLS_NAMES))[0], (len(pv), 1))])
    # падение (смерть): назад, вокруг стоп, с выносом вперёд, чтобы тело легло около точки персонажа
    fall = pose.get('_fall', 0) if isinstance(pose, dict) else 0
    if fall:
        a = -fall * math.pi / 2 * .97
        Pp = Pp @ rot((0, 1, 0), a).T; Pp[:, 0] += .85 * fall
    # стопы на полу: самая низкая точка тела — z = 0
    used = np.unique(np.concatenate([F.ravel() for F, _ in parts]))
    zmin = Pp[used, 2].min(); Pp[:, 2] -= zmin
    lift = pose.get('_lift', 0) if isinstance(pose, dict) else 0          # фаза полёта в беге: тело над полом
    if lift: Pp[:, 2] += lift; zmin -= lift
    ca, sa = math.cos(face), math.sin(face)
    Pw = np.stack([Pp[:, 0] * ca - Pp[:, 1] * sa, Pp[:, 0] * sa + Pp[:, 1] * ca, Pp[:, 2]], -1)
    return dict(B=B, parts=parts, Lrest=Lrest, Pw=Pw, clsw=clsw, pose=pose, Rs=Rs, ts=ts, face=face, fall=fall, zmin=zmin)

def grip(sc):
    """точка хвата и ось оружия правой руки в мире"""
    B, Rs, ts, fall, face = sc['B'], sc['Rs'], sc['ts'], sc['fall'], sc['face']
    def P_(b):
        i = BI[b]; return Rs[i] @ B['heads'][i] + ts[i]
    I, Pk, W = P_('finger2-1.R'), P_('finger5-1.R'), P_('wrist.R')
    M = P_('finger3-1.R')
    g = (I + Pk) / 2 * .65 + W * .35; ref = P_('spine02')
    d = nrm(nrm(I - Pk) + 1.1 * nrm(M - W))            # из кулака вдоль руки: опущенная бита смотрит вниз-вперёд
    pts = np.array([g, g + d, ref])
    if fall: pts = pts @ rot((0, 1, 0), -fall * math.pi / 2 * .97).T; pts[:, 0] += .85 * fall
    pts[:, 2] -= sc['zmin']
    ca, sa = math.cos(face), math.sin(face)
    pts = np.stack([pts[:, 0] * ca - pts[:, 1] * sa, pts[:, 0] * sa + pts[:, 1] * ca, pts[:, 2]], -1)
    return pts

def frame(o, face, pose=None, K=2):
    """кадр в формате игры: slot (номер цвета), lum (яркость), cov (покрытие), якорь и данные оружия"""
    HX, HY, ZP = 32 * K, 16 * K, 31 * K
    sc = scene(o, pose, face)
    B, parts, Lrest, Pw, clsw = sc['B'], sc['parts'], sc['Lrest'], sc['Pw'], sc['clsw']
    zshift = 0.0
    quads = np.concatenate([F for F, _ in parts]); pid = np.concatenate([np.full(len(F), i) for i, (F, _) in enumerate(parts)])
    tri = np.concatenate([quads[:, [0, 1, 2]], quads[:, [0, 2, 3]]]); tpart = np.concatenate([pid, pid])
    Nw = vnormals(Pw, quads)
    used = np.unique(quads.ravel())
    sxv = (Pw[used, 0] - Pw[used, 1]) * HX; syv = (Pw[used, 0] + Pw[used, 1]) * HY - Pw[used, 2] * ZP
    x0, x1 = math.floor(sxv.min()) - 3, math.ceil(sxv.max()) + 3
    y0, y1 = math.floor(syv.min()) - 3, math.ceil(syv.max()) + 3
    W, Hh = (x1 - x0) * SS, (y1 - y0) * SS
    scr = np.stack([((Pw[:, 0] - Pw[:, 1]) * HX - x0) * SS, ((Pw[:, 0] + Pw[:, 1]) * HY - Pw[:, 2] * ZP - y0) * SS, -(Pw @ VIEW)], -1)
    zb, tid, b1, b2 = raster(scr, tri, W, Hh)
    hit = tid >= 0; T_ = tid[hit]; w1, w2 = b1[hit], b2[hit]; w0 = 1 - w1 - w2
    tv = tri[T_]; bary = np.stack([w0, w1, w2], -1)
    interp = lambda A: np.einsum('nk,nkj->nj', bary, A[tv])
    n = interp(Nw); n /= np.maximum(np.linalg.norm(n, axis=-1, keepdims=True), 1e-9)
    pw = interp(Pw); pr = interp(Lrest); part = tpart[T_]
    # тень от света
    u_ = nrm(np.cross(LIGHT, (0, 0, 1))); v_ = np.cross(LIGHT, u_)
    SR = 260
    lpos = np.stack([Pw[used] @ u_, Pw[used] @ v_], -1)
    mn = lpos.min(0) - .02; scl = SR / (lpos.max(0) + .02 - mn).max()
    lsv = np.stack([(Pw @ u_ - mn[0]) * scl, (Pw @ v_ - mn[1]) * scl, -(Pw @ LIGHT)], -1)
    lz, _, _, _ = raster(lsv, tri, SR, SR)
    q = np.stack([pw @ u_, pw @ v_, -(pw @ LIGHT)], -1)
    qi = np.clip(((q[:, :2] - mn) * scl).astype(int), 0, SR - 1)
    shadow = np.zeros(len(q))
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            shadow += (q[:, 2] > lz[np.clip(qi[:, 1] + dy, 0, SR - 1), np.clip(qi[:, 0] + dx, 0, SR - 1)] + .012)
    sh = 1 - .55 * shadow / 9
    dif = np.clip(n @ LIGHT, 0, 1) * sh
    sky = .5 + .5 * n[:, 2]; fill = np.clip(n @ VIEW, 0, 1)
    lum = .27 * (.55 + .45 * sky) + .8 * dif + .14 * fill
    cls = interp(clsw).argmax(1)
    names = np.empty(len(T_), dtype=object)
    for i, (_, nm) in enumerate(parts):
        sel = part == i
        if sel.any(): names[sel] = paint(o, B, nm, cls[sel], pr[sel])
    hv = nrm(LIGHT + VIEW); slot = np.zeros(len(T_), int)
    for nm in np.unique(names):
        sel = names == nm; L = lum[sel] * LUMK.get(nm, 1.0); t = TEX.get(nm)
        if t == 'hair':                                   # мелкий шум кожи/ткани не виден на экране, а листы от него тяжелеют
            st = np.sin(pr[sel, 1] * 160 + np.sin(pr[sel, 2] * 40) * 2) * .5 + np.sin(pr[sel, 2] * 90 + pr[sel, 0] * 50) * .3
            L = L * (1 + .1 * st)
        sp, ro = SPEC.get(nm, (.03, .8))
        L = L + np.clip(n[sel] @ hv, 0, 1) ** (2 / ro ** 2 * .5 + 2) * sp * sh[sel] * 1.2
        lum[sel] = np.where(L < 1, np.clip(L, 0, 1) ** (1 / 1.1), L)
        slot[sel] = SLOT[nm]
    # уменьшение: покрытие, слот — большинством, яркость — средним
    h, w = Hh // SS, W // SS
    cov = hit.reshape(h, SS, w, SS).mean((1, 3))
    S_ = np.full(Hh * W, -1); S_[hit.ravel()] = slot
    Lm = np.zeros(Hh * W); Lm[hit.ravel()] = lum
    S_ = S_.reshape(h, SS, w, SS).transpose(0, 2, 1, 3).reshape(h, w, SS * SS)
    Lm = Lm.reshape(h, SS, w, SS).transpose(0, 2, 1, 3).reshape(h, w, SS * SS)
    cnt = np.stack([(S_ == k).sum(-1) for k in range(16)], -1)
    slot_o = cnt.argmax(-1)
    lum_o = np.where(cov > 0, (Lm * (S_ >= 0)).sum(-1) / np.maximum((S_ >= 0).sum(-1), 1), 0)
    g = grip(sc)
    def proj(p): return np.array([(p[0] - p[1]) * 32, (p[0] + p[1]) * 16 - p[2] * 31])
    hp = proj(g[0]); dv = (proj(g[1]) - hp) * .08
    front = int(((g[0] - g[2])[:2] @ nrm(VIEW[:2])) > 0)
    return dict(slot=slot_o, lum=lum_o, cov=cov, anchor=(-x0, -y0), wpn=[round(float(hp[0]), 2), round(float(hp[1]), 2), round(float(dv[0]), 3), round(float(dv[1]), 3), front])

def keyed(fr, outline=.45):
    """кадр -> RGBA в кодировке игры: R = слот*16+8, G = грубая тень (старый формат) + метка 8, B = точная яркость"""
    body_ = fr['cov'] >= .45
    h, w = body_.shape
    out = np.zeros((h, w, 4), np.uint8)
    lum = np.clip(fr['lum'], LUM_LO, LUM_LO + LUM_SPAN)
    out[body_, 0] = fr['slot'][body_] * 16 + 8; out[body_, 1] = 7 * 32 + 8          # G: метка нового формата, тень — в B
    out[body_, 2] = (np.round((lum[body_] - LUM_LO) / LUM_SPAN * 15) * 16).astype(np.uint8); out[body_, 3] = 255   # 16 уровней: листы лёгкие
    if outline:
        edge = np.zeros_like(body_)
        edge[:, 1:] |= body_[:, :-1]; edge[:, :-1] |= body_[:, 1:]; edge[1:, :] |= body_[:-1, :]; edge[:-1, :] |= body_[1:, :]
        edge &= ~body_
        out[edge, 0] = 8; out[edge, 1] = 8; out[edge, 2] = 0; out[edge, 3] = int(255 * outline)
    return Image.fromarray(out, 'RGBA')

WARM = np.array([1.0, .55, .36])
def decode(im, pal):
    """как игра перекрашивает кадр (для превью): pal — {слот: (r, g, b)}"""
    a = np.array(im).astype(float); out = a.copy()
    m = a[..., 3] > 0; s = (a[..., 0].astype(int) >> 4); lum = LUM_LO + a[..., 2] / 240 * LUM_SPAN
    flat = (s == 0) | (s == 7) | (s == 8); lum = np.where(flat, 1, lum)
    col = np.array([pal.get(k, (255, 0, 255)) for k in range(16)], float)[s]
    c = col * lum[..., None]
    k = np.clip((1 - lum) * .6, 0, .6)[..., None] * (s == 1)[..., None]
    c = c * (1 - k) + c * WARM * k
    out[..., :3] = np.where(m[..., None], np.clip(c, 0, 255), 0)
    return Image.fromarray(out.astype(np.uint8), 'RGBA')
def look_pal(o):
    h = lambda x: tuple(int(v * 255) for v in hexc(x))
    sk = h(o.get('skin', '#e8b07a'))
    return {0: (24, 20, 18), 1: sk, 2: h(o.get('hairc', '#6a3a1e')), 3: h(o.get('shirt', '#8fa6c6')), 4: h(o.get('sleeve', o.get('shirt', '#8fa6c6'))),
            5: h(o.get('pants', '#55575c')), 6: (44, 38, 34), 7: (30, 24, 20), 8: (90, 20, 16), 9: (112, 22, 16), 10: (108, 86, 56), 13: (36, 32, 30)}
def render(o, face, pose=None, K=2):
    """превью: кадр в кодировке игры, перекрашенный как в игре"""
    fr = frame(o, face, pose, K)
    return decode(keyed(fr), look_pal(o)), fr['anchor']
def finish(im): return im

LOOKS = {
    'beard':   dict(hair='short', hairc='#7a4424', beard=True, skin='#eab47c', top='tank', shirt='#93a9c9', bottom='shorts', pants='#5a5c62', muscle=.6),
    'bald':    dict(hair='side', hairc='#6e6458', mustache=True, skin='#e9b582', top='tank', shirt='#93a9c9', bottom='shorts', pants='#5a5c62', weight=.6, height=.45),
    'woman':   dict(fem=True, hair='long', hairc='#6e2c18', skin='#ecb688', top='tank', shirt='#d6d4d2', bottom='pants', pants='#6a6a6c', belt=True),
    'glasses': dict(fem=True, hair='bob', hairc='#b88a4a', glasses=True, skin='#eab88a', top='tee', shirt='#6c6c70', bottom='pants', pants='#5e5e62', belt=True, height=.6),
}
def preview(out, who=None):
    looks = [who] if who else list(LOOKS)
    group = [finish(render(LOOKS[w], math.pi / 4 + .25 * ((i % 2) * 2 - 1))[0]) for i, w in enumerate(looks)]
    dirs = [finish(render(LOOKS[looks[0]], k * math.pi / 4)[0]) for k in range(8)]
    Z, pad = 2, 16
    gw = sum(g.width * Z for g in group) - (len(group) - 1) * 40 + 2 * pad; gh = max(g.height for g in group) * Z + 2 * pad
    dw = sum(d.width for d in dirs) * 2 + 9 * 8
    W = max(gw, dw) + 2 * pad; H = gh + max(d.height for d in dirs) * 2 + 3 * pad + 20
    bg = Image.new('RGBA', (W, H), (58, 58, 58, 255)); xs = []; x = pad
    for g in group: xs.append(x); x += g.width * Z - 40
    for i in sorted(range(len(group)), key=lambda i: (i % 2 == 0, i)):
        g = group[i].resize((group[i].width * Z, group[i].height * Z), Image.NEAREST)
        bg.alpha_composite(g, (xs[i], pad + (0 if i % 2 else 24) + gh - 2 * pad - g.height - 24))
    y = gh + pad; x = pad
    for d in dirs:
        big = d.resize((d.width * 2, d.height * 2), Image.NEAREST); bg.alpha_composite(big, (x, y)); x += big.width + 8
    bg.save(out); print(out, bg.size)
if __name__ == '__main__':
    preview(sys.argv[1] if len(sys.argv) > 1 else 'mh3d.png', sys.argv[2] if len(sys.argv) > 2 else None)
