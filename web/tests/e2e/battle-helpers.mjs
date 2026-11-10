export const battle = page => page.evaluate(() => window.__tfbt.battle());
export async function ready(page) {
  await page.waitForFunction(() => { const b = window.__tfbt.battle(); return b && !b.locked && (b.outcome || b.actors.find(a => a.id === b.order[b.cursor])?.side === 'player'); }, null, { timeout: 12000 });
}
export async function press(page, key, n = 1) {
  for (let i = 0; i < n; i++) { await page.keyboard.press(key, { delay: 25 }); await page.waitForTimeout(50); }
}
export async function command(page, id, wait = true) {
  await ready(page);
  const indices = { attack: 0, ground_slam: 1, potion: 2, defend: 3, run: 4 };
  await press(page, 'ArrowDown', indices[id]);
  await press(page, 'Enter');
  if (id === 'ground_slam' || id === 'potion') await press(page, 'Enter');
  if (wait && id !== 'run') await ready(page);
}
export async function battleTutorial(page, check, shot) {
  await ready(page);
  let b = await battle(page);
  check('C1-04: BattleScene, satu layer battle, dunia/HUD berhenti', await page.evaluate(() => window.__tfbt.activeScenes().includes('BattleScene') && !window.__tfbt.activeScenes().includes('WorldScene') && !window.__tfbt.activeScenes().includes('HudScene') && window.__tfbt.inputLayer() === 'battle'));
  check('Hollowling kiri, Yaric kanan; pivot kaki tetap', b.sprites.M01.x < b.sprites.C01.x && b.sprites.M01.footY === b.sprites.C01.footY);
  check('HP/MP awal tutorial benar', b.actors[0].hp === 96 && b.actors[0].mp === 12 && b.actors[1].hp === 112);
  check('Layout battle tidak terpotong atau tumpang tindih', (await page.evaluate(() => window.__tfbt.layoutIssues())).length === 0);
  await shot(page, 'battle_idle');
  const beforePause = JSON.stringify(b.actors);
  await press(page, 'Escape');
  await page.waitForFunction(() => window.__tfbt.inputLayer() === 'pause');
  await press(page, 'ArrowDown'); await press(page, 'Enter');
  await page.waitForFunction(() => window.__tfbt.inputLayer() === 'settings');
  check('Pengaturan dapat dibuka dari Jeda saat battle', true);
  await press(page, 'ArrowDown', 7); await press(page, 'Enter'); // screen shake OFF
  await press(page, 'Escape'); await press(page, 'Escape');
  await page.waitForFunction(() => window.__tfbt.inputLayer() === 'battle');
  b = await battle(page);
  check('Pause/Settings tidak mereset/mengonsumsi giliran atau HP/MP', b.turn === 1 && JSON.stringify(b.actors) === beforePause);
  await command(page, 'run');
  check('Kabur nonaktif pada encounter wajib, tanpa mengonsumsi giliran', (await battle(page)).turn === 1);
  // Back from selected Run via wrap; command() expects the initial focus.
  await press(page, 'ArrowDown');
  await command(page, 'attack', false);
  const pending = await battle(page);
  check('Serang mengunci aksi selama animasi', pending.locked && pending.pending?.command === 'attack');
  await shot(page, 'battle_attack');
  for (let i = 0; i < 5; i++) await page.keyboard.press('Enter', { delay: 5 });
  await ready(page); b = await battle(page);
  check('Spam Enter hanya satu aksi pemain dan satu balasan musuh', b.turn === 3 && b.actors[1].hp === 95 && b.actors[0].hp === 81);
  check('Frame windup/contact/followthrough/recovery berurutan', ['anticipation', 'attack_windup', 'attack_contact', 'followthrough', 'recovery'].every((f, i, a) => i === 0 || b.history.findIndex(h => h.actor === 'C01' && h.frame === f) > b.history.findIndex(h => h.actor === 'C01' && h.frame === a[i - 1])));
  await command(page, 'ground_slam', false);
  await page.waitForFunction(() => window.__tfbt.battle()?.vfx.visible);
  await shot(page, 'ground_slam_fracture');
  await page.waitForFunction(() => window.__tfbt.battle()?.phase === 'impact');
  await shot(page, 'ground_slam_impact');
  await ready(page); b = await battle(page);
  check('Ground Slam: 4 MP, 30 physical damage sekali pada slab_strikes', b.actors[0].mp === 8 && b.actors[1].hp === 65 && b.history.filter(h => h.actor === 'slam' && h.frame === 'slab_strikes').length === 1);
  check('Seluruh 8 frame Ground Slam diputar sesuai urutan metadata', b.history.filter(h => h.actor === 'slam').map(h => h.frame).join(',') === 'fracture,crack_spread,slab_separates,slab_rises,slab_apex,slab_strikes,slab_descends,ground_settles');
  const hp = b.actors[0].hp;
  await command(page, 'defend'); b = await battle(page);
  check('Bertahan: damage musuh turun dari 15 ke 7', hp - b.actors[0].hp === 7);
  const injured = b.actors[0].hp;
  await command(page, 'potion'); b = await battle(page);
  check('Barang: Potion dari peti dikonsumsi, pulih 36 HP lalu musuh menyerang', b.items.potion === 0 && b.actors[0].hp === Math.min(96, injured + 36) - 15);
  for (let guard = 0; guard < 10 && !(await battle(page)).outcome; guard++) await command(page, 'attack');
  b = await battle(page);
  check('Victory benar, enemy HP 0, tidak ada reward palsu', b.outcome === 'victory' && b.actors[1].hp === 0 && b.menu === 'result');
  await shot(page, 'battle_victory');
  await press(page, 'Enter');
  await page.waitForFunction(() => window.__tfbt.world()?.dialogue?.script === 'C1-04-VICTORY', null, { timeout: 10000 });
  check('Kemenangan kembali ke dunia dan memainkan dialog C1-04', true);
}
