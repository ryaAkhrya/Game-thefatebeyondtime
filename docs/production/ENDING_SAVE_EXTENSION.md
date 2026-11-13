# Phase 9 — additive save_v2 extension

Envelope remains `save_v2`, `data.schemaVersion = 2`, browser keys remain `tfbt.save.v1.{auto,slot1,slot2,slot3}`. Existing Chapter I–IV data is accepted without creating ending progress or rewriting stored bytes merely on read. No EXP, inventory or reward migration was added; Phase 8's idempotent reward ledger remains in place.

Optional field:

```ts
ending?: { step: EndingStep; memoryIndex: number }
```

`EndingStep` is the ordered list exported by `ending/progress.ts`. `memoryIndex` is a bounded integer 0–100, used only during `memories`, otherwise zero. No photo path, caption, date, partner identity or message enters the save.

Modern checkpoints use chapter `MODERN`, area `modern`; Aveloria memory and completion use chapter `EPILOGUE`, area `cliff`. The old world position and all party/RPG data are retained but not used as physical modern coordinates. Walk resumes at a safe fixed position in the small modern scene. This is an era/identity change in narration, never a physical teleport.

| Flag | First committed checkpoint |
|---|---|
| `modern.started` | `era` |
| `modern.artefact_discovered` | `archive`, after inspection dialogue |
| `modern.memory_awakened` | `memories` or `remember`, after awakening dialogue |
| `modern.complete` | `remember` |
| `ending.cliff` | `promise`, after arrival dialogue |
| `ending.promise` | `cloud-path`, after promise dialogue |
| `ending.epilogue_complete` | `continued`, after silhouette sequence |
| `ending.continued` | `credits` |
| `ending.credits` | `message` or `complete` |
| `game.complete` | `complete` |

GameState validates the exact flag/step relationship, Chapter IV prerequisites, chapter/area pairing and allowed extension keys. Invalid future flags, malformed indices or private fields are rejected. Story beats derive from flags: M-01, M-02, M-03, E-01, GAME-DONE. All Chapter IV flags remain present.

Checkpoints are committed after dark-cover transitions, at the start of each stable beat. A refresh restarts the unfinished beat, not Chapter IV. Dialogue lines and credit/message subpages are intentionally not autosaved individually. Completed fragments and the private photo index resume; credits or an unfinished message restart at their first page. Public builds safely skip a private gallery/message checkpoint if loaded from a private slot.

Manual saves in ending pause write that same committed checkpoint. The pause menu explains the behavior. During fades and active dialogue, automatic writes are blocked. Storage failure is visible and does not softlock the story. SaveCoordinator permits stable noncombat ending checkpoints even when Yaric ended the boss fight at 0 HP; combat saving rules remain intact.

Continue and Save/Load route completed Chapter IV slots to EndingScene. An active ending loaded through WorldScene also redirects defensively. At completion, Continue shows the completion card; Title offers explicit **Putar Ulang Akhir**. Replay writes no slots, flags, rewards or playtime. No New Game+ was added.

Compatibility is forward reading of old slots by the new game. An older Phase 8 executable does not understand new modern-area checkpoints; do not use it to edit new ending saves. No user's existing save was deleted during development; browser QA uses isolated contexts.
