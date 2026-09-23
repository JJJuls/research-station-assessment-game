/**
 * Station 080 M06 — twelve orders in one 60-second focused work budget
 * (Unit 7), pure tests.
 *
 * Playwright test blocks that never touch `page`: the register row; the
 * two forms (matched content, different sequence); the practice criterion
 * unchanged and never scored (a mismatch is reported as such); the ready
 * screen (a carried press refused, begin starts the budget and presents
 * order 1); correct dispatches count once and advance, an incorrect
 * dispatch leaves the order for correction (rework), Back removes one
 * token, skip advances without credit (a skip inside the settle window
 * after an order appears is refused); a closed surface pauses the budget
 * (no dispatch, no time); the budget end (overrun clamped), the two-press
 * explicit stop (any other action disarms it), "all twelve handled" and
 * "all twelve skipped" close the period with distinct stop kinds and the
 * denominator fixed at 60 s; a buffer left at the end is discarded; the
 * review and reload closures; and the extractor recounting the unique
 * correct orders from the dispatch events RE-CHECKED against the form —
 * never begun ⇒ null (declined when the ready screen was seen), a
 * review-closed open period ⇒ `incomplete` with its exposure, declined ≠
 * not presented ≠ interrupted ≠ pending, disagreement ⇒ technical failure
 * on both rows.
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { resetFocusMonitor } from '../src/measurement/focusMonitor';
import { PILOT_SETTINGS } from '../src/measurement/protocol';
import { registerEntry } from '../src/measurement/registerV3';
import {
  createM06State,
  M06_BUDGET_MS,
  M06_FAMILY,
  M06_OPPORTUNITY_ID,
  M06_ORDER_COUNT,
  M06_PRACTICE_LINES,
  M06_SETTLE_MS,
  M06_STOP_CONFIRM_MS,
  m06ActiveRow,
  m06Begin,
  m06ClearBuffer,
  m06CurrentLine,
  m06Dispatch,
  type M06Form,
  m06Freeze,
  type M06LogSink,
  m06OrdersFor,
  m06Paused,
  m06PressToken,
  m06PriorAdministration,
  m06RawComponents,
  m06RemainingMs,
  m06RemoveLastToken,
  m06Skip,
  type M06State,
  m06Stop,
  m06StopArmed,
  m06SurfaceClosed,
  m06SurfaceReopened,
  m06Tick,
  m06TypeLine,
  m06UniqueCorrect,
} from '../src/pilot/windows/m06OrdersModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

/** A captured event stream shaped like the window adapter's emissions. */
function harness() {
  const events: RawGameEvent[] = [];
  const push = (suffix: string, metadata: Record<string, unknown>) => {
    events.push({
      session_id: 's',
      timestamp_ms: events.length,
      scene: 'records_workshop',
      event_type: `${M06_FAMILY}${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: { opportunity_id: M06_OPPORTUNITY_ID, ...metadata },
    });
  };
  const sink: M06LogSink = (suffix, metadata) => push(suffix, metadata);

  return {
    events,
    sink,
    presented: () => push('presented', { input_mode: 'system' }),
    opened: () => push('opportunity_opened', { input_mode: 'system' }),
    close: (
      s: M06State,
      reason: string,
      nowMs: number,
      exit: 'completed' | 'stopped' | 'closed_at_review' = 'completed',
    ) =>
      push('window_closed', {
        exit_state: exit,
        [exit === 'closed_at_review'
          ? 'raw_components_partial'
          : 'raw_components']: m06RawComponents(s, reason, nowMs),
      }),
  };
}

const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };
const OPEN_CONTEXT = { ...CONTEXT, finalCoreClosed: false };
const T0 = 50_000;

function compose(s: M06State, line: readonly string[], log: M06LogSink) {
  for (const token of line) {
    expect(m06PressToken(s, token, 'pointer', log)).toBe(true);
  }
}

/** Passes the practice at `at` (two correct lines) and begins at `at + 1000`. */
function begin(s: M06State, at: number, log: M06LogSink): number {
  for (const line of M06_PRACTICE_LINES) {
    compose(s, line, log);
    expect(m06Dispatch(s, at, 'pointer', log)).toBe('practice_correct');
  }

  expect(s.phase).toBe('ready');
  expect(m06Begin(s, at + 1_000, 'keyboard', log)).toBe('begun');

  return at + 1_000;
}

/** Sends the current order correctly at `at`. */
function sendCurrent(s: M06State, at: number, log: M06LogSink) {
  const line = m06CurrentLine(s)!;

  compose(s, line, log);

  return m06Dispatch(s, at, 'pointer', log);
}

/** The explicit stop: arm, then confirm a moment later. */
function stop(s: M06State, at: number, log: M06LogSink) {
  expect(m06Stop(s, at, 'keyboard', log)).toBe('armed');
  expect(m06StopArmed(s, at + 500)).toBe(true);

  return m06Stop(s, at + 500, 'keyboard', log);
}

test.beforeEach(() => {
  resetFocusMonitor();
});

test.describe('M06 timed work period (pure)', () => {
  test('register row: v3 route with one Workshop window, a count primary on the 60 s budget and a detail companion; two matched forms', () => {
    const entry = registerEntry('M06');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual(['proto_m06_work_period']);
    expect(entry.route.windows.map((w) => [w.id, w.zone, w.episode])).toEqual([
      ['m06_orders_w1', 'records_workshop', 2],
    ]);
    expect(entry.route.family_prefixes).toEqual(['proto_m06_orders_']);
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.independence.kind).toBe('single_episode');
    expect(entry.features.map((f) => [f.feature_id, f.kind, f.role])).toEqual([
      ['m06_unique_correct_orders', 'count', 'primary'],
      ['m06_work_period_detail', 'count', 'companion'],
    ]);
    expect(M06_BUDGET_MS).toBe(PILOT_SETTINGS.m06_work_budget_ms);
    expect(M06_ORDER_COUNT).toBe(PILOT_SETTINGS.m06_orders);
    expect(M06_ORDER_COUNT).toBe(12);

    const a = m06OrdersFor('form_a');
    const b = m06OrdersFor('form_b');

    expect(a).toHaveLength(12);
    expect(new Set(a.map((line) => line.join(' '))).size).toBe(12);
    // Matched content: form B is a permutation of form A's lines.
    expect([...b].map((l) => l.join(' ')).sort()).toEqual(
      [...a].map((l) => l.join(' ')).sort(),
    );
    expect(b.map((l) => l.join(' '))).not.toEqual(a.map((l) => l.join(' ')));
    // Every token appears three times in form A (balanced demand).
    for (const position of [0, 1, 2]) {
      const counts = new Map<string, number>();

      for (const line of a) {
        counts.set(line[position], (counts.get(line[position]) ?? 0) + 1);
      }

      expect([...counts.values()].every((count) => count === 3)).toBe(true);
    }
  });

  test('practice is the unchanged criterion (never scored; a mismatch is reported); the ready screen refuses a carried press; begin starts the focused budget and presents order 1', () => {
    const h = harness();
    const s = createM06State('form_a');
    const log = h.sink;

    // An incorrect practice line is reported and retried; nothing is scored.
    compose(s, ['SET', 'VALVE-C', 'AUTO'], log);
    expect(m06Dispatch(s, T0, 'pointer', log)).toBe('practice_incorrect');
    expect(s.practiceSent).toBe(0);
    expect(s.phase).toBe('practice');
    expect(s.lastDispatch).toMatchObject({ phase: 'practice', correct: false });
    // The active row follows the buffer (digit hotkeys 1–4 on the surface).
    expect(m06ActiveRow(s)).toBe(0);
    compose(s, ['OPEN'], log);
    expect(m06ActiveRow(s)).toBe(1);
    expect(m06RemoveLastToken(s, 'keyboard', log)).toBe(true);
    expect(s.buffer).toEqual([]);
    expect(m06RemoveLastToken(s, 'keyboard', log)).toBe(false);
    // Typed entry is equivalent to the tokens (exactly three tokens).
    expect(m06TypeLine(s, 'open valve-c auto now', 'keyboard', log)).toBe(
      false,
    );
    expect(m06TypeLine(s, 'open valve-c auto', 'keyboard', log)).toBe(true);
    expect(m06ActiveRow(s)).toBeNull();
    expect(m06Dispatch(s, T0 + 500, 'keyboard', log)).toBe('practice_correct');
    expect(s.practiceSent).toBe(1);
    compose(s, M06_PRACTICE_LINES[1], log);
    expect(m06Dispatch(s, T0 + 1_000, 'pointer', log)).toBe('practice_correct');
    expect(s.phase).toBe('ready');
    expect(s.practicePassed).toBe(true);
    expect(s.practiceAttempts).toHaveLength(3);
    expect(s.clock).toBeNull();
    expect(m06UniqueCorrect(s)).toBe(0);
    // No composing on the ready screen.
    expect(m06PressToken(s, 'SET', 'pointer', log)).toBe(false);
    // Carried press inside the settle window: refused, logged.
    expect(m06Begin(s, T0 + 1_100, 'keyboard', log)).toBe('refused');
    expect(s.refusedPresses).toBe(1);
    expect(m06Begin(s, T0 + 1_000 + M06_SETTLE_MS, 'keyboard', log)).toBe(
      'begun',
    );
    expect(s.phase).toBe('work');
    expect(s.beganAtMs).toBe(T0 + 1_400);
    expect(m06CurrentLine(s)).toEqual(m06OrdersFor('form_a')[0]);
    expect(m06RemainingMs(s, T0 + 1_400)).toBe(M06_BUDGET_MS);
    expect(m06Begin(s, T0 + 2_000, 'keyboard', log)).toBe('invalid');
    expect(
      h.events
        .map((e) => e.event_type)
        .filter((t) => /passed|ready|begun|order_presented/.test(t)),
    ).toEqual([
      'proto_m06_orders_practice_passed',
      'proto_m06_orders_ready_shown',
      'proto_m06_orders_period_begun',
      'proto_m06_orders_order_presented',
    ]);
    expect(
      h.events.find((e) => e.event_type === 'proto_m06_orders_order_presented')
        ?.metadata,
    ).toMatchObject({ order_index: 0, focused_ms: 0 });
    expect(m06RawComponents(s, 'pending', T0 + 2_000)).toMatchObject({
      practice_wall_ms: 1_000,
      practice_passed: true,
    });
  });

  test('orders: a correct dispatch counts once and advances; an incorrect one stays for correction (rework, counted once when corrected); skip advances without credit but is refused inside the settle window; all twelve handled closes early with the budget as denominator', () => {
    const h = harness();
    const s = createM06State('form_b');
    const log = h.sink;
    const t = begin(s, T0, log);
    const orders = m06OrdersFor('form_b');

    expect(sendCurrent(s, t + 2_000, log)).toBe('correct');
    expect(m06UniqueCorrect(s)).toBe(1);
    expect(s.current).toBe(1);
    // A skip right after the order appeared is a carried press: refused.
    expect(m06Skip(s, t + 2_100, 'keyboard', log)).toBe('refused');
    expect(s.current).toBe(1);
    // Wrong line for order 2: stays; then corrected → counts once.
    compose(s, ['SET', 'PUMP-2', 'OFF'], log);
    expect(m06Dispatch(s, t + 4_000, 'pointer', log)).toBe('incorrect');
    expect(s.current).toBe(1);
    expect(m06UniqueCorrect(s)).toBe(1);
    expect(s.orders[1].first_pass_correct).toBe(false);
    expect(s.lastDispatch).toMatchObject({ order_index: 1, correct: false });
    expect(sendCurrent(s, t + 6_000, log)).toBe('correct');
    expect(m06UniqueCorrect(s)).toBe(2);
    expect(s.orders[1].dispatches).toHaveLength(2);
    expect(s.orders[1].correct_at_focused_ms).toBe(6_000);
    // Clear an unfinished buffer; skip order 3.
    compose(s, [orders[2][0]], log);
    expect(m06ClearBuffer(s, 'keyboard', log)).toBe(true);
    expect(s.buffer).toEqual([]);
    expect(m06Skip(s, t + 7_000, 'keyboard', log)).toBe('skipped');
    expect(s.orders[2].skipped).toBe(true);
    expect(s.current).toBe(3);
    expect(m06UniqueCorrect(s)).toBe(2);

    // The rest correctly, a second apart: all twelve handled ends early.
    let at = t + 8_000;
    let result: string = 'correct';

    while (s.phase === 'work') {
      result = sendCurrent(s, at, log);
      at += 1_000;
    }

    expect(result).toBe('all_orders');
    expect(s.stopKind).toBe('all_orders');
    expect(s.closureReason).toBe('completed');
    expect(m06UniqueCorrect(s)).toBe(11);
    expect(s.actualStopFocusedMs).toBe(at - 1_000 - t);
    expect(m06PressToken(s, 'SET', 'pointer', log)).toBe(false);

    const raw = m06RawComponents(s, 'completed', at);

    expect(raw).toMatchObject({
      form: 'form_b',
      period_begun: true,
      budget_ms: 60_000,
      orders_planned: 12,
      orders_handled: 12,
      orders_attempted: 11,
      unique_correct_orders: 11,
      first_pass_correct: 10,
      first_pass_accuracy: 10 / 11,
      rework_dispatches: 1,
      invalid_dispatches: 1,
      orders_skipped: 1,
      stop_kind: 'all_orders',
      send_animation: false,
      dispatch_input_modes: { pointer: 12, keyboard: 0, system: 0 },
    });
    expect(
      h.events.filter(
        (e) => e.event_type === 'proto_m06_orders_order_dispatched',
      ),
    ).toHaveLength(12);
    expect(
      h.events.find((e) => e.event_type === 'proto_m06_orders_period_ended')
        ?.metadata,
    ).toMatchObject({ stop_kind: 'all_orders', unique_correct_orders: 11 });

    // Twelve skips without a dispatch: a voluntary closure, not a completed period.
    const k = createM06State('form_a');
    const klog = harness().sink;
    const tk = begin(k, T0, klog);
    let skipResult: string = 'skipped';
    let ak = tk + 1_000;

    while (k.phase === 'work') {
      skipResult = m06Skip(k, ak, 'pointer', klog);
      ak += 1_000;
    }

    expect(skipResult).toBe('all_orders');
    expect(k.stopKind).toBe('all_skipped');
    expect(k.closureReason).toBe('voluntary_stop');
    expect(m06UniqueCorrect(k)).toBe(0);
  });

  test('a closed surface pauses the budget (no dispatch, no time); the reopen records the stage; the budget end closes the period on FOCUSED time with the overrun clamped and an unsent buffer discarded; a dispatch past the budget is never a dispatch', () => {
    const h = harness();
    const s = createM06State('form_a');
    const log = h.sink;
    const t = begin(s, T0, log);

    expect(sendCurrent(s, t + 5_000, log)).toBe('correct');
    m06SurfaceClosed(s, t + 10_000, log);
    expect(m06Paused(s)).toBe(true);
    expect(m06PressToken(s, 'SET', 'pointer', log)).toBe(false);
    expect(m06Skip(s, t + 20_000, 'pointer', log)).toBe('refused');
    expect(m06Tick(s, t + 200_000, log)).toBe('none'); // paused: no budget spent
    m06SurfaceReopened(s, t + 200_000, log, 'workshop_return');
    expect(s.resumptions).toEqual([
      { at_ms: t + 200_000, focused_ms: 10_000, stage: 'workshop_return' },
    ]);
    expect(m06RemainingMs(s, t + 200_000)).toBe(50_000);
    // 49.9 s later a correct order still lands inside the budget.
    expect(sendCurrent(s, t + 249_900, log)).toBe('correct');
    expect(m06UniqueCorrect(s)).toBe(2);
    compose(s, ['SET'], log);
    expect(m06Tick(s, t + 250_000 - 1, log)).toBe('none');
    expect(m06Tick(s, t + 250_230, log)).toBe('budget'); // a late tick
    expect(s.phase).toBe('done');
    expect(s.stopKind).toBe('budget');
    expect(s.closureReason).toBe('completed');
    expect(s.actualStopFocusedMs).toBe(60_000);
    expect(s.budgetOverrunMs).toBe(230);
    expect(s.focusedMs).toBe(60_230);
    expect(s.wallMs).toBe(250_230);
    expect(s.excludedMs?.surface_closed).toBe(190_000);
    expect(s.bufferDiscardedAtEnd).toEqual(['SET']);
    expect(m06Dispatch(s, t + 251_000, 'pointer', log)).toBe('refused');

    // A dispatch attempted past the budget (no tick ran) closes the period
    // first and is never a dispatch.
    const late = createM06State('form_a');
    const llog = harness().sink;
    const tl = begin(late, T0, llog);

    compose(late, m06CurrentLine(late)!, llog);
    expect(m06Dispatch(late, tl + 61_000, 'pointer', llog)).toBe('budget');
    expect(late.orders[0].dispatches).toHaveLength(0);
    expect(m06UniqueCorrect(late)).toBe(0);
  });

  test('the explicit stop is two presses (any other action disarms it) and keeps the 60 s denominator; the review and reload closures; the reload guard', () => {
    const h = harness();
    const s = createM06State('form_a');
    const log = h.sink;
    const t = begin(s, T0, log);

    expect(sendCurrent(s, t + 3_000, log)).toBe('correct');
    // Arm, then a token press disarms; the next press arms again.
    expect(m06Stop(s, t + 4_000, 'keyboard', log)).toBe('armed');
    compose(s, ['SET'], log);
    expect(m06StopArmed(s, t + 4_100)).toBe(false);
    expect(m06ClearBuffer(s, 'keyboard', log)).toBe(true);
    // An armed stop lapses after the confirm window.
    expect(m06Stop(s, t + 5_000, 'keyboard', log)).toBe('armed');
    expect(m06StopArmed(s, t + 5_000 + M06_STOP_CONFIRM_MS)).toBe(false);
    expect(m06Stop(s, t + 5_000 + M06_STOP_CONFIRM_MS, 'keyboard', log)).toBe(
      'armed',
    );
    expect(sendCurrent(s, t + 6_000, log)).toBe('correct');
    expect(stop(s, t + 9_000, log)).toBe('stopped');
    expect(s.stopKind).toBe('explicit');
    expect(s.closureReason).toBe('voluntary_stop');
    expect(s.actualStopFocusedMs).toBe(9_500);
    expect(m06RawComponents(s, 'voluntary_stop', t + 9_500)).toMatchObject({
      unique_correct_orders: 2,
      budget_ms: 60_000,
      actual_stop_focused_ms: 9_500,
      stop_kind: 'explicit',
      stop_arm_presses: 4,
    });
    expect(m06Stop(s, t + 10_000, 'keyboard', log)).toBe('refused');
    expect(
      h.events.map((e) => e.event_type).filter((t) => /stop/.test(t)),
    ).toEqual([
      'proto_m06_orders_stop_armed',
      'proto_m06_orders_stop_disarmed',
      'proto_m06_orders_stop_armed',
      'proto_m06_orders_stop_armed',
      'proto_m06_orders_stop_disarmed',
      'proto_m06_orders_stop_armed',
      'proto_m06_orders_stopped',
    ]);

    // Review closure of an open period: frozen as review, count kept.
    const r = createM06State('form_a');
    const rlog = harness().sink;
    const tr = begin(r, T0, rlog);

    expect(sendCurrent(r, tr + 2_000, rlog)).toBe('correct');
    m06Freeze(r, tr + 30_000, 'closed_at_review', 'review');
    expect(r.phase).toBe('done');
    expect(r.stopKind).toBe('review');
    expect(m06UniqueCorrect(r)).toBe(1);
    expect(r.focusedMs).toBe(30_000);

    // Review closure before the period began (practice only).
    const p = createM06State('form_a');

    m06Freeze(p, T0, 'closed_at_review', 'review');
    expect(p.phase).toBe('done');
    expect(p.beganAtMs).toBeNull();

    // Reload guard.
    expect(
      m06PriorAdministration([
        { event_type: 'proto_m06_orders_opportunity_opened' },
      ]),
    ).toBe(true);
    expect(
      m06PriorAdministration([{ event_type: 'proto_m06_orders_presented' }]),
    ).toBe(false);
  });

  test('extractor: the unique correct count recounted from the dispatch events re-checked against the form (budget end, explicit stop, all handled); never begun ⇒ null (declined once the ready screen was seen); open ⇒ pending; declined ≠ not presented ≠ interrupted; review-closed ⇒ incomplete with exposure; disagreement ⇒ technical failure on both rows', () => {
    // Budget end with 3 correct (one corrected), one skipped.
    const h = harness();
    const s = createM06State('form_a');

    h.presented();
    h.opened();

    const t = begin(s, T0, h.sink);

    expect(sendCurrent(s, t + 2_000, h.sink)).toBe('correct');
    compose(s, ['HOLD', 'PUMP-2', 'LOW'], h.sink);
    expect(m06Dispatch(s, t + 4_000, 'pointer', h.sink)).toBe('incorrect');
    expect(sendCurrent(s, t + 6_000, h.sink)).toBe('correct');
    expect(m06Skip(s, t + 8_000, 'pointer', h.sink)).toBe('skipped');
    expect(sendCurrent(s, t + 10_000, h.sink)).toBe('correct');
    expect(m06Tick(s, t + 60_000, h.sink)).toBe('budget');
    h.close(s, 'completed', t + 60_000);

    const rows = extractItemFeatures('M06', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      feature_id: 'm06_unique_correct_orders',
      value: 3,
      numerator: 3,
      denominator: null,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
      included_ids: ['m06_orders_w1'],
      coverage_label: 'behavioural_counterpart',
      independence: 'single_episode',
    });
    expect(rows[0].components).toMatchObject({
      stop_kind: 'budget',
      budget_ms: 60_000,
      orders_attempted: 3,
      unique_correct_recount: 3,
      recount_agrees: true,
      practice_passed: true,
      ready_shown: true,
      exposure_focused_ms: 60_000,
    });
    expect(rows[1]).toMatchObject({
      feature_id: 'm06_work_period_detail',
      disposition: 'observed',
    });
    expect(rows[1].value).toMatchObject({
      first_pass_correct: 2,
      first_pass_accuracy: 2 / 3,
      rework_dispatches: 1,
      invalid_dispatches: 1,
      orders_skipped: 1,
      actual_stop_focused_ms: 60_000,
      stop_kind: 'budget',
    });
    expect(JSON.stringify(rows[0])).not.toMatch(/per_second|rate|speed/i);

    // Explicit stop: value kept, closure voluntary_stop, not censored.
    const e = harness();
    const es = createM06State('form_b');

    e.presented();
    e.opened();

    const te = begin(es, T0, e.sink);

    expect(sendCurrent(es, te + 1_000, e.sink)).toBe('correct');
    expect(stop(es, te + 5_000, e.sink)).toBe('stopped');
    e.close(es, 'voluntary_stop', te + 5_500, 'stopped');
    expect(extractItemFeatures('M06', e.events, CONTEXT)[0]).toMatchObject({
      value: 1,
      disposition: 'observed',
      closure_reason: 'voluntary_stop',
      censored: false,
    });

    // Never begun: practice abandoned ⇒ no eligible event; ready screen
    // shown and Begin never pressed ⇒ declined.
    const n = harness();
    const ns = createM06State('form_a');

    n.presented();
    n.opened();
    compose(ns, M06_PRACTICE_LINES[0], n.sink);
    m06Dispatch(ns, T0, 'pointer', n.sink);
    m06Freeze(ns, T0 + 5_000, 'closed_at_review', 'review');
    n.close(ns, 'closed_at_review', T0 + 5_000, 'closed_at_review');
    expect(extractItemFeatures('M06', n.events, CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'no_eligible_event',
      closure_reason: 'closed_at_review',
      censored: true,
    });

    const d = harness();
    const ds = createM06State('form_a');

    d.presented();
    d.opened();

    for (const line of M06_PRACTICE_LINES) {
      compose(ds, line, d.sink);
      m06Dispatch(ds, T0, 'pointer', d.sink);
    }

    expect(ds.phase).toBe('ready');
    m06Freeze(ds, T0 + 5_000, 'closed_at_review', 'review');
    d.close(ds, 'closed_at_review', T0 + 5_000, 'closed_at_review');
    expect(extractItemFeatures('M06', d.events, CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'declined',
      censored: false,
    });

    // Review-closed open period ⇒ incomplete with its exposure.
    const r = harness();
    const rs = createM06State('form_a');

    r.presented();
    r.opened();

    const tr = begin(rs, T0, r.sink);

    expect(sendCurrent(rs, tr + 1_000, r.sink)).toBe('correct');
    m06Freeze(rs, tr + 20_000, 'closed_at_review', 'review');
    r.close(rs, 'closed_at_review', tr + 20_000, 'closed_at_review');

    const rRows = extractItemFeatures('M06', r.events, CONTEXT);

    expect(rRows[0]).toMatchObject({
      value: 1,
      disposition: 'incomplete',
      closure_reason: 'closed_at_review',
      censored: true,
    });
    expect(rRows[0].components).toMatchObject({ exposure_focused_ms: 20_000 });

    // Open ⇒ pending; presented only ⇒ declined; nothing ⇒ not presented;
    // reload ⇒ interrupted; held back ⇒ interrupted.
    const o = harness();

    o.presented();
    expect(
      extractItemFeatures('M06', o.events, OPEN_CONTEXT)[0].disposition,
    ).toBe('declined');
    o.opened();
    expect(
      extractItemFeatures('M06', o.events, OPEN_CONTEXT)[0].disposition,
    ).toBe('pending');
    expect(extractItemFeatures('M06', [], CONTEXT)[0].disposition).toBe(
      'not_presented',
    );
    expect(
      extractItemFeatures('M06', [], { ...CONTEXT, reloaded: true })[0]
        .disposition,
    ).toBe('interrupted');

    const held = harness();

    held.sink('technical_failure', {
      detail: 'reload after administration: console not re-run',
      input_mode: 'system',
    });
    expect(
      extractItemFeatures('M06', held.events, CONTEXT)[0].disposition,
    ).toBe('interrupted');

    // A record whose count disagrees with the dispatch events: both rows fail.
    const tampered = h.events.map((event) =>
      event.event_type === 'proto_m06_orders_window_closed'
        ? {
            ...event,
            metadata: {
              ...event.metadata,
              raw_components: {
                ...(event.metadata!.raw_components as Record<string, unknown>),
                unique_correct_orders: 5,
              },
            },
          }
        : event,
    );
    const tamperedRows = extractItemFeatures('M06', tampered, CONTEXT);

    expect(tamperedRows[0]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });
    expect(tamperedRows[1]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });

    // A dispatch event flagged correct whose line does not match the form.
    const flagged = h.events.map((event) =>
      event.event_type === 'proto_m06_orders_order_dispatched' &&
      event.metadata?.order_index === 0
        ? {
            ...event,
            metadata: { ...event.metadata, line: ['SET', 'PUMP-2', 'LOW'] },
          }
        : event,
    );

    expect(extractItemFeatures('M06', flagged, CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });

    // Both forms yield the same order set; the harness form is recorded.
    expect(
      (['form_a', 'form_b'] as M06Form[]).map(
        (form) => m06OrdersFor(form).length,
      ),
    ).toEqual([12, 12]);
  });
});
