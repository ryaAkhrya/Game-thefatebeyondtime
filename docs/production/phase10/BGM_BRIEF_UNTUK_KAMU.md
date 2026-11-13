# Brief BGM untuk kamu — The Fate: Beyond Time

Dokumen ini menjelaskan lagu yang perlu kamu buat. **Belum ada musik yang dibuat, dipilih, diunduh, atau dimasukkan ke game.** Semua 13 cue di `MUSIC_REGISTRY.json` tetap `AWAITING_COMPOSER`; game tetap bisa dimainkan tanpa BGM.

## Arah musik keseluruhan

Bikin soundtrack JRPG 16-bit yang hangat, sederhana, dan punya hubungan antarlagu. Melodi harus enak didengar berulang sambil membaca dialog. Pilih suara yang terasa satu keluarga: piano/keys lembut, flute/woodwind pendek, pluck, string sederhana, bass yang terbaca, dan perkusi seperlunya. Kamu boleh memakai instrumen modern dengan artikulasi sederhana; tidak wajib meniru keterbatasan konsol lama secara teknis.

Sediakan ruang kosong. Adegan tenang cukup 2–4 lapisan utama; battle boleh lebih padat, tetapi serangan, pilihan menu, dan dialog harus tetap terdengar jelas. Hindari choir besar, drum trailer, dentuman sub-bass terus-menerus, lonceng jam di semua lagu, serta crescendo romantis setiap kali Yaric dan Velthia berbicara. Tidak perlu vokal atau lirik.

**Usulan pengikat:** buat motif orisinal pendek, sekitar 3–5 nada, yang awalnya terasa sedikit menggantung. Kamu yang menentukan not dan harmoninya. Motif itu boleh muncul terputus di Title/Hutan, lebih hangat di Aveloria, tertahan di pertarungan Varlgrim, lalu mendapat jawaban yang sederhana di epilog. Ini arahan komposisi, bukan melodi yang sudah diklaim dibuat olehmu.

## Lagu yang perlu dibuat

Tempo dan durasi di bawah adalah kisaran kerja yang mengikuti registry, bukan kewajiban mengejar angka secara kaku. Satu loop adalah satu putaran sebelum mengulang.

### 01 — `BGM_TITLE.ogg`

**Bikin lagu undangan yang sunyi dan penasaran.** Pemain belum tahu seluruh ceritanya. Mulai dengan 1 suara keys/pluck, sisipkan motif pendek yang belum selesai, lalu masuk pad/string tipis. Jangan membuka dengan ledakan heroik atau langsung terdengar seperti lagu pernikahan.

- Tempo: 76–92 BPM. Loop: 45–70 detik.
- Bentuk: 8 bar pembuka sederhana → jawaban 8 bar → variasi kecil → kembali mulus.
- Jangan menaruh akhir besar; pemain bisa diam di menu cukup lama.

### 02 — `BGM_FOREST_01.ogg`

**Bikin lagu untuk berjalan di tempat asing yang masih nyaman dijelajahi.** Ada rasa penasaran dan sedikit canggung. Pakai pluck/pizzicato sebagai langkah ringan, woodwind pendek sebagai pertanyaan, bass jarang, dan string rendah yang tidak mengancam terus-menerus.

- Tempo: 82–100 BPM. Loop: 60–90 detik.
- Buat 2 bagian dengan motif sama, tetapi bagian kedua terasa seperti kembali ke tempat yang pernah dilalui.
- Perubahan kecil boleh mengisyaratkan pengulangan jalan; hindari efek glitch/digital atau horor jumpscare.

### 03 — `BGM_AVELORIA_DAY.ogg`

**Bikin lagu kota yang dihuni orang, bukan fanfare istana.** Bayangkan penjaga berganti tugas, pedagang bekerja, dan percakapan kecil. Woodwind/pluck dengan pulse lembut, bass hangat, serta perkusi ringan sudah cukup.

- Tempo: 88–106 BPM. Loop: 60–90 detik.
- Melodi boleh lebih utuh daripada Hutan 1. Sisakan beberapa bar yang tenang untuk dialog.
- Wibawa Aveloria muncul dari ketenangan dan susunan harmoni, bukan brass keras atau kemegahan tanpa henti.

### 04 — `BGM_BATTLE.ogg`

**Bikin lagu battle yang membuat pemain siap memilih aksi.** Ritme tegas, bass jelas, motif singkat yang mudah diingat. Chip percussion/tom pendek, string ostinato, dan lead yang tidak terlalu nyaring.

- Tempo: 124–146 BPM. Loop: 50–75 detik.
- Masuk cukup cepat, tetapi jangan bergantung pada intro panjang yang baru menarik setelah 30 detik.
- Game ini turn-based: jangan menyusun hit musik yang harus tepat mengikuti animasi serangan. Pemain bisa lama berpikir.

### 05 — `BGM_BOSS.ogg`

**Bikin tekanan yang lebih berat daripada battle biasa, tetapi tetap terbaca.** Gunakan motif battle yang dipadatkan, low strings, pulse yang lebih jarang, dan perkusi terkendali. Dipakai bersama oleh Mournfang, Veyrath, dan Chronolith sebelum ada kebutuhan cue terpisah.

- Tempo: 116–140 BPM. Loop: 65–100 detik.
- Sediakan satu bagian lebih renggang agar pemain tidak lelah saat retry.
- Jangan mengunci cue pada timing telegraph; giliran dan durasi bertarung tidak tetap.

### 06 — `BGM_LIORA.ogg`

**Bikin kehangatan desa yang sederhana dan punya sejarah.** Flute/woodwind, petikan lembut, bass akustik/synth pendek, ritme yang terasa dikerjakan manusia. Ada keramahan tanpa menjadikan warga karikatur desa miskin.

- Tempo: 72–92 BPM. Loop: 60–90 detik.
- Gunakan sedikit nada dan frase yang diberi napas. Hindari banjo komedi atau musik pesta terus-menerus.
- Boleh mengambil fragmen motif Aveloria dengan warna lebih bersahaja.

### 07 — `BGM_FOREST_02.ogg`

**Bikin perjalanan yang awalnya ringan, lalu menyimpan keganjilan kecil.** Pizzicato/pluck dan woodwind bisa saling menjawab. Torvan terasa seperti bocah yang wajar; musik tidak boleh membocorkan twist lewat choir suci, bunyi kosmik, atau aura dewa.

- Tempo: 90–110 BPM. Loop: 60–90 detik.
- Satu suara pengiring boleh terlambat/berhenti sejenak sebagai warna komposisi, tanpa efek digital atau ketukan yang mengganggu pemain.
- Pertahankan karakter petualangan Hutan 1, tetapi dengan arah harmonis yang sedikit berbeda.

### 08 — `BGM_CRISIS.ogg`

**Bikin urgensi yang fokus, bukan panik tanpa arah.** Warga harus dievakuasi dan keputusan harus dibuat. Ostinato rendah, string pendek, satu bunyi metal/bell redup, serta ruang kosong di melodi.

- Tempo: 94–120 BPM. Loop: 55–80 detik.
- Motif Aveloria boleh terasa tidak lengkap, seolah rutinitas kota terganggu.
- Cue ini juga dipakai sebagai dasar suasana Benteng Penjaga. Jangan menjadikannya musik pengejaran yang melelahkan sepanjang eksplorasi.

### 09 — `BGM_TEMPLE.ogg`

**Bikin rasa tua, sunyi, dan ada mekanisme yang belum dipahami.** Hollow mallet, pluck rendah, pad/string pendek, serta pulse yang jarang. Teka-teki perlu ruang berpikir.

- Tempo: 76–98 BPM. Loop: 60–90 detik.
- Buat perkembangan timbre kecil; jangan menambah lapisan terus sampai menjadi megah.
- Hindari choir agama besar dan bunyi jam literal di setiap ketukan. Sisakan keheningan di antara frase.

### 10 — `BGM_FINAL_BOSS.ogg`

**Bikin pertarungan melawan keyakinan tragis Varlgrim.** Dia merasa sedang melindungi dunia. Musik harus mengandung tekad, beban, dan bahaya; bukan lagu “raja iblis” dengan choir jahat. Low strings, bass, pulse pendek, dan perkusi terukur menjadi fondasi.

- Tempo: 100–128 BPM. Loop: 80–110 detik.
- Bentuk yang disarankan: tekad tenang → tekanan bertambah → bagian renggang → kembali. Boleh mengutip motif utama dengan jawaban yang tertahan.
- Meteor memiliki telegraph gameplay. Jangan membuat ledakan musik pada detik tertentu yang dianggap selalu bersamaan dengan meteor. Catat jika kamu mengirim stem tambahan untuk perubahan fase; dukungan stem adaptif perlu integrasi tersendiri.
- Setelah pertarungan, ruang hening boleh lebih kuat daripada fanfare kemenangan.

### 11 — `BGM_MODERN.ogg`

**Bikin kedekatan sehari-hari yang biasa.** Ini masa modern berabad-abad kemudian, bukan dunia futuristis atau portal waktu. Keys/piano sederhana, sedikit petikan, bass ringan. Kurangi timbre kerajaan agar pergantian masa terasa alami.

- Tempo: 70–94 BPM. Loop: 50–75 detik.
- Awalnya santai. Saat lambang artefak diperiksa, musik harus tetap nyaman jika pemain berhenti lama membaca.
- Pada ingatan arsip/pusaka/Heart, sisipkan interval kecil dari motif utama dengan lembut. Jangan memakai riser sci-fi atau sting kejutan.
- Jangan memakai lagu, tanggal, atau referensi hubungan nyata yang belum kamu tentukan sendiri.

### 12 — `BGM_EPILOGUE.ogg`

**Bikin rasa lega yang lelah, hangat, dan sedikit malu-malu.** Yaric dan Velthia duduk melihat kerajaan yang selamat tetapi masih rusak. Ada humor kecil tentang tersesat dan janji untuk menemukan satu sama lain. Musik memberi tempat untuk kalimat mereka.

- Tempo: 68–86 BPM. Panjang: 70–100 detik.
- Keys/petikan sebagai dasar, string/woodwind tipis sebagai jawaban. Motif yang dahulu menggantung boleh mendapat penyelesaian sederhana di sini.
- Jangan langsung memuncak. Buka ruang menjelang awan/siluet dan **To Be Continued**; dua suara bisa lebih tepat daripada orkestra penuh.
- Dialog menunggu pemain, sehingga versi utama sebaiknya tetap bisa di-loop mulus. Outro terpisah boleh disertakan sebagai pilihan yang perlu integrasi.

### 13 — `BGM_CREDITS.ogg`

**Bikin penutup yang ringan dan meninggalkan ruang untuk mengingat.** Reprise tema utama dengan sedikit variasi, tanpa medley yang terlalu ramai. Keys, petikan, dan satu suara hangat cukup.

- Tempo: 70–92 BPM. Panjang: 60–100 detik.
- Kredit bisa dipercepat atau dilewati. Akhir file tidak boleh menjadi satu-satunya tempat lagu terdengar selesai.
- Revisi 14 November memakai tiga halaman kredit otomatis, sekitar 9 detik per halaman (sekitar 27 detik total). Buat pembukaan 8–12 detik sudah terasa utuh; jangan menunggu satu menit untuk memperdengarkan motif utamanya. Durasi file tetap bisa lebih panjang untuk kebutuhan pengembangan kredit berikutnya.
- Untuk pesan anniversary privat, default-nya hening. Jika kamu ingin musik tetap berbunyi, tentukan sendiri setelah membaca pesan asli; jangan otomatis membuat lagu romantis baru atau menebak durasinya.

## Urutan pengerjaan yang disarankan

Mulai dengan **Title, Hutan 1, Battle, Modern, Epilog, Credits**. Enam lagu ini mengunci bahasa musik dari awal sampai akhir. Setelah kamu cocok dengan motif dan warna instrumennya, lanjutkan Aveloria/Liora/Hutan 2, lalu Crisis/Temple/Boss/Final Boss. Urutan ini usulan produksi; prioritas registry tetap dipertahankan sampai ada keputusan baru.

Kirim satu putaran pendek terlebih dahulu untuk mengecek warna musik bersama adegan. Setelah itu baru rapikan loop dan master. Tidak perlu membuat semua 13 lagu sekaligus sebelum satu pun dicoba di game.

## Yang perlu kamu kirim untuk setiap lagu

1. Master **WAV stereo 48 kHz, 24-bit**; jika DAW-mu sudah memakai 44,1 kHz/16-bit, catat formatnya supaya tidak terjadi konversi berulang.
2. Ekspor game **OGG Vorbis stereo** dengan nama persis seperti judul cue di atas. File loop utama harus sudah dipotong agar pengulangan seluruh file terdengar mulus.
3. Catatan BPM, birama, tonalitas jika relevan, durasi, dan apakah loop sudah diuji dengan mendengar dua putaran berturut-turut.
4. Kalau ada intro/outro yang hanya boleh berbunyi sekali, kirim sebagai file **terpisah** dan tulis maksudnya. Engine sekarang mengulang seluruh file cue; metadata loop range atau intro adaptif belum otomatis dijalankan.
5. Stem opsional: melodi, harmoni, bass, perkusi/pad. Ini membantu revisi mixing; bukan janji semua stem sudah diputar dinamis oleh game.
6. Nama kredit yang kamu inginkan, versi/revisi file, serta konfirmasi bahwa komposisi/sampelnya boleh dipakai dalam proyek ini. Jangan menamai komposer lain tanpa dasar.

Sisakan headroom dan hindari limiter yang terlalu keras. Sebagai titik awal mixing, target sekitar **−18 sampai −16 LUFS** dan puncak di bawah **−1 dBTP**; sesuaikan setelah didengar bersama SFX. Ini target produksi yang disarankan, bukan hasil pengukuran file yang sudah ada. Tidak perlu mengejar volume streaming komersial.

## Cek sendiri sebelum mengirim

- Dengarkan dengan volume rendah: melodi dan bass masih terbaca tanpa menusuk?
- Putar loop dua kali: tidak ada klik, jeda kosong tak sengaja, atau reverb yang terpotong?
- Baca dialog sambil mendengar: apakah musik mengambil terlalu banyak perhatian?
- Bayangkan pemain diam 3–5 menit di map atau retry boss: apakah aransemennya melelahkan?
- Coba fade keluar dari titik acak: lagu masih terasa bisa ditinggalkan dengan wajar?

**Penyerahan file belum otomatis mengaktifkan cue.** Setelah kamu memberikan file dan izin pemakaian, lakukan review adegan, mixing Master/BGM/SFX/mute, lalu perbarui registry, allowlist publik, dan pengujian browser. Materi atau lagu privat tidak boleh otomatis masuk build publik.
