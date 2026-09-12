# Station 080 — professional creative rescue (V2) report

Fable, 2026-09-12. Branch `fable-professional-world-rescue-v2`, created
from `993c554` (the rejected vertical slice, preserved untouched on
`fable-professional-world-rebuild-v1`). One local commit closes the
rescue (SHA in the handoff). Nothing pushed, merged, tagged, deployed,
deleted or removed.

## 1. Creative direction

The rejected slice failed because it was assembled from parts — Wang
terrain tiles, scattered prop sprites, rectangular floor regions — at a
camera scale (1280×720 world px) that showed all of it at half the size
the art could carry. The rescue inverts the production model:

- **Painted plates.** Each rebuilt room's background is ONE authored
  key-art painting (PixelLab `create_image_pro`, 688×384): architecture,
  furniture, lighting, wear and storytelling composed together by a
  single image. Collision is a 22×12 character grid mapped cell-by-cell
  to the painting (the invisible logical layer stays the only collision
  source, so art can never change footprints or interaction regions).
  Interactive objects, door leaves and dynamic lighting are layered
  sprites over the plate.
- **Intimate scale.** The world field is now 640×360 world px — integer
  2× at 1280×720 and 3× at 1920×1080 (crisper than the previous
  fractional 1.5× sampler path). The avatar reads at ~90 screen px.
- **Authored opening.** The floating-buildings diagram is replaced by
  two key-art shots — the snowbound station at dawn (bent Mast 04, flag
  lane) and the shuttle at the docking seal — panned at 2× with drifting
  snow and the same four captions, skip contract and wall-clock timing.
- **A visible payoff.** The Dock starts on cold emergency power (cold
  multiplied tint, dark lamp pools, a glowing terminal screen as the one
  bright point). Checking in triggers the power step-up: a breaker
  flicker, the plate warming to neutral over 1.4 s, and the three work
  lamps igniting west→east. The state persists across re-entry.

Direction selection: three blind candidates (industrial / clean /
emergency), compared at native size — `CONTACT-SHEET.md`. Direction A
was selected; B's wayfinding lines and C's emergency mood were folded in.

## 2. What was rebuilt

| Area               | Before (993c554)                                                                | After                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opening            | In-engine top-down diagram: building sprites on a flat void joined by grey bars | Two painted establishing shots, camera drift, snowfall, cut at 5.2 s, identical skip/finish contract                                                             |
| Dock               | 48×30 procedural-tile hall, scattered props                                     | 22×12 painted cargo dock: vault seal with tracked snow, kiosk, grouped cargo, hanging lamps; emergency→powered lighting states                                   |
| Concourse          | 60×38 procedural-tile hub                                                       | 22×12 painted operations hall: plan board, lockers, work table, Vale's desk, reading table with the M05 lamp, four doorways (two inpainted); sector-status panel |
| Camera             | 1280×720 field, 1×/1.5× composite                                               | 640×360 field, 2×/3× integer composite, 96×56 dead zone                                                                                                          |
| Restoration payoff | Texture swaps (near-invisible in captures)                                      | Room-wide power step-up at check-in                                                                                                                              |

Geometry: every interactable anchor/approach pair and spawn was audited
against the runtime rule (nearest config within 72 px wins) over the
full ±12 px driver-landing box, with the avatar's 32×42 body against
the collision grid; the audit values live in `src/pilot/zoneSites.ts`,
`src/pilot/pilotRoute.ts` (PILOT_DOORS) and
`src/world/interactionRegistry.ts` comments.

## 3. Scientific integrity

- No event name, payload key, window, form, option label, prompt body,
  feedback string or offer text was changed. The Dock's check-in prompt
  options and their event sequences are verbatim; every Concourse
  measurement window (M01/M05/M09/M10/M12/M14) opens through the same
  registry ids and surfaces.
- The Concourse restoration model (status-wall sectors, work-pool
  warmth, storm-damage patch) remains STAGE-driven, unchanged. Only the
  Dock's lighting presentation is new, driven by the existing mission
  fact `completed_rooms.includes('dock_arrival')` (a presentation read;
  nothing writes).
- Positions of interactables changed (as they did in the rejected slice
  itself); item independence, ordering, randomisation, persistence and
  export logic are untouched.
- Q01–Q33 wording appears nowhere in player-facing text.
- Scientific before/after: see §5 (projection).

## 4. Verification

- `tsc --noEmit`, `vite build`: pass.
- Pure geometry suite (`world_v1_registry` 8/8, `spawn_clearance`,
  `world_v1_story_state`, `pilot_route_model`): pass.
- `world_v1_camera` 3/3 (spec updated to the 640×360 field, integer
  2×/3× plates, and the small-room follow/clamp distances).
- `world_v1_interactions` 3/3 — including the two Concourse driver tests
  the rejected slice never passed (Concourse prompts and both-way door
  traversal). The axis driver got waypoint routing (spec-side `via`
  tables + a rewritten `concourseVia`) matched to the room's three
  walkable regions; production geometry was never adjusted for it.
- `world_v1_story`: pass (opening ≤ 20 s, four captions, skip ≡ watched,
  Concourse restoration persists across exit/re-entry).
- Legacy sanity (`dock_tutorial_paths`, `gameplay_foundation` on the
  `?route=legacy` bay): pass.
- Captures: `slice/1280x720/` and `slice/1920x1080/` (12 frames each,
  one continuous real-input run per viewport, completed with no stalls);
  recording `slice/rescue-gameplay-1280x720.webm` (~3 min real time:
  opening watched → arrival → marker → check-in power step-up →
  Concourse → Vale briefing + offers deferred → plan board opened →
  packet and gauge ranges → return to the powered Dock). The captures
  were taken from the final game code; the only edits after them were
  e2e driver files and documentation (no runtime file changed).

## 5. Scientific projection

The v1 slice never closed its projection gate (the 60×38 Concourse
defeated the axis walker). The rescue rooms are traversable and the
full-route projection recorded cleanly:

- `projection/world-v2-rescue.json` — the complete participant route
  (Dock → Concourse → Workshop → Laboratory → Yard → return → Deck →
  Core) driven with real input at the rescue geometry.
- **Compared with `world-v1-before.json` (the pre-slice baseline):
  0 differences** on every scientific field (event-type sequence,
  event counts, payload-key sets, opportunity ids, window ids, forms,
  validity values, completion state) — `v4_projection_compare` pass.
- Compared with `world-v1-u2.json`: the recorded differences are the
  exact mirror of u2's own recorded diff against `world-v1-before`
  (u2's driver additionally took the optional M09 gauge read; this run,
  like the `world-v1-before` recording, did not). No event name, payload
  key or window differs beyond that optional driver action.

## 6. Known limitations (candid)

- All world-v2 art is PROVISIONAL and model-selected; no human approval;
  asset-set version not bumped (stimulus freeze is a human decision).
- The avatar passes Stardew-tight in front of Vale's desk and the floor
  radio (their lower edges are baked art the sprite overlaps for a few
  pixels while passing).
- The five other zones keep their previous fields and art; their rebuild
  is not started. The zone doors lead into visibly older-looking rooms.
- The Dock north door's indicator lamp position clips above the plate
  edge (the leaf's own painted lintel lamp carries the read instead).
- No audio was added in this pass; ambience remains the existing
  procedural bed (present in the recording).
- No target-hardware frame-time measurement; software-GL only.
