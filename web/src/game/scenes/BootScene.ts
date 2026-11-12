import Phaser from 'phaser';
import { COLORS } from '../config/palette';
import { SCENE_KEYS } from '../data/ids';
import { ENV, PORTRAIT_EXPRESSIONS } from '../data/assetPaths';
import { portraitUrl } from '../dialogue/types';
import { TITLE_ART_KEYS } from '../data/assetPaths';
import { ENV_ATLASES, ENV_IMAGES } from '../data/environmentAssets';
import { SFX_REGISTRY } from '../data/sfxRegistry';
import { VFX_ATLASES } from '../vfx/vfxAssets';
import { MUSIC_REGISTRY } from '../data/musicRegistry';
import { BATTLE_SFX } from '../data/battleSfxRegistry';
import { getServices } from '../systems/Services';
import { FONT_LOAD_SPECS } from '../../ui/kit/ui';

/**
 * Boot: memuat font, lalu hanya aset yang benar-benar tersedia.
 * - Audio: hanya cue berstatus READY (saat ini tidak ada -> tidak ada permintaan jaringan, tidak ada 404).
 * - Aset visual: hanya yang `imported` di AssetRegistry (Phase 0: tidak ada).
 * Error pemuatan tidak fatal: dicatat lalu game lanjut (senyap/placeholder).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Boot);
  }

  preload(): void {
    const { assets } = getServices(this);

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[boot] gagal memuat ${file.key} (${file.url}); dilanjutkan tanpa aset ini.`);
    });

    for (const cue of MUSIC_REGISTRY) {
      if (cue.status === 'READY') this.load.audio(cue.id, `assets/audio/${cue.file}`);
    }
    for (const cue of BATTLE_SFX) if (cue.status === 'READY') this.load.audio(cue.id, `assets/audio/${cue.file}`);
    // SFX original Phase 7: tiap file dimuat dengan key `<id>` (satu file) atau `<id>#<n>` (variasi). Kegagalan memuat tidak fatal.
    for (const cue of SFX_REGISTRY) if (cue.status === 'READY') cue.files.forEach((file, i) => this.load.audio(cue.files.length === 1 ? cue.id : `${cue.id}#${i}`, `assets/audio/sfx/${file}`));
    for (const a of VFX_ATLASES) this.load.atlas(a.key, a.image, a.json);
    for (const a of assets.loadable()) {
      this.load.spritesheet(a.id, a.finalPath ?? a.publicPath!, { frameWidth: (a.finalFrameSize ?? a.frameSize)[0], frameHeight: (a.finalFrameSize ?? a.frameSize)[1] });
      // Atlas eksplorasi juga membawa meta (cols + anims) untuk sistem animasi berbasis data.
      this.load.json(`${a.id}:meta`, (a.finalPath ?? a.publicPath!).replace(/\.png$/, '.json'));
    }
    // Lingkungan Hutan 1 (DRAFT dev art) dan portrait ekspresi. Kegagalan memuat tidak fatal (lihat loaderror).
    this.load.image(ENV.groundKey, ENV.groundUrl);
    this.load.atlas(ENV.propsKey, ENV.propsUrl, ENV.propsJsonUrl);
    this.load.json(ENV.propsMetaKey, ENV.propsJsonUrl);
    // Aset lingkungan Sprint 2 (hutan, kota): daftar ada di data/environmentAssets.ts. Atlas JSON (rect+pivot) juga dimuat sebagai meta.
    for (const a of ENV_ATLASES) { this.load.atlas(a.key, a.image, a.json); this.load.json(`${a.key}:meta`, a.json); }
    for (const i of ENV_IMAGES) this.load.image(i.key, i.url);
    // Portrait resolusi tinggi (tinggi 352 px, diturunkan dari PNG ekspresi) untuk dialog yang digambar 1:1 pada resolusi perangkat.
    for (const [speaker, list] of Object.entries(PORTRAIT_EXPRESSIONS)) {
      for (const ex of list) this.load.image(`${speaker}_${ex}`, portraitUrl(`${speaker}_${ex}`));
    }
    // Siluet Title Screen (turunan crop referensi, DRAFT).
    for (const key of TITLE_ART_KEYS) this.load.image(key, `assets/title/${key}.png`);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.ink);

    const fontsReady = Promise.race([
      Promise.all(FONT_LOAD_SPECS.map((spec) => document.fonts.load(spec, 'THE FATE Pengaturan'))),
      new Promise<void>((resolve) => setTimeout(resolve, 3000)), // font gagal: lanjut dengan fallback
    ]);

    // Portrait dan siluet diskalakan turun/naik pecahan: filter linear (bukan nearest) agar halus. Pixel art tetap nearest.
    for (const key of this.textures.getTextureKeys()) {
      if (/^C0\d_[A-Z]+$/.test(key) || (TITLE_ART_KEYS as readonly string[]).includes(key)) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }

    void fontsReady.catch(() => undefined).then(() => {
      this.scene.launch(SCENE_KEYS.Transition); // overlay transisi besar: berjalan terus di atas semua scene
      this.scene.start(SCENE_KEYS.Title);
    });
  }
}
