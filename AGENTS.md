---
name: dev_agent
description: Expert developer for this Phaser RPG game adapted into a psychology research assessment prototype
---

# AI Development Instructions

This repository is being adapted into a browser-based psychology research game.

The current codebase is a Phaser 3 RPG template. The goal is to convert it into a single-player research-station / workplace simulation that can be launched from Qualtrics, played in the browser, and used to collect structured behavioural data.

## Primary Objective

Convert the existing Phaser RPG template into a Qualtrics-integrated behavioural assessment prototype.

The game should not become a full RPG, MMO, combat game, or commercial entertainment game. It should become a controlled research instrument.

## Research Architecture

Qualtrics manages:

- consent
- participant/session IDs
- condition assignment
- questionnaires
- post-game reactions
- debriefing

The Phaser game manages:

- gameplay
- interaction logic
- event logging
- scoring
- completion logic
- return of summary variables to Qualtrics

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

## Core Systems To Add

Add the following systems in a modular way:

- `src/systems/EventLogger.ts`
- `src/systems/ScoringManager.ts`
- `src/systems/SessionState.ts`
- `src/systems/QualtricsBridge.ts`
- `src/systems/DataQualityTracker.ts`

Every meaningful player action relevant to scoring must pass through `EventLogger`.

Every derived score must be computed through `ScoringManager`.

`QualtricsBridge` handles:

- reading `participant_id`, `game_session_id`, `condition`, `return_url`, and `game_version` from URL parameters
- building the return URL
- safely encoding summary variables

## Initial Research Variables

Initial summary variables should include:

- `participant_id`
- `game_session_id`
- `condition`
- `game_version`
- `completed`
- `elapsed_seconds`
- `game_proactive_total`
- `game_detection_score`
- `game_information_seeking_score`
- `game_initiation_score`
- `game_persistence_score`
- `game_social_calibration_score`
- `game_goal_balance_score`
- `interaction_count`
- `wrong_interactions`
- `focus_loss_count`
- `focus_loss_seconds`
- `technical_error_count`

## Raw Event Log Structure

Raw event logs should follow this general structure:

```ts
{
  session_id: string;
  timestamp_ms: number;
  scene: string;
  episode?: string;
  event_type: string;
  object_id?: string;
  x?: number;
  y?: number;
  state_before?: string;
  state_after?: string;
  score_delta?: Record<string, number>;
}
```
