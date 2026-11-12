# SFX Design & Manifest — Phase 7

Efek suara ORIGINAL The Fate Beyond Time. **Bukan BGM** (BGM tetap `AWAITING_COMPOSER`, tidak ada berkas `BGM_*`).

## Status kualitas (jujur)

**FUNCTIONAL / AUDIO-REVIEW PENDING.** Semua bunyi disintesis dari kode dan lolos pemeriksaan otomatis (WAV valid, durasi, tanpa clipping, tidak senyap, jendela RMS per kategori, deterministik). **Belum ada peninjauan telinga manusia**: karakter bunyi (apakah elegan/tidak melelahkan/cocok dengan adegan) belum dinilai Game Director. Jangan menganggap desain bunyi final; angka di bawah hanya bukti teknis.

- Tidak ada sampel/rekaman pihak ketiga, tidak ada pustaka bunyi, tidak ada `Math.random` (PRNG berbenih per id+variasi).
- Format: WAV PCM 16-bit mono 44.1 kHz, puncak dinormalisasi ke -3 dBFS, fade-in 2 ms, fade-out 20-600 ms, DC-block.
- Total: 44 id, 53 berkas, ~2.7 MB (stinger kemenangan/kekalahan mendominasi ukuran).

## Regenerasi

```
node web/scripts/sfx/generate.mjs           # tulis WAV + manifest.json + src/game/data/sfxRegistry.ts + tabel di dokumen ini
node web/scripts/sfx/generate.mjs --check   # hanya render dan cetak tabel
```

Sumber: `web/scripts/sfx/dsp.mjs` (osilator, FM, noise berfilter, biquad, reverb Schroeder, pembalik, saturasi), `catalog.mjs` (resep per id + metadata), `generate.mjs`. `manifest.json` menyimpan SHA-256 tiap berkas (tes memastikan berkas di disk = manifest, dan dua render berturut-turut identik). `sfxRegistry.ts` DIHASILKAN; jangan diubah manual.

## Kebijakan loudness

1. Setiap berkas dinormalisasi puncak -3 dBFS (tanpa clipping; dibuktikan tes).
2. Perbedaan kenyaringan antar kategori diatur oleh `gain` di registry (UI 0.35-0.6, langkah 0.5-0.55, interaksi 0.6-0.75, battle 0.85-1.0, sihir 0.75-1.0, stinger 0.8), lalu dikalikan master x SFX Settings.
3. "RMS efektif" = RMS berkas + 20 log10(gain). UI sengaja paling pelan, hantaman battle/Chronolith paling keras.
4. Batas durasi per kategori: UI 40-200 ms, langkah 60-140 ms, battle (ayun/hantam/serang) 150-600 ms, sihir/penyembuhan/status 300-1200 ms, transisi 500-1600 ms, interaksi 150-1500 ms, stinger <= 2500 ms.

## Tabel durasi dan loudness

Dihasilkan otomatis oleh generator.

<!-- SFX_TABLE_START -->
| id | kategori | file | durasi (ms) | puncak (dBFS) | RMS (dBFS) | gain | RMS efektif (dBFS) | interval min (ms) |
|---|---|---|---:|---:|---:|---:|---:|---:|
| `SFX_UI_MOVE` | ui | 1 | 70 | -3 | -16.9 | 0.5 | -22.9 | 45 |
| `SFX_UI_CONFIRM` | ui | 1 | 200 | -3 | -13.6 | 0.55 | -18.8 | 80 |
| `SFX_UI_CANCEL` | ui | 1 | 170 | -3 | -13.8 | 0.5 | -19.8 | 80 |
| `SFX_UI_SELECT_ITEM` | ui | 1 | 90 | -3 | -13.1 | 0.5 | -19.1 | 60 |
| `SFX_UI_ITEM_USE` | ui | 1 | 200 | -3 | -16.7 | 0.6 | -21.1 | 120 |
| `SFX_UI_SAVE_OK` | ui | 1 | 200 | -3 | -13.7 | 0.6 | -18.2 | 200 |
| `SFX_UI_SAVE_FAIL` | ui | 1 | 200 | -3 | -17.3 | 0.55 | -22.5 | 200 |
| `SFX_UI_DIALOGUE_ADVANCE` | ui | 1 | 55 | -3 | -15.1 | 0.4 | -23 | 60 |
| `SFX_UI_DIALOGUE_CHOICE` | ui | 1 | 100 | -3 | -13.9 | 0.45 | -20.9 | 60 |
| `SFX_UI_SHOP_BUY` | ui | 1 | 200 | -3 | -14.1 | 0.42 | -21.6 | 100 |
| `SFX_UI_SHOP_SELL` | ui | 1 | 190 | -3 | -14 | 0.42 | -21.5 | 100 |
| `SFX_STEP_GRASS` | step | 4 variasi | 110-110 | -3 | -18.5..-18 | 0.5 | -24.3 | 90 |
| `SFX_STEP_DIRT` | step | 4 variasi | 100-100 | -3 | -15.7..-14.8 | 0.55 | -20.4 | 90 |
| `SFX_STEP_STONE` | step | 4 variasi | 100-100 | -3 | -18..-17.2 | 0.5 | -23.6 | 90 |
| `SFX_INTERACT` | interact | 1 | 220 | -3 | -14.3 | 0.6 | -18.8 | 150 |
| `SFX_CHEST_OPEN` | interact | 1 | 900 | -3 | -18.6 | 0.7 | -21.7 | 400 |
| `SFX_ITEM_PICKUP` | interact | 1 | 320 | -3 | -13.7 | 0.6 | -18.1 | 150 |
| `SFX_DOOR_OPEN` | interact | 1 | 900 | -3 | -18.1 | 0.7 | -21.2 | 500 |
| `SFX_PUZZLE_ACTIVATE` | interact | 1 | 600 | -3 | -17.3 | 0.7 | -20.4 | 300 |
| `SFX_PUZZLE_SOLVED` | interact | 1 | 1450 | -3 | -16.9 | 0.75 | -19.4 | 800 |
| `SFX_BATTLE_TRANSITION_NORMAL` | transition | 1 | 850 | -3 | -21 | 0.8 | -23 | 800 |
| `SFX_BATTLE_TRANSITION_BOSS` | transition | 1 | 1400 | -3 | -16 | 0.85 | -17.4 | 1000 |
| `SFX_BATTLE_TRANSITION_TEMPORAL` | transition | 1 | 1150 | -3 | -18.2 | 0.8 | -20.1 | 1000 |
| `SFX_BATTLE_TRANSITION_SCRIPTED` | transition | 1 | 1000 | -3 | -16.7 | 0.8 | -18.6 | 1000 |
| `SFX_BATTLE_CONFIRM` | ui | 1 | 200 | -3 | -15.7 | 0.6 | -20.1 | 80 |
| `SFX_GREATSWORD_SWING` | battle | 1 | 380 | -3 | -18.1 | 0.85 | -19.5 | 120 |
| `SFX_GREATSWORD_IMPACT` | battle | 1 | 500 | -3 | -15.8 | 1 | -15.8 | 60 |
| `SFX_GROUND_SLAM` | battle | 1 | 600 | -3 | -12.5 | 1 | -12.5 | 200 |
| `SFX_ENEMY_ATTACK` | battle | 1 | 400 | -3 | -19.5 | 0.9 | -20.4 | 120 |
| `SFX_DAMAGE` | battle | 1 | 280 | -3 | -17.2 | 0.95 | -17.7 | 80 |
| `SFX_ENEMY_DAMAGE` | battle | 1 | 260 | -3 | -20.9 | 0.95 | -21.4 | 80 |
| `SFX_DEFEND` | battle | 1 | 320 | -3 | -20.5 | 0.85 | -21.9 | 120 |
| `SFX_HEAL` | magic | 1 | 1000 | -3 | -14.4 | 0.8 | -16.3 | 200 |
| `SFX_SHIELD` | magic | 1 | 700 | -3 | -18.1 | 0.8 | -20 | 200 |
| `SFX_STATUS_POISON` | magic | 1 | 650 | -3 | -16 | 0.8 | -17.9 | 300 |
| `SFX_VICTORY` | stinger | 1 | 2450 | -3 | -18.3 | 0.8 | -20.3 | 2000 |
| `SFX_DEFEAT` | stinger | 1 | 2450 | -3 | -15.3 | 0.8 | -17.3 | 2000 |
| `SFX_MAGIC_TORVAN` | magic | 1 | 950 | -3 | -17.6 | 0.8 | -19.6 | 200 |
| `SFX_MAGIC_VELTHIA_CAST` | magic | 1 | 900 | -3 | -17.4 | 0.75 | -19.9 | 200 |
| `SFX_MAGIC_VELTHIA_SHIELD` | magic | 1 | 1150 | -3 | -15.2 | 0.75 | -17.7 | 250 |
| `SFX_MAGIC_VELTHIA_HEAL` | magic | 1 | 1200 | -3 | -15.2 | 0.75 | -17.7 | 250 |
| `SFX_CHRONOLITH_CHARGE` | magic | 1 | 1200 | -3 | -17.6 | 0.85 | -19 | 300 |
| `SFX_CHRONOLITH_STRIKE` | magic | 1 | 1000 | -3 | -15.3 | 1 | -15.3 | 300 |
| `SFX_CHRONOLITH_TEMPORAL` | magic | 1 | 1200 | -3 | -15.6 | 0.85 | -17 | 300 |
<!-- SFX_TABLE_END -->

## Deskripsi, resep sintesis, dan lokasi pemicu

Kolom "lokasi pemicu" yang berisi "wired by lead" dipasang oleh sesi utama (BattleScene/WorldScene); SFX UI dipasang di komponen/scene UI (MenuList, DialogueBox, TitleScene, PauseScene, RpgMenuScene, SaveLoadScene, ShopScene, SettingsScene, ControlsScene, JournalScene).

<!-- SFX_RECIPES_START -->
| id | deskripsi bunyi | resep sintesis | lokasi pemicu |
|---|---|---|---|
| `SFX_UI_MOVE` | Tik lembut tinggi untuk pindah fokus. | Sine 1900Hz turun cepat (exp tau 12ms) + parsial 3800Hz + klik HP 3k; fade 20ms. | MenuList atas/bawah (semua menu), Settings, RpgMenu ganti anggota |
| `SFX_UI_CONFIRM` | Denting kaca dua nada naik (A5 -> E6). | Parsial 1/2/3x (denting) A5 lalu E6 +50ms, peluruhan ~90ms. | MenuList konfirmasi (Title/Pause/Journal), Settings, DialogueBox: pilihan dipilih, SaveLoad: membuka konfirmasi |
| `SFX_UI_CANCEL` | Dua nada segitiga turun lembut (C5 -> G4). | Triangle 523 lalu 392Hz +55ms, LP 1.5-1.8k, tau 50-60ms. | tombol kembali semua overlay UI; item menu nonaktif; aksi RpgMenu/Shop gagal; Batal pada konfirmasi |
| `SFX_UI_SELECT_ITEM` | Petikan kayu-kaca pendek. | FM sine 1320Hz rasio 2, indeks 3 meluruh 20ms + klik tipis. | RpgMenu: perlengkapan dipasang; Journal: catatan dipilih; Shop/SaveLoad: ganti tab; Settings: ubah nilai |
| `SFX_UI_ITEM_USE` | Sapuan naik berkilau lalu denting. | Sine 520->1560Hz exp 110ms swell + noise BP 6.5k + denting 1568Hz +100ms. | RpgMenu: item dipakai / skill dibuka |
| `SFX_UI_SAVE_OK` | Arpeggio denting C6-E6-G6 cepat. | Tiga parsial-denting 1046.5/1318.5/1568Hz berjarak 45ms. | SaveLoadScene: simpan/muat berhasil |
| `SFX_UI_SAVE_FAIL` | Dua dengung rendah disonan (sekunde kecil) turun. | Saw 220+233.1Hz lalu 196+207.7Hz +95ms, LP 900Hz, glide -10%. | SaveLoadScene: simpan/muat gagal |
| `SFX_UI_DIALOGUE_ADVANCE` | Tok kayu rendah sangat pendek dan pelan (sering terdengar). | Sine 520Hz turun cepat tau 11ms + klik LP 4k. | DialogueBox: lanjut halaman/baris |
| `SFX_UI_DIALOGUE_CHOICE` | Dua denting kecil naik (G5 -> B5) saat opsi pilihan dialog bergeser. | Parsial-denting 784Hz lalu 988Hz +35ms. | DialogueBox: opsi pilihan digeser |
| `SFX_UI_SHOP_BUY` | Dua koin logam naik. | FM sine 2349Hz & 3136Hz rasio 3.5 indeks 2.2 meluruh 40ms, +50ms. | ShopScene: beli berhasil |
| `SFX_UI_SHOP_SELL` | Dua koin turun + gesekan kain halus. | FM 3136 -> 2093Hz +50ms + noise BP 1.6k lembut. | ShopScene: jual berhasil |
| `SFX_STEP_GRASS` | Gesekan rumput, empat variasi (pita tengah 2.8-4kHz acak). | Noise BP 2.8-4kHz tau ~28ms + desis HP 5.2k tertunda + gedebuk sine 90->58Hz. | wired by lead: WorldScene |
| `SFX_STEP_DIRT` | Pijakan tanah: gedebuk rendah + kerikil halus, empat variasi. | Noise LP 1-1.6kHz + gedebuk 65-85Hz + klik acak (crackle). | wired by lead: WorldScene |
| `SFX_STEP_STONE` | Ketukan batu: klik tajam + dering batu pendek, empat variasi. | Klik HP 2.5k + parsial batu 0.9-1.7kHz (tau ~28ms) + gedebuk 115->70Hz. | wired by lead: WorldScene |
| `SFX_INTERACT` | Pip lembut naik + denting kecil. | Sine 620->880Hz + denting 1318Hz +50ms + klik. | wired by lead: WorldScene |
| `SFX_CHEST_OPEN` | Derit kayu, klik kait, tiga denting berkilau. | Saw berderit + BP menyapu 500-1400Hz; klik + gedebuk 300Hz; denting 1568/1976/2349Hz; reverb kecil. | wired by lead: WorldScene |
| `SFX_ITEM_PICKUP` | Dua petikan FM cerah naik + kilau. | FM 1175Hz lalu 1760Hz (rasio 2) + noise HP 7k. | wired by lead: WorldScene |
| `SFX_DOOR_OPEN` | Pintu kayu: gedebuk, derit panjang, hembusan udara. | Saw 90->160Hz BP menyapu 350-850Hz + noise LP 1.1k + klik kait. | wired by lead: WorldScene |
| `SFX_PUZZLE_ACTIVATE` | Gerus batu rendah + dering batu + dengung rune. | Noise coklat LP 520Hz AM 14Hz; parsial batu 440Hz tau ~2x; sine 880Hz samar; reverb. | wired by lead: WorldScene |
| `SFX_PUZZLE_SOLVED` | Denyut batu dalam + empat denting naik + akor menggantung. | Thump 90->48Hz + gerus; denting C5-E5-G5-C6; akor sine C-G-C dengan reverb 1.2s. | wired by lead: WorldScene |
| `SFX_BATTLE_TRANSITION_NORMAL` | Sapuan udara naik lalu hantaman rendah. | Noise BP 250->4000Hz Q2.5 swell 450ms + thump 140->45Hz + klik. | wired by lead: BattleScene/WorldScene |
| `SFX_BATTLE_TRANSITION_BOSS` | Dua denyut jantung 62Hz, tumpukan saw naik, hantaman besar. | Sine 62->44Hz x2; saw 110/116.5/164.8Hz LP 200->2600Hz; noise BP + thump 80->34Hz; saturasi + reverb. | wired by lead: BattleScene/WorldScene |
| `SFX_BATTLE_TRANSITION_TEMPORAL` | Gerus batu + kilau lonceng terbalik + tik makin rapat. | Noise coklat LP 300Hz AM 6Hz; lonceng 392/587/880Hz direverb lalu dibalik; 12 tik akselerasi; thump akhir. | wired by lead: BattleScene/WorldScene |
| `SFX_BATTLE_TRANSITION_SCRIPTED` | Lonceng rendah terbalik lalu satu pukulan dalam. | Lonceng 196Hz dibalik (0-450ms) lalu dipukul maju + thump 75Hz; reverb. | wired by lead: BattleScene/WorldScene |
| `SFX_BATTLE_CONFIRM` | Konfirmasi perintah battle: tok berbobot + denting. | Thump 330->190Hz + denting 1175Hz + klik. | wired by lead: BattleScene |
| `SFX_GREATSWORD_SWING` | Sabetan pedang besar: whoosh menanjak lalu mereda. | Noise BP 500->3000->1200Hz Q1.8 swell 170ms + sine 220->110Hz + desis HP 5k. | wired by lead: BattleScene |
| `SFX_GREATSWORD_IMPACT` | Hantaman berat: gedebuk + dering logam + klik. | Thump 160->48Hz + noise LP 900Hz + parsial logam 640Hz + klik HP 3k; saturasi 1.5. | wired by lead: BattleScene |
| `SFX_GROUND_SLAM` | Hantaman tanah: boom sub, retakan, serpihan batu. | Sine 100->32Hz; noise coklat LP 180Hz; klik 0.8-6kHz; crackle serpihan; parsial batu 120Hz; saturasi 1.8; reverb pendek. | wired by lead: BattleScene |
| `SFX_ENEMY_ATTACK` | Cakaran Hollowling: geraman serak + tiga goresan. | Saw FM 180->90Hz BP 1.2k; tiga noise BP 3.2-3.8kHz tau 30ms; thump 140Hz. | wired by lead: BattleScene |
| `SFX_DAMAGE` | Pemain terkena: gedebuk tumpul + dua nada disonan turun. | Thump 120->60Hz + pop noise LP 1.5k + sine 340->180Hz & 360->190Hz. | wired by lead: BattleScene |
| `SFX_ENEMY_DAMAGE` | Musuh terkena: remuk tajam lebih cerah dari DAMAGE. | Noise BP 1.8k tau 35ms + crackle + saw 520->240Hz LP 1.8k + thump 140Hz. | wired by lead: BattleScene |
| `SFX_DEFEND` | Tangkis: denting logam tumpul + gedebuk. | Parsial logam 420Hz (1/2.76/5.4/8.9/11.3x) + thump 100->70Hz + klik. | wired by lead: BattleScene |
| `SFX_HEAL` | Penyembuhan hangat: arpeggio sine naik + kilau. | Sine C5-E5-G5-C6 (+oktaf samar) tau 280ms; pad 261Hz; noise BP 6.5k; reverb. | wired by lead: BattleScene |
| `SFX_SHIELD` | Kubah pelindung: FM menanjak + dering kaca + thunk. | FM 330->660Hz rasio 1.5 indeks 3->0.5; parsial 1320Hz; thump; reverb. | wired by lead: BattleScene |
| `SFX_STATUS_POISON` | Racun: gelembung naik, desis, dengung disonan turun. | 5 sine blip glide naik acak; noise BP 4k; triangle 117/124Hz LP 400Hz turun. | wired by lead: BattleScene |
| `SFX_VICTORY` | Stinger kemenangan (efek, bukan musik): arpeggio lonceng mayor + akor menggantung. | Lonceng MIDI 72/76/79/84/88/91 berjarak ~120ms; akor sine C-G-C-E; lonceng C7; reverb 1.4s. | wired by lead: BattleScene |
| `SFX_DEFEAT` | Stinger kekalahan (efek): empat lonceng gelap turun + dengung rendah. | Lonceng G4-Eb4-C4-G3 LP 2.2k; sine 98/98.7Hz detune; sine 55->41Hz; reverb 1.5s. | wired by lead: BattleScene |
| `SFX_MAGIC_TORVAN` | Sihir alam Torvan: ketukan kayu, gemerisik daun, napas seruling. | Parsial kayu 330Hz (1/2.4/4.1x) + gedebuk; noise BP 4.5k AM daun; sine 587->880Hz + noise BP Q12 (napas); reverb teredam. | wired by lead: BattleScene |
| `SFX_MAGIC_VELTHIA_CAST` | Rapal Velthia: lonceng D6 dengan kilau naik, anggun. | Lonceng 1174.7/1760/2349Hz berjarak ~70ms + desir udara; reverb 1.2. | wired by lead: BattleScene |
| `SFX_MAGIC_VELTHIA_SHIELD` | Perisai Velthia: akor lonceng (D-A-F#-D) + kilau bertremolo. | Empat lonceng; sine 1174.7/1760Hz tremolo 5Hz; noise BP 8k; reverb 1.3. | wired by lead: BattleScene |
| `SFX_MAGIC_VELTHIA_HEAL` | Penyembuh Velthia: denting lembut naik panjang berekor. | Parsial lembut 740/880/1174.7/1480Hz berjarak 140ms + pad 293.7Hz; reverb 1.4. | wired by lead: BattleScene |
| `SFX_CHRONOLITH_CHARGE` | Chronolith mengisi: gerus batu, kilau terbalik, tik makin rapat. | Noise coklat LP 220Hz AM 5Hz; BP 200->650Hz; lonceng 330/495Hz dibalik; 14 tik akselerasi; sine 55->110Hz. | wired by lead: BattleScene |
| `SFX_CHRONOLITH_STRIKE` | Hantaman batu waktu: thump dalam, retak, resonansi, tik pudar. | Sine 80->35Hz; klik 0.6-6kHz; parsial batu 180Hz; noise coklat LP 140Hz; 5 tik deselerasi; saturasi + reverb. | wired by lead: BattleScene |
| `SFX_CHRONOLITH_TEMPORAL` | Distorsi waktu: tik-tok melambat, kilau terbalik, saw jatuh seperti pita berhenti. | 11 tik deselerasi 2400/1800Hz bergantian; lonceng 220/330Hz dibalik; saw 160->40Hz LP 600; gerus; thump. | wired by lead: BattleScene |
<!-- SFX_RECIPES_END -->

Arah desain: sihir alam Torvan = udara/kayu (ketukan kayu, gemerisik daun, napas seruling); Velthia = lonceng/denting anggun (parsial inharmonik + reverb); Chronolith/temporal = gerus batu rendah + kilau lonceng terbalik + tik jam yang mempercepat/memperlambat (bukan laser generik).

## AudioManager (ringkas)

- `audio.playSfx(id, {volume?, rate?}): SfxResult` — `'playing'` atau alasan senyap (`silent_locked`, `silent_unknown_track`, `silent_not_loaded`, `silent_muted`, `silent_rate_limited`, `silent_voice_cap`, `silent_awaiting_composer`). Tidak pernah melempar. `audio.tryPlaySfx(id, opts)` mengembalikan boolean.
- Volume akhir = master x SFX x `gain` cue x `opts.volume`; mute memaksa senyap. Slider/Settings tetap berlaku; tidak ada autoplay sebelum gesture (`unlock()`).
- Pembatasan: `minIntervalMs` per id, maksimal 8 suara bersamaan (`MAX_SFX_VOICES`, berdasarkan durasi cue / rate), variasi dipilih tanpa pengulangan langsung.
- QA: `audio.debug()` -> `{unlocked, activeVoices, totalPlayed, played{id:n}, suppressed{id:{alasan:n}}, lastPlayed, recent[]}`; `audio.resetDebug()`.
- Backend opsional `playSfx(key, volume, rate)`; bila tidak ada, dipakai `playLoop(key, volume, false)` (laju 1).
- Id SFX battle lama (`SFX_GREATSWORD_SWING/IMPACT`, `SFX_GROUND_SLAM`, `SFX_ENEMY_ATTACK`, `SFX_DAMAGE`, `SFX_VICTORY`, `SFX_DEFEAT`) kini diselesaikan dari `SFX_REGISTRY` (`battleSfxRegistry.ts` hanya tampilan kompatibel).

## Batasan

- Kualitas bunyi belum ditinjau manusia; kemungkinan perlu iterasi (resep ada di `catalog.mjs`, ubah parameter lalu regenerasi).
- Laju (`rate`) hanya berlaku bila backend Phaser menerapkannya (lihat catatan untuk lead).
- Tidak ada ducking/mixing dinamis antar kategori; hanya `gain` statis, batas suara, dan interval minimum.


## Pemicu yang dipasang lead (Phase 7)
| Kelompok | Pemicu |
|---|---|
| Langkah | `WorldScene.update` lewat `world/footsteps.ts`: stride 26 px jalan / 22 px lari, langkah pertama segera, senyap saat diam; `SFX_STEP_GRASS/DIRT/STONE` menurut area (forest/liora rumput; forest_edge tanah; aveloria/temple batu). |
| Interaksi | `SFX_INTERACT` saat menekan interaksi pada target; `SFX_CHEST_OPEN`, `SFX_ITEM_PICKUP`; kuil: `SFX_PUZZLE_ACTIVATE` (pilar/cakram/alas), `SFX_PUZZLE_SOLVED`, `SFX_DOOR_OPEN` (gerbang aula). |
| Transisi | `TransitionScene` memainkan `SFX_BATTLE_TRANSITION_{NORMAL,SCRIPTED,BOSS,TEMPORAL}` saat menutup layar. |
| Battle | `BattleScene`: `SFX_BATTLE_CONFIRM`, ayun/dampak (`GREATSWORD_*`, `GROUND_SLAM`, `ENEMY_ATTACK`), `DAMAGE`/`ENEMY_DAMAGE`, `DEFEND`, `HEAL`, `SHIELD`, `STATUS_POISON`, sihir (`MAGIC_TORVAN`, `MAGIC_VELTHIA_{CAST,HEAL,SHIELD}`), `CHRONOLITH_{CHARGE,STRIKE,TEMPORAL}`, `VICTORY`/`DEFEAT`. |

Bukti pemanggilan: `window.__tfbt.audio()` (statistik per id) dan E2E `phase7.mjs`. Kualitas bunyi tetap belum ditinjau manusia.


---

# Phase 8 — Bab IV "The Fate" (23 id, 33 berkas)

Status kualitas: **FUNCTIONAL / AUDIO-REVIEW PENDING — belum ditinjau manusia.** Semua angka di bawah adalah pengukuran objektif; tidak ada klaim bahwa bunyinya "bagus", elegan, atau cocok adegan (itu hanya bisa dinilai Game Director dengan telinga). Pipeline yang sama dengan Phase 7 (`web/scripts/sfx/`, sintesis kode, deterministik, WAV 44,1 kHz mono 16-bit, puncak -3 dBFS). Tidak ada BGM, tidak ada sampel/rekaman pihak ketiga, tidak ada melodi berkelanjutan (bunyi terpanjang 4,4 s, satu sapuan).

- Phase 7 tidak berubah: 53 berkas lama byte-identik (hash dibekukan di `web/tests/unit/fixtures/sfx-phase7-hashes.json`, dijaga tes). Satu-satunya perubahan pada id lama adalah `gain` registry (bukan berkas): `SFX_UI_SHOP_BUY/SELL` 0.6 -> 0.42 (terlalu keras +4,9 dB di atas median UI pada analisis), `SFX_UI_DIALOGUE_ADVANCE` 0.35 -> 0.4 (terlalu pelan -4,6 dB).
- Kategori baru (`SfxCategory`): `world` (Benteng: pintu/segel/Heart/gema/menara), `boss` (aksi Varlgrim dan musuh Bab IV), `meteor`, `aegis`; transisi final memakai `transition`.
- Regenerasi dan analisis: `npm run assets:sfx` (dari `web/`), `node scripts/sfx/analyze.mjs [--patch-doc]`; laporan terukur ada di `docs/production/sprint4/S.md`.

## Arah desain (ringkas)

| Unsur | Arah |
|---|---|
| Staf Varlgrim | Kayu tua berat: resonansi kayu tak harmonik (1/1.58/2.43/3.71x), gedebuk, ketukan lantai batu; ayunan lambat dan rendah (bukan desing pedang). |
| "Dry ticking" temporal | Tik kering halus dan makin renggang (bukan jam dinding/lonceng jam), kilau lonceng terbalik teredam, dengung rendah. Tik tidak pernah terdengar sebagai ritme tetap. |
| Meteor | Tiga potongan: `CHARGE` = gemuruh jauh (telegraf) -> `DESCENT` = raungan membesar -> `IMPACT` = tabrakan besar yang meluruh ke senyap. Lead tidak memutar apa pun ~0,6 s sesudah impact. |
| Perlindungan | Harmonik D-A (D3 A3 D4 A4 D5) masuk bertahap, denting; `STRESS` = tegangan + tiga retakan makin besar; `FADE` = denting turun, lega. Tidak ada sapuan sirene, tidak ada nada alarm. |
| Dunia Benteng | Pintu batu (gerus + hantaman), segel (denting harmonik), Heart (palang berat + lonceng rendah), gema ingatan hangat (akor mengembang), menara runtuh jauh (sangat teredam). |
| Musuh | Riftborn: robekan dan cambuk tipis; Gravorn: hantaman batu gelap, lebih kecil dari `SFX_GROUND_SLAM`. |
| Kelelahan | Variasi (2-3 berkas) pada bunyi yang berulang; interval minimum 150-3000 ms; tidak ada bunyi untuk gerakan kecil; momen tunggal (impact, menara, Heart terbuka) berinterval panjang. |

## Tabel durasi dan loudness (Phase 8)

Dihasilkan otomatis oleh generator.

<!-- SFX_P8_TABLE_START -->
| id | kategori | file | durasi (ms) | puncak (dBFS) | RMS (dBFS) | gain | RMS efektif (dBFS) | interval min (ms) |
|---|---|---|---:|---:|---:|---:|---:|---:|
| `SFX_FORTRESS_DOOR_ANCIENT` | world | 1 | 3000 | -3 | -19.3 | 0.7 | -22.4 | 1500 |
| `SFX_SEAL_ACTIVATE` | world | 1 | 2000 | -3 | -19.6 | 0.7 | -22.7 | 400 |
| `SFX_SEAL_ERROR` | world | 2 variasi | 750-750 | -3 | -19.1..-18.5 | 0.7 | -21.9 | 300 |
| `SFX_ECHO_MEMORY` | world | 1 | 3400 | -3 | -16.8 | 0.7 | -19.9 | 1500 |
| `SFX_HEART_LOCK` | world | 1 | 1900 | -3 | -15.9 | 0.75 | -18.4 | 800 |
| `SFX_HEART_UNSEAL` | world | 1 | 3400 | -3 | -18.8 | 0.7 | -21.9 | 2000 |
| `SFX_TOWER_COLLAPSE_DISTANT` | world | 1 | 4400 | -3 | -17.5 | 0.62 | -21.7 | 3000 |
| `SFX_VARLGRIM_STAFF_SWING` | boss | 2 variasi | 700-700 | -3 | -16.9..-16.4 | 0.85 | -18.1 | 250 |
| `SFX_VARLGRIM_STAFF_IMPACT` | boss | 2 variasi | 1200-1200 | -3 | -19.5..-19.4 | 1 | -19.5 | 200 |
| `SFX_TEMPORAL_BIND` | boss | 2 variasi | 1400-1400 | -3 | -17.1..-17 | 0.8 | -19 | 500 |
| `SFX_TIME_DISTORTION` | boss | 1 | 2200 | -3 | -18.7 | 0.8 | -20.6 | 1000 |
| `SFX_BOSS_PHASE_SHIFT` | boss | 1 | 2200 | -3 | -14.4 | 0.8 | -16.3 | 1500 |
| `SFX_FRACTURE_MARK` | boss | 2 variasi | 1000-1000 | -3 | -17.2..-16.8 | 0.75 | -19.5 | 400 |
| `SFX_METEOR_CHARGE` | meteor | 1 | 2600 | -3 | -18.2 | 0.65 | -21.9 | 1500 |
| `SFX_METEOR_DESCENT` | meteor | 1 | 2000 | -3 | -16.9 | 0.7 | -20 | 1500 |
| `SFX_METEOR_IMPACT` | meteor | 1 | 3600 | -3 | -19.4 | 1 | -19.4 | 3000 |
| `SFX_AEGIS_CAST` | aegis | 1 | 2800 | -3 | -17.5 | 0.8 | -19.4 | 2000 |
| `SFX_AEGIS_FORM` | aegis | 1 | 2200 | -3 | -19.6 | 0.8 | -21.6 | 1000 |
| `SFX_AEGIS_STRESS` | aegis | 2 variasi | 2400-2400 | -3 | -17..-16.5 | 0.75 | -19.3 | 800 |
| `SFX_AEGIS_FADE` | aegis | 1 | 2600 | -3 | -19.2 | 0.75 | -21.7 | 1500 |
| `SFX_RIFTBORN_ATTACK` | boss | 3 variasi | 600-600 | -3 | -17.3..-16.8 | 0.85 | -18.5 | 150 |
| `SFX_GRAVORN_ATTACK` | boss | 3 variasi | 950-950 | -3 | -18.1..-17 | 0.9 | -18.4 | 200 |
| `SFX_BATTLE_TRANSITION_FINAL` | transition | 1 | 1600 | -3 | -18.5 | 0.85 | -19.9 | 1500 |
<!-- SFX_P8_TABLE_END -->

## Deskripsi, resep, dan pemicu yang diharapkan (Phase 8)

Kolom "lokasi pemicu" = pemasangan oleh lead (BattleScene/TransitionScene/WorldScene/Benteng); agen S tidak memasang pemicu.

<!-- SFX_P8_RECIPES_START -->
| id | deskripsi bunyi | resep sintesis | lokasi pemicu |
|---|---|---|---|
| `SFX_FORTRESS_DOOR_ANCIENT` | Pintu batu tua: gerus batu panjang yang berat, berhenti dengan satu hantaman dalam dan debu halus. Beda dari SFX_DOOR_OPEN (kayu). | Noise coklat LP 240Hz AM 3Hz swell 0.7s + noise pink BP 150->430Hz Q3; parsial batu 62Hz; thump 95->38Hz + parsial batu 110Hz di 1.9s; crackle LP; reverb 1.6. | lead: Benteng Penjaga: gerbang batu kuno terbuka (Gerbang Luar, pintu ke Ruang Heart, pintasan Koridor Retakan) |
| `SFX_SEAL_ACTIVATE` | Segel menyala: denting terbalik, dengung kuinta dua nada bertremolo pelan, klik batu, tiga denting harmonik (E5 A5 E6). Anggun, bukan alarm. | Lonceng 440Hz dibalik; hum sine 220+330Hz tremolo 4.5Hz; klik + thump 140Hz; lonceng 659/880/1318Hz berurutan; reverb 1.2. | lead: Ruang Uji Segel / Benteng: segel rune diaktifkan (pilar/alas/penyelarasan) |
| `SFX_SEAL_ERROR` | Penolakan tumpul: dua nada segitiga disonan (sekunde kecil) turun, redam LP 700Hz, ketukan batu. Tidak tajam; dua variasi. | Triangle f & f*1.059 glide -12%, LP 700Hz tau 100ms; klik + thump 160Hz; parsial batu 330Hz; f=190Hz (+1.5 semiton variasi 2); reverb kecil. | lead: Benteng: urutan segel/teka-teki salah (satu kali per percobaan, bukan per langkah) |
| `SFX_ECHO_MEMORY` | Gema ingatan hangat: akor D-A-D-F# berdetune halus yang mengembang, denting terbalik lalu satu denting lembut, napas udara. Satu sapuan, bukan melodi. | Sine 293.66/440/587.33/740Hz (+detune 0.3%) swell 1s LP 2.4k; lonceng 587Hz terbalik; lonceng 880Hz; noise BP 1.8k; reverb 1.6 wet 0.35. | lead: Ruang Gema: menyentuh objek kuno (dua objek, C4-05); pusaka Velthia bergema di Arsip |
| `SFX_HEART_LOCK` | Pengunci Heart terpasang: klik palang berat, hantaman batu, lonceng rendah E3 dan dengung 82Hz. | Klik BP + thump 150->70Hz + parsial batu 110Hz tau x4; lonceng 164.8/329.6Hz; sine 82.4Hz; reverb 1.4. | lead: Ruang Heart: setiap pengunci Heart ditahan (Yaric, Velthia; dua kali per adegan) |
| `SFX_HEART_UNSEAL` | Heart terbuka: mekanisme batu menggerus, enam denting harmonik menaik, akor lembut, hantaman dalam dan denting hangat penutup. | Noise coklat LP 260Hz AM 6Hz; lonceng D4-A4-D5-F#5-A5-D6 berjarak 180ms; hum 4 sine; thump 70->34Hz + klik + parsial batu di 1.55s; lonceng 587Hz; reverb 1.6. | lead: Ruang Heart: kedua pengunci dibuka bersama (C4 heartOpen) |
| `SFX_TOWER_COLLAPSE_DISTANT` | Runtuhnya menara dari jauh: gemuruh coklat sangat teredam, empat dentum jauh yang makin kecil, serpihan samar. Disengaja redam dan "jauh" (gain rendah). | Noise coklat LP 140->90Hz swell 1.2s; empat thump 62->30Hz LP 140Hz (1/0.8/0.55/0.35); crackle LP 900Hz; sine 70->45Hz; reverb 2.0 lalu LP 480Hz. | lead: jendela busur Ruang Heart ke Aveloria (C4-04): menara runtuh dari kejauhan; sekali |
| `SFX_VARLGRIM_STAFF_SWING` | Ayunan staf kayu besar: whoosh rendah menanjak 260->1300Hz lalu meredup, derit kayu, badan sine rendah. Lebih berat dan lambat dari SFX_GREATSWORD_SWING. | Noise BP 260->1300->520Hz Q1.3 swell 300ms + sine 150->80Hz + saw BP derit; dua variasi (badan 150/162Hz). | lead: BattleScene: keeper_strike / fracture_strike (anticipation -> swing), satu kali per ayunan; dua variasi |
| `SFX_VARLGRIM_STAFF_IMPACT` | Hantaman kayu tua: gedebuk, resonansi kayu (parsial 170Hz), retak kayu, ketukan lantai batu. "Wood impact" dari SKILLS_AND_BOSSES. | Thump 130->42Hz + parsial kayu 170Hz (1/1.58/2.43/3.71x) + noise BP 900Hz + klik + parsial batu 95Hz; saturasi 1.4; reverb kering 0.6. | lead: BattleScene: kontak staf (keeper_strike / fracture_strike), sekali di kontak, bukan di telegraf |
| `SFX_TEMPORAL_BIND` | "Dry ticking" halus: tongkat ditanam (gedebuk + kayu), sembilan tik kering makin renggang, kilau lonceng terbalik teredam, dengung rendah. Bukan jam dinding. | Thump 110->60Hz + parsial kayu; 9 tik deselerasi 1.5kHz HP 1.8k amp 0.35; lonceng 330/495Hz terbalik LP 2.2k; sine 82->70Hz. | lead: BattleScene: time_bind / saat status ikatan temporal menempel pada target (sekali) |
| `SFX_TIME_DISTORTION` | Distorsi waktu: saw jatuh seperti pita berhenti, sapuan noise turun, tik tidak beraturan melambat, kilau terbalik, denyut sub 5Hz, hantaman penutup. | Saw 330->55Hz LP 1.8k turun; noise BP 3.5k->300Hz; 10 tik deselerasi + jitter; lonceng 220/311/466Hz terbalik; sine 60Hz AM 5Hz; thump. | lead: BattleScene: distortion_wave (seluruh barisan; fase 2); juga seal_pulse bila perlu |
| `SFX_BOSS_PHASE_SHIFT` | Pergeseran fase: sapuan naik, gong rendah 98Hz, retak pendek, satu tik terakhir lalu hening. | Noise BP 400->2500Hz swell 450ms; lonceng 98Hz tau x3; klik; thump 75->36Hz; satu tik di 1.35s; reverb 1.4. | lead: BattleScene: phase_shift (jeda transisi fase 1->2 dan 2->3, tanpa damage) |
| `SFX_FRACTURE_MARK` | Penanda retakan: sapuan sine naik, retak kaca kering, denting tinggi, dua tik; dua variasi. | Sine 500->1900Hz; crackle BP; parsial 1568/1608Hz; dua tik 1.8kHz; thump 200Hz; reverb kecil. | lead: BattleScene: fracture_mark menandai target (fase 2); sekali per penandaan |
| `SFX_METEOR_CHARGE` | Gemuruh jauh: staf diangkat (derit kayu), gemuruh coklat membesar pelan, sub 40->62Hz dengan harmonik, desir angin tipis. "Distant rumble" tanpa melodi. | Noise coklat LP 110->200Hz swell 1.6s; sine 40->62Hz + 80->124Hz; noise BP 500->900Hz; saw BP derit; reverb 1.8 teredam. | lead: BattleScene: meteor_call / meteor_hold (telegraf, langit ditahan); sekali per panggilan dan sekali per hold |
| `SFX_METEOR_DESCENT` | Meteor jatuh: raungan pink noise yang LP-nya membuka 250->2500Hz, sub menanjak, serpihan terbalik, desing sempit tipis; berakhir keras lalu dipotong (fade 80ms) untuk disambung tabrakan. | Noise pink LP 250->2500Hz amplop kuadrat 1.75s; sine 45->90Hz; crackle terbalik; noise BP 700->2200Hz Q6 tipis. | lead: BattleScene: meteor_fall fase jatuh (kamera mengikuti); langsung disambung SFX_METEOR_IMPACT |
| `SFX_METEOR_IMPACT` | Tabrakan besar: klik penuh-pita, boom sub 85->24Hz, gemuruh coklat, batu bergema, serpihan; ekor sengaja meluruh ke senyap pada 0.9 s terakhir. | Klik 0.4-7k; sine 85->24Hz tau 450ms; noise coklat LP 160Hz tau 700ms; parsial batu 70Hz x6; crackle; noise BP; saturasi 2.0 + reverb 1.8; amplop meluruh ke 0 mulai 2.4s. | lead: BattleScene: meteor_fall dampak. JANGAN memutar SFX apa pun ~0.6 s sesudahnya ("keheningan" aftermath); mulai SFX_AEGIS_STRESS di dampak bila perisai menahan |
| `SFX_AEGIS_CAST` | Perlindungan dirapal: lima lapis sine harmonik (D3-A3-D4-A4-D5) masuk bertahap dan mengembang, kilau udara, lalu satu denting D5/A5 saat muatan penuh. Bukan sapuan sirene. | Lima sine harmonik (detune 0.4%) masuk berjarak 300ms, swell 0.8s; noise BP 6k tipis; lonceng 587/880Hz di 1.65s + thump 90Hz; reverb 1.3. | lead: BattleScene: velthia_aegis (antisipasi -> muatan); sekali per cast |
| `SFX_AEGIS_FORM` | Perisai terbentuk: dengung D3/A3 lebar, empat denting D5-F#5-A5-D6, kilau bertremolo 3Hz, hantaman lembut penutup. Beda dari SFX_MAGIC_VELTHIA_SHIELD (ward). | hum sine 146.8+220Hz; lonceng 587/740/880/1175Hz berjarak 40ms; sine 880/1318Hz tremolo 3Hz; thump 110->62Hz; reverb 1.5. | lead: BattleScene: pembentukan perisai (sesudah SFX_AEGIS_CAST); sekali |
| `SFX_AEGIS_STRESS` | Perisai menahan: tegangan resonan (dua pasang sine berdetune, tremolo 7Hz), tekanan sub, tiga retakan kaca makin besar (klik + denting + gedebuk). Terasa berat namun tidak melengking. | Sine 220/222.6/330/334Hz AM 7Hz LP 900Hz; sine 55->48Hz + noise coklat LP 180Hz; tiga retakan di 0.2/0.75/1.3s (1568/1480/1397Hz) amp 0.4/0.6/0.85; reverb 1. | lead: BattleScene: perisai menahan dampak meteor (retak bertingkat); mulai di dampak, sekali; dua variasi |
| `SFX_AEGIS_FADE` | Perisai memudar: empat denting turun (D6-A5-D5-A4), kilau meluruh, dengung jatuh 294->147Hz, reverb panjang. Lega, hangat. | Lonceng 1175/880/587/440Hz berjarak 200ms; noise HP 7k meluruh; sine 294->147Hz; reverb 1.6 wet 0.38. | lead: BattleScene: perisai memudar sesudah aftermath meteor; sekali |
| `SFX_RIFTBORN_ATTACK` | Cambuk retakan: robekan saw-FM menanjak, desis noise 1.2->6kHz, serpihan retak, hantaman ringan, turunan disonan. Lebih tipis dan cepat dari SFX_ENEMY_ATTACK. | Saw FM 380->1100Hz BP menyapu; noise BP 1.2->6kHz; crackle; thump 170->90Hz; sine 700->300Hz; tiga variasi (nada awal +40Hz). | lead: BattleScene: Riftborn rift_lash / rift_surge (kontak, sekali); tiga variasi karena sering muncul |
| `SFX_GRAVORN_ATTACK` | Hantaman raksasa batu: dengus rendah, gedebuk 95->36Hz, dering batu, gemuruh coklat, serpihan. Lebih kecil dan gelap dari SFX_GROUND_SLAM. | Noise coklat LP 300Hz swell; thump 95->36Hz; parsial batu 140Hz x1.6; noise coklat LP 200Hz; klik; crackle; saturasi 1.4; reverb 0.7. | lead: BattleScene: Gravorn gravorn_heave / gravorn_crush (kontak, sekali); tiga variasi |
| `SFX_BATTLE_TRANSITION_FINAL` | Transisi final: gong rendah terbalik, dua denyut lambat 58Hz, tumpukan sine rendah D2-A2-D3-A3 mengembang, lalu staf kayu ditanam (hantaman dalam + resonansi kayu). | Lonceng 98Hz tau x2.2 dibalik; dua thump 58->40Hz; hum 73/110/147/220Hz; parsial kayu 140Hz + thump 90->32Hz + klik di 1.0s; reverb 1.3. | lead: TransitionScene kategori `final` (masuk battle Varlgrim): menutup layar |
<!-- SFX_P8_RECIPES_END -->

## Urutan pemicu yang disarankan (lead)

| Momen | Urutan |
|---|---|
| Masuk battle Varlgrim | `SFX_BATTLE_TRANSITION_FINAL` (kategori `final`). |
| Ayunan staf (`keeper_strike`/`fracture_strike`) | `SFX_VARLGRIM_STAFF_SWING` di akhir antisipasi -> `SFX_VARLGRIM_STAFF_IMPACT` di kontak (satu kali per target). |
| `time_bind` / `seal_pulse` / `distortion_wave` / `fracture_mark` | `SFX_TEMPORAL_BIND` / (`SFX_TEMPORAL_BIND` atau `SFX_TIME_DISTORTION`) / `SFX_TIME_DISTORTION` / `SFX_FRACTURE_MARK`. |
| `phase_shift` | `SFX_BOSS_PHASE_SHIFT` (jeda tanpa damage). |
| `meteor_call` -> `meteor_hold` | `SFX_METEOR_CHARGE` saat call; saat hold cukup sekali lagi pada pengulangan pertama (interval minimum 1,5 s mencegah tumpukan). |
| `velthia_aegis` | `SFX_AEGIS_CAST` (antisipasi -> muatan, ~2,6 s) -> `SFX_AEGIS_FORM` (perisai terbentuk). |
| `meteor_fall` | `SFX_METEOR_DESCENT` (~2,0 s) -> `SFX_METEOR_IMPACT` (saat dampak) + `SFX_AEGIS_STRESS` bersamaan bila perisai menahan -> keheningan ~0,6 s -> `SFX_AEGIS_FADE` pada pemulihan. |
| Musuh Bab IV | `SFX_RIFTBORN_ATTACK` / `SFX_GRAVORN_ATTACK` di kontak (bukan di telegraf). |
| Dunia | `SFX_FORTRESS_DOOR_ANCIENT` (gerbang/pintasan), `SFX_SEAL_ACTIVATE` / `SFX_SEAL_ERROR` (satu kali per percobaan), `SFX_ECHO_MEMORY` (objek Ruang Gema), `SFX_HEART_LOCK` x2 -> `SFX_HEART_UNSEAL`, `SFX_TOWER_COLLAPSE_DISTANT` (C4-04). |
