# Room Acceptance-Test Template

How to verify one room (station/task/transition) to "done" standard in this
repository. Derived from the verified Wave 1 + Sprint A practice (28/28 and
36-test suites, zero-retry under SwiftShader). Follow this exactly; every
step exists because its absence produced a real failure at least once.

## Preconditions

1. Room doc exists under `docs/game/rooms/`.
2. Canonical event names pulled from V3 §4/5 + `docs/research/event-schema.md`
   — never invented, never renamed.
3. Scoring inputs confirmed via `docs/research/scoring-plan.md`.
4. Geometry facts confirmed against
   `docs/architecture/transition-inventory.json` (spawns, door coords, size).
5. `npm.cmd run lint:tsc` and `npm.cmd run build` pass BEFORE writing tests
   (a broken build produces misleading Playwright timeouts).

## Spec skeleton (`e2e/<room>_logging.spec.ts`)

- Config is already correct (`playwright.config.ts`): serial, 1 worker,
  SwiftShader launch args (do NOT remove — the first WebGL context of every
  fresh headless Chromium fails otherwise), `reuseExistingServer`.
- Boot each test directly with `bootJourney(page, params, '<sceneKey>')`
  using a `?scene=<routeParam>` launch — room-isolation specs may use direct
  launches; connected-journey specs must NOT.
- Install `captureErrors(page)` BEFORE the first `goto`; end every test with
  `expectNoRuntimeErrors(capture)`.
- Give each test a UNIQUE `game_session_id` — session stores are
  module-scoped and survive scene restarts within one page load, and the
  event log is append-only per page.

## Mandatory assertions per room

1. **Entry event** once per entry (name from transition-inventory.json;
   some are once-per-session, e.g. `side_repair_discovered` — check).
2. **Prompt options**: numbered 1-9 in the author's declared order. Assert
   text ONLY against frozen labels in the room doc; never paraphrase and
   never assert validated Q01-Q33 wording.
3. **Every option path**: canonical event(s) + any required legacy event(s),
   with exact `study_item_ids`/`construct_id` from the schema (empty pins
   like D1's `hazard_route_avoided: []` are deliberate — assert them).
4. **Mission-state writes** via `missionState(page)` after each branch
   (field values from `docs/architecture/CROSS-ROOM-INTEGRATION.md` §1).
5. **Re-entry semantics**: exit + re-enter; assert what reopens vs what is
   gated (per-session one-shot flags list:
   `docs/architecture/STATE-AND-SESSION-CONTINUITY.md`).
6. **Exit door** works from the post-interaction position (use the
   position-independent `stationToHubJourney` legs, not bespoke routes).
7. **Metadata**: `expectSessionMetadata(events, …)` over ALL events.
8. **Append-only**: event count never decreases; no in-place mutation.

## Input choreography rules (all verified, all load-independent)

- Movement = held keys: `hold(page, 'ArrowX', ms)` ≥150 ms — `JustDown`
  misses taps.
- Wall-clamp rule: clamp legs (into a wall/corner) may overshoot freely and
  are position- and load-independent; ONLY the final short leg is timed.
- In-room primary alcove from entry spawn: `openStationAlcove` (Up 900 +
  Space) — verified for all eight stations.
- Interaction radius is 72 px; prompts suppressed while intro text types —
  wait ~2200 ms after boot (built into `bootJourney`).

## Runtime verification protocol

1. Run ONLY the new spec while iterating:
   `npx playwright test e2e/<room>_logging.spec.ts` (single-word `--grep`
   patterns only — spaces break Windows cmd quoting through the RTK hook).
2. No screenshots unless diagnosing a failure.
3. On unexplained boot timeouts, read the Vite client error stream before
   blaming the test.
4. When green: run the FULL suite once, record counts + runtime.
5. Write the evidence doc under `docs/testing/<room>-verification/` —
   session design, results, defects (game vs spec), user-owned observations.

## Done claim requires

tsc PASS + build PASS + room spec PASS + full suite PASS + evidence doc +
room doc updated + `docs/expansion/ACTIVE-EXPANSION-STATE.md` entry — then
STOP and wait for approval before the next room (CLAUDE.md rule).
