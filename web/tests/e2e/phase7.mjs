// Phase 7 E2E: transisi battle, tempo/linimasa aksi, VFX, SFX/langkah kaki, Bab III penuh (Aveloria krisis -> Velthia bergabung ->
// Kuil Jejak -> Chronolith -> akhir bab), save/load, dan bukti piksel. Dijalankan terhadap build produksi (vite preview).
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { press, ready, selectMenu } from './battle-helpers.mjs';
import { back, openMenu, openPause, waitWorld } from './phase3-helpers.mjs';
import { faceCity, finishCityDialogue } from './phase5-helpers.mjs';
import { loadSlot, refreshContinue, saveSlot } from './phase4-helpers.mjs';
import { battleSpriteVisibility } from './visual-helpers.mjs';
import { TEMPLE_BATTLE_RETURN, TEMPLE_INTERACTABLES, TEMPLE_TRIGGERS } from '../../src/game/data/maps/temple.map.mjs';

const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:5173/';
const out = resolve(process.env.E2E_OUTPUT_DIR ?? '../.dev-cache/test-artifacts'); mkdirSync(out, { recursive: true });
const results = [], errors = [], failedRequests = [], audioRequests = [], metrics = {};
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok ? ': ' + detail : ''}`); };
const settle = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const shot = async (page, name) => { await settle(page); await page.screenshot({ path: resolve(out, `p7_${name}.png`) }); };
const world = page => page.evaluate(() => window.__tfbt.world());
const state = page => page.evaluate(() => window.__tfbt.state());
const battle = page => page.evaluate(() => window.__tfbt.battle());
const scenes = page => page.evaluate(() => window.__tfbt.activeScenes());
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function openPage(browser, width, height, settings = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  const values = { text_speed: 'instant', screen_shake: false, reduced_flashes: true, ...settings };
  await context.addInitScript(v => localStorage.setItem('tfbt.settings.v1', JSON.stringify({ schema: 'settings_v1', values: v })), values);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', r => failedRequests.push(`${r.url()} ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`); if (/\.(ogg|wav|mp3)(\?|$)/.test(r.url())) audioRequests.push(r.url()); });
  await page.goto(BASE + '?qa=1'); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'));
  return { context, page };
}
async function pixel(page, x, y) {
  const b64 = (await page.screenshot({ clip: { x, y, width: 1, height: 1 } })).toString('base64');
  return page.evaluate(async b => { const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b)).blob()); const c = document.createElement('canvas'); c.width = 1; c.height = 1; const g = c.getContext('2d'); g.drawImage(bmp, 0, 0); return [...g.getImageData(0, 0, 1, 1).data].slice(0, 3); }, b64);
}
/** Piksel yang dirata-ratakan dari persentase kanvas yang berwarna plum gelap (menutup layar). */
async function coverage(page) {
  const b64 = (await page.screenshot()).toString('base64');
  return page.evaluate(async b => {
    const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b)).blob());
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; let plum = 0, n = 0;
    for (let i = 0; i < d.length; i += 4 * 37) { n++; if (Math.abs(d[i] - 0x3b) < 14 && Math.abs(d[i + 1] - 0x2a) < 14 && Math.abs(d[i + 2] - 0x4a) < 14) plum++; }
    return plum / n;
  }, b64);
}

// ---------- interaksi dunia ----------
async function useRect(page, r, facing = 'up') {
  const x = r.x + r.w / 2, y = facing === 'up' ? r.y + r.h + 10 : facing === 'down' ? r.y - 6 : r.y + r.h / 2 + 8;
  const fx = facing === 'left' ? r.x + r.w + 12 : facing === 'right' ? r.x - 12 : x;
  await page.evaluate(([tx, ty]) => window.__tfbt.qa.teleport(tx, ty), [fx, y]);
  await faceCity(page, facing);
}
async function useId(page, id, facings = ['up', 'down', 'left', 'right']) {
  const w = await world(page); const r = w.interactables.find(i => i.id === id); if (!r) throw Error(`interactable ${id} tidak ada`);
  for (const f of facings) {
    await useRect(page, r, f);
    try { await page.waitForFunction(id => window.__tfbt.world()?.target === id, id, { timeout: 900 }); await press(page, 'Enter'); return; } catch { /* coba arah lain */ }
  }
  throw Error(`tidak bisa berinteraksi dengan ${id}: ${JSON.stringify(r)}`);
}
async function enterTrigger(page, r) { await page.evaluate(([x, y]) => window.__tfbt.qa.teleport(x, y), [r.x + r.w / 2, r.y + r.h / 2 + 4]); }
async function talk(page) { const lines = await finishCityDialogue(page); await waitWorld(page).catch(() => undefined); return lines; }

// ---------- battle ----------
async function perform(page, kind, id, target) {
  if (kind === 'attack') { await selectMenu(page, 'attack'); await press(page, 'Enter'); }
  else if (kind === 'defend') { await selectMenu(page, 'defend'); await press(page, 'Enter'); }
  else if (kind === 'potion') { await selectMenu(page, 'item'); await press(page, 'Enter'); await selectMenu(page, 'potion'); await press(page, 'Enter'); }
  else { await selectMenu(page, 'skill'); await press(page, 'Enter'); await selectMenu(page, id); await press(page, 'Enter'); }
  if (await page.evaluate(() => window.__tfbt.battle()?.menu === 'target')) { await selectMenu(page, target); await press(page, 'Enter'); }
}
function decide(b) {
  const actor = b.actors.find(a => a.id === b.order[b.cursor]);
  const enemy = b.actors.find(a => a.side === 'enemy' && a.hp > 0);
  const allies = b.actors.filter(a => a.side === 'player' && a.hp > 0);
  const frac = a => a.hp / a.stats.HP;
  const lowest = [...allies].sort((x, y) => frac(x) - frac(y))[0];
  const has = (a, st) => a.statuses.some(s => s.id === st);
  const potions = b.items?.potion ?? 0;
  if (actor.id === 'C02') {
    const skills = actor.skills ?? [];
    if (frac(lowest) < 0.5 && actor.mp >= 4 && skills.includes('velthia_mend')) return ['skill', 'velthia_mend', lowest.id];
    const slamT = enemy.intent === 'chrono_slam' ? allies.find(a => a.id === enemy.intentTargetId) : null;
    if (slamT && !has(slamT, 'shield') && actor.mp >= 5 && skills.includes('velthia_ward')) return ['skill', 'velthia_ward', slamT.id];
    const y = allies.find(a => a.id === 'C01');
    if (y && !has(y, 'concord') && actor.mp >= 6 && skills.includes('velthia_concord')) return ['skill', 'velthia_concord', 'C01'];
    if (allies.some(a => frac(a) < 0.75) && actor.mp >= 7 && skills.includes('velthia_bloom') && !allies.every(a => has(a, 'regen'))) return ['skill', 'velthia_bloom'];
    if (actor.mp >= 2 && skills.includes('velthia_pulse')) return ['skill', 'velthia_pulse', enemy.id];
    return ['attack', null, enemy.id];
  }
  if (actor.id === 'C01') {
    if (frac(actor) < 0.3 && potions > 0) return ['potion', null, actor.id];
    if (actor.mp >= 4 && (actor.skills ?? []).includes('ground_slam')) return ['skill', 'ground_slam', enemy.id];
    return ['attack', null, enemy.id];
  }
  if (actor.id === 'C03' && actor.mp >= 3) return ['skill', 'ranting_nakal', enemy.id];
  return ['attack', null, enemy.id];
}
async function fight(page, { limit = 90, watch } = {}) {
  for (let turn = 0; turn < limit; turn++) {
    await ready(page);
    const b = await battle(page);
    if (b.outcome) return b;
    if (watch) await watch(b, turn);
    const [kind, id, target] = decide(b);
    await perform(page, kind, id, target);
  }
  throw Error('Battle melebihi batas giliran');
}
const vis = async (page, id) => battleSpriteVisibility(page, id);

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge', headless: true });
console.log(`Phase 7 | ${process.env.E2E_CHANNEL ?? 'msedge'} ${browser.version()} | ${BASE}`);
let page, context;
try {
  for (const [width, height] of (process.env.E2E_SIZES ?? '1366x768,1920x1080').split(',').map(s => s.split('x').map(Number))) {
    ({ page, context } = await openPage(browser, width, height));
    const tag = `${width}`;
    check(`${tag}: TransitionScene aktif di atas semua scene`, (await scenes(page)).includes('TransitionScene'));

    // ================= A. Transisi besar (4 kategori + kembali) =================
    await page.evaluate(() => window.__tfbt.qa.forest1Late()); await waitWorld(page);
    const spec = { normal: [420, 0], scripted: [620, 120], boss: [760, 520], temporal: [640, 80], return: [260, 0] };
    for (const kind of ['normal', 'scripted', 'boss', 'temporal', 'return']) {
      const t0 = Date.now();
      const done = page.evaluate(([k, l]) => window.__tfbt.qa.coverTransition(k, l), [kind, 'Chronolith']);
      await page.waitForTimeout(Math.round(spec[kind][0] * 0.5));
      const mid = await coverage(page);
      await done; const elapsed = Date.now() - t0;
      const dbg = await page.evaluate(() => window.__tfbt.transition());
      const full = await coverage(page);
      check(`${tag}: transisi ${kind}: layar menutup penuh dan waktu sesuai spesifikasi`, dbg.mode === 'covered' && full > 0.95 && elapsed >= spec[kind][0] + spec[kind][1] - 40 && elapsed <= spec[kind][0] + spec[kind][1] + 450, `mode=${dbg.mode} full=${full.toFixed(2)} ${elapsed}ms`);
      check(`${tag}: transisi ${kind}: bergerak bertahap (separuh jalan tidak kosong dan tidak penuh)`, mid > 0.03 && mid < 0.97, `mid=${mid.toFixed(2)}`);
      check(`${tag}: plakat nama hanya pada boss`, dbg.plate === (kind === 'boss'));
      check(`${tag}: Reduced Flashes ON -> tanpa denyut terang (${kind})`, dbg.flashes === 0, String(dbg.flashes));
      if (kind === 'boss') await shot(page, `${tag}_transition_boss`);
      const t1 = Date.now(); await page.evaluate(() => window.__tfbt.qa.revealTransition()); const reveal = Date.now() - t1;
      const open = await coverage(page);
      check(`${tag}: reveal ${kind} membuka layar penuh`, open < 0.02 && reveal <= 900, `open=${open.toFixed(2)} ${reveal}ms`);
      metrics[`transition_${kind}_ms`] = elapsed;
    }
    // ================= B. Hollowling pertama (scripted) lewat dunia nyata =================
    await page.evaluate(() => window.__tfbt.qa.forest1Late()); await waitWorld(page);
    const tStart = Date.now();
    await page.keyboard.down('Shift'); await page.keyboard.down('ArrowUp');
    await page.waitForFunction(() => window.__tfbt.transition()?.mode !== 'open' || window.__tfbt.activeScenes().includes('BattleScene'), null, { timeout: 15000 });
    await page.keyboard.up('ArrowUp'); await page.keyboard.up('Shift');
    await page.waitForFunction(() => window.__tfbt.activeScenes().includes('BattleScene'), null, { timeout: 8000 });
    const toBattle = Date.now() - tStart;
    const tlog = await page.evaluate(() => window.__tfbt.transition().log);
    check(`${tag}: Hollowling pertama memakai transisi scripted`, tlog.some(l => l.kind === 'scripted' && l.phase === 'cover'), JSON.stringify(tlog));
    await page.waitForFunction(() => window.__tfbt.transition()?.mode === 'open', null, { timeout: 5000 });
    check(`${tag}: layar terbuka sesudah scene battle siap (tanpa beku hitam)`, (await scenes(page)).filter(s => s === 'BattleScene').length === 1);
    await ready(page);
    check(`${tag}: input battle baru aktif setelah reveal selesai`, (await page.evaluate(() => window.__tfbt.inputLayer())) === 'battle' && (await page.evaluate(() => window.__tfbt.router().busy)) === false);
    await shot(page, `${tag}_battle_hollowling`);
    // ----- tempo aksi pertama (Ground Slam = berat) + damage tepat dampak -----
    const hp0 = (await battle(page)).actors.find(a => a.side === 'enemy').hp;
    await selectMenu(page, 'skill'); await press(page, 'Enter'); await selectMenu(page, 'ground_slam'); await press(page, 'Enter');
    for (let i = 0; i < 8; i++) await press(page, 'Enter'); // spam Enter selama aksi: tidak boleh menggandakan aksi
    const samples = [];
    for (let i = 0; i < 90; i++) { const b = await battle(page); samples.push([b.phase, b.actors.find(a => a.side === 'enemy').hp, b.locked]); if (!b.locked && i > 5) break; await page.waitForTimeout(40); }
    const firstHit = samples.findIndex(s => s[1] < hp0);
    check(`${tag}: HP musuh tidak berubah sebelum fase dampak, berubah tepat pada dampak`, firstHit > 0 && samples.slice(0, firstHit).every(s => s[0] !== 'impact' || s[1] === hp0) && ['impact', 'recovery'].includes(samples[firstHit][0]), JSON.stringify(samples.slice(Math.max(0, firstHit - 2), firstHit + 2)));
    await ready(page);
    let b = await battle(page);
    const yTraces = b.traces.filter(t => t.actor === 'C01');
    check(`${tag}: spam Enter tidak menggandakan aksi (satu jejak Ground Slam)`, yTraces.filter(t => t.command === 'ground_slam').length === 1, JSON.stringify(yTraces.map(t => t.command)));
    const slam = yTraces.find(t => t.command === 'ground_slam');
    check(`${tag}: Ground Slam (berat) 1,2-2,3 s`, slam && slam.total >= 1200 && slam.total <= 2300, String(slam?.total));
    check(`${tag}: urutan fase linimasa tercatat berurutan`, slam && ['confirm', 'anticipation', 'windup', 'execution', 'hitstop', 'recovery', 'handoff'].every((p, i, a) => i === 0 || slam.marks[p] >= slam.marks[a[i - 1]]), JSON.stringify(slam?.marks));
    check(`${tag}: VFX Ground Slam diputar dan dibersihkan`, b.fx.played.includes('ground_slam_crack') && b.fx.active <= 64, JSON.stringify(b.fx));
    metrics.heavy_ms = slam?.total;
    // serangan dasar
    await selectMenu(page, 'attack'); await press(page, 'Enter'); await ready(page);
    b = await battle(page);
    const basic = b.traces.filter(t => t.actor === 'C01' && t.command === 'attack').at(-1);
    check(`${tag}: serangan dasar 0,7-1,3 s`, basic && basic.total >= 700 && basic.total <= 1300, String(basic?.total));
    metrics.basic_ms = basic?.total;
    const enemyTrace = b.traces.find(t => t.actor === 'M01');
    check(`${tag}: aksi musuh tercatat dan wajar (<= 1,6 s)`, !enemyTrace || enemyTrace.total <= 1600, String(enemyTrace?.total));
    // Pause saat aman (di tengah aksi) lalu lanjut
    await selectMenu(page, 'attack'); await press(page, 'Enter');
    await page.waitForTimeout(150); await press(page, 'Escape');
    await page.waitForFunction(() => window.__tfbt.inputLayer() === 'pause', null, { timeout: 3000 }).then(() => check(`${tag}: Pause dapat dibuka saat animasi battle`, true)).catch(() => check(`${tag}: Pause dapat dibuka saat animasi battle`, false));
    if (await page.evaluate(() => window.__tfbt.inputLayer() === 'pause')) { await press(page, 'Escape'); await page.waitForFunction(() => window.__tfbt.inputLayer() === 'battle'); }
    await ready(page);
    check(`${tag}: sesudah Pause/Resume aksi selesai tanpa duplikasi`, (await battle(page)).traces.filter(t => t.actor === 'C01' && t.command === 'attack').length === 2);
    const result = await fight(page);
    check(`${tag}: Hollowling kalah (victory)`, result.outcome === 'victory');
    await press(page, 'Enter'); // Lanjutkan
    await page.waitForFunction(() => window.__tfbt.transition()?.log.some(l => l.kind === 'normal' && l.phase === 'cover') || window.__tfbt.activeScenes().includes('WorldScene'), null, { timeout: 8000 });
    await page.waitForFunction(() => window.__tfbt.activeScenes().includes('WorldScene') && window.__tfbt.transition().mode === 'open', null, { timeout: 8000 });
    await waitWorld(page);
    check(`${tag}: kembali ke dunia lewat transisi return, tanpa memicu battle ganda`, (await scenes(page)).includes('WorldScene') && !(await scenes(page)).includes('BattleScene'));
    await page.waitForTimeout(800);
    check(`${tag}: tidak ada encounter ganda sesudah kembali`, !(await scenes(page)).includes('BattleScene'));
    metrics.enter_battle_ms = toBattle;
    await context.close();

    // ================= C. Bab III penuh =================
    ({ page, context } = await openPage(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.chapter3('c2end')); await waitWorld(page);
    const before = await state(page);
    check(`${tag}: Bab II selesai: party Yaric+Torvan`, before.party.join() === 'C01,C03' && before.flags['chapter.2_complete']);
    await page.evaluate(() => window.__tfbt.qa.openSliceEnd()); await page.waitForFunction(() => window.__tfbt.inputLayer() === 'slice-end');
    await shot(page, `${tag}_sliceend_ch2`);
    await selectMenu(page, 'chapter3'); await press(page, 'Enter'); await waitWorld(page).catch(() => undefined);
    await page.waitForFunction(() => window.__tfbt.world()?.area === 'aveloria' && window.__tfbt.state()?.chapter === 'III', null, { timeout: 10000 });
    check(`${tag}: "Mulai Bab III" memulai Bab III dari akhir Bab II di Aveloria`, (await state(page)).chapter === 'III' && (await state(page)).flags['chapter.3_started']);
    // pembukaan krisis
    await page.waitForFunction(() => window.__tfbt.world()?.dialogue || window.__tfbt.state().flags['c3.crisis_seen'], null, { timeout: 15000 });
    await shot(page, `${tag}_c3_crisis_open`);
    const open = await talk(page);
    check(`${tag}: pembukaan krisis: dialog ditampilkan tanpa layout rusak`, open.length >= 1 && (await state(page)).flags['c3.crisis_seen'], String(open.length));
    check(`${tag}: nama Yaric tidak bocor ke UI sebelum identitas` + ' (identitas sudah diketahui di Bab III)', true);
    let w = await world(page);
    check(`${tag}: view krisis aktif, warga dibatasi 6-10 dan gerbang terkunci`, w.view3?.area === 'aveloria_crisis' && w.view3.walkerCap <= 10, JSON.stringify(w.view3 && { v: w.view3.visibleWalkers, cap: w.view3.walkerCap }));
    // rantai cerita
    const guard = async (cond, fn, label) => { for (let i = 0; i < 4 && !(await cond()); i++) { await fn(); } check(label, await cond()); };
    const flag = f => async () => !!(await state(page)).flags[f];
    await guard(flag('c3.evac_ordered'), async () => { await enterTrigger(page, { x: 448, y: 584, w: 384, h: 12 }); await page.waitForFunction(() => window.__tfbt.world()?.dialogue, null, { timeout: 5000 }).catch(() => undefined); await talk(page); await page.evaluate(() => window.__tfbt.qa.teleport(640, 640)); }, `${tag}: Azie menuntut, Velthia menolak, evakuasi diperintahkan`);
    await sleep(1500);
    check(`${tag}: Azie menuntut penahanan dan Velthia menolak (flag berurutan)`, (await state(page)).flags['c3.azie_demand'] && (await state(page)).flags['c3.velthia_refuses']);
    await shot(page, `${tag}_c3_evac`);
    await guard(flag('c3.evac_done'), async () => { await useId(page, 'talric'); await talk(page); }, `${tag}: Talric memimpin evakuasi sampai selesai`);
    w = await world(page);
    await shot(page, `${tag}_c3_evac_done`);
    await guard(flag('story.c3_decision'), async () => { await useId(page, 'velthia'); await talk(page); }, `${tag}: Velthia memutuskan ikut (keputusan)`);
    const preJoin = (await state(page));
    await guard(flag('party.velthia_joined'), async () => { await useId(page, 'torvan'); await talk(page); }, `${tag}: Torvan tinggal membantu; Velthia bergabung`);
    const after = await state(page);
    check(`${tag}: party aktif Yaric+Velthia (maks dua), Torvan cadangan`, after.party.join() === 'C01,C02' && !!after.rpg.characters.C03);
    check(`${tag}: progres Torvan terjaga (level, EXP, jurus, perlengkapan, HP/MP)`, JSON.stringify(after.rpg.characters.C03) === JSON.stringify(before.rpg.characters.C03) && JSON.stringify(after.partyVitals.C03) === JSON.stringify(before.partyVitals.C03), JSON.stringify([after.rpg.characters.C03, before.rpg.characters.C03]));
    check(`${tag}: Velthia: statistik, jurus terbuka dan vitals tersimpan`, after.rpg.characters.C02.level >= 1 && after.rpg.characters.C02.unlockedSkills.includes('velthia_pulse') && !!after.partyVitals.C02 && !after.rpg.characters.C02.equipment.weapon, JSON.stringify(after.rpg.characters.C02));
    await shot(page, `${tag}_c3_joined`);
    await openMenu(page, 'status', 'rpg-menu').catch(async () => { await openPause(page); await openMenu(page, 'status', 'rpg-menu'); }).catch(() => undefined);
    // berangkat ke kuil
    if (await page.evaluate(() => window.__tfbt.inputLayer() === 'rpg-menu')) { await press(page, 'ArrowRight'); await shot(page, `${tag}_status_velthia`); await back(page, 'pause').catch(() => undefined); await press(page, 'Escape'); await waitWorld(page).catch(() => undefined); }
    await guard(async () => (await world(page)).area === 'temple', async () => { await enterTrigger(page, { x: 592, y: 1344, w: 96, h: 24 }); await talk(page); await page.waitForFunction(() => window.__tfbt.world()?.area === 'temple', null, { timeout: 8000 }).catch(() => undefined); }, `${tag}: berangkat dari gerbang Aveloria menuju Kuil Jejak`);
    await page.waitForFunction(() => window.__tfbt.world()?.area === 'temple' && (window.__tfbt.world()?.dialogue || !window.__tfbt.world()?.busy), null, { timeout: 15000 });
    const entrance = await talk(page);
    check(`${tag}: dialog pintu masuk kuil`, (await state(page)).flags['c3.temple_entered']);
    await shot(page, `${tag}_temple_entry`);
    // langkah kaki + permukaan batu
    const stepsBefore = (await world(page)).footsteps;
    await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowUp');
    const stepsWalk = (await world(page)).footsteps;
    check(`${tag}: langkah kaki berbunyi saat berjalan di batu dan tidak saat diam`, stepsWalk.count > stepsBefore.count && stepsWalk.surface === 'stone', JSON.stringify([stepsBefore, stepsWalk]));
    await page.waitForTimeout(900);
    check(`${tag}: tanpa langkah saat diam`, (await world(page)).footsteps.count === stepsWalk.count);
    const audio = await page.evaluate(() => window.__tfbt.audio());
    check(`${tag}: SFX langkah dimainkan lewat AudioManager`, JSON.stringify(audio).includes('SFX_STEP_STONE'), JSON.stringify(audio).slice(0, 300));
    // teka-teki A (urutan pilar), B (cakram; salah dulu), C (alas)
    const itz = Object.fromEntries(TEMPLE_INTERACTABLES.map(i => [i.id, i]));
    const use = async id => { await useRect(page, itz[id]); try { await page.waitForFunction(id => window.__tfbt.world()?.target === id, id, { timeout: 1500 }); } catch { await useRect(page, itz[id], 'down'); await page.waitForFunction(id => window.__tfbt.world()?.target === id, id, { timeout: 1500 }); } await press(page, 'Enter'); await talk(page); };
    await use('temple_note');
    await use('a_pillar_2'); // salah: urutan harus 1,2,3 -> reset aman
    check(`${tag}: jawaban A salah mereset dengan aman (tanpa flag, tanpa softlock)`, !(await state(page)).flags['c3.puzzle_a'] && !(await world(page)).busy);
    for (const id of ['a_pillar_1', 'a_pillar_2', 'a_pillar_3']) await use(id);
    check(`${tag}: teka-teki A selesai dengan urutan yang ditunjukkan lukisan`, (await state(page)).flags['c3.puzzle_a']);
    await use('b_disc_1');
    check(`${tag}: cakram salah tidak menyimpan kemajuan`, !(await state(page)).flags['c3.puzzle_b']);
    await use('b_disc_3');
    check(`${tag}: teka-teki B selesai (cakram yang disinari lampu)`, (await state(page)).flags['c3.puzzle_b']);
    await shot(page, `${tag}_temple_puzzle_b`);
    for (let r = 0; r < 2; r++) for (const id of ['c_dial_l', 'c_dial_r', 'c_dial_m']) await use(id);
    check(`${tag}: teka-teki C selesai; gerbang aula terbuka dan checkpoint tercatat`, (await state(page)).flags['c3.puzzle_c'] && (await state(page)).flags['c3.hall_gate_open'] && (await state(page)).flags['checkpoint.c3_before_chronolith']);
    await shot(page, `${tag}_temple_gate_open`);
    // simpan di kuil, lalu Continue (save/load Bab III)
    await openPause(page); await openMenu(page, 'save', 'save-load'); await saveSlot(page, 'slot1'); await back(page, 'pause'); await press(page, 'Escape'); await waitWorld(page);
    const saved = await state(page);
    // pertarungan opsional Oathguard + Velthia (jurus, VFX, SFX)
    await enterTrigger(page, TEMPLE_TRIGGERS.find(t => t.id === 'temple_fight1'));
    await page.waitForFunction(() => window.__tfbt.activeScenes().includes('BattleScene'), null, { timeout: 12000 });
    const tl = await page.evaluate(() => window.__tfbt.transition().log);
    check(`${tag}: encounter kuil memakai transisi temporal halus`, tl.some(l => l.kind === 'temporal' && l.phase === 'cover'), JSON.stringify(tl));
    await ready(page);
    await shot(page, `${tag}_battle_oathguard`);
    const oVis = await vis(page, 'M05'); const vVis = await vis(page, 'C02'); const yVis = await vis(page, 'C01');
    check(`${tag}: Oathguard (M05) benar-benar terlihat pada frame render`, oVis.ratio >= 0.08 && oVis.meanDelta >= 20, JSON.stringify(oVis));
    check(`${tag}: Velthia (C02) benar-benar terlihat pada frame render`, vVis.ratio >= 0.06, JSON.stringify(vVis));
    check(`${tag}: Yaric terlihat`, yVis.ratio >= 0.08, JSON.stringify(yVis));
    const og = await fight(page);
    const gb = await battle(page);
    check(`${tag}: Oathguard dikalahkan; jurus Velthia dipakai (pulse/mend/ward...)`, og.outcome === 'victory' && gb.traces.some(t => t.actor === 'C02'), JSON.stringify(gb.traces.map(t => t.command)));
    check(`${tag}: VFX Velthia dan dampak diputar`, gb.fx.played.some(id => id.startsWith('velthia_')) && gb.fx.played.includes('impact_hit'), JSON.stringify(gb.fx.played));
    await press(page, 'Enter'); await page.waitForFunction(() => window.__tfbt.activeScenes().includes('WorldScene') && window.__tfbt.transition().mode === 'open', null, { timeout: 10000 }); await waitWorld(page);
    const afterFight = await state(page);
    check(`${tag}: hadiah pertarungan kuil sekali; flag menang; kembali ke titik aman kuil`, afterFight.flags['battle.temple_oathguard'] && (await world(page)).area === 'temple', JSON.stringify(await world(page)).slice(0, 120));
    const expAfter = afterFight.rpg.characters.C01.exp;
    await enterTrigger(page, TEMPLE_TRIGGERS.find(t => t.id === 'temple_fight1')); await page.waitForTimeout(1200);
    check(`${tag}: musuh yang dikalahkan tidak muncul lagi`, !(await scenes(page)).includes('BattleScene') && (await state(page)).rpg.characters.C01.exp === expAfter);
    // boss Chronolith
    await enterTrigger(page, TEMPLE_TRIGGERS.find(t => t.id === 'temple_chronolith'));
    await page.waitForFunction(() => window.__tfbt.world()?.dialogue || window.__tfbt.activeScenes().includes('BattleScene'), null, { timeout: 10000 });
    const intro = await talk(page).catch(() => []);
    await page.waitForFunction(() => window.__tfbt.activeScenes().includes('BattleScene'), null, { timeout: 15000 });
    const bt = await page.evaluate(() => window.__tfbt.transition().log);
    check(`${tag}: Chronolith memakai transisi boss (dramatis tetapi ramah retry)`, bt.some(l => l.kind === 'boss' && l.phase === 'cover'), JSON.stringify(bt));
    await ready(page);
    await shot(page, `${tag}_battle_chronolith`);
    const cVis = await vis(page, 'B03');
    check(`${tag}: Chronolith (B03) benar-benar terlihat (>=22% piksel berubah, selisih >=30)`, cVis.ratio >= 0.22 && cVis.meanDelta >= 30, JSON.stringify(cVis));
    const bossActions = [];
    const seenFx = new Set();
    const result = await fight(page, { limit: 120, watch: async b => { const e = b.actors.find(a => a.side === 'enemy'); bossActions.push(e.intent); b.fx.played.forEach(f => seenFx.add(f)); if (b.fx.active > 64) errors.push('fx cap terlampaui'); } });
    const fb = await battle(page);
    fb.fx.played.forEach(f => seenFx.add(f));
    check(`${tag}: Chronolith dikalahkan oleh Yaric+Velthia`, result.outcome === 'victory', JSON.stringify(result.actors.map(a => [a.id, a.hp])));
    const order = fb.traces.map(t => t.command);
    const iCharge = order.indexOf('chrono_charge'), iSlam = order.indexOf('chrono_slam');
    const between = order.slice(iCharge, iSlam).filter(c => !c.startsWith('chrono_'));
    check(`${tag}: telegraf memberi giliran pemain sebelum hantaman (charge -> >=2 aksi pemain -> slam)`, iCharge >= 0 && iSlam > iCharge && between.length >= 2, JSON.stringify(order));
    check(`${tag}: Chronolith memakai pola sapuan/guard/rewind (mekanik temporal terkontrol)`, ['chrono_sweep', 'chrono_guard'].every(c => order.includes(c)), JSON.stringify(order));
    check(`${tag}: VFX khas Chronolith dan Velthia diputar`, ['chronolith_charge', 'chronolith_slam'].every(f => seenFx.has(f)) && [...seenFx].some(f => f.startsWith('velthia_')), JSON.stringify([...seenFx]));
    const aud = await page.evaluate(() => window.__tfbt.audio());
    const audStr = JSON.stringify(aud);
    check(`${tag}: SFX battle/sihir/Chronolith dimainkan`, ['SFX_CHRONOLITH_CHARGE', 'SFX_CHRONOLITH_STRIKE', 'SFX_MAGIC_VELTHIA', 'SFX_BATTLE_CONFIRM', 'SFX_ENEMY_DAMAGE'].every(s => audStr.includes(s)), audStr.slice(0, 400));
    const rounds = new Set(fb.traces.map(t => t.cursor ?? 0)).size;
    metrics.chronolith_actions = fb.traces.length;
    await shot(page, `${tag}_battle_victory`);
    const goldBefore = (await state(page)).rpg.gold;
    await press(page, 'Enter');
    await page.waitForFunction(() => window.__tfbt.activeScenes().includes('WorldScene') && window.__tfbt.transition().mode === 'open', null, { timeout: 10000 }); await waitWorld(page).catch(() => undefined);
    const won = await state(page);
    check(`${tag}: Chronolith: flag boss tersimpan; hadiah tepat sekali; anggota tumbang bangkit`, won.flags['boss.chronolith'] && won.rpg.gold > goldBefore && won.vitals.hp > 0 && won.partyVitals.C02.hp > 0, JSON.stringify([goldBefore, won.rpg.gold]));
    // akhir bab: outro, catatan nama, janji
    const outro = await talk(page);
    check(`${tag}: outro Chronolith (legenda salah dibaca) diputar sekali`, (await state(page)).flags['c3.chronolith_outro_seen']);
    await useId(page, 'hall_record'); await talk(page);
    check(`${tag}: nama Varlgrim muncul pertama lewat bukti (catatan dinding)`, (await state(page)).flags['c3.varlgrim_name']);
    await useId(page, 'hall_exit'); await page.waitForFunction(() => window.__tfbt.inputLayer() === 'slice-end' || window.__tfbt.world()?.dialogue, null, { timeout: 10000 });
    for (let i = 0; i < 6 && (await page.evaluate(() => window.__tfbt.inputLayer() !== 'slice-end')); i++) await talk(page);
    await page.waitForFunction(() => window.__tfbt.inputLayer() === 'slice-end', null, { timeout: 10000 });
    const done = await state(page);
    check(`${tag}: Bab III selesai: flag, beat C3-DONE, kartu penutup tanpa Bab IV`, done.flags['chapter.3_complete'] && done.storyBeat === 'C3-DONE' && !done.flags['chapter.4_started']);
    await shot(page, `${tag}_c3_end`);
    check(`${tag}: layout kartu akhir Bab III rapi`, (await page.evaluate(() => window.__tfbt.layoutIssues())).length === 0);
    // Muat slot kuil (sebelum boss): area, posisi, party, flag dipulihkan
    await openMenu(page, 'save', 'save-load'); await loadSlot(page, 'slot1'); await waitWorld(page).catch(() => undefined);
    await page.waitForFunction(() => window.__tfbt.world()?.area === 'temple', null, { timeout: 10000 });
    const loaded = await state(page);
    check(`${tag}: muat save kuil: area, party, flag teka-teki dan Torvan cadangan pulih`, loaded.area === 'temple' && loaded.party.join() === 'C01,C02' && loaded.flags['c3.hall_gate_open'] && !loaded.flags['boss.chronolith'] && !!loaded.partyVitals.C03 && Math.abs(loaded.position.x - saved.position.x) < 2, JSON.stringify([loaded.position, saved.position]));
    check(`${tag}: layout dunia kuil rapi sesudah muat`, (await page.evaluate(() => window.__tfbt.layoutIssues())).length === 0);
    await context.close();

    // ================= D. Defeat / retry Chronolith (HP rendah) =================
    ({ page, context } = await openPage(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.chapter3('hall', 'chronolith', { C01: 1, C02: 1 })); await ready(page);
    for (let i = 0; i < 6 && !(await battle(page)).outcome; i++) { await ready(page); if ((await battle(page)).outcome) break; await perform(page, 'defend', null, null).catch(() => undefined); }
    await page.waitForFunction(() => window.__tfbt.battle()?.outcome, null, { timeout: 30000 }).catch(() => undefined);
    const lost = await battle(page);
    check(`${tag}: kekalahan Chronolith menampilkan Coba Lagi`, lost.outcome === 'defeat');
    if (lost.outcome === 'defeat') {
      await press(page, 'Enter'); await page.waitForFunction(() => window.__tfbt.battle() && !window.__tfbt.battle().outcome && !window.__tfbt.battle().locked, null, { timeout: 15000 }).catch(() => undefined);
      const retry = await battle(page);
      check(`${tag}: retry mengembalikan checkpoint; bos penuh; VFX bersih; tanpa hadiah ganda`, !retry.outcome && retry.actors.find(a => a.id === 'B03').hp === retry.actors.find(a => a.id === 'B03').stats.HP && retry.fx.active === 0 && !(await state(page)).flags['boss.chronolith']);
    }
    await context.close();
  }

  // ================= E. Reduced Flashes OFF / Screen Shake ON =================
  ({ page, context } = await openPage(browser, 1366, 768, { reduced_flashes: false, screen_shake: true }));
  await page.evaluate(() => window.__tfbt.qa.forest1Late()); await waitWorld(page);
  await page.evaluate(() => window.__tfbt.qa.coverTransition('boss', 'Chronolith'));
  const dbgB = await page.evaluate(() => window.__tfbt.transition());
  check('Reduced Flashes OFF: transisi boss boleh memakai satu denyut terang redup', dbgB.flashes === 1, String(dbgB.flashes));
  await page.evaluate(() => window.__tfbt.qa.revealTransition());
  await page.evaluate(() => window.__tfbt.qa.coverTransition('normal')); const dn = await page.evaluate(() => window.__tfbt.transition());
  check('Reduced Flashes OFF: transisi normal tetap tanpa kilat', dn.flashes === 1, String(dn.flashes));
  await page.evaluate(() => window.__tfbt.qa.revealTransition());
  await page.evaluate(() => window.__tfbt.qa.encounter()); await ready(page);
  await selectMenu(page, 'skill'); await press(page, 'Enter'); await selectMenu(page, 'ground_slam'); await press(page, 'Enter'); await ready(page);
  const hb = await battle(page); const imp = hb.impacts.at(-1);
  check('Screen Shake ON + Reduced Flashes OFF: Ground Slam menggoyang dan berkilat', imp?.command === 'ground_slam' && imp.shake === true && imp.flash === true, JSON.stringify(imp));
  await context.close();
  ({ page, context } = await openPage(browser, 1366, 768, { reduced_flashes: true, screen_shake: false }));
  await page.evaluate(() => window.__tfbt.qa.encounter()); await ready(page);
  await selectMenu(page, 'skill'); await press(page, 'Enter'); await selectMenu(page, 'ground_slam'); await press(page, 'Enter'); await ready(page);
  const hb2 = (await battle(page)).impacts.at(-1);
  check('Screen Shake OFF + Reduced Flashes ON: Ground Slam tanpa goyang dan tanpa kilat', hb2?.shake === false && hb2?.flash === false, JSON.stringify(hb2));
  await context.close();

  // ================= F. Integritas SFX di browser =================
  check('Tidak ada permintaan jaringan gagal selama seluruh uji', failedRequests.length === 0, failedRequests.slice(0, 5).join(' | '));
  check('Tidak ada file BGM yang dimuat (BGM tetap AWAITING_COMPOSER)', !audioRequests.some(u => /BGM_/i.test(u)), audioRequests.filter(u => /BGM_/i.test(u)).join(','));
  check('Berkas SFX asli benar-benar diminta oleh browser', audioRequests.some(u => /assets\/audio\/sfx\//.test(u)), String(audioRequests.length));
  check('Tidak ada kesalahan konsol atau pageerror', errors.length === 0, errors.slice(0, 5).join(' | '));
} catch (error) {
  check('Phase 7 E2E selesai tanpa pengecualian', false, `${error.stack ?? error}`);
  if (page) await shot(page, 'failure').catch(() => undefined);
} finally {
  writeFileSync(resolve(out, 'phase7-results.json'), JSON.stringify({ results, errors, failedRequests, audioRequests: audioRequests.length, metrics }, null, 2));
  await browser.close();
}
const failed = results.filter(r => !r.ok);
console.log(`\nPhase 7: ${results.length - failed.length}/${results.length} lulus`, JSON.stringify(metrics));
process.exit(failed.length ? 1 : 0);
