// Pratinjau krisis Aveloria tanpa browser: node scripts/town-art/crisis-preview.mjs <out_dir> [scale]
// Menyusun tanah + item Aveloria + prop krisis + NPC (atlas karakter final) per tahap, dengan urutan depth yang sama dengan runtime,
// lalu memotong beberapa sudut pandang. Hanya alat QA (tidak dipakai game). Pewarnaan/animasi runtime (jitter, kibaran) tidak digambar.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Canvas } from './pixel.mjs';
import { aveFrames } from './ave-all.mjs';
import { crisisFrames } from './crisis-all.mjs';
import { AVELORIA_ITEMS } from '../../src/game/data/maps/town.layout.mjs';
import { CRISIS_ITEMS, WALKERS, GATE_GUARD, TORVAN_LOOP, crisisNpcSpots, crisisLevel, itemVisible, walkerFinal, walkersMode } from '../../src/game/data/maps/town.crisis.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pub = resolve(here, '../../public/assets');

function readPng(path) {
  const buf = readFileSync(path); let pos = 8, w = 0, h = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); } else if (type === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = w * 4, out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? out[y * stride + i - 4] : 0, b = y > 0 ? out[(y - 1) * stride + i] : 0, c = i >= 4 && y > 0 ? out[(y - 1) * stride + i - 4] : 0;
      let v = row[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + i] = v & 255;
    }
  }
  const c = new Canvas(w, h); c.d = out; return c;
}
const crop = (src, x, y, w, h) => { const c = new Canvas(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = ((y + j) * src.w + x + i) * 4; for (let q = 0; q < 4; q++) c.d[(j * w + i) * 4 + q] = src.d[k + q]; } return c; };

const outDir = resolve(process.argv[2] ?? resolve(here, '../../../docs/production/sprint3/aveloria-preview'));
const SCALE = +(process.argv[3] ?? 2);
mkdirSync(outDir, { recursive: true });

const ground = readPng(resolve(pub, 'environment/town/aveloria_ground.png'));
const aveMap = Object.fromEntries(aveFrames().map(f => [f.name, f]));
const crMap = Object.fromEntries(crisisFrames().map(f => [f.name, f]));
const chars = {};
for (const id of ['C02', 'C03', 'C05', 'C06']) chars[id] = readPng(resolve(pub, `characters/final/${id}_explore.png`));
const ROW = { down: 0, left: 1, right: 2, up: 3 };
const charFrame = (id, facing) => { const c = chars[id]; return { c: crop(c, 0, ROW[facing] * 48, 32, 48), pivot: { x: 0.5, y: 47 / 48 } }; };

function draw(canvas, fr, x, y, depth, list, flip = false) {
  list.push({ depth, fn: () => { const c = flip ? fr.c.flipX() : fr.c; const px = flip ? 1 - fr.pivot.x : fr.pivot.x; canvas.blit(c, Math.round(x - px * c.w), Math.round(y - fr.pivot.y * c.h)); } });
}

/** posisi warga pada t detik sejak evakuasi mulai (sama dengan view: kecepatan konstan, tunda `delay`). */
function walkerAt(w, t) {
  let rem = Math.max(0, (t - w.delay) * w.speed);
  for (let i = 1; i < w.route.length; i++) {
    const [x0, y0] = w.route[i - 1], [x1, y1] = w.route[i], d = Math.hypot(x1 - x0, y1 - y0);
    if (rem <= d) { const k = rem / d; const dx = x1 - x0, dy = y1 - y0; return { x: x0 + dx * k, y: y0 + dy * k, facing: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'), moving: rem > 0 } };
    rem -= d;
  }
  return null; // sudah selesai
}

function citizenFrame(variant, facing, moving) {
  const dir = facing === 'left' || facing === 'right' ? 'side' : facing;
  return { fr: crMap[`cit_${variant}_${moving ? 'walk' : 'idle'}_${dir}_${moving ? 1 : 0}`], flip: facing === 'left' };
}

function render(stage, opt = {}) {
  const canvas = new Canvas(ground.w, ground.h);
  canvas.blit(ground, 0, 0);
  const lvl = crisisLevel(stage), list = [];
  // item Aveloria (pintu terbuka karena arsip selesai; portcullis hanya bila gerbang masih terkunci)
  const locked = !(stage !== 'pre' && ['evacOrdered', 'evacDone', 'decision', 'torvanStays', 'velthiaJoined', 'departed'].includes(stage));
  for (const it of AVELORIA_ITEMS) {
    if (it.id === 'door_closed') continue;
    if (it.id === 'gate' && !locked) continue;
    const fr = aveMap[it.f]; if (!fr) continue;
    draw(canvas, fr, it.x, it.y, it.d ?? it.y, list, !!it.flip);
  }
  const decals = [];
  for (const it of CRISIS_ITEMS) {
    if (!itemVisible(it, stage)) continue;
    const f = it.f;
    switch (it.kind) {
      case 'decal': draw(canvas, crMap[f], it.x, it.y, -900, decals); break;
      case 'shadow': draw(canvas, crMap[f], it.x, it.y, -890, decals); break;
      case 'float': draw(canvas, crMap[it.s], it.x, it.y, -880, decals); draw(canvas, { c: crMap[f].c, pivot: { x: 0.5, y: 0.5 } }, it.x, it.y - it.lift, it.y, list); break;
      case 'cart': case 'bundle': draw(canvas, crMap[f], it.x, it.y, it.y, list); break;
      case 'water': draw(canvas, crMap[opt.alt ? 'crisis_well_water_b' : 'crisis_well_water_a'], it.x, it.y, 881, list); break;
      case 'clock': draw(canvas, { c: crMap[`crisis_clock_${opt.clock ?? (lvl >= 2 ? 4 : 2)}`].c, pivot: { x: 0.5, y: 0.5 } }, it.x, it.y, 546, list); break;
      case 'flame': draw(canvas, { c: crMap[it.pose ?? (opt.alt ? 'crisis_flame_r' : 'crisis_flame_l')].c, pivot: { x: 0.5, y: 0.5 } }, it.x, it.y - 60, it.y + 1, list); break;
      case 'banner': draw(canvas, crMap[`crisis_banner_${((it.phase ?? 0) + (opt.alt ? 1 : 0)) % 4}`], it.x, it.y, it.y, list); break;
      case 'basket': draw(canvas, { c: crMap.crisis_basket.c, pivot: { x: 0.5, y: 0.5 } }, it.x, it.y, it.y + 34, list);
        for (const [dx, dy] of [[-8, -16], [4, -24], [12, -12]]) draw(canvas, { c: crMap.crisis_apple.c, pivot: { x: 0.5, y: 0.5 } }, it.x + dx, it.y + dy, it.y + 36, list);
        draw(canvas, { c: crMap.crisis_fshadow_m.c, pivot: { x: 0.5, y: 0.5 } }, it.x, it.y + 34, -880, decals); break;
    }
  }
  // NPC bernama
  const spots = crisisNpcSpots(stage);
  const put = (id, s) => { const fr = charFrame(id, s.facing); draw(canvas, fr, s.x, s.y, s.y, list); };
  if (spots.velthia !== 'follow') put('C02', spots.velthia); else put('C02', { x: opt.playerX - 26 ?? 600, y: opt.playerY ?? 1100, facing: 'up' });
  put('C05', spots.azie); put('C06', spots.talric);
  if (spots.gateGuard) draw(canvas, crMap.cit_guard_idle_down_0, spots.gateGuard.x, spots.gateGuard.y, spots.gateGuard.y, list);
  // Torvan: bermuat peti saat berjalan ke kereta
  if (spots.torvan) put('C03', spots.torvan);
  else { const [x, y] = opt.torvan ?? [500, 1010]; put('C03', { x, y, facing: 'right' }); draw(canvas, { c: crMap.crisis_crate_carry.c, pivot: { x: 0.5, y: 0.5 } }, x + 3, y - 18, y + 1, list); }
  // warga
  const mode = walkersMode(stage);
  for (const w of WALKERS) {
    if (mode === 'work') { const s = w.route[0]; const { fr, flip } = citizenFrame(w.variant, w.facing, w.role.startsWith('work-') && w.role !== 'work-sort'); draw(canvas, fr, s[0], s[1], s[1], list, flip); }
    else if (mode === 'stream') {
      const p = walkerAt(w, opt.t ?? 0);
      if (p) { const { fr, flip } = citizenFrame(w.variant, p.facing, p.moving); draw(canvas, fr, p.x, p.y, p.y, list, flip); }
      else if (w.end !== 'exit') { const g = walkerFinal(w, 'evacDone'); const { fr, flip } = citizenFrame(w.variant, g.facing, false); draw(canvas, fr, g.x, g.y, g.y, list, flip); }
    } else { const f = walkerFinal(w, stage); if (f.visible) { const { fr, flip } = citizenFrame(w.variant, f.facing ?? 'down', false); draw(canvas, fr, f.x, f.y, f.y, list, flip); } }
  }
  decals.sort((a, b) => a.depth - b.depth).forEach(d => d.fn());
  list.sort((a, b) => a.depth - b.depth).forEach(d => d.fn());
  void GATE_GUARD; void TORVAN_LOOP;
  return canvas;
}

function save(name, canvas, box) {
  const [x, y, w, h] = box, c = crop(canvas, x, y, w, h), s = SCALE, big = new Canvas(w * s, h * s);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = (j * w + i) * 4; if (c.d[k + 3]) for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) big.set(i * s + a, j * s + b, [c.d[k], c.d[k + 1], c.d[k + 2]]); }
  writeFileSync(resolve(outDir, name), big.png()); console.log('ok', name);
}

const VIEW = { north: [384, 400, 640, 400], mid: [384, 700, 640, 400], south: [384, 960, 640, 440], court: [400, 130, 640, 520], market: [130, 760, 560, 340], full: [0, 0, 1280, 1408] };
const jobs = [
  ['01_start_court.png', 'start', VIEW.north, {}],
  ['02_start_plaza.png', 'start', VIEW.mid, {}],
  ['03_level2_market.png', 'velthiaRefuses', VIEW.market, { alt: true }],
  ['04_evac_mid_plaza.png', 'evacOrdered', VIEW.mid, { t: 9, torvan: [470, 1012] }],
  ['05_evac_mid_gate.png', 'evacOrdered', VIEW.south, { t: 13, torvan: [560, 1050], alt: true }],
  ['06_evac_done_gate.png', 'evacDone', VIEW.south, {}],
  ['07_council_room.png', 'evacDone', VIEW.court, {}],
  ['08_decision_level3.png', 'torvanStays', VIEW.mid, { playerX: 640, playerY: 800 }],
  ['09_departed_gate.png', 'departed', VIEW.south, { playerX: 640, playerY: 1250 }],
  ['00_full_level3.png', 'departed', VIEW.full, { playerX: 640, playerY: 1250 }],
];
for (const [name, stage, box, opt] of jobs) save(name, render(stage, opt), box);
