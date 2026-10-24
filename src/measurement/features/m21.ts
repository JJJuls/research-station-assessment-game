/**
 * M21 feature extractor (Unit 10): `m21_restudy_revisions` = cases with a
 * RELEVANT restudy AND a revised application / cases whose FIRST
 * application was incorrect (a conditional-eligibility denominator: the
 * participant's own incorrect first applications, complete at any size
 * above zero). Two first-time successes ⇒ null (`no_eligible_event`) —
 * never a failure-conditioned score. A case with an incorrect first
 * application that the review closed before its numerator fact was
 * observed is censored (excluded, exported in the components); one whose
 * relevant restudy AND revised application were already observed keeps
 * its 1 (review S-F2); an exit (set aside) after an incorrect application
 * is an observed 0 for that case. The numerator is RECOUNTED from the
 * `section_consulted` and `applied` events (review S-F9): a section read
 * after application k that bears on a fault known from applications 1..k,
 * followed by a revised application. Read-only over the raw
 * `proto_m21_case_*` events.
 *
 * Reload (U24 RL-3, `RELOAD-CORRECTION-SPEC-r3-exec.md` §2, §4 G5 and §5;
 * owner decision D-2 (i)): the load's `prior_load_checked` record
 * classifies each case H / A / U / M (stage 1 `presented`, stage 3
 * `opportunity_opened`). A held case is never a zero and never in the
 * denominator: beside an observed case the row reads `interrupted` with
 * the observed case's contribution kept (overriding `observed`); with no
 * observed case `interrupted` · null — null / 0 when a case was opened,
 * null / null when none was. A reload hold-back marker no longer makes the
 * row a technical failure. Under A a case without evidence takes the
 * first-load reading; a presented, unopened case of a reloaded load without
 * its check is U (RL-1C decision A). The record is never task evidence.
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
  registerFeatureExtractor,
  sequencesOf,
} from './extract';
import type { FeatureRecord } from './types';

const FAMILY = 'proto_m21_case_';
const CASES = ['o1', 'o2'] as const;
/** Sections that bear on each subsystem (mirrors the model's M21_RELEVANT_SECTIONS). */
const RELEVANT: Record<string, readonly string[]> = {
  posts: ['s2_post_rule', 's4_code_table'],
  selector: ['s3_selector_rule'],
};

type CaseId = (typeof CASES)[number];

interface M21Raw {
  case: CaseId;
  form: string;
  applications: number;
  first_application_correct: boolean | null;
  first_application_faults: string[] | null;
  relevant_restudy: boolean | null;
  revised_application: boolean | null;
  restudy_revision: boolean | null;
  accepted: boolean;
  strategy: string;
  stop_choice: string | null;
}

/** The case of an event: the adapter's `case`, else the kit's `occasion`. */
function caseOf(event: {
  metadata?: Record<string, unknown> | null;
}): string | undefined {
  const value = event.metadata?.case ?? event.metadata?.occasion;

  return typeof value === 'string' ? value : undefined;
}

/**
 * The load's reload check (U24 RL-3; r1 §1 stage map, confirmed against the
 * code): per case, stage 1 the case's `presented` (with the return shift's
 * work orders), no stage 2, stage 3 its `opportunity_opened` (the bench
 * entering the case), the case's hold-back markers. Null on a first load.
 */
export function m21PriorLoadCheck(
  pageLoadIndex: number,
  priorLoadEvents: readonly ReloadEvent[],
  integrity: ReloadHistoryIntegrity,
): PriorLoadCheck | null {
  const of =
    (suffix: string, id: CaseId) =>
    (event: ReloadEvent): boolean =>
      event.event_type === `${FAMILY}${suffix}` && caseOf(event) === id;

  return computePriorLoadCheck({
    pageLoadIndex,
    priorLoadEvents,
    integrity,
    occasions: Object.fromEntries(
      CASES.map((id) => [
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

/** Each case's class from the load's check records (r3 §2). */
export function classifyM21Reload(
  pageLoadIndex: number,
  checks: readonly object[],
): ReloadClassification {
  return classifyReload({ pageLoadIndex, checks, occasions: CASES });
}

/** The current-load reason of a held case, by its class. */
const HELD_REASON = {
  H: 'bench case opened in an earlier page load; not re-run after the reload',
  U: 'bench case not administered after a reload: earlier history not verified',
  M: 'bench case not administered after a reload: earlier check contradictory',
} as const;

registerFeatureExtractor('M21', (events, context) => {
  const entry = registerEntry('M21');
  const [primary] = entry.features;
  const load = currentLoadEvents(events, context);
  const own = load.filter((e) => e.event_type.startsWith(FAMILY));
  const family = withoutPriorLoadChecks(own, FAMILY);
  const supporting = sequencesOf(family);
  const presented = eventsOfType(load, `${FAMILY}presented`);
  const opened = eventsOfType(load, `${FAMILY}opportunity_opened`);
  const closed = eventsOfType(load, `${FAMILY}window_closed`);
  const applied = eventsOfType(load, `${FAMILY}applied`);
  const consulted = eventsOfType(load, `${FAMILY}section_consulted`);
  const markerClass = (event: { metadata?: Record<string, unknown> | null }) =>
    reloadHoldBackClass(event.metadata?.detail);
  // A reload hold-back marker is not a fault of the case (D-2 (i)); any
  // other technical failure keeps the existing whole-row rule.
  const failed = eventsOfType(load, `${FAMILY}technical_failure`).filter(
    (event) => markerClass(event) === null,
  );
  const markers = eventsOfType(load, `${FAMILY}technical_failure`).filter(
    (event) => markerClass(event) !== null,
  );
  // The adapter's own events carry `case`; the window kit's closures carry
  // the window's `occasion` (the same id).
  const occ = (event: { metadata?: Record<string, unknown> }) =>
    meta<string>(event as never, 'case') ??
    meta<string>(event as never, 'occasion');
  const reload = classifyM21Reload(
    context.pageLoadIndex,
    eventsOfType(own, `${FAMILY}${PRIOR_LOAD_CHECK_SUFFIX}`).map(
      (event) => event.metadata ?? {},
    ),
  );

  // A malformed check record stays under the existing rule (r3 §2;
  // §5.290 (a)): a technical failure, never uncertain history.
  if (reload.check_malformed) {
    return [
      emptyFeature(
        'M21',
        primary,
        'technical_failure',
        'a reload check record describes another page load',
        { supporting_sequences: supporting },
      ),
    ];
  }

  // Each held case (U24 RL-3): its marker's class; else, after a reload, an
  // unopened case whose class is not A — with a check always, without one
  // only once it was presented in this load (RL-1C decision A).
  const heldClass = (id: CaseId): Exclude<ReloadClass, 'A'> | null => {
    const marker = markers.find((event) => occ(event) === id);

    if (marker !== undefined) {
      return markerClass(marker);
    }

    const cls = reload.occasions[id].class;

    return reload.page_reloaded &&
      cls !== 'A' &&
      !opened.some((event) => occ(event) === id) &&
      (reload.check_count > 0 || presented.some((event) => occ(event) === id))
      ? (cls ?? 'U')
      : null;
  };
  const held = CASES.filter((id) => heldClass(id) !== null);
  const heldReason =
    held.length === 0 ? null : HELD_REASON[heldClass(held[0])!];

  if (opened.length === 0) {
    // D-2 (i): no case opened beside a held case ⇒ interrupted, null /
    // null (HB + DEC / NOP / HB; U + DEC).
    if (heldReason !== null) {
      return [
        emptyFeature('M21', primary, 'interrupted', heldReason, {
          supporting_sequences: supporting,
        }),
      ];
    }

    if (presented.length > 0) {
      return [
        emptyFeature(
          'M21',
          primary,
          'declined',
          'bench units presented, never taken up',
          { supporting_sequences: supporting },
        ),
      ];
    }

    // An established absence takes the first-load reading (r3 §5, NOP + NOP
    // (A)); `absentFeature`'s reload branch is kept for a load without one.
    if (
      reload.page_reloaded &&
      CASES.every((id) => reload.occasions[id].class === 'A')
    ) {
      return [
        emptyFeature(
          'M21',
          primary,
          'not_presented',
          'relay bench never opened',
          {
            supporting_sequences: supporting,
          },
        ),
      ];
    }

    return [
      absentFeature('M21', primary, context, 'relay bench never opened', {
        supporting_sequences: supporting,
      }),
    ];
  }

  if (failed.length > 0) {
    return [
      emptyFeature(
        'M21',
        primary,
        'technical_failure',
        'technical failure closed a bench case',
        {
          closure_reason: 'technical_failure',
          supporting_sequences: supporting,
        },
      ),
    ];
  }

  // Latest closure per case; the applied events recount the first response.
  const rawByCase: Partial<Record<CaseId, M21Raw>> = {};
  const exitByCase: Partial<Record<CaseId, string>> = {};

  for (const event of closed) {
    const raw =
      meta<M21Raw>(event, 'raw_components') ??
      meta<M21Raw>(event, 'raw_components_partial');
    const id = occ(event);

    if (raw !== undefined && (id === 'o1' || id === 'o2')) {
      rawByCase[id] = raw;
      exitByCase[id] = meta<string>(event, 'exit_state') ?? 'unknown';
    }
  }

  const firstApplied = (id: CaseId) =>
    applied.find(
      (event) => occ(event) === id && meta<number>(event, 'index') === 1,
    );
  // The numerator fact recounted from the raw events: a relevant restudy
  // (a section read after application k bearing on a fault known from
  // applications 1..k) followed by a revised application.
  const recountRestudyRevision = (id: CaseId): boolean | null => {
    const apps = applied
      .filter((event) => occ(event) === id)
      .map((event) => ({
        index: meta<number>(event, 'index') ?? 0,
        faults: meta<string[]>(event, 'faults') ?? [],
        revised: meta<boolean>(event, 'revised') ?? false,
        correct: meta<boolean>(event, 'correct') ?? false,
      }))
      .sort((a, b) => a.index - b.index);

    if (apps.length === 0 || apps[0].correct) {
      return null;
    }

    const knownAfter = (k: number) =>
      apps.slice(0, k).flatMap((application) => application.faults);
    const relevantVisits = consulted
      .filter((event) => occ(event) === id)
      .map((event) => ({
        k: meta<number>(event, 'after_application') ?? 0,
        section: meta<string>(event, 'section') ?? '',
      }))
      .filter(
        (visit) =>
          visit.k >= 1 &&
          knownAfter(visit.k).some((fault) =>
            (RELEVANT[fault] ?? []).includes(visit.section),
          ),
      );

    return apps.some(
      (application) =>
        application.index > 1 &&
        application.revised &&
        relevantVisits.some((visit) => visit.k < application.index),
    );
  };
  const openCases = CASES.filter(
    (id) =>
      opened.some((event) => occ(event) === id) && rawByCase[id] === undefined,
  );
  const perCase = CASES.map((id) => {
    const raw = rawByCase[id];
    const first = firstApplied(id);
    const firstCorrectFromEvents =
      first === undefined ? null : (meta<boolean>(first, 'correct') ?? null);
    const recounted = recountRestudyRevision(id);
    const recountAgrees =
      raw === undefined ||
      ((raw.first_application_correct === null ||
        firstCorrectFromEvents === null ||
        raw.first_application_correct === firstCorrectFromEvents) &&
        (raw.restudy_revision === null ||
          recounted === null ||
          raw.restudy_revision === recounted));

    return {
      case: id,
      opened: opened.some((event) => occ(event) === id),
      closed: raw !== undefined,
      exit: exitByCase[id] ?? null,
      first_application_correct:
        raw?.first_application_correct ?? firstCorrectFromEvents,
      restudy_revision: raw?.restudy_revision ?? recounted,
      recounted_restudy_revision: recounted,
      relevant_restudy: raw?.relevant_restudy ?? null,
      revised_application: raw?.revised_application ?? null,
      strategy:
        raw?.strategy ??
        (first === undefined ? 'no_application' : 'unresolved'),
      accepted: raw?.accepted ?? false,
      recount_agrees: recountAgrees,
    };
  });

  if (perCase.some((row) => !row.recount_agrees)) {
    return [
      emptyFeature(
        'M21',
        primary,
        'technical_failure',
        'case record disagrees with the applied events',
        { supporting_sequences: supporting, components: { cases: perCase } },
      ),
    ];
  }

  // Eligible: an incorrect first application closed by the participant
  // (accepted or set aside), or closed by the review AFTER its numerator
  // fact was observed (review S-F2). A review-closed or still-open
  // incorrect case whose fact is not yet observed is censored and excluded.
  const eligible = perCase.filter(
    (row) =>
      row.closed &&
      row.first_application_correct === false &&
      (row.exit !== 'closed_at_review' || row.restudy_revision === true),
  );
  const censoredCases = perCase.filter(
    (row) =>
      row.first_application_correct === false &&
      (!row.closed ||
        (row.exit === 'closed_at_review' && row.restudy_revision !== true)),
  );
  const numerator = eligible.filter(
    (row) => row.restudy_revision === true,
  ).length;
  const anyReview = perCase.some((row) => row.exit === 'closed_at_review');
  const components = {
    cases: perCase,
    eligible_cases: eligible.map((row) => row.case),
    censored_cases: censoredCases.map((row) => row.case),
    first_time_successes: perCase.filter(
      (row) => row.first_application_correct === true,
    ).length,
    strategies: Object.fromEntries(
      perCase.map((row) => [row.case, row.strategy]),
    ),
    open_cases: openCases,
  };
  const zero = {
    disposition:
      openCases.length > 0 && !context.finalCoreClosed
        ? ('pending' as const)
        : censoredCases.length > 0
          ? ('interrupted' as const)
          : ('no_eligible_event' as const),
    reason:
      openCases.length > 0 && !context.finalCoreClosed
        ? 'a bench case is still open'
        : censoredCases.length > 0
          ? 'the only incorrect first application was cut short by the review'
          : perCase.some((row) => row.first_application_correct === true)
            ? 'no incorrect first application (first-time successes only)'
            : 'no application made',
  };
  const row = fractionFeature(
    'M21',
    primary,
    numerator,
    eligible.length,
    eligible.map((r) => `m21_case_${r.case}`),
    supporting,
    zero,
    {
      closure_reason: anyReview
        ? ('closed_at_review' as const)
        : eligible.length > 0 || perCase.some((r) => r.closed)
          ? ('completed' as const)
          : null,
      censored: censoredCases.length > 0,
      censor_reason:
        censoredCases.length > 0
          ? 'an incorrect first application was closed by the review before a revision or an exit'
          : null,
      components,
    },
  );

  // A conditional denominator is complete at any size above zero; an
  // open second case does not make the first case's observation pending
  // — it is exported as observed with `open_cases` beside it.
  //
  // D-2 (i) (U24 RL-3): a held case beside the others — never a zero, never
  // in the denominator. With a resolved count the row is `interrupted` and
  // keeps the observed case's contribution (the S-F2 representation, as
  // M01); without one, a row that would read `no_eligible_event` (the
  // opened case a first-time success) is `interrupted` · null / 0 (r3 §5,
  // "HB + OBS-ok"); `pending` and an existing `interrupted` keep their
  // readings.
  if (heldReason !== null && row.disposition !== 'technical_failure') {
    if (eligible.length > 0) {
      return [{ ...row, disposition: 'interrupted' as const }];
    }

    if (row.disposition === 'no_eligible_event') {
      return [
        {
          ...row,
          disposition: 'interrupted' as const,
          missing_reason: heldReason,
        },
      ];
    }
  }

  return [row] satisfies FeatureRecord[];
});
