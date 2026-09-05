# Professional World Design V1 — design authority

Mission: **Professional world, story, interaction and visual rebuild V1**
(branch `fable-professional-world-rebuild-v1`, base `867c4d5`, worktree
`.claude/worktrees/fable-professional-world-rebuild`). This document is the
design authority for the rebuild. It governs **presentation, spatial design,
narrative wrapper, interaction affordances, guidance, inventory presentation
and asset policy**. It governs nothing scientific: the evidence-led M01–M26
decisions (`docs/verification/input/Remote_Outpost_M01-M26_Scientific_Decision_v2.xlsx`,
md5 `1535682ab88481815bbdda1206644d4c`, and its derived ledger
`docs/verification/evidence-led-pilot-v2/M01-M26-IMPLEMENTATION-LEDGER.md`)
remain authoritative for every item, window, raw variable, disposition and
validity rule. Where a rule below would require a scientific change, the
existing implementation is preserved and the conflict is recorded as an open
research-owner decision in the mission report.

Companion specifications (all under `docs/game/world-v1/`):

| File                              | Governs                                                                 |
| --------------------------------- | ----------------------------------------------------------------------- |
| `STORY-STATE-SPEC.md`             | narrative acts, NPC stage placement, restoration states, dialogue rules |
| `CAMERA-AND-SCALE-SPEC.md`        | render/camera contract, room-size rules, the three-scale comparison     |
| `INTERACTION-GRAMMAR.md`          | the object/interaction registry, the four object classes, the tests     |
| `ROOM-BLOCKOUTS.md`               | per-zone composition, tile ranges, object placement tables              |
| `INVENTORY-ITEM-PURPOSE-AUDIT.md` | every item's purpose, origin, disposition (keep/rename/…/remove)        |
| `INTERACTION-AFFORDANCE-AUDIT.md` | the current world's "click-and-hope" defects, object by object          |
| `ASSET-PROVENANCE-REGISTER.md`    | the existing-asset audit and the bounded PixelLab candidate plan        |
| `current-object-inventory.json`   | machine-readable inventory of the current (pre-rebuild) world           |

The verification record is `docs/verification/PROFESSIONAL-WORLD-REBUILD-V1-REPORT.md`
with per-unit notes under `docs/verification/professional-world-v1/`.

---

## 1. Direction

**"Restrained adult industrial frontier work-sim on a storm-damaged research
station."** An original setting, original station, original characters and
an original modular kit. Nothing is copied from the reference titles; they are
studied for principles only.

Reference priorities (mission §3) and what each contributes:

1. **Functional work areas and production-world logic** — every room is a
   place of work with a receiving side, a working side and a hand-over side;
   machinery terminates believably; spatial boundaries (rails, counters,
   partial walls) explain where a person can and cannot walk; mature,
   quiet tone; depth from contact shadows, controlled light pools and
   foreground lintels.
2. **Readable paths and strong landmarks** — one memorable object per room,
   a visible main aisle, damage and restoration embedded in the environment
   (a scorched panel that later reads "operational", a dark corridor that
   lights when a feed comes up).
3. **Camera framing, readable proportions, compact interface** — a
   following camera showing enough architecture to know where you are and
   where you are going; a figure that is a person in a room, not a
   silhouette in a diagram; a HUD that is a small card, not a banner.
4. **Distinct location identities only** — each zone has its own colour
   temperature, floor material and silhouette family; decorative density
   stays low.

What the human found (mission §2) and where this design answers it:

| #   | Finding                                                    | Answer                                                                                     |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | opening: disconnected enlarged assets, no station/incident | §9 opening rebuilt from the real world kit; shuttle docks at the real Dock                 |
| 2   | camera too close                                           | §4 camera: 32×18-tile view, figure ≈ 8 % of the viewport                                   |
| 3   | rooms are station grids                                    | §7 room-composition contract: place first, stations second                                 |
| 4   | tasks too close / competing                                | §7 spacing rule, one active target treatment at a time                                     |
| 5   | machinery on doors/routes (causal display)                 | §7 Laboratory: wall display + scaled console; corridor rule                                |
| 6   | labels, ribbons, halos, dev rectangles, banners            | §5 interaction grammar, §6 HUD: no permanent labels, no plate rectangles, one mission card |
| 7   | interactive vs decorative ambiguous                        | §5 four object classes with a registry and tests                                           |
| 8   | click-and-hope                                             | §5 contextual verb prompt in range; nothing hidden behind an unmarked prop                 |
| 9   | inventory: unexplained items, always visible               | §8 item-purpose registry, hotbar only when relevant                                        |
| 10  | NPCs stand around                                          | §3 story spine: each NPC has a job, a place per act and a reason to be there               |
| 11  | stale objective                                            | §6 mission card bound to stage × zone, refreshed on every transition                       |
| 12  | depth/collision/scale inconsistent                         | §10 depth and collision conventions, one kit, foot-line anchors                            |
| 13  | feels like a harness                                       | all of the above; §11 acceptance                                                           |

---

## 2. What is preserved and what is rebuilt

**Preserved** (exact identities; only the smallest repair for a verified
defect): evidence-led M01–M26 decisions; item identities and dispositions;
opportunity and window identities; counterbalancing and entry-state controls;
raw measurement variables; validity-register semantics; missing/invalid
handling; the minigame domain engines (`src/informationProcessing/*`,
`src/measurement/*`, `src/pilot/windows/*`, `src/pilot/exterior/*`,
`src/pilot/return/*`, `src/pilot/closure/*`); pipe, information-processing,
scanning, digging and magnet mechanics (`src/fieldActions/*`); the
transactional inventory engine (`src/inventory/engine.ts`, `store.ts`,
`model.ts`); event sequencing and durable local buffering
(`src/systems/EventLogger.ts`, `EventStore.ts`); Supabase export
(`ResearchExportClient.ts`, `supabase/**`); Qualtrics handoff
(`QualtricsBridge.ts`, `ResearchRuntime.completeParticipantSession`); the
purposeful return; the non-scored Core closure; the route stage machine
(`src/pilot/pilotRoute.ts` stages, objectives' semantics, `STAGE_ZONE`);
player movement (speed 175, 32×42 body, arrows only).

**Rebuilt**: opening; narrative wrapper; camera scale and framing; room
geometry; spatial composition; task placement inside rooms; environmental
storytelling; interaction affordances; contextual guidance; inventory
presentation and item-purpose communication; world HUD; visual hierarchy;
depth and collision conventions; modular environment art; NPC placement and
story beats; completion presentation. **Existing V4 coordinates and visual
placements are not authoritative** — every station, door, spawn and prop
moves to the new blockouts, and the e2e coordinate books derive from the
source of truth (`src/pilot/zoneSites.ts`, `PILOT_DOORS`) rather than
repeating numbers.

Scientific invariants (mission §5) are restated in §12 and checked by the
projection comparison (`e2e/v4_event_projection.spec.ts` + `v4Projection.ts`)
before and after every unit.

---

## 3. Story spine (summary; full spec in `world-v1/STORY-STATE-SPEC.md`)

Station 080, a small research station on a cold plateau, took a severe
electromagnetic storm overnight. Records are disordered, an unfamiliar surface
signal appeared during the storm, the exterior relay mast is damaged and the
utility feeds are unstable. The participant is a **relief operations
specialist** flown in on the morning shuttle to document, diagnose and
stabilise the station before the next routine communications handover. No
countdown, no artificial emergency pressure: the tone is a competent crew on a
bad morning.

| NPC  | Job                          | Anchor                                                        |
| ---- | ---------------------------- | ------------------------------------------------------------- |
| Vale | operations coordinator       | the operations desk on the Concourse                          |
| Kai  | systems engineer             | the Laboratory briefing bay; later the Concourse and the Core |
| Noor | survey and signal specialist | the airlock apron of the Recovery Yard                        |

Seven acts, mapped one-to-one onto the **preserved** route stages:

| Act | Title                                | Route stages (unchanged)                                  | Zone(s)                |
| --- | ------------------------------------ | --------------------------------------------------------- | ---------------------- |
| 1   | Arrival                              | `arrival`                                                 | Dock                   |
| 2   | Triage                               | `handover_briefing`, `incident_handover`                  | Concourse              |
| 3   | Records and preparation              | `workshop`, `workshop_work`                               | Records Workshop       |
| 4   | Signal analysis                      | `lab_briefing`, `lab_work`                                | Diagnostics Laboratory |
| 5   | Exterior recovery                    | `exterior_briefing`, `exterior_work`                      | Exterior Recovery Yard |
| 6   | Return and revision                  | `return_hub`, `workshop_return`                           | Concourse → Records    |
| 7   | Utility restoration and Core closure | `deck_closure`, `core_stabilise`, `core_sync`, `complete` | Utility Deck → Core    |

Advancement stays exactly as today: explicit NPC/board beats advance a stage;
no stage ever depends on a correct answer, a completed window or persistence.
Narrative _presentation_ may depend on a window reaching a **terminal
disposition** (completed, declined, censored, missing, invalid) but never on
success. Progress incentive is visible restoration: lighting stabilises,
equipment changes from damaged/offline to operational, doors and displays
update, NPCs acknowledge concrete station outcomes neutrally, the station map
records restored sectors. No points, coins, trait labels or praise.

Narrative overhead budget: opening ≤ 20 s and skippable on any key/click;
NPC beats ≤ 3 short lines and ≤ 4 options (unchanged rule); no exposition
walls; the environment carries most of the story.

---

## 4. Camera and spatial scale (summary; full spec in `world-v1/CAMERA-AND-SCALE-SPEC.md`)

- Canvas 1280×720 logical, browser FIT letterbox (unchanged).
- **World view 32×18 tiles (1024×576 world px)** — inside the mission's
  28–34 × 16–20 acceptance range. Achieved by rendering the world at
  **integer zoom 1** into a 1024×576 world plate and compositing the plate
  onto the canvas at **1.25** through a texel-snapped ("sharp bilinear")
  sampler, so texel interiors stay crisp, edges are resolved once per screen
  pixel and nothing crawls as the camera moves. The HUD renders directly at
  canvas resolution through the existing 800×600 design-space camera.
- Figure ≈ 48 world px → **60 canvas px = 8.3 %** of the 720 px viewport
  (mission target 6–8 %; the nearest pixel-stable alternatives are 6.7 % at
  zoom 1 with a 40-tile view and 10 % at zoom 1.5 with a 26.7-tile view).
- Follow: dead zone 96×64 world px, bounded lerp 0.12, scroll snapped to
  whole world pixels; the camera never moves while the avatar idles inside
  the dead zone; no shake, no zoom change, no camera-driven performance
  demand.
- Room sizes: ordinary interior 1.5–2.5 views; yard 2–3 views; Core compact
  (see §7 table). Corridors ≥ 4 tiles, secondary lanes ≥ 3 tiles.
- Three comparison frames (1.0 / 1.25 / 1.5) of the same Dock and Concourse
  state are recorded in U1 before the choice propagates; the selection and
  its reason are recorded in the camera spec.

---

## 5. Interaction grammar (summary; full spec in `world-v1/INTERACTION-GRAMMAR.md`)

- World interaction uses **E** or **SPACE**, consistently. Pointer input
  belongs inside panels and minigames; discovering a world object never
  requires clicking it.
- One **interaction registry** (`src/world/interactionRegistry.ts`, pure)
  declares every placed object with exactly one class:
  1. **ACTIVE OBJECTIVE** — required now: subtle active indicator (a lit
     status lamp on the object plus one light pool), contextual verb prompt
     within range.
  2. **OPTIONAL UTILITY** — functional, not required now: subdued indicator
     (lamp only), prompt within range.
  3. **INACTIVE / FUTURE** — visibly powered down (dark lamp, no glow);
     prompt within range reads its state ("Feed console — standby"); never
     resembles an active target.
  4. **DECORATIVE / STORY** — no prompt, no handler, no active light.
- Every interactive object carries: stable id, scene, world position,
  interaction radius, verb, availability rule, opened surface/action,
  collision footprint, depth anchor, narrative stage, measurement window
  (or none).
- The nearby prompt is **one line**: `E — <verb> <object>` (for example
  `E — Review incident log`). No halo, arrow, station name plate, status
  strip and key prompt at the same time. Permanent floating station names,
  black status ribbons, marker rings and translucent hitboxes are removed.
- Persistent state belongs **on the machine** (lamp colour + a small
  in-world state glyph) or in the mission log — not in a floating text chip.
- Tests prove: reachability of every registry object from the zone's spawns
  (grid BFS with the 32×42 body); every active object opens its declared
  surface; decorative objects never produce a prompt; one physical key press
  cannot open or commit two stages; surfaces pause world input; closing a
  surface restores movement; no interaction is hidden beneath another scene.

---

## 6. Guidance and HUD

- **Mission card** (top-left, replaces the wide objective banner): act
  title, one next action, at most two short lines, collapsible with **Tab**
  (the belt no longer uses Tab); never covers the play route (it lives in
  the top-left 300×72 design px; no interactable's prompt is placed under
  it).
- Wayfinding order: architecture (door frames, floor lanes, signage on the
  wall beside a door), door lighting (the next door's lintel lamp is lit),
  map topology (**M**), then one subtle destination treatment (a single
  light pool on the next station). Only one destination treatment at a
  time; the beacon ring/arrow is removed.
- The objective refreshes on every stage change, zone entry, overlay resume
  and station terminality (existing `onPilotRouteChange` + `refreshGuidance`
  hooks). A line never names a door already passed.
- Controls legend hidden until **H** (unchanged). Empty hotbar hidden
  (unchanged) and the hotbar is shown only when field tools or quick-use
  items are relevant (§8).
- World-state messages appear briefly (existing 2.2 s feedback) and
  disappear. Zone title card: kept, but as a small card under the mission
  card for 2 s.
- Map on **M** (redrawn): current zone, visited zones, current destination,
  the seven fixed connections in their true topology, the purposeful return
  drawn as a highlighted path when the stage is `return_hub` or
  `workshop_return`, restored-sector marks. No item numbers, constructs,
  variables or strategies.

---

## 7. Room-composition contract (summary; blockouts in `world-v1/ROOM-BLOCKOUTS.md`)

Every room is designed as a place before stations are placed. Sizes are in
32 px tiles; the view is 32×18.

| Zone                   | Size  | Views | Landmark                                            | Areas (in walking order)                                                                          |
| ---------------------- | ----- | ----- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Dock                   | 36×24 | 1.5   | the shuttle bay window over the landing pad         | docking threshold → vestibule → arrival terminal → cargo staging → station entrance               |
| Concourse              | 40×26 | 1.8   | Vale's operations desk island under the status wall | south entry → central circulation → ops desk (E) → west/north/east doors; notice/seating/storage  |
| Records Workshop       | 44×26 | 2.0   | the long records wall                               | entry → receiving/storage → document desks → press/assembly → handover desk; one aisle            |
| Diagnostics Laboratory | 48×24 | 2.0   | the signal display wall                             | entry lobby → Kai/Noor briefing bay (off-lane) → main aisle → bays 1–4 → airlock lobby            |
| Exterior Recovery Yard | 56×32 | 3.1   | Mast 04 on its footing                              | airlock apron → coupling service area → excavation field → metal-recovery compound → uplink posts |
| Utility Deck           | 44×26 | 2.0   | the systems trunk                                   | entry → review station → coolant bay → calibration bay → distribution bay → Core door alcove      |
| Core Chamber           | 32×22 | 1.2   | the Core column                                     | entry → approach → control position; always-available exit                                        |

Rules: related primary stations sit 12–20 tiles apart along the aisle
(≈ 4–7 s including approach and orientation at 175 px/s; the mission's 5–9 s
figure is met at the upper spacing and the total walking budget is checked by
a pure test, target ≤ 3.5 min for the whole purposeful route); no station,
board, NPC or decoration overlaps a door trigger or a required corridor;
main corridors ≥ 4 tiles, secondary lanes ≥ 3 tiles; arrival spawns ≥ 96 px
inside a door and outside its interaction radius; every tall object's
collision footprint is its physical base.

Per-zone contract points (mission §9) are restated in the blockouts file.

---

## 8. Inventory presentation (summary; audit in `world-v1/INVENTORY-ITEM-PURPOSE-AUDIT.md`)

- Engine untouched. Presentation redesigned: an **item-purpose registry**
  (`src/inventory/itemPurpose.ts`, pure) records for every active-pilot item
  its category, origin, permitted use contexts, kind (tool / component /
  evidence / document / temporary mission item), stack/split/transfer/discard
  permissions, final disposition and a neutral tooltip.
- World pickups come only from believable containers (the receiving pallet,
  the field-kit locker, excavation, salvage, a bench output). Task-critical
  and evidence items are not discardable. No random rewards.
- The **hotbar** appears only in the Exterior Recovery Yard (field tools)
  and while a quick-use item is held; the selected item's name shows for
  1.5 s on selection, not permanently.
- **I** opens a professional inventory surface with categories (tools,
  components, evidence, documents) and the item's purpose line; inside a
  measured organisation window (M02 workspace, M03 press) the surface never
  auto-sorts, pre-arranges or coaches; participant sorting actions are
  recorded where already authorised.

---

## 9. Opening and ending

**Opening** (rebuilt in U2): an in-engine establishing sequence composed
from the final world kit at the world scale: (1) the plateau at dawn, Station
080's modules and the damaged mast from the shuttle's approach line; (2) the
shuttle settling onto the Dock's landing pad, seen through the same bay
window the participant sees from inside; (3) a seamless cut to the Dock
interior with the participant stepping off the docking threshold. ≤ 20 s,
three short captions, any key or click skips safely (the skip press never
becomes the first interaction — existing 300 ms suppression). No scale or
perspective discontinuity: the exterior shot uses the exterior kit at 1:1.

**Ending** (U6/U7): stable Core, the station-status wall on the Concourse
shows every sector restored, one neutral line each from Kai (in the chamber)
and Vale (over the station line), explicit "study data" and "survey" state on
the completion notice, the existing export and handoff pipeline unchanged.
No personality judgement, no score.

---

## 10. Visual language, depth and collision

Kit (one modular environment kit, `src/world/kit/*` procedural where no
approved art exists): floor base + restrained variants; walls, corners,
thresholds, door frames; counters, shelves, storage; consoles in three sizes
(wall 32×48, desk 64×48, cabinet 64×80); pipes, cable trays, service
junctions; damage overlays (scorch, frost, spill); warning strips and signs;
contact shadows; controlled light pools; foreground lintels/overhead
elements.

Palette: charcoal / slate / desaturated steel indoors; **cyan `#5fd3c4`** only
for active systems; **amber `#c9a24a`** for damage or caution; warmer neutral
light `#e8d9b8` at 8–14 % in occupied work areas; colder blue-grey exterior;
no pure-black rectangles as interface furniture (panels are `#101820` at
≤ 0.92 with a 1 px `#33475a` border, and world readouts are gone).

Depth model (replaces the mixed V4 layers; `src/constants/depth.ts`):

1. floor and decals (`-1 … -0.2`);
2. fixed ground infrastructure — rails, cable trays, floor junctions, low
   crates (`-0.19 … -0.01`);
3. y-sorted player, NPCs and freestanding objects (`worldDepth(footY)`);
4. overhead architecture and foreground elements (`2 … 3`);
5. HUD and modal surfaces (`20+`, HUD camera / overlay scenes).

Every tall object uses its bottom-centre ground contact as its depth anchor
and its physical footprint as its collision (a wall-cell block under the
base only). Animation is selective: active console pulse, fan/relay/cable
movement, a short restoration reaction, restrained environmental motion;
nothing perpetual without a state reason; reduced motion honoured.

---

## 11. Acceptance (mission §18) — how each is evidenced

| Criterion                                                      | Evidence                                                                   |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| opening establishes the world and story                        | U2 capture set (opening frames), gameplay review                           |
| a new participant can state role, objective, destination       | mission card + opening captions + Vale's brief; gameplay/burden review     |
| every room reads as a location without labels                  | U1–U6 frames, visual review                                                |
| camera shows sufficient context                                | camera spec frames + `world_v1_camera.spec.ts`                             |
| required paths unobstructed; causal board off the route        | registry corridor test + Laboratory frames                                 |
| interactive vs decorative distinguishable; no click-hunting    | registry tests (prompt only for classes 1–3; decorative never)             |
| items have purposes and origins; hotbar absent when irrelevant | item-purpose registry test + inventory frames                              |
| all assessment mechanics functional                            | touched-route specs per unit; U8 full manifest                             |
| advancement never requires success                             | pure route-model spec + story-state spec test                              |
| no canonical scoring or trait inference; missing stays missing | scientific review; projection comparison; base-diff gates                  |
| primary events keep identities and fields                      | projection comparison, 0 differences on scientific fields                  |
| save/reload works                                              | U7 specs                                                                   |
| export failure cannot proceed silently to Qualtrics            | existing `participant_completion_handoff` specs (U7 re-run)                |
| screenshots at both resolutions clean                          | U8 capture set, visual review                                              |
| route under 30 min                                             | pure walking-budget test + honest statement that no human timing pilot ran |

---

## 12. Scientific invariants (never violated by this mission)

No provisional event is promoted; no personality score, trait, cut score or
classification is computed; questionnaire wording is unchanged and never
shown; no item is inferred from a convenient action; no raw event is the
primary evidence of two independent items; missing, declined, contaminated
or failed opportunities never become low scores; later opportunities never
depend on earlier performance; narrative text never reveals a desirable
response; no strategic assistance changes a measured task; navigation skill
is never treated as an item indicator; inventory is never auto-organised
inside an organisation window; the pilot is never described as a validated
questionnaire replacement. New story, route, UI and visual events are
contextual (`pilot_*` route telemetry through the existing sink) and outside
scoring.

---

## 13. Programme and unit contracts

Common contract fields (operating mode §2) for every unit: **scientific
rationale** — scientifically neutral presentation/spatial/narrative work under
§12; **participant-facing behaviour** — this document and the companion
specs; **telemetry boundary** — no new canonical event, no new derived
variable, no payload change to any `proto_*` family; new `pilot_*` route
telemetry only where stated; **scientific acceptance** — projection
comparison with zero differences on scientific fields, or every deviation
explained and routed; **failure/recovery** — task engines unchanged; every
surface closable; every door bidirectional except the two gated doors
(unchanged gates); **stop conditions** — allowlist breach, a scientific
conflict, a vertical slice that still reads as a test room (U1), a failed
projection comparison, a process exceeding 15 min without progress; **model**
— Fable implements; Opus reviewers read-only; Sonnet test review; **entry
state** — this branch, clean tree, previous unit's commit; **commit** — one
local conventional commit per unit.

| Unit | Objective                                                                                               | Allowed files (maximum)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Required tests / evidence                                                                                                                                                                                                                                                                         | Commit subject                                                         |
| ---- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| U0   | baseline captures, design authority, audits, current-object inventory, projection at base               | `docs/game/PROFESSIONAL-WORLD-DESIGN-V1.md`, `docs/game/world-v1/**`, `docs/verification/PROFESSIONAL-WORLD-REBUILD-V1-REPORT.md`, `docs/verification/professional-world-v1/**`, `docs/verification/professional-visual-v4/projection/world-v1-before*.json`                                                                                                                                                                                                                                                                                                            | `v4_visual_capture` at both resolutions into `before-*`; `v4_event_projection` label `world-v1-before` vs `baseline-v3` (0 diffs)                                                                                                                                                                 | `docs(game): define professional world rebuild baseline`               |
| U1   | camera/scale foundation; Dock + Concourse rebuilt; modular kit and depth foundation; three-scale frames | `src/world/{viewport,camera,RoomScene,StationMapBuilder,interactionRegistry,proceduralTilesets,proceduralTextures}.ts`, `src/world/kit/**`, `src/constants/depth.ts`, `src/sprites/Player.ts`, `src/gameplay/{Npc,InventoryHud,effects,physical}.ts`, `src/pilot/{PilotZoneScene,pilotRoute,zoneSites,worldBundles}.ts`, `src/scenes/{DockScene,StationConcourseScene}.ts`, `src/index.ts`, `e2e/{helpers,pilotHelpers,journey,v4_camera.spec,world_v1_*}.ts`, `docs/game/rooms/00-dock-arrival.md`, `docs/game/rooms/15-station-concourse.md`, docs/verification as U0 | typecheck, build, scoped lint; `world_v1_registry.spec` (pure), `world_v1_camera.spec`, `spawn_clearance`, `pilot_route` (touched), `pilot_episodes_1_2` (touched), `concourse_interaction_lifecycle`; three-scale frames; projection `world-v1-u1` (0 diffs); visual/gameplay/scientific reviews | `feat(game): establish professional camera and station vertical slice` |
| U2   | story-state spine, opening, mission card, map, restoration, NPC stage placement                         | `src/pilot/{storyState,pilotRoute,PilotZoneScene}.ts`, `src/pilot/ui/{PilotOpeningScene,StationMapScene,MissionCard}.ts`, `src/world/RoomScene.ts`, `src/scenes/{DockScene,StationConcourseScene,DiagnosticsLaboratoryScene,ExteriorRecoveryYardScene,CoreChamberScene}.ts` (NPC placement lines only), `src/constants/key.ts`, `e2e/**` touched specs, docs                                                                                                                                                                                                            | pure story-state spec (advancement never needs success), `pilot_route`, `pilot_route_model`, opening capture, projection `world-v1-u2`                                                                                                                                                            | `feat(game): rebuild opening, story spine and mission card`            |
| U3   | Records Workshop rebuilt; item-purpose registry; inventory presentation                                 | `src/scenes/RecordsWorkshopScene.ts`, `src/pilot/zoneSites.ts`, `src/inventory/{itemPurpose,itemDefs}.ts`, `src/inventory/ui/{InventoryOverlayScene,HotbarHud}.ts`, `src/gameplay/InventoryHud.ts`, `src/pilot/worldBundles.ts`, `e2e/**` touched, `docs/game/rooms/12-workshop-return.md`, docs                                                                                                                                                                                                                                                                        | `pilot_records`, `inventory_measurement_isolation`, `m02_overlay_proof`, `pilot_return` (workshop parts), pure item-purpose spec, projection `world-v1-u3`                                                                                                                                        | `feat(game): rebuild records workshop and inventory presentation`      |
| U4   | Laboratory rebuilt around one aisle and four bays; causal display on the wall                           | `src/scenes/DiagnosticsLaboratoryScene.ts`, `src/pilot/zoneSites.ts`, `src/informationProcessing/ui/*Scene.ts` (presentation-only entries), `e2e/**` touched, `docs/game/rooms/14-diagnostics-laboratory.md`, docs                                                                                                                                                                                                                                                                                                                                                      | `pilot_lab`, `pilot_signal_incident`, `ip_lab_flow` (pilot parts), projection `world-v1-u4`                                                                                                                                                                                                       | `feat(game): rebuild diagnostics laboratory`                           |
| U5   | Exterior rebuilt into service / excavation / salvage / uplink areas; no dev geometry or weather         | `src/scenes/ExteriorRecoveryYardScene.ts`, `src/pilot/zoneSites.ts`, `src/pilot/windows/exteriorWindows.ts` (presentation call sites only), `src/fieldActions/*` (presentation only, if any), `e2e/{exteriorHelpers,pilot_yard.spec,pilot_exterior_*}.ts`, `docs/game/rooms/11-exterior-recovery-yard.md`, docs                                                                                                                                                                                                                                                         | `pilot_yard`, `pilot_exterior_isolation`, `pilot_exterior_models` (pure), `field_actions_measurement` (touched), projection `world-v1-u5`                                                                                                                                                         | `feat(game): rebuild exterior recovery yard`                           |
| U6   | Utility Deck as one comprehensible system; Core as a deliberate conclusion; ending presentation         | `src/scenes/{UtilityCoreDeckScene,CoreChamberScene}.ts`, `src/pilot/zoneSites.ts`, `src/pilot/ui/FeedPanelScene.ts` (presentation), `e2e/{closureHelpers,pilot_deck.spec,pilot_closure*.ts}`, `docs/game/rooms/13-utility-core-closure.md`, docs                                                                                                                                                                                                                                                                                                                        | `pilot_deck`, `pilot_closure` (participant path), `pilot_closure_models` (pure), projection `world-v1-u6`                                                                                                                                                                                         | `feat(game): rebuild utility deck and core closure`                    |
| U7   | integration and data: save/reload across acts, ordering, durability, Supabase round-trip, Qualtrics     | `e2e/**` touched, `docs/**`; source only for a verified defect (recorded)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `state_session_continuity`, `adversarial_reload_partial_state`, `event_store`, `research_export_test_mode`, `participant_completion_handoff`, `supabase_roundtrip_live` (if credentials/stack), `launch_with_research_params`                                                                     | `test(game): verify integration and data paths after rebuild`          |
| U8   | final pilot verification, chunked full manifest, five reviews, ≤ 2 correction rounds, final report      | `docs/**`, `e2e/**`; source only for review-cited corrections (recorded)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | full manifest in chunks (`--retries=0 --workers=1`); capture sets at both resolutions; projection `world-v1-final`; five read-only reviews                                                                                                                                                        | `docs(verification): verify professional world rebuild`                |

Allowlists are maxima; a file outside the list is a stop-and-report event.
`node scripts/claude/verify-unit.mjs --allow …` is run before every commit.
