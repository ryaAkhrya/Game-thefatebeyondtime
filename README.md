# STATUS TERKINI — Phase 4: vertical slice sampai Mournfang (10 November 2026)

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
