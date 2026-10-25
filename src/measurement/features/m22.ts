/**
 * M22 feature extractor (Unit 11): `m22_revisions_begun` = reports on
 * which a revision was begun (a feedback-consistent edit after the
 * acknowledgement — `code_attached`) / reports whose requirement was
 * presented (`setback_presented`; two planned — one ⇒ `incomplete`). An
 * exit (withdraw) after the requirement without a revision is an observed
 * 0 for that report; a report never submitted is outside the denominator;
 * a returned report the review closed unacknowledged is invalid
 * (excluded), acknowledged-and-left without a revision is censored
 * (excluded, flagged) while a review-closed report whose revision had
 * already begun keeps its observed 1 (the numerator fact is already in).
 * Companion `m22_discouragement_ratings` = per report the 1–5 rating and
 * its recall delay from the `rating_answered` / `rating_declined` events;
 * a declined or missing rating is null (never a midpoint) and the two
 * ratings are never combined with the behaviour. Read-only over the raw
 * `proto_m22_returned_*` events.
 *
 * Reload (U24 RL-3, `RELOAD-CORRECTION-SPEC-r3-exec.md` §2, §4 G5 and §5;
 * owner decision D-2 (i)): the load's `prior_load_checked` record
 * classifies each report H / A / U / M (stage 1 `presented`, stage 3
 * `opportunity_opened`). A held report is never a zero and never in the
 * denominator: beside an observed report the row reads `interrupted` with
 * its contribution kept (overriding `incomplete`); with no report opened
 * both rows read `interrupted` · null. A reload hold-back marker no longer
 * makes the rows a technical failure. Under A a report without evidence
 * takes the first-load reading; a presented, unopened report of a reloaded
 * load without its check is U (RL-1C decision A). The record is never task
 * evidence. The existing pending-state finding (r3 §5, out of scope) is
 * unchanged.
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
  fractionFeature,
  meta,
  observedFeature,
  registerFeatureExtractor,
  sequencesOf,
} from './extract';
import type { FeatureRecord } from './types';

const FAMILY = 'proto_m22_returned_';
const REPORTS = ['o1', 'o2'] as const;

type ReportId = (typeof REPORTS)[number];

interface M22Raw {
  report: ReportId;
  requirement_presented: boolean;
  revision_begun: boolean;
  setback_comprehension: boolean;
  recovery_complete: boolean;
  exited: boolean;
  stop_choice: string | null;
}

/** The report of an event: the adapter's `report`, else the kit's `occasion`. */
function reportOf(event: {
  metadata?: Record<string, unknown> | null;
}): string | undefined {
  const value = event.metadata?.report ?? event.metadata?.occasion;

  return typeof value === 'string' ? value : undefined;
}

/**
 * The load's reload check (U24 RL-3; r1 §1 stage map, confirmed against the
 * code): per report, stage 1 the report's `presented` (with the return
 * shift's work orders), no stage 2, stage 3 its `opportunity_opened` (the
 * desk entering the report), the report's hold-back markers. Null on a
 * first load.
 */
export function m22PriorLoadCheck(
  pageLoadIndex: number,
  priorLoadEvents: readonly ReloadEvent[],
  integrity: ReloadHistoryIntegrity,
): PriorLoadCheck | null {
  const of =
    (suffix: string, id: ReportId) =>
    (event: ReloadEvent): boolean =>
      event.event_type === `${FAMILY}${suffix}` && reportOf(event) === id;

  return computePriorLoadCheck({
    pageLoadIndex,
    priorLoadEvents,
    integrity,
    occasions: Object.fromEntries(
      REPORTS.map((id) => [
        id,
        {
          briefing: of('presented', id),
          opening: of('opportunity_opened', id),
          holdBack: of('technical_failure', id),
        },
      ]),
    ),
  });
}

/** Each report's class from the load's check records (r3 §2). */
export function classifyM22Reload(
  pageLoadIndex: number,
  checks: readonly object[],
): ReloadClassification {
  return classifyReload({ pageLoadIndex, checks, occasions: REPORTS });
}

/** The current-load reason of a held report, by its class. */
const HELD_REASON = {
  H: 'report opened in an earlier page load; not re-run after the reload',
  U: 'report not administered after a reload: earlier history not verified',
  M: 'report not administered after a reload: earlier check contradictory',
} as const;

registerFeatureExtractor('M22', (events, context) => {
  const entry = registerEntry('M22');
  const [primary, companion] = entry.features;
  const load = currentLoadEvents(events, context);
  const own = load.filter((e) => e.event_type.startsWith(FAMILY));
  const family = withoutPriorLoadChecks(own, FAMILY);
  const supporting = sequencesOf(family);
  const presented = eventsOfType(load, `${FAMILY}presented`);
  const opened = eventsOfType(load, `${FAMILY}opportunity_opened`);
  const closed = eventsOfType(load, `${FAMILY}window_closed`);
  const setbacks = eventsOfType(load, `${FAMILY}setback_presented`);
  const acknowledged = eventsOfType(load, `${FAMILY}setback_acknowledged`);
  const attached = eventsOfType(load, `${FAMILY}code_attached`);
  const answered = eventsOfType(load, `${FAMILY}rating_answered`);
  const declined = eventsOfType(load, `${FAMILY}rating_declined`);
  const ratingPresented = eventsOfType(load, `${FAMILY}rating_presented`);
  const markerClass = (event: { metadata?: Record<string, unknown> | null }) =>
    reloadHoldBackClass(event.metadata?.detail);
  // A reload hold-back marker is not a fault of the report (D-2 (i)); any
  // other technical failure keeps the existing whole-row rule.
  const failed = eventsOfType(load, `${FAMILY}technical_failure`).filter(
    (event) => markerClass(event) === null,
  );
  const markers = eventsOfType(load, `${FAMILY}technical_failure`).filter(
    (event) => markerClass(event) !== null,
  );
  // The adapter's own events carry `report`; the window kit's closures the
  // window's `occasion` (the same id).
  const rep = (event: { metadata?: Record<string, unknown> }) =>
    meta<string>(event as never, 'report') ??
    meta<string>(event as never, 'occasion');
  const reload = classifyM22Reload(
    context.pageLoadIndex,
    eventsOfType(own, `${FAMILY}${PRIOR_LOAD_CHECK_SUFFIX}`).map(
      (event) => event.metadata ?? {},
    ),
  );

  // A malformed check record stays under the existing rule (r3 §2;
  // §5.290 (a)): a technical failure, never uncertain history.
  if (reload.check_malformed) {
    const reason = 'a reload check record describes another page load';

    return [
      emptyFeature('M22', primary, 'technical_failure', reason, {
        supporting_sequences: supporting,
      }),
      emptyFeature('M22', companion, 'technical_failure', reason),
    ];
  }

  // Each held report (U24 RL-3): its marker's class; else, after a reload,
  // an unopened report whose class is not A — with a check always, without
  // one only once it was presented in this load (RL-1C decision A).
  const heldClass = (id: ReportId): Exclude<ReloadClass, 'A'> | null => {
    const marker = markers.find((event) => rep(event) === id);

    if (marker !== undefined) {
      return markerClass(marker);
    }

    const cls = reload.occasions[id].class;

    return reload.page_reloaded &&
      cls !== 'A' &&
      !opened.some((event) => rep(event) === id) &&
      (reload.check_count > 0 || presented.some((event) => rep(event) === id))
      ? (cls ?? 'U')
      : null;
  };
  const held = REPORTS.filter((id) => heldClass(id) !== null);
  const heldReason =
    held.length === 0 ? null : HELD_REASON[heldClass(held[0])!];
  // U24 completion (the owner's RL-3 closeout decision 1, 25 October 2026;
  // PROVISIONAL component, never a value): every held report named on the
  // ratings companion with its class, apart from an ordinarily missing
  // rating (`missing_reports`: a due report whose rating was not given). A
  // held report is never due, never rated, never in a denominator.
  const heldReports = held.map((id) => ({
    report: id,
    class: heldClass(id) as Exclude<ReloadClass, 'A'>,
  }));

  if (opened.length === 0) {
    // D-2 (i): no report opened beside a held report ⇒ both rows
    // interrupted, null (HB + DEC / NOP / HB; U + DEC).
    if (heldReason !== null) {
      return [
        emptyFeature('M22', primary, 'interrupted', heldReason, {
          supporting_sequences: supporting,
        }),
        emptyFeature('M22', companion, 'interrupted', heldReason, {
          components: { held_reports: heldReports },
        }),
      ];
    }

    if (presented.length > 0) {
      const reason = 'reports presented, desk never opened';

      return [
        emptyFeature('M22', primary, 'declined', reason, {
          supporting_sequences: supporting,
        }),
        emptyFeature('M22', companion, 'declined', reason),
      ];
    }

    // An established absence takes the first-load reading (r3 §5, NOP + NOP
    // (A)); `absentFeature`'s reload branch is kept for a load without one.
    if (
      reload.page_reloaded &&
      REPORTS.every((id) => reload.occasions[id].class === 'A')
    ) {
      return [
        emptyFeature(
          'M22',
          primary,
          'not_presented',
          'report desk never opened',
          {
            supporting_sequences: supporting,
          },
        ),
        emptyFeature(
          'M22',
          companion,
          'not_presented',
          'report desk never opened',
        ),
      ];
    }

    return [
      absentFeature('M22', primary, context, 'report desk never opened', {
        supporting_sequences: supporting,
      }),
      absentFeature('M22', companion, context, 'report desk never opened'),
    ];
  }

  if (failed.length > 0) {
    const reason = 'technical failure closed a report';

    return [
      emptyFeature('M22', primary, 'technical_failure', reason, {
        closure_reason: 'technical_failure',
        supporting_sequences: supporting,
      }),
      emptyFeature('M22', companion, 'technical_failure', reason),
    ];
  }

  const rawByReport: Partial<Record<ReportId, M22Raw>> = {};
  const exitByReport: Partial<Record<ReportId, string>> = {};
  const invalidByReport: Partial<Record<ReportId, string>> = {};

  for (const event of closed) {
    const raw =
      meta<M22Raw>(event, 'raw_components') ??
      meta<M22Raw>(event, 'raw_components_partial');
    const id = rep(event);

    if (raw !== undefined && (id === 'o1' || id === 'o2')) {
      rawByReport[id] = raw;
      exitByReport[id] = meta<string>(event, 'exit_state') ?? 'unknown';

      const detail = meta<string>(event, 'invalid_detail');

      if (detail !== undefined) {
        invalidByReport[id] = detail;
      }
    }
  }

  const perReport = REPORTS.map((id) => {
    const raw = rawByReport[id];
    const requirement = setbacks.some((event) => rep(event) === id);
    const ack = acknowledged.find((event) => rep(event) === id);
    const ackSeq = ack?.sequence ?? null;
    // Recount: a code attached after the acknowledgement = revision begun.
    const revisionFromEvents = attached.some(
      (event) =>
        rep(event) === id && ackSeq !== null && (event.sequence ?? 0) > ackSeq,
    );
    const recountAgrees =
      raw === undefined || raw.revision_begun === revisionFromEvents;
    const rating =
      answered.find((event) => rep(event) === id) ??
      declined.find((event) => rep(event) === id);

    return {
      report: id,
      opened: opened.some((event) => rep(event) === id),
      closed: raw !== undefined,
      exit: exitByReport[id] ?? null,
      invalid_detail: invalidByReport[id] ?? null,
      requirement_presented: requirement,
      acknowledged: ack !== undefined,
      revision_begun: raw?.revision_begun ?? revisionFromEvents,
      recovery_complete: raw?.recovery_complete ?? false,
      withdrawn: raw?.stop_choice === 'withdrawn',
      recount_agrees: recountAgrees,
      rating:
        rating === undefined
          ? null
          : {
              value: meta<number | null>(rating, 'value') ?? null,
              declined: rating.event_type === `${FAMILY}rating_declined`,
              recall_delay_ms:
                meta<number | null>(rating, 'recall_delay_ms') ?? null,
              position: meta<number | null>(rating, 'position') ?? null,
            },
    };
  });

  const anyReview = perReport.some((row) => row.exit === 'closed_at_review');
  const closureReason = anyReview
    ? ('closed_at_review' as const)
    : perReport.some((row) => row.closed)
      ? ('completed' as const)
      : null;

  if (perReport.some((row) => !row.recount_agrees)) {
    const reason = 'report record disagrees with the code_attached events';

    return [
      emptyFeature('M22', primary, 'technical_failure', reason, {
        closure_reason: closureReason,
        supporting_sequences: supporting,
        components: { reports: perReport },
      }),
      emptyFeature('M22', companion, 'technical_failure', reason),
    ];
  }

  // Eligible: the requirement presented and the report decided by the
  // participant (accepted or withdrawn after the acknowledgement), or
  // review-closed after a revision had begun (an observed 1 either way).
  // Excluded: never submitted (no requirement); returned but never
  // acknowledged (invalid, insufficient opportunity); acknowledged and left
  // to the review with no revision begun (censored).
  const eligible = perReport.filter(
    (row) =>
      row.requirement_presented &&
      row.closed &&
      row.invalid_detail === null &&
      (row.exit !== 'closed_at_review' || row.revision_begun),
  );
  const censored = perReport.filter(
    (row) =>
      row.requirement_presented &&
      row.invalid_detail === null &&
      (!row.closed || (row.exit === 'closed_at_review' && !row.revision_begun)),
  );
  const invalid = perReport.filter((row) => row.invalid_detail !== null);
  const numerator = eligible.filter((row) => row.revision_begun).length;
  const openReports = perReport.filter((row) => row.opened && !row.closed);
  const components = {
    reports: perReport,
    eligible_reports: eligible.map((row) => row.report),
    censored_reports: censored.map((row) => row.report),
    invalid_reports: invalid.map((row) => ({
      report: row.report,
      detail: row.invalid_detail,
    })),
    requirements_presented: perReport.filter((row) => row.requirement_presented)
      .length,
    open_reports: openReports.map((row) => row.report),
  };
  const pending = openReports.length > 0 && !context.finalCoreClosed;
  // A zero denominator: pending while a report is open; interrupted when a
  // returned report was left to the review; understanding_failed when every
  // returned report was closed with its note unacknowledged; otherwise no
  // eligible event (no requirement was ever presented).
  const zero = {
    disposition: pending
      ? ('pending' as const)
      : censored.length > 0
        ? ('interrupted' as const)
        : invalid.length > 0
          ? ('understanding_failed' as const)
          : ('no_eligible_event' as const),
    reason: pending
      ? 'a report is still open'
      : censored.length > 0
        ? 'the requirement was presented but the report was left to the review'
        : invalid.length > 0
          ? 'the returned note was never acknowledged on any returned report'
          : 'no requirement presented (no valid first submission)',
  };
  const primaryRow = fractionFeature(
    'M22',
    primary,
    numerator,
    eligible.length,
    eligible.map((row) => `m22_returned_${row.report}`),
    supporting,
    zero,
    {
      closure_reason: closureReason,
      censored: censored.length > 0,
      censor_reason:
        censored.length > 0
          ? 'a returned report was left to the review after the acknowledgement'
          : null,
      components,
      ...(pending && eligible.length > 0
        ? { disposition: 'pending' as const }
        : {}),
    },
  );

  // Companion: the ratings, kept apart from the behaviour.
  const dueReports = perReport.filter(
    (row) => row.requirement_presented && row.closed,
  );
  // The ratings carry their order (position) and, beside them, whether the
  // report's note was acknowledged — never combined into one number.
  const ratingValue = {
    o1: perReport[0].rating,
    o2: perReport[1].rating,
  };
  const acknowledgedReports = perReport
    .filter((row) => row.acknowledged)
    .map((row) => row.report);
  const anyAnswered = perReport.some(
    (row) => row.rating !== null && !row.rating.declined,
  );
  const allDeclined =
    dueReports.length > 0 &&
    dueReports.every((row) => row.rating !== null && row.rating.declined);
  const companionRow = anyAnswered
    ? observedFeature('M22', companion, ratingValue, {
        closure_reason: closureReason,
        supporting_sequences: supporting,
        components: {
          rating_presented: ratingPresented.length > 0,
          rating_screens_presented: ratingPresented.length,
          acknowledged_reports: acknowledgedReports,
          declined_reports: perReport
            .filter((row) => row.rating?.declined)
            .map((row) => row.report),
          missing_reports: dueReports
            .filter((row) => row.rating === null)
            .map((row) => row.report),
          held_reports: heldReports,
        },
      })
    : emptyFeature(
        'M22',
        companion,
        allDeclined
          ? 'declined'
          : dueReports.length === 0
            ? 'no_eligible_event'
            : context.finalCoreClosed
              ? 'interrupted'
              : 'pending',
        allDeclined
          ? 'every due rating was declined'
          : dueReports.length === 0
            ? 'no returned report to rate'
            : context.finalCoreClosed
              ? 'the ratings were never answered'
              : 'the ratings are still due',
        {
          closure_reason: closureReason,
          supporting_sequences: supporting,
          components: {
            rating_presented: ratingPresented.length > 0,
            rating_screens_presented: ratingPresented.length,
            acknowledged_reports: acknowledgedReports,
            held_reports: heldReports,
          },
        },
      );

  // D-2 (i) (U24 RL-3): a held report beside the others — never a zero,
  // never in the denominator. With a resolved count the primary is
  // `interrupted` and keeps the observed report's contribution (overriding
  // `incomplete`); without one, a primary that would read
  // `no_eligible_event` is `interrupted` · null / 0 (M21's "HB + OBS-ok"
  // row carried over); `pending`, an existing `interrupted` and
  // `understanding_failed` (an invalidity) keep their readings. The ratings
  // companion keeps its own reading, as M01's companion beside its
  // S-F2 primary (register §5.409 reading (n)).
  if (heldReason !== null && primaryRow.disposition !== 'technical_failure') {
    if (eligible.length > 0) {
      return [
        { ...primaryRow, disposition: 'interrupted' as const },
        companionRow,
      ] satisfies FeatureRecord[];
    }

    if (primaryRow.disposition === 'no_eligible_event') {
      return [
        {
          ...primaryRow,
          disposition: 'interrupted' as const,
          missing_reason: heldReason,
        },
        companionRow,
      ] satisfies FeatureRecord[];
    }
  }

  return [primaryRow, companionRow] satisfies FeatureRecord[];
});
