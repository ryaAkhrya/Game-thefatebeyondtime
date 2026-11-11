// Derived imports only: originals, faces and costumes remain untouched. No new art/audio.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
const repo = resolve('..'), pub = resolve('public/assets');
const definitions = {
  C02: { dir: 'C02_Velthia', expressions: ['NEUTRAL', 'STERN', 'AMUSED', 'WORRIED', 'SURPRISED'] },
  C05: { dir: 'C05_Azie', expressions: ['NEUTRAL', 'WORRIED', 'SKEPTICAL'] },
  C06: { dir: 'C06_Talric', expressions: ['NEUTRAL', 'SUSPICIOUS', 'ALARMED'] },
  C09: { dir: 'C09_Derrria', expressions: ['NEUTRAL', 'AMUSED', 'WORRIED'] },
};
const manifest = { generatedBy: 'web/scripts/prepare-aveloria-assets.mjs', status: 'DRAFT', items: [] };
mkdirSync(resolve(pub, 'characters'), { recursive: true }); mkdirSync(resolve(pub, 'portraits'), { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  for (const [id, def] of Object.entries(definitions)) {
    const source = `assets/characters/${def.dir}/${id}_EXPLORATION_ATLAS_DRAFT`;
    const meta = JSON.parse(readFileSync(resolve(repo, source + '.json'), 'utf8'));
    if (JSON.stringify(meta.authored_grid) !== '[32,48]' || Object.keys(meta.frames).length !== 24) throw Error(`Unexpected atlas ${id}`);
    for (const ext of ['png', 'json']) copyFileSync(resolve(repo, source + '.' + ext), resolve(pub, `characters/${id}_explore.${ext}`));
    manifest.items.push({ id: `${id}_EXPLORE`, source: source + '.png', out: `assets/characters/${id}_explore.png`, status: 'DRAFT', note: 'byte-identical, four directions, six frames, foot pivot 16/46; unfinished prototype' });
    for (const expression of def.expressions) {
      const src = `assets/characters/${def.dir}/${id}_EXPRESSION_${expression}.png`;
      const result = await page.evaluate(async b64 => {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        let cur = document.createElement('canvas'); cur.width = img.width; cur.height = img.height; cur.getContext('2d').drawImage(img, 0, 0);
        while (cur.height / 2 > 128) {
          const next = document.createElement('canvas'); next.width = Math.round(cur.width / 2); next.height = Math.round(cur.height / 2);
          const ctx = next.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(cur, 0, 0, next.width, next.height); cur = next;
        }
        const out = document.createElement('canvas'); out.height = 128; out.width = Math.round(img.width * 128 / img.height);
        const ctx = out.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(cur, 0, 0, out.width, out.height);
        return { png: out.toDataURL('image/png'), size: [out.width, out.height], sourceSize: [img.width, img.height] };
      }, readFileSync(resolve(repo, src)).toString('base64'));
      const out = `assets/portraits/${id}_${expression}.png`;
      writeFileSync(resolve('public', out), Buffer.from(result.png.split(',')[1], 'base64'));
      manifest.items.push({ id: `${id}_${expression}`, source: src, out, status: 'DRAFT', size: result.size, sourceSize: result.sourceSize, note: 'individual source PNG resized using the existing portrait pipeline; no redraw' });
    }
  }
} finally { await browser.close(); }
writeFileSync(resolve(pub, 'aveloria.generated.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Imported ${manifest.items.length} existing DRAFT assets.`);
