# PHASE 2 REPORT — Turn-Based Combat

Tanggal: **10 November 2026** (Asia/Jakarta). **PHASE 2: PARTIAL — playable; gate visual sumber/review manusia belum selesai.**

## A. Status dan scope

Title → Mulai Baru → C1-01 → Nambo C1-02 → jalur berulang C1-03 → Hollowling C1-04 → battle → victory kembali ke eksplorasi, atau defeat → Coba Lagi. Akhir demo Phase 1 diganti dengan encounter scripted. Tidak ada random encounter, Mournfang, C1-05, chapter berikut, EXP/leveling/shop/skill tree/save gameplay, musik otomatis atau deployment.

Status PARTIAL tidak berarti game belum dapat dimainkan. Gate visual belum dapat diberi PASS penuh karena potongan pedang/piksel tepi sudah ada di atlas sumber v3.3, serta review artist/Game Director dan playtest manusia belum dilakukan. Tidak ada upaya menggambar ulang desain approved atau mengubah cerita untuk menutup keterbatasan itu.

## B. Audit dan baseline sebelum perubahan

Membaca CLAUDE/RULES/README/GDD/GAME_SYSTEMS/SKILLS_AND_BOSSES/FULL_STORY/PHASES/TASKS/QA_CHECKLIST/ASSET_MANIFEST/ASSET_INDEX/DIALOGUE_EVENTS, laporan Phase 0/1, SESSION_HANDOFF, DECISIONS, arah cerita/naskah Chapter I, technical design, audio handoff, metadata sumber. Memeriksa GameState, SaveRepository, SceneRouter, InputManager, AssetRegistry, AudioManager, Effects, Settings, World/Hud/Pause, DialogueRunner/DialogueBox, Chapter1Story, peta/collision dan tes aktual.

| Baseline aktual | Hasil |
|---|---|
| `npm run typecheck` | 0 error strict |
| `npm test` | 11 file, **204/204** |
| `npm run build` | PASS |
| E2E Phase 0 | **84/84** |
| E2E Phase 1 | **91/93**, dua assertion terkait timing baris Nambo L001 |

Baseline E2E lama menahan gerak 400 ms, mengambil screenshot dan memeriksa layout sebelum mencoba Enter pada teks pendek. Baris sudah selesai dan jeda advance sudah lewat, sehingga Enter berpindah ke L002; assertion berikut kehilangan L001. Uji Enter dipindahkan sebelum hold/screenshot, tanpa mengubah DialogueRunner atau teksnya. Baseline log: `.dev-cache/logs/phase2-baseline-verify.log`, `phase2-baseline-e2e.log`.

Node/npm dan dependency existing digunakan ulang; tidak ada install baru atau perubahan PATH/global. Dependency di `web/node_modules`; cache/temp/artifacts di `.dev-cache` pada D:. Vite/Vitest/browser perlu normal subprocess Windows; dijalankan melalui mekanisme izin sistem setelah sandbox memblokir subprocess baseline.

## C. Arsitektur dan balancing DRAFT

`combat/BattleEngine.ts` tidak mengimpor Phaser. Snapshot serializable berisi actors, order/cursor/turn, items, pending action, outcome dan log. Fungsi kecil `turnOrder`, `damage`, `enemyAI`, `finishStatuses` menjalankan aturan; tidak dibuat hierarki manager yang berlebihan.

Lifecycle:

1. `prepare(command, visibleTurnToken)` memvalidasi command/resources, mengunci satu aksi dan tidak menerapkan damage/cost sebelum contact.
2. `impact(token)` hanya berjalan sekali. HP/MP/item berubah atomik pada kontak; callback ulang ditolak.
3. `finish(token)` hanya setelah impact dan recovery. Status owner diselesaikan, lalu giliran berikut tersedia. Token lama tidak diterima pada giliran baru. Outcome terminal tidak bisa diserang lagi.

| DRAFT stat | Yaric C01 | Hollowling M01 |
|---|---:|---:|
| HP maksimum | 96 | 112 |
| MP maksimum | 12 | 0 |
| ATK | 20 | 19 |
| DEF | 8 | 6 |
| MAG | 5 | 3 |
| MDEF | 7 | 5 |
| SPD | 10 | 7 |

Urutan SPD menurun, tie-break ID aktor leksikal independen locale/input roster. Urutan diambil pada awal duel; tidak ada perubahan SPD dalam tutorial. Tidak ada critical/miss/damage RNG. Escape biasa menerima fungsi random yang dapat diinjeksi; default deterministik 0.5, peluang sukses `< 0.75`. Tutorial tidak mengizinkan escape.

Rumus fisik: `max(1, floor(max(1, ATK_efektif × power − DEF_efektif × 0.5) × guard))`. `guard = 0.5` saat Bertahan, selain itu 1. ATK Up/DEF Up memberi faktor 1.25 pada stat terkait. Damage aktual dibatasi sisa HP, HP minimum 0; MP minimum 0. MAG/MDEF sudah tersedia, belum ada skill magic yang dikarang untuk tutorial.

| Command | Perilaku nyata |
|---|---|
| Serang | Physical power 1; Yaric 17 damage ke Hollowling; musuh 15 damage ke Yaric |
| Jurus → Ground Slam | **4 MP**, physical power **1.65**, 30 damage; tidak tersedia jika MP < 4 |
| Barang → Potion | ID existing `potion`; pulih hingga **36 HP**, consume 1 pada impact; full HP/stock kosong tidak consume atau menghabiskan turn |
| Bertahan | Kerusakan masuk separuh (15 → 7), sampai aksi owner berikut diterima |
| Kabur | Tutorial nonaktif dengan alasan jalan dihalangi; engine biasa mendukung success/failure yang deterministik dalam test |

Hollowling AI selalu satu basic strike per giliran, dengan anticipation dan pesan menerjang; tanpa spesial tersembunyi. Basic Attack saja menang dalam 7 serangan, Yaric tersisa 6 HP. Tiga Ground Slam menghabiskan 12 MP dan belum membunuh musuh (sisa 22 HP), sehingga keputusan lain tetap diperlukan. Semua angka **DRAFT untuk playtest**, bukan fakta kanon.

Status foundation (tidak dipaksakan ke tutorial): Poison tick `max(1, floor(maxHP × 0.08))` di akhir giliran owner; Stun mengganti aksi owner dengan skip tanpa biaya; ATK Up dan DEF Up faktor 1.25. Durasi berkurang setelah owner menyelesaikan giliran (termasuk skip), bukan setiap aktor lain bertindak. Reapply memperpanjang ke maksimum durasi, tidak menumpuk kekuatan. Hasil terminal pada contact mengakhiri duel sebelum tick status berikutnya.

`combat/BattleSession.ts` memegang snapshot checkpoint **memori**, bukan repository save baru. Victory setelah recovery meng-commit vitals, inventory hasil dan `battle.first_hollowling` sekali melalui GameState. Reward foundation kosong; tidak ada EXP/gold yang ditampilkan atau diklaim tersimpan. Defeat/retry mengembalikan persis checkpoint, termasuk Potion yang terpakai dalam percobaan kalah; tidak membuka peti ulang atau menambah reward.

GameState mendapat `vitals?: { hp, mp }` yang tervalidasi dan kompatibel dengan data lama. SaveRepository tidak diubah/ditandingi, dan gameplay tidak menulis save. Battle kembali ke Hutan 1 pada y=100, di luar trigger. Flag resmi mencegah encounter ulang. Dialog existing C1-04-L001 sebelum battle, L002/L003 setelah victory; seluruh teks dibandingkan dengan DIALOGUE_EVENTS. Flag internal `c1.hollowling_victory_seen` mencegah replay dialog.

## D. Asset integration dan UI

| Atlas PNG (+ JSON nama sama) | Sumber asli |
|---|---|
| `C01_ATLAS_PIXEL_PASS_V3_3.png` | `assets/characters/C01_Yaric/v3_3/` |
| `M01_ATLAS_PIXEL_PASS_V3_3.png` | `assets/monsters/M01_Hollowling/v3_3/` |
| `C01_GROUND_SLAM_ATLAS_PIXEL_PASS_V3_3.png` | `assets/vfx/C01_GROUND_SLAM/v3_3/` |

`scripts/prepare-battle-assets.mjs` menyalin enam file utuh ke `web/public/assets/battle/`. Byte equality diuji. Tidak ada normalisasi gambar atau perubahan source. AssetRegistry/Boot memuat spritesheet + JSON metadata. Nearest-neighbor, roundPixels, sprite scale integer; tidak ada preview GIF/v3.2 battle.

Frame `duration_ms` dan pivot digunakan saat playback. Serang Yaric: anticipation → windup → contact (event 4) → followthrough → recovery → idle. Basic attack melangkah mendekat dengan sengaja lalu kembali ke posisi awal, bukan drift pivot. Ground Slam menggunakan urutan delapan frame asli, damage hanya saat `slab_strikes` (5). Hit dan death bercabang sesuai hasil engine, tanpa memutar death sebagai bagian idle.

Yaric sumber pivot [48,95]; Hollowling [48,48] (center), sehingga posisi sprite center berbeda agar keduanya berakhir pada titik bawah y=130. VFX pivot [48,63] ditempatkan pada tanah musuh. Layout menyediakan ruang penuh 96 px antara HUD dan menu. Sprite tidak ditutupi menu; greatsword tetap mengikuti rect sumber. Idle Yaric 200 ms/frame, Hollowling 220 ms/frame sesuai JSON. Kamera UI terpisah agar shake/flash medan tidak menggeser HP/menu. Screen Shake OFF dan Reduced Flashes ON tetap memperlihatkan tanah naik, target reaction, damage dan log.

`ui/components/BattlePanel.ts` mengatur layout/teks/menu; engine tidak mengetahui UI. Palet Deep Plum/Bitter Lime memakai tema existing; hijau kusam/cokelat tanah mendukung Hutan 1. Latar memakai props Phase 1 existing, tetap DRAFT. Semua label Indonesia (Ground Slam/Potion mempertahankan nama move/item existing). Font Press Start 2P existing, placeholder OFL.

**Temuan sumber yang belum diperbaiki:** beberapa frame Yaric (terutama contact/followthrough) mengandung fragmen pedang di sisi kanan dan bentuk pedang menyentuh/batas sel. Pada sheet Hollowling ada pose yang arah/siluetnya perlu review; beberapa piksel mencapai batas sel. VFX juga memiliki partikel pada tepi. Memotong/mengecilkan sprite runtime tidak dapat menciptakan bagian pedang yang hilang pada sumber. Desain dan file asli dipertahankan sesuai instruksi. Semuanya NEEDS_REVIEW, bukan PRODUCTION_READY.

## E. Testing report

Seluruh suite di bawah telah selesai. Log akhir: `.dev-cache/logs/phase2-verify.log`, `phase2-e2e-production.log`, `phase2-dev-diagnosis.log`. Laporan JSON produksi disimpan terpisah di `.dev-cache/test-artifacts/phase2-production/` agar tidak tertimpa run dev.

| Pemeriksaan final | Hasil |
|---|---|
| Strict TypeScript | PASS, 0 error |
| Unit | **12 file, 273/273** (204 baseline + 64 combat + 3 asset equality + 2 audio) |
| Production build | PASS, Vite 8.3.7 / Phaser 4.2.1 |
| E2E build produksi | **84/84 Phase 0 + 110/110 perjalanan C1-01..04 + 37/37 battle = 231/231** |
| E2E dev | **37/37 focused battle**, termasuk loading/network, 1366x768/1920x1080; perjalanan penuh Title→C1-04 dijalankan di produksi |

Unit combat memverifikasi SPD/tie, prepare/impact/recovery gating, duplicate/stale tokens, basic/skill damage, bounds, guard expiry, no MP, heal caps/stock/full HP, escape rules/success/failure, explicit AI, KO, victory, defeat/retry, checkpoint resources, atomic/idempotent commit, status potency/duration/refresh, invalid data dan dialog C1-04 verbatim.

Browser memakai **Microsoft Edge 157.0.4341.46 headless** (`playwright-core` existing). Phase 1 suite sekarang terus berjalan dengan keyboard sungguhan dari Title melewati semua intro sampai C1-04, semua command, victory dan dunia kembali. Focused Phase 2 memakai `?qa=1` untuk checkpoint encounter terisolasi (bukan menggantikan perjalanan penuh) dan menguji MP habis, disabled item/skill, defeat sungguhan, retry dengan restore Potion, Pause/Settings, dua resolusi, efek nyata dan silent fallback. Hook QA tidak tersedia tanpa query `qa`.

Artefak di `.dev-cache/test-artifacts/`: `p1_battle_idle.png`, `p1_battle_attack.png`, `p1_ground_slam_fracture.png`, `p1_ground_slam_impact.png`, `p1_battle_victory.png`; `p2_idle_1366.png`, `p2_idle_1920.png`, `p2_fracture_*`, `p2_impact_*`, `p2_no_mp_*`, `p2_victory_*`, `p2_defeat.png`, `p2_retry.png`; `p2_yaric_sheet.png`, `p2_hollowling_sheet.png`, `p2_slam_sheet.png` + frame bbox/alpha QA JSON. Screenshot dan urutan frame ditinjau oleh agen, **bukan pengganti pengujian manusia**.

Bug yang ditemukan/diperbaiki: prompt tombol melewati lebar layar; Hollowling center pivot sempat diperlakukan seperti foot pivot sehingga badan tertutup menu; stage awal terlalu pendek untuk sprite 96 px; shake kamera sempat menggeser UI. Assertion baseline Nambo dipindah sebelum operasi lambat. Dua run dev sebelumnya mencatat aborted module requests (salah satunya bertepatan dengan perubahan package/source/HMR). Tidak ada kegagalan perilaku battle pada run itu. Diagnostik browser terisolasi dan rerun final tidak mereproduksi request gagal; **produksi 231/231 dan dev akhir 37/37**, tanpa error JS/404/request aset gagal. Penyebab seluruh pembatalan transient dev belum dapat dipastikan; log sebelumnya dipertahankan, bukan disembunyikan.

## F. Preview dan kontrol

Dev URL saat handoff: `http://127.0.0.1:5173/`, aktif dan dipakai oleh browser dev akhir. Mainkan **Mulai Baru**, periksa tanah dan pedang, berbicara dengan Nambo, baca papan berulang, cari celah semak utara, ambil Potion dalam peti, lanjutkan ke ujung utara. C1-04 muncul sekali. Arrow/WASD menavigasi, Enter/Space/E/Z konfirmasi, Esc/X kembali atau Jeda ketika aman. Setelah menang, Lanjutkan menampilkan dialog C1-04 dan eksplorasi; setelah kalah, Coba Lagi mengulang duel dengan checkpoint aman. Pengaturan tidak mengubah turn. Semua tanpa musik.

## G. File changes

- ASSET_INDEX.md
- ASSET_MANIFEST.md
- AUDIO_COMPOSER_HANDOFF.md
- CLAUDE.md
- PHASES.md
- QA_CHECKLIST.md
- README.md
- TASKS.md
- docs/production/CHANGELOG.md
- docs/production/PHASES.md
- docs/production/SESSION_HANDOFF.md
- docs/production/TASKS.md
- docs/quality/QA_CHECKLIST.md
- web/README.md
- web/package.json
- web/src/game/config/createGameConfig.ts
- web/src/game/data/assetManifest.ts
- web/src/game/data/ids.ts
- web/src/game/scenes/BootScene.ts
- web/src/game/scenes/PauseScene.ts
- web/src/game/scenes/WorldScene.ts
- web/src/game/story/Chapter1Story.ts
- web/src/game/systems/AudioManager.ts
- web/src/game/systems/GameState.ts
- web/src/main.ts
- web/src/ui/components/MenuList.ts
- web/tests/e2e/phase1.mjs
- web/tests/unit/assets.test.ts
- web/tests/unit/audio.test.ts
- web/tests/unit/story.test.ts
- docs/production/PHASE2_REPORT.md
- web/public/assets/battle/C01_ATLAS_PIXEL_PASS_V3_3.json
- web/public/assets/battle/C01_ATLAS_PIXEL_PASS_V3_3.png
- web/public/assets/battle/C01_GROUND_SLAM_ATLAS_PIXEL_PASS_V3_3.json
- web/public/assets/battle/C01_GROUND_SLAM_ATLAS_PIXEL_PASS_V3_3.png
- web/public/assets/battle/M01_ATLAS_PIXEL_PASS_V3_3.json
- web/public/assets/battle/M01_ATLAS_PIXEL_PASS_V3_3.png
- web/scripts/prepare-battle-assets.mjs
- web/src/game/combat/BattleAtlas.ts
- web/src/game/combat/BattleEngine.ts
- web/src/game/combat/BattleSession.ts
- web/src/game/data/battleSfxRegistry.ts
- web/src/game/dialogue/firstHollowling.ts
- web/src/game/scenes/BattleScene.ts
- web/src/ui/components/BattlePanel.ts
- web/tests/e2e/battle-helpers.mjs
- web/tests/e2e/phase2.mjs
- web/tests/e2e/run.mjs
- web/tests/unit/battle.test.ts

## H. Kesiapan Phase 3

Engine/session, vitals terstruktur, item ID `potion`, flag resmi, return position, dan SaveRepository existing siap untuk integrasi terpisah. Phase 3 perlu schema migration yang mengatur progression/vitals, persistent safe checkpoints, EXP/level/skill/inventory/equipment, manual/autosave dan Continue. Jangan menyimpan pending action atau state animasi; save hanya pada transaksi dunia stabil. Ganti art melalui PNG/metadata dengan desain approved setelah artist cleanup/review. Phase 3 **belum dikerjakan**.

## I. Known limitations dan review

- Art source masih memiliki potongan pedang/piksel tepi/pose yang perlu review; ini mencegah status PASS penuh. Runtime tidak menambah clipping, tetapi tidak menyembunyikan cacat sumber.
- Hanya Edge headless; Chrome/Firefox/non-headless/multi-monitor/HiDPI nyata dan performa GPU belum diuji. Tidak ada klaim FPS stabil dari mesin headless.
- Belum ada playtest manusia untuk balance, berat greatsword, kenyamanan durasi, fokus/kontras pada monitor nyata. Font/background/Nambo/portrait tetap berstatus sebelumnya.
- Tidak ada audio terdengar untuk dinilai. BGM existing BGM_BATTLE + tujuh cue SFX hanya handoff AWAITING_COMPOSER, tanpa request file/audio placeholder.
- Save/load gameplay tetap Phase 3. Refresh menghilangkan progress sesi; Settings tetap persisten. Keluar ke Judul meninggalkan sesi yang belum disimpan sesuai pola existing.
- Escape normal hanya foundation engine teruji unit; tutorial memblokirnya. Status hanya foundation, tidak ditambahkan ke kit Hollowling tanpa kebutuhan.

Review fungsi: satu duel yang menjelaskan tubuh Yaric masih mengenal pedang; reaksi dan dialog memakai naskah existing, tanpa spoiler. Bentuk monster bayangan dan greatsword berasal dari file approved v3.3, bukan desain baru. Efek hanya pada impact dan mengikuti Settings. Rubrik agent sementara: identitas 2, konsistensi 1 (cacat source), fungsi 2, human touch 1 (playtest belum), narasi 2, kontrol efek 2 = **10/12**, tanpa mengklaim approval manusia/final art. Gate visual tetap terbuka.
