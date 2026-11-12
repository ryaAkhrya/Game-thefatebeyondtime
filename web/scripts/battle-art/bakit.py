"""
bakit.py -- shared toolkit for the Phase 7 battle atlases (C02 Velthia, B03 Chronolith, M05 Oathguard).

STATUS: DRAFT / NEEDS_REVIEW.  "Controlled pixelization of the official concept, posed as a paper-doll puppet,
needs artist cleanup."

Method (deterministic, no randomness except a fixed-seed k-means, no network):
  1. The official concept / turnaround PNG is cut into body parts (hand-listed polygons in concept pixel space).
  2. Every pose is a set of rigid transforms (translate / rotate about a pivot / uniform scale) applied to the
     HIGH-RES parts, composited back-to-front (premultiplied alpha, bilinear), so poses are re-poses of the same
     drawing, not new inventions.
  3. The composite is area-averaged onto the battle grid (same box mapping for every frame of an atlas), quantised
     to ONE closed palette per atlas (k-means on the idle frame + 1 outline colour + a glow ramp), hard alpha 0/255,
     noise-cleaned and outlined with a 1 px plum line.  No blur, no bloom, no smooth gradients.
Source art is never modified.  Needs: Python 3, Pillow, numpy, scipy.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT_DIR = os.path.join(REPO, 'web', 'public', 'assets', 'battle')
DBG = os.path.join(REPO, '.dev-cache', 'temp', 'battle-art')
SHEETS = os.path.join(REPO, 'docs', 'production', 'sprint3', 'battle-contact-sheets')
os.makedirs(DBG, exist_ok=True)
os.makedirs(SHEETS, exist_ok=True)

OUTLINE = (0x1d, 0x16, 0x25)   # deep plum, same as Mournfang V4

# ------------------------------------------------------------------ colour
def srgb_to_lab(rgb):
    c = rgb.astype(np.float64) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def boost(rgb_u8, sat=1.0, contrast=1.15, pivot=110.0):
    f = rgb_u8.astype(np.float64)
    lum = f @ np.array([0.299, 0.587, 0.114])
    f = lum[..., None] + (f - lum[..., None]) * sat
    f = (f - pivot) * contrast + pivot
    return np.clip(f, 0, 255).astype(np.uint8)


def kmeans_palette(rgb_pixels, k, seed=7, iters=40):
    """Deterministic k-means in Lab (k-means++ init with a fixed seed). Returns uint8 RGB centres sorted by luma."""
    lab = srgb_to_lab(rgb_pixels)
    rs = np.random.RandomState(seed)
    n = len(lab)
    centres = [lab[rs.randint(n)]]
    for _ in range(k - 1):
        d = np.min(((lab[:, None, :] - np.array(centres)[None]) ** 2).sum(-1), 1)
        p = d / d.sum()
        centres.append(lab[rs.choice(n, p=p)])
    centres = np.array(centres)
    for _ in range(iters):
        d = ((lab[:, None, :] - centres[None]) ** 2).sum(-1)
        a = d.argmin(1)
        for i in range(k):
            m = a == i
            if m.any():
                centres[i] = lab[m].mean(0)
    # back to rgb: take the member pixel nearest to each centre (keeps real, exactly-present colours)
    d = ((lab[:, None, :] - centres[None]) ** 2).sum(-1)
    rgbc = []
    for i in range(k):
        j = d[:, i].argmin()
        rgbc.append(rgb_pixels[j])
    rgbc = np.unique(np.array(rgbc, np.uint8), axis=0)
    lum = rgbc @ np.array([0.299, 0.587, 0.114])
    return rgbc[np.argsort(lum)]


class Palette:
    def __init__(self, base_rgb, glow_rgb=None, extra=None):
        base = [tuple(int(v) for v in c) for c in base_rgb]
        self.names = []
        self.rgb = []
        self.outline = len(self.rgb)
        self.rgb.append(OUTLINE); self.names.append('ol')
        self.base_idx = []
        for i, c in enumerate(base):
            self.base_idx.append(len(self.rgb)); self.rgb.append(c); self.names.append(f'p{i}')
        self.glow_idx = []
        for i, c in enumerate(glow_rgb or []):
            self.glow_idx.append(len(self.rgb)); self.rgb.append(tuple(c)); self.names.append(f'g{i}')
        self.extra = {}
        for k, c in (extra or {}).items():
            self.extra[k] = len(self.rgb); self.rgb.append(tuple(c)); self.names.append(k)
        self.arr = np.array(self.rgb, np.uint8)
        self.base_arr = self.arr[self.base_idx]
        self.base_lab = srgb_to_lab(self.base_arr)

    def quantize(self, rgb_u8):
        lab = srgb_to_lab(rgb_u8)
        d = ((lab[..., None, :] - self.base_lab) ** 2).sum(-1)
        return np.array(self.base_idx, np.int16)[d.argmin(-1)]

    def render(self, idx):
        out = np.zeros(idx.shape + (4,), np.uint8)
        op = idx >= 0
        out[op, :3] = self.arr[idx[op]]
        out[op, 3] = 255
        return out


# ------------------------------------------------------------------ hi-res canvas
class Canvas:
    """Padded hi-res canvas; part arrays are float32 premultiplied RGBA (H, W, 4) in 0..1."""

    def __init__(self, w, h, pad):
        self.w, self.h, self.pad = w, h, pad
        self.W, self.H = w + 2 * pad, h + 2 * pad

    def load(self, path, flip=False):
        im = Image.open(path).convert('RGBA')
        if flip:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        a = np.zeros((self.H, self.W, 4), np.float32)
        arr = np.array(im, np.float32) / 255.0
        arr[..., :3] *= arr[..., 3:4]
        a[self.pad:self.pad + im.height, self.pad:self.pad + im.width] = arr
        return a

    def pt(self, x, y):
        return (x + self.pad, y + self.pad)

    def poly_mask(self, polys):
        im = Image.new('L', (self.W, self.H), 0)
        d = ImageDraw.Draw(im)
        for p in polys:
            d.polygon([(x + self.pad, y + self.pad) for x, y in p], fill=255)
        return np.array(im) > 127


def cut(a, mask):
    return a * mask[..., None].astype(np.float32)


def alpha_of(a):
    return a[..., 3]


def unpremult(a):
    al = np.maximum(a[..., 3:4], 1e-4)
    return np.clip(a[..., :3] / al, 0, 1)


def transform(a, pivot, angle=0.0, dx=0.0, dy=0.0, scale=1.0, flip_x=False):
    """Rigid transform of a premultiplied RGBA array. pivot in canvas px. angle in degrees, positive = counter-clockwise
    on screen (PIL convention). Forward: p' = pivot + (dx,dy) + scale * R(angle) (p - pivot)."""
    if angle == 0 and dx == 0 and dy == 0 and scale == 1.0 and not flip_x:
        return a
    th = np.deg2rad(angle)
    c, s = np.cos(th), np.sin(th)
    # screen coords (y down), CCW visual rotation of vector (x,y): x' = x c + y s ; y' = -x s + y c
    # inverse (rotate by -angle): x = (x' c - y' s)/scale ; y = (x' s + y' c)/scale   (relative to pivot, after removing translation)
    px, py = pivot
    # out -> in: u = (x - px - dx), v = (y - py - dy); in_x = px + (u c - v s)/scale ; in_y = py + (u s + v c)/scale
    A = c / scale; B = -s / scale; C = px - (A * (px + dx) + B * (py + dy))
    D = s / scale; E = c / scale; F = py - (D * (px + dx) + E * (py + dy))
    out = np.zeros_like(a)
    for ch in range(a.shape[2]):
        im = Image.fromarray(a[..., ch], mode='F')
        out[..., ch] = np.array(im.transform((a.shape[1], a.shape[0]), Image.AFFINE, (A, B, C, D, E, F), resample=Image.BILINEAR), np.float32)
    return np.clip(out, 0, 1)


def over(dst, src):
    """premultiplied src over dst (in place on a copy)."""
    return src + dst * (1.0 - src[..., 3:4])


def nearest_fill(a, valid, region, shade=1.0):
    """Fill `region` (bool) pixels of premult array `a` with the colour of the nearest `valid` pixel."""
    idx = ndi.distance_transform_edt(~valid, return_distances=False, return_indices=True)
    out = a.copy()
    filled = a[idx[0], idx[1]]
    out[region] = filled[region]
    out[region, :3] *= shade
    return out


def smooth_region(a, region, size=7):
    out = a.copy()
    for ch in range(3):
        out[..., ch] = np.where(region, ndi.uniform_filter(a[..., ch], size), a[..., ch])
    return out


# ------------------------------------------------------------------ pixelize
class Grid:
    """Maps canvas px -> frame px.  frame_px = (canvas_px - origin) * S ; origin = canvas coordinate of frame (0,0)."""

    def __init__(self, fw, fh, S, ox, oy):
        self.fw, self.fh, self.S, self.ox, self.oy = fw, fh, S, ox, oy

    def box(self):
        return (self.ox, self.oy, self.ox + self.fw / self.S, self.oy + self.fh / self.S)


def area_resize(a2d, box, size):
    im = Image.fromarray(a2d.astype(np.float32), mode='F')
    return np.array(im.resize(size, Image.BOX, box=box), np.float32)


def pixelize(comp, grid, thr=0.42):
    """comp premult float canvas (RGBA [+glow coverage +glow level]) -> (rgb u8, opaque bool, glow coverage 0..1, glow level)."""
    chans = [area_resize(comp[..., c], grid.box(), (grid.fw, grid.fh)) for c in range(comp.shape[2])]
    al = chans[3]
    rgb = np.stack(chans[:3], -1) / np.maximum(al[..., None], 1e-4)
    if len(chans) > 5:
        gcov = np.clip(chans[4] / np.maximum(al, 1e-4), 0, 1)
        glev = chans[5] / np.maximum(chans[4], 1e-4)
    else:
        gcov = np.zeros_like(al); glev = np.zeros_like(al)
    return np.clip(rgb * 255, 0, 255).astype(np.uint8), al > thr, gcov, glev


def pixelize_mask(mask_f, grid):
    return area_resize(mask_f.astype(np.float32), grid.box(), (grid.fw, grid.fh))


def drop_small(idx, min_px):
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
    """Replace opaque pixels whose 4 neighbours (>=3) agree on another colour (salt-and-pepper from area averaging)."""
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


def fill_pinholes(op):
    """Close 1-px transparent holes enclosed by opaque pixels (from the alpha threshold)."""
    filled = ndi.binary_fill_holes(op)
    small = filled & ~op
    lab, n = ndi.label(small)
    out = op.copy()
    if n:
        sizes = ndi.sum(small, lab, range(1, n + 1))
        for i, s in enumerate(sizes, 1):
            if s <= 3:
                out |= lab == i
    return out


def outline_ring(op):
    d = op.copy()
    d[1:] |= op[:-1]
    d[:-1] |= op[1:]
    d[:, 1:] |= op[:, :-1]
    d[:, :-1] |= op[:, 1:]
    return d & ~op


def finish(idx, pal, min_island=5, ring=True):
    idx = drop_small(clean_noise(idx), min_island)
    if ring:
        r = outline_ring(idx >= 0)
        idx = idx.copy()
        idx[r] = pal.outline
    return idx


# ------------------------------------------------------------------ output
def write_atlas(name, frames, fw, fh, pal, meta, events, durations, pivot, aliases=None):
    """frames: ordered dict key -> idx array (fh, fw). Writes <name>.png/.json into the runtime battle folder."""
    keys = list(frames.keys())
    sheet = np.zeros((fh, fw * len(keys), 4), np.uint8)
    jf = {}
    for i, k in enumerate(keys):
        sheet[:, i * fw:(i + 1) * fw] = pal.render(frames[k])
        jf[k] = {'index_0_based': i, 'rect': [i * fw, 0, fw, fh], 'pivot': list(pivot), 'duration_ms': durations[k]}
    Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT_DIR, name + '.png'))
    for alias, target in (aliases or {}).items():
        jf[alias] = dict(jf[target], duration_ms=durations[alias])
    doc = dict(meta)
    doc.update({'frame_size': [fw, fh], 'atlas_size': [fw * len(keys), fh], 'frames': jf, 'event': events,
                'palette_size': int(len(pal.arr))})
    with open(os.path.join(OUT_DIR, name + '.json'), 'w', encoding='utf-8') as f:
        json.dump(doc, f, indent=2)
        f.write('\n')
    return sheet


def contact_sheet(name, frames, fw, fh, pal, scale=3, cols=None):
    """Large preview on the two battle backgrounds (ground #65533E, backdrop #304734), labelled."""
    keys = list(frames.keys())
    cols = cols or min(len(keys), 7)
    rows = (len(keys) + cols - 1) // cols
    cw, ch = fw * scale, fh * scale + 14
    out = Image.new('RGB', (cols * cw, rows * ch * 2), (0, 0, 0))
    d = ImageDraw.Draw(out)
    for bgi, bg in enumerate([(0x65, 0x53, 0x3e), (0x30, 0x47, 0x34)]):
        for i, k in enumerate(keys):
            r, c = divmod(i, cols)
            tile = Image.new('RGBA', (fw, fh), bg + (255,))
            tile.alpha_composite(Image.fromarray(pal.render(frames[k]), 'RGBA'))
            tile = tile.resize((fw * scale, fh * scale), Image.NEAREST)
            x0, y0 = c * cw, (r + bgi * rows) * ch
            out.paste(tile.convert('RGB'), (x0, y0 + 14))
            d.text((x0 + 2, y0 + 1), k, fill=(255, 255, 255))
    out.save(os.path.join(SHEETS, name + '_contact.png'))
    return out


# ------------------------------------------------------------------ puppet
class Puppet:
    """Ordered (back to front) rigid parts.  A part is a premultiplied float array (H, W, C>=4) on the padded canvas; it is stored
    cropped to its bounding box and only the grid window is ever composited (fast)."""

    def __init__(self, canvas):
        self.cv = canvas
        self.parts = []   # (name, crop, (bx, by), pivot)
        self.hidden_default = set()   # parts drawn only when the pose names them

    def add(self, name, arr, pivot=(0, 0)):
        live = (arr[..., 3] > 0) | (arr[..., 4] > 0) if arr.shape[2] > 5 else arr[..., 3] > 0
        ys, xs = np.where(live)
        if len(ys) == 0:
            return
        bx0, bx1, by0, by1 = xs.min() - 2, xs.max() + 3, ys.min() - 2, ys.max() + 3
        self.parts.append((name, arr[by0:by1, bx0:bx1].copy(), (bx0, by0), (pivot[0] + self.cv.pad, pivot[1] + self.cv.pad)))

    def render(self, pose, grid):
        """Returns (comp window premult array, window grid). pose: name -> dict(angle, dx, dy, scale, glow, hide)."""
        x0, y0, x1, y1 = grid.box()
        wx0, wy0 = int(np.floor(x0)) - 1, int(np.floor(y0)) - 1
        ww, wh = int(np.ceil(x1)) + 1 - wx0, int(np.ceil(y1)) + 1 - wy0
        C = self.parts[0][1].shape[2]
        comp = np.zeros((wh, ww, C), np.float32)
        for name, crop, (bx, by), pivot in self.parts:
            tf = pose.get(name) or {}
            if tf.get('hide') or (name in self.hidden_default and name not in pose):
                continue
            if 'glow' in tf and C > 5:
                crop = set_glow_level(crop, tf['glow'])
            ang, dx, dy, sc = tf.get('angle', 0.0), tf.get('dx', 0.0), tf.get('dy', 0.0), tf.get('scale', 1.0)
            h, w = crop.shape[:2]
            th = np.deg2rad(ang); c, s_ = np.cos(th), np.sin(th)
            px, py = pivot
            corners = [(bx, by), (bx + w, by), (bx, by + h), (bx + w, by + h)]
            fx = [px + dx + sc * ((x - px) * c + (y - py) * s_) for x, y in corners]
            fy = [py + dy + sc * (-(x - px) * s_ + (y - py) * c) for x, y in corners]
            dx0, dy0 = int(np.floor(min(fx))) - 1, int(np.floor(min(fy))) - 1
            dw, dh = int(np.ceil(max(fx))) + 1 - dx0, int(np.ceil(max(fy))) + 1 - dy0
            # clip destination to the window
            cx0, cy0 = max(dx0, wx0), max(dy0, wy0)
            cx1, cy1 = min(dx0 + dw, wx0 + ww), min(dy0 + dh, wy0 + wh)
            if cx1 <= cx0 or cy1 <= cy0:
                continue
            # out(x,y) (canvas coords = x + cx0, y + cy0) -> in canvas coords -> crop-local
            A = c / sc; B = -s_ / sc
            D = s_ / sc; E = c / sc
            def inv(xo, yo):
                u, v = xo - px - dx, yo - py - dy
                return px + A * u + B * v - bx, py + D * u + E * v - by
            ix0, iy0 = inv(cx0, cy0)
            coef = (A, B, ix0, D, E, iy0)
            ow, oh = cx1 - cx0, cy1 - cy0
            out = np.zeros((oh, ow, C), np.float32)
            for ch in range(C):
                out[..., ch] = np.array(Image.fromarray(crop[..., ch], mode='F').transform((ow, oh), Image.AFFINE, coef, resample=Image.BILINEAR), np.float32)
            out = np.clip(out, 0, 1)
            sl = comp[cy0 - wy0:cy1 - wy0, cx0 - wx0:cx1 - wx0]
            comp[cy0 - wy0:cy1 - wy0, cx0 - wx0:cx1 - wx0] = out + sl * (1.0 - out[..., 3:4])
        wg = Grid(grid.fw, grid.fh, grid.S, grid.ox - wx0, grid.oy - wy0)
        return comp, wg


def render_group(pup, pose, grid, group, margin=700):
    """Render a pose, then rigidly rotate/translate the WHOLE composite about group['pivot'] (concept px, no pad).
    Used for falls (defeated). group: dict(angle, dx, dy, pivot)."""
    S = grid.S
    big = Grid(grid.fw + 2 * margin * S, grid.fh + 2 * margin * S, S, grid.ox - margin, grid.oy - margin)
    comp, wg = pup.render(pose, big)
    # wg.ox/oy is the big-grid origin relative to the window -> original grid origin relative to window = wg.ox + margin
    pv = (group['pivot'][0] + pup.cv.pad - (big.ox - wg.ox), group['pivot'][1] + pup.cv.pad - (big.oy - wg.oy))
    comp = transform(comp, pv, group.get('angle', 0.0), group.get('dx', 0.0), group.get('dy', 0.0))
    return comp, Grid(grid.fw, grid.fh, S, wg.ox + margin, wg.oy + margin)


def with_glow(rgba, gmask, level):
    """Append glow coverage + level channels (premultiplied by alpha) to an RGBA part."""
    g = gmask.astype(np.float32) * rgba[..., 3]
    return np.concatenate([rgba, g[..., None], (g * level)[..., None]], -1)


def set_glow_level(arr, level):
    """Rewrite channel 5 (glow level) of a 6-channel part."""
    out = arr.copy()
    out[..., 5] = out[..., 4] * level
    return out


def glow_indices(gcov, glev, op, pal, thr=0.27):
    """Glow pixels -> palette ramp index, -1 elsewhere."""
    m = op & (gcov > thr)
    ramp = np.clip(np.rint(glev).astype(int), 0, len(pal.glow_idx) - 1)
    out = np.full(gcov.shape, -1, np.int16)
    out[m] = np.array(pal.glow_idx, np.int16)[ramp[m]]
    return out
