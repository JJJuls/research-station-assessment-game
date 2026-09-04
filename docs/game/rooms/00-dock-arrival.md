# Room 0 — Dock / Arrival Bay

Contract reference: V3 Section 4, "Room 0 — Dock / Arrival Bay".
`room_id`: `dock_arrival`.

## Purpose

Tutorial, baseline controls, movement competence, instruction comprehension.
Establishes control-variable/covariate data before any construct task begins —
this room is **not scored as personality**.

## Mapped Q-items

None. Control/usability data only (V3 Section 1 rule 1 explicitly allows this
labelling for the Dock).

## Construct targets

None (control variables): baseline navigation ability, instruction-following,
baseline idle/latency behaviour — used as covariates for later rooms, not as a
construct score.

## Player-facing fiction

The player arrives at the outpost dock. A station AI / arrival terminal greets
them, checks basic movement/interaction competence, and clears them to proceed
into the station.

## Task flow

1. Enter room / dock area.
2. Station AI shows movement/interaction instructions.
3. Player moves toward a highlighted target and performs a first
   SPACE/interaction prompt.
4. Optional help prompt if the player appears idle or confused.
5. Player confirms readiness; tutorial is marked complete (or explicitly
   skipped) and station tasks become available.

## Valid choices/actions

- Skip the tutorial and continue.
- Review the controls and confirm readiness.
- Practice movement briefly, then confirm readiness.

(Current prototype implements these three as a single 3-option prompt at one
station; canonical design implies a more granular movement-then-interact flow
per V3's mini-game mechanics list — see Implementation notes.)

## Canonical events

`dock_started`, `movement_instruction_shown`, `first_movement`,
`first_interaction`, `tutorial_help_shown`, `tutorial_completed`,
`control_error_count`, `baseline_idle_seconds`.

Current-to-canonical alias table: `docs/research/event-schema.md` §4, "Dock /
Arrival Bay."

## Derived variables

`control_competence_flag`, `baseline_navigation_latency`,
`tutorial_completion_time`, `baseline_idle_seconds`,
`baseline_interaction_latency`. All used as covariates for other rooms' scoring,
never as a personality score themselves (V3 Section 4 Room 0 scoring note).

## Scoring notes

Do not score personality here. Treat every derived variable as a covariate/
control variable for later analysis (e.g. adjusting for baseline navigation
speed when interpreting Repair-room task-initiation latency).

## Failure/edge cases

- Player skips tutorial entirely: `control_competence_flag` should reflect
  "unconfirmed," not "failed" — station tasks must remain available regardless.
- Player idles for an extended period before first movement: should surface
  `tutorial_help_shown` and contribute to `baseline_idle_seconds`, not block
  progress.
- Repeated interaction attempts / control errors: should increment
  `control_error_count`, not throw or freeze the tutorial state.

## Playwright verification targets

`launch_with_research_params.spec.ts` (parses `participant_id`,
`game_session_id`, `condition`, `return_url`, `game_version`),
`movement_and_first_interaction.spec.ts` (drives movement + first SPACE
interaction, confirms `first_movement`/`first_interaction`/`tutorial_completed`
events with correct `room_id: "dock_arrival"`).

## Implementation notes

**Implemented as a real room in Phase B of the V1 slice** (`src/scenes/DockScene.ts`,
a `RoomScene` subclass; commit `d211ed8`): arrival spawn → station-AI movement
instruction → highlighted movement marker → first terminal SPACE interaction →
3-option readiness confirm/skip (legacy option set preserved verbatim).
Canonical events `dock_started`, `movement_instruction_shown`, `first_movement`,
`first_interaction` fire once per session (module-level guards that survive
room transitions); `tutorial_completed` fires additively on every completion
path with `metadata.skipped`/`metadata.path`; `control_error_count` fires once
at completion with the aggregate in `metadata.count` (out-of-range SPACE
presses). All events carry `study_item_ids: []` and no `construct_id`.

**Open parameter (blocked, user decision required):** the idle watcher for
`tutorial_help_shown` + `baseline_idle_seconds` is implemented but disabled
(`DOCK_IDLE_HELP_THRESHOLD_MS = null` in DockScene) because no authoritative
document defines the idle threshold or the exact "idle" definition. Supplying
those values is a scientific decision — do not enable autonomously.

The exit door to the Station Hub is sealed until the Hub exists (slice
Phase C). The legacy single-station dock remains reachable via
`?scene=prototype`. Visual-affordance note: ported rooms use the cyan
interactable cue from the visual bible; the prototype scene keeps its original
white-stroke markers during the transition period.

Done test status: _participant can move and interact before construct tasks
begin_ — **passes** (Playwright-verified, evidence in
`docs/testing/slice-evidence/phaseB/`).

**FABLE-NEXT-06 presentation (2026-07-19)**: participant interactions
run through the shared visual choice-card panel (mouse + keyboard;
numeric keys retained as hidden dev/test shortcuts) - card panel (all prompts).
Contract: `docs/game/UI-PRESENTATION-CONTRACT.md`. No event, payload,
mapping, scoring or task-state change.

## Anti-leakage note

No validated questionnaire wording appears in this room's dialogue (it has no
Q-item mapping to leak). Keep it that way — this room's text should stay
control-instruction-only (movement/interaction mechanics), never drifting into
personality-adjacent framing that could bias later rooms.

## V4 visual-validity redesign (2026-09-05) — presentation only

Governing document: `docs/game/VISUAL-SYSTEM-V4.md`. Nothing in this pass
changes an event, a payload, the tutorial options, the marker mechanic
(distance < 40 px), the door target or any coordinate the route specs drive
against: terminal (96, 96), north door (368, 48), arrival spawn (384, 352),
return spawn (384, 128). The one moved element is the movement marker:
(544, 160) → (544, 224), so the ring named by the first instruction is
inside the 640×360 arrival view (at (544, 160) it sat above the top edge);
control-room tutorial geometry, no measured construct.

- **Camera.** The world renders at the fixed integer zoom through the
  bounded following camera (640×360 world pixels visible); the bay extends
  beyond the viewport and the avatar is ≈96 canvas px tall.
- **Layout.** The bay is read left to right: the Arrival Terminal in a
  shallow west-wall kiosk (column 1 rows 2–4 wall; column 2 stays clear
  for the 32 px body centred on x = 96), the north airlock on a painted
  two-tile circulation spine from the arrival airlock across the landing
  pad, a grouped cargo stack on the north-east wall cells, a service rail
  (locker, cart) on the east wall cells. Every prop that could block
  movement stands on a wall cell; decor on open floor is flat.
- **Door.** The north exit uses the station's one interior door family
  (`plv1-arch-door` leaf + cyan threshold) with the legacy airlock prop as
  fallback; the arrival airlock behind the spawn is the iris strip's closed
  leaf.
- **Marker.** The highlighted movement target is a cyan floor ring with a
  restrained pulse (held under reduced motion) that settles and is removed
  once reached; the "Move here" label is gone and the reach message rides
  the transient feedback banner.
- **Motion.** Pad edge lights are static; no ambient tweens remain.
- **Opening.** The arrival sequence (`PilotOpeningScene`) is an in-engine
  establishing shot (station modules, tower, damaged mast, pad, static
  storm aftermath, slow push-in of the picture; static under reduced
  motion) of ≈8.2 s with a visible skip line; the skip press is ignored by
  the Dock's interact keys for 300 ms after control returns.
- **Objective line.** Refreshed on overlay RESUME as in every room.
