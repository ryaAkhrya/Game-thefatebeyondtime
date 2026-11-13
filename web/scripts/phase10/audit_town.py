"""Check that Phase 10 NPC redraws leave every town prop and pivot unchanged."""
from pathlib import Path
import io
import json
import subprocess
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[3]
REF=ROOT/'assets/phase10/references'
REVIEW=ROOT/'docs/production/phase10'
REF.mkdir(parents=True,exist_ok=True)
REVIEW.mkdir(parents=True,exist_ok=True)
report=[]
for name,prefix in [('town_crisis','cit_'),('town_c4','c4_sit_')]:
    base=f'web/public/assets/environment/town/{name}_atlas'
    for ext in ['png','json']:
        target=REF/f'{name}_before.{ext}'
        if not target.exists():
            target.write_bytes(subprocess.run(['git','show',f'3a754a8:{base}.{ext}'],cwd=ROOT,capture_output=True,check=True).stdout)
    old=Image.open(REF/f'{name}_before.png').convert('RGBA')
    new=Image.open(ROOT/f'{base}.png').convert('RGBA')
    old_meta=json.loads((REF/f'{name}_before.json').read_text(encoding='utf-8-sig'))
    new_meta=json.loads((ROOT/f'{base}.json').read_text(encoding='utf-8-sig'))
    assert old_meta==new_meta, f'{name}: frame geometry or pivots changed'
    changed=[];untouched=[]
    def crop(image,entry):
        f=entry['frame']
        return image.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
    for key,entry in new_meta['frames'].items():
        if crop(old,entry).tobytes()!=crop(new,entry).tobytes():
            assert key.startswith(prefix), f'Unexpected prop change: {key}'
            changed.append(key)
        else:untouched.append(key)
    assert changed, f'{name}: redraw did not change any NPC pixels'
    report.append({'atlas':name,'unchanged_geometry':True,'changed_npc_frames':len(changed),'unchanged_frames':len(untouched)})
    if name=='town_crisis':
        variants=['porter','vendor','sweeper','citizen_a','citizen_b','citizen_c','guard','noble_a','noble_b']
        board=Image.new('RGB',(6*32*4+105,len(variants)*48*4+35),'#34303d')
        draw=ImageDraw.Draw(board);draw.text((8,8),'Before: down/side/up | After: down/side/up',fill='#ead8b5')
        for row,variant in enumerate(variants):
            draw.text((4,40+row*192),variant,fill='#ead8b5')
            for index,image in enumerate([old,new]):
                for col,direction in enumerate(['down','side','up']):
                    part=crop(image,new_meta['frames'][f'cit_{variant}_idle_{direction}_0'])
                    part=part.resize((128,192),Image.Resampling.NEAREST)
                    board.paste(part,(105+(index*3+col)*128,35+row*192),part)
        board.save(REVIEW/'citizens_comparison.png')
    else:
        board=Image.new('RGB',(3*38*7,2*28*7+40),'#34303d')
        ImageDraw.Draw(board).text((8,8),'Camp seated groups: before (top), after (bottom)',fill='#ead8b5')
        for row,image in enumerate([old,new]):
            for col,key in enumerate(['c4_sit_a','c4_sit_b','c4_sit_c']):
                part=crop(image,new_meta['frames'][key]).resize((266,196),Image.Resampling.NEAREST)
                board.paste(part,(col*266,40+row*196),part)
        board.save(REVIEW/'camp_comparison.png')
(ROOT/'.dev-cache/logs/phase10-town-preservation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
