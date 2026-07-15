---
name: qualtrics-logging-review
description: Use when reviewing or modifying EventLogger, ResearchRuntime, ScoringManager, DataQualityTracker, SessionState, QualtricsBridge, participant/session metadata, summary variables, or Qualtrics return_url handling in Remote Outpost Assessment. Trigger this for any change or review touching event payloads, the debug/runtime API (window.researchRuntime), launch-parameter parsing, or how summary scores get handed back to Qualtrics  -  even if the user just says "check the logging" or "does this event get captured". This is the data-integrity gate: it exists to make sure raw logs stay exportable and summary scores never overwrite them.
---

# Qualtrics Logging Review

You review (and, when asked, help fix) the research data pipeline: event logging,
session/runtime state, scoring, data quality tracking, and the Qualtrics
launch/return contract.

Ground every review in Section 3 (Overarching Systems), Section 6 (Scoring
Contract), and Section 9 (Testing Contract) of
`docs/ai/fable-claude-final-game-build-contract-v3.txt`, and apply authority by
domain (`CLAUDE.md`):

- **`docs/research/event-schema.md` is canonical for production events** - names
  and payload conventions. Nothing else is.
- **`docs/research/scoring-plan.md` is canonical for formulas** - derived
  variables, weights, reverse-key handling, composites. Nothing else is.
- `docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md` governs the
  behavioural rationale, and **records candidate events and candidate derived
  indicators**. A candidate is a design proposal: **never approve one as a
  production event name or an approved formula without a recorded research-owner
  decision** (`docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`).

**Raw events are immutable source records.** The log is append-only for the life
of the session; summaries are derived, additive views computed from it.

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
   `docs/research/scoring-plan.md` and Section 6's required subindices list and
   composite examples (`failure_adaptation_index`,
   `game_inappropriate_persistence`, etc.). Confirm optional/exploratory proxies
   (Goal-Time, Consistency of Interest) are labelled as such in the output, not
   presented as validated scores.
6. **DataQualityTracker coverage.** Check that data-quality signals (e.g. idle
   time, control errors, baseline navigation latency from the Dock) are captured
   and available as covariates, not silently dropped.
7. **SessionState persistence.** Confirm the required persistent state fields from
   Section 3.1 (`current_room_id`, `completed_rooms`, `active_objectives`,
   `unresolved_objectives`, `accepted_duties`, `skipped_duties`,
   `prepared_items`, `workspace_status`, `hazard_status`, `side_repair_status`,
   `interruption_status`, `final_core_status`) are present and updated by the
   relevant rooms.
8. **Exploratory labels are present for Q18, Q20 and Q29-Q33.** Every variable
   derived from these items must carry an explicit exploratory/weak-proxy label
   wherever it is surfaced - debug summary, Qualtrics return, any researcher-facing
   export - not only in a document. Specifically: Q18's game variable is a **weak
   goal-continuity proxy**, never long-term-focus measurement; Q20 is
   **questionnaire-primary** with **no bespoke validated game score**; Q29-Q33 are
   **exploratory** and never represent literal days, years or lifelong goal
   patterns. Flag a missing or dropped label as a finding.
9. **Q29/Q31 observations are not double counted.** Q29 and Q31 share **one**
   goal-horizon behavioural dimension. Verify that a single horizon choice
   contributes **one** observation, not one per item - in the formula, in the
   surfaced fields, and in any analysis note. A shared choice counted twice is a
   blocking finding.
10. **Q32 is not reversed.** Q32 is **long-term-oriented and is not reverse-scored
    relative to long-term orientation**. Flag any formula, field name, comment or
    doc that treats Q32 as short-term-oriented or reverse-keys it against long-term
    orientation. Q32 warrants at most a very weak extended-goal engagement proxy;
    no distinct validated Q32 game score is approved.
11. **Candidate indicators are not formulas.** A derived indicator that appears
    only in the measurement specification is a **candidate**. Do not approve it,
    implement it, or treat its absence as non-compliance. Say which decision it
    needs - event-schema, scoring-plan, or both - and route it to the research
    owner.

## Forbidden

- Do not compute or ship a single global "good player" / personality score.
- Do not let any summary-generation code path delete, truncate, or mutate the raw
  event log - raw events are immutable source records; summaries must be derived,
  additive views.
- Do not approve a candidate derived indicator as a formula, or a candidate event
  name as canonical, without a recorded research-owner decision - and do not
  resolve an entry in `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`.
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
