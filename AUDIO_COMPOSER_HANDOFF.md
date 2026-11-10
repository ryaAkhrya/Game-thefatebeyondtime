# Composer handoff — Game Director authored music only

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
