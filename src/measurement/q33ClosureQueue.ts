/**
 * Q33 Contract Closure Queue module state (SA-6 adopted design; Unit 3).
 *
 * A distinct closure-queue module in the Operations Annex: five station
 * contracts, each already ~90% done, each needing only a short closure
 * pass. Closures are entirely SELF-SELECTED — the queue is optional side
 * content, nothing forces any closure, and no reward beyond neutral
 * logging exists (SA-6: required short tasks and forced completions can
 * never count as Q33 evidence).
 *
 * Its own opportunity, window, state container and proto_* event family;
 * independent of Final Core and of Q29/Q30/Q31/Q32. GOVERNANCE: Q33
 * remains questionnaire-primary; this is an exploratory short-session
 * analogue only; no scoring exists.
 */

export const Q33_OPPORTUNITY_ID = 'proto_q33_closure_queue';
export const Q33_ENTRY_STATE_VERSION = 'q33-annex-queue-v1';

export interface Q33Contract {
  contract_id: string;
  label: string;
}

/** Fixed, identical queue (standardised entry state). */
export const Q33_CONTRACTS: readonly Q33Contract[] = [
  { contract_id: 'water_reclaim', label: 'Water reclaimer service log' },
  { contract_id: 'dorm_lighting', label: 'Dorm lighting swap' },
  { contract_id: 'met_mast', label: 'Met-mast bracket check' },
  { contract_id: 'spares_count', label: 'Spares cage count' },
  { contract_id: 'filter_swap', label: 'Air filter swap record' },
] as const;

interface Q33State {
  queue_opened: boolean;
  closed_contract_ids: string[];
  /** Times the participant left the desk with contracts still open. */
  left_with_open_contracts: number;
}

function createInitialQ33State(): Q33State {
  return {
    queue_opened: false,
    closed_contract_ids: [],
    left_with_open_contracts: 0,
  };
}

export const q33State: Q33State = createInitialQ33State();

export function markQ33QueueOpened() {
  q33State.queue_opened = true;
}

export function q33OpenContracts(): Q33Contract[] {
  return Q33_CONTRACTS.filter(
    (contract) => !q33State.closed_contract_ids.includes(contract.contract_id),
  );
}

export function closeQ33Contract(contractId: string): boolean {
  if (q33State.closed_contract_ids.includes(contractId)) {
    return false;
  }

  q33State.closed_contract_ids.push(contractId);

  return true;
}

export function recordQ33LeftWithOpen() {
  if (q33OpenContracts().length > 0) {
    q33State.left_with_open_contracts += 1;
  }
}

export function q33Summary() {
  return {
    queue_opened: q33State.queue_opened,
    closed_count: q33State.closed_contract_ids.length,
    open_count: q33OpenContracts().length,
    left_with_open_contracts: q33State.left_with_open_contracts,
  };
}

/** Test-only escape hatch. */
export function resetQ33State() {
  Object.assign(q33State, createInitialQ33State());
  q33State.closed_contract_ids = [];
}
