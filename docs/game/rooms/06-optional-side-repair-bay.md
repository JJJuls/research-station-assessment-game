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

**Wave 1A status (2026-07-12)**: room implemented as `SideRepairScene`
(`src/scenes/SideRepairScene.ts`, `?scene=side_repair`, Hub door open via
the registry, statusBoardLabel 'Stabiliser repair'). Legacy 3 options
verbatim (labels, feedback, event sequences, one-shot gate text). Additive
canonical: `side_repair_discovered` (once, first entry),
`stabiliser_option_offered` (each offer, beside legacy
`side_repair_opened`), `stabiliser_accepted` + `side_repair_accepted` +
`side_repair_first_step` (both start paths — the accept/start
decomposition), `side_repair_abandoned_after_start` (beside legacy),
`final_bonus_unlocked` (completion path). **Formal defer branch added** as
option 4 (`side_repair_deferred`, appended so legacy ordering is frozen):
deferring records `side_repair_status = deferred` and does NOT complete the
room — the offer reopens on return, and any later completion keeps the
interim defer visible in the raw log. `side_repair_completed` now carries
its matrix mapping (Q07/Q16/Q32, construct unset) — this intentionally
changes prototype payloads; re-baseline that fixture field during the next
verification pass. Still unemitted: `side_repair_step_completed` (needs a
multi-step mini-game — task-design decision), canonical
`side_repair_abandoned` (never-accepted branch keeps legacy
`side_repair_ignored`; canonical name not matrix-listed).
`side_repair_status` vocabulary: `ignored` / `abandoned_after_start` /
`deferred` / `completed` (`src/data/missionVocabulary.ts`); Final Core
reads `completed` for the stability bonus. Spec
`e2e/side_repair_logging.spec.ts` authored compile-only —
**runtime/browser verification still owed** before any "works" claim.

**FABLE-NEXT-03 status (2026-07-18)**: real multi-step task implemented
(task A). After acceptance ("Start the stabiliser repair.") the repair is
three motorically trivial observed steps — fetch the replacement part at the
new Parts Shelf station (`side_repair_parts_shelf`, left flanking block),
seat it at the work console (the step-2 label states the misaligned mounting
before the player commits — the mild difficulty rise, stable utility, no
stop signal; SA-2's utility-stop stage is NOT built), run the system check.
Each step logs `side_repair_step_completed` with `metadata.step`
(`fetch_component`/`fit_component`/`run_check`). The legacy one-press
options 2-3 are retired; their events fire at observed moments instead
(see event-schema §4): accept family on accept, abandonment pair at the
real walk-away (room exit with ≥1 step, no deferral since the last step —
then one-shot close, legacy semantics), completion family on the final
step. `side_repair_first_step` fires at the observed first step. Deferral
is available at the offer AND from the work console; it keeps step progress
(session-lifetime `sideRepairTaskState`, U2 factory) and never counts as
abandonment. Accepted-with-zero-steps walk-away emits nothing and stays
resumable — canonical `side_repair_abandoned`/`side_repair_returned` stay
flagged CANDIDATES for the research owner. The ignore path (option 1) is
legacy-verbatim. No scoring edits; `optional_followthrough_rate`,
`accepted_task_completion_rate` stay CANDIDATES (D2-family pass). Q20
remains questionnaire-primary: start-without-sustain is now observable but
carries no score.

Research-owner interpretation caveats (research-data-reviewer, FABLE-NEXT-03
pass — recorded, not resolved): (1) the legacy alias
`side_repair_abandoned_after_difficulty` fires together with the canonical
abandonment on any ≥1-step walk-away, including a fetch-then-exit that never
opened the console's step-2 difficulty text — whether such an exit should
count toward `productiveness_difficulty_abandonment_count` is a D2-family
scoring-pass question; (2) a single unqualified exit after ≥1 step closes the
decision one-shot (legacy semantics) — there is no side-repair return window
analogous to the Systems Repair Q24/Q25 abandon/return pair
(`side_repair_returned` stays an unapproved candidate), so an
interruption-driven accidental exit becomes an irreversible abandonment
record.

**FABLE-NEXT-06 presentation (2026-07-19)**: participant interactions
run through the shared visual choice-card panel (mouse + keyboard;
numeric keys retained as hidden dev/test shortcuts) - card panel + Side Bay current-step side panel.
Contract: `docs/game/UI-PRESENTATION-CONTRACT.md`. No event, payload,
mapping, scoring or task-state change.

## Anti-leakage note

No productiveness/Grit-S/Goal-Time item wording (Q07, Q16, Q20, Q29, Q32) may
appear in the Utility Bot's dialogue or option labels. Legacy labels kept
("Ignore the optional repair and move on", "Log the repair for later in the
cycle") and the new step labels ("Start the stabiliser repair.", "Collect the
replacement stabiliser part.", "Adjust the misaligned mounting and seat the
part.", "Run the system check.") stay in-fiction — keep this register.

## NEXT-08 presentation (fetch-fit-check tracker)

FABLE-NEXT-08 made the accepted repair's progress visible (§6.3;
presentation only — offer gating, step events with metadata.step, defer
semantics, walk-away detection and one-shot closure are unchanged,
verified by the parity spec): the work-console stages render a
step-tracker strip of three inert tiles whose labels reuse the side
panel's exact step strings (shared constant) and whose
glyph-differentiated pending/current/done states mirror
`stepsCompleted`; the stabiliser-part icon appears on the fit tile
exactly while the part is carried; the step-act option card (fit/check)
carries the current-step glyph; the parts shelf's collect option
carries the part icon. The offer stage (ignore/accept/defer — the
Q07/Q29 voluntary-effort decision) and every defer option stay plain
cards.
