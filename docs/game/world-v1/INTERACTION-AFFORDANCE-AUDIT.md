# Interaction-affordance audit — current world (pre-rebuild)

Evidence: the `before-1280x720` capture set under
`docs/verification/professional-world-v1/`, the V4 frames, and the scene
sources at `867c4d5`. Class = what the object _would_ be under the World V1
grammar; Defect = why the current presentation fails the grammar.

| Zone       | Object (source)                                                  | Class now (de facto)               | Defect                                                                                                                                             |
| ---------- | ---------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dock       | Arrival Terminal (`DockScene.ts:118`)                            | active                             | reads like every other prop; name chip + `SPACE / E — interact` + pulse at once                                                                    |
| Dock       | movement marker ring (`DockScene.ts:254`)                        | guidance                           | a floating cyan ring on an empty floor; disappears without an in-world reason                                                                      |
| Dock       | crate stack on open floor (`DockScene.ts:229`)                   | decorative                         | isolated crate in an empty tiled hall (finding 3); collides on wall cells but looks walkable                                                       |
| Concourse  | Vale (`StationConcourseScene.ts:217`)                            | active                             | halo ring under the NPC + arrow + name chip + prompt at once                                                                                       |
| Concourse  | Plan Board / Quality Packet / Incident Desk (`:252–299`)         | active (guided)                    | identical cyan-marker treatment; equal salience with everything else                                                                               |
| Concourse  | Monitor Gauge (`:302`)                                           | optional                           | permanent readout ribbon `loop 1.6 bar · bus 26.8 V · relay LOCK` under the device                                                                 |
| Concourse  | Desk Lamp fault (`:358`, texture `proc-light-pool`)              | measurement fault (M05)            | the interactable is a **light pool** — no physical object; a participant cannot know a lamp exists until the flicker starts                        |
| Concourse  | status strip text (`:338`)                                       | decorative                         | permanent black ribbon on the wall                                                                                                                 |
| Concourse  | hub grammar plates (`:443`)                                      | decorative                         | translucent rectangles with 1 px edges (development-rectangle look)                                                                                |
| Records    | supply bundles ×3 (`RecordsWorkshopScene.ts:310`)                | container                          | floor crates with permanent chips `Component bundle` / `Sample kit` / `Wire and wrap`; no container, no origin                                     |
| Records    | Case Workspace / Press A / Press B / Locker / Assembly Bench     | active / optional                  | same marker treatment for measured and optional objects                                                                                            |
| Records    | Feed Console chip `standby — exterior shift not logged` (`:589`) | inactive                           | permanent ribbon; the object itself gives no powered-down cue                                                                                      |
| Records    | `no unit issued` / `no report due` / `tray empty` chips          | inactive                           | permanent ribbons at three stations                                                                                                                |
| Records    | Sample Seal Log (`:510`)                                         | optional                           | indistinguishable from required work                                                                                                               |
| Records    | functional-area plates (`buildFunctionalAreas`)                  | decorative                         | translucent rectangles                                                                                                                             |
| Laboratory | Kai (`DiagnosticsLaboratoryScene.ts:296`)                        | active                             | halo + prompt + chip                                                                                                                               |
| Laboratory | wall display (`buildSignalDisplay`)                              | decorative                         | large physical block on the north band; the wall block (`#####` row 4) obstructs the straight route from the south door to the airlock (finding 5) |
| Laboratory | bay numerals 1–4 painted on the floor                            | guidance                           | floor labels stand in for architecture                                                                                                             |
| Laboratory | phase benches                                                    | active (in order)                  | equal-looking consoles; only the frame colour differs                                                                                              |
| Yard       | Noor (`ExteriorRecoveryYardScene.ts:355`)                        | active                             | halo + chip + prompt                                                                                                                               |
| Yard       | compound ground plate (`:761`)                                   | decorative                         | translucent rectangle with a 1 px stroke (development geometry)                                                                                    |
| Yard       | apron / excavation / uplink plates (`buildWorksiteGrammar`)      | decorative                         | as above                                                                                                                                           |
| Yard       | Yard Supply Crate / Cable Flag (`:970`, `:986`)                  | optional / measurement fault (M05) | crate and flag look like every other station; the flag's fault state is a 12×7 px rectangle                                                        |
| Yard       | state chips at coupling / mast / rig / posts (`this.chip(...)`)  | state                              | five permanent ribbons                                                                                                                             |
| Yard       | hotbar (Field Scanner, spade)                                    | HUD                                | always visible once issued; `Field Scanner` caption permanent                                                                                      |
| Deck       | Shift Review Panel / feeds (`UtilityCoreDeckScene.ts:234`)       | active                             | `STATION RECORD: OPEN 6/24 tasks closed` ribbon; three feed chips; manifold text; door chip `DOOR · SEALED` — six ribbons in one view              |
| Deck       | zone plates and conduits                                         | decorative                         | translucent rectangles; conduit lines float on the floor                                                                                           |
| Core       | Core pedestal (`CoreChamberScene.ts:249`)                        | active                             | `Core` chip + `CORE · PREPARED` chip + feed list ribbon + prompt                                                                                   |

Cross-cutting defects: (a) one cyan register for guidance, doors, active
stations and completed states; (b) nearest-target name chip + key prompt +
pulse + beacon ring/arrow shown simultaneously; (c) text ribbons carry
state that the object should carry; (d) translucent plates instead of
architecture; (e) the empty hotbar shows in interior zones after the yard
(tools remain in the belt).

Resolution: the four-class registry (`INTERACTION-GRAMMAR.md`), lamps and
glyphs on objects, architecture instead of plates, the hotbar rule
(`INVENTORY-ITEM-PURPOSE-AUDIT.md` §3), the mission card
(`PROFESSIONAL-WORLD-DESIGN-V1.md` §6).
