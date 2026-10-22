#!/usr/bin/env python3
"""Новая мебель для игры на 3D-основе tools/furn3d/render.py: модели в метрах, 4 поворота как WDI в игре,
чистый пиксель с тёмной кромкой (как у персонажей), без тени на полу. Кадры дописываются в лист furn2 и атлас.
   python3 tools/furn3d/game.py preview out.png [имена]  # превью: старые и новые кадры рядом
   python3 tools/furn3d/game.py hd [имена]              # детальные кадры ×3 в assets/sprites/furn3.png (стиль PZ)
   python3 tools/furn3d/game.py export [имена]          # перерисовать и переупаковать assets/sprites/furn2.png + atlas.json
Координаты модели: x — вдоль стены, y — от стены (0) к лицевой стороне, z — вверх. Лицом модель смотрит в +y.
"""
import sys, os, json
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import render as F
F.WEAR = float(os.environ.get('WEAR', 1.0))         # потёртости: 0 — новая мебель, 1 — сильно ношеная
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

# ---------- кухня, спальня, ванная: чистые формы, по одному-два опознавательных признака, сверху пусто ----------
mat('paint_w', '#e6e3da', .25, .3); mat('paint_w2', '#d2cec4', .2, .35)
mat('top', '#b9b3a8', .15, .45); mat('top_d', '#45474c', .2, .4)
mat('glass_d', '#23272c', .7, .1); mat('burner', '#1d1e21', .15, .5); mat('gap', '#141210', 0, .9)
mat('mirror', '#9ebccb', .9, .06); mat('cross', '#c4372e', .05, .5)
mat('steel', '#a7adb2', .55, .2); mat('stripe', '#b2392f', .1, .5)
mat('woodn', '#8f6440', .05, .6, wood_pat(0)); mat('woodnv', '#86603e', .05, .6, wood_pat(2))
mat('woodnd', '#5a3a24', .05, .6, wood_pat(0))

def knob(m, x, y, z, r=.024, mt='brass'): m.add(sphere((x, y + r * .6, z), r), mt)
def hbar(m, x0, x1, y, z, r=.011, mt='chrome'):           # горизонтальная ручка-скоба
    m.add(capsule((x0, y + .03, z), (x1, y + .03, z), r), mt)
    for x in (x0, x1): m.add(capsule((x, y, z), (x, y + .03, z), r * .8), mt)
def vbar(m, x, y, z0, z1, r=.012, mt='chrome'):           # вертикальная ручка-скоба
    m.add(capsule((x, y + .035, z0), (x, y + .035, z1), r), mt)
    for z in (z0, z1): m.add(capsule((x, y, z), (x, y + .035, z), r * .8), mt)
def front(m, x0, x1, z0, z1, y, mt, r=.012, t=.022):        # фасад (дверца, ящик), чуть выступает из корпуса
    m.add(rbox(((x0 + x1) / 2, y + t / 2, (z0 + z1) / 2), ((x1 - x0) / 2, t / 2, (z1 - z0) / 2), r), mt)
def gapband(m, x0, x1, z0, z1, y):                         # тёмный зазор за фасадами — читается как щель
    m.add(rbox(((x0 + x1) / 2, y - .004, (z0 + z1) / 2), ((x1 - x0) / 2, .006, (z1 - z0) / 2), .002), 'gap')

def fridge():
    m = Model(); W, D, Hh = .6, .64, 1.78; cx = W / 2
    m.add(rbox((cx, D / 2, Hh / 2 + .04), (W / 2, D / 2, Hh / 2 - .04), .03), 'paint_w')     # корпус
    m.add(rbox((cx, D / 2 + .02, .04), (W / 2 - .03, D / 2 - .03, .04), .01), 'gap')         # цоколь
    gapband(m, .03, W - .03, .1, Hh - .02, D)
    front(m, .015, W - .015, 1.25, Hh - .015, D, 'paint_w', .02, .035)                       # морозилка
    front(m, .015, W - .015, .1, 1.19, D, 'paint_w', .02, .035)                               # холодильная камера
    m.add(rbox((cx, D + .006, .07), (W / 2 - .03, .01, .03), .004), 'plastic')       # решётка внизу двери
    vbar(m, .07, D + .035, 1.3, 1.52, .016, 'plastic'); vbar(m, .07, D + .035, .84, 1.12, .016, 'plastic')                     # ручки у края
    m.add(rbox((W - .14, D + .037, 1.48), (.045, .004, .055), .003), 'sheet_w')               # одна записка на магните
    m.add(sphere((W - .14, D + .042, 1.53), .012), 'cross')
    return m, (W, D)

def stove():
    m = Model(); W, D, Hh = .6, .6, .9; cx = W / 2
    m.add(rbox((cx, D / 2, Hh / 2), (W / 2, D / 2, Hh / 2), .02), 'paint_w')
    m.add(rbox((cx, .04, Hh + .08), (W / 2, .04, .09), .015), 'paint_w')                      # задний бортик
    m.add(rbox((cx, D / 2 + .02, Hh + .002), (W / 2 - .025, D / 2 - .06, .006), .004), 'paint_w2')  # варочная поверхность
    for x in (.16, .44):
        for y, r in ((.2, .085), (.44, .07)):
            m.add(cylz(x, y, r, Hh, Hh + .018, .006), 'burner')                              # конфорки
            m.add(cylz(x, y, r * .45, Hh + .012, Hh + .024, .004), 'steel')
    m.add(rbox((cx, D + .005, .815), (W / 2 - .02, .012, .055), .01), 'paint_w2')            # панель ручек
    for k in range(4): knob(m, .1 + k * .133, D + .016, .815, .022, 'burner')
    gapband(m, .03, W - .03, .07, .75, D)
    front(m, .02, W - .02, .2, .74, D, 'paint_w', .015, .03)                                  # дверца духовки
    m.add(rbox((cx, D + .031, .44), (W / 2 - .09, .004, .15), .02), 'glass_d')                # стекло
    hbar(m, .1, W - .1, D + .03, .68)
    front(m, .02, W - .02, .07, .18, D, 'paint_w2', .012, .025)                               # ящик снизу
    m.add(rbox((cx, D / 2, .03), (W / 2 - .02, D / 2 - .02, .03), .005), 'gap')
    return m, (W, D)

def base_unit(m, W, D, Hh=.88, top='top'):
    """кухонный модуль: корпус, цоколь, столешница с напуском"""
    m.add(rbox((W / 2, D / 2 - .01, Hh / 2 + .05), (W / 2 - .01, D / 2 - .01, Hh / 2 - .05), .01), 'woodnd')
    m.add(rbox((W / 2, D / 2 - .03, .05), (W / 2 - .02, D / 2 - .03, .05), .005), 'gap')
    m.add(rbox((W / 2, D / 2, Hh + .02), (W / 2, D / 2, .022), .01), top)

def doors2(m, W, D, z0, z1, mt='woodnv'):
    for x0, x1, kx in ((.02, W / 2 - .012, W / 2 - .06), (W / 2 + .012, W - .02, W / 2 + .06)):
        front(m, x0, x1, z0, z1, D - .03, mt)
        m.add(rbox(((x0 + x1) / 2, D - .005, (z0 + z1) / 2), ((x1 - x0) / 2 - .05, .004, (z1 - z0) / 2 - .05), .01), 'woodn')  # филёнка
        knob(m, kx, D - .008, z1 - .07)

def sink():
    m = Model(); W, D = .64, .62; cx = W / 2
    base_unit(m, W, D)
    m.parts.pop()                                                                              # столешница — с вырезом
    f, bb, mt = m.parts[0]; hole = rbox((cx, D / 2 + .04, .93), (.2, .17, .14), .04)[0]
    m.parts[0] = ((lambda p: np.maximum(f(p), -hole(p))), bb, mt)
    m.add(cut(rbox((cx, D / 2, .9), (W / 2, D / 2, .022), .01), rbox((cx, D / 2 + .04, .93), (.2, .17, .06), .04)), 'top')
    m.add(cut(rbox((cx, D / 2 + .04, .85), (.21, .18, .06), .035), rbox((cx, D / 2 + .04, .9), (.185, .155, .08), .04)), 'steel')  # чаша
    m.add(cylz(cx, D / 2 + .04, .022, .80, .826, .005), 'gap')                                # слив
    m.add(cylz(cx, .08, .022, .92, 1.08, .008), 'chrome')                                    # смеситель
    m.add(capsule((cx, .08, 1.08), (cx, .22, 1.06), .014), 'chrome')
    m.add(capsule((cx, .22, 1.06), (cx, .23, 1.02), .012), 'chrome')
    for x in (cx - .07, cx + .07): m.add(capsule((x, .08, .94), (x, .1, .96), .013), 'chrome')
    doors2(m, W, D, .12, .84)
    return m, (W, D)

def cabinet():
    m = Model(); W, D = .64, .62
    base_unit(m, W, D)
    gapband(m, .03, W - .03, .12, .86, D - .03)
    front(m, .02, W - .02, .7, .855, D - .03, 'woodn')                                        # ящик
    hbar(m, W / 2 - .1, W / 2 + .1, D - .01, .78, .014, 'brass')
    doors2(m, W, D, .12, .67)
    return m, (W, D)

def counter2():
    m = Model(); W, D, Hh = 1.24, .62, .95
    m.add(rbox((W / 2, D / 2 - .01, Hh / 2 + .05), (W / 2 - .02, D / 2 - .03, Hh / 2 - .05), .01), 'paint_w2')
    m.add(rbox((W / 2, D / 2 - .03, .05), (W / 2 - .03, D / 2 - .05, .05), .005), 'gap')
    m.add(rbox((W / 2, D / 2, Hh + .02), (W / 2, D / 2, .025), .012), 'top_d')               # тёмная столешница
    for k in range(3):                                                                         # три панели фасада
        x0 = .04 + k * (W - .08) / 3
        front(m, x0 + .01, x0 + (W - .08) / 3 - .01, .14, Hh - .04, D - .04, 'paint_w')
    m.add(rbox((W / 2, D - .01, .62), (W / 2 - .03, .008, .035), .006), 'stripe')             # красная полоса магазина
    m.add(rbox((.92, D / 2 - .06, Hh + .1), (.13, .11, .065), .02), 'top_d')                  # касса — главный признак прилавка
    m.add(rbox((.92, D / 2 - .1, Hh + .19), (.1, .02, .045), .01), 'glass_d')
    m.add(rbox((.92, D / 2 + .02, Hh + .175), (.11, .05, .012), .006), 'paint_w2')
    return m, (W, D)

def dresser():
    m = Model(); W, D, Hh = 1.0, .46, .86
    m.add(rbox((W / 2, D / 2 - .01, Hh / 2 + .04), (W / 2 - .02, D / 2 - .02, Hh / 2 - .04), .01), 'woodnd')
    m.add(rbox((W / 2, D / 2, Hh + .02), (W / 2 + .015, D / 2 + .015, .022), .012), 'woodn')  # крышка с напуском
    for x in (.04, W - .04): m.add(rbox((x, D - .05, .04), (.03, .03, .045), .008), 'woodnd')  # ножки
    gapband(m, .03, W - .03, .09, Hh - .02, D - .02)
    n = 4; z0, z1 = .09, Hh - .02; h = (z1 - z0) / n
    for k in range(n):
        a = z0 + k * h + .015; b = z0 + (k + 1) * h - .015
        front(m, .03, W - .03, a, b, D - .02, 'woodn')
        for x in (W * .27, W * .73): hbar(m, x - .06, x + .06, D, (a + b) / 2, .014, 'brass')
    return m, (W, D)

def nightstand():
    m = Model(); W, D, Hh = .46, .42, .56
    body = rbox((W / 2, D / 2 - .01, Hh / 2 + .04), (W / 2 - .02, D / 2 - .02, Hh / 2 - .04), .01)
    m.add(cut(body, rbox((W / 2, D, .23), (W / 2 - .05, D / 2 - .04, .1), .01)), 'woodnd')    # открытая ниша внизу
    m.add(rbox((W / 2, D / 2, Hh + .02), (W / 2 + .012, D / 2 + .012, .02), .01), 'woodn')
    for x in (.04, W - .04): m.add(rbox((x, D - .05, .035), (.025, .025, .04), .008), 'woodnd')
    gapband(m, .04, W - .04, .38, Hh - .02, D - .02)
    front(m, .03, W - .03, .39, Hh - .025, D - .02, 'woodn')                                   # ящик
    knob(m, W / 2, D, (.39 + Hh - .025) / 2, .02)
    m.add(rbox((W / 2, D / 2 + .06, .145), (.09, .06, .015), .006), 'book1')                   # книга в нише
    return m, (W, D)

def wardrobe():
    m = Model(); W, D, Hh = 1.02, .6, 2.0; cx = W / 2
    m.add(rbox((cx, D / 2, Hh / 2 + .05), (W / 2 - .01, D / 2 - .01, Hh / 2 - .05), .012), 'woodnd')
    m.add(rbox((cx, D / 2, Hh + .02), (W / 2 + .02, D / 2 + .02, .025), .012), 'woodn')      # карниз
    m.add(rbox((cx, D / 2 - .02, .05), (W / 2 - .02, D / 2 - .03, .05), .005), 'gap')
    gapband(m, .02, W - .02, .1, Hh - .02, D - .01)
    for x0, x1 in ((.02, cx - .01), (cx + .01, W - .02)):
        front(m, x0, x1, .1, Hh - .03, D - .01, 'woodnv', .012, .025)
        xc = (x0 + x1) / 2
        for a, b in ((.18, .9), (1.0, Hh - .12)):                                              # две филёнки на дверь
            m.add(rbox((xc, D + .016, (a + b) / 2), ((x1 - x0) / 2 - .06, .004, (b - a) / 2), .012), 'woodn')
    for x in (cx - .04, cx + .04): m.add(capsule((x, D + .04, .88), (x, D + .04, 1.08), .016), 'brass')
    return m, (W, D)

def medcab():
    """шкафчик в ванной: белый, зеркальная дверца сверху, красный крест внизу — не путается с холодильником"""
    m = Model(); W, D, Hh = .58, .36, 1.5; cx = W / 2
    m.add(rbox((cx, D / 2, Hh / 2 + .06), (W / 2, D / 2, Hh / 2 - .06), .015), 'paint_w')
    for x in (.05, W - .05): m.add(cylz(x, D - .06, .018, 0, .09, .006), 'chrome')            # ножки
    for x in (.05, W - .05): m.add(cylz(x, .06, .018, 0, .09, .006), 'chrome')
    gapband(m, .03, W - .03, .14, Hh - .03, D)
    front(m, .02, W - .02, .8, Hh - .03, D, 'paint_w', .012, .022)                              # верхняя дверца
    m.add(rbox((cx, D + .024, (.8 + Hh - .03) / 2), (W / 2 - .06, .003, (Hh - .83) / 2 - .05), .01), 'mirror')
    front(m, .02, W - .02, .14, .76, D, 'paint_w', .012, .022)                                  # нижняя дверца
    m.add(rbox((cx, D + .025, .5), (.075, .003, .025), .002), 'cross')                         # крест
    m.add(rbox((cx, D + .025, .5), (.025, .003, .075), .002), 'cross')
    for z in (.72, .86): knob(m, W - .07, D + .02, z, .016, 'chrome')
    return m, (W, D)


# ---------- спальня и ванная: кровати с вариантами покрывала, ванна ----------
BLANKETS = [('#8e3b34', '#6e2c27'), ('#3e5a7e', '#2f4562'), ('#4f6b3e', '#3c532f')]   # красное, синее, зелёное
for k, (c, c2) in enumerate(BLANKETS): mat('blanket%d' % k, c, 0, .9); mat('blanket%dd' % k, c2, 0, .9)
mat('linen', '#ebe6da', 0, .9); mat('linen2', '#d9d3c4', 0, .9)

def _bed(W, L, v, pillows):
    """изголовье у стены (y = 0), всё строго внутри следа W × L"""
    m = Model(); cx = W / 2; b = 'blanket%d' % (v % 3)
    m.add(rbox((cx, .045, .52), (W / 2, .045, .52), .025), 'wooddy')                          # изголовье
    m.add(rbox((cx, .055, .62), (W / 2 - .07, .012, .3), .02), 'woody')                       # филёнка изголовья
    m.add(rbox((cx, L - .03, .22), (W / 2, .03, .22), .02), 'wooddy')                        # изножье — низкое, не путается с изголовьем
    m.add(rbox((cx, L / 2, .24), (W / 2 - .01, L / 2 - .07, .1), .02), 'woody')               # царга
    for x in (.05, W - .05):
        for y in (.09, L - .09): m.add(rbox((x, y, .07), (.04, .04, .07), .01), 'wooddy')     # ножки
    m.add(rbox((cx, L / 2, .41), (W / 2 - .05, L / 2 - .1, .085), .05), 'linen2')            # матрас
    m.add(rbox((cx, L / 2 + .24, .44), (W / 2 - .025, L / 2 - .32, .09), .06), b)             # одеяло, свисает с боков
    m.add(rbox((cx, L - .11, .38), (W / 2 - .025, .03, .1), .03), b)
    m.add(rbox((cx, .62, .525), (W / 2 - .035, .09, .022), .02), 'linen')                     # отворот простыни
    m.add(rbox((cx, L / 2 + .24, .535), (W / 2 - .06, .012, .004), .003), b + 'd')            # полоса на одеяле
    for k in range(pillows):
        px = W * (k + .5) / pillows
        m.add(rbox((px, .29, .55), (W / pillows / 2 - .07, .14, .065), .06), 'linen')        # подушки
    return m, (W, L)

def bed(v=0): return _bed(1.37, 1.97, v, 2)
def bed1(v=0): return _bed(.89, 1.96, v, 1)

def bath():
    """ванна торцом к стене: смеситель у стены, внутри вода, снаружи эмалированный фартук"""
    m = Model(); W, L, Hh = .76, 1.7, .56; cx = W / 2
    tub = rbox((cx, L / 2, Hh / 2), (W / 2, L / 2, Hh / 2), .06)
    hole = rbox((cx, L / 2 + .02, Hh + .1), (W / 2 - .085, L / 2 - .12, .5), .14)
    m.add(cut(tub, hole), 'enamel')
    m.add(rbox((cx, L / 2 + .02, .3), (W / 2 - .1, L / 2 - .14, .006), .1), 'water')       # вода
    m.add(rbox((cx, L / 2, .02), (W / 2 - .03, L / 2 - .03, .02), .01), 'gap')               # тень под ванной
    m.add(cylz(cx, .035, .028, Hh, Hh + .2, .01), 'chrome')                                  # смеситель
    m.add(capsule((cx, .035, Hh + .19), (cx, .16, Hh + .17), .016), 'chrome')
    m.add(capsule((cx, .16, Hh + .17), (cx, .17, Hh + .12), .014), 'chrome')
    for x in (cx - .1, cx + .1): m.add(sphere((x, .045, Hh + .07), .024), 'chrome')           # вентили
    m.add(cylz(cx, .23, .025, .16, .2, .005), 'chrome')                                      # перелив
    return m, (W, L)


# ---------- гостиная, кладовая, прихожая ----------
SOFAS = [('#8a4a3a', '#6e3a2e'), ('#3f5878', '#30455f'), ('#56703f', '#435832')]
for k, (c, c2) in enumerate(SOFAS): mat('sofa%d' % k, c, .02, .85); mat('sofa%dd' % k, c2, .02, .85)
mat('cardboard', '#a8835a', 0, .85); mat('cardboard2', '#8e6c48', 0, .85); mat('tin', '#9aa2a8', .5, .25)
mat('jar', '#c9b06a', .4, .2); mat('coat_r', '#8e2f2a', 0, .9); mat('coat_b', '#2f4a72', 0, .9); mat('hat', '#26262a', .05, .7)
BOOKC = ['#8a2e2a', '#2e4a7a', '#b08a3a', '#3a6a40', '#5a3a6a', '#c8b89a', '#2a2a2e', '#a8502a']
for k, c in enumerate(BOOKC): mat('bk%d' % k, c, .05, .7)

def sofa(v=0):
    m = Model(); W, D = 1.96, .86; a, b = 'sofa%d' % (v % 3), 'sofa%dd' % (v % 3)
    m.add(rbox((W / 2, D / 2, .22), (W / 2 - .02, D / 2 - .02, .16), .06), b)                  # основание
    m.add(rbox((W / 2, .13, .56), (W / 2 - .02, .12, .27), .09), b)                            # спинка
    for x in (.12, W - .12): m.add(rbox((x, D / 2 + .01, .44), (.11, D / 2 - .03, .2), .09), a)   # подлокотники
    for k in range(3):
        cx = .23 + (k + .5) * (W - .46) / 3
        m.add(rbox((cx, .51, .44), ((W - .46) / 6 - .012, .32, .08), .07), a)                   # сиденья
        m.add(rbox((cx, .3, .66), ((W - .46) / 6 - .016, .08, .19), .08), a)                    # подушки спинки
    for x in (.08, W - .08):
        for y in (.1, D - .08): m.add(cylz(x, y, .025, 0, .07, .01), 'woodd')
    return m, (W, D)

def _table(W, D):
    m = Model()
    m.add(rbox((W / 2, D / 2, .75), (W / 2, D / 2, .025), .015), 'woodn')                       # столешница
    m.add(rbox((W / 2, D / 2, .69), (W / 2 - .06, D / 2 - .06, .04), .008), 'woodnd')           # царга
    for x in (.06, W - .06):
        for y in (.06, D - .06): m.add(rbox((x, y, .36), (.028, .028, .36), .01), 'woodnd')    # ножки
    return m, (W, D)
def table(): return _table(1.2, .8)
def table1(): return _table(.84, .84)

def shelf(v=0):
    """металлический стеллаж; v=1 — с припасами на полках"""
    m = Model(); W, D, Hh = .9, .4, 1.6
    for x in (.02, W - .02):
        for y in (.02, D - .02): m.add(rbox((x, y, Hh / 2), (.018, .018, Hh / 2), .004), 'metal')
    zs = (.08, .58, 1.06, 1.54)
    for z in zs: m.add(rbox((W / 2, D / 2, z), (W / 2 - .01, D / 2 - .01, .012), .004), 'steel')
    if v:
        r = np.random.default_rng(3)
        for z in zs[:3]:
            x = .06
            while x < W - .14:
                kind = r.integers(0, 4); top = z + .012
                if kind == 0:   m.add(rbox((x + .1, D / 2, top + .1), (.1, .14, .1), .01), 'cardboard'); x += .22
                elif kind == 1:
                    for k in range(3): m.add(cylz(x + .04 + k * .07, D / 2 + .05, .03, top, top + .1, .006), 'tin')
                    x += .22
                elif kind == 2: m.add(cylz(x + .05, D / 2, .045, top, top + .14, .01), 'jar'); x += .12
                else:           m.add(rbox((x + .08, D / 2, top + .06), (.08, .12, .06), .01), 'cardboard2'); x += .18
    return m, (W, D)

def bookshelf(v=0):
    m = Model(); W, D, Hh = .8, .3, 1.8
    m.add(rbox((W / 2, .01, Hh / 2), (W / 2, .01, Hh / 2), .004), 'woodnd')                    # задняя стенка
    for x in (.015, W - .015): m.add(rbox((x, D / 2, Hh / 2), (.015, D / 2, Hh / 2), .006), 'woodn')
    zs = (.06, .5, .92, 1.34, Hh - .015)
    for z in zs: m.add(rbox((W / 2, D / 2, z), (W / 2 - .02, D / 2, .015), .005), 'woodn')
    m.add(rbox((W / 2, D - .01, .03), (W / 2 - .02, .01, .03), .004), 'woodnd')                # цоколь
    r = np.random.default_rng(11 + v)
    for z in zs[:4]:
        x = .04; z0 = z + .015
        while x < W - .06:
            if r.random() < .08 + .1 * v: x += .05; continue                                     # пробел на полке
            t = r.uniform(.025, .05); h = r.uniform(.24, .34); d = r.uniform(.17, .22)
            m.add(rbox((x + t / 2, .03 + d / 2, z0 + h / 2), (t / 2 - .002, d / 2, h / 2), .004), 'bk%d' % r.integers(0, len(BOOKC)))
            x += t
    return m, (W, D)

def crate():
    m = Model(); W, D, Hh = .62, .62, .52
    m.add(rbox((W / 2, D / 2, Hh / 2), (W / 2 - .03, D / 2 - .03, Hh / 2 - .01), .005), 'woodnd')
    for k in range(4):                                                                           # доски по бокам
        z = .04 + k * .12
        m.add(rbox((W / 2, D / 2, z + .05), (W / 2 - .01, D / 2 - .01, .052), .008), 'woodl' if k % 2 else 'woodlx')
    for x in (.03, W - .03):
        for y in (.03, D - .03): m.add(rbox((x, y, Hh / 2), (.03, .03, Hh / 2), .006), 'woodd')  # стойки
    m.add(rbox((W / 2, D / 2, Hh), (W / 2, D / 2, .02), .008), 'woodl')                        # крышка
    for x in (.12, W / 2, W - .12): m.add(rbox((x, D / 2, Hh + .022), (.04, D / 2 - .02, .006), .004), 'woodd')
    return m, (W, D)

def hanger():
    m = Model(); cx, cy = .17, .15
    m.add(cylz(cx, cy, .13, 0, .03, .012), 'woodd')                                            # основание
    m.add(cylz(cx, cy, .018, .02, 1.72, .008), 'woodn')                                        # стойка
    m.add(sphere((cx, cy, 1.74), .03), 'woodn')
    m.add(rbox((cx + .05, cy + .02, 1.18), (.07, .07, .3), .06), 'coat_r')                      # пальто
    m.add(rbox((cx - .04, cy + .06, 1.24), (.08, .06, .26), .06), 'coat_b')                     # куртка
    m.add(cylz(cx, cy + .02, .1, 1.6, 1.62, .008), 'hat'); m.add(cylz(cx, cy + .02, .06, 1.61, 1.68, .02), 'hat')
    return m, (.34, .3)

# ---------- компактные версии (одна клетка) — когда большая вещь нигде в комнате не помещается ----------
def armchair(v=0):
    m = Model(); W, D = .92, .72; a, b = 'sofa%d' % (v % 3), 'sofa%dd' % (v % 3)
    m.add(rbox((W / 2, D / 2, .22), (W / 2 - .02, D / 2 - .02, .16), .06), b)
    m.add(rbox((W / 2, .12, .56), (W / 2 - .02, .11, .27), .09), b)
    for x in (.11, W - .11): m.add(rbox((x, D / 2 + .01, .44), (.1, D / 2 - .03, .2), .09), a)
    m.add(rbox((W / 2, .44, .44), (W / 2 - .22, .25, .08), .07), a)
    m.add(rbox((W / 2, .27, .66), (W / 2 - .23, .07, .18), .08), a)
    for x in (.07, W - .07):
        for y in (.08, D - .07): m.add(cylz(x, y, .022, 0, .07, .01), 'woodd')
    return m, (W, D)
def sitbath():
    m = Model(); W, L, Hh = .9, .9, .6; cx = W / 2
    tub = rbox((cx, L / 2, Hh / 2), (W / 2, L / 2, Hh / 2), .07)
    m.add(cut(tub, rbox((cx, L / 2 + .02, Hh + .1), (W / 2 - .08, L / 2 - .1, .5), .14)), 'enamel')
    m.add(rbox((cx, L / 2 + .02, .32), (W / 2 - .09, L / 2 - .11, .006), .1), 'water')
    m.add(rbox((cx, .17, .4), (W / 2 - .1, .07, .03), .03), 'enamel')                            # ступенька-сиденье
    m.add(cylz(cx, .03, .025, Hh, Hh + .18, .01), 'chrome'); m.add(capsule((cx, .03, Hh + .17), (cx, .14, Hh + .15), .014), 'chrome')
    return m, (W, L)
def tvc():
    m, _ = tv1(); return m, (.8, .5)
def counterc():
    m = Model(); W, D, Hh = .88, .6, .95
    m.add(rbox((W / 2, D / 2 - .01, Hh / 2 + .05), (W / 2 - .02, D / 2 - .03, Hh / 2 - .05), .01), 'paint_w2')
    m.add(rbox((W / 2, D / 2 - .03, .05), (W / 2 - .03, D / 2 - .05, .05), .005), 'gap')
    m.add(rbox((W / 2, D / 2, Hh + .02), (W / 2, D / 2, .025), .012), 'top_d')
    front(m, .05, W - .05, .14, Hh - .04, D - .04, 'paint_w')
    m.add(rbox((W / 2, D - .01, .62), (W / 2 - .03, .008, .035), .006), 'stripe')
    m.add(rbox((.6, D / 2 - .06, Hh + .1), (.13, .11, .065), .02), 'top_d')
    m.add(rbox((.6, D / 2 - .1, Hh + .19), (.1, .02, .045), .01), 'glass_d')
    return m, (W, D)
COMPACT = {'bed': lambda v=0: _bed(.86, .86, v, 1), 'bath': sitbath, 'sofa': armchair,
           'table': lambda: _table(.78, .78), 'tv': tvc, 'counter2': counterc}

# ---------- больше мебели и декора: гостиная, спальня, кухня, ванная, прихожая ----------
mat('shade', '#e8dcc0', 0, .9, lambda p: 1 + .03 * np.sin(p[..., 2] * 300)); mat('bulb', '#fff2c8', 0, .3)
mat('wicker', '#b89a64', .02, .8, lambda p: 1 - .14 * ((np.sin(p[..., 2] * 160) > 0) ^ (np.sin((p[..., 0] + p[..., 1]) * 90) > 0)))
mat('cloth_b', '#5a76a0', 0, .9); mat('cloth_r', '#a8504a', 0, .9); mat('cloth_w', '#dcd8cc', 0, .9)
mat('ironrad', '#d8d4c8', .25, .4); mat('shoe', '#3a2a20', .2, .5); mat('shoe2', '#6a4a30', .15, .5)
mat('pot', '#8c4e34', .05, .7); mat('steel2', '#8e9498', .5, .25); mat('blk', '#24262a', .2, .5)
def coffeetab():
    m = Model(); W, D, Hh = 1.0, .55, .45
    m.add(rbox((W / 2, D / 2, Hh), (W / 2, D / 2, .025), .02), 'woodn')
    m.add(rbox((W / 2, D / 2, .12), (W / 2 - .06, D / 2 - .06, .015), .008), 'woodnd')                    # нижняя полка
    for x in (.05, W - .05):
        for y in (.05, D - .05): m.add(rbox((x, y, Hh / 2), (.025, .025, Hh / 2), .01), 'woodnd')
    m.add(rbox((.3, D / 2, .145), (.14, .1, .012), .004), 'sheet_w')                                     # газета на полке
    return m, (W, D)
def floorlamp():
    m = Model(); c = .2
    m.add(cylz(c, c, .14, 0, .03, .012), 'blk'); m.add(cylz(c, c, .014, .02, 1.45, .006), 'chrome')
    shade = cylz(c, c, .2, 1.32, 1.6, .02)
    m.add(cut(shade, cylz(c, c, .18, 1.3, 1.62)), 'shade'); m.add(sphere((c, c, 1.42), .045), 'bulb')
    return m, (.4, .4)
def plant():
    m = Model(); c = .25
    m.add(cut(cylz(c, c, .17, 0, .38, .03), cylz(c, c, .14, .33, .45)), 'pot'); m.add(cylz(c, c, .145, .3, .34), 'soil')
    m.add(cylz(c, c, .02, .3, .75, .008), 'woodd')
    r = np.random.default_rng(5)
    for i in range(16):
        a = r.uniform(0, 2 * np.pi); h = r.uniform(.6, 1.15); d = r.uniform(.05, .2)
        m.add(sphere((c + np.cos(a) * d, c + np.sin(a) * d, h), r.uniform(.07, .11)), 'leaf' if i % 2 else 'leaf2')
    return m, (.5, .5)
def endtable():
    m = Model(); W = .45
    m.add(rbox((W / 2, W / 2, .55), (W / 2, W / 2, .02), .012), 'woodn')
    for x in (.04, W - .04):
        for y in (.04, W - .04): m.add(rbox((x, y, .27), (.02, .02, .27), .008), 'woodnd')
    m.add(cylz(W / 2, W / 2 - .03, .06, .57, .6, .01), 'brass'); m.add(cylz(W / 2, W / 2 - .03, .012, .6, .78, .004), 'brass')   # настольная лампа
    m.add(cut(cylz(W / 2, W / 2 - .03, .1, .72, .88, .01), cylz(W / 2, W / 2 - .03, .09, .7, .9)), 'shade')
    return m, (W, W)
def wdesk():
    m = Model(); W, D, Hh = 1.1, .55, .75
    m.add(rbox((W / 2, D / 2, Hh), (W / 2, D / 2, .022), .012), 'woodn')
    m.add(rbox((W - .22, D / 2, (Hh - .02) / 2), (.2, D / 2 - .02, (Hh - .02) / 2), .01), 'woodnd')       # тумба с ящиками
    for k in range(3):
        z0 = .06 + k * .22; front(m, W - .4, W - .04, z0, z0 + .19, D - .02, 'woodn'); knob(m, W - .22, D, z0 + .1, .016)
    for y in (.05, D - .05): m.add(rbox((.05, y, Hh / 2), (.025, .025, Hh / 2), .01), 'woodnd')
    m.add(rbox((.05, D / 2, .2), (.02, D / 2 - .05, .02), .005), 'woodnd')
    m.add(rbox((.3, .14, Hh + .04), (.13, .08, .015), .005), 'sheet_w')                                  # тетрадь
    return m, (W, D)
def chair():
    m = Model(); W = .45
    m.add(rbox((W / 2, W / 2 + .02, .45), (W / 2 - .02, W / 2 - .04, .025), .015), 'woodn')
    for x in (.05, W - .05):
        for y in (.06, W - .03): m.add(rbox((x, y, .22), (.02, .02, .22), .008), 'woodnd')
        m.add(rbox((x, .04, .7), (.02, .02, .26), .008), 'woodnd')
    for z in (.62, .8): m.add(rbox((W / 2, .04, z), (W / 2 - .05, .012, .04), .01), 'woodn')
    return m, (W, W)
def mirror():
    m = Model(); W, D = .6, .25
    m.add(rbox((W / 2, .08, .9), (W / 2 - .02, .03, .82), .03), 'woodnd')
    m.add(rbox((W / 2, .115, .92), (W / 2 - .07, .006, .74), .02), 'mirror')
    for x in (.08, W - .08): m.add(rbox((x, D / 2, .03), (.03, D / 2, .03), .01), 'woodnd')
    return m, (W, D)
def laundry():
    m = Model(); W, D = .45, .4
    m.add(cut(rbox((W / 2, D / 2, .28), (W / 2 - .02, D / 2 - .02, .28), .05), rbox((W / 2, D / 2, .5), (W / 2 - .05, D / 2 - .05, .2), .03)), 'wicker')
    m.add(rbox((W / 2 - .04, D / 2, .5), (.12, .1, .06), .05), 'cloth_b'); m.add(rbox((W / 2 + .07, D / 2 + .03, .53), (.08, .07, .05), .04), 'cloth_r')
    return m, (W, D)
def washer():
    m = Model(); W = .6
    m.add(rbox((W / 2, W / 2, .43), (W / 2, W / 2 - .01, .42), .03), 'paint_w')
    m.add(rbox((W / 2, W - .015, .8), (W / 2 - .02, .012, .045), .006), 'paint_w2')                          # панель
    for x in (.12, .2): knob(m, x, W - .01, .8, .02, 'chrome')
    m.add(rbox((.42, W - .005, .8), (.08, .006, .025), .004), 'glass_d')
    door = cyl_y(W / 2, W, .42, .17, .02); m.add(door, 'chrome')
    m.add(cyl_y(W / 2, W + .015, .42, .13, .012), 'glass_d')
    return m, (W, W)
def kbin():
    m = Model(); c = .17
    m.add(cylz(c, c, .14, 0, .5, .02), 'steel2'); m.add(cylz(c, c, .145, .48, .53, .02), 'steel2')
    m.add(rbox((c, c + .15, .03), (.06, .04, .012), .006), 'blk')
    return m, (.34, .34)
def pantry():
    m = Model(); W, D, Hh = .6, .58, 2.0
    m.add(rbox((W / 2, D / 2, Hh / 2 + .04), (W / 2 - .01, D / 2 - .01, Hh / 2 - .04), .012), 'woodnd')
    m.add(rbox((W / 2, D / 2 - .02, .04), (W / 2 - .02, D / 2 - .03, .04), .005), 'gap')
    gapband(m, .02, W - .02, .1, Hh - .02, D - .01)
    front(m, .02, W - .02, 1.12, Hh - .03, D - .01, 'woodnv'); front(m, .02, W - .02, .1, 1.08, D - .01, 'woodnv')
    for z in (1.2, .98): hbar(m, W / 2 - .07, W / 2 + .07, D + .01, z, .012, 'brass')
    return m, (W, D)
def bsink():
    m = Model(); W, D = .55, .45; cx = W / 2
    m.add(rbox((cx, .14, .4), (.09, .07, .38), .05), 'enamel')                                              # ножка
    bowl = rbox((cx, .22, .8), (W / 2 - .01, .2, .07), .06)
    m.add(cut(bowl, rbox((cx, .24, .86), (W / 2 - .07, .14, .06), .05)), 'enamel')
    m.add(cylz(cx, .06, .018, .86, .98, .006), 'chrome'); m.add(capsule((cx, .06, .97), (cx, .16, .95), .012), 'chrome')
    for x in (cx - .1, cx + .1): m.add(sphere((x, .06, .88), .02), 'chrome')
    return m, (W, D)
def towels():
    m = Model(); W, D = .5, .15
    for x in (.04, W - .04): m.add(cylz(x, .07, .012, .3, 1.2, .006), 'chrome')
    for z in (.45, .7, .95, 1.15): m.add(capsule((.04, .07, z), (W - .04, .07, z), .01), 'chrome')
    m.add(rbox((W / 2, .08, .88), (W / 2 - .07, .03, .2), .02), 'cloth_b'); m.add(rbox((W / 2, .08, .55), (W / 2 - .1, .03, .1), .02), 'cloth_w')
    return m, (W, D)
def shoerack():
    m = Model(); W, D = .8, .32
    for z in (.04, .22, .4): m.add(rbox((W / 2, D / 2, z), (W / 2 - .01, D / 2 - .01, .014), .006), 'woodn')
    for x in (.02, W - .02): m.add(rbox((x, D / 2, .21), (.015, D / 2 - .01, .21), .005), 'woodnd')
    r = np.random.default_rng(9)
    for z in (.054, .234):
        for k in range(3):
            x = .14 + k * .25; c = 'shoe' if r.random() < .6 else 'shoe2'
            for dx in (-.045, .045): m.add(rbox((x + dx, D / 2 + .01, z + .04), (.035, .11, .035), .03), c)
    return m, (W, D)
def boxes():
    m = Model()
    m.add(rbox((.3, .3, .2), (.26, .24, .2), .015), 'cardboard'); m.add(rbox((.26, .28, .54), (.2, .18, .14), .012), 'cardboard2')
    m.add(rbox((.3, .3, .4), (.26, .005, .02), .002), 'sheet_w'); m.add(rbox((.36, .32, .69), (.12, .1, .01), .004), 'cardboard')
    return m, (.6, .6)
def radiator():
    m = Model(); W, D = .8, .15
    for k in range(10):
        x = .06 + k * (W - .12) / 9; m.add(rbox((x, D / 2, .38), (.028, .05, .26), .02), 'ironrad')
    m.add(capsule((.04, D / 2, .15), (W - .04, D / 2, .15), .02), 'ironrad'); m.add(capsule((.04, D / 2, .6), (W - .04, D / 2, .6), .02), 'ironrad')
    m.add(cylz(W - .03, D / 2, .015, .55, .7, .005), 'chrome')
    return m, (W, D)
def cyl_y(x, y, z, r, h):
    """короткий цилиндр осью вдоль y (дверца стиральной машины)"""
    def f(p):
        d = np.stack([np.hypot(p[..., 0] - x, p[..., 2] - z) - r, np.abs(p[..., 1] - y) - h], -1)
        return np.linalg.norm(np.maximum(d, 0), axis=-1) + np.minimum(d.max(-1), 0)
    return f, (np.array([x - r, y - h, z - r]), np.array([x + r, y + h, z + r]))
EXTRA_MODELS = {'armchair': armchair, 'coffeetab': coffeetab, 'floorlamp': floorlamp, 'plant': plant, 'endtable': endtable,
                'wdesk': wdesk, 'chair': chair, 'mirror': mirror, 'laundry': laundry, 'washer': washer, 'kbin': kbin,
                'pantry': pantry, 'bsink': bsink, 'towels': towels, 'shoerack': shoerack, 'boxes': boxes, 'radiator': radiator}

# ---------- варианты декора и центр комнаты: сундук, стулья к столу, растения, торшеры, коробки; мелочи на полу ----------
mat('palm', '#5c8a3a', .04, .7); mat('snake', '#4e7a3e', .05, .6, lambda p: 1 + .18 * (np.sin(p[..., 2] * 90) > .5))
mat('cactus', '#5a8a52', .05, .6); mat('pot2', '#d8d2c4', .2, .4); mat('pot3', '#3c4a5a', .2, .4)
mat('shade2', '#c8a070', 0, .9, lambda p: 1 + .03 * np.sin(p[..., 2] * 300)); mat('lacq', '#2e2a28', .4, .25)
mat('woodp', '#b88a5a', .05, .6, wood_pat(0)); mat('woodpv', '#a87e52', .05, .6, wood_pat(2)); mat('iron', '#3a3c40', .35, .35)
mat('fabric_g', '#6a7a5a', 0, .9); mat('fabric_r', '#8a3a36', 0, .9)
_plant0 = plant
def plant(v=0):
    if v == 0: return _plant0()
    m = Model(); c = .25
    pot = 'pot2' if v == 1 else 'pot3'
    m.add(cut(cylz(c, c, .15, 0, .34, .03), cylz(c, c, .12, .3, .4)), pot); m.add(cylz(c, c, .125, .26, .3), 'soil')
    r = np.random.default_rng(40 + v)
    if v == 1:                                                                                      # сансевиерия: мечи листьев
        for i in range(9):
            a = r.uniform(0, 2 * np.pi); d = r.uniform(0, .07); h = r.uniform(.6, .95); tilt = r.uniform(.03, .1)
            m.add(capsule((c + np.cos(a) * d, c + np.sin(a) * d, .3), (c + np.cos(a) * (d + tilt), c + np.sin(a) * (d + tilt), h), .028), 'snake')
    else:                                                                                           # пальма: стебли и веера
        for i in range(7):
            a = i / 7 * 2 * np.pi + r.uniform(-.2, .2); h = r.uniform(.75, 1.05); L = r.uniform(.25, .35)
            tip = (c + np.cos(a) * L, c + np.sin(a) * L, h - .12)
            m.add(capsule((c, c, .32), (c + np.cos(a) * L * .4, c + np.sin(a) * L * .4, h), .012), 'palm')
            for k in range(4):
                b = a + (k - 1.5) * .25
                m.add(capsule((c + np.cos(a) * L * .4, c + np.sin(a) * L * .4, h), (c + np.cos(b) * L * 1.15, c + np.sin(b) * L * 1.15, h - .18), .022), 'palm')
    return m, (.5, .5)
_floorlamp0 = floorlamp
def floorlamp(v=0):
    if v == 0: return _floorlamp0()
    m = Model(); c = .2                                                                             # дуговой: ткань тёплого цвета, лакированная стойка
    m.add(cylz(c, c, .13, 0, .04, .015), 'lacq'); m.add(cylz(c, c, .016, .03, 1.3, .006), 'lacq')
    m.add(cut(cylz(c, c, .17, 1.2, 1.5, .02), cylz(c, c, .15, 1.18, 1.52)), 'shade2'); m.add(sphere((c, c, 1.3), .04), 'bulb')
    for z in (.5, .9): m.add(cylz(c, c, .025, z, z + .02, .005), 'brass')
    return m, (.4, .4)
_boxes0 = boxes
def boxes(v=0):
    if v == 0: return _boxes0()
    m = Model()
    if v == 1:                                                                                      # одна большая, открытая, с тряпками
        m.add(cut(rbox((.3, .3, .24), (.27, .25, .24), .015), rbox((.3, .3, .5), (.25, .23, .1), .01)), 'cardboard')
        m.add(rbox((.3, .3, .44), (.2, .18, .06), .05), 'cloth_r'); m.add(rbox((.47, .3, .5), (.02, .2, .1), .005), 'cardboard2')
    else:                                                                                           # три небольшие рядом
        m.add(rbox((.18, .2, .15), (.15, .15, .15), .012), 'cardboard2'); m.add(rbox((.44, .22, .12), (.13, .14, .12), .012), 'cardboard')
        m.add(rbox((.3, .45, .1), (.16, .12, .1), .01), 'cardboard'); m.add(rbox((.18, .2, .31), (.11, .11, .01), .004), 'sheet_w')
    return m, (.6, .6)
_chair0 = chair
def chair(v=0):
    if v == 0: return _chair0()
    m = Model(); W = .45                                                                             # кухонный: металл и сиденье из кожзама
    m.add(rbox((W / 2, W / 2 + .02, .46), (W / 2 - .03, W / 2 - .05, .035), .03), 'fabric_r')
    for x in (.05, W - .05):
        for y in (.07, W - .04): m.add(cylz(x, y, .014, 0, .44, .005), 'iron')
        m.add(cylz(x, .05, .014, .44, .9, .005), 'iron')
    m.add(rbox((W / 2, .05, .8), (W / 2 - .04, .02, .1), .03), 'fabric_r')
    return m, (W, W)
def chest(v=0):
    """сундук в ногах кровати: доски, кованые уголки, ручки"""
    m = Model(); W, D, Hh = .9, .45, .48; w = 'woodn' if v == 0 else 'woodp'; wd_ = 'woodnd' if v == 0 else 'woodpv'
    m.add(rbox((W / 2, D / 2, Hh / 2 - .02), (W / 2 - .01, D / 2 - .01, Hh / 2 - .03), .015), wd_)
    m.add(rbox((W / 2, D / 2, Hh - .03), (W / 2, D / 2, .04), .03), w)                                # крышка
    for x in (.03, W - .03):
        for y in (.03, D - .03): m.add(rbox((x, y, Hh / 2), (.025, .025, Hh / 2), .006), 'iron')
    for z in (.12, .3): m.add(rbox((W / 2, D - .005, z), (W / 2 - .03, .006, .012), .004), 'iron')
    for x in (.03, W - .03): m.add(capsule((x, D / 2 - .08, .32), (x, D / 2 + .08, .32), .012), 'iron')
    m.add(rbox((W / 2, D + .004, Hh - .1), (.035, .01, .04), .006), 'brass')
    return m, (W, D)
# мелочи на полу — плоские, сквозь них ходят; рисуются в слое пола
def dec_clothes(v):
    m = Model(); cs = [('cloth_b', 'cloth_w'), ('cloth_r', 'fabric_g'), ('fabric_g', 'cloth_b')][v]
    m.add(rbox((0, 0, .03), (.22, .15, .03), .05), cs[0]); m.add(rbox((.08, .06, .07), (.13, .1, .03), .04), cs[1])
    m.add(capsule((-.15, .1, .03), (-.3, .2, .02), .035), cs[0])
    return m
def dec_books(v):
    m = Model(); r = np.random.default_rng(70 + v); z = 0
    for k in range(4 + v):
        h = r.uniform(.025, .045); m.add(rbox((r.uniform(-.02, .02), r.uniform(-.02, .02), z + h / 2), (.1, .07, h / 2), .006), 'bk%d' % r.integers(0, 8)); z += h
    if v: m.add(rbox((.2, .05, .02), (.07, .1, .015), .004), 'bk3')
    return m
def dec_bottles(v):
    m = Model(); r = np.random.default_rng(80 + v)
    for k in range(3 + v):
        a = r.uniform(0, 2 * np.pi); d = r.uniform(0, .15); x, y = np.cos(a) * d, np.sin(a) * d
        if r.random() < .5: m.add(capsule((x, y, .035), (x + .2, y + .05, .035), .035), 'glass_d')              # лежит
        else: m.add(cylz(x, y, .035, 0, .22, .02), 'glass_d'); m.add(cylz(x, y, .014, .22, .29, .005), 'glass_d')
    return m
def dec_newspaper(v):
    m = Model(); m.add(rbox((0, 0, .006), (.2, .14, .006), .003), 'sheet_w'); m.add(rbox((.06, .05, .014), (.18, .13, .005), .003), 'sheet_w')
    m.add(rbox((.02, -.02, .021), (.08, .02, .002), .001), 'blk')
    return m
def dec_shoes(v):
    m = Model(); c = 'shoe' if v == 0 else 'shoe2'
    m.add(rbox((0, 0, .04), (.12, .045, .04), .035), c); m.add(rbox((.05, .13, .03), (.045, .12, .03), .03), c)
    return m
def dec_trash(v):
    m = Model()
    m.add(sphere((0, 0, .17), .17), 'blk'); m.add(capsule((0, 0, .3), (0, 0, .38), .03), 'blk')
    if v: m.add(sphere((.2, .1, .1), .1), 'blk'); m.add(rbox((-.18, .12, .02), (.06, .05, .02), .01), 'cardboard')
    return m
DECOR = {'clothes': (dec_clothes, 3), 'books': (dec_books, 2), 'bottles': (dec_bottles, 2), 'newspaper': (dec_newspaper, 1),
         'shoes': (dec_shoes, 2), 'trash': (dec_trash, 2)}
EXTRA_MODELS.update({'chest': chest, 'plant': plant, 'floorlamp': floorlamp, 'boxes': boxes, 'chair': chair})

VARIANTS = {'bed': 3, 'bed1': 3, 'sofa': 3, 'sofa1': 3, 'shelf': 2, 'bookshelf': 2, 'armchair': 3, 'plant': 3, 'floorlamp': 2, 'boxes': 3, 'chair': 2, 'chest': 2}
MODELS = {'tv': tv, 'tv1': tv1, 'toilet': toilet,
          'fridge': fridge, 'stove': stove, 'sink': sink, 'cabinet': cabinet, 'counter2': counter2,
          'dresser': dresser, 'nightstand': nightstand, 'wardrobe': wardrobe, 'medcab': medcab,
          'bed': bed, 'bed1': bed1, 'bath': bath, 'sofa': sofa, 'table': table, 'table1': table1,
          'shelf': shelf, 'bookshelf': bookshelf, 'crate': crate, 'hanger': hanger,
          'bath1': lambda: sitbath(), 'sofa1': lambda v=0: armchair(v)}
MODELS.update(EXTRA_MODELS)
NEW = ['fridge', 'stove', 'sink', 'cabinet', 'counter2', 'dresser', 'nightstand', 'wardrobe', 'medcab']

# ---------- душ: если под ванну нет места ----------
mat('showerglass', '#b9d3dc', .55, .08, lambda p: 1 + .10 * (np.sin((p[..., 0] - p[..., 1]) * 26 + p[..., 2] * 9) > .75))
mat('tray', '#eceae3', .3, .25)
def shower():
    """душевая кабина у стены: поддон, стеклянные стенки в хромированной раме, лейка на стене"""
    m = Model(); W = L = .9; H = 1.86
    m.add(rbox((W / 2, L / 2, .06), (W / 2, L / 2, .06), .025), 'tray')                          # поддон
    m.add(rbox((W / 2, L / 2, .115), (W / 2 - .06, L / 2 - .06, .006), .02), 'enamel2')          # дно поддона
    m.add(cylz(W / 2 + .1, L / 2 + .12, .035, .11, .125, .004), 'chrome')                       # слив
    t = .012
    m.add(rbox((W - .02, L / 2, .13 + H / 2), (t, L / 2 - .02, H / 2), .004), 'showerglass')      # стекло сбоку
    m.add(rbox((W * .3, L - .02, .13 + H / 2), (W * .3 - .02, t, H / 2), .004), 'showerglass')   # неподвижная половина спереди
    m.add(rbox((W * .72, L - .055, .13 + H / 2), (W * .24, t, H / 2 - .01), .004), 'showerglass')  # сдвижная дверь чуть внутри
    for x, y in ((W - .02, L - .02), (W - .02, .02), (.02, L - .02)):                             # стойки рамы
        m.add(rbox((x, y, .13 + H / 2), (.016, .016, H / 2), .006), 'chrome')
    m.add(rbox((W / 2, L - .02, .13 + H), (W / 2, .016, .016), .006), 'chrome')                  # верхняя планка
    m.add(rbox((W - .02, L / 2, .13 + H), (.016, L / 2, .016), .006), 'chrome')
    m.add(cylz(W * .3, .025, .01, .9, 1.75, .004), 'chrome')                                     # штанга на стене
    m.add(cylz(W * .3, .06, .04, 1.72, 1.75, .01), 'chrome')                                     # лейка
    m.add(rbox((W * .3, .03, 1.05), (.06, .015, .035), .01), 'chrome')                           # смеситель
    return m, (W, L)
MODELS['shower'] = shower

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
            M['xf'] = to_model
            MAT[key] = M
        out.parts.append(((lambda f: lambda p: f(to_model(p)))(f), (lo2, hi2), key))
    return out

def frame(name, r, v=0):
    m, size = MODELS[name](v) if name in VARIANTS else MODELS[name]()
    im, (ox, oy) = F.render(rotated(m, size, r), cells=(max(1, int(np.ceil(size[0]))), max(1, int(np.ceil(size[1])))))
    px = F.pixelize(im, 40, outline=True)
    a = np.array(px); a[a[..., 3] < 255] = 0                    # без тени на полу, как у остальной мебели
    px = Image.fromarray(a, 'RGBA'); bb = px.getbbox()
    ax = ox + (size[0] / 2 - size[1] / 2) * F.HX; ay = oy + (size[0] / 2 + size[1] / 2) * F.HY   # якорь — центр следа
    return px.crop(bb), (ax - bb[0], ay - bb[1]), size

def preview(out, names=None):
    names = names or NEW
    at = json.load(open(os.path.join(ROOT, 'assets/atlas.json')))['frames']; sh = Image.open(os.path.join(ROOT, 'assets/sprites/furn2.png'))
    rows = []
    for name in names:
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

def export(names=None):
    """перерисовать кадры моделей и переупаковать весь лист furn2 (заменённые кадры не остаются мусором)"""
    names = names or list(MODELS)
    ap = os.path.join(ROOT, 'assets/atlas.json'); sp = os.path.join(ROOT, 'assets/sprites/furn2.png')
    meta = json.load(open(ap)); sheet = Image.open(sp).convert('RGBA'); fr = meta['frames']
    frames = {}
    for k, (s_, x, y, w, h, ax, ay) in ((k, v) for k, v in fr.items() if v[0] == 'furn2'):
        frames[k] = (sheet.crop((x, y, x + w, y + h)), (ax, ay))
    for n in names:
        if n == 'decor': frames.update(decor_frames(1)); continue
        for r in range(4):
            for v in range(VARIANTS.get(n, 1)):
                im, (ax, ay), _ = frame(n, r, v)
                frames['f_%s_%d_%d' % (n, v, r)] = (im, (int(round(ax)), int(round(ay))))
    W = sheet.width; order = sorted(frames, key=lambda k: (-frames[k][0].height, k))
    x = y = rowh = 0; pos = {}
    for k in order:
        im = frames[k][0]
        if x + im.width > W: x = 0; y += rowh + 1; rowh = 0
        pos[k] = (x, y); x += im.width + 1; rowh = max(rowh, im.height)
    out = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
    for k in order:
        im, (ax, ay) = frames[k]; px, py = pos[k]; out.paste(im, (px, py))
        fr[k] = ['furn2', px, py, im.width, im.height, ax, ay]
    out.save(sp, optimize=True); json.dump(meta, open(ap, 'w'), separators=(',', ':'))
    print('кадров на листе', len(frames), 'лист', out.size, 'было', sheet.size)


# ---------- детальные кадры (×K) для стиля «как в Project Zomboid»: без палитры, мягкие края, текстуры ткани ----------
HD_K = 3
def _plaid(scale=9):
    def f(p):
        u, v = p[..., 0] * scale, p[..., 1] * scale
        s = (np.sin(u * np.pi * 2) > .45).astype(float) + (np.sin(v * np.pi * 2) > .45)
        return 1 - .13 * s + .05 * (np.sin(u * np.pi * 8) > .9)
    return f
def _weave(p):
    a = p[..., 0] + p[..., 2] * .7; b = p[..., 1] - p[..., 2] * .7
    return 1 + .035 * np.sin(a * 420) * np.sin(b * 420) + .03 * np.sin((a + b) * 37)
def hd_setup():
    F.HX, F.HY, F.ZP = 32 * HD_K, 16 * HD_K, 31 * HD_K
    F.SS = 2; F.FLOOR_SHADOW = False
    for k in range(3):
        MAT['blanket%d' % k]['pat'] = _plaid(); MAT['sofa%d' % k]['pat'] = _weave; MAT['sofa%dd' % k]['pat'] = _weave
    for nm in ('linen', 'linen2', 'pillow', 'coat_r', 'coat_b'): MAT[nm]['pat'] = _weave
def soft_outline(im, k=HD_K):
    """тонкий мягкий тёмный контур — как кромка у спрайтов PZ, держит форму на любом зуме"""
    from PIL import ImageFilter
    a = im.getchannel('A'); grow = a.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(.6))
    edge = Image.new('RGBA', im.size, (22, 18, 16, 0)); edge.putalpha(grow.point(lambda v: int(v * .75)))
    edge.alpha_composite(im); return edge
def frame_hd(args):
    name, r, v = args
    comp = name.startswith('c:'); n = name[2:] if comp else name; src = COMPACT if comp else MODELS
    m, size = src[n](v) if n in VARIANTS else src[n]()
    im, (ox, oy) = F.render(rotated(m, size, r), cells=(max(1, int(np.ceil(size[0]))), max(1, int(np.ceil(size[1])))))
    im = soft_outline(im); bb = im.getbbox()
    ax = ox + (size[0] / 2 - size[1] / 2) * F.HX; ay = oy + (size[0] / 2 + size[1] / 2) * F.HY
    return ('hd_old_f_%s_%d_%d' if comp else 'hd_f_%s_%d_%d') % (n, v, r), im.crop(bb), (int(round(ax - bb[0])), int(round(ay - bb[1])))
def export_hd(names=None, procs=2):
    """все модели ×HD_K в отдельный лист furn3 (кадры hd_f_…, восьмое поле — масштаб)"""
    import multiprocessing as mp
    names = names or list(MODELS); hd_setup()
    want_decor = 'decor' in names; names = [n for n in names if n != 'decor']
    jobs = [(n, r, v) for n in names for v in range(VARIANTS.get(n[2:] if n.startswith('c:') else n, 1)) for r in range(4)]
    ap = os.path.join(ROOT, 'assets/atlas.json'); sp = os.path.join(ROOT, 'assets/sprites/furn3.png')
    meta = json.load(open(ap)); fr = meta['frames']
    frames = {}
    if os.path.exists(sp):                                          # уже готовые кадры других моделей сохраняем
        old = Image.open(sp).convert('RGBA')
        for k, f in fr.items():
            if f[0] == 'furn3': frames[k] = (old.crop((f[1], f[2], f[1] + f[3], f[2] + f[4])), (f[5], f[6]))
    with mp.get_context('fork').Pool(procs) as pool:
        for i, (k, im, a) in enumerate(pool.imap_unordered(frame_hd, jobs)):
            frames[k] = (im, a); print('\r%d/%d %s' % (i + 1, len(jobs), k), end='', flush=True)
    print()
    if want_decor:
        for k, v in decor_frames(HD_K).items(): frames['hd_' + k] = v
    W = 4096; order = sorted(frames, key=lambda k: (-frames[k][0].height, k))
    x = y = rowh = 0; pos = {}
    for k in order:
        im = frames[k][0]
        if x + im.width > W: x = 0; y += rowh + 2; rowh = 0
        pos[k] = (x, y); x += im.width + 2; rowh = max(rowh, im.height)
    out = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
    for k in order:
        im, (ax, ay) = frames[k]; px, py = pos[k]; out.paste(im, (px, py))
        fr[k] = ['furn3', px, py, im.width, im.height, ax, ay, HD_K]
    out.save(sp, optimize=True); json.dump(meta, open(ap, 'w'), separators=(',', ':'))
    sh = os.path.join(ROOT, 'assets/sheets.json'); so = json.load(open(sh))
    if 'furn3' not in so['order']: so['order'].insert(so['order'].index('furn2') + 1, 'furn3'); json.dump(so, open(sh, 'w'))
    print('детальных кадров', len(frames), 'лист', out.size, '≈ %.0f МБ в памяти' % (out.width * out.height * 4 / 1e6))

def decor_frames(K=1):
    """кадры dec_<вид>_<вариант>: K=1 — пиксельные (лист furn2), K=3 — детальные"""
    out = {}
    for kind, (fn, n) in DECOR.items():
        for v in range(n):
            if K > 1: F.HX, F.HY, F.ZP = 32 * K, 16 * K, 31 * K; F.SS = 2
            F.FLOOR_SHADOW = True
            im, (ox, oy) = F.render(fn(v), cells=(0, 0))
            px = soft_outline(im, K) if K > 1 else F.pixelize(im, 40, outline=True)
            bb = px.getbbox(); out['dec_%s_%d' % (kind, v)] = (px.crop(bb), (int(round(ox - bb[0])), int(round(oy - bb[1]))))
    return out

if __name__ == '__main__':
    if sys.argv[1] == 'preview': preview(sys.argv[2], sys.argv[3:] or None)
    elif sys.argv[1] == 'hd': export_hd(sys.argv[2:] or None)
    else: export(sys.argv[2:] or None)
