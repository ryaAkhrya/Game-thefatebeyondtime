# Skills and bosses — mechanics and animation direction

**Status:** Ability themes in prompt are LOCKED. Names, MP costs, damage, frame counts and turn thresholds below are DRAFT proposals pending playtest. No NPC C05–C09 combat kit.

## Action contract
Each skill has `actor_id`, target type, cost, prerequisites, outcome, readable windup, effect timing, cancellation/KO behavior and accessibility fallback. Animation times below are staging targets at 60 fps, not final approved sheets. The 16 bit VFX use limited colors, opaque silhouettes and few particles. Sound effects are specifications only; BGM is composer owned.

| Actor / move | Mechanical intention | Pose, anticipation → impact → aftermath | Estimated frames / SFX |
|---|---|---|---|
| C01 Yaric basic strike | Heavy single target physical | plant rear foot and lift huge sword → diagonal weighty swing → brief recoil | 5+4+7 / low blade scrape, hit |
| C01 ground slam | Ground rises and cracks; physical area hit | sword held overhead, blade driven into floor → 2–3 jagged earth chunks lift in distinct grid tiles → debris settles, sword recovered | 9+7+10 / stone fracture, muted thud |
| C01 guard break (DRAFT) | Damage plus one-turn DEF reduction, boss resistance configurable | shoulder set → blunt blade impact → enemy defense icon changes | 5+4+6 / armored knock |
| C02 Velthia hand spell | Magic single target; no weapon | palm opens → single clean arc from fingers → target hit and light fades | 6+5+7 / airy pulse |
| C02 healing gesture | Recover ally HP | hand toward ally, modest forest-colored line → ally recovery number → hand lowers | 6+7+7 / warm chime |
| C02 forest friends | Support/summon tied to forest allies, species and effect DRAFT | hands call → recognizable small forest ally enters briefly → support effect → ally exits | 10+9+8 / rustle, footfall |
| C02 protection Ultimate | Survive Varlgrim meteor, shield persists through impact | hands spread and stance lowers → large but restrained shield silhouette encloses both allies → meteor strikes shield → broken line reforms | 12+12+16 / resonant shield, impact |
| C03 Torvan twig cast | Light nature magic | twig flick, leaves cluster on grid → vines/leaf hit → playful recover | 5+5+7 / twig snap |
| C03 growth aid | Heal/buff support | twig touches ground → one sprout rises at ally → status icon appears | 6+7+6 / leaf rustle |
| C04/B04 Varlgrim staff blow | Heavy wooden staff; not hourglass | feet lock → wood swing with full arc → target stagger → pause | 8+5+9 / wood impact |
| C04/B04 temporal bind | Delay/speed pressure, exact effect DRAFT | staff plants → broken line pauses around target → status icon → line dissipates | 9+6+8 / dry ticking |
| C04/B04 meteor | Extreme damage; only Velthia Ultimate survives | staff grounded; sky silhouette holds a large meteor in view → shield check and strike → debris/quiet | telegraph >= one full player turn; impact 14+18 / distant rumble → impact → silence |

## Meteor fairness contract — mandatory
1. Velthia occupies party slot 2 through final fight. Before encounter, a playable tutorial or earlier scene demonstrates protection Ultimate and warns that the meteor cannot be defended normally.
2. Boss telegraphs the meteor with readable icon/text plus sky silhouette **at least one full actionable player turn** before impact. Battle menu explicitly identifies the counter and cost. No surprise attack on entry.
3. A `protection_charge` resource is full on final-boss entry or can be restored deterministically before the first meteor. If MP is required, grant a clear refill path/checkpoint; no economy or enemy RNG may consume the only viable counter.
4. A protection cast before impact protects both active members and cannot be dispelled in that window. Prevent repeated meteors until resource recovery is possible. If Velthia is KO, provide a recoverable turn/item route before the next meteor or delay the attack.
5. If player declines the clearly taught counter, defeat is possible. Save occurs outside battle; reload never traps the player inside a meteor turn without resources. Reduced flashes and screen shake do not hide the warning.
6. Test cases: zero MP, KO on telegraph, low HP, item exhaustion, reload checkpoint, skip dialogue, 1× scaling, reduced flashes, keyboard-only. Tune exact cooldown/damage from playtest; never silently weaken the unique Ultimate condition.

## Enemy behavior and visual attacks
| ID | Readable attack and response | Visual cue |
|---|---|---|
| M01 Hollowling | Light strike; guard/heal | wisp contracts, eyes sharpen |
| M02 Briaroot | Thorn hit / poison; cure or heal | root bends before thrust |
| M03 Wisplet | Magic blast; guard/MDEF | core compresses before one burst |
| M04 Gravorn | Slow high DEF; magic or setup | stony arm lifts visibly |
| M05 Oathguard | Melee plus DEF up; time offense | shield/staff held close; red cloak settles |
| M06 Riftborn | Distortion/Stun; recovery | broken ring pauses then snaps |
| B01 Mournfang | Slow heavy swipe; defense window | antler and foreleg recoil |
| B02 Veyrath | Two-pattern knight; use Torvan support | blade posture changes by turn |
| B03 Chronolith | Arm swing / pressure; Velthia sustains | arch and core shift before strike |
| B04 Varlgrim | Wooden staff, temporal bind, meteor | staff planted, sky hold, warning state |

Every monster/boss requires separate idle, anticipate/attack, hit and defeated frame specification; exact counts, damage and AI sequencing are NEEDS_REVIEW. Reference sheet crops are not animation.
