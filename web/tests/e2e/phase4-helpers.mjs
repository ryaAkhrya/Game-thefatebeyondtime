import { battle, command, press, ready, selectMenu } from './battle-helpers.mjs';
import { back, openMenu, openPause, state, waitWorld } from './phase3-helpers.mjs';

export async function finishBossPrelude(page) {
  const lines = new Set();
  for (let n = 0; n < 80; n++) {
    if (await page.evaluate(() => !!window.__tfbt.battle())) { await ready(page); return [...lines]; }
    const d = await page.evaluate(() => window.__tfbt.world()?.dialogue);
    if (d) { lines.add(d.line); await page.waitForTimeout(650); await press(page, 'Enter'); }
    else await page.waitForTimeout(100);
  }
  throw new Error('Boss prelude did not reach battle');
}
export async function walk(page, tx, ty) {
  for (const axis of ['x', 'y']) {
    for (let tries = 0; tries < 500; tries++) {
      const w = await page.evaluate(() => window.__tfbt.world());
      if (!w || w.busy || w.dialogue) return;
      const distance = (axis === 'x' ? tx - w.x : ty - w.y);
      if (Math.abs(distance) <= 4) break;
      const key = axis === 'x' ? distance > 0 ? 'ArrowRight' : 'ArrowLeft' : distance > 0 ? 'ArrowDown' : 'ArrowUp';
      await page.keyboard.down(key); await page.waitForTimeout(Math.min(100, Math.abs(distance) / 0.088)); await page.keyboard.up(key);
      if (tries === 499) throw new Error(`Blocked path ${tx},${ty}`);
    }
  }
}
export async function saveSlot(page, slot) {
  await selectMenu(page, slot); await press(page, 'Enter');
  if (await page.evaluate(() => window.__tfbt.focus() === 'menu:cancel')) { await press(page, 'ArrowDown'); await press(page, 'Enter'); }
}
export async function loadSlot(page, slot) {
  await press(page, 'ArrowRight'); await selectMenu(page, slot); await press(page, 'Enter'); await press(page, 'ArrowDown'); await press(page, 'Enter'); await waitWorld(page);
}
export async function refreshContinue(page) {
  await page.reload(); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene')); await page.waitForTimeout(250);
  await selectMenu(page, 'continue'); await press(page, 'Enter'); await waitWorld(page);
}
export async function fightBoss(page, limit = 35) {
  for (let n = 0; n < limit; n++) {
    const b = await battle(page); if (b.outcome) return b;
    const p = b.actors[0], enemy = b.actors[1];
    await command(page, enemy.intent === 'sweep' ? p.mp >= 4 ? 'ground_slam' : 'defend' : p.hp < 35 && b.items.potion > 0 ? 'potion' : 'attack');
  }
  throw new Error('Boss fight exceeded action limit');
}
async function checkLayout(page, check, label) { const issues = await page.evaluate(() => window.__tfbt.layoutIssues()); check(`Phase 4 layout: ${label}`, issues.length === 0, issues.join(';')); }

/** Extends the actual Title -> Hollowling -> RPG/save journey. No QA teleport or seeded game data. */
export async function verticalSliceJourney(page, check, shot, journey) {
  const started = Date.now();
  await waitWorld(page); await journey.face(page, 'ArrowUp');
  check('North exit is an explicit keyboard interaction after Hollowling', await page.evaluate(() => window.__tfbt.world().target?.startsWith('forest_exit')));
  await press(page, 'Enter'); await page.waitForFunction(() => window.__tfbt.world()?.area === 'forest_edge'); await waitWorld(page);
  check('Forest continuation restores the same RPG state without adding another NPC', await page.evaluate(() => { const w = window.__tfbt.world(), d = window.__tfbt.state(); return w.nambo === null && d.rpg.characters.C01.exp === 25 && d.rpg.gold === 8 && d.items.potion === 0; }));
  await shot(page, 'phase4_edge_entry');
  await journey.walkTo(page, 480, 656); await journey.walkTo(page, 480, 400, { axisOrder: 'yx' }); await journey.walkTo(page, 760, 400);
  await page.waitForFunction(() => window.__tfbt.world()?.dialogue?.script === 'C1-05-CHECKPOINT'); await journey.playDialogue(page); await waitWorld(page);
  check('Safe checkpoint restores HP/MP without granting Potion/EXP/gold', await page.evaluate(() => { const d = window.__tfbt.state(); return d.vitals.hp === 108 && d.vitals.mp === 14 && d.items.potion === 0 && d.rpg.gold === 8 && d.flags['checkpoint.c1_before_mournfang']; }));
  await shot(page, 'phase4_checkpoint'); await checkLayout(page, check, 'checkpoint');
  await openPause(page); await openMenu(page, 'save', 'save-load'); await saveSlot(page, 'slot2');
  await refreshContinue(page);
  check('Refresh/Continue before boss preserves area, checkpoint, gear and passive', await page.evaluate(() => { const d = window.__tfbt.state(); return d.area === 'forest_edge' && !d.flags['boss.mournfang'] && d.vitals.hp === 108 && d.vitals.mp === 14 && d.rpg.characters.C01.unlockedSkills.includes('heavy_grip') && d.rpg.characters.C01.equipment.armor === null; }));
  await journey.walkTo(page, 848, 400); const prelude = await finishBossPrelude(page);
  check('C1-05 uses both source lines in order before actual boss battle', prelude.includes('C1-05-L001') && prelude.includes('C1-05-L002'));
  let b = await battle(page); const auto = await page.evaluate(() => localStorage.getItem('tfbt.save.v1.auto'));
  check('Boss entry has full checkpoint resources and a distinct B01 roster', b.encounter === 'mournfang' && b.actors[1].id === 'B01' && b.actors[1].stats.HP === 224 && b.actors[0].hp === 108 && b.actors[0].mp === 14);
  await shot(page, 'phase4_boss_idle'); await checkLayout(page, check, 'boss idle');
  await command(page, 'attack'); await command(page, 'attack'); b = await battle(page);
  check('Boss telegraph leaves a complete actionable player turn', b.actors[1].intent === 'sweep' && !b.locked && b.menu === 'main' && b.actors[b.order[b.cursor] === 'C01' ? 0 : 1].side === 'player');
  await shot(page, 'phase4_boss_telegraph'); await checkLayout(page, check, 'boss telegraph');
  const warned = JSON.stringify(b.actors);
  await openPause(page); await openMenu(page, 'settings', 'settings'); await back(page, 'pause'); await back(page, 'battle');
  check('Pause/Settings preserves the telegraphed attack and all resources', JSON.stringify((await battle(page)).actors) === warned);
  const hp = (await battle(page)).actors[0].hp; await command(page, 'defend'); b = await battle(page);
  check('Defend counters heavy sweep; reduced effects keep hit damage and warning readable', hp - b.actors[0].hp === 14 && b.impacts.some(i => i.command === 'boss_sweep' && !i.shake && !i.flash));
  await command(page, 'attack'); await command(page, 'attack'); await command(page, 'attack');
  const before = await battle(page); await command(page, 'ground_slam', false); await page.waitForFunction(() => window.__tfbt.battle()?.vfx.visible); await shot(page, 'phase4_boss_ground_slam'); await ready(page); b = await battle(page);
  check('Ground Slam breaks a charged sweep exactly once with 4 MP', b.actors[0].mp === before.actors[0].mp - 4 && b.actors[0].hp === before.actors[0].hp && b.log.some(l => l.includes('Sapuan Mournfang gagal')));
  b = await fightBoss(page);
  check('Mournfang can be defeated solo without grinding or any Potion', b.outcome === 'victory' && b.actors[0].hp > 0 && b.items.potion === 0);
  check('No reward/save is committed during animation or result screen', await page.evaluate(raw => !window.__tfbt.state().flags['boss.mournfang'] && window.__tfbt.state().rpg.characters.C01.exp === 25 && localStorage.getItem('tfbt.save.v1.auto') === raw, auto));
  await shot(page, 'phase4_boss_victory'); await checkLayout(page, check, 'boss victory');
  await press(page, 'Enter'); await page.waitForFunction(() => window.__tfbt.world()?.dialogue?.script === 'C1-05-VICTORY'); const post = await journey.playDialogue(page); await waitWorld(page);
  check('Victory returns to the source tragic aftermath, not a Chapter I completion', post.some(l => l.line === 'C1-05-L003') && post.some(l => l.line === 'C1-05-L004') && !(await state(page)).flags['chapter.1_complete']);
  check('Boss rewards commit once: total 70 EXP, level 3, 28 gold, one Potion', await page.evaluate(() => { const d = window.__tfbt.state(); return d.rpg.characters.C01.exp === 70 && d.rpg.characters.C01.level === 3 && d.rpg.gold === 28 && d.items.potion === 1 && d.flags['boss.mournfang'] && !window.__tfbt.world().bossVisible; }));
  check('Post-boss autosave waits for completed aftermath dialogue', await page.evaluate(() => JSON.parse(localStorage.getItem('tfbt.save.v1.auto')).data.flags['c1.mournfang_victory_seen'] === true));
  await openPause(page); await openMenu(page, 'save', 'save-load'); await saveSlot(page, 'slot3');
  const afterBoss = await state(page); await shot(page, 'phase4_save_after_boss'); await refreshContinue(page);
  check('Refresh/Continue after boss restores HP/MP, loot, equipment, skills and boss state', await page.evaluate(d => { const now = window.__tfbt.state(); return JSON.stringify(now.rpg) === JSON.stringify(d.rpg) && JSON.stringify(now.vitals) === JSON.stringify(d.vitals) && JSON.stringify(now.items) === JSON.stringify(d.items) && now.flags['boss.mournfang'] && !window.__tfbt.world().bossVisible; }, afterBoss));
  await openPause(page); await openMenu(page, 'save', 'save-load'); await loadSlot(page, 'slot2');
  check('Loading the pre-boss slot rolls back the entire save branch without retaining loot', await page.evaluate(() => { const d = window.__tfbt.state(); return !d.flags['boss.mournfang'] && d.rpg.characters.C01.exp === 25 && d.rpg.gold === 8 && d.items.potion === 0 && window.__tfbt.world().bossVisible; }));
  await openPause(page); await openMenu(page, 'save', 'save-load'); await loadSlot(page, 'slot3');
  await openPause(page); await openMenu(page, 'inventory'); await selectMenu(page, 'potion'); await press(page, 'Enter');
  check('Boss loot is a real shared consumable, usable in world Inventory', (await state(page)).items.potion === 0 && (await state(page)).vitals.hp > afterBoss.vitals.hp);
  await back(page, 'pause'); await back(page, 'world');
  await journey.walkTo(page, 1312, 400); await journey.face(page, 'ArrowRight');
  await page.waitForFunction(() => window.__tfbt.world()?.target === 'slice_exit');
  await press(page, 'Enter');
  await page.waitForFunction(() => window.__tfbt.world()?.area === 'aveloria');
  check('Walking beyond the defeated boss enters Aveloria automatically', await page.evaluate(() => window.__tfbt.state().flags['c1.vertical_slice_complete'] && window.__tfbt.state().chapter === 'I' && !window.__tfbt.sceneTexts('SliceEndScene').length));
  await page.waitForFunction(() => window.__tfbt.world()?.dialogue?.script === 'C1-06-VISTA');
  await journey.playDialogue(page); await waitWorld(page);
  await shot(page, 'phase4_city_arrival'); await checkLayout(page, check, 'city arrival');
  await openPause(page); await openMenu(page, 'settings', 'settings'); await back(page, 'pause');
  await openMenu(page, 'save', 'save-load'); await saveSlot(page, 'slot1'); await checkLayout(page, check, 'arrival save');
  await refreshContinue(page); const ending = await state(page);
  check('Ending save/refresh/Continue remains playable with no duplicate rewards or boss replay', ending.flags['c1.vertical_slice_complete'] && ending.rpg.characters.C01.exp === 70 && ending.rpg.gold === 28 && ending.items.potion === 0 && !await page.evaluate(() => window.__tfbt.battle()));
  console.log(`Phase 4 continuation browser wall time: ${((Date.now() - started) / 1000).toFixed(1)}s; active game time ${ending.playtimeSec.toFixed(1)}s (automated QA, not human pacing/FPS).`);
}
