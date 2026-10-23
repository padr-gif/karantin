#!/usr/bin/env python3
"""Простой «IK» для поз без готового клипа: подбираем повороты плеча и предплечья, чтобы кисть пришла в точку
(например, руки на голове — моется в душе). Поворот — вектор вращения относительно позы покоя клипа."""
import math
import numpy as np
from scipy.optimize import minimize
import ubc

def qvec(v):
    a = float(np.linalg.norm(v))
    if a < 1e-9: return np.array([0, 0, 0, 1.])
    return ubc.qaxis(np.asarray(v) / a, a)

def reach(h, clip, t, side, target_fn, x0=None, calm=.45, base_extra=None, **pk):
    """повороты (плечо, предплечье) для руки side ('l'/'r'), чтобы кисть оказалась в target_fn(G) (G — глобальные матрицы тела)"""
    body = h.parts[0]; named = h.sample(clip, t)
    ua, la = 'upperarm_' + side, 'lowerarm_' + side
    r_u, r_l = np.asarray(named[ua][1], float), np.asarray(named[la][1], float)
    def ex(p):
        e = dict(base_extra or {}); e[ua] = ubc.qmul(r_u, qvec(p[:3])); e[la] = ubc.qmul(r_l, qvec(p[3:])); return e
    def cost(p):
        G = h.pose(clip, t, calm=calm, extra=ex(p), **pk)[0]
        hand = G[body.name['hand_' + side]][:3, 3]
        return float(np.sum((hand - target_fn(G)) ** 2)) + .002 * float(np.sum(p ** 2))
    best = None
    for st in ([x0] if x0 is not None else [np.zeros(6), np.r_[.8, 0, 0, 0, 0, 0], np.r_[0, 0, .8, 0, 0, 0], np.r_[0, 0, -.8, 0, 0, 0], np.r_[-.8, 0, 0, 0, 0, 0]]):
        r = minimize(cost, np.asarray(st, float), method='Nelder-Mead', options=dict(maxiter=900, xatol=1e-3, fatol=1e-6))
        if best is None or r.fun < best.fun: best = r
    return ex(best.x), best.fun, best.x
