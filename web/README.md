# WEB APP — THE FATE: BEYOND TIME

Phase 4 PASS untuk scope fungsional/QA otomatis: 405 unit +375 produksi Edge +38 Chrome +38 dev Edge, strict TS/build lulus. Art dan target pacing manusia 10–15 menit masih perlu review.

Phaser 4.2.1 + TypeScript + Vite. Vertical slice C1-01..05: intro/Nambo/loop/Hollowling → checkpoint tepi hutan → Mournfang → penutup menuju Aveloria, dengan RPG dan save/load nyata. Status QA/backlog: `../docs/production/PHASE4_REPORT.md`. Bukan seluruh Chapter I; Phase 5 belum dimulai. Save lokal: tiga slot manual + satu autosave, Settings terpisah; menghapus data situs dapat menghapus progress.

## Menjalankan

```powershell
cd web
. .\scripts\dev-env.ps1     # arahkan cache npm, TEMP, dan browser test ke drive D:
# Dependency existing sudah tersedia; npm install hanya jika node_modules belum ada.
npm run dev                 # http://127.0.0.1:5173/
npm run build               # typecheck + build statis ke web/dist/
npm run preview             # sajikan web/dist (http://127.0.0.1:4173/)
npm test                    # unit test (vitest)
npm run test:e2e            # satu preview server: Phase 0–4, Title→dua battle→save/refresh→penutup (build dulu)
# Focused: $env:E2E_SUITES='phase4.mjs'; npm run test:e2e
# Browser Chrome existing: $env:E2E_CHANNEL='chrome'; npm run test:e2e
# Untuk memakai dev server yang sudah aktif:
# $env:E2E_URL='http://127.0.0.1:5173/'; npm run test:e2e
npm run assets:prepare      # buat ulang aset turunan (portrait, atlas bersih) dan seni lingkungan DRAFT
node scripts/asset-qa.mjs <png> <json> <nama>   # QA atlas: bbox, tepi sel, kiri/kanan
npm run verify              # typecheck + unit test + build
```

Artefak e2e (screenshot, `e2e-report.json`): `../.dev-cache/test-artifacts/`. Cache Vite: `../.dev-cache/vite/`.

## Struktur

```text
src/main.ts                      composition root (membuat Services, Phaser.Game)
src/game/config/                 canvas 640x360, UI 320x180, palet, GameConfig
src/game/core/InputManager.ts    satu mapping keyboard -> intent + layer fokus
src/game/data/                   typed IDs, skema Settings, registry musik, manifest aset
src/game/systems/                SettingsRepository, SaveRepository, GameState, SceneRouter,
                                 AudioManager, AssetRegistry, FullscreenController,
                                 DisplayController/DisplayScale, Effects, StorageAdapter
src/game/scenes/                 Boot, Title, World (hutan), Hud (dialog/tujuan), Pause, Settings/Controls (overlay), Placeholder
src/game/world/                  Collision, Interaction, Hutan 1 dan forestEdge (data + ground DRAFT)
src/game/dialogue/               DialogueRunner, wrap/halaman, C1-01..05 (source parity teruji)
src/game/story/                  Chapter1Story (keputusan cerita murni, flag kanonik)
src/game/combat/                 BattleEngine murni/intent boss, configurable encounter/session, atlas playback
src/game/rpg/                    definisi, progression, shared inventory, equipment/skill/shop actions, validation
src/game/systems/SaveCoordinator.ts safe checkpoint gate untuk repository existing
src/game/scenes/                 RpgMenuScene, SaveLoadScene, ShopScene (hanya harness QA untuk Phase 3)
src/game/scenes/BattleScene.ts   playback metadata, impact sekali, input layer battle
src/game/scenes/SliceEndScene.ts penutup demo, Settings/save dan kembali eksplorasi
src/ui/components/BattlePanel.ts menu/status/feedback yang dapat direvisi terpisah
src/ui/                          MenuList, tema/teks, CSS halaman
tests/unit/                      vitest (logika murni, tanpa Phaser)
tests/e2e/smoke.mjs              playwright-core + Edge
```

## Aturan yang dijaga

- Keyboard: Arrow/WASD, Enter/Space/E/Z, Esc/X; hanya layer fokus teratas menerima input. Esc saat animasi menunggu recovery, saat submenu kembali, saat perintah utama membuka Jeda.
- Settings dan save di key localStorage terpisah (`tfbt.settings.v1`, `tfbt.save.v1.*`); Reset Defaults tidak menyentuh save.
- Tanpa musik: semua cue `AWAITING_COMPOSER`, game senyap. Jangan menambahkan BGM; minta dari Game Director (`../AUDIO_COMPOSER_HANDOFF.md`).
- Atlas battle aktif v3.3 diimpor utuh di `public/assets/battle`, status NEEDS_REVIEW. `npm run assets:prepare` juga menyalinnya ulang. Jangan menaruh data personal di `public/`.
- Font Press Start 2P (OFL) hanya placeholder.

Pause dunia: Lanjutkan, Status, Inventaris, Perlengkapan, Jurus, Simpan/Muat, Pengaturan, Kembali ke Judul. Saat battle, perubahan RPG/save dinonaktifkan agar snapshot duel tetap konsisten; Pengaturan tetap bisa dibuka saat giliran aman. Save v2 memvalidasi stat/EXP/level/skill/equipment; v1 dimigrasikan tanpa mengubah byte slot asal saat dibaca. Sebelum overwrite, save valid sebelumnya disalin ke `.backup`; write/readback diverifikasi, error storage ditangani.

Angka DRAFT: Hollowling 25 EXP +8 emas, level 2 pada 25 EXP, satu poin jurus. Dataset kecil: Potion, greatsword Yaric, Baju Jalan, Ground Slam dan pilihan pasif ATK+2/DEF+2. Tidak ada merchant/quest baru untuk mendemonstrasikan sistem. `?qa=1` menyediakan harness toko terpisah untuk testing saja.

Phase 4: B01 HP 224, normal→persiapan→sapuan→pemulihan. Bertahan mengurangi sapuan; Ground Slam saat charge menggagalkannya. Rest sebelum boss mengisi HP/MP, tidak memberi item/EXP/gold. Reward sekali 45 EXP +20 emas +1 Potion. B01 PNG/JSON hanya empat pose asli; runtime aliases/holds bukan frame produksi baru. `?qa=1` → `__tfbt.qa.mournfang()` menyiapkan fixture sebelum boss; perjalanan utama tidak memakainya. Source hutan berulang tetap utuh. Save v2 mendapat area/beat/flags tambahan tanpa field wajib baru; save Phase 3 tetap terbaca.
