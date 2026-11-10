# SCENE DIRECTION BIBLE — 40 BEAT v2.0

Dokumen ini untuk **direksi adegan**, bukan izin membuat lore baru. Di setiap beat, kamera dan sound harus mengabdi pada perilaku karakter; tidak ada particle/glow gratuitous. Dialog formalitas kerajaan secukupnya; semua bahasa Indonesia.

## Konvensi sinematik

- Kamera tile-based top-down dan sisi statis saat battle; pan/push pelan hanya saat menyampaikan informasi. Hindari shake permanen.
- Pause sebelum dialog penting sekitar 0,4–1,0 detik sebagai *rekomendasi awal*, bukan skrip yang kaku.
- Input dikunci hanya ketika perlu; Escape di cutscene membuka pause/skip yang aman.
- Musik mengikuti MUSIC_REGISTRY.json; semua file AWAITING_COMPOSER, silent fallback tanpa error.
- Frame/visual pixel tetap konsisten; aset baru DRAFT sampai diuji pada ukuran game.


## CHAPTER I — The Nameless Wanderer


Aturan global: beri ruang kendali sebelum event berikutnya, jangan paksa auto-advance semua baris. Di tiap scene pilih satu gerak kamera yang menjelaskan tindakan, bukan efek dekoratif. Ekspresi per baris ada dalam DIALOGUE_EVENTS.json.

### C1-01 — Yaric bangun

**Tujuan.** Bingung namun cukup sadar untuk bercanda pada diri sendiri.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Hutan 1, pagi yang tampak normal; kamera diam sesaat sebelum pemain menggerakkan Yaric. Tunjukkan lupa lewat tindakan mencari nama, bukan monolog panik. Akhiri beat setelah interaksi berikut terselesaikan: Pemain menggerakkan Yaric, memeriksa pohon/tas kosong, mencoba arah jalan.

**Audio.** `BGM_FOREST_01.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Jangan munculkan nama Yudis ataupun artefak modern. Simpan flag `story.c1_awake` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C1-02 — Nambo di jalan

**Tujuan.** Nambo ramah pragmatis, tidak terdengar seperti penyihir pemberi takdir.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Nambo menemukannya dekat jalur yang tidak biasa; ia membantu tanpa tahu identitas Yaric. Akhiri beat setelah interaksi berikut terselesaikan: Dialog pilihan respons singkat, lalu Nambo menunjukkan jalan.

**Audio.** `BGM_FOREST_01.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Nambo tidak mengetahui rahasia The Fate. Simpan flag `story.c1_nambo` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C1-03 — Jalur hutan berulang

**Tujuan.** Keanehan pelan dan terbaca; tidak perlu visual glitch neon.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Pohon yang sama terlihat lagi meskipun Yaric berjalan lurus; lonceng jauh mungkin terdengar salah waktu. Akhiri beat setelah interaksi berikut terselesaikan: Pemain kembali pada penanda yang sama, lalu memilih jalur lain dengan petunjuk.

**Audio.** `BGM_FOREST_01.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Gejala ini akibat segel, belum diketahui pemain. Simpan flag `story.c1_loop` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C1-04 — Hollowling pertama

**Tujuan.** Ancaman kecil, bukan jumpscare berlebihan.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Bayangan kecil menghalangi jalan; tutorial murni turn-based dengan pilihan jelas. Akhiri beat setelah interaksi berikut terselesaikan: Battle Attack/Skill/Item/Defend/Run (tutorial Run boleh dibatasi secara wajar).

**Audio.** `BGM_FOREST_01.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Jangan mendefinisikan Hollow sebagai iblis. Simpan flag `battle.first_hollowling` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C1-05 — Mournfang

**Tujuan.** Kasihan bercampur tegang; tidak menyatakan binatang jahat.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Binatang besar terdorong keluar dari hutan karena gangguan; boss Chapter I. Akhiri beat setelah interaksi berikut terselesaikan: Pertarungan singkat dengan strategi defensif dan telegraph.

**Audio.** `BGM_BOSS.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Kemenangannya tidak menyembuhkan hutan. Simpan flag `boss.mournfang` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C1-06 — Gerbang Aveloria

**Tujuan.** Talric waspada karena laporan aneh, bukan membenci Yaric.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Kerajaan terlihat megah tapi dihuni orang biasa. Talric memeriksa Yaric saat penjagaan diperketat. Akhiri beat setelah interaksi berikut terselesaikan: Dialog Talric, satu pemeriksaan/izin masuk.

**Audio.** `BGM_AVELORIA_DAY.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Tidak mengenalkan hubungan romantis sebagai takdir pasti. Simpan flag `story.c1_gate` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C1-07 — Arsip Azie

**Tujuan.** Rasa dicurigai; hindari lore dump multi-halaman.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Azie membandingkan laporan warga dengan nama The Fate dan memandang Yaric curiga. Akhiri beat setelah interaksi berikut terselesaikan: Interaksi arsip, satu dokumen pendek dan pertanyaan.

**Audio.** `BGM_AVELORIA_DAY.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Azie hanya punya arsip tidak lengkap. Simpan flag `story.c1_archive` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C1-08 — Pertemuan Velthia

**Tujuan.** Mulai resmi, kemudian hangat dan sedikit mengusik.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Ruang istana sederhana; Velthia memilih mendengar Yaric sendiri. Ada chemistry lewat salah ucap, respons singkat, dan satu candaan. Akhiri beat setelah interaksi berikut terselesaikan: Dialog dengan respon pemain; Velthia memerintahkan penyelidikan.

**Audio.** `BGM_AVELORIA_DAY.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Jangan cinta mendadak, jangan memori lengkap. Simpan flag `story.c1_velthia` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C1-09 — Lonceng dua kali

**Tujuan.** Ada rasa familiar yang tidak nyaman.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Bunyi bel berdentang dua kali pada jam sama; semua orang mendengar dan bingung. Kamera mengarah ke jam lalu kembali ke wajah tokoh. Akhiri beat setelah interaksi berikut terselesaikan: Cutscene pendek → akhir Chapter I.

**Audio.** `BGM_AVELORIA_DAY.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Gejala tidak dijelaskan oleh narator mahatahu. Simpan flag `chapter.1_complete` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C2-01 — Misi ke Liora

**Tujuan.** Percakapan efisien; Yaric ingin jawaban.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Azie melacak sumber catatan lama sampai Desa Liora, bukan memilih Yaric jadi penyelamat ajaib. Akhiri beat setelah interaksi berikut terselesaikan: Terima quest utama dan lihat tanda rute baru.

**Audio.** `BGM_LIORA.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Tujuan quest harus bisa dijelaskan pemain. Simpan flag `story.c2_depart` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C2-02 — Berpisah dengan Velthia sementara

**Tujuan.** Perhatian diekspresikan sebagai tindakan, bukan pengakuan cinta.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Velthia memberi instruksi praktis dan sedikit ledekan tentang Yaric mudah tersesat. Akhiri beat setelah interaksi berikut terselesaikan: Dialog singkat di gerbang istana.

**Audio.** `BGM_FOREST_02.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Velthia tetap mengurus kerajaan. Simpan flag `story.c2_farewell` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C2-03 — Zira dan dua cerita

**Tujuan.** Nyaman seperti mendengar kisah kampung, bukan pidato suci.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Liora punya cerita The Fate yang berbeda dari dokumen istana. Zira tahu cerita rakyat, bukan seluruh jawaban. Akhiri beat setelah interaksi berikut terselesaikan: Bicara, baca catatan; dapat petunjuk ke hutan kedua.

**Audio.** `BGM_LIORA.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Jangan ungkap nama Yudis. Simpan flag `story.c2_zira` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C2-04 — Hutan kedua

**Tujuan.** Ada kelegaan sebelum misteri lebih jauh.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Hutan 2 memiliki rute sederhana dan monster berbeda; detail lingkungan menunjuk aktivitas penduduk. Akhiri beat setelah interaksi berikut terselesaikan: Eksplorasi, shortcut, satu side quest opsional.

**Audio.** `BGM_FOREST_02.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Area linear, tidak open world. Simpan flag `story.c2_forest` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C2-05 — Torvan muncul

**Tujuan.** Lucu karena kepribadian, bukan meme modern.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Bocah menyebalkan menyarankan jalan pintas lalu menyangkal bahwa ia tahu segalanya. Akhiri beat setelah interaksi berikut terselesaikan: Percakapan berbalas, torvan ikut party.

**Audio.** `BGM_FOREST_02.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Petunjuk ilahi maksimal halus, tidak pakai halo. Simpan flag `party.torvan_joined` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C2-06 — Duo bertarung

**Tujuan.** Yaric ragu mempercayai bocah yang terlalu pede.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Yaric dan Torvan belajar saling melengkapi; Torvan mage/support. Akhiri beat setelah interaksi berikut terselesaikan: Pertarungan tutorial dua karakter melawan enemy biasa.

**Audio.** `BGM_FOREST_02.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Party maksimum 2. Simpan flag `battle.duo_tutorial` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C2-07 — Veyrath

**Tujuan.** Tragis, tidak perlu pidato panjang dari boss.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Ksatria terlantar menyimpan catatan penjaga dan bekas segel. Akhiri beat setelah interaksi berikut terselesaikan: Boss side-view + hadiah catatan.

**Audio.** `BGM_BOSS.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Nama Varlgrim muncul sebagai petunjuk, bukan spoiler lengkap. Simpan flag `boss.veyrath` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C2-08 — Ramalan dicoret

**Tujuan.** Pemain merasa menemukan bukti sendiri.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Catatan Veyrath punya bagian ramalan terhapus dan lambang artefak tertentu. Akhiri beat setelah interaksi berikut terselesaikan: Periksa 2 fragmen, simpan ke quest log.

**Audio.** `BGM_FOREST_02.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Belum tahu siapa pencipta dunia. Simpan flag `story.c2_fragments` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C2-09 — Kembali ke Velthia

**Tujuan.** Hangat namun tidak berlebihan.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Yaric menyerahkan temuan. Obrolan setelah tugas tentang selera makanan/kebiasaan membuat jarak mereka menyempit. Akhiri beat setelah interaksi berikut terselesaikan: Dialog di istana dan cutscene menuju Chapter III.

**Audio.** `BGM_FOREST_02.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Pilihan mencintai terjadi sekarang, bukan karena perintah ramalan. Simpan flag `chapter.2_complete` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C3-01 — Krisis Aveloria dan keputusan Velthia

**Tujuan.** Tegang secara politik: Velthia memimpin, bukan ikut hanya demi Yaric.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Gerbang istana terkunci pada jam berbeda, warga mengulang kegiatan. Azie mendesak menahan Yaric; Velthia menolak, memerintahkan Talric evakuasi. Bangsawan meragukannya. Akhiri beat setelah interaksi berikut terselesaikan: Scene istana, keputusan ratu diperlihatkan melalui NPC/action.

**Audio.** `BGM_CRISIS.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Evakuasi harus menjadi penyebab warga selamat pada IV. Simpan flag `story.c3_evacuate` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C3-02 — Party berganti

**Tujuan.** Keputusan jelas dan masuk akal, bukan membuang Torvan.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Velthia ikut ke kuil karena pusakanya cocok dengan lambang. Torvan tinggal membantu penduduk; party jadi Yaric+Velthia. Akhiri beat setelah interaksi berikut terselesaikan: Ganti anggota tanpa menghilangkan EXP atau equipment Torvan.

**Audio.** `BGM_CRISIS.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Maks 2 active, Torvan tidak mati/menghilang dulu. Simpan flag `party.velthia_active` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C3-03 — Perjalanan dan perkemahan

**Tujuan.** Kerentanan tidak harus jadi rayuan; mereka boleh salah.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Di perjalanan Yaric kesal dicurigai, Velthia khawatir keselamatan rakyat; mereka berdebat lalu mencari titik temu. Akhiri beat setelah interaksi berikut terselesaikan: Dialog perkemahan singkat, pemain bisa memeriksa api.

**Audio.** `BGM_CRISIS.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Jangan janji cinta eksplisit sebelum info cukup. Simpan flag `story.c3_camp` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C3-04 — Puzzle lambang

**Tujuan.** Rasa memecahkan misteri, tidak perlu puzzle sulit tak masuk akal.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Kuil punya simbol yang cocok pada pusaka ratu dan catatan Veyrath. Akhiri beat setelah interaksi berikut terselesaikan: Pecahkan puzzle 2–3 objek, checkpoint.

**Audio.** `BGM_TEMPLE.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Lambang sama pada peninggalan modern kelak. Simpan flag `puzzle.temple` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C3-05 — Chronolith

**Tujuan.** Pertarungan fair, gunakan pengetahuan yang dipelajari.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Penjaga kuil menguji kesiapan dua orang untuk melepas segel. Akhiri beat setelah interaksi berikut terselesaikan: Boss side-view dengan kemampuan healing Velthia.

**Audio.** `BGM_BOSS.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Bukan boss yang membeberkan seluruh twist. Simpan flag `boss.chronolith` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C3-06 — Ramalan utuh & titik segel

**Tujuan.** Pemain diberi kesempatan menyimpulkan.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Naskah utuh menjelaskan masa depan hanya kemungkinan; titik kerusakan berimpit dengan lokasi segel Varlgrim. Akhiri beat setelah interaksi berikut terselesaikan: Dua bukti bisa dibandingkan dari jurnal quest.

**Audio.** `BGM_TEMPLE.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Sebab keretakan sudah cukup jelas sebelum final boss. Simpan flag `story.c3_evidence` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C3-07 — Janji terpotong

**Tujuan.** Lembut, takut, tetapi saling percaya.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Velthia mengingat pecahan janji dengan Yaric. Berakhir pada pilihan masuk benteng, bukan romansa lengkap. Akhiri beat setelah interaksi berikut terselesaikan: Cutscene singkat lalu chapter transition.

**Audio.** `BGM_TEMPLE.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Belum ada kenangan modern di bab ini. Simpan flag `chapter.3_complete` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C4-01 — Benteng yang tersendat

**Tujuan.** Tegang dengan rasa urgen, tidak menghabiskan banyak waktu grind.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Di benteng, retakan nyata dan Riftborn muncul, memengaruhi lingkungan. Akhiri beat setelah interaksi berikut terselesaikan: Dungeon linear, shortcut, save point sebelum boss.

**Audio.** `BGM_CRISIS.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Talric/Azie tetap di Aveloria mengurusi evakuasi. Simpan flag `story.c4_entered` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C4-02 — Varlgrim membela tindakannya

**Tujuan.** Varlgrim takut mengulang kehilangan, bukan mengamuk.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Ia menunjukkan menara runtuh, warga lari, lonceng berhenti. Velthia memperlihatkan semua pola kerusakan justru terjadi di titik segel. Akhiri beat setelah interaksi berikut terselesaikan: Dialog interaktif pendek dengan satu pilihan respons tanpa cabang lore.

**Audio.** `BGM_FINAL_BOSS.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Tidak mengaku sengaja ingin kerajaan hancur. Simpan flag `story.c4_confront` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C4-03 — Final boss Varlgrim

**Tujuan.** Benturan sudut pandang yang berujung tindakan.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Varlgrim menolak mencabut segel dan mempertahankan keyakinannya. Akhiri beat setelah interaksi berikut terselesaikan: Boss final tak terlalu grindy, menggunakan resource party.

**Audio.** `BGM_FINAL_BOSS.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Tak boleh tiba-tiba jadi monster iblis generik. Simpan flag `boss.varlgrim` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C4-04 — Heart dibuka bersama

**Tujuan.** Kemenangan tidak menghapus harga yang dibayar.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Yaric–Velthia membuka Heart setelah Varlgrim dikalahkan. Retakan berhenti berkembang, tetapi menara tua tetap runtuh; warga selamat berkat evakuasi. Akhiri beat setelah interaksi berikut terselesaikan: Interaksi dua titik segel/objek oleh dua tokoh; cutscene konsekuensi.

**Audio.** `SILENCE` — diam yang disengaja. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Heart bukan deus-ex-machina yang menghidupkan orang atau membalik waktu. Simpan flag `story.c4_heart_open` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C4-05 — Ingatan lama Yaric–Velthia

**Tujuan.** Sunyi, lega, sedikit takut bahwa ingatan bisa hilang lagi.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Heart mengembalikan ingatan kuno: dua tokoh pernah memilih satu sama lain dan membuat janji. **Hanya memori Aveloria**. Akhiri beat setelah interaksi berikut terselesaikan: Ruang gema singkat, periksa 2 objek kuno; bukan foto modern.

**Audio.** `BGM_CRISIS.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Tidak menampilkan Yudis, pasangan modern, tanggal, atau foto masa depan. Simpan flag `story.c4_old_memory` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C4-06 — Kesalahan Varlgrim dan jati diri Torvan

**Tujuan.** Tidak ada pengampunan instan, Torvan tidak merapikan semua masalah.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Varlgrim melihat kilasan lengkap: segelnya penyebab musibah. Ia mengakui salah, menahan sisa retakan. Torvan mengaku pencipta lalu pergi. Akhiri beat setelah interaksi berikut terselesaikan: Dialog dua bagian dengan jeda.

**Audio.** `BGM_CRISIS.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Nasib final Varlgrim dibuka, Torvan tidak mengatur cinta. Simpan flag `story.c4_creator_reveal` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### C4-07 — Aveloria selamat dengan luka

**Tujuan.** Kemenangan terasa earned, bukan pesta tanpa konsekuensi.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Talric memberi kabar warga selamat namun bangunan rusak. Velthia tetap bertugas sebagai ratu; Yaric memilih tinggal bersamanya. Akhiri beat setelah interaksi berikut terselesaikan: Dialog pendek tanpa pilihan ending bercabang; chapter flag.

**Audio.** `BGM_CRISIS.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Modern masih belum terjadi. Simpan flag `chapter.4_complete` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### M-01 — Kencan jauh setelah Aveloria

**Tujuan.** Biasa dan hangat, tidak langsung drama takdir.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: **BERABAD-ABAD KEMUDIAN.** Yudis dan pasangan modern berjalan dalam konteks kencan. Benda dengan lambang Aveloria ditemukan. Akhiri beat setelah interaksi berikut terselesaikan: Prolog modern singkat, interaksi ambil benda.

**Audio.** `BGM_MODERN.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Masa modern tidak menyebabkan masa lalu. Simpan flag `modern.artifact_found` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### M-02 — Gema dua kehidupan

**Tujuan.** Kaget namun intim; jangan pidato panjang.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Sentuhan peninggalan memunculkan fragmen Aveloria yang sudah kita mainkan. Dua orang memahami bahwa mereka reinkarnasi Yaric–Velthia. Akhiri beat setelah interaksi berikut terselesaikan: Interaksi gema singkat, puzzle pengenalan lambang dan kebiasaan.

**Audio.** `BGM_MODERN.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Tidak balik ke masa lalu secara fisik. Simpan flag `modern.reincarnation_understood` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### M-03 — Galeri kenangan personal

**Tujuan.** Tawa kecil, rasa dikenal; bukan slideshow 10 menit.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Pemain dapat memeriksa MEMORY_01..04 (foto/benda/momen asli). Fallback publik menyajikan fragmen fiksi nonprivat. Akhiri beat setelah interaksi berikut terselesaikan: Benda interaktif, teks singkat; lanjut setelah setiap memori.

**Audio.** `BGM_MODERN.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** AI dilarang mengarang pengalaman nyata; rahasiakan asset personal saat deploy. Simpan flag `modern.memories_done` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### E-01 — Tebing masa Aveloria

**Tujuan.** Damai setelah bahaya.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Epilog kembali ke satu kenangan Yaric–Velthia **setelah Aveloria selamat**. Kamera diam, dua tokoh duduk. Akhiri beat setelah interaksi berikut terselesaikan: Scene pendek dengan satu tombol lanjut.

**Audio.** `BGM_EPILOGUE.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Ini flashback, bukan perjalanan modern kembali ke Aveloria. Simpan flag `ending.cliff` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### E-02 — Percakapan tentang lupa

**Tujuan.** Humor yang kita kenal dari Chapter I membayar emosi.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Velthia bertanya kalau mereka lupa lagi. Yaric bilang akan berusaha mengenalnya kembali meski mungkin tersesat. Velthia menyindir dia buruk membaca arah. Akhiri beat setelah interaksi berikut terselesaikan: Dialog sederhana dengan jeda natural.

**Audio.** `BGM_EPILOGUE.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Jangan bahasa terlalu puitis. Simpan flag `ending.dialog` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### E-03 — Awan kenangan

**Tujuan.** Hening dan personal.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Awan berganti siluet pelan. Gambar modern, jika ditampilkan, **untuk penonton** sebagai montase, bukan terlihat oleh tokoh Aveloria. Akhiri beat setelah interaksi berikut terselesaikan: Visual 2–3 beat, bisa skip tanpa kehilangan flags.

**Audio.** `BGM_EPILOGUE.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Konten privat jangan masuk build publik. Simpan flag `ending.sky` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### E-04 — To Be Continued

**Tujuan.** Hangat dan terbuka, bukan menggantung karena lore bolong.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Jeda hening lalu teks penutup tampil sederhana. Akhiri beat setelah interaksi berikut terselesaikan: Enter untuk lanjut atau auto aman setelah minimum baca.

**Audio.** `BGM_EPILOGUE.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Tidak menulis The End. Simpan flag `ending.title` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

### E-05 — Credits dan P.S.

**Tujuan.** Hadiah personal terungkap **di akhir sekali**.

**Blocking dan kamera DRAFT.** Buka pada aksi berikut: Kredit kontributor nyata; setelah itu P.S. anniversary pertama ditandatangani Yudis di versi private. Akhiri beat setelah interaksi berikut terselesaikan: Credit keyboard accessible, kembali title setelah selesai.

**Audio.** `BGM_CREDITS.ogg` — AWAITING_COMPOSER; fallback SILENCE. Masuk pada awal beat setelah user gesture; hentikan/fade pada perpindahan area atau encounter. SFX hanya bila aksi di atas memerlukannya.

**Kanon dan implementasi.** Jangan mengarang pesan pribadi atau memberi kredit palsu. Simpan flag `ending.credits` hanya ketika hasil scene benar-benar committed. Skip atau reload harus memberikan outcome yang sama tanpa reward ganda.

