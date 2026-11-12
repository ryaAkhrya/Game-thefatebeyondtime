import type { EnvAtlas, EnvImage } from './environmentAssets';

/**
 * Aset Aveloria sesudah menara tua runtuh (Chapter IV, C4-07). Lead memasang ke `environmentAssets.ts`/BootScene
 * (`[...ENV_ATLASES, ...AVELORIA_C4_ATLASES]`). Atlas dihasilkan `scripts/gen-town-c4-art.mjs` (DRAFT / NEEDS_REVIEW, code-native).
 * View juga memakai ulang atlas yang sudah ada: `town_aveloria` (bangunan/prop kota), `town_crisis` (frame warga `cit_*`, gerobak).
 */
export const AVELORIA_C4_ATLASES: readonly EnvAtlas[] = [
  { key: 'town_c4', image: 'assets/environment/town/town_c4_atlas.png', json: 'assets/environment/town/town_c4_atlas.json' },
];

/** Tidak ada gambar tanah baru: tanah dasar `town_aveloria_ground` dipakai ulang; perubahan tanah berupa decal di atlas `town_c4`. */
export const AVELORIA_C4_IMAGES: readonly EnvImage[] = [];

/** Kunci tekstur atlas yang diperlukan view (untuk diagnosa/tes). */
export const AVELORIA_C4_REQUIRED_TEXTURES = ['town_aveloria', 'town_crisis', 'town_c4'] as const;
