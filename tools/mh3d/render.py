#!/usr/bin/env python3
"""Персонажи «Карантина» из модели человека MakeHuman (CC0): морфинг тела, скелет, поза, одежда покраской
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
DAT = np.load(os.path.join(HERE, 'mh.npz'))
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
            Rx = spec(R @ (B['tails'][i] - B['heads'][i])) if callable(spec) else spec
            R = Rx @ R; t = Rx @ (t - h) + h
        Rs[i], ts[i] = R, t
    return Rs, ts
def skin(P, Rs, ts):
    """линейное смешивание костей: P — вершины в покое (NV,3)"""
    contrib = np.einsum('kij,kj->ki', Rs[WB], P[WV]) + ts[WB]
    out = np.zeros_like(P)
    for k in range(3): out[:, k] = np.bincount(WV, contrib[:, k] * WW, len(P))
    return out

def idle_pose(o):
    """стойка: руки вдоль тела, локти чуть согнуты, пальцы собраны, ноги прямо"""
    fem = o.get('fem')
    p = {}
    for sd, s in (('L', 1), ('R', -1)):
        p['upperarm02.' + sd] = aim((-.06, s * (.2 if not fem else .15), -1))
        fa = (.16, s * .06, -1)
        p['lowerarm01.' + sd] = aim(fa); p['lowerarm02.' + sd] = aim(fa)
        hand = (.08, s * .02, -1)
        p['wrist.' + sd] = aim(hand)
        for f in range(2, 6):                                   # пальцы вдоль кисти, слегка согнуты
            p['metacarpal%d.%s' % (f - 1, sd)] = aim(hand)
            for k, c in ((1, .25), (2, .5), (3, .6)):
                p['finger%d-%d.%s' % (f, k, sd)] = aim((.08 + c, s * (-.05), -1 + c * .3))
        p['upperleg02.' + sd] = aim((.03, s * .02, -1))
        p['lowerleg01.' + sd] = aim((-.03, s * .012, -1)); p['lowerleg02.' + sd] = aim((-.03, s * .012, -1))
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
        F = Ft[(zf > .6) & (zt < waist)]; shell(F, .009); parts.append((F, 'pants'))
    elif bottom == 'pants':
        F = Ft[(zf > .075) & (zt < waist)]
        shell(F, lambda z: .006 + .014 * np.clip((.62 - z) / .5, 0, 1))   # брюки свободнее книзу
        parts.append((F, 'pants'))
    Fh = DAT['faces_helper-hair']; hz = zn[Fh].min(1)
    hair = o.get('hair', 'short')
    if hair != 'bald':
        cut = {'short': 1.62, 'side': 1.6, 'bob': 1.5, 'long': 1.3}[hair]
        F = Fh[hz > cut]
        if hair == 'side':                                    # венчик: без макушки
            c = L[F].mean(1); F = F[(zn[F].max(1) < 1.70) | (c[:, 0] < -.04)]
        c = L[F].mean(1); ey = L[np.unique(DAT['faces_helper-l-eye'])].mean(0)
        F = F[~((c[:, 0] > ey[0] - .045) & (c[:, 2] < ey[2] + .05))]          # открыть лоб и лицо
        shell(F, .004 if hair in ('short', 'side') else .01); parts.append((F, 'hair'))
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
    return {'skin': (skin, .04, .55, 'skin'), 'hair': (hc, .1, .4, 'hair'), 'beard': (hc * .85, .03, .7, 'hair'),
            'brow': (hc * .6, 0, .8, None), 'eye': (hexc('#2a1c16'), .3, .2, None), 'lip': (skin * np.array([.85, .6, .55]), 0, .8, None),
            'shirt': (hexc(o.get('shirt', '#8fa6c6')), .03, .8, 'cloth'), 'pants': (hexc(o.get('pants', '#55575c')), .03, .8, 'cloth'),
            'shoe': (hexc('#2a2a2c'), .15, .4, None), 'sole': (hexc('#161616'), 0, .8, None),
            'belt': (hexc('#1e1e20'), .3, .3, None), 'glass': (hexc('#141414'), .4, .2, None), 'buckle': (hexc('#b8b8b0'), .6, .2, None)}
def paint(o, B, part, cls, p):
    """имя материала для пикселей: part — оболочка, cls — часть тела по кости, p — точка в покое (метры)"""
    H = B['H']; z = p[:, 2] / H * 1.78; x, y = p[:, 0], p[:, 1]
    out = np.full(len(p), 'skin', dtype=object)
    if part in ('hair', 'eye', 'pants'):
        out[:] = part
        if part == 'pants' and o.get('belt'):
            top = B['heads'][BI['root']][2] + .075; zz = p[:, 2]
            out[zz > top - .03] = 'belt'; out[(zz > top - .03) & (x > .05) & (np.abs(y) < .022)] = 'buckle'
        return out
    top = o.get('top', 'tank')
    zs, ys = B['sh'][2], B['sh'][1]                 # плечевой сустав в покое
    ay = np.abs(y); zz = p[:, 2]
    body_ = (cls <= 1) & (zz > B['waist'] - .04)
    if top == 'tank':
        hi = zz > zs - .12
        strap = (ay > .3 * ys) & (ay < .6 * ys) & (zz < zs + .12)
        side = (ay >= .6 * ys) & (ay < .76 * ys) & (zz < zs - .07)
        back = (x < -.03) & (ay < .6 * ys) & (zz < zs - .03)
        sh = body_ & (~hi | strap | side | back)
    else:
        sh = body_ & (zz < zs + .1) & ~((ay < .3 * ys) & (zz > zs - np.where(x > 0, .05, .01)))
        dist = np.linalg.norm(np.stack([p[:, 0] - B['sh'][0], ay - ys, zz - zs], -1), axis=-1)
        sh |= (cls == 3) & (dist < .15)
    out[sh] = 'shirt'
    out[cls == 8] = 'shoe'; out[(cls == 8) & (z < .02)] = 'sole'
    out[(cls == 7) & (z < .1)] = 'shoe'
    # лицо: брови, губы, борода (по точкам в покое головы)
    hd = cls == 2
    ey = B['eye']
    brow = hd & (x > ey[0] - .012) & (np.abs(np.abs(y) - abs(ey[1])) < .022) & (np.abs(p[:, 2] - (ey[2] + .024)) < .006)
    out[brow] = 'brow'
    lip = hd & (x > ey[0] - .008) & (np.abs(y) < .021) & (np.abs(p[:, 2] - (ey[2] - .072)) < .005)
    if o.get('beard'):
        bd = hd & (x > ey[0] - .07) & (p[:, 2] < ey[2] - .045) & (np.abs(y) < .065)
        out[bd] = 'beard'
    else:
        out[lip] = 'lip'
    if o.get('mustache'):
        out[hd & (x > ey[0] - .01) & (np.abs(y) < .03) & (np.abs(p[:, 2] - (ey[2] - .06)) < .008)] = 'beard'
    if o.get('glasses'):
        rim = hd & (x > ey[0] - .005) & (np.abs(p[:, 2] - ey[2]) < .02) & (np.abs(np.abs(y) - abs(ey[1])) < .028)
        rim &= ~((np.abs(p[:, 2] - ey[2]) < .012) & (np.abs(np.abs(y) - abs(ey[1])) < .019))
        out[rim] = 'glass'
    return out

# ---------- рендер кадра ----------
def render(o, face, pose=None, K=2):
    HX, HY, ZP = 32 * K, 16 * K, 31 * K
    B = body(o)
    parts, Lrest = outfit(o, B)
    e = DAT['faces_helper-l-eye']; B['eye'] = Lrest[np.unique(e)].mean(0); B['sh'] = B['heads'][BI['upperarm01.L']]; B['waist'] = B['heads'][BI['root']][2] + .075
    Rs, ts = pose_matrices(B, pose if pose is not None else idle_pose(o))
    Pp = skin(Lrest, Rs, ts)
    if o.get('beard'):                                       # борода — небольшой объём на подбородке
        pass
    ca, sa = math.cos(face), math.sin(face)
    Pw = np.stack([Pp[:, 0] * ca - Pp[:, 1] * sa, Pp[:, 0] * sa + Pp[:, 1] * ca, Pp[:, 2]], -1)
    quads = np.concatenate([F for F, _ in parts]); pid = np.concatenate([np.full(len(F), i) for i, (F, _) in enumerate(parts)])
    tri = np.concatenate([quads[:, [0, 1, 2]], quads[:, [0, 2, 3]]]); tpart = np.concatenate([pid, pid])
    Nw = np.zeros_like(Pw)
    for F, _ in parts:
        u = np.unique(F); n = vnormals(Pw, F); Nw[u] = n[u] if not Nw[u].any() else Nw[u]
    Nw = vnormals(Pw, quads)
    # кадр фиксированного размера, как у старых персонажей
    R = .45; Ht = 1.95
    cs = np.array([[x, y, z] for x in (-R, R) for y in (-R, R) for z in (0, Ht)])
    sx = (cs[:, 0] - cs[:, 1]) * HX; sy = (cs[:, 0] + cs[:, 1]) * HY - cs[:, 2] * ZP
    x0, x1 = math.floor(sx.min()) - 2, math.ceil(sx.max()) + 2
    y0, y1 = math.floor(sy.min()) - 2, math.ceil(sy.max()) + 2
    W, Hh = (x1 - x0) * SS, (y1 - y0) * SS
    scr = np.stack([((Pw[:, 0] - Pw[:, 1]) * HX - x0) * SS, ((Pw[:, 0] + Pw[:, 1]) * HY - Pw[:, 2] * ZP - y0) * SS, -(Pw @ VIEW)], -1)
    zb, tid, b1, b2 = raster(scr, tri, W, Hh)
    hit = tid >= 0; T_ = tid[hit]; w1, w2 = b1[hit], b2[hit]; w0 = 1 - w1 - w2
    tv = tri[T_]
    bary = np.stack([w0, w1, w2], -1)
    interp = lambda A: np.einsum('nk,nkj->nj', bary, A[tv])
    n = interp(Nw); n /= np.maximum(np.linalg.norm(n, axis=-1, keepdims=True), 1e-9)
    pw = interp(Pw); pr = interp(Lrest)
    vmax = tv[np.arange(len(tv)), bary.argmax(1)]
    cls = VCLS[vmax]; part = tpart[T_]
    # тень: карта глубины со стороны света
    u_ = nrm(np.cross(LIGHT, (0, 0, 1)) if abs(LIGHT[2]) < .99 else np.cross(LIGHT, (1, 0, 0))); v_ = np.cross(LIGHT, u_)
    SR = 220
    lpos = np.stack([Pw @ u_, Pw @ v_, -(Pw @ LIGHT)], -1)
    mn = lpos[:, :2].min(0) - .02; sc = SR / (lpos[:, :2].max(0) + .02 - mn).max()
    lsv = np.concatenate([(lpos[:, :2] - mn) * sc, lpos[:, 2:]], 1)
    lz, _, _, _ = raster(lsv, tri, SR, SR)
    q = np.stack([pw @ u_, pw @ v_, -(pw @ LIGHT)], -1)
    qi = np.clip(((q[:, :2] - mn) * sc).astype(int), 0, SR - 1)
    shadow = np.zeros(len(q))
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            zz = lz[np.clip(qi[:, 1] + dy, 0, SR - 1), np.clip(qi[:, 0] + dx, 0, SR - 1)]
            shadow += (q[:, 2] > zz + .012)
    sh = 1 - .55 * shadow / 9
    dif = np.clip(n @ LIGHT, 0, 1) * sh
    sky = .5 + .5 * n[:, 2]
    # «псевдо-AO»: впадины и места касания темнее (по высоте и по углублению к оси тела)
    lum = .3 * (.55 + .45 * sky) + .82 * dif
    pal = palette(o); names = np.empty(len(T_), dtype=object)
    for i, (_, nm) in enumerate(parts):
        sel = part == i
        if sel.any(): names[sel] = paint(o, B, nm, cls[sel], pr[sel])
    rgb = np.zeros((len(T_), 3)); hv = nrm(LIGHT + VIEW)
    for nm, (col, spec, rough, tex) in pal.items():
        sel = names == nm
        if not sel.any(): continue
        c = np.broadcast_to(col, (sel.sum(), 3)).copy(); Lm = lum[sel]
        if tex == 'skin':
            c *= (1 - .05 * np.clip(noise(pr[sel], 9, 1.7), -1, 1))[:, None]
            warm = np.clip(1 - Lm, 0, 1)[:, None]
            c = c * (1 - warm * .6) + c * np.array([1.0, .55, .36]) * warm * .6
        elif tex == 'cloth':
            c *= (1 - .035 * np.clip(noise(pr[sel], 12, 3.1), -1, 1))[:, None]
        elif tex == 'hair':
            st = np.sin(pr[sel, 1] * 160 + np.sin(pr[sel, 2] * 40) * 2) * .5 + np.sin(pr[sel, 2] * 90 + pr[sel, 0] * 50) * .3
            c *= (1 + .1 * st)[:, None]
        sp = np.clip(n[sel] @ hv, 0, 1) ** (2 / max(rough, .05) ** 2 * .5 + 2) * spec
        rgb[sel] = c * Lm[:, None] + sp[:, None] * sh[sel, None] * .7
    rgb = np.clip(rgb, 0, 1) ** (1 / 1.1)
    img = np.zeros((Hh, W, 4)); img[hit, :3] = rgb; img[hit, 3] = 1
    # тень на полу
    gx, gy = np.meshgrid((np.arange(W) + .5) / SS + x0, (np.arange(Hh) + .5) / SS + y0)
    a, b = gx / HX, gy / HY; fx, fy = (b + a) / 2, (b - a) / 2
    rr = np.hypot(fx, fy) / .3; fl = (~hit) & (rr < 1)
    img[fl, :3] = .05; img[fl, 3] = np.clip((1 - rr[fl]) * 1.6, 0, .42)
    im = (img * 255).astype(np.uint8)
    pm = im.astype(float); pm[..., :3] *= pm[..., 3:4] / 255
    small = Image.fromarray(pm.astype(np.uint8), 'RGBA').resize((W // SS, Hh // SS), Image.BOX)
    s_ = np.array(small).astype(float); al = s_[..., 3:4] / 255
    s_[..., :3] = np.where(al > 0, s_[..., :3] / np.maximum(al, 1e-6), 0)
    return Image.fromarray(np.clip(s_, 0, 255).astype(np.uint8), 'RGBA'), (-x0, -y0)

sys.path.insert(0, os.path.join(HERE, '..', 'char3d'))
from render import finish  # noqa: E402  жёсткий силуэт и контур — тот же, что у SDF-персонажей

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
