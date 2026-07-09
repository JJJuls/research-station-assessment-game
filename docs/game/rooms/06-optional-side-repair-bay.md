# Room 6 — Optional Side Repair Bay

Contract reference: V3 Section 4, "Room 6 — Optional Side Repair Bay".
`room_id`: `optional_side_repair_bay`.

## Purpose

Voluntary effort beyond minimum requirements, diligence, optional
follow-through, delayed-benefit proxy, start-then-drop behaviour.

## Mapped Q-items

Q07, Q16, Q20, Q29, Q32.

## Construct targets

Productiveness, perseverance, diligence, responsibility, exploratory Goal-Time
Preference / delayed benefit (Q29, Q32 — label as optional/exploratory). Q20
(Grit-S Consistency of Interest, starts-then-disengages) is also weak/exploratory
per `MASTER_33_ALIGNMENT.md`.

## Player-facing fiction

A Utility Bot offers an optional stabiliser repair via a repair arm/work
console and parts shelves. It's not required for immediate progression, but it
visibly improves final station stability.

## Task flow

1. Utility Bot discovers/offers the optional stabiliser repair.
2. Player may skip, accept, start, complete steps, formally defer, abandon
   after starting, or complete.
3. No gameplay power upgrade results — only a visible final-status benefit.
4. Completion (or lack thereof) feeds a final-core stability bonus.

## Valid choices/actions (current)

- Ignore the optional repair and move on.
- Start the repair, but stop after the first difficulty.
- Work through the difficulty and complete the repair.

**Missing from current implementation**: a distinct "formally defer" branch
(V3 explicitly requires this to distinguish strategic postponement from
abandonment — a named confound-control measure) — currently "ignore" and
"defer" are not separable.

## Canonical events

`side_repair_discovered`, `stabiliser_option_offered`, `stabiliser_accepted`,
`side_repair_accepted`, `side_repair_first_step`, `side_repair_step_completed`,
`side_repair_abandoned`, `side_repair_abandoned_after_start`,
`side_repair_deferred`, `side_repair_completed`, `final_core_stability_bonus`,
`final_bonus_unlocked`.

Current-to-canonical alias table: `docs/research/event-schema.md` §4, "Optional
Side Repair Bay" — only 1 exact match (`side_repair_completed`).

## Derived variables

`voluntary_effort_count`, `optional_completion_score`, `diligence_step_count`,
`optional_task_completion`, `start_without_sustain_count`,
`optional_followthrough_rate`, `delayed_benefit_investment`,
`optional_future_benefit_score`, `final_stability_gain`.

## Scoring notes

Completionism and curiosity are named confounds — log accepted, started,
deferred, abandoned, and completed as **separate** events rather than collapsing
them into one "did it" flag (V3 validity caution). `delayed_benefit_investment`
and `optional_future_benefit_score` are optional/exploratory Goal-Time proxies —
label accordingly (`scoring-plan.md` §8).

## Failure/edge cases

- Player accepts but never starts: distinct from accepting-then-abandoning —
  both should be logged (currently only "started then abandoned" exists as a
  branch; "accepted but never started" has no event path since acceptance and
  starting are conflated in one option).
- Player formally defers (explicitly "I'll come back later"): must not be
  scored identically to silent abandonment — currently impossible to
  distinguish, since no defer option exists.
- Player completes after initially stopping at first difficulty: should still
  count as `side_repair_completed` with the interim abandon-then-return visible
  in the raw log, not overwritten.

## Playwright verification targets

`optional side repair coverage is not in the explicit V3 Section 9 spec list —
recommend folding into a broader room-coverage spec` (no dedicated spec named in
V3; add to `docs/testing/playwright-smoke-plan.md`'s general room-coverage pass).
At minimum: drive ignore, start-then-abandon, and complete paths; confirm
`side_repair_completed` fires only on the full-completion path with `room_id:
"optional_side_repair_bay"`.

## Implementation notes

Current implementation conflates "accept" and "start" into one choice, and has
no formal defer branch — both are real gaps relative to the contract's explicit
confound-control requirement, not just naming issues. `final_core_stability_bonus`
and `final_bonus_unlocked` require Final Core to read this room's outcome via
`SessionState`'s `side_repair_status` field (V3 Section 3.1), which doesn't
exist yet.

## Anti-leakage note

No productiveness/Grit-S/Goal-Time item wording (Q07, Q16, Q20, Q29, Q32) may
appear in the Utility Bot's dialogue or option labels. Current labels ("Ignore
the optional repair and move on", "Start the repair, but stop after the first
difficulty", "Work through the difficulty and complete the repair") stay
in-fiction — keep this register.
