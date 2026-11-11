# Phase 6 — Chapter II: Whispers of Fate

Pengerjaan 10–11 November 2026. Workspace `D:\01_DEVELOPMENT\GAME\FINAL`, aplikasi `web/`. Scope adalah Chapter II C2-01..09 sesuai instruksi terbaru, bukan roadmap lama yang memakai nama Phase 6 untuk rilis.

## A. Status

**Status: PASS untuk gate implementasi dan QA otomatis Phase 6.** Regresi produksi Edge Phase 0–6 lulus 539/539, termasuk 55/55 Bab II pada 1366×768 dan 1920×1080. Chrome serta dev Edge focused Phase 4–6 masing-masing lulus 168/168. 488 unit, TypeScript strict dan build produksi lulus. Aset/angka/naskah kerja tetap DRAFT/NEEDS_REVIEW dan bukan approval artistik.

## B. Alur Chapter II playable

Ending Bab I (`chapter.1_complete`) menawarkan **Mulai Bab II**. Azie menunjukkan dua catatan yang berbeda → Velthia menyerahkan surat dan mengirim Yaric → perjalanan ke Liora → Zira membandingkan dua versi legenda → penanda pertama Hutan 2 dan bayangan di jalur → Torvan bergabung setelah dialog → tutorial battle duo → penanda kedua dan jalan lama → Veyrath → catatan dan fragmen dibaca berurutan → kembali ke Aveloria → Yaric melapor kepada Velthia → **Bab II selesai**. Menu akhir dapat menjelajah, menyimpan/memuat, membuka pengaturan atau kembali ke judul; tidak ada tombol memulai Bab III. Tiap outcome disetel setelah dialog/battle selesai, bukan saat halaman pertama tampil.

Seluruh **97 baris** `DIALOGUE_EVENTS.json` C2-01..09 dimasukkan verbatim dengan ID, teks, ekspresi, pause dan portrait. Penghubung navigasi, respons ulang, deskripsi ukiran/penanda/warga dan fragmen kerja diberi ID `DRAFT_IMPL`. Naskah kerja ini belum approval dialog final; urutan/rahasia mengikuti Revisi 02 dan scene direction. Torvan tidak mengungkap identitas sebenarnya, Yaric/Velthia belum mengungkap cinta atau memori masa lalu, Varlgrim tidak dijelaskan di luar bahan bab. Tidak ada konten Bab III.

## C. Liora dan Hutan 2

Liora (960×704) memiliki jalan utama, bengkel bingkai Zira, dua ukiran yang dapat dibaca, pekerja kayu, penjaga dan dua exit. Hutan 2 (1280×768) memiliki jalur penebang, cabang pengamatan, dua batu penanda, tempat istirahat, jejak patroli, penghalang jalan lama, arena Veyrath, dua fragmen dan rute pulang. Geometri `CollisionMap`, interaksi, trigger, kamera dan perjalanan area memakai sistem existing; elemen visual code-native DRAFT terpisah dari geometri. Penghalang fisik baru terbuka setelah Veyrath; fragmen kedua mensyaratkan catatan pertama. Tidak ada puzzle jam generik atau random battle setiap beberapa langkah.

`forest2_patrol` adalah encounter **opsional sekali** M02+M03. Jejak dapat diperiksa setelah tutorial; cooldown 20 detik playtime sejak kemenangan tutorial disimpan, lalu satu battle dapat diambil. Tidak ada grinding wajib untuk boss. Durasi dan susunan adalah ASSUMPTION/DRAFT untuk playtest. Dua battle utama di rute C2 memakai susunan M01+M02 dan B02.

## D. Torvan dan party

Torvan C03 masuk party secara atomik hanya setelah seluruh C2-05 selesai. Party aktif maksimal dua: C01 Yaric dan C03 Torvan. Profil Mage/Support C03 memiliki HP/MP, statistik, EXP, level, skill point dan equipment sendiri. Inventory/emas tetap bersama; Potion dan support memilih target anggota secara eksplisit. Ranting Nakal (3 MP, nature magic) dan Bukan Aku! (2 MP, perlindungan satu anggota) tersedia saat join. Tunas Bandel (4 MP, heal 24 HP) adalah unlock progression berikutnya; Keajaiban Kecil hanya konsep Ultimate dan tidak diberikan saat join. Biaya/angka ini DRAFT.

Turn order berdasarkan SPD dan tie-break deterministik. Status diproses per aktor; satu anggota tumbang belum mengakhiri party. Battle solo Yaric Bab I tetap memakai engine dan UI yang sama. Menu RPG berpindah C01/C03, memperlihatkan status/gear/skill dan memakai item pada anggota terpilih.

## E. Combat, monster dan Veyrath

BattleScene menampilkan dua anggota di kanan, roster HP/MP, nama aktor aktif, target ally/enemy, dua musuh dan feedback skill. C03/M02/M03/B02 memakai atlas DRAFT empat pose dengan adapter playback; nature VFX digambar sederhana dengan warna daun. AI M02/M03 dapat memberi tekanan fisik/status, sedangkan Veyrath B02 memakai siklus **guard → tusukan tertelegraf → recover**, berbeda dari sweep Mournfang. Ranting Nakal dapat memutus charge; Defend, Potion dan serangan fisik tetap berguna. Sebelum boss party dipulihkan ke HP/MP penuh pada checkpoint; kekalahan/retry mengembalikan HP/MP/item kedua karakter. Reward EXP per anggota, emas dan item dikomit sekali hanya setelah victory. Patroli opsional menerima Kabur dan kembali ke dunia tanpa reward/flag; menu dua musuh tidak meminta target untuk Kabur atau Bertahan. Stat B02 240 HP/18 ATK/14 DEF/9 SPD, reward 85 EXP per anggota dan 32 emas adalah DRAFT untuk balancing.

Bug UI yang ditemukan melalui screenshot: objective Bab II panjang melewati ruang 320×180. HUD sekarang membungkus objective/toast dan menempatkan toast di bawah objective. Label giliran duo juga dipindah agar tidak berhimpit dengan nama musuh. Layout dicek di browser pada battle dan dialog.

## F. Yaric dan Velthia

Adegan awal Velthia memberi pekerjaan dan surat pengantar sambil tetap mengurus kota. Adegan akhir membandingkan temuan, menanggapi kondisi Yaric dan memberi tugas Azie berikutnya. C2-02 (12 baris) dan C2-09 (15 baris) memakai naskah kerja dari sumber; portrait C02 VULNERABLE tambahan memakai PNG ekspresi existing. Kedekatan dibangun melalui keputusan dan percakapan, tanpa confession/memori eksplisit. Pembacaan artistik/chemistry dialog masih memerlukan review manusia.

## G. Save/load dan kompatibilitas

Envelope `save_v2`, data schema 2 dan key `tfbt.save.v1.{auto,slot1,slot2,slot3}` tetap. Extension `partyVitals.C03` wajib hanya setelah flag join; slot lama C01 tetap tanpa field ini. `world.lastChapter2EncounterSec` opsional dan hanya sah di Bab II. Validasi menolak party/flag/HP/MP yang tidak konsisten, serta menurunkan beat cerita dari flags. Posisi Liora/Hutan 2, skill/equipment/EXP, kedua HP/MP, inventory, boss dan fragmen dipulihkan dari snapshot; NPC/penghalang direkonstruksi saat world dibuka. Reload/Continue sesudah join terbukti menjaga Torvan. Slot Bab I lama terbukti dapat dimuat dari ending Bab II, lalu slot ending Bab II memulihkan party dan flag selesai. Save manual saat cutscene/battle tetap memakai batas aman `SaveCoordinator`.

## H. QA aktual

Baseline **sebelum perubahan Phase 6**: 460/460 unit, strict TypeScript/build; produksi Edge **484/484**, Chrome focused boss+kota **113/113**, dev Edge focused **113/113**. Bukti: `.dev-cache/logs/phase6-baseline-*` dan `.dev-cache/test-artifacts/phase6-baseline-*`.

| Gate sesudah implementasi | Hasil |
|---|---:|
| TypeScript strict + unit | 488/488, 17 file, PASS |
| Build produksi Vite | PASS |
| Produksi Edge focused Chapter II, 1366×768 + 1920×1080 | 55/55 PASS |
| Produksi Edge seluruh regresi Phase 0–6 | 539/539 PASS (84+196+37+54+38+75+55) |
| Chrome focused Phase 4–6, 1366×768 + 1920×1080 | 168/168 PASS (38+75+55) |
| Dev Edge focused Phase 4–6, 1366×768 + 1920×1080 | 168/168 PASS (38+75+55) |

`phase6.mjs` memulai dari save Bab I selesai, menggunakan interaksi keyboard untuk Zira, rute Hutan 2, Torvan, tutorial, penanda dan Veyrath; memeriksa teks sumber, status dua aktor, reward, ending dan kompatibilitas slot. Beberapa perpindahan jauh kota/fragmen memakai teleport khusus fixture QA untuk menekan durasi; perjalanan inti hutan dilakukan dengan keyboard. Patroli opsional, cooldown tersimpan, Kabur tanpa hadiah, kemenangan sekali dan hilangnya Veyrath diuji E2E pada dua resolusi. Pemeriksaan network/console focused: tidak ada fatal JS, request asset gagal/404 atau audio yang belum diberikan. Percobaan awal yang gagal karena batas objective, koordinat fixture dan race teleport Veyrath disimpan sebagai riwayat; hanya build/perjalanan akhir dihitung PASS.

## I. Screenshot dan preview

Preview lokal: **http://127.0.0.1:5173/** (hanya localhost, tanpa deployment). Bukti build produksi di `.dev-cache/test-artifacts/phase6-all-final/`: `p6_1366_start.png`, `p6_1366_liora.png`, `p6_1366_forest2.png`, `p6_1366_duo_world.png`, `p6_1366_torvan_status.png`, `p6_1366_duo_battle.png`, `p6_1366_veyrath.png`, `p6_1366_ending.png` dan pasangan 1920. Bundle `index-DeBZmNPR.js` SHA-256 `F7AF339E5FE747485A38287F77D377D3B1E16799877BDFB4E1106DF9692A138F`. Screenshot battle memperlihatkan placeholder empat pose C03/B02/M02, bukan art final.

## J. File baru dan file diubah

Baru untuk Phase 6: `web/src/game/story/{chapter2Flags,Chapter2Story}.ts`, `web/src/game/dialogue/{chapter2.ts,chapter2.lines.json}`, `web/src/game/world/{chapter2Maps,Chapter2View}.ts`, `web/src/game/rpg/party.ts`, `web/scripts/prepare-chapter2-assets.mjs`, `web/public/assets/chapter2.generated.json` beserta atlas/portrait turunannya, `web/tests/unit/chapter2.test.ts`, `web/tests/e2e/phase6.mjs`, laporan ini.

Diubah untuk integrasi: `WorldScene`, `SliceEndScene`, `BattleEngine`, `BattleSession`, `BattleScene`, `BattleAtlas`, `BattlePanel`, `HudScene`, `GameState`, RPG definitions/progression/actions/menu, `SaveLoadScene`, asset paths/manifest, dialogue types, `Chapter1Story`, `AveloriaView`, `main.ts`, `package.json`, runner E2E dan dokumentasi root/production. Perubahan Phase 5 yang belum di-commit dari sesi sebelumnya tetap ada dan dipertahankan; daftar `git status` mencampur file Phase 5 dan Phase 6. Tidak ada commit, push atau deploy.

## K. Batasan

- C03 Torvan, C07 Zira, M02/M03 dan B02 memakai sumber sprite DRAFT kasar. C07 memiliki piksel tepi pada sumber; source tidak diubah. Empat pose battle diulang/ditahan oleh adapter, belum animasi penuh. Concept likeness, siluet, ekspresi dan konsistensi pixel perlu revisi artist.
- Liora/Hutan 2, dua warga tanpa nama, penempatan penanda, cooldown, statistik, skill MP, reward dan Pacing adalah ASSUMPTION/DRAFT. Tidak ada side quest fetch tambahan. Naskah kerja/bridge DRAFT_IMPL belum disetujui Game Director.
- Browser headless dan screenshot belum menggantikan uji manusia pada monitor/GPU, tempo cerita, chemistry, difficulty dan aksesibilitas nyata. Tidak ada audio karena seluruh cue tetap AWAITING_COMPOSER; gameplay berjalan senyap. Tidak ada foto/media pribadi.

## L. Kesiapan Bab III

Ending Bab II menyimpan quest handoff Azie dan tidak mengaktifkan Bab III. Sistem party/save dan flag menyediakan titik lanjut, tetapi bab berikutnya memerlukan instruksi serta review narasi/art/balancing tersendiri. Tidak ada konten Bab III yang diimplementasikan pada Phase 6.
