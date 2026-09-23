/**
 * M12 — Carefulness: the quality-packet model (Station 080 M01–M26 run,
 * Unit 8). PURE (no Phaser, no runtime import): the window adapter
 * (`m12QualityControl.ts`) owns the two register windows and injects the
 * log sinks; the surface calls the commands below with their input mode.
 *
 * Approved design (register M12 row, "Redesign interaction"): two
 * independent products with THREE checkable fields and ONE fault each;
 * unchecked release permitted; the optional review requires an EXPLICIT
 * matches / differs judgement per inspected field and a
 * PARTICIPANT-ENTERED correction; the reference of a field is hidden
 * until that field is checked (matrix row).
 *
 * Mechanic: each field shows its printed value; "Check" reveals the
 * reference beside it and asks for a judgement (a press inside the
 * settle window after the reveal is refused — a carried press is never a
 * judgement); the FIRST judgement is immutable; "differs" opens a keypad
 * (digits 0–9, Back, Clear, Cancel, Confirm) and the confirmed value is
 * compared with the reference — never copied; "Release packet" closes the
 * occasion at any time with the fields as they stand.
 *
 * Measure (register `m12_fields_verified`): fields explicitly judged
 * before release, summed over released products / 6; companion
 * `m12_detection_and_correction` (per product: judgement accuracy, the
 * faulty field detected = judged "differs", correction attempted,
 * correction successful). Viewing is never detection; a wrong judgement
 * is still a check. Nothing here is a score.
 */

export type M12Occasion = 'o1' | 'o2';
export type M12Form = 'form_a' | 'form_b';

export const M12_OPPORTUNITY_IDS: Record<M12Occasion, string> = {
  o1: 'proto_m12_check_o1',
  o2: 'proto_m12_check_o2',
};
export const M12_WINDOW_IDS: Record<M12Occasion, string> = {
  o1: 'm12_check_o1',
  o2: 'm12_check_o2',
};
export const M12_ENTRY_STATE_VERSION = 'm12-check-v1';
export const M12_FAMILY = 'proto_m12_check_';
export const M12_FIELDS_PER_PRODUCT = 3;
/**
 * Settle window after a field's reference is revealed (review U4–U7
 * precedent): a judgement press arriving within it is a carried or
 * double-tapped press from the Check control, never a read judgement.
 */
export const M12_SETTLE_MS = 400;

export type M12Judgement = 'matches' | 'differs';
export type M12InputMode = 'pointer' | 'keyboard' | 'system';
export type M12LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => void;

export interface M12FieldSpec {
  id: string;
  label: string;
  /** Fixed prefix shown before the checkable digits (e.g. "CB-"); empty for quantities. */
  prefix: string;
  /** The reference value (digits only). */
  reference: string;
  /** Digits the keypad accepts for this field. */
  digits: number;
}

export interface M12ProductSpec {
  title: string;
  referenceTitle: string;
  /** Participant-facing name of the checkable part ("quantity", "serial digits"). */
  valueName: string;
  fields: readonly M12FieldSpec[];
  /**
   * The faulty field's index and its printed value, per form. Matched
   * salience: one digit differs, by the same amount within a product
   * (o1: +3 on the last digit; o2: −5 on the last digit); the serials are
   * not a sequence, so the printed column alone never singles a tag out.
   */
  fault: Record<M12Form, { index: number; printed: string }>;
}

export const M12_PRODUCTS: Record<M12Occasion, M12ProductSpec> = {
  o1: {
    title: 'Supply manifest — storm delivery',
    referenceTitle: 'Packing list',
    valueName: 'quantity',
    fields: [
      {
        id: 'fuse',
        label: 'Fuse contacts',
        prefix: '',
        reference: '12',
        digits: 2,
      },
      {
        id: 'wire',
        label: 'Wire spools',
        prefix: '',
        reference: '24',
        digits: 2,
      },
      {
        id: 'vial',
        label: 'Sample vials',
        prefix: '',
        reference: '10',
        digits: 2,
      },
    ],
    fault: {
      form_a: { index: 1, printed: '27' },
      form_b: { index: 2, printed: '13' },
    },
  },
  o2: {
    title: 'Calibration tag sheet — bench run',
    referenceTitle: 'Bench register',
    valueName: 'serial digits',
    fields: [
      {
        id: 't1',
        label: 'Tag 1 serial',
        prefix: 'CB-',
        reference: '2041',
        digits: 4,
      },
      {
        id: 't2',
        label: 'Tag 2 serial',
        prefix: 'CB-',
        reference: '3178',
        digits: 4,
      },
      {
        id: 't3',
        label: 'Tag 3 serial',
        prefix: 'CB-',
        reference: '2609',
        digits: 4,
      },
    ],
    fault: {
      form_a: { index: 1, printed: '3173' },
      form_b: { index: 2, printed: '2604' },
    },
  },
};

export interface M12Field {
  id: string;
  index: number;
  printed: string;
  reference: string;
  faulty: boolean;
  checked_at_ms: number | null;
  checks: number;
  judgement: M12Judgement | null;
  judgement_correct: boolean | null;
  judged_at_ms: number | null;
  refused_presses: number;
  keypad_open: boolean;
  entry: string;
  keypad_openings: number;
  correction: { entered: string; correct: boolean; at_ms: number } | null;
  corrections_abandoned: number;
}

export interface M12State {
  occasion: M12Occasion;
  form: M12Form;
  fields: M12Field[];
  /** The field whose judgement is pending (the last checked, unjudged). */
  pending: string | null;
  released: boolean;
  released_at_ms: number | null;
  actions: number;
  closureReason: string | null;
}

export function createM12State(occasion: M12Occasion, form: M12Form): M12State {
  const product = M12_PRODUCTS[occasion];
  const fault = product.fault[form];

  return {
    occasion,
    form,
    fields: product.fields.map((spec, index) => ({
      id: spec.id,
      index,
      printed: index === fault.index ? fault.printed : spec.reference,
      reference: spec.reference,
      faulty: index === fault.index,
      checked_at_ms: null,
      checks: 0,
      judgement: null,
      judgement_correct: null,
      judged_at_ms: null,
      refused_presses: 0,
      keypad_open: false,
      entry: '',
      keypad_openings: 0,
      correction: null,
      corrections_abandoned: 0,
    })),
    pending: null,
    released: false,
    released_at_ms: null,
    actions: 0,
    closureReason: null,
  };
}

// ——— derived readers ————————————————————————————————————————————————

export function m12Field(s: M12State, fieldId: string): M12Field | null {
  return s.fields.find((field) => field.id === fieldId) ?? null;
}

/** Fields with an explicit judgement (the primary's numerator for this product). */
export function m12FieldsJudged(s: M12State): number {
  return s.fields.filter((field) => field.judgement !== null).length;
}

export function m12FieldsChecked(s: M12State): number {
  return s.fields.filter((field) => field.checked_at_ms !== null).length;
}

/** The faulty field was judged "differs" (detection — viewing is never detection). */
export function m12FaultDetected(s: M12State): boolean {
  return s.fields.some(
    (field) => field.faulty && field.judgement === 'differs',
  );
}

export function m12FaultyField(s: M12State): M12Field {
  return s.fields.find((field) => field.faulty)!;
}

export function m12Open(s: M12State): boolean {
  return !s.released && s.closureReason === null;
}

/** The field whose keypad is open (at most one). */
export function m12KeypadField(s: M12State): M12Field | null {
  return s.fields.find((field) => field.keypad_open) ?? null;
}

/**
 * Reload guard (register §5.14): true when an earlier page load of this
 * identity already opened this occasion's packet.
 */
export function m12PriorAdministration(
  priorLoadEvents: readonly {
    event_type: string;
    metadata?: Record<string, unknown>;
  }[],
  occasion: M12Occasion,
): boolean {
  return priorLoadEvents.some(
    (event) =>
      event.event_type === `${M12_FAMILY}opportunity_opened` &&
      event.metadata?.occasion === occasion,
  );
}

export function m12EntrySnapshot(occasion: M12Occasion, form: M12Form) {
  return {
    occasion,
    form,
    fields: M12_FIELDS_PER_PRODUCT,
    faults: 1,
    references_hidden_until_checked: true,
    judgement_required_per_checked_field: true,
    correction_entry: 'keypad',
    unchecked_release_permitted: true,
    settle_ms: M12_SETTLE_MS,
    payment_fixed: true,
    route_fixed: true,
  };
}

// ——— commands ——————————————————————————————————————————————————————————

/** "Check": reveals the field's reference (once) and asks for a judgement. */
export function m12Check(
  s: M12State,
  fieldId: string,
  nowMs: number,
  inputMode: M12InputMode,
  log: M12LogSink,
): 'checked' | 'again' | 'refused' | 'invalid' {
  const field = m12Field(s, fieldId);

  if (field === null || !m12Open(s)) {
    return 'invalid';
  }

  // One field at a time: a pending judgement or an open keypad must be
  // answered (or cancelled) before another field is checked — a checked
  // field is never left without its judgement prompt.
  const blocker =
    m12KeypadField(s) !== null
      ? 'keypad_open'
      : s.pending !== null && s.pending !== field.id
        ? 'judgement_pending'
        : null;

  if (blocker !== null) {
    field.refused_presses += 1;
    log('press_refused', {
      control: 'check',
      field_id: field.id,
      reason: blocker,
      blocking_field_id: m12KeypadField(s)?.id ?? s.pending,
      input_mode: inputMode,
    });

    return 'refused';
  }

  s.actions += 1;
  field.checks += 1;

  if (field.checked_at_ms !== null) {
    log('field_checked_again', {
      field_id: field.id,
      field_index: field.index,
      checks: field.checks,
      input_mode: inputMode,
    });

    return 'again';
  }

  field.checked_at_ms = nowMs;

  if (field.judgement === null) {
    s.pending = field.id;
  }

  // The reference is revealed; whether it matches is for the participant
  // to judge — the log never says "detected" here (view ≠ detected).
  log('field_checked', {
    field_id: field.id,
    field_index: field.index,
    printed: field.printed,
    reference_revealed: true,
    fields_checked: m12FieldsChecked(s),
    input_mode: inputMode,
  });

  return 'checked';
}

export type M12JudgeResult = 'judged' | 'refused' | 'invalid';

/**
 * The explicit judgement of a checked field. The FIRST judgement is
 * immutable; a press inside the settle window after the reveal is
 * refused. A wrong judgement is still a check.
 */
export function m12Judge(
  s: M12State,
  fieldId: string,
  judgement: M12Judgement,
  nowMs: number,
  inputMode: M12InputMode,
  log: M12LogSink,
): M12JudgeResult {
  const field = m12Field(s, fieldId);

  if (
    field === null ||
    !m12Open(s) ||
    field.checked_at_ms === null ||
    field.judgement !== null
  ) {
    return 'invalid';
  }

  const since = nowMs - field.checked_at_ms;

  if (since < M12_SETTLE_MS) {
    field.refused_presses += 1;
    log('press_refused', {
      control: `judge_${judgement}`,
      field_id: field.id,
      reason: 'reference_settling',
      since_revealed_ms: since,
      settle_ms: M12_SETTLE_MS,
      input_mode: inputMode,
    });

    return 'refused';
  }

  s.actions += 1;
  field.judgement = judgement;
  field.judged_at_ms = nowMs;
  field.judgement_correct =
    (judgement === 'differs') === (field.printed !== field.reference);

  if (s.pending === field.id) {
    s.pending = null;
  }

  log('field_judged', {
    field_id: field.id,
    field_index: field.index,
    judgement,
    judgement_correct: field.judgement_correct,
    faulty_field: field.faulty,
    fault_detected: m12FaultDetected(s),
    fields_judged: m12FieldsJudged(s),
    latency_ms: nowMs - field.checked_at_ms,
    input_mode: inputMode,
  });

  if (judgement === 'differs' && field.correction === null) {
    field.keypad_open = true;
    field.keypad_openings += 1;
    field.entry = '';
    log('keypad_opened', {
      field_id: field.id,
      digits: M12_PRODUCTS[s.occasion].fields[field.index].digits,
      input_mode: 'system',
    });
  }

  return 'judged';
}

/** A keypad digit (0–9) for the open field's entry. */
export function m12KeypadDigit(
  s: M12State,
  digit: string,
  inputMode: M12InputMode,
  log: M12LogSink,
): boolean {
  const field = m12KeypadField(s);

  if (field === null || !m12Open(s) || !/^[0-9]$/.test(digit)) {
    return false;
  }

  const max = M12_PRODUCTS[s.occasion].fields[field.index].digits;

  if (field.entry.length >= max) {
    log('keypad_refused', {
      field_id: field.id,
      reason: 'entry_full',
      digits: max,
      input_mode: inputMode,
    });

    return false;
  }

  field.entry += digit;
  s.actions += 1;
  log('keypad_digit', {
    field_id: field.id,
    entry_length: field.entry.length,
    input_mode: inputMode,
  });

  return true;
}

export function m12KeypadBack(
  s: M12State,
  inputMode: M12InputMode,
  log: M12LogSink,
): boolean {
  const field = m12KeypadField(s);

  if (field === null || !m12Open(s) || field.entry.length === 0) {
    return false;
  }

  field.entry = field.entry.slice(0, -1);
  s.actions += 1;
  log('keypad_back', {
    field_id: field.id,
    entry_length: field.entry.length,
    input_mode: inputMode,
  });

  return true;
}

export function m12KeypadClear(
  s: M12State,
  inputMode: M12InputMode,
  log: M12LogSink,
): boolean {
  const field = m12KeypadField(s);

  if (field === null || !m12Open(s) || field.entry.length === 0) {
    return false;
  }

  field.entry = '';
  s.actions += 1;
  log('keypad_cleared', { field_id: field.id, input_mode: inputMode });

  return true;
}

/** Cancel: the keypad closes without a correction (the "differs" judgement stands). */
export function m12AbandonCorrection(
  s: M12State,
  inputMode: M12InputMode,
  log: M12LogSink,
): boolean {
  const field = m12KeypadField(s);

  if (field === null || !m12Open(s)) {
    return false;
  }

  field.keypad_open = false;
  field.corrections_abandoned += 1;
  s.actions += 1;
  log('correction_abandoned', {
    field_id: field.id,
    entry_length: field.entry.length,
    input_mode: inputMode,
  });
  field.entry = '';

  return true;
}

/** Reopen the keypad of a field judged "differs" whose correction was abandoned. */
export function m12ReopenKeypad(
  s: M12State,
  fieldId: string,
  inputMode: M12InputMode,
  log: M12LogSink,
): boolean {
  const field = m12Field(s, fieldId);

  if (
    field === null ||
    !m12Open(s) ||
    field.judgement !== 'differs' ||
    field.correction !== null ||
    field.keypad_open ||
    m12KeypadField(s) !== null
  ) {
    return false;
  }

  field.keypad_open = true;
  field.keypad_openings += 1;
  field.entry = '';
  s.actions += 1;
  log('keypad_opened', {
    field_id: field.id,
    digits: M12_PRODUCTS[s.occasion].fields[field.index].digits,
    reopened: true,
    input_mode: inputMode,
  });

  return true;
}

export type M12ConfirmResult = 'entered' | 'empty' | 'invalid';

/**
 * Confirm the entered correction: compared with the reference, never
 * copied from it. One correction per field (the first stands).
 */
export function m12ConfirmCorrection(
  s: M12State,
  nowMs: number,
  inputMode: M12InputMode,
  log: M12LogSink,
): M12ConfirmResult {
  const field = m12KeypadField(s);

  if (field === null || !m12Open(s)) {
    return 'invalid';
  }

  if (field.entry.length === 0) {
    return 'empty';
  }

  const entered = field.entry;

  field.correction = {
    entered,
    correct: entered === field.reference,
    at_ms: nowMs,
  };
  field.keypad_open = false;
  field.entry = '';
  s.actions += 1;
  log('correction_entered', {
    field_id: field.id,
    field_index: field.index,
    entered,
    printed: field.printed,
    reference: field.reference,
    correct: field.correction.correct,
    faulty_field: field.faulty,
    input_mode: inputMode,
  });

  return 'entered';
}

/** "Release packet": closes the occasion with the fields as they stand. */
export function m12Release(
  s: M12State,
  nowMs: number,
  inputMode: M12InputMode,
  log: M12LogSink,
): boolean {
  if (!m12Open(s)) {
    return false;
  }

  const keypad = m12KeypadField(s);

  if (keypad !== null) {
    keypad.keypad_open = false;
    keypad.corrections_abandoned += 1;
    keypad.entry = '';
  }

  s.released = true;
  s.released_at_ms = nowMs;
  s.closureReason = 'completed';
  s.pending = null;
  log('released', {
    fields_judged: m12FieldsJudged(s),
    fields_checked: m12FieldsChecked(s),
    fault_detected: m12FaultDetected(s),
    keypad_abandoned_at_release: keypad !== null,
    input_mode: inputMode,
  });

  return true;
}

/** Re-reading a revealed reference (a neutral, logged activation). */
export function m12Reread(
  s: M12State,
  fieldId: string,
  inputMode: M12InputMode,
  log: M12LogSink,
): boolean {
  const field = m12Field(s, fieldId);

  if (field === null || !m12Open(s) || field.checked_at_ms === null) {
    return false;
  }

  log('reference_reread', {
    field_id: field.id,
    judged: field.judgement !== null,
    input_mode: inputMode,
  });

  return true;
}

/**
 * Freezes an open packet (the review, a reload, a reset). An open keypad
 * counts as an abandoned correction, as at release.
 */
export function m12Freeze(s: M12State, closureReason: string) {
  if (s.closureReason === null) {
    s.closureReason = closureReason;
  }

  for (const field of s.fields) {
    if (field.keypad_open) {
      field.keypad_open = false;
      field.corrections_abandoned += 1;
      field.entry = '';
    }
  }
}

/** Item-owned raw components (state description — never a score). */
export function m12RawComponents(s: M12State, closureReason: string) {
  const judged = s.fields.filter((field) => field.judgement !== null);
  const faulty = m12FaultyField(s);

  return {
    occasion: s.occasion,
    form: s.form,
    fields_planned: M12_FIELDS_PER_PRODUCT,
    fields_checked: m12FieldsChecked(s),
    fields_judged: judged.length,
    judgements_correct: judged.filter(
      (field) => field.judgement_correct === true,
    ).length,
    judgement_accuracy:
      judged.length === 0
        ? null
        : judged.filter((field) => field.judgement_correct === true).length /
          judged.length,
    faulty_field_id: faulty.id,
    faulty_field_checked: faulty.checked_at_ms !== null,
    faulty_field_judged: faulty.judgement,
    fault_detected: m12FaultDetected(s),
    correction_attempted: faulty.correction !== null,
    correction_successful: faulty.correction?.correct ?? null,
    unnecessary_corrections: s.fields.filter(
      (field) => !field.faulty && field.correction !== null,
    ).length,
    released: s.released,
    actions: s.actions,
    fields: s.fields.map((field) => ({
      id: field.id,
      index: field.index,
      printed: field.printed,
      reference: field.reference,
      faulty: field.faulty,
      checked: field.checked_at_ms !== null,
      checks: field.checks,
      judgement: field.judgement,
      judgement_correct: field.judgement_correct,
      judgement_latency_ms:
        field.judged_at_ms === null || field.checked_at_ms === null
          ? null
          : field.judged_at_ms - field.checked_at_ms,
      refused_presses: field.refused_presses,
      keypad_openings: field.keypad_openings,
      correction: field.correction === null ? null : { ...field.correction },
      corrections_abandoned: field.corrections_abandoned,
    })),
    closure_reason: closureReason,
  };
}
