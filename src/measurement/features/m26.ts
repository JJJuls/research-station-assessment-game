/**
 * M26 feature extractor (Unit 12): `m26_postknowledge_retries` = Post A
 * transmissions attempted inside the post-knowledge continuation — the
 * 30 s focused window that opens only when the expected-outcome check is
 * PASSED (the first retry included; the v2 first-probe exclusion is
 * retired); `m26_postknowledge_retries_minus_first` = max(count − 1, 0),
 * the predeclared sensitivity count; `m26_unqualified_retries` = the
 * preserved pre-knowledge behaviour (Post A attempts after the disconnect
 * before a pass or after a fail), the check's own record and the switch /
 * exit / cap status — a companion object, never a post-knowledge score. A
 * channel never disconnected ⇒ null (no boundary arose); a boundary whose
 * check was never decided ⇒ null (`interrupted`); a failed check ⇒ null
 * (`understanding_failed`); the cap and the review censor the count (its
 * value kept). Read-only over the raw `proto_m26_uplink_*` events; the
 * count is recounted from the `postknowledge_retry` events (a disagreeing
 * record ⇒ technical_failure).
 */
import type { KnowledgeStatus } from '../protocol';
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

const FAMILY = 'proto_m26_uplink_';

interface M26Raw {
  disconnect_demonstrated: boolean;
  knowledge_status: KnowledgeStatus;
  attempts: { attempt: number; correct: boolean }[];
  first_answer_correct: boolean | null;
  explanation_shown: boolean;
  explanation_reading_ms?: number | null;
  refused_presses: number;
  postknowledge_retries: number;
  postknowledge_retries_minus_first: number;
  postknowledge_retry_focused_ms: number[];
  postknowledge_retries_after_delivery: number;
  pre_knowledge_attempts: number;
  attempts_after_fail: number;
  continuation_opened: boolean;
  continuation_closure: string | null;
  continuation_focused_ms: number | null;
  continuation_wall_ms: number | null;
  continuation_cap_ms: number;
  cap_reached: boolean;
  retry_in_progress_at_cap: boolean;
  switch_in_progress_at_cap?: boolean;
  steps_away_in_continuation?: number;
  reports_delivered_at_open?: number | null;
  report_pending_at_close?: boolean;
  exited: boolean;
  alternative_used: boolean;
  alternative_used_postknowledge: number;
  b_transmissions_after_disconnect: number;
  evidence_views: number;
  all_reports_delivered: boolean;
  departures: number;
  stop_choice: string | null;
}

registerFeatureExtractor('M26', (events, context) => {
  const entry = registerEntry('M26');
  const [primary, sensitivity, companion] = entry.features;
  const load = currentLoadEvents(events, context);
  const family = load.filter((e) => e.event_type.startsWith(FAMILY));
  const supporting = sequencesOf(family);
  const presented = eventsOfType(load, `${FAMILY}presented`);
  const opened = eventsOfType(load, `${FAMILY}opportunity_opened`);
  const closed = eventsOfType(load, `${FAMILY}window_closed`);
  const failed = eventsOfType(load, `${FAMILY}technical_failure`);
  const retries = eventsOfType(load, `${FAMILY}postknowledge_retry`);
  const answered = eventsOfType(load, `${FAMILY}understanding_answered`);
  const all = (
    disposition: Exclude<
      FeatureRecord['disposition'],
      'observed' | 'incomplete'
    >,
    reason: string,
    extra: Partial<FeatureRecord> = {},
  ): FeatureRecord[] => [
    emptyFeature('M26', primary, disposition, reason, {
      supporting_sequences: supporting,
      ...extra,
    }),
    emptyFeature('M26', sensitivity, disposition, reason, extra),
    emptyFeature('M26', companion, disposition, reason, extra),
  ];

  if (opened.length === 0) {
    if (presented.length > 0) {
      return all('declined', 'uplink post opened, never powered up');
    }

    return [
      absentFeature('M26', primary, context, 'uplink never powered up', {
        supporting_sequences: supporting,
      }),
      absentFeature('M26', sensitivity, context, 'uplink never powered up'),
      absentFeature('M26', companion, context, 'uplink never powered up'),
    ];
  }

  if (failed.length > 0) {
    return all(
      'technical_failure',
      'technical failure closed the uplink window',
      {
        closure_reason: 'technical_failure',
      },
    );
  }

  const last = closed[closed.length - 1];
  const raw =
    last === undefined
      ? null
      : (meta<M26Raw>(last, 'raw_components') ??
        meta<M26Raw>(last, 'raw_components_partial') ??
        null);
  const exit = last === undefined ? null : meta<string>(last, 'exit_state');

  if (raw === null) {
    return all('pending', 'uplink window open, no closure yet');
  }

  const closure: FeatureRecord['closure_reason'] =
    exit === 'closed_at_review'
      ? 'closed_at_review'
      : raw.continuation_closure === 'cap'
        ? 'cap'
        : raw.continuation_closure === 'voluntary_stop'
          ? 'voluntary_stop'
          : raw.continuation_closure === 'route_departure' ||
              exit === 'departed'
            ? 'route_departure'
            : 'completed';
  const attempts = answered.map((event) => ({
    attempt: meta<number>(event, 'attempt') ?? null,
    form: meta<string>(event, 'form') ?? null,
    response: meta<string>(event, 'response') ?? null,
    position: meta<number>(event, 'position') ?? null,
    correct: meta<boolean>(event, 'correct') ?? null,
    latency_ms: meta<number>(event, 'latency_ms') ?? null,
    refused_presses_before:
      meta<number>(event, 'refused_presses_before') ?? null,
  }));
  // The check's record must agree with its own events.
  if (attempts.length !== raw.attempts.length) {
    return all(
      'technical_failure',
      'window record disagrees with the understanding_answered events',
      { closure_reason: closure },
    );
  }

  const companionValue = {
    knowledge_status: raw.knowledge_status,
    disconnect_demonstrated: raw.disconnect_demonstrated,
    evidence_views: raw.evidence_views,
    check_attempts: attempts,
    first_answer_correct: raw.first_answer_correct,
    explanation_shown: raw.explanation_shown,
    explanation_reading_ms: raw.explanation_reading_ms ?? null,
    refused_presses: raw.refused_presses,
    pre_knowledge_attempts: raw.pre_knowledge_attempts,
    attempts_after_fail: raw.attempts_after_fail,
    b_transmissions_after_disconnect: raw.b_transmissions_after_disconnect,
    alternative_used_postknowledge: raw.alternative_used_postknowledge,
    switch: raw.alternative_used,
    exit: raw.exited,
    cap: raw.cap_reached,
    continuation_closure: raw.continuation_closure,
    closure_reason: closure,
    all_reports_delivered: raw.all_reports_delivered,
    departures: raw.departures,
  };
  const companionRow = observedFeature('M26', companion, companionValue, {
    closure_reason: closure,
    supporting_sequences: supporting,
    components: { record_agrees: attempts.length === raw.attempts.length },
  });
  const nullPair = (
    disposition: Exclude<
      FeatureRecord['disposition'],
      'observed' | 'incomplete'
    >,
    reason: string,
    censored: boolean,
    censorReason: string | null,
    boundary: 'not_reached' | 'untested' | 'check_incomplete' | 'failed',
  ): FeatureRecord[] => [
    emptyFeature('M26', primary, disposition, reason, {
      closure_reason: closure,
      censored,
      censor_reason: censorReason,
      supporting_sequences: supporting,
      components: {
        knowledge_status: raw.knowledge_status,
        // Why the count is null, as a structured field (an untested
        // boundary shares `interrupted` with the after-reload case).
        boundary,
        window_detail:
          (raw as unknown as { invalid_detail?: string }).invalid_detail ??
          null,
      },
    }),
    emptyFeature('M26', sensitivity, disposition, reason, {
      closure_reason: closure,
      censored,
      censor_reason: censorReason,
      components: { knowledge_status: raw.knowledge_status, boundary },
    }),
    companionRow,
  ];

  if (!raw.disconnect_demonstrated) {
    return nullPair(
      'no_eligible_event',
      exit === 'closed_at_review'
        ? 'channel never disconnected before the review (no knowledge boundary arose)'
        : 'channel never disconnected (no knowledge boundary arose)',
      true,
      'no successful transmission; the disconnect never happened',
      'not_reached',
    );
  }

  if (raw.knowledge_status === 'unknown') {
    return nullPair(
      'interrupted',
      'disconnect demonstrated, expected-outcome check never decided',
      true,
      'the check was never decided before the closure',
      raw.attempts.length > 0 ? 'check_incomplete' : 'untested',
    );
  }

  if (raw.knowledge_status === 'fail') {
    return nullPair(
      'understanding_failed',
      'expected-outcome check failed after the explanation; attempts kept as unqualified',
      false,
      null,
      'failed',
    );
  }

  const censored = closure === 'cap' || closure === 'closed_at_review';
  const primaryExtra: Partial<FeatureRecord> = {
    numerator: raw.postknowledge_retries,
    closure_reason: closure,
    censored,
    censor_reason:
      closure === 'cap'
        ? 'focused cap reached'
        : closure === 'closed_at_review'
          ? 'review reached'
          : null,
    included_ids: Array.from(
      { length: raw.postknowledge_retries },
      (_, i) => `m26_postknowledge_retry_${i + 1}`,
    ),
    supporting_sequences: supporting,
    components: {
      knowledge_status: raw.knowledge_status,
      pass_kind:
        raw.knowledge_status === 'pass_first' ? 'first' : 'after_explanation',
      continuation_focused_ms: raw.continuation_focused_ms,
      continuation_wall_ms: raw.continuation_wall_ms,
      continuation_cap_ms: raw.continuation_cap_ms,
      retry_focused_ms: raw.postknowledge_retry_focused_ms,
      retries_after_delivery: raw.postknowledge_retries_after_delivery,
      retry_in_progress_at_cap: raw.retry_in_progress_at_cap,
      switch_in_progress_at_cap: raw.switch_in_progress_at_cap ?? false,
      steps_away_in_continuation: raw.steps_away_in_continuation ?? 0,
      // The entry state of the continuation: a retry with both reports
      // delivered is a carrier check, not a report attempt.
      reports_delivered_at_open: raw.reports_delivered_at_open ?? null,
      report_pending_at_close: raw.report_pending_at_close ?? null,
      switch: raw.alternative_used,
      exit: raw.exited,
      cap: raw.cap_reached,
      recount: retries.length,
      recount_agrees: retries.length === raw.postknowledge_retries,
    },
  };

  if (retries.length !== raw.postknowledge_retries) {
    const reason =
      'uplink record disagrees with the postknowledge_retry events';

    return [
      emptyFeature('M26', primary, 'technical_failure', reason, {
        ...primaryExtra,
        numerator: null,
      }),
      emptyFeature('M26', sensitivity, 'technical_failure', reason, {
        closure_reason: closure,
      }),
      companionRow,
    ];
  }

  return [
    observedFeature('M26', primary, raw.postknowledge_retries, primaryExtra),
    observedFeature(
      'M26',
      sensitivity,
      Math.max(0, raw.postknowledge_retries - 1),
      {
        numerator: Math.max(0, raw.postknowledge_retries - 1),
        closure_reason: closure,
        censored,
        censor_reason: primaryExtra.censor_reason ?? null,
        supporting_sequences: supporting,
        components: { derived_from: 'm26_postknowledge_retries' },
      },
    ),
    companionRow,
  ];
});
