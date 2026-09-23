/**
 * Station 080 M05 — two explicitly accepted extra jobs with a visible
 * start control and a 60-second focused cap (Unit 6), pure tests.
 *
 * Playwright test blocks that never touch `page`: the register row; the
 * offer (settle window refuses a carried press and re-presents; accept /
 * decline are deliberate; a decline closes outside the set); eligibility
 * (no clock before acceptance or while a prompt, a paused host or a
 * world action blocks a usable start; the clock starts at the first
 * unblocked moment; blocks pause it under their causes; the job's own
 * surface never pauses it); the start (latency on FOCUSED time with the
 * excluded intervals by cause; the standard work cycle; a closed surface
 * pauses the work); the explicit deferral; the cap (never a start, never
 * a 60 s latency); the exit; the review and reload closures; late starts
 * as companions; and the extractor reproducing the per-occasion record —
 * started ≠ deferred ≠ exited ≠ cap ≠ interrupted, declined outside the
 * set, pending / not presented / interrupted distinct, no mean anywhere.
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { resetFocusMonitor } from '../src/measurement/focusMonitor';
import { PILOT_SETTINGS } from '../src/measurement/protocol';
import { registerEntry } from '../src/measurement/registerV3';
import {
  createM05State,
  M05_FAMILY,
  M05_OPPORTUNITY_IDS,
  M05_SETTLE_MS,
  M05_START_CAP_MS,
  M05_WORK_MS,
  m05Answer,
  m05CapDue,
  m05ControlPresented,
  m05Defer,
  m05Eligible,
  m05Exit,
  m05Freeze,
  type M05LogSink,
  type M05Occasion,
  m05Open,
  m05Poll,
  m05Present,
  m05PriorAdministration,
  m05RawComponents,
  m05SetBlock,
  m05Start,
  type M05State,
  m05SurfaceClosed,
  m05SurfaceReopened,
  m05WorkTick,
} from '../src/pilot/windows/m05StartModel';
import type { RawGameEvent } from '../src/systems/EventLogger';

/** A captured event stream shaped like the window adapter's emissions. */
function harness() {
  const events: RawGameEvent[] = [];
  const push = (
    occasion: M05Occasion,
    suffix: string,
    metadata: Record<string, unknown>,
  ) => {
    events.push({
      session_id: 's',
      timestamp_ms: events.length,
      scene: occasion === 'o1' ? 'station_concourse' : 'exterior_recovery_yard',
      event_type: `${M05_FAMILY}${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: {
        opportunity_id: M05_OPPORTUNITY_IDS[occasion],
        occasion,
        ...metadata,
      },
    });
  };
  const sink =
    (occasion: M05Occasion): M05LogSink =>
    (suffix, metadata) =>
      push(occasion, suffix, metadata);

  return {
    events,
    sink,
    presented: (occasion: M05Occasion) =>
      push(occasion, 'presented', { input_mode: 'system' }),
    opened: (occasion: M05Occasion) =>
      push(occasion, 'opportunity_opened', { input_mode: 'system' }),
    close: (
      s: M05State,
      reason: string,
      nowMs: number,
      exit: 'completed' | 'stopped' | 'closed_at_review' = 'completed',
    ) =>
      push(s.occasion, 'window_closed', {
        exit_state: exit,
        [exit === 'closed_at_review'
          ? 'raw_components_partial'
          : 'raw_components']: m05RawComponents(s, reason, nowMs),
      }),
  };
}

const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };
const OPEN_CONTEXT = { ...CONTEXT, finalCoreClosed: false };
const T0 = 100_000;

/** Offer presented at `at`, accepted a second later (past the settle window). */
function acceptAt(s: M05State, at: number, log: M05LogSink) {
  expect(m05Present(s, at, log)).toBe(true);
  expect(m05Answer(s, true, 1, at + 1_000, 'keyboard', log)).toBe('accepted');
}

/** Accepted at `at`, eligible one frame later. */
function eligibleAt(s: M05State, at: number, log: M05LogSink): number {
  acceptAt(s, at, log);
  expect(m05Poll(s, at + 1_016, log, 300)).toBe('eligible');

  return at + 1_016;
}

test.beforeEach(() => {
  resetFocusMonitor();
});

test.describe('M05 accepted extra jobs (pure)', () => {
  test('register row: v3 route with one window per occasion in different rooms, a latency-with-status primary and an acceptance/exposure companion, 60 s focused cap', () => {
    const entry = registerEntry('M05');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual([
      'proto_m05_start_o1',
      'proto_m05_start_o2',
    ]);
    expect(
      entry.route.windows.map((w) => [w.id, w.occasion, w.zone, w.episode]),
    ).toEqual([
      ['m05_start_o1', 'o1', 'station_concourse', 1],
      ['m05_start_o2', 'o2', 'exterior_recovery_yard', 4],
    ]);
    expect(entry.route.family_prefixes).toEqual(['proto_m05_start_']);
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.independence.kind).toBe('independent_occasions');
    expect(entry.features.map((f) => [f.feature_id, f.kind, f.role])).toEqual([
      ['m05_start_latency', 'latency_with_status', 'primary'],
      ['m05_acceptance_exposure', 'count', 'companion'],
    ]);
    expect(entry.features[0].planned_denominator).toBeNull();
    expect(entry.features[0].missing_rule).toContain(
      'never a starter-only mean',
    );
    expect(entry.operational_label).toBe('Extra jobs (Concourse / Yard)');
    expect(M05_START_CAP_MS).toBe(PILOT_SETTINGS.m05_start_cap_ms);
    expect(M05_START_CAP_MS).toBe(60_000);
  });

  test('offer: a press inside the settle window is refused and the stage re-presented; accept and decline are deliberate; a decline closes outside the set; nothing answers twice', () => {
    const h = harness();
    const s = createM05State('o1');
    const log = h.sink('o1');

    expect(m05Answer(s, true, 1, T0, 'keyboard', log)).toBe('invalid'); // never presented
    expect(m05Present(s, T0, log)).toBe(true);
    expect(m05Answer(s, true, 1, T0 + 100, 'keyboard', log)).toBe('refused');
    expect(s.offer_refused_presses).toBe(1);
    expect(s.accepted).toBeNull();
    // Re-presented in place: the settle reference moves to the new presentation.
    expect(m05Present(s, T0 + 120, log)).toBe(true);
    expect(s.offer_presentations).toBe(2);
    expect(
      m05Answer(s, true, 1, T0 + 120 + M05_SETTLE_MS - 1, 'keyboard', log),
    ).toBe('refused');
    expect(
      m05Answer(s, true, 1, T0 + 120 + M05_SETTLE_MS, 'keyboard', log),
    ).toBe('accepted');
    expect(s.accepted).toBe(true);
    expect(s.offer_latency_ms).toBe(M05_SETTLE_MS);
    expect(m05Open(s)).toBe(true);
    expect(m05Answer(s, false, 2, T0 + 5_000, 'keyboard', log)).toBe('invalid');
    expect(m05Present(s, T0 + 5_000, log)).toBe(false);
    expect(
      h.events
        .filter((e) => e.event_type === 'proto_m05_start_offer_press_refused')
        .map((e) => e.metadata?.refused_presses),
    ).toEqual([1, 2]);
    expect(
      h.events.filter(
        (e) => e.event_type === 'proto_m05_start_offer_represented',
      ),
    ).toHaveLength(1);

    const answered = h.events.find(
      (e) => e.event_type === 'proto_m05_start_offer_answered',
    );

    expect(answered?.metadata).toMatchObject({
      accepted: true,
      option_position: 1,
      option_count: 2,
      focus_default_position: 1,
      refused_presses: 2,
    });

    // Decline: closed outside the set, never open, no clock ever.
    const d = createM05State('o2');
    const dlog = h.sink('o2');

    m05Present(d, T0, dlog);
    expect(m05Answer(d, false, 2, T0 + 1_000, 'pointer', dlog)).toBe(
      'declined',
    );
    expect(d.accepted).toBe(false);
    expect(m05Open(d)).toBe(false);
    expect(d.closureReason).toBe('declined');
    expect(m05Poll(d, T0 + 2_000, dlog)).toBe('none');
    expect(d.clock).toBeNull();
    expect(m05Start(d, T0 + 3_000, 'pointer', dlog)).toBe('invalid');
    expect(m05RawComponents(d, 'declined', T0 + 3_000)).toMatchObject({
      accepted: false,
      eligible: false,
      status: null,
      latency_focused_ms: null,
    });
  });

  test('eligibility: no clock before acceptance or while a prompt / paused host / world action blocks; the clock starts at the first unblocked moment; blocks pause it by cause; the own surface never pauses; a start records focused latency with the excluded time beside it', () => {
    const h = harness();
    const s = createM05State('o1');
    const log = h.sink('o1');

    // Before acceptance nothing polls into a clock.
    expect(m05Poll(s, T0, log)).toBe('none');
    m05Present(s, T0, log);
    expect(m05Poll(s, T0 + 500, log)).toBe('none');
    expect(m05Answer(s, true, 1, T0 + 1_000, 'keyboard', log)).toBe('accepted');
    // The offer prompt (and the M09 / M10 prompts after it) still hold the room.
    m05SetBlock(s, 'prompt', true, T0 + 1_000);
    expect(m05Poll(s, T0 + 1_016, log)).toBe('none');
    expect(m05Poll(s, T0 + 9_000, log)).toBe('none');
    expect(s.clock).toBeNull();
    expect(s.eligible_at_ms).toBeNull();
    // Prompt closes: the next poll starts the clock (the start control is usable).
    m05SetBlock(s, 'prompt', false, T0 + 10_000);
    expect(m05Poll(s, T0 + 10_016, log, 250)).toBe('eligible');
    expect(s.eligible_at_ms).toBe(T0 + 10_016);
    expect(m05Eligible(s)).toBe(true);

    const eligible = h.events.find(
      (e) => e.event_type === 'proto_m05_start_eligible',
    );

    expect(eligible?.metadata).toMatchObject({
      wait_before_eligible_ms: 9_016,
      start_cap_ms: 60_000,
      distance_px: 250,
    });

    const t = T0 + 10_016;

    // The M01 board opens (host paused under another surface): paused.
    m05SetBlock(s, 'host_paused', true, t + 2_000);
    expect(m05Eligible(s)).toBe(false);
    expect(s.clock!.activeCauses()).toEqual(['unusable_controls']);
    expect(s.clock!.focusedMs(t + 5_000)).toBe(2_000);
    expect(s.clock!.wallMs(t + 5_000)).toBe(5_000);
    m05SetBlock(s, 'host_paused', false, t + 6_000);
    expect(m05Eligible(s)).toBe(true);
    // A prompt (Vale's beat) and a world action: distinct causes.
    m05SetBlock(s, 'prompt', true, t + 7_000);
    m05SetBlock(s, 'world_action', true, t + 7_500);
    expect(new Set(s.clock!.activeCauses())).toEqual(
      new Set(['unusable_controls', 'animation_lock']),
    );
    m05SetBlock(s, 'prompt', false, t + 8_000);
    expect(s.clock!.activeCauses()).toEqual(['animation_lock']);
    m05SetBlock(s, 'world_action', false, t + 9_000);
    expect(m05Eligible(s)).toBe(true);
    // Focused so far: 2000 (t..t+2000) + 1000 (t+6000..t+7000) = 3000.
    expect(s.clock!.focusedMs(t + 9_000)).toBe(3_000);
    expect(m05Poll(s, t + 9_000, log)).toBe('none');

    // The job's own surface opens: the host pauses, which is NOT a block here.
    m05ControlPresented(s, t + 10_000, log);
    m05SetBlock(s, 'host_paused', true, t + 10_001);
    expect(m05Eligible(s)).toBe(true);
    expect(s.control_views).toBe(1);
    expect(s.first_control_view_focused_ms).toBe(4_000);
    // A press carried from the station prompt is refused.
    expect(m05Start(s, t + 10_100, 'keyboard', log)).toBe('refused');
    expect(s.refused_presses).toBe(1);
    expect(s.status).toBeNull();
    // Start: latency on FOCUSED time only.
    expect(m05Start(s, t + 10_500, 'pointer', log)).toBe('started');
    expect(s.status).toBe('started');
    expect(s.latency_focused_ms).toBe(4_500);
    expect(s.latency_wall_ms).toBe(10_500);
    expect(s.excluded_ms).toMatchObject({
      unusable_controls: 4_000 + 1_000,
      animation_lock: 1_500,
    });
    expect(s.excluded_total_ms).toBe(6_000);
    expect(s.clock!.isRunning()).toBe(false);
    expect(m05Start(s, t + 10_600, 'pointer', log)).toBe('invalid'); // work already runs

    const started = h.events.find(
      (e) => e.event_type === 'proto_m05_start_started',
    );

    expect(started?.metadata).toMatchObject({
      latency_focused_ms: 4_500,
      latency_wall_ms: 10_500,
      control_views: 1,
      input_mode: 'pointer',
      phase: 'measurement',
    });

    // The standard work cycle on focused time; a closed surface pauses it.
    expect(m05WorkTick(s, t + 11_500, log)).toBe('none');
    m05SurfaceClosed(s, t + 11_500, log);
    expect(m05WorkTick(s, t + 20_000, log)).toBe('none'); // paused: no unattended completion
    m05SurfaceReopened(s, t + 20_000, log);
    expect(m05WorkTick(s, t + 20_999, log)).toBe('none');
    expect(m05WorkTick(s, t + 21_000, log)).toBe('work_completed');
    expect(s.work_focused_ms).toBe(M05_WORK_MS);
    expect(s.work_wall_ms).toBe(10_500);
    expect(s.closureReason).toBe('completed');
    expect(m05RawComponents(s, 'completed', t + 21_000)).toMatchObject({
      accepted: true,
      eligible: true,
      wait_before_eligible_ms: 9_016,
      status: 'started',
      latency_focused_ms: 4_500,
      latency_wall_ms: 10_500,
      exposure_focused_ms: 4_500,
      control_views: 1,
      refused_presses: 1,
      work_completed: true,
      late_start: null,
      closure_reason: 'completed',
    });
  });

  test('deferral: "Not now" closes the occasion as deferred with its exposure and a null latency; a later start is a late start (companion) that never rewrites the primary', () => {
    const h = harness();
    const s = createM05State('o2');
    const log = h.sink('o2');
    const t = eligibleAt(s, T0, log);

    m05ControlPresented(s, t + 3_000, log);
    expect(m05Defer(s, t + 3_100, 'keyboard', log)).toBe('refused'); // settle
    expect(m05Defer(s, t + 3_500, 'keyboard', log)).toBe('deferred');
    expect(s.status).toBe('deferred');
    expect(s.closureReason).toBe('voluntary_stop');
    expect(s.latency_focused_ms).toBeNull();
    expect(s.exposure_focused_ms).toBe(3_500);
    expect(m05Open(s)).toBe(false);
    expect(m05Poll(s, t + 100_000, log)).toBe('none'); // no cap after a closure
    expect(m05Defer(s, t + 4_000, 'keyboard', log)).toBe('invalid');

    // Late start: recorded beside, the primary unchanged.
    m05ControlPresented(s, t + 30_000, log);
    expect(s.control_views).toBe(1); // views after the decision are not counted
    expect(m05Start(s, t + 30_500, 'pointer', log)).toBe('late');
    expect(s.status).toBe('deferred');
    expect(s.latency_focused_ms).toBeNull();
    expect(s.late_start).toMatchObject({
      after: 'deferred',
      since_closure_ms: 27_000,
      input_mode: 'pointer',
      work_completed: false,
    });
    expect(m05WorkTick(s, t + 30_500 + M05_WORK_MS, log)).toBe(
      'work_completed',
    );
    expect(s.late_start?.work_completed).toBe(true);
    expect(m05Start(s, t + 40_000, 'pointer', log)).toBe('invalid');

    const raw = m05RawComponents(s, 'voluntary_stop', t + 40_000);

    expect(raw).toMatchObject({
      status: 'deferred',
      latency_focused_ms: null,
      exposure_focused_ms: 3_500,
      work_completed: false,
      late_start: { after: 'deferred', work_completed: true },
    });
    expect(
      h.events
        .map((e) => e.event_type)
        .filter((type) => /deferred|late_start|work_completed/.test(type)),
    ).toEqual([
      'proto_m05_start_deferred',
      'proto_m05_start_late_start',
      'proto_m05_start_work_completed',
    ]);
    expect(
      h.events.find((e) => e.event_type === 'proto_m05_start_work_completed')
        ?.metadata?.late,
    ).toBe(true);
  });

  test('cap: 60 focused seconds without a start close the occasion as cap — censored, latency null, never a 60 s start; paused time never counts toward it; a start afterwards is late', () => {
    const h = harness();
    const s = createM05State('o1');
    const log = h.sink('o1');
    const t = eligibleAt(s, T0, log);

    // 20 s focused, then 100 s under a paused host, then the rest.
    expect(m05Poll(s, t + 20_000, log)).toBe('none');
    m05SetBlock(s, 'host_paused', true, t + 20_000);
    expect(m05Poll(s, t + 120_000, log)).toBe('none'); // paused: 20 s focused so far
    m05SetBlock(s, 'host_paused', false, t + 120_000);
    expect(m05Poll(s, t + 120_000 + 39_999, log)).toBe('none');
    expect(m05Poll(s, t + 160_000, log)).toBe('cap');
    expect(s.status).toBe('cap');
    expect(s.closureReason).toBe('cap');
    expect(s.latency_focused_ms).toBeNull();
    expect(s.exposure_focused_ms).toBe(M05_START_CAP_MS);
    expect(s.exposure_wall_ms).toBe(160_000);
    expect(s.excluded_ms?.unusable_controls).toBe(100_000);
    expect(m05Poll(s, t + 200_000, log)).toBe('none');

    const cap = h.events.find(
      (e) => e.event_type === 'proto_m05_start_cap_reached',
    );

    expect(cap?.metadata).toMatchObject({
      start_cap_ms: 60_000,
      focused_ms: 60_000,
      wall_ms: 160_000,
    });
    expect(
      h.events.some((e) => e.event_type === 'proto_m05_start_started'),
    ).toBe(false);

    m05ControlPresented(s, t + 170_000, log);
    expect(m05Start(s, t + 170_500, 'keyboard', log)).toBe('late');
    expect(s.status).toBe('cap');
    expect(m05RawComponents(s, 'cap', t + 171_000)).toMatchObject({
      status: 'cap',
      cap_reached: true,
      latency_focused_ms: null,
      exposure_focused_ms: 60_000,
      late_start: { after: 'cap' },
    });
  });

  test('exit, review and reload: leaving closes an unstarted occasion as exited; a started one keeps its latency with the work as it stands; the review interrupts an open occasion; the reload guard recognises the same occasion only', () => {
    const h = harness();
    const a = createM05State('o1');
    const alog = h.sink('o1');
    const ta = eligibleAt(a, T0, alog);

    expect(m05Exit(a, ta + 12_000, alog, 'room_left')).toBe(true);
    expect(a.status).toBe('exited');
    expect(a.closureReason).toBe('route_departure');
    expect(a.latency_focused_ms).toBeNull();
    expect(a.exposure_focused_ms).toBe(12_000);
    expect(m05Exit(a, ta + 13_000, alog)).toBe(false);
    expect(
      h.events.find((e) => e.event_type === 'proto_m05_start_exited')?.metadata,
    ).toMatchObject({
      detail: 'room_left',
      focused_ms: 12_000,
      eligible: true,
    });

    // Started, then the shift ends mid-work.
    const b = createM05State('o2');
    const blog = h.sink('o2');
    const tb = eligibleAt(b, T0, blog);

    m05ControlPresented(b, tb + 5_000, blog);
    expect(m05Start(b, tb + 5_500, 'pointer', blog)).toBe('started');
    expect(m05Exit(b, tb + 6_000, blog, 'shift_ended')).toBe(true);
    expect(b.status).toBe('started');
    expect(b.latency_focused_ms).toBe(5_500);
    expect(b.closureReason).toBe('route_departure');
    expect(m05RawComponents(b, 'route_departure', tb + 6_000)).toMatchObject({
      status: 'started',
      work_completed: false,
      work_focused_ms: 500,
    });

    // Accepted before eligibility (a prompt still open) and never eligible:
    // an exit records a non-start with no exposure.
    const c = createM05State('o1');
    const clog = h.sink('o1');

    acceptAt(c, T0, clog);
    m05SetBlock(c, 'prompt', true, T0 + 1_000);
    expect(m05Exit(c, T0 + 2_000, clog)).toBe(true);
    expect(c.status).toBe('exited');
    expect(c.eligible_at_ms).toBeNull();
    expect(c.exposure_focused_ms).toBeNull();

    // The review closes an open occasion as interrupted (kind review).
    const r = createM05State('o2');
    const rlog = h.sink('o2');

    eligibleAt(r, T0, rlog);
    m05Freeze(r, T0 + 30_000, 'closed_at_review', 'review');
    expect(r.status).toBe('interrupted');
    expect(r.interruption_kind).toBe('review');
    expect(r.exposure_focused_ms).toBe(30_000 - 1_016);

    // Reload guard: the same occasion only.
    const prior = [
      {
        event_type: 'proto_m05_start_opportunity_opened',
        metadata: { occasion: 'o1' },
      },
    ];

    expect(m05PriorAdministration(prior, 'o1')).toBe(true);
    expect(m05PriorAdministration(prior, 'o2')).toBe(false);
    expect(m05PriorAdministration([], 'o1')).toBe(false);

    const held = createM05State('o1');

    m05Freeze(held, T0, 'prior_administration', 'reload');
    expect(held.status).toBe('interrupted');
    expect(held.interruption_kind).toBe('reload');
    expect(m05Present(held, T0, h.sink('o1'))).toBe(true); // model-level; the adapter refuses via m05OfferAvailable
  });

  test('extractor: per-occasion record — started (latency) beside cap (censored, null) is observed with no mean; declined is outside the set; both declined ⇒ declined; open ⇒ pending; not presented ≠ interrupted; held-back beside observed ⇒ interrupted with the value kept; record/event disagreement ⇒ technical failure', () => {
    const h = harness();
    const a = createM05State('o1');
    const b = createM05State('o2');

    h.presented('o1');
    acceptAt(a, T0, h.sink('o1'));
    h.opened('o1');

    const ta = T0 + 1_016;

    expect(m05Poll(a, ta, h.sink('o1'), 200)).toBe('eligible');
    m05ControlPresented(a, ta + 11_000, h.sink('o1'));
    expect(m05Start(a, ta + 12_345, 'pointer', h.sink('o1'))).toBe('started');
    expect(m05WorkTick(a, ta + 12_345 + M05_WORK_MS, h.sink('o1'))).toBe(
      'work_completed',
    );
    h.close(a, 'completed', ta + 12_345 + M05_WORK_MS);

    h.presented('o2');
    acceptAt(b, T0 + 500_000, h.sink('o2'));
    h.opened('o2');

    const tb = T0 + 501_016;

    expect(m05Poll(b, tb, h.sink('o2'), 400)).toBe('eligible');
    expect(m05Poll(b, tb + 60_000, h.sink('o2'))).toBe('cap');
    h.close(b, 'cap', tb + 60_000, 'stopped');

    const rows = extractItemFeatures('M05', h.events, CONTEXT);

    expect(rows[0]).toMatchObject({
      feature_id: 'm05_start_latency',
      disposition: 'observed',
      censored: true,
      censor_reason: 'an occasion reached the cap',
      closure_reason: 'completed',
      included_ids: ['m05_start_o1', 'm05_start_o2'],
      coverage_label: 'behavioural_counterpart',
      independence: 'independent_occasions',
      numerator: null,
      denominator: null,
      planned_denominator: null,
    });
    expect(rows[0].value).toEqual({
      o1: {
        occasion: 'o1',
        status: 'started',
        observed: true,
        latency_focused_ms: 12_345,
        latency_wall_ms: 12_345,
        exposure_focused_ms: 12_345,
        censored: false,
        censor_reason: null,
        start_cap_ms: 60_000,
        closure_reason: 'completed',
      },
      o2: {
        occasion: 'o2',
        status: 'cap',
        observed: true,
        latency_focused_ms: null,
        latency_wall_ms: null,
        exposure_focused_ms: 60_000,
        censored: true,
        censor_reason: 'focused cap reached without a start',
        start_cap_ms: 60_000,
        closure_reason: 'cap',
      },
    });
    expect(rows[0].components).toMatchObject({
      occasions_accepted: ['o1', 'o2'],
      occasions_observed: ['o1', 'o2'],
      occasions_declined: [],
      starters: ['o1'],
      non_starters: ['o2'],
      status_by_occasion: { o1: 'started', o2: 'cap' },
      started_event_agrees: true,
    });
    // No mean, average or total anywhere in the row.
    expect(JSON.stringify(rows[0])).not.toMatch(/mean|average|total_latency/i);
    expect(rows[1]).toMatchObject({
      feature_id: 'm05_acceptance_exposure',
      disposition: 'observed',
    });

    const exposure = rows[1].value as {
      o1: Record<string, unknown>;
      o2: Record<string, unknown>;
    };

    expect(exposure.o1).toMatchObject({
      accepted: true,
      answer_option_position: 1,
      eligible: true,
      wait_before_eligible_ms: 16,
      distance_px_at_eligibility: 200,
      control_views: 1,
      work_completed: true,
      late_start: null,
    });
    expect(exposure.o2).toMatchObject({
      accepted: true,
      eligible: true,
      exposure_focused_ms: 60_000,
      control_views: 0,
      work_completed: false,
    });

    // Declined beside a deferred one: the declined occasion is outside the set.
    const d = harness();
    const d1 = createM05State('o1');
    const d2 = createM05State('o2');

    d.presented('o1');
    m05Present(d1, T0, d.sink('o1'));
    expect(m05Answer(d1, false, 2, T0 + 1_000, 'keyboard', d.sink('o1'))).toBe(
      'declined',
    );
    d.opened('o1');
    d.close(d1, 'declined', T0 + 1_000, 'stopped');
    d.presented('o2');

    const td = eligibleAt(d2, T0 + 10_000, d.sink('o2'));

    d.opened('o2');
    m05ControlPresented(d2, td + 4_000, d.sink('o2'));
    expect(m05Defer(d2, td + 4_500, 'keyboard', d.sink('o2'))).toBe('deferred');
    d.close(d2, 'voluntary_stop', td + 4_500, 'stopped');

    const dRows = extractItemFeatures('M05', d.events, CONTEXT);

    expect(dRows[0]).toMatchObject({
      disposition: 'observed',
      censored: false,
      included_ids: ['m05_start_o2'],
    });
    expect(dRows[0].value).toMatchObject({
      o1: { occasion: 'o1', declined: true },
      o2: {
        status: 'deferred',
        latency_focused_ms: null,
        exposure_focused_ms: 4_500,
        censored: false,
        closure_reason: 'voluntary_stop',
      },
    });
    expect(dRows[0].components).toMatchObject({
      occasions_declined: ['o1'],
      occasions_observed: ['o2'],
      non_starters: ['o2'],
    });
    expect((dRows[1].value as { o1: { accepted: boolean } }).o1).toMatchObject({
      accepted: false,
      answer_option_position: 2,
    });

    // Both declined ⇒ declined, null; the companion still describes both.
    const n = harness();
    const n1 = createM05State('o1');
    const n2 = createM05State('o2');

    for (const [s, occ] of [
      [n1, 'o1'],
      [n2, 'o2'],
    ] as const) {
      n.presented(occ);
      m05Present(s, T0, n.sink(occ));
      m05Answer(s, false, 2, T0 + 1_000, 'keyboard', n.sink(occ));
      n.opened(occ);
      n.close(s, 'declined', T0 + 1_000, 'stopped');
    }

    const nRows = extractItemFeatures('M05', n.events, CONTEXT);

    expect(nRows[0]).toMatchObject({
      value: null,
      disposition: 'declined',
      included_ids: [],
    });
    expect(nRows[1].disposition).toBe('observed');

    // Accepted and open ⇒ pending; presented and unanswered ⇒ pending.
    const o = harness();

    o.presented('o1');
    expect(
      extractItemFeatures('M05', o.events, OPEN_CONTEXT)[0].disposition,
    ).toBe('pending');
    o.opened('o1');
    expect(extractItemFeatures('M05', o.events, OPEN_CONTEXT)[0]).toMatchObject(
      {
        disposition: 'pending',
        censored: true,
      },
    );

    // Nothing ⇒ not presented; after a reload ⇒ interrupted; held back ⇒ interrupted.
    expect(extractItemFeatures('M05', [], CONTEXT)[0].disposition).toBe(
      'not_presented',
    );
    expect(
      extractItemFeatures('M05', [], { ...CONTEXT, reloaded: true })[0]
        .disposition,
    ).toBe('interrupted');

    const held = harness();

    held.sink('o1')('technical_failure', {
      detail: 'reload after administration: job not re-offered',
      input_mode: 'system',
    });
    expect(
      extractItemFeatures('M05', held.events, CONTEXT)[0].disposition,
    ).toBe('interrupted');

    // Held back beside an observed exit: interrupted, value kept.
    const mixed = harness();
    const m2 = createM05State('o2');

    mixed.sink('o1')('technical_failure', {
      detail: 'reload after administration: job not re-offered',
      input_mode: 'system',
    });
    mixed.presented('o2');

    const tm = eligibleAt(m2, T0, mixed.sink('o2'));

    mixed.opened('o2');
    expect(m05Exit(m2, tm + 7_000, mixed.sink('o2'))).toBe(true);
    mixed.close(m2, 'route_departure', tm + 7_000, 'stopped');

    const mixedRows = extractItemFeatures('M05', mixed.events, {
      ...CONTEXT,
      reloaded: true,
    });

    expect(mixedRows[0]).toMatchObject({
      disposition: 'interrupted',
      censored: true,
      censor_reason: 'an accepted occasion was interrupted or held back',
    });
    expect(mixedRows[0].value).toMatchObject({
      o1: { occasion: 'o1', interrupted: true },
      o2: { status: 'exited', exposure_focused_ms: 7_000, censored: false },
    });
    expect(mixedRows[0].components).toMatchObject({
      occasions_interrupted: ['o1'],
      occasions_observed: ['o2'],
    });

    // A record claiming a start with no started event is a technical fault.
    const tampered = h.events.map((event) =>
      event.event_type === 'proto_m05_start_started' &&
      event.metadata?.occasion === 'o1'
        ? { ...event, event_type: 'proto_m05_start_started_removed' }
        : event,
    );

    expect(extractItemFeatures('M05', tampered, CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });
  });

  test('review fixes: the cap applies while the job surface is open (a press at the cap is a late start, "Not now" at the cap is the cap); focus loss is excluded from the latency; a never-eligible exit and an interrupted occasion are missing, never non-starts; an over-cap latency is a technical fault', () => {
    // Cap on the open surface: the poll ticks from the surface itself.
    const h = harness();
    const s = createM05State('o1');
    const log = h.sink('o1');
    const t = eligibleAt(s, T0, log);

    m05ControlPresented(s, t + 1_000, log);
    m05SetBlock(s, 'host_paused', true, t + 1_001); // the host pauses under the own surface — never a block
    expect(m05Poll(s, t + 59_999, log)).toBe('none');
    expect(m05CapDue(s, t + 59_999)).toBe(false);
    expect(m05Poll(s, t + 60_000, log)).toBe('cap');
    expect(s.status).toBe('cap');
    expect(
      h.events.find((e) => e.event_type === 'proto_m05_start_cap_reached')
        ?.metadata?.surface_open,
    ).toBe(true);
    expect(m05Start(s, t + 61_000, 'pointer', log)).toBe('late');
    expect(s.late_start?.after).toBe('cap');

    // A Start press that arrives at or past the cap (no tick in between).
    const p = createM05State('o2');
    const plog = h.sink('o2');
    const tp = eligibleAt(p, T0, plog);

    m05ControlPresented(p, tp + 59_000, plog);
    expect(m05Start(p, tp + 60_500, 'keyboard', plog)).toBe('late');
    expect(p.status).toBe('cap');
    expect(p.latency_focused_ms).toBeNull();
    expect(p.exposure_focused_ms).toBe(60_500);
    expect(
      h.events.some(
        (e) =>
          e.event_type === 'proto_m05_start_started' &&
          e.metadata?.occasion === 'o2',
      ),
    ).toBe(false);

    // "Not now" at the cap is the cap's closure, not a deferral.
    const d = createM05State('o1');
    const dlog = harness().sink('o1');
    const td = eligibleAt(d, T0, dlog);

    m05ControlPresented(d, td + 59_000, dlog);
    expect(m05Defer(d, td + 60_000, 'pointer', dlog)).toBe('invalid');
    expect(d.status).toBe('cap');

    // Documented loss of focus is excluded from the focused latency.
    const f = createM05State('o1');
    const flog = harness().sink('o1');
    const tf = eligibleAt(f, T0, flog);

    f.clock!.pause('focus_loss', tf + 1_000);
    f.clock!.resume('focus_loss', tf + 3_000);
    m05ControlPresented(f, tf + 3_000, flog);
    expect(m05Start(f, tf + 4_000, 'pointer', flog)).toBe('started');
    expect(f.latency_focused_ms).toBe(2_000);
    expect(f.latency_wall_ms).toBe(4_000);
    expect(f.excluded_ms?.focus_loss).toBe(2_000);

    // Extractor: a never-eligible exit (accepted, a prompt still held the
    // room, then the room was left) and an interrupted accepted occasion
    // are missing — never non-starts; a row with only such occasions is
    // never `observed`.
    const n = harness();
    const n1 = createM05State('o1');

    n.presented('o1');
    acceptAt(n1, T0, n.sink('o1'));
    n.opened('o1');
    m05SetBlock(n1, 'prompt', true, T0 + 1_000);
    expect(m05Exit(n1, T0 + 2_000, n.sink('o1'))).toBe(true);
    n.close(n1, 'route_departure', T0 + 2_000, 'stopped');

    const nRows = extractItemFeatures('M05', n.events, CONTEXT);

    expect(nRows[0]).toMatchObject({
      value: null,
      disposition: 'no_eligible_event',
      censored: true,
    });
    expect(nRows[0].components).toMatchObject({
      occasions_observed: [],
      occasions_never_eligible: ['o1'],
      non_starters: [],
    });

    const i = harness();
    const i1 = createM05State('o1');
    const i2 = createM05State('o2');

    i.presented('o1');
    const ti = eligibleAt(i1, T0, i.sink('o1'));
    i.opened('o1');
    m05Freeze(i1, ti + 5_000, 'closed_at_review', 'review');
    i.close(i1, 'closed_at_review', ti + 5_000, 'closed_at_review');
    i.presented('o2');
    const ti2 = eligibleAt(i2, T0 + 100_000, i.sink('o2'));
    i.opened('o2');
    m05ControlPresented(i2, ti2 + 2_000, i.sink('o2'));
    expect(m05Defer(i2, ti2 + 2_500, 'pointer', i.sink('o2'))).toBe('deferred');
    i.close(i2, 'voluntary_stop', ti2 + 2_500, 'stopped');

    const iRows = extractItemFeatures('M05', i.events, CONTEXT);

    expect(iRows[0]).toMatchObject({
      disposition: 'interrupted',
      closure_reason: 'closed_at_review',
      censored: true,
      included_ids: ['m05_start_o2'],
    });
    expect(iRows[0].value).toMatchObject({
      o1: { status: 'interrupted', observed: false, censored: true },
      o2: { status: 'deferred', observed: true, censored: false },
    });
    expect(iRows[0].components).toMatchObject({
      occasions_interrupted: ['o1'],
      occasions_observed: ['o2'],
      non_starters: ['o2'],
    });

    // A shared single closure names the row; an over-cap latency is a fault.
    const c = harness();
    const c1 = createM05State('o1');
    const tc = eligibleAt(c1, T0, c.sink('o1'));

    c.presented('o1');
    c.opened('o1');
    m05ControlPresented(c1, tc + 1_000, c.sink('o1'));
    expect(m05Start(c1, tc + 1_500, 'pointer', c.sink('o1'))).toBe('started');
    expect(m05WorkTick(c1, tc + 1_500 + M05_WORK_MS, c.sink('o1'))).toBe(
      'work_completed',
    );
    c.close(c1, 'completed', tc + 1_500 + M05_WORK_MS);
    expect(extractItemFeatures('M05', c.events, CONTEXT)[0]).toMatchObject({
      disposition: 'observed',
      closure_reason: 'completed',
    });

    const over = c.events.map((event) =>
      event.event_type === 'proto_m05_start_window_closed'
        ? {
            ...event,
            metadata: {
              ...event.metadata,
              raw_components: {
                ...(event.metadata!.raw_components as Record<string, unknown>),
                latency_focused_ms: 61_000,
              },
            },
          }
        : event.event_type === 'proto_m05_start_started'
          ? {
              ...event,
              metadata: { ...event.metadata, latency_focused_ms: 61_000 },
            }
          : event,
    );

    expect(extractItemFeatures('M05', over, CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'technical_failure',
    });
  });
});
