---
name: qualtrics-logging-review
description: Use when reviewing or modifying EventLogger, ResearchRuntime, ScoringManager, DataQualityTracker, SessionState, QualtricsBridge, participant/session metadata, summary variables, or Qualtrics return_url handling in Remote Outpost Assessment. Trigger this for any change or review touching event payloads, the debug/runtime API (window.researchRuntime), launch-parameter parsing, or how summary scores get handed back to Qualtrics  -  even if the user just says "check the logging" or "does this event get captured". This is the data-integrity gate: it exists to make sure raw logs stay exportable and summary scores never overwrite them.
---

# Qualtrics Logging Review

You review (and, when asked, help fix) the research data pipeline: event logging,
session/runtime state, scoring, data quality tracking, and the Qualtrics
launch/return contract. Ground every review in Section 3 (Overarching Systems),
Section 6 (Scoring Contract), and Section 9 (Testing Contract) of
`docs/ai/fable-claude-final-game-build-contract-v3.txt`.

## Why this matters

This game only has research value if its data is trustworthy and exportable. The
single most damaging failure mode is silent: a summary/scoring step that
overwrites or discards raw events, a missing payload field that breaks
downstream analysis, or a Qualtrics return that ships a plausible-looking but
wrong summary variable. This skill's job is to catch that class of bug before it
reaches a pilot participant.

## Required checks

1. **Raw event payload completeness.** Every logged event should be able to carry
   the full payload from Section 3.2: `session_id`, `participant_id`,
   `game_session_id`, `condition`, `game_version`, `timestamp_ms`,
   `elapsed_seconds`, `room_id`, `task_id`, `study_item_ids`, `construct_id`,
   `event_type`, `object_id`, `choice_value`, `attempt_number`, `previous_state`,
   `new_state`, `success`, `x`, `y`, `metadata`. Flag any event missing fields it
   should reasonably have.
2. **Raw logs are never overwritten by summaries.** Trace how ScoringManager and
   QualtricsBridge consume EventLogger's output. Confirm summary/derived variables
   are computed _from_ raw events into a separate structure, and that no code path
   mutates or discards the raw event list when producing summaries or the
   Qualtrics return payload.
3. **Debug/runtime API is intact.** In dev/debug mode, `window.researchRuntime`
   must expose `printSummary()`, `completeDebugSession()`, `getEvents()`,
   `printEvents()`, and `exportEventsJSON()`. Check these still work after any
   change to ResearchRuntime.
4. **Qualtrics launch/return parameters.** Confirm the game correctly parses
   `participant_id`, `game_session_id`, `condition`, `return_url`, and
   `game_version` on launch, and that the return flow prepares/previews summary
   variables without overwriting raw logs (Section 3.4).
5. **Scoring contract compliance.** Cross-check ScoringManager output against
   Section 6's required subindices list and composite examples
   (`failure_adaptation_index`, `game_inappropriate_persistence`, etc.). Confirm
   optional/exploratory proxies (Goal-Time, Consistency of Interest) are labelled
   as such in the output, not presented as validated scores.
6. **DataQualityTracker coverage.** Check that data-quality signals (e.g. idle
   time, control errors, baseline navigation latency from the Dock) are captured
   and available as covariates, not silently dropped.
7. **SessionState persistence.** Confirm the required persistent state fields from
   Section 3.1 (`current_room_id`, `completed_rooms`, `active_objectives`,
   `unresolved_objectives`, `accepted_duties`, `skipped_duties`,
   `prepared_items`, `workspace_status`, `hazard_status`, `side_repair_status`,
   `interruption_status`, `final_core_status`) are present and updated by the
   relevant rooms.

## Forbidden

- Do not compute or ship a single global "good player" / personality score.
- Do not let any summary-generation code path delete, truncate, or mutate the raw
  event log - summaries must be derived, additive views.
- Do not remove or stub out `window.researchRuntime` debug methods to "clean up"
  production code without an explicit, separate dev/prod gating decision approved
  by the user.
- Do not silently change event names or payload field names that other rooms or
  Playwright tests already depend on - treat renames as breaking changes requiring
  explicit callout.
- Do not modify `package.json`.
- Do not push to GitHub or create a PR as part of a review.

## Expected output format

Produce a review report with:

1. **Scope** - which systems/files were reviewed or changed.
2. **Payload/field check** - any missing or inconsistent event payload fields.
3. **Raw-vs-summary integrity** - explicit confirmation (or list of violations)
   that raw logs are not overwritten by summary/scoring/Qualtrics-return code.
4. **Debug API status** - pass/fail for each of the five `window.researchRuntime`
   methods.
5. **Qualtrics parameter handling** - confirmation of launch parsing and
   return/preview behavior.
6. **Scoring contract compliance** - subindices present/missing, and any
   improperly-labelled or collapsed scores found.
7. **Issues found** - ranked by severity, each with file/line reference where
   possible.
8. **Recommended fixes** - concrete, minimal changes; hand off actual
   implementation to `room-builder` or the relevant system owner if the fix is
   nontrivial.
