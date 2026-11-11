// E2E Phase 1: intro Chapter I dimainkan SUNGGUHAN dengan keyboard (Edge/Chrome via playwright-core) pada build di web/dist.
// Alur: Title -> Mulai Baru -> C1-01 (bangun, periksa) -> C1-02 (Nambo, pilihan) -> C1-03 (papan berulang, semak, peti) -> akhir demo.
// Hanya satu bagian memakai teleport (?qa=1): perbandingan piksel mulus-tidaknya pengulangan lorong.
//   npm run build && node tests/e2e/phase1.mjs
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { battleTutorial } from './battle-helpers.mjs';
import { selectMenu } from './battle-helpers.mjs';
import { persistenceJourney } from './phase3-helpers.mjs';
import { verticalSliceJourney } from './phase4-helpers.mjs';
import { aveloriaJourney } from './phase5-helpers.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '../..');
const outDir = resolve(webRoot, '../.dev-cache/test-artifacts');
mkdirSync(outDir, { recursive: true });
const PORT = Number(process.env.E2E_PORT ?? 4198);
const BASE = process.env.E2E_URL ?? `http://127.0.0.1:${PORT}/`;
const CHANNEL = process.env.E2E_CHANNEL ?? 'msedge';

const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};
const check = (name, cond, detail = '') => record(name, !!cond, cond ? '' : detail);

let server;
async function startServer() {
  if (process.env.E2E_URL) return;
  server = spawn(process.execPath, [resolve(webRoot, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: webRoot, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('vite preview tidak siap')), 20000);
    server.stdout.on('data', (d) => String(d).includes('127.0.0.1') && (clearTimeout(t), res()));
    server.on('exit', (c) => rej(new Error('vite preview berhenti: ' + c)));
  });
}

// ---------------- helpers ----------------
const sleep = (page, ms) => page.waitForTimeout(ms);
const flat = (t) => String(t).split(String.fromCharCode(10)).join(' ');
const world = (page) => page.evaluate(() => window.__tfbt.world());
const shot = (page, name) => page.screenshot({ path: resolve(outDir, `p1_${name}.png`) });

async function newSession(browser, { width = 1366, height = 768, qa = false, settings } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  if (settings) await context.addInitScript((s) => localStorage.setItem('tfbt.settings.v1', JSON.stringify({ schema: 'settings_v1', values: s })), settings);
  const page = await context.newPage();
  const errors = [];
  const failed = [];
  const requests = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console.error: ${m.text()}`));
  page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    requests.push(r.url());
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(BASE + (qa ? '?qa=1' : ''));
  await page.waitForFunction(() => window.__tfbt?.activeScenes().includes('TitleScene'), null, { timeout: 15000 });
  await sleep(page, 350);
  return { context, page, errors, failed, requests };
}

async function startNewGame(page) {
  await page.keyboard.press('Enter', { delay: 30 });
  await page.waitForFunction(() => window.__tfbt.world()?.dialogue, null, { timeout: 15000 });
  await sleep(page, 200);
}

/** Menunggu teks dialog selesai diketik. */
async function waitText(page, timeout = 8000) {
  await page.waitForFunction(() => {
    const d = window.__tfbt.world()?.dialogue;
    return d && (d.state === 'waiting' || d.state === 'choice');
  }, null, { timeout });
}

/** Maju satu baris dengan Enter setelah teks selesai (menunggu jeda minimal). */
async function pressAdvance(page) {
  await sleep(page, 650);
  await page.keyboard.press('Enter', { delay: 30 });
  await sleep(page, 80);
}

/**
 * Memutar seluruh dialog yang sedang tampil sampai selesai, merekam urutan baris + portrait + label.
 * choose: indeks pilihan bila ada node pilihan.
 */
async function playDialogue(page, { choose = 0, record: rec = [] } = {}) {
  const seen = [];
  for (let guard = 0; guard < 80; guard++) {
    const w = await world(page);
    if (!w?.dialogue) break; // a completed prelude may already have transitioned World -> Battle
    const d = w.dialogue;
    if (d.state === 'typing') {
      await sleep(page, 60);
      continue;
    }
    if (d.state === 'choice') {
      rec.push({ choice: true, line: d.line });
      for (let i = 0; i < choose; i++) {
        await page.keyboard.press('ArrowDown', { delay: 30 });
        await sleep(page, 80);
      }
      await page.keyboard.press('Enter', { delay: 30 });
      await sleep(page, 120);
      continue;
    }
    const key = `${d.line}#${d.page}`;
    if (!seen.includes(key)) {
      seen.push(key);
      rec.push({ line: d.line, page: d.page, pages: d.pages, label: d.label, portrait: d.portrait, text: d.text, script: d.script });
    }
    await pressAdvance(page);
  }
  await sleep(page, 150);
  return rec;
}

async function idle(page) {
  await page.waitForFunction(() => {
    const w = window.__tfbt.world();
    return w && !w.busy && !w.dialogue;
  }, null, { timeout: 20000 });
  await sleep(page, 200);
}

/** Berjalan ke (tx,ty) dengan menahan tombol panah. Mengembalikan posisi akhir. */
async function walkTo(page, tx, ty, { tol = 4, axisOrder = 'xy', timeout = 40000 } = {}) {
  const t0 = Date.now();
  const axes = axisOrder === 'xy' ? ['x', 'y'] : ['y', 'x'];
  for (const axis of axes) {
    for (;;) {
      const w = await world(page);
      if (!w || w.busy || w.dialogue) return w;
      const d = (axis === 'x' ? tx - w.x : ty - w.y);
      if (Math.abs(d) <= tol) break;
      const key = axis === 'x' ? (d > 0 ? 'ArrowRight' : 'ArrowLeft') : d > 0 ? 'ArrowDown' : 'ArrowUp';
      await page.keyboard.down(key);
      let last = axis === 'x' ? w.x : w.y;
      let stuck = 0;
      for (;;) {
        await sleep(page, 30);
        const n = await world(page);
        if (!n || n.busy || n.dialogue) {
          await page.keyboard.up(key);
          return n;
        }
        const cur = axis === 'x' ? n.x : n.y;
        const rem = axis === 'x' ? tx - n.x : ty - n.y;
        if ((d > 0 && rem <= tol) || (d < 0 && rem >= -tol)) break;
        if (Math.abs(cur - last) < 0.5) stuck++;
        else stuck = 0;
        last = cur;
        if (stuck > 18 || Date.now() - t0 > timeout) {
          await page.keyboard.up(key);
          return n;
        }
      }
      await page.keyboard.up(key);
      await sleep(page, 40);
    }
  }
  return world(page);
}

async function face(page, key) {
  await page.keyboard.down(key);
  // Polling movement needs a real world frame, especially on a busy headless host.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(dir => window.__tfbt.world()?.facing === dir, { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[key]);
  await page.keyboard.up(key);
  await sleep(page, 80);
}

async function hold(page, key, ms) {
  await page.keyboard.down(key);
  await sleep(page, ms);
  await page.keyboard.up(key);
  await sleep(page, 120);
}

const layoutOk = async (page, label) => {
  await sleep(page, 150);
  const issues = await page.evaluate(() => window.__tfbt.layoutIssues());
  check(`Layout ${label}: teks dalam 320x180 dan tidak tumpang tindih`, issues.length === 0, issues.join(' ; '));
};

// ============================================================================================
async function main() {
  await startServer();
  let browser;
  try {
    browser = await chromium.launch({ channel: CHANNEL, headless: true });
  } catch (e) {
    console.error('Gagal membuka browser: ' + e.message);
    process.exit(2);
  }
  console.log(`Browser: ${CHANNEL} ${browser.version()}\nURL: ${BASE}\n`);

  // ================= SESI UTAMA: bermain dari awal sampai akhir demo =================
  {
    const s = await newSession(browser);
    const { page } = s;
    await startNewGame(page);

    // ---- C1-01 intro ----
    let w = await world(page);
    check('C1-01: intro dimulai (skrip C1-01-INTRO, baris L001)', w.dialogue?.script === 'C1-01-INTRO' && w.dialogue.line === 'C1-01-L001', JSON.stringify(w.dialogue));
    await waitText(page);
    w = await world(page);
    check('C1-01: pembicara Yaric, portrait CONFUSED, teks dalam kurung (pikiran)', w.dialogue.label === 'Yaric' && w.dialogue.portrait === 'C01_CONFUSED' && /^\(Hah\.\.\.\?/.test(w.dialogue.text), JSON.stringify(w.dialogue));
    check('C1-01: pemain terkunci (busy) selama dialog', w.busy === true);
    await shot(page, '01_intro_dialogue_confused');
    await layoutOk(page, 'dialog intro');
    const x0 = w.x, y0 = w.y;
    await hold(page, 'ArrowRight', 500);
    await hold(page, 'ArrowDown', 300);
    w = await world(page);
    check('Gerak tidak bocor saat dialog aktif (posisi tidak berubah)', w.x === x0 && w.y === y0, `${x0},${y0} -> ${w.x},${w.y}`);

    // Enter pertama saat mengetik = tampilkan semua (bukan lanjut)
    await waitText(page);
    await sleep(page, 650); // jeda L001
    await page.keyboard.press('Enter', { delay: 30 });
    await sleep(page, 40);
    w = await world(page);
    check('Enter ketika siap melanjutkan ke baris berikutnya (L002)', w.dialogue?.line === 'C1-01-L002', JSON.stringify(w.dialogue));
    // double-tap cepat: hanya satu baris maju
    await waitText(page);
    await sleep(page, 400);
    await page.keyboard.press('Enter', { delay: 5 });
    await page.keyboard.press('Enter', { delay: 5 });
    await page.keyboard.press('Enter', { delay: 5 });
    await sleep(page, 60);
    w = await world(page);
    check('Enter beruntun cepat tidak melompati baris (L002 -> L003, bukan selesai)', w.dialogue?.line === 'C1-01-L003' || (w.dialogue?.line === 'C1-01-L002'), JSON.stringify(w.dialogue));
    await playDialogue(page);
    await idle(page);
    w = await world(page);
    check('Intro selesai: kontrol kembali, dialog tertutup', !w.busy && !w.dialogue);
    check('Tujuan HUD muncul: Periksa sekitar (0/2)', w.objective === 'Periksa sekitar (0/2)', String(w.objective));
    check('Flag cerita belum naik sebelum diperiksa (story.c1_awake tidak ada)', !w.flags['story.c1_awake']);
    await shot(page, '02_forest_control_returned');

    // ---- gerak 4 arah + animasi ----
    const p0 = await world(page);
    await hold(page, 'ArrowUp', 300);
    let p1 = await world(page);
    check('Gerak ATAS (y berkurang, menghadap atas)', p1.y < p0.y && p1.facing === 'up', `${p0.y}->${p1.y} ${p1.facing}`);
    await hold(page, 'ArrowLeft', 300);
    let p2 = await world(page);
    check('Gerak KIRI (x berkurang, menghadap kiri)', p2.x < p1.x && p2.facing === 'left', `${p1.x}->${p2.x} ${p2.facing}`);
    await hold(page, 'KeyD', 300);
    let p3 = await world(page);
    check('Gerak KANAN dengan D (x bertambah, menghadap kanan)', p3.x > p2.x && p3.facing === 'right', `${p2.x}->${p3.x} ${p3.facing}`);
    await hold(page, 'KeyS', 300);
    let p4 = await world(page);
    check('Gerak BAWAH dengan S (y bertambah, menghadap bawah)', p4.y > p3.y && p4.facing === 'down', `${p3.y}->${p4.y} ${p4.facing}`);
    const dist = Math.hypot(p4.x - p3.x, p4.y - p3.y);
    check('Kecepatan wajar (~88 px/dtk): 300 ms menempuh 15-35 px', dist > 15 && dist < 35, String(dist));
    // tidak ada diagonal: dua tombol bersamaan -> hanya satu sumbu
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('ArrowUp');
    // Measure only the interval with BOTH keys held, excluding the gap between keydown events.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const q0 = await world(page);
    await sleep(page, 350);
    const q1 = await world(page);
    await page.keyboard.up('ArrowUp');
    await page.keyboard.up('ArrowRight');
    check('Gerak 4 arah: dua panah bersamaan tidak menghasilkan diagonal', (q1.x === q0.x) !== (q1.y === q0.y) || (Math.abs(q1.x - q0.x) < 2 || Math.abs(q1.y - q0.y) < 2), `${q0.x},${q0.y} -> ${q1.x},${q1.y}`);

    // ---- collision ----
    await walkTo(page, 40, 460, { axisOrder: 'xy', timeout: 15000 });
    await hold(page, 'ArrowLeft', 2500);
    w = await world(page);
    check('Collision: tepi hutan kiri menghentikan pemain (8 < x < 120)', w.x > 8 && w.x < 120, String(w.x));
    await walkTo(page, 134, 450);
    await hold(page, 'ArrowUp', 4000);
    w = await world(page);
    check('Collision: pohon/batu di utara clearing menghentikan pemain (y > 330)', w.y > 330, String(w.y));

    // ---- kamera ----
    const cam = (await world(page)).cam;
    check('Kamera: tidak keluar batas peta di awal (x>=0,y>=0)', cam.x >= 0 && cam.y >= 0 && cam.x + cam.w <= cam.bw && cam.y + cam.h <= cam.bh, JSON.stringify(cam));

    // ---- interaksi: arah dan jarak ----
    // Stay north of the tracks' hit area with enough margin for a few facing frames.
    await walkTo(page, 134, 425);
    await face(page, 'ArrowDown');
    w = await world(page);
    check('Prompt interaksi muncul bila menghadap bekas langkah (Periksa)', w.target === 'ground_tracks' && w.prompt === 'Periksa', JSON.stringify([w.target, w.prompt]));
    await shot(page, '03_prompt_examine');
    await face(page, 'ArrowUp');
    w = await world(page);
    check('Membelakangi objek: tidak ada prompt', w.target === null, JSON.stringify({ x: w.x, y: w.y, facing: w.facing, target: w.target }));
    await page.keyboard.press('KeyE', { delay: 30 });
    await sleep(page, 200);
    w = await world(page);
    check('Tekan E tanpa target: tidak terjadi apa-apa (tidak ada dialog)', !w.dialogue && !w.busy);

    await face(page, 'ArrowDown');
    await page.keyboard.press('KeyE', { delay: 30 });
    await waitText(page);
    w = await world(page);
    check('Periksa tanah: dialog C1-01-X001 (Yaric, CONFUSED, kurung)', w.dialogue?.line === 'C1-01-X001' && w.dialogue.portrait === 'C01_CONFUSED' && /^\(Ada bekas langkah/.test(flat(w.dialogue.text)), JSON.stringify(w.dialogue));
    check('Satu tekan E tidak memicu dialog dua kali (satu skrip aktif)', w.dialogue?.script === 'C1-01-EXAMINE-GROUND');
    await shot(page, '04_examine_ground_dialogue');
    await layoutOk(page, 'dialog periksa tanah');
    await playDialogue(page);
    await idle(page);
    w = await world(page);
    check('Setelah periksa tanah: progres 1/2, awake belum', w.objective === 'Periksa sekitar (1/2)' && !w.flags['story.c1_awake'], JSON.stringify([w.objective, w.flags]));

    // pedang
    await walkTo(page, 221, 438);
    await face(page, 'ArrowUp');
    w = await world(page);
    check('Menghadap pedang: prompt Periksa (target sword)', w.target === 'sword', JSON.stringify([w.target, w.x, w.y, w.facing]));
    await page.keyboard.press('Enter', { delay: 30 });
    await waitText(page);
    w = await world(page);
    check('Periksa pedang: C1-01-X002', w.dialogue?.line === 'C1-01-X002' && /Tanganku tahu cara memegang ini/.test(flat(w.dialogue.text)), JSON.stringify(w.dialogue));
    // lanjut hingga Jurnal
    await sleep(page, 700);
    await page.keyboard.press('Enter', { delay: 30 });
    await sleep(page, 100);
    await page.keyboard.press('Enter', { delay: 30 }); // selesaikan teks bila perlu
    await sleep(page, 100);
    let sawJournal = false;
    for (let i = 0; i < 12; i++) {
      w = await world(page);
      if (w.dialogue?.script === 'C1-01-JOURNAL') {
        sawJournal = true;
        break;
      }
      if (!w.dialogue) break;
      await pressAdvance(page);
    }
    w = await world(page);
    check('Jurnal tampil sebagai pesan sistem (label Jurnal, tanpa portrait)', sawJournal && w.dialogue?.label === 'Jurnal' && w.dialogue.portrait === '', JSON.stringify(w.dialogue));
    check('Flag story.c1_awake BELUM naik saat jurnal masih tampil (hanya setelah event selesai)', !w.flags['story.c1_awake']);
    await shot(page, '05_journal');
    await playDialogue(page);
    await idle(page);
    w = await world(page);
    check('story.c1_awake naik setelah scene selesai; tujuan berganti', w.flags['story.c1_awake'] === true && w.objective === 'Cari jalan keluar dari hutan.', JSON.stringify([w.flags, w.objective]));
    // idempotensi
    const logLen = w.log.filter((l) => l === 'flag:story.c1_awake').length;
    await face(page, 'ArrowUp');
    await page.keyboard.press('Enter', { delay: 30 });
    await waitText(page);
    await playDialogue(page);
    await idle(page);
    w = await world(page);
    check('Periksa pedang lagi: tidak menggandakan flag/jurnal', w.log.filter((l) => l === 'flag:story.c1_awake').length === logLen && !w.log.includes('dialogue:C1-01-JOURNAL#2'));

    // ---- gerbang tak terlihat sudah terbuka -> Nambo ----
    await walkTo(page, 270, 500, { axisOrder: 'yx' });
    w = await world(page);
    check('Gerbang terbuka setelah C1-01 (pemain melewati x=264)', w.x > 264, String(w.x));

    // Nambo: pemicu otomatis di zona
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => window.__tfbt.world()?.dialogue, null, { timeout: 15000 });
    await page.keyboard.up('ArrowRight');
    await sleep(page, 150);
    w = await world(page);
    check('C1-02: terpicu otomatis saat mendekati Nambo', w.dialogue?.script === 'C1-02-MEET' && w.dialogue.line === 'C1-02-L001', JSON.stringify(w.dialogue));
    check('C1-02: pembicara Nambo + portrait SURPRISED', w.dialogue.label === 'Nambo' && w.dialogue.portrait === 'C08_SURPRISED', JSON.stringify(w.dialogue));
    // Exercise Enter before the movement hold/screenshots can finish the short line's typewriter.
    const wasTyping = w.dialogue.state === 'typing';
    if (wasTyping) await page.keyboard.press('Enter', { delay: 10 });
    await sleep(page, 30);
    w = await world(page);
    check('Enter saat mengetik menampilkan teks penuh tanpa lanjut baris', w.dialogue?.line === 'C1-02-L001' && w.dialogue.state === 'waiting', JSON.stringify(w.dialogue));
    const xAt = w.x;
    await hold(page, 'ArrowRight', 400);
    w = await world(page);
    check('C1-02: pemain terkunci saat berbicara dengan Nambo', Math.abs(w.x - xAt) < 1.5 && w.busy);
    await shot(page, '06_nambo_dialogue_surprised');
    await layoutOk(page, 'dialog Nambo');

    const rec = [];
    // mainkan sampai pilihan
    for (let guard = 0; guard < 600; guard++) {
      w = await world(page);
      if (w.dialogue?.state === 'choice') break;
      if (w.dialogue?.state === 'waiting') {
        const k = `${w.dialogue.line}#${w.dialogue.page}`;
        if (!rec.find((r) => r.k === k)) rec.push({ k, line: w.dialogue.line, label: w.dialogue.label, portrait: w.dialogue.portrait, text: w.dialogue.text });
        await pressAdvance(page);
      } else await sleep(page, 60);
    }
    w = await world(page);
    check('Pilihan jawaban muncul setelah "Biasanya berhasil."', w.dialogue?.state === 'choice' && rec.at(-1)?.line === 'C1-02-L011', JSON.stringify([w.dialogue, rec.at(-1)]));
    await shot(page, '07_choice');
    await layoutOk(page, 'pilihan jawaban');
    await page.keyboard.press('ArrowDown', { delay: 30 });
    await sleep(page, 100);
    await page.keyboard.press('ArrowUp', { delay: 30 });
    await sleep(page, 100);
    await page.keyboard.press('ArrowDown', { delay: 30 });
    await sleep(page, 100);
    await page.keyboard.press('Enter', { delay: 30 });
    await waitText(page);
    w = await world(page);
    check('Pilihan dioperasikan keyboard: opsi ke-2 diucapkan Yaric (ekspresi NEUTRAL)', flat(w.dialogue?.text) === 'Kau bisa tunjukkan jalan?' && w.dialogue.portrait === 'C01_NEUTRAL', JSON.stringify(w.dialogue));
    // lanjutkan sampai selesai
    for (let guard = 0; guard < 600; guard++) {
      w = await world(page);
      if (!w.dialogue) break;
      if (w.dialogue.state === 'waiting') {
        const k = `${w.dialogue.line}#${w.dialogue.page}`;
        if (!rec.find((r) => r.k === k)) rec.push({ k, line: w.dialogue.line, label: w.dialogue.label, portrait: w.dialogue.portrait, text: w.dialogue.text });
        await pressAdvance(page);
      } else await sleep(page, 60);
    }
    await idle(page);
    const ids = rec.map((r) => r.line).filter((l) => /^C1-02-L\d+$/.test(l)).filter((l, i, a) => a.indexOf(l) === i); // halaman ke-2 baris panjang tidak dihitung ganda
    const expectIds = Array.from({ length: 16 }, (_, i) => `C1-02-L${String(i + 1).padStart(3, '0')}`);
    check('Semua 16 baris C1-02 tampil berurutan tanpa terlewat (dengan pilihan di antara L011 dan L012)', JSON.stringify(ids) === JSON.stringify(expectIds), JSON.stringify(ids));
    const namboPortraits = new Set(rec.filter((r) => r.label === 'Nambo').map((r) => r.portrait));
    const yaricPortraits = new Set(rec.filter((r) => r.label === 'Yaric').map((r) => r.portrait));
    check('Ekspresi Nambo berubah sesuai emosi (SURPRISED, NEUTRAL, HAPPY)', ['C08_SURPRISED', 'C08_NEUTRAL', 'C08_HAPPY'].every((p) => namboPortraits.has(p)), JSON.stringify([...namboPortraits]));
    check('Ekspresi Yaric berubah (NEUTRAL dan CONFUSED)', ['C01_NEUTRAL', 'C01_CONFUSED'].every((p) => yaricPortraits.has(p)), JSON.stringify([...yaricPortraits]));
    const l012 = rec.filter((r) => r.line === 'C1-02-L012');
    check('Baris panjang (L012, 141 karakter) dibagi halaman dan tidak terpotong', l012.length >= 2 && l012.every((r) => r.text.split(String.fromCharCode(10)).every((ln) => ln.length <= 28)), JSON.stringify(l012.map((r) => r.text)));
    w = await world(page);
    check('story.c1_nambo naik setelah percakapan; Nambo menepi ke bahu jalan', w.flags['story.c1_nambo'] === true && w.nambo.y < 470, JSON.stringify([w.flags, w.nambo]));
    check('Tujuan: Ikuti jalan sampai gerbang batu.', w.objective === 'Ikuti jalan sampai gerbang batu.', String(w.objective));
    check('C1-02 tidak terulang: tepat satu flag event', w.log.filter((l) => l === 'flag:story.c1_nambo').length === 1);

    // bicara lagi dengan Nambo (hanya baris naskah yang dipakai ulang)
    await walkTo(page, 352, 474, { axisOrder: 'yx' });
    await face(page, 'ArrowUp');
    w = await world(page);
    check('Nambo dapat diajak bicara dari jarak dekat dan menghadapnya', w.target === 'nambo' && w.prompt === 'Bicara', JSON.stringify([w.target, w.x, w.y, w.facing]));
    await page.keyboard.press('Enter', { delay: 30 });
    await waitText(page);
    const rep = await playDialogue(page);
    check('Bicara ulang: memutar ulang L014 dan L016 saja', JSON.stringify(rep.map((r) => r.line)) === JSON.stringify(['C1-02-L014', 'C1-02-L016']), JSON.stringify(rep.map((r) => r.line)));
    await idle(page);
    w = await world(page);
    check('Bicara ulang tidak menambah flag cerita', w.log.filter((l) => l === 'flag:story.c1_nambo').length === 1);
    // jauh dari Nambo: tidak ada target
    await walkTo(page, 352, 540);
    await face(page, 'ArrowUp');
    w = await world(page);
    check('NPC tidak bisa diajak bicara dari jarak jauh', w.target !== 'nambo', String(w.target));

    // ---- C1-03: lorong, papan, semak ----
    await walkTo(page, 576, 500, { axisOrder: 'xy' });
    await walkTo(page, 576, 482, { axisOrder: 'yx' });
    await face(page, 'ArrowUp');
    w = await world(page);
    check('Papan petunjuk (salinan 0): prompt Baca', w.target === 'sign#0' && w.prompt === 'Baca', JSON.stringify([w.target, w.x, w.y]));
    await page.keyboard.press('KeyE', { delay: 30 });
    await waitText(page);
    w = await world(page);
    check("Baca papan: \"'Aveloria — terus ke timur.'\" tanpa tanda kurung (kind read), ekspresi NEUTRAL", flat(w.dialogue?.text) === "'Aveloria — terus ke timur.'" && w.dialogue.portrait === 'C01_NEUTRAL', JSON.stringify(w.dialogue));
    await shot(page, '08_sign_first_read');
    await playDialogue(page);
    await idle(page);
    w = await world(page);
    check('Pembacaan pertama tidak memicu pengulangan (belum ada celah)', !w.thicketOpen && !w.flags['c1.loop_noticed']);

    // semak berduri menutup jalan setapak sebelum disadari
    await walkTo(page, 832, 482, { axisOrder: 'xy' });
    await hold(page, 'ArrowUp', 1800);
    w = await world(page);
    check('Semak berduri menghalangi jalan setapak (y tetap di selatan semak)', w.y > 455 && !w.thicketOpen, JSON.stringify([w.x, w.y, w.thicketOpen]));
    await shot(page, '09_thicket_blocked');

    // melewati batas: pengulangan lorong (wrap) tanpa membaca papan salinan 1
    await walkTo(page, 1400, 500, { axisOrder: 'yx', timeout: 60000 });
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => window.__tfbt.world().wrapCount >= 1, null, { timeout: 20000 });
    await page.keyboard.up('ArrowRight');
    await sleep(page, 150);
    w = await world(page);
    // wrap terjadi saat x >= 1536; posisi bergeser -768 dan kamera ikut
    check('Pengulangan lorong: melewati ujung memindahkan pemain mundur satu periode (x ~ 768-800)', w.wrapCount === 1 && w.x < 820 && w.x > 700, JSON.stringify([w.wrapCount, w.x]));
    const camAfter = w.cam;
    check('Kamera tetap di dalam batas peta setelah pengulangan', camAfter.x >= 0 && camAfter.x + camAfter.w <= camAfter.bw, JSON.stringify(camAfter));
    await shot(page, '10_after_wrap');

    // papan "yang tadi" (salinan 1 / setelah pengulangan)
    await walkTo(page, 1344, 500, { axisOrder: 'xy', timeout: 60000 });
    await walkTo(page, 1344, 482, { axisOrder: 'yx' });
    await face(page, 'ArrowUp');
    w = await world(page);
    check('Papan salinan berikutnya tersedia untuk dibaca', w.target && w.target.startsWith('sign#'), JSON.stringify([w.target, w.x, w.y]));
    await page.keyboard.press('Enter', { delay: 30 });
    await waitText(page);
    const rr = await playDialogue(page);
    check('"Papan yang tadi?" lalu "Kalau aku balik, jangan-jangan ada tiga." (ekspresi CONFUSED lalu DETERMINED)', rr.length >= 2 && flat(rr[0].text).includes('Papan yang tadi?') && rr[0].portrait === 'C01_CONFUSED' && rr[1].portrait === 'C01_DETERMINED', JSON.stringify(rr.map((r) => [r.line, r.portrait])));
    await idle(page);
    w = await world(page);
    check('Pengulangan disadari: semak terbuka dan petunjuk celah ditampilkan', w.thicketOpen && w.flags['c1.loop_noticed'] === true && /celah/i.test(w.toast), JSON.stringify([w.thicketOpen, w.toast]));
    check('story.c1_loop BELUM naik sebelum pemain memilih jalur lain', !w.flags['story.c1_loop']);
    await shot(page, '11_loop_noticed');

    // jalur lain: jalan setapak -> story.c1_loop
    await walkTo(page, 832, 484, { axisOrder: 'xy', timeout: 60000 });
    await walkTo(page, 832, 350, { axisOrder: 'yx' });
    w = await world(page);
    check('Jalan setapak terbuka: pemain masuk ke utara', w.y < 400, String(w.y));
    check('story.c1_loop naik saat memilih jalur lain (sekali)', w.flags['story.c1_loop'] === true && w.log.filter((l) => l === 'flag:story.c1_loop').length === 1, JSON.stringify(w.flags));
    await shot(page, '12_trail');

    // peti
    await walkTo(page, 870, 242, { axisOrder: 'yx' });
    await face(page, 'ArrowUp');
    w = await world(page);
    check('Peti: prompt Buka', w.target && w.target.startsWith('chest#') && w.prompt === 'Buka', JSON.stringify([w.target, w.x, w.y]));
    await page.keyboard.press('Enter', { delay: 30 });
    await waitText(page);
    w = await world(page);
    check('Peti: pesan sistem "Mendapat 1 Potion." (tanpa portrait)', w.dialogue?.text === 'Mendapat 1 Potion.' && w.dialogue.portrait === '', JSON.stringify(w.dialogue));
    const pr = await playDialogue(page);
    await idle(page);
    w = await world(page);
    check('Peti: Yaric berkomentar (L004), Potion = 1, peti terlihat terbuka', w.items.potion === 1 && w.chestOpen && pr.some((r) => r.line === 'C1-03-L004' && r.portrait === 'C01_NEUTRAL'), JSON.stringify([w.items, w.chestOpen, pr.map((r) => r.line)]));
    await shot(page, '13_chest_opened');
    await page.keyboard.press('Enter', { delay: 30 });
    await waitText(page);
    w = await world(page);
    check('Peti lagi: "Sudah kosong." dan Potion tetap 1 (tidak ada hadiah ganda)', /Sudah kosong/.test(w.dialogue?.text ?? ''), JSON.stringify(w.dialogue));
    await playDialogue(page);
    await idle(page);
    w = await world(page);
    check('Potion tetap tepat 1 setelah membuka ulang', w.items.potion === 1, JSON.stringify(w.items));

    // Phase 2 replaces the old end marker with C1-04, preserving the entire keyboard journey.
    await walkTo(page, 832, 242, { axisOrder: 'xy' });
    await page.keyboard.down('ArrowUp');
    await page.waitForFunction(() => window.__tfbt.world()?.dialogue?.script === 'C1-04-INTRO', null, { timeout: 20000 });
    await page.keyboard.up('ArrowUp');
    await sleep(page, 500);
    check('Penanda akhir Phase 1 kini menuju C1-04 sesuai naskah', (await world(page)).dialogue.line === 'C1-04-L001');
    await playDialogue(page);
    await battleTutorial(page, check, shot);
    const victoryLines = await playDialogue(page);
    await idle(page);
    check('Dialog kemenangan C1-04-L002/L003 berurutan', victoryLines.map(r => r.line).join(',') === 'C1-04-L002,C1-04-L003');
    const won = await world(page);
    check('Flag resmi, konsumsi Potion, HP/MP dan level-up konsisten di dunia', won.flags['battle.first_hollowling'] === true && won.items.potion === 0 && won.vitals?.mp === 10 && won.rpg.characters.C01.level === 2);
    await walkTo(page, won.x, 55, { axisOrder: 'yx' });
    check('Encounter tidak terulang setelah kemenangan', !(await page.evaluate(() => window.__tfbt.battle())) && !(await world(page)).dialogue);
    await persistenceJourney(page, check, shot, { walkTo, face, playDialogue });
    await verticalSliceJourney(page, check, shot, { walkTo, face, playDialogue });
    await aveloriaJourney(page, check, shot);

    check('Tidak ada error JS sepanjang sesi cerita penuh', s.errors.length === 0, s.errors.join(' | '));
    check('Tidak ada request gagal / 404 (aset hilang)', s.failed.length === 0, s.failed.join(' | '));
    check('Tidak ada permintaan file musik (.ogg/.mp3/.wav); game senyap tanpa BGM', !s.requests.some((u) => /\.(ogg|mp3|wav)(\?|$)/.test(u)), s.requests.filter((u) => /\.(ogg|mp3|wav)/.test(u)).join(','));
    await s.context.close();
  }

  // ================= Jeda + Pengaturan dari dunia =================
  {
    const s = await newSession(browser);
    const { page } = s;
    await startNewGame(page);
    await page.keyboard.press('Escape', { delay: 30 });
    await sleep(page, 250);
    let w = await world(page);
    check('Esc saat dialog tidak membuka Jeda (hanya mempercepat teks)', (await page.evaluate(() => window.__tfbt.inputLayer())) === 'dialogue' && w.dialogue, JSON.stringify(w.dialogue));
    await playDialogue(page);
    await idle(page);
    const before = await world(page);
    await page.keyboard.press('Escape', { delay: 30 });
    await sleep(page, 300);
    check('Esc di dunia: Menu Jeda terbuka', (await page.evaluate(() => window.__tfbt.inputLayer())) === 'pause');
    await shot(page, '15_pause');
    await layoutOk(page, 'Menu Jeda');
    await hold(page, 'ArrowRight', 500);
    const during = await world(page);
    check('Selama Jeda dunia tidak bergerak', during.x === before.x && during.y === before.y);
    // Pengaturan dari Jeda
    await selectMenu(page, 'settings');
    await page.keyboard.press('Enter', { delay: 30 });
    await sleep(page, 400);
    check('Pengaturan terbuka dari Menu Jeda', (await page.evaluate(() => window.__tfbt.inputLayer())) === 'settings');
    const sBefore = await page.evaluate(() => window.__tfbt.settings());
    await page.keyboard.press('ArrowDown', { delay: 30 });
    await page.keyboard.press('ArrowLeft', { delay: 30 });
    await sleep(page, 150);
    const sAfter = await page.evaluate(() => window.__tfbt.settings());
    check('Nilai Pengaturan dari Jeda sama dengan Title dan langsung tersimpan', sAfter.bgm_volume === sBefore.bgm_volume - 5 && JSON.parse(await page.evaluate(() => localStorage.getItem('tfbt.settings.v1'))).values.bgm_volume === sAfter.bgm_volume);
    await page.keyboard.press('Escape', { delay: 30 });
    await sleep(page, 400);
    check('Esc menutup Pengaturan satu layer: kembali ke Jeda', (await page.evaluate(() => window.__tfbt.inputLayer())) === 'pause');
    await page.keyboard.press('Escape', { delay: 30 });
    await sleep(page, 400);
    check('Esc menutup Jeda: kembali ke dunia', (await page.evaluate(() => window.__tfbt.inputLayer())) === 'world');
    const resumeX = (await world(page)).x;
    await hold(page, 'ArrowRight', 300);
    check('Setelah Jeda gerak normal kembali', (await world(page)).x > resumeX);
    check('Tidak ada error JS di sesi Jeda', s.errors.length === 0, s.errors.join(' | '));
    await s.context.close();
  }

  // ================= Text Speed memengaruhi dialog =================
  {
    const measure = async (speed) => {
      const s = await newSession(browser, { settings: { master_volume: 100, bgm_volume: 70, sfx_volume: 80, mute_all: false, text_speed: speed, fullscreen: false, screen_scale: 'fit', screen_shake: true, reduced_flashes: true } });
      await startNewGame(s.page);
      // baris L003 panjang (23 karakter): ukur panjang teks 250 ms setelah dialog L001 -> maju
      await waitText(s.page);
      await sleep(s.page, 650);
      await s.page.keyboard.press('Enter', { delay: 20 });
      await sleep(s.page, 700);
      await s.page.keyboard.press('Enter', { delay: 20 }); // L002 -> L003
      await sleep(s.page, 30);
      const w1 = await world(s.page);
      await sleep(s.page, 250);
      const w2 = await world(s.page);
      await s.context.close();
      return { l: w1.dialogue?.line, a: w1.dialogue?.text.length ?? 0, b: w2.dialogue?.text.length ?? 0 };
    };
    const slow = await measure('slow');
    const instant = await measure('instant');
    check('Text Speed LAMBAT: teks diketik bertahap (belum penuh setelah 250 ms)', slow.b < 25 && slow.b >= slow.a, JSON.stringify(slow));
    check('Text Speed INSTAN: teks langsung penuh', instant.a >= 24, JSON.stringify(instant));
  }

  // ================= Mulus-tidaknya pengulangan: perbandingan piksel (teleport QA) =================
  {
    const s = await newSession(browser, { qa: true });
    const { page } = s;
    await startNewGame(page);
    await playDialogue(page);
    await idle(page);
    const clip = { x: 0, y: 0, width: 1366, height: 768 };
    const grab = async (x, y) => {
      await page.evaluate(([x, y]) => window.__tfbt.qa.teleport(x, y), [x, y]);
      await sleep(page, 700);
      return page.screenshot({ clip });
    };
    // pandangan tepat sebelum wrap (x=1530) vs setelah mendarat (x=1530-768=762)
    const a = await grab(1530, 500);
    const b = await grab(762, 500);
    let diff = 0;
    // bandingkan PNG byte demi byte via dekode di browser
    const same = await page.evaluate(async ([ba, bb]) => {
      const dec = async (b64) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + b64;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, c.width, c.height).data;
      };
      const [da, db] = [await dec(ba), await dec(bb)];
      let n = 0;
      for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) n++;
      return { n, total: da.length / 4 };
    }, [a.toString('base64'), b.toString('base64')]);
    diff = same.n / same.total;
    check('Pengulangan lorong MULUS: pandangan sebelum wrap dan sesudah mendarat identik (selisih piksel < 0,2%)', diff < 0.002, `selisih ${(diff * 100).toFixed(3)}% (${same.n}/${same.total})`);
    writeFileSync(resolve(outDir, 'p1_wrap_before.png'), a);
    writeFileSync(resolve(outDir, 'p1_wrap_after.png'), b);
    // kamera di dekat tepi timur tidak terjepit saat wrap
    const cw = await world(page);
    check('Kamera di sekitar titik wrap berada di dalam batas peta', cw.cam.x >= 0 && cw.cam.x + cw.cam.w <= cw.cam.bw, JSON.stringify(cw.cam));
    check('Tidak ada error JS di sesi pengulangan', s.errors.length === 0, s.errors.join(' | '));
    await s.context.close();
  }

  // ================= 1920x1080: tampilan dialog =================
  {
    const s = await newSession(browser, { width: 1920, height: 1080 });
    const { page } = s;
    await startNewGame(page);
    await waitText(page);
    await shot(page, '16_dialogue_1920x1080');
    await layoutOk(page, 'dialog @1920x1080');
    const css = await page.evaluate(() => window.__tfbt.canvasCss());
    check('1920x1080: canvas 1920x1080 (zoom bulat 3x)', css.w === 1920 && css.h === 1080, JSON.stringify(css));
    await playDialogue(page);
    await idle(page);
    await shot(page, '17_forest_1920x1080');
    check('Tidak ada error JS @1920x1080', s.errors.length === 0, s.errors.join(' | '));
    await s.context.close();
  }

  await browser.close();
}

let exit = 0;
try {
  await main();
} catch (e) {
  console.error('E2E ERROR:', e);
  record('Eksekusi e2e Phase 1', false, String(e?.stack ?? e));
  exit = 1;
} finally {
  server?.kill();
}
const failed = results.filter((r) => !r.ok);
writeFileSync(resolve(outDir, 'e2e-phase1-report.json'), JSON.stringify({ when: new Date().toISOString(), total: results.length, failed: failed.length, results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} lulus. Screenshot & laporan: ${outDir}`);
process.exit(failed.length || exit ? 1 : 0);
