# PHASE 1 REPORT — Exploration & Dialogue

**Tanggal:** 10 November 2026 · **Status: PASS** (dengan batasan dan catatan editorial di bawah)

Intro Chapter I (C1-01, C1-02, C1-03) dapat dimainkan dari Title sampai penanda akhir demo dengan keyboard. Tidak ada battle, EXP, inventaris penuh, atau Chapter II+.

## Deliverable dan gate (dinyatakan sebelum mulai)

| Deliverable | Bukti |
|---|---|
| Eksplorasi top-down 4 arah, collision, kamera, interaksi | `world/Collision.ts`, `world/Interaction.ts`, `WorldScene`; 22 unit test peta/collision + e2e jalan nyata |
| Peta Hutan 1 (DRAFT dev art, bukan final) | `data/maps/forest1.map.mjs` + `scripts/gen-forest-art.mjs`; screenshot `p1_*` |
| Dialogue System: portrait + ekspresi, typewriter (Text Speed), halaman, pilihan, input aman | `dialogue/*`, `ui/components/DialogueBox.ts`; 58 unit test + e2e |
| C1-01 → C1-03 dengan flag kanonik `story.c1_awake`, `story.c1_nambo`, `story.c1_loop` | `story/Chapter1Story.ts`; 22 unit test alur + e2e permainan penuh |
| Regresi Phase 0 tetap utuh | semua tes Phase 0 lulus (lihat di bawah) |
| Gate umum PHASES.md: build, tes, keyboard-only, laporan yang tidak diuji | bagian ini |

## Hasil tes (nyata, 10 Nov 2026)

| Pemeriksaan | Hasil |
|---|---|
| Baseline sebelum perubahan | 85 unit + 84 e2e lulus |
| `npm run typecheck` (strict) | 0 error |
| `npm test` (vitest) | **11 file, 204 tes lulus** (Phase 0: 85, baru Phase 1: 119) |
| `npm run build` | sukses; `dist/` 2,0 MB (game 54 KB, Phaser 1,37 MB di chunk sendiri) |
| `npm run test:e2e` terhadap **preview build** | **84/84** (regresi Phase 0) + **93/93** (Phase 1) |
| `npm run test:e2e` terhadap **dev server** | **84/84** + **93/93** |
| Tidak ada error JS / 404 / request `.ogg` | ditegaskan di kedua suite |

Cakupan e2e Phase 1 (Edge 157 headless, tombol keyboard sungguhan dari Title ke akhir demo, tanpa teleport kecuali satu perbandingan piksel): intro C1-01 dengan portrait CONFUSED; gerak terkunci saat dialog; Enter pertama menyelesaikan teks, Enter beruntun cepat tidak melompat baris; gerak ke 4 arah (panah dan WASD), tanpa diagonal; collision tepi hutan, pohon, gerbang; prompt hanya bila menghadap dan dekat; periksa tanah dan pedang; Jurnal; **flag `story.c1_awake` belum naik saat jurnal masih tampil, naik setelah selesai**; Nambo terpicu otomatis, 16 baris C1-02 berurutan, ekspresi berubah, pilihan jawaban dengan keyboard, baris panjang dipecah halaman; bicara ulang hanya memutar L014/L016; NPC tidak dapat diajak bicara dari jauh; papan, semak berduri yang menghalangi, pengulangan lorong (wrap) dan perbandingan piksel sebelum/sesudah wrap (selisih < 0,2%); papan "yang tadi", semak terbuka, jalan setapak, `story.c1_loop`; peti (Potion tepat 1, "Sudah kosong." berikutnya); akhir demo → Title; Menu Jeda → Pengaturan → Jeda → dunia; Text Speed lambat/instan pada dialog nyata; 1920×1080.

### Cacat yang ditemukan sendiri lalu diperbaiki
- **Celah gerbang**: tes jangkauan menemukan pemain bisa melewati gerbang tak terlihat lewat sisi utara elips clearing (C1-02 bisa dilewati). Gerbang kini menutup seluruh tinggi pintu keluar.
- Legenda kontrol baru memicu tumpang-tindih teks di layar Panduan Kontrol (tertangkap pemeriksaan layout otomatis dari Phase 0).
- Dasar peta tidak periodik karena ukuran sel noise tidak membagi periode (tertangkap tes keperiodikan); piksel liar di atlas Yaric (frame kiri/kanan, y ≥ 44) ditemukan lewat `scripts/asset-qa.mjs` dan dibersihkan pada salinan web.

## Keputusan arsitektur
- **Resolusi internal 640×360** (Phase 0: 320×180). Sprite eksplorasi 32×48 butuh bidang pandang dunia ±20 petak. Semua UI Phase 0 tetap dirancang di ruang 320×180 dan memakai kamera zoom 2 (`configureUiCamera`), sehingga tampilannya identik. Pixel Perfect: 2× di 1366×768 (1280×720) dan 3× di 1920×1080.
- **Lorong berulang (C1-03)**: dekorasi dan dasar peta periodik (24 petak). Melewati batas timur menggeser pemain −24 petak dan kamera ikut, tampak mulus (diuji piksel). Papan berikutnya = "Papan yang tadi?" → semak di mulut jalan setapak terbuka. Tanpa efek glitch/neon/jam.
- `InputManager.getMoveDirection()` (polling arah) dan tombol E/Spasi = konfirmasi. Tombol yang ditahan saat layer berganti tidak menggerakkan pemain sampai dilepas.
- `GameState`: `setFlag` (idempoten), `items` minimal, `setPosition`. Struktur sudah cocok dengan `SaveRepository` (save lama tanpa `items` tetap valid). Belum ada penyimpanan permainan.

## Status aset (jujur)
- **Yaric (eksplorasi)**: atlas eksplorasi terbaru yang ADA adalah **v3.2** (v3.3 tidak memiliki atlas eksplorasi). Status NEEDS_REVIEW. Salinan web membersihkan piksel liar (104 px) lewat `scripts/prepare-assets.mjs`; sumber tidak diubah.
- **Nambo (eksplorasi)**: **DRAFT**, prototipe kualitas rendah (blok polos, tanpa goggles/syal yang jelas pada potret). Ini **kelemahan visual terbesar** saat ini; tidak digambar ulang (aturan CLAUDE.md). Perlu sprite baru dari Game Director.
- **Potret ekspresi** (DRAFT): salinan runtime diperkecil ke tinggi 128 px dari PNG individual (bukan pixelation). Di 1920×1080 tampil berblok 3× karena kanvas 640×360.
- **Lingkungan Hutan 1**: seluruh gambar (tanah, pohon, batu, papan, peti, pedang, dll.) dibuat oleh kode (`scripts/gen-forest-art.mjs`), tanpa aset luar atau internet. Status **DRAFT dev art**, bukan final. Mengganti `ground.png`/`props.png`/`props.json` di `public/assets/environment/forest1/` tidak mengubah peta atau collision.
- Pedang Yaric di tanah adalah sprite DRAFT buatan kode, bukan referensi desain.
- Lihat `ASSET_INDEX.md` bagian "Web import status (Phase 1)".

## Teks yang BUKAN dari naskah (DRAFT_IMPL, perlu review Game Director)
Semua dialog berasal dari `DIALOGUE_EVENTS.json` / `CHAPTER_I_SCRIPT.md`. Hanya empat teks UI sistem yang ditambahkan agar pemain tidak buntu (bukan kalimat cerita, tanpa lore):
1. `Periksa sekitar tempatmu bangun dulu.` (toast di gerbang tak terlihat sebelum C1-01 selesai)
2. `Semak berduri menghalangi jalan setapak.` (memeriksa semak sebelum pengulangan disadari)
3. `Ada celah di semak sebelah utara.` (petunjuk setelah "Papan yang tadi?")
4. Tujuan HUD: `Periksa sekitar (n/2)` (UI). Tujuan lain memakai kalimat naskah (`Cari jalan keluar dari hutan.` dari Jurnal; `Ikuti jalan sampai gerbang batu.` dari ucapan Nambo).

Catatan editorial lain: C1-03-L001 di JSON berisi karakter rusak (U+FFFD); dipakai "—" dari naskah. Opsi O-15 (nama terukir di sarung pedang) tidak diimplementasikan. Bicara ulang ke Nambo hanya memakai ulang L014 dan L016. Opsi "periksa tas kosong" dari scene direction tidak ada teksnya di naskah, jadi tidak dibuat.

## Belum diuji / batasan (jujur)
- Hanya **Edge 157 headless**. Chrome, Firefox, jendela non-headless, F11, dan multi-monitor belum.
- **Tidak ada uji oleh manusia.** Rasa gerak (kecepatan 88 px/dtk), panjang jalan, dan tingkat kesulitan menemukan celah semak belum dinilai pemain nyata.
- Performa: contoh `requestAnimationFrame` di headless dengan render perangkat lunak 1920×1080: rata-rata 20 ms (≈49 FPS), p95 22,8 ms. Itu **bukan** ukuran representatif untuk GPU nyata.
- Tidak ada audio (BGM_FOREST_01 `AWAITING_COMPOSER`): game senyap, tidak ada request audio.
- Tidak ada penyimpanan permainan (Phase 3). Lanjut di Title masih hanya aktif untuk save valid dan menuju layar pengganti.
- Reduced Flashes dan Screen Shake belum punya efek nyata di dunia (belum ada efek kilat/getar selain pratinjau Settings).
- Pengujian akses (pembaca layar, kontras) belum dilakukan di luar kontras palet.
- Teleport QA (`?qa=1`) hanya untuk uji; tidak aktif tanpa parameter itu.

## Kebutuhan SFX (tidak diisi otomatis)
Lihat `AUDIO_COMPOSER_HANDOFF.md` bagian "SFX Phase 1". Tidak ada SFX/BGM yang dibuat atau diunduh.

## Kesiapan Phase 2 (tanpa mengerjakannya)
- `GameState.items`, `setFlag`, dan `SceneRouter` siap. WorldScene perlu titik masuk encounter (`C1-04`) dan `returnTo` koordinat (sudah ada `position`).
- Atlas battle v3.3 (Yaric, Hollowling, Ground Slam) sudah terdaftar di `AssetRegistry` (`imported: false`); impor setelah verifikasi manusia.
- BattleEngine murni (tanpa Phaser) belum ada. Pola `Chapter1Story`/`DialogueRunner` (logika murni + tes) dapat ditiru.
- Pause/Settings dari dunia sudah berjalan; Pause saat battle perlu aturan (tidak menghabiskan giliran).
