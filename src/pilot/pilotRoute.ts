/**
 * Pilot route — the ONE active objective, the destination beacon, the
 * station map model and the concise mission log of the evidence-led
 * professional assessment pilot v2 (Unit 1: route and guidance shell).
 *
 * PURE module (no Phaser, no import.meta; logging is an injected sink so the
 * stage machine is Node-testable). Session-scope singleton state: survives
 * scene transitions for the page lifetime; a reload is a new session.
 *
 * Route architecture (decision workbook sheet 11): five assessment
 * episodes plus one non-scored closure on a hub-and-loop topology with
 * bidirectional doors and EXACTLY ONE purposeful return —
 *
 *   1 Storm Arrival & Incident Handover   Dock → Station Concourse
 *   2 Records & Workshop Restoration      Records Workshop
 *   3 Signal Analysis Incident            Diagnostics Laboratory
 *   4 Exterior Recovery                   Recovery Yard (+ Metal Yard)
 *   5 Return, Revision & Handover         Concourse → Workshop (return)
 *   6 Utility & Core Closure              Utility Deck → Core Chamber
 *                                         (non-scored; Unit 6 — the Core
 *                                         Chamber is its own zone behind
 *                                         a readiness-gated door)
 *
 * Scientific boundary: the route stage is NAVIGATION state only. Advancing
 * a stage never requires a correct answer, a completed window, persistence
 * or any performance; every NPC/board beat offers "move on". Station
 * completion predicates (registered by the zone scenes) steer only the
 * beacon; they never gate a door. Every `pilot_*` event is unmapped route
 * telemetry (no canonical context, no study item, never a score).
 */

export type PilotZoneKey =
  | 'dock'
  | 'station_concourse'
  | 'records_workshop'
  | 'diagnostics_laboratory'
  | 'exterior_recovery_yard'
  | 'utility_core_deck'
  | 'core_chamber';

export const PILOT_ZONE_KEYS: readonly PilotZoneKey[] = [
  'dock',
  'station_concourse',
  'records_workshop',
  'diagnostics_laboratory',
  'exterior_recovery_yard',
  'utility_core_deck',
  'core_chamber',
];

export const PILOT_ZONE_NAMES: Record<PilotZoneKey, string> = {
  dock: 'Dock',
  station_concourse: 'Station Concourse',
  records_workshop: 'Records Workshop',
  diagnostics_laboratory: 'Diagnostics Laboratory',
  exterior_recovery_yard: 'Recovery Yard',
  utility_core_deck: 'Utility Deck',
  core_chamber: 'Core Chamber',
};

/** The six route episodes (sheet 11). Episode 6 hosts no measurement window. */
export type PilotEpisode = 1 | 2 | 3 | 4 | 5 | 6;

export const PILOT_EPISODE_NAMES: Record<PilotEpisode, string> = {
  1: 'Storm Arrival & Incident Handover',
  2: 'Records & Workshop Restoration',
  3: 'Signal Analysis Incident',
  4: 'Exterior Recovery',
  5: 'Return, Revision & Handover',
  6: 'Utility & Core Closure',
};

/**
 * Route stages in order. Each stage has exactly one objective sentence and
 * one destination rule. Stages advance through explicit NPC/board beats,
 * never through performance, and never move backwards.
 */
export type PilotStage =
  | 'arrival'
  | 'handover_briefing'
  | 'incident_handover'
  | 'workshop'
  | 'workshop_work'
  | 'lab_briefing'
  | 'lab_work'
  | 'exterior_briefing'
  | 'exterior_work'
  | 'return_hub'
  | 'workshop_return'
  | 'deck_closure'
  | 'core_stabilise'
  | 'core_sync'
  | 'complete';

export const PILOT_STAGES: readonly PilotStage[] = [
  'arrival',
  'handover_briefing',
  'incident_handover',
  'workshop',
  'workshop_work',
  'lab_briefing',
  'lab_work',
  'exterior_briefing',
  'exterior_work',
  'return_hub',
  'workshop_return',
  'deck_closure',
  'core_stabilise',
  'core_sync',
  'complete',
];

/** One concise sentence per stage — the ONE objective line. */
export const PILOT_OBJECTIVES: Record<PilotStage, string> = {
  arrival:
    'Check in at the Arrival Terminal, then take the north door into the Concourse.',
  handover_briefing: 'Report to Vale at the operations desk.',
  incident_handover:
    'Work the storm packet, then confirm the handover with Vale.',
  workshop: 'Take the west door to the Records Workshop.',
  workshop_work:
    'Work through the workshop orders, then sign the board when you are done.',
  lab_briefing:
    'Go to the Diagnostics Laboratory — Concourse north door — and report to Kai.',
  lab_work: 'Work the signal analysis case, then report to Kai.',
  exterior_briefing:
    'Take the airlock to the Recovery Yard and report to Noor.',
  exterior_work: "Work Noor's recovery jobs, then report to Noor.",
  return_hub: 'Return inside to the Concourse and check in with Vale.',
  workshop_return:
    'Finish the shift in the Records Workshop, then sign the board.',
  deck_closure:
    'Utility Deck — Concourse east door: close the station record at the Shift Review Panel.',
  core_stabilise:
    'Bring the feeds up in order: coolant valve, calibration breaker, distribution bus.',
  core_sync:
    'Enter the Core Chamber — north door — and confirm synchronisation at the Core.',
  complete: 'Shift complete — the Core is stable.',
};

/** Which zone each stage's destination lives in (null = route complete). */
const STAGE_ZONE: Record<PilotStage, PilotZoneKey | null> = {
  arrival: 'dock',
  handover_briefing: 'station_concourse',
  incident_handover: 'station_concourse',
  workshop: 'records_workshop',
  workshop_work: 'records_workshop',
  lab_briefing: 'diagnostics_laboratory',
  lab_work: 'diagnostics_laboratory',
  exterior_briefing: 'exterior_recovery_yard',
  exterior_work: 'exterior_recovery_yard',
  return_hub: 'station_concourse',
  workshop_return: 'records_workshop',
  deck_closure: 'utility_core_deck',
  core_stabilise: 'utility_core_deck',
  core_sync: 'core_chamber',
  complete: null,
};

/** Which episode each stage belongs to. */
export const STAGE_EPISODE: Record<PilotStage, PilotEpisode> = {
  arrival: 1,
  handover_briefing: 1,
  incident_handover: 1,
  workshop: 2,
  workshop_work: 2,
  lab_briefing: 3,
  lab_work: 3,
  exterior_briefing: 4,
  exterior_work: 4,
  return_hub: 5,
  workshop_return: 5,
  deck_closure: 6,
  core_stabilise: 6,
  core_sync: 6,
  complete: 6,
};

/**
 * Zone graph: for each zone, the door to take toward every other zone.
 * Door positions are the in-map interactable positions (declared by the
 * zone scenes; mirrored here for the beacon so the model stays pure).
 * Every door is declared in BOTH zones (bidirectional by construction —
 * asserted by the pure route-model spec).
 */
export interface PilotDoorRef {
  /** Destination zone of this door. */
  to: PilotZoneKey;
  x: number;
  y: number;
  label: string;
}

export const PILOT_DOORS: Record<PilotZoneKey, readonly PilotDoorRef[]> = {
  // World V2 rescue: Dock 22×12 and Concourse 22×12 painted plates —
  // door anchors sit on the plates' baked/inpainted doorways
  // (src/world/layouts/dock.ts, concourse.ts).
  dock: [
    { to: 'station_concourse', x: 352, y: 64, label: 'Station Concourse' },
  ],
  station_concourse: [
    { to: 'dock', x: 339, y: 300, label: 'Dock' },
    { to: 'records_workshop', x: 40, y: 192, label: 'Records Workshop' },
    {
      to: 'diagnostics_laboratory',
      x: 320,
      y: 72,
      label: 'Diagnostics Laboratory',
    },
    { to: 'utility_core_deck', x: 648, y: 130, label: 'Utility Deck' },
  ],
  records_workshop: [
    // World V2 rescue continuation: 43×12 two-bay painted hall — the
    // Concourse door is baked into the office's east wall (lower half;
    // the work-order board hangs above it).
    { to: 'station_concourse', x: 1332, y: 290, label: 'Station Concourse' },
  ],
  diagnostics_laboratory: [
    // World V2 rebuild: 22×12 painted plate — the Concourse door is baked
    // into the south hull between the protocol console and the training
    // rig; the yard airlock hatch is baked into the north wall.
    { to: 'station_concourse', x: 334, y: 300, label: 'Station Concourse' },
    {
      to: 'exterior_recovery_yard',
      x: 250,
      y: 140,
      label: 'Exterior Airlock',
    },
  ],
  exterior_recovery_yard: [
    // World V2 rebuild: 43×12 two-plate strip — the airlock is baked into
    // the west half's south hull.
    {
      to: 'diagnostics_laboratory',
      x: 342,
      y: 322,
      label: 'Airlock — Laboratory',
    },
  ],
  utility_core_deck: [
    // World V2 rebuild: 22×12 painted plate — the Concourse doorway is
    // baked into the west wall (open leaf), the Core blast door into the
    // north alcove.
    { to: 'station_concourse', x: 60, y: 200, label: 'Station Concourse' },
    // Unit 6: the Core Chamber door (north alcove). Gated by the deck on
    // route readiness + the three feeds; bidirectional once open.
    { to: 'core_chamber', x: 400, y: 140, label: 'Core Chamber' },
  ],
  core_chamber: [
    // World V2 rebuild: 22×12 painted plate — the Utility Deck door is
    // baked into the south hull.
    { to: 'utility_core_deck', x: 348, y: 330, label: 'Utility Deck' },
  ],
};

/** Next hop from `from` toward `to` (BFS over the zone graph). */
export function nextHopDoor(
  from: PilotZoneKey,
  to: PilotZoneKey,
): PilotDoorRef | null {
  if (from === to) {
    return null;
  }

  const previous = new Map<PilotZoneKey, PilotDoorRef | null>();
  const queue: PilotZoneKey[] = [from];

  previous.set(from, null);

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const door of PILOT_DOORS[current]) {
      if (previous.has(door.to)) {
        continue;
      }

      previous.set(door.to, current === from ? door : previous.get(current)!);

      if (door.to === to) {
        return previous.get(to) ?? null;
      }

      queue.push(door.to);
    }
  }

  return null;
}

/**
 * The stage destination sequence with consecutive duplicates collapsed —
 * the zones the route visits, in order (pure helper for the route-model
 * spec's "exactly one purposeful return" assertion).
 */
export function stageDestinationSequence(): PilotZoneKey[] {
  const sequence: PilotZoneKey[] = [];

  for (const stage of PILOT_STAGES) {
    const zone = STAGE_ZONE[stage];

    if (zone !== null && sequence[sequence.length - 1] !== zone) {
      sequence.push(zone);
    }
  }

  return sequence;
}

/**
 * Number of purposeful return legs: maximal runs of already-visited zones
 * in the destination sequence. The v2 route has exactly ONE (Recovery
 * Yard → Concourse → Workshop), which hosts the prospective-memory windows.
 */
export function purposefulReturnLegs(): number {
  const visited = new Set<PilotZoneKey>();
  let legs = 0;
  let inReturn = false;

  for (const zone of stageDestinationSequence()) {
    if (visited.has(zone)) {
      if (!inReturn) {
        legs += 1;
        inReturn = true;
      }
    } else {
      inReturn = false;
      visited.add(zone);
    }
  }

  return legs;
}

/**
 * Route stations: zone scenes register their guided stations (position +
 * completion predicate) on create so the beacon can point at the next
 * unfinished one. Completion predicates are read by the beacon ONLY.
 */
export interface PilotRouteStation {
  id: string;
  zone: PilotZoneKey;
  x: number;
  y: number;
  label: string;
  /** Stage(s) during which this station is a guided destination. */
  stages: readonly PilotStage[];
  /** Terminal = no longer a beacon destination. Never gates anything. */
  isDone: () => boolean;
  /** Guided order within the zone (lower first). */
  order: number;
}

export interface PilotBeaconTarget {
  x: number;
  y: number;
  label: string;
  kind: 'station' | 'door' | 'npc';
}

/**
 * Concise mission log: obligations, projects and open work the participant
 * accepted or left mid-way. Entries are registered by the hosting windows
 * (Units 2–5); their text is OPERATIONAL only (never an item id, validity
 * word, score or evaluative label). Presentation only — the log never
 * gates a door or a stage.
 */
export type MissionLogKind = 'obligation' | 'project' | 'note';

export interface MissionLogEntry {
  id: string;
  kind: MissionLogKind;
  /** Current operational line (re-read on every render). */
  text: () => string;
  /** Hidden once true (e.g. obligation fulfilled) — the record stays. */
  isClosed: () => boolean;
  /** Display order (lower first). */
  order: number;
}

interface PilotRouteState {
  stage: PilotStage;
  visited: Set<PilotZoneKey>;
  entryCounts: Map<PilotZoneKey, number>;
  currentZone: PilotZoneKey | null;
  stageHistory: { from: PilotStage; to: PilotStage; at: number }[];
  startedAtMs: number | null;
}

function createInitialState(): PilotRouteState {
  return {
    stage: 'arrival',
    visited: new Set(),
    entryCounts: new Map(),
    currentZone: null,
    stageHistory: [],
    startedAtMs: null,
  };
}

let state = createInitialState();
const stations = new Map<string, PilotRouteStation>();
const missionLog = new Map<string, MissionLogEntry>();
const listeners = new Set<() => void>();

export type PilotRouteLogSink = (
  eventType: string,
  metadata: Record<string, unknown>,
) => void;

let logSink: PilotRouteLogSink | null = null;

/** Host installs the runtime logger once (RoomScene.logScenarioEvent). */
export function installPilotRouteLogSink(sink: PilotRouteLogSink | null) {
  logSink = sink;
}

function emit(eventType: string, metadata: Record<string, unknown>) {
  logSink?.(eventType, {
    stage: state.stage,
    episode: STAGE_EPISODE[state.stage],
    ...metadata,
  });
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function onPilotRouteChange(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function pilotStage(): PilotStage {
  return state.stage;
}

export function pilotObjective(): string {
  return PILOT_OBJECTIVES[state.stage];
}

export function pilotEpisode(): PilotEpisode {
  return STAGE_EPISODE[state.stage];
}

export function pilotStageIndex(stage: PilotStage = state.stage): number {
  return PILOT_STAGES.indexOf(stage);
}

/** True once the route has reached `stage` (or any later stage). */
export function pilotStageAtOrAfter(stage: PilotStage): boolean {
  return pilotStageIndex(state.stage) >= pilotStageIndex(stage);
}

/**
 * Advances to `to` if it is later than the current stage (idempotent for
 * repeats and never moves backwards). Returns whether it advanced.
 */
export function advancePilotStage(to: PilotStage, nowMs: number): boolean {
  if (pilotStageIndex(to) <= pilotStageIndex(state.stage)) {
    return false;
  }

  const from = state.stage;

  state.stage = to;
  state.stageHistory.push({ from, to, at: nowMs });
  emit('pilot_stage_advanced', { from, to });
  notify();

  return true;
}

/** Scene entry bookkeeping: discovery, re-entry count, arrival stage flips. */
export function notePilotZoneEntered(zone: PilotZoneKey, nowMs: number) {
  const count = (state.entryCounts.get(zone) ?? 0) + 1;

  state.entryCounts.set(zone, count);
  state.visited.add(zone);
  state.currentZone = zone;

  if (state.startedAtMs === null) {
    state.startedAtMs = nowMs;
  }

  emit('pilot_zone_entered', { zone, entry_count: count });

  // Arrival → handover briefing flips on first Concourse entry
  // (navigation only).
  if (zone === 'station_concourse' && state.stage === 'arrival') {
    advancePilotStage('handover_briefing', nowMs);
  }

  // Unit 6: entering the Core Chamber (only reachable once the deck's gated
  // door opened) flips the closure stage to the synchronisation step —
  // navigation only, never a performance check.
  if (zone === 'core_chamber' && state.stage === 'core_stabilise') {
    advancePilotStage('core_sync', nowMs);
  }

  notify();
}

export function pilotZoneEntryCount(zone: PilotZoneKey): number {
  return state.entryCounts.get(zone) ?? 0;
}

export function pilotZoneVisited(zone: PilotZoneKey): boolean {
  return state.visited.has(zone);
}

export function pilotCurrentZone(): PilotZoneKey | null {
  return state.currentZone;
}

/** Destination zone of the current stage (null when complete). */
export function pilotDestinationZone(): PilotZoneKey | null {
  return STAGE_ZONE[state.stage];
}

export function pilotStageZone(stage: PilotStage): PilotZoneKey | null {
  return STAGE_ZONE[stage];
}

export function registerPilotStation(station: PilotRouteStation) {
  stations.set(station.id, station);
}

export function pilotStationsInZone(zone: PilotZoneKey): PilotRouteStation[] {
  return [...stations.values()]
    .filter((station) => station.zone === zone)
    .sort((a, b) => a.order - b.order);
}

/**
 * The single beacon target for the given zone under the current stage:
 * - stage destination in another zone → the next-hop door;
 * - stage destination in this zone → the first unfinished guided station
 *   for this stage, else the stage's NPC/anchor station (order 0);
 * - route complete → none.
 * Exactly one target, or none (never two highlights).
 */
export function pilotBeaconTarget(
  zone: PilotZoneKey,
  nowMs: number = 0,
): PilotBeaconTarget | null {
  void nowMs;
  const destination = pilotDestinationZone();

  if (destination === null) {
    return null;
  }

  if (destination !== zone) {
    const door = nextHopDoor(zone, destination);

    return door === null
      ? null
      : { x: door.x, y: door.y, label: door.label, kind: 'door' };
  }

  // Guided work stations first (order > 0); the stage anchor (order 0,
  // the NPC/board that advances the stage) is the fallback below.
  const guided = pilotStationsInZone(zone).filter(
    (station) => station.order > 0 && station.stages.includes(state.stage),
  );
  const next = guided.find((station) => !station.isDone());

  if (next !== undefined) {
    return {
      x: next.x,
      y: next.y,
      label: next.label,
      kind: next.id.startsWith('npc_') ? 'npc' : 'station',
    };
  }

  // Every guided station terminal → fall back to the stage anchor (the NPC
  // or board that advances the stage), declared with `order: 0`.
  const anchor = pilotStationsInZone(zone).find(
    (station) => station.order === 0 && station.stages.includes(state.stage),
  );

  return anchor === undefined
    ? null
    : {
        x: anchor.x,
        y: anchor.y,
        label: anchor.label,
        kind: anchor.id.startsWith('npc_') ? 'npc' : 'station',
      };
}

// ——— Mission log ————————————————————————————————————————————————————————

export function registerMissionLogEntry(entry: MissionLogEntry) {
  missionLog.set(entry.id, entry);
  notify();
}

export function removeMissionLogEntry(id: string) {
  if (missionLog.delete(id)) {
    notify();
  }
}

/**
 * Unit 6: once the station record is closed at the Utility Deck review,
 * the log shows ONE neutral notice instead of the accepted obligations —
 * presentation only (no window is touched); it stops inviting work the
 * closed record could no longer receive. Null = the ordinary log.
 */
let missionLogNotice: string | null = null;

export function setMissionLogNotice(text: string | null) {
  missionLogNotice = text;
  notify();
}

/** Open (not closed) entries, in display order. Concise by construction. */
export function pilotMissionLog(): {
  id: string;
  kind: MissionLogKind;
  text: string;
}[] {
  if (missionLogNotice !== null) {
    return [{ id: 'record_closed', kind: 'note', text: missionLogNotice }];
  }

  return [...missionLog.values()]
    .filter((entry) => !entry.isClosed())
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({ id: entry.id, kind: entry.kind, text: entry.text() }));
}

// ——— Station map ————————————————————————————————————————————————————————

export interface PilotMapNode {
  zone: PilotZoneKey;
  name: string;
  discovered: boolean;
  current: boolean;
  destination: boolean;
}

export function pilotMapModel(): PilotMapNode[] {
  const destination = pilotDestinationZone();

  return PILOT_ZONE_KEYS.map((zone) => ({
    zone,
    name: PILOT_ZONE_NAMES[zone],
    discovered: state.visited.has(zone),
    current: state.currentZone === zone,
    destination: destination === zone,
  }));
}

export function pilotRouteSummary() {
  return {
    stage: state.stage,
    episode: STAGE_EPISODE[state.stage],
    current_zone: state.currentZone,
    visited: [...state.visited],
    entry_counts: Object.fromEntries(state.entryCounts),
    stage_history: [...state.stageHistory],
    started_at_ms: state.startedAtMs,
  };
}

/** Test-only escape hatch. */
export function resetPilotRouteState() {
  state = createInitialState();
  stations.clear();
  missionLog.clear();
  missionLogNotice = null;
}
