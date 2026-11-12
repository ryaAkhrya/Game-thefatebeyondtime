# Progression Level 10 (Phase 8) — kurva, stat, pasif, ledger/migrasi

Status: DRAFT. Semua angka (kurva EXP, growth, pasif, hadiah Bab IV) adalah angka kerja yang diverifikasi oleh simulasi hadiah dan tes unit, BUKAN hasil playtest manusia. Kode: `web/src/game/rpg/{definitions,progression,validation,rewardLedger,chapter4Rewards}.ts`. Tes: `web/tests/unit/progression-level10.test.ts`, `web/tests/unit/reward-ledger.test.ts` (+ helper `tests/unit/helpers/progression.ts`).

## 1. Kurva EXP

`LEVEL_THRESHOLDS = [0, 25, 70, 140, 235, 300, 395, 500, 650, 800]` (definitions.ts; dipakai ketiga profil; `MAX_LEVEL = 10`, `EXP_CAP = 800`).

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| EXP kumulatif | 0 | 25 | 70 | 140 | 235 | 300 | 395 | 500 | 650 | 800 |
| Selisih dari level sebelumnya | - | 25 | 45 | 70 | 95 | 65 | 95 | 105 | 150 | 150 |

Lima ambang pertama tidak berubah, sehingga setiap save lama (L1-L5) tetap sah tanpa perubahan. Ambang L6 sengaja 300 (bukan 330 dari usulan awal): jalur wajib minimum sampai Chronolith menghasilkan EXP 303, jadi mengalahkan Chronolith memberi L6 tanpa wajib patroli opsional (margin 3 EXP; jika angka hadiah Bab I-III diubah, tes `progression-level10` akan gagal dan memaksa penyetelan ulang). L9-L10 diberi selisih 150 supaya jalur penuh pra-Varlgrim (635) tetap L8, sedangkan Varlgrim mengantar ke L9-L10.

## 2. EXP kumulatif per bab (Yaric; Velthia identik sesudah bergabung)

Sumber EXP satu-satunya = hadiah ber-flag `reward.*` (lihat ledger). Wajib = tidak dapat dilewati menurut alur cerita; opsional = patroli.

| Titik | Hadiah (EXP) | Total Yaric | Level | Target |
|---|---|---|---|---|
| Hollowling | +25 | 25 | 2 | |
| **Akhir Bab I** (Mournfang +45) | | **70** | **3** | L2-3 ok |
| Duo tutorial (+28), Veyrath (+85) | wajib | 183 | 4 | |
| **Akhir Bab II**, jalur minimum | | **183** | **4** | L3-5 ok |
| Akhir Bab II + patroli Hutan 2 (+18) | opsional | 201 | 4 | L3-5 ok |
| Kuil: Oathguard (+26), campuran (+24) | opsional | sampai 251 | 4-5 | (sebelum Chronolith) |
| Chronolith (+120) | wajib | 303 (minimum) / 353 (patroli kuil) / 371 (semua opsional) | **6** | **Bab III L5-7 ok** |
| Benteng: gerbang (+46), aula (+54), uji Perlindungan (+48) | uji wajib; sisanya jalur linear | 451 (dari 303) | 7 | |
| ... + koridor: rift (+60) atau pos jaga (+56) | | 511 / 507 | **8** | **pra-Varlgrim L8** |
| Jalur penuh Benteng (semua lima, +264 dari 371) | | 635 | 8 | |
| Varlgrim (+200) | wajib | 651 / 711 / 707 / 835 (dipotong 800) | **9-10** | **pasca-Varlgrim L8-10 ok** |

Rentang akhir: jalur wajib terendah dan jalur terpenuh dicakup tes (`Hadiah: idempoten dan target level per bab`). Pra-Varlgrim L7-L8 (L8 pada jalur realistis), pasca-Varlgrim L9-L10. Tanpa grind: tidak ada musuh yang respawn memberi EXP; setiap hadiah sekali (flag).

Torvan (hanya Bab II): 113 (jalur minimum, L3) atau 131 (dengan patroli, L3); setelah Velthia bergabung ia cadangan dan tidak menerima EXP lagi, sehingga tidak pernah melewati L3 pada alur nyata.

Angka hadiah Bab IV yang disetel (`chapter4Rewards.ts`, id/nama ekspor tidak berubah; awal lead -> sekarang): gerbang 38 -> 46, aula 44 -> 54, pos jaga 52 -> 56, rift 56 -> 60, uji Perlindungan 40 -> 48, Varlgrim 260 -> 200. Alasan: dengan angka awal jalur minimum hanya mencapai L7 sebelum Varlgrim dan Varlgrim (260) mendorong sebagian jalur melewati cap; sekarang minimum = L8 (satu dari dua cabang koridor) dan jalur penuh tidak melewati L8. Emas dan item tidak diubah.

## 3. Stat per level (stat dasar; belum termasuk perlengkapan/pasif)

Rumus (`baseStatsAt`, API tetap): `base + growth*(min(L,5)-1) + lateGrowth*max(0,L-5)`; `lateGrowth` opsional pada `ProgressionProfile` (+ `lateFromLevel: 5`). L1-L5 identik dengan rumus linear lama (dijaga tes, validasi menolak save yang `baseStats` ≠ `baseStatsAt(level)`).

Pertumbuhan per level: Yaric L2-5 `HP12 MP2 ATK3 DEF1 MAG1 MDEF1 SPD1`, L6-10 `HP11 MP2 ATK2 DEF1 MAG1 MDEF1 SPD1`. Velthia L2-5 `HP8 MP4 ATK1 DEF1 MAG2 MDEF2 SPD1`, L6-10 `HP7 MP3 ATK0 DEF1 MAG1 MDEF2 SPD1`. Torvan L2-5 `HP7 MP4 ATK1 DEF1 MAG2 MDEF2 SPD1`, L6-10 `HP6 MP3 ATK1 DEF1 MAG1 MDEF2 SPD1`.

Yaric (C01, penyerang fisik berat):

| L | HP | MP | ATK | DEF | MAG | MDEF | SPD |
|---|---|---|---|---|---|---|---|
| 1 | 96 | 12 | 16 | 6 | 5 | 7 | 10 |
| 2 | 108 | 14 | 19 | 7 | 6 | 8 | 11 |
| 3 | 120 | 16 | 22 | 8 | 7 | 9 | 12 |
| 4 | 132 | 18 | 25 | 9 | 8 | 10 | 13 |
| 5 | 144 | 20 | 28 | 10 | 9 | 11 | 14 |
| 6 | 155 | 22 | 30 | 11 | 10 | 12 | 15 |
| 7 | 166 | 24 | 32 | 12 | 11 | 13 | 16 |
| 8 | 177 | 26 | 34 | 13 | 12 | 14 | 17 |
| 9 | 188 | 28 | 36 | 14 | 13 | 15 | 18 |
| 10 | 199 | 30 | 38 | 15 | 14 | 16 | 19 |

Velthia (C02, sihir/support; HP rendah, MP/MAG/MDEF tinggi):

| L | HP | MP | ATK | DEF | MAG | MDEF | SPD |
|---|---|---|---|---|---|---|---|
| 1 | 70 | 26 | 6 | 5 | 16 | 12 | 9 |
| 2 | 78 | 30 | 7 | 6 | 18 | 14 | 10 |
| 3 | 86 | 34 | 8 | 7 | 20 | 16 | 11 |
| 4 | 94 | 38 | 9 | 8 | 22 | 18 | 12 |
| 5 | 102 | 42 | 10 | 9 | 24 | 20 | 13 |
| 6 | 109 | 45 | 10 | 10 | 25 | 22 | 14 |
| 7 | 116 | 48 | 10 | 11 | 26 | 24 | 15 |
| 8 | 123 | 51 | 10 | 12 | 27 | 26 | 16 |
| 9 | 130 | 54 | 10 | 13 | 28 | 28 | 17 |
| 10 | 137 | 57 | 10 | 14 | 29 | 30 | 18 |

Torvan (C03, support ringan; hanya L1-L3 tercapai pada alur nyata, tabel L4-L10 hanya untuk konsistensi data):

| L | HP | MP | ATK | DEF | MAG | MDEF | SPD |
|---|---|---|---|---|---|---|---|
| 1 | 62 | 20 | 7 | 5 | 15 | 11 | 13 |
| 3 | 76 | 28 | 9 | 7 | 19 | 15 | 15 |
| 5 | 90 | 36 | 11 | 9 | 23 | 19 | 17 |
| 7 | 102 | 42 | 13 | 11 | 25 | 23 | 19 |
| 10 | 120 | 51 | 16 | 14 | 28 | 29 | 22 |

Pembatasan "tidak meledak" (dijaga tes): L10/L5 <= 1,4x untuk HP dan stat serang utama (Yaric ATK 1,36x; Velthia MAG 1,21x), semua stat <= 1,6x; setiap stat tidak pernah turun antar level; sesudah L5 tidak ada stat yang tumbuh lebih cepat dari L1-L5.

### Perbandingan dengan musuh (rujukan balancing Varlgrim, perkiraan dari rumus engine)

Rumus engine: serangan fisik `max(1, floor(ATK*power - DEF*0.5))`; Denyut Velthia `MAG*1.5 - MDEF*0.5`; Pulih `16 + 1.2*MAG`; Selubung `16 + 1.3*MAG`.

Stat efektif contoh (pedang +4 ATK, Zirah Penjaga +3 DEF, semua pasif Yaric; Velthia dengan Jubah Pengawas +2 DEF/+4 MDEF dan semua pasifnya):

| | Yaric L5 | Yaric L8 | Yaric L10 | Velthia L8 | Velthia L10 |
|---|---|---|---|---|---|
| HP / MP | 144 / 20 | 191 / 29 | 213 / 33 | 133 / 57 | 147 / 63 |
| ATK / MAG | 34 / 9 | 42 / 12 | 46 / 14 | 10 / 29 | 10 / 33 |
| DEF / MDEF | 15 / 11 | 19 / 16 | 21 / 18 | 15 / 34 | 17 / 38 |

(Catatan: Yaric L5 memakai Baju Jalan/zirah + dua pasif lama. Zirah Penjaga hanya didapat di Benteng; sebelum itu DEF +2 dari Baju Jalan.)

Perbandingan: Chronolith (Bab III: HP 360, ATK 38, DEF 13) mengenai Yaric L5 (DEF 14) sekitar 31 per hantaman (~22% HP). Yaric L8 menyerang DEF 16 dengan ~34 per serangan biasa (L5: ~26; naik ~31%), L10 ~38 (+46% dari L5); Velthia Denyut ke MDEF 10: L5 ~34, L8 ~38, L10 ~44. Hantaman musuh ATK 40-48 (power 1) ke Yaric L8 (DEF 19) ~30-38 (16-20% HP); ke Velthia L8 (DEF 15) ~32-40 (24-30% HP) sehingga Velthia tetap rapuh terhadap serangan fisik tetapi tahan sihir (MDEF 34-38). Rekomendasi untuk agen E: HP Varlgrim total yang masuk akal ~ 800-1.100 (pesta ~65-80 kerusakan per ronde pada L8 tanpa jurus khusus, ~8-10 ronde per fase) dan ATK <= ~48; semua perhitungan memakai `baseStatsAt`/`effectiveStats` (API tidak berubah) dan jalur minimum L8 (Yaric 177 HP). Ini perkiraan, bukan hasil simulasi pertarungan.

## 4. Poin jurus dan pasif baru (DRAF)

Poin jurus = level - 1 - dibelanjakan (ditegakkan `validateRpg`; batas atas = `levelCap - 1 = 9`). Pasif baru (semua cost 1, bonus kecil, prasyarat berantai pada pasif yang sudah ada; deskripsi bertanda DRAF):

| Karakter | Id (nama) | Level | Prasyarat | Bonus |
|---|---|---|---|---|
| Yaric | `keen_edge` (Ketajaman Bilah) | 5 | `heavy_grip` | ATK +2 |
| Yaric | `deep_breath` (Napas Panjang) | 6 | `firm_stance` | HP +14, MP +3 |
| Yaric | `veteran_poise` (Kewaspadaan Veteran) | 8 | `keen_edge` | DEF +1, MDEF +2, SPD +1 |
| Velthia | `clear_mind` (Pikiran Jernih) | 5 | `gentle_light` | MP +6 |
| Velthia | `calm_veil` (Tabir Tenang) | 7 | `royal_poise` | HP +10, MDEF +2 |
| Velthia | `echo_focus` (Fokus Gema) | 9 | `clear_mind` | MAG +2 |

Yaric L10: 9 poin, 5 pasif (5 poin) -> 4 poin sisa; Velthia sama. Poin tidak habis sepenuhnya (disengaja: tidak ada build wajib; tidak ada reset; cadangan untuk pasif/jurus masa depan yang tidak dibuat di fase ini). Torvan tidak diberi pasif baru karena tidak pernah mencapai L5 pada alur nyata. Jurus otomatis (Ground Slam, lima perintah Velthia menurut level) dan `skill unlock` lama tidak berubah; Perlindungan dibuka oleh flag `C4.aegisLearned`, bukan level.

Perlengkapan baru (tidak dijual, buy 0/sell 0, DRAF): `warden_plate` (Zirah Penjaga; armor kelas `swordsman`, DEF +3) dan `keeper_robe` (Jubah Pengawas; armor kelas `royal_mage`, DEF +2, MDEF +4). `equip` dan `validateRpg` menerimanya (kelas dan kepemilikan ditegakkan); menu equipment memunculkannya otomatis dari `ITEMS`/`state.items`.

## 5. Ledger hadiah dan migrasi save (`rewardLedger.ts`)

Masalah: sebelumnya `gainExp` memotong EXP di 235. Save Bab III lama yang sudah >=235 kehilangan sisa hadiah (Chronolith hanya +52 dari +120). Karena (a) setiap EXP berasal dari `applyReward`, (b) `applyReward` selalu menyetel flag `reward.*` pada transaksi yang sama dan hanya itu sumber EXP, EXP historis dapat direkonstruksi tepat dari flag.

Ekspor: `REWARD_LEDGER` (id flag, exp, era), `ledgerExpFor(data, characterId)`, `normalizeLedger(data)` (murni), `normalizeLedgerReport(data)` (juga mengembalikan perubahan). `REWARD_LEDGER` diimpor dari `combat/encounters.ts`, `rpg/definitions.ts` (HOLLOWLING_REWARD) dan `rpg/chapter4Rewards.ts`; tes memindai source agar setiap `id: 'reward.*.rpg'` terdaftar (hadiah baru di masa depan tanpa ledger = tes gagal).

Aturan: per karakter yang ada di `rpg.characters`, `exp_baru = max(exp_sekarang, min(ledger, EXP_CAP))`.
- Yaric (C01): jumlah semua hadiah ber-flag.
- Torvan (C03): hanya era Bab II (duo_tutorial, forest2_patrol, veyrath) - ia anggota ke-2 hanya di sana.
- Velthia (C02): bergabung pada EXP Yaric lalu menerima semua hadiah sesudahnya, jadi ledger-nya = jumlah semua hadiah ber-flag, 0 bila `party.velthia_joined` belum ada.
Level, `baseStats`, `skillPoints` (+1 per level naik, sama dengan permainan nyata), dan jurus otomatis dihitung ulang lewat `gainExp` (jalur yang sama dengan permainan, jadi konsisten dengan `validateRpg`). Vitals: HP/MP naik sebesar kenaikan maksimum (seperti `applyReward`), dibatasi stat baru, tidak pernah turun; anggota tumbang (HP 0) tetap tumbang. Gold, item, flag, posisi tidak disentuh.

Mengapa adil: tidak mengarang EXP (hanya yang ada flag-nya), tidak pernah menurunkan level/EXP, tidak mengubah save yang sudah sesuai (objek yang sama dikembalikan), idempoten (`normalize(normalize(x)) === normalize(x)`), dan Torvan cadangan tidak mendapat EXP yang tidak pernah ia ikuti. Pemain yang sudah menang atas Chronolith mendapat tepat EXP yang pernah dijanjikan.

Pemasangan (oleh lead): panggil `normalizeLedger` setelah `validateGameStateData` berhasil pada saat memuat save (SaveRepository.read / GameState.load) dan tulis ulang pada autosave berikutnya. Karena aturan validasi untuk L1-L5 tidak berubah, save lama selalu lolos validasi lebih dulu; hasil normalisasi lolos `validateGameStateData` (dites).

Kasus tepi dan batas jujur:
1. Save legacy v1 yang dimigrasi (`GameState.ts` baris ~115) menyetel flag `reward.first_hollowling.rpg` tanpa memberi EXP (`rpg` di-reset). Ledger akan menaikkan Yaric menjadi 25 EXP (L2) karena flag itu adalah dasar yang sah. Ini dites sebagai perilaku sengaja; jika lead tidak menghendakinya, jangan jalankan normalisasi pada hasil migrasi v1 (jalur v1 sangat jarang).
2. Flag hadiah yang dihapus manual tidak menurunkan EXP (max). Fixture QA dengan EXP di atas ledger tidak berubah; di bawah ledger dinaikkan ke ledger (hanya naik).
3. EXP di atas cap (jalur penuh 835) dipotong 800; ledger tidak pernah memberi lebih dari cap.
4. Hadiah yang diterima dengan angka LAMA lalu angkanya diubah (mis. Bab IV disetel di fase ini) memakai angka SAAT INI saat normalisasi; save yang sudah menerima Bab IV (tidak ada di rilis; Bab IV baru di Phase 8) tidak ada.
5. `ledgerExpFor('C02')` mengandaikan Velthia bergabung pada EXP Yaric; jika save sintetis memberi Velthia EXP berbeda saat bergabung, aturan `max` yang berlaku.
6. Ledger hanya mengenal tiga karakter di `PROFILES`.

## 6. Skenario uji migrasi (reward-ledger.test.ts)

Save Bab I akhir; Bab II akhir (+ patroli); Bab III awal (Torvan aktif; Velthia baru bergabung); Bab III akhir terpotong cap lama (jalur minimum 303, patroli kuil 353, semua opsional 371) -> Yaric dan Velthia dipulihkan, Torvan utuh; Torvan cadangan; Bab IV terpotong; save sudah penuh (800, tidak berubah); fixture QA di atas/di bawah ledger; poin jurus dengan pasif yang sudah dibelanjakan; vitals (naik, tidak turun, <= maksimum baru; HP 0 tetap 0); 48 kombinasi (opsional x legacy x vitals) untuk sifat monoton, sah, idempoten, input tidak dimutasi; legacy v1.

## 7. Perubahan pada tes lama (hanya karena cap 5 -> 10)

- `rpg.test.ts`: tabel EXP-ke-level (999 -> L10; tambah 299/300/800) dan "large reward caps" (L10, EXP 800, 9 poin).
- `chapter3-engine.test.ts`: Chronolith sekarang memberi +120 penuh (L6 untuk Yaric dan Velthia), bukan +52 (L5); judul tes aktual diperbarui.
- `chapter3-balance.test.ts`: helper `level5` memakai `gainExp(..., 235 - exp)` agar tetap simulasi L5 (bukan L10).

## 8. Rekomendasi balancing (untuk agen E / playtest)

1. Varlgrim dibalans untuk party L8 (jalur minimum), diverifikasi di L9 (jalur penuh) dan L7 (tanpa koridor; jalur wajib terendah). 2. Cek DEF/MDEF efektif dengan dan tanpa Zirah Penjaga/Jubah Pengawas (peti Benteng opsional). 3. Perlindungan tidak bergantung level (aman). 4. Playtest manusia diperlukan: kenaikan L5 -> L6 pada kemenangan Chronolith (dua level sekaligus dari 183 -> 303 bila tanpa patroli) memberi dua poin jurus sekaligus; periksa apakah terasa adil. 5. Jika pasif terasa kecil/besar, setel `SKILLS` (bonus) tanpa menyentuh kurva.
