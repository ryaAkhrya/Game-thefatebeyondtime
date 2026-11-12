#!/usr/bin/env python
"""
build_m05.py -- Phase 7 battle atlas M05_BATTLE_V1 for monster M05 Oathguard (fallen armoured sentinel, red cloak, polearm).

STATUS: DRAFT / NEEDS_REVIEW. Source: assets/monsters/M05_Oathguard/M05_NEW_CONCEPT_DRAFT.png (official concept, unchanged).
Paper-doll puppet of the concept (polearm+gripping arm / reaching arm / helmet / upper torso+cloak / lower body+cloak tails), posed at
high resolution, area-averaged to a 160x128 grid, one closed palette, 1 px plum outline.  Faces right.  Needs an artist redraw.

Run:  python -I web/scripts/battle-art/build_m05.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy import ndimage as ndi
from bakit import *

CONCEPT = os.path.join(REPO, 'assets', 'monsters', 'M05_Oathguard', 'M05_NEW_CONCEPT_DRAFT.png')
FW, FH = 160, 128
S = 0.08
PIVOT = (84, 123)
CX = 650.0

cv = Canvas(1127, 1396, 700)
src = cv.load(CONCEPT)
P = cv.pad
al = src[..., 3]
op = ndi.binary_erosion(al > 0.5, iterations=1)
rgb = np.clip(np.where(al[..., None] > 0.01, src[..., :3] / np.maximum(al[..., None], 1e-4), 0), 0, 1)
base = np.concatenate([rgb * op[..., None], op[..., None].astype(np.float32)], -1).astype(np.float32)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
cloak = (r > 0.35) & (r > 2.3 * g) & (r > 2.0 * b * 0.9)

yy, xx = np.mgrid[0:cv.H, 0:cv.W]
X, Y = xx - P, yy - P

# ---------------------------------------------------------------- masks
tail = cv.poly_mask([[(100, 485), (125, 420), (175, 330), (250, 265), (300, 285), (280, 330), (235, 400), (165, 480)]])
band = cv.poly_mask([[(340, 250), (432, 250), (84, 1222), (0, 1214)]])
hand = cv.poly_mask([[(185, 585), (280, 575), (330, 515), (420, 500), (445, 540), (430, 640), (340, 700), (270, 745), (185, 720)]])
helmet_zone = (X >= 635) & (Y >= 200)
weapon_m = op & ~cloak & (((Y < 290) & (X < 665) & ~helmet_zone) | tail | (band & (Y >= 250)) | hand)
armR_m = op & ~cloak & (X >= 868) & (Y >= 495) & (Y <= 860)
head_m = op & ~cloak & cv.poly_mask([[(628, 158), (835, 158), (850, 330), (810, 392), (640, 392)]]) & ~weapon_m
rest = op & ~weapon_m & ~armR_m & ~head_m
torso_m = rest & (Y < 690)
lower_m = rest & (Y >= 690)

# clean tiny orphans left over by colour cuts (cloak flecks that ended up in the weapon/arm parts)
for m in (weapon_m, armR_m, head_m):
    lab, n = ndi.label(m, structure=np.ones((3, 3)))
    if n > 1:
        sizes = ndi.sum(m, lab, range(1, n + 1))
        keep = 1 + int(np.argmax(sizes))
        for i, sz in enumerate(sizes, 1):
            if i != keep and sz < 600:
                m[lab == i] = False
                rest_add = (lab == i)
                torso_m |= rest_add & (Y < 690)
                lower_m |= rest_add & (Y >= 690)

body = torso_m | lower_m
d = ndi.distance_transform_edt(~body)
dil = d <= 28
closed = ndi.distance_transform_edt(dil) > 28
ext_region = (weapon_m | armR_m | head_m) & closed & ~body
ext = nearest_fill(cut(base, body), body, ext_region, shade=0.8)
ext = cut(ext, ext_region)


def part(mask):
    return cut(base, mask)


pup = Puppet(cv)
pup.add('ext', ext, (650, 700))
pup.add('lower', part(lower_m | (torso_m & (Y >= 640))), (650, 1396))   # duplicate of the torso's last rows: no seam when the torso breathes up
pup.add('torso', part(torso_m), (650, 690))
pup.add('head', part(head_m), (740, 380))
pup.add('armR', part(armR_m), (868, 565))
pup.add('weapon', part(weapon_m), (440, 540))

ys, xs = np.where(op)
FOOT_Y = float(ys.max() + 1 - P)
ox = (CX + P) - PIVOT[0] / S
oy = (FOOT_Y + P) - PIVOT[1] / S
grid = Grid(FW, FH, S, ox, oy)       # concept foot edge -> frame y = PIVOT.y (last opaque row PIVOT.y-1, outline row PIVOT.y)


def mv(dx=0, dy=0, angle=0):
    return dict(dx=dx, dy=dy, angle=angle)


def pose(t=None, h=None, w=None, a=None, lower=None, group=None, flash=0.0):
    t = t or {}
    return {'ext': dict(t), 'lower': dict(lower or {}), 'torso': dict(t), 'head': dict(h or {}), 'armR': dict(a or {}), 'weapon': dict(w or {}),
            '_group': group, '_flash': flash}


POSES = {
    'idle_a': pose(),
    'idle_b': pose(mv(0, -12), mv(0, -16, 1), mv(0, -12, 1.2), mv(0, -12, -1.5)),
    # tell: polearm drawn back and raised, sentinel leans away
    'anticipation': pose(mv(-26, -6), mv(-30, -8, 6), mv(-26, -6, 16), mv(-26, -6, -6)),
    'attack': pose(mv(46, 14), mv(52, 20, -4), mv(46, 14, -50), mv(46, 14, 12)),
    'followthrough': pose(mv(66, 26), mv(76, 36, -9), mv(66, 26, -78), mv(66, 26, 4)),
    'recovery': pose(mv(24, 10), mv(26, 12, -2), mv(24, 10, -24), mv(24, 10, 6)),
    'hit_recoil': pose(mv(-44, 4), mv(-60, 14, 9), mv(-44, 4, 10), mv(-44, 4, -12), flash=0.14),
    'hit_recover': pose(mv(-18, 2), mv(-24, 6, 4), mv(-18, 2, 4), mv(-18, 2, -5)),
    'death_start': pose(mv(-70, 40), mv(-110, 70, 22), mv(-70, 40, 28), mv(-70, 40, -34), group=dict(angle=16, dx=60, dy=0, pivot=(650, 1396))),
    'defeated': pose(mv(-20, 20), mv(-30, 30, 8), mv(-20, 20, 14), mv(-20, 20, -18), group=dict(angle=84, dx=560, dy=-560, pivot=(650, 1396))),
}
DURATION = {'idle_a': 560, 'idle_b': 560, 'anticipation': 340, 'attack': 240, 'followthrough': 170, 'recovery': 300,
            'hit_recoil': 220, 'hit_recover': 170, 'death_start': 300, 'defeated': 700}


def raw_frame(name):
    p = POSES[name]
    if p['_group']:
        comp, wg = render_group(pup, p, grid, p['_group'])
    else:
        comp, wg = pup.render(p, grid)
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
    pal = Palette(kmeans_palette(boost(rgb0)[op0], 24))
    frames = {}
    for name in POSES:
        rgb_, opq, p = raw_frame(name)
        rgb_ = boost(rgb_)
        if p['_flash']:
            rgb_ = np.clip(rgb_.astype(np.float32) * (1 - p['_flash']) + 255 * p['_flash'], 0, 255).astype(np.uint8)
        opq = fill_pinholes(opq)
        idx = np.where(opq, pal.quantize(rgb_), -1).astype(np.int16)
        idx = drop_small(clean_noise(idx), 5)
        # keep the lowest opaque row on the ground row for every frame (falls land flat)
        rows = np.where((idx >= 0).any(1))[0]
        idx = shift(idx, 0, (PIVOT[1] - 1) - int(rows.max()))
        frames[name] = finish(idx, pal, 1)
    return frames, pal


if __name__ == '__main__':
    frames, pal = build()
    meta = {
        'entity_id': 'M05', 'status': 'NEEDS_REVIEW', 'facing': 'right',
        'source': 'assets/monsters/M05_Oathguard/M05_NEW_CONCEPT_DRAFT.png', 'foot_pivot': list(PIVOT),
        'notes': 'DRAFT / NEEDS_REVIEW. Official concept pixelized and re-posed as a paper-doll (polearm arm, reaching arm, helmet, upper body, lower body); '
                 'falls are rigid rotations of the whole figure. Every frame is a re-pose of the same drawing; needs an artist redraw. Script: web/scripts/battle-art/build_m05.py.',
    }
    write_atlas('M05_BATTLE_V1', frames, FW, FH, pal, meta, {'frame_key': 'attack', 'index_0_based': list(frames).index('attack')}, DURATION, PIVOT)
    contact_sheet('M05_BATTLE_V1', frames, FW, FH, pal, scale=3, cols=5)
    print('M05 ok', len(frames), 'frames, palette', len(pal.arr))
