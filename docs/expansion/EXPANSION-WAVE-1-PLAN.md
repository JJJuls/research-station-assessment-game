# Expansion Wave 1 Plan — Remote Outpost Assessment

Date: 2026-07-12 · Branch `fable-autonomous-game-build-v1`. Inputs:
`REMAINING-STATION-INVENTORY.md` (facts), V3 contract, event-schema,
scoring-plan, MASTER_33_ALIGNMENT, room docs 02–08. Live progress:
`ACTIVE-EXPANSION-STATE.md`.

## 1. Station ranking

Scored 1 (lowest) to 5 (highest) per criterion. "Delegation difficulty" =
how hard it would be to hand this station to Sonnet/Codex/another model later
with only the written contracts (higher = keep with Fable).

| Station               | Arch. complexity | Reusable-system value | Sci. logging complexity | Asset needs | Delegation difficulty |
| --------------------- | ---------------- | --------------------- | ----------------------- | ----------- | --------------------- |
| Systems Repair        | 2                | 4                     | 2                       | 2           | 1                     |
| Engineer Hub          | 4                | 5                     | 4                       | 3 (NPC)     | 5                     |
| Inventory / Prep      | 3                | 4                     | 4                       | 3           | 3                     |
| Hazard Control        | 1                | 2                     | 2                       | 2           | 2 (once unblocked)    |
| Side Repair Bay       | 3                | 3                     | 4                       | 3 (NPC)     | 3                     |
| Interruption Corridor | 4                | 3                     | 5                       | 2           | 5                     |
| Final Core            | 5                | 1 (consumer)          | 5                       | 3           | 5                     |

Justifications (condensed; full facts in the inventory):

- **Systems Repair** — same shape as the shipped Archive port (audit-first,
  additive events, abandon/return pair); its value is proving the pattern
  generalizes and forcing extraction of the shared task-state helper. Easiest
  future delegation: the room doc + Archive precedent fully determine it.
- **Engineer Hub** — contract-priority ("very high"); introduces the
  duty-board/persistent-objective system consumed by Interruption Corridor and
  Final Core, and the first multi-stage prompt flow. Highest reusable value;
  hardest to delegate because the supervision mechanic is new design surface.
- **Inventory/Prep** — heaviest event-name rework (zero exact matches) and
  first cross-room state writer (`prepared_items`, `workspace_status`), but
  the room doc constrains the sub-step split tightly.
- **Hazard Control** — technically trivial (strongest alignment) but
  **blocked on the user's `hazard_avoidance` canonical decision** (inventory
  §Station 4). Scheduled last-before-blocked or whenever the decision lands.
- **Side Repair Bay** — required defer branch (confound control) exceeds the
  3-option prompt; introduces step-counted multi-step tasks and
  `side_repair_status` propagation.
- **Interruption Corridor** — most scientifically sensitive redesign
  (raw-vs-derived cleanup, weak/exploratory constructs, idle-parameter
  dependency); consumes the objective system rather than creating it.
- **Final Core** — pure consumer of every upstream mechanic; hard-gated until
  the propagation writers exist. Build last (V3 Beat 11 ordering).

## 2. Recommended station order (after shared architecture)

1. **Systems Repair** — lowest risk, unblocks helper extraction, no open
   parameter.
2. **Engineer Hub** — contract priority, creates the duty/objective system.
3. **Inventory / Prep** — first Final-Core-feeding state writer.
4. **Side Repair Bay** — multi-step + defer; second state writer.
5. **Interruption Corridor** — consumes duty/objective system; idle-dependent
   event stays registered-not-emitted.
6. **Hazard Control** — awaiting user decision on `hazard_avoidance`; slots
   anywhere after Unit work once decided (it is otherwise the smallest room).
7. **Final Core** — last; consumes all propagation.

Each station beat follows the room-builder discipline: room doc reconfirmed →
canonical events from V3/event-schema → implementation (one room only) →
build + tsc → commit → state update → stop-and-report only if a scientific
parameter blocks.

## 3. Shared architecture units (Wave 1A scope, built first)

Selection rule: unambiguously supported by existing contracts and required by
≥3 remaining stations. Each unit is one coherent commit with build + tsc
passing.

### U1 — Station registry and routing

One module (`src/world/stationRegistry.ts`) declaring, per assessment room:
canonical `room_id`, Phaser scene key, `?scene=` route param, Hub door state
(open/sealed). `HubScene` door ring and `SceneRouter` aliases read from it, so
bringing a room online = flipping one registry entry when its scene lands.
Required by: all 7. Contracts: event-schema §2 room_id table, Hub governance
(approved plan §11 — sealed doors remain control/usability logging).
Non-goals: no behaviour change to existing routes; `?scene=prototype`
untouched; sealed-door event semantics byte-identical.

### U2 — Deterministic per-room task-state modules

Generalize the `archiveSessionState` pattern (module-scope, session-lifetime,
survives scene restarts) into a shared factory: failure tracking,
left-after-failure, returned-after-failure detection, last-wrong-response
comparison, plus a test-only reset registered alongside
`resetSessionOnceFlags`. Required by: Repair, Engineer Hub, Inventory, Side
Repair, Interruption, Final Core. Contracts: room docs' leave/return edge
cases; Archive precedent. Non-goals: no change to ArchiveScene behaviour in
this unit (it may adopt the factory only if event order is provably
identical — otherwise it keeps its local copy until its own maintenance pass).

### U3 — Controlled-option prompt rendering (N options, multi-stage)

Extend `RoomScene`'s prompt from a fixed 1–3 keymap to a deterministic
N-option renderer (still numeric keys, still fixed ordering, no randomisation
ever) plus support for chained prompt stages (e.g. report choice → duty
offer). Required by: Engineer Hub (duty accept/decline), Side Repair (defer
branch), Inventory (separable sub-steps), Final Core (blocker/force-continue).
Contracts: V3 §4 room task descriptions; V1 constraint that interaction
salience must not vary between rooms/participants. Non-goals: existing
3-option stations' labels/ordering/meaning unchanged; no UI redesign.

### U4 — Canonical event-context registrations for remaining stations

Add `CANONICAL_EVENT_CONTEXT` entries for the remaining stations' canonical
events, following the committed population rule verbatim: only events with an
unambiguous `study_item_ids` source in MASTER_33_ALIGNMENT's Events columns;
`construct_id` only where a single construct is documented; dual-listed or
psychometrically open events left partially/fully unset with source comments
(precedents: `archive_completed`, `hazard_info_checked`,
`archive_abandoned`). Registration ≠ emission — nothing fires until its room
is built. Required by: all 7. This unit also documents each decision inline.

### U5 — Cross-room mission-state write/read helpers

Thin, documented helpers over the existing (currently unused) `SessionState`
fields — `prepared_items`, `workspace_status`, `hazard_status`,
`side_repair_status`, `interruption_status`, `accepted_duties`/
`skipped_duties` — defining the neutral status vocabulary each room doc
already implies, so upstream writers (Inventory, Hazard, Side Repair,
Engineer Hub, Interruption) and the Final Core reader use one audited surface.
Required by: 6 stations. Contracts: V3 §3.1, room docs' propagation notes.
Non-goals: no ScoringManager/QualtricsBridge changes; status vocabularies
stay open strings per SessionState's documented rule until each room lands.

### U6 — Reusable acceptance-test fixtures

Extend `e2e/helpers.ts` with room-driving fixtures (enter room via Hub,
open station prompt, select option k, collect events via
`window.researchRuntime`) so each station beat ships a spec by configuration.
Compile-verified only in this session (Playwright execution is disabled);
specs run in a later verification beat. Required by: all 7 (V3 §9 spec list).

Deliberately **out of Wave 1A scope**: data-quality summary integration
(scoring-plan §5) and every Beat-13 scoring change — these touch
ScoringManager/ResearchRuntime, are entangled with user-flagged formula fixes
(strategy_revision_count mixing, inappropriate-persistence 4th term,
final_quality_score shape, exploratory-label mechanism), and per CLAUDE.md
require the qualtrics-logging-review gate; they are scheduled as their own
supervised beat, not slipped into shared-architecture work.

## 4. Checkpoint discipline

- One coherent unit (U1…U6, then one room per beat) per commit; never more
  than one uncommitted unit.
- Before each commit: `npm.cmd run build` + `npm.cmd run lint:tsc` pass.
- After each commit: update `ACTIVE-EXPANSION-STATE.md` (SHA, work done,
  files, exact next action, unresolved issues).
- Stop-and-report triggers: any needed `study_item_ids`/`construct_id`/
  formula/semantics decision not already fixed by the contracts; the
  `hazard_avoidance` decision; any idle-threshold dependency; any
  contradiction between authoritative documents.
- No Playwright/PixelLab; no push/merge/PR/rebase/reset/branch-switch;
  protected branch untouched.
