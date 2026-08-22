/**
 * Pilot route — the ONE active objective, the destination beacon and the
 * station-map model of the professional pilot route (Unit 2).
 *
 * PURE module (no Phaser, no import.meta; logging is an injected sink so the
 * stage machine is Node-testable). Session-scope singleton state: survives
 * scene transitions for the page lifetime; a reload is a new session.
 *
 * Scientific boundary: the route stage is NAVIGATION state only. Advancing a
 * stage never requires a correct answer, a completed window, persistence or
 * any performance; every NPC beat offers "move on". Station completion
 * predicates (registered by the zone scenes) steer only the beacon and the
 * Core completeness review; they never gate a door. Every `pilot_*` event is
 * unmapped route telemetry (no canonical context, no study item).
 */

export type PilotZoneKey =
  | 'dock'
  | 'station_concourse'
  | 'diagnostics_laboratory'
  | 'exterior_recovery_yard'
  | 'utility_core_deck';

export const PILOT_ZONE_KEYS: readonly PilotZoneKey[] = [
  'dock',
  'station_concourse',
  'diagnostics_laboratory',
  'exterior_recovery_yard',
  'utility_core_deck',
];

export const PILOT_ZONE_NAMES: Record<PilotZoneKey, string> = {
  dock: 'Dock',
  station_concourse: 'Station Concourse',
  diagnostics_laboratory: 'Diagnostics & Signal Laboratory',
  exterior_recovery_yard: 'Exterior Recovery Yard',
  utility_core_deck: 'Utility & Core Deck',
};

/**
 * Route stages in order. Each stage has exactly one objective sentence and
 * one destination rule. Stages advance through explicit NPC/console beats,
 * never through performance.
 */
export type PilotStage =
  | 'arrival'
  | 'meet_vale'
  | 'records'
  | 'lab_briefing'
  | 'lab_work'
  | 'exterior_briefing'
  | 'exterior_work'
  | 'report_kai'
  | 'report_vale'
  | 'deck_review'
  | 'complete';

export const PILOT_STAGES: readonly PilotStage[] = [
  'arrival',
  'meet_vale',
  'records',
  'lab_briefing',
  'lab_work',
  'exterior_briefing',
  'exterior_work',
  'report_kai',
  'report_vale',
  'deck_review',
  'complete',
];

/** One concise sentence per stage (mission §8: never longer). */
export const PILOT_OBJECTIVES: Record<PilotStage, string> = {
  arrival:
    'Check in at the Arrival Terminal, then take the north door into the Concourse.',
  meet_vale: 'Report to Vale at the operations desk.',
  records:
    'Work through the Records & Logistics stations, then report back to Vale.',
  lab_briefing: 'Go north to the Diagnostics Laboratory and report to Kai.',
  lab_work: 'Work through the laboratory stations, then report to Kai.',
  exterior_briefing:
    'Take the airlock to the Exterior Recovery Yard and report to Noor.',
  exterior_work: "Work through Noor's yard jobs, then report back to Noor.",
  report_kai: 'Return through the airlock and report to Kai.',
  report_vale: 'Report to Vale in the Concourse.',
  deck_review:
    'Take the east door to the Utility & Core Deck and review completion at the Core console.',
  complete: 'Mission complete — the core is synchronised.',
};

/** Which zone each stage's destination lives in (null = route complete). */
const STAGE_ZONE: Record<PilotStage, PilotZoneKey | null> = {
  arrival: 'dock',
  meet_vale: 'station_concourse',
  records: 'station_concourse',
  lab_briefing: 'diagnostics_laboratory',
  lab_work: 'diagnostics_laboratory',
  exterior_briefing: 'exterior_recovery_yard',
  exterior_work: 'exterior_recovery_yard',
  report_kai: 'diagnostics_laboratory',
  report_vale: 'station_concourse',
  deck_review: 'utility_core_deck',
  complete: null,
};

/**
 * Zone graph: for each zone, the door to take toward every other zone.
 * Door positions are the in-map interactable positions (declared by the
 * zone scenes; mirrored here for the beacon so the model stays pure).
 */
export interface PilotDoorRef {
  /** Destination zone of this door. */
  to: PilotZoneKey;
  x: number;
  y: number;
  label: string;
}

export const PILOT_DOORS: Record<PilotZoneKey, readonly PilotDoorRef[]> = {
  dock: [
    { to: 'station_concourse', x: 368, y: 48, label: 'Station Concourse' },
  ],
  station_concourse: [
    { to: 'dock', x: 384, y: 496, label: 'Dock' },
    {
      to: 'diagnostics_laboratory',
      x: 384,
      y: 48,
      label: 'Diagnostics Laboratory',
    },
    { to: 'utility_core_deck', x: 752, y: 272, label: 'Utility & Core Deck' },
  ],
  diagnostics_laboratory: [
    { to: 'station_concourse', x: 384, y: 496, label: 'Station Concourse' },
    {
      to: 'exterior_recovery_yard',
      x: 384,
      y: 48,
      label: 'Exterior Airlock',
    },
  ],
  exterior_recovery_yard: [
    {
      to: 'diagnostics_laboratory',
      x: 384,
      y: 496,
      label: 'Airlock — Laboratory',
    },
  ],
  utility_core_deck: [
    { to: 'station_concourse', x: 64, y: 272, label: 'Station Concourse' },
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
  logSink?.(eventType, { stage: state.stage, ...metadata });
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

export function pilotStageIndex(stage: PilotStage = state.stage): number {
  return PILOT_STAGES.indexOf(stage);
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

  // Arrival → meet Vale flips on first Concourse entry (navigation only).
  if (zone === 'station_concourse' && state.stage === 'arrival') {
    advancePilotStage('meet_vale', nowMs);
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
 * Exactly one target, or none (mission §8: never two highlights).
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
  // the NPC/console that advances the stage) is the fallback below.
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
  // or console that advances the stage), declared with `order: 0`.
  const anchor = pilotStationsInZone(zone).find(
    (station) => station.order === 0 && station.stages.includes(state.stage),
  );

  return anchor === undefined
    ? null
    : { x: anchor.x, y: anchor.y, label: anchor.label, kind: 'npc' };
}

/** Station-map model (M key). */
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
}
