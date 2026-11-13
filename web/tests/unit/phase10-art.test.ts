import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST } from '../../src/game/data/assetManifest';
import { actorAtlas, REQUIRED_BATTLE_FRAMES } from '../../src/game/combat/BattleAtlas';
import { ENDING_ART, SEATED_FRAME } from '../../src/game/ending/artAssets';
import { readPng } from './helpers/png';

const root=resolve(__dirname,'../../..'),pub=resolve(root,'web/public');
const cast=['C02','C03','C04','C05','C06','C07','C08','C09'];
function colors(png: ReturnType<typeof readPng>) {
  const rgb=new Set<number>(),alpha=new Set<number>();
  for(let i=0;i<png.data.length;i+=4){alpha.add(png.data[i+3]!);if(png.data[i+3])rgb.add((png.data[i]!<<16)|(png.data[i+1]!<<8)|png.data[i+2]!);}
  return {rgb,alpha};
}

describe('Phase 10 reference-led native art',()=>{
  it.each(cast)('%s loads the reviewed redraw, with a traceable source rather than a fallback body',id=>{
    const asset=ASSET_MANIFEST.find(a=>a.entity===id&&a.kind==='exploration_atlas')!;
    const meta=JSON.parse(readFileSync(resolve(pub,asset.finalPath!.replace('.png','.json')),'utf8'));
    expect(meta.phase).toBe('Phase 10');expect(meta.cols).toBe(6);expect(meta.frame_size).toEqual([32,48]);
    expect(meta.source_sha256).toBe(createHash('sha256').update(readFileSync(resolve(root,meta.source))).digest('hex'));
    const png=readPng(resolve(pub,asset.finalPath!)),audit=colors(png);
    expect(audit.rgb.size).toBeLessThanOrEqual(32);expect([...audit.alpha].sort()).toEqual([0,255]);
    expect(png.width).toBe(192);expect(png.height).toBe(192);
  });
  it.each(['C03','M02','M03','B02'])('%s has actual full battle poses and retains the legacy metadata route',id=>{
    const asset=ASSET_MANIFEST.find(a=>a.entity===id&&a.kind==='battle_atlas')!;
    const path=resolve(pub,asset.finalPath!);
    const meta=JSON.parse(readFileSync(path.replace('.png','.json'),'utf8'));
    const atlas=actorAtlas(meta),png=readPng(path),audit=colors(png);
    expect(meta.phase).toBe('Phase 10');expect(atlas.frame_size).toEqual(asset.finalFrameSize);
    expect(Object.keys(atlas.frames)).toHaveLength(12);expect(atlas.event.frame_key).toBe('attack');
    expect(meta.facing).toBe(id==='C03'?'left':'right');
    expect(audit.rgb.size).toBeLessThanOrEqual(48);expect([...audit.alpha].sort()).toEqual([0,255]);
    const [w,h]=atlas.frame_size,images=new Set<string>();
    for(const name of REQUIRED_BATTLE_FRAMES){
      const frame=atlas.frames[name]!;expect(frame.pivot).toEqual([w/2,h-2]);expect(frame.duration_ms).toBeGreaterThan(0);
      const [x,y]=frame.rect,bytes: number[]=[];let bottom=-1;
      for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
        const offset=((y+yy)*png.width+x+xx)*4,alpha=png.data[offset+3]!;
        if(alpha)bottom=Math.max(bottom,yy);
        if(xx===0||yy===0||xx===w-1||yy===h-1)expect(alpha).toBe(0);
        bytes.push(...png.data.slice(offset,offset+4));
      }
      images.add(createHash('sha256').update(new Uint8Array(bytes)).digest('hex'));
      if(id==='M03')expect(bottom).toBe(h-2-(name==='defeated'?0:name==='death_start'?6:12));
    }
    expect(images.size).toBeGreaterThanOrEqual(8);
    const legacy=JSON.parse(readFileSync(resolve(pub,asset.publicPath!.replace('.png','.json')),'utf8'));
    expect(Object.keys(actorAtlas(legacy).frames)).toHaveLength(10);
  });
  it('contains new cinematic backgrounds and six dedicated seated pose frames',()=>{
    for(const name of ['cliff','modern','archive','heirloom','heart'] as const){const png=readPng(resolve(pub,ENDING_ART[name].path));expect([png.width,png.height]).toEqual([640,360]);expect(colors(png).rgb.size).toBeLessThanOrEqual(96);}
    const png=readPng(resolve(pub,ENDING_ART.seated.path));expect([png.width,png.height]).toEqual([SEATED_FRAME.width*6,SEATED_FRAME.height]);
    const meta=JSON.parse(readFileSync(resolve(pub,'assets/ending/seated.json'),'utf8'));
    expect(meta.pivot).toEqual([SEATED_FRAME.pivotX,SEATED_FRAME.pivotY]);expect(Object.keys(meta.frames)).toHaveLength(6);
    expect([...colors(png).alpha].sort()).toEqual([0,255]);
  });
});
