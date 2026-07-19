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
`hazard_informed_continue`, `hazard_reckless_continue`, `hazard_route_avoided`
(user ruling D1), `hazard_issue_created`, `hazard_issue_resolved`,
`final_hazard_issue`.

Current-to-canonical alias table: `docs/research/event-schema.md` §4, "Hazard
Control Room" — **strongest alignment of any room**, 4 exact matches
(`hazard_warning_seen`, `hazard_info_checked`, `hazard_informed_continue`,
`hazard_reckless_continue`).

**RESOLVED — user ruling D1 (2026-07-12, Option A,
`docs/expansion/reviews/WAVE1-USER-DECISION-BRIEF.md` §A):** the
"avoid uncertain route" choice now has the additive canonical event
`hazard_route_avoided` — `study_item_ids: []`, `construct_id` unset, raw
behavioural telemetry only, never construct-scored, never referenced by
ScoringManager formulas. The legacy `hazard_avoidance` stays emitted verbatim
alongside it (the legacy `abandonment_count` derivation continues to read the
legacy event). `hazard_info_checked` remains reserved exclusively for actual
information-checking behaviour.

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

## SessionState

`hazard_status` (V3 §3.1) is written from the three documented decisions using
`src/data/missionVocabulary.ts` tokens: `informed_continue`,
`reckless_continue`, `route_avoided`. Decision labels only, never a score;
because the ported prompt is repeatable (see Implementation notes), the field
reflects the most recent decision. Neutral until a decision is made.

## Playwright verification targets

`hazard_control_logging.spec.ts` — drive check-then-continue path (confirm
`hazard_info_checked` then `hazard_informed_continue`), continue-without-checking
path (confirm `hazard_reckless_continue` with no prior `hazard_info_checked`
and live `metadata.info_checked_before_continuing: false`), and avoid path
(confirm legacy `hazard_avoidance` plus canonical `hazard_route_avoided` with
`study_item_ids: []` and no `construct_id`) — all with `room_id:
"hazard_control_room"`. Also confirm `hazard_room_entered` on entry,
`hazard_warning_seen` on every prompt open (repeatable, no one-shot),
`hazard_status` propagation, and that no summary construct variable moves in
response to `hazard_route_avoided`/`hazard_avoidance` alone.

## Done test

From the Hub, the Hazard Control door is open; entering logs
`hazard_room_entered`; the alert terminal opens the ported 3-option prompt
(warning logged on every open); each of the three decision branches logs its
exact legacy event (plus `hazard_route_avoided` additively on avoid, and the
informed/reckless split driven by session-lifetime `infoChecked` state);
`hazard_status` updates; the player can return to the Hub. Build + tsc pass
and the room's Playwright spec passes against a live browser.

## Implementation notes

Contract status: "implemented as placeholder; later improve panel/detail
mechanics and visuals." Confirmed accurate in Beat 0 — the decision logic is
sound and event names are the closest to canonical of any room, but there's no
separate warning-details panel UI yet (just a 3-option text prompt), and no
Final Core consequence propagation.

**Hazard beat (Wave 1, post-D1):** `HazardScene` (`?scene=hazard`, registry
`sceneKey` flip, statusBoardLabel 'Hazard control') ports the prototype
audit-first: option labels, feedback strings, legacy event names, the
warning-on-every-prompt-open emission, the repeatable prompt (the prototype
has no one-shot decision gate, so none was invented), and the live
`metadata.info_checked_before_continuing` on `hazard_reckless_continue` are
verbatim. `hazardInfoChecked` moved to a U2 session-lifetime task state so
informed-vs-reckless classification survives leave-and-return, matching the
prototype's session-long Main-scene local state. Additive canonical:
`hazard_room_entered` (every entry, unmapped per repair/inventory precedent)
and `hazard_route_avoided` (ruling D1). **Still unemitted, documented gap:**
`hazard_issue_created`/`hazard_issue_resolved` (no documented emission
semantics or resolve mechanic exists — defining them is a task-design
decision, not an audit-first port) and cross-room `final_hazard_issue`
(Final Core side; `hazard_status` now provides the SessionState source for
that future pass).

**FABLE-NEXT-06 presentation (2026-07-19)**: participant interactions
run through the shared visual choice-card panel (mouse + keyboard;
numeric keys retained as hidden dev/test shortcuts) - card panel + valence-neutral route side panel (continued/rerouted only).
Contract: `docs/game/UI-PRESENTATION-CONTRACT.md`. No event, payload,
mapping, scoring or task-state change.

## Anti-leakage note

No prudence/inappropriate-persistence item wording (Q12, Q27, Q31) may appear in
warning text, detail-panel text, or option labels. Current labels ("Check hazard
detail", "Continue through warning", "Avoid uncertain route") stay in-fiction —
keep this register, and keep warning framing about station-consequence
information, not player fear/anxiety.
