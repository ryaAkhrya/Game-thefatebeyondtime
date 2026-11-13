"""Pack imagegen-authored fictional turnarounds into the existing native sprite contract.

Source artwork is retained in assets/phase10/sources. This preparation step only
extracts cells, contains them on the 32x48 grid, limits the palette, and builds
integer-pixel limb/cloth animation. It never reads personal anniversary inputs.
Run from the project root: python -I web/scripts/phase10/import_sprites.py C02
"""
from pathlib import Path
import hashlib
import io
import json
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'assets/phase10/sources'
OUTPUT = ROOT / 'web/public/assets/characters/final'
REVIEW = ROOT / 'docs/production/phase10/cast'
DIRECTIONS = ['down', 'left', 'right', 'up']
PREFIX = ['front', 'left', 'right', 'back']
CELLS = {'down': (0, 0), 'up': (1, 0), 'left': (0, 1), 'right': (1, 1)}
GOWNS = {'C02', 'C05', 'C07', 'C09'}


def native_views(path, height=46):
    source = Image.open(path).convert('RGBA')
    views = {}
    for direction, (col, row) in CELLS.items():
        w, h = source.size
        part = source.crop((col * w // 2, row * h // 2, (col + 1) * w // 2, (row + 1) * h // 2))
        pixels = np.array(part)
        pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 192, 255, 0)
        part = Image.fromarray(pixels)
        bounds = part.getbbox()
        if not bounds:
            raise ValueError(f'Empty source view: {direction}')
        part = part.crop(bounds)
        scale = min(28 / part.width, height / part.height)
        part = part.resize((max(1, round(part.width * scale)), max(1, round(part.height * scale))), Image.Resampling.NEAREST)
        # Nearest sampling can leave an empty outer row; align the actual sole.
        part = part.crop(part.getbbox())
        canvas = Image.new('RGBA', (32, 48))
        canvas.paste(part, ((32 - part.width) // 2, 47 - part.height))
        views[direction] = np.array(canvas)
    # A single 32-color palette for all four views. No dithering or new blur.
    samples = np.concatenate([a[a[:, :, 3] == 255, :3] for a in views.values()])
    sample_image = Image.fromarray(samples.reshape((1, -1, 3)))
    palette_image = sample_image.quantize(colors=32, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    for direction, pixels in views.items():
        rgb = Image.fromarray(pixels[:, :, :3]).quantize(palette=palette_image, dither=Image.Dither.NONE).convert('RGB')
        pixels[:, :, :3] = np.array(rgb)
        pixels[pixels[:, :, 3] == 0] = 0
    return views


def shift_region(pixels, box, dx=0, dy=0):
    x0, y0, x1, y1 = box
    original = pixels[y0:y1, x0:x1].copy()
    result = pixels.copy()
    result[y0:y1, x0:x1] = 0
    for yy in range(y1 - y0):
        for xx in range(x1 - x0):
            x, y = x0 + xx + dx, y0 + yy + dy
            if 1 <= x <= 30 and 1 <= y <= 46 and original[yy, xx, 3]:
                result[y, x] = original[yy, xx]
    return result


def animation(base, direction, gown):
    frames = [base.copy()]
    for sign in (1, -1):
        walk = shift_region(base, (1, 1, 31, 27), dy=1)
        if gown:
            walk = shift_region(walk, (2, 31, 30, 43), dx=sign)
        if direction in ('down', 'up'):
            half = (1, 43 if gown else 36, 16, 47) if sign > 0 else (16, 43 if gown else 36, 31, 47)
            walk = shift_region(walk, half, dy=-1)
            walk = shift_region(walk, (3, 18, 8, 30), dy=sign)
            walk = shift_region(walk, (24, 18, 29, 30), dy=-sign)
        else:
            walk = shift_region(walk, (3, 43 if gown else 40, 29, 47), dx=sign)
        frames.append(walk)
    # Feet remain identical during idle; hair/shoulders/cloth move independently.
    breath = shift_region(base, (1, 1, 31, 24), dy=1)
    cloth = shift_region(base, (2, 32, 30, 43), dx=1)
    settle = shift_region(breath, (2, 32, 30, 43), dx=-1)
    frames.extend([breath, cloth, settle])
    return frames


def bounds(pixels):
    yy, xx = np.where(pixels[:, :, 3] > 0)
    if not len(xx):
        raise ValueError('Empty packed frame')
    return {'x0': int(xx.min()), 'y0': int(yy.min()), 'x1': int(xx.max()), 'y1': int(yy.max()),
            'w': int(xx.max() - xx.min() + 1), 'h': int(yy.max() - yy.min() + 1)}


def review_sheet(cid, frames):
    REVIEW.mkdir(parents=True, exist_ok=True)
    # Source from Git, so repeated preparation never compares the new atlas to itself.
    reference = ROOT / f'assets/phase10/references/{cid}_explore_before.png'
    if not reference.exists():
        old_bytes = subprocess.run(['git', 'show', f'3a754a8:web/public/assets/characters/final/{cid}_explore.png'],
                                   cwd=ROOT, capture_output=True, check=True).stdout
        reference.parent.mkdir(parents=True, exist_ok=True)
        reference.write_bytes(old_bytes)
    old_bytes = reference.read_bytes()
    old = Image.open(io.BytesIO(old_bytes)).convert('RGBA')
    rows = 5
    sheet = Image.new('RGB', (6 * 32 * 6, rows * 48 * 6 + 80), '#34303d')
    draw = ImageDraw.Draw(sheet)
    draw.text((8, 5), f'{cid} / row 1: previous standing views; rows 2-5: new down,left,right,up', fill='#eee0c8')
    old_cols = old.width // 32
    for row in range(4):
        cell = old.crop((0, row * 48, 32, (row + 1) * 48))
        cell = cell.resize((192, 288), Image.Resampling.NEAREST)
        sheet.paste(cell, (row * 192, 30), cell)
    for row, direction in enumerate(DIRECTIONS):
        for col, pixels in enumerate(frames[direction]):
            cell = Image.fromarray(pixels).resize((192, 288), Image.Resampling.NEAREST)
            sheet.paste(cell, (col * 192, 30 + (row + 1) * 288), cell)
    sheet.save(REVIEW / f'{cid}_comparison.png')


def build(cid):
    if cid not in {'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09'}:
        raise ValueError(f'Unsupported fictional cast ID: {cid}')
    source = SOURCE / f'{cid}_turnaround.png'
    views = native_views(source, height=42 if cid == 'C03' else 46)
    frames = {direction: animation(views[direction], direction, cid in GOWNS) for direction in DIRECTIONS}
    atlas = Image.new('RGBA', (192, 192))
    metadata = {'entity_id': cid, 'status': 'NEEDS_REVIEW', 'review': 'HUMAN_REVIEW_PENDING',
                'generated_by': 'web/scripts/phase10/import_sprites.py', 'phase': 'Phase 10',
                'source': str(source.relative_to(ROOT)).replace('\\', '/'),
                'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                'provenance': 'Imagegen redraw from existing fictional character turnarounds; original references preserved.',
                'frame_size': [32, 48], 'atlas_size': [192, 192], 'cols': 6,
                'pivot': [16, 46], 'baseline_y': 46, 'frames': {}, 'anims': {},
                'notes': ['Four independently drawn views; left/right are not mirrored.',
                          'Nearest-neighbor grid preparation, hard alpha and shared 32-color palette.',
                          'Walk/idle are deterministic integer-pixel limb/cloth derivatives, not separately generated poses.']}
    for row, direction in enumerate(DIRECTIONS):
        for col, pixels in enumerate(frames[direction]):
            bbox = bounds(pixels)
            if bbox['y1'] != 46 or bbox['x0'] < 1 or bbox['x1'] > 30 or not 40 <= bbox['h'] <= 46:
                raise ValueError(f'{cid} {direction} {col}: invalid native bounds {bbox}')
            atlas.paste(Image.fromarray(pixels), (col * 32, row * 48))
            metadata['frames'][f'{PREFIX[row]}_{col}'] = {'rect': [col * 32, row * 48, 32, 48], 'pivot': [16, 46], 'bbox': bbox}
        metadata['anims'][direction] = {
            'idle': {'frames': [row * 6 + c for c in [0, 3, 4, 5]], 'fps': 3},
            'walk': {'frames': [row * 6 + c for c in [0, 1, 0, 2]], 'fps': 7}}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT / f'{cid}_explore.png')
    (OUTPUT / f'{cid}_explore.json').write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')
    review_sheet(cid, frames)
    print(f'{cid}: packed 24 frames, four independently drawn directions, 32 colors; review sheet saved.')


def prepare_ending():
    output = ROOT / 'web/public/assets/ending'
    output.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE / 'epilogue_seated.png').convert('RGBA')
    atlas = Image.new('RGBA', (240, 48))
    metadata = {'frame_size': [40, 48], 'pivot': [20, 36], 'fps': 2,
                'source': 'assets/phase10/sources/epilogue_seated.png',
                'provenance': 'Imagegen-authored seated anatomy from original C01/C02 back references; no standing-torso splice.',
                'status': 'NEEDS_REVIEW', 'frames': {},
                'idle': {'C01': [0, 1, 0, 2], 'C02': [3, 4, 3, 5]}}
    for actor, cid in enumerate(['C01', 'C02']):
        crop = source.crop((actor * source.width // 2, 0, (actor + 1) * source.width // 2, source.height))
        pixels = np.array(crop)
        pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 192, 255, 0)
        crop = Image.fromarray(pixels)
        crop = crop.crop(crop.getbbox())
        scale = min(36 / crop.width, 36 / crop.height)
        crop = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.NEAREST)
        rgb = crop.convert('RGB').quantize(colors=32, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
        rgb.putalpha(crop.getchannel('A'))
        canvas = Image.new('RGBA', (40, 48))
        canvas.paste(rgb, ((40 - rgb.width) // 2, 47 - rgb.height))
        stand = np.array(canvas)
        breath = stand.copy()
        # One-pixel breathing in head/upper cloak, with hands and seat fixed.
        breath[1:29] = 0
        for y in range(1, 29):
            mask = stand[y, :, 3] > 0
            breath[y + 1, mask] = stand[y, mask]
        settle = stand.copy()
        # A small loose cloak/dress fold changes without moving the seated hips.
        for y in range(24, 29):
            xs = np.flatnonzero(stand[y, :, 3])
            if len(xs) > 10:
                x = int(xs[len(xs) // 2])
                settle[y, x] = stand[y, x + 1]
        for index, frame in enumerate([stand, breath, settle]):
            position = actor * 3 + index
            atlas.paste(Image.fromarray(frame), (position * 40, 0))
            metadata['frames'][f'{cid}_{index}'] = {'rect': [position * 40, 0, 40, 48], 'pivot': [20, 36]}
    atlas.save(output / 'seated.png')
    (output / 'seated.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8', newline='\n')
    REVIEW.parent.mkdir(parents=True, exist_ok=True)
    atlas.resize((1440, 288), Image.Resampling.NEAREST).save(REVIEW.parent / 'seated_contact.png')
    print('Ending: packed dedicated seated C01/C02 poses with fixed seat anchors.')
    for name in ['cliff', 'modern']:
        path = SOURCE / f'{name}.png'
        if not path.exists():
            continue
        from PIL import ImageOps
        image = ImageOps.fit(Image.open(path).convert('RGB'), (640, 360), method=Image.Resampling.NEAREST)
        image = image.quantize(colors=96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
        image.save(output / f'{name}.png')
        print(f'Ending: prepared {name} background, 640x360, 96 colors.')
    memory_source = SOURCE / 'memories.png'
    if memory_source.exists():
        from PIL import ImageOps
        sheet = Image.open(memory_source).convert('RGB')
        for row, name in enumerate(['archive', 'heirloom', 'heart']):
            panel = sheet.crop((0, row * sheet.height // 3, sheet.width, (row + 1) * sheet.height // 3))
            panel = ImageOps.fit(panel, (640, 360), method=Image.Resampling.NEAREST)
            panel = panel.quantize(colors=96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
            panel.save(output / f'{name}.png')
            print(f'Ending: prepared {name} memory, 640x360, 96 colors.')


if __name__ == '__main__':
    for identifier in sys.argv[1:] or ['C02']:
        if identifier == '--ending':
            prepare_ending()
        else:
            build(identifier)
