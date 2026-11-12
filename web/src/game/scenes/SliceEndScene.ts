import Phaser from 'phaser';
import { MenuList } from '../../ui/components/MenuList';
import { veil } from '../../ui/components/frame';
import { TYPE, Ui, bindRelayout } from '../../ui/kit/ui';
import { COLORS } from '../config/palette';
import { SCENE_KEYS } from '../data/ids';
import { getServices } from '../systems/Services';
import { CITY_FLAG, CITY_SPAWN } from '../story/aveloriaFlags';
import { C2, RETURN_SPAWN } from '../story/chapter2Flags';
import { C3 } from '../story/chapter3Flags';
import { C4 } from '../story/chapter4Flags';
import { enterChapter4 } from '../rpg/party';
import { FORTRESS_SPAWN } from '../world/fortressMaps';

/** Layar jeda akhir segmen/bab: kartu tengah yang tenang. Peluncur Bab II/III muncul hanya setelah bab sebelumnya selesai. */
export class SliceEndScene extends Phaser.Scene {
  private ui!: Ui;
  private releaseInput?: () => void;
  private closing = false;
  private menu?: MenuList;
  constructor() { super(SCENE_KEYS.SliceEnd); }
  create(): void {
    this.closing = false;
    this.ui = new Ui(this);
    const services = getServices(this);
    services.audio.stopBgm();
    this.build();
    this.ui.fadeIn();
    bindRelayout(this, () => this.build(this.menu?.focusedItem.id));
    this.releaseInput = services.input.pushLayer('slice-end', event => {
      if (this.closing) return;
      if (event.intent === 'back') this.resumeWorld(); else this.menu?.handleIntent(event);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput?.());
  }

  private build(focusId?: string): void {
    const ui = this.ui;
    const services = getServices(this);
    const chapterDone = services.gameState.hasFlag(CITY_FLAG.complete);
    const chapter2Done = services.gameState.hasFlag(C2.complete);
    const chapter3Done = services.gameState.hasFlag(C3.complete);
    const chapter4Done = services.gameState.hasFlag(C4.complete);
    const canStartChapter2 = chapterDone && services.gameState.snapshot()?.chapter === 'I';
    const canStartChapter3 = chapter2Done && services.gameState.snapshot()?.chapter === 'II';
    const canStartChapter4 = chapter3Done && services.gameState.snapshot()?.chapter === 'III';
    veil(ui, 0.9, COLORS.night);
    const cx = ui.dw / 2;
    ui.text(cx, 96, chapter4Done ? 'BAB IV SELESAI' : chapter3Done ? 'BAB III SELESAI' : chapter2Done ? 'BAB II SELESAI' : chapterDone ? 'BAB I SELESAI' : 'JALAN KE AVELORIA', { family: 'display', weight: '700', size: TYPE.display, originX: 0.5, color: COLORS.bitterLime, depth: 3 });
    ui.motif(cx, 142, 150, 12, 3);
    ui.text(cx, 168, chapter4Done ? 'Menara tua runtuh. Warga selamat.\nHeart terbuka; pilihan tetap milik mereka.' : chapter3Done ? 'Nama itu akhirnya punya wajah.\nJalan menuju benteng terbuka.' : chapter2Done ? 'Dua catatan. Satu keputusan.\nAzie menelusuri lambang kuil.' : chapterDone ? 'Dua dentang. Satu waktu.\nPenyelidikan baru dimulai.' : 'Mournfang surut ke dalam hutan.\nJalan ke timur kembali terbuka.', { size: TYPE.body + 2, originX: 0.5, align: 'center', leading: 8, depth: 3 });
    ui.text(cx, 236, chapter4Done ? 'The Fate  ·  Bab IV selesai' : chapter3Done ? 'The Forgotten Promise  ·  bersambung ke The Fate' : chapter2Done ? 'Whispers of Fate  ·  bersambung' : chapterDone ? 'The Nameless Wanderer  ·  bersambung ke Whispers of Fate' : 'Gerbang kerajaan menunggu. Simpan perjalanan sebelum masuk.', { size: TYPE.small, originX: 0.5, color: COLORS.paperDim, depth: 3 });
    this.menu = new MenuList(this, { ui, x: cx, y: 274, width: 260, rowHeight: 36, align: 'center', depth: 4, size: TYPE.body + 1, initialId: focusId,
      items: [...(!chapterDone ? [{ id: 'aveloria', label: 'Masuk Aveloria' }] : []), ...(canStartChapter2 ? [{ id: 'chapter2', label: 'Mulai Bab II' }] : []), ...(canStartChapter3 ? [{ id: 'chapter3', label: 'Mulai Bab III' }] : []), ...(canStartChapter4 ? [{ id: 'chapter4', label: 'Mulai Bab IV' }] : []), { id: 'explore', label: chapterDone ? 'Jelajahi Aveloria' : 'Jelajahi kembali' }, { id: 'save', label: 'Simpan / Muat' }, { id: 'settings', label: 'Pengaturan' }, { id: 'title', label: 'Ke Judul' }],
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
        else if (item.id === 'chapter3') {
          this.closing = true;
          this.scene.stop(SCENE_KEYS.World); this.scene.stop(SCENE_KEYS.Hud);
          const data = services.gameState.snapshot()!;
          data.chapter = 'III'; data.flags[C3.start] = true; data.storyBeat = 'C3-01'; data.area = 'aveloria'; data.position = { ...RETURN_SPAWN };
          services.gameState.load(data); services.checkpoints.requestAutosave();
          services.router.goto(this, SCENE_KEYS.World);
        }
        else if (item.id === 'chapter4') {
          this.closing = true;
          this.scene.stop(SCENE_KEYS.World); this.scene.stop(SCENE_KEYS.Hud);
          const data = enterChapter4(services.gameState.snapshot()!);
          data.storyBeat = 'C4-01'; data.position = { ...FORTRESS_SPAWN };
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
  }

  private resumeWorld(): void {
    if (this.closing) return;
    this.closing = true;
    const services = getServices(this); const area = services.gameState.snapshot()?.area;
    services.audio.playBgm(area === 'aveloria' ? 'BGM_AVELORIA_DAY' : area === 'liora' ? 'BGM_LIORA' : area === 'forest_2' ? 'BGM_FOREST_02' : area === 'temple' ? 'BGM_TEMPLE' : area === 'fortress' ? 'BGM_CRISIS' : 'BGM_FOREST_01');
    services.router.closeOverlay(this, SCENE_KEYS.World);
  }
}
