# FABLE-NEXT-02 — Inventory/Prep per-item mini-game (Q01-Q04 substrate)

Implementation-ready task file (do not execute in the blueprint pass).
Parent: roadmap Stage 1 unit 1.2; contract:
`docs/game/CANONICAL-ROOM-AND-MINIGAME-CONTRACTS.md` §R4. This is the
highest-value unblocked measurement unit (gap audit U-D).

## Objective

Replace the Inventory/Prep single-prompt outcome assertions with a real
per-item sort/place → correction → verify → cleanup flow, emitting only
already-approved, already-registered event names.

## Q mappings

- Q01 (organisation, systematic): checklist-before-action, ordered
  placement, verification.
- Q02 (disorganisation, reverse): misplacements surviving an explicit
  correction opportunity; missing-item consequence at Final Core.
- Q03 (maintained order): tidy storage state (retrieval episode is a
  LATER unit — out of scope here).
- Q04 (cleanup, reverse — closed decision): restore-vs-leave stage stays;
  must remain reachable from the shortcut path too, so disorder is chosen,
  not asserted.

## Player mechanic (via `psychometric-task-design` gate before coding)

Quartermaster console lists the kit requirement; 6-10 registry items are
placeable into labelled bins/kit slots by walking to them and interacting
(collect → place). A review step flags misplacements once; the player may
correct, then verify or skip verification; cleanup stage last. Keyboard
only; no timing; explicit text labels; accuracy over speed.

## Raw events (decided BEFORE coding — approved names only)

Emit: `inventory_room_entered`, `inventory_checklist_opened` (checklist
action only, never prompt-open), `inventory_item_sorted_correct`,
`inventory_item_misplaced`, `inventory_sequence_followed`,
`inventory_sequence_completed`, `inventory_verification_skipped`,
`inventory_verified_complete`, `correct_tool_selected`,
`wrong_tool_selected`, `missing_item`, `workspace_tidy_confirmed`,
`workspace_left_disordered`, `cleanup_completed`, `readiness_verified`
(only if a distinct readiness action exists — never double-logged from
one click). Payload: `object_id` = registry `item_id`; `attempt_number`
for corrections; existing registrations in `CanonicalEventContext`
untouched.

NOT emitted (CANDIDATES — flag to research owner if wanted):
`inventory_item_corrected` (correction telemetry currently derivable from
a corrected re-placement = `inventory_item_sorted_correct` after
`inventory_item_misplaced` with higher `attempt_number` — state this in
the room doc), `cleanup_opportunity_shown`, `prepared_tool_used`
(later unit). The Q30 tags on verification events are SA-4's issue: do
not touch them, do not extend them.

## Candidate variables (no ScoringManager change in this unit)

`organisation_accuracy_score`, `organisation_error_count`,
`cleanup_failure_count` remain approved targets computed in a LATER
D2-family scoring pass. This unit only guarantees their raw inputs exist.

## Validity risks

- First-mistake scoring: only post-correction errors are trait-relevant —
  the correction opportunity must be unmissable and logged by sequence.
- Label ambiguity/reading skill: plain labels, no colour-only cues.
- Speed pressure: none; no timers.
- Wording leakage: no player text may resemble order/tidiness item
  wording; use operational language ("stow", "pack", "reset the bench").
- Shortcut-path credit: checklist events only on checklist actions.

## Bounded scope

One room pass: `src/scenes/InventoryScene.ts`, new
`src/data/itemRegistry.ts`, and item state via the EXISTING
`SessionState.prepared_items: string[]` — append registry `item_id`s
alongside `field_kit`; **do not retype the field** (array shape +
`field_kit` membership are read by `FinalCoreScene` and pinned by
`adversarial_session_isolation` / inventory / journey specs). If per-item
placement detail is needed, add a NEW additive field (e.g.
`kit_item_state`) instead. Update
`docs/game/rooms/04-inventory-preparation-room.md`. Scenario D seal log
untouched and isolation-tested. No other room, no scoring, no schema
edits.

## Tests / reviews

Extend `e2e/inventory_prep_logging.spec.ts`: systematic path (place all
correct → verify → tidy), misplacement+correction path, skip-verify +
leave-disordered path, shortcut path parity, event order + pinned
contexts, `prepared_items`/`workspace_status` outcomes, Scenario D
isolation re-run. Then `research-data-reviewer` →
`gameplay-implementation-reviewer` → `browser-qa-reviewer`.

## Preservation constraints

Research systems untouched except the additive SessionState field; legacy
option paths and legacy event aliases keep firing unchanged; existing
spec expectations only extended, never weakened.

## Git

Isolated worktree branch; local commits only. **No push, no merge, no
PR.**
