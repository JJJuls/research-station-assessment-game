# Field-Actions Foundation — Verification Report

Unit: `feat(game): add reusable field action foundation`
Branch: `fable-field-actions-foundation-v1`
Base: `eb87bd9566fc40e28d5edda89af4b11004101173` (interactive inventory foundation)
Final HEAD / commit: the single local commit at the tip of
`fable-field-actions-foundation-v1` (this report is part of that commit;
the SHA is reported in the unit handoff)
Date: 2026-08-22

---

## 1. What was built

One coherent, reusable field-action subsystem (`src/fieldActions/**`) —
professional scanning, digging and magnet recovery — proven in a dedicated
developer scene (`?scene=field_actions_lab`), preserving the accepted
interactive inventory as the sole item authority, and exposing three
strictly PROVISIONAL raw-telemetry measurement windows (M23/M24/M26
candidates) through separate adapters. No route integration; no canonical
event; no score.

Components (mechanics know nothing about psychological constructs):

| Component               | File                                                  | Responsibility                                                               |
| ----------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| Signal model            | `src/fieldActions/signalModel.ts`                     | Pure monotone strength formula, categories, temporal trend                   |
| Field target registry   | `src/fieldActions/fieldTargetRegistry.ts`             | Hidden fixed/counterbalanced targets; strongest-eligible reading             |
| Dig surface registry    | `src/fieldActions/digSurfaceRegistry.ts`              | Deterministic 32px cell zones, once-only cells, buried objects, conservation |
| Magnet deck             | `src/fieldActions/magnetDeck.ts`                      | Finite counterbalanced outcome deck; depletion by construction               |
| Scan controller         | `src/fieldActions/scanController.ts`                  | C action: sweep, pulse, readout, trend baselines, visible cooldown           |
| Dig controller          | `src/fieldActions/digController.ts`                   | D action: facing-cell dig, persistent terrain, cache fallback                |
| Magnet winch controller | `src/fieldActions/magnetWinchController.ts`           | F action: explicit 7-state cycle, cable/magnet, timing band                  |
| Field caches            | `src/fieldActions/fieldCache.ts`                      | Inventory-full recovery objects (conservation safety net)                    |
| Log sink                | `src/fieldActions/fieldActionLog.ts`                  | Injected emission channel (layer stays runtime-import-free)                  |
| Generic telemetry       | `src/fieldActions/fieldActionTelemetry.ts`            | `secondary_field_action_*` contextual family                                 |
| M23 adapter             | `src/fieldActions/opportunities/m23FieldRecovery.ts`  | `proto_m23_field_recovery_*` window                                          |
| M24 adapter             | `src/fieldActions/opportunities/m24MagnetUtility.ts`  | `proto_m24_magnet_utility_*` window                                          |
| M26 adapter             | `src/fieldActions/opportunities/m26DepletedSearch.ts` | `proto_m26_depleted_search_*` window                                         |
| Lab scene               | `src/scenes/FieldActionsLabScene.ts`                  | Five proving areas, range console, validity-register wiring                  |

## 2. Exact changed files

New:

```
src/fieldActions/index.ts                  src/fieldActions/signalModel.ts
src/fieldActions/fieldTargetRegistry.ts    src/fieldActions/digSurfaceRegistry.ts
src/fieldActions/magnetDeck.ts             src/fieldActions/scanController.ts
src/fieldActions/digController.ts          src/fieldActions/magnetWinchController.ts
src/fieldActions/fieldCache.ts             src/fieldActions/fieldActionLog.ts
src/fieldActions/fieldActionTelemetry.ts
src/fieldActions/opportunities/m23FieldRecovery.ts
src/fieldActions/opportunities/m24MagnetUtility.ts
src/fieldActions/opportunities/m26DepletedSearch.ts
src/scenes/FieldActionsLabScene.ts
e2e/field_actions_models.spec.ts           e2e/field_actions_lab.spec.ts
e2e/field_actions_measurement.spec.ts      e2e/field_actions_visual_capture.spec.ts
docs/game/FIELD-ACTIONS-REFERENCE-AUDIT.md
docs/verification/FIELD-ACTIONS-FOUNDATION-REPORT.md
docs/verification/screenshots-field-actions/*.png   (15 frames)
```

Modified shared runtime files — six (five structural + one documented
expansion, justified in the audit §3 BEFORE the edit):

```
src/constants/key.ts             + fieldActionsLab scene key
src/scenes/index.ts              + FieldActionsLabScene class export
src/world/SceneRouter.ts         + field_actions_lab alias
src/data/researchInteractions.ts + proto_field_lab_* interaction block
src/gameplay/fieldActionKeys.ts  guardKeyHandler wrap on C/D/F handlers
src/gameplay/actions.ts          beginManualWorldAction(onCancel?) cancel hook
```

The allowlist verifier (`node scripts/claude/verify-unit.mjs
--allowlist-file …`) reports **PASS — every change inside the unit
allowlist**; `git diff --check` clean.

## 3. Local reuse (summary; full matrix in the audit doc)

Reused: `FieldActionController` (C/D/F chips + `__actionHints`),
`performWorldAction` / manual-action bracket / `cancelActiveWorldAction`,
`playActionAnimation`, `ringPulse`/`burstParticles`, procedural `sfx*` cues,
`addInventoryItem` (transactional adapter over the accepted store),
`wireInventoryOverlayKey` (I), `guardKeyHandler`, `Player.selector`
(facing-adjacent probe, read-only), the SA-13 validity register +
`assignCounterbalance`, `logScenarioEvent`, and the RoomScene base.
Pattern-only reuse: the ice-salvage tension-phase constants inform the new
magnet state machine (accepted, documented duplication — see §20).
No new inventory store, input manager, action mutex or validity register
was created. Full matrix: `docs/game/FIELD-ACTIONS-REFERENCE-AUDIT.md` §1.

## 4. External references and licences

Bear_The_Fisher (MIT, verified in its package.json) — hook/cable pattern
adapted, no code copied. mikewesthad tilemap post 2 (MIT code; assets
separately licensed, none used) — informed the decision NOT to migrate to
runtime tilemap mutation. CFWK — architecture inspiration only (licensing
unconfirmed, nothing lifted). Phaser API docs — API confirmation only.
Nothing cloned, no dependency installed, no external asset copied.
Details: audit doc §2.

## 5. Scanner model and constants

```
strength = round(100 × clamp(1 − distance / detectionRadius, 0, 1))
```

- Default detection radius 240 px (calibration source); field rock 130 px
  (capped so the verified-empty M26 plots can never receive its signal);
  M23 target 160 px; M26 control target 160 px. All radii fixed per form.
- Categories: 0 none · 1-33 faint · 34-66 moderate · 67-100 strong.
- Trend: current vs the PRECEDING COMPARABLE scan only (same opportunity
  context AND same non-null target); baselines reset on window open/close.
  Wording is temporal ("stronger than last sweep"), never directional.
- Scan sweep 1000 ms (cancellable world action); cooldown 900 ms with a
  visible draining bar; cooldown presses get neutral feedback.
- Audio: neutral ping repetition rises with category (0/1/2/3 pings) —
  rate-consistent with strength, identical for everyone.
- Reading resolution: among ACTIVE, unrecovered targets within their own
  radius, the highest-strength one wins (ties: smaller distance, then id).
  No eligible target → "NO SURVEY SIGNAL", no target identity attached.
- Equal distances → equal strengths (pure function; proven in tests).

## 6. Digging state model

- Terrain = registered rectangular tile zones (32 px cells); every cell in
  an ENABLED zone digs exactly once (`untouched → dug_empty|dug_recovered`);
  refusals are typed (`not_diggable` / `zone_inactive` / `already_dug`) and
  surface as neutral feedback. Zones: `open_field` (always on), `m23_plot`,
  `m26_control`, `m26_depleted` (console/window gated).
- Target cell = the cell under `Player.selector` (the sprite's own
  facing-adjacent probe) — position + facing + reach, no per-cell prompts.
- A valid dig: 1500 ms cancellable bar + dig animation + particles; the
  ground change is persistent (disturbed-ground + spoil-mound decals);
  empty digs keep the disturbed state.
- Buried objects are recovered ONLY from their exact registered cell,
  leave the ground exactly once (`unearthed` flag), and an explicit zone
  reset never resurrects an unearthed object (proven).
- Inventory-full: the item materialises as a recoverable field cache at
  the excavation; SPACE/E retries the same transactional insert; refusal
  keeps the cache. Item conservation holds on every tested path.

## 7. Magnet state machine

```
idle → lowering → timing_window → locked_or_missed → reeling
     → resolved → cooldown → idle
```

- F starts a cycle only inside the rig's operating area; input elsewhere is
  inert. The whole active cycle holds the manual world-action bracket
  (movement, prompts, scans, digs and inventory actions are structurally
  impossible mid-cycle).
- Visible cable extends/retracts (graphics line tracking the tweened
  magnet); the timing phase shows a fixed sine sweep (1400 ms), a clearly
  visible catch band (0.32-0.68 — the proven tension-phase geometry), and
  a hint line. F, SPACE and pointer-down all converge on ONE transition
  (`commitLock(source)`).
- ESC cancels ONLY during lowering/timing (via the shared cancel hook →
  RoomScene's cancel-first ESC convention); after the lock the cycle always
  resolves. Cancelled cycles are recorded, never counted as pulls.
- Outcomes: finite counterbalanced deck (§below); a mistimed lock is a
  miss — it costs the cycle, never a deck position. Reeling shows the
  recovered object on the magnet or an empty magnet; resolution is a short
  floating line, no text cards. Cooldown 1200 ms with neutral refusal.
- Deck: two forms (A/B), same multiset in different fixed orders —
  2× scrap plate, 1× ore chunk, 1× flux calibrator (uncommon high-utility
  CANDIDATE item, gameplay-only), 2× empty. Form assigned by
  `assignCounterbalance(session, 'field_magnet_deck_form')` and recorded.
  After 6 consumed positions the rig is depleted BY CONSTRUCTION: the
  explicit statement is shown, a persistent `CATCHMENT DEPLETED` banner
  appears, and no later pull can produce a reward. Outside the M24 window
  the depleted rig refuses further cycles; inside it, post-depletion
  cycles stay mechanically available (M24 candidate requirement).

## 8. Inventory integration and conservation

All acquisition paths (dig recovery, magnet pulls, supply crate, cache
collection) go through `addInventoryItem` — the accepted transactional
adapter over the authoritative hotbar container from eb87bd9. Failure
paths never destroy an item: dig results cache at the excavation, magnet
results cache at the collection tray, crate refusals leave the crate
untouched. The overlay (I), belt HUD and all inventory semantics are the
accepted implementations, unmodified. Conservation proven: once-only
cells, cache retry, no duplication after repeat digs or zone resets.

## 9-12. Provisional measurement windows (M23 / M24 / M26)

Common properties: explicit open/close from the Range Control Console
(developer control; at most ONE window open at a time, so a physical
action can notify at most one adapter); adapters are runtime-import-free
state modules emitting through the injected log sink; the scene owns all
SA-13 validity-register bookkeeping (declare/offered at populate, entered
on open, completed per the rules below, `refreshValidityProbe` after every
change); raw process variables only — no score, weight, cutoff or trait
label anywhere; every identifier is a `proto_*` candidate.

**M23 — `proto_m23_field_recovery_*`** (hard-but-attainable recovery):
fixed counterbalanced target (form_a/form_b cells, recorded on register +
events), radius 160 px, genuinely attainable, several scans/digs expected.
Events: opportunity_opened, scan (with on_target), dig, invalid_action,
completed, closed (full summary), technical_failure. Raw variables:
opportunity_started_at, form_id, scan_count, valid_scan_count (scans whose
reading was the M23 target), unique_scan_positions, best_signal_strength,
direction_improving_transitions, dig_attempt_count, unique_cells_excavated,
invalid_action_count, active_time_ms/idle_time_ms (15 s activity-gap split),
interruptions (scene pauses), completed, completion_time_ms, exit_status.
Completion (target unearthed) closes the window and marks the register
completed; a console reset closes with exit_status `reset` and the register
stays PENDING — never invalid, never a low measurement.

**M24 — `proto_m24_magnet_utility_*`** (utility stop): counterbalanced
deck form recorded; explicit depletion statement shown to everyone at
exhaustion (displayed_at recorded); acknowledgement is a separate recorded
act at the rig readout (E-station; refused before display); cycles counted
pre-signal vs post-signal separately (cancelled cycles recorded but never
counted); alternative useful activity = the Maintenance Bench sort cycle,
separately represented and recorded. Close (console reset / scene exit) is
NEVER a function of stop-vs-continue; the observation counts as completed
once the signal was displayed. Raw variables: opportunity_started_at,
deck_form, cycle_count_pre_signal, useful_outcomes, empty_outcomes,
depletion_signal_displayed_at, depletion_signal_acknowledged,
cycle_count_post_signal, time_post_signal_ms, alternative_activity_entered,
exit_status.

**M26 — `proto_m26_depleted_search_*`** (verified futile search): control
phase first — matched attainable buried target in the control plot (fixed
form, radius 160); completing it opens the futile phase over the DISTINCT
staked depleted plot, which is verifiably empty BY CONSTRUCTION (no target,
no buried object is ever registered there — no concealed reward possible).
Futility verification: the post displays the certificate (recorded), the
participant's own scanner returns no signal, and acknowledgement is an
explicit recorded act. Control events (control_scan/control_dig/
control_completed) and futile events (pre_ack_act, search_scan, search_dig)
never blend; depleted-plot acts before acknowledgement are counted apart.
No M23/M24 state gates entry (proven by opening M26 first in a fresh
session). Raw variables: control_form, control_completed,
control_scan_count, control_dig_count, futility_signal_displayed_at,
futility_signal_acknowledged, pre_ack_act_count, post_futility_scan_count,
post_futility_dig_count, post_futility_unique_positions,
post_futility_active_time_ms, alternative_activity_entered, exit_status.

## 13. Event-family isolation

Four families, pairwise disjoint (statically proven over the exported
literal lists, and on the live stream in the browser specs):

- `secondary_field_action_{scan, dig, magnet_cycle, refusal,
cache_created, cache_recovered, lab_entered}` — contextual only, never
  item evidence (secondary_inventory precedent).
- `proto_m23_field_recovery_*` (7 names) · `proto_m24_magnet_utility_*`
  (7) · `proto_m26_depleted_search_*` (12) — each emitted ONLY by its own
  adapter module (grep-verified: cross-family strings appear in comments
  only). Room-context events (`proto_field_lab_*`) follow the
  `proto_yard_*` precedent and belong to no item.
- One physical action → one generic contextual event + at most one
  item-local event in the single open window. Never two item families.
- `CANONICAL_EVENT_CONTEXT` contains no key with any of these prefixes
  (static test); the canonical summary contains none of these strings
  after window activity (live test); ScoringManager is untouched.

## 14. Missing/invalid handling

Pending, missing, invalid and completed stay distinct through the SA-13
register: unopened windows stay offered/pending (absence is never a low
score); a reset/abandoned window closes with a neutral exit_status and a
PENDING register record (proven in the M23-reset test); technical failures
have dedicated `markM*TechnicalFailure` paths that the scene pairs with
`markOpportunityInvalid('technical_failure')` — never behaviour. No path
invents a value for an unobserved variable.

## 15. Input and modal protections

- C/D/F ride the shared `FieldActionController`, now wrapped in
  `guardKeyHandler` (once-per-DOM-event; closes the documented Phaser 3.90
  key-queue replay exposure for the whole action language) plus the
  existing `event.repeat` check — held keys and frame-stall replays cannot
  duplicate actions (browser-proven).
- Eligibility = `physicalInputEligible()`: prompts, typewriter, scene
  transitions and any running world action suppress all three keys.
- The inventory overlay pauses the host scene (structural suppression —
  C/D/F/E/pointer are inert while open; proven); resume resets latched keys.
- The magnet cycle holds the action mutex end-to-end; dig/scan hold it for
  their duration; keyboard and pointer converge on single transition
  functions (`commitLock`, prompt-option selection, cache collection).
- ESC: cancels a cancellable scan/dig bar or a magnet cycle in its
  cancellable phases (cancel-first, menu-second — the RoomScene
  convention, joined via the documented `beginManualWorldAction(onCancel?)`
  extension); otherwise pauses to the menu.
- Scene shutdown closes open windows (`scene_exit`), tears down cycle
  objects and releases the mutex (SHUTDOWN handlers throughout).
- No new input manager was created.

## 16. Test manifest and results

All runs `--retries=0 --workers=1` on isolated dev-server ports.

Focused acceptance (final combined run of all four specs, re-run green
after the consolidated correction round — 34/34, retries=0, workers=1):

| Spec                                                        | Tests | Result           |
| ----------------------------------------------------------- | ----- | ---------------- |
| `e2e/field_actions_models.spec.ts` (pure Node domain tests) | 21    | pass             |
| `e2e/field_actions_lab.spec.ts` (browser interaction)       | 8     | pass             |
| `e2e/field_actions_measurement.spec.ts` (window isolation)  | 4     | pass             |
| `e2e/field_actions_visual_capture.spec.ts`                  | 1     | pass (15 frames) |

Regression manifest (same session, PW_DEV_PORT=5315):

| Spec                                                          | Result                                                                                                                                                     |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/inventory_foundation.spec.ts`                            | 26/26                                                                                                                                                      |
| `e2e/inventory_measurement_isolation.spec.ts`                 | 4/5 in the paired run — the M02 test failed once with "Execution context was destroyed" (infra, not an assertion); solo re-run **5/5**. Not deterministic. |
| `e2e/four_zone_route.spec.ts`                                 | 3/3                                                                                                                                                        |
| `e2e/artifact_survey.spec.ts`                                 | 3/3                                                                                                                                                        |
| `e2e/magnet_salvage_ip.spec.ts` (legacy M24/M25 + deck logic) | 3/3                                                                                                                                                        |
| `e2e/pipe_diagnosis_setback.spec.ts`                          | 2/2                                                                                                                                                        |

`npm.cmd run lint:tsc` and `npm.cmd run build` — clean throughout.
Scoped ESLint on every touched TS file — clean for all unit-owned files;
the six modified shared files report only the pre-existing repository-wide
CRLF checkout noise (`prettier/prettier` "Delete ␍" on every line —
documented in the inventory foundation report §6; not introduced here and
not auto-fixed, to keep those diffs minimal).

Not run: the full 58-spec suite (dominated by the 12+ dock-default
journeys already broken at the base checkpoint — see the inventory report
§8 — plus the screenshot-overwriting capture specs). Everything outside
the manifest above is unverified by this unit.

## 17. Screenshots and visual findings

`docs/verification/screenshots-field-actions/` (15 frames, each inspected
individually):

| Frame                          | Content                                                     | Verdict                                                             |
| ------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| 01-lab-overview                | Spawn view: south band stations, M26 plots, yard, legend    | pass                                                                |
| 02-scanner-no-signal           | "SIGNAL — NO SURVEY SIGNAL" readout, pulse                  | pass                                                                |
| 03-scanner-faint-signal        | SIGNAL 26 FAINT, "first sweep on this signal", cooldown bar | pass                                                                |
| 04-scanner-strong-signal       | SIGNAL 77 STRONG, "stronger than last sweep"                | pass                                                                |
| 05-dig-in-progress             | Digging… bar, spade animation, D chip                       | pass                                                                |
| 06-empty-excavation-persistent | Disturbed ground + mound persists, neutral feedback         | pass                                                                |
| 07-space-rock-recovery         | "+ Core Sample" pickup at the rock cell                     | pass (note: floating text partly behind avatar)                     |
| 08-inventory-full-field-cache  | Cache + label at the cell, full belt, clear feedback        | pass                                                                |
| 09-recovery-yard-overview      | Rig, cable arm, scrap field, TRAY, F chip                   | pass                                                                |
| 10-magnet-lowering             | Cable extending, magnet descending                          | pass                                                                |
| 11-magnet-timing-window        | Moving marker, visible band, lock hint                      | pass                                                                |
| 12-magnet-successful-recovery  | "+ Scrap Plate", magnet retracted                           | pass                                                                |
| 13-magnet-missed-recovery      | "Mistimed — nothing held"                                   | pass                                                                |
| 14-depleted-no-benefit-state   | Persistent CATCHMENT DEPLETED banner; tray cache            | pass (note: tray-cache label's left edge tucks under the rig frame) |
| 15-results-in-inventory        | Accepted overlay showing recovered items on the belt        | pass                                                                |

Bounded visual correction round (used once): the first layout (30×22,
horizontally scrolling) broke RoomScene's single-screen-width prompt-clamp
assumption — interact prompts for stations east of ~x 600 rendered
displaced. The lab was rebuilt to the room convention (25×30; playable
cols 1-19; east wall band under the UI column; vertical scroll only) and
everything re-verified and re-captured. Remaining cosmetic notes (not
corrected, recorded): pickup text can overlap the avatar for ~1 s; the
tray-cache label can start under the rig frame; the duty-roster HUD line
shows the global route text ("check in at the Arrival Terminal") in this
developer scene — it is the standard RoomScene HUD, not lab copy.

## 18. Reviewer findings and corrections

Four independent read-only reviews ran (the project reviewer agents were
not discoverable in this worktree session — the documented limitation —
so each review was run by a general-purpose agent adopting the matching
`.claude/agents/*.md` brief). The gameplay review was re-run once after
an infrastructure session-limit abort. Verdicts: scientific — "concerns
found; mechanics and family separation sound; M24/M26 signal-recording
and reopening faults must be fixed"; gameplay — "usable with noted
friction; legacy-caller regression check clean; four majors"; test —
"deterministically green; two real assertion gaps"; visual —
"pass-with-notes; frame-14 label pileup should be fixed".

ONE consolidated bounded correction round was applied, then the full
acceptance suite re-ran green (34/34, retries=0) and all fifteen frames
were re-captured and re-inspected:

| #                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Finding (severity)                                                                                                                        | Disposition                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SCI-1/GAME-3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | M24 depletion signal unrecordable when the deck depletes outside the window; readout displayed the statement without recording (major)    | FIXED: `deck_position_at_open` recorded on the opened event/summary + `recordPriorExposure` for pre-window deck use; opening an already-depleted window displays AND records the statement; the rig readout records any in-window display |
| SCI-2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | M26 futility_shown fired at prompt open without the statement being displayed; ack reachable without display (major)                      | FIXED: the futile-phase prompt BODY is the certificate (getPromptBody), so open = genuine display; spec asserts the displayed body                                                                                                        |
| SCI-3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | field_rock's 180 px radius bled a genuine signal into the "verified empty" M26 plot corner (major)                                        | FIXED: radius 130 px (nearest plot cell ≈144 px)                                                                                                                                                                                          |
| SCI-4/GAME-4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Windows reopenable after close: counter accumulation, false "component is present" copy, M26 stuck control phase (major)                  | FIXED: one-shot per session — adapter open-guards + console shows "already run this session"; asserted in the model tests                                                                                                                 |
| SCI-5                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | M23 give-up vs interruption indistinguishable in the register (major)                                                                     | OPEN DECISION for the research owner (§20) — no autonomous register-semantics change                                                                                                                                                      |
| GAME-1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Console compass labels contradicted the layout ("west/centre/east" wrong) (major)                                                         | FIXED: all direction copy corrected (east plot / south plots / western south plot / north-edge post)                                                                                                                                      |
| GAME-2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Latched SPACE fired the rig-readout prompt seconds after a magnet commit (major)                                                          | FIXED: `input.keyboard.resetKeys()` before the manual bracket releases (resolve + cancel paths; overlay-resume precedent)                                                                                                                 |
| TEST-1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Overlay-suppression test could pass vacuously on lost presses (major)                                                                     | FIXED: positive scan controls bracket the overlay (pipeline proven before and after)                                                                                                                                                      |
| TEST-2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | "A miss never consumes a deck position" was never asserted (major)                                                                        | FIXED: deterministic out-of-band lock test (deck unchanged, hook_set=true/locked_in_band=false), plus the frame-13 capture now verifies a genuine miss                                                                                    |
| VIS-1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Frame-14 three-label pileup hid the depleted banner (major)                                                                               | FIXED: banner raised above the prompt/label stack (rig.y−96); re-captured readable                                                                                                                                                        |
| VIS-2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Cache label collided with neighbouring labels (major)                                                                                     | FIXED: cache labels render below the cache                                                                                                                                                                                                |
| GAME-7                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | I-key overlay ungated (minor)                                                                                                             | FIXED: `isEligible: physicalInputEligible`                                                                                                                                                                                                |
| GAME-8                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Magnet cache lacked the collect affordance copy (minor)                                                                                   | FIXED: feedback names SPACE/E beside the tray                                                                                                                                                                                             |
| GAME-9                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | F verb diverged ("Operate Rig" vs "Winch") (minor)                                                                                        | FIXED: chip label "Winch"                                                                                                                                                                                                                 |
| GAME-10                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `startCycle` could clobber the action mutex in a reuse host (minor)                                                                       | FIXED: `isWorldActionActive()` guard                                                                                                                                                                                                      |
| GAME-11                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Idle post logged certificate_viewed with no certificate (minor)                                                                           | FIXED: no event when nothing displayed                                                                                                                                                                                                    |
| GAME-17                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Declared `proto_field_lab_entered` never fired (informational)                                                                            | FIXED: logged at populate beside the secondary marker                                                                                                                                                                                     |
| SCI-7                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | M23 dig events dropped zone_id (minor)                                                                                                    | FIXED: zone_id + on_plot on every M23 dig event                                                                                                                                                                                           |
| TEST-5/8                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | M24 family loop vacuous on empty; frame-03 category unasserted (minor)                                                                    | FIXED: non-empty guard; faint-category assertion                                                                                                                                                                                          |
| VIS-7                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Plot state was colour-only (minor)                                                                                                        | FIXED: closed plots carry a diagonal hatch (non-colour cue)                                                                                                                                                                               |
| SCI-6 (activity split), SCI-8 (time_post_signal semantics), SCI-9 (M24/M26 lack interruption counters), SCI-11 (alternative-activity boolean loses ordering), SCI-12 (prefix-aggregation across duplicated surfaces), SCI-13 (single-window is a host convention), GAME-5 (cross-visit re-bury; no doors exist), GAME-6 (shutdown mid-reel discards the drawn item + record), GAME-12 (stacked tray caches), GAME-13 (chips visible during actions; pre-existing pattern), GAME-15/16, TEST-3/4/6/9/13, VIS-3/4/5/6/8/9/10/11 | DOCUMENTED (minor/informational) — recorded here and in §19/§20; several are research-owner questions, the rest accepted dev-lab friction |

Reviewer findings were treated as recommendations; no reviewer approved
any scientific mapping, event name, formula or asset.

## 19. Remaining defects and limitations

- Accepted from review (documented, not fixed): success/miss floating
  text share one style (wording-only distinction); the timing gauge sits
  ~90 px from the magnet it governs; the tray reads as placeholder art;
  a scene shutdown during locked/reeling discards the drawn item and its
  cycle record (dev lab; no doors exist); re-entering the scene would
  re-bury recovered objects (module vs scene state — no door exists);
  repeated belt-full pulls stack coincident tray caches; C/D/F chips stay
  visible (keys inert) while a world action runs (pre-existing pattern);
  the M24/M26 windows have no interruption counters (mission variable
  lists); `time_post_signal_ms` measures signal-to-last-cycle.
- The paired-run infra flake in `inventory_measurement_isolation` (§16)
  mirrors the environment behaviour documented in earlier units.
- Dig/target registries are scene-instance state; the module-scope magnet
  deck and window states are session state. The lab has no doors, so no
  transition can desynchronise them, but a future multi-scene consumer
  must decide where dig persistence lives (registry serialisation exists
  via `dugCells()`).
- `active_time_ms`/`idle_time_ms` use a 15 s activity-gap classifier
  (documented in-module); whether that split is the intended definition is
  a research-owner question before any derived indicator is proposed.
- The scan readout duration (2.6 s) and cooldown (900 ms) are game-feel
  constants, never measurement windows.
- No human hands-on playthrough occurred; all input evidence is real
  browser-protocol input via Playwright (inventory-report precedent).

## 20. Research-owner decisions still open (none resolved here)

1. **Duplicated provisional construct surfaces.** This unit adds
   lab-local M23/M24/M26 candidate windows while the coolant-yard modules
   (`proto_m23_*`, `proto_m24_*`, `proto_m26_*`) remain untouched and
   reachable. Which surface (if either) becomes the item's measurement
   home — and whether the legacy ones retire — is a research-owner
   disposition (same pattern as the recorded "M23 yard vs Q23 intake rig"
   entry). Nothing here promotes either candidate.
2. **All new names are candidates**: `proto_m23_field_recovery_*`,
   `proto_m24_magnet_utility_*`, `proto_m26_depleted_search_*`,
   `secondary_field_action_*`, `proto_field_lab_*`, the raw variable
   names in the closed-event summaries, and the M-number ↔ Q-item
   crosswalk remain event-schema/scoring-plan decisions.
3. **Two tension-loop implementations** now exist (legacy
   `iceSalvageController` and the new `MagnetWinchController`).
   Consolidation is deliberately deferred until decision 1 lands.
4. **M23 activity/idle split** (§19) and the M24 "post-signal" definition
   (counted from DISPLAY, with acknowledgement recorded separately) are
   documented operationalisations awaiting confirmation.

## 21. Timing observations

Scan sweep 1000 ms + 900 ms cooldown; dig 1500 ms; magnet cycle ≈ 3.4 s
minimum (0.9 lower + lock + 0.9 reel + 0.7 resolve) + 1.2 s cooldown;
sine sweep 1400 ms with ≈ 165 ms in-band crossings twice per sweep (fair
and generous at human reaction times; automation needs the probe). Full
M24 depletion takes ≈ 30-60 s of engaged play. The focused acceptance
suite runs ≈ 11 minutes wall-clock on this machine.

## 22-23. Confirmations

- **No score, no canonical event**: no new key in
  `CANONICAL_EVENT_CONTEXT`; ScoringManager, EventLogger, SessionState,
  QualtricsBridge, DataQualityTracker, ResearchRuntime semantics untouched;
  no formula, weight, threshold or trait interpretation anywhere; adaptive
  vs inappropriate persistence never merged (no persistence variable is
  computed at all — raw counts only).
- **Prohibited trees untouched**: `docs/scientific/**`, `docs/research/**`,
  `docs/decisions/**`, scientific-authority records, the global ruling
  verbatim file, package.json/package-lock.json, tsconfig, Vite/Playwright/
  ESLint/Husky/commitlint configs, `.claude/**`, `asset-candidates/**`,
  information-processing modules, questionnaire wording, and the approved
  inventory domain (`src/inventory/**` unmodified).
- **Nothing was pushed, merged, tagged, deployed or removed**; no PR was
  created; no branch or worktree was deleted; no dependency installed; no
  PixelLab call was made.

## 24. Launch and verification commands

```
npm.cmd run start
# open http://localhost:5173/?scene=field_actions_lab
# Arrows move · C scan · D dig · F rig · SPACE/E interact · I inventory
# H toggles the controls legend · ESC cancels/pauses
# The Range Control Console (south band) opens the three exercises.

# focused suites (from the worktree root):
PW_DEV_PORT=5311 npx playwright test e2e/field_actions_models.spec.ts --retries=0 --workers=1
PW_DEV_PORT=5311 npx playwright test e2e/field_actions_lab.spec.ts --retries=0 --workers=1
PW_DEV_PORT=5311 npx playwright test e2e/field_actions_measurement.spec.ts --retries=0 --workers=1
PW_DEV_PORT=5311 npx playwright test e2e/field_actions_visual_capture.spec.ts --retries=0 --workers=1
npm.cmd run lint:tsc && npm.cmd run build
```
