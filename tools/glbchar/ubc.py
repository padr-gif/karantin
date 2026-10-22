#!/usr/bin/env python3
"""Герой из Quaternius «Universal Base Characters» (CC0) + причёска/борода/брови + анимации «Universal Animation Library» (CC0).
Все файлы на одном скелете (pelvis, spine_01 …): анимация применяется к костям по имени.
   python3 tools/glbchar/ubc.py preview out.png
Пути к распакованным архивам — переменные UBC и UAL (по умолчанию assets-src/…).
"""
import os, sys, math
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE)); sys.path.insert(0, HERE)
import char as C

UBC = os.environ.get('UBC', os.path.join(ROOT, 'assets-src/ubc'))
UAL = os.environ.get('UAL', os.path.join(ROOT, 'assets-src/ual'))
BODY = 'Base Characters/Godot - UE/Superhero_Male_FullBody.gltf'
HAIR = 'Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/'

def hexc(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float) / 255
LOOK = dict(under='#39465c', hair='#8a5a36')
# области тела для одежды (номер = R/16 в карте областей); игра красит их цветом надетых вещей
REGIONS = ['', 'торс', 'плечо (короткий рукав)', 'плечо низ', 'предплечье', 'кисть', 'таз (трусы)', 'бедро верх', 'бедро низ',
           'голень верх', 'голень низ', 'стопа', 'макушка', 'шея']
SEG = {'upperarm_l': 'lowerarm_l', 'upperarm_r': 'lowerarm_r', 'lowerarm_l': 'hand_l', 'lowerarm_r': 'hand_r', 'thigh_l': 'calf_l', 'thigh_r': 'calf_r',
       'calf_l': 'foot_l', 'calf_r': 'foot_r', 'pelvis': 'spine_01', 'spine_01': 'spine_02', 'spine_02': 'spine_03', 'spine_03': 'neck_01',
       'clavicle_l': 'upperarm_l', 'clavicle_r': 'upperarm_r', 'neck_01': 'Head'}
# «сдуваем» супергеройские мышцы: вершина сдвигается к оси своей кости (с весами скиннинга — без швов)
SLIM = {'upperarm_l': .8, 'upperarm_r': .8, 'lowerarm_l': .88, 'lowerarm_r': .88, 'thigh_l': .9, 'thigh_r': .9, 'calf_l': .93, 'calf_r': .93,
        'spine_02': .9, 'spine_03': .88, 'clavicle_l': .85, 'clavicle_r': .85, 'neck_01': .9, 'spine_01': .93, 'pelvis': .95}

def bindpos(p):
    """положение суставов в пространстве меша (из обратных матриц привязки) по имени"""
    return lambda ch: {ch.nodes[jn].get('name'): np.linalg.inv(p['ibm'][k])[:3, 3] for k, jn in enumerate(p['joints'])}

def seg_t(P, a, b):
    ax = b - a; t = ((P - a) @ ax) / (ax @ ax); return t, a + np.clip(t, 0, 1)[:, None] * ax

def slim(ch):
    for p in ch.prims:
        if len(p['P']) < 2000: continue
        bp = bindpos(p)(ch); P = p['P']; out = np.zeros_like(P)
        for k, jn in enumerate(p['joints']):
            nm = ch.nodes[jn].get('name'); w = (p['W'] * (p['J'] == k)).sum(1)
            if not w.any(): continue
            if nm in SLIM and SEG.get(nm) in bp:
                _, c = seg_t(P, bp[nm], bp[SEG[nm]]); Q = c + (P - c) * SLIM[nm]
            else: Q = P
            out += Q * w[:, None]
        p['P'] = out / np.maximum(p['W'].sum(1, keepdims=True), 1e-9)

def dress(ch, look):
    """области тела по костям + база: кожа, трусы, босые ноги"""
    for p in ch.prims:
        if len(p['P']) < 2000: continue
        bp = bindpos(p)(ch); P = p['P']
        jn = [ch.nodes[j].get('name', '') for j in p['joints']]
        dom = np.array([jn[j] for j in p['J'][np.arange(len(P)), p['W'].argmax(1)]])
        rid = np.zeros(len(P), int)
        T = lambda b: seg_t(P, bp[b], bp[SEG[b]])[0]
        rid[np.isin(dom, ['spine_01', 'spine_02', 'spine_03', 'clavicle_l', 'clavicle_r'])] = 1
        for sd in 'lr':
            m = dom == 'upperarm_' + sd; t = T('upperarm_' + sd); rid[m & (t < .45)] = 2; rid[m & (t >= .45)] = 3
            rid[dom == 'lowerarm_' + sd] = 4
            t = T('thigh_' + sd); m = dom == 'thigh_' + sd; rid[m & (t < .2)] = 6; rid[m & (t >= .2) & (t < .55)] = 7; rid[m & (t >= .55)] = 8
            t = T('calf_' + sd); m = dom == 'calf_' + sd; rid[m & (t < .55)] = 9; rid[m & (t >= .55)] = 10
        rid[np.array([d.startswith(('hand_', 'index', 'middle', 'ring', 'pinky', 'thumb')) for d in dom])] = 5
        rid[np.isin(dom, ['pelvis', 'root'])] = 6
        rid[np.isin(dom, ['foot_l', 'foot_r', 'ball_l', 'ball_r'])] = 11
        neck = dom == 'neck_01'; t = T('neck_01'); rid[neck & (t < .35)] = 1; rid[neck & (t >= .35)] = 13
        hd = bp['Head']; head = dom == 'Head'
        rid[head & (P[:, 1] > hd[1] + .115)] = 12                            # макушка (над бровями)
        p['rid'] = rid
        v = np.zeros((len(P), 4)); v[rid == 6, :3] = hexc(look['under']); v[rid == 6, 3] = 1
        p['vcol'] = v; p['_mean'] = .5

class Hero:
    def __init__(s, parts=('Hair_Buzzed', 'Eyebrows_Regular'), look=LOOK):
        s.parts = [C.Char(os.path.join(UBC, BODY))] + [C.Char(os.path.join(UBC, HAIR + p + '.gltf')) for p in parts]
        body = s.parts[0]                                                   # светлая кожа вместо тёмной текстуры по умолчанию
        light = os.path.join(UBC, 'Base Characters/Godot - UE/T_Superhero_Male_Light.png')
        if os.path.exists(light):
            L = np.asarray(Image.open(light).convert('RGBA'), np.float32) / 255
            for p in body.prims:
                if p['img'] is not None and p['img'].shape == L.shape and len(p['P']) > 2000: p['img'] = L
        slim(s.parts[0]); dress(s.parts[0], look)
        for pn, ch in zip(parts, s.parts[1:]):
            for p in ch.prims:
                p['alpha'] = True; p['rid'] = np.full(len(p['P']), 12 if pn.startswith('Hair') and 'Beard' not in pn else 0)
                if p['img'] is not None:
                    a = p['img'][..., 3:4]; m = float((p['img'][..., :3] * a).sum() / max(a.sum() * 3, 1))   # средняя яркость там, где есть волосы
                    p['tint'] = hexc(look['hair']) / max(m, .1)
        for p in body.prims:                                                 # глаза сверху читаются как «очки» — приглушаем белки
            if p['name'] == 'Face': p['I'] = p['I'][:0]                       # белые «очки» при виде сверху — убираем
        for p in body.prims:                                                 # встроенные ресницы/брови тела — тоже с альфой
            if len(p['P']) < 2000: p['alpha'] = True
        s.anim = C.Char(os.path.join(UAL, 'UAL1_Standard.glb'))
    def pose(s, clip=None, t01=0.0, extra=None, calm=0.0):
        """глобальные матрицы для каждой части: анимация по именам костей (+ ручные правки extra: {кость: кватернион})"""
        named = {}
        if clip:
            for node, (t, r, sc) in s.anim.sample(clip, t01).items():
                nm = s.anim.nodes[node].get('name'); named[nm] = (t if nm in ('pelvis', 'root') else None, r, None)
        if calm:                                                             # ноги ближе к стойке покоя: стойка уже, без «супергеройской» раскоряки
            body = s.parts[0]
            for nm, (t, r, sc) in list(named.items()):
                if r is not None and nm in body.name and any(k in nm for k in ('thigh', 'calf', 'foot', 'ball')):
                    named[nm] = (t, C.slerp(np.asarray(r, float), body.rest[body.name[nm]][1], calm), sc)
        if extra:
            for nm, q in extra.items(): named[nm] = (named.get(nm, (None,))[0], q, None)
        out = []
        for ch in s.parts:
            over = {ch.name[nm]: v for nm, v in named.items() if nm in ch.name}
            out.append(ch.globals_(ch.local(over)))
        return out
    def render(s, Gs, face, K=2, rmap=False, pixel=False):
        return render_multi(s.parts, Gs, face, K, rmap, pixel)

def render_multi(chars, Gs, face, K=2, rmap=False, pixel=False):
    """как C.render, но несколько персонажей-частей (тело, волосы …) в одном кадре"""
    class Merged: pass
    m = Merged(); m.prims = []; m.name = chars[0].name
    geo = []
    for ch, Gm in zip(chars, Gs):
        for (P, N), p in zip(ch.skinned(Gm), ch.prims): geo.append((P, N)); m.prims.append(p)
    m.skinned = lambda _: geo
    return C.render(m, Gs[0], face, K, rmap=rmap, pixel=pixel)

if __name__ == '__main__':
    h = Hero()
    rows = [(None, [0]), ('Idle_Loop', [0]), ('Walk_Loop', [0, .25, .5, .75]), ('Jog_Fwd_Loop', [0, .25, .5, .75]), ('Sprint_Loop', [0, .25, .5])]
    ims = []
    for clip, ts in rows:
        for t in ts:
            for d in ((0, 2, 6) if clip in (None, 'Idle_Loop') else (2,)):
                im, a = h.render(h.pose(clip, t), d * math.pi / 4, K=3); ims.append((clip, im))
    W = sum(i.width + 6 for _, i in ims[:8]) ; H = max(i.height for _, i in ims) + 8
    bg = Image.new('RGBA', (sum(i.width + 6 for _, i in ims), H), (70, 74, 66, 255)); x = 3
    for _, im in ims: bg.alpha_composite(im, (x, H - 4 - im.height)); x += im.width + 6
    bg.save(sys.argv[2] if len(sys.argv) > 2 else 'hero.png'); print(bg.size)
