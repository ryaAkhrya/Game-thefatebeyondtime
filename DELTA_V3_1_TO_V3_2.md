# Production Bible v3.2 — delta from v3.1

This is a targeted patch. Revisi 02 approved canon, original portraits and 52 expression PNGs, 27 turnarounds, three weapon concepts, nine monster/boss concepts, v2-restored RULES.md, GDD and Full Story DOCX, and 13 AWAITING_COMPOSER cues remain intact. No game code or private media is added.

| Area | v3.1 | v3.2 change | Status |
|---|---|---|---|
| C01 exploration | geometric 24-cell draft | new art with 16 distinct front/left/right/back idle/walk frames at 32×48 | NEEDS_REVIEW |
| C01 battle | four static key poses | seven new 96×96 pixel poses, idle alternation and three attack phases | NEEDS_REVIEW; hit/defeated transitions incomplete |
| M01 battle | generic four key poses | seven new 96×96 monster poses with horror silhouette and three attack phases | NEEDS_REVIEW; hit/defeated transitions incomplete |
| C01 ground slam | four painterly concept stills | eight 96×64 ordered pixel frames, fixed ground anchor and impact event at frame 4 | NEEDS_REVIEW, engine test pending |
| Other sprites/VFX | geometric/key pose or concept still | preserved without false upgrade | NEEDS_REVIEW / AWAITING_ART |
| UI | four plain wireframes, wrong reduced-flashes display | seven pixel-layout examples, broken paired-arc motif, all nine GDD Settings; default Reduced Flashes ON | DRAFT, implementation pending |
| Dialogue | 185/287 neutral | 67 beat-specific emotion edits, 139/287 neutral; original spoken text untouched | DRAFT editorial |
| Six no-line beats | implicit | explicit PLACEHOLDER_PRIVATE, VISUAL_ONLY, SILENT states | DRAFT direction |
| Torvan bandage | questioned | verified against approved main character sheet | REFERENCE CONFIRMED |

The old C01/M01 geometric atlases, old UI mockups and concept stills remain in place as provenance; current candidate files are in `v3_2/` subfolders. The two DOCX files are carried forward unchanged because their approved story and v3.1 tables did not require a rewrite. The historical phrase about story approval in source text is interpreted via `FULL_STORY_STATUS_NOTE_V3_2.md`.
