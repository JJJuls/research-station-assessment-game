---
name: room-builder
description: Use when implementing or modifying a single room, NPC task, terminal task, mini-game, or room-to-room transition in Remote Outpost Assessment (Dock, Archive, Systems Repair, Engineer Hub, Inventory/Prep, Hazard Control, Optional Side Repair, Interruption Corridor, Final Core). Trigger this any time the user asks to build, fix, or refine a specific room or task  -  even if they just name the room ("let's do the hazard room next") without saying "implement". Always enforces one room at a time; refuses to build multiple rooms in a single uncontrolled pass.
---

# Room Builder

You implement exactly one room, task, or transition per invocation of this skill.

Read all three of these for the room before writing any code — authority is
domain-specific (`CLAUDE.md`), so each settles a different question:

- **Build contract** `docs/ai/fable-claude-final-game-build-contract-v3.txt`
  §4 ("Room and Mini-Game Contract") — the room's purpose, NPCs, structure,
  validity cautions, and implementation status.
- **Measurement specification**
  `docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md` — read the
  entries for **this room's Q-items**. It governs the **approved behavioural
  rationale**: the opportunity, the player choices, the measurement window, and
  whether the item is questionnaire-primary or exploratory. Where it conflicts
  with an older mechanic rationale in §4/§5 or `MASTER_33_ALIGNMENT.md`, the
  specification governs the rationale.
- **Event schema** `docs/research/event-schema.md` — the **only** source of
  approved canonical production event names, and `docs/research/scoring-plan.md`
  for approved derived variables.

**The specification's event names and derived indicators are candidates, not
approvals.** They are design proposals. If the approved rationale for this room
needs an event or a variable that the schema/scoring plan does not yet approve,
**say so and stop** — that is a decision for the research owner
(`docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`), not something to code
around, rename toward, or invent past.

## Why one room at a time

The contract explicitly calls for room-by-room build with a clear definition of
done at each step (Section 10, Beats 3-11). Building several rooms at once makes it
impossible to verify event logging and scoring correctness per room, and raises the
risk of silently drifting from the Q01-Q33 alignment. Slower and checked beats a
fast uncontrolled pass, every time, for a research instrument that has to be
defensible later.

## Required checks before implementing a room

1. **Room doc exists or is created.** Check `docs/game/rooms/` for a doc matching
   this room. If missing, create one (or ask the user) before/alongside
   implementation - it must state: purpose, mapped Q-items, NPCs/systems, core
   player task, mini-game mechanics, raw event names, derived variables, validity
   caution, and the done test, mirroring Section 4's structure for that room.
2. **Behavioural rationale is read before mechanics are chosen.** Read this room's
   Q-item entries in the measurement specification and state, in the room doc, what
   opportunity/choice/process/outcome the mechanic must produce, and each item's
   evidential-strength label. Never invent a scientific mapping - if the mapping is
   unclear, hand off to `psychometric-task-design` or ask the research owner.
3. **Event names are fixed before coding, from the approved schema.** Pull the
   exact canonical event names for this room from `docs/research/event-schema.md`
   (with contract §4/§5). Do not invent different names for the same concept -
   consistency here is what lets `qualtrics-logging-review` and the Playwright
   suite verify things later. **A candidate event name from the measurement
   specification is not usable yet**: mark it `CANDIDATE - needs event-schema
decision`, report it, and leave it unemitted.
4. **Scoring variables are identified from the approved plan.** Note which derived
   variables (`docs/research/scoring-plan.md`, cross-checked against contract §6's
   required subindices) this room's events feed. Confirm the room's ScoringManager
   hooks are additive to existing subindices, not a new competing scoring path.
   **Never invent or adjust a formula, weight, or reverse-key** - a candidate
   derived indicator needs a scoring-plan decision first.
5. **Required decisions are named before coding starts.** State explicitly whether
   this pass needs: no schema change / an event-schema decision / a scoring-plan
   decision / both. If a refined mechanic requires a decision, that is where the
   pass stops - report it and wait.
6. **Implementation status is checked first.** Some rooms are "already partly
   implemented" (Archive), have a "strong current implemented core" (Repair), or
   are "implemented as placeholder" (Hazard Control). Read the existing scene/task
   code before rewriting - audit first, preserve working logic unless there's a
   concrete, stated reason to change it.
7. **Done test is explicit and checkable.** Every room has (or needs) a concrete,
   testable definition of done - state it before declaring the room finished.

## Forbidden

- Do not implement more than one room, task, or transition in a single pass. If the
  user asks for multiple rooms, implement the first, report, and stop for approval
  before continuing.
- Do not add RPG progression mechanics (money, shops, XP, levels, combat, stat
  boosts, power upgrades) to any room.
- Do not use validated questionnaire wording (Q01-Q33 exact phrasing) in
  player-facing dialogue, terminal text, or NPC lines - translate constructs into
  behavioural tasks instead (defer to `psychometric-task-design` for this
  translation when unsure).
- Do not implement Q04 as a "planning before acting" mechanic - it is explicit
  cleanup/restoration/workspace-disorder behaviour only.
- Do not invent a scientific mapping, a scoring formula, a weight, or a
  reverse-key, and do not resolve an entry in
  `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`. Missing science is a stop
  condition, not a gap to fill with a plausible guess.
- Do not emit an event name that is not approved in
  `docs/research/event-schema.md` - including a candidate name taken from the
  measurement specification.
- Do not remove or bypass EventLogger/SessionState/ScoringManager calls to make a
  room "simpler" - every meaningful action in the room must still log through
  ResearchRuntime/EventLogger with the required payload fields (Section 3.2).
- Do not modify `package.json`.
- Do not silently touch other rooms' files while implementing this one; if a shared
  system needs a change, call it out explicitly and get confirmation.

## Expected output format

For each room worked on, report:

1. **Room** - name and contract section reference.
2. **Room doc** - path to `docs/game/rooms/<room>.md`, created or confirmed
   up to date.
3. **Changed files** - list of source files touched.
4. **Events added/changed** - exact event names, matched against
   `docs/research/event-schema.md` (with Section 4/5). List any candidate name
   deliberately left unemitted and the decision it awaits.
5. **Scoring variables affected** - derived variables now populated or changed,
   matched against `docs/research/scoring-plan.md`.
6. **Decisions required** - explicitly one of: no schema change / event-schema
   decision / scoring-plan decision / both - with the specific question the
   research owner has to answer.
7. **Done test** - the explicit, checkable condition for "this room is done", and
   whether it currently passes.
8. **Unresolved risks** - anything uncertain (validity concerns, ambiguous mapping,
   missing assets) flagged for the user or for `qualtrics-logging-review` /
   `playwright-game-verify` to check.
9. **Stop and wait** for approval before moving to the next room.
