# Phase 9 — Modern Interlude implementation

13 November 2026. Canon: `docs/source/CERITA_APPROVED_REVISI_02.docx`, corroborated by the first section of `FULL_STORY.md`. Plot approved; spoken scene scripts remain editorial DRAFT. No source story was rewritten.

## Playable route

Chapter IV's existing completion card offers **Lanjutkan kisah**. Exploring Aveloria remains possible; its Pause menu offers the same action. Continue/loading an older completed Chapter IV slot starts the modern era directly. Earlier slots retain their existing routes.

`EndingScene` handles `era → walk → artefact → archive → heirloom → heart → awakening → [private memories] → remember`. `remember` explicitly labels the next sequence as a memory in Aveloria after the kingdom was saved. Characters do not physically cross eras or see future photographs.

The era card says **Berabad-abad kemudian**. A small unnamed pedestrian space supplies a short, bounded horizontal walk; two anonymous back-facing silhouettes accompany one another. Arrow keys/A–D move, Enter/E/Z/Space examines the relic when close. The relic is an old fragment set in a low wall, not a portal. Its ring with a broken diagonal repeats the Chapter III/IV motif (`fortressSprites.mjs`). Setting the scene in this generic space is an **ASSUMPTION / visual staging DRAFT**, not a factual date location.

Three player-paced object fragments recall the archive, Velthia's heirloom and the opened Heart. Their engraving brightens slowly. No chapter synopsis, new Torvan reveal, screen flash, camera shake, digital glitch or additional relationship history was added. `M-01` and `M-02` in `ending/direction.ts` use six working lines from `FULL_STORY.md`, all tagged `DRAFT_IMPL`. The joke about real-life lost possessions was deliberately omitted because real habits were not supplied.

## Modules

| File under `web/src/game/` | Responsibility |
|---|---|
| `scenes/EndingScene.ts` | Keyboard flow, renderer orchestration, pause, checkpoint commits, private content hook |
| `ending/progress.ts` | Pure checkpoint construction and strict save validation |
| `ending/CinematicSequencer.ts` | Reusable minimum hold/automatic duration/fade clock and image containment |
| `ending/EndingArt.ts` | Original code-native pixel staging, familiar engraving, clouds, seated derivative poses |
| `ending/direction.ts` | Timing, dialogue provenance, editable credits metadata |
| `ending/memorySchema.ts` | Shared validated private-content contract |

The existing `DialogueBox`/`DialogueRunner`, InputManager, SceneRouter and audio settings are reused. DialogueBox gained optional silent advancement and an on-back callback; other chapters retain their defaults. No dependencies were installed.

## Interaction and lifecycle

Each beat has a minimum readable hold. OS key repeat is suppressed by InputManager, and a new beat resets its own clock. Dialogue consumes one page at a time; completing a line does not also advance the next scene. Cinematic changes fade to dark for 450 ms and reveal over 700 ms. Frames are clamped, and hidden tabs stop the cinematic clock. If display relayout interrupts a fade, its pending destination commits once at that safe boundary and begins its normal reveal; the shared relayout handler cancels tweens, so the destination must survive independently of the tween callback.

Esc opens a small ending pause menu: resume, save/load, settings, title. During credits Esc skips credits safely after the initial 1.8 s hold. Save writes are restricted to the committed start of a beat; opening pause during a dialogue saves that start, never the half-finished line. The UI explains this. Resize/Pixel Perfect rebuilds visual objects while preserving the dialogue runner and beat clock. Shutdown removes input layers, generated texture and loaded private photographs.

The public route never displays empty photo slots or anniversary templates. Private memories follow awakening and precede the cliff. Photographs retain their whole aspect ratio, are loaded one at a time, and are never modified generatively. For the data and build boundary, see `PRIVATE_MEMORIES_INTEGRATION_GUIDE.md` and `ENDING_PRIVACY_QA.md`.

## Preview

Normal play: `http://127.0.0.1:5173/`.

Development-only, non-saving ending review: `http://127.0.0.1:5173/?qa=1&preview=ending`. This explicitly seeds a Chapter IV QA fixture in memory and runs replay; it does not write browser save slots. Returning to Title does not restart the shortcut. It is compiled out of production. Production E2E uses the established `?qa=1` diagnostics in isolated browser contexts.

All new artwork, modern connective dialogue, seated poses, pacing and emotional effect require Game Director review.
