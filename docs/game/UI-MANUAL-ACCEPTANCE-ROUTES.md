# Manual Acceptance Routes — FABLE-NEXT-06 Participant UI

Operator instructions for manually accepting the unified participant UI
(`FABLE-NEXT-06`, contract: `docs/game/UI-PRESENTATION-CONTRACT.md`).
Launch: `npm.cmd run start`, default route (Dock). Use the DEV console
probe `window.researchRuntime.getEvents()` to confirm expected events;
**none of these expectations appear anywhere in the participant UI.**
Every interaction below is performed on the visual card panel (click a
card, or Arrow Up/Down + Enter) unless the route says otherwise.

Common preamble (routes 1-9): Dock terminal → complete/skip the tutorial
→ north door → Station Hub → the named station door.

## 1. Inventory correct path

Console → "Prepare each item individually" (option 4 card) → for each of
the five kit items: Prep Bench (take) → Kit Crate (pack); stray items →
their labelled rack. Console → review (no issues) → verify → cleanup
restore. Expect: per-item `correct_tool_selected`/`inventory_item_sorted_correct`
(one per act, `object_id` = item id, `attempt_number`),
`inventory_verified_complete`, `cleanup_completed`, mission
`prepared_items` gains `field_kit`, `workspace_status: tidy`. Side panel
shows the carried slot and shrinking bench list (never requisition ticks —
SA-11).

## 2. Inventory misplace, review, correct, verify

As route 1, but place one kit item into a labelled rack instead of the
crate. Console close-out shows the unmissable review listing the staging
issue → correct it (re-take, re-place; higher `attempt_number`) → verify.
Expect: `inventory_item_misplaced`/`wrong_tool_selected` then the correct
placement event with `attempt_number` ≥ 2; `missing_item` once per item
surfaced at review; `inventory_verified_complete`.

## 3. Inventory cleanup restore vs leave

Run route 1 twice (fresh sessions): choose "restore" once and "leave"
once at the cleanup stage. Expect: `cleanup_completed` +
`workspace_status: tidy` vs `workspace_left_disordered` +
`workspace_status: disordered` (Q04 is always a chosen act).

## 4. Systems Repair fail, revise, consult manual, succeed

Repair panel → submit a wrong sequence (fails; side panel cycle count
increments, wording stays direction-neutral) → consult the manual →
submit the revised sequence. Expect: `repair_failed` (attempt 1),
`repair_manual_used`/`manual_page_reviewed`, `repair_strategy_revision` +
`repair_completed` (manual-guided success only), `attempt_number` on each
cycle event; completion is one-shot on return visits.

## 5. Side Repair complete, defer/resume, abandonment

(a) Utility bot → accept → Parts Shelf (fetch) → console (fit) → console
(check): `side_repair_accepted`, three `side_repair_step_completed`
(`metadata.step` fetch/fit/check), `side_repair_completed`,
`final_bonus_unlocked`; side panel steps 1→2→3. (b) Defer at the offer,
re-open later: `side_repair_deferred`, `side_repair_status: deferred`,
resumable. (c) Accept, complete ≥1 step, walk out: walk-away abandonment
(`side_repair_status: abandoned_after_start`), once per departure.

## 6. Engineer prepared and unprepared report-back

(a) Kai → "Review station evidence" → the content stage shows the station
log extract → pick the matching claim → duty decision. Expect:
`engineer_evidence_reviewed`, `engineer_report_submitted_prepared`,
`engineer_report_accuracy_scored` (success true, metadata.accuracy 1,
report_mode prepared), duty events per choice. (b) Fresh session: "Submit
a quick report from memory" → any claim. Expect
`engineer_report_submitted_unprepared` + accuracy event scored against
the real state (no grade ever shown; identical acknowledgement).

## 7. Hazard informed and reckless paths

(a) Console → check the hazard information → continue: `hazard_info_checked`,
`hazard_informed_continue`; side panel shows "continued" (never
informed/reckless wording). (b) Fresh session: continue WITHOUT checking:
`hazard_reckless_continue` (metadata.info_checked_before_continuing false);
panel wording identical to (a).

## 8. Interruption acknowledge, ignore, switch and return

Accept the relay duty at Engineer first (genuinely pending original).
(a) Beacon → acknowledge: legacy acknowledge triple; then complete the
Relay Checkpoint check-in: `prior_goal_completed` +
`task_completed_after_interruption`, NO return events (never switched).
(b) Fresh session: ignore: `interruption_alert_ignored` + `task_avoidance`;
beacon one-shot. (c) Fresh session: switch → Antenna Junction (align +
confirm; `goal_switch_accepted` at commit, `switched_task` at first
junction interaction) → Relay Checkpoint: `return_to_unfinished_task` +
`returned_to_original_task` at re-engagement, completion events at
check-in; `interruption_status` settles to `returned_to_task`.

## 9. Final Core blocked entry and valid completion

(a) Go to Final Core before completing the four station decisions: the
interface is locked (route-gate card "Step back from the interface" only;
`final_core_blocked_pending_decisions`). (b) Complete all four scenario
decisions, prepare the kit, resolve flags at the core: `final_core_status_reviewed`,
`final_core_remaining_issues_resolved`, `engineer_supervision_completed`
(if duty accepted), `final_core_high_quality_completion`,
`final_core_completed`; one-shot on re-interaction. Side panel:
synchronization pending → complete (never path labels or flag lists).

## 10. Keyboard-only completion of each changed interface

Repeat any route above touching every converted surface (Dock tutorial,
Hub scenario console, Archive terminal, Repair panel, Engineer console +
bench, Inventory stations, Hazard console, Side Repair stations, corridor
stations, Final Core interface) using ONLY Arrow Up/Down + Enter on the
cards (movement keys between stations). Every card must show the visible
focus state (thicker cyan border + ▸ marker + fill shift); Enter selects
exactly once; emissions identical to the mouse path.

## 11. Mouse-only completion of each changed interface

Same as route 10 using ONLY pointer input on the cards (hover focuses,
click activates). Movement between stations still uses the keyboard (the
game has no click-to-move; the converted surfaces are the decision
interfaces). Emissions identical; no duplicate events from hover/focus.

## Notes

- Numeric keys 1-9 still select (hidden dev/test/accessibility fallback);
  verify no participant instruction mentions them.
- ESC opens the pause menu (documented back behaviour); assessment
  prompts close only by selection.
- Expected-event lists above are operator-facing only and must never be
  surfaced to participants.
