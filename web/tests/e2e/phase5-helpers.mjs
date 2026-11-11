import { press, selectMenu } from './battle-helpers.mjs';
import { back, openMenu, openPause, state, waitWorld } from './phase3-helpers.mjs';
import { loadSlot, refreshContinue, saveSlot, walk } from './phase4-helpers.mjs';

const world = page => page.evaluate(() => window.__tfbt.world());
export async function faceCity(page, direction) {
  const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[direction];
  await page.keyboard.down(key);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(direction => window.__tfbt.world()?.facing === direction, direction);
  await page.keyboard.up(key); await page.waitForTimeout(50);
}
async function interact(page, id) {
  await page.waitForFunction(id => window.__tfbt.world()?.target === id, id, { timeout: 4000 }); await press(page, 'Enter');
}
/** Observe actual rendered portraits/pages. Handles staged pauses and scene transitions, never seeds story outcomes. */
export async function finishCityDialogue(page, { check, shot, prefix = '', pauseAudience = false, choice = 0 } = {}) {
  const lines = [], keys = new Set(); let paused = false;
  for (let n = 0; n < 220; n++) {
    if (await page.evaluate(() => window.__tfbt.inputLayer() === 'slice-end' || window.__tfbt.inputLayer() === 'shop')) return lines;
    const w = await world(page); if (!w) { await page.waitForTimeout(100); continue; }
    if (!w.busy && !w.dialogue) return lines;
    const d = w.dialogue;
    if (!d) { await page.waitForTimeout(100); continue; }
    if (d.state === 'typing') { await press(page, 'Enter'); continue; }
    const key = `${d.line}:${d.page}`;
    if (!keys.has(key)) {
      keys.add(key); lines.push(d);
      const issues = await page.evaluate(() => window.__tfbt.layoutIssues());
      if (issues.length) throw Error(`Dialogue layout ${d.line}: ${issues.join('; ')}`);
      if (shot && ['C1-06-VISTA', 'C1-06-L003', 'C1-07-L003', 'C1-08-L003', 'C1-08-L013', 'C1-09-X001', 'C1-09-X002', 'C1-09-X008'].includes(d.script === 'C1-06-VISTA' ? d.script : d.line)) await shot(page, `${prefix}_${d.line}`);
    }
    if (pauseAudience && !paused && d.line === 'C1-08-L003') {
      paused = true;
      const auto = await page.evaluate(() => localStorage.getItem('tfbt.save.v1.auto'));
      await press(page, 'Escape'); await page.waitForFunction(() => window.__tfbt.inputLayer() === 'pause');
      await openMenu(page, 'save', 'save-load'); await selectMenu(page, 'slot1'); await press(page, 'Enter');
      check(`${prefix}: cutscene Save/Load renders above its paused caller`, await page.evaluate(() => window.__tfbt.visibleScenes().at(-1) === 'SaveLoadScene'));
      check(`${prefix}: city cutscene cannot overwrite a manual slot or autosave mid-dialogue`, await page.evaluate(raw => !window.__tfbt.saveStatus().safe && localStorage.getItem('tfbt.save.v1.auto') === raw, auto));
      await back(page, 'pause'); await openMenu(page, 'settings', 'settings'); await page.waitForTimeout(200);
      check(`${prefix}: Pause/Settings preserves the exact Velthia page and portrait`, (await world(page)).dialogue.line === d.line && (await world(page)).dialogue.portrait === d.portrait && await page.evaluate(() => window.__tfbt.visibleScenes().at(-1) === 'SettingsScene'));
      await back(page, 'pause'); await back(page, 'dialogue');
    }
    if (d.state === 'choice') { if (choice) await press(page, 'ArrowDown', choice); await press(page, 'Enter'); }
    else { await page.waitForTimeout(650); await press(page, 'Enter'); }
  }
  throw Error('City dialogue exceeded guard');
}
async function layout(page, check, name) { const issues = await page.evaluate(() => window.__tfbt.layoutIssues()); check(name, issues.length === 0, issues.join('; ')); }
async function saveFromWorld(page, slot) { await openPause(page); await openMenu(page, 'save', 'save-load'); await saveSlot(page, slot); await back(page, 'pause'); await back(page, 'world'); }
function sourceIds(lines, scene) { return [...new Set(lines.map(l => l.line).filter(id => id.startsWith(scene + '-L')))]; }

/** Reused by the unseeded Title journey and focused cross-browser fixtures. */
export async function aveloriaJourney(page, check, shot, { prefix = 'chapter1', focus = false, choice = 0 } = {}) {
  await waitWorld(page);
  await walk(page, 1312, 400); await faceCity(page, 'right'); await interact(page, 'slice_exit');
  await page.waitForFunction(() => window.__tfbt.inputLayer() === 'slice-end');
  await openMenu(page, 'aveloria', 'world');
  await page.waitForFunction(() => window.__tfbt.world()?.area === 'aveloria');
  await page.waitForFunction(() => window.__tfbt.world()?.dialogue?.script === 'C1-06-VISTA');
  const vista = await finishCityDialogue(page, { check, shot, prefix }); await waitWorld(page);
  check(`${prefix}: forest checkpoint leads to first Aveloria vista and a safe city spawn`, vista.some(l => l.script === 'C1-06-VISTA') && (await state(page)).area === 'aveloria' && (await state(page)).flags['c1.aveloria_vista']);
  check(`${prefix}: city is a safe zone with four original named NPC atlases and four working residents`, await page.evaluate(() => { const c = window.__tfbt.world().city; return c.safeZone && Object.keys(c.npcs).length === 4 && c.npcs.velthia.texture === 'C02_CITY_EXPLORE' && c.npcs.azie.originY === 46 / 48 && c.citizens.length === 4 && !window.__tfbt.battle(); }));
  await layout(page, check, `${prefix}: city HUD layout`); await shot(page, `${prefix}_gate`);
  const beforeWall = await world(page); await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(700); await page.keyboard.up('ArrowLeft');
  const stopped = await world(page);
  check(`${prefix}: approach collision stops at the road edge without leaving camera bounds`, stopped.x >= 600 && stopped.x < beforeWall.x && stopped.cam.x >= 0 && stopped.cam.y >= 0 && stopped.cam.x + stopped.cam.w <= stopped.cam.bw && stopped.cam.y + stopped.cam.h <= stopped.cam.bh);
  await walk(page, 640, stopped.y); await saveFromWorld(page, 'slot1');
  const gateSave = await state(page); await refreshContinue(page);
  check(`${prefix}: gate save/refresh restores position and does not replay the vista`, JSON.stringify((await state(page)).position) === JSON.stringify(gateSave.position) && !(await state(page)).flags['story.c1_gate'] && !(await world(page)).dialogue);
  await walk(page, 640, 1192); const gate = await finishCityDialogue(page, { check, shot, prefix }); await waitWorld(page);
  check(`${prefix}: Talric source encounter plays all 13 lines before granting entry`, sourceIds(gate, 'C1-06').length === 13 && (await state(page)).flags['story.c1_gate'] && gate.some(l => l.portrait === 'C06_SUSPICIOUS'));
  await walk(page, 640, 944); await shot(page, `${prefix}_plaza`);
  check(`${prefix}: gate opens into the main street and plaza without a random encounter`, (await world(page)).y < 950 && !await page.evaluate(() => window.__tfbt.battle()));
  check(`${prefix}: camera follows from the gate into the plaza within authored map bounds`, (await world(page)).cam.y < beforeWall.cam.y - 100 && (await world(page)).cam.x >= 0 && (await world(page)).cam.y + (await world(page)).cam.h <= (await world(page)).cam.bh);
  await walk(page, 640, 560); await page.keyboard.down('ArrowUp'); await page.waitForTimeout(2200); await page.keyboard.up('ArrowUp');
  check(`${prefix}: palace door blocks early audience without skipping Azie`, (await world(page)).y >= 440 && !(await state(page)).flags['story.c1_archive'] && !(await state(page)).flags['story.c1_velthia']);
  await walk(page, 640, 944);
  // Real shop with no QA stock injection. Two purchases, unaffordable attempt, one sale.
  await walk(page, 416, 944); await walk(page, 344, 944); await faceCity(page, 'up'); await interact(page, 'derrria');
  await finishCityDialogue(page, { check, shot, prefix }); await page.waitForFunction(() => window.__tfbt.inputLayer() === 'shop');
  const shopBefore = await state(page); await press(page, 'Enter', 2); const bought = await state(page); const stockBought = await page.evaluate(() => window.__tfbt.shop().stock.potion);
  check(`${prefix}: Derrria buys commit two Potions, 24 gold and two stock units together`, bought.items.potion === (shopBefore.items.potion ?? 0) + 2 && bought.rpg.gold === shopBefore.rpg.gold - 24 && stockBought === 3);
  await press(page, 'Enter'); check(`${prefix}: unaffordable purchase leaves inventory, gold and stock unchanged`, JSON.stringify((await state(page)).world.shops) === JSON.stringify(bought.world.shops) && (await state(page)).rpg.gold === bought.rpg.gold && (await state(page)).items.potion === bought.items.potion);
  await press(page, 'ArrowRight'); await selectMenu(page, 'potion'); await press(page, 'Enter'); const sold = await state(page);
  check(`${prefix}: selling updates shared inventory and returns exactly 6 gold and one stock unit`, sold.items.potion === bought.items.potion - 1 && sold.rpg.gold === bought.rpg.gold + 6 && sold.world.shops.derrria.potion === 4);
  await shot(page, `${prefix}_shop`); await layout(page, check, `${prefix}: Shop layout`); await back(page, 'world');
  await walk(page, 416, 944); await walk(page, 640, 944); await saveFromWorld(page, 'slot2'); const plaza = await state(page);
  await refreshContinue(page);
  check(`${prefix}: plaza save restores gold, stock, inventory and NPC outcomes`, JSON.stringify((await state(page)).world.shops) === JSON.stringify(plaza.world.shops) && (await state(page)).rpg.gold === plaza.rpg.gold && JSON.stringify((await state(page)).items) === JSON.stringify(plaza.items) && (await world(page)).city.npcs.talric.x === 848);
  // Background citizen and real building/desk collision.
  await walk(page, 640, 1048); await walk(page, 736, 1048); await faceCity(page, 'up'); await interact(page, 'porter'); const resident = await finishCityDialogue(page);
  check(`${prefix}: unnamed working resident has short Indonesian dialogue and no named portrait`, resident.some(l => l.label === 'Pembawa peti' && l.portrait === ''));
  await walk(page, 640, 1048); await walk(page, 640, 840); await walk(page, 912, 840); await faceCity(page, 'up');
  const deskY = (await world(page)).y; await page.keyboard.down('ArrowUp'); await page.waitForTimeout(500); await page.keyboard.up('ArrowUp');
  check(`${prefix}: archive desk collision blocks walking through Azie's reports`, (await world(page)).y >= 824 && (await world(page)).y <= deskY);
  await interact(page, 'azie'); const archive = await finishCityDialogue(page, { check, shot, prefix }); await waitWorld(page);
  check(`${prefix}: Azie and Talric discuss The Fate only after gate clearance, all 11 source lines`, sourceIds(archive, 'C1-07').length === 11 && archive.some(l => l.portrait === 'C05_WORRIED') && (await state(page)).flags['story.c1_archive']);
  const archived = await state(page); await interact(page, 'azie'); const repeated = await finishCityDialogue(page);
  check(`${prefix}: repeat archive interaction does not repeat encounter, rewards or flags`, repeated.some(l => l.script === 'C1-07-REPEAT') && JSON.stringify((await state(page)).rpg) === JSON.stringify(archived.rpg));
  await walk(page, 640, (await world(page)).y); await walk(page, 640, 560); await shot(page, `${prefix}_courtyard`);
  await walk(page, 640, 304); const audience = await finishCityDialogue(page, { check, shot, prefix, pauseAudience: true, choice }); await waitWorld(page);
  check(`${prefix}: Velthia introduction preserves all 17 source lines and reaches a keyboard flavor choice`, sourceIds(audience, 'C1-08').length === 17 && audience.some(l => l.state === 'choice') && audience.some(l => l.line === `C1-08-CHOICE-${choice ? 'special' : 'offended'}`));
  check(`${prefix}: Velthia portraits show authority, humor, concern; Yaric reacts with embarrassment`, ['C02_STERN', 'C02_AMUSED', 'C02_WORRIED', 'C01_EMBARRASSED'].every(p => audience.some(l => l.portrait === p)));
  check(`${prefix}: audience changes objective and NPC placement without recruiting Velthia`, (await state(page)).flags['story.c1_velthia'] && JSON.stringify((await state(page)).party) === '["C01"]' && (await world(page)).city.npcs.velthia.y === 552 && !(await state(page)).flags['chapter.1_complete']);
  await shot(page, `${prefix}_audience_done`);
  if (focus) {
    // A refresh during a one-time event must roll back to the last committed safe checkpoint.
    await saveFromWorld(page, 'slot3');
    await walk(page, 640, 504); await page.waitForFunction(() => window.__tfbt.world()?.dialogue?.script === 'C1-09-FIRST');
    const safe = await page.evaluate(() => JSON.parse(localStorage.getItem('tfbt.save.v1.auto')).data);
    check(`${prefix}: first bell has no partial completion flag or autosave`, !safe.flags['chapter.1_complete'] && !await page.evaluate(() => window.__tfbt.saveStatus().safe));
    await refreshContinue(page);
    check(`${prefix}: refresh during bells resumes the committed audience checkpoint with no duplicate event`, (await state(page)).flags['story.c1_velthia'] && !(await state(page)).flags['chapter.1_complete'] && !(await world(page)).dialogue && (await world(page)).y < 400);
  }
  await walk(page, 640, 504); const bells = await finishCityDialogue(page, { check, shot, prefix });
  await page.waitForFunction(() => window.__tfbt.inputLayer() === 'slice-end');
  check(`${prefix}: both bell signals name the same hour with unchanged clock and no audio dependency`, bells.some(l => l.line === 'C1-09-X001') && bells.some(l => l.line === 'C1-09-X002') && (await world(page)).city.bellNumber === 2 && (await world(page)).city.clock === '21:00');
  check(`${prefix}: Velthia orders an investigation and keeps Yaric in town before Chapter I completes`, bells.some(l => l.line === 'C1-09-X008' && l.portrait === 'C02_STERN') && bells.some(l => l.line === 'C1-09-X010') && (await state(page)).flags['chapter.1_complete']);
  const ending = await state(page);
  check(`${prefix}: ending remains Chapter I, solo party, unchanged EXP and shop ledger`, ending.chapter === 'I' && ending.party.join() === 'C01' && ending.storyBeat === 'C1-DONE' && ending.rpg.characters.C01.exp === 70 && ending.world.shops.derrria.potion === 4);
  await shot(page, `${prefix}_ending`); await layout(page, check, `${prefix}: Chapter I ending layout`);
  await openMenu(page, 'save', 'save-load'); await saveSlot(page, 'slot3');
  check(`${prefix}: ending Save/Load is visibly above the opaque ending`, await page.evaluate(() => window.__tfbt.visibleScenes().at(-1) === 'SaveLoadScene'));
  await shot(page, `${prefix}_ending_save`); await back(page, 'slice-end');
  await openMenu(page, 'settings', 'settings');
  check(`${prefix}: ending Settings is visibly above the opaque ending`, await page.evaluate(() => window.__tfbt.visibleScenes().at(-1) === 'SettingsScene'));
  await shot(page, `${prefix}_ending_settings`); await back(page, 'slice-end'); await press(page, 'Escape'); await waitWorld(page);
  await refreshContinue(page);
  check(`${prefix}: ending save/Continue restores city position, night, NPCs, all flags and stock without replay`, JSON.stringify((await state(page)).position) === JSON.stringify(ending.position) && (await world(page)).city.evening && (await state(page)).flags['chapter.1_complete'] && (await state(page)).world.shops.derrria.potion === 4 && !(await world(page)).dialogue);
  await openPause(page); await openMenu(page, 'save', 'save-load'); await loadSlot(page, 'slot1');
  check(`${prefix}: old gate slot restores its entire earlier branch, no city shop stock or completed events`, !(await state(page)).flags['story.c1_gate'] && !(await state(page)).world.shops && !(await state(page)).flags['chapter.1_complete']);
  await openPause(page); await openMenu(page, 'save', 'save-load'); await loadSlot(page, 'slot3');
  check(`${prefix}: manual ending load restores outcomes without granting rewards twice`, (await state(page)).rpg.gold === ending.rpg.gold && (await state(page)).rpg.characters.C01.exp === 70 && (await state(page)).flags['chapter.1_complete']);
  await walk(page, 640, 528); await walk(page, 648, 552); await faceCity(page, 'right'); await interact(page, 'velthia');
  await page.waitForFunction(() => window.__tfbt.inputLayer() === 'slice-end');
  check(`${prefix}: ending can be reopened and has no playable Chapter II action`, await page.evaluate(() => window.__tfbt.state().chapter === 'I' && !Object.keys(window.__tfbt.state().flags).some(f => f.startsWith('story.c2'))));
}
