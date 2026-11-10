# RPG SYSTEMS — Progression, skill, economy, quest, save

> Implementasi Phase 3 (10 November 2026): fondasi EXP/level, shared inventory/equipment, jurus dan save/load sudah berjalan di Chapter I. Threshold provisional di bawah dipakai sebagai curve DRAFT sampai level 5; growth, 25 EXP/8 emas Hollowling, dua pasif Yaric dan harga item juga DRAFT. Skill point kini diimplementasikan sesuai permintaan Phase 3 pengguna, tetap menunggu review balancing. Detail kode, schema v2/migrasi v1, QA dan batasan ada di [PHASE3_REPORT.md](docs/production/PHASE3_REPORT.md). Tabel/contoh roster dan quest di dokumen ini bukan klaim bahwa seluruhnya sudah dibuat.

## 1. Prinsip desain

Game ini berdurasi pendek; sistem RPG harus mendukung perjalanan, bukan membebani pemain dengan grinding, mata uang berlapis, kompleksitas crafting, atau ratusan menu. **Keputusan locked:** EXP + Skill Tree, inventory, equipment, shop, main quest, side quest singkat, manual save dan autosave.

## 2. Leveling dan EXP

- EXP berasal terutama dari battle, bisa sedikit dari quest.
- Level memberi kenaikan HP/MP dan stat sesuai role; growth rate ditaruh di data.
- Skill point saat level up adalah **proposal**, bukan keputusan user; bisa alternatif unlock langsung dengan syarat level.
- Selalu tampilkan EXP reward setelah kemenangan dan progres level secara jelas.
- Jangan membuat musuh memberi EXP tak terbatas jika pemain bisa memicu fight sangat cepat dengan cara tidak wajar.

**Tabel provisional untuk simulasi balance (bukan final):**

| Level | EXP total | Fokus pemain |
|---|---:|---|
| 1 | 0 | Attack, potion, basic skill |
| 2 | 25 | unlock skill pertama |
| 3 | 70 | battle terasa sedikit lebih kuat |
| 4 | 140 | opsi utility |
| 5 | 235 | siap mini-boss berikut |

Angka tidak harus dipakai; kunci setelah playtest. Target level akhir **belum** diputuskan.

## 3. Skill Tree kecil tapi terasa pilihan

Usulan maksimal dua cabang per karakter; tidak wajib semua node dirilis. Fokus pada dampak jelas, bukan bonus angka kecil berulang.

| Role | Cabang 1 (contoh) | Cabang 2 (contoh) | Fungsi |
|---|---|---|---|
| Yaric | Serangan pedang lebih kuat / serangan fokus | Defend / serangan yang membuka peluang | damage atau bertahan |
| Torvan | Sihir damage | buff/debuff bantuan | serang atau mendukung |
| Velthia | Heal lebih baik | magic & DEF Up | pulih atau kontrol |

**MVP 0.1:** satu skill unlock nyata untuk Yaric sudah cukup; jangan implement semua cabang sekaligus. Buat data structure agar skill baru bisa ditambah kemudian.

## 4. Inventory

Kategori:

- **Consumables:** potion HP, item MP, repel sementara.
- **Equipment:** senjata, armor (slot final jangan terlalu banyak).
- **Key items:** fragmen legenda, artefak, benda quest; tak boleh dibuang/dijual jika kritis.

Syarat sistem:

- Item punya ID stabil, label Indonesia, deskripsi singkat, icon optional, jumlah, tipe, efek, harga beli/jual.
- Item tidak boleh dikonsumsi bila target tidak valid; jangan mengurangi stok jika efek tidak diterapkan.
- UI berfungsi dengan keyboard sepenuhnya; kategori dan fokus terlihat.
- Item yang sudah dibuka dari peti punya flag source untuk mencegah duplikasi.

## 5. Item awal — nama hanya contoh kerja

| ID | Nama tampilan contoh | Tipe | Kegunaan | Status |
|---|---|---|---|---|
| `potion_small` | Ramuan Pemulih | consumable | pulihkan HP | draft |
| `ether_small` | Tonik Mana | consumable | pulihkan MP | draft |
| `warding_item` | Item Penolak Musuh | consumable | cegah random encounter untuk durasi terbatas | nama/durasi TBD |
| `rusted_blade` | Pedang Lama | equipment | pedang awal Yaric | draft |
| `leather_armor` | Pelindung Kulit | equipment | DEF awal | draft |
| `fate_fragment` | Fragmen Catatan | key item | keperluan Chapter II | draft |

Jangan menganggap nama "Ramuan Pemulih" sudah final; ID data lebih penting agar save stabil.

## 6. Shop — Derrria the Merchant

- Derrria muncul di tempat aman; transaksi jangan berlangsung saat battle.
- Menu dasar: Beli, Jual (kecuali key item), Keluar.
- Sebelum transaksi tampilkan harga dan saldo; item yang tak terjangkau ditandai jelas.
- Pembelian mengurangi gold dan menambah item **atomik**; rollback jika gagal.
- Stock boleh berubah mengikuti chapter namun tidak membuat pemain kehilangan kebutuhan dasar.
- Derrria punya dialog kontekstual terkait barang dan gangguan perjalanan, bukan sekadar "Selamat datang, pahlawan!".

## 7. Quest system

- Quest punya `quest_id`, `state`, `objective_index`, `requirements`, `reward`, dan `is_optional`.
- Main quest membuka chapter/area; side quest tidak boleh mengunci alur utama.
- Journal menampilkan objective aktif yang konkret; jika pemain bingung, tambahkan petunjuk di NPC/objek.
- Reward tidak diberikan dua kali setelah load ulang atau interaksi ulang.
- Quest state diserialisasi untuk manual save dan autosave.

## 8. Save system

**Wajib dikunci:** manual save + autosave. Implementasi yang disarankan:

- Data save memuat `save_version`, `slot_id`, timestamp lokal, chapter, current scene, spawn point, last safe position, party roster, level/EXP, HP/MP, equipment, gold, inventory, unlocked skill, quest state, story flags, chest flags, cutscene flags, pilihan dialog flavor jika relevan.
- Manual save diperbolehkan di titik aman; menu harus jelas kapan bisa/tidak bisa save.
- Autosave setelah milestone yang stabil: sebelum masuk dungeon/boss atau setelah boss selesai dan world state sudah konsisten.
- Simpan secara aman dengan temp file lalu rename jika platform mendukung; hindari file rusak bila proses terganggu.
- Jika versi schema berubah, migrasi/memuat fallback harus diuji; jangan menghapus save lama tanpa pemberitahuan.
- Save tidak boleh mengandung foto pribadi mentah jika bisa direferensikan sebagai asset dengan akses terpisah.
- Tidak boleh ada save/load saat `reward_apply` setengah proses.

## 9. Economy dan anti-grind

- Gold paling utama untuk potion dan equipment masuk akal, bukan mata uang lima lapis.
- Pemasukan dari battle dan side quest harus sesuai kebutuhan sebelum boss.
- Harga beli/jual serta jumlah gold awal **provisional**, disesuaikan playtest.
- Hindari softlock ekonomi: pemain miskin tetap bisa melanjutkan lewat healing/recovery titik aman.

## 10. Pengukuran pengalaman pemain

Untuk tiap vertical slice, catat:

- Berapa menit sampai battle pertama dan dialog Velthia.
- Berapa encounter normal di jalur utama tanpa sengaja grinding.
- Berapa kali pemain perlu potion; apakah ada cara belajar dari kekalahan.
- Apakah Skill Tree benar-benar memberi pilihan atau hanya formalitas.
- Apakah inventory dan shop menyita waktu lebih lama dari petualangan.

Jika sistem gagal memberi pengalaman yang baik, **kecilkan**, bukan otomatis tambahkan fitur.
