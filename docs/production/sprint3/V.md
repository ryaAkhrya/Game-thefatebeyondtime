# Agen V (VFX) — catatan Phase 7

Status semua aset: **DRAFT / NEEDS_REVIEW** (digambar dengan kode deterministik, belum disentuh seniman). Tidak ada BGM, tidak ada git, `dist` tidak disentuh.

## Yang dibuat
| Bagian | Lokasi |
|---|---|
| Pustaka runtime | `web/src/game/vfx/Vfx.ts` (kelas `Vfx`, `createVfx`), `vfxSpecs.ts` (tabel data), `vfxAssets.ts` (`VFX_ATLASES` terisi + `VFX_PALETTES`), `index.ts` |
| Generator atlas (reproducible) | `web/scripts/vfx/build.mjs` + `kit.mjs` + `draw-{combat,nature,velthia,enemy,chrono}.mjs`. Jalankan `node scripts/vfx/build.mjs [vfx_combat ...]` dari `web/` (hanya Node + `encodePNG` dari `scripts/lib/pixelkit.mjs`) |
| Atlas | `web/public/assets/vfx/vfx_{combat,nature,velthia,enemy,chrono}.png/.json` (Phaser atlas JSON hash, pivot per frame, pivot x selalu 0,5 agar flipX aman) |
| Contact sheet (zoom 4x, latar tanah/hutan, 1 baris = 1 grup efek, nomor baris + `.rows.txt`) | `docs/production/sprint3/vfx-contact-sheets/*.png` |
| Tes | `web/tests/unit/vfx-atlas.test.ts` (atlas + tabel spec), `web/tests/unit/vfx.test.ts` (logika Vfx dengan scene palsu) |

Atlas: combat 45 frame/16 warna, nature 35/13, velthia 53/13, enemy 31/16, chrono 33/13. Setiap atlas: palet tertutup ≤16 warna (kanvas berindeks palet di generator), alfa hanya 0/255, tanpa blur/bloom/gradien halus, cahaya kiri-atas.

## API untuk lead
```ts
import { Vfx } from '../vfx';
// di BattleScene.create():
this.vfx2 = new Vfx(this, {
  reducedFlashes: () => this.services.settings.get('reduced_flashes'),            // dibaca tiap play()
  screenShake: (ms, i) => this.services.effects.shake(this, ms, i),               // opsional; Effects sudah cek Screen Shake
});
// pemakaian (koordinat = piksel panggung, kamera stage, depth < 20):
this.vfx2.play('impact_hit', target.x, target.y - 20);
this.vfx2.play('greatsword_trail', midX, midY, { flip: true });                   // Yaric di kanan menghadap kiri => flip:true
this.vfx2.play('velthia_concord', yaric.x, yaric.y - 20, { target: { x: velthia.x, y: velthia.y - 20 } });
this.vfx2.play('torvan_leaf_bolt', c03.x, c03.y - 24, { target: { x: e.x, y: e.y - 24 }, flip: true, onDone: () => {} });
// pembersihan: retry/transisi => this.vfx2.clear();  Scene SHUTDOWN => otomatis destroy (listener sudah dipasang).
```
- `new Vfx(scene, opts)` menerima `Phaser.Scene` langsung (diperiksa `tsc`). Ia mendengarkan event `update` scene (tidak perlu dipanggil manual) dan `shutdown`.
- `play(id, x, y, {flip, scale (dibulatkan ≥1), depth (dijepit 0..19), target, onDone, seed})`; id tak dikenal diabaikan. Seni digambar **menghadap kanan**; musuh di kiri menyerang kanan (flip default), Yaric/Torvan/Velthia di kanan => `flip:true`.
- `clear()` melepas semua sprite ke pool tanpa `onDone`; `active()` = sprite hidup (≤64); `running()` = efek berjalan; `destroy()`.
- Titik acuan (anchor) tiap efek: pusat sel frame. Efek tanah (`ground_slam_crack`, `dust_puff`, `chronolith_slam`, `torvan_vine/support`, `forest_summon_small`, `velthia_bloom`) mengharapkan (x,y) = titik garis tanah (kecuali bloom/support yang pivot-nya pangkal batang: frame sudah memakai pivot y bawah). Contoh: Ground Slam → `play('ground_slam_crack', target.x, GROUND.C01*h)`. Efek ini bisa menggantikan/menambah sprite slab lama.
- Depth: default 10; retakan/cincin tanah otomatis −7 (=3, di bawah petarung depth 4), pilar +1. Sprite VFX **tidak** berada di kamera UI (depth<20 → `filterCameras` mengabaikannya di UI camera), jadi tidak pernah menutupi HP/MP/menu.
- Reduced Flashes: efek `flashy` (`greatsword_trail, impact_hit, impact_heavy, velthia_pulse, shield_hit_spark, chronolith_charge`) memakai frame varian tenang (`*_c`: tanpa putih penuh, inti lebih kecil) dan partikel ½; anak efek mewarisi.
- Guncangan (`ground_slam_crack` 160ms/0,007, `impact_heavy` 120/0,005, `mournfang_slash` 110/0,004, `chronolith_slam` 200/0,009) dipanggil lewat callback `screenShake` (jika diberikan). Lead sebaiknya tidak lagi memanggil shake sendiri untuk id ini.

## Id dan isi
Daftar di `vfxSpecs.ts` (`VFX_SPECS`): durasi, `maxParticles`, atlas, `flashy`, `calm`, layer (anim/burst/travel/link), `children`, `shake`. Ringkas:
- Yaric/umum: `greatsword_trail` (busur 5 frame), `impact_hit`, `impact_heavy`, `ground_slam_crack` (retakan 7 tahap + `debris_burst` batu/tanah ballistik memantul 1x, bukan konfeti + 2 `dust_puff`), `debris_burst`, `dust_puff`.
- Torvan (sudut tajam, hijau-cokelat): `torvan_leaf_bolt` (proyektil daun bersudut + jejak daun diskret + ledakan serpihan), `torvan_vine` (3 sulur zig-zag berduri), `torvan_support` (tunas tumbuh + spora), `forest_summon_small` (akar runcing menembus tanah).
- Velthia (lengkung, simetris, plum/lime/emas pucat): `velthia_pulse` (telapak membuka → SATU busur cahaya bersih bergerak ke target → cincin), `velthia_mend` (3 cincin di kaki + partikel naik bergoyang), `velthia_ward` (sigil oval simetris + `shield_hit_spark`), `velthia_bloom` (kuncup → bunga dua lapis + kelopak jatuh), `velthia_concord` (rantai simpul di lengkung antara `source` dan `opts.target`, sigil di kedua ujung; ditarik kembali).
- Musuh: `hollowling_claw`, `mournfang_slash` (+guncangan), `veyrath_strike` (tusukan lurus baja dingin), `chronolith_charge` (lengkung teal menyala bertahap + inti ambar + partikel berkumpul), `chronolith_slam` (cincin batu mendatar + 5 pilar + debris + debu + guncangan), `chronolith_temporal` (cincin putus-putus teal, segmen bergeser 1px, kontraksi bertahap — halus, tanpa neon/glitch/jam).
- Bersama: `shield_hit_spark`, `status_poison` (awan + gelembung berpola frame), `heal_sparkle`.

## Bukti
- `npx tsc --noEmit`: bersih.
- `npx vitest run tests/unit/vfx.test.ts tests/unit/vfx-atlas.test.ts`: 73 tes lulus. Atlas: PNG terdekode, ukuran=meta, frame dalam batas & tidak saling tumpang, pivot x=0,5, alfa hanya 0/255, tidak ada frame kosong/opak penuh, tidak ada piksel di luar rect frame, ≤16 warna dan ⊆ `VFX_PALETTES`, contact sheet ada; setiap frame yang dirujuk spec ada pada atlasnya. Spec: semua 24 id kontrak, `maxParticles` ≥ puncak sprite terhitung dari data (≤64), durasi ≥ akhir layer/anak/guncangan, efek flashy punya varian tenang. Logika: spawn/selesai/onDone, pool (tidak ada objek baru melebihi puncak), koordinat & skala bulat, depth<20, flip, target, cap 64 persis, `clear()`, `destroy()`, event scene, Reduced Flashes (frame `_N_c`, partikel ½, dibaca saat play, anak mewarisi), shake, komposit, concord, determinisme seed.
- Tinjauan visual: contact sheet dilihat satu per satu (zoom 4x). Belum ada tangkapan dalam game (tidak boleh build/E2E); lead perlu QA visual di battle nyata.

## Keterbatasan / DRAFT
- Seni dibuat dengan kode: bentuk bersih tapi belum sekelas redraw seniman; `mslash_1` terbaca sebagai gumpalan sebelum melengkung; `nburst_1` agak datar; sigil concord (frame rotasi) cukup sibuk; `cpillar` kecil dibanding sprite Chronolith; `crewind` sengaja sangat halus (mungkin terlalu tipis pada 1366x768 — naikkan `scale:2` bila perlu).
- Belum dihubungkan ke BattleScene (sesuai kepemilikan); pivot/offset (mis. y target −20/−24) perlu disetel lead terhadap sprite sebenarnya.
- Efek tidak memakai additive blend/alfa sama sekali (hard pixel). Posisi partikel dibulatkan tiap langkah 33 ms (≈30 fps "on twos"), bukan 60 fps halus — disengaja.
- `reducedFlashes` hanya menukar frame/jumlah; kilat kamera (`Effects.flash`) tetap tanggung jawab lead.

## Permintaan ke lead
1. Tambah skrip npm opsional `"assets:vfx": "node scripts/vfx/build.mjs"` (package.json bukan milikku).
2. Tambahkan `docs/production/ASSET_INDEX.md` entri "VFX Phase 7 — DRAFT/NEEDS_REVIEW" menunjuk ke berkas ini.
3. Saat integrasi: panggil `vfx.clear()` pada retry/keluar battle; jangan memanggil `Effects.flash` di samping efek flashy kecuali Reduced Flashes mati.
