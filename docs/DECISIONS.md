# DECISIONS — KEPUTUSAN FINAL & VERSI

**Status: Locked unless Game Director explicitly revises.** Tanggal sinkronisasi 8 November 2026.

## Gameplay dan platform

| ID | Keputusan |
|---|---|
| D01 | Judul **The Fate: Beyond Time**, JRPG Classic 16-Bit, cerita personal yang tetap utuh untuk publik |
| D02 | **Web desktop** PC/laptop (browser), keyboard, landscape 16:9, single-player |
| D03 | **Phaser 4.2.1 + TypeScript + Vite**, kerja di IDE (VS Code) dengan Claude Code; hilangkan arsitektur Godot |
| D04 | Top-down exploration, pure turn-based side-view battle, **tanpa timing/dodge mini-game** |
| D05 | 2 anggota party aktif maksimum: Yaric solo; Torvan masuk Chapter II; Velthia menggantikannya sementara di Chapter III–IV |
| D06 | 7 stat: HP, MP, ATK, DEF, MAG, MDEF, SPD; class-based, EXP/level + Skill Tree |
| D07 | Status: Poison, Stun, ATK Up, DEF Up. Random encounter luar zona aman, repel item opsional |
| D08 | World **linear**, 7 area besar: Aveloria, Liora, 2 hutan, 2 dungeon, 1 area ending |
| D09 | Main quest + side quest singkat, inventory, equipment, shop, manual save dan autosave |
| D10 | Dialog seluruhnya **bahasa Indonesia**, tidak terlalu baku namun sesuai latar kerajaan; no voice acting |
| D11 | Musik instrumental bernuansa 16-bit; sebagian soundtrack akan dibuat sendiri oleh Game Director |
| D12 | **Settings wajib**: master/BGM/SFX volume, text speed, fullscreen, display scaling, reduced effects, persist setting di browser |
| D13 | Placeholder asset sementara; **sketsa karakter pasangan pembuat game menjadi sumber desain final**, tidak boleh dikarang AI terlebih dahulu |
| D14 | Web desktop saja: tidak menjanjikan kontrol sentuh/mobile. Browser HP mendapat pesan perangkat belum didukung |
| D15 | Tidak ada backend/login/cloud save wajib; game di-host sebagai static site; privasi foto harus aman |

## Cerita & roster

- Cerita **Revisi 02 disetujui**. Kanon di `docs/source/CERITA_APPROVED_REVISI_02.docx`; transkrip `docs/narrative/APPROVED_STORY_R02.md`.
- **Yaric** (latar fantasi; reinkarnasi modern **Yudis**), **Velthia** (Ratu Aveloria), **Torvan** (bocah/mage support; pencipta dunia), **Varlgrim** (The Warden, salah tafsir sebab bencana).
- Pendukung: Azie (penasihat), Talric (kapten), Zira (tetua Liora), Nambo (pengembara hutan), Derrria the Merchant.
- Monster: Hollowling, Briaroot, Wisplet, Gravorn, Oathguard, Riftborn.
- Boss: Mournfang, Veyrath, Chronolith, Varlgrim (sama dengan antagonis C04).
- 4 chapter + epilog, sasaran durasi 1,5–2,25 jam. Epilog tebing adalah **kenangan Aveloria** yang diputar kembali sesudah modern interlude; bukan karakter masa lalu melihat masa depan.
- Modern interlude: **berabad-abad setelah Aveloria**, Yudis dan pasangannya menemukan peninggalan; ingatan datang via gema artefak. **Masa modern tidak menyebabkan masa lalu**.
- Varlgrim menyegel Heart of Time karena menyangka pertemuan dua jiwa menyebabkan musibah; **segel itulah sebab retakan**. Ia pernah kehilangan orang yang dicintai.
- Torvan pencipta dunia namun tidak bisa menulis ulang pilihan bebas atau menghapus konsekuensi tanpa merusak dunia; bukan penyelamat instan.
- Velthia memimpin evakuasi; kerusakan fisik nyata tetap ada meski ancaman diatasi. Varlgrim tidak otomatis dimaafkan.
- Epilog: **To Be Continued**, kredit, lalu P.S. anniversary pertama, ditandatangani Yudis di versi personal dengan konten yang disetujui.

## Status persetujuan

**LOCKED:** semua di atas. **WORKING / TBD:** nama kerja hutan/kuil/benteng/tebing, detail kehilangan Varlgrim, desain final, isi foto/kenangan privat, soundtrack user, teks persis P.S., angka balance, resolusi internal pixel.

**Migrasi:** dokumen Godot/Windows EXE sebelum 8 Nov 2026 digantikan oleh paket WEB DESKTOP v2.0; jangan mencampur instruksinya.
