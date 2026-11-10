# Visual identity and asset production

Use concept art anime fantasy as face/costume reference and true grid-authored pixel art for gameplay. Restrained warm colors, controlled linework, stronger silhouette than ornament. Graphic UI Deep Plum `#3B2A4A` and Bitter Lime `#C7D96A`, with accessible neutral text. Motif: two lines nearly meeting. Worlds and faces retain their own local palettes.

**Provisional production sizes, NEEDS_REVIEW:** exploration character cell 32×48 px, four facings, 4 walk frames per facing, 2–4 idle frames. Battle actors 64×64 or 80×80, enemies 64–160 px depending on silhouette, on a shared 16 px planning grid. These are planning budgets, not verified pixel assets. UI 320×180 internal grid scalable by nearest neighbour at integer multiples or letterboxed at noninteger desktop sizes. Confirm camera/layout with browser review.

Character locks: Yaric dark hair, worn red cape, oversized greatsword; Velthia short bob, royal dress, hand casting without physical weapon; Torvan visibly young, blond messy hair, twig staff; Varlgrim older, simple warden clothes and heavy wooden staff. C05–C09 are noncombat story NPCs. Distinguish every face and body height at native display size.

Workflow per entity: reference panel → approved line sketch and expression sheet → 4-direction grid sprite → native-size review → battle kit only if combat → exported transparent atlas and JSON frame metadata → animation/silhouette QA. For any crop here, use REFERENCE, never PRODUCTION_READY.

No blanket gold ornament, clocks on everything, glow, noisy particles, faux pixelation or dashboard UI. Add contrast for accessible active focus; text speed and reduced flashes come from Settings. `RULES.md` is the release gate.


## Horror identity for selected regular monsters

- M01 Hollowling: torn negative-space body, unequal luminous eyes and unstable silhouette; attack wind-up must be legible without a jump-scare flash.
- M03 Wisplet: confined hot core and angular rings whose spacing changes unnaturally; retain the floating, unbodied threat. No friendly fairy face.
- M06 Riftborn: void at the center with separated temporal shards; motion should feel like missing intervals, while hitbox and telegraph stay readable.
- New monster concept illustrations are DRAFT. M05's weapon detail needs review against approved sheet. Pixel battle atlases are early grid drafts and must be redrawn for horror and animation quality.
