---
name: dev_agent
description: Expert developer for this Phaser RPG foundation adapted into a psychology research assessment instrument
---

# AI Development Instructions

This repository is a browser-based psychology research game, built on a Phaser 3
RPG foundation. It is a single-player research-station / workplace simulation
launched from Qualtrics, played in the browser, and used to collect structured
behavioural data.

`CLAUDE.md` governs _how_ to work and carries the domain-specific authority
hierarchy. `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` carries the
approved scientific decisions and the open-decision queue. Read both before
changing anything described here.

## Primary Objective

Keep the game a controlled **research instrument**, not a full RPG, MMO, combat
game, or commercial entertainment game.

## Research Architecture

**Qualtrics** manages:

- consent
- participant/session identifiers
- condition assignment
- questionnaires (the validated Q01-Q33 battery, administered post-game)
- post-game reactions
- debriefing

**The Phaser game** manages:

- gameplay and interaction logic
- raw behavioural event collection
- research state
- approved summary preparation and return to Qualtrics

The 33 validated items stay in Qualtrics as a post-game self-report battery. The
game supplies behavioural analogues for convergent and discriminant analysis —
it never reproduces item wording as disguised questions.

## Tech Stack

- Phaser 3
- TypeScript
- Vite
- phaser-jsx
- localStorage
- Node.js 24

## Commands

| Command            | Description                         |
| ------------------ | ----------------------------------- |
| `npm start`        | Dev server at http://localhost:5173 |
| `npm run build`    | Production build                    |
| `npm run lint`     | ESLint                              |
| `npm run lint:fix` | ESLint auto-fix                     |
| `npm run lint:tsc` | Type check                          |

## Core Systems — these already exist

The research systems are implemented under `src/systems/` and are **not** to be
re-added, re-invented, or replaced. Extend them; never bypass them.

| System                              | Role                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `src/systems/EventLogger.ts`        | Append-only raw event log. Every scoring-relevant action passes through it. |
| `src/systems/ScoringManager.ts`     | Derives every summary variable, read-only, from raw events.                 |
| `src/systems/SessionState.ts`       | Persistent mission/session state across rooms.                              |
| `src/systems/QualtricsBridge.ts`    | Launch-parameter parsing and return-URL/summary preparation.                |
| `src/systems/DataQualityTracker.ts` | Covariates (focus loss, technical errors) kept separate from trait signal.  |
| `src/systems/ResearchRuntime.ts`    | Runtime wiring and the `window.researchRuntime` debug API.                  |

`QualtricsBridge` reads `participant_id`, `game_session_id`, `condition`,
`return_url` and `game_version` from URL parameters, builds the return URL, and
safely encodes summary variables — without ever mutating the raw log.

## Where the schema and the scoring model actually live

This file is **not** a schema. Do not derive event names, payload fields, or
summary variables from it.

| Question                                       | Authoritative source                                            |
| ---------------------------------------------- | --------------------------------------------------------------- |
| Approved event names and payload fields        | `docs/research/event-schema.md`                                 |
| Approved derived variables and formulas        | `docs/research/scoring-plan.md`                                 |
| How a Q-item becomes a gameplay opportunity    | `docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md` |
| Architecture, room structure, build discipline | `docs/ai/fable-claude-final-game-build-contract-v3.txt` (V3)    |
| Approved decisions and the open-decision queue | `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`            |

**Candidate events and candidate derived indicators appearing in design
documents — including the Q01-Q33 measurement specification — are not
automatically production schema.** A candidate becomes canonical only through an
explicit research-owner event-schema or scoring-plan decision.

## Obsolete — do not use

The following material from earlier drafts of this file is **superseded and kept
only so it is recognisable as stale**. It must not be implemented, restored, or
cited as a schema.

**Obsolete initial summary-variable list.** These names do not exist in
`ScoringManager`, trace to no approved scoring plan, and reflect an abandoned
"proactivity" model rather than the current construct subindices:

- `game_proactive_total`
- `game_detection_score`
- `game_information_seeking_score`
- `game_initiation_score`
- `game_persistence_score`
- `game_social_calibration_score`
- `game_goal_balance_score`

The identifier and covariate fields that earlier accompanied that list
(`participant_id`, `game_session_id`, `condition`, `game_version`, `completed`,
`elapsed_seconds`, `interaction_count`, `wrong_interactions`, `focus_loss_count`,
`focus_loss_seconds`, `technical_error_count`) are not obsolete as concepts, but
their approved names and shapes are governed by `docs/research/scoring-plan.md`,
not by this file.

**Obsolete minimal raw-event structure.** An earlier draft showed a small
`{ session_id, timestamp_ms, scene, episode, event_type, object_id, x, y,
state_before, state_after, score_delta }` shape as the governing schema. It is
**not** the governing schema — the canonical `RawGameEvent` payload is defined in
`docs/research/event-schema.md` §1 (which uses `room_id`/`previous_state`/
`new_state` and adds `participant_id`, `task_id`, `study_item_ids`,
`construct_id`, `choice_value`, `attempt_number`, `success`, `metadata`, and
others).

## Non-negotiable research constraints

- No single global "good player" or personality score, ever.
- Adaptive persistence and inappropriate persistence stay separate variables with
  opposite interpretation; higher inappropriate persistence is always worse.
- Raw duration alone is neither persistence nor effort.
- Raw events, process variables and construct subindices stay distinguishable, as
  do opportunity, choice, process, outcome and control variables.
- Never reproduce exact or near-exact questionnaire wording in player-facing text.
- Candidate gameplay indicators are not validated item scores.

## Forbidden RPG progression mechanics

No money, shops, XP, skill levels, combat, stat boosts, or power-ups — and no
mechanic that changes task difficulty across participants. The station is an
assessment environment; progression fantasy would confound every construct it
touches.
