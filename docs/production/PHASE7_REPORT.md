# PHASE 7 REPORT — Chapter III: The Forgotten Promise + Cinematic Combat + Original SFX

Tanggal: 12 November 2026. Platform: desktop web, Phaser 4.2.1, TypeScript strict, Vite. Tidak ada commit otomatis di sesi ini kecuali yang diminta user; tidak ada Bab IV.

**STATUS AKHIR: FUNCTIONAL PASS — VISUAL/AUDIO REVIEW PENDING.**
Semua alur dan tes otomatis lulus, tetapi: (1) kualitas bunyi SFX BELUM didengar manusia; (2) seni baru (atlas battle Velthia/Chronolith/Oathguard, kuil, krisis Aveloria, VFX) berstatus DRAFT/NEEDS_REVIEW dan dibuat dari kode/rakitan resmi, bukan gambar tangan seniman; (3) pacing dan keseimbangan Chronolith belum dimainkan manusia; (4) performa hanya diukur di Chromium headless (bukan FPS GPU).

---

## A. Ringkasan deliverable

| Area | Hasil |
|---|---|
| Chapter III playable | "Mulai Bab III" di kartu akhir Bab II → Aveloria krisis (C3-01) → Torvan tinggal, Velthia bergabung (C3-02) → Kuil Jejak (3 teka-teki, kemah, 2 patroli opsional) → Chronolith → catatan nama Varlgrim → janji yang dikenali → kartu "Bab III selesai". Tidak ada Bab IV. |
| Velthia (C02) | Penyihir tangan tanpa senjata; 5 jurus (Denyut Telapak, Sentuhan Pulih, Selubung Kecil, Mekar Rimba, Selaras Langkah) terbuka bertahap menurut level; pose battle: idle, antisipasi, cast, heal, shield, summon, kena, pulih, tumbang. |
| Party | Yaric+Velthia (maks dua); Torvan cadangan dengan level/EXP/jurus/perlengkapan/HP/MP utuh. |
| Chronolith (B03) | HP 360, telegraf (`chrono_charge` → satu ronde pemain → `chrono_slam`), sapuan, guard, rewind (geser giliran), fase 2; tanpa QTE, tanpa RNG. |
| Transisi battle | 4 kategori (normal, scripted, boss, temporal) + return; overlay `TransitionScene`. |
| Pacing | Linimasa data-driven (konfirmasi → antisipasi → windup → eksekusi → dampak+hitstop → reaksi → pemulihan → handoff). |
| VFX piksel | Pustaka `src/game/vfx` (24 efek, 5 atlas, pooling, cap 64, varian tenang). |
| SFX asli | 44 id / 53 WAV, sintesis DSP kode, generator reproducible; langkah kaki berbasis jarak. **BGM tidak dibuat.** |
| Save | Tanpa migrasi schema (envelope `save_v2`, schema 2); slot Bab I–II tetap terbaca; `partyVitals` `{C03, C02?}`. |

## B. Baseline (sebelum perubahan)
Commit `848a47f` (Polish Sprint 2). Unit 676/676. Angka E2E baseline mengikuti laporan Sprint 2 (Edge 722 = 84+197+37+54+38+75+55+105+77; Chrome Sprint 2 77 + Phase 4 38). Catatan jujur: saya mulai menjalankan ulang baseline E2E penuh di sesi pertama tetapi proses dihentikan; angka baseline di atas diambil dari laporan Sprint 2, dan **hasil regresi pada build Phase 7 menghasilkan jumlah yang sama persis (722)**.

## C. Transisi battle (lihat `BATTLE_TRANSITION_AND_PACING_SPEC.md`)
Terukur di browser (Edge 1366 dan 1920; detik jam dinding sejak panggilan sampai layar tertutup + tahan):

| Kategori | Spesifikasi | Terukur |
|---|---|---|
| normal | 420 ms | 456–491 ms |
| scripted | 620+120 | 773–782 ms |
| boss | 760+520 | 1306–1332 ms |
| temporal | 640+80 | 740–753 ms |
| return | 260 | 290–321 ms |

Bukti: layar menutup penuh (>95% piksel plum), separuh jalan tidak kosong/penuh (gerak bertahap), plakat nama hanya pada boss, Reduced Flashes ON → 0 denyut terang; OFF → boss tepat satu denyut redup. Reveal selesai sebelum input battle aktif; satu BattleScene saja; tidak ada encounter ganda sesudah kembali; router menolak transisi ganda (unit).

## D. Pacing aksi
Terukur (Edge/Chrome, dua ukuran): serangan dasar ≈ 0,97–1,0 s (sasaran 0,7–1,3), Ground Slam ≈ 1,91–1,93 s (sasaran 1,2–2,3). Angka damage dibuat tepat pada dampak: E2E memantau HP musuh per 40 ms — tidak berubah sebelum fase dampak. Spam Enter saat animasi menghasilkan tepat satu aksi. Pause terbuka saat animasi dan aksi selesai tanpa duplikasi. Telegraf boss selalu memberi giliran pemain (diuji pada log aksi Chronolith: charge → ≥2 aksi pemain → slam).

## E. VFX
24 efek piksel diskret (palet ≤16 warna/atlas, alfa keras), per-karakter bahasa bentuk berbeda (Torvan bersudut; Velthia melengkung simetris; Chronolith busur batu + inti ambar; rewind halus). Tiap efek punya varian tenang untuk Reduced Flashes. Terbukti di battle nyata: `ground_slam_crack`, `velthia_*`, `chronolith_charge/slam`, `impact_hit` diputar; `fx.active ≤ 64` selalu; 0 aktif setelah retry. Kekurangan jujur: seni dibuat dengan kode, belum sekelas seniman; `crewind` sangat halus; contact sheet di `docs/production/sprint3/vfx-contact-sheets/`.

## F. SFX (lihat `SFX_DESIGN_AND_MANIFEST.md`)
44 id (UI, langkah rumput/tanah/batu ≥3 variasi, interaksi, battle, sihir, Chronolith), WAV 44,1 kHz mono 16-bit, puncak −3 dBFS, ~2,7 MB. Terpasang: UI (menu/dialog/simpan/toko), langkah (jarak tempuh; lari lebih cepat; permukaan per area; senyap saat diam), interaksi/peti/pickup/pintu/puzzle, battle (konfirmasi, ayun, dampak, slam, sihir Torvan/Velthia, selubung, heal, racun, Chronolith charge/strike/temporal, kemenangan/kekalahan), transisi. AudioManager: rate-limit per id, variasi tanpa pengulangan langsung, maks 8 suara, tidak pernah melempar, senyap bila terkunci/tak ada. Browser meminta berkas SFX nyata tanpa 404; tidak ada `BGM_*` dimuat. **Kualitas bunyi: AUDIO-REVIEW PENDING (belum didengar manusia).**

## G. Chapter III (C3-01..07)
- 65 baris canon `DIALOGUE_EVENTS.json` dipakai verbatim sekali dan berurutan (unit); 138 baris jembatan DRAFT_IMPL ditandai.
- Aveloria yang SAMA dalam krisis (jam menara tersangkut, batu/air menggantung, retakan emas pucat, panji berputar, gerbang dibuka, 6–10 warga mengalir ke gerbang di bawah Talric, Azie memasang jaga, Torvan membantu). Bukan efek digital/neon.
- Azie menuntut penahanan (argumen profesional), Velthia menolak dan memerintahkan evakuasi, bangsawan ragu, Talric memimpin, Torvan (jahil, manusiawi, tidak membuka identitas) tinggal, Velthia memutuskan ikut (agensi, tanpa pengakuan cinta).
- Kuil Jejak: halaman → Ruang Pilar (A: urutan lukisan) / Ruang Segel (B: cakram yang disinari lampu berhenti) → Ruang Gerbang (C: arah alas) → kemah (checkpoint+pulih) → aula Chronolith. Jawaban salah mereset aman. Hanya flag selesai yang tersimpan.
- Setelah Chronolith: legenda salah dibaca; nama Varlgrim lewat bukti (catatan dinding); kilas janji; penutup mengarah ke Bab IV tanpa isi Bab IV.

## H. Save/Load
Tanpa migrasi schema; fixture akhir Bab II dimuat identik (unit). E2E: simpan di kuil → muat di sesi yang sama pulihkan area/party/flag/Torvan cadangan/posisi; defeat Chronolith → retry mengembalikan checkpoint tanpa hadiah ganda; Chronolith tidak respawn (flag `boss.chronolith`, patroli dibersihkan tidak muncul lagi); hadiah sekali. Autosave hanya pada titik aman (dialog/battle tidak menyimpan).

## I. Bug nyata yang ditemukan E2E dan diperbaiki
`BattleScene.phase` tidak di-reset di `create()`: pada battle kedua dalam satu sesi (mis. Oathguard lalu Chronolith) semua sprite ditaruh di (0,0) sehingga tak terlihat. Diperbaiki (`phase='idle'` saat create) dan tercakup oleh tes visibilitas piksel.

## J. Hasil tes
| Suite | Edge | Chrome |
|---|---|---|
| Unit (vitest) | 1049/1049 (43 berkas) | — |
| Smoke | 84/84 | — |
| Phase 1 | 197/197 | — |
| Phase 2 | 37/37 | — |
| Phase 3 | 54/54 (setelah tes "tanpa audio" diubah agar mengizinkan SFX .wav) | — |
| Phase 4 | 38/38 | 38/38 |
| Phase 5 | 75/75 (satu kali percobaan awal berhenti "Blocked path"; ulang 75/75 — dicatat sebagai kemungkinan flaky) | — |
| Phase 6 | 55/55 | — |
| Sprint 1 | 105/105 | — |
| Sprint 2 | 77/77 | 77/77 |
| **Phase 7 (baru)** | **184/184** (1366×768 + 1920×1080) | **96/96** (1366×768) |

Catatan: tes lama "tidak ada request file musik" dulu menolak semua `.wav`; sekarang hanya menolak audio di luar `/assets/audio/sfx/` (BGM tetap dilarang dan terbukti tidak dimuat).

Cakupan Phase 7 E2E: transisi 4+1 kategori (waktu, tutup/buka, plakat, Reduced Flashes ON/OFF), Hollowling pertama scripted → battle → kembali, tempo dan fase, spam Enter, Pause saat animasi, Screen Shake×Reduced Flashes (kombinasi ON/OFF), Bab III penuh (Mulai Bab III → krisis → Velthia bergabung → kuil → puzzle (jawaban salah dan benar) → patroli → Chronolith → akhir bab), visibilitas piksel Oathguard/Velthia/Yaric/Chronolith, VFX/SFX terpicu, langkah kaki (batu, senyap saat diam), save/load kuil, defeat/retry, jaringan tanpa gagal, tanpa error konsol.

## K. Performa (headless, BUKAN FPS GPU)
`tests/e2e/perf7.mjs`, Edge headless, rAF dikunci 60 Hz:

| Skenario | 1366: mean / p95 / max (ms) | 1920: mean / p95 / max |
|---|---|---|
| Aveloria Bab I | 16,66 / 16,8 / 17,0 | 16,66 / 16,9 / 17,1 |
| Aveloria krisis (warga+props) | 16,65 / 16,8 / 17,0 | 16,66 / 16,8 / 17,0 |
| Battle Chronolith idle | 16,66 / 16,9 / 17,0 | 16,66 / 16,9 / 17,1 |
| Battle + VFX aktif (Ground Slam) | 17,45 / 17,0 / 66,6 | 16,91 / 16,9 / 33,4 |

Tidak ada degradasi berarti; satu lonjakan sesaat saat aksi VFX pertama (kemungkinan pemuatan tekstur/dekode audio pertama kali). Tidak ada pengukuran "sebelum" pada commit lama di sesi ini, jadi perbandingan sebelum/sesudah adalah antar skenario (Bab I vs krisis; idle vs VFX), bukan lintas commit.

## L. Dokumen
`PHASE7_REPORT.md` (ini), `BATTLE_TRANSITION_AND_PACING_SPEC.md`, `SFX_DESIGN_AND_MANIFEST.md`, catatan agen `docs/production/sprint3/{CONTRACT,N,E,BA,V,S,T,A}.md`; diperbarui: CLAUDE.md, README.md, PHASES.md, TASKS.md, QA_CHECKLIST.md, AUDIO_COMPOSER_HANDOFF.md, ASSET_INDEX.md.

## M. Sisa masalah dan keputusan terbuka
1. **Suara belum ditinjau manusia.** Parameter di `web/scripts/sfx/catalog.mjs`.
2. **Seni DRAFT/NEEDS_REVIEW**: Velthia battle kecil (tangan 3–5 px, wajah profil minimal); Oathguard pose serang kasar; Chronolith `defeated` kasar; Wisplet/Oathguard di dunia kuil hanya sprite patroli prototipe; kuil terlihat repetitif dari jauh; warga krisis 9 varian pola sama.
3. **Level cap game = 5** (brief menyebut level 8–10). Yaric/Velthia masuk Bab III di L4; Chronolith diseimbangkan untuk itu. Memperpanjang kurva EXP = keputusan desain + validasi save semua bab; tidak dilakukan.
4. Keseimbangan Chronolith hanya diuji simulasi (pemain kompeten menang ~9–10 aksi; 10% acak ≈ 91–94%; 35% acak ≈ 61–65%). Playtest manusia diperlukan.
5. Velthia belum menjadi pengikut berjalan di kuil (tidak ada follower sprite di Kuil); Torvan tidak tampil di kuil (cadangan).
6. Papan keluar kuil hanya menampilkan toast. Kemajuan di tengah puzzle A/C hilang bila muat ulang (disengaja).
7. Ultimate Perlindungan (Bab IV) TIDAK diimplementasikan; status `shield` dirancang bisa dipakai ulang.
8. Performa GPU asli belum diukur.
9. Tidak ada commit otomatis untuk bagian pekerjaan sesudah snapshot WIP yang di-push atas permintaan user.
