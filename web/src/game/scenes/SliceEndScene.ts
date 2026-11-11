import Phaser from 'phaser';
import { MenuList } from '../../ui/components/MenuList';
import { configureUiCamera, makeText } from '../../ui/styles/theme';
import { COLORS } from '../config/palette';
import { SCENE_KEYS } from '../data/ids';
import { getServices } from '../systems/Services';
import { CITY_FLAG, CITY_SPAWN } from '../story/aveloriaFlags';
import { C2 } from '../story/chapter2Flags';

/** Existing classic checkpoint/ending menu, now also the Chapter II boundary. */
export class SliceEndScene extends Phaser.Scene {
  private releaseInput?: () => void;
  private closing = false;
  constructor() { super(SCENE_KEYS.SliceEnd); }
  create(): void {
    this.closing = false;
    configureUiCamera(this);
    const services = getServices(this);
    const chapterDone = services.gameState.hasFlag(CITY_FLAG.complete);
    const chapter2Done = services.gameState.hasFlag(C2.complete);
    const canStartChapter2 = chapterDone && services.gameState.snapshot()?.chapter === 'I';
    services.audio.stopBgm();
    this.add.rectangle(0, 0, 320, 180, COLORS.ink).setOrigin(0);
    this.add.rectangle(10, 10, 300, 160, COLORS.deepPlum).setOrigin(0).setStrokeStyle(1, COLORS.bitterLime);
    makeText(this, 160, 24, chapter2Done ? 'BAB II SELESAI' : chapterDone ? 'BAB I SELESAI' : 'JALAN KE AVELORIA', { originX: 0.5, color: COLORS.bitterLime });
    makeText(this, 160, 44, chapter2Done ? 'Dua catatan. Satu keputusan.\nAzie menelusuri lambang kuil.' : chapterDone ? 'Dua dentang. Satu waktu.\nPenyelidikan baru dimulai.' : 'Mournfang surut ke dalam hutan.\nJalan ke timur kembali terbuka.', { originX: 0.5, lineSpacing: 5 });
    makeText(this, 160, 76, chapter2Done ? 'Whispers of Fate\nBersambung di Bab III' : chapterDone ? 'The Nameless Wanderer\nBersambung — Whispers of Fate' : 'Gerbang kerajaan menunggu.\nSimpan perjalanan sebelum masuk.', { originX: 0.5, lineSpacing: 3, color: COLORS.paperDim });
    const menu = new MenuList(this, { x: 160, y: 106, width: 200, rowHeight: 13,
      items: [...(!chapterDone ? [{ id: 'aveloria', label: 'Masuk Aveloria' }] : []), ...(canStartChapter2 ? [{ id: 'chapter2', label: 'Mulai Bab II' }] : []), { id: 'explore', label: chapterDone ? 'Jelajahi Aveloria' : 'Jelajahi kembali' }, { id: 'save', label: 'Simpan/Muat' }, { id: 'settings', label: 'Pengaturan' }, { id: 'title', label: 'Ke Judul' }],
      onConfirm: item => {
        if (this.closing) return;
        if (item.id === 'save') services.router.openOverlay(this, SCENE_KEYS.SaveLoad);
        else if (item.id === 'settings') services.router.openOverlay(this, SCENE_KEYS.Settings);
        else if (item.id === 'explore') this.resumeWorld();
        else if (item.id === 'chapter2') {
          this.closing = true;
          this.scene.stop(SCENE_KEYS.World); this.scene.stop(SCENE_KEYS.Hud);
          const data = services.gameState.snapshot()!;
          data.chapter = 'II'; data.flags[C2.start] = true; data.position = { x: 856, y: 824, facing: 'right' };
          services.gameState.load(data); services.checkpoints.requestAutosave();
          services.router.goto(this, SCENE_KEYS.World);
        }
        else if (item.id === 'aveloria') {
          this.closing = true;
          this.scene.stop(SCENE_KEYS.World); this.scene.stop(SCENE_KEYS.Hud);
          const data = services.gameState.snapshot()!; data.area = 'aveloria'; data.position = { ...CITY_SPAWN };
          services.gameState.load(data); services.checkpoints.requestAutosave();
          services.router.goto(this, SCENE_KEYS.World);
        }
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
    const services = getServices(this); const area = services.gameState.snapshot()?.area;
    services.audio.playBgm(area === 'aveloria' ? 'BGM_AVELORIA_DAY' : area === 'liora' ? 'BGM_LIORA' : area === 'forest_2' ? 'BGM_FOREST_02' : 'BGM_FOREST_01');
    services.router.closeOverlay(this, SCENE_KEYS.World);
  }
}
