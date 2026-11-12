// Smoke test browser nyata (Edge/Chrome terpasang via playwright-core; tidak mengunduh browser).
// Menjalankan `vite preview` pada build di web/dist (jalankan `npm run build` dulu), lalu menekan tombol
// keyboard sungguhan. Screenshot + laporan JSON disimpan di ../.dev-cache/test-artifacts (drive D:).
//   npm run build && npm run test:e2e
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { selectMenu } from './battle-helpers.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '../..');
const outDir = resolve(webRoot, '../.dev-cache/test-artifacts');
mkdirSync(outDir, { recursive: true });

const PORT = Number(process.env.E2E_PORT ?? 4199);
const BASE = process.env.E2E_URL ?? `http://127.0.0.1:${PORT}/`;
const CHANNEL = process.env.E2E_CHANNEL ?? 'msedge';

const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};
const check = (name, cond, detail = '') => record(name, !!cond, cond ? '' : detail);

// ---- server ----
let server;
async function startServer() {
  if (process.env.E2E_URL) return;
  server = spawn(process.execPath, [resolve(webRoot, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: webRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('vite preview tidak siap')), 20000);
    server.stdout.on('data', (d) => {
      if (String(d).includes('127.0.0.1')) {
        clearTimeout(t);
        res();
      }
    });
    server.on('exit', (c) => rej(new Error('vite preview berhenti: ' + c)));
  });
}

// ---- helpers ----
const FNV = (text) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};
const validSaveEnvelope = () => {
  const data = { schemaVersion: 1, chapter: 'I', area: 'forest_1', position: { x: 1, y: 2, facing: 'down' }, party: ['C01'], flags: {}, playtimeSec: 12 };
  return JSON.stringify({ schema: 'save_v1', slot: 'slot1', savedAt: '2026-11-10T00:00:00.000Z', summary: { chapter: 'I', area: 'forest_1', playtimeSec: 12 }, checksum: FNV(JSON.stringify(data)), data });
};

async function newSession(browser, { width = 1366, height = 768, init, label } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  const errors = [];
  const failedReq = [];
  const requests = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  page.on('requestfailed', (r) => failedReq.push(`${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    requests.push(r.url());
    if (r.status() >= 400) failedReq.push(`${r.status()} ${r.url()}`);
  });
  return { context, page, errors, failedReq, requests, label };
}

const scenes = (page) => page.evaluate(() => window.__tfbt?.activeScenes() ?? []);
const layer = (page) => page.evaluate(() => window.__tfbt?.inputLayer());
const focus = (page) => page.evaluate(() => window.__tfbt?.focus());
const settings = (page) => page.evaluate(() => window.__tfbt?.settings());
const stored = (page, key) => page.evaluate((k) => localStorage.getItem(k), key);
const waitScene = async (page, name, timeout = 8000) => {
  await page.waitForFunction((n) => window.__tfbt && window.__tfbt.activeScenes().includes(n), name, { timeout });
  await page.waitForTimeout(250); // fade-in
};
const press = async (page, key, n = 1, delay = 80) => {
  for (let i = 0; i < n; i++) {
    await page.keyboard.press(key, { delay: 30 });
    await page.waitForTimeout(delay);
  }
};
const layoutOk = async (page, label, settle = 300) => {
  await page.waitForTimeout(settle);
  const issues = await page.evaluate(() => window.__tfbt.layoutIssues());
  check(`Layout ${label}: teks di dalam 320x180 dan tidak tumpang tindih`, issues.length === 0, issues.join(' ; '));
};
const skipDialogue = async (page) => {
  for (let i = 0; i < 40; i++) {
    const w = await page.evaluate(() => window.__tfbt.world());
    if (w && !w.busy && !w.dialogue) return;
    await page.keyboard.press('Enter', { delay: 30 });
    await page.waitForTimeout(330);
  }
};
const shot = (page, name) => page.screenshot({ path: resolve(outDir, `${name}.png`) });
const open = async (s) => {
  await s.page.goto(BASE);
  await waitScene(s.page, 'TitleScene');
};

async function main() {
  await startServer();
  let browser;
  try {
    browser = await chromium.launch({ channel: CHANNEL, headless: true });
  } catch (e) {
    console.error('Gagal membuka browser (' + CHANNEL + '): ' + e.message);
    process.exit(2);
  }
  const version = browser.version();
  console.log(`Browser: ${CHANNEL} ${version}\nURL: ${BASE}\n`);

  // =============== 1. Title @1366x768 ===============
  {
    const s = await newSession(browser);
    await open(s);
    const { page } = s;
    check('Title muncul (scene aktif TitleScene)', (await scenes(page)).includes('TitleScene'));
    check('Layer input aktif = title', (await layer(page)) === 'title');
    check('Fokus awal = Mulai Baru', (await focus(page)) === 'menu:new', String(await focus(page)));
    const css = await page.evaluate(() => window.__tfbt.canvasCss());
    check('Canvas 16:9 pada 1366x768 (Fit), tidak melebihi viewport', css.w <= 1366 && css.h <= 768 && Math.abs(css.w / css.h - 16 / 9) < 0.01 && css.h >= 760, JSON.stringify(css));
    const rendering = await page.evaluate(() => getComputedStyle(document.querySelector('canvas')).imageRendering);
    check('Canvas image-rendering nearest-neighbor', /pixelated|crisp-edges/.test(rendering), rendering);
    await shot(page, '01_title_1366x768');
    await layoutOk(page, 'Title');

    // Navigasi keyboard
    await press(page, 'ArrowDown');
    check('ArrowDown -> fokus Lanjut', (await focus(page)) === 'menu:continue', String(await focus(page)));
    await shot(page, '02_title_continue_disabled_focus');
    await layoutOk(page, 'Title + pesan Lanjut nonaktif');
    await press(page, 'Enter');
    await page.waitForTimeout(400);
    check('Lanjut nonaktif: Enter tidak berpindah scene', (await scenes(page)).includes('TitleScene') && !(await scenes(page)).includes('PlaceholderScene'), JSON.stringify(await scenes(page)));
    await press(page, 'ArrowDown');
    check('ArrowDown -> fokus Pengaturan', (await focus(page)) === 'menu:settings');
    await press(page, 'ArrowDown');
    check('ArrowDown -> fokus Panduan Kontrol', (await focus(page)) === 'menu:controls');
    await press(page, 'ArrowDown');
    check('Menu wrap ke Mulai Baru', (await focus(page)) === 'menu:new');
    await press(page, 'ArrowUp');
    check('ArrowUp wrap ke Panduan Kontrol', (await focus(page)) === 'menu:controls');
    await press(page, 'KeyW');
    check('W = naik (Pengaturan)', (await focus(page)) === 'menu:settings');
    await press(page, 'KeyS');
    check('S = turun (Panduan Kontrol)', (await focus(page)) === 'menu:controls');

    // Controls
    await press(page, 'Enter');
    await waitScene(page, 'ControlsScene');
    check('Panduan Kontrol terbuka (overlay, layer controls)', (await layer(page)) === 'controls');
    await shot(page, '03_controls');
    await layoutOk(page, 'Panduan Kontrol');
    await press(page, 'Escape');
    await page.waitForTimeout(300);
    check('Esc menutup Panduan Kontrol, kembali ke Title (satu layer saja)', (await layer(page)) === 'title' && (await scenes(page)).includes('TitleScene') && !(await scenes(page)).includes('ControlsScene'), `${await layer(page)} ${JSON.stringify(await scenes(page))}`);

    // Mulai Baru + spam Enter
    await press(page, 'ArrowUp');
    await press(page, 'ArrowUp');
    await press(page, 'ArrowUp'); // dari Controls -> Settings -> Lanjut -> Mulai Baru
    check('Fokus kembali ke Mulai Baru', (await focus(page)) === 'menu:new', String(await focus(page)));
    for (let i = 0; i < 6; i++) await page.keyboard.press('Enter', { delay: 10 });
    await waitScene(page, 'WorldScene');
    await page.waitForTimeout(500);
    const sc = await scenes(page);
    check('Mulai Baru -> WorldScene tunggal (spam Enter tidak menggandakan)', sc.filter((x) => x === 'WorldScene').length === 1 && !sc.includes('TitleScene'), JSON.stringify(sc));
    check('Mulai Baru tidak menulis save apa pun', (await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('tfbt.save.')).length)) === 0);
    await skipDialogue(page);
    await press(page, 'Escape');
    await page.waitForTimeout(300);
    check('Esc di dunia membuka Menu Jeda (layer pause)', (await layer(page)) === 'pause', String(await layer(page)));
    await selectMenu(page, 'title');
    await press(page, 'Enter');
    await page.waitForTimeout(250);
    await press(page, 'ArrowDown');
    await press(page, 'Enter');
    await waitScene(page, 'TitleScene');
    check('Jeda -> Kembali ke Judul (konfirmasi) -> Title; dunia dan HUD berhenti', (await layer(page)) === 'title' && !(await scenes(page)).includes('WorldScene') && !(await scenes(page)).includes('HudScene'), JSON.stringify(await scenes(page)));

    check('Tidak ada error JS di sesi Title', s.errors.length === 0, s.errors.join(' | '));
    check('Tidak ada request gagal / 404 (aset)', s.failedReq.length === 0, s.failedReq.join(' | '));
    check('Tidak ada request file musik (.ogg)', !s.requests.some((u) => (/\.(ogg|mp3|wav)(\?|$)/.test(u) && !/\/audio\/sfx\//.test(u))), s.requests.filter((u) => /\.(ogg|mp3|wav)/.test(u) && !/\/audio\/sfx\//.test(u)).join(','));
    await s.context.close();
  }

  // =============== 2. Settings: ubah, simpan, refresh, reset ===============
  {
    const s = await newSession(browser);
    await open(s);
    const { page } = s;
    // Seed save dummy valid agar bisa dicek tidak tersentuh Reset
    await page.evaluate((env) => localStorage.setItem('tfbt.save.v1.slot1', env), validSaveEnvelope());

    const def = await settings(page);
    check('Default settings sesuai GDD', JSON.stringify(def) === JSON.stringify({ master_volume: 100, bgm_volume: 70, sfx_volume: 80, mute_all: false, text_speed: 'normal', fullscreen: false, screen_scale: 'fit', screen_shake: true, reduced_flashes: true }), JSON.stringify(def));

    await press(page, 'ArrowDown', 2); // Pengaturan
    await press(page, 'Enter');
    await waitScene(page, 'SettingsScene');
    check('Settings terbuka dari Title; layer input = settings', (await layer(page)) === 'settings');
    check('Enter yang membuka Settings tidak langsung mengubah apa pun', JSON.stringify(await settings(page)) === JSON.stringify(def));
    check('Fokus awal Settings = Volume Utama', (await focus(page)) === 'settings:master');
    await layoutOk(page, 'Settings', 2500);
    await shot(page, '05_settings_default');

    await press(page, 'ArrowRight'); // master sudah 100
    check('Volume Utama tidak melebihi 100', (await settings(page)).master_volume === 100);
    await press(page, 'ArrowLeft', 3);
    check('Volume Utama turun 3 langkah (85)', (await settings(page)).master_volume === 85, String((await settings(page)).master_volume));
    await press(page, 'ArrowDown');
    await press(page, 'KeyA', 2);
    check('Musik 70 -> 60 (A = kiri)', (await settings(page)).bgm_volume === 60);
    await press(page, 'ArrowDown');
    await press(page, 'ArrowRight', 2);
    check('Efek Suara 80 -> 90', (await settings(page)).sfx_volume === 90);
    await press(page, 'ArrowDown');
    await press(page, 'Enter');
    check('Bisukan aktif (slider tidak berubah)', (await settings(page)).mute_all === true && (await settings(page)).bgm_volume === 60);
    await press(page, 'ArrowDown');
    await press(page, 'ArrowRight');
    check('Kecepatan Teks Normal -> Cepat', (await settings(page)).text_speed === 'fast', (await settings(page)).text_speed);
    await press(page, 'ArrowRight');
    check('Kecepatan Teks -> Instan', (await settings(page)).text_speed === 'instant');
    await press(page, 'ArrowRight');
    check('Kecepatan Teks wrap -> Lambat', (await settings(page)).text_speed === 'slow');
    await press(page, 'ArrowDown', 2); // lewati Layar Penuh -> Skala
    check('Fokus = Skala Tampilan', (await focus(page)) === 'settings:scale');
    await press(page, 'Enter');
    await page.waitForTimeout(200);
    check('Skala -> Pixel Perfect', (await settings(page)).screen_scale === 'pixel_perfect');
    const css = await page.evaluate(() => window.__tfbt.canvasCss());
    check('Pixel Perfect @1366x768 = 1280x720 (zoom 4x bulat)', css.w === 1280 && css.h === 720, JSON.stringify(css));
    await shot(page, '06_settings_pixel_perfect_1366');
    await press(page, 'ArrowDown');
    await press(page, 'Enter');
    check('Goyang Layar -> Mati', (await settings(page)).screen_shake === false);
    await press(page, 'ArrowDown');
    await press(page, 'Enter');
    check('Kurangi Kilatan -> Mati (default Aktif)', (await settings(page)).reduced_flashes === false);
    await shot(page, '07_settings_changed');

    const raw = JSON.parse(await stored(page, 'tfbt.settings.v1'));
    check('Tersimpan di localStorage (schema settings_v1)', raw.schema === 'settings_v1' && raw.values.bgm_volume === 60 && raw.values.text_speed === 'slow', JSON.stringify(raw));

    // refresh
    const expected = await settings(page);
    await page.reload();
    await waitScene(page, 'TitleScene');
    check('Settings tetap sama setelah refresh', JSON.stringify(await settings(page)) === JSON.stringify(expected), JSON.stringify(await settings(page)));
    const css2 = await page.evaluate(() => window.__tfbt.canvasCss());
    check('Skala Pixel Perfect tetap diterapkan setelah refresh', css2.w === 1280 && css2.h === 720, JSON.stringify(css2));

    // Reset Defaults + konfirmasi
    await press(page, 'ArrowDown', 2);
    await press(page, 'Enter');
    await waitScene(page, 'SettingsScene');
    await press(page, 'ArrowUp', 2); // dari master -> back -> reset
    check('Fokus = Kembalikan Bawaan', (await focus(page)) === 'settings:reset', String(await focus(page)));
    await press(page, 'Enter');
    await page.waitForTimeout(200);
    check('Dialog konfirmasi reset memakai layer sendiri', (await layer(page)) === 'settings-confirm');
    await shot(page, '08_settings_reset_confirm');
    await press(page, 'Escape');
    check('Batal (Esc) menutup konfirmasi, nilai tetap', (await layer(page)) === 'settings' && JSON.stringify(await settings(page)) === JSON.stringify(expected));
    await press(page, 'Enter');
    await page.waitForTimeout(150);
    await press(page, 'Enter'); // fokus awal = Batal -> tidak mereset
    check('Fokus awal konfirmasi = Batal (Enter tidak mereset)', JSON.stringify(await settings(page)) === JSON.stringify(expected));
    await press(page, 'Enter');
    await page.waitForTimeout(150);
    await press(page, 'ArrowRight');
    await press(page, 'Enter');
    await page.waitForTimeout(200);
    check('Reset Defaults mengembalikan semua ke bawaan', JSON.stringify(await settings(page)) === JSON.stringify(def), JSON.stringify(await settings(page)));
    check('Reset Defaults TIDAK menghapus save', (await stored(page, 'tfbt.save.v1.slot1')) === validSaveEnvelope());
    const css3 = await page.evaluate(() => window.__tfbt.canvasCss());
    check('Skala kembali Fit setelah reset', css3.w !== 1280, JSON.stringify(css3));

    // Esc menutup Settings
    await press(page, 'Escape');
    await page.waitForTimeout(300);
    check('Esc menutup Settings -> Title', (await layer(page)) === 'title' && !(await scenes(page)).includes('SettingsScene'));

    // Save valid -> Lanjut aktif
    await page.reload();
    await waitScene(page, 'TitleScene');
    await press(page, 'ArrowDown');
    await press(page, 'Enter');
    await waitScene(page, 'WorldScene');
    await shot(page, '09_continue_world');
    await layoutOk(page, 'Lanjut ke dunia');
    check('Dengan save lama valid, Lanjut memigrasikan dan memuat WorldScene', (await scenes(page)).includes('WorldScene'));
    check('Lanjut tidak mengubah save', (await stored(page, 'tfbt.save.v1.slot1')) === validSaveEnvelope());

    check('Tidak ada error JS di sesi Settings', s.errors.length === 0, s.errors.join(' | '));
    await s.context.close();
  }

  // =============== 3. Fullscreen ===============
  {
    const s = await newSession(browser);
    await open(s);
    const { page } = s;
    await press(page, 'ArrowDown', 2);
    await press(page, 'Enter');
    await waitScene(page, 'SettingsScene');
    await press(page, 'ArrowDown', 5);
    check('Fokus = Layar Penuh', (await focus(page)) === 'settings:fullscreen', String(await focus(page)));
    await press(page, 'Enter');
    await page.waitForTimeout(700);
    const st = await page.evaluate(() => ({ fs: !!document.fullscreenElement, setting: window.__tfbt.settings().fullscreen }));
    check('Layar Penuh: nilai setting = keadaan fullscreen sebenarnya (berhasil atau ditolak, tidak pernah tak sinkron)', st.fs === st.setting, JSON.stringify(st));
    record('Info: fullscreen di headless', true, st.fs ? 'DITERIMA browser' : 'DITOLAK browser (toggle dikembalikan, pesan ditampilkan)');
    if (st.fs) {
      await page.evaluate(() => document.exitFullscreen());
      await page.waitForTimeout(500);
      const after = await page.evaluate(() => ({ fs: !!document.fullscreenElement, setting: window.__tfbt.settings().fullscreen }));
      check('Keluar fullscreen (Esc browser) menyinkronkan toggle ke Mati', after.fs === false && after.setting === false, JSON.stringify(after));
    }
    // Simulasi penolakan: paksa requestFullscreen menolak
    await page.evaluate(() => {
      Element.prototype.requestFullscreen = () => Promise.reject(new TypeError('Permissions check failed'));
    });
    await press(page, 'Enter');
    await page.waitForTimeout(500);
    const denied = await page.evaluate(() => ({ fs: !!document.fullscreenElement, setting: window.__tfbt.settings().fullscreen }));
    check('Fullscreen ditolak browser: toggle tetap Mati, tidak crash', denied.fs === false && denied.setting === false, JSON.stringify(denied));
    await shot(page, '10_fullscreen_denied_message');
    await layoutOk(page, 'Settings + pesan fullscreen ditolak');
    check('Tidak ada error JS di sesi Fullscreen', s.errors.length === 0, s.errors.join(' | '));
    await s.context.close();
  }

  // =============== 4. Resolusi 1920x1080 ===============
  {
    const s = await newSession(browser, { width: 1920, height: 1080 });
    await open(s);
    const css = await s.page.evaluate(() => window.__tfbt.canvasCss());
    check('1920x1080 Fit = 1920x1080 (6x)', css.w === 1920 && css.h === 1080, JSON.stringify(css));
    await shot(s.page, '11_title_1920x1080');
    await press(s.page, 'ArrowDown', 2);
    await press(s.page, 'Enter');
    await waitScene(s.page, 'SettingsScene');
    await shot(s.page, '12_settings_1920x1080');
    await layoutOk(s.page, 'Settings @1920x1080', 2500);
    check('Tidak ada error JS @1920x1080', s.errors.length === 0, s.errors.join(' | '));
    await s.context.close();
  }

  // =============== 5. localStorage tidak tersedia ===============
  {
    const s = await newSession(browser, {
      init: () => {
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new DOMException('The operation is insecure.', 'SecurityError');
          },
        });
      },
    });
    await open(s);
    const { page } = s;
    check('localStorage melempar SecurityError: game tetap bisa dibuka (Title)', (await scenes(page)).includes('TitleScene'));
    check('Settings dilaporkan non-persistent', (await page.evaluate(() => window.__tfbt.persistent())) === false);
    await shot(page, '13_title_storage_blocked');
    await layoutOk(page, 'Title tanpa storage');
    await press(page, 'ArrowDown', 2);
    await press(page, 'Enter');
    await waitScene(page, 'SettingsScene');
    await press(page, 'ArrowDown');
    await press(page, 'ArrowLeft', 2);
    check('Settings tetap berfungsi dalam sesi tanpa storage', (await settings(page)).bgm_volume === 60);
    await shot(page, '14_settings_storage_blocked');
    await layoutOk(page, 'Settings + peringatan storage mati');
    check('Tidak ada error JS tanpa storage', s.errors.length === 0, s.errors.join(' | '));
    await s.context.close();
  }

  // =============== 6. Save korup ===============
  {
    const s = await newSession(browser);
    await s.page.goto(BASE);
    await waitScene(s.page, 'TitleScene');
    await s.page.evaluate(() => {
      localStorage.setItem('tfbt.save.v1.slot1', '{rusak');
      localStorage.setItem('tfbt.save.v1.auto', JSON.stringify({ schema: 'save_v1' }));
      localStorage.setItem('tfbt.settings.v1', '{{{ juga rusak');
    });
    await s.page.reload();
    await waitScene(s.page, 'TitleScene');
    await press(s.page, 'ArrowDown');
    await press(s.page, 'Enter');
    await s.page.waitForTimeout(400);
    check('Save & settings korup: tidak crash, Lanjut tetap nonaktif', (await scenes(s.page)).includes('TitleScene') && !(await scenes(s.page)).includes('PlaceholderScene'));
    check('Settings korup -> default', (await settings(s.page)).master_volume === 100);
    await shot(s.page, '15_title_corrupt_data');
    check('Tidak ada error JS dengan data korup', s.errors.length === 0, s.errors.join(' | '));
    await s.context.close();
  }

  // =============== 7. Desktop-only ===============
  {
    const s = await newSession(browser, { width: 390, height: 844 });
    await s.page.goto(BASE);
    await s.page.waitForTimeout(1500);
    const visible = await s.page.evaluate(() => {
      const g = document.getElementById('desktop-guard');
      return { hidden: g.hidden, text: g.textContent.trim().slice(0, 80) };
    });
    check('Viewport mobile: pesan desktop-only tampil', visible.hidden === false && /PC\/laptop/.test(visible.text), JSON.stringify(visible));
    await shot(s.page, '16_desktop_only_390x844');
    await s.page.keyboard.press('Enter');
    await s.page.waitForTimeout(200);
    check('Input game dimatikan di balik pesan desktop-only', (await scenes(s.page)).includes('TitleScene') && !(await scenes(s.page)).includes('PlaceholderScene'));
    await s.page.setViewportSize({ width: 1366, height: 768 });
    await s.page.waitForTimeout(400);
    const back = await s.page.evaluate(() => document.getElementById('desktop-guard').hidden);
    check('Memperbesar jendela menyembunyikan pesan', back === true);
    check('Tidak ada error JS @mobile', s.errors.length === 0, s.errors.join(' | '));
    await s.context.close();
  }

  // =============== 8. Tab blur ===============
  {
    const s = await newSession(browser);
    await open(s);
    await s.page.keyboard.down('ArrowDown');
    await s.page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await s.page.keyboard.up('ArrowDown');
    await press(s.page, 'ArrowDown');
    check('Setelah blur, tombol tidak "nyangkut": tekan ke-2 tetap diproses (Mulai Baru -> Pengaturan)', (await focus(s.page)) === 'menu:settings', String(await focus(s.page)));
    check('Tidak ada error JS saat blur', s.errors.length === 0, s.errors.join(' | '));
    await s.context.close();
  }

  await browser.close();
}

let exit = 0;
try {
  await main();
} catch (e) {
  console.error('E2E ERROR:', e);
  record('Eksekusi e2e', false, String(e));
  exit = 1;
} finally {
  server?.kill();
}
const failed = results.filter((r) => !r.ok);
writeFileSync(resolve(outDir, 'e2e-report.json'), JSON.stringify({ when: new Date().toISOString(), total: results.length, failed: failed.length, results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} lulus. Screenshot & laporan: ${outDir}`);
process.exit(failed.length || exit ? 1 : 0);
