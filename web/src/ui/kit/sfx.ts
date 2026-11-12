import type Phaser from 'phaser';
import { getServices } from '../../game/systems/Services';
import type { SfxPlayOptions } from '../../game/systems/AudioManager';

/** SFX UI aman: tidak pernah melempar (Services belum terdaftar / audio terkunci / file hilang -> senyap). Pembatasan laju ada di AudioManager. */
export function uiSfx(scene: Phaser.Scene, id: string, opts?: SfxPlayOptions): void {
  try {
    getServices(scene).audio.playSfx(id, opts);
  } catch {
    /* senyap */
  }
}
