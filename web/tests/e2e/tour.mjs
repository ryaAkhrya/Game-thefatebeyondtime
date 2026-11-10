// Tur visual cepat Hutan 1 (untuk QA mata manusia): memotret beberapa titik dunia lewat ?qa=1 (teleport hanya QA).
//   npm run build && node tests/e2e/tour.mjs
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '../..');
const out = resolve(webRoot, '../.dev-cache/test-artifacts');
mkdirSync(out, { recursive: true });
const PORT = 4197;
const server = spawn(process.execPath, [resolve(webRoot, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: webRoot, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((res) => server.stdout.on('data', (d) => String(d).includes('127.0.0.1') && res()));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`http://127.0.0.1:${PORT}/?qa=1`);
await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'));
await page.waitForTimeout(400);
await page.keyboard.press('Enter');
await page.waitForFunction(() => window.__tfbt.world()?.dialogue || window.__tfbt.world());
await page.waitForTimeout(3500);
await page.screenshot({ path: resolve(out, 'tour_01_spawn.png') });
console.log(JSON.stringify(await page.evaluate(() => window.__tfbt.world())).slice(0, 600));
const spots = [
  ['02_clearing_east', 250, 500],
  ['03_corridor_sign', 560, 520],
  ['04_trail_mouth', 840, 520],
  ['05_glade', 830, 220],
];
for (const [name, x, y] of spots) {
  await page.evaluate(([x, y]) => window.__tfbt.qa.teleport(x, y), [x, y]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: resolve(out, `tour_${name}.png`) });
}
console.log('errors:', errors);
await browser.close();
server.kill();
