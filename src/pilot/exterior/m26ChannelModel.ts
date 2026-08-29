/**
 * M26 — disconnected uplink channel window (evidence-led pilot v2, Unit 4).
 * PURE model (no Phaser, no runtime imports; Node-testable).
 *
 * Ledger (sheet 09): after one successful transmission, physically
 * disconnect the channel, demonstrate and acknowledge the state, while a
 * working alternative channel remains available. Raw components
 * `disconnect_acknowledged`, `confirmation_probe_excluded`,
 * `postknowledge_transmissions`, `alternative_used`. Validity gate:
 * worthlessness beyond doubt; first confirmation probe excluded;
 * alternative equally accessible; no hidden recovery.
 *
 * Mechanic: two field uplink posts. The recovery brief requires two
 * reports (coupling recovery, salvage tally). Post A is the primary
 * uplink; Post B the backup, three tiles away, always working. After the
 * FIRST successful transmission the storm tears the conduit to Post A
 * open — a standardised, scripted, visibly demonstrated event (severed
 * conduit segment, continuity indicator LINE A ✕ OPEN, line-status panel
 * notice, and every later Post A transmit attempt returns NO CARRIER).
 * The disconnect is real by construction: Post A can never deliver again
 * in this session — there is no hidden recovery.
 *
 * Knowledge: attempts on Post A after the disconnect but BEFORE the
 * participant's explicit acknowledgement are `pre_knowledge` (never
 * post-knowledge continuation). After the acknowledgement the FIRST Post
 * A attempt is the excluded confirmation probe; later ones are
 * `postknowledge_transmissions`. Any Post B delivery after the
 * disconnect is `alternative_used`. Neither continuing nor switching is
 * interpreted anywhere. Nothing here is a score.
 */

export const M26_OPPORTUNITY_ID = 'proto_m26_channel_disconnect';
export const M26_WINDOW_ID = 'm26_channel_w1';
export const M26_ENTRY_STATE_VERSION = 'm26-channel-v1';
export const M26_FAMILY = 'proto_m26_channel_';

export const M26_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'transmission',
  'disconnect_demonstrated',
  'evidence_viewed',
  'disconnect_acknowledged',
  'confirmation_probe',
  'postknowledge_transmission',
  'alternative_used',
  'departed',
  'window_closed',
  'invalidated',
  'technical_failure',
] as const;

export type M26Channel = 'A' | 'B';

export type M26Report = 'coupling_recovery' | 'salvage_tally';

/** The two required reports, in the order they are queued. */
export const M26_REPORTS: readonly M26Report[] = [
  'coupling_recovery',
  'salvage_tally',
];

export const M26_REPORT_LABELS: Record<M26Report, string> = {
  coupling_recovery: 'Coupling recovery report',
  salvage_tally: 'Salvage tally report',
};

/** Line-status panel notice after the disconnect (identical for everyone). */
export const M26_DISCONNECT_NOTICE =
  'LINE A ✕ OPEN — conduit severed at junction 2 after the gust. No carrier on Post A: nothing sent from it can reach the station. LINE B ● CARRIER OK — backup uplink, three posts east.';

export const M26_CARRIER_OK_NOTICE =
  'LINE A ● CARRIER OK — primary uplink.   LINE B ● CARRIER OK — backup uplink.';

export const M26_UPLINK_BRIEF =
  'Field uplink. Two recovery reports are due: the coupling recovery report and the salvage tally report. Transmit from Post A (primary); Post B (backup) carries the same reports. Each transmission takes a moment and the post shows the result.';

/** Transmit act duration (ms) the host performs in the world. */
export const M26_TRANSMIT_MS = 1200;

/** Delay (ms) between the first ACK and the scripted conduit failure. */
export const M26_DISCONNECT_DELAY_MS = 1400;

export type M26Knowledge =
  | 'connected'
  | 'disconnected_unacknowledged'
  | 'disconnected_acknowledged';

export type M26Classification =
  | 'delivered'
  | 'pre_knowledge'
  | 'confirmation_probe'
  | 'postknowledge';

export interface M26Transmission {
  channel: M26Channel;
  report: M26Report | null;
  delivered: boolean;
  classification: M26Classification;
  elapsed_ms: number;
}

export type M26StopChoice = 'ended_shift_outside' | 'closed_at_review' | null;

export interface M26State {
  entered: boolean;
  closed: boolean;
  opened_at_ms: number | null;
  transmissions: M26Transmission[];
  delivered: Partial<Record<M26Report, M26Channel>>;
  first_success_ms: number | null;
  first_success_channel: M26Channel | null;
  successes_on_a_before_disconnect: number;
  disconnected_ms: number | null;
  evidence_views: number;
  first_evidence_ms: number | null;
  evidence_sources: string[];
  acknowledged_ms: number | null;
  pre_knowledge_attempts: number;
  confirmation_probe_ms: number | null;
  postknowledge_transmissions: number;
  postknowledge_transmissions_after_delivery: number;
  alternative_used_ms: number | null;
  b_transmissions_after_disconnect: number;
  departures: number;
  stop_choice: M26StopChoice;
}

export function createM26State(): M26State {
  return {
    entered: false,
    closed: false,
    opened_at_ms: null,
    transmissions: [],
    delivered: {},
    first_success_ms: null,
    first_success_channel: null,
    successes_on_a_before_disconnect: 0,
    disconnected_ms: null,
    evidence_views: 0,
    first_evidence_ms: null,
    evidence_sources: [],
    acknowledged_ms: null,
    pre_knowledge_attempts: 0,
    confirmation_probe_ms: null,
    postknowledge_transmissions: 0,
    postknowledge_transmissions_after_delivery: 0,
    alternative_used_ms: null,
    b_transmissions_after_disconnect: 0,
    departures: 0,
    stop_choice: null,
  };
}

export function m26Open(state: M26State): boolean {
  return state.entered && !state.closed;
}

export function m26Enter(state: M26State, nowMs: number): boolean {
  if (state.entered || state.closed) {
    return false;
  }

  state.entered = true;
  state.opened_at_ms = nowMs;

  return true;
}

function elapsed(state: M26State, nowMs: number): number {
  return Math.max(0, nowMs - (state.opened_at_ms ?? nowMs));
}

export function m26Disconnected(state: M26State): boolean {
  return state.disconnected_ms !== null;
}

export function m26Knowledge(state: M26State): M26Knowledge {
  if (!m26Disconnected(state)) {
    return 'connected';
  }

  return state.acknowledged_ms === null
    ? 'disconnected_unacknowledged'
    : 'disconnected_acknowledged';
}

/** The next report still to deliver, or null when both are delivered. */
export function m26NextReport(state: M26State): M26Report | null {
  return (
    M26_REPORTS.find((report) => state.delivered[report] === undefined) ?? null
  );
}

export function m26AllDelivered(state: M26State): boolean {
  return m26NextReport(state) === null;
}

/**
 * Whether the scripted disconnect is due: after the first successful
 * transmission (on either post), once, while Post A is still connected.
 */
export function m26DisconnectDue(state: M26State): boolean {
  return (
    m26Open(state) &&
    state.first_success_ms !== null &&
    state.disconnected_ms === null
  );
}

/** One transmit attempt on a post. Post B always carries; Post A carries
 * only while connected. Classification follows the knowledge state. */
export function m26Transmit(
  state: M26State,
  channel: M26Channel,
  nowMs: number,
): M26Transmission {
  if (!m26Open(state)) {
    throw new Error('M26: transmit outside the open window');
  }

  const report = m26NextReport(state);
  const connected = channel === 'B' || !m26Disconnected(state);
  const at = elapsed(state, nowMs);

  if (connected) {
    if (report !== null) {
      state.delivered[report] = channel;
    }

    if (state.first_success_ms === null) {
      state.first_success_ms = at;
      state.first_success_channel = channel;
    }

    if (channel === 'A') {
      state.successes_on_a_before_disconnect += 1;
    } else if (m26Disconnected(state)) {
      state.b_transmissions_after_disconnect += 1;
      state.alternative_used_ms ??= at;
    }

    const transmission: M26Transmission = {
      channel,
      report,
      delivered: report !== null,
      classification: 'delivered',
      elapsed_ms: at,
    };

    state.transmissions.push(transmission);

    return transmission;
  }

  // Post A after the disconnect: NO CARRIER, classified by knowledge.
  let classification: M26Classification;

  if (state.acknowledged_ms === null) {
    classification = 'pre_knowledge';
    state.pre_knowledge_attempts += 1;
  } else if (state.confirmation_probe_ms === null) {
    classification = 'confirmation_probe';
    state.confirmation_probe_ms = at;
  } else {
    classification = 'postknowledge';
    state.postknowledge_transmissions += 1;

    if (report === null) {
      state.postknowledge_transmissions_after_delivery += 1;
    }
  }

  const transmission: M26Transmission = {
    channel,
    report,
    delivered: false,
    classification,
    elapsed_ms: at,
  };

  state.transmissions.push(transmission);

  return transmission;
}

/** The scripted, visible conduit failure happened (once). */
export function m26Demonstrate(state: M26State, nowMs: number): boolean {
  if (!m26DisconnectDue(state)) {
    return false;
  }

  state.disconnected_ms = elapsed(state, nowMs);

  return true;
}

/** The participant viewed the evidence (panel / post inspection). */
export function m26ViewEvidence(
  state: M26State,
  nowMs: number,
  source: string,
): boolean {
  if (!m26Open(state) || !m26Disconnected(state)) {
    return false;
  }

  state.evidence_views += 1;
  state.first_evidence_ms ??= elapsed(state, nowMs);

  if (!state.evidence_sources.includes(source)) {
    state.evidence_sources.push(source);
  }

  return true;
}

/** Explicit acknowledgement (knowledge verified). Requires the disconnect. */
export function m26Acknowledge(state: M26State, nowMs: number): boolean {
  if (
    !m26Open(state) ||
    !m26Disconnected(state) ||
    state.acknowledged_ms !== null
  ) {
    return false;
  }

  state.acknowledged_ms = elapsed(state, nowMs);

  return true;
}

export function m26Depart(state: M26State): boolean {
  if (!m26Open(state)) {
    return false;
  }

  state.departures += 1;

  return true;
}

export function m26Close(
  state: M26State,
  choice: Exclude<M26StopChoice, null>,
): boolean {
  if (!m26Open(state)) {
    return false;
  }

  state.closed = true;
  state.stop_choice = choice;

  return true;
}

/**
 * Register semantics (host applies): complete once the disconnect was
 * demonstrated AND acknowledged; never disconnected (no successful
 * transmission) → missing; disconnected but never acknowledged → invalid
 * (knowledge unverified — attempts stay pre-knowledge). Never a low value.
 */
export type M26Closure =
  | { kind: 'completed' }
  | { kind: 'missing'; detail: string }
  | { kind: 'invalid'; detail: string };

export function m26ClosureDisposition(state: M26State): M26Closure {
  if (!m26Disconnected(state)) {
    return { kind: 'missing', detail: 'channel_never_disconnected' };
  }

  if (state.acknowledged_ms === null) {
    return { kind: 'invalid', detail: 'disconnect_not_acknowledged' };
  }

  return { kind: 'completed' };
}

/** Participant-facing post status line (glyph + text, never colour-only). */
export function m26PostStatus(state: M26State, channel: M26Channel): string {
  if (channel === 'B') {
    return 'LINE B ● CARRIER OK';
  }

  return m26Disconnected(state)
    ? 'LINE A ✕ OPEN — NO CARRIER'
    : 'LINE A ● CARRIER OK';
}

/** Ledger raw components + contextual counts (never a score). */
export function m26RawComponents(state: M26State) {
  return {
    disconnect_demonstrated: m26Disconnected(state),
    disconnect_demonstrated_ms: state.disconnected_ms,
    disconnect_acknowledged: state.acknowledged_ms !== null,
    disconnect_acknowledged_ms: state.acknowledged_ms,
    confirmation_probe_rule_applied: true,
    confirmation_probe_made: state.confirmation_probe_ms !== null,
    confirmation_probe_excluded: state.confirmation_probe_ms !== null,
    confirmation_probe_ms: state.confirmation_probe_ms,
    postknowledge_transmissions: state.postknowledge_transmissions,
    postknowledge_transmissions_after_delivery:
      state.postknowledge_transmissions_after_delivery,
    alternative_used: state.alternative_used_ms !== null,
    alternative_used_ms: state.alternative_used_ms,
    // Contextual.
    pre_knowledge_attempts: state.pre_knowledge_attempts,
    evidence_views: state.evidence_views,
    evidence_sources: [...state.evidence_sources],
    first_evidence_ms: state.first_evidence_ms,
    first_success_ms: state.first_success_ms,
    first_success_channel: state.first_success_channel,
    successes_on_a_before_disconnect: state.successes_on_a_before_disconnect,
    reports_delivered: { ...state.delivered },
    all_reports_delivered: m26AllDelivered(state),
    transmissions: state.transmissions.map((entry) => ({ ...entry })),
    b_transmissions_after_disconnect: state.b_transmissions_after_disconnect,
    departures: state.departures,
    stop_choice: state.stop_choice,
  };
}
