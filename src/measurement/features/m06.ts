/**
 * M06 feature extractor (Unit 7): `m06_unique_correct_orders` = distinct
 * orders whose matching dispatch fell inside the one standard 60-second
 * focused work budget (0–12), recounted from the `order_dispatched`
 * events and cross-checked against the window's record; plus
 * `m06_work_period_detail` (first-pass accuracy, rework, skips, invalid
 * dispatches, actual stop time, stop kind, per-order records). Read-only
 * over the raw `proto_m06_orders_*` events. A period never begun is null
 * (never a zero); an explicit early stop keeps the value with the budget
 * as its denominator; a review-closed open period is a censored value.
 */
import { type M06Form, m06OrdersFor } from '../../pilot/windows/m06OrdersModel';
import { registerEntry } from '../registerV3';
import {
  absentFeature,
  currentLoadEvents,
  emptyFeature,
  eventsOfType,
  meta,
  observedFeature,
  registerFeatureExtractor,
  sequencesOf,
} from './extract';
import type { FeatureRecord } from './types';

interface M06Raw {
  form: string;
  practice_attempts: number;
  practice_passed: boolean;
  ready_shown: boolean;
  refused_presses: number;
  period_begun: boolean;
  budget_ms: number;
  orders_planned: number;
  orders_presented: number;
  orders_handled: number;
  orders_attempted: number;
  unique_correct_orders: number;
  first_pass_correct: number;
  first_pass_accuracy: number | null;
  rework_dispatches: number;
  invalid_dispatches: number;
  orders_skipped: number;
  stop_kind: string | null;
  actual_stop_focused_ms: number | null;
  focused_ms: number | null;
  wall_ms: number | null;
  excluded_ms: Record<string, number> | null;
  buffer_discarded_at_end: string[] | null;
  practice_wall_ms?: number | null;
  dispatch_input_modes?: Record<string, number>;
  resumptions?: unknown[];
  budget_overrun_ms?: number | null;
  tokens_removed?: number;
  stop_arm_presses?: number;
  token_presses: number;
  clears: number;
  reference_consults: number;
  typed_lines: number;
  orders?: unknown[];
  closure_reason: string;
}

registerFeatureExtractor('M06', (events, context) => {
  const entry = registerEntry('M06');
  const [primary, detail] = entry.features;
  const load = currentLoadEvents(events, context);
  const family = load.filter((e) =>
    e.event_type.startsWith('proto_m06_orders_'),
  );
  const supporting = sequencesOf(family);
  const presented = eventsOfType(load, 'proto_m06_orders_presented');
  const opened = eventsOfType(load, 'proto_m06_orders_opportunity_opened');
  const closed = eventsOfType(load, 'proto_m06_orders_window_closed');
  const heldBack = eventsOfType(load, 'proto_m06_orders_technical_failure');
  const dispatched = eventsOfType(load, 'proto_m06_orders_order_dispatched');
  // Independent recount (review U4 S-F1 precedent, U7 S-F11): distinct
  // orders whose dispatch inside the budget MATCHES the form's order line
  // — re-checked against the form itself, never the model's `correct`
  // flag alone.
  const recount = (form: string | undefined) => {
    const lines =
      form === 'form_a' || form === 'form_b'
        ? m06OrdersFor(form as M06Form)
        : null;
    const correct = new Set<number>();

    for (const event of dispatched) {
      const index = meta<number>(event, 'order_index');
      const line = meta<string[]>(event, 'line');

      if (
        index === undefined ||
        line === undefined ||
        meta<boolean>(event, 'within_budget') !== true ||
        lines === null
      ) {
        continue;
      }

      const expected = lines[index];

      if (
        expected !== undefined &&
        line.length === 3 &&
        line.every((token, i) => token === expected[i])
      ) {
        correct.add(index);
      }
    }

    return correct;
  };

  if (opened.length === 0) {
    if (heldBack.length > 0) {
      const reason =
        'console opened in an earlier page load; not re-run after the reload';

      return [
        emptyFeature('M06', primary, 'interrupted', reason, {
          supporting_sequences: supporting,
        }),
        emptyFeature('M06', detail, 'interrupted', reason),
      ];
    }

    if (presented.length > 0) {
      const reason = 'console listed by the work orders, never opened';

      return [
        emptyFeature('M06', primary, 'declined', reason, {
          supporting_sequences: supporting,
        }),
        emptyFeature('M06', detail, 'declined', reason),
      ];
    }

    return [
      absentFeature('M06', primary, context, 'dispatch console never opened', {
        supporting_sequences: supporting,
      }),
      absentFeature('M06', detail, context, 'dispatch console never opened'),
    ];
  }

  const last = closed[closed.length - 1];
  const raw =
    last === undefined
      ? null
      : (meta<M06Raw>(last, 'raw_components') ??
        meta<M06Raw>(last, 'raw_components_partial') ??
        null);
  const exit = last === undefined ? null : meta<string>(last, 'exit_state');

  if (raw === null) {
    return [
      emptyFeature('M06', primary, 'pending', 'console open, no closure yet', {
        supporting_sequences: supporting,
      }),
      emptyFeature('M06', detail, 'pending', 'console open, no closure yet'),
    ];
  }

  const closure =
    exit === 'closed_at_review'
      ? 'closed_at_review'
      : raw.closure_reason === 'voluntary_stop'
        ? 'voluntary_stop'
        : 'completed';
  const correctInBudget = recount(raw.form);
  const components = {
    form: raw.form,
    stop_kind: raw.stop_kind,
    budget_ms: raw.budget_ms,
    practice_passed: raw.practice_passed,
    practice_wall_ms: raw.practice_wall_ms ?? null,
    ready_shown: raw.ready_shown,
    refused_presses: raw.refused_presses,
    orders_planned: raw.orders_planned,
    orders_presented: raw.orders_presented,
    orders_handled: raw.orders_handled,
    orders_attempted: raw.orders_attempted,
    actual_stop_focused_ms: raw.actual_stop_focused_ms,
    exposure_focused_ms: raw.focused_ms,
    wall_ms: raw.wall_ms,
    excluded_ms: raw.excluded_ms,
    budget_overrun_ms: raw.budget_overrun_ms ?? null,
    resumptions: raw.resumptions ?? [],
    dispatch_input_modes: raw.dispatch_input_modes ?? null,
    unique_correct_recount: correctInBudget.size,
    recount_agrees: correctInBudget.size === raw.unique_correct_orders,
  };

  // The period never began: no work budget was ever opened — null, never
  // a zero. The ready screen shown and Begin never pressed is a decision
  // (`declined`); practice abandoned is no eligible event (review U7 S-F10).
  if (!raw.period_begun) {
    const declined = raw.ready_shown;
    const reason = declined
      ? `ready screen shown, the work period never begun${exit === 'closed_at_review' ? ' (closed at the review)' : ''}`
      : `console left before the practice criterion (${raw.practice_attempts} practice ${raw.practice_attempts === 1 ? 'dispatch' : 'dispatches'})${exit === 'closed_at_review' ? ' — closed at the review' : ''}`;
    const disposition = declined ? 'declined' : 'no_eligible_event';

    return [
      emptyFeature('M06', primary, disposition, reason, {
        closure_reason: closure,
        censored: !declined,
        censor_reason: declined ? null : 'work period never begun',
        supporting_sequences: supporting,
        components,
      }),
      emptyFeature('M06', detail, disposition, reason, {
        closure_reason: closure,
        supporting_sequences: supporting,
      }),
    ];
  }

  // A period the review closed while open ran less than its budget: the
  // count is exported with its exposure under `incomplete`, never as a
  // complete 60 s observation (review U7 S-F4).
  const censored = closure === 'closed_at_review';
  const primaryExtra: Partial<FeatureRecord> = {
    numerator: raw.unique_correct_orders,
    denominator: null,
    closure_reason: closure,
    censored,
    censor_reason: censored
      ? `review closed an open work period after ${raw.focused_ms ?? 'unknown'} focused ms of ${raw.budget_ms}`
      : null,
    included_ids: ['m06_orders_w1'],
    supporting_sequences: supporting,
    components,
  };
  const agrees = correctInBudget.size === raw.unique_correct_orders;
  const primaryRow = agrees
    ? observedFeature('M06', primary, raw.unique_correct_orders, {
        ...primaryExtra,
        disposition: censored ? 'incomplete' : 'observed',
      })
    : emptyFeature(
        'M06',
        primary,
        'technical_failure',
        'window record disagrees with the order_dispatched events re-checked against the form',
        { ...primaryExtra, numerator: null },
      );

  if (!agrees) {
    // The companion is null with the primary (register: "null with the
    // primary"; review U7 S-F3).
    return [
      primaryRow,
      emptyFeature(
        'M06',
        detail,
        'technical_failure',
        'window record disagrees with the order_dispatched events',
        { closure_reason: closure, supporting_sequences: supporting },
      ),
    ];
  }

  const detailValue = {
    first_pass_correct: raw.first_pass_correct,
    first_pass_accuracy: raw.first_pass_accuracy,
    rework_dispatches: raw.rework_dispatches,
    invalid_dispatches: raw.invalid_dispatches,
    orders_skipped: raw.orders_skipped,
    orders_attempted: raw.orders_attempted,
    orders_handled: raw.orders_handled,
    actual_stop_focused_ms: raw.actual_stop_focused_ms,
    stop_kind: raw.stop_kind,
    budget_ms: raw.budget_ms,
    practice_attempts: raw.practice_attempts,
    refused_presses: raw.refused_presses,
    token_presses: raw.token_presses,
    tokens_removed: raw.tokens_removed ?? null,
    stop_arm_presses: raw.stop_arm_presses ?? null,
    dispatch_input_modes: raw.dispatch_input_modes ?? null,
    resumptions: raw.resumptions ?? [],
    clears: raw.clears,
    reference_consults: raw.reference_consults,
    typed_lines: raw.typed_lines,
    buffer_discarded_at_end: raw.buffer_discarded_at_end,
    orders: raw.orders ?? null,
  };

  return [
    primaryRow,
    observedFeature('M06', detail, detailValue, {
      closure_reason: closure,
      censored,
      supporting_sequences: supporting,
    }),
  ];
});
