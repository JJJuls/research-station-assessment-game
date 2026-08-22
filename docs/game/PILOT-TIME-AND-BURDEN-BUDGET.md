# Pilot time and burden budget (M01–M26 route)

Unit 1 of the professional pilot mission. Targets: nominal human completion
**24–28 min**; **30 min is an unenforced design target**, not an enforced
ceiling (nothing in the game measures or enforces elapsed time, and **no
visible timer or elapsed-time prompt may ever be added** — it would
contaminate every stopping-rule measure). The separate self-report
questionnaire is excluded. **Every figure below is a design estimate from
walking the flows at a deliberate pace — no human timing pilot has been run.
Automated Playwright wall time is reported separately in the final report and
does not validate human time.**

## 1. Route segments

| #   | Segment                                                                                         | Instruction | Active | Max bounded | Fail-forward / leave                                                        | Transitions                      | Cumulative (nominal) |
| --- | ----------------------------------------------------------------------------------------------- | ----------- | ------ | ----------- | --------------------------------------------------------------------------- | -------------------------------- | -------------------- |
| 1   | Opening (optional, skippable) + Dock control tutorial                                           | 0:40        | 0:40   | 2:00        | skip opening any key; tutorial has a skip option                            | Dock → Concourse (1 door)        | 1:20                 |
| 2   | Meet Vale (briefing, ≤3 short lines)                                                            | 0:30        | —      | 1:00        | leave dialogue any time                                                     | —                                | 1:50                 |
| 3   | Records & Logistics — incident filing (M02)                                                     | 0:20        | 2:00   | 4:00        | panel close keeps window open; Vale lets you move on                        | —                                | 4:10                 |
| 4   | Records & Logistics — press batches A + B (M03)                                                 | 0:20        | 1:40   | 3:30        | closing the panel is departure; never instructed to tidy                    | —                                | 6:10                 |
| 5   | Return to Vale, go to laboratory                                                                | 0:15        | 0:30   | 1:00        | —                                                                           | Concourse → Lab (1 door)         | 6:55                 |
| 6   | Kai briefing + terminal orientation (common tutorial)                                           | 0:30        | 1:00   | 2:30        | orientation can fail/stop (recorded; decoders then flagged, still playable) | —                                | 8:25                 |
| 7   | Lattice bench (M13)                                                                             | 0:15        | 2:00   | 4:00        | STOP TASK; 4-run bound                                                      | —                                | 10:40                |
| 8   | Decoder terminal 1 of 4 (counterbalanced layout)                                                | 0:10        | 1:00   | 2:00        | STOP                                                                        | —                                | 11:50                |
| 9   | Decoder terminal 2 of 4                                                                         | 0:15        | 1:30   | 3:00        | STOP                                                                        | —                                | 13:35                |
| 10  | Decoder terminal 3 of 4                                                                         | 0:10        | 1:00   | 2:00        | STOP                                                                        | —                                | 14:45                |
| 11  | Decoder terminal 4 of 4                                                                         | 0:15        | 1:30   | 3:00        | STOP                                                                        | —                                | 16:30                |
| 12  | Diagnosis console (M18)                                                                         | 0:15        | 1:30   | 3:00        | STOP; one-shot submit                                                       | —                                | 18:15                |
| 13  | Kai work order → airlock                                                                        | 0:15        | 0:20   | 0:45        | —                                                                           | Lab → Yard (airlock)             | 18:50                |
| 14  | Noor briefing + recovery work order (M23, scan/dig)                                             | 0:20        | 2:00   | 4:00        | "next job" / leave yard                                                     | —                                | 21:10                |
| 15  | Yard pump restart (M25) and relay housing seal (M22), order counterbalanced                     | 0:20        | 1:30   | 3:00        | leave any time                                                              | —                                | 23:00                |
| 16  | Magnet rig (M24) and sector verification (M26), order counterbalanced, neutral check-in between | 0:30        | 3:30   | 6:30        | stop any time; alternative activity visible                                 | —                                | 27:00                |
| 17  | Return through airlock; report to Kai, then Vale (operational only)                             | 0:10        | 0:50   | 1:30        | —                                                                           | Yard → Lab → Concourse (2 doors) | 28:00                |
| 18  | Utility & Core Deck — consequences, Core console review, synchronise                            | 0:20        | 0:30   | 1:30        | "return to the station" always offered before confirmation                  | Concourse → Deck (1 door)        | 28:50                |

Nominal total ≈ **28:50** at the deliberate-pace estimate (instruction 5:40 +
active 23:10); the sum of maximum bounded times is far higher (~50 min) but
every segment can be left at any moment and nothing enforces a ceiling (see
§3). The Utility & Core Deck carries no measurement window (scientific
review BLOCK-2.3).

## 2. Burden rules applied

- Concise dialogue (≤3 short lines per NPC beat, ≤4 options), no repeated
  instruction, no forced waiting without measurement purpose.
- No long walks through empty rooms: each zone is one 25×19 map; stations sit
  within ~10 s walking of the entry door; the Exterior work sites are grouped.
- No five identical terminal tasks: M13 (board), M14 (bins), M15 (chip
  pairing), M16 (staged protocol), M17 (register slots), M18 (evidence
  console) differ in silhouette and rhythm (Unit 4).
- No correct-performance gate anywhere; every window has STOP/leave.
- Optional interactions (opening, ambient props, controls overlay, map) are
  visually distinct from required work and never carry mandatory instructions.
- Residual forced waiting: the magnet rig's 1.4 s sweep + 1.2 s cooldown per
  cycle (~30–60 s across the deck) is mechanical ritual, not a gate; per-cycle
  duration is recorded and a shorter sweep is a candidate reduction.

## 3. Over-target handling

The nominal estimate is at the upper edge of the 24–28 target. If the human
timing pilot exceeds 30 minutes the order of reductions is: (1) shorten NPC
copy and the opening; (2) shorten transitions (spawn closer to the next
station); (3) reduce instruction text inside the IP terminals; (4) shorten the
magnet sweep; (5) combine physical locations. Independent windows are
retained; no item is silently deleted and no construct representation
weakened. No timer is ever shown.

## 4. Automated wall time (for the record, not a human estimate)

Recorded in `docs/verification/PROFESSIONAL-ASSESSMENT-PILOT-V1-REPORT.md`
from the full-route capture spec. Automation removes reading and
deliberation time; the previous prototypes measured ×2.5–3.5 human/automated
ratios. A human timing pilot is required before any burden claim.
