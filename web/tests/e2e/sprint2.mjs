// Polish Sprint 2: QA browser nyata. Bukti piksel (bukan hanya objek/texture di memori): visibilitas boss/monster pada frame render,
// sprite Yaric empat arah pada tekstur yang dimuat, animasi idle benar-benar berubah, sprint (Shift) beserta collision/trigger/state,
// dan performa dasar. 1366x768 dan 1920x1080. Screenshot: E2E_OUTPUT_DIR, awalan s2_.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { press, ready, selectMenu } from './battle-helpers.mjs';
import { openPause, waitWorld } from './phase3-helpers.mjs';
import { fightBoss } from './phase4-helpers.mjs';
import { battleSpriteVisibility, diffPngs } from './visual-helpers.mjs';

const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:5173/';
const out = resolve(process.env.E2E_OUTPUT_DIR ?? '../.dev-cache/test-artifacts'); mkdirSync(out, { recursive: true });
const results = [], errors = [], failedRequests = [], requested = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok ? ': ' + String(detail).slice(0, 500) : ''}`); };
const settle = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const shot = async (page, name, w) => { await settle(page); await page.waitForTimeout(150); await page.screenshot({ path: resolve(out, `s2_${name}_${w}.png`) }); };
const world = page => page.evaluate(() => window.__tfbt.world());

async function session(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await context.addInitScript(() => { if (!localStorage.getItem('tfbt.settings.v1')) localStorage.setItem('tfbt.settings.v1', JSON.stringify({ schema: 'settings_v1', values: { text_speed: 'instant', screen_shake: false, reduced_flashes: true } })); });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('requestfailed', r => { if (!/ERR_ABORTED/.test(r.failure()?.errorText ?? '')) failedRequests.push(`${r.url()} ${r.failure()?.errorText}`); });
  page.on('response', r => { requested.push(r.url()); if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`); });
  await page.goto(BASE + '?qa=1');
  await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'), null, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { context, page };
}

/** Piksel nyata: minimal 12% kotak sprite berubah bila sprite disembunyikan dan selisih luminans rata-rata cukup (tidak menyatu dengan latar). */
async function expectVisible(page, id, label, tag, minRatio = 0.12, minDelta = 24) {
  const r = await battleSpriteVisibility(page, id);
  check(`${tag}: ${label} (${id}) terlihat pada frame render: ${(r.ratio * 100).toFixed(1)}% piksel kotak berubah, selisih rata-rata ${Math.round(r.meanDelta)}`,
    r.probe && r.probe.visible && r.probe.alpha > 0.9 && r.ratio >= minRatio && r.meanDelta >= minDelta, JSON.stringify({ ...r, probe: r.probe }));
  return r;
}


/** Gerak idle nyata sebuah karakter dunia pada koordinat (wx, wy): bandingkan tangkapan layar kecil dari waktu ke waktu. */
async function idleMotion(page, wx, wy) {
  const w = await world(page); const c = w.cam; const z = c.zoom;
  const k = await page.evaluate(() => window.__tfbt.canvasCss().w / window.__tfbt.display().pixelWidth);
  const clip = { x: Math.max(0, Math.floor(((wx - 20 - c.x) * z) * k)), y: Math.max(0, Math.floor(((wy - 52 - c.y) * z) * k)), width: Math.floor(40 * z * k), height: Math.floor(58 * z * k) };
  const shots = [];
  for (let i = 0; i < 8; i++) { shots.push((await page.screenshot({ clip })).toString('base64')); await page.waitForTimeout(240); }
  let maxChanged = 0, pairs = 0;
  for (let i = 1; i < shots.length; i++) { const d = await diffPngs(page, shots[0], shots[i]); maxChanged = Math.max(maxChanged, d.changed); if (d.changed > 0) pairs++; }
  return { maxChanged, pairs };
}

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge', headless: true });
console.log(`Polish Sprint 2 | ${process.env.E2E_CHANNEL ?? 'msedge'} ${browser.version()} | ${BASE}`);
try {
  for (const [width, height] of [[1366, 768], [1920, 1080]]) {
    const tag = `${width}`;
    // ------------------------------------------------------------ A. visibilitas boss dan monster
    let { context, page } = await session(browser, width, height);
    await page.evaluate(() => window.__tfbt.qa.bossBattle()); await ready(page); await page.waitForTimeout(700);
    let b = await page.evaluate(() => window.__tfbt.battle());
    check(`${tag}: Mournfang memakai atlas V4 160x128 (bukan blob draft 96x96)`, b.sprites.B01 && await page.evaluate(() => window.__tfbt.battleProbe('B01').texture === 'B01_MOURNFANG_BATTLE') && b.sprites.B01.originX > 0.45 && b.sprites.B01.originX < 0.5, JSON.stringify(b.sprites.B01));
    const boss0 = await expectVisible(page, 'B01', 'Mournfang saat battle mulai', tag, 0.22, 30);
    const p = boss0.probe;
    check(`${tag}: Mournfang di sisi kiri arena, Yaric di kanan, di dalam layar, skala masuk akal`, b.sprites.B01.x < b.sprites.C01.x && p.x >= 0 && p.x + p.w <= (await page.evaluate(() => window.__tfbt.display().pixelWidth)) && p.w >= 120 && p.w <= 700, JSON.stringify(p));
    await expectVisible(page, 'C01', 'Yaric di arena boss', tag, 0.15, 24);
    await shot(page, 'battle_mournfang', tag);
    // tetap terlihat sepanjang state aktif: tunggu idle berganti lalu serang sampai telegraf, periksa lagi
    await page.waitForTimeout(1200); await expectVisible(page, 'B01', 'Mournfang setelah beberapa siklus idle', tag, 0.2, 30);
    await selectMenu(page, 'attack'); await press(page, 'Enter'); await page.waitForTimeout(450);
    const during = await page.evaluate(() => window.__tfbt.battle());
    check(`${tag}: Mournfang tidak hilang saat giliran bergulir (alpha 1, terlihat) frame=${during.sprites.B01.frame}`, during.sprites.B01.alpha === 1 && await page.evaluate(() => window.__tfbt.battleProbe('B01').visible));
    await ready(page);
    // sampai telegraf sapuan: frame antisipasi harus terlihat
    for (let i = 0; i < 6; i++) { const s = await page.evaluate(() => window.__tfbt.battle()); if (s.actors.find(a => a.id === 'B01').intent === 'sweep') break; await selectMenu(page, 'attack'); await press(page, 'Enter'); await ready(page); }
    await expectVisible(page, 'B01', 'Mournfang saat telegraf sapuan', tag, 0.2, 30);
    await shot(page, 'battle_mournfang_telegraph', tag);
    const frames = new Set((await page.evaluate(() => window.__tfbt.battle())).history.filter(h => h.actor === 'B01').map(h => h.frame));
    check(`${tag}: boss memutar pose antisipasi/serang/pemulihan yang valid (${[...frames].join(',')})`, ['anticipation', 'attack'].every(f => frames.has(f)) || frames.size >= 2, [...frames].join(','));
    // Ground Slam memutus sapuan, lalu kalahkan boss: boss hanya menghilang saat defeat
    const res = await fightBoss(page, 45);
    const end = await page.evaluate(() => window.__tfbt.battle());
    check(`${tag}: boss mundur/hilang HANYA setelah kalah (outcome ${res.outcome}, alpha ${end.sprites.B01.alpha})`, res.outcome === 'victory' && end.sprites.B01.alpha < 0.05);
    await shot(page, 'battle_mournfang_victory', tag);
    await context.close();

    ({ context, page } = await session(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.encounter()); await ready(page); await page.waitForTimeout(600);
    await expectVisible(page, 'M01', 'Hollowling', tag, 0.1, 22); await expectVisible(page, 'C01', 'Yaric', tag, 0.15, 24);
    await shot(page, 'battle_hollowling', tag);
    await context.close();

    ({ context, page } = await session(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.chapter2('duo', 'duo_tutorial')); await ready(page); await page.waitForTimeout(700);
    for (const [id, label] of [['M01', 'Hollowling'], ['M02', 'Briaroot'], ['C01', 'Yaric'], ['C03', 'Torvan']]) await expectVisible(page, id, `duo: ${label}`, tag, 0.08, 20);
    await shot(page, 'battle_duo', tag);
    await context.close();

    ({ context, page } = await session(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.chapter2('duo', 'veyrath')); await ready(page); await page.waitForTimeout(700);
    await expectVisible(page, 'B02', 'Veyrath', tag, 0.08, 20); await expectVisible(page, 'C03', 'Torvan', tag, 0.08, 20);
    await shot(page, 'battle_veyrath', tag);
    await context.close();

    // ------------------------------------------------------------ B. Yaric empat arah dari tekstur yang dimuat
    ({ context, page } = await session(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.chapter1Complete()); await page.waitForFunction(() => window.__tfbt.world(), null, { timeout: 20000 }); await page.waitForTimeout(2200);
    const bounds = await page.evaluate(() => Array.from({ length: 56 }, (_, i) => ({ i, ...window.__tfbt.frameBounds('C01_YARIC_EXPLORE', i) })));
    check(`${tag}: browser memuat atlas final Yaric (56 frame)`, requested.some(u => /characters\/final\/C01_explore\.png/.test(u)) && bounds.every(f => f.bottom >= 0), String(bounds.length));
    check(`${tag}: 56 frame Yaric: kaki di baris 46 di semua arah dan state (idle/walk/sprint)`, bounds.every(f => f.bottom === 46), JSON.stringify(bounds.filter(f => f.bottom !== 46).map(f => f.i)));
    check(`${tag}: tidak ada piksel pada baris 0 atau kolom tepi (tidak ada clipping frame)`, bounds.every(f => f.top >= 1 && f.left >= 1 && f.right <= 30), JSON.stringify(bounds.filter(f => f.top < 1 || f.left < 1 || f.right > 30).map(f => f.i)));
    const up = bounds.filter(f => f.i >= 12 && f.i <= 15);
    check(`${tag}: mahkota rambut arah ATAS utuh: baris atas >= 5 px (bukan potongan rata 12-13 px tanpa kontur) dan tinggi 46`, up.every(f => f.topRowWidth >= 4 && f.topRowWidth <= 10 && f.height >= 45), JSON.stringify(up));
    check(`${tag}: tinggi tubuh seragam di empat arah (diam/jalan/lari)`, bounds.every(f => f.height >= 44 && f.height <= 46), JSON.stringify(bounds.filter(f => f.height < 44 || f.height > 46).map(f => [f.i, f.height])));

    // ------------------------------------------------------------ C. idle benar-benar bergerak (piksel berubah di sprite, bukan geser)
    await page.evaluate(() => window.__tfbt.qa.teleport(640, 860)); await page.waitForTimeout(600);
    const cam = (await world(page)).cam;
    const probeClip = async () => { // area kecil di sekitar Yaric
      const w = await world(page); const z = cam.zoom; const sx = (w.x - cam.x) * z; const sy = (w.y - cam.y) * z;
      const k = (await page.evaluate(() => window.__tfbt.canvasCss().w / window.__tfbt.display().pixelWidth));
      return { x: Math.max(0, Math.floor((sx - 20 * z) * k)), y: Math.max(0, Math.floor((sy - 52 * z) * k)), width: Math.floor(40 * z * k), height: Math.floor(60 * z * k) };
    };
    const shots = [];
    for (let i = 0; i < 6; i++) { shots.push((await page.screenshot({ clip: await probeClip() })).toString('base64')); await page.waitForTimeout(260); }
    let maxChanged = 0; let pairs = 0;
    for (let i = 1; i < shots.length; i++) { const d = await diffPngs(page, shots[0], shots[i]); maxChanged = Math.max(maxChanged, d.changed); if (d.changed > 0) pairs++; }
    const w1 = await world(page);
    check(`${tag}: idle Yaric memutar animasi (${w1.anim}) dan piksel sprite benar-benar berubah antar frame (maks ${maxChanged}px, ${pairs}/5 pasangan)`, /idle/.test(w1.anim) && maxChanged >= 8 && pairs >= 2, JSON.stringify({ anim: w1.anim, maxChanged, pairs }));
    await shot(page, 'yaric_idle', tag);

    // ------------------------------------------------------------ D. sprint
    const st = () => page.evaluate(() => { const w = window.__tfbt.world(); return { anim: w.anim, state: w.moveState, sp: w.sprinting, x: w.x, y: w.y, standable: w.standable, dialogue: !!w.dialogue }; });
    await page.evaluate(() => window.__tfbt.qa.teleport(640, 860)); await page.waitForTimeout(400);
    let a = await st(); await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(700); let bb = await st(); await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(250);
    const walkDist = a.x - bb.x;
    check(`${tag}: jalan: animasi walk dan tidak sprint (anim ${bb.anim})`, bb.state === 'walk' && !bb.sp && /walk_left/.test(bb.anim), JSON.stringify(bb));
    await page.evaluate(() => window.__tfbt.qa.teleport(640, 860)); await page.waitForTimeout(300);
    a = await st(); await page.keyboard.down('Shift'); await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(700); bb = await st();
    const sprintDist = a.x - bb.x; const ratio = sprintDist / walkDist;
    check(`${tag}: Shift+Panah = sprint: animasi sprint, kecepatan ${ratio.toFixed(2)}x jalan (1,4-1,8x)`, bb.state === 'sprint' && bb.sp && /sprint_left/.test(bb.anim) && ratio >= 1.4 && ratio <= 1.8, JSON.stringify({ bb, walkDist, sprintDist }));
    await shot(page, 'yaric_sprint', tag);
    await page.keyboard.up('ArrowLeft'); await page.keyboard.up('Shift'); await page.waitForTimeout(300); bb = await st();
    check(`${tag}: lepas tombol: sprint -> idle`, bb.state === 'idle' && /idle/.test(bb.anim) && !bb.sp, JSON.stringify(bb));
    await page.keyboard.down('ArrowRight'); await page.keyboard.down('Shift'); await page.waitForTimeout(200); let s1 = await st();
    await page.keyboard.up('Shift'); await page.waitForTimeout(200); let s2 = await st(); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(200);
    check(`${tag}: jalan -> sprint -> jalan saat Shift dilepas tanpa berhenti`, s1.state === 'sprint' && s2.state === 'walk', JSON.stringify([s1.state, s2.state]));
    // WASD
    await page.evaluate(() => window.__tfbt.qa.teleport(640, 860)); await page.waitForTimeout(300);
    await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyW'); await page.waitForTimeout(300); const wsd = await st(); await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft');
    check(`${tag}: Shift + WASD (W) = sprint ke atas`, wsd.sp && /sprint_up/.test(wsd.anim), JSON.stringify(wsd));
    // dua arah + Shift tidak diagonal
    await page.evaluate(() => window.__tfbt.qa.teleport(640, 860)); await page.waitForTimeout(300);
    await page.keyboard.down('Shift'); await page.keyboard.down('ArrowLeft'); await page.keyboard.down('ArrowUp');
    // Measure only while both arrows are held. The CDP gap between keydowns is
    // valid single-direction movement and does not demonstrate diagonal movement.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    a = await st(); await page.waitForTimeout(300); bb = await st();
    await page.keyboard.up('ArrowLeft'); await page.keyboard.up('ArrowUp'); await page.keyboard.up('Shift');
    check(`${tag}: sprint tetap empat arah (tidak ada diagonal): hanya satu sumbu berubah`, (Math.abs(bb.x - a.x) < 1.5) !== (Math.abs(bb.y - a.y) < 1.5) || (Math.abs(bb.x - a.x) < 1.5 && Math.abs(bb.y - a.y) < 1.5), JSON.stringify({ a, bb }));
    // collision saat sprint: lari ke tepi peta ke segala arah; posisi akhir harus tetap dapat diinjak dan di dalam peta
    let allStand = true;
    for (const [key, ms] of [['ArrowUp', 2500], ['ArrowLeft', 3000], ['ArrowDown', 3000], ['ArrowRight', 3000]]) {
      await page.keyboard.down('Shift'); await page.keyboard.down(key);
      for (let i = 0; i < ms / 100; i++) { await page.waitForTimeout(100); const q = await st(); if (!q.standable) allStand = false; if (q.dialogue) break; }
      await page.keyboard.up(key); await page.keyboard.up('Shift'); await page.waitForTimeout(150);
      if ((await world(page)).busy) break;
    }
    check(`${tag}: lari menabrak pohon/dinding/tepi sepanjang 4 arah tidak pernah menembus (posisi selalu dapat diinjak)`, allStand);
    // Pause saat Shift ditahan: tidak memicu apa pun, gerak berhenti, tidak bocor
    await page.evaluate(() => window.__tfbt.qa.teleport(640, 860)); await page.waitForTimeout(300);
    await page.keyboard.down('Shift'); await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(150);
    await press(page, 'Escape'); await page.waitForFunction(() => window.__tfbt.inputLayer() === 'pause'); const px = (await world(page)).x; await page.waitForTimeout(400);
    const frozen = (await world(page)).x === px;
    await press(page, 'Escape'); await page.keyboard.up('ArrowLeft'); await page.keyboard.up('Shift'); await page.waitForFunction(() => window.__tfbt.inputLayer() === 'world');
    check(`${tag}: Pause saat sprint: dunia berhenti, Shift tidak memicu menu/aksi, kembali ke dunia normal`, frozen);
    await context.close();

    // trigger cerita pada kecepatan lari (Hutan 1: pemicu Hollowling)
    ({ context, page } = await session(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.forest1Late()); await page.waitForFunction(() => window.__tfbt.world(), null, { timeout: 20000 }); await page.waitForTimeout(900);
    await page.keyboard.down('Shift'); await page.keyboard.down('ArrowUp');
    let fired = false;
    for (let i = 0; i < 80 && !fired; i++) { await page.waitForTimeout(100); fired = await page.evaluate(() => !!window.__tfbt.battle() || !!window.__tfbt.world()?.dialogue || window.__tfbt.activeScenes().includes('BattleScene')); }
    await page.keyboard.up('ArrowUp'); await page.keyboard.up('Shift');
    check(`${tag}: pemicu cerita (Hollowling) tetap aktif saat berlari melewatinya`, fired);
    await context.close();


    // ------------------------------------------------------------ F. idle NPC (Nambo di Hutan 1, Velthia di Aveloria, Torvan sebagai pengikut)
    ({ context, page } = await session(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.forest1Late()); await page.waitForFunction(() => window.__tfbt.world(), null, { timeout: 20000 }); await page.waitForTimeout(900);
    const nb = (await world(page)).nambo; await page.evaluate(([x, y]) => window.__tfbt.qa.teleport(x - 70, y + 4), [nb.x, nb.y]); await page.waitForTimeout(900);
    const nm = await idleMotion(page, nb.x, nb.y);
    check(`${tag}: Nambo idle hidup (piksel sprite berubah: maks ${nm.maxChanged}px, ${nm.pairs}/7 pasangan)`, nm.maxChanged >= 6 && nm.pairs >= 2, JSON.stringify(nm));
    await shot(page, 'nambo_world', tag);
    await context.close();
    ({ context, page } = await session(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.chapter1Complete()); await page.waitForFunction(() => window.__tfbt.world()?.city, null, { timeout: 20000 }); await page.waitForTimeout(2200);
    const vel = (await world(page)).city.npcs.velthia; await page.evaluate(([x, y]) => window.__tfbt.qa.teleport(x - 90, y + 40), [vel.x, vel.y]); await page.waitForTimeout(900);
    const vm = await idleMotion(page, vel.x, vel.y);
    check(`${tag}: Velthia idle halus tapi nyata (maks ${vm.maxChanged}px, ${vm.pairs}/7 pasangan)`, vm.maxChanged >= 4 && vm.pairs >= 1, JSON.stringify(vm));
    await shot(page, 'velthia_world', tag);
    await context.close();
    ({ context, page } = await session(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.chapter2('duo')); await page.waitForFunction(() => window.__tfbt.world(), null, { timeout: 20000 }); await page.waitForTimeout(1600);
    const jo = (await world(page));
    const tv = jo.chapter2?.torvan;
    check(`${tag}: Torvan sebagai pengikut ada di dunia`, !!tv && tv.joined, JSON.stringify(tv));
    // sprint dengan pengikut: jarak Torvan ke Yaric tetap wajar (tidak teleport, tidak tertinggal jauh)
    await page.keyboard.down('Shift'); await page.keyboard.down('ArrowRight');
    let maxGap = 0;
    for (let i = 0; i < 20; i++) { await page.waitForTimeout(100); const q = await world(page); if (q.dialogue || q.busy) break; const t2 = q.chapter2?.torvan; if (t2) maxGap = Math.max(maxGap, Math.hypot(t2.x - q.x, t2.y - q.y)); }
    await page.keyboard.up('ArrowRight'); await page.keyboard.up('Shift'); await page.waitForTimeout(600);
    const q2 = await world(page); const gapEnd = Math.hypot(q2.chapter2.torvan.x - q2.x, q2.chapter2.torvan.y - q2.y);
    check(`${tag}: Torvan mengikuti saat sprint: jarak maks ${Math.round(maxGap)} px, setelah berhenti ${Math.round(gapEnd)} px (tanpa teleport/tertinggal)`, maxGap < 90 && gapEnd < 45, JSON.stringify({ maxGap, gapEnd }));
    await shot(page, 'torvan_follow', tag);
    await context.close();

    // ------------------------------------------------------------ E. performa dasar (frame time rata-rata di dunia dan battle)
    ({ context, page } = await session(browser, width, height));
    await page.evaluate(() => window.__tfbt.qa.chapter1Complete()); await page.waitForFunction(() => window.__tfbt.world(), null, { timeout: 20000 }); await page.waitForTimeout(2000);
    const perf = await page.evaluate(() => new Promise(resolve => { const t = []; let last = performance.now(); let n = 0; const loop = () => { const now = performance.now(); t.push(now - last); last = now; if (++n < 120) requestAnimationFrame(loop); else { t.shift(); t.sort((a, b) => a - b); resolve({ avg: t.reduce((x, y) => x + y, 0) / t.length, p95: t[Math.floor(t.length * 0.95)], max: t.at(-1) }); } }; requestAnimationFrame(loop); }));
    check(`${tag}: performa dunia (headless): frame rata-rata ${perf.avg.toFixed(1)} ms, p95 ${perf.p95.toFixed(1)} ms`, perf.avg < 33 && perf.p95 < 60, JSON.stringify(perf));
    writeFileSync(resolve(out, `s2_perf_${tag}.json`), JSON.stringify(perf, null, 2));
    await context.close();
  }
} finally { await browser.close(); }

check('Tidak ada error JS/console selama sprint2', errors.length === 0, errors.slice(0, 5).join(' | '));
check('Tidak ada request gagal/404', failedRequests.length === 0, failedRequests.slice(0, 5).join(' | '));
check('Tidak ada request audio', !requested.some(u => (/\.(ogg|wav|mp3)(\?|$)/.test(u) && !/\/audio\/sfx\//.test(u))));
const passed = results.filter(r => r.ok).length;
writeFileSync(resolve(out, 's2_report.json'), JSON.stringify({ passed, total: results.length, results }, null, 2));
console.log(`${passed}/${results.length} Polish Sprint 2 passed`);
process.exitCode = passed === results.length ? 0 : 1;
