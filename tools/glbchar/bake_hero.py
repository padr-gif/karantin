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

K = 2
# наша анимация → (клип UAL, режим): loop — цикл, once — от начала до конца, end — до последнего кадра включительно
CLIPS = {'idle': ('Idle_Loop', 'loop'), 'walk': ('Walk_Loop', 'loop'), 'run': ('Jog_Fwd_Loop', 'loop'), 'sneak': ('Crouch_Fwd_Loop', 'loop'),
         'attack': ('Sword_Attack', 'once'), 'punch': ('Punch_Jab', 'once'), 'hit': ('Hit_Chest', 'once'), 'search': ('Fixing_Kneeling', 'loop'),
         'work': ('Fixing_Kneeling', 'loop'), 'death': ('Death01', 'end'), 'pickup': ('PickUp_Table', 'once'), 'eat': ('Interact', 'once'), 'drink': ('Interact', 'once')}
COUNTS = {'idle': 6, 'walk': 16, 'run': 12, 'sneak': 16, 'attack': 8, 'punch': 6, 'hit': 4, 'search': 6, 'work': 6, 'death': 8, 'pickup': 6, 'eat': 6, 'drink': 6}
EXTRA = {'pickup', 'eat', 'drink'}
H = None
def init():
    global H; H = ubc.Hero()
def t_of(i, n, mode):
    return i / n if mode == 'loop' else (i / (n - 1) if mode == 'end' else (i + .5) / n)

def grip(Gs, face, hips):
    ch = H.parts[0]; Gm = Gs[0]; P_ = lambda b: Gm[ch.name[b]][:3, 3] @ C.AX.T
    I, Pk, W, M, ref = P_('index_01_r'), P_('pinky_01_r'), P_('hand_r'), P_('middle_01_r'), P_('spine_02')
    g = (I + Pk) / 2 * .65 + W * .35; d = nrm(nrm(I - Pk) + 1.1 * nrm(M - W))
    pts = np.array([g, g + d, ref]); pts[:, :2] -= hips[:2]
    c, s = math.cos(face), math.sin(face); R = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]]); pts = pts @ R.T
    return pts

def job(a):
    an, d, i = a
    clip, mode = CLIPS[an]; n = COUNTS[an]
    Gs = H.pose(clip, t_of(i, n, mode)); face = d * math.pi / 4
    im, (ax, ay) = H.render(Gs, face, K)
    # точка персонажа — под тазом; высота — по самой низкой точке тела (как в render)
    ch = H.parts[0]; geo = ch.skinned(Gs[0]); zmin = min(P[:, 2].min() for P, _ in geo)
    hk = 'pelvis'; hips = Gs[0][ch.name[hk]][:3, 3] @ C.AX.T
    g = grip(Gs, face, hips); g[:, 2] -= zmin
    proj = lambda p: np.array([(p[0] - p[1]) * 32, (p[0] + p[1]) * 16 - p[2] * 31])
    hp = proj(g[0]); dv = (proj(g[1]) - hp) * .08
    front = int(((g[0] - g[2])[:2] @ nrm(VIEW[:2])) > 0)
    # тонкий тёмный контур, как у остальных спрайтов
    al = im.getchannel('A'); grow = al.filter(ImageFilter.MaxFilter(3))
    edge = Image.new('RGBA', im.size, (20, 16, 14, 0)); edge.putalpha(grow.point(lambda v: int(v * .8)))
    edge.alpha_composite(im); im = edge
    bb = im.getbbox(); im = im.crop(bb)
    return 'pm_%s_%d_%d' % (an, d, i), np.array(im), ax - bb[0], ay - bb[1], [round(float(hp[0]), 2), round(float(hp[1]), 2), round(float(dv[0]), 3), round(float(dv[1]), 3), front]

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
        sheet, pos = BK.pack(items, 4096)
        Image.fromarray(sheet, 'RGBA').save(os.path.join(ROOT, 'assets/sprites', sname + '.png'), optimize=True)
        for name, a, ax, ay, wpn in items:
            x, y = pos[name]; atlas['frames'][name] = [sname, x, y, a.shape[1], a.shape[0], int(ax), int(ay), K, 1]
            atlas['wpn'][name] = wpn
        print(sname, sheet.shape[1], 'x', sheet.shape[0], len(items), 'кадров', round(time.time() - t0), 'с')
    json.dump(atlas, open(os.path.join(ROOT, 'assets/atlas.json'), 'w'), separators=(',', ':'))
