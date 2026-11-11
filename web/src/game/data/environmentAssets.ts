/**
 * Daftar aset lingkungan tambahan (Polish Sprint 2). BootScene memuat semuanya; tiap area menambah baris sendiri di
 * bagian miliknya agar tidak bentrok. Atlas = PNG + JSON berformat Phaser atlas (frames) dengan `pivot` per frame
 * (sama seperti forest1 props). Path relatif terhadap web/public.
 */
export interface EnvAtlas { key: string; image: string; json: string }
export interface EnvImage { key: string; url: string }

// ---- Hutan (Hutan 1, tepi hutan, Hutan 2) ----
const FOREST_ATLASES: EnvAtlas[] = [
  { key: 'forest2_props', image: 'assets/environment/forest2/props.png', json: 'assets/environment/forest2/props.json' },
];
const FOREST_IMAGES: EnvImage[] = [
  { key: 'forest_edge_ground', url: 'assets/environment/forest_edge/ground.png' },
  { key: 'forest2_ground', url: 'assets/environment/forest2/ground.png' },
];

// ---- Kota (Aveloria, Liora) ----
const TOWN_ATLASES: EnvAtlas[] = [
  { key: 'town_aveloria', image: 'assets/environment/town/aveloria_atlas.png', json: 'assets/environment/town/aveloria_atlas.json' },
  { key: 'town_liora', image: 'assets/environment/town/liora_atlas.png', json: 'assets/environment/town/liora_atlas.json' },
];
const TOWN_IMAGES: EnvImage[] = [
  { key: 'town_aveloria_ground', url: 'assets/environment/town/aveloria_ground.png' },
  { key: 'town_liora_ground', url: 'assets/environment/town/liora_ground.png' },
];

export const ENV_ATLASES: readonly EnvAtlas[] = [...FOREST_ATLASES, ...TOWN_ATLASES];
export const ENV_IMAGES: readonly EnvImage[] = [...FOREST_IMAGES, ...TOWN_IMAGES];
