// Pemetaan aset penting (Phase 0). Sumber kebenaran status: ASSET_INDEX.md / ASSET_FILES.json.
// Semua aset v3.3 di bawah berstatus NEEDS_REVIEW: boleh dipakai pengembangan, TIDAK dianggap final
// dan TIDAK ada yang PRODUCTION_READY. `imported: false` berarti belum disalin ke web/public.

export type ReviewStatus = 'REFERENCE' | 'DRAFT' | 'NEEDS_REVIEW' | 'PRODUCTION_READY';

export interface AtlasAsset {
  id: string;
  entity: string;
  kind: 'battle_atlas' | 'vfx_atlas' | 'exploration_atlas';
  /** Versi aktif TERBARU yang benar-benar ada untuk jenis aset ini (eksplorasi belum punya v3.3). */
  version: 'v3.2' | 'v3.3' | 'draft';
  status: ReviewStatus;
  /** Relatif terhadap root proyek (folder FINAL). */
  sourceImage: string;
  sourceJson: string;
  frameSize: readonly [number, number];
  atlasSize: readonly [number, number];
  frameCount: number;
  /** Frame yang memicu damage (0-based), dari JSON atlas. */
  eventFrame?: { name: string; index: number };
  /** Path publik setelah diimpor; null = belum diimpor ke build (Phase 0). */
  publicPath: string | null;
  /** Hanya atlas eksplorasi: salinan runtime LAMA (identik byte dengan sumber; C01 = sumber minus piksel liar). Tidak dimuat game; dipakai tes/skrip. */
  rawPublicPath?: string;
  /** Atlas final Sprint 2 (idle/sprint/koreksi). Bila ada, game memuat ini; publicPath tetap turunan ternormalisasi Sprint 1. */
  finalPath?: string;
  /** Ukuran frame atlas final bila berbeda dari sumber (mis. boss 160x128). */
  finalFrameSize?: readonly [number, number];
  imported: boolean;
  notes: string;
}

const PHASE10_BATTLE_SIZE: Readonly<Record<string, readonly [number, number]>> = {
  C03: [112, 96], M02: [128, 112], M03: [112, 112], B02: [160, 128],
};

export const ASSET_MANIFEST: readonly AtlasAsset[] = [
  ...[
    ['C03', 'characters/C03_Torvan', 'exploration_atlas', [32, 48], [192, 192], 24, 'characters/normalized/C03_explore.png'],
    ['C07', 'characters/C07_Zira', 'exploration_atlas', [32, 48], [192, 192], 24, 'characters/normalized/C07_explore.png'],
    ['C03', 'characters/C03_Torvan', 'battle_atlas', [64, 64], [256, 64], 4, 'battle/C03_battle.png'],
    ['M02', 'monsters/M02_Briaroot', 'battle_atlas', [64, 64], [256, 64], 4, 'battle/M02_battle.png'],
    ['M03', 'monsters/M03_Wisplet', 'battle_atlas', [64, 64], [256, 64], 4, 'battle/M03_battle.png'],
    ['B02', 'bosses/B02_Veyrath', 'battle_atlas', [96, 96], [384, 96], 4, 'battle/B02_battle.png'],
  ].map(([id, folder, kind, frameSize, atlasSize, frameCount, out]): AtlasAsset => ({
    id: `${id}_${kind === 'exploration_atlas' ? 'CH2_EXPLORE' : 'CH2_BATTLE'}`, entity: id as string,
    kind: kind as AtlasAsset['kind'], version: 'draft', status: 'NEEDS_REVIEW',
    sourceImage: `assets/${folder}/${id}_${kind === 'exploration_atlas' ? 'EXPLORATION' : 'BATTLE'}_ATLAS_DRAFT.png`,
    sourceJson: `assets/${folder}/${id}_${kind === 'exploration_atlas' ? 'EXPLORATION' : 'BATTLE'}_ATLAS_DRAFT.json`,
    frameSize: frameSize as [number, number], atlasSize: atlasSize as [number, number], frameCount: frameCount as number,
    publicPath: `assets/${out}`, ...(kind === 'exploration_atlas' ? { rawPublicPath: `assets/${(out as string).replace('/normalized/', '/')}`, finalPath: `assets/characters/final/${id}_explore.png` } : {}), imported: true,
    ...(kind === 'battle_atlas' ? { finalPath: `assets/battle/${id}_BATTLE_V2.png`, finalFrameSize: PHASE10_BATTLE_SIZE[id as string]! } : {}),
    notes: kind === 'exploration_atlas'
      ? 'Phase 10: reference-led imagegen redraw with four independently drawn directions, native 32x48 preparation and integer limb/cloth animation. Human art review pending. Raw source copy preserved.'
      : 'Phase 10: twelve individually generated concept-led battle poses in a full timed atlas; native shared-scale preparation. Human animation review pending. Original four-pose source copy preserved.',
  })),
  ...[['C02', 'Velthia'], ['C04', 'Varlgrim'], ['C05', 'Azie'], ['C06', 'Talric'], ['C09', 'Derrria']].map(([id, name]): AtlasAsset => ({
    id: `${id}_CITY_EXPLORE`, entity: id!, kind: 'exploration_atlas', version: 'draft', status: 'NEEDS_REVIEW',
    sourceImage: `assets/characters/${id}_${name}/${id}_EXPLORATION_ATLAS_DRAFT.png`,
    sourceJson: `assets/characters/${id}_${name}/${id}_EXPLORATION_ATLAS_DRAFT.json`,
    frameSize: [32, 48], atlasSize: [192, 192], frameCount: 24,
    publicPath: `assets/characters/normalized/${id}_explore.png`, rawPublicPath: `assets/characters/${id}_explore.png`, finalPath: `assets/characters/final/${id}_explore.png`, imported: true,
    notes: 'Phase 10: imagegen redraw from the existing fictional front/back costume references, independently drawn directions and native 32x48 animation preparation. Human review pending. Original source and normalized/raw copies remain preserved.',
  })),
  {
    id: 'B01_MOURNFANG_BATTLE', entity: 'B01', kind: 'battle_atlas', version: 'draft', status: 'NEEDS_REVIEW',
    sourceImage: 'assets/bosses/B01_Mournfang/B01_BATTLE_ATLAS_DRAFT.png',
    sourceJson: 'assets/bosses/B01_Mournfang/B01_BATTLE_ATLAS_DRAFT.json',
    frameSize: [96, 96], atlasSize: [384, 96], frameCount: 4,
    publicPath: 'assets/battle/B01_BATTLE_ATLAS_DRAFT.png', imported: true,
    finalPath: 'assets/battle/B01_BATTLE_V4.png', finalFrameSize: [160, 128],
    notes: 'Four original grid-authored key poses only, NOT finished animation. Runtime holds/reuses poses; no redraw or reference crop. Source JSON says DRAFT; registry review remains NEEDS_REVIEW.',
  },
  // Phase 7 (Agent BA): atlas battle penuh dari desain resmi, dibuat skrip web/scripts/battle-art/build_{c02,b03,m05}.py. DRAFT/NEEDS_REVIEW.
  // Format BattleAtlas penuh (frame_size, frames{rect,pivot,duration_ms}, event) -- dibaca BattleScene lewat `${id}:meta` + fullAtlas().
  ...([
    ['C02_BATTLE_V1', 'C02', 'characters/C02_Velthia/C02_TURNAROUND_SIDE.png', 'characters/C02_Velthia/C02_BATTLE_ATLAS_DRAFT.json', [116, 112], 13, 'cast', 'C02_BATTLE_V1', 3,
      'Velthia (tanpa senjata), menghadap KIRI (sisi party). Re-pose boneka kertas dari turnaround samping resmi, dicerminkan; 13 gambar + alias attack=cast. Tangan diperbesar 1,2-1,3x pada pose sihir. Perlu redraw seniman.'],
    ['B03_BATTLE_V1', 'B03', 'bosses/B03_Chronolith/B03_NEW_CONCEPT_DRAFT.png', 'bosses/B03_Chronolith/B03_BATTLE_ATLAS_DRAFT.json', [192, 140], 13, 'attack', 'B03_BATTLE_V1', 4,
      'Chronolith, menghadap depan; busur+inti. 13 frame termasuk charge (tell), guard, special. Re-pose boneka kertas dari konsep resmi; perlu redraw seniman.'],
    ['M05_BATTLE_V1', 'M05', 'monsters/M05_Oathguard/M05_NEW_CONCEPT_DRAFT.png', 'monsters/M05_Oathguard/M05_BATTLE_ATLAS_DRAFT.json', [160, 128], 10, 'attack', 'M05_BATTLE_V1', 3,
      'Oathguard, menghadap kanan; 10 frame kontrak wajib. Re-pose boneka kertas dari konsep resmi (jatuh = rotasi kaku); perlu redraw seniman.'],
  ] as const).map(([id, entity, img, json, fs, n, ev, out, evIdx, notes]): AtlasAsset => ({
    id, entity, kind: 'battle_atlas', version: 'draft', status: 'NEEDS_REVIEW',
    sourceImage: `assets/${img}`, sourceJson: `assets/${json}`,
    frameSize: fs, atlasSize: [fs[0] * n, fs[1]], frameCount: n, eventFrame: { name: ev, index: evIdx },
    publicPath: `assets/battle/${out}.png`, imported: true, notes,
  })),
  // Phase 8 (Agent BA): atlas battle penuh Bab IV dari desain resmi (web/scripts/battle-art/build_{b04,m04,m06}.py). DRAFT/NEEDS_REVIEW.
  // Aktor: C04 (= B04 Varlgrim, key `C04`), M04 Gravorn, M06 Riftborn (juga 'Penguji'). Pakai `fullAtlas(cache.json.get(`${id}:meta`))`.
  ...([
    ['B04_BATTLE_V1', 'C04', 'characters/C04_Varlgrim/C04_TURNAROUND_SIDE.png', 'characters/C04_Varlgrim/C04_BATTLE_ATLAS_DRAFT.json', [208, 176], 13, 'attack', 'B04_BATTLE_V1', 3,
      'Varlgrim (B04/C04), menghadap KANAN (menuju party), tongkat kayu berpilin, bukan jam pasir. 13 frame: 10 standar + plant/raise/cast. Re-pose boneka kertas dari turnaround samping + gambar tongkat resmi; berlutut = tubuh diturunkan + sepatu belakang diputar. Perlu redraw seniman.'],
    ['M04_BATTLE_V1', 'M04', 'monsters/M04_Gravorn/M04_NEW_CONCEPT_DRAFT.png', 'monsters/M04_Gravorn/M04_BATTLE_ATLAS_DRAFT.json', [176, 136], 11, 'attack', 'M04_BATTLE_V1', 3,
      'Gravorn, menghadap depan condong ke kanan. 11 frame: 10 standar + guard (lengan disilang). Re-pose boneka kertas dari konsep resmi; perlu redraw seniman.'],
    ['M06_BATTLE_V1', 'M06', 'monsters/M06_Riftborn/M06_NEW_CONCEPT_DRAFT.png', 'monsters/M06_Riftborn/M06_BATTLE_ATLAS_DRAFT.json', [160, 128], 10, 'attack', 'M06_BATTLE_V1', 3,
      'Riftborn (juga Penguji), melayang HOVER 6 px di atas pivot (defeated di tanah). 10 frame kontrak. Dua lapisan (rift ungu + busur batu) dari konsep resmi; perlu redraw seniman.'],
  ] as const).map(([id, entity, img, json, fs, n, ev, out, evIdx, notes]): AtlasAsset => ({
    id, entity, kind: 'battle_atlas', version: 'draft', status: 'NEEDS_REVIEW',
    sourceImage: `assets/${img}`, sourceJson: `assets/${json}`,
    frameSize: fs, atlasSize: [fs[0] * n, fs[1]], frameCount: n, eventFrame: { name: ev, index: evIdx },
    publicPath: `assets/battle/${out}.png`, imported: true, notes,
  })),

  {
    id: 'C01_YARIC_BATTLE',
    entity: 'C01',
    kind: 'battle_atlas',
    version: 'v3.3',
    status: 'NEEDS_REVIEW',
    sourceImage: 'assets/characters/C01_Yaric/v3_3/C01_ATLAS_PIXEL_PASS_V3_3.png',
    sourceJson: 'assets/characters/C01_Yaric/v3_3/C01_ATLAS_PIXEL_PASS_V3_3.json',
    frameSize: [96, 96],
    atlasSize: [1056, 96],
    frameCount: 11,
    eventFrame: { name: 'attack_contact', index: 4 },
    publicPath: 'assets/battle/C01_ATLAS_PIXEL_PASS_V3_3.png',
    imported: true,
    notes: 'Menghadap kiri. Menggantikan v3.2. Dibutuhkan mulai Phase 2 (battle).',
  },
  {
    id: 'M01_HOLLOWLING_BATTLE',
    entity: 'M01',
    kind: 'battle_atlas',
    version: 'v3.3',
    status: 'NEEDS_REVIEW',
    sourceImage: 'assets/monsters/M01_Hollowling/v3_3/M01_ATLAS_PIXEL_PASS_V3_3.png',
    sourceJson: 'assets/monsters/M01_Hollowling/v3_3/M01_ATLAS_PIXEL_PASS_V3_3.json',
    frameSize: [96, 96],
    atlasSize: [960, 96],
    frameCount: 10,
    eventFrame: { name: 'attack', index: 3 },
    publicPath: 'assets/battle/M01_ATLAS_PIXEL_PASS_V3_3.png',
    imported: true,
    notes: 'Menghadap kanan. Dibutuhkan mulai Phase 2 (battle).',
  },
  {
    id: 'VFX_C01_GROUND_SLAM',
    entity: 'C01',
    kind: 'vfx_atlas',
    version: 'v3.3',
    status: 'NEEDS_REVIEW',
    sourceImage: 'assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_ATLAS_PIXEL_PASS_V3_3.png',
    sourceJson: 'assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_ATLAS_PIXEL_PASS_V3_3.json',
    frameSize: [96, 64],
    atlasSize: [768, 64],
    frameCount: 8,
    eventFrame: { name: 'slab_strikes', index: 5 },
    publicPath: 'assets/battle/C01_GROUND_SLAM_ATLAS_PIXEL_PASS_V3_3.png',
    imported: true,
    notes: 'Damage hanya sekali pada frame 5 (0-based). Reduced Flashes tidak menghapus fracture/slab/dampak; Screen Shake OFF hanya menghapus gerak kamera.',
  },
  {
    id: 'C01_YARIC_EXPLORE',
    entity: 'C01',
    kind: 'exploration_atlas',
    version: 'v3.2',
    status: 'NEEDS_REVIEW',
    sourceImage: 'assets/characters/C01_Yaric/v3_2/C01_EXPLORATION_PIXEL_PASS_V3_2.png',
    sourceJson: 'assets/characters/C01_Yaric/v3_2/C01_EXPLORATION_PIXEL_PASS_V3_2.json',
    frameSize: [32, 48],
    atlasSize: [128, 192],
    frameCount: 16,
    publicPath: 'assets/characters/normalized/C01_explore.png',
    finalPath: 'assets/characters/final/C01_explore.png',
    rawPublicPath: 'assets/characters/C01_explore.png',
    imported: true,
    notes: 'Eksplorasi 4 arah x 4 frame (baris: depan, kiri, kanan, belakang). v3.3 tidak memiliki atlas eksplorasi. Runtime = turunan ternormalisasi scripts/normalize-exploration-sprites.mjs (kaki y=46, kiri/kanan diregangkan ke tinggi depan, kanan = cermin kiri) dari salinan lama; salinan lama (rawPublicPath) = hasil scripts/prepare-assets.mjs (piksel liar y>=44 pada frame kiri/kanan dihapus).',
  },
  {
    id: 'C08_NAMBO_EXPLORE',
    entity: 'C08',
    kind: 'exploration_atlas',
    version: 'draft',
    status: 'NEEDS_REVIEW',
    sourceImage: 'assets/characters/C08_Nambo/C08_EXPLORATION_ATLAS_DRAFT.png',
    sourceJson: 'assets/characters/C08_Nambo/C08_EXPLORATION_ATLAS_DRAFT.json',
    frameSize: [32, 48],
    atlasSize: [192, 192],
    frameCount: 24,
    publicPath: 'assets/characters/normalized/C08_explore.png',
    finalPath: 'assets/characters/final/C08_explore.png',
    rawPublicPath: 'assets/characters/C08_explore.png',
    imported: true,
    notes: 'Phase 10: redraw imagegen berpedoman turnaround resmi Nambo (goggle, syal, kantong), empat arah independen; native 32x48, kaki y46, animasi lapisan piksel. Review manusia tetap diperlukan; sumber asli dipertahankan.',
  },
];

/** Aset versi lama yang sudah digantikan. Tidak boleh dipakai lagi (ASSET_INDEX.md, DELTA_V3_2_TO_V3_3.md). */
export const SUPERSEDED_ASSET_PATHS: readonly string[] = [
  'assets/characters/C01_Yaric/v3_2/C01_ATLAS_PIXEL_PASS_V3_2', // battle v3.2 -> v3.3
  'assets/characters/C01_Yaric/C01_BATTLE_ATLAS_DRAFT',
  'assets/characters/C01_Yaric/C01_EXPLORATION_ATLAS_DRAFT', // v3.1 -> v3.2 (eksplorasi)
  'assets/monsters/M01_Hollowling/v3_2/',
  'assets/vfx/C01_GROUND_SLAM/v3_2/',
];
