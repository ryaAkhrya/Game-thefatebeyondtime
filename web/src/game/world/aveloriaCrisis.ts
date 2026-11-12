import { C3 } from '../story/chapter3Flags';
import type { Rect } from './Collision';
import type { CrisisStage } from '../data/maps/town.crisis.mjs';

export * from '../data/maps/town.crisis.mjs';
export type { CrisisStage } from '../data/maps/town.crisis.mjs';

/** Id pemicu di sisi selatan gerbang: keluar dari Aveloria menuju Kuil Jejak (lead memasang changeArea 'temple'). */
export const AVELORIA_TEMPLE_EXIT = 'c3_temple_exit';
/** Id pemicu di halaman istana: pertemuan Azie-Velthia-bangsawan (tuntutan, penolakan, perintah evakuasi). */
export const AVELORIA_AUDIENCE = 'c3_audience';
/** Pemicu ruang pertemuan yang sudah ada (Bab I) dipakai ulang untuk keputusan Velthia. */
export const AVELORIA_COUNCIL = 'city_audience';
/** Interactable tambahan yang dipasang view krisis (Torvan membantu warga, bangsawan di halaman). */
export const ID_TORVAN = 'torvan';
export const ID_NOBLE = 'c3_noble';

export const CRISIS_TRIGGERS: readonly (Rect & { id: string })[] = [
  { id: AVELORIA_AUDIENCE, x: 448, y: 584, w: 384, h: 12 },
  { id: AVELORIA_TEMPLE_EXIT, x: 592, y: 1344, w: 96, h: 24 },
];

/** Tahap krisis tertinggi yang tercapai menurut flag (flag cerita bersifat monoton). 'pre' bila Bab III belum dimulai. */
export function crisisStage(flags: Readonly<Record<string, boolean>>): CrisisStage {
  if (!flags[C3.start]) return 'pre';
  if (flags[C3.departed]) return 'departed';
  if (flags[C3.velthiaJoined]) return 'velthiaJoined';
  if (flags[C3.torvanStays]) return 'torvanStays';
  if (flags[C3.decision]) return 'decision';
  if (flags[C3.evacDone]) return 'evacDone';
  if (flags[C3.evacOrdered]) return 'evacOrdered';
  if (flags[C3.velthiaRefuses]) return 'velthiaRefuses';
  if (flags[C3.azieDemand]) return 'azieDemand';
  if (flags[C3.crisisSeen]) return 'crisisSeen';
  return 'start';
}
