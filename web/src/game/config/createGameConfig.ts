import Phaser from 'phaser';
import { EndingScene } from '../scenes/EndingScene';
import { COLORS, css } from './palette';
import type { DisplayLayout } from '../systems/DisplayScale';
import { BootScene } from '../scenes/BootScene';
import { HudScene } from '../scenes/HudScene';
import { PauseScene } from '../scenes/PauseScene';
import { WorldScene } from '../scenes/WorldScene';
import { ControlsScene } from '../scenes/ControlsScene';
import { SettingsScene } from '../scenes/SettingsScene';
import { TitleScene } from '../scenes/TitleScene';
import { BattleScene } from '../scenes/BattleScene';
import { RpgMenuScene } from '../scenes/RpgMenuScene';
import { SaveLoadScene } from '../scenes/SaveLoadScene';
import { ShopScene } from '../scenes/ShopScene';
import { SliceEndScene } from '../scenes/SliceEndScene';
import { TransitionScene } from '../scenes/TransitionScene';
import { JournalScene } from '../scenes/JournalScene';

export function createGameConfig(parent: HTMLElement, layout: DisplayLayout): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    // Kanvas = piksel perangkat. Dunia memakai zoom kamera bulat; UI memakai ruang desain 960x540 pada resolusi asli.
    width: layout.pixelWidth,
    height: layout.pixelHeight,
    backgroundColor: css(COLORS.ink),
    pixelArt: true, // nearest-neighbor untuk sprite/dunia. Tekstur UI besar (siluet judul) memakai filter linear sendiri.
    roundPixels: true,
    antialias: false,
    // Ukuran tampilan diatur DisplayController (Fit / Pixel Perfect + DPR), bukan Scale Manager Phaser.
    scale: { mode: Phaser.Scale.NONE },
    // Keyboard ditangani InputManager (satu mapping intent, fokus berlapis).
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    audio: { noAudio: false },
    disableContextMenu: true,
    scene: [BootScene, EndingScene, TitleScene, SettingsScene, ControlsScene, WorldScene, HudScene, PauseScene, BattleScene, RpgMenuScene, SaveLoadScene, ShopScene, SliceEndScene, JournalScene, TransitionScene],
  };
}
