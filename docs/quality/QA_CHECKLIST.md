# QA CHECKLIST — WEB DESKTOP

## Phase 4 — vertical slice sampai Mournfang

**PHASE 4 PASS (fungsional/QA otomatis).** Bukti/batasan: `../production/PHASE4_REPORT.md`. Bukan Chapter I penuh.

- [x] Baseline diulang: 378 unit, 311 browser produksi, 54 dev; strict TS/build.
- [x] 405 unit/15 files, TypeScript strict dan production build lulus; boss/counter/retry/reward/checkpoint/persistence/dialog/asset/route teruji.
- [x] Produksi Edge 375/375 (cerita ulang 162/162), Chrome 38/38, dev Edge 38/38; Title→Mournfang→save/refresh→penutup, 1366×768/1920×1080, no JS/asset/audio request errors.
- [x] Screenshot akhir map/boss/telegraph/defeat/ending/save diperiksa; hit/retry diverifikasi melalui frame/actor state. Art tetap DRAFT.
- [ ] Playtest manusia/pacing 10–15 menit, review art/balancing, GPU/layar nyata. Audio tetap AWAITING_COMPOSER.

## Phase 3 — RPG/persistence

**PHASE 3 PASS (fungsional/QA otomatis): 378 unit, 311 browser checks produksi, TypeScript strict dan build lulus.** Bukti dan batasan: `../production/PHASE3_REPORT.md`.

- [x] Unit progression, inventory/equipment, skills, shop, validation, migration, backup, quota dan checkpoint scheduling.
- [x] Browser menu/save/load/Continue, kedua resolusi, corrupted/unsupported/storage failure dan harness shop dieksekusi; re-run akhir di laporan.
- [x] Perjalanan keyboard dari Title sampai kemenangan, progress, save, refresh dan rekonstruksi state dunia dieksekusi.
- [ ] Review manusia untuk balance dan UI; browser selain Edge/headless belum diuji.

## Phase 2 — C1-04 (10 November 2026)

Status PARTIAL pada gate visual; bukti dan angka test: `../production/PHASE2_REPORT.md`.

- [x] 273 unit tests, strict TypeScript, production build.
- [x] Browser commands, MP habis, kemenangan, defeat/retry, Pause/Settings, efek nyata, 1366x768 dan 1920x1080 sudah dieksekusi; hasil suite final di laporan.
- [x] Atlas v3.3 PNG + metadata byte-identical; durasi/pivot/frame damage diintegrasikan.
- [x] Screenshot idle/attack/fracture/impact/victory/defeat/retry dan lembar kontak diperiksa.
- [ ] Cleanup potongan pedang/piksel tepi yang sudah ada pada atlas sumber; review artist/Game Director.
- [ ] Playtest manusia, GPU/performa layar nyata, fullscreen non-headless dan browser selain Edge.

**Jangan klaim PASS jika belum benar-benar diperiksa.** (Item tanpa centang = NOT RUN atau menunggu fase berikutnya, mis. audio terdengar, text speed pada dialog, Pause menu, Reduced Flashes pada efek nyata.) Setiap kolom adalah tes nyata: catat `PASS/FAIL/NOT RUN`, langkah, screenshot dan browser/OS.

## Build dan startup
- [x] `npm ci`/`npm install` dan `npm run build` lulus.  _(Phase 0, 10 Nov 2026: PASS, Edge 157 headless, lihat PHASE0_REPORT.md)_
- [x] `npm run dev` menampilkan title, `npm run preview` memuat build final.  _(dev dan preview: PASS; e2e 84/84 di keduanya)_
- [x] Browser console tidak ada exception kritis, file aset tidak 404.  _(Phase 0, 10 Nov 2026: PASS, Edge 157 headless, lihat PHASE0_REPORT.md)_ _Hanya layar Phase 0._
- [x] Tidak ada file `.gd`/`project.godot` yang dijadikan syarat.
- [x] Website tetap 16:9 pada 1366×768, 1920×1080, fullscreen dan windowed.  _(PASS windowed; fullscreen: toggle teruji, tampilan fullscreen nyata belum diperiksa manusia)_
- [x] Perangkat/viewport sempit mendapat pesan desktop-only yang layak.  _(Phase 0, 10 Nov 2026: PASS, Edge 157 headless, lihat PHASE0_REPORT.md)_

## Input / UX
- [ ] Semua menu, combat, dialog, Settings bisa dioperasikan keyboard tanpa mouse.
- [x] Tidak ada input bocor di balik modal, spam Enter tak double advance.  _(PASS untuk Title/Settings/Controls/placeholder; dialog Phase 1+)_
- [x] Title punya New Game, Continue, Settings; Continue disabled tanpa save.  _(Phase 0, 10 Nov 2026: PASS, Edge 157 headless, lihat PHASE0_REPORT.md)_ _(label: Mulai Baru, Lanjut, Pengaturan, Panduan Kontrol)_
- [x] Pause/Resume aman, tab background tak membuat player bergerak sendiri.  _(Phase 1: Pause/Resume PASS di e2e; tab background hanya diuji sebagai blur melepas tombol: unit + e2e Title, belum di dunia dengan tab sungguhan)_
- [ ] UI pixel grid konsisten, font terbaca, anti-slop `RULES.md` lulus.

## SETTINGS (WAJIB MVP)
- [ ] Master/BGM/SFX slider memengaruhi audio sesuai channel.
- [x] Mute tak mengubah nilai slider, kembali benar setelah unmute.  _(PASS di tingkat logika AudioManager; belum terdengar karena tanpa musik)_
- [x] Text speed Lambat/Normal/Cepat/Instan nyata mengubah dialog.  _(Phase 1: PASS pada dialog nyata: e2e Lambat vs Instan, unit untuk 4 mode)_
- [x] Fullscreen toggle bekerja atau menunjukkan alasan jika ditolak.  _(Phase 0, 10 Nov 2026: PASS, Edge 157 headless, lihat PHASE0_REPORT.md)_ _(diterima dan ditolak sama-sama ditangani)_
- [x] Window sizing/scale Pixel Perfect/Fit 16:9 tanpa blur/stretched.  _(PASS: 1366x768 = 4x, 1920x1080 = 6x tanpa blur; HiDPI nyata belum diuji)_
- [ ] Screen Shake OFF benar-benar menghilangkan shake, Reduced Flashes mengurangi flashing.
- [x] Settings dari Title dan Pause sama nilainya; tetap sesudah refresh/restart browser.  _(Phase 1: PASS: Pengaturan dari Menu Jeda dan Title memakai satu repository; tersimpan dan bertahan setelah refresh)_
- [x] Reset Defaults dengan konfirmasi, **tidak menghapus save**.  _(Phase 0, 10 Nov 2026: PASS, Edge 157 headless, lihat PHASE0_REPORT.md)_
- [x] Browser audio tidak mencoba autoplay sebelum interaksi.  _(PASS: tidak ada audio dimuat; unlock hanya setelah input pertama)_

## World, battle, progression
- [x] Movement/collision/interaction benar, NPC Nambo tak double reward.  _(Phase 1: PASS: Nambo/peti tidak memberi hasil ganda; uji manusia belum)_
- [ ] Random encounter hanya di area yang diizinkan dan cooldown berlaku.
- [ ] Attack, Skill, Item, Defend, Run, target, HP/MP, status dan victory/defeat/escape benar.
- [ ] Reward EXP/item/gold hanya satu kali; EXP → level & skill unlock bisa ditest.
- [ ] Peti tidak memberi potion kedua setelah load.
- [ ] Pause/Settings tidak mengonsumsi giliran battle.

## Save lokal
- [ ] Manual save + autosave, load mengembalikan posisi, quest, item, party, level, skills, flags.
- [ ] Refresh/close tab → Continue bekerja.
- [x] Save korup/dilarang browser storage tidak crash.  _(Phase 0, 10 Nov 2026: PASS, Edge 157 headless, lihat PHASE0_REPORT.md)_
- [ ] Autosave tidak menulis di tengah battle/cutscene transisi.
- [x] Settings persist terpisah dari save game.  _(Phase 0, 10 Nov 2026: PASS, Edge 157 headless, lihat PHASE0_REPORT.md)_

## Narrative canon
- [ ] **Revisi 02** tetap acuan; Varlgrim salah sebab segelnya sendiri.
- [ ] Torvan tidak memperbaiki semua masalah dengan kekuatan tanpa batas.
- [ ] Velthia punya aksi evakuasi yang menyelamatkan warga di IV.
- [ ] Dialog sepenuhnya Indonesia natural sesuai karakter.
- [ ] M-01..03 modern **sesudah IV**, E-01 tebing flashback; tidak ada paradoks.
- [ ] Foto/memori pribadi tidak dikarang AI; public build tanpa assets pribadi.
- [ ] Ending To Be Continued, P.S. sesudah credits private.

## Release / ownership
- [ ] Tidak ada analytics/cookies/tracker tanpa izin.
- [ ] Daftar sumber asset dan izin musik/foto ada.
- [ ] `dist` publik bebas foto/pesan pribadi.
- [ ] Build static HTTPS tested; URL actual baru diumumkan jika sudah deployed.
