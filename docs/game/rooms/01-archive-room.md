# Room 1 — Archive Room

Contract reference: V3 Section 4, "Room 1 — Archive Room".
`room_id`: `archive_room`.

## Purpose

Response to setback, feedback use, revision after failure, blind repetition.

## Mapped Q-items

Q13, Q22, Q23, Q24, Q25, Q26.

## Construct targets

Perseverance of Effort, Persistence Despite Difficulty, adaptive persistence,
inappropriate persistence, productiveness after failure. Adaptive persistence
(Q13, Q22-Q25) and inappropriate persistence (Q26) must stay in separate derived
variables per `docs/research/MASTER_33_ALIGNMENT.md`.

## Player-facing fiction

An Archive AI guards an access log/code the player needs. Log shelves and data
panels are available for context. The player's first/naive attempt fails; the
terminal shows feedback.

## Task flow

1. Enter Archive Room, open archive terminal.
2. Player attempts a code/query — the naive first attempt fails.
3. Feedback panel is shown.
4. Player may: inspect logs/compare, read feedback, revise the query, repeat the
   same wrong response, leave, or return later.
5. Completion flag sent to mission checklist when a revised query succeeds.

## Valid choices/actions

- Enter access code (may repeat an already-failed code).
- Read terminal feedback.
- Try a revised archive query (success path).

(Current prototype implements exactly these three at one station; canonical
design also allows log comparison and leave/return-later branches — see
Implementation notes.)

## Canonical events

`archive_room_entered`, `archive_terminal_opened`, `archive_code_entered`,
`archive_wrong_code`, `archive_feedback_shown`, `archive_feedback_used`,
`archive_log_compared`, `archive_strategy_revision`,
`archive_same_wrong_code_repeated`, `archive_abandoned`,
`archive_returned_after_failure`, `archive_completed`.

Current-to-canonical alias table: `docs/research/event-schema.md` §4, "Archive
Room" — this room has the strongest current alignment (5 exact matches:
`archive_wrong_code`, `archive_same_wrong_code_repeated`,
`archive_feedback_used`, `archive_strategy_revision`, `archive_completed`).

## Derived variables

`post_failure_reengagement`, `adaptive_persistence_count`, `blind_retry_count`,
`strategy_revision_count`, `archive_completion_flag`,
`abandonment_after_failure_count`, `game_inappropriate_persistence_component`.

## Scoring notes

Feedback must be understandable — this measures response to setback, not hidden
puzzle ability or reading difficulty (V3 validity caution). Repeating the
identical wrong code contributes to `blind_retry_count`/inappropriate
persistence; revising the query contributes to adaptive persistence. These two
must never merge into one variable (see `scoring-plan.md` §4).

## Failure/edge cases

- Player repeats the exact same wrong code: must log
  `archive_same_wrong_code_repeated`, not a second `archive_wrong_code` —
  current implementation already does this correctly (`didRepeat` check in
  `Main.tsx`).
- Player never revises and leaves without completing: should log
  `archive_abandoned` (currently missing — no event fires on leaving without
  completion).
- Player leaves after failure and comes back later: should log
  `archive_returned_after_failure` (currently missing).

## Playwright verification targets

`archive_room_logging.spec.ts` — drive wrong-code entry, feedback read, revised
query; confirm `archive_wrong_code`, `archive_feedback_used`,
`archive_strategy_revision`, `archive_completed` all appear via
`getEvents()`/`printEvents()` with `room_id: "archive_room"`. Also drive the
repeat-wrong-code path and confirm `archive_same_wrong_code_repeated` fires
instead of a duplicate `archive_wrong_code`.

## Implementation notes

Contract status: "already partly implemented in the prototype. Fable must audit
before rewriting" — confirmed true in Beat 0. Preserve the existing
wrong-code/feedback/revision logic; the missing pieces are
`archive_room_entered`, `archive_terminal_opened`, `archive_feedback_shown`
(distinct from `_used`), `archive_log_compared`, `archive_abandoned`, and
`archive_returned_after_failure` — additive event logging, not a rewrite.

## Anti-leakage note

No Grit-S/BFI item wording (Q13, Q22-Q26) may appear in terminal text, feedback
messages, or option labels. Current option labels ("Enter access code A17",
"Read terminal feedback", "Try revised archive query") are in-fiction and do not
leak item wording — keep any future text in this same register.
