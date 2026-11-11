"""
Polish Sprint 2 - authoring atlas eksplorasi cast (deterministik).

Pakai:  python -I web/scripts/author_cast_sprites.py [C08 ...]      (dijalankan dari akar repo, PIL saja)

Metode (pixelisasi terkendali, bukan redraw bebas):
  1. Tampak turnaround resmi (assets/characters/Cxx_*/Cxx_TURNAROUND_*.png, alpha-cut) dipotong menjadi pita
     horizontal (kepala / badan / kaki) dan setiap pita diperkecil dengan area-average ke ukuran sel
     (proporsi chibi: kepala diperbesar relatif terhadap badan).  Hanya resize + alpha-threshold.
  2. Palet dibatasi (k-means deterministik pada piksel opak), siluet dibersihkan (piksel terpencil),
     outline 1 px berkeluarga warna yang sama dengan Yaric (coklat gelap, selektif: gelapkan warna tetangga).
  3. Koreksi tangan: web/scripts/sprite-data/Cxx_overrides.txt (peta piksel teks, lihat berkas).
  4. Frame jalan/idle diturunkan dengan operasi lapisan baris/kolom nyata (geser per pita, ayunan kaki
     dari salinan kaki, ayunan ekor syal), tanpa skala seluruh sprite, tanpa blur.
Keluaran: web/public/assets/characters/final/Cxx_explore.{png,json} + lembar kontak di
  .dev-cache/test-artifacts/sprint2/cast/.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_DIR = os.path.join(ROOT, 'web', 'public', 'assets', 'characters', 'final')
QA_DIR = os.path.join(ROOT, '.dev-cache', 'test-artifacts', 'sprint2', 'cast')
DATA_DIR = os.path.join(ROOT, 'web', 'scripts', 'sprite-data')
CW, CH = 32, 48
BASE_Y = 46
OUTLINE = (38, 24, 22)

# --------------------------------------------------------------------------------------------------
# util
# --------------------------------------------------------------------------------------------------

def load_cut(path):
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    a[..., 3] = np.where(a[..., 3] >= 128, 255, 0)
    return Image.fromarray(a, 'RGBA')


def enhance(img, sat=1.25, contrast=1.15, sharpen=True):
    """Naikkan saturasi/kontras sebelum diperkecil agar detail kecil (gesper, goggle) bertahan."""
    from PIL import ImageEnhance, ImageFilter
    a = img.getchannel('A')
    rgb = img.convert('RGB')
    rgb = ImageEnhance.Color(rgb).enhance(sat)
    rgb = ImageEnhance.Contrast(rgb).enhance(contrast)
    if sharpen:
        rgb = rgb.filter(ImageFilter.UnsharpMask(radius=6, percent=120, threshold=2))
    out = rgb.convert('RGBA')
    out.putalpha(a)
    return out


def band_resize(src, band):
    """band = dict(y0,y1 (sumber), ref (x sumber untuk sumbu x=16), sx (px sel per px sumber), dy (baris tujuan), h)"""
    y0, y1, ref, sx, dy, h = band['y0'], band['y1'], band['ref'], band['sx'], band['dy'], band['h']
    half = 16.0 / sx
    x0, x1 = ref - half, ref + half
    pad = 400
    big = Image.new('RGBA', (src.width + 2 * pad, src.height + 2 * pad), (0, 0, 0, 0))
    big.paste(src, (pad, pad))
    # premultiplied BOX resize (PIL menangani RGBA -> RGBa)
    part = big.resize((CW, h), Image.BOX, box=(x0 + pad, y0 + pad, x1 + pad, y1 + pad))
    return part, dy


def compose_bands(src, bands):
    canvas = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    for b in bands:
        part, dy = band_resize(src, b)
        # tempel menimpa alpha secara penuh (bukan blend) agar baris batas tidak bocor
        arr = np.array(canvas)
        p = np.array(part)
        for yy in range(p.shape[0]):
            if 0 <= dy + yy < CH:
                row = p[yy]
                m = row[:, 3] > 0
                arr[dy + yy][m] = row[m]
        canvas = Image.fromarray(arr, 'RGBA')
    return canvas


def kmeans_palette(rgb_pixels, k, seed=7, iters=25, weights=None):
    rng = np.random.RandomState(seed)
    px = rgb_pixels.astype(np.float64)
    # init: kmeans++ deterministik
    cent = [px[rng.randint(len(px))]]
    for _ in range(1, k):
        d = np.min([((px - c) ** 2).sum(1) for c in cent], axis=0)
        cent.append(px[np.argmax(d)] if rng.rand() < 0.5 else px[rng.choice(len(px), p=d / d.sum())])
    cent = np.array(cent)
    for _ in range(iters):
        d = ((px[:, None, :] - cent[None]) ** 2).sum(2)
        lab = d.argmin(1)
        for i in range(k):
            m = lab == i
            if m.any():
                cent[i] = px[m].mean(0)
    return np.round(cent).astype(np.uint8)


def snap_palette(img, palette):
    a = np.array(img)
    out = a.copy()
    ys, xs = np.where(a[..., 3] > 0)
    px = a[ys, xs, :3].astype(np.float64)
    d = ((px[:, None, :] - palette[None].astype(np.float64)) ** 2).sum(2)
    out[ys, xs, :3] = palette[d.argmin(1)]
    return Image.fromarray(out, 'RGBA')


def despeckle(img, passes=1):
    """Hapus piksel opak yang punya <2 tetangga opak (4-arah) dan tutup lubang 1 px."""
    a = np.array(img)
    for _ in range(passes):
        op = a[..., 3] > 0
        n = np.zeros(op.shape, int)
        n[1:] += op[:-1]
        n[:-1] += op[1:]
        n[:, 1:] += op[:, :-1]
        n[:, :-1] += op[:, 1:]
        kill = op & (n < 2)
        a[kill] = 0
        # tutup lubang (transparan dengan >=3 tetangga opak) dgn warna tetangga terdekat
        hole = (~op) & (n >= 3)
        for y, x in zip(*np.where(hole)):
            for dy, dx in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < a.shape[0] and 0 <= xx < a.shape[1] and a[yy, xx, 3] > 0:
                    a[y, x] = a[yy, xx]
                    break
    return Image.fromarray(a, 'RGBA')


def add_outline(img, dark=OUTLINE, mix=0.35):
    """Outline 1 px di luar siluet; warna = gelapkan piksel tetangga (selektif) bercampur coklat gelap."""
    a = np.array(img)
    op = a[..., 3] > 0
    out = a.copy()
    h, w = op.shape
    for y in range(h):
        for x in range(w):
            if op[y, x]:
                continue
            nb = []
            for dy, dx in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w and op[yy, xx]:
                    nb.append(a[yy, xx, :3].astype(float))
            if nb:
                lum = float(np.mean(nb, 0) @ np.array([0.3, 0.59, 0.11]))
                c = (74, 46, 34) if lum > 170 else ((52, 32, 26) if lum > 110 else (34, 22, 20))
                out[y, x] = (int(c[0]), int(c[1]), int(c[2]), 255)
    return Image.fromarray(out, 'RGBA')


def fix_bottom(img, y=BASE_Y):
    """Pastikan baris opak terbawah = y (geser vertikal murni)."""
    a = np.array(img)
    rows = np.where((a[..., 3] > 0).any(1))[0]
    d = y - rows.max()
    if d:
        a = np.roll(a, d, axis=0)
    return Image.fromarray(a, 'RGBA')


def centre_x(img, target=16.0):
    """Geser horizontal sehingga titik berat 6 baris terbawah ~ target (dibulatkan)."""
    a = np.array(img)
    rows = np.where((a[..., 3] > 0).any(1))[0]
    y1 = rows.max()
    sub = a[max(0, y1 - 5):y1 + 1, :, 3] > 0
    xs = np.where(sub)[1]
    cx = xs.mean() + 0.5
    d = int(round(target - cx))
    return np.roll(a, d, axis=1), d


def mirror(img):
    return img.transpose(Image.FLIP_LEFT_RIGHT)


def alpha_bbox(img):
    return img.getchannel('A').point(lambda v: 255 if v else 0).getbbox()


# --------------------------------------------------------------------------------------------------
# overrides (peta piksel teks)
# --------------------------------------------------------------------------------------------------

def parse_overrides(path):
    """Format berkas:  [nama_frame]  (dasar: down_0 left_0 up_0)
       legend:  <char> = RRGGBB | .  (transparan) | ~ (biarkan)
       lalu baris 'y<n>: <string 32 char>' ; char '~' = tidak diubah."""
    if not os.path.exists(path):
        return {}
    res = {}
    legend = {}
    cur = None
    for line in open(path, encoding='utf-8').read().splitlines():
        s = line.rstrip('\n')
        if not s.strip() or s.lstrip().startswith('#'):
            continue
        if s.startswith('@'):
            k, v = s[1:].split('=')
            legend[k.strip()] = v.strip()
            continue
        if s.startswith('['):
            cur = s.strip('[] ')
            res[cur] = {}
            continue
        if s.startswith('y') and cur:
            ys, row = s.split(':', 1)
            res[cur][int(ys[1:])] = row.strip('\n')[1:] if row.startswith(' ') else row
    return {'frames': res, 'legend': legend}


def apply_overrides(img, ov, name):
    if not ov or name not in ov['frames']:
        return img
    a = np.array(img)
    leg = ov['legend']
    for y, row in ov['frames'][name].items():
        for x, ch in enumerate(row):
            if ch == '~' or ch == ' ':
                continue
            if ch == '.':
                a[y, x] = (0, 0, 0, 0)
            else:
                hx = leg[ch]
                a[y, x] = (int(hx[0:2], 16), int(hx[2:4], 16), int(hx[4:6], 16), 255)
    return Image.fromarray(a, 'RGBA')


# --------------------------------------------------------------------------------------------------
# peta tangan (RLE) -> gambar interior (tanpa outline; outline ditambah otomatis)
# --------------------------------------------------------------------------------------------------
import re


def parse_maps(path):
    """Berkas teks:
         @X=RRGGBB            legenda warna (satu huruf)
         [nama]               bagian (front/side/back/...)
         yNN <rle> [s=±k]     baris interior; rle = huruf+jumlah ('.' transparan), panjang total genap, dipusatkan di
                              sumbu x=15.5 (panjang ganjil dipusatkan di piksel 15) lalu digeser s=k.
         xNN=...              (opsional) tidak dipakai
    """
    legend, maps, cur, errs = {}, {}, None, []
    for ln, line in enumerate(open(path, encoding='utf-8').read().splitlines(), 1):
        t = line.strip()
        if not t or t.startswith('#'):
            continue
        if t.startswith('@'):
            k, v = t[1:].split('=')
            legend[k.strip()] = v.strip()
        elif t.startswith('['):
            cur = t.strip('[]')
            maps[cur] = {}
        elif t[0] in 'pv' and cur is not None and t.split()[0] in ('p', 'v'):
            parts = t.split()
            if parts[0] == 'p':      # p X Y ch
                maps[cur].setdefault('_over', []).append((int(parts[1]), int(parts[2]), int(parts[2]), parts[3]))
            else:                    # v X Y0 Y1 ch  (garis vertikal)
                maps[cur].setdefault('_over', []).append((int(parts[1]), int(parts[2]), int(parts[3]), parts[4]))
        elif t[0] == 'y':
            parts = t.split()
            y = int(parts[0][1:])
            rle = parts[1]
            shift = 0
            xabs = None
            for p in parts[2:]:
                if p.startswith('s='):
                    shift = int(p[2:])
                elif p.startswith('x='):
                    xabs = int(p[2:])
            row = []
            for m in re.finditer(r'(.)(\d+)', rle):
                row += [m.group(1)] * int(m.group(2))
            if ''.join(f'{m.group(1)}{m.group(2)}' for m in re.finditer(r'(.)(\d+)', rle)) != rle:
                raise ValueError(f'{path}:{ln} rle tidak valid: {rle}')
            n = len(row)
            if xabs is None and n % 2:
                errs.append(f'{path}:{ln} panjang ganjil ({n}) pada {cur} y{y}: {rle}')
                continue
            x0 = xabs if xabs is not None else 16 - n // 2 + shift
            if x0 < 1 or x0 + n > CW - 1:
                raise ValueError(f'{path}:{ln} keluar sel pada {cur} y{y}: x0={x0} n={n}')
            maps[cur][y] = (x0, row)
    if errs:
        raise ValueError(chr(10).join(errs))
    return legend, maps


def render_map(legend, rows):
    a = np.zeros((CH, CW, 4), np.uint8)
    for y, val in rows.items():
        if y == '_over':
            for (x, y0, y1, ch) in val:
                hx = legend[ch]
                for yy in range(y0, y1 + 1):
                    a[yy, x] = (int(hx[0:2], 16), int(hx[2:4], 16), int(hx[4:6], 16), 255)
            continue
        x0, row = val
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            x = x0 + i
            hx = legend[ch]
            a[y, x] = (int(hx[0:2], 16), int(hx[2:4], 16), int(hx[4:6], 16), 255)
    return Image.fromarray(a, 'RGBA')


def sheet(frames, scale, path, cols=None, bg=(90, 90, 100), guides=True):
    """Lembar kontak: frames list[Image 32x48]; garis merah y=46 bawah kaki."""
    cols = cols or len(frames)
    rows_n = (len(frames) + cols - 1) // cols
    W, H = cols * CW, rows_n * CH
    img = Image.new('RGBA', (W, H), bg + (255,))
    for i, f in enumerate(frames):
        img.paste(f, ((i % cols) * CW, (i // cols) * CH), f)
    img = img.resize((W * scale, H * scale), Image.NEAREST)
    if guides:
        px = img.load()
        for r in range(rows_n):
            yy = r * CH * scale + 47 * scale
            for x in range(W * scale):
                px[x, yy] = (255, 60, 60, 255)
    img.save(path)
