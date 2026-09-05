# Interaction grammar (World V1)

"Eliminate click-and-hope." Every placed object belongs to exactly one class,
is declared once in a registry, and communicates its class through one
consistent visual language. Implemented in U1 as `src/world/interactionRegistry.ts`
(pure, Node-importable) and consumed by `RoomScene`/`PilotZoneScene`.

## 1. Object classes

| Class | Name               | Meaning                         | Indicator                                                                                        | Prompt                                                        | Handler                  |
| ----- | ------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------ |
| 1     | ACTIVE OBJECTIVE   | required now                    | lit status lamp on the object (cyan) + one light pool; the ONLY object in the zone with the pool | `E — <verb> <object>` within range                            | yes                      |
| 2     | OPTIONAL UTILITY   | functional, not required now    | lit lamp (steel-white), no pool                                                                  | `E — <verb> <object>` within range                            | yes                      |
| 3     | INACTIVE / FUTURE  | powered down or unavailable now | dark lamp, no glow; a small dark state glyph on the object                                       | `E — <state>` within range (e.g. `E — Feed console: standby`) | yes (state message only) |
| 4     | DECORATIVE / STORY | scenery, story dressing         | none; never a lamp that could read as active                                                     | never                                                         | none                     |

Doors are class 1 (the next door on the route: lintel lamp lit) or class 2
(other open doors: lintel lamp steel-white); a gated door that is sealed
now is class 3 (dark lintel; prompt reads the neutral sealed message).

Scientific exception — **paired-alternative equality**: where a measurement
model requires an alternative activity to be equally visible (M24 rig vs
sorting bench; M26 post A / post B / line panel; M19 coupling vs the rest of
the yard), the paired objects carry the **same class and indicator** while
the window is open; the guidance pool is not shown on either. The registry
marks these with `equalityGroup`.

## 2. Registry record

```ts
interface InteractionRegistryEntry {
  id: string; // stable, e.g. 'concourse.ops_desk'
  zone: PilotZoneKey;
  kind: 'station' | 'door' | 'npc' | 'container' | 'decor';
  x: number;
  y: number; // world px (interaction point / ground contact)
  radius: number; // interaction radius (72 default)
  verb: string; // 'Review', 'Open', 'Use', 'Talk to', 'Take', …
  label: string; // object name shown after the verb
  availability: AvailabilityRule; // see §3
  opens: SurfaceRef; // { kind: 'prompt' | 'work_surface' | 'inventory' | 'ip_overlay' | 'feed_panel' | 'door' | 'message', id }
  footprint: { w: number; h: number } | null; // collision footprint (tiles), null = walkable
  depthAnchor: 'foot' | 'floor' | 'overhead';
  stage: PilotStage[] | 'any'; // narrative stages in which it exists
  window: string | null; // measurement window id it hosts, or null
  equalityGroup?: string; // paired-alternative equality (§1)
}
```

`class` is **derived** per frame from `availability` and the route state —
never hand-set — so an object cannot be mislabelled: `active` when it is the
current guided destination (existing `pilotBeaconTarget` model), `optional`
when available but not the destination, `inactive` when its availability
rule returns a state string, `decorative` for `kind: 'decor'`.

## 3. Availability rules (named, pure)

| Rule id                 | Meaning                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| `always`                | always usable                                                         |
| `stage_at_or_after:<s>` | usable from stage s                                                   |
| `stage_in:<list>`       | usable in the listed stages                                           |
| `window_open:<w>`       | usable while the window is open or not yet entered                    |
| `return_shift`          | usable at `return_hub` or later (existing `returnShift()`)            |
| `custom:<name>`         | a named predicate exported by the zone module (e.g. `core_door_gate`) |

A rule returns `null` (usable) or a short state string (class 3 message).

## 4. Prompt format

- One line, HUD space, above or below the target (existing placement
  rule): `E — Review incident log`. The verb is the registry verb; the label
  is the registry label. SPACE performs the same action; the controls
  legend (H) says "E or SPACE — interact".
- No name chip, no ring, no arrow, no status strip and no key prompt at the
  same time. Persistent state lives on the object's lamp and glyph and in
  the mission log.
- Prompt never covers the mission card (top-left 300×72 design px) nor the
  target's own art (existing `belowPlacementCovered` rule).

## 5. Tests (pure + runtime)

| Test                                      | Proves                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `world_v1_registry.spec.ts` (pure)        | every registry object's approach point is reachable from every spawn of its zone by BFS over the collision grid with the 32×42 body; no object overlaps a door trigger's 3-tile clearance or a declared corridor; decorative entries have no `opens`; every class-1/2 object has a verb and a label; equality groups share availability                                                                                                              |
| `world_v1_interactions.spec.ts` (runtime) | walking to each active object shows exactly one prompt whose text is `E — <verb> <label>`; pressing E opens the declared surface (probe); decorative objects never show a prompt in range; one physical key press cannot open or commit two stages (existing re-entrancy guard, asserted); a surface pauses world input (avatar velocity 0, no prompt) and closing it restores movement; no world prompt is visible while an overlay scene is active |
| `spawn_clearance.spec.ts` (pure, updated) | spawns outside the 72 px radius of the door just used, ≥ 96 px inside                                                                                                                                                                                                                                                                                                                                                                                |
