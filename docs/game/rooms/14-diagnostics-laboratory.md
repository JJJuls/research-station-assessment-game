# Diagnostics Laboratory — pilot zone 3 (signal-analysis incident)

Scene: `src/scenes/DiagnosticsLaboratoryScene.ts`. Sites:
`LAB_STATIONS` in `src/pilot/zoneSites.ts`; doors: `PILOT_DOORS` in
`src/pilot/pilotRoute.ts`. Measurement modules (frozen, never touched by
presentation work): `src/informationProcessing/m15CausalModel.ts`,
`m16ProtocolUpdate.ts`, `m17SyntaxAcquisition.ts`, `m18FaultDiagnosis.ts`,
the console-orientation tutorial, and the M10 hand-over
(`src/pilot/windows/m10ComponentPromise.ts`).

## Route and mechanics (unchanged since evidence-led pilot v2, Unit 3)

- Entry from the Station Concourse (south door, spawn (384, 409.6)); exit to
  the Exterior Recovery Yard through the north airlock (384, 48), spawn on
  return (240, 96).
- Kai at the briefing desk (592, 208) is the route anchor: `lab_briefing`
  → "Understood." → `lab_work`; "I am done here" → `exterior_briefing`.
- The signal-analysis workstation (368, 211.2) shows the case brief (one
  prompt, one option, `pilot_case_brief_reviewed`).
- Console orientation (128, 208): common tutorial, never item evidence.
- Four phase benches, presented in order, each independently enterable
  whenever no other phase surface is open: Evidence Table (128, 352) M15,
  Protocol Console (288, 352) M16, Training Rig (512, 352) M17, Diagnostic
  Board (672, 352) M18. The wall display and the beacon point at the next
  unrecorded phase; the display redraws from the four window states only
  (no scores, no outcomes).
- Noor speaks over the relay: one line per next unrecorded phase (timed
  subtitle, never a dialogue card).

## V4 visual-validity redesign (2026-09-05) — presentation only

Governing document: `docs/game/VISUAL-SYSTEM-V4.md`. No station, door,
spawn, prompt, option, window, event, form or texture-to-mechanic binding
changed. Every coordinate the route specs drive against is the V3 value.

- **Sequence through layout.** The four benches stand on four identical
  4×4-tile bay plates (rows 10–13) along one east–west service aisle in
  front of them (row 12, dashed centre line), numbered 1–4 on the floor at
  each plate's north-west corner. Bays 1–2 sit west of the entrance spine,
  bays 3–4 east of it; the participant reads the order left to right and
  from the numerals, and the beacon/display point at the next one.
- **Progressive salience.** Only the next unrecorded bay carries the cyan
  plate frame and the cyan numeral (plus the existing lamp and beacon);
  recorded bays settle to a quiet frame with a dim numeral and a lit lamp;
  later bays are plain plates with faint numerals. State is glyph +
  position + the display's phase indicator, never colour alone.
- **Circulation grammar.** One north–south spine from the south door to
  the case desk (columns 11–12), the east–west aisle in front of the bays,
  and a painted service lane from the briefing lane west along column 7 to
  the airlock row — the physical route to the exterior that the tests also
  drive (`walkTo(240, 70)`). Spine and aisle are ≥ 3 tiles wide.
- **North zone.** Case desk (workstation under the wall display) on its own
  plate, the orientation terminal in a west plate, Kai's briefing desk in an
  east plate. The wall display is a framed dark panel with the phase
  indicator rasterised at 2×; the trace stays state-driven and calm.
- **South corners.** Rows 14–15 at columns 1–4 and 20–23 become wall
  cells that carry the loose dressing (tool rack, utility cart, seat) so no
  prop that could hide the avatar stands on open floor; the lobby in front
  of the south door is a threshold plate.
- **Labels removed.** `BRIEFING DESK`, `SIGNAL ANALYSIS`,
  `CONSOLE ORIENTATION`, the four `n  BENCH` signs and the two door signs
  are gone; the nearest-target name chip and the projected prompt remain
  the only contextual text in the world view.
- **Noor's relay.** The intercom subtitle moves from the top-right HUD band
  (where it collided with a two-line objective, the feedback banner and
  Kai's dialogue card) to a centred subtitle band above the belt (design
  y ≤ 536), which no other HUD surface uses; the lines are unchanged.
- **Depth.** Plates and lanes on the floor-decal/marking layers, numerals
  on the marking layer, lamps on the world-readout layer, props y-sorted at
  their foot line, the avatar never under a workstation.

E2E lane book (unchanged lanes): spine x = 384 (rows 2–15), briefing lane
y = 252 (x 128–592), bench lane y = 396 (x 128–672), the column x = 240
(rows 2–14) and the return leg y = 456 (x 240–384). The capture waypoint
for the "phase benches" frame is (384, 284) (was (400, 300)).
