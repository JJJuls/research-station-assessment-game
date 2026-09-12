/**
 * Interaction registry (World V1 — docs/game/world-v1/INTERACTION-GRAMMAR.md).
 *
 * PURE module (no Phaser): every placed interactive object of a rebuilt
 * zone is declared once — id, kind, position, radius, verb, label,
 * availability rule, opened surface, footprint, depth anchor, stages and
 * hosted measurement window. The zone scenes build their stations from
 * these entries; the pure spec checks reachability and corridor clearance
 * against the layouts; the runtime spec checks the prompts.
 *
 * The object CLASS (active / optional / inactive / decorative) is never
 * hand-set: it is derived per frame from the availability rule and the
 * route's current guidance target (deriveObjectClass), so an object cannot
 * be mislabelled. Scientific boundary: the registry carries no measurement
 * logic — availability rules are navigation/stage predicates only.
 */
import type { PilotStage, PilotZoneKey } from '../pilot/pilotRoute';
import { PILOT_DOORS } from '../pilot/pilotRoute';
import {
  CONCOURSE_STATIONS,
  DOCK_SITES,
  WORKSHOP_SITES,
  WORKSHOP_STATIONS,
} from '../pilot/zoneSites';

export type ObjectClass = 'active' | 'optional' | 'inactive' | 'decorative';

export type RegistryKind = 'station' | 'door' | 'npc' | 'container' | 'decor';

export interface SurfaceRef {
  kind:
    | 'prompt'
    | 'work_surface'
    | 'inventory'
    | 'ip_overlay'
    | 'feed_panel'
    | 'door'
    | 'message'
    | 'action'
    | 'pickup';
  id: string;
}

/** Availability rule ids (INTERACTION-GRAMMAR.md §3). */
export type AvailabilityRule =
  | 'always'
  | `stage_at_or_after:${PilotStage}`
  | `stage_in:${string}`
  | `custom:${string}`;

export interface InteractionRegistryEntry {
  id: string;
  zone: PilotZoneKey;
  kind: RegistryKind;
  x: number;
  y: number;
  radius: number;
  verb: string;
  label: string;
  availability: AvailabilityRule;
  opens: SurfaceRef | null;
  /** Collision footprint in tiles (null = walkable / no body). */
  footprint: { w: number; h: number } | null;
  depthAnchor: 'foot' | 'floor' | 'overhead';
  stage: readonly PilotStage[] | 'any';
  window: string | null;
  /** Paired-alternative equality group (same class while the window is open). */
  equalityGroup?: string;
  /** Preferred approach point for the pure reachability check (world px). */
  approach: { x: number; y: number };
}

export const INTERACTION_RADIUS = 72;

const door = (
  zone: PilotZoneKey,
  to: PilotZoneKey,
  id: string,
  approach: { x: number; y: number },
  availability: AvailabilityRule = 'always',
): InteractionRegistryEntry => {
  const ref = PILOT_DOORS[zone].find((entry) => entry.to === to);

  if (ref === undefined) {
    throw new Error(`interactionRegistry: no door ${zone} → ${to}`);
  }

  return {
    id,
    zone,
    kind: 'door',
    x: ref.x,
    y: ref.y,
    radius: INTERACTION_RADIUS,
    verb: 'Go to',
    label: ref.label,
    availability,
    opens: { kind: 'door', id: to },
    footprint: null,
    depthAnchor: 'foot',
    stage: 'any',
    window: null,
    approach,
  };
};

const D = DOCK_SITES;
const C = CONCOURSE_STATIONS;

/** Dock (participant layout). */
export const DOCK_REGISTRY: readonly InteractionRegistryEntry[] = [
  door('dock', 'station_concourse', 'dock.door_concourse', {
    x: D.northDoor.x,
    y: D.northDoor.y + 56,
  }),
  {
    id: 'dock.arrival_terminal',
    zone: 'dock',
    kind: 'station',
    x: D.terminal.x,
    y: D.terminal.y,
    radius: INTERACTION_RADIUS,
    verb: 'Check in at',
    label: 'Arrival terminal',
    availability: 'always',
    opens: { kind: 'prompt', id: 'dockArrivalTutorial' },
    footprint: { w: 2, h: 1 },
    depthAnchor: 'foot',
    stage: 'any',
    window: null,
    approach: { x: D.terminal.x, y: D.terminal.y + 56 },
  },
  {
    id: 'dock.docking_airlock',
    zone: 'dock',
    kind: 'door',
    x: D.dockingAirlock.x,
    y: D.dockingAirlock.y,
    radius: INTERACTION_RADIUS,
    verb: 'Docking airlock',
    label: 'shuttle secured',
    availability: 'custom:sealed',
    opens: { kind: 'message', id: 'docking_airlock_sealed' },
    footprint: null,
    depthAnchor: 'foot',
    stage: 'any',
    window: null,
    approach: { x: D.dockingAirlock.x, y: D.dockingAirlock.y - 56 },
  },
];

/** Station Concourse. */
export const CONCOURSE_REGISTRY: readonly InteractionRegistryEntry[] = [
  door('station_concourse', 'dock', 'concourse.door_dock', {
    x: PILOT_DOORS.station_concourse[0].x,
    y: PILOT_DOORS.station_concourse[0].y - 56,
  }),
  // The Records door shares its pocket with the plan board and reading
  // lamp: the audited safe standing point is (84, 190) — every ±12 px
  // landing keeps the door strictly nearest.
  door('station_concourse', 'records_workshop', 'concourse.door_records', {
    x: PILOT_DOORS.station_concourse[1].x + 44,
    y: PILOT_DOORS.station_concourse[1].y - 2,
  }),
  door('station_concourse', 'diagnostics_laboratory', 'concourse.door_lab', {
    x: PILOT_DOORS.station_concourse[2].x,
    y: PILOT_DOORS.station_concourse[2].y + 56,
  }),
  door('station_concourse', 'utility_core_deck', 'concourse.door_deck', {
    x: PILOT_DOORS.station_concourse[3].x - 56,
    y: PILOT_DOORS.station_concourse[3].y,
  }),
  {
    id: 'concourse.vale',
    zone: 'station_concourse',
    kind: 'npc',
    x: C.vale.x,
    y: C.vale.y,
    radius: INTERACTION_RADIUS,
    verb: 'Talk to',
    label: 'Vale',
    availability: 'always',
    opens: { kind: 'prompt', id: 'pilotVale' },
    footprint: { w: 2, h: 1 },
    depthAnchor: 'foot',
    stage: 'any',
    window: null,
    // Approached from the west (the south strip belongs to the Dock
    // hatch's radius on the small plate).
    approach: { x: C.vale.x - 56, y: C.vale.y },
  },
  {
    id: 'concourse.kai_return',
    zone: 'station_concourse',
    kind: 'npc',
    x: C.kaiReturn.x,
    y: C.kaiReturn.y,
    radius: INTERACTION_RADIUS,
    verb: 'Talk to',
    label: 'Kai',
    availability: 'stage_at_or_after:return_hub',
    opens: { kind: 'prompt', id: 'pilotKai' },
    footprint: { w: 2, h: 1 },
    depthAnchor: 'foot',
    stage: [
      'return_hub',
      'workshop_return',
      'deck_closure',
      'core_stabilise',
      'core_sync',
      'complete',
    ],
    window: 'm10_promise_handover',
    approach: { x: C.kaiReturn.x, y: C.kaiReturn.y + 56 },
  },
  {
    id: 'concourse.plan_board',
    zone: 'station_concourse',
    kind: 'station',
    x: C.planBoard.x,
    y: C.planBoard.y,
    radius: INTERACTION_RADIUS,
    verb: 'Open',
    label: 'incident plan board',
    availability: 'always',
    opens: { kind: 'work_surface', id: 'm01_plan_board' },
    footprint: { w: 2, h: 2 },
    depthAnchor: 'foot',
    stage: 'any',
    window: 'm01_plan_board_w1',
    // South-east of the board's face: the audited pocket where every
    // ±12 px landing keeps the board nearest (the reading lamp and Kai
    // own the areas south and east of it).
    approach: { x: C.planBoard.x + 24, y: C.planBoard.y + 44 },
  },
  {
    id: 'concourse.incident_desk',
    zone: 'station_concourse',
    kind: 'station',
    x: C.incidentDesk.x,
    y: C.incidentDesk.y,
    radius: INTERACTION_RADIUS,
    verb: 'Work the',
    label: 'incident desk',
    availability: 'always',
    opens: { kind: 'work_surface', id: 'm14_incident_desk' },
    footprint: { w: 2, h: 2 },
    depthAnchor: 'foot',
    stage: 'any',
    window: 'm14_desk_w1',
    // The desk stands in the east strip against the hull; approached
    // from the north.
    approach: { x: C.incidentDesk.x, y: C.incidentDesk.y - 56 },
  },
  {
    id: 'concourse.qc_packet_o1',
    zone: 'station_concourse',
    kind: 'station',
    x: C.qcPacket.x,
    y: C.qcPacket.y,
    radius: INTERACTION_RADIUS,
    verb: 'Check the',
    label: 'quality packet',
    availability: 'always',
    opens: { kind: 'work_surface', id: 'm12_qc_packet_o1' },
    footprint: { w: 2, h: 2 },
    depthAnchor: 'foot',
    stage: 'any',
    window: 'm12_qc_o1',
    // The packet lies on the baked north-east work table; the open floor
    // is west of it.
    approach: { x: C.qcPacket.x - 56, y: C.qcPacket.y },
  },
  {
    id: 'concourse.monitor_gauge',
    zone: 'station_concourse',
    kind: 'station',
    x: C.monitorGauge.x,
    y: C.monitorGauge.y,
    radius: INTERACTION_RADIUS,
    verb: 'Read the',
    label: 'monitor gauge',
    availability: 'always',
    opens: { kind: 'message', id: 'gauge_reading' },
    footprint: { w: 2, h: 2 },
    depthAnchor: 'foot',
    stage: 'any',
    window: 'm09_check_1 / m09_check_2 (non-canonical label)',
    // The gauge hangs on the south hull face; approached from the north.
    approach: { x: C.monitorGauge.x, y: C.monitorGauge.y - 56 },
  },
  {
    id: 'concourse.reading_desk_lamp',
    zone: 'station_concourse',
    kind: 'station',
    x: C.concourseFault.x,
    y: C.concourseFault.y,
    radius: INTERACTION_RADIUS,
    verb: 'Use',
    label: 'desk lamp',
    availability: 'always',
    opens: { kind: 'action', id: 'm05_fix' },
    footprint: { w: 2, h: 2 },
    depthAnchor: 'foot',
    stage: 'any',
    window: 'm05_initiation_o1',
    // The lamp sits on the reading table against the south-west hull;
    // approached from the east, clear of the table's footprint and of
    // the plan board's radius (audited ±12 px pocket).
    approach: { x: C.concourseFault.x + 56, y: C.concourseFault.y },
  },
];

const W = WORKSHOP_STATIONS;
const WS = WORKSHOP_SITES;

const workshopStation = (
  id: string,
  at: { x: number; y: number },
  verb: string,
  label: string,
  opens: SurfaceRef,
  window: string | null,
  approach: { x: number; y: number },
  footprint: { w: number; h: number } | null = { w: 2, h: 2 },
): InteractionRegistryEntry => ({
  id,
  zone: 'records_workshop',
  kind: 'station',
  x: at.x,
  y: at.y,
  radius: INTERACTION_RADIUS,
  verb,
  label,
  availability: 'always',
  opens,
  footprint,
  depthAnchor: 'foot',
  stage: 'any',
  window,
  approach,
});

/**
 * Records Workshop (World V2 rescue continuation, 43×12 two-bay hall).
 * Every approach point below is the machine-audited safe standing point
 * of its station: the ±12 px landing box is standable (32×42 body), the
 * station itself is strictly nearest at every landing, and the whole
 * book is BFS-connected from the spawn (workshop layout header).
 */
export const WORKSHOP_REGISTRY: readonly InteractionRegistryEntry[] = [
  door('records_workshop', 'station_concourse', 'workshop.door_concourse', {
    x: 1288,
    y: 268,
  }),
  workshopStation(
    'workshop.work_order_board',
    W.workOrderBoard,
    'Open the',
    'Work Order Board',
    { kind: 'prompt', id: 'pilotWorkOrderBoard' },
    null,
    { x: 1312, y: 178 },
    null,
  ),
  workshopStation(
    'workshop.case_workspace',
    W.filingDesk,
    'Open the',
    'Case Workspace',
    { kind: 'inventory', id: 'm02case' },
    'm02_case_workspace',
    { x: 188, y: 214 },
  ),
  workshopStation(
    'workshop.press_a',
    W.pressA,
    'Use',
    'Label Press A',
    { kind: 'inventory', id: 'm03_a' },
    'm03_reset_o1',
    { x: 236, y: 204 },
  ),
  workshopStation(
    'workshop.press_b',
    W.pressB,
    'Use',
    'Label Press B',
    { kind: 'inventory', id: 'm03_b' },
    'm03_reset_o2',
    { x: 302, y: 204 },
  ),
  workshopStation(
    'workshop.relay_bench',
    W.relayBench,
    'Work the',
    'Relay Bench',
    { kind: 'work_surface', id: 'm21_relay_bench' },
    'm21_manual_repair',
    { x: 152, y: 240 },
  ),
  workshopStation(
    'workshop.sample_cutter',
    WS.sampleCutter,
    'Use the',
    'Sample Cutter',
    { kind: 'action', id: 'm04_sample_job' },
    'm04_debris_cleanup',
    { x: 348, y: 230 },
  ),
  workshopStation(
    'workshop.storage_locker',
    W.storageLocker,
    'Open the',
    'Component Locker',
    { kind: 'inventory', id: 'container' },
    null,
    { x: 310, y: 250 },
  ),
  workshopStation(
    'workshop.assembly_bench',
    W.assemblyBench,
    'Use the',
    'Assembly Bench',
    { kind: 'inventory', id: 'workbench' },
    null,
    { x: 546, y: 252 },
  ),
  workshopStation(
    'workshop.dispatch_console',
    WS.dispatchConsole,
    'Work the',
    'Dispatch Console',
    { kind: 'work_surface', id: 'm06_dispatch_console' },
    'm06_routine_dispatch',
    { x: 915, y: 214 },
  ),
  workshopStation(
    'workshop.feed_console',
    W.feedConsole,
    'Check the',
    'Station Feed Console',
    { kind: 'work_surface', id: 'm20_feed_console' },
    'm20_antenna_restoration',
    { x: 1034, y: 180 },
  ),
  workshopStation(
    'workshop.seal_log',
    WS.sealLog,
    'Read the',
    'Sample Seal Log',
    { kind: 'prompt', id: 'pilotSealLog' },
    'm11_seal_obligation (secondary)',
    { x: 1224, y: 196 },
  ),
  workshopStation(
    'workshop.handover_desk',
    W.handoverDesk,
    'Use the',
    'Outbound Handover Desk',
    { kind: 'prompt', id: 'pilotHandoverDesk' },
    'm25_belief_probe',
    { x: 1148, y: 208 },
  ),
  workshopStation(
    'workshop.calibration_bench',
    WS.calibrationBench,
    'Work the',
    'Calibration Bench',
    { kind: 'work_surface', id: 'm07_calibration_bench' },
    'm07_calibration_project',
    { x: 833, y: 250 },
  ),
  workshopStation(
    'workshop.report_desk',
    W.reportDesk,
    'Work the',
    'Shift Report Desk',
    { kind: 'work_surface', id: 'm22_report_desk' },
    'm22_report_revision',
    { x: 996, y: 250 },
  ),
  workshopStation(
    'workshop.qc_packet_o2',
    WS.qcPacket,
    'Check the',
    'Quality Packet',
    { kind: 'work_surface', id: 'm12_qc_packet_o2' },
    'm12_qc_o2',
    { x: 1100, y: 250 },
  ),
  workshopStation(
    'workshop.lattice_bench',
    WS.latticeBench,
    'Work the',
    'Conduit Lattice Bench',
    { kind: 'ip_overlay', id: 'm13' },
    'm13_lattice_construction',
    { x: 1193, y: 250 },
  ),
];

export const WORLD_V1_REGISTRY: Partial<
  Record<PilotZoneKey, readonly InteractionRegistryEntry[]>
> = {
  dock: DOCK_REGISTRY,
  station_concourse: CONCOURSE_REGISTRY,
  records_workshop: WORKSHOP_REGISTRY,
};

/** Zones already declared in the registry (grows unit by unit). */
export const REGISTERED_ZONES: readonly PilotZoneKey[] = Object.keys(
  WORLD_V1_REGISTRY,
) as PilotZoneKey[];

export interface ClassContext {
  /** Whether the object is the route's current guidance target. */
  isGuidanceTarget: boolean;
  /** The availability rule's result: null = usable, string = state. */
  availabilityState: string | null;
}

/** INTERACTION-GRAMMAR.md §2: the class is derived, never hand-set. */
export function deriveObjectClass(
  kind: RegistryKind,
  context: ClassContext,
): ObjectClass {
  if (kind === 'decor') {
    return 'decorative';
  }

  if (context.availabilityState !== null) {
    return 'inactive';
  }

  return context.isGuidanceTarget ? 'active' : 'optional';
}

/** Key legend of the one-line contextual prompt (mission §11). */
export const PROMPT_KEYS = 'E / Space';

/** The one-line contextual prompt (INTERACTION-GRAMMAR.md §4). */
export function promptText(
  verb: string,
  label: string,
  availabilityState: string | null,
): string {
  return availabilityState === null
    ? `${PROMPT_KEYS} — ${verb} ${label}`
    : `${PROMPT_KEYS} — ${capitalise(label)}: ${availabilityState}`;
}

function capitalise(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}
