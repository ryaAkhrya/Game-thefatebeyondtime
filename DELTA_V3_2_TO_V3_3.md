# Delta v3.2 → v3.3

The v3.2 tree was copied intact and patched. Approved story and all four DOCX are byte-identical. All 52 expressions, 27 turnarounds and the 287 dialogue rows remain.

- Existing paths retained: 383 / 383. Removed: 0.
- Existing file changed before regenerated index/report: 1. New paths before generated index/report: 94.
- C01 battle: 11 distinct frames, including attack follow-through, hit and death transitions; preview timed GIF at 1× and 4×.
- M01 battle: 10 distinct frames, right-facing, with attack/recoil/defeat sequence; preview timed GIF at 1× and 4×.
- Ground Slam: 8 distinct frames using wide earth slab; damage on zero-based VFX frame 5; timed GIF and five-stage actor+terrain+enemy composite at 1×/4×.
- UI: 17 Indonesian visual draft screens including battle layout, Controls, Pause, Skills, Save/Load, overwrite and error; three screens rendered at 1366×768 and 1920×1080.
- Legacy C01 v3.2 JSON alpha counts corrected from actual PNG: anticipation 7074, hit 5111; the corresponding PNG is byte-identical.

## Pre-existing file changed

- `assets/characters/C01_Yaric/v3_2/C01_ATLAS_PIXEL_PASS_V3_2.json` — alpha metadata correction only.

## New files from this patch (relative to package root)

- `UI_STYLE_SPEC_V3_3.md`
- `assets/characters/C01_Yaric/v3_3/C01_ANTICIPATION_V3_3.png`
- `assets/characters/C01_Yaric/v3_3/C01_ATLAS_PIXEL_PASS_V3_3.json`
- `assets/characters/C01_Yaric/v3_3/C01_ATLAS_PIXEL_PASS_V3_3.png`
- `assets/characters/C01_Yaric/v3_3/C01_ATTACK_CONTACT_V3_3.png`
- `assets/characters/C01_Yaric/v3_3/C01_ATTACK_WINDUP_V3_3.png`
- `assets/characters/C01_Yaric/v3_3/C01_DEATH_START_V3_3.png`
- `assets/characters/C01_Yaric/v3_3/C01_DEFEATED_V3_3.png`
- `assets/characters/C01_Yaric/v3_3/C01_FOLLOWTHROUGH_V3_3.png`
- `assets/characters/C01_Yaric/v3_3/C01_HIT_RECOIL_V3_3.png`
- `assets/characters/C01_Yaric/v3_3/C01_HIT_RECOVER_V3_3.png`
- `assets/characters/C01_Yaric/v3_3/C01_IDLE_A_V3_3.png`
- `assets/characters/C01_Yaric/v3_3/C01_IDLE_B_V3_3.png`
- `assets/characters/C01_Yaric/v3_3/C01_RECOVERY_V3_3.png`
- `assets/monsters/M01_Hollowling/v3_3/M01_ANTICIPATION_V3_3.png`
- `assets/monsters/M01_Hollowling/v3_3/M01_ATLAS_PIXEL_PASS_V3_3.json`
- `assets/monsters/M01_Hollowling/v3_3/M01_ATLAS_PIXEL_PASS_V3_3.png`
- `assets/monsters/M01_Hollowling/v3_3/M01_ATTACK_V3_3.png`
- `assets/monsters/M01_Hollowling/v3_3/M01_DEATH_START_V3_3.png`
- `assets/monsters/M01_Hollowling/v3_3/M01_DEFEATED_V3_3.png`
- `assets/monsters/M01_Hollowling/v3_3/M01_FOLLOWTHROUGH_V3_3.png`
- `assets/monsters/M01_Hollowling/v3_3/M01_HIT_RECOIL_V3_3.png`
- `assets/monsters/M01_Hollowling/v3_3/M01_HIT_RECOVER_V3_3.png`
- `assets/monsters/M01_Hollowling/v3_3/M01_IDLE_A_V3_3.png`
- `assets/monsters/M01_Hollowling/v3_3/M01_IDLE_B_V3_3.png`
- `assets/monsters/M01_Hollowling/v3_3/M01_RECOVERY_V3_3.png`
- `assets/source_references/v3_3/C01_GENERATED_SOURCE_SHEET.png`
- `assets/source_references/v3_3/M01_GENERATED_SOURCE_SHEET.png`
- `assets/source_references/v3_3/VFX_GENERATED_SOURCE_SHEET.png`
- `assets/ui/v3_3/BATTLE_COMPOSITE_ANTICIPATION_V3_3_DRAFT.png`
- `assets/ui/v3_3/BATTLE_COMPOSITE_CRACK_V3_3_DRAFT.png`
- `assets/ui/v3_3/BATTLE_COMPOSITE_IMPACT_V3_3_DRAFT.png`
- `assets/ui/v3_3/BATTLE_COMPOSITE_RISE_V3_3_DRAFT.png`
- `assets/ui/v3_3/BATTLE_COMPOSITE_SETTLE_V3_3_DRAFT.png`
- `assets/ui/v3_3/BATTLE_GROUND_SLAM_V3_3_DRAFT.png`
- `assets/ui/v3_3/BATTLE_TARGET_V3_3_DRAFT.png`
- `assets/ui/v3_3/CONTROLS_V3_3_DRAFT.png`
- `assets/ui/v3_3/DIALOGUE_V3_3_DRAFT.png`
- `assets/ui/v3_3/INVENTORY_V3_3_DRAFT.png`
- `assets/ui/v3_3/PAUSE_V3_3_DRAFT.png`
- `assets/ui/v3_3/SAVE_ERROR_V3_3_DRAFT.png`
- `assets/ui/v3_3/SAVE_LOAD_V3_3_DRAFT.png`
- `assets/ui/v3_3/SAVE_OVERWRITE_V3_3_DRAFT.png`
- `assets/ui/v3_3/SETTINGS_V3_3_DRAFT.png`
- `assets/ui/v3_3/SKILLS_V3_3_DRAFT.png`
- `assets/ui/v3_3/TITLE_V3_3_DRAFT.png`
- `assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_ATLAS_PIXEL_PASS_V3_3.json`
- `assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_ATLAS_PIXEL_PASS_V3_3.png`
- `assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_CRACK_SPREAD_V3_3.png`
- `assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_FRACTURE_V3_3.png`
- `assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_GROUND_SETTLES_V3_3.png`
- `assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_SLAB_APEX_V3_3.png`
- `assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_SLAB_DESCENDS_V3_3.png`
- `assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_SLAB_RISES_V3_3.png`
- `assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_SLAB_SEPARATES_V3_3.png`
- `assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_SLAB_STRIKES_V3_3.png`
- `docs/quality/v3_3/BATTLE_COMPOSITE_ANTICIPATION_4X.png`
- `docs/quality/v3_3/BATTLE_COMPOSITE_CRACK_4X.png`
- `docs/quality/v3_3/BATTLE_COMPOSITE_IMPACT_4X.png`
- `docs/quality/v3_3/BATTLE_COMPOSITE_RISE_4X.png`
- `docs/quality/v3_3/BATTLE_COMPOSITE_SETTLE_4X.png`
- `docs/quality/v3_3/BATTLE_GROUND_SLAM_4X.png`
- `docs/quality/v3_3/BATTLE_TARGET_1366x768_VISUAL_REVIEW_ONLY.png`
- `docs/quality/v3_3/BATTLE_TARGET_1920x1080_VISUAL_REVIEW_ONLY.png`
- `docs/quality/v3_3/BATTLE_TARGET_4X.png`
- `docs/quality/v3_3/C01_GROUND_SLAM_PREVIEW_1X.gif`
- `docs/quality/v3_3/C01_GROUND_SLAM_PREVIEW_4X.gif`
- `docs/quality/v3_3/C01_GROUND_SLAM_TIMED_STRIP_1X.png`
- `docs/quality/v3_3/C01_GROUND_SLAM_TIMED_STRIP_4X.png`
- `docs/quality/v3_3/C01_PREVIEW_1X.gif`
- `docs/quality/v3_3/C01_PREVIEW_4X.gif`
- `docs/quality/v3_3/C01_TIMED_STRIP_1X.png`
- `docs/quality/v3_3/C01_TIMED_STRIP_4X.png`
- `docs/quality/v3_3/CONTROLS_4X.png`
- `docs/quality/v3_3/DIALOGUE_4X.png`
- `docs/quality/v3_3/GROUND_SLAM_COMPOSITE_1X.gif`
- `docs/quality/v3_3/GROUND_SLAM_COMPOSITE_4X.gif`
- `docs/quality/v3_3/GROUND_SLAM_COMPOSITE_STRIP_1X.png`
- `docs/quality/v3_3/INVENTORY_4X.png`
- `docs/quality/v3_3/M01_PREVIEW_1X.gif`
- `docs/quality/v3_3/M01_PREVIEW_4X.gif`
- `docs/quality/v3_3/M01_TIMED_STRIP_1X.png`
- `docs/quality/v3_3/M01_TIMED_STRIP_4X.png`
- `docs/quality/v3_3/PAUSE_4X.png`
- `docs/quality/v3_3/SAVE_ERROR_4X.png`
- `docs/quality/v3_3/SAVE_LOAD_4X.png`
- `docs/quality/v3_3/SAVE_OVERWRITE_4X.png`
- `docs/quality/v3_3/SETTINGS_1366x768_VISUAL_REVIEW_ONLY.png`
- `docs/quality/v3_3/SETTINGS_1920x1080_VISUAL_REVIEW_ONLY.png`
- `docs/quality/v3_3/SETTINGS_4X.png`
- `docs/quality/v3_3/SKILLS_4X.png`
- `docs/quality/v3_3/TITLE_1366x768_VISUAL_REVIEW_ONLY.png`
- `docs/quality/v3_3/TITLE_1920x1080_VISUAL_REVIEW_ONLY.png`
- `docs/quality/v3_3/TITLE_4X.png`

## Rebuilt package indices and QA

- `ASSET_FILES.json`, `ASSET_INDEX.md`, `QA_REPORT_v3_3.md`, `DELTA_V3_2_TO_V3_3.md` generated to reflect actual file content.
- No game code, audio synthesis, story changes, or roster-wide animation claim. All v3.3 visuals remain `NEEDS_REVIEW`.
