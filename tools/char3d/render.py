#!/usr/bin/env python3
"""Персонажи «Нулевого дня» как маленькие 3D-модели в духе Project Zomboid: гладкие объёмы (SDF),
тёплый мягкий свет, «нарисованная» текстура кожи и ткани, лёгкая пикселизация.
Проекция как в игре: клетка 1 м = 64×32 px, 31 px на метр высоты; K = 2 — размер кадров на листах (charScale 2).
   python3 tools/char3d/render.py out.png              # превью: 8 направлений + крупно
   python3 tools/char3d/render.py out.png beard        # один персонаж (beard, woman, bald, glasses)
"""
import math, sys
import numpy as np
from PIL import Image

SS = 3                                   # суперсэмплинг
def nrm(v): v = np.asarray(v, float); return v / np.linalg.norm(v)
LIGHT = nrm((.25, .6, 1.0))              # как у мебели: сверху, «южная» грань светлее
VIEW = nrm((1, 1, 32 / 31))

# ---------- примитивы (p — массив (N,3) в локальных метрах персонажа: x — вперёд, y — влево, z — вверх) ----------
def ell(c, r):
    c, r = np.array(c, float), np.array(r, float)
    def f(p):
        q = (p - c) / r; k0 = np.linalg.norm(q, axis=-1); k1 = np.linalg.norm(q / r, axis=-1)
        return k0 * (k0 - 1) / np.maximum(k1, 1e-9)
    return f, (c - r, c + r)
def cone(a, b, ra, rb):
    """скруглённый конус: капсула с разными радиусами на концах (руки, ноги)"""
    a, b = np.array(a, float), np.array(b, float); ba = b - a; L2 = ba @ ba
    def f(p):
        pa = p - a; t = np.clip((pa @ ba) / L2, 0, 1)
        return np.linalg.norm(pa - t[:, None] * ba, axis=-1) - (ra + (rb - ra) * t)
    r = max(ra, rb); return f, (np.minimum(a, b) - r, np.maximum(a, b) + r)
def profile(knots, smooth=4):
    """профиль толщины вдоль конечности: [(u, r), ...], u от 0 до 1; сглажен, чтобы не было изломов в свете"""
    u = np.linspace(0, 1, 401); r = np.interp(u, *zip(*knots))
    if smooth:
        k = np.exp(-np.linspace(-2, 2, 4 * smooth + 1) ** 2); k /= k.sum()
        rp = np.pad(r, 2 * smooth, mode='edge'); r = np.convolve(rp, k, 'valid')
    return lambda t: np.interp(t, u, r)
def tube(points, R, k=.015):
    """гладкая конечность по ломаной (бедро-колено-щиколотка) с толщиной R(u): без шаров на суставах"""
    pts = np.array(points, float)
    for _ in range(3):                                 # Чайкин: изгиб в колене/локте плавный, без светлой полосы на сгибе
        q = [pts[0]]
        for i in range(len(pts) - 1): q += [.75 * pts[i] + .25 * pts[i + 1], .25 * pts[i] + .75 * pts[i + 1]]
        pts = np.array(q + [pts[-1]])
    seg = pts[1:] - pts[:-1]; ln = np.linalg.norm(seg, axis=-1)
    cum = np.concatenate([[0], np.cumsum(ln)]); tot = cum[-1]
    def f(p):
        d = None
        for i in range(len(seg)):
            pa = p - pts[i]; t = np.clip((pa @ seg[i]) / (ln[i] ** 2), 0, 1)
            di = np.linalg.norm(pa - t[:, None] * seg[i], axis=-1) - R((cum[i] + t * ln[i]) / tot)
            d = di if d is None else np.minimum(d, di)   # кривая гладкая, толщина на стыках совпадает: мягкое слияние не нужно
        return d
    rm = R(np.linspace(0, 1, 50)).max()
    return f, (pts.min(0) - rm, pts.max(0) + rm)
def rbox(c, h, r=0.0):
    c, h = np.array(c, float), np.array(h, float)
    def f(p):
        q = np.abs(p - c) - (h - r)
        return np.linalg.norm(np.maximum(q, 0), axis=-1) + np.minimum(q.max(-1), 0) - r
    return f, (c - h, c + h)
def inter(a, b):
    f, bb = a; g, _ = b
    return (lambda p: np.maximum(f(p), g(p))), bb
def minus(a, b):
    f, bb = a; g, _ = b
    return (lambda p: np.maximum(f(p), -g(p))), bb
def halfz(z0, up=True):
    return (lambda p: (z0 - p[:, 2]) if up else (p[:, 2] - z0)), None
def smin(a, b, k):
    h = np.clip(.5 + .5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)

# «нарисованные» пятна: сумма синусов, выглядит как мазки текстуры
def noise(p, f=14.0, s=0):
    x, y, z = p[:, 0] * f, p[:, 1] * f, p[:, 2] * f
    return (np.sin(x * 1.3 + s) * np.sin(y * 1.7 + 1.1 * s) * np.sin(z * 1.1 + 2.3)
            + .5 * np.sin(x * 2.9 + z * 1.7 + s) * np.sin(y * 3.1 - z * 2.3)
            + .25 * np.sin(x * 6.1 - y * 5.3 + s) * np.sin(z * 6.7 + y))

def hexc(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float) / 255

# ---------- модель человека ----------
class Model:
    def __init__(s): s.parts = []
    def add(s, shape, m, k=.018): s.parts.append((shape[0], shape[1], m, k)); return s

def human(o):
    """o — словарь внешности: пол, цвета, причёска, одежда"""
    fem = o.get('fem', False); m = Model()
    S = o.get('h', 1.78) / 1.78                     # общий масштаб роста
    def P(x, y, z): return (x * S, y * S, z * S)
    sh = .19 if fem else .215                       # полуширина плеч
    hip = .085 if fem else .09
    # ноги: одна гладкая трубка от таза до щиколотки, колени чуть согнуты
    fk = 1.06 if fem else 1.0
    LEG = profile([(0, .1 * fk), (.1, .094 * fk), (.28, .08), (.43, .062), (.5, .055), (.56, .057), (.64, .061),
                   (.74, .055), (.88, .04), (1, .035)])
    if o.get('bottom', 'shorts') == 'pants':            # брюки: ткань висит свободно, не повторяет колено и икру
        LEG = profile([(0, .102 * fk), (.15, .093 * fk), (.4, .074), (.6, .064), (.85, .058), (.97, .054), (1, .05)], 12)
    for sd in (1, -1):
        hipj, knee, ank = P(0, sd * hip, .93), P(.022, sd * (hip + .006), .5), P(-.012, sd * (hip + .016), .085)
        m.add(tube([hipj, knee, ank], lambda u, R=LEG: R(u) * S), 'legs', .03)
        if o.get('bottom', 'shorts') == 'shorts':        # штанина шорт: ткань чуть шире ноги, видна кромка
            t = (.93 - .6) / (.93 - .5); hem = tuple(np.array(hipj) + (np.array(knee) - np.array(hipj)) * t)
            m.add(tube([hipj, hem], lambda u, R=LEG: (R(u * t * .5) + .009) * S), 'shorts', .004)
        m.add(rbox(P(.045, sd * (hip + .022), .045), (.105 * S, .047 * S, .045 * S), .03 * S), 'shoe', .025)
    # таз и торс
    m.add(ell(P(0, 0, .93), (.115 * S, (.175 if fem else .16) * S, .12 * S)), 'pelvis', .05)
    m.add(ell(P(.005, 0, 1.11), (.11 * S, (.145 if fem else .165) * S, .17 * S)), 'belly', .08)
    m.add(ell(P(.0, 0, 1.31), (.125 * S, (.17 if fem else .2) * S, .16 * S)), 'chest', .09)
    if fem:
        for sd in (1, -1): m.add(ell(P(.085, sd * .068, 1.29), (.06 * S, .06 * S, .06 * S)), 'chest', .03)
    # трапеция: покатые плечи от шеи к плечу
    for sd in (1, -1): m.add(cone(P(-.03, sd * .03, 1.49), P(-.015, sd * (sh - .045), 1.415), .05 * S, .046 * S), 'trap', .05)
    # руки: одна трубка плечо-локоть-запястье, локоть чуть согнут, кисть слита с предплечьем
    fa = .88 if fem else 1.0
    ARM = profile([(0, .064), (.12, .059), (.3, .051), (.44, .044), (.52, .041), (.6, .044), (.7, .042),
                   (.9, .03), (1, .027)], 8)
    for sd in (1, -1):
        s0, el, wr = P(-.012, sd * (sh - .012), 1.40), P(-.038, sd * (sh + .03), 1.125), P(.012, sd * (sh + .04), .87)
        m.add(tube([s0, el, wr], lambda u, R=ARM: R(u) * fa * S), 'arm', .05)
        hand = ell(P(.02, sd * (sh + .043), .8), (.034 * S, .024 * S, .066 * S))
        m.add(hand, 'hand', .03)
        m.add(ell(P(.045, sd * (sh + .028), .83), (.014 * S, .014 * S, .03 * S)), 'hand', .015)   # большой палец
    # шея и голова
    m.add(cone(P(-.005, 0, 1.43), P(.0, 0, 1.56), .052 * S, .047 * S), 'neck', .03)
    hz = 1.665
    HS = 1.1                                       # голова чуть крупнее, как у Zomboid
    m0 = len(m.parts)
    m.add(ell(P(.0, 0, hz), (.098 * S, .082 * S, .112 * S)), 'head', .03)
    m.add(ell(P(.04, 0, hz - .07), (.06 * S, .062 * S, .05 * S)), 'head', .03)        # челюсть
    m.add(ell(P(.098, 0, hz - .005), (.022 * S, .014 * S, .03 * S)), 'nose', .012)
    for sd in (1, -1): m.add(ell(P(-.005, sd * .083, hz - .005), (.018 * S, .012 * S, .028 * S)), 'head', .01)
    hs = o.get('hair', 'short')
    if hs != 'bald':
        cap = ell(P(-.012, 0, hz + .012), (.106 * S, .09 * S, .118 * S))
        if hs == 'short':
            cap = inter(cap, (lambda p: np.maximum(hz - .005 * S - p[:, 2] - np.clip(-p[:, 0] - .03 * S, 0, .05 * S) * .55,
                                                   p[:, 0] - (.085 - (p[:, 2] - hz) * .2) * S), None))
            m.add(cap, 'hair', .01)
        elif hs == 'long':
            hair = inter(cap, (lambda p: hz + .045 * S - p[:, 2] - np.maximum(-p[:, 0] + .03 * S, 0) * 6, None))
            m.add(hair, 'hair', .01)
            back = ell(P(-.045, 0, hz - .12), (.075 * S, .115 * S, .2 * S))
            m.add(minus(back, ell(P(.05, 0, hz - .1), (.09 * S, .08 * S, .16 * S))), 'hair', .02)
        elif hs == 'bob':
            hair = inter(cap, (lambda p: hz + .035 * S - p[:, 2] - np.maximum(-p[:, 0] + .04 * S, 0) * 5, None))
            m.add(hair, 'hair', .01)
            back = ell(P(-.02, 0, hz - .03), (.1 * S, .1 * S, .12 * S))
            m.add(minus(back, ell(P(.07, 0, hz - .03), (.08 * S, .075 * S, .16 * S))), 'hair', .02)
        elif hs == 'side':                      # лысина с венчиком по бокам
            ring = minus(ell(P(-.015, 0, hz), (.104 * S, .088 * S, .1 * S)), halfz(hz + .03 * S, False))
            m.add(minus(ring, ell(P(.06, 0, hz), (.07 * S, .1 * S, .1 * S))), 'hair', .01)
    if o.get('beard'):
        b = ell(P(.045, 0, hz - .075), (.064 * S, .068 * S, .058 * S))
        b = minus(b, ell(P(.095, 0, hz - .045), (.03 * S, .045 * S, .02 * S)))   # рот
        m.add(b, 'beard', .015)
    if o.get('mustache'):
        m.add(ell(P(.095, 0, hz - .042), (.014 * S, .045 * S, .012 * S)), 'beard', .01)
    if o.get('glasses'):
        for sd in (1, -1): m.add(rbox(P(.096, sd * .035, hz + .012), (.006 * S, .026 * S, .014 * S), .004 * S), 'glass', .0)
        m.add(rbox(P(.09, 0, hz + .016), (.004 * S, .012 * S, .003 * S)), 'glass', .0)
    for i in range(m0, len(m.parts)):              # масштаб головы вокруг основания шеи
        f, bb, nm, k = m.parts[i]
        piv = np.array([0, 0, 1.56 * S])
        m.parts[i] = ((lambda f: lambda p: f((p - piv) / HS + piv) * HS)(f), bb, nm, k * HS)
    if o.get('belt'):
        m.add(minus(ell(P(.004, 0, .99), (.11 * S, (.163 if fem else .152) * S, .02 * S)), ell(P(0, 0, .99), (.06, .06, .06))), 'belt', .006)
    return m

# ---------- материалы: какая часть тела в какой цвет при данной одежде ----------
def materials(o, part, p, S):
    """возвращает имя материала для каждой точки части"""
    top, bottom = o.get('top', 'tank'), o.get('bottom', 'shorts')
    if part in ('head', 'hair', 'beard', 'glass', 'nose'):
        piv = np.array([0, 0, 1.56 * S]); p = (p - piv) / 1.1 + piv     # голова отмасштабирована в human()
    z, x, y = p[:, 2] / S, p[:, 0] / S, p[:, 1] / S
    n = len(p); out = np.full(n, 'skin', dtype=object)
    if part == 'legs':
        if bottom == 'shorts': out[z > .6] = 'pants'
        if bottom == 'pants': out[:] = 'pants'; out[z < .1] = 'skin'
    elif part == 'shorts':
        out[:] = 'pants'
    elif part == 'shoe':
        out[:] = 'shoe'; out[z < .018] = 'sole'
    elif part == 'pelvis':
        out[:] = 'pants'
    elif part in ('belly', 'chest', 'trap'):
        out[:] = 'shirt'
        if top == 'tank':
            neck = (z > 1.40) & (x > -.02) & (np.abs(y) < .085 + (z - 1.4) * .4)
            out[neck] = 'skin'
            out[(np.abs(y) > .145) & (z > 1.33)] = 'skin'
        if top == 'tee':
            out[(z > 1.425) & (np.abs(y) < .07) & (x > 0)] = 'skin'
    elif part == 'delt':
        out[:] = 'skin' if top == 'tank' else 'shirt'
    elif part == 'arm':
        if top == 'tee': out[z > 1.24] = 'shirt'
    elif part in ('hair', 'beard', 'glass', 'belt', 'nose'):
        out[:] = {'nose': 'skin'}.get(part, part)
    elif part == 'head':
        hz = 1.665
        front = x > .07
        eye = front & (np.abs(np.abs(y) - .036) < .016) & (np.abs(z - (hz + .012)) < .008)
        brow = front & (np.abs(np.abs(y) - .037) < .022) & (np.abs(z - (hz + .034)) < .006)
        out[eye] = 'eye'; out[brow] = 'brow'
        if not o.get('beard'):
            mouth = front & (np.abs(y) < .022) & (np.abs(z - (hz - .05)) < .004)
            out[mouth] = 'lip'
        if o.get('stubble'):
            out[(x > -.02) & (z < hz - .03) & ~(np.abs(y) < .022) ] = 'stubble'
    return out

def palette(o):
    skin = hexc(o.get('skin', '#e8b07a'))
    return {
        'skin': (skin, .04, .55, 'skin'), 'stubble': (skin * .78, .02, .7, 'skin'),
        'hair': (hexc(o.get('hairc', '#6a3a1e')), .12, .4, 'hair'), 'beard': (hexc(o.get('hairc', '#6a3a1e')) * .8, .05, .6, 'hair'),
        'brow': (hexc(o.get('hairc', '#6a3a1e')) * .55, 0, .8, None), 'eye': (hexc('#2a1c16'), 0, .8, None),
        'lip': (skin * np.array([.82, .58, .52]), 0, .8, None),
        'shirt': (hexc(o.get('shirt', '#8fa6c6')), .03, .8, 'cloth'), 'pants': (hexc(o.get('pants', '#55575c')), .03, .8, 'cloth'),
        'shoe': (hexc('#2a2a2c'), .15, .4, None), 'sole': (hexc('#1a1a1a'), 0, .8, None),
        'belt': (hexc('#202022'), .3, .3, 'belt'), 'glass': (hexc('#141414'), .4, .2, None),
    }

# ---------- рендер одного кадра ----------
def render(o, face, K=2):
    """face — направление взгляда в мире (радианы, 0 = +x мира, как dirOf в игре); K — пикселей на «игровой пиксель»"""
    HX, HY, ZP = 32 * K, 16 * K, 31 * K
    m = human(o); S = o.get('h', 1.78) / 1.78; pal = palette(o)
    ca, sa = math.cos(face), math.sin(face)
    def loc(p):                                    # мир -> локальные координаты персонажа
        return np.stack([p[:, 0] * ca + p[:, 1] * sa, -p[:, 0] * sa + p[:, 1] * ca, p[:, 2]], -1)
    def scene(p, parts=False):
        q = loc(p); d = None; raw = []
        for f, _, _, k in m.parts:
            di = f(q); raw.append(di)
            d = di if d is None else smin(d, di, max(k, 1e-4) * S)
        return (d, np.stack(raw, 0)) if parts else d
    R = .45 * S; Ht = 1.95 * S
    corners = np.array([[x, y, z] for x in (-R, R) for y in (-R, R) for z in (0, Ht)])
    sx = (corners[:, 0] - corners[:, 1]) * HX; sy = (corners[:, 0] + corners[:, 1]) * HY - corners[:, 2] * ZP
    x0, x1 = math.floor(sx.min()) - 2, math.ceil(sx.max()) + 2
    y0, y1 = math.floor(sy.min()) - 2, math.ceil(sy.max()) + 2
    W, H = (x1 - x0) * SS, (y1 - y0) * SS
    gx, gy = np.meshgrid((np.arange(W) + .5) / SS + x0, (np.arange(H) + .5) / SS + y0)
    a, b = gx / HX, gy / HY
    base = np.stack([(b + a) / 2, (b - a) / 2, np.zeros_like(a)], -1).reshape(-1, 3)
    d = np.array([1, 1, 32 / 31]); d /= np.linalg.norm(d)
    T0 = (Ht + .2) / d[2]
    O = base + d * T0; Rd = -d
    # лучи, которые хотя бы проходят мимо цилиндра персонажа
    t = np.zeros(len(O)); hit = np.zeros(len(O), bool); alive = np.ones(len(O), bool)
    for _ in range(160):
        idx = np.nonzero(alive)[0]
        if not len(idx): break
        dist = scene(O[idx] + Rd * t[idx, None])
        h = dist < 3e-4; hit[idx[h]] = True; alive[idx[h]] = False
        t[idx] += np.maximum(dist, 1.5e-4) * .9
        far = t[idx] > T0 + .02; alive[idx[far]] = False
    img = np.zeros((len(O), 4))
    hi = np.nonzero(hit)[0]; pts = O[hi] + Rd * t[hi, None]
    e = 5e-4; n = np.zeros_like(pts)
    for k in range(3):
        dv = np.zeros(3); dv[k] = e; n[:, k] = scene(pts + dv) - scene(pts - dv)
    n /= np.maximum(np.linalg.norm(n, axis=-1, keepdims=True), 1e-9)
    _, raw = scene(pts, True); pid = raw.argmin(0)
    ql = loc(pts)
    names = np.empty(len(pts), dtype=object)
    for i, (_, _, part, _) in enumerate(m.parts):
        sel = pid == i
        if sel.any(): names[sel] = materials(o, part, ql[sel], S)
    # свет
    ao = np.ones(len(pts))
    for k, hk in enumerate((.01, .025, .05, .09)):
        ao -= (hk - np.minimum(scene(pts + n * hk), hk)) * (1.5 / (k + 1)) * 1.6
    ao = np.clip(ao, .35, 1)
    sh = .45 + .55 * soft_shadow(scene, pts + n * 2e-3, LIGHT)     # тени от тела мягкие, дальняя рука не тонет в черноте
    dif = np.clip(n @ LIGHT, 0, 1) * sh
    sky = .5 + .5 * n[:, 2]
    rim = np.clip(1 - n @ VIEW, 0, 1) ** 3
    lum = .26 * ao * (.55 + .45 * sky) + .86 * dif * (.6 + .4 * ao)
    rgb = np.zeros((len(pts), 3))
    hv = nrm(LIGHT + VIEW)
    for nm, (col, spec, rough, tex) in pal.items():
        sel = names == nm
        if not sel.any(): continue
        c = np.broadcast_to(col, (sel.sum(), 3)).copy(); L = lum[sel]
        if tex == 'skin':
            nz = noise(ql[sel] / S, 9, 1.7)
            c *= (1 - .05 * np.clip(nz, -1, 1))[:, None]
            # тени тёплые, рыжевато-красные, как у Zomboid
            warm = np.clip(1 - L, 0, 1)[:, None]
            c = c * (1 - warm * .6) + c * np.array([1.0, .55, .36]) * warm * .6
        elif tex == 'cloth':
            nz = noise(ql[sel] / S, 12, 3.1)
            c *= (1 - .035 * np.clip(nz, -1, 1))[:, None]
        elif tex == 'hair':
            q = ql[sel] / S
            st = np.sin(q[:, 1] * 160 + np.sin(q[:, 2] * 40) * 2) * .5 + np.sin(q[:, 2] * 90 + q[:, 0] * 50) * .3
            c *= (1 + .1 * st)[:, None]
        sp = np.clip(n[sel] @ hv, 0, 1) ** (2 / max(rough, .05) ** 2 * .5 + 2) * spec
        out = c * L[:, None] + sp[:, None] * sh[sel, None] * .7
        rgb[sel] = out
    rgb = np.clip(rgb, 0, 1) ** (1 / 1.1)
    img[hi, :3] = rgb; img[hi, 3] = 1
    # тень на полу: мягкое пятно под ногами
    mi = np.nonzero(~hit)[0]; fp = base[mi]
    rr = np.hypot(fp[:, 0], fp[:, 1]) / (.3 * S)
    sel = rr < 1.0
    img[mi[sel], :3] = .05; img[mi[sel], 3] = np.clip((1 - rr[sel]) * 1.6, 0, .42)
    im = (img.reshape(H, W, 4) * 255).astype(np.uint8)
    pm = im.astype(float); pm[..., :3] *= pm[..., 3:4] / 255
    small = Image.fromarray(pm.astype(np.uint8), 'RGBA').resize((W // SS, H // SS), Image.BOX)
    sa_ = np.array(small).astype(float); al = sa_[..., 3:4] / 255
    sa_[..., :3] = np.where(al > 0, sa_[..., :3] / np.maximum(al, 1e-6), 0)
    res = Image.fromarray(np.clip(sa_, 0, 255).astype(np.uint8), 'RGBA')
    return res, (-x0, -y0)

def soft_shadow(scene, p, L, k=12):
    res = np.ones(len(p)); t = np.full(len(p), .008)
    for _ in range(40):
        d = scene(p + L * t[:, None])
        res = np.minimum(res, k * d / t); t += np.clip(d, .006, .15)
        if (t > 2).all(): break
    return np.clip(res, 0, 1) ** 1.1

def finish(im, outline=.45, levels=None):
    """«чуть пиксельнее»: жёсткий край силуэта и лёгкий тёмный контур снаружи"""
    a = np.array(im).astype(float); al = a[..., 3]
    body = al > 200
    shadow = (~body) & (al > 0) & (a[..., :3].max(-1) < 40)
    edge_soft = (~body) & ~shadow & (al > 90)                 # полупрозрачная кромка -> в тело
    body |= edge_soft
    out = np.zeros_like(a)
    out[body, :3] = a[body, :3]; out[body, 3] = 255
    out[shadow, :3] = 12; out[shadow, 3] = np.round(al[shadow] / 255 / .14) * .14 * 255
    if outline:
        Hh, Ww = body.shape; edge = np.zeros_like(body); src = np.zeros((Hh, Ww, 3))
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nb = np.zeros_like(body); ns = np.zeros((Hh, Ww, 3))
            ys, yd = (slice(0, Hh - dy), slice(dy, Hh)) if dy >= 0 else (slice(-dy, Hh), slice(0, Hh + dy))
            xs, xd = (slice(0, Ww - dx), slice(dx, Ww)) if dx >= 0 else (slice(-dx, Ww), slice(0, Ww + dx))
            nb[yd, xd] = body[ys, xs]; ns[yd, xd] = out[ys, xs, :3]
            new = nb & ~body & ~edge; src[new] = ns[new]; edge |= new
        out[edge, :3] = src[edge] * .35 + 6; out[edge, 3] = 255 * outline
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')

# ---------- готовые выжившие (как на референсе) ----------
LOOKS = {
    'beard':   dict(hair='short', hairc='#7a4424', beard=True, skin='#eab47c', top='tank', shirt='#93a9c9', bottom='shorts', pants='#5a5c62'),
    'bald':    dict(hair='side', hairc='#6e6458', mustache=True, skin='#e9b582', top='tank', shirt='#93a9c9', bottom='shorts', pants='#5a5c62', h=1.76),
    'woman':   dict(fem=True, hair='long', hairc='#6e2c18', skin='#ecb688', top='tank', shirt='#d6d4d2', bottom='pants', pants='#6a6a6c', belt=True, h=1.68),
    'glasses': dict(fem=True, hair='bob', hairc='#b88a4a', glasses=True, skin='#eab88a', top='tee', shirt='#6c6c70', bottom='pants', pants='#5e5e62', belt=True, h=1.70),
}

def preview(out, who=None):
    K = 2
    looks = [who] if who else list(LOOKS)
    # 1) группа крупно, как на референсе: смотрят в камеру (направление 1 = вниз по экрану)
    group = [finish(render(LOOKS[w], math.pi / 4 + .25 * ((i % 2) * 2 - 1), K)[0]) for i, w in enumerate(looks)]
    Z = 2; pad = 16
    gw = sum(g.width * Z for g in group) - (len(group) - 1) * 40 + 2 * pad
    gh = max(g.height for g in group) * Z + 2 * pad
    # 2) лента 8 направлений первого персонажа в игровом размере (×1 к листу) и ×2
    dirs = [finish(render(LOOKS[looks[0]], k * math.pi / 4, K)[0]) for k in range(8)]
    dw = sum(d.width for d in dirs) * 2 + 9 * 8
    W = max(gw, dw) + 2 * pad; H = gh + max(d.height for d in dirs) * 2 + 3 * pad + 20
    bg = Image.new('RGBA', (W, H), (58, 58, 58, 255))
    x = pad
    order = sorted(range(len(group)), key=lambda i: (i % 2 == 0, i))      # задний ряд сначала
    xs = []
    for g in group: xs.append(x); x += g.width * Z - 40
    for i in order:
        g = group[i].resize((group[i].width * Z, group[i].height * Z), Image.NEAREST)
        bg.alpha_composite(g, (xs[i], pad + (0 if i % 2 else 24) + gh - 2 * pad - g.height - 24))
    y = gh + pad; x = pad
    for dimg in dirs:
        big = dimg.resize((dimg.width * 2, dimg.height * 2), Image.NEAREST)
        bg.alpha_composite(big, (x, y)); x += big.width + 8
    bg.save(out); print(out, bg.size)

if __name__ == '__main__':
    preview(sys.argv[1] if len(sys.argv) > 1 else 'char3d.png', sys.argv[2] if len(sys.argv) > 2 else None)
