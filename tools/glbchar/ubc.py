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
LOOK = dict(shirt='#c9bc9e', pants='#2a2c31', shoes='#2a2622', hair='#8a5a36')

def dress(ch, look):
    """раскраска тела «по костям»: футболка (корпус и верх плеча), брюки (таз и ноги), обувь (стопы)"""
    Gm = ch.globals_(ch.local()); bone = lambda n: Gm[ch.name[n]][:3, 3]
    for p in ch.prims:
        if len(p['P']) < 2000: continue                                      # лицо, глаза — не трогаем
        jn = [ch.nodes[j].get('name', '') for j in p['joints']]
        dom = np.array([jn[j] for j in p['J'][np.arange(len(p['P'])), p['W'].argmax(1)]])
        v = np.zeros((len(p['P']), 4)); P = p['P']
        def put(mask, c, a=1.0): v[mask, :3] = hexc(c); v[mask, 3] = a
        torso = np.isin(dom, ['spine_01', 'spine_02', 'spine_03', 'clavicle_l', 'clavicle_r'])
        put(torso, look['shirt'])
        for sd in 'lr':                                                       # короткий рукав: верхние 45% плеча
            m = dom == 'upperarm_' + sd
            a, b = bone('upperarm_' + sd), bone('lowerarm_' + sd); ax = b - a
            t = ((P - a) @ ax) / (ax @ ax)
            put(m & (t < .45), look['shirt'])
        legs = np.isin(dom, ['pelvis', 'root', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r'])
        put(legs, look['pants'])
        put(np.isin(dom, ['foot_l', 'foot_r', 'ball_l', 'ball_r']), look['shoes'])
        # шея снизу — ворот футболки: по высоте над ключицами
        neck = (dom == 'neck_01') & (P[:, 1] < bone('neck_01')[1] + .02)
        put(neck, look['shirt'])
        p['vcol'] = v; p['_mean'] = .5

class Hero:
    def __init__(s, parts=('Hair_Buzzed', 'Hair_Beard', 'Eyebrows_Regular'), look=LOOK):
        s.parts = [C.Char(os.path.join(UBC, BODY))] + [C.Char(os.path.join(UBC, HAIR + p + '.gltf')) for p in parts]
        body = s.parts[0]                                                   # светлая кожа вместо тёмной текстуры по умолчанию
        light = os.path.join(UBC, 'Base Characters/Godot - UE/T_Superhero_Male_Light.png')
        if os.path.exists(light):
            L = np.asarray(Image.open(light).convert('RGBA'), np.float32) / 255
            for p in body.prims:
                if p['img'] is not None and p['img'].shape == L.shape and len(p['P']) > 2000: p['img'] = L
        dress(s.parts[0], look)
        for ch in s.parts[1:]:
            for p in ch.prims:
                p['alpha'] = True
                if p['img'] is not None:
                    a = p['img'][..., 3:4]; m = float((p['img'][..., :3] * a).sum() / max(a.sum() * 3, 1))   # средняя яркость там, где есть волосы
                    p['tint'] = hexc(look['hair']) / max(m, .1)
        for p in body.prims:                                                 # встроенные ресницы/брови тела — тоже с альфой
            if len(p['P']) < 2000: p['alpha'] = True
        s.anim = C.Char(os.path.join(UAL, 'UAL1_Standard.glb'))
    def pose(s, clip=None, t01=0.0, extra=None):
        """глобальные матрицы для каждой части: анимация по именам костей (+ ручные правки extra: {кость: кватернион})"""
        named = {}
        if clip:
            for node, (t, r, sc) in s.anim.sample(clip, t01).items():
                nm = s.anim.nodes[node].get('name'); named[nm] = (t if nm in ('pelvis', 'root') else None, r, None)
        if extra:
            for nm, q in extra.items(): named[nm] = (named.get(nm, (None,))[0], q, None)
        out = []
        for ch in s.parts:
            over = {ch.name[nm]: v for nm, v in named.items() if nm in ch.name}
            out.append(ch.globals_(ch.local(over)))
        return out
    def render(s, Gs, face, K=2):
        return render_multi(s.parts, Gs, face, K)

def render_multi(chars, Gs, face, K=2):
    """как C.render, но несколько персонажей-частей (тело, волосы …) в одном кадре"""
    class Merged: pass
    m = Merged(); m.prims = []; m.name = chars[0].name
    geo = []
    for ch, Gm in zip(chars, Gs):
        for (P, N), p in zip(ch.skinned(Gm), ch.prims): geo.append((P, N)); m.prims.append(p)
    m.skinned = lambda _: geo
    return C.render(m, Gs[0], face, K)

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
