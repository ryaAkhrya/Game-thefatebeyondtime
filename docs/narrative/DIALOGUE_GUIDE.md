# DIALOGUE GUIDE — Indonesia alami, suasana kerajaan

**Baca `RULES.md` bagian 7–9 terlebih dulu.** File ini memandu penulisan, review, dan implementasi percakapan. Seluruh contoh **contoh nada**, bukan skrip final yang harus dipakai mentah.

## 1. Tiga lapisan dialog

1. **Informasi yang diperlukan:** arah, item, peristiwa, tujuan quest.
2. **Hubungan antar tokoh:** siapa percaya siapa; siapa menahan informasi; siapa sedang bercanda.
3. **Subteks:** kekhawatiran, rasa familiar, rasa malu, keraguan; tidak harus diucapkan eksplisit.

Dialog yang hanya melakukan nomor 1 terus-menerus terasa seperti tutorial. Dialog yang hanya nomor 3 terus-menerus terasa seperti puisi AI. Seimbangkan sesuai situasi.

## 2. Rasa bahasa

- Dunia fantasi bisa memakai **aku, kau, kamu, tidak, belum, boleh, sepertinya, tunggu, sebentar, barangkali**.
- Ragam formal: "Yang Mulia", "izinkan saya melapor", "gerbang utara ditutup".
- Ragam akrab: "Kau bercanda?", "Jangan jalan terlalu cepat", "Aku cuma memastikan".
- Hindari slang media sosial, bahasa Inggris modern, atau campuran bahasa tanpa alasan.
- Hindari puisi imitasi fantasi ketika tokoh sekadar meminta air atau menanyakan jalan.
- Jangan pakai seruan yang sama di semua tokoh atau mengulang motif "takdir, semesta, jiwa" dalam setiap obrolan.

## 3. Matriks voice karakter

| Tokoh | Nada utama | Pola bicara | Humor | Hindari |
|---|---|---|---|---|
| Yaric | Jujur, impulsif, agak kikuk | Bertanya balik; kalimat pendek saat panik | Salah tangkap, self-aware sederhana | Pidato pahlawan penuh metafora |
| Velthia | Cerdas, tegas, tenang | Pernyataan presisi, jawaban memutar saat menggoda | Humor kering, membalik pertanyaan | Ratu kaku 24 jam atau baper terus |
| Torvan | Anak usil dan sangat pengamat | Pertanyaan polos yang bikin orang berpikir | Menjebak logika secara main-main | Petuah mistis tiap kalimat |
| Varlgrim | Serius, yakin, menahan emosi | Hemat kata dan konkret | Nyaris tidak ada, bisa ironis | Tawa jahat, teriak "DIA TAKDIRKU" |
| Azie | Teliti dan bertanggung jawab | Menyebut arsip, laporan, batas bukti | Gugup saat catatan tidak cocok | Mesin informasi sempurna |
| Talric | Praktis dan curiga | Perintah ringkas, pertanyaan langsung | Sedikit, kering | Tentara kasar tanpa alasan |
| Zira | Hangat tapi tajam | Perumpamaan sederhana dari kehidupan desa | Sindiran lembut | Teka-teki samar tanpa jawaban |
| Nambo | Membumi, berpengalaman | Saran praktis, kalimat pendek | Bercanda melihat kebingungan Yaric | Tutorial robot yang tahu segalanya |
| Derrria | Jeli, negosiator, ringan | Fokus kebutuhan, harga, stok | Tawar-menawar | NPC shop tanpa pikiran |

## 4. Contoh kalibrasi adegan

### A. Nambo dan Yaric di hutan

**Jangan:** "Wahai jiwa yang tersesat, jalan takdir telah membawamu ke tanah yang terlupakan."

**Arah lebih natural:**

> Nambo: "Kau baik-baik saja? Dari tadi duduk di situ."
>
> Yaric: "Aku... tidak tahu."
>
> Nambo: "Kepalamu terbentur?"
>
> Yaric: "Mungkin. Aku bahkan tak ingat namaku."
>
> Nambo: "Kalau begitu, jangan paksakan. Kota ada di ujung jalan ini. Di sana mungkin ada yang bisa membantu."

Pemain mendapat **arah** dan **karakter Nambo** sekaligus tanpa info dump.

### B. Yaric dan Velthia di istana

> Velthia: "Talric bilang kau ditemukan sendirian di hutan."
>
> Yaric: "Dia juga bilang aku mencurigakan?"
>
> Velthia: "Kau ingin jawaban jujur?"
>
> Yaric: "Kurasa tidak."
>
> Velthia: "Bijak."

Tunjukkan ketertarikan lewat tatapan/jeda berikutnya, **bukan** langsung deklarasi cinta.

### C. Torvan yang seperti anak biasa

> Torvan: "Kenapa kau selalu melihat ke belakang?"
>
> Yaric: "Memastikan kau tidak hilang."
>
> Torvan: "Aku tidak akan hilang. Kau yang mudah tersesat."
>
> Yaric: "Kau baru mengenalku."
>
> Torvan: "...Kelihatannya begitu."

Kalimat terakhir menjadi **petunjuk halus**, bukan petunjuk dewa terang-terangan.

### D. Konflik dengan Varlgrim

> Varlgrim: "Aku pernah melihat tanda itu. Terlambat sekali bagiku untuk mengabaikannya."
>
> Velthia: "Dan kau memilih menghapus ingatan orang lain?"
>
> Varlgrim: "Aku memilih apa yang kupikir bisa menyelamatkan mereka."
>
> Yaric: "Lihat apa yang terjadi sejak itu."

Konflik memakai tindakan nyata, bukan dua tokoh beradu puisi.

### E. Ending intim

> Velthia: "Kalau suatu hari kau lupa lagi?"
>
> Yaric: "Aku cari lagi."
>
> Velthia: "Kau ke istana saja sempat nyasar."
>
> Yaric: "Tapi akhirnya ketemu, kan?"

**Catatan:** penggunaan "kau/kamu" akhir perlu diseragamkan per hubungan ketika naskah final dibuat; contoh membiarkan keduanya untuk menunjukkan opsi. Jangan mencampur tanpa tujuan.

## 5. Format data dialog yang disarankan

Simpan player-facing dialog sebagai data, bukan tertanam di scene code. Contoh **skema ilustratif**, bukan format yang sudah diputuskan:

```json
{
  "dialogue_id": "c1_nambo_intro",
  "nodes": [
    {"speaker_id": "nambo", "text_id": "dlg.c1.nambo.001", "text": "Kau baik-baik saja?"},
    {"speaker_id": "yaric", "text_id": "dlg.c1.yaric.002", "text": "Aku tidak ingat bagaimana bisa sampai di sini."}
  ],
  "once_flag": "story.c1_nambo_met"
}
```

Aturan:

- `speaker_id` adalah ID stabil, bukan teks nama tampilan hard-coded.
- Simpan `dialogue_id`, `text_id`, serta flag event agar save/load konsisten.
- Sisipkan beat (jeda, animasi pendek, perubahan ekspresi) **hanya ketika ada alasan**.
- Pilihan dialog boleh bersifat flavor; pilihan final ending bercabang **belum** menjadi keputusan.
- Gunakan batas teks yang sesuai ukuran UI setelah font final diputuskan; jangan menentukan panjang pasti sekarang.

## 6. Checklist review satu scene dialog

- [ ] Apakah tokoh punya tujuan/keinginan dalam adegan?
- [ ] Apakah ada respons terhadap kalimat lawan, bukan dua monolog bergantian?
- [ ] Apakah informasi yang diberikan benar-benar diketahui tokoh itu?
- [ ] Apakah ada kalimat yang bisa dipotong tanpa kehilangan maksud? Potong.
- [ ] Apakah ada bahasa internet atau puisi fantasi yang tidak pada tempatnya? Revisi.
- [ ] Apakah Yaric/Velthia terdengar beda dari Nambo/Zira/Torvan?
- [ ] Apakah adegan ini mengganti keadaan hubungan, quest, atau pengetahuan?
- [ ] Apakah dialog memuat spoiler tanpa sengaja?
- [ ] Apakah teks terbaca dalam dialogue box, bukan paragraf panjang?
- [ ] Lulus rubrik anti-slop `RULES.md` dan review Game Director?

## 7. Prinsip untuk materi hubungan nyata

Slot memori **tidak boleh diisi dengan cerita karangan yang seolah pengalaman asli**. Catat tanggal, lokasi, kejadian, kutipan, dan foto hanya dari input user. Jika ada kekosongan, isi `[DIISI NANTI]`, bukan tanggal acak. Saat menulis ulang momen pribadi, pertahankan humor, kekhasan bahasa, dan detail yang dipilih user, bukan formula kartu ucapan generik.

## Override kanon Revisi 02

Script harus mengikuti `docs/narrative/APPROVED_STORY_R02.md` dan 40 beat `docs/narrative/STORY_AND_SCENES.md`. Jangan ungkap modern/Yudis pada Chapter I–IV Aveloria. Setiap baris dialog diperlakukan draft sampai mendapat approval manusia. Bahasa Indonesia natural, sesuai kerajaan; hindari karakter berbicara dengan pola seragam atau slang media sosial. Pengaturan text speed dari Settings selalu berlaku.
