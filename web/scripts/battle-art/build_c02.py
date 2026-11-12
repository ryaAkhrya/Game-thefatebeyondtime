#!/usr/bin/env python
"""
build_c02.py -- Phase 7 battle atlas C02_BATTLE_V1 for Velthia (Queen, hand-caster, NO weapon, no staff).

STATUS: DRAFT / NEEDS_REVIEW. Source: assets/characters/C02_Velthia/C02_TURNAROUND_SIDE.png (official turnaround, unchanged).
Paper-doll puppet of the side view (base dress+cape / bust overlay / head / forearm+hand / far hand / procedural sleeve tube) posed at
high resolution, mirrored so she FACES LEFT (party side of the battle stage), area-averaged to a 116x112 grid, one closed palette,
1 px plum outline.  Hands are scaled up 1.2-1.3x in cast poses so they read at 1 px = 10 source px.  No weapon is drawn anywhere.
Needs an artist redraw; the mirror reverses the source light direction.

Run:  python -I web/scripts/battle-art/build_c02.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from bakit import *

SRC = os.path.join(REPO, 'assets', 'characters', 'C02_Velthia', 'C02_TURNAROUND_SIDE.png')
FW, FH = 116, 112
S = 0.10
PIVOT = (58, 108)
BOOT_X = 230.0
ELBOW = (228.0, 455.0)
FEET = (230.0, 1005.0)

cv = Canvas(370, 1017, 700)
src = cv.load(SRC)
P = cv.pad
al = src[..., 3]
op = ndi.binary_erosion(al > 0.5, iterations=1)
rgb = np.clip(np.where(al[..., None] > 0.01, src[..., :3] / np.maximum(al[..., None], 1e-4), 0), 0, 1)
base_full = np.concatenate([rgb * op[..., None], op[..., None].astype(np.float32)], -1).astype(np.float32)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
lum = 0.299 * r + 0.587 * g + 0.114 * b
skin = (r > 0.55) & (r > g) & (g > b) & (r - b > 0.1) & (lum > 0.45)
gold = (r > 0.55) & (g > 0.35) & (b < 0.42) & (r > b + 0.25)

yy, xx = np.mgrid[0:cv.H, 0:cv.W]
X, Y = xx - P, yy - P

# ---------------------------------------------------------------- parts
head_m = op & cv.poly_mask([[(90, 0), (290, 0), (290, 148), (150, 150), (90, 140)]])
neck_dup = op & (X >= 188) & (X <= 242) & (Y >= 126) & (Y < 150)
sleeve_m = op & cv.poly_mask([[(208, 452), (248, 452), (247, 498), (213, 498)]])
hand_m = op & cv.poly_mask([[(213, 495), (258, 495), (260, 572), (213, 572)]]) & (skin | gold)
hand_m = ndi.binary_closing(hand_m, structure=np.ones((3, 3), bool), iterations=2) & op & cv.poly_mask([[(213, 495), (258, 495), (260, 572), (213, 572)]])
fore_m = sleeve_m | hand_m
bust_m = op & ~head_m & (Y >= 148) & (Y < 345)

base_valid = op & ~head_m & ~fore_m
base_arr = nearest_fill(cut(base_full, base_valid | neck_dup), base_valid, ndi.binary_dilation(fore_m, iterations=2) & op & ~base_valid, shade=0.95)
base_arr = cut(base_arr, (base_valid | neck_dup | (fore_m)))

plum = np.median(rgb[600:700, 120:200][op[600:700, 120:200]], 0)
plum_dark = plum * 0.72

pup = Puppet(cv)
pup.add('base', base_arr, FEET)
pup.add('bust', cut(base_full, bust_m), (230, 345))
pup.add('head', cut(base_full, head_m), (205, 145))
fore = cut(base_full, fore_m)
fore2 = fore.copy()
fore2[..., :3] *= 0.82
pup.add('forearm2', fore2, ELBOW)
pup.add('forearm', fore, ELBOW)
pup.hidden_default = {'forearm2'}


def tube_part(dx, dy, w_a=24, w_e=15):
    """Procedural sleeve (plum, darker underside) from the hem cuff to the raised elbow; no new design elements."""
    a = (228.0, 466.0)
    e = (ELBOW[0] + dx, ELBOW[1] + dy + 6)
    ang = np.arctan2(e[1] - a[1], e[0] - a[0])
    nx, ny = -np.sin(ang), np.cos(ang)
    quad = [(a[0] + nx * w_a, a[1] + ny * w_a), (e[0] + nx * w_e, e[1] + ny * w_e), (e[0] - nx * w_e, e[1] - ny * w_e), (a[0] - nx * w_a, a[1] - ny * w_a)]
    im = Image.new('L', (cv.W, cv.H), 0)
    ImageDraw.Draw(im).polygon([(x + P, y + P) for x, y in quad], fill=255)
    m = np.array(im) > 127
    arr = np.zeros((cv.H, cv.W, 4), np.float32)
    arr[m, :3] = plum
    arr[m, 3] = 1
    # underside strip (side facing the body)
    im2 = Image.new('L', (cv.W, cv.H), 0)
    q2 = [(a[0] - nx * w_a, a[1] - ny * w_a), (e[0] - nx * w_e, e[1] - ny * w_e), (e[0] - nx * w_e * 0.2, e[1] - ny * w_e * 0.2), (a[0] - nx * w_a * 0.2, a[1] - ny * w_a * 0.2)]
    ImageDraw.Draw(im2).polygon([(x + P, y + P) for x, y in q2], fill=255)
    m2 = (np.array(im2) > 127) & m
    arr[m2, :3] = plum_dark
    return arr


ys, xs = np.where(op)
ox = (BOOT_X + P) - (FW - PIVOT[0]) / S          # unflipped frame x of the boot centre = FW - PIVOT.x
FOOT_EDGE = float(ys.max() + 1 - P)
oy = (FOOT_EDGE + P) - PIVOT[1] / S
grid = Grid(FW, FH, S, ox, oy)


def mv(dx=0, dy=0, angle=0, scale=1.0):
    return dict(dx=dx, dy=dy, angle=angle, scale=scale)


def pose(bust=None, head=None, fore=None, fore2=None, tube=None, group=None, flash=0.0, align=None):
    p = {'bust': dict(bust or {}), 'head': dict(head or {}), 'forearm': dict(fore or {}), '_group': group, '_flash': flash, '_tube': tube, '_align': align}
    if fore2 is not None:
        p['forearm2'] = dict(fore2)
    return p


def lean(a):
    return dict(angle=a, dx=0, dy=0, pivot=FEET)


POSES = {
    'idle_a': pose(),
    'idle_b': pose(bust=mv(0, -11), head=mv(0, -15), fore=mv(0, -2, -3)),
    # palm opens: forearm lifts forward from the sleeve
    'anticipation': pose(bust=mv(-3, -3), head=mv(-3, -4, 2), fore=mv(10, -42, 58, 1.15), tube=(10, -42)),
    # release: arm extended forward, hand scaled up for readability, body leans in
    'cast': pose(head=mv(2, 0, -2), fore=mv(24, -80, 100, 1.28), tube=(24, -80), group=lean(-3)),
    # both hands together at the chest, raised
    'heal': pose(head=mv(0, -4, 3), fore=mv(16, -128, 160, 1.28), fore2=mv(30, -122, 150, 1.2), tube=(16, -128), group=lean(0)),
    # warding sweep: near arm high and forward, far arm swept low
    'shield': pose(head=mv(2, 0, -3), fore=mv(34, -146, 112, 1.28), fore2=mv(8, -62, 66, 1.2), tube=(34, -146), group=lean(-4)),
    # nature call: both arms raised, head tilts back
    'summon': pose(bust=mv(0, -9), head=mv(-4, -12, 7), fore=mv(44, -206, 172, 1.3), fore2=mv(22, -198, 186, 1.25), tube=(44, -206), group=lean(1.5)),
    'followthrough': pose(head=mv(1, 0, -1), fore=mv(20, -56, 82, 1.2), tube=(20, -56), group=lean(-2)),
    'recovery': pose(fore=mv(6, -18, 30, 1.05), tube=(6, -18)),
    'hit_recoil': pose(head=mv(-6, 2, 11), fore=mv(0, 0, -26), group=lean(8), flash=0.08),
    'hit_recover': pose(head=mv(-3, 1, 5), fore=mv(0, 0, -9), group=lean(3)),
    'death_start': pose(head=mv(-10, 4, 18), fore=mv(0, 0, -38), group=lean(28)),
    'defeated': pose(head=mv(-10, 4, 14), fore=mv(0, 0, -30), group=dict(angle=80, dx=510, dy=-200, pivot=FEET), align='lie'),
}
DURATION = {'idle_a': 700, 'idle_b': 700, 'anticipation': 300, 'cast': 280, 'heal': 380, 'shield': 360, 'summon': 420, 'followthrough': 180,
            'recovery': 300, 'hit_recoil': 220, 'hit_recover': 180, 'death_start': 300, 'defeated': 700, 'attack': 280}


def make_puppet(p):
    if not p['_tube']:
        return pup
    q = Puppet(cv)
    q.hidden_default = pup.hidden_default
    q.parts = list(pup.parts)
    t = tube_part(*p['_tube'])
    tmp = Puppet(cv)
    tmp.add('tube', t, ELBOW)
    i = [n for n, *_ in q.parts].index('forearm')
    q.parts.insert(i, tmp.parts[0])
    return q


def raw_frame(name):
    p = POSES[name]
    q = make_puppet(p)
    if p['_group']:
        comp, wg = render_group(q, p, grid, p['_group'])
    else:
        comp, wg = q.render(p, grid)
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
    pal = Palette(kmeans_palette(boost(rgb0, 1.05, 1.1)[op0], 26))
    frames = {}
    for name in POSES:
        rgb_, opq, p = raw_frame(name)
        rgb_ = boost(rgb_, 1.05, 1.1)
        if p['_flash']:
            rgb_ = np.clip(rgb_.astype(np.float32) * (1 - p['_flash']) + 255 * p['_flash'], 0, 255).astype(np.uint8)
        opq = fill_pinholes(opq)
        idx = np.where(opq, pal.quantize(rgb_), -1).astype(np.int16)
        idx = drop_small(clean_noise(idx), 4)
        idx = np.fliplr(idx).copy()                       # mirror: she faces left
        rows = np.where((idx >= 0).any(1))[0]
        idx = shift(idx, 0, (PIVOT[1] - 1) - int(rows.max()))
        if p['_align'] == 'lie':
            cols = np.where((idx >= 0).any(0))[0]
            idx = shift(idx, 5 - int(cols.min()), 0)
        frames[name] = finish(idx, pal, 1)
    return frames, pal


if __name__ == '__main__':
    frames, pal = build()
    meta = {
        'entity_id': 'C02', 'status': 'NEEDS_REVIEW', 'facing': 'left',
        'source': 'assets/characters/C02_Velthia/C02_TURNAROUND_SIDE.png', 'foot_pivot': list(PIVOT),
        'notes': 'DRAFT / NEEDS_REVIEW. Official side turnaround pixelized, mirrored (faces left) and re-posed as a paper-doll (dress, bust, head, forearm+hand, '
                 'far hand, procedural sleeve tube). No weapon or staff. Hands scaled 1.2-1.3x in cast poses. attack is an alias of cast. '
                 'Every frame is a re-pose of the same drawing; needs an artist redraw. Script: web/scripts/battle-art/build_c02.py.',
    }
    write_atlas('C02_BATTLE_V1', frames, FW, FH, pal, meta, {'frame_key': 'cast', 'index_0_based': list(frames).index('cast')}, DURATION, PIVOT, aliases={'attack': 'cast'})
    contact_sheet('C02_BATTLE_V1', frames, FW, FH, pal, scale=3, cols=5)
    print('C02 ok', len(frames), 'frames, palette', len(pal.arr))
