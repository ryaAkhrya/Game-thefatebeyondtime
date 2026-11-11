#!/usr/bin/env python
"""Polish Sprint 2 - Yaric (C01) overworld sprite authoring.

Deterministic. Run from the repo root (documented, isolated interpreter mode):

    python -I web/scripts/author-yaric-sprites.py

Input : web/public/assets/characters/normalized/C01_explore.png (+ .json)   (never modified)
Output: web/public/assets/characters/final/C01_explore.png + .json

Atlas rows (4 columns, 32x48 cells, feet row y=46), 14 rows = 128x672:
    0..3    walk   down,left,right,up   (original 4 frames per row; row 3 "up" gets the crown fix)
    4..7    idle   row = 4 + dir (down,left,right,up), col = frame 0..3
    8..13   sprint row = 8 + frame (0..5), col = dir (down,left,right,up)
The JSON "anims" block holds the grid indices (index = row*4 + col) and fps per state.

Every new pixel is a copy of a pixel that already exists in the atlas (same palette, hard alpha) or a
palette colour picked by name. The edits are frame-by-frame pixel surgery (row shears, block shifts,
single pixel moves) - never a scale or a whole sprite translation.
Requires Pillow only.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC_PNG = os.path.join(ROOT, 'web/public/assets/characters/normalized/C01_explore.png')
SRC_JSON = os.path.join(ROOT, 'web/public/assets/characters/normalized/C01_explore.json')
OUT_DIR = os.path.join(ROOT, 'web/public/assets/characters/final')
FW, FH, COLS = 32, 48, 4
FOOT_Y = 46
T = (0, 0, 0, 0)

# ----------------------------------------------------------------------------------------------
# frame helpers: a frame is a list of FH rows, each a list of FW RGBA tuples; T = transparent
# ----------------------------------------------------------------------------------------------


def load_atlas(path):
    im = Image.open(path).convert('RGBA')
    px = im.load()
    frames = {}
    for r in range(im.height // FH):
        for c in range(COLS):
            frames[(r, c)] = [[px[c * FW + x, r * FH + y] for x in range(FW)] for y in range(FH)]
    return frames


def clone(f):
    return [row[:] for row in f]


def empty():
    return [[T] * FW for _ in range(FH)]


def opaque(p):
    return p[3] != 0


def flip(f):
    return [row[::-1] for row in f]


def get(f, x, y):
    if 0 <= x < FW and 0 <= y < FH:
        return f[y][x]
    return T


def put(f, x, y, p):
    if 0 <= x < FW and 0 <= y < FH:
        f[y][x] = p


def row_span(f, y):
    xs = [x for x in range(FW) if opaque(f[y][x])]
    return (xs[0], xs[-1]) if xs else None


def shear(f, y0, y1, aL, aR, sl, sr):
    """Move the outer cloak parts of rows y0..y1 (inclusive) without touching the core x in [aL,aR].
    sl(y)/sr(y) = shift (px) of the part x<aL / x>aR. A gap that opens next to the core is filled by
    repeating the adjacent pixel, an overlap is clipped. Core and feet never move."""
    g = clone(f)
    for y in range(y0, y1 + 1):
        row = f[y]
        out = row[:]
        dl, dr = sl(y), sr(y)
        if dl:
            left = row[:aL]
            out[:aL] = [T] * aL
            for x in range(aL):
                nx = x + dl
                if 0 <= nx < aL:
                    out[nx] = left[x]
            if dl < 0:  # outward: open gap at aL+dl .. aL-1 -> repeat last pixel of the part
                for x in range(aL + dl, aL):
                    if not opaque(out[x]) and opaque(left[aL - 1]):
                        out[x] = left[aL - 1]
        if dr:
            right = row[aR + 1:]
            out[aR + 1:] = [T] * len(right)
            for i, p in enumerate(right):
                nx = aR + 1 + i + dr
                if aR + 1 <= nx < FW:
                    out[nx] = p
            if dr > 0:
                for x in range(aR + 1, aR + 1 + dr):
                    if not opaque(out[x]) and opaque(row[aR + 1]):
                        out[x] = row[aR + 1]
        g[y] = out
    return g


def shift_rows(f, y0, y1, dx):
    """Shift whole rows y0..y1 sideways (clipped at the cell border)."""
    g = clone(f)
    for y in range(y0, y1 + 1):
        row = f[y]
        out = [T] * FW
        for x in range(FW):
            nx = x + dx
            if 0 <= nx < FW:
                out[nx] = row[x]
        g[y] = out
    return g


def drop_rows(f, y0, y1, d=1):
    """Move rows y0..y1 down by d. Rows below y1 that are overwritten are lost (chest compresses),
    rows opened at the top (y0..y0+d-1) become transparent. Rows outside the band keep their pixels."""
    g = clone(f)
    for y in range(y1, y0 - 1, -1):
        ty = y + d
        if ty < FH:
            g[ty] = f[y][:]
    for y in range(y0, y0 + d):
        g[y] = [T] * FW
    return g


def delete_row_shift_down(f, ydel, ytop=1):
    """Remove row ydel; rows ytop..ydel-1 move down by one (rows above ytop stay empty). Figure keeps its
    feet and its total height."""
    g = clone(f)
    for y in range(ydel, ytop, -1):
        g[y] = f[y - 1][:]
    g[ytop] = [T] * FW
    return g


def move_px(f, x, y, nx, ny, keep=False):
    p = get(f, x, y)
    if not opaque(p):
        return
    if not keep:
        put(f, x, y, T)
    put(f, nx, ny, p)


def neighbours4(f, x, y):
    return [get(f, x - 1, y), get(f, x + 1, y), get(f, x, y - 1), get(f, x, y + 1)]


def remove_isolated(f, y0, y1):
    for y in range(y0, y1 + 1):
        for x in range(FW):
            if opaque(f[y][x]):
                n = 0
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        if (dx or dy) and opaque(get(f, x + dx, y + dy)):
                            n += 1
                if n == 0:
                    f[y][x] = T


# palette colours used by hand (all exist in the source atlas)
OUTLINE = [(41, 25, 27, 255), (43, 29, 31, 255), (41, 25, 27, 255), (37, 27, 28, 255)]


def outline_top(f, y0, y1, side=True):
    """Recolour hair pixels that touch transparency above (and optionally left/right) with the dark
    outline colour of the front view."""
    g = clone(f)
    for y in range(y0, y1 + 1):
        for x in range(FW):
            if not opaque(f[y][x]):
                continue
            up = get(f, x, y - 1)
            exposed = not opaque(up)
            if side:
                exposed = exposed or not opaque(get(f, x - 1, y)) or not opaque(get(f, x + 1, y))
            if exposed:
                g[y][x] = OUTLINE[(x * 3 + y) % 4]
    return g


# ----------------------------------------------------------------------------------------------
# PART 1  crown fix of the back view
# ----------------------------------------------------------------------------------------------


def fix_back_crown(f):
    """The source back view has the crown cut flat at y=1 (12-13 px wide, no outline). We delete one
    plain cloak row (y=21), lower head+shoulders by one pixel, and draw a rounded, tousled crown on the
    freed rows y=1/2, closed with the front-view outline colour. Feet (y=46) and total height (46) are
    unchanged."""
    g = delete_row_shift_down(f, 21, ytop=1)
    remove_isolated(g, 2, 12)  # orphan single-pixel tufts of the source
    x0, x1 = row_span(g, 2)  # old flat crown row, now y=2
    # dome: clip the corners of the first rows so the silhouette narrows towards the top
    for y, (cl, cr) in {2: (1, 1), 3: (0, 0)}.items():
        a, b = row_span(g, y)
        for x in range(a, a + cl):
            put(g, x, y, T)
        for x in range(b - cr + 1, b + 1):
            put(g, x, y, T)
    # side tufts of rows 3..6 may stick out at most 2 px beyond the head body (source: 3-4 px 'horns')
    for y in range(3, 7):
        a, b = row_span(g, y)
        for x in range(a, x0 - 1):
            put(g, x, y, T)
        for x in range(x1 + 2, b + 1):
            put(g, x, y, T)
    remove_isolated(g, 2, 12)
    # new top row y=1: copy the hair of row 2 under it (rel 3..8), leaving a one-pixel notch for a spike
    a2, b2 = row_span(g, 2)
    for x in range(a2 + 2, b2 - 1):
        g[1][x] = g[2][x]
    put(g, a2 + 2, 1, T)  # asymmetric: the left tuft starts one pixel later (tousled, not a straight cap)
    g = outline_top(g, 1, 10)
    return g


# ----------------------------------------------------------------------------------------------
# PART 2  idle (4 frames per direction)
# ----------------------------------------------------------------------------------------------


def ramp(y, y0, y1, v0, v1):
    """integer linear ramp, clamped; v0 at y0 .. v1 at y1"""
    if y <= y0:
        return v0
    if y >= y1:
        return v1
    return int(round(v0 + (v1 - v0) * (y - y0) / (y1 - y0)))


def tuft(f, y, side, d):
    """hair lock wiggle: d=+1 extends the outermost hair pixel of row y by one px outward, d=-1 removes it."""
    sp = row_span(f, y)
    if not sp:
        return
    x = sp[0] if side == 'L' else sp[1]
    out = -1 if side == 'L' else 1
    if d > 0:
        put(f, x + out, y, f[y][x])
    elif d < 0 and sum(1 for p in f[y] if opaque(p)) > 6:
        put(f, x, y, T)


def vshift_block(f, x0, x1, y0, y1, dy):
    """Move the pixels of rectangle x0..x1,y0..y1 up (dy<0) or down (dy>0); the row that opens at the
    trailing edge repeats the edge row (no holes), the overwritten leading rows are lost."""
    g = clone(f)
    src = [[f[y][x] for x in range(x0, x1 + 1)] for y in range(y0, y1 + 1)]
    h = y1 - y0 + 1
    for i in range(h):
        j = min(max(i - dy, 0), h - 1)
        for k, x in enumerate(range(x0, x1 + 1)):
            g[y0 + i][x] = src[j][k]
    return g


def sway(f, y0, y1, aL, aR, w, k, widen=0):
    """cloak hem sway: both outer parts swing by w*ramp (w=-1: to the left), plus optional widen."""
    return shear(
        f, y0, y1, aL, aR,
        lambda y: w * ramp(y, y0, y1, 0, k) - widen * ramp(y, y0, y1, 0, 1),
        lambda y: w * ramp(y, y0, y1, 0, k) + widen * ramp(y, y0, y1, 0, 1),
    )


def idle_down(b):
    i0 = clone(b)
    i1 = sway(b, 25, 38, 10, 22, -1, 2)
    tuft(i1, 9, 'R', 1); tuft(i1, 10, 'L', -1)
    i2 = drop_rows(sway(b, 25, 38, 10, 22, 0, 2, widen=1), 1, 15, 1)
    i3 = drop_rows(sway(b, 25, 38, 10, 22, 1, 2), 1, 15, 1)
    tuft(i3, 10, 'L', 1); tuft(i3, 9, 'R', -1)
    return [i0, i1, i2, i3]


def idle_up(b):
    i0 = clone(b)
    i1 = sway(b, 27, 39, 11, 21, -1, 2)
    tuft(i1, 5, 'R', 1)
    i2 = drop_rows(sway(b, 27, 39, 11, 21, 0, 2, widen=1), 1, 14, 1)
    i3 = drop_rows(sway(b, 27, 39, 11, 21, 1, 2), 1, 14, 1)
    tuft(i3, 6, 'L', 1)
    return [i0, i1, i2, i3]


def idle_left(b):
    i0 = clone(b)
    i1 = shear(b, 22, 38, 0, 18, lambda y: 0, lambda y: ramp(y, 22, 38, 0, 2))
    tuft(i1, 3, 'L', 1)
    i2 = drop_rows(shear(b, 22, 38, 0, 18, lambda y: 0, lambda y: ramp(y, 22, 38, 0, 1)), 1, 14, 1)
    i3 = drop_rows(shear(b, 22, 38, 0, 18, lambda y: 0, lambda y: ramp(y, 22, 38, 0, -1)), 1, 14, 1)
    tuft(i3, 4, 'L', 1)
    return [i0, i1, i2, i3]


# ----------------------------------------------------------------------------------------------
# PART 3  sprint (6 frames per direction)
# ----------------------------------------------------------------------------------------------


def lift_block(f, x0, x1, y0, y1, dy):
    """Raise (dy<0) the rectangle x0..x1,y0..y1 by |dy| rows (a foot/knee kick). The pixels it leaves behind at
    the bottom become transparent - the lifted foot is in the air, the other foot keeps y=46."""
    g = clone(f)
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = T
    for y in range(y0, y1 + 1):
        ny = y + dy
        if not (0 <= ny < FH):
            continue
        for x in range(x0, x1 + 1):
            if opaque(f[y][x]):
                g[ny][x] = f[y][x]
    return g


def lean_rows(f, y_a, y_b, dxa, y_c, dxb):
    """forward lean by row shear: rows 1..y_a move dxa, rows y_a+1..y_c move dxb (head leads the torso)"""
    g = shift_rows(f, 1, y_a, dxa)
    return shift_rows(g, y_a + 1, y_c, dxb)


def clean_hem(f, y0, y1):
    remove_isolated(f, y0, y1)
    return f


def inside(f):
    """True when no opaque pixel touches the left/right border column of the cell"""
    return not any(opaque(row[0]) or opaque(row[FW - 1]) for row in f)


def fit_cloak(f, make, kmax):
    """build the cloak with the largest k <= kmax that keeps the figure 1 px away from the cell border"""
    for k in range(kmax, -1, -1):
        g = make(k)
        if inside(g):
            return g
    return f


def sprint_down(A):
    """front view run: alternating boot lifts (knee up), head drops 0..2 px (lean toward the camera),
    cloak hem flares/flutters 2-3 px, forearms pump."""
    c = [A[(0, i)] for i in range(4)]
    out = []
    # (base, headDrop, swayW, widen, liftL, liftR, armPhase)
    spec = [
        (c[1], 1, -1, 1, 0, 0, +1),
        (c[0], 2, 0, 2, 0, 2, 0),
        (c[2], 0, +1, 1, 0, 0, -1),
        (c[3], 1, +1, 1, 0, 0, -1),
        (c[0], 2, 0, 2, 2, 0, 0),
        (c[2], 0, -1, 1, 0, 0, +1),
    ]
    for base, drop, w, wid, lL, lR, arm in spec:
        f = clone(base)
        if lL:
            f = lift_block(f, 11, 15, 41, 46, -lL)
        if lR:
            f = lift_block(f, 17, 21, 41, 46, -lR)
        if arm:
            f = vshift_block(f, 5, 11, 18, 27, -arm)
            f = vshift_block(f, 20, 27, 18, 27, arm)
        f = fit_cloak(f, lambda k, f=f, w=w, wid=wid: sway(f, 25, 38, 10, 22, w, k, widen=min(wid, k)), 3)
        if drop:
            f = drop_rows(f, 1, 15, drop)
        clean_hem(f, 24, 40)
        out.append(f)
    return out


def sprint_up(A):
    c = [A[(3, i)] for i in range(4)]
    out = []
    spec = [
        (c[1], 1, -1, 1, 0, 0),
        (c[0], 2, 0, 2, 0, 2),
        (c[2], 1, +1, 2, 0, 0),
        (c[3], 1, +1, 1, 0, 0),
        (c[0], 2, 0, 2, 2, 0),
        (c[2], 1, -1, 2, 0, 0),
    ]
    for base, drop, w, wid, lL, lR in spec:
        f = clone(base)
        if lL:
            f = lift_block(f, 10, 16, 41, 46, -lL)
        if lR:
            f = lift_block(f, 17, 23, 41, 46, -lR)
        f = fit_cloak(f, lambda k, f=f, w=w, wid=wid: sway(f, 27, 39, 11, 21, w, k, widen=min(wid, k)), 3)
        if drop:
            f = drop_rows(f, 1, 14, drop)
        clean_hem(f, 26, 41)
        out.append(f)
    return out


def sprint_left(A):
    """side run (facing left): head leads (lean 1-2 px by row shear), stride lengthened by shearing the legs apart
    below the hip, rear foot kicked up on the passing frames, cloak streams 2-4 px back."""
    c = [A[(1, i)] for i in range(4)]
    out = []
    # (base, headDx, midDx, headDrop, stride, rearKick, frontKick, cloakK)
    spec = [
        (c[1], -2, -1, 0, 2, 0, 0, 3),   # contact (front foot plants, rear trails)
        (c[2], -2, -1, 2, 0, 0, 0, 4),   # down: lowest point, head drops 2
        (c[2], -1, -1, 1, 0, 3, 0, 3),   # passing, rear foot kicked up
        (c[3], -2, -1, 0, 2, 0, 0, 4),   # contact (other leg)
        (c[2], -1, -1, 2, 1, 0, 0, 3),   # down (legs spread 1 px)
        (c[2], -1, -1, 1, 0, 0, 3, 4),   # passing, front knee driven up
    ]
    for base, hd, md, drop, stride, kick, fkick, ck in spec:
        f = clone(base)
        if stride:
            f = shear(f, 38, 46, 16, 16, lambda y: -ramp(y, 38, 44, 0, stride), lambda y: ramp(y, 38, 44, 0, stride))
        if kick:
            f = lift_block(f, 16, 31, 40, 46, -kick)
        if fkick:
            f = lift_block(f, 0, 15, 40, 46, -fkick)
        f = fit_cloak(f, lambda k, f=f: shear(f, 22, 38, 0, 18, lambda y: 0, lambda y: ramp(y, 22, 38, 0, k)), ck)
        f = lean_rows(f, 9, 0, hd, 20, md)
        if drop:
            f = drop_rows(f, 1, 14, drop)
        clean_hem(f, 20, 44)
        out.append(f)
    return out


# ----------------------------------------------------------------------------------------------
# PART 4  assemble atlas + json
# ----------------------------------------------------------------------------------------------

DIRS = ['down', 'left', 'right', 'up']
PREFIX = {'down': 'front', 'left': 'left', 'right': 'right', 'up': 'back'}
IDLE_ROW0 = 4      # rows 4..7  : idle, row = 4 + dir, col = frame 0..3
SPRINT_ROW0 = 8    # rows 8..13 : sprint, row = 8 + frame (0..5), col = dir index (down,left,right,up)
N_ROWS = 14
FOOT_CENTRE_ROWS = 8  # "foot centre" = x centroid of the opaque pixels in the lowest 8 rows (y 39..46)

IDLE_FPS, WALK_FPS, SPRINT_FPS = 3, 8, 14
IDLE_SEQ = [0, 1, 2, 3, 2, 1]  # gentle ping-pong: neutral, sway L, breathe out, sway R, breathe out, sway L


def build():
    A = load_atlas(SRC_PNG)
    frames = {}
    for r in range(4):
        for c in range(COLS):
            frames[(r, c)] = clone(A[(r, c)])
    for c in range(COLS):
        frames[(3, c)] = fix_back_crown(A[(3, c)])
    Af = dict(frames)  # fixed bases for the derived animation
    idle = {
        'down': idle_down(Af[(0, 0)]),
        'left': idle_left(Af[(1, 0)]),
        'up': idle_up(Af[(3, 0)]),
    }
    idle['right'] = [flip(f) for f in idle['left']]
    sprint = {'down': sprint_down(Af), 'left': sprint_left(Af), 'up': sprint_up(Af)}
    sprint['right'] = [flip(f) for f in sprint['left']]
    for d, name in enumerate(DIRS):
        for k in range(4):
            frames[(IDLE_ROW0 + d, k)] = idle[name][k]
        for k in range(6):
            frames[(SPRINT_ROW0 + k, d)] = sprint[name][k]
    return A, frames, idle, sprint


def grid_index(r, c):
    return r * COLS + c


def frame_name(r, c):
    if r < 4:
        return f'{PREFIX[DIRS[r]]}_{c}'
    if r < 8:
        return f'{PREFIX[DIRS[r - 4]]}_idle_{c}'
    return f'{PREFIX[DIRS[c]]}_sprint_{r - 8}'


def write_png(frames, path):
    im = Image.new('RGBA', (COLS * FW, N_ROWS * FH), T)
    px = im.load()
    for (r, c), f in frames.items():
        for y in range(FH):
            for x in range(FW):
                px[c * FW + x, r * FH + y] = f[y][x]
    im.save(path, optimize=False)
    return im


def bbox(f):
    pts = [(x, y) for y in range(FH) for x in range(FW) if opaque(f[y][x])]
    if not pts:
        return None
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return {'x0': min(xs), 'y0': min(ys), 'x1': max(xs), 'y1': max(ys), 'w': max(xs) - min(xs) + 1, 'h': max(ys) - min(ys) + 1}


def foot_centre(f, rows=FOOT_CENTRE_ROWS):
    xs = [x for y in range(FOOT_Y - rows + 1, FOOT_Y + 1) for x in range(FW) if opaque(f[y][x])]
    return round(sum(xs) / len(xs), 2) if xs else None


def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def anims_json():
    a = {}
    for d, name in enumerate(DIRS):
        a[name] = {
            'idle': {'frames': [grid_index(IDLE_ROW0 + d, k) for k in IDLE_SEQ], 'fps': IDLE_FPS},
            'walk': {'frames': [grid_index(d, k) for k in range(4)], 'fps': WALK_FPS},
            'sprint': {'frames': [grid_index(SPRINT_ROW0 + k, d) for k in range(6)], 'fps': SPRINT_FPS},
        }
    return a


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    A, frames, idle, sprint = build()
    out_png = os.path.join(OUT_DIR, 'C01_explore.png')
    write_png(frames, out_png)

    base = json.load(open(SRC_JSON, encoding='utf8'))
    skip = ('frames', 'animations', 'notes', 'frames_needing_artist_redraw', 'per_direction')
    j = {k: v for k, v in base.items() if k not in skip}
    j['generated_by'] = 'web/scripts/author-yaric-sprites.py (reads normalized/C01_explore.png; Polish Sprint 2)'
    j['authoring_version'] = 1
    j['note_status'] = ('Turunan runtime Polish Sprint 2: atlas ternormalisasi + perbaikan mahkota rambut tampak belakang + frame idle/sprint '
                        'hasil edit piksel per-frame (bukan skala). Bukan aset final; tetap NEEDS_REVIEW. '
                        'Sumber di assets/ dan atlas normalized/ tidak diubah.')
    j['status'] = 'NEEDS_REVIEW'
    j['atlas_size'] = [COLS * FW, N_ROWS * FH]
    j['cols'] = COLS
    j['grid'] = {
        'cols': COLS, 'rows': N_ROWS,
        'row_order': ['walk down', 'walk left', 'walk right', 'walk up',
                      'idle down', 'idle left', 'idle right', 'idle up',
                      'sprint frame0 (cols = down,left,right,up)', 'sprint frame1', 'sprint frame2',
                      'sprint frame3', 'sprint frame4', 'sprint frame5'],
    }
    j['normalized_source'] = {'path': 'web/public/assets/characters/normalized/C01_explore.png', 'sha256': sha(SRC_PNG)}
    fr = {}
    for (r, c), f in sorted(frames.items()):
        nm = frame_name(r, c)
        entry = {'rect': [c * FW, r * FH, FW, FH], 'pivot': [16, FOOT_Y], 'grid_index': grid_index(r, c),
                 'bbox': bbox(f), 'foot_center_x': foot_centre(f)}
        if r < 4:
            entry['kind'] = 'walk'
            entry['derived_from'] = f'normalized {nm}' + (' + crown fix' if r == 3 else ' (unchanged)')
            old = base['frames'][nm]
            if 'transform' in old:
                entry['normalization_transform'] = old['transform']
        elif r < 8:
            entry['kind'] = 'idle'
            entry['derived_from'] = ('mirror of left idle' if DIRS[r - 4] == 'right'
                                     else f'{PREFIX[DIRS[r - 4]]}_0 + frame-by-frame edits')
        else:
            entry['kind'] = 'sprint'
            entry['derived_from'] = ('mirror of left sprint' if DIRS[c] == 'right'
                                     else 'walk frames + lean/stride/kick/cloak edits')
        fr[nm] = entry
    j['frames'] = fr
    j['anims'] = anims_json()
    legacy = {}
    for name in DIRS:
        p = PREFIX[name]
        legacy[f'{p}_idle'] = {'frames': [f'{p}_idle_{k}' for k in IDLE_SEQ], 'fps': IDLE_FPS}
        legacy[f'{p}_walk'] = {'frames': [f'{p}_{k}' for k in range(4)], 'fps': WALK_FPS}
        legacy[f'{p}_sprint'] = {'frames': [f'{p}_sprint_{k}' for k in range(6)], 'fps': SPRINT_FPS}
    j['animations'] = legacy
    j['notes'] = [
        'Atlas 4 kolom x 14 baris (128x672). Baris 0..3 jalan (down,left,right,up), baris 4..7 idle (4 frame per arah), '
        'baris 8..13 sprint: baris = frame 0..5, kolom = arah (down,left,right,up). Indeks grid = baris*4 + kolom.',
        'up_0..up_3 (back_0..3): mahkota rambut digambar ulang. Satu baris kain jubah rata (y=21) dihapus, kepala+bahu turun 1 px, '
        'baris y=1..3 dibentuk kubah membulat dan ditutup outline gelap yang sama dengan tampak depan; kaki tetap y=46, tinggi tetap 46 px.',
        'idle: edit piksel per frame (kepala+bahu turun 1 px saat embus napas, goyang ujung jubah 1-2 px lewat shear baris, '
        'kuncir rambut +/-1 px). Kaki (y>=40) identik dengan pose berdiri.',
        'sprint: condong ke depan (shear baris kepala/badan), langkah dipanjangkan (shear kaki), tendangan kaki (angkat blok), '
        'jubah mengembang/menjulur 2-4 px, lengan memompa (tampak depan). right = cermin left.',
        'Semua piksel baru adalah salinan piksel yang sudah ada di atlas (palet sama, alpha keras 0/255).',
    ]
    j['frames_needing_artist_redraw'] = [
        'Semua frame idle/sprint adalah derivasi prosedural dari 4 frame jalan kasar; bukan gambar seniman. Perlu redraw/polish seniman.',
        'right_* (jalan, idle, sprint) tetap cermin left (detail/shading asimetris terbalik).',
        'left_*/right_*: 6 baris digandakan dari normalisasi Sprint 1 masih ada pada frame jalan.',
        'sprint down/up: pose kaki hanya angkat blok, bukan keyframe lari sungguhan (ayunan lutut/siku).',
        'back_*: mahkota hasil edit piksel, belum sama persis dengan turnaround belakang (ikal rambut halus).',
    ]
    j['review'] = 'Sprint 2 - derived idle/sprint frames, NEEDS_REVIEW'
    with open(os.path.join(OUT_DIR, 'C01_explore.json'), 'w', encoding='utf8', newline='\n') as fh:
        json.dump(j, fh, indent=2, ensure_ascii=False)
        fh.write('\n')
    print('wrote', out_png, 'sha256', sha(out_png))
    return A, frames


if __name__ == '__main__':
    main()
