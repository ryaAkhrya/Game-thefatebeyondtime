#!/usr/bin/env python
"""
build_m06.py -- Phase 8 battle atlas M06_BATTLE_V1 for monster M06 Riftborn ("Penguji" uses the same atlas): a floating violet rift
wrapped in cracked, gold-veined stone arcs.

STATUS: DRAFT / NEEDS_REVIEW. Source: assets/monsters/M06_Riftborn/M06_NEW_CONCEPT_DRAFT.png (official concept, unchanged).
Two-layer puppet of the concept: the violet rift (torn cloth + vortex, back layer, holes filled with neighbouring violet) and the
stone arcs + shards (front layer, split by colour).  Poses counter-rotate / scale / lunge the layers ("the ring cracks, stops,
then jerks"), area-averaged to a 160x128 grid, one closed palette, 1 px plum outline.  Faces the party (right) by lunging right.
The creature FLOATS: the lowest opaque row of every frame except `defeated` is PIVOT.y-1-HOVER (HOVER px of air under it; the
BattleScene shadow belongs on the pivot line).  `defeated` lies on the ground (lowest row = PIVOT.y-1).  Needs an artist redraw.

Run:  python -I web/scripts/battle-art/build_m06.py
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

CONCEPT = os.path.join(REPO, 'assets', 'monsters', 'M06_Riftborn', 'M06_NEW_CONCEPT_DRAFT.png')
FW, FH = 160, 128
S = 0.075
PIVOT = (72, 124)
HOVER = 6
CENTER = (790.0, 520.0)

cv = Canvas(1312, 1199, 600)
src = cv.load(CONCEPT)
P = cv.pad
al = src[..., 3]
op = ndi.binary_erosion(al > 0.5, iterations=1)
rgb = np.clip(np.where(al[..., None] > 0.01, src[..., :3] / np.maximum(al[..., None], 1e-4), 0), 0, 1)
base = np.concatenate([rgb * op[..., None], op[..., None].astype(np.float32)], -1).astype(np.float32)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]

# stone = tan/pink/orange (green not below blue); rift = violet/magenta (blue above green)
rock = op & (g >= b * 0.97) & (r > 0.38)
rock = ndi.binary_closing(rock, structure=np.ones((3, 3), bool), iterations=2) & op
rock = ndi.binary_opening(rock, structure=np.ones((3, 3), bool), iterations=1)
lab, n = ndi.label(rock, structure=np.ones((3, 3)))
if n:
    sizes = ndi.sum(rock, lab, range(1, n + 1))
    for i, sz in enumerate(sizes, 1):
        if sz < 900:
            rock[lab == i] = False
back_m = op & ~rock
# violet layer: fill the holes where stone used to be (inside the silhouette) with the nearest violet
hole = ndi.binary_dilation(rock, iterations=3) & op & ~back_m
back_arr = nearest_fill(cut(base, back_m), back_m, hole | rock, shade=0.9)
back_arr = cut(back_arr, op)

pup = Puppet(cv)
pup.add('back', back_arr, CENTER)
pup.add('rock', cut(base, rock), CENTER)

ys, xs = np.where(op)
BOTTOM = float(ys.max() + 1 - P)
CXC = float((xs.min() + xs.max()) / 2 - P)
ox = (CXC + P) - PIVOT[0] / S + 40
oy = (BOTTOM + P) - (PIVOT[1] - HOVER) / S
grid = Grid(FW, FH, S, ox, oy)


def mv(dx=0, dy=0, angle=0, scale=1.0):
    return dict(dx=dx, dy=dy, angle=angle, scale=scale)


def pose(back=None, rock_=None, flash=0.0, lie=False, hide_back=False):
    bk = dict(back or {})
    if hide_back:
        bk['hide'] = True
    return {'back': bk, 'rock': dict(rock_ or {}), '_flash': flash, '_lie': lie}


POSES = {
    'idle_a': pose(),
    'idle_b': pose(mv(0, 0, 5), mv(0, -12, -3)),
    # tell: the arcs draw in and the rift tightens, then stops dead
    'anticipation': pose(mv(-20, 0, -10, 0.92), mv(-36, 8, 15, 0.86)),
    # jerk: arcs snap forward toward the party, rift lunges after them
    'attack': pose(mv(130, 0, 14, 1.05), mv(210, -6, -24, 1.10)),
    'followthrough': pose(mv(180, 8, 20, 1.08), mv(280, 12, -38, 1.16)),
    'recovery': pose(mv(50, 0, 6, 1.0), mv(86, 0, -10, 1.03)),
    'hit_recoil': pose(mv(-60, 10, -8), mv(-96, 16, 12), flash=0.10),
    'hit_recover': pose(mv(-24, 4, -3), mv(-40, 6, 5)),
    # breaking apart: arcs fly outward, rift dims
    'death_start': pose(mv(0, 10, -22, 0.78), mv(0, -24, 30, 1.2)),
    # lying on the ground: a heap of dead stone, the rift gone
    'defeated': pose(None, mv(0, 250, 8, 0.9), lie=True, hide_back=True),
}
DURATION = {'idle_a': 520, 'idle_b': 520, 'anticipation': 420, 'attack': 200, 'followthrough': 150, 'recovery': 300, 'hit_recoil': 220,
            'hit_recover': 170, 'death_start': 320, 'defeated': 800}


def raw_frame(name):
    p = POSES[name]
    pp = {k: v for k, v in p.items() if not k.startswith('_')}
    comp, wg = pup.render(pp, grid)
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
    pal = Palette(kmeans_palette(boost(rgb0, 1.12, 1.12)[op0], 26))
    frames = {}
    for name in POSES:
        rgb_, opq, p = raw_frame(name)
        rgb_ = boost(rgb_, 1.12, 1.12)
        if p['_flash']:
            rgb_ = np.clip(rgb_.astype(np.float32) * (1 - p['_flash']) + 255 * p['_flash'], 0, 255).astype(np.uint8)
        opq = fill_pinholes(opq)
        idx = np.where(opq, pal.quantize(rgb_), -1).astype(np.int16)
        idx = drop_small(clean_noise(idx), 6)
        rows = np.where((idx >= 0).any(1))[0]
        want = (PIVOT[1] - 1) - (0 if p['_lie'] else HOVER)
        d = want - int(rows.max())
        if d:
            idx = shift(idx, 0, d)
        frames[name] = finish(idx, pal, 1)
    return frames, pal


if __name__ == '__main__':
    frames, pal = build()
    meta = {
        'entity_id': 'M06', 'status': 'NEEDS_REVIEW', 'facing': 'front_toward_right', 'hover_px': HOVER,
        'source': 'assets/monsters/M06_Riftborn/M06_NEW_CONCEPT_DRAFT.png', 'foot_pivot': list(PIVOT),
        'notes': 'DRAFT / NEEDS_REVIEW. Official concept pixelized as two layers (violet rift; stone arcs+shards split by colour) and re-posed by counter-rotation, '
                 'scaling and lunging; defeated = heap of stone on the ground. The creature floats HOVER px above the pivot line in every frame except defeated. '
                 'Every frame is a re-pose of the same drawing; needs an artist redraw. Script: web/scripts/battle-art/build_m06.py.',
    }
    write_atlas('M06_BATTLE_V1', frames, FW, FH, pal, meta, {'frame_key': 'attack', 'index_0_based': list(frames).index('attack')}, DURATION, PIVOT)
    contact_sheet('M06_BATTLE_V1', frames, FW, FH, pal, scale=3, cols=4)
    print('M06 ok', len(frames), 'frames, palette', len(pal.arr))
