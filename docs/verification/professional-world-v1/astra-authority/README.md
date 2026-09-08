# Astra professional world authority

Design checkpoint • 2026-09-08 • source HEAD f6e051f • branch fable-professional-world-rebuild-v1.

Start with [the original visual gallery](mockups.html), then [the governing design](../../../game/PROFESSIONAL-WORLD-DESIGN-V1.md). This is a documentation/design package, not a production rebuild or a psychometric validation.

## Selected direction

Fixed 40×22.5-tile world view at both 1280×720 and 1920×1080; seven larger zones with functional districts and local loops; existing inter-zone route and independent measurement windows retained. U1/U2 presentation is revised substantially. Dock/opening are replaced visually. Registry/story infrastructure and empty/irrelevant-hotbar suppression survive. Owner-held scientific changes remain held.

## Artifact index

| Purpose                                                                         | Artifact                                                                                                                                                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkpoint, accepted Codex amendment, exact 39-file allowlist                   | [Checkpoint](CHECKPOINT-AND-ALLOWLIST.md)                                                                                                                                                         |
| Current audit, M09 driver classification, U1/U2 decisions, owner queue          | [Audit and verdict](AUDIT-AND-U1-U2-VERDICT.md)                                                                                                                                                   |
| Official sources and transfer boundaries                                        | [Benchmark evidence](BENCHMARK-EVIDENCE.md)                                                                                                                                                       |
| Camera alternatives / weighted selection                                        | [Camera specification](../../../game/world-v1/CAMERA-AND-SCALE-SPEC.md), [comparison board](camera-comparison.svg)                                                                                |
| Topology and route/restoration                                                  | [Competing topology map](world-topology.svg), [route/story board](route-and-restoration.svg), [story states](../../../game/world-v1/STORY-STATE-SPEC.md)                                          |
| Exact rooms, doors, spawns, paths, stations, camera, crew changes and itinerary | [Numeric layouts](world-layouts.json), [room programme](../../../game/world-v1/ROOM-BLOCKOUTS.md)                                                                                                 |
| Seven annotated room boards                                                     | [Dock](zone-dock.svg), [Concourse](zone-concourse.svg), [Records](zone-records.svg), [Laboratory](zone-laboratory.svg), [Yard](zone-yard.svg), [Utility](zone-utility.svg), [Core](zone-core.svg) |
| Opening replacement                                                             | [Eight-frame storyboard](opening-storyboard.svg)                                                                                                                                                  |
| Five-state interaction grammar                                                  | [State board](interaction-states.svg), [grammar](../../../game/world-v1/INTERACTION-GRAMMAR.md), [current affordance audit](../../../game/world-v1/INTERACTION-AFFORDANCE-AUDIT.md)               |
| Inventory purpose and native HUD                                                | [Inventory board](inventory-hud.svg), [full item journey](../../../game/world-v1/INVENTORY-ITEM-PURPOSE-AUDIT.md)                                                                                 |
| Foreground/background and collision                                             | [Depth board](depth-layers.svg)                                                                                                                                                                   |
| Native composition examples                                                     | [1280×720](composition-1280x720.svg), [1920×1080](composition-1920x1080.svg)                                                                                                                      |
| All 26 items, exact authority and lifecycle constraints                         | [Readable crosswalk](M01-M26-SPATIAL-CROSSWALK.md), [structured crosswalk](m01-m26-spatial-crosswalk.json)                                                                                        |
| Existing art and bounded production batches                                     | [Asset audit](../../../game/world-v1/ASSET-PROVENANCE-REGISTER.md), [PixelLab brief](PIXELLAB-PRODUCTION-BRIEF.md)                                                                                |
| Copy-paste production mission / literal unit scopes                             | [Fable mission](FABLE-PRODUCTION-MISSION.md)                                                                                                                                                      |
| Reviews, corrections, verification and limitations                              | [Verification record](REVIEW-AND-VERIFICATION.md)                                                                                                                                                 |
| Existing Professional World report checkpoint                                   | [Mission report](../../PROFESSIONAL-WORLD-REBUILD-V1-REPORT.md)                                                                                                                                   |

## Reproducibility

build-visuals.py uses Python standard library to regenerate 16 original SVG boards, gallery and readable crosswalk from the two JSON files. It writes only these declared documentation artifacts. validate-authority.py performs read-only structure, scientific-field/schedule, links, geometry, range, target, route-distance and allowlist checks. Run Python with -B to avoid repository bytecode.

audit-runtime.mjs is a documentation-only local audit driver, never imported by product code. Modes captures/route/design use installed tooling, fresh browser context and TEMP output; external requests blocked. The completed current route reached stable Core and the visible completion notice; no survey URL or study server was configured. New runtime screenshots remain temporary. A route audit does not establish all task outcomes, mouse/keyboard parity or human usability.

No reference-game imagery, production asset, protected scientific file or product source belongs to this commit. PixelLab calls and production implementation remain for the approved Fable mission.
