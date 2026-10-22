#!/usr/bin/env python3
"""Мебель «Карантина» как маленькие 3D-модели: скруглённые объёмы (SDF), рейтрейсинг на numpy,
мягкий свет, тени и AO, сглаживание суперсэмплингом. Проекция как в игре: клетка 1 м = 64×32 px, 31 px на метр высоты.
   python3 tools/furn3d/render.py out.png            # лист-превью
"""
import math, sys
import numpy as np
from PIL import Image, ImageFilter

HX, HY, ZP = 32, 16, 31          # px на метр: полклетки по x, по y, высота
SS = 3                           # суперсэмплинг

def nrm(v): v = np.asarray(v, float); return v / np.linalg.norm(v)
LIGHT = nrm((.25, .6, 1.0))      # к свету: сверху, чуть с «южной» стороны, как раньше (+y грань светлее +x)
VIEW = nrm((1, 1, 32 / 31))      # к зрителю

# ---------- примитивы: возвращают расстояние, p — массив (...,3) в метрах ----------
def rbox(c, h, r=0.0):
    c, h = np.array(c, float), np.array(h, float)
    def f(p):
        q = np.abs(p - c) - (h - r)
        return np.linalg.norm(np.maximum(q, 0), axis=-1) + np.minimum(q.max(-1), 0) - r
    return f, (c - h, c + h)
def cylz(cx, cy, r, z0, z1, rr=0.0):
    zc, hz = (z0 + z1) / 2, (z1 - z0) / 2
    def f(p):
        d = np.stack([np.hypot(p[..., 0] - cx, p[..., 1] - cy) - (r - rr), np.abs(p[..., 2] - zc) - (hz - rr)], -1)
        return np.linalg.norm(np.maximum(d, 0), axis=-1) + np.minimum(d.max(-1), 0) - rr
    return f, (np.array([cx - r, cy - r, z0]), np.array([cx + r, cy + r, z1]))
def capsule(a, b, r):
    a, b = np.array(a, float), np.array(b, float); ba = b - a
    def f(p):
        pa = p - a; t = np.clip((pa @ ba) / (ba @ ba), 0, 1)
        return np.linalg.norm(pa - t[..., None] * ba, axis=-1) - r
    return f, (np.minimum(a, b) - r, np.maximum(a, b) + r)
def cut(shape, hole):
    """объём минус другой объём (ниша в ванне, мойке)"""
    f, bb = shape; g, _ = hole
    return (lambda p: np.maximum(f(p), -g(p))), bb

# ---------- материалы: цвет, блеск, рисунок ----------
def wood_pat(axis, k=.06):
    """волокна вдоль оси axis (0 — x, 1 — y, 2 — z): полосы меняются поперёк, слегка волнятся вдоль"""
    def f(p):
        a = p[..., axis]; o = p[..., (axis + 1) % 3] + p[..., (axis + 2) % 3]
        w = np.sin(a * 5.3) * .012 + np.sin(a * 13.1 + o * 3) * .004
        return 1 + k * (.6 * np.sin((o + w) * 95) + .4 * np.sin((o + w * 1.7) * 41 + 1.3))
    return f
MAT = {}
def mat(name, col, spec=0.0, rough=.5, pat=None):
    MAT[name] = dict(col=np.array([int(col[i:i + 2], 16) for i in (1, 3, 5)], float) / 255, spec=spec, rough=rough, pat=pat,
                     kind='wood' if name.startswith('wood') else 'paint' if name.startswith(('enamel', 'paint')) else
                          'top' if name.startswith('top') else 'metal' if name in ('chrome', 'steel', 'metal', 'brass') else '')
mat('wood', '#8a5f3c', .05, .6, wood_pat(0)); mat('woody', '#8a5f3c', .05, .6, wood_pat(1)); mat('woodv', '#8a5f3c', .05, .6, wood_pat(2))
mat('woodd', '#5e3d26', .05, .6, wood_pat(0)); mat('wooddy', '#5e3d26', .05, .6, wood_pat(1))
mat('woodl', '#a8794c', .05, .6, wood_pat(2)); mat('woodlx', '#a8794c', .05, .6, wood_pat(0))
mat('enamel', '#e4e2da', .35, .25); mat('enamel2', '#cfccc2', .3, .3)
mat('chrome', '#b8bcc0', .6, .15); mat('dark', '#2a2c30', .2, .4); mat('rubber', '#3a3c40', .05, .8)
mat('sheet_r', '#8e3b34', 0, .9); mat('sheet_w', '#e8e4d8', 0, .9); mat('pillow', '#efebe0', 0, .9)
mat('blanket_b', '#3e5a7e', 0, .9); mat('mattress', '#d8d2c2', 0, .9)
mat('sofa', '#7a4a3c', .02, .85); mat('sofa_d', '#6a3e32', .02, .85)
mat('metal', '#7e848a', .3, .35); mat('brass', '#c8a050', .5, .25)
mat('book1', '#8a2e2a', 0, .7); mat('book2', '#2e4a7a', 0, .7); mat('book3', '#b08a3a', 0, .7); mat('book4', '#3a6a40', 0, .7)

class Model:
    def __init__(s): s.parts = []
    def add(s, shape, m): s.parts.append((shape[0], shape[1], m)); return s

# ---------- рендер ----------
def render(model, cells=(1, 1)):
    los = np.min([b[0] for _, b, _ in model.parts], 0); his = np.max([b[1] for _, b, _ in model.parts], 0)
    los = np.minimum(los, [0, 0, 0]); his = np.maximum(his, [cells[0], cells[1], 0])
    corners = np.array([[x, y, z] for x in (los[0], his[0]) for y in (los[1], his[1]) for z in (los[2], his[2])])
    sx = (corners[:, 0] - corners[:, 1]) * HX; sy = (corners[:, 0] + corners[:, 1]) * HY - corners[:, 2] * ZP
    pad = 6
    x0, x1 = math.floor(sx.min()) - pad, math.ceil(sx.max()) + pad
    y0, y1 = math.floor(sy.min()) - pad, math.ceil(sy.max()) + pad + 8
    W, H = (x1 - x0) * SS, (y1 - y0) * SS
    gx, gy = np.meshgrid((np.arange(W) + .5) / SS + x0, (np.arange(H) + .5) / SS + y0)
    # точка на полу z=0 под пикселем, затем отходим к зрителю
    a, b = gx / HX, gy / HY
    base = np.stack([(b + a) / 2, (b - a) / 2, np.zeros_like(a)], -1)
    d = np.array([1, 1, 32 / 31]); d = d / np.linalg.norm(d)
    T0 = (his[2] + .3) / d[2] + 2.0
    o = base + d * T0; rd = -d
    def scene(p):
        ds = np.stack([f(p) for f, _, _ in model.parts], 0)
        return ds.min(0), ds.argmin(0)
    P = o.reshape(-1, 3); R = np.broadcast_to(rd, P.shape)
    t = np.zeros(len(P)); hit = np.zeros(len(P), bool); alive = np.ones(len(P), bool)
    tmax = T0 + 0.05
    for _ in range(140):
        idx = np.nonzero(alive)[0]
        if not len(idx): break
        dist, _ = scene(P[idx] + R[idx] * t[idx, None])
        h = dist < 4e-4; hit[idx[h]] = True; alive[idx[h]] = False
        t[idx] += np.maximum(dist, 2e-4) * .9
        far = t[idx] > tmax; alive[idx[far]] = False
    # пол: тень от мебели на пол (для пикселей без попадания)
    img = np.zeros((len(P), 4))
    hi = np.nonzero(hit)[0]; pts = P[hi] + R[hi] * t[hi, None]
    e = 6e-4
    def grad(p):
        g = np.zeros_like(p)
        for k in range(3):
            dv = np.zeros(3); dv[k] = e
            g[:, k] = scene(p + dv)[0] - scene(p - dv)[0]
        return g / np.maximum(np.linalg.norm(g, axis=-1, keepdims=True), 1e-9)
    n = grad(pts); _, mid = scene(pts)
    # AO
    ao = np.ones(len(pts))
    for k, hk in enumerate((.015, .04, .08, .14, .22)):
        ao -= (hk - np.minimum(scene(pts + n * hk)[0], hk)) * (1.6 / (k + 1)) * 1.4
    ao = np.clip(ao, .25, 1)
    # контакт с полом
    ao *= np.clip(.55 + pts[:, 2] / .12 * .45, .55, 1) ** .7
    sh = soft_shadow(scene, pts + n * 2e-3, LIGHT)
    sh_floor = None
    col = np.zeros((len(pts), 3)); spec = np.zeros(len(pts))
    for i, (_, _, m) in enumerate(model.parts):
        sel = mid == i
        if not sel.any(): continue
        M = MAT[m]; c = np.broadcast_to(M['col'], (sel.sum(), 3)).copy()
        if M['pat'] is not None: c *= M['pat'](pts[sel])[:, None]
        col[sel] = c
        hv = LIGHT + VIEW; hv = hv / np.linalg.norm(hv)
        sp = np.clip(n[sel] @ hv, 0, 1) ** (2 / max(M['rough'], .05) ** 2 * .5 + 2)
        spec[sel] = sp * M['spec']
    if WEAR: col = wear(col, pts, n, ao, mid, model)
    dif = np.clip(n @ LIGHT, 0, 1) * sh
    sky = .5 + .5 * n[:, 2]
    lum = .30 * ao * (.55 + .45 * sky) + .78 * dif * (.6 + .4 * ao)
    rgb = col * lum[:, None] + spec[:, None] * sh[:, None] * .8
    rgb = rgb ** (1 / 1.12)                    # чуть мягче контраст
    img[hi, :3] = np.clip(rgb, 0, 1); img[hi, 3] = 1
    # тень на полу
    mi = np.nonzero(~hit)[0]; fp = base.reshape(-1, 3)[mi]
    inside = (fp[:, 0] > los[0] - 1.2) & (fp[:, 0] < his[0] + .3) & (fp[:, 1] > los[1] - 1.2) & (fp[:, 1] < his[1] + .3)
    mi, fp = mi[inside], fp[inside]
    if len(fp):
        s = soft_shadow(scene, fp + np.array([0, 0, 3e-3]), LIGHT, k=6)
        aof = np.ones(len(fp))
        for k, hk in enumerate((.04, .1, .2)): aof -= (hk - np.minimum(scene(fp + np.array([0, 0, hk]))[0], hk)) * (1.2 / (k + 1)) * 2
        occ = np.clip(1 - np.minimum(s, np.clip(aof, 0, 1)), 0, 1) * .55
        img[mi, 3] = occ; img[mi, :3] = .06
    im = (img.reshape(H, W, 4) * 255).astype(np.uint8)
    out = Image.fromarray(im, 'RGBA')
    # уменьшение с учётом альфы
    pm = np.array(out).astype(float); pm[..., :3] *= pm[..., 3:4] / 255
    small = Image.fromarray(pm.astype(np.uint8), 'RGBA').resize((W // SS, H // SS), Image.BOX)
    sa = np.array(small).astype(float); al = sa[..., 3:4] / 255
    sa[..., :3] = np.where(al > 0, sa[..., :3] / np.maximum(al, 1e-6), 0)
    res = Image.fromarray(np.clip(sa, 0, 255).astype(np.uint8), 'RGBA')
    # якорь: экранная точка (0,0,0) мира
    return res, (-x0, -y0)

# ---------- потёртости: крупными пятнами и по рёбрам, без пиксельного зерна (оно мешало читать форму) ----------
WEAR = 0.0                       # 0 — как новая, 1 — обжитый заброшенный дом (game.py включает)
def _h3(i, s):
    h = (i[..., 0] * 374761393 + i[..., 1] * 668265263 + i[..., 2] * 1440662683 + s * 2147483647) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return ((h ^ (h >> 16)) & 0xffff) / 65535.0
def vnoise(p, f, s):
    """гладкий шум значений в 3D, f — частота (1/м)"""
    q = p * f; i = np.floor(q).astype(np.int64); t = q - i; t = t * t * (3 - 2 * t)
    acc = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (t[:, 0] if dx else 1 - t[:, 0]) * (t[:, 1] if dy else 1 - t[:, 1]) * (t[:, 2] if dz else 1 - t[:, 2])
                acc = acc + w * _h3(i + np.array([dx, dy, dz]), s)
    return acc
def _sm(x, a, b): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def wear(col, pts, n, ao, mid, model):
    g = WEAR; col = col.copy()
    kinds = np.array([MAT[m].get('kind', '') for _, _, m in model.parts])[mid]
    q = pts.copy()                                   # координаты модели: пятна не «переезжают» при повороте
    for i, (_, _, m) in enumerate(model.parts):
        xf = MAT[m].get('xf')
        if xf is not None:
            sel = mid == i
            if sel.any(): q[sel] = xf(pts[sel])
    edge = _sm(1 - np.abs(n).max(1), .04, .2)        # скруглённые рёбра у коробок
    patch = vnoise(q, 7, 1) * .65 + vnoise(q, 19, 2) * .35        # крупные пятна
    chip = _sm(patch, .4, .55) * edge                # где край затёрт
    low = 1 - _sm(q[:, 2], .0, .16)                  # пыль у пола
    crev = 1 - _sm(ao, .35, .75)                     # грязь в щелях и углах
    W_ = kinds == 'wood'; P_ = kinds == 'paint'; T_ = kinds == 'top'; M_ = kinds == 'metal'
    # дерево: светлые затёртые рёбра, тёмные пятна от воды, редкие светлые царапины
    pale = np.array([.78, .6, .4])
    col[W_] += (pale - col[W_]) * (chip[W_] * .7 * g)[:, None]
    fade = _sm(vnoise(q, 5, 9), .6, .85)                                              # выцветшие, затёртые места на фасадах
    col[W_] += (pale - col[W_]) * (fade[W_] * .09 * g)[:, None]
    stain = _sm(vnoise(q, 4, 3), .62, .75) * (np.abs(n[:, 2]) > .9)                 # пятна на крышках
    col[W_] *= (1 - stain[W_] * .15 * g)[:, None]
    sc = (np.abs(np.sin(q[:, 0] * 61 + q[:, 2] * 23 + vnoise(q, 3, 4) * 6)) > .985) & (vnoise(q, 6, 5) > .6)
    col[W_ & sc] = col[W_ & sc] * (1 - .25 * g) + pale * .25 * g
    # белая краска и эмаль: желтизна пятнами, сколы до тёмного металла по рёбрам, ржавые подтёки снизу
    yel = _sm(vnoise(q, 3, 6), .55, .85) * .4 + low * .6
    col[P_] *= (1 - np.array([0, .03, .09]) * (yel[P_] * g)[:, None])
    smudge = _sm(vnoise(q, 8, 10), .66, .76) * (np.abs(n[:, 2]) < .5)                 # серые разводы на дверцах
    col[P_] *= (1 - smudge[P_] * .06 * g)[:, None]
    chipP = _sm(patch, .5, .6) * edge
    col[P_] += (np.array([.32, .3, .28]) - col[P_]) * (chipP[P_] * .8 * g)[:, None]
    rust = _sm(vnoise(q, 9, 7) * .7 + low * .6, .7, .85) * (q[:, 2] < .35)
    col[P_] += (np.array([.5, .3, .18]) - col[P_]) * (rust[P_] * .6 * g)[:, None]
    # столешницы: тёмные круги и пятна, светлые потёртые кромки
    spot = _sm(vnoise(q, 11, 8), .66, .72) * (n[:, 2] > .9)
    col[T_] *= (1 - spot[T_] * .16 * g)[:, None]
    col[T_] += (np.array([.82, .8, .76]) - col[T_]) * (chip[T_] * .35 * g)[:, None]
    # металл: тусклые пятна
    col[M_] *= (1 - _sm(patch[M_], .55, .75) * .2 * g)[:, None]
    # везде: грязь в щелях и у пола
    dirt = np.clip(crev * .6 + low * .5, 0, 1) * g
    col += (np.array([.2, .16, .12]) - col) * (dirt * .45)[:, None]
    return np.clip(col, 0, 1)

def soft_shadow(scene, p, L, k=10):
    res = np.ones(len(p)); t = np.full(len(p), .01)
    for _ in range(48):
        d, _ = scene(p + L * t[:, None])
        res = np.minimum(res, k * d / t); t += np.clip(d, .01, .2)
        if (t > 3).all(): break
    return np.clip(res, 0, 1) ** 1.2

# ---------- модели (метры; клетка 1×1, x — вправо-вниз, y — влево-вниз, z — вверх) ----------
def fridge():
    m = Model(); W, D, Hh = .62, .66, 1.85; x0, y0 = .19, .1
    m.add(rbox((x0 + W / 2, y0 + D / 2, Hh / 2 + .03), (W / 2, D / 2, Hh / 2 - .03), .035), 'enamel')
    m.add(rbox((x0 + W / 2, y0 + D / 2, .03), (W / 2 - .02, D / 2 - .03, .03), .01), 'dark')
    fy = y0 + D
    m.add(rbox((x0 + W / 2, fy + .02, 1.36), (W / 2 - .005, .02, .47), .018), 'enamel')        # верхняя дверь (морозилка)
    m.add(rbox((x0 + W / 2, fy + .02, .5), (W / 2 - .005, .02, .37), .018), 'enamel')          # нижняя дверь
    m.add(rbox((x0 + W / 2, fy + .005, .88), (W / 2 - .01, .01, .012), .002), 'dark')          # щель между дверцами
    m.add(rbox((x0 + .06, fy + .06, 1.1), (.018, .02, .16), .012), 'chrome')                  # ручки
    m.add(rbox((x0 + .06, fy + .06, .68), (.018, .02, .14), .012), 'chrome')
    m.add(rbox((x0 + .38, fy + .016, 1.42), (.04, .006, .05), .004), 'book1')                  # магнит-записка
    m.add(rbox((x0 + .48, fy + .016, 1.5), (.045, .006, .06), .004), 'sheet_w')
    return m
def bed():
    m = Model(); W, L = 1.4, 2.0; x0, y0 = 0, 0
    m.add(rbox((W / 2, L / 2 + .02, .2), (W / 2, L / 2 - .02, .12), .03), 'woody')              # царга
    for x in (.04, W - .04):
        for y in (.06, L - .02): m.add(rbox((x, y, .06), (.04, .04, .07), .01), 'wooddy')
    m.add(rbox((W / 2, .04, .5), (W / 2 + .02, .04, .5), .03), 'wooddy')                       # изголовье
    m.add(rbox((W / 2, .04, .98), (W / 2 + .04, .055, .03), .02), 'woodd')
    m.add(rbox((W / 2, L - .01, .3), (W / 2 + .02, .03, .2), .025), 'wooddy')                  # изножье
    m.add(rbox((W / 2, L / 2 + .02, .4), (W / 2 - .04, L / 2 - .1, .1), .07), 'mattress')
    m.add(rbox((W / 2, L / 2 + .3, .43), (W / 2 - .02, L / 2 - .38, .1), .08), 'sheet_r')      # одеяло
    m.add(rbox((W / 2, .62, .51), (W / 2 - .03, .1, .025), .025), 'sheet_w')                   # отворот
    for x in (.36, W - .36): m.add(rbox((x, .3, .55), (.28, .16, .07), .07), 'pillow')
    return m
def sofa():
    m = Model(); W, D = 1.96, .88
    m.add(rbox((W / 2, D / 2 + .02, .24), (W / 2, D / 2 - .02, .17), .06), 'sofa_d')           # основание
    m.add(rbox((W / 2, .13, .58), (W / 2, .13, .28), .09), 'sofa_d')                         # спинка
    for x in (.11, W - .11): m.add(rbox((x, D / 2 + .02, .45), (.11, D / 2 - .02, .2), .09), 'sofa')   # подлокотники
    for k in range(3):
        cx = .22 + (k + .5) * (W - .44) / 3
        m.add(rbox((cx, .52, .45), ((W - .44) / 6 - .012, .34, .08), .07), 'sofa')            # сиденья
        m.add(rbox((cx, .3, .66), ((W - .44) / 6 - .015, .08, .2), .08), 'sofa')              # подушки спинки
    for x in (.08, W - .08):
        for y in (.1, D - .06): m.add(cylz(x, y, .025, 0, .08, .01), 'woodd')
    return m
def wardrobe():
    m = Model(); W, D, Hh = 1.0, .6, 2.0; x0, y0 = 0, .2
    m.add(rbox((W / 2, y0 + D / 2, Hh / 2 + .05), (W / 2, D / 2, Hh / 2 - .05), .015), 'woody')
    m.add(rbox((W / 2, y0 + D / 2, Hh + .015), (W / 2 + .03, D / 2 + .03, .025), .012), 'woodd')   # карниз
    m.add(rbox((W / 2, y0 + D / 2, .05), (W / 2 - .02, D / 2 - .03, .05), .01), 'woodd')       # цоколь
    fy = y0 + D
    for x in (.255, .745):
        m.add(rbox((x, fy + .006, 1.05), (.23, .01, .88), .012), 'woodv')                     # двери-рамки
        m.add(rbox((x, fy + .012, 1.05), (.17, .006, .8), .01), 'woodl')                     # филёнки
    for x in (.46, .54): m.add(capsule((x, fy + .03, .98), (x, fy + .03, 1.12), .012), 'brass')
    m.add(rbox((.3, y0 + .3, Hh + .1), (.18, .2, .07), .03), 'woodlx')                         # коробка на шкафу
    return m

def pixelize(im, colors=24, outline=True, shadow_levels=3):
    """пиксель-арт поверх рендера: жёсткий силуэт, ограниченная палитра (ступеньки света), тонкий тёмный контур"""
    a = np.array(im).astype(float); al = a[..., 3]
    obj = (al > 140) & (a[..., :3].max(-1) > 20)                     # сама мебель (не тень на полу)
    rgb = a[..., :3].copy()
    q = Image.fromarray(np.where(obj[..., None], rgb, 0).astype(np.uint8), 'RGB').quantize(colors + 1, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    qa = np.array(q).astype(float)
    out = np.zeros_like(a)
    out[obj, :3] = qa[obj]; out[obj, 3] = 255
    sh = (~obj) & (al > 8)                                           # тень на полу: несколько ровных ступеней
    lv = np.ceil(al[sh] / 255 / .55 * shadow_levels) / shadow_levels * .55 * 255
    out[sh, :3] = 15; out[sh, 3] = lv
    if outline:
        H, W = obj.shape; edge = np.zeros_like(obj); src = np.zeros((H, W, 3))
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nb = np.zeros_like(obj); ns = np.zeros((H, W, 3))
            ys, yd = (slice(0, H - dy), slice(dy, H)) if dy >= 0 else (slice(-dy, H), slice(0, H + dy))
            xs, xd = (slice(0, W - dx), slice(dx, W)) if dx >= 0 else (slice(-dx, W), slice(0, W + dx))
            nb[yd, xd] = obj[ys, xs]; ns[yd, xd] = out[ys, xs, :3]
            new = nb & ~obj & ~edge; src[new] = ns[new]; edge |= new
        out[edge, :3] = src[edge] * .3 + 8; out[edge, 3] = 255
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')

def sheet(out):
    items = [fridge(), bed(), sofa(), wardrobe()]
    raw = [render(it)[0] for it in items]
    mode = (sys.argv[2] if len(sys.argv) > 2 else 'smooth')
    def chunky(i, k=2, colors=14):
        w, h = i.width // k, i.height // k
        sm = pixelize(i.resize((w, h), Image.BOX), colors)
        return sm.resize((w * k, h * k), Image.NEAREST)
    MODES = {'pix1': lambda i: pixelize(i, 28), 'pix2': lambda i: pixelize(i, 14), 'pix3': lambda i: pixelize(i, 10),
             'pix4': lambda i: chunky(i, 2, 14)}
    ims = raw if mode == 'smooth' else [MODES[mode](i) for i in raw]
    K = 3; pad = 20
    W = sum(i.width * K + pad for i in ims) + pad; H = max(i.height for i in ims) * K + 2 * pad
    bg = Image.new('RGBA', (W, H), (48, 44, 40, 255)); x = pad
    for i in ims:
        big = i.resize((i.width * K, i.height * K), Image.NEAREST); bg.alpha_composite(big, (x, H - pad - big.height)); x += big.width + pad
    bg.save(out); print(bg.size)
if __name__ == '__main__':
    sheet(sys.argv[1] if len(sys.argv) > 1 else 'furn3d.png')
