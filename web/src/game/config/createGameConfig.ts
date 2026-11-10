import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';
import { COLORS, css } from './palette';
import { BootScene } from '../scenes/BootScene';
import { HudScene } from '../scenes/HudScene';
import { PauseScene } from '../scenes/PauseScene';
import { WorldScene } from '../scenes/WorldScene';
import { ControlsScene } from '../scenes/ControlsScene';
import { PlaceholderScene } from '../scenes/PlaceholderScene';
import { SettingsScene } from '../scenes/SettingsScene';
import { TitleScene } from '../scenes/TitleScene';
import { BattleScene } from '../scenes/BattleScene';
import { RpgMenuScene } from '../scenes/RpgMenuScene';
import { SaveLoadScene } from '../scenes/SaveLoadScene';
import { ShopScene } from '../scenes/ShopScene';
import { SliceEndScene } from '../scenes/SliceEndScene';

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: css(COLORS.ink),
    pixelArt: true, // nearest-neighbor
    roundPixels: true,
    antialias: false,
    // Ukuran tampilan diatur DisplayController (Fit / Pixel Perfect + DPR), bukan Scale Manager Phaser.
    scale: { mode: Phaser.Scale.NONE },
    // Keyboard ditangani InputManager (satu mapping intent, fokus berlapis).
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    audio: { noAudio: false },
    disableContextMenu: true,
    scene: [BootScene, TitleScene, SettingsScene, ControlsScene, PlaceholderScene, WorldScene, HudScene, PauseScene, BattleScene, RpgMenuScene, SaveLoadScene, ShopScene, SliceEndScene],
  };
}
