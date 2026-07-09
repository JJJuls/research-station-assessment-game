# PROJECT_SPEC.md

Remote Outpost Assessment — project spec, derived from and subordinate to the
canonical build contract:

> `docs/ai/fable-claude-final-game-build-contract-v3.txt` (V3)

If anything in this file conflicts with V3, **V3 wins**. This file is a working
summary for day-to-day decisions, not a replacement for the contract.

## 1. Project overview

Remote Outpost Assessment is a short (target 15-20 min) 2D top-down browser game
built on an existing Phaser 3 + TypeScript + Vite RPG foundation. It is a
**behavioural analogue layer** for a personality/Grit-S research instrument, not a
questionnaire replacement and not a conventional game. The validated self-report
scales live in Qualtrics; this game produces event-log indicators for
convergent/discriminant validation against those scales.

The player is a newly arrived station assistant who inspects, repairs, reports,
prepares, responds to warnings, manages interruptions, and finalizes a remote
research outpost's core systems, moving through one connected world:

```
Dock / Arrival Bay -> Station Hub -> Archive Room, Systems Repair Room,
Engineer Hub, Inventory/Preparation Room, Hazard Control Room,
Optional Side Repair Bay, Interruption Corridor -> Final Core Room
```

## 2. Definition of done (project-level)

The project is done for a pilot study when it is:

- **Playable** end-to-end as one connected world (not disconnected demo scenes).
- **Coherent** with the outpost fiction; no RPG progression mechanics (money,
  shops, XP, levels, combat, stat boosts, power upgrades).
- **Connected**: all 8 contract rooms reachable in one flow from Dock to Final Core.
- **Logged**: every meaningful action logs through `ResearchRuntime`/`EventLogger`
  with the full canonical payload (see `docs/research/event-schema.md`).
- **Scored**: `ScoringManager` produces the required subindices, keeps adaptive and
  inappropriate persistence separate, and never collapses to one global score (see
  `docs/research/scoring-plan.md`).
- **Testable**: a Playwright smoke suite covers launch params, movement, and each
  room's logging path (see `docs/testing/playwright-smoke-plan.md`).
- **Qualtrics-compatible**: launch params parsed, summary variables previewed and
  returned without overwriting raw logs.
- **Aligned to Q01-Q33**: every event/derived variable traces to a Q-item or is
  explicitly labelled control/usability data (see
  `docs/research/MASTER_33_ALIGNMENT.md`).
- **Scientifically cautious**: Goal-Time and Grit-S Consistency-of-Interest outputs
  are labelled weak/exploratory everywhere they surface.
- **Visually clear** and **technically stable** enough for a pilot participant.

Per-room and per-beat done tests are narrower and defined in
`docs/game/rooms/*.md` and in each beat's own report.

## 3. Research constraints (non-negotiable, V3 Section 1)

1. Q01-Q33 is the stable reference key; every room/event/variable traces back to it
   or is explicitly control/usability data.
2. Never show validated questionnaire item wording in player-facing dialogue.
3. Never collapse behavioural output into one global "good player" score.
4. Always compute separate subindices: organisation, productiveness,
   responsibility, prudence/carefulness, adaptive persistence, inappropriate
   persistence, and the optional goal-time/delayed-benefit proxy.
5. Inappropriate Persistence is maladaptive — higher is worse, never better, and it
   must never share a variable with adaptive persistence.
6. Goal-Time Preference is optional/exploratory; label it as such everywhere.
7. Grit-S Consistency of Interest is partly weak/exploratory in a short game; score
   return-to-task and unresolved non-return, not mere switching.
8. Q04 is cleanup/disorder — never planning-before-acting.
9. Engineer Hub / NPC Report-Back adds responsibility/dependability coverage
   without altering the persistence scoring model elsewhere.

## 4. Build beats (V3 Section 10)

| Beat | Scope                                                     | Status                                     |
| ---- | --------------------------------------------------------- | ------------------------------------------ |
| 0    | Audit only, no code changes                               | Complete                                   |
| 1    | Documentation source-of-truth (this beat)                 | In progress                                |
| 2    | Architecture stabilisation (scene/world/task abstraction) | Not started                                |
| 3    | Dock / Arrival Bay                                        | Prototype stub only                        |
| 4    | Archive Room refinement                                   | Prototype partial                          |
| 5    | Systems Repair refinement                                 | Prototype strong core                      |
| 6    | Engineer Hub / NPC Report-Back                            | Prototype partial (no duty follow-through) |
| 7    | Inventory / Preparation Room                              | Prototype partial                          |
| 8    | Hazard Control refinement                                 | Prototype placeholder                      |
| 9    | Optional Side Repair Bay                                  | Prototype partial                          |
| 10   | Interruption Corridor                                     | Prototype partial                          |
| 11   | Final Core Room                                           | Prototype partial                          |
| 12   | Connected world pass                                      | Not started                                |
| 13   | Full ScoringManager subindices                            | Not started                                |
| 14   | Qualtrics return/summary preview                          | Partial (return URL exists)                |
| 15   | Playwright smoke suite                                    | Not started                                |
| 16   | PixelLab room-by-room asset pass                          | Not started (gated on explicit approval)   |
| 17   | Pilot-readiness polish                                    | Not started                                |

At the end of each beat: summarize objective, list changed files, list
events/scoring variables affected, run build/tests, report unresolved risks, and
stop before the next beat unless explicitly approved.

## 5. Current prototype status (as of Beat 0 audit)

- Single Phaser scene (`src/scenes/Main.tsx`) hosts all 9 interaction "stations"
  as proximity markers on one flat tilemap — there is **no** connected multi-room
  world yet (no doors, no per-room scenes, no `Station Hub`).
- All 8 contract rooms have a corresponding interaction stub with a 3-option
  prompt and event logging in `Main.tsx` / `src/data/researchInteractions.ts`.
- Archive and Systems Repair have the strongest existing logic (contract notes:
  "already partly implemented" / "strong current implemented core").
  Hazard Control is a placeholder. Engineer Hub, Inventory, Optional Side Repair,
  and Interruption Corridor are single-shot prompts without the cross-room
  persistent-duty/state mechanics the contract describes.
- Research systems (`EventLogger`, `SessionState`, `QualtricsBridge`,
  `DataQualityTracker`, `ScoringManager`, `ResearchRuntime`) exist and are sound
  in isolation, but: `SessionState` does not yet hold the Section 3.1 mission-state
  fields; `RawGameEvent` is missing several Section 3.2 payload fields; current
  event names and `ScoringManager` variables follow an earlier MPS-prototype
  naming scheme that only partially overlaps with V3's canonical names.
  `DataQualityTracker` metrics are captured but not yet surfaced in the summary.
- No Playwright tests exist yet. `npm.cmd run build` and `npm.cmd run lint:tsc`
  both pass cleanly against the current prototype.
- Full detail: Beat 0 audit report (session history) and
  `docs/research/event-schema.md` / `docs/research/scoring-plan.md` reconciliation
  tables.

## 6. Non-goals

- Not a new project from scratch, not a Stardew clone, not a generic RPG.
- No money, shops, XP, skill levels, combat, stat boosts, or power-ups — no
  mechanic may change task difficulty across participants.
- No single global personality or "good player" score, ever.
- No literal multi-year goal-orientation measurement — Goal-Time proxies are
  short-game exploratory analogues only.
- No questionnaire item wording reproduced in player-facing text.
- No production Qualtrics deployment work in the current beats — return-URL
  preview only.
- No PixelLab asset generation until placeholder mechanics and logging are
  confirmed working, and only with explicit per-pass user approval.
- No broad autonomous/manager/ship agents; no GitHub push/release agents.

## 7. Approval gates

- **Beat-to-beat**: stop and wait for explicit approval before starting the next
  beat (V3 Section 10).
- **Room-to-room**: implement one room, task, or transition per pass; report and
  stop before the next room (`room-builder` skill rule).
- **PixelLab / asset generation**: requires explicit, standalone approval for the
  specific room/step in the same session — never inferred from general
  room-building or polish conversation (`pixellab-asset-pipeline` skill gate).
- **Git**: no `git add`/commit/push, no PR creation, unless explicitly requested
  by the user for that specific action.
- **`package.json`**: never edited by any skill or agent without explicit user
  instruction to add/change a dependency.
- **Review agents** (`research-data-reviewer`, `gameplay-implementation-reviewer`,
  `browser-qa-reviewer`) report findings only; they do not apply fixes unless
  explicitly instructed in the same request.
