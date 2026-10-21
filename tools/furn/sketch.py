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
    def __init__(s, w=150, h=150, ox=75, oy=118):
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
WOOD, WOOD_D, WOOD_L = '#7a5636', '#5c3f27', '#9c744a'
SK = []
def sk(name, note):
    def deco(fn): SK.append((name, note, fn)); return fn
    return deco

@sk('Стиральная машина', 'ванная · стирка одежды и бинтов (нужна вода)')
def _(s):
    b = (.18, .2, .84, .82); s.box(*b, 0, 40, '#e4e6e2', 'metal')
    s.sface('s', .2, .82, 34, 39, '#c8ccd0', box=b); s.dot((.3, .82, 36.5), '#3a8ad0'); s.dot((.38, .82, 36.5), '#d04a3a')
    x, y = s.P(.52, .82, 18); s.d.ellipse([x - 12, y - 11, x + 12, y + 11], fill=(70, 74, 80, 255)); s.d.ellipse([x - 9, y - 8, x + 9, y + 8], fill=(120, 150, 170, 255)); s.d.ellipse([x - 5, y - 6, x + 1, y - 2], fill=(190, 210, 222, 255))
    s.box(.6, .4, .78, .56, 40, 46, '#8aa8c0', 'fabric')   # stack of laundry on top

@sk('Умывальник с зеркалом', 'ванная · вода, пока есть водопровод')
def _(s):
    s.box(.4, .12, .54, .28, 0, 30, '#d8dad6', 'stone')     # pedestal
    s.box(.2, .06, .8, .5, 28, 36, '#e8eae6', 'stone', top='#eef0ec')
    s.tface(.28, .12, .72, .42, 36.2, '#9aa4ac'); s.tface(.32, .16, .68, .38, 36.2, '#7c8890')
    s.box(.46, .06, .54, .16, 36, 42, '#b8bec4', 'metal'); s.box(.47, .12, .53, .26, 40, 42, '#b8bec4', 'metal')
    s.box(.24, .02, .76, .06, 46, 86, '#c8d4da', 'metal', lip=False)   # mirror on the wall
    s.sface('s', .27, .73, 49, 83, '#9fb8c6', 'metal', box=(.24, .02, .76, .06)); s.line((.34, .065, 78), (.44, .065, 60), '#e6f2f8')

@sk('Бойлер', 'ванная · запас горячей воды на 3–4 дня')
def _(s):
    s.cyl(.5, .3, .22, 30, 84, '#e6e8e4', 'metal', top='#f0f2ee')
    s.box(.44, .38, .56, .5, 24, 30, '#a8aeb4', 'metal'); s.line((.45, .5, 24), (.45, .5, 6), '#8a9096', 2); s.line((.55, .5, 24), (.55, .5, 6), '#c0504a', 2)
    s.dot((.5, .52, 56), '#3a3c40', 2); s.dot((.5, .52, 56), '#e0b040', 0)

@sk('Кресло', 'гостиная · можно вздремнуть, отдых лучше, чем на полу')
def _(s):
    c = '#8a4a3a'
    s.box(.2, .2, .82, .82, 0, 6, WOOD_D, 'wood')
    s.box(.2, .2, .82, .36, 6, 40, c, 'fabric')               # back
    s.box(.2, .36, .34, .82, 6, 24, c, 'fabric'); s.box(.68, .36, .82, .82, 6, 24, c, 'fabric')   # arms
    s.box(.34, .36, .68, .8, 6, 16, mul(hx(c), 1.12), 'fabric')   # seat cushion
    s.box(.4, .3, .62, .38, 26, 34, '#d8c49a', 'fabric')      # a small cushion

@sk('Журнальный столик', 'гостиная · сверху газеты и журналы')
def _(s):
    for x, y in ((.16, .26), (.78, .26), (.16, .72), (.78, .72)): s.box(x, y, x + .06, y + .06, 0, 14, WOOD_D, 'wood')
    s.box(.14, .24, .86, .8, 14, 18, WOOD_L, 'wood')
    s.box(.2, .32, .5, .58, 18, 19, '#e8e2d0', 'paint'); s.line((.24, .58, 19), (.46, .58, 19), '#8a8478')   # newspaper
    s.cyl(.66, .48, .05, 18, 25, '#c04a3a', 'paint')          # mug

@sk('Торшер', 'гостиная · свет, пока есть электричество')
def _(s):
    s.cyl(.5, .5, .12, 0, 3, '#3a3a3e', 'metal'); s.line((.5, .5, 3), (.5, .5, 66), '#4a4a50', 2)
    x, y = s.P(.5, .5, 66); s.d.polygon([(x - 13, y + 6), (x + 13, y + 6), (x + 8, y - 12), (x - 8, y - 12)], fill=(232, 210, 160, 255))
    for k in range(-12, 13, 3): s.d.point((x + k, y + 5), fill=(250, 236, 196, 255))
    s.d.polygon([(x - 8, y - 12), (x + 8, y - 12), (x + 6, y - 14), (x - 6, y - 14)], fill=(200, 178, 130, 255))

@sk('Камин', 'гостиная · греет весь дом, нужны дрова')
def _(s):
    b = (.08, .06, .92, .5)
    s.box(*b, 0, 54, '#9a5a46', 'stone')
    s.box(.02, .04, .98, .56, 54, 60, '#5c3a2c', 'wood')      # mantel shelf
    s.sface('s', .26, .74, 0, 34, '#2a2220', 'stone', box=b); s.sface('s', .3, .7, 0, 30, '#120e0c', 'plain', box=b)
    for x, h, c in ((.36, 9, '#e8742a'), (.46, 13, '#f0c040'), (.56, 10, '#e8742a'), (.62, 6, '#c04a2a')):
        x0, y0 = s.P(x, .52, 2); s.d.polygon([(x0 - 4, y0), (x0 + 4, y0), (x0, y0 - h)], fill=hx(c) + (255,))
    s.box(.32, .44, .68, .5, 0, 3, WOOD_D, 'wood')
    s.box(.2, .1, .3, .2, 60, 70, '#c8a040', 'metal'); s.cyl(.7, .2, .05, 60, 72, '#e8e0cc', 'paint')   # clock, candle

@sk('Пианино', 'гостиная · можно разобрать на много досок')
def _(s):
    b = (.04, .1, .96, .46)
    s.box(*b, 0, 52, '#2a2422', 'wood')
    s.box(.04, .46, .96, .66, 26, 30, '#2a2422', 'wood')      # key shelf
    s.tface(.08, .48, .92, .62, 30.2, '#f2efe6', 'plain')
    for k in range(13): x = .1 + k * .064; s.tface(x, .48, x + .03, .54, 30.6, '#1a1616', 'plain')
    s.box(.1, .5, .16, .64, 0, 26, '#2a2422', 'wood'); s.box(.84, .5, .9, .64, 0, 26, '#2a2422', 'wood')
    s.box(.4, .14, .6, .2, 52, 60, '#e8e2d0', 'paint')        # sheet music

@sk('Двухъярусная кровать', 'детская · два спальных места')
def _(s):
    w = WOOD_L
    for x, y in ((.12, .08), (.82, .08), (.12, .86), (.82, .86)): s.box(x, y, x + .06, y + .06, 0, 74, w, 'wood')
    s.box(.12, .08, .88, .92, 8, 13, w, 'wood'); s.box(.16, .12, .84, .88, 13, 18, '#4a78a8', 'fabric'); s.box(.2, .14, .8, .3, 18, 22, '#ece8de', 'fabric')
    s.box(.12, .08, .88, .92, 46, 51, w, 'wood'); s.box(.16, .12, .84, .88, 51, 56, '#c0503e', 'fabric'); s.box(.2, .14, .8, .3, 56, 60, '#ece8de', 'fabric')
    for z in (24, 34, 44): s.line((.88, .7, z), (.88, .84, z), mul(hx(w), .8), 2)   # ladder

@sk('Письменный стол', 'детская/кабинет · на нём часто лежат журналы')
def _(s):
    b = (.08, .12, .92, .62)
    s.box(.08, .12, .3, .62, 0, 28, WOOD, 'wood'); s.box(.78, .12, .92, .62, 0, 28, WOOD, 'wood')
    s.box(.06, .1, .94, .64, 28, 32, WOOD_L, 'wood')
    for z in (6, 16): s.sface('s', .1, .28, z, z + 8, mul(hx(WOOD), 1.12), 'wood', box=(.08, .12, .3, .62)); s.dot((.19, .625, z + 4), '#e0c080')
    s.box(.5, .18, .74, .36, 32, 34, '#e8e2d0', 'paint'); s.box(.16, .2, .26, .3, 32, 40, '#3a6a9a', 'paint')   # notebook, pencil cup
    s.box(.4, .7, .62, .9, 0, 18, '#3a3a3e', 'metal'); s.box(.4, .86, .62, .92, 18, 36, '#3a3a3e', 'metal')   # chair

@sk('Верстак с тисками', 'гараж · крафт быстрее и качественнее')
def _(s):
    for x, y in ((.06, .14), (.88, .14), (.06, .64), (.88, .64)): s.box(x, y, x + .06, y + .06, 0, 30, WOOD_D, 'wood')
    s.box(.06, .14, .94, .7, 8, 11, WOOD, 'wood'); s.box(.04, .12, .96, .72, 30, 35, WOOD_L, 'wood')
    s.box(.7, .5, .86, .7, 35, 42, '#3a6a9a', 'metal'); s.box(.74, .62, .82, .74, 37, 41, '#9aa0a6', 'metal')   # vice
    s.box(.12, .2, .38, .34, 35, 39, '#c0503e', 'metal')      # toolbox
    s.line((.42, .58, 35.5), (.6, .5, 35.5), '#8a6440', 2); s.box(.58, .46, .64, .54, 35, 38, '#6a7076', 'metal')   # hammer
    s.box(.1, .2, .3, .5, 11, 18, '#7a8088', 'metal')         # scrap under the bench

@sk('Стеллаж с канистрами', 'гараж · бензин, краска, масло')
def _(s):
    w = '#6a6e74'
    for x in (.1, .86): s.box(x, .2, x + .04, .64, 0, 70, w, 'metal')
    for z in (2, 24, 46, 68): s.box(.1, .2, .9, .64, z, z + 3, w, 'metal')
    s.box(.16, .3, .34, .56, 5, 21, '#c0302a', 'metal'); s.box(.22, .32, .28, .38, 21, 24, '#2a2a2a', 'metal')   # jerrycan
    s.box(.44, .28, .82, .58, 5, 17, '#3a8a4a', 'metal')
    for x, c in ((.18, '#e8c040'), (.4, '#e8e8e4'), (.62, '#4a7ab0')): s.cyl(x + .08, .44, .08, 27, 41, c, 'metal', top='#b8bcc0')
    s.box(.2, .3, .44, .56, 49, 57, '#9a7a4a', 'paint'); s.box(.56, .32, .8, .56, 49, 61, '#8a6a3a', 'paint')

@sk('Морозильный ларь', 'гараж/кухня · еда не портится, пока есть ток')
def _(s):
    b = (.06, .16, .94, .76)
    s.box(*b, 0, 34, '#e8eae6', 'metal'); s.box(.05, .15, .95, .77, 34, 38, '#f0f2ee', 'metal')
    s.sface('s', .4, .6, 30, 33, '#9aa0a6', 'metal', box=b); s.sface('s', .1, .2, 4, 8, '#3a3c40', 'metal', box=b)
    s.dot((.86, .765, 30), '#40c060')

@sk('Буржуйка', 'самодельная печка · греет и на ней можно готовить')
def _(s):
    s.box(.22, .22, .78, .78, 4, 34, '#3a3a3c', 'metal')
    for x, y in ((.24, .24), (.7, .24), (.24, .7), (.7, .7)): s.box(x, y, x + .06, y + .06, 0, 4, '#2a2a2c', 'metal')
    s.sface('s', .34, .66, 10, 24, '#1a1a1a', 'metal', box=(.22, .22, .78, .78)); s.sface('s', .38, .62, 12, 20, '#e8742a', 'plain', box=(.22, .22, .78, .78))
    s.cyl(.5, .4, .08, 34, 90, '#4a4a4e', 'metal')              # flue pipe up
    s.cyl(.6, .58, .1, 34, 40, '#8a8e94', 'metal', top='#6a6e74')   # kettle
    s.d.point(s.P(.6, .58, 46), fill=(200, 200, 200, 160)); s.d.point(s.P(.58, .56, 50), fill=(200, 200, 200, 120))

@sk('Нары из досок', 'крафт · 4 доски и гвозди, лучше сна на полу')
def _(s):
    p = WOOD_L
    for x, y in ((.12, .1), (.82, .1), (.12, .84), (.82, .84)): s.box(x, y, x + .06, y + .06, 0, 16, mul(hx(p), .8), 'wood')
    for k in range(5): y = .1 + k * .16; s.box(.1, y, .9, y + .14, 16, 20, mul(hx(p), 1 - .04 * (k % 2)), 'wood')
    s.box(.16, .14, .84, .7, 20, 24, '#6a7a5a', 'fabric'); s.box(.2, .7, .5, .86, 20, 26, '#8a8478', 'fabric')   # blanket, rolled coat

@sk('Баррикада', 'крафт · доски поперёк проёма, держит орду дольше')
def _(s):
    s.box(.12, .36, .2, .44, 0, 66, WOOD_D, 'wood'); s.box(.8, .36, .88, .44, 0, 66, WOOD_D, 'wood')   # posts behind
    for k, (z, t) in enumerate(((6, 0), (22, 1), (38, 0), (54, 1))):
        a, b = (.02, .98) if t else (.06, .94)
        s.box(a, .44, b, .54, z, z + 9, mul(hx(WOOD_L), .9 + .08 * (k % 2)), 'wood')
        for x in (a + .1, b - .12): s.dot((x, .545, z + 4.5), '#c8ccd2')
    s.box(.56, .6, .78, .8, 0, 12, '#8a7458', 'wood')         # a crate propping it up

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
    for k, (name, note, fn) in enumerate(SK):
        s = Spr(); fn(s); im = s.outline()
        floor = Image.new('RGBA', im.size, (0, 0, 0, 0)); fd = ImageDraw.Draw(floor)
        fd.polygon([s.P(0, 0, 0), s.P(1, 0, 0), s.P(1, 1, 0), s.P(0, 1, 0)], fill=(52, 44, 36, 255), outline=(70, 60, 48, 255))
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

if __name__ == '__main__':
    sheet(sys.argv[1] if len(sys.argv) > 1 else 'sketch.png')
