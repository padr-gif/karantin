#!/usr/bin/env python3
"""Детальные плитки земли и полов (×3) для детального режима: доски с волокнами, кафель с затиркой, ковролин,
трава с травинками, асфальт, тротуар. Каждая плитка — ромб клетки 1×1 м; текстуры периодичны по клетке,
поэтому соседние плитки стыкуются без шва. Кадры hd_g_* дописываются в лист tiles3 и атлас.
   python3 tools/furn3d/tiles.py             # записать в игру
   python3 tools/furn3d/tiles.py out.png     # только превью
"""
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
K = 3; HX, HY = 32 * K, 16 * K; S = 256                     # S — сторона квадратной текстуры на клетку

def tnoise(scale, seed, power=1.0, n=S):
    """бесшовный шум на клетку (FFT): scale — сколько «пятен» на клетку"""
    r = np.random.default_rng(seed)
    fx = np.fft.fftfreq(n)[None, :]; fy = np.fft.fftfreq(n)[:, None]
    f = np.sqrt(fx ** 2 + fy ** 2); f[0, 0] = 1
    amp = 1.0 / (f * n / scale) ** power; amp[0, 0] = 0; amp[f * n > scale * 6] *= .25
    out = np.real(np.fft.ifft2((r.standard_normal((n, n)) + 1j * r.standard_normal((n, n))) * amp))
    out -= out.min(); return out / out.max()
def sm(x, a, b): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
U, V = np.meshgrid((np.arange(S) + .5) / S, (np.arange(S) + .5) / S)   # u — вдоль x мира, v — вдоль y
def rgb(c): return np.array([int(c[i:i + 2], 16) for i in (1, 3, 5)], float) / 255
def colorize(c, k): return np.clip(rgb(c)[None, None, :] * k[..., None], 0, 1) if isinstance(c, str) else np.clip(c * k[..., None], 0, 1)

def grout(t, w):
    """1 внутри плитки, 0 на шве шириной w (в долях плитки), мягкий край и лёгкая фаска"""
    d = np.minimum(t % 1, 1 - t % 1)
    return sm(d, w * .5, w)

# ---------- полы ----------
def wood(v):
    rows = 6; row = np.floor(V * rows); rv = (V * rows) % 1
    off = ((row * .37 + v * .5) % 1)                                          # стыки досок в разных местах
    a = (U + off) % 1
    plank = np.floor(U + off)
    tone = .9 + .16 * ((np.sin(row * 12.9898 + plank * 78.233 + v * 3.1) * 43758.5453) % 1)
    gn = tnoise(5, 11)
    grain = .045 * np.sin((V * rows * 9 + gn * 4 + row * 2.3) * np.pi * 2) + .03 * (tnoise(40, 12) - .5)
    seam = np.minimum(sm(np.minimum(rv, 1 - rv), .015, .06), sm(np.minimum(a, 1 - a), .004, .012))
    bevel = 1 + .06 * sm(rv, .06, .12) * (1 - sm(rv, .12, .3))               # светлая кромка у верхнего края доски
    k = (tone + grain) * bevel * (.45 + .55 * seam)
    return colorize('#8a5f3c', k)
def checker(c1, c2, n, gw, gc, gloss=.05, seed=0):
    tx, ty = np.floor(U * n), np.floor(V * n)
    base = np.where(((tx + ty) % 2)[..., None] == 0, rgb(c1), rgb(c2))
    k = .97 + .04 * ((np.sin(tx * 12.9 + ty * 78.2 + seed) * 43758.5) % 1) + .03 * (tnoise(6, 21 + seed) - .5)
    lx, ly = (U * n) % 1, (V * n) % 1
    k = k * (1 + gloss * (1 - lx) * (1 - ly))                                  # блик от угла плитки
    g = np.minimum(grout(U * n, gw), grout(V * n, gw))
    return np.clip(base * k[..., None], 0, 1) * g[..., None] + rgb(gc) * (1 - g[..., None])
def carpet(c):
    k = .92 + .1 * tnoise(3, 31) + .12 * (np.random.default_rng(32).random((S, S)) - .5) * .6
    k = np.array(Image.fromarray((k * 120).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.6))) / 120
    return colorize(c, k)
def lino():
    m = tnoise(3, 41, 1.2); k = .95 + .08 * m + .03 * np.sin((U + V) * 14 + m * 3)
    return colorize('#b49a72', k)
def terrazzo():
    k = .96 + .05 * tnoise(4, 51) + .08 * (np.random.default_rng(52).random((S, S)) > .985)
    g = np.minimum(grout(U * 2, .02), grout(V * 2, .02))
    return colorize('#c4c1b8', k * (.75 + .25 * g))
def concrete():
    st = tnoise(3, 61, 1.3); k = .9 + .12 * tnoise(10, 62) - .18 * sm(st, .7, .9) + .04 * (tnoise(60, 63) - .5)
    return colorize('#7c7a74', k)

# ---------- улица ----------
def grass(v):
    base = tnoise(3, 71, 1.1)
    col = (rgb('#2e3e24')[None, None] * (1 - base[..., None]) + rgb('#4e5e34')[None, None] * base[..., None])
    col *= (.92 + .14 * tnoise(24, 72 + v))[..., None]
    im = Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8)).convert('RGBA')
    r = np.random.default_rng(80 + v); d = ImageDraw.Draw(im, 'RGBA')
    blades = ['#40562c', '#56703a', '#6a843e', '#36482a', '#738048']
    for _ in range(900):                                                        # травинки, с переносом через край
        x, y = r.random() * S, r.random() * S; l = 3 + r.random() * 6; a = -1.57 + (r.random() - .5) * 1.1
        c = rgb(blades[r.integers(0, len(blades))]); cc = tuple(int(v_ * 255) for v_ in c) + (210,)
        for ox in (-S, 0, S):
            for oy in (-S, 0, S):
                d.line([(x + ox, y + oy), (x + ox + np.cos(a) * l, y + oy + np.sin(a) * l)], fill=cc, width=1)
    if v % 2:                                                                    # редкие цветы
        for _ in range(4):
            x, y = r.random() * S, r.random() * S; c = (238, 226, 140, 255) if r.random() < .5 else (236, 236, 230, 255)
            d.ellipse([x - 1.5, y - 1.5, x + 1.5, y + 1.5], fill=c)
    return np.array(im.convert('RGB')) / 255
def asphalt(v):
    k = .92 + .1 * tnoise(5, 91) + .1 * (np.random.default_rng(92).random((S, S)) - .5)
    k = np.array(Image.fromarray(np.clip(k * 200, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.5))) / 200
    spk = np.random.default_rng(93 + v).random((S, S)) > .993
    k = k + spk * .35
    col = colorize('#33353a', k)
    if v == 2:                                                                   # трещина
        im = Image.fromarray((col * 255).astype(np.uint8)); d = ImageDraw.Draw(im); x, y = 40., 60.
        r = np.random.default_rng(94)
        for _ in range(9): nx, ny = x + 18 + r.random() * 6, y + (r.random() - .4) * 22; d.line([(x, y), (nx, ny)], fill=(20, 21, 24), width=2); x, y = nx, ny
        col = np.array(im) / 255
    return col
def sidewalk(v):
    k = .94 + .08 * tnoise(5, 101) + .05 * (tnoise(50, 102) - .5) - .12 * sm(tnoise(2, 103 + v), .75, .95)
    g = np.minimum(grout(U, .03), grout(V, .03))
    col = colorize('#8e8d88', k * (.62 + .38 * g))
    if v == 1:
        im = Image.fromarray((col * 255).astype(np.uint8)); d = ImageDraw.Draw(im); r = np.random.default_rng(104); x, y = 120., 30.
        for _ in range(8): nx, ny = x + (r.random() - .5) * 26, y + 16 + r.random() * 8; d.line([(x, y), (nx, ny)], fill=(78, 78, 76), width=1); x, y = nx, ny
        col = np.array(im) / 255
    return col

TILES = {
    'g_wood_0': lambda: wood(0), 'g_wood_1': lambda: wood(1),
    'g_kitchen': lambda: checker('#d6d2c4', '#97a3ab', 2, .025, '#6e6c66', .06, 1),
    'g_bath': lambda: checker('#e4ecef', '#c4d6de', 4, .04, '#8e9a9e', .08, 2),
    'g_hall': lino, 'g_store': terrazzo, 'g_concrete': concrete,
    'g_carpet_0': lambda: carpet('#7c3e38'), 'g_carpet_1': lambda: carpet('#3e5474'), 'g_carpet_2': lambda: carpet('#5a6a46'),
    **{'g_grass_%d' % i: (lambda i=i: grass(i)) for i in range(4)},
    **{'g_asph_%d' % i: (lambda i=i: asphalt(i)) for i in range(3)},
    'g_walk_0': lambda: sidewalk(0), 'g_walk_1': lambda: sidewalk(1),
}

def to_diamond(tex, ss=2, grow=1.5):
    """квадрат uv → ромб клетки на экране (якорь — верхний угол, как у старых плиток), чуть с запасом от швов"""
    W, H = 2 * HX, 2 * HY
    gx, gy = np.meshgrid((np.arange(W * ss) + .5) / ss - HX, (np.arange(H * ss) + .5) / ss)
    u = (gy / HY + gx / HX) / 2; v = (gy / HY - gx / HX) / 2
    e = grow / HX
    inside = (u > -e) & (u < 1 + e) & (v > -e) & (v < 1 + e)
    ui = np.clip((u % 1) * S, 0, S - 1.001); vi = np.clip((v % 1) * S, 0, S - 1.001)
    x0, y0 = ui.astype(int), vi.astype(int); fx, fy = (ui - x0)[..., None], (vi - y0)[..., None]
    x1, y1 = (x0 + 1) % S, (y0 + 1) % S
    c = (tex[y0, x0] * (1 - fx) * (1 - fy) + tex[y0, x1] * fx * (1 - fy) + tex[y1, x0] * (1 - fx) * fy + tex[y1, x1] * fx * fy)
    img = np.concatenate([np.clip(c, 0, 1) * 255, inside[..., None] * 255.], -1).astype(np.uint8)
    return Image.fromarray(img, 'RGBA').resize((W, H), Image.BOX)

def build():
    return {k: to_diamond(f()) for k, f in TILES.items()}

if __name__ == '__main__':
    tiles = build()
    if len(sys.argv) > 1:
        ks = list(tiles); bg = Image.new('RGBA', (6 * (2 * HX + 8), ((len(ks) + 5) // 6) * (2 * HY + 8)), (30, 30, 30, 255))
        for i, k in enumerate(ks): bg.alpha_composite(tiles[k], ((i % 6) * (2 * HX + 8), (i // 6) * (2 * HY + 8)))
        bg.save(sys.argv[1]); print(bg.size); sys.exit()
    ap = os.path.join(ROOT, 'assets/atlas.json'); meta = json.load(open(ap)); fr = meta['frames']
    W = 2048; x = y = 0; out = Image.new('RGBA', (W, 2048), (0, 0, 0, 0)); rowh = 0
    for k, im in tiles.items():
        if x + im.width > W: x = 0; y += rowh + 2; rowh = 0
        out.paste(im, (x, y)); fr['hd_' + k] = ['tiles3', x, y, im.width, im.height, HX, 0, K]
        x += im.width + 2; rowh = max(rowh, im.height)
    out = out.crop((0, 0, W, y + rowh))
    out.save(os.path.join(ROOT, 'assets/sprites/tiles3.png'), optimize=True); json.dump(meta, open(ap, 'w'), separators=(',', ':'))
    sh = os.path.join(ROOT, 'assets/sheets.json'); so = json.load(open(sh))
    if 'tiles3' not in so['order']: so['order'].insert(so['order'].index('furn3') + 1, 'tiles3'); json.dump(so, open(sh, 'w'))
    print('плиток', len(tiles), 'лист', out.size)
