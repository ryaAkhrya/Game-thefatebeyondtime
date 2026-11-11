// Bentuk bangunan generik: atap pinggul/pelana, cerobong, dinding plester. Semua pakai ramp dari kit.
import { fbm, hash, vnoise } from './pixel.mjs';
import { R, tilePlane, thatchPlane, bandShade } from './kit.mjs';

/** Atap pinggul tampak depan. o: {xl,xr,yE,h,inset,ds,ramp,mat:'slate'|'wood'|'thatch',seed,ch,tw,bundle} */
export function hipRoof(c, o) {
  const { xl, xr, yE, h, inset, ramp: r, mat = 'slate', seed = 1, ch = 5, tw = 7, bundle = 9 } = o;
  const ds = o.ds ?? Math.round(h * 0.5);
  const yR = yE - h, rl = xl + inset, rr = xr - inset;
  const plane = (pts, shift) => (mat === 'thatch'
    ? thatchPlane(c, pts, { ramp: r, bundle, shift, seed })
    : tilePlane(c, pts, { ramp: r, ch, tw, shift, seed, wood: mat === 'wood', y0: yR }));
  plane([[xl, yE], [xl, yE - ds], [rl, yR]], 0.9);
  plane([[xr, yE], [xr, yE - ds], [rr, yR]], -0.9);
  plane([[xl, yE], [rl, yR], [rr, yR], [xr, yE]], 0);
  // rusuk pinggul dan bubungan
  c.line(xl, yE, rl, yR, R(r, mat === 'thatch' ? 3 : 4)); c.line(xl + 1, yE, rl + 1, yR, R(r, 2));
  c.line(xr, yE, rr, yR, R(r, 0)); c.line(xr - 1, yE, rr - 1, yR, R(r, 1));
  if (rr > rl) {
    c.rect(rl - 1, yR - 1, rr - rl + 3, 3, R(r, mat === 'thatch' ? 3 : 4));
    c.hline(rl - 1, yR - 1, rr - rl + 3, R(r, 5));
    c.hline(rl - 1, yR + 1, rr - rl + 3, R(r, 1));
    if (mat !== 'thatch') for (let x = rl + 4; x < rr - 2; x += 9) c.vline(x, yR - 1, 3, R(r, 1));
  }
  // tebal tepi atap (fascia/ujung jerami) di bawah
  if (mat === 'thatch') {
    for (let x = xl; x <= xr; x++) {
      const ext = 1 + Math.floor(hash(Math.floor(x / 2), 5, seed) * 4);
      for (let j = 0; j < ext; j++) c.set(x, yE + j, R(r, j === ext - 1 ? 0 : 1 + (hash(x, j, seed) > 0.6 ? 1 : 0)));
    }
  } else {
    c.rect(xl, yE, xr - xl + 1, 2, R(r, 1)); c.hline(xl, yE, xr - xl + 1, R(r, 2)); c.hline(xl, yE + 2, xr - xl + 1, R(r, 0));
  }
  return { yR, rl, rr };
}

/** Atap pelana menghadap depan (segitiga). Bagian atap dari sisi: bidang miring kiri/kanan sebagai pita. */
export function gableFront(c, o) {
  const { xl, xr, yE, h, ramp: r, mat = 'slate', seed = 1, ch = 5, tw = 7, wallRamp, wallTone = 3, rake = 3 } = o;
  const cx = (xl + xr) / 2, yR = yE - h;
  // dinding segitiga
  if (wallRamp) c.poly([[xl + rake, yE], [cx, yR + rake], [xr - rake, yE]], (x, y) => R(wallRamp, wallTone + (vnoise(x * 0.07, y * 0.12, seed) > 0.68 ? 1 : 0)));
  // dua papan miring (rake boards) dengan genteng di sini sebagai pita
  const band = (pts, shift) => (mat === 'thatch' ? thatchPlane(c, pts, { ramp: r, bundle: 8, shift, seed }) : tilePlane(c, pts, { ramp: r, ch, tw, shift, seed, wood: mat === 'wood', y0: yR }));
  band([[xl, yE + 1], [cx, yR - 1], [cx, yR + 5], [xl + 7, yE + 1]], 0.7);
  band([[xr, yE + 1], [cx, yR - 1], [cx, yR + 5], [xr - 7, yE + 1]], -0.7);
  c.line(xl, yE + 1, cx, yR - 1, R(r, 4)); c.line(xr, yE + 1, cx, yR - 1, R(r, 0));
}

export function chimney(c, x, yTop, yBottom, w, r, flueDark) {
  for (let y = yTop; y <= yBottom; y++) for (let i = 0; i < w; i++) {
    let k = 3;
    if (i === 0) k = 4; else if (i >= w - 2) k = 1; else if ((y - yTop) % 6 === 5) k = 2; else if (hash(i + x, Math.floor((y - yTop) / 6), 4) > 0.8) k = 2;
    c.set(x + i, y, R(r, k));
  }
  c.rect(x - 2, yTop - 3, w + 4, 4, R(r, 3)); c.hline(x - 2, yTop - 3, w + 4, R(r, 5)); c.hline(x - 2, yTop, w + 4, R(r, 1));
  c.rect(x + 2, yTop - 3, w - 4, 2, flueDark);
}

/** Dinding plester dengan gumpalan nada lembut, plinth batu dan sudut (quoin). */
export function plasterWall(c, x, y, w, h, o) {
  const { plaster, tone = 3, seed = 1, lightLeft = true } = o;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const n = fbm((x + i) * 0.045, (y + j) * 0.08, seed, 2);
    let k = tone + (n < 0.3 ? -1 : n > 0.74 ? 1 : 0);
    if (hash(x + i, y + j, seed + 2) > 0.985) k -= 1;
    c.set(x + i, y + j, R(plaster, k));
  }
  if (lightLeft) { c.vline(x, y, h, R(plaster, tone + 1)); c.vline(x + w - 1, y, h, R(plaster, tone - 1)); c.vline(x + w - 2, y, h, R(plaster, tone - 1)); }
}

export function eaveShadow(c, x, y, w, depth = 7, col = [29, 22, 45], a = 120) { bandShade(c, x, y, w, depth, col, a, 'down'); }
