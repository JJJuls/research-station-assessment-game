# Participant Lifecycle Audit (Sprint A, Phase 4)

End-to-end audit of one participant's technical lifecycle, from external
(Qualtrics) launch to return. Static audit of `SessionState`,
`ResearchRuntime`, `QualtricsBridge`, `EventLogger` at `3ee9424`, plus the
runtime coverage map. Scoring formulas were read, not changed.

## 1. Launch → identity

`SessionState` parses `window.location.search` ONCE at construction
(module-singleton `researchRuntime`):

| Param             | Present                                  | Missing/empty                      |
| ----------------- | ---------------------------------------- | ---------------------------------- |
| `participant_id`  | used verbatim                            | `participant-<uuid>` fallback      |
| `game_session_id` | used verbatim                            | `session-<uuid>` fallback          |
| `condition`       | used verbatim                            | `default`                          |
| `game_version`    | used verbatim                            | `VITE_APP_VERSION`, else `unknown` |
| `return_url`      | kept raw in `QualtricsBridge` (nullable) | `null`                             |

No parameter combination can crash boot; every event always carries a
complete identity. `QualtricsBridge` re-parses the URL independently and
keeps nulls (raw launch params), while `SessionState` applies fallbacks —
deliberate split: events never miss metadata, the bridge never invents a
return URL.

## 2. Event pipeline invariants (all verified)

- `session_start` is the first event (guarded by `hasStarted`; reload
  creates a fresh page runtime — the double-`session_start`-per-
  `game_session_id` analysis caveat is the documented A2 observation).
- `logInteraction` spreads caller fields FIRST, session context LAST —
  `session_id`, `timestamp_ms`, `participant_id`, `game_session_id`,
  `condition`, `game_version`, `elapsed_seconds` are authoritative and
  cannot be overridden by any room (fragile point #1 in the conventions
  doc).
- `EventLogger` is append-only; `getSummary` is pure (A2 spec asserts
  both).
- No cross-session state: all stores live in one page's module scope; a
  new page/launch starts empty (A2 reload test).

## 3. Return flow

`completeDebugSession` → `objective_completed` event → `computeSummary`
(completed=true) → `buildReturnUrl(summary)`:

- `return_url` absent/whitespace → `null` (host page decides; no redirect
  is attempted anywhere — the runtime only RETURNS the URL).
- Malformed `return_url` → `try/catch` → `null`, no crash.
- Valid `return_url` → original query preserved, summary variables
  appended via `searchParams.set` (A4 P1 verified live end-to-end).
- Relative `return_url` resolves against the game's own href (defined,
  documented behaviour of `new URL(url, base)`).

## 4. Runtime coverage map (who verifies what)

| Lifecycle stage                                        | Coverage                                         |
| ------------------------------------------------------ | ------------------------------------------------ |
| Full-param Qualtrics launch, metadata on every event   | A4 P1/P2/P3                                      |
| Bare launch (no params) → fallback identity            | `e2e/participant_lifecycle.spec.ts` (this phase) |
| Malformed `return_url` → null, no crash                | `e2e/participant_lifecycle.spec.ts` (this phase) |
| Invalid `?scene=` → dock fallback                      | A2 continuity spec                               |
| Direct `?scene=<room>` launch                          | A2 continuity spec                               |
| Reload → fresh runtime, no stale state                 | A2 continuity spec                               |
| All scene transitions + mission-state writes           | A3 smoke + A4 journeys                           |
| Summary/scoring inputs (frozen formulas, spot-checked) | A4 journeys                                      |
| Return URL construction end-to-end                     | A4 P1                                            |

## 5. Audit result

No metadata loss, duplicate-session creation, event loss, non-append-only
mutation, stale state, or cross-session leakage found. Zero defects. The
only lifecycle observations remain the three A2 user-ruling items
(dock `controlErrorCount` per-visit lifetime; unguarded debug
`objective_completed`; reload double-`session_start` analysis caveat) —
semantics are user-owned, not demonstrated defects.
