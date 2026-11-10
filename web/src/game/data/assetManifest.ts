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
  imported: boolean;
  notes: string;
}

export const ASSET_MANIFEST: readonly AtlasAsset[] = [
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
    publicPath: 'assets/characters/C01_explore.png',
    imported: true,
    notes: 'Eksplorasi 4 arah x 4 frame (baris: depan, kiri, kanan, belakang). v3.3 tidak memiliki atlas eksplorasi. Salinan web = hasil scripts/prepare-assets.mjs (piksel liar y>=44 pada frame kiri/kanan dihapus).',
  },
  {
    id: 'C08_NAMBO_EXPLORE',
    entity: 'C08',
    kind: 'exploration_atlas',
    version: 'draft',
    status: 'DRAFT',
    sourceImage: 'assets/characters/C08_Nambo/C08_EXPLORATION_ATLAS_DRAFT.png',
    sourceJson: 'assets/characters/C08_Nambo/C08_EXPLORATION_ATLAS_DRAFT.json',
    frameSize: [32, 48],
    atlasSize: [192, 192],
    frameCount: 24,
    publicPath: 'assets/characters/C08_explore.png',
    imported: true,
    notes: 'Prototipe DRAFT berkualitas rendah (belum ada versi lebih baru). Baris: depan, kiri, kanan, belakang x 6 frame. Wajah/kostum belum diverifikasi terhadap potret; jangan digambar ulang tanpa persetujuan.',
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
