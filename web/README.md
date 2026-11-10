# WEB APP — THE FATE: BEYOND TIME

Phaser 4.2.1 + TypeScript + Vite. **Status: Phase 0 dan Phase 1 selesai**; intro Chapter I (C1-01..C1-03) dapat dimainkan, belum ada battle/save. Laporan: `../docs/production/PHASE0_REPORT.md`, `../docs/production/PHASE1_REPORT.md`.

## Menjalankan

```powershell
cd web
. .\scripts\dev-env.ps1     # opsional: arahkan cache npm, TEMP, dan browser test ke drive D:
npm install                 # cache npm proyek: ../.dev-cache/npm (lewat web/.npmrc)
npm run dev                 # http://127.0.0.1:5173/
npm run build               # typecheck + build statis ke web/dist/
npm run preview             # sajikan web/dist (http://127.0.0.1:4173/)
npm test                    # unit test (vitest)
npm run test:e2e            # smoke Phase 0 + permainan Phase 1 dengan keyboard nyata (Microsoft Edge terpasang; build dulu)
npm run assets:prepare      # buat ulang aset turunan (portrait, atlas bersih) dan seni lingkungan DRAFT
node scripts/asset-qa.mjs <png> <json> <nama>   # QA atlas: bbox, tepi sel, kiri/kanan
npm run verify              # typecheck + unit test + build
```

Artefak e2e (screenshot, `e2e-report.json`): `../.dev-cache/test-artifacts/`. Cache Vite: `../.dev-cache/vite/`.

## Struktur

```text
src/main.ts                      composition root (membuat Services, Phaser.Game)
src/game/config/                 konstanta (320x180), palet, GameConfig
src/game/core/InputManager.ts    satu mapping keyboard -> intent + layer fokus
src/game/data/                   typed IDs, skema Settings, registry musik, manifest aset
src/game/systems/                SettingsRepository, SaveRepository, GameState, SceneRouter,
                                 AudioManager, AssetRegistry, FullscreenController,
                                 DisplayController/DisplayScale, Effects, StorageAdapter
src/game/scenes/                 Boot, Title, World (hutan), Hud (dialog/tujuan), Pause, Settings/Controls (overlay), Placeholder
src/game/world/                  Collision, Interaction, loader peta Hutan 1
src/game/dialogue/               DialogueRunner (murni), wrap/halaman, data C1-01..03
src/game/story/                  Chapter1Story (keputusan cerita murni, flag kanonik)
src/ui/                          MenuList, tema/teks, CSS halaman
tests/unit/                      vitest (logika murni, tanpa Phaser)
tests/e2e/smoke.mjs              playwright-core + Edge
```

## Aturan yang dijaga

- Keyboard: Arrow/WASD, Enter/Z, Esc/X; hanya layer fokus teratas menerima input.
- Settings dan save di key localStorage terpisah (`tfbt.settings.v1`, `tfbt.save.v1.*`); Reset Defaults tidak menyentuh save.
- Tanpa musik: semua cue `AWAITING_COMPOSER`, game senyap. Jangan menambahkan BGM; minta dari Game Director (`../AUDIO_COMPOSER_HANDOFF.md`).
- Aset aktif v3.3, status NEEDS_REVIEW, belum diimpor. Jangan menaruh data personal di `public/` (build publik).
- Font Press Start 2P (OFL) hanya placeholder.
