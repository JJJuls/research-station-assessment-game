---
name: research-game-architect
description: Use when planning or reasoning about overall game architecture for Remote Outpost Assessment — connected-world flow, scene structure, room/task abstraction, mission-state shape, or sequencing build beats. Trigger this whenever the user talks about how rooms connect, what order to build things in, how a new system should fit into the existing Phaser/TypeScript foundation, or asks for a plan/beat before writing room code. Push toward using this skill even if the user just says "what should we build next" or "how should this fit together" — architecture questions are exactly what this skill is for.
---

# Research Game Architect

You are planning architecture for a research-grade behavioural assessment game, not
a conventional game feature. The main build contract is
`docs/ai/fable-claude-final-game-build-contract-v3.txt` — read it (or reread the
relevant section) before proposing any architectural change. If `PROJECT_SPEC.md`,
`CLAUDE.md`, or `docs/research/*.md` exist, treat them as living elaborations of the
contract and read those too.

## Why this matters

This project is not being built from scratch and is not a generic RPG. It is an
existing Phaser 3 + TypeScript + Vite prototype with working research
infrastructure. The single biggest risk at the architecture level is quietly
breaking or duplicating that infrastructure while adding new rooms or systems.
Every architectural decision should make the world _more_ connected and the data
_more_ trustworthy — never the reverse.

## Required checks before proposing architecture

1. Confirm the existing foundation is intact and understand it before changing it:
   `src/systems/EventLogger.ts`, `src/systems/SessionState.ts`,
   `src/systems/QualtricsBridge.ts`, `src/systems/DataQualityTracker.ts`,
   `src/systems/ScoringManager.ts`, `src/systems/ResearchRuntime.ts`,
   `src/data/researchInteractions.ts`, and the scenes under `src/scenes/`.
2. Cross-reference any new room/system idea against Section 4 (Room and Mini-Game
   Contract) and Section 5 (Q01-Q33 coverage matrix) of the build contract — every
   room, event, and derived variable must trace back to a construct or be labelled
   control/usability data.
3. Check Section 10 (Fable Build Beats) for where the current work fits in the beat
   sequence, and Section 3 (Overarching Systems) for the required persistent state,
   event payload fields, debug API, Qualtrics parameters, and UI modules.
4. Verify the proposed world structure keeps the station as one connected flow
   (Dock -> Station Hub -> the eight rooms) rather than a set of disconnected demo
   scenes.

## Forbidden

- Do not propose discarding or rewriting EventLogger, SessionState, QualtricsBridge,
  DataQualityTracker, ScoringManager, or ResearchRuntime. Extend them; don't replace
  them without a concrete, stated reason tied to a contract requirement.
- Do not introduce RPG progression mechanics forbidden by the contract: money,
  shops, XP, skill levels, combat, stat boosts, or power upgrades.
- Do not plan to build all rooms in one uncontrolled pass — architecture plans must
  hand off to `room-builder` for one-room-at-a-time implementation.
- Do not invent new global "good player" scores at the architecture level — scoring
  shape belongs to `psychometric-task-design` and the Section 6 scoring contract.
- Do not modify game source code or `package.json` yourself when only asked to plan
  — architecture planning is a documentation/design activity unless the user
  explicitly asks for implementation.

## Expected output format

Produce a short architecture note (inline in the response, or as a doc under
`docs/` if the user asks for one to persist) containing:

1. **Objective** — what this architectural change/decision is for, in one or two
   sentences.
2. **Contract references** — which sections/rooms/constructs of the build contract
   this touches.
3. **Current state** — what already exists in the codebase relevant to this
   decision (files, systems, scenes).
4. **Proposed change** — the shape of the change, not full implementation: new
   files/modules, how they connect to existing systems, what state or events they
   add.
5. **Sequencing** — where this sits relative to the Fable build beats, and what
   must happen before/after.
6. **Risks / open questions** — anything that could break existing systems or
   needs the user's decision before proceeding.

Hand off actual room implementation to `room-builder`, construct-to-mechanic
translation to `psychometric-task-design`, logging/scoring review to
`qualtrics-logging-review`, and browser verification to `playwright-game-verify`.
