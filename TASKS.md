## Phase 10 — hasil dan sisa review

Revisi 14 November: Yudis–Saffa; 48 baris modern/epilog; bahasa lebih santai; sprite C02–C09 dan pose duduk lebih bersih; teks penutup kiri bawah; handoff bab otomatis dengan kompatibilitas save lama. Bukti dan hasil terbaru: [laporan revisi](docs/production/phase10/REVISION_REPORT.md). Commit/push origin/main diotorisasi user.

- [x] QA otomatis akhir: unit, build, privasi, render Edge dua resolusi, ending Edge/Chrome, preview aktif; bukti di laporan.

- [x] Redraw eksplorasi C02–C09 dari concept art; empat arah, palet tertutup, kaki stabil.
- [x] Ganti atlas battle C03/M02/M03/B02 yang primitif dengan dua belas pose.
- [x] Perbarui modern/cliff dan pose duduk ending; simpan sumber, perbandingan dan prompt.
- [x] Tulis arahan seluruh 13 cue BGM tanpa membuat musik.
- [ ] Review manusia: likeness konsep, walk/idle, komposisi battle, emosi ending dan audio.
- [ ] Musik komposisi user dan konten privat asli bila tersedia; Phase 11 final QA/release preparation.

QA otomatis dan bukti: [PHASE10_REPORT](docs/production/PHASE10_REPORT.md). Riwayat berikut tidak menggantikan status terbaru.

# TASKS — STATUS SEBENARNYA

## Phase 9 — Modern Interlude, Epilog, Memories, Credits (13 November 2026)

- [x] Implementasi modern sesudah IV, pendekatan artefak, fragmen ingatan, flashback Aveloria, janji E-01/E-02, awan/siluet, To Be Continued, credits.
- [x] Checkpoint ending, Continue/save/load, completion dan replay eksplisit tanpa menulis save utama.
- [x] Schema kenangan modular, renderer contain portrait/landscape, hook pesan privat sesudah credits; tanpa isi hubungan palsu.
- [x] Pemisahan local input/private output, build eksplisit, allowlist SHA-256, pemindaian artefak publik dan upload exclusions.
- [x] Dokumentasi implementasi, sinematik, panduan privat, kontrak save, composer handoff.
- [x] QA otomatis fungsional: strict TS/build, 1.574 unit; regresi lama 906 + Phase 8 168; ending Edge 91/91 dan Chrome 91/91; preview 9/9; privasi 8/8 dan audit 324 file. Log, perbaikan dan percobaan gagal tercatat dalam laporan.
- [ ] Isi asli dari Game Director: foto yang diizinkan, caption/tanggal, urutan, kata-kata anniversary sendiri; private anniversary build nyata belum dibuat.
- [ ] Review manusia: seni/pose duduk, dialog kerja, emotional pacing, SFX, performa perangkat nyata. Hasil QA otomatis lengkap: `docs/production/PHASE9_REPORT.md`.

## Phase 8 — Chapter IV: The Fate (13 November 2026)

- [x] Chapter IV playable end-to-end (Mulai Bab IV → Gerbang Luar → Aula Lonceng → Arsip (Perlindungan) → Ruang Uji → Koridor Retakan → Serambi/lentera checkpoint → Varlgrim 3 fase → Heart terbuka (dua pengunci) → menara runtuh → Ruang Gema → Torvan → pulang ke Aveloria → "Bab IV selesai"); 36 baris canon C4-01..07 verbatim.
- [x] Varlgrim (tongkat kayu berpilin, bukan jam pasir), meteor bertelegraf penuh satu giliran, Ultimate Perlindungan (tanpa MP, muatan 1, jendela dibuka `meteor_call`), tanpa softlock (grid 864 keadaan + fuzz 400 pertarungan), ulang cepat dari fase meteor, retry penuh dari checkpoint, tanpa hadiah ganda.
- [x] Level cap 5→10 (EXP data-driven 800), ledger EXP idempoten untuk save lama (hanya menaikkan), pasif L6–10, zirah Benteng.
- [x] 23 id SFX asli Bab IV (registry 67 id); VFX 5 atlas baru; art battle B04/M04/M06 DRAFT. Tanpa BGM.
- [x] Tes: unit 1531, tsc bersih; Edge produksi regresi 906 (identik baseline) + Phase 8 168 (1366 penuh + 1920 singkat) + Phase 8 penuh 1920 119; Chrome Phase 8 119. Lihat `PHASE8_REPORT.md`.
- [ ] Review manusia: seni DRAFT (Varlgrim/Riftborn/Gravorn/Benteng/VFX), bunyi SFX, balance Varlgrim (margin L8 tipis menurut simulasi), pacing, performa GPU nyata.
- [x] Modern Interlude/Epilog diotorisasi dalam Phase 9; implementasi di bagian terkini di atas. BGM tetap menunggu komposer.

Lihat `docs/production/PHASE8_REPORT.md`.

## Riwayat — Phase 7 — Chapter III + combat sinematik + SFX asli (12 November 2026)

- [x] Chapter III playable end-to-end (Aveloria krisis → Velthia bergabung → Kuil Jejak 3 teka-teki → Chronolith → akhir bab); 65 baris canon verbatim; tanpa Bab IV.
- [x] Velthia (5 jurus, tanpa senjata) + party switch (Torvan cadangan terjaga) + save tanpa migrasi.
- [x] Transisi battle normal/scripted/boss/temporal + return; linimasa aksi dan hitstop; Reduced Flashes/Screen Shake dihormati.
- [x] Pustaka VFX piksel (24 efek) dan 44 SFX asli (sintesis kode) terpasang; BGM tidak dibuat.
- [x] Tes: unit 1049; Edge 906 (722 regresi + 184 Phase 7); Chrome Sprint 2 77 + Phase 4 38 + Phase 7 96.
- [ ] Review manusia: kualitas suara, seni DRAFT (Velthia/Chronolith/Oathguard/kuil/krisis/VFX), pacing dan balance Chronolith, performa GPU.
- [ ] Keputusan desain: level cap 5 vs level 8–10 pada brief; Velthia follower di kuil; Ultimate Perlindungan (Bab IV).

Lihat `docs/production/PHASE7_REPORT.md`.

## Polish Sprint 2 — dunia, karakter, animasi, sprint (12 November 2026)

- [x] P0 Mournfang: atlas V4 dari konsep resmi, terbukti terlihat pada piksel render (35% kotak berubah); monster lain diverifikasi sama.
- [x] Yaric arah atas: mahkota rambut digambar ulang; 56 frame (walk/idle/sprint) kaki y=46 tanpa clipping.
- [x] Nambo/Torvan/Velthia diautor ulang dari turnaround; Azie/Talric/Zira/Derrria hanya idle turunan (masih prototipe).
- [x] Hutan 1, Tepi Hutan, Hutan 2, Aveloria, Liora dibangun ulang (generator deterministik); peta cerita tidak berubah.
- [x] Idle berbasis data + sprint Shift (1,65x, collision per langkah, pemicu disapu).
- [x] 676 unit; Edge produksi 722 (84+197+37+54+38+75+55+105+77); Chrome Sprint 2 77 + Phase 4 38. PARTIAL kualitas visual: lihat `docs/production/POLISH_SPRINT2_REPORT.md` bagian L.
- [ ] Review manusia; seniman untuk backlog L; Bab III menunggu instruksi baru.

## Polish Sprint 1 — UI/UX, Title, identitas Yaric, sprite (11 November 2026)

- [x] Kanvas = piksel perangkat, zoom dunia/battle bulat, UI 960x540 tajam (Cinzel + Source Sans 3); Fit/Pixel Perfect/resize berfungsi.
- [x] Title Screen baru (siluet Yaric–Velthia), dialog, Inventaris/Status/Jeda/Jurnal/Simpan/Pengaturan/Toko dan battle solo/duo didesain ulang; banner tujuan dihapus (tujuan di Jurnal).
- [x] Nama Yaric anonim sampai reveal DRAFT_IMPL di batu penanda pertama Hutan 2 (`identity.name_known`); save lama kompatibel.
- [x] Sprite eksplorasi ternormalisasi (kaki y=46; Yaric kiri/kanan tidak lagi melayang/kecil). Perlu redraw artist: Yaric belakang/kanan dan seluruh sprite pendukung.
- [x] 588 unit, produksi Edge 645 (84+197+37+54+38+75+55+105), Chrome sprint1 105 + kota 75; strict TS/build. Laporan: `docs/production/POLISH_SPRINT1_REPORT.md`.
- [ ] Review manusia (tipografi/komposisi/key art Title, monitor nyata), font final, key art; Sprint 2 (idle animation) dan Bab III menunggu instruksi.

## Phase 6 otonom — Chapter II (10 November 2026)

- [x] Baseline Phase 0–5: 460 unit, 484 produksi Edge, 113 Chrome, 113 dev Edge, strict TypeScript/build.
- [x] C2-01..09: Azie/Velthia → Liora/Zira → Hutan 2/Torvan → duo battle/Veyrath → dua fragmen → laporan dan ending Bab II.
- [x] Party dua anggota, HP/MP/EXP/equipment/jurus per anggota, target support, retry dan reward sekali; battle solo Bab I tetap didukung.
- [x] Encounter wajib dan satu patroli M02+M03 opsional dengan cooldown 20 detik; tanpa grinding wajib.
- [x] Save v2 kompatibel Bab I; kondisi Torvan dan cooldown tersimpan sebagai extension; tiga slot, autosave, Continue tetap digunakan.
- [ ] Art Torvan/Zira/Veyrath dan lingkungan DRAFT, review narasi/balancing/pacing manusia, audio komposer; lihat `docs/production/PHASE6_REPORT.md` untuk QA aktual.
- [ ] Bab III menunggu instruksi baru.

## Riwayat Phase 5 — Chapter I / Aveloria (10 November 2026)

- [x] Baseline aktual: 405 unit, 375 produksi Edge, 38 Chrome boss, 38 dev Edge boss; strict TypeScript/build.
- [x] C1-06..09: vista Aveloria, Talric, arsip Azie, audiensi Velthia, dua lonceng, penyelidikan dan penutup Chapter I.
- [x] Safe-zone kota dengan gerbang, jalan/plaza/pasar, halaman dan ruang pertemuan; collision/kamera existing.
- [x] Empat atlas NPC DRAFT asli, portrait individual/ekspresi, pilihan keyboard, empat warga tanpa nama.
- [x] Toko Derrria: shared inventory, emas dan stok persistent; tidak ada reward kota atau party join.
- [x] Save v2 additive/optional, flags berurutan, posisi/NPC/malam pulih; save forest lama tetap valid.
- [x] 460 unit/16 files dan strict TS/build; QA browser awal Aveloria 65/65 kedua resolusi.
- [x] **Phase 5 PASS fungsional/QA otomatis:** 460 unit, 484 produksi Edge, 113 Chrome, 113 dev Edge; strict TS/build, render order dan screenshot lulus. [Laporan Phase 5](docs/production/PHASE5_REPORT.md).
- [ ] Review manusia: visual/animasi DRAFT, dialog/chemistry, pacing, hardware nyata, audio komposer.
- [ ] Side quest optional (backlog). Chapter II hanya setelah instruksi baru; tidak diimplementasikan pada Phase 5 ini.

Bagian Phase 0–4 berikut adalah riwayat.


**Phase 4 PASS (fungsional/QA otomatis)** (10 Nov 2026): intro sampai Mournfang dan penutup menuju Aveloria. 405 unit, 375 produksi Edge +38 Chrome +38 dev Edge, strict TS/build lulus. Bukti di `docs/production/PHASE4_REPORT.md`. Art DRAFT/NEEDS_REVIEW, human pacing belum divalidasi; Phase 5/Chapter II belum dikerjakan.

## Phase 0 — Web Foundation

- [x] Buat Vite + Phaser 4.2.1 + TS di `web/` dan lockfile.
- [x] Setup title screen 16:9 + pixel scaling (320x180 internal; Fit / Pixel Perfect).
- [x] Implement keyboard focus global dan desktop-only message.
- [x] Implement SettingsRepository dan panel Settings dari Title (9 opsi, Reset + konfirmasi).
- [x] Jalankan `npm run dev`, `npm run build` dan catat hasil (85 unit test + 84 e2e Edge lulus).
- [x] Report (PHASE0_REPORT.md). Commit: tidak dilakukan, folder bukan repositori git; jangan push remote tanpa izin.

## Phase 1 — Exploration & Dialogue

- [x] Yaric movement 4 arah + collision (atlas eksplorasi v3.2, bukan placeholder; NEEDS_REVIEW).
- [x] Hutan demo (DRAFT dev art), Nambo (sprite DRAFT), interaksi papan/peti/objek/NPC.
- [x] Dialog Indonesia + portrait/ekspresi + Text Speed + pilihan keyboard; Pause -> Pengaturan.
- [x] QA input dan scene transitions (e2e 93 cek + 204 unit; Edge headless saja, belum diuji manusia).

## Phase 2 — Battle

- [x] Side-view: Hollowling kiri, Yaric kanan; atlas v3.3 asli + metadata.
- [x] Serang/Jurus Ground Slam/Barang Potion/Bertahan; Kabur tutorial nonaktif dengan alasan, escape engine biasa teruji unit.
- [x] HP/MP, SPD deterministic, AI eksplisit, fondasi Poison/Stun/ATK Up/DEF Up, menang/kalah/retry.
- [x] Commit sekali, konsumsi item dan vitals konsisten, flag `battle.first_hollowling`, kembali ke dunia. Encounter scripted satu kali; random encounter/cooldown tidak dibuat.
- [x] 273 unit test + strict TypeScript + build; hasil browser terakhir dicatat di PHASE2_REPORT.md.
- [ ] Gate visual final: potongan pedang/piksel tepi dalam atlas sumber dan review manusia. Status aset tetap NEEDS_REVIEW; Phase 2 tidak diklaim PASS penuh.

## Phase 3 — RPG / Save

- [x] EXP/level berbasis data, shared inventory, equipment weapon/armor dan dua pasif DRAFT.
- [x] Tiga slot manual + autosave aman + Load/Continue nyata setelah refresh.
- [x] Shop buy/sell reusable + currency/stock/rollback, hanya harness QA tanpa merchant baru di hutan.
- [x] Pause Status/Inventaris/Perlengkapan/Jurus/Simpan-Muat terhubung, Settings tetap terpisah/persisten.
- [x] Save v2, migrasi v1 read-only, backup, corruption/quota/storage blocked handling; hasil unit/browser akhir di PHASE3_REPORT.md.
- [ ] Review manusia untuk pilihan pasif/angka DRAFT dan UI baru pada layar nyata; bukan fitur Phase 4 yang dikerjakan otomatis.

## Phase 4 — MVP

- [x] Intro/Nambo/loop/Hollowling/RPG → tepi hutan → checkpoint → Mournfang → penutup menuju Aveloria; bukan Chapter I penuh.
- [x] Boss AI, telegraph, Bertahan/GS/Potion, retry aman, reward/loot sekali dan persistence.
- [x] Source dialog C1-05 dan empat pose B01 existing, status DRAFT/NEEDS_REVIEW jujur.
- [x] Gate akhir: 405 unit, 375 produksi Edge, 38 Chrome, 38 dev Edge, strict TypeScript/build dan screenshot readability. Bukti di PHASE4_REPORT.md.
- [ ] Human playtest/pacing target 10–15 menit, review visual/animasi/balancing DRAFT dan GPU/layar nyata.

## Phase 5 — Full game

- [ ] Chapters I–IV, modern interlude, epilog (40 beat) dan semua RPG systems.
- [ ] Review aset individual dari source sheet terpilih → art produksi setelah uji visual dan game.
- [ ] Audio buatan user & media personal diberi izin, private build terpisah.

## Phase 6 — Release

- [ ] Polish, balancing, bugs, Settings, browser compatibility, legal asset audit.
- [ ] Hosting static **hanya setelah user meminta deploy**.

## Template handoff task

`Task ID` / `Phase` / `File berubah` / `Test dijalankan + hasil` / `Screenshots` / `Known issues` / `Next steps`. Ubah checkbox berdasarkan bukti, bukan karena file dibuat.


## Asset production backlog v3

- [ ] Approve 9 character portraits and true expression variants; verify face/costume consistency.
- [ ] Draw grid-based exploration atlases for 9 characters and battle atlases only C01–C04.
- [ ] Draw 6 regular and 4 boss encounters; B04 shares C04 identity/staff.
- [ ] Author ground slam, hand magic, forest summon, twig growth, staff temporal attacks, meteor/shield VFX.
- [ ] Receive original music from Game Director; preserve silent fallback.
- [ ] Review DRAFT lines and supply private modern memories if desired.
