/**
 * Exterior Recovery Yard job orchestration (pilot Unit 5).
 *
 * Pure module-scope session state (no Phaser, no runtime imports — the
 * measurement-module convention): the counterbalanced yard job queue,
 * the two AMBIENT yard instances (M22 relay housing seal, M25 yard
 * coolant pump) built from the fresh-instance factories (REV-BLOCK-3),
 * their event emission through the injected field-action log sink, the
 * per-window yard-exit counts and the zone re-entry count.
 *
 * Job queue (crosswalk §3, REV-MAJ-7/8): M23 always first (tool issue),
 * then the {M22, M25} pair and the {M24, M26} pair each in a
 * counterbalanced order, with a neutral Noor check-in between the
 * {M24, M26} pair. Accepting a job is a BRIEF, never a gate: every
 * station stays physically reachable, nothing checks performance, and
 * "I am done outside" is available at every step (fail-forward).
 *
 * Departure semantics (crosswalk M22/M25, D-X-4 recorded not resolved):
 * leaving the yard with an ambient window open emits a `departed` event
 * and increments `yard_exits_during_window` — it is NOT a latch; a
 * participant who returns and completes the recovery still closes the
 * window as completed. The third explicit terminal code
 * (`closed_departed_without_recovery` / `closed_departed_without_reset`)
 * is written only when the session's measurement is finally closed
 * (`finalizeYardAmbientWindows`, called at Final Core).
 *
 * GOVERNANCE: every identifier is a provisional candidate. Families
 * `proto_m22_housing_*` and `proto_m25_yardpump_*` are pairwise-
 * disjoint from every other family. No scoring, no trait inference.
 */
import { emitFieldActionLog } from '../fieldActions/fieldActionLog';
import type { M22SetbackInstance } from '../measurement/m22Setback';
import { createM22SetbackState } from '../measurement/m22Setback';
import type { M25PumpLockInstance } from '../measurement/m25PumpLock';
import { createM25PumpLockState } from '../measurement/m25PumpLock';

export const YARD_M22_OPPORTUNITY_ID = 'proto_m22_housing_seal_setback';
export const YARD_M22_ENTRY_STATE_VERSION = 'm22-housing-seal-v1';

/**
 * The standardised, explained, external setback (identical for
 * everyone). Host-specific recovery route wording (REV-BLOCK-2.2):
 * names the yard supply crate, never the legacy Coolant Yard.
 */
export const YARD_M22_SETBACK_EXPLANATION =
  'The seal cracks as it seats — a known cold-storage batch fault, not your work. A fresh seal is in the yard supply crate, east side.';

export const YARD_M25_OPPORTUNITY_ID = 'proto_m25_yardpump_interlock';
export const YARD_M25_ENTRY_STATE_VERSION = 'm25-yardpump-v1';

/** Complete provisional event families (disjointness tests). */
export const YARD_M22_EVENT_TYPES = [
  'proto_m22_housing_opportunity_opened',
  'proto_m22_housing_setback_shown',
  'proto_m22_housing_spare_fetched',
  'proto_m22_housing_seal_seated',
  'proto_m22_housing_departed',
  'proto_m22_housing_closed',
  'proto_m22_housing_technical_failure',
] as const;

export const YARD_M25_EVENT_TYPES = [
  'proto_m25_yardpump_opportunity_opened',
  'proto_m25_yardpump_post_lock_prime',
  'proto_m25_yardpump_breaker_reset',
  'proto_m25_yardpump_departed',
  'proto_m25_yardpump_closed',
  'proto_m25_yardpump_technical_failure',
] as const;

export type YardJobId = 'm23' | 'm22' | 'm25' | 'm24' | 'checkin' | 'm26';

/**
 * The four counterbalanced job orders (`exterior_job_order`): M23 first,
 * {M22, M25} order and {M24, M26} order each counterbalanced, neutral
 * check-in between the {M24, M26} pair (REV-MAJ-8).
 */
export const YARD_JOB_ORDERS: readonly (readonly YardJobId[])[] = [
  ['m23', 'm22', 'm25', 'm24', 'checkin', 'm26'],
  ['m23', 'm22', 'm25', 'm26', 'checkin', 'm24'],
  ['m23', 'm25', 'm22', 'm24', 'checkin', 'm26'],
  ['m23', 'm25', 'm22', 'm26', 'checkin', 'm24'],
];

interface YardJobsState {
  order_index: number | null;
  job_index: number;
  zone_entries: number;
  m22: M22SetbackInstance | null;
  m22_started_at: number | null;
  m22_exits: number;
  m22_closed_emitted: boolean;
  m25: M25PumpLockInstance | null;
  m25_started_at: number | null;
  m25_exits: number;
  m25_closed_emitted: boolean;
}

function createInitialYardJobsState(): YardJobsState {
  return {
    order_index: null,
    job_index: 0,
    zone_entries: 0,
    m22: null,
    m22_started_at: null,
    m22_exits: 0,
    m22_closed_emitted: false,
    m25: null,
    m25_started_at: null,
    m25_exits: 0,
    m25_closed_emitted: false,
  };
}

const state: YardJobsState = createInitialYardJobsState();

/** Assigns the counterbalanced job order once per session (idempotent). */
export function ensureYardJobOrder(orderIndex: number): number {
  if (state.order_index === null) {
    state.order_index = Math.abs(orderIndex) % YARD_JOB_ORDERS.length;
  }

  return state.order_index;
}

export function yardJobQueue(): readonly YardJobId[] {
  return state.order_index === null ? [] : YARD_JOB_ORDERS[state.order_index];
}

/** The job Noor calls next, or 'done' when the queue is exhausted. */
export function currentYardJob(): YardJobId | 'done' {
  const queue = yardJobQueue();

  return state.job_index < queue.length ? queue[state.job_index] : 'done';
}

/** Noor called the next job (acceptance is a brief, never a gate). */
export function advanceYardJob(): void {
  const queue = yardJobQueue();

  if (state.job_index < queue.length) {
    state.job_index += 1;
  }
}

/** 1-based queue position of a job for control notes (null: not queued). */
export function yardJobQueuePosition(job: YardJobId): number | null {
  const index = yardJobQueue().indexOf(job);

  return index >= 0 ? index + 1 : null;
}

/** Zone entry bookkeeping (REV-MAJ-10 re-entry visibility). */
export function noteYardZoneEntered(): number {
  state.zone_entries += 1;

  return state.zone_entries;
}

export function yardZoneEntryCount(): number {
  return state.zone_entries;
}

/* ————————————————————————— M22: relay housing seal ——————————————————— */

function m22Instance(): M22SetbackInstance {
  state.m22 ??= createM22SetbackState();

  return state.m22;
}

function emitM22(eventType: string, metadata: Record<string, unknown> = {}) {
  emitFieldActionLog({
    scene: 'exterior_recovery_yard',
    episode: 'proto_m22_housing',
    event_type: eventType,
    object_id: 'm22_relay_housing',
    metadata: {
      measure_id: 'M22',
      opportunity_id: YARD_M22_OPPORTUNITY_ID,
      entry_state_version: YARD_M22_ENTRY_STATE_VERSION,
      ...metadata,
    },
  });
}

export function yardM22WindowOpen(): boolean {
  return state.m22?.windowOpen() ?? false;
}

export function yardM22Summary() {
  const instance = m22Instance();

  return {
    ...instance.summary(),
    yard_exits_during_window: state.m22_exits,
    active_ms:
      state.m22_started_at === null ? null : Date.now() - state.m22_started_at,
  };
}

export type YardM22SeatResult =
  | { kind: 'setback'; explanation: string }
  | { kind: 'need_seal' }
  | { kind: 'seated' }
  | { kind: 'already_seated' };

/**
 * One seating attempt at the housing. First attempt reveals the
 * standardised setback (window opens); later attempts either need the
 * fresh seal or complete the recovery.
 */
export function yardM22SeatAttempt(nowMs: number): YardM22SeatResult {
  const instance = m22Instance();

  if (instance.state.seal_seated) {
    return { kind: 'already_seated' };
  }

  if (!instance.state.setback_shown) {
    instance.markFixAttempted();
    instance.markSetbackShown();
    state.m22_started_at = nowMs;
    emitM22('proto_m22_housing_opportunity_opened', {
      opportunity_started_at: nowMs,
      setback_shown: true,
      spare_seal_location_stated: true,
    });
    emitM22('proto_m22_housing_setback_shown', {
      explanation: YARD_M22_SETBACK_EXPLANATION,
    });

    return { kind: 'setback', explanation: YARD_M22_SETBACK_EXPLANATION };
  }

  if (!instance.state.spare_seal_fetched) {
    return { kind: 'need_seal' };
  }

  instance.seatSeal();
  emitM22('proto_m22_housing_seal_seated', { seated_at: nowMs });
  emitM22('proto_m22_housing_closed', {
    ...yardM22Summary(),
    departure_code: null,
    closed_at: nowMs,
  });
  state.m22_closed_emitted = true;

  return { kind: 'seated' };
}

/** Collecting the fresh seal at the yard supply crate. */
export function yardM22FetchSeal(nowMs: number): boolean {
  const instance = m22Instance();

  if (!instance.windowOpen() || instance.state.spare_seal_fetched) {
    return false;
  }

  instance.markSpareSealFetched();
  emitM22('proto_m22_housing_spare_fetched', { fetched_at: nowMs });

  return true;
}

export function yardM22SealFetched(): boolean {
  return state.m22?.state.spare_seal_fetched ?? false;
}

export function yardM22Seated(): boolean {
  return state.m22?.state.seal_seated ?? false;
}

/* ————————————————————————— M25: yard coolant pump ———————————————————— */

function m25Instance(): M25PumpLockInstance {
  state.m25 ??= createM25PumpLockState();

  return state.m25;
}

function emitM25(eventType: string, metadata: Record<string, unknown> = {}) {
  emitFieldActionLog({
    scene: 'exterior_recovery_yard',
    episode: 'proto_m25_yardpump',
    event_type: eventType,
    object_id: 'm25_yard_pump',
    metadata: {
      measure_id: 'M25',
      opportunity_id: YARD_M25_OPPORTUNITY_ID,
      entry_state_version: YARD_M25_ENTRY_STATE_VERSION,
      ...metadata,
    },
  });
}

export function yardM25WindowOpen(): boolean {
  return state.m25?.windowOpen() ?? false;
}

export function yardM25Reset(): boolean {
  return state.m25?.state.reset_done ?? false;
}

export function yardM25Summary() {
  const instance = m25Instance();

  return {
    ...instance.summary(),
    yard_exits_during_window: state.m25_exits,
    active_ms:
      state.m25_started_at === null ? null : Date.now() - state.m25_started_at,
  };
}

/** One press of the pump prime control (delegates to the instance). */
export function yardM25Prime(nowMs: number) {
  const instance = m25Instance();
  const result = instance.pressPrime();

  if (result.kind === 'cycle' && result.lockEngaged) {
    state.m25_started_at = nowMs;
    emitM25('proto_m25_yardpump_opportunity_opened', {
      opportunity_started_at: nowMs,
      useful_cycles: instance.state.useful_cycles,
      lock_statement_shown: true,
      breaker_visible: true,
    });
  }

  if (result.kind === 'locked') {
    emitM25('proto_m25_yardpump_post_lock_prime', {
      post_lock_primes: result.postLockPresses,
    });
  }

  return result;
}

/** The breaker reset (the visible different strategy). */
export function yardM25Breaker(nowMs: number): boolean {
  const instance = m25Instance();

  if (!instance.resetInterlock()) {
    return false;
  }

  emitM25('proto_m25_yardpump_breaker_reset', { reset_at: nowMs });
  emitM25('proto_m25_yardpump_closed', {
    ...yardM25Summary(),
    departure_code: null,
    closed_at: nowMs,
  });
  state.m25_closed_emitted = true;

  return true;
}

/* ————————————————————————— departures + finalisation ————————————————— */

/**
 * The participant left the yard. Any OPEN ambient window records a
 * departure (exit count + event) — never a terminal code, never
 * `completed`, never `participant_absent` (REV-BLOCK-2): returning and
 * finishing the recovery is still fully available.
 */
export function noteYardDeparture(nowMs: number): void {
  if (yardM22WindowOpen()) {
    state.m22_exits += 1;
    state.m22?.markLeftDuringWindow();
    emitM22('proto_m22_housing_departed', {
      yard_exits_during_window: state.m22_exits,
      departed_at: nowMs,
    });
  }

  if (yardM25WindowOpen()) {
    state.m25_exits += 1;
    emitM25('proto_m25_yardpump_departed', {
      yard_exits_during_window: state.m25_exits,
      departed_at: nowMs,
    });
  }
}

/**
 * Final measurement closure (Final Core, Unit 7): a still-open ambient
 * window closes with its third explicit terminal code — never
 * `completed`, never `participant_absent` (D-X-4 records whether the
 * code may ever be treated as evidence; it is not resolved here).
 */
export function finalizeYardAmbientWindows(nowMs: number): void {
  if (yardM22WindowOpen() && !state.m22_closed_emitted) {
    emitM22('proto_m22_housing_closed', {
      ...yardM22Summary(),
      departure_code: 'closed_departed_without_recovery',
      closed_at: nowMs,
    });
    state.m22?.close();
    state.m22_closed_emitted = true;
  }

  if (yardM25WindowOpen() && !state.m25_closed_emitted) {
    emitM25('proto_m25_yardpump_closed', {
      ...yardM25Summary(),
      departure_code: 'closed_departed_without_reset',
      closed_at: nowMs,
    });
    state.m25_closed_emitted = true;
  }
}

/** M22 attempted at least once (register `entered` bookkeeping aid). */
export function yardM22Attempted(): boolean {
  return state.m22?.state.fix_attempted ?? false;
}

/** M25 primed at least once (register `entered` bookkeeping aid). */
export function yardM25Attempted(): boolean {
  return (state.m25?.state.useful_cycles ?? 0) > 0;
}

/** Test-only escape hatch. */
export function resetYardJobsState(): void {
  Object.assign(state, createInitialYardJobsState());
}
