export interface SessionMetadata {
  participant_id: string;
  game_session_id: string;
  condition: string;
  game_version: string;
  started_at_ms: number;
}

/**
 * Shared cross-room mission state (V3 §3.1). Status fields use `string`
 * rather than a closed union because the canonical value sets are defined by
 * each room's own implementation (see docs/game/rooms/*.md), not yet fixed —
 * do not narrow these to an enum until the corresponding room lands.
 */
export interface MissionState {
  current_room_id: string;
  completed_rooms: string[];
  active_objectives: string[];
  unresolved_objectives: string[];
  accepted_duties: string[];
  skipped_duties: string[];
  prepared_items: string[];
  workspace_status: string;
  hazard_status: string;
  side_repair_status: string;
  interruption_status: string;
  final_core_status: string;
}

// Transitional neutral placeholder — no source document defines a status
// vocabulary for these fields. Later room implementations may replace this
// with documented, room-specific status values; this is not a closed
// canonical set.
const NEUTRAL_MISSION_STATUS = 'not_started';

export class SessionState {
  private metadata: SessionMetadata;
  private missionState: MissionState = createDefaultMissionState();

  constructor(
    searchParams = getCurrentSearchParams(),
    startedAtMs = Date.now(),
  ) {
    this.metadata = {
      participant_id:
        searchParams.get('participant_id') ?? createFallbackId('participant'),
      game_session_id:
        searchParams.get('game_session_id') ?? createFallbackId('session'),
      condition: searchParams.get('condition') ?? 'default',
      game_version:
        searchParams.get('game_version') ??
        import.meta.env.VITE_APP_VERSION ??
        'unknown',
      started_at_ms: startedAtMs,
    };
  }

  getMetadata() {
    return { ...this.metadata };
  }

  getElapsedSeconds(nowMs = Date.now()) {
    return Math.max(
      0,
      Math.floor((nowMs - this.metadata.started_at_ms) / 1000),
    );
  }

  getMissionState() {
    return copyMissionState(this.missionState);
  }

  setCurrentRoom(roomId: string) {
    this.missionState.current_room_id = roomId;
  }

  markRoomCompleted(roomId: string) {
    addUnique(this.missionState.completed_rooms, roomId);
  }

  addActiveObjective(objectiveId: string) {
    addUnique(this.missionState.active_objectives, objectiveId);
  }

  removeActiveObjective(objectiveId: string) {
    removeValue(this.missionState.active_objectives, objectiveId);
  }

  addUnresolvedObjective(objectiveId: string) {
    addUnique(this.missionState.unresolved_objectives, objectiveId);
  }

  removeUnresolvedObjective(objectiveId: string) {
    removeValue(this.missionState.unresolved_objectives, objectiveId);
  }

  addAcceptedDuty(dutyId: string) {
    removeValue(this.missionState.skipped_duties, dutyId);
    addUnique(this.missionState.accepted_duties, dutyId);
  }

  addSkippedDuty(dutyId: string) {
    removeValue(this.missionState.accepted_duties, dutyId);
    addUnique(this.missionState.skipped_duties, dutyId);
  }

  addPreparedItem(itemId: string) {
    addUnique(this.missionState.prepared_items, itemId);
  }

  setWorkspaceStatus(status: string) {
    this.missionState.workspace_status = status;
  }

  setHazardStatus(status: string) {
    this.missionState.hazard_status = status;
  }

  setSideRepairStatus(status: string) {
    this.missionState.side_repair_status = status;
  }

  setInterruptionStatus(status: string) {
    this.missionState.interruption_status = status;
  }

  setFinalCoreStatus(status: string) {
    this.missionState.final_core_status = status;
  }
}

function createDefaultMissionState(): MissionState {
  return {
    // Initial implementation default based on the planned starting location
    // (V3 §2 world structure; 'dock_arrival' per event-schema.md's room_id
    // naming table) — not a value prescribed by any document as a default,
    // and not a closed canonical vocabulary.
    current_room_id: 'dock_arrival',
    completed_rooms: [],
    active_objectives: [],
    unresolved_objectives: [],
    accepted_duties: [],
    skipped_duties: [],
    prepared_items: [],
    workspace_status: NEUTRAL_MISSION_STATUS,
    hazard_status: NEUTRAL_MISSION_STATUS,
    side_repair_status: NEUTRAL_MISSION_STATUS,
    interruption_status: NEUTRAL_MISSION_STATUS,
    final_core_status: NEUTRAL_MISSION_STATUS,
  };
}

function copyMissionState(missionState: MissionState): MissionState {
  return {
    ...missionState,
    completed_rooms: [...missionState.completed_rooms],
    active_objectives: [...missionState.active_objectives],
    unresolved_objectives: [...missionState.unresolved_objectives],
    accepted_duties: [...missionState.accepted_duties],
    skipped_duties: [...missionState.skipped_duties],
    prepared_items: [...missionState.prepared_items],
  };
}

function addUnique(list: string[], value: string) {
  if (!list.includes(value)) {
    list.push(value);
  }
}

function removeValue(list: string[], value: string) {
  const index = list.indexOf(value);

  if (index !== -1) {
    list.splice(index, 1);
  }
}

function getCurrentSearchParams() {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

function createFallbackId(prefix: string) {
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}-${randomId}`;
}
