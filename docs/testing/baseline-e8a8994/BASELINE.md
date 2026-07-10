# Pre-refactor baseline fixture — commit `e8a8994`

Captured **2026-07-11**, before any Phase A source edit, per the approved V1 slice plan
(Phase 0). Working tree was clean at `e8a8994 feat: add dock baseline events` on branch
`fable-autonomous-game-build-v1`. Every later phase's regression comparison runs against
these files; the baseline is never reconstructed after the refactor begins.

## Contents

| File                              | What it proves                                                                                                                                                                                                                                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build-log.txt`                   | `npm.cmd run build` passes at baseline (exit 0; chunk-size warning only)                                                                                                                                                                                                                                                          |
| `tsc-log.txt`                     | `npm.cmd run lint:tsc` passes at baseline (exit 0)                                                                                                                                                                                                                                                                                |
| `runtime-api.json`                | `window.researchRuntime` = exactly 6 methods; boot event order; raw-event field order; launch params parsed correctly                                                                                                                                                                                                             |
| `events-dock-path.json`           | Scripted Dock path (spawn → walk to Dock Tutorial → SPACE → option 2): 10 events incl. canonical `dock_started`, `movement_instruction_shown`, `first_movement`, `first_interaction` + legacy `dock_tutorial_*`; plus `getSummary()` output                                                                                       |
| `events-archive-adaptive.json`    | Scripted Archive adaptive path (wrong code → feedback → revised query): `archive_attempt, archive_wrong_code, archive_feedback_used, archive_attempt, archive_strategy_revision, archive_completed`; plus summary                                                                                                                 |
| `events-archive-maladaptive.json` | Scripted Archive blind-retry path (wrong code → same wrong code): repeat correctly logs `archive_same_wrong_code_repeated`, **not** a duplicate `archive_wrong_code`; plus summary, `completeDebugSession()` result (full ~60-var Qualtrics return URL), and an append-only check (9 → 10 events, `objective_completed` appended) |
| `station-inventory.md`            | Exact census: 9 research stations + `sign` leftover, with identifiers/room_ids/positions                                                                                                                                                                                                                                          |
| `screenshots/`                    | Browser evidence: spawn, position probes, dock prompt open, dock completed, archive wrong-code state, archive completed, archive maladaptive state                                                                                                                                                                                |

## Key baseline invariants (regression targets)

1. **Debug API surface (6):** `completeDebugSession`, `exportEventsJSON`, `getEvents`, `getSummary`, `printEvents`, `printSummary`.
2. **Raw-event field order:** `session_id, timestamp_ms, scene, event_type, participant_id, game_session_id, condition, game_version, elapsed_seconds, score_delta, study_item_ids, metadata` (+ optional canonical additions on specific events, e.g. `room_id`, `task_id`, `construct_id`, `success`, `x`, `y` on dock/archive canonical events).
3. **Boot sequence:** `session_start → scene_start → dock_started → movement_instruction_shown` (4 events before input).
4. **Persistence separation at baseline (maladaptive path summary):** `game_inappropriate_persistence = 1`, `blind_retry_count = 1`, `strategy_revision_count = 0`, `failure_adaptation_index = -1`, `game_difficulty_persistence = 0`, `manual_or_feedback_used = false` — adaptive and inappropriate variables independent.
5. **Adaptive path summary:** `strategy_revision_count = 1`, `manual_or_feedback_used = true`, `game_difficulty_persistence = 3`, `failure_adaptation_index = 3`, `game_inappropriate_persistence = 0`, `blind_retry_count = 0`. (`objective_completed` remains `false` in both paths' pre-completion summaries — it only becomes true via `completeDebugSession()`/full-mission logic, as seen in the S3 return URL.)
6. **Qualtrics return URL:** `return_url` preserved, summary variables appended as query params (full URL recorded in `events-archive-maladaptive.json` → `debugCompletion.returnUrl`).
7. **Append-only log:** `completeDebugSession()` appends (never rewrites) — event count strictly increases.

## Capture method

Playwright MCP against `npx vite --port 5173` dev server. Movement = held arrow keys
(175 px/s); interactions = held SPACE ≥150 ms (a fast tap can fall between frames and
miss Phaser's `JustDown`); option selection = held 1/2/3. Launch URL carried
`participant_id=BASELINE_P1`, `game_session_id=BASELINE_S{1,2,3}`, `condition=baseline`,
`game_version=e8a8994`, `return_url=https://example.org/return`.

Note: an aborted first attempt at the S2 session opened the Inventory Prep prompt by
mistake; the page was reloaded before capture, so `events-archive-adaptive.json` is from
a clean session. (In-memory log resets on reload.)
