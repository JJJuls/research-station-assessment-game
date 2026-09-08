# Professional world design authority V1

Astra • 2026-09-08 • design checkpoint based on `f6e051f`

## Authority and scope

This replaces the previous **presentation** contract for Professional World V1. It does not replace the research-owner workbook, scientific definitions, measurement schedule, event schemas, scoring plan, transport or export semantics. The workbook's final sheets 08–14 lead behavioural design; original papers would follow, then runtime/code/tests, then internal reports. Commercial games supply design references only. No source-scale or game-analogue validity claim is made here.

The package freezes an implementable **40×22.5-tile view of a larger, architecturally divided outpost**, with the existing route and independently owned measurement opportunities. U1/U2 are substantially revised, not discarded as research infrastructure. Original mockups and exact geometry are in [the authority gallery](../verification/professional-world-v1/astra-authority/mockups.html); [the package index](../verification/professional-world-v1/astra-authority/README.md) links evidence, crosswalk, verdict, assets, review and Fable mission.

The latest user checkpoint amendment authorises Codex-native permissions, AGENTS.md and a frozen documentation allowlist in place of a Claude-only hook adapter. No guard/configuration changes are part of this work.

## Design problem and selected response

The current world does not yet communicate a convincing working station. Current captures show a sparse Dock around several unrelated objects, a large but weakly differentiated Concourse, a crowded Records floor, four adjacent numbered Laboratory panels, and status ribbons in the unrevised zones. More sprites will not solve this. Architecture must tell participants where people work, where they move, and where the current operation belongs.

The participant is a relief operations specialist arriving after a severe storm. Their responsibility is to establish a usable station record, examine an incident, recover exterior services, reconcile new evidence on return, and transfer a stable operating state to the next watch. The station remains safe to traverse regardless of task outcomes. Crew work supplies fail-forward continuity; unresolved participant work remains honestly unresolved. No performance praise, trait, score, rank or reward economy appears.

The visual hierarchy is: **operational landmark → circulation → one relevant working face → quiet supporting detail**. Normal scenery has no prompt. Required-route objects have a recognisable control/handling face; voluntary opportunities retain their approved non-leading presentation. “Required interactive” means necessary to operate the route, not mandatory successful completion of every item.

## Frozen direction

- Tile 32 world pixels; retain the current 32×42 player collider and 175px/s movement.
- Fixed world plate 1280×720 at both supported output sizes; native UI layout at 1280×720 and 1920×1080. The 1920 world presentation is 1.5×, with explicitly tested fractional pixel edges; no claim that every source texel has uniform integer size.
- Zones exceed a viewport. Dimensions are Dock 48×30, Concourse 60×38, Records 64×40, Laboratory 68×42, Yard 80×48, Utility 58×36, Core 44×28.
- Main routes 4tiles/128px clear, secondary paths and thresholds 3tiles/96px, turning/inspection pads 4×4 where possible. These are physical wall-to-wall clear widths; collider inflation separately determines available centre travel. Decorative floor paint does not establish clearance.
- Existing inter-zone tree retained, with local loops around functional districts. No new exit can change an opportunity's closure or reminder schedule.
- Five-state object grammar; one proximity/focus cue, no permanent floating names, animated rings, arrows or label walls.
- Inventory starts empty. Mission records belong in a log; research workspaces remain isolated. The tool strip appears only when tools are usable.
- Replace the opening with an 8-frame 16-second spatially continuous arrival storyboard. Watch/skip land in the same state.
- Restore light, weather shielding and crew order through fixed narrative milestones. Never alter later task parameters, access, reading load or alternative utility through prior success.

See [camera comparison](world-v1/CAMERA-AND-SCALE-SPEC.md), [zone/story design](world-v1/ROOM-BLOCKOUTS.md), [story states](world-v1/STORY-STATE-SPEC.md), [interaction grammar](world-v1/INTERACTION-GRAMMAR.md), and [inventory journey](world-v1/INVENTORY-ITEM-PURPOSE-AUDIT.md).

## Why this topology and narrative

Two complete alternatives were considered. **Operations tree / incident handover** keeps Dock–Concourse, Concourse–Records, Concourse–Lab–Yard and Concourse–Utility–Core. Evidence leaves Records as a neutral station dossier; independent laboratory cases explore a common storm incident without reusing item answers. Exterior damage follows that diagnosis narratively; a fixed service report brings everyone back through the same locations for revision. Local loops provide choice of approach without introducing new exit triggers.

**Service ring / distributed salvage expedition** would connect Records to Lab and Yard to Utility. Arrival still enters the Concourse; record intake leads directly to laboratory analysis, a perimeter circuit handles recovery, and a mandatory ferry of revised records would return to the hub before Utility/Core. This creates credible logistics and less retracing, but new exits, unequal travel paths and reminders would change M09/M10/M20/M22 exposure. Performance-independent access could be retained, but route equivalence is unestablished. Reject for this production pass; do not secretly implement its shortcuts.

Weighted topology rubric (1 poor–5 strong; design judgement, not empirical measurement): route/measurement continuity 35%, orientation 25%, narrative causality 20%, bounded implementation 20%. Operations tree scores 5/4/5/5=4.75; service ring 2/4/4/2=2.90. Local loops address corridor-like travel without changing the between-room graph.

## Environmental storytelling and art hierarchy

The storm is visible through bent exterior masts, a weatherward impact side, sorted recovery crates, temporary covers and a closed transport seal. Damage follows material and wind exposure; avoid random debris on every tile. Clear internal lanes communicate that a working crew has already made the outpost safe. A warm operations counter is the first human-scale destination; a repeated overhead service trunk later connects the Utility bays to the Core.

Each room has one dominant silhouette and several subordinate districts. An archive wall, evidence table, mast footing or coolant manifold identifies function before text. Tool trays cluster near their actual work. Noninteractive crates stack only in designated storage recesses. No tall foreground prop occupies the mandatory route or hides a task's operating face. North-facing machinery shares a consistent visible top/front projection; actors sort by authored ground-contact anchors.

Palette: dark blue-grey hull, muted slate floor, warm paper/crew light, restrained cyan instrumentation, amber temporary service markings. Saturation and luminance separate function; colour alone never carries state. Before/after art keeps task-bearing luminance, geometry, controls and animations constant within protected windows. Sparse motion is limited to a distant vent, isolated exterior weather or a short player-caused transition; static reduced-motion equivalents retain information.

## Narrative task contract

Every item row in the spatial crosswalk names cause/source, location, preparation, action, consequence, resolution and fail-forward route. A single broad “incident” does not fuse its event families. Independent packets and case states remain independently visible. No prior correct answer is needed to obtain a later task's evidence. Failure, explicit stop, valid non-action, missing, invalid and interruption are not interchangeable.

The generic route continuation is the existing explicit NPC/board handover. It remains available without requiring success at primary tasks. Moving forward closes only the windows the current schedule already closes. “Crew can continue this line” is neutral story continuity, not a reward or penalty. Do not grant completion flags, inventory prerequisites or scientific zeros to manufacture a happy ending.

## Acceptance criteria

These are **design acceptance criteria**, not established scientific cut-offs.

| Criterion             | Operational check                                                                                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Arrival comprehension | In a formative adult pilot, after first Vale handover ask “where, what happened, role, next action, relevant object, why”. Record exact responses; target at least 80% correct on each with no interviewer coaching. A miss triggers design review, not participant exclusion. |
| Navigation            | From each zone entry, a participant can identify a circulation spine and either the next threshold or its landmark in≤10s. At least one local bypass/alcove exists; no task-success route gate.                                                                                |
| Discovery             | First required world interaction can be found within 20s after its neutral briefing without random scenery clicks. Observe target errors and assistance; do not treat them as trait measures.                                                                                  |
| Clear circulation     | 4tile primary and 3tile secondary widths,3tile thresholds, clear spawn and turning pads; collider sweeps in all directions, including diagonals and overlay close.                                                                                                             |
| View hierarchy        | In each initial composition one landmark and one route destination dominate; at most one interaction cue; zero permanent floating object names/status ribbons.                                                                                                                 |
| World extent          | All seven room dimensions exceed the 40×22.5 view in both axes; no blank letterbox within the world area at either supported size.                                                                                                                                             |
| Spacing               | Separate primary operating faces by at least 8 tiles where they are independent stations; paired physical subparts retain their task-defined relationship. No two eligible prompt ranges overlap on a required path. Deviations for workspace-local objects are documented.    |
| Travel burden         | Computed minimum traversal and station visits reported, then human pilot against workbook 27min median/30min p90 gates. No automation wall-time claim substitutes for human timing.                                                                                            |
| Readability           | UI body text≥18 physical px at 720 and 27 at 1080 by default; responsive large-text mode evaluated for source visibility and reading burden. No essential text baked into 9 px world labels.                                                                                   |
| Input equivalence     | Every required card/workspace action exercised with mouse and keyboard, same semantic result/event family except authorised input-mode data. World pointer action, if added, uses the same eligibility and cannot select distant scenery.                                      |
| Depth                 | Walk in front/behind each large object and inspect the same contact line against collider; no player hidden at an actionable operating face.                                                                                                                                   |
| Motion                | No task attractor loops; fixed narrative movement reducible to static state. Camera still when idle, no shake, no outcome zoom; frame-rate-independent damping.                                                                                                                |
| Restoration           | A reviewer can distinguish crew progress from participant task disposition; later entry-state snapshots match before/after presentation.                                                                                                                                       |
| Scientific invariance | All 26 identities/dispositions and opportunity windows remain traceable; no raw variable redefinition, event promotion, scoring or trait feedback.                                                                                                                             |
| Technical quality     | Focused browser checks at 1280 and 1920 on both hardware and reduced performance; record frame time rather than assert an unmeasured 60 fps.                                                                                                                                   |
| Ethical originality   | Every committed visual is an original blockout. No commercial screenshot, trailer frame, copied map, character or animation.                                                                                                                                                   |

## Production authority limits

Fable may implement frozen presentation decisions through the bounded mission, but owner-held measurement changes remain held. The most material are M05 matched exposure/motion, M09 reminder/exit semantics, M16 selected novel-protocol versus current rule-update implementation, M10 recipient availability, and M25 external administration. The package records these without editing scientific authority files. A safe unchanged module may remain inside a revised visual shell; it must be labelled unresolved, never certified aligned.

Astra's mockups demonstrate composition and geometry. They are not finished art, a human usability study, a validated measure or a production implementation. Approval of this package does not erase those distinctions.

## Computed travel and acceptance risk

The explicit full-visitation itinerary in world-layouts.json totals 57,520 world pixels / 328.69 s at 175 px/s on collision-cleared orthogonal paths, including purposeful return and voluntary primary visits. It excludes task action, reading, load time, search errors and optional M08/M11/inventory detours. This is not a globally shortest tour or human timing. Charging it to the 420 s overhead leaves 91.31 s; Utility/Core travel may overlap the 75 s closure allocation. Fable must record the allocation and run a human timing pilot before declaring the burden gate passed. Do not accelerate the player or alter measured task parameters to fit a budget.
