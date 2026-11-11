import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { aveloriaJourney } from './phase5-helpers.mjs';
import { waitWorld } from './phase3-helpers.mjs';
const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:5173/';
const out = resolve(process.env.E2E_OUTPUT_DIR ?? '../.dev-cache/test-artifacts'); mkdirSync(out, { recursive: true });
const results = [], errors = [], requests = [], audio = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok ? ': ' + detail : ''}`); };
const shot = async (page, name) => {
  // Scene/input registration may precede the first canvas render of a newly opened overlay.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return page.screenshot({ path: resolve(out, `p5_${name}.png`) });
};
const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge', headless: true });
console.log(`Phase 5 | ${process.env.E2E_CHANNEL ?? 'msedge'} ${browser.version()} headless | ${BASE}`);
let page;
try {
  for (const [width, height] of [[1366, 768], [1920, 1080]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      if (sessionStorage.getItem('p5_settings')) return;
      localStorage.setItem('tfbt.settings.v1', JSON.stringify({ schema: 'settings_v1', values: { text_speed: 'instant', screen_shake: false, reduced_flashes: true } }));
      sessionStorage.setItem('p5_settings', '1');
    });
    page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('requestfailed', r => requests.push(`${r.url()} ${r.failure()?.errorText}`));
    page.on('response', r => { if (r.status() >= 400) requests.push(`${r.status()} ${r.url()}`); if (/\.(ogg|wav|mp3)(\?|$)/.test(r.url())) audio.push(r.url()); });
    await page.goto(BASE + '?qa=1'); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'));
    await page.waitForTimeout(250); await page.evaluate(() => window.__tfbt.qa.aveloria()); await waitWorld(page);
    await aveloriaJourney(page, check, shot, { prefix: `${width}`, focus: true, choice: width === 1920 ? 1 : 0 });
    await context.close();
  }
} catch (error) { check('Phase 5 execution', false, String(error.stack ?? error)); if (page && !page.isClosed()) { console.log(JSON.stringify(await page.evaluate(() => ({ world: window.__tfbt.world(), state: window.__tfbt.state(), input: window.__tfbt.inputLayer(), focus: window.__tfbt.focus() })))); await shot(page, 'failure'); } }
finally { await browser.close(); }
check('Phase 5: no fatal JavaScript/console errors', errors.length === 0, errors.join('; '));
check('Phase 5: no failed assets or missing requests', requests.length === 0, requests.join('; '));
check('Phase 5: no requests for unprovided audio', audio.length === 0, audio.join('; '));
const failed = results.filter(r => !r.ok).length;
writeFileSync(resolve(out, 'e2e-phase5-report.json'), JSON.stringify({ when: new Date().toISOString(), base: BASE, browser: process.env.E2E_CHANNEL ?? 'msedge', version: browser.version(), total: results.length, failed, results }, null, 2));
console.log(`${results.length - failed}/${results.length} Phase 5 passed`); process.exitCode = failed ? 1 : 0;
