/**
 * Station 080 M08 — station support console (Unit 2), pure tests.
 *
 * Playwright test blocks that never touch `page`: counterbalanced benefit
 * orders (three of each level), practice never scored, an explicit choice
 * is required (a missing choice is never Rest), both slot kinds last the
 * same focused 15 s, a closed surface pauses the slot, the extractor
 * reproduces the primary and per-level fractions from the raw events with
 * null-not-zero semantics, and the register row is on its v3 route with
 * an explicit, cited disposition override.
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { resetFocusMonitor } from '../src/measurement/focusMonitor';
import { registerEntry } from '../src/measurement/registerV3';
import {
  createM08State,
  M08_BENEFIT_ORDERS,
  M08_EPOCH_MS,
  M08_PRACTICE_ITEMS,
  M08_THRESHOLD,
  m08Choose,
  m08CurrentEpoch,
  m08CurrentReading,
  m08EpochRemainingMs,
  m08Freeze,
  type M08LogSink,
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
    open: () => push('opportunity_opened', { input_mode: 'system' }),
    close: (s: M08State, reason: string, exit: string) =>
      push('window_closed', {
        exit_state: exit,
        [exit === 'closed_at_review'
          ? 'raw_components_partial'
          : 'raw_components']: m08RawComponents(s, reason),
      }),
  };
}

function runPractice(s: M08State, now: number, sink: M08LogSink): number {
  for (let i = 0; i < M08_PRACTICE_ITEMS; i += 1) {
    const bin = m08CurrentReading(s) >= M08_THRESHOLD ? 'A' : 'B';

    expect(m08SortPractice(s, bin, now + i * 500, 'pointer', sink)).toBe(true);
  }

  return now + M08_PRACTICE_ITEMS * 500;
}

const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };

test.describe('M08 support console (pure)', () => {
  test.beforeEach(() => {
    resetFocusMonitor();
  });

  test('orders present each benefit level three times; the register row is on its v3 route with a cited override', () => {
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
  });

  test('practice is never scored; a choice is required; both slot kinds last 15 focused seconds; a closed surface pauses; missing choices are never Rest', () => {
    const h = harness();
    const s = createM08State('order_a');

    h.open();
    expect(s.phase).toBe('practice');
    expect(m08Choose(s, 'work', 1_100, 'pointer', h.sink)).toBe(false);

    let now = runPractice(s, 1_000, h.sink);

    expect(s.practice).toMatchObject({ sorted: 4, correct: 4, passed: true });
    expect(s.phase).toBe('choice');
    expect(
      h.events.filter(
        (e) => e.event_type === 'proto_m08_effort_choice_presented',
      ),
    ).toHaveLength(1);

    // Slot 1: sort. Sorting counts; the slot ends at 15 focused seconds.
    const first = m08CurrentEpoch(s)!;

    expect(m08Choose(s, 'work', now + 800, 'keyboard', h.sink)).toBe(true);
    // The choice screen appeared at the fourth practice sort (now − 500).
    expect(first.choice_latency_ms).toBe(1_300);
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
      output_units: first.benefit_units,
      items_sorted: 2,
      items_correct: 1,
      focused_ms: M08_EPOCH_MS,
    });
    expect(s.phase).toBe('choice');
    now += 800 + M08_EPOCH_MS;

    // Slot 2: stand by — same duration, no output, sorting refused.
    expect(m08Choose(s, 'rest', now, 'pointer', h.sink)).toBe(true);
    expect(m08SortWork(s, 'A', now + 100, 'pointer', h.sink)).toBe(false);
    expect(m08Tick(s, now + M08_EPOCH_MS - 1, h.sink)).toBe('none');
    expect(m08Tick(s, now + M08_EPOCH_MS, h.sink)).toBe('epoch');
    expect(s.epochs[1]).toMatchObject({
      choice: 'rest',
      valid: true,
      output_units: 0,
      completed: true,
      focused_ms: M08_EPOCH_MS,
    });
    now += M08_EPOCH_MS;

    // Slot 3: a closed surface pauses the slot; reopening resumes it.
    expect(m08Choose(s, 'work', now, 'pointer', h.sink)).toBe(true);
    m08SurfaceClosed(s, now + 2_000, h.sink);
    expect(m08SortWork(s, 'A', now + 3_000, 'pointer', h.sink)).toBe(false);
    expect(m08Tick(s, now + 60_000, h.sink)).toBe('none');
    m08SurfaceReopened(s, now + 60_000, h.sink);
    expect(m08EpochRemainingMs(s, now + 60_000)).toBe(M08_EPOCH_MS - 2_000);
    expect(m08Tick(s, now + 60_000 + M08_EPOCH_MS - 2_000, h.sink)).toBe(
      'epoch',
    );
    expect(s.epochs[2].focused_ms).toBe(M08_EPOCH_MS);
    now += 60_000 + M08_EPOCH_MS - 2_000;

    // Shift ends with slot 4 pending: 3 valid choices, 3 missing (never Rest).
    expect(s.phase).toBe('choice');
    m08Freeze(s, now + 5_000, 'voluntary_stop');
    h.close(s, 'voluntary_stop', 'stopped');

    const raw = m08RawComponents(s, 'voluntary_stop');

    expect(raw).toMatchObject({
      valid_choices: 3,
      work_choices: 2,
      rest_choices: 1,
      missing_choices: 3,
      output_units_total:
        2 * 0 + s.epochs[0].benefit_units + s.epochs[2].benefit_units,
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
    });
    expect(rows[0].components).toMatchObject({ missing_choices: 3 });

    const levels = rows[1].value as {
      benefit_1: { work: number; valid: number };
      benefit_3: { work: number; valid: number };
    };

    expect(levels.benefit_1.valid + levels.benefit_3.valid).toBe(3);
    expect(levels.benefit_1.work + levels.benefit_3.work).toBe(2);
  });

  test('a complete run: six valid choices → observed fraction and per-level fractions; a never-opened console is absent, never zero', () => {
    const empty = extractItemFeatures('M08', [], CONTEXT);

    expect(empty[0]).toMatchObject({
      value: null,
      disposition: 'not_presented',
    });
    expect(
      extractItemFeatures('M08', [], { ...CONTEXT, reloaded: true })[0]
        .disposition,
    ).toBe('interrupted');

    const h = harness();
    const s = createM08State('order_b');

    h.open();

    let now = runPractice(s, 0, h.sink);

    for (let slot = 0; slot < 6; slot += 1) {
      const epoch = m08CurrentEpoch(s)!;

      expect(epoch.epoch).toBe(slot + 1);
      m08Choose(
        s,
        epoch.benefit_units === 3 ? 'work' : 'rest',
        now,
        'pointer',
        h.sink,
      );
      now += M08_EPOCH_MS;
      expect(m08Tick(s, now, h.sink)).toBe(slot === 5 ? 'done' : 'epoch');
    }

    expect(s.outputUnitsTotal).toBe(9);
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
    expect(rows[1].closure_reason).toBe('completed');
  });

  test('the review censors an open console: one explicit choice keeps its denominator, five missing slots are never zeros; opened-but-unchosen is a voluntary stop', () => {
    const h = harness();
    const s = createM08State('order_a');

    h.open();
    runPractice(s, 0, h.sink);
    m08Choose(s, 'work', 3_000, 'pointer', h.sink);
    m08Freeze(s, 4_000, 'closed_at_review');
    h.close(s, 'closed_at_review', 'closed_at_review');

    const rows = extractItemFeatures('M08', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      numerator: 1,
      denominator: 1,
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

    expect(extractItemFeatures('M08', left.events, CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'voluntary_stop',
      denominator: 0,
    });
  });
});
