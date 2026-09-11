/**
 * Dock layouts (World V1 production — Arrival / Dock 48×30).
 *
 * Pure. The participant layout is derived from the numeric design
 * authority (world-layouts.json, zone `dock`): the explicit walkable-floor
 * union (spines, local loops, the sealed transport side, the arrival /
 * handover bay, cargo staging, the weather-window bench nook and the door
 * aperture) minus the authored footprints, inside a 48×30 hull. The legacy
 * 25×14 bay that the historical `?route=legacy` regression specs drive is
 * unchanged. Interaction coordinates live in src/pilot/zoneSites.ts.
 */
import type { BlockoutRect } from './blockout';
import { blockoutRows } from './blockout';

export const DOCK_COLS = 48;
export const DOCK_ROWS = 30;

/** Walkable floor union (authority: world-layouts.json `dock.walkable_floor_rects`). */
export const DOCK_FLOOR: readonly BlockoutRect[] = [
  [2, 13, 44, 4], // main east-west
  [22, 2, 4, 26], // main north-south (spine)
  [3, 6, 3, 18], // west local loop
  [6, 6, 36, 3], // north local loop
  [39, 6, 3, 18], // east local loop
  [6, 21, 36, 3], // south local loop
  [3, 24, 17, 4], // sealed transport side (berth hall)
  [27, 15, 13, 10], // arrival / handover bay
  [5, 7, 13, 10], // cargo staging
  [8, 22, 7, 3], // weather window / bench
  [28, 20, 4, 4], // check-in approach pad
  [22.5, 20.5, 9, 3], // check-in approach lane
  [22, 22, 4, 4], // marker pad
  [22.5, 22.5, 3, 3],
  [22, 23, 4, 4], // airlock approach pad
  [22.5, 23.5, 3, 3],
  [22.5, -0.5, 3, 7], // north door aperture
];

/**
 * Prop footprints (collide; floor beneath). The check-in terminal's
 * footprint is authored (world-layouts.json); the others are the room's
 * own storage / service dressing, all outside the declared paths.
 */
export const DOCK_FOOTPRINTS: readonly BlockoutRect[] = [
  [29, 18, 2, 2], // check-in terminal
  [36, 24, 5, 2], // contained crates (authority decor rect)
  [3, 3, 4, 3], // wall utilities recess (authority decor rect)
  [7, 8, 2, 2], // cargo staging: crate stack
  [10, 8, 2, 2], // cargo staging: crate stack
  [13, 8, 2, 1], // cargo staging: pallet jack
  [7, 12, 3, 1], // cargo staging: cable drums
  [15, 12, 2, 2], // cargo staging: locker bank
  [8, 24, 3, 1], // weather-window bench
  [12, 26, 3, 2], // hall: weather cover on its rack (restoration shape)
  [5, 12, 1, 1], // cargo staging: bollard
  [11, 12, 1, 1], // cargo staging: bollard
  [4, 25, 1, 2], // hall: filing cabinet
  [17, 25, 2, 2], // hall: tool cart
  [36, 16, 1, 1], // handover bay: notice board
  [33, 22, 2, 1], // handover bay: document trolley
];

export const DOCK_DOORS: readonly BlockoutRect[] = [
  [22, 0, 4, 2], // north door → Station Concourse
];

export const DOCK_LAYOUT: readonly string[] = blockoutRows({
  cols: DOCK_COLS,
  rows: DOCK_ROWS,
  floor: DOCK_FLOOR,
  footprints: DOCK_FOOTPRINTS,
  doors: DOCK_DOORS,
});

/** V4 arrival bay (unchanged for the legacy route). */
export const LEGACY_DOCK_LAYOUT: readonly string[] = [
  '#########################',
  '###########--############',
  '#......................##',
  '#.................#######',
  '#.................#######',
  '#....................####',
  '#....................####',
  '#......####..........####',
  '#......####..........####',
  '#........PPPPPP......####',
  '#........PPPPPP......####',
  '#........PPPPPP......####',
  '###########--############',
  '#########################',
];
