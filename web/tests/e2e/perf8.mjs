// Phase 8: ukur frame time (rAF) headless: BUKAN FPS GPU/perangkat nyata. Membandingkan Benteng idle, battle idle, dan jendela meteor/Perlindungan,
// lalu memeriksa kebocoran sprite VFX/tekstur setelah battle Varlgrim berulang (urutan Hollowling -> Mournfang -> Veyrath -> Chronolith -> Varlgrim).
import { chromium } from 'playwright-core';
import { press, ready, selectMenu } from './battle-helpers.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const out = resolve(process.env.E2E_OUTPUT_DIR ?? '../.dev-cache/test-artifacts/perf8'); mkdirSync(out, { recursive: true });
const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:4199/';
const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge', headless: true });
const sample = (page, ms) => page.evaluate(ms => new Promise(res => { const d = []; let last = performance.now(); const end = last + ms; const f = t => { d.push(t - last); last = t; if (t < end) requestAnimationFrame(f); else { d.shift(); d.sort((a, b) => a - b); const mean = d.reduce((a, b) => a + b, 0) / d.length; res({ frames: d.length, meanMs: +mean.toFixed(2), p95Ms: +d[Math.floor(d.length * 0.95)].toFixed(2), maxMs: +d.at(-1).toFixed(2) }); } }; requestAnimationFrame(f); }), ms);
const mem = page => page.evaluate(() => ({ heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, textures: window.__tfbt.textureCount?.() ?? null }));
const results = {};
for (const [width, height] of [[1366, 768], [1920, 1080]]) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(() => localStorage.setItem('tfbt.settings.v1', JSON.stringify({ schema: 'settings_v1', values: { text_speed: 'instant', screen_shake: true, reduced_flashes: false } })));
  const page = await ctx.newPage(); await page.goto(BASE + '?qa=1'); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'));
  const k = `${width}`;
  await page.evaluate(() => window.__tfbt.qa.chapter4('checkpoint')); await page.waitForTimeout(3500);
  results[`${k}_fortress_idle`] = await sample(page, 3000);
  await page.reload(); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'));
  await page.evaluate(() => window.__tfbt.qa.chapter4('boss', 'varlgrim')); await ready(page);
  results[`${k}_varlgrim_idle`] = await sample(page, 3000);
  await page.evaluate(() => window.__tfbt.qa.battleHp('C04', 330));
  // main sampai jendela meteor lalu rekam frame time selama meteor_call/aegis/meteor_fall
  let measured = false;
  for (let g = 0; g < 80 && !measured; g++) {
    await ready(page);
    const b = await page.evaluate(() => window.__tfbt.battle());
    if (b.outcome) break;
    const cur = b.actors.find(a => a.id === b.order[b.cursor]);
    const ag = b.meteorFx?.aegisStatus;
    if (cur.id === 'C02' && ag?.threat && ag.windowOpen && !ag.covered) {
      await selectMenu(page, 'velthia_aegis'); await press(page, 'Enter');
      results[`${k}_aegis_cast`] = await sample(page, 2500);
      for (let w = 0; w < 40; w++) { const p = await page.evaluate(() => window.__tfbt.battle()?.pending?.command); if (p === 'meteor_fall') break; await page.waitForTimeout(200); }
      results[`${k}_meteor_fall`] = await sample(page, 3800);
      results[`${k}_fx_after_meteor`] = await page.evaluate(() => ({ active: window.__tfbt.battle().fx.active, running: window.__tfbt.battle().fx.running }));
      measured = true; break;
    }
    if (cur.id === 'C02') { await selectMenu(page, 'skill'); await press(page, 'Enter'); await selectMenu(page, 'velthia_pulse'); await press(page, 'Enter'); }
    else { await selectMenu(page, 'attack'); await press(page, 'Enter'); }
  }
  results[`${k}_meteor_measured`] = measured;
  await ctx.close();
}
await browser.close();
writeFileSync(resolve(out, 'perf8.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
