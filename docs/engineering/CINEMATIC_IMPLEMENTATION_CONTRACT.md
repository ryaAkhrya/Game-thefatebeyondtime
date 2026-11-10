# CINEMATIC IMPLEMENTATION CONTRACT — PHASER / WEB

**Kanon:** Cerita Revisi 02; `docs/narrative/STORY_AND_SCENES.md` v2 (40 beat); `docs/narrative/SCENE_DIRECTION_BIBLE.md`; `RULES.md`.

## Scene data, bukan GDScript

Cutscene disimpan sebagai action data ber-ID stabil, didispatch oleh `CutsceneRunner` TypeScript, dan di-render dengan Phaser Scenes/Camera/Audio. Contoh kontrak logis (bukan API Phaser bawaan):

```json
{
  "scene_id": "c1_08_velthia_meeting",
  "required_flags": ["story.c1_archive"],
  "once_flag": "story.c1_velthia",
  "steps": [
    {"type": "camera_focus", "target": "velthia", "duration_ms": 350},
    {"type": "dialogue", "dialogue_id": "c1_08_intro"},
    {"type": "set_flag", "key": "story.c1_velthia", "value": true}
  ],
  "on_skip": {"ensure_flag": "story.c1_velthia"}
}
```

Rules:
- Actions idempotent; skip/load/replay tidak pernah menggandakan reward.
- Dialog visible mematuhi Settings `text_speed`; tidak membuat keyboard terperangkap.
- Kamera hanya berpindah saat informasi baru muncul, tidak ada pan/screen shake yang mengganggu.
- `Reduced Flashes` dan `Screen Shake` SETTINGS benar-benar menekan efek cutscene.
- Optional music user masuk melalui `AudioManager` track ID; tanpa file gunakan placeholder/silence aman, jangan fabricate track.
- Transisi modern **setelah** Chapter IV, lalu epilog tebing sebagai flashback. Jangan memperlihatkan foto/ponsel ke karakter Aveloria.
- GameState menyimpan flags quest dan scene completion, bukan state midway dari setiap frame sinematik.

## QA

Uji: Enter spam; Escape pause; skip saat dialog; refresh di checkpoint; load sesudah cutscene; reduced effects on/off; missing asset audio; fullscreen toggle selama transisi; input tidak bocor ke World; public build tidak mengambil privat files.
