/**
 * Station 080 M01 — two three-job batches with optional sequencing
 * (Unit 5), pure tests.
 *
 * Playwright test blocks that never touch `page`: the register row; the
 * board is optional (direct work without touching it is an observed 0 for
 * that occasion); a partial plan is valid; the first job press — runnable
 * or not — snapshots the board, returns a held card and locks the board;
 * later placements are refused; a job whose printed requirement is not
 * done is refused as a dependency error (job correctness, never a
 * planning score); a press inside the settle window after a job is
 * refused; any workable order completes the batch; the reload guard; and
 * the extractor reproducing planned / 6 with the occasion detail kept
 * separately — unplanned (0) ≠ unobserved (left before any job press) ≠
 * declined ≠ not presented ≠ interrupted ≠ pending; one observed occasion
 * is `incomplete`.
 *
 * U24 RL-1 (`RELOAD-CORRECTION-SPEC-r3-exec.md` §2, §5, §8; owner ruling
 * R-1 of 23 October 2026): every r3 §5 row of M01 after a reload, with the
 * class and the permission to administer of each occasion as well as the
 * reading; F-A to F-E at row level; the precedence of duplicate,
 * malformed and discontinuous checks; and a contradiction of the whole
 * check kept apart from one confined to an occasion. Each stream is built
 * the way the runtime writes it: the record from the row's own stage map,
 * and the marker of a held occasion at its presentation. The expected
 * readings are written from r3 §5, never from running the extractor.
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import {
  classifyM01Reload,
  m01PriorLoadCheck,
} from '../src/measurement/features/m01';
import { registerEntry } from '../src/measurement/registerV3';
import {
  createM01State,
  M01_BATCHES,
  M01_SETTLE_MS,
  m01DependencyViolations,
  type M01LogSink,
  m01Observed,
  type M01Occasion,
  m01PacketCards,
  m01Pick,
  m01Place,
  m01PlanAdherence,
  m01PlanViolations,
  m01PriorAdministration,
  m01RawComponents,
  m01Return,
  type M01State,
  m01Work,
} from '../src/pilot/windows/m01BatchModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

function harness() {
  const events: RawGameEvent[] = [];
  const push = (
    occasion: M01Occasion,
    suffix: string,
    metadata: Record<string, unknown>,
  ) => {
    events.push({
      session_id: 's',
      timestamp_ms: events.length,
      scene: occasion === 'o1' ? 'station_concourse' : 'records_workshop',
      event_type: `proto_m01_batch_${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: {
        opportunity_id: `proto_m01_batch_${occasion}`,
        occasion,
        ...metadata,
      },
    });
  };
  const sink =
    (occasion: M01Occasion): M01LogSink =>
    (suffix, metadata) =>
      push(occasion, suffix, metadata);

  return {
    events,
    sink,
    presented: (occasion: M01Occasion) =>
      push(occasion, 'presented', { input_mode: 'system' }),
    opened: (occasion: M01Occasion) =>
      push(occasion, 'opportunity_opened', { input_mode: 'system' }),
    close: (
      s: M01State,
      reason: 'completed' | 'closed_at_review',
      exit: 'completed' | 'stopped' | 'closed_at_review' = 'completed',
    ) =>
      push(s.occasion, 'window_closed', {
        exit_state: exit,
        [exit === 'closed_at_review' && !m01Observed(s)
          ? 'raw_components_partial'
          : 'raw_components']: m01RawComponents(s, reason),
      }),
  };
}

const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };
const OPEN_CONTEXT = { ...CONTEXT, finalCoreClosed: false };

/** Runs the three jobs in a workable order from `at`, a second apart. */
function doAll(s: M01State, at: number, log: M01LogSink, order?: string[]) {
  const ids = order ?? M01_BATCHES[s.occasion].jobs.map((job) => job.id);
  const results = ids.map((id, index) =>
    m01Work(s, id, at + index * 1_000, 'pointer', log),
  );

  return results;
}

test.describe('M01 three-job batches (pure)', () => {
  test('register row: v3 route with one window per occasion in different rooms, planned-observations denominator of six, structure companion', () => {
    const entry = registerEntry('M01');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual([
      'proto_m01_batch_o1',
      'proto_m01_batch_o2',
    ]);
    expect(entry.route.windows.map((w) => [w.occasion, w.zone])).toEqual([
      ['o1', 'station_concourse'],
      ['o2', 'records_workshop'],
    ]);
    expect(entry.route.family_prefixes).toEqual(['proto_m01_batch_']);
    expect(entry.disposition).toBe('PRIMARY-CANDIDATE');
    expect(entry.disposition_override).toBeNull();
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.independence.kind).toBe('independent_occasions');
    expect(entry.features.map((f) => f.feature_id)).toEqual([
      'm01_planned_jobs',
      'm01_plan_structure',
    ]);
    expect(entry.features[0].planned_denominator).toBe(6);
    expect(entry.features[0].denominator_kind).toBe('planned_observations');
    expect(entry.operational_label).toBe('Job batches (Concourse / Workshop)');
    // Two unrelated batches: disjoint job ids, each with ≥ 2 workable orders.
    const o1 = M01_BATCHES.o1.jobs.map((j) => j.id);
    const o2 = M01_BATCHES.o2.jobs.map((j) => j.id);

    expect(o1.some((id) => o2.includes(id))).toBe(false);

    for (const occasion of ['o1', 'o2'] as const) {
      const jobs = M01_BATCHES[occasion].jobs;
      const perms = [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0],
      ].map((p) => p.map((i) => jobs[i].id));
      const workable = perms.filter(
        (order) => m01DependencyViolations(occasion, order).length === 0,
      );

      expect(workable.length).toBeGreaterThanOrEqual(2);
      expect(workable.length).toBeLessThan(perms.length);
    }
  });

  test('direct work without the board: the first press snapshots an empty board (observed 0), later placements are refused, any workable order completes; dependency errors are job correctness', () => {
    const h = harness();
    const s = createM01State('o1', 'form_a');
    const log = h.sink('o1');

    expect(m01Observed(s)).toBe(false);
    expect(m01PacketCards(s).map((c) => c.id)).toEqual([
      'isolate_loop',
      'replace_seal',
      'log_storm',
    ]);
    // A blocked first press still takes the snapshot (it IS the first work action).
    expect(m01Work(s, 'replace_seal', 1_000, 'keyboard', log)).toBe('blocked');
    expect(m01Observed(s)).toBe(true);
    expect(s.snapshot).toMatchObject({
      planned_jobs: 0,
      plan_order: [],
      held_returned: false,
      at_ms: 1_000,
    });
    expect(s.plan_locked).toBe(true);
    expect(s.dependency_errors).toEqual([
      { job_id: 'replace_seal', requires: 'isolate_loop', at_ms: 1_000 },
    ]);
    // The board is locked after the first work action.
    expect(m01Pick(s, 'log_storm', 'pointer', log)).toBe(false);
    expect(m01Place(s, 0, 'pointer', log)).toBe(false);
    // Workable order: log_storm, isolate_loop, replace_seal.
    expect(m01Work(s, 'log_storm', 2_000, 'pointer', log)).toBe('done');
    expect(m01Work(s, 'isolate_loop', 3_000, 'pointer', log)).toBe('done');
    expect(m01Work(s, 'replace_seal', 4_000, 'keyboard', log)).toBe('complete');
    expect(m01Work(s, 'log_storm', 5_000, 'pointer', log)).toBe('refused');
    expect(m01RawComponents(s, 'completed')).toMatchObject({
      observed: true,
      planned_jobs: 0,
      plan_order: [],
      execution_order: ['log_storm', 'isolate_loop', 'replace_seal'],
      jobs_done: 3,
      all_done: true,
      plan_adherence: 0,
      dependency_error_count: 1,
      placements: 0,
    });
    expect(
      h.events.filter((e) => e.event_type === 'proto_m01_batch_plan_snapshot'),
    ).toHaveLength(1);
    expect(
      h.events
        .filter((e) => e.event_type === 'proto_m01_batch_job_done')
        .map((e) => [e.metadata?.step, e.metadata?.followed_plan]),
    ).toEqual([
      [1, false],
      [2, false],
      [3, false],
    ]);
  });

  test('partial and full plans: placements, swaps and returns before the first press; a held card is returned by the snapshot; adherence and plan violations are companions; the settle window refuses a carried press', () => {
    const h = harness();
    const s = createM01State('o2', 'form_b');
    const log = h.sink('o2');

    // Reversed packet order under form_b (requirements unchanged).
    expect(m01PacketCards(s).map((c) => c.id)).toEqual([
      'count_hand_tools',
      'seal_spares_crate',
      'sort_spares',
    ]);
    expect(m01Place(s, 0, 'pointer', log)).toBe(false); // nothing held
    expect(m01Pick(s, 'seal_spares_crate', 'pointer', log)).toBe(true);
    expect(m01Pick(s, 'sort_spares', 'pointer', log)).toBe(false); // already holding
    expect(m01Place(s, 0, 'pointer', log)).toBe(true);
    expect(m01Pick(s, 'sort_spares', 'keyboard', log)).toBe(true);
    // Swap: placing on an occupied slot lifts the occupant.
    expect(m01Place(s, 0, 'keyboard', log)).toBe(true);
    expect(s.slots).toEqual(['sort_spares', null, null]);
    expect(s.held).toBe('seal_spares_crate');
    expect(m01Place(s, 1, 'keyboard', log)).toBe(true);
    expect(s.held).toBeNull();
    // Lift the third card and leave it held: the snapshot returns it.
    expect(m01Pick(s, 'count_hand_tools', 'pointer', log)).toBe(true);
    expect(m01Return(s, 'pointer', log)).toBe(true);
    expect(m01Pick(s, 'count_hand_tools', 'pointer', log)).toBe(true);
    expect(s.placements).toBe(3);

    expect(m01Work(s, 'sort_spares', 10_000, 'pointer', log)).toBe('done');
    expect(s.snapshot).toMatchObject({
      planned_jobs: 2,
      plan_order: ['sort_spares', 'seal_spares_crate'],
      plan_dependency_violations: [],
      held_returned: true,
      held_from_slot: null,
    });
    expect(s.held).toBeNull();
    expect(s.returns).toBe(2);
    // Carried press inside the settle window: refused, logged.
    expect(m01Work(s, 'seal_spares_crate', 10_100, 'keyboard', log)).toBe(
      'refused',
    );
    expect(s.refused_presses).toBe(1);
    expect(
      m01Work(s, 'seal_spares_crate', 10_000 + M01_SETTLE_MS, 'keyboard', log),
    ).toBe('done');
    expect(m01Work(s, 'count_hand_tools', 12_000, 'pointer', log)).toBe(
      'complete',
    );
    expect(m01PlanAdherence(s)).toBe(2);
    expect(m01RawComponents(s, 'completed')).toMatchObject({
      planned_jobs: 2,
      plan_adherence: 2,
      dependency_error_count: 0,
      refused_presses: 1,
      board_final: ['sort_spares', 'seal_spares_crate', null],
    });

    // A plan that violates the printed requirement is valid as a plan and
    // recorded as a violation; the work itself is then blocked.
    const v = createM01State('o1', 'form_a');
    const vlog = h.sink('o1');

    m01Pick(v, 'replace_seal', 'pointer', vlog);
    m01Place(v, 0, 'pointer', vlog);
    m01Pick(v, 'isolate_loop', 'pointer', vlog);
    m01Place(v, 1, 'pointer', vlog);
    m01Pick(v, 'log_storm', 'pointer', vlog);
    m01Place(v, 2, 'pointer', vlog);
    expect(m01Work(v, 'replace_seal', 100, 'pointer', vlog)).toBe('blocked');
    expect(v.snapshot).toMatchObject({
      planned_jobs: 3,
      plan_dependency_violations: [
        { job_id: 'replace_seal', requires: 'isolate_loop' },
      ],
    });
    // A partial plan that leaves a requirement off the board is not a
    // violation (review U5 F4); the same order IS an unworkable order.
    expect(m01PlanViolations('o1', ['replace_seal', null, null])).toEqual([]);
    expect(
      m01DependencyViolations('o1', ['replace_seal', null, null]),
    ).toHaveLength(1);
    expect(
      doAll(v, 1_000, vlog, ['isolate_loop', 'replace_seal', 'log_storm']),
    ).toEqual(['done', 'done', 'complete']);
    expect(m01PlanAdherence(v)).toBe(1); // only log_storm at position 3
  });

  test('extractor: 0 + 2 planned over two observed occasions = 2 / 6 observed; direct-work 0 is a valid zero; one observed occasion is incomplete; snapshot cross-check', () => {
    const h = harness();
    const a = createM01State('o1', 'form_a');
    const b = createM01State('o2', 'form_a');

    h.presented('o1');
    h.opened('o1');
    doAll(a, 0, h.sink('o1'), ['isolate_loop', 'log_storm', 'replace_seal']);
    h.close(a, 'completed');
    h.presented('o2');
    h.opened('o2');
    m01Pick(b, 'sort_spares', 'pointer', h.sink('o2'));
    m01Place(b, 0, 'pointer', h.sink('o2'));
    m01Pick(b, 'seal_spares_crate', 'pointer', h.sink('o2'));
    m01Place(b, 1, 'pointer', h.sink('o2'));
    doAll(b, 100_000, h.sink('o2'));
    h.close(b, 'completed');

    const rows = extractItemFeatures('M01', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      feature_id: 'm01_planned_jobs',
      value: 2,
      numerator: 2,
      denominator: 6,
      planned_denominator: 6,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
      included_ids: ['m01_batch_o1', 'm01_batch_o2'],
      coverage_label: 'behavioural_counterpart',
      independence: 'independent_occasions',
    });
    expect(rows[0].components).toMatchObject({
      occasions_observed: ['o1', 'o2'],
      planned_by_occasion: { o1: 0, o2: 2 },
      snapshot_agrees: true,
    });
    expect(rows[1]).toMatchObject({
      feature_id: 'm01_plan_structure',
      disposition: 'observed',
    });

    // Targeted check (U5-T): "incomplete below six" describes missing
    // OBSERVATION coverage, never fewer planned jobs. Two valid observed
    // batches worked directly, with no planning at all, are a COMPLETE
    // observed 0 / 6; the partial plan above (2 of 3 placed) left the row
    // `observed` too — planning depth never touches the disposition.
    const none = harness();
    const n1 = createM01State('o1', 'form_a');
    const n2 = createM01State('o2', 'form_a');

    none.presented('o1');
    none.opened('o1');
    doAll(n1, 0, none.sink('o1'), [
      'isolate_loop',
      'log_storm',
      'replace_seal',
    ]);
    none.close(n1, 'completed');
    none.presented('o2');
    none.opened('o2');
    doAll(n2, 50_000, none.sink('o2'));
    none.close(n2, 'completed');

    const noneRows = extractItemFeatures('M01', none.events, CONTEXT);

    expect(noneRows[0]).toMatchObject({
      feature_id: 'm01_planned_jobs',
      value: 0,
      numerator: 0,
      denominator: 6,
      planned_denominator: 6,
      disposition: 'observed',
      censored: false,
      included_ids: ['m01_batch_o1', 'm01_batch_o2'],
    });
    expect(noneRows[0].components).toMatchObject({
      occasions_observed: ['o1', 'o2'],
      planned_by_occasion: { o1: 0, o2: 0 },
    });

    const structure = rows[1].value as {
      o1: { planned_jobs: number; plan_adherence: number; all_done: boolean };
      o2: {
        planned_jobs: number;
        plan_order: string[];
        plan_adherence: number;
      };
    };

    expect(structure.o1).toMatchObject({
      planned_jobs: 0,
      plan_adherence: 0,
      all_done: true,
    });
    expect(structure.o2).toMatchObject({
      planned_jobs: 2,
      plan_order: ['sort_spares', 'seal_spares_crate'],
      plan_adherence: 2,
    });

    // One observed occasion, the other declined: value kept, incomplete.
    const one = harness();
    const only = createM01State('o1', 'form_a');

    one.presented('o1');
    one.opened('o1');
    m01Pick(only, 'log_storm', 'pointer', one.sink('o1'));
    m01Place(only, 0, 'pointer', one.sink('o1'));
    doAll(only, 0, one.sink('o1'), [
      'log_storm',
      'isolate_loop',
      'replace_seal',
    ]);
    one.close(only, 'completed');
    one.presented('o2');

    const oneRows = extractItemFeatures('M01', one.events, CONTEXT);

    expect(oneRows[0]).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 3,
      disposition: 'incomplete',
      included_ids: ['m01_batch_o1'],
    });
    expect(oneRows[0].components).toMatchObject({
      occasions_declined: ['o2'],
    });
    expect((oneRows[1].value as { o2: unknown }).o2).toEqual({
      occasion: 'o2',
      declined: true,
    });

    // A closure whose planned count disagrees with the snapshot event.
    const tampered = h.events.map((event) =>
      event.event_type === 'proto_m01_batch_window_closed' &&
      event.metadata?.occasion === 'o2'
        ? {
            ...event,
            metadata: {
              ...event.metadata,
              raw_components: {
                ...(event.metadata!.raw_components as Record<string, unknown>),
                planned_jobs: 3,
              },
            },
          }
        : event,
    );

    expect(extractItemFeatures('M01', tampered, CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });
  });

  test('extractor: unobserved (opened, left before any job press) ≠ unplanned; a batch with a snapshot but unfinished jobs is a complete observation at the review; declined ≠ not presented ≠ interrupted ≠ pending; reload guard per occasion', () => {
    // Both opened, neither worked: no observation — voluntary_stop, null.
    const h = harness();
    const a = createM01State('o1', 'form_a');
    const b = createM01State('o2', 'form_a');

    h.presented('o1');
    h.opened('o1');
    m01Pick(a, 'isolate_loop', 'pointer', h.sink('o1'));
    m01Place(a, 0, 'pointer', h.sink('o1'));
    h.close(a, 'closed_at_review', 'closed_at_review');
    h.presented('o2');
    h.opened('o2');
    h.close(b, 'closed_at_review', 'closed_at_review');

    const rows = extractItemFeatures('M01', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      value: null,
      denominator: 0,
      disposition: 'no_eligible_event',
      closure_reason: 'closed_at_review',
      censored: true,
    });
    expect(rows[0].components).toMatchObject({
      occasions_observed: [],
      occasions_opened_unobserved: ['o1', 'o2'],
    });

    // Snapshot taken, one job done, the review closes it: observed value.
    const r = harness();
    const c = createM01State('o1', 'form_a');

    r.presented('o1');
    r.opened('o1');
    m01Pick(c, 'log_storm', 'pointer', r.sink('o1'));
    m01Place(c, 2, 'pointer', r.sink('o1'));
    expect(m01Work(c, 'isolate_loop', 5, 'pointer', r.sink('o1'))).toBe('done');
    r.close(c, 'closed_at_review', 'stopped');

    const reviewRows = extractItemFeatures('M01', r.events, CONTEXT);

    expect(reviewRows[0]).toMatchObject({
      value: 1,
      numerator: 1,
      denominator: 3,
      disposition: 'incomplete',
      closure_reason: 'closed_at_review',
      censored: false,
    });
    expect(
      (reviewRows[1].value as { o1: { jobs_done: number; all_done: boolean } })
        .o1,
    ).toMatchObject({ jobs_done: 1, all_done: false });

    // Presented, never opened → declined; nothing → not presented; reload.
    const d = harness();

    d.presented('o1');
    expect(extractItemFeatures('M01', d.events, CONTEXT)[0].disposition).toBe(
      'declined',
    );
    expect(extractItemFeatures('M01', [], CONTEXT)[0].disposition).toBe(
      'not_presented',
    );
    expect(
      extractItemFeatures('M01', [], { ...CONTEXT, reloaded: true })[0]
        .disposition,
    ).toBe('interrupted');

    // Open, no closure yet → pending.
    const o = harness();

    o.presented('o1');
    o.opened('o1');
    expect(
      extractItemFeatures('M01', o.events, OPEN_CONTEXT)[0].disposition,
    ).toBe('pending');

    // Reload guard recognises the SAME occasion only; a held-back occasion
    // beside an observed one makes the item interrupted, value kept.
    expect(m01PriorAdministration(o.events, 'o1')).toBe(true);
    expect(m01PriorAdministration(o.events, 'o2')).toBe(false);

    const mixed = harness();
    const m = createM01State('o2', 'form_a');

    mixed.sink('o1')('technical_failure', {
      detail: 'reload after administration: batch not re-run',
      input_mode: 'system',
    });
    mixed.presented('o2');
    mixed.opened('o2');
    doAll(m, 0, mixed.sink('o2'));
    mixed.close(m, 'completed');

    const mixedRows = extractItemFeatures('M01', mixed.events, {
      ...CONTEXT,
      reloaded: true,
    });

    expect(mixedRows[0]).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 3,
      disposition: 'interrupted',
      censored: true,
    });
    expect(mixedRows[0].components).toMatchObject({
      occasions_interrupted: ['o1'],
    });
    expect((mixedRows[1].value as { o1: unknown }).o1).toEqual({
      occasion: 'o1',
      interrupted: true,
    });

    // Reload with prior-load evidence and NO reopen of o1 (review U5 F5):
    // the absent occasion is held back by the context, never "declined".
    const noReopen = harness();
    const n2 = createM01State('o2', 'form_a');

    noReopen.presented('o2');
    noReopen.opened('o2');
    doAll(n2, 0, noReopen.sink('o2'));
    noReopen.close(n2, 'completed');

    const noReopenRows = extractItemFeatures('M01', noReopen.events, {
      ...CONTEXT,
      reloaded: true,
    });

    expect(noReopenRows[0]).toMatchObject({
      value: 0,
      denominator: 3,
      disposition: 'interrupted',
      censored: true,
    });
    expect(noReopenRows[0].components).toMatchObject({
      occasions_interrupted: ['o1'],
    });
  });
});

/* ------------------------------------------------------------------ *
 * U24 RL-1: the reload check at availability (pure)
 * ------------------------------------------------------------------ */

const CONTINUOUS = {
  first_sequence: 1,
  sequence_gap_count: 0,
  sequence_duplicate_count: 0,
  recovered_from_chunks: false,
};
/** A history that cannot be verified (recovered from chunks). */
const UNVERIFIED = { ...CONTINUOUS, recovered_from_chunks: true };
/** The window's marker details (r3 §2 validity records). */
const HOLD_DETAIL = {
  H: 'reload after administration: batch not re-run',
  U: 'reload with an unverified earlier state: batch not administered',
  M: 'reload with a contradictory earlier check: batch not administered',
} as const;
const UNVERIFIED_REASON =
  'batch not administered after a reload: earlier history not verified';
const CONTRADICTORY_REASON =
  'batch not administered after a reload: earlier check contradictory';
const OPENED_REASON =
  'batch opened in an earlier page load; not re-run after the reload';

type PriorStep = 'session' | 'presented' | 'opened' | 'H' | 'U' | 'M';
type Step = 'none' | 'present' | 'observe0' | 'observe1' | 'open_unobserved';

/** One earlier page load: what it holds per occasion. */
function priorLoad(
  index: number,
  from: number,
  steps: readonly [M01Occasion | null, PriorStep][],
): RawGameEvent[] {
  const h = harness();

  for (const [occasion, step] of steps) {
    if (occasion === null || step === 'session') {
      h.events.push({
        session_id: 's',
        timestamp_ms: 0,
        scene: 'dock',
        event_type: 'session_start',
        metadata: {},
      });
      continue;
    }

    h.presented(occasion);

    if (step === 'opened') {
      h.opened(occasion);
    } else if (step !== 'presented') {
      h.sink(occasion)('technical_failure', {
        detail: HOLD_DETAIL[step],
        input_mode: 'system',
      });
    }
  }

  return h.events.map((event, i) => ({
    ...event,
    page_load_index: index,
    sequence: from + i,
  }));
}

function checkEvent(record: object, loadIndex: number): RawGameEvent {
  return {
    session_id: 's',
    timestamp_ms: 0,
    scene: 'station_concourse',
    event_type: 'proto_m01_batch_prior_load_checked',
    page_load_index: loadIndex,
    metadata: {
      opportunity_id: 'proto_m01_batch_o1',
      occasion: 'o1',
      ...record,
      input_mode: 'system',
    },
  };
}

/**
 * A reloaded load as the runtime writes it: the record from the row's own
 * stage map (or `records`, to inject defects), then per occasion its
 * presentation and — unless its class is A — the marker; an A occasion
 * goes on as `step` says.
 */
function reloadedLoad(
  prior: RawGameEvent[],
  steps: Record<M01Occasion, Step>,
  options: {
    integrity?: typeof CONTINUOUS;
    pageLoadIndex?: number;
    records?: (record: Record<string, unknown>) => object[];
  } = {},
) {
  const pageLoadIndex = options.pageLoadIndex ?? 2;
  const record = m01PriorLoadCheck(
    pageLoadIndex,
    prior,
    options.integrity ?? CONTINUOUS,
  ) as unknown as Record<string, unknown>;
  const records = options.records?.(record) ?? [record];
  const reload = classifyM01Reload(pageLoadIndex, records);
  const h = harness();

  for (const occasion of ['o1', 'o2'] as const) {
    const step = steps[occasion];
    const cls = reload.occasions[occasion].class;

    if (step === 'none') {
      continue;
    }

    h.presented(occasion);

    if (cls !== 'A') {
      h.sink(occasion)('technical_failure', {
        detail: HOLD_DETAIL[cls ?? 'U'],
        input_mode: 'system',
      });
      continue;
    }

    if (step === 'present') {
      continue;
    }

    const s = createM01State(occasion, 'form_a');

    h.opened(occasion);

    if (step === 'open_unobserved') {
      h.close(s, 'closed_at_review', 'closed_at_review');
      continue;
    }

    if (step === 'observe1') {
      m01Pick(
        s,
        occasion === 'o1' ? 'isolate_loop' : 'sort_spares',
        'pointer',
        h.sink(occasion),
      );
      m01Place(s, 0, 'pointer', h.sink(occasion));
    }

    doAll(
      s,
      occasion === 'o1' ? 0 : 100_000,
      h.sink(occasion),
      occasion === 'o1'
        ? ['isolate_loop', 'log_storm', 'replace_seal']
        : undefined,
    );
    h.close(s, 'completed');
  }

  const from = prior.length + 1;
  const current = [
    ...records.map((r) => checkEvent(r, pageLoadIndex)),
    ...h.events,
  ].map((event, i) => ({
    ...event,
    page_load_index: pageLoadIndex,
    sequence: from + i,
  }));
  const rows = extractItemFeatures('M01', [...prior, ...current], {
    finalCoreClosed: true,
    pageLoadIndex,
    reloaded: true,
  });

  return { record, reload, rows };
}

const NEVER = priorLoad(1, 1, [[null, 'session']]);
const O1_OPENED = priorLoad(1, 1, [['o1', 'opened']]);
const BOTH_OPENED = priorLoad(1, 1, [
  ['o1', 'opened'],
  ['o2', 'opened'],
]);
const O1_EARLIER_U = priorLoad(1, 1, [['o1', 'U']]);

type Row = Record<string, unknown> & {
  disposition: string;
  value: number | null;
  numerator?: number | null;
  denominator?: number | null;
};

/** r3 §5 M01, every row (after the correction): class, permission, reading. */
const M01_CASES: readonly {
  name: string;
  prior: RawGameEvent[];
  steps: Record<M01Occasion, Step>;
  integrity?: typeof CONTINUOUS;
  classes: [string | null, string | null];
  row: Row;
  reason?: string;
}[] = [
  {
    name: 'HB+OBS ⇒ interrupted · x · x/3 (the S-F2 reading, unchanged)',
    prior: O1_OPENED,
    steps: { o1: 'present', o2: 'observe1' },
    classes: ['H', 'A'],
    row: { disposition: 'interrupted', value: 1, numerator: 1, denominator: 3 },
  },
  {
    name: 'H, not reopened, + DEC (S3) ⇒ interrupted · null · null/null: the marker is written at availability (a)',
    prior: O1_OPENED,
    steps: { o1: 'present', o2: 'present' },
    classes: ['H', 'A'],
    row: { disposition: 'interrupted', value: null },
    reason: OPENED_REASON,
  },
  {
    name: 'HB+NOP ⇒ interrupted · null · null/null',
    prior: O1_OPENED,
    steps: { o1: 'present', o2: 'none' },
    classes: ['H', 'A'],
    row: { disposition: 'interrupted', value: null },
  },
  {
    name: 'HB+HB ⇒ interrupted · null · null/null',
    prior: BOTH_OPENED,
    steps: { o1: 'present', o2: 'present' },
    classes: ['H', 'H'],
    row: { disposition: 'interrupted', value: null },
  },
  {
    name: 'U + DEC ⇒ interrupted · null · null/null, reason unverified (c)',
    prior: O1_EARLIER_U,
    steps: { o1: 'present', o2: 'present' },
    classes: ['U', 'A'],
    row: { disposition: 'interrupted', value: null },
    reason: UNVERIFIED_REASON,
  },
  {
    name: 'OBS+OBS ⇒ observed · x1+x2 · (x1+x2)/6',
    prior: NEVER,
    steps: { o1: 'observe1', o2: 'observe0' },
    classes: ['A', 'A'],
    row: { disposition: 'observed', value: 1, numerator: 1, denominator: 6 },
  },
  {
    name: 'OBS+DEC ⇒ incomplete · x · x/3',
    prior: NEVER,
    steps: { o1: 'observe1', o2: 'present' },
    classes: ['A', 'A'],
    row: { disposition: 'incomplete', value: 1, numerator: 1, denominator: 3 },
  },
  {
    name: 'OBS + NOP (A) ⇒ incomplete · x · x/3, no longer interrupted (b)',
    prior: NEVER,
    steps: { o1: 'observe1', o2: 'none' },
    classes: ['A', 'A'],
    row: { disposition: 'incomplete', value: 1, numerator: 1, denominator: 3 },
  },
  {
    name: 'HB(U) + OBS(A) ⇒ interrupted · x · x/3 (clarification 1; F-D)',
    prior: O1_EARLIER_U,
    steps: { o1: 'present', o2: 'observe1' },
    classes: ['U', 'A'],
    row: { disposition: 'interrupted', value: 1, numerator: 1, denominator: 3 },
  },
  {
    name: 'history-level U (both occasions) ⇒ interrupted · null · null/null, reason unverified; nothing administered (c)',
    prior: NEVER,
    integrity: UNVERIFIED,
    steps: { o1: 'present', o2: 'none' },
    classes: ['U', 'U'],
    row: { disposition: 'interrupted', value: null },
    reason: UNVERIFIED_REASON,
  },
  {
    name: 'OU + NOP (A) ⇒ no_eligible_event · null · null/0 (b)',
    prior: NEVER,
    steps: { o1: 'open_unobserved', o2: 'none' },
    classes: ['A', 'A'],
    row: {
      disposition: 'no_eligible_event',
      value: null,
      numerator: null,
      denominator: 0,
    },
  },
  {
    name: 'NOP + NOP (A) ⇒ not_presented · null · null/null (b)',
    prior: NEVER,
    steps: { o1: 'none', o2: 'none' },
    classes: ['A', 'A'],
    row: { disposition: 'not_presented', value: null },
  },
  {
    name: 'DEC+DEC (A) ⇒ declined · null · null/null',
    prior: NEVER,
    steps: { o1: 'present', o2: 'present' },
    classes: ['A', 'A'],
    row: { disposition: 'declined', value: null },
  },
  {
    name: 'DEC+NOP (A) ⇒ declined · null · null/null',
    prior: NEVER,
    steps: { o1: 'present', o2: 'none' },
    classes: ['A', 'A'],
    row: { disposition: 'declined', value: null },
  },
  {
    name: 'DEC+DEC (U) ⇒ interrupted · null · null/null (c)',
    prior: NEVER,
    integrity: UNVERIFIED,
    steps: { o1: 'present', o2: 'present' },
    classes: ['U', 'U'],
    row: { disposition: 'interrupted', value: null },
    reason: UNVERIFIED_REASON,
  },
];

test.describe('M01 reload at availability (U24 RL-1, pure)', () => {
  for (const c of M01_CASES) {
    test(`r3 §5: ${c.name}`, () => {
      const { reload, rows } = reloadedLoad(c.prior, c.steps, {
        integrity: c.integrity,
      });

      expect([reload.occasions.o1.class, reload.occasions.o2.class]).toEqual(
        c.classes,
      );
      // Only A is administered (r3 §2).
      expect([
        reload.occasions.o1.administration_permitted,
        reload.occasions.o2.administration_permitted,
      ]).toEqual(c.classes.map((cls) => cls === 'A'));
      expect(rows[0]).toMatchObject(c.row);

      if (c.reason !== undefined) {
        expect(rows[0].missing_reason).toBe(c.reason);
      }
    });
  }

  test('a first load writes no check and keeps its readings; the record is never task evidence', () => {
    expect(m01PriorLoadCheck(1, [], CONTINUOUS)).toBeNull();

    const { rows } = reloadedLoad(NEVER, { o1: 'observe1', o2: 'none' });

    // The check record's sequence is not among the supporting sequences.
    expect(rows[0].supporting_sequences).not.toContain(NEVER.length + 1);
  });

  test('F-A: two agreeing check records with distinct sequences ⇒ U for both, refused; the U reading', () => {
    const { reload, rows } = reloadedLoad(
      NEVER,
      { o1: 'none', o2: 'none' },
      { records: (record) => [record, { ...record }] },
    );

    expect(reload.check_count).toBe(2);
    expect(reload.check_coherent).toBe(true);
    expect(reload.occasions.o1).toMatchObject({
      class: 'U',
      administration_permitted: false,
      basis: 'duplicate_checks',
    });
    expect(reload.occasions.o2.class).toBe('U');
    expect(rows[0]).toMatchObject({ disposition: 'interrupted', value: null });
    expect(rows[0].missing_reason).toBe(UNVERIFIED_REASON);
  });

  test('F-B: conflicting duplicate checks ⇒ U, refused, coherence false', () => {
    const { reload, rows } = reloadedLoad(
      O1_OPENED,
      { o1: 'present', o2: 'none' },
      {
        records: (record) => [
          record,
          { ...record, prior_opening_found: false },
        ],
      },
    );

    expect(reload.check_coherent).toBe(false);
    expect(reload.occasions.o1).toMatchObject({
      class: 'U',
      administration_permitted: false,
    });
    expect(rows[0]).toMatchObject({ disposition: 'interrupted', value: null });
  });

  test('F-C: an earlier U or M hold-back, then a continuous history ⇒ that occasion stays U and refused; its sibling stays A', () => {
    for (const earlier of ['U', 'M'] as const) {
      const prior = priorLoad(1, 1, [['o1', earlier]]);
      const { record, reload } = reloadedLoad(prior, {
        o1: 'present',
        o2: 'none',
      });

      expect(record.history_continuous).toBe(true);
      expect(reload.occasions.o1).toMatchObject({
        class: 'U',
        administration_permitted: false,
        basis: 'absence_not_established',
      });
      expect(reload.occasions.o2.class).toBe('A');
    }
  });

  test('F-E: an H marker of one occasion leaves its sibling A, administered and observed', () => {
    // Load 1 opened o1; load 2 held it (H marker) and presented o2.
    const prior = [
      ...O1_OPENED,
      ...priorLoad(2, O1_OPENED.length + 1, [
        ['o1', 'H'],
        ['o2', 'presented'],
      ]),
    ];
    const { record, reload, rows } = reloadedLoad(
      prior,
      { o1: 'present', o2: 'observe1' },
      { pageLoadIndex: 3 },
    );
    const o2 = (record.occasions as Record<string, Record<string, unknown>>).o2;

    expect(o2).toMatchObject({
      prior_briefing_found: true,
      prior_opening_found: false,
      prior_opening_absence_established: true,
    });
    expect(reload.occasions.o1.class).toBe('H');
    expect(reload.occasions.o2).toMatchObject({
      class: 'A',
      administration_permitted: true,
    });
    expect(rows[0]).toMatchObject({
      disposition: 'interrupted',
      value: 1,
      numerator: 1,
      denominator: 3,
    });
  });

  test('R-1: an earlier opening beside a discontinuous history stays H, the incomplete-history flags kept; the sibling is U', () => {
    const { record, reload, rows } = reloadedLoad(
      O1_OPENED,
      { o1: 'present', o2: 'present' },
      { integrity: UNVERIFIED },
    );

    // The record keeps the incomplete history: no absence, no continuity.
    expect(record).toMatchObject({
      history_continuous: false,
      prior_opening_found: true,
      prior_opening_absence_established: false,
      prior_opening_sequences: [2],
    });
    expect(reload.history_level_uncertain).toBe(true);
    expect(reload.occasions.o1).toMatchObject({
      class: 'H',
      administration_permitted: false,
      basis: 'opening_found',
    });
    expect(reload.occasions.o2).toMatchObject({
      class: 'U',
      basis: 'history_discontinuous',
    });
    expect(rows[0]).toMatchObject({ disposition: 'interrupted', value: null });
    expect(rows[0].missing_reason).toBe(
      `${OPENED_REASON}; ${UNVERIFIED_REASON}`,
    );
  });

  test('precedence: duplicate checks that report an earlier opening are U, never H', () => {
    const { reload } = reloadedLoad(
      O1_OPENED,
      { o1: 'present', o2: 'none' },
      { records: (record) => [record, { ...record }] },
    );

    expect(reload.occasions.o1).toMatchObject({
      class: 'U',
      basis: 'duplicate_checks',
      administration_permitted: false,
    });
  });

  test('precedence: a malformed check that reports an earlier opening is a technical failure, never H', () => {
    const { reload, rows } = reloadedLoad(
      O1_OPENED,
      { o1: 'present', o2: 'none' },
      { records: (record) => [{ ...record, page_load_index: 1 }] },
    );

    expect(reload.check_malformed).toBe(true);
    expect(reload.occasions.o1).toMatchObject({
      class: 'U',
      basis: 'malformed_check',
      administration_permitted: false,
    });
    expect(rows[0]).toMatchObject({
      disposition: 'technical_failure',
      value: null,
    });
    expect(rows[1].disposition).toBe('technical_failure');
  });

  test('a contradiction of the whole check holds both occasions as M; one confined to an occasion leaves the sibling its own class', () => {
    // Whole check: the row claims the absence while the history is broken.
    const whole = reloadedLoad(
      NEVER,
      { o1: 'present', o2: 'none' },
      {
        integrity: UNVERIFIED,
        records: (record) => [
          { ...record, prior_opening_absence_established: true },
        ],
      },
    );

    expect(whole.reload.check_coherent).toBe(false);
    expect(whole.reload.occasions.o1).toMatchObject({
      class: 'M',
      basis: 'check_incoherent',
    });
    expect(whole.reload.occasions.o2.class).toBe('M');
    expect(whole.rows[0]).toMatchObject({
      disposition: 'interrupted',
      value: null,
    });
    expect(whole.rows[0].missing_reason).toBe(CONTRADICTORY_REASON);

    // Occasion-local: only o1's own flags contradict each other.
    const local = reloadedLoad(
      NEVER,
      { o1: 'present', o2: 'observe1' },
      {
        records: (record) => {
          const occasions = record.occasions as Record<
            string,
            Record<string, unknown>
          >;

          return [
            {
              ...record,
              prior_opening_found: true,
              prior_opening_absence_established: false,
              occasions: {
                ...occasions,
                o1: {
                  ...occasions.o1,
                  prior_opening_found: true,
                  prior_opening_absence_established: true,
                },
              },
            },
          ];
        },
      },
    );

    // The aggregate flag is false, but o2 keeps its own A and is observed.
    expect(local.reload.check_coherent).toBe(false);
    expect(local.reload.occasions.o1).toMatchObject({
      class: 'M',
      basis: 'occasion_incoherent',
      administration_permitted: false,
    });
    expect(local.reload.occasions.o2).toMatchObject({
      class: 'A',
      administration_permitted: true,
    });
    expect(local.rows[0]).toMatchObject({
      disposition: 'interrupted',
      value: 1,
      numerator: 1,
      denominator: 3,
    });
  });
});
