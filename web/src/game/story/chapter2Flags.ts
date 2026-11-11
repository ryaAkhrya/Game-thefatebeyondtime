/** Chapter II working-script outcomes. Commit after the corresponding scene or battle. */
export const C2 = {
  start: 'chapter.2_started',
  depart: 'story.c2_depart',
  farewell: 'story.c2_farewell',
  zira: 'story.c2_zira',
  shadow: 'c2.shadow_seen',
  forest: 'story.c2_forest',
  secondMarker: 'c2.second_marker',
  torvan: 'party.torvan_joined',
  tutorial: 'battle.duo_tutorial',
  tutorialSeen: 'c2.duo_tutorial_seen',
  checkpoint: 'checkpoint.c2_before_veyrath',
  patrol: 'battle.forest2_patrol',
  veyrath: 'boss.veyrath',
  veyrathSeen: 'c2.veyrath_seen',
  fragmentA: 'c2.fragment_a',
  fragments: 'story.c2_fragments',
  complete: 'chapter.2_complete',
} as const;

export const LIORA_SPAWN = { x: 480, y: 624, facing: 'up' } as const;
export const FOREST2_SPAWN = { x: 152, y: 560, facing: 'right' } as const;
export const RETURN_SPAWN = { x: 640, y: 616, facing: 'up' } as const;
