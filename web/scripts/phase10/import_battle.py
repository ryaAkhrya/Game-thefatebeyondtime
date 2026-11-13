"""Prepare twelve independently generated battle poses without repainting source art.

All cells share one scale and palette. Standing feet use one ground line; attack
extensions do not recenter the body. Original four-pose placeholder atlases stay
untouched as historical source copies. Run from the project root with actor IDs.
"""
from pathlib import Path
import hashlib
import json
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
SOURCES = ROOT / 'assets/phase10/sources'
OUTPUT = ROOT / 'web/public/assets/battle'
REVIEW = ROOT / 'docs/production/phase10/battle'
KEYS = ['idle_a', 'idle_b', 'anticipation', 'attack', 'followthrough', 'recovery',
        'hit_recoil', 'hit_recover', 'death_start', 'defeated', 'charge', 'cast']
DURATION = [520, 520, 260, 150, 180, 300, 180, 220, 280, 600, 300, 220]
SPECS = {'C03': (112, 96, 72, 'left'), 'M02': (128, 112, 76, 'right'),
         'M03': (112, 112, 72, 'right'), 'B02': (160, 128, 108, 'right')}


def prepare(cid):
    width, height, target_height, facing = SPECS[cid]
    source_path = SOURCES / f'{cid}_battle.png'
    source = Image.open(source_path).convert('RGBA')
    cells = []
    for index in range(12):
        col, row = index % 4, index // 4
        cell = source.crop((col * source.width // 4, row * source.height // 3,
                            (col + 1) * source.width // 4, (row + 1) * source.height // 3))
        rgba = np.array(cell)
        rgba[:, :, 3] = np.where(rgba[:, :, 3] >= 192, 255, 0)
        cell = Image.fromarray(rgba)
        box = cell.getbbox()
        if not box:
            raise ValueError(f'{cid} missing pose {index}')
        cells.append(cell.crop(box))
    scale = target_height / ((cells[0].height + cells[1].height) / 2)
    # Fit the largest attack/death extension, using ONE scale for all poses.
    scale = min(scale, *(min((width - 6) / cell.width, (height - 6) / cell.height) for cell in cells))
    packed = []
    for index, cell in enumerate(cells):
        cell = cell.resize((max(1, round(cell.width * scale)), max(1, round(cell.height * scale))), Image.Resampling.NEAREST)
        rgba = np.array(cell)
        yy, xx = np.where(rgba[:, :, 3] > 0)
        # Root/foot center, not the maximum reach of an attacking arm or staff.
        low = yy >= max(0, int(yy.max()) - max(2, round(cell.height * 0.055)))
        anchor = float(np.mean(xx[low])) if index != 9 and cid != 'M03' else (cell.width - 1) / 2
        x = round(width / 2 - anchor)
        x = max(2, min(width - cell.width - 2, x))
        # Wisplet floats inside its native frame, then lands on defeat. A global
        # scene offset would incorrectly keep its collapsed rings in the air.
        gap = (0 if index == 9 else 6 if index == 8 else 12) if cid == 'M03' else 0
        y = height - 2 - int(yy.max()) - gap
        frame = Image.new('RGBA', (width, height))
        frame.paste(cell, (x, y))
        packed.append(np.array(frame))
    sample = np.concatenate([pixels[pixels[:, :, 3] > 0, :3] for pixels in packed])
    palette = Image.fromarray(sample.reshape((1, -1, 3))).quantize(colors=48, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    atlas = Image.new('RGBA', (width * 4, height * 3))
    meta = {'entity_id': cid, 'status': 'NEEDS_REVIEW', 'review': 'HUMAN_REVIEW_PENDING',
            'phase': 'Phase 10', 'facing': facing, 'frame_size': [width, height],
            'atlas_size': [width * 4, height * 3], 'foot_pivot': [width // 2, height - 2],
            'source': str(source_path.relative_to(ROOT)).replace('\\', '/'),
            'source_sha256': hashlib.sha256(source_path.read_bytes()).hexdigest(),
            'provenance': 'Twelve imagegen-authored poses from existing fictional concept references; no placeholder pose aliases.',
            'notes': 'Native nearest grid preparation; hard alpha; one closed palette and shared scale. Human animation review pending.',
            'generated_by': 'web/scripts/phase10/import_battle.py', 'frames': {},
            'event': {'frame_key': 'attack', 'index_0_based': 3}}
    if cid == 'M03':
        meta['flight_gap_px'] = 12
        meta['notes'] += ' Flight gap is inside active frames; death_start lowers halfway and defeated rests on the floor.'
    for index, pixels in enumerate(packed):
        pixels[:, :, :3] = np.array(Image.fromarray(pixels[:, :, :3]).quantize(palette=palette, dither=Image.Dither.NONE).convert('RGB'))
        pixels[pixels[:, :, 3] == 0] = 0
        col, row = index % 4, index // 4
        atlas.paste(Image.fromarray(pixels), (col * width, row * height))
        meta['frames'][KEYS[index]] = {'index_0_based': index, 'rect': [col * width, row * height, width, height],
                                      'pivot': [width // 2, height - 2], 'duration_ms': DURATION[index]}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT / f'{cid}_BATTLE_V2.png')
    if cid == 'B02':
        # Dedicated world-scale pixels: never shrink the battle sprite at runtime.
        from PIL import ImageOps
        idle = Image.fromarray(packed[0])
        idle = idle.crop(idle.getbbox())
        idle = ImageOps.contain(idle, (60, 56), method=Image.Resampling.NEAREST)
        encounter = Image.new('RGBA', (64, 64))
        encounter.paste(idle, ((64 - idle.width) // 2, 63 - idle.height))
        encounter_path = ROOT / 'web/public/assets/chapter2/B02_encounter.png'
        encounter_path.parent.mkdir(parents=True, exist_ok=True)
        encounter.save(encounter_path)
    (OUTPUT / f'{cid}_BATTLE_V2.json').write_text(json.dumps(meta, indent=2) + '\n', encoding='utf-8', newline='\n')
    REVIEW.mkdir(parents=True, exist_ok=True)
    board = Image.new('RGB', (width * 4 * 3, (height * 3 + 30) * 3), '#51493f')
    enlarged = atlas.resize((width * 4 * 3, height * 3 * 3), Image.Resampling.NEAREST)
    board.paste(enlarged, (0, 45), enlarged)
    ImageDraw.Draw(board).text((8, 8), f'{cid} / idle, idle, wind-up, contact / follow-through, recovery, recoil, recover / defeat-start, defeated, charge, cast', fill='#f1dfc4')
    board.save(REVIEW / f'{cid}_contact.png')
    print(f'{cid}: twelve full battle poses, {width}x{height}, one 48-color palette, facing {facing}.')


if __name__ == '__main__':
    for actor in sys.argv[1:] or SPECS:
        if actor not in SPECS:
            raise ValueError('Only the four reviewed fictional battle actors are supported')
        prepare(actor)
