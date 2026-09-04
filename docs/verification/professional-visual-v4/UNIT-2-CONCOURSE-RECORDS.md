# V4 Unit 2 — Station Concourse and Records Workshop

Contract row: `UNIT-0-BASELINE-AUDIT.md` §5, Unit 2. Commit subject:
`refactor(game): clarify concourse and records workshop`.

## What changed (observable; presentation only)

- **Concourse hub grammar.** One north–south circulation spine (Dock ↔
  Laboratory) and one east–west axis (Workshop ↔ Deck) as painted floor
  plates with dashed centre lines, a crossing plate where they meet, the
  incident-desk island (Vale) as the landmark east of the crossing, a
  quiet quality bay south-west, and one threshold-plate family at the four
  exits. All eight permanent area labels removed; the door name chips
  (nearest-target only) remain the only text on the floor. The monitor
  gauge readout moved above the gauge so it never collides with the name
  chip and the prompt (the approach lane is north of it); both readouts
  rasterise at 2× and sit on the world-readout depth layer.
- **Records Workshop functional areas.** Sixteen permanent labels removed.
  Six floor plates read the areas instead: intake (north-west), records &
  press (west), storage & assembly (south-west), calibration (north-
  centre), the return/handover column (east) and the dispatch bay
  (south-east), plus a faint service lane on the y = 272 walking lane. The
  four return-shift state chips rasterise at 2× on the readout layer.
- **Unchanged by construction:** every station, door, spawn and bundle
  coordinate (`zoneSites.ts`, the scene-local site table, `PILOT_DOORS`),
  every prompt/option/window/event, the M02 workspace, the M03 occasions,
  the inventory overlays (drag/drop, sorting, storage, assembly), the M04
  debris layer, the interruption/return logic.

## Deferred (recorded)

- Partition stubs (partial walls) between the workshop areas were not
  added: the e2e lane book for the workshop (x = 60 corridor, the row-5
  rail stub, the y = 272 lane, the return-shift approach columns) leaves
  no lane-safe wall placement that a single unit could verify against the
  full Records/return suites; the areas are conveyed by material change
  and lighting (mission §11 alternatives).
- The Concourse work surfaces stay on their V3 counters (the row-5 and
  row-11 blocks) rather than in new side alcoves.

## Harness corrections (test-only)

Nine specs carried their own `/ 800, / 600` page conversions (the earlier
sweep matched only one shape): `pilot_records`, `pilot_episodes_1_2`,
`pilot_signal_incident`, `pilot_signal_capture`, `pilot_closure_capture`,
`pilot_full_route_timing`, `inventory_foundation`,
`inventory_measurement_isolation`, `inventory_visual_capture`. They now map
design points to the canvas through the documented constants or
`designToPage`. `v4Projection.compareProjections` treats parallel-form /
counterbalance ASSIGNMENTS as session-assigned slots (they are a
deterministic hash of the game session id, which carries `Date.now()`), so
two recorded sessions compare on scientific content; the slot set itself is
still compared.

## Tests and evidence (`--retries=0 --workers=1`, `PW_DEV_PORT=5362`)

| Spec / command                                      | Result                                                                                                                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint:tsc`, `build`, scoped ESLint                  | pass                                                                                                                                                                                                                      |
| `m02_overlay_proof` (2)                             | 2/2                                                                                                                                                                                                                       |
| `pilot_route` (4)                                   | 4/4                                                                                                                                                                                                                       |
| `concourse_interaction_lifecycle` (3)               | A/D pass, C/E pass; **B fails on the 120 s test budget** (screenshot step; the test also overwrites tracked PNGs under `screenshots-concourse-hotfix`, restored) — classified load/intermittent pending a base comparison |
| `pilot_records` (4)                                 | M02 open workspace pass (after the conversion fix); M03 occasions pass; **M02 abandonment fail-forward fails — unresolved, not re-diagnosed in this session**; supply bundles fails (inherited, V3 §7.1)                  |
| `v4_visual_capture` leg 1 → `unit2/`                | pass; Concourse and Records frames inspected (labels gone, readout/chip/prompt separated)                                                                                                                                 |
| `v4_event_projection` (`unit2.json`) + pure compare | route completed; **0 scientific differences** vs `baseline-v3.json` (forms session-assigned)                                                                                                                              |

## Review

No reviewer round was run for Unit 2 (session context budget); the Unit 1
visual review's M8 (Concourse chip/readout overlap) is closed by this unit.
A Unit 2 read-only review is owed in the next session before Unit 3.
