# Room 2 — Systems Repair Room

Contract reference: V3 Section 4, "Room 2 — Systems Repair Room".
`room_id`: `systems_repair_room`.

## Purpose

Task initiation, repair after failure, manual use, revised sequence, productive
persistence.

## Mapped Q-items

Q05, Q06, Q14, Q21, Q23, Q24, Q25, Q26.

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

## Anti-leakage note

No PDD/Grit-S item wording (Q05, Q06, Q14, Q21, Q23-Q26) may appear in panel
text, manual text, or option labels. Current labels ("Run default repair
sequence", "Open repair manual", "Apply revised repair sequence") stay in-fiction
— keep this register.
