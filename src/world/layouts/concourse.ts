/**
 * Station Concourse layout (World V1 production — 60×38). Pure.
 *
 * Derived from the numeric design authority (world-layouts.json, zone
 * `concourse`): a four-way public spine (north–south cols 28–31, east–west
 * rows 17–20) with a local loop, four districts (records preparation NW,
 * briefing / incident evidence NE, quiet reading bay SW, operations
 * reception SE), the west quiet recess, the four cardinal door apertures
 * and the station approach lanes — minus the operations island (the
 * counter / status-wall landmark, solid) and the authored footprints.
 */
import type { BlockoutRect } from './blockout';
import { blockoutRows } from './blockout';

export const CONCOURSE_COLS = 60;
export const CONCOURSE_ROWS = 38;

/** Walkable floor union (authority: world-layouts.json `concourse.walkable_floor_rects`). */
export const CONCOURSE_FLOOR: readonly BlockoutRect[] = [
  [2, 17, 56, 4], // main east-west
  [28, 2, 4, 34], // main north-south
  [6, 6, 3, 26], // west local loop
  [6, 6, 48, 3], // north local loop
  [54, 6, 3, 26], // east local loop
  [6, 29, 48, 3], // south local loop
  [36, 3, 17, 11], // briefing / incident evidence (NE)
  [10, 3, 12, 11], // records preparation (NW)
  [36, 22, 16, 10], // operations reception (SE)
  [10, 23, 14, 10], // quiet reading bay (SW)
  [4, 25, 5, 7], // reading / weather window recess
  [32, 26, 4, 6], // reception opens onto the spine (collision correction)
  [24, 26, 4, 6], // reading bay opens onto the spine (collision correction)
  [38, 27, 4, 4], // Vale approach pad
  [43, 27, 4, 4], // Kai approach pad
  [12, 12, 4, 4], // plan board pad
  [12.5, 12.5, 3, 8], // plan board lane
  [42, 12, 4, 4], // incident desk pad
  [42.5, 12.5, 3, 8], // incident desk lane
  [20, 27, 4, 4], // routing packet pad
  [20.5, 27.5, 11, 3], // routing packet lane
  [50, 23, 4, 4], // gauge pad
  [50.5, 17.5, 3, 9], // gauge lane
  [11, 25, 4, 4], // desk lamp pad
  [11.5, 17.5, 3, 11], // desk lamp lane
  [28.5, 31.5, 3, 7], // south door aperture
  [-0.5, 17.5, 7, 3], // west door aperture
  [28.5, -0.5, 3, 7], // north door aperture
  [53.5, 17.5, 7, 3], // east door aperture
];

/**
 * Solid masses inside the floor union: the operations island (counter +
 * status wall) — the landmark the reception district wraps around. The
 * authority's Vale/Kai approach lanes cross this rectangle; the district
 * floor (cols 36–51) supplies the approach around both ends instead.
 */
export const CONCOURSE_SOLID: readonly BlockoutRect[] = [
  [38, 22, 10, 3], // operations island / status wall
];

/** Prop footprints (collide; floor beneath). Stations are authored. */
export const CONCOURSE_FOOTPRINTS: readonly BlockoutRect[] = [
  [13, 10, 2, 2], // incident plan board
  [43, 10, 2, 2], // incident evidence desk
  [21, 25, 2, 2], // completed routing packet (QC counter)
  [51, 21, 2, 2], // monitor gauge
  [12, 23, 2, 2], // reading desk / quiet lamp
  // Dressing (all outside the declared spine, loops, lanes and pads).
  [17, 4, 2, 2], // records preparation: filing cabinets
  [19, 4, 2, 2], // records preparation: document trolley
  [11, 4, 2, 1], // records preparation: notice board
  [48, 4, 2, 2], // briefing: filing cabinet
  [50, 4, 2, 2], // briefing: crate stack (evidence crates)
  [37, 4, 2, 1], // briefing: notice board
  [36, 12, 1, 1], // briefing: service lamp
  [45, 10, 1, 1], // briefing: chair beside the evidence desk
  [15, 10, 1, 1], // records preparation: chair beside the plan board
  [17, 23, 2, 1], // reading bay: bench
  [17, 30, 2, 1], // reading bay: bench
  [4, 26, 1, 2], // recess: filing cabinet
  [36, 30, 2, 1], // reception: bench
  [49, 30, 2, 1], // reception: bench
  [33, 32, 6, 1], // contained supplies recess off the south loop (authority decor, moved adjacent)
  [4, 6, 2, 10], // wall archive recess off the west loop (authority decor, moved adjacent)
  [57, 5, 2, 8], // equipment storage recess off the east loop (authority decor rect)
];

export const CONCOURSE_DOORS: readonly BlockoutRect[] = [
  [28, 36, 4, 2], // south → Dock
  [0, 17, 2, 4], // west → Records Workshop
  [28, 0, 4, 2], // north → Diagnostics Laboratory
  [58, 17, 2, 4], // east → Utility Deck
];

export const CONCOURSE_LAYOUT: readonly string[] = blockoutRows({
  cols: CONCOURSE_COLS,
  rows: CONCOURSE_ROWS,
  floor: CONCOURSE_FLOOR,
  solid: CONCOURSE_SOLID,
  footprints: CONCOURSE_FOOTPRINTS,
  doors: CONCOURSE_DOORS,
});
