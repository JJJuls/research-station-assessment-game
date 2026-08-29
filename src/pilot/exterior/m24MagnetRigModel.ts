/**
 * M24 — Metal Recovery Yard magnet rig window (evidence-led pilot v2,
 * Unit 4). PURE model (no Phaser, no runtime imports; Node-testable).
 *
 * Ledger (sheet 09): complete a finite useful deck; then show and
 * acknowledge objective depletion while an equally visible useful
 * alternative is available. Raw components `depletion_reached`,
 * `depletion_acknowledged`, `postdepletion_casts`,
 * `identical_postdepletion_cycles`, `alternative_opened`. Validity gate:
 * finite deck advances consistently; zero utility objectively true; no
 * random jackpot after depletion; comprehension confirmed; misses before
 * depletion excluded.
 *
 * The MECHANICS are the accepted foundation: the finite counterbalanced
 * deck (src/fieldActions/magnetDeck.ts — every committed cycle consumes
 * one position, in-band or not; post-depletion pulls are empty BY
 * CONSTRUCTION) and the winch state machine. This model classifies each
 * resolved cycle the rig reports while the window is open:
 *
 *   pre-depletion committed cycles      → useful / empty outcomes
 *   cycles after depletion, before ack  → post-depletion, pre-knowledge
 *   cycles after acknowledgement        → identical post-depletion cycles
 *
 * Knowledge is verified by the participant's explicit acknowledgement of
 * the depletion statement at the rig panel; the statement is also shown
 * on every post-depletion cycle (exposure count recorded). Neither
 * continuing nor stopping is interpreted anywhere. Timing-band accuracy
 * is secondary motor telemetry only. Nothing here is a score.
 */

export const M24_OPPORTUNITY_ID = 'proto_m24_magnet_utility';
export const M24_WINDOW_ID = 'm24_magnet_w1';
export const M24_ENTRY_STATE_VERSION = 'm24-magnet-rig-v1';
export const M24_FAMILY = 'proto_m24_magnet_utility_';

export const M24_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'cycle',
  'depletion_reached',
  'depletion_shown',
  'depletion_acknowledged',
  'alternative_opened',
  'departed',
  'window_closed',
  'invalidated',
  'technical_failure',
] as const;

/** The participant-facing depletion statement (identical for everyone). */
export const M24_DEPLETION_STATEMENT =
  'CATCHMENT DEPLETED — every recoverable piece in this heap has been brought up. Further cycles bring up nothing.';

/** Rig brief shown before the first cycle (comprehension exposure). */
export const M24_RIG_BRIEF =
  'Salvage tally. The catchment under the rig holds a finite set of recoverable pieces. Each cycle (F on the operating pad) lowers the magnet and brings up the next piece — or nothing; ESC cancels a cycle while the magnet is still lowering. When the panel reads CATCHMENT DEPLETED, nothing further can be recovered from it. The sorting bench beside the rig logs recovered stock.';

/** Structural subset of the foundation MagnetCycleRecord. */
export interface M24CycleLike {
  cancelled: boolean;
  hook_set: boolean;
  locked_in_band: boolean;
  lock_source: string | null;
  outcome_tier: string | null;
  item_id: string | null;
  item_delivery: 'inventory' | 'cache' | null;
  pull_position: number | null;
  post_depletion: boolean;
  depleted_now: boolean;
  cycle_duration_ms: number | null;
}

export type M24KnowledgeState =
  | 'not_depleted'
  | 'depleted_unacknowledged'
  | 'depleted_acknowledged';

export type M24StopChoice = 'ended_shift_outside' | 'closed_at_review' | null;

export interface M24State {
  deck_form: string;
  deck_position_at_open: number | null;
  entered: boolean;
  closed: boolean;
  opened_at_ms: number | null;
  cycles_committed: number;
  cycles_cancelled: number;
  useful_outcomes: number;
  empty_outcomes_pre_depletion: number;
  in_band_locks: number;
  out_of_band_locks: number;
  depletion_reached_ms: number | null;
  depletion_reached_at_cycle: number | null;
  depletion_shown_count: number;
  depletion_shown_first_ms: number | null;
  depletion_acknowledged_ms: number | null;
  postdepletion_casts_pre_ack: number;
  postdepletion_casts_post_ack: number;
  alternative_opened_pre_depletion: number;
  alternative_opened_post_depletion_ms: number | null;
  alternative_opened_post_depletion: number;
  last_cycle_ms: number | null;
  departures: number;
  stop_choice: M24StopChoice;
}

export function createM24State(deckForm: string): M24State {
  return {
    deck_form: deckForm,
    deck_position_at_open: null,
    entered: false,
    closed: false,
    opened_at_ms: null,
    cycles_committed: 0,
    cycles_cancelled: 0,
    useful_outcomes: 0,
    empty_outcomes_pre_depletion: 0,
    in_band_locks: 0,
    out_of_band_locks: 0,
    depletion_reached_ms: null,
    depletion_reached_at_cycle: null,
    depletion_shown_count: 0,
    depletion_shown_first_ms: null,
    depletion_acknowledged_ms: null,
    postdepletion_casts_pre_ack: 0,
    postdepletion_casts_post_ack: 0,
    alternative_opened_pre_depletion: 0,
    alternative_opened_post_depletion_ms: null,
    alternative_opened_post_depletion: 0,
    last_cycle_ms: null,
    departures: 0,
    stop_choice: null,
  };
}

export function m24Open(state: M24State): boolean {
  return state.entered && !state.closed;
}

export function m24Enter(
  state: M24State,
  nowMs: number,
  deckPositionAtOpen: number,
): boolean {
  if (state.entered || state.closed) {
    return false;
  }

  state.entered = true;
  state.opened_at_ms = nowMs;
  state.deck_position_at_open = deckPositionAtOpen;

  return true;
}

function elapsed(state: M24State, nowMs: number): number {
  return Math.max(0, nowMs - (state.opened_at_ms ?? nowMs));
}

export function m24KnowledgeState(state: M24State): M24KnowledgeState {
  if (state.depletion_reached_ms === null) {
    return 'not_depleted';
  }

  return state.depletion_acknowledged_ms === null
    ? 'depleted_unacknowledged'
    : 'depleted_acknowledged';
}

export interface M24CycleNote {
  committed: boolean;
  post_depletion: boolean;
  post_ack: boolean;
  depletion_reached_now: boolean;
}

/** One resolved rig cycle inside the open window. */
export function m24NoteCycle(
  state: M24State,
  record: M24CycleLike,
  nowMs: number,
): M24CycleNote {
  if (!m24Open(state)) {
    throw new Error('M24: cycle outside the open window');
  }

  state.last_cycle_ms = elapsed(state, nowMs);

  if (record.cancelled) {
    state.cycles_cancelled += 1;

    return {
      committed: false,
      post_depletion: false,
      post_ack: false,
      depletion_reached_now: false,
    };
  }

  state.cycles_committed += 1;

  if (record.locked_in_band) {
    state.in_band_locks += 1;
  } else {
    state.out_of_band_locks += 1;
  }

  const postAck = state.depletion_acknowledged_ms !== null;

  if (record.post_depletion) {
    if (postAck) {
      state.postdepletion_casts_post_ack += 1;
    } else {
      state.postdepletion_casts_pre_ack += 1;
    }

    return {
      committed: true,
      post_depletion: true,
      post_ack: postAck,
      depletion_reached_now: false,
    };
  }

  if (record.item_id !== null) {
    state.useful_outcomes += 1;
  } else {
    state.empty_outcomes_pre_depletion += 1;
  }

  let reachedNow = false;

  if (record.depleted_now && state.depletion_reached_ms === null) {
    state.depletion_reached_ms = elapsed(state, nowMs);
    state.depletion_reached_at_cycle = state.cycles_committed;
    reachedNow = true;
  }

  return {
    committed: true,
    post_depletion: false,
    post_ack: false,
    depletion_reached_now: reachedNow,
  };
}

/** The depletion statement was displayed (every display counted). */
export function m24NoteDepletionShown(state: M24State, nowMs: number): boolean {
  if (!m24Open(state) || state.depletion_reached_ms === null) {
    return false;
  }

  state.depletion_shown_count += 1;
  state.depletion_shown_first_ms ??= elapsed(state, nowMs);

  return true;
}

/** Explicit acknowledgement (knowledge verified). Requires a display. */
export function m24Acknowledge(state: M24State, nowMs: number): boolean {
  if (
    !m24Open(state) ||
    state.depletion_shown_first_ms === null ||
    state.depletion_acknowledged_ms !== null
  ) {
    return false;
  }

  state.depletion_acknowledged_ms = elapsed(state, nowMs);

  return true;
}

/** The equally visible alternative (sorting bench) was used. */
export function m24NoteAlternative(state: M24State, nowMs: number): boolean {
  if (!m24Open(state)) {
    return false;
  }

  if (state.depletion_reached_ms === null) {
    state.alternative_opened_pre_depletion += 1;
  } else {
    state.alternative_opened_post_depletion += 1;
    state.alternative_opened_post_depletion_ms ??= elapsed(state, nowMs);
  }

  return true;
}

export function m24Depart(state: M24State): boolean {
  if (!m24Open(state)) {
    return false;
  }

  state.departures += 1;

  return true;
}

export function m24Close(
  state: M24State,
  choice: Exclude<M24StopChoice, null>,
): boolean {
  if (!m24Open(state)) {
    return false;
  }

  state.closed = true;
  state.stop_choice = choice;

  return true;
}

/**
 * Register semantics for the closure (host applies): the observation is
 * complete only once the depletion statement was shown AND acknowledged;
 * never depleted → missing (no depletion opportunity arose); depleted but
 * never acknowledged → invalid (knowledge unverified). Never a low value.
 */
export type M24Closure =
  | { kind: 'completed' }
  | { kind: 'missing'; detail: string }
  | { kind: 'invalid'; detail: string };

export function m24ClosureDisposition(state: M24State): M24Closure {
  if (state.depletion_reached_ms === null) {
    return { kind: 'missing', detail: 'deck_never_depleted' };
  }

  if (state.depletion_shown_first_ms === null) {
    return { kind: 'invalid', detail: 'depletion_statement_never_displayed' };
  }

  if (state.depletion_acknowledged_ms === null) {
    return { kind: 'invalid', detail: 'depletion_not_acknowledged' };
  }

  return { kind: 'completed' };
}

/** Participant-facing rig panel line (no remaining count before depletion). */
export function m24PanelLine(state: M24State, depleted: boolean): string {
  if (!state.entered) {
    return depleted ? 'CATCHMENT DEPLETED' : 'RIG READY — read the panel (E)';
  }

  return `CYCLES ${state.cycles_committed} · RECOVERED ${state.useful_outcomes}`;
}

/** Ledger raw components + contextual counts (never a score). */
export function m24RawComponents(state: M24State) {
  return {
    deck_form: state.deck_form,
    deck_position_at_open: state.deck_position_at_open,
    depletion_reached: state.depletion_reached_ms !== null,
    depletion_reached_ms: state.depletion_reached_ms,
    depletion_reached_at_cycle: state.depletion_reached_at_cycle,
    depletion_acknowledged: state.depletion_acknowledged_ms !== null,
    depletion_acknowledged_ms: state.depletion_acknowledged_ms,
    depletion_shown_count: state.depletion_shown_count,
    depletion_shown_first_ms: state.depletion_shown_first_ms,
    postdepletion_casts:
      state.postdepletion_casts_pre_ack + state.postdepletion_casts_post_ack,
    postdepletion_casts_pre_ack: state.postdepletion_casts_pre_ack,
    identical_postdepletion_cycles: state.postdepletion_casts_post_ack,
    alternative_opened: state.alternative_opened_post_depletion > 0,
    alternative_opened_post_depletion_ms:
      state.alternative_opened_post_depletion_ms,
    alternative_opened_pre_depletion: state.alternative_opened_pre_depletion,
    // Contextual.
    cycles_committed: state.cycles_committed,
    cycles_cancelled: state.cycles_cancelled,
    useful_outcomes: state.useful_outcomes,
    empty_outcomes_pre_depletion: state.empty_outcomes_pre_depletion,
    in_band_locks: state.in_band_locks,
    out_of_band_locks: state.out_of_band_locks,
    time_post_depletion_ms:
      state.depletion_reached_ms === null || state.last_cycle_ms === null
        ? null
        : Math.max(0, state.last_cycle_ms - state.depletion_reached_ms),
    departures: state.departures,
    stop_choice: state.stop_choice,
  };
}
