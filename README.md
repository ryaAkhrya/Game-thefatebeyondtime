# STATUS TERKINI — Phase 0 dan Phase 1 selesai (10 November 2026)

Kode game ada di `web/` (Phaser 4.2.1 + TypeScript + Vite). **Dapat dimainkan:** intro Chapter I (C1-01 bangun di hutan, C1-02 bertemu Nambo, C1-03 jalur hutan berulang) sampai penanda akhir demo; eksplorasi 4 arah, dialog dengan portrait/ekspresi, Menu Jeda, Pengaturan (9 opsi, tersimpan). **Belum ada:** battle, EXP, inventaris penuh, simpan/muat permainan, chapter lanjutan, musik. Jalankan: `cd web && npm install && npm run dev` (lihat URL di terminal). Bukti tes dan daftar yang belum diuji: `docs/production/PHASE0_REPORT.md` dan `docs/production/PHASE1_REPORT.md`. Lingkungan Hutan 1 dan sprite Nambo masih DRAFT.

# Aset aktif: v3.3

Gunakan **v3.3** (`DELTA_V3_2_TO_V3_3.md`, `QA_REPORT_v3_3.md`, `UI_STYLE_SPEC_V3_3.md`, `ASSET_INDEX.md`): C01 Yaric, M01 Hollowling, dan C01 Ground Slam di folder `v3_3/`. Aset battle v3.2 (`v3_2/`) hanya arsip historis dan digantikan; `AssetRegistry` di web menolaknya. Pengecualian yang sah: atlas EKSPLORASI Yaric v3.2 (`C01_EXPLORATION_PIXEL_PASS_V3_2`) tetap aktif karena v3.3 tidak memiliki atlas eksplorasi. Semua aset berstatus NEEDS_REVIEW/DRAFT; belum ada yang PRODUCTION_READY. Atlas battle v3.3 belum diimpor ke `web/public`; yang diimpor (Phase 1): eksplorasi Yaric (v3.2, dibersihkan), eksplorasi Nambo (DRAFT), potret ekspresi, dan seni lingkungan DRAFT buatan kode (lihat `ASSET_INDEX.md`). Musik: semua AWAITING_COMPOSER.

# v3.1 revision status

This is a targeted revision of the v3 package. Revisi 02 controls approved story events; chapter dialogue, art redraws, mockups and sprite grids are DRAFT/NEEDS_REVIEW. Read `QA_REPORT_v3_1.md` before using any file as a production asset.

# The Fate Beyond Time — Production Bible v3.1

Dokumentasi produksi untuk game browser desktop. **Belum ada kode game playable.** Mulai dari `CLAUDE.md`, `RULES.md`, `GDD.md`, lalu `QA_REPORT_v3_1.md`.

Prioritas: instruksi Game Director terbaru → cerita resmi `docs/source/CERITA_APPROVED_REVISI_02.docx` / `FULL_STORY.md` → keputusan desain v3 → sheet karakter → bahan v2. Naskah dialog kerja, angka balancing dan rincian yang tidak ada di cerita resmi tetap DRAFT.

Folder `docs/` menyimpan bahan v2 yang telah dikoreksi bila relevan. File v3 di root adalah pintu masuk terkini. Folder `assets/source_references/` menyimpan 4 sheet asli dan crop v3 sebagai REFERENCE. Folder lain berisi ekspresi, tampak, konsep monster/boss, sprite grid, senjata dan VFX baru berstatus DRAFT atau NEEDS_REVIEW. Lihat `ASSET_INDEX.md`.

Output Word ada di root dan tersedia pula secara terpisah. Jangan mencampur foto/identitas hubungan pribadi dengan build publik.
