#!/usr/bin/env python
"""
author-mournfang.py  --  Polish Sprint 2: battle atlas V4 for boss B01 Mournfang.

STATUS: DRAFT / NEEDS_REVIEW.  "Controlled pixelization of the approved concept,
needs artist cleanup."  Nothing here is hand-painted from scratch; the monster
is the official design (assets/bosses/B01_Mournfang/B01_NEW_CONCEPT_DRAFT.png)
reduced to a 1-px grid, quantized to a fixed 28 colour palette, outlined, and
split into layers (body / head+antlers) which are recomposited with whole-pixel
offsets, row shears and row deletions (no arbitrary rotation, no scaling in
animation, no blur, no glow).  A few deliberate pixel edits (eye, debris
removal, fang accents) are listed in the HAND_EDITS section below.

Run (deterministic, no randomness, no network):
    python -I web/scripts/author-mournfang.py
Needs: Python 3, Pillow, numpy, scipy (all present on the dev machine; none are
added to web/package.json).  Writes
    web/public/assets/battle/B01_BATTLE_V4.png
    web/public/assets/battle/B01_BATTLE_V4.json
and debug sheets into .dev-cache/temp/mournfang/ (not shipped).

Atlas: one row of 10 frames, 160x128 each, facing RIGHT, foot pivot identical
for every frame.  The feet rows of the body layer are never moved, sheared or
deleted, so the bottom row of every frame is byte-identical.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
CONCEPT = os.path.join(REPO, 'assets', 'bosses', 'B01_Mournfang', 'B01_NEW_CONCEPT_DRAFT.png')
OUT_PNG = os.path.join(REPO, 'web', 'public', 'assets', 'battle', 'B01_BATTLE_V4.png')
OUT_JSON = os.path.join(REPO, 'web', 'public', 'assets', 'battle', 'B01_BATTLE_V4.json')
DBG = os.path.join(REPO, '.dev-cache', 'temp', 'mournfang')
os.makedirs(DBG, exist_ok=True)

FW, FH = 160, 128
# ---------------------------------------------------------------- palette (28)
PAL_HEX = {
    'ol': '1d1625',  # outline, deep plum (readable on brown ground AND green backdrop)
    # wood / bark (reddish so it separates from the tan ground)
    'w0': '2e1c26', 'w1': '46282c', 'w2': '5f3a35', 'w3': '7c4d3d', 'w4': '9b6648', 'w5': 'b98458',
    # mustard leaves
    'y0': '4f3f23', 'y1': '6f5a2a', 'y2': '8c6f30', 'y3': 'ad8138', 'y4': 'cf9c3f',
    # orange leaves
    'o0': '8a5420', 'o1': 'b9702c', 'o2': 'e0903a', 'o3': 'f2bc5a',
    # rust leaves / mushroom caps
    'r0': '6e2f2c', 'r1': '9a4733', 'r2': 'c0694a', 'm0': 'b03a2f', 'm1': 'e0583f',
    # bone
    'b0': '7a6455', 'b1': 'a98f79', 'b2': 'd4c1a3', 'b3': 'f1e6cc',
    # eye / mouth
    'e0': 'ff9a1f', 'e1': 'ffe28a',
}
PAL_KEYS = list(PAL_HEX.keys())
PAL = np.array([[int(PAL_HEX[k][i:i + 2], 16) for i in (0, 2, 4)] for k in PAL_KEYS], np.uint8)
IDX = {k: i for i, k in enumerate(PAL_KEYS)}
OL = IDX['ol']

# ------------------------------------------------------------ colour helpers
def srgb_to_lab(rgb):
    c = rgb.astype(np.float64) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[0.4124564, 0.3575761, 0.1804375],
                  [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


PAL_LAB = srgb_to_lab(PAL)


def quantize(rgb_u8):
    """Nearest palette index (CIE Lab, no dithering)."""
    lab = srgb_to_lab(rgb_u8)
    d = ((lab[..., None, :] - PAL_LAB) ** 2).sum(-1)
    # the outline colour is only produced by the outline pass / very dark pixels
    return d.argmin(-1)


def boost(rgb_u8, sat=1.0, contrast=1.22, pivot=105.0):
    """Mild saturation + contrast lift done on the *area-averaged* pixels (pre-quantize)."""
    f = rgb_u8.astype(np.float64)
    lum = f @ np.array([0.299, 0.587, 0.114])
    f = lum[..., None] + (f - lum[..., None]) * sat
    f = (f - pivot) * contrast + pivot
    return np.clip(f, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------- segmentation
def segment(rgb):
    """Beast vs dark vignette: gradient-magnitude (the concept has a clean ink outline all around,
    the background is a smooth halo) -> close -> fill small holes -> largest component."""
    f = rgb.astype(np.float32)
    g = np.stack([ndi.gaussian_filter(f[..., c], 1.2) for c in range(3)], -1)
    mags = []
    for c in range(3):
        gx = ndi.sobel(g[..., c], axis=1)
        gy = ndi.sobel(g[..., c], axis=0)
        mags.append(np.hypot(gx, gy))
    mag = np.max(mags, 0)
    e = mag > 55
    disk7 = np.hypot(*np.mgrid[-3:4, -3:4]) <= 3.5
    c = ndi.binary_closing(np.pad(e, 8), structure=disk7)[8:-8, 8:-8]
    inv = ~c
    lab, n = ndi.label(inv)
    sizes = ndi.sum(inv, lab, range(1, n + 1))
    coms = ndi.center_of_mass(inv, lab, range(1, n + 1))
    fill = np.zeros_like(c)
    for i, (s, cm) in enumerate(zip(sizes, coms), 1):
        if s < 6000 or (s < 90000 and cm[0] > 340):
            fill |= lab == i
    c = c | fill
    lab, n = ndi.label(c)
    sizes = ndi.sum(c, lab, range(1, n + 1))
    c = lab == (1 + int(np.argmax(sizes)))
    disk5 = np.hypot(*np.mgrid[-2:3, -2:3]) <= 2.5
    c = ndi.binary_opening(c, structure=disk5)
    return c




def nearest_fill(rgb, valid, region):
    """Fill `region` pixels with the colour of the nearest `valid` pixel (cheap deterministic inpaint),
    then soften slightly so the filled mane does not show hard streaks."""
    idx = ndi.distance_transform_edt(~valid, return_distances=False, return_indices=True)
    out = rgb.copy()
    filled = rgb[idx[0], idx[1]]
    out[region] = filled[region]
    sm = np.stack([ndi.uniform_filter(out[..., c].astype(np.float32), 9) for c in range(3)], -1)
    out[region] = np.clip(sm[region] * 0.9, 0, 255).astype(np.uint8)  # slightly darker, reads as shadowed neck
    return out


# ----------------------------------------------------------------- pixelizer
def area_resize(arr_f, box, size):
    """Area-average (PIL BOX) of a float HxWxC array over a float source box to `size` (w,h)."""
    chans = []
    for c in range(arr_f.shape[2]):
        im = Image.fromarray(arr_f[..., c].astype(np.float32), mode='F')
        chans.append(np.array(im.resize(size, Image.BOX, box=box), dtype=np.float32))
    return np.stack(chans, -1)


def pixelize_layer(rgb, mask, box, thr):
    """rgb u8 HxWx3, mask bool HxW, box = (x0,y0,x1,y1) source rectangle (float) -> (idx HxW int, alpha bool)."""
    h, w = mask.shape
    x0, y0, x1, y1 = box
    # pad so box may leave the image
    px0, py0 = int(np.floor(min(0, x0))) - 2, int(np.floor(min(0, y0))) - 2
    px1, py1 = int(np.ceil(max(w, x1))) + 2, int(np.ceil(max(h, y1))) + 2
    pw, ph = px1 - px0, py1 - py0
    m = np.zeros((ph, pw), np.float32)
    c = np.zeros((ph, pw, 3), np.float32)
    m[-py0:-py0 + h, -px0:-px0 + w] = mask
    c[-py0:-py0 + h, -px0:-px0 + w] = rgb * mask[..., None]
    stack = np.concatenate([c, m[..., None]], -1)
    out = area_resize(stack, (x0 - px0, y0 - py0, x1 - px0, y1 - py0), (FW, FH))
    cov = out[..., 3]
    col = out[..., :3] / np.maximum(cov[..., None], 1e-4)
    alpha = cov > thr
    idx = quantize(boost(np.clip(col, 0, 255).astype(np.uint8)))
    idx = np.where(alpha, idx, -1)
    return idx.astype(np.int16)


def drop_small(idx, min_px):
    """Remove 8-connected opaque islands smaller than min_px."""
    op = idx >= 0
    lab, n = ndi.label(op, structure=np.ones((3, 3)))
    if n == 0:
        return idx
    sizes = ndi.sum(op, lab, range(1, n + 1))
    out = idx.copy()
    for i, s in enumerate(sizes, 1):
        if s < min_px:
            out[lab == i] = -1
    return out


def clean_noise(idx):
    """Palette-aware majority cleanup: an opaque pixel whose 4 neighbours (>=3) all share another
    colour is replaced by it (removes 1-px salt-and-pepper from the averaging, keeps shapes)."""
    out = idx.copy()
    h, w = idx.shape
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            v = idx[y, x]
            if v < 0:
                continue
            nb = [idx[y - 1, x], idx[y + 1, x], idx[y, x - 1], idx[y, x + 1]]
            if all(n >= 0 for n in nb):
                for cand in set(nb):
                    if cand != v and nb.count(cand) >= 3:
                        out[y, x] = cand
                        break
    return out



# ---------------------------------------------------------------- layer split
# Concept-pixel coordinates (1536x1024).
# Antler layer: everything above the back-line polyline (antlers only; nothing else lives there).
ANTLER_LINE = [(0, 312), (500, 312), (700, 306), (800, 304), (900, 298), (1000, 296), (1050, 304), (1536, 312)]

# Bone polygons traced (by eye) on a 2x crop of the concept at (1020,200); coordinates are crop-2x pixels.
SK_ORG = (1020.0, 200.0)
BONE_POLYS = {
    'cranium': [(125, 115), (165, 165), (205, 205), (210, 140), (212, 95), (250, 100), (280, 140), (300, 155),
                (345, 150), (380, 175), (400, 195), (440, 210), (480, 228), (520, 232), (548, 265), (566, 310),
                (572, 345), (520, 330), (470, 325), (420, 320), (380, 310), (340, 320), (315, 335), (240, 322),
                (200, 300), (205, 255), (205, 210)],
    'blade': [(55, 388), (100, 366), (150, 332), (210, 312), (250, 322), (240, 352), (180, 366), (110, 396), (70, 394)],
    'strut': [(300, 320), (358, 318), (372, 340), (364, 400), (346, 442), (300, 432)],
    'jaw': [(262, 434), (300, 405), (335, 420), (348, 470), (400, 500), (470, 525), (500, 545), (494, 600),
            (476, 690), (466, 702), (440, 640), (420, 592), (385, 562), (330, 520), (290, 482)],
}
THROAT = [(240, 322), (330, 330), (336, 420), (300, 436), (262, 432), (238, 380)]
TONGUE = [(352, 418), (400, 406), (442, 432), (452, 466), (412, 478), (374, 452)]
SOCKET = [(246, 232), (262, 206), (300, 196), (334, 212), (344, 240), (326, 262), (290, 272), (258, 258)]
NOSTRIL = [(484, 238), (506, 232), (528, 248), (520, 268), (496, 262)]
# fangs: (base_left_x, base_right_x, base_y, tip_x, tip_y) in crop-2x coordinates (slightly exaggerated for legibility)
UP_FANGS = [(382, 420, 318, 400, 360), (420, 458, 320, 438, 368), (456, 498, 322, 478, 380), (498, 540, 326, 521, 396)]
BIG_FANG = [(528, 336), (574, 340), (566, 400), (548, 462), (536, 422)]
LOW_FANGS = [(352, 384, 480, 366, 446), (390, 422, 498, 404, 462), (428, 460, 512, 444, 478), (466, 498, 530, 482, 496)]

MOUTH_GAP = [(372, 342), (528, 336), (545, 420), (505, 522), (470, 528), (400, 502), (352, 474), (366, 400)]
EYE_C = (292, 236)  # crop-2x


def poly_mask(shape, polys):
    h, w = shape
    im = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(im)
    for p in polys:
        d.polygon([(float(x), float(y)) for x, y in p], fill=255)
    return np.array(im) > 0


def raster(polys, ss=8):
    """Anti-alias free polygon raster on the 160x128 grid (8x supersample, 50 % coverage)."""
    im = Image.new('L', (FW * ss, FH * ss), 0)
    d = ImageDraw.Draw(im)
    for p in polys:
        d.polygon([(x * ss, y * ss) for x, y in p], fill=255)
    a = np.array(im, np.float32).reshape(FH, ss, FW, ss).mean((1, 3)) / 255.0
    return a >= 0.5


def shift_arr(a, dx, dy, fill):
    out = np.full_like(a, fill)
    h, w = a.shape
    ys0, ys1 = max(0, dy), min(h, h + dy)
    xs0, xs1 = max(0, dx), min(w, w + dx)
    if ys1 > ys0 and xs1 > xs0:
        out[ys0:ys1, xs0:xs1] = a[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out


# --------------------------------------------------------------------- build
def build_layers():
    rgb = np.array(Image.open(CONCEPT).convert('RGB'))
    H, W = rgb.shape[:2]
    mask = segment(rgb)
    ys, xs = np.where(mask)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1

    S = 140.0 / (x1 - x0)             # concept px -> sprite px (body scale)
    OX = 4.0                           # sprite x of the concept bbox left edge (idle)
    OY = 124.0 - (y1 - y0) * S         # concept bbox bottom lands on sprite y=124 (outline row = 124)

    def body_box():
        return (x0 - OX / S, y0 - OY / S, x0 + (FW - OX) / S, y0 + (FH - OY) / S)

    yy, xx = np.mgrid[0:H, 0:W]
    ant_line = np.interp(xx, [p[0] for p in ANTLER_LINE], [p[1] for p in ANTLER_LINE])
    antler_mask = mask & (yy < ant_line)

    # skull zone (concept coords) -> removed from the body, region behind it is filled with neighbouring fur
    skull_c = poly_mask((H, W), [[(SK_ORG[0] + X / 2, SK_ORG[1] + Y / 2) for X, Y in p] for p in BONE_POLYS.values()])
    skull_zone = ndi.binary_dilation(skull_c, structure=np.hypot(*np.mgrid[-8:9, -8:9]) <= 8)
    body_mask = mask & ~antler_mask & ~skull_zone
    zone = mask & ~antler_mask & skull_zone
    body_rgb = nearest_fill(rgb, body_mask, zone)
    body_full = body_mask | zone
    body_idx = pixelize_layer(body_rgb, body_full, body_box(), 0.42)

    # antlers: slightly thickened so the thin branches survive the 1-px grid
    ant_thick = ndi.binary_dilation(antler_mask, structure=np.hypot(*np.mgrid[-3:4, -3:4]) <= 3) & (yy < ant_line + 6)
    ant_rgb = nearest_fill(rgb, antler_mask, ant_thick & ~antler_mask)
    antler_idx = pixelize_layer(ant_rgb, ant_thick, body_box(), 0.36)

    AX = (1090 - x0) * S + OX
    AY = (410 - y0) * S + OY
    HS = 1.35
    sh = S * HS

    def tf(p):
        return [(AX + (X / 2 - 70) * sh, AY + (Y / 2 - 210) * sh) for X, Y in p]

    body_idx = drop_small(clean_noise(body_idx), 10)      # HAND_EDIT: strip stray debris specks between the legs
    antler_idx = drop_small(antler_idx, 8)
    gap = raster([tf(MOUTH_GAP)])
    body_idx[gap] = -1
    antler_idx[gap] = -1
    skull_idx = draw_skull(tf, bone_dbg=None)
    info = dict(S=float(S), OX=OX, OY=float(OY), HS=HS, x0=int(x0), y0=int(y0), x1=int(x1), y1=int(y1),
                AX=float(AX), AY=float(AY))
    return body_idx, skull_idx, antler_idx, info


def draw_skull(tf, bone_dbg=None):
    """Traced redraw of the skull / jaw (the concept's most important read) on the 1-px grid."""
    idx = np.full((FH, FW), -1, np.int16)
    parts = {k: raster([tf(p)]) for k, p in BONE_POLYS.items()}
    bone = np.zeros((FH, FW), bool)
    for k in ('blade', 'cranium', 'strut', 'jaw'):
        bone |= parts[k]
    throat = raster([tf(THROAT)])
    idx[throat] = IDX['w1']
    # tongue (behind teeth, in front of throat)
    tongue = raster([tf(TONGUE)])
    idx[tongue] = IDX['r1']
    # bone with light from above-front: top edge b3, body b2, underside b1
    up = np.zeros_like(bone)
    up[1:] = bone[:-1]
    dn = np.zeros_like(bone)
    dn[:-1] = bone[1:]
    idx[bone] = IDX['b2']
    idx[bone & ~up] = IDX['b3']
    idx[bone & ~dn] = IDX['b1']
    # inner shading: second row under the top edge of the lower jaw and cranium underside
    dn2 = np.zeros_like(bone)
    dn2[:-2] = bone[2:]
    idx[bone & dn & ~dn2 & ~(~up)] = IDX['b1']
    # tongue darkening underside
    t_dn = np.zeros_like(tongue)
    t_dn[:-1] = tongue[1:]
    idx[tongue & ~t_dn & ~bone] = IDX['r0']
    # socket, eye, nostril
    sock = raster([tf(SOCKET)])
    idx[sock] = IDX['w0']
    ex, ey = tf([EYE_C])[0]
    exi, eyi = int(round(ex)), int(round(ey))
    for dx in (0, 1):
        for dy in (0, 1):
            idx[eyi - 1 + dy, exi - 1 + dx] = IDX['e0']
    idx[eyi - 1, exi - 1] = IDX['e1']
    nost = raster([tf(NOSTRIL)])
    idx[nost] = IDX['w0']
    # fangs: explicit pixel runs (2 px wide, 1 px gaps become outline); bone colour, left px lighter
    def fang(col, row, length, up=False, width=2):
        for r in range(length):
            w = width if r < length - 2 else 1
            y = row - r if up else row + r
            for k in range(w):
                idx[y, col + k] = IDX['b3'] if k == 0 else IDX['b2']
    cr = parts['cranium']
    def low_row(col):
        rows = np.where(cr[:, col])[0]
        return int(rows.max()) if len(rows) else None
    for col, ln in ((123, 4), (127, 5), (131, 4)):
        r = low_row(col)
        if r is not None:
            fang(col, r + 1, ln)
    # big curved tusk-fang at the snout front
    r0 = low_row(135) or 58
    for r in range(11):
        c0 = 134 + (0 if r < 4 else 1 if r < 8 else 2)
        w = 3 if r < 5 else 2 if r < 9 else 1
        for k in range(w):
            idx[r0 + 1 + r, c0 + k] = IDX['b3'] if k == 0 else IDX['b2']
    jw = parts['jaw']
    for col, ln in ((122, 3), (126, 3), (130, 3), (134, 3)):
        rows = np.where(jw[:, col])[0]
        if len(rows):
            fang(col, int(rows.min()) - 1, ln, up=True)
    # fang tips slightly darker (reads as a point, not a block)
    return idx


def outline_ring(op):
    """4-neighbour ring of transparent pixels next to an opaque mask."""
    d = op.copy()
    d[1:] |= op[:-1]
    d[:-1] |= op[1:]
    d[:, 1:] |= op[:, :-1]
    d[:, :-1] |= op[:, 1:]
    return d & ~op


def paste(canvas, layer, ring=True):
    op = layer >= 0
    if ring:
        r = outline_ring(op)
        canvas[r & (canvas >= 0)] = OL
    canvas[op] = layer[op]
    return canvas


def compose(body, antler, skull):
    c = body.copy()
    paste(c, antler)
    paste(c, skull)
    op = c >= 0
    c[outline_ring(op)] = OL
    return c


def idx_to_img(idx):
    h, w = idx.shape
    out = np.zeros((h, w, 4), np.uint8)
    op = idx >= 0
    out[..., :3][op] = PAL[idx[op]]
    out[..., 3][op] = 255
    return out


def save_big(idx, path, scale=5, bg=(0x65, 0x53, 0x3e)):
    img = Image.fromarray(idx_to_img(idx), 'RGBA').resize((idx.shape[1] * scale, idx.shape[0] * scale), Image.NEAREST)
    base = Image.new('RGBA', img.size, bg + (255,))
    base.alpha_composite(img)
    base.save(path)




# ================================================================= posing
YCUT = 104          # body rows >= YCUT (the feet / lower legs) are never moved, sheared or deleted
BACK_TOP = 52       # first body row of the leaf mass (shear weight 1.0 here)

RAMPS = [['w0', 'w1', 'w2', 'w3', 'w4', 'w5'], ['y0', 'y1', 'y2', 'y3', 'y4'], ['o0', 'o1', 'o2', 'o3'],
         ['r0', 'r1', 'r2'], ['m0', 'm1'], ['b0', 'b1', 'b2', 'b3']]


def ramp_map(step):
    m = np.arange(len(PAL_KEYS))
    for r in RAMPS:
        for i, k in enumerate(r):
            j = min(max(i + step, 0), len(r) - 1)
            m[IDX[k]] = IDX[r[j]]
    return m


LIGHTEN = ramp_map(+1)
DARKEN = ramp_map(-1)


def remap(c, m):
    return np.where(c >= 0, m[np.maximum(c, 0)], -1).astype(np.int16)


def shift_row(row, dx):
    if dx == 0:
        return row.copy()
    out = np.full_like(row, -1)
    if dx > 0:
        out[dx:] = row[:-dx]
    else:
        out[:dx] = row[-dx:]
    return out


def pose_body(body, crouch, lean):
    """Row shear (lean, + = forward/right) that fades to 0 at YCUT, then row deletion (crouch > 0) or
    row insertion (crouch < 0) in the lower-leg band so the feet rows stay put."""
    h, w = body.shape
    sheared = np.full_like(body, -1)
    for y in range(h):
        if y >= YCUT:
            sheared[y] = body[y]
            continue
        wgt = min(1.0, (YCUT - y) / float(YCUT - BACK_TOP))
        sheared[y] = shift_row(body[y], int(round(lean * wgt)))
    top, feet = sheared[:YCUT], sheared[YCUT:]
    if crouch > 0:
        n = crouch
        top = np.vstack([np.full((n, w), -1, body.dtype), top[:YCUT - n]])
    elif crouch < 0:
        m = -crouch
        top = np.vstack([top[m:], np.repeat(top[-1:], m, axis=0)])
    return np.vstack([top, feet])


def shear_antlers(layer, dx_top, y_top, y_base, power=1.4):
    out = np.full_like(layer, -1)
    for y in range(layer.shape[0]):
        wgt = min(1.0, max(0.0, (y_base - y) / float(y_base - y_top))) ** power
        out[y] = shift_row(layer[y], int(round(dx_top * wgt)))
    return out


# crouch/lean = body; hx,hy = *extra* head offset; sa = antler shear at the tips
POSES = [
    ('idle_a',        dict(crouch=0, lean=0, hx=0, hy=0, sa=0)),
    ('idle_b',        dict(crouch=-1, lean=0, hx=1, hy=1, sa=1)),
    ('anticipation',  dict(crouch=6, lean=-2, hx=-3, hy=8, sa=6)),
    ('attack',        dict(crouch=3, lean=3, hx=5, hy=6, sa=5)),
    ('followthrough', dict(crouch=4, lean=3, hx=4, hy=11, sa=6)),
    ('recovery',      dict(crouch=2, lean=1, hx=1, hy=5, sa=2)),
    ('hit_recoil',    dict(crouch=0, lean=-2, hx=-5, hy=-4, sa=-3, flash=1)),
    ('hit_recover',   dict(crouch=1, lean=-1, hx=-2, hy=-2, sa=-1)),
    ('death_start',   dict(crouch=5, lean=-2, hx=-4, hy=4, sa=-3, eye='fade')),
    ('defeated',      dict(crouch=14, lean=-2, hx=3, hy=10, sa=-5, eye='dead', dark=1)),
]
DURATIONS = {'idle_a': 520, 'idle_b': 520, 'anticipation': 600, 'attack': 260, 'followthrough': 160,
             'recovery': 420, 'hit_recoil': 220, 'hit_recover': 180, 'death_start': 300, 'defeated': 700}
# honest labelling of how each frame is produced
FRAME_KIND = {
    'idle_a': 'traced redraw (base pose)',
    'idle_b': 'offset recomposition: body +1 row (row insertion), head +1/+1, antler shear 1 px',
    'anticipation': 'offset recomposition: 6 leg rows deleted, head lowered, antlers row-sheared forward',
    'attack': 'offset recomposition: lunge shear + head thrust + antler shear forward',
    'followthrough': 'offset recomposition: deeper head/antler follow-through',
    'recovery': 'offset recomposition: partial return',
    'hit_recoil': 'offset recomposition: body/head pushed back, +1 palette step lighter flash (no glow)',
    'hit_recover': 'offset recomposition: partial return from recoil',
    'death_start': 'offset recomposition: sagging crouch, amber eye one step dimmer',
    'defeated': 'offset recomposition: collapse (14 leg rows removed), head lowered, eye dead, palette one step darker',
}


def render_pose(layers, spec):
    body, skull, antler = layers
    crouch, lean = spec.get('crouch', 0), spec.get('lean', 0)
    b = pose_body(body, crouch, lean)
    neck_row = 60
    wgt = min(1.0, (YCUT - neck_row) / float(YCUT - BACK_TOP))
    dx = int(round(lean * wgt)) + spec.get('hx', 0)
    dy = crouch + spec.get('hy', 0)
    rows = np.where((antler >= 0).any(1))[0]
    a = shear_antlers(antler, spec.get('sa', 0), int(rows.min()), 58)
    a = shift_arr(a, dx, dy, -1)
    s = shift_arr(skull, dx, dy, -1)
    c = compose(b, a, s)
    eye = spec.get('eye')
    if eye == 'fade':
        m = np.arange(len(PAL_KEYS))
        m[IDX['e1']] = IDX['e0']
        m[IDX['e0']] = IDX['o1']
        c = remap(c, m)
    elif eye == 'dead':
        m = np.arange(len(PAL_KEYS))
        m[IDX['e1']] = IDX['w3']
        m[IDX['e0']] = IDX['w2']
        c = remap(c, m)
    if spec.get('dark'):
        c = remap(c, DARKEN)
    if spec.get('flash'):
        c = remap(c, LIGHTEN)
    return c


def bbox(idx):
    ys, xs = np.where(idx >= 0)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def build_all():
    body, skull, antler, info = build_layers()
    layers = (body, skull, antler)
    frames = {}
    for name, spec in POSES:
        frames[name] = render_pose(layers, spec)
    return frames, layers, info


def write_atlas(frames, info):
    names = [n for n, _ in POSES]
    atlas = np.zeros((FH, FW * len(names), 4), np.uint8)
    # pivot: horizontal centre of the foot span in idle (bottom rows), vertical = lowest opaque row
    idle = frames['idle_a']
    x0, y0, x1, y1 = bbox(idle)
    foot_rows = idle[y1 - 8:y1 + 1]
    fx = np.where((foot_rows >= 0).any(0))[0]
    pivot = [int(round((fx.min() + fx.max()) / 2.0)), int(y1)]
    for i, n in enumerate(names):
        atlas[:, i * FW:(i + 1) * FW] = idx_to_img(frames[n])
    Image.fromarray(atlas, 'RGBA').save(OUT_PNG, optimize=True)
    data = {
        'entity_id': 'B01',
        'status': 'NEEDS_REVIEW',
        'frame_size': [FW, FH],
        'atlas_size': [FW * len(names), FH],
        'facing': 'right',
        'frames': {n: {'index_0_based': i, 'rect': [i * FW, 0, FW, FH], 'pivot': pivot,
                       'duration_ms': DURATIONS[n]} for i, n in enumerate(names)},
        'event': {'frame_key': 'attack', 'index_0_based': names.index('attack')},
        'source': 'assets/bosses/B01_Mournfang/B01_NEW_CONCEPT_DRAFT.png',
        'notes': ('DRAFT / NEEDS_REVIEW. Controlled pixelization of the approved concept (segmentation by '
                  'gradient mask, area-average downscale ~0.096 px/px, fixed 28-colour palette, 1-px plum outline #1d1625), '
                  'with a traced redraw of the skull/jaw/fangs and hand-listed pixel edits; body and head+antlers are '
                  'separate layers recomposited per pose with whole-pixel offsets, row shears and row deletion/insertion '
                  '(no rotation, no scaling, no blur, no glow). idle_a is the only fully authored pose; every other '
                  'frame is limited-animation recomposition and needs an artist redraw. Feet rows are identical in all frames. '
                  'Script: web/scripts/author-mournfang.py. Flash in hit_recoil = one palette step lighter.'),
    }
    with open(OUT_JSON, 'w', encoding='utf8') as f:
        json.dump(data, f, indent=2)
        f.write('\n')
    return pivot, names


def contact_sheet(frames, names, scale=3):
    ground, back = (0x65, 0x53, 0x3e), (0x30, 0x47, 0x34)
    cols = 5
    rows = (len(names) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * FW * scale, rows * FH * scale), ground + (255,))
    for i, n in enumerate(names):
        im = Image.fromarray(idx_to_img(frames[n]), 'RGBA').resize((FW * scale, FH * scale), Image.NEAREST)
        cell = Image.new('RGBA', im.size, ground + (255,))
        top = Image.new('RGBA', (im.size[0], int(im.size[1] * 0.55)), back + (255,))
        cell.alpha_composite(top)
        cell.alpha_composite(im)
        sheet.alpha_composite(cell, ((i % cols) * FW * scale, (i // cols) * FH * scale))
    return sheet


if __name__ == '__main__':
    frames, layers, info = build_all()
    pivot, names = write_atlas(frames, info)
    contact_sheet(frames, names).save(os.path.join(DBG, 'contact.png'))
    for n in names:
        print(n, bbox(frames[n]))
    print('pivot', pivot, 'info', info)
