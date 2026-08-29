/**
 * M22 — shift report with a standardised setback and revision
 * (evidence-led pilot v2, Unit 5). PURE model (no Phaser, no runtime
 * imports; Node-testable).
 *
 * Ledger (sheet 09): submit a reasonable report, receive a standardised
 * newly revealed criterion, then revise and resubmit using actionable
 * feedback. Raw components `setback_presented`, `revision_started`,
 * `feedback_consistent_edits`, `resubmitted`, `recovery_complete`.
 * Validity gate: initial response valid; feedback understood; recovery
 * attainable; no blame framing; same criterion by form.
 *
 * Mechanic (report desk, work surface): assemble the return-shift
 * handover report by placing at least three of six fixed subsystem lines
 * into four ordered slots (direct assembly, no cards), then SUBMIT. The
 * first valid submission is RETURNED by the receiving desk with one
 * standardised, newly revealed criterion — every line must carry its
 * work-order tag from a register that only now opens beside the report
 * (visibly changed evidence). The participant must ACKNOWLEDGE the
 * returned note (comprehension) before editing; recovery = attach the
 * matching tag to every placed line and resubmit. Feedback names how
 * many lines still lack a matching tag (actionable, never which tag).
 * Unchanged resubmissions return the same note (deterministic; no loop,
 * no endurance test); leaving is always possible; WITHDRAW is the neutral
 * explicit stop. Forms differ only in tray order.
 *
 * Distinguished raw facts: initial action, setback presentation, setback
 * comprehension, inspection, strategy change, repeated unchanged action,
 * useful revision, progress, recovery, exit, technical failure. Nothing
 * here is a resilience, grit or persistence score.
 */

export const M22_OPPORTUNITY_ID = 'proto_m22_report_revision';
export const M22_WINDOW_ID = 'm22_report_w1';
export const M22_ENTRY_STATE_VERSION = 'm22-report-revision-v1';
export const M22_FAMILY = 'proto_m22_report_';

export const M22_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'line_placed',
  'line_removed',
  'submitted',
  'setback_presented',
  'setback_acknowledged',
  'register_inspected',
  'tag_attached',
  'tag_detached',
  'unchanged_resubmit',
  'resubmitted',
  'accepted',
  'departed',
  'withdrawn',
  'window_closed',
  'technical_failure',
] as const;

export type M22Form = 'form_a' | 'form_b';

export interface M22Line {
  id: string;
  label: string;
  /** Work-order tag that matches this line (register). */
  tag: string;
}

/** Six fixed subsystem lines (the shift's systems; no outcome stated). */
export const M22_LINES: readonly M22Line[] = [
  {
    id: 'l_coupling',
    label: 'Coolant coupling — valve serviced',
    tag: 'WO-11',
  },
  { id: 'l_loop', label: 'Coolant loop — pressure log', tag: 'WO-12' },
  {
    id: 'l_excavation',
    label: 'Excavation field — buried relay coupling',
    tag: 'WO-13',
  },
  { id: 'l_metal', label: 'Metal yard — salvage tally', tag: 'WO-14' },
  { id: 'l_uplink', label: 'Uplink posts — recovery reports', tag: 'WO-15' },
  { id: 'l_records', label: 'Records Workshop — return shift', tag: 'WO-16' },
];

export const M22_TAGS: readonly string[] = M22_LINES.map((line) => line.tag);
export const M22_SLOTS = 4;
export const M22_MIN_LINES = 3;

/** Standardised criterion (identical for every form). */
export const M22_CRITERION_TEXT =
  'RETURNED BY THE RECEIVING DESK — new requirement for this shift: every report line must carry its work-order tag (WO-nn) from the register. The register is now open beside the report. Attach the matching tag to each line, then resubmit.';

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
  tags: Record<string, string | null>;
  outcome: M22SubmitOutcome;
  untagged_lines: number;
}

export interface M22State {
  form: M22Form;
  entered: boolean;
  opened_at_ms: number | null;
  phase: M22Phase;
  slots: (string | null)[];
  tags: Record<string, string | null>;
  submissions: M22Submission[];
  initial_action_at_ms: number | null;
  setback_presented_at_ms: number | null;
  setback_acknowledged_at_ms: number | null;
  /** Register opened / criterion re-read after the setback. */
  inspections: number;
  submit_before_ack: number;
  /** Edits after the acknowledgement that address the criterion (tags). */
  feedback_consistent_edits: number;
  /** Consistent edits whose tag does not match the line's register entry. */
  mismatched_tag_edits: number;
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

export function createM22State(form: M22Form): M22State {
  return {
    form,
    entered: false,
    opened_at_ms: null,
    phase: 'assemble',
    slots: new Array<string | null>(M22_SLOTS).fill(null),
    tags: Object.fromEntries(M22_LINES.map((line) => [line.id, null])),
    submissions: [],
    initial_action_at_ms: null,
    setback_presented_at_ms: null,
    setback_acknowledged_at_ms: null,
    inspections: 0,
    submit_before_ack: 0,
    feedback_consistent_edits: 0,
    mismatched_tag_edits: 0,
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

/** Tray order per form (content identical; order counterbalanced). */
export function m22TrayOrder(form: M22Form): readonly M22Line[] {
  return form === 'form_a' ? M22_LINES : [...M22_LINES].reverse();
}

export function m22Line(id: string): M22Line | undefined {
  return M22_LINES.find((line) => line.id === id);
}

export function m22Open(state: M22State): boolean {
  return state.entered && state.phase !== 'closed';
}

export function m22Enter(state: M22State, nowMs: number): boolean {
  if (state.entered) {
    return false;
  }

  state.entered = true;
  state.opened_at_ms = nowMs;

  return true;
}

export function m22PlacedLines(state: M22State): string[] {
  return state.slots.filter((slot): slot is string => slot !== null);
}

export function m22Acknowledged(state: M22State): boolean {
  return state.setback_acknowledged_at_ms !== null;
}

function editable(state: M22State): boolean {
  if (!m22Open(state) || state.phase === 'accepted') {
    return false;
  }

  // After the setback, editing requires the acknowledgement (comprehension).
  return state.phase === 'assemble' || m22Acknowledged(state);
}

function noteEdit(state: M22State, consistent: boolean, nowMs: number) {
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
  state: M22State,
  slot: number,
  lineId: string,
  nowMs: number,
): boolean {
  if (
    !editable(state) ||
    slot < 0 ||
    slot >= M22_SLOTS ||
    state.slots[slot] !== null ||
    m22Line(lineId) === undefined ||
    state.slots.includes(lineId)
  ) {
    return false;
  }

  state.slots[slot] = lineId;
  noteEdit(state, false, nowMs);

  return true;
}

/** Return a placed line to the tray (its tag, if any, goes with it and is cleared). */
export function m22RemoveLine(
  state: M22State,
  slot: number,
  nowMs: number,
): boolean {
  if (!editable(state) || slot < 0 || slot >= M22_SLOTS) {
    return false;
  }

  const lineId = state.slots[slot];

  if (lineId === null) {
    return false;
  }

  state.slots[slot] = null;
  state.tags[lineId] = null;
  noteEdit(state, false, nowMs);

  return true;
}

/** Attach a register tag to a PLACED line (only after the setback). */
export function m22AttachTag(
  state: M22State,
  lineId: string,
  tag: string,
  nowMs: number,
): boolean {
  if (
    !editable(state) ||
    state.phase !== 'returned' ||
    !state.slots.includes(lineId) ||
    !M22_TAGS.includes(tag) ||
    state.tags[lineId] === tag
  ) {
    return false;
  }

  state.tags[lineId] = tag;
  noteEdit(state, true, nowMs);

  if (m22Line(lineId)!.tag !== tag) {
    state.mismatched_tag_edits += 1;
  }

  return true;
}

export function m22DetachTag(
  state: M22State,
  lineId: string,
  nowMs: number,
): boolean {
  if (
    !editable(state) ||
    state.phase !== 'returned' ||
    state.tags[lineId] === null ||
    state.tags[lineId] === undefined
  ) {
    return false;
  }

  state.tags[lineId] = null;
  noteEdit(state, false, nowMs);

  return true;
}

export function m22UntaggedLines(state: M22State): number {
  return m22PlacedLines(state).filter(
    (lineId) => state.tags[lineId] !== m22Line(lineId)!.tag,
  ).length;
}

/** Progress after the setback: lines carrying their matching tag / lines placed. */
export function m22Progress(state: M22State): {
  tagged: number;
  placed: number;
} {
  const placed = m22PlacedLines(state);

  return {
    tagged: placed.length - m22UntaggedLines(state),
    placed: placed.length,
  };
}

function configurationKey(state: M22State): string {
  return JSON.stringify({ slots: state.slots, tags: state.tags });
}

/** The register (tag list) was opened — inspection after the setback. */
export function m22InspectRegister(state: M22State): boolean {
  if (!m22Open(state) || state.phase !== 'returned') {
    return false;
  }

  state.inspections += 1;

  return true;
}

/** The returned note was acknowledged (setback comprehension; once). */
export function m22Acknowledge(state: M22State, nowMs: number): boolean {
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
 * A submission with fewer than three lines is refused as incomplete
 * (validity precondition — never the setback).
 */
export function m22Submit(state: M22State, nowMs: number): M22SubmitOutcome {
  if (!m22Open(state) || state.phase === 'accepted') {
    return 'rejected_incomplete';
  }

  const placed = m22PlacedLines(state);

  if (state.phase === 'assemble') {
    if (placed.length < M22_MIN_LINES) {
      return 'rejected_incomplete';
    }

    state.initial_action_at_ms = nowMs;
    state.phase = 'returned';
    state.setback_presented_at_ms = nowMs;
    state.submissions.push({
      at_ms: nowMs,
      lines: [...state.slots],
      tags: { ...state.tags },
      outcome: 'setback',
      untagged_lines: placed.length,
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
    tags: previous.tags,
  });
  const untagged = m22UntaggedLines(state);
  let outcome: M22SubmitOutcome;

  if (key === previousKey) {
    outcome = 'unchanged';
    state.unchanged_resubmits += 1;
  } else if (placed.length >= M22_MIN_LINES && untagged === 0) {
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
    tags: { ...state.tags },
    outcome,
    untagged_lines: untagged,
  });

  return outcome;
}

/** Desk feedback for an outcome (actionable; names counts, never the tag). */
export function m22OutcomeText(
  outcome: M22SubmitOutcome,
  state: M22State,
): string {
  switch (outcome) {
    case 'rejected_incomplete':
      return `The report needs at least ${M22_MIN_LINES} lines before it can be submitted.`;
    case 'setback':
      return M22_CRITERION_TEXT;
    case 'refused_unacknowledged':
      return 'Read and acknowledge the returned note before editing the report.';
    case 'unchanged':
      return `Returned again — the report is unchanged. Lines still without a matching tag: ${m22UntaggedLines(state)}.`;
    case 'returned_again':
      return `Returned again — lines still without a matching tag: ${m22UntaggedLines(state)}.`;
    case 'accepted':
      return 'Report accepted by the receiving desk. Logged for the shift.';
  }
}

/** Surface left with the report open (window stays open). */
export function m22Depart(state: M22State): boolean {
  if (!m22Open(state) || state.phase === 'accepted') {
    return false;
  }

  state.departures += 1;

  return true;
}

/**
 * Disposition when the observation closes without acceptance:
 * never submitted → censored (the setback was never presented);
 * setback presented but never acknowledged → invalid
 * (`setback_not_acknowledged`); acknowledged and stopped → a completed
 * observation only for the explicit WITHDRAW; the review censors.
 */
export function m22ClosureDisposition(
  state: M22State,
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
  state: M22State,
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

/** Ledger raw components first; contextual facts after. Never a score. */
export function m22RawComponents(state: M22State) {
  const progress = m22Progress(state);

  return {
    setback_presented: state.setback_presented_at_ms !== null,
    revision_started: state.strategy_change_at_ms !== null,
    feedback_consistent_edits: state.feedback_consistent_edits,
    resubmitted: state.resubmitted_at_ms !== null,
    recovery_complete: state.recovery_at_ms !== null,
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
    mismatched_tag_edits: state.mismatched_tag_edits,
    progress,
    submissions: state.submissions.length,
    lines_at_close: [...state.slots],
    tags_at_close: { ...state.tags },
    departures: state.departures,
    stop_choice: state.stop_choice,
  };
}
