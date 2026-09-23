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
