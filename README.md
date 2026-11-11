# POLISH SPRINT 2 (12 November 2026)

Dunia hutan/kota dibangun ulang, Mournfang kini terlihat jelas (atlas V4), Yaric arah atas diperbaiki, Nambo/Torvan/Velthia diautor ulang, idle berbasis data untuk karakter utama, dan **Shift = lari**. Status PARTIAL (sprite pendukung masih prototipe): [POLISH_SPRINT2_REPORT.md](docs/production/POLISH_SPRINT2_REPORT.md); standar: [CHAPTER12_VISUAL_QUALITY_STANDARD.md](docs/production/CHAPTER12_VISUAL_QUALITY_STANDARD.md). Bab III belum dimulai.

# POLISH SPRINT 1 (11 November 2026)

UI/UX, Title Screen, tipografi tajam (kanvas = piksel perangkat), banner tujuan dihapus (tujuan di Jurnal), nama Yaric anonim sampai momen pengenalan di Bab II, dan sprite eksplorasi ternormalisasi. Status, bukti, screenshot dan batasan: [POLISH_SPRINT1_REPORT.md](docs/production/POLISH_SPRINT1_REPORT.md). Phase 6 (Bab II) tetap playable; Sprint 2 dan Bab III belum dimulai.

# STATUS TERKINI — Phase 6: Chapter II, Whispers of Fate (10 November 2026)

Chapter II C2-01..09 kini terhubung dari ending Bab I: arsip Azie, perpisahan Velthia, Liora/Zira, Hutan 2, Torvan bergabung, battle dua anggota, Veyrath, dua fragmen, dan laporan akhir ke Velthia. Akhir Bab II berhenti sebelum Bab III. Save v2 tetap membaca slot Bab I, dengan extension opsional untuk HP/MP Torvan dan waktu encounter terakhir. Art C03/C07/B02/M02/M03 serta lingkungan baru tetap DRAFT; audio tetap AWAITING_COMPOSER. Hasil QA dan batasan aktual: [PHASE6_REPORT.md](docs/production/PHASE6_REPORT.md). Preview lokal: **http://127.0.0.1:5173/**.

## Riwayat Phase 5

**PHASE 5 PASS untuk fungsional/QA otomatis:** 460 unit, 484 pemeriksaan produksi Edge, 113 Chrome dan 113 dev Edge; strict TypeScript/build lulus. Bug overlay Save/Load dan Settings yang tertutup ending sudah diperbaiki dan diuji secara visual.

Chapter I C1-01..09 kini terhubung dari Title: hutan, Hollowling, Mournfang, gerbang Talric, arsip Azie, audiensi Velthia, lonceng ganda dan penutup bab. Aveloria merupakan safe zone dengan jalan/plaza/pasar/halaman/ruang pertemuan, empat warga tanpa nama dan toko Derrria. Posisi, flags, inventory, emas dan stok toko ikut save v2; save forest lama tetap valid. Chapter II belum playable.

Laporan QA aktual, screenshots dan keterbatasan: [PHASE5_REPORT.md](docs/production/PHASE5_REPORT.md). Preview: **http://127.0.0.1:5173/**. Dari ujung timur tepi hutan pilih **Masuk Aveloria**; dari Title seluruh alur dapat dimainkan. Art/scene direction/dialogue kerja tetap DRAFT untuk review manusia; audio AWAITING_COMPOSER. Tidak ada commit, push atau deploy.

## Riwayat Phase 4 (digantikan status Phase 5 di atas)

**PHASE 4 PASS (fungsional/QA otomatis):** 405 unit, 375 pemeriksaan produksi Edge, 38 Chrome dan 38 dev Edge; strict TypeScript/build lulus. Review art, balancing dan pacing manusia tetap terbuka.

Kode game di `web/` tetap Phaser 4.2.1 + TypeScript strict + Vite. Intro, Nambo, jalur berulang dan Hollowling kini terhubung ke tepi Hutan 1, checkpoint istirahat, boss **Mournfang** dengan telegraph/counter, aftermath dan penutup demo menuju Aveloria. RPG, tiga slot manual, autosave aman, backup, migrasi dan **Lanjut** setelah refresh tetap terintegrasi. Ini bagian awal Chapter I; Aveloria/Velthia dan akhir Chapter I belum dibuat. Status QA, screenshot, balancing dan backlog: [PHASE4_REPORT.md](docs/production/PHASE4_REPORT.md). Save lokal dapat hilang bila data situs dihapus. Art B01 hanya empat pose DRAFT, art lama tetap NEEDS_REVIEW; audio senyap AWAITING_COMPOSER. Toko tetap harness QA tanpa NPC baru. Phase 5 belum dimulai, tidak ada commit/push/deploy. Preview lokal: `http://127.0.0.1:5173/`. Dependency existing tidak perlu diinstal ulang; dot-source `web/scripts/dev-env.ps1`, lalu `cd web` dan `npm run dev`.

# Aset aktif: v3.3

Gunakan versi terbaru yang benar-benar ada (`ASSET_INDEX.md`): C01 Yaric, M01 Hollowling dan Ground Slam di `v3_3/`, B01 `B01_BATTLE_ATLAS_DRAFT` empat pose. Semuanya disalin utuh beserta JSON ke `web/public/assets/battle/`; source tidak digambar ulang. B01 belum memiliki v3.3 dan tidak dianggap animasi final. Battle v3.2 yang sudah digantikan ditolak registry. Eksplorasi Yaric tetap v3.2 karena belum ada pengganti. Semua aset NEEDS_REVIEW/DRAFT. Musik/SFX tetap AWAITING_COMPOSER.

# v3.1 revision status

This is a targeted revision of the v3 package. Revisi 02 controls approved story events; chapter dialogue, art redraws, mockups and sprite grids are DRAFT/NEEDS_REVIEW. Read `QA_REPORT_v3_1.md` before using any file as a production asset.

# The Fate Beyond Time — Production Bible v3.1

Dokumentasi produksi untuk game browser desktop. Bagian v3.1 di bawah adalah konteks historis; status implementasi aktual ada di bagian atas dan laporan phase. Mulai dari `CLAUDE.md`, `RULES.md`, dan `GDD.md`.

Prioritas: instruksi Game Director terbaru → cerita resmi `docs/source/CERITA_APPROVED_REVISI_02.docx` / `FULL_STORY.md` → keputusan desain v3 → sheet karakter → bahan v2. Naskah dialog kerja, angka balancing dan rincian yang tidak ada di cerita resmi tetap DRAFT.

Folder `docs/` menyimpan bahan v2 yang telah dikoreksi bila relevan. File v3 di root adalah pintu masuk terkini. Folder `assets/source_references/` menyimpan 4 sheet asli dan crop v3 sebagai REFERENCE. Folder lain berisi ekspresi, tampak, konsep monster/boss, sprite grid, senjata dan VFX baru berstatus DRAFT atau NEEDS_REVIEW. Lihat `ASSET_INDEX.md`.

Output Word ada di root dan tersedia pula secara terpisah. Jangan mencampur foto/identitas hubungan pribadi dengan build publik.
