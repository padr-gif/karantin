#!/usr/bin/env python3
"""Эскизы новой мебели в стиле «Карантина»: изометрия 2:1 (клетка 64×32 px), текстура-шум, тёмный контур, свет сверху.
   python3 tools/furn/sketch.py out.png
Рисует лист эскизов (крупно ×3, с подписями). Те же функции потом соберут кадры для игры (4 поворота)."""
import math, sys
from PIL import Image, ImageDraw, ImageFont

U, HH = 32, 16                      # полклетки по x и по y на экране

def hx(c):
    if isinstance(c, tuple): return c
    c = c.lstrip('#'); return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16))
def mul(c, k): return tuple(max(0, min(255, round(v * k))) for v in c[:3])
def hsh(x, y, s=0):
    h = (x * 374761393 + y * 668265263 + s * 2147483647) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return ((h ^ (h >> 16)) & 0xffffffff) / 4294967296
def vn(x, y, s):
    xi, yi = math.floor(x), math.floor(y); xf, yf = x - xi, y - yi
    a, b, c, d = hsh(xi, yi, s), hsh(xi + 1, yi, s), hsh(xi, yi + 1, s), hsh(xi + 1, yi + 1, s)
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v

# материалы: как шумят пиксели
TEX = {
    'wood':   lambda x, y: .9 + .14 * vn(x / 1.5, y / 7, 1) + .06 * hsh(x, y, 2),
    'metal':  lambda x, y: .95 + .06 * vn(x / 5, y / 5, 3) + .04 * hsh(x, y, 4),
    'paint':  lambda x, y: .94 + .08 * vn(x / 4, y / 4, 5) + .05 * hsh(x, y, 6),
    'fabric': lambda x, y: .9 + .1 * ((x + y) % 2) * .5 + .1 * vn(x / 3, y / 3, 7) + .05 * hsh(x, y, 8),
    'stone':  lambda x, y: .86 + .2 * vn(x / 2.5, y / 2.5, 9) + .08 * hsh(x, y, 10),
    'plain':  lambda x, y: 1,
}
SHADE = {'t': 1.0, 's': .82, 'e': .64}     # верх, грань к +y, грань к +x (как в игре)

class Spr:
    def __init__(s, w=230, h=200, ox=115, oy=150):
        s.im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); s.d = ImageDraw.Draw(s.im); s.ox, s.oy = ox, oy
    def P(s, x, y, z): return (s.ox + (x - y) * U, s.oy + (x + y) * HH - z)
    def face(s, pts, col, tex='paint', shade=1.0, edge=None):
        col = mul(hx(col), shade); m = Image.new('L', s.im.size, 0); ImageDraw.Draw(m).polygon(pts, fill=255)
        px, mp, T = s.im.load(), m.load(), TEX[tex]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        for y in range(max(0, int(min(ys)) - 1), min(s.im.size[1], int(max(ys)) + 2)):
            for x in range(max(0, int(min(xs)) - 1), min(s.im.size[0], int(max(xs)) + 2)):
                if mp[x, y]: px[x, y] = mul(col, T(x, y)) + (255,)
        if edge: s.d.line(pts + [pts[0]], fill=mul(col, edge) + (255,), width=1)
    def box(s, x0, y0, x1, y1, z0, z1, col, tex='paint', top=None, ttex=None, lip=True):
        P = s.P
        s.face([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], col, tex, SHADE['s'])
        s.face([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], col, tex, SHADE['e'])
        s.face([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], top or col, ttex or tex, SHADE['t'])
        if lip:   # light rim on the top's front edges, a soft crease on the front corner
            c = mul(hx(top or col), 1.12) + (255,)
            s.d.line([P(x0, y1, z1), P(x1, y1, z1), P(x1, y0, z1)], fill=c)
            s.d.line([P(x1, y1, z0), P(x1, y1, z1)], fill=mul(hx(col), .55) + (255,))
    def sface(s, side, a0, a1, z0, z1, col, tex='paint', box=None, inset=.012):
        """прямоугольник на видимой грани коробки box=(x0,y0,x1,y1): side 's' (вдоль x) или 'e' (вдоль y)"""
        x0, y0, x1, y1 = box; P = s.P
        if side == 's': y = y1 + inset; pts = [P(a0, y, z0), P(a1, y, z0), P(a1, y, z1), P(a0, y, z1)]
        else: x = x1 + inset; pts = [P(x, a0, z0), P(x, a1, z0), P(x, a1, z1), P(x, a0, z1)]
        s.face(pts, col, tex, SHADE[side])
    def tface(s, x0, y0, x1, y1, z, col, tex='paint'):
        P = s.P; s.face([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], col, tex, 1.0)
    def line(s, a, b, col, w=1): s.d.line([s.P(*a), s.P(*b)], fill=hx(col) + (255,), width=w)
    def dot(s, p, col, r=0): x, y = s.P(*p); s.d.rectangle([x - r, y - r, x + r, y + r], fill=hx(col) + (255,))
    def cyl(s, cx, cy, r, z0, z1, col, tex='metal', top=None, ry=None):
        x, y0 = s.P(cx, cy, z0); _, y1 = s.P(cx, cy, z1); rx = r * U * 1.41; ry = ry or rx / 2
        col = hx(col); m = Image.new('L', s.im.size, 0); md = ImageDraw.Draw(m)
        md.rectangle([x - rx, y1, x + rx, y0], fill=255); md.ellipse([x - rx, y0 - ry, x + rx, y0 + ry], fill=255)
        px, mp, T = s.im.load(), m.load(), TEX[tex]
        for yy in range(int(y1 - ry) - 1, int(y0 + ry) + 2):
            for xx in range(int(x - rx) - 1, int(x + rx) + 2):
                if 0 <= xx < s.im.size[0] and 0 <= yy < s.im.size[1] and mp[xx, yy]:
                    t = (xx - (x - rx)) / (2 * rx); k = 1.15 if t < .25 else 1.0 if t < .5 else .86 if t < .78 else .7
                    px[xx, yy] = mul(col, k * T(xx, yy)) + (255,)
        tc = mul(hx(top or col), 1.08)
        s.d.ellipse([x - rx, y1 - ry, x + rx, y1 + ry], fill=tc + (255,))
    def outline(s):
        src = s.im.copy(); sp = src.load(); px = s.im.load(); W, H = s.im.size
        for y in range(H):
            for x in range(W):
                if sp[x, y][3]: continue
                n = [sp[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < W and 0 <= y + dy < H and sp[x + dx, y + dy][3]]
                if n: c = n[0]; px[x, y] = (c[0] * 32 // 100 + 9, c[1] * 30 // 100 + 8, c[2] * 30 // 100 + 9, 255)
        return s.im

# ---------- the sketches ----------
# Масштаб как в игре: клетка пола = 1 м, стена 2,5 м = 77 px, значит по высоте ~31 px на метр.
M = 31
def h(m): return m * M
WOOD, WOOD_D, WOOD_L = '#7a5636', '#5c3f27', '#9c744a'
SK = []
def sk(name, note, size=(1, 1)):
    def deco(fn): SK.append((name, note, fn, size)); return fn
    return deco
def legs(s, x0, y0, x1, y1, t, z, col, tex='wood'):
    for x, y in ((x0, y0), (x1 - t, y0), (x0, y1 - t), (x1 - t, y1 - t)): s.box(x, y, x + t, y + t, 0, z, col, tex, lip=False)

@sk('Стиральная машина', '60×60×85 см · стирка одежды и бинтов, нужна вода')
def _(s):
    b = (.2, .2, .8, .8); s.box(*b, 0, h(.85), '#e6e8e4', 'metal')
    s.sface('s', .22, .78, h(.74), h(.83), '#d0d4d6', box=b)                    # панель управления
    s.sface('s', .26, .4, h(.77), h(.8), '#6a7078', 'metal', box=b)             # дозатор
    s.dot((.62, .81, h(.785)), '#3a3c40', 1); s.dot((.7, .81, h(.785)), '#40a050')
    x, y = s.P(.5, .8, h(.38)); r = 10
    s.d.ellipse([x - r - 2, y - r - 1, x + r + 2, y + r + 1], fill=(150, 154, 160, 255)); s.d.ellipse([x - r, y - r + 1, x + r, y + r - 1], fill=(58, 64, 72, 255))
    s.d.ellipse([x - r + 3, y - r + 4, x + r - 3, y + r - 4], fill=(104, 138, 160, 255)); s.d.ellipse([x - 5, y - 6, x, y - 2], fill=(180, 204, 218, 255))
    s.sface('s', .22, .78, 0, h(.06), '#9a9ea2', 'metal', box=b)               # цоколь

@sk('Умывальник с зеркалом', 'раковина 55×45, верх на 85 см · вода, пока есть водопровод')
def _(s):
    s.box(.24, .04, .76, .08, h(1.15), h(1.85), '#c0c6ca', 'metal', lip=False)   # зеркало на стене
    s.sface('s', .26, .74, h(1.17), h(1.83), '#a4bcc8', 'metal', box=(.24, .04, .76, .08)); s.line((.32, .085, h(1.7)), (.42, .085, h(1.35)), '#e2eef4')
    s.box(.43, .1, .57, .22, 0, h(.72), '#dcdedb', 'stone')                      # ножка-пьедестал
    s.box(.22, .04, .78, .5, h(.72), h(.85), '#eceeea', 'stone')
    s.tface(.28, .1, .72, .44, h(.85) + .2, '#a8b0b6'); s.tface(.32, .14, .68, .4, h(.85) + .2, '#86929a')
    s.dot((.5, .3, h(.85) + .4), '#4a5058')
    s.box(.47, .05, .53, .13, h(.85), h(1.0), '#b4bac0', 'metal'); s.box(.48, .1, .52, .22, h(.96), h(1.0), '#b4bac0', 'metal')
    s.box(.37, .06, .42, .11, h(.85), h(.92), '#c05048', 'metal'); s.box(.58, .06, .63, .11, h(.85), h(.92), '#4a78b8', 'metal')

@sk('Бойлер', '80 л, Ø45 см, висит на 1,1 м · горячая вода на 3–4 дня')
def _(s):
    s.box(.44, .04, .56, .1, h(1.3), h(1.6), '#6a6e74', 'metal', lip=False)       # кронштейн на стене
    s.cyl(.5, .3, .2, h(1.0), h(1.95), '#e8eae6', 'metal', top='#f2f4f0', ry=5)
    s.box(.44, .5, .56, .53, h(1.38), h(1.46), '#3a3c40', 'metal', lip=False); s.dot((.47, .535, h(1.42)), '#e0a040')   # термостат
    s.line((.44, .46, h(1.1)), (.44, .46, h(.15)), '#9aa0a6', 2); s.line((.56, .46, h(1.1)), (.56, .46, h(.15)), '#c0544c', 2)
    s.box(.4, .42, .48, .5, h(.7), h(.76), '#3a6ab0', 'metal'); s.box(.52, .42, .6, .5, h(.7), h(.76), '#c0544c', 'metal')   # краны

@sk('Кресло', '80×85 см, сиденье 45, спинка 95 · вздремнуть сидя')
def _(s):
    c = '#8c4a3a'; c2 = mul(hx(c), 1.1)
    legs(s, .12, .1, .88, .92, .06, h(.12), WOOD_D)
    s.box(.12, .1, .88, .92, h(.12), h(.3), c, 'fabric')                           # основание
    s.box(.12, .1, .88, .3, h(.3), h(.95), c, 'fabric')                            # спинка
    s.box(.12, .3, .26, .92, h(.3), h(.62), c, 'fabric'); s.box(.74, .3, .88, .92, h(.3), h(.62), c, 'fabric')   # подлокотники
    s.box(.26, .3, .74, .9, h(.3), h(.45), c2, 'fabric')                           # подушка сиденья
    s.box(.28, .28, .72, .36, h(.45), h(.82), c2, 'fabric')                        # подушка спинки

@sk('Журнальный столик', '100×55, высота 45 см · газеты и журналы')
def _(s):
    legs(s, .04, .24, .96, .78, .05, h(.42), WOOD_D)
    s.box(.06, .26, .94, .76, h(.12), h(.14), WOOD, 'wood', lip=False)             # нижняя полка
    s.box(.02, .22, .98, .8, h(.42), h(.46), WOOD_L, 'wood')
    s.box(.14, .32, .44, .58, h(.46), h(.47), '#e8e2d0', 'paint'); s.line((.18, .58, h(.47)), (.4, .58, h(.47)), '#9a9488')
    s.box(.2, .36, .46, .6, h(.14), h(.18), '#4a6a9a', 'paint')                    # журналы на полке
    s.cyl(.74, .48, .05, h(.46), h(.56), '#c04a3a', 'paint')

@sk('Торшер', 'высота 160 см, абажур Ø40 · свет при электричестве')
def _(s):
    s.cyl(.5, .5, .15, 0, h(.03), '#34343a', 'metal', top='#4a4a50')
    s.line((.5, .5, h(.03)), (.5, .5, h(1.32)), '#4a4a50', 2)
    x, y = s.P(.5, .5, h(1.32)); w0, w1, hh = 13, 8, 12   # абажур-усечённый конус
    s.d.polygon([(x - w0, y), (x + w0, y), (x + w1, y - hh), (x - w1, y - hh)], fill=(232, 212, 164, 255))
    s.d.polygon([(x - w0 + 4, y), (x - w0, y), (x - w1, y - hh), (x - w1 + 3, y - hh)], fill=(246, 230, 190, 255))
    s.d.polygon([(x + w0, y), (x + w0 - 5, y), (x + w1 - 3, y - hh), (x + w1, y - hh)], fill=(204, 182, 136, 255))
    s.d.ellipse([x - w1, y - hh - 2, x + w1, y - hh + 2], fill=(190, 168, 122, 255)); s.d.line([(x - w0, y), (x + w0, y)], fill=(190, 166, 118, 255))

@sk('Камин', '130×40, полка на 137 см · греет весь дом, нужны дрова')
def _(s):
    b = (.0, .04, 1.0, .44)
    s.box(*b, 0, h(1.3), '#9c5c48', 'stone')
    s.box(-.04, .02, 1.04, .5, h(1.3), h(1.37), '#5c3a2c', 'wood')                # полка
    s.box(-.02, .44, 1.02, .6, 0, h(.04), '#7a7a78', 'stone')                     # плита перед топкой
    s.sface('s', .2, .8, h(.04), h(.72), '#3a2c28', 'stone', box=b); s.sface('s', .25, .75, h(.04), h(.66), '#140f0d', 'plain', box=b)
    for xx, hh, c in ((.36, 9, '#e8742a'), (.46, 14, '#f4c444'), (.55, 11, '#e8742a'), (.64, 6, '#c8482a')):
        x0, y0 = s.P(xx, .45, h(.06)); s.d.polygon([(x0 - 4, y0), (x0 + 4, y0), (x0, y0 - hh)], fill=hx(c) + (255,))
    s.box(.32, .38, .68, .44, h(.04), h(.09), WOOD_D, 'wood')
    s.box(.14, .1, .24, .2, h(1.37), h(1.62), '#c8a040', 'metal')                 # часы
    s.cyl(.8, .22, .04, h(1.37), h(1.55), '#ece4d0', 'paint')                      # свеча

@sk('Пианино', '150×60, высота 125, клавиши на 72 см · разбирается на доски', (1.6, 1))
def _(s):
    b = (.05, .1, 1.55, .48); c = '#2c2422'
    s.box(*b, 0, h(1.25), c, 'wood')
    s.box(.05, .48, 1.55, .7, h(.68), h(.74), c, 'wood')                           # полка клавиатуры
    s.tface(.12, .5, 1.48, .66, h(.74) + .2, '#f2efe6', 'plain')
    for k in range(20):
        if k % 7 in (2, 6): continue
        xx = .16 + k * .066; s.tface(xx, .5, xx + .035, .57, h(.74) + .5, '#1a1616', 'plain')
    s.box(.05, .48, .13, .7, h(.12), h(.68), c, 'wood'); s.box(1.47, .48, 1.55, .7, h(.12), h(.68), c, 'wood')   # щёки
    s.box(.12, .62, .18, .7, 0, h(.12), c, 'wood'); s.box(1.42, .62, 1.48, .7, 0, h(.12), c, 'wood')
    s.box(.7, .16, .9, .2, h(1.25), h(1.4), '#e8e2d0', 'paint')                    # ноты

@sk('Двухъярусная кровать', '90×190, высота 160 · два спальных места', (1, 2))
def _(s):
    w = WOOD_L; x0, y0, x1, y1 = .05, .05, .95, 1.95; t = .06
    for x, y in ((x0, y0), (x1 - t, y0), (x0, y1 - t)): s.box(x, y, x + t, y + t, 0, h(1.6), w, 'wood')   # дальние стойки — первыми
    s.box(x0, y0, x1, y0 + t, h(1.3), h(1.4), w, 'wood')
    for z0, mat in ((h(.25), '#4a78a8'), (h(1.15), '#c0503e')):
        s.box(x0, y0, x1, y1, z0, z0 + 5, w, 'wood')
        s.box(x0 + .04, y0 + .04, x1 - .04, y1 - .04, z0 + 5, z0 + 10, mat, 'fabric')
        s.box(x0 + .12, y0 + .08, x1 - .12, y0 + .38, z0 + 10, z0 + 14, '#ece8de', 'fabric')
    s.box(x0, y1 - t, x1, y1, h(1.3), h(1.4), w, 'wood')                           # бортик верха спереди
    s.box(x1 - t, y1 - t, x1, y1, 0, h(1.6), w, 'wood')                            # ближняя стойка — последней
    for z in (h(.5), h(.75), h(1.0)): s.box(x1 - .01, 1.5, x1 + .02, 1.82, z, z + 2, mul(hx(w), .85), 'wood', lip=False)   # лестница

@sk('Письменный стол', '120×60, высота 75 · на нём часто лежат журналы', (1.2, 1))
def _(s):
    s.box(.05, .1, .45, .7, 0, h(.72), WOOD, 'wood')                               # тумба
    s.box(1.08, .1, 1.15, .7, 0, h(.72), WOOD, 'wood')                             # боковина
    s.box(.02, .08, 1.18, .72, h(.72), h(.76), WOOD_L, 'wood')
    for z0 in (h(.06), h(.28), h(.5)): s.sface('s', .08, .42, z0, z0 + h(.19), mul(hx(WOOD), 1.12), 'wood', box=(.05, .1, .45, .7)); s.dot((.25, .705, z0 + h(.1)), '#e0c080')
    s.box(.62, .16, .95, .4, h(.76), h(.77), '#e8e2d0', 'paint')                   # тетрадь
    s.cyl(.22, .26, .05, h(.76), h(.86), '#3a6a9a', 'paint')                       # стакан с карандашами
    s.box(.16, .16, .44, .22, h(.76), h(.98), '#2a2a2e', 'metal'); s.box(.17, .162, .43, .2, h(.79), h(.96), '#3a5a7a', 'metal')   # монитор
    # стул
    legs(s, .62, .8, .94, 1.12, .04, h(.45), '#3a3a3e', 'metal'); s.box(.6, .78, .96, 1.14, h(.45), h(.49), '#4a4a50', 'fabric'); s.box(.6, 1.1, .96, 1.14, h(.49), h(.9), '#4a4a50', 'fabric')

@sk('Верстак с тисками', '150×70, высота 90 · крафт быстрее и лучше', (1.5, 1))
def _(s):
    legs(s, .05, .14, 1.45, .84, .07, h(.86), WOOD_D)
    s.box(.08, .16, 1.42, .82, h(.18), h(.22), WOOD, 'wood', lip=False)            # нижняя полка
    s.box(.03, .12, 1.47, .86, h(.86), h(.92), WOOD_L, 'wood')
    s.box(.1, .14, 1.4, .2, h(.92), h(1.6), '#8a7458', 'wood', lip=False)          # перфопанель
    for xx, zz in ((.3, 1.3), (.5, 1.4), (.7, 1.25), (1.0, 1.35), (1.2, 1.3)): s.dot((xx, .205, h(zz)), '#5a4630', 1)
    s.line((.3, .21, h(1.3)), (.3, .21, h(1.08)), '#9aa0a6', 2); s.line((.7, .21, h(1.25)), (.7, .21, h(1.05)), '#c0503e', 3)   # инструменты на стене
    s.box(1.12, .62, 1.36, .84, h(.92), h(1.04), '#3a6a9a', 'metal'); s.box(1.18, .8, 1.3, .92, h(.94), h(1.0), '#9aa0a6', 'metal')   # тиски
    s.box(.2, .3, .56, .5, h(.92), h(1.04), '#c0503e', 'metal'); s.box(.32, .36, .44, .44, h(1.04), h(1.08), '#2a2a2a', 'metal')   # ящик с инструментом
    s.box(.2, .3, .6, .6, h(.22), h(.34), '#7a8088', 'metal')                      # металлолом снизу

@sk('Стеллаж с канистрами', '90×40, высота 180 · бензин, краска, масло')
def _(s):
    w = '#6a6e74'; x0, x1, y0, y1 = .05, .95, .2, .6
    for x in (x0, x1 - .04):
        for y in (y0, y1 - .04): s.box(x, y, x + .04, y + .04, 0, h(1.8), w, 'metal', lip=False)
    for z in (h(.08), h(.62), h(1.16), h(1.7)): s.box(x0, y0, x1, y1, z, z + 3, w, 'metal')
    s.box(.12, .28, .36, .56, h(.08) + 3, h(.58), '#c0302a', 'metal'); s.box(.28, .3, .34, .36, h(.58), h(.62), '#2a2a2a', 'metal')   # канистра
    s.box(.48, .28, .86, .56, h(.08) + 3, h(.42), '#3a7a46', 'metal')
    for xx, c in ((.2, '#e8c040'), (.45, '#e8e8e4'), (.7, '#4a7ab0')): s.cyl(xx, .42, .1, h(.62) + 3, h(.98), c, 'metal', top='#b8bcc0')
    s.box(.12, .26, .46, .56, h(1.16) + 3, h(1.4), '#9a7a4a', 'paint'); s.box(.54, .28, .86, .56, h(1.16) + 3, h(1.48), '#8a6a3a', 'paint')

@sk('Морозильный ларь', '100×65, высота 85 · еда не портится, пока есть ток')
def _(s):
    b = (.0, .18, 1.0, .83)
    s.box(*b, 0, h(.8), '#e8eae6', 'metal'); s.box(-.01, .17, 1.01, .84, h(.8), h(.86), '#f2f4f0', 'metal')
    s.sface('s', .38, .62, h(.72), h(.78), '#9aa0a6', 'metal', box=b)             # ручка
    s.sface('s', .06, .2, h(.06), h(.18), '#4a4e54', 'metal', box=b)              # решётка
    s.dot((.88, .835, h(.74)), '#40c060')
    s.sface('s', .02, .98, 0, h(.03), '#8a8e92', 'metal', box=b)

@sk('Буржуйка', '40×50, высота 60, труба до потолка · греет и готовит')
def _(s):
    b = (.3, .25, .7, .75)
    s.box(*b, h(.08), h(.6), '#3a3a3c', 'metal')
    for x, y in ((.31, .26), (.65, .26), (.31, .7), (.65, .7)): s.box(x, y, x + .04, y + .04, 0, h(.08), '#2a2a2c', 'metal', lip=False)
    s.sface('s', .36, .64, h(.18), h(.48), '#1c1c1e', 'metal', box=b); s.sface('s', .4, .6, h(.22), h(.4), '#e8742a', 'plain', box=b)
    s.sface('s', .4, .6, h(.42), h(.45), '#f4c444', 'plain', box=b)
    s.cyl(.5, .38, .06, h(.6), h(2.4), '#4a4a4e', 'metal')
    s.cyl(.58, .58, .08, h(.6), h(.74), '#8a8e94', 'metal', top='#6a6e74')        # чайник
    s.line((.66, .58, h(.68)), (.72, .6, h(.74)), '#8a8e94', 2)

@sk('Нары из досок', '80×190, высота 45 · 4 доски и гвозди', (1, 2))
def _(s):
    p = WOOD_L; x0, x1, y0, y1 = .1, .9, .05, 1.95
    legs(s, x0, y0, x1, y1, .07, h(.4), mul(hx(p), .78))
    s.box(x0, y0, x1, y0 + .07, h(.3), h(.36), mul(hx(p), .85), 'wood'); s.box(x0, y1 - .07, x1, y1, h(.3), h(.36), mul(hx(p), .85), 'wood')
    for k in range(7): y = y0 + k * .27; s.box(x0, y, x1, y + .25, h(.4), h(.45), mul(hx(p), 1 - .05 * (k % 2)), 'wood')
    s.box(x0 + .06, .4, x1 - .06, 1.85, h(.45), h(.5), '#6a7a5a', 'fabric')        # одеяло
    s.box(x0 + .1, .1, x1 - .1, .38, h(.45), h(.55), '#8a8478', 'fabric')          # свёрнутая куртка-подушка

@sk('Баррикада', 'доски поперёк проёма 90 см · держит орду дольше')
def _(s):
    s.box(.04, .38, .12, .46, 0, h(2.1), WOOD_D, 'wood'); s.box(.88, .38, .96, .46, 0, h(2.1), WOOD_D, 'wood')   # косяки
    for k, z in enumerate((.25, .7, 1.15, 1.6)):
        a, b = (.0, 1.0) if k % 2 else (.02, .98)
        s.box(a, .46, b, .54, h(z), h(z) + 7, mul(hx(WOOD_L), .9 + .08 * (k % 2)), 'wood')
        for x in (.08, .92): s.dot((x, .545, h(z) + 3.5), '#c8ccd2')
    s.box(.56, .58, .8, .82, 0, h(.4), '#8a7458', 'wood')                          # ящик подпирает

def sheet(out):
    import textwrap
    cols, K, cw, chh = 4, 4, 430, 470
    rows = math.ceil(len(SK) / cols)
    W, H = cols * cw + 40, rows * chh + 120
    img = Image.new('RGB', (W, H), (24, 28, 28)); d = ImageDraw.Draw(img)
    try:
        fb = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 28); fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 20); ft = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 42)
    except OSError: fb = fs = ft = ImageFont.load_default()
    d.text((30, 34), 'Новая мебель: эскизы в стиле игры', fill=(240, 196, 119), font=ft)
    for k, (name, note, fn, size) in enumerate(SK):
        sw, sl = size; s = Spr(ox=115 - (sw - sl) * U / 2, oy=150 - (sw + sl - 2) * HH / 2); fn(s); im = s.outline()
        floor = Image.new('RGBA', im.size, (0, 0, 0, 0)); fd = ImageDraw.Draw(floor)
        for tx in range(math.ceil(sw)):
            for ty in range(math.ceil(sl)):
                fd.polygon([s.P(tx, ty, 0), s.P(tx + 1, ty, 0), s.P(tx + 1, ty + 1, 0), s.P(tx, ty + 1, 0)], fill=(52, 44, 36, 255), outline=(70, 60, 48, 255))
        floor.alpha_composite(im); bb = floor.getbbox(); spr = floor.crop(bb)
        spr = spr.resize((spr.width * K, spr.height * K), Image.NEAREST)
        cx, cy = 20 + (k % cols) * cw, 120 + (k // cols) * chh
        box_h = chh - 120
        sc = min(1, (cw - 30) / spr.width, box_h / spr.height)
        if sc < 1: spr = spr.resize((int(spr.width * sc), int(spr.height * sc)), Image.NEAREST)
        img.paste(spr, (cx + (cw - spr.width) // 2, cy + box_h - spr.height), spr)
        d.text((cx + 14, cy + box_h + 12), f'{k + 1}. {name}', fill=(230, 224, 208), font=fb)
        for n, ln in enumerate(textwrap.wrap(note, 36)): d.text((cx + 14, cy + box_h + 50 + n * 24), ln, fill=(150, 156, 150), font=fs)
    img.save(out); print(len(SK), 'эскизов', img.size)

if __name__ == '__main__' and not (len(sys.argv) > 2 and sys.argv[2] == 'existing'):
    sheet(sys.argv[1] if len(sys.argv) > 1 else 'sketch.png')

# ---------- нынешняя мебель в реальных пропорциях ----------
EX = []
def ex(key, name, note, size=(1, 1)):
    def deco(fn): EX.append((key, name, note, fn, size)); return fn
    return deco
GLASS_W, WHITE, STEEL = '#e8eae6', '#eceeea', '#b4bac0'

@ex('f_wardrobe_0_1', 'Шкаф платяной', '100×60, высота 200')
def _(s):
    b = (.0, .2, 1.0, .8); c = WOOD
    s.box(*b, 0, h(2.0), c, 'wood'); s.box(-.02, .18, 1.02, .82, h(2.0), h(2.05), WOOD_D, 'wood')
    s.sface('s', .03, .49, h(.08), h(1.95), mul(hx(c), 1.1), 'wood', box=b); s.sface('s', .51, .97, h(.08), h(1.95), mul(hx(c), 1.1), 'wood', box=b)
    for x in (.44, .56): s.box(x, .8, x + .02, .83, h(.95), h(1.15), '#d8b870', 'metal', lip=False)
    s.sface('s', .02, .98, 0, h(.06), WOOD_D, 'wood', box=b)

@ex('f_fridge_0_1', 'Холодильник', '60×65, высота 185')
def _(s):
    b = (.2, .17, .8, .83)
    s.box(*b, h(.04), h(1.85), GLASS_W, 'metal'); s.box(.22, .2, .78, .8, 0, h(.04), '#3a3c40', 'metal', lip=False)
    s.sface('s', .22, .78, h(.06), h(1.2), mul(hx(GLASS_W), 1.03), 'metal', box=b); s.sface('s', .22, .78, h(1.23), h(1.82), mul(hx(GLASS_W), 1.03), 'metal', box=b)
    s.box(.72, .83, .74, .86, h(.75), h(1.1), '#9aa0a6', 'metal', lip=False); s.box(.72, .83, .74, .86, h(1.3), h(1.55), '#9aa0a6', 'metal', lip=False)
    s.sface('s', .3, .4, h(1.4), h(1.52), '#f0e6b0', 'paint', box=b, inset=.02); s.sface('s', .5, .55, h(.9), h(.95), '#c84a40', 'paint', box=b, inset=.02)

@ex('f_shelf_1_1', 'Стеллаж', '90×40, высота 180, металл')
def _(s):
    w = '#7a7e84'; x0, x1, y0, y1 = .05, .95, .3, .7
    for x in (x0, x1 - .04):
        for y in (y0, y1 - .04): s.box(x, y, x + .04, y + .04, 0, h(1.8), w, 'metal', lip=False)
    for z in (h(.1), h(.66), h(1.22), h(1.76)): s.box(x0, y0, x1, y1, z, z + 3, w, 'metal')
    for k, (xx, zz, c, hh) in enumerate(((.12, .1, '#c8a46a', .3), (.5, .1, '#b08a52', .38), (.15, .66, '#c84a40', .2), (.38, .66, '#4a7ab0', .2), (.6, .66, '#e8c040', .2), (.2, 1.22, '#8a9a6a', .25), (.55, 1.22, '#d8d4c8', .3))):
        s.box(xx, .36, xx + .26 if k < 2 else xx + .18, .64, h(zz) + 3, h(zz + hh), c, 'paint')

@ex('f_stove_0_1', 'Плита', '60×60, высота 85')
def _(s):
    b = (.2, .2, .8, .8); c = '#ececE8'
    s.box(*b, 0, h(.85), c, 'metal'); s.box(.2, .2, .8, .3, h(.85), h(1.0), mul(hx(c), .95), 'metal')
    for xx in (.3, .43, .57, .7): s.dot((xx, .3, h(.94)), '#3a3c40', 1)
    for x, y in ((.33, .4), (.67, .4), (.33, .68), (.67, .68)):
        p = s.P(x, y, h(.85)); s.d.ellipse([p[0] - 6, p[1] - 3, p[0] + 6, p[1] + 3], fill=(36, 36, 40, 255)); s.d.ellipse([p[0] - 3, p[1] - 1.5, p[0] + 3, p[1] + 1.5], fill=(80, 80, 86, 255))
    s.sface('s', .24, .76, h(.08), h(.62), '#2a2a2e', 'metal', box=b); s.sface('s', .3, .7, h(.14), h(.56), '#4a5660', 'metal', box=b)
    s.sface('s', .26, .74, h(.66), h(.69), '#a8acb0', 'metal', box=b, inset=.02)
    s.sface('s', .24, .76, h(.72), h(.8), mul(hx(c), .92), 'metal', box=b)

@ex('f_cabinet_0_1', 'Кухонная тумба', '60×60, высота 85, столешница')
def _(s):
    b = (.2, .22, .8, .8)
    s.box(*b, h(.08), h(.81), WOOD, 'wood'); s.box(.21, .24, .79, .78, 0, h(.08), WOOD_D, 'wood', lip=False)
    s.box(.18, .2, .82, .83, h(.81), h(.85), '#d8d4c8', 'stone')
    s.sface('s', .23, .77, h(.62), h(.77), mul(hx(WOOD), 1.12), 'wood', box=b); s.box(.46, .8, .54, .82, h(.68), h(.71), '#d8b870', 'metal', lip=False)
    s.sface('s', .23, .49, h(.12), h(.58), mul(hx(WOOD), 1.1), 'wood', box=b); s.sface('s', .51, .77, h(.12), h(.58), mul(hx(WOOD), 1.1), 'wood', box=b)
    for x in (.45, .53): s.box(x, .8, x + .02, .82, h(.3), h(.42), '#d8b870', 'metal', lip=False)

@ex('f_sink_0_1', 'Мойка', '60×60, высота 85, кран')
def _(s):
    b = (.2, .22, .8, .8)
    s.box(*b, h(.08), h(.81), WOOD, 'wood'); s.box(.21, .24, .79, .78, 0, h(.08), WOOD_D, 'wood', lip=False)
    s.box(.18, .2, .82, .83, h(.81), h(.85), '#c8ccce', 'metal')
    s.tface(.28, .32, .72, .74, h(.85) + .3, '#8a9298'); s.tface(.31, .35, .69, .71, h(.85) + .3, '#6a747c'); s.dot((.5, .53, h(.85) + .5), '#3a4048')
    s.box(.47, .22, .53, .28, h(.85), h(1.12), STEEL, 'metal'); s.box(.48, .26, .52, .44, h(1.07), h(1.12), STEEL, 'metal')
    s.sface('s', .23, .49, h(.12), h(.76), mul(hx(WOOD), 1.1), 'wood', box=b); s.sface('s', .51, .77, h(.12), h(.76), mul(hx(WOOD), 1.1), 'wood', box=b)
    for x in (.45, .53): s.box(x, .8, x + .02, .82, h(.5), h(.62), '#d8b870', 'metal', lip=False)

@ex('f_bed_0_1', 'Кровать двуспальная', '140×200, матрас на 50, изголовье 100', (1.4, 2))
def _(s):
    w = WOOD_D; x0, x1, y0, y1 = .02, 1.38, .02, 1.98
    s.box(x0, y0, x1, y0 + .08, 0, h(1.0), w, 'wood')                              # изголовье
    s.box(x0, y0 + .08, x1, y1, h(.08), h(.3), w, 'wood'); legs(s, x0, y0 + .08, x1, y1, .07, h(.08), w)
    s.box(x0 + .04, y0 + .1, x1 - .04, y1 - .04, h(.3), h(.5), '#ece8de', 'fabric')   # матрас
    s.box(x0 + .02, .78, x1 - .02, y1 - .02, h(.48), h(.54), '#8a3e36', 'fabric')     # одеяло
    s.box(x0 + .02, .78, x1 - .02, .9, h(.54), h(.56), '#f0ece2', 'fabric')           # отворот
    for xa in (.12, .74): s.box(xa, .16, xa + .52, .5, h(.5), h(.62), '#f4f0e6', 'fabric')   # две подушки
    s.box(x0, y1 - .06, x1, y1, h(.08), h(.42), w, 'wood')                         # изножье

@ex('f_sofa_0_1', 'Диван', '200×90, сиденье 45, спинка 85', (2, 1))
def _(s):
    c = '#8c4a3a'; c2 = mul(hx(c), 1.1); x0, x1, y0, y1 = .02, 1.98, .08, .94
    legs(s, x0 + .04, y0 + .04, x1 - .04, y1 - .04, .06, h(.1), WOOD_D)
    s.box(x0, y0, x1, y1, h(.1), h(.28), c, 'fabric')
    s.box(x0, y0, x1, y0 + .22, h(.28), h(.85), c, 'fabric')                       # спинка
    s.box(x0, y0 + .22, x0 + .16, y1, h(.28), h(.6), c, 'fabric'); s.box(x1 - .16, y0 + .22, x1, y1, h(.28), h(.6), c, 'fabric')
    for k in range(3):
        a = x0 + .17 + k * .55; s.box(a, y0 + .22, a + .53, y1 - .02, h(.28), h(.45), c2, 'fabric'); s.box(a + .02, y0 + .2, a + .51, y0 + .32, h(.45), h(.8), c2, 'fabric')

@ex('f_tv_0_1', 'Телевизор на тумбе', 'тумба 120×40×50, кинескоп', (1.2, 1))
def _(s):
    b = (.0, .3, 1.2, .7)
    s.box(*b, 0, h(.5), WOOD_D, 'wood')
    s.sface('s', .04, .58, h(.06), h(.44), mul(hx(WOOD_D), 1.15), 'wood', box=b); s.sface('s', .62, 1.16, h(.06), h(.44), mul(hx(WOOD_D), 1.15), 'wood', box=b)
    s.box(.32, .34, .88, .66, h(.5), h(.54), '#2a2a2e', 'metal')
    s.box(.34, .3, .86, .62, h(.54), h(1.02), '#2e2e32', 'metal')                  # корпус
    s.sface('s', .38, .82, h(.6), h(.98), '#1a1c20', 'metal', box=(.34, .3, .86, .62)); s.sface('s', .41, .79, h(.63), h(.95), '#3a5466', 'metal', box=(.34, .3, .86, .62))
    s.line((.5, .45, h(1.02)), (.42, .4, h(1.25)), '#9aa0a6'); s.line((.6, .45, h(1.02)), (.7, .4, h(1.25)), '#9aa0a6')   # антенна

@ex('f_dresser_0_1', 'Комод', '100×45, высота 90')
def _(s):
    b = (.0, .3, 1.0, .75)
    s.box(*b, h(.06), h(.86), WOOD, 'wood'); s.box(-.02, .28, 1.02, .77, h(.86), h(.9), WOOD_L, 'wood')
    s.box(.04, .32, .96, .73, 0, h(.06), WOOD_D, 'wood', lip=False)
    for k in range(4):
        z0 = h(.1 + k * .19); s.sface('s', .04, .96, z0, z0 + h(.16), mul(hx(WOOD), 1.12), 'wood', box=b)
        s.box(.44, .75, .56, .77, z0 + h(.07), z0 + h(.1), '#d8b870', 'metal', lip=False)
    s.box(.1, .38, .3, .6, h(.9), h(1.1), '#e8e2d0', 'paint')                     # рамка с фото

@ex('f_table_0_1', 'Стол обеденный', '120×80, высота 75', (1.2, 1))
def _(s):
    c = WOOD_L; legs(s, .06, .16, 1.14, .84, .06, h(.71), mul(hx(c), .8))
    s.box(.08, .18, 1.12, .82, h(.62), h(.71), mul(hx(c), .88), 'wood', lip=False)
    s.box(.0, .1, 1.2, .9, h(.71), h(.75), c, 'wood')
    p = s.P(.4, .5, h(.75)); s.d.ellipse([p[0] - 7, p[1] - 3.5, p[0] + 7, p[1] + 3.5], fill=(238, 236, 230, 255)); s.d.ellipse([p[0] - 4, p[1] - 2, p[0] + 4, p[1] + 2], fill=(212, 208, 198, 255))
    s.cyl(.78, .42, .05, h(.75), h(.85), '#4a7ab0', 'paint')

@ex('f_bath_0_1', 'Ванна', '170×75, высота 60', (1, 1.7))
def _(s):
    b = (.12, .0, .88, 1.7)
    s.box(*b, 0, h(.6), WHITE, 'stone')
    s.tface(.2, .08, .8, 1.62, h(.6) + .3, '#c8d0d4', 'stone'); s.tface(.24, .12, .76, 1.58, h(.6) + .3, '#98aab6', 'stone')
    s.tface(.27, .4, .73, 1.55, h(.6) + .4, '#7ea6c4', 'plain')                    # вода
    s.box(.46, .0, .54, .1, h(.6), h(.82), STEEL, 'metal'); s.box(.47, .06, .53, .2, h(.76), h(.82), STEEL, 'metal')

@ex('f_toilet_0_1', 'Унитаз', '40×65, бачок 80')
def _(s):
    s.box(.32, .14, .68, .32, h(.4), h(.8), WHITE, 'stone')                        # бачок
    s.box(.4, .2, .6, .3, h(.8), h(.82), '#d0d4d6', 'stone')
    s.box(.38, .3, .62, .6, 0, h(.3), WHITE, 'stone')                              # ножка
    s.box(.3, .3, .7, .78, h(.3), h(.42), WHITE, 'stone')                          # чаша
    s.tface(.36, .38, .64, .72, h(.42) + .3, '#a8b4ba'); s.tface(.4, .44, .6, .66, h(.42) + .3, '#86a0ae')

@ex('f_bookshelf_0_1', 'Книжный шкаф', '80×30, высота 200')
def _(s):
    b = (.1, .35, .9, .65); c = WOOD_D
    s.box(.1, .35, .9, .4, 0, h(2.0), c, 'wood')                                    # задняя стенка
    s.box(.1, .35, .14, .65, 0, h(2.0), c, 'wood'); s.box(.86, .35, .9, .65, 0, h(2.0), c, 'wood')
    cols = ['#8a2e2a', '#2e4a7a', '#3a6a3a', '#c8a040', '#6a3a6a', '#d8d4c8', '#9a5a2a']
    for k, z in enumerate((.05, .5, .95, 1.4)):
        s.box(.14, .4, .86, .65, h(z), h(z) + 3, c, 'wood')
        x = .16; n = 0
        while x < .8:
            w = .05 + .03 * hsh(k, n, 3); hh = .26 + .12 * hsh(n, k, 4)
            s.box(x, .44, min(.84, x + w), .62, h(z) + 3, h(z) + 3 + h(hh), cols[(k * 3 + n) % len(cols)], 'paint', lip=False); x += w + .005; n += 1
    s.box(.1, .35, .9, .65, h(1.96), h(2.0), c, 'wood')

@ex('f_hanger_0_1', 'Вешалка напольная', 'Ø40, высота 175')
def _(s):
    s.cyl(.5, .5, .15, 0, h(.04), WOOD_D, 'wood'); s.line((.5, .5, h(.04)), (.5, .5, h(1.75)), mul(hx(WOOD_D), 1.1), 3)
    for dx, dy in ((-.12, 0), (.12, 0), (0, -.12), (0, .12)): s.line((.5, .5, h(1.62)), (.5 + dx, .5 + dy, h(1.7)), WOOD_D, 2)
    s.box(.32, .48, .46, .56, h(.9), h(1.6), '#a8342e', 'fabric', lip=False); s.box(.54, .5, .66, .6, h(1.0), h(1.6), '#3a5a8a', 'fabric', lip=False)

@ex('f_nightstand_0_1', 'Тумбочка', '45×40, высота 55')
def _(s):
    b = (.28, .3, .72, .7)
    s.box(*b, h(.05), h(.52), WOOD, 'wood'); s.box(.26, .28, .74, .72, h(.52), h(.55), WOOD_L, 'wood')
    legs(s, .29, .31, .71, .69, .04, h(.05), WOOD_D)
    s.sface('s', .31, .69, h(.34), h(.48), mul(hx(WOOD), 1.12), 'wood', box=b); s.box(.47, .7, .53, .72, h(.4), h(.42), '#d8b870', 'metal', lip=False)
    s.cyl(.4, .45, .06, h(.55), h(.6), '#3a3a3e', 'metal'); s.line((.4, .45, h(.6)), (.4, .45, h(.8)), '#3a3a3e'); s.cyl(.4, .45, .08, h(.78), h(.88), '#e8d4a0', 'fabric')   # ночник

@ex('f_medcab_0_1', 'Аптечный шкаф', '60×40, высота 180, стекло')
def _(s):
    b = (.2, .3, .8, .7)
    s.box(*b, h(.1), h(1.8), '#e4e6e2', 'metal'); s.box(.22, .32, .78, .68, 0, h(.1), '#9aa0a6', 'metal', lip=False)
    s.sface('s', .24, .76, h(.14), h(.7), '#d4d8da', 'metal', box=b)
    s.sface('s', .24, .76, h(.76), h(1.74), '#a4bcc8', 'metal', box=b)
    for z in (h(1.08), h(1.4)): s.sface('s', .26, .74, z, z + 2, '#e8eaea', 'plain', box=b, inset=.02)
    for xx, zz, c in ((.3, .8, '#c84a40'), (.42, .8, '#f0f0ec'), (.56, .8, '#e8c040'), (.34, 1.12, '#4a7ab0'), (.5, 1.12, '#f0f0ec'), (.62, 1.44, '#8a6a3a')): s.sface('s', xx, xx + .08, h(zz), h(zz + .2), c, 'paint', box=b, inset=.03)
    s.sface('s', .46, .54, h(1.5), h(1.62), '#e84a40', 'plain', box=b, inset=.035); s.sface('s', .485, .515, h(1.47), h(1.65), '#e84a40', 'plain', box=b, inset=.036)

@ex('f_counter2_0_1', 'Прилавок с кассой', '120×60, высота 95', (1.2, 1))
def _(s):
    b = (.0, .25, 1.2, .85)
    s.box(*b, 0, h(.92), '#d8d4c8', 'paint'); s.box(-.02, .23, 1.22, .87, h(.92), h(.96), '#4a4a50', 'stone')
    s.sface('s', .02, 1.18, h(.4), h(.46), '#c84a40', 'paint', box=b)
    s.box(.7, .4, 1.0, .66, h(.96), h(1.04), '#3a3a3e', 'metal'); s.box(.74, .4, .96, .5, h(1.04), h(1.22), '#2a2a2e', 'metal')
    s.sface('s', .76, .94, h(1.08), h(1.2), '#4a8a5a', 'metal', box=(.74, .4, .96, .5))

@ex('crate', 'Ящик деревянный', '60×60×60')
def _(s):
    b = (.2, .2, .8, .8); c = '#a07a4a'
    s.box(*b, 0, h(.6), c, 'wood')
    for z in (h(.2), h(.4)):
        s.line((.2, .8, z), (.8, .8, z), mul(hx(c), .62)); s.line((.8, .8, z), (.8, .2, z), mul(hx(c), .5))
    s.box(.2, .78, .24, .82, 0, h(.6), mul(hx(c), .78), 'wood', lip=False); s.box(.76, .78, .8, .82, 0, h(.6), mul(hx(c), .78), 'wood', lip=False); s.box(.78, .2, .82, .24, 0, h(.6), mul(hx(c), .7), 'wood', lip=False)
    s.line((.24, .81, h(.04)), (.76, .81, h(.56)), mul(hx(c), .7), 2)

@ex('barrel', 'Бочка для воды', 'Ø60, высота 90')
def _(s):
    s.cyl(.5, .5, .28, 0, h(.9), '#2a5a9a', 'metal', top='#3a6aaa')
    rx = .28 * U * 1.41; ry = rx / 2
    for z in (h(.15), h(.75)): x, y = s.P(.5, .5, z); s.d.arc([x - rx, y - ry, x + rx, y + ry], 0, 180, fill=(24, 52, 96, 255), width=2)
    x, y = s.P(.5, .5, h(.9)); s.d.ellipse([x - rx * .75, y - ry * .75, x + rx * .75, y + ry * .75], fill=(36, 74, 124, 255))
    s.dot((.5 + .14, .5 - .02, h(.9) + 1), '#c8ccd2', 1)   # пробка

def sheet_existing(out, atlas='assets/atlas.json', sprites='assets/sprites'):
    import json, textwrap, os
    meta = json.load(open(atlas))['frames']; sheets = {}
    cols, K, cw, chh = 4, 3, 440, 470
    rows = math.ceil(len(EX) / cols)
    img = Image.new('RGB', (cols * cw + 40, rows * chh + 130), (24, 28, 28)); d = ImageDraw.Draw(img)
    fb = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26); fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 19); ft = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 40); fl = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 17)
    d.text((30, 30), 'Нынешняя мебель: было → в реальных пропорциях', fill=(240, 196, 119), font=ft)
    for k, (key, name, note, fn, size) in enumerate(EX):
        cx, cy = 20 + (k % cols) * cw, 120 + (k // cols) * chh; box_h = chh - 110
        sw, sl = size; s = Spr(ox=115 - (sw - sl) * U / 2, oy=150 - (sw + sl - 2) * HH / 2); fn(s); im = s.outline()
        fl_ = Image.new('RGBA', im.size, (0, 0, 0, 0)); fd = ImageDraw.Draw(fl_)
        for tx in range(math.ceil(sw)):
            for ty in range(math.ceil(sl)): fd.polygon([s.P(tx, ty, 0), s.P(tx + 1, ty, 0), s.P(tx + 1, ty + 1, 0), s.P(tx, ty + 1, 0)], fill=(52, 44, 36, 255), outline=(70, 60, 48, 255))
        fl_.alpha_composite(im); new = fl_.crop(fl_.getbbox())
        old = None
        f = meta.get(key)
        if f:
            if f[0] not in sheets: sheets[f[0]] = Image.open(os.path.join(sprites, f[0] + '.png')).convert('RGBA')
            o = sheets[f[0]].crop((f[1], f[2], f[1] + f[3], f[2] + f[4]))
            # same floor tile under the old sprite (anchor f[5], f[6] = tile centre)
            ob = Image.new('RGBA', (o.width + 80, o.height + 40), (0, 0, 0, 0)); od = ImageDraw.Draw(ob); ax, ay = f[5] + 40, f[6] + 20
            od.polygon([(ax, ay - 16), (ax + 32, ay), (ax, ay + 16), (ax - 32, ay)], fill=(52, 44, 36, 255), outline=(70, 60, 48, 255)); ob.alpha_composite(o, (40, 20)); old = ob.crop(ob.getbbox())
        # both at the same scale, bottoms aligned
        sc = min(K, (box_h - 10) / max(new.height, old.height if old else 1), (cw - 40) / ((old.width if old else 0) + new.width + 4))
        def put(im_, x):
            r = im_.resize((max(1, int(im_.width * sc)), max(1, int(im_.height * sc))), Image.NEAREST); img.paste(r, (x, cy + box_h - r.height), r); return r.width
        x = cx + 10
        if old: wv = put(old, x); d.text((x, cy + box_h + 4), 'было', fill=(130, 136, 130), font=fl); x += wv + int(18 * sc / 2) + 10
        wv = put(new, x); d.text((x, cy + box_h + 4), 'стало', fill=(240, 196, 119), font=fl)
        d.text((cx + 14, cy + box_h + 30), name, fill=(230, 224, 208), font=fb)
        for n, ln in enumerate(textwrap.wrap(note, 38)): d.text((cx + 14, cy + box_h + 64 + n * 22), ln, fill=(150, 156, 150), font=fs)
    img.save(out); print(len(EX), 'предметов', img.size)

if __name__ == '__main__' and len(sys.argv) > 2 and sys.argv[2] == 'existing':
    sheet_existing(sys.argv[1])
