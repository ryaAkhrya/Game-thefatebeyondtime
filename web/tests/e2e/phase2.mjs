// Focused browser battle regressions. The full keyboard-only Title -> C1-04 journey is in phase1.mjs.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { battle, ready, press, command, selectMenu } from './battle-helpers.mjs';
const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:5173/';
const out = resolve('../.dev-cache/test-artifacts'); mkdirSync(out, { recursive: true });
const results = [], errors = [], failedRequests = [], audioRequests = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok ? ': ' + detail : ''}`); };
const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge', headless: true });
console.log(`Browser ${browser.version()} | ${BASE}`);
async function encounter(width = 1366, height = 768, values = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(values => {
    localStorage.setItem('tfbt.settings.v1', JSON.stringify({ schema: 'settings_v1', values: { master_volume: 100, bgm_volume: 70, sfx_volume: 80, mute_all: false, text_speed: 'instant', fullscreen: false, screen_scale: 'pixel_perfect', screen_shake: false, reduced_flashes: true, ...values } }));
  }, values);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) failedRequests.push(r.url()); if (/\.(ogg|wav|mp3)(\?|$)/.test(r.url())) audioRequests.push(r.url()); });
  page.on('requestfailed', r => { const detail = `${r.url()} ${r.failure()?.errorText}`; failedRequests.push(detail); console.log('REQUEST_FAILED', detail); });
  await page.goto(BASE + '?qa=1');
  await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'));
  await page.evaluate(() => window.__tfbt.qa.encounter()); await ready(page); await page.waitForTimeout(200);
  return { page, context };
}
const shot = (page, name) => page.screenshot({ path: resolve(out, `p2_${name}.png`) });
try {
  // Resolution, disabled commands, real skill effects and exhaustion.
  for (const [width, height, settings] of [[1366, 768, { screen_shake: false, reduced_flashes: true }], [1920, 1080, { screen_shake: true, reduced_flashes: false }]]) {
    const { page, context } = await encounter(width, height, settings);
    let b = await battle(page);
    check(`${width}: enemy left / player right / stable foot origin`, b.sprites.M01.x === 78 && b.sprites.C01.x === 244 && b.sprites.C01.originY === 95 / 96);
    let layout = await page.evaluate(() => window.__tfbt.layoutIssues());
    check(`${width}: idle text layout`, layout.length === 0, layout.join(';'));
    await shot(page, `idle_${width}`);
    // Full HP item cannot consume stock or a turn.
    await press(page, 'ArrowDown', 2); await press(page, 'Enter'); await press(page, 'Enter');
    b = await battle(page); check(`${width}: full HP Potion disabled, inventory untouched`, b.turn === 1 && b.items.potion === 1);
    await press(page, 'Escape');
    await command(page, 'ground_slam', false);
    await page.waitForFunction(() => window.__tfbt.battle()?.vfx.visible);
    await shot(page, `fracture_${width}`);
    await page.waitForFunction(() => window.__tfbt.battle()?.phase === 'impact');
    await shot(page, `impact_${width}`);
    await ready(page); b = await battle(page);
    const impact = b.impacts.find(i => i.command === 'ground_slam');
    check(`${width}: shake/flash settings applied to actual Ground Slam`, impact?.shake === settings.screen_shake && impact?.flash === !settings.reduced_flashes, JSON.stringify(impact));
    check(`${width}: vfx still deals damage with reduced effects`, b.actors[1].hp === 82 && b.actors[0].mp === 8);
    const frameNames = b.history.filter(h => h.actor === 'C01' && h.turn === 1).map(h => h.frame);
    check(`${width}: heavy sword windup and recovery, no spin loop`, frameNames.join(',') === 'anticipation,attack_windup,attack_contact,followthrough,recovery');
    check(`${width}: no pivot or position drift after impact`, b.sprites.C01.x === 244 && b.sprites.C01.footY === 130 && b.sprites.M01.x === 78 && b.sprites.M01.footY === 130);
    await command(page, 'ground_slam'); await command(page, 'ground_slam');
    b = await battle(page); check(`${width}: three casts spend exactly 12 MP`, b.actors[0].mp === 0 && b.actors[1].hp === 22);
    const turn = b.turn;
    await press(page, 'ArrowDown'); await press(page, 'Enter'); await press(page, 'Enter');
    b = await battle(page); check(`${width}: no MP skill visibly disabled, no turn consumed`, b.turn === turn && b.pending === null && b.actors[0].mp === 0);
    layout = await page.evaluate(() => window.__tfbt.layoutIssues()); check(`${width}: skill/feedback layout`, layout.length === 0, layout.join(';'));
    await shot(page, `no_mp_${width}`); await press(page, 'Escape');
    await command(page, 'attack'); await command(page, 'attack'); b = await battle(page);
    check(`${width}: victory after exhaustion, no negative HP/MP`, b.outcome === 'victory' && b.actors[1].hp === 0 && b.actors[0].mp === 0);
    await shot(page, `victory_${width}`);
    layout = await page.evaluate(() => window.__tfbt.layoutIssues()); check(`${width}: victory layout`, layout.length === 0, layout.join(';'));
    await press(page, 'ArrowDown'); await press(page, 'Enter');
    await page.waitForFunction(() => window.__tfbt.activeScenes().includes('TitleScene'));
    check(`${width}: result can return to Title`, await page.evaluate(() => window.__tfbt.inputLayer() === 'title'));
    await context.close();
  }
  // Genuine defeat from default checkpoint. Spend an item first, then deliberately defend until KO.
  {
    const { page, context } = await encounter();
    await command(page, 'attack'); await command(page, 'potion');
    let b = await battle(page);
    check('Defeat fixture: Potion actually consumed', b.items.potion === 0);
    for (let n = 0; n < 30 && !(await battle(page)).outcome; n++) await command(page, 'defend');
    b = await battle(page); check('Defeat reaches KO with 0 HP and retry menu', b.outcome === 'defeat' && b.actors[0].hp === 0 && b.menu === 'result');
    await shot(page, 'defeat');
    const layout = await page.evaluate(() => window.__tfbt.layoutIssues()); check('Defeat text fits', layout.length === 0, layout.join(';'));
    await press(page, 'Enter'); await ready(page); b = await battle(page);
    check('Retry restores valid pre-battle checkpoint including consumed Potion', b.turn === 1 && b.actors[0].hp === 96 && b.actors[0].mp === 12 && b.items.potion === 1 && b.actors[1].hp === 112 && b.outcome === null);
    await shot(page, 'retry');
    await command(page, 'ground_slam');
    check('Retry remains playable, no stale action callbacks', (await battle(page)).turn === 3 && (await battle(page)).actors[1].hp === 82);
    const before = await battle(page);
    await press(page, 'Escape'); await selectMenu(page, 'settings'); await press(page, 'Enter');
    await page.waitForFunction(() => window.__tfbt.inputLayer() === 'settings');
    await press(page, 'Escape'); await press(page, 'Escape');
    await page.waitForFunction(() => window.__tfbt.inputLayer() === 'battle');
    const after = await battle(page);
    check('Pause/Settings preserves retry battle turn, resources and actors', JSON.stringify(before.actors) === JSON.stringify(after.actors) && before.turn === after.turn);
    await press(page, 'Escape'); await selectMenu(page, 'title'); await press(page, 'Enter'); await press(page, 'ArrowDown'); await press(page, 'Enter');
    await page.waitForFunction(() => window.__tfbt.activeScenes().includes('TitleScene'));
    check('Battle pause -> Title stops battle and restores single title layer', await page.evaluate(() => !window.__tfbt.battle() && window.__tfbt.inputLayer() === 'title' && !window.__tfbt.activeScenes().includes('PauseScene')));
    check('No gameplay save written in Phase 2', await page.evaluate(() => !Object.keys(localStorage).some(k => k.startsWith('tfbt.save.'))));
    await context.close();
  }
  check('No browser JS/console errors', errors.length === 0, errors.join(';'));
  check('All assets load without 404/failed requests', failedRequests.length === 0, failedRequests.join(';'));
  check('No audio files requested; silent fallback', audioRequests.length === 0, audioRequests.join(';'));
} catch (e) { check('Phase 2 execution', false, String(e.stack ?? e)); }
finally { await browser.close(); }
writeFileSync(resolve(out, 'e2e-phase2-report.json'), JSON.stringify({ when: new Date().toISOString(), base: BASE, total: results.length, failed: results.filter(r => !r.ok).length, results }, null, 2));
console.log(`${results.filter(r => r.ok).length}/${results.length} passed`);
process.exitCode = results.some(r => !r.ok) ? 1 : 0;
