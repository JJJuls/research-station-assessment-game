/**
 * M25 feature extractor (Unit 4): `m25_optional_repeats` = completed
 * OPTIONAL loops after the three required calibration loops (a count
 * under a 30 s focused cap; the closure reason and censor status kept
 * beside it), plus `m25_normality_belief` = the 1–5 ordinal answered at
 * Vale's return check-in. Read-only over the raw `proto_m25_loops_*` and
 * `proto_m25_belief_*` events. Required loops are never counted; loops
 * never completed ⇒ primary null and belief null (no exposure); the two
 * features are derived independently and never combined.
 *
 * Reload (U24 RL-3, `RELOAD-CORRECTION-SPEC-r3-exec.md` §2, §4 and §6;
 * owner decision D-3 = P): ONE `proto_m25_loops_prior_load_checked` record
 * per reloaded load covers three occasions — the loops, the belief
 * question and the questionnaire-notice probe — with the D-4 evidence
 * fields (`prior_required_complete`; `prior_belief_displayed`,
 * `prior_belief_answered`). The primary reads the loops occasion (H / U /
 * M held, A first-load). The companion reads its own occasion, never the
 * primary's branch: a question displayed earlier (answered or not) is never
 * asked again and reads `interrupted` (cases 1 and 2); uncertain or
 * contradictory history reads `interrupted` (case 4); a first display after
 * a reload, permitted only when the check establishes the earlier required
 * completion and the absence of an earlier display (case 3), takes the
 * first-load readings with `exposure_page_load_index` and the delay rule's
 * fields beside them. No text says "not exposed" or "0 required loops"
 * when an earlier completion is established. The record is never task
 * evidence.
 */
import { registerEntry } from '../registerV3';
import {
  classifyReload,
  computePriorLoadCheck,
  PRIOR_LOAD_CHECK_SUFFIX,
  type PriorLoadCheck,
  type ReloadClass,
  type ReloadClassification,
  type ReloadEvent,
  type ReloadHistoryIntegrity,
  reloadHoldBackClass,
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
import type { FeatureDisposition, FeatureRecord } from './types';

interface M25LoopsRaw {
  required_loops_planned: number;
  required_loops_completed: number;
  required_complete: boolean;
  completion_marked: boolean;
  exposed: boolean;
  optional_entered: boolean;
  optional_repeats_completed: number;
  optional_loops_started: number;
  loop_in_progress_at_cap: boolean;
  cap_reached: boolean;
  repeat_focused_ms: number | null;
  repeat_wall_ms?: number | null;
  stop_kind: string | null;
  loops?: {
    kind: string;
    index: number;
    focused_ms: number;
    completed: boolean;
  }[];
  closure_reason: string;
}

type Missing = Exclude<FeatureDisposition, 'observed' | 'incomplete'>;

const LOOPS = 'proto_m25_loops_';
const BELIEF = 'proto_m25_belief_';
const PROBE = 'proto_m25_probe_';

/** The three occasions of the one M25 record (r3 §2, §6; D-4). */
export const M25_RELOAD_OCCASIONS = ['loops', 'belief', 'probe'] as const;

export type M25ReloadOccasion = (typeof M25_RELOAD_OCCASIONS)[number];

/** An earlier display of the belief question (r3 §6: any of the three). */
function beliefDisplayed(event: ReloadEvent): boolean {
  return (
    event.event_type === `${BELIEF}question_presented` ||
    event.event_type === `${BELIEF}presented` ||
    event.event_type === `${BELIEF}opportunity_opened`
  );
}

/**
 * The load's reload check (U24 RL-3; r1 §1 stage map and r3 §6), one record
 * for the family, written by the first M25 host of the load:
 * - loops: stage 1 the briefing's `presented`, stage 3
 *   `opportunity_opened`; evidence `prior_required_complete` = an earlier
 *   `required_complete` with the completion screen shown (its
 *   `completion_marked`) — the earlier exposure;
 * - belief: stage 2 the question's display record, stage 3 any display
 *   (display = administration, direction f); evidence
 *   `prior_belief_displayed` and `prior_belief_answered`;
 * - probe: stage 1 the notice's `presented`, stage 3 its
 *   `opportunity_opened`.
 * Each occasion's hold-back markers are its own family's
 * `technical_failure`. Null on a first load.
 */
export function m25PriorLoadCheck(
  pageLoadIndex: number,
  priorLoadEvents: readonly ReloadEvent[],
  integrity: ReloadHistoryIntegrity,
): PriorLoadCheck | null {
  const is = (type: string) => (event: ReloadEvent) =>
    event.event_type === type;

  return computePriorLoadCheck({
    pageLoadIndex,
    priorLoadEvents,
    integrity,
    occasions: {
      loops: {
        briefing: is(`${LOOPS}presented`),
        opening: is(`${LOOPS}opportunity_opened`),
        holdBack: is(`${LOOPS}technical_failure`),
        evidence: {
          prior_required_complete: (event) =>
            event.event_type === `${LOOPS}required_complete` &&
            event.metadata?.completion_marked === true,
        },
      },
      belief: {
        presentation: (event) =>
          event.event_type === `${BELIEF}question_presented` ||
          event.event_type === `${BELIEF}presented`,
        opening: beliefDisplayed,
        holdBack: is(`${BELIEF}technical_failure`),
        evidence: {
          prior_belief_displayed: beliefDisplayed,
          prior_belief_answered: is(`${BELIEF}question_answered`),
        },
      },
      probe: {
        briefing: is(`${PROBE}presented`),
        opening: is(`${PROBE}opportunity_opened`),
        holdBack: is(`${PROBE}technical_failure`),
      },
    },
  });
}

/** Each occasion's class from the load's check records (r3 §2). */
export function classifyM25Reload(
  pageLoadIndex: number,
  checks: readonly object[],
): ReloadClassification {
  return classifyReload({
    pageLoadIndex,
    checks,
    occasions: M25_RELOAD_OCCASIONS,
  });
}

/** A named evidence flag of one occasion in a single check record. */
export function m25CheckEvidence(
  check: object | undefined,
  occasion: M25ReloadOccasion,
  flag: string,
): boolean {
  const occasions = (check as { occasions?: unknown } | undefined)?.occasions;
  const part =
    typeof occasions === 'object' && occasions !== null
      ? (occasions as Record<string, unknown>)[occasion]
      : undefined;
  const evidence =
    typeof part === 'object' && part !== null
      ? (part as { evidence?: unknown }).evidence
      : undefined;

  return (
    typeof evidence === 'object' &&
    evidence !== null &&
    (evidence as Record<string, unknown>)[flag] === true
  );
}

/** The current-load reasons of a held post, by its class. */
const LOOPS_HELD_REASON = {
  H: 'post administered in an earlier page load; not re-run after the reload',
  U: 'post not administered after a reload: earlier history not verified',
  M: 'post not administered after a reload: earlier check contradictory',
} as const;

/** The companion's reasons when the question is held (r3 §6 cases 1, 2, 4). */
const BELIEF_HELD_REASON = {
  displayed:
    'normality question displayed in an earlier page load; not asked again after the reload',
  answered:
    'normality question answered in an earlier page load; not asked again after the reload',
  U: 'normality question not asked after a reload: earlier history not verified',
  M: 'normality question not asked after a reload: earlier check contradictory',
} as const;

registerFeatureExtractor('M25', (events, context) => {
  const entry = registerEntry('M25');
  const [primary, belief] = entry.features;
  const load = currentLoadEvents(events, context);
  const ownLoops = load.filter((e) => e.event_type.startsWith(LOOPS));
  const loopsFamily = withoutPriorLoadChecks(ownLoops, LOOPS);
  const checks = ownLoops
    .filter((e) => e.event_type === `${LOOPS}${PRIOR_LOAD_CHECK_SUFFIX}`)
    .map((event) => event.metadata ?? {});
  const reload = classifyM25Reload(context.pageLoadIndex, checks);
  const beliefFamily = load.filter((e) =>
    e.event_type.startsWith('proto_m25_belief_'),
  );
  const loopsSupporting = sequencesOf(loopsFamily);
  const beliefSupporting = sequencesOf(beliefFamily);
  const presented = eventsOfType(load, 'proto_m25_loops_presented');
  const opened = eventsOfType(load, 'proto_m25_loops_opportunity_opened');
  const closed = eventsOfType(load, 'proto_m25_loops_window_closed');
  const heldBack = eventsOfType(load, 'proto_m25_loops_technical_failure');
  // Independent recount from the loop events themselves (review U4 S-F1):
  // the snapshot in `window_closed` must agree with the event stream.
  const optionalCompletedEvents = eventsOfType(
    load,
    'proto_m25_loops_loop_completed',
  ).filter((event) => meta<string>(event, 'kind') === 'optional');
  const asked = eventsOfType(load, 'proto_m25_belief_question_presented');
  const answered = eventsOfType(load, 'proto_m25_belief_question_answered');
  const beliefClosed = eventsOfType(load, 'proto_m25_belief_window_closed');
  const beliefMarkers = eventsOfType(load, `${BELIEF}technical_failure`)
    .map((event) => reloadHoldBackClass(meta<unknown>(event, 'detail')))
    .filter((cls): cls is Exclude<ReloadClass, 'A'> => cls !== null);

  // A malformed check record stays under the existing rule (r3 §2;
  // §5.290 (a)): a technical failure, never uncertain history.
  if (reload.check_malformed) {
    const reason = 'a reload check record describes another page load';

    return [
      emptyFeature('M25', primary, 'technical_failure', reason, {
        supporting_sequences: loopsSupporting,
      }),
      emptyFeature('M25', belief, 'technical_failure', reason, {
        supporting_sequences: beliefSupporting,
      }),
    ];
  }

  const loopsClass = reload.occasions.loops.class;
  const beliefClass = reload.occasions.belief.class;
  // The companion's own hold (U24 RL-3; r3 §6): its marker's class; else,
  // with a check of this load, a question not displayed in this load whose
  // class is not A (displayed earlier ⇒ H; uncertain ⇒ U; contradictory ⇒
  // M). The question has no presentation apart from its display, so
  // without a check nothing is inferred (RL-1C decision A needs one).
  const beliefHeld: Exclude<ReloadClass, 'A'> | null =
    beliefMarkers[0] ??
    (reload.page_reloaded &&
    reload.check_count > 0 &&
    beliefClass !== 'A' &&
    beliefClass !== null &&
    asked.length === 0
      ? beliefClass
      : null);
  const answeredEarlier =
    reload.check_count === 1 &&
    m25CheckEvidence(checks[0], 'belief', 'prior_belief_answered');
  // The earlier required completion, established by this load's check (r3
  // §6: never "0 required loops" or "not exposed" once it is).
  const exposedEarlier =
    reload.page_reloaded &&
    reload.check_count === 1 &&
    m25CheckEvidence(checks[0], 'loops', 'prior_required_complete');
  const beliefHeldFallback = (): { disposition: Missing; reason: string } => ({
    disposition: 'interrupted',
    reason:
      beliefHeld === 'H'
        ? BELIEF_HELD_REASON[answeredEarlier ? 'answered' : 'displayed']
        : BELIEF_HELD_REASON[beliefHeld === 'M' ? 'M' : 'U'],
  });
  // An exposed participant whose question is still to come (r3 §6 case 3
  // before its display): the first-load reading of an exposed participant.
  const exposedFallback = (): { disposition: Missing; reason: string } =>
    beliefClosed.length > 0 || context.finalCoreClosed
      ? {
          disposition: 'not_presented',
          reason: 'normality question never asked before the review',
        }
      : { disposition: 'pending', reason: 'normality question not yet asked' };
  const ownFallback = (otherwise: {
    disposition: Missing;
    reason: string;
  }): { disposition: Missing; reason: string } =>
    beliefHeld !== null
      ? beliefHeldFallback()
      : exposedEarlier && beliefClass === 'A'
        ? exposedFallback()
        : otherwise;

  // ——— the belief companion is derived first (independently) ————————
  const beliefRow = (fallback: {
    disposition: Missing;
    reason: string;
  }): FeatureRecord => {
    const first = answered[0];
    // A first display after a reload (case 3) carries D-3's fields; a
    // same-load display carries none (its payload is unchanged).
    const crossLoad =
      asked[0] !== undefined &&
      meta<unknown>(asked[0], 'exposure_page_load_index') !== undefined
        ? {
            exposure_page_load_index:
              meta<number>(asked[0], 'exposure_page_load_index') ?? null,
            delay_since_loops_closed_null_reason:
              meta<string | null>(
                asked[0],
                'delay_since_loops_closed_null_reason',
              ) ?? null,
          }
        : {};

    if (first !== undefined) {
      const value = meta<number>(first, 'value') ?? null;

      return observedFeature('M25', belief, value, {
        closure_reason: 'completed',
        supporting_sequences: beliefSupporting,
        components: {
          label: meta<string>(first, 'label') ?? null,
          question_version: meta<string>(first, 'question_version') ?? null,
          response_latency_ms:
            meta<number>(first, 'response_latency_ms') ?? null,
          asked_count: meta<number>(first, 'asked_count') ?? null,
          delay_since_loops_closed_ms:
            meta<number>(asked[0] ?? first, 'delay_since_loops_closed_ms') ??
            null,
          later_presses_ignored: Math.max(0, answered.length - 1),
          ...crossLoad,
        },
      });
    }

    if (asked.length > 0) {
      const last = beliefClosed[beliefClosed.length - 1];

      return last === undefined
        ? emptyFeature(
            'M25',
            belief,
            'pending',
            'question presented, no response yet',
            { supporting_sequences: beliefSupporting },
          )
        : emptyFeature(
            'M25',
            belief,
            'interrupted',
            'question presented, no response recorded before the closure',
            {
              closure_reason: 'closed_at_review',
              censored: true,
              censor_reason: 'review reached',
              supporting_sequences: beliefSupporting,
            },
          );
    }

    return emptyFeature('M25', belief, fallback.disposition, fallback.reason, {
      supporting_sequences: beliefSupporting,
    });
  };

  // ——— never opened ————————————————————————————————————————————————
  if (opened.length === 0) {
    // After a reload a post whose class is not A is held (U24 RL-3): its
    // marker (any marker of the post keeps the existing H reading unless
    // it names U or M); else with a check always, without one once the
    // briefing presented it in this load (U, RL-1C decision A).
    const marked =
      heldBack.length > 0
        ? (reloadHoldBackClass(meta<unknown>(heldBack[0], 'detail')) ?? 'H')
        : null;
    const loopsHeld: Exclude<ReloadClass, 'A'> | null =
      marked ??
      (reload.page_reloaded &&
      loopsClass !== 'A' &&
      (reload.check_count > 0 || presented.length > 0)
        ? (loopsClass ?? 'U')
        : null);

    if (loopsHeld !== null) {
      const reason = LOOPS_HELD_REASON[loopsHeld];

      return [
        emptyFeature('M25', primary, 'interrupted', reason, {
          supporting_sequences: loopsSupporting,
        }),
        beliefRow(ownFallback({ disposition: 'interrupted', reason })),
      ];
    }

    if (presented.length > 0) {
      const reason = 'post listed in the yard briefing, never opened';

      return [
        emptyFeature('M25', primary, 'declined', reason, {
          supporting_sequences: loopsSupporting,
        }),
        beliefRow(
          ownFallback({
            disposition: 'no_eligible_event',
            reason: `not exposed to the repeat opportunity: ${reason}`,
          }),
        ),
      ];
    }

    // An established absence takes the first-load reading (r3 §5, the
    // single-occasion rule); `absentFeature`'s reload branch only without
    // one.
    if (loopsClass === 'A') {
      return [
        emptyFeature(
          'M25',
          primary,
          'not_presented',
          'field sensor post never opened',
          { supporting_sequences: loopsSupporting },
        ),
        beliefRow(
          ownFallback({
            disposition: 'not_presented',
            reason: 'post never opened',
          }),
        ),
      ];
    }

    return [
      absentFeature('M25', primary, context, 'field sensor post never opened', {
        supporting_sequences: loopsSupporting,
      }),
      beliefRow(
        ownFallback(
          context.reloaded
            ? {
                disposition: 'interrupted',
                reason:
                  'no current-load evidence after a reload: post never opened',
              }
            : { disposition: 'not_presented', reason: 'post never opened' },
        ),
      ),
    ];
  }

  const last = closed[closed.length - 1];
  const raw =
    last === undefined
      ? null
      : (meta<M25LoopsRaw>(last, 'raw_components') ??
        meta<M25LoopsRaw>(last, 'raw_components_partial') ??
        null);
  const exit = last === undefined ? null : meta<string>(last, 'exit_state');

  if (raw === null) {
    return [
      emptyFeature('M25', primary, 'pending', 'post open, no closure yet', {
        supporting_sequences: loopsSupporting,
      }),
      beliefRow(
        ownFallback({
          disposition: 'pending',
          reason: 'post open, no closure yet',
        }),
      ),
    ];
  }

  const closure =
    exit === 'closed_at_review'
      ? 'closed_at_review'
      : raw.closure_reason === 'cap'
        ? 'cap'
        : raw.closure_reason === 'route_departure'
          ? 'route_departure'
          : raw.closure_reason === 'voluntary_stop'
            ? 'voluntary_stop'
            : 'completed';
  const components = {
    required_loops_completed: raw.required_loops_completed,
    required_loops_planned: raw.required_loops_planned,
    completion_marked: raw.completion_marked,
    optional_entered: raw.optional_entered,
    optional_loops_started: raw.optional_loops_started,
    loop_in_progress_at_cap: raw.loop_in_progress_at_cap,
    cap_reached: raw.cap_reached,
    repeat_focused_ms: raw.repeat_focused_ms,
    repeat_wall_ms: raw.repeat_wall_ms ?? null,
    stop_kind: raw.stop_kind,
    optional_completed_recount: optionalCompletedEvents.length,
    recount_agrees:
      optionalCompletedEvents.length === raw.optional_repeats_completed,
    loop_focused_ms: (raw.loops ?? [])
      .filter((loop) => loop.completed)
      .map((loop) => loop.focused_ms),
  };

  // Required loops never completed: no repeat opportunity was ever
  // presented — null, never a zero; the belief is not asked.
  if (!raw.required_complete || !raw.exposed) {
    // Not a stop the participant could make (no Finished control exists
    // before the third loop): the repeat opportunity was never presented,
    // so no eligible event occurred (review U4 S-F7).
    const disposition: Missing = 'no_eligible_event';
    const reason =
      exit === 'closed_at_review'
        ? `closed at the review with ${raw.required_loops_completed} of ${raw.required_loops_planned} required loops`
        : `post left with ${raw.required_loops_completed} of ${raw.required_loops_planned} required loops`;

    return [
      emptyFeature('M25', primary, disposition, reason, {
        closure_reason: closure,
        censored: true,
        censor_reason:
          'required loops never completed; repeat opportunity never presented',
        supporting_sequences: loopsSupporting,
        components,
      }),
      beliefRow(
        ownFallback({
          disposition: 'no_eligible_event',
          reason: `not exposed to the repeat opportunity: ${reason}`,
        }),
      ),
    ];
  }

  const censored = closure === 'cap' || closure === 'closed_at_review';
  const primaryExtra: Partial<FeatureRecord> = {
    numerator: raw.optional_repeats_completed,
    closure_reason: closure,
    censored,
    censor_reason:
      closure === 'cap'
        ? 'focused cap reached'
        : closure === 'closed_at_review'
          ? 'review reached'
          : null,
    included_ids: Array.from(
      { length: raw.optional_repeats_completed },
      (_, i) => `m25_optional_${i + 1}`,
    ),
    supporting_sequences: loopsSupporting,
    components,
  };
  // A snapshot that disagrees with its own event stream is a technical
  // fault of the record, never a value to analyse (review U4 S-F1).
  const primaryRow =
    optionalCompletedEvents.length === raw.optional_repeats_completed
      ? observedFeature(
          'M25',
          primary,
          raw.optional_repeats_completed,
          primaryExtra,
        )
      : emptyFeature(
          'M25',
          primary,
          'technical_failure',
          'window snapshot disagrees with the loop_completed events',
          { ...primaryExtra, numerator: null },
        );

  // Exposed: the question is due once the closure is recorded; until Vale
  // asks it the companion is pending, and a never-asked question closes
  // `not_presented` at the review.
  const beliefFallback: { disposition: Missing; reason: string } =
    beliefClosed.length > 0 || context.finalCoreClosed
      ? {
          disposition: 'not_presented',
          reason: 'normality question never asked before the review',
        }
      : { disposition: 'pending', reason: 'normality question not yet asked' };

  return [primaryRow, beliefRow(ownFallback(beliefFallback))];
});
