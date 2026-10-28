#!/usr/bin/env python3
"""Анимации персонажей «Нулевого дня»: позы как функции времени поверх скелета MakeHuman.
Поза задаётся суставными параметрами (наклон корпуса, руки, локти, бёдра, колени, стопы, голова),
pose_from() переводит их в повороты костей. Ноги render.scene() сам ставит на пол.
"""
import math
import numpy as np
from render import aim, rot, nrm, hand_rig, BI

def ease(t): return .5 - .5 * math.cos(math.pi * max(0.0, min(1.0, t)))
def kf(t, keys):
    """ключевые кадры [(t, значение), ...] с плавным переходом"""
    if t <= keys[0][0]: return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t <= t1:
            k = ease((t - t0) / max(t1 - t0, 1e-9))
            return v0 + (v1 - v0) * k
    return keys[-1][1]

# суставные параметры по умолчанию (стойка)
def stand(fem=False):
    c = dict(lean=.03, twist=0.0, roll=0.0, hpitch=-.14, hyaw=0.0, hroll=0.0, fall=0.0)
    for sd in 'LR':
        c['ap' + sd] = .02; c['aa' + sd] = .08 if not fem else .06; c['el' + sd] = .2; c['wr' + sd] = 0.0
        c['th' + sd] = .03; c['ta' + sd] = .02; c['kn' + sd] = .06; c['ft' + sd] = .46
    return c

def bend(d, ang, hint):
    """повернуть направление d на угол ang в сторону hint (сгиб локтя/колена)"""
    h = np.array(hint, float); h = h - (h @ d) * d
    if np.linalg.norm(h) < 1e-6: h = np.array([0, 0, 1.0]) - d[2] * d
    ax = nrm(np.cross(d, h)); return rot(ax, ang) @ d

def pose_from(c):
    """суставные параметры -> поза для render.scene (функция от внешности и тела)"""
    def build(o, B):
        p = {}
        n_sp = ['spine04', 'spine03', 'spine02', 'spine01']
        for b in n_sp:
            p[b] = [((0, 1, 0), c['lean'] / 4), ((0, 0, 1), c['twist'] / 4), ((1, 0, 0), c['roll'] / 4)]
        p['neck01'] = [((0, 1, 0), -c['lean'] * .35)]
        p['head'] = [((0, 1, 0), c['hpitch']), ((0, 0, 1), c['hyaw']), ((1, 0, 0), c['hroll'])]
        for sd, s in (('L', 1), ('R', -1)):
            ph, ab = c['ap' + sd], c['aa' + sd]
            du = nrm((math.sin(ph) * math.cos(ab), s * math.sin(ab), -math.cos(ph) * math.cos(ab)))
            p['upperarm02.' + sd] = aim(du)
            df = bend(du, c['el' + sd], c.get('eh' + sd, (1, 0, .3)))
            p['lowerarm01.' + sd] = aim(df); p['lowerarm02.' + sd] = aim(df)
            dw = bend(df, c['wr' + sd], (1, 0, 0)) if c['wr' + sd] else df
            p['wrist.' + sd] = aim(dw)
            # кулак
            d, a, nn = hand_rig(B, sd)
            mid = nrm(B['tails'][BI['finger3-1.' + sd]] - B['heads'][BI['finger3-1.' + sd]])
            for f in range(2, 6):
                fd = nrm(B['tails'][BI['finger%d-1.%s' % (f, sd)]] - B['heads'][BI['finger%d-1.%s' % (f, sd)]])
                spread = math.atan2(np.cross(fd, mid) @ nn, fd @ mid)
                curl = (.95, 1.15, .8) if f != 2 else (.8, 1.0, .7)
                sgn = 1 if (rot(a, .3) @ fd) @ nn > fd @ nn else -1
                for k in (1, 2, 3):
                    lst = [(a, sgn * curl[k - 1])]
                    if k == 1: lst.insert(0, (nn, spread))
                    p['finger%d-%d.%s' % (f, k, sd)] = lst
            td = nrm(B['tails'][BI['finger1-1.' + sd]] - B['heads'][BI['finger1-1.' + sd]])
            ax = nrm(np.cross(td, mid)); p['finger1-1.' + sd] = [(ax, .5)]
            p['finger1-2.' + sd] = [(ax, .25)]; p['finger1-3.' + sd] = [(ax, .2)]
            th, ta = c['th' + sd], c['ta' + sd]
            dt = nrm((math.sin(th), s * math.sin(ta), -math.cos(th)))
            p['upperleg02.' + sd] = aim(dt)
            ds = bend(dt, c['kn' + sd], (-1, 0, 0))
            p['lowerleg01.' + sd] = aim(ds); p['lowerleg02.' + sd] = aim(ds)
            ft = c['ft' + sd]; p['foot.' + sd] = aim((math.cos(ft), 0, -math.sin(ft)))
        if c['fall']: p['_fall'] = c['fall']
        if c.get('lift'): p['_lift'] = c['lift']
        return p
    return build

# ---------------- игрок ----------------
def p_idle(t, fem):
    c = stand(fem); ph = 2 * math.pi * t
    c['lean'] += .012 * math.sin(ph); c['hyaw'] = .05 * math.sin(ph); c['apL'] += .02 * math.sin(ph); c['apR'] -= .02 * math.sin(ph)
    return c
def _gait(c, t, amp, kneeA, kneeS, fwd=0.0, lift=0.0):
    ph = 2 * math.pi * t
    for sd, off in (('L', 0), ('R', math.pi)):
        q = ph + off; sn, cs = math.sin(q), math.cos(q)
        c['th' + sd] = fwd + amp * sn
        c['kn' + sd] = kneeS + kneeA * max(0.0, cs) ** 1.5
        c['ft' + sd] = .46 - lift * max(0.0, cs) + .35 * max(0.0, -sn) * max(0.0, -cs) * 2
    return ph
def p_walk(t, fem):
    c = stand(fem); ph = _gait(c, t, .4, .6, .07, 0, .12)
    for sd, off in (('L', math.pi), ('R', 0)):
        sn = math.sin(ph + off); c['ap' + sd] = -.05 + .33 * sn; c['el' + sd] = .3 + .25 * max(0, sn); c['aa' + sd] = .13
    c['twist'] = .09 * math.sin(ph); c['hyaw'] = -.06 * math.sin(ph); c['lean'] = .06
    return c
def p_run(t, fem):
    """бег: на цикл два шага; у каждой ноги опора 0–.3 (касание, амортизация, толчок), затем полёт и мах.
    Колено маховой ноги высоко, руки согнуты под прямым углом и ходят в противофазе ногам, корпус вперёд."""
    c = stand(fem)
    TH = [(0, .5), (.14, .18), (.3, -.42), (.42, -.3), (.62, .45), (.82, .78), (1, .5)]       # бедро: + вперёд
    KN = [(0, .3), (.14, .7), (.3, .28), (.45, 1.55), (.6, 2.05), (.8, 1.05), (.94, .32), (1, .3)]
    FT = [(0, .4), (.14, .5), (.3, 1.05), (.45, .7), (.7, .4), (1, .4)]                      # стопа: толчок носком
    th = {}
    for sd, off in (('L', 0), ('R', .5)):
        q = (t + off) % 1
        c['th' + sd] = th[sd] = kf(q, TH); c['kn' + sd] = kf(q, KN); c['ft' + sd] = kf(q, FT); c['ta' + sd] = .03
    for sd, o in (('L', 'R'), ('R', 'L')):                                                   # рука — как противоположная нога
        a = th[o]; c['ap' + sd] = .1 + .9 * a; c['el' + sd] = 1.55 + .35 * max(0.0, a) - .15 * max(0.0, -a)
        c['aa' + sd] = .1; c['eh' + sd] = (1, -.35 if sd == 'L' else .35, .2)                # кисть к середине груди
    fl = lambda q: math.sin(math.pi * min(1, max(0, (q - .3) / .2))) if .3 < q < .5 else 0
    c['lift'] = .055 * max(fl(t), fl((t + .5) % 1))                                          # полёт — обе ноги в воздухе
    c['lean'] = .24 + .04 * math.cos(4 * math.pi * t); c['twist'] = .2 * (th['L'] - th['R']) / 1.2
    c['hpitch'] = -.26; c['hyaw'] = -.4 * c['twist']; c['roll'] = .03 * math.sin(2 * math.pi * t)
    return c
def p_sneak(t, fem):
    c = stand(fem); ph = _gait(c, t, .26, .45, .95, .5, .05)
    for sd, s in (('L', 1), ('R', -1)):
        c['ap' + sd] = -.05 + .08 * math.sin(ph + (math.pi if sd == 'L' else 0)); c['el' + sd] = 1.95; c['aa' + sd] = .2; c['eh' + sd] = (.6, -.3 if sd == 'L' else .3, 1)
    c['lean'] = .5; c['hpitch'] = -.42; c['twist'] = .05 * math.sin(ph)
    return c
def _stance(c):
    c['thL'], c['kn' + 'L'] = .22, .25; c['thR'], c['knR'] = -.18, .18; c['taL'], c['taR'] = .06, .06
    return c
def p_attack(t, fem):
    c = _stance(stand(fem))
    c['apR'] = kf(t, [(0, .3), (.35, 2.75), (.62, .55), (1, .35)])
    c['ehR'] = (-1, 0, .3) if t < .47 else (1, 0, .3)          # замах: оружие за головой
    c['aaR'] = kf(t, [(0, .2), (.35, .55), (.62, .15), (1, .2)])
    c['elR'] = kf(t, [(0, .6), (.35, 1.6), (.62, .2), (1, .5)])
    c['wrR'] = kf(t, [(0, 0), (.35, .5), (.62, -.3), (1, 0)])
    c['twist'] = kf(t, [(0, 0), (.35, -.4), (.62, .35), (1, .1)])
    c['lean'] = kf(t, [(0, .1), (.35, -.02), (.62, .28), (1, .12)])
    c['apL'], c['elL'], c['aaL'] = .45, 1.3, .25
    return c
def p_punch(t, fem):
    c = _stance(stand(fem))
    c['apR'] = kf(t, [(0, .6), (.45, 1.5), (1, .6)]); c['elR'] = kf(t, [(0, 1.9), (.45, .12), (1, 1.9)]); c['aaR'] = .12
    c['apL'], c['elL'], c['aaL'] = .75, 2.0, .2
    c['twist'] = kf(t, [(0, -.1), (.45, .32), (1, -.1)]); c['lean'] = .12
    return c
def p_hit(t, fem):
    c = stand(fem); k = math.sin(math.pi * min(1, t * 1.3))
    c['lean'] = .03 - .3 * k; c['hpitch'] = -.14 - .35 * k
    for sd in 'LR': c['aa' + sd] = .2 + .25 * k; c['ap' + sd] = .1 + .35 * k; c['el' + sd] = .3 + .6 * k
    c['knL'] = c['knR'] = .06 + .2 * k
    return c
def p_search(t, fem):
    c = stand(fem); ph = 2 * math.pi * t
    c['lean'] = .7; c['hpitch'] = .05; c['knL'] = c['knR'] = .4; c['thL'] = c['thR'] = .2
    c['apL'] = 1.05 + .25 * math.sin(ph); c['apR'] = 1.05 - .25 * math.sin(ph)
    c['elL'] = .55 + .3 * math.cos(ph); c['elR'] = .55 - .3 * math.cos(ph); c['aaL'] = c['aaR'] = .12
    return c
def p_work(t, fem):
    c = stand(fem)
    c['lean'] = .38; c['hpitch'] = 0.0; c['knL'] = c['knR'] = .3; c['thL'], c['thR'] = .3, .05
    c['apR'] = kf(t, [(0, .7), (.45, 2.0), (.7, .65), (1, .7)]); c['elR'] = kf(t, [(0, .5), (.45, 1.5), (.7, .3), (1, .5)]); c['aaR'] = .25
    c['apL'], c['elL'], c['aaL'] = .95, .6, .05
    return c
def p_death(t, fem):
    c = stand(fem); k = t ** 1.5
    c['fall'] = k
    c['knL'] = c['knR'] = .1 + .7 * math.sin(math.pi * min(1, t * 1.1)) * (1 - .6 * t)
    c['thL'] = c['thR'] = .1 + .3 * math.sin(math.pi * t)
    for sd in 'LR': c['aa' + sd] = .2 + .45 * k; c['ap' + sd] = .15 + .35 * k; c['el' + sd] = .3 + .5 * k
    c['hpitch'] = -.14 - .35 * k; c['lean'] = .03 + .15 * math.sin(math.pi * t)
    return c
def p_pickup(t, fem):
    c = stand(fem); d = math.sin(math.pi * t) ** .8
    c['thL'] = c['thR'] = .03 + 1.25 * d; c['knL'] = c['knR'] = .06 + 2.1 * d; c['thL'] += .25 * d
    c['lean'] = .03 + .6 * d; c['hpitch'] = -.14 + .2 * d
    c['apR'] = -.06 + 1.0 * d; c['elR'] = .28 - .1 * d; c['aaR'] = .15
    c['apL'] = .2 * d; c['elL'] = .5
    return c
def _to_mouth(c, e, hi):
    c['apR'] = -.06 + (.55 + hi) * e; c['aaR'] = .2 - .1 * e; c['elR'] = .28 + 2.2 * e
    c['ehR'] = (.35, .7, 1)                                  # сгиб к лицу (для правой руки внутрь — это +y)
    return c
def p_eat(t, fem):
    c = stand(fem); e = kf(t, [(0, 0), (.3, 1), (.8, 1), (1, .2)])
    _to_mouth(c, e - .08 * e * math.sin(t * 2 * math.pi * 3) ** 2, .2)
    c['hpitch'] = -.14 + .05 * e
    return c
def p_drink(t, fem):
    c = stand(fem); e = kf(t, [(0, 0), (.3, 1), (.85, 1), (1, .2)])
    _to_mouth(c, e, .3); c['hpitch'] = -.14 - .4 * kf(t, [(0, 0), (.35, 0), (.5, 1), (.85, 1), (1, 0)])
    return c

# ---------------- зомби ----------------
# Не «голливудские» руки вперёд, а мёртвое тело: плечи опущены, голова завалена набок, руки висят и болтаются
# от шагов, одна приподнята к цели. Ходьба шаркающая, неровная: левая нога шагает, правая волочится с вывернутой стопой.
def z_base(fem):
    c = stand(fem)
    c['lean'] = .3; c['roll'] = .06; c['hpitch'] = -.02; c['hroll'] = .22; c['hyaw'] = .1
    c['apL'], c['aaL'], c['elL'], c['wrL'] = .34, .16, .75, .6            # левая рука полусогнута, чуть тянется вперёд
    c['apR'], c['aaR'], c['elR'], c['wrR'] = .08, .18, .2, .3             # правая висит плетью
    c['thL'], c['thR'] = .08, .02; c['knL'], c['knR'] = .2, .14; c['taR'] = .07; c['ftR'] = .38
    return c
def z_idle(t, fem):
    c = z_base(fem); ph = 2 * math.pi * t
    c['roll'] = .06 + .06 * math.sin(ph); c['lean'] = .3 + .03 * math.sin(2 * ph)
    c['hroll'] = .22 + .07 * math.sin(ph + .5); c['hyaw'] = .1 + .12 * math.sin(ph * .5)
    c['apR'] = .08 + .1 * math.sin(ph + 1.2); c['apL'] = .34 + .06 * math.sin(ph)
    c['knL'] = .2 + .05 * max(0, math.sin(ph)); c['knR'] = .14 + .05 * max(0, -math.sin(ph))
    return c
def z_walk(t, fem):
    c = z_base(fem); ph = 2 * math.pi * t
    # левая — неровный шаг с подъёмом; правая — короткий мах без подъёма колена, носок волочится
    qL, qR = ph, ph + math.pi
    c['thL'] = .1 + .36 * math.sin(qL); c['knL'] = .2 + .75 * max(0, math.cos(qL)) ** 1.4
    c['ftL'] = .46 - .1 * max(0, math.cos(qL)) + .45 * max(0, -math.sin(qL)) * max(0, -math.cos(qL))
    c['thR'] = .03 + .2 * math.sin(qR); c['knR'] = .14 + .18 * max(0, math.cos(qR)); c['ftR'] = .3 + .12 * max(0, math.sin(qR))
    # тело заваливается на опорную ногу, хромота: просадка на правую
    sup = math.sin(ph)
    c['roll'] = .06 + .14 * sup; c['twist'] = .1 * math.sin(ph); c['lean'] = .3 + .05 * math.cos(2 * ph)
    c['lift'] = -.025 * max(0, -sup)                                        # «проваливается» на волочащейся ноге
    c['hroll'] = .22 + .1 * math.sin(ph + .6); c['hyaw'] = .1 - .08 * math.sin(ph)
    # руки болтаются от толчков корпуса, с запаздыванием
    c['apR'] = .08 + .2 * math.sin(ph - .8); c['aaR'] = .18 + .06 * math.sin(2 * ph); c['elR'] = .2 + .12 * max(0, math.sin(ph - .8))
    c['apL'] = .34 + .14 * math.sin(ph + math.pi - .8); c['elL'] = .75 + .1 * math.sin(ph)
    return c
def z_chase(t, fem):
    """погоня: тяжёлая быстрая трусца, корпус сильно вперёд, обе руки тянутся к жертве (ниже плеч), рывками"""
    c = z_base(fem); ph = _gait(c, t, .5, 1.05, .22, .14, .12)
    c['thR'] *= .8; c['knR'] *= .8                                          # правая всё ещё короче
    c['lean'] = .55 + .05 * math.cos(2 * ph); c['roll'] = .09 * math.sin(ph); c['twist'] = .14 * math.sin(ph)
    c['hpitch'] = -.32; c['hroll'] = .14 + .06 * math.sin(ph)
    for sd, off, base in (('L', math.pi, 1.15), ('R', 0, .95)):
        q = math.sin(ph + off)
        c['ap' + sd] = base + .25 * q; c['aa' + sd] = .12; c['el' + sd] = .35 + .25 * max(0, -q); c['wr' + sd] = .5
        c['eh' + sd] = (1, 0, .4)
    return c
def z_attack(t, fem):
    """бросок: замах обеими руками, рывок корпусом вперёд с выпадом, хват и откат"""
    c = z_base(fem); k = kf(t, [(0, 0), (.3, -.25), (.55, 1), (.8, 1), (1, .3)])
    c['lean'] = .35 + .45 * max(k, 0); c['hpitch'] = -.1 + .3 * max(k, 0); c['hroll'] = .1
    for sd in 'LR':
        c['ap' + sd] = 1.0 + .75 * k; c['el' + sd] = .9 - .55 * max(k, 0); c['aa' + sd] = .22 - .14 * max(k, 0); c['wr' + sd] = .2
        c['eh' + sd] = (1, 0, .4)
    c['thL'] = .1 + .5 * max(k, 0); c['knL'] = .2 + .35 * max(k, 0); c['thR'] = .02 - .3 * max(k, 0); c['knR'] = .14 + .1 * max(k, 0)
    return c
def z_hit(t, fem):
    c = z_base(fem); k = math.sin(math.pi * min(1, t * 1.3))
    c['lean'] = .3 - .5 * k; c['hpitch'] = -.02 - .45 * k; c['hroll'] = .22 - .3 * k
    for sd in 'LR': c['ap' + sd] = .3 - .35 * k; c['aa' + sd] = .15 + .5 * k; c['el' + sd] = .3 + .3 * k
    c['knL'] = .2 + .25 * k; c['thR'] = .02 - .2 * k
    return c
def z_death(t, fem):
    c = p_death(t, fem); c['hroll'] = .22
    return c

PLAYER = {'idle': (6, p_idle, 'loop'), 'walk': (16, p_walk, 'loop'), 'run': (12, p_run, 'loop'), 'sneak': (16, p_sneak, 'loop'),
          'attack': (8, p_attack, 'once'), 'punch': (6, p_punch, 'once'), 'hit': (4, p_hit, 'once'), 'search': (6, p_search, 'loop'),
          'work': (6, p_work, 'loop'), 'death': (8, p_death, 'end'), 'pickup': (6, p_pickup, 'once'), 'eat': (6, p_eat, 'once'), 'drink': (6, p_drink, 'once')}
ZOMBIE = {'idle': (6, z_idle, 'loop'), 'walk': (16, z_walk, 'loop'), 'chase': (16, z_chase, 'loop'), 'attack': (7, z_attack, 'once'),
          'hit': (4, z_hit, 'once'), 'death': (8, z_death, 'end')}
def frame_t(i, n, kind):
    if kind == 'loop': return i / n
    if kind == 'end': return i / (n - 1)
    return (i + .5) / n
