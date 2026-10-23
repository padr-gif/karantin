#!/usr/bin/env python3
"""Запекает героя (ubc.Hero: модель Quaternius + анимации UAL) в листы игрока pchar_m / pchar_mx.
Кадры цветные (не палитровые): девятое поле кадра в атласе = 1 — игра не перекрашивает их.
   UBC=… UAL=… python3 tools/glbchar/bake_hero.py
"""
import os, sys, json, math, time
import numpy as np
from PIL import Image, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE)); sys.path.insert(0, HERE)
import ubc, char as C
from render import nrm, VIEW

K = 1
C.SS = 4                                                                   # пиксель-арт: 1 пиксель кадра = 1 пиксель игры
# наша анимация: клип UAL, режим (loop — цикл, once — от начала до конца, end — до последнего кадра включительно),
# кадров, отрезок клипа и «смягчения»: calm — ноги к стойке, arms — руки ближе к телу, blend — подмешать спокойную стойку
SPEC = {
  'idle':   dict(clip='Idle_Loop', mode='loop', n=10, calm=.45, arms=.3),
  'walk':   dict(clip='Walk_Formal_Loop', mode='loop', n=24, arms=.22, swing=.42),
  'run':    dict(clip='Jog_Fwd_Loop', mode='loop', n=16, arms=.18, blend=('Walk_Formal_Loop', .35)),
  'sneak':  dict(clip='Crouch_Fwd_Loop', mode='loop', n=16, arms=.15),
  'attack': dict(clip='Sword_Attack', mode='once', n=10, seg=(.12, .72), blend=('Idle_Loop', .62, 0), arms=.15, calm=.5),
  'punch':  dict(clip='Punch_Cross', mode='once', n=8, arms=.1, blend=('Idle_Loop', .2, 0), calm=.4),
  'hit':    dict(clip='Hit_Chest', mode='once', n=4, calm=.3),
  'search': dict(clip='Interact', mode='loop', n=12, calm=.4, arms=.1),
  'work':   dict(clip='Interact', mode='loop', n=12, calm=.4, arms=.1),
  'death':  dict(clip='Death01', mode='end', n=8),
  'pickup': dict(clip='PickUp_Table', mode='once', n=8, calm=.3),
  'eat':    dict(clip='Interact', mode='once', n=6, calm=.4),
  'drink':  dict(clip='Interact', mode='once', n=6, calm=.4),
  'read':   dict(clip='Idle_Talking_Loop', mode='loop', n=12, calm=.45, arms=.15),
  'jacks':  dict(jacks=True, mode='loop', n=8),
  'searchlow': dict(clip='Interact', mode='loop', n=12, lower=('Crouch_Idle_Loop', 0, .2), arms=.1),
  'shower': dict(shower=True, mode='loop', n=10),
}
COUNTS = {k: v['n'] for k, v in SPEC.items()}
EXTRA = {'pickup', 'eat', 'drink', 'read', 'jacks', 'searchlow', 'shower'}
H = None
def init():
    global H; H = ubc.Hero()
def t_of(i, n, mode):
    return i / n if mode == 'loop' else (i / (n - 1) if mode == 'end' else (i + .5) / n)
SHOWER = None
def shower_pose(t):
    """моет голову: руки на макушке ↔ на затылке, плавно по кругу (позы подобраны ik.py один раз на процесс)"""
    global SHOWER
    import ik
    body = H.parts[0]
    if SHOWER is None:
        def tgt(side, up, fwd, lat):
            return lambda G: G[body.name['Head']][:3, 3] + np.array([lat if side == 'l' else -lat, up, fwd])
        SHOWER = []
        for up, fwd, lat in ((.1, .02, .09), (.05, -.02, .1)):
            ex = {}
            for side in 'lr': ex, _, _ = ik.reach(H, 'Idle_Loop', 0, side, tgt(side, up, fwd, lat), base_extra=ex)
            SHOWER.append(ex)
    s_ = (1 - math.cos(2 * math.pi * t)) / 2; A, B = SHOWER
    ex = {nm: C.slerp(np.asarray(A[nm], float), np.asarray(B[nm], float), s_) for nm in A}
    return H.pose('Idle_Loop', t, calm=.6, extra=ex)
def swing_extra(clip, t, amp, arms):
    """руки в противофазе ногам: левая нога вперёд — правая рука вперёд"""
    body = H.parts[0]; G = H.pose(clip, t)[0]
    zl, zr = G[body.name['foot_l']][2, 3], G[body.name['foot_r']][2, 3]
    s_ = max(-1, min(1, (zl - zr) / .6)); named = H.sample(clip, t); ex = {}
    for side, sg in (('l', -1), ('r', 1)):
        r = np.asarray(named['upperarm_' + side][1], float)
        r = ubc.qmul(r, ubc.qaxis((0, 0, 1), (-arms if side == 'l' else arms)))
        ex['upperarm_' + side] = ubc.qmul(r, ubc.qaxis((1, 0, 0), sg * amp * s_))
    return ex
def jacks_pose(t):
    """прыжки «ноги врозь, руки в стороны»: s=0 — стоит, руки вдоль тела; s=1 — ноги врозь, руки в стороны"""
    s_ = (1 - math.cos(2 * math.pi * t)) / 2
    body = H.parts[0]; idle = H.sample('Idle_Loop', 0); ex = {}
    for nm in ('clavicle_l', 'clavicle_r', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'hand_l', 'hand_r'):
        r0 = np.asarray(idle[nm][1], float)
        if nm.startswith('upperarm'): r0 = ubc.qmul(r0, ubc.qaxis((0, 0, 1), (-.3 if nm.endswith('l') else .3)))
        r1 = body.rest[body.name[nm]][1]
        if nm.startswith('upperarm'): r1 = ubc.qmul(r1, ubc.qaxis((0, 0, 1), (.35 if nm.endswith('l') else -.35)))   # руки чуть выше горизонтали
        ex[nm] = C.slerp(r0, r1, s_)
    hop = abs(math.sin(2 * math.pi * t)) * 4.5                                # подпрыгивает между положениями
    return H.pose('Idle_Loop', 0, calm=1, legs=.3 * s_, extra=ex), hop

def grip(Gs, face, hips):
    ch = H.parts[0]; Gm = Gs[0]; P_ = lambda b: Gm[ch.name[b]][:3, 3] @ C.AX.T
    I, Pk, W, M, ref = P_('index_01_r'), P_('pinky_01_r'), P_('hand_r'), P_('middle_01_r'), P_('spine_02')
    g = (I + Pk) / 2 * .65 + W * .35; d = nrm(nrm(I - Pk) + 1.1 * nrm(M - W))
    pts = np.array([g, g + d, ref]); pts[:, :2] -= hips[:2]
    c, s = math.cos(face), math.sin(face); R = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]]); pts = pts @ R.T
    return pts

def job(a):
    an, d, i = a
    sp = SPEC[an]; n = sp['n']; t = t_of(i, n, sp['mode']); hop = 0
    if 'seg' in sp: t = sp['seg'][0] + (sp['seg'][1] - sp['seg'][0]) * t
    if sp.get('jacks'): Gs, hop = jacks_pose(t)
    elif sp.get('shower'): Gs = shower_pose(t)
    elif sp.get('swing'): Gs = H.pose(sp['clip'], t, calm=sp.get('calm', 0), extra=swing_extra(sp['clip'], t, sp['swing'], sp.get('arms', 0)))
    else: Gs = H.pose(sp['clip'], t, calm=sp.get('calm', 0), arms=sp.get('arms', 0), blend=sp.get('blend'), lower=sp.get('lower'))
    face = d * math.pi / 4
    im, (ax, ay), rm = H.render(Gs, face, K, rmap=True, pixel=True)
    # точка персонажа — под тазом; высота — по самой низкой точке тела (как в render)
    ch = H.parts[0]; geo = ch.skinned(Gs[0]); zmin = min(P[:, 2].min() for P, _ in geo)
    hk = 'pelvis'; hips = Gs[0][ch.name[hk]][:3, 3] @ C.AX.T
    g = grip(Gs, face, hips); g[:, 2] -= zmin
    proj = lambda p: np.array([(p[0] - p[1]) * 32, (p[0] + p[1]) * 16 - p[2] * 31])
    hp = proj(g[0]); dv = (proj(g[1]) - hp) * .08
    front = int(((g[0] - g[2])[:2] @ nrm(VIEW[:2])) > 0)
    # тонкий тёмный контур, как у остальных спрайтов
    a = np.array(im); al = a[..., 3] > 0                                       # жёсткий контур в 1 пиксель, как у остального пиксель-арта
    g = np.zeros_like(al); g[1:] |= al[:-1]; g[:-1] |= al[1:]; g[:, 1:] |= al[:, :-1]; g[:, :-1] |= al[:, 1:]
    a[g & ~al] = (24, 20, 18, 255); im = Image.fromarray(a)
    bb = im.getbbox(); im = im.crop(bb); rm = rm.crop(bb)
    return 'pm_%s_%d_%d' % (an, d, i), np.array(im), np.array(rm), ax - bb[0], ay - bb[1] + hop, [round(float(hp[0]), 2), round(float(hp[1]), 2), round(float(dv[0]), 3), round(float(dv[1]), 3), front]

if __name__ == '__main__':
    import bake as BK                                                        # упаковка листов — как у старого запекания
    from multiprocessing import Pool
    t0 = time.time()
    jobs = [(an, d, i) for an in COUNTS for d in range(8) for i in range(COUNTS[an])]
    with Pool(2, initializer=init) as pool:
        res = []
        for k, r in enumerate(pool.imap_unordered(job, jobs, chunksize=4)):
            res.append(r); print('\r%d/%d' % (k + 1, len(jobs)), end='', flush=True)
    print()
    atlas = json.load(open(os.path.join(ROOT, 'assets/atlas.json')))
    for k in [k for k in atlas['frames'] if k.startswith('pm_')]: del atlas['frames'][k]
    for k in [k for k in atlas.get('wpn', {}) if k.startswith('pm_')]: del atlas['wpn'][k]
    groups = {'pchar_m': [], 'pchar_mx': []}
    for r in res: groups['pchar_mx' if r[0].split('_')[1] in EXTRA else 'pchar_m'].append(r)
    for sname, items in groups.items():
        sheet, pos = BK.pack([(n, a, ax, ay, w) for n, a, r, ax, ay, w in items], 4096)
        Image.fromarray(sheet, 'RGBA').save(os.path.join(ROOT, 'assets/sprites', sname + '.png'), optimize=True)
        rs = np.zeros_like(sheet)                                              # карта областей тела — тот же раскрой, лист <имя>r
        for name, a, r, ax, ay, wpn in items: x, y = pos[name]; rs[y:y + r.shape[0], x:x + r.shape[1]] = r
        Image.fromarray(rs, 'RGBA').save(os.path.join(ROOT, 'assets/sprites', sname + 'r.png'), optimize=True)
        for name, a, r, ax, ay, wpn in items:
            x, y = pos[name]; atlas['frames'][name] = [sname, x, y, a.shape[1], a.shape[0], int(ax), int(ay), K, 1]
            atlas['wpn'][name] = wpn
        print(sname, sheet.shape[1], 'x', sheet.shape[0], len(items), 'кадров', round(time.time() - t0), 'с')
    init(); atlas['anims']['pm'] = COUNTS                                              # у героя свои числа кадров (у героини — старые, 'p')
    atlas['anims']['pmdur'] = {k: round(H.anim_dur(v['clip']) * ((v['seg'][1] - v['seg'][0]) if 'seg' in v else 1), 3) if 'clip' in v else (1.6 if v.get('shower') else 1.0) for k, v in SPEC.items()}
    json.dump(atlas, open(os.path.join(ROOT, 'assets/atlas.json'), 'w'), separators=(',', ':'))
