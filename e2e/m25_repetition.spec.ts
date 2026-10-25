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
import { expect, type Page, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import {
  classifyM25Reload,
  M25_RELOAD_OCCASIONS,
  m25PriorLoadCheck,
} from '../src/measurement/features/m25';
import { resetFocusMonitor } from '../src/measurement/focusMonitor';
import {
  M25_NORMALITY_OPTIONS,
  M25_NORMALITY_PROMPT,
} from '../src/measurement/protocol';
import { registerEntry } from '../src/measurement/registerV3';
import {
  classifyReload,
  computePriorLoadCheck,
  RELOAD_HOLD_BACK_PREFIX,
  type ReloadEvent,
} from '../src/measurement/reloadCheck';
import {
  createM25State,
  M25_DELAY_NOT_COMPARABLE,
  M25_DELAY_NOT_RECORDED,
  M25_LOOP_MS,
  M25_REPEAT_CAP_MS,
  M25_REQUIRED_LOOPS,
  M25_SETTLE_MS,
  m25AnswerBelief,
  m25AskBelief,
  m25BeliefDue,
  m25BeliefRawComponents,
  m25CrossLoadExposureFrom,
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
import { M09_OFFER_LABELS } from '../src/pilot/windows/m09WatchModel';
import { M10_OFFER_LABELS } from '../src/pilot/windows/m10DeliveryModel';
import type { RawGameEvent } from '../src/systems/EventLogger';
import {
  APPROACH,
  ensureOutsideCompound,
  enterCompound,
  lastFeedback,
  leaveYard,
  powerUpUplink,
  startSalvageTally,
  YARD,
} from './exteriorHelpers';
import { press, selectPromptOption } from './helpers';
import { terminalProbe, waitTerminalOpen } from './ipHelpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  briefToSelector,
  openStakeSurface,
  stepAway,
  waitView,
} from './m23Helpers';
import {
  bootPilot,
  concourseToWorkshop,
  dockToConcourse,
  expectStage,
  interactAt,
  labApproach,
  openPromptAt,
  PILOT,
  pilotProbe,
  promptLabels,
  selectPromptLabel,
  useDoor,
  workshopToConcourse,
  yardVia,
} from './pilotHelpers';
import {
  acknowledgeQuestionnaireNotice,
  clickElement,
  openHandoverDesk,
  openWorkshopSurface,
  repairRelay,
  surface,
  waitSurface,
} from './returnHelpers';
import {
  boardFirstCard,
  concourseToLab,
  countType,
  openKai,
  openNoor,
  openVale,
  reloadToDock,
  reportDesk,
  waitType,
} from './u24Helpers';

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

/* ------------------------------------------------------------------ *
 * U24 RL-3 — the one M25 reload check: loops, belief, probe (pure)
 *
 * Expected values come from RELOAD-CORRECTION-SPEC-r3-exec.md §2 (classes,
 * permission), §6 (cases 1–4, owner decision D-3 = P and the clock rule)
 * and §8 (F-A to F-C, F-F), and r1 §1 / §3's stage map and fields (loops
 * stage 1 `presented`, stage 3 `opportunity_opened`; belief display =
 * administration; probe `presented` / `opportunity_opened`; D-4's
 * `prior_required_complete`, `prior_belief_displayed`,
 * `prior_belief_answered`). Records come from RL-0's helper with that map
 * written here, independently of the extractor's own map.
 * ------------------------------------------------------------------ */

const RL3_CONTINUOUS = {
  first_sequence: 1,
  sequence_gap_count: 0,
  sequence_duplicate_count: 0,
  recovered_from_chunks: false,
};
const RL3_GAP = { ...RL3_CONTINUOUS, sequence_gap_count: 1 };
const RL3_T0 = 1_792_000_000_000;
const is = (type: string) => (event: ReloadEvent) => event.event_type === type;
const displayed = (event: ReloadEvent) =>
  event.event_type === 'proto_m25_belief_question_presented' ||
  event.event_type === 'proto_m25_belief_presented' ||
  event.event_type === 'proto_m25_belief_opportunity_opened';
const RL3_STAGES = {
  loops: {
    briefing: is('proto_m25_loops_presented'),
    opening: is('proto_m25_loops_opportunity_opened'),
    holdBack: is('proto_m25_loops_technical_failure'),
    evidence: {
      prior_required_complete: (event: ReloadEvent) =>
        event.event_type === 'proto_m25_loops_required_complete' &&
        event.metadata?.completion_marked === true,
    },
  },
  belief: {
    presentation: (event: ReloadEvent) =>
      event.event_type === 'proto_m25_belief_question_presented' ||
      event.event_type === 'proto_m25_belief_presented',
    opening: displayed,
    holdBack: is('proto_m25_belief_technical_failure'),
    evidence: {
      prior_belief_displayed: displayed,
      prior_belief_answered: is('proto_m25_belief_question_answered'),
    },
  },
  probe: {
    briefing: is('proto_m25_probe_presented'),
    opening: is('proto_m25_probe_opportunity_opened'),
    holdBack: is('proto_m25_probe_technical_failure'),
  },
};
const RL3_LOOPS_DETAIL = {
  H: 'reload after administration: post not re-run',
  U: `${RELOAD_HOLD_BACK_PREFIX.U}: post not administered`,
  M: `${RELOAD_HOLD_BACK_PREFIX.M}: post not administered`,
} as const;
const RL3_BELIEF_DETAIL = {
  H: `${RELOAD_HOLD_BACK_PREFIX.H}: question not asked again`,
  U: `${RELOAD_HOLD_BACK_PREFIX.U}: question not administered`,
  M: `${RELOAD_HOLD_BACK_PREFIX.M}: question not administered`,
} as const;

/** Events renumbered into one page load, one second apart from `t0`. */
function rl3Number(
  events: readonly RawGameEvent[],
  load: number,
  from: number,
  t0: number,
): RawGameEvent[] {
  return events.map((event, i) => ({
    ...event,
    page_load_index: load,
    sequence: from + i,
    timestamp_ms: t0 + i * 1_000,
  }));
}

type Rl3Earlier =
  | 'nothing'
  | 'briefed'
  | 'exposed_open'
  | 'exposed_closed'
  | 'displayed'
  | 'answered';

/**
 * One earlier page load: the briefing, the post (three required loops, the
 * completion screen; "Finished" closes the window), the question displayed
 * and possibly answered at Vale's check-in.
 */
function rl3Prior(load: number, from: number, what: Rl3Earlier) {
  const h = harness();

  h.events.push({
    session_id: 's',
    timestamp_ms: 0,
    scene: 'dock',
    event_type: 'session_start',
    metadata: {},
  });

  if (what !== 'nothing') {
    h.presented();
  }

  if (what !== 'nothing' && what !== 'briefed') {
    const s = createM25State();

    h.opened();

    const t = completeRequired(s, 1_000, h.loops);

    if (what !== 'exposed_open') {
      expect(m25Stop(s, t + 1_000, 'pointer', h.loops)).toBe(true);
      h.closeLoops(s, 'voluntary_stop', t + 1_000, 'stopped');
    }

    if (what === 'displayed' || what === 'answered') {
      expect(m25AskBelief(s, t + 50_000, t + 1_000, h.belief)).toBe(true);

      if (what === 'answered') {
        expect(m25AnswerBelief(s, 2, t + 60_000, 'keyboard', h.belief)).toBe(
          'answered',
        );
      }
    }
  }

  return rl3Number(h.events, load, from, RL3_T0 + load * 10_000_000);
}

function rl3Record(
  pageLoadIndex: number,
  prior: readonly RawGameEvent[],
  integrity = RL3_CONTINUOUS,
) {
  return computePriorLoadCheck({
    pageLoadIndex,
    priorLoadEvents: prior,
    integrity,
    occasions: RL3_STAGES,
  }) as unknown as Record<string, unknown>;
}

const rl3Permit = (reload: ReturnType<typeof classifyReload>) =>
  M25_RELOAD_OCCASIONS.map((id) => [
    id,
    reload.occasions[id].class,
    reload.occasions[id].administration_permitted,
  ]);

/**
 * A reloaded load as the runtime writes it: the one record (or `records`),
 * the briefing, the post held when not A (its marker), the question held
 * when not A (its marker) — then `after` adds this load's own events.
 */
function rl3Load(
  prior: RawGameEvent[],
  options: {
    integrity?: typeof RL3_CONTINUOUS;
    pageLoadIndex?: number;
    records?: (record: Record<string, unknown>) => object[];
    after?: (h: ReturnType<typeof harness>) => void;
    finalCoreClosed?: boolean;
  } = {},
) {
  const pageLoadIndex = options.pageLoadIndex ?? 2;
  const record = rl3Record(pageLoadIndex, prior, options.integrity);
  const records = options.records?.(record) ?? [record];
  const reload = classifyReload({
    pageLoadIndex,
    checks: records,
    occasions: M25_RELOAD_OCCASIONS,
  });
  const h = harness();

  for (const r of records) {
    h.loops('prior_load_checked', { ...r, input_mode: 'system' });
  }

  h.presented();

  const loops = reload.occasions.loops.class;
  const belief = reload.occasions.belief.class;

  if (loops !== 'A') {
    h.loops('technical_failure', { detail: RL3_LOOPS_DETAIL[loops ?? 'U'] });
  }

  if (belief !== 'A') {
    h.belief('technical_failure', {
      detail: RL3_BELIEF_DETAIL[belief ?? 'U'],
    });
  }

  options.after?.(h);

  const from = (prior.at(-1)?.sequence ?? 0) + 1;
  const current = rl3Number(
    h.events,
    pageLoadIndex,
    from,
    RL3_T0 + pageLoadIndex * 10_000_000,
  );
  const rows = extractItemFeatures('M25', [...prior, ...current], {
    finalCoreClosed: options.finalCoreClosed ?? true,
    pageLoadIndex,
    reloaded: true,
  });

  return { record, reload, primary: rows[0], belief: rows[1], current };
}

const NEVER_SAID = /0 required loops|not exposed/;

test.describe('M25 the one reload check: loops, belief and probe (U24 RL-3, pure)', () => {
  test('the extractor’s stage map is r1’s with D-4’s fields (the same record for every history); a first load writes none; the same classes', () => {
    for (const what of [
      'nothing',
      'briefed',
      'exposed_open',
      'exposed_closed',
      'displayed',
      'answered',
    ] as const) {
      const prior = rl3Prior(1, 1, what);

      expect(m25PriorLoadCheck(2, prior, RL3_CONTINUOUS)).toEqual(
        rl3Record(2, prior),
      );
      expect(classifyM25Reload(2, [rl3Record(2, prior)])).toEqual(
        classifyReload({
          pageLoadIndex: 2,
          checks: [rl3Record(2, prior)],
          occasions: M25_RELOAD_OCCASIONS,
        }),
      );
    }

    expect(m25PriorLoadCheck(1, [], RL3_CONTINUOUS)).toBeNull();

    const answered = rl3Record(2, rl3Prior(1, 1, 'answered')) as {
      occasions: Record<string, { evidence?: Record<string, boolean> }>;
    };

    expect(answered.occasions.loops.evidence).toEqual({
      prior_required_complete: true,
    });
    expect(answered.occasions.belief.evidence).toEqual({
      prior_belief_displayed: true,
      prior_belief_answered: true,
    });
  });

  test('case 1 (displayed earlier, unanswered): not asked again — the belief occasion is H and refused; the companion is interrupted · null; no text says "0 required loops" or "not exposed"', () => {
    const c1 = rl3Load(rl3Prior(1, 1, 'displayed'));

    expect(rl3Permit(c1.reload)).toEqual([
      ['loops', 'H', false],
      ['belief', 'H', false],
      ['probe', 'A', true],
    ]);
    expect(c1.primary).toMatchObject({
      disposition: 'interrupted',
      value: null,
      missing_reason:
        'post administered in an earlier page load; not re-run after the reload',
    });
    expect(c1.belief).toMatchObject({
      disposition: 'interrupted',
      value: null,
      missing_reason:
        'normality question displayed in an earlier page load; not asked again after the reload',
    });
    expect(JSON.stringify([c1.primary, c1.belief])).not.toMatch(NEVER_SAID);
    expect(
      c1.current.filter(
        (event) => event.event_type === 'proto_m25_belief_question_presented',
      ),
    ).toEqual([]);
  });

  test('case 2 (displayed and answered earlier): not asked again; interrupted · null; the earlier answer stays in the earlier load, never copied', () => {
    const prior = rl3Prior(1, 1, 'answered');
    const c2 = rl3Load(prior);

    expect(rl3Permit(c2.reload)[1]).toEqual(['belief', 'H', false]);
    expect(c2.belief).toMatchObject({
      disposition: 'interrupted',
      value: null,
      missing_reason:
        'normality question answered in an earlier page load; not asked again after the reload',
    });
    expect(
      prior.filter(
        (event) => event.event_type === 'proto_m25_belief_question_answered',
      ),
    ).toHaveLength(1);
    expect(JSON.stringify(c2.belief)).not.toMatch(NEVER_SAID);
  });

  test('case 3 (D-3 = P): loops completed earlier, the question never displayed — the check establishes both, the belief is A and permitted; its first display records exposure_page_load_index and the delay from the earlier closure; the companion takes the first-load readings (pending, then never asked at the review — never "not exposed")', () => {
    const prior = rl3Prior(1, 1, 'exposed_closed');
    const closedAt = prior.find(
      (event) => event.event_type === 'proto_m25_loops_window_closed',
    )!.timestamp_ms;

    expect(rl3Permit(classifyM25Reload(2, [rl3Record(2, prior)]))).toEqual([
      ['loops', 'H', false],
      ['belief', 'A', true],
      ['probe', 'A', true],
    ]);

    const now = RL3_T0 + 20_000_000 + 30_000;
    const exposure = m25CrossLoadExposureFrom(prior, now);

    expect(exposure).toEqual({
      exposure_page_load_index: 1,
      loops_closed_at_ms: closedAt,
      delay_null_reason: null,
    });

    const c3 = rl3Load(prior, {
      after: (h) => {
        const s = createM25State();

        expect(m25BeliefDue(s, ALL_CLOSED, true)).toBe(true);
        expect(m25AskBelief(s, now, null, h.belief, exposure)).toBe(true);
        expect(m25AnswerBelief(s, 4, now + 5_000, 'keyboard', h.belief)).toBe(
          'answered',
        );
      },
    });
    const asked = c3.current.find(
      (event) => event.event_type === 'proto_m25_belief_question_presented',
    )!;

    expect(asked.metadata).toMatchObject({
      exposure_page_load_index: 1,
      delay_since_loops_closed_ms: now - (closedAt as number),
      delay_since_loops_closed_null_reason: null,
    });
    expect(c3.belief).toMatchObject({
      disposition: 'observed',
      value: 4,
      components: {
        exposure_page_load_index: 1,
        delay_since_loops_closed_ms: now - (closedAt as number),
        delay_since_loops_closed_null_reason: null,
      },
    });
    expect(c3.primary.disposition).toBe('interrupted');

    // Before its display: pending while the route runs; never asked by the
    // review ⇒ the first-load reading of an exposed participant.
    expect(rl3Load(prior, { finalCoreClosed: false }).belief).toMatchObject({
      disposition: 'pending',
      missing_reason: 'normality question not yet asked',
    });

    const review = rl3Load(prior);

    expect(review.belief).toMatchObject({
      disposition: 'not_presented',
      missing_reason: 'normality question never asked before the review',
    });
    expect(JSON.stringify([review.primary, review.belief])).not.toMatch(
      NEVER_SAID,
    );
  });

  test('case 4 (uncertain or contradictory): not asked; the companion interrupted · null with the unverified / contradictory reason', () => {
    const prior = rl3Prior(1, 1, 'exposed_closed');
    const u = rl3Load(prior, { integrity: RL3_GAP });

    // The earlier opening of the post is found, so the post stays H beside
    // the discontinuous history (RL-0's precedence, register §5.404 reading
    // (a)); the question and the notice, with nothing found, are U.
    expect(rl3Permit(u.reload)).toEqual([
      ['loops', 'H', false],
      ['belief', 'U', false],
      ['probe', 'U', false],
    ]);
    expect(u.reload.history_level_uncertain).toBe(true);
    expect(u.belief).toMatchObject({
      disposition: 'interrupted',
      value: null,
      missing_reason:
        'normality question not asked after a reload: earlier history not verified',
    });
    expect(JSON.stringify(u.belief)).not.toMatch(NEVER_SAID);

    // A post never opened, beside the same discontinuity: U, never
    // administered.
    const briefed = rl3Load(rl3Prior(1, 1, 'briefed'), { integrity: RL3_GAP });

    expect(rl3Permit(briefed.reload)[0]).toEqual(['loops', 'U', false]);
    expect(briefed.primary.missing_reason).toBe(
      'post not administered after a reload: earlier history not verified',
    );

    const m = rl3Load(prior, {
      records: (record) => [{ ...record, prior_opening_found: false }],
    });

    expect(m.reload.check_coherent).toBe(false);
    expect(rl3Permit(m.reload)[1]).toEqual(['belief', 'M', false]);
    expect(m.belief.missing_reason).toBe(
      'normality question not asked after a reload: earlier check contradictory',
    );
  });

  test('F-F: comparable clocks give the delay computed from the earlier closure; a closure time not comparable with this load’s clock gives null with the reason; no earlier closure gives null with its reason — never zero, never the reload-freeze time; a same-load display carries neither new field', () => {
    const prior = rl3Prior(1, 1, 'exposed_closed');
    const closedAt = prior.find(
      (event) => event.event_type === 'proto_m25_loops_window_closed',
    )!.timestamp_ms as number;
    const now = closedAt + 600_000;
    const comparable = m25CrossLoadExposureFrom(prior, now)!;

    expect(comparable).toEqual({
      exposure_page_load_index: 1,
      loops_closed_at_ms: closedAt,
      delay_null_reason: null,
    });

    const a = harness();
    const sa = createM25State();

    m25AskBelief(sa, now, 12_345, a.belief, comparable);
    expect(sa.belief.delay_since_loops_closed_ms).toBe(600_000);
    expect(sa.belief.loops_closed_at_ms).toBe(closedAt);

    // A closure stamped by a clock that is not this load's (later than now,
    // or not an epoch number) is not comparable. U24 completion (the owner's
    // RL-3 closeout decision 2): NaN, both infinities and a future timestamp
    // are each proved here; every null keeps `exposure_page_load_index` (the
    // established exposure is never erased by missing delay evidence).
    for (const stamp of [
      now + 1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      'later',
    ]) {
      const skewed = prior.map((event) =>
        event.event_type === 'proto_m25_loops_window_closed'
          ? { ...event, timestamp_ms: stamp as number }
          : event,
      );
      const result = m25CrossLoadExposureFrom(skewed, now)!;

      expect(result).toEqual({
        exposure_page_load_index: 1,
        loops_closed_at_ms: null,
        delay_null_reason: M25_DELAY_NOT_COMPARABLE,
      });
      expect(M25_DELAY_NOT_COMPARABLE).toBe(
        "earlier closure time not comparable with this load's clock",
      );

      const b = harness();
      const sb = createM25State();

      // The reload-freeze time passed beside it is never used.
      m25AskBelief(sb, now, now - 5, b.belief, result);
      expect(sb.belief.delay_since_loops_closed_ms).toBeNull();
      expect(b.events[0].metadata).toMatchObject({
        exposure_page_load_index: 1,
        delay_since_loops_closed_ms: null,
        delay_since_loops_closed_null_reason: M25_DELAY_NOT_COMPARABLE,
      });
    }

    // The reload fell while the post was still open: no earlier closure.
    expect(
      m25CrossLoadExposureFrom(rl3Prior(1, 1, 'exposed_open'), now),
    ).toEqual({
      exposure_page_load_index: 1,
      loops_closed_at_ms: null,
      delay_null_reason: M25_DELAY_NOT_RECORDED,
    });
    // No earlier exposure: no cross-load display at all.
    expect(m25CrossLoadExposureFrom(rl3Prior(1, 1, 'briefed'), now)).toBeNull();

    // A same-load display is unchanged.
    const c = harness();
    const sc = createM25State();

    m25AskBelief(sc, 50_000, 20_000, c.belief);
    expect(sc.belief.delay_since_loops_closed_ms).toBe(30_000);
    expect(c.events[0].metadata).not.toHaveProperty('exposure_page_load_index');
    expect(c.events[0].metadata).not.toHaveProperty(
      'delay_since_loops_closed_null_reason',
    );
    // The earlier-load exposure makes the question due only with the
    // existing closure condition.
    expect(
      m25BeliefDue(
        createM25State(),
        { loopsClosed: true, m24Closed: false, m26Closed: true },
        true,
      ),
    ).toBe(false);
    expect(m25BeliefDue(createM25State(), ALL_CLOSED)).toBe(false);
  });

  test('the post: A takes the first-load readings (declined when briefed, not_presented when nothing); H holds it; RL-1C decision A — briefed in a reloaded load without its check ⇒ U and held; a malformed record ⇒ technical failure on both rows', () => {
    const none = rl3Prior(1, 1, 'nothing');
    const declined = rl3Load(none);

    expect(rl3Permit(declined.reload)[0]).toEqual(['loops', 'A', true]);
    expect(declined.primary).toMatchObject({
      disposition: 'declined',
      value: null,
    });

    // The record alone (no briefing in the load): NOP (A).
    const check = rl3Record(2, none);
    const nop = extractItemFeatures(
      'M25',
      [
        ...none,
        ...rl3Number(
          [
            {
              session_id: 's',
              timestamp_ms: 0,
              scene: 'exterior_recovery_yard',
              event_type: 'proto_m25_loops_prior_load_checked',
              metadata: { ...check },
            },
          ],
          2,
          none.length + 1,
          RL3_T0 + 20_000_000,
        ),
      ],
      { finalCoreClosed: true, pageLoadIndex: 2, reloaded: true },
    );

    expect(nop[0]).toMatchObject({
      disposition: 'not_presented',
      missing_reason: 'field sensor post never opened',
    });

    const briefedOnly = rl3Number(
      [
        {
          session_id: 's',
          timestamp_ms: 0,
          scene: 'exterior_recovery_yard',
          event_type: 'proto_m25_loops_presented',
          metadata: { input_mode: 'system' },
        },
      ],
      2,
      none.length + 1,
      RL3_T0 + 20_000_000,
    );

    expect(
      extractItemFeatures('M25', [...none, ...briefedOnly], {
        finalCoreClosed: true,
        pageLoadIndex: 2,
        reloaded: true,
      })[0],
    ).toMatchObject({
      disposition: 'interrupted',
      missing_reason:
        'post not administered after a reload: earlier history not verified',
    });

    const malformed = rl3Load(none, {
      records: (record) => [{ ...record, page_load_index: 5 }],
    });

    expect(malformed.primary.disposition).toBe('technical_failure');
    expect(malformed.belief.disposition).toBe('technical_failure');
  });

  test('F-A: two agreeing records ⇒ every occasion U, refused; F-B: conflicting records ⇒ U, coherence false; F-C: an earlier U hold of the question, then a continuous history ⇒ the question stays U and is not asked', () => {
    const prior = rl3Prior(1, 1, 'exposed_closed');
    const fa = rl3Load(prior, { records: (record) => [record, { ...record }] });

    expect(fa.reload.check_coherent).toBe(true);
    expect(rl3Permit(fa.reload)).toEqual([
      ['loops', 'U', false],
      ['belief', 'U', false],
      ['probe', 'U', false],
    ]);
    expect(fa.belief.disposition).toBe('interrupted');

    const fb = rl3Load(prior, {
      records: (record) => [record, { ...record, history_continuous: false }],
    });

    expect(fb.reload.check_coherent).toBe(false);
    expect(rl3Permit(fb.reload)[1]).toEqual(['belief', 'U', false]);

    // Load 2 held the question as U; load 3's history is continuous.
    const load2 = rl3Number(
      [
        {
          session_id: 's',
          timestamp_ms: 0,
          scene: 'station_concourse',
          event_type: 'proto_m25_belief_technical_failure',
          metadata: { detail: RL3_BELIEF_DETAIL.U },
        },
      ],
      2,
      prior.length + 1,
      RL3_T0 + 20_000_000,
    );
    const fc = rl3Load([...prior, ...load2], { pageLoadIndex: 3 });

    expect(fc.record.history_continuous).toBe(true);
    expect(rl3Permit(fc.reload)).toEqual([
      ['loops', 'H', false],
      ['belief', 'U', false],
      ['probe', 'A', true],
    ]);
    expect(fc.belief.missing_reason).toBe(
      'normality question not asked after a reload: earlier history not verified',
    );
  });

  test('the record is never task evidence: absent from the supporting sequences; the probe occasion is H once the notice was opened earlier', () => {
    const c1 = rl3Load(rl3Prior(1, 1, 'displayed'));
    const check = c1.current.find(
      (event) => event.event_type === 'proto_m25_loops_prior_load_checked',
    )!;

    expect(c1.primary.supporting_sequences).not.toContain(check.sequence);

    const notice = rl3Number(
      [
        {
          session_id: 's',
          timestamp_ms: 0,
          scene: 'records_workshop',
          event_type: 'proto_m25_probe_presented',
          metadata: {},
        },
        {
          session_id: 's',
          timestamp_ms: 0,
          scene: 'records_workshop',
          event_type: 'proto_m25_probe_opportunity_opened',
          metadata: {},
        },
      ],
      1,
      1,
      RL3_T0,
    );

    expect(rl3Permit(classifyM25Reload(2, [rl3Record(2, notice)]))[2]).toEqual([
      'probe',
      'H',
      false,
    ]);
  });
});

/* ================================================================== *
 * U24 RL-3 — the seven rows after a genuine reload (browser)
 *
 * Ordinary input, genuine `page.reload()`, 800 × 600, traces on in the
 * evidence runs. R1 / R2 / R4 per row (M17, M21, M22, M23, M24, M25, M26),
 * R5 (M25 cases 2, 3 and 4; case 1 is S3's reload with the question open,
 * asserted in `u24_export_recovery.spec.ts`), R6 (the H and U screens of
 * M17, M21, M22, M24, M26, M23 and M25). Expected strings and readings
 * come from RELOAD-CORRECTION-SPEC-r3-exec.md §2, §6 and §9.
 * ================================================================== */

type Rl3bRow = 'M17' | 'M21' | 'M22' | 'M23' | 'M24' | 'M25' | 'M26';

const RL3B_ROWS: readonly Rl3bRow[] = [
  'M17',
  'M21',
  'M22',
  'M23',
  'M24',
  'M25',
  'M26',
];
const RL3B_FAMILY: Record<Rl3bRow, string> = {
  M17: 'proto_m17_trials_',
  M21: 'proto_m21_case_',
  M22: 'proto_m22_returned_',
  M23: 'proto_m23_plots_',
  M24: 'proto_m24_rig_',
  M25: 'proto_m25_loops_',
  M26: 'proto_m26_uplink_',
};
/** The families whose records a row's holds and openings are. */
const RL3B_OWNED: Record<Rl3bRow, readonly string[]> = {
  M17: ['proto_m17_trials_'],
  M21: ['proto_m21_case_'],
  M22: ['proto_m22_returned_'],
  M23: ['proto_m23_plots_'],
  M24: ['proto_m24_rig_'],
  M25: ['proto_m25_loops_', 'proto_m25_belief_', 'proto_m25_probe_'],
  M26: ['proto_m26_uplink_'],
};
/** Stage-3 records (an administration) per family. */
const RL3B_OPENING: Record<string, readonly string[]> = {
  proto_m17_trials_: ['window_opened'],
  proto_m21_case_: ['opportunity_opened'],
  proto_m22_returned_: ['opportunity_opened'],
  proto_m23_plots_: ['opportunity_opened'],
  proto_m24_rig_: ['opportunity_opened'],
  proto_m25_loops_: ['opportunity_opened'],
  proto_m25_belief_: ['question_presented', 'opportunity_opened'],
  proto_m25_probe_: ['opportunity_opened'],
  proto_m26_uplink_: ['opportunity_opened'],
};
const RL3B_OPPORTUNITIES = [
  'proto_m17_criterion',
  'proto_m21_case_o1',
  'proto_m21_case_o2',
  'proto_m22_returned_o1',
  'proto_m22_returned_o2',
  'proto_m23_excavation_series',
  'proto_m24_rig_continuation',
  'proto_m25_calibration_loops',
  'proto_m25_normality_belief',
  'proto_m25_belief_probe',
  'proto_m26_uplink_continuation',
] as const;
/** r3 §9 (D-5): the new H lines and the U / M lines, per ⟨station⟩. */
const rl3bH = (station: string) => [
  `This ${station} was opened earlier in this session.`,
  'It stays closed after a reload.',
];
const rl3bU = (station: string) => [
  `The earlier state of this ${station} could not be verified.`,
  'It stays closed after this reload.',
];
/** The existing texts r3 §9 keeps unchanged (M23, M25 loops). */
const RL3B_M23_LOCK =
  'This excavation was opened before the page reloaded. It cannot be restarted in this session. You can continue through the station.';
const RL3B_M25_HELD =
  'This post was already used earlier in this session. Its record is held; it does not run again.';
/** Every offer of the route declined (the route's own beats). */
const RL3B_CARDS = [
  'Handover confirmed — what is next?',
  M09_OFFER_LABELS.decline,
  M10_OFFER_LABELS.d1.decline,
  'No — leave the lamp job.',
  'No — leave the flag job.',
  'Understood — no need for the probe.',
  'Ready — no need for the driver.',
  'Heading to the workshop.',
  'Understood.',
  'Ready.',
] as const;

interface Rl3bEvent {
  event_type: string;
  sequence?: number;
  page_load_index?: number;
  timestamp_ms?: number;
  metadata?: Record<string, unknown>;
}

interface Rl3bEnvelope {
  page_load_index: number;
  raw_events: Rl3bEvent[];
  prior_page_load_events: Rl3bEvent[];
  event_integrity: Record<string, unknown>;
  measurement_validity: unknown;
  measurement_features: {
    feature_id: string;
    disposition: string;
    value: unknown;
    missing_reason?: string | null;
    components?: Record<string, unknown>;
  }[];
}

/** The runtime's own export builder read in the page (a harness read). */
async function rl3bPayload(page: Page): Promise<Rl3bEnvelope> {
  const json = await page.evaluate(`(async () => {
    const mod = await import('/src/systems/index.ts');
    return JSON.stringify(mod.researchRuntime.buildExportPayload());
  })()`);

  return JSON.parse(json as string) as Rl3bEnvelope;
}

/** The validity record of one opportunity, wherever the export nests it. */
function rl3bValidity(
  envelope: Rl3bEnvelope,
  opportunityId: string,
): Record<string, unknown> | null {
  const seen: unknown[] = [envelope.measurement_validity];

  while (seen.length > 0) {
    const value = seen.pop();

    if (Array.isArray(value)) {
      seen.push(...value);
    } else if (typeof value === 'object' && value !== null) {
      const record = value as Record<string, unknown>;

      if (record.opportunity_id === opportunityId) {
        return record;
      }

      seen.push(...Object.values(record));
    }
  }

  return null;
}

const rl3bChecks = (events: readonly Rl3bEvent[], row: Rl3bRow) =>
  events.filter(
    (event) => event.event_type === `${RL3B_FAMILY[row]}prior_load_checked`,
  );
const rl3bOf = (events: readonly Rl3bEvent[], family: string, suffix: string) =>
  events.filter((event) => event.event_type === `${family}${suffix}`);
const rl3bFeature = (envelope: Rl3bEnvelope, id: string) =>
  envelope.measurement_features.find((feature) => feature.feature_id === id);

/**
 * R1 / R3: the row's ONE check of this load comes before each of its
 * markers; every marker carries `detail`'s class prefix; nothing of the row
 * is administered in this load. Returns the check's payload.
 */
function rl3bExpectHeld(
  events: readonly Rl3bEvent[],
  row: Rl3bRow,
  prefix: string,
  markers: number,
): Record<string, unknown> {
  const checks = rl3bChecks(events, row);

  expect(checks, `${row}: one check in this load`).toHaveLength(1);

  const held = RL3B_OWNED[row].flatMap((family) =>
    rl3bOf(events, family, 'technical_failure').filter((event) =>
      String(event.metadata?.detail ?? '').startsWith('reload'),
    ),
  );

  expect(held.length, `${row}: its markers`).toBe(markers);

  for (const marker of held) {
    expect(String(marker.metadata?.detail), `${row} marker`).toMatch(
      new RegExp(`^${prefix}`),
    );
    expect(marker.sequence ?? 0, `${row}: the check first`).toBeGreaterThan(
      checks[0].sequence ?? 0,
    );
  }

  for (const family of RL3B_OWNED[row]) {
    for (const suffix of RL3B_OPENING[family]) {
      expect(
        rl3bOf(events, family, suffix),
        `${row}: nothing administered (${family}${suffix})`,
      ).toEqual([]);
    }
  }

  return checks[0].metadata ?? {};
}

/** R2: the row's one check precedes its first administration in the load. */
function rl3bExpectAdministered(
  events: readonly Rl3bEvent[],
  row: Rl3bRow,
  family: string = RL3B_FAMILY[row],
): Record<string, unknown> {
  const checks = rl3bChecks(events, row);
  const openings = RL3B_OPENING[family].flatMap((suffix) =>
    rl3bOf(events, family, suffix),
  );

  expect(checks, `${row}: one check in this load`).toHaveLength(1);
  expect(openings.length, `${row}: administered in this load`).toBeGreaterThan(
    0,
  );
  expect(openings[0].sequence ?? 0, `${row}: the check first`).toBeGreaterThan(
    checks[0].sequence ?? 0,
  );
  expect(
    rl3bOf(events, family, 'technical_failure').filter((event) =>
      String(event.metadata?.detail ?? '').startsWith('reload'),
    ),
    `${row}: no hold-back`,
  ).toEqual([]);

  return checks[0].metadata ?? {};
}

async function rl3bStage(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __pilotProbe?: { stage: string } | null })
        .__pilotProbe?.stage ?? null,
  );
}

async function rl3bAnswerBy(page: Page, limit = 8) {
  for (let step = 0; step < limit; step += 1) {
    await page.waitForTimeout(450);

    const labels = await promptLabels(page);

    if (labels.length === 0) {
      return;
    }

    const choice = RL3B_CARDS.find((label) => labels.includes(label));

    if (choice === undefined) {
      throw new Error(`RL-3 route: no expected card among ${labels}`);
    }

    await selectPromptLabel(page, choice);
    await page.waitForTimeout(400);
  }
}

/**
 * The participant route by ordinary input (every offer declined), with the
 * RL-3 hosts on it: the laboratory (M17), the yard (M23, M24, M25, M26),
 * Vale's return check-in (the M25 question) and the return shift (M21,
 * M22, the questionnaire notice). Stops after the yard, after Vale's
 * check-in, or in the Workshop on the return shift.
 */
async function rl3bRoute(
  page: Page,
  hooks: {
    lab?: () => Promise<void>;
    yard?: () => Promise<void>;
    vale?: () => Promise<void>;
    workshop?: () => Promise<void>;
    stopAt?: 'yard' | 'vale' | 'workshop';
  } = {},
) {
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 1);
  await rl3bAnswerBy(page);

  if ((await rl3bStage(page)) !== 'workshop') {
    await openVale(page);
    await rl3bAnswerBy(page);
  }

  await expectStage(page, 'workshop');
  await concourseToWorkshop(page);
  await boardFirstCard(page, 'workshop_work');
  await boardFirstCard(page, 'lab_briefing');
  await workshopToConcourse(page);
  await concourseToLab(page);
  await openKai(page);
  await rl3bAnswerBy(page, 1);
  await expectStage(page, 'lab_work');
  await hooks.lab?.();
  await openKai(page);
  await selectPromptLabel(page, 'I am done here — what is next?');
  await expectStage(page, 'exterior_briefing');
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: await labApproach(page, PILOT.lab.airlock),
  });
  await openNoor(page);
  await rl3bAnswerBy(page);
  await expectStage(page, 'exterior_work');
  await hooks.yard?.();

  if (hooks.stopAt === 'yard') {
    return;
  }

  await openNoor(page);
  await selectPromptLabel(page, 'I am finished outside.');
  await expectStage(page, 'return_hub');
  await page.waitForTimeout(450);

  if ((await promptLabels(page)).includes('Better ask someone else.')) {
    await selectPromptLabel(page, 'Better ask someone else.');
    await page.waitForTimeout(400);
  }

  await leaveYard(page);
  await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
    approachOffset: await labApproach(page, PILOT.lab.southDoor),
  });
  await openVale(page);
  await selectPromptOption(page, 1);
  await expectStage(page, 'workshop_return');
  await page.waitForTimeout(700);
  await hooks.vale?.();

  if (hooks.stopAt === 'vale') {
    return;
  }

  if ((await promptLabels(page)).length > 0) {
    await press(page, 'Escape');
    await page.waitForTimeout(400);
  }

  await concourseToWorkshop(page);
  await page.waitForTimeout(400);
  await hooks.workshop?.();
}

/** Opens the training rig's terminal (E at its approach point, retried). */
async function rl3bOpenRig(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await interactAt(page, PILOT.lab.trainingRig, {
      approachOffset: await labApproach(page, PILOT.lab.trainingRig),
    });

    if (
      await waitTerminalOpen(page, true).then(
        () => true,
        () => false,
      )
    ) {
      await page.waitForTimeout(400);

      return;
    }
  }

  throw new Error('the training rig did not open');
}

async function rl3bLeaveRig(page: Page) {
  await press(page, 'Escape');
  await page.waitForTimeout(300);

  if ((await terminalProbe(page)).open) {
    await press(page, 'Escape');
  }

  await waitTerminalOpen(page, false);
}

/** E at a yard station without a prompt; the feedback line it shows. */
async function rl3bPressSite(
  page: Page,
  site: 'stake' | 'rig' | 'uplinkA' | 'uplinkB',
  shot: string,
): Promise<string | null> {
  if (site === 'rig') {
    await enterCompound(page);
  } else {
    await ensureOutsideCompound(page);
  }

  await yardVia(
    page,
    YARD[site].x + APPROACH[site].x,
    YARD[site].y + APPROACH[site].y,
  );
  await page.evaluate(() => {
    (
      window as unknown as { __lastRoomFeedbackText?: string | null }
    ).__lastRoomFeedbackText = null;
  });
  await interactAt(page, YARD[site], { approachOffset: APPROACH[site] });
  await page.waitForTimeout(700);
  await page.screenshot({ path: test.info().outputPath(`${shot}.png`) });
  expect((await surface(page))?.open ?? false, `${site}: nothing opens`).toBe(
    false,
  );

  const line = await lastFeedback(page);

  test.info().annotations.push({
    type: `rl3-screen ${shot}`,
    description: String(line),
  });

  return line;
}

/** Opens the field sensor post's surface (retried). */
async function rl3bOpenPost(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await ensureOutsideCompound(page);
    await yardVia(
      page,
      YARD.sensorPost.x + APPROACH.sensorPost.x,
      YARD.sensorPost.y + APPROACH.sensorPost.y,
    );
    await interactAt(page, YARD.sensorPost, {
      approachOffset: APPROACH.sensorPost,
    });

    if (
      await waitSurface(page, true, 'm25_field_sensor_post').then(
        () => true,
        () => false,
      )
    ) {
      await page.waitForTimeout(500);

      return;
    }
  }

  throw new Error('the sensor post did not open');
}

/** The three required loops and "Finished" (the post closes in this load). */
async function rl3bLoopsFinished(page: Page) {
  await rl3bOpenPost(page);

  const before = await countType(page, 'proto_m25_loops_loop_completed');

  for (let loop = 1; loop <= 3; loop += 1) {
    await clickElement(page, 'run_loop');
    await waitType(
      page,
      'proto_m25_loops_loop_completed',
      before + loop,
      10_000,
    );
  }

  await page.waitForTimeout(700);
  await clickElement(page, 'finished');
  await page.waitForTimeout(400);
  await press(page, 'Escape');
  await waitSurface(page, false);
}

interface Rl3bScreen {
  title: string | null;
  subtitle: string | null;
  status: string;
  elements: string[];
}

/**
 * The open surface's subtitle, read from its own model in the page (the
 * surface probe carries no subtitle; a harness read, RL-2's precedent).
 */
const RL3B_SUBTITLE: Record<string, string> = {
  m21_relay_bench: `(async () => {
    const mod = await import('/src/pilot/windows/returnSurfaceModels.ts');
    const host = { now: () => Date.now(), close: () => {}, feedback: () => {}, later: () => {}, deliverRelayUnit: () => 'inventory' };
    return mod.m21RelayBenchSurfaceModel(host).subtitle ?? null;
  })()`,
  m22_report_desk: `(async () => {
    const mod = await import('/src/pilot/windows/returnSurfaceModels.ts');
    const host = { now: () => Date.now(), close: () => {}, feedback: () => {}, later: () => {}, deliverRelayUnit: () => 'inventory' };
    return mod.m22ReportDeskSurfaceModel(host).subtitle ?? null;
  })()`,
  m25_field_sensor_post: `(async () => {
    const mod = await import('/src/pilot/windows/m25SurfaceModel.ts');
    const host = { now: () => Date.now(), close: () => {}, feedback: () => {}, later: () => {} };
    return mod.m25SurfaceModel(host).subtitle ?? null;
  })()`,
};

/** Reads (and photographs) the open work surface, then closes it. */
async function rl3bReadSurface(page: Page, shot: string): Promise<Rl3bScreen> {
  await page.screenshot({ path: test.info().outputPath(`${shot}.png`) });

  const probe = await surface(page);
  const expression = RL3B_SUBTITLE[probe?.surface_id ?? ''];
  const screen = {
    title: probe?.title ?? null,
    subtitle:
      expression === undefined
        ? null
        : ((await page.evaluate(expression)) as string | null),
    status: probe?.status ?? '',
    elements: (probe?.elements ?? []).map((element) => element.id),
  };

  test.info().annotations.push({
    type: `rl3-screen ${shot}`,
    description: JSON.stringify(screen),
  });
  await press(page, 'Escape');
  await waitSurface(page, false);

  return screen;
}

/** Reads (and photographs) the training rig's terminal, then leaves it. */
async function rl3bReadRig(page: Page, shot: string) {
  await rl3bOpenRig(page);
  await page.screenshot({ path: test.info().outputPath(`${shot}.png`) });

  const probe = await terminalProbe(page);
  const screen = {
    stage: probe.stage,
    closed: probe.closed,
    console: probe.console,
    output: probe.output,
    codebook: probe.codebook,
    submit_enabled: probe.submit_enabled,
    enabled: probe.buttons.filter((b) => b.enabled).map((b) => b.id),
  };

  test.info().annotations.push({
    type: `rl3-screen ${shot}`,
    description: JSON.stringify(screen),
  });
  await rl3bLeaveRig(page);

  return screen;
}

/** The screens a held load shows at the seven rows' stations. */
interface Rl3bScreens {
  rig?: Awaited<ReturnType<typeof rl3bReadRig>>;
  stake?: string | null;
  magnet?: string | null;
  uplinkA?: string | null;
  uplinkB?: string | null;
  post?: Rl3bScreen;
  bench?: Rl3bScreen;
  desk?: Rl3bScreen;
}

/** Visits every held station of a load, reading its screen. */
function rl3bScreenHooks(page: Page, screens: Rl3bScreens, tag: string) {
  return {
    lab: async () => {
      screens.rig = await rl3bReadRig(page, `rl3-${tag}-m17-rig`);
    },
    yard: async () => {
      screens.stake = await rl3bPressSite(
        page,
        'stake',
        `rl3-${tag}-m23-stake`,
      );
      screens.magnet = await rl3bPressSite(page, 'rig', `rl3-${tag}-m24-rig`);
      screens.uplinkA = await rl3bPressSite(
        page,
        'uplinkA',
        `rl3-${tag}-m26-post-a`,
      );
      screens.uplinkB = await rl3bPressSite(
        page,
        'uplinkB',
        `rl3-${tag}-m26-post-b`,
      );
      await rl3bOpenPost(page);
      screens.post = await rl3bReadSurface(page, `rl3-${tag}-m25-post`);
    },
    workshop: async () => {
      await openWorkshopSurface(page, 'relayBench', 'm21_relay_bench');
      screens.bench = await rl3bReadSurface(page, `rl3-${tag}-m21-bench`);
      await openWorkshopSurface(page, 'reportDesk', 'm22_report_desk');
      screens.desk = await rl3bReadSurface(page, `rl3-${tag}-m22-desk`);
    },
  };
}

test.describe('U24 RL-3: the seven rows after a genuine reload (browser)', () => {
  test.describe.configure({ timeout: 3_600_000 });

  test('R1 + R4 + R6 (H) + R5 case 2: every station opened in load 1 is held at its host after a genuine reload — one check per family before its markers, nothing administered again, the prior-exposure entries, the H screens, the answered question not asked again — and a second reload writes one check per family again', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await bootPilot(page, 'RL3H');
    // Load 1: every RL-3 station administered by ordinary input.
    await rl3bRoute(page, {
      lab: async () => {
        await rl3bOpenRig(page);
        await rl3bLeaveRig(page);
      },
      yard: async () => {
        await openStakeSurface(page);
        await waitView(page, 'brief');
        await briefToSelector(page, 'keyboard');
        await stepAway(page, 'keyboard');
        await startSalvageTally(page);
        await powerUpUplink(page);
        await rl3bLoopsFinished(page);
      },
      vale: async () => {
        await selectPromptOption(page, 3);
        await waitType(page, 'proto_m25_belief_question_answered', 1);
        await page.waitForTimeout(400);
      },
      workshop: async () => {
        await repairRelay(page, { wrongFirst: false, fit: true });
        await reportDesk(page);
        await acknowledgeQuestionnaireNotice(page);
      },
    });

    const first = await rl3bPayload(page);

    expect(first.page_load_index).toBe(1);

    for (const row of RL3B_ROWS) {
      expect(rl3bChecks(first.raw_events, row), `${row} load 1`).toEqual([]);
    }

    // Load 2.
    await reloadToDock(page);

    const screens: Rl3bScreens = {};

    const hHooks = rl3bScreenHooks(page, screens, 'h');

    await rl3bRoute(page, {
      ...hHooks,
      vale: async () => {
        expect(await promptLabels(page)).not.toContain('Very normal');
      },
      workshop: async () => {
        await hHooks.workshop();
        // U24 completion (the owner's RL-3 closeout decision 5): the held
        // notice is neither offered nor acknowledged; the guidance has
        // moved on from the handover desk without an acknowledgement.
        expect((await pilotProbe(page))?.beacon?.label ?? null).not.toBe(
          'Outbound Handover Desk',
        );

        const desk = await openHandoverDesk(page);

        expect(desk.some((label) => /questionnaire notice/i.test(label))).toBe(
          false,
        );
        expect(desk).not.toContain('Noted.');
        expect(desk.at(-1)).toBe('Step away');
        await selectPromptOption(page, desk.length);
        await page.waitForTimeout(400);
      },
    });

    let now = await rl3bPayload(page);

    expect(now.page_load_index).toBe(2);

    const H = RELOAD_HOLD_BACK_PREFIX.H;
    const markers: Record<Rl3bRow, number> = {
      M17: 1,
      M21: 2,
      M22: 2,
      M23: 1,
      M24: 1,
      M25: 3,
      M26: 1,
    };

    for (const row of RL3B_ROWS) {
      const check = rl3bExpectHeld(
        now.raw_events,
        row,
        row === 'M23' || row === 'M25' ? 'reload after' : H,
        markers[row],
      );

      expect(check, `${row} record`).toMatchObject({
        page_load_index: 2,
        history_continuous: true,
        prior_opening_found: true,
        prior_opening_absence_established: false,
      });
    }

    expect(
      (
        rl3bChecks(now.raw_events, 'M25')[0].metadata?.occasions as Record<
          string,
          { evidence?: Record<string, boolean> }
        >
      ).belief.evidence,
    ).toEqual({ prior_belief_displayed: true, prior_belief_answered: true });

    // Readings: every row held — interrupted, no value.
    for (const id of [
      'm17_criterion_trial',
      'm21_restudy_revisions',
      'm22_revisions_begun',
      'm23_continuations_after_failure',
      'm24_postknowledge_casts',
      'm25_optional_repeats',
      'm25_normality_belief',
      'm26_postknowledge_retries',
    ]) {
      expect(rl3bFeature(now, id), id).toMatchObject({
        disposition: 'interrupted',
        value: null,
      });
    }

    expect(rl3bFeature(now, 'm25_normality_belief')?.missing_reason).toBe(
      'normality question answered in an earlier page load; not asked again after the reload',
    );

    // The prior-exposure entries (direction a); never absent.
    for (const id of RL3B_OPPORTUNITIES) {
      const record = rl3bValidity(now, id);

      expect(
        (record?.prior_exposure as unknown[] | undefined)?.length ?? 0,
        `${id} prior exposure`,
      ).toBeGreaterThan(0);
      expect(record?.absent ?? false, `${id} absent`).toBe(false);
    }

    // R6 (H): the five new H lines; M23's and M25's existing texts kept.
    expect(screens.rig).toMatchObject({
      stage: 'CLOSED',
      closed: true,
      console: rl3bH('training rig'),
      output: [],
      codebook: [],
      submit_enabled: false,
    });
    expect(screens.rig?.enabled).not.toContain('stop');
    expect(screens.stake).toBe(RL3B_M23_LOCK);
    expect(screens.magnet).toBe(rl3bH('magnet rig').join('\n'));
    expect(screens.uplinkA).toBe(rl3bH('uplink post').join('\n'));
    expect(screens.uplinkB).toBe(rl3bH('uplink post').join('\n'));
    expect(screens.post?.status).toBe(RL3B_M25_HELD);
    expect(screens.bench).toMatchObject({
      status: rl3bH('relay bench').join('\n'),
      subtitle: '',
      elements: ['leave'],
    });
    expect(screens.bench?.title).toMatch(/^RELAY BENCH/);
    expect(screens.desk).toMatchObject({
      title: 'SHIFT REPORT DESK',
      status: rl3bH('shift report desk').join('\n'),
      subtitle: '',
      elements: ['leave'],
    });

    // Viewing the held stations wrote nothing of their families.
    expect(
      rl3bOf(now.raw_events, 'proto_m17_trials_', 'help_consulted'),
    ).toEqual([]);
    // The held notice: no acknowledgement written or fabricated (RL-3
    // closeout decision 5).
    expect(
      rl3bOf(now.raw_events, 'proto_m25_probe_', 'handoff_acknowledged'),
    ).toEqual([]);

    // R4: a second genuine reload; load 3 writes one check per family.
    await reloadToDock(page);
    await rl3bRoute(page);
    now = await rl3bPayload(page);
    expect(now.page_load_index).toBe(3);

    for (const row of RL3B_ROWS) {
      const inLoad = (load: number) =>
        rl3bChecks(
          now.prior_page_load_events.filter(
            (event) => event.page_load_index === load,
          ),
          row,
        ).length;

      expect(rl3bChecks(now.raw_events, row), `${row} load 3`).toHaveLength(1);
      expect(inLoad(2), `${row} load 2`).toBe(1);
      expect(inLoad(1), `${row} load 1 (a first load writes none)`).toBe(0);
    }

    expectNoRuntimeErrors(capture);
  });

  test('R2 + R5 case 3: nothing opened before a genuine reload — each check establishes the absence and every station runs as on a first load, after its check; the post completed in load 2 and a reload before the question ⇒ in load 3 the question’s first display, with exposure_page_load_index 2 and the delay from load 2’s closure', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await bootPilot(page, 'RL3A');
    // Load 1: the route to the yard; no RL-3 station opened.
    await rl3bRoute(page, { stopAt: 'yard' });
    await reloadToDock(page);

    // Load 2: the laboratory and yard stations administered after their
    // checks (R2), the post completed and closed — then a reload before
    // the shift end (the question never displayed).
    await rl3bRoute(page, {
      stopAt: 'yard',
      lab: async () => {
        await rl3bOpenRig(page);
        await rl3bLeaveRig(page);
      },
      yard: async () => {
        await openStakeSurface(page);
        await waitView(page, 'brief');
        await briefToSelector(page, 'keyboard');
        await stepAway(page, 'keyboard');
        await startSalvageTally(page);
        await powerUpUplink(page);
        await rl3bLoopsFinished(page);
      },
    });

    const second = await rl3bPayload(page);

    expect(second.page_load_index).toBe(2);

    for (const row of ['M17', 'M23', 'M24', 'M26'] as const) {
      expect(
        rl3bExpectAdministered(second.raw_events, row),
        `${row} record`,
      ).toMatchObject({
        page_load_index: 2,
        history_continuous: true,
        prior_opening_found: false,
        prior_opening_absence_established: true,
      });
    }

    expect(
      rl3bExpectAdministered(second.raw_events, 'M25'),
      'M25 record',
    ).toMatchObject({ prior_opening_absence_established: true });

    const closed = rl3bOf(
      second.raw_events,
      'proto_m25_loops_',
      'window_closed',
    )[0];

    expect(closed).toBeDefined();
    await reloadToDock(page);

    // Load 3: the yard stations held (H); the shift ended; Vale displays
    // the question for the first time; the return shift's stations run.
    await rl3bRoute(page, {
      vale: async () => {
        await selectPromptOption(page, 4);
        await waitType(page, 'proto_m25_belief_question_answered', 1);
        await page.waitForTimeout(400);
      },
      workshop: async () => {
        await openWorkshopSurface(page, 'relayBench', 'm21_relay_bench');
        await clickElement(page, 'leave');
        await waitSurface(page, false);
        await openWorkshopSurface(page, 'reportDesk', 'm22_report_desk');
        await press(page, 'Escape');
        await waitSurface(page, false);
        await acknowledgeQuestionnaireNotice(page);
      },
    });

    const third = await rl3bPayload(page);

    expect(third.page_load_index).toBe(3);

    const m25 = rl3bChecks(third.raw_events, 'M25')[0]?.metadata as {
      occasions: Record<string, Record<string, unknown>>;
    };

    expect(m25.occasions.loops).toMatchObject({
      prior_opening_found: true,
      evidence: { prior_required_complete: true },
    });
    expect(m25.occasions.belief).toMatchObject({
      prior_opening_found: false,
      prior_opening_absence_established: true,
    });

    const asked = rl3bOf(
      third.raw_events,
      'proto_m25_belief_',
      'question_presented',
    );

    expect(asked).toHaveLength(1);
    expect(asked[0].metadata?.exposure_page_load_index).toBe(2);
    expect(asked[0].metadata?.delay_since_loops_closed_null_reason).toBeNull();

    const delay = asked[0].metadata?.delay_since_loops_closed_ms as number;
    const expected = (asked[0].timestamp_ms ?? 0) - (closed.timestamp_ms ?? 0);

    expect(Math.abs(delay - expected)).toBeLessThanOrEqual(50);
    expect(rl3bFeature(third, 'm25_normality_belief')).toMatchObject({
      disposition: 'observed',
      value: 4,
      components: { exposure_page_load_index: 2 },
    });
    expect(rl3bFeature(third, 'm25_optional_repeats')?.disposition).toBe(
      'interrupted',
    );

    // R2 for the return shift's rows (no earlier presentation) and the
    // notice: each runs after its check.
    rl3bExpectAdministered(third.raw_events, 'M21');
    rl3bExpectAdministered(third.raw_events, 'M22');
    expect(
      rl3bExpectAdministered(third.raw_events, 'M25', 'proto_m25_probe_'),
    ).toBeDefined();
    expect(m25.occasions.probe).toMatchObject({
      prior_opening_absence_established: true,
    });
    expectNoRuntimeErrors(capture);
  });

  test('R3 + R6 (U): an earlier state that cannot be verified (store meta record removed before the reload — fault-injected) holds every station of the seven rows, administers nothing, claims no prior exposure, never marks one absent, and the stations show the exact §9 U lines; the question is not asked', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await bootPilot(page, 'RL3U');
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);
    await page.addInitScript(() => {
      if (sessionStorage.getItem('rl3-meta-removed') !== null) {
        return;
      }

      sessionStorage.setItem('rl3-meta-removed', '1');

      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('research-events:v1:') && key.endsWith(':meta')) {
          localStorage.removeItem(key);
        }
      }
    });
    await reloadToDock(page);

    const screens: Rl3bScreens = {};

    await rl3bRoute(page, {
      ...rl3bScreenHooks(page, screens, 'u'),
      vale: async () => {
        expect(await promptLabels(page)).not.toContain('Very normal');
      },
    });

    const now = await rl3bPayload(page);

    expect(now.page_load_index).toBe(2);
    expect(now.event_integrity.recovered_from_chunks).toBe(true);

    const markers: Record<Rl3bRow, number> = {
      M17: 1,
      M21: 2,
      M22: 2,
      M23: 1,
      M24: 1,
      M25: 3,
      M26: 1,
    };

    for (const row of RL3B_ROWS) {
      expect(
        rl3bExpectHeld(
          now.raw_events,
          row,
          RELOAD_HOLD_BACK_PREFIX.U,
          markers[row],
        ),
        `${row} record`,
      ).toMatchObject({
        history_continuous: false,
        prior_opening_found: false,
        prior_opening_absence_established: false,
      });
    }

    for (const id of RL3B_OPPORTUNITIES) {
      const record = rl3bValidity(now, id);

      expect(record?.prior_exposure ?? [], `${id} prior exposure`).toEqual([]);
      expect(record?.absent ?? false, `${id} absent`).toBe(false);
    }

    expect(rl3bFeature(now, 'm25_normality_belief')).toMatchObject({
      disposition: 'interrupted',
      missing_reason:
        'normality question not asked after a reload: earlier history not verified',
    });

    // R6 (U): the approved lines at every held station.
    expect(screens.rig).toMatchObject({
      stage: 'CLOSED',
      console: rl3bU('training rig'),
      output: [],
      codebook: [],
    });
    expect(screens.stake).toBe(rl3bU('excavation stake').join('\n'));
    expect(screens.magnet).toBe(rl3bU('magnet rig').join('\n'));
    expect(screens.uplinkA).toBe(rl3bU('uplink post').join('\n'));
    expect(screens.uplinkB).toBe(rl3bU('uplink post').join('\n'));
    expect(screens.post).toMatchObject({
      title: 'FIELD SENSOR POST',
      status: rl3bU('post').join('\n'),
      elements: ['leave'],
    });
    expect(screens.bench).toMatchObject({
      status: rl3bU('relay bench').join('\n'),
      subtitle: '',
      elements: ['leave'],
    });
    expect(screens.desk).toMatchObject({
      title: 'SHIFT REPORT DESK',
      status: rl3bU('shift report desk').join('\n'),
      elements: ['leave'],
    });
    expectNoRuntimeErrors(capture);
  });

  test('R5 case 4: the post completed in load 1 (exposed), the history then unverifiable (fault-injected reload) — the question is held U and never asked after the shift end; the companion reads interrupted with the unverified reason; the post, opened earlier, stays H', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await bootPilot(page, 'RL3C4');
    await rl3bRoute(page, {
      stopAt: 'yard',
      yard: async () => {
        await rl3bLoopsFinished(page);
      },
    });
    await page.addInitScript(() => {
      if (sessionStorage.getItem('rl3-meta-removed-c4') !== null) {
        return;
      }

      sessionStorage.setItem('rl3-meta-removed-c4', '1');

      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('research-events:v1:') && key.endsWith(':meta')) {
          localStorage.removeItem(key);
        }
      }
    });
    await reloadToDock(page);
    await rl3bRoute(page, {
      stopAt: 'vale',
      vale: async () => {
        expect(await promptLabels(page)).not.toContain('Very normal');
      },
    });

    const now = await rl3bPayload(page);

    expect(now.page_load_index).toBe(2);
    expect(now.event_integrity.recovered_from_chunks).toBe(true);

    const m25 = rl3bChecks(now.raw_events, 'M25')[0]?.metadata as {
      occasions: Record<string, Record<string, unknown>>;
    };

    expect(m25.occasions.loops).toMatchObject({
      prior_opening_found: true,
      evidence: { prior_required_complete: true },
    });
    expect(m25.occasions.belief).toMatchObject({
      prior_opening_found: false,
      prior_opening_absence_established: false,
    });
    expect(
      rl3bOf(now.raw_events, 'proto_m25_belief_', 'question_presented'),
    ).toEqual([]);
    expect(
      rl3bOf(now.raw_events, 'proto_m25_belief_', 'technical_failure').map(
        (event) => event.metadata?.detail,
      ),
    ).toEqual([`${RELOAD_HOLD_BACK_PREFIX.U}: question not administered`]);
    expect(rl3bFeature(now, 'm25_normality_belief')).toMatchObject({
      disposition: 'interrupted',
      value: null,
      missing_reason:
        'normality question not asked after a reload: earlier history not verified',
    });
    expect(rl3bFeature(now, 'm25_optional_repeats')?.missing_reason).toBe(
      'post administered in an earlier page load; not re-run after the reload',
    );
    expect(
      JSON.stringify(rl3bFeature(now, 'm25_normality_belief')),
    ).not.toMatch(/0 required loops|not exposed/);
    expectNoRuntimeErrors(capture);
  });
});
