"""
Polish Sprint 2 - build atlas eksplorasi cast.  Pakai (dari akar repo, hanya Pillow + numpy):

    python -I web/scripts/author_cast_build.py            # semua karakter yang sudah dikonfigurasi
    python -I web/scripts/author_cast_build.py C08 C03    # sebagian

Pustaka: web/scripts/author_cast_sprites.py (parser peta RLE, outline, util).  Peta tangan: web/scripts/sprite-data/Cxx_maps.txt.
Deterministik (tanpa acak, tanpa waktu).  Tata letak atlas: 6 kolom x 4 baris, baris = down,left,right,up;
kolom = [berdiri, langkah A, langkah B, idle1, idle2, idle3].  Jalan = [0,1,0,2]; idle = [0,3,4,5].
"""
import hashlib
import json
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from author_cast_sprites import (CH, CW, DATA_DIR, OUT_DIR, QA_DIR, ROOT, add_outline, parse_maps, render_map,  # noqa: E402
                                 sheet)

COLS = 6
DIR_ROWS = ['down', 'left', 'right', 'up']
FRAME_PREFIX = {'down': 'front', 'left': 'left', 'right': 'right', 'up': 'back'}
WALK = [0, 1, 0, 2]
IDLE = [0, 3, 4, 5]


# --------------------------------------------------------------------------------------------------
# operasi lapisan pada interior numpy (H x W x 4)
# --------------------------------------------------------------------------------------------------

def shift_rows(a, y0, y1, dy, x0=0, x1=CW, fill='rep'):
    """Geser blok baris [y0,y1) kolom [x0,x1) sejauh dy; baris kosong diisi ulangan baris tepi (rep) atau transparan."""
    out = a.copy()
    seg = a[y0:y1, x0:x1].copy()
    if dy > 0:
        out[y0 + dy:y1 + dy, x0:x1] = seg
        for k in range(dy):
            out[y0 + k, x0:x1] = seg[0] if fill == 'rep' else 0
    elif dy < 0:
        out[y0 + dy:y1 + dy, x0:x1] = seg
        for k in range(-dy):
            out[y1 - 1 - k, x0:x1] = seg[-1] if fill == 'rep' else 0
    return out


def shift_cols(a, y0, y1, x0, x1, dx, fill='rep'):
    """Geser blok kolom [x0,x1) baris [y0,y1) sejauh dx; kolom kosong diisi kolom tetangga (rep) atau transparan."""
    out = a.copy()
    seg = a[y0:y1, x0:x1].copy()
    if dx > 0:
        out[y0:y1, x0 + dx:x1 + dx] = seg
        for k in range(dx):
            out[y0:y1, x0 + k] = a[y0:y1, x0 - 1] if fill == 'rep' else 0
    elif dx < 0:
        out[y0:y1, x0 + dx:x1 + dx] = seg
        for k in range(-dx):
            out[y0:y1, x1 - 1 - k] = a[y0:y1, x1] if fill == 'rep' else 0
    return out


def lift_leg(a, xa, xb, ya, yb, drop_rows):
    """Kaki pendek (tampak depan/belakang): buang baris drop_rows lalu rapatkan ke atas -> telapak terangkat len(drop_rows)."""
    out = a.copy()
    rows = [a[y, xa:xb].copy() for y in range(ya, yb) if y not in drop_rows]
    out[ya:yb, xa:xb] = 0
    for i, r in enumerate(rows):
        out[ya + i, xa:xb] = r
    return out


_PAL = None  # palet legenda aktif (np.uint8 Nx3) agar warna digelapkan tetap di dalam palet


def shear_leg(a, xa, xb, ya, yb, s, darken=1.0, drop_rows=()):
    """Salinan blok kaki yang digeser x berjenjang 0..s (bawah paling jauh); drop_rows = telapak terangkat."""
    blk = a[ya:yb, xa:xb].copy()
    keep = [r for r in range(yb - ya) if (ya + r) not in drop_rows]
    blk2 = np.zeros_like(blk)
    for i, r in enumerate(keep):
        blk2[i] = blk[r]
    out = np.zeros_like(a)
    h = yb - ya
    for r in range(h):
        k = abs(s) * (r + 1) / h
        dx = int(np.floor(k + 0.5)) * (1 if s >= 0 else -1)
        for x in range(blk2.shape[1]):
            if blk2[r, x, 3]:
                xx = xa + x + dx
                if 0 < xx < CW - 1:
                    px = blk2[r, x].copy()
                    if darken != 1.0:
                        px[:3] = np.clip(px[:3].astype(float) * darken, 0, 255).astype(np.uint8)
                        if _PAL is not None:
                            px[:3] = _PAL[((_PAL.astype(float) - px[:3].astype(float)) ** 2).sum(1).argmin()]
                    out[ya + r, xx] = px
    return out


def over(base, top):
    out = base.copy()
    m = top[..., 3] > 0
    out[m] = top[m]
    return out


def flip(a):
    return a[:, ::-1].copy()


def tuft(a, dx, y_first):
    """Kibasan rambut: geser piksel baris puncak (y_first) sejauh dx."""
    b = a.copy()
    xs = np.where(b[y_first, :, 3] > 0)[0]
    if len(xs) and dx:
        px = b[y_first, xs].copy()
        b[y_first, xs] = 0
        b[y_first, xs + dx] = px
    return b


# --------------------------------------------------------------------------------------------------
# turunan frame generik
# --------------------------------------------------------------------------------------------------

def derive_frontback(s, arm_cols=((4, 8), (24, 28)), arm_rows=(22, 30), leg_split=16, leg_rows=(34, 46), drop=(36, 37),
                     head_rows=(2, 20), body_to=30, tuft_dx=1):
    """[berdiri, langkah A, langkah B, idle1, idle2, idle3] untuk tampak depan/belakang."""
    ya, yb = leg_rows
    ra0, ra1 = arm_rows

    def walk(a, lift_left):
        b = shift_rows(a, 2, body_to, 1, 0, CW, fill='clear')
        xa, xb = (6, leg_split) if lift_left else (leg_split, 26)
        b = lift_leg(b, xa, xb, ya, yb, drop)
        up_arm, dn_arm = (arm_cols[0], arm_cols[1]) if lift_left else (arm_cols[1], arm_cols[0])
        b = shift_rows(b, ra0, ra1, -1, up_arm[0], up_arm[1], fill='clear')
        b = shift_rows(b, ra0, ra1, 1, dn_arm[0], dn_arm[1], fill='rep')
        return b

    hy0, hy1 = head_rows

    def idle(a, head, dx):
        b = shift_rows(a, hy0, hy1, 1, 0, CW, fill='clear') if head else a.copy()
        return tuft(b, dx, 2 + head)

    return [s, walk(s, True), walk(s, False), idle(s, 1, tuft_dx), idle(s, 0, tuft_dx), idle(s, 1, -tuft_dx)]


def derive_side(s, tail_a=None, leg_box=(11, 24, 33, 46), drop=(36, 37), hand_box=(25, 30, 14, 20), head_to=20):
    """Tampak samping menghadap KANAN. Mengembalikan 6 interior (menghadap kanan)."""
    xa, xb, ya, yb = leg_box

    def walk(a, near_forward):
        body = a.copy()
        body[ya:yb, xa - 3:xb + 3] = 0
        if near_forward:
            far = shear_leg(a, xa, xb, ya, yb, -3, 0.78, drop)
            near = shear_leg(a, xa, xb, ya, yb, 3, 1.0)
        else:
            far = shear_leg(a, xa, xb, ya, yb, 3, 0.78)
            near = shear_leg(a, xa, xb, ya, yb, -3, 1.0, drop)
        b = over(over(body, far), near)
        b = shift_rows(b, 2, 33, 1, 0, CW, fill='clear')
        y0, y1, x0, x1 = hand_box
        return shift_cols(b, y0 + 1, y1 + 1, x0, x1, -1 if near_forward else 1)

    def idle(a, head, tuft_dx, tail_dx_rows):
        b = shift_rows(a, 2, head_to, 1, 0, CW, fill='clear') if head else a.copy()
        b = tuft(b, tuft_dx, 2 + head)
        for (y0, y1, x0, x1, dx) in tail_dx_rows:
            b = shift_cols(b, y0, y1, x0, x1, dx, fill='clear')
        return b

    t = tail_a or []
    return [s, walk(s, True), walk(s, False),
            idle(s, 1, 1, [(25, 27, 5, 10, -1), (27, 30, 5, 11, -1)]),
            idle(s, 0, 1, [(27, 30, 5, 11, -1)]),
            idle(s, 1, -1, [(24, 27, 5, 10, -1), (27, 30, 5, 11, -2)])]


# --------------------------------------------------------------------------------------------------
# atlas / json
# --------------------------------------------------------------------------------------------------

def stats(frame):
    a = np.array(frame)
    ys, xs = np.where(a[..., 3] > 0)
    y1 = ys.max()
    foot = np.where(a[max(0, y1 - 5):y1 + 1, :, 3] > 0)[1]
    return dict(x0=int(xs.min()), y0=int(ys.min()), x1=int(xs.max()), y1=int(y1), w=int(xs.max() - xs.min() + 1),
                h=int(y1 - ys.min() + 1), foot_cx=round(float(foot.mean() + 0.5), 2))


def centre_row(frames_row, target=16.0):
    """Satu geser x per baris (kaki berdiri ~x=16), diterapkan ke semua frame baris (tanpa merusak gerak)."""
    a0 = np.array(frames_row[0])
    y1 = np.where((a0[..., 3] > 0).any(1))[0].max()
    xs = np.where(a0[y1 - 5:y1 + 1, :, 3] > 0)[1]
    d = int(round(target - (xs.mean() + 0.5)))
    if not d:
        return frames_row, 0
    return [Image.fromarray(np.roll(np.array(f), d, axis=1), 'RGBA') for f in frames_row], d


def write_atlas(cid, rows, meta, cols=COLS, walk=WALK, idle=IDLE, col_order=None):
    """rows: dict arah -> list[6 Image]."""
    atlas = Image.new('RGBA', (cols * CW, 4 * CH), (0, 0, 0, 0))
    frames = {}
    COLS_ = cols
    for r, d in enumerate(DIR_ROWS):
        for c, f in enumerate(rows[d]):
            atlas.paste(f, (c * CW, r * CH))
            name = f'{FRAME_PREFIX[d]}_{c}'
            frames[name] = {'rect': [c * CW, r * CH, CW, CH], 'pivot': [16, 46], 'bbox': stats(f)}
    os.makedirs(OUT_DIR, exist_ok=True)
    png = os.path.join(OUT_DIR, f'{cid}_explore.png')
    atlas.save(png, optimize=True)
    anims = {}
    for r, d in enumerate(DIR_ROWS):
        anims[d] = {'idle': {'frames': [r * cols + i for i in idle], 'fps': 3},
                    'walk': {'frames': [r * cols + i for i in walk], 'fps': 7}}
    js = {
        'entity_id': cid,
        'status': 'DRAFT',
        'review': 'NEEDS_REVIEW',
        'generated_by': 'web/scripts/author_cast_build.py (+ web/scripts/author_cast_sprites.py, sprite-data/%s_maps.txt)' % cid,
        'sprint': 'Polish Sprint 2',
        'frame_size': [CW, CH],
        'atlas_size': [cols * CW, 4 * CH],
        'cols': cols,
        'grid': {'cols': cols, 'rows': 4, 'row_order': ['front(down)', 'left', 'right', 'back(up)'],
                 'col_order': col_order or ['stand', 'walk_A', 'walk_B', 'idle_1', 'idle_2', 'idle_3']},
        'pivot': [16, 46],
        'baseline_y': 46,
        'frames': frames,
        'anims': anims,
        'notes': meta['notes'],
        'frames_needing_artist_redraw': meta['redraw'],
    }
    with open(os.path.join(OUT_DIR, f'{cid}_explore.json'), 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(js, fh, indent=2, ensure_ascii=False)
        fh.write('\n')
    return atlas, js


# --------------------------------------------------------------------------------------------------
# karakter
# --------------------------------------------------------------------------------------------------

def centre_shift(frames, target=16.0):
    """Hitung geser x bulat (kaki berdiri ~target) dari frame 0 (numpy interior)."""
    a0 = frames[0]
    y1 = np.where((a0[..., 3] > 0).any(1))[0].max()
    xs = np.where(a0[y1 - 5:y1 + 1, :, 3] > 0)[1]
    return int(round(target - (xs.mean() + 0.5)))


def build_from_maps(cid, derive_fb, derive_sd, staff=False, tap=(4,)):
    """Peta tangan -> baris atlas. staff: lapisan tongkat (front_staff/side_staff/back_staff) ditempel setelah penengahan;
    tap = indeks frame (0..5) di mana tongkat terangkat 1 px (ketukan idle)."""
    global _PAL
    legend, maps = parse_maps(os.path.join(DATA_DIR, f'{cid}_maps.txt'))
    _PAL = np.array([[int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16)] for v in legend.values()], np.uint8)
    stand = {k: np.array(render_map(legend, maps[k])) for k in maps}
    raw = {'down': derive_fb(stand['front']), 'up': derive_fb(stand['back'])}
    sd = derive_sd(stand['side'])
    raw['right'] = sd
    raw['left'] = [flip(f) for f in sd]
    layer = {'down': 'front_staff', 'up': 'back_staff', 'right': 'side_staff'}
    out = {}
    for d, frames in raw.items():
        dx = centre_shift(frames)
        frames = [np.roll(f, dx, axis=1) for f in frames]
        if staff:
            st = stand[layer.get(d, 'side_staff')]
            if d == 'left':
                st = flip(st)
            st = np.roll(st, dx, axis=1)
            fr2 = []
            for i, f in enumerate(frames):
                sv = shift_rows(st, 10, 46, -1, 0, CW, fill='clear') if i in tap else st
                fr2.append(over(f, sv))
            frames = fr2
        out[d] = [finish(f) for f in frames]
    return out


def finish(a):
    return add_outline(Image.fromarray(a, 'RGBA'))


def build_c08():
    rows = build_from_maps('C08', lambda s: derive_frontback(s), lambda s: derive_side(s))
    meta = {
        'notes': [
            'Polish Sprint 2: atlas eksplorasi Nambo ditulis ulang. Berdiri (down/up/right) dilukis tangan sebagai peta piksel RLE '
            '(web/scripts/sprite-data/C08_maps.txt) berpedoman C08_TURNAROUND_FRONT/SIDE/BACK dan palet turnaround; kepala dengan proporsi chibi.',
            'left = cermin right (SIDE menghadap kanan). Cermin: bayangan/aksesori asimetris (gesper, bandana pipi) ikut terbalik.',
            'Jalan (4 frame/arah, pola berdiri-langkah A-berdiri-langkah B): kaki terangkat 2 px lewat penghapusan 2 baris celana (depan/belakang) '
            'atau dua salinan kaki bergeser 3 px (samping, kaki jauh digelapkan), badan turun 1 px, lengan berayun 1 px. Turunan dari frame berdiri, bukan gambar tiap frame.',
            'Idle (4 frame/arah): kepala+syal turun 1 px (napas), kibasan rambut 1 px, ekor syal (samping) berayun 1-2 px, kaki tetap.',
            'Outline 1 px otomatis (coklat gelap berkeluarga sama dengan Yaric: warna tetangga digelapkan). Alpha keras, tanpa blur, palet < 32 warna.',
        ],
        'redraw': [
            'Semua frame: DRAFT turunan tangan+algoritma; frame jalan memakai pemendekan/geser kaki, bukan gambar ulang tiap pose.',
            'right/left: cermin; ekor syal samping lebar 3-4 px (pelat) belum seanggun turnaround; wajah samping minimal.',
        ],
    }
    return rows, meta


def build_c03():
    rows = build_from_maps('C03', lambda s: derive_frontback(s, arm_cols=((4, 8), (24, 28))), lambda s: derive_side(s), staff=True)
    meta = {
        'notes': [
            'Polish Sprint 2: atlas eksplorasi Torvan baru. Berdiri down/up/right dilukis tangan (web/scripts/sprite-data/C03_maps.txt) dari C03_TURNAROUND_FRONT/SIDE/BACK; '
            'tongkat ranting (C03_WEAPON_TWIG_STAFF) dilukis sebagai lapisan terpisah yang ditempel di atas tiap frame.',
            'left = cermin right. Plester pipi/tali tas ikut terbalik.',
            'Jalan: kaki terangkat 2 px (pemendekan celana) atau dua salinan kaki bergeser (samping), badan turun 1 px, lengan berayun 1 px; tongkat tetap (tongkat jalan).',
            'Idle: kepala+syal turun 1 px, kibasan ahoge/rambut 1 px, ekor syal (samping) berayun, ketukan tongkat (terangkat 1 px pada idle_2).',
            'Outline 1 px otomatis, alpha keras, palet < 32 warna.',
        ],
        'redraw': [
            'Semua frame DRAFT: turunan tangan + algoritma (bukan gambar per pose). Wajah tertawa tampak depan disederhanakan (mata tertutup 2 px, mulut 4x2).',
            'Tongkat statis saat jalan; tampak samping tongkat melintang di depan tubuh (belum digenggam secara visual).',
        ],
    }
    return rows, meta


def derive_dress(s, side=False):
    """Gaun panjang: bob badan 1 px (kepala..ikat pinggang), hem bergoyang 1 px, ujung sepatu bergantian; idle sangat tertahan."""
    HEM = (38, 45)

    def hem(a, dx):
        return shift_cols(a, HEM[0], HEM[1], 2, 30, dx, fill='rep') if dx else a.copy()

    def walk(a, k):
        b = shift_rows(a, 2, 23, 1, 0, CW, fill='clear')
        b = hem(b, k)
        if side:
            toe = b[45].copy()
            b[45] = 0
            xs = np.where(toe[:, 3] > 0)[0]
            for x in xs:
                if 0 < x + 2 * k < CW - 1:
                    b[45, x + 2 * k] = toe[x]
        else:
            if k > 0:
                b[45, :16] = 0     # kaki kiri terangkat (tersembunyi di bawah rok)
            else:
                b[45, 16:] = 0
        return b

    def idle(a, head, dx):
        b = shift_rows(a, 2, 16, 1, 0, CW, fill='clear') if head else a.copy()
        return hem(b, dx)

    return [s, walk(s, 1), walk(s, -1), idle(s, 1, 0), idle(s, 0, 1), idle(s, 1, -1)]


def build_c02():
    rows = build_from_maps('C02', lambda s: derive_dress(s), lambda s: derive_dress(s, side=True))
    meta = {
        'notes': [
            'Polish Sprint 2: atlas eksplorasi Velthia baru. Berdiri down/up/right dilukis tangan (web/scripts/sprite-data/C02_maps.txt) dari C02_TURNAROUND_FRONT/SIDE/BACK '
            '(bob coklat-tembaga, anting emas, kerah tinggi plum, jubah berlis emas, gaun plum+panel krem, hem emas).',
            'left = cermin right. Proporsi chibi-dewasa: kepala 12 baris, gaun sampai lantai; sepatu hanya ujungnya mengintip.',
            'Jalan: badan bob 1 px, hem rok bergoyang 1 px bergantian, ujung sepatu bergantian (depan/belakang: satu ujung disembunyikan; samping: ujung maju/mundur 2 px). Tidak ada ayunan lengan (lengan tertutup jubah).',
            'Idle sangat tertahan: kepala+kerah turun 1 px (napas), hem bergoyang 1 px; tidak ada gerak lain. Outline 1 px otomatis, alpha keras.',
        ],
        'redraw': [
            'Semua frame DRAFT turunan tangan + algoritma. Lengan/tangan hampir tak terlihat (tangan kanan viewer saja); belahan rok/kaki tidak terlihat sehingga langkah hanya tersirat lewat hem/ujung sepatu.',
            'Tampak samping disederhanakan (bahu terbuka, jubah belakang sebagai satu massa plum).',
        ],
    }
    return rows, meta


FALLBACK_NAMES = {'C05': 'Azie', 'C06': 'Talric', 'C07': 'Zira', 'C09': 'Derrria'}


def build_fallback(cid):
    """Atlas ternormalisasi lama dipertahankan (6 kolom asli) + 3 kolom idle turunan (9 kolom). Idle = pergeseran lapisan baris nyata:
    kepala+bahu 1 px (napas), baris hem/jubah 1 px ke samping, kaki tetap."""
    src = os.path.join(ROOT, 'web', 'public', 'assets', 'characters', 'normalized', f'{cid}_explore.png')
    im = np.array(Image.open(src).convert('RGBA'))
    rows = {}
    for r, d in enumerate(DIR_ROWS):
        cs = [im[r * CH:(r + 1) * CH, c * CW:(c + 1) * CW].copy() for c in range(6)]
        s0 = cs[0]
        ys = np.where((s0[..., 3] > 0).any(1))[0]
        top = int(ys.min())

        def head(a, k=1):
            return shift_rows(a, top, top + 16, k, 0, CW, fill='clear')

        def hem(a, dx):
            return shift_cols(a, 30, 44, 2, 30, dx, fill='rep')
        i1 = head(s0)
        i2 = hem(s0, 1)
        i3 = hem(head(s0), -1)
        rows[d] = [Image.fromarray(f, 'RGBA') for f in cs + [i1, i2, i3]]
    nm = FALLBACK_NAMES[cid]
    meta = {
        'notes': [
            f'Polish Sprint 2: {nm} BELUM diautor ulang. Kolom 0-5 = salinan byte-identik atlas ternormalisasi Sprint 1 (prototipe DRAFT kasar: badan sama untuk semua arah, kepala beda). '
            'Kolom 6-8 = idle turunan dari kolom 0 dengan pergeseran lapisan baris: idle_1 kepala+bahu turun 1 px; idle_2 baris hem/badan bawah geser 1 px ke kanan; idle_3 kepala turun + hem geser 1 px kiri. Kaki tetap, tanpa skala/blur.',
            'Jalan memakai frame asli 2-5 (kepala naik-turun 1 px, tanpa gerak kaki).',
        ],
        'redraw': ['Seluruh karakter: tetap perlu redraw berpedoman Cxx_TURNAROUND_*; hanya idle yang ditambahkan.'],
    }
    return rows, meta


def fallback_write(cid):
    rows, meta = build_fallback(cid)
    names = ['stand', 'old_idle_1', 'old_walk_0', 'old_walk_1', 'old_walk_2', 'old_walk_3', 'idle_1', 'idle_2', 'idle_3']
    names = ['old_0', 'old_1', 'old_2', 'old_3', 'old_4', 'old_5', 'idle_1', 'idle_2', 'idle_3']
    return write_atlas(cid, rows, meta, cols=9, walk=[2, 3, 4, 5], idle=[0, 6, 7, 8], col_order=names), rows


BUILDERS = {'C08': build_c08, 'C03': build_c03, 'C02': build_c02}


def cells(path, cols=6, rows=4):
    im = Image.open(path).convert('RGBA')
    return [im.crop((c * CW, r * CH, (c + 1) * CW, (r + 1) * CH)) for r in range(rows) for c in range(cols)]


def composite(cid, rows):
    """Nambo/karakter di samping sprite Yaric ternormalisasi dan portrait (cek identitas & skala), 8x, garis y=46."""
    pw = os.path.join(ROOT, 'web', 'public', 'assets', 'portraits_hd', f'{cid}_NEUTRAL.png')
    yar = cells(os.path.join(ROOT, 'web', 'public', 'assets', 'characters', 'normalized', 'C01_explore.png'))
    old = cells(os.path.join(ROOT, 'web', 'public', 'assets', 'characters', 'normalized', f'{cid}_explore.png'))
    sc = 8
    picks = [('old', old[0]), ('NEW', rows['down'][0]), ('Yaric', yar[0]), ('NEW', rows['left'][0]), ('NEW', rows['right'][0]),
             ('NEW', rows['up'][0]), ('Yaric', yar[18])]
    W = len(picks) * CW * sc + 400
    H = CH * sc
    img = Image.new('RGBA', (W, H), (90, 90, 100, 255))
    x = 0
    for _, f in picks:
        img.paste(f.resize((CW * sc, CH * sc), Image.NEAREST), (x, 0), f.resize((CW * sc, CH * sc), Image.NEAREST))
        x += CW * sc
    if os.path.exists(pw):
        p = Image.open(pw).convert('RGBA')
        p.thumbnail((380, H), Image.LANCZOS)
        img.paste(p, (x + 10, 0), p)
    px = img.load()
    for xx in range(len(picks) * CW * sc):
        px[xx, 47 * sc] = (255, 60, 60, 255)
    img.save(os.path.join(QA_DIR, f'composite_{cid}.png'))


def main():
    ids = [a for a in sys.argv[1:]] or (list(BUILDERS) + list(FALLBACK_NAMES))
    os.makedirs(QA_DIR, exist_ok=True)
    for cid in ids:
        if cid in FALLBACK_NAMES:
            (atlas, js), rows = fallback_write(cid)
            frames = [rows[d][c] for d in DIR_ROWS for c in range(9)]
            sheet(frames, 6, os.path.join(QA_DIR, f'after_{cid}.png'), cols=9)
            sheet(cells(os.path.join(ROOT, 'web', 'public', 'assets', 'characters', 'normalized', f'{cid}_explore.png')), 6,
                  os.path.join(QA_DIR, f'before_{cid}.png'), cols=6)
            print(cid, 'fallback ok')
            continue
        rows, meta = BUILDERS[cid]()
        atlas, js = write_atlas(cid, rows, meta)
        frames = [rows[d][c] for d in DIR_ROWS for c in range(COLS)]
        sheet(frames, 8, os.path.join(QA_DIR, f'after_{cid}.png'), cols=COLS)
        sheet(cells(os.path.join(ROOT, 'web', 'public', 'assets', 'characters', 'normalized', f'{cid}_explore.png')), 8,
              os.path.join(QA_DIR, f'before_{cid}.png'), cols=COLS)
        composite(cid, rows)
        h = hashlib.sha256(open(os.path.join(OUT_DIR, f'{cid}_explore.png'), 'rb').read()).hexdigest()[:12]
        print(cid, 'ok', atlas.size, h)


if __name__ == '__main__':
    main()
