/**
 * M22 — two short reports with genuine newly revealed requirements, and
 * one discouragement rating per report (Station 080 Unit 11). PURE model
 * (no Phaser, no runtime imports; Node-testable).
 *
 * Register M22 row (MPS Appendix A 4, PDD, hybrid coverage): two reports
 * after the other PDD tasks; on each, a valid first submission is RETURNED
 * with one standardised, newly revealed criterion (visibly changed
 * evidence: a register / chart that only now opens beside the report);
 * the participant acknowledges the note, then revises (a
 * feedback-consistent edit — a code attached) or exits (WITHDRAW); after
 * BOTH decisions, one five-option discouragement rating per returned
 * report with the recall delay recorded. Primary `m22_revisions_begun` =
 * reports with a revision begun / requirements presented (two planned);
 * companion `m22_discouragement_ratings` = the two ratings (a declined or
 * missing rating is null, never a midpoint).
 *
 * Mechanic (shift report desk, work surface): report 1 = the handover
 * report (six shift lines, four ordered slots, at least three; the
 * requirement: every line carries its work-order tag from the register);
 * report 2 = the outbound consignment note (five outbound items, four
 * slots, at least three; the requirement: every line carries its
 * destination bay from the bay chart). Feedback names how many lines still
 * lack a matching code (actionable, never which code). Unchanged
 * resubmissions return the same note (deterministic; no loop, no endurance
 * test); leaving is always possible. Forms differ only in tray order.
 *
 * Distinguished raw facts per report: initial action, requirement
 * presentation, comprehension (acknowledgement), inspection, strategy
 * change, repeated unchanged action, useful revision, progress, recovery,
 * exit, technical failure; per rating: value, decline, recall delay.
 * Nothing here is a resilience, grit or persistence score.
 */

export type M22Report = 'o1' | 'o2';
export type M22Form = 'form_a' | 'form_b';

export const M22_REPORTS: readonly M22Report[] = ['o1', 'o2'];
export const M22_FAMILY = 'proto_m22_returned_';
export const M22_OPPORTUNITY_IDS: Record<M22Report, string> = {
  o1: 'proto_m22_returned_o1',
  o2: 'proto_m22_returned_o2',
};
export const M22_WINDOW_IDS: Record<M22Report, string> = {
  o1: 'm22_returned_o1',
  o2: 'm22_returned_o2',
};
export const M22_ENTRY_STATE_VERSION = 'm22-setbacks-v3';
export const M22_OBJECT_ID = 'm22_report_desk';
/** Settle window after the next report is placed (a carried press is refused). */
export const M22_PLACE_SETTLE_MS = 1500;
/**
 * A rating screen accepts no answer within this window of its presentation
 * (a keypress carried over from the previous screen or the report decision
 * is refused and logged, never recorded).
 */
export const M22_RATING_SETTLE_MS = 1000;

export const M22_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'report_placed',
  'line_placed',
  'line_removed',
  'submitted',
  'setback_presented',
  'setback_acknowledged',
  'register_inspected',
  'code_attached',
  'code_detached',
  'unchanged_resubmit',
  'resubmitted',
  'accepted',
  'withdrawn',
  'press_refused',
  'rating_presented',
  'rating_answered',
  'rating_declined',
  'rating_departed',
  'departed',
  'window_closed',
  'technical_failure',
] as const;

export interface M22Line {
  id: string;
  label: string;
  /** The code that matches this line in the register / chart. */
  code: string;
}

export interface M22ReportDef {
  report: M22Report;
  title: string;
  /** Short participant-facing name ("handover report"). */
  name: string;
  lines_title: string;
  lines: readonly M22Line[];
  slots: number;
  min_lines: number;
  /** Participant-facing name of a code ("work-order tag" / "destination bay"). */
  code_name: string;
  register_title: string;
  /** The standardised criterion (identical for every form). */
  criterion_text: string;
  returned_by: string;
}

export const M22_REPORT_DEFS: Record<M22Report, M22ReportDef> = {
  o1: {
    report: 'o1',
    title: 'SHIFT REPORT DESK — HANDOVER REPORT (REPORT 1 OF 2)',
    name: 'handover report',
    lines_title: 'REPORT LINES — shift systems',
    lines: [
      {
        id: 'l_coupling',
        label: 'Coolant coupling — valve serviced',
        code: 'WO-11',
      },
      { id: 'l_loop', label: 'Coolant loop — pressure log', code: 'WO-12' },
      {
        id: 'l_excavation',
        label: 'Excavation field — buried relay coupling',
        code: 'WO-13',
      },
      { id: 'l_metal', label: 'Metal yard — salvage tally', code: 'WO-14' },
      {
        id: 'l_uplink',
        label: 'Uplink posts — recovery reports',
        code: 'WO-15',
      },
      {
        id: 'l_records',
        label: 'Records Workshop — return shift',
        code: 'WO-16',
      },
    ],
    slots: 4,
    min_lines: 3,
    code_name: 'work-order tag',
    register_title: 'WORK-ORDER REGISTER',
    criterion_text:
      'RETURNED BY THE RECEIVING DESK — new requirement for this shift: every report line must carry its work-order tag (WO-nn) from the register. The register is now open beside the report. Attach the matching tag to each line, then resubmit.',
    returned_by: 'the receiving desk',
  },
  o2: {
    report: 'o2',
    title: 'SHIFT REPORT DESK — OUTBOUND CONSIGNMENT NOTE (REPORT 2 OF 2)',
    name: 'consignment note',
    lines_title: 'CONSIGNMENT LINES — outbound items',
    lines: [
      {
        id: 'c_relay',
        label: 'Relay unit — fitted, for return',
        code: 'BAY-A',
      },
      { id: 'c_coupling', label: 'Relay coupling — recovered', code: 'BAY-B' },
      { id: 'c_vials', label: 'Sample vials — sealed', code: 'BAY-C' },
      { id: 'c_tally', label: 'Salvage tally sheet', code: 'BAY-D' },
      {
        id: 'c_binder',
        label: 'Reference binder — back to stores',
        code: 'BAY-E',
      },
    ],
    slots: 4,
    min_lines: 3,
    code_name: 'destination bay',
    register_title: 'DESTINATION BAY CHART',
    criterion_text:
      'RETURNED BY THE OUTBOUND DESK — new requirement for this note: every line must carry its destination bay (BAY-x) from the bay chart. The chart is now open beside the note. Attach the matching bay to each line, then resubmit.',
    returned_by: 'the outbound desk',
  },
};

export function m22Def(report: M22Report): M22ReportDef {
  return M22_REPORT_DEFS[report];
}

export function m22Codes(def: M22ReportDef): readonly string[] {
  return def.lines.map((line) => line.code);
}

export type M22Phase = 'assemble' | 'returned' | 'accepted' | 'closed';

export type M22SubmitOutcome =
  | 'rejected_incomplete'
  | 'setback'
  | 'refused_unacknowledged'
  | 'unchanged'
  | 'returned_again'
  | 'accepted';

export interface M22Submission {
  at_ms: number;
  lines: (string | null)[];
  codes: Record<string, string | null>;
  outcome: M22SubmitOutcome;
  uncoded_lines: number;
}

export interface M22ReportState {
  report: M22Report;
  form: M22Form;
  entered: boolean;
  opened_at_ms: number | null;
  phase: M22Phase;
  slots: (string | null)[];
  codes: Record<string, string | null>;
  submissions: M22Submission[];
  initial_action_at_ms: number | null;
  setback_presented_at_ms: number | null;
  setback_acknowledged_at_ms: number | null;
  /** Register / chart opened after the setback. */
  inspections: number;
  submit_before_ack: number;
  /** Edits after the acknowledgement that address the criterion (codes). */
  feedback_consistent_edits: number;
  /** Consistent edits whose code does not match the line's register entry. */
  mismatched_code_edits: number;
  /** Edits after the acknowledgement that do not address the criterion. */
  other_edits: number;
  strategy_change_at_ms: number | null;
  unchanged_resubmits: number;
  resubmitted_at_ms: number | null;
  recovery_at_ms: number | null;
  departures: number;
  stop_choice: 'withdrawn' | 'closed_at_review' | null;
  technical_failure: string | null;
}

export interface M22Rating {
  value: 1 | 2 | 3 | 4 | 5 | null;
  declined: boolean;
  answered_at_ms: number;
  /** Rating time − requirement time (the recall delay). */
  recall_delay_ms: number | null;
  /** Rating time − this screen's presentation time. */
  since_presented_ms: number | null;
  /** 1-based order of this rating among the ratings answered or declined. */
  position: number;
}

export interface M22RatingsState {
  /** Each rating screen's presentation time (one screen per due report). */
  presented_at_ms: Record<M22Report, number | null>;
  ratings: Record<M22Report, M22Rating | null>;
}

export function createM22ReportState(
  report: M22Report,
  form: M22Form,
): M22ReportState {
  const def = m22Def(report);

  return {
    report,
    form,
    entered: false,
    opened_at_ms: null,
    phase: 'assemble',
    slots: new Array<string | null>(def.slots).fill(null),
    codes: Object.fromEntries(def.lines.map((line) => [line.id, null])),
    submissions: [],
    initial_action_at_ms: null,
    setback_presented_at_ms: null,
    setback_acknowledged_at_ms: null,
    inspections: 0,
    submit_before_ack: 0,
    feedback_consistent_edits: 0,
    mismatched_code_edits: 0,
    other_edits: 0,
    strategy_change_at_ms: null,
    unchanged_resubmits: 0,
    resubmitted_at_ms: null,
    recovery_at_ms: null,
    departures: 0,
    stop_choice: null,
    technical_failure: null,
  };
}

export function createM22RatingsState(): M22RatingsState {
  return {
    presented_at_ms: { o1: null, o2: null },
    ratings: { o1: null, o2: null },
  };
}

/** Tray order per form (content identical; order counterbalanced). */
export function m22TrayOrder(
  def: M22ReportDef,
  form: M22Form,
): readonly M22Line[] {
  return form === 'form_a' ? def.lines : [...def.lines].reverse();
}

export function m22Line(def: M22ReportDef, id: string): M22Line | undefined {
  return def.lines.find((line) => line.id === id);
}

export function m22Open(state: M22ReportState): boolean {
  return state.entered && state.phase !== 'closed';
}

/** A report is DECIDED once accepted or closed (withdrawn / review). */
export function m22Decided(state: M22ReportState): boolean {
  return state.phase === 'accepted' || state.phase === 'closed';
}

export function m22Enter(state: M22ReportState, nowMs: number): boolean {
  if (state.entered) {
    return false;
  }

  state.entered = true;
  state.opened_at_ms = nowMs;

  return true;
}

export function m22PlacedLines(state: M22ReportState): string[] {
  return state.slots.filter((slot): slot is string => slot !== null);
}

export function m22Acknowledged(state: M22ReportState): boolean {
  return state.setback_acknowledged_at_ms !== null;
}

function editable(state: M22ReportState): boolean {
  if (!m22Open(state) || state.phase === 'accepted') {
    return false;
  }

  // After the setback, editing requires the acknowledgement (comprehension).
  return state.phase === 'assemble' || m22Acknowledged(state);
}

function noteEdit(state: M22ReportState, consistent: boolean, nowMs: number) {
  if (state.phase !== 'returned') {
    return;
  }

  if (consistent) {
    state.feedback_consistent_edits += 1;

    if (state.strategy_change_at_ms === null) {
      state.strategy_change_at_ms = nowMs;
    }
  } else {
    state.other_edits += 1;
  }
}

/** Place a tray line into a slot (occupied slot / duplicate line refused). */
export function m22PlaceLine(
  state: M22ReportState,
  slot: number,
  lineId: string,
  nowMs: number,
): boolean {
  const def = m22Def(state.report);

  if (
    !editable(state) ||
    slot < 0 ||
    slot >= def.slots ||
    state.slots[slot] !== null ||
    m22Line(def, lineId) === undefined ||
    state.slots.includes(lineId)
  ) {
    return false;
  }

  state.slots[slot] = lineId;
  noteEdit(state, false, nowMs);

  return true;
}

/** Return a placed line to the tray (its code, if any, is cleared). */
export function m22RemoveLine(
  state: M22ReportState,
  slot: number,
  nowMs: number,
): boolean {
  if (!editable(state) || slot < 0 || slot >= state.slots.length) {
    return false;
  }

  const lineId = state.slots[slot];

  if (lineId === null) {
    return false;
  }

  state.slots[slot] = null;
  state.codes[lineId] = null;
  noteEdit(state, false, nowMs);

  return true;
}

/** Attach a register / chart code to a PLACED line (only after the setback). */
export function m22AttachCode(
  state: M22ReportState,
  lineId: string,
  code: string,
  nowMs: number,
): boolean {
  const def = m22Def(state.report);

  if (
    !editable(state) ||
    state.phase !== 'returned' ||
    !state.slots.includes(lineId) ||
    !m22Codes(def).includes(code) ||
    state.codes[lineId] === code
  ) {
    return false;
  }

  state.codes[lineId] = code;
  noteEdit(state, true, nowMs);

  if (m22Line(def, lineId)!.code !== code) {
    state.mismatched_code_edits += 1;
  }

  return true;
}

export function m22DetachCode(
  state: M22ReportState,
  lineId: string,
  nowMs: number,
): boolean {
  if (
    !editable(state) ||
    state.phase !== 'returned' ||
    state.codes[lineId] === null ||
    state.codes[lineId] === undefined
  ) {
    return false;
  }

  state.codes[lineId] = null;
  noteEdit(state, false, nowMs);

  return true;
}

export function m22UncodedLines(state: M22ReportState): number {
  const def = m22Def(state.report);

  return m22PlacedLines(state).filter(
    (lineId) => state.codes[lineId] !== m22Line(def, lineId)!.code,
  ).length;
}

/** Progress after the setback: lines carrying their matching code / lines placed. */
export function m22Progress(state: M22ReportState): {
  coded: number;
  placed: number;
} {
  const placed = m22PlacedLines(state);

  return {
    coded: placed.length - m22UncodedLines(state),
    placed: placed.length,
  };
}

function configurationKey(state: M22ReportState): string {
  return JSON.stringify({ slots: state.slots, codes: state.codes });
}

/** The register / chart was opened — inspection after the setback. */
export function m22InspectRegister(state: M22ReportState): boolean {
  if (!m22Open(state) || state.phase !== 'returned') {
    return false;
  }

  state.inspections += 1;

  return true;
}

/** The returned note was acknowledged (setback comprehension; once). */
export function m22Acknowledge(state: M22ReportState, nowMs: number): boolean {
  if (
    !m22Open(state) ||
    state.phase !== 'returned' ||
    state.setback_acknowledged_at_ms !== null
  ) {
    return false;
  }

  state.setback_acknowledged_at_ms = nowMs;

  return true;
}

/**
 * SUBMIT. First valid submission = the standardised setback; later
 * submissions are classified as unchanged / returned again / accepted.
 * A submission with fewer than the minimum lines is refused as incomplete
 * (validity precondition — never the setback).
 */
export function m22Submit(
  state: M22ReportState,
  nowMs: number,
): M22SubmitOutcome {
  const def = m22Def(state.report);

  if (!m22Open(state) || state.phase === 'accepted') {
    return 'rejected_incomplete';
  }

  const placed = m22PlacedLines(state);

  if (state.phase === 'assemble') {
    if (placed.length < def.min_lines) {
      return 'rejected_incomplete';
    }

    state.initial_action_at_ms = nowMs;
    state.phase = 'returned';
    state.setback_presented_at_ms = nowMs;
    state.submissions.push({
      at_ms: nowMs,
      lines: [...state.slots],
      codes: { ...state.codes },
      outcome: 'setback',
      uncoded_lines: placed.length,
    });

    return 'setback';
  }

  // phase === 'returned'
  if (!m22Acknowledged(state)) {
    state.submit_before_ack += 1;

    return 'refused_unacknowledged';
  }

  const previous = state.submissions[state.submissions.length - 1];
  const key = configurationKey(state);
  const previousKey = JSON.stringify({
    slots: previous.lines,
    codes: previous.codes,
  });
  const uncoded = m22UncodedLines(state);
  let outcome: M22SubmitOutcome;

  if (key === previousKey) {
    outcome = 'unchanged';
    state.unchanged_resubmits += 1;
  } else if (placed.length >= def.min_lines && uncoded === 0) {
    outcome = 'accepted';
    state.resubmitted_at_ms ??= nowMs;
    state.recovery_at_ms = nowMs;
    state.phase = 'accepted';
  } else {
    outcome = 'returned_again';
    state.resubmitted_at_ms ??= nowMs;
  }

  state.submissions.push({
    at_ms: nowMs,
    lines: [...state.slots],
    codes: { ...state.codes },
    outcome,
    uncoded_lines: uncoded,
  });

  return outcome;
}

/** Desk feedback for an outcome (actionable; names counts, never the code). */
export function m22OutcomeText(
  outcome: M22SubmitOutcome,
  state: M22ReportState,
): string {
  const def = m22Def(state.report);

  switch (outcome) {
    case 'rejected_incomplete':
      return `The ${def.name} needs at least ${def.min_lines} lines before it can be submitted.`;
    case 'setback':
      return def.criterion_text;
    case 'refused_unacknowledged':
      return `Read and acknowledge the returned note before editing the ${def.name}.`;
    case 'unchanged':
      return `Returned again — the ${def.name} is unchanged. Lines still without a matching ${def.code_name}: ${m22UncodedLines(state)}.`;
    case 'returned_again':
      return `Returned again — lines still without a matching ${def.code_name}: ${m22UncodedLines(state)}.`;
    case 'accepted':
      return `${def.name.charAt(0).toUpperCase()}${def.name.slice(1)} accepted by ${def.returned_by}. Logged for the shift.`;
  }
}

/** Surface left with the report open (window stays open). */
export function m22Depart(state: M22ReportState): boolean {
  if (!m22Open(state) || state.phase === 'accepted') {
    return false;
  }

  state.departures += 1;

  return true;
}

/**
 * Disposition when the observation closes without acceptance:
 * never submitted → censored (the requirement was never presented);
 * requirement presented but never acknowledged → invalid
 * (`setback_not_acknowledged`); acknowledged and stopped → a completed
 * observation only for the explicit WITHDRAW; the review censors.
 */
export function m22ClosureDisposition(
  state: M22ReportState,
  reason: 'withdrawn' | 'closed_at_review',
):
  | { kind: 'completed' }
  | { kind: 'missing' }
  | { kind: 'invalid'; detail: string } {
  if (state.phase === 'accepted') {
    return { kind: 'completed' };
  }

  if (state.setback_presented_at_ms === null) {
    return { kind: 'missing' };
  }

  if (!m22Acknowledged(state)) {
    return { kind: 'invalid', detail: 'setback_not_acknowledged' };
  }

  return reason === 'withdrawn' ? { kind: 'completed' } : { kind: 'missing' };
}

export function m22Close(
  state: M22ReportState,
  reason: 'accepted' | 'withdrawn' | 'closed_at_review',
): boolean {
  if (state.phase === 'closed') {
    return false;
  }

  // Acceptance is its own terminal phase (persisted as `accepted`); only
  // a withdrawal or the review closes the report as `closed`.
  if (reason !== 'accepted') {
    state.stop_choice = reason;
    state.phase = 'closed';
  }

  return true;
}

// ——— the discouragement ratings (after both decisions) ——————————————————

/** The reports whose rating is due: requirement presented, both reports decided, not yet rated. */
export function m22RatingsDue(
  reports: Record<M22Report, M22ReportState>,
  ratings: M22RatingsState,
): M22Report[] {
  if (!M22_REPORTS.every((report) => m22Decided(reports[report]))) {
    return [];
  }

  return M22_REPORTS.filter(
    (report) =>
      reports[report].setback_presented_at_ms !== null &&
      ratings.ratings[report] === null,
  );
}

/** All ratings that will ever be due have been answered or declined. */
export function m22RatingsComplete(
  reports: Record<M22Report, M22ReportState>,
  ratings: M22RatingsState,
): boolean {
  return (
    M22_REPORTS.every((report) => m22Decided(reports[report])) &&
    m22RatingsDue(reports, ratings).length === 0
  );
}

/** Mark the due rating screen as presented (once); false when that report is not the one due now or already presented. */
export function m22PresentRating(
  reports: Record<M22Report, M22ReportState>,
  ratings: M22RatingsState,
  report: M22Report,
  nowMs: number,
): boolean {
  // Only the screen that is due now (the first unrated returned report).
  if (
    m22RatingsDue(reports, ratings)[0] !== report ||
    ratings.presented_at_ms[report] !== null
  ) {
    return false;
  }

  ratings.presented_at_ms[report] = nowMs;

  return true;
}

/** The rating screen was presented less than the settle window ago (or not yet). */
export function m22RatingSettling(
  ratings: M22RatingsState,
  report: M22Report,
  nowMs: number,
): boolean {
  const presentedAt = ratings.presented_at_ms[report];

  return presentedAt === null || nowMs - presentedAt < M22_RATING_SETTLE_MS;
}

/**
 * Withdraw is offered while assembling (no requirement yet — outside the
 * denominator) and, after a return, only once the note is acknowledged: an
 * exit is only ever recorded against an acknowledged requirement.
 */
export function m22CanWithdraw(state: M22ReportState): boolean {
  return (
    state.phase === 'assemble' ||
    (state.phase === 'returned' && m22Acknowledged(state))
  );
}

/** Answer (1–5) or decline (null) the rating of a report whose rating is due. */
export function m22Rate(
  reports: Record<M22Report, M22ReportState>,
  ratings: M22RatingsState,
  report: M22Report,
  value: 1 | 2 | 3 | 4 | 5 | null,
  nowMs: number,
): boolean {
  if (!m22RatingsDue(reports, ratings).includes(report)) {
    return false;
  }

  const setbackAt = reports[report].setback_presented_at_ms;
  const presentedAt = ratings.presented_at_ms[report];

  ratings.ratings[report] = {
    value,
    declined: value === null,
    answered_at_ms: nowMs,
    recall_delay_ms: setbackAt === null ? null : Math.max(0, nowMs - setbackAt),
    since_presented_ms:
      presentedAt === null ? null : Math.max(0, nowMs - presentedAt),
    position:
      M22_REPORTS.filter((other) => ratings.ratings[other] !== null).length + 1,
  };

  return true;
}

/** Ledger raw components first; contextual facts after. Never a score. */
export function m22RawComponents(
  state: M22ReportState,
  rating: M22Rating | null = null,
) {
  const progress = m22Progress(state);

  return {
    report: state.report,
    requirement_presented: state.setback_presented_at_ms !== null,
    setback_presented: state.setback_presented_at_ms !== null,
    /** The feature's per-report numerator fact. */
    revision_begun: state.strategy_change_at_ms !== null,
    revision_started: state.strategy_change_at_ms !== null,
    feedback_consistent_edits: state.feedback_consistent_edits,
    resubmitted: state.resubmitted_at_ms !== null,
    recovery_complete: state.recovery_at_ms !== null,
    exited: state.stop_choice === 'withdrawn',
    form: state.form,
    initial_action_ms:
      state.initial_action_at_ms === null || state.opened_at_ms === null
        ? null
        : state.initial_action_at_ms - state.opened_at_ms,
    setback_comprehension: m22Acknowledged(state),
    setback_to_acknowledgement_ms:
      state.setback_presented_at_ms === null ||
      state.setback_acknowledged_at_ms === null
        ? null
        : state.setback_acknowledged_at_ms - state.setback_presented_at_ms,
    acknowledgement_to_first_consistent_edit_ms:
      state.setback_acknowledged_at_ms === null ||
      state.strategy_change_at_ms === null
        ? null
        : state.strategy_change_at_ms - state.setback_acknowledged_at_ms,
    inspections: state.inspections,
    submit_before_acknowledgement: state.submit_before_ack,
    repeated_unchanged_action: state.unchanged_resubmits,
    other_edits: state.other_edits,
    mismatched_code_edits: state.mismatched_code_edits,
    progress,
    submissions: state.submissions.length,
    lines_at_close: [...state.slots],
    codes_at_close: { ...state.codes },
    departures: state.departures,
    stop_choice: state.stop_choice,
    rating:
      rating === null
        ? null
        : {
            value: rating.value,
            declined: rating.declined,
            recall_delay_ms: rating.recall_delay_ms,
          },
  };
}
