import Phaser from 'phaser';
import { COLORS, css } from '../config/palette';
import { SCENE_KEYS } from '../data/ids';
import { getServices, type Services } from '../systems/Services';
import { MenuList, type MenuItem } from '../../ui/components/MenuList';
import { Ui, TYPE, bindRelayout } from '../../ui/kit/ui';

type TitleAction = 'new' | 'continue' | 'settings' | 'controls';

const NO_SAVE_HINT = 'Belum ada data simpan.';

/**
 * Title Screen: komposisi satu bidang, bukan daftar menu di atas latar. Dua siluet (Yaric di kiri dengan greatsword,
 * Velthia di kanan) berdiri berhadapan di antara dua busur terputus yang hampir bertemu. Menu berada di celah di antara
 * mereka. Siluet berasal dari tampak samping turnaround resmi (crop referensi DRAFT) yang diberi nada gelap.
 */
export class TitleScene extends Phaser.Scene {
  private services!: Services;
  private ui!: Ui;
  private menu!: MenuList;
  private status!: Phaser.GameObjects.Text;
  private statusTimer?: Phaser.Time.TimerEvent;
  private releaseInput?: () => void;
  private bgKey = '';
  private buildCount = 0;
  private arcs?: Phaser.GameObjects.Graphics;
  private arcsGeometry = { cx: 0, cy: 0, r: 0, w: 0 };
  private gapTime = 0;
  private introDone = false;
  private focusId?: string;

  constructor() {
    super(SCENE_KEYS.Title);
  }

  create(): void {
    this.services = getServices(this);
    const { router, input, audio, settings } = this.services;
    this.ui = new Ui(this);
    router.arrive(this);
    this.introDone = false;
    this.build(true);
    bindRelayout(this, () => { this.focusId = this.menu?.focusedItem.id; this.build(false); });

    this.releaseInput = input.pushLayer('title', (e) => {
      const mapped = e.intent === 'left' ? 'up' : e.intent === 'right' ? 'down' : e.intent;
      this.menu.handleIntent({ ...e, intent: mapped });
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.releaseInput?.();
      if (this.bgKey && this.textures.exists(this.bgKey)) this.textures.remove(this.bgKey);
    });

    // Audio dimulai hanya setelah input pemain; tanpa file komposer -> senyap, tanpa error.
    audio.playBgm('BGM_TITLE');

    if (settings.recoveredFromCorruption) {
      this.setStatus('Pengaturan tersimpan rusak; memakai bawaan.', COLORS.warn, 4000);
    }
  }

  private build(intro: boolean): void {
    const ui = this.ui;
    const { saves } = this.services;
    const reduced = !this.services.settings.get('screen_shake') && this.services.settings.get('reduced_flashes');
    void reduced;
    this.cameras.main.setBackgroundColor(COLORS.night);
    this.paintBackdrop();
    this.paintStars();
    this.paintArcs();
    this.paintFigures(intro);
    this.paintTitle(intro);

    const hasSave = saves.hasValidSave();
    const items: (MenuItem & { action: TitleAction })[] = [
      { id: 'new', action: 'new', label: 'Mulai Baru' },
      { id: 'continue', action: 'continue', label: 'Lanjut', disabled: !hasSave, disabledHint: NO_SAVE_HINT },
      { id: 'settings', action: 'settings', label: 'Pengaturan' },
      { id: 'controls', action: 'controls', label: 'Panduan Kontrol' },
    ];
    this.menu = new MenuList(this, {
      ui,
      x: ui.dw / 2,
      y: 292,
      width: 214,
      rowHeight: 34,
      align: 'center',
      family: 'display',
      size: 15.5,
      depth: 20,
      items,
      initialId: this.focusId,
      onConfirm: (item) => this.activate((item as (typeof items)[number]).action),
      onDisabledConfirm: (item) => this.setStatus(item.disabledHint ?? '', COLORS.warn, 2500),
      onFocusChange: (item) => {
        if (item.disabled) this.setStatus(item.disabledHint ?? '', COLORS.warn);
        else this.resetStatus();
      },
    });

    this.status = ui.text(ui.dw / 2, 436, '', { size: TYPE.small, originX: 0.5, color: COLORS.paperDim, depth: 20 });
    this.resetStatus();
    ui.text(24, ui.dh - 26, '↑ ↓  pilih        Enter  mulai', { size: TYPE.tiny, color: COLORS.plumMist, depth: 20 });

    if (intro) {
      this.cameras.main.fadeEffect.reset();
    }
    this.introDone = true;
  }

  private activate(action: TitleAction): void {
    const { router, gameState, saves } = this.services;
    switch (action) {
      case 'new':
        // New Game hanya menyiapkan state di memori; tidak menulis atau menimpa save apa pun.
        gameState.startNewGame();
        this.services.checkpoints.reset();
        router.goto(this, SCENE_KEYS.World);
        break;
      case 'continue': {
        const latest = saves.latestValid();
        if (!latest) return this.setStatus(NO_SAVE_HINT, COLORS.warn, 2500);
        gameState.load(latest.data);
        this.services.checkpoints.reset();
        router.goto(this, SCENE_KEYS.World);
        break;
      }
      case 'settings':
        router.openOverlay(this, SCENE_KEYS.Settings);
        break;
      case 'controls':
        router.openOverlay(this, SCENE_KEYS.Controls);
        break;
    }
  }

  private resetStatus(): void {
    this.statusTimer?.remove();
    const { settings } = this.services;
    if (!settings.isPersistent) {
      this.status.setText('Penyimpanan browser tidak tersedia.').setColor(css(COLORS.warn));
    } else {
      this.status.setText('');
    }
  }

  private setStatus(msg: string, color: number, clearAfterMs?: number): void {
    this.statusTimer?.remove();
    this.status.setText(msg).setColor(css(color));
    if (clearAfterMs) {
      this.statusTimer = this.time.delayedCall(clearAfterMs, () => {
        const f = this.menu.focusedItem;
        if (f.disabled) this.setStatus(f.disabledHint ?? '', COLORS.warn);
        else this.resetStatus();
      });
    }
  }

  // ------------------------------------------------------------------ latar

  /** Langit malam yang turun ke kabut ungu di cakrawala. Satu tekstur kanvas (gradien halus pada resolusi perangkat). */
  private paintBackdrop(): void {
    const { pixelWidth: w, pixelHeight: h } = this.ui.layout;
    if (this.bgKey && this.textures.exists(this.bgKey)) this.textures.remove(this.bgKey);
    this.bgKey = `title-bg-${++this.buildCount}`;
    const tex = this.textures.createCanvas(this.bgKey, w, h)!;
    const ctx = tex.getContext();
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0d0912');
    sky.addColorStop(0.5, '#1d1527');
    sky.addColorStop(0.78, '#33243f');
    sky.addColorStop(0.9, '#241a30');
    sky.addColorStop(1, '#120d19');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    // cahaya lembut di celah antara dua tokoh
    const glow = ctx.createRadialGradient(w / 2, h * 0.58, 0, w / 2, h * 0.58, h * 0.62);
    glow.addColorStop(0, 'rgba(201,123,132,0.20)');
    glow.addColorStop(0.45, 'rgba(138,119,160,0.10)');
    glow.addColorStop(1, 'rgba(60,40,74,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    // kabut dasar
    const fog = ctx.createLinearGradient(0, h * 0.72, 0, h);
    fog.addColorStop(0, 'rgba(138,119,160,0)');
    fog.addColorStop(0.5, 'rgba(138,119,160,0.16)');
    fog.addColorStop(1, 'rgba(29,22,37,0.85)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
    // vinyet
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, h * 0.95);
    vig.addColorStop(0, 'rgba(10,6,14,0)');
    vig.addColorStop(1, 'rgba(10,6,14,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
    tex.refresh();
    this.add.image(0, 0, this.bgKey).setOrigin(0, 0).setDepth(-10);
  }

  /** Bintang jarang, deterministik (bukan acak) supaya tampilan stabil antar sesi. */
  private paintStars(): void {
    const ui = this.ui;
    let seed = 11;
    const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 46; i++) {
      const x = rnd() * ui.dw;
      const y = rnd() * ui.dh * 0.55;
      const big = rnd() > 0.86;
      const star = ui.rect(x, y, big ? 2 : 1.2, big ? 2 : 1.2, big ? COLORS.paper : COLORS.plumMist, big ? 0.7 : 0.55, -9);
      if (big && !this.services.settings.get('reduced_flashes')) {
        this.tweens.add({ targets: star, alpha: 0.15, duration: 2600 + rnd() * 2400, yoyo: true, repeat: -1, delay: rnd() * 2000, ease: 'Sine.easeInOut' });
      }
    }
  }

  /** Dua busur terputus yang hampir bertemu (motif identitas): mawar di kiri, lime di kanan. Celah "bernapas" pelan. */
  private paintArcs(): void {
    const ui = this.ui;
    this.arcs = this.add.graphics().setDepth(-5);
    this.arcsGeometry = { cx: ui.u(ui.dw / 2), cy: ui.u(336), r: ui.u(172), w: Math.max(ui.hair, ui.u(1.6)) };
    this.drawArcs(0);
    this.gapTime = 0;
  }

  private drawArcs(t: number): void {
    const g = this.arcs;
    if (!g) return;
    const { cx, cy, r, w } = this.arcsGeometry;
    const gap = Phaser.Math.DegToRad(11 + Math.sin(t / 2600) * 3.2); // celah di atas dan di bawah
    g.clear();
    g.lineStyle(w, COLORS.rose, 0.7);
    g.beginPath();
    g.arc(cx, cy, r, Math.PI / 2 + gap, (3 * Math.PI) / 2 - gap, false);
    g.strokePath();
    g.lineStyle(w, COLORS.bitterLime, 0.75);
    g.beginPath();
    g.arc(cx, cy, r, -Math.PI / 2 + gap, Math.PI / 2 - gap, false);
    g.strokePath();
  }

  /**
   * Siluet. Setiap tokoh = (1) salinan tinted-fill lime/mawar yang digeser beberapa piksel ke arah lawannya sebagai cahaya tepi,
   * (2) badan siluet nada plum gelap, (3) detail asli sangat samar di atasnya agar jubah/rambut tetap terbaca.
   */
  private paintFigures(intro: boolean): void {
    const ui = this.ui;
    const ground = 497;
    const place = (key: string, x: number, h: number, flip: boolean, rim: number, towardX: number, dim: number): Phaser.GameObjects.GameObject[] => {
      if (!this.textures.exists(key)) return [];
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement;
      const scale = ui.u(h) / src.height;
      const px = ui.u(x);
      const py = ui.u(ground);
      const off = Math.max(2, ui.u(2.2)) * towardX;
      const mk = (ox: number): Phaser.GameObjects.Image => this.add.image(px + ox, py, key).setOrigin(0.5, 1).setScale(scale).setFlipX(flip);
      const rimImg = mk(off).setTint(rim).setTintMode(Phaser.TintModes.FILL).setAlpha(0.65).setDepth(-3);
      const body = mk(0).setTint(0x21182b).setTintMode(Phaser.TintModes.FILL).setDepth(-2);
      const detail = mk(0).setTint(dim).setAlpha(0.26).setDepth(-1);
      return [rimImg, body, detail];
    };
    const yaric = place('title_yaric', 292, 336, false, COLORS.bitterLime, 1, 0x4a3a5e);
    const velthia = place('title_velthia', 672, 352, true, COLORS.rose, -1, 0x54426a);
    // greatsword tertancap di depan Yaric (bilah asli miring ~23 derajat, diputar tegak, ujung ke tanah)
    const sword: Phaser.GameObjects.GameObject[] = [];
    if (this.textures.exists('title_greatsword')) {
      const src = this.textures.get('title_greatsword').getSourceImage() as HTMLImageElement;
      const len = ui.u(206);
      const scale = len / src.height;
      // titik putar = ujung bilah (kiri-bawah gambar) supaya ujungnya tepat menyentuh tanah
      const mk = (ox: number): Phaser.GameObjects.Image => this.add.image(ui.u(344) + ox, ui.u(ground + 4), 'title_greatsword').setOrigin(0.07, 0.985).setScale(scale).setRotation(-0.408);
      sword.push(
        mk(Math.max(2, ui.u(2.2))).setTint(COLORS.bitterLime).setTintMode(Phaser.TintModes.FILL).setAlpha(0.6).setDepth(-3),
        mk(0).setTint(0x21182b).setTintMode(Phaser.TintModes.FILL).setDepth(-2),
        mk(0).setTint(0x4a3a5e).setAlpha(0.3).setDepth(-1),
      );
    }
    const all = [...yaric, ...velthia, ...sword];
    if (intro) {
      all.forEach((o) => {
        const img = o as Phaser.GameObjects.Image;
        const target = img.alpha;
        img.setAlpha(0);
        this.tweens.add({ targets: img, alpha: target, duration: 1800, delay: 250, ease: 'Sine.easeOut' });
      });
    }
  }

  private paintTitle(intro: boolean): void {
    const ui = this.ui;
    const cx = ui.dw / 2;
    const a = ui.text(cx, 36, 'THE FATE', { family: 'display', weight: '700', size: TYPE.title, originX: 0.5, color: COLORS.paper, depth: 20 });
    (a as unknown as { setLetterSpacing(n: number): void }).setLetterSpacing(ui.u(6));
    const b = ui.text(cx, 108, 'BEYOND TIME', { family: 'display', weight: '600', size: 25, originX: 0.5, color: COLORS.bitterLime, depth: 20 });
    (b as unknown as { setLetterSpacing(n: number): void }).setLetterSpacing(ui.u(11));
    const rule = ui.motif(cx, 150, 168, 14, 20);
    if (intro) {
      for (const o of [a, b, ...rule]) {
        o.setAlpha(0);
        this.tweens.add({ targets: o, alpha: 1, duration: 1400, delay: 500, ease: 'Sine.easeOut' });
      }
    }
  }

  override update(_time: number, delta: number): void {
    if (!this.introDone || !this.arcs) return;
    if (this.services.settings.get('reduced_flashes') && false) return;
    this.gapTime += delta;
    this.drawArcs(this.gapTime);
  }
}
