# V4 Unit 5 — Utility & Core Deck and Core Chamber

Contract row: `UNIT-0-BASELINE-AUDIT.md` §5, Unit 5. Commit subject:
`refactor(game): refine utility and core closure`. Room doc:
`docs/game/rooms/13-utility-core-closure.md` (V4 section).

## What changed (observable; presentation only)

See the room doc's V4 section: trunk and header plates, three feed-bay
plates, review-station plate, Core alcove and threshold plates, conduits
on the floor layer, oversized PROVISIONAL slices replaced by the 32 px
procedural props, readouts restyled and sorted under figures, eleven
labels removed across the two rooms; the chamber's ring and control plates,
floor glows on the decal layer. Unchanged by construction: `DECK_SITES`,
`CORE_SITES`, `PILOT_DOORS`, both grids, the readiness/gate logic, the
feed panels, the ARM → CONFIRM lifecycle, the ramp timing and the
completion notice.

## Tests and evidence (`--retries=0 --workers=1`, `PW_DEV_PORT=5362`)

| Command / spec                                                                                                                                                                                                                                    | Result                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint:tsc`, `build`, scoped ESLint, `git diff --check`                                                                                                                                                                                            | pass                                                                                                                                                                                                                                                                                                                                           |
| `v4_visual_capture` yard/deck/completion leg → `unit5/19…30` (1280×720, 4.5 min) and `unit5/800x600/19…30` (5.2 min, second attempt)                                                                                                              | pass; Deck frames 27/30 inspected at both resolutions (trunk, bays, in-register machinery, muted readouts; the deck feedback banner no longer sits over the avatar at the review panel after the V3 y-override was removed)                                                                                                                    |
| `pilot_closure_capture` (participant-path Deck feeds + Core frames 35–47, `PILOT_CLOSURE_OUT=unit5/closure`)                                                                                                                                      | four attempts on the loaded machine failed before the deck (yard mast prompt; Dock tutorial ×2; Noor's prompt) — each a route step outside the changed rooms; not repeated further (priority correction). Core Chamber participant-path frames are taken in the Unit 7 final set; see the developer-launch frames below for the chamber states |
| `v4_event_projection` (`unit5.json`, 5.5 min; a first attempt failed at the yard mast prompt under load, as did the first closure-capture attempt — the same step passed in the Unit 4 run on identical yard code) + pure `v4_projection_compare` | route completed; **0 scientific differences** vs `baseline-v3.json` (`unit5.diff.json` = `[]`)                                                                                                                                                                                                                                                 |

## Review round (gameplay + visual + scientific-confound brief, Opus, read-only)

Inputs: `unit5/27…30` at both resolutions, `unit4/800x600/27…30` (pre-unit
under the V4 camera), the V3 baseline, both scene diffs, the frozen
closure model. Verdicts: visual **readable with noted defects**; gameplay
**usable with noted friction**; **scientific-confound: none found** (no
presentation change alters what the closure records, gates Core access on
performance, leaks an identifier or score, or touches readiness/handoff).
Confirmed: the two-step ARM → CONFIRM cannot be crossed by one keypress
(after arming, focus falls to STAND DOWN, never CONFIRM), ESC stands down,
the ramp is 2.4 s / 300 ms under reduced motion, the completion notice is
neutral, no post-completion trap. One bounded correction round applied.

| #     | Finding                                                                        | Sev   | Disposition                                                                                                                                                                                                                                                                                                                                                                              |
| ----- | ------------------------------------------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U5-1  | the 1280×720 deck frames predate the banner-override removal                   | MAJOR | **fixed** — `unit5/27…30` recaptured after the correction round                                                                                                                                                                                                                                                                                                                          |
| U5-2  | conduits read as a near-black kerb (6 px casing)                               | MAJOR | **fixed** — 4 px casing in the trim family, dormant core lifted toward the trim tone; endpoints unchanged                                                                                                                                                                                                                                                                                |
| U5-3  | the "central systems trunk" landmark does not read                             | MAJOR | **fixed** — trunk and header plates stronger (α 0.36/0.30) with a 2 px edge                                                                                                                                                                                                                                                                                                              |
| U5-4  | bay plates offset from the machinery blocks by 16/32 px                        | MINOR | **fixed** — plates centred on the blocks (columns 3–6, 11–14, 19–22)                                                                                                                                                                                                                                                                                                                     |
| U5-5  | `DOOR · SEALED` chip hidden behind the HUD objective/prompt cards at the entry | MINOR | **deferred to Unit 6** (chip suppression under HUD cards)                                                                                                                                                                                                                                                                                                                                |
| U5-6  | dead bot standby/working branch after the decor swap                           | MINOR | **fixed** — branch and field removed                                                                                                                                                                                                                                                                                                                                                     |
| U5-7  | zone card, clipped chip and hotbar crowd the bottom-right corner               | MINOR | **deferred to Unit 6** (HUD strip / chip clamp)                                                                                                                                                                                                                                                                                                                                          |
| U5-8  | chamber ring ellipse crossed the Core wall block                               | MINOR | **fixed** — replaced by a floor plate south of the block (rows 9–12)                                                                                                                                                                                                                                                                                                                     |
| U5-9  | no V4 chamber frame                                                            | MINOR | **addressed in part** — `e2e/v4_core_dev_capture.spec.ts` (developer inspection launch, labelled) captured the chamber arrival and the Core prompt (`unit5/core-dev/c1`, `c2`, 1280×720); the review surface did not open within the spec's wait under inspection mode in two runs and the remaining states (review, ARM, CONFIRM, ramp, stable) stay on the Unit 7 participant-path set |
| U5-10 | review card has no dim backdrop                                                | MINOR | **deferred to Unit 6**                                                                                                                                                                                                                                                                                                                                                                   |

Measurement-adjacent flags recorded for the research owner (no action in
this unit): F1 — wayfinding cost differs between V3 and V4 sessions for
every `pilot_closure_*` timing (declared non-analysed route context, OD-4
open); F2 — the Unit 5 projection was recorded before the correction
round (the corrections emit no events; recorded as inference); F3 — the
deck record closure is a two-ENTER path with the same default focus in
both stages (frozen V3 behaviour).
