import type Phaser from 'phaser';
import type { InputManager } from '../core/InputManager';
import type { AssetRegistry } from './AssetRegistry';
import type { AudioManager } from './AudioManager';
import type { Effects } from './Effects';
import type { FullscreenController } from './FullscreenController';
import type { GameState } from './GameState';
import type { SaveRepository } from './SaveRepository';
import type { SceneRouter } from './SceneRouter';
import type { SettingsRepository } from './SettingsRepository';
import type { StorageLike } from './StorageAdapter';
import type { SaveCoordinator } from './SaveCoordinator';

/** Semua sistem non-render, dibuat sekali di main.ts dan dibagikan lewat game registry. */
export interface Services {
  storage: StorageLike | null;
  settings: SettingsRepository;
  saves: SaveRepository;
  gameState: GameState;
  input: InputManager;
  audio: AudioManager;
  assets: AssetRegistry;
  fullscreen: FullscreenController;
  router: SceneRouter;
  effects: Effects;
  checkpoints: SaveCoordinator;
}

const KEY = 'services';

export function registerServices(game: Phaser.Game, services: Services): void {
  game.registry.set(KEY, services);
}

export function getServices(scene: Phaser.Scene): Services {
  const s = scene.registry.get(KEY) as Services | undefined;
  if (!s) throw new Error('Services belum terdaftar (main.ts harus memanggil registerServices).');
  return s;
}
