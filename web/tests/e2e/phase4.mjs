// Focused failure/accessibility/pose checks; phase1.mjs covers the unseeded complete journey.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { battle, command, press, ready, selectMenu } from './battle-helpers.mjs';
import { back, openMenu, openPause, state, waitWorld } from './phase3-helpers.mjs';
import { fightBoss, finishBossPrelude, refreshContinue, saveSlot, walk } from './phase4-helpers.mjs';
const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:5173/';
const out = resolve(process.env.E2E_OUTPUT_DIR ?? '../.dev-cache/test-artifacts'); mkdirSync(out, { recursive: true });
const results = [], errors = [], requests = [], audio = [], timings = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok ? ': ' + detail : ''}`); };
const shot = (page, name) => page.screenshot({ path: resolve(out, `p4_${name}.png`) });
async function layout(page, label) { const issues = await page.evaluate(() => window.__tfbt.layoutIssues()); check(`Layout ${label}`, issues.length === 0, issues.join(';')); }
const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge', headless: true });
const browserLabel = `${process.env.E2E_CHANNEL ?? 'msedge'} ${browser.version()} headless`;
console.log(`Phase 4 | ${browserLabel} | ${BASE}`);
async function session(width, height, settings = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(settings => {
    if (sessionStorage.getItem('p4_seeded')) return;
    localStorage.setItem('tfbt.settings.v1', JSON.stringify({ schema: 'settings_v1', values: { master_volume: 100, bgm_volume: 70, sfx_volume: 80, mute_all: false, text_speed: 'instant', fullscreen: false, screen_scale: 'pixel_perfect', screen_shake: false, reduced_flashes: true, ...settings } }));
    sessionStorage.setItem('p4_seeded', '1');
  }, settings);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', r => requests.push(`${r.url()} ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.status() >= 400) requests.push(`${r.status()} ${r.url()}`); if (/\.(ogg|wav|mp3)(\?|$)/.test(r.url())) audio.push(r.url()); });
  const start = Date.now(); await page.goto(BASE + '?qa=1'); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'));
  timings.push({ width, titleReadyMs: Date.now() - start });
  await page.waitForTimeout(250); await page.evaluate(() => window.__tfbt.qa.mournfang()); await waitWorld(page);
  return { page, context };
}
async function enterBoss(page) { await walk(page, 848, 400); await finishBossPrelude(page); }
async function finishAftermath(page) {
  for (let i = 0; i < 20; i++) {
    const w = await page.evaluate(() => window.__tfbt.world()); if (w && !w.busy && !w.dialogue) return;
    await page.waitForTimeout(650); await press(page, 'Enter');
  }
  throw new Error('Aftermath did not complete');
}
try {
  for (const [width, height, values] of [[1366, 768, {}], [1920, 1080, { screen_shake: true, reduced_flashes: false }]]) {
    const { page, context } = await session(width, height, values);
    await shot(page, `world_${width}`); await layout(page, `forest continuation ${width}`);
    await openPause(page); await openMenu(page, 'save', 'save-load'); await saveSlot(page, 'slot1'); await back(page, 'pause'); await back(page, 'world');
    await enterBoss(page); let b = await battle(page);
    check(`${width}: source B01 pose atlas loads with correct facing and stable origin`, b.encounter === 'mournfang' && b.sprites.B01.x === Math.round(0.244 * b.stage.w) && b.sprites.B01.originY === 92 / 96 && b.sprites.B01.footY === b.sprites.C01.footY);
    const auto = await page.evaluate(() => localStorage.getItem('tfbt.save.v1.auto'));
    check(`${width}: pre-boss autosave is full HP/MP outside encounter trigger`, await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('tfbt.save.v1.auto')).data; return d.position.x === 704 && d.position.y === 400 && d.area === 'forest_edge' && d.vitals.hp === 108 && d.vitals.mp === 14 && !d.flags['boss.mournfang']; }));
    await command(page, 'attack'); const injured = (await battle(page)).actors[0].hp; await command(page, 'potion'); b = await battle(page);
    check(`${width}: shared Potion heals actual boss damage and consumes exactly one`, injured === 95 && b.actors[0].hp === 108 && b.items.potion === 0 && b.actors[1].intent === 'sweep');
    const warned = JSON.stringify(b.actors); await openPause(page); await selectMenu(page, 'save'); await press(page, 'Enter');
    check(`${width}: saving is blocked on boss telegraph, no storage write`, await page.evaluate(raw => window.__tfbt.inputLayer() === 'pause' && localStorage.getItem('tfbt.save.v1.auto') === raw, auto));
    await back(page, 'battle'); check(`${width}: telegraph survives Pause without changing combat`, JSON.stringify((await battle(page)).actors) === warned);
    await shot(page, `telegraph_${width}`); await layout(page, `boss telegraph ${width}`);
    const hp = b.actors[0].hp; await command(page, 'defend'); b = await battle(page); const impact = b.impacts.find(i => i.command === 'boss_sweep');
    check(`${width}: heavy sweep has defense counterplay and actual accessibility effects`, hp - b.actors[0].hp === 13 && impact?.shake === (width === 1920) && impact?.flash === (width === 1920));
    await shot(page, `after_sweep_${width}`);
    if (width === 1366) {
      // Deliberately lose after spending an item and MP; the encounter checkpoint must restore both.
      await command(page, 'attack'); await command(page, 'attack'); await command(page, 'attack');
      await command(page, 'ground_slam'); b = await battle(page);
      check('Ground Slam interrupts a telegraph and cannot spend more than 4 MP', b.actors[0].mp === 10 && b.log.some(l => l.includes('Sapuan Mournfang gagal')));
      for (let n = 0; n < 45 && !(await battle(page)).outcome; n++) await command(page, 'defend');
      b = await battle(page); check('Boss defeat is reachable and preserves uncommitted GameState', b.outcome === 'defeat' && !(await state(page)).flags['boss.mournfang'] && (await state(page)).rpg.characters.C01.exp === 25 && (await state(page)).items.potion === 1);
      check('Defeat does not write a partial save or consume the checkpoint inventory', await page.evaluate(raw => localStorage.getItem('tfbt.save.v1.auto') === raw, auto));
      await shot(page, 'defeat'); await layout(page, 'boss defeat'); await press(page, 'Enter'); await ready(page); b = await battle(page);
      check('Retry restores full checkpoint HP/MP/Potion and restarts boss AI without rewards', b.turn === 1 && b.actors[0].hp === 108 && b.actors[0].mp === 14 && b.items.potion === 1 && b.actors[1].hp === 224 && b.actors[1].intent === 'strike' && (await state(page)).rpg.gold === 8);
      await command(page, 'attack', false); for (let n = 0; n < 6; n++) await page.keyboard.press('Enter', { delay: 5 }); await ready(page);
      b = await battle(page); check('Spam during attack cannot submit double turns or a stale retry action', b.turn === 3 && b.actors[1].hp === 206 && b.actors[0].hp === 95);
      b = await fightBoss(page); check('Retried boss remains winnable', b.outcome === 'victory');
      await shot(page, 'victory'); await layout(page, 'boss reward receipt');
      check('Hit and defeated poses play; boss and shadow retreat together', b.history.some(h => h.actor === 'B01' && h.frame === 'hit_recoil') && b.history.some(h => h.actor === 'B01' && h.frame === 'defeated') && b.sprites.B01.alpha === 0 && b.enemyShadow.alpha === 0);
      await press(page, 'Enter'); await page.waitForFunction(() => window.__tfbt.world()?.dialogue); await finishAftermath(page);
      const d = await state(page); check('Retry then victory commits one reward/loot and source aftermath once', d.rpg.characters.C01.exp === 70 && d.rpg.gold === 28 && d.items.potion === b.items.potion + 1 && d.flags['boss.mournfang'] && d.flags['c1.mournfang_victory_seen']);
      await shot(page, 'aftermath');
      await walk(page, 848, 400); check('Re-entering boss trigger after victory cannot retrigger or grant rewards', !await page.evaluate(() => window.__tfbt.battle()) && (await state(page)).rpg.gold === 28);
    } else {
      // Refresh in a live attack: loading must recover the safe world, not serialize combat.
      await command(page, 'attack', false); await page.reload(); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene')); await page.waitForTimeout(250);
      await selectMenu(page, 'continue'); await press(page, 'Enter'); await waitWorld(page);
      check('Refresh mid-combat resumes the pre-boss world with original resources', await page.evaluate(() => { const d = window.__tfbt.state(); return !window.__tfbt.battle() && d.position.x === 704 && d.vitals.hp === 108 && d.vitals.mp === 14 && d.items.potion === 1 && !d.flags['boss.mournfang']; }));
      await enterBoss(page); await openPause(page); await selectMenu(page, 'title'); await press(page, 'Enter'); await press(page, 'ArrowDown'); await press(page, 'Enter');
      await page.waitForFunction(() => window.__tfbt.inputLayer() === 'title');
      check('Boss Pause -> Title tears down the encounter and leaves one input layer', await page.evaluate(() => !window.__tfbt.battle() && !window.__tfbt.world() && window.__tfbt.activeScenes().includes('TitleScene')));
      await selectMenu(page, 'continue'); await press(page, 'Enter'); await waitWorld(page);
      check('Continue after abandoning boss has no double loot/EXP/cost', await page.evaluate(() => { const d = window.__tfbt.state(); return d.rpg.characters.C01.exp === 25 && d.rpg.gold === 8 && d.items.potion === 1 && d.vitals.hp === 108; }));
      await enterBoss(page); b = await fightBoss(page); check('1920 boss can complete with no compulsory grinding', b.outcome === 'victory');
      await press(page, 'Enter'); await page.waitForFunction(() => window.__tfbt.world()?.dialogue); await finishAftermath(page);
      await walk(page, 1312, 400); await press(page, 'ArrowRight');
      await page.waitForFunction(() => window.__tfbt.world()?.target === 'slice_exit');
      await press(page, 'Enter'); await page.waitForFunction(() => window.__tfbt.inputLayer() === 'slice-end');
      await shot(page, 'ending_1920'); await layout(page, 'ending 1920');
      const fixed = await page.evaluate(() => window.__tfbt.world().x); await press(page, 'ArrowRight', 3);
      check('Ending input cannot move the paused world', await page.evaluate(x => window.__tfbt.world().x === x, fixed));
      await openMenu(page, 'save', 'save-load'); await saveSlot(page, 'slot2'); await shot(page, 'ending_save_1920'); await layout(page, 'ending save 1920');
      await refreshContinue(page); check('Ending load preserves boss and slice flags without completing Chapter I', await page.evaluate(() => { const d = window.__tfbt.state(); return d.flags['boss.mournfang'] && d.flags['c1.vertical_slice_complete'] && !d.flags['chapter.1_complete'] && d.chapter === 'I'; }));
    }
    await context.close();
  }
  check('Phase 4: no fatal JavaScript/console errors', errors.length === 0, errors.join(';'));
  check('Phase 4: no failed assets or missing requests', requests.length === 0, requests.join(';'));
  check('Phase 4: no automatic audio requests', audio.length === 0, audio.join(';'));
} catch (e) { check('Phase 4 execution', false, String(e.stack ?? e)); }
finally { await browser.close(); }
writeFileSync(resolve(out, 'e2e-phase4-report.json'), JSON.stringify({ when: new Date().toISOString(), base: BASE, browser: browserLabel, total: results.length, failed: results.filter(r => !r.ok).length, timings, results }, null, 2));
console.log(`${results.filter(r => r.ok).length}/${results.length} Phase 4 passed`); process.exitCode = results.some(r => !r.ok) ? 1 : 0;
