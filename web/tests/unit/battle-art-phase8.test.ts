import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readPng } from './helpers/png';
import { ASSET_MANIFEST } from '../../src/game/data/assetManifest';
import { PORTRAIT_EXPRESSIONS } from '../../src/game/data/assetPaths';
import { AssetRegistry } from '../../src/game/systems/AssetRegistry';
import { BATTLE_TEXTURE, atlasHoverPx, frameKeyFor, fullAtlas, hasSpecialFrame, REQUIRED_BATTLE_FRAMES, specialFrameKey, type BattleAtlas } from '../../src/game/combat/BattleAtlas';

// Phase 8 (agen BA): atlas battle Varlgrim B04/C04, Gravorn M04, Riftborn M06; eksplorasi + portrait Varlgrim.
const PUB = resolve(__dirname, '../../public/assets');
const ROOT = resolve(__dirname, '../../..');
const dir = resolve(PUB, 'battle');
const OUTLINE = (0x1d << 16) | (0x16 << 8) | 0x25;

interface Spec {
  id: 'B04' | 'M04' | 'M06';
  actor: string;
  file: string;
  frame: [number, number];
  pivot: [number, number];
  frames: string[];
  facing: string;
  height: [number, number];
  width: [number, number];
  /** Baris opak terbawah (termasuk outline) per frame; `hover` = celah udara. */
  hover: number;
  groundedFrames?: string[];
}

const STD = ['idle_a', 'idle_b', 'anticipation', 'attack', 'followthrough', 'recovery', 'hit_recoil', 'hit_recover', 'death_start', 'defeated'];
const SPECS: Spec[] = [
  { id: 'B04', actor: 'C04', file: 'B04_BATTLE_V1', frame: [208, 176], pivot: [88, 171], facing: 'right', hover: 0,
    frames: [...STD, 'plant', 'raise', 'cast'], height: [110, 140], width: [40, 80] },
  { id: 'M04', actor: 'M04', file: 'M04_BATTLE_V1', frame: [176, 136], pivot: [88, 131], facing: 'front_toward_right', hover: 0,
    frames: [...STD.slice(0, 8), 'guard', 'death_start', 'defeated'], height: [90, 112], width: [90, 125] },
  { id: 'M06', actor: 'M06', file: 'M06_BATTLE_V1', frame: [160, 128], pivot: [72, 124], facing: 'front_toward_right', hover: 6,
    frames: STD, height: [76, 98], width: [76, 98], groundedFrames: ['defeated'] },
];

interface Meta {
  entity_id: string; status: string; facing: string; frame_size: [number, number]; atlas_size: [number, number]; hover_px?: number;
  frames: Record<string, { index_0_based: number; rect: [number, number, number, number]; pivot: [number, number]; duration_ms: number }>;
  event: { frame_key: string; index_0_based: number }; notes: string; palette_size: number;
}

describe.each(SPECS)('Phase 8 battle atlas $file', (spec) => {
  const meta = JSON.parse(readFileSync(resolve(dir, `${spec.file}.json`), 'utf8')) as Meta;
  const png = readPng(resolve(dir, `${spec.file}.png`));
  const [fw, fh] = spec.frame;
  const a = (x: number, y: number): number => png.data[(y * png.width + x) * 4 + 3]!;
  const rgb = (x: number, y: number): number => { const i = (y * png.width + x) * 4; return (png.data[i]! << 16) | (png.data[i + 1]! << 8) | png.data[i + 2]!; };
  const idx = (k: string): number => meta.frames[k]!.index_0_based;
  const stats = (k: string) => {
    const x0 = idx(k) * fw;
    let minX = fw, minY = fh, maxX = -1, maxY = -1, n = 0;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (a(x0 + x, y) > 0) { n++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    return { minX, minY, maxX, maxY, n, w: maxX - minX + 1, h: maxY - minY + 1 };
  };
  const diff = (p: string, q: string): number => {
    let d = 0;
    const xp = idx(p) * fw, xq = idx(q) * fw;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (rgb(xp + x, y) !== rgb(xq + x, y) || a(xp + x, y) !== a(xq + x, y)) d++;
    return d;
  };

  it('JSON <-> PNG: grid, status, facing, binary alpha, palette count in the JSON', () => {
    expect(meta.entity_id).toBe(spec.id);
    expect(meta.status).toBe('NEEDS_REVIEW');
    expect(meta.facing).toBe(spec.facing);
    expect(meta.notes).toMatch(/DRAFT/);
    expect(meta.frame_size).toEqual(spec.frame);
    expect(meta.atlas_size).toEqual([png.width, png.height]);
    expect(png.height).toBe(fh);
    expect(png.width).toBe(fw * spec.frames.length);
    expect(Object.keys(meta.frames)).toEqual(spec.frames);
    for (let i = 3; i < png.data.length; i += 4) { const v = png.data[i]!; if (v !== 0 && v !== 255) throw new Error(`soft alpha ${v}`); }
    const set = new Set<number>();
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) if (a(x, y) > 0) set.add(rgb(x, y));
    expect(set.size).toBeLessThanOrEqual(32);
    expect(meta.palette_size).toBeGreaterThanOrEqual(set.size);
    expect(set.has(OUTLINE)).toBe(true);
    if (spec.hover) expect(meta.hover_px).toBe(spec.hover);
  });

  it('frame table: indices, rects, shared pivot, durations, event frame; fullAtlas accepts it', () => {
    spec.frames.forEach((k, i) => {
      const f = meta.frames[k]!;
      expect(f.index_0_based, k).toBe(i);
      expect(f.rect, k).toEqual([i * fw, 0, fw, fh]);
      expect(f.pivot, k).toEqual(spec.pivot);
      expect(f.duration_ms, k).toBeGreaterThan(0);
    });
    expect(meta.event.frame_key).toBe('attack');
    expect(meta.event.index_0_based).toBe(idx('attack'));
    for (const k of REQUIRED_BATTLE_FRAMES) expect(meta.frames[k], k).toBeDefined();
    expect(() => fullAtlas(meta)).not.toThrow();
  });

  it('EVERY frame has opaque pixels (no empty alpha), inside its cell with >= 1 px margin, not a flat box', () => {
    for (const k of spec.frames) {
      const s = stats(k);
      expect(s.n, `${k} opaque pixels`).toBeGreaterThan(900);
      expect(s.minX, `${k} left`).toBeGreaterThanOrEqual(1);
      expect(s.minY, `${k} top`).toBeGreaterThanOrEqual(1);
      expect(s.maxX, `${k} right`).toBeLessThanOrEqual(fw - 2);
      expect(s.maxY, `${k} bottom`).toBeLessThanOrEqual(fh - 2);
      expect(s.n / (s.w * s.h), `${k} fill ratio`).toBeGreaterThan(0.2);
      expect(s.n / (s.w * s.h), `${k} fill ratio`).toBeLessThan(0.93);
    }
  });

  it('standing size is in the expected stage range, pivot x lies on the figure', () => {
    const s = stats('idle_a');
    expect(s.h).toBeGreaterThanOrEqual(spec.height[0]);
    expect(s.h).toBeLessThanOrEqual(spec.height[1]);
    expect(s.w).toBeGreaterThanOrEqual(spec.width[0]);
    expect(s.w).toBeLessThanOrEqual(spec.width[1]);
    expect(spec.pivot[0]).toBeGreaterThanOrEqual(s.minX);
    expect(spec.pivot[0]).toBeLessThanOrEqual(s.maxX);
  });

  it('foot line is consistent across frames: lowest opaque row = pivot row (minus hover for floating frames)', () => {
    for (const k of spec.frames) {
      const hover = spec.groundedFrames?.includes(k) ? 0 : spec.hover;
      expect(stats(k).maxY, `${k} foot row`).toBe(spec.pivot[1] - hover);
    }
  });

  it('outline wraps the silhouette (every edge pixel is the 1 px plum outline)', () => {
    for (const k of spec.frames) {
      const x0 = idx(k) * fw;
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
        if (a(x0 + x, y) === 0) continue;
        const edge = x === 0 || y === 0 || a(x0 + x - 1, y) === 0 || a(x0 + x + 1, y) === 0 || a(x0 + x, y - 1) === 0 || a(x0 + x, y + 1) === 0;
        if (edge) expect(rgb(x0 + x, y), `${k} edge ${x},${y}`).toBe(OUTLINE);
      }
    }
  });

  it('no stray pixels: every 8-connected island has >= 4 px (and the figure body is one big piece)', () => {
    for (const k of spec.frames) {
      const x0 = idx(k) * fw;
      const seen = new Uint8Array(fw * fh);
      let largest = 0;
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
        if (seen[y * fw + x] || a(x0 + x, y) === 0) continue;
        let n = 0; const stack = [[x, y]]; seen[y * fw + x] = 1;
        while (stack.length) {
          const [cx, cy] = stack.pop()!; n++;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = cx! + dx, ny = cy! + dy;
            if (nx < 0 || ny < 0 || nx >= fw || ny >= fh || seen[ny * fw + nx] || a(x0 + nx, ny) === 0) continue;
            seen[ny * fw + nx] = 1; stack.push([nx, ny]);
          }
        }
        expect(n, `${k} island at ${x},${y}`).toBeGreaterThanOrEqual(4);
        largest = Math.max(largest, n);
      }
      expect(largest, `${k} main body`).toBeGreaterThanOrEqual(spec.id === 'M06' && k === 'defeated' ? 150 : 1500);
    }
  });

  it('poses visibly differ (pixel diff), hit and death move the body', () => {
    for (let i = 0; i < spec.frames.length; i++) for (let j = i + 1; j < spec.frames.length; j++) {
      expect(diff(spec.frames[i]!, spec.frames[j]!), `${spec.frames[i]} vs ${spec.frames[j]}`).toBeGreaterThanOrEqual(12);
    }
    expect(diff('idle_a', 'hit_recoil')).toBeGreaterThanOrEqual(120);
    expect(diff('idle_a', 'death_start')).toBeGreaterThanOrEqual(200);
    expect(diff('idle_a', 'defeated')).toBeGreaterThanOrEqual(400);
  });

  it('manifest + texture key are wired (imported, NEEDS_REVIEW, publicPath points at this PNG)', () => {
    const entry = ASSET_MANIFEST.find((m) => m.id === spec.file)!;
    expect(entry).toBeDefined();
    expect(entry.status).toBe('NEEDS_REVIEW');
    expect(entry.imported).toBe(true);
    expect(entry.publicPath).toBe(`assets/battle/${spec.file}.png`);
    expect(entry.frameSize).toEqual(spec.frame);
    expect(entry.frameCount).toBe(spec.frames.length);
    expect(entry.eventFrame).toEqual({ name: 'attack', index: idx('attack') });
    expect(existsSync(resolve(ROOT, entry.sourceImage))).toBe(true);
    expect(existsSync(resolve(ROOT, entry.sourceJson))).toBe(true);
    expect((BATTLE_TEXTURE as Record<string, string>)[spec.actor]).toBe(spec.file);
    expect(new AssetRegistry().get(spec.file)).toBeDefined();
  });
});

describe('Phase 8 battle atlas specifics', () => {
  const load = (f: string): BattleAtlas => fullAtlas(JSON.parse(readFileSync(resolve(dir, `${f}.json`), 'utf8')));

  it('Varlgrim: special frame keys plant / raise / cast resolve to their own drawings; B04 alias = C04', () => {
    const atlas = load('B04_BATTLE_V1');
    for (const k of ['plant', 'raise', 'cast'] as const) {
      expect(hasSpecialFrame(atlas, k)).toBe(true);
      expect(specialFrameKey(atlas, k)).toBe(k);
    }
    expect(frameKeyFor(atlas, 'plant')).toBe('plant');
    expect((BATTLE_TEXTURE as Record<string, string>).B04).toBe('B04_BATTLE_V1');
    expect((BATTLE_TEXTURE as Record<string, string>).C04).toBe('B04_BATTLE_V1');
  });

  it('special keys fall back for atlases without them (old behaviour unchanged); guard exists on Gravorn', () => {
    const m06 = load('M06_BATTLE_V1');
    expect(hasSpecialFrame(m06, 'plant')).toBe(false);
    expect(specialFrameKey(m06, 'plant')).toBe('anticipation');
    expect(specialFrameKey(m06, 'cast')).toBe('attack');
    expect(frameKeyFor(m06, 'nonexistent', 'attack')).toBe('attack');
    const m04 = load('M04_BATTLE_V1');
    expect(specialFrameKey(m04, 'guard')).toBe('guard');
    expect(specialFrameKey(load('M05_BATTLE_V1'), 'guard')).toBe('idle_a');
  });

  it('Riftborn floats (hover_px = 6), the others are grounded', () => {
    const j = (f: string): unknown => JSON.parse(readFileSync(resolve(dir, `${f}.json`), 'utf8'));
    expect(atlasHoverPx(j('M06_BATTLE_V1'))).toBe(6);
    expect(atlasHoverPx(j('M04_BATTLE_V1'))).toBe(0);
    expect(atlasHoverPx(j('B04_BATTLE_V1'))).toBe(0);
    expect(atlasHoverPx(null)).toBe(0);
  });

  it('Varlgrim holds a wooden staff (warm wood + red ribbon pixels), not a pale hourglass: no pale-sand/glass palette dominates', () => {
    const meta = JSON.parse(readFileSync(resolve(dir, 'B04_BATTLE_V1.json'), 'utf8')) as Meta;
    const p = readPng(resolve(dir, 'B04_BATTLE_V1.png'));
    const x0 = meta.frames.idle_a!.index_0_based * 208;
    let wood = 0, red = 0, pale = 0, n = 0;
    for (let y = 0; y < 176; y++) for (let x = x0; x < x0 + 208; x++) {
      const i = (y * p.width + x) * 4;
      if (!p.data[i + 3]) continue;
      n++;
      const r = p.data[i]!, g = p.data[i + 1]!, b = p.data[i + 2]!;
      if (r > 110 && g > 60 && g < 140 && b < 90 && r > g + 25) wood++;
      if (r > 130 && g < 60 && b < 60) red++;
      if (r > 210 && g > 210 && b > 190) pale++;
    }
    expect(wood / n).toBeGreaterThan(0.12);
    expect(red).toBeGreaterThan(15);
    expect(pale / n).toBeLessThan(0.02);
  });

  it('Gravorn guard and the heave tell differ from idle; the arms go up in anticipation (taller silhouette)', () => {
    const meta = JSON.parse(readFileSync(resolve(dir, 'M04_BATTLE_V1.json'), 'utf8')) as Meta;
    const p = readPng(resolve(dir, 'M04_BATTLE_V1.png'));
    const top = (k: string): number => { const x0 = meta.frames[k]!.index_0_based * 176; for (let y = 0; y < 136; y++) for (let x = x0; x < x0 + 176; x++) if (p.data[(y * p.width + x) * 4 + 3]) return y; return -1; };
    expect(top('anticipation')).toBeLessThan(top('idle_a') - 8);
    expect(top('defeated')).toBeGreaterThan(top('idle_a') + 20);
  });
});

describe('Varlgrim exploration atlas (C04_explore)', () => {
  const rawDir = resolve(PUB, 'characters');
  const entry = ASSET_MANIFEST.find((m) => m.id === 'C04_CITY_EXPLORE')!;
  const finalMeta = JSON.parse(readFileSync(resolve(rawDir, 'final/C04_explore.json'), 'utf8')) as {
    entity_id: string; frame_size: [number, number]; atlas_size: [number, number]; pivot: [number, number]; baseline_y: number; cols: number;
    frames: Record<string, { rect: [number, number, number, number]; pivot: [number, number]; bbox: { y1: number } }>;
    anims: Record<string, { idle: { frames: number[]; fps: number }; walk: { frames: number[]; fps: number } }>;
  };
  const final = readPng(resolve(rawDir, 'final/C04_explore.png'));

  it('manifest entry points at the DRAFT source; raw copy is byte-identical; normalized + final derivatives exist', () => {
    expect(entry.status).toBe('DRAFT');
    expect(entry.finalPath).toBe('assets/characters/final/C04_explore.png');
    expect(entry.publicPath).toBe('assets/characters/normalized/C04_explore.png');
    expect(readFileSync(resolve(rawDir, 'C04_explore.png'))).toEqual(readFileSync(resolve(ROOT, entry.sourceImage)));
    expect(readFileSync(resolve(rawDir, 'C04_explore.json'))).toEqual(readFileSync(resolve(ROOT, entry.sourceJson)));
    expect(existsSync(resolve(rawDir, 'normalized/C04_explore.png'))).toBe(true);
    expect(readdirSync(resolve(rawDir, 'final'))).toContain('C04_explore.json');
    expect(new AssetRegistry().get('C04_CITY_EXPLORE')).toBeDefined();
  });

  it('final atlas: 9 cols x 4 directions of 32x48, binary alpha, every frame non-empty, feet on y=46, pivot 16/46', () => {
    expect(finalMeta.entity_id).toBe('C04');
    expect(finalMeta.frame_size).toEqual([32, 48]);
    expect(finalMeta.cols).toBe(9);
    expect([final.width, final.height]).toEqual([288, 192]);
    expect(finalMeta.pivot).toEqual([16, 46]);
    expect(finalMeta.baseline_y).toBe(46);
    for (let i = 3; i < final.data.length; i += 4) { const v = final.data[i]!; if (v !== 0 && v !== 255) throw new Error(`soft alpha ${v}`); }
    const names = Object.keys(finalMeta.frames);
    expect(names).toHaveLength(36);
    for (const n of names) {
      const f = finalMeta.frames[n]!;
      expect(f.pivot).toEqual([16, 46]);
      let minY = 99, maxY = -1, cnt = 0;
      for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) if (final.data[((f.rect[1] + y) * final.width + f.rect[0] + x) * 4 + 3]) { cnt++; minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      expect(cnt, `${n} non-empty`).toBeGreaterThan(200);
      expect(maxY, `${n} feet row`).toBe(46);
      expect(minY, `${n} head clear of cell top`).toBeGreaterThanOrEqual(1);
    }
  });

  it('anims are data-driven like the other cast atlases (4 directions x idle/walk, valid frame indexes)', () => {
    for (const d of ['down', 'left', 'right', 'up']) {
      const an = finalMeta.anims[d]!;
      expect(an.walk.frames).toHaveLength(4);
      expect(an.idle.frames.length).toBeGreaterThanOrEqual(2);
      for (const i of [...an.walk.frames, ...an.idle.frames]) { expect(i).toBeGreaterThanOrEqual(0); expect(i).toBeLessThan(36); }
    }
  });
});

describe('Portraits for Phase 8 (Varlgrim + canon C4 audit)', () => {
  const pdir = resolve(PUB, 'portraits_hd');
  it('C04_<EKSPRESI>.png exist at the runtime portrait height (352) and are registered for BootScene', () => {
    expect(PORTRAIT_EXPRESSIONS.C04).toEqual(['NEUTRAL', 'ANGRY', 'STERN', 'REMORSE', 'DETERMINED', 'SAD', 'SURPRISED', 'SUSPICIOUS']);
    for (const e of PORTRAIT_EXPRESSIONS.C04!) {
      const p = resolve(pdir, `C04_${e}.png`);
      expect(existsSync(p), e).toBe(true);
      const b = readFileSync(p);
      expect(b.readUInt32BE(20), `${e} height`).toBe(352);
      expect(existsSync(resolve(ROOT, `assets/characters/C04_Varlgrim/C04_EXPRESSION_${e}.png`)), `${e} source`).toBe(true);
    }
    expect(PORTRAIT_EXPRESSIONS.C02).toContain('ANGRY');
    expect(existsSync(resolve(pdir, 'C02_ANGRY.png'))).toBe(true);
  });

  it('every speaker/emotion used by the C4 canon lines in DIALOGUE_EVENTS.json has a runtime portrait', () => {
    const rows = JSON.parse(readFileSync(resolve(ROOT, 'DIALOGUE_EVENTS.json'), 'utf8')) as Array<{ scene_id: string; speaker_id: string; emotion_id: string }>;
    const c4 = rows.filter((r) => r.scene_id.startsWith('C4-'));
    expect(c4.length).toBe(36);
    const missing: string[] = [];
    for (const r of c4) {
      if (r.speaker_id === 'SYSTEM') continue;
      const key = `${r.speaker_id}_${r.emotion_id}`;
      if (!existsSync(resolve(pdir, `${key}.png`)) || !(PORTRAIT_EXPRESSIONS[r.speaker_id] ?? []).includes(r.emotion_id)) missing.push(key);
    }
    expect([...new Set(missing)]).toEqual([]);
  });
});
