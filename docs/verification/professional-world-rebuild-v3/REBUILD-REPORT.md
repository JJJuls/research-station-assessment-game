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

| Suite                                                                                           | Result                                                                                                                                                                                                                                                      | Time           |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| tsc, vite build, lint (touched files)                                                           | pass                                                                                                                                                                                                                                                        | —              |
| pure: registry, spawn_clearance, route_model, story_state, exterior_models, projection compare  | 56 pass, 1 skipped (no baseline env)                                                                                                                                                                                                                        | 7 s            |
| pilot_route                                                                                     | 4/4                                                                                                                                                                                                                                                         | 8.0 min        |
| pilot_yard test 3                                                                               | 1/1                                                                                                                                                                                                                                                         | 4.6 min        |
| pilot_yard test 1                                                                               | every behavioural assertion passed; 1 failed on the 300 s envelope (338 s)                                                                                                                                                                                  | 14–20 min      |
| pilot_exterior_isolation                                                                        | 2/2                                                                                                                                                                                                                                                         | 4.7 min        |
| world_v1_interactions                                                                           | 3/3                                                                                                                                                                                                                                                         | 8.2 min        |
| concourse_interaction_lifecycle                                                                 | 3/3                                                                                                                                                                                                                                                         | 9.9 min        |
| presentation_integration                                                                        | 11/11                                                                                                                                                                                                                                                       | 1.4 min        |
| m02_overlay_proof                                                                               | 2/2                                                                                                                                                                                                                                                         | 1.6 min        |
| pilot_lab                                                                                       | 3/3 (test 1 flaky once)                                                                                                                                                                                                                                     | 15.6 min       |
| pilot_deck                                                                                      | 1/1                                                                                                                                                                                                                                                         | 5.2 min        |
| world_v1_camera / world_v1_story                                                                | 3/3 · 3/3                                                                                                                                                                                                                                                   | 1.5 · 4.2 min  |
| v4_event_projection (world-v3 vs world-v1-before)                                               | route complete; compare fails on the five `3a4ff96` deltas only                                                                                                                                                                                             | 2 × ~14 min    |
| pilot_closure_capture                                                                           | 1/1                                                                                                                                                                                                                                                         | 11.9 min       |
| world_v3_route_capture 1280×720 (+ recording)                                                   | 1/1                                                                                                                                                                                                                                                         | 13.6 min       |
| world_v3_route_capture 1920×1080 · look specs 1080                                              | 0/1 · 1/5 (lab) — driver precision at 3×                                                                                                                                                                                                                    | —              |
| v4_core_dev_capture                                                                             | 0/1 (ARM refused under inspection)                                                                                                                                                                                                                          | 4 min          |
| pilot_return test 1                                                                             | 0/1 (Press B drag, `:238`)                                                                                                                                                                                                                                  | 3 × ~25 min    |
| state_session_continuity · adversarial_reload_partial_state (save / reload persistence)         | 4/4 · 1/1                                                                                                                                                                                                                                                   | 32 s · 25 s    |
| persistence_physical                                                                            | 3/3 (the Q27 useful-switch test flaky once: a 15 s probe wait)                                                                                                                                                                                              | 4.6 min        |
| research_export_test_mode (Qualtrics export compatibility)                                      | 11/11 after one stale expectation: the frozen envelope key list predated audit fix B2 (3a4ff96 — measurement_validity + pilot_coverage ride every payload, QUALTRICS-LOGGING-REVIEW-B2-A3.md); the participant-style completion test flaky once (15 s wait) | 7.2 min + 10 s |
| not run: pilot_return 2–3, pilot_records, pilot_signal_incident, participant_completion_handoff | —                                                                                                                                                                                                                                                           | browser budget |

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

## Session 4 (2026-09-14, unattended verification and release-candidate run)

Continuation from `68e7f07`. Every run this session was launched detached
(one spec, one worker, `--reporter=line`, logs under the session
scratchpad) and read back from its log; nothing pushed, merged, tagged,
deployed or deleted; no open scientific decision resolved; no PixelLab
generation spent; the projection reference not promoted; the asset-set
version not bumped.

### Process report (first action)

- PIDs 19036 (`playwright test e2e/pilot_exterior_isolation.spec.ts`, cwd
  `fable-v3-runner2`, parent chain `npx` 7512 → `cmd` 1196) and 17300 (its
  Vite on port 5343, parent 18472 already gone) were inspected read-only:
  the orphan chain from 2026-09-13 08:57, no browser attached. A graceful
  `taskkill /T` was refused by Windows for all four console processes
  ("can only be terminated forcefully"), so the chain was terminated with
  `/T /F` at 21:26. Neither runner worktree nor its `node_modules`
  junction was touched.
- **Concurrent foreign browser (candid):** four minutes later (21:25:38 by
  its process clock) a NEW `playwright test e2e/pilot_return.spec.ts`
  started in `fable-v3-runner2` (root `bash` 14488 ← 8748 ← a parent that
  had already exited), followed at 22:33 by `v4_event_projection` in the
  same runner — the session-2 "runner 2 unfinished" list being replayed by
  another actor (a second Claude session was live on the machine). These
  were NOT in the termination authorisation and were left running; they
  share the CPU with this session's SwiftShader browser, so every wall
  time below was measured with a second software-GL browser active unless
  the entry says otherwise. This session itself never ran two browsers.
- The orphan Vite on 5341 (PID 20016, previous session) was reused for the
  first run and then stopped; later runs let Playwright start and stop
  their own server on 5341.

### 1. M03 Press B return failure — classified: DRIVER POINTER-COORDINATE DEFECT

| Run                                      | Tree / canvas                                                                                 | Result                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pilot_return` test 1 alone at HEAD      | `68e7f07`, 1280×720 canvas in the 800×600 viewport (FIT)                                      | reached Press B; the drag was dispatched from design (320,150) → page (340.00, 187.50) to design (550,150) → page (512.50, 187.50); read-only probe after the drag: `held null, dragging false, feedback null`, all five residuals still on `m03_surface_b`, `m03_store_b` empty → `objects_restored` 0 at `:238` (deterministic; the retry was stopped as adding nothing) |
| `pilot_return` test 1 alone at `aaa73fd` | isolated runner `fable-evidence-led-pilot-v2`, port 5321, 800×600 canvas = design space (1:1) | **1 passed (18.1 min)** — the identical corner-to-corner drag stores the residual (`objects_restored` 1)                                                                                                                                                                                                                                                                   |

Cause, proven from the two observations and the code: `__inventoryUiProbe`
publishes each slot's **top-left corner** (`SlotGridView` rectangles are
origin 0,0; `x/y = cell.background.x/y`, `w/h = SLOT_SIZE`), and
`returnHelpers.pressBatchB` dragged corner → corner. At the baseline the
canvas was the design space, so the corner mapped to an integer page pixel
inside the (inclusive) slot bounds. Under V4 the overlay runs on the design
camera (×1.2, letterboxed to ×0.625 in the 800×600 viewport): the corner
maps to a fractional page pixel that Chromium rounds outside the 42 px slot,
no draggable is under the pointer, `DRAG_START` never fires, and the panel
closes with nothing stored — a correct measurement of an empty gesture. Every
sibling drag driver (`pilot_records.dragSlot`, `dragPhysicalObjectToContainer`,
the deck coupler drag) targets slot centres and is green on the same tree.
Not a product defect, not a pre-existing product defect, not a measurement
or event defect, not a stale expectation: the M03 model, its events and
the assertion are unchanged. Fix (driver only): `pressBatchB` drags slot
centres (`x + w/2`, `y + h/2`); the read-only post-drag diagnostic stays.

With the centre drag, test 1 at HEAD reached Press B and the probe after the
drag read `m03_store_b[0] = m03_spent_cartridge` with four residuals left on
the surface (the M03 o2 assertions at `:225–247` passed); the run then
continued through M07, M20, M21, M22, M25 and the outbound handover and
failed at `:567` on a second **stale expectation**: `objective` was
expected to contain "Utility Deck" after the return-shift sign-off, but the
V4 story spine (`f6e051f`, `src/pilot/storyState.ts` `deck_closure` branch)
narrows the displayed line to the zone's own wayfinding step — inside the
workshop it reads "Back to the Concourse — east door." and names the
Utility Deck only once the participant stands in the Concourse. The route
stage (`deck_closure`) already carries the destination and was asserted
green on the same line. Tests 1 (`:567`) and 3 (`:1049`) now assert the
zone-narrowed line (`/Concourse — east door/`) plus the stage; no product
text changed. (The first attempt of that run missed the outbound M09
gauge read — the documented intermittent approach miss — with the player
60 px short of the gauge column at (464, 238) under a second SwiftShader
browser plus a concurrent lint run; the retry read the gauge normally.)

### 2. Participant suites (sequential queue, one browser; logs per suite)

| Suite                                | Result                                                                                                                                                                                                                                                          | Wall     | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pilot_return` test 1 (fixed driver) | **flaky-passed**: attempt 1 timed out (8 s) waiting for the M07 bench's ADVANCE control to re-enable after a stage settle; the retry passed every assertion — item-owned active 100 s (surfaces 66 s · M03 o2 8 s · M09 check 2 26 s), wall 607 s from the Dock | 17.1 min | the bench's post-settle re-render rides the surface scene's Phaser timer (`RecordsWorkshopScene.returnSurfaceHost.later` → `surface.time.delayedCall`), which runs slower than wall time whenever a frame exceeds the 200 ms delta cap — the attempt ran beside the foreign `v4_event_projection` browser; the two bench wait budgets (`waitStageDone`, `waitAdvanceEnabled`) and the route capture's surface wait were widened 8 → 20 s (waits, not assertions) |
| `pilot_return` test 2                | **1/1**                                                                                                                                                                                                                                                         | 11.0 min | first attempt                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `pilot_return` test 3                | **1/1**                                                                                                                                                                                                                                                         | 8.2 min  | first attempt (insufficient-exposure Press B, belt-full relay unit)                                                                                                                                                                                                                                                                                                                                                                                              |
| `pilot_records`                      | 3/4; test 4 ("supply bundles") failed on `ReferenceError: expectNoMeasurementEvents is not defined` on both attempts                                                                                                                                            | 16.2 min | **driver defect from session 1**: the arbitrated assertion rewrite called the sanctioned helper without importing it (the spec files are outside `tsc`'s `include`); import added; test 4 re-run alone below                                                                                                                                                                                                                                                     |
| `pilot_signal_incident`              | **2/2** (item-owned active 61 s, wall 288 s)                                                                                                                                                                                                                    | 8.5 min  | all four laboratory phase surfaces on the rebuilt lab                                                                                                                                                                                                                                                                                                                                                                                                            |
| `participant_completion_handoff`     | **17/17**                                                                                                                                                                                                                                                       | 9.9 min  | pure + browser (developer inspection launch, mocked ingestion + same-origin survey page)                                                                                                                                                                                                                                                                                                                                                                         |

A one-off typecheck of the spec tree (`tsc --ignoreConfig … e2e/*.ts`; the
repository's `tsconfig.json` includes `src` only and the pretool guard
protects TypeScript configuration files, so no `tsconfig.e2e.json` was
added) found three more undefined-name defects of the same class —
`designToPage` used without an import in `inventory_foundation`,
`inventory_measurement_isolation` and `inventory_visual_capture` (V4-era
edits; legacy-route specs, not on this session's list) — imports added,
not run. The remaining 15 diagnostics are type-strictness findings in
specs (possibly-null probes, an untyped window field, two literal-type
mismatches), not runtime defects; listed under "Remaining".

### 3. Recovery Yard timing — `pilot_yard` test 1 alone, instrumented (2dee30b tree, quiet machine)

Run alone at 00:53–01:00 with no other browser or CPU job on the machine
(the foreign runner had finished), `--retries=0`, the driver ledger and the
DEV frame probe attached. **1 passed (6.6 min) — every behavioural
assertion AND the 300 s automation envelope: item-owned active 224 s
(M20 start 6 s), wall 376 s from the Dock.** The 300 s limit was not
changed.

| Phase                                | Wall  | Driver held-key | Driver settle waits | Legs / bursts (no-motion / stall-aborts) | Frames (rolling fps · mean · max)  |
| ------------------------------------ | ----- | --------------- | ------------------- | ---------------------------------------- | ---------------------------------- |
| Browser + game boot to the Dock      | 6.1 s | —               | —                   | —                                        | —                                  |
| Dock tutorial                        | 3.8 s | —               | —                   | —                                        | —                                  |
| Route Dock → Concourse → lab → yard  | 125 s | 37.6 s          | 49.9 s              | 73 / 233 (135 / 14)                      | 11.1 fps · 83 ms · 112 ms          |
| M05 cable flag                       | 6.8 s | 1.3 s           | 1.6 s               | 2 / 6 (1 / 0)                            | 10.2 fps · 84 · 113                |
| M19 coupling (16 turns, thaw cycles) | 54 s  | 8.1 s           | 7.8 s               | 70 / 31 (12 / 3)                         | 9.3 fps · 88 · 125                 |
| M20 mast, two outdoor stages         | 14 s  | 1.6 s           | 3.3 s               | 12 / 11 (1 / 0)                          | 9.3 fps · 89 · 125                 |
| M23 scans, empty dig, exact cell     | 45 s  | 9.5 s           | 18.6 s              | 26 / 61 (13 / 0)                         | 9.7 fps · 91 · 128                 |
| M24 eight magnet cycles + bench      | 56 s  | 2.1 s           | 5.9 s               | 22 / 17 (2 / 0)                          | 9.8 fps · 93 · 128                 |
| M26 ACK, disconnect, posts A/B       | 47 s  | 8.2 s           | 14.9 s              | 37 / 45 (5 / 0)                          | 9.4 fps · 95 · 128                 |
| Noor shift end                       | 11 s  | 2.6 s           | 3.3 s               | 3 / 16 (10 / 1)                          | 9.8 fps · 95 · 128                 |
| **Whole test**                       | 376 s | **71 s**        | **105 s**           | 245 / 420 (179 / 18)                     | 1528 of 3753 frames > 100 ms (41%) |

Item-owned active per window: M05 6 s · M19 33 s · M23 39 s · M24 106 s ·
M26 34 s (+ M20 start 6 s) = 224 s. No capture overhead (this spec takes no
screenshots). Frame rate: 9.3–11.1 fps at the 1280×720 canvas under
SwiftShader, mean frame 83–95 ms, maximum 128 ms (never the 200 ms cap).

**Classification of the session-3 338 s reading:** with an identical
product build and identical route geometry, the same test measured 224 s
alone — 114 s less, and 12–16 s under the V2 reference (236–240 s on the
25×19 yard and the 800×600 canvas). The behavioural path is correct and
unchanged. The increase was therefore not a product performance regression
and not the longer strip geometry by itself (both are present in the green
run): it was **environment load** (the session-3 figure was taken while
other processes shared the CPU; this session's own runs beside the foreign
`fable-v3-runner2` browser showed the same class of slowdown — a bench
re-render wait over 8 s, a 60 px short approach) compounded by **driver
inefficiency that scales with frame time**: settle waits (105 s) exceed
held-key travel (71 s), and 179 of 420 bursts moved the avatar not at all
(bursts shorter than one rendered frame, answered by the boost rule). The
strip's longer legs are real but modest: the route into the yard is 125 s
of the 376 s wall, most of it settle time. Software-GL is the limiting
environment: at 9–11 fps a 70 ms burst is shorter than a frame. The red
classification of session 3 is therefore withdrawn for the product path and
retained for the automation environment: **green alone; not guaranteed
under concurrent load.** No test limit was raised.

Remaining driver headroom (not changed this session, listed for the next):
skip the fixed 100 ms pre-settle wait when the frame probe shows a fresh
frame; size the final-approach burst from the measured frame time instead
of the fixed 70 ms.

### 4. 1920×1080 — measured, and the driver made resolution-aware

The workshop tour was run alone at both canvases on the same tree with the
new landing/frame logging (`[landing]` lines in the logs):

| Canvas    | Rolling fps (mean frame)                         | Travel per rendered frame (175 px/s) | Landing offsets at the audited approaches                                                                                                                                                                                                                                                                 | Result                                                                       |
| --------- | ------------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1280×720  | 9.2–9.7 (92–101 ms)                              | ≈ 17 px                              | all 15 stations within ±12 px per axis (largest: press A (−7.9, 12.0), assembly bench (−3.0, 12.0), seal log (−1.4, −10.7))                                                                                                                                                                               | **15/15**, 3.0 min                                                           |
| 1920×1080 | 5.3–5.9 (159–164 ms, max 200 ms = the delta cap) | ≈ 28 px                              | case workspace (5.1, −6.8), press A (−5.0, 3.2), press B (−3.9, 3.2), relay bench (3.2, 2.2), **storage locker (−11.9, −10.7)** — inside the box, but the prompt read "E — take Sample kit": at (298, 239) the supply bundle `Sample kit` (`RecordsWorkshopScene`, `S.supplyB`) is nearer than the locker | 4/15 then the label assertion failed (before the re-approach helper existed) |

So the 1080 "misses" of session 3 were **not landings outside the
tolerance**: the driver lands inside the ±12 px box at both canvases; at
1080 the frame quantum (≈ 28 px) puts landings on the box's corners far
more often, and at one corner of the locker's box a world pickup wins
nearest-wins. That is an **audit-margin fact about the workshop book**: the
registry's "strictly nearest at every landing" audit ranks stations only;
supply bundles (real pickups with their own prompt) are not in its
candidate set. Left as a research-owner note (moving the pallet or the
approach point is presentation geometry, not the driver's to change).

Driver made resolution-aware (scale-independent, real input only, registry
approach points): (1) `settleAfterKeyUp` judges "held still" across a
RENDERED frame (the DEV frame counter) instead of two wall-clock reads —
at 160 ms frames two reads 70 ms apart routinely fell inside one frame and
read a position mid-motion; (2) `approachAudited` (all five look tours)
backs off 40 px along the worse axis and re-approaches, at most three
times, whenever a landing inside the box shows another object's prompt,
logging every landing; (3) the surface-clock waits widened (above). The
route capture driver is unchanged in its coordinates: every point it walks
is a registry approach or a via-lane, so the same driver serves both
canvases. Results of the full 1080 set at the committed tree: see §6.

### 5. Final scientific projection (dba9a37, real input, one browser)

`v4_event_projection` (label `world-v3`, 800×600 viewport, `--retries=0` so
no retry could overwrite the file) at the final code commit: final stage
`complete`, **155 events, 28 opportunities, 25 window ids**, 6.0 min wall.
`docs/verification/professional-visual-v4/projection/world-v3.json` and
`world-v3.diff.json` were regenerated. Compared with the approved
pre-rebuild reference `world-v1-before.json` the comparator names **exactly
five differences** — the same five as session 3:

| #   | Field                                | Reference → current                                                                                                                       | Authority                                                                                                                                                               |
| --- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `event_type_sequence` length         | 154 → 155                                                                                                                                 | B6 — Dock route telemetry no longer swallowed (`3a4ff96`; `docs/verification/scientific-audit-2026-09/AUDIT-FINDINGS.md`, implementation-status table)                  |
| 2   | `event_type_sequence[4]`             | `pilot_opening_skipped` → `pilot_zone_entered` (the Dock's zone entry, inserted)                                                          | B6, as above                                                                                                                                                            |
| 3   | `event_counts.pilot_zone_entered`    | 11 → 12                                                                                                                                   | B6, as above                                                                                                                                                            |
| 4   | `payload_keys.pilot_npc_beat` length | 19 → 22                                                                                                                                   | A3 — fixed option order + default focus exported with every NPC-beat choice (`3a4ff96`; `docs/verification/scientific-audit-2026-09/QUALTRICS-LOGGING-REVIEW-B2-A3.md`) |
| 5   | `payload_keys.pilot_npc_beat[8]`     | first divergent key (`metadata.focus_default_position`, `metadata.option_count`, `metadata.option_position` added; the key set is sorted) | A3, as above                                                                                                                                                            |

Proof that nothing else differs — `e2e/v3_projection_reference_delta.spec.ts`
(pure, no browser) applies exactly those five deltas to the reference and
requires the result to compare EQUAL to `world-v3.json` with the route
comparator (`compareProjections`) on every projected field: event
identities and sequence, event counts, payload-key sets, window ids,
opportunity ids and records (validity values, form slots), coverage
dispositions, final stage and route summary — **0 differences** (pure
suites 57/57 at the final tree). Zone sequence, opportunity and window
counts are identical to the reference; the rebuilt rooms changed no
measurement window, opportunity, exposure, validity value, form slot or
coverage disposition.

Persistence, export envelope and Qualtrics compatibility (same commit, one
browser each): `state_session_continuity` 4/4 (44 s), `persistence_physical`
3/3 (3.8 min), `research_export_test_mode` and `participant_completion_handoff`
— see §7; `adversarial_reload_partial_state` — see §7 (investigated alone).

**Promotion recommendation (research owner; nothing promoted here):** adopt
`world-v3.json` (dba9a37) as the post-fix projection reference, replacing
`world-v1-before.json` for future rebuild/visual comparisons. Grounds: the
only differences are the two already-approved audit fixes B6 and A3 of
`3a4ff96` (one additional, correct `pilot_zone_entered` for the Dock; three
additional exported keys on `pilot_npc_beat` carrying option order and
default focus), both recorded in the audit findings with their
event-schema/scoring review; every other scientific field is byte-equal
across three independent full-route runs on real input (session 3 at
`fc3e5da`, this session at `dba9a37` at 800×600 and — §7 — at 1920×1080).
Until promoted, `v4_event_projection` keeps failing its in-run compare on
these five fields by design and the pure delta spec is the pass/fail gate.

### 6. Evidence set at the final code commit (`dba9a37`)

Every capture below was re-run at `dba9a37` after the driver fixes (nothing
from sessions 2–3 was reused; the overwritten frames are the new frames).
One browser at a time; the foreign runner had finished before this queue.

| Evidence                                  | Result                                                                                                                                                                                                                                                                      | Wall     |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `workshop-look/` (1280×720)               | 15/15 stations, vestibule both ways, east door round-trip — 8 frames                                                                                                                                                                                                        | 3.1 min  |
| `lab-look/`                               | 9 stations + airlock and south door round-trips — 14 frames (one bounded re-approach at Kai after a stalled leg landed 180 px short)                                                                                                                                        | 2.6 min  |
| `deck-look/`                              | 6 objects, sealed-door reason, west door round-trip — 10 frames                                                                                                                                                                                                             | 1.6 min  |
| `core-look/`                              | 3 objects, inactive prompt, deck round-trip, sealed way back — 9 frames                                                                                                                                                                                                     | 1.4 min  |
| `yard-look/`                              | 12 sites, drift pass, airlock round-trip — 16 frames                                                                                                                                                                                                                        | 2.9 min  |
| `1920x1080/workshop-look/`                | **15/15** — 8 frames (one re-approach at the sample cutter: a stalled leg 41 px short showed Press B's prompt)                                                                                                                                                              | 9.2 min  |
| `1920x1080/lab-look/`                     | **14/14 frames green**                                                                                                                                                                                                                                                      | 6.8 min  |
| `1920x1080/deck-look/`                    | **green** — 10 frames (one re-approach at the Concourse door: 38 px short showed the review panel)                                                                                                                                                                          | 6.8 min  |
| `1920x1080/core-look/`                    | **green** — 9 frames (the sealed-door press retried by the spec's new bounded loop)                                                                                                                                                                                         | 3.5 min  |
| `1920x1080/yard-look/`                    | **green** — 16 frames                                                                                                                                                                                                                                                       | 8.4 min  |
| `route/1280x720/` + `route-1280x720.webm` | **1/1** — 46 frames, 155 events, final stage `complete`, 19 camera-motion pairs; recording 20,164,511 bytes VP8+Opus, audio true, 10 fps                                                                                                                                    | 11.3 min |
| `route/1920x1080/`                        | **1/1** — 46 frames, final stage `complete`, 21 camera-motion pairs, identical zone sequence; raw `event_count` 153 (vs 155 at 720 — driver-path telemetry such as re-entered prompts; scientific identity is compared by the 1080 projection run in §7, not by this count) | 25.3 min |

Native-size review of the 1080 frames (workshop board, yard mast, Concourse
briefing, stable Core) against their 720 twins: identical world field and
framing (the field is fixed by construction), integer-scaled plates with no
seams or crawl, prompt cards and the mission card fully inside the canvas,
depth sorting correct (figures in front of desks, NPCs behind the prompt
panel), text rendered natively at the canvas resolution. Two cosmetic
observations, presentation only: the Mast 04 state chip's text runs past
the canvas right edge at the audited approach at 720 and its first
characters sit under the avatar at 1080 (chips draw under figures by
construction) — added to the polish list.

### 7. Final verification (final code commit `dba9a37`, sequential, one browser)

Code gates on the final tree: `tsc --noEmit` pass · `vite build` pass ·
ESLint on every file changed since `68e7f07` pass · Prettier pass. Pure
suites **57 passed, 1 skipped** (registry, spawn clearance, route model,
story state, exterior models, the V4 compare (skipped: no baseline env) and
the new projection-delta spec against the regenerated `world-v3.json`).

| Group              | Suite                                                              | Result                                                                                                                                                                                                              | Wall           | Alone? |
| ------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| Room suites        | five look tours × 720 and × 1080                                   | all green (§6)                                                                                                                                                                                                      | 47 min         | yes    |
| Interaction suites | `world_v1_interactions`                                            | 3/3                                                                                                                                                                                                                 | 7.0 min        | yes    |
|                    | `concourse_interaction_lifecycle`                                  | 3/3                                                                                                                                                                                                                 | 10.3 min       | yes    |
|                    | `presentation_integration`                                         | 11/11                                                                                                                                                                                                               | 1.5 min        | yes    |
|                    | `m02_overlay_proof`                                                | 2/2                                                                                                                                                                                                                 | 1.6 min        | yes    |
| Camera             | `world_v1_camera`                                                  | 3/3 (its `professional-world-v1/unit1/dock-arrival-*.png` restored from the index afterwards)                                                                                                                       | 1.9 min        | yes    |
| Story              | `world_v1_story`                                                   | 3/3                                                                                                                                                                                                                 | 4.1 min        | yes    |
| Persistence        | `state_session_continuity`                                         | 4/4                                                                                                                                                                                                                 | 44 s           | yes    |
|                    | `adversarial_reload_partial_state`                                 | 0/1 in the queue (both attempts: `repair_failed` not observed within 15 s after the alcove option), then **1/1 alone** (31.7 s) — intermittent, environment; the reload semantics themselves were re-asserted green | 1.6 min + 34 s | yes    |
|                    | `persistence_physical`                                             | 3/3                                                                                                                                                                                                                 | 3.8 min        | yes    |
| Export             | `research_export_test_mode`                                        | 11/11 (frozen envelope incl. `measurement_validity` + `pilot_coverage`)                                                                                                                                             | 5.5 min        | yes    |
|                    | `participant_completion_handoff`                                   | 17/17 (§2)                                                                                                                                                                                                          | 9.9 min        | no     |
| Full route         | `pilot_route`                                                      | 4/4                                                                                                                                                                                                                 | 9.2 min        | yes    |
|                    | `pilot_deck`                                                       | 1/1                                                                                                                                                                                                                 | 6.7 min        | yes    |
|                    | `pilot_lab`                                                        | 3/3                                                                                                                                                                                                                 | 14.0 min       | yes    |
|                    | `pilot_closure_capture`                                            | 1/1 (frames 35–47 copied into `closure-capture/`; the historical `screenshots-evidence-led-pilot-v2/` restored)                                                                                                     | 9.2 min        | yes    |
|                    | `pilot_return` 1 / 2 / 3, `pilot_records`, `pilot_signal_incident` | §2 (1 flaky-pass, 1 / 1 / 4 (one flaky-pass on a swallowed pickup press) / 2)                                                                                                                                       | —              | no     |
|                    | `pilot_yard` test 1 (second sample)                                | **1/1** — item-owned active 235 s (M20 start 6 s), wall 421 s; per window M05 8 s · M19 34 s · M23 31 s · M24 115 s · M26 41 s                                                                                      | 7.4 min        | yes    |
|                    | `v4_event_projection` (800×600, `world-v3`)                        | route complete; in-run compare fails on the five `3a4ff96` deltas only (by design); pure delta spec green                                                                                                           | 6.0 min        | yes    |
| Resolution         | `v4_event_projection` at 1920×1080 (`world-v3-1080` vs `world-v3`) | **1/1 — 0 differences**: 155 events, 28 opportunities, 25 window ids at the full-HD canvas                                                                                                                          | 20.5 min       | yes    |
|                    | route captures 1280×720 (+ video) and 1920×1080                    | 1/1 · 1/1 (§6)                                                                                                                                                                                                      | 36.6 min       | yes    |

Two flaky passes in the whole session (both at the documented intermittent
input-miss class under load: the outbound M09 gauge read and the workshop
bundle pickup) and one intermittent queue failure that passed alone; no
deterministic failure remains on the final tree except the in-run
projection compare against the pre-fix reference, which is the promotion
decision itself.

### 8. Remaining (product / tooling, not scientific) and decisions for the research owner

- **Promote `world-v3.json`** (dba9a37) to the post-fix projection reference —
  recommendation and grounds in §5; nothing promoted here.
- **Automation envelope**: green twice alone (224 s, 235 s vs 300 s); the
  session-3 338 s was concurrent-load automation burden. Keep the 300 s
  proxy, or re-baseline it for the two-plate yard — owner's call; the limit
  was not changed.
- **Workshop book audit margin**: the locker approach's ±12 px box has a
  corner where the `Sample kit` supply bundle wins nearest-wins (seen at
  1080); supply bundles are outside the registry audit's candidate set
  (§4). Presentation geometry decision.
- Cosmetic: Mast 04 state chip vs the canvas edge (720) / the avatar
  (1080); state-chip register; deck readout wrap.
- Developer inspection launch: Core ARM refused (developer-only path).
- Spec-tree type strictness: 15 non-runtime `tsc` diagnostics in specs
  outside `tsconfig.json`'s `include` (the pretool guard protects TypeScript
  configuration, so no e2e tsconfig was added; the one-off command is in
  §2). Undefined-name class: 0.
- Driver headroom (settle waits > held-key time; no-motion bursts) — §3.
- Unchanged: asset-set version / stimulus freeze; P1–P20; runner
  worktrees `fable-v3-runner` / `fable-v3-runner2` for human removal.
