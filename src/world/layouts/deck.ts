/**
 * Utility Deck layout (World V2 rebuild — 22×12). Pure.
 *
 * One painted plate (`public/assets/world-v2/plates/deck-plate.png`,
 * 688×384): west Concourse doorway, north wall with the shift review
 * panel, systems board, the sealed Core blast-door alcove and the
 * manifold gauges, and the three dormant feed machines along the south
 * hull (coolant valve wheel → calibration breaker bank → distribution
 * bus, west to east — the operational order reads left to right).
 * Feed state is presented by layered indicator lamps/glows over the
 * dormant painted machines (Dock power step-up precedent) — the
 * closure model, availability rules and events are untouched.
 *
 * Machine-audited geometry (32×42 body, ±12 px landing box, nearest-wins
 * radius 72, spawn/door clearance, BFS connectivity). The south machines
 * are tall (rows 7–11): their approaches stand on the rows 5–6 band.
 */
import type { BlockoutRect } from './blockout';
import { blockoutRows, footprintSolids } from './blockout';
import type { SolidRect } from './grid';

export const DECK_COLS = 22;
export const DECK_ROWS = 12;

export const DECK_FLOOR: readonly BlockoutRect[] = [
  [2.2, 4, 17.6, 3], // rows 4-6 across the hall
  [1, 7, 19.8, 2], // rows 7-8 (the south machines carve their cells out)
];

/** The painted machines, in tile units (the book's audited figures). */
const DECK_MACHINES: readonly BlockoutRect[] = [
  [3.3, 7, 3.6, 4], // coolant feed valve station (wheel + pipe flanges)
  [9.1, 7, 2.9, 4], // calibration breaker bank
  [14.7, 7, 2.9, 4], // distribution bus cabinet
];

/** Cell footprints: none — the machines collide through DECK_SOLIDS. */
export const DECK_FOOTPRINTS: readonly BlockoutRect[] = [];

/** Pixel solids: the machines exactly where the book measured them. */
export const DECK_SOLIDS: readonly SolidRect[] = footprintSolids(DECK_MACHINES);

export const DECK_DOORS: readonly BlockoutRect[] = [];

export const DECK_LAYOUT: readonly string[] = blockoutRows({
  cols: DECK_COLS,
  rows: DECK_ROWS,
  floor: DECK_FLOOR,
  footprints: DECK_FOOTPRINTS,
  doors: DECK_DOORS,
});
