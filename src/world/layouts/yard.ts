/**
 * Exterior Recovery Yard layout (World V3 — open field, 56×24). Pure.
 *
 * Station 080 correction: the yard is ONE open exterior
 * (`public/assets/world-v3/yard/yard-field.png`, 1792×768) instead of the
 * two framed 688×384 room plates of World V2 — plain snow ground, the
 * storm ridge along the north, fenced snow banks east and west, and the
 * station roof (seen from above) along the south with the airlock alcove
 * let into it. The walkable field is cols 4–51 / rows 4–19 (x 128–1664,
 * y 128–640): about 3.3× the old floor, one continuous space the camera
 * travels through, no seam and no pass.
 *
 * Every prop is a FREE-STANDING SPRITE (YARD_PROPS): it sorts at its foot
 * line, so the avatar walks in front of and behind masts, the gantry and
 * the rack, and it collides through a pixel solid at its painted base.
 * Flat half-buried debris is decor without a collider. Work sites keep
 * their spatial logic (airlock → Noor → crate / flag → coupling → mast →
 * uplink line; east: staked plot → magnet rig → bench / cart); the rig
 * compound and the coupling keep their internal geometry exactly (same
 * pixels, rigidly translated), and the uplink line keeps its 95 px
 * post-to-panel spacing. Interaction coordinates: src/pilot/zoneSites.ts.
 */
import type { BlockoutRect } from './blockout';
import { blockoutRows } from './blockout';
import type { SolidRect } from './grid';

export const YARD_COLS = 56;
export const YARD_ROWS = 24;

export const YARD_FLOOR: readonly BlockoutRect[] = [
  [4, 4, 48, 16], // the open snow field
  [27, 20, 2, 1], // airlock alcove floor (x 864–928)
];

export const YARD_FOOTPRINTS: readonly BlockoutRect[] = [];
export const YARD_DOORS: readonly BlockoutRect[] = [];

export interface YardProp {
  /** Texture key (src/world/kit/worldV3Assets.ts). */
  texture: string;
  /** Top-left corner of the sprite (world px). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Base collider(s) relative to the sprite's top-left; none = decor. */
  solids?: readonly SolidRect[];
}

export const YARD_PROPS: readonly YardProp[] = [
  // ——— West: the frozen coupling run and its heater ———
  {
    texture: 'w3-yard-coupling',
    x: 112,
    y: 330,
    w: 168,
    h: 112,
    solids: [[0, 34, 168, 62]],
  },
  // ——— North-west: the uplink line (post A — panel rack — post B) ———
  {
    texture: 'w3-yard-uplink-post',
    x: 413,
    y: 112,
    w: 14,
    h: 100,
    solids: [[2, 88, 10, 10]],
  },
  {
    texture: 'w3-yard-uplink-rack',
    x: 451,
    y: 100,
    w: 128,
    h: 120,
    solids: [[13, 94, 97, 14]],
  },
  {
    texture: 'w3-yard-uplink-post',
    x: 603,
    y: 112,
    w: 14,
    h: 100,
    solids: [[2, 88, 10, 10]],
  },
  // ——— North-centre: Mast 04 on its rock footing ———
  {
    texture: 'w3-yard-mast',
    x: 700,
    y: 150,
    w: 160,
    h: 200,
    solids: [[28, 140, 98, 36]],
  },
  // ——— Apron: supply crate and the guy-line flag ———
  {
    texture: 'w3-yard-supply-crate',
    x: 1000,
    y: 560,
    w: 39,
    h: 43,
    solids: [[1, 16, 37, 22]],
  },
  {
    texture: 'w3-yard-cable-flag',
    x: 1090,
    y: 552,
    w: 43,
    h: 63,
    solids: [[30, 52, 8, 8]],
  },
  // ——— East: the magnet rig compound (rigid translation of the painting) ———
  {
    texture: 'w3-yard-gantry',
    x: 1340,
    y: 150,
    w: 256,
    h: 176,
    solids: [
      [14, 142, 16, 20],
      [220, 142, 20, 20],
    ],
  },
  {
    texture: 'w3-yard-scrap-pile',
    x: 1444,
    y: 258,
    w: 96,
    h: 80,
    solids: [[4, 30, 88, 42]],
  },
  {
    texture: 'w3-yard-rig-bench',
    x: 1504,
    y: 314,
    w: 74,
    h: 55,
    solids: [[2, 18, 70, 30]],
  },
  {
    texture: 'w3-yard-parts-cart',
    x: 1475,
    y: 383,
    w: 81,
    h: 34,
    solids: [[2, 8, 77, 20]],
  },
  // ——— Work lamps ———
  {
    texture: 'w3-yard-lamp-a',
    x: 300,
    y: 250,
    w: 38,
    h: 83,
    solids: [[24, 73, 8, 6]],
  },
  {
    texture: 'w3-yard-lamp-a',
    x: 948,
    y: 440,
    w: 38,
    h: 83,
    solids: [[24, 73, 8, 6]],
  },
  {
    texture: 'w3-yard-lamp-e',
    x: 1290,
    y: 300,
    w: 31,
    h: 83,
    solids: [[21, 73, 8, 6]],
  },
  {
    texture: 'w3-yard-lamp-e',
    x: 640,
    y: 236,
    w: 31,
    h: 83,
    solids: [[21, 73, 8, 6]],
  },
  // ——— Rocks (collide) ———
  {
    texture: 'w3-yard-rocks-nw',
    x: 170,
    y: 176,
    w: 60,
    h: 67,
    solids: [[4, 28, 52, 32]],
  },
  {
    texture: 'w3-yard-rocks-sw',
    x: 176,
    y: 540,
    w: 84,
    h: 64,
    solids: [[4, 28, 76, 28]],
  },
  {
    texture: 'w3-yard-rocks-e',
    x: 1200,
    y: 168,
    w: 47,
    h: 39,
    solids: [[2, 14, 43, 19]],
  },
  {
    texture: 'w3-yard-boulder',
    x: 1236,
    y: 540,
    w: 41,
    h: 33,
    solids: [[2, 10, 37, 17]],
  },
  // ——— Storm debris, half buried (decor, no collider) ———
  { texture: 'w3-yard-debris-a', x: 400, y: 440, w: 80, h: 71 },
  { texture: 'w3-yard-debris-sw', x: 470, y: 548, w: 129, h: 78 },
  { texture: 'w3-yard-debris-b', x: 650, y: 470, w: 45, h: 43 },
  { texture: 'w3-yard-debris-c', x: 1130, y: 470, w: 118, h: 76 },
  // ——— The staked excavation field's painted stakes (decor; the plot
  // boundary itself is drawn by the scene over M23_PLOT) ———
  { texture: 'w3-yard-stake-field', x: 1074, y: 330, w: 135, h: 142 },
  {
    texture: 'w3-yard-debris-lean',
    x: 1560,
    y: 500,
    w: 94,
    h: 88,
    solids: [[30, 60, 50, 22]],
  },
];

/** World-px solids: every prop base, plus the alcove's side walls. */
export const YARD_SOLIDS: readonly SolidRect[] = [
  ...YARD_PROPS.flatMap((prop) =>
    (prop.solids ?? []).map(
      ([x, y, w, h]): SolidRect => [prop.x + x, prop.y + y, w, h],
    ),
  ),
  [833, 616, 31, 56], // airlock alcove, west cheek
  [928, 616, 31, 56], // airlock alcove, east cheek
];

export const YARD_LAYOUT: readonly string[] = blockoutRows({
  cols: YARD_COLS,
  rows: YARD_ROWS,
  floor: YARD_FLOOR,
  footprints: YARD_FOOTPRINTS,
  doors: YARD_DOORS,
});
