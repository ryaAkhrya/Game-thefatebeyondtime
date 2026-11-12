#!/usr/bin/env python
"""
build_b04.py -- Phase 8 battle atlas B04_BATTLE_V1 for Varlgrim (C04 / B04, the Warden: old bearded man, dark guard coat + plum cloak,
heavy TWISTED WOODEN STAFF with a crook, red ribbon and a gold pendant -- NOT an hourglass).

STATUS: DRAFT / NEEDS_REVIEW. Sources (official, unchanged):
  assets/characters/C04_Varlgrim/C04_TURNAROUND_SIDE.png   (body / head / near forearm+fist)
  assets/characters/C04_Varlgrim/C04_WEAPON_WOODEN_STAFF.png (staff, scaled to ~1.05x body height)
Paper-doll puppet posed at high resolution, NOT mirrored: he FACES RIGHT (toward the party; enemies stand on the left of the stage), area-averaged to a 208x176 grid,
one closed palette (k-means + 1 outline), 1 px plum outline.  Every pose is a re-pose of the same drawing (kneel = lowered body +
rotated rear boot); the cast pose uses a darkened copy of the single fist as the far hand.  Needs an artist redraw.

Run:  python -I web/scripts/battle-art/build_b04.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
import bakit
from bakit import *

bakit.SHEETS = os.path.join(REPO, 'docs', 'production', 'sprint4', 'battle-contact-sheets')
os.makedirs(bakit.SHEETS, exist_ok=True)

SRC = os.path.join(REPO, 'assets', 'characters', 'C04_Varlgrim', 'C04_TURNAROUND_SIDE.png')
WPN = os.path.join(REPO, 'assets', 'characters', 'C04_Varlgrim', 'C04_WEAPON_WOODEN_STAFF.png')
FW, FH = 208, 176
S = 0.1215                      # frame px per source px (body 987 src px -> ~120 px)
PIVOT = (88, 171)
BOOT_X = 175.0
STAFF_SCALE = 0.486             # 2133 px staff -> 1036 src px (~1.05 x body)
GRIP0 = (180.0, 548.0)          # fist centre in the source; staff axis passes through here in the rest placement
ELBOW = (175.0, 455.0)
FIST = (178.0, 545.0)
SHOULDER = (190.0, 270.0)
FEET_Y = 987.0

cv = Canvas(279, 990, 900)
src = cv.load(SRC)
P = cv.pad
al = src[..., 3]
op = ndi.binary_erosion(al > 0.5, iterations=1)
rgb = np.clip(np.where(al[..., None] > 0.01, src[..., :3] / np.maximum(al[..., None], 1e-4), 0), 0, 1)
base_full = np.concatenate([rgb * op[..., None], op[..., None].astype(np.float32)], -1).astype(np.float32)

yy, xx = np.mgrid[0:cv.H, 0:cv.W]
X, Y = xx - P, yy - P

# ---------------------------------------------------------------- parts from the turnaround
head_m = op & cv.poly_mask([[(40, 0), (290, 0), (290, 146), (215, 150), (150, 150), (120, 176), (60, 196), (40, 190)]])
neck_dup = op & (X >= 185) & (X <= 250) & (Y >= 124) & (Y < 150)
fore_poly = cv.poly_mask([[(148, 455), (210, 450), (212, 582), (148, 584)]])
fore_m = op & fore_poly
legs_m = op & (Y >= 866)
bust_m = op & ~head_m & ~fore_m & (Y >= 148) & (Y < 430)
body_valid = op & ~head_m & ~fore_m & ~legs_m
base_arr = nearest_fill(cut(base_full, body_valid | neck_dup), body_valid, ndi.binary_dilation(fore_m, iterations=3) & op & ~body_valid & ~legs_m, shade=0.95)
base_arr = cut(base_arr, body_valid | neck_dup | (ndi.binary_dilation(fore_m, iterations=3) & op & ~legs_m))
# fill below the front hem so a lowered body never shows a flat cut: duplicate the last few hem rows downwards? (not needed: boots stay behind)

sleeve_col = np.median(rgb[P + 440:P + 452, P + 160:P + 196][op[P + 440:P + 452, P + 160:P + 196]], 0)
sleeve_dark = sleeve_col * 0.72

# ---------------------------------------------------------------- staff (own source image, not a crop of a reference)
w_im = Image.open(WPN).convert('RGBA')
wa = np.array(w_im)
new_w, new_h = int(round(w_im.width * STAFF_SCALE)), int(round(w_im.height * STAFF_SCALE))
w_small = w_im.resize((new_w, new_h), Image.LANCZOS)
wsm = np.array(w_small, np.float32) / 255.0
wsm[..., 3] = (wsm[..., 3] > 0.5).astype(np.float32)
wsm[..., :3] *= wsm[..., 3:4]
wys, wxs = np.where(wsm[..., 3] > 0)
w_bottom = wys.max()
# shaft centre at the grip row: wood pixels only (exclude red ribbon / gold pendant)
grip_row_small = w_bottom - (FEET_Y - GRIP0[1])
rows = slice(int(grip_row_small) - 10, int(grip_row_small) + 10)
sub = wsm[rows]
r_, g_, b_ = sub[..., 0], sub[..., 1], sub[..., 2]
wood = (sub[..., 3] > 0) & ~((r_ > 1.6 * g_) & (r_ > 0.3))
cx = np.where(wood)[1].mean() if wood.any() else new_w / 2
staff_full = np.zeros((cv.H, cv.W, 4), np.float32)
# place: shaft centre -> x = GRIP0.x, staff butt -> y = FEET_Y
ox_w = int(round(GRIP0[0] - cx)) + P
oy_w = int(round(FEET_Y - (w_bottom + 1))) + P
staff_full[oy_w:oy_w + new_h, ox_w:ox_w + new_w] = wsm
STAFF_ROW_TOP = FEET_Y - w_bottom      # source y of the staff top (negative = above the head)

pup_base_parts = []


def build_puppet(extra_far=None):
    q = Puppet(cv)
    q.add('legs_rear', cut(base_full, legs_m), (BOOT_X, 870.0))
    q.add('legs', cut(base_full, legs_m), (BOOT_X, FEET_Y))
    q.add('base', base_arr, (BOOT_X, FEET_Y))
    q.add('bust', cut(base_full, bust_m), (200, 430))
    q.add('head', cut(base_full, head_m), (205, 145))
    fore = cut(base_full, fore_m)
    fore2 = fore.copy(); fore2[..., :3] *= 0.8
    q.add('forearm2', fore2, ELBOW)
    q.add('staff', staff_full, GRIP0)
    q.add('forearm', fore, ELBOW)
    q.hidden_default = {'legs_rear', 'forearm2'}
    return q


pup = build_puppet()


def Rv(v, th):
    c, s_ = np.cos(np.deg2rad(th)), np.sin(np.deg2rad(th))
    return np.array([v[0] * c + v[1] * s_, -v[0] * s_ + v[1] * c])


def tube_part(a, e, w_a=30, w_e=22):
    ang = np.arctan2(e[1] - a[1], e[0] - a[0])
    nx, ny = -np.sin(ang), np.cos(ang)

    def poly(wa_, we_, off0, off1):
        return [(a[0] + nx * wa_ * off0, a[1] + ny * wa_ * off0), (e[0] + nx * we_ * off0, e[1] + ny * we_ * off0),
                (e[0] + nx * we_ * off1, e[1] + ny * we_ * off1), (a[0] + nx * wa_ * off1, a[1] + ny * wa_ * off1)]
    arr = np.zeros((cv.H, cv.W, 4), np.float32)
    for col, (o0, o1) in ((sleeve_col, (-1, 1)), (sleeve_dark, (-1, -0.25))):
        im = Image.new('L', (cv.W, cv.H), 0)
        ImageDraw.Draw(im).polygon([(x + P, y + P) for x, y in poly(w_a, w_e, o0, o1)], fill=255)
        m = np.array(im) > 127
        arr[m, :3] = col
        arr[m, 3] = 1
    return arr


def limb(grip, fore_scale=1.2, shoulder=SHOULDER):
    """Place the near fist at `grip`; forearm points shoulder->grip; returns (forearm tf, tube array or None)."""
    d = np.array(grip, float) - np.array(shoulder)
    u = d / np.linalg.norm(d)
    th = float(np.degrees(np.arctan2(u[0], u[1])))
    fv = Rv((FIST[0] - ELBOW[0], FIST[1] - ELBOW[1]), th) * fore_scale
    e_new = np.array(grip) - fv
    tf = dict(angle=th, dx=float(e_new[0] - ELBOW[0]), dy=float(e_new[1] - ELBOW[1]), scale=fore_scale)
    return tf, tube_part(shoulder, e_new)


def staff_tf(grip, theta, slide=0.0):
    """Staff rotated by theta (+ = CCW on screen = top moves BACK in the right-facing source) so the axis point `slide` px below the
    rest grip sits on `grip`."""
    d = np.array(grip, float) - np.array(GRIP0) - Rv((0, slide), theta)
    return dict(angle=theta, dx=float(d[0]), dy=float(d[1]))


def mv(dx=0, dy=0, angle=0, scale=1.0):
    return dict(dx=dx, dy=dy, angle=angle, scale=scale)


def pose(grip=(192, 548), theta=0.0, slide=0.0, bust=None, head=None, group=None, flash=0.0, arm_scale=1.2, body_dy=0.0,
         rear_boot=False, far=None, force_tube=False, legs=None, base_extra=None):
    p = {'staff': staff_tf(grip, theta, slide), '_group': group, '_flash': flash, '_far': far}
    p['bust'] = dict(bust or {})
    p['head'] = dict(head or {})
    p['base'] = dict(base_extra or {})
    if body_dy:
        for k in ('base', 'bust', 'head'):
            q = dict(p[k]); q['dy'] = q.get('dy', 0) + body_dy; p[k] = q
    p['legs'] = dict(legs or {})
    idle_hand = abs(grip[0] - FIST[0]) < 22 and abs(grip[1] - FIST[1]) < 40 and not force_tube
    if idle_hand and not body_dy:
        p['forearm'] = dict(dx=grip[0] - FIST[0], dy=grip[1] - FIST[1], angle=0, scale=1.0)
        p['_tube'] = None
    else:
        shoulder = (SHOULDER[0], SHOULDER[1] + body_dy)
        tf, tube = limb(grip, arm_scale, shoulder)
        p['forearm'] = tf
        p['_tube'] = (tube, shoulder)
    if rear_boot:
        p['legs_rear'] = rear_boot
    if far:
        tf2, tube2 = limb(far, 1.25, (SHOULDER[0] - 6, SHOULDER[1] + body_dy))
        p['forearm2'] = tf2
        p['_tube2'] = tube2
    return p


def lean(a, dx=0, dy=0):
    return dict(angle=a, dx=dx, dy=dy, pivot=(BOOT_X, FEET_Y))


# kneeling rear boot: shin lies along the ground behind (rotated about the ankle, pushed behind the body)
KNEEL_REAR = dict(angle=-84, dx=-40, dy=60)
KNEEL_REAR_B = dict(angle=-84, dx=-60, dy=60)

POSES = {
    'idle_a': pose(grip=(322, 548), theta=-9, force_tube=True),
    'idle_b': pose(grip=(322, 548), theta=-9, force_tube=True, bust=mv(0, -6), head=mv(0, -9, 1)),
    # tell: staff drawn back and lifted, body leans away
    'anticipation': pose(grip=(168, 470), theta=34, slide=-40, bust=mv(-4, -3, 3), head=mv(-6, -4, 4), group=lean(3.5), force_tube=True),
    # strike: staff driven forward/down, body forward
    'attack': pose(grip=(232, 505), theta=-78, slide=-60, bust=mv(5, 2, -2), head=mv(8, 4, -4), group=lean(-5), force_tube=True),
    # staff crook lands on the ground ahead
    'followthrough': pose(grip=(244, 650), theta=-112, slide=-60, bust=mv(10, 8, -5), head=mv(16, 10, -8), group=lean(-8), force_tube=True),
    'recovery': pose(grip=(250, 560), theta=-32, slide=-30, bust=mv(3, 2, -1), head=mv(3, 3, -2), group=lean(-2), force_tube=True),
    'hit_recoil': pose(grip=(298, 548), theta=-1, bust=mv(-10, 0, 6), head=mv(-18, 6, 14), group=lean(7), flash=0.08, force_tube=True),
    'hit_recover': pose(grip=(310, 548), theta=-5, bust=mv(-4, 0, 3), head=mv(-8, 3, 6), group=lean(2.5), force_tube=True),
    # buckling: body sinks onto one knee, staff takes the weight
    'death_start': pose(grip=(326, 620), theta=-6, body_dy=60, bust=mv(12, 0, -8), head=mv(20, 12, -16), rear_boot=KNEEL_REAR, force_tube=True),
    # kneeling on the staff, head bowed
    'defeated': pose(grip=(338, 735), theta=-4, body_dy=122, bust=mv(26, 12, -18), head=mv(46, 38, -38), rear_boot=KNEEL_REAR_B, force_tube=True),
    # staff driven down into the ground (time_bind / phase_shift)
    'plant': pose(grip=(336, 400), theta=-3, slide=150, bust=mv(14, 10, -8), head=mv(24, 14, -14), group=lean(-8), force_tube=True),
    # staff lifted to hold the sky (meteor_call / hold): arm up, head back
    'raise': pose(grip=(335, 115), theta=-14, slide=-120, bust=mv(-3, -10, 4), head=mv(-14, -16, 12), group=lean(3), force_tube=True, arm_scale=1.25),
    # distortion: staff planted, far hand thrust forward
    'cast': pose(grip=(322, 560), theta=-6, slide=0, bust=mv(3, 0, -2), head=mv(4, 0, -2), group=lean(-3), far=(440, 400), force_tube=True),
}
DURATION = {'idle_a': 720, 'idle_b': 720, 'anticipation': 360, 'attack': 260, 'followthrough': 190, 'recovery': 320, 'hit_recoil': 240,
            'hit_recover': 190, 'death_start': 340, 'defeated': 800, 'plant': 420, 'raise': 520, 'cast': 340}


def make_puppet(p):
    q = Puppet(cv)
    q.hidden_default = pup.hidden_default
    q.parts = []
    for part in pup.parts:
        name = part[0]
        if name == 'forearm2':
            if p.get('_tube'):
                t = Puppet(cv); t.add('tube', p['_tube'][0], ELBOW)
                q.parts.append(t.parts[0])
            if p.get('_far'):
                t2 = Puppet(cv); t2.add('tube2', p['_tube2'], ELBOW)
                q.parts.append(t2.parts[0])
        q.parts.append(part)
    return q


def raw_frame(name):
    p = POSES[name]
    q = make_puppet(p)
    pp = {k: v for k, v in p.items() if not k.startswith('_')}
    if 'forearm2' in pp:
        pp['forearm2'] = p['forearm2']
    if p['_group']:
        comp, wg = render_group(q, pp, grid, p['_group'])
    else:
        comp, wg = q.render(pp, grid)
    rgb_, opq, _, _ = pixelize(comp, wg, 0.45)
    return rgb_, opq, p


ys, xs = np.where(op)
ox = (BOOT_X + P) - PIVOT[0] / S
FOOT_EDGE = float(ys.max() + 1 - P)
oy = (FOOT_EDGE + P) - PIVOT[1] / S
grid = Grid(FW, FH, S, ox, oy)


def shift(idx, dx, dy):
    out = np.full_like(idx, -1)
    h, w = idx.shape
    ys0, ys1 = max(0, dy), min(h, h + dy)
    xs0, xs1 = max(0, dx), min(w, w + dx)
    out[ys0:ys1, xs0:xs1] = idx[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out


def build():
    rgb0, op0, _ = raw_frame('idle_a')
    pal = Palette(kmeans_palette(boost(rgb0, 1.1, 1.12)[op0], 29))
    frames = {}
    for name in POSES:
        rgb_, opq, p = raw_frame(name)
        rgb_ = boost(rgb_, 1.1, 1.12)
        if p['_flash']:
            rgb_ = np.clip(rgb_.astype(np.float32) * (1 - p['_flash']) + 255 * p['_flash'], 0, 255).astype(np.uint8)
        opq = fill_pinholes(opq)
        idx = np.where(opq, pal.quantize(rgb_), -1).astype(np.int16)
        idx = drop_small(clean_noise(idx), 4)
        # NOT mirrored: the official side view faces right = toward the party (enemies stand on the left of the stage)
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
        'entity_id': 'B04', 'character_id': 'C04', 'status': 'NEEDS_REVIEW', 'facing': 'right',
        'source': 'assets/characters/C04_Varlgrim/C04_TURNAROUND_SIDE.png + C04_WEAPON_WOODEN_STAFF.png', 'foot_pivot': list(PIVOT),
        'special_frames': {'plant': 'tongkat ditanam (time_bind/phase_shift)', 'raise': 'tongkat diangkat, menahan langit (meteor_call/hold)',
                           'cast': 'tangan terulur, tongkat tertanam (distortion_wave/seal_pulse)'},
        'notes': 'DRAFT / NEEDS_REVIEW. Official side turnaround + wooden-staff drawing pixelized (faces RIGHT as in the source: the enemy side of the stage faces the party) and re-posed as a paper-doll '
                 '(legs, cloak/coat, bust, head, forearm+fist, procedural sleeve tube, staff). Kneeling = lowered body + rotated rear boot; cast uses a darkened copy of the one fist '
                 'as the far hand. attack/followthrough are staff swings about the grip. Every frame is a re-pose of the same drawing; needs an artist redraw. '
                 'Script: web/scripts/battle-art/build_b04.py.',
    }
    write_atlas('B04_BATTLE_V1', frames, FW, FH, pal, meta, {'frame_key': 'attack', 'index_0_based': list(frames).index('attack')}, DURATION, PIVOT,
                aliases={})
    contact_sheet('B04_BATTLE_V1', frames, FW, FH, pal, scale=2, cols=5)
    print('B04 ok', len(frames), 'frames, palette', len(pal.arr))
