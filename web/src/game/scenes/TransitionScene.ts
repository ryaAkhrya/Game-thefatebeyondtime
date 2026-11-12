import Phaser from 'phaser';
import { Ui, TYPE } from '../../ui/kit/ui';
import { RETURN_TRANSITION, TRANSITIONS, type TransitionKind, type TransitionSpec } from '../combat/presentation';
import { COLORS } from '../config/palette';
import { SCENE_KEYS } from '../data/ids';
import { getDisplay } from '../systems/DisplayController';
import { getServices, type Services } from '../systems/Services';

export type CoverKind = TransitionKind | 'return';

/** Spesifikasi internal untuk transisi kembali ke dunia (tanpa SFX, tanpa plakat). */
const RETURN_SPEC: TransitionSpec = { kind: 'normal', coverMs: RETURN_TRANSITION.coverMs, holdMs: 0, revealMs: RETURN_TRANSITION.revealMs, bars: 6, steps: 0, nameplate: false, sfx: '', flashy: false };

/**
 * Scene overlay selalu-di-atas untuk transisi besar (masuk/keluar battle). Berjalan di atas semua scene sehingga tidak ikut
 * berhenti ketika scene dunia/battle diganti: layar tetap tertutup saat pergantian scene (tanpa kedip hitam), lalu dibuka
 * begitu scene tujuan siap. Identitas visual: pita-pita "halaman kitab" Deep Plum yang menyapu bergantian dari kiri/kanan
 * dengan garis tepi Bitter Lime; transisi temporal bergerak bertahap seperti jarum yang tersendat.
 */
export class TransitionScene extends Phaser.Scene {
  private services!: Services;
  private g!: Phaser.GameObjects.Graphics;
  private plate: Phaser.GameObjects.Text[] = [];
  private pulse!: Phaser.GameObjects.Rectangle;
  private progress = 0; // 0 = terbuka, 1 = tertutup penuh
  private spec: TransitionSpec = TRANSITIONS.normal;
  private mode: 'open' | 'covering' | 'covered' | 'revealing' = 'open';
  private tween?: Phaser.Tweens.Tween;
  private revealPromise: Promise<void> = Promise.resolve();
  private ready = false;
  private log: { kind: string; phase: string; at: number }[] = [];
  private flashes = 0;

  constructor() { super(SCENE_KEYS.Transition); }

  create(): void {
    this.services = getServices(this);
    this.g = this.add.graphics().setDepth(0);
    this.pulse = this.add.rectangle(0, 0, 4, 4, 0xe8e0f0, 0).setOrigin(0).setDepth(1);
    this.ready = true;
    this.mode = 'open'; this.progress = 0; this.plate = [];
    this.scene.bringToTop();
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => { this.ready = false; });
  }

  isReady(): boolean { return this.ready; }
  isCovered(): boolean { return this.mode === 'covered' || this.mode === 'covering'; }
  whenRevealed(): Promise<void> { return this.revealPromise; }
  debug(): { mode: string; progress: number; kind: string; flashes: number; plate: boolean; log: { kind: string; phase: string; at: number }[] } {
    return { mode: this.mode, progress: this.progress, kind: this.spec.kind, flashes: this.flashes, plate: this.plate.length > 0, log: this.log.slice(-12) };
  }

  /** Tutup layar. Resolve ketika layar tertutup penuh dan plakat (bila ada) selesai ditahan. */
  cover(kind: CoverKind, label?: string): Promise<void> {
    const spec = kind === 'return' ? RETURN_SPEC : TRANSITIONS[kind];
    this.tween?.stop(); this.spec = spec; this.mode = 'covering';
    this.scene.bringToTop();
    this.clearPlate();
    this.log.push({ kind, phase: 'cover', at: this.time.now });
    if (spec.sfx) this.services.audio.playSfx(spec.sfx);
    return new Promise(resolve => {
      this.progress = 0;
      const calm = this.services.settings.get('reduced_flashes');
      this.tween = this.tweens.add({
        targets: this, progress: 1, duration: spec.coverMs, ease: kind === 'boss' ? 'Cubic.easeIn' : 'Quad.easeIn',
        onUpdate: () => this.draw(),
        onComplete: () => {
          this.progress = 1; this.mode = 'covered'; this.draw();
          if (spec.nameplate && label) this.showPlate(label);
          if (spec.flashy && !calm) this.flashPulse();
          this.time.delayedCall(spec.holdMs, () => resolve());
        },
      });
    });
  }

  /** Buka layar oleh scene tujuan (dipanggil SceneRouter.arrive). */
  reveal(): Promise<void> {
    if (this.mode === 'open') return Promise.resolve();
    const spec = this.spec;
    this.tween?.stop(); this.mode = 'revealing';
    this.log.push({ kind: spec.kind, phase: 'reveal', at: this.time.now });
    this.revealPromise = new Promise(resolve => {
      this.fadePlate(Math.min(220, spec.revealMs));
      this.tween = this.tweens.add({
        targets: this, progress: 0, duration: spec.revealMs, ease: 'Quad.easeOut',
        onUpdate: () => this.draw(),
        onComplete: () => { this.progress = 0; this.mode = 'open'; this.clearPlate(); this.draw(); resolve(); },
      });
    });
    return this.revealPromise;
  }

  // ---------------------------------------------------------------- gambar

  private draw(): void {
    const l = getDisplay(this);
    const W = l.pixelWidth, H = l.pixelHeight;
    const g = this.g;
    g.clear();
    if (this.progress <= 0) return;
    const spec = this.spec;
    const n = spec.bars;
    const stagger = 0.45;
    let p = this.progress;
    if (spec.steps > 0 && p < 1) p = Math.floor(p * spec.steps) / spec.steps; // gerak tersendat
    const trim = Math.max(2, Math.round(l.uiScale * 2));
    const stripH = Math.ceil(H / n);
    for (let i = 0; i < n; i++) {
      const fromLeft = i % 2 === 0;
      const order = fromLeft ? i : n - 1 - i;
      const local = Math.min(1, Math.max(0, (p - (order / n) * stagger) / (1 - stagger)));
      const eased = 1 - (1 - local) * (1 - local);
      const w = Math.round(W * eased);
      if (w <= 0) continue;
      const y = i * stripH, h = Math.min(stripH, H - y);
      const x = fromLeft ? 0 : W - w;
      g.fillStyle(COLORS.deepPlum, 1); g.fillRect(x, y, w, h);
      if (local < 1) { g.fillStyle(COLORS.bitterLime, 1); g.fillRect(fromLeft ? w - trim : x, y, trim, h); }
    }
    if (p >= 1) { g.fillStyle(COLORS.deepPlum, 1); g.fillRect(0, 0, W, H); }
    if (spec.steps > 0 && p > 0) { g.fillStyle(0xd9c27a, 0.8); g.fillRect(0, Math.round(H / 2), W, Math.max(1, Math.round(l.uiScale * 0.6))); }
  }

  private showPlate(label: string): void {
    const ui = new Ui(this);
    const name = ui.text(ui.dw / 2, ui.dh / 2 - 8, label.toUpperCase(), { size: TYPE.display + 6, weight: '700', family: 'display', originX: 0.5, originY: 0.5, color: COLORS.bitterLime, depth: 3, alpha: 0 });
    const rule = ui.text(ui.dw / 2, ui.dh / 2 + 22, '—  ✦  —', { size: TYPE.body, originX: 0.5, originY: 0.5, color: COLORS.paper, depth: 3, alpha: 0 });
    this.plate = [name, rule];
    this.tweens.add({ targets: this.plate, alpha: 1, duration: 220 });
  }
  private fadePlate(ms: number): void { if (this.plate.length) this.tweens.add({ targets: this.plate, alpha: 0, duration: ms }); }
  private clearPlate(): void { for (const t of this.plate) t.destroy(); this.plate = []; }

  /** Satu denyut terang singkat (hanya bila Reduced Flashes mati): redup, bukan putih penuh. */
  private flashPulse(): void {
    const l = getDisplay(this);
    this.flashes++;
    this.pulse.setSize(l.pixelWidth, l.pixelHeight).setAlpha(0.28);
    this.tweens.add({ targets: this.pulse, alpha: 0, duration: 110 });
  }
}
