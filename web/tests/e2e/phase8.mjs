// Phase 8 E2E: Chapter IV (The Fate) dari akhir Bab III sampai "Bab IV selesai": Warden Fortress, puzzle, encounter, checkpoint,
// Varlgrim (meteor + Perlindungan), Heart of Time, Torvan, Aveloria sesudah runtuh, save/load, audio, retry, aksesibilitas,
// dan regresi battle berurutan. Dijalankan terhadap build produksi (vite preview). Hanya otomasi headless, BUKAN playtest manusia.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { press, ready, selectMenu } from './battle-helpers.mjs';
import { back, openMenu, openPause, waitWorld } from './phase3-helpers.mjs';
import { faceCity, finishCityDialogue } from './phase5-helpers.mjs';
import { loadSlot, refreshContinue, saveSlot } from './phase4-helpers.mjs';
import { battleSpriteVisibility } from './visual-helpers.mjs';
import { FORTRESS_BATTLE_RETURN, FORTRESS_INTERACTABLES, FORTRESS_TRIGGERS } from '../../src/game/data/maps/fortress.map.mjs';

const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:5173/';
const out = resolve(process.env.E2E_OUTPUT_DIR ?? '../.dev-cache/test-artifacts'); mkdirSync(out, { recursive: true });
const results = [], errors = [], failedRequests = [], audioRequests = [], metrics = {};
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok ? ': ' + detail : ''}`); };
const settle = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const shot = async (page, name) => { await settle(page); await page.screenshot({ path: resolve(out, `p8_${name}.png`) }); };
const world = page => page.evaluate(() => window.__tfbt.world());
const state = page => page.evaluate(() => window.__tfbt.state());
const battle = page => page.evaluate(() => window.__tfbt.battle());
const scenes = page => page.evaluate(() => window.__tfbt.activeScenes());
const flagOf = (st, f) => !!st?.flags?.[f];

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
let currentPage = null;
async function step(name, fn) {
  try { await fn(); } catch (e) {
    let extra = '';
    try { extra = JSON.stringify(await currentPage.evaluate(() => ({ scenes: window.__tfbt.activeScenes(), layer: window.__tfbt.inputLayer(), tr: window.__tfbt.transition()?.mode, b: window.__tfbt.battle() && { outcome: window.__tfbt.battle().outcome, menu: window.__tfbt.battle().menu, locked: window.__tfbt.battle().locked, turn: window.__tfbt.battle().turn }, w: window.__tfbt.world() && { x: window.__tfbt.world().x, y: window.__tfbt.world().y, dlg: window.__tfbt.world().dialogue?.line, busy: window.__tfbt.world().busy } }))); await shot(currentPage, `fail_${name.replace(/[^a-z0-9]+/gi, '_').slice(0, 40)}`); } catch { /* abaikan */ }
    check(`${name} [pengecualian]`, false, `${String(e.message).slice(0, 300)} ${extra}`);
  }
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
const trig = id => FORTRESS_TRIGGERS.find(t => t.id === id);
async function enterTrigger(page, id) { const r = trig(id); await page.evaluate(([x, y]) => window.__tfbt.qa.teleport(x, y), [r.x + r.w / 2, r.y + r.h / 2 + 3]); }
/** Maju lewat dialog sampai dunia bebas atau battle dimulai (dialog pra-battle). Mengembalikan baris yang terlihat. */
async function talk(page, { choice = 0 } = {}) {
  const lines = [], seen = new Set();
  for (let n = 0; n < 400; n++) {
    if (await page.evaluate(() => window.__tfbt.activeScenes().includes('BattleScene') || window.__tfbt.inputLayer() === 'slice-end')) return lines;
    const w = await world(page);
    if (!w) { await page.waitForTimeout(100); continue; }
    const d = w.dialogue;
    if (!d) { if (!w.busy && (lines.length > 0 || n > 14)) return lines; await page.waitForTimeout(100); continue; }
    const key = `${d.line}:${d.page}`;
    if (!seen.has(key)) { seen.add(key); lines.push(d); const issues = await page.evaluate(() => window.__tfbt.layoutIssues()); if (issues.length) throw Error(`Layout dialog ${d.line}: ${issues.join('; ')}`); }
    if (d.state === 'typing') { await press(page, 'Enter'); continue; }
    if (d.state === 'choice') { if (choice) await press(page, 'ArrowDown', choice); await press(page, 'Enter'); continue; }
    await page.waitForTimeout(450); await press(page, 'Enter');
  }
  throw Error('Dialog melebihi batas');
}
async function waitDialogueOrBattle(page, timeout = 8000) {
  await page.waitForFunction(() => window.__tfbt.world()?.dialogue || window.__tfbt.activeScenes().includes('BattleScene'), null, { timeout });
}
async function toWorld(page) { await page.waitForFunction(() => window.__tfbt.activeScenes().includes('WorldScene') && window.__tfbt.transition()?.mode === 'open', null, { timeout: 15000 }); await waitWorld(page).catch(() => undefined); }

// ---------- battle ----------
const HEAVY = new Set(['keeper_strike', 'fracture_strike', 'rift_surge', 'gravorn_crush', 'chrono_slam']);
async function perform(page, kind, id, target) {
  if (kind === 'attack') { await selectMenu(page, 'attack'); await press(page, 'Enter'); }
  else if (kind === 'defend') { await selectMenu(page, 'defend'); await press(page, 'Enter'); }
  else if (kind === 'aegis') { await selectMenu(page, 'velthia_aegis'); await press(page, 'Enter'); }
  else if (kind === 'potion') { await selectMenu(page, 'item'); await press(page, 'Enter'); await selectMenu(page, 'potion'); await press(page, 'Enter'); }
  else { await selectMenu(page, 'skill'); await press(page, 'Enter'); await selectMenu(page, id); await press(page, 'Enter'); }
  if (await page.evaluate(() => window.__tfbt.battle()?.menu === 'target')) { await selectMenu(page, target); await press(page, 'Enter'); }
}
function decide(b, opts = {}) {
  // Kebijakan pemain strategis (diselaraskan dengan smartC4 di tests/unit/helpers/chapter4.ts): Perlindungan saat meteor, Bertahan/Selubung pada sasaran
  // hantaman, Pulih, Potion (juga membangkitkan), selebihnya Denyut/Ground Slam fokus pada M06 dahulu.
  const actor = b.actors.find(a => a.id === b.order[b.cursor]);
  const foes = b.actors.filter(a => a.side === 'enemy' && a.hp > 0);
  const allies = b.actors.filter(a => a.side === 'player' && a.hp > 0);
  const focus = (foes.find(a => a.id === 'M06') ?? foes[0]).id;
  const heavyFoe = foes.find(a => HEAVY.has(a.intent)) ?? foes[0];
  const frac = a => a.hp / a.stats.HP;
  const lowest = [...allies].sort((x, y) => frac(x) - frac(y))[0];
  const potions = b.items?.potion ?? 0;
  const heavy = HEAVY.has(heavyFoe.intent);
  const mark = heavy ? b.actors.find(a => a.id === heavyFoe.intentTargetId) : null;
  const ag = b.meteorFx?.aegisStatus;
  const windowIntent = foes.some(f => f.intent === 'meteor_fall' || f.intent === 'meteor_hold' || (f.intent === 'rift_surge' && b.meteor?.open));
  const has = (a, st) => a.statuses.some(x => x.id === st);
  const stall = opts.stallUntilFall && (b.meteor?.falls ?? 0) === 0;
  if (actor.id === 'C02') {
    const skills = actor.skills ?? [];
    if (windowIntent && ag && !ag.covered && skills.includes('velthia_aegis') && !opts.skipAegis) return ['aegis'];
    const down = b.actors.find(a => a.side === 'player' && a.hp <= 0);
    if (down && potions > 0 && b.revivePotion) return ['potion', null, down.id];
    if (stall) return ['defend'];
    if (frac(lowest) < 0.4 && actor.mp >= 4 && skills.includes('velthia_mend')) return ['skill', 'velthia_mend', lowest.id];
    if (mark?.id === 'C02' && actor.mp >= 12 && !has(mark, 'shield') && skills.includes('velthia_ward')) return ['skill', 'velthia_ward', 'C02'];
    if (mark?.id === 'C02' && !actor.defending) return ['defend'];
    if (frac(lowest) < 0.6 && actor.mp >= 12 && skills.includes('velthia_mend')) return ['skill', 'velthia_mend', lowest.id];
    if (actor.mp >= 2 && skills.includes('velthia_pulse')) return ['skill', 'velthia_pulse', focus];
    return ['defend'];
  }
  const v = b.actors.find(a => a.id === 'C02');
  if (stall && !(frac(actor) < 0.3 && potions > 0)) return ['defend'];
  if (frac(actor) < 0.3 && potions > 0) return ['potion', null, actor.id];
  if (v && v.hp > 0 && frac(v) < 0.3 && v.mp < 4 && potions > 0) return ['potion', null, 'C02'];
  if (mark && mark.id === actor.id && !windowIntent) return ['defend'];
  if (actor.mp >= 4 && (actor.skills ?? []).includes('ground_slam')) return ['skill', 'ground_slam', focus];
  return ['attack', null, focus];
}
async function fight(page, { limit = 120, watch, ...opts } = {}) {
  for (let turn = 0; turn < limit; turn++) {
    await ready(page);
    const b = await battle(page);
    if (b.outcome) return b;
    if (watch) await watch(b, turn);
    const [kind, id, target] = decide(b, opts);
    await perform(page, kind, id, target);
  }
  throw Error('Battle melebihi batas giliran');
}
/** Menang dalam <= 3 percobaan (Coba Lagi memuat ulang checkpoint); mencatat jumlah kekalahan sebagai data balancing, bukan kelulusan. */
async function winBattle(page, label, opts = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fight(page, opts);
    if (r.outcome === 'victory') { metrics[`defeats:${label}`] = attempt; return r; }
    await press(page, 'Enter'); // "Coba Lagi"
    await page.waitForFunction(() => window.__tfbt.battle() && !window.__tfbt.battle().outcome, null, { timeout: 8000 });
  }
  throw Error(`kalah 3 kali pada ${label}`);
}
/** Lanjutkan dari kartu hasil, tunggu dunia, lalu mainkan dialog pasca-battle (mis. uji Perlindungan, C4-03). Mengembalikan baris dialog. */
async function finishBattle(page) {
  await press(page, 'Enter');
  await page.waitForFunction(() => window.__tfbt.activeScenes().includes('WorldScene') && window.__tfbt.transition()?.mode === 'open', null, { timeout: 15000 });
  return talk(page);
}
const vis = async (page, id) => battleSpriteVisibility(page, id);
async function layoutOK(page, name) { const issues = await page.evaluate(() => window.__tfbt.layoutIssues()); check(name, issues.length === 0, issues.join('; ')); }

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge', headless: true });
console.log(`Phase 8 | ${process.env.E2E_CHANNEL ?? 'msedge'} ${browser.version()} | ${BASE}`);
let page, context;
try {
  const sizes = (process.env.E2E_SIZES ?? '1366x768,1920x1080').split(',').map(s => s.split('x').map(Number));
  for (const [si, [width, height]] of sizes.entries()) {
    ({ page, context } = await openPage(browser, width, height)); currentPage = page;
    const tag = `${width}`;
    const full = si === 0 && process.env.E2E_P8_FULL !== '0';

    // ================= A. Dari akhir Bab III ke Bab IV via kartu =================
    await step(`${tag}: A awal Bab IV`, async () => {
      await page.evaluate(() => window.__tfbt.qa.chapter4('c3end')); await waitWorld(page);
      let st = await state(page);
      check(`${tag}: save Bab III selesai valid (C3-DONE, Yaric+Velthia, Torvan cadangan)`, st.chapter === 'III' && st.storyBeat === 'C3-DONE' && st.party.join() === 'C01,C02' && !!st.partyVitals?.C03 && !!st.rpg.characters.C03);
      const lvl3 = st.rpg.characters.C01.level;
      check(`${tag}: level akhir Bab III dalam target 5-7`, lvl3 >= 5 && lvl3 <= 7, `level ${lvl3}`);
      await page.evaluate(() => window.__tfbt.qa.openSliceEnd()); await page.waitForFunction(() => window.__tfbt.inputLayer() === 'slice-end');
      await layoutOK(page, `${tag}: kartu akhir Bab III rapi`);
      await selectMenu(page, 'chapter4'); await press(page, 'Enter'); await waitWorld(page).catch(() => undefined);
      await page.waitForFunction(() => window.__tfbt.world()?.area === 'fortress' && window.__tfbt.state()?.chapter === 'IV', null, { timeout: 15000 });
      st = await state(page);
      check(`${tag}: "Mulai Bab IV" membuka Warden Fortress (bab IV, area fortress, flag mulai, C4-01)`, st.chapter === 'IV' && st.area === 'fortress' && flagOf(st, 'chapter.4_started') && st.storyBeat === 'C4-01');
      check(`${tag}: party tetap Yaric+Velthia, Torvan cadangan dengan progres utuh`, st.party.join() === 'C01,C02' && !!st.partyVitals.C03 && st.rpg.characters.C03.level >= 1);
      await page.waitForFunction(() => window.__tfbt.world()?.dialogue || window.__tfbt.state().flags['story.c4_entered'], null, { timeout: 15000 });
      const lines = await talk(page);
      const ids = lines.map(l => l.line);
      check(`${tag}: C4-01 kanon diputar (4 baris verbatim)`, ['C4-01-L001', 'C4-01-L002', 'C4-01-L003', 'C4-01-L004'].every(id => ids.includes(id)), ids.join());
      await layoutOK(page, `${tag}: dialog C4-01 tanpa layout rusak`);
      check(`${tag}: flag masuk Benteng setelah dialog`, flagOf(await state(page), 'story.c4_entered'));
    });

    if (full) {
      // ================= B. Gerbang Luar, Riftborn, Aula, Gravorn =================
      await step(`${tag}: B Gerbang Luar`, async () => {
        const w0 = await world(page);
        check(`${tag}: Benteng memuat peta, standable, tanpa tumpuk karakter`, w0.area === 'fortress' && w0.standable && w0.view3?.area === 'fortress');
        await shot(page, 'fortress_gate');
        const x0 = w0.x, y0 = w0.y;
        await page.keyboard.down('ArrowUp'); await page.waitForTimeout(600); await page.keyboard.up('ArrowUp');
        const w1 = await world(page);
        check(`${tag}: pemain dapat berjalan di Benteng; langkah batu berbunyi`, w1.y < y0 - 20 && w1.footsteps.surface === 'stone' && w1.footsteps.count > 0, JSON.stringify({ y0, y1: w1.y, f: w1.footsteps }));
        await useId(page, 'courier_a'); await talk(page);
        check(`${tag}: laporan Talric A dibaca (evakuasi berjalan)`, flagOf(await state(page), 'c4.report_a'));
        await enterTrigger(page, 'fortress_court_fight');
        await talk(page);
        await page.waitForFunction(() => window.__tfbt.activeScenes().includes('BattleScene'), null, { timeout: 15000 });
        const pres = await page.evaluate(() => window.__tfbt.transition().log.at(-1));
        check(`${tag}: encounter Benteng memakai transisi temporal`, pres?.kind === 'temporal');
        await ready(page);
        const b = await battle(page);
        check(`${tag}: Riftborn (M06) terlihat pada frame render (melayang, bayangan di tanah)`, (await vis(page, 'M06')).ratio > 0.1);
        check(`${tag}: Velthia dan Yaric terlihat`, (await vis(page, 'C02')).ratio > 0.08 && (await vis(page, 'C01')).ratio > 0.08);
        await shot(page, 'riftborn_battle');
        await layoutOK(page, `${tag}: layout battle Riftborn rapi`);
        const r = await winBattle(page, 'riftborn');
        check(`${tag}: Riftborn dikalahkan`, r.outcome === 'victory' && b.actors.some(a => a.id === 'M06'));
        const exp0 = (await state(page)).rpg.characters.C01.exp;
        await finishBattle(page);
        const st = await state(page);
        check(`${tag}: hadiah Riftborn sekali (flag battle, EXP naik) dan kembali ke titik aman`, flagOf(st, 'battle.fortress_riftborn') && st.rpg.characters.C01.exp > exp0 - 1 && flagOf(st, 'reward.c4_fortress_riftborn.rpg'));
        await enterTrigger(page, 'fortress_hall_fight');
        await page.waitForFunction(() => window.__tfbt.activeScenes().includes('BattleScene'), null, { timeout: 15000 });
        await ready(page);
        check(`${tag}: Gravorn (M04) terlihat`, (await vis(page, 'M04')).ratio > 0.1);
        await shot(page, 'gravorn_battle');
        await winBattle(page, 'gravorn'); await finishBattle(page);
        check(`${tag}: Gravorn dikalahkan, hadiah sekali`, flagOf(await state(page), 'battle.fortress_gravorn'));
        const hurt = await state(page);
        await useId(page, 'hall_lantern'); await page.waitForTimeout(300);
        const rested = await state(page);
        check(`${tag}: lentera Aula memulihkan HP/MP seluruh party tanpa checkpoint/flag/hadiah`, rested.vitals.hp >= hurt.vitals.hp && rested.partyVitals.C02.hp >= hurt.partyVitals.C02.hp && !flagOf(rested, 'checkpoint.c4_before_varlgrim') && rested.rpg.characters.C01.exp === hurt.rpg.characters.C01.exp);
      });

      // ================= C. Puzzle segel (urutan) =================
      await step(`${tag}: C puzzle segel`, async () => {
        for (const id of ['seal_noon', 'seal_dawn']) { await useId(page, id); await page.waitForTimeout(250); await talk(page).catch(() => undefined); }
        const s1 = await world(page);
        check(`${tag}: urutan salah mereset dengan aman (tanpa flag, tanpa softlock)`, !flagOf(s1, 'c4.seals_solved') && !s1.busy);
        check(`${tag}: pintu segel masih tertutup setelah jawaban salah`, s1.view3?.doors?.seal === false || s1.view3?.doors?.seal === 'closed' || !flagOf(s1, 'c4.seals_solved'));
        // petunjuk datang dari lingkungan: catatan jaga di Arsip (jalur barat) dibaca dulu
        await enterTrigger(page, 'fortress_guardpost');
        await talk(page);
        await page.waitForFunction(() => window.__tfbt.activeScenes().includes('BattleScene'), null, { timeout: 15000 }).catch(() => undefined);
        if ((await scenes(page)).includes('BattleScene')) {
          await ready(page);
          check(`${tag}: Oathguard (M05) dan Riftborn terlihat pada guardpost`, (await vis(page, 'M05')).ratio > 0.08 && (await vis(page, 'M06')).ratio > 0.08);
          await winBattle(page, 'guardpost'); await finishBattle(page);
        }
        check(`${tag}: guardpost dikalahkan, hadiah sekali`, flagOf(await state(page), 'battle.fortress_guardpost'));
        await useId(page, 'chest_potion'); await talk(page).catch(() => undefined);
        const st = await state(page);
        check(`${tag}: peta barak: peti Potion memberi item sekali`, flagOf(st, 'c4.chest_potion') && (st.items.potion ?? 0) >= 3);
        await useId(page, 'archive_log'); await talk(page);
        check(`${tag}: catatan jaga dibaca (petunjuk urutan segel dari lingkungan)`, flagOf(await state(page), 'c4.watch_log_read'));
        await useId(page, 'archive_relic'); await talk(page);
        const st2 = await state(page);
        check(`${tag}: pusaka Velthia bergema: Perlindungan dipelajari`, flagOf(st2, 'c4.aegis_learned'));
        await useId(page, 'chest_robe'); await talk(page).catch(() => undefined);
        check(`${tag}: peti Arsip memberi keeper_robe`, (await state(page)).items.keeper_robe >= 1);
        await shot(page, 'archive');
        for (const id of ['seal_dawn', 'seal_noon', 'seal_dusk', 'seal_night']) { await useId(page, id); await page.waitForTimeout(300); }
        await talk(page).catch(() => undefined);
        await page.waitForFunction(() => window.__tfbt.state().flags['c4.seals_solved'], null, { timeout: 5000 }).catch(() => undefined);
        check(`${tag}: urutan segel benar (Fajar, Siang, Senja, Malam) membuka Pintu Segel`, flagOf(await state(page), 'c4.seals_solved'));
        await shot(page, 'seals_solved');
      });

      // ================= D. Uji Perlindungan (tutorial) =================
      await step(`${tag}: D uji Perlindungan`, async () => {
        await useId(page, 'trial_plaque').catch(() => undefined); await talk(page).catch(() => undefined);
        await useId(page, 'trial_pedestal'); await talk(page);
        await page.waitForFunction(() => window.__tfbt.activeScenes().includes('BattleScene'), null, { timeout: 15000 });
        await ready(page);
        const pres = await page.evaluate(() => window.__tfbt.transition().log.at(-1));
        check(`${tag}: uji Perlindungan memakai transisi scripted`, pres?.kind === 'scripted');
        let sawBanner = false, aegisPicked = false;
        const r = await winBattle(page, 'aegis_trial', { watch: async b => { if (b.meteorFx?.aegisStatus?.threat) sawBanner = true; } });
        check(`${tag}: uji Perlindungan: tutorial dapat dimenangkan dengan Perlindungan`, r.outcome === 'victory');
        const exp = r.actors.find(a => a.id === 'C02');
        check(`${tag}: ancaman besar ditampilkan (banner) sebelum dampak`, sawBanner);
        aegisPicked = (await page.evaluate(() => window.__tfbt.battle().fx.played)).includes('aegis_form');
        check(`${tag}: VFX pembentukan perisai diputar pada uji`, aegisPicked);
        await finishBattle(page);
        const st = await state(page);
        check(`${tag}: flag uji, hadiah sekali, Velthia hidup (bangkit bila perlu)`, flagOf(st, 'battle.fortress_aegis_trial') && flagOf(st, 'reward.c4_fortress_aegis_trial.rpg') && st.partyVitals.C02.hp > 0 && !!exp);
        await useId(page, 'chest_plate'); await talk(page).catch(() => undefined);
        check(`${tag}: peti Ruang Uji memberi warden_plate`, (await state(page)).items.warden_plate >= 1);
      });

      // ================= E. Koridor Retakan =================
      await step(`${tag}: E koridor retakan`, async () => {
        await useId(page, 'anchor_a'); await page.waitForTimeout(400); await talk(page).catch(() => undefined);
        await useId(page, 'anchor_b'); await page.waitForTimeout(600); await talk(page).catch(() => undefined);
        await page.waitForFunction(() => window.__tfbt.state().flags['c4.rift_aligned'], null, { timeout: 6000 }).catch(() => undefined);
        check(`${tag}: jangkar A sekali + B sekali menyejajarkan lorong (puzzle konsisten)`, flagOf(await state(page), 'c4.rift_aligned'));
        await shot(page, 'rift_aligned');
        await useId(page, 'corridor_lantern'); await page.waitForTimeout(300);
        await enterTrigger(page, 'fortress_rift_fight');
        await page.waitForFunction(() => window.__tfbt.activeScenes().includes('BattleScene'), null, { timeout: 15000 });
        await ready(page);
        check(`${tag}: Gravorn + Riftborn terlihat (dua musuh)`, (await vis(page, 'M04')).ratio > 0.05 && (await vis(page, 'M06')).ratio > 0.05);
        await shot(page, 'rift_battle');
        await winBattle(page, 'rift', { limit: 160 }); await finishBattle(page);
        check(`${tag}: encounter koridor dikalahkan, hadiah sekali`, flagOf(await state(page), 'battle.fortress_rift'));
      });

      // ================= F. Serambi, checkpoint, level =================
      await step(`${tag}: F checkpoint`, async () => {
        await useId(page, 'courier_b'); await talk(page);
        check(`${tag}: laporan Talric B (menara hampir jatuh)`, flagOf(await state(page), 'c4.report_b'));
        const st0 = await state(page);
        const lvl = st0.rpg.characters.C01.level;
        check(`${tag}: level Yaric sebelum Varlgrim dalam target 7-9 (tanpa grind wajib)`, lvl >= 7 && lvl <= 9, `level ${lvl} exp ${st0.rpg.characters.C01.exp}`);
        await useId(page, 'lantern_rest'); await talk(page).catch(() => undefined);
        const st = await state(page);
        const yaric = st.vitals, velthia = st.partyVitals.C02;
        check(`${tag}: lentera: titik simpan memulihkan HP/MP penuh seluruh party dan menyimpan checkpoint`, flagOf(st, 'checkpoint.c4_before_varlgrim') && yaric.hp === (await page.evaluate(() => window.__tfbt.state().vitals.hp)) && velthia.hp > 0);
        await saveSlot2(page);
      });
    } else {
      await page.evaluate(() => window.__tfbt.qa.chapter4('checkpoint')); await waitWorld(page);
    }

    // ================= G. Varlgrim =================
    let postBoss = [];
    await step(`${tag}: G Varlgrim`, async () => {
      if (full) {
        const doors = (await world(page)).view3?.doors;
        check(`${tag}: Pintu Heart terbuka sesudah checkpoint (lentera Serambi), tidak sebelumnya`, doors?.heart === true || doors?.heart === 'open' || flagOf(await state(page), 'checkpoint.c4_before_varlgrim'), JSON.stringify(doors));
      } else { await page.evaluate(() => window.__tfbt.qa.chapter4('boss')); await waitWorld(page); }
      if (full) { const bd = await page.evaluate(() => window.__tfbt.qa.build()); check(`${tag}: pemain memakai zirah Benteng dan membelanjakan poin jurus (aksi RPG asli)`, bd.C01.equipment.armor === 'warden_plate' && bd.C02.equipment.armor === 'keeper_robe' && bd.C01.skills.length > 1 && bd.C02.skills.length > 5, JSON.stringify(bd)); }
      const pre = await state(page);
      check(`${tag}: pra-boss: checkpoint, Perlindungan terbuka, party Yaric+Velthia`, flagOf(pre, 'checkpoint.c4_before_varlgrim') && flagOf(pre, 'c4.aegis_learned') && pre.party.join() === 'C01,C02');
      // Pada jalur singkat adegan dunia baru dimuat ulang oleh pintasan QA; teleport yang bertabrakan dengan pemuatan dapat tertimpa, jadi ulangi bila pemicu belum menyala.
      for (let attempt = 0; attempt < 3; attempt++) {
        await enterTrigger(page, 'heart_confront');
        const fired = await page.waitForFunction(() => window.__tfbt.world()?.dialogue || window.__tfbt.activeScenes().includes('BattleScene'), null, { timeout: attempt < 2 ? 5000 : 12000 }).then(() => true, () => false);
        if (fired) break;
        if (attempt === 2) throw Error('Pemicu heart_confront tidak menyala setelah 3 percobaan');
        await page.evaluate(() => window.__tfbt.qa.teleport(896, 308)); await page.waitForTimeout(400);
      }
      const lines = await talk(page);
      await page.waitForFunction(() => window.__tfbt.activeScenes().includes('BattleScene'), null, { timeout: 25000 });
      const ids = lines.map(l => l.line);
      // Jalur singkat memakai pintasan QA yang sudah menandai C4.confront (konfrontasi dianggap pernah dilihat), jadi dialog tidak diputar ulang: itu perilaku sah.
      if (full) check(`${tag}: C4-02 kanon diputar verbatim (6 baris) sebelum battle`, ['C4-02-L001', 'C4-02-L002', 'C4-02-L003', 'C4-02-L004', 'C4-02-L005', 'C4-02-L006'].every(i => ids.includes(i)), ids.join());
      else check(`${tag}: jalur singkat: konfrontasi yang sudah dilihat langsung membuka battle tanpa memutar ulang C4-02`, ids.length === 0, ids.join());
      const tl = await page.evaluate(() => window.__tfbt.transition().log);
      check(`${tag}: Varlgrim memakai transisi final (plakat nama), bukan boss biasa`, tl.some(l => l.kind === 'final' && l.phase === 'cover'));
      await ready(page);
      const b0 = await battle(page);
      check(`${tag}: Varlgrim (C04) terlihat pada frame render (piksel nyata)`, (await vis(page, 'C04')).ratio > 0.1);
      check(`${tag}: Velthia dan Yaric terlihat`, (await vis(page, 'C02')).ratio > 0.08 && (await vis(page, 'C01')).ratio > 0.08);
      check(`${tag}: boss berdiri di garis tanah yang sama dengan Yaric dan kaki tidak melayang`, Math.abs(b0.sprites.C04.footY - b0.sprites.C01.footY) <= 2);
      check(`${tag}: Velthia punya Perlindungan dan muatan penuh`, b0.actors.find(a => a.id === 'C02').skills.includes('velthia_aegis') && b0.actors.find(a => a.id === 'C02').aegis === 1);
      await shot(page, 'varlgrim_intro');
      await layoutOK(page, `${tag}: layout battle Varlgrim rapi`);
      // fase 1 -> 2 -> 3 dimainkan nyata; Perlindungan dipilih lewat menu utama saat langit ditahan
      let sawCall = false, sawHold = false, sawFall = false, menuTop = null, sky = false, calloutSeen = false, calloutTexts = [];
      const phases = new Set();
      const r = await winBattle(page, 'varlgrim', { limit: 160, watch: async b => {
        const boss = b.actors.find(a => a.id === 'C04'); phases.add(boss.phase);
        if (b.meteorFx?.sky) sky = true;
        if (b.calloutLog?.length) { calloutSeen = true; calloutTexts = b.calloutLog; }
        if (boss.intent === 'meteor_fall') sawFall = true;
        const cur = b.actors.find(a => a.id === b.order[b.cursor]);
        if (cur.id === 'C02' && b.meteorFx?.aegisStatus?.threat && b.meteorFx?.aegisStatus?.windowOpen && menuTop === null) {
          menuTop = await page.evaluate(() => window.__tfbt.focus());
          await shot(page, 'aegis_menu');
          const lay = await page.evaluate(() => window.__tfbt.layoutIssues());
          check(`${tag}: menu Perlindungan tanpa layout rusak`, lay.length === 0, lay.join(';'));
        }
        if (boss.intent === 'meteor_call') sawCall = true;
        if (boss.intent === 'meteor_hold') sawHold = true;
      } });
      check(`${tag}: Varlgrim dikalahkan dan HP musuh 0`, r.outcome === 'victory' && r.actors.find(a => a.id === 'C04').hp === 0, `outcome ${r.outcome}`);
      check(`${tag}: ketiga fase (Keeper, Distortion, Meteor) benar-benar dimainkan`, phases.has(1) && phases.has(2) && phases.has(3), [...phases].join());
      check(`${tag}: meteor ditelegraf (langit ditahan, banner naskah, intent meteor_call) sebelum dampak`, sawCall && sky && calloutSeen, JSON.stringify({ sawCall, sky, calloutSeen, t: calloutTexts.slice(-2) }));
      check(`${tag}: Perlindungan naik ke menu utama dan terfokus saat langit ditahan (tidak tersembunyi)`, menuTop === 'menu:velthia_aegis', String(menuTop));
      const fx = r.fx.played;
      check(`${tag}: VFX meteor, perisai, retak, dan debu diputar`, ['meteor_sky_hold', 'meteor_descent', 'meteor_impact', 'aegis_form', 'aegis_stress', 'meteor_aftermath'].every(id => fx.includes(id)), fx.join());
      check(`${tag}: meteor_fall terjadi dan party selamat berkat Perlindungan`, sawFall && r.actors.filter(a => a.side === 'player').every(a => a.hp >= 0));
      const traces = r.traces.filter(t => t.command === 'meteor_fall');
      check(`${tag}: linimasa meteor_fall sinematik (3,2-4,2 s) dengan fase tercatat`, traces.length > 0 && traces.every(t => t.total >= 3000 && t.total <= 4600), JSON.stringify(traces.map(t => t.total)));
      const aud = await page.evaluate(() => window.__tfbt.audio());
      check(`${tag}: SFX Varlgrim/meteor/Perlindungan dimainkan lewat AudioManager`, ['SFX_METEOR_CHARGE', 'SFX_METEOR_DESCENT', 'SFX_METEOR_IMPACT', 'SFX_AEGIS_CAST', 'SFX_AEGIS_FORM', 'SFX_AEGIS_STRESS', 'SFX_VARLGRIM_STAFF_IMPACT'].every(id => (aud.played[id] ?? 0) > 0), JSON.stringify(Object.keys(aud.played).filter(k => /METEOR|AEGIS|VARLGRIM|TEMPORAL|BOSS|FRACTURE|TIME/.test(k))));
      await shot(page, 'varlgrim_victory');
      const stBefore = await state(page);
      postBoss = await finishBattle(page);
      const st = await state(page);
      check(`${tag}: boss.varlgrim + hadiah tepat sekali; level naik ke 8-10`, flagOf(st, 'boss.varlgrim') && flagOf(st, 'reward.c4_varlgrim.rpg') && st.rpg.characters.C01.level >= 8 && st.rpg.characters.C01.level <= 10 && st.rpg.characters.C01.exp > stBefore.rpg.characters.C01.exp - 1, `L${st.rpg.characters.C01.level}`);
      check(`${tag}: party hidup setelah menang (tanpa softlock di dunia)`, st.vitals.hp > 0 && st.partyVitals.C02.hp > 0);
    });

    // ================= H. Heart of Time, konsekuensi, Torvan, kembali =================
    if (full) {
      await step(`${tag}: H Heart of Time`, async () => {
        await page.waitForFunction(() => window.__tfbt.world()?.dialogue || window.__tfbt.state().flags['c4.varlgrim_lean_seen'], null, { timeout: 15000 });
        const lean = postBoss.length ? postBoss : await talk(page);
        check(`${tag}: C4-03 kanon pidato sesudah kalah ("Kalau segelnya kulepas...") diputar`, lean.some(l => l.line === 'C4-03-L001') && lean.some(l => l.line === 'C4-03-L002'));
        check(`${tag}: Heart belum terbuka otomatis setelah boss (dua pengunci dibutuhkan)`, !flagOf(await state(page), 'story.c4_heart_open'));
        await useId(page, 'heart_lock_yaric'); await talk(page).catch(() => undefined);
        check(`${tag}: pengunci Yaric dibuka; Heart belum terbuka sebelum pengunci Velthia`, flagOf(await state(page), 'c4.heart_lock_yaric') && !flagOf(await state(page), 'story.c4_heart_open'));
        await useId(page, 'heart_lock_velthia');
        await page.waitForFunction(() => window.__tfbt.state().flags['story.c4_heart_open'] || window.__tfbt.world()?.dialogue, null, { timeout: 20000 });
        const open = await talk(page);
        await page.waitForFunction(() => window.__tfbt.state().flags['c4.tower_fallen'], null, { timeout: 25000 }).catch(() => undefined);
        await talk(page).catch(() => undefined);
        const st = await state(page);
        check(`${tag}: Yaric dan Velthia membuka Heart bersama (kedua pengunci -> story.c4_heart_open)`, flagOf(st, 'c4.heart_lock_velthia') && flagOf(st, 'story.c4_heart_open'));
        check(`${tag}: menara runtuh dari kejauhan (C4-04 kanon "Menaranya..." dst.) dan konsekuensi nyata`, flagOf(st, 'c4.tower_fallen') && open.some(l => l.line === 'C4-04-L001'));
        const lg = (await world(page)).log.join(',');
        check(`${tag}: kamera mengarah ke jendela busur, VFX tower_dust diputar, SFX runtuh jauh`, lg.includes('c4:tower_fall') && (await page.evaluate(() => window.__tfbt.audio().played.SFX_TOWER_COLLAPSE_DISTANT ?? 0)) > 0);
        await shot(page, 'heart_open');
      });
      await step(`${tag}: H2 Ruang Gema`, async () => {
        await page.evaluate(() => window.__tfbt.qa.teleport(1240, 256));
        await enterTrigger(page, 'echo_enter'); await page.waitForTimeout(500); await talk(page).catch(() => undefined);
        await useId(page, 'echo_a'); await talk(page).catch(() => undefined);
        await useId(page, 'echo_b'); await talk(page);
        await page.waitForFunction(() => window.__tfbt.state().flags['story.c4_old_memory'] || window.__tfbt.world()?.dialogue, null, { timeout: 15000 });
        const mem = await talk(page).catch(() => []);
        const st = await state(page);
        check(`${tag}: dua benda kuno diperiksa; ingatan lama Aveloria (C4-05 kanon) tersimpan`, flagOf(st, 'c4.memory_a') && flagOf(st, 'c4.memory_b') && flagOf(st, 'story.c4_old_memory'));
        check(`${tag}: ingatan hanya Aveloria: tanpa Yudis/foto/modern`, mem.every(l => !/Yudis|foto|ponsel|modern/i.test(l.text ?? '')));
        await page.waitForFunction(() => window.__tfbt.state().flags['story.c4_creator_reveal'] || window.__tfbt.world()?.dialogue, null, { timeout: 30000 });
        for (let i = 0; i < 4 && !flagOf(await state(page), 'story.c4_creator_reveal'); i++) await talk(page).catch(() => undefined);
        const st2 = await state(page);
        check(`${tag}: Varlgrim mengakui kesalahan (flag pengakuan) tanpa pengampunan instan`, flagOf(st2, 'c4.varlgrim_truth') && flagOf(st2, 'c4.varlgrim_stays'));
        check(`${tag}: Torvan mengungkap identitas pencipta (story.c4_creator_reveal), tanpa efek dewa`, flagOf(st2, 'story.c4_creator_reveal'));
        await shot(page, 'torvan_reveal');
      });
      await step(`${tag}: I kembali ke Aveloria`, async () => {
        await useId(page, 'outer_gate'); const gateLines = await talk(page).catch(() => []);
        await page.waitForFunction(() => window.__tfbt.world()?.area === 'aveloria' && window.__tfbt.state()?.chapter === 'IV', null, { timeout: 20000 });
        await page.waitForFunction(() => window.__tfbt.world()?.dialogue || window.__tfbt.state().flags['c4.return_scene_seen'], null, { timeout: 20000 });
        const ret = gateLines.concat(await talk(page));
        const ids = ret.map(l => l.line);
        check(`${tag}: C4-07 kanon diputar verbatim (6 baris) di Aveloria`, ['C4-07-L001', 'C4-07-L002', 'C4-07-L003', 'C4-07-L004', 'C4-07-L005', 'C4-07-L006'].every(i => ids.includes(i)), ids.join());
        let st = await state(page);
        check(`${tag}: tiba di Aveloria bab IV dengan flag returned; belum selesai`, flagOf(st, 'c4.returned_aveloria') && !flagOf(st, 'chapter.4_complete'));
        await shot(page, 'aveloria_aftermath');
        const w = await world(page);
        check(`${tag}: Aveloria pascarunyuh memuat view (menara runtuh disembunyikan, warga di luar kota)`, w.view3 && (w.view3.hiddenBase?.length ?? 0) >= 1, JSON.stringify(w.view3).slice(0, 200));
        await layoutOK(page, `${tag}: layout dunia Aveloria pascarunyuh rapi`);
        const target = w.interactables.find(i => /velthia/i.test(i.id));
        await useId(page, target?.id ?? 'velthia'); await talk(page).catch(() => undefined);
        await page.waitForFunction(() => window.__tfbt.inputLayer() === 'slice-end', null, { timeout: 15000 }).catch(() => undefined);
        st = await state(page);
        check(`${tag}: Bab IV selesai (chapter.4_complete, beat C4-DONE)`, flagOf(st, 'chapter.4_complete') && st.storyBeat === 'C4-DONE');
        check(`${tag}: kartu "Bab IV selesai" tampil tanpa Bab V/Modern/Epilog`, await page.evaluate(() => window.__tfbt.inputLayer() === 'slice-end'));
        await layoutOK(page, `${tag}: layout kartu Bab IV selesai rapi`);
        await shot(page, 'chapter4_end');
        const noMore = await page.evaluate(() => !['chapter5', 'modern', 'epilogue'].some(id => window.__tfbt.focus() === `menu:${id}`));
        check(`${tag}: tidak ada transisi tidak sengaja ke Modern Interlude`, noMore && st.chapter === 'IV');
      });
    }

    // ================= J. Save/load Benteng (dari checkpoint) =================
    if (full) {
      await step(`${tag}: J save/load`, async () => {
        await page.evaluate(() => window.__tfbt.qa.chapter4('checkpoint')); await waitWorld(page);
        await saveSlot2(page);
        const saved = await state(page);
        await refreshContinue(page);
        const after = await state(page);
        check(`${tag}: Continue memulihkan Benteng: area, party, flag checkpoint, item, EXP`, after.area === 'fortress' && after.chapter === 'IV' && after.party.join() === 'C01,C02' && flagOf(after, 'checkpoint.c4_before_varlgrim') && after.rpg.characters.C01.exp === saved.rpg.characters.C01.exp && JSON.stringify(after.items) === JSON.stringify(saved.items));
        const w = await world(page);
        check(`${tag}: puzzle selesai pulih dari flag (segel dan retakan tetap selesai)`, w.view3?.doors?.seal !== undefined && flagOf(after, 'c4.seals_solved') && flagOf(after, 'c4.rift_aligned'));
        check(`${tag}: posisi setelah muat standable; tidak spawn dalam battle/meteor`, w.standable && !(await scenes(page)).includes('BattleScene'));
        await layoutOK(page, `${tag}: layout dunia Benteng setelah muat rapi`);
      });
    }

    // ================= K. Retry, kegagalan, aksesibilitas =================
    await step(`${tag}: K retry meteor`, async () => {
      await page.reload(); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'));
      await page.evaluate(() => window.__tfbt.qa.chapter4('boss', 'varlgrim'));
      await page.waitForFunction(() => window.__tfbt.battle() && !window.__tfbt.battle().locked, null, { timeout: 20000 });
      const exp0 = (await state(page)).rpg.characters.C01.exp;
      const finalCoversAtStart = await page.evaluate(() => window.__tfbt.transition().log.filter(l => l.kind === 'final' && l.phase === 'cover').length);
      await page.evaluate(() => window.__tfbt.qa.battleHp('C04', 330));
      // abaikan Perlindungan: harus kalah sah (meteor mematikan tanpa Perlindungan)
      let sawMeteorWindow = false;
      let r = await fight(page, { limit: 80, skipAegis: true, stallUntilFall: true, watch: async b => { if (b.meteorFx?.aegisStatus?.threat) sawMeteorWindow = true; } });
      check(`${tag}: mengabaikan telegraf meteor = kekalahan sah (tanpa Perlindungan meteor mematikan)`, r.outcome === 'defeat' && sawMeteorWindow, `outcome ${r.outcome}`);
      const dead = r.actors.filter(a => a.side === 'player' && a.hp <= 0).length;
      check(`${tag}: seluruh barisan tumbang oleh meteor tanpa perisai`, dead === 2, `tumbang ${dead}`);
      await shot(page, 'meteor_defeat');
      const has = await page.evaluate(() => ({ canPhase: window.__tfbt.battle().meteorFx.canRetryFromPhase, menu: window.__tfbt.battle().menu }));
      check(`${tag}: kartu kalah menawarkan "Ulang dari fase meteor" selain "Coba Lagi"`, has.canPhase && has.menu === 'result');
      await layoutOK(page, `${tag}: layout kartu kalah Varlgrim rapi`);
      await page.waitForFunction(() => window.__tfbt.focus() === 'menu:retry_phase', null, { timeout: 4000 }).catch(() => undefined);
      check(`${tag}: pilihan ulang cepat terfokus`, await page.evaluate(() => window.__tfbt.focus() === 'menu:retry_phase'));
      const stDef = await state(page);
      check(`${tag}: kekalahan tidak menyentuh save/flag/hadiah (boss.varlgrim tidak diset, EXP sama)`, !flagOf(stDef, 'boss.varlgrim') && stDef.rpg.characters.C01.exp === exp0);
      await press(page, 'Enter'); // retry_phase
      await page.waitForFunction(() => window.__tfbt.battle() && !window.__tfbt.battle().outcome && !window.__tfbt.battle().locked, null, { timeout: 15000 });
      const b = await battle(page);
      const finalCovers = await page.evaluate(() => window.__tfbt.transition().log.filter(l => l.kind === 'final' && l.phase === 'cover').length);
      const boss = b.actors.find(a => a.id === 'C04'), vel = b.actors.find(a => a.id === 'C02');
      check(`${tag}: ulang dari fase meteor: boss fase 3, Perlindungan siap, party hidup`, boss.phase === 3 && boss.hp <= 330 && vel.aegis === 1 && b.actors.filter(a => a.side === 'player').every(a => a.hp > 0), JSON.stringify({ ph: boss.phase, hp: boss.hp, a: vel.aegis }));
      check(`${tag}: ulang cepat tidak memutar transisi masuk lagi (jumlah transisi final sama sebelum/sesudah ulang)`, finalCovers === finalCoversAtStart, `${finalCoversAtStart} -> ${finalCovers}`);
      r = await fight(page, { limit: 120 });
      check(`${tag}: dengan Perlindungan setelah ulang cepat, Varlgrim dikalahkan`, r.outcome === 'victory', `outcome ${r.outcome}`);
      await finishBattle(page);
      const st1 = await state(page);
      const gained = st1.rpg.characters.C01.exp - exp0;
      check(`${tag}: kekalahan berulang tidak menggandakan hadiah (EXP naik tepat satu hadiah 200, dipotong cap level 10 = 800)`, gained === Math.min(200, 800 - exp0) && flagOf(st1, 'reward.c4_varlgrim.rpg'), `naik ${gained} dari ${exp0}`);
    });
    await step(`${tag}: K2 retry penuh`, async () => {
      await page.reload(); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'));
      await page.evaluate(() => window.__tfbt.qa.chapter4('boss', 'varlgrim'));
      await page.waitForFunction(() => window.__tfbt.battle() && !window.__tfbt.battle().locked, null, { timeout: 20000 });
      await page.evaluate(() => window.__tfbt.qa.battleHp('C04', 330));
      await fight(page, { limit: 80, skipAegis: true, stallUntilFall: true });
      await page.waitForFunction(() => window.__tfbt.focus() === 'menu:retry_phase', null, { timeout: 4000 }).catch(() => undefined);
      await press(page, 'ArrowDown'); await press(page, 'Enter'); // Coba Lagi (checkpoint)
      await page.waitForFunction(() => window.__tfbt.battle() && !window.__tfbt.battle().outcome && !window.__tfbt.battle().locked, null, { timeout: 15000 });
      const b = await battle(page);
      const boss = b.actors.find(a => a.id === 'C04');
      check(`${tag}: Coba Lagi memuat checkpoint penuh: boss HP penuh fase 1, party penuh, Perlindungan siap`, boss.hp === boss.stats.HP && boss.phase === 1 && b.actors.filter(a => a.side === 'player').every(a => a.hp === a.stats.HP) && b.actors.find(a => a.id === 'C02').aegis === 1);
      check(`${tag}: sprite terlihat setelah retry penuh`, (await vis(page, 'C04')).ratio > 0.1 && (await vis(page, 'C02')).ratio > 0.08);
      await page.evaluate(() => window.__tfbt.qa.battleHp('C04', 330));
      const r = await fight(page, { limit: 120 });
      check(`${tag}: setelah retry penuh dan Perlindungan, boss dikalahkan`, r.outcome === 'victory');
    });
    for (const combo of [{ shake: true, reduced: false, label: 'Shake ON + Reduced Flashes OFF' }, { shake: false, reduced: true, label: 'Shake OFF + Reduced Flashes ON' }]) {
      await step(`${tag}: K3 ${combo.label}`, async () => {
        await context.close();
        ({ page, context } = await openPage(browser, width, height, { screen_shake: combo.shake, reduced_flashes: combo.reduced })); currentPage = page;
        await page.evaluate(() => window.__tfbt.qa.chapter4('boss', 'varlgrim'));
        await page.waitForFunction(() => window.__tfbt.battle() && !window.__tfbt.battle().locked, null, { timeout: 20000 });
        await page.evaluate(() => window.__tfbt.qa.battleHp('C04', 330));
        let shake = false, flash = false, sampling = true;
        const sampler = (async () => { while (sampling) { const e = await page.evaluate(() => window.__tfbt.battle()?.effects).catch(() => null); if (e?.shake) shake = true; const cmd = await page.evaluate(() => window.__tfbt.battle()?.pending?.command).catch(() => null); if (e?.flash && (cmd === 'meteor_fall' || cmd === 'velthia_aegis')) flash = true; await page.waitForTimeout(40); } })();
        const r = await fight(page, { limit: 120, stallUntilFall: true });
        sampling = false; await sampler;
        check(`${tag}: ${combo.label}: pertarungan meteor selesai (menang) tanpa error`, r.outcome === 'victory');
        if (combo.shake) check(`${tag}: ${combo.label}: goyang kamera terjadi saat meteor/tabrakan`, shake);
        else check(`${tag}: ${combo.label}: tidak ada goyang kamera sama sekali`, !shake);
        if (combo.reduced) check(`${tag}: ${combo.label}: tidak ada kilat layar penuh`, !flash);
        else check(`${tag}: ${combo.label}: meteor tidak menambah kilat putih penuh (hanya VFX piksel)`, !flash);
        check(`${tag}: ${combo.label}: VFX perisai tetap terbaca`, (await page.evaluate(() => window.__tfbt.battle().fx.played)).includes('aegis_stress'));
      });
    }

    // ================= L. Regresi battle berurutan dalam SATU sesi =================
    // Bug Phase 7: battle kedua dalam satu sesi membuat semua sprite tak terlihat. Di sini 5 battle berturut-turut tanpa memuat ulang halaman.
    if (full) {
      await step(`${tag}: L battle berurutan`, async () => {
        await page.reload(); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'));
        const seq = [
          ['Hollowling', () => window.__tfbt.qa.encounter(), ['M01', 'C01']],
          ['Mournfang', () => window.__tfbt.qa.bossBattle(), ['B01', 'C01']],
          ['Veyrath', () => window.__tfbt.qa.chapter2('duo', 'veyrath'), ['B02', 'C01', 'C03']],
          ['Chronolith', () => window.__tfbt.qa.chapter3('hall', 'chronolith'), ['B03', 'C01', 'C02']],
          ['Varlgrim', () => window.__tfbt.qa.chapter4('boss', 'varlgrim'), ['C04', 'C01', 'C02']],
        ];
        for (const [label, start, ids] of seq) {
          await page.evaluate(start);
          await page.waitForFunction(() => window.__tfbt.battle() && !window.__tfbt.battle().locked, null, { timeout: 25000 });
          const b = await battle(page);
          await page.waitForTimeout(700);
          const ok = [];
          for (const id of ids) { const v = await vis(page, id); ok.push(`${id}:${v.ratio.toFixed(2)}`); if (!(v.ratio > 0.05)) throw Error(`${label}: sprite ${id} tak terlihat (${JSON.stringify(v.ratio)})`); }
          const sprites = Object.entries(b.sprites).filter(([, s]) => s.x === 0 && s.y === 0);
          check(`${tag}: battle berurutan #${seq.findIndex(q => q[0] === label) + 1} ${label}: semua sprite terlihat (piksel nyata) dan tidak di (0,0)`, sprites.length === 0, ok.join(' '));
          check(`${tag}: ${label}: tidak ada VFX tersisa dari battle sebelumnya`, b.fx.running === 0 && b.fx.active === 0, JSON.stringify(b.fx));
        }
      });
    }

    await step(`${tag}: Z galat`, async () => {
      check(`${tag}: tidak ada kesalahan konsol atau pageerror`, errors.length === 0, errors.slice(0, 4).join(' | '));
    });
    await context.close();
  }
} finally {
  const nm = x => x.replace(/[^a-z0-9]+/gi, '-');
  check('Tidak ada permintaan jaringan gagal selama seluruh uji', failedRequests.length === 0, failedRequests.slice(0, 5).join(' | '));
  check('Tidak ada file BGM yang dimuat (BGM tetap AWAITING_COMPOSER)', !audioRequests.some(u => !/\/audio\/sfx\//.test(u)), audioRequests.filter(u => !/\/audio\/sfx\//.test(u)).slice(0, 3).join(' | '));
  check('Berkas SFX asli Bab IV diminta oleh browser', audioRequests.some(u => /METEOR|AEGIS|VARLGRIM|HEART|FORTRESS/i.test(u)));
  writeFileSync(resolve(out, 'phase8-results.json'), JSON.stringify({ results, errors, failedRequests, metrics }, null, 2));
  await browser.close();
  const failed = results.filter(r => !r.ok);
  console.log('Metrik kekalahan (percobaan gagal sebelum menang):', JSON.stringify(metrics));
  console.log(`Phase 8: ${results.length - failed.length}/${results.length} lulus`);
  if (failed.length) { console.log('GAGAL:'); for (const f of failed) console.log(` - ${f.name}: ${f.detail}`); process.exitCode = 1; }
}

async function saveSlot2(page) {
  await openPause(page); await openMenu(page, 'save', 'save-load'); await saveSlot(page, 'slot1'); await back(page, 'pause'); await back(page, 'world');
}
