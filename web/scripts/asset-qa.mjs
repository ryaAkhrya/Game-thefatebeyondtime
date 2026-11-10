// QA aset atlas (grid, alpha, bbox per frame, perbandingan kiri vs kanan-cermin) memakai Edge/Chrome via playwright-core.
// Pemakaian: node scripts/asset-qa.mjs <atlas.png> <atlas.json> <nama-keluaran> [scale]
// Keluaran di ../.dev-cache/test-artifacts/: <nama>_qa.json dan <nama>_sheet.png (kontak sheet diperbesar).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const [png, json, name, scaleArg] = process.argv.slice(2);
if (!png || !json || !name) {
  console.error('usage: node scripts/asset-qa.mjs <png> <json> <name> [scale]');
  process.exit(1);
}
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../../.dev-cache/test-artifacts');
mkdirSync(out, { recursive: true });
const meta = JSON.parse(readFileSync(json, 'utf8'));
const b64 = readFileSync(png).toString('base64');
const scale = Number(scaleArg ?? 6);

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge', headless: true });
const page = await browser.newPage();
const result = await page.evaluate(
  async ({ b64, meta, scale }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    const frames = {};
    const px = (x, y) => data[(y * c.width + x) * 4 + 3];
    for (const [k, f] of Object.entries(meta.frames)) {
      const [fx, fy, fw, fh] = f.rect;
      let minX = fw, minY = fh, maxX = -1, maxY = -1, opaque = 0, semi = 0, edge = 0;
      for (let y = 0; y < fh; y++)
        for (let x = 0; x < fw; x++) {
          const a = px(fx + x, fy + y);
          if (a > 0) {
            opaque++;
            if (a < 255) semi++;
            minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
            if (x === 0 || y === 0 || x === fw - 1 || y === fh - 1) edge++;
          }
        }
      frames[k] = { rect: f.rect, bbox: opaque ? [minX, minY, maxX, maxY] : null, opaque, semiTransparent: semi, touchesCellEdge: edge };
    }
    // kiri vs cermin kanan
    const diffs = {};
    const get = (k) => {
      const [fx, fy, fw, fh] = meta.frames[k].rect;
      return ctx.getImageData(fx, fy, fw, fh);
    };
    for (const k of Object.keys(meta.frames)) {
      if (!k.startsWith('left_')) continue;
      const rk = k.replace('left_', 'right_');
      if (!meta.frames[rk]) continue;
      const a = get(k), b = get(rk);
      const w = a.width, h = a.height;
      let same = 0, total = 0;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const ia = (y * w + x) * 4, ib = (y * w + (w - 1 - x)) * 4;
          const oa = a.data[ia + 3] > 0, ob = b.data[ib + 3] > 0;
          if (oa || ob) {
            total++;
            if (oa && ob && a.data[ia] === b.data[ib] && a.data[ia + 1] === b.data[ib + 1] && a.data[ia + 2] === b.data[ib + 2]) same++;
          }
        }
      // juga bandingkan tanpa cermin (apakah right sama dengan left apa adanya)
      let sameDirect = 0, totalDirect = 0;
      for (let i = 0; i < a.data.length; i += 4) {
        const oa = a.data[i + 3] > 0, ob = b.data[i + 3] > 0;
        if (oa || ob) {
          totalDirect++;
          if (oa && ob && a.data[i] === b.data[i] && a.data[i + 1] === b.data[i + 1] && a.data[i + 2] === b.data[i + 2]) sameDirect++;
        }
      }
      diffs[`${k} vs ${rk}`] = { mirroredMatch: +(same / (total || 1)).toFixed(3), directMatch: +(sameDirect / (totalDirect || 1)).toFixed(3) };
    }
    // contact sheet berskala dengan grid
    const sheet = document.createElement('canvas');
    sheet.width = c.width * scale;
    sheet.height = c.height * scale;
    const sctx = sheet.getContext('2d');
    sctx.imageSmoothingEnabled = false;
    sctx.fillStyle = '#6a8a6a';
    sctx.fillRect(0, 0, sheet.width, sheet.height);
    sctx.drawImage(c, 0, 0, sheet.width, sheet.height);
    sctx.strokeStyle = 'rgba(255,0,255,0.7)';
    for (const f of Object.values(meta.frames)) {
      const [fx, fy, fw, fh] = f.rect;
      sctx.strokeRect(fx * scale + 0.5, fy * scale + 0.5, fw * scale - 1, fh * scale - 1);
    }
    return { width: c.width, height: c.height, frames, diffs, sheet: sheet.toDataURL('image/png') };
  },
  { b64, meta, scale },
);
await browser.close();
const { sheet, ...rest } = result;
writeFileSync(resolve(out, `${name}_sheet.png`), Buffer.from(sheet.split(',')[1], 'base64'));
writeFileSync(resolve(out, `${name}_qa.json`), JSON.stringify(rest, null, 2));
console.log(JSON.stringify({ size: [rest.width, rest.height], diffs: rest.diffs }, null, 2));
const bad = Object.entries(rest.frames).filter(([, f]) => f.touchesCellEdge > 0 || !f.bbox);
console.log('frames menyentuh tepi sel / kosong:', bad.map(([k, f]) => `${k}(edge=${f.touchesCellEdge})`).join(', ') || 'tidak ada');
