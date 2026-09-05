# Story-state specification (World V1)

Governs the narrative wrapper: acts, NPC jobs and stage placement,
environmental restoration states, dialogue register and the rules that keep
narrative advancement independent of measured performance. Implemented in
U2 as the pure module `src/pilot/storyState.ts` over the **unchanged** route
stage machine in `src/pilot/pilotRoute.ts`.

**U2 amendments (2026-09-06, recorded, not silent).** (a) The mission
contract names **eight** acts — 7 "Utility restoration", 8 "Core closure and
handover"; the implemented mapping (`STAGE_ACT`) is `deck_closure`,
`core_stabilise` → act 7 and `core_sync`, `complete` → act 8; the seven-act
draft tables below are kept for the record. (b) Kai is **not** removed from
the Laboratory at `return_hub` (§2 note). (c) The mission-card lines are the
exhaustive table in `missionCardAction()`, each ≤ 44 characters so the card
is exactly two short lines (§3). (d) Persistence semantics (§4 note).

## 1. Setting and role (participant-facing facts)

- **Station 080** — a small research station on a cold plateau. An
  overnight electromagnetic storm disordered the records, an unfamiliar
  surface signal appeared during the storm, the exterior relay mast
  (Mast 04) is damaged and the utility feeds are unstable.
- **You** are the relief operations specialist on the morning shuttle. Your
  work: document, diagnose and stabilise the station before the next routine
  communications handover. No countdown; no emergency pressure; the crew is
  competent and calm.
- **Three operational goals** (Vale's work order, act 2): restore the
  records, investigate the signal, stabilise the station systems.

## 2. NPCs — job, register, placement per act

| NPC  | Job                          | Voice                                                     |
| ---- | ---------------------------- | --------------------------------------------------------- |
| Vale | operations coordinator       | brief, organised, hands you the work order; never praises |
| Kai  | systems engineer             | technical, factual, explains what a system does           |
| Noor | survey and signal specialist | field-practical, names places and equipment               |

Placement is deterministic per act (stage). An NPC changes location only at
a stage transition; the participant never sees an NPC walk through an active
measurement window, block a path or alter an opportunity condition.

| Act | Vale                          | Kai                                                                | Noor                                                                         |
| --- | ----------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1   | (station line, Dock terminal) | —                                                                  | —                                                                            |
| 2   | Concourse ops desk            | —                                                                  | —                                                                            |
| 3   | Concourse ops desk            | Laboratory briefing bay (visible, working)                         | —                                                                            |
| 4   | Concourse ops desk            | Laboratory briefing bay (route anchor)                             | on the relay (subtitle band; physically outside)                             |
| 5   | Concourse ops desk            | Laboratory briefing bay (redirects only)                           | Recovery Yard airlock apron (route anchor)                                   |
| 6   | Concourse ops desk            | Concourse, beside the ops desk (M10 handover recipient; unchanged) | Recovery Yard apron, by the airlock (redirect only; off every site and lane) |
| 7   | Concourse ops desk            | Core Chamber console (unchanged)                                   | Recovery Yard apron                                                          |

Implementation notes (as drafted): the Laboratory removes Kai's actor at
`return_hub` and later; the Concourse adds Kai at `return_hub` and later
(existing). `npc_kai` route-station registrations keep their stage lists, so
the beacon/guidance model is unchanged.

**U2 decision — scientific preservation wins.** Kai is NOT removed from the
Laboratory: the Laboratory Kai is an authorised M10 handover recipient on
the return leg (`DiagnosticsLaboratoryScene`, `handOverM10`), and
presentation may never remove a recipient. `npcPosts()` therefore gives Kai
the Laboratory briefing bay at every stage, the post beside the operations
desk from `return_hub` and the Core console from `core_sync`; the multiple
presence is recorded as open decision OD-W1-4 in the mission report.

## 3. Acts, stages, mission-card lines

The mission card shows the **act title** and **one next action**. The next
action is computed per (stage, current zone) so it never names a door the
participant already passed. Lines are operational; no item, construct,
variable or strategy is ever named.

| Stage (unchanged)   | Act | Next action when in the destination zone                    | Next action elsewhere                               |
| ------------------- | --- | ----------------------------------------------------------- | --------------------------------------------------- |
| `arrival`           | 1   | Check in at the arrival terminal, then enter the station.   | —                                                   |
| `handover_briefing` | 2   | Report to Vale at the operations desk.                      | Go to the Concourse.                                |
| `incident_handover` | 2   | Work the storm packet, then confirm the handover with Vale. | Return to the Concourse.                            |
| `workshop`          | 3   | Take the work orders from the board.                        | Go to the Records Workshop (west of the Concourse). |
| `workshop_work`     | 3   | Work the orders, then sign the board.                       | Return to the Records Workshop.                     |
| `lab_briefing`      | 4   | Report to Kai in the briefing bay.                          | Go to the Diagnostics Laboratory (north).           |
| `lab_work`          | 4   | Work the signal case, then report to Kai.                   | Return to the Laboratory.                           |
| `exterior_briefing` | 5   | Report to Noor on the airlock apron.                        | Take the airlock to the Recovery Yard.              |
| `exterior_work`     | 5   | (site line from the existing exterior objective model)      | Return to the Recovery Yard.                        |
| `return_hub`        | 6   | Check in with Vale.                                         | Return inside to the Concourse.                     |
| `workshop_return`   | 6   | Reconcile the field results, then sign the board.           | Go to the Records Workshop.                         |
| `deck_closure`      | 7   | Close the station record at the review station.             | Go to the Utility Deck (east).                      |
| `core_stabilise`    | 7   | Bring the feeds up: coolant, calibration, distribution.     | Return to the Utility Deck.                         |
| `core_sync`         | 7   | Confirm synchronisation at the Core.                        | Enter the Core Chamber.                             |
| `complete`          | 7   | Handover complete — the station is stable.                  | (same)                                              |

## 4. Environmental restoration (state-driven, never success-driven)

Each restoration state reads a **stage** or a **terminal disposition**, never
a value. Presentation only.

| Element                              | Zone       | Damaged / offline until         | Operational when                                              |
| ------------------------------------ | ---------- | ------------------------------- | ------------------------------------------------------------- |
| emergency lighting (cold, dim pools) | all        | act 2                           | act 3+ (warm work-area pools)                                 |
| station-status wall: RECORDS         | Concourse  | `workshop_work`                 | `lab_briefing` (workshop signed off)                          |
| station-status wall: SIGNAL          | Concourse  | `lab_work`                      | `exterior_briefing`                                           |
| station-status wall: EXTERIOR        | Concourse  | `exterior_work`                 | `return_hub`                                                  |
| station-status wall: RECORD CLOSED   | Concourse  | —                               | station record closed (deck review)                           |
| station-status wall: FEEDS / CORE    | Concourse  | —                               | each feed up; Core stable                                     |
| desk-lamp fault (M05 o1)             | Concourse  | window open (flicker, existing) | fixed or censored (existing)                                  |
| signal display wall                  | Laboratory | idle trace                      | each phase window terminal → segment settles (existing model) |
| Mast 04 tower                        | Yard       | damaged silhouette              | whole restoration terminal-complete (existing OD-9 rule)      |
| feed conduits and bay lighting       | Deck       | dark                            | each feed up (existing)                                       |
| Core column                          | Core       | inactive                        | stable (existing)                                             |
| map sector marks                     | map (M)    | unvisited / visited             | act completed in that zone (stage passed)                     |

**Persistence (U2).** Restoration is derived from the route stage and the
closure session's terminal dispositions, so it persists across every zone
exit and re-entry within a session by construction (asserted at runtime by
`world_v1_story.spec.ts`). A page reload is a new session by contract
(`docs/architecture/STATE-AND-SESSION-CONTINUITY.md` §4: nothing is
persisted across reloads); U7 verifies that semantics end to end.

## 5. Dialogue rules

- ≤ 3 short lines per beat, ≤ 4 options (unchanged). Every beat that
  advances a stage keeps a "move on" option; no beat requires an answer to
  a task.
- Neutral acknowledgement of **station outcomes** ("The record is closed.",
  "Feeds are up.") — never of the participant's manner, effort, tidiness,
  persistence, speed or choices.
- No praise words (good job, well done, impressive), no evaluative adverbs,
  no comparison with other crew.
- Reminders stay exactly as authorised by the measurement models (M09/M10
  equal-exposure mentions; M20 never reminded). Story lines never add a
  reminder.
- Kai's technical context describes what a system does, never how to solve
  a task inside a window.

## 6. Advancement invariants (tested by a pure spec)

1. `advancePilotStage` is called only from explicit NPC/board beats (Vale,
   Kai, Noor, Work Order Board, review panel commit, zone entry for
   `handover_briefing` and `core_sync`).
2. No advancement site reads a window's outcome value; the only gates are
   the two unchanged navigation gates (Core door: route readiness =
   terminality of every scheduled opportunity; Core exit during
   synchronisation).
3. Every restoration state in §4 is a function of stage or terminality.
4. The story-state module is pure and exhaustive over `PILOT_STAGES` ×
   `PILOT_ZONE_KEYS` (a missing line is a test failure, never a stale card).

## 7. Opening captions (≤ 20 s; U2)

1. "Station 080 — relief flight, morning after the storm."
2. "Records disordered. An unknown surface signal. Mast 04 down. Feeds unstable."
3. "You are the relief operations specialist. Document, diagnose, stabilise — before the next comms handover."

## 8. Ending lines (U6)

- Kai (Core console): "Core synchronised. Feeds holding. Handover can go ahead."
- Vale (station line): "Station 080 is stable. Thank you — the record and the survey are next."
