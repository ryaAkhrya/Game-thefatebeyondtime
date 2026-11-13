import { press, selectMenu } from './battle-helpers.mjs';
export const state = page => page.evaluate(() => window.__tfbt.state());
export async function waitWorld(page) {
  try {
    await page.waitForFunction(() => { const w = window.__tfbt?.world(); return w && !w.busy && !w.dialogue && window.__tfbt.inputLayer() === 'world'; }, null, { timeout: 15000 });
  } catch (error) {
    const snapshot = await page.evaluate(() => {
      const api=window.__tfbt, w=api?.world(), d=api?.state();
      return { scenes:api?.activeScenes(), layer:api?.inputLayer(), focus:api?.focus(), router:api?.router(), transition:api?.transition()?.mode,
        state:d&&{chapter:d.chapter,area:d.area,beat:d.storyBeat,ending:d.ending}, world:w&&{area:w.area,busy:w.busy,x:w.x,y:w.y,dialogue:w.dialogue?.line} };
    }).catch(()=>null);
    throw new Error(`World readiness timeout: ${JSON.stringify(snapshot)}`, {cause:error});
  }
}
export async function openPause(page) { await press(page, 'Escape'); await page.waitForFunction(() => window.__tfbt.inputLayer() === 'pause'); }
export async function openMenu(page, id, layer = 'rpg-menu') { await selectMenu(page, id); await press(page, 'Enter'); await page.waitForFunction(layer => window.__tfbt.inputLayer() === layer, layer); }
export async function back(page, layer) { await press(page, 'Escape'); await page.waitForFunction(layer => window.__tfbt.inputLayer() === layer, layer); }
export async function layout(page, check, label) { const issues = await page.evaluate(() => window.__tfbt.layoutIssues()); check(`Phase 3 layout ${label}`, issues.length === 0, issues.join(';')); }

/** Continues the real keyboard-only Title -> story -> victory journey; no QA teleport or seeded save. */
export async function persistenceJourney(page, check, shot, journey) {
  await waitWorld(page);
  let d = await state(page);
  check('Hollowling grants EXP/gold once and level 2 with one skill point', d.rpg.characters.C01.exp === 25 && d.rpg.characters.C01.level === 2 && d.rpg.gold === 8 && d.rpg.characters.C01.skillPoints === 1);
  check('Victory autosaves only after post-battle dialogue finishes', await page.evaluate(() => { const e = JSON.parse(localStorage.getItem('tfbt.save.v1.auto')); return e?.schema === 'save_v2' && e.data.flags['c1.hollowling_victory_seen'] && e.data.rpg.characters.C01.exp === 25 && window.__tfbt.saveStatus().safe; }));
  await openPause(page); await layout(page, check, 'Pause');
  await openMenu(page, 'status'); await shot(page, 'phase3_status'); await layout(page, check, 'Status');
  check('Status reads the same character stats used by combat', await page.evaluate(() => window.__tfbt.stats().HP === 108 && window.__tfbt.stats().ATK === 23));
  await back(page, 'pause'); await openMenu(page, 'inventory');
  await shot(page, 'phase3_inventory'); await layout(page, check, 'Inventaris');
  const inventoryBefore = JSON.stringify((await state(page)).items);
  await press(page, 'Enter');
  check('Equipment in Inventory cannot be consumed as a Potion', JSON.stringify((await state(page)).items) === inventoryBefore);
  const frozen = await page.evaluate(() => window.__tfbt.world()); await press(page, 'ArrowRight', 3);
  check('RPG menu input does not move the paused world', await page.evaluate(w => window.__tfbt.world().x === w.x && window.__tfbt.world().y === w.y, frozen));
  await back(page, 'pause'); await openMenu(page, 'skills');
  await selectMenu(page, 'heavy_grip'); await press(page, 'Enter');
  d = await state(page);
  check('Skill Tree opens DRAFT heavy passive with exactly one point', d.rpg.characters.C01.skillPoints === 0 && d.rpg.characters.C01.unlockedSkills.includes('heavy_grip') && await page.evaluate(() => window.__tfbt.stats().ATK === 25));
  await press(page, 'Enter'); await selectMenu(page, 'firm_stance'); await press(page, 'Enter');
  check('Duplicate/insufficient-point skill unlock cannot spend more or unlock another branch', (await state(page)).rpg.characters.C01.skillPoints === 0 && !(await state(page)).rpg.characters.C01.unlockedSkills.includes('firm_stance'));
  await shot(page, 'phase3_skills'); await layout(page, check, 'Jurus');
  await back(page, 'pause'); await openMenu(page, 'equipment');
  await selectMenu(page, 'armor:none'); await press(page, 'Enter');
  check('Unequip changes DEF immediately without consuming the equipment', await page.evaluate(() => window.__tfbt.stats().DEF === 7 && window.__tfbt.state().items.travel_coat === 1 && window.__tfbt.state().rpg.characters.C01.equipment.armor === null));
  await shot(page, 'phase3_equipment'); await layout(page, check, 'Perlengkapan');
  await back(page, 'pause'); await openMenu(page, 'save', 'save-load');
  await selectMenu(page, 'slot1'); await press(page, 'Enter');
  await page.waitForFunction(() => localStorage.getItem('tfbt.save.v1.slot1'));
  const beforeOverwrite = await page.evaluate(() => localStorage.getItem('tfbt.save.v1.slot1'));
  await press(page, 'Enter');
  check('Overwrite confirmation defaults to Batal', await page.evaluate(() => window.__tfbt.focus() === 'menu:cancel'));
  await press(page, 'Enter');
  check('Batal leaves the existing save byte-identical', await page.evaluate(raw => localStorage.getItem('tfbt.save.v1.slot1') === raw, beforeOverwrite));
  await press(page, 'Enter'); await press(page, 'ArrowDown'); await press(page, 'Enter');
  check('Confirmed overwrite writes a backup of the prior valid slot', await page.evaluate(raw => localStorage.getItem('tfbt.save.v1.slot1.backup') === raw, beforeOverwrite));
  for (const slot of ['slot2', 'slot3']) { await selectMenu(page, slot); await press(page, 'Enter'); }
  check('All three manual slots and autosave exist independently', await page.evaluate(() => ['auto', 'slot1', 'slot2', 'slot3'].every(s => JSON.parse(localStorage.getItem(`tfbt.save.v1.${s}`))?.schema === 'save_v2')));
  await shot(page, 'phase3_save'); await layout(page, check, 'Simpan');
  const expected = await page.evaluate(() => JSON.parse(localStorage.getItem('tfbt.save.v1.slot3')).data);
  const settingsBefore = await page.evaluate(() => window.__tfbt.settings());
  await page.reload(); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene')); await page.waitForTimeout(200);
  await selectMenu(page, 'continue'); await press(page, 'Enter'); await waitWorld(page);
  d = await state(page);
  check('Refresh -> Continue restores position, facing, HP/MP, equipment, skills, EXP and gold', JSON.stringify(d.position) === JSON.stringify(expected.position) && JSON.stringify(d.vitals) === JSON.stringify(expected.vitals) && JSON.stringify(d.rpg) === JSON.stringify(expected.rpg) && JSON.stringify(d.items) === JSON.stringify(expected.items));
  check('Continue restores Nambo, thicket, chest and completed encounter without replay', await page.evaluate(() => { const w = window.__tfbt.world(); return w.nambo.y === 458 && w.thicketOpen && w.chestOpen && w.flags['battle.first_hollowling'] && !w.dialogue && !window.__tfbt.battle(); }));
  check('Settings persist separately across gameplay save and browser refresh', JSON.stringify(await page.evaluate(() => window.__tfbt.settings())) === JSON.stringify(settingsBefore));
  await shot(page, 'phase3_continue_world');
  await openPause(page); await openMenu(page, 'save', 'save-load'); await press(page, 'ArrowRight');
  await selectMenu(page, 'slot1'); await press(page, 'Enter');
  check('Manual load also asks before replacing live progress', await page.evaluate(() => window.__tfbt.focus() === 'menu:cancel'));
  await press(page, 'ArrowDown'); await press(page, 'Enter'); await waitWorld(page);
  d = await state(page);
  check('Manual Load reconstructs the world with no double EXP/gold/Potion', d.rpg.characters.C01.exp === 25 && d.rpg.gold === 8 && d.items.potion === 0 && d.rpg.characters.C01.equipment.armor === null && d.flags['reward.c1_chest_potion.claimed']);
  const beforeMove = await page.evaluate(() => window.__tfbt.world().y);
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(250); await page.keyboard.up('ArrowDown');
  check('Loaded world has the world input layer and remains movable', await page.evaluate(y => window.__tfbt.inputLayer() === 'world' && window.__tfbt.world().y > y + 6, beforeMove));
  await journey.walkTo(page, 870, 242, { axisOrder: 'yx' }); await journey.face(page, 'ArrowUp'); await press(page, 'Enter');
  await page.waitForFunction(() => window.__tfbt.world()?.dialogue);
  const chest = await journey.playDialogue(page); await waitWorld(page);
  check('Reopening the saved chest gives only the empty dialogue, no second Potion', chest.some(line => line.line === 'C1-03-X002') && (await state(page)).items.potion === 0);
  await journey.walkTo(page, 832, 242); await journey.walkTo(page, 832, 55, { axisOrder: 'yx' });
  d = await state(page);
  check('Returning to the encounter after load cannot duplicate battle/reward', !await page.evaluate(() => window.__tfbt.battle()) && d.rpg.characters.C01.exp === 25 && d.rpg.gold === 8);
}
