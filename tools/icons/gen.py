# Pixel-art item icons for «Карантин»: 32x32 art pixels, outlined, light from the top-left.
# Output: icons.png (8 columns of 96x96 cells, nearest-neighbour x3) + icons.json (rects).
import json, math, sys
from PIL import Image, ImageDraw

def hx(h):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)
def sh(c, k):
    if isinstance(c, str): c = hx(c)
    return tuple(max(0, min(255, round(v * k))) for v in c[:3]) + (255,)
def mix(a, b, t):
    a = hx(a) if isinstance(a, str) else a; b = hx(b) if isinstance(b, str) else b
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)
def col(c): return hx(c) if isinstance(c, str) else c

class Ic:
    def __init__(s):
        s.im = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); s.d = ImageDraw.Draw(s.im); s.px = s.im.load()
    def p(s, x, y, c):
        if 0 <= x < 32 and 0 <= y < 32: s.px[int(x), int(y)] = col(c)
    def rect(s, x0, y0, x1, y1, c): s.d.rectangle([x0, y0, x1, y1], fill=col(c))
    def box(s, x0, y0, x1, y1, c, hl=1.22, dk=.7):
        c = col(c); s.rect(x0, y0, x1, y1, c)
        s.rect(x0, y0, x1, y0, sh(c, hl)); s.rect(x0, y0, x0, y1, sh(c, hl * .96))
        s.rect(x0, y1, x1, y1, sh(c, dk)); s.rect(x1, y0 + 1, x1, y1, sh(c, dk * 1.05))
    def ell(s, x0, y0, x1, y1, c): s.d.ellipse([x0, y0, x1, y1], fill=col(c))
    def ball(s, x0, y0, x1, y1, c, hl=True):
        c = col(c); s.ell(x0, y0, x1, y1, sh(c, .68)); s.ell(x0, y0, x1 - 1, y1 - 1, c)
        if hl:
            w, h = x1 - x0, y1 - y0
            s.ell(x0 + round(w * .18), y0 + round(h * .16), x0 + max(round(w * .18) + 1, round(w * .42)), y0 + max(round(h * .16) + 1, round(h * .36)), sh(c, 1.3))
    def poly(s, pts, c): s.d.polygon([tuple(p) for p in pts], fill=col(c))
    def line(s, pts, c, w=1): s.d.line([tuple(p) for p in pts], fill=col(c), width=w)
    def cyl(s, x0, y0, x1, y1, c, top=None, ry=2, bot=True):
        c = col(c); w = max(1, x1 - x0)
        for x in range(x0, x1 + 1):
            t = (x - x0) / w; k = 1.28 if t < .2 else 1.1 if t < .45 else .95 if t < .75 else .74
            s.rect(x, y0 + ry, x, y1 - (ry if bot else 0), sh(c, k))
        if bot:
            for x in range(x0, x1 + 1):
                t = (x - x0) / w; k = 1.28 if t < .2 else 1.1 if t < .45 else .95 if t < .75 else .74
                dy = round(ry * math.sqrt(max(0, 1 - ((t * 2 - 1) ** 2))))
                s.rect(x, y1 - ry, x, y1 - ry + dy, sh(c, k))
        tc = col(top) if top else sh(c, 1.18)
        s.ell(x0, y0, x1, y0 + ry * 2, tc)
    def hl(s, x0, y0, x1, y1, k=1.3):  # brighten a region that is already painted
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                if 0 <= x < 32 and 0 <= y < 32 and s.px[x, y][3]: s.px[x, y] = sh(s.px[x, y], k)
    def outline(s):
        src = s.im.copy(); sp = src.load(); out = (28, 24, 26, 255)
        for y in range(32):
            for x in range(32):
                if sp[x, y][3]: continue
                n = [sp[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < 32 and 0 <= y + dy < 32 and sp[x + dx, y + dy][3]]
                if n: s.px[x, y] = mix(sh(n[0], .32), out, .5)

ICONS = {}
def icon(*names):
    def deco(fn):
        for n in names: ICONS[n] = fn
        return fn
    return deco

# ---------------- archetypes ----------------
def can(i, body, band, y0=8, y1=26, x0=9, x1=22, lid='#ccd1d6', detail=None):
    i.cyl(x0, y0, x1, y1, body, top=lid)
    i.rect(x0 + 1, y0 + 3, x0 + 1, y0 + 3, sh(lid, .8))
    bt, bb = y0 + 5, y1 - 4
    for x in range(x0, x1 + 1):
        t = (x - x0) / (x1 - x0); k = 1.2 if t < .2 else 1.05 if t < .45 else .95 if t < .75 else .72
        i.rect(x, bt, x, bb, sh(band, k))
    if detail: detail(i, x0, bt, x1, bb)
def flatcan(i, body, lid, band):
    i.ell(5, 12, 26, 27, sh(body, .7)); i.rect(5, 16, 26, 22, sh(body, .9)); i.ell(5, 11, 26, 22, lid)
    i.ell(7, 13, 24, 20, sh(lid, 1.12)); i.rect(5, 18, 26, 21, band); i.rect(5, 21, 26, 22, sh(band, .7))
def jar(i, content, lid='#c9a43a', fill=.72, deco=None):
    glass = (190, 214, 224, 255)
    i.box(8, 9, 23, 27, sh(glass, .85)); i.rect(9, 10, 22, 26, sh(glass, .95))
    top = 10 + round(16 * (1 - fill))
    if content:
        i.rect(9, top, 22, 26, content); i.rect(9, top, 22, top, sh(content, 1.25)); i.rect(20, top + 1, 22, 26, sh(content, .75))
        if deco: deco(i, top)
    i.rect(10, 11, 10, 24, (238, 246, 250, 255)); i.rect(11, 12, 11, 15, (238, 246, 250, 255))
    i.box(8, 5, 23, 9, lid); i.rect(9, 7, 22, 7, sh(lid, .8))
def bottle(i, glass, liquid, cap, label=None, x0=11, x1=20, y0=11, neck=(13, 18), lvl=.75, capc=None):
    gl = col(glass)
    i.rect(neck[0], 5, neck[1], y0, sh(gl, .95)); i.rect(neck[0], 5, neck[0], y0, sh(gl, 1.2))
    i.box(x0, y0, x1, 28, gl)
    if liquid:
        t = y0 + 1 + round((27 - y0) * (1 - lvl)); i.rect(x0 + 1, t, x1 - 1, 27, liquid); i.rect(x1 - 2, t, x1 - 1, 27, sh(liquid, .75)); i.rect(x0 + 1, t, x1 - 1, t, sh(liquid, 1.25))
    i.rect(x0 + 1, y0 + 2, x0 + 1, 25, sh(gl, 1.45))
    if label: i.box(x0, y0 + 6, x1, y0 + 11, label)
    if cap: i.box(neck[0] - 1, 3, neck[1] + 1, 6, cap)
def pillbottle(i, body, cap, label):
    i.cyl(10, 11, 21, 27, body, ry=1); i.box(9, 6, 22, 11, cap); i.rect(10, 8, 21, 8, sh(cap, .8))
    i.rect(10, 15, 21, 22, label); i.rect(10, 15, 21, 15, sh(label, 1.2)); i.rect(19, 16, 21, 22, sh(label, .8))
def carton(i, body, band, top=None):
    i.poly([(10, 9), (16, 4), (21, 9)], top or sh(body, 1.1)); i.rect(15, 3, 17, 5, sh(body, .9))
    i.box(10, 9, 21, 28, body); i.rect(16, 10, 21, 27, sh(body, .86)); i.rect(10, 16, 21, 22, band); i.rect(16, 16, 21, 22, sh(band, .85))
def bag(i, body, top, y0=7):
    i.poly([(8, y0 + 3), (23, y0 + 3), (25, 27), (6, 27)], body)
    i.poly([(16, y0 + 3), (23, y0 + 3), (25, 27), (17, 27)], sh(body, .82))
    for x in range(7, 25, 2): i.p(x, y0 + 2, top); i.p(x + 1, y0 + 1, top)
    i.rect(7, y0 + 2, 24, y0 + 3, top); i.rect(7, 26, 25, 27, sh(body, .6))
def book(i, cover, emblem=None, vol=0, page='#ece4cc'):
    i.rect(8, 6, 24, 27, sh(page, .85)); i.rect(9, 26, 24, 27, page); i.rect(23, 7, 24, 27, page)
    i.box(7, 5, 22, 26, cover); i.rect(7, 5, 8, 26, sh(cover, .7)); i.rect(10, 8, 20, 10, sh(cover, 1.35))
    if emblem: emblem(i)
    if vol:
        i.rect(9, 23, 20, 25, sh(cover, .55))
        for k in range(vol): i.rect(10 + k * 4, 24, 12 + k * 4, 24, (246, 200, 60, 255))
def bowl(i, food, rim='#d9d4c8', deco=None):
    i.ell(5, 12, 26, 28, sh(rim, .75)); i.rect(5, 17, 26, 19, sh(rim, .95)); i.ell(5, 11, 26, 20, rim)
    i.ell(7, 12, 24, 19, food); i.ell(8, 12, 18, 16, sh(food, 1.18))
    if deco: deco(i)
    i.rect(8, 22, 23, 22, sh(rim, 1.1))
def steam(i, x=14):
    for k, dx in enumerate((0, 4)):
        i.p(x + dx, 6, (230, 230, 230, 255)); i.p(x + dx + 1, 5, (230, 230, 230, 255)); i.p(x + dx, 4, (230, 230, 230, 255))
def stick(i, a, b, c, w=2):
    i.line([a, b], c, w)
def diag_handle(i, x0, y0, x1, y1, c, w=3):
    i.line([(x0, y0), (x1, y1)], c, w); i.line([(x0, y0 - 1), (x1, y1 - 1)], sh(c, 1.25), 1)
def torso(i, body, collar=None, zip=None, hood=None, sleeves=None):
    s = sleeves or sh(body, .9)
    i.poly([(5, 10), (11, 6), (20, 6), (26, 10), (28, 20), (24, 21), (23, 14), (23, 28), (8, 28), (8, 14), (7, 21), (3, 20)], body)
    i.poly([(26, 10), (28, 20), (24, 21), (23, 14)], sh(s, .8)); i.poly([(5, 10), (3, 20), (7, 21), (8, 14)], s)
    i.rect(17, 7, 23, 27, sh(body, .88)); i.rect(8, 27, 23, 28, sh(body, .65))
    if hood: i.poly([(10, 7), (16, 3), (21, 7), (19, 9), (12, 9)], hood)
    if collar: i.poly([(11, 6), (16, 11), (20, 6)], collar)
    if zip: i.rect(15, 9, 15, 27, zip)

# ---------------- food: tins ----------------
@icon('canned')
def _(i): can(i, '#aeb4ba', '#b5392b', detail=lambda i, a, b, c, d: (i.rect(a + 3, b + 2, c - 4, b + 3, (238, 230, 210, 255)), i.rect(a + 4, b + 5, c - 5, b + 6, (232, 196, 80, 255))))
@icon('beans')
def _(i): can(i, '#aeb4ba', '#9a5a2c', detail=lambda i, a, b, c, d: [i.ell(x, y, x + 2, y + 1, (214, 160, 96, 255)) for x, y in ((a + 3, b + 2), (a + 7, b + 4), (a + 4, b + 6), (a + 9, b + 2))])
@icon('stew')
def _(i): can(i, '#aeb4ba', '#2f5596', detail=lambda i, a, b, c, d: (i.rect(a, b + 3, c, b + 4, (240, 240, 236, 255)), i.rect(a + 4, b + 1, a + 6, b + 2, (200, 60, 50, 255))))
@icon('condmilk')
def _(i): can(i, '#aeb4ba', '#3d6fb8', detail=lambda i, a, b, c, d: (i.rect(a, b, c, b + 3, (244, 244, 240, 255)), i.rect(a + 3, b + 5, c - 4, b + 6, (244, 244, 240, 255))))
@icon('coffee')
def _(i): can(i, '#5a3a24', '#c99a3a', y0=6, x0=10, x1=21, detail=lambda i, a, b, c, d: (i.ell(a + 3, b + 2, a + 6, b + 5, (90, 56, 30, 255)), i.ell(a + 6, b + 2, a + 9, b + 5, (90, 56, 30, 255))))
@icon('energy')
def _(i): can(i, '#2c3a2e', '#2f9e46', y0=4, x0=11, x1=20, y1=27, detail=lambda i, a, b, c, d: i.line([(a + 6, b + 1), (a + 3, b + 6), (a + 6, b + 6), (a + 3, b + 11)], (240, 230, 60, 255)))
@icon('soda')
def _(i): can(i, '#c5302a', '#c5302a', y0=5, x0=10, x1=21, y1=27, detail=lambda i, a, b, c, d: i.line([(a, b + 6), (a + 4, b + 4), (a + 8, b + 7), (c, b + 5)], (246, 246, 246, 255), 2))
@icon('tuna')
def _(i): flatcan(i, '#9aa2aa', '#c4cad0', '#2f62a8'); i.rect(12, 18, 19, 19, (240, 200, 70, 255))
@icon('sprats')
def _(i):
    i.ell(4, 11, 27, 26, sh('#c9a446', .7)); i.ell(4, 10, 27, 24, '#c9a446'); i.ell(6, 12, 25, 22, '#e0c060')
    for k in range(3): i.line([(9, 14 + k * 3), (21, 14 + k * 3)], (150, 110, 40, 255))
    i.line([(22, 11), (27, 7)], '#9aa2aa', 2); i.ell(25, 4, 29, 8, '#9aa2aa')
# ---------------- food: jars ----------------
@icon('jar')
def _(i): jar(i, None)
@icon('pickles')
def _(i): jar(i, '#5f8a36', deco=lambda i, t: [i.ell(x, y, x + 3, y + 5, '#86b04a') for x, y in ((10, t + 2), (15, t + 5), (11, t + 9))] + [i.ell(17, t + 1, 20, t + 4, '#c8402e')])
@icon('jam')
def _(i): jar(i, '#8a1e3c', lid='#d8d0c0', deco=lambda i, t: [i.p(x, y, '#c03a5a') for x, y in ((12, t + 4), (17, t + 7), (14, t + 10), (19, t + 3))]); i.rect(8, 5, 23, 6, (196, 50, 50, 255)); [i.p(x, 5, (240, 240, 240, 255)) for x in range(9, 23, 3)]
@icon('stewH')
def _(i): jar(i, '#7a4a28', deco=lambda i, t: [i.rect(x, y, x + 2, y + 1, '#e8dcc0') for x, y in ((11, t + 2), (16, t + 6), (12, t + 10))])
@icon('fishJ')
def _(i): jar(i, '#8c939a', deco=lambda i, t: [i.ell(x, y, x + 8, y + 2, '#c8ccd0') for x, y in ((10, t + 3), (12, t + 8))])
@icon('kraut')
def _(i): jar(i, '#cfc27a', deco=lambda i, t: [i.line([(x, t + 2), (x + 3, t + 12)], '#eee2a0') for x in (10, 14, 18)])
@icon('honey')
def _(i): jar(i, '#d48a1e', lid='#6a4a26', fill=.85, deco=lambda i, t: i.rect(10, t + 4, 21, t + 8, '#f0d070')); i.rect(10, 7, 21, 7, (150, 100, 50, 255))
@icon('pbutter')
def _(i): jar(i, '#a0652e', lid='#c0392b', fill=.9, deco=lambda i, t: (i.box(10, t + 4, 21, t + 10, '#f0d28a'), i.ell(13, t + 5, 18, t + 9, '#a0652e')))
# ---------------- food: drinks ----------------
@icon('water')
def _(i): bottle(i, (150, 196, 230, 255), (120, 176, 226, 255), '#2f6fc0', label=(236, 240, 244, 255), lvl=.85)
@icon('bottle')
def _(i): bottle(i, (176, 206, 214, 255), None, None)
@icon('waterD')
def _(i): bottle(i, (160, 186, 190, 255), (122, 128, 84, 255), None, lvl=.7); [i.p(x, y, (90, 96, 60, 255)) for x, y in ((14, 22), (17, 25), (15, 19))]
@icon('vodka')
def _(i): bottle(i, (206, 224, 230, 255), (226, 236, 240, 255), '#b8bec6', label=(240, 240, 236, 255), lvl=.8, neck=(14, 17)); i.rect(11, 19, 20, 19, (196, 40, 40, 255))
@icon('whiskey')
def _(i): bottle(i, (150, 110, 70, 255), (170, 96, 36, 255), '#2a2420', label=(30, 28, 26, 255), x0=10, x1=21, lvl=.7, neck=(14, 17)); i.rect(13, 18, 18, 18, (210, 170, 80, 255))
@icon('molotov')
def _(i):
    bottle(i, (94, 140, 80, 255), (190, 140, 50, 255), None, lvl=.65)
    i.poly([(13, 6), (18, 6), (20, 2), (11, 3)], '#e8e0cc'); i.rect(11, 0, 14, 2, '#f0a030'); i.p(12, 0, '#ffe080')
@icon('milk')
def _(i): carton(i, (240, 240, 236, 255), (60, 110, 190, 255)); i.ell(12, 17, 15, 20, (240, 240, 236, 255))
@icon('juice')
def _(i): carton(i, (232, 140, 40, 255), (250, 236, 200, 255)); i.ball(12, 16, 16, 20, '#7ab040')
@icon('thermos')
def _(i): i.cyl(11, 7, 20, 28, '#3f6a48', ry=1); i.box(10, 3, 21, 8, '#b8bec6'); i.rect(11, 13, 20, 14, (200, 200, 190, 255)); steam(i, 13)
@icon('canteen')
def _(i):
    i.ball(6, 9, 25, 28, '#5a6a3a'); i.box(13, 4, 18, 9, '#8a8f94'); i.line([(7, 13), (5, 6), (12, 4)], '#6b5233', 1)
    i.rect(8, 18, 23, 19, sh('#5a6a3a', .8))
@icon('jug')
def _(i):
    i.box(7, 9, 24, 28, (176, 206, 226, 255)); i.rect(8, 13, 23, 27, (130, 180, 226, 255)); i.rect(8, 13, 23, 13, (170, 210, 240, 255))
    i.rect(17, 4, 23, 9, (176, 206, 226, 255)); i.rect(19, 5, 21, 8, (0, 0, 0, 0)); i.box(9, 5, 13, 9, '#2f6fc0'); i.rect(8, 10, 8, 26, (220, 236, 246, 255))
@icon('jerrycan')
def _(i):
    i.box(6, 8, 25, 28, '#b3302a'); i.poly([(6, 8), (12, 4), (25, 4), (25, 8)], '#c8423a'); i.rect(14, 5, 22, 6, (60, 20, 18, 255))
    i.box(6, 3, 10, 7, '#3a3c42'); i.line([(8, 12), (23, 25)], sh('#b3302a', .75), 1); i.line([(23, 12), (8, 25)], sh('#b3302a', .75), 1)
# ---------------- food: packs ----------------
@icon('cereal')
def _(i): i.box(8, 4, 22, 28, '#e0b22e'); i.rect(18, 5, 22, 27, sh('#e0b22e', .85)); i.rect(8, 6, 22, 9, (200, 50, 40, 255)); i.ell(10, 15, 20, 22, '#f4f0e8'); i.ell(11, 14, 19, 18, '#c8862e')
@icon('crackers')
def _(i): bag(i, '#c8a46a', '#a07a44', y0=9); [i.box(x, y, x + 5, y + 4, '#e0b874') for x, y in ((9, 15), (15, 18), (11, 21))]
@icon('mre')
def _(i): i.box(6, 6, 25, 28, '#6b6a3e'); i.rect(6, 6, 25, 8, sh('#6b6a3e', 1.2)); i.box(10, 13, 21, 20, '#d8cfa8'); i.rect(12, 15, 19, 15, (60, 60, 40, 255)); i.rect(12, 17, 17, 17, (60, 60, 40, 255))
@icon('pasta')
def _(i):
    i.box(7, 6, 24, 27, (226, 230, 236, 255)); [i.line([(x, 8), (x + 2, 25)], '#e8c45a') for x in range(9, 23, 2)]
    i.box(7, 14, 24, 19, '#2f62a8'); i.rect(10, 16, 21, 16, (240, 240, 240, 255))
@icon('rice')
def _(i): bag(i, (236, 234, 226, 255), (200, 196, 186, 255), y0=6); i.box(10, 15, 21, 21, '#c0392b'); [i.p(x, y, (250, 250, 250, 255)) for x, y in ((12, 17), (15, 18), (18, 17), (13, 19))]
@icon('noodles')
def _(i):
    i.poly([(7, 10), (24, 10), (21, 28), (10, 28)], (240, 236, 226, 255)); i.poly([(17, 10), (24, 10), (21, 28), (17, 28)], (214, 208, 196, 255))
    i.rect(8, 16, 23, 20, '#c8342a'); i.ell(6, 7, 25, 12, '#e8c45a'); i.line([(9, 9), (14, 8), (18, 10), (22, 9)], '#c8a040')
@icon('oatmeal')
def _(i): i.cyl(9, 5, 22, 28, '#c89a5a', top='#e8d6a8'); i.rect(9, 14, 22, 21, '#3d6a9e'); i.ell(12, 15, 18, 20, '#e8d6a8')
@icon('chips')
def _(i):
    i.poly([(7, 6), (24, 6), (23, 27), (8, 27)], '#d43a2a'); i.poly([(17, 6), (24, 6), (23, 27), (17, 27)], sh('#d43a2a', .85))
    for x in range(7, 25, 2): i.p(x, 5, '#e8b030'); i.p(x, 28, '#e8b030')
    i.ell(10, 12, 21, 21, '#f0c040'); i.ell(12, 14, 18, 18, '#f8dc70')
@icon('choco')
def _(i):
    i.poly([(4, 18), (20, 6), (27, 13), (11, 25)], '#5a3420')
    for k in range(4): i.line([(8 + k * 4, 16 - k * 3), (14 + k * 4, 22 - k * 3)], '#7a4a2e')
    i.poly([(11, 25), (19, 19), (27, 13), (27, 19), (13, 29)], '#c0302a'); i.line([(14, 26), (26, 17)], '#e8c060')
@icon('candy')
def _(i):
    for x, y, c in ((5, 14, '#d43a3a'), (13, 9, '#e8b030'), (13, 19, '#3aa0d0'), (20, 13, '#5ab040')):
        i.ball(x, y, x + 7, y + 7, c); i.poly([(x - 2, y + 2), (x, y + 3), (x - 2, y + 5)], sh(c, 1.1)); i.poly([(x + 9, y + 2), (x + 7, y + 3), (x + 9, y + 5)], sh(c, 1.1))
@icon('nuts')
def _(i): bag(i, '#6a8a3a', '#4a6a2a', y0=8); [i.ball(x, y, x + 4, y + 3, '#c8904a') for x, y in ((9, 16), (14, 19), (17, 15), (11, 21))]
@icon('pelmeni')
def _(i): bag(i, (90, 130, 200, 255), (60, 100, 170, 255), y0=6); [i.ball(x, y, x + 5, y + 4, (244, 238, 224, 255)) for x, y in ((9, 14), (15, 16), (10, 20), (16, 21))]
@icon('mre2')
def _(i): pass
@icon('salo')
def _(i): i.box(6, 11, 25, 24, (244, 226, 220, 255)); i.rect(6, 11, 25, 13, (196, 120, 100, 255)); i.rect(6, 22, 25, 24, (214, 170, 150, 255)); [i.p(x, y, (190, 190, 190, 255)) for x, y in ((10, 16), (15, 18), (20, 16), (13, 20))]
@icon('jerky')
def _(i):
    for k, c in enumerate(('#7a2a1e', '#94402c', '#6a2418')):
        y = 8 + k * 7; i.poly([(4, y + 3), (14, y), (27, y + 2), (26, y + 6), (13, y + 5), (5, y + 7)], c); i.line([(7, y + 4), (22, y + 3)], sh(c, 1.3))
# ---------------- food: produce & cooked ----------------
@icon('apple')
def _(i): i.ball(6, 9, 26, 28, '#c8302a'); i.line([(16, 9), (17, 4)], '#5a3a20', 2); i.ell(18, 3, 24, 7, '#5aa040')
@icon('bread')
def _(i):
    i.ell(3, 11, 28, 26, sh('#c48a3e', .75)); i.ell(3, 10, 27, 24, '#c48a3e'); i.ell(6, 11, 22, 18, '#dba45a')
    for x in (9, 14, 19): i.line([(x, 13), (x + 3, 18)], '#9a6024')
@icon('sausage')
def _(i):
    for k in range(10): i.ball(4 + k * 2, 18 - round(math.sin(k / 9 * 3.1) * 8), 10 + k * 2, 24 - round(math.sin(k / 9 * 3.1) * 8), '#9a3a2a', hl=False)
    i.line([(7, 15), (16, 9), (24, 15)], '#c05a46'); i.line([(3, 22), (5, 20)], '#e8dcc0', 2); i.line([(26, 22), (28, 20)], '#e8dcc0', 2)
@icon('meat')
def _(i):
    i.ell(4, 8, 25, 26, (226, 220, 210, 255)); i.ell(5, 9, 23, 24, '#c0303a'); i.ell(8, 11, 15, 16, '#e05a60'); i.line([(10, 19), (18, 14)], '#f0b0b0')
    i.line([(22, 20), (28, 26)], (240, 236, 226, 255), 3); i.ball(26, 24, 30, 28, (240, 236, 226, 255))
@icon('steak')
def _(i):
    i.ell(4, 8, 25, 26, '#d8a060'); i.ell(5, 9, 23, 24, '#7a3e20'); [i.line([(x, 11), (x + 6, 22)], '#4a2210', 1) for x in (8, 13, 18)]
    i.line([(22, 20), (28, 26)], (230, 220, 200, 255), 3); steam(i, 10)
@icon('carrot')
def _(i):
    i.poly([(5, 27), (21, 9), (26, 14)], '#e8742a'); i.poly([(5, 27), (21, 9), (22, 11)], '#f49a4a')
    [i.line([(9 + k * 4, 20 - k * 4), (11 + k * 4, 22 - k * 4)], '#c85a1e') for k in range(3)]
    i.line([(22, 10), (26, 3)], '#4a9a3a', 2); i.line([(23, 11), (29, 6)], '#5ab040', 2); i.line([(24, 12), (29, 11)], '#4a9a3a', 2)
@icon('potato')
def _(i): i.ball(4, 9, 27, 26, '#b08850'); [i.p(x, y, '#7a5a30') for x, y in ((10, 14), (17, 12), (20, 19), (12, 20))]
@icon('potatoC')
def _(i): bowl(i, '#e8d080', deco=lambda i: [i.ball(x, y, x + 6, y + 5, '#f0d888') for x, y in ((9, 11), (15, 12))]); steam(i, 12)
@icon('cabbage')
def _(i):
    i.ball(4, 7, 27, 28, '#6ab04a'); i.ell(9, 11, 22, 24, '#9ad070'); i.line([(16, 10), (16, 26)], '#c8e8a0'); i.line([(16, 18), (10, 13)], '#c8e8a0'); i.line([(16, 20), (22, 14)], '#c8e8a0')
    i.poly([(4, 16), (8, 9), (10, 20)], '#4a8a36'); i.poly([(27, 16), (23, 9), (21, 20)], '#4a8a36')
@icon('fish')
def _(i):
    i.ell(4, 11, 23, 22, '#8a9aa8'); i.ell(6, 12, 20, 16, '#b0c0cc'); i.poly([(22, 16), (29, 10), (29, 23)], '#7a8a98')
    i.p(8, 14, (20, 20, 20, 255)); i.line([(12, 13), (12, 20)], '#6a7a88')
@icon('fishC')
def _(i):
    i.ell(4, 11, 23, 22, '#c8823a'); i.ell(6, 12, 20, 16, '#e0a050'); i.poly([(22, 16), (29, 10), (29, 23)], '#a8642a')
    [i.line([(x, 12), (x + 3, 21)], '#7a4418') for x in (9, 13, 17)]; steam(i, 10)
@icon('berries')
def _(i):
    i.ell(14, 4, 26, 11, '#4a9a3a'); i.line([(20, 7), (15, 12)], '#3a6a2a')
    for x, y, c in ((7, 13, '#b8203a'), (14, 12, '#3a3a9a'), (11, 18, '#c8283e'), (18, 17, '#a01a30'), (6, 20, '#3a3a9a'), (15, 22, '#b8203a')): i.ball(x, y, x + 6, y + 6, c)
@icon('mushroom')
def _(i):
    i.box(13, 16, 19, 27, (230, 222, 206, 255)); i.ell(4, 6, 28, 20, sh('#8a5a32', .7)); i.ell(4, 5, 27, 18, '#9a6436'); i.ell(8, 7, 17, 11, '#b8844e')
    i.rect(6, 16, 26, 17, sh('#8a5a32', .55))
@icon('mushroomC')
def _(i): bowl(i, '#7a4a26', deco=lambda i: [i.ell(x, y, x + 5, y + 3, '#a06a3a') for x, y in ((9, 12), (14, 14), (17, 11))]); steam(i, 12)
@icon('mushD')
def _(i):
    i.line([(2, 5), (29, 9)], (200, 180, 140, 255))
    for k, x in enumerate((5, 13, 21)):
        y = 6 + k; i.line([(x + 3, y), (x + 3, y + 3)], (200, 180, 140, 255)); i.ell(x, y + 3, x + 7, y + 10, '#5a3c22'); i.ell(x + 1, y + 4, x + 4, y + 6, '#7a5634'); i.rect(x + 2, y + 10, x + 4, y + 15, '#a89070')
@icon('pastaC')
def _(i): bowl(i, '#e8c45a', deco=lambda i: [i.line([(x, 13), (x + 4, 17)], '#c8a040') for x in (9, 13, 17)]); steam(i)
@icon('riceC')
def _(i): bowl(i, (244, 242, 236, 255), deco=lambda i: [i.p(x, y, (210, 206, 196, 255)) for x, y in ((10, 14), (14, 16), (18, 13), (20, 16), (12, 17))]); steam(i)
@icon('soupC')
def _(i): bowl(i, '#d8862e', deco=lambda i: [i.line([(9, 15), (14, 13), (19, 16)], '#f0d070'), i.p(16, 17, '#5ab040')]); steam(i)
@icon('ragout')
def _(i): bowl(i, '#7a4426', deco=lambda i: [i.rect(x, y, x + 2, y + 2, c) for x, y, c in ((9, 13, '#e8742a'), (14, 15, '#b08850'), (18, 13, '#a83a2a'), (12, 17, '#e8742a'))]); steam(i)
@icon('porridge')
def _(i): bowl(i, (226, 206, 160, 255), deco=lambda i: i.ell(14, 13, 18, 16, '#d8a030')); steam(i)
@icon('pelmeniC')
def _(i): bowl(i, (244, 238, 224, 255), deco=lambda i: [i.ball(x, y, x + 5, y + 3, (250, 246, 236, 255)) for x, y in ((9, 13), (14, 15), (17, 12))]); steam(i)

# ---------------- medicine ----------------
@icon('bandage')
def _(i):
    i.cyl(6, 9, 25, 25, (238, 234, 224, 255), top=(248, 246, 240, 255), ry=4); i.ell(13, 10, 18, 13, (200, 194, 180, 255))
    i.poly([(21, 22), (28, 26), (26, 29), (19, 25)], (238, 234, 224, 255))
@icon('pills')
def _(i): pillbottle(i, (226, 130, 40, 255), (244, 244, 240, 255), (244, 244, 240, 255)); i.rect(12, 18, 19, 18, (200, 60, 50, 255))
@icon('antibio')
def _(i): pillbottle(i, (240, 240, 236, 255), (60, 110, 190, 255), (60, 110, 190, 255)); i.rect(12, 17, 19, 17, (240, 240, 240, 255)); i.rect(12, 19, 17, 19, (240, 240, 240, 255))
@icon('vitamins')
def _(i): pillbottle(i, (232, 196, 50, 255), (70, 150, 70, 255), (250, 240, 200, 255)); i.ball(13, 16, 17, 20, '#e8742a')
@icon('painkill')
def _(i):
    i.box(5, 7, 26, 25, (196, 202, 208, 255)); i.rect(5, 7, 26, 9, (60, 110, 190, 255))
    for y in (12, 18):
        for x in (8, 14, 20): i.ball(x, y, x + 4, y + 4, (244, 244, 240, 255))
    i.rect(19, 18, 23, 22, (150, 156, 162, 255))
@icon('antisep')
def _(i): bottle(i, (110, 60, 30, 255), (140, 60, 26, 255), (240, 240, 236, 255), label=(240, 240, 236, 255), x0=10, x1=21, y0=12, neck=(14, 17), lvl=.8); i.rect(15, 19, 16, 22, (200, 40, 40, 255)); i.rect(14, 20, 17, 21, (200, 40, 40, 255))
@icon('medkit')
def _(i):
    i.box(4, 10, 27, 27, '#c0302a'); i.rect(4, 17, 27, 17, sh('#c0302a', .7)); i.line([(12, 10), (12, 6), (19, 6), (19, 10)], '#3a3c42', 2)
    i.rect(14, 12, 17, 24, (244, 244, 240, 255)); i.rect(10, 16, 21, 19, (244, 244, 240, 255))
@icon('splint')
def _(i):
    for k in (0, 6):
        i.poly([(3 + k, 21 + k // 2), (25 + k, 4 + k // 2), (27 + k, 7 + k // 2), (5 + k, 24 + k // 2)], '#b8844e')
    for t in (.25, .55, .8):
        x, y = 4 + t * 22, 22 - t * 16; i.poly([(x - 2, y - 3), (x + 2, y - 6), (x + 6, y + 1), (x + 2, y + 4)], (240, 236, 226, 255))
# ---------------- tools & weapons (diagonal, handle at the bottom-left) ----------------
@icon('hammer')
def _(i): diag_handle(i, 6, 27, 19, 12, '#9a6a3e', 3); i.poly([(12, 9), (20, 2), (27, 9), (24, 12), (19, 7), (15, 12)], '#8a9098'); i.poly([(20, 2), (23, 4), (17, 10), (15, 8)], '#b8bec6')
@icon('bat')
def _(i): i.line([(5, 27), (12, 20)], '#6a4a2a', 3); i.poly([(10, 19), (24, 4), (29, 8), (14, 23)], '#c8945a'); i.line([(12, 19), (25, 5)], '#e0b07a'); i.ball(3, 25, 7, 29, '#6a4a2a', hl=False)
@icon('nailbat')
def _(i):
    i.line([(5, 27), (12, 20)], '#6a4a2a', 3); i.poly([(10, 19), (24, 4), (29, 8), (14, 23)], '#b8844e')
    for x, y in ((17, 10), (21, 8), (19, 14), (24, 11), (15, 16)): i.line([(x, y), (x - 2, y - 3)], (210, 214, 220, 255)); i.p(x - 2, y - 3, (240, 244, 248, 255))
@icon('knife')
def _(i): i.line([(5, 27), (11, 21)], '#2a2624', 3); i.poly([(10, 19), (25, 4), (27, 6), (14, 22)], '#c8ced4'); i.line([(12, 19), (25, 5)], '#eef2f6')
@icon('cleaver')
def _(i): i.line([(4, 28), (10, 22)], '#3a2a22', 3); i.poly([(9, 19), (19, 9), (27, 17), (17, 27)], '#b8bec6'); i.line([(18, 10), (26, 18)], '#e8ecf0'); i.ball(18, 15, 21, 18, '#5a5e66', hl=False)
@icon('machete')
def _(i): i.line([(4, 28), (9, 23)], '#1e1e20', 3); i.poly([(8, 21), (24, 3), (28, 4), (13, 25)], '#c0c6cc'); i.line([(10, 21), (25, 4)], '#eef2f6'); i.line([(7, 20), (12, 25)], '#5a5e66', 2)
@icon('pipe')
def _(i): i.line([(5, 26), (26, 5)], '#7a8088', 5); i.line([(5, 24), (25, 4)], '#a8aeb6', 1); i.ball(23, 2, 29, 8, '#5a6068')
@icon('axe')
def _(i): diag_handle(i, 5, 28, 22, 8, '#9a6a3e', 3); i.poly([(18, 5), (25, 1), (30, 10), (24, 14), (21, 9)], '#c0302a'); i.poly([(25, 1), (30, 10), (28, 11), (24, 3)], '#d8dce0')
@icon('hatchet')
def _(i): diag_handle(i, 8, 27, 19, 13, '#9a6a3e', 3); i.poly([(15, 10), (22, 5), (27, 13), (21, 16), (18, 12)], '#8a9098'); i.poly([(22, 5), (27, 13), (25, 14), (21, 7)], '#d8dce0')
@icon('pan')
def _(i): i.ball(3, 6, 22, 21, '#3a3a3e'); i.ell(6, 8, 19, 18, '#26262a'); i.ell(8, 9, 13, 12, '#4a4a50'); i.line([(19, 18), (28, 27)], '#1e1e22', 4)
@icon('crowbar')
def _(i): i.line([(6, 28), (22, 6)], '#c0302a', 3); i.line([(22, 6), (24, 3), (27, 3), (28, 5)], '#c0302a', 3); i.line([(6, 28), (4, 25)], '#5a5e66', 3); i.line([(7, 26), (21, 6)], '#e05a4a')
@icon('baton')
def _(i): i.line([(6, 27), (26, 6)], '#26262a', 4); i.line([(7, 25), (25, 6)], '#4a4a52'); i.line([(9, 20), (14, 25)], '#26262a', 3)
@icon('spear')
def _(i): i.line([(3, 29), (22, 10)], '#9a6a3e', 2); i.poly([(20, 10), (28, 2), (24, 12)], '#d8dce0'); i.line([(18, 12), (22, 16)], '#3a3c42', 2); i.line([(17, 11), (21, 15)], '#5a5e66', 1)
@icon('sledge')
def _(i): diag_handle(i, 6, 28, 20, 12, '#9a6a3e', 3); i.poly([(13, 8), (21, 1), (29, 9), (21, 16)], '#5a5e66'); i.poly([(21, 1), (29, 9), (27, 10), (20, 3)], '#8a9098')
@icon('shovel')
def _(i): diag_handle(i, 4, 29, 18, 15, '#9a6a3e', 2); i.poly([(15, 13), (22, 6), (29, 3), (26, 10), (19, 17)], '#7a8088'); i.line([(18, 13), (25, 6)], '#a8aeb6'); i.line([(2, 29), (6, 25)], '#2a2624', 3)
@icon('golf')
def _(i): i.line([(5, 28), (9, 24)], '#26262a', 3); i.line([(9, 24), (23, 6)], '#b8bec6', 1); i.poly([(21, 5), (28, 3), (29, 7), (24, 8)], '#c8ced4')
@icon('wrench')
def _(i):
    i.line([(5, 27), (18, 14)], '#8a9098', 4); i.line([(5, 25), (17, 13)], '#c8ced4')
    i.poly([(15, 13), (17, 6), (23, 3), (24, 8), (21, 9), (24, 13), (28, 11), (27, 16), (20, 19)], '#8a9098'); i.line([(17, 7), (22, 4)], '#c8ced4'); i.ball(17, 14, 20, 17, '#5a5e66', hl=False)
@icon('pistol')
def _(i):
    i.box(5, 9, 27, 14, '#4a4e56'); i.rect(5, 9, 27, 9, '#7a808a'); i.rect(25, 10, 27, 12, '#2a2c30')
    i.poly([(6, 14), (14, 14), (12, 27), (4, 26)], '#2a2a2e'); i.poly([(7, 16), (12, 16), (11, 24), (6, 24)], '#5a4030')
    i.line([(14, 14), (15, 19), (19, 18), (19, 14)], '#2a2a2e', 1); i.p(16, 16, '#7a808a')
@icon('shotgun')
def _(i):
    i.poly([(2, 24), (9, 18), (12, 21), (5, 28)], '#7a5232'); i.poly([(9, 18), (13, 15), (15, 18), (12, 21)], '#3a3c42')
    i.line([(13, 15), (29, 2)], '#4a4e56', 2); i.line([(14, 17), (30, 4)], '#6a7078', 1); i.line([(15, 17), (22, 11)], '#9a6a3e', 2)
@icon('rod')
def _(i):
    i.line([(4, 28), (27, 3)], '#3a3c42', 1); i.line([(4, 28), (9, 23)], '#8a5a2e', 2); i.ball(9, 20, 14, 25, '#b8bec6')
    i.line([(27, 3), (28, 16), (26, 22)], (220, 220, 220, 255)); i.ball(24, 21, 28, 25, '#c0302a')
@icon('opener')
def _(i): i.line([(5, 26), (17, 14)], '#3a3c42', 3); i.ball(15, 7, 26, 18, '#b8bec6'); i.ell(18, 10, 23, 15, '#8a9098'); i.poly([(24, 8), (29, 4), (27, 11)], '#d8dce0')
@icon('umbrella')
def _(i):
    i.poly([(3, 15), (8, 7), (16, 4), (24, 7), (29, 15)], '#c0302a'); i.poly([(16, 4), (24, 7), (29, 15), (16, 15)], '#a02420')
    for x in (3, 10, 16, 22, 29): i.p(x, 16, '#701810')
    i.line([(16, 15), (16, 26)], '#3a3c42', 1); i.line([(16, 26), (14, 28), (12, 26)], '#6a4a2a', 2)
@icon('flashlight')
def _(i):
    i.line([(5, 26), (17, 14)], '#2a2c30', 6); i.line([(5, 24), (16, 13)], '#4a4e56', 1); i.ball(15, 6, 26, 17, '#e8b030'); i.ell(18, 8, 25, 15, '#fff4c0')
    i.line([(9, 21), (11, 23)], '#c0302a', 2)
@icon('lighter')
def _(i): i.box(10, 12, 21, 28, '#c0302a'); i.rect(18, 13, 21, 27, sh('#c0302a', .8)); i.box(10, 7, 21, 12, '#b8bec6'); i.rect(13, 8, 18, 10, '#5a5e66'); i.box(20, 5, 23, 9, '#8a9098')
@icon('candle')
def _(i): i.cyl(11, 12, 20, 28, (240, 232, 206, 255), ry=1); i.line([(15, 9), (15, 12)], '#2a2624'); i.ell(13, 3, 17, 10, '#f0a030'); i.ell(14, 6, 16, 9, '#fff0a0'); i.rect(18, 14, 19, 18, (250, 246, 230, 255))
@icon('flare')
def _(i): i.line([(5, 27), (21, 11)], '#c0302a', 5); i.line([(5, 25), (20, 10)], '#e05a4a'); i.ball(19, 6, 25, 12, '#3a3c42'); [i.p(x, y, '#ffd060') for x, y in ((26, 4), (28, 7), (24, 2), (29, 3))]
@icon('binoculars')
def _(i):
    for x in (4, 17):
        i.cyl(x, 8, x + 10, 26, '#2a2c30', top='#5a7a9a', ry=3); i.ell(x + 2, 9, x + 8, 13, '#8ab0d0')
    i.box(14, 13, 17, 18, '#4a4e56')
@icon('radio')
def _(i):
    i.line([(22, 10), (27, 1)], '#8a9098'); i.box(3, 10, 28, 27, '#3a3c42'); i.rect(4, 11, 27, 11, '#5a5e66')
    for y in range(14, 25, 2): i.rect(5, y, 15, y, '#26262a')
    i.box(17, 13, 26, 18, '#c8a450'); i.rect(20, 14, 20, 17, '#c0302a'); i.ball(18, 20, 22, 24, '#8a9098'); i.ball(23, 20, 27, 24, '#8a9098')
@icon('handheld')
def _(i): i.box(8, 3, 23, 28, (196, 196, 188, 255)); i.box(10, 6, 21, 15, '#3a4a3a'); i.rect(11, 7, 20, 14, '#8ab060'); i.rect(10, 19, 14, 20, '#3a3c42'); i.rect(11, 18, 12, 21, '#3a3c42'); i.ball(17, 18, 20, 21, '#a02a5a'); i.ball(19, 21, 22, 24, '#a02a5a')
@icon('alarm')
def _(i):
    i.ball(8, 4, 14, 10, '#c8ccd0'); i.ball(18, 4, 24, 10, '#c8ccd0'); i.ball(5, 7, 26, 28, '#c0302a'); i.ell(8, 10, 22, 24, (244, 240, 230, 255))
    i.line([(15, 17), (15, 12)], '#2a2624'); i.line([(15, 17), (19, 19)], '#2a2624'); i.line([(8, 27), (6, 29)], '#2a2624', 2); i.line([(22, 27), (24, 29)], '#2a2624', 2)
@icon('generator')
def _(i):
    i.box(5, 11, 26, 26, '#d8a830'); i.rect(6, 12, 25, 12, '#f0cc60'); i.box(8, 14, 18, 23, '#3a3c42'); i.rect(9, 15, 17, 15, '#5a5e66')
    i.line([(4, 10), (4, 28), (27, 28), (27, 10), (4, 10)], '#26262a', 1); i.ball(20, 15, 24, 19, '#c0302a'); i.box(20, 7, 25, 11, '#3a3c42')
@icon('burner')
def _(i): i.cyl(9, 13, 22, 28, '#2f62a8', ry=2); i.rect(9, 19, 22, 22, (240, 240, 236, 255)); i.box(12, 7, 19, 13, '#8a9098'); i.line([(8, 7), (23, 7)], '#5a5e66', 2); i.ell(12, 2, 19, 7, '#5ab0f0'); i.ell(14, 3, 17, 6, '#d0f0ff')
@icon('trap')
def _(i):
    i.ell(3, 13, 28, 26, '#5a5e66'); i.ell(6, 15, 25, 24, (0, 0, 0, 0)); i.ell(12, 17, 19, 22, '#8a9098')
    for k in range(7): x = 5 + k * 3; i.poly([(x, 15), (x + 1, 10), (x + 2, 15)], '#b8bec6')
@icon('hotpack')
def _(i): i.box(5, 7, 26, 25, (240, 236, 226, 255)); i.ell(11, 11, 20, 21, '#e8742a'); i.poly([(15, 9), (19, 15), (16, 19), (12, 16)], '#f0c040'); i.rect(5, 7, 26, 8, '#c0302a')
@icon('seeds')
def _(i): i.box(7, 5, 24, 27, (226, 206, 160, 255)); i.box(9, 8, 22, 19, (240, 236, 226, 255)); i.ball(11, 11, 15, 15, '#c0302a'); i.ell(15, 12, 21, 17, '#e8742a'); i.line([(18, 12), (20, 9)], '#5ab040'); i.rect(9, 22, 22, 23, '#7a5a30')
@icon('sticks')
def _(i):
    for k, c in enumerate(('#7a5232', '#8a6040', '#6a4628', '#9a6c46')):
        i.line([(3 + k, 24 - k * 3), (28 - k, 10 - k)], c, 2)
    i.line([(13, 10), (15, 25)], '#c8a060', 2)
@icon('plank')
def _(i):
    i.poly([(2, 22), (22, 4), (29, 10), (9, 28)], '#b8844e'); i.poly([(9, 28), (29, 10), (29, 12), (10, 30)], '#7a5232')
    i.line([(7, 22), (22, 9)], '#9a6a3e'); i.line([(10, 25), (20, 16)], '#9a6a3e'); i.p(15, 14, '#6a4628')
@icon('nails')
def _(i):
    for x, y in ((6, 8), (14, 5), (21, 9), (10, 17)):
        i.line([(x, y + 2), (x + 4, y + 16)], '#9aa0a8', 2); i.line([(x - 2, y + 1), (x + 3, y)], '#c8ced4', 2)
@icon('scrap')
def _(i):
    i.poly([(3, 18), (15, 12), (19, 20), (8, 26)], '#8a9098'); i.poly([(13, 9), (26, 6), (28, 16), (17, 18)], '#a86a3a'); i.poly([(16, 10), (24, 8), (25, 12)], '#c8844e')
    i.line([(4, 28), (28, 21)], '#5a5e66', 3); i.line([(4, 27), (27, 20)], '#a8aeb6'); i.p(20, 13, '#6a3a1e'); i.p(9, 20, '#5a5e66')
@icon('tape')
def _(i): i.ell(4, 6, 27, 27, '#7a8088'); i.ell(5, 7, 25, 25, '#9aa0a8'); i.ell(10, 11, 21, 22, (210, 190, 150, 255)); i.ell(12, 13, 19, 20, (0, 0, 0, 0)); i.poly([(25, 18), (30, 22), (28, 26), (23, 22)], '#9aa0a8')
@icon('battery')
def _(i): i.box(9, 8, 22, 27, '#2a2c30'); i.rect(9, 8, 22, 15, '#c88a2a'); i.rect(10, 9, 11, 14, '#e8b050'); i.box(13, 5, 18, 8, '#b8bec6'); i.rect(14, 19, 17, 19, '#e8e8e8'); i.rect(15, 18, 16, 20, '#e8e8e8')
@icon('matches')
def _(i):
    i.box(5, 13, 26, 26, '#2f62a8'); i.rect(5, 13, 26, 15, '#c0302a'); i.ball(11, 17, 20, 23, '#e8c040')
    for x in (9, 13, 17): i.line([(x, 13), (x + 2, 5)], '#e8d0a0', 1); i.ball(x + 1, 3, x + 4, 6, '#c0302a', hl=False)
@icon('cigs')
def _(i): i.box(8, 7, 23, 28, (240, 240, 236, 255)); i.rect(8, 15, 23, 22, '#c0302a'); i.rect(19, 8, 23, 27, (214, 214, 210, 255)); [i.box(x, 3, x + 2, 8, '#e0a050') for x in (10, 13)]; i.rect(10, 3, 12, 4, (240, 240, 236, 255))
@icon('cards')
def _(i):
    for k, a in enumerate((-.4, 0, .4)):
        cx, cy = 16 + math.sin(a) * 6, 16; pts = [(cx - 6 + a * 6, cy - 9), (cx + 6 + a * 6, cy - 9 + a * 4), (cx + 6 - a * 6, cy + 9 + a * 4), (cx - 6 - a * 6, cy + 9)]
        i.poly(pts, (248, 246, 240, 255)); i.line(pts + [pts[0]], (190, 186, 176, 255))
    i.poly([(16, 12), (19, 16), (16, 20), (13, 16)], '#c0302a'); i.ball(7, 10, 10, 13, '#26262a', hl=False)
@icon('medkit2')
def _(i): pass
@icon('newspaper')
def _(i):
    i.poly([(4, 8), (24, 4), (28, 24), (8, 28)], (226, 222, 210, 255)); i.poly([(16, 6), (24, 4), (28, 24), (20, 26)], (206, 202, 190, 255))
    for k in range(5): i.line([(7 + k * .3, 12 + k * 3), (14, 10 + k * 3)], '#6a6a66')
    i.box(17, 9, 23, 14, '#8a8a86'); i.line([(6, 10), (15, 8)], '#26262a', 2)
@icon('note')
def _(i):
    i.poly([(6, 4), (24, 6), (26, 27), (20, 25), (14, 28), (8, 26)], (240, 232, 200, 255))
    for k in range(5): i.line([(9, 9 + k * 3), (21, 10 + k * 3)], '#4a5a8a')
@icon('map')
def _(i):
    i.poly([(3, 7), (11, 4), (20, 7), (28, 4), (28, 25), (20, 28), (11, 25), (3, 28)], (226, 214, 170, 255))
    i.poly([(11, 4), (20, 7), (20, 28), (11, 25)], (206, 194, 150, 255)); i.line([(5, 20), (12, 14), (18, 18), (26, 9)], '#c0302a'); i.ball(5, 9, 10, 13, '#6a9a4a', hl=False); i.ell(20, 18, 26, 23, '#4a8ac0')
@icon('novel')
def _(i): book(i, '#3a5a8a', emblem=lambda i: (i.ball(11, 13, 18, 20, '#e8b030'), i.rect(10, 21, 19, 22, '#c0302a')))
@icon('cansalarm')
def _(i):
    i.line([(2, 6), (29, 6)], (210, 200, 170, 255))
    for x, y in ((4, 9), (13, 12), (21, 8)):
        i.line([(x + 3, 6), (x + 3, y)], (210, 200, 170, 255)); i.cyl(x, y, x + 6, y + 11, '#b8bec6', ry=1)
@icon('lure')
def _(i):
    i.line([(2, 26), (29, 22)], (210, 200, 170, 255))
    for x in (3, 22): i.rect(x + 2, 9, x + 4, 12, (176, 206, 214, 255)); i.box(x, 12, x + 6, 26, (176, 206, 214, 255))
    i.ball(10, 3, 14, 7, '#c8ccd0'); i.ball(17, 3, 21, 7, '#c8ccd0'); i.ball(8, 5, 23, 20, '#c0302a'); i.ell(10, 7, 20, 17, (244, 240, 230, 255)); i.line([(15, 12), (15, 9)], '#2a2624'); i.line([(15, 12), (18, 13)], '#2a2624')
    i.box(12, 19, 19, 23, '#8a9098')
@icon('sewkit')
def _(i):
    i.ell(3, 14, 28, 29, sh('#3d6aa8', .7)); i.rect(3, 19, 28, 22, '#3d6aa8'); i.ell(3, 13, 28, 24, '#4f80c0')
    i.cyl(8, 7, 14, 19, '#c0302a', top=(230, 210, 170, 255), ry=1); i.cyl(16, 9, 21, 20, '#4a9a3a', top=(230, 210, 170, 255), ry=1)
    i.line([(20, 4), (28, 13)], '#d8dce0'); i.line([(20, 4), (16, 2), (11, 6)], '#c0302a')
@icon('rag')
def _(i): i.poly([(3, 18), (10, 9), (18, 12), (27, 8), (29, 20), (20, 27), (8, 26)], (196, 176, 140, 255)); i.poly([(11, 14), (19, 15), (17, 22), (10, 20)], '#8a6a8a'); i.line([(5, 18), (12, 23), (22, 19)], (150, 130, 100, 255)); i.p(24, 14, '#7a9a6a')
@icon('curtain')
def _(i):
    i.line([(2, 4), (29, 4)], '#8a9098', 2)
    for x in range(4, 28, 6): i.ball(x - 1, 2, x + 2, 6, '#c8ccd0', hl=False)
    i.poly([(3, 6), (15, 6), (12, 28), (4, 28)], '#a8342e'); i.poly([(16, 6), (28, 6), (27, 28), (19, 28)], '#a8342e')
    for x in (6, 10, 21, 25): i.line([(x, 7), (x - (1 if x < 15 else -1), 27)], '#7a2420')
@icon('ammo9')
def _(i):
    i.box(5, 14, 26, 27, '#6a7a3a'); i.rect(5, 14, 26, 16, '#8a9a4a'); i.rect(5, 20, 26, 22, '#e2c45a'); i.rect(8, 24, 14, 24, '#3a4a20')
    for x in (8, 13, 18): i.cyl(x, 6, x + 3, 14, '#d8ac4a', top='#b87038', ry=1)
@icon('shells')
def _(i):
    for x, y in ((4, 9), (12, 6), (20, 10)): i.cyl(x, y, x + 6, y + 18, '#c0302a', top='#e8d090', ry=2); i.rect(x, y + 14, x + 6, y + 17, '#d8ac4a'); i.rect(x, y + 14, x + 1, y + 17, '#f0d070')
@icon('stash')
def _(i):
    i.box(4, 9, 27, 28, '#9a6a3e'); i.rect(4, 9, 27, 11, '#b8844e')
    for y in (15, 21): i.rect(4, y, 27, y, '#6a4628')
    i.line([(4, 28), (27, 9)], '#7a5232', 1); i.box(11, 16, 20, 20, (236, 228, 204, 255)); i.rect(13, 18, 18, 18, '#7a6a50')
@icon('campfire')
def _(i):
    i.line([(4, 27), (27, 21)], '#6a4628', 3); i.line([(4, 21), (27, 27)], '#7a5232', 3)
    i.poly([(9, 23), (12, 12), (15, 16), (17, 6), (21, 14), (23, 23)], '#e8742a'); i.poly([(12, 23), (14, 15), (17, 18), (19, 12), (20, 23)], '#f0c040'); i.rect(15, 20, 17, 22, '#fff4c0')
    for x in (3, 26): i.ball(x - 2, 25, x + 2, 29, '#7a8088')
@icon('barrel')
def _(i): i.cyl(7, 4, 24, 28, '#2f62a8', top='#3d7ac8', ry=3); [i.rect(7, y, 24, y, sh('#2f62a8', .7)) for y in (11, 20)]; i.ell(10, 5, 15, 8, '#1e3a6a')
@icon('pot')
def _(i): i.cyl(6, 10, 25, 27, '#8a9098', top='#a8aeb6', ry=3); i.box(3, 15, 6, 17, '#3a3c42'); i.box(25, 15, 28, 17, '#3a3c42'); i.ell(6, 8, 25, 14, '#7a8088'); i.box(14, 5, 17, 8, '#3a3c42')
# ---------------- clothes & gear ----------------
@icon('jacket')
def _(i): torso(i, '#5a6a42', collar='#3a4a2a', zip='#2a3020'); i.box(9, 19, 13, 22, sh('#5a6a42', .8))
@icon('sweater')
def _(i):
    torso(i, '#a8342e', collar='#7a2420')
    for y in (13, 18, 23):
        for x in range(9, 23, 3): i.p(x, y, (240, 230, 220, 255)); i.p(x + 1, y + 1, (240, 230, 220, 255))
@icon('raincoat')
def _(i): torso(i, '#e0b828', hood='#c89a18', zip='#a07a10'); [i.ball(14, y, 16, y + 2, '#5a4a20', hl=False) for y in (13, 19)]
@icon('leather')
def _(i): torso(i, '#4a3022', collar='#2a1a12', zip='#c8ced4'); i.line([(9, 12), (14, 20)], '#5e3e2c'); i.line([(22, 12), (17, 20)], '#3a2418')
@icon('parka')
def _(i):
    torso(i, '#2f5a8a', zip='#1e3a5a'); i.poly([(9, 8), (16, 2), (22, 8), (20, 10), (11, 10)], (226, 214, 190, 255))
    for y in (14, 19, 24): i.line([(8, y), (23, y)], '#244a74')
@icon('vest')
def _(i):
    i.poly([(7, 6), (12, 6), (16, 10), (19, 6), (24, 6), (25, 28), (6, 28)], '#2a3448'); i.rect(16, 11, 25, 27, '#222a3a')
    i.box(8, 16, 14, 21, '#3a4660'); i.box(17, 16, 23, 21, '#3a4660'); i.rect(7, 24, 24, 25, '#1a2030'); i.rect(9, 10, 13, 12, (230, 230, 230, 255))
@icon('hat')
def _(i): i.ell(5, 7, 26, 30, '#3a5a9a'); i.rect(5, 19, 26, 30, (0, 0, 0, 0)); i.box(4, 18, 27, 24, '#2e4a80'); i.ball(13, 2, 18, 7, (240, 240, 236, 255)); [i.line([(x, 9), (x, 17)], '#2e4a80') for x in (10, 15, 20)]
@icon('ushanka')
def _(i):
    i.ball(6, 4, 25, 20, '#6a4a32'); i.box(4, 13, 27, 18, (176, 150, 120, 255)); i.box(3, 17, 9, 27, (176, 150, 120, 255)); i.box(22, 17, 28, 27, (176, 150, 120, 255))
    i.ball(13, 9, 18, 13, '#c8a040', hl=False)
@icon('helmet')
def _(i): i.ball(4, 4, 27, 27, '#2a2a30'); i.poly([(12, 13), (27, 11), (27, 21), (14, 22)], '#3a5a7a'); i.line([(15, 14), (24, 13)], '#8ab0d0'); i.rect(5, 24, 18, 26, '#c0302a')
@icon('watchQ')
def _(i): i.box(12, 2, 19, 29, '#6a4428'); i.ball(8, 9, 23, 24, '#c8ccd0'); i.ell(10, 11, 21, 22, (244, 240, 230, 255)); i.line([(15, 16), (15, 12)], '#26262a'); i.line([(15, 16), (19, 17)], '#26262a'); i.box(23, 15, 24, 17, '#a8aeb6')
@icon('watchD')
def _(i): i.box(12, 2, 19, 29, '#26262a'); i.box(8, 9, 23, 23, '#3a3c42'); i.rect(10, 12, 21, 19, '#7ac060'); [i.rect(x, 14, x + 1, 17, '#2a4a20') for x in (11, 14, 18)]; i.p(16, 15, '#2a4a20'); i.p(16, 17, '#2a4a20')
@icon('bag')
def _(i):
    i.ball(6, 4, 25, 18, '#8a6a3e', hl=False); i.box(6, 10, 25, 28, '#8a6a3e'); i.rect(7, 5, 24, 9, '#a07a48'); i.box(10, 17, 21, 25, '#7a5a32'); i.rect(10, 17, 21, 18, '#5a4024')
    i.line([(12, 4), (12, 1), (19, 1), (19, 4)], '#5a4024', 2); i.ball(14, 20, 17, 22, '#c8a040', hl=False)
@icon('milbag')
def _(i):
    i.box(6, 5, 25, 28, '#5a6a3a'); i.rect(6, 5, 25, 7, '#6e8048'); i.box(8, 16, 15, 25, '#4a5830'); i.box(16, 16, 23, 25, '#4a5830'); i.rect(8, 16, 23, 17, '#3a4626')
    i.line([(9, 10), (22, 10)], '#3a4626', 2); i.line([(12, 4), (12, 1), (19, 1), (19, 4)], '#3a4626', 2)
@icon('bag_school')
def _(i):
    i.ball(8, 6, 23, 18, '#3a5ea8', hl=False); i.box(8, 11, 23, 28, '#3a5ea8'); i.rect(9, 7, 22, 10, '#4a72c0'); i.box(11, 18, 20, 25, '#e0b030'); i.rect(11, 18, 20, 19, '#b88a20')
    i.line([(13, 6), (13, 3), (18, 3), (18, 6)], '#26304a', 2); i.rect(15, 21, 16, 22, '#26304a')
@icon('sportbag')
def _(i):
    i.ball(2, 12, 11, 26, '#a8322a', hl=False); i.ball(21, 12, 30, 26, '#a8322a', hl=False); i.box(6, 12, 26, 26, '#b83a30'); i.rect(7, 12, 25, 14, '#d04a3a')
    i.rect(6, 18, 26, 20, '#26262a'); i.line([(10, 12), (12, 6), (20, 6), (22, 12)], '#26262a', 2); i.ell(14, 21, 18, 24, '#e8e4da')
@icon('sleepbag')
def _(i):
    i.box(9, 9, 27, 25, '#3f6a48'); i.rect(9, 9, 27, 10, '#5a8a62'); i.rect(9, 23, 27, 25, '#2e4e36')
    i.ball(3, 9, 14, 25, '#4a7a52'); i.ell(5, 12, 12, 22, '#2e4e36'); i.ell(7, 15, 10, 19, '#5a8a62')
    for x in (15, 23): i.rect(x, 9, x + 1, 25, '#26262a')
@icon('seeds2')
def _(i): pass

# skill journals: colour + emblem, volume shown as pips
EMB = {
    'carp': ('#8a5a32', lambda i: (i.line([(11, 21), (17, 14)], '#e8d8b0', 2), i.rect(15, 12, 19, 14, '#e8d8b0'))),
    'cook': ('#b0302a', lambda i: (i.box(11, 15, 18, 20, '#e8d8b0'), i.rect(10, 15, 19, 15, '#e8d8b0'), i.rect(9, 16, 9, 17, '#e8d8b0'))),
    'farm': ('#3f7a3a', lambda i: (i.ell(11, 13, 18, 19, '#bfe0a0'), i.line([(11, 21), (15, 16)], '#e8d8b0'))),
    'fight': ('#2f4f8a', lambda i: (i.box(11, 14, 18, 19, '#e8d8b0'), i.rect(11, 14, 11, 19, '#c8b890'))),
    'med': ('#e8e4da', lambda i: (i.rect(13, 13, 16, 21, '#c0302a'), i.rect(11, 15, 18, 18, '#c0302a'))),
    'tail': ('#6a3a7a', lambda i: (i.line([(11, 21), (18, 13)], '#e8e4da'), i.line([(11, 14), (14, 19), (18, 17)], '#f0a0a0'))),
    'mech': ('#c8782a', lambda i: (i.ball(11, 13, 18, 20, '#3a3c42', hl=False), i.ell(13, 15, 16, 18, '#c8782a'))),
}
for sk, (c, em) in EMB.items():
    for n in (1, 2, 3):
        ICONS['book_' + sk + ('' if n == 1 else str(n))] = (lambda c, em, n: lambda i: book(i, c, em, n))(c, em, n)

# drop the placeholders
for k in [k for k in ICONS if k.endswith('2') and not k.startswith('book_')]: del ICONS[k]

# ---- v26: gloves, glass, shiv, water filter ----
def glove(i, c, cuff, dx=0, stitch=None, mitt=False):
    c = col(c)
    i.box(9 + dx, 20, 20 + dx, 28, cuff)                                   # cuff
    i.ball(8 + dx, 9, 21 + dx, 22, c, hl=False); i.rect(8 + dx, 15, 21 + dx, 21, c)   # palm
    if mitt:
        i.ball(4 + dx, 12, 10 + dx, 19, sh(c, .9), hl=False)                # thumb
        i.ell(9 + dx, 3, 20 + dx, 15, c)
    else:
        for k, x in enumerate((9, 12, 15, 18)):                          # fingers
            top = (6, 3, 3, 5)[k]
            i.box(x + dx, top, x + 2 + dx, 14, sh(c, 1.04 - k * .04))
        i.box(4 + dx, 13, 8 + dx, 18, sh(c, .9))                          # thumb
    i.hl(9 + dx, 9, 11 + dx, 18, 1.18)
    if stitch:
        for y in range(16, 21, 2): i.p(14 + dx, y, stitch)
@icon('gloves')
def _(i): glove(i, '#c89a3c', '#3a5a8a'); i.rect(10, 22, 19, 22, '#5a7aaa')
@icon('glovesR')
def _(i): glove(i, (186, 168, 134, 255), (150, 128, 100, 255), stitch='#6a4a6a'); i.p(11, 10, '#8a6a8a'); i.p(17, 18, '#7a9a6a')
@icon('mittens')
def _(i): glove(i, '#a8342e', (236, 232, 222, 255), mitt=True); [i.p(x, 12, (236, 232, 222, 255)) for x in (11, 14, 17)]; [i.p(x, 17, (236, 232, 222, 255)) for x in (12, 15, 18)]
@icon('glass')
def _(i):
    for pts, c in (([(4, 22), (12, 9), (15, 24)], (176, 214, 226, 255)), ([(14, 26), (20, 7), (26, 20)], (150, 196, 212, 255)), ([(9, 28), (17, 25), (12, 20)], (196, 226, 236, 255))):
        i.poly(pts, c)
    i.line([(12, 11), (13, 21)], (238, 248, 252, 255)); i.line([(20, 10), (23, 18)], (230, 244, 250, 255))
@icon('shiv')
def _(i):
    i.poly([(13, 18), (24, 3), (27, 5), (17, 21)], (172, 212, 224, 255)); i.line([(15, 18), (25, 4)], (238, 248, 252, 255))
    i.line([(5, 27), (14, 18)], (190, 172, 136, 255), 5); [i.line([(6 + k * 3, 23 + k * -3 + 4), (9 + k * 3, 26 + k * -3 + 4)], (140, 120, 92, 255)) for k in range(3)]
@icon('filter')
def _(i):
    i.cyl(9, 4, 22, 28, (176, 206, 214, 255), top=(120, 150, 160, 255))
    i.rect(10, 9, 21, 12, (210, 196, 160, 255)); i.rect(10, 13, 21, 17, (46, 44, 46, 255)); i.rect(10, 18, 21, 20, (210, 196, 160, 255))
    i.rect(10, 22, 21, 27, (120, 180, 220, 255)); i.rect(11, 22, 12, 27, (170, 210, 236, 255))
    for x in (12, 15, 18): i.p(x, 21, (120, 180, 220, 255))

# ---- v34: wardrobe — shirts, trousers, footwear, caps ----
def tee(i, c, long=False, collar=None, pat=None, hood=None, neck=True):
    c = col(c); d = sh(c, .82)
    if long:
        i.poly([(5, 9), (11, 6), (20, 6), (26, 9), (29, 26), (25, 27), (23, 15), (23, 28), (8, 28), (8, 15), (6, 27), (2, 26)], c)
        i.poly([(26, 9), (29, 26), (25, 27), (23, 15)], d); i.poly([(5, 9), (2, 26), (6, 27), (8, 15)], sh(c, .92))
        i.rect(2, 25, 6, 27, sh(c, .7)); i.rect(25, 25, 29, 27, sh(c, .62))
    else:
        i.poly([(4, 10), (11, 6), (20, 6), (27, 10), (29, 15), (24, 17), (23, 14), (23, 28), (8, 28), (8, 14), (7, 17), (2, 15)], c)
        i.poly([(27, 10), (29, 15), (24, 17), (23, 14)], d); i.poly([(4, 10), (2, 15), (7, 17), (8, 14)], sh(c, .92))
    i.rect(17, 8, 23, 27, sh(c, .9)); i.rect(8, 27, 23, 28, sh(c, .66))
    if pat: pat(i)
    if hood: i.poly([(10, 7), (16, 2), (21, 7), (19, 10), (12, 10)], hood); i.line([(14, 10), (14, 15)], (230, 230, 226, 255)); i.line([(17, 10), (17, 15)], (230, 230, 226, 255))
    elif neck: i.ell(12, 5, 19, 9, collar or sh(c, .6)); i.ell(13, 5, 18, 7, sh(c, .45))
def trousers(i, c, short=False, pockets=False, pat=None):
    c = col(c); y1 = 18 if short else 29
    i.poly([(8, 3), (23, 3), (25, y1), (17, y1), (16, 11), (14, 11), (13, y1), (6, y1)], c)
    i.poly([(16, 3), (23, 3), (25, y1), (17, y1), (16, 11)], sh(c, .86)); i.rect(8, 3, 23, 5, sh(c, .7)); i.rect(15, 5, 15, 10, sh(c, .6))
    i.rect(6, y1, 13, y1, sh(c, .62)); i.rect(17, y1, 25, y1, sh(c, .55))
    if pockets: i.box(5, 13, 9, 18, sh(c, .82)); i.box(22, 13, 26, 18, sh(c, .72))
    if pat: pat(i)
def shoe(i, c, sole=(46, 40, 38, 255), high=0, lace=None, toe=None):
    c = col(c)
    for dx, k in ((0, 1), (11, .86)):
        i.poly([(3 + dx, 17 - high), (9 + dx, 17 - high), (10 + dx, 21), (16 + dx, 23), (16 + dx, 27), (3 + dx, 27)], sh(c, k))
        i.rect(3 + dx, 27, 16 + dx, 28, sole)
        if toe: i.rect(12 + dx, 24, 16 + dx, 27, toe)
        if lace:
            for y in range(19 - high, 23, 2): i.line([(5 + dx, y), (8 + dx, y)], lace)
def plaid(c1, c2):
    def f(i):
        for x in range(4, 29, 5): i.line([(x, 6), (x, 28)], c1)
        for y in range(9, 28, 5): i.line([(3, y), (28, y)], c2)
    return f
def camo(i, cols=('#4a5630', '#6e5a3a', '#2e3424')):
    import random; r = random.Random(7)
    for _ in range(26):
        x, y = r.randint(3, 27), r.randint(5, 27); i.ell(x, y, x + r.randint(2, 4), y + r.randint(1, 3), cols[r.randint(0, 2)])
def keep_inside(fn, base):
    """узор поверх уже нарисованной вещи: красим только там, где вещь"""
    def f(i):
        snap = i.im.copy(); fn(i); px = i.im.load(); sp = snap.load()
        for y in range(32):
            for x in range(32):
                if not sp[x, y][3]: px[x, y] = (0, 0, 0, 0)
    return f
@icon('tshirt')
def _(i): tee(i, '#c9bc9e')
@icon('tank')
def _(i):
    c = (226, 226, 220, 255); i.poly([(9, 4), (12, 4), (14, 9), (17, 9), (19, 4), (22, 4), (23, 12), (23, 28), (8, 28), (8, 12)], c); i.rect(17, 9, 23, 27, sh(c, .88)); i.rect(8, 27, 23, 28, sh(c, .7))
@icon('longsl')
def _(i): tee(i, '#3d5f86', long=True)
@icon('flannel')
def _(i): tee(i, '#a8342e', long=True, collar='#5a1a16', pat=keep_inside(plaid('#5a1a16', '#d8a070'), None)); i.rect(15, 9, 15, 27, '#5a1a16'); [i.p(16, y, (230, 220, 200, 255)) for y in (12, 17, 22)]
@icon('hoodie')
def _(i): tee(i, '#7a7e86', long=True, hood='#686c74'); i.box(10, 19, 21, 24, sh('#7a7e86', .85))
@icon('thermal')
def _(i): tee(i, '#d8cfc0', long=True); [i.line([(9, y), (22, y)], (196, 186, 170, 255)) for y in range(11, 27, 3)]
@icon('denimJ')
def _(i): torso(i, '#4a6a9a', collar='#2e4a74', zip='#c8a040'); i.box(9, 12, 13, 15, '#3e5e8e'); i.box(18, 12, 22, 15, '#36557f'); [i.p(15, y, '#c8a040') for y in (12, 16, 20, 24)]
@icon('workvest')
def _(i):
    c = '#d07a1e'; i.poly([(8, 5), (12, 5), (16, 10), (19, 5), (23, 5), (25, 28), (6, 28)], c); i.rect(16, 10, 25, 27, sh(c, .85))
    i.rect(6, 17, 25, 18, (220, 224, 210, 255)); i.rect(6, 22, 25, 23, (220, 224, 210, 255)); i.box(8, 11, 13, 15, sh(c, .8)); i.box(18, 11, 23, 15, sh(c, .72))
@icon('milJ')
def _(i): torso(i, '#5a6a3a', collar='#3a4626'); keep_inside(camo, None)(i); i.rect(15, 9, 15, 27, '#2a3020'); i.box(9, 12, 13, 15, '#4a5830'); i.box(18, 12, 22, 15, '#4a5830')
@icon('jeans')
def _(i): trousers(i, '#3e5a86'); i.line([(9, 6), (11, 9)], '#c8a040'); i.line([(22, 6), (20, 9)], '#c8a040')
@icon('shorts')
def _(i): trousers(i, '#8a7a5a', short=True, pockets=False)
@icon('sweatp')
def _(i): trousers(i, '#3a3c44'); i.line([(7, 6), (6, 28)], (220, 220, 220, 255)); i.line([(24, 6), (24, 28)], (190, 190, 190, 255))
@icon('cargo')
def _(i): trousers(i, '#7a7258', pockets=True)
@icon('milP')
def _(i): trousers(i, '#5a6a3a', pockets=True, pat=keep_inside(camo, None))
@icon('motoP')
def _(i): trousers(i, '#2a2a2e'); i.box(7, 15, 12, 20, '#4a4a52'); i.box(18, 15, 23, 20, '#3e3e46')
@icon('sneakers')
def _(i): shoe(i, (230, 230, 226, 255), sole=(200, 60, 50, 255), lace=(90, 90, 96, 255))
@icon('boots')
def _(i): shoe(i, '#8a5a32', high=6, lace=(60, 40, 24, 255), sole=(40, 34, 30, 255))
@icon('milB')
def _(i): shoe(i, '#2a2a2c', high=8, lace=(90, 90, 96, 255), sole=(20, 20, 20, 255))
@icon('slippers')
def _(i): shoe(i, '#7a5a8a', sole=(200, 190, 180, 255)); i.ball(5, 18, 9, 22, (236, 232, 222, 255), hl=False)
@icon('rubberB')
def _(i): shoe(i, '#3a6a3a', high=10, sole=(30, 40, 30, 255)); i.rect(3, 7, 9, 8, sh('#3a6a3a', 1.25)); i.rect(14, 7, 20, 8, sh('#3a6a3a', 1.1))
@icon('cap')
def _(i): i.ball(6, 8, 25, 26, '#b03a30'); i.rect(5, 19, 26, 27, (0, 0, 0, 0)); i.poly([(14, 18), (29, 18), (30, 22), (14, 22)], sh('#b03a30', .75)); i.ball(14, 7, 17, 10, sh('#b03a30', .7), hl=False)
@icon('balacl')
def _(i): i.ball(6, 3, 25, 29, '#26262a'); i.box(10, 12, 21, 17, (200, 160, 130, 255)); i.rect(12, 14, 13, 15, '#26262a'); i.rect(18, 14, 19, 15, '#26262a')

def build(out_png, out_json, preview=None):
    names = list(ICONS)
    cols, S = 8, 96
    rows = math.ceil(len(names) / cols)
    sheet = Image.new('RGBA', (cols * S, rows * S), (0, 0, 0, 0)); meta = {}
    for k, n in enumerate(names):
        ic = Ic(); ICONS[n](ic); ic.outline()
        big = ic.im.resize((S, S), Image.NEAREST)
        x, y = (k % cols) * S, (k // cols) * S
        sheet.paste(big, (x, y)); meta[n] = [x, y, S, S]
    sheet.save(out_png, optimize=True); json.dump(meta, open(out_json, 'w'))
    if preview:
        bg = Image.new('RGBA', sheet.size, (30, 34, 34, 255)); bg.alpha_composite(sheet); bg.save(preview)
    print(len(names), 'icons', sheet.size)

if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
