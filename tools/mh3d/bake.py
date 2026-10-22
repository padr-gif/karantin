#!/usr/bin/env python3
"""Запекает персонажей в листы спрайтов игры: все анимации × 8 направлений для pm, pf (игрок) и zm, zf, zh (зомби).
Пишет assets/sprites/pchar_*.png, zchar_*.png и обновляет assets/atlas.json (frames, wpn).
   python3 tools/mh3d/bake.py            # всё (несколько минут)
   python3 tools/mh3d/bake.py pm zm      # только выбранные
"""
import sys, os, json, math, time
from multiprocessing import Pool
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import render as R, anims as A, looks as LK

KINDS = {'pm': (LK.PM, A.PLAYER, ['pchar_m', 'pchar_mx']), 'pf': (LK.PF, A.PLAYER, ['pchar_f', 'pchar_fx']),
         'zm': (LK.ZM, A.ZOMBIE, ['zchar_m']), 'zf': (LK.ZF, A.ZOMBIE, ['zchar_f']), 'zh': (LK.ZH, A.ZOMBIE, ['zchar_h'])}
EXTRA = {'pickup', 'eat', 'drink'}                      # во второй лист игрока, как раньше
PAD, SHEET_W = 1, 2048
K = 1                                                    # пикселей кадра на игровой пиксель: 1 — как мир, чёткий пиксель-арт
KK = {'pm': 2, 'pf': 2, 'zm': 2, 'zf': 2, 'zh': 2}     # персонажи вдвое детальнее мира (детальный режим рисует их сглаженными)

def job(args):
    kind, an, d, i = args
    look, table, _ = KINDS[kind]; n, fn, mode = table[an]
    fr = R.frame(look, d * math.pi / 4, A.pose_from(fn(A.frame_t(i, n, mode), look.get('fem', False))), K=KK.get(kind, K))
    im = R.keyed(fr, outline=.85); bb = im.getbbox()
    im = im.crop(bb); ax, ay = fr['anchor'][0] - bb[0], fr['anchor'][1] - bb[1]
    return '%s_%s_%d_%d' % (kind, an, d, i), np.array(im), ax, ay, fr['wpn'] if kind[0] == 'p' else None

def pack(items, SHEET_W=SHEET_W):
    """полки: кадры по высоте, слева направо"""
    items = sorted(items, key=lambda it: -it[1].shape[0])
    x = y = rowh = 0; pos = {}
    for name, a, *_ in items:
        h, w = a.shape[:2]
        if x + w + PAD > SHEET_W: x = 0; y += rowh + PAD; rowh = 0
        pos[name] = (x, y); x += w + PAD; rowh = max(rowh, h)
    H = y + rowh
    sheet = np.zeros((H, SHEET_W, 4), np.uint8)
    for name, a, *_ in items:
        px, py = pos[name]; sheet[py:py + a.shape[0], px:px + a.shape[1]] = a
    return sheet, pos

if __name__ == '__main__':
    kinds = sys.argv[1:] or list(KINDS)
    atlas = json.load(open(os.path.join(ROOT, 'assets/atlas.json')))
    t0 = time.time()
    for kind in kinds:
        look, table, sheets = KINDS[kind]
        jobs = [(kind, an, d, i) for an, (n, _, _) in table.items() for d in range(8) for i in range(n)]
        with Pool(os.cpu_count()) as pool: res = pool.map(job, jobs, chunksize=4)
        for k in [k for k in atlas['frames'] if k.startswith(kind + '_')]: del atlas['frames'][k]
        for k in [k for k in atlas.get('wpn', {}) if k.startswith(kind + '_')]: del atlas['wpn'][k]
        groups = {s: [] for s in sheets}
        for r in res:
            an = r[0].split('_')[1]
            groups[sheets[1] if len(sheets) > 1 and an in EXTRA else sheets[0]].append(r)
        for sname, items in groups.items():
            sheet, pos = pack(items, 4096 if KK.get(kind, K) > 1 else SHEET_W)
            Image.fromarray(sheet, 'RGBA').save(os.path.join(ROOT, 'assets/sprites', sname + '.png'), optimize=True)
            for name, a, ax, ay, wpn in items:
                x, y = pos[name]; atlas['frames'][name] = [sname, x, y, a.shape[1], a.shape[0], int(ax), int(ay)] + ([KK[kind]] if KK.get(kind, K) > 1 else [])
                if wpn is not None: atlas['wpn'][name] = wpn
            print(kind, sname, sheet.shape[1], 'x', sheet.shape[0], len(items), 'кадров', round(time.time() - t0), 'с', flush=True)
    atlas['charScale'] = K
    json.dump(atlas, open(os.path.join(ROOT, 'assets/atlas.json'), 'w'), separators=(',', ':'))
    print('готово', round(time.time() - t0), 'с')
