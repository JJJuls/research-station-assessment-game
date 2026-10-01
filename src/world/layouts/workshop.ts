/**
 * Records Workshop layout (World V2 rescue — 43×19: the two-bay hall and
 * the cutting annex). Pure.
 *
 * The hall is TWO painted 688×384 plates stitched side-by-side — the
 * machine bay (west: case/records desk, both label presses, the relay
 * bench, the storage locker and the assembly bench) and the records
 * office (east: dispatch desk, feed console, seal-tag board, handover
 * desk, the four south-hull work benches, the work-order board and the
 * Concourse door). The two bays join through the painted doorway
 * VESTIBULE both generations put on their facing walls (cols 19–23,
 * rows 6–8) — no seam blending was needed and no wall was invented.
 *
 * Station 080 U14-D2 (the approved M04 annex): the sample cutter and its
 * disposal bin left the machine bay for a 13×6-tile CUTTING ANNEX south
 * of it (floor cols 6–18, rows 12–17), entered through a doorway in the
 * south hull where the decorative tool bench stood. The plate is 1376×608
 * (`public/assets/world-v2/plates/workshop-plate.png`, composed by
 * `scripts/world-v2/plate_edits.py workshop`); the band south of the
 * office and beside the annex is hull and exterior, never floor. The
 * annex floor and the collision footprints of the cutter, the bin and
 * both jambs are mirror-symmetric about x 400 (the painted cutter is
 * not a mirror image), so the two M04 jobs — three pieces west of the
 * cutter, three at the mirrored places east of it — are laid out alike.
 *
 * Station 080 U14-D3 (workshop access correction, research-owner ruling
 * of 1 October 2026): the annex doorway is 128 px wide (clear opening
 * x 336–464, jambs x 320–336 and 464–480, rows 10–11); the Component
 * Locker left the south hull for the machine bay's north wall, right of
 * the third lamp (tile units `[16.4, 3, 1.9, 2]`, approached from the
 * south at (555, 190)); the Assembly Bench moved one tile east
 * (`[15.2, 9, 3.3, 2]`, approached at (578, 252)). On the office's east
 * wall the Work Order Board alcove (upper; anchor 1344/140, approach
 * 1312/178) and the open Concourse doorway (lower; anchor 1332/290,
 * approach 1288/268) are separated by one divider solid
 * `[1280, 216, 64, 16]`, painted as the rail/lintel between them: the
 * way from the one to the other passes west of x 1280. The two earlier
 * east-wall solids `[1280, 128, 64, 96]` and `[1312, 224, 32, 32]` were
 * withdrawn by the owner and are not implemented. No M04 coordinate,
 * reach or piece place changed.
 *
 * The collision grid is mapped cell-by-cell to the painting; every
 * anchor/approach pair below and in the registry was machine-audited
 * (32×42 body, ±12 px landing box, nearest-wins radius 72, spawn/door
 * clearance, bundle keyboard reach, full BFS connectivity) by the
 * workshop geometry checker before being committed; the annex is
 * measured by the pure M04 test (`e2e/m04_cutting.spec.ts`) and the
 * U14-D3 geometry by `e2e/u14_d3_workshop_access.spec.ts`. Routes: the
 * south lane (rows 7–8) runs the whole hall now that the cutter island
 * is gone; the annex is reached from it through the doorway only.
 */
import type { BlockoutRect } from './blockout';
import { blockoutRows, footprintSolids } from './blockout';
import type { SolidRect } from './grid';

export const WORKSHOP_COLS = 43;
export const WORKSHOP_ROWS = 19;

/**
 * The cutting annex (U14-D2): its walkable floor and the doorway region
 * cut through the south hull (tile units), the open doorway between the
 * two jambs (px) and the axis the annex is mirrored about (px). The
 * doorway is 128 px wide since U14-D3 (it was 64 px).
 */
export const WORKSHOP_ANNEX = {
  floor: [6, 12, 13, 6],
  doorway: [10, 10, 5, 2],
  doorX0: 336,
  doorX1: 464,
  axisX: 400,
} as const satisfies {
  floor: BlockoutRect;
  doorway: BlockoutRect;
  doorX0: number;
  doorX1: number;
  axisX: number;
};

/** Walkable floor union (see header; audited). */
export const WORKSHOP_FLOOR: readonly BlockoutRect[] = [
  // Machine bay (plate A)
  [10, 4, 9, 1], // north lane
  [3, 5, 16, 1],
  [2, 6, 17, 1],
  [1, 7, 18, 2],
  [2, 9, 17, 1],
  // Doorway through the south hull and the cutting annex (U14-D2)
  WORKSHOP_ANNEX.doorway,
  WORKSHOP_ANNEX.floor,
  // Vestibule passage between the bays (painted facing doorways)
  [19, 6, 5, 4],
  // Records office (plate B)
  [24, 4, 3, 1],
  [31, 4, 3, 1],
  [38, 4, 4, 1],
  [23, 5, 19, 1],
  [22, 6, 20, 3],
  [22, 9, 20, 1],
];

/** The painted benches and machines, in tile units (audited figures). */
const WORKSHOP_MASSES: readonly BlockoutRect[] = [
  [2, 2, 4, 3], // records/case desk + pigeonholes (NW)
  [6.5, 2, 1.7, 3], // label press A
  [8.6, 2, 1.4, 3], // label press B
  [1, 6, 2.0, 2], // relay bench (west wall)
  [16.4, 3, 1.9, 2], // component storage locker (north wall, right; U14-D3)
  [15.2, 9, 3.3, 2], // assembly bench (south hull, one tile east; U14-D3)
  [11, 14.1, 3, 2.9], // sample cutter (annex; operated from the north)
  [27.1, 2, 3.0, 3], // dispatch console desk (office north)
  [34.4, 3, 2.9, 2], // outbound handover desk (office north)
  [24.1, 9, 3.8, 2], // calibration bench (office south hull)
  [29.5, 9, 3.3, 2], // shift report desk (office south hull)
  [33.2, 9, 2.4, 2], // quality-packet table (office south hull)
  [35.6, 9, 3.3, 2], // conduit lattice bench (office south hull)
];

/** Cell footprints: none — the props collide through WORKSHOP_SOLIDS. */
export const WORKSHOP_FOOTPRINTS: readonly BlockoutRect[] = [];

/**
 * Pixel solids (collision audit 2026-09). The vestibule between the bays
 * is a passage THROUGH two painted side-wall doorways: the wall faces
 * north of the door sills collide (the avatar used to walk over them, as
 * if climbing the wall), so the crossing is confined to the sills' floor
 * span — avatar origin y 226 … 296.
 */
export const WORKSHOP_SOLIDS: readonly SolidRect[] = [
  [608, 192, 160, 44], // wall faces above both door sills
  // The annex doorway's two jambs: the opening is x 336–464 (U14-D3;
  // 368–432 in U14-D2).
  [320, 320, 16, 64],
  [464, 320, 16, 64],
  // The east wall's divider (U14-D3): the rail/lintel between the Work
  // Order Board alcove above (approach 1312/178) and the open Concourse
  // doorway below (approach 1288/268). Both ±12 px landing boxes stay
  // clear of it; the way between them runs west of x 1280.
  [1280, 216, 64, 16],
  // The disposal bin, south of the cutter: tile units [11.7, 16.8, 1.6,
  // 1.2] (x 374.4–425.6), authored in whole px as x 374–426 so that the
  // avatar is stopped at mirrored positions west and east of it (the
  // footprint rounding would give 374–425 and leave the east side 1 px
  // wider). South edge 6 px short of its base, like every footprint.
  [374, 538, 52, 32],
  // Every bench and machine exactly where the book measured it (they
  // used to collide on the whole 32 px cells they touch).
  ...footprintSolids(WORKSHOP_MASSES),
];

/**
 * The vestibule's painted floor lines (the door sills, plate px): the
 * avatar is BETWEEN the two wall planes while its foot centre lies east
 * of the west sill line and west of the east one. The scene shows the
 * wall mass as a foreground layer exactly then (RecordsWorkshopScene).
 */
export function vestibuleSpan(footY: number): { west: number; east: number } {
  const west = 612 + (footY - 238) * (43 / 92) + 10;

  return { west, east: 1376 - west };
}

/** The two door openings cut out of the foreground wall mass (polygons). */
export const VESTIBULE_OPENINGS: readonly (readonly [number, number][])[] = [
  [
    [616, 214],
    [621, 134],
    [646, 170],
    [648, 292],
    [643, 291],
  ],
  [
    [760, 214],
    [755, 134],
    [730, 170],
    [728, 292],
    [733, 291],
  ],
];

/** Foreground crop of the plate (x0, x1): the wall mass between the bays. */
export const VESTIBULE_FOREGROUND = { x0: 596, x1: 780 } as const;

export const WORKSHOP_DOORS: readonly BlockoutRect[] = [];

export const WORKSHOP_LAYOUT: readonly string[] = blockoutRows({
  cols: WORKSHOP_COLS,
  rows: WORKSHOP_ROWS,
  floor: WORKSHOP_FLOOR,
  footprints: WORKSHOP_FOOTPRINTS,
  doors: WORKSHOP_DOORS,
});
