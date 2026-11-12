/**
 * Langkah kaki berbasis JARAK gerak nyata (bukan timer): tidak ada suara saat diam/terhalang dinding, lari berirama lebih
 * cepat karena kecepatan dan stride lebih pendek. Murni (tanpa Phaser) agar dapat diuji unit.
 */
export type Surface = 'grass' | 'dirt' | 'stone';

export const WALK_STRIDE = 26; // px per langkah
export const SPRINT_STRIDE = 22;

export function surfaceFor(area: string): Surface {
  switch (area) {
    case 'aveloria': case 'temple': case 'fortress': return 'stone';
    case 'forest_edge': case 'cliff': return 'dirt';
    default: return 'grass'; // forest_1, forest_2, liora
  }
}

export const STEP_SFX: Readonly<Record<Surface, string>> = { grass: 'SFX_STEP_GRASS', dirt: 'SFX_STEP_DIRT', stone: 'SFX_STEP_STONE' };

export class FootstepTracker {
  private dist = 0;
  private moving = false;
  /** @returns true bila satu langkah harus dibunyikan pada pembaruan ini. */
  update(moved: number, sprinting: boolean): boolean {
    if (!(moved > 0)) { this.moving = false; this.dist = 0; return false; }
    const stride = sprinting ? SPRINT_STRIDE : WALK_STRIDE;
    if (!this.moving) { this.moving = true; this.dist = stride * 0.55; } // langkah pertama segera setelah mulai bergerak
    this.dist += moved;
    if (this.dist >= stride) { this.dist -= stride; return true; }
    return false;
  }
  reset(): void { this.dist = 0; this.moving = false; }
}
