/**
 * M04 feature extractor (Unit 14): `m04_undisposed_pieces` = pieces not
 * disposed at the first departure from their job, carried pieces
 * included, summed over the jobs that were run and departed / 6 (three
 * per job; a planned-observations denominator — fewer than six ⇒
 * `incomplete`), plus `m04_job_values` (per job: undisposed, disposed,
 * carried, the closing trigger, the route stage at the cut, focused
 * exposure and latency, later disposals). Read-only over the raw
 * `proto_m04_cutting_*` events; the state is RECOUNTED per job from the
 * `piece_picked_up`, `piece_put_back` and `piece_disposed` events that
 * lie between the job's `job_run` and its `first_departure` and compared
 * with the recorded snapshot piece by piece. A completed job is read only
 * when its own `opportunity_opened`, `job_run` and `first_departure`
 * occur once each and in that order, when the cut names the three pieces
 * the job is defined with, and when every disposal of one of them follows
 * its pick-up and occurs once (U14-C); the work orders' `listed` is an
 * exposure record and is never required. Anything else is a record that
 * cannot be reproduced — a technical failure, never a value. An event
 * that names a piece of the OTHER job is not part of this job's recount.
 * A later disposal never changes a job's value. A job never run is
 * not presented; a job closed by the system (the review) had no
 * departure and is censored; a job whose pieces could not be reached or
 * that was held back by a reload is never a value. A pick-up or a
 * disposal issued by a press at another station is counted like any
 * other and FLAGGED beside the value (its origin is part of the record).
 */
import { m04PiecesOf } from '../../pilot/windows/m04CuttingModel';
import type { RawGameEvent } from '../../systems/EventLogger';
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

const FAMILY = 'proto_m04_cutting_';
const PIECES_PER_JOB = 3;

type Job = 'o1' | 'o2';

const JOBS: readonly Job[] = ['o1', 'o2'];
const WINDOW_ID: Record<Job, string> = {
  o1: 'm04_cutting_o1',
  o2: 'm04_cutting_o2',
};

type Status =
  | 'observed'
  | 'mismatch'
  | 'technical'
  | 'interrupted'
  | 'censored'
  | 'pending'
  | 'not_run';

type Missing = Exclude<FeatureDisposition, 'observed' | 'incomplete'>;

function jobOf(event: RawGameEvent): string | undefined {
  return meta<string>(event, 'occasion') ?? meta<string>(event, 'occasion_id');
}

function sameSet(a: readonly string[], b: ReadonlySet<string>): boolean {
  return (
    a.length === b.size &&
    new Set(a).size === a.length &&
    a.every((id) => b.has(id))
  );
}

registerFeatureExtractor('M04', (events, context) => {
  const entry = registerEntry('M04');
  const [primary, values] = entry.features;
  const load = currentLoadEvents(events, context);
  const family = load.filter((e) => e.event_type.startsWith(FAMILY));
  const supporting = sequencesOf(family);
  const listed = eventsOfType(family, `${FAMILY}listed`).length > 0;
  const of = (suffix: string, job: Job) =>
    eventsOfType(family, `${FAMILY}${suffix}`).filter(
      (event) => jobOf(event) === job,
    );

  const perJob = JOBS.map((job) => {
    const runs = of('job_run', job);
    const openings = of('opportunity_opened', job);
    const departures = of('first_departure', job);
    const run = runs[0] ?? null;
    const opened = openings[0] ?? null;
    const departure = departures[0] ?? null;
    const atReview = of('state_at_review', job)[0] ?? null;
    const failures = of('technical_failure', job);
    const heldBack = failures.some((event) =>
      (meta<string>(event, 'detail') ?? '').startsWith('reload'),
    );
    const faulted = failures.some(
      (event) => !(meta<string>(event, 'detail') ?? '').startsWith('reload'),
    );
    const record = departure ?? atReview;
    const openedSequence = opened?.sequence ?? Number.POSITIVE_INFINITY;
    const runSequence = run?.sequence ?? Number.POSITIVE_INFINITY;
    const recordSequence = record?.sequence ?? Number.POSITIVE_INFINITY;
    // The pieces the job is DEFINED with; the cut must name exactly these.
    const expected = m04PiecesOf(job).map((piece) => piece.object_id);
    const pieces = new Set(expected);
    const named = run ? (meta<string[]>(run, 'pieces') ?? []) : [];
    const identitiesAgree =
      named.length === expected.length &&
      new Set(named).size === named.length &&
      named.every((id) => pieces.has(id));
    // Recount: the acts on THIS job's pieces after its cut and BEFORE its
    // first departure, replayed in order. A piece is lifted from where it
    // lies, put back or disposed from the hand, and disposed once; an act
    // that cannot follow from the acts before it is a record that cannot
    // be reproduced (a second disposal of one piece is never hidden).
    const place = new Map<string, 'lying' | 'carried' | 'disposed'>(
      expected.map((id) => [id, 'lying']),
    );
    let replayAgrees = true;

    const inOrder = [...family].sort(
      (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
    );

    for (const event of inOrder) {
      const sequence = event.sequence ?? 0;
      const id = meta<string>(event, 'object_id');

      if (
        jobOf(event) !== job ||
        sequence <= runSequence ||
        sequence >= recordSequence ||
        id === undefined ||
        !pieces.has(id)
      ) {
        continue;
      }

      const from = place.get(id);
      const act = event.event_type.slice(FAMILY.length);

      if (act === 'piece_picked_up') {
        replayAgrees &&= from === 'lying';
        place.set(id, 'carried');
      } else if (act === 'piece_put_back') {
        replayAgrees &&= from === 'carried';
        place.set(id, 'lying');
      } else if (act === 'piece_disposed') {
        replayAgrees &&= from === 'carried';
        place.set(id, 'disposed');
      }
    }

    const disposedBefore = new Set(
      expected.filter((id) => place.get(id) === 'disposed'),
    );
    const carriedBefore = expected.filter((id) => place.get(id) === 'carried');
    const recount = PIECES_PER_JOB - disposedBefore.size;
    const recorded = record
      ? (meta<number>(record, 'undisposed_at_departure') ?? null)
      : null;
    const recordedIds = record
      ? (meta<string[]>(record, 'disposed_ids') ?? [])
      : [];
    const carried = record
      ? (meta<string | null>(record, 'carried_piece') ?? null)
      : null;
    const lying = record
      ? (meta<number>(record, 'pieces_lying') ?? null)
      : null;
    const agrees =
      record !== null &&
      run !== null &&
      opened !== null &&
      openings.length === 1 &&
      runs.length === 1 &&
      departures.length === 1 &&
      openedSequence < runSequence &&
      runSequence < recordSequence &&
      identitiesAgree &&
      replayAgrees &&
      carriedBefore.length <= 1 &&
      recorded === recount &&
      meta<number>(record, 'pieces_disposed') === disposedBefore.size &&
      sameSet(recordedIds, disposedBefore) &&
      carried === (carriedBefore[0] ?? null) &&
      lying === recount - (carried === null ? 0 : 1);
    const late = of('late_disposal', job)
      .map((event) => meta<string>(event, 'object_id'))
      .filter((id): id is string => id !== undefined);
    const routed = (event: RawGameEvent) =>
      (meta<string>(event, 'origin') ?? '').startsWith('station_press:');
    // Pieces lifted by a press at another station, and disposals before
    // the departure that such a press issued or that followed such a
    // pick-up: counted, and flagged.
    const routedPickups = of('piece_picked_up', job)
      .filter(
        (event) => routed(event) && (event.sequence ?? 0) < recordSequence,
      )
      .map((event) => meta<string>(event, 'object_id'))
      .filter((id): id is string => id !== undefined);
    const routedDisposals = of('piece_disposed', job)
      .filter((event) => {
        const id = meta<string>(event, 'object_id');

        return (
          id !== undefined &&
          disposedBefore.has(id) &&
          (event.sequence ?? 0) < recordSequence &&
          (routed(event) || routedPickups.includes(id))
        );
      })
      .map((event) => meta<string>(event, 'object_id'))
      .filter((id): id is string => id !== undefined);
    const status: Status = heldBack
      ? 'interrupted'
      : faulted
        ? 'technical'
        : departure !== null
          ? agrees
            ? 'observed'
            : 'mismatch'
          : atReview !== null
            ? 'censored'
            : run !== null
              ? 'pending'
              : context.reloaded
                ? // After a reload a job without evidence in this load is
                  // never "not run": its evidence may lie in an earlier
                  // load (the M01 / M03 rule).
                  'interrupted'
                : 'not_run';

    return {
      job,
      status,
      routedPickups,
      routedDisposals,
      undisposed: status === 'observed' ? recount : null,
      value:
        status === 'not_run'
          ? null
          : {
              job,
              status,
              undisposed_at_departure: departure ? recorded : null,
              undisposed_recount: departure ? recount : null,
              // A job closed by the system: the state as it stood, kept
              // as context — no departure occurred.
              undisposed_at_review: atReview ? recorded : null,
              pieces_disposed: record
                ? (meta<number>(record, 'pieces_disposed') ?? null)
                : null,
              disposed_ids: record ? recordedIds : null,
              carried_piece: carried,
              pieces_lying: lying,
              departure_trigger: record
                ? (meta<string>(record, 'trigger') ?? null)
                : null,
              departure_detail: record
                ? (meta<string | null>(record, 'detail') ?? null)
                : null,
              stage_at_cut: opened
                ? ((
                    meta<Record<string, unknown>>(
                      opened,
                      'entry_state_snapshot',
                    ) ?? {}
                  ).stage ?? null)
                : null,
              first_disposal_focused_ms: record
                ? (meta<number | null>(record, 'first_disposal_focused_ms') ??
                  null)
                : null,
              exposure_focused_ms: record
                ? (meta<number>(record, 'focused_ms') ?? null)
                : null,
              exposure_wall_ms: record
                ? (meta<number>(record, 'wall_ms') ?? null)
                : null,
              exposure_excluded_ms: record
                ? (meta<Record<string, number>>(record, 'excluded_ms') ?? null)
                : null,
              pickups: of('piece_picked_up', job).length,
              pickup_origins: of('piece_picked_up', job).map(
                (event) => meta<string>(event, 'origin') ?? null,
              ),
              disposal_origins: [
                ...of('piece_disposed', job),
                ...of('late_disposal', job),
              ].map((event) => meta<string>(event, 'origin') ?? null),
              pickups_by_station_press: routedPickups,
              disposed_by_or_after_station_press: routedDisposals,
              put_backs: of('piece_put_back', job).length,
              refused_presses: of('press_refused', job).length,
              late_disposals: late,
              run_input_mode: run
                ? (meta<string>(run, 'input_mode') ?? null)
                : null,
            },
    };
  });

  const by = (status: Status) =>
    perJob.filter((row) => row.status === status).map((row) => row.job);
  const observed = perJob.filter((row) => row.status === 'observed');
  const valuesValue = Object.fromEntries(
    perJob.map((row) => [row.job, row.value]),
  );
  const components = {
    cutter_listed: listed,
    jobs_observed: by('observed'),
    jobs_technically_invalid: by('technical'),
    jobs_interrupted: by('interrupted'),
    jobs_closed_by_system: by('censored'),
    jobs_pending: by('pending'),
    jobs_not_run: by('not_run'),
    undisposed_by_job: Object.fromEntries(
      perJob.map((row) => [row.job, row.undisposed]),
    ),
    late_disposals: perJob.reduce(
      (sum, row) => sum + (row.value?.late_disposals.length ?? 0),
      0,
    ),
    // Counted in the value; flagged because the press was issued at
    // another station (register §5.171).
    pickups_by_station_press: perJob.reduce(
      (sum, row) => sum + row.routedPickups.length,
      0,
    ),
    disposed_by_or_after_station_press: perJob.reduce(
      (sum, row) => sum + row.routedDisposals.length,
      0,
    ),
  };

  if (family.length === 0 || perJob.every((row) => row.status === 'not_run')) {
    // A job never run is not presented (register M04 row): the pieces
    // never existed, so there was nothing to leave or to dispose of.
    const reason = listed
      ? 'no cutting job run (the coupons were listed on the work orders)'
      : 'no cutting job run';

    return [
      absentFeature('M04', primary, context, reason, {
        supporting_sequences: supporting,
        components,
      }),
      absentFeature('M04', values, context, reason),
    ];
  }

  if (by('mismatch').length > 0) {
    // One disagreeing job voids the whole row: a record that cannot be
    // reproduced is not read beside one that can.
    const reason =
      'the recorded state at the first departure disagrees with the raw events';

    return [
      emptyFeature('M04', primary, 'technical_failure', reason, {
        closure_reason: 'technical_failure',
        supporting_sequences: supporting,
        components: { ...components, jobs_disagreeing: by('mismatch') },
      }),
      observedFeature('M04', values, valuesValue, {
        disposition: 'technical_failure',
        closure_reason: 'technical_failure',
        supporting_sequences: supporting,
      }),
    ];
  }

  if (by('pending').length > 0) {
    return [
      emptyFeature(
        'M04',
        primary,
        'pending',
        'a cutting job has not had its first departure yet',
        { supporting_sequences: supporting, components },
      ),
      observedFeature('M04', values, valuesValue, {
        disposition: 'pending',
        supporting_sequences: supporting,
      }),
    ];
  }

  const interrupted = by('interrupted').length > 0;
  const systemClosed = by('censored').length > 0;
  const zero: { disposition: Missing; reason: string } = interrupted
    ? {
        disposition: 'interrupted',
        reason: 'a cutting job was held back after a reload',
      }
    : systemClosed
      ? {
          disposition: 'interrupted',
          reason:
            'every job run was closed by the system before a departure occurred',
        }
      : {
          disposition: 'technical_failure',
          reason: 'the pieces of every job run could not be reached',
        };
  const numerator = observed.reduce(
    (sum, row) => sum + (row.undisposed ?? 0),
    0,
  );
  const denominator = observed.length * PIECES_PER_JOB;
  const censored = interrupted || systemClosed;
  const closure =
    denominator > 0
      ? ('completed' as const)
      : systemClosed
        ? ('closed_at_review' as const)
        : interrupted
          ? null
          : ('technical_failure' as const);
  const row = fractionFeature(
    'M04',
    primary,
    numerator,
    denominator,
    observed.map((job) => WINDOW_ID[job.job]),
    supporting,
    zero,
    {
      closure_reason: closure,
      censored,
      censor_reason: interrupted
        ? 'job held back after a reload'
        : systemClosed
          ? 'job closed by the system before a departure'
          : null,
      supporting_sequences: supporting,
      components,
    },
  );
  // A held-back job beside an observed one: `interrupted` with the value
  // kept (review U3 S-F2 precedent), never a partial score.
  const primaryRow =
    interrupted && denominator > 0
      ? { ...row, disposition: 'interrupted' as const }
      : row;
  const described = denominator > 0 || systemClosed;

  return [
    primaryRow,
    described
      ? observedFeature('M04', values, valuesValue, {
          closure_reason: closure,
          censored,
          supporting_sequences: supporting,
        })
      : emptyFeature('M04', values, zero.disposition, zero.reason, {
          closure_reason: closure,
          supporting_sequences: supporting,
          components: { jobs: valuesValue },
        }),
  ] satisfies FeatureRecord[];
});
