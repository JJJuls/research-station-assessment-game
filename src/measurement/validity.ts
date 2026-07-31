/**
 * SA-13 internal opportunity/validity framework (overnight prototype,
 * Unit 3).
 *
 * A small typed, session-lifetime register of measurement opportunities:
 * who owns each opportunity, its entry-state version, form, order and
 * position, counterbalance assignment, prior exposure, offered/entered/
 * completed progression, and its validity state with an explicit reason
 * when invalid or missing.
 *
 * GOVERNANCE (ruling §14.1 SA-13; NEXT-09 plan §13): these are the
 * REQUIRED SEMANTIC ELEMENTS of the adopted validity architecture — the
 * field names, types and enumerations here are INTERNAL AND PROVISIONAL,
 * not approved canonical payload names. The event-schema (tier 3) and
 * scoring-plan (tier 4) rulings remain open; nothing in this module
 * computes a score, and a contaminated/failed/absent opportunity is
 * recorded as invalid/missing — never as low behavioural performance.
 */

export type OpportunityValidity = 'pending' | 'valid' | 'invalid' | 'missing';

export type OpportunityInvalidReason =
  | 'technical_failure'
  | 'comprehension_failure'
  | 'contamination'
  | 'participant_absent'
  | 'censored'
  | 'no_opportunity'
  | 'insufficient_opportunity'
  | 'invalid_entry_state';

export interface OpportunityRecord {
  /** Internal opportunity id (provisional, never a canonical name). */
  opportunity_id: string;
  /** Intended measurement owner, e.g. 'Q27' or 'Q29/Q31 (shared)'. */
  owner: string;
  /** Version tag of the standardised entry state this instance used. */
  entry_state_version: string;
  /** Parallel form identifier (e.g. 'A' / 'B'), if the module has forms. */
  form: string | null;
  /** 1-based order in which opportunities were OFFERED this session. */
  offer_position: number | null;
  /** Counterbalance assignment (recorded, deterministic per session). */
  counterbalance: string | null;
  /** Prior-exposure notes recorded before/at window start. */
  prior_exposure: string[];
  offered: boolean;
  entered: boolean;
  completed: boolean;
  /** Participant never took the opportunity up (absence). */
  absent: boolean;
  /** Session ended / gate reached before the window could complete. */
  censored: boolean;
  technical_failure: boolean;
  comprehension_failure: boolean;
  contaminated: boolean;
  /** Free-text reason when invalid/missing (provisional wording). */
  invalid_reason: OpportunityInvalidReason | null;
  invalid_detail: string | null;
}

const records = new Map<string, OpportunityRecord>();
let offerCounter = 0;
/** Rooms entered this session, in order (order/position + exposure feed). */
const roomEntryLog: string[] = [];

/** Declares an opportunity (idempotent; scenes re-declare on re-entry). */
export function declareOpportunity(init: {
  opportunity_id: string;
  owner: string;
  entry_state_version: string;
  form?: string;
  counterbalance?: string;
}): OpportunityRecord {
  const existing = records.get(init.opportunity_id);

  if (existing !== undefined) {
    return existing;
  }

  const record: OpportunityRecord = {
    opportunity_id: init.opportunity_id,
    owner: init.owner,
    entry_state_version: init.entry_state_version,
    form: init.form ?? null,
    offer_position: null,
    counterbalance: init.counterbalance ?? null,
    prior_exposure: [],
    offered: false,
    entered: false,
    completed: false,
    absent: false,
    censored: false,
    technical_failure: false,
    comprehension_failure: false,
    contaminated: false,
    invalid_reason: null,
    invalid_detail: null,
  };

  records.set(init.opportunity_id, record);

  return record;
}

function requireRecord(opportunityId: string): OpportunityRecord {
  const record = records.get(opportunityId);

  if (record === undefined) {
    throw new Error(`Undeclared measurement opportunity: ${opportunityId}`);
  }

  return record;
}

export function markOpportunityOffered(opportunityId: string) {
  const record = requireRecord(opportunityId);

  if (!record.offered) {
    record.offered = true;
    offerCounter += 1;
    record.offer_position = offerCounter;
  }
}

export function markOpportunityEntered(opportunityId: string) {
  const record = requireRecord(opportunityId);

  markOpportunityOffered(opportunityId);
  record.entered = true;
}

export function markOpportunityCompleted(opportunityId: string) {
  const record = requireRecord(opportunityId);

  record.completed = true;
}

export function recordPriorExposure(opportunityId: string, note: string) {
  const record = requireRecord(opportunityId);

  if (!record.prior_exposure.includes(note)) {
    record.prior_exposure.push(note);
  }
}

export function markOpportunityInvalid(
  opportunityId: string,
  reason: OpportunityInvalidReason,
  detail?: string,
) {
  const record = requireRecord(opportunityId);

  record.invalid_reason = reason;
  record.invalid_detail = detail ?? null;

  switch (reason) {
    case 'technical_failure':
      record.technical_failure = true;
      break;
    case 'comprehension_failure':
      record.comprehension_failure = true;
      break;
    case 'contamination':
      record.contaminated = true;
      break;
    case 'participant_absent':
      record.absent = true;
      break;
    case 'censored':
      record.censored = true;
      break;
    default:
      break;
  }
}

/**
 * The record's validity state (contamination_default rule): any failure/
 * contamination/censoring marker → invalid or missing, NEVER a low score;
 * completed without markers → valid; otherwise still pending/missing.
 */
export function opportunityValidity(
  record: OpportunityRecord,
): OpportunityValidity {
  if (
    record.technical_failure ||
    record.comprehension_failure ||
    record.contaminated ||
    record.invalid_reason === 'invalid_entry_state' ||
    record.invalid_reason === 'insufficient_opportunity'
  ) {
    return 'invalid';
  }

  if (
    record.absent ||
    record.censored ||
    record.invalid_reason === 'no_opportunity'
  ) {
    return 'missing';
  }

  if (record.completed) {
    return 'valid';
  }

  return 'pending';
}

/** Full register snapshot (DEV probe / tests / session summary). */
export function serializeOpportunities(): (OpportunityRecord & {
  validity: OpportunityValidity;
})[] {
  return [...records.values()].map((record) => ({
    ...record,
    prior_exposure: [...record.prior_exposure],
    validity: opportunityValidity(record),
  }));
}

/**
 * Room-entry feed (called once per room entry by RoomScene): supports
 * order/position bookkeeping and later-visit eligibility checks without
 * scenes wiring into each other.
 */
export function noteRoomEntered(roomId: string) {
  roomEntryLog.push(roomId);
}

export function getRoomEntryLog(): string[] {
  return [...roomEntryLog];
}

/**
 * Deterministic per-session counterbalance assignment: hash of the game
 * session id + slot key picks one option; the assignment is RECORDED on
 * the record/event side wherever it is used. Deterministic so a session
 * is reproducible; varies across sessions via the session id.
 */
export function assignCounterbalance<T>(
  sessionId: string,
  slotKey: string,
  options: readonly T[],
): T {
  const input = `${sessionId}:${slotKey}`;
  let hash = 0;

  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }

  return options[Math.abs(hash) % options.length];
}

/** Test-only escape hatch (resetAllRoomTaskStates precedent). */
export function resetMeasurementValidity() {
  records.clear();
  offerCounter = 0;
  roomEntryLog.length = 0;
}

declare global {
  interface Window {
    /**
     * DEV-only, read-only SA-13 register probe (__playerProbe
     * precedent): provisional internal validity state, never a score.
     */
    __measurementValidity?:
      | (OpportunityRecord & { validity: OpportunityValidity })[]
      | null;
  }
}

/** Refreshes the DEV probe (call after any register change). */
export function refreshValidityProbe() {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    window.__measurementValidity = serializeOpportunities();
  }
}
