"""Минимальный загрузчик .glb (glTF 2.0): узлы, меши, скины, анимации, текстуры. Только numpy и Pillow."""
import json, struct, io
import numpy as np
from PIL import Image

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

class GLB:
    def __init__(s, path):
        d = open(path, 'rb').read()
        assert d[:4] == b'glTF'
        jl = struct.unpack_from('<I', d, 12)[0]
        s.j = json.loads(d[20:20 + jl]); bl = struct.unpack_from('<I', d, 20 + jl)[0]
        s.bin = d[28 + jl:28 + jl + bl]
    def view(s, i):
        v = s.j['bufferViews'][i]; o = v.get('byteOffset', 0); return s.bin[o:o + v['byteLength']], v.get('byteStride')
    def acc(s, i):
        a = s.j['accessors'][i]; raw, stride = s.view(a['bufferView']); dt = CT[a['componentType']]; n = NC[a['type']]
        off = a.get('byteOffset', 0); cnt = a['count']; isz = np.dtype(dt).itemsize
        if stride and stride != n * isz:
            out = np.empty((cnt, n), dt)
            for k in range(cnt): out[k] = np.frombuffer(raw, dt, n, off + k * stride)
        else: out = np.frombuffer(raw, dt, cnt * n, off).reshape(cnt, n)
        if a.get('normalized'):
            out = out.astype(np.float32) / np.iinfo(dt).max
        return out if n > 1 else out[:, 0]
    def image(s, i):
        im = s.j['images'][i]
        raw, _ = s.view(im['bufferView']); return Image.open(io.BytesIO(raw)).convert('RGBA')
    def summary(s):
        j = s.j
        print('узлов', len(j.get('nodes', [])), 'мешей', len(j.get('meshes', [])), 'скинов', len(j.get('skins', [])),
              'текстур', len(j.get('images', [])), 'анимации', [a.get('name') for a in j.get('animations', [])])
        for m in j.get('meshes', []):
            print(' меш', m.get('name'), [(p['attributes'].keys().__len__(), j['accessors'][p['attributes']['POSITION']]['count'], p.get('material')) for p in m['primitives']])
        if j.get('skins'): print(' кости', [j['nodes'][k].get('name') for k in j['skins'][0]['joints']][:70])
