/**
 * M14 — the series model of the two-packet incident desk (Station 080
 * M01–M26 run, Unit 17; administration `m14-integration-v1`). PURE (no
 * Phaser, no runtime import): the window adapter (`m14IncidentDesk.ts`)
 * owns the register window and injects the log sink and the clock; the
 * surface model (`m14SurfaceModel.ts`) only renders this state and calls
 * the adapter with its input mode.
 *
 * Under research-owner decision D-U17-1 (7 October 2026): the orientation
 * card, then packet 1 and packet 2 in fixed order, each decision one at
 * a time (the next only after the current first response); nine source
 * tiles per packet, opened on demand, staying open until closed, any
 * number at once — openings are exposure records, never a response and
 * never proof of reading; drafts that are never answers; ONE immutable
 * first response per decision — a confirmed option or a confirmed CANNOT
 * SOLVE (incorrect) — answered only by the identical neutral
 * acknowledgement; no correctness information of any kind before the
 * sixth first response; then the results, read-only. Leaving keeps
 * everything; there is no STOP TASK control; the review closure keeps
 * the answers as they stand.
 *
 * Only a FRESH confirming press commits (M02 §5.210 / M13 §5.262
 * precedent): a press inside the settle window is refused and recorded;
 * a held key never reaches this model (the surface drops repeats).
 *
 * Nothing here scores: the first responses are raw events, and the
 * feature is recounted read-only by `features/m14.ts`.
 */
import {
  M14_ASSIGNED_PACKET_ORDER,
  M14_DECISIONS_PLANNED,
  M14_FAMILY,
  M14_PACKET_WINDOW_IDS,
  M14_PACKETS,
  M14_PACKETS_PLANNED,
  M14_SETTLE_MS,
  M14_TEXT,
  type M14Decision,
  type M14Packet,
  m14Packet,
  type M14PacketId,
} from './m14PacketContent';

export type M14InputMode = 'pointer' | 'keyboard' | 'system';
export type M14Phase = 'orientation' | 'measurement' | 'feedback' | 'closure';
export type M14ResponseKind = 'option' | 'cannot_solve';
export type M14NextControl = 'next_decision' | 'next_packet' | 'show_results';
export type M14LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => void;

export type M14Status =
  | 'unopened'
  | 'orientation'
  | 'first_responses'
  | 'completed'
  | 'closed_at_review'
  | 'held_back'
  | 'technical_failure';

export type M14View =
  | 'orientation'
  | 'decision'
  | 'acknowledgement'
  | 'results'
  | 'record';

/** Every suffix the family may log (contract §9; names fixed). */
export const M14_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'orientation_acknowledged',
  'series_reopened',
  'panel_left',
  'packet_presented',
  'decision_presented',
  'source_opened',
  'source_closed',
  'option_drafted',
  'commit_requested',
  'commit_cancelled',
  'commit_press_refused',
  'commit_without_draft',
  'first_response',
  'response_acknowledged',
  'packet_completed',
  'first_responses_completed',
  'results_shown',
  'help_consulted',
  'series_closed_at_review',
  'technical_failure',
  'window_closed',
] as const;

export const M14_RELOAD_DETAIL = 'reload after administration: desk not re-run';
export const M14_ACK_LINE_ID = 'answer_recorded';

export interface M14FirstResponse {
  response_kind: M14ResponseKind;
  option_id: string | null;
  correct: boolean;
  key_option_id: string;
  /** Source ids opened at least once in this packet before the confirmation. */
  sources_opened_before: string[];
  establishing_source_sets: string[][];
  /** Per establishing set: how many of its sources were opened before. */
  establishing_sets_opened_before: number[];
  sources_open_at_commit: string[];
  drafts_before: number;
  help_consults_before: number;
  active_ms: number;
  focused_ms: number | null;
  input_mode: M14InputMode;
  refused_presses: number;
}

export interface M14DecisionState {
  id: string;
  index: number;
  global_index: number;
  presented: boolean;
  draft: string | null;
  drafts: number;
  help_consults: number;
  active_ms: number;
  first_response: M14FirstResponse | null;
}

export interface M14PacketState {
  id: M14PacketId;
  index: number;
  presented: boolean;
  /** Source ids currently open, in opening order. */
  open: string[];
  /** Opening count per source id. */
  open_counts: Record<string, number>;
  /** Source ids opened at least once, in first-opening order. */
  opened_ever: string[];
  decisions: M14DecisionState[];
  results_shown: boolean;
}

export interface M14PendingCommit {
  kind: M14ResponseKind;
  option_id: string | null;
  opened_at_ms: number;
  refused_presses: number;
  refusal_recorded: boolean;
}

export interface M14Series {
  status: M14Status;
  view: M14View;
  open_count: number;
  panel_open: boolean;
  orientation_acknowledged: boolean;
  /** Index of the current packet (0–1) and decision (0–2). */
  packet: number;
  decision: number;
  packets: M14PacketState[];
  pending_commit: M14PendingCommit | null;
  acknowledgement: {
    opened_at_ms: number;
    next_control: M14NextControl;
  } | null;
  help_open: boolean;
  help_consults: Record<M14Phase, number>;
  /** The packet shown in the results view (0–1). */
  results_packet: number;
  /** When the results view last changed (NEXT / BACK settle against it). */
  results_shown_at_ms: number | null;
  closure_reason: 'completed' | 'closed_at_review' | 'technical_failure' | null;
  failure_detail: string | null;
  last_tick_ms: number | null;
  /** When the panel last opened (START PACKET 1 settles against it). */
  opened_at_ms: number | null;
}

export function createM14Series(): M14Series {
  return {
    status: 'unopened',
    view: 'orientation',
    open_count: 0,
    panel_open: false,
    orientation_acknowledged: false,
    packet: 0,
    decision: 0,
    packets: M14_PACKETS.map((packet) => ({
      id: packet.id,
      index: packet.index,
      presented: false,
      open: [],
      open_counts: {},
      opened_ever: [],
      decisions: packet.decisions.map((entry) => ({
        id: entry.id,
        index: entry.index,
        global_index: entry.global_index,
        presented: false,
        draft: null,
        drafts: 0,
        help_consults: 0,
        active_ms: 0,
        first_response: null,
      })),
      results_shown: false,
    })),
    pending_commit: null,
    acknowledgement: null,
    help_open: false,
    help_consults: { orientation: 0, measurement: 0, feedback: 0, closure: 0 },
    results_packet: 0,
    results_shown_at_ms: null,
    closure_reason: null,
    failure_detail: null,
    last_tick_ms: null,
    opened_at_ms: null,
  };
}

/* ------------------------------------------------------------------ *
 * Reload guard and entry snapshot
 * ------------------------------------------------------------------ */

/** True when an earlier page load of this identity already opened the desk. */
export function m14PriorAdministration(
  priorLoadEvents: readonly { event_type: string }[],
): boolean {
  return priorLoadEvents.some(
    (event) => event.event_type === `${M14_FAMILY}opportunity_opened`,
  );
}

/** The entry-state snapshot written with `opportunity_opened` (contract §9). */
export function m14EntrySnapshot(stage: string | null) {
  return {
    packets_planned: M14_PACKETS_PLANNED,
    decisions_planned: M14_DECISIONS_PLANNED,
    assigned_packet_order: [...M14_ASSIGNED_PACKET_ORDER],
    packets: M14_PACKETS.map((packet) => ({
      packet_id: packet.id,
      packet_window_id: M14_PACKET_WINDOW_IDS[packet.id],
      content_version: packet.content_version,
      source_ids: packet.sources.map((source) => source.id),
      decision_ids: packet.decisions.map((entry) => entry.id),
      decisions: packet.decisions.map((entry) => ({
        decision_id: entry.id,
        option_ids: entry.options.map((option) => option.id),
        key_option_id: entry.key_option_id,
      })),
    })),
    commit: 'explicit_confirmation',
    cannot_solve_available: true,
    feedback: 'after_all_first_responses',
    source_presentation: 'on_demand_stay_open',
    stop_control: false,
    settle_ms: M14_SETTLE_MS,
    stage,
  };
}

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

export function m14Live(s: M14Series): boolean {
  return (
    s.status === 'orientation' ||
    s.status === 'first_responses' ||
    s.status === 'completed'
  );
}

export function m14Phase(s: M14Series): M14Phase {
  switch (s.status) {
    case 'orientation':
      return 'orientation';
    case 'first_responses':
      return 'measurement';
    case 'completed':
      return 'feedback';
    default:
      return 'closure';
  }
}

export function m14CurrentPacket(s: M14Series): M14Packet {
  return m14Packet(M14_ASSIGNED_PACKET_ORDER[s.packet]);
}

export function m14CurrentPacketState(s: M14Series): M14PacketState {
  return s.packets[s.packet];
}

export function m14CurrentDecision(s: M14Series): M14Decision {
  return m14CurrentPacket(s).decisions[s.decision];
}

export function m14CurrentDecisionState(s: M14Series): M14DecisionState {
  return s.packets[s.packet].decisions[s.decision];
}

export function m14AnsweredCount(s: M14Series): number {
  return s.packets.reduce(
    (count, packet) =>
      count +
      packet.decisions.filter((entry) => entry.first_response !== null).length,
    0,
  );
}

/** The record line of a closed desk (null while the desk is live). */
export function m14RecordLine(s: M14Series): string | null {
  switch (s.status) {
    case 'closed_at_review':
      return M14_TEXT.closed_at_review;
    case 'held_back':
      return M14_TEXT.held_back;
    case 'technical_failure':
      return M14_TEXT.fault;
    default:
      return null;
  }
}

/** The per-decision record written on every closure event. */
export function m14ClosureSnapshot(s: M14Series) {
  const decisions = s.packets.flatMap((packet) =>
    packet.decisions.map((entry) => ({
      decision_id: entry.id,
      packet_id: packet.id,
      presented: entry.presented,
      answered: entry.first_response !== null,
      response_kind: entry.first_response?.response_kind ?? null,
      option_id: entry.first_response?.option_id ?? null,
      correct: entry.first_response?.correct ?? null,
    })),
  );
  const byPacket = Object.fromEntries(
    s.packets.map((packet) => [
      packet.id,
      {
        presented: packet.presented,
        answered: packet.decisions.filter((entry) => entry.first_response)
          .length,
        correct: packet.decisions.filter(
          (entry) => entry.first_response?.correct === true,
        ).length,
      },
    ]),
  );

  return {
    decisions_planned: M14_DECISIONS_PLANNED,
    decisions_presented: decisions.filter((entry) => entry.presented).length,
    decisions_answered: decisions.filter((entry) => entry.answered).length,
    correct_first_decisions: decisions.filter((entry) => entry.correct === true)
      .length,
    cannot_solve_count: decisions.filter(
      (entry) => entry.response_kind === 'cannot_solve',
    ).length,
    by_packet: byPacket,
    decisions,
  };
}

/* ------------------------------------------------------------------ *
 * Internals
 * ------------------------------------------------------------------ */

function fields(
  s: M14Series,
  scope: 'series' | 'packet' | 'decision',
): Record<string, unknown> {
  const base: Record<string, unknown> = { phase: m14Phase(s) };

  if (scope === 'series') {
    return base;
  }

  const packet = m14CurrentPacket(s);

  Object.assign(base, {
    packet_id: packet.id,
    packet_index: packet.index,
    packet_window_id: M14_PACKET_WINDOW_IDS[packet.id],
    content_version: packet.content_version,
  });

  if (scope === 'decision') {
    const entry = m14CurrentDecision(s);

    Object.assign(base, {
      decision_id: entry.id,
      decision_index: entry.index,
      decision_global_index: entry.global_index,
    });
  }

  return base;
}

/** Active time: accrues to the current decision while its view is open. */
function tick(s: M14Series, nowMs: number) {
  if (s.last_tick_ms !== null && s.panel_open) {
    const elapsed = Math.max(0, nowMs - s.last_tick_ms);

    if (s.status === 'first_responses' && s.view === 'decision') {
      m14CurrentDecisionState(s).active_ms += elapsed;
    }
  }

  s.last_tick_ms = nowMs;
}

function presentPacket(s: M14Series, sink: M14LogSink) {
  const packet = m14CurrentPacket(s);
  const state = m14CurrentPacketState(s);

  state.presented = true;
  sink('packet_presented', {
    ...fields(s, 'packet'),
    assigned_position: packet.index,
    realised_position: s.packets.filter((candidate) => candidate.presented)
      .length,
    sources_available: packet.sources.map((source) => source.id),
    decision_ids: packet.decisions.map((entry) => entry.id),
    input_mode: 'system',
  });
}

function presentDecision(s: M14Series, sink: M14LogSink) {
  const entry = m14CurrentDecision(s);
  const state = m14CurrentDecisionState(s);

  state.presented = true;
  s.view = 'decision';
  sink('decision_presented', {
    ...fields(s, 'decision'),
    assigned_position: entry.global_index,
    realised_position: s.packets.reduce(
      (count, packet) =>
        count +
        packet.decisions.filter((candidate) => candidate.presented).length,
      0,
    ),
    option_ids: entry.options.map((option) => option.id),
    input_mode: 'system',
  });
}

function cancelPending(
  s: M14Series,
  reason: 'keep_working' | 'panel_left',
  mode: M14InputMode,
  sink: M14LogSink,
) {
  const pending = s.pending_commit;

  if (pending === null) {
    return;
  }

  s.pending_commit = null;
  sink('commit_cancelled', {
    ...fields(s, 'decision'),
    kind: pending.kind,
    option_id: pending.option_id,
    reason,
    refused_presses: pending.refused_presses,
    input_mode: mode,
  });
}

/* ------------------------------------------------------------------ *
 * Opening, leaving, orientation
 * ------------------------------------------------------------------ */

export type M14OpenOutcome = 'opened' | 'reopened' | 'record';

/**
 * The desk overlay opened. The FIRST opening starts the orientation (the
 * adapter has already written the kit's `opportunity_opened`); a later
 * opening resumes the view as it stood; a closed desk shows its record.
 */
export function m14sOpen(
  s: M14Series,
  nowMs: number,
  sink: M14LogSink,
): M14OpenOutcome {
  s.open_count += 1;
  s.panel_open = true;
  s.last_tick_ms = nowMs;
  s.opened_at_ms = nowMs;

  if (s.status === 'unopened') {
    s.status = 'orientation';
    s.view = 'orientation';

    return 'opened';
  }

  if (!m14Live(s)) {
    s.view = 'record';

    return 'record';
  }

  if (s.status === 'completed') {
    s.view = s.packets.some((packet) => packet.results_shown)
      ? 'results'
      : 'acknowledgement';
  }

  // A reopened acknowledgement settles again: its control accepts a press
  // only 400 ms after it reappeared (a carried press never continues).
  if (s.view === 'acknowledgement' && s.acknowledgement !== null) {
    s.acknowledgement.opened_at_ms = nowMs;
  }

  sink('series_reopened', {
    ...fields(s, s.status === 'orientation' ? 'series' : 'decision'),
    view: s.view,
    input_mode: 'system',
  });

  return 'reopened';
}

/** The desk overlay closed (ESC, LEAVE DESK, FINISH, the room). */
export function m14sLeave(s: M14Series, nowMs: number, sink: M14LogSink) {
  if (!s.panel_open) {
    return;
  }

  tick(s, nowMs);

  if (s.pending_commit !== null) {
    cancelPending(s, 'panel_left', 'system', sink);
  }

  s.help_open = false;
  s.panel_open = false;

  if (m14Live(s)) {
    sink('panel_left', {
      ...fields(s, s.status === 'orientation' ? 'series' : 'decision'),
      view: s.view,
      input_mode: 'system',
    });
  }
}

/** START PACKET 1: the orientation acknowledged; packet 1 and decision 1 presented. */
export function m14sStart(
  s: M14Series,
  mode: M14InputMode,
  nowMs: number,
  sink: M14LogSink,
): boolean {
  if (s.status !== 'orientation' || s.help_open) {
    return false;
  }

  // START settles against the opening: a press carried from the station
  // prompt into the card never starts the packet.
  if (s.opened_at_ms !== null && nowMs - s.opened_at_ms < M14_SETTLE_MS) {
    return false;
  }

  tick(s, nowMs);
  s.orientation_acknowledged = true;
  sink('orientation_acknowledged', {
    ...fields(s, 'series'),
    input_mode: mode,
  });
  s.status = 'first_responses';
  s.packet = 0;
  s.decision = 0;
  presentPacket(s, sink);
  presentDecision(s, sink);
  s.last_tick_ms = nowMs;

  return true;
}

/* ------------------------------------------------------------------ *
 * Sources and drafts (exposure records, never a response)
 * ------------------------------------------------------------------ */

/** Opens a closed tile or closes an open one. */
export function m14sToggleSource(
  s: M14Series,
  sourceId: string,
  mode: M14InputMode,
  nowMs: number,
  sink: M14LogSink,
): 'opened' | 'closed' | 'none' {
  if (
    s.status !== 'first_responses' ||
    s.pending_commit !== null ||
    s.help_open ||
    (s.view !== 'decision' && s.view !== 'acknowledgement')
  ) {
    return 'none';
  }

  const packet = m14CurrentPacket(s);
  const source = packet.sources.find((candidate) => candidate.id === sourceId);

  if (source === undefined) {
    return 'none';
  }

  tick(s, nowMs);

  const state = m14CurrentPacketState(s);
  const position = state.open.indexOf(sourceId);
  const opening = position < 0;

  if (opening) {
    state.open.push(sourceId);
    state.open_counts[sourceId] = (state.open_counts[sourceId] ?? 0) + 1;

    if (!state.opened_ever.includes(sourceId)) {
      state.opened_ever.push(sourceId);
    }
  } else {
    state.open.splice(position, 1);
  }

  sink(opening ? 'source_opened' : 'source_closed', {
    ...fields(s, 'decision'),
    source_id: sourceId,
    source_kind: source.kind,
    open_count: state.open_counts[sourceId] ?? 0,
    sources_open: [...state.open],
    // The view the act was made in: a tile opened in the acknowledgement
    // view carries the decision just answered and counts toward the next.
    view: s.view,
    input_mode: mode,
  });

  return opening ? 'opened' : 'closed';
}

/** Makes an option the draft, replaces the draft, or clears it (activated again). */
export function m14sDraft(
  s: M14Series,
  optionId: string,
  mode: M14InputMode,
  nowMs: number,
  sink: M14LogSink,
): boolean {
  if (
    s.status !== 'first_responses' ||
    s.view !== 'decision' ||
    s.pending_commit !== null ||
    s.help_open
  ) {
    return false;
  }

  const entry = m14CurrentDecision(s);
  const state = m14CurrentDecisionState(s);

  if (
    state.first_response !== null ||
    !entry.options.some((option) => option.id === optionId)
  ) {
    return false;
  }

  tick(s, nowMs);

  const previous = state.draft;

  state.draft = previous === optionId ? null : optionId;
  state.drafts += 1;
  sink('option_drafted', {
    ...fields(s, 'decision'),
    option_id: state.draft,
    previous_option_id: previous,
    input_mode: mode,
  });

  return true;
}

/* ------------------------------------------------------------------ *
 * Commitment
 * ------------------------------------------------------------------ */

export type M14RequestOutcome = 'opened' | 'no_draft' | 'none';

/** RECORD ANSWER or CANNOT SOLVE pressed: opens the confirmation. */
export function m14sRequestCommit(
  s: M14Series,
  kind: M14ResponseKind,
  mode: M14InputMode,
  nowMs: number,
  sink: M14LogSink,
): M14RequestOutcome {
  if (
    s.status !== 'first_responses' ||
    s.view !== 'decision' ||
    s.pending_commit !== null ||
    s.help_open
  ) {
    return 'none';
  }

  const state = m14CurrentDecisionState(s);

  if (state.first_response !== null) {
    return 'none';
  }

  tick(s, nowMs);

  if (kind === 'option' && state.draft === null) {
    sink('commit_without_draft', {
      ...fields(s, 'decision'),
      input_mode: mode,
    });

    return 'no_draft';
  }

  s.pending_commit = {
    kind,
    option_id: kind === 'option' ? state.draft : null,
    opened_at_ms: nowMs,
    refused_presses: 0,
    refusal_recorded: false,
  };
  sink('commit_requested', {
    ...fields(s, 'decision'),
    kind,
    option_id: s.pending_commit.option_id,
    input_mode: mode,
  });

  return 'opened';
}

/** KEEP WORKING / ESC: the decision stays open without a response. */
export function m14sCancelCommit(
  s: M14Series,
  mode: M14InputMode,
  nowMs: number,
  sink: M14LogSink,
): boolean {
  if (s.pending_commit === null) {
    return false;
  }

  tick(s, nowMs);
  cancelPending(s, 'keep_working', mode, sink);

  return true;
}

export type M14ConfirmOutcome = 'recorded' | 'refused' | 'none';

/**
 * RECORD ANSWER / RECORD pressed in the dialog. Only a fresh press
 * commits: a press inside the settle window is refused and recorded once
 * per dialog (the count carried on the next record). The first response
 * is written once; a repeated confirmation finds no dialog and writes
 * nothing.
 */
export function m14sConfirmCommit(
  s: M14Series,
  mode: M14InputMode,
  nowMs: number,
  sink: M14LogSink,
  extra: { focused_ms?: number | null } = {},
): M14ConfirmOutcome {
  const pending = s.pending_commit;

  if (pending === null || s.status !== 'first_responses') {
    return 'none';
  }

  const entry = m14CurrentDecision(s);
  const state = m14CurrentDecisionState(s);

  if (state.first_response !== null) {
    s.pending_commit = null;

    return 'none';
  }

  const sinceOpened = nowMs - pending.opened_at_ms;

  if (sinceOpened < M14_SETTLE_MS) {
    pending.refused_presses += 1;

    if (!pending.refusal_recorded) {
      pending.refusal_recorded = true;
      sink('commit_press_refused', {
        ...fields(s, 'decision'),
        kind: pending.kind,
        reason: 'dialog_settling',
        since_opened_ms: sinceOpened,
        settle_ms: M14_SETTLE_MS,
        input_mode: mode,
      });
    }

    return 'refused';
  }

  tick(s, nowMs);

  const packetState = m14CurrentPacketState(s);
  const sets = entry.establishing_sets.map((set) => [...set]);
  const response: M14FirstResponse = {
    response_kind: pending.kind,
    option_id: pending.option_id,
    // CANNOT SOLVE is an incorrect first response whatever the draft.
    correct:
      pending.kind === 'option' && pending.option_id === entry.key_option_id,
    key_option_id: entry.key_option_id,
    sources_opened_before: [...packetState.opened_ever],
    establishing_source_sets: sets,
    establishing_sets_opened_before: sets.map(
      (set) => set.filter((id) => packetState.opened_ever.includes(id)).length,
    ),
    sources_open_at_commit: [...packetState.open],
    drafts_before: state.drafts,
    help_consults_before: state.help_consults,
    active_ms: state.active_ms,
    focused_ms:
      typeof extra.focused_ms === 'number'
        ? Math.round(extra.focused_ms)
        : null,
    input_mode: mode,
    refused_presses: pending.refused_presses,
  };

  state.first_response = response;
  s.pending_commit = null;
  sink('first_response', {
    ...fields(s, 'decision'),
    ...response,
    draft_at_commit: state.draft,
  });

  const answered = m14AnsweredCount(s);
  const packetDone = packetState.decisions.every(
    (candidate) => candidate.first_response !== null,
  );
  const complete = answered === M14_DECISIONS_PLANNED;
  const nextControl: M14NextControl = complete
    ? 'show_results'
    : packetDone
      ? 'next_packet'
      : 'next_decision';

  s.view = 'acknowledgement';
  s.acknowledgement = { opened_at_ms: nowMs, next_control: nextControl };
  sink('response_acknowledged', {
    ...fields(s, 'decision'),
    line_id: M14_ACK_LINE_ID,
    next_control: nextControl,
    answered_count: answered,
    input_mode: 'system',
  });

  if (packetDone) {
    sink('packet_completed', {
      ...fields(s, 'packet'),
      decisions: packetState.decisions.map((candidate) => ({
        decision_id: candidate.id,
        response_kind: candidate.first_response?.response_kind ?? null,
        option_id: candidate.first_response?.option_id ?? null,
        correct: candidate.first_response?.correct ?? null,
      })),
      input_mode: 'system',
    });
  }

  if (complete) {
    s.status = 'completed';
    s.closure_reason = 'completed';
    // The scored phase closes here; the adapter completes the kit window
    // right after this event, so `window_closed` follows it.
    sink('first_responses_completed', {
      ...fields(s, 'series'),
      phase: 'measurement',
      closure_reason: 'completed',
      ...m14ClosureSnapshot(s),
      input_mode: 'system',
    });
  }

  return 'recorded';
}

export type M14NextOutcome =
  | 'decision_presented'
  | 'packet_presented'
  | 'results_shown'
  | 'refused'
  | 'none';

/** NEXT DECISION / NEXT PACKET / SHOW RESULTS after an acknowledgement. */
export function m14sNext(
  s: M14Series,
  mode: M14InputMode,
  nowMs: number,
  sink: M14LogSink,
): M14NextOutcome {
  const ack = s.acknowledgement;

  if (ack === null || s.view !== 'acknowledgement' || s.help_open) {
    return 'none';
  }

  // The control accepts a press only after it has settled (D-3); an
  // earlier press is ignored and not recorded (no suffix exists for it).
  if (nowMs - ack.opened_at_ms < M14_SETTLE_MS) {
    return 'refused';
  }

  tick(s, nowMs);
  s.acknowledgement = null;

  if (s.status === 'completed') {
    s.view = 'results';
    s.results_packet = 0;
    s.results_shown_at_ms = nowMs;
    showResults(s, mode, sink);

    return 'results_shown';
  }

  if (s.status !== 'first_responses') {
    return 'none';
  }

  if (ack.next_control === 'next_packet') {
    s.packet += 1;
    s.decision = 0;
    presentPacket(s, sink);
    presentDecision(s, sink);
    s.last_tick_ms = nowMs;

    return 'packet_presented';
  }

  s.decision += 1;
  presentDecision(s, sink);
  s.last_tick_ms = nowMs;

  return 'decision_presented';
}

/* ------------------------------------------------------------------ *
 * Results (only after the sixth first response)
 * ------------------------------------------------------------------ */

function showResults(s: M14Series, mode: M14InputMode, sink: M14LogSink) {
  const packet = M14_PACKETS[s.results_packet];
  const state = s.packets[s.results_packet];

  if (state.results_shown) {
    return;
  }

  state.results_shown = true;
  sink('results_shown', {
    phase: 'feedback',
    packet_id: packet.id,
    packet_index: packet.index,
    packet_window_id: M14_PACKET_WINDOW_IDS[packet.id],
    content_version: packet.content_version,
    line_ids: packet.decisions.map((entry) => `${entry.id}_result`),
    input_mode: mode,
  });
}

/** NEXT / BACK between the two results views. */
export function m14sResultsNavigate(
  s: M14Series,
  direction: 'next' | 'back',
  mode: M14InputMode,
  nowMs: number,
  sink: M14LogSink,
): boolean {
  if (s.status !== 'completed' || s.view !== 'results' || s.help_open) {
    return false;
  }

  const target = direction === 'next' ? 1 : 0;

  if (target === s.results_packet) {
    return false;
  }

  // NEXT and BACK share one place: a press inside 400 ms of the last
  // change of view is a doubled press and changes nothing.
  if (
    s.results_shown_at_ms !== null &&
    nowMs - s.results_shown_at_ms < M14_SETTLE_MS
  ) {
    return false;
  }

  tick(s, nowMs);
  s.results_packet = target;
  s.results_shown_at_ms = nowMs;
  showResults(s, mode, sink);

  return true;
}

/* ------------------------------------------------------------------ *
 * Help
 * ------------------------------------------------------------------ */

/** HELP: informational; never while a confirmation dialog is open. */
export function m14sHelp(
  s: M14Series,
  mode: M14InputMode,
  nowMs: number,
  sink: M14LogSink,
): boolean {
  if (!m14Live(s) || s.pending_commit !== null || s.help_open) {
    return false;
  }

  tick(s, nowMs);
  s.help_open = true;

  const phase = m14Phase(s);

  s.help_consults[phase] += 1;

  if (s.status === 'first_responses') {
    m14CurrentDecisionState(s).help_consults += 1;
  }

  sink('help_consulted', {
    ...fields(s, s.status === 'orientation' ? 'series' : 'decision'),
    view: s.view,
    input_mode: mode,
  });

  return true;
}

export function m14sCloseHelp(s: M14Series, nowMs: number): boolean {
  if (!s.help_open) {
    return false;
  }

  s.help_open = false;
  // The view the help returns to settles again: START PACKET 1 and the
  // acknowledgement's control refuse a press inside 400 ms, so a doubled
  // CLOSE HELP press never starts the packet or continues the series.
  s.opened_at_ms = nowMs;

  if (s.acknowledgement !== null) {
    s.acknowledgement.opened_at_ms = nowMs;
  }

  return true;
}

/* ------------------------------------------------------------------ *
 * Closures
 * ------------------------------------------------------------------ */

/**
 * The station-record closure at the Utility Deck review: a series still
 * in its orientation or first-response phase closes with the answers as
 * they stand. A completed series is not reclosed.
 */
export function m14sCloseAtReview(
  s: M14Series,
  nowMs: number,
  sink: M14LogSink,
): boolean {
  if (s.status !== 'orientation' && s.status !== 'first_responses') {
    return false;
  }

  tick(s, nowMs);
  s.pending_commit = null;
  s.help_open = false;
  s.acknowledgement = null;
  s.status = 'closed_at_review';
  s.closure_reason = 'closed_at_review';
  s.view = 'record';
  sink('series_closed_at_review', {
    phase: 'closure',
    closure_reason: 'closed_at_review',
    ...m14ClosureSnapshot(s),
    input_mode: 'system',
  });

  return true;
}

export type M14FailOutcome = 'scored_phase' | 'feedback' | 'none';

/**
 * A fault. In the orientation or the first-response phase it closes the
 * series (the adapter records the kit's technical failure); after
 * completion it is recorded without touching the scored evidence.
 */
export function m14sFail(s: M14Series, detail: string): M14FailOutcome {
  if (s.status === 'orientation' || s.status === 'first_responses') {
    s.status = 'technical_failure';
    s.closure_reason = 'technical_failure';
    s.failure_detail = detail;
    s.pending_commit = null;
    s.help_open = false;
    s.acknowledgement = null;
    s.view = 'record';

    return 'scored_phase';
  }

  if (s.status === 'completed') {
    s.failure_detail = detail;
    s.view = 'record';

    return 'feedback';
  }

  return 'none';
}

/** The reload hold-back: the desk is never re-run in this page load. */
export function m14sHoldBack(s: M14Series) {
  if (s.status !== 'unopened') {
    return false;
  }

  s.status = 'held_back';
  s.failure_detail = M14_RELOAD_DETAIL;
  s.view = 'record';

  return true;
}
