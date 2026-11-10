# RULES.md — THE FATE: BEYOND TIME

**Status: WAJIB / berlaku untuk seluruh output Claude, Claude Code, AI visual, dan kontributor manusia.**

Dokumen ini bukan panduan dekorasi. Ini aturan kualitas yang menentukan apakah hasil boleh masuk game. **Game harus terasa seperti karya manusia dengan selera, pengamatan, dan alasan artistik.** AI hanyalah alat produksi. Kode yang jalan tetapi hasil visual, pengalaman pemain, atau dialognya generik belum dianggap selesai.

## 0. Kontrak kreatif yang tidak boleh dilanggar

1. Visual utama **Classic 16-Bit JRPG**; eksplorasi top-down, battle classic side-view. Jangan beralih ke HD-2D, 3D, anime glossy modern, atau komposisi UI dashboard web.
2. Dialog dan teks game **100% berbahasa Indonesia** untuk versi awal. Nama diri, judul game, nama benda khusus dan istilah teknis developer boleh tetap sebagaimana didefinisikan.
3. Bahasa Indonesia **natural, ringan, dan tidak kaku**, tetapi masuk akal untuk dunia kerajaan fantasi. Hindari bahasa baku berlebihan **maupun** slang/meme masa kini yang merusak dunia.
4. Jangan menciptakan foto, tanggal, kenangan pasangan, ucapan personal, atau musik yang diklaim ciptaan user. Gunakan placeholder jelas.
5. Seluruh karakter harus punya wajah, siluet, gesture, pilihan kata, dan motivasi berbeda. Jangan jadikan karakter hanya variasi kosmetik dari satu template.
6. Tidak ada glow, bloom, gradasi, partikel, ornamen atau efek dramatis tanpa fungsi naratif/gameplay.
7. Ketidaksempurnaan yang masuk akal adalah bagian dari karakter dunia: barang sedikit usang, susunan objek realistis, jeda percakapan, reaksi tidak selalu sempurna. Ini **bukan** izin membuat aset teknis berantakan.
8. Jangan mengorbankan keterbacaan, konsistensi ukuran piksel, atau navigasi hanya demi tampilan cantik.
9. **Tidak ada keputusan desain besar yang boleh diambil diam-diam**. Jika spesifikasi belum memutuskan, pakai nilai sementara yang dicatat `ASSUMPTION`, lalu minta review pada batas phase. Jangan mempresentasikan asumsi sebagai fakta GDD.
10. `RULES.md` adalah gerbang kualitas. Output yang melanggar harus direvisi, walaupun seluruh unit test kodenya lolos.

## 1. Definisi “AI slop” untuk proyek ini

Sebuah hasil dianggap *slop* ketika tampak seperti mengisi pola umum fantasi/RPG tanpa memahami adegan, fungsi, karakter, atau keterbatasan medium. Tanda-tandanya:

- Semua area memakai palet ungu-biru atau emas yang sama, semuanya bercahaya, setiap sudut penuh detail yang tidak menyampaikan informasi.
- Semua karakter rupawan, simetris, berpakaian seperti figur promosi, dengan pose serupa dan tanpa atribut keseharian.
- Setiap menu berupa panel berlapis, border ornamental, ikon terlalu besar, latar bertekstur, efek blur dan transisi berlebihan.
- Semua hutan adalah wallpaper fantasi generik; tidak ada jalur logis, tanda pernah dilewati orang, akses barang, atau perubahan keadaan.
- Semua dialog terdengar seperti puisi: menyebut takdir, waktu, jiwa, semesta dalam percakapan sederhana.
- Karakter saling menjelaskan apa yang sudah mereka ketahui, demi mengajari penonton.
- NPC membacakan tutorial sebagai robot; tidak ada sebab yang masuk akal mereka memberi informasi.
- Banyak fitur terasa ramai tetapi keputusan pemain, aksi, dan konsekuensinya dangkal.

**Tes sederhana:** bila nama tokoh dan tempat bisa diganti dengan nama fantasi acak tanpa mengubah adegan, hasil kemungkinan terlalu generik. Revisi sampai adegan spesifik hanya masuk akal untuk The Fate.

## 2. Hirarki keputusan desain

Prioritas ketika bekerja:

1. Keterbacaan dan fungsi pemain (apakah paham apa yang terjadi?).
2. Konsistensi dunia dan karakter.
3. Kejelasan emosi cerita.
4. Keindahan komposisi dan craftsmanship.
5. Efek/polish tambahan.

Tidak boleh membalik urutan itu. Desain yang "wah" tetapi membingungkan atau memutus emosi harus ditolak.

## 3. Art direction — disiplin Classic 16-Bit

### 3.1 Pixel craft

- Tentukan grid kerja, ukuran tile, resolusi internal dan skala display **bersama** saat phase aset. Sebelum diputuskan, dokumentasikan kandidat dan tandai sebagai `TBD`; jangan pakai ukuran campuran antar-sprite secara asal.
- Pertahankan ukuran piksel konsisten antar karakter, objek, lingkungan, efek, dan UI sprite. Scaling harus integer jika memungkinkan agar piksel tetap tajam.
- Hindari auto-smoothing, blur, sub-pixel jitter, serta piksel yang berantakan akibat gambar resolusi tinggi diperkecil.
- Pilih bentuk besar/siluet terlebih dulu, baru detail. Pixel art bukan ilustrasi HD yang dipixelate.
- Batasi jumlah highlight/shadow secara konsisten. Jangan memakai kilau spesular di tiap material.
- Cahaya harus datang dari arah yang dapat dijelaskan; tidak semua objek punya rim light.
- Sprite 4 arah harus konsisten proporsi kepala, tubuh, senjata, ukuran bounding box dan titik kaki.
- Frame animasi harus menjaga volume karakter, bukan berubah ukuran dan bentuk tiap frame.

### 3.2 Palet dan mood

- Tetapkan palet induk terkontrol untuk seluruh game; setiap area punya subpalet dengan hubungan jelas, bukan estetika terpisah.
- Aveloria: terasa dihuni, berwibawa, punya kehidupan sehari-hari. Bukan istana emas menyala tanpa henti.
- Liora: sederhana, hangat, tidak dibuat miskin secara karikatural.
- Hutan pertama: misteri ringan dan rasa asing; tetap nyaman dibaca.
- Hutan kedua: jejak waktu makin terasa. Perbedaan terlihat lewat susunan ruang, objek, atmosfer, bukan sekadar mengganti hue.
- Dungeon: fokus ancaman, arah jalan, dan narasi ruang. Sisakan area tenang untuk fokus.
- Ruang kenangan dan epilog: boleh lebih puitis, tapi efek spesial **dipakai hemat** agar menjadi momen yang betul-betul istimewa.
- Simpan warna paling menonjol untuk penunjuk penting: interaksi, keadaan bahaya, atau penekanan dramatis. Jangan ratakan saturasi maksimum di mana-mana.

### 3.3 Dunia yang benar-benar terasa hidup

Pada tiap map wajib ada jawaban konkret untuk: siapa memakai tempat ini, untuk apa, dari mana orang datang, mengapa benda berada di situ, dan apa yang berubah akibat gangguan waktu? Contoh:

- Kios Derrria punya barang sering disentuh, stok tersusun berbeda, dan tanda perjalanan.
- Markas Talric punya jalur penjaga, titik pengawasan, dan peralatan praktis.
- Tempat warga memiliki sirkulasi jelas; pintu tidak berujung di tembok; pagar tidak menghalangi satu-satunya jalan tanpa alasan.
- Hutan mempunyai jalur, perubahan kontur, dan landmark visual yang membantu orientasi pemain.

Aset dekoratif yang tidak menambah konteks, arah, gameplay, atau atmosfer boleh dibuang.

## 4. Desain karakter — bukan template fantasi

Untuk **setiap** karakter bernama, buat dahulu lembar keputusan singkat sebelum menghasilkan sprite:

- Peran cerita dan peran saat ini.
- Umur visual/proporsi/kehadiran layar secara naratif (jangan mengunci detail yang belum disahkan).
- Siluet paling mudah dikenali pada ukuran game yang sesungguhnya.
- Dua ciri pakaian atau atribut yang didukung pekerjaan/kehidupannya.
- Satu ciri ketidaksempurnaan yang masuk akal, bukan random "scar for edginess".
- Postur idle, cara berjalan, dan gesture dalam dialog.
- Palet yang berbeda tetapi tetap satu keluarga visual.
- Hubungan dengan lingkungan atau benda pribadi yang punya fungsi.

**Kekhasan yang wajib dijaga:**

- **Yaric**: pengembara yang tidak langsung tampak seperti "chosen hero" dengan armor spektakuler. Proporsinya praktis untuk top-down; ekspresi bisa bingung, penasaran, dan sedikit canggung.
- **Velthia**: seorang ratu yang berwibawa tanpa harus memakai mahkota raksasa atau gaun ceremonial di setiap adegan. Di momen privat gesturnya boleh lebih santai.
- **Torvan**: harus tampak sebagai bocah yang wajar dengan keanehan kecil yang baru bermakna setelah twist. **Jangan** beri sayap, halo, mata kosmik, efek dewa, atau simbol yang membocorkan rahasianya.
- **Varlgrim**: sosok yang percaya tindakannya melindungi dunia; hindari desain "evil dark lord" satu dimensi hanya dengan tanduk, tengkorak, atau aura ungu.
- **Azie, Talric, Zira, Nambo, Derrria**: tampil sesuai fungsi dan kebiasaan nyata masing-masing, bukan NPC hasil pertukaran pakaian.

**Review pada ukuran nyata:** setiap karakter harus bisa dibedakan pada scene gameplay, bukan cuma pada concept art besar. Jika tertukar ketika dikecilkan, desain ulang siluet/palet.

## 5. Desain monster dan boss

- Monster harus terbaca dalam 1–2 detik: bagian berbahaya, arah hadap, siluet, ukuran, dan jenis serangan.
- Sesuaikan monster dengan ekologinya; Hollowling bukan sekadar blob bertanduk, Briaroot harus terasa sebagai tumbuhan, Gravorn sebagai batu berat, Riftborn sebagai gangguan waktu.
- Telegraphed attack sederhana dan jelas; pemain punya kesempatan memahami damage dan status.
- Boss wajib punya identitas, bukan hanya versi monster biasa yang diperbesar dan dikasih glow.
- Kontrol intensitas efek agar hit feedback tetap terlihat dan teks damage tidak tenggelam.
- Varlgrim bukan monster anonim; transisi dari dialog ke battle harus mempertahankan motivasi karakter.
- Animasi idle boleh sederhana; 3 frame bermakna lebih baik daripada 15 frame penuh kilau tanpa kejelasan.

## 6. UI/UX — fungsional, tenang, bukan "dashboard AI"

### 6.1 Prinsip antarmuka

- Rujukan bahasa visual: menu JRPG konsol klasik. Ringkas, terbaca, nyaman dengan keyboard.
- Fokus visual berurutan: pilihan aktif → informasi penting → dekorasi. Bukan semuanya sama-sama tebal.
- Satu gaya border, radius (jika ada), padding dan tipografi yang konsisten. Tidak perlu badge warna-warni atau gradient tiap menu.
- Jangan pakai glassmorphism, panel transparan blur, neon, glow menyeluruh, atau efek 3D glossy sebagai gaya dasar.
- Jika menambahkan ornamen, ornamen harus terkait dunia game dan tidak mengganggu navigasi.
- Hindari *microanimation* yang membuat menu lamban. Respons tombol harus cepat.
- Gunakan ruang kosong secara sengaja. Jangan penuhi panel karena takut terlihat simpel.
- Ketersediaan pilihan aksi selalu terbaca: tidak boleh membingungkan mana yang dapat dipilih, mana nonaktif, dan mana sedang difokus.

### 6.2 Persyaratan fungsional

- Semua menu inti dapat diakses tanpa mouse: arah, konfirmasi, batal, dan kembali.
- Fokus keyboard terlihat jelas pada semua resolusi target. Tidak ada *focus trap*.
- Teks punya kontras cukup di scene gelap maupun terang, dan tidak tersamarkan oleh overlay.
- Jangan mengandalkan warna saja untuk membedakan status Poison/Stun/buff; tambah label/simbol yang konsisten.
- Saat battle, HP/MP, giliran, target, dan aksi aktif harus mudah dipahami tanpa penjelasan panjang.
- Dialogue box harus mendukung nama speaker, pemecahan teks nyaman, jeda, lanjut, dan penanda selesai.
- Buat opsi kecepatan teks/disable typewriter bila kelak implementasi memungkinkan; jangan memaksa animasi lambat.
- Save/load harus memberi informasi slot dan konfirmasi tindakan berisiko; jangan menyamarkan *Continue* bila save belum ada.
- Placeholder UI boleh fungsional tetapi tidak boleh dipasarkan sebagai "art final".

### 6.3 Anti-pola

**Dilarang sebagai default:** menu hitam-emas berlapis tanpa alasan, panel kaca, efek bintang di setiap button, ikon berlebihan, font dekoratif sulit dibaca, card-layout ala website SaaS, splash screen spektakuler untuk setiap aksi kecil.

## 7. Dialog Indonesia — natural tapi tetap fantasi kerajaan

### 7.1 Tujuan dialog

Dialog harus mengungkap karakter lewat pilihan kata, keraguan, guyonan, dan reaksi. Karakter **tidak** bertugas menerangkan tema besar game dalam tiap percakapan. Relasi Yaric–Velthia dibangun lewat kejadian kecil sejak Chapter I.

### 7.2 Register bahasa

- Bahasa utama: Indonesia luwes. **Aku/kau/kamu**, **tidak**, **belum**, **sepertinya**, **masa**, **oh**, **ya**, **eh** dipakai sesuai konteks karakter.
- Ragam formal untuk sidang istana, pengumuman, upacara, atau laporan penjaga. Ragam santai untuk jalan bersama, pasar, kemah, dan hubungan dekat.
- **"Yang Mulia"** atau bentuk hormat hadir saat situasi menuntut; bukan tiap baris, bukan untuk semua tokoh.
- Kata serapan modern boleh kalau netral, tetapi jangan sampai membuat latar terasa seperti chat tahun 2026.
- Hindari slang anak internet: "bro", "anjir", "gas", "cringe", "red flag", "literally", "bucin", "nge-prank", serta meme viral, kecuali user secara eksplisit menulis dialog meta untuk konteks modern.
- Tidak boleh bersajak tanpa alasan. **"Wahai", "takdir mempertemukan", "semesta berbisik", "jiwaku bergetar", "melampaui ruang dan waktu"** merupakan red flag jika muncul sebagai kalimat default.
- Hindari **"kan", "sih", "nggak"** secara massal dalam semua tokoh. Ini alat ritme dialog, bukan satu-satunya cara agar terdengar manusiawi.
- Jangan terjemahkan mentah dialog Inggris ke Indonesia yang janggal.

### 7.3 Tiap orang punya suara

- **Yaric:** spontan, bertanya balik, gugup kadang menutupi dengan humor. Jangan selalu pintar berpidato.
- **Velthia:** tegas di depan umum, cermat dan punya humor kering saat pribadi. Jangan selalu putri lembut/pasif.
- **Torvan:** bocah yang suka menghindari jawaban dan memberi komentar lucu, kadang tahu terlalu banyak; bukan mesin teka-teki filosofis.
- **Varlgrim:** kalimat hemat, pertimbangan serius dan kesalahan moral yang nyata; bukan penjahat yang menjerit ancaman abstrak.
- **Azie:** berorientasi data, catatan, dan tanggung jawab administratif; bisa ragu bila bukti tidak cukup.
- **Talric:** tegas, ringkas, mengutamakan keamanan; rasa hormat perlu diperoleh.
- **Zira:** punya pengalaman dan versi kisah yang berbeda; tidak menjawab semua misteri sekaligus.
- **Nambo:** praktis dan membumi; membantu tanpa terdengar tutorial otomatis.
- **Derrria:** pedagang dengan selera dan kepentingan, boleh usil soal harga tanpa selalu menjadi badut.

### 7.4 Contoh kalibrasi

**Terlalu AI — TOLAK:**

> Velthia: "Wahai pengembara, takdir telah mengantarkanmu pada singgasana yang menyimpan seribu rahasia."
>
> Yaric: "Demi jiwa yang terikat melintasi zaman, hatiku mengenal dirimu."

**Natural — ARAH YANG DIINGINKAN:**

> Velthia: "Kau sering menatap orang selama itu?"
>
> Yaric: "Aku sedang berusaha ingat sesuatu."
>
> Velthia: "Dan wajahku membantu?"
>
> Yaric: "Sedikit. Kurasa."
>
> Velthia: "Jawaban yang meyakinkan."

**Terlalu modern — TOLAK:**

> Torvan: "Bro, ini vibes-nya red flag banget, fix."

**Lebih cocok:**

> Torvan: "Kalau pintu ini memang berbahaya, kenapa kuncinya ditaruh di depan?"
>
> Yaric: "Itu bukan alasan untuk membukanya."
>
> Torvan: "Aku cuma bertanya. Tanganmu yang sudah pegang gagangnya."

Contoh di atas **arah rasa**, bukan dialog final yang wajib dipakai persis.

### 7.5 Ritme, subteks, dan keterbatasan layar

- Setiap adegan harus punya **tujuan**, **hambatan**, dan **perubahan kecil**. Tanpa tiga hal itu, ringkas atau hapus dialog.
- Baris pendek lebih baik untuk kotak dialog; pecah paragraf berdasarkan jeda alami, bukan jumlah huruf sembarang.
- Emosi tidak selalu diucapkan langsung. Rasa suka bisa muncul melalui perhatian pada detail, kebingungan, mengingat kebiasaan, atau keberanian mengakui salah.
- Humor berangkat dari sifat tokoh/situasi, bukan punchline yang bisa dipakai sembarang karakter.
- Izinkan tokoh salah ucap, tidak menjawab, ganti topik, atau diam. Jangan membuat semua orang selalu menyimpulkan moral adegan.
- Dialog eksposisi harus tersebar lewat benda, tindakan, dan konflik; **satu NPC tidak boleh menjelaskan seluruh lore**.
- Untuk setiap scene penting, minimal satu kalimat harus punya fungsi spesifik karakter, bukan sekadar mengulang informasi quest.

## 8. Romance yang dipercaya pemain

- **Chemistry dibangun**, bukan diumumkan. Interaksi romantis sudah tampak sejak Chapter I; jangan baru muncul setelah final boss.
- Velthia tetap punya kewajiban sebagai ratu dan pendapat sendiri. Ia tidak boleh direduksi jadi hadiah/tujuan Yaric.
- Yaric juga harus punya keputusan dan kekurangan yang memengaruhi percakapan.
- Momen intim tidak terus menerus dipotong humor. Humor dipakai untuk memberi ruang, bukan menolak emosi.
- Jangan mengulang motif "aku akan mencarimu di seluruh semesta" terlalu sering. Simpan callback besar untuk ending.
- Foto dan memori nyata masuk saat klimaks, bukan dijadikan trik visual yang menutupi cerita yang kosong.
- Orang yang tidak mengenal pasangan asli harus tetap paham mengapa hubungan mereka terasa berarti.

## 9. Mystery & spoiler discipline

- **The Fate** jangan diperkenalkan sebagai "pasangan kekasih" secara eksplisit di awal; penduduk punya tafsir salah.
- Torvan tidak boleh disebut God/creator oleh UI publik, nama quest, tooltip, folder aset yang terekspos pemain, ataupun dialog awal. Untuk kode internal boleh ID aman seperti `companion_torvan`, tetapi spoiler harus ditandai `SPOILER_INTERNAL` di dokumentasi.
- Varlgrim punya motivasi masuk akal dan kesalahan konsekuensial; jangan membuat kejahatannya sekadar "cinta itu terlarang" tanpa logika.
- Petunjuk harus dibayar lunas pada bab akhir; buat daftar setup/payoff di `docs/narrative/LORE_BIBLE.md`.
- Twist tidak boleh bergantung hanya pada pidato akhir. Pemain harus bisa mengingat minimal dua petunjuk sebelumnya.
- Aturan reinkarnasi dan artefak saat ini punya beberapa **jembatan lore editorial**; tidak boleh ditetapkan sebagai keputusan user diam-diam. Periksa `docs/OPEN_QUESTIONS.md`.

## 10. Audio dan cutscene yang hemat tapi tepat

- Musik instrumental 16-bit / retro; **beberapa track akan dibuat sendiri oleh user**. Jangan mengeklaim track placeholder sebagai musik final user.
- Semua scene memanggil ID musik melalui mapping data agar mudah diganti.
- Gunakan perubahan dinamika: tidak semua momen harus punya musik keras, tidak semua cutscene perlu swell orkestra.
- Cutscene menggunakan sprite, teks, kamera, dan musik; hindari cinematic 3D atau efek video yang bertabrakan dengan pixel art.
- Kamera mengikuti aksi bermakna; jangan zoom/shake terus menerus.
- Tahan beat emosional untuk beberapa detik jika diperlukan, tetapi pemain tidak dipaksa menonton animasi panjang berulang kali.
- SFX melayani input dan aksi. Tidak perlu bunyi ajaib untuk memilih setiap menu.

## 11. Gameplay feel juga bagian dari anti-slop

- Interaksi harus segera merespons input. Hindari animasi pembuka yang memblokir aksi sederhana.
- Kecepatan jalan, tabrakan, perpindahan map, jeda encounter, dan durasi giliran harus diuji *in-game*, bukan dipilih karena terasa keren di dokumen.
- Random encounter tidak boleh mengganggu dialog/cutscene/area aman.
- Battle harus bisa dipahami dari umpan balik yang terbaca: serangan siapa, target siapa, damage berapa, efek aktif apa.
- Progression memberi pilihan bermakna, bukan 20 node skill dengan bonus angka yang terasa sama.
- Side quest harus punya sebab dunia dan konsekuensi sederhana; bukan "kumpulkan 10 item" tanpa konteks.
- Pemain tidak boleh terjebak karena save di kondisi tak mungkin menang atau pintu quest gagal terbuka.

## 12. Alur review wajib sebelum aset/adegan diterima

Untuk setiap aset visual, UI, cutscene, atau dialog yang dihasilkan Claude/AI lain, sertakan **lembar review singkat** berisi:

1. **Fungsi:** karya ini dipakai di mana dan untuk apa?
2. **Kecocokan dunia:** detail mana yang spesifik ke lokasi/tokohnya?
3. **Konsistensi:** apakah mengikuti gaya 16-bit, skala, palet, dan referensi aset lain?
4. **Keterbacaan:** terbaca pada resolusi asli dan saat dipakai sungguhan?
5. **Kepribadian:** dialog/gesture bisa dikenali sebagai tokoh tertentu tanpa melihat nama?
6. **Alasan efek:** semua glow, ornamen, gerak kamera, atau musik tambahan punya fungsi?
7. **Risiko spoiler/privasi:** ada informasi yang terbuka terlalu awal atau data pribadi tidak semestinya?
8. **Bukti tes:** screenshot dari game, replay scene, video pendek/rekaman atau hasil checklist, **bukan cuma concept art**.

Jika tidak ada artefak untuk menilai, statusnya **DRAFT**, bukan **APPROVED**.

## 13. Rubrik anti-slop (wajib dipakai per review)

Nilai **0, 1, atau 2** untuk masing-masing aspek. Total maksimal 12.

| Aspek | 0 — Gagal | 1 — Perlu revisi | 2 — Lulus |
|---|---|---|---|
| Identitas | Generik, bisa ditempel ke RPG mana saja | Ada sedikit konteks | Spesifik The Fate dan tokohnya |
| Konsistensi | Bentrok skala, palet, era, UI | Mayoritas konsisten, ada cacat | Konsisten di scene sebenarnya |
| Fungsi | Mengganggu permainan/keterbacaan | Berfungsi tetapi kikuk | Jelas, fokus, enak dipakai |
| Human touch | Berlebihan/terlalu sempurna/steril | Sudah ada rasa, belum khas | Detail dan ritme terasa disengaja |
| Narasi | Klise/eksposisi/reaksi tidak wajar | Sebagian natural | Suara tokoh dan subteks kuat |
| Pengendalian efek | Efek asal ramai | Beberapa efek tidak perlu | Semua efek punya alasan |

**Gate:** minimal **10/12**, tanpa nilai 0 pada aspek mana pun, dan wajib lolos syarat khusus: dialog Indonesia, tidak spoiler, serta tidak mengekspos data pribadi. Skor tidak menggantikan penilaian Game Director; user berhak menolak walau 12/12.

## 14. Instruksi untuk Claude Code saat membuat konten

- Sebelum menulis UI/sprite/cutscene/dialog, baca `RULES.md`, `docs/DECISIONS.md`, dan dokumen spesialis yang relevan.
- Tulis dulu apa yang akan dibuat, apa yang tetap placeholder, dan apa yang belum diputuskan.
- Buat satu sampel kecil untuk satu style sebelum membuat batch besar; bandingkan in-game dengan aset yang sudah ada.
- Jangan membuat 20 sprite/halaman UI generik sekaligus hanya untuk mempercepat checklist.
- Gunakan data terpisah untuk dialog, quest, enemy, item, dan mapping audio; jangan menyisipkan cerita panjang dalam script teknis.
- Jangan menggunakan aset internet, font, musik, atau gambar orang lain tanpa mencatat sumber, lisensi, dan hak pakainya.
- Jangan mengklaim sudah "human-like" atau "anti-slop" tanpa review bukti.
- Jika tool AI tidak mendukung pembuatan PNG/spritesheet yang valid, laporkan keterbatasannya; jangan mengganti kebutuhan aset dengan kotak warna generik lalu menyebutnya final.
- Untuk placeholder MVP, bentuk polos **diizinkan secara eksplisit**, diberi label jelas, dan harus mudah diganti saat produksi visual.
- Jangan mengubah aturan cerita, peran Torvan, struktur party, atau latar demi memudahkan implementasi.

## 14A. Tambahan pengarahan scene (v1.1)

- Semua 40 beat punya scene direction dan **naskah kerja** pada `docs/narrative/`; label `DRAFT` wajib dipertahankan sampai Game Director mengulas.
- Claude tidak boleh mengklaim cutscene “sudah disutradarai final” hanya karena dialog lengkap ada dalam Markdown. Perlu validasi saat dimainkan di browser desktop (Phaser).
- Karakter tetap punya tujuan dan subteks; playback camera/gesture tidak boleh menghias kalimat AI-klise agar terkesan emosional.
- Larangan membuat kenangan asli, tanggal, foto dan musik user tetap berlaku pada `MEMORY_01..04`, ending, serta file resource private/public.
- Gate khusus: `docs/quality/NARRATIVE_SCENE_REVIEW.md` dan `docs/engineering/CINEMATIC_IMPLEMENTATION_CONTRACT.md`.

## 15. Kriteria selesai untuk kualitas kreatif

Sebuah scene/aset dianggap **SELESAI** hanya jika:

- Memenuhi fungsi teknis dan tampil benar di browser desktop (Phaser).
- Lulus rubrik anti-slop serta review skala asli.
- Selaras dengan adegan sebelum dan sesudahnya.
- Tidak menggunakan placeholder tanpa penanda pada fase yang meminta aset final.
- Bahasa seluruh teks player-facing konsisten Indonesia.
- Tidak ada spoiler yang bocor atau data pribadi yang ikut ke build umum.
- Diterima Game Director untuk fase terkait.

**Ingat:** target kita bukan game yang "terlihat dibuat AI dengan sangat bagus", melainkan **game yang punya jiwa, terasa dibuat oleh seseorang yang peduli pada setiap detailnya**.
## WEB DESKTOP v2 — OVERRIDE WAJIB

- Semua art **Classic 16-bit**, bukan website SaaS yang diberi sprite. Title, pause, Settings, battle, dialogue harus punya satu sistem warna, tipografi, piksel, dan spacing.
- **Sketsa karakter yang digambar manual oleh pasangan** adalah input final ke pipeline asset. Sampai disetujui, gunakan placeholder berlabel. Dilarang menjadikan konsep wajah/pakaian dari AI sebagai final.
- Settings adalah bagian UI yang harus terasa seperti game: volume master/BGM/SFX, kecepatan teks, fullscreen, scaling, reduced flashes dan screen shake. Semua tombol HARUS berfungsi dan tersimpan; UI palsu otomatis FAIL.
- Semua dialog bahasa Indonesia natural, cocok kerajaan, unik per karakter. Bahasa modern/slang internet dilarang dalam adegan Aveloria.
- Cerita Revisi 02 approved mengalahkan naskah lama; masa modern **terjadi berabad-abad sesudah Aveloria**, tidak boleh ditampilkan sebagai pengalaman langsung tokoh zaman kerajaan.
- Di browser ada keterbatasan autoplay dan privasi; jangan memaksa musik otomatis, jangan membundel foto privat ke build publik.
- Rubrik kualitas anti-slop yang telah dijelaskan dalam bagian atas dokumen ini tetap berlaku, bukan digantikan aturan tambahan ini.


## v3.1 — visual and narrative production gates

- Four approved source sheets lock recognizable face, hair, costume and silhouette; newly drawn assets remain DRAFT pending Game Director visual review. Never replace Yaric's face or Varlgrim's heavy wooden staff with the old hourglass boss design.
- Every PNG deliverable must decode, have real transparent pixels, and be identified as new redraw, pixel-grid draft, source reference, or mockup in ASSET_INDEX.md. Transparent canvas does not certify clean edges or game readability.
- Portrait expressions must change eye/brow/mouth and retain identity. An expression is only usable when the dialogue manifest points to an existing file and an artist reviews likeness and emotional fit.
- Sprite atlas metadata must name cells, origin, fps, and animation keys; a placeholder battle pose is DRAFT, never PRODUCTION_READY merely because it occupies a 64×64 grid. Verify native scale and game context before production approval.
- C05–C09 are noncombat. B04 reuses C04 Varlgrim. C02 Velthia casts with bare hands and has no physical weapon. Only her Ultimate shield can survive the Varlgrim meteor mechanic.
- Soundtrack is supplied by the Game Director. MUSIC_REGISTRY.json and AUDIO_COMPOSER_HANDOFF.md specify requests, not included audio; silently continue if files are absent.
- Approved Revisi 02 governs events. Chapter scripts and all portrait assignments are DRAFT editorial direction; no personal modern facts may be fabricated.
