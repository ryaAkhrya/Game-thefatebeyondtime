/** Chapter I only. These outcomes commit after their final dialogue page. */
export const CITY_FLAG = {
  vista: 'c1.aveloria_vista',
  gate: 'story.c1_gate',
  archive: 'story.c1_archive',
  velthia: 'story.c1_velthia',
  complete: 'chapter.1_complete',
} as const;

export const CITY_SPAWN = { x: 640, y: 1312, facing: 'up' as const };
