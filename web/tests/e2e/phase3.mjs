import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { press, selectMenu } from './battle-helpers.mjs';
import { back, layout, openMenu, openPause, state, waitWorld } from './phase3-helpers.mjs';
const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:5173/';
const out = resolve('../.dev-cache/test-artifacts'); mkdirSync(out, { recursive: true });
const results = [], errors = [], failures = [], audio = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok ? ': ' + detail : ''}`); };
const shot = (page, name) => page.screenshot({ path: resolve(out, `p3_${name}.png`) });
function envelope() {
  const data = { schemaVersion: 1, chapter: 'I', area: 'forest_1', position: { x: 832, y: 100, facing: 'down' }, party: ['C01'], flags: { 'c1.intro_seen': true, 'story.c1_awake': true, 'story.c1_nambo': true, 'story.c1_loop': true, 'c1.loop_noticed': true, 'reward.c1_chest_potion.claimed': true }, items: { potion: 2 }, vitals: { hp: 55, mp: 8 }, playtimeSec: 120 };
  let h = 0x811c9dc5; for (const ch of JSON.stringify(data)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return JSON.stringify({ schema: 'save_v1', slot: 'slot1', savedAt: '2026-11-10T00:00:00.000Z', checksum: h.toString(16).padStart(8, '0'), data });
}
const oldSave = envelope();
const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge', headless: true });
console.log(`Phase 3 | Edge ${browser.version()} | ${BASE}`);
async function session({ width = 1366, height = 768, slots = {}, unavailable = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(({ slots, unavailable }) => {
    if (unavailable) { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }); return; }
    // Only seed a fresh context, never overwrite the slot again during the refresh test.
    if (!sessionStorage.getItem('p3_seeded')) {
      localStorage.setItem('tfbt.settings.v1', JSON.stringify({ schema: 'settings_v1', values: { master_volume: 100, bgm_volume: 70, sfx_volume: 80, mute_all: false, text_speed: 'instant', fullscreen: false, screen_scale: 'pixel_perfect', screen_shake: false, reduced_flashes: true } }));
      for (const [slot, raw] of Object.entries(slots)) localStorage.setItem(`tfbt.save.v1.${slot}`, raw);
      sessionStorage.setItem('p3_seeded', '1');
    }
  }, { slots, unavailable });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', r => failures.push(`${r.url()} ${r.failure()?.errorText}`)); page.on('response', r => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); if (/\.(ogg|mp3|wav)(\?|$)/.test(r.url())) audio.push(r.url()); });
  await page.goto(BASE + '?qa=1'); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene')); await page.waitForTimeout(200);
  return { context, page };
}
async function skipDialogue(page) {
  for (let n = 0; n < 20; n++) { const w = await page.evaluate(() => window.__tfbt.world()); if (w && !w.busy && !w.dialogue) return; await page.waitForTimeout(650); await press(page, 'Enter'); }
  throw new Error('Dialogue did not finish');
}
async function continueGame(page) { await selectMenu(page, 'continue'); await press(page, 'Enter'); await waitWorld(page); }
async function newGame(page) { await selectMenu(page, 'new'); await press(page, 'Enter'); await page.waitForFunction(() => window.__tfbt.world()?.dialogue); await skipDialogue(page); await waitWorld(page); }
try {
  for (const [width, height] of [[1366, 768], [1920, 1080]]) {
    const { page, context } = await session({ width, height, slots: { slot1: oldSave } });
    await continueGame(page); let d = await state(page);
    check(`${width}: Continue migrates v1 without rewriting original slot`, d.schemaVersion === 2 && d.vitals.hp === 55 && d.vitals.mp === 8 && await page.evaluate(raw => localStorage.getItem('tfbt.save.v1.slot1') === raw, oldSave));
    check(`${width}: resumes safely before Hollowling, with NPC/chest/thicket state`, await page.evaluate(() => { const w = window.__tfbt.world(); return w.y === 100 && w.nambo.y === 458 && w.chestOpen && w.thicketOpen && !w.flags['battle.first_hollowling'] && !window.__tfbt.battle(); }));
    await openPause(page); await layout(page, check, `Pause ${width}`);
    for (const kind of ['status', 'inventory', 'equipment', 'skills']) {
      await openMenu(page, kind); await shot(page, `${kind}_${width}`); await layout(page, check, `${kind} ${width}`);
      if (kind === 'inventory') {
        await selectMenu(page, 'potion'); await press(page, 'Enter'); d = await state(page);
        check(`${width}: Potion in world Inventory heals and consumes same stock`, d.vitals.hp === 91 && d.items.potion === 1);
      }
      if (kind === 'equipment') {
        await selectMenu(page, 'weapon:none'); await press(page, 'Enter');
        check(`${width}: equipment preview/action removes ATK bonus`, await page.evaluate(() => window.__tfbt.stats().ATK === 16 && window.__tfbt.state().items.yaric_greatsword === 1));
        await selectMenu(page, 'weapon:yaric_greatsword'); await press(page, 'Enter');
        check(`${width}: re-equip restores exact stats`, await page.evaluate(() => window.__tfbt.stats().ATK === 20));
      }
      if (kind === 'skills') { await selectMenu(page, 'heavy_grip'); await press(page, 'Enter'); check(`${width}: level-locked skill cannot unlock`, !(await state(page)).rpg.characters.C01.unlockedSkills.includes('heavy_grip')); }
      await back(page, 'pause');
    }
    await openMenu(page, 'save', 'save-load'); await selectMenu(page, 'slot2'); await press(page, 'Enter');
    check(`${width}: manual pre-encounter save stores HP/MP and consumed inventory`, await page.evaluate(() => { const e = JSON.parse(localStorage.getItem('tfbt.save.v1.slot2')); return e.data.vitals.hp === 91 && e.data.vitals.mp === 8 && e.data.items.potion === 1; }));
    await shot(page, `save_${width}`); await layout(page, check, `Save ${width}`);
    await page.reload(); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene')); await page.waitForTimeout(200); await continueGame(page);
    d = await state(page); check(`${width}: refresh Continue restores pre-encounter checkpoint`, d.position.y === 100 && d.items.potion === 1 && d.vitals.hp === 91 && !d.flags['battle.first_hollowling']);
    await page.keyboard.down('ArrowUp'); await page.waitForFunction(() => window.__tfbt.world()?.dialogue?.script === 'C1-04-INTRO'); await page.keyboard.up('ArrowUp'); await page.waitForTimeout(650); await press(page, 'Enter');
    await page.waitForFunction(() => window.__tfbt.battle()?.turn === 1 && !window.__tfbt.battle()?.locked);
    check(`${width}: saved checkpoint can enter actual battle with matching resources`, await page.evaluate(() => window.__tfbt.battle().actors[0].hp === 91 && window.__tfbt.battle().actors[0].mp === 8));
    const auto = await page.evaluate(() => localStorage.getItem('tfbt.save.v1.auto'));
    await openPause(page); await selectMenu(page, 'save'); await press(page, 'Enter');
    check(`${width}: battle cannot save an in-flight combat snapshot`, await page.evaluate(raw => window.__tfbt.inputLayer() === 'pause' && !window.__tfbt.saveStatus().safe && localStorage.getItem('tfbt.save.v1.auto') === raw, auto));
    await context.close();
  }
  // Shop harness is separate from the narrative; buy, sell, caps and key-item refusal use real UI.
  for (const [width, height] of [[1366, 768], [1920, 1080]]) {
    const { page, context } = await session({ width, height });
    await page.evaluate(() => window.__tfbt.qa.shop()); await page.waitForFunction(() => window.__tfbt.inputLayer() === 'shop');
    await selectMenu(page, 'potion'); await press(page, 'Enter');
    check(`${width}: shop buy is a real inventory/currency/stock transaction`, await page.evaluate(() => window.__tfbt.state().items.potion === 1 && window.__tfbt.state().rpg.gold === 36 && window.__tfbt.shop().stock.potion === 2));
    await press(page, 'ArrowRight'); await selectMenu(page, 'potion'); await press(page, 'Enter');
    check(`${width}: shop sell returns stock and gold exactly`, await page.evaluate(() => window.__tfbt.state().items.potion === 0 && window.__tfbt.state().rpg.gold === 42 && window.__tfbt.shop().stock.potion === 3));
    await selectMenu(page, 'qa_key'); const before = JSON.stringify(await state(page)); await press(page, 'Enter');
    check(`${width}: key item sale refused without state changes`, JSON.stringify(await state(page)) === before);
    await shot(page, `shop_${width}`); await layout(page, check, `Shop ${width}`);
    await back(page, 'title'); check(`${width}: shop has not inserted Derrria/NPC into Chapter I`, await page.evaluate(() => !window.__tfbt.world() && window.__tfbt.activeScenes().includes('TitleScene')));
    await context.close();
  }
  {
    const { page, context } = await session({ slots: { slot1: '{corrupt', 'slot1.backup': oldSave } }); await continueGame(page);
    check('Corrupt primary recovers a validated backup through Continue', (await state(page)).vitals.hp === 55); await context.close();
  }
  {
    const future = JSON.stringify({ schema: 'save_v99' }); const { page, context } = await session({ slots: { slot1: future, slot2: '{corrupt' } });
    await selectMenu(page, 'continue'); await press(page, 'Enter'); check('No valid save: Continue stays disabled without crash', await page.evaluate(() => window.__tfbt.activeScenes().includes('TitleScene')));
    await newGame(page); await openPause(page); await openMenu(page, 'save', 'save-load'); await selectMenu(page, 'slot1'); await press(page, 'Enter');
    check('Future version stays protected from overwrite', await page.evaluate(raw => localStorage.getItem('tfbt.save.v1.slot1') === raw, future));
    await press(page, 'ArrowRight'); await selectMenu(page, 'slot2'); await press(page, 'Enter');
    check('Corrupt load slot is inactive', await page.evaluate(() => window.__tfbt.inputLayer() === 'save-load' && window.__tfbt.focus() === 'menu:slot2'));
    await shot(page, 'invalid_slots'); await layout(page, check, 'Invalid saves'); await context.close();
  }
  {
    const { page, context } = await session({ unavailable: true }); await newGame(page); await openPause(page); await openMenu(page, 'save', 'save-load'); await selectMenu(page, 'slot1'); await press(page, 'Enter');
    check('Storage unavailable gives inactive save UI while memory gameplay works', await page.evaluate(() => !window.__tfbt.persistent() && window.__tfbt.state().flags['c1.intro_seen'] && window.__tfbt.inputLayer() === 'save-load'));
    await shot(page, 'storage_unavailable'); await layout(page, check, 'Storage unavailable'); await context.close();
  }
  {
    const { page, context } = await session({ slots: { slot1: oldSave } }); await continueGame(page);
    await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v) { if (k.startsWith('tfbt.save.')) throw new DOMException('Quota', 'QuotaExceededError'); return original.call(this, k, v); }; });
    await openPause(page); await openMenu(page, 'save', 'save-load'); await selectMenu(page, 'slot1'); await press(page, 'Enter'); await press(page, 'ArrowDown'); await press(page, 'Enter');
    check('Quota error preserves old slot and reports save failure', await page.evaluate(raw => localStorage.getItem('tfbt.save.v1.slot1') === raw && window.__tfbt.saveStatus().message.includes('Gagal'), oldSave));
    await shot(page, 'quota_error'); await layout(page, check, 'Quota error'); await context.close();
  }
  check('Phase 3: no JavaScript/console errors', errors.length === 0, errors.join(';'));
  check('Phase 3: no failed asset requests', failures.length === 0, failures.join(';'));
  check('Phase 3: no audio requests', audio.length === 0, audio.join(';'));
} catch (e) { check('Phase 3 execution', false, String(e.stack ?? e)); }
finally { await browser.close(); }
writeFileSync(resolve(out, 'e2e-phase3-report.json'), JSON.stringify({ when: new Date().toISOString(), base: BASE, total: results.length, failed: results.filter(r => !r.ok).length, results }, null, 2));
console.log(`${results.filter(r => r.ok).length}/${results.length} Phase 3 passed`); process.exitCode = results.some(r => !r.ok) ? 1 : 0;
