/**
 * Pilot zone work-site positions (evidence-led pilot v2).
 *
 * Shared between the zone scenes and the units that activate the stations
 * so positions are declared exactly once. Pixel coordinates on 25×19 maps.
 */
const TILE = 32;

/** Station Concourse — episode 1 (incident desk) and episode 5 (return). */
export const CONCOURSE_STATIONS = {
  vale: { x: 15.5 * TILE, y: 8.5 * TILE },
  /** Kai's return-shift position (episode 5 handover) beside the desk. */
  kaiReturn: { x: 18.5 * TILE, y: 8.5 * TILE },
  planBoard: { x: 4 * TILE, y: 5 * TILE },
  incidentDesk: { x: 8 * TILE, y: 5 * TILE },
  qcPacket: { x: 8 * TILE, y: 13 * TILE },
  monitorGauge: { x: 11 * TILE, y: 13 * TILE },
  concourseFault: { x: 19 * TILE, y: 13.5 * TILE },
} as const;

/** Records Workshop — episode 2 (restoration) and episode 5 (return). */
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

/** Utility & Core Deck sites. */
export const DECK_SITES = {
  coreConsole: { x: 12.5 * TILE, y: 4.2 * TILE },
  systemsBoard: { x: 18 * TILE, y: 9.5 * TILE },
} as const;
