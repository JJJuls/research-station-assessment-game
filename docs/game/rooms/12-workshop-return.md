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

| Station              | Tile (px)           | Approach (44 px) | Window                                       |
| -------------------- | ------------------- | ---------------- | -------------------------------------------- |
| Label Press B        | (9, 8.5) → 288, 272 | below (288, 316) | M03 occasion 2 (`m03_reset_o2`)              |
| Calibration Bench    | (11, 3) → 352, 96   | below (352, 140) | M07 end (`m07_calibration_end`)              |
| Station Feed Console | (15, 7) → 480, 224  | lane (480, 268)  | M20 resume/end (`m20_antenna_resume`)        |
| Relay Bench          | (6, 12) → 192, 384  | below (192, 428) | M21 (`m21_manual_w1`)                        |
| Shift Report Desk    | (19, 10) → 608, 320 | lane (608, 276)  | M22 (`m22_report_w1`)                        |
| Outbound Handover    | (19, 3) → 608, 96   | west (576, 96)   | tray (route dressing) + M25 (`m25_probe_w1`) |
| Work Order Board     | (20, 5) → 640, 160  | below (640, 204) | stage anchor (sign-off only)                 |

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

| Item | Opportunity                     | Phase / window                                        | Entry                                                                    | Closure                                                                                                                                                     |
| ---- | ------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M03  | `proto_m03_reset_b`             | occasion `o2`, `m03_reset_o2`                         | third press cycle seeds the five residuals (identical fixed layout)      | panel close = the observation (exposure < 2000 ms is RECORDED as `exposure_sufficient: false`, never a validity marker); review: generic Final Core closure |
| M07  | `proto_m07_calibration_project` | `end`, `m07_calibration_end` (presented on entry)     | bench opened; a missing start logs `end_opened_without_start`            | 6/6 → completed; review → completed observation (completion false, `start_state` recorded); never opened in either phase → absent                           |
| M09  | `proto_m09_monitor_watch`       | `end`, `m09_check_2` (due at `return_hub`)            | gauge read while due                                                     | read → check 2 completed; review → completed observation (false); never due → null                                                                          |
| M10  | `proto_m10_component_promise`   | `end`, `m10_promise_handover` (from the interruption) | Kai's handover option while carrying                                     | handed over → completed; review → `unfulfilled_at_review` (completed observation)                                                                           |
| M20  | `proto_m20_antenna_restoration` | `end`, `m20_antenna_resume` (presented on entry)      | "Resume the restoration" at the console; console stages power→align→lock | all outdoor + console stages → completed; review with the resume presented → completed observation; never presented → censored (Unit 4)                     |
| M21  | `proto_m21_manual_repair`       | `m21_manual_w1`                                       | bench surface opened                                                     | FIT → completed (`correct_rule_application` raw); SET ASIDE → completed observation (stopped); review → censored; never opened → absent                     |
| M22  | `proto_m22_report_revision`     | `m22_report_w1`                                       | desk surface opened                                                      | accepted → completed; WITHDRAW after acknowledgement → completed observation; unacknowledged setback → invalid; review → censored                           |
| M25  | `proto_m25_belief_probe`        | `m25_probe_w1` (presentation only)                    | notice available at the handover desk (register `entered` = shown)       | acknowledged → completed presentation record; review → completed presentation record (`handoff_acknowledged` false)                                         |

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
