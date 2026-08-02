# Scientific physical-gameplay and asset expansion — verification report

- **Branch:** `fable-scientific-physical-mechanics-v1`
- **Base:** `49d13a7` (tip of `fable-stardew-quality-outpost-v1`; ancestry
  of the overnight-prototype and visual-redesign commits verified)
- **Final HEAD:** the Unit-8 commit containing this report (`git log -1`)
- **Date:** 2026-08-01 · Author: Claude Fable 5 (execution brief "FABLE 5 —
  NINE-HOUR SCIENTIFIC PHYSICAL-GAMEPLAY AND ASSET EXPANSION")

This is gameplay and PROVISIONAL measurement-design implementation only.
No canonical event name, payload field, scoring formula, weight,
threshold, composite, trait feedback or production export was added or
changed; every new runtime identifier is `proto_*` raw prototype
telemetry via the scenario-telemetry path (no canonical context), and no
open SA/D/INT decision was resolved. Nothing here is a validated
psychological score.

## 1. Commits

| Commit    | Unit    | Title                                                                                 |
| --------- | ------- | ------------------------------------------------------------------------------------- |
| `b8a1089` | 1       | feat(gameplay): add physical object and container interactions                        |
| `adc42d4` | 2       | feat(measurement): implement physical organisation retrieval and cleanup              |
| _(next)_  | 3+4+6+7 | feat(measurement): add artifact survey, persistence depth, animations and ice salvage |
| _(final)_ | 8       | test(research): verify physical behavioural assessment gameplay                       |

Deviation note (recorded honestly): Units 3, 4, 6 and 7 landed as ONE
combined commit. Their implementations interleave in shared registries
(researchInteractions, the texture foundry + pinned manifest, the
gameplay barrel) and in FieldScene (annex path + ice bore) and
ArtifactSurveyScene (survey + action animations); after the Unit-2
commit-shuffle the remaining split would have produced non-compiling
intermediate snapshots. Each unit's content is enumerated below and each
had its own focused green spec before the commit.

## 2. Reusable physical systems added

- **`PhysicalManipulationLayer`** (`src/gameplay/physical.ts`): typed
  direct-manipulation layer — loose world objects (click pickup, drag
  with ghost, activator objects), embodied reach (player must stand
  within reach; drags released away from an in-reach container simply
  stay carried), container drop zones with capacity/compatibility
  callbacks, neutral valid/invalid feedback (uniform cues; shake on
  refusal), carried-item bubble, persistent world state re-rendered from
  host task state, DEV probe `__physicalProbe`. The layer owns
  presentation + input routing ONLY: hosts keep task state and event
  emission, so physical and prompt-card paths converge on identical
  state mutations and identical telemetry (redundant-activator pattern);
  the card flow remains the keyboard-accessible equivalent everywhere.
- **Action-animation kit** (`src/gameplay/actionAnimations.ts`):
  multi-frame tool animations for timed actions — dig swing arc with
  snow kicks, scan-head sweep, work oscillation, handling bob.
- **Manual world-action bracket** (`actions.ts`): custom loops (salvage
  tension) borrow the exact input isolation of timed actions.
- **NPC work cycles** (`Npc.ts` workFrames): two-frame texture loops;
  **stride sway** for ambient workers (`AmbientWorker.ts`).
- **Ice-salvage engine** (`iceSalvage.ts` + `iceSalvageController.ts`):
  deterministic seeded deck + cast/tension/reel loop (post-assessment).

## 3. Q01-Q04 implementation and independence (Unit 2)

- **Q01**: the 8-item bench stock renders as loose world objects at
  fixed staged positions; pickup by click or drag, carried beside the
  avatar, placed physically into the three labelled bins / kit crate.
  Placement calls the EXACT existing emission point (`placeCarriedItem`:
  one act = one canonical event with `object_id` + `attempt_number`).
  Checklist, review, verification and the console flow are unchanged; no
  container displays contents persistently (SA-11); no drop affordance
  previews correctness.
- **Q02**: the unmissable close-out review remains the single correction
  opportunity; corrections can now be re-placed physically (higher
  attempt_number, as before); `proto_q02_review_entered` marks the
  review-window surface in raw telemetry (window DECLARATIONS remain an
  open decision — nothing else changed).
- **Q03**: SA-12 cabinet upgraded to direct manipulation — the three
  returned tools sit on a physical return tray, stowed by drag or click
  into four visible drawer cells; retrieval opens drawer cells directly.
  Same `q03State` functions and `proto_q03_*` events as the card path;
  wrong-cell openings stay distinguishable; availability unchanged
  (independent of Inventory behaviour).
- **Q04**: NEW standardised physical cleanup at the terrace feed-housing
  work site: at install completion (a route milestone, never an item
  outcome) the IDENTICAL six-object mess (2 wraps / 2 clamps / 2 shims)
  appears for every participant with three fixed return points
  (disposal unit / tool rack / component crate) and one identical
  neutral practice line. Exit always available; leave / partial / full
  restore all valid; the primary window closes at the first exit with a
  site-state snapshot; state persists across re-entry (revisit exits are
  raw telemetry only). Own `proto_q04_*` family + SA-13 record
  (`q04-field-mess-v1`); mismatched-container drops are refused
  neutrally so sorting accuracy (Q01's construct) is never generated
  here. The legacy Inventory cleanup card stages and every canonical
  stream are untouched.
- Independence verified by spec: no raw event crosses any of the four
  primaries' streams; Q04's mess is pinned as a fixed table and appears
  in a session with NO prep behaviour at all.

## 4. Q16 artifact survey (Unit 3)

New isolated area **Ridge Annex** (`proto_artifact_field`,
`ArtifactSurveyScene`, south path from the Survey Terrace; offer task
made visible to every participant at first terrace entry — fixed route
position). Participant flow: Noor's brief (accept/decline; re-readable
field notebook, reads recorded) → six fixed staked sites → visible
scanner sweep with learnable HIGH/no-return signal → dig flagged sites
(spoil, particles, persistent state) → collect three distinct specimens
→ place into labelled case trays (mistakes possible; correctable via
take-back) → manifest check (neutral mismatch listing = the correction
cue) → report to Noor. Scanner/spade issued at acceptance if absent
(equipment equivalence). Fixed positions/signals/yields (frozen
stimuli), no pixel hunting, no riddles; design focus is accuracy, stage
completion, corrections and verification — never clicks or wander time.
Own state container, `proto_q16_*` family, SA-13 record
(`q16-survey-v1`, owner "Q16 (exploratory candidate)"). The spec pins
stream isolation from the generic Survey route and from Q01-Q04. This
is a CANDIDATE exploratory prototype, not an approved item score; the
Q07-owned side-repair arc and inventory verification remain untouched.

## 5. Persistence changes by item (Unit 4)

- **Q21**: repair difficulty sequence unchanged in semantics; the broken
  system is now a VISIBLE machine (faulted casing, sparks on each
  rejected cycle, sealed + settled on completion). Support, continued
  access, leave/return, neutral completion all preserved.
- **Q23**: NEW separately bounded retry-quality candidate — the
  Auxiliary Intake Rig (own station in the repair room, module
  `q23CalibrationRig.ts`): first alignment always fails (standardised
  attainable setback), failure names the mismatch, the gauge card is
  usable diagnostic support; identical retry / adjust-by-feel /
  match-the-gauge are DISTINCT recorded acts; "match the gauge" without
  having read it records as an unguided change (guessing can't
  masquerade as revision); completion follows the support-informed
  revision. Own `proto_q23_*` family + SA-13 record; spec pins that NO
  canonical repair\_\* event fires from rig acts and no rig event fires
  from panel acts. Identical-retry markers here are Q23-window contrast
  facts only — never Q26 evidence. The contested Q14/Q21/Q23 stream
  split remains open and untouched.
- **Q26**: identical-repetition semantics verified beside the rig
  (separate completed cycles still required; repeat variant replaces the
  failure event; prompt-level debounce already absorbs auto-repeat).
- **Q27**: SA-2 module deepened with the candidate "switch to useful
  action": a 4th equally accessible window option routes to the bay
  console where filing the sweep results closes the window as a valid
  stop (`proto_q27_switched_to_useful` with `extra_cycles`), revealing
  and rewarding nothing; bot gains a two-frame work loop. Signal,
  neutrality and leave-as-stop semantics unchanged (spec green).
- **Q28/Q11**: Final Core baseline and blocker untouched.

## 6. Other Q-item interactions (honest status)

Q09 report-back, Q13 archive setback, Q14 repair depth, Q22 manual
application, Q15/Q17/Q19 corridor, Q29/Q31 horizon, Q30 granularity,
Q32 portfolio and Q33 closure queue keep their existing card-based
interfaces this session (Q32/Q33 already have physical lane pips /
dossier-stack displays from the previous session). Their remaining
one-click/card status and the blocking rulings are recorded in
`docs/audits/PHYSICAL-INTERACTION-AUDIT-2026-08-01.md`. Q18/Q20 stay
questionnaire-primary. Nothing was invented for blocked items.

## 7. Assets and animations (Unit 6 + throughout)

All new participant-facing art is original procedural work in the
established foundry (deterministic, manifest-pinned; no external or
copyrighted content): ~40 new textures this session — organisation suite
(drawer cell, Q03 tool icons, mess items, disposal unit, field tool
rack, component crate), Ridge Annex (Noor + work pose, three stake
states, specimen case, case trays, notebook stand, three specimen
icons), persistence (intake rig, gauge card, machine fault/fixed),
work-cycle B-poses (Kai/Vale/Noor/bot), ice salvage (bore winch + five
catch icons). Animation upgrades: animated tool actions (dig swing +
snow kicks, scan sweep, work oscillation) replacing static held-tool
bubbles; two-frame NPC work cycles; ambient-worker stride sway; the
player's four-direction walk/idle cycles were already present
(committed researcher frames) and are unchanged.

## 8. Ice salvage (Unit 7) and its isolation

Ice Bore Winch on the terrace SW corner: LOCKED ("capped") until Final
Core completes, or an explicit DEV-only `?freeplay` launch flag (spec
uses it). Cast → fixed sine tension swing → set the hook (SPACE/click)
inside the generous fixed band → reel → deterministic draw from a
balanced 12-card deck shuffled by a seed derived from game*session_id
(seed + pulls logged as `proto_salvage*\*` secondary telemetry). Catches
live on the salvage rack only — never in the primary inventory; no Q
tags, no rewards, no NPC wording changes, no carryover. Exploratory
research use would require a separate ruling and validation plan.

## 9. Tests and builds

- Focused e2e, all green: `physical_organisation` (3),
  `artifact_survey` (3), `persistence_physical` (3), `ice_salvage` (2),
  `proc_textures_determinism` (2), `visual_physical_capture` (6 capture
  drives; the salvage-frame drive passed on its built-in retry).
- Affected legacy specs re-run green: `field_route` (2),
  `measurement_boundaries` (5 — Q27 passed on its built-in retry in the
  chunk and alone; Q29/Q31 passed alone, and its documented
  worker-degradation first-attempt flake at the annex terminal persists
  under heavy chunk load), `gameplay_foundation` (7),
  `route_g_telemetry` (2, after the deliberate recapture).
- Test-infrastructure hardening this session (root-caused live): the
  position-synced `driveAxisTo` stall detector now requires TWO
  consecutive <2px reads before treating a leg as wall-clamped — a
  single dead frame window right after a scene entry previously aborted
  the leg at the spawn and cascaded into "prompt did not open" failures
  across chunked runs.
- `npm.cmd run lint:tsc`: pass. `npm.cmd run build`: pass (2.2s).
  Targeted eslint on every touched file: clean (the repo-wide `Delete
␍` CRLF finding of this worktree checkout predates the session).
- Route-G baselines re-captured deliberately (`ROUTE_G_CAPTURE=1`) —
  the physical-mechanics phase adds allowlisted-by-design proto events
  to the replayed routes (Q16 offer, Q02 review marker, Q04 mess
  presentation); recapture is the documented rebaseline procedure for a
  new phase, never a way to hide a regression.
- Affected legacy specs re-run (results in the final section).

## 10. Screenshots

`docs/verification/screenshots-physical/01…19` — Q01 unsorted/carrying,
Q02 review, Q01 verified review, Q03 cabinet, Q16 briefing/scanning/
digging/case/manifest, Q21 failure, Q26 identical-retry panel, Q23 rig,
Q27 stop-signal window, salvage tension/catch, Q04 mess/partial/
restored. Inspected individually (final section).

## 11. Route duration

Primary route estimate: check-in + requisition + terrace recovery
(~8-12 min human) + physical prep suite (~3-4 min) + Q04 cleanup
(0-2 min, optional) + optional Ridge Annex sweep (~4-6 min) + station
backlog modules + four decisions + Final Core (~6-8 min) ≈ **21-30
minutes**, inside the 20-30 target with the ~35-minute pilot maximum
respected. Ice salvage sits outside the primary route.

## 12. Q01-Q33 status table

See §4 of `docs/audits/PHYSICAL-INTERACTION-AUDIT-2026-08-01.md`
(updated end-of-session): Q01 physical-primary candidate; Q02 correction
window physical; Q03 physical SA-12 module; Q04 new physical
standardised instance; Q16 new candidate module; Q21/Q23/Q26/Q27
deepened with separation; Q29/Q31 SC, Q30 ×2, Q32/Q33 exploratory
modules unchanged; Q05 (D3), Q06/Q08, Q24/Q25 (D4) blocked; Q18/Q20
questionnaire-primary; shared-stream splits (repair/archive/side-repair/
corridor), SA-7..SA-11, D2-D8, INT-1..INT-6 remain with the research
owner, as do event-schema (tier 3) and scoring (tier 4) rulings for
every proto\_\* candidate this session emitted.

## 13. Confirmation

Nothing was pushed, merged, tagged, deployed or removed; no data left
the machine; production configuration, ScoringManager, EventLogger,
SessionState, QualtricsBridge, DataQualityTracker and ResearchRuntime
registration are untouched; the six protected operational files were
not modified.

## 14. Launch / verification commands

```
npm.cmd run start                     # dev server
#   ?scene=artifact_field             # jump to the Ridge Annex
#   ?scene=field&freeplay=1           # DEV free-play salvage unlock
npm.cmd run build && npm.cmd run lint:tsc
npx playwright test physical_organisation artifact_survey persistence_physical ice_salvage
npx playwright test visual_physical_capture   # participant-view captures
npx playwright test                   # full suite (PW_DEV_PORT to isolate)
```

---

# 15. Complete full-regression verification sweep — 2026-08-02

Independent verification-only pass (no features, no scientific design
changes, no asset generation, no research-owner decisions resolved).
Every Playwright specification discovered on disk was executed at least
once against the final branch state.

## 15.1 Subject under verification

| Field              | Value                                                          |
| ------------------ | -------------------------------------------------------------- |
| Branch             | `fable-scientific-physical-mechanics-v1`                       |
| Base ancestor      | `49d13a7c0397934885b172ecf84d0c77ba2e00ab` (verified ancestor) |
| HEAD at start      | `a6d84eaa277b2bd6fd5af3cb02d7b662f4d38689`                     |
| HEAD at end        | `a6d84eaa277b2bd6fd5af3cb02d7b662f4d38689` (unchanged)         |
| Starting worktree  | clean (`git status --short` empty)                             |
| `git diff --check` | exit 0 (no whitespace/conflict damage)                         |
| Changed from base  | 54 files, +7258 / -111                                         |

## 15.2 Technical gates

| Gate                      | Command                           | Result       |
| ------------------------- | --------------------------------- | ------------ |
| Typecheck                 | `npm.cmd run lint:tsc`            | **pass** (0) |
| Production build          | `npm.cmd run build`               | **pass** (0) |
| Whitespace/conflict check | `git diff --check <base>...HEAD`  | **pass** (0) |
| Silently-skipped specs    | grep `.only` / `.skip` / `.fixme` | **none**     |

Runtime-error coverage: `expectNoRuntimeErrors` (page errors + unhandled
rejections) is asserted 83 times across 27 specs, including every new
physical spec. No missing texture, broken transition, stuck input, prompt
lock or orphaned dev server was observed; port 5199 was confirmed free
after each batch.

## 15.3 Execution method

Deterministic sequential chunks: one worker, `--retries=0` on the
diagnostic first pass (the repo default `retries: 1` was deliberately
overridden so no first-attempt failure could be concealed), dedicated
`PW_DEV_PORT=5199`, no concurrent Vite/Playwright processes, no
`--grep-invert`, no `--update-snapshots`, no hidden exclusions.

```
PW_DEV_PORT=5199 npx playwright test <specs> --workers=1 --retries=0 --reporter=list
```

## 15.4 Complete specification manifest

**46 specification files · 151 tests · 151 executed (100%).**

| Chunk | Specs                                                                                                                                                | Tests | First attempt | Duration |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------- | -------- |
| c01   | physical_organisation, artifact_survey, persistence_physical                                                                                         | 9     | 8 ✓ / 1 ✘     | 11.0m    |
| c02   | ice_salvage, measurement_boundaries, proc_textures_determinism                                                                                       | 9     | 6 ✓ / 3 ✘     | 9.2m     |
| c03   | visual_physical_capture                                                                                                                              | 6     | 4 ✓ / 2 ✘     | 10.3m    |
| c04   | gameplay_foundation, field_route                                                                                                                     | 9     | 9 ✓           | 3.1m     |
| c05   | route_g_telemetry, visual_route_capture, visual_snapshots                                                                                            | 4     | 4 ✓           | 25.2m    |
| c06   | inventory_prep_logging                                                                                                                               | 10    | 10 ✓          | 13.7m    |
| c07   | repair_room_logging, repair_tool_retrieval                                                                                                           | 14    | 12 ✓ / 2 ✘    | 20.3m    |
| c08   | side_repair_logging, interruption_corridor_logging                                                                                                   | 14    | 14 ✓          | 18.9m    |
| c09   | engineer_hub_logging, archive_room_logging, hazard_control_logging                                                                                   | 12    | 10 ✓ / 2 ✘    | 6.9m     |
| c10   | participant_ui_cards, participant_viewport_display                                                                                                   | 13    | 13 ✓          | 5.1m     |
| c11   | research_export_test_mode, state_session_continuity                                                                                                  | 12    | 12 ✓          | 4.0m     |
| c12   | scenario_allocation/breach/calibration/reconciliation/route_gate                                                                                     | 10    | 10 ✓          | 15.0m    |
| c13   | scenario_pilot_route, connected_participant_journeys, connected_world_smoke                                                                          | 5     | 4 ✓ / 1 ✘     | 22.5m    |
| c14   | adversarial\_\* (8 specs)                                                                                                                            | 11    | 11 ✓          | 15.2m    |
| c15   | final_core_summary, launch_with_research_params, movement_and_first_interaction, participant_lifecycle, dock_tutorial_paths, technical_error_capture | 13    | 13 ✓          | 10.0m    |

**First-attempt total: 140 passed / 11 failed.** Wall clock ≈ 3.0 h plus
reruns.

## 15.5 Failure classification (honest)

Every first-attempt failure was rerun in isolation; where one isolated
run was not conclusive the test was repeated further. **No failure
reproduced deterministically.** Nothing below is reported as "green"
on the strength of a retry.

| #   | Test                                                   | 1st | Isolated / repeats     | Classification                  |
| --- | ------------------------------------------------------ | --- | ---------------------- | ------------------------------- |
| 1   | `artifact_survey` full physical sweep (Q16)            | ✘   | ✓                      | intermittent                    |
| 2   | `ice_salvage` locked during the duty shift             | ✘   | ✘, then ✘ / ✓          | intermittent (high rate, 3✘/1✓) |
| 3   | `ice_salvage` deterministic deck, hit and miss         | ✘   | ✘, then 2✘ / 1✓        | intermittent (high rate, 4✘/1✓) |
| 4   | `measurement_boundaries` Q03 cabinet                   | ✘   | ✓                      | intermittent                    |
| 5   | `visual_physical_capture` artifact survey frames (Q16) | ✘   | ✓                      | intermittent                    |
| 6   | `visual_physical_capture` ice-salvage frames           | ✘   | 1✘ / 1✓                | intermittent                    |
| 7   | `repair_room_logging` NEXT-08 tactile panel            | ✘   | ✓                      | intermittent                    |
| 8   | `repair_tool_retrieval` qualifying packed tool         | ✘   | ✓                      | intermittent                    |
| 9   | `engineer_hub_logging` prepared report, accurate claim | ✘   | ✘, then 3 ✓ (repeat×3) | intermittent                    |
| 10  | `engineer_hub_logging` partially accurate claim (0.5)  | ✘   | ✓                      | intermittent                    |
| 11  | `connected_participant_journeys` P1 adaptive completer | ✘   | ✓                      | intermittent                    |

**Deterministic product-code regressions found: none.** No `src/` file
was modified in this unit, and none is recommended on this evidence.

### 15.5.1 Root cause of the ice-salvage cluster (#2, #3, #6) — isolated

Failures #2/#3/#6 all sit on the same Ice-Bore approach. A standalone,
read-only diagnostic (scratchpad only; no repository file added or
changed) replayed the exact `driveAxisTo` legs and printed the observed
player position after every burst:

- **With a 1.2 s settle after scene entry — 3/3 runs succeed:** legs
  arrive, final position ≈ `(75-78, 424)`, i.e. **26-28 px** from the Ice
  Bore Winch at `(64, 448)` — well inside the 72 px radius — and SPACE
  opens the prompt with the three expected cards (`Lower the magnet.`,
  `Check the salvage rack.`, `Step back.`).
- **Without the settle — 3/3 runs fail identically:** the third leg
  reports `STALLED burst=3 y=328.0`, ending **121 px** from the bore, and
  `__promptCards` is `null` — precisely the observed
  "prompt did not open after 3 SPACE presses" / null-feedback failures.

**Conclusion: the ice-salvage feature works.** The station, its prompt,
its cards and its locked/unlocked gate are reachable and functional. The
failure is a _test-harness_ fragility: `driveAxisTo`'s two-consecutive-
stall wall-clamp heuristic (added in this branch) still yields a false
"wall clamp" when the first bursts of a leg land in the jank window right
after scene entry — plausibly interacting with the ambient-worker motion
this branch introduced near that corridor.

**Not repaired here, deliberately.** `driveAxisTo` is shared by
essentially all 151 tests; changing it would invalidate the sweep just
completed and could not be re-verified within this unit. Recommended
bounded repair unit (test-only, no `src/`): make the stall detector
require observed forward motion before it may declare a wall clamp (or
gate the first stall reads on a scene-settle predicate), then re-run the
full suite. Assertions must be retained, not relaxed; adding a bare sleep
to the specs would mask rather than fix.

### 15.5.2 Root cause of the engineer-hub failures (#9, #10)

Both are an off-by-one in claim selection, **not** a scoring change.
`REPORT_CLAIMS` is a fixed 4-row template
(1 = repair✓/kit✓, 2 = repair✓/kit✗, 3 = repair✗/kit✓, 4 = repair✗/kit✗).
The captured payload for #10 shows the test pressed for claim 2 but
recorded claim 1 (`claimed_field_kit_packed: true`, `facts_correct: 0`);
#9 is consistent with claim 3 being recorded where claim 4 was pressed.
Decisively, `actual_systems_repair_complete` and `actual_field_kit_packed`
were **both correct** in the payload — live mission state and
`evaluateReportAccuracy` are intact. A numeric keypress is landing one
card early under load. `EngineerScene.ts` and `engineer_hub_logging.spec.ts`
are untouched by this branch, and `assignCounterbalance` is not used on
this stage, so option order cannot have shifted.

## 15.6 Boundary non-regression (scientific separation)

Verified by executed assertions (all the specs below passed) plus static
review of the assertions themselves. "Canonical" here describes an
**existing code event only** and implies no approved event-schema or
scoring authority.

| Boundary                                                         | Evidence                                                                                                                                                                                                                                                 | Status |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Q01 physical actions converge on the card path's existing event  | `physical_organisation` — placement emits `inventory_item_sorted_correct` / `correct_tool_selected` with `object_id` + `attempt_number`                                                                                                                  | ✓      |
| Q02 correction distinct from first mistakes                      | corrected placement carries `attempt_number: 2`; `proto_q02_review_entered` ×2                                                                                                                                                                           | ✓      |
| Q03 available independently of Inventory                         | `measurement_boundaries` Q03 cabinet (passed on isolated rerun)                                                                                                                                                                                          | ✓      |
| Q04 always the identical six-object mess                         | `Q04_MESS_OBJECTS` pinned at 6; mess ids asserted equal at presentation                                                                                                                                                                                  | ✓      |
| Q16 own state + provisional family                               | `proto_q16_*` only, own `q16State` module                                                                                                                                                                                                                | ✓      |
| Q23 rig telemetry isolated from canonical repair, both ways      | `persistence_physical` — canonical repair events `toBeUndefined()` in rig flow; rig events absent from panel flow; no `study_item_ids` / `construct_id`                                                                                                  | ✓      |
| Q21 / Q23 / Q26 distinguishable                                  | `repair_failed` ×1, `repair_same_sequence_repeated` ×1, `repair_strategy_revision`, `repair_completed`                                                                                                                                                   | ✓      |
| Q27 switch-to-useful adds no extra utility cycle                 | `extra_cycles: 0`; `proto_q27_extra_cycle` ×0                                                                                                                                                                                                            | ✓      |
| Q29/Q31 one shared construct/state                               | two observations (`A_npc`, `B_terminal`), one shared record                                                                                                                                                                                              | ✓      |
| Q30 two independent opportunities                                | Hub work-order board + field telemetry cache instances                                                                                                                                                                                                   | ✓      |
| Q32 / Q33 distinct exploratory modules                           | distinct ids `proto_q32_project_portfolio`, `proto_q33_closure_queue`                                                                                                                                                                                    | ✓      |
| Q18 / Q20 remain questionnaire-primary                           | no new module; `CanonicalEventContext.ts` / `SideRepairScene.ts` untouched by this branch                                                                                                                                                                | ✓      |
| No new scoring / canonical mapping / composite                   | `src/measurement/index.ts` diff is barrel re-exports only; ScoringManager, EventLogger, SessionState, QualtricsBridge, DataQualityTracker, event-schema and scoring-plan all untouched                                                                   | ✓      |
| Ice salvage post-assessment/free-play only, zero primary contact | gate implemented (`routeComplete \|\| ?freeplay`); the salvage prompt is reachable only there. **The spec that proves the locked state passed 1 of 4 attempts** — the boundary is implemented but its runtime proof is currently unreliable (see 15.5.1) | ⚠      |

**Route-G non-regression.** `route_g_telemetry` passed 2/2: G-A reports
**zero diff against the pre-Phase-2 baseline**, G-B exactly one
allowlisted `prepared_tool_used` in its contracted position. The
baseline recapture in this branch is **purely additive** — 50 insertions,
**0 deletions**, adding only `proto_q02_review_entered` to each baseline —
so no canonical event was removed, renamed or re-ordered.

## 15.7 Visual review — completed

All **19** `screenshots-physical/` frames and all **9**
`screenshots/` route frames were inspected at full resolution (the
independent audit had covered only 7 and 0 respectively). Defects are
recorded, **not repaired**, in this unit.

| Finding                                                                                                                                                | Frames                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Card/dialogue panel overlaps the right status panel, clipping its first characters (`Bench` → `ch`, `Manifest` → `ifest`, `Repair` → `epair`)          | 03, 04, 06, 10, 12, 13, 14         |
| HUD objective line 2 truncated at the status-panel edge (`…(south doo`, `…(NE wal`)                                                                    | 01, 02, 11, 12, 13                 |
| Interaction label clipped at the **left viewport edge** (`ss SPACE to interact`)                                                                       | 16 (also 15, flush at x=0)         |
| `Press SPACE to interact` runs under the status panel (`…to in⌷eract`); label collides with `Survey Stake`                                             | 09                                 |
| Corner ornament overlaps panel header text (`Sweep: not starte…`)                                                                                      | 06, and present in 01–14           |
| Dim overlay reveals tile grid as pale "graph paper" behind open cards                                                                                  | 03, 04, 12, 14                     |
| Large dead space below the room; hotbar isolated from the map                                                                                          | 01–04, 11–14, and route 06, 07, 09 |
| Room occupies a small fraction of the viewport (Diagnostic Bay, Ops Annex)                                                                             | route 06, 07                       |
| NPC name label rendered dark-on-dark, near-illegible (`Quartermaster Vale`)                                                                            | route 04                           |
| Player sprite overlaps/occluded by NPC or scenery at the same tile                                                                                     | route 03, 18                       |
| Option/record-card icons render as plain untextured rectangles                                                                                         | 12                                 |
| **Q04 mess salience:** the six mess items are small, low-contrast, and read as ordinary scenery clutter; 17 (mess) vs 19 (restored) differ only subtly | 17, 18, 19                         |
| **Ridge Annex density:** large uniform ice slab, sparse features; a stray light-grey rectangle sits in the out-of-bounds area right of the room        | 06–10                              |

Readability of the physical tasks themselves is otherwise good: carried
item, bench counts, progress bars (`Scanning…` / `Digging…`), tray
placement toasts and the Q27 stop-signal wording are all clear and
measurement-neutral.

**Evidence-integrity note.** `visual_physical_capture`, `visual_route_capture`
and `visual_snapshots` **overwrite the committed screenshots as a side
effect of running**. Running the full suite silently rewrote all three
sets (33 files). They were verified materially identical and restored via
`git checkout --` so the committed evidence is intact and the tree is
clean; all findings above were recorded against the committed frames.
Future sweeps should expect this.

## 15.8 Independent-audit findings carried forward (not implemented here)

Recorded verbatim as carry-forward. **No authority or operational
register was edited in this unit, and no audit recommendation is treated
as implementation authority.**

1. Scientific and ownership registers are stale relative to the prototype tree.
2. Q04, Q16 and Q23 candidate instances require research-owner disposition.
3. The Q27 switch-to-useful candidate act requires disposition.
4. SA-13 invalid/missing/censored paths are not fully wired.
5. Q04 visibility may create a salience/comprehension confound — **independently corroborated visually here** (15.7).
6. Fixed option order is not exported consistently.
7. Prior exposure is not recorded consistently.
8. The 14–18 vs 20–30 minute burden envelope is unresolved.
9. UI clipping/occlusion remains — **independently corroborated here** (15.7).
10. Tier-3 event-schema and tier-4 scoring authority remain absent for every `proto_*` candidate.

## 15.9 Remaining blockers

- **Suite reliability.** 11 of 151 tests failed on first attempt (7.3%),
  concentrated in scene-entry approach navigation and numeric card
  selection. The ice-salvage cluster fails at a high rate (#2: 3✘/1✓,
  #3: 4✘/1✓). A green full-suite run currently depends on retries.
- **The ice-salvage locked-state boundary lacks a reliable runtime proof**
  (implemented, but its spec passed 1 of 4 attempts).
- All tier-3 / tier-4 authority gaps and the ten audit items in 15.8.

## 15.10 Verdicts

- **Ready for human gameplay verification: yes.** Build and typecheck
  pass; all 46 specs execute; 140/151 pass first-attempt and every
  failure is a harness-timing artifact with the underlying feature shown
  to work (the Ice Bore was driven to and opened 3/3 under diagnostic).
  Manual play should specifically exercise the Ice Bore approach, the
  Ridge Annex sweep, and the Q04 cleanup site.
- **Scientifically pilot-ready: no.** Every new stream is `proto_*`
  prototype telemetry with **no approved event-schema (tier 3) or
  scoring (tier 4) authority**; Q04/Q16/Q23/Q27 candidate instances await
  research-owner disposition; SA-13 invalid/missing/censored paths are
  incomplete; option-order export and prior-exposure recording are
  inconsistent; the burden envelope is unresolved; and the Q04 salience
  confound is unaddressed. **No claim of formal validity is made.**
- **PixelLab:** no PixelLab MCP tool was called; no generated asset was
  read, integrated or referenced; `fable-pixelab-asset-candidates-v1`,
  commit `62ed985` and the candidate worktree were never accessed. No
  `public/**` file was touched.
- **Nothing was pushed, merged, tagged, deployed, or removed;** no
  worktree was removed and no branch deleted. `src/**`, authority
  documents, ownership JSON, event schema, scoring plan, assets, route
  baselines, snapshots and package/config files were **not** modified.
