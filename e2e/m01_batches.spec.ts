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
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
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
