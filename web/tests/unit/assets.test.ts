import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST, type AtlasAsset } from '../../src/game/data/assetManifest';
import { AssetRegistry } from '../../src/game/systems/AssetRegistry';
import { BOSS_ALIAS_OF_CHARACTER, BOSS_IDS, CHARACTER_IDS, MONSTER_IDS } from '../../src/game/data/ids';
import { readPng } from './helpers/png';

const ROOT = resolve(__dirname, '../../..');
const PUBLIC = resolve(__dirname, '../../public');

function pngInfo(path: string): { width: number; height: number; colorType: number } {
  const b = readFileSync(path);
  expect(b.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25]! };
}

const battle = ASSET_MANIFEST.filter((a) => a.kind !== 'exploration_atlas' && a.version === 'v3.3');
const chapter2Draft = ASSET_MANIFEST.filter(a => a.id.endsWith('_CH2_BATTLE'));
const explore = ASSET_MANIFEST.filter((a) => a.kind === 'exploration_atlas');

describe('AssetRegistry', () => {
  const registry = new AssetRegistry();

  it('memetakan aset aktif battle v3.3 dan eksplorasi Yaric/Nambo', () => {
    expect(registry.list().map((a) => a.id).sort()).toEqual(['B01_MOURNFANG_BATTLE', 'B02_CH2_BATTLE', 'B03_BATTLE_V1', 'B04_BATTLE_V1', 'C01_YARIC_BATTLE', 'C01_YARIC_EXPLORE', 'C02_BATTLE_V1', 'C02_CITY_EXPLORE', 'C03_CH2_BATTLE', 'C03_CH2_EXPLORE', 'C04_CITY_EXPLORE', 'C05_CITY_EXPLORE', 'C06_CITY_EXPLORE', 'C07_CH2_EXPLORE', 'C08_NAMBO_EXPLORE', 'C09_CITY_EXPLORE', 'M01_HOLLOWLING_BATTLE', 'M02_CH2_BATTLE', 'M03_CH2_BATTLE', 'M04_BATTLE_V1', 'M05_BATTLE_V1', 'M06_BATTLE_V1', 'VFX_C01_GROUND_SLAM']);
  });

  it('battle dan eksplorasi diimpor; tidak ada yang PRODUCTION_READY', () => {
    for (const a of registry.list()) {
      expect(a.status).not.toBe('PRODUCTION_READY');
      expect(registry.isProductionReady(a.id)).toBe(false);
    }
    expect(battle.every((a) => a.version === 'v3.3' && a.imported)).toBe(true);
    expect(registry.loadable()).toHaveLength(23);
  });

  it('memakai eksplorasi Yaric v3.2 dan redraw Nambo yang menunggu review visual', () => {
    expect(registry.get('C01_YARIC_EXPLORE')?.version).toBe('v3.2');
    expect(registry.get('C01_YARIC_EXPLORE')?.status).toBe('NEEDS_REVIEW');
    expect(registry.get('C08_NAMBO_EXPLORE')?.status).toBe('NEEDS_REVIEW');
    expect(existsSync(resolve(ROOT, 'assets/characters/C01_Yaric/v3_3/C01_EXPLORATION_PIXEL_PASS_V3_3.png'))).toBe(false); // memang tidak ada
  });

  it('menolak entri yang menunjuk aset battle versi lama (v3.2) dan draft eksplorasi v3.1', () => {
    const base = ASSET_MANIFEST[0]!;
    const bad32: AtlasAsset = { ...base, id: 'X', sourceImage: 'assets/characters/C01_Yaric/v3_2/C01_ATLAS_PIXEL_PASS_V3_2.png', sourceJson: 'assets/characters/C01_Yaric/v3_2/C01_ATLAS_PIXEL_PASS_V3_2.json' };
    expect(() => new AssetRegistry([bad32])).toThrow(/digantikan/);
    const bad31: AtlasAsset = { ...base, id: 'Y', sourceImage: 'assets/characters/C01_Yaric/C01_EXPLORATION_ATLAS_DRAFT.png', sourceJson: 'assets/characters/C01_Yaric/C01_EXPLORATION_ATLAS_DRAFT.json' };
    expect(() => new AssetRegistry([bad31])).toThrow(/digantikan/);
  });

  it('menolak ID ganda dan imported tanpa publicPath', () => {
    expect(() => new AssetRegistry([ASSET_MANIFEST[0]!, ASSET_MANIFEST[0]!])).toThrow(/ganda/);
    expect(() => new AssetRegistry([{ ...ASSET_MANIFEST[0]!, imported: true, publicPath: null }])).toThrow(/publicPath/);
  });
});

describe.each(chapter2Draft.map(a => [a.id, a] as [string, AtlasAsset]))('Chapter II DRAFT pose atlas %s', (_id, a) => {
  it('copies the original PNG/JSON intact and keeps four authored poses', () => {
    expect(readFileSync(resolve(PUBLIC, a.publicPath!))).toEqual(readFileSync(resolve(ROOT, a.sourceImage)));
    expect(readFileSync(resolve(PUBLIC, a.publicPath!.replace(/\.png$/, '.json')))).toEqual(readFileSync(resolve(ROOT, a.sourceJson)));
    const meta = JSON.parse(readFileSync(resolve(ROOT, a.sourceJson), 'utf8'));
    expect(meta.status).toBe('DRAFT'); expect(meta.authored_grid).toEqual([...a.frameSize]);
    expect(Object.keys(meta.frames)).toEqual(['idle', 'attack', 'hit', 'defeated']);
    expect(pngInfo(resolve(PUBLIC, a.publicPath!))).toMatchObject({ width: a.atlasSize[0], height: a.atlasSize[1] });
  });
});

describe.each(battle.map((a) => [a.id, a] as [string, AtlasAsset]))('Atlas battle %s vs file asli', (_id, a) => {
  it('runtime PNG and metadata are byte-identical to v3.3 originals', () => {
    expect(readFileSync(resolve(PUBLIC, a.publicPath!))).toEqual(readFileSync(resolve(ROOT, a.sourceImage)));
    expect(readFileSync(resolve(PUBLIC, a.publicPath!.replace(/\.png$/, '.json')))).toEqual(readFileSync(resolve(ROOT, a.sourceJson)));
  });
  it('file PNG dan JSON ada', () => {
    expect(existsSync(resolve(ROOT, a.sourceImage))).toBe(true);
    expect(existsSync(resolve(ROOT, a.sourceJson))).toBe(true);
  });

  it('dimensi PNG = atlas_size; punya kanal alpha', () => {
    const png = pngInfo(resolve(ROOT, a.sourceImage));
    expect([png.width, png.height]).toEqual([...a.atlasSize]);
    expect([6, 4]).toContain(png.colorType);
    const json = JSON.parse(readFileSync(resolve(ROOT, a.sourceJson), 'utf8'));
    expect(json.atlas_size).toEqual([...a.atlasSize]);
    expect(json.frame_size).toEqual([...a.frameSize]);
    expect(json.status).toBe('NEEDS_REVIEW');
  });

  it('grid frame berurutan dan event frame cocok', () => {
    const json = JSON.parse(readFileSync(resolve(ROOT, a.sourceJson), 'utf8'));
    const frames = Object.entries(json.frames) as Array<[string, { index_0_based: number; rect: number[] }]>;
    expect(frames).toHaveLength(a.frameCount);
    expect(a.frameCount * a.frameSize[0]).toBe(a.atlasSize[0]);
    frames.forEach(([, f], i) => {
      expect(f.index_0_based).toBe(i);
      expect(f.rect).toEqual([i * a.frameSize[0], 0, a.frameSize[0], a.frameSize[1]]);
    });
    if (a.eventFrame) {
      expect(json.event.index_0_based).toBe(a.eventFrame.index);
      expect(frames[a.eventFrame.index]![0]).toBe(a.eventFrame.name);
    }
  });
});

describe.each(explore.map((a) => [a.id, a] as [string, AtlasAsset]))('Atlas eksplorasi %s (salinan runtime lama + jalur normalisasi)', (_id, a) => {
  const cols = a.atlasSize[0] / a.frameSize[0];
  const rows = a.atlasSize[1] / a.frameSize[1];

  it('sumber dan salinan web ada; dimensi cocok manifest dan JSON', () => {
    expect(existsSync(resolve(ROOT, a.sourceImage))).toBe(true);
    const src = pngInfo(resolve(ROOT, a.sourceImage));
    expect([src.width, src.height]).toEqual([...a.atlasSize]);
    const pub = resolve(PUBLIC, a.rawPublicPath!);
    expect(existsSync(pub)).toBe(true);
    const copy = readPng(pub);
    expect([copy.width, copy.height]).toEqual([...a.atlasSize]);
    const json = JSON.parse(readFileSync(resolve(ROOT, a.sourceJson), 'utf8'));
    expect(json.atlas_size ?? [copy.width, copy.height]).toEqual([...a.atlasSize]);
    expect(json.frame_size ?? json.authored_grid).toEqual([...a.frameSize]);
  });

  it('game memuat salinan ternormalisasi (publicPath), salinan lama (rawPublicPath) tetap ada', () => {
    expect(a.publicPath).toBe(a.rawPublicPath!.replace('assets/characters/', 'assets/characters/normalized/'));
    expect(existsSync(resolve(PUBLIC, a.publicPath!))).toBe(true);
    expect(existsSync(resolve(PUBLIC, a.publicPath!.replace(/\.png$/, '.json')))).toBe(true);
    const norm = pngInfo(resolve(PUBLIC, a.publicPath!));
    expect([norm.width, norm.height]).toEqual([...a.atlasSize]);
    expect(norm.colorType).toBe(6);
  });

  it('salinan lama identik byte dengan sumber (PNG+JSON); C01 hanya PNG-nya dibersihkan dari piksel liar (JSON identik)', () => {
    const raw = (ext: string): Buffer => readFileSync(resolve(PUBLIC, a.rawPublicPath!.replace(/\.png$/, '.' + ext)));
    expect(raw('json')).toEqual(readFileSync(resolve(ROOT, a.sourceJson)));
    if (a.id !== 'C01_YARIC_EXPLORE') expect(raw('png')).toEqual(readFileSync(resolve(ROOT, a.sourceImage)));
  });

  it('grid: jumlah frame, rect sejajar sel, 4 arah x N frame; animasi idle/walk 4 arah ada', () => {
    const json = JSON.parse(readFileSync(resolve(ROOT, a.sourceJson), 'utf8'));
    const frames = Object.entries(json.frames) as Array<[string, { rect: number[] }]>;
    expect(frames).toHaveLength(a.frameCount);
    expect(cols * rows).toBe(a.frameCount);
    for (const [name, f] of frames) {
      expect(f.rect[2], name).toBe(a.frameSize[0]);
      expect(f.rect[3], name).toBe(a.frameSize[1]);
      expect(f.rect[0]! % a.frameSize[0], name).toBe(0);
      expect(f.rect[1]! % a.frameSize[1], name).toBe(0);
    }
    // baris: depan, kiri, kanan, belakang (urutan DIR_ROW di WorldScene)
    const rowOf = (n: string): number => frames.find(([k]) => k === n)![1].rect[1]! / a.frameSize[1];
    expect([rowOf(`front_0`), rowOf(`left_0`), rowOf(`right_0`), rowOf(`back_0`)]).toEqual([0, 1, 2, 3]);
    for (const d of ['front', 'left', 'right', 'back']) {
      expect(json.animations[`${d}_idle`], d).toBeDefined();
      expect(json.animations[`${d}_walk`], d).toBeDefined();
    }
  });

  it('salinan LAMA: transparan; tidak ada piksel menyentuh tepi sel; tidak ada piksel liar di bawah kaki (y >= 44 pada frame samping kosong)', () => {
    const png = readPng(resolve(PUBLIC, a.rawPublicPath!));
    expect(png.data[3]).toBe(0);
    const [fw, fh] = a.frameSize as unknown as [number, number];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let opaque = 0;
        let edge = 0;
        let lowStray = 0;
        for (let y = 0; y < fh; y++) {
          for (let x = 0; x < fw; x++) {
            const alpha = png.data[((r * fh + y) * png.width + c * fw + x) * 4 + 3]!;
            if (alpha === 0) continue;
            opaque++;
            if (x === 0 || y === 0 || x === fw - 1 || (y === fh - 1 && a.id === 'C01_YARIC_EXPLORE')) edge++;
            if (a.id === 'C01_YARIC_EXPLORE' && (r === 1 || r === 2) && y >= 44) lowStray++;
          }
        }
        expect(opaque, `frame ${r},${c}`).toBeGreaterThan(300);
        // Zira's source DRAFT atlas has a known 8-pixel edge touch in front_0; preserve source and flag art review.
        if (a.id !== 'C07_CH2_EXPLORE') expect(edge, `tepi frame ${r},${c}`).toBe(0);
        expect(lowStray, `piksel liar frame ${r},${c}`).toBe(0);
      }
    }
  });

  it('Yaric (salinan lama dan ternormalisasi): baris kiri dan kanan berbeda (arah hadap benar, bukan salinan piksel yang sama)', () => {
    if (a.id !== 'C01_YARIC_EXPLORE') return;
    for (const path of [a.rawPublicPath!, a.publicPath!]) checkLeftRightDiffer(readPng(resolve(PUBLIC, path)));
  });
  const checkLeftRightDiffer = (png: ReturnType<typeof readPng>): void => {
    const [fw, fh] = a.frameSize as unknown as [number, number];
    let same = 0;
    let total = 0;
    for (let y = 0; y < fh; y++)
      for (let x = 0; x < fw; x++) {
        const l = ((1 * fh + y) * png.width + x) * 4;
        const rr = ((2 * fh + y) * png.width + x) * 4;
        if (png.data[l + 3]! > 0 || png.data[rr + 3]! > 0) {
          total++;
          if (png.data[l] === png.data[rr] && png.data[l + 1] === png.data[rr + 1] && png.data[l + 2] === png.data[rr + 2] && png.data[l + 3] === png.data[rr + 3]) same++;
        }
      }
    expect(same / total).toBeLessThan(0.3);
  };
});

describe('typed IDs', () => {
  it('18 entitas unik: 9 C + 6 M + 3 boss (B04 = C04)', () => {
    expect(CHARACTER_IDS.length + MONSTER_IDS.length + BOSS_IDS.length).toBe(18);
    expect(BOSS_ALIAS_OF_CHARACTER.B04).toBe('C04');
    expect((BOSS_IDS as readonly string[]).includes('B04')).toBe(false);
  });
});
