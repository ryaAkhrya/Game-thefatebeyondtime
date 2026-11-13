import Phaser from 'phaser';
import { SCENE_KEYS } from '../data/ids';
import { getServices } from '../systems/Services';
import { nextStoryChapter } from '../story/chapterFlow';

/** Brief breath over the last shot; the next scene follows without a chapter menu. */
export class SliceEndScene extends Phaser.Scene {
  private elapsed = 0;
  private leaving = false;
  private releaseInput?: () => void;
  constructor() { super(SCENE_KEYS.SliceEnd); }
  create(): void {
    this.elapsed = 0; this.leaving = false;
    this.releaseInput = getServices(this).input.pushLayer('story-transition', () => {});
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput?.());
  }
  override update(_time: number, delta: number): void {
    if (this.leaving || document.hidden) return;
    this.elapsed += Math.min(100, Math.max(0, delta));
    if (this.elapsed < 850) return;
    this.leaving = true;
    this.cameras.main.once('camerafadeoutcomplete', () => this.continueStory());
    this.cameras.main.fadeOut(420, 23, 19, 31);
  }
  private continueStory(): void {
    const services = getServices(this), next = nextStoryChapter(services.gameState.snapshot());
    if (!next) { services.router.closeOverlay(this, SCENE_KEYS.World); return; }
    // Stop the old world before loading the new spawn, so it cannot overwrite it.
    this.scene.stop(SCENE_KEYS.World); this.scene.stop(SCENE_KEYS.Hud);
    services.gameState.load(next.data);
    services.checkpoints.setSafe(true); services.checkpoints.requestAutosave(); services.checkpoints.flush();
    services.checkpoints.setSafe(false);
    services.router.goto(this, next.scene);
  }
}
