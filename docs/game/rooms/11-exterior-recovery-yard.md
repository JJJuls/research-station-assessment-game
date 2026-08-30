# Exterior Recovery Yard — episode 4 (evidence-led pilot v2, Unit 4)

Scene `exterior_recovery_yard` (`src/scenes/ExteriorRecoveryYardScene.ts`).
One connected exterior reached through the laboratory airlock; the same
airlock is the only door and leads back. Hosts the six item windows of
sheet 11 row 4 — **M05(2), M19, M20-start, M23, M24, M26** — over the
accepted field-actions foundation. Item models: `src/pilot/exterior/`;
window adapters: `src/pilot/windows/exteriorWindows.ts`.

## Topology (25 × 19, exterior theme)

| Subarea                 | Tiles                         | Sites (px)                                                                 |
| ----------------------- | ----------------------------- | -------------------------------------------------------------------------- |
| Airlock apron (south)   | rows 12–15                    | Noor (301, 429) · Supply Crate (176, 448) · Cable Flag / M05 o2 (560, 448) |
| Frozen coupling (west)  | cols 1–7, rows 8–14           | Coupling / M19 (102, 336) · heat-gun rack (102, 275)                       |
| Mast 04 (north-centre)  | footing block cols 11–13 r3–4 | Mast station / M20 (416, 176) · tower (384, 99)                            |
| Excavation field (east) | cols 16–22, rows 8–13         | Stake / M23 (480, 272) · target form_a (18,9) · form_b (20,12)             |
| Metal Recovery Yard     | cols 17–23, rows 2–6          | Rig / M24 (624, 160) · tray (746, 122) · Sorting Bench (726, 198)          |
| Uplink posts (NW)       | cols 1–10, rows 2–6           | Post A / M26 (96, 128) · Line Panel (224, 96) · Post B (304, 160)          |
| Return                  | door row 16 cols 11–12        | Airlock (384, 496) — `▼ AIRLOCK — RETURN TO STATION`                       |

Rock ridges: mast footing; Metal Yard west wall (col 16, rows 2–4) and
south ridge (row 7, cols 17–23; entered from the west at rows 5–6);
short ridge row 7 cols 1–4. No maze, no one-way path, no gated door.

## Route guidance

- Stage `exterior_briefing`: Noor's brief ("Ready." → `exterior_work`).
- Stage `exterior_work`: ONE objective line per site in operational order
  (coupling → mast → excavation → rig → uplink → report to Noor); the
  beacon points at the next non-terminal site. A site is terminal for
  guidance once its window is ENTERED, its panel was explicitly stepped
  away from, or it closed — never at an acknowledgement or depletion.
  Order is guidance only — every site is independently enterable; no
  outcome gates another.
- Noor: "I am finished outside." = the one interruption point
  (`endExteriorShift`) → `return_hub`. No antenna reminder is given.
- M (map/log) lists the antenna obligation neutrally once accepted.

## Windows

| Item | Opportunity                     | Window              | Family                      | Entry                                                                               | Closure                                                                                 |
| ---- | ------------------------------- | ------------------- | --------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| M05  | `proto_m05_initiation_o2`       | `m05_initiation_o2` | `proto_m05_initiation_`     | presented at first quiet moment (register `entered` = shown; `initiated` = the act) | fix / censored (left_zone, stage_advanced, review)                                      |
| M19  | `proto_m19_progressive_valve`   | `m19_valve_w1`      | `proto_m19_valve_`          | first act at the coupling                                                           | completed / stopped (`stop_choice`: step_away, ended_shift_outside) / review → censored |
| M20  | `proto_m20_antenna_restoration` | `m20_antenna_start` | `proto_m20_antenna_`        | "Accept the restoration"                                                            | STAYS OPEN — interruption recorded; resume is episode 5 (not this unit)                 |
| M23  | `proto_m23_field_recovery`      | `m23_excavation_w1` | `proto_m23_field_recovery_` | "Begin the excavation" at the stake                                                 | recovered / stopped / review                                                            |
| M24  | `proto_m24_magnet_utility`      | `m24_magnet_w1`     | `proto_m24_magnet_utility_` | "Start the salvage tally" at the rig                                                | completed iff depletion shown + acknowledged; else missing / invalid                    |
| M26  | `proto_m26_channel_disconnect`  | `m26_channel_w1`    | `proto_m26_channel_`        | "Power up the uplink" at a post                                                     | completed iff disconnect demonstrated + acknowledged; else missing/invalid              |

## Field actions

- **C** scans anywhere (secondary telemetry); inside the staked field it
  is refused neutrally unless the M23 window is open (the target is inert
  before the window and stays buried after a stop — a faked "no signal"
  is never shown).
- **D** digs the facing cell on registered terrain (the staked field);
  disturbed ground and belt-full caches persist across scene creations.
- **F** starts a rig cycle only on the operating pad and only inside the
  open M24 window; every committed cycle consumes one deck position.

## Verification

Pure: `e2e/pilot_exterior_models.spec.ts`. Route: `e2e/pilot_yard.spec.ts`,
`e2e/pilot_exterior_isolation.spec.ts`. Frames:
`e2e/pilot_exterior_capture.spec.ts` →
`docs/verification/screenshots-evidence-led-pilot-v2/09-*.png … 21-*.png`.

## Unit 7 presentation (no mechanic change)

- The airlock door shows the PROVISIONAL iris-airlock part-open frame; six
  slate-tinted snowfall tiles (α 0.55; reduced motion: one static frame at
  α 0.3) drift as ground snow at depth −0.1 — under every figure, marker
  and task graphic, never over a measured stimulus (scientific review
  S-M1) — at spots clear of the excavation plot, the coupling collar, the
  uplink posts, the cable flag and the airlock. Mast 04 keeps the damaged
  tower until the WHOLE antenna restoration (outdoor stages and the indoor
  alignment, `m20Complete`) is done, then shows the PROVISIONAL antenna
  with a slow two-frame signal pulse (reduced motion: held) — never while
  the chip reads ALIGNMENT PENDING (scientific review S-M2, OD-9). Area
  signage uses the shared 11 px style (dark text on snow, light text on the
  Metal Yard inset). Scanner signals, dig cells, stations, approach points
  and every window are untouched in code; the rendered stimulus change is
  enumerated in the Unit 7 ledger.
