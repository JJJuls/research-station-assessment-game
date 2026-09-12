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
