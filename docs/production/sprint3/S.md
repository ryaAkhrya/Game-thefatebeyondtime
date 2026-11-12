# Agent S (SFX) — catatan Phase 7

Status: FUNCTIONAL / AUDIO-REVIEW PENDING (belum didengar manusia). Detail lengkap: `docs/production/SFX_DESIGN_AND_MANIFEST.md`.

## Dibuat
- `web/scripts/sfx/{dsp,catalog,generate}.mjs` + `.d.mts` + `manifest.json` (SHA-256). Regenerasi: `node web/scripts/sfx/generate.mjs`.
- `web/public/assets/audio/sfx/*.wav`: 44 id, 53 WAV (44.1 kHz 16-bit mono, puncak -3 dBFS, ~2.7 MB). Tanpa BGM, tanpa sampel pihak ketiga.
- `web/src/game/data/sfxRegistry.ts` (DIHASILKAN generator; semua READY; tambahan field `category`, `durationMs`).
- `battleSfxRegistry.ts`: id lama diselesaikan dari registry baru (file `sfx/<id>.wav`, URL identik dengan pemuatan registry sehingga BootScene tidak memuat ganda).
- `AudioManager`: `playSfx(id, {volume, rate}) -> SfxResult` (tidak pernah melempar), `tryPlaySfx` (boolean), batas laju `minIntervalMs`, variasi tanpa pengulangan langsung, maks 8 suara (`MAX_SFX_VOICES`), `debug()`/`resetDebug()`; konstruktor menerima `now` dan `cues` (untuk tes). `SoundBackend.playSfx?(key, volume, rate)` opsional.
- Wiring UI: `src/ui/kit/sfx.ts` (`uiSfx`), `MenuList` (move/confirm/disabled, opsi `sfx` per menu), `DialogueBox` (advance / pilihan digeser / dipilih), Pause, Journal, Controls, Shop (beli/jual/gagal), SaveLoad (save ok/fail), RpgMenu (item use / equip / gagal), Settings. Title memakai default MenuList.
- Catatan path: `web/src/game/ui/**` tidak ada; komponen UI sebenarnya di `web/src/ui/**` (itulah yang disentuh).
- Tes: `tests/unit/sfx.test.ts`, `tests/unit/sfx-audio.test.ts`; `audio.test.ts` diperbarui (SFX lama kini READY).

## Bukti
- `npx vitest run tests/unit/sfx.test.ts tests/unit/sfx-audio.test.ts tests/unit/audio.test.ts`: 82/82 lulus. `npx tsc --noEmit`: bersih.

## Permintaan ke lead
1. `main.ts` backend: implementasikan `playSfx(key, volume, rate)` (mis. `game.sound.play(key, {volume, rate})`) agar `rate` berlaku; tanpa itu dipakai `playLoop` (rate 1). Pertimbangkan juga `setSfxVolume` yang tidak menimpa volume `gain` suara yang sedang diputar (saat ini mengatur volume rata untuk key berawalan `SFX_`).
2. Pasang pemicu di BattleScene/WorldScene (id: langkah, interaksi, transisi, sihir, `SFX_BATTLE_CONFIRM`, `SFX_DEFEND`, `SFX_HEAL`, dll.). Langkah: panggil `playSfx('SFX_STEP_GRASS'|'_DIRT'|'_STONE')` tiap ~280-340 ms saat berjalan (min interval 90 ms).
3. Sesuaikan `STEP_SFX`/TRANSITIONS di kode lead bila perlu; semua id kontrak sudah READY.

## Sisa masalah
- Kualitas bunyi belum ditinjau manusia; iterasi resep di `catalog.mjs` mungkin diperlukan.
- Tidak ada ducking/mixing dinamis.
