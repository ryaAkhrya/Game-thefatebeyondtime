# SESSION HANDOFF — FOR CLAUDE CODE (v2.0, diperbarui setelah Phase 0)

## Polish Sprint 1 handoff terkini

UI memakai `src/ui/kit/ui.ts` (ruang desain 960x540, ukuran dibulatkan ke piksel perangkat; scene UI memakai `bindRelayout`). Dunia/battle: zoom bulat (`DisplayScale.computeDisplay`). Nama Yaric: `story/identity.ts` (`isNameKnown`, `speakerLabel`); reveal DRAFT_IMPL di `Chapter2Story` (batu penanda pertama). Tujuan hanya di `JournalScene` (`story/journal.ts`). Sprite eksplorasi memuat `characters/normalized/`. QA: `tests/e2e/sprint1.mjs`, hook `__tfbt.sceneTexts/frameBounds/display/router`, `qa.chapter2/bossBattle`. Tidak ada commit/push. Sprint 2 dan Bab III menunggu instruksi baru. Detail: `POLISH_SPRINT1_REPORT.md`.

## Phase 6 handoff terkini — Chapter II

Bab II C2-01..09 playable dari ending Bab I hingga `chapter.2_complete`. `SliceEndScene` menawarkan **Mulai Bab II** hanya dari `chapter.1_complete`. `Chapter2Story` mengatur Azie → Velthia → Liora/Zira → Hutan 2 → Torvan join → M01+M02 tutorial → penanda → Veyrath → dua fragmen → Aveloria/Velthia. Tidak ada launcher Bab III. Detail QA/batasan di `PHASE6_REPORT.md`.

- Data: `story/chapter2Flags.ts`, `story/Chapter2Story.ts`, `dialogue/chapter2.ts` + 97 source lines JSON, `world/chapter2Maps.ts`, `Chapter2View.ts`, `rpg/party.ts`. `WorldScene` tetap router area, `GameState` tetap schema 2, `SaveRepository` lama tetap boundary.
- Party C01+C03 maksimal dua. `partyVitals.C03` hanya saat C03 joined; EXP/skills/equipment C03 di `rpg.characters`, item bersama. `world.lastChapter2EncounterSec` opsional untuk patroli satu kali dengan cooldown. Boss checkpoint penuh; retry rollback HP/MP/item/status. Load Bab I tanpa C03 tetap valid.
- Asset import `web/scripts/prepare-chapter2-assets.mjs` menghasilkan `web/public/assets/chapter2.generated.json`: 6 atlas DRAFT asli dan 13 portrait turunan. C03/C07/B02 sangat kasar di sprite gameplay; review artist wajib. Tidak ada audio/composer file baru.
- E2E runner tujuh suite; `E2E_SUITES=phase6.mjs` untuk Chapter II. Screenshot/artifacts tetap `.dev-cache/test-artifacts/`. Jangan klaim art final atau melanjutkan Bab III tanpa instruksi user.

Riwayat Phase 5 dan sebelumnya ada di bawah.

## Phase 5 handoff terkini — Chapter I

Chapter I C1-01..09 terhubung sampai Aveloria dan `chapter.1_complete`. Kota safe zone memakai `WorldScene`, collision/camera/input/dialogue existing. Masuk dari checkpoint timur tepi hutan; menu pertama Masuk Aveloria. Talric → Azie → Velthia → kembali ke halaman → dua dentang → penutup. Chapter II tidak playable dan memerlukan instruksi baru. Status/QA aktual dan keterbatasan: `PHASE5_REPORT.md`; **PHASE 5 PASS fungsional/QA otomatis: 460 unit, 484 produksi Edge, 113 Chrome, 113 dev Edge; strict TS/build**.

- Runtime baru: `world/aveloria.ts`, `AveloriaView.ts`, `story/AveloriaStory.ts`, `aveloriaFlags.ts`, `dialogue/aveloria.ts` + 43 baris source JSON C1-06..09 saja, `rpg/derrria.ts`.
- Save v2/key lama tetap. `world.shops.derrria` optional; stock/inventory/gold satu snapshot. Flags vista → gate → archive → velthia → complete. Tidak menyimpan scene midway. Legacy v2 forest tanpa shops tetap valid; v1 masih read-only migrate. Reward/battle/RPG lama dipertahankan.
- C02/C05/C06/C09: atlas DRAFT asli 32×48 /192×192, empat arah × enam frame, pivot16/46. Import `web/scripts/prepare-aveloria-assets.mjs`; source tidak diubah. 14 portrait individual turunan, lingkungan/warga code-native DRAFT, tidak ada redraw wajah/kostum atau battle kit NPC.
- 460 unit/16 files strict TS/build; focused Aveloria awal 65/65 produksi Edge. Baseline Phase 0–4: 405 unit,375 Edge,38 Chrome,38 dev; log helper fail/re-run dipertahankan. Hasil final sesudah fix overlay: 484/484 produksi Edge (Title journey 196, kota 75), 113/113 Chrome, 113/113 dev Edge. Build index-DflZfrNQ.js. Semua bukti akhir diverifikasi terhadap hash build; laporan mencatat percobaan gagal/terputus.
- E2E runner enam suite. `E2E_SUITES=phase5.mjs` untuk kota; `phase4.mjs` untuk boss. Focused suites menerima `E2E_OUTPUT_DIR`; runner menerima `E2E_PORT`, `E2E_URL` dan `E2E_CHANNEL`. Cache/artifacts tetap D:. Preview existing http://127.0.0.1:5173/.
- Review manusia tetap diperlukan; side quest backlog. Composer handoff Aveloria ditambahkan, silent fallback tanpa file suara. Tidak ada commit/push/deploy/dependency install.

Bagian handoff Phase 0–4 berikut adalah riwayat dan tunduk pada status Phase 5 di atas.


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
