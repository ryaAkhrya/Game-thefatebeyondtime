# Phase 7 — Kontrak antar-agen (Chapter III + Cinematic Combat + SFX)

Pemilik integrasi: sesi utama ("lead"). Semua agen: baca `CLAUDE.md`, `docs/production/CHAPTER12_VISUAL_QUALITY_STANDARD.md`, `docs/production/POLISH_SPRINT2_REPORT.md`, lalu bagian tugasnya.

## Aturan keras (semua agen)
- Hanya edit file yang DIMILIKI (daftar di tugas). Butuh perubahan di file milik lain → tulis di catatan `docs/production/sprint3/<agen>.md` bagian "Permintaan ke lead"; jangan edit.
- JANGAN jalankan `npm run build`, `npm run test:e2e`, restart server, atau ubah `web/dist` (dist dipakai E2E baseline yang sedang berjalan). Tes unit: PowerShell → `cd web; . .\scripts\dev-env.ps1; npx vitest run <file>` (vitest via Bash gagal). `npx tsc --noEmit` boleh.
- JANGAN git commit/push/stash/checkout. JANGAN BGM apa pun (tidak ada file `BGM_*`). Jangan ubah konfigurasi npm global/PATH; semua cache di drive D:.
- File besar → tool Write (bukan heredoc Bash). TypeScript strict. Semua teks pemain berbahasa Indonesia.
- Seni: ikuti CHAPTER12 standard (outline 1px, palet tertutup, cahaya kiri atas, tanpa blur/bloom/gradien halus); label jujur DRAFT/NEEDS_REVIEW; verifikasi frame (grid, transparansi, tidak ada piksel liar). Tidak ada kotak/orb placeholder sebagai hasil final.
- Catat hasil/limitasi jujur di `docs/production/sprint3/<agen>.md` (apa dibuat, bukti tes, sisa masalah).
- Nama pada UI "Yaric" tetap tunduk pada `story/identity.ts` (`speakerLabel`).

## Flag & konstanta
`web/src/game/story/chapter3Flags.ts` (sudah ada): objek `C3`, `C3_BEATS`, `C3_ENCOUNTERS`, `VELTHIA_COMMANDS`. Jangan duplikasi string flag.

## Pra-wiring yang sudah ada
- `data/sfxRegistry.ts`: `SFX_REGISTRY: SfxCue[]` (`id, files[], minIntervalMs, gain, status`). BootScene memuat READY dari `web/public/assets/audio/sfx/<file>`; key Phaser = `id` (1 file) atau `id#i` (variasi).
- `vfx/vfxAssets.ts`: `VFX_ATLASES` (`key,image,json` relatif `web/public`); BootScene memuat sebagai Phaser atlas.
- `data/environmentAssets.ts`: array `TEMPLE_ATLASES/TEMPLE_IMAGES` (kosong) untuk Kuil Jejak.

## Id SFX (semua WAV/OGG original, sintesis kode)
UI: `SFX_UI_MOVE, SFX_UI_CONFIRM, SFX_UI_CANCEL, SFX_UI_SELECT_ITEM, SFX_UI_ITEM_USE, SFX_UI_SAVE_OK, SFX_UI_SAVE_FAIL, SFX_UI_DIALOGUE_ADVANCE, SFX_UI_DIALOGUE_CHOICE, SFX_UI_SHOP_BUY, SFX_UI_SHOP_SELL`
Langkah: `SFX_STEP_GRASS, SFX_STEP_DIRT, SFX_STEP_STONE` (≥3 variasi masing-masing)
Interaksi: `SFX_INTERACT, SFX_CHEST_OPEN, SFX_ITEM_PICKUP, SFX_DOOR_OPEN, SFX_PUZZLE_ACTIVATE, SFX_PUZZLE_SOLVED`
Battle: `SFX_BATTLE_TRANSITION_NORMAL, SFX_BATTLE_TRANSITION_BOSS, SFX_BATTLE_TRANSITION_TEMPORAL, SFX_BATTLE_TRANSITION_SCRIPTED, SFX_BATTLE_CONFIRM, SFX_GREATSWORD_SWING, SFX_GREATSWORD_IMPACT, SFX_GROUND_SLAM, SFX_ENEMY_ATTACK, SFX_DAMAGE, SFX_ENEMY_DAMAGE, SFX_DEFEND, SFX_HEAL, SFX_SHIELD, SFX_STATUS_POISON, SFX_VICTORY, SFX_DEFEAT`
Sihir: `SFX_MAGIC_TORVAN, SFX_MAGIC_VELTHIA_CAST, SFX_MAGIC_VELTHIA_SHIELD, SFX_MAGIC_VELTHIA_HEAL, SFX_CHRONOLITH_CHARGE, SFX_CHRONOLITH_STRIKE, SFX_CHRONOLITH_TEMPORAL`
API: `audio.playSfx(id)` (tidak pernah throw; fallback senyap). 

## Id VFX (pustaka `src/game/vfx`)
API: `Vfx` kelas dibuat per scene: `new Vfx(scene, {reducedFlashes:()=>boolean, ...})`; `vfx.play(id, x, y, opts?: {flip?: boolean; scale?:number; depth?:number; target?: {x,y}; onDone?}): void`; `vfx.clear()`; `vfx.active(): number` (cap global ≤ 64 partikel aktif); koordinat = piksel panggung (depth <20, kamera stage). Pooling, tanpa tween berat, partikel diskret, palet terbatas. id minimal: `greatsword_trail, impact_hit, impact_heavy, ground_slam_crack, debris_burst, dust_puff, torvan_leaf_bolt, torvan_vine, torvan_support, forest_summon_small, velthia_pulse, velthia_mend, velthia_ward, velthia_bloom, velthia_concord, hollowling_claw, mournfang_slash, veyrath_strike, chronolith_charge, chronolith_slam, chronolith_temporal, shield_hit_spark, status_poison, heal_sparkle`.

## Perintah battle & engine
`VELTHIA_COMMANDS` (di chapter3Flags.ts). Intent Chronolith berawalan `chrono_`. Event battle membawa `frame_key` yang dipakai BattleAtlas (`idle_a, idle_b, anticipation, attack, followthrough, recovery, hit_recoil, hit_recover, death_start, defeated`) ditambah kunci khusus (`cast`, `heal`, `shield`, `summon`, `guard`, `special`).

## Area view Chapter III
Aksi cerita generik `{type:'c3'; op:string; arg?:string|number}` ditangani view yang memenuhi `AreaView3 {handleAction(op,arg):Promise<void>; update(player,moving,delta,sprinting):void; apply(flags:Record<string,boolean>):void; debug():unknown}` (definisi di `world/AreaView3.ts`, dibuat lead).
