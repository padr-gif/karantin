#!/usr/bin/env python3
"""Готовый персонаж из .glb (текстуры, скелет, скиннинг) → кадры спрайтов в проекции игры.
Оси: glTF — Y вверх, персонаж смотрит в +Z; игра — z вверх, «вперёд» +x, влево +y: (x, y, z) = (gz, gx, gy).
"""
import os, sys, math
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'tools/mh3d'))
import glb as G
from render import raster, nrm, LIGHT, VIEW

def qmat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
def trs(t, r, s):
    M = np.eye(4); M[:3, :3] = qmat(r) * np.asarray(s)[None, :]; M[:3, 3] = t; return M
def slerp(a, b, t):
    d = np.dot(a, b)
    if d < 0: b, d = -b, -d
    if d > .9995: q = a + (b - a) * t; return q / np.linalg.norm(q)
    th = math.acos(d); return (math.sin((1 - t) * th) * a + math.sin(t * th) * b) / math.sin(th)
AX = np.array([[0, 0, 1], [1, 0, 0], [0, 1, 0]], float)      # glTF → игра

class Char:
    def __init__(s, path, skip=()):
        s.g = g = G.GLB(path); j = g.j; s.nodes = j['nodes']
        s.parent = {}
        for i, n in enumerate(s.nodes):
            for c in n.get('children', []): s.parent[c] = i
        s.rest = [(np.array(n.get('translation', [0, 0, 0]), float), np.array(n.get('rotation', [0, 0, 0, 1]), float), np.array(n.get('scale', [1, 1, 1]), float)) for n in s.nodes]
        s.name = {n.get('name'): i for i, n in enumerate(s.nodes)}
        s.skin = j['skins'][0]; s.joints = s.skin['joints']; s.ibm = g.acc(s.skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
        s.prims = []; tex = {}
        for ni, n in enumerate(s.nodes):
            if 'mesh' not in n or 'skin' not in n: continue
            mesh = j['meshes'][n['mesh']]
            if mesh.get('name') in skip: continue
            for p in mesh['primitives']:
                a = p['attributes']; mat = j['materials'][p['material']] if 'material' in p else {}
                pbr = mat.get('pbrMetallicRoughness', {}); ti = pbr.get('baseColorTexture', {}).get('index')
                img = None
                if ti is not None:
                    src = j['textures'][ti]['source']
                    if src not in tex: tex[src] = np.asarray(g.image(src), np.float32) / 255
                    img = tex[src]
                col = np.array(pbr.get('baseColorFactor', [1, 1, 1, 1]), float)
                sk = j['skins'][n['skin']]
                s.prims.append(dict(P=g.acc(a['POSITION']).astype(float), N=g.acc(a['NORMAL']).astype(float) if 'NORMAL' in a else None,
                                    UV=g.acc(a['TEXCOORD_0']).astype(float) if 'TEXCOORD_0' in a else None,
                                    J=g.acc(a['JOINTS_0']).astype(int), W=g.acc(a['WEIGHTS_0']).astype(float),
                                    I=g.acc(p['indices']).astype(int).reshape(-1, 3), img=img, col=col,
                                    joints=sk['joints'], ibm=g.acc(sk['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1),
                                    name=mesh.get('name')))
        s.anims = {a['name']: a for a in j.get('animations', [])}
    # ---- позы ----
    def local(s, over=None):
        """локальные матрицы узлов: покой + переопределения {узел: (t, r, s)}"""
        L = []
        for i, (t, r, sc) in enumerate(s.rest):
            if over and i in over:
                o = over[i]; t = o[0] if o[0] is not None else t; r = o[1] if o[1] is not None else r; sc = o[2] if o[2] is not None else sc
            L.append(trs(t, r, sc))
        return L
    def globals_(s, L):
        Gm = [None] * len(L)
        def gm(i):
            if Gm[i] is None: Gm[i] = (gm(s.parent[i]) @ L[i]) if i in s.parent else L[i]
            return Gm[i]
        for i in range(len(L)): gm(i)
        return Gm
    def sample(s, name, t01):
        """переопределения узлов из анимации glTF в момент t01 (доля длины клипа)"""
        a = s.anims[name]; g = s.g; over = {}
        T = max(g.acc(sm['input']).max() for sm in a['samplers']); tt = t01 * T
        for ch in a['channels']:
            sm = a['samplers'][ch['sampler']]; ts = g.acc(sm['input']); vs = g.acc(sm['output']).astype(float)
            node, path = ch['target']['node'], ch['target']['path']
            k = np.searchsorted(ts, tt) ; k0 = max(0, min(k - 1, len(ts) - 1)); k1 = min(k, len(ts) - 1)
            f = 0 if k1 == k0 else (tt - ts[k0]) / (ts[k1] - ts[k0])
            if path == 'rotation': v = slerp(vs[k0], vs[k1], f)
            else: v = vs[k0] * (1 - f) + vs[k1] * f
            o = list(over.get(node, (None, None, None)))
            o[{'translation': 0, 'rotation': 1, 'scale': 2}[path]] = v; over[node] = tuple(o)
        return over
    def skinned(s, Gm):
        out = []
        for p in s.prims:
            M = np.stack([Gm[jn] @ p['ibm'][k] for k, jn in enumerate(p['joints'])])
            Pw = np.einsum('nk,nkij,nj->ni', p['W'], M[p['J']], np.c_[p['P'], np.ones(len(p['P']))])[:, :3]
            Nw = np.einsum('nk,nkij,nj->ni', p['W'], M[p['J']][:, :, :3, :3], p['N']) if p['N'] is not None else None
            out.append((Pw @ AX.T, None if Nw is None else Nw @ AX.T))
        return out

# ---- рендер в проекции игры ----
def interp_one(A, tv, bary): return np.einsum('nk,nkj->nj', bary, A[tv])
SS = 3
def render(ch, Gm, face, K=2, root_xy=True, rmap=False):
    """rmap=True — ещё и карта областей тела (у примитивов p['rid'] — номер области вершины): R=номер·16, G=светотень, B=покрытие"""
    HX, HY, ZP = 32 * K, 16 * K, 31 * K
    geo = ch.skinned(Gm)
    allP = np.concatenate([P for P, _ in geo])
    zmin = allP[:, 2].min()
    hk = next(k for k in ('mixamorig:Hips', 'Hips', 'pelvis') if k in ch.name); hips = Gm[ch.name[hk]][:3, 3] @ AX.T
    c, s_ = math.cos(face), math.sin(face); R = np.array([[c, -s_, 0], [s_, c, 0], [0, 0, 1]])
    V, Nn, UV, TRI, PRIM = [], [], [], [], []; off = 0
    for pi, ((P, N), p) in enumerate(zip(geo, ch.prims)):
        Q = P.copy(); Q[:, 2] -= zmin
        if root_xy: Q[:, :2] -= hips[:2]                       # точка персонажа — под тазом
        Q = Q @ R.T; V.append(Q); Nn.append((N if N is not None else np.zeros_like(P)) @ R.T)
        UV.append(p['UV'] if p['UV'] is not None else np.zeros((len(P), 2))); TRI.append(p['I'] + off); PRIM.append(np.full(len(p['I']), pi)); p['_off'] = off; off += len(P)
    V = np.concatenate(V); Nn = np.concatenate(Nn); UV = np.concatenate(UV); tri = np.concatenate(TRI); tprim = np.concatenate(PRIM)
    sx = (V[:, 0] - V[:, 1]) * HX; sy = (V[:, 0] + V[:, 1]) * HY - V[:, 2] * ZP
    x0, x1 = math.floor(sx.min()) - 3, math.ceil(sx.max()) + 3; y0, y1 = math.floor(sy.min()) - 3, math.ceil(sy.max()) + 3
    W, H = (x1 - x0) * SS, (y1 - y0) * SS
    scr = np.stack([(sx - x0) * SS, (sy - y0) * SS, -(V @ VIEW)], -1)
    # прозрачные по текстуре части (волосы, борода, брови — «карточки» с альфой) растеризуем отдельно и
    # берём их пиксель, только если он ближе непрозрачного и альфа текстуры в этой точке > .5
    isA = np.array([bool(ch.prims[i].get('alpha')) for i in tprim])
    def rast(mask):
        t2 = tri.copy(); t2[~mask] = 0                                       # вырожденный треугольник растеризатор пропускает
        return raster(scr, t2, W, H)
    zb, tid, b1, b2 = rast(~isA)
    if isA.any():
        za, ta, a1, a2 = [x.ravel() for x in rast(isA)]
        shp = zb.shape; zb, tid, b1, b2 = [x.ravel() for x in (zb, tid, b1, b2)]
        cand = (ta >= 0) & (za < zb)
        if cand.any():
            T2 = ta[cand]; bb = np.stack([1 - a1[cand] - a2[cand], a1[cand], a2[cand]], -1)
            uv2 = np.einsum('nk,nkj->nj', bb, UV[tri[T2]]); alpha = np.zeros(len(T2))
            for i, p in enumerate(ch.prims):
                sel = tprim[T2] == i
                if not sel.any() or p['img'] is None: continue
                h_, w_ = p['img'].shape[:2]
                alpha[sel] = p['img'][((uv2[sel, 1] % 1) * (h_ - 1)).astype(int), ((uv2[sel, 0] % 1) * (w_ - 1)).astype(int), 3]
            ok = alpha > .5; idx = np.flatnonzero(cand)[ok]
            tid[idx] = ta[idx]; b1[idx] = a1[idx]; b2[idx] = a2[idx]; zb[idx] = za[idx]
        zb, tid, b1, b2 = [x.reshape(shp) for x in (zb, tid, b1, b2)]
    hit = tid >= 0; T_ = tid[hit]; w1, w2 = b1[hit], b2[hit]; bary = np.stack([1 - w1 - w2, w1, w2], -1); tv = tri[T_]
    interp = lambda A: np.einsum('nk,nkj->nj', bary, A[tv])
    n = interp(Nn); n /= np.maximum(np.linalg.norm(n, axis=-1, keepdims=True), 1e-9)
    uv = interp(UV); pr = tprim[T_]
    col = np.ones((len(T_), 3))
    for pi, p in enumerate(ch.prims):
        sel = pr == pi
        if not sel.any(): continue
        if p['img'] is not None:
            img = p['img']; h, w = img.shape[:2]
            u = (uv[sel, 0] % 1) * (w - 1); v = (uv[sel, 1] % 1) * (h - 1)
            col[sel] = img[v.astype(int), u.astype(int), :3] * p['col'][:3]
        else: col[sel] = p['col'][:3]
        if p.get('tint') is not None: col[sel] = col[sel] * p['tint']           # волосы: серая текстура × цвет
        if p.get('vcol') is not None:                                           # одежда «по костям»: цвет ткани × светотень текстуры
            vc = interp_one(p['vcol'], tri[T_[sel]] - p['_off'], bary[sel])
            lumt = col[sel].mean(1, keepdims=True); k = vc[:, 3:4]
            col[sel] = col[sel] * (1 - k) + vc[:, :3] * np.clip(lumt / max(p.get('_mean', .45), .05), .55, 1.35) * k
    dif = np.clip(n @ LIGHT, 0, 1); sky = .5 + .5 * n[:, 2]; fill = np.clip(n @ VIEW, 0, 1)
    lum = .3 * (.55 + .45 * sky) + .72 * dif + .14 * fill
    rgb = np.clip(col * lum[:, None], 0, 1) ** (1 / 1.08)
    img = np.zeros((H * W, 4)); img[hit.ravel(), :3] = rgb; img[hit.ravel(), 3] = 1
    im = img.reshape(H, W, 4)
    # уменьшение с учётом покрытия
    pm = im.copy(); pm[..., :3] *= pm[..., 3:4]
    small = pm.reshape(H // SS, SS, W // SS, SS, 4).mean((1, 3))
    a = small[..., 3:4]; small[..., :3] = np.where(a > 0, small[..., :3] / np.maximum(a, 1e-6), 0)
    small[..., 3] = np.clip((small[..., 3] - .2) / .6, 0, 1)                # чёткий край силуэта
    out = Image.fromarray((np.clip(small, 0, 1) * 255).astype(np.uint8), 'RGBA')
    if not rmap: return out, (-x0, -y0)
    # область пикселя — по ближайшей вершине треугольника; светотень — только свет (без текстуры кожи)
    rid = np.zeros(len(T_), int)
    for pi, p in enumerate(ch.prims):
        sel = pr == pi
        if not sel.any() or p.get('rid') is None: continue
        vt = tri[T_[sel]] - p['_off']; rid[sel] = p['rid'][vt[np.arange(len(vt)), bary[sel].argmax(1)]]
    NR = 16; RF = np.zeros(H * W, int); RF[hit.ravel()] = rid; LF = np.zeros(H * W); LF[hit.ravel()] = lum
    oh = (RF[:, None] == np.arange(1, NR)[None, :]) & hit.ravel()[:, None]
    cnt = oh.reshape(H // SS, SS, W // SS, SS, NR - 1).sum((1, 3))
    ls = (oh * LF[:, None]).reshape(H // SS, SS, W // SS, SS, NR - 1).sum((1, 3))
    mj = cnt.argmax(-1); c = np.take_along_axis(cnt, mj[..., None], -1)[..., 0]; l = np.take_along_axis(ls, mj[..., None], -1)[..., 0] / np.maximum(c, 1)
    rm = np.zeros(c.shape + (4,), np.uint8)
    rm[..., 0] = (mj + 1) * 16; rm[..., 1] = np.clip(l ** (1 / 1.08) / 1.5 * 255, 0, 255); rm[..., 2] = np.clip(c / (SS * SS) * 255, 0, 255); rm[..., 3] = np.where(c > 0, 255, 0)
    rm[c == 0] = 0
    return out, (-x0, -y0), Image.fromarray(rm, 'RGBA')

if __name__ == '__main__':
    path = sys.argv[1]; out = sys.argv[2]
    ch = Char(path)
    frames = []
    clips = [None] + [n for n in ch.anims if n not in ('TPose',)]
    for clip in clips[:4]:
        for d in (0, 2, 3, 6):
            over = ch.sample(clip, .25) if clip else None
            im, a = render(ch, ch.globals_(ch.local(over)), d * math.pi / 4, K=3)
            frames.append(im)
    Wd = sum(f.width + 8 for f in frames[:4]); Hd = max(f.height for f in frames) + 10
    bg = Image.new('RGBA', (Wd, Hd * ((len(frames) + 3) // 4)), (70, 74, 66, 255))
    for i, f in enumerate(frames):
        x = sum(fr.width + 8 for fr in frames[(i // 4) * 4:i]); bg.alpha_composite(f, (x, (i // 4) * Hd + Hd - 5 - f.height))
    bg.save(out); print(bg.size, clips)
