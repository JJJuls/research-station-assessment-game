/**
 * M10 — two separately accepted deliveries (Station 080 M01–M26 run,
 * Unit 15). PURE (no Phaser, no runtime import): the window adapter
 * (`m10ComponentPromise.ts`) owns the two register windows and the log
 * sink; the scenes call the commands below with the observed input.
 *
 * Approved design (specification, M10 row): two separate, briefly stated
 * deliveries with distinct objects and recipients; acceptance recorded
 * separately; the obligation shown again after interruptions; delivery or
 * accountable delegation by the stated milestone.
 *
 * Administration `m10-deliveries-v1`:
 *   d1  calibration key card, Vale → Kai. Offered in Vale's handover
 *       chain; acceptance is followed by the standardised pressure alarm
 *       and then by a recap of the obligation. Kai takes it directly;
 *       Noor may agree to take it to Kai.
 *   d2  yard logbook, Noor → Vale. Offered when the outside work is
 *       reported finished. Vale takes it directly; Kai may agree to take
 *       it to Vale.
 * Both are due before the station record is closed at the Shift Review
 * Panel. A delivery ends with ONE terminal outcome: handed to its
 * recipient, left with the colleague who agreed to take it, or still
 * carried when the record closes. An act after the closure is kept as a
 * late act and never changes the first outcome. The objects are states of
 * this module — never belt or backpack items.
 *
 * Measure (register `m10_obligations_fulfilled`): deliveries handed over
 * or accountably delegated / accepted, accessible deliveries. Declining
 * is not a breach; a delivery whose recipient and delegate were never
 * present while it was carried is inaccessible and excluded. Nothing here
 * is a value: the module records what happened and when.
 */
import type { ObservedInput } from '../inputObservation';

export const M10_FAMILY = 'proto_m10_delivery_';
export const M10_ENTRY_STATE_VERSION = 'm10-deliveries-v1';
export const M10_DEADLINE = 'station_record_closure';
/** Presses sooner than this after a stage appears are refused. */
export const M10_SETTLE_MS = 300;

export type M10Delivery = 'd1' | 'd2';
export type M10Person = 'vale' | 'kai' | 'noor';
export type M10Path = 'direct' | 'delegated' | 'unfulfilled_at_deadline';
export type M10Step =
  | 'offer'
  | 'recap'
  | 'deliveries_menu'
  | 'delegation_confirm';
export type M10Channel =
  | 'after_interruption'
  | 'station_log'
  | 'deliveries_menu';
export type M10LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => void;

export const M10_DELIVERY_IDS: readonly M10Delivery[] = ['d1', 'd2'];

export interface M10DeliverySpec {
  delivery: M10Delivery;
  opportunity_id: string;
  window_id: string;
  object_id: string;
  object_label: string;
  issuer: M10Person;
  recipient: M10Person;
  /** The one colleague who may agree to take it (never issuer or recipient). */
  permitted_delegate: M10Person;
  offer_milestone: string;
  offer_zone: string;
  wording_id: string;
  /** Only d1 is followed by the standardised interruption. */
  interruption: boolean;
  log_line_id: string;
  log_order: number;
}

export const M10_DELIVERIES: Record<M10Delivery, M10DeliverySpec> = {
  d1: {
    delivery: 'd1',
    opportunity_id: 'proto_m10_delivery_d1',
    window_id: 'm10_delivery_d1',
    object_id: 'm10_calibration_key_card',
    object_label: 'calibration key card',
    issuer: 'vale',
    recipient: 'kai',
    permitted_delegate: 'noor',
    offer_milestone: 'incident_handover',
    offer_zone: 'station_concourse',
    wording_id: 'm10_offer_d1_v1',
    interruption: true,
    log_line_id: 'm10_log_d1',
    log_order: 12,
  },
  d2: {
    delivery: 'd2',
    opportunity_id: 'proto_m10_delivery_d2',
    window_id: 'm10_delivery_d2',
    object_id: 'm10_yard_logbook',
    object_label: 'yard logbook',
    issuer: 'noor',
    recipient: 'vale',
    permitted_delegate: 'kai',
    offer_milestone: 'exterior_shift_end',
    offer_zone: 'exterior_recovery_yard',
    wording_id: 'm10_offer_d2_v1',
    interruption: false,
    log_line_id: 'm10_log_d2',
    log_order: 13,
  },
};

// ——— Participant-facing copy (operational; no study wording) ————————————

export const M10_PERSON_NAMES: Record<M10Person, string> = {
  vale: 'Vale',
  kai: 'Kai',
  noor: 'Noor',
};

export const M10_INTERRUPTION_TEXT =
  'PRESSURE ALARM — coolant loop transient. Hold position until the alarm clears.';
export const M10_INTERRUPTION_ACK_LABEL = 'Alarm cleared — continue.';

const DUE_CLAUSE =
  'Hand it over before you close the station record at the Shift Review Panel — or leave it with a colleague who agrees to take it to';
const LOG_CLAUSE = 'Your station log (M) lists it.';

export const M10_OFFER_BODY: Record<M10Delivery, string> = {
  d1: `Vale: Kai asked for the calibration key card. Will you carry it to Kai? ${DUE_CLAUSE} Kai. ${LOG_CLAUSE}`,
  d2: `Noor: Logged. Before you go in — will you carry my yard logbook to Vale? ${DUE_CLAUSE} Vale. ${LOG_CLAUSE}`,
};
/** The d2 offer asked again from Noor's deliveries menu (nothing was just logged). */
export const M10_D2_REASK_BODY = `Noor: Before you go in — will you carry my yard logbook to Vale? ${DUE_CLAUSE} Vale. ${LOG_CLAUSE}`;

export const M10_OFFER_LABELS: Record<
  M10Delivery,
  { accept: string; decline: string; defer: string }
> = {
  d1: {
    accept: 'I will take it to Kai.',
    decline: 'Better ask someone else.',
    defer: 'Ask me again later.',
  },
  d2: {
    accept: 'I will take it to Vale.',
    decline: 'Better ask someone else.',
    defer: 'Ask me again later.',
  },
};
/**
 * Route-telemetry tags of the three offer options (`pilot_npc_beat`); a
 * deferral is recorded ONLY there — it is not an answer.
 */
export const M10_OFFER_TAGS: Record<
  M10Delivery,
  { accept: string; decline: string; defer: string }
> = {
  d1: {
    accept: 'promise_accept',
    decline: 'promise_decline',
    defer: 'promise_defer',
  },
  d2: {
    accept: 'logbook_accept',
    decline: 'logbook_decline',
    defer: 'logbook_defer',
  },
};
export const M10_D1_REASK_LABEL = 'About the delivery…';
export const M10_D2_REASK_LABEL = 'About the yard logbook…';
export const M10_D2_ANSWER_FEEDBACK =
  'Noor: Back through the airlock — Vale is waiting at the incident desk.';

export const M10_RECAP_BODY =
  "Vale: Alarm's clear. You are still carrying the calibration key card for Kai — due before you close the station record at the Shift Review Panel. Your station log (M) lists it.";
export const M10_RECAP_ACK_LABEL = 'Understood.';

export const M10_MENU_ENTRY_LABEL = 'About the deliveries…';
export const M10_MENU_NOT_NOW_LABEL = 'Not now.';
export const M10_MENU_HEADER = 'Deliveries you are carrying:';
export const M10_MENU_NONE = 'Deliveries you are carrying: none.';
export const M10_MENU_DUE_LINE =
  'Each is due before you close the station record at the Shift Review Panel.';
export const M10_MENU_LINES: Record<M10Delivery, string> = {
  d1: '● Calibration key card → Kai',
  d2: '● Yard logbook → Vale',
};
export const M10_HANDOVER_LABELS: Record<M10Delivery, string> = {
  d1: 'Hand over the calibration key card.',
  d2: 'Hand over the yard logbook.',
};
export const M10_DELEGATE_LABELS: Record<M10Delivery, string> = {
  d1: 'Ask Noor to take the calibration key card to Kai.',
  d2: 'Ask Kai to take the yard logbook to Vale.',
};
export const M10_HANDOVER_FEEDBACK: Record<M10Delivery, string> = {
  d1: 'Kai: Received — logged with the calibration set.',
  d2: 'Vale: Received — logged with the yard report.',
};
export const M10_DELEGATE_KEEP_LABEL = 'Keep it for now.';

export const M10_LOG_LINES: Record<M10Delivery, string> = {
  d1: 'Delivery: calibration key card to Kai — before the station record is closed.',
  d2: 'Delivery: yard logbook to Vale — before the station record is closed.',
};

export function m10DelegateConfirmBody(delivery: M10Delivery): string {
  const spec = M10_DELIVERIES[delivery];

  return `${M10_PERSON_NAMES[spec.permitted_delegate]}: I can take the ${spec.object_label} to ${M10_PERSON_NAMES[spec.recipient]} — from now on that is my job, not yours. Leave it with me?`;
}

export function m10DelegateConfirmLabel(delivery: M10Delivery): string {
  return `Yes — leave it with ${M10_PERSON_NAMES[M10_DELIVERIES[delivery].permitted_delegate]}.`;
}

export function m10DelegateFeedback(delivery: M10Delivery): string {
  const spec = M10_DELIVERIES[delivery];

  return `${M10_PERSON_NAMES[spec.permitted_delegate]}: It is with me. I will hand it to ${M10_PERSON_NAMES[spec.recipient]}.`;
}

/** The deliveries-menu body: what is carried, and when it is due. */
export function m10MenuBody(carried: readonly M10Delivery[]): string {
  if (carried.length === 0) {
    return M10_MENU_NONE;
  }

  return [
    M10_MENU_HEADER,
    ...carried.map((delivery) => M10_MENU_LINES[delivery]),
    M10_MENU_DUE_LINE,
  ].join('\n');
}

// ——— State ————————————————————————————————————————————————————————————

export interface M10LateAct {
  kind: 'late_handover' | 'late_delegation';
  to: M10Person;
  at_ms: number;
  after_closure_ms: number;
}

export interface M10State {
  spec: M10DeliverySpec;
  presented_at_ms: number | null;
  presentations: number;
  /** Wall time each settle-guarded stage last appeared. */
  step_shown_at_ms: Record<M10Step, number | null>;
  refused_presses: number;
  answer: 'accept' | 'decline' | null;
  answered_at_ms: number | null;
  answer_position: number | null;
  answer_input: ObservedInput | null;
  interruption_shown_at_ms: number | null;
  interruption_acknowledged_at_ms: number | null;
  /** Exposure counts by channel while carried and before the closure. */
  exposures: Record<M10Channel, number>;
  /** person:role presence records while carried and before the closure. */
  presence: {
    person: M10Person;
    role: 'recipient' | 'delegate';
    zone: string;
  }[];
  presence_keys: string[];
  recipient_prompts: number;
  delegate_accepted_at_ms: number | null;
  /** The ONE terminal outcome (frozen once set). */
  path: M10Path | null;
  terminal_to: M10Person | null;
  terminal_at_ms: number | null;
  terminal_input: ObservedInput | null;
  closed_at_ms: number | null;
  closure_reason: string | null;
  late_act: M10LateAct | null;
}

export function createM10State(delivery: M10Delivery): M10State {
  return {
    spec: M10_DELIVERIES[delivery],
    presented_at_ms: null,
    presentations: 0,
    step_shown_at_ms: {
      offer: null,
      recap: null,
      deliveries_menu: null,
      delegation_confirm: null,
    },
    refused_presses: 0,
    answer: null,
    answered_at_ms: null,
    answer_position: null,
    answer_input: null,
    interruption_shown_at_ms: null,
    interruption_acknowledged_at_ms: null,
    exposures: { after_interruption: 0, station_log: 0, deliveries_menu: 0 },
    presence: [],
    presence_keys: [],
    recipient_prompts: 0,
    delegate_accepted_at_ms: null,
    path: null,
    terminal_to: null,
    terminal_at_ms: null,
    terminal_input: null,
    closed_at_ms: null,
    closure_reason: null,
    late_act: null,
  };
}

/**
 * The object is with the participant: accepted and neither handed over
 * nor left with the delegate — before the closure or, unfulfilled, after
 * it (until a late act).
 */
export function m10Carrying(s: M10State): boolean {
  return (
    s.answer === 'accept' &&
    (s.path === null || s.path === 'unfulfilled_at_deadline') &&
    s.late_act === null
  );
}

/** Carried with the obligation still open (the record not yet closed). */
export function m10ObligationOpen(s: M10State): boolean {
  return m10Carrying(s) && s.closed_at_ms === null;
}

// ——— Settle window ————————————————————————————————————————————————————

/** A settle-guarded stage of this delivery appeared (the settle reference). */
export function m10StepShown(s: M10State, step: M10Step, nowMs: number) {
  s.step_shown_at_ms[step] = nowMs;
}

/** True when the press is past the stage's settle window; a refusal is logged. */
export function m10PressAllowed(
  s: M10State,
  step: M10Step,
  optionPosition: number,
  optionCount: number,
  nowMs: number,
  log: M10LogSink,
): boolean {
  const latency = nowMs - (s.step_shown_at_ms[step] ?? nowMs);

  if (latency >= M10_SETTLE_MS) {
    return true;
  }

  s.refused_presses += 1;
  log('press_refused', {
    delivery: s.spec.delivery,
    step,
    option_position: optionPosition,
    option_count: optionCount,
    latency_ms: latency,
    settle_ms: M10_SETTLE_MS,
    refused_presses: s.refused_presses,
    input_mode: 'system',
  });

  return false;
}

// ——— Offer ————————————————————————————————————————————————————————————

/**
 * The offer stage is shown. The FIRST showing is the presentation (logged
 * once, never backdated); a later showing only moves the settle reference.
 */
export function m10Present(
  s: M10State,
  nowMs: number,
  log: M10LogSink,
): boolean {
  if (s.answer !== null || s.closed_at_ms !== null) {
    return false;
  }

  m10StepShown(s, 'offer', nowMs);
  s.presentations += 1;

  if (s.presented_at_ms !== null) {
    return false;
  }

  s.presented_at_ms = nowMs;
  log('presented', {
    delivery: s.spec.delivery,
    issuer: s.spec.issuer,
    recipient: s.spec.recipient,
    object: s.spec.object_id,
    deadline: M10_DEADLINE,
    permitted_delegate: s.spec.permitted_delegate,
    wording_id: s.spec.wording_id,
    offer_milestone: s.spec.offer_milestone,
    offer_zone: s.spec.offer_zone,
    interruption_follows_acceptance: s.spec.interruption,
    option_count: 3,
    settle_ms: M10_SETTLE_MS,
    input_mode: 'system',
  });

  return true;
}

export type M10AnswerResult = 'accepted' | 'declined' | 'refused' | 'invalid';

/** The explicit answer: the first read press is the record. */
export function m10Answer(
  s: M10State,
  answer: 'accept' | 'decline',
  optionPosition: number,
  optionCount: number,
  nowMs: number,
  input: ObservedInput,
  log: M10LogSink,
): M10AnswerResult {
  if (
    s.presented_at_ms === null ||
    s.answer !== null ||
    s.closed_at_ms !== null
  ) {
    return 'invalid';
  }

  if (!m10PressAllowed(s, 'offer', optionPosition, optionCount, nowMs, log)) {
    return 'refused';
  }

  s.answer = answer;
  s.answered_at_ms = nowMs;
  s.answer_position = optionPosition;
  s.answer_input = input;
  log('offer_answered', {
    delivery: s.spec.delivery,
    answer,
    option_position: optionPosition,
    option_count: optionCount,
    latency_ms: nowMs - (s.step_shown_at_ms.offer ?? nowMs),
    presentations: s.presentations,
    refused_presses: s.refused_presses,
    input_mode: input.input_mode,
    input_mode_basis: input.input_mode_basis,
  });

  return answer === 'accept' ? 'accepted' : 'declined';
}

export type M10DeferResult = 'deferred' | 'refused' | 'invalid';

/**
 * "Ask me again later." — no answer is recorded (the route telemetry
 * carries the deferral); only the settle window applies.
 */
export function m10Defer(
  s: M10State,
  optionPosition: number,
  optionCount: number,
  nowMs: number,
  log: M10LogSink,
): M10DeferResult {
  if (
    s.presented_at_ms === null ||
    s.answer !== null ||
    s.closed_at_ms !== null
  ) {
    return 'invalid';
  }

  return m10PressAllowed(s, 'offer', optionPosition, optionCount, nowMs, log)
    ? 'deferred'
    : 'refused';
}

// ——— Interruption and exposures ———————————————————————————————————————

/** The standardised interruption after acceptance (d1 only), shown once. */
export function m10InterruptionShown(
  s: M10State,
  nowMs: number,
  log: M10LogSink,
): boolean {
  if (
    !s.spec.interruption ||
    s.answer !== 'accept' ||
    s.interruption_shown_at_ms !== null
  ) {
    return false;
  }

  s.interruption_shown_at_ms = nowMs;
  log('interruption_shown', {
    delivery: s.spec.delivery,
    input_mode: 'system',
  });

  return true;
}

export function m10InterruptionAcknowledged(
  s: M10State,
  nowMs: number,
  input: ObservedInput,
  log: M10LogSink,
): boolean {
  if (
    s.interruption_shown_at_ms === null ||
    s.interruption_acknowledged_at_ms !== null
  ) {
    return false;
  }

  s.interruption_acknowledged_at_ms = nowMs;
  log('interruption_acknowledged', {
    delivery: s.spec.delivery,
    shown_ms: nowMs - s.interruption_shown_at_ms,
    input_mode: input.input_mode,
    input_mode_basis: input.input_mode_basis,
  });

  return true;
}

/**
 * The obligation was shown again while the object is carried: after the
 * interruption (the recap), in the station log, or in a deliveries menu.
 * After the closure a showing is still recorded, flagged, and never
 * counted as an exposure before the deadline.
 */
export function m10ObligationShown(
  s: M10State,
  channel: M10Channel,
  deliveries: readonly M10Delivery[],
  detail: Record<string, unknown>,
  log: M10LogSink,
): boolean {
  if (!m10Carrying(s)) {
    return false;
  }

  const afterClosure = s.closed_at_ms !== null;

  // A station-log line the map could not show is recorded, never counted.
  if (!afterClosure && detail.rendered !== false) {
    s.exposures[channel] += 1;
  }

  log('obligation_shown', {
    delivery: s.spec.delivery,
    channel,
    deliveries: [...deliveries],
    line_id: s.spec.log_line_id,
    after_closure: afterClosure,
    ...detail,
    input_mode: 'system',
  });

  return true;
}

/**
 * The recipient or the permitted delegate stands in the zone the
 * participant is in, with the act available, while the object is carried
 * — the objective accessibility record. One record per person and zone
 * visit; none after the closure.
 */
export function m10PersonPresent(
  s: M10State,
  person: M10Person,
  zone: string,
  stage: string,
  visit: number,
  log: M10LogSink,
): boolean {
  if (!m10ObligationOpen(s)) {
    return false;
  }

  const role =
    person === s.spec.recipient
      ? 'recipient'
      : person === s.spec.permitted_delegate
        ? 'delegate'
        : null;
  const key = `${person}:${zone}:${visit}`;

  if (role === null || s.presence_keys.includes(key)) {
    return false;
  }

  s.presence_keys.push(key);
  s.presence.push({ person, role, zone });
  log('person_present', {
    delivery: s.spec.delivery,
    person,
    role,
    zone,
    stage,
    visit,
    input_mode: 'system',
  });

  return true;
}

/** The recipient's conversation was opened while the object is carried. */
export function m10RecipientPromptOpened(
  s: M10State,
  zone: string,
  stage: string,
  log: M10LogSink,
): boolean {
  if (!m10ObligationOpen(s)) {
    return false;
  }

  s.recipient_prompts += 1;
  log('recipient_prompt_opened', {
    delivery: s.spec.delivery,
    recipient: s.spec.recipient,
    zone,
    stage,
    encounter: s.recipient_prompts,
    input_mode: 'system',
  });

  return true;
}

// ——— Terminal acts ————————————————————————————————————————————————————

/**
 * The permitted delegate states that the delivery becomes their job (the
 * confirmation stage is shown). Recorded once; anyone else is refused.
 */
export function m10DelegateAccepted(
  s: M10State,
  delegate: M10Person,
  nowMs: number,
  log: M10LogSink,
): boolean {
  if (!m10Carrying(s) || delegate !== s.spec.permitted_delegate) {
    return false;
  }

  m10StepShown(s, 'delegation_confirm', nowMs);

  if (s.delegate_accepted_at_ms !== null) {
    return true;
  }

  s.delegate_accepted_at_ms = nowMs;
  log('delegate_accepted', {
    delivery: s.spec.delivery,
    delegate,
    for: s.spec.recipient,
    line_id: `m10_delegate_confirm_${s.spec.delivery}`,
    after_closure: s.closed_at_ms !== null,
    input_mode: 'system',
  });

  return true;
}

export type M10ActResult = 'direct' | 'delegated' | 'late' | 'refused';

/**
 * Hands the object over. Only the delivery's own recipient and its own
 * object are accepted. Before the closure this is the terminal outcome;
 * after it, a late act kept apart.
 */
export function m10HandOver(
  s: M10State,
  to: M10Person,
  objectId: string,
  nowMs: number,
  input: ObservedInput,
  log: M10LogSink,
): M10ActResult {
  if (
    !m10Carrying(s) ||
    to !== s.spec.recipient ||
    objectId !== s.spec.object_id
  ) {
    return 'refused';
  }

  if (s.closed_at_ms !== null) {
    s.late_act = {
      kind: 'late_handover',
      to,
      at_ms: nowMs,
      after_closure_ms: nowMs - s.closed_at_ms,
    };
    log('late_handover', {
      delivery: s.spec.delivery,
      to,
      object: s.spec.object_id,
      after_closure_ms: nowMs - s.closed_at_ms,
      input_mode: input.input_mode,
      basis: input.input_mode_basis,
    });

    return 'late';
  }

  s.path = 'direct';
  s.terminal_to = to;
  s.terminal_at_ms = nowMs;
  s.terminal_input = input;
  log('handed_over', {
    delivery: s.spec.delivery,
    to,
    object: s.spec.object_id,
    delay_ms: nowMs - (s.answered_at_ms ?? nowMs),
    input_mode: input.input_mode,
    basis: input.input_mode_basis,
  });

  return 'direct';
}

/**
 * Leaves the object with the colleague who agreed to take it. Only the
 * permitted delegate, and only after their stated acceptance. Before the
 * closure this is the terminal outcome; after it, a late act kept apart.
 */
export function m10Delegate(
  s: M10State,
  to: M10Person,
  nowMs: number,
  input: ObservedInput,
  log: M10LogSink,
): M10ActResult {
  if (
    !m10Carrying(s) ||
    to !== s.spec.permitted_delegate ||
    s.delegate_accepted_at_ms === null
  ) {
    return 'refused';
  }

  if (s.closed_at_ms !== null) {
    s.late_act = {
      kind: 'late_delegation',
      to,
      at_ms: nowMs,
      after_closure_ms: nowMs - s.closed_at_ms,
    };
    log('late_delegation', {
      delivery: s.spec.delivery,
      to,
      for: s.spec.recipient,
      object: s.spec.object_id,
      after_closure_ms: nowMs - s.closed_at_ms,
      input_mode: input.input_mode,
      basis: input.input_mode_basis,
    });

    return 'late';
  }

  s.path = 'delegated';
  s.terminal_to = to;
  s.terminal_at_ms = nowMs;
  s.terminal_input = input;
  log('delegated', {
    delivery: s.spec.delivery,
    to,
    for: s.spec.recipient,
    object: s.spec.object_id,
    delay_ms: nowMs - (s.answered_at_ms ?? nowMs),
    input_mode: input.input_mode,
    basis: input.input_mode_basis,
  });

  return 'delegated';
}

/** The observation closed (terminal act, decline, or the record closure). */
export function m10Close(s: M10State, nowMs: number, reason: string) {
  if (s.closed_at_ms !== null) {
    return false;
  }

  if (s.answer === 'accept' && s.path === null) {
    s.path = 'unfulfilled_at_deadline';
  }

  s.closed_at_ms = nowMs;
  s.closure_reason = reason;

  return true;
}

/** Raw components for the delivery's window closure (a record, never a value). */
export function m10RawComponents(s: M10State, closureReason: string) {
  return {
    administration_version: M10_ENTRY_STATE_VERSION,
    delivery: s.spec.delivery,
    issuer: s.spec.issuer,
    recipient: s.spec.recipient,
    permitted_delegate: s.spec.permitted_delegate,
    object: s.spec.object_id,
    deadline: M10_DEADLINE,
    offered: s.presented_at_ms !== null,
    answer: s.answer,
    answer_position: s.answer_position,
    answer_input_mode: s.answer_input?.input_mode ?? null,
    presentations: s.presentations,
    refused_presses: s.refused_presses,
    interruption_shown: s.interruption_shown_at_ms !== null,
    interruption_acknowledged: s.interruption_acknowledged_at_ms !== null,
    exposures: { ...s.exposures },
    persons_present: s.presence.map((record) => ({ ...record })),
    recipient_prompts: s.recipient_prompts,
    delegate_accepted: s.delegate_accepted_at_ms !== null,
    path: s.answer === 'accept' ? s.path : null,
    terminal_to: s.terminal_to,
    delay_ms:
      s.terminal_at_ms === null || s.answered_at_ms === null
        ? null
        : s.terminal_at_ms - s.answered_at_ms,
    terminal_input_mode: s.terminal_input?.input_mode ?? null,
    closure_reason: closureReason,
  };
}

/**
 * Reload guard: true when an earlier page load already presented this
 * delivery's offer — it is then never offered again in this load.
 */
export function m10PriorAdministration(
  priorLoadEvents: readonly {
    event_type: string;
    metadata?: Record<string, unknown>;
  }[],
  delivery: M10Delivery,
): boolean {
  return priorLoadEvents.some(
    (event) =>
      event.event_type === `${M10_FAMILY}presented` &&
      event.metadata?.delivery === delivery,
  );
}
