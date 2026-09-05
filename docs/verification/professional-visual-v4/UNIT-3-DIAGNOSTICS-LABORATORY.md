# V4 Unit 3 — Diagnostics Laboratory

Contract row: `UNIT-0-BASELINE-AUDIT.md` §5, Unit 3. Commit subject:
`refactor(game): focus diagnostics assessment sequence`. Room doc:
`docs/game/rooms/14-diagnostics-laboratory.md` (new, V4 section).

## Pre-change participant path

`pilot_lab.spec.ts` (3 tests: arrival/case brief/orientation/four phase
surfaces/modal ownership/no identifier leakage; explicit stops and
fail-forward to the airlock; M18 independence across two lattice
histories) — **3/3 in 7.1 min** on the checkpoint tree (`f4a3a21`),
`--retries=0 --workers=1`, `PW_DEV_PORT=5362`.

## What changed (observable; presentation only)

- **Sequence through layout.** Four identical 4×4-tile bay plates (rows
  10–13) around the four benches, numbered 1–4 on the floor at each plate's
  north-west corner, joined by one east–west service aisle (row 12–13,
  dashed centre line) in front of them; bays 1–2 west of the entrance
  spine, 3–4 east of it.
- **Progressive salience.** The next unrecorded bay carries the cyan plate
  frame and cyan numeral (plus the existing lamp and beacon); recorded bays
  settle to a quiet grey frame with a dim numeral and a lit lamp; later
  bays are plain plates with faint numerals. State is glyph + position +
  the display's phase indicator, never colour alone.
- **Circulation grammar.** North–south spine from the south door to the
  case desk (3 tiles wide), the aisle (2 rows), the west service lane to
  the airlock (row 8 → column 7 → row 2), threshold plates at both doors
  (the one plate family shared with the other zones).
- **North zone.** Orientation plate (west), case-desk plate under the wall
  display (centre), briefing-desk plate (east). The wall display is a
  bezelled dark panel on the decal layers; the phase indicator rasterises
  at 2×; the trace is unchanged in its state semantics.
- **South corners.** Rows 14–15 at columns 1–4 and 20–23 are wall cells
  that carry the loose dressing (tool rack, utility cart, seat); the lobby
  in front of the south door (columns 5–19) stays open — the return leg the
  route specs drive (`walkTo(240, 456)`) crosses it.
- **Labels removed (9).** `BRIEFING DESK`, `SIGNAL ANALYSIS`,
  `CONSOLE ORIENTATION`, `1 EVIDENCE TABLE` … `4 DIAGNOSTIC BOARD`,
  `EXTERIOR AIRLOCK ▲`, `▼ CONCOURSE`. Only the nearest-target name chip
  and the projected prompt remain in the world view.
- **Noor's relay.** The intercom subtitle moved from the top-right HUD
  band (design (790, 34), right-aligned, wrap 300 — it collided with a
  two-line objective, the feedback banner at y = 72 and the top edge of
  Kai's dialogue card) to a centred subtitle band anchored at design
  y = 536 above the belt (wrap 540), which no other HUD surface uses. The
  five lines are byte-identical.
- **Depth.** Plates and lanes on `FloorDecal`/`FloorMarking`, numerals on
  `FloorMarking`, lamps on `WorldReadout`, display panel on the decal
  layers, props y-sorted at their foot line; no prop that could hide the
  avatar stands on open floor.
- **Unchanged by construction:** `LAB_STATIONS`, `PILOT_DOORS`, both
  spawns, every prompt/option/window/event, the M15 work surface, the three
  terminal overlays, the M18 board, the tutorial, the M10 hand-over, the
  beacon/objective logic.

## Correction round (own inspection + Unit 2 review finding C4/R1)

The first capture showed the bay plates below the threshold of perception
at the world zoom (α 0.12–0.14). Fills raised (bays 0.2, north plates 0.22,
spine 0.26, aisle 0.22, thresholds 0.34) and a 1 px edge line added to
every plate — the same treatment applied to the Concourse and Records
plates in the Unit 2 correction round.

## Harness (test-only)

- `e2e/v4_visual_capture.spec.ts` lab leg: the "phase benches" waypoint is
  (384, 284) (was (400, 300)) so the frame centres on the bay row.
- `e2e/pilot_signal_capture.spec.ts`: output directory parameterised
  (`PILOT_SIGNAL_OUT`, default unchanged) so the historical v2 evidence is
  never overwritten by a V4 run.

## Tests and evidence (`--retries=0 --workers=1`, `PW_DEV_PORT=5362`)

| Command / spec                                                               | Result                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint:tsc`, `build`, scoped ESLint, `git diff --check`                       | pass                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `v4_visual_capture` lab leg → `unit3/12…18` (1280×720)                       | pass (2.2 min); frames inspected at full resolution                                                                                                                                                                                                                                                                                                                                                                                    |
| `v4_visual_capture` lab leg → `unit3/800x600/12,13,15,16`                    | pass (3.5 min) after two load failures earlier in the route (Dock tutorial; workshop sign-off stage wait); the three terminal-overlay frames (14, 17, 18) were skipped by their own open-guards under load — 800×600 parity judged on 12/13/15/16                                                                                                                                                                                      |
| `pilot_lab` test 1 (smoke)                                                   | one run: failed at the workstation approach (`prompt did not open at 368,211.2`) during a period of machine load in which the capture leg also ran 1.7× slower; not repeated (priority correction). Station coverage taken from the passing capture leg (Kai prompt, orientation terminal, evidence-table surface, training-rig terminal, diagnostic board) and the projection route; the workstation prompt is on the Unit 7 manifest |
| `v4_event_projection` (`unit3.json`, 7.0 min) + pure `v4_projection_compare` | route completed; **0 scientific differences** vs `baseline-v3.json` (`unit3.diff.json` = `[]`)                                                                                                                                                                                                                                                                                                                                         |

## Review round (visual-reviewer + gameplay-reviewer brief, Opus, read-only)

Inputs: `unit3/12…18` (1280×720), the V3 baseline frames, the scene diff.
Verdict: **readable with noted defects** — the four-bay sequence reads
left to right from the arrival frame; the relay-subtitle move is confirmed
as fixing a real collision. One bounded correction round was applied.

| #     | Finding                                                                                                        | Sev                                        | Disposition                                                                                                                                   |
| ----- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| D3-1  | beacon ring clipped at the top edge / arrow off-screen when Kai is outside the arrival view                    | MAJOR                                      | **deferred to Unit 6** (`PilotZoneScene` beacon; same item as Unit 2 C7)                                                                      |
| D3-2  | bay 1 carries the cyan frame and numeral before the stage reaches `lab_work` (the only usable target is Kai)   | MAJOR                                      | **fixed** — frames and numerals hold the "later" treatment until `pilotStageAtOrAfter('lab_work')`; the display redraws on every route change |
| D3-3  | every lamp carries a cyan stroke; a recorded lamp is full cyan while the current one is dim teal               | MAJOR                                      | **fixed** — current lamp cyan, recorded lamp base grey, later lamps dim with a neutral stroke (glyph + position unchanged)                    |
| D3-4  | the south-door prompt can project into the relay band, which draws above it (computed from code, not observed) | MAJOR                                      | **fixed** — the relay band sits one depth step below the HUD prompt so a prompt always reads over it                                          |
| D3-5  | relay subtitle 12 px design ≈ 9 CSS px at 800×600                                                              | MAJOR                                      | **fixed** — 15 px design (≈ 11 CSS px at 800×600; the band keeps its belt clearance)                                                          |
| D3-6  | objective still names the Concourse north door after arrival                                                   | MINOR (V3 copy)                            | **deferred to Unit 6** (stale-objective pass; objective strings are a research-owner copy item)                                               |
| D3-7  | dialogue card fill 0.96 lets the wall display ghost through                                                    | MINOR                                      | **deferred to Unit 6** (`RoomScene` panel fill)                                                                                               |
| D3-8  | frame 16 duplicates 15 (the evidence-table surface did not open in that capture)                               | MINOR                                      | recorded — the lab leg is recaptured in Unit 7's final set                                                                                    |
| D3-9  | aisle dashes run inside the bay plates                                                                         | MINOR                                      | **fixed** — bay plates end at row 13; the aisle plate and dashes sit on row 13 below them                                                     |
| D3-10 | wall dressing (pipes, gauge card) on floor cells at row 5.5                                                    | MINOR                                      | **fixed** — moved to the wall row beside the windows                                                                                          |
| D3-11 | M18 board: tag 4 third line clipped; help legend overruns the button row                                       | MINOR (frozen surface, in the V3 baseline) | recorded for the research owner (information-processing overlay geometry is frozen)                                                           |
| D3-12 | raw trace is the brightest element under the objective                                                         | MINOR                                      | **fixed** — trace tone lowered until the case is recorded                                                                                     |

Not checked by the reviewer: 800×600 frames (captured after the review:
`unit3/800x600/12,13,15,16`), the north airlock at close range, recorded-bay
states, motion.
