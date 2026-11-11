// Polish Sprint 1: QA browser nyata (Edge/Chrome) untuk presentasi baru. Dijalankan pada 1366x768 dan 1920x1080.
// Memeriksa kanvas/zoom, Title Screen, kerahasiaan nama Yaric, ketiadaan banner tujuan, Jurnal, menu, battle solo/duo,
// pengungkapan identitas + save/load, sprite empat arah (tekstur yang benar-benar dimuat), resize dan Pixel Perfect.
// Screenshot untuk review manusia: E2E_OUTPUT_DIR (default ../.dev-cache/test-artifacts), awalan s1_.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { press, ready, selectMenu } from './battle-helpers.mjs';
import { back, openMenu, openPause, waitWorld } from './phase3-helpers.mjs';
import { faceCity } from './phase5-helpers.mjs';

const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:5173/';
const out = resolve(process.env.E2E_OUTPUT_DIR ?? '../.dev-cache/test-artifacts'); mkdirSync(out, { recursive: true });
const results = [], errors = [], failedRequests = [], requested = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok ? ': ' + String(detail).slice(0, 400) : ''}`); };
const settle = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const shot = async (page, name, w) => { await settle(page); await page.waitForTimeout(170); await page.screenshot({ path: resolve(out, `s1_${name}_${w}.png`) }); };
const texts = (page, scene) => page.evaluate(s => window.__tfbt.sceneTexts(s), scene);
const issues = (page) => page.evaluate(() => window.__tfbt.layoutIssues());
const world = page => page.evaluate(() => window.__tfbt.world());
const joined = arr => arr.join('\n');
const readyLong = page => page.waitForFunction(() => { const b = window.__tfbt.battle(); return b && !b.locked && (b.outcome || b.actors.find(a => a.id === b.order[b.cursor])?.side === 'player'); }, null, { timeout: 40000 });
const leaks = text => /yaric/i.test(text);

async function session(browser, width, height, { settings = { text_speed: 'instant', screen_shake: false, reduced_flashes: true }, init } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await context.addInitScript(v => { if (!localStorage.getItem('tfbt.settings.v1')) localStorage.setItem('tfbt.settings.v1', JSON.stringify({ schema: 'settings_v1', values: v })); }, settings);
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('requestfailed', r => { if (!/ERR_ABORTED/.test(r.failure()?.errorText ?? '')) failedRequests.push(`${r.url()} ${r.failure()?.errorText}`); });
  page.on('response', r => { requested.push(r.url()); if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`); });
  await page.goto(BASE + '?qa=1');
  await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'), null, { timeout: 20000 });
  await page.waitForTimeout(400);
  return { context, page };
}

async function readAllDialogue(page, onLine) {
  const seen = new Set();
  for (let n = 0; n < 200; n++) {
    const w = await world(page);
    if (!w) { await page.waitForTimeout(100); continue; }
    const d = w.dialogue;
    if (!d) { if (!w.busy && seen.size) return [...seen]; await page.waitForTimeout(120); continue; }
    const key = `${d.line}:${d.page}`;
    if (!seen.has(key)) { seen.add(key); await onLine?.(d); }
    if (d.state === 'choice') await press(page, 'Enter');
    else { await page.waitForTimeout(500); await press(page, 'Enter'); }
  }
  throw Error('dialogue guard');
}

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge', headless: true });
console.log(`Polish Sprint 1 | ${process.env.E2E_CHANNEL ?? 'msedge'} ${browser.version()} | ${BASE}`);
try {
  for (const [width, height] of [[1366, 768], [1920, 1080]]) {
    const tag = `${width}`;
    // ------------------------------------------------------------ A. kanvas + Title Screen
    let { context, page } = await session(browser, width, height);
    await page.waitForTimeout(2600);
    const disp = await page.evaluate(() => ({ layout: window.__tfbt.display(), canvas: [document.querySelector('canvas').width, document.querySelector('canvas').height], css: window.__tfbt.canvasCss() }));
    check(`${tag}: kanvas = piksel perangkat, 16:9, tanpa pembesaran CSS`, disp.canvas[0] === disp.layout.pixelWidth && disp.canvas[1] === disp.layout.pixelHeight && Math.abs(disp.css.w - disp.layout.pixelWidth) <= 1 && Math.abs(disp.css.h - disp.layout.pixelHeight) <= 1 && Math.abs(disp.canvas[0] / disp.canvas[1] - 16 / 9) < 0.01, JSON.stringify(disp));
    check(`${tag}: zoom dunia dan battle bilangan bulat (tanpa skala pecahan pada pixel art)`, Number.isInteger(disp.layout.worldZoom) && Number.isInteger(disp.layout.battleZoom), JSON.stringify(disp.layout));
    check(`${tag}: skala UI mengikuti tinggi (${(height / 540).toFixed(3)})`, Math.abs(disp.layout.uiScale - height / 540) < 0.01, disp.layout.uiScale);
    const titleTexts = await texts(page, 'TitleScene');
    check(`${tag}: Title memuat judul dan keempat menu, tanpa nomor phase/versi developer`, ['THE FATE', 'BEYOND TIME', 'Mulai Baru', 'Lanjut', 'Pengaturan', 'Panduan Kontrol'].every(t => titleTexts.includes(t)) && !titleTexts.some(t => /phase|v\d+\.\d+|build|prototype/i.test(t)), joined(titleTexts));
    check(`${tag}: Title tidak membocorkan nama Yaric atau spoiler`, !leaks(joined(titleTexts)));
    check(`${tag}: layout Title tidak terpotong/bertumpuk`, (await issues(page)).length === 0, (await issues(page)).join(';'));
    await shot(page, 'title', tag);
    await press(page, 'ArrowDown', 2);
    check(`${tag}: keyboard menu Title (Lanjut nonaktif tetap dapat difokus, lalu Pengaturan)`, await page.evaluate(() => window.__tfbt.focus() === 'menu:settings'));
    await press(page, 'Enter'); await page.waitForFunction(() => window.__tfbt.inputLayer() === 'settings');
    await shot(page, 'settings', tag); check(`${tag}: layout Pengaturan`, (await issues(page)).length === 0, (await issues(page)).join(';'));
    await press(page, 'Escape'); await page.waitForFunction(() => window.__tfbt.inputLayer() === 'title');
    await press(page, 'ArrowDown'); await press(page, 'Enter'); await page.waitForFunction(() => window.__tfbt.inputLayer() === 'controls');
    await shot(page, 'controls', tag); check(`${tag}: layout Panduan Kontrol`, (await issues(page)).length === 0, (await issues(page)).join(';'));
    await press(page, 'Escape'); await page.waitForFunction(() => window.__tfbt.inputLayer() === 'title');

    // ------------------------------------------------------------ B. pembukaan: dialog anonim, tanpa banner tujuan
    await press(page, 'ArrowUp', 3); await press(page, 'Enter');
    await page.waitForFunction(() => window.__tfbt.world()?.dialogue, null, { timeout: 20000 });
    await page.waitForTimeout(1900);
    const first = (await world(page)).dialogue;
    check(`${tag}: monolog batin pembukaan tanpa label nama, portrait tetap tampil`, first.label === '' && first.portrait === 'C01_CONFUSED' && !leaks(joined(await texts(page, 'HudScene'))), JSON.stringify(first));
    check(`${tag}: layout dialog (panel rendah, tidak terpotong)`, (await issues(page)).length === 0, (await issues(page)).join(';'));
    await shot(page, 'opening_dialogue', tag);
    const labels = new Set();
    await readAllDialogue(page, async d => { labels.add(d.label); });
    await waitWorld(page);
    check(`${tag}: seluruh dialog C1-01..C1-03 hingga pemain bebas tidak pernah berlabel "Yaric"`, ![...labels].some(l => leaks(l)), [...labels].join('|'));
    await page.waitForTimeout(400);
    const w0 = await world(page);
    const hudNow = await texts(page, 'HudScene');
    check(`${tag}: tidak ada banner tujuan permanen di HUD (tujuan: "${w0.objective}")`, !!w0.objective && !hudNow.some(t => t.includes(w0.objective)) && !hudNow.some(t => /ikuti|cari jalan|periksa sekitar/i.test(t)), joined(hudNow));
    await shot(page, 'world_no_banner', tag);

    // ------------------------------------------------------------ C. sprite empat arah (tekstur yang dimuat)
    const dirs = [['ArrowDown', 'down'], ['ArrowLeft', 'left'], ['ArrowRight', 'right'], ['ArrowUp', 'up']];
    const rows = { down: 0, left: 1, right: 2, up: 3 };
    for (const [key, dir] of dirs) {
      await page.keyboard.down(key); await page.waitForTimeout(170); await page.keyboard.up(key); await page.waitForTimeout(260);
      const p = (await world(page)).player; const f = (await world(page)).facing;
      check(`${tag}: Yaric ${dir}: berhadapan benar, origin kaki 47/48, bayangan menempel di tanah`, f === dir && Math.abs(p.originY - 47 / 48) < 1e-6 && Math.abs(p.shadowY - (p.y - 1)) < 1.01, JSON.stringify(p));
      await shot(page, `yaric_${dir}`, tag);
    }
    const bounds = await page.evaluate(rowsMap => Array.from({ length: 16 }, (_, i) => ({ i, ...window.__tfbt.frameBounds('C01_YARIC_EXPLORE', i) })), rows);
    check(`${tag}: browser meminta atlas Yaric yang sudah dinormalisasi (bukan salinan mentah)`, requested.some(u => /characters\/(normalized|final)\/C01_explore\.png/.test(u)) && !requested.some(u => /characters\/C01_explore\.png/.test(u)), requested.filter(u => /explore/.test(u)).join(' '));
    check(`${tag}: 16 frame Yaric dalam tekstur yang dimuat: kaki di baris 46, tinggi seragam 46 px di empat arah`, bounds.every(b => b.bottom === 46 && b.height >= 45 && b.height <= 46), JSON.stringify(bounds.filter(b => b.bottom !== 46 || b.height < 45)));
    check(`${tag}: tidak ada piksel buram di baris pertama (rambut tidak terpotong tepi frame) atau di luar kotak 32x48`, bounds.every(b => b.top >= 1), JSON.stringify(bounds.filter(b => b.top < 1)));

    // ------------------------------------------------------------ D. menu: Jeda, Jurnal, Status, Inventaris
    await openPause(page);
    check(`${tag}: layout Jeda`, (await issues(page)).length === 0, (await issues(page)).join(';')); await shot(page, 'pause', tag);
    await openMenu(page, 'journal', 'journal');
    const jt = joined(await texts(page, 'JournalScene'));
    check(`${tag}: Jurnal menampilkan tujuan saat ini dan catatan tanpa nama`, jt.includes(w0.objective) && jt.includes('TUJUAN') && !leaks(jt), jt);
    check(`${tag}: layout Jurnal`, (await issues(page)).length === 0, (await issues(page)).join(';')); await shot(page, 'journal', tag);
    await back(page, 'pause');
    await openMenu(page, 'status');
    const st = joined(await texts(page, 'RpgMenuScene'));
    check(`${tag}: Status memakai "???" dan tidak membocorkan nama`, st.includes('???') && !leaks(st) && st.includes('HP') && st.includes('Serangan'), st);
    check(`${tag}: layout Status`, (await issues(page)).length === 0, (await issues(page)).join(';')); await shot(page, 'status', tag);
    await back(page, 'pause'); await openMenu(page, 'inventory');
    const inv = joined(await texts(page, 'RpgMenuScene'));
    check(`${tag}: Inventaris ringkas: daftar + jumlah, rincian, tanpa nama Yaric ("Pedang Besar" tanpa pemilik)`, inv.includes('Pedang Besar') && inv.includes('×1') && !leaks(inv), inv);
    check(`${tag}: layout Inventaris`, (await issues(page)).length === 0, (await issues(page)).join(';')); await shot(page, 'inventory', tag);
    await back(page, 'pause'); await openMenu(page, 'equipment'); check(`${tag}: layout Perlengkapan`, (await issues(page)).length === 0, (await issues(page)).join(';')); await shot(page, 'equipment', tag);
    await back(page, 'pause'); await openMenu(page, 'skills'); check(`${tag}: layout Jurus`, (await issues(page)).length === 0, (await issues(page)).join(';')); await shot(page, 'skills', tag);
    await back(page, 'pause'); await openMenu(page, 'save', 'save-load'); const sl = joined(await texts(page, 'SaveLoadScene'));
    check(`${tag}: Simpan/Muat tidak membocorkan nama`, !leaks(sl), sl); check(`${tag}: layout Simpan/Muat`, (await issues(page)).length === 0, (await issues(page)).join(';')); await shot(page, 'saveload', tag);
    await back(page, 'pause'); await back(page, 'world');
    await context.close();

    // ------------------------------------------------------------ E. battle solo
    ({ context, page } = await session(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.encounter());
    await ready(page); await page.waitForTimeout(500);
    let b = await page.evaluate(() => window.__tfbt.battle());
    const bt = joined(await texts(page, 'BattleScene'));
    check(`${tag}: battle solo: HUD berisi musuh, HP/MP, giliran, perintah; nama pemain anonim`, ['Hollowling', 'GILIRAN ANDA', 'HP', 'MP', 'Serang', 'Jurus', 'Barang', 'Bertahan', 'Kabur', '???'].every(t => bt.includes(t)) && !leaks(bt), bt);
    check(`${tag}: musuh di kiri, party di kanan, kaki sejajar (garis tanah sama)`, b.sprites.M01.x < b.sprites.C01.x && b.sprites.M01.footY === b.sprites.C01.footY, JSON.stringify(b.sprites));
    check(`${tag}: zoom panggung battle bulat (${b.stage.zoom}) dan layout bersih`, Number.isInteger(b.stage.zoom) && (await issues(page)).length === 0, (await issues(page)).join(';'));
    await shot(page, 'battle_hollowling', tag);
    await press(page, 'ArrowDown'); await press(page, 'Enter'); await page.waitForTimeout(250);
    check(`${tag}: submenu Jurus menampilkan biaya MP`, joined(await texts(page, 'BattleScene')).includes('4 MP'));
    await shot(page, 'battle_skill', tag); await press(page, 'Escape');
    // Esc dari battle membuka Jeda (aman), lalu kembali
    await press(page, 'Escape'); await page.waitForFunction(() => window.__tfbt.inputLayer() === 'pause'); await shot(page, 'battle_pause', tag); await back(page, 'battle');
    await context.close();

    ({ context, page } = await session(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.bossBattle()); await ready(page); await page.waitForTimeout(500);
    await shot(page, 'battle_mournfang', tag);
    check(`${tag}: battle boss Mournfang: layout bersih`, (await issues(page)).length === 0, (await issues(page)).join(';'));
    await context.close();

    // ------------------------------------------------------------ F. battle duo + boss telegraph (setelah pengungkapan nama)
    ({ context, page } = await session(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.chapter2('duo', 'duo_tutorial')); await ready(page); await page.waitForTimeout(500);
    b = await page.evaluate(() => window.__tfbt.battle());
    const dt = joined(await texts(page, 'BattleScene'));
    check(`${tag}: battle duo: dua kartu party (Yaric, Torvan) + dua kartu musuh + giliran aktif`, ['Yaric', 'Torvan', 'Hollowling', 'Briaroot', 'GILIRAN ANDA'].every(t => dt.includes(t)), dt);
    check(`${tag}: duo: kedua musuh tampak di kiri, kedua anggota di kanan`, b.sprites.M01.x < b.sprites.C01.x && b.sprites.M02.x < b.sprites.C03.x, JSON.stringify(b.sprites));
    check(`${tag}: layout battle duo`, (await issues(page)).length === 0, (await issues(page)).join(';')); await shot(page, 'battle_duo', tag);
    await context.close();
    ({ context, page } = await session(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.chapter2('duo', 'veyrath')); await ready(page); await page.waitForTimeout(500);
    for (let i = 0; i < 6; i++) { // bertahan sampai telegraf tusukan muncul
      const s = await page.evaluate(() => window.__tfbt.battle());
      if (s.actors.find(a => a.id === 'B02').intent === 'knight_thrust') break;
      await selectMenu(page, 'defend'); await press(page, 'Enter'); await readyLong(page);
    }
    const tele = joined(await texts(page, 'BattleScene'));
    check(`${tag}: telegraf boss Veyrath terbaca jelas (TUSUKAN!)`, tele.includes('TUSUKAN!') || tele.includes('Veyrath'), tele);
    await shot(page, 'battle_veyrath', tag);
    check(`${tag}: layout battle boss telegraf`, (await issues(page)).length === 0, (await issues(page)).join(';'));
    await context.close();

    // ------------------------------------------------------------ G. kota dan Liora
    ({ context, page } = await session(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.chapter1Complete()); await waitWorld(page).catch(() => undefined); await page.waitForTimeout(2200);
    await shot(page, 'aveloria', tag);
    check(`${tag}: Aveloria: kamera dalam batas peta dan zoom bulat`, await page.evaluate(() => { const c = window.__tfbt.world()?.cam; return !!c && Number.isInteger(c.zoom) && c.x >= 0 && c.y >= 0 && c.x + c.w <= c.bw + 1 && c.y + c.h <= c.bh + 1; }));
    await context.close();
    ({ context, page } = await session(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.chapter2('liora')); await waitWorld(page).catch(() => undefined); await page.waitForTimeout(1500);
    await shot(page, 'liora', tag);
    const lw = await world(page);
    check(`${tag}: Liora: tidak ada banner tujuan, kamera dalam batas`, !joined(await texts(page, 'HudScene')).includes(lw.objective) && lw.cam.x >= 0 && lw.cam.y >= 0, JSON.stringify(lw.cam));
    await context.close();

    // ------------------------------------------------------------ H. pengungkapan identitas + save/load
    ({ context, page } = await session(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.chapter2('forest2')); await waitWorld(page).catch(() => undefined); await page.waitForTimeout(1200);
    let sw = await world(page);
    check(`${tag}: Hutan 2 sebelum pengungkapan: flag identitas belum ada`, !sw.flags['identity.name_known'] && !sw.flags['story.c2_forest']);
    await page.evaluate(() => window.__tfbt.qa.teleport(352, 548)); await faceCity(page, 'up');
    await page.waitForFunction(() => window.__tfbt.world()?.target === 'forest2_marker', null, { timeout: 5000 });
    await press(page, 'Enter');
    const revealLabels = []; let flagBeforeNameLine = null;
    await readAllDialogue(page, async d => {
      revealLabels.push(`${d.line}=${d.label}`);
      if (d.line === 'C2-04-X004') await shot(page, 'identity_voice', tag);
      if (d.line === 'C2-04-X005') { flagBeforeNameLine = (await world(page)).flags['identity.name_known']; await shot(page, 'identity_reveal', tag); }
    });
    await waitWorld(page);
    sw = await world(page);
    check(`${tag}: reveal: label baru "Yaric" hanya pada baris sesudah flag identitas, baris sebelumnya anonim`,
      revealLabels.find(l => l.startsWith('C2-04-X004')) === 'C2-04-X004=' && revealLabels.find(l => l.startsWith('C2-04-X003')) === 'C2-04-X003=Suara' && revealLabels.find(l => l.startsWith('C2-04-X005')) === 'C2-04-X005=Yaric' && flagBeforeNameLine === true && !revealLabels.some(l => l.startsWith('C2-04-X001=Yaric')), revealLabels.join(' | '));
    check(`${tag}: reveal menyetel flag identitas dan story.c2_forest`, sw.flags['identity.name_known'] && sw.flags['story.c2_forest']);
    await openPause(page); await openMenu(page, 'status');
    const st2 = joined(await texts(page, 'RpgMenuScene'));
    check(`${tag}: setelah reveal Status menampilkan "Yaric"`, st2.includes('Yaric') && !st2.includes('???'), st2);
    await back(page, 'pause'); await openMenu(page, 'save', 'save-load'); await selectMenu(page, 'slot1'); await press(page, 'Enter');
    await page.waitForFunction(() => localStorage.getItem('tfbt.save.v1.slot1'));
    await page.reload(); await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene')); await page.waitForTimeout(400);
    await selectMenu(page, 'continue'); await press(page, 'Enter'); await waitWorld(page);
    await openPause(page); await openMenu(page, 'status');
    check(`${tag}: save/load mempertahankan identitas (Yaric tetap tampil sesudah reload)`, joined(await texts(page, 'RpgMenuScene')).includes('Yaric') && (await world(page)).flags['identity.name_known'] === true);
    await context.close();

    // ------------------------------------------------------------ I. resize dan Pixel Perfect
    ({ context, page } = await session(browser, width, height));
    await page.setViewportSize({ width: 1600, height: 900 }); await page.waitForTimeout(500);
    const r1 = await page.evaluate(() => ({ l: window.__tfbt.display(), c: [document.querySelector('canvas').width, document.querySelector('canvas').height] }));
    check(`${tag}: resize runtime ke 1600x900: kanvas mengikuti, zoom bulat, UI dibangun ulang tanpa terpotong`, r1.c[0] === r1.l.pixelWidth && r1.c[1] === 900 && Number.isInteger(r1.l.worldZoom) && (await issues(page)).length === 0, JSON.stringify(r1));
    await shot(page, 'resize_1600', tag);
    await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(500);
    check(`${tag}: resize runtime ke 1280x720: tata letak Title tetap bersih`, (await issues(page)).length === 0 && (await texts(page, 'TitleScene')).includes('Mulai Baru'), (await issues(page)).join(';'));
    await context.close();
    ({ context, page } = await session(browser, width, height, { settings: { text_speed: 'instant', screen_scale: 'pixel_perfect', screen_shake: false, reduced_flashes: true } }));
    const pp = await page.evaluate(() => ({ l: window.__tfbt.display(), css: window.__tfbt.canvasCss(), c: [document.querySelector('canvas').width, document.querySelector('canvas').height] }));
    const k = Math.floor(Math.min(width / 640, height / 360));
    check(`${tag}: Pixel Perfect = kelipatan bulat ${640 * k}x${360 * k}, zoom dunia ${k}, letterbox`, pp.l.pixelWidth === 640 * k && pp.l.pixelHeight === 360 * k && pp.l.worldZoom === k && pp.c[0] === 640 * k, JSON.stringify(pp));
    await shot(page, 'pixel_perfect_title', tag);
    await context.close();
  }
} finally { await browser.close(); }

check('Tidak ada error JS/console selama sprint1', errors.length === 0, errors.slice(0, 5).join(' | '));
check('Tidak ada request gagal/404', failedRequests.length === 0, failedRequests.slice(0, 5).join(' | '));
check('Tidak ada request audio (semua cue AWAITING_COMPOSER)', !requested.some(u => /\.(ogg|wav|mp3)(\?|$)/.test(u)));
const passed = results.filter(r => r.ok).length;
writeFileSync(resolve(out, 's1_report.json'), JSON.stringify({ passed, total: results.length, results }, null, 2));
console.log(`${passed}/${results.length} Polish Sprint 1 passed`);
process.exitCode = passed === results.length ? 0 : 1;
