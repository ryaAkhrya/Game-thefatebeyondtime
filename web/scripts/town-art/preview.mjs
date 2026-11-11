// Pratinjau sprite: node scripts/town-art/preview.mjs <modul> <out.png> <scale> [nama,...]
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Canvas, H } from './pixel.mjs';
const [mod, out, scale = '3', names = ''] = process.argv.slice(2);
const m = await import(pathToFileURL(resolve(mod)).href);
let frames = m.allSprites();
if (names) frames = frames.filter(f => names.split(',').includes(f.name));
const bg = H(process.env.BG ?? '#85827f');
const maxW = +(process.env.W ?? 900); let x = 6, y = 6, rowH = 0; const placed = [];
for (const f of frames) { if (x + f.c.w + 6 > maxW) { x = 6; y += rowH + 6; rowH = 0; } placed.push([f, x, y]); x += f.c.w + 6; rowH = Math.max(rowH, f.c.h); }
const sheet = new Canvas(maxW, y + rowH + 6); sheet.rect(0, 0, sheet.w, sheet.h, bg);
for (const [f, px, py] of placed) { sheet.blit(f.c, px, py); sheet.hline(px, py + Math.round(f.pivot.y * f.c.h) - 1, f.c.w, [255, 0, 255], 90); }
const s = +scale, big = new Canvas(sheet.w * s, sheet.h * s);
for (let j = 0; j < sheet.h; j++) for (let i = 0; i < sheet.w; i++) { const c = sheet.get(i, j); if (c) for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) big.set(i * s + a, j * s + b, c); }
writeFileSync(out, big.png()); console.log('ok', out, frames.map(f => `${f.name}:${f.c.w}x${f.c.h}`).join(' '));
