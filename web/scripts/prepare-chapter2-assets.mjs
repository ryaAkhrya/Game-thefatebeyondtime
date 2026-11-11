// Derived imports only. Original DRAFT atlases and portrait faces remain untouched.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const repo = resolve('..');
const roster = [
  { id: 'C03', dir: 'assets/characters/C03_Torvan', explore: true, battle: true,
    expressions: ['NEUTRAL', 'DETERMINED', 'MISCHIEVOUS', 'CURIOUS', 'SAD', 'SURPRISED', 'SOLEMN', 'UPSET'] },
  { id: 'C07', dir: 'assets/characters/C07_Zira', explore: true,
    expressions: ['NEUTRAL', 'CAUTIOUS', 'HAPPY', 'SAD'] },
  { id: 'C02', dir: 'assets/characters/C02_Velthia', expressions: ['VULNERABLE'] },
  { id: 'M02', dir: 'assets/monsters/M02_Briaroot', battle: true, expressions: [] },
  { id: 'M03', dir: 'assets/monsters/M03_Wisplet', battle: true, expressions: [] },
  { id: 'B02', dir: 'assets/bosses/B02_Veyrath', battle: true, expressions: [] },
];
const items = [];
mkdirSync(resolve('public/assets/characters'), { recursive: true });
mkdirSync(resolve('public/assets/battle'), { recursive: true });
mkdirSync(resolve('public/assets/portraits'), { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  for (const def of roster) {
    for (const [kind, enabled] of [['explore', def.explore], ['battle', def.battle]]) {
      if (!enabled) continue;
      const source = `${def.dir}/${def.id}_${kind === 'explore' ? 'EXPLORATION' : 'BATTLE'}_ATLAS_DRAFT`;
      const meta = JSON.parse(readFileSync(resolve(repo, source + '.json'), 'utf8'));
      const expected = kind === 'explore' ? [32, 48] : def.id === 'B02' ? [96, 96] : [64, 64];
      const frameCount = kind === 'explore' ? 24 : 4;
      if (JSON.stringify(meta.authored_grid) !== JSON.stringify(expected) || Object.keys(meta.frames).length !== frameCount) throw Error(`Unexpected atlas ${source}`);
      const out = `assets/${kind === 'explore' ? 'characters' : 'battle'}/${def.id}_${kind}.${'png'}`;
      for (const ext of ['png', 'json']) copyFileSync(resolve(repo, source + '.' + ext), resolve('public', out.replace(/png$/, ext)));
      items.push({ id: `${def.id}_${kind}`, source: source + '.png', out, status: 'DRAFT', grid: expected, frameCount, note: 'Byte-identical source; four battle poses are held, not full animation.' });
    }
    for (const expression of def.expressions) {
      const source = `${def.dir}/${def.id}_EXPRESSION_${expression}.png`;
      const result = await page.evaluate(async b64 => {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        let cur = document.createElement('canvas'); cur.width = img.width; cur.height = img.height; cur.getContext('2d').drawImage(img, 0, 0);
        while (cur.height / 2 > 128) {
          const next = document.createElement('canvas'); next.width = Math.round(cur.width / 2); next.height = Math.round(cur.height / 2);
          const ctx = next.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(cur, 0, 0, next.width, next.height); cur = next;
        }
        const out = document.createElement('canvas'); out.height = 128; out.width = Math.round(img.width * 128 / img.height);
        const ctx = out.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(cur, 0, 0, out.width, out.height);
        return { png: out.toDataURL('image/png'), size: [out.width, out.height] };
      }, readFileSync(resolve(repo, source)).toString('base64'));
      const out = `assets/portraits/${def.id}_${expression}.png`;
      writeFileSync(resolve('public', out), Buffer.from(result.png.split(',')[1], 'base64'));
      items.push({ id: `${def.id}_${expression}`, source, out, status: 'DRAFT', size: result.size, note: 'Original expression resized to 128 px using existing portrait pipeline; no redraw.' });
    }
  }
} finally { await browser.close(); }
writeFileSync('public/assets/chapter2.generated.json', JSON.stringify({ generatedBy: 'scripts/prepare-chapter2-assets.mjs', status: 'DRAFT', items }, null, 2) + '\n');
console.log(`Imported ${items.length} Chapter II DRAFT assets.`);
