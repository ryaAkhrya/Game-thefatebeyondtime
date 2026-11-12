// Ukur frame time (rAF) headless: BUKAN FPS GPU. Membandingkan keadaan idle vs VFX aktif, dan Aveloria Bab I vs Aveloria krisis.
import { chromium } from 'playwright-core';
import { press, ready, selectMenu } from './battle-helpers.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const out = resolve(process.env.E2E_OUTPUT_DIR ?? '../.dev-cache/test-artifacts/perf7'); mkdirSync(out, { recursive: true });
const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:4199/';
const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge', headless: true });
const sample = (page, ms) => page.evaluate(ms => new Promise(res => { const d = []; let last = performance.now(); const end = last + ms; const f = t => { d.push(t - last); last = t; if (t < end) requestAnimationFrame(f); else { d.shift(); d.sort((a, b) => a - b); const mean = d.reduce((a, b) => a + b, 0) / d.length; res({ frames: d.length, meanMs: +mean.toFixed(2), p95Ms: +d[Math.floor(d.length * 0.95)].toFixed(2), maxMs: +d.at(-1).toFixed(2) }); } }; requestAnimationFrame(f); }), ms);
const results = {};
for (const [width, height] of [[1366, 768], [1920, 1080]]) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(() => localStorage.setItem('tfbt.settings.v1', JSON.stringify({ schema: 'settings_v1', values: { text_speed: 'instant', screen_shake: true, reduced_flashes: false } })));
  const page = await ctx.newPage(); await page.goto(BASE + '?qa=1'); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'));
  const k = `${width}`;
  await page.evaluate(() => window.__tfbt.qa.chapter1Complete()); await page.waitForTimeout(3500);
  results[`${k}_aveloria_ch1`] = await sample(page, 3000);
  await page.evaluate(() => window.__tfbt.qa.chapter3('start')); await page.waitForTimeout(500);
  for (let i = 0; i < 12 && (await page.evaluate(() => !!window.__tfbt.world()?.dialogue)); i++) { await press(page, 'Enter'); await page.waitForTimeout(300); }
  await page.evaluate(() => window.__tfbt.qa.teleport(640, 700)); await page.waitForTimeout(800);
  results[`${k}_aveloria_crisis`] = await sample(page, 3000);
  await page.reload(); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'));
  await page.evaluate(() => window.__tfbt.qa.chapter3('hall', 'chronolith')); await ready(page);
  results[`${k}_battle_idle`] = await sample(page, 3000);
  // aksi dengan VFX (Ground Slam) sambil sampel
  await selectMenu(page, 'skill'); await press(page, 'Enter'); await selectMenu(page, 'ground_slam'); await press(page, 'Enter'); await press(page, 'Enter');
  results[`${k}_battle_vfx_action`] = await sample(page, 2200);
  const b = await page.evaluate(() => window.__tfbt.battle());
  results[`${k}_fx_peak_active_note`] = { playedIds: b.fx.played.length, activeNow: b.fx.active };
  await ctx.close();
}
await browser.close();
writeFileSync(resolve(out, 'perf7.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
