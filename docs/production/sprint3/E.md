# Agent E (Engine) - Phase 7 Chapter III: logika tempur, party, save

Status: DONE untuk logika murni (tanpa Phaser). Semua angka DRAFT; label jujur. Tes: `chapter3-engine.test.ts` (42), `chapter3-balance.test.ts` (6) plus 676 baseline tetap hijau. `tsc --noEmit` bersih.

## Temuan progression (penting)
- Cap level = 5 (EXP 235) di seluruh game; `thresholds` 5 entri. Brief menyebut level 8-10: TIDAK mungkin tanpa memperpanjang kurva. Saya tidak memperpanjangnya (menyentuh validasi save semua bab).
- Akhir Bab II realistis: Yaric EXP 183 = **L4** (hadiah wajib 25+45+28+85), Torvan EXP 113 = **L3**. Velthia bergabung dengan EXP Yaric (jadi L4). Hadiah Bab III mencapai cap L5 (EXP terpotong; receipt menampilkan selisih nyata).

## Velthia (C02) - file
- `rpg/velthia.ts`: `VELTHIA_SKILLS` / `VELTHIA_SKILL_INFO[id] = {id,name,description(ID),mp,target('enemy'|'ally'|'allies'|'yaric'),unlockLevel,frameKey,vfx}`, rumus `pulseDamage/mendAmount/wardAmount/bloomAmount`, `VELTHIA_TUNING`.
- `rpg/definitions.ts`: `VELTHIA_PROFILE` (base HP70 MP26 ATK6 DEF5 MAG16 MDEF12 SPD9; growth 8/4/1/1/2/2/1), `PROFILES.C02`, item `royal_robe` (armor, DEF+2 MDEF+3, tidak dijual), tanpa senjata (`weapon:null`), `STARTING_EQUIPMENT`, SKILLS royal_mage (5 perintah cost 0 terbuka otomatis menurut level + 2 pasif DRAF `gentle_light`, `royal_poise` yang memakai poin jurus).
- L4 (masuk Bab III): HP94 MP38 ATK9 DEF10 MAG22 MDEF21 SPD12.
- Unlock: pulse L1, mend L1, ward L2, bloom L3, concord L4 (otomatis di `createCharacter`/`gainExp`).
- Ultimate Perlindungan TIDAK ada. `velthia_ward` memakai status `shield` reusable (`addShield(actor, amount, turns)` + `applyDamage` di BattleEngine); Ultimate Bab IV tinggal memanggil `addShield` dengan amount besar/durasi lain.

| id perintah | MP | target | efek | frameKey | vfx id |
|---|---|---|---|---|---|
| `velthia_pulse` | 2 | `enemy` (targetId musuh; default musuh pertama) | sihir MAG*1.5 - MDEF*0.5, abaikan DEF | `cast` | `velthia_pulse` |
| `velthia_mend` | 4 | `ally` (targetId sekutu hidup; default = rasio HP terendah). Ditolak jika HP penuh/tumbang | heal 16 + MAG*1.2 (=42 di L4) | `heal` | `velthia_mend` |
| `velthia_ward` | 5 | `ally` (boleh diri sendiri) | shield menyerap 16 + MAG*1.3 (=44) selama 3 giliran pemilik (diri sendiri +1) | `shield` | `velthia_ward` |
| `velthia_bloom` | 7 | `allies` (tanpa targetId) | regen 8% maxHP (min 6) tiap akhir giliran pemilik x3, hapus racun | `summon` | `velthia_bloom` |
| `velthia_concord` | 6 | `yaric` (targetId opsional hanya `C01`); ditolak jika Yaric tumbang/pemanggil Yaric | status `concord` (serangan Yaric berikutnya x1.5, satu kali) + 4 MP ke Yaric | `special` | `velthia_concord` |

Command union: `Command` di `combat/BattleEngine.ts` mencakup `VelthiaCommand`. Gunakan `engine.unavailable(cmd,target)` untuk teks alasan (ID) dan menonaktifkan item menu; skill terlihat di menu bila `actor.skills` memuatnya (diisi dari `unlockedSkills` oleh BattleSession).

## Kontrak event untuk BattleScene
`engine.impact(token)` sekarang mengembalikan `ImpactResult` (field lama `amount,targetId,text` tidak berubah):
```
{ amount, targetId, text,
  actorId, command, skillId?, frameKey,            // 'attack'|'anticipation'|'cast'|'heal'|'shield'|'summon'|'guard'|'special'|'idle_a'
  targetIds: string[], effects: EffectResult[],    // {targetId, kind:'damage'|'heal'|'shield'|'regen'|'buff'|'mp'|'guard'|'shift'|'telegraph'|'none', amount, absorbed?, status?}
  absorbed: number,                                // total serapan shield
  telegraph?: {targetId, next:'chrono_slam'},      // hanya chrono_charge
  order?: string[] }                               // hanya chrono_rewind (urutan giliran baru)
```
- `amount` = HP nyata berubah pada `targetId` (kerusakan setelah serapan / pemulihan). Untuk multi-target (`chrono_sweep`, `velthia_bloom`) gunakan `effects`.
- `engine.snapshot().ticks` (diisi `finish()`): `{actorId, kind:'poison'|'regen', amount}[]` untuk angka mengambang akhir giliran.
- `ImpactResult.frameKey` dipakai sebagai kunci frame BattleAtlas (kunci khusus `cast/heal/shield/summon/guard/special`; cadangan: `attack` untuk aktor tanpa pose khusus).
- Status baru di `actor.statuses`: `shield{amount,turns}`, `regen{amount,turns}`, `concord`, `chrono_guard`. Id intent musuh baru: `oath_strike|oath_brace|chrono_sweep|chrono_charge|chrono_slam|chrono_guard|chrono_rewind`. Aksi musuh dijalankan seperti biasa: `doTurn(enemyAI(engine.current))`.
- HUD intent: `intentHint(enemyActor)` mengembalikan teks ID; untuk `chrono_slam` memakai `actor.intentTargetName` (nama sudah mengikuti gating nama Yaric). Actor B03 membawa `phase` (1/2), `intentTargetId`.
- `chrono_rewind` menukar urutan dua anggota hidup dan menghapus `atk_up/concord` anggota yang tertunda; `result.order` berisi urutan baru agar bar giliran bisa diperbarui (state `snapshot().order`/`cursor` otomatis benar).

## Party switch dan save
- `rpg/party.ts`: `enterChapter3(data)` (butuh `chapter.2_complete`, set chapter 'III' + `C3.start`, idempoten), `joinVelthia(data)` = `applyVelthiaJoin(data)` (butuh chapter III, `C3.start`, Torvan bergabung, party `C01,C03`; set `party.velthia_joined`, party `['C01','C02']`, `rpg.characters.C02` pada EXP Yaric, 1x `royal_robe`, `partyVitals.C02` penuh; Torvan: `rpg.characters.C03`, `partyVitals.C03`, perlengkapan/jurus/item **tidak diubah**), `restChapter3Party(data)` (pulih semua anggota termasuk cadangan; set `checkpoint.c3_before_chronolith` jika `c3.hall_gate_open`).
- `rpg/vitals.ts`: `memberVitals(data,id)` / `setMemberVitals(data,id,v)` (C01 -> `vitals`, lainnya -> `partyVitals[id]`). `useItem/equip/applyReward/BattleSession` memakainya.
- `GameState.partyVitals`: `{C03:V; C02?:V}`. Validasi: `C03` wajib sesudah Torvan bergabung (tetap saat cadangan); `C02` wajib hanya jika `party.velthia_joined`; party harus persis `C01,C02` (setelah join), `C01,C03` (sebelum), `C01` (sebelum Torvan). `rpg.characters.C02` dilarang tanpa flag.
- Tanpa migrasi schema: save v2 lama (Bab I-II) divalidasi/dimuat identik (tes: `toEqual` terhadap fixture akhir Bab II); `partyVitals` lama hanya `C03`. Envelope tetap `save_v2`, `schemaVersion 2`.
- Validasi Bab III: flag/area `temple`/chapter 'III' butuh `chapter.2_complete`; chapter III butuh `chapter.3_started`; area `temple` butuh `party.velthia_joined`; urutan: `temple_entered`<-join, `hall_gate_open`<-`temple_entered`, `boss.chronolith`<-join, `chronolith_outro_seen`<-boss, `chapter.3_complete`<-boss, dll. `world.lastChapter2EncounterSec` kini diizinkan di chapter II atau III (opsional).
- `storyBeat` diturunkan dari flag (urutan dari akhir): `C3-DONE`(complete) > `C3-07`(outroSeen/hiddenName/promise) > `C3-06`(chronolith) > `C3-05`(gateOpen/checkpoint/introSeen) > `C3-04`(camp/puzzle*/templeFight1/2) > `C3-03`(departed/templeEntered) > `C3-02`(velthiaJoined/torvanStays) > `C3-01`(start).

## Encounter / AI
- `EncounterId` baru: `temple_oathguard` (M05), `temple_mixed` (M05+M03), `chronolith` (B03). Syarat BattleSession: chapter III, area `temple`, `party.velthia_joined`, party `C01,C02`; `chronolith` juga butuh `c3.hall_gate_open`. Selain itu `throw`.
- Bendera selesai (memakai `chapter3Flags`): `battle.temple_oathguard`, `battle.temple_mixed`, `boss.chronolith`. Hadiah sekali lewat id `reward.c3_temple_oathguard.rpg` (26 EXP/10 emas), `reward.c3_temple_mixed.rpg` (24/12 + 1 Potion), `reward.c3_chronolith.rpg` (120/45 + 2 Potion). `commitVictory()` hanya menyetel flag encounter + reward flag + vitals + item + hadiah; flag cerita (`c3.chronolith_outro_seen`, dll.) milik lead.
- `allowRun`: true untuk dua encounter opsional, false untuk Chronolith. `retry()` setelah defeat memuat ulang checkpoint pra-battle (tanpa hadiah ganda). Setelah menang di chapter III, anggota 0 HP bangkit 25% maxHP (anti-softlock); juga bila state masuk battle sudah 0 HP.
- M05 Oathguard: HP118 ATK17 DEF10 MDEF6 SPD8; pola `strike, brace(def_up 2), strike` loop, intent terlihat; sihir Velthia menembus DEF. M03 Wisplet memakai stat Bab II (`WISPLET_STATS`, tak berubah).
- B03 Chronolith: HP360 ATK38 DEF13 MDEF10 SPD8. Fase 1 loop 8 aksi: `sweep, charge, slam, guard, sweep, charge, slam, rewind`. `charge` menelegraf target (rotasi Yaric, Velthia, ...), satu ronde pemain penuh (kedua anggota hidup) berlalu sebelum `slam` (kuat tunggal, 2.3x); `sweep` ringan semua (0.9x); `guard` = damage diterima x0.5 selama satu ronde pemain, diumumkan; `rewind` lihat atas (tak ada yang kehilangan giliran). Fase 2 saat HP <= 50%, hanya diputuskan SETELAH aksi bos selesai dan tidak pernah di antara charge/slam: dibuka `guard` (jeda), lalu loop `charge, slam(2.7x), sweep(1.1x), rewind`. Tanpa RNG, tanpa QTE.

## Simulasi balance (tests/unit/chapter3-balance.test.ts, seeded)
Pesta Yaric L4 + Velthia L4 (worst case: tanpa pertarungan kuil sisi, tanpa pasif), kebijakan serakah: mend saat terluka, ward pada target hantaman, concord, bloom saat guard, pulse, Ground Slam.
- Pemain kompeten, tanpa kesalahan: menang, **9 aksi bos (0 potion) / 10 (3 potion)**.
- 10% aksi acak: menang ~91-94% (rata-rata 9-10 ronde); 35% aksi acak: ~61-65% (retry layak). L5: 100%, ~8.4 ronde.
- Pemain naif (serang saja): menang dengan 6-8 ronde di L4 (tidak "tembok"); tes hanya menjamin tidak lebih baik dari yang kompeten.
- Defeat lalu retry: checkpoint persis kembali, bos penuh, hadiah tidak dobel; menang kedua tercommit sekali.

## Permintaan ke lead (singkat)
1. BattleScene: tambah menu Velthia (`VELTHIA_SKILLS` + `engine.unavailable`), baca `ImpactResult.effects/frameKey`, `snapshot().ticks`, `intentHint`, enemy id `M05`/`B03`, `order` dari rewind.
2. `RpgMenuScene.ts:76` (`characterId==='C03' ? partyVitals.C03 : vitals`) -> pakai `memberVitals(state, id)` agar C02 benar; `SaveLoadScene.ts:91` tampilkan anggota aktif sesuai `data.party` (C02) bukan hanya C03; tombol kiri/kanan RpgMenu perlu mencakup C02.
3. Panggil `enterChapter3`, `joinVelthia`, `restChapter3Party` dari story/aksi; set sendiri flag `c3.*`, `story.c3_decision`, `c3.torvan_stays`, pos/area `temple`.
4. Jika level 8-10 benar-benar diinginkan, kurva `thresholds` perlu diperpanjang (keputusan desain + migrasi validasi); saat ini cap 5.
5. Daftar Derrria belum menjual `royal_robe`; itu tidak perlu (item cerita).
