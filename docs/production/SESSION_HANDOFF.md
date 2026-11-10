# SESSION HANDOFF — FOR CLAUDE CODE (v2.0, diperbarui setelah Phase 0)

- **Tanggal:** 10 November 2026. **Phase 4 PASS (fungsional/QA otomatis)**: 405 unit, 375 produksi Edge, 38 Chrome, 38 dev Edge, strict TS/build. Bukti/backlog di `PHASE4_REPORT.md`. Bukan seluruh Chapter I; Phase 5/Chapter II belum dimulai. Art NEEDS_REVIEW/DRAFT dan pacing manusia perlu review.
- Proyek adalah website **PC/laptop browser only**: Phaser 4.2.1 + TypeScript + Vite, VS Code/IDE + Claude Code. **Bukan Godot / file EXE**.
- Empat chapter, 40 beat (termasuk M-01..03) dan epilog. Source cerita **Cerita Revisi 02 APPROVED**; jangan pakai timeline lama yang memperlihatkan memori modern dalam Chapter IV.
- Detail Varlgrim, Torvan, Velthia, lore: `docs/narrative/LORE_BIBLE.md`.
- Empat sheet konsep sudah menjadi referensi identitas karakter. Aset individual v3.1 masih DRAFT sampai review Game Director.
- Settings wajib di title dan pause, tersimpan, berfungsi (volume, text speed, fullscreen, scale, reduced effects); baca `docs/design/SETTINGS_SPEC.md`.
- P.S. anniversary, foto/kenangan dan musik user belum tersedia. Jangan fabricate. Public build tidak boleh membundel asset private.
- Tugas berikutnya: review Phase 4, balancing/visual dan pacing manusia; **Phase 5/Chapter II hanya setelah instruksi baru**. Dot-source `web/scripts/dev-env.ps1`; `npm run verify`, `npm run test:e2e`. `E2E_URL` memakai server existing, `E2E_SUITES=phase4.mjs` untuk focused boss QA; `E2E_CHANNEL=chrome` memakai Chrome existing. Tidak ada commit/push otomatis.
- Battle C01/M01/Slam memakai **v3.3** (NEEDS_REVIEW), B01 memakai empat pose DRAFT asli tanpa pengganti v3.3; salinan PNG/JSON utuh di `web/public/assets/battle/`. Alias B01 hanyalah pose holds. Battle v3.2 yang digantikan ditolak registry; eksplorasi Yaric v3.2 tetap sah.
- Instalasi dan cache proyek di drive D: (`web/node_modules`, `.dev-cache/`). Jangan mengubah konfigurasi npm global/PATH.
- Phase 1: resolusi internal 640x360, UI di ruang 320x180 lewat `configureUiCamera`. Cerita: `story/Chapter1Story.ts` (murni) -> `WorldScene` mengeksekusi aksi. Dialog: `dialogue/chapter1.ts` dites terhadap `DIALOGUE_EVENTS.json`.
- Aset DRAFT: lingkungan Hutan 1 (dibuat `web/scripts/gen-forest-art.mjs`), sprite Nambo (kualitas rendah, perlu pengganti), potret diperkecil dari PNG ekspresi. Jangan menganggapnya final.
- Empat teks UI sistem bukan dari naskah (DRAFT_IMPL) tercantum di `PHASE1_REPORT.md` untuk direview.

- Phase 2: `combat/BattleEngine.ts` murni (prepare → impact → finish); `BattleSession.ts` checkpoint/retry dan victory commit; `BattleScene` hanya playback/input; `BattlePanel` UI terpisah. 273 unit tests lulus. Hasil browser/known limitations lihat PHASE2_REPORT.md.
- Flag resmi C1-04: `battle.first_hollowling`. Baris L001 sebelum duel; L002/L003 setelah kemenangan. Akhir demo Phase 1 kini transisi battle. World kembali di y=100, di luar trigger, mencegah re-entry.
- Catatan historis Phase 2: HP/MP dahulu opsional, persistence/EXP/gold belum diimplementasikan saat itu. **Digantikan Phase 3**: vitals wajib di schema v2, shared inventory, reward EXP/gold dan save/load penuh (lihat handoff di bawah). Defeat/retry tetap rollback checkpoint.
- Atlas asli mengandung potongan pedang di tepi beberapa frame. Jangan redraw atau menyebut art final; penggantian artist harus tetap mengikuti desain approved. Hollowling pivot [48,48], Yaric [48,95], VFX [48,63]; scene menempatkan titik bawah pada y=130.

## Phase 3 handoff terkini

Fondasi di bawah dipertahankan pada Phase 4; perluasan Mournfang dicatat setelahnya.

- `rpg/definitions`, `progression`, `inventory`, `actions`, `validation` adalah data/logika murni. `GameState.items` tetap satu inventory untuk dunia, battle, equipment dan shop. HP/MP Yaric di `vitals`; stat efektif = base level + equipment + pasif.
- Hollowling 25 EXP +8 emas; level 2 pada 25 EXP, HP/MP max naik 12/2, skill point +1. Pasif ATK+2 atau DEF+2, masing-masing 1 poin, DRAFT. Ground Slam tetap jurus awal 4 MP. Stat level 1 efektif sama dengan Phase 2.
- `SaveRepository` tetap satu storage boundary. Envelope `save_v2`, data `schemaVersion:2`; key tetap `tfbt.save.v1.{auto,slot1,slot2,slot3}`. Tidak mengganti namespace agar slot lama tetap ditemukan. v1 diverifikasi checksum lalu dimigrasikan di memori, tanpa rewrite otomatis saat read.
- Save valid sebelumnya menjadi `<key>.backup` sebelum overwrite; corrupt/missing primary dapat memakai backup tervalidasi. Versi future dilindungi. Quota/read/write errors tidak menghapus slot lama atau mengklaim sukses.
- `SaveCoordinator` memblokir writes selama battle/dialog/transition. Autosave setelah story flags selesai (termasuk NPC step aside), wrap checkpoint, sebelum battle, dan setelah dialog victory selesai. Manual save/load melalui Pause; load mengosongkan antrean autosave sesi lama.
- Semua layar baru: RpgMenuScene, SaveLoadScene, ShopScene. Shop hanya `?qa=1` → `__tfbt.qa.shop()`; tidak ada Derrria/merchant dalam cerita Hutan 1. Simpan lokal browser; hapus site data dapat menghapus progress.
- Perubahan skill/equipment/item melalui menu perlu manual save atau checkpoint berikutnya; jangan mengklaim setiap keypress otomatis disimpan. Tidak ada save objek Phaser, tidak ada BGM/SFX baru atau deployment.

## Phase 4 handoff terkini

- `encounters.ts`: Hollowling/Mournfang, flag resmi `boss.mournfang`, checkpoint (704,400) kanan di `forest_edge`, reward boss DRAFT 45 EXP/20 emas/1 Potion. Normal progression total 70 EXP, level 3, emas 28. Ledger boss satu transaksi dengan konsumsi/vitals/flag; tidak saat animasi/result.
- `BattleEngine` intent boss: strike→windup→sweep→recover. Satu giliran penuh pemain sesudah telegraph. Bertahan membagi damage; GS saat charge membatalkan sapuan. HP 224/ATK18/DEF10/SPD6, DRAFT. Header SAPUAN!/GOYAH tetap terbaca tanpa shake/flash/audio; UI dapat direvisi tanpa mengubah engine.
- `forestEdge.ts` memakai props existing dan ground code pada grid; peta hutan berulang lama tetap utuh. Ujung utara memakai interaksi Lanjut setelah Hollowling. Checkpoint/rest mengisi HP/MP tanpa reward/item; sebelum boss selalu snapshot penuh di luar trigger. Retry mengembalikan resource/AI checkpoint sambil mempertahankan playtime aktif.
- `WorldScene.leaving` wajib menghentikan update/position writes selama fade area/battle; tanpa itu scene lama menimpa area baru. Jangan menghapus guard ini. Load/new game menghapus antrean autosave lama seperti Phase 3.
- Save tetap schema v2: hanya menambah area/beat/flags, tanpa field wajib baru. V2 Phase 3 dan migration v1 tetap berlaku. Autosave sesudah area/checkpoint/aftermath selesai; tidak saat battle. SliceEndScene memberi save/settings/kembali eksplorasi; load dari ending juga menghentikan overlay lama.
- Dialog C1-05 verbatim JSON, DRAFT_IMPL hanya checkpoint/UI/penutup. Tidak menyetel chapter.1_complete atau membuat C1-06..09/Aveloria/Velthia. B01 art sangat kasar, empat pose; backlog wajah/kaki/tanduk/animasi di laporan. Audio semua AWAITING_COMPOSER; BGM_BOSS existing, tidak membuat cue duplikat.
