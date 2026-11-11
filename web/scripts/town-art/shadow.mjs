// Bayangan jatuh ke tanah dari siluet sprite (cahaya kiri-atas -> bayangan ke kanan-bawah), dibaking ke kanvas tanah.
import { mix } from './pixel.mjs';
export function castShadows(c, items, frames, col, o = {}) {
  const sx = o.sx ?? 0.5, sy = o.sy ?? 0.2, strength = o.strength ?? 0.34, W = c.w, H = c.h;
  const shade = new Uint8Array(W * H);
  for (const it of items) {
    if (it.sh === false || !frames[it.f]) continue;
    const fr = frames[it.f], sc = fr.c, baseRow = Math.round(fr.pivot.y * sc.h) - 1, ox = Math.round(it.x - fr.pivot.x * sc.w), oy = Math.round(it.y - (baseRow + 1));
    const cap = o.cap ? o.cap(it.f) : 90;
    for (let i = 0; i < sc.w; i++) {
      const sxl = it.flip ? sc.w - 1 - i : i;
      let top = -1;
      for (let j = 0; j <= sc.h; j++) if (sc.alpha(sxl, j) > 128) { top = j; break; }
      if (top < 0) continue;
      const hgt = Math.min(cap, baseRow - top); if (hgt <= 0) continue;
      const wx = ox + i, wy = oy + baseRow + 1, steps = Math.ceil(hgt * 0.55);
      for (let s = 0; s <= steps; s++) { const t = s / steps, x = Math.round(wx + hgt * sx * t), y = Math.round(wy + hgt * sy * t); if (x >= 0 && y >= 0 && x < W && y < H) shade[y * W + x] = 1; }
    }
    if (sc.w < 70) for (let i = 0; i < sc.w - 6; i++) { const x = ox + 3 + i, y = oy + baseRow + 1; if (x >= 0 && x < W && y >= 0 && y < H) shade[y * W + x] = 1; }
  }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (shade[y * W + x] === 1) continue;
    if (shade[y * W + x - 1] + shade[y * W + x + 1] + shade[(y - 1) * W + x] + shade[(y + 1) * W + x] >= 3) shade[y * W + x] = 2;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (shade[y * W + x]) { const p = c.get(x, y); if (p) c.set(x, y, mix(p, col, strength)); }
}
