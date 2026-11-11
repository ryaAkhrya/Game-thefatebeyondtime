#!/usr/bin/env python
"""QA artefacts for the Yaric Sprint 2 atlas (contact sheets + pixel-diff report).

    python -I web/scripts/yaric-sprites-qa.py

Writes to .dev-cache/test-artifacts/sprint2/yaric/ :
  before_8x.png, after_walk_8x.png, after_idle_8x.png, after_sprint_8x.png, after_all_8x.png (8x, red line = y 46, white = cell)
  crown_before_after_16x.png, diff-report.md, diff-report.json
"""
import importlib.util
import json
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('author', os.path.join(HERE, 'author-yaric-sprites.py'))
au = importlib.util.module_from_spec(spec)
spec.loader.exec_module(au)

OUT = os.path.join(au.ROOT, '.dev-cache/test-artifacts/sprint2/yaric')
os.makedirs(OUT, exist_ok=True)
FINAL = os.path.join(au.OUT_DIR, 'C01_explore.png')


def sheet(frames, cols, scale, path, labels=None):
    rows = (len(frames) + cols - 1) // cols
    S = Image.new('RGBA', (cols * au.FW * scale, rows * au.FH * scale), (60, 110, 140, 255))
    d = ImageDraw.Draw(S)
    for i, f in enumerate(frames):
        cx, cy = (i % cols) * au.FW * scale, (i // cols) * au.FH * scale
        for y in range(au.FH):
            for x in range(au.FW):
                p = f[y][x]
                if p[3]:
                    d.rectangle([cx + x * scale, cy + y * scale, cx + x * scale + scale - 1, cy + y * scale + scale - 1], fill=p)
        d.rectangle([cx, cy, cx + au.FW * scale - 1, cy + au.FH * scale - 1], outline=(255, 255, 255, 255))
        d.line([cx, cy + (au.FOOT_Y + 1) * scale, cx + au.FW * scale - 1, cy + (au.FOOT_Y + 1) * scale], fill=(255, 0, 0, 255))
        d.line([cx + 16 * scale + scale // 2, cy + 40 * scale, cx + 16 * scale + scale // 2, cy + 48 * scale], fill=(0, 255, 0, 255))
    S.save(path)


def diff_count(a, b, dx=0, dy=0, rows=None):
    n = 0
    ys = range(au.FH) if rows is None else range(rows[0], rows[1] + 1)
    for y in ys:
        for x in range(au.FW):
            ox, oy = x - dx, y - dy
            pb = b[oy][ox] if 0 <= ox < au.FW and 0 <= oy < au.FH else au.T
            if a[y][x] != pb:
                n += 1
    return n


def best_aligned_diff(a, b):
    """smallest diff over whole-sprite translations dx,dy in -2..2: > 0 proves real pixel changes, not just a shift"""
    return min(diff_count(a, b, dx, dy) for dx in range(-2, 3) for dy in range(-2, 3))


REGIONS = {'hair(1-11)': (1, 11), 'torso(12-24)': (12, 24), 'cloak-hem(25-38)': (25, 38), 'feet(40-46)': (40, 46)}


def main():
    before = au.load_atlas(au.SRC_PNG)
    after = au.load_atlas(FINAL)
    sheet([before[(r, c)] for r in range(4) for c in range(4)], 4, 8, os.path.join(OUT, 'before_8x.png'))
    sheet([after[(r, c)] for r in range(4) for c in range(4)], 4, 8, os.path.join(OUT, 'after_walk_8x.png'))
    sheet([after[(r, c)] for r in range(4, 8) for c in range(4)], 4, 8, os.path.join(OUT, 'after_idle_8x.png'))
    sheet([after[(r, c)] for r in range(8, 14) for c in range(4)], 4, 8, os.path.join(OUT, 'after_sprint_8x.png'))
    sheet([after[(r, c)] for r in range(au.N_ROWS) for c in range(4)], 4, 6, os.path.join(OUT, 'after_all_6x.png'))
    # crown before/after 16x (head rows 0..19)
    crops = []
    for src in (before, after):
        for c in range(4):
            f = src[(3, c)]
            crops.append([row[:] for row in f[:20]] + [[au.T] * au.FW for _ in range(au.FH - 20)])
    S = Image.new('RGBA', (4 * 32 * 16, 2 * 20 * 16), (60, 110, 140, 255))
    sheet_tmp = os.path.join(OUT, '_tmp.png')
    sheet(crops, 4, 16, sheet_tmp)
    t = Image.open(sheet_tmp)
    for i in range(2):
        S.paste(t.crop((0, i * 48 * 16, 4 * 32 * 16, i * 48 * 16 + 20 * 16)), (0, i * 20 * 16))
    S.save(os.path.join(OUT, 'crown_before_after_16x.png'))
    os.remove(sheet_tmp)

    report = {'idle': {}, 'sprint_vs_walk': {}, 'feet': {}, 'foot_centre': {}}
    md = ['# Yaric Sprint 2 - pixel diff report', '',
          'Regions are y bands of the 32x48 cell. "aligned" = smallest difference after the best whole-sprite translation (dx,dy in -2..2); >0 means the frames differ by real pixels, not only by a shift.', '']
    for d, name in enumerate(au.DIRS):
        fr = [after[(au.IDLE_ROW0 + d, k)] for k in range(4)]
        md += [f'## idle {name}', '', '| pair | total px | aligned | ' + ' | '.join(REGIONS) + ' |', '|---|---|---|' + '---|' * len(REGIONS)]
        report['idle'][name] = {}
        for i in range(4):
            for j in range(i + 1, 4):
                tot = diff_count(fr[i], fr[j])
                al = best_aligned_diff(fr[i], fr[j])
                reg = {k: diff_count(fr[i], fr[j], rows=v) for k, v in REGIONS.items()}
                report['idle'][name][f'{i}-{j}'] = {'total': tot, 'aligned': al, 'regions': reg}
                md.append(f'| {i}-{j} | {tot} | {al} | ' + ' | '.join(str(reg[k]) for k in REGIONS) + ' |')
        md.append('')
        # feet rows unchanged relative to the standing pose (idle frame 0 == walk frame 0 of that direction, up with crown fix)
        base = after[(d, 0)]
        feet = [diff_count(fr[k], base, rows=(40, 46)) for k in range(4)]
        report['feet'][name] = feet
        md.append(f'Feet rows y=40..46 diff vs standing pose (idle0..3): {feet} -> {"UNCHANGED" if sum(feet) == 0 else "CHANGED"}')
        md.append('')
    md += ['## sprint vs walk', '', '| dir | sprint k | min diff vs any walk frame (aligned) | foot centre x (lowest 8 rows) | bottom row y |', '|---|---|---|---|---|']
    for d, name in enumerate(au.DIRS):
        walks = [after[(d, k)] for k in range(4)]
        report['sprint_vs_walk'][name] = []
        report['foot_centre'][name] = {'walk': [au.foot_centre(w) for w in walks], 'idle': [au.foot_centre(after[(au.IDLE_ROW0 + d, k)]) for k in range(4)], 'sprint': []}
        for k in range(6):
            sp = after[(au.SPRINT_ROW0 + k, d)]
            m = min(best_aligned_diff(sp, w) for w in walks)
            fc = au.foot_centre(sp)
            ys = [y for y in range(au.FH) if any(au.opaque(p) for p in sp[y])]
            report['sprint_vs_walk'][name].append(m)
            report['foot_centre'][name]['sprint'].append(fc)
            md.append(f'| {name} | {k} | {m} | {fc} | {ys[-1]} |')
    md += ['', '## foot centre (x centroid of lowest 8 rows)', '', '```', json.dumps(report['foot_centre'], indent=1), '```', '']
    open(os.path.join(OUT, 'diff-report.md'), 'w', encoding='utf8').write('\n'.join(md))
    json.dump(report, open(os.path.join(OUT, 'diff-report.json'), 'w'), indent=1)
    print('ok', OUT)


if __name__ == '__main__':
    main()
