# WEB APP — THE FATE: BEYOND TIME

Phaser 4.2.1 + TypeScript + Vite. C1-01..C1-04 playable, termasuk duel Hollowling, kemenangan, kekalahan/retry dan Pause/Settings. **Phase 2: PARTIAL (gate visual sumber dan review manusia)**; laporan: `../docs/production/PHASE2_REPORT.md`. Save/load, EXP dan leveling belum diimplementasikan (Phase 3).

## Menjalankan

```powershell
cd web
. .\scripts\dev-env.ps1     # arahkan cache npm, TEMP, dan browser test ke drive D:
# Dependency existing sudah tersedia; npm install hanya jika node_modules belum ada.
npm run dev                 # http://127.0.0.1:5173/
npm run build               # typecheck + build statis ke web/dist/
npm run preview             # sajikan web/dist (http://127.0.0.1:4173/)
npm test                    # unit test (vitest)
npm run test:e2e            # satu preview server: Phase 0 + perjalanan Title→C1-04 + battle/retry (build dulu)
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
src/game/world/                  Collision, Interaction, loader peta Hutan 1
src/game/dialogue/               DialogueRunner (murni), wrap/halaman, data C1-01..03
src/game/story/                  Chapter1Story (keputusan cerita murni, flag kanonik)
src/game/combat/                 BattleEngine murni, BattleSession checkpoint/commit, tipe atlas
src/game/scenes/BattleScene.ts   playback metadata, impact sekali, input layer battle
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
