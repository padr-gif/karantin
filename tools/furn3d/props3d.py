#!/usr/bin/env python3
"""Детальные (×3) деревья, кусты, машины, фонари, баки, почтовый ящик и костёр на 3D-основе render.py.
Кадры hd_<имя> с тем же якорем, что у старых пиксельных (точка мира под предметом), в лист props3.
   python3 tools/furn3d/props3d.py preview out.png      # превью
   python3 tools/furn3d/props3d.py                      # записать в игру
"""
import os, sys, json, math
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE)); sys.path.insert(0, HERE)
import render as F
from render import Model, rbox, cylz, capsule, cut, mat, MAT, vnoise
import game as G
K = 3

def sphere(c, r): return capsule(c, (c[0], c[1], c[2] + 1e-4), r)
def rough(shape, amp, fr, seed):
    """неровная поверхность (листва): расстояние + шум; шаг лучемёта .9 переносит небольшую амплитуду"""
    f, bb = shape; lo, hi = bb
    return (lambda p: (f(p) + amp * (vnoise(p, fr, seed) - .5) * 2) * .8), (np.asarray(lo) - amp, np.asarray(hi) + amp)
def tier(z0, h, r, seed, jag=8):
    """ярус ели: конус с зубчатым краем лап и неровной поверхностью"""
    def f(p):
        rad = np.hypot(p[..., 0], p[..., 1]); ang = np.arctan2(p[..., 1], p[..., 0])
        t = np.clip((p[..., 2] - z0) / h, 0, 1)
        edge = r * (1 - t) * (1 + .16 * np.abs(np.sin(ang * jag / 2 + seed)) - .08)       # зубцы лап
        d_side = (rad - edge) * .82; d_bot = z0 - p[..., 2] + (rad / r) * .12 - .02; d_top = p[..., 2] - (z0 + h)
        return (np.maximum(np.maximum(d_side, d_bot), d_top) + .025 * (vnoise(p, 14, seed) - .5)) * .7   # запас шага: без дыр
    return f, (np.array([-r * 1.2, -r * 1.2, z0 - .1]), np.array([r * 1.2, r * 1.2, z0 + h + .05]))
def cyl_axis(c, r, h, axis, rr=0.0):
    """цилиндр вдоль оси axis (0 — x, 1 — y): колёса"""
    c = np.array(c, float); o = [k for k in range(3) if k != axis]
    def f(p):
        q = p - c; d = np.stack([np.hypot(q[..., o[0]], q[..., o[1]]) - (r - rr), np.abs(q[..., axis]) - (h - rr)], -1)
        return np.linalg.norm(np.maximum(d, 0), axis=-1) + np.minimum(d.max(-1), 0) - rr
    lo = c - r; hi = c + r; lo[axis] = c[axis] - h; hi[axis] = c[axis] + h
    return f, (lo, hi)

# ---------- материалы ----------
def leafpat(scale=1.0, seed=1):
    def f(p):
        n1 = vnoise(p, 9 * scale, seed); n2 = vnoise(p, 26 * scale, seed + 1); n3 = vnoise(p, 60 * scale, seed + 2)
        return .62 + .38 * n1 + .35 * (n2 - .5) + .22 * (n3 - .5)
    return f
def barkpat(p):
    return .85 + .2 * np.abs(np.sin(np.arctan2(p[..., 1], p[..., 0]) * 9 + vnoise(p, 6, 7) * 3)) + .08 * (vnoise(p, 30, 8) - .5)
mat('leaf_a', '#3f6a30', .03, .8, leafpat(1, 1)); mat('leaf_b', '#4c7a34', .03, .8, leafpat(1.1, 4)); mat('leaf_c', '#36602c', .03, .8, leafpat(.9, 7))
mat('needle', '#2c4e30', .03, .8, leafpat(1.6, 11)); mat('bark', '#5e4632', .02, .9, barkpat); mat('bark2', '#4a3828', .02, .9, barkpat)
mat('berry', '#c23a4a', .3, .3); mat('bushleaf', '#3e6630', .03, .8, leafpat(1.4, 21))
mat('pole', '#33363a', .3, .4); mat('lampoff', '#9a9c98', .5, .2); mat('lampon', '#fff0b8', 0, .2); MAT['lampon']['emit'] = True
mat('mailbox', '#3c5a8c', .3, .35); mat('flag', '#c03028', .2, .4); mat('post', '#5a4634', .02, .8)
for k, c in enumerate(['#3e5a3c', '#55585c', '#40506a']): mat('bin%d' % k, c, .25, .4); mat('bin%dd' % k, c, .2, .5)
mat('stone', '#8a8680', .05, .8, lambda p: .85 + .25 * vnoise(p, 20, 31)); mat('ash', '#3a3430', 0, .9); mat('log', '#6a4e34', .02, .9, barkpat)
mat('ember', '#ff8a3a', 0, .5); MAT['ember']['emit'] = True
CARC = ['#80302a', '#344864', '#9c9c96', '#3e423c', '#b09a6e', '#5a6850']
for k, c in enumerate(CARC): mat('paint_car%d' % k, c, .45, .22)
mat('glass_car', '#2a3a48', .8, .06); mat('tyre', '#1c1c1e', .05, .8); mat('hub', '#a8acb0', .5, .25)
mat('chrome_car', '#b4b8bc', .6, .15); mat('trim', '#202224', .1, .6); mat('head', '#f0ecd8', .6, .1); mat('tail', '#a01e1a', .4, .2)
mat('plate', '#e8e4d0', .1, .5)

# ---------- модели (центр — точка мира, к которой привязан кадр) ----------
def crown(m, cx, cy, z0, z1, R, seed, mats=('leaf_a', 'leaf_b', 'leaf_c')):
    """крона: ядро и много клубков листвы по поверхности, у каждого неровный край — рваный силуэт как у PZ"""
    r = np.random.default_rng(seed); zc = (z0 + z1) / 2; H = (z1 - z0) / 2
    for _ in range(4):
        a = r.uniform(0, 2 * math.pi); d = r.uniform(0, R * .3)
        m.add(rough(sphere((cx + math.cos(a) * d, cy + math.sin(a) * d, zc + r.uniform(-H, H) * .25), R * r.uniform(.6, .72)), .05, 8, seed), mats[0])
    for i in range(70):
        u = r.uniform(-.85, 1); a = r.uniform(0, 2 * math.pi); s_ = math.sqrt(1 - u * u)
        k = r.uniform(.72, .92)
        p = (cx + R * k * s_ * math.cos(a), cy + R * k * s_ * math.sin(a), zc + H * k * u)
        m.add(rough(sphere(p, R * r.uniform(.17, .27)), .03, 12, seed + i), mats[1 + (i % 2)])
def tree(v):
    R, z0, z1 = [(1.15, 1.35, 3.35), (1.0, 1.45, 3.35), (.95, 1.2, 3.35)][v]
    c = Model(); crown(c, 0, 0, z0, z1, R, 10 + v)
    t = Model(); t.add(cylz(0, 0, .11, 0, z0 + .5, .03), 'bark')
    t.add(capsule((0, 0, z0 - .2), (.35, -.1, z0 + .35), .05), 'bark2'); t.add(capsule((0, 0, z0 - .4), (-.25, .2, z0 + .2), .045), 'bark2')
    t.add(cylz(0, 0, .16, 0, .08, .04), 'bark2')
    return c, t
def pine(v):
    c = Model()
    for k in range(6):
        z = .3 + k * .5; rad = 1.05 - k * .155
        c.add(tier(z, .8 - k * .04, rad, 30 + v * 7 + k, 9 + k % 3), 'needle')
    c.add(rough(capsule((0, 0, 3.1), (0, 0, 3.55), .05), .02, 20, 3), 'needle')
    t = Model(); t.add(cylz(0, 0, .09, 0, 1.0, .02), 'bark'); t.add(cylz(0, 0, .13, 0, .06, .03), 'bark2')
    return c, t
def bush(v):
    m = Model(); r = np.random.default_rng(50 + v); balls = []
    for i in range(16):
        a = r.uniform(0, 2 * math.pi); d = r.uniform(0, .3); c = (math.cos(a) * d, math.sin(a) * d, r.uniform(.22, .48)); rr = r.uniform(.17, .26)
        balls.append((c, rr)); m.add(rough(sphere(c, rr), .03, 18, 50 + i), 'bushleaf' if i % 3 else 'leaf_b')
    if v == 2:                                                                 # ягоды — на поверхности клубков, не в воздухе
        for i in range(12):
            (c, rr) = balls[r.integers(0, len(balls))]; d = np.array([r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(.1, 1)]); d /= np.linalg.norm(d)
            m.add(sphere(tuple(np.array(c) + d * (rr - .01)), .035), 'berry')
    return m
def lamp(axis, on):
    """фонарь у дороги: столб в точке, кронштейн тянется к дороге (+x или +y)"""
    m = Model(); ex = np.array([1.0, 0, 0]) if axis == 'x' else np.array([0, 1.0, 0]); H = 3.3
    m.add(cylz(0, 0, .065, 0, H, .02), 'pole'); m.add(cylz(0, 0, .12, 0, .25, .03), 'pole')
    tip = ex * .75 + np.array([0, 0, H + .1])
    m.add(capsule((0, 0, H - .05), tuple(tip), .03), 'pole')
    hc = tip - np.array([0, 0, .06]); hh = np.where(ex > 0, .2, .1); hh[2] = .05
    m.add(rbox(tuple(hc), tuple(hh), .03), 'pole')
    m.add(rbox(tuple(hc - np.array([0, 0, .05])), tuple(hh * np.array([.8, .8, .4])), .02), 'lampon' if on else 'lampoff')
    return m
def mailbox():
    m = Model(); m.add(rbox((0, 0, .5), (.035, .035, .5), .01), 'post')
    m.add(cut(rbox((0, 0, 1.12), (.22, .1, .12), .09), rbox((-.22, 0, 1.12), (.02, .08, .09), .06)), 'mailbox')
    m.add(rbox((.05, .11, 1.22), (.015, .01, .1), .004), 'flag'); m.add(rbox((.05, .11, 1.3), (.06, .01, .035), .004), 'flag')
    return m
def trashbin(v):
    m = Model(); a, b = 'bin%d' % v, 'bin%dd' % v
    m.add(cut(rbox((0, 0, .5), (.28, .3, .48), .03), rbox((0, 0, 1.0), (.25, .27, .1), .02)), a)
    m.add(rbox((0, 0, 1.0), (.3, .32, .03), .02), b)                          # крышка
    m.add(rbox((-.33, 0, .95), (.03, .2, .03), .01), b)                       # ручка
    for y in (-.2, .2): m.add(cyl_axis((-.28, y, .07), .07, .03, 1, .01), 'tyre')
    for k in range(3): m.add(rbox((.285, 0, .25 + k * .25), (.006, .25, .01), .003), b)
    return m
def campfire():
    m = Model()
    for k in range(9):
        a = k / 9 * 2 * math.pi; m.add(sphere((math.cos(a) * .32, math.sin(a) * .32, .05), .08), 'stone')
    m.add(cylz(0, 0, .28, 0, .02, .01), 'ash')
    for a in (0, 1.1, 2.2):
        d = np.array([math.cos(a), math.sin(a), 0]) * .25; m.add(capsule(tuple(-d + [0, 0, .04]), tuple(d + [0, 0, .12]), .04), 'log')
    for p in ((0, 0, .06), (.06, .04, .08), (-.05, -.03, .07)): m.add(sphere(p, .045), 'ember')
    return m
def car(ci, face):
    """легковушка 1,9 × 0,84 м: face — куда смотрит капот: 'px', 'nx', 'py', 'ny'"""
    ax = 0 if face[1] == 'x' else 1; sg = 1 if face[0] == 'p' else -1
    def P(a, b, z):                                                            # вдоль (a), поперёк (b), высота
        v = [0.0, 0.0, z]; v[ax] = a * sg; v[1 - ax] = b; return tuple(v)
    def Hx(ha, hb, hz):
        v = [0.0, 0.0, hz]; v[ax] = ha; v[1 - ax] = hb; return tuple(v)
    m = Model(); paint = 'paint_car%d' % ci
    m.add(rbox(P(0, 0, .42), Hx(.93, .41, .2), .1), paint)                   # кузов
    m.add(rbox(P(.62, 0, .6), Hx(.32, .39, .05), .05), paint)                # капот чуть выше крыльев
    cab = rbox(P(-.12, 0, .8), Hx(.48, .37, .2), .1)
    m.add(cab, 'glass_car')
    m.add(rbox(P(-.12, 0, .99), Hx(.4, .36, .03), .03), paint)               # крыша
    for a in (-.58, .3): m.add(rbox(P(a, 0, .8), Hx(.035, .375, .19), .01), paint)   # стойки
    m.add(rbox(P(-.14, 0, .8), Hx(.025, .376, .18), .01), paint)
    for a in (.92, -.92):                                                     # бамперы
        m.add(rbox(P(a, 0, .3), Hx(.04, .4, .05), .03), 'chrome_car' if a > 0 else 'trim')
    for b in (-.27, .27):
        m.add(rbox(P(.93, b, .44), Hx(.012, .08, .04), .015), 'head'); m.add(rbox(P(-.93, b, .44), Hx(.012, .08, .035), .012), 'tail')
    m.add(rbox(P(.935, 0, .44), Hx(.01, .14, .03), .008), 'trim')             # решётка
    m.add(rbox(P(-.935, 0, .34), Hx(.006, .1, .03), .004), 'plate')
    for a in (.6, -.6):
        for b in (-.37, .37):
            m.add(cyl_axis(P(a, b, .18), .18, .07, 1 - ax, .04), 'tyre'); m.add(cyl_axis(P(a, b * 1.05, .18), .09, .03, 1 - ax, .02), 'hub')
    for b in (-.43, .43): m.add(rbox(P(.25, b, .78), Hx(.04, .03, .03), .01), paint)   # зеркала
    for b in (-.415, .415):
        for a in (.12, -.4): m.add(rbox(P(a, b, .55), Hx(.06, .006, .01), .003), 'chrome_car')   # ручки дверей
    return m

# ---------- сборка кадров ----------
def jobs():
    out = []
    for v in range(3):
        out += [('tree_%d_c' % v, 'tree', v, 0), ('tree_%d_t' % v, 'tree', v, 1), ('bush_%d' % v, 'bush', v, 0), ('bin_%d' % v, 'bin', v, 0)]
    for v in range(2): out += [('pine_%d_c' % v, 'pine', v, 0), ('pine_%d_t' % v, 'pine', v, 1)]
    for a in 'xy':
        for on in (0, 1): out.append(('lamp_%s_%d' % (a, on), 'lamp', a, on))
    out += [('mail', 'mail', 0, 0), ('campfire', 'fire', 0, 0)]
    for ci in range(6):
        for f in ('px', 'py', 'nx', 'ny'): out.append(('car_%d_%s' % (ci, f), 'car', ci, f))
    return out
def model_of(kind, v, w):
    if kind == 'tree': return tree(v)[w]
    if kind == 'pine': return pine(v)[w]
    if kind == 'bush': return bush(v)
    if kind == 'bin': return trashbin(v)
    if kind == 'lamp': return lamp(v, w)
    if kind == 'mail': return mailbox()
    if kind == 'fire': return campfire()
    return car(v, w)
def render_one(job):
    name, kind, v, w = job
    F.HX, F.HY, F.ZP = 32 * K, 16 * K, 31 * K; F.SS = 2; F.FLOOR_SHADOW = False; F.WEAR = .5 if kind == 'car' else 0
    im, (ox, oy) = F.render(model_of(kind, v, w), cells=(0, 0))
    im = G.soft_outline(im, K) if kind not in ('tree', 'pine', 'bush') else im
    bb = im.getbbox()
    return name, im.crop(bb), (int(round(ox - bb[0])), int(round(oy - bb[1])))
def run(sel=None):
    import multiprocessing as mp
    js = [j for j in jobs() if not sel or any(j[0].startswith(s) for s in sel)]
    out = {}
    with mp.get_context('fork').Pool(2) as pool:
        for i, (k, im, a) in enumerate(pool.imap_unordered(render_one, js)):
            out[k] = (im, a); print('\r%d/%d %s' % (i + 1, len(js), k), end='', flush=True)
    print(); return out
if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'preview':
        res = run(sys.argv[3:] or None); ks = sorted(res)
        W = sum(res[k][0].width + 10 for k in ks); H = max(res[k][0].height for k in ks) + 20
        bg = Image.new('RGBA', (min(W, 6000), H), (60, 64, 58, 255)); x = 5
        for k in ks: im = res[k][0]; bg.alpha_composite(im, (x, H - 10 - im.height)); x += im.width + 10
        bg.save(sys.argv[2]); print(bg.size); sys.exit()
    res = run(sys.argv[1:] or None)
    ap = os.path.join(ROOT, 'assets/atlas.json'); meta = json.load(open(ap)); fr = meta['frames']
    sp = os.path.join(ROOT, 'assets/sprites/props3.png')
    if os.path.exists(sp):
        old = Image.open(sp).convert('RGBA')
        for k, f in fr.items():
            if f[0] == 'props3' and k[3:] not in res: res[k[3:]] = (old.crop((f[1], f[2], f[1] + f[3], f[2] + f[4])), (f[5], f[6]))
    W = 4096; order = sorted(res, key=lambda k: (-res[k][0].height, k)); x = y = rowh = 0; pos = {}
    for k in order:
        im = res[k][0]
        if x + im.width > W: x = 0; y += rowh + 2; rowh = 0
        pos[k] = (x, y); x += im.width + 2; rowh = max(rowh, im.height)
    sheet = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
    for k in order:
        im, (ax, ay) = res[k]; px, py = pos[k]; sheet.paste(im, (px, py)); fr['hd_' + k] = ['props3', px, py, im.width, im.height, ax, ay, K]
    sheet.save(sp, optimize=True); json.dump(meta, open(ap, 'w'), separators=(',', ':'))
    sh = os.path.join(ROOT, 'assets/sheets.json'); so = json.load(open(sh))
    if 'props3' not in so['order']: so['order'].insert(so['order'].index('tiles3') + 1, 'props3'); json.dump(so, open(sh, 'w'))
    print('кадров', len(res), 'лист', sheet.size, '≈ %.0f МБ в памяти' % (sheet.width * sheet.height * 4 / 1e6))
