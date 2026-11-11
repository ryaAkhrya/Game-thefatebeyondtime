import { displayNameOf } from '../story/identity';
import { DISPLAY_NAMES, type DialogueLine } from './types';

/**
 * Label pembicara pada kotak dialog. Yaric tanpa nama (???) sampai identitasnya terungkap; monolog batin (thought)
 * pra-pengungkapan tidak memakai label sama sekali. Label eksplisit pada baris (mis. "Catatan A") selalu dihormati.
 */
export function speakerLabel(line: DialogueLine, nameKnown: boolean): string {
  if (line.label !== undefined) return line.label;
  if (line.kind === 'thought' && line.speaker === 'C01' && !nameKnown) return '';
  return displayNameOf(line.speaker, nameKnown, DISPLAY_NAMES);
}
