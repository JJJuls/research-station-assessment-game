/**
 * M24 feature extractor (Unit 12): `m24_postknowledge_casts` = rig cycles
 * committed inside the post-knowledge continuation — the 30 s focused
 * window that opens only when the expected-outcome check is PASSED (the
 * first cast included); `m24_postknowledge_casts_minus_first` =
 * max(count − 1, 0), the predeclared sensitivity count;
 * `m24_unqualified_casts` = the preserved pre-knowledge behaviour (casts
 * after the depletion before a pass or after a fail), the check's own
 * record and the switch / exit / cap status — a companion object, never a
 * post-knowledge score. A never-depleted deck ⇒ null (no boundary arose);
 * a boundary whose check was never decided ⇒ null (`interrupted`); a
 * failed check ⇒ null (`understanding_failed`); the cap and the review
 * censor the count (its value kept). Read-only over the raw
 * `proto_m24_rig_*` events; the count is recounted from the
 * `postknowledge_cast` events (a disagreeing record ⇒ technical_failure).
 *
 * Reload (U24 RL-3, `RELOAD-CORRECTION-SPEC-r3-exec.md` §2, §4 G5 and §5):
 * the load's `prior_load_checked` record classifies the rig H / A / U / M
 * (stage 1 the yard briefing, stage 2 the panel's `presented`, stage 3
 * `opportunity_opened`). A held rig reads `interrupted` on all three rows
 * with its class's reason; under A the first-load readings apply
 * (`declined` / `not_presented`); a panel opened in a reloaded load without
 * its check, the tally never begun, is U (RL-1C decision A). The record is
 * never task evidence.
 */
import type { KnowledgeStatus } from '../protocol';
import { registerEntry } from '../registerV3';
import {
  classifyReload,
  computePriorLoadCheck,
  PRIOR_LOAD_CHECK_SUFFIX,
  type PriorLoadCheck,
  type ReloadClassification,
  type ReloadEvent,
  type ReloadHistoryIntegrity,
  reloadHoldBackClass,
  ROW_OCCASION,
  withoutPriorLoadChecks,
} from '../reloadCheck';
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

const FAMILY = 'proto_m24_rig_';

interface M24Raw {
  depletion_reached: boolean;
  depletion_shown_count: number;
  knowledge_status: KnowledgeStatus;
  attempts: {
    attempt: number;
    form: string;
    response: string;
    position: number;
    correct: boolean;
    latency_ms: number;
    refused_presses_before: number;
  }[];
  first_answer_correct: boolean | null;
  explanation_shown: boolean;
  explanation_reading_ms?: number | null;
  refused_presses: number;
  postknowledge_casts: number;
  postknowledge_casts_minus_first: number;
  postknowledge_cast_focused_ms: number[];
  casts_pre_knowledge: number;
  casts_after_fail: number;
  postdepletion_casts: number;
  continuation_opened: boolean;
  continuation_closure: string | null;
  continuation_focused_ms: number | null;
  continuation_wall_ms: number | null;
  continuation_cap_ms: number;
  cap_reached: boolean;
  cast_in_progress_at_cap: boolean;
  alternative_in_progress_at_cap?: boolean;
  steps_away_in_continuation?: number;
  exited: boolean;
  alternative_used: boolean;
  alternative_used_postknowledge: number;
  alternative_used_pre_knowledge: number;
  alternative_used_pre_depletion: number;
  cycles_committed: number;
  useful_outcomes: number;
  departures: number;
  stop_choice: string | null;
}

/**
 * The load's reload check (U24 RL-3; r1 §1 stage map, confirmed against the
 * code): stage 1 the yard briefing (the route's advance to `exterior_work`
 * — no M24 record), stage 2 the rig panel's `presented`, stage 3 the
 * tally's `opportunity_opened`, the row's hold-back markers. Null on a
 * first load.
 */
export function m24PriorLoadCheck(
  pageLoadIndex: number,
  priorLoadEvents: readonly ReloadEvent[],
  integrity: ReloadHistoryIntegrity,
): PriorLoadCheck | null {
  return computePriorLoadCheck({
    pageLoadIndex,
    priorLoadEvents,
    integrity,
    stages: {
      briefing: (event) =>
        event.event_type === 'pilot_stage_advanced' &&
        event.metadata?.to === 'exterior_work',
      presentation: (event) => event.event_type === `${FAMILY}presented`,
      opening: (event) => event.event_type === `${FAMILY}opportunity_opened`,
      holdBack: (event) => event.event_type === `${FAMILY}technical_failure`,
    },
  });
}

/** The rig's class from the load's check records (r3 §2). */
export function classifyM24Reload(
  pageLoadIndex: number,
  checks: readonly object[],
): ReloadClassification {
  return classifyReload({ pageLoadIndex, checks });
}

/** The current-load reason of a held rig, by its class. */
const HELD_REASON = {
  H: 'magnet rig begun in an earlier page load; not re-run after the reload',
  U: 'magnet rig not administered after a reload: earlier history not verified',
  M: 'magnet rig not administered after a reload: earlier check contradictory',
} as const;

registerFeatureExtractor('M24', (events, context) => {
  const entry = registerEntry('M24');
  const [primary, sensitivity, companion] = entry.features;
  const load = currentLoadEvents(events, context);
  const own = load.filter((e) => e.event_type.startsWith(FAMILY));
  const family = withoutPriorLoadChecks(own, FAMILY);
  const supporting = sequencesOf(family);
  const presented = eventsOfType(load, `${FAMILY}presented`);
  const opened = eventsOfType(load, `${FAMILY}opportunity_opened`);
  const closed = eventsOfType(load, `${FAMILY}window_closed`);
  const failed = eventsOfType(load, `${FAMILY}technical_failure`);
  const reload = classifyM24Reload(
    context.pageLoadIndex,
    eventsOfType(own, `${FAMILY}${PRIOR_LOAD_CHECK_SUFFIX}`).map(
      (event) => event.metadata ?? {},
    ),
  );
  const cls = reload.occasions[ROW_OCCASION].class;
  const casts = eventsOfType(load, `${FAMILY}postknowledge_cast`);
  const answered = eventsOfType(load, `${FAMILY}understanding_answered`);
  const all = (
    disposition: Exclude<
      FeatureRecord['disposition'],
      'observed' | 'incomplete'
    >,
    reason: string,
    extra: Partial<FeatureRecord> = {},
  ): FeatureRecord[] => [
    emptyFeature('M24', primary, disposition, reason, {
      supporting_sequences: supporting,
      ...extra,
    }),
    emptyFeature('M24', sensitivity, disposition, reason, extra),
    emptyFeature('M24', companion, disposition, reason, extra),
  ];

  // A malformed check record stays under the existing rule (r3 §2;
  // §5.290 (a)): a technical failure, never uncertain history.
  if (reload.check_malformed) {
    return all(
      'technical_failure',
      'a reload check record describes another page load',
    );
  }

  if (opened.length === 0) {
    // The hold-back of this load (U24 RL-3): its marker names the class.
    const marker = failed
      .map((event) => reloadHoldBackClass(meta<unknown>(event, 'detail')))
      .find((marked) => marked !== null);

    if (marker !== undefined && marker !== null) {
      return all('interrupted', HELD_REASON[marker]);
    }

    // After a reload a rig whose class is not A is held: with a check
    // always; without one once its panel was opened in this load (U,
    // RL-1C decision A).
    if (
      reload.page_reloaded &&
      cls !== 'A' &&
      (reload.check_count > 0 || presented.length > 0)
    ) {
      return all('interrupted', HELD_REASON[cls ?? 'U']);
    }

    if (presented.length > 0) {
      return all('declined', 'rig panel opened, tally never begun');
    }

    // An established absence takes the first-load reading (r3 §5).
    if (cls === 'A') {
      return all('not_presented', 'magnet rig never begun');
    }

    return [
      absentFeature('M24', primary, context, 'magnet rig never begun', {
        supporting_sequences: supporting,
      }),
      absentFeature('M24', sensitivity, context, 'magnet rig never begun'),
      absentFeature('M24', companion, context, 'magnet rig never begun'),
    ];
  }

  if (failed.length > 0) {
    return all('technical_failure', 'technical failure closed the rig window', {
      closure_reason: 'technical_failure',
    });
  }

  const last = closed[closed.length - 1];
  const raw =
    last === undefined
      ? null
      : (meta<M24Raw>(last, 'raw_components') ??
        meta<M24Raw>(last, 'raw_components_partial') ??
        null);
  const exit = last === undefined ? null : meta<string>(last, 'exit_state');

  if (raw === null) {
    return all('pending', 'rig window open, no closure yet');
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
  // The check's own record, recounted from the answered events.
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
    depletion_reached: raw.depletion_reached,
    depletion_shown_count: raw.depletion_shown_count,
    check_attempts: attempts,
    first_answer_correct: raw.first_answer_correct,
    explanation_shown: raw.explanation_shown,
    explanation_reading_ms: raw.explanation_reading_ms ?? null,
    refused_presses: raw.refused_presses,
    casts_pre_knowledge: raw.casts_pre_knowledge,
    casts_after_fail: raw.casts_after_fail,
    postdepletion_casts: raw.postdepletion_casts,
    alternative_used_pre_knowledge: raw.alternative_used_pre_knowledge,
    alternative_used_postknowledge: raw.alternative_used_postknowledge,
    switch: raw.alternative_used,
    exit: raw.exited,
    cap: raw.cap_reached,
    continuation_closure: raw.continuation_closure,
    closure_reason: closure,
    cycles_committed: raw.cycles_committed,
    useful_outcomes: raw.useful_outcomes,
    departures: raw.departures,
  };
  const companionRow = observedFeature('M24', companion, companionValue, {
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
    emptyFeature('M24', primary, disposition, reason, {
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
    emptyFeature('M24', sensitivity, disposition, reason, {
      closure_reason: closure,
      censored,
      censor_reason: censorReason,
      components: { knowledge_status: raw.knowledge_status, boundary },
    }),
    companionRow,
  ];

  if (!raw.depletion_reached) {
    return nullPair(
      'no_eligible_event',
      exit === 'closed_at_review'
        ? 'deck never depleted before the review (no knowledge boundary arose)'
        : 'deck never depleted (no knowledge boundary arose)',
      true,
      'depletion never reached; the check never became due',
      'not_reached',
    );
  }

  if (raw.knowledge_status === 'unknown') {
    return nullPair(
      'interrupted',
      'depletion reached, expected-outcome check never decided',
      true,
      'the check was never decided before the closure',
      raw.attempts.length > 0 ? 'check_incomplete' : 'untested',
    );
  }

  if (raw.knowledge_status === 'fail') {
    return nullPair(
      'understanding_failed',
      'expected-outcome check failed after the explanation; casts kept as unqualified',
      false,
      null,
      'failed',
    );
  }

  const censored = closure === 'cap' || closure === 'closed_at_review';
  const primaryExtra: Partial<FeatureRecord> = {
    numerator: raw.postknowledge_casts,
    closure_reason: closure,
    censored,
    censor_reason:
      closure === 'cap'
        ? 'focused cap reached'
        : closure === 'closed_at_review'
          ? 'review reached'
          : null,
    included_ids: Array.from(
      { length: raw.postknowledge_casts },
      (_, i) => `m24_postknowledge_cast_${i + 1}`,
    ),
    supporting_sequences: supporting,
    components: {
      knowledge_status: raw.knowledge_status,
      pass_kind:
        raw.knowledge_status === 'pass_first' ? 'first' : 'after_explanation',
      continuation_focused_ms: raw.continuation_focused_ms,
      continuation_wall_ms: raw.continuation_wall_ms,
      continuation_cap_ms: raw.continuation_cap_ms,
      cast_focused_ms: raw.postknowledge_cast_focused_ms,
      cast_in_progress_at_cap: raw.cast_in_progress_at_cap,
      alternative_in_progress_at_cap:
        raw.alternative_in_progress_at_cap ?? false,
      steps_away_in_continuation: raw.steps_away_in_continuation ?? 0,
      switch: raw.alternative_used,
      exit: raw.exited,
      cap: raw.cap_reached,
      recount: casts.length,
      recount_agrees: casts.length === raw.postknowledge_casts,
    },
  };

  if (casts.length !== raw.postknowledge_casts) {
    const reason = 'rig record disagrees with the postknowledge_cast events';

    return [
      emptyFeature('M24', primary, 'technical_failure', reason, {
        ...primaryExtra,
        numerator: null,
      }),
      emptyFeature('M24', sensitivity, 'technical_failure', reason, {
        closure_reason: closure,
      }),
      companionRow,
    ];
  }

  return [
    observedFeature('M24', primary, raw.postknowledge_casts, primaryExtra),
    observedFeature(
      'M24',
      sensitivity,
      Math.max(0, raw.postknowledge_casts - 1),
      {
        numerator: Math.max(0, raw.postknowledge_casts - 1),
        closure_reason: closure,
        censored,
        censor_reason: primaryExtra.censor_reason ?? null,
        supporting_sequences: supporting,
        components: { derived_from: 'm24_postknowledge_casts' },
      },
    ),
    companionRow,
  ];
});
