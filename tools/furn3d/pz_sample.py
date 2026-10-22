#!/usr/bin/env python3
"""Проба стиля «как в Project Zomboid»: та же 3D-основа, но крупнее (×K), без пиксельной палитры,
мягкие скругления и богатые текстуры (дерево, ткань в клетку, обои, доски, ковёр).
   python3 tools/furn3d/pz_sample.py out.png [K]
"""
import sys, os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import render as F
import game as G
from render import Model, rbox, mat, MAT

K = float(sys.argv[2]) if len(sys.argv) > 2 else 3
F.HX, F.HY, F.ZP = 32 * K, 16 * K, 31 * K
F.SS = 2
F.WEAR = .8

# ---------- текстуры ----------
def plaid(c1, c2, scale=9):
    a, b = np.array(c1), np.array(c2)
    def f(p):  # множитель яркости: клетка из полос по x и y, тонкие нити
        u, v = p[..., 0] * scale, p[..., 1] * scale
        s = (np.sin(u * np.pi * 2) > .45).astype(float) + (np.sin(v * np.pi * 2) > .45)
        t = (np.sin(u * np.pi * 8) > .9).astype(float) * .5
        return 1 - .13 * s + .06 * t
    return f
def planks(w=.14, along=0):
    def f(p):
        a = p[..., along]; o = p[..., 1 - along]
        row = np.floor(o / w); off = (row * .37) % 1
        seam = (np.abs((o / w) % 1 - .5) > .47) | (np.abs(((a / 1.1 + off) % 1) - .5) > .493)
        tone = 1 + .07 * np.sin(row * 12.9) + .04 * np.sin(a * 37 + row * 3) + .03 * np.sin(a * 151 + o * 30)
        return np.where(seam, .62, tone)
    return f
def wallpaper(p):
    u = p[..., 0] + p[..., 1]; z = p[..., 2]
    stripe = (np.sin(u * 2 * np.pi / .16) > .6) * .05
    dots = ((np.sin(u * 2 * np.pi / .08) > .93) & (np.sin(z * 2 * np.pi / .12) > .9)) * .08
    return 1 - stripe + dots
def rugpat(p):
    x, y = p[..., 0], p[..., 1]
    cx, cy = x - 1.9, y - 2.25
    border = (np.maximum(np.abs(cx) - .78, np.abs(cy) - .48) > -.08) * -.14
    diamond = ((np.abs(cx) / .5 + np.abs(cy) / .3) % 1 < .12) * .12
    return 1 + border + diamond + .03 * np.sin(x * 220)
mat('floor', '#8a6240', .08, .5, planks()); mat('wall', '#d8cfbe', 0, .9, wallpaper)
mat('baseboard', '#efe9dc', .1, .5); mat('rug', '#7a3a32', 0, .95, rugpat)
mat('glass', '#7fa6b8', .9, .05); mat('frame_w', '#e8e2d4', .1, .5)
for k, (c, c2) in enumerate(G.BLANKETS):
    MAT['blanket%d' % k]['pat'] = plaid(None, None)

# ---------- сборка комнаты ----------
def place(m, size, dx, dy, r=0):
    """поставить модель с поворотом r (как в игре) в точку (dx, dy) — левый-верхний угол следа"""
    rm = G.rotated(m, size, r)
    out = Model(); off = np.array([dx, dy, 0.])
    for f, (lo, hi), mt in rm.parts:
        key = mt + '+%g,%g' % (dx, dy)
        if key not in MAT:
            M = dict(MAT[mt]); pat, xf = M['pat'], M.get('xf')
            if pat is not None: M['pat'] = (lambda pat: lambda p: pat(p - off))(pat)
            M['xf'] = (lambda xf: (lambda p: xf(p - off)) if xf else (lambda p: p - off))(xf)
            MAT[key] = M
        out.parts.append(((lambda f: lambda p: f(p - off))(f), (lo + off, hi + off), key))
    return out

room = Model(); RW, RD, WH = 4.0, 3.6, 2.4
room.add(rbox((RW / 2, RD / 2, -.05), (RW / 2, RD / 2, .05)), 'floor')
room.add(rbox((RW / 2, -.06, WH / 2), (RW / 2 + .12, .06, WH / 2)), 'wall')                 # задняя стена
room.add(rbox((-.06, RD / 2, WH / 2), (.06, RD / 2, WH / 2)), 'wall')                         # левая стена
room.add(rbox((RW / 2, .012, .05), (RW / 2, .012, .05), .005), 'baseboard')
room.add(rbox((.012, RD / 2, .05), (.012, RD / 2, .05), .005), 'baseboard')
room.add(rbox((3.2, .005, 1.45), (.45, .03, .55), .01), 'frame_w')                             # окно
room.add(rbox((3.2, .02, 1.45), (.39, .02, .49), .005), 'glass')
room.add(rbox((3.2, .04, 1.45), (.39, .012, .015), .004), 'frame_w')
room.add(rbox((3.2, .04, 1.45), (.015, .012, .49), .004), 'frame_w')
room.add(rbox((3.2, .07, .9), (.5, .07, .02), .01), 'frame_w')                               # подоконник
room.add(rbox((1.9, 2.25, .006), (.8, .5, .006), .004), 'rug')

# мебель — отдельными спрайтами (как в игре), комната — отдельно: так в разы быстрее
def sprite(m, size, r):
    im, (ox, oy) = F.render(G.rotated(m, size, r), cells=(max(1, int(np.ceil(size[0]))), max(1, int(np.ceil(size[1])))))
    a = np.array(im); a[a[..., 3] < 250] = 0                                                   # своя тень на полу не нужна
    return Image.fromarray(a), (ox, oy)
def scr(x, y, z=0): return ((x - y) * F.HX, (x + y) * F.HY - z * F.ZP)

shell, (sx0, sy0) = F.render(room, cells=(4, 4))
canvas = Image.new('RGBA', shell.size, (30, 33, 28, 255)); canvas.alpha_composite(shell)
from PIL import ImageDraw, ImageFilter
items = [(G.bed(1), .55, 0, 0), (G.nightstand(), 1.97, 0, 0), (G.wardrobe(), 0, 2.2, 3), (G.dresser(), 2.65, 0, 0)]
items.sort(key=lambda t: t[1] + t[2])
for (m, size), dx, dy, r in items:
    w, d = size if r % 2 == 0 else size[::-1]
    # мягкая контактная тень под предметом
    sh = Image.new('L', canvas.size, 0); dr = ImageDraw.Draw(sh)
    pts = [scr(dx + a, dy + b) for a, b in ((-.03, -.03), (w + .06, -.03), (w + .06, d + .06), (-.03, d + .06))]
    dr.polygon([(sx0 + x, sy0 + y) for x, y in pts], fill=110)
    sh = sh.filter(ImageFilter.GaussianBlur(4 * K))
    dark = Image.new('RGBA', canvas.size, (10, 8, 6, 0)); dark.putalpha(sh); canvas.alpha_composite(dark)
    im, (ox, oy) = sprite(m, size, r)
    px, py = scr(dx, dy)
    canvas.alpha_composite(im, (int(round(sx0 + px - ox)), int(round(sy0 + py - oy))))
canvas.save(sys.argv[1] if len(sys.argv) > 1 else 'pz_sample.png'); print(canvas.size)
