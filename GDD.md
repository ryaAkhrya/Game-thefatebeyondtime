# THE FATE: BEYOND TIME
## MASTER GAME DESIGN DOCUMENT — DESKTOP WEB v2.0

**Story Canon:** Cerita Revisi 02 (APPROVED)  
**Prepared:** 8 November 2026  
**Platform:** PC/laptop web browser · landscape 16:9 · keyboard · single player  
**Engine:** Phaser 4.2.1 + TypeScript + Vite · Claude Code in VS Code/IDE  
**Stage:** Dokumentasi selesai untuk Phase 0, **kode game belum dibuat**

---

# 1. Visi dan Batasan Game

The Fate: Beyond Time adalah JRPG fantasi pendek tentang seseorang yang terbangun tanpa ingatan, seorang ratu yang terasa akrab, dan penjaga waktu yang keliru mengartikan pertanda buruk. Cerita diarahkan menjadi petualangan sungguhan yang pada ujungnya menyimpan hadiah personal untuk anniversary pertama. **Pemain umum harus tetap mendapat cerita yang memuaskan tanpa mengetahui siapa pembuatnya.**

Target durasi keseluruhan sekitar 1,5–2,25 jam, empat chapter ditambah modern interlude dan epilog. Cerita linear dengan tujuh area besar, ada eksplorasi, quest, pertarungan, skill dan equipment. Gaya Classic 16-Bit JRPG. Permainan dijalankan langsung dari alamat website pada **PC/laptop**, bukan sebagai aplikasi desktop `.exe`. Browser mobile **bukan** target rilis pertama.

## Empat pilar pengalaman

- **RPG yang benar-benar dimainkan:** eksplorasi, combat dan item harus berfungsi dan punya pacing, bukan klik untuk membaca visual novel yang diberi battle.
- **Romansa yang terasa manusiawi:** chemistry dibangun lewat perhatian, perbedaan pendapat, candaan kecil dan keputusan sulit; bukan karena ramalan memaksa tokoh saling jatuh cinta.
- **Misteri dengan sebab-akibat:** petunjuk The Fate, segel, lonceng, Torvan dan artefak ditanam sebelum payoff. Pengungkapan tidak boleh sekaligus menjadi lore dump.
- **Anti AI-slop:** dunia yang terasa dihuni, karakter dengan siluet dan kebiasaan, UI sederhana yang fungsional, dialog bahasa Indonesia alami untuk latar kerajaan. Quality gate berada di `RULES.md`.

# 2. Cerita Resmi — Revisi 02

Dokumen otoritatif berada di `docs/source/CERITA_APPROVED_REVISI_02.docx` dan versi teks `docs/narrative/APPROVED_STORY_R02.md`. Ringkasan di sini dipakai supaya developer melihat struktur cerita dalam satu halaman tanpa salah kronologi.

## Premis

Yaric bangun tanpa ingatan di hutan dekat Kerajaan Aveloria. Warga takut pada legenda “The Fate” ketika orang mulai kehilangan memori, lonceng berbunyi pada jam yang salah, dan monster Hollow muncul. Velthia, Ratu Aveloria, merasa Yaric asing sekaligus familiar. Mereka belum tahu bahwa masalah sebenarnya berasal dari Varlgrim yang berusaha melindungi kerajaan.

## Konflik pusat dan aturan sebab-akibat

Varlgrim, penjaga waktu, pernah gagal menyelamatkan seseorang yang sangat ia sayangi. Ia melihat kilasan menara retak, lonceng berhenti dan rakyat melarikan diri; serta membaca ramalan bahwa dua jiwa akan bertemu saat suatu zaman berakhir. Ia mengira pertemuan Yaric dan Velthia akan menyebabkan kehancuran. Ia memisahkan ingatan mereka dan menyegel **Heart of Time**. Padahal **segel itulah penyebab retakan waktu dan kemunculan Hollow**. Ia tidak berbohong bahwa bencana mungkin terjadi, tetapi ia salah membaca penyebabnya.

The Fate bukan monster atau kutukan, melainkan sebutan bagi dua jiwa yang dapat bertemu lagi di kehidupan berbeda. Artefak Heart of Time merekam **gema ingatan**, bukan portal penjelajah waktu atau mesin penentu cinta. Torvan adalah pencipta dunia tetapi tidak boleh menulis ulang pilihan bebas dan menghapus konsekuensi seenaknya; ia hanya membuka kesempatan, bukan menyelesaikan konflik secara sepihak.

## Chapter I — The Nameless Wanderer

Yaric terbangun di Hutan 1. Nambo membantunya menemukan jalan menuju Aveloria. Ia bertarung melawan Hollowling dan Mournfang; tubuhnya tahu cara menggunakan pedang meski pikirannya kehilangan identitas. Di gerbang, Talric curiga padanya. Azie menghubungkan kedatangannya dengan laporan gangguan waktu. Velthia meminta menemui Yaric langsung dan hubungan mereka dimulai dari obrolan kikuk, satu candaan, dan rasa saling mengenali yang tak bisa dijelaskan. Akhir bab: lonceng berbunyi dua kali untuk jam yang sama.

## Chapter II — Whispers of Fate

Yaric mencari versi legenda lain di Desa Liora. Zira menceritakan The Fate sebagai dua orang yang selalu menemukan jalan pulang, bukan pembawa petaka. Di hutan kedua, Yaric bertemu Torvan, bocah usil yang tampak tahu hal-hal yang seharusnya tidak ia tahu. Torvan masuk party sebagai Mage/Support. Setelah melawan Veyrath mereka menemukan catatan penjaga lama dan salinan ramalan yang dicoret. Yaric kembali ke Velthia; kedekatan mereka tumbuh lewat kebiasaan sehari-hari dan percakapan manusiawi, bukan ingatan yang dipaksakan.

## Chapter III — The Forgotten Promise

Krisis benar-benar menimpa rakyat Aveloria: gerbang terkunci pada waktu yang salah, warga mengulang aktivitas, dan ingatan orang tercabut. Azie mendesak Velthia menahan Yaric demi stabilitas istana. Velthia menolak, memerintahkan Talric melakukan evakuasi dan menanggung keraguan kaum bangsawan. Pusaka kerajaannya cocok dengan lambang catatan, sehingga ia ikut Yaric menuju kuil. Torvan tinggal untuk membantu warga, Velthia menggantikan posisinya di party. Setelah perdebatan di perjalanan, puzzle, dan boss Chronolith, mereka menemukan ramalan yang utuh: kehancuran adalah **salah satu kemungkinan**, bukan hukuman atas cinta. Bukti retakan menunjuk titik segel Varlgrim. Velthia mengingat satu pecahan janji lama.

## Chapter IV — The Fate

Yaric dan Velthia memasuki benteng Varlgrim, sementara Talric/Azie menjaga evakuasi. Varlgrim menunjukkan kilasan bencana dan tetap yakin bahwa segelnya melindungi Aveloria. Velthia menunjukkan pola kerusakan yang berawal dari segel. Varlgrim tidak mengalah; pertarungan terakhir terjadi. Setelah menang, **Yaric dan Velthia bersama-sama** membuka Heart of Time. Retakan mereda, tetapi menara tua yang sudah rusak tetap runtuh. Warga selamat berkat keputusan evakuasi Velthia. Kemenangan tidak menghapus semua kerusakan.

Ingatan Aveloria yang diputus kembali: Yaric dan Velthia pernah saling memilih. **Tidak ada ingatan/foto modern di ruang ini.** Varlgrim melihat kilasan lengkap, mengakui ia salah sebab-akibat, lalu memilih tinggal menahan sisa retakan; ia tidak langsung dimaafkan, nasib akhirnya bisa ditinjau lagi. Torvan mengungkap dirinya sebagai pencipta, menegaskan ia tidak menentukan siapa harus saling mencintai, lalu pergi. Velthia kembali menjalankan tanggung jawab sebagai ratu.

## Interlude Modern — Berabad-abad kemudian

**Bertahun-tahun sangat jauh setelah Aveloria, bukan di Chapter IV zaman kerajaan**, Yudis dan pasangannya berkencan. Mereka menemukan peninggalan Aveloria dengan lambang yang sejak Chapter II sudah dikenal pemain. Sentuhan pada benda itu memicu gema Heart of Time; ingatan Yaric–Velthia mulai kembali. Pemain akhirnya memahami hubungan reinkarnasi dua kehidupan. Bagian ini dapat memuat empat hotspot kenangan pribadi `MEMORY_01..04`, tetapi nama pasangan, foto, tanggal, tempat, dan candaan nyata menunggu kiriman serta persetujuan Game Director. Tidak boleh dikarang AI.

## Epilog — Beyond Time

Cerita menampilkan kembali kenangan masa Aveloria, sesudah kerajaan selamat: Yaric dan Velthia duduk di tebing melihat langit. Velthia bertanya apa jadinya jika mereka lupa lagi. Yaric berjanji akan berusaha mengenalnya kembali, meski mungkin tersesat karena buruk membaca arah. Awan perlahan membentuk siluet kenangan; bentuk modern adalah montase **untuk penonton**, bukan penglihatan tokoh masa lalu. Tutup dengan **To Be Continued**, kredit kontributor nyata, lalu P.S. anniversary pertama yang ditandatangani Yudis **di versi privat**. Akhir menegaskan mereka memilih untuk saling mengenal kembali, bukan dipaksa takdir.

# 3. Pemeran, Monster dan Boss

## Karakter

| ID | Nama | Fungsi utama |
|---|---|---|
| C01 | Yaric | Protagonis swordsman, amnesia, spontan, sering kikuk; masa modern Yudis |
| C02 | Velthia | Ratu Aveloria, cerdas, suka membalas candaan, punya keputusan politik dan Royal Mage |
| C03 | Torvan | Bocah misterius, Mage/Support, pencipta dunia yang membatasi intervensinya |
| C04 | Varlgrim | The Warden, antagonis tragis; ia juga final boss B04 |
| C05 | Azie | Penasihat kerajaan yang mengutamakan stabilitas pemerintahan |
| C06 | Talric | Kapten penjaga istana, menangani evakuasi |
| C07 | Zira | Tetua Desa Liora, penjaga versi legenda rakyat |
| C08 | Nambo | Pengembara yang menolong Yaric di awal hutan |
| C09 | Derrria the Merchant | Pedagang item/equipment yang punya kebiasaan dan humor sendiri |

## Enemy roster

| Jenis | Nama | Fungsi tempur/naratif |
|---|---|---|
| M01 | Hollowling | Monster bayangan kecil, tutorial awal |
| M02 | Briaroot | Tumbuhan berduri, memberi Poison |
| M03 | Wisplet | Roh sihir dengan pertahanan fisik rendah |
| M04 | Gravorn | Monster batu, DEF tinggi dan SPD rendah |
| M05 | Oathguard | Prajurit lama, fisik dan DEF Up |
| M06 | Riftborn | Distorsi waktu endgame, berpotensi Stun |
| B01 | Mournfang | Boss Hutan 1 pada Chapter I |
| B02 | Veyrath | Boss Chapter II, Hollow Knight |
| B03 | Chronolith | Penjaga Kuil, boss Chapter III |
| B04 | Varlgrim | Final boss Chapter IV, sama dengan C04 |

Referensi wajah, rambut, kostum, dan siluet C01–C04 dari sheet utama telah dipilih. PNG ekspresi dan sprite individual v3.1 adalah DRAFT, belum production-ready; gunakan setelah review konsistensi dan uji native-size.

# 4. World & Level Structure

Dunia **linear**, area baru dibuka sesuai urutan. Terdapat tujuh kelompok lokasi besar: **Aveloria**, **Liora**, **Hutan 1**, **Hutan 2**, **Dungeon 1/Kuil**, **Dungeon 2/Benteng**, dan **Area Ending/Tebing**. Rumah, toko, istana, koridor, perkemahan, dan area interlude modern bukan ekspansi open world; itu subscene naratif untuk chapter yang relevan. Nama-nama khusus hutan/kuil/benteng/tebing masih **nama kerja/TBD**.

- **Aveloria:** kota hidup dengan NPC, pasar, istana, gerbang dan kegiatan rakyat; zona aman kecuali event terskrip.
- **Liora:** tempat legenda alternatif The Fate, percakapan dengan Zira; zona aman.
- **Hutan 1:** tutorial movement, Nambo, Hollowling, Mournfang.
- **Hutan 2:** Torvan, encounter duo, jalur menuju catatan Veyrath.
- **Kuil:** puzzle lambang/ingatan, Chronolith, ramalan utuh.
- **Benteng:** titik segel, Riftborn, konfrontasi Varlgrim, Heart of Time.
- **Tebing:** epilog kenangan masa Aveloria, minim gameplay agar emosi tidak terganggu.

Quest utama sejalan dengan 40 beat cerita (`docs/narrative/STORY_AND_SCENES.md`); side quest pendek berfungsi menghidupkan area/mendukung sumber daya, tidak menambah puluhan karakter atau mengganti ending.

# 5. Exploration dan Battle

## Eksplorasi

Top-down 4 arah, kamera mengikuti pemain, collision, papan/objek, NPC berbicara, pintu dan chest. Dialog berbasis ID dan flags supaya event aman disimpan. Random encounter terjadi di luar area aman dengan cooldown setelah pertarungan; item repel sementara boleh ditambahkan jika balance mengharuskannya.

## Combat

**Pure turn-based**, battle side-view: karakter/player di kanan, musuh di kiri. Tidak ada dodge ala Undertale, QTE, rhythm minigame, atau klik timing serangan. Party aktif maksimal dua berdasarkan cerita. Komando `Attack`, `Skill`, `Item`, `Defend`, `Run` (boss tidak dapat di-Run bila tidak diizinkan). Setiap aksi punya feedback, MP cost, target, dan efek yang jelas. Statistik: HP, MP, ATK, DEF, MAG, MDEF, SPD. Status awal: Poison, Stun, ATK Up, DEF Up.

- **Yaric:** Swordsman, fokus Attack fisik dan 1 skill ofensif awal.
- **Torvan:** Mage/Support, memakai buff/debuff dan serangan magic.
- **Velthia:** Royal Mage, heal/support/magic yang penting di Chapter III–IV.
- **Varlgrim:** boss dengan kontrol tempo dan tekanan pilihan, bukan transformasi monster generik.

Encounter harus cukup sering memberi rasa RPG tetapi tidak terasa grindy. Boss memerlukan strategi namun punya sinyal yang bisa dibaca. Angka HP/EXP/gold/drop bersifat **TBD dan diuji**, bukan lore final.

# 6. RPG Progression, Quest dan Save

EXP dari battle meningkatkan level dan statistik; ada **Skill Tree** beberapa cabang yang ringkas agar sesuai durasi pendek. Class-based skills lebih penting daripada sistem elemen kompleks. Inventory, equipment, consumable, toko Derrria, gold, quest log, chest, serta satu atau dua side quest per area bila membantu pacing.

Manual save + autosave wajib. Dalam versi web, penyimpanan dilakukan **lokal di browser**, tanpa akun/cloud. Save menyimpan chapter, area, posisi, party, flags, EXP/level, HP/MP, inventory, equipment dan skill. Data situs/browser dihapus = save bisa hilang. Perlu validasi save corruption dan migration versi data.

# 7. UI/UX & Settings

UI harus terasa JRPG Classic 16-Bit, bukan web dashboard. Panel sederhana, fokus keyboard terlihat, susunan tombol konsisten, minim ornamen. Layar title: `New Game`, `Continue`, **`Settings`**, `Controls`. Saat bermain: `Pause`, `Inventory/Skills`, `Save/Load`, **`Settings`**, `Resume`, `Return to Title`. Karena browser, tidak ada tombol Quit yang memaksa menutup tab.

**Settings wajib berfungsi mulai MVP**:

| Opsi | Default draft | Efek |
|---|---|---|
| Master volume | 100% | semua audio |
| BGM volume | 70% | musik area, battle, ending |
| SFX volume | 80% | bunyi aksi, UI, lonceng |
| Mute | Off | audio 0 sementara tanpa mengubah slider |
| Text speed | Normal | Lambat / Normal / Cepat / Instan |
| Fullscreen | Off | browser request, feedback bila ditolak |
| Scaling | Fit | Pixel Perfect / Fit, aspek 16:9 |
| Screen Shake | On | bisa dinonaktifkan |
| Reduced Flashes | On (aman) | kurangi efek kilat berlebihan |

Settings harus dapat dioperasikan keyboard, bekerja nyata, dan tetap setelah refresh. Reset Defaults perlu konfirmasi serta tidak menghapus save. Browser membatasi autoplay audio; musik dimulai setelah pemain berinteraksi. Detail perilaku dan tes ada di `docs/design/SETTINGS_SPEC.md`.

# 8. Visual, Audio dan Anti-Slop

**Style locked:** Classic 16-Bit JRPG dengan tile/pixel scale konsisten, siluet tiap tokoh dapat dibaca, palet terkontrol dan animasi tidak berlebihan. Dunia Aveloria punya tanda pernah dihuni, toko Derrria tidak steril, armor Talric tampak dipakai, ratu tidak harus terus mengenakan gaun tidak praktis. **Namun semua desain fisik tokoh hanyalah usulan sampai sketsa manual disetujui.**

Semua dialog **bahasa Indonesia yang natural**, tetap cocok latar kerajaan: `aku/kau` atau sapaan resmi dalam konteks, tidak harus pidato agung. Jangan memenuhi percakapan dengan "wahai", "takdir telah menuntun jiwaku", atau slang modern seperti "bro", "gas", "red flag" yang keluar dari tokoh zaman Aveloria. Yaric spontan, Velthia punya humor tajam, Torvan jahil, Varlgrim hemat kata dan penuh rasa bersalah. Setiap dialog harus menyampaikan kepribadian, informasi, atau hubungan, bukan hanya menyebut tema.

Musik instrumental 16-bit: tema per area, encounter, boss, romance dan ending. **Beberapa lagu final dibuat sendiri oleh Game Director**. Gunakan mapping track ID dan placeholder/silent fallback sampai file tersedia, lalu tunduk pada Settings BGM. Cutscene sprite, teks, camera movement sederhana, audio, tanpa voice acting; arah 40 beat tersedia di `docs/narrative/SCENE_DIRECTION_BIBLE.md` dan naskah draft per bab. Quality gate anti-slop lengkap berada di `RULES.md`.

# 9. Arsitektur Web dan Keamanan

Framework **Phaser 4.2.1** + **TypeScript** + **Vite**, pengembangan di VS Code/IDE dengan Claude Code. Project hasil kode di folder `web/`, bukan Godot. Logic `GameState`, BattleEngine, DialogueManager, SaveRepository, SettingsRepository, SceneRouter, AudioManager dan AssetRegistry terpisah dari rendering sehingga aman diuji/diganti.

Target Chrome/Edge desktop dan browser PC lain jika pengujian mendukung. 16:9, keyboard; tampilan mobile memunculkan pesan bahwa permainan memerlukan PC/laptop. Website di-host sebagai static HTTPS jika pemilik meminta deploy. Tidak ada kebutuhan backend, database, login atau multiplayer. `npm run dev` untuk memainkan secara lokal dan `npm run build` menghasilkan build statis `dist/`.

**Privasi:** foto kenangan asli, pesan anniversary, dan materi personal tidak boleh di-bundle ke website publik. Buat **private build** terpisah jika file diizinkan. Menyembunyikan URL atau password lewat JavaScript saja tidak mengamankan berkas frontend. Credits hanya untuk orang yang berkontribusi. Sumber asset/font/audio harus legal.

# 10. MVP v0.1 — Bukti Gameplay, Bukan Game Penuh

Target potongan Chapter I sekitar 10–15 menit: Title (termasuk Settings), hutan kecil, Yaric placeholder yang bisa bergerak, Nambo dan dialog, peti/potion, Hollowling random encounter, battle side-view, HP/MP, EXP dan satu skill, inventory/equipment dasar, manual save+autosave serta Continue setelah refresh browser. Ending demo jelas.

**Settings seluruhnya harus berfungsi dan persist**, jangan ditunda hingga polish. Test 1366×768 dan 1920×1080, keyboard-only, tab blur, fullscreen, browser audio policy, corruption/storage blocked, npm build. Tidak perlu semua 4 chapter, Torvan, Velthia party, boss-boss, memory photos, ending anniversary atau sprite final pada MVP. Semua akan masuk Phase 5 sesuai roadmap.

Output MVP: **project source web yang dapat diedit, URL localhost saat dev, dan build statis `web/dist/`**, bukan Windows EXE. Claude tidak boleh mengklaim playable tanpa menjalankan smoke test.

# 11. Roadmap Fase Produksi

- **Phase 0 — Web Foundation:** template Phaser/Vite/TS, setup keyboard, title, Settings repository dan screen, build smoke test.
- **Phase 1 — Exploration & Dialogue:** hutan placeholder, movement/collision, Nambo, interaction, dialog natural.
- **Phase 2 — Turn-Based Combat:** Hollowling, side-view commands, enemy AI, win/lose/reward.
- **Phase 3 — RPG & Persistence:** EXP/skill, inventory, equipment, manual+autosave, Settings lengkap.
- **Phase 4 — MVP Vertical Slice:** integrasi 10–15 menit + QA desktop web.
- **Phase 5 — Full Story:** Chapter I–IV, modern interlude, epilog, art dari sketsa manual, soundtrack user, semua quests/boss.
- **Phase 6 — Polish & Release:** balancing, accessibility, browser tests, security/private build, hosting statis jika disetujui.

Tiap phase punya acceptance gate dan harus dilaporkan jujur di `docs/production/PHASES.md`, `docs/production/TASKS.md`, `docs/quality/QA_CHECKLIST.md`. Dilarang lompat langsung membuat full game sebelum core loop lulus tes.

# 12. Status Keputusan dan Batas Revisi

**Sudah final:** cerita Revisi 02, nama karakter/enemy/boss, 4 chapter + modern interlude + epilog, 7 area linear, turn-based murni, party max 2, Classic 16-Bit, dialog Indonesia, web desktop keyboard, Phaser+TypeScript+Vite, Settings wajib, visual reference chosen, asset review required.

**Belum final:** sketsa visual manual, nama kerja hutan/kuil/benteng/tebing, detail kehilangan Varlgrim, nasib terakhir Varlgrim, identitas pasangan modern, foto/tanggal/kenangan nyata, musik pribadi, nilai damage/EXP, pixel dimensions dan final font/palette. Semuanya harus tetap dinyatakan TBD sampai Game Director menentukannya.

**Rujukan produksi:** `RULES.md` untuk mutu; `CLAUDE.md` untuk cara Claude bekerja; `docs/narrative/APPROVED_STORY_R02.md` untuk kanon; `docs/narrative/STORY_AND_SCENES.md` untuk 40 beat; `docs/design/SETTINGS_SPEC.md` untuk Settings; `docs/engineering/TECHNICAL_DESIGN.md` untuk arsitektur web; `docs/production/MVP_0_1.md` untuk acceptance prototype.


## Addendum v3 — production lock

Varlgrim C04 and boss B04 share the same design and heavy wooden staff from the main character sheet. Boss sheet hourglass is rejected for weapon and pose identity. Velthia casts from hands; Torvan is visibly young; only C01–C04 battle. Final meteor can only be survived with Velthia's protection Ultimate, with mandatory party, tutorial, charge recovery, save point and explicit telegraph detailed in `SKILLS_AND_BOSSES.md`. Concept crops are REFERENCE and no music is shipped until authored by Game Director.
