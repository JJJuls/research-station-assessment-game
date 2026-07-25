# Room 2 — Systems Repair Room

Contract reference: V3 Section 4, "Room 2 — Systems Repair Room".
`room_id`: `systems_repair_room`.

## Purpose

Task initiation, repair after failure, manual use, revised sequence, productive
persistence.

## Mapped Q-items

Q05, Q06, Q14, Q21, Q23, Q24, Q25, Q26; Q03 hosts its cross-room
prepared-tool retrieval episode here (NEXT-09 Phase 2 — see the dedicated
section below).

## Construct targets

Productiveness, Perseverance of Effort, Persistence Despite Difficulty, adaptive
persistence, inappropriate persistence. As with Archive, adaptive (Q14, Q21,
Q23-Q25) and inappropriate (Q26) persistence must stay separate.

## Player-facing fiction

A systems console and repair panel show a failed station system. A repair
manual station is nearby. The default repair sequence fails; the player must
decide how to respond.

## Task flow

1. Enter Systems Repair Room, open repair panel.
2. Player runs a repair sequence — default/first attempt fails.
3. Player may: repeat the failed sequence, open the manual, review manual
   pages, apply a revised sequence, leave unresolved, or complete repair.
4. Completion updates station stability.

## Valid choices/actions

- Run default repair sequence (may repeat an already-failed sequence).
- Open repair manual.
- Apply revised repair sequence (success path).

(Current prototype implements exactly these three; canonical design also
separates manual-opened from manual-page-reviewed and allows an
abandon/return-later branch — see Implementation notes.)

## Canonical events

`repair_room_entered`, `repair_panel_opened`, `task_started`,
`repair_sequence_submitted`, `repair_failed`, `repair_manual_opened`,
`manual_page_reviewed`, `repair_manual_used`, `repair_strategy_revision`,
`repair_same_sequence_repeated`, `repair_abandoned`,
`repair_returned_after_failure`, `repair_completed`.

Current-to-canonical alias table: `docs/research/event-schema.md` §4, "Systems
Repair Room" — 5 exact matches (`repair_failed`, `repair_same_sequence_repeated`,
`repair_manual_used`, `repair_strategy_revision`, `repair_completed`).

## Derived variables

`task_initiation_latency`, `productiveness_action_ratio`,
`difficulty_persistence_score`, `manual_use_flag`, `manual_or_feedback_used`,
`failure_recovery_score`, `required_completion_rate`, `blind_retry_count`,
`reengagement_after_failure`, `game_difficulty_persistence`.

## Scoring notes

Score manual use only when followed by a relevant revision — do not treat raw
time alone as effort (V3 validity caution). Repeating the identical failed
sequence contributes to `blind_retry_count`/inappropriate persistence; opening
the manual and then revising contributes to adaptive persistence
(`game_difficulty_persistence`).

## Failure/edge cases

- Player repeats the exact same failed sequence: must log
  `repair_same_sequence_repeated`, not a second `repair_failed` — current
  implementation already does this correctly (`didRepeat` check in
  `Main.tsx`).
- Player opens the manual but never applies a revised sequence: manual use
  should not count toward `manual_use_flag` as "productive" without a following
  revision (scoring-layer rule, not an event-logging rule).
- Player leaves the repair unresolved: should log `repair_abandoned` (currently
  missing).

## Playwright verification targets

`repair_room_logging.spec.ts` — drive default-fail, manual-open, revised-sequence
path; confirm `repair_failed`, `repair_manual_used`, `repair_strategy_revision`,
`repair_completed` all appear with `room_id: "systems_repair_room"`. Also drive
the repeat-failed-sequence path and confirm `repair_same_sequence_repeated`
fires instead of a duplicate `repair_failed`.

## Implementation notes

Contract status: "strong current implemented core. Fable must preserve existing
working logic unless there is a concrete reason to refactor" — confirmed true in
Beat 0. Missing pieces are `repair_room_entered`, `repair_panel_opened`,
`task_started`, `repair_manual_opened` (distinct from `_used`),
`manual_page_reviewed`, `repair_abandoned`, `repair_returned_after_failure` —
additive, not a rewrite.

**Wave 1A status (2026-07-12)**: room implemented as `RepairScene`
(`src/scenes/RepairScene.ts`, `?scene=repair`, Hub door open via the station
registry). Audit-first port: legacy option labels, feedback strings, event
sequences, and the didRepeat check preserved verbatim; prototype station
untouched. All canonical events above are emitted additively **except
`task_started`**, which stays unemitted pending a documentation-conflict
resolution (V3 §5 lists it under Q05+Q15; MASTER_33_ALIGNMENT.md under Q05
only — user decision, never guessed). The abandon/return pair carries Q24 /
Q24+Q25 with `construct_id` deliberately unset (F1 precedent). The manual
station is a distinct interactable (`repair_manual_station`) logging
`repair_manual_opened` + `manual_page_reviewed`; the panel's legacy manual
option (`repair_manual_used`) is unchanged. `objective_completed` fires once
per session when Archive + Repair are both complete (prototype payload
parity: archive-terminal context). Playwright spec
`e2e/repair_room_logging.spec.ts` authored compile-only — **runtime/browser
verification is still owed in a playwright-game-verify pass** before any
"works" claim.

**FABLE-NEXT-03 status (2026-07-18)**: bounded multi-cycle difficulty
sequence implemented (task B). Option labels, feedback string of the default
path, legacy `repair_attempt`, the didRepeat check and the abandon/return
pair are unchanged. Changes: every submitted sequence increments a
session-lifetime `attempt_number` carried on the five canonical
submission-family events; an unguided "Apply revised repair sequence"
submission is a real distinct failing cycle (its identical resubmission logs
`repair_same_sequence_repeated`); the revision succeeds only when
manual-guided (panel manual option or manual station — both set the guidance
flag, which persists across room exit/return like the didRepeat state); after
completion the panel's sequence options never reopen (no duplicate
completion, no attempt_number growth). Multi-cycle state lives in the
module-scope `repairTaskState` (U2 factory) and resets only on reload —
matching the documented reload semantics (`adversarial_reload_partial_state`).
`repair_step_completed`/`repair_diagnostic_completed` stay CANDIDATES
(event-schema decision, not built). Scoring formulas untouched;
`adaptive_retry_count` and the `blind_retry_count` semantics re-check stay
with the D2-family scoring pass.

**FABLE-NEXT-06 presentation (2026-07-19)**: participant interactions
run through the shared visual choice-card panel (mouse + keyboard;
numeric keys retained as hidden dev/test shortcuts) - card panel + Systems Bay cycle-status side panel (no manual/guidance display by design).
Contract: `docs/game/UI-PRESENTATION-CONTRACT.md`. No event, payload,
mapping, scoring or task-state change.

## NEXT-09 Phase 2 — Q03 prepared-tool retrieval episode (2026-07-25)

The Repair Panel hosts the Q03 cross-room retrieval episode
(`FABLE-NEXT-09-Q01-Q33-GAMEPLAY-COVERAGE.md` §6-Q03; emission definition
fixed by NEXT-09-OD-3, SA register §9.1c). It emits only the
already-canonical, already-registered `prepared_tool_used` (Q03,
organisation) — no other new event, no scoring change, no SessionState
change, and no change to any existing repair event, payload, attempt
number, emission moment, manual-guided-revision semantic, or completion
guard.

- **Task-relevant tool**: the Diagnostic Probe (`diagnostic_probe`, kit
  requisition item 2). One named tool keeps the retrieval target
  deterministic; the identity is fiction-tier (it matches the panel's
  existing diagnostic-readout register). **Approved by research-owner
  ruling NEXT-09-P2-R1** (SA register §9.1d): the identity has no
  independent construct, scoring or validity meaning, and the probe may
  later be visually or fictionally replaced without changing the
  storage, retrieval and first-application measurement semantics.
- **Qualifying opportunity (no-opportunity coding)** — **approved by
  research-owner ruling NEXT-09-P2-R2** (SA register §9.1d): the
  micro-step is offered iff the inventory prep is closed out
  (`completed_rooms` includes `inventory_prep_room`), the probe was
  previously PACKED into the kit crate at some point
  (`kitPreparationState.kit_first_placement_order` — the existing
  was-ever-packed record), and the probe currently sits in a stored
  container (`kitPreparationState.locations` = kit crate or a labelled
  bin — its ACTUAL stored location, which governs retrieval and is a bin
  when the participant re-stowed it). Legacy checklist prep has no
  per-item storage substrate, so it is a no-opportunity state; so are a
  probe left on the bench, a probe stowed but never packed, and a probe
  present during unfinished preparation — all no-opportunity, never
  participant non-performance. No-opportunity sessions get the
  pre-Phase-2 panel byte-identically (Route G kit-less replay: zero
  diffs).
- **Card flow (additive first stage, `renderPromptStage` only)**: the
  panel's first stage names the probe and mirrors station storage as
  neutral cards — Field Kit Crate, Hand Tools Rack, Consumables Bin,
  Electronics Shelf — plus "Go straight to the sequence controls." (the
  opportunity/choice separation requires a use-or-not choice; declining
  keeps the opportunity available on later visits). Opening a container
  displays its contents; the probe's container offers "Take the
  Diagnostic Probe to the panel."; the panel then offers "Fit the
  Diagnostic Probe for the calibration steps." or "Set the Diagnostic
  Probe aside." Container opening, item display, selection and carrying
  emit NOTHING (OD-3), and `wrong_tool_selected` stays Inventory-scoped —
  a wrong container emits no event of any kind. Only the explicit fit act
  emits `prepared_tool_used` (object_id `diagnostic_probe`, standard
  interaction payload, no `attempt_number`), exactly once per session
  (`repairTaskState.preparedToolApplied`, session lifetime, survives room
  re-entry). Every stage then chains into the UNCHANGED sequence stage
  (same options, same schematic presentation, byte-identical panel text).
- **Read-only storage consumption**: the episode reads
  `kitPreparationState` and never mutates it — retrieval cannot alter
  bench-review text, `prepared_items`, `field_kit`, or any Final Core
  flag. The in-prompt "taken" state is transient; leaving the prompt
  before fitting discards it and re-offers the full micro-step later.
- **Non-emission boundaries**: completed repairs never open the panel
  (unchanged gate), so no retrieval after completion; applying the tool is
  impossible twice; sessions without the qualifying tool can never emit.
- **Verification**: `e2e/repair_tool_retrieval.spec.ts` (opportunity,
  actual-stored-location including the re-stowed-bin case, premature
  non-emission, exactly-once, three no-opportunity variants, re-entry
  persistence, keyboard/mouse stream parity) and
  `e2e/route_g_telemetry.spec.ts` (§11.4 Route G: kit-less replay
  zero-diff vs the committed f222fc6 baseline; kit-packed replay adds
  exactly one allowlisted `prepared_tool_used` between
  `repair_panel_opened` and `repair_attempt`).

## Anti-leakage note

No PDD/Grit-S item wording (Q05, Q06, Q14, Q21, Q23-Q26) may appear in panel
text, manual text, or option labels. Current labels ("Run default repair
sequence", "Open repair manual", "Apply revised repair sequence") stay in-fiction
— keep this register. The unguided-adjustment failure feedback ("The adjusted
sequence fails. The calibration values do not match — the manual lists the
current ones.") is in-fiction support signalling, not item wording.

## NEXT-08 presentation (tactile panel)

FABLE-NEXT-08 gave the repair panel a tactile presentation (§6.2;
presentation only — cycles, attempt_number, didRepeat, abandon/return
and one-shot completion are unchanged, verified by the honesty/parity
spec): a schematic strip of static slot-chip/component/manual dressing
(identical every visit) plus a diagnostic readout that re-renders
exactly the status side panel's two lines (awaiting/rejected state,
cycle count) from shared constants — never which sequence is loaded,
never manual/guidance state (`manualGuided` stays unrendered), never
any default-vs-revised cue beyond the existing option labels. Option
glyphs: an identical sequence chip on options 1 and 3, the manual/
document glyph on option 2. Both manual surfaces remain feedback
toasts. Completed panels render no presentation (the prompt stays
gated closed).
