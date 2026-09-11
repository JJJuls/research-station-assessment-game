/**
 * Pilot zone work-site positions.
 *
 * Shared between the zone scenes, the interaction registry and the e2e
 * coordinate books so positions are declared exactly once. Pixel
 * coordinates; World V1 zones (Dock, Concourse — production slice) use
 * their blockout layouts (src/world/layouts/*), the others their V4 25×19
 * maps until their own units.
 *
 * Coordinate contract (world-layouts.json): a station's position is its
 * OPERATING CONTACT ANCHOR — the point on the floor at the middle of the
 * object's south (operating) face; approach points and spawns are the
 * player sprite origin (body x ± 16, y −18 … +24).
 */
const TILE = 32;

/**
 * Dock — participant layout (48×30; world-layouts.json `dock`). The
 * check-in terminal stands on cells (29–30, 18–19) in the arrival /
 * handover bay east of the spine and is approached from the south; the
 * movement marker sits on the spine two tiles north of the arrival spawn;
 * the docking airlock is a sealed class-3 door in the south hull; the
 * arrival spawn is the berth threshold, 96 px inside the airlock's anchor.
 */
export const DOCK_SITES = {
  terminal: { x: 30 * TILE, y: 20 * TILE },
  marker: { x: 24 * TILE, y: 22 * TILE },
  northDoor: { x: 24 * TILE, y: 1 * TILE },
  dockingAirlock: { x: 24 * TILE, y: 28 * TILE },
  spawnArrival: { x: 24 * TILE, y: 25 * TILE },
  spawnFromConcourse: { x: 24 * TILE, y: 5 * TILE },
} as const;

/** Dock — legacy V4 bay (`?route=legacy` regression specs; unchanged). */
export const LEGACY_DOCK_SITES = {
  terminal: { x: 3 * TILE, y: 3 * TILE },
  marker: { x: 17 * TILE, y: 7 * TILE },
  northDoor: { x: 12 * TILE - 16, y: 1 * TILE + 16 },
  spawnArrival: { x: 12 * TILE, y: 11 * TILE },
  spawnFromHub: { x: 12 * TILE, y: 4 * TILE },
} as const;

/**
 * Station Concourse (60×38; world-layouts.json `concourse`) — episode 1
 * (incident handover) and episode 5 (return). Vale stands in front of the
 * operations island (counter + status wall) in the south-east reception
 * district; Kai's return post is beside her; the plan board is in the
 * north-west records-preparation district; the incident evidence desk in
 * the north-east briefing district; the completed routing packet in the
 * south-west reading bay; the monitor gauge at the reception's service
 * end; the quiet reading-desk lamp in the reading bay.
 */
export const CONCOURSE_STATIONS = {
  vale: { x: 40 * TILE, y: 27 * TILE },
  /** Kai's return-shift position (episode 5 handover) beside the desk. */
  kaiReturn: { x: 45 * TILE, y: 27 * TILE },
  planBoard: { x: 14 * TILE, y: 12 * TILE },
  incidentDesk: { x: 44 * TILE, y: 12 * TILE },
  qcPacket: { x: 22 * TILE, y: 27 * TILE },
  monitorGauge: { x: 52 * TILE, y: 23 * TILE },
  concourseFault: { x: 13 * TILE, y: 25 * TILE },
} as const;

/** Concourse arrival spawns (≥ 96 px inside every door). */
export const CONCOURSE_SPAWNS = {
  fromDock: { x: 30 * TILE, y: 33 * TILE },
  fromLaboratory: { x: 30 * TILE, y: 5 * TILE },
  fromRecords: { x: 5 * TILE, y: 19 * TILE },
  fromDeck: { x: 55 * TILE, y: 19 * TILE },
} as const;

/**
 * Records Workshop — episode 2 (restoration) and episode 5 (return).
 * Return-shift stations (Unit 5) follow the D-V2-1 placement rule: each
 * 44 px approach point has no other interactable nearer than the station
 * itself even ±12 px, and its walking column clears the two machinery
 * blocks (x 416–543 at rows 4–5 and 12–13; the 32 px body needs the
 * column centre ≤ 384 or ≥ 576 to pass them).
 *   feed console (480, 224) — approach from the y = 272 lane (480, 268);
 *   relay bench (192, 384) — approach from below (192, 428);
 *   report desk (608, 320) — approach from the lane (608, 276);
 *   handover desk (608, 96) — approach from the west (576, 96) up the
 *   x = 576 column (clear of the block even with a ±12 px landing error).
 */
export const WORKSHOP_STATIONS = {
  workOrderBoard: { x: 20 * TILE, y: 5 * TILE },
  filingDesk: { x: 3 * TILE, y: 8.5 * TILE },
  pressA: { x: 6 * TILE, y: 8.5 * TILE },
  pressB: { x: 9 * TILE, y: 8.5 * TILE },
  storageLocker: { x: 3 * TILE, y: 14 * TILE },
  assemblyBench: { x: 9 * TILE, y: 14 * TILE },
  supplyA: { x: 3 * TILE, y: 3 * TILE },
  supplyB: { x: 5.5 * TILE, y: 3 * TILE },
  supplyC: { x: 8 * TILE, y: 3 * TILE },
  feedConsole: { x: 15 * TILE, y: 7 * TILE },
  relayBench: { x: 6 * TILE, y: 12 * TILE },
  reportDesk: { x: 19 * TILE, y: 10 * TILE },
  handoverDesk: { x: 19 * TILE, y: 3 * TILE },
} as const;

/**
 * Laboratory — the signal-analysis incident (Unit 3). Placement rule
 * (D-V2-1 lesson): every approach point (44 px off a station) must have
 * no other station nearer than the station itself, even ±12 px, and the
 * walking columns stay clear of the wall block (x 288-447, y 128-159).
 * Wall display + workstation on the top band, Kai at the briefing desk
 * top-right, the orientation console top-left, the four phase benches
 * on one row (y = 11 tiles) in presented order.
 */
export const LAB_STATIONS = {
  display: { x: 11.5 * TILE, y: 3.7 * TILE },
  workstation: { x: 11.5 * TILE, y: 6.6 * TILE },
  orientation: { x: 4 * TILE, y: 6.5 * TILE },
  kai: { x: 18.5 * TILE, y: 6.5 * TILE },
  evidenceTable: { x: 4 * TILE, y: 11 * TILE },
  protocolConsole: { x: 9 * TILE, y: 11 * TILE },
  trainingRig: { x: 16 * TILE, y: 11 * TILE },
  diagnosticBoard: { x: 21 * TILE, y: 11 * TILE },
} as const;

/**
 * Exterior Recovery episode (Unit 4) — one connected exterior scene with
 * legible subareas. Placement rule (D-V2-1): every interactable's 44 px
 * approach point has no other interactable nearer than itself, even
 * ±12 px; stations sit ≥ 100 px apart. Subareas: airlock apron (south,
 * Noor + supply crate + the M05 cable flag), frozen coupling (west), Mast
 * 04 (north-centre, over its rock footing), staked excavation field
 * (east, cols 16-22 / rows 8-13), the Metal Recovery Yard (north-east
 * compound behind a ridge) and the uplink posts (north-west).
 */
export const YARD_SITES = {
  noor: { x: 9.4 * TILE, y: 13.4 * TILE },
  supplyCrate: { x: 5.5 * TILE, y: 14 * TILE },
  cableFlag: { x: 17.5 * TILE, y: 14 * TILE },
  coupling: { x: 3.2 * TILE, y: 10.5 * TILE },
  thawRack: { x: 3.2 * TILE, y: 8.6 * TILE },
  mast: { x: 13 * TILE, y: 5.5 * TILE },
  mastTower: { x: 12 * TILE, y: 3.1 * TILE },
  plotStake: { x: 15 * TILE, y: 8.5 * TILE },
  magnetRig: { x: 19.5 * TILE, y: 5 * TILE },
  magnetTray: { x: 23.3 * TILE, y: 3.8 * TILE },
  sortingBench: { x: 22.7 * TILE, y: 6.2 * TILE },
  uplinkA: { x: 3 * TILE, y: 4 * TILE },
  linePanel: { x: 7 * TILE, y: 3 * TILE },
  uplinkB: { x: 9.5 * TILE, y: 5 * TILE },
} as const;

/** Magnet rig operating pad (F works only here). */
export const YARD_RIG_PAD = {
  minX: 18 * TILE,
  maxX: 23.5 * TILE,
  minY: 2.2 * TILE,
  maxY: 6.5 * TILE,
} as const;

/**
 * Utility Deck (Unit 6 — non-scored closure). Placement rule (D-V2-1):
 * every 44 px approach point has no other interactable nearer than the
 * station itself (±12 px); the three feeds sit ≥ 100 px apart along the
 * south machinery wall in their operational order (west → east), the
 * review panel and systems board on the north-west wall by the entry, the
 * Core door in the north alcove (PILOT_DOORS: 400, 120).
 */
export const DECK_SITES = {
  reviewPanel: { x: 9 * TILE, y: 4.5 * TILE },
  systemsBoard: { x: 5.5 * TILE, y: 4.5 * TILE },
  coolantValve: { x: 5 * TILE, y: 12 * TILE },
  calibrationBreaker: { x: 12.5 * TILE, y: 12 * TILE },
  distributionBus: { x: 20 * TILE, y: 12 * TILE },
  /** Three-feed manifold indicator on the north wall beside the alcove. */
  manifold: { x: 17.5 * TILE, y: 4.5 * TILE },
  /**
   * Core Chamber door (mirrors PILOT_DOORS.utility_core_deck): inside the
   * alcove at row 3.75 so the proximity prompt (drawn 72 px above) clears
   * the objective HUD line.
   */
  coreDoor: { x: 12.5 * TILE, y: 3.75 * TILE },
} as const;

/** Core Chamber (Unit 6): the Core over its central block, Kai's console east. */
export const CORE_SITES = {
  core: { x: 12.5 * TILE, y: 9.3 * TILE },
  coreVisual: { x: 12.5 * TILE, y: 7.4 * TILE },
  kai: { x: 18.5 * TILE, y: 8 * TILE },
  statusConsole: { x: 6.5 * TILE, y: 8 * TILE },
} as const;
