/**
 * M02 feature extractor (Unit 13): `m02_correct_first_retrievals` =
 * requests whose FIRST committed answer is the requested case / 6 (a
 * planned-observations denominator — fewer than six answered ⇒
 * `incomplete`; Cannot locate is an incorrect answer inside the
 * denominator; an unanswered request is missing; a technically
 * inaccessible request is excluded), plus `m02_retrieval_latency`
 * (focused ms per answered request) and `m02_filing_layout` (the layout
 * at the handover). Read-only over the raw `proto_m02_workspace_*`
 * events: the count is recomputed from the `request_answered` events —
 * each checked against the request's own `request_presented` event, the
 * assigned order and the window's per-request record — and a record that
 * disagrees anywhere (a second answer to one request included) is a
 * technical failure, never a value. A workspace never handed over has no
 * request and is never a zero.
 */
import { registerEntry } from '../registerV3';
import {
  absentFeature,
  currentLoadEvents,
  emptyFeature,
  eventsOfType,
  fractionFeature,
  meta,
  observedFeature,
  registerFeatureExtractor,
  sequencesOf,
} from './extract';
import type { FeatureDisposition, FeatureRecord } from './types';

const FAMILY = 'proto_m02_workspace_';

interface M02RawRequest {
  request_index: number;
  requested_case: string;
  presented: boolean;
  accessible: boolean | null;
  answer_kind: string | null;
  picked_case: string | null;
  correct: boolean | null;
  open_focused_ms?: number | null;
  open_wall_ms?: number | null;
}

interface M02Raw {
  form: string;
  request_order: string;
  assigned_order: string[];
  realised_order: string[];
  handed_over: boolean;
  requests_planned: number;
  requests_presented: number;
  requests_answered: number;
  requests_inaccessible: number;
  request_open_at_closure: number | null;
  correct_first_retrievals: number;
  cannot_locate_count: number;
  wrong_selection_count: number;
  empty_selections: number;
  refused_presses: number;
  surface_closures: number;
  feedback_shown: boolean;
  move_count: number;
  label_changes: number;
  layout_at_handover: Record<string, unknown> | null;
  layout_at_closure: Record<string, unknown> | null;
  requests?: M02RawRequest[];
  closure_reason: string;
}

type Missing = Exclude<FeatureDisposition, 'observed' | 'incomplete'>;

registerFeatureExtractor('M02', (events, context) => {
  const entry = registerEntry('M02');
  const [primary, latency, layout] = entry.features;
  const load = currentLoadEvents(events, context);
  const family = load.filter((e) => e.event_type.startsWith(FAMILY));
  const supporting = sequencesOf(family);
  const presented = eventsOfType(load, `${FAMILY}presented`);
  const opened = eventsOfType(load, `${FAMILY}opportunity_opened`);
  const closed = eventsOfType(load, `${FAMILY}window_closed`);
  const failed = eventsOfType(load, `${FAMILY}technical_failure`);
  const answered = eventsOfType(load, `${FAMILY}request_answered`);
  const handedOver = eventsOfType(load, `${FAMILY}handed_over`);
  const requestPresented = eventsOfType(load, `${FAMILY}request_presented`);
  const inaccessible = eventsOfType(load, `${FAMILY}request_inaccessible`);
  // Evidence of an earlier page load (the reload rule): the workspace was
  // opened there, whatever this load shows.
  const openedEarlier = events.some(
    (event) =>
      event.event_type === `${FAMILY}opportunity_opened` &&
      event.page_load_index !== undefined &&
      event.page_load_index < context.pageLoadIndex,
  );
  const all = (
    disposition: Missing,
    reason: string,
    extra: Partial<FeatureRecord> = {},
  ) => [
    emptyFeature('M02', primary, disposition, reason, {
      supporting_sequences: supporting,
      ...extra,
    }),
    emptyFeature('M02', latency, disposition, reason, {
      closure_reason: extra.closure_reason ?? null,
    }),
    emptyFeature('M02', layout, disposition, reason, {
      closure_reason: extra.closure_reason ?? null,
    }),
  ];

  // A technical failure invalidates the observation whatever was opened:
  // the reload guard (held back, `interrupted`) or a fault of the
  // workspace itself (`technical_failure`). Never a low value.
  if (failed.length > 0) {
    const detail = meta<string>(failed[failed.length - 1], 'detail') ?? '';
    const reload = detail.startsWith('reload');

    return all(
      reload ? 'interrupted' : 'technical_failure',
      reload
        ? 'workspace opened in an earlier page load; not re-run after the reload'
        : `workspace fault: ${detail}`,
      {
        closure_reason: 'technical_failure',
        components: { requests_answered_before_fault: answered.length },
      },
    );
  }

  if (opened.length === 0) {
    if (openedEarlier) {
      return all(
        'interrupted',
        'workspace opened in an earlier page load; not opened again after the reload',
      );
    }

    if (presented.length > 0) {
      return all(
        'declined',
        'workspace listed by the work orders, never opened',
      );
    }

    return [
      absentFeature('M02', primary, context, 'case workspace never opened', {
        supporting_sequences: supporting,
      }),
      absentFeature('M02', latency, context, 'case workspace never opened'),
      absentFeature('M02', layout, context, 'case workspace never opened'),
    ];
  }

  const last = closed[closed.length - 1];
  const raw =
    last === undefined
      ? null
      : (meta<M02Raw>(last, 'raw_components') ??
        meta<M02Raw>(last, 'raw_components_partial') ??
        null);
  const exit = last === undefined ? null : meta<string>(last, 'exit_state');

  // Independent recount: one `request_answered` event per request, its
  // correctness recomputed from the requested and the selected case —
  // never the model's `correct` flag alone — and the requested case
  // itself checked against the request's presentation and the assigned
  // order below.
  const firstByRequest = new Map<number, (typeof answered)[number]>();

  for (const event of answered) {
    const index = meta<number>(event, 'request_index');

    if (index !== undefined && !firstByRequest.has(index)) {
      firstByRequest.set(index, event);
    }
  }

  const recount = [...firstByRequest.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, event]) => {
      const kind = meta<string>(event, 'answer_kind') ?? null;
      const requested = meta<string>(event, 'requested_case') ?? null;
      const picked = meta<string | null>(event, 'picked_case') ?? null;

      return {
        request_index: index,
        requested_case: requested,
        answer_kind: kind,
        picked_case: picked,
        correct: kind === 'pick' && requested !== null && picked === requested,
        focused_ms: meta<number>(event, 'focused_ms') ?? null,
        wall_ms: meta<number>(event, 'wall_ms') ?? null,
        excluded_total_ms: meta<number>(event, 'excluded_total_ms') ?? null,
        excluded_ms: meta<Record<string, number>>(event, 'excluded_ms') ?? null,
        presentations: meta<number>(event, 'presentations') ?? null,
        input_mode: meta<string>(event, 'input_mode') ?? null,
        sequence: event.sequence ?? null,
      };
    });
  const recountCorrect = recount.filter((row) => row.correct).length;

  if (raw === null) {
    const reason = 'workspace open, no closure yet';

    return all('pending', reason, {
      components: {
        handed_over: handedOver.length > 0,
        requests_answered_so_far: recount.length,
      },
    });
  }

  const closure =
    exit === 'closed_at_review'
      ? ('closed_at_review' as const)
      : ('completed' as const);
  const presentedCase = (index: number) => {
    const first = requestPresented.find(
      (event) => meta<number>(event, 'request_index') === index,
    );

    return first === undefined
      ? null
      : (meta<string>(first, 'requested_case') ?? null);
  };
  // Per request, not by totals: the answer's requested case is the one
  // presented for that request and the one the assigned order holds at
  // that position, the presentation precedes the answer, and the window's
  // own per-request record says the same.
  const perRequestAgrees = recount.every((row) => {
    const record = raw.requests?.find(
      (request) => request.request_index === row.request_index,
    );
    const shown = requestPresented.find(
      (event) => meta<number>(event, 'request_index') === row.request_index,
    );

    return (
      row.requested_case !== null &&
      row.requested_case === presentedCase(row.request_index) &&
      row.requested_case === raw.assigned_order[row.request_index] &&
      (shown?.sequence ?? 0) < (row.sequence ?? 0) &&
      record !== undefined &&
      record.requested_case === row.requested_case &&
      record.answer_kind === row.answer_kind &&
      (record.picked_case ?? null) === row.picked_case &&
      record.correct === row.correct
    );
  });
  const agrees =
    perRequestAgrees &&
    raw.requests_answered === recount.length &&
    raw.correct_first_retrievals === recountCorrect &&
    recount.length <= raw.requests_planned &&
    answered.length === firstByRequest.size &&
    raw.requests_inaccessible === inaccessible.length &&
    new Set(raw.assigned_order).size === raw.requests_planned;
  const openRequest =
    raw.request_open_at_closure === null
      ? null
      : (raw.requests?.find(
          (request) => request.request_index === raw.request_open_at_closure,
        ) ?? null);
  const components = {
    form: raw.form,
    request_order: raw.request_order,
    assigned_order: raw.assigned_order,
    realised_order: raw.realised_order,
    handed_over: raw.handed_over,
    requests_planned: raw.requests_planned,
    requests_presented: raw.requests_presented,
    requests_answered: raw.requests_answered,
    requests_inaccessible: raw.requests_inaccessible,
    request_open_at_closure: raw.request_open_at_closure,
    // Time already spent on the request left unanswered (censored; never
    // a latency of an answer).
    open_request_focused_ms: openRequest?.open_focused_ms ?? null,
    open_request_wall_ms: openRequest?.open_wall_ms ?? null,
    cannot_locate_count: raw.cannot_locate_count,
    wrong_selection_count: raw.wrong_selection_count,
    empty_selections: raw.empty_selections,
    refused_presses: raw.refused_presses,
    surface_closures: raw.surface_closures,
    feedback_shown: raw.feedback_shown,
    first_answers: recount.map((row) => ({
      request_index: row.request_index,
      requested_case: row.requested_case,
      answer_kind: row.answer_kind,
      picked_case: row.picked_case,
      correct: row.correct,
    })),
    correct_recount: recountCorrect,
    recount_agrees: agrees,
  };
  // The layout is read from the `handed_over` event itself (logged at
  // the handover, independent of the closing record), so a record that
  // disagrees about the ANSWERS does not void it.
  const handover = handedOver[0];
  const layoutRow =
    handover !== undefined
      ? observedFeature(
          'M02',
          layout,
          {
            case_location_at_close:
              meta<Record<string, unknown>>(
                handover,
                'case_location_at_close',
              ) ?? null,
            tray_labels:
              meta<Record<string, unknown>>(handover, 'tray_labels') ?? null,
            untraceable_case_count:
              meta<number>(handover, 'untraceable_case_count') ?? null,
            misfile_count: meta<number>(handover, 'misfile_count') ?? null,
            duplicate_count: meta<number>(handover, 'duplicate_count') ?? null,
            cases_left_on_intake:
              meta<number>(handover, 'cases_left_on_intake') ?? null,
            move_count: meta<number>(handover, 'move_count') ?? null,
            label_changes: meta<number>(handover, 'label_changes') ?? null,
          },
          {
            closure_reason: closure,
            supporting_sequences: sequencesOf(handedOver),
          },
        )
      : emptyFeature(
          'M02',
          layout,
          'no_eligible_event',
          'workspace closed before the handover: no layout was handed over',
          {
            closure_reason: closure,
            censored: true,
            censor_reason: 'closed before the handover',
            components: {
              layout_at_closure: raw.layout_at_closure,
              move_count: raw.move_count,
              label_changes: raw.label_changes,
            },
          },
        );

  if (!agrees) {
    const reason =
      'window record disagrees with the request_answered events recounted from the requested and selected cases';

    return [
      emptyFeature('M02', primary, 'technical_failure', reason, {
        closure_reason: closure,
        supporting_sequences: supporting,
        components,
      }),
      emptyFeature('M02', latency, 'technical_failure', reason, {
        closure_reason: closure,
      }),
      layoutRow,
    ];
  }

  const denominator = recount.length;
  // No request answered: never a zero. Without a handover no request was
  // ever presented; after one, the participant left before answering.
  const zero: { disposition: Missing; reason: string } = !raw.handed_over
    ? {
        disposition: 'no_eligible_event',
        reason:
          'workspace closed before the handover: no request was presented',
      }
    : {
        disposition: 'voluntary_stop',
        reason: 'handed over, left before any request was answered',
      };
  const short = denominator < raw.requests_planned;
  const censorReason = !short
    ? null
    : raw.requests_inaccessible > 0 &&
        denominator + raw.requests_inaccessible >= raw.requests_planned
      ? 'a requested case was technically inaccessible'
      : closure === 'closed_at_review'
        ? 'the review closed the workspace before every request was answered'
        : 'fewer requests answered than planned';
  const primaryRow = fractionFeature(
    'M02',
    primary,
    recountCorrect,
    denominator,
    recount.map((row) => `m02_request_${row.request_index + 1}`),
    supporting,
    zero,
    {
      closure_reason: closure,
      censored: short,
      censor_reason: censorReason,
      components,
    },
  );

  if (primaryRow.value === null) {
    // The latency companion is null with the primary.
    return [
      primaryRow,
      emptyFeature(
        'M02',
        latency,
        primaryRow.disposition as Missing,
        primaryRow.missing_reason ?? 'null with the primary',
        {
          closure_reason: closure,
          censored: primaryRow.censored,
          censor_reason: primaryRow.censor_reason,
        },
      ),
      layoutRow,
    ];
  }

  const latencyValue = Object.fromEntries(
    Array.from({ length: raw.requests_planned }, (_, index) => {
      const row = recount.find((r) => r.request_index === index);
      const record = raw.requests?.find(
        (request) => request.request_index === index,
      );

      return [
        `request_${index + 1}`,
        row === undefined
          ? {
              // No latency: never answered, or technically inaccessible.
              status:
                record?.accessible === false
                  ? 'inaccessible'
                  : record?.presented === true
                    ? 'presented_not_answered'
                    : 'not_presented',
              requested_case: record?.requested_case ?? null,
              focused_ms: null,
            }
          : {
              status: 'answered',
              requested_case: row.requested_case,
              answer_kind: row.answer_kind,
              focused_ms: row.focused_ms,
              wall_ms: row.wall_ms,
              excluded_total_ms: row.excluded_total_ms,
              excluded_ms: row.excluded_ms,
              presentations: row.presentations,
              input_mode: row.input_mode,
            },
      ];
    }),
  );

  return [
    primaryRow,
    observedFeature('M02', latency, latencyValue, {
      disposition: short ? 'incomplete' : 'observed',
      closure_reason: closure,
      censored: short,
      censor_reason: censorReason,
      included_ids: recount.map(
        (row) => `m02_request_${row.request_index + 1}`,
      ),
      supporting_sequences: sequencesOf(answered),
    }),
    layoutRow,
  ] satisfies FeatureRecord[];
});
