# playwright-smoke-plan.md

Planned Playwright verification for Remote Outpost Assessment, per V3 Section 9
and `.claude/skills/playwright-game-verify/SKILL.md`. **No Playwright tests
exist yet** (confirmed in Beat 0 — no `tests/`, `e2e/`, or `playwright/`
directory in the repo, no `test` script in `package.json`). This document plans
the suite; it does not add tooling or run browser automation in this beat.

## Principle

`npm.cmd run build` and `npm.cmd run lint:tsc` passing is **necessary, not
sufficient**. Every room/system "done" claim needs an actual browser
observation behind it — this plan exists to make that observation repeatable.

## Code gates (run before any browser check)

- `npm.cmd run build`
- `npm.cmd run lint:tsc`
- `npm.cmd run lint` (when practical)

## Runtime checks (every spec should confirm these, not just its own room)

- Game loads without a blank screen or fatal error.
- No fatal console errors during load or the interaction path under test.
- `window.researchRuntime` exists (dev-mode only, `import.meta.env.DEV`).

## `window.researchRuntime` debug API checks

Each method exercised individually, not just checked for existence:

- `printSummary()` — runs, returns a `GameSummaryVariables`-shaped object with
  sensible values for the driven path.
- `completeDebugSession()` — runs, returns `{ summary, returnUrl }`; confirms
  `returnUrl` is `null` when no `return_url` launch param was set, and a valid
  URL with summary variables appended when it was set.
- `getEvents()` — returns the full raw event array for the session, unfiltered.
- `printEvents()` — runs without throwing; returns the same array as
  `getEvents()`.
- `exportEventsJSON()` — returns valid, parseable JSON matching `getEvents()`.

## Qualtrics launch-parameter checks

Launch with `?participant_id=...&game_session_id=...&condition=...&return_url=...&game_version=...`
and confirm:

- All five params are reflected in `SessionState.getMetadata()` /
  `QualtricsBridge.getLaunchParams()` (observable via
  `window.researchRuntime.getSummary()`'s `participant_id`/`game_session_id`/
  `condition`/`game_version` fields).
- Launching **without** these params falls back to generated IDs
  (`SessionState`'s `createFallbackId`) rather than crashing.
- `completeDebugSession()`'s `returnUrl` correctly appends summary variables
  onto the provided `return_url` without altering existing query params on it.

## Event logging checks (per room, once each room's canonical events land)

For each room, drive the room's documented task flow
(`docs/game/rooms/<room>.md` §"Task flow") and confirm via
`getEvents()`/`printEvents()`:

- The expected event names appear (cross-checked against
  `docs/research/event-schema.md`'s alias table for that room — use current
  prototype names until a room is migrated, canonical names after).
- Each event carries correct `room_id` and (once implemented) `task_id`.
- Repeat-failure paths log the `_repeated` variant, not a duplicate of the
  first-failure event (Archive, Repair).
- Completion paths log the room's completion event exactly once per session
  (one-shot guards, e.g. `markEngineerReportSubmitted`, should prevent
  duplicate logging on repeated interaction).

## Final summary / return_url checks

- After driving a full adaptive-style playthrough (per
  `docs/mps_vertical_slice.md`'s adaptive protocol as a current-prototype
  baseline), `printSummary()` shows elevated persistence-family fields, nonzero
  `strategy_revision_count`, `manual_or_feedback_used = true`, and
  `objective_completed = true`; `blind_retry_count` and
  `game_inappropriate_persistence` stay low/zero.
- After driving a maladaptive-style playthrough, the inverse pattern holds
  (elevated `blind_retry_count`/`game_inappropriate_persistence`, no
  `objective_completed`).
- Raw event log is never shorter after `completeDebugSession()` than before it
  (append-only confirmation — see `docs/research/event-schema.md` §3).
- `completeDebugSession()`'s returned summary and the return URL's query
  params match `printSummary()`'s output for the same session state.

## Planned spec files (V3 Section 9 list)

| Spec file                                | Covers                                                                  | Status      |
| ---------------------------------------- | ----------------------------------------------------------------------- | ----------- |
| `launch_with_research_params.spec.ts`    | Qualtrics launch-parameter parsing (Dock room context)                  | Not created |
| `movement_and_first_interaction.spec.ts` | Baseline movement + first interaction (Dock room)                       | Not created |
| `archive_room_logging.spec.ts`           | Archive Room event logging, repeat-wrong-code handling                  | Not created |
| `repair_room_logging.spec.ts`            | Systems Repair event logging, repeat-failed-sequence handling           | Not created |
| `engineer_hub_logging.spec.ts`           | Engineer Hub report-submission logging (prepared/unprepared/supervised) | Not created |
| `inventory_prep_logging.spec.ts`         | Inventory/Prep shortcut/systematic/cleanup paths                        | Not created |
| `hazard_control_logging.spec.ts`         | Hazard Control check/continue/avoid paths                               | Not created |
| `final_core_summary.spec.ts`             | Final Core completion paths, `completeDebugSession()`, return URL       | Not created |

Not named explicitly in V3 Section 9 but needed for full room coverage —
recommend adding when those rooms are implemented/migrated:

| Spec file (proposed)                    | Covers                                                         |
| --------------------------------------- | -------------------------------------------------------------- |
| `optional_side_repair_logging.spec.ts`  | Optional Side Repair accept/start/abandon/defer/complete paths |
| `interruption_corridor_logging.spec.ts` | Interruption Corridor switch/return/ignore paths               |

## Sequencing

Specs are created **one at a time, aligned to the room-builder beat that
implements or refines that room** — not all eight in one uncontrolled batch
(consistent with `playwright-game-verify`'s scoping and the project's
one-room-at-a-time discipline). `launch_with_research_params.spec.ts` and
`movement_and_first_interaction.spec.ts` are reasonable first specs since they
cover cross-cutting Dock/launch behaviour rather than a single construct room.

## Manual test checklist alignment

Each room doc under `docs/game/rooms/*.md` states its own "Playwright
verification targets" and implicit done test — a spec for that room should
exercise exactly that done test, not a looser stand-in. Do not mark a room
"verified" based on a spec that only checks the debug API exists without
driving the room's actual behavioural path.

## Out of scope for this document

Actually creating spec files, installing/upgrading Playwright tooling
(`@playwright/mcp` is already present in `package.json` devDependencies as of
this beat), running browser automation, or launching the dev server. This is a
plan only.
