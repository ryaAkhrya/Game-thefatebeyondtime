#!/usr/bin/env python
"""
build_b03.py -- Phase 7 battle atlas B03_BATTLE_V1 for boss B03 Chronolith (stone guardian: arch + glowing core).

STATUS: DRAFT / NEEDS_REVIEW. Source: assets/bosses/B03_Chronolith/B03_NEW_CONCEPT_DRAFT.png (official concept, unchanged).
Method: paper-doll puppet of the concept (arch / head / torso / core / two forearms / legs) re-posed at high resolution,
area-averaged to a 192x140 grid, one closed palette, 1 px plum outline (see bakit.py).  Glow lines/core use a 4-step ember ramp
so the charge tell (arch lifts + core flares) is visible in pixels.  Every non-authored pose is a re-pose of the same drawing and
needs an artist redraw.

Run:  python -I web/scripts/battle-art/build_b03.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from bakit import *

CONCEPT = os.path.join(REPO, 'assets', 'bosses', 'B03_Chronolith', 'B03_NEW_CONCEPT_DRAFT.png')
FW, FH = 192, 140
S = 0.108
CX = 656.0           # concept symmetry axis
FOOT_Y = 1196.0      # concept y just below the last foot row
PIVOT = (80, 136)    # frame px of the foot centre / last opaque row (outline row)

cv = Canvas(1312, 1199, 420)
src = cv.load(CONCEPT)

# ---------------------------------------------------------------- hard alpha, remove red fringe
al = src[..., 3]
op = ndi.binary_erosion(al > 0.5, iterations=1)
rgb = np.where(al[..., None] > 0.01, src[..., :3] / np.maximum(al[..., None], 1e-4), 0)
rgb = np.clip(rgb, 0, 1)

# glow mask from the amber lines
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
glow = (r > 0.88) & (g > 0.55) & (b < 0.5) & (r - b > 0.5) & op
lab, n = ndi.label(glow, structure=np.ones((3, 3)))
if n:
    sizes = ndi.sum(glow, lab, range(1, n + 1))
    for i, s_ in enumerate(sizes, 1):
        if s_ < 40:
            glow[lab == i] = False
glow_d = ndi.binary_dilation(glow, iterations=2)
rgb_ng = rgb.copy()
tmp = np.concatenate([rgb, op[..., None].astype(np.float32)], -1)
valid = op & ~glow_d
idx = ndi.distance_transform_edt(~valid, return_distances=False, return_indices=True)
filled = rgb[idx[0], idx[1]]
rgb_ng[glow_d] = filled[glow_d]
base = np.concatenate([rgb_ng * op[..., None], op[..., None].astype(np.float32)], -1).astype(np.float32)

# ---------------------------------------------------------------- part masks (concept px)
P = cv.pad
yy, xx = np.mgrid[0:cv.H, 0:cv.W]
X, Y = xx - P, yy - P
head_box = (X >= 575) & (X <= 735) & (Y >= 205) & (Y <= 335)
head_m = head_box & (Y <= 322) & op
arch_m = op & ~head_box & ((Y < 296) | ((Y < 345) & ((X < 440) | (X > 872))))
armL_poly = [(40, 575), (385, 575), (385, 700), (372, 720), (372, 870), (335, 870), (335, 1040), (40, 1040)]
armR_poly = [(1312 - x, y) for x, y in armL_poly]
armL_m = cv.poly_mask([armL_poly]) & op
armR_m = cv.poly_mask([armR_poly]) & op
legs_m = op & (Y >= 872) & ~armL_m & ~armR_m
torso_m = op & ~head_m & ~arch_m & ~armL_m & ~armR_m & ~legs_m

core_zone = ((X - 655) ** 2 + (Y - 510) ** 2) < 135 ** 2
core_g = glow & core_zone
glow_thick = ndi.binary_dilation(glow, structure=np.ones((3, 3), bool), iterations=1) & op   # veins: widened so they survive the grid
line_g = glow_thick & ~core_zone


def part(mask, gmask):
    rgba = cut(base, mask)
    return with_glow(rgba, gmask & mask, 1.0)


arch = part(arch_m, glow_thick)
head = part(head_m, glow)
armL = part(armL_m, glow_thick)
armR = part(armR_m, glow_thick)
legs = part(legs_m, glow_thick)
torso = part(torso_m, line_g)
# core glow rides on its own transparent part so the pulse level can differ from the stone lines
core = np.zeros_like(torso)
core[..., 4] = (core_g & torso_m).astype(np.float32)
core[..., 5] = core[..., 4] * 2.0

# torso extension (drawn behind legs/arms): torso body continues behind the arms and into the thigh
ext_valid = torso_m
ext_region_arms = (cv.poly_mask([[(330, 575), (470, 575), (470, 872), (330, 872)], [(842, 575), (982, 575), (982, 872), (842, 872)]])) & (armL_m | armR_m)
ext_region_legs = legs_m & (Y < 985) & (X > 380) & (X < 932)
ext = nearest_fill(cut(base, torso_m), ext_valid, ext_region_arms | ext_region_legs, shade=0.82)
ext = cut(ext, torso_m | ext_region_arms | ext_region_legs)
ext = np.concatenate([ext, np.zeros(ext.shape[:2] + (2,), np.float32)], -1)

pup = Puppet(cv)
pup.add('arch', arch, (656, 330))
pup.add('torso_ext', ext, (656, 700))
pup.add('legs', legs, (656, 1196))
pup.add('torso', torso, (656, 700))
pup.add('core', core, (656, 700))
pup.add('head', head, (656, 330))
pup.add('armL', armL, (300, 600))
pup.add('armR', armR, (1012, 600))

# ---------------------------------------------------------------- frame mapping
ys, xs = np.where(op)
ox = (CX + P) - PIVOT[0] / S
FOOT_Y = float(ys.max() + 1 - P)   # concept y just below the last opaque foot row -> lands on frame y = PIVOT.y (outline row = PIVOT.y)
oy = (FOOT_Y + P) - PIVOT[1] / S
grid = Grid(FW, FH, S, ox, oy)


def pose(lines=1, arch_g=1, core_g_=2, torso_=None, head_=None, arch_=None, armL_=None, armR_=None, legs_=None, flare=0, flash=0.0, extra=None):
    t = torso_ or {}
    p = {
        'arch': dict(arch_ or {}, glow=arch_g),
        'torso_ext': dict(t),
        'legs': dict(legs_ or {}, glow=lines),
        'torso': dict(t, glow=lines),
        'core': dict(t, glow=core_g_),
        'head': dict(head_ or {}, glow=lines),
        'armL': dict(armL_ or {}, glow=lines),
        'armR': dict(armR_ or {}, glow=lines),
    }
    if extra:
        p.update(extra)
    p['_flare'] = flare
    p['_flash'] = flash
    return p


def mv(dx=0, dy=0, angle=0, **k):
    return dict(dx=dx, dy=dy, angle=angle, **k)


POSES = {
    'idle_a': pose(1, 1, 2),
    'idle_b': pose(1, 1, 3, torso_=mv(0, -9), head_=mv(0, -13), arch_=mv(0, -10), armL_=mv(0, -9, 1.5), armR_=mv(0, -9, -1.5)),
    # charge tell: arch lifts, core flares, right (party-side) arm rises, weight shifts back
    'anticipation': pose(2, 3, 3, torso_=mv(-14, -9), head_=mv(-14, -12), arch_=mv(-6, -34), armL_=mv(-14, -9, 6), armR_=mv(-14, -9, 78), flare=1),
    'charge': pose(3, 3, 3, torso_=mv(-24, -14), head_=mv(-24, -18), arch_=mv(-10, -52, 2), armL_=mv(-24, -14, 10), armR_=mv(-24, -14, 150), flare=2),
    'attack': pose(2, 2, 2, torso_=mv(34, 22), head_=mv(34, 30), arch_=mv(16, -14, -3), armL_=mv(34, 22, -12), armR_=mv(34, 22, 52)),
    'followthrough': pose(2, 1, 1, torso_=mv(44, 30), head_=mv(48, 42), arch_=mv(22, -4, -4), armL_=mv(44, 30, -16), armR_=mv(44, 30, 28)),
    'recovery': pose(1, 1, 2, torso_=mv(16, 10), head_=mv(16, 12), arch_=mv(8, 0), armL_=mv(16, 10, -4), armR_=mv(16, 10, 10)),
    # defence: both fists up across the chest, core covered
    'guard': pose(1, 1, 1, torso_=mv(10, 14), head_=mv(14, 20), arch_=mv(0, -6), armL_=mv(10, 14, 100), armR_=mv(10, 14, -100)),
    # temporal turn-shift: arch tilts and drifts, arms open, everything ember-bright
    'special': pose(3, 3, 3, torso_=mv(0, -22), head_=mv(0, -30), arch_=mv(26, -64, 13), armL_=mv(0, -22, -28), armR_=mv(0, -22, 28), flare=2),
    'hit_recoil': pose(0, 0, 0, torso_=mv(-34, 4), head_=mv(-52, 24, 4), arch_=mv(-30, 10, 2), armL_=mv(-34, 4, 6), armR_=mv(-34, 4, -4), flash=0.2),
    'hit_recover': pose(1, 1, 1, torso_=mv(-14, 2), head_=mv(-20, 10), arch_=mv(-12, 4), armL_=mv(-14, 2, 3), armR_=mv(-14, 2, -2)),
    'death_start': pose(0, 0, 0, torso_=mv(-56, 46), head_=mv(-96, 90, 14), arch_=mv(-30, 40, 5), armL_=mv(-56, 46, 14), armR_=mv(-56, 46, -14), legs_=mv(0, 0)),
    'defeated': pose(0, 0, 0, torso_=mv(-30, 190, 0), head_=mv(-70, 215, 26), arch_=mv(150, 560, -52), armL_=mv(-30, 190, -22), armR_=mv(-30, 190, 22), legs_=mv(0, 0, 0, scale=0.8)),
}
DURATION = {'idle_a': 520, 'idle_b': 520, 'anticipation': 480, 'charge': 420, 'attack': 240, 'followthrough': 180, 'recovery': 420,
            'guard': 500, 'special': 620, 'hit_recoil': 220, 'hit_recover': 180, 'death_start': 320, 'defeated': 800}


def raw_frame(name):
    p = POSES[name]
    comp, wg = pup.render(p, grid)
    rgb_, opq, gcov, glev = pixelize(comp, wg, 0.45)
    return rgb_, opq, gcov, glev, p


def build():
    rgb0, op0, _, _, _ = raw_frame('idle_a')
    pix = boost(rgb0)[op0]
    pal_rgb = kmeans_palette(pix, 22)
    pal = Palette(pal_rgb, glow_rgb=[(0x8a, 0x3a, 0x16), (0xe0, 0x7a, 0x1c), (0xff, 0xc2, 0x3c), (0xff, 0xf0, 0xa8)])
    frames = {}
    for name in POSES:
        rgb_, opq, gcov, glev, p = raw_frame(name)
        rgb_ = boost(rgb_)
        if p['_flash']:
            rgb_ = np.clip(rgb_.astype(np.float32) * (1 - p['_flash']) + 255 * p['_flash'], 0, 255).astype(np.uint8)
        opq = fill_pinholes(opq)
        idx = np.where(opq, pal.quantize(rgb_), -1).astype(np.int16)
        gi = glow_indices(gcov, glev, opq, pal, 0.2)
        if p['_flare']:
            # core flare: widen the glow of the core ring by 1 px per step inside the chest disc
            cy_, cx_ = ((510 - oy + P) * S, (655 - ox + P) * S)
            yy_, xx_ = np.mgrid[0:FH, 0:FW]
            disc = ((yy_ - cy_) ** 2 + (xx_ - cx_) ** 2) < (15.5 * 1.0) ** 2
            gm = gi >= 0
            for _ in range(p['_flare']):
                gm = ndi.binary_dilation(gm & disc, structure=np.ones((3, 3), bool)) & opq | gm
            top = pal.glow_idx[3]
            fl = gm & (gi < 0) & disc
            gi[fl] = top if p['_flare'] > 1 else pal.glow_idx[2]
        idx = np.where(gi >= 0, gi, idx)
        frames[name] = finish(idx, pal, 5)
    return frames, pal


if __name__ == '__main__':
    frames, pal = build()
    meta = {
        'entity_id': 'B03', 'status': 'NEEDS_REVIEW', 'facing': 'front',
        'source': 'assets/bosses/B03_Chronolith/B03_NEW_CONCEPT_DRAFT.png',
        'foot_pivot': list(PIVOT),
        'notes': 'DRAFT / NEEDS_REVIEW. Official concept pixelized (area average, one closed palette, 1 px plum outline) and re-posed as a paper-doll '
                 '(arch, head, torso, core, two arms, legs; legs fixed except death). Every frame is a re-pose of the same drawing; core/arch glow uses a '
                 '4-step ember ramp. Needs an artist redraw. Script: web/scripts/battle-art/build_b03.py.',
    }
    write_atlas('B03_BATTLE_V1', frames, FW, FH, pal, meta, {'frame_key': 'attack', 'index_0_based': list(frames).index('attack')}, DURATION, PIVOT)
    contact_sheet('B03_BATTLE_V1', frames, FW, FH, pal, scale=2, cols=5)
    print('B03 ok', len(frames), 'frames, palette', len(pal.arr))
