---
name: playwright-game-verify
description: Use when verifying actual browser/runtime behaviour of Remote Outpost Assessment  -  movement, room transitions, NPC/terminal interactions, event logging, the window.researchRuntime debug API, summary output, or Qualtrics launch-parameter handling. Trigger this any time the user wants to confirm something "actually works" in the game, asks to write or run a Playwright test, or after a room/system change is claimed done  -  a passing TypeScript build is not evidence the game works, only a browser run is.
---

# Playwright Game Verify

You verify runtime behaviour in a real browser, not just that the code compiles.
Ground this in Section 9 (Testing Contract) of
`docs/ai/fable-claude-final-game-build-contract-v3.txt`. `npm.cmd run build` and
`npm.cmd run lint:tsc` passing tells you the TypeScript is valid - it tells you
nothing about whether movement works, whether an event actually fires, or whether
a room transition leaves state consistent. That gap is what this skill closes.

## Why runtime verification, not just build success

A research instrument's correctness lives in behaviour: does the participant's
click actually log the right event with the right payload, does completing a room
actually update mission state, does the debug API actually expose what a
researcher needs to inspect a session. None of that is visible to `tsc`. Every
"done" claim for a room or system should be backed by an actual browser
observation, not just a green build.

## Required checks

1. **Code gates pass first** (fast, cheap, catch obvious breakage before spending
   browser time):
   - `npm.cmd run build`
   - `npm.cmd run lint:tsc`
   - `npm.cmd run lint` when practical
2. **Runtime smoke checks** - with `npm.cmd run start` (or the dev server already
   running), in a real browser:
   - Game loads without a blank screen or fatal error.
   - No fatal console errors during load or the interaction path being tested.
   - `window.researchRuntime` exists.
   - `window.researchRuntime.printSummary()` runs and returns sensible output.
   - `window.researchRuntime.printEvents()` runs and shows logged events.
   - `window.researchRuntime.exportEventsJSON()` runs and returns well-formed JSON.
3. **Behavioural path being tested** - drive the actual flow (movement,
   interaction, room transition, task completion) and confirm the expected events
   appear via `getEvents()`/`printEvents()`, with correct `room_id`, `task_id`,
   `event_type`, and other payload fields for that path - not just that "an event"
   fired.
4. **Qualtrics launch parameters** - when relevant, launch the game with
   `participant_id`, `game_session_id`, `condition`, `return_url`, and
   `game_version` query parameters and confirm they're parsed and reflected in
   session state/events.
5. **Playwright spec coverage** - **enumerate the actual suite first** (glob
   `e2e/*.spec.ts`); do not work from a remembered or hard-coded filename list. The
   suite has grown well past the contract's original eight per-room specs and now
   also covers connected-world flow, participant journeys, session lifecycle,
   viewport/display and adversarial paths. Find the spec(s) that actually cover the
   room/flow in question and verify against those; write a new one only when
   coverage is genuinely absent (one per room/flow, not all at once unless asked).
6. **Refined mechanics are verified as opportunity -> choice -> process ->
   outcome** - when a mechanic implements an approved behavioural rationale from
   `docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md`, verify all four:
   that the **opportunity** was presented and functionally accessible; that the
   **choice** the participant made was recorded (including, for a goal-horizon
   choice, that the initial choice is logged **before** any interruption); that the
   **process order** is preserved in the event sequence (failure -> feedback ->
   revision -> return -> completion); and that the **outcome** is logged. A single
   event firing is not verification of a mechanic.
7. **Expected event names come from the approved schema only** - check observed
   events against `docs/research/event-schema.md`. Event names appearing only in a
   design document (including the measurement specification) are **candidates**:
   never assert one as a required canonical event, and never report its absence as
   a failure, unless it has been approved into the event schema.
8. **Done test alignment** - confirm the room's stated done test (from its
   `docs/game/rooms/*.md` doc, per `room-builder`) is actually what gets checked,
   not a looser stand-in.

## Forbidden

- Do not report a room or feature as verified based on `npm.cmd run build` /
  `lint:tsc` success alone - that is necessary, not sufficient.
- Do not skip the actual browser/interaction path in favor of only checking that
  the debug API methods exist.
- Do not write or run tests that push to GitHub, create a PR, or otherwise touch
  shared/remote state - this skill is local verification only.
- Do not modify `package.json` to add test tooling without flagging it to the user
  first (adding/changing dependencies is a decision, not a side effect of writing a
  test).
- Do not modify game/room source code to make a test pass unless the failure is
  clearly a test bug - a failing runtime check on real game logic is a finding to
  report, not something to quietly patch around.
- Do not turn a candidate event into a required canonical event by asserting it in
  a spec. A test that requires an unapproved name silently promotes it into the
  schema; that promotion is a research-owner decision
  (`docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`).

## Expected output format

1. **Scope** - what room/flow/system is being verified, and why (new room, review,
   regression check).
2. **Code gate results** - build/tsc/lint pass-fail.
3. **Runtime smoke results** - load status, console errors, and pass/fail for each
   of the five `window.researchRuntime` methods.
4. **Behavioural path results** - the interaction sequence driven, and the actual
   events observed (names + key payload fields) versus expected.
5. **Qualtrics parameter results** - if tested, launch-parameter parsing outcome.
6. **Playwright spec status** - which spec(s) exist, were created, or are missing,
   and their pass/fail result.
7. **Done test verdict** - explicit pass/fail against the room's stated done test.
8. **Issues found** - anything that didn't behave as expected, with reproduction
   steps.
