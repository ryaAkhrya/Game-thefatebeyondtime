import type Phaser from 'phaser';
import type { SettingsRepository } from './SettingsRepository';

/** Satu pintu efek layar agar Settings (Screen Shake / Reduced Flashes) selalu dihormati. */
export class Effects {
  constructor(private readonly settings: SettingsRepository) {}

  /** Screen Shake OFF -> tidak ada gerak kamera. Mengembalikan true bila shake dijalankan. */
  shake(scene: Phaser.Scene, durationMs = 120, intensity = 0.004): boolean {
    if (!this.settings.get('screen_shake')) return false;
    scene.cameras.main.shake(durationMs, intensity);
    return true;
  }

  /** Reduced Flashes ON -> tidak ada flash layar penuh. Mengembalikan true bila flash dijalankan. */
  flash(scene: Phaser.Scene, durationMs = 80): boolean {
    if (this.settings.get('reduced_flashes')) return false;
    scene.cameras.main.flash(durationMs, 255, 255, 255);
    return true;
  }
}
