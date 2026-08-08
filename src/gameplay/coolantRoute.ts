/**
 * Coolant red-line route state (action-assessment rebuild, Unit 2).
 *
 * Session-lifetime progression for the coolant/pressure failure line:
 * the Pump House work order, free-scanner survey of the Coolant Yard,
 * physical excavation of buried line components, the frozen-coupling
 * extraction (M23 host facts live in src/measurement/m23Excavation.ts),
 * and the hand-off toward manifold reconstruction (Unit 3).
 *
 * Pure gameplay progression (routeTasks.ts precedent): no measurement
 * variable reads this state; scenes log raw proto_* telemetry at their
 * own emission points. All stimulus geometry is FIXED — identical
 * deposit cells, identical yields, identical sector bounds for every
 * participant (deterministic placement rule).
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

export const COOLANT_INVESTIGATION_TASK_ID = 'proto_coolant_investigation';
export const COOLANT_RECOVERY_TASK_ID = 'proto_coolant_recovery';
export const COOLANT_RESTORE_TASK_ID = 'proto_coolant_restore';

/** Rectangular tile-pixel bounds (inclusive) of a marked yard sector. */
export interface YardSectorBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Open survey sector: free scanning and digging are eligible here. */
export const SURVEY_SECTOR_BOUNDS: YardSectorBounds = {
  minX: 2 * 32,
  maxX: 12 * 32,
  minY: 5 * 32,
  maxY: 12 * 32,
};

/** Staked-off Reclaimed Sector (M26 bounded area — objectively empty). */
export const RECLAIMED_SECTOR_BOUNDS: YardSectorBounds = {
  minX: 15 * 32,
  maxX: 20 * 32,
  minY: 4 * 32,
  maxY: 7 * 32,
};

export function insideSector(
  bounds: YardSectorBounds,
  x: number,
  y: number,
): boolean {
  return (
    x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY
  );
}

export interface YardDeposit {
  deposit_id: string;
  x: number;
  y: number;
  /** Inventory item recovered by the dig, or null for an empty pocket. */
  yield_item_id: string | null;
}

/**
 * Fixed buried deposits of the survey sector (identical for everyone).
 * The controlled dig deck: three line components, one ore pocket, one
 * scrap pocket, one empty pocket.
 */
export const YARD_DEPOSITS: readonly YardDeposit[] = [
  { deposit_id: 'yd1', x: 4 * 32, y: 6 * 32, yield_item_id: 'pipe_segment' },
  { deposit_id: 'yd2', x: 7 * 32, y: 9 * 32, yield_item_id: 'scrap_plate' },
  { deposit_id: 'yd3', x: 10 * 32, y: 7 * 32, yield_item_id: 'pipe_elbow' },
  { deposit_id: 'yd4', x: 5 * 32, y: 11 * 32, yield_item_id: null },
  { deposit_id: 'yd5', x: 9 * 32, y: 11 * 32, yield_item_id: 'ore_chunk' },
  { deposit_id: 'yd6', x: 11 * 32, y: 5 * 32, yield_item_id: 'pipe_segment' },
] as const;

/** Scanner geometry (fixed): actionable and faint-return radii, px. */
export const SCAN_ACTIONABLE_RADIUS = 90;
export const SCAN_WEAK_RADIUS = 170;

/** Line components the Pump House parts run wants recovered. */
export const LINE_COMPONENT_ITEM_IDS = ['pipe_segment', 'pipe_elbow'] as const;

export interface CoolantRouteState {
  /** Work order read at the Pump House pressure console. */
  work_order_read: boolean;
  /** Deposits flagged by an actionable scan (dig targets). */
  flagged_deposits: string[];
  /** Deposits dug out (any yield, including empty). */
  dug_deposits: string[];
  /** Free scans performed in the survey sector (route bookkeeping). */
  survey_scans: number;
  /** M23 host fact: the frozen coupling was recovered. */
  coupling_recovered: boolean;
  /** Heat canister taken from the supply crate. */
  heat_canister_taken: boolean;
  /** Pry bar taken from the supply crate. */
  pry_bar_taken: boolean;
}

function createInitialCoolantRouteState(): CoolantRouteState {
  return {
    work_order_read: false,
    flagged_deposits: [],
    dug_deposits: [],
    survey_scans: 0,
    coupling_recovered: false,
    heat_canister_taken: false,
    pry_bar_taken: false,
  };
}

export const coolantRouteState: CoolantRouteState =
  createInitialCoolantRouteState();

/** Registers the coolant-line task definitions (idempotent). */
export function registerCoolantTasks() {
  registerTask({
    task_id: COOLANT_INVESTIGATION_TASK_ID,
    title: 'Coolant failure',
    initialObjective:
      'Investigate the pressure fault at the Pump House (Coolant Yard, east door).',
  });
  registerTask({
    task_id: COOLANT_RECOVERY_TASK_ID,
    title: 'Line recovery',
    initialObjective:
      'Survey the yard with the scanner (C) and recover buried line components.',
  });
  registerTask({
    task_id: COOLANT_RESTORE_TASK_ID,
    title: 'Loop B restoration',
    initialObjective:
      'Rebuild the manifold at the Pump House trench (drag sections in, or use the Trench Console).',
  });
}

/**
 * Unit 6 guidance: the restoration task carries the Pump House
 * milestones once the yard recovery closes. Objective copy is
 * in-fiction progress text only (allowed progress UI, never scores).
 */
export function setRestoreObjective(text: string) {
  if (isTaskAccepted(COOLANT_RESTORE_TASK_ID)) {
    setTaskObjective(COOLANT_RESTORE_TASK_ID, text);
  }
}

export function completeRestoreTask() {
  if (!isTaskCompleted(COOLANT_RESTORE_TASK_ID)) {
    completeTask(COOLANT_RESTORE_TASK_ID);
    setTaskObjective(
      COOLANT_RESTORE_TASK_ID,
      'Loop B restored - the station duty roster continues.',
    );
  }
}

export function acceptCoolantInvestigation() {
  if (
    !isTaskAccepted(COOLANT_INVESTIGATION_TASK_ID) &&
    !isTaskCompleted(COOLANT_INVESTIGATION_TASK_ID)
  ) {
    acceptTask(COOLANT_INVESTIGATION_TASK_ID);
  }
}

/** Work order read: investigation closes, recovery opens. */
export function markWorkOrderRead() {
  coolantRouteState.work_order_read = true;

  if (!isTaskCompleted(COOLANT_INVESTIGATION_TASK_ID)) {
    completeTask(COOLANT_INVESTIGATION_TASK_ID);
  }

  acceptTask(COOLANT_RECOVERY_TASK_ID);
  acceptTask(COOLANT_RESTORE_TASK_ID);
  refreshCoolantObjective();
}

export function getDeposit(depositId: string): YardDeposit {
  const deposit = YARD_DEPOSITS.find((entry) => entry.deposit_id === depositId);

  if (deposit === undefined) {
    throw new Error(`Unknown yard deposit: ${depositId}`);
  }

  return deposit;
}

export function isDepositFlagged(depositId: string): boolean {
  return coolantRouteState.flagged_deposits.includes(depositId);
}

export function isDepositDug(depositId: string): boolean {
  return coolantRouteState.dug_deposits.includes(depositId);
}

export function flagDeposit(depositId: string) {
  if (!isDepositFlagged(depositId)) {
    coolantRouteState.flagged_deposits.push(depositId);
    refreshCoolantObjective();
  }
}

export function recordSurveyScan() {
  coolantRouteState.survey_scans += 1;
}

/**
 * Resolves one free scan from a world position (fixed geometry):
 * the nearest unfound deposit within the actionable radius is flagged;
 * a deposit within the faint radius gives a weak return; otherwise no
 * signal. Dug deposits never re-signal.
 */
export function resolveSurveyScan(
  x: number,
  y: number,
):
  | { result: 'actionable'; deposit: YardDeposit }
  | { result: 'weak'; deposit: YardDeposit }
  | { result: 'none' } {
  let best: { deposit: YardDeposit; distance: number } | null = null;

  for (const deposit of YARD_DEPOSITS) {
    if (
      isDepositDug(deposit.deposit_id) ||
      isDepositFlagged(deposit.deposit_id)
    ) {
      continue;
    }

    const distance = Math.hypot(deposit.x - x, deposit.y - y);

    if (best === null || distance < best.distance) {
      best = { deposit, distance };
    }
  }

  if (best === null) {
    return { result: 'none' };
  }

  if (best.distance <= SCAN_ACTIONABLE_RADIUS) {
    return { result: 'actionable', deposit: best.deposit };
  }

  if (best.distance <= SCAN_WEAK_RADIUS) {
    return { result: 'weak', deposit: best.deposit };
  }

  return { result: 'none' };
}

/**
 * Digs a flagged deposit: marks it dug and adds any yield to the
 * inventory. Returns false (no state change) when the yield exists but
 * the inventory is full — the deposit stays flagged for another try.
 */
export function digDeposit(depositId: string): boolean {
  const deposit = getDeposit(depositId);

  if (isDepositDug(depositId)) {
    return true;
  }

  if (
    deposit.yield_item_id !== null &&
    !addInventoryItem(deposit.yield_item_id)
  ) {
    return false;
  }

  coolantRouteState.dug_deposits.push(depositId);
  refreshCoolantObjective();

  return true;
}

export function markCouplingRecovered() {
  coolantRouteState.coupling_recovered = true;
  refreshCoolantObjective();
}

export function takeHeatCanister(): boolean {
  if (coolantRouteState.heat_canister_taken) {
    return true;
  }

  if (!addInventoryItem('heat_canister')) {
    return false;
  }

  coolantRouteState.heat_canister_taken = true;

  return true;
}

export function takePryBar(): boolean {
  if (coolantRouteState.pry_bar_taken) {
    return true;
  }

  if (!addInventoryItem('pry_bar')) {
    return false;
  }

  coolantRouteState.pry_bar_taken = true;

  return true;
}

/** Every buried line component (pipe pieces) recovered. */
export function lineComponentsRecovered(): boolean {
  return YARD_DEPOSITS.filter(
    (deposit) =>
      deposit.yield_item_id !== null &&
      (LINE_COMPONENT_ITEM_IDS as readonly string[]).includes(
        deposit.yield_item_id,
      ),
  ).every((deposit) => isDepositDug(deposit.deposit_id));
}

/** The yard recovery stage is finished (components + coupling). */
export function yardRecoveryComplete(): boolean {
  return lineComponentsRecovered() && coolantRouteState.coupling_recovered;
}

/** Updates the recovery objective line to the current stage. */
export function refreshCoolantObjective() {
  if (
    !isTaskAccepted(COOLANT_RECOVERY_TASK_ID) &&
    !isTaskCompleted(COOLANT_RECOVERY_TASK_ID)
  ) {
    return;
  }

  const componentDeposits = YARD_DEPOSITS.filter(
    (deposit) =>
      deposit.yield_item_id !== null &&
      (LINE_COMPONENT_ITEM_IDS as readonly string[]).includes(
        deposit.yield_item_id,
      ),
  );
  const recovered = componentDeposits.filter((deposit) =>
    isDepositDug(deposit.deposit_id),
  ).length;

  if (recovered < componentDeposits.length) {
    setTaskObjective(
      COOLANT_RECOVERY_TASK_ID,
      `Scan (C) and dig (D) the buried line components in the survey sector (${recovered}/${componentDeposits.length}).`,
    );
    return;
  }

  if (!coolantRouteState.coupling_recovered) {
    setTaskObjective(
      COOLANT_RECOVERY_TASK_ID,
      'Free the frozen coupling at the housing on the south side of the yard.',
    );
    return;
  }

  if (!isTaskCompleted(COOLANT_RECOVERY_TASK_ID)) {
    completeTask(COOLANT_RECOVERY_TASK_ID);
  }

  setTaskObjective(
    COOLANT_RECOVERY_TASK_ID,
    'Components recovered — rebuild the manifold at the Pump House trench.',
  );
}

/** Test-only escape hatch (resetFieldRouteState precedent). */
export function resetCoolantRouteState() {
  Object.assign(coolantRouteState, createInitialCoolantRouteState());
  coolantRouteState.flagged_deposits = [];
  coolantRouteState.dug_deposits = [];
}
