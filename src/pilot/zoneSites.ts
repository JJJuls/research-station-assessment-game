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
 * Dock — participant layout (World V2 rescue, 22×12 painted plate). All
 * anchors are mapped to the plate's baked art: the check-in kiosk stands
 * against the north wall at x 248 (approached from the south), the
 * Concourse door sprite is centred at x 352 in the north wall band, the
 * sealed docking vault is baked at the south hull centre x 328, the
 * arrival spawn is 96 px north of the vault anchor (outside its 72 px
 * radius), and the movement marker sits on open deck east of the spawn.
 */
export const DOCK_SITES = {
  terminal: { x: 248, y: 132 },
  marker: { x: 456, y: 192 },
  northDoor: { x: 352, y: 64 },
  dockingAirlock: { x: 328, y: 300 },
  spawnArrival: { x: 328, y: 204 },
  spawnFromConcourse: { x: 352, y: 152 },
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
 * Station Concourse (World V2 rescue, 22×12 painted plate) — episode 1
 * (incident handover) and episode 5 (return). Anchors are mapped to the
 * plate's baked art: Vale stands on the open deck in front of her
 * operations desk (east-centre); Kai's return post is on the west side
 * of the hall (the return handover happens on the floor, not behind the
 * desk); the incident plan board is baked on the north-west wall; the
 * incident desk is a layered sprite mid-north; the quality packet lies
 * on the baked north-east work table (approached from the west); the
 * monitor gauge hangs on the south hull east of the Dock hatch; the
 * faulty reading-desk lamp is the baked green lamp on the south-west
 * reading table. Every anchor/approach pair was audited against the
 * 72 px interaction radius so each approach point's nearest interactable
 * is its own station (±12 px driver landing error included).
 */
export const CONCOURSE_STATIONS = {
  vale: { x: 440, y: 208 },
  /** Kai's return-shift position (episode 5 handover), west floor. */
  kaiReturn: { x: 232, y: 148 },
  planBoard: { x: 152, y: 148 },
  incidentDesk: { x: 616, y: 268 },
  qcPacket: { x: 480, y: 140 },
  monitorGauge: { x: 520, y: 300 },
  concourseFault: { x: 124, y: 240 },
} as const;

/** Concourse arrival spawns (≥ 96 px from every door anchor). */
export const CONCOURSE_SPAWNS = {
  fromDock: { x: 352, y: 224 },
  fromLaboratory: { x: 368, y: 172 },
  fromRecords: { x: 196, y: 220 },
  fromDeck: { x: 592, y: 180 },
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
