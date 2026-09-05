# V4 Unit 2 — Station Concourse and Records Workshop

Contract row: `UNIT-0-BASELINE-AUDIT.md` §5, Unit 2. Commit subject:
`refactor(game): clarify concourse and records workshop`.

## What changed (observable; presentation only)

- **Concourse hub grammar.** One north–south circulation spine (Dock ↔
  Laboratory) and one east–west axis (Workshop ↔ Deck) as painted floor
  plates with dashed centre lines, a crossing plate where they meet, the
  incident-desk island (Vale) as the landmark east of the crossing, a
  quiet quality bay south-west, and one threshold-plate family at the four
  exits. All eight permanent area labels removed; the door name chips
  (nearest-target only) remain the only text on the floor. The monitor
  gauge readout moved above the gauge so it never collides with the name
  chip and the prompt (the approach lane is north of it); both readouts
  rasterise at 2× and sit on the world-readout depth layer.
- **Records Workshop functional areas.** Sixteen permanent labels removed.
  Six floor plates read the areas instead: intake (north-west), records &
  press (west), storage & assembly (south-west), calibration (north-
  centre), the return/handover column (east) and the dispatch bay
  (south-east), plus a faint service lane on the y = 272 walking lane. The
  four return-shift state chips rasterise at 2× on the readout layer.
- **Unchanged by construction:** every station, door, spawn and bundle
  coordinate (`zoneSites.ts`, the scene-local site table, `PILOT_DOORS`),
  every prompt/option/window/event, the M02 workspace, the M03 occasions,
  the inventory overlays (drag/drop, sorting, storage, assembly), the M04
  debris layer, the interruption/return logic.

## Deferred (recorded)

- Partition stubs (partial walls) between the workshop areas were not
  added: the e2e lane book for the workshop (x = 60 corridor, the row-5
  rail stub, the y = 272 lane, the return-shift approach columns) leaves
  no lane-safe wall placement that a single unit could verify against the
  full Records/return suites; the areas are conveyed by material change
  and lighting (mission §11 alternatives).
- The Concourse work surfaces stay on their V3 counters (the row-5 and
  row-11 blocks) rather than in new side alcoves.

## Harness corrections (test-only)

Nine specs carried their own `/ 800, / 600` page conversions (the earlier
sweep matched only one shape): `pilot_records`, `pilot_episodes_1_2`,
`pilot_signal_incident`, `pilot_signal_capture`, `pilot_closure_capture`,
`pilot_full_route_timing`, `inventory_foundation`,
`inventory_measurement_isolation`, `inventory_visual_capture`. They now map
design points to the canvas through the documented constants or
`designToPage`. `v4Projection.compareProjections` treats parallel-form /
counterbalance ASSIGNMENTS as session-assigned slots (they are a
deterministic hash of the game session id, which carries `Date.now()`), so
two recorded sessions compare on scientific content; the slot set itself is
still compared.

## Tests and evidence (`--retries=0 --workers=1`, `PW_DEV_PORT=5362`)

| Spec / command                                      | Result                                                                                                                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint:tsc`, `build`, scoped ESLint                  | pass                                                                                                                                                                                                                      |
| `m02_overlay_proof` (2)                             | 2/2                                                                                                                                                                                                                       |
| `pilot_route` (4)                                   | 4/4                                                                                                                                                                                                                       |
| `concourse_interaction_lifecycle` (3)               | A/D pass, C/E pass; **B fails on the 120 s test budget** (screenshot step; the test also overwrites tracked PNGs under `screenshots-concourse-hotfix`, restored) — classified load/intermittent pending a base comparison |
| `pilot_records` (4)                                 | M02 open workspace pass (after the conversion fix); M03 occasions pass; **M02 abandonment fail-forward fails — unresolved, not re-diagnosed in this session**; supply bundles fails (inherited, V3 §7.1)                  |
| `v4_visual_capture` leg 1 → `unit2/`                | pass; Concourse and Records frames inspected (labels gone, readout/chip/prompt separated)                                                                                                                                 |
| `v4_event_projection` (`unit2.json`) + pure compare | route completed; **0 scientific differences** vs `baseline-v3.json` (forms session-assigned)                                                                                                                              |

## Closure session (2026-09-05, after checkpoint `f4a3a21`)

### Open test items — diagnosis and classification

Each test was rerun alone on a quiet machine (`--retries=0 --workers=1`,
`PW_DEV_PORT=5362`); the deterministic one was then run unchanged on the
V3 base (`aaa73fd`, the clean `fable-evidence-led-pilot-v2` worktree,
`PW_DEV_PORT=5363`).

| Test                                           | Rerun alone (V4)                                                                                                                                                                            | V3 base                                                 | Classification                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pilot_records` "M02 abandonment fail-forward" | **pass** (1.2 min); pass again after the correction round (see below)                                                                                                                       | not needed                                              | **load/intermittent** — the Unit 2 session failure did not reproduce on a quiet machine                                                                                                                                                                                                                                                |
| `concourse_interaction_lifecycle` "B"          | **fail, deterministic**: `Test timeout of 120000ms exceeded` inside the final `travelTo(96, 140)` leg after every earlier assertion (board, press A, press B refusal, locker, bench) passed | **pass in 108 s** (12 s under the 120 s config default) | **deterministic test defect (budget)** — the test has no per-test budget; the V4 canvas costs ~1.5× wall time per walking leg under SwiftShader (Unit 1 note: 20 → 13 fps), so a test that finished with 12 s to spare on V3 cannot finish on V4. Not a product regression (movement code is untouched; real GPUs are not fill-bound). |

Correction (test-only, no assertion changed): `test.setTimeout(300_000)`
with the diagnosis as a comment, aligned with the sibling pilot specs
(420 s). Overwritten tracked PNGs under `screenshots-concourse-hotfix/`
were restored after every run.

### Review round (visual-reviewer + gameplay-reviewer brief, Opus, read-only)

Inputs: `unit2/05…11` (1280×720), `unit2/800x600/05…11` (fresh capture at
800×600), baseline frames for comparison, the two scene sources and diff.
Verdicts: Concourse **readable with noted defects**; Records Workshop
**readable with noted defects, close to the boundary** (the floor plates
were below the threshold of perception). Unit 1 M8 confirmed **closed**
(chip and readout 117 canvas px apart).

| #   | Finding                                                                                                                         | Sev                                           | Disposition                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | `Monitor Gauge` chip + interact prompt land on the Dock door leaf (RoomScene below-target placement when approached from above) | MAJOR                                         | **deferred to Unit 6** (contextual-prompt placement is `RoomScene`, outside the Unit 2 allowlist; rule: never over another interactable's art)                           |
| C2  | gauge readout detached (150 canvas px from its device) and second-brightest element                                             | MAJOR                                         | **fixed** — environment register (`#9fb2c1`, α 0.85), offset −34 → −30                                                                                                   |
| C3  | world readouts at depth 3 draw over every figure                                                                                | MAJOR                                         | **fixed** — Concourse readouts and the four Records chips sort at their own foot line (`worldDepth`)                                                                     |
| C4  | Concourse hub plates imperceptible (α 0.12–0.22, no edge)                                                                       | MAJOR                                         | **fixed** — fills raised (0.2–0.34) and a 1 px edge line on every plate                                                                                                  |
| C5  | doors do not read as exits; threshold bar inside the leaf                                                                       | MAJOR                                         | **deferred to Unit 6** (door-leaf tint / doorway language is Unit 6 scope; `RoomScene.addDoor`)                                                                          |
| C6  | Vale hidden by the dialogue panel; avatar clipped by its edge                                                                   | MAJOR (inherited, present in the V3 baseline) | **recorded** — modal layering is Unit 6 scope; not a Unit 2 regression                                                                                                   |
| C7  | beacon arrow projects above the top edge for high targets                                                                       | MINOR                                         | **deferred to Unit 6** (`PilotZoneScene`)                                                                                                                                |
| C8  | beacon ring draws over the reception desk                                                                                       | MINOR                                         | **deferred to Unit 6** (`PilotZoneScene`)                                                                                                                                |
| R1  | Records area plates imperceptible                                                                                               | MAJOR                                         | **fixed** — fills 0.2–0.26, 1 px edge line, service lane α 0.14                                                                                                          |
| R2  | permanent return-state chips truncated at the camera edge                                                                       | MAJOR                                         | **deferred to Unit 6** (permanent return-state chips become contextual there, which removes the truncation)                                                              |
| R3  | `standby — exterior shift not logged` strip dominates the room                                                                  | MAJOR                                         | **fixed in part** (register + depth, as C3); permanence is Unit 6                                                                                                        |
| R4  | objective "Take the west door to the Records Workshop." shown inside the workshop                                               | MAJOR (route copy, in the V3 baseline)        | **deferred to Unit 6** ("stale objective removal"); the objective strings live in `src/pilot/pilotRoute.ts`, to be added to the Unit 6 allowlist as a recorded deviation |
| R5  | bundle-name chip sits below its bundle                                                                                          | MINOR                                         | **deferred to Unit 6** (permanent bundle labels)                                                                                                                         |
| P1  | overlay legend ≈7 CSS px at 800×600                                                                                             | MAJOR (parity)                                | **recorded for Unit 6** text ladder                                                                                                                                      |
| P2  | station-map Dock node carries both encodings                                                                                    | MINOR                                         | recorded                                                                                                                                                                 |
| P3  | overlays top-left weighted                                                                                                      | MINOR                                         | recorded                                                                                                                                                                 |

Not checked by the reviewer (no frame): Concourse after the return shift,
Records with return chips lit, the M04 debris layer, doors in motion.

### Correction round verification (timeboxed per the research owner's

priority correction: visual production first, repeated runs deferred)

| Check                                                                                          | Result                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint:tsc`, scoped ESLint, `build`, `git diff --check`                                         | pass                                                                                                                                                                                                                             |
| `unit2/05…11` recaptured at 1280×720 and `unit2/800x600/05…11` at 800×600 after the correction | frames inspected (plates and edge lines now read; readouts muted and sorted under figures) — see the V4 report §11                                                                                                               |
| `concourse_interaction_lifecycle` "B" with the 300 s budget                                    | one rerun was started after the correction; its parent shell was stopped to re-chunk a longer job and the orphaned Playwright process hung without a verdict (harness incident, no product signal); **rerun deferred to Unit 7** |
| `pilot_records` "M02 abandonment fail-forward"                                                 | passed alone on the pre-correction tree (1.2 min); the correction touches decor alpha/depth only; **repeat deferred to Unit 7**                                                                                                  |
| Scientific projection                                                                          | compared once on the combined Unit 2-fix + Unit 3 tree (Unit 3 note)                                                                                                                                                             |
