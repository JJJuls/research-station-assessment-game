# Room 5 — Hazard Control Room

Contract reference: V3 Section 4, "Room 5 — Hazard Control Room".
`room_id`: `hazard_control_room`.

## Purpose

Information seeking and decision quality under uncertainty — prudence and
carefulness, **not fear induction**.

## Mapped Q-items

Q12, Q27, Q31.

## Construct targets

Prudence/carefulness, responsibility, reckless continuation, inappropriate
persistence under warning, optional immediate-vs-informed route proxy (Q31 is
optional/exploratory Goal-Time — label accordingly).

## Player-facing fiction

A hazard alert terminal shows a warning. A details/inspection panel and a route
decision console are available.

## Task flow

1. Enter Hazard Control Room, warning is shown.
2. Player may inspect details before deciding, or proceed immediately.
3. Player chooses an informed route (checked details first) or a reckless route
   (proceeded without checking), or avoids the uncertain route entirely.
4. Consequence state carries into Final Core.

## Valid choices/actions (current)

- Check hazard detail.
- Continue through warning (outcome depends on whether details were checked
  first: `hazard_informed_continue` vs. `hazard_reckless_continue`).
- Avoid uncertain route.

## Canonical events

`hazard_room_entered`, `hazard_warning_seen`, `hazard_info_checked`,
`hazard_informed_continue`, `hazard_reckless_continue`, `hazard_issue_created`,
`hazard_issue_resolved`, `final_hazard_issue`.

Current-to-canonical alias table: `docs/research/event-schema.md` §4, "Hazard
Control Room" — **strongest alignment of any room**, 4 exact matches
(`hazard_warning_seen`, `hazard_info_checked`, `hazard_informed_continue`,
`hazard_reckless_continue`). One current-only event, `hazard_avoidance` (the
"avoid uncertain route" choice), has no canonical V3 equivalent — flagged in
`event-schema.md` as needing an explicit decision (propose a canonical
`hazard_route_avoided` addition, or fold under `hazard_info_checked` metadata)
before this room's implementation beat.

## Derived variables

`prudence_check_rate`, `reckless_shortcut_count`,
`uncertainty_inappropriate_count`, `informed_delay_choice`,
`risky_shortcut_count`, `game_uncertainty_persistence`.

## Scoring notes

Do not claim to measure fear — this room measures consequence checking,
prudence, responsibility, and reckless continuation despite available
information (V3 validity caution). `hazard_reckless_continue` contributes to
inappropriate persistence (Q27); keep it out of any adaptive-persistence
variable (see `scoring-plan.md` §4 watch item on `strategy_revision_count`
currently folding in `hazard_info_checked`, which needs correction).

## Failure/edge cases

- Player checks details, then avoids the route entirely: should not be scored
  as reckless — `hazard_avoidance` after `hazard_info_checked` is an informed,
  cautious choice, distinct from both continue paths.
- Player avoids without checking details first: still not "reckless" (recklessness
  requires _continuing_ despite lack of information) — avoidance is its own
  outcome category regardless of prior info-check state.
- No consequence currently propagates to Final Core (`hazard_issue_created`,
  `hazard_issue_resolved`, `final_hazard_issue` are all unimplemented) — flag
  this as a real gap, not just a naming one, since the contract's Final Core
  room explicitly expects to display hazard consequences.

## Playwright verification targets

`hazard_control_logging.spec.ts` — drive check-then-continue path (confirm
`hazard_info_checked` then `hazard_informed_continue`), continue-without-checking
path (confirm `hazard_reckless_continue` with no prior `hazard_info_checked`),
and avoid path (confirm `hazard_avoidance`) — all with `room_id:
"hazard_control_room"`.

## Implementation notes

Contract status: "implemented as placeholder; later improve panel/detail
mechanics and visuals." Confirmed accurate in Beat 0 — the decision logic is
sound and event names are the closest to canonical of any room, but there's no
separate warning-details panel UI yet (just a 3-option text prompt), and no
Final Core consequence propagation. Resolve the `hazard_avoidance` canonical-name
question before or during this room's implementation beat, since it affects
whether a new canonical event needs proposing.

## Anti-leakage note

No prudence/inappropriate-persistence item wording (Q12, Q27, Q31) may appear in
warning text, detail-panel text, or option labels. Current labels ("Check hazard
detail", "Continue through warning", "Avoid uncertain route") stay in-fiction —
keep this register, and keep warning framing about station-consequence
information, not player fear/anxiety.
