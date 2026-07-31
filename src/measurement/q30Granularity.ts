/**
 * Q30 goal-granularity module state (SA-4 adopted design; Unit 3).
 *
 * At least two INDEPENDENT granularity opportunities, each with its own
 * window and raw local outcome:
 *  - instance 1 (work-orders): the quartermaster work-order board in the
 *    Station Hub — several independently closable small work orders vs
 *    one integrated stores audit;
 *  - instance 2 (telemetry-cache): the telemetry cache console on the
 *    Survey Terrace — several separately confirmed small upload batches
 *    vs one combined upload.
 *
 * Both structures are balanced on total actions, benefit, difficulty and
 * social framing; the choice is recorded before any outcome feedback.
 * PROHIBITED (SA-4): inferring granularity from skipped verification,
 * poor preparation, carelessness, Hazard, or any shared click stream —
 * each instance here has its own state and its own choice moment.
 * Event names are internal/provisional; no scoring exists.
 */

export const Q30_ENTRY_STATE_VERSION = 'q30-two-instances-v1';

export type Q30InstanceId = 'work_orders' | 'telemetry_cache';
export type Q30Choice = 'independent_small' | 'integrated_single';

export interface Q30InstanceContent {
  instance_id: Q30InstanceId;
  opportunity_id: string;
  body: string;
  smallLabel: string;
  integratedLabel: string;
  detail: string;
}

export const Q30_INSTANCES: readonly Q30InstanceContent[] = [
  {
    instance_id: 'work_orders',
    opportunity_id: 'proto_q30_work_orders',
    body: 'The quartermaster backlog board needs the stores round structured before work can start. Either structure covers exactly the same shelves in about the same time.',
    smallLabel:
      'Log four separate small work orders — each shelf closable on its own.',
    integratedLabel:
      'Log one integrated stores audit covering all four shelves together.',
    detail:
      'Board note: four shelves either way, same total work, same completion credit. Only the structure differs.',
  },
  {
    instance_id: 'telemetry_cache',
    opportunity_id: 'proto_q30_telemetry_cache',
    body: 'The terrace telemetry cache is ready to upload. Either queue shape moves exactly the same data in about the same time.',
    smallLabel:
      'Queue five separate small batches — each confirmed complete on its own.',
    integratedLabel:
      'Queue one combined upload covering the full cache in a single pass.',
    detail:
      'Console note: identical data volume and transfer time either way. Only the queue structure differs.',
  },
] as const;

export interface Q30Observation {
  instance_id: Q30InstanceId;
  choice: Q30Choice;
  option_order: string;
  inspected_detail: boolean;
}

interface Q30State {
  observations: Q30Observation[];
  inspected_instances: Q30InstanceId[];
}

function createInitialQ30State(): Q30State {
  return { observations: [], inspected_instances: [] };
}

export const q30State: Q30State = createInitialQ30State();

export function q30InstanceAnswered(instanceId: Q30InstanceId): boolean {
  return q30State.observations.some(
    (entry) => entry.instance_id === instanceId,
  );
}

export function markQ30DetailInspected(instanceId: Q30InstanceId) {
  if (!q30State.inspected_instances.includes(instanceId)) {
    q30State.inspected_instances.push(instanceId);
  }
}

/** Records one instance's structure choice (once per instance). */
export function recordQ30Choice(
  instanceId: Q30InstanceId,
  choice: Q30Choice,
  optionOrder: string,
): Q30Observation | null {
  if (q30InstanceAnswered(instanceId)) {
    return null;
  }

  const observation: Q30Observation = {
    instance_id: instanceId,
    choice,
    option_order: optionOrder,
    inspected_detail: q30State.inspected_instances.includes(instanceId),
  };

  q30State.observations.push(observation);

  return observation;
}

export function getQ30Instance(instanceId: Q30InstanceId): Q30InstanceContent {
  const instance = Q30_INSTANCES.find(
    (entry) => entry.instance_id === instanceId,
  );

  if (instance === undefined) {
    throw new Error(`Unknown Q30 instance: ${instanceId}`);
  }

  return instance;
}

/** Test-only escape hatch. */
export function resetQ30State() {
  q30State.observations = [];
  q30State.inspected_instances = [];
}
