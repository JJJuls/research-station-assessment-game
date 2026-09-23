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
 */
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

registerFeatureExtractor('M21', (events, context) => {
  const entry = registerEntry('M21');
  const [primary] = entry.features;
  const load = currentLoadEvents(events, context);
  const family = load.filter((e) => e.event_type.startsWith(FAMILY));
  const supporting = sequencesOf(family);
  const presented = eventsOfType(load, `${FAMILY}presented`);
  const opened = eventsOfType(load, `${FAMILY}opportunity_opened`);
  const closed = eventsOfType(load, `${FAMILY}window_closed`);
  const applied = eventsOfType(load, `${FAMILY}applied`);
  const consulted = eventsOfType(load, `${FAMILY}section_consulted`);
  const failed = eventsOfType(load, `${FAMILY}technical_failure`);
  // The adapter's own events carry `case`; the window kit's closures carry
  // the window's `occasion` (the same id).
  const occ = (event: { metadata?: Record<string, unknown> }) =>
    meta<string>(event as never, 'case') ??
    meta<string>(event as never, 'occasion');

  if (opened.length === 0) {
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
  return [row] satisfies FeatureRecord[];
});
