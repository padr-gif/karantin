#!/usr/bin/env python3
"""Упаковывает нужные данные MakeHuman (CC0) в один файл tools/mh3d/mh.npz:
меш тела и вспомогательные оболочки (колготки, юбка, волосы), скелет, веса костей, морф-цели пола/полноты/мышц/роста.
   git clone --depth 1 https://github.com/makehumancommunity/makehuman
   python3 tools/mh3d/build_data.py путь/к/makehuman/makehuman/data
Сам репозиторий MakeHuman в проект не кладётся, нужен только этот скрипт и результат.
"""
import json, sys, os
import numpy as np

D = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mh.npz')

# ---- меш ----
V, F, G = [], [], []
grp = None
for l in open(os.path.join(D, '3dobjs/base.obj')):
    if l.startswith('v '): V.append([float(x) for x in l.split()[1:4]])
    elif l.startswith('g '): grp = l.split()[1]
    elif l.startswith('f '):
        idx = [int(t.split('/')[0]) - 1 for t in l.split()[1:]]
        if len(idx) == 3: idx.append(idx[2])
        F.append(idx); G.append(grp)
V = np.array(V, np.float32); F = np.array(F, np.int32)
KEEP = ['body', 'helper-tights', 'helper-skirt', 'helper-hair', 'helper-l-eye', 'helper-r-eye']
out = {'verts': V}
for g in KEEP:
    out['faces_' + g] = F[[x == g for x in G]]

# ---- морф-цели ----
def target(path):
    ix, d = [], []
    for l in open(os.path.join(D, 'targets', path)):
        if l[0] in '#\n': continue
        p = l.split(); ix.append(int(p[0])); d.append([float(x) for x in p[1:4]])
    return np.array(ix, np.int32), np.array(d, np.float32)
names = []
for g in ('male', 'female'):
    for mu in ('min', 'average', 'max'):
        for w in ('min', 'average', 'max'):
            names.append('macrodetails/universal-%s-young-%smuscle-%sweight.target' % (g, mu, w))
    names.append('macrodetails/caucasian-%s-young.target' % g)
    for h in ('min', 'max'):
        names.append('macrodetails/height/%s-young-averagemuscle-averageweight-%sheight.target' % (g, h))
for n in names:
    k = n.split('/')[-1].replace('.target', '')
    ix, d = target(n); out['t_ix_' + k] = ix; out['t_d_' + k] = d

# ---- скелет и веса ----
sk = json.load(open(os.path.join(D, 'rigs/default.mhskel')))
wt = json.load(open(os.path.join(D, 'rigs/default_weights.mhw')))['weights']
out['skeleton'] = np.frombuffer(json.dumps({'bones': sk['bones'], 'joints': sk['joints'], 'planes': sk['planes']}).encode(), np.uint8)
bones = list(sk['bones'])
wi, wb, ww = [], [], []
for b, lst in wt.items():
    for v, w in lst: wi.append(v); wb.append(bones.index(b)); ww.append(w)
out['w_vert'] = np.array(wi, np.int32); out['w_bone'] = np.array(wb, np.int16); out['w_val'] = np.array(ww, np.float32)
np.savez_compressed(OUT, **out)
print(OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB')
