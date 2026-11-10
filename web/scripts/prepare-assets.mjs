// Menyiapkan salinan TURUNAN aset untuk web/public (sumber di ../assets TIDAK diubah). Dapat dijalankan ulang.
//   node scripts/prepare-assets.mjs
// 1) Atlas eksplorasi Yaric v3.2 (terbaru yang ada; belum ada versi v3.3 untuk eksplorasi): piksel liar di baris y>=44
//    pada frame left_*/right_* dihapus (ditemukan oleh scripts/asset-qa.mjs). Piksel lain tidak disentuh.
// 2) Atlas eksplorasi Nambo (DRAFT): disalin apa adanya.
// 3) Portrait ekspresi: diperkecil (tinggi 128 px, resampling kualitas tinggi bertahap) dari PNG individual; bukan pixelation.
// Semua keluaran berstatus sama dengan sumbernya (NEEDS_REVIEW / DRAFT) dan dicatat di assets.generated.json.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const pub = resolve(here, '../public/assets');
const chars = resolve(pub, 'characters');
const ports = resolve(pub, 'portraits');
mkdirSync(chars, { recursive: true });
mkdirSync(ports, { recursive: true });

const YARIC_SRC = 'assets/characters/C01_Yaric/v3_2/C01_EXPLORATION_PIXEL_PASS_V3_2';
const NAMBO_SRC = 'assets/characters/C08_Nambo/C08_EXPLORATION_ATLAS_DRAFT';
const PORTRAIT_HEIGHT = 128;
const PORTRAITS = {
  C01: { dir: 'C01_Yaric', names: ['ANGRY', 'CONFUSED', 'DETERMINED', 'EMBARRASSED', 'HAPPY', 'NEUTRAL', 'SAD', 'SURPRISED'] },
  C08: { dir: 'C08_Nambo', names: ['CONCERNED', 'HAPPY', 'NEUTRAL', 'SURPRISED'] },
};

const manifest = { generatedBy: 'web/scripts/prepare-assets.mjs', items: [] };
const b64 = (p) => readFileSync(resolve(repo, p)).toString('base64');

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge', headless: true });
const page = await browser.newPage();

// ---- 1. Yaric: bersihkan piksel liar ----
const yaricJson = JSON.parse(readFileSync(resolve(repo, YARIC_SRC + '.json'), 'utf8'));
const cleaned = await page.evaluate(
  async ({ b64, frames }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, c.width, c.height);
    let removed = 0;
    for (const [k, f] of Object.entries(frames)) {
      if (!/^(left|right)_/.test(k)) continue;
      const [fx, fy, fw, fh] = f.rect;
      for (let y = 44; y < fh; y++)
        for (let x = 0; x < fw; x++) {
          const i = ((fy + y) * c.width + (fx + x)) * 4;
          if (id.data[i + 3] > 0) {
            id.data[i + 3] = 0;
            removed++;
          }
        }
    }
    ctx.putImageData(id, 0, 0);
    return { png: c.toDataURL('image/png'), removed };
  },
  { b64: b64(YARIC_SRC + '.png'), frames: yaricJson.frames },
);
writeFileSync(resolve(chars, 'C01_explore.png'), Buffer.from(cleaned.png.split(',')[1], 'base64'));
copyFileSync(resolve(repo, YARIC_SRC + '.json'), resolve(chars, 'C01_explore.json'));
manifest.items.push({ id: 'C01_EXPLORE', source: YARIC_SRC + '.png', out: 'assets/characters/C01_explore.png', status: 'NEEDS_REVIEW', note: `piksel liar dihapus pada frame left_*/right_* (y>=44): ${cleaned.removed} px` });
console.log('Yaric: piksel liar dihapus =', cleaned.removed);

// ---- 2. Nambo: salin ----
copyFileSync(resolve(repo, NAMBO_SRC + '.png'), resolve(chars, 'C08_explore.png'));
copyFileSync(resolve(repo, NAMBO_SRC + '.json'), resolve(chars, 'C08_explore.json'));
manifest.items.push({ id: 'C08_EXPLORE', source: NAMBO_SRC + '.png', out: 'assets/characters/C08_explore.png', status: 'DRAFT', note: 'salinan apa adanya; sprite prototipe DRAFT kualitas rendah' });

// ---- 3. Portrait ----
for (const [cid, def] of Object.entries(PORTRAITS)) {
  for (const name of def.names) {
    const src = `assets/characters/${def.dir}/${cid}_EXPRESSION_${name}.png`;
    if (!existsSync(resolve(repo, src))) {
      console.warn('tidak ada:', src);
      continue;
    }
    const res = await page.evaluate(
      async ({ b64, h }) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + b64;
        await img.decode();
        let cur = document.createElement('canvas');
        cur.width = img.width;
        cur.height = img.height;
        cur.getContext('2d').drawImage(img, 0, 0);
        const outW = Math.round((img.width * h) / img.height);
        // turunkan bertahap (maks 2x per langkah) agar tidak aliasing
        while (cur.height / 2 > h) {
          const n = document.createElement('canvas');
          n.width = Math.round(cur.width / 2);
          n.height = Math.round(cur.height / 2);
          const nctx = n.getContext('2d');
          nctx.imageSmoothingEnabled = true;
          nctx.imageSmoothingQuality = 'high';
          nctx.drawImage(cur, 0, 0, n.width, n.height);
          cur = n;
        }
        const fin = document.createElement('canvas');
        fin.width = outW;
        fin.height = h;
        const fctx = fin.getContext('2d');
        fctx.imageSmoothingEnabled = true;
        fctx.imageSmoothingQuality = 'high';
        fctx.drawImage(cur, 0, 0, outW, h);
        return { png: fin.toDataURL('image/png'), w: outW, h, sw: img.width, sh: img.height };
      },
      { b64: b64(src), h: PORTRAIT_HEIGHT },
    );
    const out = `assets/portraits/${cid}_${name}.png`;
    writeFileSync(resolve(pub, '..', out), Buffer.from(res.png.split(',')[1], 'base64'));
    manifest.items.push({ id: `${cid}_${name}`, source: src, out, status: 'DRAFT', size: [res.w, res.h], sourceSize: [res.sw, res.sh] });
  }
}
await browser.close();
writeFileSync(resolve(pub, 'assets.generated.json'), JSON.stringify(manifest, null, 2));
console.log('selesai:', manifest.items.length, 'item ->', pub);
