import type Phaser from 'phaser';
import { SCENE_KEYS, type SceneKey } from '../data/ids';
import type { CoverKind } from '../scenes/TransitionScene';

/** Pemutar transisi besar (TransitionScene); diakses lewat duck-typing agar router tidak bergantung pada kelas scene. */
interface TransitionPlayer { isReady(): boolean; isCovered(): boolean; cover(kind: CoverKind, label?: string): Promise<void>; reveal(): Promise<void>; whenRevealed(): Promise<void> }
export interface GotoOptions { transition?: CoverKind; label?: string }

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
    const t = this.player(scene);
    if (t?.isCovered()) { void t.reveal(); return; } // layar sedang tertutup transisi besar: buka, bukan fade biasa
    scene.cameras.main.fadeIn(FADE_MS, ...FADE_RGB);
  }

  private player(scene: Phaser.Scene): TransitionPlayer | null {
    const t = scene.scene.manager.getScene(SCENE_KEYS.Transition) as unknown as TransitionPlayer | null;
    return t && typeof t.cover === 'function' && t.isReady() ? t : null;
  }

  /** Resolve setelah transisi besar selesai membuka layar (langsung bila tidak ada). Dipakai untuk menunda input battle. */
  revealed(scene: Phaser.Scene): Promise<void> {
    return this.player(scene)?.whenRevealed() ?? Promise.resolve();
  }

  goto(from: Phaser.Scene, to: SceneKey, data?: object, options?: GotoOptions): boolean {
    if (this.busy) return false;
    this.busy = true;
    const big = options?.transition ? this.player(from) : null;
    if (big) {
      void big.cover(options!.transition!, options!.label).then(() => from.scene.start(to, data));
      return true;
    }
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
    // Paused scenes still render. A reused overlay must draw above its caller,
    // including SliceEnd -> SaveLoad and Battle/Pause -> Settings.
    from.scene.bringToTop(overlay);
    return true;
  }

  closeOverlay(overlay: Phaser.Scene, returnTo: SceneKey): void {
    const i = this.overlays.indexOf(overlay.scene.key);
    if (i >= 0) this.overlays.splice(i, 1);
    overlay.scene.stop();
    overlay.scene.resume(returnTo);
  }

  /** Diagnostik QA: keadaan router. */
  debug(): { busy: boolean; overlays: string[] } {
    return { busy: this.busy, overlays: [...this.overlays] };
  }

  get hasOverlay(): boolean {
    return this.overlays.length > 0;
  }
}
