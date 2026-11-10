# BATTLE SYSTEM — Pure Turn-Based JRPG

## 1. Sistem yang dikunci

- Pertarungan **pure turn-based**; tidak ada timed hit, dodge minigame, action bar real-time, atau bullet hell.
- Presentasi **classic side-view**, musuh kiri, party kanan, maksimal **2 anggota aktif**.
- Pemain memilih `Attack`, `Skill`, `Item`, `Defend`, `Run` (Run nonaktif untuk boss).
- Giliran ditentukan Speed. Reward setelah battle: EXP, gold, item drop.
- Role: Yaric=Swordsman, Torvan=Mage/Support, Velthia=Royal Mage.
- Stats tujuh: HP, MP, Attack, Defense, Magic, Magic Defense, Speed.
- Status: Poison, Stun, ATK Up, DEF Up. Tidak perlu elemental weakness complex.
- Solo Chapter I; duo Torvan Chapter II; Velthia mengganti Torvan pada segmen berikutnya.

## 2. Loop turn-by-turn

```
WORLD
  → ENCOUNTER_START (snapshot party, enemy group)
  → BATTLE_INIT (order, HUD, music)
  → PLAYER_TURN / ENEMY_TURN
  → RESOLVE_ACTION (cost, hit, damage, status)
  → CHECK_KO / CHECK_BATTLE_END
      ├─ unfinished → NEXT_TURN
      ├─ victory → REWARD → WORLD
      ├─ escape → WORLD
      └─ defeat → GAME_OVER / LOAD_LAST_SAVE
```

- Kontrol tidak boleh menerima input aksi berulang saat animasi damage belum selesai.
- Reward harus diberikan **tepat sekali**, tidak saat outro diputar ulang atau scene direload.
- Setelah battle kembali ke posisi map yang benar; encounter cooldown aktif agar tidak langsung battle kedua.
- Kalau player save/load saat boss tidak didukung, jangan sediakan tombol save di tengah battle.

## 3. Definisi statistik

| Stat | Dampak gameplay |
|---|---|
| HP | Ketahanan. HP 0 = KO, tak bisa melakukan aksi |
| MP | Sumber skill, tidak boleh negatif |
| Attack | Besar serangan fisik |
| Defense | Reduksi kerusakan fisik |
| Magic | Besar serangan sihir dan penyembuhan |
| Magic Defense | Reduksi kerusakan sihir |
| Speed | Urutan giliran; tiebreak harus deterministik |

**Data level/stat harus terpisah dari kode.** Kenaikan dari equipment/buff dihitung konsisten; jangan mengubah base stat secara permanen ketika buff berakhir.

## 4. Rumus draft untuk MVP — bukan angka final

Pilih rumus sederhana yang mudah dites sebelum balancing penuh. Contoh draft:

```
physical_damage = max(1, round(power + attacker.ATK * 1.0 - defender.DEF * 0.55))
magic_damage    = max(1, round(power + attacker.MAG * 1.0 - defender.MDEF * 0.50))
healing          = max(1, round(power + caster.MAG * 0.65))
```

Catatan:

- `power`, koefisien DEF/MDEF, variasi random, buff, dan critical adalah **assumption** untuk playtest, **bukan** persetujuan user.
- Untuk MVP, lebih baik hasil deterministik dulu agar test stabil; jika variasi ditambah, pakai PRNG seed untuk test.
- Negative damage tidak boleh menyembuhkan musuh.
- Jangan memberikan buff berulang yang menumpuk tak terbatas kecuali desainnya jelas.
- Heal tidak melebihi `max_hp`; MP cost tidak dibayar jika skill batal sebelum dieksekusi.
- Jangan memasukkan elemen/resistance kompleks karena user memilih class-based skills.

## 5. Aksi dan validasi

| Aksi | Pemakaian | Syarat | Umpan balik |
|---|---|---|---|
| Attack | basic damage ke target | actor hidup, target valid | animasi singkat, angka damage |
| Skill | kemampuan kelas | cukup MP dan skill unlocked | MP cost, efek/hit/heal jelas |
| Item | potion dan consumable | stok >0, target valid | jumlah berkurang 1, efek muncul |
| Defend | kurangi damage masuk berikutnya | actor hidup | status "Bertahan"/ikon terbaca |
| Run | keluar dari random encounter | bukan boss, sesuai peluang | sukses/gagal jelas dan terkontrol |

`Defend` berlaku sesuai aturan giliran yang dicatat; jangan terkadang sampai akhir turn, terkadang sampai full round. Untuk MVP kandidat: 50% pengurangan damage sampai giliran berikut actor; **playtest**.

## 6. Status effect — batas dan urutan

| Status | Efek | Proposal aturan awal |
|---|---|---|
| Poison | Damage pada tick | 5% max HP pada awal giliran, min 1; tidak membunuh di luar giliran yang wajar |
| Stun | Kehilangan kesempatan bertindak | skip tepat 1 giliran penerima |
| ATK Up | Kekuatan fisik meningkat | +25% Attack untuk 3 giliran penerima |
| DEF Up | Pertahanan meningkat | +25% Defense untuk 3 giliran penerima |

**Semua angka di kolom proposal belum final**. Tentukan titik decrement durasi, perilaku reapply, apakah status bisa dibersihkan, dan reset pascaperang di kode/data. Untuk MVP boleh implement 1–2 status dulu jika spesifikasi phase membatasinya, dengan kontrak empat status terencana.

**Urutan yang disarankan dalam turn:** Start turn/status tick → cek KO/Stun → pilih/peroleh aksi → eksekusi → efek end turn & durasi → cek battle end. Dokumentasikan dan tes.

## 7. Party rules dan equipment

- Maksimal dua slot aktif. Urutan tampilan kanan konsisten; jangan merender slot ketiga kosong seperti fitur yang siap.
- Quest/cutscene dapat mengubah anggota kedua. Saat Torvan off-party, progress miliknya harus aman.
- Velthia punya status/skill berbeda, bukan hanya Torvan reskin.
- Equipment tidak boleh hilang ketika anggota party keluar sementara.
- Pemain tidak bebas merekrut semua NPC di luar story.

## 8. Enemy roster dan perilaku

| ID | Musuh | Gaya battle | Pelajaran pemain |
|---|---|---|---|
| `hollowling` | Hollowling | fisik ringan; target acak sederhana | mengenal battle pertama |
| `briaroot` | Briaroot | poison sesekali | rawat HP, item |
| `wisplet` | Wisplet | skill magic | perlindungan MAG/MDEF |
| `gravorn` | Gravorn | DEF tinggi, Speed lambat | memilih jenis aksi |
| `oathguard` | Oathguard | melee, DEF Up | membaca perubahan stat |
| `riftborn` | Riftborn | distorsi/Stun | mengatur urutan dan recovery |

## 9. Boss encounter — bentuk taktik bukan gimmick

| ID | Boss | Konsep tantangan | Kriteria adil |
|---|---|---|---|
| `mournfang` | Mournfang | bertahan, healing, pilih kapan Defend | menang tanpa grind jika ikuti main quest |
| `veyrath` | Veyrath | duo battle Torvan; magic/support relevan | tidak mengharuskan 1 skill rahasia |
| `chronolith` | Chronolith | sustain dan support Velthia | restore/checkpoint tersedia |
| `varlgrim` | Varlgrim | final battle; narasi masuk ke mekanik | tidak memaksa action/timing minigame |

Tidak semua boss perlu tiga fase, serangan cinematic, atau status baru. Lebih baik kombinasi dua pola yang terbaca dan diperkenalkan lebih dulu.

## 10. Random encounter

- Hanya terjadi di encounter-enabled area; kota dan desa tidak memiliki random encounter.
- Cooldown saat memasuki area, setelah fight, dan sesudah cutscene agar pemain tidak disergap pada transisi.
- Frekuensi "balanced" user adalah sasaran pengalaman, bukan angka langkah yang sudah terkunci.
- Usulan implementasi: akumulasi langkah di zona, dengan minimum safe steps dan rentang tambahan acak; jangan memicu tiap frame.
- Item repel sementara menonaktifkan normal encounter sampai timer/langkah habis, tidak memengaruhi boss. Nama/durasi TBD.
- Lokasi battle dan asal encounter harus dicatat agar kembali ke posisi aman setelah fight.

## 11. Balancing singkat yang masuk akal

- Target story ±1,5–2,25 jam; jangan memaksa 30 pertarungan acak untuk membuka skill wajib.
- Pemain yang hanya menyelesaikan main quest **cukup kuat** untuk boss dengan keputusan tepat.
- Potion tersedia secukupnya tanpa membuat boss otomatis menang.
- Tampilkan MP jelas sebelum skill dipakai. Beri counter terhadap Stun/Poison yang tidak terasa curang.
- Battle normal sebaiknya singkat; boss cukup lama untuk mempertimbangkan taktik, bukan hanya HP sponge.

## 12. Test cases minimum

1. Player Attack musuh → HP turun, target terpilih benar.
2. Player Skill tanpa MP → tidak tereksekusi dan MP tidak negatif.
3. Potion satu stok → stok jadi nol tepat sekali; cannot use lagi.
4. Dua karakter speed berbeda → order benar; tie deterministik.
5. Stun aktif → actor skip satu turn, bukan selamanya.
6. Poison tick → hanya pada titik tick yang disepakati.
7. Enemy KO → tidak dapat menyerang pada turn berikut.
8. Semua musuh KO → reward tepat sekali, world resume benar.
9. Semua party KO → game over tanpa reward.
10. Run di normal encounter dan run disabled di boss.
11. Defend aktif lalu hilang sesuai batas durasi.
12. Save/load di world mempertahankan HP/MP dan item setelah battle.

Gunakan `docs/quality/QA_CHECKLIST.md` untuk bukti test; jangan otomatis menandai PASS bila kode belum dijalankan.
