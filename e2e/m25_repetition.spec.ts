/**
 * Station 080 M25 — calibration loops and normality belief (Unit 4),
 * pure tests.
 *
 * Playwright test blocks that never touch `page`: the register row, the
 * three required loops (never counted), one press = one loop (a press
 * while a loop runs, on a paused surface or after the cap is refused),
 * completion marked before any optional loop, the completion screen's own
 * controls (optional phase / explicit stop with zero repeats), completed
 * optional loops counted under a 30 s focused cap (a loop in progress at
 * the cap is not a repeat), the closed surface pausing both clocks
 * (focused ≠ wall), the shift-end and review closures, the reload guard,
 * the belief gate (exposure + recorded closure of the loops, M24 and M26
 * windows — never a score), the immutable first response, and the
 * extractor reproducing both features independently: repeats 0 with a
 * belief present, belief null while repeats observed, loops incomplete ⇒
 * both null, declined ≠ not presented ≠ interrupted ≠ pending.
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { resetFocusMonitor } from '../src/measurement/focusMonitor';
import {
  M25_NORMALITY_OPTIONS,
  M25_NORMALITY_PROMPT,
} from '../src/measurement/protocol';
import { registerEntry } from '../src/measurement/registerV3';
import {
  createM25State,
  M25_LOOP_MS,
  M25_REPEAT_CAP_MS,
  M25_REQUIRED_LOOPS,
  M25_SETTLE_MS,
  m25AnswerBelief,
  m25AskBelief,
  m25BeliefDue,
  m25BeliefRawComponents,
  m25EnterOptional,
  m25Exposed,
  m25Freeze,
  type M25LogSink,
  m25OptionalCompleted,
  m25PriorAdministration,
  m25RawComponents,
  m25RequiredCompleted,
  m25RunningLoop,
  m25StartLoop,
  type M25State,
  m25Stop,
  m25SurfaceClosed,
  m25SurfaceReopened,
  m25Tick,
} from '../src/pilot/exterior/m25RepetitionModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

type Family = 'loops' | 'belief';

/** A captured event stream shaped like the window adapter's emissions. */
function harness() {
  const events: RawGameEvent[] = [];
  const push = (
    family: Family,
    suffix: string,
    metadata: Record<string, unknown>,
  ) => {
    events.push({
      session_id: 's',
      timestamp_ms: events.length,
      scene:
        family === 'loops' ? 'exterior_recovery_yard' : 'station_concourse',
      event_type: `proto_m25_${family}_${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: {
        opportunity_id:
          family === 'loops'
            ? 'proto_m25_calibration_loops'
            : 'proto_m25_normality_belief',
        ...metadata,
      },
    });
  };
  const loops: M25LogSink = (suffix, metadata) =>
    push('loops', suffix, metadata);
  const belief: M25LogSink = (suffix, metadata) =>
    push('belief', suffix, metadata);

  return {
    events,
    loops,
    belief,
    presented: () => push('loops', 'presented', { input_mode: 'system' }),
    opened: () => push('loops', 'opportunity_opened', { input_mode: 'system' }),
    closeLoops: (
      s: M25State,
      reason: string,
      nowMs: number,
      exit: 'completed' | 'stopped' | 'closed_at_review' = 'completed',
    ) =>
      push('loops', 'window_closed', {
        exit_state: exit,
        [exit === 'closed_at_review' && reason !== 'completed'
          ? 'raw_components_partial'
          : 'raw_components']: m25RawComponents(s, reason, nowMs),
      }),
    closeBelief: (s: M25State, reason: string, exit: string) =>
      push('belief', 'window_closed', {
        exit_state: exit,
        raw_components: m25BeliefRawComponents(s, reason),
      }),
  };
}

const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };
const OPEN_CONTEXT = { ...CONTEXT, finalCoreClosed: false };
const ALL_CLOSED = { loopsClosed: true, m24Closed: true, m26Closed: true };

/** Runs one loop: press at `at`, tick until it completes. */
function runLoop(
  s: M25State,
  at: number,
  log: M25LogSink,
  mode: 'pointer' | 'keyboard' = 'pointer',
) {
  expect(m25StartLoop(s, at, mode, log)).toBe(true);
  expect(m25Tick(s, at + M25_LOOP_MS - 1, log)).toBe('none');

  return m25Tick(s, at + M25_LOOP_MS, log);
}

/** Three required loops from `at`; returns the completion time. */
function completeRequired(s: M25State, at: number, log: M25LogSink): number {
  let t = at;

  for (let i = 1; i <= M25_REQUIRED_LOOPS; i += 1) {
    const result = runLoop(s, t, log);

    expect(result).toBe(
      i === M25_REQUIRED_LOOPS ? 'required_complete' : 'loop',
    );
    t += M25_LOOP_MS + 500;
  }

  return t;
}

test.beforeEach(() => {
  resetFocusMonitor();
});

test.describe('M25 calibration loops and normality belief (pure)', () => {
  test('register row: v3 route with the loops window in the yard and the belief window in the Concourse, a cited override, hybrid label, two separate features', () => {
    const entry = registerEntry('M25');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual([
      'proto_m25_calibration_loops',
      'proto_m25_normality_belief',
    ]);
    expect(entry.route.windows.map((w) => w.zone)).toEqual([
      'exterior_recovery_yard',
      'station_concourse',
    ]);
    expect(entry.route.family_prefixes).toEqual([
      'proto_m25_loops_',
      'proto_m25_belief_',
    ]);
    expect(entry.disposition).toBe('PRIMARY-CANDIDATE');
    expect(entry.disposition_override?.approved_by).toContain('M25 row');
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.coverage_label).toBe('hybrid');
    expect(entry.review_naming).toBe('never');
    expect(entry.features.map((f) => f.feature_id)).toEqual([
      'm25_optional_repeats',
      'm25_normality_belief',
    ]);
    expect(entry.features[0].role).toBe('primary');
    expect(entry.features[1].role).toBe('companion');
    expect(entry.features[1].kind).toBe('ordinal');
    // The pinned stem and anchors are the only in-game question text.
    expect(M25_NORMALITY_PROMPT).toBe(
      'Do you think redoing the same task over and over is normal?',
    );
    expect(M25_NORMALITY_OPTIONS.map((o) => o.label)).toEqual([
      'Not at all normal',
      'Slightly normal',
      'Moderately normal',
      'Very normal',
      'Completely normal',
    ]);
  });

  test('three required loops: one press = one loop, a press while a loop runs is refused, completion is marked before any optional loop, required loops never count', () => {
    const h = harness();
    const s = createM25State();

    expect(m25Exposed(s)).toBe(false);
    expect(m25StartLoop(s, 100, 'pointer', h.loops)).toBe(true);
    // Held key / carried click while the loop runs: refused, logged.
    expect(m25StartLoop(s, 200, 'keyboard', h.loops)).toBe(false);
    expect(m25StartLoop(s, 300, 'pointer', h.loops)).toBe(false);
    expect(s.loops).toHaveLength(1);
    expect(
      h.events.filter(
        (e) => e.event_type === 'proto_m25_loops_loop_press_refused',
      ),
    ).toHaveLength(2);
    expect(m25Tick(s, 100 + M25_LOOP_MS - 1, h.loops)).toBe('none');
    expect(m25Tick(s, 100 + M25_LOOP_MS, h.loops)).toBe('loop');
    expect(m25RequiredCompleted(s)).toBe(1);
    expect(m25RunningLoop(s)).toBeNull();

    // Nothing optional can start before completion is marked.
    expect(m25EnterOptional(s, 4_000, 'pointer', h.loops)).toBe(false);
    expect(m25Stop(s, 4_000, 'pointer', h.loops)).toBe(false);

    expect(runLoop(s, 4_000, h.loops)).toBe('loop');
    expect(runLoop(s, 8_000, h.loops, 'keyboard')).toBe('required_complete');
    expect(s.phase).toBe('complete_marked');
    expect(m25Exposed(s)).toBe(true);
    expect(m25RequiredCompleted(s)).toBe(3);
    expect(m25OptionalCompleted(s)).toBe(0);
    // On the completion screen a loop press does nothing (no carry-over).
    expect(m25StartLoop(s, 11_100, 'keyboard', h.loops)).toBe(false);
    expect(s.loops).toHaveLength(3);

    const completions = h.events.filter(
      (e) => e.event_type === 'proto_m25_loops_loop_completed',
    );

    expect(completions.map((e) => e.metadata?.kind)).toEqual([
      'required',
      'required',
      'required',
    ]);
    expect(completions.map((e) => e.metadata?.phase)).toEqual([
      'practice',
      'practice',
      'practice',
    ]);
    expect(
      h.events.filter(
        (e) => e.event_type === 'proto_m25_loops_required_complete',
      ),
    ).toHaveLength(1);
    expect(m25RawComponents(s, 'pending', 11_100)).toMatchObject({
      required_loops_completed: 3,
      required_complete: true,
      completion_marked: true,
      exposed: true,
      optional_entered: false,
      optional_repeats_completed: 0,
      futility_gate: false,
    });
  });

  test('optional phase: completed repeats counted, a loop in progress at the 30 s focused cap is not a repeat, the cap censors; explicit stop on the completion screen is an exposed stopper with zero repeats', () => {
    // Repeater: two completed loops, a third cut by the cap.
    const h = harness();
    const s = createM25State();
    const t0 = completeRequired(s, 0, h.loops);

    expect(m25EnterOptional(s, t0, 'keyboard', h.loops)).toBe(true);
    expect(m25EnterOptional(s, t0 + 1, 'keyboard', h.loops)).toBe(false);
    expect(s.phase).toBe('optional');
    expect(runLoop(s, t0 + 100, h.loops)).toBe('loop');
    expect(runLoop(s, t0 + 4_000, h.loops, 'keyboard')).toBe('loop');
    expect(m25OptionalCompleted(s)).toBe(2);
    // Third loop starts 28 s in: the cap (30 s) falls mid-loop.
    expect(m25StartLoop(s, t0 + 28_000, 'pointer', h.loops)).toBe(true);
    expect(m25Tick(s, t0 + 29_999, h.loops)).toBe('none');
    expect(m25Tick(s, t0 + M25_REPEAT_CAP_MS, h.loops)).toBe('cap');
    expect(s.phase).toBe('done');
    expect(m25OptionalCompleted(s)).toBe(2);
    expect(s.loop_in_progress_at_cap).toBe(true);
    expect(s.cap_reached).toBe(true);
    expect(s.stop_kind).toBe('cap');
    // Nothing after the cap.
    expect(m25StartLoop(s, t0 + 31_000, 'pointer', h.loops)).toBe(false);
    expect(m25Stop(s, t0 + 31_000, 'pointer', h.loops)).toBe(false);

    const raw = m25RawComponents(s, 'cap', t0 + M25_REPEAT_CAP_MS);

    expect(raw).toMatchObject({
      optional_repeats_completed: 2,
      optional_loops_started: 3,
      loop_in_progress_at_cap: true,
      cap_reached: true,
      repeat_focused_ms: M25_REPEAT_CAP_MS,
      stop_kind: 'cap',
    });

    // Stopper: "Finished" on the completion screen — exposed, 0 repeats.
    const hs = harness();
    const stopper = createM25State();
    const ts = completeRequired(stopper, 0, hs.loops);

    expect(m25Stop(stopper, ts, 'pointer', hs.loops)).toBe(true);
    expect(stopper.phase).toBe('done');
    expect(stopper.stop_kind).toBe('explicit');
    expect(m25Exposed(stopper)).toBe(true);
    expect(m25RawComponents(stopper, 'voluntary_stop', ts)).toMatchObject({
      optional_entered: false,
      optional_repeats_completed: 0,
      cap_reached: false,
      stop_kind: 'explicit',
    });

    // Explicit stop mid-loop in the optional phase abandons the loop.
    const hm = harness();
    const mid = createM25State();
    const tm = completeRequired(mid, 0, hm.loops);

    m25EnterOptional(mid, tm, 'pointer', hm.loops);
    runLoop(mid, tm + 10, hm.loops);
    m25StartLoop(mid, tm + 5_000, 'pointer', hm.loops);
    expect(m25Stop(mid, tm + 6_000, 'keyboard', hm.loops)).toBe(true);
    expect(m25OptionalCompleted(mid)).toBe(1);
    expect(
      hm.events.find((e) => e.event_type === 'proto_m25_loops_stopped')
        ?.metadata,
    ).toMatchObject({ loop_abandoned: true, optional_completed: 1 });
  });

  test('a closed surface pauses the loop and the optional window (focused ≠ wall); a press on the paused surface is refused; the shift end and the review freeze without completing', () => {
    const h = harness();
    const s = createM25State();

    // Required loop paused by ESC: focused time stands still.
    m25StartLoop(s, 0, 'pointer', h.loops);
    m25SurfaceClosed(s, 1_000, h.loops);
    expect(m25Tick(s, 10_000, h.loops)).toBe('none');
    m25SurfaceReopened(s, 10_000, h.loops);
    expect(m25Tick(s, 11_999, h.loops)).toBe('none');
    expect(m25Tick(s, 12_000, h.loops)).toBe('loop');
    expect(s.loops[0]).toMatchObject({
      completed: true,
      focused_ms: M25_LOOP_MS,
      wall_ms: 12_000,
    });

    runLoop(s, 13_000, h.loops);
    runLoop(s, 17_000, h.loops);
    m25EnterOptional(s, 21_000, 'pointer', h.loops);
    // Optional window paused for 40 s: no cap.
    m25SurfaceClosed(s, 22_000, h.loops);
    expect(m25StartLoop(s, 30_000, 'pointer', h.loops)).toBe(false);
    expect(m25Tick(s, 62_000, h.loops)).toBe('none');
    expect(s.cap_reached).toBe(false);
    m25SurfaceReopened(s, 62_000, h.loops);
    expect(runLoop(s, 62_100, h.loops)).toBe('loop');
    expect(m25OptionalCompleted(s)).toBe(1);

    const raw = m25RawComponents(s, 'pending', 66_000);

    expect(raw.repeat_focused_ms).toBe(66_000 - 62_000 + 1_000);
    expect(raw.repeat_wall_ms).toBe(45_000);

    // Shift end while a loop runs: frozen by departure, loop not counted.
    m25StartLoop(s, 66_000, 'pointer', h.loops);
    m25Freeze(s, 67_000, 'route_departure', 'departure');
    expect(s.phase).toBe('done');
    expect(m25OptionalCompleted(s)).toBe(1);
    expect(s.stop_kind).toBe('departure');
    expect(m25RawComponents(s, 'route_departure', 67_000)).toMatchObject({
      optional_loops_started: 2,
      optional_repeats_completed: 1,
      stop_kind: 'departure',
      cap_reached: false,
    });

    // Review closure of an unfinished required phase.
    const r = createM25State();

    runLoop(r, 0, h.loops);
    m25Freeze(r, 5_000, 'closed_at_review', 'review');
    expect(m25Exposed(r)).toBe(false);
    expect(m25RawComponents(r, 'closed_at_review', 5_000)).toMatchObject({
      required_loops_completed: 1,
      required_complete: false,
      stop_kind: 'review',
    });
  });

  test('belief: due only when exposed AND the loops, M24 and M26 windows are recorded closed (never a score); the first response is immutable; a later press is refused', () => {
    const h = harness();
    const s = createM25State();

    expect(m25BeliefDue(s, ALL_CLOSED)).toBe(false);
    completeRequired(s, 0, h.loops);
    // Exposed, but the loops window is still open.
    expect(m25BeliefDue(s, { ...ALL_CLOSED, loopsClosed: false })).toBe(false);
    m25Stop(s, 20_000, 'pointer', h.loops);
    expect(m25BeliefDue(s, { ...ALL_CLOSED, m24Closed: false })).toBe(false);
    expect(m25BeliefDue(s, { ...ALL_CLOSED, m26Closed: false })).toBe(false);
    expect(m25BeliefDue(s, ALL_CLOSED)).toBe(true);

    // An answer before any presentation is refused.
    expect(m25AnswerBelief(s, 3, 30_000, 'keyboard', h.belief)).toBe('invalid');
    expect(m25AskBelief(s, 30_000, 20_000, h.belief)).toBe(true);
    expect(s.belief.delay_since_loops_closed_ms).toBe(10_000);
    // Presented twice (e.g. the participant came back): still one first.
    expect(m25AskBelief(s, 31_000, 20_000, h.belief)).toBe(true);
    expect(s.belief.asked_count).toBe(2);
    expect(s.belief.first_asked_at_ms).toBe(30_000);
    expect(m25AnswerBelief(s, 9, 32_000, 'keyboard', h.belief)).toBe('invalid');
    expect(m25AnswerBelief(s, 4, 32_000, 'keyboard', h.belief)).toBe(
      'answered',
    );
    expect(m25AnswerBelief(s, 1, 33_000, 'keyboard', h.belief)).toBe('invalid');
    expect(s.belief).toMatchObject({
      value: 4,
      label: 'Very normal',
      response_latency_ms: 1_000,
      asked_count: 2,
    });
    expect(m25BeliefDue(s, ALL_CLOSED)).toBe(false);

    const answered = h.events.filter(
      (e) => e.event_type === 'proto_m25_belief_question_answered',
    );

    expect(answered).toHaveLength(1);
    expect(answered[0]?.metadata).toMatchObject({
      value: 4,
      option_position: 4,
      option_count: 5,
      phase: 'belief',
    });
    // A never-exposed participant is never asked.
    const n = createM25State();

    runLoop(n, 0, h.loops);
    expect(m25BeliefDue(n, ALL_CLOSED)).toBe(false);
    expect(m25AskBelief(n, 100, null, h.belief)).toBe(true); // model-level: the adapter gates
    expect(m25BeliefDue(n, ALL_CLOSED)).toBe(false);
  });

  test('extractor: repeater with cap (2, censored) + belief 4; stopper (0, voluntary_stop) + belief 1; departure (1, route_departure); the two features never combined', () => {
    // Repeater cut by the cap, belief 4.
    const h = harness();
    const s = createM25State();

    h.presented();
    h.opened();

    const t0 = completeRequired(s, 0, h.loops);

    m25EnterOptional(s, t0, 'keyboard', h.loops);
    runLoop(s, t0 + 100, h.loops);
    runLoop(s, t0 + 4_000, h.loops);
    m25StartLoop(s, t0 + 28_000, 'pointer', h.loops);
    m25Tick(s, t0 + M25_REPEAT_CAP_MS, h.loops);
    h.closeLoops(s, 'cap', t0 + M25_REPEAT_CAP_MS);
    m25AskBelief(s, t0 + 60_000, t0 + M25_REPEAT_CAP_MS, h.belief);
    m25AnswerBelief(s, 4, t0 + 61_500, 'keyboard', h.belief);
    h.closeBelief(s, 'completed', 'completed');

    const rows = extractItemFeatures('M25', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      feature_id: 'm25_optional_repeats',
      value: 2,
      numerator: 2,
      denominator: null,
      disposition: 'observed',
      closure_reason: 'cap',
      censored: true,
      censor_reason: 'focused cap reached',
      included_ids: ['m25_optional_1', 'm25_optional_2'],
      coverage_label: 'hybrid',
      independence: 'single_episode',
    });
    expect(rows[0].components).toMatchObject({
      required_loops_completed: 3,
      optional_entered: true,
      optional_loops_started: 3,
      loop_in_progress_at_cap: true,
      stop_kind: 'cap',
      loop_focused_ms: [3_000, 3_000, 3_000, 3_000, 3_000],
    });
    expect(rows[1]).toMatchObject({
      feature_id: 'm25_normality_belief',
      value: 4,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
    });
    expect(rows[1].components).toMatchObject({
      label: 'Very normal',
      response_latency_ms: 1_500,
      delay_since_loops_closed_ms: 30_000,
      asked_count: 1,
    });
    // Independence: the count row carries no belief, the belief row no count.
    expect(rows[0].components).not.toHaveProperty('belief');
    expect(rows[1].value).toBe(4);
    expect(rows[1].numerator).toBeNull();

    // Stopper: "Finished" on the completion screen, belief 1.
    const hs = harness();
    const stopper = createM25State();

    hs.presented();
    hs.opened();

    const ts = completeRequired(stopper, 0, hs.loops);

    m25Stop(stopper, ts + 500, 'pointer', hs.loops);
    hs.closeLoops(stopper, 'voluntary_stop', ts + 500, 'stopped');
    m25AskBelief(stopper, ts + 40_000, ts + 500, hs.belief);
    m25AnswerBelief(stopper, 1, ts + 41_000, 'keyboard', hs.belief);
    hs.closeBelief(stopper, 'completed', 'completed');

    const stopperRows = extractItemFeatures('M25', hs.events, CONTEXT);

    expect(stopperRows[0]).toMatchObject({
      value: 0,
      numerator: 0,
      disposition: 'observed',
      closure_reason: 'voluntary_stop',
      censored: false,
      included_ids: [],
    });
    expect(stopperRows[0].components).toMatchObject({
      optional_entered: false,
      stop_kind: 'explicit',
    });
    expect(stopperRows[1]).toMatchObject({ value: 1, disposition: 'observed' });

    // Departure: the shift ended with one completed repeat and a loop running.
    const hd = harness();
    const dep = createM25State();

    hd.presented();
    hd.opened();

    const td = completeRequired(dep, 0, hd.loops);

    m25EnterOptional(dep, td, 'pointer', hd.loops);
    runLoop(dep, td + 100, hd.loops);
    m25StartLoop(dep, td + 5_000, 'pointer', hd.loops);
    m25Freeze(dep, td + 6_000, 'route_departure', 'departure');
    hd.closeLoops(dep, 'route_departure', td + 6_000, 'stopped');

    const depRows = extractItemFeatures('M25', hd.events, OPEN_CONTEXT);

    expect(depRows[0]).toMatchObject({
      value: 1,
      disposition: 'observed',
      closure_reason: 'route_departure',
      censored: false,
    });
    expect(depRows[0].components).toMatchObject({
      optional_loops_started: 2,
      stop_kind: 'departure',
    });
    // Exposed, loops closed, question not yet asked: pending (non-terminal).
    expect(depRows[1]).toMatchObject({ value: null, disposition: 'pending' });
    // Terminal export without the question: not presented, never a value.
    expect(extractItemFeatures('M25', hd.events, CONTEXT)[1]).toMatchObject({
      value: null,
      disposition: 'not_presented',
    });
  });

  test('extractor: loops never completed ⇒ primary null (no_eligible_event, censored) and belief null (no_eligible_event); declined ≠ not presented ≠ interrupted ≠ pending; asked-unanswered is pending then interrupted', () => {
    // Opened, one loop, shift end.
    const h = harness();
    const s = createM25State();

    h.presented();
    h.opened();
    runLoop(s, 0, h.loops);
    m25Freeze(s, 9_000, 'route_departure', 'departure');
    h.closeLoops(s, 'route_departure', 9_000, 'stopped');

    const rows = extractItemFeatures('M25', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      value: null,
      disposition: 'no_eligible_event',
      closure_reason: 'route_departure',
      censored: true,
    });
    expect(rows[0].censor_reason).toContain('never completed');
    expect(rows[0].components).toMatchObject({ required_loops_completed: 1 });
    expect(rows[1]).toMatchObject({
      value: null,
      disposition: 'no_eligible_event',
    });
    expect(rows[1].missing_reason).toContain('not exposed');

    // Presented (Noor's briefing) but never opened: declined.
    const d = harness();

    d.presented();

    const declined = extractItemFeatures('M25', d.events, CONTEXT);

    expect(declined[0]).toMatchObject({ value: null, disposition: 'declined' });
    expect(declined[1]).toMatchObject({
      value: null,
      disposition: 'no_eligible_event',
    });

    // Never presented; reload without evidence.
    expect(extractItemFeatures('M25', [], CONTEXT)[0].disposition).toBe(
      'not_presented',
    );
    expect(extractItemFeatures('M25', [], CONTEXT)[1].disposition).toBe(
      'not_presented',
    );
    expect(
      extractItemFeatures('M25', [], { ...CONTEXT, reloaded: true }).map(
        (row) => row.disposition,
      ),
    ).toEqual(['interrupted', 'interrupted']);

    // Open post, no closure: pending.
    const o = harness();

    o.presented();
    o.opened();
    expect(
      extractItemFeatures('M25', o.events, OPEN_CONTEXT).map(
        (row) => row.disposition,
      ),
    ).toEqual(['pending', 'pending']);

    // Reload guard marker in the new load: interrupted.
    const held = harness();

    held.loops('technical_failure', {
      detail: 'reload after administration: post not re-run',
      input_mode: 'system',
    });
    expect(
      extractItemFeatures('M25', held.events, {
        ...CONTEXT,
        reloaded: true,
      }).map((row) => row.disposition),
    ).toEqual(['interrupted', 'interrupted']);
    expect(m25PriorAdministration(o.events)).toBe(true);
    expect(m25PriorAdministration(d.events)).toBe(false);
    expect(m25PriorAdministration([])).toBe(false);

    // Asked but unanswered: pending while open, interrupted once closed.
    const a = harness();
    const asked = createM25State();

    a.presented();
    a.opened();

    const ta = completeRequired(asked, 0, a.loops);

    m25Stop(asked, ta, 'pointer', a.loops);
    a.closeLoops(asked, 'voluntary_stop', ta, 'stopped');
    m25AskBelief(asked, ta + 1_000, ta, a.belief);
    expect(extractItemFeatures('M25', a.events, OPEN_CONTEXT)[1]).toMatchObject(
      { value: null, disposition: 'pending' },
    );
    a.closeBelief(asked, 'closed_at_review', 'closed_at_review');

    const closedRows = extractItemFeatures('M25', a.events, CONTEXT);

    expect(closedRows[0]).toMatchObject({ value: 0, disposition: 'observed' });
    expect(closedRows[1]).toMatchObject({
      value: null,
      disposition: 'interrupted',
      censored: true,
    });
  });

  test('review U4 fixes: the completion-screen settle window refuses a carried press; a question press inside the settle window is refused and re-presented; a loop counts only when its whole cycle fits inside the cap; a snapshot that disagrees with the loop events is a technical failure', () => {
    // Settle window on the completion screen (a carried ENTER / R / C / F
    // from the third loop can never enter the optional phase or stop).
    const h = harness();
    const s = createM25State();
    const shown = completeRequired(s, 0, h.loops) - 500; // completion time

    expect(m25EnterOptional(s, shown + 100, 'keyboard', h.loops)).toBe(false);
    expect(m25Stop(s, shown + 200, 'keyboard', h.loops)).toBe(false);
    expect(s.phase).toBe('complete_marked');
    expect(
      h.events
        .filter((e) => e.event_type === 'proto_m25_loops_press_refused')
        .map((e) => e.metadata?.control),
    ).toEqual(['more_loops', 'finished']);
    expect(
      m25EnterOptional(s, shown + M25_SETTLE_MS, 'keyboard', h.loops),
    ).toBe(true);

    // Cap-fit rule: a loop started at 27.0 s of the window completes at
    // exactly 30.0 s → counts even when the tick fires late (30.2 s); one
    // started at 27.1 s cannot fit → not a repeat, flagged.
    const t0 = shown + M25_SETTLE_MS;

    expect(m25StartLoop(s, t0 + 27_000, 'pointer', h.loops)).toBe(true);
    expect(m25Tick(s, t0 + 30_200, h.loops)).toBe('cap');
    expect(m25OptionalCompleted(s)).toBe(1);
    expect(s.loop_in_progress_at_cap).toBe(false);

    const hl = harness();
    const late = createM25State();
    const tl = completeRequired(late, 0, hl.loops);

    m25EnterOptional(late, tl, 'pointer', hl.loops);
    expect(m25StartLoop(late, tl + 27_100, 'pointer', hl.loops)).toBe(true);
    expect(m25Tick(late, tl + 30_200, hl.loops)).toBe('cap');
    expect(m25OptionalCompleted(late)).toBe(0);
    expect(late.loop_in_progress_at_cap).toBe(true);

    // Question settle window: a press 150 ms after the presentation is
    // refused (logged with its position), the question is presented again
    // and a read response 1 s later is the recorded answer; the latency
    // counts from the LAST presentation.
    const hb = harness();
    const b = createM25State();
    const tb = completeRequired(b, 0, hb.loops);

    m25Stop(b, tb, 'pointer', hb.loops);
    expect(m25AskBelief(b, 50_000, tb, hb.belief)).toBe(true);
    expect(m25AnswerBelief(b, 1, 50_150, 'keyboard', hb.belief)).toBe(
      'refused',
    );
    expect(b.belief.value).toBeNull();
    expect(b.belief.refused_presses).toBe(1);
    expect(m25AskBelief(b, 50_160, tb, hb.belief)).toBe(true);
    expect(m25AnswerBelief(b, 3, 51_160, 'keyboard', hb.belief)).toBe(
      'answered',
    );
    expect(b.belief).toMatchObject({
      value: 3,
      response_latency_ms: 1_000,
      asked_count: 2,
      refused_presses: 1,
    });
    expect(
      hb.events.find(
        (e) => e.event_type === 'proto_m25_belief_question_press_refused',
      )?.metadata,
    ).toMatchObject({ option_position: 1, since_presented_ms: 150 });
    expect(
      hb.events.find(
        (e) => e.event_type === 'proto_m25_belief_question_answered',
      )?.metadata,
    ).toMatchObject({
      value: 3,
      refused_presses: 1,
      focus_default_position: 1,
    });

    // Recount cross-check: the extractor recounts optional loop_completed
    // events; a disagreeing snapshot is a technical failure, never a value.
    const hr = harness();
    const r = createM25State();

    hr.presented();
    hr.opened();

    const tr = completeRequired(r, 0, hr.loops);

    m25EnterOptional(r, tr, 'pointer', hr.loops);
    runLoop(r, tr + 100, hr.loops);
    m25Stop(r, tr + 5_000, 'pointer', hr.loops);

    const good = extractItemFeatures(
      'M25',
      [
        ...hr.events,
        {
          session_id: 's',
          timestamp_ms: 0,
          scene: 'exterior_recovery_yard',
          event_type: 'proto_m25_loops_window_closed',
          sequence: hr.events.length + 1,
          page_load_index: 1,
          metadata: {
            exit_state: 'stopped',
            raw_components: m25RawComponents(r, 'voluntary_stop', tr + 5_000),
          },
        },
      ],
      CONTEXT,
    );

    expect(good[0]).toMatchObject({ value: 1, disposition: 'observed' });
    expect(good[0].components).toMatchObject({
      optional_completed_recount: 1,
      recount_agrees: true,
    });

    const tampered = {
      ...m25RawComponents(r, 'voluntary_stop', tr + 5_000),
      optional_repeats_completed: 2,
    };
    const bad = extractItemFeatures(
      'M25',
      [
        ...hr.events,
        {
          session_id: 's',
          timestamp_ms: 0,
          scene: 'exterior_recovery_yard',
          event_type: 'proto_m25_loops_window_closed',
          sequence: hr.events.length + 1,
          page_load_index: 1,
          metadata: { exit_state: 'stopped', raw_components: tampered },
        },
      ],
      CONTEXT,
    );

    expect(bad[0]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });
    expect(bad[0].components).toMatchObject({ recount_agrees: false });
  });
});
