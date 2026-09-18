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
 * Concourse door is painted INTO the north wall at x 352, standing on the
 * wall base (anchor = the leaf's centre, y 100), the
 * sealed docking vault is baked at the south hull centre x 328, the
 * arrival spawn is 96 px north of the vault anchor (outside its 72 px
 * radius), and the movement marker sits on open deck east of the spawn.
 */
export const DOCK_SITES = {
  terminal: { x: 248, y: 132 },
  marker: { x: 456, y: 192 },
  northDoor: { x: 352, y: 100 },
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
 * monitor gauge is a pedestal instrument standing on the deck south of
 * the operations desk (its 42×51 sprite is centred on the anchor, so its
 * base meets the floor at y 290 — it used to float over the south hull); the
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
  monitorGauge: { x: 520, y: 264 },
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
 * World V2 rescue continuation: a 43×12 two-bay painted hall
 * (src/world/layouts/workshop.ts; plate workshop-plate.png). Anchors are
 * mapped to the plates' baked art — machine bay west (case desk, both
 * presses, relay bench, cutter island + bin, locker, assembly bench,
 * supply pallet zone), records office east (dispatch desk, feed console,
 * seal board, handover desk, four south-hull benches, work-order board
 * by the Concourse door). Every anchor/approach pair, the spawn, the
 * bundle positions and the debris scatter were machine-audited (32×42
 * body, ±12 px landing box, nearest-wins radius 72, spawn/door
 * clearance, BFS connectivity) — see the layout module header.
 */
export const WORKSHOP_STATIONS = {
  workOrderBoard: { x: 1344, y: 140 },
  filingDesk: { x: 184, y: 170 },
  pressA: { x: 236, y: 160 },
  pressB: { x: 302, y: 160 },
  storageLocker: { x: 331, y: 300 },
  assemblyBench: { x: 534, y: 305 },
  supplyA: { x: 196, y: 244 },
  supplyB: { x: 244, y: 248 },
  supplyC: { x: 220, y: 282 },
  feedConsole: { x: 1034, y: 132 },
  relayBench: { x: 104, y: 232 },
  reportDesk: { x: 996, y: 300 },
  handoverDesk: { x: 1148, y: 164 },
} as const;

/** Workshop episode-2 stations (same audited book; scene + registry). */
export const WORKSHOP_SITES = {
  sampleCutter: { x: 392, y: 230 },
  /**
   * Debris scatter origin: pieces land at origin + the fixed M04 offsets
   * (dx −64…52, dy 0…64), at the cutter's operator side. Presentation
   * placement only — the offsets themselves are the window's fixture.
   */
  cutterScatter: { x: 344, y: 224 },
  disposalChute: { x: 492, y: 235 },
  dispatchConsole: { x: 915, y: 170 },
  calibrationBench: { x: 833, y: 300 },
  qcPacket: { x: 1100, y: 300 },
  sealLog: { x: 1211, y: 142 },
  latticeBench: { x: 1193, y: 300 },
} as const;

/** Workshop arrival spawn (inside the east door, clear of every radius). */
export const WORKSHOP_SPAWN = { x: 1256, y: 244 } as const;

/**
 * Diagnostics Laboratory — the signal-analysis incident (Unit 3). World V2
 * rebuild: a 22×12 painted plate (src/world/layouts/laboratory.ts; plate
 * laboratory-plate.png). Anchors are mapped to the plate's baked art: the
 * orientation console on the north-west wall, the sealed yard airlock
 * hatch on the north wall, the large wall display (its dynamic trace is
 * drawn in-engine inside the painted bezel), Kai in front of his briefing
 * desk (north-east), the signal-analysis workstation island mid-east
 * (approached from the west), and the four phase benches baked into the
 * south hull band in presented order — evidence table, protocol console,
 * [Concourse door], training rig, diagnostic board — each approached from
 * the row-7 lane above it. Every anchor/approach pair, the spawns and the
 * island lane were machine-audited (32×42 body, ±12 px landing box,
 * nearest-wins radius 72, spawn/door clearance, BFS connectivity).
 */
export const LAB_STATIONS = {
  /** Painted display bezel centre (the trace box: x 372–502, y 68–126). */
  display: { x: 437, y: 97 },
  workstation: { x: 406, y: 196 },
  orientation: { x: 142, y: 170 },
  kai: { x: 560, y: 172 },
  evidenceTable: { x: 142, y: 300 },
  protocolConsole: { x: 235, y: 300 },
  trainingRig: { x: 477, y: 292 },
  diagnosticBoard: { x: 573, y: 295 },
} as const;

/** Laboratory arrival spawns (≥ 80 px from every door, outside every radius). */
export const LAB_SPAWNS = {
  fromConcourse: { x: 330, y: 216 },
  fromYard: { x: 250, y: 224 },
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
  /**
   * World V2 rebuild: a 43×12 two-plate painted strip
   * (src/world/layouts/yard.ts; plate yard-plate.png). Anchors are mapped
   * to the plates' baked art — west: Noor on the apron by the airlock,
   * the supply crate and the guy-line flag against the hull, the frozen
   * coupling (its east flange; the wheel is boxed in by the pipe run),
   * the heater rack, the two uplink posts with the line panel between
   * them, Mast 04 on its rock footing; east, through the drift pass: the
   * staked excavation field, the gantry magnet rig over the scrap
   * catchment, the parts cart (magnet tray) and the control bench
   * (sorting bench). Machine-audited like the other rebuilt rooms.
   */
  noor: { x: 250, y: 236 },
  supplyCrate: { x: 450, y: 296 },
  cableFlag: { x: 512, y: 300 },
  coupling: { x: 150, y: 205 },
  thawRack: { x: 160, y: 200 },
  mast: { x: 452, y: 178 },
  /** The painted lattice tower's crown (beacon / restored-signal cue). */
  mastTower: { x: 434, y: 24 },
  plotStake: { x: 860, y: 190 },
  magnetRig: { x: 1200, y: 176 },
  magnetTray: { x: 1280, y: 285 },
  sortingBench: { x: 1296, y: 232 },
  uplinkA: { x: 200, y: 76 },
  linePanel: { x: 292, y: 110 },
  uplinkB: { x: 390, y: 86 },
} as const;

/** Magnet rig operating pad (F works only here): under the gantry beam. */
export const YARD_RIG_PAD = {
  minX: 1130,
  maxX: 1250,
  minY: 176,
  maxY: 252,
} as const;

/** Yard arrival spawn (inside the airlock, clear of every radius). */
export const YARD_SPAWN = { x: 342, y: 240 } as const;

/**
 * Utility Deck (Unit 6 — non-scored closure). World V2 rebuild: a 22×12
 * painted plate (src/world/layouts/deck.ts; plate deck-plate.png). Anchors
 * are mapped to the plate's baked art: the shift review screen and its
 * clipboards on the north-west wall, the gauge systems board beside it,
 * the sealed Core blast door in the north alcove, the manifold gauges on
 * the north-east wall, and the three dormant feed machines along the
 * south hull in operational order (coolant valve wheel → breaker bank →
 * distribution bus cabinet). The machines are tall (rows 7–10), so each
 * feed is approached from the rows 5–6 band above it; the coolant valve's
 * anchor sits at its east flange (the wheel itself is boxed in by the
 * review screen's radius). Every anchor/approach pair, both spawns and
 * the door clearances were machine-audited (32×42 body, ±12 px landing
 * box, nearest-wins radius 72, BFS connectivity).
 */
export const DECK_SITES = {
  reviewPanel: { x: 150, y: 124 },
  systemsBoard: { x: 257, y: 132 },
  coolantValve: { x: 230, y: 250 },
  calibrationBreaker: { x: 336, y: 240 },
  distributionBus: { x: 492, y: 240 },
  /** Three-feed manifold gauges on the north-east wall. */
  manifold: { x: 560, y: 132 },
  /** Core Chamber blast door (mirrors PILOT_DOORS.utility_core_deck). */
  coreDoor: { x: 400, y: 140 },
} as const;

/** Deck arrival spawns (≥ 80 px from the door used, outside every radius). */
export const DECK_SPAWNS = {
  fromConcourse: { x: 186, y: 188 },
  fromCore: { x: 414, y: 220 },
} as const;

/**
 * Core Chamber (Unit 6). World V2 rebuild: a 22×12 painted plate
 * (src/world/layouts/coreChamber.ts; plate core-plate.png). The dormant
 * reactor stands on its central platform (the Core's control anchor is
 * the platform's west face, approached from the west floor); the status
 * console is baked on the west wall, Kai stands in front of his curved
 * operator console on the east floor; the Utility Deck door is baked into
 * the south hull. Machine-audited like the other rebuilt rooms.
 */
export const CORE_SITES = {
  core: { x: 270, y: 205 },
  /** The reactor vessel's painted centre (emissive overlays). */
  coreVisual: { x: 344, y: 150 },
  kai: { x: 520, y: 225 },
  statusConsole: { x: 75, y: 225 },
} as const;

/** Core Chamber arrival spawn (inside the south door, clear of every radius). */
export const CORE_SPAWN = { x: 230, y: 288 } as const;
