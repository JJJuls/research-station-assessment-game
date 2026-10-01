# Workshop Return — episode 5 (evidence-led pilot v2, Unit 5)

Episode 5, "Return, Revision & Handover" (sheet 11 row 5): the ONE
purposeful return of the route — Recovery Yard airlock → Diagnostics
Laboratory → Station Concourse (`src/scenes/StationConcourseScene.ts`) →
Records Workshop (`src/scenes/RecordsWorkshopScene.ts`) on the return
shift. Hosts **M03(2), M07-end, M09-end, M10-end, M20 resume/end, M21, M22
and the M25 questionnaire-primary handoff**. Pure models:
`src/pilot/return/*`, `src/pilot/exterior/m20AntennaModel.ts`; window
adapters: `src/pilot/windows/returnWindows.ts`; surfaces:
`src/pilot/windows/returnSurfaceModels.ts`.

## Return corridor and hub

- Yard → Laboratory: the same airlock (bidirectional). Laboratory →
  Concourse: south door. Kai (laboratory) and Noor only redirect at
  `return_hub`; nothing gates the way back.
- Concourse on the return: the wall console reads `STATION STATUS ·
exterior shift logged · return shift open`; the monitor gauge chip shows
  the CHANGED reading (`loop 1.4 bar ▼ · bus 26.1 V ▼`) — state, never a
  directive. Kai stands beside the desk (episode-5 only).
- Vale's check-in (→ `workshop_return`): "Back inside — good. The exterior
  shift is logged. Anything you accepted earlier is still yours to close.
  The return shift finishes in the Records Workshop, west door." — the
  same neutral "still yours" mention as check 1's incident beat (equal
  reminder exposure; no gauge, no component named).
- Kai: neutral line; the handover is an option the participant chooses
  while carrying the component (Kai never asks). Feedback: "Received —
  logged with the calibration set."

## Workshop topology (25 × 19, workshop theme) — return-shift stations

| Station              | Tile (px)           | Approach (44 px) | Window                                           |
| -------------------- | ------------------- | ---------------- | ------------------------------------------------ |
| Label Press B        | (9, 8.5) → 288, 272 | below (288, 316) | M03 occasion 2 (`m03_tools_o2`, Station 080 U14) |
| Calibration Bench    | (11, 3) → 352, 96   | below (352, 140) | M07 end (`m07_calibration_end`)                  |
| Station Feed Console | (15, 7) → 480, 224  | lane (480, 268)  | M20 resume/end (`m20_antenna_resume`)            |
| Relay Bench          | (6, 12) → 192, 384  | below (192, 428) | M21 (`m21_manual_w1`)                            |
| Shift Report Desk    | (19, 10) → 608, 320 | lane (608, 276)  | M22 (`m22_report_w1`)                            |
| Outbound Handover    | (19, 3) → 608, 96   | west (576, 96)   | tray (route dressing) + M25 (`m25_probe_w1`)     |
| Work Order Board     | (20, 5) → 640, 160  | below (640, 204) | stage anchor (sign-off only)                     |

Placement follows the D-V2-1 rule (no other interactable nearer than the
station at its approach point, ±12 px) and every walking column clears
the two machinery blocks (x 416–543 at rows 4–5 and 12–13). Every station
exists in every stage; the return windows open only at stage ≥
`return_hub` (`workshop_return` for the guided order). World chips under
the console, bench, desk and tray reflect PERSISTED participant state on
every scene creation.

## Route guidance

- `return_hub`: "Return inside to the Concourse and check in with Vale."
- `workshop_return`: "Finish the shift in the Records Workshop, then sign
  the board." Guided order (beacon only, never a gate): Press B → Relay
  Bench → Shift Report Desk → Outbound Handover → board. The **feed
  console (M20 resume) and the calibration bench (M07 natural return) are
  never guided**: both opportunities stay uncommanded. The board copy
  (`RETURN_BOARD_BODY`) names press batch B, the relay unit, the shift
  report and the handover — never the antenna or the calibration.
- The mission log (M) lists the antenna obligation, the calibration
  project, the watch and the promise neutrally (the one authorised
  reminder each); the beacon hides on arrival.
- Sign-off ("Sign off — close the shift here.") → `deck_closure`: the
  objective points at the Utility Deck; the core console offers only
  "Return to the station" before that stage (Unit 1 gate unchanged; no
  closure is implemented in this unit).

## Windows

| Item | Opportunity                     | Phase / window                                        | Entry                                                                                                                                         | Closure                                                                                                                                                                                                                                                                                                                                    |
| ---- | ------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M03  | `proto_m03_tools_b`             | occasion `o2`, `m03_tools_o2` (presented on entry)    | the label roll is moved to the feed (the taught movement); the third press cycle puts the three tools on the surface (identical fixed layout) | the participant's first close of the panel = the first departure, terminal (focused exposure < 2000 ms is RECORDED as `exposure_sufficient: false`, never a validity marker); a run never completed → absent at the review (Station 080 U14; as-built record in `docs/verification/station-080-m26/M01-M26-IMPLEMENTATION-REGISTER.md` §4) |
| M07  | `proto_m07_calibration_project` | `end`, `m07_calibration_end` (presented on entry)     | bench opened; a missing start logs `end_opened_without_start`                                                                                 | 6/6 → completed; review → completed observation (completion false, `start_state` recorded); never opened in either phase → absent                                                                                                                                                                                                          |
| M09  | `proto_m09_monitor_watch`       | `end`, `m09_check_2` (due at `return_hub`)            | gauge read while due                                                                                                                          | read → check 2 completed; review → completed observation (false); never due → null                                                                                                                                                                                                                                                         |
| M10  | `proto_m10_component_promise`   | `end`, `m10_promise_handover` (from the interruption) | Kai's handover option while carrying                                                                                                          | handed over → completed; review → `unfulfilled_at_review` (completed observation)                                                                                                                                                                                                                                                          |
| M20  | `proto_m20_antenna_restoration` | `end`, `m20_antenna_resume` (presented on entry)      | "Resume the restoration" at the console; console stages power→align→lock                                                                      | all outdoor + console stages → completed; review with the resume presented → completed observation; never presented → censored (Unit 4)                                                                                                                                                                                                    |
| M21  | `proto_m21_manual_repair`       | `m21_manual_w1`                                       | bench surface opened                                                                                                                          | FIT → completed (`correct_rule_application` raw); SET ASIDE → completed observation (stopped); review → censored; never opened → absent                                                                                                                                                                                                    |
| M22  | `proto_m22_report_revision`     | `m22_report_w1`                                       | desk surface opened                                                                                                                           | accepted → completed; WITHDRAW after acknowledgement → completed observation; unacknowledged setback → invalid; review → censored                                                                                                                                                                                                          |
| M25  | `proto_m25_belief_probe`        | `m25_probe_w1` (presentation only)                    | notice available at the handover desk (register `entered` = shown)                                                                            | acknowledged → completed presentation record; review → completed presentation record (`handoff_acknowledged` false)                                                                                                                                                                                                                        |

### M20 start histories at the console

`valid` (accepted + interrupted) → resume presented; `exited` (accepted,
never interrupted — impossible at `return_hub` on the participant route) →
"exterior shift not yet logged"; `missing` (never accepted, developer
launch) → "no feed-alignment job on file"; `invalid` (contaminated /
invalid start) → presented, record stays invalid; `technical_failure` →
"offline — fault logged"; `closed` → "job closed for this shift". Every
unavailable history logs `resume_unavailable` once per reason; no start
event is ever fabricated; completion is never manufactured (an indoor
completion with an outdoor stage remaining stays `completion: false`).

### M21 relay bench

Storm-damaged distribution relay unit: plate (INSPECT to read the code),
posts J1–J4, line selector L1–L3 (initial L2), BENCH TEST (informative:
jumper mismatch / line class mismatch / pass — never which post), FIT,
SET ASIDE, LEAVE. Drawer manual: §1 identify → §2 jumper rule → §4 variant
table; §1 → §3 selector rule; TEXT and DIAGRAM modes with the same
content. Forms `form_a` (RELAY 7K/B → J1 J3, L3) and `form_b` (RELAY 7R/C
→ J2 J4, L1): matched load. The fitted unit is a physical output
(`relay_unit`) — belt full → a recoverable bench bundle.

### M22 shift report desk

Six fixed subsystem lines, four ordered slots, ≥ 3 lines to submit. The
first valid submission is RETURNED with one standardised criterion
(work-order tags from the register that only now opens). ACKNOWLEDGE
before editing; attach the matching tag to every placed line; resubmit.
Unchanged resubmissions return the same note (counted). Forms differ only
in tray order. WITHDRAW is the explicit stop.

### M25 handoff shell

No wording is authorised in the repository for an in-game probe: the
handover desk offers the transparent notice (`M25_HANDOFF_TEXT`) and one
acknowledgement; `direct_belief_probe` is recorded as `null` with
`administration: questionnaire_primary_pending_external`. The exact item
stays in the external questionnaire.

## Verification

Pure: `e2e/pilot_return_models.spec.ts`. Route: `e2e/pilot_return.spec.ts`
(3 tests). Frames: `e2e/pilot_return_capture.spec.ts` →
`docs/verification/screenshots-evidence-led-pilot-v2/22-*.png … 34-*.png`.

## Unit 7 presentation (no mechanic change)

- Interior doors show the PROVISIONAL door leaf instead of the bare cyan
  marker; south-wall dressing uses the PROVISIONAL pipe/grille modules;
  area signage uses the shared 10 px style; the world prompt, label chips
  and the hotbar caption hide while any work surface is open. Stations,
  approach lanes and windows are unchanged.

## World V2 rebuild (professional-world-rebuild-v3, 2026-09-13)

The Records Workshop is the first zone rebuilt past the rescue slice:
a **43×12 two-bay painted hall** (machine bay west, records office east,
joined by the vestibule the two plates' facing painted doorways form) —
`public/assets/world-v2/plates/workshop-plate.png` (1376×384, two
`create_image_pro` generations stitched; provenance in the world-v2
manifest). Presentation only:

- **No window, event, form, option label, prompt body, feedback string
  or offer text changed.** Every M-window opens through the same
  registry ids and surfaces; the M04 debris offsets, prompts and chip
  texts are verbatim.
- **All coordinates moved** into the shared machine-audited book
  (`src/pilot/zoneSites.ts` WORKSHOP_STATIONS/WORKSHOP_SITES/
  WORKSHOP_SPAWN; layout `src/world/layouts/workshop.ts`; registry
  `WORKSHOP_REGISTRY`). Audit rules: 32×42 body standability over the
  cell grid for every approach ±12 px landing, nearest-wins radius 72
  strictly own-station at every landing, spawn ≥ 80 px from the door and
  outside every radius, bundles outside every station radius (keyboard
  reachability), debris pieces within reach of standable floor, chute
  container radius reachable, full BFS connectivity, door clearance
  > 96 px.
- **Lanes** (e2e driver discipline, `workshopVia`): the cutter island is
  passed on the north lane (y ≈ 156, x 320–608), the vestibule crossed
  at y ≈ 240, the office travels the y ≈ 252 south lane.
- The M04 disposal bin is baked beside the cutter (container radius at
  the painted bin); the dispose loop cost is comparable to the previous
  geometry (~in-place from the cutter approach).
- Verification: pure registry/geometry specs (11), plus
  `e2e/world_v2_workshop_look.spec.ts` — every audited approach shows
  its own prompt in-engine, vestibule crossed both ways, east door
  round-trip with reflex-SPACE clearance.

## Station 080 U14-D2 — the cutting annex (2026-09-30)

This section supersedes, for the sample cutter and the disposal bin only,
the two bullets above about the cutter island lane and the bin baked
beside the cutter. Every other station, approach, window and text of the
room is unchanged.

The Records Workshop is now **43×19 tiles (1376×608 px)**. The two-bay
hall keeps its place (rows 0–11); a **13×6-tile cutting annex** lies
south of the machine bay and holds the M04 cutter and bin. The lower band
east of the annex (south of the records office) and west of it is hull
and exterior — not floor.

| Element             | Geometry (room px unless noted)                                     |
| ------------------- | ------------------------------------------------------------------- |
| Annex floor         | tiles `[6, 12, 13, 6]` — x 192–608, y 384–576                       |
| Doorway region      | tiles `[11, 10, 3, 2]`; open between the jambs x 368–432, y 320–384 |
| Jamb solids         | `[352, 320, 16, 64]`, `[432, 320, 16, 64]`                          |
| South wall row      | y 576–608                                                           |
| Sample cutter       | anchor (400, 456); approach (400, 423) — operated from the north    |
| Cutter solid        | tile units `[11, 14.1, 3, 2.9]`                                     |
| Disposal bin        | anchor (400, 556); tile units `[11.7, 16.8, 1.6, 1.2]`              |
| Scatter origin      | (400, 456)                                                          |
| Job 1 pieces (west) | offcut (228, 476), swarf tray (212, 516), blade wrap (212, 556)     |
| Job 2 pieces (east) | offcut (572, 476), swarf tray (588, 516), blade wrap (588, 556)     |
| Reach               | 64 px for keyboard pickup, pointer pickup and the bin               |

- **Where the doorway is.** The decorative south tool bench between the
  component locker and the assembly bench is gone; the 64 px doorway is
  in its place. The old cutter island, its platform and the attached bin
  are painted out — that bay is plain floor with its painted marking, and
  the south lane now runs the whole hall.
- **Mirror layout.** The annex floor and the collision footprints of the
  cutter, the bin and both jambs are symmetric about x 400 (the painted
  cutter is a machine, not a mirror image). Job 1's three pieces lie west
  of the cutter, Job 2's three at the mirrored places east of it, so the
  two jobs are laid out alike: the same distances to the cutter, to the
  bin and to the doorway, and the same set of positions to pick a piece
  up from. Not mirrored: the camera. The room's west edge stops the view
  at the west cluster, so job 1's places can lie outside the view while
  the participant stands at job 2's far pieces, and not the other way
  round (register §5.231).
- **Finding the cutter.** The cutter is not visible from the hall: the
  participant sees the lit doorway between the Component Locker and the
  Assembly Bench and the cutter only after walking through it. There is
  no sign. Whether the doorway needs a way-finding cue is open for the
  owner (register §5.231).
- **One-pixel collision treatment of the bin.** The approved bin figure
  is x 374.4–425.6. Rounding position and width separately would give
  x 374–425 and leave the east side one pixel wider than the west. The
  bin is therefore authored as the pixel solid `[374, 538, 52, 32]`
  (x 374–426) — exact symmetry about x 400 was given precedence by the
  research owner. The visual anchor stays (400, 556).
- **Cutter approach.** (400, 423) stands 4 px north of the machine, so
  the southern part of the usual ±12 px landing box is the cutter itself.
  Every place in the box the avatar can stand on names the cutter.
- **No piece is reachable from another station's place**, from the
  doorway or from the hall: every place a piece can be picked up from is
  inside the annex, more than 76 px from the bin anchor and outside the
  cutter's 72 px range. Leaving the annex for the hall does not close a
  cutting job by itself (the departure rule is unchanged — register §4).
- **Entry-state version.** `m04-cutting-v4` (v1 Unit 14, v2 U14-C, v3
  never committed or released, v4 this annex). Event names, fields and
  scoring are unchanged.
- **Driver discipline** (`workshopVia`, e2e only): the annex is entered
  and left on the door column x 400 (hall side y 256, annex side y 416);
  inside it the driver walks the clear row y 416 and the columns beside
  the cutter.
- **Plate.** `public/assets/world-v2/plates/workshop-plate.png`
  (1376×608), composed locally from the kept v2 source by
  `scripts/world-v2/plate_edits.py workshop`; provenance in
  `docs/game/world-v2/ASSET-PROVENANCE-REGISTER.md` and the world-v2
  manifest. Final SHA-256 `473f1b4f…` (U14-D2 closeout, 1 October
  2026). Status PROVISIONAL.
- **Verification.** Pure geometry: `e2e/m04_cutting.spec.ts`
  ("U14-D2: measured from every reachable avatar position …"). Browser:
  `e2e/u14_correction.spec.ts`, `e2e/m03_m04_route.spec.ts`,
  `e2e/world_v2_workshop_look.spec.ts`; collision of the whole room
  against the pure model (every face of every solid, both lane rows in
  both directions, no trap): `e2e/collision_audit.spec.ts`; results in
  `docs/verification/station-080-m26/UNIT-LOG.md` (U14-D2 and its
  closeout).
