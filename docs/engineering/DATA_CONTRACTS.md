# DATA CONTRACTS — TYPESCRIPT / JSON

**Data-driven**: ID stabil, model TypeScript, dialogue JSON atau TS typed, story flags idempotent. Angka contoh untuk balancing, bukan angka final.

## Entity schemas (konseptual)

```typescript
type Stats = { hp: number; mp: number; atk: number; def: number; mag: number; mdef: number; spd: number };
type StatusEffect = 'poison' | 'stun' | 'atk_up' | 'def_up';
type Character = { id: string; displayName: string; classId: string; base: Stats; skillIds: string[] };
type Enemy = { id: string; displayName: string; base: Stats; aiProfileId: string; exp: number; drops: string[] };
type DialogueLine = { id: string; speakerId: string; text: string; nextId?: string };
type EventFlag = string; // e.g. story.c3_evacuate
```

## Contoh data (angka TBD)

```json
{"id":"yaric", "displayName":"Yaric", "classId":"swordsman", "base":{"hp":45,"mp":12,"atk":9,"def":6,"mag":3,"mdef":4,"spd":7}}
```

```json
{"id":"hollowling", "displayName":"Hollowling", "aiProfileId":"basic", "base":{"hp":20,"mp":0,"atk":5,"def":2,"mag":0,"mdef":1,"spd":4}, "exp":8, "drops":[]}
```

## GameState dan saves

- `save_version=1`, `chapter`, `scene_id`, `area_id`, `spawn`, `party_ids`, `member_stats`, `inventory`, `equipment`, `quest_flags`, `event_flags`, `exp`, `level`, `unlocked_skills`, `last_saved_at`.
- `settings_version=1` **separate** dari story progress. `settings` punya `master_volume`, `bgm_volume`, `sfx_volume`, `mute_all`, `text_speed`, `fullscreen`, `screen_scale`, `screen_shake`, `reduced_flashes`.
- Validate schema pada load; event rewards disimpan sebagai flags `reward.<id>.claimed` agar tidak double ketika reload.
- Jangan serialisasi Phaser GameObjects, DOM Nodes, callbacks, atau audio context.

## Story IDs

Gunakan 40 beat `C1-..`, `C2-..`, `C3-..`, `C4-..`, `M-01..03`, `E-01..05`; ID internal snake_case boleh asalkan mapping eksplisit. Nama lokasi masih working. Teks display sepenuhnya bahasa Indonesia.

## Save versioning

`SaveRepository` melakukan migration/validation. Jika invalid: tulis error manusiawi dan jangan menerapkan state parsial. Tidak pernah mengunggah save ke server tanpa persetujuan.
