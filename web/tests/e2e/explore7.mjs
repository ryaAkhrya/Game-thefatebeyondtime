// Eksplorasi QA Phase 7 (bukan bagian suite): tangkapan layar + log kesalahan untuk Bab III. Dijalankan manual saat pengembangan.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:4199/';
const out = resolve(process.env.E2E_OUTPUT_DIR ?? '../.dev-cache/test-artifacts/explore7'); mkdirSync(out, { recursive: true });
const errors = [], failed = [];
const settle = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const shot = async (page, name) => { await settle(page); await page.screenshot({ path: resolve(out, `${name}.png`) }); console.log('shot', name); };
const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge', headless: true });
const [width, height] = (process.env.E2E_VIEW ?? '1366x768').split('x').map(Number);
const context = await browser.newContext({ viewport: { width, height } });
await context.addInitScript(() => localStorage.setItem('tfbt.settings.v1', JSON.stringify({ schema: 'settings_v1', values: { text_speed: 'instant', screen_shake: false, reduced_flashes: true } })));
const page = await context.newPage();
page.on('pageerror', e => errors.push('pageerror ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('requestfailed', r => failed.push(`${r.url()} ${r.failure()?.errorText}`)); page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
const stage = process.env.STAGE ?? 'start';
await page.goto(BASE + '?qa=1'); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'));
await page.evaluate(([s, b]) => window.__tfbt.qa.chapter3(s, b), [stage, process.env.BATTLE || undefined]);
await page.waitForTimeout(2500);
await shot(page, `${stage}_${process.env.BATTLE ?? 'world'}_a`);
await page.waitForTimeout(Number(process.env.WAIT ?? 4000));
await shot(page, `${stage}_${process.env.BATTLE ?? 'world'}_b`);
console.log(JSON.stringify({ scenes: await page.evaluate(() => window.__tfbt.activeScenes()), world: await page.evaluate(() => { const w = window.__tfbt.world(); return w && { area: w.area, objective: w.objective, dialogue: w.dialogue }; }) }));
console.log('errors', errors.slice(0, 10), 'failed', failed.slice(0, 10));
await browser.close();
