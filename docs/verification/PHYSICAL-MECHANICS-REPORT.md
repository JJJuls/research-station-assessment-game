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
