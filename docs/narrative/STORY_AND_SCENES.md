# STORY AND SCENES — 40 BEAT CANONICAL v2.0

> 40 scene lama + **3 beat modern terpisah**. Revisi kronologi approved: setelah Chapter IV, modern interlude, lalu epilog flashback tebing. Semua scene adalah **working direction**, naskah dialog tetap draft sampai review.

## Pola alur yang wajib dijaga

Chapter I (9) → Chapter II (9) → Chapter III (7) → Chapter IV (7) → Interlude Modern (3) → Epilog (5). Setiap pergantian chapter harus punya checkpoint dan state yang aman di-load ulang. Perjalanan fisik bersifat linear.


## CHAPTER I — The Nameless Wanderer

### C1-01 — Yaric bangun
- **Kejadian & blocking:** Hutan 1, pagi yang tampak normal; kamera diam sesaat sebelum pemain menggerakkan Yaric. Tunjukkan lupa lewat tindakan mencari nama, bukan monolog panik.
- **Yang dimainkan:** Pemain menggerakkan Yaric, memeriksa pohon/tas kosong, mencoba arah jalan.
- **Nada/performance:** Bingung namun cukup sadar untuk bercanda pada diri sendiri.
- **Aturan kanon:** Jangan munculkan nama Yudis ataupun artefak modern.
- **Flag selesai:** `story.c1_awake`; harus idempotent, aman replay/save/load.

### C1-02 — Nambo di jalan
- **Kejadian & blocking:** Nambo menemukannya dekat jalur yang tidak biasa; ia membantu tanpa tahu identitas Yaric.
- **Yang dimainkan:** Dialog pilihan respons singkat, lalu Nambo menunjukkan jalan.
- **Nada/performance:** Nambo ramah pragmatis, tidak terdengar seperti penyihir pemberi takdir.
- **Aturan kanon:** Nambo tidak mengetahui rahasia The Fate.
- **Flag selesai:** `story.c1_nambo`; harus idempotent, aman replay/save/load.

### C1-03 — Jalur hutan berulang
- **Kejadian & blocking:** Pohon yang sama terlihat lagi meskipun Yaric berjalan lurus; lonceng jauh mungkin terdengar salah waktu.
- **Yang dimainkan:** Pemain kembali pada penanda yang sama, lalu memilih jalur lain dengan petunjuk.
- **Nada/performance:** Keanehan pelan dan terbaca; tidak perlu visual glitch neon.
- **Aturan kanon:** Gejala ini akibat segel, belum diketahui pemain.
- **Flag selesai:** `story.c1_loop`; harus idempotent, aman replay/save/load.

### C1-04 — Hollowling pertama
- **Kejadian & blocking:** Bayangan kecil menghalangi jalan; tutorial murni turn-based dengan pilihan jelas.
- **Yang dimainkan:** Battle Attack/Skill/Item/Defend/Run (tutorial Run boleh dibatasi secara wajar).
- **Nada/performance:** Ancaman kecil, bukan jumpscare berlebihan.
- **Aturan kanon:** Jangan mendefinisikan Hollow sebagai iblis.
- **Flag selesai:** `battle.first_hollowling`; harus idempotent, aman replay/save/load.

### C1-05 — Mournfang
- **Kejadian & blocking:** Binatang besar terdorong keluar dari hutan karena gangguan; boss Chapter I.
- **Yang dimainkan:** Pertarungan singkat dengan strategi defensif dan telegraph.
- **Nada/performance:** Kasihan bercampur tegang; tidak menyatakan binatang jahat.
- **Aturan kanon:** Kemenangannya tidak menyembuhkan hutan.
- **Flag selesai:** `boss.mournfang`; harus idempotent, aman replay/save/load.

### C1-06 — Gerbang Aveloria
- **Kejadian & blocking:** Kerajaan terlihat megah tapi dihuni orang biasa. Talric memeriksa Yaric saat penjagaan diperketat.
- **Yang dimainkan:** Dialog Talric, satu pemeriksaan/izin masuk.
- **Nada/performance:** Talric waspada karena laporan aneh, bukan membenci Yaric.
- **Aturan kanon:** Tidak mengenalkan hubungan romantis sebagai takdir pasti.
- **Flag selesai:** `story.c1_gate`; harus idempotent, aman replay/save/load.

### C1-07 — Arsip Azie
- **Kejadian & blocking:** Azie membandingkan laporan warga dengan nama The Fate dan memandang Yaric curiga.
- **Yang dimainkan:** Interaksi arsip, satu dokumen pendek dan pertanyaan.
- **Nada/performance:** Rasa dicurigai; hindari lore dump multi-halaman.
- **Aturan kanon:** Azie hanya punya arsip tidak lengkap.
- **Flag selesai:** `story.c1_archive`; harus idempotent, aman replay/save/load.

### C1-08 — Pertemuan Velthia
- **Kejadian & blocking:** Ruang istana sederhana; Velthia memilih mendengar Yaric sendiri. Ada chemistry lewat salah ucap, respons singkat, dan satu candaan.
- **Yang dimainkan:** Dialog dengan respon pemain; Velthia memerintahkan penyelidikan.
- **Nada/performance:** Mulai resmi, kemudian hangat dan sedikit mengusik.
- **Aturan kanon:** Jangan cinta mendadak, jangan memori lengkap.
- **Flag selesai:** `story.c1_velthia`; harus idempotent, aman replay/save/load.

### C1-09 — Lonceng dua kali
- **Kejadian & blocking:** Bunyi bel berdentang dua kali pada jam sama; semua orang mendengar dan bingung. Kamera mengarah ke jam lalu kembali ke wajah tokoh.
- **Yang dimainkan:** Cutscene pendek → akhir Chapter I.
- **Nada/performance:** Ada rasa familiar yang tidak nyaman.
- **Aturan kanon:** Gejala tidak dijelaskan oleh narator mahatahu.
- **Flag selesai:** `chapter.1_complete`; harus idempotent, aman replay/save/load.

## CHAPTER II — Whispers of Fate

### C2-01 — Misi ke Liora
- **Kejadian & blocking:** Azie melacak sumber catatan lama sampai Desa Liora, bukan memilih Yaric jadi penyelamat ajaib.
- **Yang dimainkan:** Terima quest utama dan lihat tanda rute baru.
- **Nada/performance:** Percakapan efisien; Yaric ingin jawaban.
- **Aturan kanon:** Tujuan quest harus bisa dijelaskan pemain.
- **Flag selesai:** `story.c2_depart`; harus idempotent, aman replay/save/load.

### C2-02 — Berpisah dengan Velthia sementara
- **Kejadian & blocking:** Velthia memberi instruksi praktis dan sedikit ledekan tentang Yaric mudah tersesat.
- **Yang dimainkan:** Dialog singkat di gerbang istana.
- **Nada/performance:** Perhatian diekspresikan sebagai tindakan, bukan pengakuan cinta.
- **Aturan kanon:** Velthia tetap mengurus kerajaan.
- **Flag selesai:** `story.c2_farewell`; harus idempotent, aman replay/save/load.

### C2-03 — Zira dan dua cerita
- **Kejadian & blocking:** Liora punya cerita The Fate yang berbeda dari dokumen istana. Zira tahu cerita rakyat, bukan seluruh jawaban.
- **Yang dimainkan:** Bicara, baca catatan; dapat petunjuk ke hutan kedua.
- **Nada/performance:** Nyaman seperti mendengar kisah kampung, bukan pidato suci.
- **Aturan kanon:** Jangan ungkap nama Yudis.
- **Flag selesai:** `story.c2_zira`; harus idempotent, aman replay/save/load.

### C2-04 — Hutan kedua
- **Kejadian & blocking:** Hutan 2 memiliki rute sederhana dan monster berbeda; detail lingkungan menunjuk aktivitas penduduk.
- **Yang dimainkan:** Eksplorasi, shortcut, satu side quest opsional.
- **Nada/performance:** Ada kelegaan sebelum misteri lebih jauh.
- **Aturan kanon:** Area linear, tidak open world.
- **Flag selesai:** `story.c2_forest`; harus idempotent, aman replay/save/load.

### C2-05 — Torvan muncul
- **Kejadian & blocking:** Bocah menyebalkan menyarankan jalan pintas lalu menyangkal bahwa ia tahu segalanya.
- **Yang dimainkan:** Percakapan berbalas, torvan ikut party.
- **Nada/performance:** Lucu karena kepribadian, bukan meme modern.
- **Aturan kanon:** Petunjuk ilahi maksimal halus, tidak pakai halo.
- **Flag selesai:** `party.torvan_joined`; harus idempotent, aman replay/save/load.

### C2-06 — Duo bertarung
- **Kejadian & blocking:** Yaric dan Torvan belajar saling melengkapi; Torvan mage/support.
- **Yang dimainkan:** Pertarungan tutorial dua karakter melawan enemy biasa.
- **Nada/performance:** Yaric ragu mempercayai bocah yang terlalu pede.
- **Aturan kanon:** Party maksimum 2.
- **Flag selesai:** `battle.duo_tutorial`; harus idempotent, aman replay/save/load.

### C2-07 — Veyrath
- **Kejadian & blocking:** Ksatria terlantar menyimpan catatan penjaga dan bekas segel.
- **Yang dimainkan:** Boss side-view + hadiah catatan.
- **Nada/performance:** Tragis, tidak perlu pidato panjang dari boss.
- **Aturan kanon:** Nama Varlgrim muncul sebagai petunjuk, bukan spoiler lengkap.
- **Flag selesai:** `boss.veyrath`; harus idempotent, aman replay/save/load.

### C2-08 — Ramalan dicoret
- **Kejadian & blocking:** Catatan Veyrath punya bagian ramalan terhapus dan lambang artefak tertentu.
- **Yang dimainkan:** Periksa 2 fragmen, simpan ke quest log.
- **Nada/performance:** Pemain merasa menemukan bukti sendiri.
- **Aturan kanon:** Belum tahu siapa pencipta dunia.
- **Flag selesai:** `story.c2_fragments`; harus idempotent, aman replay/save/load.

### C2-09 — Kembali ke Velthia
- **Kejadian & blocking:** Yaric menyerahkan temuan. Obrolan setelah tugas tentang selera makanan/kebiasaan membuat jarak mereka menyempit.
- **Yang dimainkan:** Dialog di istana dan cutscene menuju Chapter III.
- **Nada/performance:** Hangat namun tidak berlebihan.
- **Aturan kanon:** Pilihan mencintai terjadi sekarang, bukan karena perintah ramalan.
- **Flag selesai:** `chapter.2_complete`; harus idempotent, aman replay/save/load.

## CHAPTER III — The Forgotten Promise

### C3-01 — Krisis Aveloria dan keputusan Velthia
- **Kejadian & blocking:** Gerbang istana terkunci pada jam berbeda, warga mengulang kegiatan. Azie mendesak menahan Yaric; Velthia menolak, memerintahkan Talric evakuasi. Bangsawan meragukannya.
- **Yang dimainkan:** Scene istana, keputusan ratu diperlihatkan melalui NPC/action.
- **Nada/performance:** Tegang secara politik: Velthia memimpin, bukan ikut hanya demi Yaric.
- **Aturan kanon:** Evakuasi harus menjadi penyebab warga selamat pada IV.
- **Flag selesai:** `story.c3_evacuate`; harus idempotent, aman replay/save/load.

### C3-02 — Party berganti
- **Kejadian & blocking:** Velthia ikut ke kuil karena pusakanya cocok dengan lambang. Torvan tinggal membantu penduduk; party jadi Yaric+Velthia.
- **Yang dimainkan:** Ganti anggota tanpa menghilangkan EXP atau equipment Torvan.
- **Nada/performance:** Keputusan jelas dan masuk akal, bukan membuang Torvan.
- **Aturan kanon:** Maks 2 active, Torvan tidak mati/menghilang dulu.
- **Flag selesai:** `party.velthia_active`; harus idempotent, aman replay/save/load.

### C3-03 — Perjalanan dan perkemahan
- **Kejadian & blocking:** Di perjalanan Yaric kesal dicurigai, Velthia khawatir keselamatan rakyat; mereka berdebat lalu mencari titik temu.
- **Yang dimainkan:** Dialog perkemahan singkat, pemain bisa memeriksa api.
- **Nada/performance:** Kerentanan tidak harus jadi rayuan; mereka boleh salah.
- **Aturan kanon:** Jangan janji cinta eksplisit sebelum info cukup.
- **Flag selesai:** `story.c3_camp`; harus idempotent, aman replay/save/load.

### C3-04 — Puzzle lambang
- **Kejadian & blocking:** Kuil punya simbol yang cocok pada pusaka ratu dan catatan Veyrath.
- **Yang dimainkan:** Pecahkan puzzle 2–3 objek, checkpoint.
- **Nada/performance:** Rasa memecahkan misteri, tidak perlu puzzle sulit tak masuk akal.
- **Aturan kanon:** Lambang sama pada peninggalan modern kelak.
- **Flag selesai:** `puzzle.temple`; harus idempotent, aman replay/save/load.

### C3-05 — Chronolith
- **Kejadian & blocking:** Penjaga kuil menguji kesiapan dua orang untuk melepas segel.
- **Yang dimainkan:** Boss side-view dengan kemampuan healing Velthia.
- **Nada/performance:** Pertarungan fair, gunakan pengetahuan yang dipelajari.
- **Aturan kanon:** Bukan boss yang membeberkan seluruh twist.
- **Flag selesai:** `boss.chronolith`; harus idempotent, aman replay/save/load.

### C3-06 — Ramalan utuh & titik segel
- **Kejadian & blocking:** Naskah utuh menjelaskan masa depan hanya kemungkinan; titik kerusakan berimpit dengan lokasi segel Varlgrim.
- **Yang dimainkan:** Dua bukti bisa dibandingkan dari jurnal quest.
- **Nada/performance:** Pemain diberi kesempatan menyimpulkan.
- **Aturan kanon:** Sebab keretakan sudah cukup jelas sebelum final boss.
- **Flag selesai:** `story.c3_evidence`; harus idempotent, aman replay/save/load.

### C3-07 — Janji terpotong
- **Kejadian & blocking:** Velthia mengingat pecahan janji dengan Yaric. Berakhir pada pilihan masuk benteng, bukan romansa lengkap.
- **Yang dimainkan:** Cutscene singkat lalu chapter transition.
- **Nada/performance:** Lembut, takut, tetapi saling percaya.
- **Aturan kanon:** Belum ada kenangan modern di bab ini.
- **Flag selesai:** `chapter.3_complete`; harus idempotent, aman replay/save/load.

## CHAPTER IV — The Fate

### C4-01 — Benteng yang tersendat
- **Kejadian & blocking:** Di benteng, retakan nyata dan Riftborn muncul, memengaruhi lingkungan.
- **Yang dimainkan:** Dungeon linear, shortcut, save point sebelum boss.
- **Nada/performance:** Tegang dengan rasa urgen, tidak menghabiskan banyak waktu grind.
- **Aturan kanon:** Talric/Azie tetap di Aveloria mengurusi evakuasi.
- **Flag selesai:** `story.c4_entered`; harus idempotent, aman replay/save/load.

### C4-02 — Varlgrim membela tindakannya
- **Kejadian & blocking:** Ia menunjukkan menara runtuh, warga lari, lonceng berhenti. Velthia memperlihatkan semua pola kerusakan justru terjadi di titik segel.
- **Yang dimainkan:** Dialog interaktif pendek dengan satu pilihan respons tanpa cabang lore.
- **Nada/performance:** Varlgrim takut mengulang kehilangan, bukan mengamuk.
- **Aturan kanon:** Tidak mengaku sengaja ingin kerajaan hancur.
- **Flag selesai:** `story.c4_confront`; harus idempotent, aman replay/save/load.

### C4-03 — Final boss Varlgrim
- **Kejadian & blocking:** Varlgrim menolak mencabut segel dan mempertahankan keyakinannya.
- **Yang dimainkan:** Boss final tak terlalu grindy, menggunakan resource party.
- **Nada/performance:** Benturan sudut pandang yang berujung tindakan.
- **Aturan kanon:** Tak boleh tiba-tiba jadi monster iblis generik.
- **Flag selesai:** `boss.varlgrim`; harus idempotent, aman replay/save/load.

### C4-04 — Heart dibuka bersama
- **Kejadian & blocking:** Yaric–Velthia membuka Heart setelah Varlgrim dikalahkan. Retakan berhenti berkembang, tetapi menara tua tetap runtuh; warga selamat berkat evakuasi.
- **Yang dimainkan:** Interaksi dua titik segel/objek oleh dua tokoh; cutscene konsekuensi.
- **Nada/performance:** Kemenangan tidak menghapus harga yang dibayar.
- **Aturan kanon:** Heart bukan deus-ex-machina yang menghidupkan orang atau membalik waktu.
- **Flag selesai:** `story.c4_heart_open`; harus idempotent, aman replay/save/load.

### C4-05 — Ingatan lama Yaric–Velthia
- **Kejadian & blocking:** Heart mengembalikan ingatan kuno: dua tokoh pernah memilih satu sama lain dan membuat janji. **Hanya memori Aveloria**.
- **Yang dimainkan:** Ruang gema singkat, periksa 2 objek kuno; bukan foto modern.
- **Nada/performance:** Sunyi, lega, sedikit takut bahwa ingatan bisa hilang lagi.
- **Aturan kanon:** Tidak menampilkan Yudis, pasangan modern, tanggal, atau foto masa depan.
- **Flag selesai:** `story.c4_old_memory`; harus idempotent, aman replay/save/load.

### C4-06 — Kesalahan Varlgrim dan jati diri Torvan
- **Kejadian & blocking:** Varlgrim melihat kilasan lengkap: segelnya penyebab musibah. Ia mengakui salah, menahan sisa retakan. Torvan mengaku pencipta lalu pergi.
- **Yang dimainkan:** Dialog dua bagian dengan jeda.
- **Nada/performance:** Tidak ada pengampunan instan, Torvan tidak merapikan semua masalah.
- **Aturan kanon:** Nasib final Varlgrim dibuka, Torvan tidak mengatur cinta.
- **Flag selesai:** `story.c4_creator_reveal`; harus idempotent, aman replay/save/load.

### C4-07 — Aveloria selamat dengan luka
- **Kejadian & blocking:** Talric memberi kabar warga selamat namun bangunan rusak. Velthia tetap bertugas sebagai ratu; Yaric memilih tinggal bersamanya.
- **Yang dimainkan:** Dialog pendek tanpa pilihan ending bercabang; chapter flag.
- **Nada/performance:** Kemenangan terasa earned, bukan pesta tanpa konsekuensi.
- **Aturan kanon:** Modern masih belum terjadi.
- **Flag selesai:** `chapter.4_complete`; harus idempotent, aman replay/save/load.

## INTERLUDE — Berabad-abad kemudian

### M-01 — Kencan jauh setelah Aveloria
- **Kejadian & blocking:** **BERABAD-ABAD KEMUDIAN.** Yudis dan pasangan modern berjalan dalam konteks kencan. Benda dengan lambang Aveloria ditemukan.
- **Yang dimainkan:** Prolog modern singkat, interaksi ambil benda.
- **Nada/performance:** Biasa dan hangat, tidak langsung drama takdir.
- **Aturan kanon:** Masa modern tidak menyebabkan masa lalu.
- **Flag selesai:** `modern.artifact_found`; harus idempotent, aman replay/save/load.

### M-02 — Gema dua kehidupan
- **Kejadian & blocking:** Sentuhan peninggalan memunculkan fragmen Aveloria yang sudah kita mainkan. Dua orang memahami bahwa mereka reinkarnasi Yaric–Velthia.
- **Yang dimainkan:** Interaksi gema singkat, puzzle pengenalan lambang dan kebiasaan.
- **Nada/performance:** Kaget namun intim; jangan pidato panjang.
- **Aturan kanon:** Tidak balik ke masa lalu secara fisik.
- **Flag selesai:** `modern.reincarnation_understood`; harus idempotent, aman replay/save/load.

### M-03 — Galeri kenangan personal
- **Kejadian & blocking:** Pemain dapat memeriksa MEMORY_01..04 (foto/benda/momen asli). Fallback publik menyajikan fragmen fiksi nonprivat.
- **Yang dimainkan:** Benda interaktif, teks singkat; lanjut setelah setiap memori.
- **Nada/performance:** Tawa kecil, rasa dikenal; bukan slideshow 10 menit.
- **Aturan kanon:** AI dilarang mengarang pengalaman nyata; rahasiakan asset personal saat deploy.
- **Flag selesai:** `modern.memories_done`; harus idempotent, aman replay/save/load.

## EPILOG — Beyond Time

### E-01 — Tebing masa Aveloria
- **Kejadian & blocking:** Epilog kembali ke satu kenangan Yaric–Velthia **setelah Aveloria selamat**. Kamera diam, dua tokoh duduk.
- **Yang dimainkan:** Scene pendek dengan satu tombol lanjut.
- **Nada/performance:** Damai setelah bahaya.
- **Aturan kanon:** Ini flashback, bukan perjalanan modern kembali ke Aveloria.
- **Flag selesai:** `ending.cliff`; harus idempotent, aman replay/save/load.

### E-02 — Percakapan tentang lupa
- **Kejadian & blocking:** Velthia bertanya kalau mereka lupa lagi. Yaric bilang akan berusaha mengenalnya kembali meski mungkin tersesat. Velthia menyindir dia buruk membaca arah.
- **Yang dimainkan:** Dialog sederhana dengan jeda natural.
- **Nada/performance:** Humor yang kita kenal dari Chapter I membayar emosi.
- **Aturan kanon:** Jangan bahasa terlalu puitis.
- **Flag selesai:** `ending.dialog`; harus idempotent, aman replay/save/load.

### E-03 — Awan kenangan
- **Kejadian & blocking:** Awan berganti siluet pelan. Gambar modern, jika ditampilkan, **untuk penonton** sebagai montase, bukan terlihat oleh tokoh Aveloria.
- **Yang dimainkan:** Visual 2–3 beat, bisa skip tanpa kehilangan flags.
- **Nada/performance:** Hening dan personal.
- **Aturan kanon:** Konten privat jangan masuk build publik.
- **Flag selesai:** `ending.sky`; harus idempotent, aman replay/save/load.

### E-04 — To Be Continued
- **Kejadian & blocking:** Jeda hening lalu teks penutup tampil sederhana.
- **Yang dimainkan:** Enter untuk lanjut atau auto aman setelah minimum baca.
- **Nada/performance:** Hangat dan terbuka, bukan menggantung karena lore bolong.
- **Aturan kanon:** Tidak menulis The End.
- **Flag selesai:** `ending.title`; harus idempotent, aman replay/save/load.

### E-05 — Credits dan P.S.
- **Kejadian & blocking:** Kredit kontributor nyata; setelah itu P.S. anniversary pertama ditandatangani Yudis di versi private.
- **Yang dimainkan:** Credit keyboard accessible, kembali title setelah selesai.
- **Nada/performance:** Hadiah personal terungkap **di akhir sekali**.
- **Aturan kanon:** Jangan mengarang pesan pribadi atau memberi kredit palsu.
- **Flag selesai:** `ending.credits`; harus idempotent, aman replay/save/load.

## Gate dramaturgi
- Semua 40 beat memiliki awal/akhir, sumber informasi, alasan karakter bertindak, dan flag unik.
- Setelah C3-01 dan C4-04 status warga harus mencerminkan evakuasi; korbannya tidak hilang ajaib.
- M-01 hanya aktif setelah `chapter.4_complete`; E-01 sesudah `modern.memories_done`.
- Galeri memori pribadi kosong/fallback hingga aset asli diberi izin.
- Tidak boleh menyelipkan masa modern ke C4-05.
