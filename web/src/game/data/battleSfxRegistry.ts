import { SFX_REGISTRY } from './sfxRegistry';

/**
 * Id SFX battle lama (Phase 4/5). Sejak Phase 7 semuanya diselesaikan dari SFX_REGISTRY (efek ORIGINAL hasil sintesis kode,
 * web/scripts/sfx). Bentuk tipe dipertahankan agar kode lama (BootScene, tes) tetap kompatibel.
 * `file` relatif terhadap assets/audio/ sehingga URL-nya identik dengan pemuatan SFX_REGISTRY (key sama, Phaser melewati duplikat).
 * Ini bukan BGM: BGM tetap AWAITING_COMPOSER (MUSIC_REGISTRY).
 */
const LEGACY: ReadonlyArray<{ id: string; trigger: string }> = [
  { id: 'SFX_GREATSWORD_SWING', trigger: 'greatsword windup' },
  { id: 'SFX_GREATSWORD_IMPACT', trigger: 'basic attack contact' },
  { id: 'SFX_GROUND_SLAM', trigger: 'slab_strikes' },
  { id: 'SFX_ENEMY_ATTACK', trigger: 'Hollowling attack' },
  { id: 'SFX_DAMAGE', trigger: 'damage feedback' },
  { id: 'SFX_VICTORY', trigger: 'victory after recovery' },
  { id: 'SFX_DEFEAT', trigger: 'defeat after recovery' },
];

export const BATTLE_SFX = LEGACY.map(({ id, trigger }) => {
  const cue = SFX_REGISTRY.find(c => c.id === id);
  const file = cue?.files.length === 1 ? cue.files[0]! : `${id}.wav`;
  return {
    id,
    file: `sfx/${file}`,
    trigger,
    status: (cue?.status === 'READY' ? 'READY' : 'AWAITING_COMPOSER') as 'AWAITING_COMPOSER' | 'READY',
  };
});
