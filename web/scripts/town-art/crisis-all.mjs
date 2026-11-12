import { propFrames } from './crisis-props.mjs';
import { citizenFrames } from './crisis-citizens.mjs';
/** Semua frame atlas krisis Aveloria (town_crisis). Dipisah dari atlas Aveloria agar Bab I-II tidak berubah. */
export function crisisFrames() { return [...propFrames(), ...citizenFrames()]; }
