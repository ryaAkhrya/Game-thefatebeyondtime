# Sprint 4 / Agen N — naskah dialog Chapter IV (The Fate)

Status: selesai untuk lingkup data dan tes. Semua teks DRAFT/NEEDS_REVIEW, bukan naskah approved. Tidak ada BGM, tidak ada konten modern, tidak ada epilog/kredit.

## File
- `web/src/game/dialogue/chapter4.ts`: 25 skrip `DialogueScript`, `C4_BATTLE_CALLOUTS` (7 kunci), `C4_SCRIPTS`, `C4_CANON_COVERAGE`, `chapter4Canon(scene, from, to)`. Semua nama ekspor kontrak dipertahankan persis.
- `web/src/game/dialogue/chapter4.lines.json`: salinan 36 baris `DIALOGUE_EVENTS.json` C4-01..07 (tujuh field, dihasilkan dari JSON sumber).
- `web/tests/unit/chapter4-dialogue.test.ts`: 32 tes (lulus). `npx tsc --noEmit` bersih untuk kedua file.

Hitungan: 36 baris kanon (`source: 'DIALOGUE_EVENTS'`) + 162 baris `DRAFT_IMPL` (ID `C4-01..07-Xnnn`, `C4-REPORT-Xnnn`, `C4-ARCHIVE-Xnnn`, `C4-AEGIS-Xnnn`, `C4-RIFTBORN-Xnnn`, `C4-BOSS-Xnnn`) + 7 banner battle.

## Skrip dan kapan dipakai (untuk lead/F/A4)
| Ekspor | Kapan | Kanon |
|---|---|---|
| `C4_ARRIVAL` | Mulai Bab IV, Gerbang Luar | C4-01 L001-004 |
| `C4_RIFTBORN_FIRST` | Riftborn pertama | - |
| `C4_REPORT_A` / `C4_REPORT_B` | Pos kurir Gerbang Luar / Serambi Heart (kind `read`, label "Laporan Talric") | - |
| `C4_ARCHIVE_VELTHIA` | Arsip Penjaga; mengatur `aegisLearned` sesudahnya | - |
| `C4_AEGIS_TRIAL_INTRO` / `_DONE` | Ruang Uji Segel sebelum / sesudah battle `fortress_aegis_trial` | - |
| `C4_CONFRONT` | Ruang Heart, mengatur `confront`; berisi satu `choice` (`C4-02-CHOICE`, opsi `skeptic`/`gentle`) | C4-02 L001-006 |
| `C4_BOSS_INTRO` | Langsung sebelum battle Varlgrim | - |
| `C4_VICTORY_LEAN` | Sesudah menang | C4-03 L001-002 |
| `C4_HEART_APPROACH`, `C4_HEART_LOCK_YARIC`, `C4_HEART_LOCK_VELTHIA`, `C4_HEART_OPEN` | Dua pengunci: skrip kunci masing-masing netral urutan (kedua berbunyi "Sudah di sisiku. Tinggal sisimu."); `HEART_OPEN` setelah keduanya | - |
| `C4_TOWER_FALL` | Jendela busur (debu menara) | C4-04 L001-004 |
| `C4_MEMORY_ENTER`, `C4_MEMORY_A`, `C4_MEMORY_B` | Ruang Gema: masuk, peta kulit, dua keping logam (keduanya gema, tidak dapat diambil) | - |
| `C4_OLD_MEMORY` | Setelah A dan B | C4-05 L001-004 |
| `C4_VARLGRIM_TRUTH` | Pengakuan, `varlgrimTruth` dan `varlgrimStays` sesudahnya | C4-06 L001-003 |
| `C4_TORVAN_REVEAL` | Torvan muncul, batas kekuasaan | C4-06 L004-010 |
| `C4_TORVAN_LEAVES`, `C4_AFTER_TORVAN` | Kepergian sederhana; resolusi singkat Yaric-Velthia (bukan adegan tebing) | - |
| `C4_RETURN_GATE` | Gerbang Luar saat pulang | - |
| `C4_RETURN_AVELORIA` | Aveloria sesudah runtuh | C4-07 L001-006 |
| `C4_BATTLE_CALLOUTS` | Banner battle (`phase2, phase3, meteor_call, meteor_hold, meteor_survived, aegis_taught, defeat_hint`; <= 80 karakter) | - |

Teks lore/papan/peti Benteng (F) dan NPC Aveloria-IV (A4) ditulis oleh pemilik masing-masing di file mereka.

## Pilihan penulisan
- **Kebenaran bertahap.** C4-02: Varlgrim hanya menunjukkan kilasan akhir dan membela segel. C4-05: ingatan lama (peta berisi dua jalur, dua keping separuh lingkaran = lambang Heart). C4-06: gema memutar awalnya, Varlgrim mengaku (a) retak pertama ada di segelnya, (b) ia membaca setengah ramalan dan salah menghitung risiko, (c) ia yang memisahkan ingatan Yaric dan Velthia (sesuai `LORE_BIBLE` A3), tanpa pembelaan. Yaric marah singkat, Velthia tegas.
- **Tidak ada pengampunan instan.** Velthia: "Aku tidak bisa menganggap semuanya selesai..." lalu menunda keputusan ("nanti, di depan orang-orang yang kau rugikan"). Varlgrim: "Itu adil." Nasib akhir tidak dipastikan (ia menanamkan tongkat ke dinding yang retak, tidak menoleh). Torvan sendiri menolak mengampuni ("bukan hakku").
- **Torvan.** Reveal tepat pada C4-06 (kanon). Batas: tidak berhak mencabut pilihan manusia maupun akibatnya, tidak menghidupkan korban ("Tidak. Dan itu bukan karena aku tidak peduli"), tidak ada hadiah perpisahan, tidak mengatur siapa yang dipedulikan (Yaric menoleh ke Velthia, Torvan menyindir). Lucu: "Tolong jangan berlutut. Lantainya dingin." Pergi lewat lorong, tanpa cahaya.
- **Tema The Fate** lewat gestur kecil: tanda separuh lingkaran, peta dua tulisan tangan, tangan Yaric yang terulur lalu ditarik. Satu penjelasan Torvan ("Bukan perintah. Hanya catatan bahwa dua jalan bisa bertemu") dan satu kalimat Velthia ("Kita yang memutuskan"). Tidak ada kata cinta/takdir panjang (dicek tes).
- **Konsekuensi.** Laporan B menyiapkan "Talric mengabariku tadi"; menara runtuh dari kejauhan (debu); di Aveloria: arsip bawah terkubur, bangunan roboh, SATU penjaga gerbang bawah gugur (ini baris DRAFT_IMPL tambahan sebagai penjelasan "tidak semua selamat"; evakuasi warga tetap selamat), Velthia bersumpah menemui keluarganya sendiri, Azie mengakui perintah Velthia benar tetapi dewan menunggu. Torvan pergi tanpa pamit (ember tersusun rapi; "pergi atas kehendaknya sendiri").
- **Velthia** memiliki agensi: evakuasi adalah keputusannya, Perlindungan ia tentukan waktunya ("Aku yang menentukan, dan kau menjagaku sampai saat itu"), ia menolak keputusan tergesa soal Varlgrim.
- **Perlindungan** diajarkan lewat pusaka bergema di arsip (bukan level), diuji di Ruang Uji Segel (boleh salah, ulangi), diingatkan di `C4_BOSS_INTRO` dengan bahasa dunia ("jangan menyerang saat ia menahan langit; beri aku giliran").
- Narasi SYSTEM memakai "sang pengembara" bila perlu merujuk Yaric (tidak menyebut Yaric/Yudis).
- Baris SYSTEM pendek di setiap adegan besar dan jeda 500-600 ms untuk bernapas.

## Penyimpangan dari rencana lead (perlu diketahui)
1. **Choice C4-02.** Kontrak menulis "satu dari kanon L004". Karena `DialogueRunner` hanya memutar baris pilihan sebagai baris baru (`source: CHAPTER_I_SCRIPT`) dan tes kanon mewajibkan L004 muncul TEPAT SEKALI sebagai baris `DIALOGUE_EVENTS`, kedua opsi adalah kalimat pembuka sebelum L004: `skeptic` "Berdiri? Dari sini lantainya kelihatan miring." dan `gentle` "Aku tahu kau takut. Aku tidak bermaksud menyerangmu." Keduanya bermuara ke L004 yang sama (diuji: jumlah baris sama).
2. **Ekspresi `REMORSE` (C04)** dipakai baris kanon dan DRAFT (pengakuan). `ExpressionId` di `dialogue/types.ts` belum memuatnya; saya memakai cast terpusat di `chapter4.ts` (`'REMORSE' as string as ExpressionId`).
3. `C4-02-L006` kanon memakai `C02 ANGRY`, ekspresi yang tidak ada pada set portrait Velthia (NEUTRAL, STERN, AMUSED, WORRIED, SURPRISED, VULNERABLE). Teks kanon tidak diubah.

## Hal yang perlu review manusia
- Seluruh 162 baris DRAFT_IMPL dan 7 banner (bukan naskah approved).
- Keputusan DRAFT bahwa SATU penjaga gugur dan arsip bawah terkubur (konsekuensi tambahan; tidak ada di kanon).
- Pengakuan Varlgrim bahwa ia yang memisahkan ingatan (diturunkan dari `LORE_BIBLE`, belum ada baris JSON).
- Nada Torvan (humor jangan membuat reveal ringan), dan apakah "tiga ember" (callback `C3_NPC_TORVAN_HELPING`) sudah cukup halus.
- Konsistensi dengan flag `story.c4_old_memory` (ingatan hanya Aveloria): Ruang Gema hanya menampilkan peta dan keping logam, tanpa foto/nama modern.

## Permintaan ke lead
1. Tambahkan `'REMORSE'` ke `ExpressionId` di `web/src/game/dialogue/types.ts` (dan, bila perlu, ekspresi lain C04: `SUSPICIOUS`), lalu hapus cast `REMORSE` di `chapter4.ts`. Tes saya tidak bergantung pada itu.
2. Pastikan agen BA menurunkan `portraits_hd/C04_{ANGRY,STERN,REMORSE,DETERMINED,NEUTRAL,SAD,SURPRISED,SUSPICIOUS}.png` dan `C02_ANGRY.png` (dipakai kanon C4-02-L006). Tes memeriksa keberadaan file C04 otomatis begitu ada satu berkas `C04_*` di `portraits_hd`; sampai itu ada, pemeriksaan C04 dan `C02_ANGRY` dilewati. `PORTRAIT_EXPRESSIONS` (`data/assetPaths.ts`) belum memuat C04; tes memakai set lokal.
3. `C4_BATTLE_CALLOUTS`: untuk banner `phase2/phase3` pembicara C04 (ekspresi STERN/DETERMINED), `meteor_call` C02 STERN, `meteor_hold` C04 STERN, `meteor_survived` C01 DETERMINED, `aegis_taught` C02 NEUTRAL, `defeat_hint` C02 WORRIED. Portrait C04 tidak boleh dipakai sebelum agen BA menyelesaikannya (jika belum ada, banner tanpa portrait).
4. Urutan flag yang diasumsikan: `C4_ARCHIVE_VELTHIA` -> `aegisLearned`; `C4_HEART_OPEN` -> `heartOpen`; `C4_TOWER_FALL` setelah `HEART_OPEN`; `C4_MEMORY_A/B` bebas urutan, `C4_OLD_MEMORY` setelah keduanya; `C4_VARLGRIM_TRUTH` -> `varlgrimTruth` -> `varlgrimStays`; `C4_TORVAN_REVEAL` -> `C4_TORVAN_LEAVES` -> `C4_AFTER_TORVAN` -> `creatorReveal`. Jika `C4_AFTER_TORVAN` ingin diputar sebelum Torvan pergi, urutan skrip ini perlu ditukar; isi tidak bergantung pada urutan kecuali kata "anak itu" (Torvan sudah pergi).
