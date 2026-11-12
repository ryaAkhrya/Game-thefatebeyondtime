# Battle Transition & Pacing Spec — Phase 7

Status: **FUNCTIONAL / VISUAL REVIEW PENDING.** Semua angka di bawah adalah nilai awal (DRAFT) yang dapat disetel; bukti ukur ada di `PHASE7_REPORT.md`.
Kode: `web/src/game/combat/presentation.ts` (data, murni, diuji unit), `web/src/game/scenes/TransitionScene.ts` (overlay), `web/src/game/systems/SceneRouter.ts` (`goto(..., {transition})`), `web/src/game/scenes/BattleScene.ts` (linimasa).

## 1. Transisi masuk battle

Overlay `TransitionScene` berjalan terus di atas semua scene (diluncurkan sekali oleh `BootScene`). Router menutup layar lewat overlay ini, mengganti scene saat layar TERTUTUP penuh, lalu scene tujuan memanggil `router.arrive()` yang membuka layar. Karena overlay tidak ikut berhenti ketika scene diganti, tidak ada kedip hitam/beku di antara dunia dan battle. Input dikunci sejak `goto()` (router `busy`) sampai reveal selesai (`router.revealed()`); BattleScene tidak memulai giliran pertama sebelum reveal selesai.

Identitas visual (asli, bukan salinan franchise lain): **pita-pita "halaman kitab"** Deep Plum yang menyapu bergantian dari kiri dan kanan dengan garis tepi Bitter Lime; tanpa spiral, tanpa putih penuh, tanpa pecahan kaca. Skala piksel mengikuti kanvas perangkat (bilah dihitung dari `pixelWidth/pixelHeight`, ketebalan tepi dari `uiScale`).

| Kategori | Kapan | Tutup | Tahan | Buka | Ciri | SFX |
|---|---|---|---|---|---|---|
| Normal | encounter biasa (Hollowling berikutnya, patroli Hutan 2) | 420 ms | 0 | 300 ms | 8 pita, sapuan cepat | `SFX_BATTLE_TRANSITION_NORMAL` |
| Scripted | Hollowling pertama, tutorial duo | 620 ms | 120 ms | 420 ms | 6 pita, lebih pelan | `SFX_BATTLE_TRANSITION_SCRIPTED` |
| Boss | Mournfang, Veyrath, Chronolith | 760 ms | 520 ms | 560 ms | 10 pita, plakat nama musuh (Cinzel, Bitter Lime) dan satu denyut terang redup (alpha 0,28, 110 ms) | `SFX_BATTLE_TRANSITION_BOSS` |
| Temporal | encounter Kuil Jejak (Oathguard, penjaga) | 640 ms | 80 ms | 420 ms | gerak TERSENDAT 5 langkah seperti jarum jam yang berhenti, garis rambut emas pucat; halus, tidak dipakai di semua battle | `SFX_BATTLE_TRANSITION_TEMPORAL` |
| Return (battle → dunia) | setelah "Lanjutkan" | 260 ms | 0 | 320 ms | 6 pita, tenang | tanpa SFX |

Boss total ≤ 1,3 s sampai battle mulai: dramatis tetapi tidak menyiksa saat retry (retry tidak memutar ulang transisi; hanya memuat ulang checkpoint di scene yang sama).

### Aksesibilitas
- **Reduced Flashes (default ON):** denyut terang boss TIDAK diputar; pita tidak berkedip. Hanya satu transisi (boss) yang punya elemen `flashy`.
- **Screen Shake:** transisi tidak pernah menggoyang kamera. Goyang hanya pada dampak berat battle dan mengikuti pengaturan.
- Tidak ada fade-in ganda: bila layar sedang tertutup transisi besar, `router.arrive()` membuka lewat overlay, bukan `fadeIn` biasa.
- Pause tetap dapat dibuka saat battle (lihat §3).

## 2. Linimasa aksi battle (data-driven)

Tiap aksi dijalankan oleh satu alur fase (`TIMELINES` di `presentation.ts`, dipilih oleh `actionClassFor(command)`):

`konfirmasi → antisipasi → windup → eksekusi → dampak (+hitstop) → reaksi → pemulihan → serah giliran`

Durasi atlas tidak lagi menentukan tempo: `play(id, frames, onFrame, totalMs)` membagi `totalMs` ke frame secara proporsional. Spesifikasi dalam ms (konfirmasi / antisipasi / windup / eksekusi / hitstop / reaksi / pemulihan / handoff):

| Kelas | Contoh | c | a | w | e | h | r | p | o | Total nominal |
|---|---|---|---|---|---|---|---|---|---|---|
| basic | Serang Yaric, serangan Hollowling | 60 | 180 | 120 | 160 | 55 | 230 | 200 | 160 | 1165 |
| enemy_basic | pemulihan musuh | 40 | 260 | 140 | 160 | 55 | 230 | 200 | 180 | 1265 |
| heavy | Ground Slam | 70 | 320 | 260 | 360 | 90 | 300 | 280 | 200 | 1880 |
| magic | Ranting Nakal, Denyut Telapak Velthia | 70 | 300 | 200 | 320 | 60 | 260 | 240 | 180 | 1630 |
| support | Tunas Bandel, Sentuhan Pulih, Selubung, Mekar, Selaras | 70 | 260 | 160 | 300 | 0 | 160 | 220 | 180 | 1350 |
| defend / item | Bertahan, Potion | 60 | 120–140 | 0 | 240–300 | 0 | 0–160 | 180–200 | 160 | ≈ 950–1050 |
| boss_telegraph | `boss_windup`, `chrono_charge`, `chrono_guard` | 40 | 520 | 320 | 200 | 0 | 0 | 300 | 240 | 1620 |
| boss_special | `boss_sweep`, `chrono_slam`, `chrono_sweep`, `chrono_rewind` | 40 | 420 | 360 | 420 | 110 | 340 | 360 | 260 | 2350 |

Sasaran: serangan dasar ≈ 0,7–1,3 s, skill berat ≈ 1,2–2,3 s, spesial boss lebih panjang. Nilai terukur ada di PHASE7_REPORT.

### Aturan inti
- **Angka damage tepat saat dampak:** dibuat di dalam callback `impact()` yang dipanggil dari frame event, bukan setelah animasi. `engine.impact()` baru mengubah HP pada saat itu (diuji E2E: HP tidak berubah pada fase antisipasi).
- **Hitstop mikro:** jeda pendek (55–110 ms) antara dampak dan reaksi target; memendek 30% bila Screen Shake OFF.
- **Telegraf memberi giliran pemain:** Mournfang `boss_windup → boss_sweep`, Veyrath `knight_guard → knight_thrust`, Chronolith `chrono_charge → (satu ronde pemain penuh) → chrono_slam`. Target hantaman Chronolith ditandai caret pada anggota yang akan dihantam.
- **Menu tetap responsif:** `Esc` membuka Pause kapan saja (juga saat animasi); scene dijeda dan linimasa berlanjut setelah resume. Enter yang ditekan saat animasi diabaikan (`locked`), sehingga tidak ada aksi ganda.
- **Tanpa aksi ganda / kebocoran input:** `locked`, epoch scene, dan router `busy` mencegah ganda.
- **Dapat dipakai ulang untuk Bab IV:** boss baru cukup menambah id perintah ke `actionClassFor` dan (bila perlu) satu kelas `TIMELINES`; `BattleScene` membaca `ImpactResult.effects[]`, `frameKey`, dan `telegraph`.

### Rekam QA tempo
`window.__tfbt.battle().traces` berisi tiap aksi: `{actor, command, cls, marks{confirm,anticipation,windup,execution,hitstop,recovery,handoff}, total}` (ms sejak konfirmasi).

## 3. Efek dampak dan aksesibilitas
- Kilat layar penuh hanya pada aksi berat (`heavy`/`boss_special`) dan hanya bila Reduced Flashes OFF. Goyang hanya pada aksi berat dan hanya bila Screen Shake ON. (`impactFx` di `presentation.ts`, diuji unit + E2E dengan dua kombinasi pengaturan.)
- VFX piksel (`src/game/vfx`) hidup di kamera panggung (depth < 20), tidak menutupi HP/MP/menu/telegraf. Varian tenang (`*_c`) dipakai saat Reduced Flashes ON.

## 4. Batasan jujur
- Transisi dan linimasa diukur di Chromium headless (Edge/Chrome): angka ms adalah waktu jam dinding, bukan FPS GPU.
- Seni atlas dan VFX berstatus DRAFT; kenyamanan tempo secara subjektif belum ditinjau manusia.
