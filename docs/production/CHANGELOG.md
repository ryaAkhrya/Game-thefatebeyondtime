# CHANGELOG — DOKUMENTASI & KODE

## Phase 6 — 10 November 2026

- C2-01..09 kini playable dari ending Bab I hingga laporan Velthia dan ending Bab II. Liora/Zira, Hutan 2, batu penanda, Torvan, dua fragmen dan Veyrath terhubung ke world/scene/dialog.
- BattleEngine/BattleScene/BattlePanel mendukung C01+C03, target support, status/HP/MP/giliran per aktor, encounter M01+M02, patroli M02+M03 opsional dengan cooldown, boss B02 dan retry/reward sekali. Battle solo Bab I tetap dipertahankan.
- Save v2 tetap membaca slot lama; `partyVitals.C03` dan `world.lastChapter2EncounterSec` ditambahkan secara opsional. Enam atlas DRAFT dan 13 portrait diimpor dari library existing tanpa mengubah source. Lingkungan baru code-native DRAFT, audio tetap menunggu komposer.
- QA aktual, screenshot dan keterbatasan di `PHASE6_REPORT.md`. Tidak ada Bab III, commit/push atau deploy.

## Phase 5 — 10 November 2026

- Sisa Chapter I: Aveloria safe zone, gerbang Talric, laporan Azie, audiensi Velthia, dua dentang yang terbaca tanpa audio, penyelidikan dan penutup.
- Atlas/portrait original DRAFT diimpor, city renderer/collision terpisah, empat warga tanpa nama. Toko Derrria mengaktifkan shared buy/sell dengan stock persistent optional dalam save v2.
- Flags/beat/posisi/NPC/ending mengikuti save/load existing; cutscene tidak disimpan setengah jalan. DialogueRunner/input cleanup dan Pause/Settings kota dipertahankan.
- 460 unit/strict TypeScript/build; status dan QA aktual di `PHASE5_REPORT.md`. Tidak ada Chapter II, art final, audio otomatis, commit/push atau deploy.


## Phase 4 — 10 November 2026 (vertical slice sampai Mournfang)

- Alur C1-01..04 berlanjut ke tepi Hutan 1, checkpoint, C1-05 Mournfang dan penutup demo menuju Aveloria; bukan Chapter I penuh. Tidak ada Phase 5/Chapter II atau NPC baru.
- Configurable BattleSession dan pure boss intent: normal/persiapan/sapuan/pemulihan, counter Bertahan/GS, shared Potion, retry dan reward/loot sekali. HP 224 dan balancing DRAFT. Total normal EXP 70/level3/emas28 setelah dua kemenangan.
- Checkpoint full HP/MP tanpa item/EXP/gold tambahan, save sebelum/sesudah boss, Continue/refresh dan ending save. Schema v2 diperluas dengan nilai area/beat/flags tanpa field wajib baru; save Phase 3 tetap terbaca.
- Empat pose B01 PNG/JSON asli disalin utuh, adapter pose holds; art NEEDS_REVIEW, tidak mengklaim animasi final. Dialog C1-05 dari source; composer handoff tanpa audio baru.
- Perbaikan transisi area: hentikan old-world writes saat fade. Perbaikan tiga digit HP/MP dan warning UI. Retry mempertahankan playtime. Assertion input browser lama menunggu frame aktual, mengukur kedua tombol selama sama-sama ditahan.
- Gate fungsional PASS: 405 unit, 375 browser produksi Edge (cerita terkoreksi 162/162), 38 Chrome, 38 dev Edge, strict TS/build. Screenshot/waktu terukur/file changes/backlog: `PHASE4_REPORT.md`. Art/pacing manusia perlu review. Tidak ada dependency, commit/push atau deployment.

## Phase 3 — 10 November 2026 (RPG dan persistence)

- Progression data murni, cap awal level 5, reward Hollowling 25 EXP/8 emas sekali; stat level 1 tetap sama dengan Phase 2. Growth, dua pasif swordsman dan harga item DRAFT untuk review.
- Shared inventory dunia/battle, Potion effect bersama, dua slot equipment dengan class/ownership checks, skill requirements dan point spending. Status/Inventaris/Perlengkapan/Jurus di Pause, tanpa mengganti visual greatsword.
- Reusable buy/sell dengan rollback by construction; ShopScene hanya harness QA, tidak menambah NPC atau memindahkan Derrria ke Hutan 1.
- SaveRepository existing: envelope save_v2/data v2, key lama dipertahankan; migrasi v1 hanya di memori, backup/recovery, readback/rollback dan future-schema protection. Tiga manual slot, autosave checkpoint aman dan Continue memulihkan world sesudah refresh.
- TypeScript strict, 378 unit tests dan production build lulus. Hasil browser final, screenshots, file list dan keterbatasan di `PHASE3_REPORT.md`.
- Tidak ada dependency, audio, perubahan approved story/atlas, deployment, commit/push atau implementasi Phase 4. Review art sebelumnya tetap terbuka.

## Phase 2 — 10 November 2026 (playable; visual PARTIAL)

- C1-04 scripted Hollowling menggantikan akhir demo Phase 1; dialog dari naskah existing, flag resmi `battle.first_hollowling`.
- Pure BattleEngine: tujuh stat, SPD deterministic, prepare/impact/finish dengan token sekali, damage fisik, Ground Slam 4 MP, Potion 36 HP, Bertahan, aturan Kabur, status foundation.
- BattleScene + BattlePanel terpisah, atlas PNG/JSON v3.3 asli, frame durations/pivots/event, efek Settings, UI kamera tetap saat shake medan.
- BattleSession: checkpoint memori, retry setelah KO, victory commit vitals/items/flag sekali; tanpa EXP/level/save gameplay Phase 3.
- 273 unit tests, TypeScript strict, production build; browser dan screenshot di PHASE2_REPORT.md. Baseline aktual Phase 1 91/93 karena timing assertion; assertion dipindah sebelum hold/screenshot agar baris tidak telanjur selesai.
- Sumber art masih NEEDS_REVIEW: potongan pedang/piksel tepi terlihat; tidak diubah. Tidak ada dependency, musik, deployment atau fitur Phase 3 baru.

## v0.1.0 — 10 November 2026 (Phase 1: Exploration & Dialogue)

- Intro Chapter I playable: C1-01 (bangun, periksa tanah/pedang, jurnal), C1-02 (Nambo, pilihan jawaban), C1-03 (papan berulang, semak berduri, jalan setapak, peti Potion), penanda akhir demo. Flag `story.c1_awake`, `story.c1_nambo`, `story.c1_loop`.
- Sistem baru: `world/Collision` (grid walkable + blocker), `world/Interaction` (hadap + jarak), `dialogue/*` (DialogueRunner murni, wrap/halaman, portrait + ekspresi, pilihan), `story/Chapter1Story` (keputusan cerita murni), `HudScene`, `PauseScene`, `WorldScene`, `InputManager.getMoveDirection`.
- Resolusi internal 320x180 -> 640x360; UI Phase 0 memakai kamera zoom 2 (tampilan sama).
- Aset: atlas eksplorasi Yaric (v3.2, dibersihkan) dan Nambo (DRAFT), 12 potret ekspresi diperkecil, lingkungan Hutan 1 DRAFT yang dibuat kode. Tidak ada aset luar, tidak ada musik.
- Tes: 204 unit + 84 e2e (regresi Phase 0) + 93 e2e Phase 1, di preview build dan dev server (Edge 157 headless).

## v0.0.1 — 10 November 2026 (Phase 0: Web Foundation)

- Kode pertama di `web/`: Phaser 4.2.1 + TypeScript + Vite 8, static export (`base: './'`), cache dev di `.dev-cache/` (drive D:).
- Title Scene (Mulai Baru, Lanjut, Pengaturan, Panduan Kontrol), Settings 9 opsi yang tersimpan (`settings_v1`) dengan Reset + konfirmasi, Panduan Kontrol, layar pengganti jujur untuk Mulai Baru/Lanjut.
- Sistem: `InputManager` (intent + layer fokus), `SettingsRepository`, `SaveRepository` berversi (+checksum), `GameState`, `SceneRouter`, `AudioManager` senyap, `AssetRegistry` (v3.3), `FullscreenController`, `DisplayController` (Fit / Pixel Perfect + DPR + desktop-only).
- Tes: 85 unit (vitest) + 84 e2e Edge (playwright-core). Lihat `PHASE0_REPORT.md`.
- Dokumentasi operasional dialihkan dari aset v3.2 ke v3.3. Tidak ada aset diimpor, tidak ada musik, tidak ada perubahan cerita.

## v2.0 — 8 November 2026 (Dokumentasi)

- **Platform berubah** dari Godot/Windows executable menjadi web browser PC/laptop, Phaser 4.2.1 + TypeScript + Vite. Tidak ada kebutuhan Godot pada implementasi baru.
- **Approved Story Revisi 02** dijadikan kanon resmi: Varlgrim melihat kemungkinan masa depan dan salah sebab, Torvan dibatasi kehendak bebas, Velthia mengatur evakuasi, modern terjadi **berabad-abad setelah Aveloria**.
- Menambahkan 3 beat modern (total 40), memperbaiki urutan scene dan epilog, mengganti skrip Chapter IV/Epilog dan menambahkan naskah interlude.
- Menjadikan **Settings** kewajiban MVP: volume, text speed, fullscreen, scale, reduced effects dan persistence.
- Menerapkan **placeholder-first** menunggu sketsa karakter manual; aturan anti-slop tetap dan makin ketat.
- Menambahkan spesifikasi browser storage, static deployment, public/private content boundary, regression tests.
- **Status kode:** belum dibuat/dijalankan. Tidak ada klaim MVP atau website sudah tersedia.

## v1.1 — Historical

Dokumentasi lama Godot + 40 beat scene direction; digantikan v2.0 untuk proyek web. Dokumen Word lama tidak dicampur dalam ZIP baru.
