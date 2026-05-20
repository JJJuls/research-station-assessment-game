# MPS Vertical-Slice Prototype

## Purpose

This prototype is a short browser-based research slice for testing behavioural persistence signals in a controlled research-station scenario. It is not intended to be a full game or final assessment. The current goal is to verify that player choices can emit structured raw events, derive interpretable summary variables, and support later Qualtrics-based study flow.

## MPS Dimensions Represented

The slice represents three persistence dimensions:

- Persistence despite difficulty: adaptive continuation after failed or blocked task progress.
- Persistence despite uncertainty/fear: informed continuation after checking hazard information.
- Inappropriate persistence: blind repetition or reckless continuation when better information or strategy change is available.

## Station Overview

Archive Terminal: tests response to a blocked access task. Players can enter a wrong code, review feedback, then revise the query successfully.

Repair Panel: tests response to a failed repair sequence. Players can run a default repair, review the manual, then apply a revised repair successfully.

Hazard Warning: tests response to uncertainty. Players can inspect hazard details, continue after becoming informed, or avoid the route.

## Event Types By Station

Archive Terminal emits:

- `archive_attempt`
- `archive_wrong_code`
- `archive_same_wrong_code_repeated`
- `archive_feedback_used`
- `archive_strategy_revision`
- `archive_completed`
- `objective_completed` when Archive and Repair objectives are both completed

Repair Panel emits:

- `repair_attempt`
- `repair_failed`
- `repair_same_sequence_repeated`
- `repair_manual_used`
- `repair_strategy_revision`
- `repair_completed`
- `objective_completed` when Archive and Repair objectives are both completed

Hazard Warning emits:

- `hazard_warning_seen`
- `hazard_info_checked`
- `hazard_reckless_continue`
- `hazard_informed_continue`
- `hazard_avoidance`

## Event-To-Score Mapping

`blind_retry_count` =
`archive_same_wrong_code_repeated` + `repair_same_sequence_repeated` + `hazard_reckless_continue`

`strategy_revision_count` =
`archive_strategy_revision` + `repair_strategy_revision` + `hazard_info_checked`

`abandonment_count` =
`hazard_avoidance`

`manual_or_feedback_used` =
`archive_feedback_used` OR `repair_manual_used`

`objective_completed` =
`objective_completed` event OR completed runtime input

`game_difficulty_persistence` =
`archive_feedback_used` + `archive_strategy_revision` + `archive_completed` + `repair_manual_used` + `repair_strategy_revision` + `repair_completed`

`game_uncertainty_persistence` =
`hazard_info_checked` + `hazard_informed_continue`

`game_inappropriate_persistence` =
`blind_retry_count`

`failure_adaptation_index` =
(`strategy_revision_count` + `manual_or_feedback_used` + `archive_completed` + `repair_completed` + `hazard_informed_continue`) - (`blind_retry_count` + `abandonment_count`)

`game_persistence_total` =
`game_difficulty_persistence` + `game_uncertainty_persistence` + max(`failure_adaptation_index`, 0) - `game_inappropriate_persistence`, clamped to minimum `0`

`elapsed_seconds` =
seconds between session start and summary generation.

## Adaptive Test Protocol

Archive Terminal:

1. `SPACE` -> `1`
2. `SPACE` -> `2`
3. `SPACE` -> `3`

Repair Panel:

1. `SPACE` -> `1`
2. `SPACE` -> `2`
3. `SPACE` -> `3`

Hazard Warning:

1. `SPACE` -> `1`
2. `SPACE` -> `2`

## Expected Adaptive Summary Pattern

The adaptive path should produce elevated `game_difficulty_persistence`, elevated `game_uncertainty_persistence`, positive `failure_adaptation_index`, nonzero `strategy_revision_count`, `manual_or_feedback_used = true`, and `objective_completed = true`.

`blind_retry_count`, `abandonment_count`, and `game_inappropriate_persistence` should remain low or zero.

## Maladaptive Test Protocol

Archive Terminal:

1. `SPACE` -> `1`
2. `SPACE` -> `1`

Repair Panel:

1. `SPACE` -> `1`
2. `SPACE` -> `1`

Hazard Warning:

1. `SPACE` -> `2`

## Expected Maladaptive Summary Pattern

The maladaptive path should produce higher `blind_retry_count` and `game_inappropriate_persistence`, lower adaptive persistence scores, no manual or feedback use, and no objective completion.

`failure_adaptation_index` may be zero or negative because blind retries and reckless continuation are penalized.

## Known Limitations

- Placeholder graphics.
- Keyboard-only choice input.
- Simple prototype scoring.
- Not yet full game-length measurement.
- No Qualtrics production deployment yet.
