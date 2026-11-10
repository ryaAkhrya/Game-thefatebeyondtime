# STATUS TERKINI — Phase 3: RPG dan save/load (10 November 2026)

Kode game di `web/` tetap Phaser 4.2.1 + TypeScript strict + Vite. Alur C1-01..04, battle, victory dan retry tetap berjalan; kini kemenangan memberi EXP/level/emas, dan Pause menyediakan Status, Inventaris, Perlengkapan, Jurus serta Simpan/Muat. Ada tiga slot manual, satu autosave aman, migrasi data lama, backup, dan **Lanjut** yang benar-benar memulihkan dunia setelah refresh. Save berada lokal di browser dan dapat hilang bila data situs dihapus. Rincian QA/status akhir: [PHASE3_REPORT.md](docs/production/PHASE3_REPORT.md). Toko hanya foundation/harness QA; Derrria tidak dipindahkan ke hutan. Aset lama masih NEEDS_REVIEW, musik/SFX tetap senyap. Phase 4 belum dikerjakan. Dependency existing tidak perlu diinstal ulang; dot-source `web/scripts/dev-env.ps1`, lalu `cd web` dan `npm run dev`.

# Aset aktif: v3.3

Gunakan **v3.3** (`DELTA_V3_2_TO_V3_3.md`, `QA_REPORT_v3_3.md`, `UI_STYLE_SPEC_V3_3.md`, `ASSET_INDEX.md`): C01 Yaric, M01 Hollowling, dan C01 Ground Slam di folder `v3_3/`. Ketiganya disalin utuh beserta JSON ke `web/public/assets/battle/`; tidak ada gambar ulang atau perubahan sumber. Aset battle v3.2 hanya arsip dan ditolak registry. Eksplorasi Yaric tetap v3.2 karena v3.3 tidak memiliki atlas eksplorasi. Semua aset NEEDS_REVIEW/DRAFT. Musik/SFX tetap AWAITING_COMPOSER.

# v3.1 revision status

This is a targeted revision of the v3 package. Revisi 02 controls approved story events; chapter dialogue, art redraws, mockups and sprite grids are DRAFT/NEEDS_REVIEW. Read `QA_REPORT_v3_1.md` before using any file as a production asset.

# The Fate Beyond Time — Production Bible v3.1

Dokumentasi produksi untuk game browser desktop. Bagian v3.1 di bawah adalah konteks historis; status implementasi aktual ada di bagian atas dan laporan phase. Mulai dari `CLAUDE.md`, `RULES.md`, dan `GDD.md`.

Prioritas: instruksi Game Director terbaru → cerita resmi `docs/source/CERITA_APPROVED_REVISI_02.docx` / `FULL_STORY.md` → keputusan desain v3 → sheet karakter → bahan v2. Naskah dialog kerja, angka balancing dan rincian yang tidak ada di cerita resmi tetap DRAFT.

Folder `docs/` menyimpan bahan v2 yang telah dikoreksi bila relevan. File v3 di root adalah pintu masuk terkini. Folder `assets/source_references/` menyimpan 4 sheet asli dan crop v3 sebagai REFERENCE. Folder lain berisi ekspresi, tampak, konsep monster/boss, sprite grid, senjata dan VFX baru berstatus DRAFT atau NEEDS_REVIEW. Lihat `ASSET_INDEX.md`.

Output Word ada di root dan tersedia pula secara terpisah. Jangan mencampur foto/identitas hubungan pribadi dengan build publik.
