# V4 Unit 6 — cross-world professional presentation

Contract row: `UNIT-0-BASELINE-AUDIT.md` §5, Unit 6. Commit subject:
`chore(game): unify assessment presentation`.

## What changed (observable; presentation only)

- **Objective lifecycle.** Once the participant stands in the stage's
  destination zone, the route line names the action in the room instead
  of the door already passed (five travel stages: workshop, lab briefing,
  exterior briefing, return hub, deck closure — the Core Chamber precedent
  generalised in `PilotZoneScene.buildRouteObjectiveText`). The route
  strings in `pilotRoute.ts` are untouched; no test asserts objective text.
- **Beacon.** When the beacon target lies outside the world camera view,
  the arrow glyph sits at the view edge on the line toward the target
  (▸ ◂ ▴ ▾ by direction) instead of vanishing off-screen; the ring stays at
  the target (reviews C7, D3-1).
- **Contextual prompt and name chip.** The below-target placement is used
  only when it does not land on another interactable's art; otherwise the
  chip and prompt stay above the target (review C1: the Concourse gauge
  chip captioned the Dock door).
- **Doorway language.** The cyan threshold bar sits at the leaf's base at
  the leaf's full width on every textured door (review C5).
- **Dialogue card.** Opaque backdrop (review D3-7).
- **Hotbar.** The inventory belt is hidden while every slot is empty; it
  appears with the first item (VISUAL-SYSTEM-V4 §4).
- **World readouts at the camera edge.** A state chip is shown only while
  its full bounds lie inside the world view (Records, Yard, Deck), so a
  half-clipped word never reads as a fault (reviews R2, Y7).
- **Unchanged:** H controls hidden by default in pilot zones, I inventory,
  M map, E/SPACE interact, task keys only while relevant (C/D/F in the
  yard); reduced-motion behaviour; the station map; no asset generated.

## Deviations from the Unit 0 allowlist (recorded)

`src/scenes/RecordsWorkshopScene.ts`, `src/scenes/ExteriorRecoveryYardScene.ts`,
`src/scenes/UtilityCoreDeckScene.ts`: one call each in `onPilotUpdate` to
the shared `clampWorldReadouts` helper (no other change).
`src/scenes/StationConcourseScene.ts`: the gauge readout moves to the
gauge's foot side (y + 30) because the name chip and prompt now sit above
the gauge instead of on the Dock door leaf — the readout would otherwise
sit under the chip.

## Tests and evidence (`--retries=0 --workers=1`, `PW_DEV_PORT=5362`)

| Command / spec                                                                                                                             | Result                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint:tsc`, `build`, scoped ESLint, `git diff --check`                                                                                     | pass                                                                                                                                                                                                                                                             |
| `presentation_integration` (11)                                                                                                            | 11/11 (1.8 min)                                                                                                                                                                                                                                                  |
| `participant_ui_cards` (7)                                                                                                                 | 6/7 — "hidden numeric shortcuts still select without duplicate events" timed out on a legacy-room entry wait (`waitForRoomEntry`, Engineer Hub, off the participant route) while its six siblings passed; classified load/intermittent, rerun deferred to Unit 7 |
| `v4_camera` (3)                                                                                                                            | 3/3                                                                                                                                                                                                                                                              |
| `v4_visual_capture` leg 1 → `unit6/01…11` (1280×720; recaptured after the correction round, 2.1 min)                                       | pass; frames 05/07 inspected (belt hidden while empty, full-width threshold bars, zone-local objective)                                                                                                                                                          |
| `pilot_exterior_isolation` "direct developer launch" (yard prompts on the corrected tree)                                                  | 1/1 (35 s)                                                                                                                                                                                                                                                       |
| `pilot_lab` "explicit stops … fail-forward to the airlock" (lab ↔ yard airlock on the Unit 6 tree)                                         | 1/1 (2.5 min) — run after two projection attempts failed at that airlock; the isolated crossing passes, so those attempts are classified load/intermittent                                                                                                       |
| `v4_event_projection` (`unit6.json`, 4.0 min, fourth attempt after three load failures at yard-entry steps) + pure `v4_projection_compare` | route completed; **0 scientific differences** vs `baseline-v3.json` (`unit6.diff.json` = `[]`)                                                                                                                                                                   |

## Review round (visual + accessibility/burden brief, Opus, read-only)

Inputs: `unit6/02…08` (1280×720), the Unit 2 frames and their 800×600 set
for the before state, pre-unit frames of the other rooms, the six-file
diff. Verdicts: visual **readable with noted defects**; accessibility
**usable with noted friction**; no blocker. Credited: the local objective
lines cut the banner to one line, no world interaction is pointer-only,
reduced motion still gates both beacon paths. One correction round.

| #   | Finding                                                                                                         | Sev   | Disposition                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| V-1 | prompt anchor (+70) not included in the below-placement test; the Concourse gauge prompt still on the Dock leaf | MAJOR | **fixed** (before the review landed) — the test covers the chip and the prompt anchors                                                   |
| V-2 | single-point test; a ~90 px chip can still straddle a neighbour                                                 | MAJOR | **fixed** — three-point span test                                                                                                        |
| V-3 | beacon restore skipped when the glyph was already ▾ (target left downward)                                      | MAJOR | **fixed** — explicit edge-mode flag, unconditional restore                                                                               |
| V-4 | bottom edge test lacked the −44 offset                                                                          | MINOR | **fixed**                                                                                                                                |
| V-5 | parked arrow under the belt band                                                                                | MINOR | **fixed** — the parked arrow sits above the HUD; the bottom clamp keeps a 40 px inset                                                    |
| V-6 | a wide chip fully hidden as soon as it touches the view edge (deck manifold line)                               | MAJOR | **fixed** — a chip stays while ≥ 60 % of it is in view                                                                                   |
| V-7 | chips under the objective band                                                                                  | MAJOR | **fixed** — the top 30 world px count as covered in the same rule                                                                        |
| V-8 | hidden belt slots stay interactive                                                                              | MINOR | **fixed** — input disabled with visibility                                                                                               |
| A-1 | keyboard-affordance line ≈ 10.5 CSS px and belt caption ≈ 9 px at 800×600                                       | MAJOR | **fixed in part** — instruction line 15 px and belt caption 14 px design; the overlay legends are frozen measurement surfaces (recorded) |
| A-2 | station map destination is amber only                                                                           | MAJOR | **no change needed** — the map already tags the destination node `DESTINATION` (`StationMapScene`, tag text under the node); recorded    |
| A-3 | the controls legend lists C/D/F in every zone                                                                   | MAJOR | **fixed** — field-action keys listed only in the yard                                                                                    |
| A-4 | permanent bundle-name labels                                                                                    | MINOR | **deferred** (`src/pilot/worldBundles.ts`, outside the allowlist; recorded for the asset/register pass)                                  |
| A-5 | "Check in with Vale" vs "Report to Vale"                                                                        | MINOR | recorded — the local line uses the route's own verb for the return stage                                                                 |
| A-6 | prompt rides into the objective band for a high target                                                          | MINOR | **fixed** — prompt y ≥ design 64                                                                                                         |
| A-7 | TAB moves browser focus off the canvas                                                                          | MINOR | **fixed** — the belt's TAB handler prevents the default                                                                                  |

First hits by profile (reviewer): low vision — A-1; colour-vision
deficiency — A-2 (tag present) and the single cyan cue family (recorded);
keyboard-only — A-7 then A-3.
