/**
 * M10 feature extractor (Unit 15): `m10_obligations_fulfilled` =
 * deliveries handed to their recipient or left with the colleague who
 * agreed to take them / accepted, accessible deliveries (two planned; a
 * conditional-eligibility denominator — complete at any size above zero).
 * Read-only over the raw `proto_m10_delivery_*` events of the current page
 * load, recounted from the act events — the closure snapshot is only
 * compared, never trusted alone. Direct and delegated completions are
 * counted separately in the components and never merged with M11.
 *
 * Accessibility is objective: a delivery is accessible when its recipient
 * or its permitted delegate was recorded present (`person_present`) while
 * it was carried — after its acceptance and after its opportunity opened.
 * It never rests on the participant having opened the recipient's
 * conversation, the station log or a deliveries menu — their absence never
 * makes an accessible delivery inaccessible. An inaccessible delivery (no
 * presence record) is excluded, never failed.
 *
 * The invariants are conditional on the outcome claimed. Legitimate
 * missingness is never a technical failure: an offer never answered, a
 * declined delivery with no act, an accepted delivery still carried at the
 * deadline with no act, an accepted delivery with no presence record. Only
 * contradictory, malformed or unreproducible evidence is: an act before
 * acceptance, a handover or a delegation to the wrong person or with the
 * wrong object, a delegation without the delegate's stated acceptance, two
 * credited terminal acts, a closure snapshot that disagrees with the
 * recount, an unknown administration version — and, by the research
 * owner's rulings of the U15 closeout (register §5.256, §5.257), a
 * presence record that does not follow the delivery's acceptance and its
 * opening (it never establishes accessibility and never yields an observed
 * zero) and a delegation that does not name the delivery's own object. A
 * late act after the closure is kept apart and never changes the first
 * outcome.
 */
import type { RawGameEvent } from '../../systems/EventLogger';
import { registerEntry } from '../registerV3';
import {
  absentFeature,
  currentLoadEvents,
  emptyFeature,
  eventsOfType,
  fractionFeature,
  meta,
  registerFeatureExtractor,
  sequencesOf,
} from './extract';
import type { FeatureRecord } from './types';

const FAMILY = 'proto_m10_delivery_';
const VERSION = 'm10-deliveries-v1';

type Delivery = 'd1' | 'd2';

const DELIVERIES: readonly Delivery[] = ['d1', 'd2'];

/** The administration's fixed terms (mirrors `m10DeliveryModel.ts`). */
const TERMS: Record<
  Delivery,
  {
    issuer: string;
    recipient: string;
    permitted_delegate: string;
    object: string;
    defer_tag: string;
  }
> = {
  d1: {
    issuer: 'vale',
    recipient: 'kai',
    permitted_delegate: 'noor',
    object: 'm10_calibration_key_card',
    defer_tag: 'promise_defer',
  },
  d2: {
    issuer: 'noor',
    recipient: 'vale',
    permitted_delegate: 'kai',
    object: 'm10_yard_logbook',
    defer_tag: 'logbook_defer',
  },
};

type Status =
  | 'not_presented'
  | 'held_back'
  | 'unanswered'
  | 'declined'
  | 'open'
  | 'closed';

interface DeliveryRecord {
  delivery: Delivery;
  status: Status;
  issuer: string;
  recipient: string;
  permitted_delegate: string;
  object: string;
  answer: string | null;
  answer_input_mode: string | null;
  deferrals: number;
  accessible: boolean | null;
  accessibility_basis: string | null;
  persons_present: { person: string; role: string; zone: string }[];
  path: 'direct' | 'delegated' | 'unfulfilled_at_deadline' | null;
  terminal_to: string | null;
  delay_ms: number | null;
  input_mode: string | null;
  input_mode_basis: string | null;
  recipient_encounters: number;
  exposures: {
    after_interruption: number;
    station_log: number;
    deliveries_menu: number;
  };
  interruption: { shown: boolean; acknowledged: boolean };
  late_act: {
    kind: string;
    to: string | null;
    after_closure_ms: number | null;
  } | null;
  refused_presses: number;
  closure_reason: string | null;
}

const seq = (event: RawGameEvent) => event.sequence ?? 0;

/** One delivery's record recounted from its events, or the contradiction found. */
function analyse(
  delivery: Delivery,
  events: readonly RawGameEvent[],
  deferrals: number,
): DeliveryRecord | { failure: string } {
  const terms = TERMS[delivery];
  const of = (suffix: string) => eventsOfType(events, `${FAMILY}${suffix}`);
  const presented = of('presented');
  const answered = of('offer_answered');
  const closed = of('window_closed');
  const heldBack = of('technical_failure');
  const handed = of('handed_over');
  const delegated = of('delegated');
  const delegateAccepted = of('delegate_accepted');
  const late = [...of('late_handover'), ...of('late_delegation')].sort(
    (a, b) => seq(a) - seq(b),
  );
  const presence = of('person_present');
  const exposures = of('obligation_shown');
  const acts = [...handed, ...delegated, ...delegateAccepted, ...late];
  const failure = (reason: string) => ({ failure: `${delivery}: ${reason}` });

  const record: DeliveryRecord = {
    delivery,
    status: 'not_presented',
    issuer: terms.issuer,
    recipient: terms.recipient,
    permitted_delegate: terms.permitted_delegate,
    object: terms.object,
    answer: null,
    answer_input_mode: null,
    deferrals,
    accessible: null,
    accessibility_basis: null,
    persons_present: [],
    path: null,
    terminal_to: null,
    delay_ms: null,
    input_mode: null,
    input_mode_basis: null,
    recipient_encounters: 0,
    exposures: { after_interruption: 0, station_log: 0, deliveries_menu: 0 },
    interruption: {
      shown: of('interruption_shown').length > 0,
      acknowledged: of('interruption_acknowledged').length > 0,
    },
    late_act: null,
    refused_presses: of('press_refused').length,
    closure_reason: null,
  };

  // Research-owner ruling (U15 closeout): a presence record of a delivery
  // that is not accepted — never offered, never answered, declined — is
  // malformed evidence, never accessibility.
  const strayPresence = () =>
    failure('a presence record without an accepted delivery');

  if (presented.length === 0) {
    if (presence.length > 0) {
      return strayPresence();
    }

    if (heldBack.length > 0) {
      return { ...record, status: 'held_back' };
    }

    if (answered.length + acts.length > 0) {
      return failure('events without a presentation');
    }

    // Never offered (a review closure of the absent window may exist).
    return record;
  }

  if (presented.length > 1) {
    return failure('the offer was presented more than once');
  }

  if (answered.length > 1) {
    return failure('more than one terminal answer');
  }

  if (closed.length > 1) {
    return failure('the window closed more than once');
  }

  const closure = closed[0];
  const raw =
    closure === undefined
      ? undefined
      : (meta<{ path?: string | null; closure_reason?: string }>(
          closure,
          'raw_components',
        ) ??
        meta<{ path?: string | null; closure_reason?: string }>(
          closure,
          'raw_components_partial',
        ));

  record.closure_reason = raw?.closure_reason ?? null;

  const answer = answered[0];

  if (answer === undefined) {
    // Presented and never answered: no terminal answer, no obligation.
    if (acts.length > 0) {
      return failure('an act without an accepted delivery');
    }

    if (presence.length > 0) {
      return strayPresence();
    }

    return { ...record, status: 'unanswered' };
  }

  record.answer = meta<string>(answer, 'answer') ?? null;
  record.answer_input_mode = meta<string>(answer, 'input_mode') ?? null;

  if (record.answer === 'decline') {
    if (acts.length > 0) {
      return failure('an act on a declined delivery');
    }

    if (presence.length > 0) {
      return strayPresence();
    }

    return { ...record, status: 'declined' };
  }

  if (record.answer !== 'accept') {
    return failure('the answer is neither accept nor decline');
  }

  if (acts.some((act) => seq(act) <= seq(answer))) {
    return failure('an act before the acceptance');
  }

  // Research-owner ruling (U15 closeout): presence is evidence of access
  // only while the delivery is carried — after its acceptance AND after
  // its opportunity opened. A record before either is malformed evidence
  // and fails the item; it never establishes accessibility. (No presence
  // record at all stays legitimate: the delivery is then inaccessible and
  // excluded, below.)
  if (presence.some((event) => seq(event) <= seq(answer))) {
    return failure('a presence record before the acceptance');
  }

  const opening = of('opportunity_opened')[0];

  if (
    presence.some(
      (event) => opening === undefined || seq(event) <= seq(opening),
    )
  ) {
    return failure('a presence record before the opportunity opened');
  }

  const credited = [...handed, ...delegated];

  if (credited.length > 1) {
    return failure('two credited terminal acts');
  }

  const terminal = credited[0];

  if (
    terminal !== undefined &&
    closure !== undefined &&
    seq(terminal) >= seq(closure)
  ) {
    return failure('a terminal act recorded after the closure');
  }

  if (handed[0] !== undefined) {
    if (
      meta<string>(handed[0], 'to') !== terms.recipient ||
      meta<string>(handed[0], 'object') !== terms.object
    ) {
      return failure(
        'handed over to the wrong person or with the wrong object',
      );
    }

    record.path = 'direct';
  }

  if (delegated[0] !== undefined) {
    const stated = delegateAccepted.some(
      (event) =>
        meta<string>(event, 'delegate') === terms.permitted_delegate &&
        seq(event) < seq(delegated[0]),
    );

    if (meta<string>(delegated[0], 'to') !== terms.permitted_delegate) {
      return failure('delegated to someone who is not the permitted delegate');
    }

    if (!stated) {
      return failure("delegated without the delegate's stated acceptance");
    }

    // Research-owner ruling (U15 closeout): a delegation must name the
    // delivery's own object, exactly as a direct handover must.
    if (meta<string>(delegated[0], 'object') !== terms.object) {
      return failure('delegated with the wrong object');
    }

    record.path = 'delegated';
  }

  if (late.some((act) => closure === undefined || seq(act) <= seq(closure))) {
    return failure('a late act recorded before the closure');
  }

  if (terminal !== undefined) {
    record.terminal_to = meta<string>(terminal, 'to') ?? null;
    record.delay_ms = meta<number>(terminal, 'delay_ms') ?? null;
    record.input_mode = meta<string>(terminal, 'input_mode') ?? null;
    record.input_mode_basis = meta<string>(terminal, 'basis') ?? null;
  } else if (closure !== undefined) {
    record.path = 'unfulfilled_at_deadline';
  }

  if (
    closure !== undefined &&
    raw !== undefined &&
    raw.path !== undefined &&
    raw.path !== record.path
  ) {
    return failure('the closure snapshot disagrees with the recount');
  }

  // Everything below counts only what happened before the terminal point.
  const end = closure === undefined ? Number.POSITIVE_INFINITY : seq(closure);
  const before = (event: RawGameEvent) => seq(event) < end;

  record.persons_present = presence
    .filter(before)
    .filter((event) => {
      const person = meta<string>(event, 'person');

      return person === terms.recipient || person === terms.permitted_delegate;
    })
    .map((event) => ({
      person: meta<string>(event, 'person') ?? '',
      role: meta<string>(event, 'role') ?? '',
      zone: meta<string>(event, 'zone') ?? '',
    }));
  record.recipient_encounters = of('recipient_prompt_opened').filter(
    before,
  ).length;

  for (const exposure of exposures.filter(before)) {
    const channel = meta<keyof DeliveryRecord['exposures']>(
      exposure,
      'channel',
    );

    if (
      channel !== undefined &&
      channel in record.exposures &&
      meta<boolean>(exposure, 'rendered') !== false &&
      meta<boolean>(exposure, 'after_closure') !== true
    ) {
      record.exposures[channel] += 1;
    }
  }

  if (record.persons_present.length > 0) {
    record.accessible = true;
    record.accessibility_basis = 'person_present';
  } else if (terminal !== undefined) {
    record.accessible = true;
    record.accessibility_basis = 'terminal_act';
  } else {
    record.accessible = false;
    record.accessibility_basis = 'no_person_present';
  }

  if (late[0] !== undefined) {
    record.late_act = {
      kind: late[0].event_type.slice(FAMILY.length),
      to: meta<string>(late[0], 'to') ?? null,
      after_closure_ms: meta<number>(late[0], 'after_closure_ms') ?? null,
    };
  }

  return { ...record, status: closure === undefined ? 'open' : 'closed' };
}

registerFeatureExtractor('M10', (events, context) => {
  const entry = registerEntry('M10');
  const [primary] = entry.features;
  const load = currentLoadEvents(events, context);
  const family = load.filter((e) => e.event_type.startsWith(FAMILY));
  const supporting = sequencesOf(family);
  const fail = (reason: string): FeatureRecord[] => [
    emptyFeature('M10', primary, 'technical_failure', reason, {
      supporting_sequences: supporting,
      components: { administration_version: VERSION },
    }),
  ];

  if (family.length === 0) {
    return [
      absentFeature('M10', primary, context, 'no delivery offered', {
        components: { administration_version: VERSION },
      }),
    ];
  }

  if (
    family.some(
      (event) => meta<string>(event, 'entry_state_version') !== VERSION,
    )
  ) {
    return fail('an event of the family carries an unknown version');
  }

  if (
    family.some(
      (event) =>
        !(DELIVERIES as readonly string[]).includes(
          meta<string>(event, 'delivery') ?? '',
        ),
    )
  ) {
    return fail('an event of the family names no known delivery');
  }

  const records: DeliveryRecord[] = [];

  for (const delivery of DELIVERIES) {
    const result = analyse(
      delivery,
      family.filter((event) => meta<string>(event, 'delivery') === delivery),
      // A deferral is route telemetry only (never an answer).
      load.filter(
        (event) =>
          event.event_type === 'pilot_npc_beat' &&
          event.choice_value === TERMS[delivery].defer_tag,
      ).length,
    );

    if ('failure' in result) {
      return fail(result.failure);
    }

    records.push(result);
  }

  const by = (status: Status) =>
    records.filter((record) => record.status === status);
  const heldBack = by('held_back');
  const offered = records.filter(
    (record) =>
      record.status !== 'not_presented' && record.status !== 'held_back',
  );
  const accepted = by('closed');
  const eligible = accepted.filter((record) => record.accessible === true);
  const fulfilled = eligible.filter(
    (record) => record.path === 'direct' || record.path === 'delegated',
  );
  const components = {
    administration_version: VERSION,
    deliveries: Object.fromEntries(
      records.map((record) => [record.delivery, record]),
    ),
    offered: offered.length,
    accepted: accepted.length + by('open').length,
    declined: by('declined').length,
    unanswered: by('unanswered').length,
    held_back: heldBack.map((record) => record.delivery),
    inaccessible: accepted.filter((record) => record.accessible === false)
      .length,
    direct: eligible.filter((record) => record.path === 'direct').length,
    delegated: eligible.filter((record) => record.path === 'delegated').length,
    unfulfilled_at_deadline: eligible.filter(
      (record) => record.path === 'unfulfilled_at_deadline',
    ).length,
    late_acts: records.filter((record) => record.late_act !== null).length,
  };

  if (offered.length === 0) {
    if (heldBack.length > 0) {
      return [
        emptyFeature(
          'M10',
          primary,
          'interrupted',
          'delivery offered in an earlier page load; not re-run after the reload',
          { supporting_sequences: supporting, components },
        ),
      ];
    }

    return [
      absentFeature('M10', primary, context, 'no delivery offered', {
        supporting_sequences: supporting,
        components,
      }),
    ];
  }

  if (by('open').length > 0) {
    // An accepted delivery is still carried and the record not yet closed.
    return [
      emptyFeature('M10', primary, 'pending', 'a delivery is still open', {
        supporting_sequences: supporting,
        components,
      }),
    ];
  }

  const closedAtReview = records.some(
    (record) => record.closure_reason === 'closed_at_review',
  );
  const interrupted = heldBack.length > 0;

  return [
    fractionFeature(
      'M10',
      primary,
      fulfilled.length,
      eligible.length,
      eligible.map((record) => `m10_delivery_${record.delivery}`),
      supporting,
      interrupted
        ? {
            disposition: 'interrupted',
            reason: 'a delivery was held back after a reload',
          }
        : accepted.length > 0
          ? {
              disposition: 'no_eligible_event',
              reason: 'no accepted delivery was accessible',
            }
          : by('declined').length > 0
            ? {
                disposition: 'declined',
                reason: 'every answered offer declined',
              }
            : {
                disposition: 'no_eligible_event',
                reason: 'no delivery offer answered',
              },
      {
        closure_reason: closedAtReview ? 'closed_at_review' : 'completed',
        censored: interrupted,
        censor_reason: interrupted
          ? 'a delivery was held back after a reload'
          : null,
        ...(interrupted ? { disposition: 'interrupted' as const } : {}),
        components,
      },
    ),
  ] satisfies FeatureRecord[];
});
