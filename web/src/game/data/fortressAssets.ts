import type { EnvAtlas, EnvImage } from './environmentAssets';

/**
 * Aset lingkungan Warden Fortress (Phase 8; DRAFT code-native dari scripts/gen-fortress-art.mjs). Lead memasang kedua daftar ini ke
 * `environmentAssets.ts` (ENV_ATLASES / ENV_IMAGES) sehingga BootScene memuatnya. Key dipakai oleh world/FortressView.ts.
 */
export const FORTRESS_ATLAS_KEY = 'fortress_props';
export const FORTRESS_GROUND_KEY = 'fortress_ground';

export const FORTRESS_ATLASES: EnvAtlas[] = [
  { key: FORTRESS_ATLAS_KEY, image: 'assets/environment/fortress/props.png', json: 'assets/environment/fortress/props.json' },
];
export const FORTRESS_IMAGES: EnvImage[] = [
  { key: FORTRESS_GROUND_KEY, url: 'assets/environment/fortress/ground.png' },
];
