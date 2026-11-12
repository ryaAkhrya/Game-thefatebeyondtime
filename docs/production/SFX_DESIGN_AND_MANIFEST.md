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
| `SFX_UI_DIALOGUE_ADVANCE` | ui | 1 | 55 | -3 | -15.1 | 0.35 | -24.2 | 60 |
| `SFX_UI_DIALOGUE_CHOICE` | ui | 1 | 100 | -3 | -13.9 | 0.45 | -20.9 | 60 |
| `SFX_UI_SHOP_BUY` | ui | 1 | 200 | -3 | -14.1 | 0.6 | -18.5 | 100 |
| `SFX_UI_SHOP_SELL` | ui | 1 | 190 | -3 | -14 | 0.6 | -18.4 | 100 |
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
