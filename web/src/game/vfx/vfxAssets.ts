/**
 * Atlas VFX pixel-art Polish/Phase 7 (dihasilkan oleh web/scripts/vfx/build.mjs; BootScene memuat semuanya).
 * Atlas = PNG + JSON berformat Phaser atlas (frames) dengan `pivot` per frame. Path relatif terhadap web/public.
 * Status semua: DRAFT / NEEDS_REVIEW (digambar dengan kode, bukan seniman).
 */
export interface VfxAtlas { key: string; image: string; json: string }
export const VFX_ATLASES: readonly VfxAtlas[] = [
  { key: 'vfx_combat', image: 'assets/vfx/vfx_combat.png', json: 'assets/vfx/vfx_combat.json' },
  { key: 'vfx_nature', image: 'assets/vfx/vfx_nature.png', json: 'assets/vfx/vfx_nature.json' },
  { key: 'vfx_velthia', image: 'assets/vfx/vfx_velthia.png', json: 'assets/vfx/vfx_velthia.json' },
  { key: 'vfx_enemy', image: 'assets/vfx/vfx_enemy.png', json: 'assets/vfx/vfx_enemy.json' },
  { key: 'vfx_chrono', image: 'assets/vfx/vfx_chrono.png', json: 'assets/vfx/vfx_chrono.json' },
];

/** Palet tertutup tiap atlas (heks). Diuji terhadap piksel PNG: tidak boleh ada warna di luar daftar ini. */
export const VFX_PALETTES: Readonly<Record<string, readonly string[]>> = {
  vfx_combat: ['#1D1625', '#ECE3D6', '#B9C6D6', '#7F93AD', '#E3B66A', '#F2D98F', '#D9824A', '#A8552F', '#9A9088', '#6E655F', '#463F3F', '#94744F', '#735C44', '#43362A', '#C2B49A', '#9C8E78'],
  vfx_nature: ['#1D1625', '#3B2A1F', '#6B4A2E', '#9A6F44', '#2F4A2C', '#4F7A3A', '#7FA84A', '#A9C45E', '#E6D9A8', '#D4A64A', '#4A3526', '#65533E', '#8A6A47'],
  vfx_velthia: ['#1D1625', '#3B2A4A', '#4D3A5F', '#6A5580', '#8A77A0', '#C97B84', '#E3B4C0', '#C7D96A', '#8FA044', '#5E7034', '#E3B66A', '#F3E2A8', '#ECE3D6'],
  vfx_enemy: ['#1D1625', '#2B2038', '#5A4470', '#8A6CA8', '#E4D9C4', '#A89C86', '#7A2E3A', '#C25058', '#E58F85', '#C9D6E4', '#8296B0', '#4E5E78', '#A9C45E', '#6E9440', '#3F5A2A', '#C9A8E0'],
  vfx_chrono: ['#1D1625', '#C9C0B4', '#9A9088', '#6E655F', '#463F3F', '#A9D6D0', '#5E9A98', '#2F5E62', '#F3DC9A', '#E3B66A', '#A8742F', '#C2B49A', '#9C8E78'],
};
