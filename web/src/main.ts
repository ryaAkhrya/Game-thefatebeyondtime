import '@fontsource/press-start-2p/latin-400.css';
import './ui/styles/page.css';
import Phaser from 'phaser';
import { GAME_TITLE } from './game/config/constants';
import { createGameConfig } from './game/config/createGameConfig';
import { InputManager } from './game/core/InputManager';
import { AssetRegistry } from './game/systems/AssetRegistry';
import { AudioManager, type SoundBackend } from './game/systems/AudioManager';
import { DisplayController } from './game/systems/DisplayController';
import { Effects } from './game/systems/Effects';
import { FullscreenController } from './game/systems/FullscreenController';
import { GameState } from './game/systems/GameState';
import { SaveRepository } from './game/systems/SaveRepository';
import { SceneRouter } from './game/systems/SceneRouter';
import { registerServices, type Services } from './game/systems/Services';
import { SettingsRepository } from './game/systems/SettingsRepository';
import { probeStorage } from './game/systems/StorageAdapter';

function boot(): void {
  document.title = GAME_TITLE;
  const root = document.getElementById('game-root');
  const guard = document.getElementById('desktop-guard');
  if (!root || !guard) throw new Error('index.html tidak memuat #game-root / #desktop-guard');

  // Storage: diprobe aman. null -> semua repository bekerja di memori + peringatan di UI.
  const storage = probeStorage();
  const settings = new SettingsRepository(storage);
  const saves = new SaveRepository(storage);
  const input = new InputManager(window);
  const fullscreen = new FullscreenController(document, root);
  // Keadaan fullscreen sebenarnya menang atas nilai tersimpan (browser butuh gesture untuk masuk).
  if (settings.get('fullscreen') !== fullscreen.isFullscreen) settings.set('fullscreen', fullscreen.isFullscreen);

  const game = new Phaser.Game(createGameConfig(root));

  // Backend audio: tanpa file komposer tidak ada yang dimuat, jadi semua pemanggilan senyap.
  const backend: SoundBackend = {
    has: (key) => game.cache.audio.exists(key),
    playLoop: (key, volume, loop) => {
      game.sound.play(key, { volume, loop });
    },
    stop: () => game.sound.stopAll(),
    setBgmVolume: (volume) => {
      for (const s of game.sound.getAllPlaying()) (s as Phaser.Sound.WebAudioSound).setVolume(volume);
    },
    resume: () => {
      const ctx = (game.sound as Phaser.Sound.WebAudioSoundManager).context;
      if (ctx && ctx.state === 'suspended') void ctx.resume();
    },
  };
  const audio = new AudioManager(settings, backend, (m) => console.info(m));
  input.onFirstGesture(() => audio.unlock());

  const services: Services = {
    storage,
    settings,
    saves,
    gameState: new GameState(),
    input,
    audio,
    assets: new AssetRegistry(),
    fullscreen,
    router: new SceneRouter(),
    effects: new Effects(settings),
  };
  registerServices(game, services);

  game.events.once(Phaser.Core.Events.READY, () => {
    new DisplayController(window, game.canvas, guard, settings, input);
  });

  // Hook diagnostik read-only untuk smoke test (nama scene, layer input, settings). Tidak berisi data save.
  (window as unknown as { __tfbt?: unknown }).__tfbt = {
    activeScenes: () => game.scene.getScenes(true).map((s) => s.scene.key),
    inputLayer: () => input.topLayerId,
    settings: () => settings.snapshot(),
    persistent: () => settings.isPersistent,
    world: () => (game.scene.isActive('WorldScene') || game.scene.isPaused('WorldScene') ? (game.scene.getScene('WorldScene') as import('./game/scenes/WorldScene').WorldScene).debugState() : null),
    qa: new URLSearchParams(location.search).has('qa')
      ? { teleport: (x: number, y: number) => (game.scene.getScene('WorldScene') as import('./game/scenes/WorldScene').WorldScene).qaTeleport(x, y) }
      : undefined,
    focus: () => game.registry.get('debug.focus') as string | undefined,
    layoutIssues: () => {
      // Semua Text pada scene aktif harus berada di dalam 320x180 dan tidak saling menimpa (depth sama).
      const issues: string[] = [];
      for (const scene of game.scene.getScenes(true)) {
        const texts = scene.children.list.filter(
          (o): o is Phaser.GameObjects.Text => o instanceof Phaser.GameObjects.Text && o.visible && o.text.length > 0,
        );
        const rects = texts.map((t) => ({ t, b: t.getBounds() }));
        for (const { t, b } of rects) {
          if (b.left < -0.5 || b.top < -0.5 || b.right > 320.5 || b.bottom > 180.5) {
            issues.push(`${scene.scene.key}: di luar layar "${t.text.slice(0, 24)}" [${b.left},${b.top},${b.right},${b.bottom}]`);
          }
        }
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i]!;
            const c = rects[j]!;
            if (a.t.depth !== c.t.depth) continue;
            const ox = Math.min(a.b.right, c.b.right) - Math.max(a.b.left, c.b.left);
            const oy = Math.min(a.b.bottom, c.b.bottom) - Math.max(a.b.top, c.b.top);
            if (ox > 1 && oy > 2) issues.push(`${scene.scene.key}: tumpang tindih "${a.t.text.slice(0, 18)}" x "${c.t.text.slice(0, 18)}"`);
          }
        }
      }
      return issues;
    },
    canvasCss: () => ({ w: game.canvas.clientWidth, h: game.canvas.clientHeight }),
  };
}

boot();
