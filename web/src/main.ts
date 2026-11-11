import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/source-sans-3/latin-400.css';
import '@fontsource/source-sans-3/latin-400-italic.css';
import '@fontsource/source-sans-3/latin-600.css';
import './ui/styles/page.css';
import Phaser from 'phaser';
import { GAME_TITLE } from './game/config/constants';
import { SCENE_KEYS } from './game/data/ids';
import { createGameConfig } from './game/config/createGameConfig';
import { InputManager } from './game/core/InputManager';
import { AssetRegistry } from './game/systems/AssetRegistry';
import { AudioManager, type SoundBackend } from './game/systems/AudioManager';
import { DisplayController, layoutForWindow, registerDisplay } from './game/systems/DisplayController';
import { Effects } from './game/systems/Effects';
import { FullscreenController } from './game/systems/FullscreenController';
import { GameState } from './game/systems/GameState';
import { SaveRepository } from './game/systems/SaveRepository';
import { SceneRouter } from './game/systems/SceneRouter';
import { registerServices, type Services } from './game/systems/Services';
import { SettingsRepository } from './game/systems/SettingsRepository';
import { probeStorage } from './game/systems/StorageAdapter';
import { SaveCoordinator } from './game/systems/SaveCoordinator';
import { effectiveStats, applyReward } from './game/rpg/progression';
import { HOLLOWLING_REWARD } from './game/rpg/definitions';
import { BOSS_CHECKPOINT, BOSS_CHECKPOINT_FLAG, FIRST_HOLLOWLING_FLAG, FOREST_EDGE_FLAG, MOURNFANG_FLAG, MOURNFANG_REWARD, MOURNFANG_VICTORY_SEEN } from './game/combat/encounters';
import { CITY_FLAG } from './game/story/aveloriaFlags';
import { C2, FOREST2_SPAWN, LIORA_SPAWN } from './game/story/chapter2Flags';
import { IDENTITY_FLAG } from './game/story/identity';
import { joinTorvan } from './game/rpg/party';

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

  const layout = layoutForWindow(window, settings.get('screen_scale'));
  const game = new Phaser.Game(createGameConfig(root, layout));
  registerDisplay(game, layout);

  // Backend audio: tanpa file komposer tidak ada yang dimuat, jadi semua pemanggilan senyap.
  const backend: SoundBackend = {
    has: (key) => game.cache.audio.exists(key),
    playLoop: (key, volume, loop) => {
      game.sound.play(key, { volume, loop });
    },
    stop: () => game.sound.stopAll(),
    setBgmVolume: (volume) => {
      for (const s of game.sound.getAllPlaying()) if (!s.key.startsWith('SFX_')) (s as Phaser.Sound.WebAudioSound).setVolume(volume);
    },
    setSfxVolume: volume => {
      for (const s of game.sound.getAllPlaying()) if (s.key.startsWith('SFX_')) (s as Phaser.Sound.WebAudioSound).setVolume(volume);
    },
    resume: () => {
      const ctx = (game.sound as Phaser.Sound.WebAudioSoundManager).context;
      if (ctx && ctx.state === 'suspended') void ctx.resume();
    },
  };
  const audio = new AudioManager(settings, backend, (m) => console.info(m));
  input.onFirstGesture(() => audio.unlock());

  const gameState = new GameState();
  const services: Services = {
    storage,
    settings,
    saves,
    gameState,
    checkpoints: new SaveCoordinator(gameState, saves),
    input,
    audio,
    assets: new AssetRegistry(),
    fullscreen,
    router: new SceneRouter(),
    effects: new Effects(settings),
  };
  registerServices(game, services);

  game.events.once(Phaser.Core.Events.READY, () => {
    new DisplayController(window, game, guard, settings, input);
  });

  const visibleScenes = (): string[] => game.scene.getScenes(false)
    .filter(s => s.sys.settings.visible && (s.sys.isActive() || s.sys.isPaused())).map(s => s.scene.key);
  // Read-only diagnostic snapshots for browser QA; no renderer objects enter serialized gameplay state.
  (window as unknown as { __tfbt?: unknown }).__tfbt = {
    activeScenes: () => game.scene.getScenes(true).map((s) => s.scene.key),
    visibleScenes,
    inputLayer: () => input.topLayerId,
    settings: () => settings.snapshot(),
    battle: () => (game.scene.isActive('BattleScene') || game.scene.isPaused('BattleScene') ? (game.scene.getScene('BattleScene') as import('./game/scenes/BattleScene').BattleScene).debugState() : null),
    persistent: () => settings.isPersistent,
    state: () => gameState.snapshot(),
    stats: () => gameState.isActive ? effectiveStats(gameState.snapshot()!) : null,
    saveStatus: () => ({ safe: services.checkpoints.isSafe, pending: services.checkpoints.hasPendingAutosave, message: services.checkpoints.lastMessage }),
    shop: () => game.scene.isActive('ShopScene') ? (game.scene.getScene('ShopScene') as import('./game/scenes/ShopScene').ShopScene).debugState() : null,
    world: () => (game.scene.isActive('WorldScene') || game.scene.isPaused('WorldScene') ? (game.scene.getScene('WorldScene') as import('./game/scenes/WorldScene').WorldScene).debugState() : null),
    qa: new URLSearchParams(location.search).has('qa')
      ? {
        teleport: (x: number, y: number) => (game.scene.getScene('WorldScene') as import('./game/scenes/WorldScene').WorldScene).qaTeleport(x, y),
        encounter: () => {
          services.checkpoints.reset();
          services.gameState.startNewGame();
          for (const flag of ['c1.intro_seen', 'story.c1_awake', 'story.c1_nambo', 'story.c1_loop', 'c1.loop_noticed']) services.gameState.setFlag(flag);
          services.gameState.setPosition(832, 100, 'down', 'forest_1');
          services.gameState.addItem('potion', 1);
          services.gameState.setFlag('reward.c1_chest_potion.claimed');
          game.scene.getScene('TitleScene').scene.start('BattleScene');
        },
        /** Hutan 1 sesudah jalur berulang, 160 px di selatan pemicu Hollowling (untuk uji trigger pada kecepatan lari). */
        forest1Late: () => {
          services.checkpoints.reset();
          services.gameState.startNewGame();
          for (const flag of ['c1.intro_seen', 'story.c1_awake', 'story.c1_nambo', 'story.c1_loop', 'c1.loop_noticed']) services.gameState.setFlag(flag);
          services.gameState.setPosition(832, 280, 'up', 'forest_1');
          services.gameState.addItem('potion', 1);
          services.gameState.setFlag('reward.c1_chest_potion.claimed');
          game.scene.getScene('TitleScene').scene.start('WorldScene');
        },
        mournfang: () => {
          services.checkpoints.reset();
          const data = applyReward(services.gameState.startNewGame(), HOLLOWLING_REWARD).data;
          for (const flag of ['c1.intro_seen', 'story.c1_awake', 'story.c1_nambo', 'story.c1_loop', 'c1.loop_noticed', 'c1.hollowling_victory_seen', FIRST_HOLLOWLING_FLAG, FOREST_EDGE_FLAG, BOSS_CHECKPOINT_FLAG]) data.flags[flag] = true;
          data.area = 'forest_edge'; data.position = { ...BOSS_CHECKPOINT }; data.items.potion = 1;
          services.gameState.load(data);
          game.scene.getScene('TitleScene').scene.start('WorldScene');
        },
        aveloria: () => {
          services.checkpoints.reset();
          const data = applyReward(applyReward(services.gameState.startNewGame(), HOLLOWLING_REWARD).data, MOURNFANG_REWARD).data;
          for (const flag of ['c1.intro_seen', 'story.c1_awake', 'story.c1_nambo', 'story.c1_loop', 'c1.loop_noticed', 'c1.hollowling_victory_seen', FIRST_HOLLOWLING_FLAG, FOREST_EDGE_FLAG, BOSS_CHECKPOINT_FLAG, MOURNFANG_FLAG, MOURNFANG_VICTORY_SEEN]) data.flags[flag] = true;
          data.area = 'forest_edge'; data.position = { x: 1312, y: 400, facing: 'right' };
          services.gameState.load(data);
          game.scene.getScene('TitleScene').scene.start('WorldScene');
        },
        chapter1Complete: () => {
          services.checkpoints.reset();
          const data = applyReward(applyReward(services.gameState.startNewGame(), HOLLOWLING_REWARD).data, MOURNFANG_REWARD).data;
          for (const flag of ['c1.intro_seen', 'story.c1_awake', 'story.c1_nambo', 'story.c1_loop', 'c1.loop_noticed', 'c1.hollowling_victory_seen', FIRST_HOLLOWLING_FLAG, FOREST_EDGE_FLAG, BOSS_CHECKPOINT_FLAG, MOURNFANG_FLAG, MOURNFANG_VICTORY_SEEN, ...Object.values(CITY_FLAG)]) data.flags[flag] = true;
          data.area = 'aveloria'; data.position = { x: 648, y: 552, facing: 'right' };
          services.gameState.load(data);
          game.scene.getScene('TitleScene').scene.start('WorldScene');
        },
        /** Battle Mournfang langsung (hanya QA, untuk tangkapan layar boss). */
        bossBattle: () => {
          services.checkpoints.reset();
          const data = applyReward(services.gameState.startNewGame(), HOLLOWLING_REWARD).data;
          for (const flag of ['c1.intro_seen', 'story.c1_awake', 'story.c1_nambo', 'story.c1_loop', 'c1.loop_noticed', 'c1.hollowling_victory_seen', FIRST_HOLLOWLING_FLAG, FOREST_EDGE_FLAG, BOSS_CHECKPOINT_FLAG]) data.flags[flag] = true;
          data.area = 'forest_edge'; data.position = { ...BOSS_CHECKPOINT }; data.items.potion = 1;
          services.gameState.load(data);
          game.scene.getScene('TitleScene').scene.start('BattleScene', { encounter: 'mournfang' });
        },
        /** Bab II: 'liora' | 'forest2' | 'duo' (Torvan bergabung). Hanya QA. */
        chapter2: (stage: 'liora' | 'forest2' | 'duo', battle?: 'duo_tutorial' | 'veyrath') => {
          services.checkpoints.reset();
          const data = applyReward(applyReward(services.gameState.startNewGame(), HOLLOWLING_REWARD).data, MOURNFANG_REWARD).data;
          for (const flag of ['c1.intro_seen', 'story.c1_awake', 'story.c1_nambo', 'story.c1_loop', 'c1.loop_noticed', 'c1.hollowling_victory_seen', FIRST_HOLLOWLING_FLAG, FOREST_EDGE_FLAG, BOSS_CHECKPOINT_FLAG, MOURNFANG_FLAG, MOURNFANG_VICTORY_SEEN, ...Object.values(CITY_FLAG), C2.start, C2.depart, C2.farewell]) data.flags[flag] = true;
          data.chapter = 'II';
          data.area = stage === 'liora' ? 'liora' : 'forest_2';
          data.position = stage === 'liora' ? { ...LIORA_SPAWN } : { ...FOREST2_SPAWN };
          if (stage !== 'liora') data.flags[C2.zira] = true;
          let next = data;
          if (stage === 'duo') { data.flags[C2.forest] = true; data.flags[IDENTITY_FLAG] = true; data.position = { x: 744, y: 544, facing: 'right' }; next = joinTorvan(data); if (battle === 'veyrath') { next.flags[C2.tutorial] = true; next.flags[C2.secondMarker] = true; } }
          services.gameState.load(next);
          if (battle) game.scene.getScene('TitleScene').scene.start('BattleScene', { encounter: battle });
          else game.scene.getScene('TitleScene').scene.start('WorldScene');
        },
        shop: () => {
          const data = services.gameState.startNewGame(); data.rpg.gold = 48;
          data.items.qa_staff = 1; data.items.qa_key = 1;
          services.gameState.load(data);
          services.router.openOverlay(game.scene.getScene('TitleScene'), 'ShopScene', { shop: { id: 'qa_supply', name: 'Toko Uji', stock: { potion: 3, travel_coat: 1, qa_staff: 1 } } });
        },
      }
      : undefined,
    focus: () => game.registry.get('debug.focus') as string | undefined,
    layoutIssues: () => {
      // Semua Text pada scene aktif harus berada di dalam kanvas dan tidak saling menimpa. Dunia (kamera bergulir) dilewati;
      // satuan = piksel kanvas (= piksel perangkat). Toleransi tumpang-tindih mengikuti skala UI.
      const issues: string[] = [];
      const layout = game.registry.get('display') as { pixelWidth: number; pixelHeight: number; uiScale: number };
      const s = layout.uiScale;
      const overlays: Record<string, string> = { pause: SCENE_KEYS.Pause, settings: SCENE_KEYS.Settings, 'save-load': SCENE_KEYS.SaveLoad,
        'rpg-menu': SCENE_KEYS.RpgMenu, shop: SCENE_KEYS.Shop, 'slice-end': SCENE_KEYS.SliceEnd, journal: SCENE_KEYS.Journal, controls: SCENE_KEYS.Controls };
      const expectedTop = overlays[input.topLayerId ?? ''];
      if (expectedTop && visibleScenes().at(-1) !== expectedTop) issues.push(`${expectedTop}: overlay tertutup scene lain`);
      for (const scene of game.scene.getScenes(true)) {
        if (scene.scene.key === 'WorldScene') continue; // world coordinates use a scrolling camera
        const texts = scene.children.list.filter(
          (o): o is Phaser.GameObjects.Text => o instanceof Phaser.GameObjects.Text && o.visible && o.text.length > 0 && o.alpha > 0.2,
        );
        const rects = texts.map((t) => ({ t, b: t.getBounds() }));
        for (const { t, b } of rects) {
          if (b.left < -1 || b.top < -1 || b.right > layout.pixelWidth + 1 || b.bottom > layout.pixelHeight + 1) {
            issues.push(`${scene.scene.key}: di luar layar "${t.text.slice(0, 24)}" [${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.right)},${Math.round(b.bottom)}]`);
          }
        }
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i]!;
            const c = rects[j]!;
            if (a.t.depth !== c.t.depth) continue;
            const ox = Math.min(a.b.right, c.b.right) - Math.max(a.b.left, c.b.left);
            const oy = Math.min(a.b.bottom, c.b.bottom) - Math.max(a.b.top, c.b.top);
            if (ox > 2 * s && oy > 6 * s) issues.push(`${scene.scene.key}: tumpang tindih "${a.t.text.slice(0, 18)}" x "${c.t.text.slice(0, 18)}"`);
          }
        }
      }
      return issues;
    },
    display: () => game.registry.get('display'),
    router: () => services.router.debug(),
    battleProbe: (id: string) => (game.scene.isActive('BattleScene') ? (game.scene.getScene('BattleScene') as import('./game/scenes/BattleScene').BattleScene).qaProbe(id) : null),
    battleHide: (id: string, hidden: boolean) => { if (game.scene.isActive('BattleScene')) (game.scene.getScene('BattleScene') as import('./game/scenes/BattleScene').BattleScene).qaHide(id, hidden); },
    /** Kotak piksel buram (alpha > 0) sebuah frame spritesheet pada tekstur yang BENAR-BENAR dimuat browser. */
    frameBounds: (key: string, index: number, fw = 32, fh = 48) => {
      const img = game.textures.get(key).getSourceImage() as HTMLImageElement;
      const cols = Math.floor(img.width / fw);
      const c = document.createElement('canvas'); c.width = fw; c.height = fh;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, (index % cols) * fw, Math.floor(index / cols) * fh, fw, fh, 0, 0, fw, fh);
      const d = ctx.getImageData(0, 0, fw, fh).data;
      let top = fh, bottom = -1, left = fw, right = -1;
      let topRowWidth = 0;
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (d[(y * fw + x) * 4 + 3]! > 0) { top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x); }
      if (bottom >= 0) for (let x = 0; x < fw; x++) if (d[(top * fw + x) * 4 + 3]! > 0) topRowWidth++;
      return { top, bottom, left, right, height: bottom - top + 1, topRowWidth, src: img.src };
    },
    /** Teks yang sedang terlihat pada sebuah scene (termasuk di dalam container). Hanya diagnostik QA. */
    sceneTexts: (key: string): string[] => {
      const out: string[] = [];
      const visit = (o: Phaser.GameObjects.GameObject): void => {
        if (o instanceof Phaser.GameObjects.Text) { if (o.visible && o.text.length > 0 && o.alpha > 0.05) out.push(o.text); return; }
        if (o instanceof Phaser.GameObjects.Container) { if (o.visible) o.list.forEach(visit); }
      };
      if (game.scene.isActive(key) || game.scene.isPaused(key)) game.scene.getScene(key).children.list.forEach(visit);
      return out;
    },
    canvasCss: () => ({ w: game.canvas.clientWidth, h: game.canvas.clientHeight }),
  };
}

boot();
