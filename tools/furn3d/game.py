#!/usr/bin/env python3
"""Новая мебель для игры на 3D-основе tools/furn3d/render.py: модели в метрах, 4 поворота как WDI в игре,
чистый пиксель с тёмной кромкой (как у персонажей), без тени на полу. Кадры дописываются в лист furn2 и атлас.
   python3 tools/furn3d/game.py preview out.png [имена]  # превью: старые и новые кадры рядом
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

MODELS = {'tv': tv, 'tv1': tv1, 'toilet': toilet,
          'fridge': fridge, 'stove': stove, 'sink': sink, 'cabinet': cabinet, 'counter2': counter2,
          'dresser': dresser, 'nightstand': nightstand, 'wardrobe': wardrobe, 'medcab': medcab}
NEW = ['fridge', 'stove', 'sink', 'cabinet', 'counter2', 'dresser', 'nightstand', 'wardrobe', 'medcab']

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

def frame(name, r):
    m, size = MODELS[name]()
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
        for r in range(4):
            im, (ax, ay), _ = frame(n, r)
            frames['f_%s_0_%d' % (n, r)] = (im, (int(round(ax)), int(round(ay))))
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

if __name__ == '__main__':
    if sys.argv[1] == 'preview': preview(sys.argv[2], sys.argv[3:] or None)
    else: export(sys.argv[2:] or None)
