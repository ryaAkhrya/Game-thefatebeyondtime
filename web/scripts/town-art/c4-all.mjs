import { propFrames } from './c4-props.mjs';
import { campFrames } from './c4-camp.mjs';

/** Decal tanah dan debu tidak punya garis kaki (pivot tengah/bawah bebas). */
const DECAL = /ground|scar|debris|dust/;

/**
 * Semua frame atlas town_c4 (Aveloria sesudah menara tua runtuh + tempat penampungan warga). Atlas lain tidak berubah.
 * Untuk benda berdiri, pivot-y DITURUNKAN dari baris opak paling bawah (alfa 255; bayangan datar semi-transparan berada di bawahnya),
 * sehingga garis kaki = titik pijak dunia = dasar sprite, konsisten dan dapat diuji.
 */
export function c4Frames() {
  return [...propFrames(), ...campFrames()].map(f => {
    if (DECAL.test(f.name)) return f;
    let last = -1;
    for (let y = 0; y < f.c.h; y++) for (let x = 0; x < f.c.w; x++) if (f.c.alpha(x, y) === 255) { last = y; break; }
    return { ...f, pivot: { x: f.pivot.x, y: (last + 1) / f.c.h } };
  });
}
