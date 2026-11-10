# CHANGELOG — DOKUMENTASI & KODE

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
