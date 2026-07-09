---
name: room-builder
description: Use when implementing or modifying a single room, NPC task, terminal task, mini-game, or room-to-room transition in Remote Outpost Assessment (Dock, Archive, Systems Repair, Engineer Hub, Inventory/Prep, Hazard Control, Optional Side Repair, Interruption Corridor, Final Core). Trigger this any time the user asks to build, fix, or refine a specific room or task — even if they just name the room ("let's do the hazard room next") without saying "implement". Always enforces one room at a time; refuses to build multiple rooms in a single uncontrolled pass.
---

# Room Builder

You implement exactly one room, task, or transition per invocation of this skill.
The build contract at `docs/ai/fable-claude-final-game-build-contract-v3.txt`,
Section 4 ("Room and Mini-Game Contract"), is the authoritative spec for every
room's purpose, mapped study items, NPCs, mini-game mechanics, raw events, derived
variables, validity cautions, and implementation status. Read the relevant room's
subsection before writing any code.

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
   implementation — it must state: purpose, mapped Q-items, NPCs/systems, core
   player task, mini-game mechanics, raw event names, derived variables, validity
   caution, and the done test, mirroring Section 4's structure for that room.
2. **Event names are fixed before coding.** Pull the exact raw event names for this
   room from Section 4 and the Q01-Q33 matrix in Section 5. Do not invent
   different names for the same concept — consistency here is what lets
   `qualtrics-logging-review` and the Playwright suite verify things later.
3. **Scoring variables are identified.** Note which derived variables (Section 4
   per-room list, cross-checked against Section 6's required subindices) this
   room's events feed. Confirm the room's ScoringManager hooks are additive to
   existing subindices, not a new competing scoring path.
4. **Implementation status is checked first.** Some rooms are "already partly
   implemented" (Archive), have a "strong current implemented core" (Repair), or
   are "implemented as placeholder" (Hazard Control). Read the existing scene/task
   code before rewriting — audit first, preserve working logic unless there's a
   concrete, stated reason to change it.
5. **Done test is explicit and checkable.** Every room has (or needs) a concrete,
   testable definition of done — state it before declaring the room finished.

## Forbidden

- Do not implement more than one room, task, or transition in a single pass. If the
  user asks for multiple rooms, implement the first, report, and stop for approval
  before continuing.
- Do not add RPG progression mechanics (money, shops, XP, levels, combat, stat
  boosts, power upgrades) to any room.
- Do not use validated questionnaire wording (Q01-Q33 exact phrasing) in
  player-facing dialogue, terminal text, or NPC lines — translate constructs into
  behavioural tasks instead (defer to `psychometric-task-design` for this
  translation when unsure).
- Do not implement Q04 as a "planning before acting" mechanic — it is
  cleanup/disorder only.
- Do not remove or bypass EventLogger/SessionState/ScoringManager calls to make a
  room "simpler" — every meaningful action in the room must still log through
  ResearchRuntime/EventLogger with the required payload fields (Section 3.2).
- Do not modify `package.json`.
- Do not silently touch other rooms' files while implementing this one; if a shared
  system needs a change, call it out explicitly and get confirmation.

## Expected output format

For each room worked on, report:

1. **Room** — name and contract section reference.
2. **Room doc** — path to `docs/game/rooms/<room>.md`, created or confirmed
   up to date.
3. **Changed files** — list of source files touched.
4. **Events added/changed** — exact event names, matched against Section 4/5.
5. **Scoring variables affected** — derived variables now populated or changed.
6. **Done test** — the explicit, checkable condition for "this room is done", and
   whether it currently passes.
7. **Unresolved risks** — anything uncertain (validity concerns, ambiguous mapping,
   missing assets) flagged for the user or for `qualtrics-logging-review` /
   `playwright-game-verify` to check.
8. **Stop and wait** for approval before moving to the next room.
