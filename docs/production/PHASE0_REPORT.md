# PHASE 0 REPORT — Web Foundation

**Tanggal:** 10 November 2026 · **Status: PASS (dengan batasan yang tercatat di bagian "Belum diuji")**

Phaser 4.2.1 + TypeScript 5.9 + Vite 8.3.7 di `web/`. Browser smoke test dijalankan di Microsoft Edge 157 (headless) lewat `playwright-core` terhadap build produksi (`vite preview`) **dan** dev server (`vite`).

## Deliverable dan gate (dinyatakan sebelum mulai)

| Deliverable | Bukti |
|---|---|
| Vite + Phaser 4.2.1 (pin eksak) + TS + lockfile di `web/` | `web/package.json`, `web/package-lock.json`; `npm ls phaser` = 4.2.1 |
| Title Scene 16:9 internal 320×180, nearest-neighbor | e2e: canvas 16:9, `image-rendering: pixelated`; screenshot `01_title_*` |
| Fokus keyboard global (satu `InputManager`, layer fokus) + pesan desktop-only | 8 unit test input; e2e navigasi, spam Enter, blur, viewport 390×844 |
| `SettingsRepository` + panel Settings dari Title (9 opsi, Reset + konfirmasi) | 14 unit test; e2e ubah, simpan, refresh, reset |
| `SaveRepository` berversi + `GameState` + typed IDs + `AssetRegistry` + `AudioManager` senyap | 59 unit test |
| `npm run dev` / `npm run build` dijalankan dan dicatat | di bawah |

## Hasil tes (nyata, 10 Nov 2026)

| Pemeriksaan | Hasil |
|---|---|
| Node / npm | v26.10.0 / 11.19.1 (instalasi sistem di `C:\Program Files\nodejs`, dipakai ulang, tidak dipasang ulang) |
| Phaser terpasang | 4.2.1 |
| `npm install` | 42 paket, 0 error |
| `npm run typecheck` (tsc strict, `noUncheckedIndexedAccess`) | 0 error |
| `npm test` (vitest 5.1) | **7 file, 85 tes lulus** |
| `npm run build` | sukses; `dist/` 1,4 MB (Phaser 1,37 MB di chunk sendiri, kode game 34,8 KB, font 12,5 KB) |
| `npm run dev` | server menjawab 200 (index dan `/src/main.ts`) |
| `npm run test:e2e` terhadap **preview build** | **84/84 lulus** |
| `npm run test:e2e` terhadap **dev server** | **84/84 lulus** |

Cakupan e2e (tekanan tombol sungguhan): navigasi Title (↑↓ W S, wrap), Lanjut nonaktif tidak bisa diaktifkan, Settings terbuka/tertutup (satu layer per Esc), semua 9 opsi diubah via keyboard, tersimpan di `localStorage` (`settings_v1`), tetap setelah refresh, Reset dengan konfirmasi (fokus awal "Batal", Esc membatalkan) dan **save tidak tersentuh**, fullscreen berhasil/ditolak/keluar via Esc tetap sinkron, Pixel Perfect 1366×768 = 1280×720 (zoom 4×) dan 1920×1080 = 6×, localStorage melempar `SecurityError`, save+settings korup, viewport mobile, blur, tidak ada error JS / 404 / request `.ogg`, dan pemeriksaan otomatis bahwa semua teks berada dalam 320×180 dan tidak saling menimpa.

Screenshot dan `e2e-report.json`: `.dev-cache/test-artifacts/` (di luar Git).

### Cacat yang ditemukan sendiri lalu diperbaiki
- Teks terpotong/menimpa di Panduan Kontrol, footer Settings, layar Mulai Baru, dan peringatan storage — ditemukan dari screenshot (tes tombol saja tidak menangkapnya); diperbaiki dan ditambahkan pemeriksaan batas/tumpang-tindih otomatis.
- `favicon.ico` 404 menghasilkan error console — diganti favicon inline.
- Risiko softlock: `fadeOut` tidak berjalan bila `fadeIn` belum selesai (Enter cepat) — memakai `camera.fade(..., force=true)`.

## Belum diuji / batasan (jujur)

- **Hanya Edge 157 headless.** Chrome, Firefox, dan browser non-headless belum dijalankan. `fullscreen` diterima di headless; perilaku dengan jendela sungguhan, F11 browser, dan multi-monitor belum diuji.
- **Tidak ada pengujian manusia** dan tidak ada pengukuran FPS/performa.
- **Audio tidak bisa diuji secara dengar**: tidak ada musik (AWAITING_COMPOSER). Yang diuji hanya logika volume (master × channel, mute) di `AudioManager` lewat backend palsu dan tidak adanya request audio. Slider Master/BGM/SFX tersimpan dan terhubung ke `AudioManager`, tetapi efek terdengar menunggu BGM dari Game Director.
- **Text Speed** baru dipakai pada baris contoh di Settings (bukan dialog; dialog = Phase 1). **Screen Shake** punya pratinjau nyata (getar saat dinyalakan); **Reduced Flashes** baru diuji sebagai gate `Effects.flash()` lewat unit test (belum ada efek kilat di game).
- Settings dari Pause Menu: tidak ada Pause Menu. Panel dibuat sebagai overlay (`SceneRouter.openOverlay`) agar Pause Phase 1+ memakai jalur yang sama; belum diuji dari Pause.
- HiDPI (devicePixelRatio ≠ 1) diuji hanya sebagai fungsi murni `computeScale`, bukan di layar nyata.
- Fullscreen: nilai tersimpan `fullscreen` selalu disesuaikan dengan keadaan sebenarnya saat boot (browser mewajibkan gesture), sehingga setelah refresh pemain keluar dari fullscreen dan toggle kembali **Mati**. Disengaja dan dicatat.
- Tidak ada Git: folder proyek bukan repositori git, sehingga tidak ada commit. `.gitignore` sudah disiapkan.

## Status placeholder

- **Font:** Press Start 2P (SIL OFL 1.1, via npm `@fontsource`) — placeholder; font final TBD (UI_STYLE_SPEC_V3_3).
- **Palet:** Deep Plum `#3B2A4A` dan Bitter Lime `#C7D96A` terkunci; netral lain (`ink`, `paper`, `rose`, dll.) di `src/game/config/palette.ts` adalah usulan TBD.
- **Aset:** tidak ada aset visual yang diimpor ke `web/public`. `AssetRegistry` memetakan 3 atlas v3.3 (Yaric, Hollowling, Ground Slam), semuanya `NEEDS_REVIEW`, `imported: false`; tes memeriksa dimensi PNG, grid frame, kanal alpha, dan event frame terhadap file asli. Aset v3.2 ditolak oleh registry.
- **Audio:** 13 cue BGM di `musicRegistry.ts` (dites identik dengan `MUSIC_REGISTRY.json`), semua `AWAITING_COMPOSER`; tidak ada file audio. Game senyap tanpa error.
- **Mulai Baru / Lanjut:** menuju layar pengganti yang menyatakan gameplay belum ada. Lanjut hanya aktif bila ada save **valid** (belum ada yang bisa menulis save).

## Instruksi Phase 1

1. `. .\web\scripts\dev-env.ps1` (cache/temp ke D:), lalu `cd web; npm run dev`.
2. Tambahkan `WorldScene` dan `DialogueManager`; scene baru mendaftarkan layer fokus lewat `services.input.pushLayer(...)` dan memakai `services.router`.
3. Pause Menu: buka Settings lewat `router.openOverlay(this, SCENE_KEYS.Settings)`.
4. Dialog memakai `TEXT_SPEED_MS_PER_CHAR` / `visibleChars` (sudah diuji) dan Enter pertama = tampilkan semua, Enter kedua = lanjut.
5. Impor aset hanya setelah verifikasi: ubah `imported`/`publicPath` di `assetManifest.ts` dan catat di `ASSET_INDEX.md`.
6. Jangan mengubah status Phase 1 menjadi selesai tanpa tes browser baru.
