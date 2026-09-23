/**
 * M05 feature extractor (Unit 6): `m05_start_latency` = PER ACCEPTED
 * OCCASION the focused milliseconds from eligibility (accepted job, start
 * control visible and usable, no competing required task) to the first
 * work action, together with its status — started | deferred | exited |
 * cap | interrupted — and its censoring; plus `m05_acceptance_exposure`
 * (offer, answer, eligibility wait, exposure by cause, control views, work
 * completion, late start per occasion). Read-only over the raw
 * `proto_m05_start_*` events. A declined job is outside the set (never
 * low); a non-start keeps its exposure and reason; no starter-only mean
 * (or any mean) is formed; a cap is never a start.
 */
import { CLOSURE_REASONS, type ClosureReason } from '../protocol';
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

type Occasion = 'o1' | 'o2';

interface M05Raw {
  occasion: Occasion;
  offered: boolean;
  offer_presentations: number;
  offer_refused_presses: number;
  accepted: boolean | null;
  answer_option_position: number | null;
  offer_latency_ms: number | null;
  eligible: boolean;
  wait_before_eligible_ms: number | null;
  distance_px_at_eligibility: number | null;
  status: string | null;
  interruption_kind: string | null;
  latency_focused_ms: number | null;
  latency_wall_ms: number | null;
  exposure_focused_ms: number | null;
  exposure_wall_ms: number | null;
  excluded_ms: Record<string, number> | null;
  excluded_total_ms: number | null;
  start_cap_ms: number;
  cap_reached: boolean;
  control_views: number;
  first_control_view_focused_ms: number | null;
  refused_presses: number;
  start_input_mode: string | null;
  work_completed: boolean;
  work_focused_ms: number | null;
  late_start: {
    after: string;
    since_closure_ms: number | null;
    work_completed: boolean;
  } | null;
  closure_reason: string;
}

const OCCASIONS: readonly Occasion[] = ['o1', 'o2'];
const STATUSES = new Set([
  'started',
  'deferred',
  'exited',
  'cap',
  'interrupted',
]);

type Missing = Exclude<FeatureDisposition, 'observed' | 'incomplete'>;

registerFeatureExtractor('M05', (events, context) => {
  const entry = registerEntry('M05');
  const [primary, exposure] = entry.features;
  const load = currentLoadEvents(events, context);
  const family = load.filter((e) =>
    e.event_type.startsWith('proto_m05_start_'),
  );
  const supporting = sequencesOf(family);
  const occ = (event: { metadata?: Record<string, unknown> }) =>
    meta<string>(event as never, 'occasion');
  const presented = eventsOfType(load, 'proto_m05_start_presented');
  const opened = eventsOfType(load, 'proto_m05_start_opportunity_opened');
  const closed = eventsOfType(load, 'proto_m05_start_window_closed');
  const heldBack = eventsOfType(load, 'proto_m05_start_technical_failure');
  const started = eventsOfType(load, 'proto_m05_start_started');
  const lateStarts = eventsOfType(load, 'proto_m05_start_late_start');
  const lateWork = eventsOfType(load, 'proto_m05_start_work_completed').filter(
    (event) => meta<boolean>(event, 'late') === true,
  );

  const presentedSet = new Set(presented.map(occ));
  const openedSet = new Set(opened.map(occ));
  // Held back: the reload guard's marker, OR — after a reload — an
  // occasion with no current-load evidence at all (its evidence may lie
  // in an earlier page load; review U5 F5): never `not presented`.
  const heldBackSet = new Set([
    ...heldBack.map(occ),
    ...(context.reloaded
      ? OCCASIONS.filter(
          (occasion) => !presentedSet.has(occasion) && !openedSet.has(occasion),
        )
      : []),
  ]);

  if (opened.length === 0) {
    if (heldBack.length > 0) {
      const reason =
        'job answered in an earlier page load; not re-offered after the reload';

      return [
        emptyFeature('M05', primary, 'interrupted', reason, {
          supporting_sequences: supporting,
        }),
        emptyFeature('M05', exposure, 'interrupted', reason),
      ];
    }

    if (presented.length > 0) {
      const reason = 'job offered, never answered (the stage was left open)';

      return [
        emptyFeature('M05', primary, 'pending', reason, {
          supporting_sequences: supporting,
        }),
        emptyFeature('M05', exposure, 'pending', reason),
      ];
    }

    return [
      absentFeature('M05', primary, context, 'no job offered', {
        supporting_sequences: supporting,
      }),
      absentFeature('M05', exposure, context, 'no job offered'),
    ];
  }

  // Latest closure per occasion.
  const rawByOccasion: Partial<Record<Occasion, M05Raw>> = {};
  const exitByOccasion: Partial<Record<Occasion, string>> = {};

  for (const event of closed) {
    const raw =
      meta<M05Raw>(event, 'raw_components') ??
      meta<M05Raw>(event, 'raw_components_partial');
    const occasion = occ(event);

    if (raw === undefined || (occasion !== 'o1' && occasion !== 'o2')) {
      continue;
    }

    rawByOccasion[occasion] = raw;
    exitByOccasion[occasion] = meta<string>(event, 'exit_state') ?? 'unknown';
  }

  const startedEvent = (occasion: Occasion) =>
    started.find((candidate) => occ(candidate) === occasion);
  const lateStartEvent = (occasion: Occasion) =>
    lateStarts.find((candidate) => occ(candidate) === occasion);

  const accepted = OCCASIONS.filter(
    (occasion) => rawByOccasion[occasion]?.accepted === true,
  );
  const declined = OCCASIONS.filter(
    (occasion) => rawByOccasion[occasion]?.accepted === false,
  );
  const openNoClosure = OCCASIONS.filter(
    (occasion) =>
      openedSet.has(occasion) && rawByOccasion[occasion] === undefined,
  );
  // Accepted occasions closed by an interruption (reload, review, fault):
  // missing data, never a behavioural non-start (review U6 S-F6).
  const interruptedAccepted = accepted.filter(
    (occasion) => rawByOccasion[occasion]!.status === 'interrupted',
  );
  // Accepted, then left before the start control ever became usable (a
  // prompt still held the room): no start opportunity was observed.
  const neverEligible = accepted.filter((occasion) => {
    const raw = rawByOccasion[occasion]!;

    return raw.status === 'exited' && !raw.eligible;
  });
  // The observed set: accepted occasions whose usable start opportunity
  // closed with a behavioural status (started / deferred / exited / cap).
  const observed = accepted.filter((occasion) => {
    const raw = rawByOccasion[occasion]!;

    return (
      raw.status !== null &&
      STATUSES.has(raw.status) &&
      raw.status !== 'interrupted' &&
      !neverEligible.includes(occasion)
    );
  });
  // Cross-check: a `started` status must have its own `started` event
  // carrying the same focused latency (review U4 S-F1 precedent), and
  // that latency must lie inside the cap; a status other than started
  // must have no `started` event.
  const mismatch = observed.some((occasion) => {
    const raw = rawByOccasion[occasion]!;
    const event = startedEvent(occasion);

    if (raw.status === 'started') {
      return (
        event === undefined ||
        (meta<number>(event, 'latency_focused_ms') ?? null) !==
          raw.latency_focused_ms ||
        raw.latency_focused_ms === null ||
        raw.latency_focused_ms > raw.start_cap_ms
      );
    }

    return event !== undefined;
  });

  const closureOf = (occasion: Occasion) =>
    exitByOccasion[occasion] === 'closed_at_review'
      ? 'closed_at_review'
      : (rawByOccasion[occasion]?.closure_reason ?? null);
  const censoredOccasion = (occasion: Occasion) => {
    const raw = rawByOccasion[occasion]!;

    return (
      raw.status === 'cap' ||
      raw.status === 'interrupted' ||
      neverEligible.includes(occasion)
    );
  };

  /** Per-occasion primary record (latency + status; nothing summed). */
  const perOccasion = (occasion: Occasion): Record<string, unknown> | null => {
    const raw = rawByOccasion[occasion];

    if (raw !== undefined && raw.accepted === true) {
      return {
        occasion,
        status: raw.status,
        observed: observed.includes(occasion),
        latency_focused_ms:
          raw.status === 'started' ? raw.latency_focused_ms : null,
        latency_wall_ms: raw.status === 'started' ? raw.latency_wall_ms : null,
        exposure_focused_ms: raw.exposure_focused_ms,
        censored: raw.status === null ? true : censoredOccasion(occasion),
        censor_reason:
          raw.status === 'cap'
            ? 'focused cap reached without a start'
            : raw.status === 'interrupted'
              ? `interrupted (${raw.interruption_kind ?? 'unknown'})`
              : neverEligible.includes(occasion)
                ? 'left before the start control became usable'
                : raw.status === null
                  ? 'occasion still open'
                  : null,
        start_cap_ms: raw.start_cap_ms,
        closure_reason: closureOf(occasion),
      };
    }

    if (raw !== undefined && raw.accepted === false) {
      return { occasion, declined: true };
    }

    if (heldBackSet.has(occasion)) {
      return { occasion, interrupted: true };
    }

    if (openedSet.has(occasion)) {
      return { occasion, pending: true };
    }

    if (presentedSet.has(occasion)) {
      return { occasion, pending: true, offered: true };
    }

    return null;
  };

  /** Companion detail per occasion (acceptance and exposure). */
  const exposureOf = (occasion: Occasion): Record<string, unknown> | null => {
    const raw = rawByOccasion[occasion];

    if (raw !== undefined) {
      const late = lateStartEvent(occasion);

      return {
        occasion,
        offered: raw.offered,
        offer_presentations: raw.offer_presentations,
        offer_refused_presses: raw.offer_refused_presses,
        accepted: raw.accepted,
        answer_option_position: raw.answer_option_position,
        offer_latency_ms: raw.offer_latency_ms,
        eligible: raw.eligible,
        wait_before_eligible_ms: raw.wait_before_eligible_ms,
        distance_px_at_eligibility: raw.distance_px_at_eligibility,
        exposure_focused_ms: raw.exposure_focused_ms,
        exposure_wall_ms: raw.exposure_wall_ms,
        excluded_ms: raw.excluded_ms,
        excluded_total_ms: raw.excluded_total_ms,
        control_views: raw.control_views,
        first_control_view_focused_ms: raw.first_control_view_focused_ms,
        refused_presses: raw.refused_presses,
        start_input_mode: raw.start_input_mode,
        work_completed: raw.work_completed,
        work_focused_ms: raw.work_focused_ms,
        // A late start after the window closed lives only in its own
        // events (the closure snapshot predates it): read `late_start` and
        // the late `work_completed` from the stream.
        late_start:
          raw.late_start ??
          (late === undefined
            ? null
            : {
                after: meta<string>(late, 'after') ?? null,
                since_closure_ms:
                  meta<number>(late, 'since_closure_ms') ?? null,
                work_completed: lateWork.some(
                  (candidate) => occ(candidate) === occasion,
                ),
              }),
        closure_reason: closureOf(occasion),
      };
    }

    return perOccasion(occasion);
  };

  const primaryValue = { o1: perOccasion('o1'), o2: perOccasion('o2') };
  const exposureValue = { o1: exposureOf('o1'), o2: exposureOf('o2') };
  const anyHeldBack = heldBackSet.size > 0;
  const anyReview = OCCASIONS.some(
    (occasion) => exitByOccasion[occasion] === 'closed_at_review',
  );
  const components = {
    occasions_accepted: accepted,
    occasions_observed: observed,
    occasions_declined: declined,
    occasions_pending: openNoClosure,
    occasions_interrupted: OCCASIONS.filter(
      (occasion) =>
        heldBackSet.has(occasion) || interruptedAccepted.includes(occasion),
    ),
    occasions_never_eligible: neverEligible,
    status_by_occasion: Object.fromEntries(
      OCCASIONS.map((occasion) => [
        occasion,
        rawByOccasion[occasion]?.accepted === true
          ? rawByOccasion[occasion]!.status
          : null,
      ]),
    ),
    starters: observed.filter(
      (occasion) => rawByOccasion[occasion]!.status === 'started',
    ),
    non_starters: observed.filter(
      (occasion) => rawByOccasion[occasion]!.status !== 'started',
    ),
    started_event_agrees: !mismatch,
  };
  // The row's closure: the review when any occasion closed there; the one
  // closure every observed occasion shares; else `completed` (the item's
  // observation completed through mixed closures — each is in the value).
  const observedClosures = new Set(
    observed.map((occasion) => closureOf(occasion)),
  );
  const rowClosure = (): ClosureReason =>
    anyReview
      ? 'closed_at_review'
      : observedClosures.size === 1 &&
          CLOSURE_REASONS.includes([...observedClosures][0] as ClosureReason)
        ? ([...observedClosures][0] as ClosureReason)
        : 'completed';
  const anyInterrupted = anyHeldBack || interruptedAccepted.length > 0;
  const shared = {
    closure_reason: rowClosure(),
    censored:
      anyInterrupted ||
      openNoClosure.length > 0 ||
      neverEligible.length > 0 ||
      observed.some(censoredOccasion),
    censor_reason: anyInterrupted
      ? 'an accepted occasion was interrupted or held back'
      : openNoClosure.length > 0
        ? 'an accepted occasion is still open'
        : neverEligible.length > 0
          ? 'an accepted occasion was left before its start control became usable'
          : observed.some(censoredOccasion)
            ? 'an occasion reached the cap'
            : null,
    supporting_sequences: supporting,
    components,
  };

  if (openNoClosure.length > 0 && observed.length === 0) {
    return [
      emptyFeature(
        'M05',
        primary,
        'pending',
        'an accepted job is still open (no closure yet)',
        shared,
      ),
      observedFeature('M05', exposure, exposureValue, {
        disposition: 'pending',
        supporting_sequences: supporting,
      }),
    ];
  }

  if (observed.length === 0) {
    const zero: { disposition: Missing; reason: string } = anyInterrupted
      ? {
          disposition: 'interrupted',
          reason: anyHeldBack
            ? 'every answered job was held back after a reload'
            : 'every accepted job was interrupted before a start opportunity closed',
        }
      : neverEligible.length > 0
        ? {
            disposition: 'no_eligible_event',
            reason:
              'every accepted job was left before its start control became usable',
          }
        : {
            disposition: 'declined',
            reason: 'every offered job was declined',
          };

    return [
      emptyFeature('M05', primary, zero.disposition, zero.reason, {
        ...shared,
        included_ids: [],
      }),
      observedFeature('M05', exposure, exposureValue, {
        closure_reason: shared.closure_reason,
        supporting_sequences: supporting,
      }),
    ];
  }

  const includedIds = observed.map((occasion) => `m05_start_${occasion}`);
  // A record that disagrees with its own event stream is a technical fault
  // of the record, never a value to analyse.
  const primaryRow = mismatch
    ? emptyFeature(
        'M05',
        primary,
        'technical_failure',
        'window record disagrees with the started events',
        { ...shared, included_ids: includedIds },
      )
    : observedFeature('M05', primary, primaryValue, {
        ...shared,
        // A held-back or still-open occasion beside an observed one keeps
        // the observed value under `interrupted` / `pending` (review U3
        // S-F2 / U5 F5 precedent), never a complete-looking record.
        disposition: anyInterrupted
          ? 'interrupted'
          : openNoClosure.length > 0
            ? 'pending'
            : 'observed',
        included_ids: includedIds,
      });

  return [
    primaryRow,
    observedFeature('M05', exposure, exposureValue, {
      closure_reason: shared.closure_reason,
      supporting_sequences: supporting,
    }),
  ] satisfies FeatureRecord[];
});
