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
import { CHRONOLITH_REWARD, OATHGUARD_REWARD, TEMPLE_MIXED_REWARD, BOSS_CHECKPOINT, BOSS_CHECKPOINT_FLAG, DUO_REWARD, FIRST_HOLLOWLING_FLAG, FOREST_EDGE_FLAG, MOURNFANG_FLAG, MOURNFANG_REWARD, MOURNFANG_VICTORY_SEEN, VEYRATH_REWARD, type EncounterId } from './game/combat/encounters';
import { CITY_FLAG } from './game/story/aveloriaFlags';
import { C2, FOREST2_SPAWN, LIORA_SPAWN } from './game/story/chapter2Flags';
import { IDENTITY_FLAG } from './game/story/identity';
import { enterChapter3, enterChapter4, joinTorvan, joinVelthia, restChapter4Party, returnToAveloria } from './game/rpg/party';
import { C4 } from './game/story/chapter4Flags';
import { FORT } from './game/story/c4/fortressFlags';
import { AEGIS_TRIAL_REWARD, FORTRESS_COURT_REWARD, FORTRESS_GUARD_REWARD, FORTRESS_HALL_REWARD, FORTRESS_RIFT_REWARD, VARLGRIM_REWARD } from './game/rpg/chapter4Rewards';
import { FORTRESS_BATTLE_RETURN, FORTRESS_SPAWN } from './game/world/fortressMaps';
import { AVELORIA_C4_SPAWN } from './game/world/aveloriaC4';
import { C3 } from './game/story/chapter3Flags';
import { TEMPLE_BATTLE_RETURN, TEMPLE_FROM_FOREST } from './game/world/templeMaps';
import type { GameStateData } from './game/systems/GameState';
import { equip, skillUnlockReason, unlockSkill } from './game/rpg/actions';
import { SKILLS } from './game/rpg/definitions';

/**
 * QA saja: bentuk "pemain yang wajar" memakai aksi RPG asli game (sama dengan menu Perlengkapan/Pohon Jurus): pakai zirah Benteng yang dimiliki
 * dan belanjakan semua poin jurus pada pasif yang dapat dibuka. Tidak mengubah angka apa pun di luar aturan permainan.
 */
function qaBuildData(data: GameStateData): GameStateData {
  let d = data;
  for (const [id, item] of [['C01', 'warden_plate'], ['C02', 'keeper_robe']] as const) {
    if ((d.items[item] ?? 0) > 0 && d.rpg.characters[id]) { const r = equip(d, 'armor', item, id); if (r.ok) d = r.data; }
  }
  for (const id of ['C01', 'C02']) {
    for (let progress = true; progress;) {
      progress = false;
      for (const sk of SKILLS) {
        if (sk.cost > 0 && d.rpg.characters[id] && skillUnlockReason(d, sk.id, id) === null) { const r = unlockSkill(d, sk.id, id); if (r.ok) { d = r.data; progress = true; } }
      }
    }
  }
  return d;
}

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
    // SFX: volume per cue (gain) dan laju (rate) berlaku; BGM tidak melewati jalur ini.
    playSfx: (key, volume, rate) => {
      game.sound.play(key, { volume, rate });
    },
    stop: () => game.sound.stopAll(),
    setBgmVolume: (volume) => {
      for (const s of game.sound.getAllPlaying()) if (!s.key.startsWith('SFX_')) (s as Phaser.Sound.WebAudioSound).setVolume(volume);
    },
    setSfxVolume: volume => {
      // Hanya SFX yang sedang berbunyi dan belum punya gain per-cue; efek singkat selesai sendiri.
      for (const s of game.sound.getAllPlaying()) if (s.key.startsWith('SFX_') && !s.key.includes('#') && s.duration > 1) (s as Phaser.Sound.WebAudioSound).setVolume(volume);
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
        /**
         * Bab III (hanya QA): 'start' = Aveloria krisis setelah Bab II selesai; 'temple' = Yaric+Velthia di gerbang Kuil;
         * 'hall' = semua teka-teki selesai, gerbang terbuka, di depan aula Chronolith. `battle` langsung membuka battle.
         */
        chapter3: (stage: 'c2end' | 'start' | 'temple' | 'hall', battle?: EncounterId, hp?: Partial<Record<'C01' | 'C02', number>>) => {
          services.checkpoints.reset();
          let d: GameStateData = applyReward(applyReward(services.gameState.startNewGame(), HOLLOWLING_REWARD).data, MOURNFANG_REWARD).data;
          d.chapter = 'II'; d.area = 'forest_2';
          for (const f of ['c1.intro_seen', 'story.c1_awake', 'story.c1_nambo', 'story.c1_loop', 'c1.loop_noticed', 'c1.hollowling_victory_seen', FIRST_HOLLOWLING_FLAG, FOREST_EDGE_FLAG, BOSS_CHECKPOINT_FLAG, MOURNFANG_FLAG, MOURNFANG_VICTORY_SEEN, ...Object.values(CITY_FLAG), C2.start, C2.depart, C2.farewell, C2.zira, C2.forest, IDENTITY_FLAG]) d.flags[f] = true;
          d = joinTorvan(d);
          for (const f of [C2.secondMarker, C2.tutorial, C2.veyrath, C2.fragmentA, C2.fragments, C2.complete]) d.flags[f] = true;
          d = applyReward(applyReward(d, DUO_REWARD).data, VEYRATH_REWARD).data;
          d.items.potion = 3;
          if (stage === 'c2end') {
            d.chapter = 'II'; d.area = 'aveloria'; d.position = { x: 640, y: 616, facing: 'up' };
            services.gameState.load(d);
            game.scene.getScene('TitleScene').scene.start('WorldScene');
            return;
          }
          d = enterChapter3(d); d.area = 'aveloria'; d.position = { x: 640, y: 616, facing: 'up' };
          if (stage !== 'start') {
            d = joinVelthia(d);
            for (const f of [C3.crisisSeen, C3.azieDemand, C3.velthiaRefuses, C3.evacOrdered, C3.evacDone, C3.decision, C3.torvanStays, C3.departed, C3.templeEntered]) d.flags[f] = true;
            d.area = 'temple'; d.position = { ...TEMPLE_FROM_FOREST };
          }
          if (stage === 'hall') {
            for (const f of [C3.puzzleA, C3.puzzleB, C3.puzzleC, C3.gateOpen, C3.checkpoint]) d.flags[f] = true;
            d.position = { ...TEMPLE_BATTLE_RETURN.chronolith };
          }
          if (hp?.C01 !== undefined) d.vitals = { ...d.vitals, hp: hp.C01 };
          if (hp?.C02 !== undefined && d.partyVitals?.C02) d.partyVitals = { ...d.partyVitals, C02: { ...d.partyVitals.C02, hp: hp.C02 } };
          services.gameState.load(d);
          if (battle) { game.scene.getScene('TitleScene').scene.start('BattleScene', { encounter: battle }); }
          else game.scene.getScene('TitleScene').scene.start('WorldScene');
        },
        /**
         * Bab IV (hanya QA, build produksi publik tidak memuat hook ini): menyusun save Bab III selesai dengan hadiah nyata lalu maju ke tahap.
         * start | trial | checkpoint | boss | heart | echo | return. `battle` langsung membuka battle; `opts.hp/mp` mengubah vitals.
         */
        chapter4: (stage: 'c3end' | 'start' | 'trial' | 'checkpoint' | 'boss' | 'heart' | 'echo' | 'return', battle?: EncounterId, opts?: { hp?: Partial<Record<'C01' | 'C02', number>>; mp?: Partial<Record<'C01' | 'C02', number>> }) => {
          services.checkpoints.reset();
          let d: GameStateData = applyReward(applyReward(services.gameState.startNewGame(), HOLLOWLING_REWARD).data, MOURNFANG_REWARD).data;
          d.chapter = 'II'; d.area = 'forest_2';
          for (const f of ['c1.intro_seen', 'story.c1_awake', 'story.c1_nambo', 'story.c1_loop', 'c1.loop_noticed', 'c1.hollowling_victory_seen', FIRST_HOLLOWLING_FLAG, FOREST_EDGE_FLAG, BOSS_CHECKPOINT_FLAG, MOURNFANG_FLAG, MOURNFANG_VICTORY_SEEN, ...Object.values(CITY_FLAG), C2.start, C2.depart, C2.farewell, C2.zira, C2.forest, IDENTITY_FLAG]) d.flags[f] = true;
          d = joinTorvan(d);
          for (const f of [C2.secondMarker, C2.tutorial, C2.veyrath, C2.fragmentA, C2.fragments, C2.complete]) d.flags[f] = true;
          d = applyReward(applyReward(d, DUO_REWARD).data, VEYRATH_REWARD).data;
          d = enterChapter3(d); d = joinVelthia(d);
          for (const f of [C3.crisisSeen, C3.azieDemand, C3.velthiaRefuses, C3.evacOrdered, C3.evacDone, C3.decision, C3.torvanStays, C3.departed, C3.templeEntered, C3.puzzleA, C3.puzzleB, C3.puzzleC, C3.gateOpen, C3.checkpoint, C3.chronolithIntroSeen]) d.flags[f] = true;
          d = applyReward(applyReward(d, OATHGUARD_REWARD).data, TEMPLE_MIXED_REWARD).data;
          for (const f of [C3.templeFight1, C3.templeFight2, C3.chronolith, C3.chronolithOutroSeen, C3.hiddenName, C3.promise, C3.complete]) d.flags[f] = true;
          d = applyReward(d, CHRONOLITH_REWARD).data;
          d.items.potion = 3;
          d.area = 'temple'; d.position = { ...TEMPLE_BATTLE_RETURN.chronolith };
          if (stage === 'c3end') { services.gameState.load(d); game.scene.getScene('TitleScene').scene.start('WorldScene'); return; }
          d = enterChapter4(d); d.position = { ...FORTRESS_SPAWN };
          const order = ['c3end', 'start', 'trial', 'checkpoint', 'boss', 'heart', 'echo', 'return'] as const;
          const at = (name: (typeof order)[number]): boolean => order.indexOf(stage) >= order.indexOf(name);
          if (at('trial')) { d.flags[C4.entered] = true; d.flags[C4.aegisLearned] = true; d.position = { ...FORTRESS_BATTLE_RETURN.fortress_aegis_trial }; }
          if (at('checkpoint')) {
            for (const f of [C4.fightCourt, C4.fightHall, C4.fightGuard, C4.fightRift, C4.aegisTrial, FORT.sealsSolved, FORT.logRead, FORT.riftAligned, FORT.shortcutOpen, FORT.trialIntroSeen, FORT.trialDoneSeen, FORT.riftbornSeen, FORT.sealHintSeen, FORT.riftHintSeen, C4.reportA, C4.reportB]) d.flags[f] = true;
            for (const r of [FORTRESS_COURT_REWARD, FORTRESS_HALL_REWARD, FORTRESS_GUARD_REWARD, FORTRESS_RIFT_REWARD, AEGIS_TRIAL_REWARD]) d = applyReward(d, r).data;
            for (const f of [FORT.chestPotion, FORT.chestPlate, FORT.chestRobe]) d.flags[f] = true;
            d.items.warden_plate = 1; d.items.keeper_robe = 1;
            d = qaBuildData(d); // equivalen pemain yang membuka peti Benteng, memakai zirahnya, dan membelanjakan poin jurus
            d = restChapter4Party(d); d.flags[C4.checkpoint] = true; d.items.potion = 3; d.position = { ...FORTRESS_BATTLE_RETURN.varlgrim };
          }
          if (at('boss')) { d.flags[C4.confront] = true; d.flags[FORT.bossIntroSeen] = true; d.flags[FORT.heartApproachSeen] = true; }
          if (at('heart')) { d.flags[C4.varlgrim] = true; d.flags[C4.leanSeen] = true; d = applyReward(d, VARLGRIM_REWARD).data; }
          if (at('echo')) { for (const f of [C4.unlockYaric, C4.unlockVelthia, C4.heartOpen, C4.towerFallen, FORT.echoEntered]) d.flags[f] = true; }
          if (stage === 'return') {
            for (const f of [C4.memoryA, C4.memoryB, C4.oldMemory, C4.varlgrimTruth, C4.creatorReveal, C4.varlgrimStays, FORT.torvanLeft]) d.flags[f] = true;
            d = returnToAveloria(d, { ...AVELORIA_C4_SPAWN });
          }
          if (opts?.hp?.C01 !== undefined) d.vitals = { ...d.vitals, hp: opts.hp.C01 };
          if (opts?.mp?.C01 !== undefined) d.vitals = { ...d.vitals, mp: opts.mp.C01 };
          if (d.partyVitals?.C02) d.partyVitals = { ...d.partyVitals, C02: { hp: opts?.hp?.C02 ?? d.partyVitals.C02.hp, mp: opts?.mp?.C02 ?? d.partyVitals.C02.mp } };
          services.gameState.load(d);
          if (battle) game.scene.getScene('TitleScene').scene.start('BattleScene', { encounter: battle });
          else game.scene.getScene('TitleScene').scene.start('WorldScene');
        },
        /** QA: pakai zirah Benteng yang dimiliki dan belanjakan poin jurus (aksi RPG asli); kembalikan ringkasan. */
        build: () => {
          const d = qaBuildData(services.gameState.snapshot()!); services.gameState.load(d);
          const c = (id: string): unknown => ({ equipment: d.rpg.characters[id]?.equipment, skills: d.rpg.characters[id]?.unlockedSkills, points: d.rpg.characters[id]?.skillPoints });
          return { C01: c('C01'), C02: c('C02') };
        },
        /** QA: ubah HP satu aktor battle (mis. Varlgrim ke 30% untuk menguji fase meteor tanpa memainkan seluruh pertarungan). */
        battleHp: (id: string, hp: number) => (game.scene.getScene('BattleScene') as import('./game/scenes/BattleScene').BattleScene).qaPatchHp(id, hp),
        /** Uji transisi besar tanpa battle: tutup layar dengan kategori tertentu, lalu `revealTransition`. */
        coverTransition: (kind: 'normal' | 'scripted' | 'boss' | 'temporal' | 'final' | 'return', label?: string) => (game.scene.getScene('TransitionScene') as import('./game/scenes/TransitionScene').TransitionScene).cover(kind, label).then(() => true),
        openSliceEnd: () => services.router.openOverlay(game.scene.getScene('WorldScene'), 'SliceEndScene'),
        revealTransition: () => (game.scene.getScene('TransitionScene') as import('./game/scenes/TransitionScene').TransitionScene).reveal().then(() => true),
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
    transition: () => (game.scene.getScene('TransitionScene') as import('./game/scenes/TransitionScene').TransitionScene | null)?.debug() ?? null,
    audio: () => services.audio.debug(),
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
