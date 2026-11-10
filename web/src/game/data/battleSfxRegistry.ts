/** Composer handoff only. No audio files are generated or requested while awaiting the composer. */
export const BATTLE_SFX = [
  { id: 'SFX_GREATSWORD_SWING', file: 'SFX_GREATSWORD_SWING.ogg', trigger: 'greatsword windup' },
  { id: 'SFX_GREATSWORD_IMPACT', file: 'SFX_GREATSWORD_IMPACT.ogg', trigger: 'basic attack contact' },
  { id: 'SFX_GROUND_SLAM', file: 'SFX_GROUND_SLAM.ogg', trigger: 'slab_strikes' },
  { id: 'SFX_ENEMY_ATTACK', file: 'SFX_ENEMY_ATTACK.ogg', trigger: 'Hollowling attack' },
  { id: 'SFX_DAMAGE', file: 'SFX_DAMAGE.ogg', trigger: 'damage feedback' },
  { id: 'SFX_VICTORY', file: 'SFX_VICTORY.ogg', trigger: 'victory after recovery' },
  { id: 'SFX_DEFEAT', file: 'SFX_DEFEAT.ogg', trigger: 'defeat after recovery' },
].map(cue => ({ ...cue, status: 'AWAITING_COMPOSER' as 'AWAITING_COMPOSER' | 'READY' }));
