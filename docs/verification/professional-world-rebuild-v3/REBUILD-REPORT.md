# Professional world rebuild V3 — session report

Fable, 2026-09-13. Branch `fable-professional-world-rescue-v2` (worktree
`fable-professional-world-rebuild`), continuing from the completed rescue
checkpoint `5d05115`. Nothing pushed, merged, tagged, deployed, deleted
or removed; every scientific open decision left open.

## Scope of this session

1. **Comprehensive scientific implementation audit** (two independent
   read-only passes: authority→display→event, and event→persistence→
   export) — consolidated in
   `docs/verification/scientific-audit-2026-09/AUDIT-FINDINGS.md`, with
   every design-level question routed to
   `docs/ai/PROPOSALS-SCIENTIFIC-REDESIGN-2026-09.md` (nothing
   implemented from that file).
2. **Scientific defect fixes** where code contradicted existing,
   documented authority (implementation-status table in the audit
   findings doc): A7 (double-counted M09 reminder mentions), A8 (M10
   reminder-log control never recorded), B6 (Dock route telemetry
   swallowed), A15 (missing-branch closure detail), A14 (stale validity
   comment), A16 (undeclared-id guard), B2 (validity register + coverage
   now ride the export payload), A3 (fixed option order + default focus
   exported with every NPC-beat choice).
3. **Painted-plate rebuild continued past the rescue slice** (art: all
   five remaining zones; implementation: Records Workshop this
   checkpoint):
   - **Records Workshop** — IMPLEMENTED: 43×12 two-bay hall (machine bay
     - records office joined by the generations' facing painted
       doorways), all coordinates machine-audited (see
       `src/world/layouts/workshop.ts` header), every window/event/text
       verbatim; in-engine verification
       `e2e/world_v2_workshop_look.spec.ts` (every audited approach shows
       its own prompt; vestibule crossed both ways; reflex-SPACE-safe door
       round-trip) + evidence frames in `workshop-look/`.
   - **Diagnostics Laboratory / Utility Deck / Core Chamber / Recovery
     Yard** — PLATES LANDED (`public/assets/world-v2/plates/`,
     provenance in the world-v2 manifest and register); laboratory
     geometry designed and machine-audited
     (`src/world/layouts/laboratory.ts`), deck/core layout modules
     pre-staged; the scenes still render their previous look until their
     own room units (one room per pass).

## Verification (this checkpoint)

- `tsc --noEmit`, `vite build`: pass.
- Pure geometry suites: `world_v1_registry` 11/11 (workshop entries
  added), `spawn_clearance`, `world_v1_story_state`, `pilot_route_model`.
- `world_v2_workshop_look`: pass (15-station prompt tour on real input).
- Functional suites (`pilot_records`, `m02_overlay_proof`,
  `concourse_interaction_lifecycle`, `world_v1_interactions`,
  `world_v1_camera`, `world_v1_story`): RESULTS RECORDED BELOW.

### Functional-suite run 1 (40 min, before driver fixes)

19 expected / 5 unexpected / 1 flaky-passed:

- `world_v1_interactions` (flaky-passed on retry: Dock registry prompts),
  `world_v1_camera`, `world_v1_story`, and the rest of `pilot_records` —
  including the full M02/M03 evidence-window tests against the new
  two-bay geometry — PASSED.
- `m02_overlay_proof` ×2 — FAILED on a driver `ReferenceError`
  (`workshopVia` imported conditionally and missed; the spec file is not
  covered by `tsc`). FIXED (import corrected).
- `concourse_interaction_lifecycle` A/D + C/E — FAILED on the default
  120 s test budget: the two-bay hall's longer travel exceeds it on
  software GL (sibling test B already carried 300 s for the same
  reason). FIXED (budgets aligned).
- `pilot_records` "supply bundles …" — FAILED on
  `proto_m0* == []` receiving three Concourse EXPOSURE events
  (M09 offer presented; M05 silently presented/censored) that the route
  emits by design (they are exactly the `SYSTEM_DRIVEN`/`_presented`
  tolerance of `expectNoMeasurementEvents`). Independently arbitrated
  against the pilot-v3 baseline worktree — verdict recorded below.

**Arbiter verdict (independent agent, ran the identical test at the
pilot-v3 baseline worktree `aaa73fd`): PRE-EXISTING — byte-identical
failure and identical received array at baseline, on first attempt and
retry.** The V2 report (§d, since `7824ab0`) and the V3 report already
classify this exact failure pre-existing: the assertion (`c8c935a`,
2026-08-23) predates the spine's system-driven presentations
(`7824ab0`, 2026-08-28) and was never updated; it contradicts the
project's own sanctioned tolerance rule (`expectNoMeasurementEvents` /
`SYSTEM_DRIVEN`), which explicitly tolerates exactly these three
exposure records — records the M05/M09 designs REQUIRE to be emitted.
Fix applied (test-only): the assertion now uses the sanctioned rule; it
still fails if ordinary inventory ever emits a participant-act
measurement event, which is the test's actual intent.

### Functional-suite run 2 (after driver fixes)

- `m02_overlay_proof` E + SPACE: **2/2 PASSED** after one further
  pre-existing-defect fix — the spec asserted `chips === 1`, but
  `RoomScene.publishWorldPromptProbe` HARDCODES `chips: 0` since World
  V1 ("no contextual name chips exist any more; the probe keeps its
  shape for the specs"), so the assertion could never pass on this tree;
  it now asserts the V1 contract (0) and keeps the single-target
  guarantee via distance + prompt text.
- `pilot_records` "supply bundles": assertion aligned with the
  sanctioned tolerance rule (see the arbiter verdict above); not re-run
  standalone this checkpoint — the surrounding M02/M03/board tests
  passed in run 1 and the changed assertion is strictly the arbitrated
  form.
- `concourse_interaction_lifecycle` (A/D, B, C/E): STILL RED — analysis
  shows pre-existing driver debt older than this session: the spec's raw
  L-walk door legs and internal budgets were written for the pre-rescue
  60×38 Concourse (its own header still describes the old machinery
  blocks); C/E's failing leg is the Concourse east-door walk that the
  sibling `world_v1_interactions` performs green with via-waypoints.
  This spec was not in the rescue's verified list and has not been green
  since the rescue geometry landed. OPEN ITEM: port its travel legs to
  `concourseVia`/`workshopVia` (driver-only; no product finding — the
  same doors and surfaces are exercised green by `world_v1_interactions`,
  `world_v2_workshop_look`, `pilot_records` and `m02_overlay_proof`).

## Known limitations (candid)

- All world-v2 art remains PROVISIONAL and model-selected; no human
  approval; asset-set version not bumped (stimulus freeze is a human
  decision).
- The two stale V4-era capture specs (`pilot_visual_capture`,
  `v4_visual_capture`) were already invalidated by the rescue's
  Dock/Concourse geometry and are further invalidated by the workshop —
  not migrated (superseded by `world_v2_slice_capture` +
  `world_v2_workshop_look`).
- Audit items B1/P2 (zero-filled legacy summary) and the other
  P-numbered proposals remain OPEN research-owner decisions — the
  defect-class fixes deliberately stopped short of any export-contract
  or mechanic change.

## Session 2 (2026-09-13, long autonomous run) — every remaining zone on its plate

Continuation from `5027b08`. Commits: `1e76cf3` (Diagnostics Laboratory,
Utility Deck, Core Chamber), `731c947` (Exterior Recovery Yard), plus the
docs/handoff commit on top. Nothing pushed, merged, tagged, deleted or
removed; every open scientific decision left open; no PixelLab generation
spent (the landed plates were sufficient — none failed in-engine).

### Direction check (first action)

The Records Workshop and every landed plate were inspected at native size
before propagating: the painted-plate direction holds (architecture
defines the space, warm pools and wayfinding lines read, the vestibule
join is real, character scale is right). Verdict: propagate; the one
carried refinement is the state-chip register (still label-like).

### Per-room results

| Room                   | Book changes vs. the pre-derived book                                                                                                                                                              | Scene presentation                                                                                                                                                     | Look spec                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Diagnostics Laboratory | north lane widened one column (`[5,4,12,1]`), Kai's desk footprint shrunk to its legs — the east bay had joined the lane through a **1 px slot** (in-engine finding; the 8 px BFS had accepted it) | trace drawn inside the painted display bezel; numbered bench tags; door class lamps pinned to the painted lintel/hatch (`RoomScene.placeDoorIndicator`); Kai "Talk to" | 9 stations + airlock and south door round-trips, 1.8 min                            |
| Utility Deck           | west door `(60,200)`/approach `(100,188)`, review anchor `(150,124)`/approach `(156,176)`, spawns `(186,188)` / `(414,220)` (the pre-derived spawn was mid-hall)                                   | lamps + warm work light over the dormant painted machines, lit seam + glow on the blast door, chips on the machine tops, manifold readout wrapped                      | 6 objects, sealed-door reason, west door round-trip, 1.3 min                        |
| Core Chamber           | door pocket `[9,10,3,1]`; Kai's console footprint rows 5–8; spawn `(230,288)`                                                                                                                      | sight column / collar lamps / ring + vessel glow (ADD) over the painted reactor; readout chip moved off the room edge                                                  | 3 objects, inactive-state prompt, south door to the deck + sealed way back, 1.3 min |
| Exterior Recovery Yard | whole book re-derived on the two-plate strip (apron, coupling at its east flange, uplink posts + panel, mast footing, stake, gantry rig, bench); rig pad under the gantry; spawn `(342,240)`       | valve dial over the painted wheel, frost sheet, crown beacon + stage marks on the painted mast, dashed plot over the painted stakes                                    | 12 sites + drift pass + airlock round-trip, 6.9 min                                 |

M23 plot: origin translated to cols 26–32 / rows 3–8 (presentation); size
7 × 6 and both target cells' relative positions unchanged; the pure models
spec's sweep literals translated by the same (+320, −160) — 12/12 green.

### Session 2 functional runs (frozen runners)

Runner 1 (`fable-v3-runner`, detached at `1e76cf3`, port 5342) and runner 2
(`fable-v3-runner2`, detached at `731c947`, port 5343). Results as observed
when this session closed — a suite marked _unfinished_ was still running or
never started; treat its result as UNKNOWN, not green.

| Suite (runner)                                                                                 | Result                                                                                                                | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pilot_deck` (1)                                                                               | **1/1 green**, 8.9 min                                                                                                | full pilot route Dock → … → Deck at `deck_closure`, real input, through the rebuilt lab and the old yard                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `pilot_signal_incident` (1)                                                                    | **2/2 green**, 15.7 min                                                                                               | all four laboratory phase surfaces on the rebuilt lab                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pilot_lab` (1)                                                                                | 2/3; the M18-history test failed on a **pre-existing stale literal** (workshop lattice bench at pre-rescue `704,416`) | fixed in this docs commit (`workshopVia` + registry approach); re-run here: passes on retry (first attempt = the documented first-load wait under load)                                                                                                                                                                                                                                                                                                                                                                         |
| `pilot_route` (1)                                                                              | 3/4; `:149` beacon.visible at Concourse arrival                                                                       | **pre-existing since the rescue** (`5d05115`): the Dock-side Concourse spawn is 89 px from Vale, inside the 120 px beacon-arrival range; not touched by this session                                                                                                                                                                                                                                                                                                                                                            |
| `world_v1_interactions` (1)                                                                    | 1/3; both Concourse tests hit the 420 s budget inside plain walking                                                   | untouched zone; three concurrent SwiftShader browsers on one machine — **load-suspect, UNKNOWN**; re-run standalone                                                                                                                                                                                                                                                                                                                                                                                                             |
| `presentation_integration`, `v4_core_dev_capture`, `m02_overlay_proof` (1)                     | **never ran**                                                                                                         | runner 1's dev server timed out at startup after the interactions suite (saturated machine) — UNKNOWN                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pilot_yard` (2)                                                                               | 1/3 in 1.0 h: test 2 (stops / departures / persistence / antenna obligation) green; tests 1 and 3 failed              | test 1 `:387`: the M26 ACK line was already overwritten by the delayed scripted disconnect (travel to Post A on the strip is longer; timing-sensitive driver assumption); on retry the rig approach stalled at `(1072,204)` against the gantry's west leg (row 5) — `yardVia` should take the pass lane at y ≈ 228 before turning east. Test 3 `:779`: the belt-full SPACE landed out of the cache's reach after the plot move. Product surfaces (recovery feedback, disconnect notice) read correctly in the received strings. |
| `pilot_exterior_isolation`, `pilot_return`, `v4_event_projection`, `pilot_closure_capture` (2) | **unfinished** when the session closed                                                                                | UNKNOWN — next session runs them from runner 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

### Findings (candid)

- **Vite HMR under a live Playwright run**: editing `src/` while a spec
  ran reloaded the page mid-test and produced two false failures before
  the cause was identified. Adopted the frozen-runner pattern (separate
  detached worktrees). Rule recorded in the handoff.
- **Pre-derived books are not authority**: two spawns and one lane were
  wrong in ways only the engine (or the new slot-width audit) exposed.
- **Stale driver literal** (pre-rescue workshop coordinate in the
  M18-history test) fixed; `concourse_interaction_lifecycle` remains the
  one known pre-rescue driver (open item from session 1).
- Not done this session: the full-route projection/compare at the final
  commit, the 1920×1080 capture set and the real-input playthrough video —
  listed as the next actions in the handoff.

## Session 3 (2026-09-13, unattended verification, correction and evidence run)

Continuation from `fe768ef`. Every browser-dependent run in this session was
**strictly sequential**: one dev server (this worktree, port 5341), one
browser, one spec at a time, one Playwright worker, no concurrent capture
job; each browser closed before the next run started. No failure was
classified "load-suspect" without a standalone rerun. Nothing pushed,
merged, tagged, deployed, deleted or removed; no open scientific decision
resolved; no PixelLab generation spent. The two frozen runner worktrees
(`fable-v3-runner`, `fable-v3-runner2`) were not touched — see §"Runner
process report".

### Code gates (final tree)

`tsc --noEmit`: pass. `vite build`: pass. ESLint/Prettier: pass on every
touched file (the three specs that were CRLF in the working tree were
normalised to LF, the index form). Pure suites 56/56 (`world_v1_registry`,
`spawn_clearance`, `pilot_route_model`, `world_v1_story_state`,
`pilot_exterior_models` 12/12 incl. the translated M23 plot, plus the
projection compare's pure test).

### Failures worked through (each reproduced alone first)

| Item (handoff)                                                      | Standalone reproduction                                                                                                                                                                                                                                  | Classification                                                                                                                                                                                                                                                                                                                                                                                                       | Action                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. `pilot_route` beacon assertion (`:150`)                          | deterministic, both attempts, 2.8 min alone                                                                                                                                                                                                              | **stale expectation**: the rescue's audited Dock-side Concourse spawn (352,224) stands 89 px from Vale (440,208), inside `BEACON_ARRIVAL_RANGE` (120 px, `PilotZoneScene`) — the pre-rescue assertion encoded the 60×38 distances; product rule intact (pilot_route_model green)                                                                                                                                     | test now asserts the rule itself: hidden at the spawn, **shown** once ≥ 120 px away (walk to (232,224), 208 px), hidden again on the return; `pilot_route` **4/4** (8.0 min)                                                                                                                             |
| 2. `world_v1_interactions` 420 s timeouts                           | **3/3 in 8.2 min alone**                                                                                                                                                                                                                                 | infrastructure (three SwiftShader browsers in session 2), no product or driver finding                                                                                                                                                                                                                                                                                                                               | none                                                                                                                                                                                                                                                                                                     |
| 3a. `pilot_yard` test 3 (`:779`)                                    | deterministic                                                                                                                                                                                                                                            | **stale driver literals**: the "row 10 lane" (y 340) was the 25×19 yard's; on the strip rows 9–11 are the hull band, and the west-half re-entry spawn reaches the east half only through the drift pass                                                                                                                                                                                                              | the cache approaches use the pass-aware `yardVia`; test 3 **green** (4.6 min)                                                                                                                                                                                                                            |
| 3b. `pilot_yard` test 1 — rig approach stall at (1072,204)          | reproduced in principle by the crossing diagnostic (below)                                                                                                                                                                                               | **driver geometry**: a y-first landing inside its ±12 px box can settle at y ≤ 208, where the body's top edge (probe − 18) overlaps the gantry west leg (rows 1–5)                                                                                                                                                                                                                                                   | `yardVia` takes the y ≈ 220 lane before any leg that crosses the leg column (x 1094) and re-drives a stalled pass crossing at y 224 ±4                                                                                                                                                                   |
| 3c. `pilot_yard` test 1 — post A → post B                           | deterministic with diagnostics: prompt opened on the **Line Status Panel** at (240,134)                                                                                                                                                                  | **driver geometry**: the panel's footprint rasterises to cols 8–9 / rows 2–3 (x 256–320, y < 128); the row-≈134 leg between the posts clamps on it and nearest-wins then offers the panel                                                                                                                                                                                                                            | `yardVia` travels the row-5 lane (y 160) for any west-half leg that crosses the panel columns with an endpoint above y 150                                                                                                                                                                               |
| 3d. `pilot_yard` test 1 — lab east-bay climb stall at (496,178)     | intermittent (1 of 5 runs)                                                                                                                                                                                                                               | **driver precision**: the east climb window is exactly one body wide (x 496–528); a ±8 landing plus key-up drift can settle on its edge                                                                                                                                                                                                                                                                              | `labVia` lands at 512 ±4, verifies the lane was reached and re-centres (≤ 3 tries)                                                                                                                                                                                                                       |
| 3e. `pilot_yard` test 1 — M26 ACK line (`:387`, session 2)          | passed in every run that reached it this session                                                                                                                                                                                                         | timing-sensitive only under load (1.4 s window before the scripted disconnect); `transmitAt` now dumps prompt/world/M26 state on a missed transmission                                                                                                                                                                                                                                                               | none beyond the diagnostic                                                                                                                                                                                                                                                                               |
| 3f. `pilot_yard` test 1 — final envelope assertion (`:524`)         | **deterministic once every behavioural assertion passed**: item-owned active **338 s** > 300 s (M20 start 8 s), wall 554 s from the Dock                                                                                                                 | **not weakened** — see "Decisions for the research owner" (the V2 baseline measured 236–240 s at wall 285 s on the 25×19 yard and the 800×600 canvas; the automation is now ≈ 1.9× slower end-to-end, and the windows stay open while the driver walks)                                                                                                                                                              | test left red on this one assertion; the M05 o2 / M19 / M20 / M23 (scan bands, empty dig, exact cell) / M24 (six cycles, depletion, pre-/post-ack, alternative) / M26 (ACK, disconnect, pre-knowledge, ack, probe, post-knowledge, Post B) / Noor closure assertions all **passed** in the run of record |
| 4. `presentation_integration`                                       | **11/11** (1.4 min) after one stale deck walk (160,340 → the audited valve approach (256,224) via `deckVia`)                                                                                                                                             | stale driver literal                                                                                                                                                                                                                                                                                                                                                                                                 | fixed                                                                                                                                                                                                                                                                                                    |
| 5. Core capture (`v4_core_dev_capture`)                             | deterministic at `:99` then `:122`                                                                                                                                                                                                                       | **stale developer path**: since the closure refactor `a1490fc` the inspection launch no longer pre-prepares the Core (deck derives `ready_for_feeds` under inspection; the chamber's review command refuses while sealed); after booting the deck under inspection and raising the feeds the review opens (frames c1–c3 captured) but **ARM does not arm** under inspection — pointer and keyboard alike, three runs | developer-only capture; the Core frames of record come from the participant path (`pilot_closure_capture` 41–47 and the V3 route capture); the inspection-launch ARM refusal is listed under "Remaining"                                                                                                 |
| 6. M02 (`m02_overlay_proof`)                                        | **2/2** (1.6 min)                                                                                                                                                                                                                                        | —                                                                                                                                                                                                                                                                                                                                                                                                                    | —                                                                                                                                                                                                                                                                                                        |
| 7. `pilot_exterior_isolation`                                       | **2/2** (4.7 min) after two stale 25×19 spots ((400,380) → (400,250); the field spot via `yardVia`)                                                                                                                                                      | stale driver literals                                                                                                                                                                                                                                                                                                                                                                                                | fixed                                                                                                                                                                                                                                                                                                    |
| 8. Return route (`pilot_return`)                                    | test 1 reached the M03 Press B panel three times; run of record: the outbound M09 check-1 read registered (`check_completed`, "Gauge read: …") and the M09 closure assertions passed, then **`objects_restored` 0** at the Press B pointer drag (`:238`) | **unresolved** — the drag inside the inventory overlay stored nothing; not a room-geometry path; two earlier runs failed earlier at the M09 check-1 read (intermittent input miss, not reproducible with the diagnostic attached)                                                                                                                                                                                    | left red; classification needs a baseline run at the pilot-v3 checkout (`aaa73fd`) — not done (browser budget went to the route evidence)                                                                                                                                                                |
| 9. Event projection                                                 | see "Scientific projection"                                                                                                                                                                                                                              |                                                                                                                                                                                                                                                                                                                                                                                                                      |                                                                                                                                                                                                                                                                                                          |
| 10. Closure capture                                                 | see "Evidence"                                                                                                                                                                                                                                           |                                                                                                                                                                                                                                                                                                                                                                                                                      |                                                                                                                                                                                                                                                                                                          |
| 11. Full-route lifecycle driver (`concourse_interaction_lifecycle`) | **3/3** (9.9 min) after porting its C/E Concourse legs to `concourseToWorkshop` / `concourseVia` / `concourseToDeck`                                                                                                                                     | pre-rescue raw L-walks (driver)                                                                                                                                                                                                                                                                                                                                                                                      | fixed                                                                                                                                                                                                                                                                                                    |
| 12./13. captures and recording                                      | see "Evidence"                                                                                                                                                                                                                                           |                                                                                                                                                                                                                                                                                                                                                                                                                      |                                                                                                                                                                                                                                                                                                          |

Also re-verified alone: `pilot_lab` 3/3 (15.6 min; test 1 flaky once at the
Concourse west-door pocket — `concourseToWorkshop` now re-centres on the
rows-5/6 band at 190 ±4 before the door leg), `pilot_deck` 1/1 (5.2 min,
the full spine through the **rebuilt yard**), `world_v1_camera` 3/3 (its
`dock-arrival-*.png` under `professional-world-v1/unit1` were restored from
the index afterwards — the historical evidence is untouched),
`world_v1_story` 3/3.

### Recovery Yard — geometry facts established in-engine

A throw-away diagnostic (real input, developer boot, deleted afterwards)
measured the strip against the 32×42 body (top edge = probe y − 18):

- drift pass (rows 6–7): crossed at probe y 211–232, blocked at 205 and 238;
- gantry west-leg column (x 1094): crossed eastward at y ≥ 211.5, blocked at
  ≤ 208.6;
- the line-status panel footprint (book cols 8.3–9.9 / rows 2.2–3.4)
  rasterises to cols 8–9 / rows 2–3 — a hard prop on the post A → post B row.

The M23 plot stayed at cols 26–32 / rows 3–8 (7 × 6; form A at +2/+1,
form B at +4/+4): `pilot_exterior_models` 12/12 and the run of record's
M23 assertions (three scan bands, the empty neighbouring dig, the exact
cell, `recovery_delivery` inventory / cache) passed through ordinary input.
The rig pad, bench, stake, both posts, panel, mast, coupling, crate, flag
and Noor were all reached through their audited approach points on real
input; the camera followed across both plates (route capture manifest).

### Presentation corrections (native-size review of every rebuilt room)

Every look frame (Dock/Concourse from the rescue set; workshop, lab, deck,
core and yard from the V3 look sets) was inspected at 1280×720. Two
readability defects were corrected, nothing else redesigned:

- **Yard mast chip** sat at the footing's foot (site.y + 72) — in the apron
  lane at the arrival spawn, under the participant's own figure (chips draw
  below figures by construction) → now beside the footing under the mast
  lamp (site.x + 148, site.y + 30): clear of the spawn, of the audited
  approach and of the uplink chips.
- **Yard rig chip** (rig.y − 68) stacked directly on the one-line prompt at
  the audited approach → rig.y − 84.

Known cosmetic, left as recorded in the handoff: state chips still read
like labels; the deck's feed readout wraps to two lines.

### Runner process report

At session start two orphan chains still referenced `fable-v3-runner2` (a
hung `playwright test e2e/pilot_exterior_isolation.spec.ts` from 08:57 and
its Vite server on port 5343, PIDs 19036 / 17300 and their `npx` wrappers);
no browser was attached to them. They were left running, as instructed;
neither runner worktree nor its `node_modules` junction was touched. An
orphan Vite server on 5341 (PID 20016, this worktree, from the previous
session) was reused as the session's single dev server.

### Scientific projection (authority → trigger → display → response → event → persistence → export)

`v4_event_projection` (label `world-v3`, real input, Dock → stable Core,
offers accepted, gauge read, calibration started, partial antenna start,
record closure, three feeds, Core confirmation) at the final tree:

- `projection/world-v3.json` — run of record (first attempt): final stage
  `complete`, 155 events, 28 opportunities, 25 window ids, zone sequence
  Concourse → Workshop → Concourse → Laboratory → Yard → Laboratory →
  Concourse → Workshop → Concourse → Deck → Core, M09 check 1 completed.
- **Compared with `world-v1-before.json`: exactly five differences**
  (`projection/world-v3.diff.json`), all of them the session-1 scientific
  defect fixes of `3a4ff96` that post-date every existing baseline:
  `pilot_zone_entered` 11 → 12 (B6: the Dock's zone entry is no longer
  swallowed — one more event, sequence 154 → 155, first divergence at
  index 4), and `pilot_npc_beat` payload keys 19 → 22
  (`metadata.focus_default_position`, `metadata.option_count`,
  `metadata.option_position` — A3: fixed option order and default focus
  exported with every NPC-beat choice). **No event identity, payload key,
  window id, opportunity, validity value, form slot or coverage disposition
  differs for any other reason** — the rebuilt rooms changed nothing
  scientific. (The compare assertion therefore fails against the pre-fix
  baseline by design; no baseline was rewritten — promoting `world-v3.json`
  to the post-fix reference is the research owner's call.)
- The retry Playwright ran after that assertion produced a second recording
  that missed the M09 check-1 read (the operations-desk clip described under
  the M09 finding) and overwrote the files; the run of record was restored
  from the preserved copy. `research_export_test_mode` and the persistence
  suites: see "Results".

### Evidence at the final code commit (`fc3e5da`)

- **`route/1280x720/`** — `world_v3_route_capture` at `fc3e5da`, ONE
  continuous real-input route from the watched opening to the stable Core
  (13.6 min automation wall, 155 events, final stage `complete`, zone
  sequence identical to the projection run): 46 native 1280×720 frames —
  opening (establishing, berth), Dock (emergency power, marker, powered
  after check-in), Concourse (entry, Vale briefing, watch offer, gauge read,
  handover), Workshop (east-door entry, board, calibration bench before /
  after stage 1, mid-hall, signed off), Laboratory (entry, Kai briefing,
  exterior briefing, airlock guidance), Yard (airlock arrival, Noor, Mast 04
  before / after stage 1, drift pass, recovery field, shift end), the return
  (Concourse hub, Vale check-in, workshop sign-off), Deck (arrival, record
  closed, coolant / calibration / distribution before + after, all feeds,
  Core door open) and Core (inactive, review, armed, synchronising,
  completion notice, stable) — with `manifest.json` (commit, viewport,
  canvas, per-frame scene / stage / player / camera state, 19 camera-motion
  pairs, timings) and **`route-1280x720.webm`** (24.6 MB, VP8 + Opus,
  10 fps, 450 kbit/s, `audio: true`): recorded from the game canvas by
  `e2e/recording.ts` through the DEV audio tap, started only after the
  opening had drawn (no black lead-in by construction), one continuous
  session (no stale scenes, no navigation stall — the route never
  re-entered a helper's retry path). No ffmpeg on the machine: the track
  layout is asserted from the recorder's mime and the manifest, not by
  decoding the file.
- **`route/1920x1080/`** — the same driver at the native full-HD canvas
  (3× plate): 12 frames (opening → the Workshop work-order board), then the
  calibration-bench surface wait (8 s) timed out. **`1920x1080/*-look/`**:
  lab 14/14 frames green; workshop 2, deck 6, core 5 and yard 8 frames
  before each tour missed an audited approach ("own label in the prompt" /
  no prompt / a 4 s wait). Every one of those approaches is green at
  1280×720 on the same commit and the world field is identical at both
  canvases (`world_v1_camera` 3/3), so the 1080 misses are the
  software-GL driver's landing precision at the slower 3× canvas
  (infrastructure), not room defects — the frames that were produced are
  native-size evidence of those rooms; the full 1080 set remains to be
  produced on a faster renderer or with a 1080-tuned driver.
- **`closure-capture/`** — `pilot_closure_capture` frames 35–47 (deck
  arrival, sealed early access, the three feeds before / after, all feeds
  ready, Core door, Core inactive, review, armed, synchronising, stable,
  completion) on the participant path at the 800×600 default viewport
  (letterboxed canvas), run on the identical source before the prompt-clamp
  commit `e402cd8`.
- **`core-dev-capture/`** — c1–c3 of the developer inspection launch (see
  the table; developer-only).
- `projection/world-v3.json` + `.diff.json` — see "Scientific projection"
  (run on the identical source before `e402cd8`; the clamp changes only a
  HUD prompt position and no event).

### Results (final tree, sequential, one browser)

| Suite                                                                                          | Result                                                                     | Time           |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------- |
| tsc, vite build, lint (touched files)                                                          | pass                                                                       | —              |
| pure: registry, spawn_clearance, route_model, story_state, exterior_models, projection compare | 56 pass, 1 skipped (no baseline env)                                       | 7 s            |
| pilot_route                                                                                    | 4/4                                                                        | 8.0 min        |
| pilot_yard test 3                                                                              | 1/1                                                                        | 4.6 min        |
| pilot_yard test 1                                                                              | every behavioural assertion passed; 1 failed on the 300 s envelope (338 s) | 14–20 min      |
| pilot_exterior_isolation                                                                       | 2/2                                                                        | 4.7 min        |
| world_v1_interactions                                                                          | 3/3                                                                        | 8.2 min        |
| concourse_interaction_lifecycle                                                                | 3/3                                                                        | 9.9 min        |
| presentation_integration                                                                       | 11/11                                                                      | 1.4 min        |
| m02_overlay_proof                                                                              | 2/2                                                                        | 1.6 min        |
| pilot_lab                                                                                      | 3/3 (test 1 flaky once)                                                    | 15.6 min       |
| pilot_deck                                                                                     | 1/1                                                                        | 5.2 min        |
| world_v1_camera / world_v1_story                                                               | 3/3 · 3/3                                                                  | 1.5 · 4.2 min  |
| v4_event_projection (world-v3 vs world-v1-before)                                              | route complete; compare fails on the five `3a4ff96` deltas only            | 2 × ~14 min    |
| pilot_closure_capture                                                                          | 1/1                                                                        | 11.9 min       |
| world_v3_route_capture 1280×720 (+ recording)                                                  | 1/1                                                                        | 13.6 min       |
| world_v3_route_capture 1920×1080 · look specs 1080                                             | 0/1 · 1/5 (lab) — driver precision at 3×                                   | —              |
| v4_core_dev_capture                                                                            | 0/1 (ARM refused under inspection)                                         | 4 min          |
| pilot_return test 1                                                                            | 0/1 (Press B drag, `:238`)                                                 | 3 × ~25 min    |
| not run: pilot_return 2–3, pilot_records, pilot_signal_incident, persistence and export suites | —                                                                          | browser budget |

### Decisions for the research owner

1. **Automation burden envelope** (`pilot_yard.spec.ts:524`, 300 s): the
   two-plate yard under the V4 canvas measures 338 s item-owned active in
   automation (V2: 236–240 s, when the automation's wall time was 285 s
   against 554 s now). Re-baseline the automation proxy, or accept the
   spatial burden — neither was done here.
2. **Projection reference**: promote `world-v3.json` (= `world-v1-before`
   - the `3a4ff96` fixes) to the post-fix reference, or keep comparing
     against the pre-fix baseline with the five documented deltas.
3. Unchanged: asset-set version / stimulus freeze; P1–P20.

### Remaining (product / tooling, not scientific)

- `pilot_return` test 1: the M03 Press B pointer drag stored nothing
  (`objects_restored` 0) — unresolved; needs a baseline run at `aaa73fd`.
- Developer inspection launch: the Core review opens but ARM is refused
  (keyboard and pointer) — developer-only path.
- Full native 1920×1080 capture set and the pointer-ARM path at 1280×720:
  unverified (see above).
