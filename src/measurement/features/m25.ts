/**
 * M25 feature extractor (Unit 4): `m25_optional_repeats` = completed
 * OPTIONAL loops after the three required calibration loops (a count
 * under a 30 s focused cap; the closure reason and censor status kept
 * beside it), plus `m25_normality_belief` = the 1–5 ordinal answered at
 * Vale's return check-in. Read-only over the raw `proto_m25_loops_*` and
 * `proto_m25_belief_*` events. Required loops are never counted; loops
 * never completed ⇒ primary null and belief null (no exposure); the two
 * features are derived independently and never combined.
 */
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

registerFeatureExtractor('M25', (events, context) => {
  const entry = registerEntry('M25');
  const [primary, belief] = entry.features;
  const load = currentLoadEvents(events, context);
  const loopsFamily = load.filter((e) =>
    e.event_type.startsWith('proto_m25_loops_'),
  );
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

  // ——— the belief companion is derived first (independently) ————————
  const beliefRow = (fallback: {
    disposition: Missing;
    reason: string;
  }): FeatureRecord => {
    const first = answered[0];

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
    if (heldBack.length > 0) {
      const reason =
        'post administered in an earlier page load; not re-run after the reload';

      return [
        emptyFeature('M25', primary, 'interrupted', reason, {
          supporting_sequences: loopsSupporting,
        }),
        beliefRow({ disposition: 'interrupted', reason }),
      ];
    }

    if (presented.length > 0) {
      const reason = 'post listed in the yard briefing, never opened';

      return [
        emptyFeature('M25', primary, 'declined', reason, {
          supporting_sequences: loopsSupporting,
        }),
        beliefRow({
          disposition: 'no_eligible_event',
          reason: `not exposed to the repeat opportunity: ${reason}`,
        }),
      ];
    }

    return [
      absentFeature('M25', primary, context, 'field sensor post never opened', {
        supporting_sequences: loopsSupporting,
      }),
      beliefRow(
        context.reloaded
          ? {
              disposition: 'interrupted',
              reason:
                'no current-load evidence after a reload: post never opened',
            }
          : { disposition: 'not_presented', reason: 'post never opened' },
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
      beliefRow({
        disposition: 'pending',
        reason: 'post open, no closure yet',
      }),
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
      beliefRow({
        disposition: 'no_eligible_event',
        reason: `not exposed to the repeat opportunity: ${reason}`,
      }),
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

  return [primaryRow, beliefRow(beliefFallback)];
});
