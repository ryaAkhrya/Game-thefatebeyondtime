// Material kit: dinding batu, genteng, jerami, papan, jendela, pintu. Semua deterministik; warna hanya dari ramp.
import { clamp, hash, vnoise, H } from './pixel.mjs';

export const INK = H('#1d1625');
export const ramp = (...hexes) => hexes.map(H);
/** ambil warna ramp dengan indeks yang dijepit */
export const R = (r, i) => r[clamp(Math.round(i), 0, r.length - 1)];

/** batu bata/ashlar bertingkat. o: {ramp, tone, ch, bw:[min,max], seed, joint} */
export function ashlar(c, x, y, w, h, o) {
  const { ramp: r, tone = 3, ch = 6, bw = [10, 17], seed = 1 } = o;
  const rows = Math.ceil(h / ch);
  for (let row = 0; row < rows; row++) {
    const y0 = y + row * ch, hh = Math.min(ch, y + h - y0);
    let bx = x - Math.floor(hash(row, 0, seed) * (bw[1] - bw[0] + 6));
    let n = 0;
    while (bx < x + w) {
      const bwid = bw[0] + Math.floor(hash(row, n, seed + 3) * (bw[1] - bw[0] + 1));
      const hv = hash(row + 11, n, seed + 5);
      const idx = tone + (hv < 0.18 ? -1 : hv > 0.86 ? 1 : 0);
      for (let j = 0; j < hh; j++) for (let i = 0; i < bwid; i++) {
        const px = bx + i, py = y0 + j;
        if (px < x || px >= x + w) continue;
        let k = idx;
        if (j === hh - 1 && hh === ch) k = idx - 2;      // sambungan bawah (mortar)
        else if (i === 0) k = idx - 2;                      // sambungan kiri
        else if (j === 0) k = idx + 1;                      // bibir atas terkena cahaya
        else if (i === 1 && j < hh - 2) k = idx + (hv > 0.5 ? 1 : 0);
        else if (j === hh - 2 && hh === ch) k = idx - 1;
        c.set(px, py, R(r, k));
      }
      // satu retak/bintik per blok tertentu: gugusan kecil, bukan taburan
      if (hv > 0.93) { c.set(bx + 4, y0 + 2, R(r, idx - 1)); c.set(bx + 5, y0 + 3, R(r, idx - 1)); }
      bx += bwid; n++;
    }
  }
}

/** Satu bidang genteng (poligon pts). o: {ramp, ch, tw, shift, seed, wood} */
export function tilePlane(c, pts, o) {
  const { ramp: r, ch = 5, tw = 7, shift = 0, seed = 1, wood = false, y0 = null } = o;
  let minY = 1e9;
  for (const p of pts) minY = Math.min(minY, p[1]);
  const base = y0 ?? Math.floor(minY);
  c.poly(pts, (x, y) => {
    const row = Math.floor((y - base) / ch), within = (y - base) - row * ch;
    const w = wood ? tw - 1 + Math.floor(hash(row, 3, seed) * 3) : tw;
    const off = wood ? Math.floor(hash(row, 7, seed) * w) : (row % 2) * Math.floor(w / 2);
    const col = Math.floor((x + off) / w), cx = (x + off) - col * w;
    const hv = hash(col, row, seed);
    let k = 2 + shift + (hv < 0.1 ? -1 : hv > 0.9 ? 1 : 0);
    if (within === ch - 1) k -= 2;              // bayangan di bawah deretan
    else if (within === ch - 2) k -= 1;
    else if (within === 0) k += 1;              // bibir atas
    if (cx === 0) k -= 1;                       // celah antar genteng
    if (wood && hv > 0.88 && within > 0 && within < ch - 2 && cx > 0) k += 1;
    return R(r, k);
  });
}

/** Jerami/ijuk: gumpalan vertikal, ikatan horizontal. */
export function thatchPlane(c, pts, o) {
  const { ramp: r, bundle = 9, shift = 0, seed = 1 } = o;
  let minY = 1e9;
  for (const p of pts) minY = Math.min(minY, p[1]);
  c.poly(pts, (x, y) => {
    const row = Math.floor((y - minY) / bundle);
    const edge = Math.floor(hash(Math.floor(x / 2), row, seed) * 3);        // tepi ikatan bergerigi
    const within = (y - minY) - row * bundle;
    const streak = vnoise(x * 0.5, (y - minY) * 0.09 + row * 3.1, seed);    // helai vertikal
    let k = 1.2 + shift + streak * 2.3;
    if (within >= bundle - 2 - edge) k -= 1.2;                              // bayangan di bawah ikatan
    else if (within <= 1) k += 0.9;
    if (hash(x, y, seed + 9) > 0.93) k += 0.8;                              // helai terang jarang
    return R(r, Math.floor(k));
  });
}

/** Papan: vertikal atau horizontal. */
export function planks(c, x, y, w, h, o) {
  const { ramp: r, vertical = true, bw = 5, tone = 2, seed = 1 } = o;
  const len = vertical ? h : w, cnt = Math.ceil((vertical ? w : h) / bw);
  for (let b = 0; b < cnt; b++) {
    const hv = hash(b, 1, seed);
    const idx = tone + (hv < 0.25 ? -1 : hv > 0.75 ? 1 : 0);
    const s = (vertical ? x : y) + b * bw;
    for (let u = 0; u < bw; u++) for (let t = 0; t < len; t++) {
      const px = vertical ? s + u : x + t, py = vertical ? y + t : s + u;
      if (px < x || px >= x + w || py < y || py >= y + h) continue;
      let k = idx;
      if (u === 0) k = idx - 2; else if (u === 1) k = idx + 1; else if (u === bw - 1) k = idx - 1;
      else if (vnoise(u * 0.9 + b * 5, t * 0.12, seed) > 0.66) k = idx - 1;   // serat
      c.set(px, py, R(r, k));
    }
    if (hash(b, 2, seed) > 0.86) { // satu mata kayu per papan tertentu
      const t = 6 + Math.floor(hash(b, 3, seed) * Math.max(1, len - 14)), u = Math.floor(bw / 2);
      for (const [du, dt, kk] of [[0, 0, -2], [0, 1, -2], [1, 0, -1], [-1, 1, -1]]) {
        const px = vertical ? s + u + du : x + t + dt, py = vertical ? y + t + dt : s + u + du;
        if (px >= x && px < x + w && py >= y && py < y + h) c.set(px, py, R(r, idx + kk));
      }
    }
  }
}

/** Bayangan lembut ke dalam (garis-garis alfa menurun). */
export function bandShade(c, x, y, w, h, col, a0 = 90, dir = 'down') {
  for (let j = 0; j < h; j++) {
    const a = a0 * (1 - j / h) ** 1.3;
    const yy = dir === 'down' ? y + j : y + h - 1 - j;
    for (let i = 0; i < w; i++) if (c.alpha(x + i, yy)) c.set(x + i, yy, col, Math.max(10, a));
  }
}

/** Jendela. o: {frame, glass:[dark,mid,hi], sill, arch, shutter:'none'|'open'|'closed', shutCol, mullion, flowers} */
export function windowBox(c, x, y, w, h, o) {
  const { frame, glass, sill = true, arch = false, mullion = true, shutter = 'none', shutCol, flowers = null } = o;
  if (shutter === 'open') for (const s of [-1, 1]) {
    const sx = s < 0 ? x - 5 : x + w;
    c.rect(sx, y, 5, h, R(shutCol, 2)); c.vline(sx + (s < 0 ? 0 : 4), y, h, R(shutCol, 1)); c.vline(sx + (s < 0 ? 4 : 0), y, h, R(shutCol, 3));
    for (let j = 2; j < h - 1; j += 3) c.hline(sx + 1, y + j, 3, R(shutCol, 1));
  }
  c.rect(x - 1, y - 1, w + 2, h + 2, R(frame, 1));
  // kaca: gradasi gelap-ke-sedang, dua goresan pantulan diagonal
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let k = j < h * 0.45 ? 1 : 0;
    if (arch) { const cx = (w - 1) / 2, dy = j - (h - 1) * 0.0; if (j < w / 2 && Math.hypot(i - cx, j - w / 2 + 0.5) > w / 2) continue; void dy; }
    c.set(x + i, y + j, glass[clamp(k, 0, glass.length - 1)]);
  }
  for (let t = 0; t < Math.min(4, h - 3); t++) { c.set(x + 2 + Math.floor(t / 1), y + 2 + t, glass[2]); }
  if (w >= 10) for (let t = 0; t < Math.min(3, h - 4); t++) c.set(x + 5 + t, y + 2 + t, glass[2]);
  if (mullion) { c.vline(x + Math.floor(w / 2), y, h, R(frame, 1)); if (h >= 12) c.hline(x, y + Math.floor(h * 0.45), w, R(frame, 1)); }
  c.hline(x - 1, y - 1, w + 2, R(frame, 3));
  if (sill) { c.rect(x - 2, y + h + 1, w + 4, 2, R(frame, 3)); c.hline(x - 2, y + h + 3, w + 4, R(frame, 0), 255); }
  if (flowers) {
    c.rect(x - 1, y + h + 1, w + 2, 4, R(frame, 2)); c.hline(x - 1, y + h + 4, w + 2, R(frame, 0));
    for (let i = 0; i < w; i += 2) { c.set(x + i, y + h, R(flowers.leaf, 2)); if (i % 4 === 0) c.set(x + i, y + h - 1, flowers.bloom); c.set(x + i + 1, y + h + 1, R(flowers.leaf, 1)); }
  }
}

/** Pintu kayu. o: {ramp, iron, arch, step, w,h} -> lubang gelap kecil di sekitarnya */
export function doorBox(c, x, y, w, h, o) {
  const { ramp: r, iron, arch = false, frame = r, knob = null, seed = 3, open = false, inside = null } = o;
  c.rect(x - 2, y - 2, w + 4, h + 2, R(frame, 0));
  const shape = (i, j) => !(arch && j < w / 2 && Math.hypot(i - (w - 1) / 2, j - w / 2 + 0.5) > w / 2);
  if (open && inside) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (shape(i, j)) c.set(x + i, y + j, R(inside, j < h * 0.4 ? 0 : 1));
    return;
  }
  planks(c, x, y, w, h, { ramp: r, vertical: true, bw: 4, tone: 2, seed });
  if (arch) for (let j = 0; j < Math.ceil(w / 2) + 1; j++) for (let i = 0; i < w; i++) if (!shape(i, j)) c.set(x + i, y + j, R(frame, 1));
  if (iron) {
    for (const yy of [Math.floor(h * 0.22), Math.floor(h * 0.7)]) { c.hline(x, y + yy, w, iron[1]); c.hline(x, y + yy + 1, w, iron[0]); c.set(x + 1, y + yy, iron[2]); c.set(x + w - 2, y + yy, iron[2]); }
  }
  c.vline(x + Math.floor(w / 2), y + (arch ? 2 : 0), h - (arch ? 2 : 0), R(r, 0));
  if (knob) { c.set(x + Math.floor(w / 2) - 2, y + Math.floor(h * 0.55), knob); c.set(x + Math.floor(w / 2) + 2, y + Math.floor(h * 0.55), knob); }
}

/** Kotak kayu sederhana berpencahayaan kiri-atas (peti, laci). */
export function shadedBox(c, x, y, w, h, r, tone = 2) {
  c.rect(x, y, w, h, R(r, tone));
  c.hline(x, y, w, R(r, tone + 1)); c.vline(x, y, h, R(r, tone + 1));
  c.hline(x, y + h - 1, w, R(r, tone - 1)); c.vline(x + w - 1, y, h, R(r, tone - 1));
}
