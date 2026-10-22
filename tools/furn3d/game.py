#!/usr/bin/env python3
"""Новая мебель для игры на 3D-основе tools/furn3d/render.py: модели в метрах, 4 поворота как WDI в игре,
чистый пиксель с тёмной кромкой (как у персонажей), без тени на полу. Кадры дописываются в лист furn2 и атлас.
   python3 tools/furn3d/game.py preview out.png        # превью: новые и старые рядом
   python3 tools/furn3d/game.py export                 # записать в assets/sprites/furn2.png и assets/atlas.json
Координаты модели: x — вдоль стены, y — от стены (0) к лицевой стороне, z — вверх. Лицом модель смотрит в +y.
"""
import sys, os, json
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import render as F
from render import Model, rbox, cylz, capsule, cut, mat, MAT, wood_pat

mat('plastic', '#3c3f45', .25, .35); mat('screen', '#557282', .9, .08); mat('bezel', '#2a2c30', .2, .4)
mat('terracotta', '#a0583a', .05, .7); mat('leaf', '#5a9a3e', .05, .6); mat('leaf2', '#4a8434', .05, .6)
mat('water', '#86aebe', .7, .1); mat('seat', '#efede6', .3, .3); mat('soil', '#3a2a1e', 0, .9)
mat('woodm', '#7a5236', .05, .6, wood_pat(0)); mat('woodmv', '#6e4a30', .05, .6, wood_pat(2))

def sphere(c, r): return capsule(c, (c[0], c[1], c[2] + 1e-4), r)   # капсула нулевой длины даёт деление на ноль

def crt(m, cx, cy, z0, w=.48, d=.36, h=.4):
    """кинескопный телевизор: корпус, сужение назад, экран с рамкой, кнопки, антенна"""
    m.add(rbox((cx, cy + .02, z0 + h / 2), (w / 2, d / 2 - .02, h / 2), .035), 'plastic')
    m.add(rbox((cx, cy - d / 2 + .06, z0 + h / 2 + .01), (w / 2 - .07, .08, h / 2 - .06), .05), 'plastic')       # кинескоп сзади
    fy = cy + d / 2
    m.add(rbox((cx - .03, fy + .002, z0 + h / 2 + .01), (w / 2 - .08, .01, h / 2 - .06), .03), 'bezel')
    m.add(rbox((cx - .03, fy + .008, z0 + h / 2 + .01), (w / 2 - .1, .008, h / 2 - .08), .04), 'screen')
    for k in range(3): m.add(sphere((cx + w / 2 - .045, fy + .004, z0 + h * .62 - k * .055), .012), 'chrome')
    top = z0 + h
    m.add(capsule((cx, cy - .04, top + .01), (cx - .13, cy - .08, top + .24), .005), 'chrome')
    m.add(capsule((cx, cy - .04, top + .01), (cx + .12, cy - .02, top + .26), .005), 'chrome')
    m.add(rbox((cx, cy - .04, top + .015), (.035, .025, .015), .01), 'plastic')

def tv():
    m = Model(); W, D = 1.2, .4
    m.add(rbox((W / 2, D / 2, .25), (W / 2 - .01, D / 2 - .01, .23), .02), 'woodm')                      # тумба
    m.add(rbox((W / 2, D / 2, .485), (W / 2, D / 2, .022), .012), 'woody')                              # столешница
    m.add(rbox((W / 2, D / 2 - .01, .025), (W / 2 - .03, D / 2 - .04, .025), .005), 'woodd')             # цоколь
    for x in (W * .25, W * .75):
        m.add(rbox((x, D - .002, .26), (W / 4 - .03, .01, .17), .012), 'woodmv')                          # дверцы
        m.add(capsule((x + (.08 if x < W / 2 else -.08), D + .012, .24), (x + (.08 if x < W / 2 else -.08), D + .012, .3), .008), 'brass')
    crt(m, .48, .2, .505)
    m.add(cylz(1.0, .2, .075, .505, .63, .015), 'terracotta')                                            # цветок
    m.add(cylz(1.0, .2, .062, .6, .632), 'soil')
    for c, r, mt in (((1.0, .2, .74), .085, 'leaf'), ((.94, .16, .7), .06, 'leaf2'), ((1.06, .25, .7), .065, 'leaf2'), ((1.02, .14, .8), .05, 'leaf')):
        m.add(sphere(c, r), mt)
    return m, (W, D)

def tv1():
    m = Model(); W, D = .8, .42
    m.add(rbox((W / 2, D / 2, .44), (W / 2, D / 2, .022), .012), 'woody')                                 # столешница
    m.add(rbox((W / 2, D / 2, .12), (W / 2 - .04, D / 2 - .04, .014), .008), 'woody')                     # полка
    for x in (.04, W - .04):
        for y in (.04, D - .04): m.add(rbox((x, y, .21), (.022, .022, .21), .008), 'woodmv')
    m.add(rbox((W / 2, D / 2, .17), (.17, .12, .035), .01), 'plastic')                                   # видик на полке
    crt(m, W / 2, D / 2, .462, .5, .36, .4)
    return m, (W, D)

def toilet():
    m = Model(); W, D = .42, .6; cx = W / 2
    m.add(rbox((cx, .11, .6), (.185, .085, .19), .03), 'enamel')                                        # бачок
    m.add(rbox((cx, .11, .8), (.195, .095, .018), .014), 'enamel')                                      # крышка бачка
    m.add(capsule((cx - .12, .2, .73), (cx - .07, .2, .73), .009), 'chrome')                             # ручка смыва
    m.add(rbox((cx, .3, .17), (.11, .13, .17), .07), 'enamel')                                          # ножка
    bowl = rbox((cx, .37, .33), (.18, .22, .1), .09)
    m.add(cut(bowl, rbox((cx, .38, .43), (.13, .165, .1), .08)), 'enamel')                              # чаша
    m.add(rbox((cx, .385, .335), (.11, .135, .006), .005), 'water')
    seat = rbox((cx, .37, .438), (.183, .222, .014), .013)
    m.add(cut(seat, rbox((cx, .38, .44), (.122, .155, .04), .07)), 'seat')                              # сиденье
    m.add(rbox((cx, .215, .63), (.17, .012, .19), .05), 'seat')                                         # поднятая крышка
    m.add(rbox((cx, .17, .44), (.05, .03, .012), .008), 'chrome')                                       # петли
    return m, (W, D)

MODELS = {'tv': tv, 'tv1': tv1, 'toilet': toilet}

# повороты как в tools/furn/sketch.py (Spr.R): модель вокруг центра следа
def rotated(m, size, r):
    if not r: return m
    piv = np.array([size[0] / 2, size[1] / 2])
    def to_model(p):                                     # мир -> модель (обратный поворот)
        q = p.copy(); dx, dy = p[..., 0] - piv[0], p[..., 1] - piv[1]
        mx, my = ((dy, -dx), (-dx, -dy), (-dy, dx))[r - 1]
        q[..., 0], q[..., 1] = piv[0] + mx, piv[1] + my; return q
    def to_world(x, y):
        dx, dy = x - piv[0], y - piv[1]
        wx, wy = ((-dy, dx), (-dx, -dy), (dy, -dx))[r - 1]; return piv[0] + wx, piv[1] + wy
    out = Model()
    for f, (lo, hi), mt in m.parts:
        cs = [to_world(x, y) for x in (lo[0], hi[0]) for y in (lo[1], hi[1])]
        lo2 = np.array([min(c[0] for c in cs), min(c[1] for c in cs), lo[2]]); hi2 = np.array([max(c[0] for c in cs), max(c[1] for c in cs), hi[2]])
        key = mt + '@%d' % r
        if key not in MAT:
            M = dict(MAT[mt]); pat = M['pat']
            if pat is not None: M['pat'] = (lambda pat: lambda p: pat(to_model(p)))(pat)
            MAT[key] = M
        out.parts.append(((lambda f: lambda p: f(to_model(p)))(f), (lo2, hi2), key))
    return out

def frame(name, r):
    m, size = MODELS[name]()
    im, (ox, oy) = F.render(rotated(m, size, r), cells=(max(1, int(np.ceil(size[0]))), max(1, int(np.ceil(size[1])))))
    px = F.pixelize(im, 40, outline=True)
    a = np.array(px); a[a[..., 3] < 255] = 0                    # без тени на полу, как у остальной мебели
    px = Image.fromarray(a, 'RGBA'); bb = px.getbbox()
    ax = ox + (size[0] / 2 - size[1] / 2) * F.HX; ay = oy + (size[0] / 2 + size[1] / 2) * F.HY   # якорь — центр следа
    return px.crop(bb), (ax - bb[0], ay - bb[1]), size

def preview(out):
    at = json.load(open(os.path.join(ROOT, 'assets/atlas.json')))['frames']; sh = Image.open(os.path.join(ROOT, 'assets/sprites/furn2.png'))
    rows = []
    for name in MODELS:
        new = [frame(name, r) for r in range(4)]
        old = []
        for r in range(4):
            k = 'f_%s_0_%d' % (name, r); fr = at.get('old_' + k) if False else at[k]
            s, x, y, w, h, ax, ay = fr; old.append((sh.crop((x, y, x + w, y + h)), (ax, ay)))
        rows.append(old + [(im, a) for im, a, _ in new])
    Z, CW, CH = 3, 90, 110
    bg = Image.new('RGBA', (8 * CW * Z, len(rows) * CH * Z), (58, 58, 58, 255))
    for i, row in enumerate(rows):
        for j, (im, (ax, ay)) in enumerate(row):
            big = im.resize((im.width * Z, im.height * Z), Image.NEAREST)
            bg.alpha_composite(big, (int(j * CW * Z + CW * Z / 2 - ax * Z), int(i * CH * Z + CH * Z * .8 - ay * Z)))
    bg.save(out); print(out, bg.size)

def export():
    ap = os.path.join(ROOT, 'assets/atlas.json'); sp = os.path.join(ROOT, 'assets/sprites/furn2.png')
    meta = json.load(open(ap)); sheet = Image.open(sp).convert('RGBA')
    frames = [('f_%s_0_%d' % (n, r),) + frame(n, r)[:2] for n in MODELS for r in range(4)]
    # новые кадры — полкой под существующим листом
    x = 0; y0 = sheet.height + 1; rowh = 0; pos = {}
    for nm, im, _ in frames:
        if x + im.width > sheet.width: x = 0; y0 += rowh + 1; rowh = 0
        pos[nm] = (x, y0); x += im.width + 1; rowh = max(rowh, im.height)
    out = Image.new('RGBA', (sheet.width, y0 + rowh + 1), (0, 0, 0, 0)); out.paste(sheet, (0, 0))
    for nm, im, (ax, ay) in frames:
        px, py = pos[nm]; out.paste(im, (px, py))
        meta['frames'][nm] = ['furn2', px, py, im.width, im.height, int(round(ax)), int(round(ay))]
    out.save(sp, optimize=True); json.dump(meta, open(ap, 'w'), separators=(',', ':'))
    print('записано', len(frames), 'кадров, лист', out.size)

if __name__ == '__main__':
    if sys.argv[1] == 'preview': preview(sys.argv[2])
    else: export()
