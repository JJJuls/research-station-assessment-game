# Connected-Journey Test Template

How to author a full participant-journey spec (real doors, no mid-session
`?scene=` launches). Derived from the passing A3 smoke + A4 journeys
(`e2e/connected_world_smoke.spec.ts`, `e2e/connected_participant_journeys.spec.ts`).
Reuse `e2e/journey.ts` + `e2e/helpers.ts`; do not fork bespoke navigation.

## Scientific session design (non-negotiable)

- Mutually exclusive experimental branches (Hazard informed/reckless/
  avoided; Engineer duty accept/decline; Interruption switch/return/ignore;
  Final Core quality tiers) go in SEPARATE participant sessions. Mixing
  them contaminates the frozen summary formulas (`blind_retry_count`,
  `game_uncertainty_persistence`, `abandonment_count`) and invalidates the
  evidence. Use the smallest valid set of sessions (A4 used three).
- Never merge adaptive and inappropriate persistence into one variable;
  never assert a global "good player" score.

## Journey skeleton

```ts
const capture = captureErrors(page); // BEFORE goto
await bootJourney(page, params); // dock default
await completeDockTutorial(page, 1 | 2 | 3);
await dockToHubJourney(page);
await hubToStationJourney(page, roomId); // count-aware wait inside
await openStationAlcove(page); // Up 900 + Space
await press(page, '1'); // option choreography
await stationToHubJourney(page, roomId);
// … repeat per station …
await hubToDockJourney(page);
const { summary, returnUrl } = await completeReturnFlow(page); // END only
expectNoRuntimeErrors(capture);
```

## Hard-won rules (each fixed a real failure — do not relearn)

1. **Count-aware waits**: capture `eventCount(...)` BEFORE the triggering
   action, then `waitForEventCount(..., before + 1)`. Reading after the
   action races fast transitions and hangs forever.
2. **Hub navigation** must go through `hubToStationDoor` (NW-anchor
   normalization). Bespoke mid-height clamp routes wedge on the central
   console block and doorway pockets, and undershoot from side-wall return
   spawns.
3. **Dock navigation** uses its own anchor (Up 200 hop clears the crate
   rows); Hub uses Up 400. They are not interchangeable.
4. `completeReturnFlow` appends `objective_completed` — call it exactly
   once, at the very end, or one-shot assertions break.
5. Unique `game_session_id` per test; one page = one session.
6. No `console.log` in specs — pre-commit ESLint rejects it and lint-staged
   reverts the commit.

## Mandatory journey assertions

- `current_room_id` and relevant mission fields at every stage boundary
  (`missionState(page)`); expected values per
  `docs/architecture/CROSS-ROOM-INTEGRATION.md` §1.
- Event ordering as a journey-order subsequence over the raw log
  (`expectEventSubsequence`) — never index-equality (other events
  interleave).
- One-shot protection: `session_start`, `dock_started`,
  `side_repair_discovered`, `objective_completed`, `objective_active`
  exactly once per session.
- `expectSessionMetadata` over all events; return URL preserves the launch
  query and appends the summary.
- Frozen-summary spot checks: assert separation invariants (e.g. informed
  continue ⇒ inappropriate 0) — never recompute or re-derive formulas.
- Zero page/console errors.

## Debugging protocol

- Run only the failing test: `--grep P2` (single-word patterns only on
  Windows; spaces break cmd quoting).
- Don't rerun already-passing journeys while iterating; full suite once at
  the phase boundary.
- A first-test boot timeout with no canvas = renderer issue, not the spec —
  check that the SwiftShader launch args are still in `playwright.config.ts`.
- If an `Edit` on a committed markdown/JSON file fails to match, prettier's
  pre-commit hook reformatted it — re-read first.
- Node debug scripts must live inside the repo (module resolution), and be
  deleted before commit.
