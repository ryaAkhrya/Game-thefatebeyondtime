# Ultimate Perlindungan Velthia (`velthia_aegis`) — mekanik dan bukti no-softlock

Status: **DRAFT, FUNCTIONAL PASS (engine + tes otomatis)**; visual, audio, dan rasa pakai belum ditinjau manusia. Sumber kontrak: `SKILLS_AND_BOSSES.md` ("Meteor fairness contract — mandatory"), `docs/production/sprint4/CONTRACT.md`. Kode: `combat/aegis.ts`, `combat/BattleEngine.ts`, `combat/BattleSession.ts`. Tes: `tests/unit/aegis-engine.test.ts`, `meteor-nosoftlock.test.ts`, `chapter4-session.test.ts`, `varlgrim-balance.test.ts`.

**Keunikan Perlindungan tidak boleh dilemahkan diam-diam.** Tidak ada perintah lain yang menyelamatkan pemain dari `meteor_fall` (dan dari `rift_surge` pada uji Perlindungan). Tes grid memeriksa ini secara eksplisit.

## 1. Mekanik

- **Perintah**: `velthia_aegis` (`AEGIS_COMMAND`). Hanya Velthia (C02). **Tanpa biaya MP.** Terbuka oleh flag cerita `C4.aegisLearned` (bukan level): `BattleSession` menambahkan `velthia_aegis` ke `skills` Velthia pada encounter Bab IV bila flag ada. Perintah ini TIDAK ada di `VELTHIA_COMMANDS` dan tidak muncul lewat `velthiaSkillsAtLevel`.
- **Sumber daya `aegis`** (0 atau 1) pada aktor Velthia (`BattleActor.aegis`). Penuh saat masuk `fortress_aegis_trial` dan `varlgrim`. `undefined` di encounter lain (Perlindungan tersedia di menu tetapi alasan tidak tersedia: "Tidak ada ancaman besar dalam pertarungan ini"). Satu-satunya hal yang menghabiskannya: casting. Tidak ada musuh, ekonomi, atau RNG yang menyentuhnya.
- **Efek**: status `aegis` pada SEMUA anggota hidup. Status ini tidak berkurang per giliran (`finishStatuses` mengecualikannya), tidak dapat dihapus (Mekar hanya menghapus racun; `chrono_rewind`/`time_bind` hanya menghapus `atk_up`/`concord`), tidak dapat diganti (pemasangan ulang ditolak "Perlindungan sudah menaungi kalian"), dan tidak mengubah kerusakan biasa: ia hanya bekerja terhadap ancaman besar.
- **Pemulihan muatan**: `meteor_call` (atau `rift_gather` Penguji) memulihkan muatan ke penuh secara deterministik ("Heart bergema"). Karena itu mencast terlalu dini tidak pernah merugikan: telegraf berikutnya memulihkannya, dan perisai yang sudah terpasang tetap melindungi.
- **Meteor tanpa Perlindungan**: anggota tanpa status `aegis` jatuh ke 0 HP. Tidak dapat di-Defend, di-Ward, `def_up`, atau `chrono_guard` (rumus `lethalFall` tidak memanggil `damage()` maupun `applyDamage()` untuk mereka). Bila seluruh barisan tewas: `outcome = 'defeat'` (sesuai desain; retry).
- **Meteor dengan Perlindungan**: setiap anggota berperisai menerima "tekanan" deterministik `min(HP-1, ceil(maxHP x 0,22))`; HP TIDAK PERNAH di bawah 1. Anggota ber-HP 1 menerima 0. Sesudahnya semua perisai habis dan jendela tertutup. Tingkat retak perisai untuk presenter `stress` 0..3 menurut sisa HP (>=50% = 1, >=25% = 2, di bawahnya 3; 0 bila tanpa tekanan).

## 2. Jendela ancaman (state machine)

`BattleState.meteor: { open, velthiaActed, calls, holds, falls }` (ada hanya bila roster memuat Varlgrim atau Riftborn Penguji).

1. **`meteor_call`** (niat terlihat satu ronde sebelum dijalankan): `open = true`, `velthiaActed = false`, muatan Velthia = penuh, racun dan Stun terhapus dari semua anggota, niat boss menjadi `meteor_fall`. Boss TIDAK menyerang.
2. **Ronde pemain penuh**: setiap anggota hidup bertindak tepat sekali (siklus giliran). Selama jendela: tidak ada niat boss selain `meteor_hold`/`meteor_fall` (diuji fuzz); Stun tidak berlaku pada Velthia (`addStatus` mengabaikannya; `prepare` tidak mengubah aksinya menjadi `stunned`).
3. **Gerbang `meteor_hold`**: di akhir `finish()`, bila giliran berikutnya adalah boss, jendela terbuka, Velthia hidup, dan `velthiaActed == false`, niat boss menjadi `meteor_hold` (tanpa kerusakan, meteor tetap tergantung). `velthiaActed` menjadi true saat Velthia menyelesaikan aksi (bukan `stunned`). Setelah syarat terpenuhi niat kembali ke `meteor_fall`.
4. **`meteor_fall`**: lihat bagian 1. Jendela menutup, `falls++`, boss kembali ke aksi biasa dimulai `seal_pulse` lembut.
5. **Meteor berikutnya**: baru dipanggil sesudah >= 2 aksi biasa (`VARLGRIM.minPlainBetweenMeteors`); meteor PERTAMA boleh langsung sesudah `phase_shift` (telegraf sudah terlihat sejak jeda; `minPlainBeforeFirstMeteor = 0`, ditetapkan agar pemain kuat tidak dapat mengakali dengan menyerang cepat).
6. **Velthia tumbang**: `meteor_call` TIDAK pernah dijalankan (niat diganti aksi biasa di `syncIntents`); meteor berikutnya baru dipanggil setelah ia hidup lagi (Potion di Bab IV membangkitkan; masuk fase 3 membangkitkan semua yang tumbang).

## 3. Urutan giliran

Boss SPD 8 selalu bertindak sesudah kedua pemain (SPD >= 15 pada L7+), tetapi kebenaran TIDAK bergantung padanya: siklus giliran memberi setiap aktor hidup tepat satu giliran di antara dua giliran boss. `time_bind` hanya menukar posisi dua pemain (seperti `chrono_rewind`), tidak pernah menghilangkan giliran. Tes `jendela meteor tidak mengubah urutan` mencoba 5 konfigurasi SPD (boss tercepat, boss di tengah, semua sama, dll.) dan memastikan Yaric dan Velthia masing-masing bertindak tepat sekali sebelum `meteor_fall`. Gerbang `meteor_hold` menjadi jaring pengaman untuk urutan yang tidak lazim (diuji dengan urutan paksa).

## 4. Argumen no-softlock butir demi butir (kontrak butir 3–6)

1. **Sumber daya tersedia pada saat dibutuhkan** (butir 3). Muatan penuh saat masuk; `meteor_call` memulihkannya. Casting tidak memakai MP, item, atau RNG. MP 0 tidak berpengaruh (grid: MP Velthia 0, 3, penuh).
2. **Perlindungan bekerja** (butir 4). Pada setiap keadaan awal di grid, setiap urutan aksi yang memuat `velthia_aegis` sebelum dampak membuat seluruh anggota hidup bertahan (HP >= 1).
3. **Meteor tanpa Perlindungan mematikan; dengannya tertahan** (butir 2, 4–5). Diuji langsung dan di grid: pada semua keadaan, urutan tanpa Perlindungan tidak pernah selamat (`survive.every(o => o.aegis)`).
4. **Telegraf >= satu ronde penuh yang dapat ditindak** (butir 2). Niat `meteor_call` tampil satu ronde sebelum dijalankan, lalu satu ronde pemain penuh sebelum `meteor_fall`. Tidak ada serangan saat masuk (niat awal `keeper_stance`).
5. **Velthia selalu mendapat giliran sebelum dampak**. Siklus giliran + gerbang `meteor_hold` (diuji, termasuk urutan paksa dan fuzz SPD acak 400 pertarungan: `velthiaActed` selalu true saat `meteor_fall`).
6. **Velthia tumbang tidak menutup satu-satunya solusi**. Tanpa Velthia hidup meteor tidak dipanggil, jadi solusi tidak diperlukan; Potion dan masuk fase 3 membangkitkannya. Tidak ada keadaan di mana meteor datang sementara perlindungan mustahil. Dalam jendela tidak ada sumber kerusakan, jadi Velthia tidak dapat tumbang di dalamnya.
7. **Status/racun tidak menutup solusi**. Racun dan Stun dihapus saat `meteor_call`; tidak ada sumber baru dalam jendela; Stun tidak berlaku pada Velthia. Grid mencakup racun+Stun pada kedua anggota dan Stun pada Velthia.
8. **HP rendah / item habis**. Grid: HP Yaric 0, 1, 20%, penuh; HP Velthia 1, 20%, penuh; Potion 0 atau 3. Perlindungan tidak butuh item; HP 1 tertahan tanpa kerusakan.
9. **Tanpa ancaman berulang tak terjawab**. Muatan pulih tiap panggilan; meteor berikutnya >= 2 aksi biasa; aftermath lembut (`seal_pulse`).
10. **Mengabaikan telegraf = defeat sah** (butir 5). Grid: untuk setiap keadaan ada urutan non-Perlindungan yang berakhir defeat, dan tidak ada yang selamat.
11. **Retry dan reload** (butir 5–6). Kalah => `BattleSession.retry()` memuat checkpoint (Perlindungan penuh lagi, tanpa hadiah ganda). Ulang cepat `retryFromPhase()` memulihkan snapshot engine di awal fase 3 (dalam memori, tanpa disk). Save terjadi di luar battle; memuat ulang selalu mulai dari encounter baru, bukan di tengah giliran meteor.
12. **Reduced Flashes / Screen Shake**: peringatan tidak bergantung pada kilat/goyang. Telegraf = ikon/teks (`intentHint`) + `ImpactResult.meteor`; `presentation.ts` menetapkan kelas `meteor_telegraph` tanpa efek kilat, hanya `meteor_fall` yang memakai `impactFx` dan patuh pada kedua opsi.

Batas jujur argumen: "bertahan" dijamin untuk DAMPAK meteor. Kemenangan keseluruhan dari keadaan HP/MP/item yang sangat buruk tidak dijamin (mis. kedua anggota ber-HP 1 tanpa MP dan Potion pada fase 3 dapat tewas oleh aksi biasa berikutnya). Itu kekalahan karena pengelolaan sumber daya, bukan celah meteor; retry dari checkpoint atau awal fase 3 selalu tersedia.

## 5. Uji Perlindungan (`fortress_aegis_trial`)

Riftborn Penguji (M06, `lethalSurge`): `rift_gather` (telegraf, membuka jendela yang sama) lalu `rift_surge` MEMATIKAN tanpa Perlindungan, tertahan dengannya (mesin `lethalFall` yang sama). Pola: `gather, surge, lash, lash, gather, ...`. HP 360 sehingga surge pertama pasti datang sebelum ia tumbang pada L6–L10 (diuji); bila Velthia belum bertindak ia mengumpulkan lagi (`rift_gather` ulang) alih-alih menyerang. Bila Velthia tumbang ia hanya `rift_lash`. Pemain yang membaca telegraf menang; yang mengabaikannya kalah (sah; retry gratis). Encounter ini wajib sebelum checkpoint pra-boss (urutan flag divalidasi `GameState`).

`rift_surge` Riftborn biasa (`fortress_*` lain) TIDAK mematikan: sihir berat pada sasaran yang ditandai `rift_gather`, menghentikan (Stun 1 giliran) sasaran yang tidak bertahan dan tidak punya `def_up`. Perlindungan di sana tidak berfungsi (tidak ada muatan).

## 6. Jalur pemulihan: Potion membangkitkan (Bab IV)

`BattleEngine` opsi `revivePotion` (`BattleSession` menyalakannya untuk semua encounter Bab IV; Bab I–III tidak berubah): Potion boleh menargetkan sekutu yang tumbang dan membangkitkannya dengan HP = efek Potion (36). Ini jalur "turn/item route" untuk kontrak butir 4 (Velthia KO). Efek: `kind 'heal'` dengan `revived: true`, `ImpactResult.revived = [id]`. UI target Potion harus mengizinkan sekutu tumbang pada Bab IV (permintaan ke lead).

## 7. Kasus uji (ringkas, lihat file)

- `aegis-engine.test.ts` (31): ketersediaan (hanya Velthia, tanpa MP, bukan level, bukan tanpa muatan), tidak dapat dihapus, call/hold/fall, defeat tanpa Perlindungan (termasuk Defend+Ward), tertahan dengan Perlindungan, HP 1, KO Velthia, Stun, 5 konfigurasi SPD, fase dan transisi, `time_bind`, Penguji, Riftborn/Gravorn, snapshot fase, kebocoran keadaan, teks.
- `meteor-nosoftlock.test.ts` (2): grid 864 keadaan x seluruh urutan aksi (~16 rb simulasi) dan fuzz 400 pertarungan acak (SPD acak, HP/MP acak, status, boss pada fase acak) dengan invarian pada tiap aksi boss.
- `chapter4-session.test.ts` (12): syarat sesi, komposisi, hadiah sekali, retry penuh berulang tanpa hadiah ganda, `retryFromPhase`, kekalahan berulang tidak mengubah save.
- `varlgrim-balance.test.ts` (14): simulasi profil dan ablasi.
- `presentation.test.ts` (+7): transisi final, kelas aksi dan durasi, Reduced Flashes/Screen Shake.

## 8. Yang dikerjakan pihak lain (antarmuka)

Lihat `docs/production/sprint4/E.md` bagian "Antarmuka presenter" dan "Permintaan ke lead".
