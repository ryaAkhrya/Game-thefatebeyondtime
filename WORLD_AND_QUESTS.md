# WORLD & QUESTS — 7 area, linear, dan tujuan pemain

## 1. Aturan global eksplorasi

- World progression **linear**. Area besar terbuka sesuai alur main quest; revisits hanya ketika memberi fungsi cerita/quest.
- Hanya **7 area besar**: 1 kerajaan, 1 desa, 2 hutan, 2 dungeon, 1 ending area. Kamar, istana, toko, ruang arsip, dan ruang kenangan adalah **submap**, tidak dihitung area kedelapan.
- Eksplorasi top-down dengan gerak keyboard empat arah; interaksi depan karakter, collision jelas, kamera dapat dibaca.
- Kota/desa aman dari random encounter kecuali pertarungan scripted yang memang disetujui.
- Di hutan/dungeon, random encounter seimbang; pemain tidak terjebak loop encounter setelah pindah map atau memuat save.
- Object interaction memberi umpan balik: terbuka, terkunci, sudah diambil, atau belum waktunya; jangan diam tanpa respons.
- Area tidak perlu besar. Fokuskan jarak tempuh pada pilihan kecil, landmark, dan percakapan; hindari corridor kosong panjang.

## 2. Area besar dan subarea

| Area ID | Nama | Fase | Subarea yang mungkin | Fungsi utama | Musuh |
|---|---|---|---|---|---|
| `area.forest_elar` | Hutan Elar* | I | clearing, jalur utama, tempat Nambo, gerbang | bangun amnesia, tutorial, Mournfang | Hollowling, Briaroot |
| `area.aveloria` | Kerajaan Aveloria | I–IV | gerbang, pasar, istana, arsip, penginapan | pusat cerita, Velthia, Talric, Azie, Derrria | none, kecuali event |
| `area.liora` | Desa Liora | II | jalan desa, rumah Zira, tempat singgah | legenda alternatif | none |
| `area.forest_serein` | Hutan Serein* | II | jalur rusak, tempat Torvan, reruntuhan kecil | partner, clue, Veyrath | Wisplet, Briaroot, Gravorn |
| `area.temple` | Kuil Jejak* | III | koridor, puzzle, aula Chronolith | memori dan nama Varlgrim | Oathguard, Wisplet |
| `area.fortress` | Benteng Kala* | IV | gerbang, sayap retak, arena Varlgrim, memory space | final boss dan reveal | Riftborn, Oathguard |
| `area.cliff` | Tebing Penutup* | Epilog | jalan pendek, tepi tebing | ending | none |

`*` = **nama kerja**, bisa berubah. Aveloria dan Liora sudah terkunci.

## 3. Jalur kritis pemain

```
FOREST_ELAR → AVELORIA → LIORA → FOREST_SEREIN → AVELORIA
          → TEMPLE → (AVELORIA jika diperlukan) → FORTRESS
          → MEMORY_SPACE (submap) → CLIFF → CREDITS
```

Prinsip penjagaan jalur:

- Gerbang keluar area terkunci oleh **flag cerita**, bukan level karakter yang dipaksa grinding.
- Revisit memanfaatkan map lama tanpa mewajibkan pemain mengulang dialog/tutorial.
- Quest journal memberi tujuan konkret: **"Temui Zira di rumah dekat sumur"** lebih baik dari **"Cari jawaban takdir"**.
- Selalu ada jalur pulang aman atau checkpoint sebelum boss. Jangan sengaja membuat softlock.

## 4. Paket area — pengalaman dan struktur

### 4.1 Hutan Elar (Chapter I)

**Janji pengalaman:** terasa asing tetapi bisa dipahami. Path layout: start clearing → tempat Nambo → cabang peti → encounter zone → gate miniboss → keluar hutan.

- Landmark awal: pohon besar, sungai kecil atau tumpukan batu (detail visual akan dikurasi kemudian).
- Objek interaktif: peti potion, papan/jalan, jejak kaki, benda pertama yang memberi petunjuk memori.
- Encounter pertama bisa diperkenalkan dengan trigger terarah sebelum random encounter penuh.
- Mournfang berada di dekat gerbang; sebelum boss ada kesempatan healing/checkpoint.
- Setelah boss, jalur kembali tidak mengunci pemain ke encounter tak terbatas.

### 4.2 Aveloria (Chapter I–IV)

**Janji pengalaman:** kerajaan yang punya aktivitas sendiri; bukan arena RPG yang dibuat hanya mengantar ke ratu.

- Gerbang: Talric dan penjaga; punya logika siapa boleh masuk.
- Pasar: Derrria dan NPC; dialog stok/perubahan rumor menyesuaikan chapter.
- Istana: ruang tatap muka publik Velthia; akses sesuai cerita.
- Arsip: Azie, catatan, bukti yang benar-benar bisa diperiksa.
- Tempat istirahat/save yang aman; jangan semua kamar jadi pintu palsu.
- Saat chapter naik, setidaknya satu NPC/objek mencerminkan perkembangan gangguan waktu, tanpa perlu membuat kota baru.

### 4.3 Liora (Chapter II)

**Janji pengalaman:** informasi sejarah datang dari warga, bukan dari arsip kerajaan. Visual desa hangat dan praktis.

- Rumah Zira mudah dicari melalui tanda/arah NPC; hindari berburu pixel.
- Pemain bisa meninjau benda legenda atau catatan yang lebih lama dari arsip istana.
- Ada kesempatan side quest kecil yang memberi kedekatan dengan masyarakat.
- Desa tetap safe zone.

### 4.4 Hutan Serein (Chapter II)

**Janji pengalaman:** rasa waktu salah lebih kentara tanpa membingungkan navigasi.

- Jalur punya struktur berbeda dari hutan pertama, bukan recolor identik.
- Torvan diperkenalkan dari situasi yang dapat dipercaya; ia tidak menunggu di podium seperti quest giver.
- Satu battle duo menampilkan skill bantuan Torvan secara alami.
- Veyrath melindungi fragmen, bukan muncul karena "wajib ada boss".
- Hindari mekanik loop waktu yang memaksa jalan bolak-balik panjang tanpa penjelasan.

### 4.5 Kuil Jejak (Chapter III)

**Janji pengalaman:** pemain merasa menemukan tempat penting yang dahulu dipakai untuk sesuatu.

- Puzzle 2–3 objek yang berhubungan dengan lambang atau ingatan; jawabannya diperlihatkan lewat lingkungan.
- Velthia punya dialog pengamatan yang bukan cuma "lihat, pintu terbuka".
- Chronolith menjaga catatan, arena memberi ruang baca yang jelas.
- Ada checkpoint dan recovery sebelum boss.

### 4.6 Benteng Kala (Chapter IV)

**Janji pengalaman:** retakan waktu punya konsekuensi visual dan gameplay.

- Event gangguan waktu tidak boleh memalsukan save player atau menghapus input nyata.
- Riftborn melambangkan ancaman; jangan ubah rule turn-based menjadi action.
- Penjelasan Varlgrim dan bekas segel ditemukan lewat benda, ruang, dan percakapan.
- Setelah boss, **memory space adalah submap benteng**, untuk menjaga total 7 area besar.

### 4.7 Tebing Penutup (Epilog)

**Janji pengalaman:** hening yang diperoleh setelah perjalanan. Tidak ada monster, menu mencolok, atau grinding.

- Komposisi memberi ruang langit dan kedua karakter; bergerak minimal.
- Pemain dapat menikmati momen tanpa dipaksa beberapa prompt aksi tak perlu.
- Foto/awan bergantung mode private/public.

## 5. Main quest — ID dan state

| ID | Judul kerja di jurnal | Trigger | Objective | Completion flag | Reward |
|---|---|---|---|---|---|
| `Q_MAIN_01` | Cari jalan ke Aveloria | Setelah bangun | Temui Nambo; hadapi ancaman; capai gerbang | `story.c1_gate_passed` | akses Aveloria |
| `Q_MAIN_02` | Rumor tentang The Fate | Sampai istana | Temui Azie dan Velthia | `chapter.1_complete` | mulai Chapter II |
| `Q_MAIN_03` | Kisah dari Liora | Azie menugaskan | Temui Zira, dengarkan legenda | `story.c2_zira_truth` | akses hutan kedua |
| `Q_MAIN_04` | Fragmen yang dijaga | Masuk hutan kedua | Temui Torvan; kalahkan Veyrath; ambil fragmen | `story.c2_fragment_found` | progres cerita |
| `Q_MAIN_05` | Janji di dalam kuil | Chapter III | Velthia bergabung, selesaikan puzzle, hadapi Chronolith | `chapter.3_complete` | akses benteng |
| `Q_MAIN_06` | Jantung waktu | Chapter IV | Hadapi Varlgrim, pulihkan Heart, jelajahi memori | `chapter.4_complete` | epilog |
| `Q_MAIN_07` | Beyond Time | Masuk tebing | Lihat epilog, kredit, P.S. | `ending.credits_seen` | selesai |

## 6. Side quest — pendek, manusiawi, opsional

Side quest ini **usulan isi**, bukan judul dan isi terkunci user. Maksimum kecil; jangan menghabiskan sebagian besar 1,5–2,25 jam.

| ID | Lokasi | Hook yang masuk akal | Aksi | Reward contoh | Batasan |
|---|---|---|---|---|---|
| `Q_SIDE_DERRRIA_SUPPLIES` | Aveloria/hutan | Derrria kekurangan bahan ramuan karena jalur terganggu | ambil 2–3 item dari area terjangkau | gold/potion | tanpa farming RNG panjang |
| `Q_SIDE_TALRIC_GATE` | Aveloria | penjaga melaporkan bunyi lonceng/gerbang aneh | cek satu objek dan lapor | equipment kecil | tak membocorkan lore penuh |
| `Q_SIDE_ZIRA_PAGE` | Liora | halaman catatan tersebar/tertinggal | cari objek di submap desa | EXP/suplemen | tidak butuh map ekstra |

Side quest harus punya state: `NOT_STARTED` → `ACTIVE` → `READY_TO_TURN_IN` → `COMPLETED`; optional `FAILED` hanya jika benar-benar desainnya mendukung dan tidak merusak ending.

## 7. Pola state objek dunia

Untuk peti:

```
CHEST_CLOSED → INTERACT → REWARD_GRANTED + SAVE_FLAG → CHEST_OPEN
```

- Saat load, peti terbuka jika `chest.<id>.opened = true`.
- Jangan memberi reward dua kali jika pemain mash button/interaksi berulang.
- NPC utama punya dialog berbeda untuk `before_quest`, `during_quest`, `after_quest`.
- Pintu menyimpan `requires_flag`, `target_area`, `spawn_id`; jika terkunci, tampilkan alasan kontekstual.

## 8. UX agar linear tidak terasa sempit

- Sediakan pilihan kecil: jalur peti, urutan dua NPC opsional, dialog flavor, istirahat sebelum boss.
- Gunakan landmark dan konteks cerita untuk membuka area, bukan invisible wall tanpa narasi.
- Hindari indikator panah setiap 3 langkah; jurnal dan reaksi NPC cukup.
- Jika pemain balik ke area lama, berikan satu perubahan kecil (dialog/objek/kondisi), tidak perlu konten besar baru.
- Pastikan objektif berikutnya bisa dituntaskan tanpa mengandalkan wiki.


## v3 constraint

The modern location, private objects, photographs and memories are TBD, not content to fabricate. No modern memory can appear within Aveloria or be perceived by its past characters.
