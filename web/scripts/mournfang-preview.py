#!/usr/bin/env python
"""Preview + contrast metrics for B01_BATTLE_V4 (debug output only, .dev-cache/temp/mournfang/).
Run: python -I web/scripts/mournfang-preview.py"""
import json
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
BAT = os.path.join(REPO, 'web', 'public', 'assets', 'battle')
DBG = os.path.join(REPO, '.dev-cache', 'temp', 'mournfang')
os.makedirs(DBG, exist_ok=True)
GROUND, BACK = (0x65, 0x53, 0x3e), (0x30, 0x47, 0x34)


def lum(rgb):
    r, g, b = [c / 255.0 for c in rgb]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def cr(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def luma(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


atlas = Image.open(os.path.join(BAT, 'B01_BATTLE_V4.png')).convert('RGBA')
meta = json.load(open(os.path.join(BAT, 'B01_BATTLE_V4.json')))
old = Image.open(os.path.join(BAT, 'B01_BATTLE_ATLAS_DRAFT.png')).convert('RGBA')
yar = Image.open(os.path.join(BAT, 'C01_ATLAS_PIXEL_PASS_V3_3.png')).convert('RGBA').crop((0, 0, 96, 96))
idle = np.array(atlas.crop((0, 0, 160, 128)))
op = idle[..., 3] > 0
rgb = idle[..., :3].astype(float)
ol = np.array([0x1d, 0x16, 0x25])
is_ol = op & (np.abs(rgb - ol).sum(-1) < 3)
body = op & ~is_ol
print('opaque px', int(op.sum()), 'outline px', int(is_ol.sum()))
for nm, bg in (('ground', GROUND), ('backdrop', BACK)):
    bl = luma(np.array(bg, float))
    print(nm, 'outline-vs-bg luma diff %.1f' % abs(luma(ol.astype(float)) - bl),
          'WCAG contrast %.2f' % cr(tuple(ol), bg),
          'body mean luma diff %.1f' % abs(luma(rgb[body]).mean() - bl),
          'body min-edge: share of body px with |dL|>=25: %.2f' % (np.abs(luma(rgb[body]) - bl) >= 25).mean())
# silhouette edge only: ring of outline pixels is what separates beast from ground
print('outline luma', round(float(luma(ol.astype(float))), 1), 'ground luma', round(float(luma(np.array(GROUND, float))), 1),
      'backdrop luma', round(float(luma(np.array(BACK, float))), 1))
# old atlas for reference
o = np.array(old.crop((0, 0, 96, 96)))
oo = o[..., 3] > 0
print('OLD blob mean luma diff vs ground %.1f' % abs(luma(o[..., :3].astype(float)[oo]).mean() - luma(np.array(GROUND, float))))
yb = np.where(np.array(yar)[..., 3].any(1))[0]
print('Yaric frame opaque rows', yb.min(), yb.max(), 'height', yb.max() - yb.min() + 1)
ys = np.where(op.any(1))[0]
print('Mournfang idle height', ys.max() - ys.min() + 1, 'width', np.ptp(np.where(op.any(0))[0]) + 1)

# composite preview: ground band + backdrop, Yaric + Mournfang at 4x, plus the old blob
SC = 4
W, H = 380 * SC, 130 * SC
img = Image.new('RGBA', (W, H), BACK + (255,))
img.alpha_composite(Image.new('RGBA', (W, 70 * SC), GROUND + (255,)), (0, 60 * SC))
img.alpha_composite(old.crop((0, 0, 96, 96)).resize((96 * SC, 96 * SC), Image.NEAREST), (0, 28 * SC))
img.alpha_composite(atlas.crop((0, 0, 160, 128)).resize((160 * SC, 128 * SC), Image.NEAREST), (100 * SC, 4 * SC))
img.alpha_composite(yar.resize((96 * SC, 96 * SC), Image.NEAREST), (275 * SC, 30 * SC))
img.save(os.path.join(DBG, 'composite.png'))
