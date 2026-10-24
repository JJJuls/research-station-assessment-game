/**
 * Station 080 M08 — station support console (Unit 2 / U2-R), pure tests.
 *
 * Playwright test blocks that never touch `page`: counterbalanced benefit
 * orders (three of each level), practice never scored, an explicit choice
 * is required (a missing choice is never Rest), every choice is presented
 * only by the interval screen's Continue (no press meant for a bin can be
 * a choice), both slot kinds last the same focused 15 s, a closed surface
 * pauses the slot AND the open choice, units are produced by sorting (an
 * unserved Work slot yields none), the reload guard recognises a prior
 * administration, and the extractor reproduces the primary and per-level
 * fractions from the raw events with null-not-zero semantics (declined ≠
 * not presented ≠ interrupted; the companion is never a false zero).
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import {
  classifyM08Reload,
  m08PriorLoadCheck,
} from '../src/measurement/features/m08';
import { resetFocusMonitor } from '../src/measurement/focusMonitor';
import { registerEntry } from '../src/measurement/registerV3';
import {
  createM08State,
  M08_BENEFIT_ORDERS,
  M08_EPOCH_MS,
  M08_PRACTICE_ITEMS,
  M08_THRESHOLD,
  m08Choose,
  m08Continue,
  m08CurrentEpoch,
  m08CurrentReading,
  m08EpochRemainingMs,
  m08Freeze,
  type M08LogSink,
  m08PriorAdministration,
  m08RawComponents,
  m08SortPractice,
  m08SortWork,
  type M08State,
  m08SurfaceClosed,
  m08SurfaceReopened,
  m08Tick,
} from '../src/pilot/exterior/m08EffortModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

/** A captured event stream shaped like the window adapter's emissions. */
function harness() {
  const events: RawGameEvent[] = [];
  const push = (suffix: string, metadata: Record<string, unknown>) => {
    events.push({
      session_id: 's',
      timestamp_ms: events.length,
      scene: 'exterior_recovery_yard',
      event_type: `proto_m08_effort_${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: { opportunity_id: 'proto_m08_effort_choice', ...metadata },
    });
  };
  const sink: M08LogSink = push;

  return {
    events,
    sink,
    present: () => push('presented', { input_mode: 'system' }),
    open: () => push('opportunity_opened', { input_mode: 'system' }),
    close: (s: M08State, reason: string, exit: string) =>
      push('window_closed', {
        exit_state: exit,
        [exit === 'completed' ? 'raw_components' : 'raw_components_partial']:
          m08RawComponents(s, reason),
      }),
  };
}

function runPractice(s: M08State, now: number, sink: M08LogSink): number {
  for (let i = 0; i < M08_PRACTICE_ITEMS; i += 1) {
    const bin = m08CurrentReading(s) >= M08_THRESHOLD ? 'A' : 'B';
    const result = m08SortPractice(s, bin, now + i * 500, 'pointer', sink);

    expect(result).not.toBeNull();
    expect(result?.correct).toBe(true);
  }

  return now + M08_PRACTICE_ITEMS * 500;
}

const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };

test.describe('M08 support console (pure)', () => {
  test.beforeEach(() => {
    resetFocusMonitor();
  });

  test('orders present each benefit level three times; the register row is on its v3 route with a cited override and the yard label', () => {
    for (const order of Object.values(M08_BENEFIT_ORDERS)) {
      expect(order).toHaveLength(6);
      expect(order.filter((b) => b === 1)).toHaveLength(3);
      expect(order.filter((b) => b === 3)).toHaveLength(3);
    }

    const entry = registerEntry('M08');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual(['proto_m08_effort_choice']);
    expect(entry.route.windows[0]).toMatchObject({
      id: 'm08_effort_w1',
      zone: 'exterior_recovery_yard',
      episode: 4,
    });
    expect(entry.disposition).toBe('PRIMARY-CANDIDATE');
    expect(entry.disposition_override?.approved_by).toContain('M08 row');
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.coverage_label).toBe('exploratory');
    expect(entry.operational_label).toBe('Support console (Recovery Yard)');
  });

  test('practice is never scored; the interval screen alone presents a choice; a choice is required; both slot kinds last 15 focused seconds; a closed surface pauses slot and choice; an unserved Work slot produces no units; missing choices are never Rest', () => {
    const h = harness();
    const s = createM08State('order_a');

    h.open();
    expect(s.phase).toBe('practice');
    expect(m08Choose(s, 'work', 1_100, 'pointer', h.sink)).toBe(false);
    expect(m08Continue(s, 1_100, 'pointer', h.sink)).toBe(false);

    let now = runPractice(s, 1_000, h.sink);

    expect(s.practice).toMatchObject({
      sorted: 4,
      correct: 4,
      completed: true,
    });
    // Practice ends on the interval screen — no choice is presented yet,
    // so a fifth press meant for a bin cannot become a choice.
    expect(s.phase).toBe('interval');
    expect(s.intervalReason).toBe('practice');
    expect(m08Choose(s, 'work', now, 'pointer', h.sink)).toBe(false);
    expect(m08SortPractice(s, 'A', now, 'pointer', h.sink)).toBeNull();
    expect(
      h.events.filter(
        (e) => e.event_type === 'proto_m08_effort_choice_presented',
      ),
    ).toHaveLength(0);
    expect(m08Continue(s, now, 'keyboard', h.sink)).toBe(true);
    expect(s.phase).toBe('choice');
    expect(
      h.events.filter(
        (e) => e.event_type === 'proto_m08_effort_choice_presented',
      ),
    ).toHaveLength(1);

    // Slot 1: sort. Sorting counts; the slot ends at 15 focused seconds.
    const first = m08CurrentEpoch(s)!;

    expect(m08Choose(s, 'work', now + 800, 'keyboard', h.sink)).toBe(true);
    expect(first.choice_latency_ms).toBe(800);
    expect(first.choice_focused_ms).toBe(800);
    expect(
      m08SortWork(
        s,
        m08CurrentReading(s) >= M08_THRESHOLD ? 'A' : 'B',
        now + 1_000,
        'pointer',
        h.sink,
      ),
    ).toBe(true);
    expect(m08SortWork(s, 'A', now + 1_500, 'pointer', h.sink)).toBe(true);
    expect(m08Tick(s, now + 10_000, h.sink)).toBe('none');
    expect(m08EpochRemainingMs(s, now + 10_800)).toBe(M08_EPOCH_MS - 10_000);
    expect(m08Tick(s, now + 800 + M08_EPOCH_MS, h.sink)).toBe('epoch');
    expect(first).toMatchObject({
      completed: true,
      served: true,
      output_units: first.benefit_units,
      items_sorted: 2,
      items_correct: 1,
      focused_ms: M08_EPOCH_MS,
    });
    expect(s.phase).toBe('interval');
    expect(s.intervalReason).toBe('epoch');
    now += 800 + M08_EPOCH_MS;
    // The interval refuses bins and choices alike until Continue.
    expect(m08SortWork(s, 'A', now, 'pointer', h.sink)).toBe(false);
    expect(m08Choose(s, 'rest', now, 'pointer', h.sink)).toBe(false);
    expect(m08Continue(s, now, 'pointer', h.sink)).toBe(true);

    // Slot 2: stand by — same duration, no output, sorting refused.
    expect(m08Choose(s, 'rest', now, 'pointer', h.sink)).toBe(true);
    expect(m08SortWork(s, 'A', now + 100, 'pointer', h.sink)).toBe(false);
    expect(m08Tick(s, now + M08_EPOCH_MS - 1, h.sink)).toBe('none');
    expect(m08Tick(s, now + M08_EPOCH_MS, h.sink)).toBe('epoch');
    expect(s.epochs[1]).toMatchObject({
      choice: 'rest',
      valid: true,
      served: true,
      output_units: 0,
      completed: true,
      focused_ms: M08_EPOCH_MS,
    });
    now += M08_EPOCH_MS;
    expect(m08Continue(s, now, 'pointer', h.sink)).toBe(true);

    // The open choice screen pauses with the surface: closed time is
    // excluded from the focused choice latency (wall latency kept).
    m08SurfaceClosed(s, now + 1_000, h.sink);
    m08SurfaceReopened(s, now + 21_000, h.sink);

    // Slot 3: a closed surface pauses the slot; reopening resumes it. No
    // reading is sorted → the Work slot is unserved and produces nothing.
    expect(m08Choose(s, 'work', now + 21_500, 'pointer', h.sink)).toBe(true);
    expect(s.epochs[2].choice_latency_ms).toBe(21_500);
    expect(s.epochs[2].choice_focused_ms).toBe(1_500);
    now += 21_500;
    m08SurfaceClosed(s, now + 2_000, h.sink);
    expect(m08SortWork(s, 'A', now + 3_000, 'pointer', h.sink)).toBe(false);
    expect(m08Tick(s, now + 60_000, h.sink)).toBe('none');
    m08SurfaceReopened(s, now + 60_000, h.sink);
    expect(m08EpochRemainingMs(s, now + 60_000)).toBe(M08_EPOCH_MS - 2_000);
    expect(m08Tick(s, now + 60_000 + M08_EPOCH_MS - 2_000, h.sink)).toBe(
      'epoch',
    );
    expect(s.epochs[2]).toMatchObject({
      choice: 'work',
      valid: true,
      served: false,
      output_units: 0,
      focused_ms: M08_EPOCH_MS,
    });
    now += 60_000 + M08_EPOCH_MS - 2_000;

    // Shift ends on the interval before slot 4: 3 valid choices, 3
    // missing (never Rest); a partial console is a censored stop.
    expect(s.phase).toBe('interval');
    m08Freeze(s, now + 5_000, 'voluntary_stop');
    h.close(s, 'voluntary_stop', 'stopped');

    const raw = m08RawComponents(s, 'voluntary_stop');

    expect(raw).toMatchObject({
      valid_choices: 3,
      work_choices: 2,
      rest_choices: 1,
      missing_choices: 3,
      served_work_slots: 1,
      unserved_work_slots: 1,
      output_units_total: s.epochs[0].benefit_units,
    });
    expect(raw.epochs.slice(3).every((e) => e.choice === null)).toBe(true);

    // Extractor: 2 / 3 valid of 6 planned → incomplete with its denominator.
    const rows = extractItemFeatures('M08', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      feature_id: 'm08_work_choice_fraction',
      value: 2,
      numerator: 2,
      denominator: 3,
      planned_denominator: 6,
      disposition: 'incomplete',
      closure_reason: 'voluntary_stop',
      censored: false,
      coverage_label: 'exploratory',
      independence: 'repeated_within_episode',
      included_ids: ['m08_slot_1', 'm08_slot_2', 'm08_slot_3'],
    });
    expect(rows[0].components).toMatchObject({
      missing_choices: 3,
      served_work_slots: 1,
      unserved_work_slots: 1,
    });

    const levels = rows[1].value as {
      benefit_1: { work: number; valid: number };
      benefit_3: { work: number; valid: number };
    };

    expect(rows[1].disposition).toBe('incomplete');
    expect(levels.benefit_1.valid + levels.benefit_3.valid).toBe(3);
    expect(levels.benefit_1.work + levels.benefit_3.work).toBe(2);
  });

  test('a complete run: six valid choices → observed fraction and per-level fractions; never opened is not_presented, presented-but-never-opened is declined, and a reload with no current-load evidence is interrupted', () => {
    const empty = extractItemFeatures('M08', [], CONTEXT);

    expect(empty[0]).toMatchObject({
      value: null,
      disposition: 'not_presented',
    });
    expect(empty[1]).toMatchObject({
      value: null,
      disposition: 'not_presented',
    });
    expect(
      extractItemFeatures('M08', [], { ...CONTEXT, reloaded: true })[0]
        .disposition,
    ).toBe('interrupted');

    const listed = harness();

    listed.present();

    const declined = extractItemFeatures('M08', listed.events, CONTEXT);

    expect(declined[0]).toMatchObject({ value: null, disposition: 'declined' });
    expect(declined[1]).toMatchObject({ value: null, disposition: 'declined' });
    // A prior-load presentation never turns a reload into a decline.
    expect(
      extractItemFeatures('M08', listed.events, {
        ...CONTEXT,
        reloaded: true,
      })[0].disposition,
    ).toBe('declined');

    const h = harness();
    const s = createM08State('order_b');

    h.present();
    h.open();

    let now = runPractice(s, 0, h.sink);

    for (let slot = 0; slot < 6; slot += 1) {
      expect(m08Continue(s, now, 'pointer', h.sink)).toBe(true);

      const epoch = m08CurrentEpoch(s)!;

      expect(epoch.epoch).toBe(slot + 1);
      m08Choose(
        s,
        epoch.benefit_units === 3 ? 'work' : 'rest',
        now,
        'pointer',
        h.sink,
      );

      if (epoch.benefit_units === 3) {
        // Serve the work: one sorted reading is enough for the units.
        expect(m08SortWork(s, 'B', now + 1_000, 'keyboard', h.sink)).toBe(true);
      }

      now += M08_EPOCH_MS;
      expect(m08Tick(s, now, h.sink)).toBe(slot === 5 ? 'done' : 'epoch');
    }

    expect(s.outputUnitsTotal).toBe(9);
    expect(s.phase).toBe('done');
    h.close(s, 'completed', 'completed');

    const rows = extractItemFeatures('M08', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      value: 3,
      numerator: 3,
      denominator: 6,
      disposition: 'observed',
      closure_reason: 'completed',
    });
    expect(rows[1].value).toEqual({
      benefit_1: { work: 0, valid: 3 },
      benefit_3: { work: 3, valid: 3 },
    });
    expect(rows[1]).toMatchObject({
      disposition: 'observed',
      closure_reason: 'completed',
      denominator: 6,
    });
  });

  test('the review censors an open console: one explicit choice keeps its denominator, five missing slots are never zeros; opened-but-unchosen is a voluntary stop with a null companion; the reload guard sees a prior administration', () => {
    const h = harness();
    const s = createM08State('order_a');

    h.open();

    const now = runPractice(s, 0, h.sink);

    m08Continue(s, now, 'pointer', h.sink);
    m08Choose(s, 'work', now + 3_000, 'pointer', h.sink);
    m08Freeze(s, now + 4_000, 'closed_at_review');
    h.close(s, 'closed_at_review', 'closed_at_review');

    const rows = extractItemFeatures('M08', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      numerator: 1,
      denominator: 1,
      disposition: 'incomplete',
      censored: true,
      closure_reason: 'closed_at_review',
    });
    expect(rows[1]).toMatchObject({
      disposition: 'incomplete',
      censored: true,
      closure_reason: 'closed_at_review',
    });

    const left = harness();
    const t = createM08State('order_a');

    left.open();
    runPractice(t, 0, left.sink);
    m08Freeze(t, 2_000, 'voluntary_stop');
    left.close(t, 'voluntary_stop', 'stopped');

    const leftRows = extractItemFeatures('M08', left.events, CONTEXT);

    expect(leftRows[0]).toMatchObject({
      value: null,
      disposition: 'voluntary_stop',
      denominator: 0,
    });
    expect(leftRows[1]).toMatchObject({
      value: null,
      disposition: 'voluntary_stop',
      denominator: 0,
    });

    // Reload guard: the prior load's opened console is recognised; a prior
    // load that only presented it is not an administration.
    expect(m08PriorAdministration(left.events)).toBe(true);
    expect(m08PriorAdministration([])).toBe(false);

    const onlyPresented = harness();

    onlyPresented.present();
    expect(m08PriorAdministration(onlyPresented.events)).toBe(false);

    // The guard's own marker in the new load makes the item `interrupted`
    // (evidence in the prior load), never declined and never re-scored.
    const held = harness();

    held.present();
    held.sink('technical_failure', {
      detail: 'reload after administration: console not re-run',
      input_mode: 'system',
    });

    const heldRows = extractItemFeatures('M08', held.events, {
      ...CONTEXT,
      reloaded: true,
    });

    expect(heldRows[0]).toMatchObject({
      value: null,
      disposition: 'interrupted',
    });
    expect(heldRows[1]).toMatchObject({
      value: null,
      disposition: 'interrupted',
    });
  });
});

/* ------------------------------------------------------------------ *
 * U24 RL-1: the single-occasion rule after a reload (pure;
 * `RELOAD-CORRECTION-SPEC-r3-exec.md` §2 and §5). Streams are built as the
 * runtime writes them: the record from the row's own stage map, then the
 * presentation and — unless the class is A — the marker. The expected
 * readings are written from r3 §2 and §5.
 * ------------------------------------------------------------------ */

const RL1_CONTINUOUS = {
  first_sequence: 1,
  sequence_gap_count: 0,
  sequence_duplicate_count: 0,
  recovered_from_chunks: false,
};
const RL1_UNVERIFIED = { ...RL1_CONTINUOUS, recovered_from_chunks: true };
/** The window's marker details (r3 §2 validity records). */
const RL1_DETAIL = {
  H: 'reload after administration: console not re-run',
  U: 'reload with an unverified earlier state: console not administered',
  M: 'reload with a contradictory earlier check: console not administered',
} as const;
const RL1_REASON = {
  H: 'console administered in an earlier page load; not re-run after the reload',
  U: 'console not administered after a reload: earlier history not verified',
  M: 'console not administered after a reload: earlier check contradictory',
} as const;

function rl1Event(
  suffix: string,
  loadIndex: number,
  sequence: number,
  metadata: Record<string, unknown> = {},
): RawGameEvent {
  return {
    session_id: 's',
    timestamp_ms: sequence,
    scene: 'exterior_recovery_yard',
    event_type:
      suffix === 'session_start' ? suffix : `proto_m08_effort_${suffix}`,
    sequence,
    page_load_index: loadIndex,
    metadata: { opportunity_id: 'proto_m08_effort_choice', ...metadata },
  };
}

function rl1Load(
  prior: readonly string[],
  options: {
    present: boolean;
    integrity?: typeof RL1_CONTINUOUS;
    records?: (record: Record<string, unknown>) => object[];
    /** False: no marker for a held class (a host without its guard). */
    marker?: boolean;
    /** A complete current-load stream written after the record. */
    work?: readonly RawGameEvent[];
  },
) {
  const priorEvents = [
    rl1Event('session_start', 1, 1),
    ...prior.map((suffix, i) => rl1Event(suffix, 1, i + 2)),
  ];
  const record = m08PriorLoadCheck(
    2,
    priorEvents,
    options.integrity ?? RL1_CONTINUOUS,
  ) as unknown as Record<string, unknown>;
  const records = options.records?.(record) ?? [record];
  const reload = classifyM08Reload(2, records);
  const cls = reload.occasions.row.class;
  let sequence = priorEvents.length;
  const current = records.map((r) =>
    rl1Event('prior_load_checked', 2, (sequence += 1), {
      ...r,
      input_mode: 'system',
    }),
  );

  if (options.present) {
    current.push(
      rl1Event('presented', 2, (sequence += 1), { input_mode: 'system' }),
    );

    if (
      options.marker !== false &&
      (cls === 'H' || cls === 'U' || cls === 'M')
    ) {
      current.push(
        rl1Event('technical_failure', 2, (sequence += 1), {
          detail: RL1_DETAIL[cls],
          input_mode: 'system',
        }),
      );
    }
  }

  for (const event of options.work ?? []) {
    current.push({ ...event, page_load_index: 2, sequence: (sequence += 1) });
  }

  return {
    record,
    reload,
    rows: extractItemFeatures('M08', [...priorEvents, ...current], {
      finalCoreClosed: true,
      pageLoadIndex: 2,
      reloaded: true,
    }),
  };
}

test.describe('M08 single-occasion rule after a reload (U24 RL-1, pure)', () => {
  test('A with no current-load evidence ⇒ not_presented: the first-load reading, not interrupted (b); the record is never task evidence', () => {
    const { reload, rows } = rl1Load([], { present: false });

    expect(reload.occasions.row).toMatchObject({
      class: 'A',
      administration_permitted: true,
    });
    expect(rows[0]).toMatchObject({
      disposition: 'not_presented',
      value: null,
    });
    expect(rows[0].missing_reason).toBe('support console never opened');
  });

  test('A presented ⇒ declined: the first-load reading', () => {
    const { reload, rows } = rl1Load([], { present: true });

    expect(reload.occasions.row.class).toBe('A');
    expect(rows[0]).toMatchObject({ disposition: 'declined', value: null });
    expect(rows[0].missing_reason).toBe(
      'console listed in the yard briefing, never opened',
    );
  });

  test('H: an earlier opening ⇒ held, refused; interrupted with the earlier-opening reason (a)', () => {
    const { record, reload, rows } = rl1Load(['opportunity_opened'], {
      present: true,
    });

    expect(record).toMatchObject({
      prior_opening_found: true,
      prior_opening_sequences: [2],
    });
    expect(reload.occasions.row).toMatchObject({
      class: 'H',
      administration_permitted: false,
    });
    expect(rows[0]).toMatchObject({ disposition: 'interrupted', value: null });
    expect(rows[0].missing_reason).toBe(RL1_REASON.H);
  });

  test('history-level U ⇒ held, refused; interrupted, unverified (c)', () => {
    const { reload, rows } = rl1Load([], {
      present: true,
      integrity: RL1_UNVERIFIED,
    });

    expect(reload.occasions.row).toMatchObject({
      class: 'U',
      administration_permitted: false,
      basis: 'history_discontinuous',
    });
    expect(rows[0]).toMatchObject({ disposition: 'interrupted', value: null });
    expect(rows[0].missing_reason).toBe(RL1_REASON.U);
  });

  test('U read from the check alone, without a marker ⇒ interrupted, unverified; with no check the reload reading is unchanged', () => {
    const { rows } = rl1Load([], {
      present: false,
      integrity: RL1_UNVERIFIED,
    });

    expect(rows[0]).toMatchObject({ disposition: 'interrupted', value: null });
    expect(rows[0].missing_reason).toBe(RL1_REASON.U);

    const unchecked = rl1Load([], { present: false, records: () => [] });

    expect(unchecked.reload.occasions.row.basis).toBe('no_check');
    expect(unchecked.rows[0]).toMatchObject({
      disposition: 'interrupted',
      value: null,
    });
    expect(unchecked.rows[0].missing_reason).toBe(
      'no current-load evidence after a reload: support console never opened',
    );
  });

  test('M: a self-contradictory check ⇒ refused; interrupted, contradictory', () => {
    const { reload, rows } = rl1Load([], {
      present: true,
      integrity: RL1_UNVERIFIED,
      records: (record) => [
        { ...record, prior_opening_absence_established: true },
      ],
    });

    expect(reload.check_coherent).toBe(false);
    expect(reload.occasions.row).toMatchObject({
      class: 'M',
      administration_permitted: false,
    });
    expect(rows[0]).toMatchObject({ disposition: 'interrupted', value: null });
    expect(rows[0].missing_reason).toBe(RL1_REASON.M);
  });
});

/* ------------------------------------------------------------------ *
 * U24 RL-1C (owner ruling of 24 October 2026; register §5.406)
 * ------------------------------------------------------------------ */

/**
 * A complete console of this load (presented, opened, six explicit
 * choices: work at benefit 3, rest at benefit 1), with the H marker after
 * the presentation when named.
 */
function rl1cConsole(marker: boolean): RawGameEvent[] {
  const h = harness();
  const s = createM08State('order_b');

  h.present();
  h.open();

  let now = runPractice(s, 0, h.sink);

  for (let slot = 0; slot < 6; slot += 1) {
    expect(m08Continue(s, now, 'pointer', h.sink)).toBe(true);

    const epoch = m08CurrentEpoch(s)!;

    m08Choose(
      s,
      epoch.benefit_units === 3 ? 'work' : 'rest',
      now,
      'pointer',
      h.sink,
    );

    if (epoch.benefit_units === 3) {
      expect(m08SortWork(s, 'B', now + 1_000, 'keyboard', h.sink)).toBe(true);
    }

    now += M08_EPOCH_MS;
    m08Tick(s, now, h.sink);
  }

  h.close(s, 'completed', 'completed');

  const events = [...h.events];

  if (marker) {
    events.splice(
      1,
      0,
      rl1Event('technical_failure', 2, 0, {
        detail: RL1_DETAIL.H,
        input_mode: 'system',
      }),
    );
  }

  return events;
}

test.describe('M08 RL-1C: a missing check and the exposure-record diagnostics (pure)', () => {
  test.beforeEach(() => {
    resetFocusMonitor();
  });

  test('Q1 (A): a presented, unopened console of a reloaded load without its check is U (no_check), refused, and reads held with the U reason', () => {
    const { reload, rows } = rl1Load([], {
      present: true,
      records: () => [],
      marker: false,
    });

    expect(reload).toMatchObject({
      check_count: 0,
      check_coherent: null,
      exposure_record_consistent: true,
      check_malformed: false,
      history_level_uncertain: true,
    });
    expect(reload.occasions.row).toMatchObject({
      class: 'U',
      basis: 'no_check',
      administration_permitted: false,
    });

    for (const row of rows) {
      expect(row).toMatchObject({
        disposition: 'interrupted',
        value: null,
        missing_reason: RL1_REASON.U,
      });
    }
  });

  test('Q1 contrasts: the first load keeps declined; a genuinely unreached load keeps the absentFeature reading', () => {
    const h = harness();

    h.present();

    const first = extractItemFeatures('M08', h.events, CONTEXT);

    for (const row of first) {
      expect(row).toMatchObject({
        disposition: 'declined',
        value: null,
        missing_reason: 'console listed in the yard briefing, never opened',
      });
    }

    expect(first[0].components).not.toHaveProperty(
      'exposure_record_consistent',
    );

    const unreached = rl1Load([], { present: false, records: () => [] });

    expect(unreached.rows[0]).toMatchObject({
      disposition: 'interrupted',
      value: null,
      missing_reason:
        'no current-load evidence after a reload: support console never opened',
    });
  });

  // Q2 (B): the record found the earlier opening while this load opens the
  // console again. Expected from the existing rules: a marker is read only
  // while nothing was opened (m08.ts, the `opened.length === 0` branch), so
  // with or without it the current-load observation stands (3 work
  // choices of 6).
  for (const marker of [false, true]) {
    test(`Q2 (B): an H record beside an opening of this load, ${marker ? 'with its H marker' : 'no marker'} ⇒ observed · 3 · 3/6, flagged`, () => {
      const { reload, rows } = rl1Load(['opportunity_opened'], {
        present: false,
        work: rl1cConsole(marker),
      });

      expect(reload.occasions.row.class).toBe('H');
      expect(rows[0]).toMatchObject({
        disposition: 'observed',
        value: 3,
        numerator: 3,
        denominator: 6,
      });
      expect(rows[0].components).toMatchObject({
        exposure_record_consistent: false,
      });
      expect(rows[0].components).not.toHaveProperty(
        'exposure_record_inconsistent_occasions',
      );
    });
  }

  test('Q2 contrast: an A record beside the opening raises no flag', () => {
    const { rows } = rl1Load([], {
      present: false,
      work: rl1cConsole(false),
    });

    expect(rows[0]).toMatchObject({ disposition: 'observed', value: 3 });
    expect(rows[0].components).toMatchObject({
      exposure_record_consistent: true,
    });
  });
});
