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
