import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { press, ready, selectMenu } from './battle-helpers.mjs';
import { back, openMenu, openPause, waitWorld } from './phase3-helpers.mjs';
import { faceCity, finishCityDialogue } from './phase5-helpers.mjs';
import { loadSlot, refreshContinue, saveSlot, walk } from './phase4-helpers.mjs';

const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:5173/';
const out = resolve(process.env.E2E_OUTPUT_DIR ?? '../.dev-cache/test-artifacts'); mkdirSync(out, { recursive: true });
const results = [], errors = [], requests = [], audio = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok ? ': ' + detail : ''}`); };
const shot = async (page, name) => { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await page.screenshot({ path: resolve(out, `p6_${name}.png`) }); };
const world = page => page.evaluate(() => window.__tfbt.world());
const state = page => page.evaluate(() => window.__tfbt.state());
const move = async (page, x, y, facing) => { await page.evaluate(([x,y]) => window.__tfbt.qa.teleport(x,y), [x,y]); await faceCity(page, facing); };
const interact = async (page, id) => { await page.waitForFunction(id => window.__tfbt.world()?.target === id, id, { timeout: 5000 }); await press(page, 'Enter'); };
async function dialogueUntil(page, stop) {
  const lines = new Set();
  for (let n = 0; n < 220; n++) {
    if (await stop()) return [...lines];
    const d = (await world(page))?.dialogue;
    if (!d) { await page.waitForTimeout(100); continue; }
    lines.add(d.line);
    if (d.state === 'choice') await press(page, 'Enter');
    else { await page.waitForTimeout(650); await press(page, 'Enter'); }
  }
  throw Error('Dialogue did not reach destination');
}
async function battleToVictory(page) {
  for (let turn = 0; turn < 70; turn++) {
    await ready(page);
    const b = await page.evaluate(() => window.__tfbt.battle());
    if (b.outcome) return b;
    const actor = b.actors.find(a => a.id === b.order[b.cursor]);
    const enemy = b.actors.find(a => a.side === 'enemy' && a.hp > 0);
    let skill = null;
    if (actor.id === 'C03' && actor.mp >= 3) skill = 'ranting_nakal';
    if (actor.id === 'C01' && actor.mp >= 4) skill = 'ground_slam';
    if (skill) { await selectMenu(page, 'skill'); await press(page, 'Enter'); await selectMenu(page, skill); await press(page, 'Enter'); }
    else { await selectMenu(page, 'attack'); await press(page, 'Enter'); }
    if (await page.evaluate(() => window.__tfbt.battle()?.menu === 'target')) { await selectMenu(page, enemy.id); await press(page, 'Enter'); }
  }
  throw Error('Battle exceeded turn guard');
}

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge', headless: true });
console.log(`Phase 6 | ${process.env.E2E_CHANNEL ?? 'msedge'} ${browser.version()} | ${BASE}`);
let page;
try {
  for (const [width, height] of [[1366, 768], [1920, 1080]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => localStorage.setItem('tfbt.settings.v1', JSON.stringify({ schema: 'settings_v1', values: { text_speed: 'instant', screen_shake: false, reduced_flashes: true } })));
    page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('requestfailed', r => requests.push(`${r.url()} ${r.failure()?.errorText}`));
    page.on('response', r => { if (r.status() >= 400) requests.push(`${r.status()} ${r.url()}`); if (/\.(ogg|wav|mp3)(\?|$)/.test(r.url()) && !/\/audio\/sfx\//.test(r.url())) audio.push(r.url()); });
    await page.goto(BASE + '?qa=1'); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'));
    await page.evaluate(() => window.__tfbt.qa.chapter1Complete());
    await page.waitForFunction(()=>window.__tfbt.state().chapter==='II'&&window.__tfbt.inputLayer()==='world'); await waitWorld(page);
    await openPause(page); await openMenu(page, 'save', 'save-load'); await saveSlot(page, 'slot1'); await back(page, 'pause'); await back(page, 'world');
    check(`${width}: Bab II starts from completed Chapter I`, (await state(page)).chapter === 'II' && (await world(page)).area === 'aveloria');
    await shot(page, `${width}_start`);
    await interact(page, 'azie'); const azie = await finishCityDialogue(page); await waitWorld(page);
    check(`${width}: Azie source dialogue and departure`, azie.filter(d => d.line?.startsWith('C2-01-L')).length === 10 && (await state(page)).flags['story.c2_depart']);
    await move(page, 648, 552, 'right'); await interact(page, 'velthia'); const farewell = await finishCityDialogue(page); await waitWorld(page);
    check(`${width}: Velthia farewell and letter`, farewell.filter(d => d.line?.startsWith('C2-02-L')).length === 12 && (await state(page)).flags['story.c2_farewell']);
    await move(page, 640, 1336, 'down'); await interact(page, 'liora_exit'); await page.waitForFunction(() => window.__tfbt.world()?.area === 'liora'); await waitWorld(page);
    await shot(page, `${width}_liora`);
    await walk(page, 480, 360); await faceCity(page, 'up'); await interact(page, 'zira'); const zira = await finishCityDialogue(page); await waitWorld(page);
    check(`${width}: Zira preserves both accounts`, zira.filter(d => d.line?.startsWith('C2-03-L')).length === 16 && (await state(page)).flags['story.c2_zira']);
    await walk(page, 448, 360); await walk(page, 448, 152); await walk(page, 480, 152); await faceCity(page, 'up');
    await interact(page, 'liora_to_forest'); await page.waitForFunction(() => window.__tfbt.world()?.area === 'forest_2'); await waitWorld(page);
    await shot(page, `${width}_forest2`);
    await walk(page, 280, 560); const shadow = await dialogueUntil(page, async () => !!(await state(page)).flags['c2.shadow_seen']); await waitWorld(page);
    check(`${width}: shadow cue follows forest entry`, shadow.includes('C2-04-L001'));
    await move(page, 352, 552, 'up'); await interact(page, 'forest2_marker'); await finishCityDialogue(page); await waitWorld(page);
    await walk(page, 684, 538); await faceCity(page, 'up'); await interact(page, 'torvan'); const torvan = await finishCityDialogue(page); await waitWorld(page);
    check(`${width}: Torvan joins only after full dialogue`, torvan.filter(d => d.line?.startsWith('C2-05-L')).length === 20 && (await state(page)).party.join() === 'C01,C03');
    await shot(page, `${width}_duo_world`);
    await openPause(page); await openMenu(page, 'status'); await press(page, 'ArrowRight');
    check(`${width}: Torvan status menu stays readable and shows separate vitals`, (await page.evaluate(() => window.__tfbt.layoutIssues())).length === 0 && (await state(page)).partyVitals.C03.mp > 0);
    await shot(page, `${width}_torvan_status`); await back(page, 'pause'); await back(page, 'world');
    await openPause(page); await openMenu(page, 'save', 'save-load'); await saveSlot(page, 'slot2'); await back(page, 'pause'); await back(page, 'world');
    const joined = await state(page); await refreshContinue(page);
    check(`${width}: saved duo reloads with both vitals, skills and Torvan follower`, await page.evaluate(before => { const now = window.__tfbt.state(); return now.party.join() === 'C01,C03' && JSON.stringify(now.partyVitals) === JSON.stringify(before.partyVitals) && JSON.stringify(now.rpg.characters.C03) === JSON.stringify(before.rpg.characters.C03) && window.__tfbt.world().chapter2.torvan.joined; }, joined));
    await walk(page, 784, 544); await dialogueUntil(page, async () => !!await page.evaluate(() => window.__tfbt.battle())); await ready(page);
    check(`${width}: tutorial uses two actors and two enemy types`, await page.evaluate(() => { const b = window.__tfbt.battle(); return b.encounter === 'duo_tutorial' && ['C01','C03','M01','M02'].every(id => b.actors.some(a => a.id === id)); }));
    check(`${width}: two-actor battle HUD stays inside screen`, (await page.evaluate(() => window.__tfbt.layoutIssues())).length === 0);
    await shot(page, `${width}_duo_battle`);
    let outcome = await battleToVictory(page); check(`${width}: duo battle won`, outcome.outcome === 'victory'); await press(page, 'Enter');
    await page.waitForFunction(() => window.__tfbt.world()?.area === 'forest_2'); await finishCityDialogue(page); await waitWorld(page);
    check(`${width}: duo reward committed once`, (await state(page)).flags['battle.duo_tutorial'] && (await state(page)).rpg.characters.C03.exp > 0);
    await move(page, 820, 392, 'up'); await interact(page, 'forest2_rest'); await waitWorld(page);
    check(`${width}: forest rest restores both party members without reward`, await page.evaluate(() => { const s = window.__tfbt.state(); return s.vitals.hp === s.rpg.characters.C01.baseStats.HP && s.vitals.mp === s.rpg.characters.C01.baseStats.MP && s.partyVitals.C03.hp === s.rpg.characters.C03.baseStats.HP && s.partyVitals.C03.mp === s.rpg.characters.C03.baseStats.MP && !s.flags['battle.forest2_patrol']; }));
    await move(page, 844, 444, 'up');
    const secondsSinceDuo = await page.evaluate(() => { const s = window.__tfbt.state(); return s.playtimeSec - s.world.lastChapter2EncounterSec; });
    if (secondsSinceDuo < 20) {
      await interact(page, 'forest2_patrol');
      check(`${width}: patrol respects the persisted 20-second cooldown`, !await page.evaluate(() => window.__tfbt.battle()) && !(await state(page)).flags['battle.forest2_patrol']);
      await page.waitForFunction(() => { const s = window.__tfbt.state(); return s.playtimeSec - s.world.lastChapter2EncounterSec >= 20; }, null, { timeout: 30000 });
    }
    await interact(page, 'forest2_patrol'); await ready(page);
    check(`${width}: optional patrol varies roster to M02 and M03`, await page.evaluate(() => window.__tfbt.battle().actors.map(a => a.id).join() === 'C01,C03,M02,M03'));
    const patrolBefore = await state(page);
    await selectMenu(page, 'run'); await press(page, 'Enter');
    await page.waitForFunction(() => window.__tfbt.battle()?.outcome === 'escaped' && window.__tfbt.battle()?.menu === 'result');
    await press(page, 'Enter'); await waitWorld(page);
    check(`${width}: escape returns to forest without flag or reward`, await page.evaluate(before => { const s = window.__tfbt.state(); return !s.flags['battle.forest2_patrol'] && s.rpg.gold === before.rpg.gold && s.rpg.characters.C03.exp === before.rpg.characters.C03.exp && window.__tfbt.world().area === 'forest_2'; }, patrolBefore));
    await move(page, 844, 444, 'up'); await interact(page, 'forest2_patrol'); await ready(page);
    outcome = await battleToVictory(page); await press(page, 'Enter'); await waitWorld(page);
    const patrolWon = await state(page);
    check(`${width}: patrol victory rewards both once and closes its marker`, outcome.outcome === 'victory' && patrolWon.flags['battle.forest2_patrol'] && patrolWon.rpg.characters.C03.exp === patrolBefore.rpg.characters.C03.exp + 18);
    await move(page, 844, 444, 'up'); await interact(page, 'forest2_patrol');
    check(`${width}: repeat patrol interaction never duplicates rewards`, !await page.evaluate(() => window.__tfbt.battle()) && (await state(page)).rpg.gold === patrolWon.rpg.gold);
    await waitWorld(page);
    await walk(page, 744, 400); await walk(page, 900, 400); await faceCity(page, 'up'); await interact(page, 'forest2_second_marker'); await finishCityDialogue(page); await waitWorld(page);
    await walk(page, 960, 400); await dialogueUntil(page, async () => !!await page.evaluate(() => window.__tfbt.battle())); await ready(page);
    check(`${width}: Veyrath boss begins with two party members`, await page.evaluate(() => { const b = window.__tfbt.battle(); return b.encounter === 'veyrath' && b.actors.some(a => a.id === 'B02') && b.actors.filter(a => a.side === 'player').length === 2; }));
    check(`${width}: Veyrath HUD stays inside screen`, (await page.evaluate(() => window.__tfbt.layoutIssues())).length === 0);
    await shot(page, `${width}_veyrath`);
    outcome = await battleToVictory(page); check(`${width}: Veyrath defeated`, outcome.outcome === 'victory'); await press(page, 'Enter');
    await page.waitForFunction(() => window.__tfbt.world()?.area === 'forest_2'); await finishCityDialogue(page); await waitWorld(page);
    check(`${width}: Veyrath stays defeated and opens the old route`, await page.evaluate(() => { const s = window.__tfbt.state(), w = window.__tfbt.world(); return s.flags['boss.veyrath'] && !w.chapter2.veyrathVisible && !w.chapter2.passageBlocked; }));
    await walk(page, 1092, 320); await faceCity(page, 'up'); await interact(page, 'fragment_a'); const a = await finishCityDialogue(page); await waitWorld(page);
    await move(page, 1148, 368, 'up'); await interact(page, 'fragment_b'); const b = await finishCityDialogue(page); await waitWorld(page);
    check(`${width}: both fragments commit in order`, a.length > 0 && b.length > 0 && (await state(page)).flags['story.c2_fragments']);
    await move(page, 1108, 440, 'up'); await interact(page, 'forest2_to_city'); await page.waitForFunction(() => window.__tfbt.world()?.area === 'aveloria'); await waitWorld(page);
    await move(page, 648, 552, 'right'); await interact(page, 'velthia'); const ending = await finishCityDialogue(page);
    await page.waitForFunction(() => window.__tfbt.state().chapter === 'III');
    check(`${width}: report flows into Chapter III without a confirmation card`, ending.filter(d => d.line?.startsWith('C2-09-L')).length === 15 && (await state(page)).flags['chapter.2_complete']);
    await page.waitForFunction(()=>!!window.__tfbt.world()?.dialogue); await finishCityDialogue(page); await waitWorld(page);
    await shot(page, `${width}_chapter3_arrival`);
    await openPause(page); await openMenu(page, 'save', 'save-load'); await saveSlot(page, 'slot3');
    await loadSlot(page, 'slot1');
    check(`${width}: early Chapter II slot restores solo party and its earlier branch`, (await state(page)).chapter === 'II' && (await state(page)).party.join() === 'C01' && !(await state(page)).flags['chapter.2_complete']);
    await openPause(page); await openMenu(page, 'save', 'save-load'); await loadSlot(page, 'slot3');
    check(`${width}: post-report slot resumes Chapter III without duplicate rewards`, (await state(page)).chapter === 'III' && (await state(page)).flags['chapter.2_complete'] && (await state(page)).party.join() === 'C01,C03');
    await context.close();
  }
} catch (error) {
  check('Phase 6 execution', false, String(error.stack ?? error));
  if (page && !page.isClosed()) { console.log(JSON.stringify(await page.evaluate(() => ({ world: window.__tfbt.world(), state: window.__tfbt.state(), input: window.__tfbt.inputLayer(), focus: window.__tfbt.focus(), battle: window.__tfbt.battle() })))); await shot(page, 'failure'); }
} finally { await browser.close(); }
check('Phase 6: no fatal JavaScript/console errors', errors.length === 0, errors.join('; '));
check('Phase 6: no failed asset requests', requests.length === 0, requests.join('; '));
check('Phase 6: no unprovided audio requested', audio.length === 0, audio.join('; '));
const failed = results.filter(r => !r.ok).length;
writeFileSync(resolve(out, 'e2e-phase6-report.json'), JSON.stringify({ when: new Date().toISOString(), base: BASE, browser: process.env.E2E_CHANNEL ?? 'msedge', version: browser.version(), total: results.length, failed, results }, null, 2));
console.log(`${results.length - failed}/${results.length} Phase 6 passed`); process.exitCode = failed ? 1 : 0;
