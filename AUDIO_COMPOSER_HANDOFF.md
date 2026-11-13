# Composer handoff — Game Director authored music only

## Phase 9 — Modern Interlude / cliff / credits (brief only, AWAITING_COMPOSER)

No BGM was made, chosen, downloaded or added. Existing cue IDs/statuses remain unchanged. These are suggestions for user-authored composition, not delivered tracks. Both public/private stories work silently.

| Moment | Existing cue / approximate tempo | Mood, instrumentation and loop needs |
|---|---|---|
| Era card → modern walk | `BGM_MODERN`, 70–94 BPM | Ordinary warmth, spare keys/plucked support; little fantasy ornament; 50–75 s seamless loop; after first gesture |
| Artefact discovery | Same cue, thinning pulse | Give engraving space; no sci-fi sting; tolerate arbitrary player dwell |
| Archive / heirloom / Heart fragments | Same cue or silence | One soft mallet/string voice; player-paced 2–6 s fragments, no chapter recap or mandatory hits |
| Awakening | `BGM_MODERN`, 70–84 BPM | Recognition, not shock; quiet fantasy interval if wanted; no portal crescendo |
| Cliff memory / promise | `BGM_EPILOGUE`, 68–86 BPM | Warm, slightly tired; restrained strings/plucked voice, room for humour/silence; 70–100 s optional loop |
| Clouds → To Be Continued | Epilogue tail or silence | Simplify to two voices; no triumph fanfare; title holds at least 3 s, then waits for input |
| Credits | `BGM_CREDITS`, 70–92 BPM | Light closure, spare reprise; 60–100 s optional loop; fade safely when skipped |
| Private P.S. | Silence by default or approved credits tail | Length unknown; no new cue or invented personal song/date; finish without forced timing |

Only existing original `SFX_ECHO_MEMORY` is reused at the first fragment (multiplier 0.28/rate 0.8), through AudioManager Master/SFX/mute. No new sound file. Ending dialogue navigation is silent. Human listening review remains pending.

## Phase 8 — Chapter IV (Benteng, Varlgrim, Heart of Time): brief BGM, TIDAK dibuat

Phase 8 tidak membuat atau memuat BGM apa pun (tidak ada file `BGM_*`; game berjalan senyap). Semua cue di bawah **AWAITING_COMPOSER**. Nama cue memakai registry yang sudah ada (`MUSIC_REGISTRY.json`); dua cue tambahan opsional ditandai *usulan* dan BELUM ada di registry (Game Director/komposer yang memutuskan).

| Momen (kode) | Cue registry | Arahan untuk komposer |
|---|---|---|
| Benteng Penjaga: eksplorasi (area `fortress`) | `BGM_CRISIS` (dipakai ulang sampai ada cue khusus) atau *usulan* `BGM_FORTRESS` | Tua, berat, sepi; ostinato rendah dan satu dentang lonceng retak yang terlambat. Bukan horor, bukan aksi. Loop 60–90 s. |
| Encounter Benteng (Riftborn, Gravorn, Oathguard) | `BGM_BATTLE` | Tidak ada perubahan; tempo battle biasa. |
| Ruang Uji Segel (tutorial Perlindungan) | `BGM_BOSS` atau diam | Tekanan terukur, belajar sambil bermain; boleh senyap. |
| Varlgrim: konfrontasi (C4-02) | `BGM_FINAL_BOSS` mulai halus | Tragis, bukan marah: tekad yang tertahan. |
| Varlgrim: battle fase 1–2 | `BGM_FINAL_BOSS` | Disiplin penjaga waktu: perkusi terkendali, senar rendah; fase 2 menambah distorsi tempo halus (bukan kekacauan). |
| Varlgrim: meteor (`meteor_call` → `meteor_fall`) | `BGM_FINAL_BOSS` | **Jeda singkat disengaja**: musik menipis saat langit ditahan, hening sesaat setelah tabrakan, lalu kembali. Registry sudah mencatat "intentional brief silence after meteor". SFX meteor/Perlindungan sudah ada dan tidak boleh tertutup musik. |
| Heart dibuka bersama (C4-04) | `SILENCE` (SCENE_DIRECTION: diam yang disengaja) | Tanpa musik; hanya SFX Heart dan debu menara dari jauh. |
| Ingatan Aveloria (C4-05) | *usulan* `BGM_HEART_ECHO` atau `BGM_CRISIS` | Sunyi, lega, sedikit takut kehilangan lagi; satu motif lembut yang hanya terdengar di ruang gema ini. |
| Varlgrim dan Torvan (C4-06) | `BGM_CRISIS` mereda / diam | Tidak ada musik ilahi untuk pengakuan Torvan. |
| Kembali ke Aveloria (C4-07) | `BGM_AVELORIA_DAY` versi tenang atau `BGM_CRISIS` | Warga selamat dengan luka; hangat tetapi letih. |

Aturan: tidak ada musik "pahlawan" yang menang besar; Bab IV berakhir sebelum Modern Interlude (`BGM_MODERN`) dan Epilog (`BGM_EPILOGUE`), yang belum dikerjakan. SFX Phase 8 asli dari kode tercatat di `docs/production/SFX_DESIGN_AND_MANIFEST.md`.

## Phase 7 — SFX asli dan BGM Bab III

Phase 7 mengotorisasi **SFX ORIGINAL** yang disintesis dari kode (44 id, `web/public/assets/audio/sfx/`, lihat `docs/production/SFX_DESIGN_AND_MANIFEST.md`). Itu BUKAN musik dan tidak menggantikan pekerjaan komposer: **tidak ada BGM yang dibuat/dimuat**. Cue BGM berikut tetap **AWAITING_COMPOSER**: `BGM_TEMPLE` (puzzle kuil, berhenti untuk Chronolith; sudah di registry), `BGM_BOSS` (Chronolith memakai cue boss yang sama), serta suasana Aveloria krisis (memakai `BGM_AVELORIA_DAY`; komposer dapat menentukan varian). Kualitas SFX asli belum didengar manusia; komposer/Game Director dapat mengganti file SFX mana pun dengan nama id yang sama tanpa perubahan kode.

## Phase 6 — Chapter II

Liora, Hutan 2, Torvan dan Veyrath tetap **AWAITING_COMPOSER**. Implementasi memakai ID BGM/SFX yang sudah didaftarkan sebagai placeholder senyap; tidak ada file dibuat, diunduh, disintesis atau dimasukkan. Perpindahan suasana dan telegraph battle tetap terbaca lewat sprite/teks tanpa audio. Komposer/Game Director dapat meninjau cue berikut pada sesi audio terpisah; nama final dan file tetap menunggu keputusan mereka.

## Phase 5 — Aveloria dan dua dentang

Semua kebutuhan tetap **AWAITING_COMPOSER**. Tidak ada musik/SFX dibuat, diunduh, disintesis atau dimasukkan. `BGM_AVELORIA_DAY` memakai registry existing; tidak menambah BGM duplikat. Boot hanya meminta file READY. Lonceng wajib terbaca lewat sprite, jarum tetap dan teks meskipun seluruh audio belum tersedia.

| Filename / status | Penempatan dan mood | Tempo / instrumen / loop |
|---|---|---|
| `BGM_AVELORIA_DAY.ogg` (registry existing) | Gerbang, jalan, pasar, arsip, halaman dan audiensi; kehangatan warga dengan wibawa yang tenang | 88–106 BPM, 60–90 detik; woodwind ringkas, plucked/chip pulse, bass lembut. Loop seamless. Jangan dominasi dialog |
| `SFX_AVELORIA_BELL.ogg` (permintaan spesifikasi, belum runtime READY) | Satu dentang menara; cue yang sama dipakai dua kali dalam C1-09, dengan ruang hening di antaranya; bukan stinger horor | Nonmusikal/tanpa BPM; satu bell 16-bit dengan decay sekitar 2–4 detik, satu-shot, tanpa loop. Nada sama pada kedua dentang; tidak meniru glitch digital |
| `SFX_FOOTSTEP_STONE.ogg` (permintaan spesifikasi) | Langkah di jalan batu kerajaan; halus, tidak mengalahkan input/dialog | Nonmusikal, pendek/kering, chip/noise lembut, tanpa loop kontinu |
| `SFX_UI_MOVE.ogg`, `SFX_UI_CONFIRM.ogg`, `SFX_UI_BACK.ogg` (existing handoff) | Navigasi toko dan menu existing | Pendek, tenang, one-shot; patuh Master/SFX/Mute |

BGM existing dihentikan saat momen lonceng; tidak ada track malam baru. Kedua dentang belum memanggil file SFX yang belum dibuat. Sesudah file komposer tersedia, tambahkan cue READY dengan timing di action `cityBell`, tanpa menghapus teks visual. Mix dan kualitas audio terdengar memerlukan review manusia.

## Phase 4 — Mournfang dan akhir vertical slice

Semua cue tetap **AWAITING_COMPOSER**. Tidak ada audio dibuat, diunduh, disintesis atau dimasukkan. Tidak ada track duplikat; game tetap playable dalam silent fallback.

| Kebutuhan | Registry/file existing | Penempatan dan arah |
|---|---|---|
| Forest ambience | `BGM_FOREST_01.ogg` | Hutan 1 dan tepi hutan; ruang ringan, berhenti sebelum battle |
| Normal battle | `BGM_BATTLE.ogg` | Hollowling, mulai sesudah transisi, berhenti saat hasil |
| Boss Mournfang | `BGM_BOSS.ogg` | B01, tekanan ritmis yang memberi ruang untuk membaca tanda serangan |
| Boss anticipation | tidak menambah BGM | Tanda visual/teks wajib cukup tanpa audio. Variasi bunyi gesekan kaki/ranting dapat dipertimbangkan komposer; tidak menggantikan peringatan visual |
| Damage/serangan boss | `SFX_ENEMY_ATTACK.ogg`, `SFX_DAMAGE.ogg` | Sekali di kontak, bukan saat telegraph; tidak memotong BGM |
| Victory | `SFX_VICTORY.ogg` | Sesudah recovery; singkat, tidak merayakan kematian hewan secara megah |
| Defeat/retry | `SFX_DEFEAT.ogg` | Result kalah; retry kembali ke cue boss |
| Transisi akhir demo | cue hutan existing lalu sunyi | Berhenti di penutup menuju Aveloria; bukan ending Chapter I/kredit anniversary |

Mix di bawah dialog. Screen Shake OFF dan Reduced Flashes ON tidak boleh menghilangkan tanda serangan. Penilaian audio terdengar menunggu file user dan review; implementasi tidak meminta audio yang belum READY.

## Phase 3 UI — spesifikasi saja

Status/Inventaris/Perlengkapan/Jurus/Simpan-Muat/toko reusable dapat memakai cue existing `SFX_UI_MOVE.ogg`, `SFX_UI_CONFIRM.ogg`, `SFX_UI_BACK.ogg` (pendek, kering, tenang; tidak menutupi teks). Tidak dibuat file, sintesis, placeholder audio, atau track duplikat. Semua tetap AWAITING_COMPOSER/silent fallback. Belum ada penilaian audio terdengar.

## Phase 2 — battle handoff (10 November 2026)

Tidak ada file audio yang ditambahkan. BGM battle memakai ID/file existing `BGM_BATTLE` / `BGM_BATTLE.ogg`, tetap AWAITING_COMPOSER. Registry SFX baru `web/src/game/data/battleSfxRegistry.ts` menyediakan cue di bawah; semuanya AWAITING_COMPOSER. Boot tidak meminta audio ini sebelum status READY dan file komposer tersedia. AudioManager memakai Master × SFX, Bisukan, gesture browser, dan one-shot tanpa loop.

| File | Titik pemanggilan |
|---|---|
| `SFX_GREATSWORD_SWING.ogg` | Yaric bersiap/mengayunkan greatsword |
| `SFX_GREATSWORD_IMPACT.ogg` | Basic Attack contact, sekali |
| `SFX_GROUND_SLAM.ogg` | Frame `slab_strikes`, sekali |
| `SFX_ENEMY_ATTACK.ogg` | Hollowling attack contact |
| `SFX_DAMAGE.ogg` | Respons damage, tanpa mengambil alih musik |
| `SFX_VICTORY.ogg` | Recovery selesai, victory menu |
| `SFX_DEFEAT.ogg` | Defeat menu |

Nama SFX ini baru karena registry sebelumnya hanya memuat BGM dan permintaan SFX eksplorasi/UI. Tidak ada nama track BGM duplikat, placeholder otomatis, unduhan, atau audio sintetis. Mix/grip timing/audio terdengar menunggu komposisi dan review user.

**No music files are included.** Every cue below is `AWAITING_COMPOSER`. Claude Code must request the user's own `.ogg` files, never choose/generate/download generic or stock music. Game must work silently, with nullable audio keys and no console errors. BPM and lengths are suggestions, not composition requirements.

| File requested | Scene and cue start/stop | Emotion and 16 bit palette | BPM / duration | Loop | Priority |
|---|---|---|---|---|---|
| `BGM_TITLE.ogg` | Title after user input; fade on New Game | quiet invitation; soft synth, piano-like lead | 76–92 / 45–70 s | yes | P1 |
| `BGM_FOREST_01.ogg` | Chapter I forest; stop entering battle | curiosity, uncertainty; plucked tone, low strings | 82–100 / 60–90 s | yes | P1 |
| `BGM_AVELORIA_DAY.ogg` | Town/castle safe areas; pause on major crisis | inhabited warmth; compact woodwind, soft pulse | 88–106 / 60–90 s | yes | P1 |
| `BGM_BATTLE.ogg` | Normal encounters after input; stop on result | clear tempo, brief motif; chip percussion and bass | 124–146 / 50–75 s | yes | P1 |
| `BGM_BOSS.ogg` | B01–B03 encounters | pressure without clutter; pulse, low strings | 116–140 / 65–100 s | yes | P2 |
| `BGM_LIORA.ogg` | Liora village; fade on forest exit | history and hospitality; winds and plucked lead | 72–92 / 60–90 s | yes | P2 |
| `BGM_FOREST_02.ogg` | Chapter II second forest | mischief under uneasy discovery; pizzicato/chip | 90–110 / 60–90 s | yes | P2 |
| `BGM_CRISIS.ogg` | Chapter III evacuation, fade as quest shifts | focused urgency; low ostinato, spare bell | 94–120 / 55–80 s | yes | P2 |
| `BGM_TEMPLE.ogg` | Temple puzzle; stop for Chronolith | age and mechanism; hollow mallet, pulse | 76–98 / 60–90 s | yes | P2 |
| `BGM_FINAL_BOSS.ogg` | Varlgrim fight; intentional brief silence after meteor | tragic resolve; constrained percussion/strings | 100–128 / 80–110 s | yes | P2 |
| `BGM_MODERN.ogg` | Interlude after Chapter IV | ordinary closeness; gentle keys, less fantasy timbre | 70–94 / 50–75 s | yes | P3 |
| `BGM_EPILOGUE.ogg` | Aveloria cliff memory after modern; fade into credits | restrained affection; reprise of earlier motif | 68–86 / 70–100 s | optional | P3 |
| `BGM_CREDITS.ogg` | Credits after To Be Continued | light closure, room for private P.S. silence | 70–92 / 60–100 s | optional | P3 |

Export stereo OGG; seamless loops need exact loop boundaries and a short tail policy specified by composer. Implementation triggers only on user gesture per browser restrictions. Keep master/BGM/SFX sliders and mute. Mix music under dialogue and SFX; no background audio in intentional silence after final impact or before intimate dialogue if direction asks. SFX are future separate user-approved work and no BGM substitutes.

## SFX Phase 1 — permintaan, TIDAK diisi otomatis

Tidak ada SFX yang dibuat, diunduh, atau disintesis. Game berjalan senyap. Bila Anda ingin mengisi, berikut kebutuhan (nama file diusulkan; semua tunduk pada slider SFX/Master dan Bisukan):

| File yang diminta | Dipakai saat | Karakter |
|---|---|---|
| `SFX_FOOTSTEP_GRASS.ogg` | langkah di rumput (varian pendek) | lembut, kering, tidak mencolok |
| `SFX_FOOTSTEP_DIRT.ogg` | langkah di jalan tanah | sedikit lebih berat dari rumput |
| `SFX_UI_MOVE.ogg` | pindah fokus menu/pilihan | klik kecil, pendek |
| `SFX_UI_CONFIRM.ogg` | konfirmasi menu/interaksi | pendek, hangat |
| `SFX_UI_BACK.ogg` | kembali/batal | pendek, lebih rendah dari confirm |
| `SFX_DIALOGUE_BLIP.ogg` | tiap beberapa karakter typewriter (opsional) | sangat pendek, netral |
| `SFX_SIGN_READ.ogg` | membaca papan | gesekan kayu ringan |
| `SFX_CHEST_OPEN.ogg` | membuka peti | engsel kayu + klik logam |
| `SFX_BRUSH_RUSTLE.ogg` | semak terbuka setelah pengulangan disadari | gemerisik daun halus, tanpa efek ajaib |
| `SFX_ITEM_GET.ogg` | "Mendapat 1 Potion." | pendek, jelas, bukan fanfare |

Untuk hutan: `BGM_FOREST_01.ogg` (sudah di tabel utama di atas) tetap `AWAITING_COMPOSER`.
