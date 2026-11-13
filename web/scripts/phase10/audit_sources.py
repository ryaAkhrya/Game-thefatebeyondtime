"""Record fictional reference/source hashes and detect source-sheet clipping."""
from pathlib import Path
import hashlib
import json
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'assets/phase10'
sources = []
for path in sorted((OUT / 'sources').glob('*.png')):
    source = Image.open(path).convert('RGBA')
    entry = {'path': path.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
             'size': list(source.size), 'selected': not path.stem.endswith(('_v1', '_pre_revision'))}
    if '_battle' in path.stem:
        pixels = np.array(source)[:, :, 3] >= 192
        edges = []
        for index in range(12):
            col, row = index % 4, index // 4
            cell = pixels[row*source.height//3:(row+1)*source.height//3,
                          col*source.width//4:(col+1)*source.width//4]
            count = int(cell[0].sum()+cell[-1].sum()+cell[:,0].sum()+cell[:,-1].sum())
            if count: edges.append({'frame': index, 'edge_pixels': count})
        entry['crossed_cell_edges'] = edges
        if entry['selected'] and edges:
            raise ValueError(f'{path.name}: source pose is clipped: {edges}')
    sources.append(entry)
refs = []
for actor in [f'C{i:02d}' for i in range(1, 10)]:
    for path in sorted((ROOT / 'assets/characters').glob(f'{actor}_*/{actor}_TURNAROUND_*.png')):
        if path.name.endswith(('_FRONT.png', '_BACK.png')):
            refs.append({'path': path.relative_to(ROOT).as_posix(),
                         'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
for actor, folder in [('M02','monsters'),('M03','monsters'),('B02','bosses')]:
    for path in sorted((ROOT / f'assets/{folder}').glob(f'{actor}_*/{actor}*CONCEPT*.png')):
        refs.append({'path': path.relative_to(ROOT).as_posix(),
                     'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
data = {'phase': 10, 'method': 'Built-in imagegen with fictional concept-art references; exact prompts in docs/production/phase10/IMAGEGEN_PROMPTS.md and IMAGEGEN_REVISION_PROMPTS.md.',
        'native_preparation': 'Pillow/NumPy nearest grid, hard alpha, closed palettes, stable pivots; exploration motion derived with integer pixels. Anonymous town NPCs use the existing Node code-native generators; audit_town.py verifies unchanged prop pixels and atlas geometry.',
        'human_review': 'PENDING', 'private_media_used': False, 'music_created': False,
        'sources': sources, 'fictional_references': refs,
        'generation_reference_boards': [
            {'path': p.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
            for p in sorted((OUT / 'references').glob('*_revision_*.png'))],
        'baseline_composition_and_sprites': [
            {'path': p.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
            for p in sorted((OUT / 'references').glob('*.png')) if '_revision_' not in p.stem]}
(OUT / 'PROVENANCE.json').write_text(json.dumps(data, indent=2)+'\n',encoding='utf-8')
print(f'{len(sources)} source renders catalogued; selected battle sheets have no clipped cell edges.')
