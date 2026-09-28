/**
 * Station 080 M04 — own debris at the two cutting jobs (Unit 14), pure
 * tests.
 *
 * Playwright test blocks that never touch `page`: the register row and the
 * six standardised pieces (three per job, the two jobs matched on the
 * distance to the bin); the second job becomes available after the first
 * job's departure; each job's state is recorded once at its own first
 * departure with a carried piece counted; a later disposal is recorded
 * apart and rewrites nothing; a press inside the settle window of a cut is
 * refused; a job closed by the system is censored; and the extractor
 * reproduces undisposed / 6 from the raw events with a job never run ≠
 * pending ≠ interrupted ≠ censored ≠ technically invalid, plus the per-job
 * values companion. U14-C: the adverse cases of the recount (a missing or
 * late opening, a repeated disposal, a disposal without its pick-up,
 * pieces that are not the job's own, a repeated departure), the lines the
 * cutter states, and the raw log left untouched.
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { registerEntry } from '../src/measurement/registerV3';
import { ledgerEntry } from '../src/pilot/evidenceLedger';
import { M03_TOOLS } from '../src/pilot/windows/m03RestoreModel';
import {
  createM04State,
  M04_CUT_SETTLE_MS,
  M04_FAMILY,
  M04_JOBS,
  M04_PIECES,
  M04_PIECES_PER_JOB,
  M04_SPEC,
  m04AllJobsRun,
  m04AnyJobFailed,
  m04AnyJobProduced,
  m04AvailableJob,
  m04CarriedPiece,
  m04CutSettling,
  m04Depart,
  m04Dispose,
  m04EntrySnapshot,
  m04IdleLine,
  type M04Job,
  m04Listed,
  type M04LogSink,
  m04LyingPieces,
  m04NoteJobRun,
  m04NotePressRefused,
  m04NoteUnavailable,
  m04OpenJob,
  m04PickUp,
  type M04PickupOrigin,
  m04PiecesOf,
  m04PriorAdministration,
  m04PutBack,
  m04RawComponents,
  m04RunJob,
  type M04State,
} from '../src/pilot/windows/m04CuttingModel';
import { WORKSHOP_SITES } from '../src/pilot/zoneSites';
import type { RawGameEvent } from '../src/systems/EventLogger';

const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };

/** A captured event stream shaped like the window adapter's emissions. */
function harness() {
  const events: RawGameEvent[] = [];
  const push = (
    job: M04Job,
    suffix: string,
    metadata: Record<string, unknown>,
  ) => {
    events.push({
      session_id: 's',
      timestamp_ms: events.length,
      scene: 'records_workshop',
      event_type: `${M04_FAMILY}${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: {
        opportunity_id: M04_SPEC[job].opportunity_id,
        window_id: M04_SPEC[job].window_id,
        occasion: job,
        ...metadata,
      },
    });
  };
  const sink: M04LogSink = (job, suffix, metadata) =>
    push(job, suffix, metadata);

  return { events, push, sink };
}

/** Runs the next job the way the adapter does (window opened, then the cut). */
function cut(
  h: ReturnType<typeof harness>,
  s: M04State,
  nowMs: number,
  accessible = true,
): M04Job | null {
  const result = m04RunJob(s, accessible, nowMs, 'keyboard');

  if (result.outcome === 'unavailable') {
    m04NoteUnavailable(s, result.reason, 'keyboard', h.sink);

    return null;
  }

  if (result.outcome === 'technical_failure') {
    h.push(result.job, 'technical_failure', {
      detail: 'piece unreachable: a piece of the job cannot be drawn',
      input_mode: 'system',
    });

    return null;
  }

  h.push(result.job, 'presented', { input_mode: 'system' });
  h.push(result.job, 'opportunity_opened', {
    entry_state_snapshot: {
      ...m04EntrySnapshot(result.job),
      stage: 'workshop_work',
    },
    input_mode: 'system',
  });
  m04NoteJobRun(s, result.job, h.sink);

  return result.job;
}

function carryToBin(
  h: ReturnType<typeof harness>,
  s: M04State,
  objectId: string,
  nowMs: number,
  inputMode: 'pointer' | 'keyboard' = 'pointer',
  origin?: M04PickupOrigin,
) {
  expect(m04PickUp(s, objectId, nowMs, inputMode, h.sink, origin)).toBe(true);

  return m04Dispose(s, objectId, nowMs + 50, inputMode, h.sink);
}

function depart(
  h: ReturnType<typeof harness>,
  s: M04State,
  nowMs: number,
  trigger: 'other_station' | 'room_exit' | 'closed_at_review' = 'other_station',
  detail: string | null = 'dispatch_console',
): M04Job[] {
  const closed = m04Depart(s, trigger, detail, nowMs, h.sink);

  for (const job of closed) {
    h.push(
      job,
      'window_closed',
      trigger === 'closed_at_review'
        ? {
            exit_state: 'closed_at_review',
            raw_components_partial: m04RawComponents(
              s,
              job,
              'closed_at_review',
            ),
          }
        : {
            exit_state: 'completed',
            raw_components: m04RawComponents(s, job, 'completed'),
          },
    );
  }

  return closed;
}

test.describe('M04 own debris (pure)', () => {
  test('register row and fixtures: v3 route with two jobs in one episode, six standardised pieces, three per job, matched on the distance to the bin', () => {
    const entry = registerEntry('M04');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual([
      'proto_m04_cutting_o1',
      'proto_m04_cutting_o2',
    ]);
    expect(entry.route.windows).toEqual([
      {
        id: 'm04_cutting_o1',
        occasion: 'o1',
        zone: 'records_workshop',
        episode: 2,
      },
      {
        id: 'm04_cutting_o2',
        occasion: 'o2',
        zone: 'records_workshop',
        episode: 2,
      },
    ]);
    expect(entry.route.family_prefixes).toEqual([M04_FAMILY]);
    expect(
      M04_FAMILY.startsWith(ledgerEntry('M04').route.family_prefixes[0]!),
    ).toBe(false);
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.coverage_label).toBe('behavioural_counterpart');
    expect(entry.independence.kind).toBe('repeated_within_episode');
    // Reverse-keyed on the questionnaire; the telemetry direction is the
    // register's own and is never reversed.
    expect(entry.source.reverse_keyed).toBe(true);
    expect(entry.features.map((f) => [f.feature_id, f.role])).toEqual([
      ['m04_undisposed_pieces', 'primary'],
      ['m04_job_values', 'companion'],
    ]);
    expect(entry.features[0]).toMatchObject({
      planned_denominator: 6,
      denominator_kind: 'planned_observations',
    });
    expect(entry.features[0].higher_means).toMatch(/more own mess/);
    expect(entry.operational_label).toBe('Sample cutter (Workshop)');

    expect(M04_JOBS).toEqual(['o1', 'o2']);
    expect(M04_PIECES).toHaveLength(6);

    for (const job of M04_JOBS) {
      const pieces = m04PiecesOf(job);

      expect(pieces).toHaveLength(M04_PIECES_PER_JOB);
      // One piece of each kind per job.
      expect(pieces.map((piece) => piece.label).sort()).toEqual([
        'blade wrap',
        'coupon offcut',
        'swarf tray',
      ]);
      expect(
        pieces.every((piece) =>
          piece.object_id.endsWith(`_${job === 'o1' ? 'a' : 'b'}`),
        ),
      ).toBe(true);
    }

    // Distinct places — the six places of the v2 scatter, unchanged.
    expect(M04_PIECES.map((piece) => `${piece.dx},${piece.dy}`).sort()).toEqual(
      ['-28,44', '-64,8', '-8,64', '28,44', '52,0', '52,60'].sort(),
    );

    // The two jobs are matched on the summed straight-line distance from
    // their pieces to the bin (within 1 %), and every piece is inside the
    // pointer reach of the cutter's approach point.
    const { cutterScatter, disposalChute } = WORKSHOP_SITES;
    const approach = { x: 348, y: 230 };
    const at = (piece: { dx: number; dy: number }) => ({
      x: cutterScatter.x + piece.dx,
      y: cutterScatter.y + piece.dy,
    });
    const toBin = (job: M04Job) =>
      m04PiecesOf(job).reduce(
        (sum, piece) =>
          sum +
          Math.hypot(
            at(piece).x - disposalChute.x,
            at(piece).y - disposalChute.y,
          ),
        0,
      );

    expect(Math.abs(toBin('o1') - toBin('o2')) / toBin('o1')).toBeLessThan(
      0.01,
    );

    for (const piece of M04_PIECES) {
      expect(
        Math.hypot(at(piece).x - approach.x, at(piece).y - approach.y),
      ).toBeLessThanOrEqual(96);
    }

    // Objects disjoint from M03's tools.
    const tools = new Set(M03_TOOLS.map((tool) => tool.definitionId));

    expect(M04_PIECES.some((piece) => tools.has(piece.object_id))).toBe(false);
    expect(
      M04_PIECES.every((piece) => piece.object_id.startsWith('m04_')),
    ).toBe(true);

    // No label names an evaluation or an instruction.
    for (const piece of M04_PIECES) {
      expect(piece.label).not.toMatch(/mess|dirty|clean|tidy|dispose/i);
    }

    expect(m04EntrySnapshot('o1')).toMatchObject({
      pieces_total: 3,
      cleanup_instructed: false,
      cleanup_rewarded: false,
      disposal_available: true,
      carried_piece_counts_as: 'undisposed',
      later_disposal: 'recorded_apart',
      second_job_available: 'after_the_first_departure_of_job_1',
      cut_settle_ms: M04_CUT_SETTLE_MS,
    });
    expect(m04EntrySnapshot('o2').piece_offsets).toEqual(
      m04PiecesOf('o2').map(({ object_id, dx, dy }) => ({
        object_id,
        dx,
        dy,
      })),
    );
  });

  test('nothing exists before a cut; job 2 waits for the departure from job 1; each job is recorded once at its own first departure', () => {
    const h = harness();
    const s = createM04State();

    expect(m04Listed(s, 10)).toBe(true);
    expect(m04Listed(s, 11)).toBe(false);
    expect(m04LyingPieces(s)).toEqual([]);
    expect(m04AnyJobProduced(s)).toBe(false);
    expect(m04PickUp(s, 'm04_offcut_a', 20, 'pointer', h.sink)).toBe(false);
    expect(m04Depart(s, 'room_exit', null, 30, h.sink)).toEqual([]);
    expect(m04AvailableJob(s)).toBe('o1');

    // Job 1: three pieces, the pieces of job 2 do not exist yet.
    expect(cut(h, s, 1_000)).toBe('o1');
    expect(m04AnyJobProduced(s)).toBe(true);
    expect(m04LyingPieces(s).map((piece) => piece.object_id)).toEqual([
      'm04_offcut_a',
      'm04_swarf_a',
      'm04_wrap_a',
    ]);
    expect(m04OpenJob(s)).toBe('o1');
    expect(m04PickUp(s, 'm04_offcut_b', 1_100, 'pointer', h.sink)).toBe(false);

    // The cutter has no second job while the first is open.
    expect(m04AvailableJob(s)).toBeNull();
    expect(cut(h, s, 1_200)).toBeNull();
    expect(h.events.at(-1)).toMatchObject({
      event_type: `${M04_FAMILY}job_unavailable`,
      metadata: { reason: 'job_open', occasion: 'o1' },
    });

    // One piece disposed by pointer, one carried when the participant
    // turns to another station.
    expect(carryToBin(h, s, 'm04_offcut_a', 2_000)).toBe('disposed');
    expect(
      m04PickUp(s, 'm04_swarf_a', 3_000, 'keyboard', h.sink, 'cutter_press'),
    ).toBe(true);
    // Hands hold one piece.
    expect(m04PickUp(s, 'm04_wrap_a', 3_100, 'keyboard', h.sink)).toBe(false);
    expect(depart(h, s, 6_000)).toEqual(['o1']);
    expect(s.jobs.o1.departure).toMatchObject({
      trigger: 'other_station',
      detail: 'dispatch_console',
      pieces_disposed: 1,
      disposed_ids: ['m04_offcut_a'],
      carried_piece: 'm04_swarf_a',
      pieces_lying: 1,
      undisposed_at_departure: 2,
      first_disposal_focused_ms: 1_050,
      focused_ms: 5_000,
    });
    // A second departure records nothing.
    expect(depart(h, s, 6_500)).toEqual([]);

    // Later cleanup of job 1 is recorded apart and rewrites nothing.
    expect(m04CarriedPiece(s)?.object_id).toBe('m04_swarf_a');
    expect(m04Dispose(s, 'm04_swarf_a', 7_000, 'pointer', h.sink)).toBe('late');
    expect(carryToBin(h, s, 'm04_wrap_a', 7_500, 'keyboard')).toBe('late');
    expect(s.jobs.o1.departure?.undisposed_at_departure).toBe(2);
    expect(s.jobs.o1.lateDisposals).toEqual(['m04_swarf_a', 'm04_wrap_a']);
    expect(m04LyingPieces(s)).toEqual([]);

    // Job 2 is available now, under the same conditions.
    expect(m04AvailableJob(s)).toBe('o2');
    expect(cut(h, s, 10_000)).toBe('o2');
    expect(m04AllJobsRun(s)).toBe(true);
    expect(m04LyingPieces(s).map((piece) => piece.object_id)).toEqual([
      'm04_offcut_b',
      'm04_swarf_b',
      'm04_wrap_b',
    ]);
    // A piece picked up and put back is still lying.
    expect(m04PickUp(s, 'm04_wrap_b', 10_500, 'pointer', h.sink)).toBe(true);
    expect(m04PutBack(s, 'system', h.sink)).toBe(true);
    expect(m04PutBack(s, 'system', h.sink)).toBe(false);
    expect(depart(h, s, 12_000, 'room_exit', null)).toEqual(['o2']);
    expect(s.jobs.o2.departure).toMatchObject({
      trigger: 'room_exit',
      pieces_disposed: 0,
      carried_piece: null,
      pieces_lying: 3,
      undisposed_at_departure: 3,
      first_disposal_focused_ms: null,
    });
    expect(cut(h, s, 13_000)).toBeNull();
    expect(h.events.at(-1)?.metadata).toMatchObject({
      reason: 'all_jobs_run',
    });

    const rows = extractItemFeatures('M04', h.events, CONTEXT);

    expect(rows.map((row) => row.feature_id)).toEqual([
      'm04_undisposed_pieces',
      'm04_job_values',
    ]);
    expect(rows[0]).toMatchObject({
      value: 5,
      numerator: 5,
      denominator: 6,
      planned_denominator: 6,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
      included_ids: ['m04_cutting_o1', 'm04_cutting_o2'],
      coverage_label: 'behavioural_counterpart',
      independence: 'repeated_within_episode',
    });
    expect(rows[0].components).toMatchObject({
      jobs_observed: ['o1', 'o2'],
      undisposed_by_job: { o1: 2, o2: 3 },
      late_disposals: 2,
    });

    const values = rows[1].value as Record<string, Record<string, unknown>>;

    expect(values.o1).toMatchObject({
      undisposed_at_departure: 2,
      carried_piece: 'm04_swarf_a',
      departure_trigger: 'other_station',
      stage_at_cut: 'workshop_work',
      late_disposals: ['m04_swarf_a', 'm04_wrap_a'],
      // Every pick-up keeps where it was issued.
      pickup_origins: ['pointer', 'cutter_press', 'open_floor_press'],
    });
    expect(values.o2).toMatchObject({
      undisposed_at_departure: 3,
      carried_piece: null,
      departure_trigger: 'room_exit',
      late_disposals: [],
      pickups: 1,
      put_backs: 1,
    });

    // No event of the family names an evaluation.
    for (const event of h.events) {
      expect(JSON.stringify(event.metadata)).not.toMatch(
        /score|mess|tidy|penalt|correct/i,
      );
    }
  });

  test('a press inside the settle window of a cut is refused and recorded; a piece of job 1 carried through job 2 belongs to job 1 only', () => {
    const h = harness();
    const s = createM04State();

    expect(m04CutSettling(s, 500)).toBeNull();
    cut(h, s, 1_000);
    expect(m04CutSettling(s, 1_000)).toBe(0);
    expect(m04CutSettling(s, 1_000 + M04_CUT_SETTLE_MS - 1)).toBe(
      M04_CUT_SETTLE_MS - 1,
    );
    expect(m04CutSettling(s, 1_000 + M04_CUT_SETTLE_MS)).toBeNull();
    m04NotePressRefused(s, 300, 'keyboard', h.sink);
    expect(h.events.at(-1)).toMatchObject({
      event_type: `${M04_FAMILY}press_refused`,
      metadata: {
        occasion: 'o1',
        reason: 'cut_settling',
        since_cut_ms: 300,
        settle_ms: M04_CUT_SETTLE_MS,
        input_mode: 'keyboard',
      },
    });
    expect(m04CarriedPiece(s)).toBeNull();

    // The window belongs to the open job: it applies to job 2 as to job 1
    // and is over once the job has had its departure.
    const second = harness();
    const t = createM04State();

    cut(second, t, 100);
    depart(second, t, 5_000);
    expect(m04CutSettling(t, 5_001)).toBeNull();
    cut(second, t, 10_000);
    expect(m04CutSettling(t, 10_400)).toBe(400);
    m04NotePressRefused(t, 400, 'keyboard', second.sink);
    expect(second.events.at(-1)?.metadata).toMatchObject({
      occasion: 'o2',
      reason: 'cut_settling',
    });
    expect(m04CutSettling(t, 10_000 + M04_CUT_SETTLE_MS)).toBeNull();

    // A piece of job 1 is carried at its departure, through the second
    // cut and through job 2's departure.
    expect(m04PickUp(s, 'm04_wrap_a', 4_000, 'pointer', h.sink)).toBe(true);
    depart(h, s, 5_000);
    expect(m04CutSettling(s, 5_100)).toBeNull();
    expect(cut(h, s, 6_000)).toBe('o2');
    expect(h.events.at(-1)?.metadata).toMatchObject({
      carrying_at_cut: 'm04_wrap_a',
      earlier_pieces_lying: 2,
    });
    depart(h, s, 9_000, 'room_exit', null);
    expect(s.jobs.o1.departure).toMatchObject({
      carried_piece: 'm04_wrap_a',
      undisposed_at_departure: 3,
      pieces_lying: 2,
    });
    expect(s.jobs.o2.departure).toMatchObject({
      carried_piece: null,
      undisposed_at_departure: 3,
      pieces_lying: 3,
    });

    const rows = extractItemFeatures('M04', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      value: 6,
      denominator: 6,
      disposition: 'observed',
    });
    expect(
      (rows[1].value as Record<string, Record<string, unknown>>).o1,
    ).toMatchObject({ refused_presses: 1 });
  });

  test('a pick-up or a disposal issued by a press at another station is counted and flagged beside the value', () => {
    const h = harness();
    const s = createM04State();

    cut(h, s, 100);
    // Lifted by a press at the Component Locker, then dropped into the bin
    // by a press on open floor: a disposal inside the window.
    expect(
      carryToBin(
        h,
        s,
        'm04_swarf_a',
        2_000,
        'keyboard',
        'station_press:storage_locker',
      ),
    ).toBe('disposed');
    // Lifted by pointer, dropped by a press at the Assembly Bench.
    expect(m04PickUp(s, 'm04_wrap_a', 3_000, 'pointer', h.sink)).toBe(true);
    expect(
      m04Dispose(
        s,
        'm04_wrap_a',
        3_500,
        'keyboard',
        h.sink,
        'station_press:assembly_bench',
      ),
    ).toBe('disposed');
    // Lifted and dropped by pointer: not flagged.
    carryToBin(h, s, 'm04_offcut_a', 4_000);
    depart(h, s, 6_000);

    const rows = extractItemFeatures('M04', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 3,
      disposition: 'incomplete',
    });
    expect(rows[0].components).toMatchObject({
      pickups_by_station_press: 1,
      disposed_by_or_after_station_press: 2,
    });
    expect(
      (rows[1].value as Record<string, Record<string, unknown>>).o1,
    ).toMatchObject({
      pickup_origins: ['station_press:storage_locker', 'pointer', 'pointer'],
      disposal_origins: [
        'open_floor_press',
        'station_press:assembly_bench',
        'pointer',
      ],
      pickups_by_station_press: ['m04_swarf_a'],
      disposed_by_or_after_station_press: ['m04_swarf_a', 'm04_wrap_a'],
    });

    // Nothing is flagged when every act was pointed or issued at the
    // cutter or on open floor.
    const plain = harness();
    const p = createM04State();

    cut(plain, p, 100);
    carryToBin(plain, p, 'm04_offcut_a', 200, 'keyboard', 'cutter_press');
    depart(plain, p, 900);
    expect(
      extractItemFeatures('M04', plain.events, CONTEXT)[0].components,
    ).toMatchObject({
      pickups_by_station_press: 0,
      disposed_by_or_after_station_press: 0,
    });
  });

  test('every piece disposed is an observed zero; one job run is a partial value; a job never run is not presented', () => {
    const full = harness();
    const s = createM04State();

    cut(full, s, 100);

    for (const piece of m04PiecesOf('o1')) {
      carryToBin(full, s, piece.object_id, 200);
    }

    depart(full, s, 900);
    cut(full, s, 1_000);

    for (const piece of m04PiecesOf('o2')) {
      carryToBin(full, s, piece.object_id, 1_200, 'keyboard');
    }

    depart(full, s, 1_900, 'room_exit', null);
    expect(extractItemFeatures('M04', full.events, CONTEXT)[0]).toMatchObject({
      value: 0,
      numerator: 0,
      denominator: 6,
      disposition: 'observed',
    });

    // Only the first coupon cut: 3 / 3 exported as a partial value.
    const one = harness();
    const single = createM04State();

    cut(one, single, 100);
    depart(one, single, 500, 'room_exit', null);

    const oneRows = extractItemFeatures('M04', one.events, CONTEXT);

    expect(oneRows[0]).toMatchObject({
      value: 3,
      numerator: 3,
      denominator: 3,
      planned_denominator: 6,
      disposition: 'incomplete',
      included_ids: ['m04_cutting_o1'],
    });
    expect(oneRows[0].components).toMatchObject({ jobs_not_run: ['o2'] });
    expect((oneRows[1].value as Record<string, unknown>).o2).toBeNull();

    // Listed on the work orders, never cut: not presented, never a zero.
    const listed = harness();

    listed.push('o1', 'listed', { input_mode: 'system' });

    const listedRows = extractItemFeatures('M04', listed.events, CONTEXT);

    expect(listedRows[0]).toMatchObject({
      value: null,
      disposition: 'not_presented',
    });
    expect(listedRows[0].components).toMatchObject({ cutter_listed: true });
    expect(listedRows[0].missing_reason).toMatch(/listed/);
    expect(extractItemFeatures('M04', [], CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'not_presented',
    });
    expect(
      extractItemFeatures('M04', [], { ...CONTEXT, reloaded: true })[0]
        .disposition,
    ).toBe('interrupted');

    // After a reload a job without evidence in this load is never "not
    // run": beside an observed job the row is interrupted, the value kept.
    expect(
      extractItemFeatures('M04', one.events, { ...CONTEXT, reloaded: true })[0],
    ).toMatchObject({
      value: 3,
      denominator: 3,
      disposition: 'interrupted',
      censored: true,
    });

    // Events of an earlier page load are never counted in this one.
    expect(
      extractItemFeatures('M04', full.events, {
        finalCoreClosed: true,
        pageLoadIndex: 2,
        reloaded: true,
      })[0],
    ).toMatchObject({ value: null, disposition: 'interrupted' });
  });

  test('pending before the first departure; a job closed by the system is censored; unreachable pieces and a reload are never a value', () => {
    const open = harness();
    const s = createM04State();

    cut(open, s, 100);
    carryToBin(open, s, 'm04_wrap_a', 200);
    expect(extractItemFeatures('M04', open.events, CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'pending',
    });

    // The review closes an open job: no departure occurred, so the state
    // is kept as context and never becomes a value.
    expect(depart(open, s, 5_000, 'closed_at_review', null)).toEqual(['o1']);
    expect(open.events.map((e) => e.event_type)).toContain(
      `${M04_FAMILY}state_at_review`,
    );
    expect(open.events.map((e) => e.event_type)).not.toContain(
      `${M04_FAMILY}first_departure`,
    );
    expect(m04RawComponents(s, 'o1', 'closed_at_review')).toMatchObject({
      observed: false,
      undisposed_at_departure: 2,
      departure_trigger: 'closed_at_review',
    });

    const reviewRows = extractItemFeatures('M04', open.events, CONTEXT);

    expect(reviewRows[0]).toMatchObject({
      value: null,
      numerator: null,
      denominator: 0,
      disposition: 'interrupted',
      censored: true,
      closure_reason: 'closed_at_review',
    });
    expect(reviewRows[0].components).toMatchObject({
      jobs_closed_by_system: ['o1'],
    });
    expect(reviewRows[1]).toMatchObject({
      disposition: 'observed',
      censored: true,
    });
    expect(
      (reviewRows[1].value as Record<string, Record<string, unknown>>).o1,
    ).toMatchObject({
      status: 'censored',
      undisposed_at_departure: null,
      undisposed_at_review: 2,
    });

    // Pieces that cannot be drawn: the job is technically invalid, and the
    // second job is available at once.
    const broken = harness();
    const b = createM04State();

    expect(cut(broken, b, 100, false)).toBeNull();
    expect(b.jobs.o1.status).toBe('failed');
    expect(m04AnyJobProduced(b)).toBe(false);
    expect(m04LyingPieces(b)).toEqual([]);
    expect(m04PickUp(b, 'm04_offcut_a', 150, 'pointer', broken.sink)).toBe(
      false,
    );
    expect(m04AvailableJob(b)).toBe('o2');

    const brokenOnly = extractItemFeatures('M04', broken.events, CONTEXT);

    expect(brokenOnly[0]).toMatchObject({
      value: null,
      denominator: 0,
      disposition: 'technical_failure',
    });
    // A job that left no record leaves no companion value either.
    expect(brokenOnly[1]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });
    cut(broken, b, 200);
    carryToBin(broken, b, 'm04_offcut_b', 300);
    depart(broken, b, 900);

    const brokenRows = extractItemFeatures('M04', broken.events, CONTEXT);

    expect(brokenRows[0]).toMatchObject({
      value: 2,
      denominator: 3,
      disposition: 'incomplete',
      included_ids: ['m04_cutting_o2'],
    });
    expect(brokenRows[0].components).toMatchObject({
      jobs_technically_invalid: ['o1'],
    });

    // The guard recognises the SAME job's earlier administration only.
    expect(m04PriorAdministration(open.events, 'o1')).toBe(true);
    expect(m04PriorAdministration(open.events, 'o2')).toBe(false);
    expect(m04PriorAdministration([], 'o1')).toBe(false);

    // Both jobs held back after a reload: interrupted, no value.
    const held = harness();

    for (const job of M04_JOBS) {
      held.push(job, 'technical_failure', {
        detail: 'reload after administration: cutting job not run',
        input_mode: 'system',
      });
    }

    const heldRows = extractItemFeatures('M04', held.events, {
      ...CONTEXT,
      reloaded: true,
    });

    expect(heldRows[0]).toMatchObject({
      value: null,
      disposition: 'interrupted',
      censored: true,
    });
    expect(heldRows[1]).toMatchObject({
      value: null,
      disposition: 'interrupted',
    });

    // A held-back job beside an observed one: interrupted, the value kept.
    const mixed = harness();
    const m = createM04State();

    mixed.push('o1', 'technical_failure', {
      detail: 'reload after administration: cutting job not run',
      input_mode: 'system',
    });
    m.jobs.o1.status = 'failed';
    cut(mixed, m, 100);
    depart(mixed, m, 700);
    expect(
      extractItemFeatures('M04', mixed.events, {
        ...CONTEXT,
        reloaded: true,
      })[0],
    ).toMatchObject({
      value: 3,
      denominator: 3,
      disposition: 'interrupted',
      censored: true,
    });
  });

  test('a recorded state that disagrees with the raw events is a technical failure, even when the count agrees; a late disposal never enters the recount', () => {
    const h = harness();
    const s = createM04State();

    cut(h, s, 100);
    carryToBin(h, s, 'm04_offcut_a', 200);
    depart(h, s, 900);
    carryToBin(h, s, 'm04_swarf_a', 1_200);

    expect(extractItemFeatures('M04', h.events, CONTEXT)[0]).toMatchObject({
      value: 2,
      denominator: 3,
    });

    const tamper = (change: Record<string, unknown>) =>
      h.events.map((event) =>
        event.event_type === `${M04_FAMILY}first_departure`
          ? { ...event, metadata: { ...event.metadata, ...change } }
          : event,
      );

    // A count that disagrees with the disposals.
    const counted = extractItemFeatures(
      'M04',
      tamper({ undisposed_at_departure: 1 }),
      CONTEXT,
    );

    expect(counted[0]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });
    expect(counted[0].components).toMatchObject({ jobs_disagreeing: ['o1'] });

    // The right count, another piece named as the disposed one.
    expect(
      extractItemFeatures(
        'M04',
        tamper({ disposed_ids: ['m04_wrap_a'] }),
        CONTEXT,
      )[0],
    ).toMatchObject({ value: null, disposition: 'technical_failure' });
    // A carried piece that the record also lists as disposed.
    expect(
      extractItemFeatures(
        'M04',
        tamper({ carried_piece: 'm04_offcut_a', pieces_lying: 1 }),
        CONTEXT,
      )[0],
    ).toMatchObject({ value: null, disposition: 'technical_failure' });
    // Pieces lying that do not add up.
    expect(
      extractItemFeatures('M04', tamper({ pieces_lying: 3 }), CONTEXT)[0],
    ).toMatchObject({ value: null, disposition: 'technical_failure' });

    // A departure without its cut cannot be reproduced.
    const orphan = h.events.filter(
      (event) => event.event_type !== `${M04_FAMILY}job_run`,
    );

    expect(extractItemFeatures('M04', orphan, CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });

    // A `piece_disposed` event forged after the departure is not counted,
    // nor is the disposal of a piece that belongs to the other job.
    const forged = [
      ...h.events,
      {
        ...h.events[h.events.length - 1],
        event_type: `${M04_FAMILY}piece_disposed`,
        sequence: h.events.length + 1,
        metadata: { occasion: 'o1', object_id: 'm04_wrap_a' },
      },
    ];

    expect(extractItemFeatures('M04', forged, CONTEXT)[0]).toMatchObject({
      value: 2,
      denominator: 3,
    });

    const foreign = h.events.flatMap((event) =>
      event.event_type === `${M04_FAMILY}first_departure`
        ? [
            {
              ...event,
              event_type: `${M04_FAMILY}piece_disposed`,
              sequence: (event.sequence ?? 0) - 0.5,
              metadata: { occasion: 'o1', object_id: 'm04_offcut_b' },
            },
            event,
          ]
        : [event],
    );

    expect(extractItemFeatures('M04', foreign, CONTEXT)[0]).toMatchObject({
      value: 2,
      denominator: 3,
    });
  });

  test('U14-C: a completed job is read only with its opening, its cut and its departure once each and in that order, its own three pieces, and every disposal once and after its pick-up; the raw log is never changed', () => {
    const h = harness();
    const s = createM04State();

    // Cut before the work orders were read: no `listed` exists.
    cut(h, s, 100);
    carryToBin(h, s, 'm04_offcut_a', 200);
    expect(m04PickUp(s, 'm04_swarf_a', 400, 'keyboard', h.sink)).toBe(true);
    depart(h, s, 900);
    // Later cleanup: recorded apart, never part of the recount.
    expect(m04Dispose(s, 'm04_swarf_a', 1_200, 'pointer', h.sink)).toBe('late');
    expect(carryToBin(h, s, 'm04_wrap_a', 1_500)).toBe('late');

    const type = (suffix: string) => `${M04_FAMILY}${suffix}`;
    const before = JSON.stringify(h.events);
    const frozen = h.events.map((event) =>
      Object.freeze({
        ...event,
        metadata: Object.freeze({ ...event.metadata }),
      }),
    ) as unknown as RawGameEvent[];
    const failed = (events: RawGameEvent[]) => {
      const rows = extractItemFeatures('M04', events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: null,
        disposition: 'technical_failure',
        closure_reason: 'technical_failure',
      });
      expect(rows[0].components).toMatchObject({ jobs_disagreeing: ['o1'] });
    };

    // The record as it was written: observed, without any listing.
    expect(h.events.map((e) => e.event_type)).not.toContain(type('listed'));

    const rows = extractItemFeatures('M04', frozen, CONTEXT);

    expect(rows[0]).toMatchObject({
      value: 2,
      numerator: 2,
      denominator: 3,
      disposition: 'incomplete',
    });
    expect(rows[0].components).toMatchObject({
      cutter_listed: false,
      jobs_observed: ['o1'],
      late_disposals: 2,
    });
    expect(
      (rows[1].value as Record<string, Record<string, unknown>>).o1,
    ).toMatchObject({
      carried_piece: 'm04_swarf_a',
      undisposed_at_departure: 2,
      late_disposals: ['m04_swarf_a', 'm04_wrap_a'],
    });

    // The opening is missing.
    failed(h.events.filter((e) => e.event_type !== type('opportunity_opened')));

    // The opening comes after the cut, or after the departure.
    const openingAt = (sequence: number) =>
      h.events.map((event) =>
        event.event_type === type('opportunity_opened')
          ? { ...event, sequence }
          : event,
      );
    const runAt = h.events.find(
      (e) => e.event_type === type('job_run'),
    )!.sequence!;
    const departedAt = h.events.find(
      (e) => e.event_type === type('first_departure'),
    )!.sequence!;

    failed(openingAt(runAt + 0.5));
    failed(openingAt(departedAt + 0.5));

    // An opening that belongs to the OTHER job does not open this one.
    failed(
      h.events.map((event) =>
        event.event_type === type('opportunity_opened')
          ? {
              ...event,
              metadata: {
                ...event.metadata,
                occasion: 'o2',
                opportunity_id: M04_SPEC.o2.opportunity_id,
              },
            }
          : event,
      ),
    );

    // The same disposal written twice is never folded into one.
    const disposal = h.events.find(
      (e) => e.event_type === type('piece_disposed'),
    )!;

    failed(
      h.events.flatMap((event) =>
        event === disposal
          ? [event, { ...event, sequence: event.sequence! + 0.5 }]
          : [event],
      ),
    );

    // A disposal without its pick-up.
    failed(
      h.events.filter(
        (event) =>
          !(
            event.event_type === type('piece_picked_up') &&
            event.metadata?.object_id === 'm04_offcut_a'
          ),
      ),
    );

    // A piece carried in the raw events and absent from the record.
    failed(
      h.events.map((event) =>
        event.event_type === type('first_departure')
          ? {
              ...event,
              metadata: {
                ...event.metadata,
                carried_piece: null,
                pieces_lying: 2,
              },
            }
          : event,
      ),
    );

    // The record names one disposed piece twice.
    failed(
      h.events.map((event) =>
        event.event_type === type('first_departure')
          ? {
              ...event,
              metadata: {
                ...event.metadata,
                disposed_ids: ['m04_offcut_a', 'm04_offcut_a'],
              },
            }
          : event,
      ),
    );

    // The cut names pieces that are not the job's own three.
    const cutNames = (pieces: string[]) =>
      h.events.map((event) =>
        event.event_type === type('job_run')
          ? { ...event, metadata: { ...event.metadata, pieces } }
          : event,
      );

    failed(cutNames(m04PiecesOf('o2').map((piece) => piece.object_id)));
    failed(cutNames(['m04_offcut_a', 'm04_swarf_a']));
    failed(cutNames(['m04_offcut_a', 'm04_swarf_a', 'm04_swarf_a']));
    failed(cutNames(['m04_offcut_a', 'm04_swarf_a', 'm04_wrap_a', 'x']));

    // A second cut or a second departure of the same job.
    for (const suffix of ['job_run', 'first_departure']) {
      const original = h.events.find((e) => e.event_type === type(suffix))!;

      failed([
        ...h.events,
        { ...original, sequence: h.events.length + 1 },
      ] as RawGameEvent[]);
    }

    // Nothing above changed the log that was read.
    expect(JSON.stringify(h.events)).toBe(before);
    expect(JSON.stringify(frozen)).toBe(before);

    // A malformed job beside a legitimate pending one stays a technical
    // failure; a legitimate pending, censored or never-run job is never
    // turned into one by the stricter recount.
    const pending = harness();
    const p = createM04State();

    cut(pending, p, 100);
    expect(
      extractItemFeatures(
        'M04',
        pending.events.filter(
          (e) => e.event_type !== type('opportunity_opened'),
        ),
        CONTEXT,
      )[0],
    ).toMatchObject({ value: null, disposition: 'pending' });
    depart(pending, p, 900, 'closed_at_review', null);
    expect(
      extractItemFeatures('M04', pending.events, CONTEXT)[0],
    ).toMatchObject({
      value: null,
      disposition: 'interrupted',
      censored: true,
    });
  });

  test('U14-C: the cutter states that both coupons were cut only when both were', () => {
    const s = createM04State();
    const h = harness();

    expect(m04IdleLine(s)).toBe('The cutter is out of service.');
    cut(h, s, 100);
    expect(m04IdleLine(s)).toBe(
      'The cutter re-arms while you work another order.',
    );
    depart(h, s, 500);
    cut(h, s, 1_000);
    expect(m04AnyJobFailed(s)).toBe(false);
    expect(m04IdleLine(s)).toBe('Both coupons cut. The cutter is idle.');
    depart(h, s, 1_500, 'room_exit', null);
    expect(m04IdleLine(s)).toBe('Both coupons cut. The cutter is idle.');

    // The first cut jammed: the second coupon is cut, never "both".
    const jam = harness();
    const j = createM04State();

    expect(cut(jam, j, 100, false)).toBeNull();
    expect(m04AnyJobFailed(j)).toBe(true);
    expect(m04IdleLine(j)).toBe('The cutter is out of service.');
    cut(jam, j, 200);
    expect(m04IdleLine(j)).toBe('The cutter is idle.');
    depart(jam, j, 900);
    expect(m04IdleLine(j)).toBe('The cutter is idle.');

    // The second cut jammed.
    const late = harness();
    const l = createM04State();

    cut(late, l, 100);
    depart(late, l, 500);
    expect(cut(late, l, 600, false)).toBeNull();
    expect(m04IdleLine(l)).toBe('The cutter is idle.');

    // Both jammed: nothing was cut.
    const none = harness();
    const n = createM04State();

    cut(none, n, 100, false);
    cut(none, n, 200, false);
    expect(m04IdleLine(n)).toBe('The cutter is out of service.');

    for (const state of [s, j, l, n]) {
      expect(m04IdleLine(state)).not.toMatch(
        /tidy|clean|dispose|mess|put away/i,
      );
    }
  });
});
