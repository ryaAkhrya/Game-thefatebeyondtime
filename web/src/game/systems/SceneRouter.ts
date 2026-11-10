import type Phaser from 'phaser';
import type { SceneKey } from '../data/ids';

export interface OverlayData {
  returnTo: SceneKey;
}

const FADE_MS = 140;
const FADE_RGB: readonly [number, number, number] = [29, 22, 37]; // COLORS.ink

/**
 * Transisi scene terpusat. Mencegah transisi ganda (Enter ditekan dua kali) dan menumpuk overlay.
 * - goto(): fade lalu scene.start (scene lama berhenti).
 * - openOverlay()/closeOverlay(): scene pemanggil di-pause (bukan dihentikan) agar bisa dilanjutkan.
 *   Pause Menu Phase 1+ memakai jalur yang sama untuk membuka Settings.
 */
export class SceneRouter {
  private busy = false;
  private readonly overlays: string[] = [];

  /** Scene baru memanggil ini di create() agar transisi berikutnya dapat berjalan. */
  arrive(scene: Phaser.Scene): void {
    this.busy = false;
    this.overlays.length = 0; // scene baru = tumpukan overlay lama sudah tidak berlaku
    scene.cameras.main.fadeIn(FADE_MS, ...FADE_RGB);
  }

  goto(from: Phaser.Scene, to: SceneKey, data?: object): boolean {
    if (this.busy) return false;
    this.busy = true;
    const cam = from.cameras.main;
    cam.once('camerafadeoutcomplete', () => from.scene.start(to, data));
    // force=true: tetap berjalan walau fade-in scene ini belum selesai (hindari softlock bila Enter cepat).
    cam.fade(FADE_MS, ...FADE_RGB, true);
    return true;
  }

  /** Overlay dapat ditumpuk (Pause -> Pengaturan) tetapi satu jenis overlay tidak boleh dibuka dua kali. */
  openOverlay(from: Phaser.Scene, overlay: SceneKey, data: object = {}): boolean {
    if (this.busy || this.overlays.includes(overlay)) return false;
    this.overlays.push(overlay);
    const returnTo = from.scene.key as SceneKey;
    from.scene.pause();
    from.scene.launch(overlay, { ...data, returnTo } satisfies OverlayData);
    return true;
  }

  closeOverlay(overlay: Phaser.Scene, returnTo: SceneKey): void {
    const i = this.overlays.indexOf(overlay.scene.key);
    if (i >= 0) this.overlays.splice(i, 1);
    overlay.scene.stop();
    overlay.scene.resume(returnTo);
  }

  get hasOverlay(): boolean {
    return this.overlays.length > 0;
  }
}
