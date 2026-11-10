import Phaser from 'phaser';
import { MenuList } from '../../ui/components/MenuList';
import { configureUiCamera, makeText } from '../../ui/styles/theme';
import { COLORS } from '../config/palette';
import { SCENE_KEYS } from '../data/ids';
import { getServices } from '../systems/Services';

/** Honest vertical-slice ending; Aveloria, Velthia and the rest of Chapter I have not been played. */
export class SliceEndScene extends Phaser.Scene {
  private releaseInput?: () => void;
  private closing = false;
  constructor() { super(SCENE_KEYS.SliceEnd); }
  create(): void {
    this.closing = false;
    configureUiCamera(this);
    const services = getServices(this);
    services.audio.stopBgm();
    this.add.rectangle(0, 0, 320, 180, COLORS.ink).setOrigin(0);
    this.add.rectangle(10, 10, 300, 160, COLORS.deepPlum).setOrigin(0).setStrokeStyle(1, COLORS.bitterLime);
    makeText(this, 160, 24, 'JALAN KE AVELORIA', { originX: 0.5, color: COLORS.bitterLime });
    makeText(this, 160, 44, 'Mournfang surut ke dalam hutan.\nJalan ke timur kembali terbuka.', { originX: 0.5, lineSpacing: 5 });
    makeText(this, 160, 76, 'Akhir demo - bagian awal Bab I.\nBersambung di Aveloria.', { originX: 0.5, lineSpacing: 3, color: COLORS.paperDim });
    const menu = new MenuList(this, { x: 160, y: 106, width: 200, rowHeight: 13,
      items: [{ id: 'explore', label: 'Jelajahi kembali' }, { id: 'save', label: 'Simpan/Muat' }, { id: 'settings', label: 'Pengaturan' }, { id: 'title', label: 'Ke Judul' }],
      onConfirm: item => {
        if (this.closing) return;
        if (item.id === 'save') services.router.openOverlay(this, SCENE_KEYS.SaveLoad);
        else if (item.id === 'settings') services.router.openOverlay(this, SCENE_KEYS.Settings);
        else if (item.id === 'explore') this.resumeWorld();
        else { this.closing = true; this.scene.stop(SCENE_KEYS.World); this.scene.stop(SCENE_KEYS.Hud); services.router.goto(this, SCENE_KEYS.Title); }
      } });
    this.releaseInput = services.input.pushLayer('slice-end', event => {
      if (this.closing) return;
      if (event.intent === 'back') this.resumeWorld(); else menu.handleIntent(event);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput?.());
  }
  private resumeWorld(): void {
    if (this.closing) return;
    this.closing = true;
    const services = getServices(this); services.audio.playBgm('BGM_FOREST_01');
    services.router.closeOverlay(this, SCENE_KEYS.World);
  }
}
