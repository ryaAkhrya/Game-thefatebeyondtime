# Agent A — Aveloria dalam krisis retakan waktu (Phase 7, C3-01/C3-02)

Status aset: **DRAFT / NEEDS_REVIEW, code-native** (dihasilkan skrip, bukan karya tangan final). Tidak ada BGM, tidak ada varian jam pasir.

## Yang dibuat

| Berkas | Isi |
|---|---|
| `web/src/game/world/AveloriaCrisisView.ts` (BARU) | `AveloriaCrisisView implements AreaView3`; membungkus `AveloriaView` (Bab I-II tidak berubah) |
| `web/src/game/world/aveloriaCrisis.ts` (BARU) | tipe + id + `crisisStage(flags)`, re-export data tata letak |
| `web/src/game/data/maps/town.crisis.mjs` + `.d.mts` (BARU) | data tata letak krisis (item, rute warga, posisi NPC per tahap, jalur adegan); murni, dipakai runtime dan pratinjau |
| `web/src/game/story/c3/aveloriaCrisis.ts` (BARU) | `AveloriaCrisisStory` (`objective/onStart/interact/trigger`) |
| `web/src/game/world/AveloriaView.ts` (edit aditif) | `place` jadi publik, `actor(id)`, `gateImage`, `bellImage`, `setGate(open)`, `setResidentsVisible(v)`; perilaku Bab I-II identik |
| `web/src/game/data/environmentAssets.ts` | satu baris di `TOWN_ATLASES`: `town_crisis` |
| `web/scripts/gen-town-art.mjs` | target baru `crisis` (tidak ikut target bawaan, jadi `aveloria_*`/`liora_*` tidak berubah) |
| `web/scripts/town-art/crisis-{props,citizens,all,prev,preview}.mjs` | generator + pratinjau |
| `web/public/assets/environment/town/town_crisis_atlas.png/.json` | 200 frame (prop krisis + 9 varian warga x 18 frame) |
| `docs/production/sprint3/aveloria-preview/*.png` | 10 render pratinjau (lihat bawah) |
| Tes | `tests/unit/aveloria-crisis-{routes,story,assets,view}.test.ts` + `tests/unit/helpers/fakeScene.ts` |

Tidak mengubah: `WorldScene`, `aveloria.ts`, `town.layout.mjs`, `townArt.ts`, `AveloriaStory.ts`, peta Bab I-II. Semua tambahan krisis dipasang **per scene** (trigger/interactable/collision dinamis ke objek `loaded`/`interactables` milik scene itu), sehingga `loadAveloria()` Bab I-II tetap byte-sama dan flood-fill `townReach.test.ts` tidak terpengaruh.

## Perubahan lingkungan (bukan glitch digital)
Level 1 (start..azieDemand) -> level 2 (velthiaRefuses..evacDone) -> level 3 (decision..departed); item hanya bertambah.
- **Retakan paving** berinti emas pucat putus-putus (6 decal; ramp emas dipakai HANYA untuk retakan/api beku, pengecualian eksplisit dari "tanpa emas", redup bukan neon).
- **Batu melayang** (10 pada level 3) di atas bayangan bulat di tanah, bergeser 1 px tersendat (tidak halus); **air sumur menggantung** (kolom + tetes beku, dua pose); **api lampu beku/tersendat**; **keranjang + 3 apel menggantung** di dekat penjual.
- **Jam menara** diganti overlay: jarum menit mencoba maju 0->5->10->15 lalu dilempar kembali, jarum jam bergetar pada level 2+, retakan di kaca jam.
- **Bayangan salah arah**: proyeksi siluet menara/lampu/sumur/panji ke kiri-atas di samping bayangan baked asli.
- **Panji plum** berkibar dalam putaran yang tersendat (tertahan lalu melompat ke pose awal); **lonceng** berdentang di waktu acak.
- Gerbang **terkunci** (portcullis turun + solid) sampai `evacOrdered`; terbuka dengan animasi portcullis naik.
- Warga bekerja **mengulang**: penyapu dan pembawa peti menempuh lintasan pendek lalu melompat kembali (putaran rusak); penjual memilah; warga lain menoleh bergantian.

## Evakuasi nyata
- 9 warga (`WALKERS`; tutup `MAX_EVAC_WALKERS = 10`, diuji 6-10): penyapu, pembawa peti, penjual, 2 bangsawan, 3 warga, penjaga. 5 keluar lewat gerbang (hilang di ujung jalan selatan), 3 warga berkumpul di titik aman dekat kereta penuh barang, penjaga berjaga di timur gerbang. Rute tetap (titik + segmen diuji dapat dipijak via `CollisionMap`), jeda mulai 0-9,5 dtk, kecepatan 58-84 px/s; warga berhenti <= 0,8 dtk bila pemain tepat di depan (tanpa collision dinamis agar pemain tidak pernah macet).
- Talric memimpin di gerbang, penjaga gerbang (sprite warga "guard"), Azie berpos, Torvan membawa peti bolak-balik pasar -> kereta (peti = overlay `crisis_crate_carry`), lalu menetap di titik aman. Torvan tidak membuka identitas pencipta, tidak ikut ke kuil.
- Velthia: tangga istana -> ruang pertemuan (setelah `evacOrdered`) -> pengikut pemain sejak `decision` (visual; party resmi lewat `joinVelthia`).
- NPC bernama pindah ke posisi tahap baru **hanya saat tidak terlihat** (`relocate`), kecuali koreografi yang berjalan di depan pemain.

## Kontrak AreaView3
`new AveloriaCrisisView(scene, loaded, interactables)`; `apply(flags)` (dipanggil pertama kali = rekonstruksi penuh tanpa koreografi; panggilan berikutnya idempoten, tidak mengulang arus evakuasi), `update(player{x,y,facing}, moving, delta, sprinting)`, `handleAction(op,arg)`, `debug()`, `destroy()` (idempoten; juga otomatis saat SHUTDOWN scene), plus `react(speaker,line)` (delegasi ke AveloriaView) dan `base` (AveloriaView di dalamnya).

### Ops `handleAction` (semua selesai: batas waktu per op, cleanup saat destroy)
| op | efek | batas |
|---|---|---|
| `crisisOpen` | kamera menyapu plaza -> menara jam, waktu "tersangkut", kamera kembali ke pemain (~5 dtk) | 14 s |
| `audienceGather` | Azie berjalan ke samping Velthia, bangsawan menghadap | 8 s |
| `evacStart` | portcullis naik + gerbang terbuka; Velthia dan Azie ke ruang pertemuan; Talric ke gerbang (tidak ditunggu); arus warga dimulai | 13 s |
| `evacFinish` | sisa warga dipercepat (x2,6) sampai tiba lalu keadaan akhir | 13 s |
| `torvanFace` | Torvan menoleh ke pemain | 1,5 s |
| `focus` arg `tower|plaza|gate|council|court` / `release` | kamera ke titik / kembali mengikuti | 3,5 s |
| `hitch` arg ms | animasi krisis berhenti sejenak | 3 s |
| lainnya | diabaikan (tidak menahan cerita) | - |

Kamera: view membaca `camera._follow`, `stopFollow`, `pan`, lalu `startFollow(target, true, 0.14, 0.14)` seperti `WorldScene` (dipulihkan juga saat timeout/destroy).

## Id interact / trigger
- **Trigger** (ditambahkan view ke `loaded.map.triggers`): `c3_audience` (`AVELORIA_AUDIENCE`, halaman istana y=584, lebar penuh), `c3_temple_exit` (`AVELORIA_TEMPLE_EXIT`, jalan selatan gerbang (592,1344,96x24)). Trigger lama dipakai ulang: `city_audience` (`AVELORIA_COUNCIL`, ruang pertemuan) untuk keputusan; `city_gate`/`city_bells` -> `[]`.
- **Interact**: `azie`, `velthia`, `talric`, `torvan` (BARU, `ID_TORVAN`), `c3_noble` (BARU, `ID_NOBLE`), `porter`/`vendor`/`sweeper`/`guard` (-> `C3_NPC_CITIZEN_1..4`; `guard` setelah evakuasi -> `C3_NPC_EVAC_DONE`), `derrria` (sapaan + toko), `reports`, `city_sign`. `liora_exit` dimatikan; `palace_door` -> `[]` (terbuka).

## Alur cerita (flag di-commit SETELAH dialognya; rantai dapat dilanjutkan dari tengah)
```
start      onStart: c3 crisisOpen -> C3_CRISIS_WATCH -> crisisSeen
crisisSeen -> masuk halaman (c3_audience) / bicara Azie / Velthia:
              c3 audienceGather, C3_AZIE_DEMAND -> azieDemand
              C3_VELTHIA_REFUSES -> velthiaRefuses
              C3_NOBLES_DOUBT, C3_EVAC_ORDER, c3 evacStart -> evacOrdered
evacOrdered -> bicara Talric (gerbang): C3_TALRIC_EVAC, c3 evacFinish -> evacDone
evacDone   -> masuk ruang pertemuan (city_audience) / bicara Velthia: C3_DECISION -> decision
decision   -> bicara Torvan: c3 torvanFace, C3_TORVAN_STAYS -> torvanStays; {joinVelthia} -> velthiaJoined (sekali)
velthiaJoined -> trigger c3_temple_exit: C3_DEPART -> departed -> {changeArea 'temple'}
```
Sebelum `velthiaJoined` trigger keluar hanya memberi toast (tidak pernah mengunci pemain). Objective (Jurnal, bukan banner) berubah per tahap.

## Permintaan ke lead (wiring; saya tidak menyentuh WorldScene)
1. `WorldScene.create`: bila `map.id==='aveloria'` dan `gameState.hasFlag(C3.start)` -> `this.city3 = new AveloriaCrisisView(this, this.loaded, this.interactables)` (bukan `AveloriaView`); `applyFlagState` -> `city3.apply(flags)`; `update` -> `city3.update(this.player, moved>0, delta, this.sprinting)` (JANGAN panggil `AveloriaView.update` lagi); `react` -> `city3.react(...)`; `runAction case 'c3'` -> `await this.city3?.handleAction(a.op, a.arg)`; `case 'joinVelthia'` -> mutasi party lalu `applyFlagState()`.
2. `Chapter1Story`: bila `chapter==='III'` (atau `chapter.3_started`) dan area `aveloria` -> delegasikan `objective/onStart/interact/trigger` ke `new AveloriaCrisisStory(state)`.
3. Posisi awal Bab III di Aveloria: halaman istana, mis. `RETURN_SPAWN` {640,616,'up'}. Posisi lain tetap aman (gerbang dibuka otomatis bila pemain sudah di luar).
4. `changeArea 'temple'`: spawn Kuil dari lead. `ASSET_INDEX.md`: tambahkan `town_crisis_atlas` (DRAFT, code-native, 200 frame) dan catatan di bawah.
5. `crisisStage` dapat dipakai untuk audio/HUD; tidak ada data save baru.

## Bukti
- Unit: `tests/unit/aveloria-crisis-*.test.ts` = 72 tes lulus (rute/segmen/posisi dapat dipijak per tahap, jumlah warga 6-10, tabel tahap -> visual, story idempoten/tanpa softlock/join sekali/flag setelah dialog, atlas: sel 32x48, kaki y=46, tanpa piksel tepi, alfa keras, <=40 warna, idle berbeda + kaki identik, tidak ada jam pasir, view dengan scene tiruan: apply per tahap, apply berulang, koreografi selesai, timeout saat update macet, pan tak selesai, destroy/shutdown tanpa timer sisa). `aveloria.test.ts`, `townReach.test.ts` lulus tidak berubah. `npx tsc --noEmit` bersih.
- Pratinjau (`aveloria-preview/`, skala 2x, disusun generator dengan urutan depth runtime, tanpa jitter/kibaran): `00_full_level3`, `01_start_court`, `02_start_plaza`, `03_level2_market`, `04_evac_mid_plaza`, `05_evac_mid_gate`, `06_evac_done_gate`, `07_council_room`, `08_decision_level3`, `09_departed_gate`. Dilihat: kota yang sama dengan retakan emas, batu melayang, kereta barang, warga mengalir ke gerbang; rute tengah (avenue) tidak tertutup prop.

## Kekurangan jujur
- **Tidak diverifikasi di browser** (build/E2E dilarang kontrak): animasi runtime (jitter batu, api tersendat, kibaran panji, jam, lonceng, arus warga, kamera) hanya diuji logikanya lewat scene tiruan dan pratinjau statis. Perlu satu pass visual oleh lead pada 1366x768 dan 1920x1080.
- Seni DRAFT: batu melayang kecil dan pucat di atas paving pucat (kontras rendah, bayangan bulat membantu); retakan tipis; warga hasil generator berpola sama (9 varian, kiri = cermin kanan, kain/rambut idle sederhana); bangsawan berjubah tanpa kaki bergerak; penjaga/bangsawan lebih tinggi dari 46 px karena topi/tombak/sanggul (tinggi 43-46). Bukan kualitas final.
- Warga tidak punya collision (pemain bisa menembus; mereka berhenti singkat bila pemain tepat di depan). Torvan juga tanpa collision saat berjalan.
- Warga/penjaga gerbang di bawah lengkung gerbang tertutup sebagian oleh lintel (oklusi depth alami).
- `crisisOpen` memanggil `hitch` yang menghentikan hanya sprite milik view (bukan pemain/HUD).
- `ASSET_INDEX.md` belum dicatat (bukan milik saya; lihat permintaan #4).
