# QA report — Production Bible v3.3

**Verdict: CONDITIONAL PASS as a review candidate; NOT APPROVED / NOT PRODUCTION-READY.** No Game Director sign-off or Phaser/in-engine playback has happened.

## Automated file and data checks

| Check | Actual observation | Result |
|---|---:|---|
| v3.2 baseline paths retained | 383/383 | PASS |
| PNG strict decode, all package locations | 334/334 (baseline 252 = 248 RGBA assets + 4 RGB QC composites) | PASS |
| PNG in assets manifest | 300 | PASS |
| New v3.3 actor/monster/VFX PNG alpha exactly 0 or 255, including individual frames and atlas | 32/32 | PASS |
| Asset manifest paths and hashes | 329/329 | PASS |
| Atlas JSON rects and per-frame alpha values | 29 atlases; zero mismatch | PASS |
| New battle/VFX unique frames | C01 11/11, M01 10/10, Ground Slam 8/8 | PASS |
| Timed GIF decode and positive frame duration | 8/8 | PASS |
| Legacy C01 v3.2 alpha correction | 7074 / 5111 match actual PNG | PASS |
| Spoken dialogue IDs and portrait asset paths | 287 IDs; 287 valid | PASS |
| Existing DOCX byte preservation | 4/4 | PASS |
| Music registry and audio files | 13 AWAITING_COMPOSER, 0 OGG | PASS |

## Manual visual review (art direction and limitations)

- C01 faces left, M01 faces right in new v3.3 assets and battle mockup; enemy is on the left, Yaric and second party slot are on the right. Target selection and both HP/MP lines are visible. Greatsword is recognizable in preview, but grip, frame-to-frame proportions and foot anchoring still need artist cleanup and human approval.
- Distinct generated transition poses show attack, recoil, recovery and defeat; several transitions are dramatic and may pop at native grid. The 1× and 4× GIFs use per-frame millisecond durations from JSON, but this is a storyboard playback, not a game loop.
- Ground Slam reads as fracture → broad soil/stone slab rising → impact → settlement. The actor/terrain/enemy composite has the player on the right and target on the left. The generated terrain has a few unusually bright debris pixels; cleanup and collision placement in engine remain.
- UI is Indonesian on player-facing labels. Title has disabled Lanjut and Controls; Pause has Jurus and Simpan/Muat; Settings exposes all nine controls with Kurangi Kilatan = Ya (ON). Fixed 320×180 screens at 1366×768 and 1920×1080 are VISUAL_REVIEW_ONLY; text readability, focus sequence, save behavior and reduced effects require live input tests.
- Deep Plum #3B2A4A and Bitter Lime #C7D96A remain LOCKED; typography and supporting neutral/accent palette are TBD.
- Editorial acting review remains limited to existing v3.2 beat proposals; 287 spoken lines and canon have not changed. The approved Story Revisi 02 and Modern Interlude chronology are preserved.

## Remaining blockers

1. Game Director must accept visual silhouette, transitions, sword grip, monster identity and impact readability.
2. In-engine animation playback, pixel scaling, pivot/collision placement, actual battle target/input tests, and accessibility behavior are untested.
3. Other roster remains in existing DRAFT/NEEDS_REVIEW quality tiers; no roster-wide production approval is implied.
4. Music cues await composition, and Modern Interlude private content awaits user-supplied input. No playable build is included.

The legacy v3.2 UI and atlas paths are retained as history; use `v3_3/` assets and `UI_STYLE_SPEC_V3_3.md` for current review.
