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
 * cutter states, and the raw log left untouched. U14-D: a carried piece
 * set down where it lay stays undisposed, a refused set-down keeps it in
 * the hands, and neither changes a record already made; `piece_put_back`
 * told apart by `input_mode` alone; the gate that keeps the bin from
 * being the target of a piece just lifted. U14-D2 (the approved annex,
 * administration `m04-cutting-v4`): the six places in two mirrored
 * clusters of three, clear of every station and bundle; and the MEASURED
 * geometry of the 43 × 19 room — from every position the avatar can
 * reach, each piece is lifted by keyboard and by pointer within 64 px,
 * never within 76 px of the bin, the paired pieces of the two jobs from
 * mirrored positions and at equal walking cost.
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { registerEntry } from '../src/measurement/registerV3';
import { ledgerEntry } from '../src/pilot/evidenceLedger';
import { M03_TOOLS } from '../src/pilot/windows/m03RestoreModel';
import {
  createM04BinGate,
  createM04State,
  M04_CUT_SETTLE_MS,
  M04_ENTRY_STATE_VERSION,
  M04_FAMILY,
  M04_JOBS,
  M04_NO_ORDER_LINE,
  M04_PIECES,
  M04_PIECES_PER_JOB,
  M04_SET_DOWN_LINE,
  M04_SET_DOWN_REFUSED_LINE,
  M04_SPEC,
  m04AllJobsRun,
  m04AnyJobFailed,
  m04AnyJobProduced,
  m04AvailableJob,
  type M04BinGate,
  m04BinGateStep,
  m04BinPointerAllowed,
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
  m04SetDown,
  type M04State,
} from '../src/pilot/windows/m04CuttingModel';
import {
  WORKSHOP_SITES,
  WORKSHOP_SPAWN,
  WORKSHOP_STATIONS,
} from '../src/pilot/zoneSites';
import type { RawGameEvent } from '../src/systems/EventLogger';
import { bodyFits, gridOf } from '../src/world/layouts/grid';
import {
  WORKSHOP_ANNEX,
  WORKSHOP_COLS,
  WORKSHOP_FLOOR,
  WORKSHOP_LAYOUT,
  WORKSHOP_ROWS,
  WORKSHOP_SOLIDS,
} from '../src/world/layouts/workshop';

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
  test('register row and fixtures: route version v3 with two jobs in one episode, six standardised pieces, three per job in two mirrored clusters of the annex, clear of every station, bundle and of the bin', () => {
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

    // The administration is told apart from Unit 14 (v1), U14-C (v2) and
    // the blocked, never released first U14-D pass (v3).
    expect(M04_ENTRY_STATE_VERSION).toBe('m04-cutting-v4');

    // The cutter, its scatter origin and the bin as approved (room px).
    expect(WORKSHOP_SITES.sampleCutter).toEqual({ x: 400, y: 456 });
    expect(WORKSHOP_SITES.cutterScatter).toEqual({ x: 400, y: 456 });
    expect(WORKSHOP_SITES.disposalChute).toEqual({ x: 400, y: 556 });

    // The six approved places (room px), one per piece.
    const { cutterScatter, disposalChute } = WORKSHOP_SITES;
    const at = (piece: { dx: number; dy: number }) => ({
      x: cutterScatter.x + piece.dx,
      y: cutterScatter.y + piece.dy,
    });
    const away = (
      a: { x: number; y: number },
      b: { x: number; y: number },
    ): number => Math.hypot(a.x - b.x, a.y - b.y);

    expect(
      M04_PIECES.map((piece) => [piece.object_id, at(piece).x, at(piece).y]),
    ).toEqual([
      ['m04_offcut_a', 228, 476],
      ['m04_swarf_a', 212, 516],
      ['m04_wrap_a', 212, 556],
      ['m04_offcut_b', 572, 476],
      ['m04_swarf_b', 588, 516],
      ['m04_wrap_b', 588, 556],
    ]);
    expect(
      M04_PIECES.map((piece) => [piece.object_id, piece.dx, piece.dy]),
    ).toEqual([
      ['m04_offcut_a', -172, 20],
      ['m04_swarf_a', -188, 60],
      ['m04_wrap_a', -188, 100],
      ['m04_offcut_b', 172, 20],
      ['m04_swarf_b', 188, 60],
      ['m04_wrap_b', 188, 100],
    ]);

    // What a press or a click could take instead of a piece.
    const stations = Object.entries({
      ...WORKSHOP_STATIONS,
      ...WORKSHOP_SITES,
    }).filter(
      ([name]) =>
        !name.startsWith('supply') &&
        name !== 'cutterScatter' &&
        name !== 'disposalChute',
    );
    const bundles = Object.entries(WORKSHOP_STATIONS).filter(([name]) =>
      name.startsWith('supply'),
    );

    expect(stations.map(([name]) => name)).toContain('storageLocker');
    expect(stations.map(([name]) => name)).toContain('sampleCutter');
    expect(bundles).toHaveLength(3);

    for (const piece of M04_PIECES) {
      const place = at(piece);

      // On the walkable floor, on none of the painted benches or machines.
      expect(
        WORKSHOP_FLOOR.some(
          ([col, row, cols, rows]) =>
            place.x >= col * 32 &&
            place.x < (col + cols) * 32 &&
            place.y >= row * 32 &&
            place.y < (row + rows) * 32,
        ),
        `${piece.object_id} on the floor`,
      ).toBe(true);

      for (const [x, y, width, height] of WORKSHOP_SOLIDS) {
        // The whole 28 px target of the piece lies clear of the solid.
        expect(
          place.x + 14 <= x ||
            place.x - 14 >= x + width ||
            place.y + 14 <= y ||
            place.y - 14 >= y + height,
          `${piece.object_id} clear of the solid at ${x},${y}`,
        ).toBe(true);
      }

      // Clear of every station: a station answers a press within 72 px
      // and a piece is lifted within 64 px, so nothing within 136 px of
      // an anchor could compete with it. Standing on the piece, and
      // anywhere within 12 px of it, no station is in range, the piece
      // is in keyboard reach (64 px) and it is the nearest piece — so a
      // press there names this piece.
      for (const [name, anchor] of stations) {
        expect(
          away(place, anchor),
          `${piece.object_id} from ${name}`,
        ).toBeGreaterThan(72 + 64);
      }

      // The cutter is the station nearest to every piece: the pieces
      // belong to it and lie in no other station's territory.
      expect(
        [...stations].sort(
          (a, b) => away(place, a[1]) - away(place, b[1]),
        )[0][0],
        `${piece.object_id}: nearest station`,
      ).toBe('sampleCutter');

      // Clear of every supply bundle (collected within 44 px).
      for (const [name, anchor] of bundles) {
        expect(
          away(place, anchor),
          `${piece.object_id} from ${name}`,
        ).toBeGreaterThan(44 + 64);
      }

      // Far from the bin: beyond its reach (64 px), the reach of the
      // piece (64 px) and the approved margin (12 px) together — so no
      // position the piece can be lifted from is within 76 px of the bin
      // (measured from every reachable position in the test below).
      expect(
        away(place, disposalChute),
        `${piece.object_id} from the bin`,
      ).toBeGreaterThan(64 + 64 + 12);

      // Clear of every other piece (28 px pointer targets, 64 px reach).
      for (const other of M04_PIECES) {
        if (other !== piece) {
          expect(
            away(place, at(other)),
            `${piece.object_id} from ${other.object_id}`,
          ).toBeGreaterThanOrEqual(40);
        }
      }

      for (const dx of [-12, 0, 12]) {
        for (const dy of [-12, 0, 12]) {
          const stand = { x: place.x + dx, y: place.y + dy };

          for (const [name, anchor] of stations) {
            expect(
              away(stand, anchor),
              `${name} from beside ${piece.object_id}`,
            ).toBeGreaterThan(72);
          }

          for (const [name, anchor] of bundles) {
            expect(
              away(stand, anchor),
              `${name} from beside ${piece.object_id}`,
            ).toBeGreaterThan(44);
          }

          const nearest = [...M04_PIECES].sort(
            (a, b) => away(stand, at(a)) - away(stand, at(b)),
          )[0];

          expect(nearest.object_id).toBe(piece.object_id);
          expect(away(stand, place)).toBeLessThanOrEqual(64);
        }
      }
    }

    // The two jobs are laid out alike: each piece of job 2 is the mirror
    // image, about the cutter, of the SAME KIND of piece of job 1 — the
    // kinds are not interchanged between the jobs.
    const [job1, job2] = [m04PiecesOf('o1'), m04PiecesOf('o2')];

    job1.forEach((piece, index) => {
      const twin = job2[index];

      expect(twin.label, piece.object_id).toBe(piece.label);
      expect(twin.icon, piece.object_id).toBe(piece.icon);
      expect([twin.dx, twin.dy], piece.object_id).toEqual([
        -piece.dx,
        piece.dy,
      ]);
      // Equal distance to the bin and to the cutter, piece by piece.
      expect(away(at(twin), disposalChute)).toBe(
        away(at(piece), disposalChute),
      );
      expect(away(at(twin), WORKSHOP_SITES.sampleCutter)).toBe(
        away(at(piece), WORKSHOP_SITES.sampleCutter),
      );
    });

    // Two separate clusters that do not interleave: job 1 wholly west of
    // the cutter, job 2 wholly east of it, 344 px between them, while a
    // cluster's own pieces lie within 82 px of each other.
    const xs = (pieces: typeof job1) => pieces.map((piece) => at(piece).x);
    const spread = (pieces: typeof job1) =>
      Math.max(...pieces.flatMap((a) => pieces.map((b) => away(at(a), at(b)))));

    expect(Math.max(...xs(job1))).toBeLessThan(cutterScatter.x);
    expect(Math.min(...xs(job2))).toBeGreaterThan(cutterScatter.x);
    expect(Math.min(...xs(job2)) - Math.max(...xs(job1))).toBe(344);
    expect(spread(job1)).toBeLessThan(82);
    expect(spread(job2)).toBe(spread(job1));

    for (const a of job1) {
      for (const b of job2) {
        expect(away(at(a), at(b))).toBeGreaterThanOrEqual(344);
      }
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
      departure: 'other_station_work_begun_or_room_exit',
      set_down_available: true,
      set_down_counts_as: 'undisposed',
      cut_feedback: 'same_line_for_both_jobs',
    });
    // Both jobs are described alike but for their own pieces.
    expect({
      ...m04EntrySnapshot('o2'),
      occasion_id: null,
      job_number: null,
      pieces: null,
      piece_offsets: null,
    }).toEqual({
      ...m04EntrySnapshot('o1'),
      occasion_id: null,
      job_number: null,
      pieces: null,
      piece_offsets: null,
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
    // A status of the station (owner ruling 4): no cutting order is
    // available now. It names no leaving, no tidying, no other work.
    expect(m04IdleLine(s)).toBe('No cutting order is available.');
    expect(m04IdleLine(s)).toBe(M04_NO_ORDER_LINE);
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

    // No line of the item asks for anything: not for the bin, not for
    // leaving, not for other work.
    for (const line of [M04_SET_DOWN_LINE, M04_SET_DOWN_REFUSED_LINE]) {
      expect(line).not.toMatch(
        /tidy|clean|dispos|mess|put away|bin|another|order|leave|should|please/i,
      );
    }

    // The cutter's status names its own cutting order and nothing else:
    // no work elsewhere, no leaving, no tidying, nothing to begin.
    expect(M04_NO_ORDER_LINE).not.toMatch(
      /tidy|clean|dispos|mess|put away|bin|another|other|elsewhere|leave|go |begin|start|should|please|re-arm/i,
    );
  });

  test('U14-D: lifting a piece never makes the bin its target; the bin is acquired by walking into its range after every key and the pointer were released', () => {
    const step = (
      gate: M04BinGate,
      input: Partial<{
        carrying: boolean;
        keysDown: boolean;
        pointerDown: boolean;
        inRange: boolean;
      }>,
    ) =>
      m04BinGateStep(gate, {
        carrying: true,
        keysDown: false,
        pointerDown: false,
        inRange: false,
        ...input,
      });

    // Lifted by a key WITHIN the bin's range: the key held, repeated or
    // pressed again never acquires the bin, however long it lasts.
    let gate = createM04BinGate();

    expect(gate).toEqual({
      released: false,
      beenOutside: false,
      acquired: false,
      dragHeld: false,
    });

    for (let frame = 0; frame < 600; frame += 1) {
      step(gate, { keysDown: true, inRange: true });
      expect(gate.acquired).toBe(false);
      expect(gate.released).toBe(false);
    }

    // The key released, still within the range: the bin was never
    // walked up to — it is not the target.
    for (let frame = 0; frame < 600; frame += 1) {
      step(gate, { inRange: true });
      expect(gate.released).toBe(true);
      expect(gate.acquired).toBe(false);
    }

    // A second press there acquires nothing either.
    step(gate, { keysDown: true, inRange: true });
    step(gate, { inRange: true });
    expect(gate.acquired).toBe(false);
    // Out of the range and back in: acquired.
    step(gate, { inRange: false });
    expect(gate).toMatchObject({ beenOutside: true, acquired: false });
    step(gate, { inRange: true });
    expect(gate.acquired).toBe(true);
    // Out again: the target is lost; back in: acquired anew.
    step(gate, { inRange: false });
    expect(gate.acquired).toBe(false);
    step(gate, { inRange: true });
    expect(gate.acquired).toBe(true);

    // Lifted outside the range with the key HELD all the way to the
    // bin: nothing is acquired while it is held, nor when it is
    // released within the range.
    gate = createM04BinGate();
    step(gate, { keysDown: true, inRange: false });
    step(gate, { keysDown: true, inRange: true });
    expect(gate).toMatchObject({ released: false, acquired: false });
    step(gate, { inRange: true });
    expect(gate).toMatchObject({ released: true, acquired: false });

    // Lifted outside the range, the key released, then the walk to the
    // bin: acquired on entering the range — the ordinary way.
    gate = createM04BinGate();
    step(gate, { keysDown: true });
    step(gate, {});
    expect(gate).toMatchObject({ released: true, beenOutside: true });
    expect(gate.acquired).toBe(false);
    step(gate, { inRange: true });
    expect(gate.acquired).toBe(true);

    // A held pointer counts like a held key.
    gate = createM04BinGate();
    step(gate, { pointerDown: true });
    expect(gate.released).toBe(false);
    step(gate, {});
    expect(gate.released).toBe(true);

    // The pointer on the bin: a PRESS needs the pick-up's activation to
    // be over; the release of the drag that lifted the piece may end in
    // the bin, and only that drag.
    gate = createM04BinGate();
    expect(m04BinPointerAllowed(gate, 'press')).toBe(false);
    expect(m04BinPointerAllowed(gate, 'drag_release')).toBe(false);
    step(gate, { keysDown: true, inRange: true });
    expect(m04BinPointerAllowed(gate, 'press')).toBe(false);
    step(gate, { inRange: true });
    expect(m04BinPointerAllowed(gate, 'press')).toBe(true);
    expect(gate.acquired).toBe(false);

    gate = createM04BinGate(true);
    step(gate, { pointerDown: true, inRange: true });
    expect(gate.dragHeld).toBe(true);
    expect(m04BinPointerAllowed(gate, 'drag_release')).toBe(true);
    expect(m04BinPointerAllowed(gate, 'press')).toBe(false);
    expect(gate.acquired).toBe(false);
    // Released elsewhere: the drag is over; the piece stays in the hands.
    step(gate, { inRange: true });
    expect(gate.dragHeld).toBe(false);
    expect(m04BinPointerAllowed(gate, 'drag_release')).toBe(false);

    // Nothing carried: the gate is empty again.
    step(gate, { carrying: false, inRange: true });
    expect(gate).toEqual(createM04BinGate());

    // The gate writes nothing: it is no event, no value and no state of
    // a job.
    const s = createM04State();

    expect(JSON.stringify(s)).not.toMatch(/acquired|released|beenOutside/);
  });

  test('U14-D2: measured from every reachable avatar position of the 43 × 19 room, each piece is lifted by keyboard and by pointer within 64 px and never within 76 px of the bin; the paired pieces of the two jobs from mirrored positions and at equal walking cost', () => {
    const grid = gridOf(WORKSHOP_LAYOUT, WORKSHOP_SOLIDS);
    const { cutterScatter, disposalChute, sampleCutter } = WORKSHOP_SITES;
    const away = (
      a: { x: number; y: number },
      b: { x: number; y: number },
    ): number => Math.hypot(a.x - b.x, a.y - b.y);
    // The reaches of the scene (`m04-cutting-v4`): a piece is lifted by
    // keyboard and by pointer within 64 px and the bin answers within
    // 64 px; a station answers a press within 72 px; every position a
    // piece is lifted from keeps the approved 12 px margin to the bin's
    // reach.
    const REACH = 64;
    const STATION_RANGE = 72;
    const BIN_CLEARANCE = REACH + 12;
    const STEP = 4;
    const AXIS = WORKSHOP_ANNEX.axisX;

    // The room as approved: 43 × 19 tiles, 1376 × 608 px.
    expect(WORKSHOP_COLS).toBe(43);
    expect(WORKSHOP_ROWS).toBe(19);
    expect(grid.widthPx).toBe(1376);
    expect(grid.heightPx).toBe(608);
    expect(WORKSHOP_ANNEX).toMatchObject({
      axisX: 400,
      floor: [6, 12, 13, 6],
      doorway: [11, 10, 3, 2],
      doorX0: 368,
      doorX1: 432,
    });
    // Its cutter, bin and doorway jambs collide where they were approved
    // (the cutter's and the bin's south edges stop 6 px short of their
    // bases, as every painted prop's does).
    expect(WORKSHOP_SOLIDS).toContainEqual([352, 451, 96, 87]);
    expect(WORKSHOP_SOLIDS).toContainEqual([374, 538, 52, 32]);
    expect(WORKSHOP_SOLIDS).toContainEqual([352, 320, 16, 64]);
    expect(WORKSHOP_SOLIDS).toContainEqual([432, 320, 16, 64]);
    // The bottom row is wall; the band south of the office and beside
    // the annex is never floor.
    expect(WORKSHOP_LAYOUT[18]).toBe('#'.repeat(43));

    for (let row = 12; row < 18; row += 1) {
      expect(WORKSHOP_LAYOUT[row]).toBe(
        `${'#'.repeat(6)}${'.'.repeat(13)}${'#'.repeat(24)}`,
      );
    }

    for (const row of [10, 11]) {
      expect(WORKSHOP_LAYOUT[row]).toBe(
        `${'#'.repeat(11)}...${'#'.repeat(29)}`,
      );
    }

    // Every position the avatar can stand at, walked from the spawn, with
    // its walking distance from the cutter's operating position.
    const key = (at: { x: number; y: number }) => `${at.x},${at.y}`;
    const walk = (
      sources: { x: number; y: number }[],
    ): Map<string, { x: number; y: number; steps: number }> => {
      const reached = new Map(
        sources.map((source) => [key(source), { ...source, steps: 0 }]),
      );
      const queue = [...reached.values()];

      for (let head = 0; head < queue.length; head += 1) {
        const current = queue[head];

        for (const [dx, dy] of [
          [STEP, 0],
          [-STEP, 0],
          [0, STEP],
          [0, -STEP],
        ]) {
          const next = {
            x: current.x + dx,
            y: current.y + dy,
            steps: current.steps + STEP,
          };

          if (!reached.has(key(next)) && bodyFits(grid, next.x, next.y)) {
            reached.set(key(next), next);
            queue.push(next);
          }
        }
      }

      return reached;
    };

    expect(bodyFits(grid, WORKSHOP_SPAWN.x, WORKSHOP_SPAWN.y)).toBe(true);

    const stands = [...walk([{ ...WORKSHOP_SPAWN }]).values()];
    const standable = new Set(stands.map(key));

    // The whole room is walked and connected: both bays, the passage
    // between them, the doorway and the annex.
    expect(stands.length).toBeGreaterThan(10_000);
    expect(stands.some((stand) => stand.x < 100)).toBe(true);
    expect(stands.some((stand) => stand.x > 1_300)).toBe(true);

    const annex = stands.filter((stand) => stand.y >= 384);

    expect(annex.length).toBeGreaterThan(2_500);
    // The annex is entered through the doorway only: between the jambs
    // the avatar's feet pass at x 380 … 420.
    const threshold = stands.filter(
      (stand) => stand.y >= 312 && stand.y <= 360,
    );

    expect(Math.min(...threshold.map((stand) => stand.x))).toBe(380);
    expect(Math.max(...threshold.map((stand) => stand.x))).toBe(420);
    // Nothing south of the office or beside the annex can be stood on.
    expect(annex.every((stand) => stand.x >= 204 && stand.x <= 596)).toBe(true);
    expect(Math.max(...annex.map((stand) => stand.y))).toBe(552);
    // The annex is mirrored about the cutter: a position can be stood at
    // exactly when its mirror image can.
    expect(
      annex.filter(
        (stand) => !standable.has(key({ x: 2 * AXIS - stand.x, y: stand.y })),
      ),
    ).toEqual([]);

    const stations = Object.entries({ ...WORKSHOP_STATIONS, ...WORKSHOP_SITES })
      .filter(
        ([name]) =>
          !name.startsWith('supply') &&
          name !== 'cutterScatter' &&
          name !== 'disposalChute',
      )
      .map(([, anchor]) => anchor);
    const bundles = Object.entries(WORKSHOP_STATIONS)
      .filter(([name]) => name.startsWith('supply'))
      .map(([, anchor]) => anchor);
    const places = new Map(
      M04_PIECES.map((piece) => [
        piece.object_id,
        { x: cutterScatter.x + piece.dx, y: cutterScatter.y + piece.dy },
      ]),
    );

    /**
     * Where a piece can be lifted from. By POINTER: within 64 px (the
     * click names the piece). By KEYBOARD: within 64 px, with no station
     * in range, no supply bundle nearer and no other piece nearer (the
     * press names the nearest).
     */
    const pickups = (objectId: string) => {
      const place = places.get(objectId)!;
      const pointer = stands.filter((stand) => away(stand, place) <= REACH);

      return {
        pointer,
        keyboard: pointer.filter(
          (stand) =>
            stations.every((anchor) => away(stand, anchor) >= STATION_RANGE) &&
            bundles.every(
              (bundle) =>
                away(stand, bundle) > 44 ||
                away(stand, bundle) > away(stand, place),
            ) &&
            [...places.entries()].every(
              ([other, at]) =>
                other === objectId || away(stand, at) >= away(stand, place),
            ),
        ),
      };
    };
    const mirrored = (from: { x: number; y: number }[]) =>
      from.map((stand) => key({ x: 2 * AXIS - stand.x, y: stand.y })).sort();

    // The bin: reached from mirrored pockets west and east of it, never
    // from within the cutter's range (the two never compete for a press).
    const binStands = stands.filter(
      (stand) => away(stand, disposalChute) <= REACH,
    );

    expect(binStands.filter((stand) => stand.x < AXIS).length).toBeGreaterThan(
      20,
    );
    expect(binStands.filter((stand) => stand.x > AXIS)).toHaveLength(
      binStands.filter((stand) => stand.x < AXIS).length,
    );
    expect(
      binStands.every((stand) => away(stand, sampleCutter) >= STATION_RANGE),
    ).toBe(true);

    // Walking cost: from the cutter's operating position to the nearest
    // position a piece can be lifted from, and from there to the nearest
    // position the bin can be used from.
    const operating = { x: 400, y: 424 };

    expect(standable.has(key(operating))).toBe(true);
    expect(away(operating, sampleCutter)).toBeLessThan(STATION_RANGE);

    const fromCutter = walk([operating]);
    const cost = (objectId: string) => {
      const from = pickups(objectId).pointer;
      const fetch = Math.min(
        ...from.map((stand) => fromCutter.get(key(stand))!.steps),
      );
      const toBin = walk(from);
      const carry = Math.min(
        ...binStands.map((stand) => toBin.get(key(stand))!.steps),
      );

      return { fetch, carry };
    };

    const travel: Record<M04Job, number> = { o1: 0, o2: 0 };

    for (const [index, piece] of m04PiecesOf('o1').entries()) {
      const twin = m04PiecesOf('o2')[index];
      const [a, b] = [pickups(piece.object_id), pickups(twin.object_id)];

      // Both pieces can be lifted, by both modes.
      expect(a.keyboard.length, piece.object_id).toBeGreaterThan(50);
      expect(a.pointer.length, piece.object_id).toBeGreaterThan(200);
      // Equal pick-up geometry: the same number of positions for the
      // paired pieces, in each mode — and the very same positions,
      // mirrored about the cutter.
      expect(b.keyboard, twin.object_id).toHaveLength(a.keyboard.length);
      expect(b.pointer, twin.object_id).toHaveLength(a.pointer.length);
      expect(b.keyboard.map(key).sort()).toEqual(mirrored(a.keyboard));
      expect(b.pointer.map(key).sort()).toEqual(mirrored(a.pointer));

      for (const [objectId, from] of [
        [piece.object_id, a],
        [twin.object_id, b],
      ] as const) {
        // Every position the piece is lifted from, by either mode, lies
        // more than 76 px from the bin: lifting a piece can never bring
        // the bin into reach.
        expect(
          Math.min(...from.pointer.map((stand) => away(stand, disposalChute))),
          `${objectId}: pick-up positions from the bin`,
        ).toBeGreaterThan(BIN_CLEARANCE);
        // … and outside every station's range: no station can take the
        // press or the click meant for the piece.
        expect(
          from.pointer.every((stand) =>
            stations.every((anchor) => away(stand, anchor) >= STATION_RANGE),
          ),
          `${objectId}: pick-up positions outside every station`,
        ).toBe(true);
      }

      // Equal carry geometry and equal walking cost, piece by piece.
      const [costA, costB] = [cost(piece.object_id), cost(twin.object_id)];

      expect(costB, twin.object_id).toEqual(costA);
      expect(costA.fetch).toBeGreaterThan(100);
      expect(costA.carry).toBeGreaterThan(40);
      travel.o1 += costA.fetch + costA.carry;
      travel.o2 += costB.fetch + costB.carry;
    }

    // Total cleanup travel is the same for both jobs.
    expect(travel.o2).toBe(travel.o1);

    // Keyboard and pointer reach each cluster from the SAME floor: every
    // position within 64 px of a piece of a job is a position where a
    // press names one of that job's pieces (the nearest), and no other.
    for (const job of M04_JOBS) {
      const from = m04PiecesOf(job).map((piece) => pickups(piece.object_id));
      const union = (mode: 'keyboard' | 'pointer') =>
        [...new Set(from.flatMap((entry) => entry[mode].map(key)))].sort();

      expect(union('keyboard'), job).toEqual(union('pointer'));
    }

    // No piece lies in the doorway, in the passage between the bays or
    // on the way from the doorway to the cutter: walking that way never
    // brings a piece into reach.
    const required = stands.filter(
      (stand) =>
        // the doorway and the way down to the cutter's operating side
        (stand.x >= 380 &&
          stand.x <= 420 &&
          stand.y >= 296 &&
          stand.y <= 424) ||
        // the passage between the two bays
        (stand.x >= 608 && stand.x <= 768),
    );

    expect(required.length).toBeGreaterThan(300);

    for (const [objectId, place] of places) {
      expect(
        Math.min(...required.map((stand) => away(stand, place))),
        `${objectId}: from the required route`,
      ).toBeGreaterThan(REACH + 28);
    }

    // Within the cutter's range no piece can be lifted: the cutter keeps
    // every press made at it.
    expect(
      stands
        .filter((stand) => away(stand, sampleCutter) < STATION_RANGE)
        .every((stand) =>
          [...places.values()].every((place) => away(stand, place) > REACH),
        ),
    ).toBe(true);

    // The vacated machine bay: where the cutter used to be operated
    // (348, 230) no cutter answers, and its old footprint is floor.
    expect(away({ x: 348, y: 230 }, sampleCutter)).toBeGreaterThan(200);

    for (const at of [
      { x: 432, y: 236 },
      { x: 400, y: 252 },
      { x: 492, y: 236 },
    ]) {
      expect(standable.has(key(at)), `${at.x},${at.y} is floor`).toBe(true);
    }
  });

  test('U14-D: a carried piece set down where it lay stays undisposed; a refused set-down keeps it in the hands and records nothing; neither is a disposal', () => {
    const h = harness();
    const s = createM04State();
    const type = (suffix: string) => `${M04_FAMILY}${suffix}`;
    const count = (suffix: string) =>
      h.events.filter((e) => e.event_type === type(suffix)).length;

    // Nothing in the hands: nothing to set down, nothing recorded.
    expect(m04SetDown(s, true, 'keyboard', h.sink)).toBe('nothing_carried');
    cut(h, s, 100);
    expect(m04SetDown(s, true, 'pointer', h.sink)).toBe('nothing_carried');
    expect(count('piece_put_back')).toBe(0);

    // Lifted by keyboard and set down by keyboard: the piece lies where
    // it lay, at its own fixed place.
    expect(
      m04PickUp(s, 'm04_wrap_a', 500, 'keyboard', h.sink, 'open_floor_press'),
    ).toBe(true);
    expect(m04CarriedPiece(s)?.object_id).toBe('m04_wrap_a');
    expect(m04LyingPieces(s).map((piece) => piece.object_id)).toEqual([
      'm04_offcut_a',
      'm04_swarf_a',
    ]);
    expect(m04SetDown(s, true, 'keyboard', h.sink)).toBe('set_down');
    expect(m04CarriedPiece(s)).toBeNull();
    expect(m04LyingPieces(s)).toEqual(m04PiecesOf('o1'));
    expect(h.events.at(-1)).toMatchObject({
      event_type: type('piece_put_back'),
      metadata: {
        occasion: 'o1',
        object_id: 'm04_wrap_a',
        after_departure: false,
        input_mode: 'keyboard',
      },
    });
    expect(s.jobs.o1.disposed).toEqual([]);

    // Lifted by pointer; a set-down that cannot be completed keeps the
    // piece in the hands: no event, no disposal, no change of state.
    expect(m04PickUp(s, 'm04_swarf_a', 700, 'pointer', h.sink)).toBe(true);

    const before = JSON.stringify(h.events);

    expect(m04SetDown(s, false, 'pointer', h.sink)).toBe('refused');
    expect(m04CarriedPiece(s)?.object_id).toBe('m04_swarf_a');
    expect(JSON.stringify(h.events)).toBe(before);
    expect(s.jobs.o1.disposed).toEqual([]);
    expect(count('piece_disposed')).toBe(0);
    expect(count('late_disposal')).toBe(0);
    // Then set down by pointer.
    expect(m04SetDown(s, true, 'pointer', h.sink)).toBe('set_down');
    expect(h.events.at(-1)?.metadata).toMatchObject({
      object_id: 'm04_swarf_a',
      input_mode: 'pointer',
    });

    // A piece set down can be lifted again and disposed of: only that is
    // a disposal.
    expect(carryToBin(h, s, 'm04_wrap_a', 900, 'keyboard')).toBe('disposed');
    // One piece is in the hands at the departure: counted undisposed.
    expect(m04PickUp(s, 'm04_offcut_a', 1_000, 'pointer', h.sink)).toBe(true);
    expect(depart(h, s, 2_000, 'other_station', 'storage_locker')).toEqual([
      'o1',
    ]);
    expect(s.jobs.o1.departure).toMatchObject({
      pieces_disposed: 1,
      disposed_ids: ['m04_wrap_a'],
      carried_piece: 'm04_offcut_a',
      pieces_lying: 1,
      undisposed_at_departure: 2,
    });

    const recorded = JSON.stringify(s.jobs.o1.departure);
    const departureEvent = JSON.stringify(
      h.events.find((e) => e.event_type === type('first_departure')),
    );

    // Set down AFTER the departure: recorded as such, the record as it
    // was; a refused one likewise.
    expect(m04SetDown(s, false, 'keyboard', h.sink)).toBe('refused');
    expect(m04SetDown(s, true, 'keyboard', h.sink)).toBe('set_down');
    expect(h.events.at(-1)?.metadata).toMatchObject({
      object_id: 'm04_offcut_a',
      after_departure: true,
      input_mode: 'keyboard',
    });
    expect(JSON.stringify(s.jobs.o1.departure)).toBe(recorded);
    expect(
      JSON.stringify(
        h.events.find((e) => e.event_type === type('first_departure')),
      ),
    ).toBe(departureEvent);
    expect(count('first_departure')).toBe(1);
    // A later departure records nothing more for the job.
    expect(depart(h, s, 2_500, 'room_exit', null)).toEqual([]);
    expect(count('first_departure')).toBe(1);

    // The put-back by the system (the room left) is told apart.
    expect(m04PickUp(s, 'm04_offcut_a', 3_000, 'pointer', h.sink)).toBe(true);
    expect(m04PutBack(s, 'system', h.sink)).toBe(true);
    expect(h.events.at(-1)?.metadata).toMatchObject({
      input_mode: 'system',
      after_departure: true,
    });

    // `input_mode` alone tells the participant from the system: no
    // put-back carries a second discriminator.
    const putBacks = h.events.filter(
      (e) => e.event_type === type('piece_put_back'),
    );

    expect(putBacks.map((e) => e.metadata?.input_mode)).toEqual([
      'keyboard',
      'pointer',
      'keyboard',
      'system',
    ]);

    for (const event of putBacks) {
      expect(event.metadata).not.toHaveProperty('by');
      expect(Object.keys(event.metadata ?? {}).sort()).toEqual([
        'after_departure',
        'input_mode',
        'object_id',
        'occasion',
        'occasion_id',
        'opportunity_id',
        'phase',
        'window_id',
      ]);
    }

    const rows = extractItemFeatures('M04', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      feature_id: 'm04_undisposed_pieces',
      value: 2,
      numerator: 2,
      denominator: 3,
      disposition: 'incomplete',
    });
    expect(
      (rows[1].value as Record<string, Record<string, unknown>>).o1,
    ).toMatchObject({
      status: 'observed',
      undisposed_at_departure: 2,
      undisposed_recount: 2,
      carried_piece: 'm04_offcut_a',
      put_backs: 4,
      late_disposals: [],
    });

    // Three pieces lifted and set down, none disposed: the value is the
    // same as for three pieces never touched.
    const touched = harness();
    const t = createM04State();

    cut(touched, t, 100);

    for (const piece of m04PiecesOf('o1')) {
      expect(m04PickUp(t, piece.object_id, 200, 'keyboard', touched.sink)).toBe(
        true,
      );
      expect(m04SetDown(t, true, 'keyboard', touched.sink)).toBe('set_down');
    }

    depart(touched, t, 900, 'room_exit', null);

    const untouched = harness();
    const u = createM04State();

    cut(untouched, u, 100);
    depart(untouched, u, 900, 'room_exit', null);

    for (const log of [touched, untouched]) {
      expect(extractItemFeatures('M04', log.events, CONTEXT)[0]).toMatchObject({
        value: 3,
        numerator: 3,
        denominator: 3,
      });
    }

    for (const event of [...h.events, ...touched.events]) {
      expect(JSON.stringify(event.metadata)).not.toMatch(
        /score|mess|tidy|penalt|correct/i,
      );
    }
  });
});
