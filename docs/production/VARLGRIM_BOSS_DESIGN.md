# Varlgrim (B04 = C04) — desain boss akhir

Status: **DRAFT, FUNCTIONAL PASS (engine + simulasi otomatis)**. Seluruh angka disetel lewat simulasi `tests/unit/varlgrim-balance.test.ts`, BUKAN playtest manusia. Visual, audio, dan ritme nyata belum ditinjau. Kanon menang atas dokumen kerja: `FULL_STORY.md` C4-02/C4-03, `CHARACTER_BIBLE.md` (Varlgrim), `SKILLS_AND_BOSSES.md` ("Meteor fairness contract"), `docs/production/sprint4/CONTRACT.md`.

Kode: `web/src/game/combat/varlgrim.ts` (data, pola, tuning), `combat/aegis.ts` (Perlindungan), `combat/c4Enemies.ts` (Riftborn, Gravorn), `combat/BattleEngine.ts` (eksekusi), `combat/BattleSession.ts` (retry). Mekanik Perlindungan: `ULTIMATE_SHIELD_MECHANIC.md`.

## 1. Siapa dia dalam pertarungan

Varlgrim bukan iblis, bukan dewa, dan tidak berteriak. Ia penjaga waktu yang takut dicatat sebagai penjaga yang diam, yang pernah salah dan kehilangan seseorang, lalu mengulangi kesalahan dalam bentuk lain. Pertarungannya memperlihatkan disiplin, bukan amarah:

- **Tongkat kayu besar berpilin** (BUKAN jam pasir). Ia menanam tongkat ke lantai untuk mengikat waktu, mengayunkannya penuh untuk menghantam, dan mengangkatnya untuk menahan langit.
- **Semua serangan tertelegraf** dan konsekuensi dari mekanisme waktu, bukan ledakan acak. Tidak ada RNG, tidak ada kejutan, tidak ada kritikal.
- Tidak memanggil bawahan baru, tidak berubah wujud. Fase tiga hanyalah ia menahan lebih banyak: meteor yang ia panggil bukan kemarahan, tetapi "jalan terakhir" seorang penjaga yang yakin segel harus dipertahankan berapa pun harganya.
- Setelah HP habis ia berlutut bertumpu pada tongkat (`defeated`), tidak meledak. Pidato C4-03 ("Kalau segelnya kulepas...") dimulai dari sana.
- Ia menunggu Velthia: bila Velthia belum sempat bertindak, ia menahan meteor (`meteor_hold`) alih-alih menjatuhkannya. Disiplin yang jujur: ia tidak menembak orang yang belum sempat bersiap. Ini sekaligus jaminan keadilan pertempuran.

## 2. Statistik (DRAFT)

| Stat | Nilai | Catatan |
|---|---|---|
| HP | 1150 | cukup agar fase 3 (35% = 403 HP) tidak habis sebelum meteor pertama, bahkan pada pemain terkuat |
| ATK / MAG | 50 / 44 | ATK untuk hantaman tongkat fisik; MAG untuk serangan temporal |
| DEF / MDEF | 16 / 12 | sihir Velthia relatif efektif; Yaric tetap penyerang utama |
| SPD | 8 | selalu bertindak SESUDAH kedua pemain tiap ronde (SPD pemain level 7+ >= 15) |

Kekuatan serangan (`VARLGRIM.power`): `keeper_strike` 2.2 (fisik, ATK), `fracture_strike` 2.6 (sihir, MAG), `seal_pulse` 0.47 (sihir, seluruh barisan), `distortion_wave` 0.72 (sihir, seluruh barisan), `time_bind` 0.65 (sihir, satu sasaran). Serangan bertelegraf sengaja jauh lebih kuat dari yang tak bertelegraf supaya Bertahan/Selubung bernilai.

Rumus kerusakan: fisik memakai `damage()` lama (Defend x0.5, `def_up`), sihir `magicDamage()` baru = `max(1, floor(MAG*daya - MDEF*0.55) * (Defend ? 0.5 : 1))`; `shield` (Ward) menyerap lewat `applyDamage`. `meteor_fall` tidak memakai rumus ini sama sekali (lihat Perlindungan).

## 3. Fase (`varlgrimPhaseFor`)

| Fase | Rentang HP | Tema | Kosakata |
|---|---|---|---|
| 1 Keeper | 100–66% | penjaga disiplin | `keeper_stance`→`keeper_strike`, `seal_pulse`, `time_bind` |
| 2 Distortion | 65–36% (<=66%) | waktu mulai bergeser | + `fracture_mark`→`fracture_strike`, `distortion_wave` |
| 3 Meteor | <=35% | jalan terakhir | + `meteor_call`→`meteor_fall` (`meteor_hold`), aksi biasa lembut |

Aturan transisi (diuji di `aegis-engine.test.ts` dan fuzz `meteor-nosoftlock.test.ts`):
- Fase hanya dievaluasi sesudah aksi yang BUKAN telegraf-pembuka (`keeper_stance`, `fracture_mark`, `meteor_call`, `meteor_hold`). Pasangan telegraf→serangan tidak pernah terputus oleh transisi.
- Transisi = satu giliran `phase_shift` (tanpa kerusakan; tongkat ditanam, `frameKey 'plant'`), lalu pola fase baru dari awal. Banner `phase2`/`phase3` dari naskah (`C4_BATTLE_CALLOUTS`) dipicu oleh `ImpactResult.phase`.
- Lompatan HP besar langsung ke fase tertinggi yang berlaku (tetap satu `phase_shift`).
- Masuk fase 3: anggota yang tumbang bangkit 25% HP (`phase_shift`, `ImpactResult.revived`), sehingga pelajaran Perlindungan selalu dapat dicapai. Snapshot engine dalam memori diambil di titik ini (retry cepat).

## 4. Tabel pola (deterministik, tanpa RNG)

Siklus fase 1 (`PHASE1_CYCLE`): `keeper_stance`, `seal_pulse`, `keeper_stance`, `time_bind`, `seal_pulse` (indeks dilanjutkan; `keeper_stance` selalu diikuti `keeper_strike`).

Siklus fase 2 (`PHASE2_CYCLE`): `fracture_mark`, `distortion_wave`, `keeper_stance`, `time_bind`, `fracture_mark`, `distortion_wave`, `seal_pulse` (`fracture_mark` selalu diikuti `fracture_strike`).

Fase 3 (dinamis): sesudah `phase_shift` langsung `meteor_call` bila Velthia hidup (telegraf sudah terlihat sejak jeda), sesudah `meteor_fall` selalu `seal_pulse` lembut (aftermath), lalu aksi biasa dari rotasi (`distortion_wave`, `keeper_stance`→strike, `fracture_mark`→strike, `seal_pulse`) sampai >= 2 aksi biasa terkumpul, baru `meteor_call` lagi.

| Perintah | Telegraf | Sasaran | Efek | Counterplay yang dapat dipelajari |
|---|---|---|---|---|
| `keeper_stance` | membidik satu sasaran (rotasi Yaric, Velthia, ...) | satu | tidak ada kerusakan; menandai | baca sasaran; siapkan Bertahan/Selubung |
| `keeper_strike` | (hasil stance, satu ronde pemain penuh) | sasaran stance | hantaman fisik berat | Bertahan (x0.5), Selubung Kecil, Pulih, Bukan Aku |
| `seal_pulse` | tidak (ringan) | seluruh barisan | sihir ringan | Mekar Rimba, Bertahan |
| `time_bind` | tidak | satu (rotasi) | sihir ringan + giliran sasaran tertunda satu slot + penguatnya (Selaras Langkah/atk_up) terhapus | giliran tertunda tidak pernah menutup Perlindungan; hanya urutan yang bergeser |
| `fracture_mark` | menandai satu sasaran | satu | tidak ada kerusakan | sama seperti stance |
| `fracture_strike` | (hasil mark) | sasaran mark | sihir sangat berat | Bertahan, Selubung, Pulih |
| `distortion_wave` | tidak (tampak di niat sebelumnya) | seluruh barisan | sihir sedang | Bertahan, Selubung, Mekar |
| `phase_shift` | niat terlihat satu ronde | — | tanpa kerusakan (fase 3: kebangkitan) | jeda untuk pulih |
| `meteor_call` | niat terlihat satu ronde, lalu dipanggil | seluruh barisan | membuka jendela: Perlindungan pulih penuh, racun/Stun anggota terhapus | gunakan ronde berikut untuk Perlindungan |
| `meteor_hold` | otomatis bila Velthia belum bertindak | — | tanpa kerusakan | bertindak (Perlindungan) |
| `meteor_fall` | (hasil call/hold, >= satu ronde pemain penuh) | seluruh barisan | mematikan tanpa Perlindungan; tertahan dengannya | HANYA `velthia_aegis` |

Giliran `time_bind` memakai penggeseran urutan seperti `chrono_rewind` (dua pemain hidup bertukar posisi, boss tetap terakhir). Karena siklus giliran tidak pernah menghilangkan giliran siapa pun, Velthia selalu mendapat satu giliran di antara `meteor_call` dan `meteor_fall` (diuji untuk 5 konfigurasi SPD yang berbeda, termasuk boss tercepat).

## 5. AI (ringkas; kode: `BattleEngine.advanceVarlgrim`, `syncIntents`)

1. Setelah tiap aksi boss, `advanceVarlgrim` memperbarui `calm` (aksi biasa sejak meteor), mengevaluasi fase, lalu memilih niat berikutnya (`varlgrimNext`).
2. Di akhir tiap `finish()` `syncIntents` menjaga niat tetap konsisten dengan keadaan sekarang: (a) `meteor_call` tidak pernah berlaku bila Velthia tumbang (diganti aksi biasa), (b) pada giliran boss `meteor_fall` menjadi `meteor_hold` bila Velthia belum bertindak sejak telegraf, (c) `meteor_hold` kembali ke `meteor_fall` begitu syaratnya terpenuhi.
3. Tidak ada RNG: `BattleEngine` menerima fungsi acak tetapi jalur Bab IV tidak memanggilnya (diuji dengan fungsi acak yang melempar galat).
4. `intentHint(enemy, { aegisCovered })` memberi teks Indonesia untuk setiap niat; niat meteor selalu menyebut Perlindungan dan "tanpa MP".

## 6. Counterplay dan peran pemain

- **Yaric = penyerang utama** (Ground Slam, serangan biasa). **Velthia = dukungan** (Pulih, Selubung Kecil, Mekar Rimba, Denyut Telapak bila aman) dan pemegang Perlindungan. Selaras Langkah (6 MP untuk 1,5x satu serangan) ternyata tidak lebih efisien daripada Denyut pada simulasi; ini temuan DRAFT untuk Game Director.
- **Bertahan** memotong separuh satu hantaman; paling bernilai pada sasaran stance/mark.
- **Selubung Kecil** menyerap sebagian hantaman berat; **Pulih**/**Mekar** menjaga HP lewat meteor.
- **Potion** bernilai: tanpa Potion pemain level 8 menang dengan margin lebih tipis; di Bab IV Potion juga dapat membangkitkan sekutu yang tumbang (lihat mekanik Perlindungan).
- **Meteor**: lihat dokumen Perlindungan.

## 7. Hasil simulasi balancing (seluruhnya deterministik; "aksi acak" = variasi pemain, bukan RNG)

Kebijakan: `strategis` (Perlindungan saat meteor, Bertahan pada sasaran, Pulih/Selubung, Potion, fokus serang), `hanya Perlindungan` (membaca meteor, selebihnya menyerang), `sembrono` (tidak pernah Perlindungan/Bertahan/Pulih). Stat dari `baseStatsAt` + perlengkapan standar (Zirah Penjaga, Jubah Pengawas) + pasif (dua pasif awal; "semua" = rantai pasif P).

| Profil | strategis | +20% aksi acak (n=40) | hanya Perlindungan | sembrono |
|---|---|---|---|---|
| RENDAH L7, perlengkapan awal, tanpa pasif, 1 Potion | kalah | menang 0/40 | kalah | kalah |
| RENDAH L8, perlengkapan awal, tanpa pasif, 1 Potion | menang tipis: 26 ronde, sisa HP 1%, 3 meteor | 1/40 | kalah | kalah |
| RATA-RATA L8, standar, 2 pasif, 3 Potion | **menang: 20 ronde, sisa HP 44%, MP sisa 3, Potion sisa 2, 1 meteor** | 11/40 (rata-rata 25 ronde, HP 19%) | kalah | kalah |
| RATA-RATA L9, standar, 2 pasif | menang: 18 ronde, sisa HP 45%, Potion sisa 3, 2 meteor | 28/40 | kalah | kalah |
| DEKAT CAP L10, semua pasif, 3 Potion | menang: 15 ronde, sisa HP 81%, MP sisa 25, 1 meteor | 29/40 | menang tipis (12 ronde, HP 3%) | **kalah** |

Pada aksi acak 35%: L9 menang 15/40, L10 20/40. Encounter Benteng (strategis, L6–L8): Riftborn 4 ronde, sisa HP 69–75%; Gravorn 6–7 ronde, 53–73%; penjaga (Oathguard+Riftborn) 5 ronde, 81–84%; koridor (Gravorn+Riftborn) 10–15 ronde, 56–84%; Riftborn Penguji 4–6 ronde dengan 1–2 kali Perlindungan (acak 30%: menang 9–12/20; sembrono selalu kalah).

Target ronde: "14–22 ronde" tercapai pada L9 (18) dan L10 (15); L8 rata-rata 20 (pemain +20% acak 25 ronde, di atas target). Ketiga profil memenuhi: pemain level 8–9 dengan perlengkapan standar menang secara strategis; yang sembrono kalah; hasil tidak bergantung RNG (hasil identik untuk seed yang sama; tidak ada RNG engine).

Ablasi (L8 rata-rata): tanpa Pulih/Selubung/Mekar kalah; tanpa Bertahan sisa HP turun (44%→33%); tanpa Potion turun (44%→32%); hanya-Perlindungan kalah. Tes `varlgrim-balance.test.ts` menjaga hubungan ini, parametrik terhadap level (tidak memakai stat beku).

## 8. Tragedi karakter dalam mekanik

- `meteor_hold` adalah wajah Varlgrim: bahkan saat memegang langit, ia menunggu orang yang ia lawan sempat menjawab. Banner `meteor_hold` ("Ia menunggu Velthia") berasal dari sini.
- Tidak ada permohonan maaf dalam pertarungan. Sesudah kalah ia berlutut, bukan hancur; tanggung jawab dipikul di C4-06 tanpa pengampunan instan (naskah N).
- Telegraf meteor selalu terbaca sebagai konsekuensi mekanisme waktu: "tongkat diangkat, langit ditahan", bukan kilat acak.

## 9. Batas jujur

- Angka DRAFT hasil simulasi kebijakan pemain buatan; pemain manusia akan berbeda. Margin L8 sengaja tipis agar Perlindungan, Bertahan, Pulih, dan Potion semuanya relevan; ini perlu playtest, dan mudah disetel (hanya `VARLGRIM`, `VARLGRIM_STATS`, `AEGIS.stressPct`).
- Pemain yang sangat kuat (L10 dengan semua pasif) menyelesaikan dalam 15 ronde dan tetap melihat satu meteor; profil sengaja tidak dibuat lebih sulit demi pemain level rendah.
- Snapshot ulang-cepat hanya ada di memori; menutup game/ganti layar di tengah battle mengulang dari checkpoint save (Perlindungan penuh lagi).
- Tidak ada visual/audio final di sini: atlas B04 (BA), VFX (V), SFX (S), kamera/UI (lead).
- Riftborn Penguji dan encounter Benteng lain juga DRAFT; belum dimainkan manusia.
