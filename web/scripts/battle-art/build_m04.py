#!/usr/bin/env python
"""
build_m04.py -- Phase 8 battle atlas M04_BATTLE_V1 for monster M04 Gravorn (moss-covered rock golem, amber eye, spiral rune on the chest).

STATUS: DRAFT / NEEDS_REVIEW. Source: assets/monsters/M04_Gravorn/M04_NEW_CONCEPT_DRAFT.png (official concept, unchanged).
Paper-doll puppet of the concept (left arm+fist / right arm+fist / head / torso+shoulders / legs), posed at high resolution,
area-averaged to a 176x136 grid, one closed palette, 1 px plum outline.  Front-facing stance leaning toward the party (right).
Behaviour: slow, heavy -- arms lifted over the head before the heave / crush, arms crossed in front of the chest for the brace.
Needs an artist redraw.

Run:  python -I web/scripts/battle-art/build_m04.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy import ndimage as ndi
import bakit
from bakit import *

bakit.SHEETS = os.path.join(REPO, 'docs', 'production', 'sprint4', 'battle-contact-sheets')
os.makedirs(bakit.SHEETS, exist_ok=True)

CONCEPT = os.path.join(REPO, 'assets', 'monsters', 'M04_Gravorn', 'M04_NEW_CONCEPT_DRAFT.png')
FW, FH = 176, 136
S = 0.085
PIVOT = (88, 131)
CX = 660.0

cv = Canvas(1293, 1216, 600)
src = cv.load(CONCEPT)
P = cv.pad
al = src[..., 3]
op = ndi.binary_erosion(al > 0.5, iterations=1)
rgb = np.clip(np.where(al[..., None] > 0.01, src[..., :3] / np.maximum(al[..., None], 1e-4), 0), 0, 1)
base = np.concatenate([rgb * op[..., None], op[..., None].astype(np.float32)], -1).astype(np.float32)
yy, xx = np.mgrid[0:cv.H, 0:cv.W]
X, Y = xx - P, yy - P

# ---------------------------------------------------------------- masks (concept px)
armL_m = op & cv.poly_mask([[(10, 410), (330, 395), (500, 440), (520, 640), (470, 760), (360, 830), (230, 860), (60, 780), (10, 640)]]) & (X < 520)
armR_m = op & cv.poly_mask([[(865, 480), (1000, 470), (1255, 470), (1255, 800), (960, 800), (880, 720)]])
head_m = op & cv.poly_mask([[(560, 60), (840, 60), (870, 200), (850, 330), (720, 335), (570, 300), (550, 200)]]) & ~armL_m & ~armR_m
legs_m = op & (Y >= 790) & ~armL_m & ~armR_m & ~head_m
torso_m = op & ~armL_m & ~armR_m & ~head_m & ~legs_m

# orphan slivers left by the polygon cuts would float on their own when a part moves: hand them to the torso
for _m in (armL_m, armR_m, head_m):
    _lab, _n = ndi.label(_m, structure=np.ones((3, 3)))
    if _n > 1:
        _sizes = ndi.sum(_m, _lab, range(1, _n + 1))
        _keep = 1 + int(np.argmax(_sizes))
        for _i in range(1, _n + 1):
            if _i != _keep and _sizes[_i - 1] < 6000:
                torso_m |= (_lab == _i)
                _m[_lab == _i] = False
_lab, _n = ndi.label(legs_m, structure=np.ones((3, 3)))
for _i in range(1, _n + 1):
    if (_lab == _i).sum() < 2500:
        torso_m |= (_lab == _i); legs_m[_lab == _i] = False
# small torso fragments that belong to a neighbouring part (e.g. the right fist's outer edge beyond the polygon)
_lab, _n = ndi.label(torso_m, structure=np.ones((3, 3)))
_dist = {k: ndi.distance_transform_edt(~m) for k, m in (('armL', armL_m), ('armR', armR_m), ('legs', legs_m))}
_tgt = {'armL': armL_m, 'armR': armR_m, 'legs': legs_m}
for _i in range(1, _n + 1):
    _c = _lab == _i
    if _c.sum() < 3000:
        _best = min(_dist, key=lambda k: _dist[k][_c].min())
        if _dist[_best][_c].min() < 6:
            _tgt[_best] |= _c
            torso_m &= ~_c
body = torso_m | legs_m
legs_back_m = op & (Y >= 735) & ~armL_m & ~armR_m & ~head_m


def part(m):
    return cut(base, m)


pup = Puppet(cv)
# the head leaves a hole in the torso when it moves: fill it with neighbouring rock so no seam shows
_torso_arr = cut(base, torso_m)
_hole = ndi.binary_dilation(head_m, iterations=4) & op & ~torso_m & ~armL_m & ~armR_m & ~legs_m
_torso_arr = nearest_fill(_torso_arr, torso_m, head_m | _hole, shade=0.85)
_torso_arr = cut(_torso_arr, torso_m | head_m | _hole)
pup.add('armL', part(armL_m), (420, 470))
pup.add('armR', part(armR_m), (930, 510))
pup.add('legs', cut(base, legs_back_m | legs_m), (660, 1216))
pup.add('torso', _torso_arr, (660, 790))
pup.add('head', part(head_m), (720, 320))
# in 'front' pose the arms are drawn again over the torso
pup.add('armL_f', part(armL_m), (420, 470))
pup.add('armR_f', part(armR_m), (930, 510))
pup.hidden_default = {'armL_f', 'armR_f'}

ys, xs = np.where(op)
FOOT_Y = float(ys.max() + 1 - P)
ox = (CX + P) - PIVOT[0] / S
oy = (FOOT_Y + P) - PIVOT[1] / S
grid = Grid(FW, FH, S, ox, oy)


def mv(dx=0, dy=0, angle=0):
    return dict(dx=dx, dy=dy, angle=angle)


def pose(t=None, h=None, l=None, r=None, lower=None, flash=0.0, front=False, group=None):
    t = t or {}
    p = {'torso': dict(t), 'head': dict(h or {}), 'armL': dict(l or {}), 'armR': dict(r or {}), 'legs': dict(lower or {}), '_flash': flash, '_front': front, '_group': group}
    if front:
        p['armL_f'] = dict(l or {})
        p['armR_f'] = dict(r or {})
    return p


POSES = {
    'idle_a': pose(),
    'idle_b': pose(mv(0, -14), mv(0, -20, 0.5), mv(0, -6), mv(0, -6)),
    # tell: crouch, both stone arms hauled up over the head
    'anticipation': pose(mv(-20, 36), mv(-26, 60, 3), mv(40, -230, -96), mv(-30, -260, 100)),
    # heave: arms slam down and forward toward the party
    'attack': pose(mv(54, 34), mv(78, 56, -4), mv(210, 90, 14), mv(190, 150, -26), front=True),
    'followthrough': pose(mv(84, 74), mv(124, 100, -8), mv(300, 250, 18), mv(250, 260, -34), front=True),
    'recovery': pose(mv(30, 30), mv(44, 40, -3), mv(110, 70, 8), mv(90, 100, -14)),
    'hit_recoil': pose(mv(-34, 8), mv(-52, 24, 8), mv(-20, 0, 6), mv(-24, 6, -8), flash=0.10),
    'hit_recover': pose(mv(-14, 4), mv(-22, 10, 3), mv(-8, 0, 3), mv(-10, 2, -3)),
    # brace: both fists brought up in front of the chest (DEF high)
    'guard': pose(mv(0, 22), mv(0, 36), mv(390, -250, -16), mv(-340, -240, 18), front=True),
    # crumble: upper body sags between the legs
    'death_start': pose(mv(-10, 120), mv(-24, 190, 8), mv(40, 130, -18), mv(-30, 150, 20)),
    'defeated': pose(mv(0, 330), mv(-10, 420, 12), mv(90, 330, -34), mv(-80, 300, 30)),
}
DURATION = {'idle_a': 800, 'idle_b': 800, 'anticipation': 520, 'attack': 280, 'followthrough': 220, 'recovery': 420, 'hit_recoil': 240,
            'hit_recover': 200, 'guard': 400, 'death_start': 360, 'defeated': 900}


def make_puppet(p):
    q = Puppet(cv)
    q.hidden_default = pup.hidden_default
    q.parts = list(pup.parts)
    if p['_front']:
        q.parts = [x for x in q.parts if x[0] not in ('armL', 'armR')]
    return q


def raw_frame(name):
    p = POSES[name]
    q = make_puppet(p)
    pp = {k: v for k, v in p.items() if not k.startswith('_')}
    comp, wg = q.render(pp, grid)
    rgb_, opq, _, _ = pixelize(comp, wg, 0.45)
    return rgb_, opq, p


def shift(idx, dx, dy):
    out = np.full_like(idx, -1)
    h, w = idx.shape
    ys0, ys1 = max(0, dy), min(h, h + dy)
    xs0, xs1 = max(0, dx), min(w, w + dx)
    out[ys0:ys1, xs0:xs1] = idx[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out


def build():
    rgb0, op0, _ = raw_frame('idle_a')
    pal = Palette(kmeans_palette(boost(rgb0, 1.1, 1.1)[op0], 24))
    frames = {}
    for name in POSES:
        rgb_, opq, p = raw_frame(name)
        rgb_ = boost(rgb_, 1.1, 1.1)
        if p['_flash']:
            rgb_ = np.clip(rgb_.astype(np.float32) * (1 - p['_flash']) + 255 * p['_flash'], 0, 255).astype(np.uint8)
        opq = fill_pinholes(opq)
        idx = np.where(opq, pal.quantize(rgb_), -1).astype(np.int16)
        idx = drop_small(clean_noise(idx), 5)
        rows = np.where((idx >= 0).any(1))[0]
        d = (PIVOT[1] - 1) - int(rows.max())
        if d:
            print('  ', name, 'ground shift', d)
            idx = shift(idx, 0, d)
        frames[name] = finish(idx, pal, 1)
    return frames, pal


if __name__ == '__main__':
    frames, pal = build()
    meta = {
        'entity_id': 'M04', 'status': 'NEEDS_REVIEW', 'facing': 'front_toward_right',
        'source': 'assets/monsters/M04_Gravorn/M04_NEW_CONCEPT_DRAFT.png', 'foot_pivot': list(PIVOT),
        'special_frames': {'guard': 'gravorn_brace: kedua lengan batu disilangkan di depan dada'},
        'notes': 'DRAFT / NEEDS_REVIEW. Official concept pixelized and re-posed as a paper-doll (left arm, right arm, head, torso+shoulders, legs). '
                 'Arms are lifted overhead for the heave tell; guard draws the arms over the chest; death = upper body sinks between the legs. '
                 'Every frame is a re-pose of the same drawing; needs an artist redraw. Script: web/scripts/battle-art/build_m04.py.',
    }
    write_atlas('M04_BATTLE_V1', frames, FW, FH, pal, meta, {'frame_key': 'attack', 'index_0_based': list(frames).index('attack')}, DURATION, PIVOT)
    contact_sheet('M04_BATTLE_V1', frames, FW, FH, pal, scale=3, cols=4)
    print('M04 ok', len(frames), 'frames, palette', len(pal.arr))
