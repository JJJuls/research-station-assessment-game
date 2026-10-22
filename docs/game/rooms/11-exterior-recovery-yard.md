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

| Item | Opportunity                     | Window              | Family               | Entry                                                                                                    | Closure                                                                                                                                                       |
| ---- | ------------------------------- | ------------------- | -------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M05  | `proto_m05_start_o2`            | `m05_start_o2`      | `proto_m05_start_`   | Noor's guy-line flag job, accepted after her briefing (Unit 6); clock from the usable start control      | started / deferred / exited / cap (60 focused s) / interrupted — register M05 (`m05_start_latency`)                                                           |
| M19  | `proto_m19_progressive_valve`   | `m19_valve_w1`      | `proto_m19_valve_`   | first act at the coupling                                                                                | completed / stopped (`stop_choice`: step_away, ended_shift_outside) / review → censored                                                                       |
| M20  | `proto_m20_antenna_restoration` | `m20_antenna_start` | `proto_m20_antenna_` | "Accept the restoration"                                                                                 | STAYS OPEN — interruption recorded; resume is episode 5 (not this unit)                                                                                       |
| M23  | `proto_m23_excavation_series`   | `m23_plots_w1`      | `proto_m23_plots_`   | U23: the stake's brief, both example pages and the first usable plot selector (the one measured opening) | per plot recovered / stopped / fault; the series at the shift end, the review or once both plots are terminal — see "Unit 23" below                           |
| M24  | `proto_m24_rig_continuation`    | `m24_rig_w1`        | `proto_m24_rig_`     | "Start the salvage tally" at the rig; after the depletion the panel IS the expected-outcome check (U12)  | passed check ⇒ the 30 s focused continuation (Finish / bench / cap / shift end) completes; never depleted ⇒ missing; check undecided or failed ⇒ invalid      |
| M26  | `proto_m26_uplink_continuation` | `m26_uplink_w1`     | `proto_m26_uplink_`  | "Power up the uplink" at a post; after the disconnect Post A / the panel IS the check (U12)              | passed check ⇒ the 30 s focused continuation (Finish / Post B / cap / shift end) completes; never disconnected ⇒ missing; check undecided or failed ⇒ invalid |

## Field actions

- **C** scans anywhere (secondary telemetry). U23: the two excavation
  plots' targets are inactive until a plot is selected and in work; the
  series' own scan reads from where the participant stands (strength and
  a per-plot trend, never a direction) and is refused with its exact line
  outside the selected plot's search region, on a paused, pending or
  terminal plot, during a running action or the cooldown. Inside a plot
  rectangle before the series is opened, or after it closed, a C or D is
  refused with the same pinned line and recorded (`plot_not_active` /
  `plot_terminal`) — never a reading over an inactive target: no component
  signal leaks before the opening or after a stop.
- **D** digs the highlighted facing cell on registered terrain. U23: the
  plots' dig zones are enabled only for the selected plot in work; the
  first empty NEW cell of a plot is its genuine failure (the panel opens);
  the keyed cell recovers the component into the field tray (decision F —
  never the belt, never a cache); dug cells persist in the series state
  across scene creations.
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

## V4 visual-validity redesign (2026-09-05) — presentation only

Governing document: `docs/game/VISUAL-SYSTEM-V4.md`. No site, door, spawn,
prompt, option, window, event, form, target cell, scan spot, dig plot,
cache, deck state or re-entry behaviour changed; the C scan, D dig and F
winch mechanics and the M05/M19/M20/M23/M24/M26 opportunities are the
V3 implementation untouched. The grid (rock ridges, compound, footing,
airlock) is unchanged, so every e2e lane is unchanged by construction.

- **Weather.** Both ambient snowfall layers are gone (the tween flakes and
  the `plv1-fx-snowfall` loop). The storm reads through static composition:
  five drift ridges along the ridges and walls, debris plates at the wall
  bases, the disturbed ground and footprints that were already there. The
  exterior floor's per-pixel speckle is calmed (theme noise 0.5 → 0.2 in
  `src/world/proceduralTilesets.ts`, exterior theme only).
- **One service path.** A cleared lane in packed snow (darker plate with an
  edge line) links the airlock threshold and apron → the coupling spur
  (west, row 11) → the spine north to the mast footing → the east spur to
  the excavation stake and the compound gate column → the gate lane into
  the Metal Recovery Yard (row 6) → the north-west lane (column 7 → row 5)
  to the uplink posts. It follows the operational order of the objective
  line and the beacon; the way back is the same spine to the apron and the
  threshold plate in front of the airlock.
- **Zones by terrain.** Apron plate (rows 12–15), cleared darker ground
  inside the excavation stakes (the dashed cyan outline still marks the
  window state), compound gravel with an edge line and the rig pad under
  the rig, both on the floor-decal layer so a figure is never drawn under
  the yard floor (they sat at depths 0.5/0.6 inside the actor range).
- **Labels removed (10).** `FIELD UPLINK POSTS`, `POST A · primary`,
  `POST B · backup`, `COOLANT LINE — COUPLING`, `heat gun`,
  `EXCAVATION FIELD`, `METAL RECOVERY YARD`, `tray`, `SUPPLY CRATE`,
  `▼ AIRLOCK — RETURN TO STATION`. "Primary/backup" stays in the uplink
  brief and prompt bodies (unchanged text). The nearest-target name chips
  and the projected prompt remain.
- **State readouts kept, restyled.** The coupling, mast, rig and line A/B
  chips (task state the models drive; their text is unchanged) render in
  the environment register, rasterised at 2×, sorted just below the foot
  line of the prop they annotate; the mast chip moved up 11 px onto the
  rock edge so the tower never overlaps it. The depletion banner keeps its
  above-player depth (state statement).
- **Depth.** Dug cells, the plot outline, the conduit and the mast feed
  lines move from the foreground depths (1–2, which drew over the avatar)
  to the floor-marking layer; the coupling dial to the world-readout layer.

## Unit 23 — M23 two-plot post-failure excavation protocol (2026-10-18)

Administration `m23-plots-v1` under research-owner decision D-U23-1 (16
October 2026, all nine choices approved; the A-adjusted layout). The
single-plot `proto_m23_field_recovery` binding leaves the route; its model
and adapter files stay in the tree unchanged (dormant). Nothing here is
scientifically validated: the two plots are clustered observations of one
series in one yard visit, and the feature row is a count with its
denominator beside it, never a ratio and never a trait.

- **The field (World V3 yard, 32 px tiles).** Plot A cols 27–33 × rows
  8–13, plot B cols 34–40 × rows 8–13 (42 cells each, a shared border at
  col 33 / 34). Each plot holds ONE buried component at a literal keyed
  cell by its counterbalanced form (A: `a1` (29, 9) / `a2` (31, 12); B:
  `b1` (38, 9) / `b2` (36, 12)); every other cell is empty. The stake is
  the series' station at (1072, 488) with its registry approach at
  (1116, 488) (contract §13 R1; the former stake field, debris-c and the
  two lamps lamp-a / lamp-e are removed from the painted props). While a
  plot is in work the camera holds a fixed frame (A scroll (656, 172), B
  scroll (880, 172), zoom 2) and the mast chip is masked from the world
  readouts; ordinary follow and the full chip list return on every pause.
- **The qualifying region (contract §10 F6).** A stance qualifies for the
  selected plot when the body fits there and either the point lies inside
  the plot's rectangle or one of the four cardinal selector probes
  (−27, +4) / (+27, +4) / (0, −28) / (0, +36) lands inside it — and it
  never qualifies inside the OTHER plot's rectangle. Scan and dig are
  admitted only on the selected plot in `searching`; the refusals
  (`plot_not_active`, `plot_terminal`, `choice_pending`,
  `outside_scan_region`, `outside_plot`, `already_dug`, `action_busy`,
  `cooldown`) each carry one fixed line and are never a resolution.
- **The surface (`m23_excavation_field`, the standard frame).** E at the
  stake: the brief (with the closure explanation), CONTROL EXAMPLE (page
  1: the visible beacon, 80 px → `50 / 100 — MODERATE`; page 2: the
  component cell and the empty cell), OPEN PLOT PANEL → the selector —
  the first USABLE selector is the one measured opening and addresses the
  yard guidance (objective
  `Excavation field — two staked plots, east (E at the stake).`). The
  selector lists both plots in their assigned order with OPEN / RESUME /
  STOP (STOP asks once, BACK returns), HELP (the example again) and STEP
  AWAY (= ESC: a pause). P / the pad's PANEL reopens it from the field.
- **Work on a plot.** OPEN from outside the region: `approaching` under
  ordinary follow until the first body-valid entry
  (`search_region_entered`); inside: `searching` at once. The field HUD
  shows the plot's scanner line, its last dig and facing cell (at most four
  rendered rows), the field tray on its own plate below (round 3) and the
  eight-control pad (LEFT / RIGHT, UP / DOWN, SCAN / DIG, HELP /
  PANEL). On the load's first fixed-frame entry, by either route, the
  pinned field-controls line shows as two verbatim parts (4 s each,
  nothing blocked), then the cell-label help once; while the yard owns a
  fixed frame the stake's own floating prompt is hidden (the stake still
  answers E / Space; every other station's prompt is untouched — the HUD
  sits below the prompt layer and its readout rows avoid the band a
  foreign prompt occupies, so the mast's prompt beside Plot A's west ring
  and the scanner readout are readable at once; round 4). A scan
  takes 1000 ms, a dig 1500 ms; strength =
  round(100 · clamp(1 − d / 160)) with the bands NONE / FAINT / MODERATE /
  STRONG and the trend CLOSER / FARTHER / SAME / NO COMPARISON against the
  same plot's previous reading. The first empty NEW cell is the plot's
  genuine failure: the first-failure panel (CONTINUE SEARCH / STOP THIS
  PLOT on their assigned sides, a neutral landing, HELP, STEP AWAY)
  commits on ONE fresh activation after the 400 ms settle; the choice
  stays pending across STEP AWAY and RESUME with the same identity.
  Leaving the region pauses the plot once; walking back never resumes it.
  C / D anywhere in a plot's exact qualifying region (the rectangle and
  its boundary ring) are the series' own refusals in every non-live
  status — never an ordinary scan or dig over an inactive target. The
  forms, the row order and the first-failure option order come from ONE
  joint assignment of the session id over the sixteen cells (round 3).
- **Closures.** A plot closes `recovered` (the component to the tray),
  `explicit_stop` (the direct STOP, or the confirmed selector STOP), at
  Noor's shift end (`shift_end`), at the review (`review`) or by a fault
  (`technical_failure`, that plot only). The series closes once both plots
  are terminal, at the shift end or at the review; a page reload after the
  measured opening locks the stake for that load (one line, no restart).
- **The feature row (`m23_continuations_after_failure`, register §3
  unchanged).** Per plot with a genuine failed dig: 1 when a further
  executable search action resolved after CONTINUE; 0 on STOP (direct or
  confirmed) or an informed participant shift end after the usable
  choice; unknown at the review, on an unpresented choice or without a
  recorded closure explanation. E(c): while any valid eligible plot is
  unknown the value and numerator are null with the full denominator
  (`interrupted`, `eligible_response_unresolved`); no failed dig ⇒
  `no_eligible_event`; a technically invalid plot is excluded with the
  censor flag. Family `proto_m23_plots_` (27 suffixes) — provisional
  telemetry (see `SCORING-AND-EVENT-ADDENDUM-v1.md` §2 "U23").
- **Verification.** `e2e/m23_plots.spec.ts` (M23 pure, extraction,
  browser, STOP, boundaries, cancellation, layout at 800 × 600 and
  1280 × 720) with `e2e/m23Helpers.ts`; the route specs re-expressed for
  the two-plot protocol. Evidence outside the repository (the U23 evidence
  directory); the unit's record in `UNIT-LOG.md` "U23" and the register's
  §4 "Unit 23".
