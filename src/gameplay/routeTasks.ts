/**
 * Core playable route state (overnight prototype, Unit 2).
 *
 * Session-lifetime state for the Vale requisition → Kai survey/recovery
 * route: locker stock, scan/dig progress, install steps, delivery. Module
 * scope (roomTaskState precedent) so leaving and re-entering rooms
 * resumes the route exactly where it stood; a page reload starts fresh.
 *
 * Pure gameplay progression — no measurement variable reads this state,
 * and its telemetry (proto_* events) is raw prototype data logged by the
 * hosting scenes.
 */

import { addInventoryItem } from './inventory';
import {
  acceptTask,
  completeTask,
  isTaskAccepted,
  isTaskCompleted,
  registerTask,
  setTaskObjective,
} from './tasks';

export const FIELD_REQUISITION_TASK_ID = 'proto_field_requisition';
export const SURVEY_RECOVERY_TASK_ID = 'proto_survey_recovery';

/** Items Vale issues from the Field Equipment Locker, in display order. */
export const REQUISITION_ITEM_IDS = [
  'field_scanner',
  'excavation_spade',
  'sample_case',
] as const;

/** Survey markers: fixed ids; markers 2 and 4 carry the anomalies. */
export const SCAN_NODE_IDS = [1, 2, 3, 4] as const;
export const ANOMALY_NODE_IDS: readonly number[] = [2, 4];

/** What each flagged dig site yields (deterministic, identical always). */
export const DIG_YIELD: Readonly<Record<number, string>> = {
  2: 'relay_coupling',
  4: 'core_sample',
};

export const INSTALL_STEP_LABELS = [
  'Align the mounting bracket',
  'Seat the relay coupling',
  'Torque to specification',
] as const;

export interface FieldRouteState {
  /** Locker items already taken (never restocked). */
  collected_from_locker: string[];
  /** Scanned marker ids (each marker scans once). */
  scanned_nodes: number[];
  /** Flagged markers already dug out. */
  dug_nodes: number[];
  /** Install-minigame steps completed (0-3). */
  install_steps_done: number;
  coupling_installed: boolean;
  sample_delivered: boolean;
}

function createInitialRouteState(): FieldRouteState {
  return {
    collected_from_locker: [],
    scanned_nodes: [],
    dug_nodes: [],
    install_steps_done: 0,
    coupling_installed: false,
    sample_delivered: false,
  };
}

export const fieldRouteState: FieldRouteState = createInitialRouteState();

/** Registers the route's task definitions (idempotent; scenes call it). */
export function registerRouteTasks() {
  registerTask({
    task_id: FIELD_REQUISITION_TASK_ID,
    title: 'Field requisition',
    initialObjective: 'Collect the issued equipment from the locker.',
  });
  registerTask({
    task_id: SURVEY_RECOVERY_TASK_ID,
    title: 'Survey recovery',
    initialObjective: 'Report to Engineer Kai on the Survey Terrace.',
  });
}

export function remainingLockerItems(): string[] {
  return REQUISITION_ITEM_IDS.filter(
    (itemId) => !fieldRouteState.collected_from_locker.includes(itemId),
  );
}

/**
 * Takes one item from the locker into the inventory. Returns false when
 * the inventory is full (the item stays in the locker).
 */
export function collectLockerItem(itemId: string): boolean {
  if (fieldRouteState.collected_from_locker.includes(itemId)) {
    return true;
  }

  if (!addInventoryItem(itemId)) {
    return false;
  }

  fieldRouteState.collected_from_locker.push(itemId);
  refreshRequisitionObjective();

  return true;
}

/** Updates the requisition objective to the current collection state. */
export function refreshRequisitionObjective() {
  if (!isTaskAccepted(FIELD_REQUISITION_TASK_ID)) {
    return;
  }

  const remaining = remainingLockerItems();

  if (remaining.length > 0) {
    setTaskObjective(
      FIELD_REQUISITION_TASK_ID,
      `Collect the issued equipment from the locker (${
        REQUISITION_ITEM_IDS.length - remaining.length
      }/${REQUISITION_ITEM_IDS.length}).`,
    );
  } else {
    setTaskObjective(
      FIELD_REQUISITION_TASK_ID,
      'Take the Exterior Airlock (Station Hub, south wall) to the Survey Terrace.',
    );
  }
}

export function isRequisitionKitComplete(): boolean {
  return remainingLockerItems().length === 0;
}

/**
 * Kai's briefing acceptance: closes the requisition task and opens the
 * survey/recovery task.
 */
export function acceptSurveyBriefing() {
  if (!isTaskCompleted(FIELD_REQUISITION_TASK_ID)) {
    completeTask(FIELD_REQUISITION_TASK_ID);
  }

  acceptTask(SURVEY_RECOVERY_TASK_ID);
  refreshSurveyObjective();
}

export function markNodeScanned(nodeId: number) {
  if (!fieldRouteState.scanned_nodes.includes(nodeId)) {
    fieldRouteState.scanned_nodes.push(nodeId);
    refreshSurveyObjective();
  }
}

export function markNodeDug(nodeId: number) {
  if (!fieldRouteState.dug_nodes.includes(nodeId)) {
    fieldRouteState.dug_nodes.push(nodeId);
    refreshSurveyObjective();
  }
}

export function completeInstallStep(): number {
  if (fieldRouteState.install_steps_done < INSTALL_STEP_LABELS.length) {
    fieldRouteState.install_steps_done += 1;
  }

  if (fieldRouteState.install_steps_done === INSTALL_STEP_LABELS.length) {
    fieldRouteState.coupling_installed = true;
  }

  refreshSurveyObjective();

  return fieldRouteState.install_steps_done;
}

export function markSampleDelivered() {
  fieldRouteState.sample_delivered = true;

  if (isRouteFinished()) {
    completeTask(SURVEY_RECOVERY_TASK_ID);
  }

  refreshSurveyObjective();
}

export function isRouteFinished(): boolean {
  return fieldRouteState.coupling_installed && fieldRouteState.sample_delivered;
}

/** Flagged markers (anomaly scans) that still need digging. */
export function flaggedNodesPendingDig(): number[] {
  return ANOMALY_NODE_IDS.filter(
    (nodeId) =>
      fieldRouteState.scanned_nodes.includes(nodeId) &&
      !fieldRouteState.dug_nodes.includes(nodeId),
  );
}

/** Updates the survey objective line to the current route stage. */
export function refreshSurveyObjective() {
  if (
    !isTaskAccepted(SURVEY_RECOVERY_TASK_ID) &&
    !isTaskCompleted(SURVEY_RECOVERY_TASK_ID)
  ) {
    return;
  }

  const state = fieldRouteState;

  if (state.scanned_nodes.length < SCAN_NODE_IDS.length) {
    setTaskObjective(
      SURVEY_RECOVERY_TASK_ID,
      `Scan the survey markers (${state.scanned_nodes.length}/${SCAN_NODE_IDS.length}).`,
    );
    return;
  }

  if (state.dug_nodes.length < ANOMALY_NODE_IDS.length) {
    setTaskObjective(
      SURVEY_RECOVERY_TASK_ID,
      `Dig out the flagged markers (${state.dug_nodes.length}/${ANOMALY_NODE_IDS.length}).`,
    );
    return;
  }

  if (!state.coupling_installed) {
    setTaskObjective(
      SURVEY_RECOVERY_TASK_ID,
      'Install the relay coupling at the antenna feed housing.',
    );
    return;
  }

  if (!state.sample_delivered) {
    setTaskObjective(
      SURVEY_RECOVERY_TASK_ID,
      'Deliver the core sample to Engineer Kai.',
    );
    return;
  }

  setTaskObjective(
    SURVEY_RECOVERY_TASK_ID,
    'Survey recovery complete — continue with the station duty roster.',
  );
}

/**
 * Test-only escape hatch (resetAllRoomTaskStates precedent): resets the
 * route state in place.
 */
export function resetFieldRouteState() {
  Object.assign(fieldRouteState, createInitialRouteState());
}
